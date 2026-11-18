import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  AccessMemberRecord,
  AccessRole,
  AccessSettingsConfig,
  AnalyticsEventRecord,
  ApiSettingsConfig,
  MediaAssetMeta,
  ProjectRecord,
  RestorePreviewSummary,
  UiAppearanceSettingsConfig,
} from '../types/builder.ts';
import { getDbState } from './index.ts';
import {
  type JsonStoreData,
  type StoredProjectEntry,
  assertStorageReady,
  createDefaultAccessSettings,
  createDefaultApiSettings,
  getAccessSettings,
  getApiSettings,
  getUiAppearanceSettings,
  listAnalyticsEvents,
  listProjectEntries,
  listUsers,
  loadJsonStore,
  normalizeHostHeader,
  normalizeServerSlug,
  persistJsonStore,
  resolveDataDir,
  withJsonStoreLock,
} from './repository.ts';
import { sanitizeUiAppearanceLabelsMap } from '../utils/uiAppearanceLabels.ts';
import {
  exportAllDiskMediaAssets,
  isSafeMediaFilename,
  writeMediaBufferExact,
} from '../server/mediaService.ts';
import { AppError } from '../server/errors.ts';
import { sanitizeBuilderProject } from '../utils/htmlSanitizer.ts';
import { generateProjectHtml } from '../utils/htmlExporter.ts';

export const BACKUP_FORMAT = 'lynk-builder-backup';
export const BACKUP_SCHEMA_VERSION = 3;

export interface CompleteBackupPayload {
  projects: Array<{
    record: ProjectRecord;
    ownerUserId?: string | null;
    savedAt: number;
  }>;
  analyticsEvents: AnalyticsEventRecord[];
  media: Array<{
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    base64: string;
  }>;
  accessPolicies: {
    allUsersSuperAdmin: false;
    autoGrantSuperAdminOnJoin: false;
    defaultRole: 'editor' | 'viewer';
    activeMemberId: string;
    membersMetadata: Array<Omit<AccessMemberRecord, never>>;
    updatedAt: number;
  };
  apiSettings: ApiSettingsConfig;
  uiAppearanceSettings?: UiAppearanceSettingsConfig;
}

export interface CompleteBackupBundle {
  format: typeof BACKUP_FORMAT;
  schemaVersion: number;
  createdAt: string;
  sourceEngine: 'postgresql' | 'local-json';
  manifest: {
    counts: {
      users: number;
      projects: number;
      analyticsEvents: number;
      media: number;
    };
    projectIds: string[];
    excludesSecretsAndSessions: true;
  };
  checksum: string;
  data: CompleteBackupPayload;
}

function computeCanonicalChecksum(data: CompleteBackupPayload): string {
  return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
}

