import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import JSZip from 'jszip';
import type {
  AccessSettingsConfig,
  AnalyticsEventRecord,
  ApiSettingsConfig,
  FormSubmissionRecord,
  MediaAssetMeta,
  SavedWebTemplate,
  UiAppearanceSettingsConfig,
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
  loadJsonStore,
} from '../db/repository.ts';
import {
  sanitizeUiAppearanceHiddenMap,
  unpackUiAppearanceStoragePayload,
} from '../utils/uiAppearanceLabels.ts';
import { exportAllDiskMediaAssets, isSafeMediaFilename } from './mediaService.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PROJECT_ROOT = path.resolve(__dirname, '../..');

export const FULL_ZIP_FORMAT = 'lynk-builder-full-backup-zip';

export interface FullBackupManifestFile {
  path: string;
  sizeBytes: number;
  sha256: string;
}

export interface FullBackupManifest {
  format: typeof FULL_ZIP_FORMAT;
  appName: string;
  version: string;
  exportedAt: string;
  databaseMode: 'local-json';
  schemaVersion: number;
  nodeEngines: string;
  counts: {
    files: number;
    users: number;
    projects: number;
    analyticsEvents: number;
    webhookLogs: number;
    media: number;
    webTemplates?: number;
    formSubmissions?: number;
  };
  excludes: string[];
  files: FullBackupManifestFile[];
}

const ALLOWLIST_ROOT_FILES = [
  'package.json',
  'package-lock.json',
  'vite.config.ts',
  'tsconfig.json',
  '.env.example',
  '.gitignore',
  'metadata.json',
  'index.html',
  'server.ts',
  'README.md',
  'INSTALL.md',
  'LOCAL-TESTING.md',
  'DATABASE.md',
  'POSTGRESQL-SETUP.md',
  'DATABASE-MIGRATION.md',
  'BACKUP-RESTORE.md',
  'CHANGELOG.md',
];

const ALLOWLIST_DIRS = ['src', 'public', 'scripts', 'tests'];

const BANNED_NAMES = new Set([
  'node_modules',
  'dist',
  'build',
  'coverage',
  '.git',
  '.data',
  '.aistudio',
  '.DS_Store',
]);

function isExcludedPath(relPath: string): boolean {
  const parts = relPath.split('/').filter(Boolean);
  for (const part of parts) {
    if (BANNED_NAMES.has(part)) return true;
    if (part === '.env' || (part.startsWith('.env.') && part !== '.env.example')) return true;
    if (part.endsWith('.log') || part.endsWith('.tmp') || part.endsWith('.zip')) return true;
    if (part.includes('.corrupt.') && part.endsWith('.bak')) return true;
    if (part === '.dev-session-secret' || part === '.runtime-session-secret') return true;
  }
  return false;
}

async function collectFilesRecursive(dirRel: string, out: string[]): Promise<void> {
  const absDir = path.join(PROJECT_ROOT, dirRel);
  let entries;
  try {
    entries = await fs.readdir(absDir, { withFileTypes: true });
  } catch {
    return;
  }

  entries.sort((a, b) => a.name.localeCompare(b.name));
  for (const entry of entries) {
    const rel = `${dirRel}/${entry.name}`;
    if (isExcludedPath(rel)) continue;
    if (entry.isDirectory()) {
      await collectFilesRecursive(rel, out);
    } else if (entry.isFile()) {
      out.push(rel);
    }
  }
}

