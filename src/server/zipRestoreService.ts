import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import type {
  AccessRole,
  AnalyticsEventRecord,
  FormSubmissionRecord,
  MediaAssetMeta,
  RestorePreviewSummary,
  SavedWebTemplate,
  WebhookLogRecord,
} from '../types/builder.ts';
import { getDbState } from '../db/index.ts';
import {
  type JsonStoreData,
  LOCAL_JSON_SCHEMA_VERSION,
  type StoredProjectEntry,
  type StoredUserRecord,
  assertStorageReady,
  createDefaultAccessSettings,
  createDefaultApiSettings,
  listAnalyticsEvents,
  listProjectEntries,
  listUsers,
  listWebhookLogs,
  loadJsonStore,
  normalizeHostHeader,
  normalizeServerSlug,
  persistJsonStore,
  resolveDataDir,
  withJsonStoreLock,
} from '../db/repository.ts';
import { exportCompleteBackupBundle } from '../db/backupService.ts';
import { FULL_ZIP_FORMAT, type FullBackupManifest } from './fullExportService.ts';
import {
  detectImageMagicMime,
  exportAllDiskMediaAssets,
  isSafeMediaFilename,
  writeMediaBufferExact,
} from './mediaService.ts';
import { AppError } from './errors.ts';
import { sanitizeBuilderProject } from '../utils/htmlSanitizer.ts';
import { generateProjectHtml } from '../utils/htmlExporter.ts';
import {
  packUiAppearanceStoragePayload,
  sanitizeUiAppearanceHiddenMap,
  unpackUiAppearanceStoragePayload,
} from '../utils/uiAppearanceLabels.ts';

interface ParsedZipBackup {
  manifest: FullBackupManifest;
  store: JsonStoreData;
  mediaFiles: Array<{
    id: string;
    filename: string;
    base64: string;
    sizeBytes: number;
    sha256: string;
  }>;
}

function isUnsafeZipPath(entryPath: string): boolean {
  if (!entryPath || entryPath.includes('\0')) return true;
  if (entryPath.startsWith('/') || entryPath.startsWith('\\')) return true;
  if (/^[a-zA-Z]:/.test(entryPath)) return true;
  const parts = entryPath.split(/[\\/]/);
  return parts.some((p) => p === '..');
}

function isForbiddenSecretEntry(entryPath: string): boolean {
  const base = path.posix.basename(entryPath);
  return (
    base === '.env' ||
    (base.startsWith('.env.') && base !== '.env.example') ||
    base === '.dev-session-secret' ||
    base === '.runtime-session-secret'
  );
}