export async function exportCompleteBackupBundle(): Promise<CompleteBackupBundle> {
  await assertStorageReady();
  const state = await getDbState();

  let projects: StoredProjectEntry[] = [];
  let analyticsEvents: AnalyticsEventRecord[] = [];
  let access: AccessSettingsConfig = createDefaultAccessSettings();
  let apiSettings: ApiSettingsConfig = createDefaultApiSettings();
  let uiAppearanceSettings: UiAppearanceSettingsConfig = { labels: {}, updatedAt: 0 };
  let userCount = 0;

  if (state.pool) {
    const client = await state.pool.connect();
    try {
      await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const [uRes, pRes, eRes, apRes, apiRes, uiRes] = await Promise.all([
        client.query('SELECT id, name, email, role, is_active, unit_scope_json, permissions_json, created_at FROM users'),
        client.query('SELECT * FROM projects ORDER BY updated_at DESC'),
        client.query('SELECT * FROM analytics_events ORDER BY created_at DESC LIMIT 5000'),
        client.query(`SELECT * FROM access_policies WHERE id = 'default' LIMIT 1`),
        client.query(`SELECT * FROM api_settings WHERE id = 'default' LIMIT 1`),
        client.query(`SELECT * FROM ui_appearance_settings WHERE id = 'default' LIMIT 1`),
      ]);
      await client.query('COMMIT');

      userCount = uRes.rows.length;
      const membersMetadata: AccessMemberRecord[] = uRes.rows.map((u) => ({
        id: u.id,
        name: u.name,
        email: u.email,
        role: u.role,
        isActive: Boolean(u.is_active),
        unitScope: u.unit_scope_json,
        permissions: u.permissions_json,
        createdAt: Number(u.created_at),
      }));

      const pol = apRes.rows[0];
      access = {
        allUsersSuperAdmin: false,
        autoGrantSuperAdminOnJoin: false,
        defaultRole: pol?.default_role === 'editor' ? 'editor' : 'viewer',
        activeMemberId: pol?.active_member_id || membersMetadata[0]?.id || 'owner-super-admin',
        members: membersMetadata,
        updatedAt: Number(pol?.updated_at || Date.now()),
      };

      const apiRow = apiRes.rows[0];
      if (apiRow) {
        apiSettings = {
          publicApiEnabled: Boolean(apiRow.public_api_enabled),
          requireAuthForBuilder: Boolean(apiRow.require_auth_for_builder),
          webhookUrl: apiRow.webhook_url,
          webhookEvents: apiRow.webhook_events_json,
          corsOrigins: apiRow.cors_origins,
          rateLimitPerMinute: Number(apiRow.rate_limit_per_minute),
          metaApiVersion: apiRow.meta_api_version,
          waDefaultCountryCode: apiRow.wa_default_country_code,
          autoPublishOnSave: Boolean(apiRow.auto_publish_on_save),
          updatedAt: Number(apiRow.updated_at),
        };
      }

      projects = pRes.rows.map((r) => ({
        record: {
          id: r.id,
          revision: Number(r.revision ?? 1),
          project: r.project_json,
          updatedAt: Number(r.updated_at),
          lastSavedAt: Number(r.last_saved_at),
        },
        renderedHtml: r.rendered_html,
        savedAt: Number(r.last_saved_at),
        ownerUserId: r.owner_user_id,
      }));

      analyticsEvents = eRes.rows.map((r) => ({
        id: r.id,
        projectId: r.project_id,
        projectTitle: r.project_title,
        slug: r.slug,
        eventType: r.event_type,
        channel: r.channel,
        sourceLabel: r.source_label,
        ctaLabel: r.cta_label ?? undefined,
        waPhone: r.wa_phone ?? undefined,
        orderValue: r.order_value ?? undefined,
        utmSource: r.utm_source ?? undefined,
        utmMedium: r.utm_medium ?? undefined,
        utmCampaign: r.utm_campaign ?? undefined,
        utmContent: r.utm_content ?? undefined,
        clickIdType: r.click_id_type ?? undefined,
        deviceType: r.device_type,
        isTest: Boolean(r.is_test),
        createdAt: Number(r.created_at),
      }));
      const uiRow = uiRes.rows[0];
      if (uiRow) {
        uiAppearanceSettings = {
          labels: sanitizeUiAppearanceLabelsMap(uiRow.labels_json),
          updatedAt: Number(uiRow.updated_at || 0),
        };
      }
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } else {
    const [users, entries, events, acc, api, ui] = await Promise.all([
      listUsers(),
      listProjectEntries(),
      listAnalyticsEvents(),
      getAccessSettings(),
      getApiSettings(),
      getUiAppearanceSettings(),
    ]);
    userCount = users.length;
    projects = entries;
    analyticsEvents = events;
    access = acc;
    apiSettings = api;
    uiAppearanceSettings = ui;
  }

  const media = await exportAllDiskMediaAssets();

  // Never include passwordHash, sessions, or .env secrets in portable backup bundle!
  const payload: CompleteBackupPayload = {
    projects: projects.map((entry) => ({
      record: {
        id: entry.record.id,
        revision: entry.record.revision ?? 1,
        project: entry.record.project,
        updatedAt: entry.record.updatedAt,
        lastSavedAt: entry.record.lastSavedAt ?? entry.savedAt,
      },
      ownerUserId: entry.ownerUserId ?? null,
      savedAt: entry.savedAt,
    })),
    analyticsEvents,
    media,
    accessPolicies: {
      allUsersSuperAdmin: false,
      autoGrantSuperAdminOnJoin: false,
      defaultRole: access.defaultRole === 'editor' ? 'editor' : 'viewer',
      activeMemberId: access.activeMemberId,
      membersMetadata: access.members.map((m) => ({
        id: m.id,
        name: m.name,
        email: m.email,
        role: m.role,
        isActive: m.isActive,
        unitScope: m.unitScope,
        permissions: m.permissions,
        createdAt: m.createdAt,
      })),
      updatedAt: access.updatedAt,
    },
    apiSettings,
    ...(Object.keys(uiAppearanceSettings.labels).length > 0
      ? { uiAppearanceSettings }
      : {}),
  };

  const checksum = computeCanonicalChecksum(payload);

  return {
    format: BACKUP_FORMAT,
    schemaVersion: BACKUP_SCHEMA_VERSION,
    createdAt: new Date().toISOString(),
    sourceEngine: state.engine,
    manifest: {
      counts: {
        users: userCount,
        projects: payload.projects.length,
        analyticsEvents: payload.analyticsEvents.length,
        media: payload.media.length,
      },
      projectIds: payload.projects.map((p) => p.record.id),
      excludesSecretsAndSessions: true,
    },
    checksum,
    data: payload,
  };
}

export async function previewBackupRestore(rawBundle: unknown): Promise<{
  summary: RestorePreviewSummary;
  bundle?: CompleteBackupBundle;
}> {
  await assertStorageReady();
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!rawBundle || typeof rawBundle !== 'object' || Array.isArray(rawBundle)) {
    return {
      summary: {
        valid: false,
        schemaVersion: 0,
        checksumValid: false,
        errors: ['Format berkas backup bukan objek JSON yang valid.'],
        warnings: [],
        existingCounts: { users: 0, projects: 0, analyticsEvents: 0, media: 0 },
        incomingCounts: { users: 0, projects: 0, analyticsEvents: 0, media: 0 },
        projectChanges: [],
      },
    };
  }

  const candidate = rawBundle as Partial<CompleteBackupBundle>;
  if (candidate.format !== BACKUP_FORMAT) {
    errors.push(`Format backup tidak dikenali (harus "${BACKUP_FORMAT}").`);
  }
  const schemaVer = Number(candidate.schemaVersion || 0);
  if (!Number.isInteger(schemaVer) || schemaVer < 1 || schemaVer > BACKUP_SCHEMA_VERSION) {
    errors.push(`Versi skema backup (${schemaVer}) tidak didukung.`);
  }
  if (!candidate.data || typeof candidate.data !== 'object') {
    errors.push('Bagian "data" tidak ditemukan pada berkas backup.');
  }

  let checksumValid = false;
  if (candidate.data && typeof candidate.checksum === 'string') {
    const expected = computeCanonicalChecksum(candidate.data);
    checksumValid = expected === candidate.checksum;
    if (!checksumValid) {
      errors.push('Checksum SHA-256 tidak cocok — berkas mungkin korup atau telah dimodifikasi.');
    }
  } else {
    errors.push('Checksum integritas SHA-256 tidak ditemukan pada berkas backup.');
  }

  const incomingProjects = Array.isArray(candidate.data?.projects)
    ? candidate.data!.projects
    : [];
  const incomingEvents = Array.isArray(candidate.data?.analyticsEvents)
    ? candidate.data!.analyticsEvents
    : [];
  const incomingMedia = Array.isArray(candidate.data?.media)
    ? candidate.data!.media
    : [];
  const incomingMembers = Array.isArray(candidate.data?.accessPolicies?.membersMetadata)
    ? candidate.data!.accessPolicies.membersMetadata
    : [];

  for (const p of incomingProjects) {
    if (!p?.record?.id || !p.record.project || !Array.isArray(p.record.project.blocks)) {
      errors.push(`Data proyek "${p?.record?.id || 'unknown'}" tidak valid.`);
    }
  }

  for (const m of incomingMedia) {
    if (!m?.filename || !isSafeMediaFilename(m.filename) || !m.base64) {
      errors.push(`Berkas media "${m?.filename || 'unknown'}" tidak valid.`);
    } else if (typeof m.sha256 === 'string') {
      const buf = Buffer.from(m.base64, 'base64');
      const actualHash = crypto.createHash('sha256').update(buf).digest('hex');
      if (actualHash !== m.sha256) {
        errors.push(`Hash SHA-256 media "${m.filename}" tidak cocok.`);
      }
    }
  }

  const [existingUsers, existingProjects, existingEvents, existingMedia] = await Promise.all([
    listUsers(),
    listProjectEntries(),
    listAnalyticsEvents(),
    exportAllDiskMediaAssets(),
  ]);

  const existingProjectMap = new Map(existingProjects.map((e) => [e.record.id, e]));
  const projectChanges = incomingProjects.map((p) => {
    const existing = existingProjectMap.get(p.record.id);
    const title = p.record.project?.title || p.record.id;
    const slug = normalizeServerSlug(
      p.record.project?.publishing?.slug || title || p.record.id,
      'unit-usaha'
    );
    return {
      id: p.record.id,
      title,
      slug,
      action: existing ? ('overwrite' as const) : ('create' as const),
      existingRevision: existing?.record.revision ?? 1,
      incomingRevision: p.record.revision ?? 1,
    };
  });

  if (existingProjects.length > 0 && incomingProjects.length > 0) {
    warnings.push(
      'Proses restore akan menimpa proyek/analitik/setting yang ada sesuai berkas backup. Snapshot otomatis pre-restore akan dibuat sebelum mutasi.'
    );
  }
  warnings.push(
    'Password & sesi login aktif saat ini tetap dipertahankan dan tidak di-overwrite oleh backup (keamanan kredensial).'
  );

  const valid = errors.length === 0;
  return {
    summary: {
      valid,
      schemaVersion: schemaVer,
      checksumValid,
      errors,
      warnings,
      existingCounts: {
        users: existingUsers.length,
        projects: existingProjects.length,
        analyticsEvents: existingEvents.length,
        media: existingMedia.length,
      },
      incomingCounts: {
        users: incomingMembers.length,
        projects: incomingProjects.length,
        analyticsEvents: incomingEvents.length,
        media: incomingMedia.length,
      },
      projectChanges,
    },
    bundle: valid ? (candidate as CompleteBackupBundle) : undefined,
  };
}