async function loadCleanDatabaseSnapshot(): Promise<{
  store: JsonStoreData;
  mediaBinaries: Array<{ filename: string; buffer: Buffer }>;
}> {
  await assertStorageReady();
  const state = await getDbState();

  let users: StoredUserRecord[] = [];
  let projectsMap: Record<string, StoredProjectEntry> = {};
  let events: AnalyticsEventRecord[] = [];
  let accessSettings: AccessSettingsConfig = createDefaultAccessSettings();
  let apiSettings: ApiSettingsConfig = createDefaultApiSettings();
  let uiAppearanceSettings: UiAppearanceSettingsConfig | undefined;
  let webhookLogs: WebhookLogRecord[] = [];
  let mediaAssets: MediaAssetMeta[] = [];
  let webTemplates: SavedWebTemplate[] = [];
  let formSubmissions: FormSubmissionRecord[] = [];

  if (state.pool) {
    const client = await state.pool.connect();
    try {
      await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
      const [uRes, pRes, eRes, apRes, apiRes, whRes, mRes, uiRes, wtRes, fsRes] =
        await Promise.all([
          client.query('SELECT * FROM users'),
          client.query('SELECT * FROM projects ORDER BY updated_at DESC'),
          client.query('SELECT * FROM analytics_events ORDER BY created_at DESC LIMIT 5000'),
          client.query(`SELECT * FROM access_policies WHERE id = 'default' LIMIT 1`),
          client.query(`SELECT * FROM api_settings WHERE id = 'default' LIMIT 1`),
          client.query('SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 200'),
          client.query('SELECT * FROM media_assets ORDER BY created_at DESC'),
          client.query(`SELECT * FROM ui_appearance_settings WHERE id = 'default' LIMIT 1`),
          client.query('SELECT * FROM web_templates ORDER BY updated_at DESC'),
          client.query('SELECT * FROM form_submissions ORDER BY created_at DESC LIMIT 2000'),
        ]);
      await client.query('COMMIT');

      users = uRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        email: r.email,
        passwordHash: r.password_hash,
        role: r.role,
        isActive: Boolean(r.is_active),
        unitScope: r.unit_scope_json,
        permissions: r.permissions_json,
        planTier: r.plan_tier || 'free',
        maxSites: typeof r.max_sites === 'number' ? r.max_sites : Number(r.max_sites || 3),
        subscriptionExpiresAt: r.subscription_expires_at ? Number(r.subscription_expires_at) : null,
        createdAt: Number(r.created_at),
        updatedAt: Number(r.updated_at),
        lastLoginAt: r.last_login_at ? Number(r.last_login_at) : null,
      }));

      for (const r of pRes.rows) {
        projectsMap[r.id] = {
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
          sourceTemplateId: r.source_template_id ?? null,
          posStoreId: r.pos_store_id ?? null,
          posSyncEnabled: Boolean(r.pos_sync_enabled),
        };
      }

      events = eRes.rows.map((r) => ({
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

      const pol = apRes.rows[0];
      accessSettings = {
        allUsersSuperAdmin: false,
        autoGrantSuperAdminOnJoin: false,
        defaultRole: pol?.default_role === 'editor' ? 'editor' : 'viewer',
        activeMemberId: pol?.active_member_id || users[0]?.id || 'owner-super-admin',
        members: users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          unitScope: u.unitScope,
          permissions: u.permissions,
          createdAt: u.createdAt,
        })),
        updatedAt: Number(pol?.updated_at || Date.now()),
      };

      const apiRow = apiRes.rows[0];
      if (apiRow) {
        apiSettings = {
          publicApiEnabled: Boolean(apiRow.public_api_enabled),
          requireAuthForBuilder: Boolean(apiRow.require_auth_for_builder),
          ...(typeof apiRow.demo_login_enabled === 'boolean'
            ? { demoLoginEnabled: apiRow.demo_login_enabled }
            : {}),
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

      const uiRow = uiRes.rows[0];
      if (uiRow) {
        const unpacked = unpackUiAppearanceStoragePayload(uiRow.labels_json);
        uiAppearanceSettings = {
          labels: unpacked.labels,
          hiddenKeys: unpacked.hiddenKeys,
          updatedAt: Number(uiRow.updated_at || 0),
        };
      }

      webhookLogs = whRes.rows.map((r) => ({
        id: r.id,
        eventType: r.event_type,
        targetUrl: r.target_url,
        statusCode: r.status_code ?? undefined,
        success: Boolean(r.success),
        payloadSummary: r.payload_summary,
        errorMessage: r.error_message ?? undefined,
        createdAt: Number(r.created_at),
      }));

      mediaAssets = mRes.rows.map((r) => ({
        id: r.id,
        filename: r.filename,
        url: `/api/media/${r.filename}`,
        mimeType: r.mime_type,
        sizeBytes: Number(r.size_bytes),
        sha256: r.sha256,
        createdAt: Number(r.created_at),
      }));

      webTemplates = wtRes.rows.map((r) => ({
        id: r.id,
        name: r.name,
        description: r.description || '',
        category: r.category || 'bisnis',
        visibility: r.visibility === 'private' ? 'private' : 'shared',
        allowCollaborativeEdit: Boolean(r.allow_collaborative_edit),
        snapshot: r.snapshot_json,
        mainBlockCount: Number(r.main_block_count || 0),
        subPageCount: Number(r.sub_page_count || 0),
        totalBlockCount: Number(r.total_block_count || 0),
        subPageTitles: Array.isArray(r.sub_page_titles_json) ? r.sub_page_titles_json : [],
        paletteColors: Array.isArray(r.palette_colors_json) ? r.palette_colors_json : [],
        createdByUserId: r.created_by_user_id,
        createdByName: r.created_by_name || 'Pengguna',
        updatedByName: r.updated_by_name ?? undefined,
        usageCount: Number(r.usage_count || 0),
        createdAt: Number(r.created_at || Date.now()),
        updatedAt: Number(r.updated_at || Date.now()),
      }));

      formSubmissions = fsRes.rows.map((r) => ({
        id: r.id,
        projectId: r.project_id,
        projectTitle: r.project_title,
        slug: r.slug || '',
        componentId: r.component_id,
        formTitle: r.form_title,
        formCategory: r.form_category ?? undefined,
        values: r.values_json && typeof r.values_json === 'object' ? r.values_json : {},
        sourceChannel: r.source_channel ?? undefined,
        isTest: Boolean(r.is_test),
        createdAt: Number(r.created_at),
      }));
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } else {
    const rawStore = await loadJsonStore();
    users = rawStore.users.map((u) => ({ ...u }));
    projectsMap = { ...rawStore.projects };
    events = [...rawStore.events];
    accessSettings = rawStore.accessSettings || createDefaultAccessSettings();
    apiSettings = rawStore.apiSettings || createDefaultApiSettings();
    if (rawStore.uiAppearanceSettings) {
      const unpacked = unpackUiAppearanceStoragePayload(rawStore.uiAppearanceSettings.labels);
      const directHidden = sanitizeUiAppearanceHiddenMap(rawStore.uiAppearanceSettings.hiddenKeys);
      uiAppearanceSettings = {
        labels: unpacked.labels,
        hiddenKeys: { ...unpacked.hiddenKeys, ...directHidden },
        updatedAt: Number(rawStore.uiAppearanceSettings.updatedAt || 0),
      };
    }
    webhookLogs = [...rawStore.webhookLogs];
    mediaAssets = Array.isArray(rawStore.mediaAssets) ? [...rawStore.mediaAssets] : [];
    webTemplates = Array.isArray(rawStore.webTemplates) ? [...rawStore.webTemplates] : [];
    formSubmissions = Array.isArray(rawStore.formSubmissions)
      ? [...rawStore.formSubmissions]
      : [];
  }

  const diskMedia = await exportAllDiskMediaAssets();
  const mediaBinaries = diskMedia
    .filter((m) => isSafeMediaFilename(m.filename))
    .map((m) => ({
      filename: m.filename,
      buffer: Buffer.from(m.base64, 'base64'),
    }));

  // Ensure mediaAssets metadata reflects disk media cleanly
  const mediaMetaByFilename = new Map<string, MediaAssetMeta>();
  for (const m of mediaAssets) {
    mediaMetaByFilename.set(m.filename, m);
  }
  for (const m of diskMedia) {
    if (!mediaMetaByFilename.has(m.filename)) {
      mediaMetaByFilename.set(m.filename, {
        id: m.id,
        filename: m.filename,
        url: `/api/media/${m.filename}`,
        mimeType: m.mimeType,
        sizeBytes: m.sizeBytes,
        sha256: m.sha256,
        createdAt: Date.now(),
      });
    }
  }

  // Strictly strip all active sessions from exported backup!
  const store: JsonStoreData = {
    schemaVersion: LOCAL_JSON_SCHEMA_VERSION,
    dbEngine: 'local-json',
    users,
    sessions: [],
    projects: projectsMap,
    events,
    accessSettings,
    apiSettings,
    ...(uiAppearanceSettings ? { uiAppearanceSettings } : {}),
    webhookLogs,
    mediaAssets: Array.from(mediaMetaByFilename.values()),
    webTemplates,
    formSubmissions,
  };

  return { store, mediaBinaries };
}

