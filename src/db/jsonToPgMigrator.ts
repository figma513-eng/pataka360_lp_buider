import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import type {
  AccessRole,
  AccessSettingsConfig,
  AnalyticsEventRecord,
  ApiSettingsConfig,
  MediaAssetMeta,
  UiAppearanceSettingsConfig,
  WebhookLogRecord,
} from '../types/builder.ts';
import {
  type JsonStoreData,
  type StoredProjectEntry,
  type StoredSessionRecord,
  type StoredUserRecord,
  LOCAL_JSON_SCHEMA_VERSION,
  createDefaultAccessSettings,
  createDefaultApiSettings,
  normalizeHostHeader,
  normalizeServerSlug,
  resolveDataDir,
} from './repository.ts';
import { sanitizeUiAppearanceLabelsMap } from '../utils/uiAppearanceLabels.ts';
import {
  type MigrationRunResult,
  type PgPoolLike,
  runPostgresMigrationsDetailed,
} from './migrations.ts';
import {
  detectImageMagicMime,
  isSafeMediaFilename,
  mimeTypeFromExt,
  readMediaFileSafe,
} from '../server/mediaService.ts';

export interface MediaAuditEntry {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  createdAt: number;
  sourcePath: string;
  targetPath?: string;
  status: 'matched' | 'recovered_from_disk' | 'copied' | 'verified';
}

export interface MediaMigrationReport {
  sourceMediaDir: string;
  targetMediaDir: string;
  sameDirectory: boolean;
  dryRun: boolean;
  totalMetadataRecords: number;
  totalDiskFilesScanned: number;
  verifiedCount: number;
  copiedCount: number;
  recoveredOrphanFiles: string[];
  missingOnDisk: string[];
  invalidDiskFiles: string[];
  checksumOrSizeMismatches: Array<{
    filename: string;
    expectedSize: number;
    actualSize: number;
    expectedSha256: string;
    actualSha256: string;
  }>;
  entries: MediaAuditEntry[];
}

export interface NormalizedProjectSnapshot {
  id: string;
  ownerUserId: string | null;
  revision: number;
  title: string;
  slug: string;
  customDomain: string;
  useCustomDomain: boolean;
  isPublished: boolean;
  publishedAt: number | null;
  projectJsonCanonical: string;
  renderedHtmlSha256: string;
  updatedAt: number;
  lastSavedAt: number;
}

export interface NormalizedAccessPolicySnapshot {
  id: 'default';
  allUsersSuperAdmin: false;
  autoGrantSuperAdminOnJoin: false;
  defaultRole: 'editor' | 'viewer';
  activeMemberId: string;
  updatedAt: number;
}

export interface NormalizedMediaSnapshot {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  createdAt: number;
}

export interface NormalizedDbSnapshot {
  users: StoredUserRecord[];
  sessions: StoredSessionRecord[];
  projects: NormalizedProjectSnapshot[];
  analyticsEvents: AnalyticsEventRecord[];
  accessPolicy: NormalizedAccessPolicySnapshot | null;
  apiSettings: ApiSettingsConfig | null;
  uiAppearanceSettings: UiAppearanceSettingsConfig | null;
  webhookLogs: WebhookLogRecord[];
  mediaAssets: NormalizedMediaSnapshot[];
}

export interface TableDiffResult {
  table:
    | 'users'
    | 'sessions'
    | 'projects'
    | 'analytics_events'
    | 'access_policies'
    | 'api_settings'
    | 'ui_appearance_settings'
    | 'webhook_logs'
    | 'media_assets';
  sourceCount: number;
  targetCount: number;
  missingInTarget: string[];
  extraInTarget: string[];
  fieldMismatches: Array<{
    id: string;
    fields: string[];
  }>;
  skippedByPolicy?: boolean;
  note?: string;
}

export interface IntegrityComparisonReport {
  ok: boolean;
  checkedAt: string;
  includeSessions: boolean;
  tables: Record<TableDiffResult['table'], TableDiffResult>;
  mediaDiskVerification: {
    ok: boolean;
    checkedCount: number;
    missingFiles: string[];
    mismatchedFiles: string[];
    invalidUrls: string[];
  };
}

export interface MigrationPreFlightIssue {
  level: 'error' | 'warning';
  code: string;
  message: string;
  recordId?: string;
}

export interface JsonToPgMigrationPlan {
  sourceStorePath: string;
  sourceExists: boolean;
  sourceSchemaVersion: number;
  dryRun: boolean;
  includeSessions: boolean;
  counts: {
    users: number;
    sessionsTotal: number;
    sessionsToMigrate: number;
    sessionsSkippedByPolicy: number;
    projects: number;
    analyticsEvents: number;
    accessPolicies: number;
    apiSettings: number;
    uiAppearanceSettings: number;
    webhookLogs: number;
    mediaAssets: number;
  };
  mediaReport: MediaMigrationReport;
  issues: MigrationPreFlightIssue[];
  blockedByErrors: boolean;
}

export interface JsonToPgMigrationResult {
  ok: boolean;
  dryRun: boolean;
  applied: boolean;
  plan: JsonToPgMigrationPlan;
  postgresMigrations?: MigrationRunResult;
  integrityReport?: IntegrityComparisonReport;
}

function stableCanonicalJson(value: unknown): string {
  if (value === null || typeof value !== 'object') {
    return JSON.stringify(value);
  }
  if (Array.isArray(value)) {
    return `[${value.map((item) => stableCanonicalJson(item)).join(',')}]`;
  }
  const obj = value as Record<string, unknown>;
  const keys = Object.keys(obj)
    .filter((k) => obj[k] !== undefined)
    .sort();
  return `{${keys.map((k) => `${JSON.stringify(k)}:${stableCanonicalJson(obj[k])}`).join(',')}}`;
}

function sha256Text(raw: string): string {
  return crypto.createHash('sha256').update(raw, 'utf8').digest('hex');
}

function sha256Buffer(buf: Buffer): string {
  return crypto.createHash('sha256').update(buf).digest('hex');
}