export async function applyBackupRestore(params: {
  bundle: unknown;
  confirmOverwrite: boolean;
  actorUserId: string;
}): Promise<{
  ok: true;
  preRestoreBackupPath: string;
  restoredCounts: {
    projects: number;
    analyticsEvents: number;
    media: number;
  };
}> {
  if (!params.confirmOverwrite) {
    throw new AppError(
      400,
      'RESTORE_CONFIRMATION_REQUIRED',
      'Konfirmasi eksplisit (confirmOverwrite=true) wajib diberikan sebelum menjalankan restore.'
    );
  }

  const preview = await previewBackupRestore(params.bundle);
  if (!preview.summary.valid || !preview.bundle) {
    throw new AppError(
      400,
      'INVALID_BACKUP_BUNDLE',
      preview.summary.errors[0] || 'Berkas backup tidak valid.'
    );
  }

  // Step 1: Create automatic pre-restore safety snapshot first!
  const preRestoreBundle = await exportCompleteBackupBundle();
  const backupDir = path.join(resolveDataDir(), 'backups');
  await fs.mkdir(backupDir, { recursive: true });
  const preRestoreFilename = `pre-restore-${Date.now()}.json`;
  const preRestorePath = path.join(backupDir, preRestoreFilename);
  await fs.writeFile(preRestorePath, JSON.stringify(preRestoreBundle, null, 2), {
    mode: 0o600,
  });

  const payload = preview.bundle.data;
  const now = Date.now();
  const sanitizedProjects: StoredProjectEntry[] = payload.projects.map((p) => {
    const cleanProj = sanitizeBuilderProject(p.record.project);
    const renderedHtml = generateProjectHtml(cleanProj, { projectId: p.record.id });
    return {
      record: {
        id: p.record.id,
        revision: Math.max(1, Number(p.record.revision ?? 1)),
        project: cleanProj,
        updatedAt: Number(p.record.updatedAt || now),
        lastSavedAt: Number(p.record.lastSavedAt || p.savedAt || now),
      },
      renderedHtml,
      savedAt: Number(p.savedAt || now),
      ownerUserId: p.ownerUserId ?? params.actorUserId,
    };
  });

  // Step 2: Restore disk media assets first (atomic per-file write)
  const restoredMediaMetas: MediaAssetMeta[] = [];
  for (const media of payload.media) {
    const meta = await writeMediaBufferExact({
      id: media.id,
      filename: media.filename,
      base64Data: media.base64,
    });
    restoredMediaMetas.push(meta);
  }

  // Step 3: Transactional restore into DB (PG transaction or single atomic JSON write)
  const state = await getDbState();
  const safeDefaultRole: AccessRole =
    payload.accessPolicies?.defaultRole === 'editor' ? 'editor' : 'viewer';

  if (state.pool) {
    const client = await state.pool.connect();
    try {
      await client.query('BEGIN');

      const existingUsersRes = await client.query<{ id: string }>('SELECT id FROM users');
      const existingUserIds = new Set(existingUsersRes.rows.map((r) => r.id));

      await client.query('DELETE FROM projects');
      for (const entry of sanitizedProjects) {
        const rec = entry.record;
        const pub = rec.project.publishing;
        const slug = normalizeServerSlug(pub?.slug || rec.project.title || rec.id, 'unit-usaha');
        const customDomain = normalizeHostHeader(pub?.customDomain);
        const ownerId =
          entry.ownerUserId && existingUserIds.has(entry.ownerUserId)
            ? entry.ownerUserId
            : null;
        await client.query(
          `INSERT INTO projects (id, owner_user_id, revision, title, slug, custom_domain, use_custom_domain, is_published, published_at, project_json, rendered_html, updated_at, last_saved_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14)`,
          [
            rec.id,
            ownerId,
            rec.revision ?? 1,
            rec.project.title,
            slug,
            customDomain,
            Boolean(pub?.useCustomDomain),
            Boolean(pub?.isPublished),
            pub?.publishedAt ?? null,
            JSON.stringify(rec.project),
            entry.renderedHtml,
            rec.updatedAt,
            entry.savedAt,
            entry.savedAt,
          ]
        );
      }

      await client.query('DELETE FROM analytics_events');
      for (const ev of payload.analyticsEvents) {
        await client.query(
          `INSERT INTO analytics_events (id, project_id, project_title, slug, event_type, channel, source_label, cta_label, wa_phone, order_value, utm_source, utm_medium, utm_campaign, utm_content, click_id_type, device_type, is_test, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)`,
          [
            ev.id,
            ev.projectId,
            ev.projectTitle,
            ev.slug || '',
            ev.eventType,
            ev.channel || 'organic',
            ev.sourceLabel || 'Organik',
            ev.ctaLabel ?? null,
            ev.waPhone ?? null,
            typeof ev.orderValue === 'number' ? Math.round(ev.orderValue) : null,
            ev.utmSource ?? null,
            ev.utmMedium ?? null,
            ev.utmCampaign ?? null,
            ev.utmContent ?? null,
            ev.clickIdType ?? null,
            ev.deviceType || 'desktop',
            Boolean(ev.isTest),
            ev.createdAt,
          ]
        );
      }

      await client.query('DELETE FROM media_assets');
      for (const m of restoredMediaMetas) {
        await client.query(
          `INSERT INTO media_assets (id, filename, mime_type, size_bytes, sha256, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [m.id, m.filename, m.mimeType, m.sizeBytes, m.sha256, params.actorUserId, m.createdAt]
        );
      }

      await client.query(
        `INSERT INTO access_policies (id, all_users_super_admin, auto_grant_super_admin_on_join, default_role, active_member_id, updated_at)
         VALUES ('default', FALSE, FALSE, $1, $2, $3)
         ON CONFLICT (id) DO UPDATE SET
           all_users_super_admin = FALSE,
           auto_grant_super_admin_on_join = FALSE,
           default_role = EXCLUDED.default_role,
           active_member_id = EXCLUDED.active_member_id,
           updated_at = EXCLUDED.updated_at`,
        [
          safeDefaultRole,
          payload.accessPolicies?.activeMemberId || params.actorUserId,
          now,
        ]
      );

      if (payload.apiSettings) {
        const api = payload.apiSettings;
        await client.query(
          `INSERT INTO api_settings (id, public_api_enabled, require_auth_for_builder, webhook_url, webhook_events_json, cors_origins, rate_limit_per_minute, meta_api_version, wa_default_country_code, auto_publish_on_save, updated_at)
           VALUES ('default', $1, $2, $3, $4::jsonb, $5, $6, $7, $8, $9, $10)
           ON CONFLICT (id) DO UPDATE SET
             public_api_enabled = EXCLUDED.public_api_enabled,
             require_auth_for_builder = EXCLUDED.require_auth_for_builder,
             webhook_url = EXCLUDED.webhook_url,
             webhook_events_json = EXCLUDED.webhook_events_json,
             cors_origins = EXCLUDED.cors_origins,
             rate_limit_per_minute = EXCLUDED.rate_limit_per_minute,
             meta_api_version = EXCLUDED.meta_api_version,
             wa_default_country_code = EXCLUDED.wa_default_country_code,
             auto_publish_on_save = EXCLUDED.auto_publish_on_save,
             updated_at = EXCLUDED.updated_at`,
          [
            Boolean(api.publicApiEnabled),
            Boolean(api.requireAuthForBuilder),
            String(api.webhookUrl || ''),
            JSON.stringify(api.webhookEvents || []),
            String(api.corsOrigins || '*'),
            Number(api.rateLimitPerMinute || 120),
            String(api.metaApiVersion || 'v21.0'),
            String(api.waDefaultCountryCode || '62'),
            Boolean(api.autoPublishOnSave),
            now,
          ]
        );
      }

      if (payload.uiAppearanceSettings) {
        const cleanLabels = sanitizeUiAppearanceLabelsMap(payload.uiAppearanceSettings.labels);
        await client.query(
          `INSERT INTO ui_appearance_settings (id, labels_json, updated_at)
           VALUES ('default', $1::jsonb, $2)
           ON CONFLICT (id) DO UPDATE SET
             labels_json = EXCLUDED.labels_json,
             updated_at = EXCLUDED.updated_at`,
          [JSON.stringify(cleanLabels), now]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } else {
    await withJsonStoreLock(async () => {
      const store = await loadJsonStore();
      const projectMap: Record<string, StoredProjectEntry> = {};
      for (const entry of sanitizedProjects) {
        projectMap[entry.record.id] = entry;
      }

      const nextStore: JsonStoreData = {
        users: store.users, // Preserve credentials intact
        sessions: store.sessions, // Preserve active auth sessions intact
        projects: projectMap,
        events: [...payload.analyticsEvents],
        webhookLogs: Array.isArray(store.webhookLogs) ? [...store.webhookLogs] : [],
        mediaAssets: restoredMediaMetas,
        accessSettings: {
          allUsersSuperAdmin: false,
          autoGrantSuperAdminOnJoin: false,
          defaultRole: safeDefaultRole,
          activeMemberId:
            payload.accessPolicies?.activeMemberId ||
            store.accessSettings?.activeMemberId ||
            params.actorUserId,
          members:
            store.users.length > 0
              ? store.users.map((u) => ({
                  id: u.id,
                  name: u.name,
                  email: u.email,
                  role: u.role,
                  isActive: u.isActive,
                  unitScope: u.unitScope,
                  permissions: u.permissions,
                  createdAt: u.createdAt,
                }))
              : payload.accessPolicies?.membersMetadata || [],
          updatedAt: now,
        },
        apiSettings: payload.apiSettings || store.apiSettings || createDefaultApiSettings(),
        uiAppearanceSettings: payload.uiAppearanceSettings
          ? {
              labels: sanitizeUiAppearanceLabelsMap(payload.uiAppearanceSettings.labels),
              updatedAt: now,
            }
          : store.uiAppearanceSettings,
      };

      await persistJsonStore(nextStore);
    });
  }

  return {
    ok: true,
    preRestoreBackupPath: preRestoreFilename,
    restoredCounts: {
      projects: sanitizedProjects.length,
      analyticsEvents: payload.analyticsEvents.length,
      media: restoredMediaMetas.length,
    },
  };
}