export async function buildFullProjectBackupZip(): Promise<{
  filename: string;
  buffer: Buffer;
  manifest: FullBackupManifest;
}> {
  const pkgRaw = await fs.readFile(path.join(PROJECT_ROOT, 'package.json'), 'utf-8');
  const pkg = JSON.parse(pkgRaw) as {
    version?: string;
    engines?: { node?: string };
  };
  const version = String(pkg.version || '1.0.0').replace(/[^a-zA-Z0-9._-]/g, '');
  const dateStamp = new Date().toISOString().slice(0, 10);
  const filename = `Lynk-Builder-Full-Backup-${version}-${dateStamp}.zip`;

  const zip = new JSZip();
  const manifestFiles: FullBackupManifestFile[] = [];

  const addFile = (zipPath: string, data: Buffer | string) => {
    const buf = typeof data === 'string' ? Buffer.from(data, 'utf-8') : data;
    const sha256 = crypto.createHash('sha256').update(buf).digest('hex');
    zip.file(zipPath, buf);
    manifestFiles.push({
      path: zipPath,
      sizeBytes: buf.length,
      sha256,
    });
  };

  // 1. Source Code, Configuration & Documentation
  const sourceFiles: string[] = [];
  for (const rootFile of ALLOWLIST_ROOT_FILES) {
    if (isExcludedPath(rootFile)) continue;
    try {
      const st = await fs.stat(path.join(PROJECT_ROOT, rootFile));
      if (st.isFile()) sourceFiles.push(rootFile);
    } catch {
      // skip optional missing files
    }
  }
  for (const dir of ALLOWLIST_DIRS) {
    await collectFilesRecursive(dir, sourceFiles);
  }

  sourceFiles.sort((a, b) => a.localeCompare(b));
  for (const relPath of sourceFiles) {
    const buf = await fs.readFile(path.join(PROJECT_ROOT, relPath));
    addFile(relPath, buf);
  }

  // 2. Database (Local JSON Store + Metadata + Media Assets; zero active sessions or secrets)
  const { store, mediaBinaries } = await loadCleanDatabaseSnapshot();
  const storeJson = JSON.stringify(store, null, 2);

  const dbMeta = {
    appName: 'Lynk Builder',
    version,
    schemaVersion: LOCAL_JSON_SCHEMA_VERSION,
    databaseMode: 'local-json',
    exportedAt: new Date().toISOString(),
    excludesActiveSessions: true,
    counts: {
      users: store.users.length,
      projects: Object.keys(store.projects).length,
      analyticsEvents: store.events.length,
      webhookLogs: store.webhookLogs.length,
      media: mediaBinaries.length,
      webTemplates: store.webTemplates?.length ?? 0,
      formSubmissions: store.formSubmissions?.length ?? 0,
    },
  };

  addFile('database/lynk-server-store.json', storeJson);
  addFile('database/db-meta.json', JSON.stringify(dbMeta, null, 2));
  // Ready-to-run local store copy inside .data/ (without .dev-session-secret or active sessions)
  addFile('.data/lynk-server-store.json', storeJson);

  for (const m of mediaBinaries) {
    addFile(`database/media/${m.filename}`, m.buffer);
    addFile(`.data/media/${m.filename}`, m.buffer);
  }

  // 3. Manifest with SHA-256 checksums of all archived files
  manifestFiles.sort((a, b) => a.path.localeCompare(b.path));
  const manifest: FullBackupManifest = {
    format: FULL_ZIP_FORMAT,
    appName: 'Lynk Builder',
    version,
    exportedAt: dbMeta.exportedAt,
    databaseMode: 'local-json',
    schemaVersion: LOCAL_JSON_SCHEMA_VERSION,
    nodeEngines: pkg.engines?.node || '>=22.18.0',
    counts: {
      files: manifestFiles.length + 1,
      users: store.users.length,
      projects: Object.keys(store.projects).length,
      analyticsEvents: store.events.length,
      webhookLogs: store.webhookLogs.length,
      media: mediaBinaries.length,
      webTemplates: store.webTemplates?.length ?? 0,
      formSubmissions: store.formSubmissions?.length ?? 0,
    },
    excludes: [
      'node_modules',
      'dist',
      'build',
      '.env',
      '.data/.dev-session-secret',
      '.data/.runtime-session-secret',
      'sessions',
      'SESSION_SECRET',
      'API_KEYS',
      'DB_PASSWORDS',
    ],
    files: manifestFiles,
  };

  zip.file('manifest.json', JSON.stringify(manifest, null, 2));

  const buffer = await zip.generateAsync({
    type: 'nodebuffer',
    compression: 'DEFLATE',
    compressionOptions: { level: 6 },
  });

  return { filename, buffer, manifest };
}