export async function loadLocalJsonStoreReadOnly(storeFilePath: string): Promise<{
  exists: boolean;
  store: JsonStoreData;
}> {
  let raw: string;
  try {
    raw = await fs.readFile(storeFilePath, 'utf-8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      return {
        exists: false,
        store: {
          schemaVersion: LOCAL_JSON_SCHEMA_VERSION,
          dbEngine: 'local-json',
          users: [],
          sessions: [],
          projects: {},
          events: [],
          accessSettings: createDefaultAccessSettings(),
          apiSettings: createDefaultApiSettings(),
          webhookLogs: [],
          mediaAssets: [],
        },
      };
    }
    throw err;
  }

  const parsed = JSON.parse(raw) as Partial<JsonStoreData>;
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    throw new Error(`Berkas JSON store (${storeFilePath}) bukan objek JSON yang valid.`);
  }
  if (parsed.users !== undefined && !Array.isArray(parsed.users)) {
    throw new Error('Field "users" pada JSON store harus berupa array.');
  }
  if (
    parsed.projects !== undefined &&
    (typeof parsed.projects !== 'object' || parsed.projects === null || Array.isArray(parsed.projects))
  ) {
    throw new Error('Field "projects" pada JSON store harus berupa objek.');
  }
  if (parsed.events !== undefined && !Array.isArray(parsed.events)) {
    throw new Error('Field "events" pada JSON store harus berupa array.');
  }
  if (parsed.sessions !== undefined && !Array.isArray(parsed.sessions)) {
    throw new Error('Field "sessions" pada JSON store harus berupa array.');
  }
  if (parsed.webhookLogs !== undefined && !Array.isArray(parsed.webhookLogs)) {
    throw new Error('Field "webhookLogs" pada JSON store harus berupa array.');
  }

  return {
    exists: true,
    store: {
      schemaVersion:
        typeof parsed.schemaVersion === 'number' && parsed.schemaVersion >= 1
          ? parsed.schemaVersion
          : LOCAL_JSON_SCHEMA_VERSION,
      dbEngine: 'local-json',
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
      projects: (parsed.projects || {}) as Record<string, StoredProjectEntry>,
      events: Array.isArray(parsed.events) ? parsed.events : [],
      accessSettings: parsed.accessSettings,
      apiSettings: parsed.apiSettings,
      uiAppearanceSettings: parsed.uiAppearanceSettings,
      webhookLogs: Array.isArray(parsed.webhookLogs) ? parsed.webhookLogs : [],
      mediaAssets: Array.isArray(parsed.mediaAssets) ? parsed.mediaAssets : [],
    },
  };
}