export async function previewZipRestore(zipBuffer: Buffer): Promise<{
  summary: RestorePreviewSummary;
  parsed?: ParsedZipBackup;
}> {
  await assertStorageReady();
  const errors: string[] = [];
  const warnings: string[] = [];

  const [existingUsers, existingProjects, existingEvents, existingMedia, existingLogs] =
    await Promise.all([
      listUsers(),
      listProjectEntries(),
      listAnalyticsEvents(),
      exportAllDiskMediaAssets(),
      listWebhookLogs(),
    ]);

  const baseEmptySummary = (): RestorePreviewSummary => ({
    valid: false,
    sourceType: 'zip',
    schemaVersion: 0,
    checksumValid: false,
    manifestValid: false,
    fileCount: 0,
    errors,
    warnings,
    existingCounts: {
      users: existingUsers.length,
      projects: existingProjects.length,
      analyticsEvents: existingEvents.length,
      media: existingMedia.length,
      webhookLogs: existingLogs.length,
    },
    incomingCounts: {
      users: 0,
      projects: 0,
      analyticsEvents: 0,
      media: 0,
      webhookLogs: 0,
    },
    projectChanges: [],
  });

  if (!Buffer.isBuffer(zipBuffer) || zipBuffer.length < 22) {
    errors.push('Berkas ZIP kosong atau tidak valid.');
    return { summary: baseEmptySummary() };
  }

  let zip: JSZip;
  try {
    zip = await JSZip.loadAsync(zipBuffer);
  } catch {
    errors.push('Berkas ZIP korup atau gagal dibaca.');
    return { summary: baseEmptySummary() };
  }

  const allEntries = Object.values(zip.files).filter((f) => !f.dir);
  for (const entry of allEntries) {
    if (isUnsafeZipPath(entry.name)) {
      errors.push(`Path berbahaya terdeteksi di dalam ZIP: "${entry.name}".`);
    }
    if (isForbiddenSecretEntry(entry.name)) {
      errors.push(`Berkas rahasia terlarang terdeteksi di dalam ZIP: "${entry.name}".`);
    }
  }

  const manifestEntry = zip.file('manifest.json');
  if (!manifestEntry) {
    errors.push('Berkas "manifest.json" tidak ditemukan di root arsip ZIP.');
    return { summary: { ...baseEmptySummary(), fileCount: allEntries.length } };
  }

  let manifest: FullBackupManifest;
  try {
    const rawManifest = await manifestEntry.async('string');
    manifest = JSON.parse(rawManifest) as FullBackupManifest;
  } catch {
    errors.push('Format "manifest.json" tidak valid.');
    return { summary: { ...baseEmptySummary(), fileCount: allEntries.length } };
  }

  const manifestValid =
    Boolean(manifest) &&
    manifest.format === FULL_ZIP_FORMAT &&
    typeof manifest.version === 'string' &&
    Number.isInteger(manifest.schemaVersion) &&
    Array.isArray(manifest.files);

  if (!manifestValid) {
    errors.push('Struktur manifest.json tidak sesuai format Lynk Builder Full Backup ZIP.');
  }

  const schemaVer = Number(manifest?.schemaVersion || 0);
  if (!Number.isInteger(schemaVer) || schemaVer < 1 || schemaVer > LOCAL_JSON_SCHEMA_VERSION) {
    errors.push(
      `Versi skema database (${schemaVer}) tidak kompatibel (didukung: 1..${LOCAL_JSON_SCHEMA_VERSION}).`
    );
  }

  let checksumValid = manifestValid && (manifest.files?.length ?? 0) > 0;
  if (manifestValid) {
    for (const fileMeta of manifest.files) {
      if (!fileMeta?.path || isUnsafeZipPath(fileMeta.path)) {
        checksumValid = false;
        errors.push(`Entri manifest tidak valid: "${fileMeta?.path || 'unknown'}".`);
        continue;
      }
      const entry = zip.file(fileMeta.path);
      if (!entry) {
        checksumValid = false;
        errors.push(`File yang tercantum di manifest hilang dari ZIP: "${fileMeta.path}".`);
        continue;
      }
      const buf = await entry.async('nodebuffer');
      const actualSha = crypto.createHash('sha256').update(buf).digest('hex');
      if (actualSha !== fileMeta.sha256 || buf.length !== fileMeta.sizeBytes) {
        checksumValid = false;
        errors.push(
          `Checksum SHA-256 tidak cocok untuk "${fileMeta.path}" — berkas mungkin korup atau dimodifikasi.`
        );
      }
    }
  }

  const dbEntry =
    zip.file('database/lynk-server-store.json') || zip.file('.data/lynk-server-store.json');
  if (!dbEntry) {
    errors.push('Database "database/lynk-server-store.json" tidak ditemukan di dalam ZIP.');
    return {
      summary: {
        ...baseEmptySummary(),
        appVersion: manifest?.version,
        databaseMode: manifest?.databaseMode,
        schemaVersion: schemaVer,
        checksumValid,
        manifestValid,
        fileCount: allEntries.length,
      },
    };
  }

  let store: JsonStoreData;
  try {
    const dbRaw = await dbEntry.async('string');
    const parsedDb = JSON.parse(dbRaw) as Partial<JsonStoreData>;
    if (
      !parsedDb ||
      typeof parsedDb !== 'object' ||
      Array.isArray(parsedDb) ||
      !Array.isArray(parsedDb.users) ||
      !parsedDb.projects ||
      typeof parsedDb.projects !== 'object' ||
      Array.isArray(parsedDb.projects) ||
      !Array.isArray(parsedDb.events)
    ) {
      throw new Error('Struktur JSON store tidak lengkap.');
    }
    store = {
      schemaVersion:
        typeof parsedDb.schemaVersion === 'number'
          ? parsedDb.schemaVersion
          : LOCAL_JSON_SCHEMA_VERSION,
      dbEngine: 'local-json',
      users: parsedDb.users,
      sessions: [],
      projects: parsedDb.projects,
      events: parsedDb.events,
      accessSettings: parsedDb.accessSettings || createDefaultAccessSettings(),
      apiSettings: parsedDb.apiSettings || createDefaultApiSettings(),
      uiAppearanceSettings: parsedDb.uiAppearanceSettings
        ? (() => {
            const unpacked = unpackUiAppearanceStoragePayload(
              parsedDb.uiAppearanceSettings.labels
            );
            const directHidden = sanitizeUiAppearanceHiddenMap(
              parsedDb.uiAppearanceSettings.hiddenKeys
            );
            return {
              labels: unpacked.labels,
              hiddenKeys: { ...unpacked.hiddenKeys, ...directHidden },
              updatedAt: Number(parsedDb.uiAppearanceSettings.updatedAt || 0),
            };
          })()
        : undefined,
      webhookLogs: Array.isArray(parsedDb.webhookLogs) ? parsedDb.webhookLogs : [],
      mediaAssets: Array.isArray(parsedDb.mediaAssets) ? parsedDb.mediaAssets : [],
      webTemplates: Array.isArray(parsedDb.webTemplates) ? parsedDb.webTemplates : [],
      formSubmissions: Array.isArray(parsedDb.formSubmissions) ? parsedDb.formSubmissions : [],
    };
  } catch (err) {
    errors.push(
      `Database di dalam ZIP rusak atau tidak valid: ${err instanceof Error ? err.message : 'SyntaxError'}`
    );
    return {
      summary: {
        ...baseEmptySummary(),
        appVersion: manifest?.version,
        databaseMode: manifest?.databaseMode,
        schemaVersion: schemaVer,
        checksumValid,
        manifestValid,
        fileCount: allEntries.length,
      },
    };
  }

  const incomingProjectEntries = Object.values(store.projects);
  for (const p of incomingProjectEntries) {
    if (!p?.record?.id || !p.record.project || !Array.isArray(p.record.project.blocks)) {
      errors.push(`Data proyek "${p?.record?.id || 'unknown'}" di dalam ZIP tidak valid.`);
    }
  }

  const mediaFiles: ParsedZipBackup['mediaFiles'] = [];
  const seenMediaNames = new Set<string>();
  for (const entry of allEntries) {
    const isMediaEntry =
      entry.name.startsWith('database/media/') || entry.name.startsWith('.data/media/');
    if (!isMediaEntry) continue;
    const filename = path.posix.basename(entry.name);
    if (seenMediaNames.has(filename)) continue;
    if (!isSafeMediaFilename(filename)) {
      errors.push(`Nama berkas media tidak valid di dalam ZIP: "${filename}".`);
      continue;
    }
    const buf = await entry.async('nodebuffer');
    if (!detectImageMagicMime(buf)) {
      errors.push(`Signature gambar tidak valid untuk media "${filename}".`);
      continue;
    }
    seenMediaNames.add(filename);
    mediaFiles.push({
      id: filename.replace(/\.[^.]+$/, ''),
      filename,
      base64: buf.toString('base64'),
      sizeBytes: buf.length,
      sha256: crypto.createHash('sha256').update(buf).digest('hex'),
    });
  }

  const existingProjectMap = new Map(existingProjects.map((e) => [e.record.id, e]));
  const projectChanges = incomingProjectEntries.map((p) => {
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

  if (existingProjects.length > 0 && incomingProjectEntries.length > 0) {
    warnings.push(
      'Mode Full Restore akan menggantikan proyek/analitik/setting saat ini dengan isi ZIP. Pilih mode Project Restore jika hanya ingin memulihkan proyek tertentu tanpa menghapus proyek lain.'
    );
  }
  warnings.push(
    'Snapshot keamanan pre-restore dibuat otomatis di .data/backups/ sebelum mutasi, dan sesi login aktif tetap dipertahankan.'
  );

  const valid = errors.length === 0 && checksumValid && manifestValid;
  return {
    summary: {
      valid,
      sourceType: 'zip',
      appVersion: manifest.version,
      databaseMode: manifest.databaseMode,
      schemaVersion: schemaVer,
      checksumValid,
      manifestValid,
      fileCount: allEntries.length,
      errors,
      warnings,
      existingCounts: {
        users: existingUsers.length,
        projects: existingProjects.length,
        analyticsEvents: existingEvents.length,
        media: existingMedia.length,
        webhookLogs: existingLogs.length,
      },
      incomingCounts: {
        users: store.users.length,
        projects: incomingProjectEntries.length,
        analyticsEvents: store.events.length,
        media: mediaFiles.length,
        webhookLogs: store.webhookLogs.length,
      },
      projectChanges,
    },
    parsed: valid
      ? {
          manifest,
          store,
          mediaFiles,
        }
      : undefined,
  };
}

export async function applyZipRestore(params: {
  zipBuffer: Buffer;
  mode: 'full' | 'project';
  selectedProjectIds?: string[];
  confirmOverwrite: boolean;
  actorUserId: string;
}): Promise<{
  ok: true;
  mode: 'full' | 'project';
  preRestoreBackupPath: string;
  restoredCounts: {
    projects: number;
    analyticsEvents: number;
    media: number;
    webhookLogs: number;
    users: number;
  };
  warnings: string[];
}> {
  if (!params.confirmOverwrite) {
    throw new AppError(
      400,
      'RESTORE_CONFIRMATION_REQUIRED',
      'Konfirmasi eksplisit (confirmOverwrite=true) wajib diberikan sebelum menjalankan restore.'
    );
  }

  const mode: 'full' | 'project' = params.mode === 'project' ? 'project' : 'full';
  const preview = await previewZipRestore(params.zipBuffer);
  if (!preview.summary.valid || !preview.parsed) {
    throw new AppError(
      400,
      'INVALID_ZIP_BACKUP',
      preview.summary.errors[0] || 'Berkas ZIP backup tidak lolos validasi.'
    );
  }

  const { store: incomingStore, mediaFiles } = preview.parsed;
  const allIncomingProjects = Object.values(incomingStore.projects);

  let targetProjects = allIncomingProjects;
  if (mode === 'project') {
    const selectedSet = new Set(
      (params.selectedProjectIds || []).filter(
        (id): id is string => typeof id === 'string' && id.trim().length > 0
      )
    );
    if (selectedSet.size === 0) {
      throw new AppError(
        400,
        'PROJECT_SELECTION_REQUIRED',
        'Pilih minimal satu proyek untuk mode Project Restore.'
      );
    }
    targetProjects = allIncomingProjects.filter((p) => selectedSet.has(p.record.id));
    if (targetProjects.length === 0) {
      throw new AppError(
        400,
        'SELECTED_PROJECTS_NOT_FOUND',
        'Proyek yang dipilih tidak ditemukan di dalam berkas ZIP.'
      );
    }
  }

  // Step 1: Mandatory pre-restore backup snapshot before mutating database
  const preRestoreBundle = await exportCompleteBackupBundle();
  const backupDir = path.join(resolveDataDir(), 'backups');
  await fs.mkdir(backupDir, { recursive: true });
  const preRestoreFilename = `pre-restore-${Date.now()}.json`;
  const preRestorePath = path.join(backupDir, preRestoreFilename);
  await fs.writeFile(preRestorePath, JSON.stringify(preRestoreBundle, null, 2), {
    mode: 0o600,
  });

  const now = Date.now();
  const warnings: string[] = [];
  const sanitizedProjects: StoredProjectEntry[] = targetProjects.map((p) => {
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
      sourceTemplateId: p.sourceTemplateId ?? null,
      posStoreId: p.posStoreId ?? null,
      posSyncEnabled: Boolean(p.posSyncEnabled),
    };
  });

  const targetProjectIdSet = new Set(sanitizedProjects.map((p) => p.record.id));
  const serializedProjectsBlob =
    mode === 'project' ? JSON.stringify(sanitizedProjects.map((p) => p.record.project)) : '';

  const targetMedia =
    mode === 'project'
      ? mediaFiles.filter((m) => serializedProjectsBlob.includes(m.filename))
      : mediaFiles;

  const targetEvents: AnalyticsEventRecord[] =
    mode === 'project'
      ? incomingStore.events.filter((ev) => targetProjectIdSet.has(ev.projectId))
      : incomingStore.events;

  const targetWebhookLogs: WebhookLogRecord[] =
    mode === 'full' ? incomingStore.webhookLogs : [];

  const targetFormSubmissions: FormSubmissionRecord[] =
    mode === 'project'
      ? (incomingStore.formSubmissions || []).filter((fsRow) =>
          targetProjectIdSet.has(fsRow.projectId)
        )
      : incomingStore.formSubmissions || [];

  const targetWebTemplates: SavedWebTemplate[] =
    mode === 'full' ? incomingStore.webTemplates || [] : [];

  // Step 2: Restore media binaries atomically
  const restoredMediaMetas: MediaAssetMeta[] = [];
  const mediaBase64ByFilename = new Map<string, string>();
  for (const media of targetMedia) {
    const meta = await writeMediaBufferExact({
      id: media.id,
      filename: media.filename,
      base64Data: media.base64,
    });
    restoredMediaMetas.push(meta);
    mediaBase64ByFilename.set(meta.filename, media.base64);
  }

  let restoredUsersCount = 0;
  let restoredEventsCount = 0;
  let restoredWebhookCount = 0;

  // Step 3: Transactional restore without duplication
  const state = await getDbState();
  if (state.pool) {
    const client = await state.pool.connect();
    try {
      await client.query('BEGIN');

      if (mode === 'full') {
        const existingUsersRes = await client.query<{ id: string; email: string }>(
          'SELECT id, email FROM users'
        );
        const existingUserIds = new Set(existingUsersRes.rows.map((u) => u.id));
        const existingEmails = new Set(existingUsersRes.rows.map((u) => u.email.toLowerCase()));

        for (const u of incomingStore.users) {
          if (existingUserIds.has(u.id) || existingEmails.has(u.email.toLowerCase())) {
            continue;
          }
          // Preserve single Super Admin invariant
          const safeRole: AccessRole =
            u.role === 'super_admin' ? 'admin' : u.role || 'viewer';
          await client.query(
            `INSERT INTO users (id, name, email, password_hash, role, is_active, unit_scope_json, permissions_json, plan_tier, max_sites, subscription_expires_at, created_at, updated_at, last_login_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8::jsonb,$9,$10,$11,$12,$13,$14)
             ON CONFLICT (id) DO NOTHING`,
            [
              u.id,
              u.name,
              u.email.toLowerCase(),
              u.passwordHash,
              safeRole,
              u.isActive,
              JSON.stringify(u.unitScope),
              JSON.stringify(u.permissions),
              u.planTier || 'free',
              typeof u.maxSites === 'number' ? u.maxSites : 3,
              u.subscriptionExpiresAt ?? null,
              u.createdAt,
              u.updatedAt,
              u.lastLoginAt ?? null,
            ]
          );
          restoredUsersCount += 1;
        }
        await client.query('DELETE FROM projects');
      }

      const validUserIds = new Set(
        (await client.query<{ id: string }>('SELECT id FROM users')).rows.map((r) => r.id)
      );

      for (const entry of sanitizedProjects) {
        const rec = entry.record;
        const pub = rec.project.publishing;
        const slug = normalizeServerSlug(pub?.slug || rec.project.title || rec.id, 'unit-usaha');
        const customDomain = normalizeHostHeader(pub?.customDomain);
        const ownerId =
          entry.ownerUserId && validUserIds.has(entry.ownerUserId) ? entry.ownerUserId : null;

        await client.query(
          `INSERT INTO projects (id, owner_user_id, revision, title, slug, custom_domain, use_custom_domain, is_published, published_at, source_template_id, pos_store_id, pos_sync_enabled, project_json, rendered_html, updated_at, last_saved_at, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14,$15,$16,$17)
           ON CONFLICT (id) DO UPDATE SET
             owner_user_id = EXCLUDED.owner_user_id,
             revision = EXCLUDED.revision,
             title = EXCLUDED.title,
             slug = EXCLUDED.slug,
             custom_domain = EXCLUDED.custom_domain,
             use_custom_domain = EXCLUDED.use_custom_domain,
             is_published = EXCLUDED.is_published,
             published_at = EXCLUDED.published_at,
             source_template_id = EXCLUDED.source_template_id,
             pos_store_id = EXCLUDED.pos_store_id,
             pos_sync_enabled = EXCLUDED.pos_sync_enabled,
             project_json = EXCLUDED.project_json,
             rendered_html = EXCLUDED.rendered_html,
             updated_at = EXCLUDED.updated_at,
             last_saved_at = EXCLUDED.last_saved_at`,
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
            entry.sourceTemplateId ?? null,
            entry.posStoreId ?? null,
            Boolean(entry.posSyncEnabled),
            JSON.stringify(rec.project),
            entry.renderedHtml,
            rec.updatedAt,
            entry.savedAt,
            entry.savedAt,
          ]
        );
      }

      if (mode === 'full') {
        await client.query('DELETE FROM analytics_events');
      }
      for (const ev of targetEvents) {
        const res = await client.query(
          `INSERT INTO analytics_events (id, project_id, project_title, slug, event_type, channel, source_label, cta_label, wa_phone, order_value, utm_source, utm_medium, utm_campaign, utm_content, click_id_type, device_type, is_test, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18)
           ON CONFLICT (id) DO NOTHING`,
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
        if (res.rowCount) restoredEventsCount += 1;
      }

      for (const m of restoredMediaMetas) {
        await client.query(
          `INSERT INTO media_assets (id, filename, mime_type, size_bytes, sha256, data_base64, created_by, created_at)
           VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
           ON CONFLICT (id) DO UPDATE SET
             filename = EXCLUDED.filename,
             mime_type = EXCLUDED.mime_type,
             size_bytes = EXCLUDED.size_bytes,
             sha256 = EXCLUDED.sha256,
             data_base64 = COALESCE(EXCLUDED.data_base64, media_assets.data_base64)`,
          [
            m.id,
            m.filename,
            m.mimeType,
            m.sizeBytes,
            m.sha256,
            mediaBase64ByFilename.get(m.filename) ?? null,
            params.actorUserId,
            m.createdAt,
          ]
        );
      }

      if (mode === 'full') {
        await client.query('DELETE FROM form_submissions');
      }
      for (const fsRow of targetFormSubmissions) {
        if (!fsRow?.id || !fsRow.projectId) continue;
        await client.query(
          `INSERT INTO form_submissions (
             id, project_id, project_title, slug, component_id, form_title,
             form_category, values_json, source_channel, is_test, created_at
           ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8::jsonb,$9,$10,$11)
           ON CONFLICT (id) DO NOTHING`,
          [
            fsRow.id,
            fsRow.projectId,
            fsRow.projectTitle || 'Halaman',
            fsRow.slug || '',
            fsRow.componentId || '',
            fsRow.formTitle || 'Form',
            fsRow.formCategory ?? null,
            JSON.stringify(fsRow.values || {}),
            fsRow.sourceChannel ?? null,
            Boolean(fsRow.isTest),
            Number(fsRow.createdAt || now),
          ]
        );
      }

      if (mode === 'full') {
        for (const lg of targetWebhookLogs) {
          const res = await client.query(
            `INSERT INTO webhook_logs (id, event_type, target_url, status_code, success, payload_summary, error_message, created_at)
             VALUES ($1,$2,$3,$4,$5,$6,$7,$8)
             ON CONFLICT (id) DO NOTHING`,
            [
              lg.id,
              lg.eventType,
              lg.targetUrl,
              lg.statusCode ?? null,
              Boolean(lg.success),
              lg.payloadSummary,
              lg.errorMessage ?? null,
              lg.createdAt,
            ]
          );
          if (res.rowCount) restoredWebhookCount += 1;
        }

        if (incomingStore.apiSettings) {
          const api = incomingStore.apiSettings;
          await client.query(
            `INSERT INTO api_settings (id, public_api_enabled, require_auth_for_builder, demo_login_enabled, webhook_url, webhook_events_json, cors_origins, rate_limit_per_minute, meta_api_version, wa_default_country_code, auto_publish_on_save, updated_at)
             VALUES ('default', $1, $2, $3, $4, $5::jsonb, $6, $7, $8, $9, $10, $11)
             ON CONFLICT (id) DO UPDATE SET
               public_api_enabled = EXCLUDED.public_api_enabled,
               require_auth_for_builder = EXCLUDED.require_auth_for_builder,
               demo_login_enabled = EXCLUDED.demo_login_enabled,
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
              typeof api.demoLoginEnabled === 'boolean' ? api.demoLoginEnabled : null,
              api.webhookUrl || '',
              JSON.stringify(Array.isArray(api.webhookEvents) ? api.webhookEvents : []),
              api.corsOrigins || '*',
              Number(api.rateLimitPerMinute || 120),
              api.metaApiVersion || 'v20.0',
              api.waDefaultCountryCode || '62',
              Boolean(api.autoPublishOnSave),
              now,
            ]
          );
        }

        if (incomingStore.uiAppearanceSettings) {
          const packedUi = packUiAppearanceStoragePayload(
            incomingStore.uiAppearanceSettings.labels ?? {},
            incomingStore.uiAppearanceSettings.hiddenKeys ?? {}
          );
          await client.query(
            `INSERT INTO ui_appearance_settings (id, labels_json, updated_at)
             VALUES ('default', $1::jsonb, $2)
             ON CONFLICT (id) DO UPDATE SET labels_json = EXCLUDED.labels_json, updated_at = EXCLUDED.updated_at`,
            [JSON.stringify(packedUi), Number(incomingStore.uiAppearanceSettings.updatedAt || now)]
          );
        }

        if (targetWebTemplates.length > 0 || Array.isArray(incomingStore.webTemplates)) {
          await client.query('DELETE FROM web_templates');
          for (const wt of targetWebTemplates) {
            if (!wt?.id || !wt.name || !wt.snapshot) continue;
            await client.query(
              `INSERT INTO web_templates (
                 id, name, description, category, visibility, allow_collaborative_edit,
                 snapshot_json, main_block_count, sub_page_count, total_block_count,
                 sub_page_titles_json, palette_colors_json, created_by_user_id,
                 created_by_name, updated_by_name, usage_count, created_at, updated_at
               ) VALUES ($1,$2,$3,$4,$5,$6,$7::jsonb,$8,$9,$10,$11::jsonb,$12::jsonb,$13,$14,$15,$16,$17,$18)
               ON CONFLICT (id) DO UPDATE SET
                 name = EXCLUDED.name,
                 description = EXCLUDED.description,
                 category = EXCLUDED.category,
                 visibility = EXCLUDED.visibility,
                 allow_collaborative_edit = EXCLUDED.allow_collaborative_edit,
                 snapshot_json = EXCLUDED.snapshot_json,
                 main_block_count = EXCLUDED.main_block_count,
                 sub_page_count = EXCLUDED.sub_page_count,
                 total_block_count = EXCLUDED.total_block_count,
                 sub_page_titles_json = EXCLUDED.sub_page_titles_json,
                 palette_colors_json = EXCLUDED.palette_colors_json,
                 updated_by_name = EXCLUDED.updated_by_name,
                 usage_count = EXCLUDED.usage_count,
                 updated_at = EXCLUDED.updated_at`,
              [
                wt.id,
                wt.name,
                wt.description || '',
                wt.category || 'bisnis',
                wt.visibility === 'private' ? 'private' : 'shared',
                Boolean(wt.allowCollaborativeEdit),
                JSON.stringify(wt.snapshot),
                Number(wt.mainBlockCount || 0),
                Number(wt.subPageCount || 0),
                Number(wt.totalBlockCount || 0),
                JSON.stringify(Array.isArray(wt.subPageTitles) ? wt.subPageTitles : []),
                JSON.stringify(Array.isArray(wt.paletteColors) ? wt.paletteColors : []),
                wt.createdByUserId || params.actorUserId,
                wt.createdByName || 'Pengguna',
                wt.updatedByName ?? null,
                Number(wt.usageCount || 0),
                Number(wt.createdAt || now),
                Number(wt.updatedAt || now),
              ]
            );
          }
        }
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

      if (mode === 'project') {
        const nextProjects: Record<string, StoredProjectEntry> = { ...store.projects };
        const usedSlugs = new Map<string, string>();
        for (const [id, entry] of Object.entries(nextProjects)) {
          const s = normalizeServerSlug(
            entry.record.project.publishing?.slug || entry.record.project.title || id,
            'unit-usaha'
          );
          usedSlugs.set(s, id);
        }

        for (const entry of sanitizedProjects) {
          const slug = normalizeServerSlug(
            entry.record.project.publishing?.slug ||
              entry.record.project.title ||
              entry.record.id,
            'unit-usaha'
          );
          const ownerId = usedSlugs.get(slug);
          if (ownerId && ownerId !== entry.record.id) {
            const disambiguated = `${slug}-${entry.record.id.slice(-4).toLowerCase()}`;
            entry.record.project.publishing = {
              ...entry.record.project.publishing,
              customDomain: entry.record.project.publishing?.customDomain || '',
              useCustomDomain: Boolean(entry.record.project.publishing?.useCustomDomain),
              isPublished: Boolean(entry.record.project.publishing?.isPublished),
              slug: disambiguated,
            };
            entry.renderedHtml = generateProjectHtml(entry.record.project, {
              projectId: entry.record.id,
            });
            warnings.push(
              `Slug proyek "${entry.record.project.title}" diubah menjadi "${disambiguated}" karena bentrok dengan proyek lain.`
            );
          }
          nextProjects[entry.record.id] = entry;
        }

        const existingEventIds = new Set(store.events.map((e) => e.id));
        const dedupedEvents = targetEvents.filter((ev) => !existingEventIds.has(ev.id));
        restoredEventsCount = dedupedEvents.length;

        const mediaMap = new Map<string, MediaAssetMeta>();
        for (const m of store.mediaAssets || []) mediaMap.set(m.filename, m);
        for (const m of restoredMediaMetas) mediaMap.set(m.filename, m);

        const existingSubIds = new Set((store.formSubmissions || []).map((f) => f.id));
        const dedupedSubs = targetFormSubmissions.filter((f) => !existingSubIds.has(f.id));

        await persistJsonStore({
          ...store,
          projects: nextProjects,
          events: [...store.events, ...dedupedEvents],
          mediaAssets: Array.from(mediaMap.values()),
          formSubmissions: [...(store.formSubmissions || []), ...dedupedSubs],
        });
      } else {
        // Full restore: merge non-existing users without duplicating or replacing acting Super Admin/sessions
        const mergedUsers: StoredUserRecord[] = [...store.users];
        const existingUserIds = new Set(mergedUsers.map((u) => u.id));
        const existingEmails = new Set(mergedUsers.map((u) => u.email.toLowerCase()));
        const hasExistingSuper = mergedUsers.some((u) => u.role === 'super_admin');

        for (const u of incomingStore.users) {
          if (existingUserIds.has(u.id) || existingEmails.has(u.email.toLowerCase())) {
            continue;
          }
          const safeRole: AccessRole =
            u.role === 'super_admin' && hasExistingSuper ? 'admin' : u.role || 'viewer';
          mergedUsers.push({
            ...u,
            email: u.email.toLowerCase(),
            role: safeRole,
          });
          existingUserIds.add(u.id);
          existingEmails.add(u.email.toLowerCase());
          restoredUsersCount += 1;
        }

        const projectMap: Record<string, StoredProjectEntry> = {};
        for (const entry of sanitizedProjects) {
          projectMap[entry.record.id] = entry;
        }

        const seenEvents = new Set<string>();
        const dedupedEvents: AnalyticsEventRecord[] = [];
        for (const ev of targetEvents) {
          if (seenEvents.has(ev.id)) continue;
          seenEvents.add(ev.id);
          dedupedEvents.push(ev);
        }
        restoredEventsCount = dedupedEvents.length;

        const seenLogs = new Set<string>();
        const dedupedLogs: WebhookLogRecord[] = [];
        for (const lg of targetWebhookLogs) {
          if (seenLogs.has(lg.id)) continue;
          seenLogs.add(lg.id);
          dedupedLogs.push(lg);
        }
        restoredWebhookCount = dedupedLogs.length;

        const safeDefaultRole: AccessRole =
          incomingStore.accessSettings?.defaultRole === 'editor' ? 'editor' : 'viewer';

        const nextStore: JsonStoreData = {
          users: mergedUsers,
          sessions: store.sessions, // Preserve active sessions
          projects: projectMap,
          events: dedupedEvents,
          webhookLogs: dedupedLogs,
          mediaAssets: restoredMediaMetas,
          accessSettings: {
            allUsersSuperAdmin: false,
            autoGrantSuperAdminOnJoin: false,
            defaultRole: safeDefaultRole,
            activeMemberId:
              incomingStore.accessSettings?.activeMemberId ||
              store.accessSettings?.activeMemberId ||
              params.actorUserId,
            members: mergedUsers.map((u) => ({
              id: u.id,
              name: u.name,
              email: u.email,
              role: u.role,
              isActive: u.isActive,
              unitScope: u.unitScope,
              permissions: u.permissions,
              createdAt: u.createdAt,
            })),
            updatedAt: now,
          },
          apiSettings:
            incomingStore.apiSettings || store.apiSettings || createDefaultApiSettings(),
          uiAppearanceSettings:
            incomingStore.uiAppearanceSettings || store.uiAppearanceSettings,
          webTemplates: Array.isArray(incomingStore.webTemplates)
            ? incomingStore.webTemplates
            : store.webTemplates || [],
          formSubmissions: Array.isArray(incomingStore.formSubmissions)
            ? incomingStore.formSubmissions
            : store.formSubmissions || [],
        };

        await persistJsonStore(nextStore);
      }
    });
  }

  return {
    ok: true,
    mode,
    preRestoreBackupPath: preRestoreFilename,
    restoredCounts: {
      projects: sanitizedProjects.length,
      analyticsEvents: restoredEventsCount,
      media: restoredMediaMetas.length,
      webhookLogs: restoredWebhookCount,
      users: restoredUsersCount,
    },
    warnings,
  };
}