async function copyFileAtomicallyAndVerify(params: {
  targetPath: string;
  buffer: Buffer;
  expectedSha256: string;
}): Promise<void> {
  await fs.mkdir(path.dirname(params.targetPath), { recursive: true });
  const tmpPath = `${params.targetPath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  const handle = await fs.open(tmpPath, 'w', 0o600);
  try {
    await handle.writeFile(params.buffer);
    await handle.sync();
  } catch (err) {
    await handle.close().catch(() => {});
    await fs.unlink(tmpPath).catch(() => {});
    throw err;
  }
  await handle.close();
  await fs.rename(tmpPath, params.targetPath);

  const written = await fs.readFile(params.targetPath);
  const actualSha = sha256Buffer(written);
  if (written.length !== params.buffer.length || actualSha !== params.expectedSha256) {
    throw new Error(
      `Verifikasi media setelah salin gagal untuk ${path.basename(params.targetPath)} (expected=${params.expectedSha256}, actual=${actualSha}).`
    );
  }
}

export async function auditAndMigrateMediaFiles(params: {
  sourceMediaDir: string;
  targetMediaDir: string;
  metadataList: MediaAssetMeta[];
  dryRun: boolean;
}): Promise<MediaMigrationReport> {
  const sourceDir = path.resolve(params.sourceMediaDir);
  const targetDir = path.resolve(params.targetMediaDir);
  const sameDirectory = sourceDir === targetDir;

  const metaByFilename = new Map<string, MediaAssetMeta>();
  for (const m of params.metadataList) {
    if (m?.filename) {
      metaByFilename.set(m.filename, m);
    }
  }

  let diskFiles: string[] = [];
  try {
    diskFiles = (await fs.readdir(sourceDir)).sort();
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code !== 'ENOENT') throw err;
  }

  const invalidDiskFiles: string[] = [];
  const recoveredOrphanFiles: string[] = [];
  const missingOnDisk: string[] = [];
  const checksumOrSizeMismatches: MediaMigrationReport['checksumOrSizeMismatches'] = [];
  const entries: MediaAuditEntry[] = [];
  const seenFilenames = new Set<string>();

  for (const filename of diskFiles) {
    if (filename.endsWith('.tmp')) continue;
    if (!isSafeMediaFilename(filename)) {
      invalidDiskFiles.push(filename);
      continue;
    }

    const fullSourcePath = path.join(sourceDir, filename);
    const stat = await fs.stat(fullSourcePath);
    if (!stat.isFile()) {
      invalidDiskFiles.push(filename);
      continue;
    }

    const buffer = await fs.readFile(fullSourcePath);
    const detected = detectImageMagicMime(buffer);
    if (!detected) {
      invalidDiskFiles.push(filename);
      continue;
    }

    const actualSize = buffer.length;
    const actualSha = sha256Buffer(buffer);
    const existingMeta = metaByFilename.get(filename);
    seenFilenames.add(filename);

    let status: MediaAuditEntry['status'] = 'matched';
    if (!existingMeta) {
      recoveredOrphanFiles.push(filename);
      status = 'recovered_from_disk';
    } else if (existingMeta.sizeBytes !== actualSize || existingMeta.sha256 !== actualSha) {
      checksumOrSizeMismatches.push({
        filename,
        expectedSize: existingMeta.sizeBytes,
        actualSize,
        expectedSha256: existingMeta.sha256,
        actualSha256: actualSha,
      });
    }

    const id = existingMeta?.id || filename.replace(/\.[^.]+$/, '');
    const targetPath = path.join(targetDir, filename);
    if (!sameDirectory && !params.dryRun) {
      await copyFileAtomicallyAndVerify({
        targetPath,
        buffer,
        expectedSha256: actualSha,
      });
      status = 'copied';
    } else if (!params.dryRun) {
      status = 'verified';
    }

    entries.push({
      id,
      filename,
      url: `/api/media/${filename}`,
      mimeType: existingMeta?.mimeType || mimeTypeFromExt(path.extname(filename)) || detected.mimeType,
      sizeBytes: actualSize,
      sha256: actualSha,
      createdAt: existingMeta?.createdAt ?? Math.round(stat.mtimeMs),
      sourcePath: fullSourcePath,
      targetPath,
      status,
    });
  }

  for (const m of params.metadataList) {
    if (!seenFilenames.has(m.filename)) {
      missingOnDisk.push(m.filename);
    }
  }

  return {
    sourceMediaDir: sourceDir,
    targetMediaDir: targetDir,
    sameDirectory,
    dryRun: params.dryRun,
    totalMetadataRecords: params.metadataList.length,
    totalDiskFilesScanned: diskFiles.length,
    verifiedCount: entries.length,
    copiedCount: entries.filter((e) => e.status === 'copied').length,
    recoveredOrphanFiles,
    missingOnDisk,
    invalidDiskFiles,
    checksumOrSizeMismatches,
    entries,
  };
}

function normalizeProjectForSnapshot(
  entry: StoredProjectEntry,
  validUserIds: Set<string>
): NormalizedProjectSnapshot {
  const rec = entry.record;
  const pub = rec.project.publishing;
  const slug = normalizeServerSlug(pub?.slug || rec.project.title || rec.id, 'unit-usaha');
  const ownerUserId =
    entry.ownerUserId && validUserIds.has(entry.ownerUserId) ? entry.ownerUserId : null;
  return {
    id: rec.id,
    ownerUserId,
    revision:
      typeof rec.revision === 'number' && Number.isInteger(rec.revision) && rec.revision >= 1
        ? rec.revision
        : 1,
    title: rec.project.title,
    slug,
    customDomain: normalizeHostHeader(pub?.customDomain),
    useCustomDomain: Boolean(pub?.useCustomDomain),
    isPublished: Boolean(pub?.isPublished),
    publishedAt: pub?.publishedAt ?? null,
    projectJsonCanonical: stableCanonicalJson(rec.project),
    renderedHtmlSha256: sha256Text(entry.renderedHtml || ''),
    updatedAt: Number(rec.updatedAt || entry.savedAt || 0),
    lastSavedAt: Number(rec.lastSavedAt || entry.savedAt || rec.updatedAt || 0),
  };
}

function normalizeAccessPolicy(
  accessSettings?: AccessSettingsConfig
): NormalizedAccessPolicySnapshot | null {
  if (!accessSettings) return null;
  return {
    id: 'default',
    allUsersSuperAdmin: false,
    autoGrantSuperAdminOnJoin: false,
    defaultRole: accessSettings.defaultRole === 'editor' ? 'editor' : 'viewer',
    activeMemberId: accessSettings.activeMemberId || 'owner-super-admin',
    updatedAt: Number(accessSettings.updatedAt || 0),
  };
}

export function buildSourceSnapshotFromJson(params: {
  store: JsonStoreData;
  mediaEntries: MediaAuditEntry[];
  includeSessions: boolean;
  now?: number;
}): NormalizedDbSnapshot {
  const now = params.now ?? Date.now();
  const users = [...params.store.users]
    .map((u) => ({
      ...u,
      email: u.email.trim().toLowerCase(),
      lastLoginAt: u.lastLoginAt ?? null,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const userIds = new Set(users.map((u) => u.id));

  const sessions = params.includeSessions
    ? [...params.store.sessions]
        .filter((s) => s.expiresAt > now && userIds.has(s.userId))
        .sort((a, b) => a.tokenHash.localeCompare(b.tokenHash))
    : [];

  const projects = Object.values(params.store.projects)
    .filter((entry) => Boolean(entry?.record?.id && entry.record.project))
    .map((entry) => normalizeProjectForSnapshot(entry, userIds))
    .sort((a, b) => a.id.localeCompare(b.id));

  const analyticsEvents = [...params.store.events]
    .map((ev) => ({
      ...ev,
      slug: ev.slug || '',
      channel: ev.channel || 'organic',
      sourceLabel: ev.sourceLabel || 'Organik',
      deviceType: ev.deviceType || 'desktop',
      isTest: Boolean(ev.isTest),
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  const accessPolicy = normalizeAccessPolicy(params.store.accessSettings);
  const apiSettings = params.store.apiSettings ? { ...params.store.apiSettings } : null;
  const uiAppearanceSettings: UiAppearanceSettingsConfig | null = params.store.uiAppearanceSettings
    ? {
        labels: sanitizeUiAppearanceLabelsMap(params.store.uiAppearanceSettings.labels),
        updatedAt: Number(params.store.uiAppearanceSettings.updatedAt || 0),
      }
    : null;
  const webhookLogs = [...params.store.webhookLogs].sort((a, b) => a.id.localeCompare(b.id));
  const mediaAssets: NormalizedMediaSnapshot[] = params.mediaEntries
    .map((m) => ({
      id: m.id,
      filename: m.filename,
      url: m.url,
      mimeType: m.mimeType,
      sizeBytes: m.sizeBytes,
      sha256: m.sha256,
      createdAt: m.createdAt,
    }))
    .sort((a, b) => a.id.localeCompare(b.id));

  return {
    users,
    sessions,
    projects,
    analyticsEvents,
    accessPolicy,
    apiSettings,
    uiAppearanceSettings,
    webhookLogs,
    mediaAssets,
  };
}

export function buildMigrationPreFlightPlan(params: {
  sourceStorePath: string;
  sourceExists: boolean;
  store: JsonStoreData;
  mediaReport: MediaMigrationReport;
  dryRun: boolean;
  includeSessions: boolean;
  now?: number;
}): JsonToPgMigrationPlan {
  const now = params.now ?? Date.now();
  const issues: MigrationPreFlightIssue[] = [];
  const userIds = new Set(params.store.users.map((u) => u.id));
  const emailOwners = new Map<string, string>();

  for (const u of params.store.users) {
    const cleanEmail = u.email.trim().toLowerCase();
    const prev = emailOwners.get(cleanEmail);
    if (prev && prev !== u.id) {
      issues.push({
        level: 'error',
        code: 'DUPLICATE_USER_EMAIL',
        message: `Email user duplikat (${cleanEmail}) pada ID "${prev}" dan "${u.id}" akan melanggar constraint UNIQUE di PostgreSQL.`,
        recordId: u.id,
      });
    }
    emailOwners.set(cleanEmail, u.id);
  }

  const slugOwners = new Map<string, string>();
  const projectList = Object.values(params.store.projects).filter(
    (e) => Boolean(e?.record?.id && e.record.project)
  );
  for (const entry of projectList) {
    const rec = entry.record;
    const slug = normalizeServerSlug(
      rec.project.publishing?.slug || rec.project.title || rec.id,
      'unit-usaha'
    );
    const prevProj = slugOwners.get(slug);
    if (prevProj && prevProj !== rec.id) {
      issues.push({
        level: 'error',
        code: 'DUPLICATE_PROJECT_SLUG',
        message: `Slug proyek duplikat ("${slug}") pada proyek "${prevProj}" dan "${rec.id}" melanggar constraint UNIQUE(slug) di PostgreSQL.`,
        recordId: rec.id,
      });
    }
    slugOwners.set(slug, rec.id);

    if (entry.ownerUserId && !userIds.has(entry.ownerUserId)) {
      issues.push({
        level: 'warning',
        code: 'ORPHAN_PROJECT_OWNER',
        message: `Proyek "${rec.id}" mereferensikan owner_user_id "${entry.ownerUserId}" yang tidak ada di users; akan disimpan sebagai NULL agar FK aman.`,
        recordId: rec.id,
      });
    }
  }

  if (params.store.accessSettings) {
    const a = params.store.accessSettings;
    if (
      a.allUsersSuperAdmin ||
      a.autoGrantSuperAdminOnJoin ||
      a.defaultRole === 'super_admin' ||
      a.defaultRole === 'admin'
    ) {
      issues.push({
        level: 'warning',
        code: 'ACCESS_POLICY_HARDENED',
        message:
          'Kebijakan akses lama mengandung flag eskalasi otomatis atau defaultRole istimewa; akan dinormalisasi aman (P0-A) saat migrasi.',
      });
    }
  }

  for (const missingFile of params.mediaReport.missingOnDisk) {
    issues.push({
      level: 'error',
      code: 'MEDIA_FILE_MISSING_ON_DISK',
      message: `Metadata media "${missingFile}" terdaftar di JSON store tetapi berkas fisiknya tidak ditemukan di disk.`,
      recordId: missingFile,
    });
  }

  for (const mismatch of params.mediaReport.checksumOrSizeMismatches) {
    issues.push({
      level: 'error',
      code: 'MEDIA_CHECKSUM_MISMATCH',
      message: `Ukuran atau SHA-256 berkas media "${mismatch.filename}" tidak cocok dengan metadata JSON.`,
      recordId: mismatch.filename,
    });
  }

  for (const orphan of params.mediaReport.recoveredOrphanFiles) {
    issues.push({
      level: 'warning',
      code: 'MEDIA_ORPHAN_RECOVERED',
      message: `Berkas media "${orphan}" ditemukan valid di disk tanpa entri metadata JSON; akan didaftarkan ke tabel media_assets.`,
      recordId: orphan,
    });
  }

  const validActiveSessions = params.store.sessions.filter(
    (s) => s.expiresAt > now && userIds.has(s.userId)
  );
  const sessionsToMigrate = params.includeSessions ? validActiveSessions.length : 0;
  const sessionsSkippedByPolicy = params.includeSessions
    ? Math.max(0, params.store.sessions.length - validActiveSessions.length)
    : params.store.sessions.length;

  return {
    sourceStorePath: params.sourceStorePath,
    sourceExists: params.sourceExists,
    sourceSchemaVersion: params.store.schemaVersion ?? LOCAL_JSON_SCHEMA_VERSION,
    dryRun: params.dryRun,
    includeSessions: params.includeSessions,
    counts: {
      users: params.store.users.length,
      sessionsTotal: params.store.sessions.length,
      sessionsToMigrate,
      sessionsSkippedByPolicy,
      projects: projectList.length,
      analyticsEvents: params.store.events.length,
      accessPolicies: params.store.accessSettings ? 1 : 0,
      apiSettings: params.store.apiSettings ? 1 : 0,
      uiAppearanceSettings: params.store.uiAppearanceSettings ? 1 : 0,
      webhookLogs: params.store.webhookLogs.length,
      mediaAssets: params.mediaReport.entries.length,
    },
    mediaReport: params.mediaReport,
    issues,
    blockedByErrors: issues.some((i) => i.level === 'error'),
  };
}

function diffRecordSets<T>(params: {
  table: TableDiffResult['table'];
  sourceItems: T[];
  targetItems: T[];
  getId: (item: T) => string;
  compareFields: (src: T, dst: T) => string[];
  skippedByPolicy?: boolean;
  note?: string;
}): TableDiffResult {
  const srcMap = new Map(params.sourceItems.map((item) => [params.getId(item), item]));
  const dstMap = new Map(params.targetItems.map((item) => [params.getId(item), item]));

  const missingInTarget: string[] = [];
  const extraInTarget: string[] = [];
  const fieldMismatches: Array<{ id: string; fields: string[] }> = [];

  for (const [id, srcItem] of srcMap.entries()) {
    const dstItem = dstMap.get(id);
    if (!dstItem) {
      missingInTarget.push(id);
      continue;
    }
    const diffFields = params.compareFields(srcItem, dstItem);
    if (diffFields.length > 0) {
      fieldMismatches.push({ id, fields: diffFields });
    }
  }

  for (const id of dstMap.keys()) {
    if (!srcMap.has(id)) {
      extraInTarget.push(id);
    }
  }

  return {
    table: params.table,
    sourceCount: params.sourceItems.length,
    targetCount: params.targetItems.length,
    missingInTarget: missingInTarget.sort(),
    extraInTarget: extraInTarget.sort(),
    fieldMismatches,
    skippedByPolicy: params.skippedByPolicy,
    note: params.note,
  };
}

export async function compareNormalizedSnapshots(params: {
  source: NormalizedDbSnapshot;
  target: NormalizedDbSnapshot;
  includeSessions: boolean;
  targetMediaDir?: string;
}): Promise<IntegrityComparisonReport> {
  const usersDiff = diffRecordSets({
    table: 'users',
    sourceItems: params.source.users,
    targetItems: params.target.users,
    getId: (u) => u.id,
    compareFields: (s, t) => {
      const diffs: string[] = [];
      if (s.name !== t.name) diffs.push('name');
      if (s.email.toLowerCase() !== t.email.toLowerCase()) diffs.push('email');
      if (s.passwordHash !== t.passwordHash) diffs.push('passwordHash');
      if (s.role !== t.role) diffs.push('role');
      if (Boolean(s.isActive) !== Boolean(t.isActive)) diffs.push('isActive');
      if (stableCanonicalJson(s.unitScope) !== stableCanonicalJson(t.unitScope)) {
        diffs.push('unitScope');
      }
      if (stableCanonicalJson(s.permissions) !== stableCanonicalJson(t.permissions)) {
        diffs.push('permissions');
      }
      if (s.createdAt !== t.createdAt) diffs.push('createdAt');
      if (s.updatedAt !== t.updatedAt) diffs.push('updatedAt');
      if ((s.lastLoginAt ?? null) !== (t.lastLoginAt ?? null)) diffs.push('lastLoginAt');
      return diffs;
    },
  });

  const sessionsDiff: TableDiffResult = params.includeSessions
    ? diffRecordSets({
        table: 'sessions',
        sourceItems: params.source.sessions,
        targetItems: params.target.sessions,
        getId: (s) => s.tokenHash,
        compareFields: (s, t) => {
          const diffs: string[] = [];
          if (s.userId !== t.userId) diffs.push('userId');
          if (s.expiresAt !== t.expiresAt) diffs.push('expiresAt');
          if (s.createdAt !== t.createdAt) diffs.push('createdAt');
          return diffs;
        },
      })
    : {
        table: 'sessions',
        sourceCount: params.source.sessions.length,
        targetCount: params.target.sessions.length,
        missingInTarget: [],
        extraInTarget: [],
        fieldMismatches: [],
        skippedByPolicy: true,
        note: 'Sesi aktif sengaja tidak dimigrasikan berdasarkan kebijakan keamanan default.',
      };

  const projectsDiff = diffRecordSets({
    table: 'projects',
    sourceItems: params.source.projects,
    targetItems: params.target.projects,
    getId: (p) => p.id,
    compareFields: (s, t) => {
      const diffs: string[] = [];
      if ((s.ownerUserId ?? null) !== (t.ownerUserId ?? null)) diffs.push('ownerUserId');
      if (s.revision !== t.revision) diffs.push('revision');
      if (s.title !== t.title) diffs.push('title');
      if (s.slug !== t.slug) diffs.push('slug');
      if (s.customDomain !== t.customDomain) diffs.push('customDomain');
      if (s.useCustomDomain !== t.useCustomDomain) diffs.push('useCustomDomain');
      if (s.isPublished !== t.isPublished) diffs.push('isPublished');
      if ((s.publishedAt ?? null) !== (t.publishedAt ?? null)) diffs.push('publishedAt');
      if (s.projectJsonCanonical !== t.projectJsonCanonical) diffs.push('projectJson');
      if (s.renderedHtmlSha256 !== t.renderedHtmlSha256) diffs.push('renderedHtml');
      if (s.updatedAt !== t.updatedAt) diffs.push('updatedAt');
      if (s.lastSavedAt !== t.lastSavedAt) diffs.push('lastSavedAt');
      return diffs;
    },
  });

  const analyticsDiff = diffRecordSets({
    table: 'analytics_events',
    sourceItems: params.source.analyticsEvents,
    targetItems: params.target.analyticsEvents,
    getId: (e) => e.id,
    compareFields: (s, t) => {
      const diffs: string[] = [];
      if (s.projectId !== t.projectId) diffs.push('projectId');
      if (s.projectTitle !== t.projectTitle) diffs.push('projectTitle');
      if (s.slug !== t.slug) diffs.push('slug');
      if (s.eventType !== t.eventType) diffs.push('eventType');
      if (s.channel !== t.channel) diffs.push('channel');
      if (s.sourceLabel !== t.sourceLabel) diffs.push('sourceLabel');
      if ((s.ctaLabel ?? null) !== (t.ctaLabel ?? null)) diffs.push('ctaLabel');
      if ((s.waPhone ?? null) !== (t.waPhone ?? null)) diffs.push('waPhone');
      if ((s.orderValue ?? null) !== (t.orderValue ?? null)) diffs.push('orderValue');
      if (s.deviceType !== t.deviceType) diffs.push('deviceType');
      if (Boolean(s.isTest) !== Boolean(t.isTest)) diffs.push('isTest');
      if (s.createdAt !== t.createdAt) diffs.push('createdAt');
      return diffs;
    },
  });

  const accessPoliciesDiff = diffRecordSets({
    table: 'access_policies',
    sourceItems: params.source.accessPolicy ? [params.source.accessPolicy] : [],
    targetItems: params.target.accessPolicy ? [params.target.accessPolicy] : [],
    getId: (a) => a.id,
    compareFields: (s, t) => {
      const diffs: string[] = [];
      if (s.allUsersSuperAdmin !== t.allUsersSuperAdmin) diffs.push('allUsersSuperAdmin');
      if (s.autoGrantSuperAdminOnJoin !== t.autoGrantSuperAdminOnJoin) {
        diffs.push('autoGrantSuperAdminOnJoin');
      }
      if (s.defaultRole !== t.defaultRole) diffs.push('defaultRole');
      if (s.activeMemberId !== t.activeMemberId) diffs.push('activeMemberId');
      if (s.updatedAt !== t.updatedAt) diffs.push('updatedAt');
      return diffs;
    },
  });

  const apiSettingsDiff = diffRecordSets({
    table: 'api_settings',
    sourceItems: params.source.apiSettings ? [{ id: 'default', ...params.source.apiSettings }] : [],
    targetItems: params.target.apiSettings ? [{ id: 'default', ...params.target.apiSettings }] : [],
    getId: (a) => a.id,
    compareFields: (s, t) => {
      const diffs: string[] = [];
      if (Boolean(s.publicApiEnabled) !== Boolean(t.publicApiEnabled)) {
        diffs.push('publicApiEnabled');
      }
      if (Boolean(s.requireAuthForBuilder) !== Boolean(t.requireAuthForBuilder)) {
        diffs.push('requireAuthForBuilder');
      }
      if (s.webhookUrl !== t.webhookUrl) diffs.push('webhookUrl');
      if (stableCanonicalJson(s.webhookEvents) !== stableCanonicalJson(t.webhookEvents)) {
        diffs.push('webhookEvents');
      }
      if (s.corsOrigins !== t.corsOrigins) diffs.push('corsOrigins');
      if (s.rateLimitPerMinute !== t.rateLimitPerMinute) diffs.push('rateLimitPerMinute');
      if (s.metaApiVersion !== t.metaApiVersion) diffs.push('metaApiVersion');
      if (s.waDefaultCountryCode !== t.waDefaultCountryCode) diffs.push('waDefaultCountryCode');
      if (Boolean(s.autoPublishOnSave) !== Boolean(t.autoPublishOnSave)) {
        diffs.push('autoPublishOnSave');
      }
      if (s.updatedAt !== t.updatedAt) diffs.push('updatedAt');
      return diffs;
    },
  });

  const webhookLogsDiff = diffRecordSets({
    table: 'webhook_logs',
    sourceItems: params.source.webhookLogs,
    targetItems: params.target.webhookLogs,
    getId: (w) => w.id,
    compareFields: (s, t) => {
      const diffs: string[] = [];
      if (s.eventType !== t.eventType) diffs.push('eventType');
      if (s.targetUrl !== t.targetUrl) diffs.push('targetUrl');
      if ((s.statusCode ?? null) !== (t.statusCode ?? null)) diffs.push('statusCode');
      if (Boolean(s.success) !== Boolean(t.success)) diffs.push('success');
      if (s.payloadSummary !== t.payloadSummary) diffs.push('payloadSummary');
      if ((s.errorMessage ?? null) !== (t.errorMessage ?? null)) diffs.push('errorMessage');
      if (s.createdAt !== t.createdAt) diffs.push('createdAt');
      return diffs;
    },
  });

  const mediaAssetsDiff = diffRecordSets({
    table: 'media_assets',
    sourceItems: params.source.mediaAssets,
    targetItems: params.target.mediaAssets,
    getId: (m) => m.id,
    compareFields: (s, t) => {
      const diffs: string[] = [];
      if (s.filename !== t.filename) diffs.push('filename');
      if (s.url !== t.url) diffs.push('url');
      if (s.mimeType !== t.mimeType) diffs.push('mimeType');
      if (s.sizeBytes !== t.sizeBytes) diffs.push('sizeBytes');
      if (s.sha256 !== t.sha256) diffs.push('sha256');
      if (s.createdAt !== t.createdAt) diffs.push('createdAt');
      return diffs;
    },
  });

  // Verify physical media files & URL format on target media directory if provided
  const missingFiles: string[] = [];
  const mismatchedFiles: string[] = [];
  const invalidUrls: string[] = [];
  let checkedCount = 0;

  for (const m of params.target.mediaAssets) {
    if (!isSafeMediaFilename(m.filename) || m.url !== `/api/media/${m.filename}`) {
      invalidUrls.push(m.url);
    }
    if (params.targetMediaDir) {
      checkedCount += 1;
      const diskPath = path.join(path.resolve(params.targetMediaDir), m.filename);
      try {
        const buf = await fs.readFile(diskPath);
        const actualSha = sha256Buffer(buf);
        if (buf.length !== m.sizeBytes || actualSha !== m.sha256) {
          mismatchedFiles.push(m.filename);
        }
      } catch (err) {
        if ((err as NodeJS.ErrnoException)?.code === 'ENOENT') {
          missingFiles.push(m.filename);
        } else {
          mismatchedFiles.push(m.filename);
        }
      }
    }
  }

  const uiAppearanceDiff = diffRecordSets({
    table: 'ui_appearance_settings',
    sourceItems: params.source.uiAppearanceSettings
      ? [{ id: 'default', ...params.source.uiAppearanceSettings }]
      : [],
    targetItems: params.target.uiAppearanceSettings
      ? [{ id: 'default', ...params.target.uiAppearanceSettings }]
      : [],
    getId: (u) => u.id,
    compareFields: (s, t) => {
      const diffs: string[] = [];
      if (stableCanonicalJson(s.labels) !== stableCanonicalJson(t.labels)) {
        diffs.push('labels');
      }
      if (s.updatedAt !== t.updatedAt) diffs.push('updatedAt');
      return diffs;
    },
  });

  const tables: IntegrityComparisonReport['tables'] = {
    users: usersDiff,
    sessions: sessionsDiff,
    projects: projectsDiff,
    analytics_events: analyticsDiff,
    access_policies: accessPoliciesDiff,
    api_settings: apiSettingsDiff,
    ui_appearance_settings: uiAppearanceDiff,
    webhook_logs: webhookLogsDiff,
    media_assets: mediaAssetsDiff,
  };

  const allTablesOk = Object.values(tables).every(
    (t) =>
      t.skippedByPolicy ||
      (t.sourceCount === t.targetCount &&
        t.missingInTarget.length === 0 &&
        t.extraInTarget.length === 0 &&
        t.fieldMismatches.length === 0)
  );
  const mediaDiskOk =
    missingFiles.length === 0 && mismatchedFiles.length === 0 && invalidUrls.length === 0;

  return {
    ok: allTablesOk && mediaDiskOk,
    checkedAt: new Date().toISOString(),
    includeSessions: params.includeSessions,
    tables,
    mediaDiskVerification: {
      ok: mediaDiskOk,
      checkedCount,
      missingFiles,
      mismatchedFiles,
      invalidUrls,
    },
  };
}

export async function readPostgresSnapshot(
  pool: PgPoolLike,
  options?: { includeSessions?: boolean }
): Promise<NormalizedDbSnapshot> {
  const includeSessions = Boolean(options?.includeSessions);
  const client = await pool.connect();
  try {
    await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');
    try {
      const [uRes, pRes, eRes, apRes, apiRes, whRes, mRes, sRes, uiRes] = await Promise.all([
        client.query<Record<string, unknown>>('SELECT * FROM users ORDER BY id ASC'),
        client.query<Record<string, unknown>>('SELECT * FROM projects ORDER BY id ASC'),
        client.query<Record<string, unknown>>('SELECT * FROM analytics_events ORDER BY id ASC'),
        client.query<Record<string, unknown>>(
          `SELECT * FROM access_policies WHERE id = 'default' LIMIT 1`
        ),
        client.query<Record<string, unknown>>(
          `SELECT * FROM api_settings WHERE id = 'default' LIMIT 1`
        ),
        client.query<Record<string, unknown>>('SELECT * FROM webhook_logs ORDER BY id ASC'),
        client.query<Record<string, unknown>>('SELECT * FROM media_assets ORDER BY id ASC'),
        includeSessions
          ? client.query<Record<string, unknown>>('SELECT * FROM sessions ORDER BY token_hash ASC')
          : Promise.resolve({ rows: [] as Record<string, unknown>[] }),
        client.query<Record<string, unknown>>(
          `SELECT * FROM ui_appearance_settings WHERE id = 'default' LIMIT 1`
        ),
      ]);
      await client.query('COMMIT');

      const users: StoredUserRecord[] = uRes.rows.map((r) => ({
        id: String(r.id),
        name: String(r.name),
        email: String(r.email).trim().toLowerCase(),
        passwordHash: String(r.password_hash),
        role: r.role as AccessRole,
        isActive: Boolean(r.is_active),
        unitScope: r.unit_scope_json as 'all' | string[],
        permissions: r.permissions_json as StoredUserRecord['permissions'],
        createdAt: Number(r.created_at),
        updatedAt: Number(r.updated_at),
        lastLoginAt: r.last_login_at !== null && r.last_login_at !== undefined ? Number(r.last_login_at) : null,
      }));

      const sessions: StoredSessionRecord[] = sRes.rows.map((r) => ({
        tokenHash: String(r.token_hash),
        userId: String(r.user_id),
        expiresAt: Number(r.expires_at),
        userAgent: String(r.user_agent || ''),
        ipAddress: String(r.ip_address || ''),
        createdAt: Number(r.created_at),
      }));

      const projects: NormalizedProjectSnapshot[] = pRes.rows.map((r) => ({
        id: String(r.id),
        ownerUserId: r.owner_user_id ? String(r.owner_user_id) : null,
        revision: Number(r.revision ?? 1),
        title: String(r.title),
        slug: String(r.slug),
        customDomain: String(r.custom_domain || ''),
        useCustomDomain: Boolean(r.use_custom_domain),
        isPublished: Boolean(r.is_published),
        publishedAt:
          r.published_at !== null && r.published_at !== undefined ? Number(r.published_at) : null,
        projectJsonCanonical: stableCanonicalJson(r.project_json),
        renderedHtmlSha256: sha256Text(String(r.rendered_html || '')),
        updatedAt: Number(r.updated_at),
        lastSavedAt: Number(r.last_saved_at),
      }));

      const analyticsEvents: AnalyticsEventRecord[] = eRes.rows.map((r) => ({
        id: String(r.id),
        projectId: String(r.project_id),
        projectTitle: String(r.project_title),
        slug: String(r.slug || ''),
        eventType: r.event_type as AnalyticsEventRecord['eventType'],
        channel: String(r.channel || 'organic') as AnalyticsEventRecord['channel'],
        sourceLabel: String(r.source_label || 'Organik'),
        ctaLabel: r.cta_label !== null && r.cta_label !== undefined ? String(r.cta_label) : undefined,
        waPhone: r.wa_phone !== null && r.wa_phone !== undefined ? String(r.wa_phone) : undefined,
        orderValue:
          r.order_value !== null && r.order_value !== undefined ? Number(r.order_value) : undefined,
        utmSource:
          r.utm_source !== null && r.utm_source !== undefined ? String(r.utm_source) : undefined,
        utmMedium:
          r.utm_medium !== null && r.utm_medium !== undefined ? String(r.utm_medium) : undefined,
        utmCampaign:
          r.utm_campaign !== null && r.utm_campaign !== undefined
            ? String(r.utm_campaign)
            : undefined,
        utmContent:
          r.utm_content !== null && r.utm_content !== undefined ? String(r.utm_content) : undefined,
        clickIdType:
          r.click_id_type !== null && r.click_id_type !== undefined
            ? (String(r.click_id_type) as AnalyticsEventRecord['clickIdType'])
            : undefined,
        deviceType: String(r.device_type || 'desktop') as AnalyticsEventRecord['deviceType'],
        isTest: Boolean(r.is_test),
        createdAt: Number(r.created_at),
      }));

      const pol = apRes.rows[0];
      const accessPolicy: NormalizedAccessPolicySnapshot | null = pol
        ? {
            id: 'default',
            allUsersSuperAdmin: false,
            autoGrantSuperAdminOnJoin: false,
            defaultRole: pol.default_role === 'editor' ? 'editor' : 'viewer',
            activeMemberId: String(pol.active_member_id || 'owner-super-admin'),
            updatedAt: Number(pol.updated_at || 0),
          }
        : null;

      const apiRow = apiRes.rows[0];
      const apiSettings: ApiSettingsConfig | null = apiRow
        ? {
            publicApiEnabled: Boolean(apiRow.public_api_enabled),
            requireAuthForBuilder: Boolean(apiRow.require_auth_for_builder),
            webhookUrl: String(apiRow.webhook_url || ''),
            webhookEvents: (apiRow.webhook_events_json || []) as ApiSettingsConfig['webhookEvents'],
            corsOrigins: String(apiRow.cors_origins || '*'),
            rateLimitPerMinute: Number(apiRow.rate_limit_per_minute || 120),
            metaApiVersion: String(apiRow.meta_api_version || 'v21.0'),
            waDefaultCountryCode: String(apiRow.wa_default_country_code || '62'),
            autoPublishOnSave: Boolean(apiRow.auto_publish_on_save),
            updatedAt: Number(apiRow.updated_at || 0),
          }
        : null;

      const webhookLogs: WebhookLogRecord[] = whRes.rows.map((r) => ({
        id: String(r.id),
        eventType: String(r.event_type),
        targetUrl: String(r.target_url),
        statusCode:
          r.status_code !== null && r.status_code !== undefined ? Number(r.status_code) : undefined,
        success: Boolean(r.success),
        payloadSummary: String(r.payload_summary || ''),
        errorMessage:
          r.error_message !== null && r.error_message !== undefined
            ? String(r.error_message)
            : undefined,
        createdAt: Number(r.created_at),
      }));

      const mediaAssets: NormalizedMediaSnapshot[] = mRes.rows.map((r) => ({
        id: String(r.id),
        filename: String(r.filename),
        url: `/api/media/${String(r.filename)}`,
        mimeType: String(r.mime_type),
        sizeBytes: Number(r.size_bytes),
        sha256: String(r.sha256),
        createdAt: Number(r.created_at),
      }));

      const uiRow = uiRes.rows[0];
      const uiAppearanceSettings: UiAppearanceSettingsConfig | null = uiRow
        ? {
            labels: sanitizeUiAppearanceLabelsMap(uiRow.labels_json),
            updatedAt: Number(uiRow.updated_at || 0),
          }
        : null;

      return {
        users,
        sessions,
        projects,
        analyticsEvents,
        accessPolicy,
        apiSettings,
        uiAppearanceSettings,
        webhookLogs,
        mediaAssets,
      };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function verifyJsonVsPostgresIntegrity(params: {
  pool: PgPoolLike;
  sourceStorePath?: string;
  sourceMediaDir?: string;
  targetMediaDir?: string;
  includeSessions?: boolean;
}): Promise<IntegrityComparisonReport> {
  const dataDir = params.sourceStorePath
    ? path.dirname(path.resolve(params.sourceStorePath))
    : resolveDataDir();
  const storePath = params.sourceStorePath
    ? path.resolve(params.sourceStorePath)
    : path.join(dataDir, 'lynk-server-store.json');
  const sourceMediaDir = params.sourceMediaDir
    ? path.resolve(params.sourceMediaDir)
    : path.join(dataDir, 'media');
  const targetMediaDir = params.targetMediaDir
    ? path.resolve(params.targetMediaDir)
    : sourceMediaDir;
  const includeSessions = Boolean(params.includeSessions);

  const { store } = await loadLocalJsonStoreReadOnly(storePath);
  const mediaReport = await auditAndMigrateMediaFiles({
    sourceMediaDir,
    targetMediaDir,
    metadataList: Array.isArray(store.mediaAssets) ? store.mediaAssets : [],
    dryRun: true,
  });

  const sourceSnapshot = buildSourceSnapshotFromJson({
    store,
    mediaEntries: mediaReport.entries,
    includeSessions,
  });
  const targetSnapshot = await readPostgresSnapshot(params.pool, { includeSessions });

  return compareNormalizedSnapshots({
    source: sourceSnapshot,
    target: targetSnapshot,
    includeSessions,
    targetMediaDir,
  });
}

export async function migrateJsonToPostgres(params: {
  pool?: PgPoolLike | null;
  sourceStorePath?: string;
  sourceMediaDir?: string;
  targetMediaDir?: string;
  dryRun?: boolean;
  includeSessions?: boolean;
  verifyAfterWrite?: boolean;
}): Promise<JsonToPgMigrationResult> {
  const dryRun = params.dryRun ?? true;
  const includeSessions = Boolean(params.includeSessions);
  const baseDataDir = params.sourceStorePath
    ? path.dirname(path.resolve(params.sourceStorePath))
    : resolveDataDir();
  const sourceStorePath = params.sourceStorePath
    ? path.resolve(params.sourceStorePath)
    : path.join(baseDataDir, 'lynk-server-store.json');
  const sourceMediaDir = params.sourceMediaDir
    ? path.resolve(params.sourceMediaDir)
    : path.join(baseDataDir, 'media');
  const targetMediaDir = params.targetMediaDir
    ? path.resolve(params.targetMediaDir)
    : sourceMediaDir;

  const { exists: sourceExists, store } = await loadLocalJsonStoreReadOnly(sourceStorePath);
  const mediaReport = await auditAndMigrateMediaFiles({
    sourceMediaDir,
    targetMediaDir,
    metadataList: Array.isArray(store.mediaAssets) ? store.mediaAssets : [],
    dryRun,
  });

  const now = Date.now();
  const plan = buildMigrationPreFlightPlan({
    sourceStorePath,
    sourceExists,
    store,
    mediaReport,
    dryRun,
    includeSessions,
    now,
  });

  if (dryRun || plan.blockedByErrors) {
    return {
      ok: !plan.blockedByErrors,
      dryRun,
      applied: false,
      plan,
    };
  }

  if (!params.pool) {
    throw new Error(
      'Koneksi PostgreSQL (pool) diperlukan saat menjalankan migrasi non-dry-run.'
    );
  }

  // Ensure PostgreSQL schema & checksum integrity before inserting data
  const postgresMigrations = await runPostgresMigrationsDetailed(params.pool);

  const sourceSnapshot = buildSourceSnapshotFromJson({
    store,
    mediaEntries: mediaReport.entries,
    includeSessions,
    now,
  });
  const rawProjectsById = new Map<string, StoredProjectEntry>();
  for (const entry of Object.values(store.projects)) {
    if (entry?.record?.id && entry.record.project) {
      rawProjectsById.set(entry.record.id, entry);
    }
  }

  const client = await params.pool.connect();
  try {
    await client.query('BEGIN');
    try {
      // 1. Users
      for (const u of sourceSnapshot.users) {
        await client.query(
          `INSERT INTO users (id, name, email, password_hash, role, is_active, unit_scope_json, permissions_json, created_at, updated_at, last_login_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8::jsonb, $9, $10, $11)
           ON CONFLICT (id) DO UPDATE SET
             name = EXCLUDED.name,
             email = EXCLUDED.email,
             password_hash = EXCLUDED.password_hash,
             role = EXCLUDED.role,
             is_active = EXCLUDED.is_active,
             unit_scope_json = EXCLUDED.unit_scope_json,
             permissions_json = EXCLUDED.permissions_json,
             updated_at = EXCLUDED.updated_at,
             last_login_at = EXCLUDED.last_login_at`,
          [
            u.id,
            u.name,
            u.email,
            u.passwordHash,
            u.role,
            Boolean(u.isActive),
            JSON.stringify(u.unitScope),
            JSON.stringify(u.permissions),
            u.createdAt,
            u.updatedAt,
            u.lastLoginAt ?? null,
          ]
        );
      }

      // 2. Access Policies
      if (sourceSnapshot.accessPolicy) {
        const pol = sourceSnapshot.accessPolicy;
        await client.query(
          `INSERT INTO access_policies (id, all_users_super_admin, auto_grant_super_admin_on_join, default_role, active_member_id, updated_at)
           VALUES ('default', FALSE, FALSE, $1, $2, $3)
           ON CONFLICT (id) DO UPDATE SET
             all_users_super_admin = FALSE,
             auto_grant_super_admin_on_join = FALSE,
             default_role = EXCLUDED.default_role,
             active_member_id = EXCLUDED.active_member_id,
             updated_at = EXCLUDED.updated_at`,
          [pol.defaultRole, pol.activeMemberId, pol.updatedAt]
        );
      }

      // 3. API Settings
      if (sourceSnapshot.apiSettings) {
        const api = sourceSnapshot.apiSettings;
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
            Number(api.updatedAt || now),
          ]
        );
      }

      // 3b. UI Appearance Settings
      if (sourceSnapshot.uiAppearanceSettings) {
        const ui = sourceSnapshot.uiAppearanceSettings;
        await client.query(
          `INSERT INTO ui_appearance_settings (id, labels_json, updated_at)
           VALUES ('default', $1::jsonb, $2)
           ON CONFLICT (id) DO UPDATE SET
             labels_json = EXCLUDED.labels_json,
             updated_at = EXCLUDED.updated_at`,
          [JSON.stringify(ui.labels || {}), Number(ui.updatedAt || now)]
        );
      }

      // 4. Projects
      for (const p of sourceSnapshot.projects) {
        const rawEntry = rawProjectsById.get(p.id)!;
        const createdAt = rawEntry.savedAt || p.lastSavedAt || p.updatedAt;
        await client.query(
          `INSERT INTO projects (id, owner_user_id, revision, title, slug, custom_domain, use_custom_domain, is_published, published_at, project_json, rendered_html, updated_at, last_saved_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10::jsonb, $11, $12, $13, $14)
           ON CONFLICT (id) DO UPDATE SET
             owner_user_id = EXCLUDED.owner_user_id,
             revision = EXCLUDED.revision,
             title = EXCLUDED.title,
             slug = EXCLUDED.slug,
             custom_domain = EXCLUDED.custom_domain,
             use_custom_domain = EXCLUDED.use_custom_domain,
             is_published = EXCLUDED.is_published,
             published_at = EXCLUDED.published_at,
             project_json = EXCLUDED.project_json,
             rendered_html = EXCLUDED.rendered_html,
             updated_at = EXCLUDED.updated_at,
             last_saved_at = EXCLUDED.last_saved_at`,
          [
            p.id,
            p.ownerUserId,
            p.revision,
            p.title,
            p.slug,
            p.customDomain,
            p.useCustomDomain,
            p.isPublished,
            p.publishedAt,
            JSON.stringify(rawEntry.record.project),
            rawEntry.renderedHtml || '',
            p.updatedAt,
            p.lastSavedAt,
            createdAt,
          ]
        );
      }

      // 5. Analytics Events
      for (const ev of sourceSnapshot.analyticsEvents) {
        await client.query(
          `INSERT INTO analytics_events (id, project_id, project_title, slug, event_type, channel, source_label, cta_label, wa_phone, order_value, utm_source, utm_medium, utm_campaign, utm_content, click_id_type, device_type, is_test, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)
           ON CONFLICT (id) DO UPDATE SET
             project_id = EXCLUDED.project_id,
             project_title = EXCLUDED.project_title,
             slug = EXCLUDED.slug,
             event_type = EXCLUDED.event_type,
             channel = EXCLUDED.channel,
             source_label = EXCLUDED.source_label,
             cta_label = EXCLUDED.cta_label,
             wa_phone = EXCLUDED.wa_phone,
             order_value = EXCLUDED.order_value,
             utm_source = EXCLUDED.utm_source,
             utm_medium = EXCLUDED.utm_medium,
             utm_campaign = EXCLUDED.utm_campaign,
             utm_content = EXCLUDED.utm_content,
             click_id_type = EXCLUDED.click_id_type,
             device_type = EXCLUDED.device_type,
             is_test = EXCLUDED.is_test,
             created_at = EXCLUDED.created_at`,
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

      // 6. Webhook Logs
      for (const lg of sourceSnapshot.webhookLogs) {
        await client.query(
          `INSERT INTO webhook_logs (id, event_type, target_url, status_code, success, payload_summary, error_message, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             event_type = EXCLUDED.event_type,
             target_url = EXCLUDED.target_url,
             status_code = EXCLUDED.status_code,
             success = EXCLUDED.success,
             payload_summary = EXCLUDED.payload_summary,
             error_message = EXCLUDED.error_message,
             created_at = EXCLUDED.created_at`,
          [
            lg.id,
            lg.eventType,
            lg.targetUrl,
            lg.statusCode ?? null,
            Boolean(lg.success),
            lg.payloadSummary || '',
            lg.errorMessage ?? null,
            lg.createdAt,
          ]
        );
      }

      // 7. Media Assets
      for (const m of sourceSnapshot.mediaAssets) {
        const diskFile = await readMediaFileSafe(m.filename);
        const dataBase64 = diskFile ? diskFile.buffer.toString('base64') : null;
        await client.query(
          `INSERT INTO media_assets (id, filename, mime_type, size_bytes, sha256, data_base64, created_by, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
           ON CONFLICT (id) DO UPDATE SET
             filename = EXCLUDED.filename,
             mime_type = EXCLUDED.mime_type,
             size_bytes = EXCLUDED.size_bytes,
             sha256 = EXCLUDED.sha256,
             data_base64 = COALESCE(EXCLUDED.data_base64, media_assets.data_base64)`,
          [m.id, m.filename, m.mimeType, m.sizeBytes, m.sha256, dataBase64, null, m.createdAt]
        );
      }

      // 8. Sessions (only if explicitly enabled by security flag)
      if (includeSessions) {
        for (const s of sourceSnapshot.sessions) {
          await client.query(
            `INSERT INTO sessions (token_hash, user_id, expires_at, user_agent, ip_address, created_at)
             VALUES ($1, $2, $3, $4, $5, $6)
             ON CONFLICT (token_hash) DO UPDATE SET
               user_id = EXCLUDED.user_id,
               expires_at = EXCLUDED.expires_at,
               user_agent = EXCLUDED.user_agent,
               ip_address = EXCLUDED.ip_address`,
            [s.tokenHash, s.userId, s.expiresAt, s.userAgent, s.ipAddress, s.createdAt]
          );
        }
      }

      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    }
  } finally {
    client.release();
  }

  let integrityReport: IntegrityComparisonReport | undefined;
  if (params.verifyAfterWrite !== false) {
    const targetSnapshot = await readPostgresSnapshot(params.pool, { includeSessions });
    integrityReport = await compareNormalizedSnapshots({
      source: sourceSnapshot,
      target: targetSnapshot,
      includeSessions,
      targetMediaDir,
    });
  }

  return {
    ok: integrityReport ? integrityReport.ok : true,
    dryRun: false,
    applied: true,
    plan,
    postgresMigrations,
    integrityReport,
  };
}
