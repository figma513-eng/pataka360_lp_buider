import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { count, desc, eq, gt, sql } from 'drizzle-orm';
import type {
  AccessMemberRecord,
  AccessRole,
  AccessSettingsConfig,
  AnalyticsEventRecord,
  ApiSettingsConfig,
  AuthUser,
  DbDiagnostics,
  FeaturePermissionsMap,
  FormSubmissionRecord,
  MediaAssetMeta,
  ProjectRecord,
  SaasPlanTier,
  SavedWebTemplate,
  UiAppearanceHiddenMap,
  UiAppearanceLabelsMap,
  UiAppearanceSettingsConfig,
  WebhookEventName,
  WebhookLogRecord,
} from '../types/builder.ts';
import { getDbState } from './index.ts';
import {
  accessPoliciesTable,
  analyticsEventsTable,
  apiSettingsTable,
  formSubmissionsTable,
  mediaAssetsTable,
  projectsTable,
  sessionsTable,
  uiAppearanceSettingsTable,
  usersTable,
  webTemplatesTable,
  webhookLogsTable,
} from './schema.ts';
import {
  packUiAppearanceStoragePayload,
  sanitizeUiAppearanceHiddenMap,
  sanitizeUiAppearanceLabelsMap,
  unpackUiAppearanceStoragePayload,
} from '../utils/uiAppearanceLabels.ts';
import {
  AppError,
  RevisionConflictError,
  StorageUnavailableError,
} from '../server/errors.ts';
import {
  hashSessionTokenWithHmac,
  isNonEmptyEnvSecret,
} from '../server/secrets.ts';
import {
  SsrfBlockedError,
  readResponseTextWithCap,
  safeFetch,
} from '../server/ssrfGuard.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export function resolveDataDir(): string {
  const custom = process.env.LYNK_DATA_DIR?.trim();
  if (custom) return path.resolve(custom);
  return path.resolve(__dirname, '../../.data');
}

export function resolveStoreFilePath(): string {
  return path.join(resolveDataDir(), 'lynk-server-store.json');
}

export interface StoredUserRecord {
  id: string;
  name: string;
  email: string;
  passwordHash: string;
  role: AccessRole;
  isActive: boolean;
  unitScope: 'all' | string[];
  permissions: FeaturePermissionsMap;
  planTier?: SaasPlanTier;
  maxSites?: number;
  subscriptionExpiresAt?: number | null;
  createdAt: number;
  updatedAt: number;
  lastLoginAt?: number | null;
}

export interface StoredSessionRecord {
  tokenHash: string;
  userId: string;
  expiresAt: number;
  userAgent: string;
  ipAddress: string;
  createdAt: number;
}

export interface StoredProjectEntry {
  record: ProjectRecord;
  renderedHtml: string;
  savedAt: number;
  ownerUserId?: string | null;
  sourceTemplateId?: string | null;
  posStoreId?: string | null;
  posSyncEnabled?: boolean;
}

export const LOCAL_JSON_SCHEMA_VERSION = 1;

export interface JsonStoreData {
  schemaVersion?: number;
  dbEngine?: 'local-json';
  users: StoredUserRecord[];
  sessions: StoredSessionRecord[];
  projects: Record<string, StoredProjectEntry>;
  events: AnalyticsEventRecord[];
  accessSettings?: AccessSettingsConfig;
  apiSettings?: ApiSettingsConfig;
  uiAppearanceSettings?: UiAppearanceSettingsConfig;
  webhookLogs: WebhookLogRecord[];
  mediaAssets?: MediaAssetMeta[];
  formSubmissions?: FormSubmissionRecord[];
  webTemplates?: SavedWebTemplate[];
}

export const FULL_PERMISSIONS: FeaturePermissionsMap = {
  editor: true,
  projects: true,
  publishing: true,
  ads_wa: true,
  analytics: true,
  export_backup: true,
  access_control: true,
};

export function getPresetPermissionsForRole(role: AccessRole): FeaturePermissionsMap {
  if (role === 'super_admin') {
    return { ...FULL_PERMISSIONS };
  }
  if (role === 'admin') {
    return {
      editor: true,
      projects: true,
      publishing: true,
      ads_wa: true,
      analytics: true,
      export_backup: true,
      access_control: false,
    };
  }
  if (role === 'editor') {
    return {
      editor: true,
      projects: false,
      publishing: false,
      ads_wa: false,
      analytics: true,
      export_backup: true,
      access_control: false,
    };
  }
  return {
    editor: false,
    projects: false,
    publishing: false,
    ads_wa: false,
    analytics: true,
    export_backup: false,
    access_control: false,
  };
}

export function createDefaultApiSettings(): ApiSettingsConfig {
  return {
    publicApiEnabled: true,
    requireAuthForBuilder: true,
    webhookUrl: '',
    webhookEvents: ['wa_click', 'form_submit', 'project_publish'],
    corsOrigins: '*',
    rateLimitPerMinute: 120,
    metaApiVersion: 'v21.0',
    waDefaultCountryCode: '62',
    autoPublishOnSave: false,
    updatedAt: Date.now(),
  };
}

export function createDefaultUiAppearanceSettings(): UiAppearanceSettingsConfig {
  return {
    labels: {},
    updatedAt: Date.now(),
  };
}

export function createDefaultAccessSettings(): AccessSettingsConfig {
  const now = Date.now();
  return {
    allUsersSuperAdmin: false,
    autoGrantSuperAdminOnJoin: false,
    defaultRole: 'viewer',
    activeMemberId: 'owner-super-admin',
    members: [
      {
        id: 'owner-super-admin',
        name: 'Super Admin Utama',
        email: 'owner@lynkbuilder.local',
        role: 'super_admin',
        isActive: true,
        unitScope: 'all',
        permissions: { ...FULL_PERMISSIONS },
        createdAt: now,
      },
    ],
    updatedAt: now,
  };
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string): boolean {
  const parts = storedHash.split(':');
  if (parts.length !== 2) return false;
  const [salt, keyHex] = parts;
  if (!salt || !keyHex) return false;
  try {
    const derived = crypto.scryptSync(password, salt, 64);
    const keyBuf = Buffer.from(keyHex, 'hex');
    if (derived.length !== keyBuf.length) return false;
    return crypto.timingSafeEqual(derived, keyBuf);
  } catch {
    return false;
  }
}

export function hashSessionToken(token: string): string {
  return hashSessionTokenWithHmac(token);
}

export function toPublicAuthUser(user: StoredUserRecord): AuthUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    isActive: user.isActive,
    unitScope: user.unitScope,
    permissions: user.permissions,
    planTier: user.planTier ?? 'free',
    maxSites: typeof user.maxSites === 'number' ? user.maxSites : 3,
    subscriptionExpiresAt: user.subscriptionExpiresAt ?? null,
    createdAt: user.createdAt,
    lastLoginAt: user.lastLoginAt ?? undefined,
  };
}

export function normalizeServerSlug(raw: string, fallback = 'unit-usaha'): string {
  const cleaned = (raw || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

export function normalizeHostHeader(rawHost?: string): string {
  return (rawHost || '').trim().toLowerCase().split(':')[0] || '';
}

// ============================================================
// JSON Store Atomic & Corrupt-Safe Helpers (F-09, F-10, F-25)
// ============================================================
let jsonCache: JsonStoreData | null = null;
let jsonCachePath: string | null = null;
let jsonWriteQueue: Promise<void> = Promise.resolve();
let jsonCorruptError: string | null = null;

let p0aHardeningPromise: Promise<void> | null = null;

export function resetJsonStoreCacheForTests(): void {
  jsonCache = null;
  jsonCachePath = null;
  jsonCorruptError = null;
  p0aHardeningDone = false;
  p0aHardeningPromise = null;
}

export function getJsonCorruptError(): string | null {
  return jsonCorruptError;
}

export async function assertStorageReady(): Promise<void> {
  const state = await getDbState();
  if (!state.ready || state.degraded) {
    throw new StorageUnavailableError(
      'STORAGE_UNAVAILABLE',
      state.lastError || 'Penyimpanan database tidak siap.'
    );
  }
  if (jsonCorruptError) {
    throw new StorageUnavailableError('STORAGE_CORRUPT', jsonCorruptError);
  }
}

function createEmptyJsonStore(): JsonStoreData {
  return {
    users: [],
    sessions: [],
    projects: {},
    events: [],
    accessSettings: createDefaultAccessSettings(),
    apiSettings: createDefaultApiSettings(),
    webhookLogs: [],
    mediaAssets: [],
  };
}

function normalizeLoadedProjectEntry(entry: StoredProjectEntry): StoredProjectEntry {
  const rev =
    typeof entry?.record?.revision === 'number' &&
    Number.isInteger(entry.record.revision) &&
    entry.record.revision >= 1
      ? entry.record.revision
      : 1;
  return {
    ...entry,
    sourceTemplateId:
      typeof entry.sourceTemplateId === 'string' && entry.sourceTemplateId.trim()
        ? entry.sourceTemplateId.trim()
        : null,
    posStoreId:
      typeof entry.posStoreId === 'string' && entry.posStoreId.trim()
        ? entry.posStoreId.trim()
        : null,
    posSyncEnabled: Boolean(entry.posSyncEnabled),
    record: {
      ...entry.record,
      revision: rev,
    },
  };
}

export async function loadJsonStore(): Promise<JsonStoreData> {
  const storeFile = resolveStoreFilePath();
  if (jsonCorruptError && jsonCachePath === storeFile) {
    throw new StorageUnavailableError('STORAGE_CORRUPT', jsonCorruptError);
  }
  if (jsonCache && jsonCachePath === storeFile) {
    return jsonCache;
  }

  let raw: string;
  try {
    raw = await fs.readFile(storeFile, 'utf-8');
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') {
      jsonCorruptError = null;
      jsonCachePath = storeFile;
      jsonCache = createEmptyJsonStore();
      return jsonCache;
    }
    const msg = `Gagal membaca store JSON (${code || 'IO_ERROR'}): ${err instanceof Error ? err.message : String(err)}`;
    jsonCorruptError = msg;
    jsonCachePath = storeFile;
    throw new StorageUnavailableError('STORAGE_READ_ERROR', msg);
  }

  let parsed: Partial<JsonStoreData>;
  try {
    parsed = JSON.parse(raw) as Partial<JsonStoreData>;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      throw new SyntaxError('Root JSON store bukan objek valid');
    }
  } catch (err) {
    const quarantineCopy = `${storeFile}.corrupt.${Date.now()}.bak`;
    await fs.copyFile(storeFile, quarantineCopy).catch(() => {});
    const msg = `File store JSON rusak/korup (${err instanceof Error ? err.message : 'SyntaxError'}). File asli tetap dipertahankan dan disalin ke ${path.basename(quarantineCopy)} — penulisan diblokir untuk mencegah kehilangan data.`;
    jsonCorruptError = msg;
    jsonCachePath = storeFile;
    console.error(`[STORAGE][CRITICAL] ${msg}`);
    throw new StorageUnavailableError('STORAGE_CORRUPT', msg);
  }

  const normalizedProjects: Record<string, StoredProjectEntry> = {};
  if (parsed.projects && typeof parsed.projects === 'object') {
    for (const [k, v] of Object.entries(parsed.projects)) {
      if (v && v.record && v.record.id) {
        normalizedProjects[k] = normalizeLoadedProjectEntry(v);
      }
    }
  }

  jsonCorruptError = null;
  jsonCachePath = storeFile;
  jsonCache = {
    users: Array.isArray(parsed.users) ? parsed.users : [],
    sessions: Array.isArray(parsed.sessions) ? parsed.sessions : [],
    projects: normalizedProjects,
    events: Array.isArray(parsed.events) ? parsed.events : [],
    accessSettings: parsed.accessSettings || createDefaultAccessSettings(),
    apiSettings: parsed.apiSettings || createDefaultApiSettings(),
    uiAppearanceSettings: parsed.uiAppearanceSettings
      ? (() => {
          const unpacked = unpackUiAppearanceStoragePayload(parsed.uiAppearanceSettings.labels);
          const directHidden = sanitizeUiAppearanceHiddenMap(parsed.uiAppearanceSettings.hiddenKeys);
          return {
            labels: unpacked.labels,
            hiddenKeys: { ...unpacked.hiddenKeys, ...directHidden },
            updatedAt: Number(parsed.uiAppearanceSettings.updatedAt || Date.now()),
          };
        })()
      : undefined,
    webhookLogs: Array.isArray(parsed.webhookLogs) ? parsed.webhookLogs : [],
    mediaAssets: Array.isArray(parsed.mediaAssets) ? parsed.mediaAssets : [],
    formSubmissions: Array.isArray(parsed.formSubmissions) ? parsed.formSubmissions : [],
    webTemplates: Array.isArray(parsed.webTemplates) ? parsed.webTemplates : [],
  };
  return jsonCache;
}

export async function persistJsonStore(data: JsonStoreData): Promise<void> {
  const storeFile = resolveStoreFilePath();
  if (jsonCorruptError && jsonCachePath === storeFile) {
    throw new StorageUnavailableError('STORAGE_CORRUPT', jsonCorruptError);
  }

  const serialized = JSON.stringify(data);
  const run = jsonWriteQueue.then(async () => {
    const dataDir = resolveDataDir();
    await fs.mkdir(dataDir, { recursive: true });
    const tmpFile = `${storeFile}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
    const handle = await fs.open(tmpFile, 'w', 0o600);
    try {
      await handle.writeFile(serialized, 'utf-8');
      await handle.sync();
    } catch (writeErr) {
      await handle.close().catch(() => {});
      await fs.unlink(tmpFile).catch(() => {});
      throw writeErr;
    }
    await handle.close();
    try {
      await fs.rename(tmpFile, storeFile);
    } catch (renameErr) {
      await fs.unlink(tmpFile).catch(() => {});
      throw renameErr;
    }
    jsonCachePath = storeFile;
    jsonCache = JSON.parse(serialized) as JsonStoreData;
  });

  jsonWriteQueue = run.then(
    () => undefined,
    () => undefined
  );

  return run;
}

let registrationLockQueue: Promise<void> = Promise.resolve();
function withRegistrationLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = registrationLockQueue.then(fn, fn);
  registrationLockQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

let jsonStoreLockQueue: Promise<void> = Promise.resolve();
export function withJsonStoreLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = jsonStoreLockQueue.then(fn, fn);
  jsonStoreLockQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

let projectMutationLockQueue: Promise<void> = Promise.resolve();
function withProjectMutationLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = projectMutationLockQueue.then(fn, fn);
  projectMutationLockQueue = run.then(
    () => undefined,
    () => undefined
  );
  return run;
}

function mapPgUser(row: typeof usersTable.$inferSelect): StoredUserRecord {
  return {
    id: row.id,
    name: row.name,
    email: row.email,
    passwordHash: row.passwordHash,
    role: row.role,
    isActive: row.isActive,
    unitScope: row.unitScopeJson,
    permissions: row.permissionsJson,
    planTier: (row.planTier as SaasPlanTier) || 'free',
    maxSites: typeof row.maxSites === 'number' ? row.maxSites : 3,
    subscriptionExpiresAt: row.subscriptionExpiresAt ?? null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
    lastLoginAt: row.lastLoginAt ?? undefined,
  };
}

let p0aHardeningDone = false;

export async function ensureP0AAccessHardening(): Promise<void> {
  if (p0aHardeningDone) return;
  if (p0aHardeningPromise) return p0aHardeningPromise;

  p0aHardeningPromise = (async () => {
    await assertStorageReady();
    const state = await getDbState();
    const now = Date.now();

    if (state.db) {
      const [policy] = await state.db
        .select()
        .from(accessPoliciesTable)
        .where(eq(accessPoliciesTable.id, 'default'))
        .limit(1);

      if (
        policy &&
        (policy.allUsersSuperAdmin ||
          policy.autoGrantSuperAdminOnJoin ||
          policy.defaultRole === 'super_admin' ||
          policy.defaultRole === 'admin')
      ) {
        const safeDefaultRole: AccessRole =
          policy.defaultRole === 'editor' ? 'editor' : 'viewer';
        await state.db
          .update(accessPoliciesTable)
          .set({
            allUsersSuperAdmin: false,
            autoGrantSuperAdminOnJoin: false,
            defaultRole: safeDefaultRole,
            updatedAt: now,
          })
          .where(eq(accessPoliciesTable.id, 'default'));
      }
      p0aHardeningDone = true;
      return;
    }

    await withJsonStoreLock(async () => {
      const store = await loadJsonStore();
      if (store.accessSettings) {
        const cur = store.accessSettings;
        const needsPolicyFix =
          cur.allUsersSuperAdmin ||
          cur.autoGrantSuperAdminOnJoin ||
          cur.defaultRole === 'super_admin' ||
          cur.defaultRole === 'admin';
        if (needsPolicyFix) {
          store.accessSettings = {
            ...cur,
            allUsersSuperAdmin: false,
            autoGrantSuperAdminOnJoin: false,
            defaultRole: cur.defaultRole === 'editor' ? 'editor' : 'viewer',
            updatedAt: now,
          };
          await persistJsonStore(store);
        }
      }
    });
    p0aHardeningDone = true;
  })().finally(() => {
    p0aHardeningPromise = null;
  });

  return p0aHardeningPromise;
}

export async function registerUserAtomically(params: {
  name: string;
  email: string;
  password: string;
}): Promise<
  | { ok: true; user: StoredUserRecord; isFirstUser: boolean }
  | { ok: false; code: 'EMAIL_EXISTS' }
> {
  await assertStorageReady();
  const cleanName = params.name.trim().slice(0, 80);
  const cleanEmail = params.email.trim().toLowerCase().slice(0, 120);
  const passwordHash = hashPassword(params.password);

  return withRegistrationLock(async () => {
    await ensureP0AAccessHardening();
    const access = await getAccessSettings();
    const publicLeastRole: AccessRole =
      access.defaultRole === 'editor' ? 'editor' : 'viewer';

    const state = await getDbState();
    const now = Date.now();

    if (state.pool && state.db) {
      const client = await state.pool.connect();
      try {
        await client.query('BEGIN');
        await client.query('SELECT pg_advisory_xact_lock(94827163)');

        const dupRes = await client.query<{ id: string }>(
          'SELECT id FROM users WHERE lower(email) = $1 LIMIT 1',
          [cleanEmail]
        );
        if (dupRes.rows.length > 0) {
          await client.query('ROLLBACK');
          return { ok: false, code: 'EMAIL_EXISTS' };
        }

        const cntRes = await client.query<{ cnt: number }>(
          'SELECT count(*)::int AS cnt FROM users'
        );
        const isFirstUser = Number(cntRes.rows[0]?.cnt ?? 0) === 0;
        const assignedRole: AccessRole = isFirstUser ? 'super_admin' : publicLeastRole;
        const unitScope: 'all' | string[] = isFirstUser ? 'all' : [];
        const permissions = isFirstUser
          ? { ...FULL_PERMISSIONS }
          : getPresetPermissionsForRole(assignedRole);
        const userId = isFirstUser
          ? 'owner-super-admin'
          : `usr_${crypto.randomBytes(6).toString('hex')}`;
        const planTier: SaasPlanTier = isFirstUser ? 'enterprise' : 'free';
        const maxSites = isFirstUser ? 999 : 3;

        await client.query(
          `INSERT INTO users (id, name, email, password_hash, role, is_active, unit_scope_json, permissions_json, plan_tier, max_sites, subscription_expires_at, created_at, updated_at, last_login_at)
           VALUES ($1, $2, $3, $4, $5, TRUE, $6::jsonb, $7::jsonb, $8, $9, NULL, $10, $10, $10)`,
          [
            userId,
            cleanName,
            cleanEmail,
            passwordHash,
            assignedRole,
            JSON.stringify(unitScope),
            JSON.stringify(permissions),
            planTier,
            maxSites,
            now,
          ]
        );

        if (isFirstUser) {
          await client.query(
            `INSERT INTO access_policies (id, all_users_super_admin, auto_grant_super_admin_on_join, default_role, active_member_id, updated_at)
             VALUES ('default', FALSE, FALSE, $1, $2, $3)
             ON CONFLICT (id) DO UPDATE SET
               all_users_super_admin = FALSE,
               auto_grant_super_admin_on_join = FALSE,
               default_role = EXCLUDED.default_role,
               active_member_id = EXCLUDED.active_member_id,
               updated_at = EXCLUDED.updated_at`,
            [publicLeastRole, userId, now]
          );
        }

        await client.query('COMMIT');

        const createdUser: StoredUserRecord = {
          id: userId,
          name: cleanName,
          email: cleanEmail,
          passwordHash,
          role: assignedRole,
          isActive: true,
          unitScope,
          permissions,
          planTier,
          maxSites,
          subscriptionExpiresAt: null,
          createdAt: now,
          updatedAt: now,
          lastLoginAt: now,
        };
        return { ok: true, user: createdUser, isFirstUser };
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    }

    return withJsonStoreLock(async () => {
      const store = await loadJsonStore();
      if (store.users.some((u) => u.email.toLowerCase() === cleanEmail)) {
        return { ok: false, code: 'EMAIL_EXISTS' as const };
      }

      const isFirstUser = store.users.length === 0;
      const assignedRole: AccessRole = isFirstUser ? 'super_admin' : publicLeastRole;
      const unitScope: 'all' | string[] = isFirstUser ? 'all' : [];
      const permissions = isFirstUser
        ? { ...FULL_PERMISSIONS }
        : getPresetPermissionsForRole(assignedRole);
      const createdUser: StoredUserRecord = {
        id: isFirstUser
          ? 'owner-super-admin'
          : `usr_${crypto.randomBytes(6).toString('hex')}`,
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        role: assignedRole,
        isActive: true,
        unitScope,
        permissions,
        planTier: isFirstUser ? 'enterprise' : 'free',
        maxSites: isFirstUser ? 999 : 3,
        subscriptionExpiresAt: null,
        createdAt: now,
        updatedAt: now,
        lastLoginAt: now,
      };

      const nextStore: JsonStoreData = {
        ...store,
        users: [...store.users, createdUser],
      };
      const baseAccess = store.accessSettings || createDefaultAccessSettings();
      const realIds = new Set(nextStore.users.map((u) => u.id));
      nextStore.accessSettings = {
        ...baseAccess,
        allUsersSuperAdmin: false,
        autoGrantSuperAdminOnJoin: false,
        defaultRole: baseAccess.defaultRole === 'editor' ? 'editor' : 'viewer',
        activeMemberId: isFirstUser ? createdUser.id : baseAccess.activeMemberId,
        members: [
          ...baseAccess.members.filter(
            (m) =>
              m.id !== createdUser.id &&
              m.email.toLowerCase() !== cleanEmail &&
              (m.id !== 'owner-super-admin' || realIds.has('owner-super-admin'))
          ),
          {
            id: createdUser.id,
            name: createdUser.name,
            email: createdUser.email,
            role: createdUser.role,
            isActive: createdUser.isActive,
            unitScope: createdUser.unitScope,
            permissions: createdUser.permissions,
            createdAt: createdUser.createdAt,
          },
        ],
        updatedAt: now,
      };
      await persistJsonStore(nextStore);

      return { ok: true as const, user: createdUser, isFirstUser };
    });
  });
}

export async function appendProjectToUserScope(
  userId: string,
  projectId: string
): Promise<void> {
  const user = await getUserById(userId);
  if (!user || user.unitScope === 'all') return;
  const current = Array.isArray(user.unitScope) ? user.unitScope : [];
  if (current.includes(projectId)) return;
  await upsertUser({
    ...user,
    unitScope: [...current, projectId],
    updatedAt: Date.now(),
  });
}

// ============================================================
// Users & Sessions Repository
// ============================================================
export async function countUsers(): Promise<number> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    const [res] = await state.db.select({ value: count() }).from(usersTable);
    return Number(res?.value ?? 0);
  }
  const store = await loadJsonStore();
  return store.users.length;
}

export async function listUsers(): Promise<StoredUserRecord[]> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    const rows = await state.db.select().from(usersTable);
    return rows.map(mapPgUser);
  }
  const store = await loadJsonStore();
  return [...store.users];
}

export async function getUserById(id: string): Promise<StoredUserRecord | null> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    const [row] = await state.db.select().from(usersTable).where(eq(usersTable.id, id)).limit(1);
    return row ? mapPgUser(row) : null;
  }
  const store = await loadJsonStore();
  return store.users.find((u) => u.id === id) ?? null;
}

export async function getUserByEmail(email: string): Promise<StoredUserRecord | null> {
  await assertStorageReady();
  const normalized = email.trim().toLowerCase();
  const state = await getDbState();
  if (state.db) {
    const [row] = await state.db
      .select()
      .from(usersTable)
      .where(sql`lower(${usersTable.email}) = ${normalized}`)
      .limit(1);
    return row ? mapPgUser(row) : null;
  }
  const store = await loadJsonStore();
  return store.users.find((u) => u.email.toLowerCase() === normalized) ?? null;
}

export async function upsertUser(user: StoredUserRecord): Promise<StoredUserRecord> {
  await assertStorageReady();
  const normalized: StoredUserRecord = {
    ...user,
    email: user.email.trim().toLowerCase(),
    planTier: user.planTier ?? 'free',
    maxSites: typeof user.maxSites === 'number' ? user.maxSites : 3,
    subscriptionExpiresAt: user.subscriptionExpiresAt ?? null,
  };
  const state = await getDbState();
  if (state.db) {
    await state.db
      .insert(usersTable)
      .values({
        id: normalized.id,
        name: normalized.name,
        email: normalized.email,
        passwordHash: normalized.passwordHash,
        role: normalized.role,
        isActive: normalized.isActive,
        unitScopeJson: normalized.unitScope,
        permissionsJson: normalized.permissions,
        planTier: normalized.planTier ?? 'free',
        maxSites: normalized.maxSites ?? 3,
        subscriptionExpiresAt: normalized.subscriptionExpiresAt ?? null,
        createdAt: normalized.createdAt,
        updatedAt: normalized.updatedAt,
        lastLoginAt: normalized.lastLoginAt ?? null,
      })
      .onConflictDoUpdate({
        target: usersTable.id,
        set: {
          name: normalized.name,
          email: normalized.email,
          passwordHash: normalized.passwordHash,
          role: normalized.role,
          isActive: normalized.isActive,
          unitScopeJson: normalized.unitScope,
          permissionsJson: normalized.permissions,
          planTier: normalized.planTier ?? 'free',
          maxSites: normalized.maxSites ?? 3,
          subscriptionExpiresAt: normalized.subscriptionExpiresAt ?? null,
          updatedAt: normalized.updatedAt,
          lastLoginAt: normalized.lastLoginAt ?? null,
        },
      });
    return normalized;
  }

  return withJsonStoreLock(async () => {
    const store = await loadJsonStore();
    const users = [...store.users];
    const idx = users.findIndex((u) => u.id === normalized.id);
    if (idx >= 0) {
      users[idx] = normalized;
    } else {
      users.push(normalized);
    }
    await persistJsonStore({ ...store, users });
    return normalized;
  });
}

export async function updateUserLoginTime(userId: string): Promise<void> {
  await assertStorageReady();
  const now = Date.now();
  const state = await getDbState();
  if (state.db) {
    await state.db
      .update(usersTable)
      .set({ lastLoginAt: now, updatedAt: now })
      .where(eq(usersTable.id, userId));
    return;
  }
  await withJsonStoreLock(async () => {
    const store = await loadJsonStore();
    const users = store.users.map((u) =>
      u.id === userId ? { ...u, lastLoginAt: now, updatedAt: now } : u
    );
    await persistJsonStore({ ...store, users });
  });
}

export async function deleteUserById(userId: string): Promise<void> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    await state.db.delete(usersTable).where(eq(usersTable.id, userId));
    return;
  }
  await withJsonStoreLock(async () => {
    const store = await loadJsonStore();
    await persistJsonStore({
      ...store,
      users: store.users.filter((u) => u.id !== userId),
      sessions: store.sessions.filter((s) => s.userId !== userId),
    });
  });
}

export async function revokeUserSessions(userId: string): Promise<void> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    await state.db.delete(sessionsTable).where(eq(sessionsTable.userId, userId));
    return;
  }
  await withJsonStoreLock(async () => {
    const store = await loadJsonStore();
    await persistJsonStore({
      ...store,
      sessions: store.sessions.filter((s) => s.userId !== userId),
    });
  });
}

export async function createSession(params: {
  userId: string;
  userAgent: string;
  ipAddress: string;
  ttlMs?: number;
}): Promise<{ rawToken: string; expiresAt: number }> {
  await assertStorageReady();
  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = hashSessionToken(rawToken);
  const now = Date.now();
  const expiresAt = now + (params.ttlMs ?? 1000 * 60 * 60 * 24 * 14);

  const session: StoredSessionRecord = {
    tokenHash,
    userId: params.userId,
    expiresAt,
    userAgent: params.userAgent.slice(0, 200),
    ipAddress: params.ipAddress.slice(0, 64),
    createdAt: now,
  };

  const state = await getDbState();
  if (state.db) {
    await state.db.insert(sessionsTable).values(session);
    return { rawToken, expiresAt };
  }

  return withJsonStoreLock(async () => {
    const store = await loadJsonStore();
    const nextSessions = [
      session,
      ...store.sessions.filter((s) => s.expiresAt > now),
    ].slice(0, 500);
    await persistJsonStore({ ...store, sessions: nextSessions });
    return { rawToken, expiresAt };
  });
}

export async function getSessionUserByToken(
  rawToken: string
): Promise<StoredUserRecord | null> {
  if (!rawToken) return null;
  await assertStorageReady();
  const tokenHash = hashSessionToken(rawToken);
  const now = Date.now();
  const state = await getDbState();

  if (state.db) {
    const [sess] = await state.db
      .select()
      .from(sessionsTable)
      .where(eq(sessionsTable.tokenHash, tokenHash))
      .limit(1);
    if (!sess) return null;
    if (sess.expiresAt <= now) {
      await state.db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, tokenHash));
      return null;
    }
    return getUserById(sess.userId);
  }

  return withJsonStoreLock(async () => {
    const store = await loadJsonStore();
    const sess = store.sessions.find((s) => s.tokenHash === tokenHash);
    if (!sess) return null;
    if (sess.expiresAt <= now) {
      await persistJsonStore({
        ...store,
        sessions: store.sessions.filter((s) => s.tokenHash !== tokenHash),
      });
      return null;
    }
    return store.users.find((u) => u.id === sess.userId) ?? null;
  });
}

export async function deleteSessionByToken(rawToken: string): Promise<void> {
  if (!rawToken) return;
  await assertStorageReady();
  const tokenHash = hashSessionToken(rawToken);
  const state = await getDbState();
  if (state.db) {
    await state.db.delete(sessionsTable).where(eq(sessionsTable.tokenHash, tokenHash));
    return;
  }
  await withJsonStoreLock(async () => {
    const store = await loadJsonStore();
    await persistJsonStore({
      ...store,
      sessions: store.sessions.filter((s) => s.tokenHash !== tokenHash),
    });
  });
}

// ============================================================
// Projects Repository (with Revision OCC - F-06)
// ============================================================
export async function listProjectEntries(): Promise<StoredProjectEntry[]> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    const rows = await state.db
      .select()
      .from(projectsTable)
      .orderBy(desc(projectsTable.updatedAt));
    return rows.map((row) => ({
      record: {
        id: row.id,
        revision: row.revision ?? 1,
        project: row.projectJson,
        updatedAt: row.updatedAt,
        lastSavedAt: row.lastSavedAt,
      },
      renderedHtml: row.renderedHtml,
      savedAt: row.lastSavedAt,
      ownerUserId: row.ownerUserId,
      sourceTemplateId: row.sourceTemplateId ?? null,
      posStoreId: row.posStoreId ?? null,
      posSyncEnabled: Boolean(row.posSyncEnabled),
    }));
  }
  const store = await loadJsonStore();
  return Object.values(store.projects)
    .map(normalizeLoadedProjectEntry)
    .sort((a, b) => b.savedAt - a.savedAt);
}

export async function getProjectEntryById(
  projectId: string
): Promise<StoredProjectEntry | null> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    const [row] = await state.db
      .select()
      .from(projectsTable)
      .where(eq(projectsTable.id, projectId))
      .limit(1);
    if (!row) return null;
    return {
      record: {
        id: row.id,
        revision: row.revision ?? 1,
        project: row.projectJson,
        updatedAt: row.updatedAt,
        lastSavedAt: row.lastSavedAt,
      },
      renderedHtml: row.renderedHtml,
      savedAt: row.lastSavedAt,
      ownerUserId: row.ownerUserId,
      sourceTemplateId: row.sourceTemplateId ?? null,
      posStoreId: row.posStoreId ?? null,
      posSyncEnabled: Boolean(row.posSyncEnabled),
    };
  }
  const store = await loadJsonStore();
  const entry = store.projects[projectId];
  return entry ? normalizeLoadedProjectEntry(entry) : null;
}

export async function getProjectEntryBySlug(
  slug: string
): Promise<StoredProjectEntry | null> {
  await assertStorageReady();
  const clean = normalizeServerSlug(slug, '');
  if (!clean) return null;
  const state = await getDbState();
  if (state.db) {
    const [row] = await state.db
      .select()
      .from(projectsTable)
      .where(sql`lower(${projectsTable.slug}) = ${clean}`)
      .limit(1);
    if (!row) return null;
    return {
      record: {
        id: row.id,
        revision: row.revision ?? 1,
        project: row.projectJson,
        updatedAt: row.updatedAt,
        lastSavedAt: row.lastSavedAt,
      },
      renderedHtml: row.renderedHtml,
      savedAt: row.lastSavedAt,
      ownerUserId: row.ownerUserId,
      sourceTemplateId: row.sourceTemplateId ?? null,
      posStoreId: row.posStoreId ?? null,
      posSyncEnabled: Boolean(row.posSyncEnabled),
    };
  }
  const store = await loadJsonStore();
  const found =
    Object.values(store.projects).find(
      (item) =>
        normalizeServerSlug(
          item.record.project.publishing?.slug || item.record.project.title || item.record.id,
          'unit-usaha'
        ) === clean
    ) ?? null;
  return found ? normalizeLoadedProjectEntry(found) : null;
}

export async function getProjectEntryByDomain(
  host: string
): Promise<StoredProjectEntry | null> {
  const cleanHost = normalizeHostHeader(host);
  if (!cleanHost) return null;
  const entries = await listProjectEntries();
  return (
    entries.find((entry) => {
      const pub = entry.record.project.publishing;
      if (!pub?.isPublished || !pub.useCustomDomain || !pub.customDomain) return false;
      return pub.customDomain.toLowerCase() === cleanHost;
    }) ?? null
  );
}

export async function upsertProjectEntry(
  entry: StoredProjectEntry,
  options?: { expectedRevision?: number }
): Promise<StoredProjectEntry> {
  await assertStorageReady();

  return withProjectMutationLock(async () => {
    const state = await getDbState();
    const rec = entry.record;
    const pub = rec.project.publishing;
    const slug = normalizeServerSlug(pub?.slug || rec.project.title || rec.id, 'unit-usaha');
    const customDomain = normalizeHostHeader(pub?.customDomain);
    const useCustomDomain = Boolean(pub?.useCustomDomain);
    const isPublished = Boolean(pub?.isPublished);
    const publishedAt = pub?.publishedAt ?? null;
    const now = entry.savedAt || Date.now();
    const expectedRevision = options?.expectedRevision;

    if (state.pool && state.db) {
      const client = await state.pool.connect();
      try {
        await client.query('BEGIN');
        const curRes = await client.query<{
          revision: number;
          owner_user_id: string | null;
          source_template_id: string | null;
          pos_store_id: string | null;
          pos_sync_enabled: boolean;
        }>(
          'SELECT revision, owner_user_id, source_template_id, pos_store_id, pos_sync_enabled FROM projects WHERE id = $1 FOR UPDATE',
          [rec.id]
        );
        if (curRes.rows.length > 0) {
          const curRow = curRes.rows[0];
          const currentRevision = Number(curRow.revision ?? 1);
          if (
            typeof expectedRevision === 'number' &&
            expectedRevision !== currentRevision
          ) {
            await client.query('ROLLBACK');
            const latest = await getProjectEntryById(rec.id);
            throw new RevisionConflictError(currentRevision, latest?.record ?? null);
          }
          const nextRevision = currentRevision + 1;
          const nextSourceTemplateId =
            entry.sourceTemplateId !== undefined
              ? entry.sourceTemplateId
              : curRow.source_template_id;
          const nextPosStoreId =
            entry.posStoreId !== undefined ? entry.posStoreId : curRow.pos_store_id;
          const nextPosSyncEnabled =
            entry.posSyncEnabled !== undefined
              ? Boolean(entry.posSyncEnabled)
              : Boolean(curRow.pos_sync_enabled);

          await client.query(
            `UPDATE projects
             SET revision = $2,
                 title = $3,
                 slug = $4,
                 custom_domain = $5,
                 use_custom_domain = $6,
                 is_published = $7,
                 published_at = $8,
                 source_template_id = $9,
                 pos_store_id = $10,
                 pos_sync_enabled = $11,
                 project_json = $12::jsonb,
                 rendered_html = $13,
                 updated_at = $14,
                 last_saved_at = $15
             WHERE id = $1 AND revision = $16`,
            [
              rec.id,
              nextRevision,
              rec.project.title,
              slug,
              customDomain,
              useCustomDomain,
              isPublished,
              publishedAt,
              nextSourceTemplateId ?? null,
              nextPosStoreId ?? null,
              nextPosSyncEnabled,
              JSON.stringify(rec.project),
              entry.renderedHtml,
              rec.updatedAt || now,
              rec.lastSavedAt || now,
              currentRevision,
            ]
          );
          await client.query('COMMIT');
          return {
            ...entry,
            ownerUserId: curRow.owner_user_id ?? entry.ownerUserId ?? null,
            sourceTemplateId: nextSourceTemplateId ?? null,
            posStoreId: nextPosStoreId ?? null,
            posSyncEnabled: nextPosSyncEnabled,
            record: {
              ...rec,
              revision: nextRevision,
            },
          };
        }

        const initialRevision = 1;
        await client.query(
          `INSERT INTO projects (id, owner_user_id, revision, title, slug, custom_domain, use_custom_domain, is_published, published_at, source_template_id, pos_store_id, pos_sync_enabled, project_json, rendered_html, updated_at, last_saved_at, created_at)
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13::jsonb, $14, $15, $16, $17)`,
          [
            rec.id,
            entry.ownerUserId ?? null,
            initialRevision,
            rec.project.title,
            slug,
            customDomain,
            useCustomDomain,
            isPublished,
            publishedAt,
            entry.sourceTemplateId ?? null,
            entry.posStoreId ?? null,
            Boolean(entry.posSyncEnabled),
            JSON.stringify(rec.project),
            entry.renderedHtml,
            rec.updatedAt || now,
            rec.lastSavedAt || now,
            now,
          ]
        );
        await client.query('COMMIT');
        return {
          ...entry,
          sourceTemplateId: entry.sourceTemplateId ?? null,
          posStoreId: entry.posStoreId ?? null,
          posSyncEnabled: Boolean(entry.posSyncEnabled),
          record: {
            ...rec,
            revision: initialRevision,
          },
        };
      } catch (err) {
        await client.query('ROLLBACK').catch(() => {});
        throw err;
      } finally {
        client.release();
      }
    }

    return withJsonStoreLock(async () => {
      const store = await loadJsonStore();
      const existingRaw = store.projects[rec.id];
      const existing = existingRaw ? normalizeLoadedProjectEntry(existingRaw) : undefined;

      let nextRevision = 1;
      if (existing) {
        const currentRevision = existing.record.revision ?? 1;
        if (
          typeof expectedRevision === 'number' &&
          expectedRevision !== currentRevision
        ) {
          throw new RevisionConflictError(currentRevision, existing.record);
        }
        nextRevision = currentRevision + 1;
      }

      const nextSourceTemplateId =
        entry.sourceTemplateId !== undefined
          ? entry.sourceTemplateId
          : existing?.sourceTemplateId ?? null;
      const nextPosStoreId =
        entry.posStoreId !== undefined ? entry.posStoreId : existing?.posStoreId ?? null;
      const nextPosSyncEnabled =
        entry.posSyncEnabled !== undefined
          ? Boolean(entry.posSyncEnabled)
          : Boolean(existing?.posSyncEnabled);

      const storedEntry: StoredProjectEntry = {
        ...entry,
        ownerUserId: existing?.ownerUserId ?? entry.ownerUserId ?? null,
        sourceTemplateId: nextSourceTemplateId ?? null,
        posStoreId: nextPosStoreId ?? null,
        posSyncEnabled: nextPosSyncEnabled,
        record: {
          ...rec,
          revision: nextRevision,
        },
      };

      const nextProjects = {
        ...store.projects,
        [rec.id]: storedEntry,
      };
      await persistJsonStore({ ...store, projects: nextProjects });
      return storedEntry;
    });
  });
}

export async function deleteProjectEntry(projectId: string): Promise<void> {
  await assertStorageReady();
  return withProjectMutationLock(async () => {
    const state = await getDbState();
    if (state.db) {
      await state.db.delete(projectsTable).where(eq(projectsTable.id, projectId));
      return;
    }
    await withJsonStoreLock(async () => {
      const store = await loadJsonStore();
      if (store.projects[projectId]) {
        const nextProjects = { ...store.projects };
        delete nextProjects[projectId];
        await persistJsonStore({ ...store, projects: nextProjects });
      }
    });
  });
}

// ============================================================
// Media Assets Metadata Repository (F-15)
// ============================================================
export async function upsertMediaAssetMeta(
  meta: MediaAssetMeta,
  createdBy?: string | null
): Promise<MediaAssetMeta> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    await state.db
      .insert(mediaAssetsTable)
      .values({
        id: meta.id,
        filename: meta.filename,
        mimeType: meta.mimeType,
        sizeBytes: meta.sizeBytes,
        sha256: meta.sha256,
        createdBy: createdBy ?? null,
        createdAt: meta.createdAt,
      })
      .onConflictDoUpdate({
        target: mediaAssetsTable.id,
        set: {
          mimeType: meta.mimeType,
          sizeBytes: meta.sizeBytes,
          sha256: meta.sha256,
        },
      });
    return meta;
  }

  return withJsonStoreLock(async () => {
    const store = await loadJsonStore();
    const existing = Array.isArray(store.mediaAssets) ? store.mediaAssets : [];
    const filtered = existing.filter((m) => m.id !== meta.id && m.filename !== meta.filename);
    await persistJsonStore({
      ...store,
      mediaAssets: [meta, ...filtered],
    });
    return meta;
  });
}

export async function listMediaAssetMetas(): Promise<MediaAssetMeta[]> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    const rows = await state.db
      .select()
      .from(mediaAssetsTable)
      .orderBy(desc(mediaAssetsTable.createdAt));
    return rows.map((r) => ({
      id: r.id,
      filename: r.filename,
      url: `/api/media/${r.filename}`,
      mimeType: r.mimeType,
      sizeBytes: r.sizeBytes,
      sha256: r.sha256,
      createdAt: r.createdAt,
    }));
  }
  const store = await loadJsonStore();
  return Array.isArray(store.mediaAssets) ? [...store.mediaAssets] : [];
}

// ============================================================
// Analytics Repository
// ============================================================
export async function insertAnalyticsEvent(
  event: AnalyticsEventRecord
): Promise<boolean> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    const [existing] = await state.db
      .select({ id: analyticsEventsTable.id })
      .from(analyticsEventsTable)
      .where(eq(analyticsEventsTable.id, event.id))
      .limit(1);
    if (existing) return false;
    await state.db.insert(analyticsEventsTable).values({
      id: event.id,
      projectId: event.projectId,
      projectTitle: event.projectTitle,
      slug: event.slug || '',
      eventType: event.eventType,
      channel: event.channel,
      sourceLabel: event.sourceLabel,
      ctaLabel: event.ctaLabel ?? null,
      waPhone: event.waPhone ?? null,
      orderValue: typeof event.orderValue === 'number' ? Math.round(event.orderValue) : null,
      utmSource: event.utmSource ?? null,
      utmMedium: event.utmMedium ?? null,
      utmCampaign: event.utmCampaign ?? null,
      utmContent: event.utmContent ?? null,
      clickIdType: event.clickIdType ?? null,
      deviceType: event.deviceType,
      isTest: Boolean(event.isTest),
      createdAt: event.createdAt,
    });
    return true;
  }

  return withJsonStoreLock(async () => {
    const store = await loadJsonStore();
    if (store.events.some((e) => e.id === event.id)) return false;
    // Deduplikasi event identik (dedupeKey) dalam jendela 3 detik agar tidak tercatat ganda
    if (event.dedupeKey) {
      const recentDup = store.events.find(
        (e) =>
          e.dedupeKey === event.dedupeKey &&
          e.projectId === event.projectId &&
          Math.abs((e.createdAt || 0) - (event.createdAt || 0)) < 3000
      );
      if (recentDup) return false;
    }
    await persistJsonStore({
      ...store,
      events: [event, ...store.events].slice(0, 5000),
    });
    return true;
  });
}

export async function listAnalyticsEvents(
  projectId?: string
): Promise<AnalyticsEventRecord[]> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    const rows = projectId
      ? await state.db
          .select()
          .from(analyticsEventsTable)
          .where(eq(analyticsEventsTable.projectId, projectId))
          .orderBy(desc(analyticsEventsTable.createdAt))
          .limit(5000)
      : await state.db
          .select()
          .from(analyticsEventsTable)
          .orderBy(desc(analyticsEventsTable.createdAt))
          .limit(5000);
    return rows.map((r) => ({
      id: r.id,
      projectId: r.projectId,
      projectTitle: r.projectTitle,
      slug: r.slug,
      eventType: r.eventType as AnalyticsEventRecord['eventType'],
      channel: r.channel as AnalyticsEventRecord['channel'],
      sourceLabel: r.sourceLabel,
      ctaLabel: r.ctaLabel ?? undefined,
      waPhone: r.waPhone ?? undefined,
      orderValue: r.orderValue ?? undefined,
      utmSource: r.utmSource ?? undefined,
      utmMedium: r.utmMedium ?? undefined,
      utmCampaign: r.utmCampaign ?? undefined,
      utmContent: r.utmContent ?? undefined,
      clickIdType: (r.clickIdType as AnalyticsEventRecord['clickIdType']) ?? undefined,
      deviceType: r.deviceType as AnalyticsEventRecord['deviceType'],
      isTest: r.isTest,
      createdAt: r.createdAt,
    }));
  }

  const store = await loadJsonStore();
  return projectId
    ? store.events.filter((ev) => ev.projectId === projectId)
    : store.events;
}

export async function clearAnalyticsEvents(projectId?: string): Promise<void> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    if (projectId) {
      await state.db
        .delete(analyticsEventsTable)
        .where(eq(analyticsEventsTable.projectId, projectId));
    } else {
      await state.db.delete(analyticsEventsTable);
    }
    return;
  }

  await withJsonStoreLock(async () => {
    const store = await loadJsonStore();
    await persistJsonStore({
      ...store,
      events: projectId ? store.events.filter((ev) => ev.projectId !== projectId) : [],
    });
  });
}

// ============================================================
// Form Submissions Repository (PostgreSQL + Local JSON Fallback)
// ============================================================
function rowToFormSubmission(
  row: typeof formSubmissionsTable.$inferSelect
): FormSubmissionRecord {
  return {
    id: row.id,
    projectId: row.projectId,
    projectTitle: row.projectTitle,
    slug: row.slug || '',
    componentId: row.componentId,
    formTitle: row.formTitle,
    formCategory: row.formCategory ?? undefined,
    values: (row.valuesJson && typeof row.valuesJson === 'object'
      ? row.valuesJson
      : {}) as Record<string, string | string[] | boolean>,
    sourceChannel: row.sourceChannel ?? undefined,
    isTest: Boolean(row.isTest),
    createdAt: Number(row.createdAt || 0),
  };
}

export async function insertFormSubmission(
  submission: FormSubmissionRecord
): Promise<FormSubmissionRecord> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    await state.db
      .insert(formSubmissionsTable)
      .values({
        id: submission.id,
        projectId: submission.projectId,
        projectTitle: submission.projectTitle,
        slug: submission.slug || '',
        componentId: submission.componentId,
        formTitle: submission.formTitle,
        formCategory: submission.formCategory ?? null,
        valuesJson: submission.values || {},
        sourceChannel: submission.sourceChannel ?? null,
        isTest: Boolean(submission.isTest),
        createdAt: submission.createdAt,
      })
      .onConflictDoNothing({ target: formSubmissionsTable.id });
    return submission;
  }

  return withJsonStoreLock(async () => {
    const store = await loadJsonStore();
    const existing = Array.isArray(store.formSubmissions) ? store.formSubmissions : [];
    await persistJsonStore({
      ...store,
      formSubmissions: [submission, ...existing].slice(0, 2000),
    });
    return submission;
  });
}

export async function listFormSubmissions(
  projectId?: string
): Promise<FormSubmissionRecord[]> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    const rows = projectId
      ? await state.db
          .select()
          .from(formSubmissionsTable)
          .where(eq(formSubmissionsTable.projectId, projectId))
          .orderBy(desc(formSubmissionsTable.createdAt))
          .limit(2000)
      : await state.db
          .select()
          .from(formSubmissionsTable)
          .orderBy(desc(formSubmissionsTable.createdAt))
          .limit(2000);
    return rows.map(rowToFormSubmission);
  }

  const store = await loadJsonStore();
  const list = Array.isArray(store.formSubmissions) ? store.formSubmissions : [];
  return projectId ? list.filter((s) => s.projectId === projectId) : list;
}

export async function deleteFormSubmission(submissionId: string): Promise<boolean> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    const deleted = await state.db
      .delete(formSubmissionsTable)
      .where(eq(formSubmissionsTable.id, submissionId))
      .returning({ id: formSubmissionsTable.id });
    return deleted.length > 0;
  }

  return withJsonStoreLock(async () => {
    const store = await loadJsonStore();
    const existing = Array.isArray(store.formSubmissions) ? store.formSubmissions : [];
    const next = existing.filter((s) => s.id !== submissionId);
    if (next.length === existing.length) return false;
    await persistJsonStore({
      ...store,
      formSubmissions: next,
    });
    return true;
  });
}

// ============================================================
// Access Settings Repository
// ============================================================
export async function getAccessSettings(): Promise<AccessSettingsConfig> {
  await ensureP0AAccessHardening();
  const state = await getDbState();
  if (state.db) {
    const [policy] = await state.db
      .select()
      .from(accessPoliciesTable)
      .where(eq(accessPoliciesTable.id, 'default'))
      .limit(1);
    const dbUsers = await listUsers();
    const fallback = createDefaultAccessSettings();
    const members: AccessMemberRecord[] =
      dbUsers.length > 0
        ? dbUsers.map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            isActive: u.isActive,
            unitScope: u.unitScope,
            permissions: u.permissions,
            createdAt: u.createdAt,
          }))
        : fallback.members;

    const safeDefaultRole: AccessRole =
      policy?.defaultRole === 'editor' ? 'editor' : 'viewer';

    return {
      allUsersSuperAdmin: false,
      autoGrantSuperAdminOnJoin: false,
      defaultRole: safeDefaultRole,
      activeMemberId:
        policy?.activeMemberId && members.some((m) => m.id === policy.activeMemberId)
          ? policy.activeMemberId
          : members[0]?.id || 'owner-super-admin',
      members,
      updatedAt: policy?.updatedAt ?? Date.now(),
    };
  }

  const store = await loadJsonStore();
  const base = store.accessSettings || createDefaultAccessSettings();
  const safeDefaultRole: AccessRole =
    base.defaultRole === 'editor' ? 'editor' : 'viewer';

  if (store.users.length > 0) {
    const members: AccessMemberRecord[] = store.users.map((u) => ({
      id: u.id,
      name: u.name,
      email: u.email,
      role: u.role,
      isActive: u.isActive,
      unitScope: u.unitScope,
      permissions: u.permissions,
      createdAt: u.createdAt,
    }));
    const activeValid = members.some((m) => m.id === base.activeMemberId);
    return {
      ...base,
      allUsersSuperAdmin: false,
      autoGrantSuperAdminOnJoin: false,
      defaultRole: safeDefaultRole,
      activeMemberId: activeValid ? base.activeMemberId : members[0].id,
      members,
    };
  }
  return {
    ...base,
    allUsersSuperAdmin: false,
    autoGrantSuperAdminOnJoin: false,
    defaultRole: safeDefaultRole,
  };
}

export async function saveAccessSettings(
  raw: AccessSettingsConfig
): Promise<AccessSettingsConfig> {
  await ensureP0AAccessHardening();
  const now = Date.now();
  const safeDefaultRole: AccessRole =
    raw.defaultRole === 'editor' ? 'editor' : 'viewer';

  const normalizedMembers: AccessMemberRecord[] = raw.members.map((m, idx) => {
    const role: AccessRole =
      m.role === 'super_admin' ||
      m.role === 'admin' ||
      m.role === 'editor' ||
      m.role === 'viewer'
        ? m.role
        : 'viewer';
    return {
      id: m.id || `member-${idx + 1}`,
      name: String(m.name || `Pengguna ${idx + 1}`).slice(0, 80),
      email: String(m.email || `user${idx + 1}@tim.local`)
        .trim()
        .toLowerCase()
        .slice(0, 120),
      role,
      isActive: Boolean(m.isActive),
      unitScope:
        role === 'super_admin'
          ? 'all'
          : m.unitScope === 'all' || Array.isArray(m.unitScope)
          ? m.unitScope
          : [],
      permissions:
        role === 'super_admin'
          ? { ...FULL_PERMISSIONS }
          : m.permissions || getPresetPermissionsForRole(role),
      createdAt: typeof m.createdAt === 'number' ? m.createdAt : now,
    };
  });

  const nextSettings: AccessSettingsConfig = {
    allUsersSuperAdmin: false,
    autoGrantSuperAdminOnJoin: false,
    defaultRole: safeDefaultRole,
    activeMemberId: raw.activeMemberId || normalizedMembers[0]?.id || 'owner-super-admin',
    members: normalizedMembers,
    updatedAt: now,
  };

  const state = await getDbState();
  if (state.db) {
    await state.db
      .insert(accessPoliciesTable)
      .values({
        id: 'default',
        allUsersSuperAdmin: false,
        autoGrantSuperAdminOnJoin: false,
        defaultRole: nextSettings.defaultRole,
        activeMemberId: nextSettings.activeMemberId,
        updatedAt: now,
      })
      .onConflictDoUpdate({
        target: accessPoliciesTable.id,
        set: {
          allUsersSuperAdmin: false,
          autoGrantSuperAdminOnJoin: false,
          defaultRole: nextSettings.defaultRole,
          activeMemberId: nextSettings.activeMemberId,
          updatedAt: now,
        },
      });

    const existingUsers = await listUsers();
    const retainedIds = new Set<string>(['owner-super-admin']);
    for (const member of nextSettings.members) {
      const matched = existingUsers.find(
        (u) => u.id === member.id || u.email.toLowerCase() === member.email.toLowerCase()
      );
      if (matched) {
        retainedIds.add(matched.id);
        const deactivated = !member.isActive && matched.isActive;
        await upsertUser({
          ...matched,
          name: member.name,
          role: member.role,
          isActive: member.isActive,
          unitScope: member.unitScope,
          permissions: member.permissions,
          updatedAt: now,
        });
        if (deactivated) {
          await revokeUserSessions(matched.id);
        }
      }
    }
    for (const existing of existingUsers) {
      if (!retainedIds.has(existing.id)) {
        await revokeUserSessions(existing.id);
        await state.db.delete(usersTable).where(eq(usersTable.id, existing.id));
      }
    }
    return nextSettings;
  }

  return withJsonStoreLock(async () => {
    const store = await loadJsonStore();
    const nextUsers = [...store.users];
    const retainedIds = new Set<string>(['owner-super-admin']);
    const revokedUserIds = new Set<string>();
    for (const member of nextSettings.members) {
      const idx = nextUsers.findIndex(
        (u) => u.id === member.id || u.email.toLowerCase() === member.email.toLowerCase()
      );
      if (idx >= 0) {
        retainedIds.add(nextUsers[idx].id);
        if (!member.isActive && nextUsers[idx].isActive) {
          revokedUserIds.add(nextUsers[idx].id);
        }
        nextUsers[idx] = {
          ...nextUsers[idx],
          name: member.name,
          role: member.role,
          isActive: member.isActive,
          unitScope: member.unitScope,
          permissions: member.permissions,
          updatedAt: now,
        };
      }
    }
    const filteredUsers = nextUsers.filter((u) => {
      if (retainedIds.has(u.id)) return true;
      revokedUserIds.add(u.id);
      return false;
    });
    await persistJsonStore({
      ...store,
      accessSettings: nextSettings,
      users: filteredUsers,
      sessions:
        revokedUserIds.size > 0
          ? store.sessions.filter((s) => !revokedUserIds.has(s.userId))
          : store.sessions,
    });
    return nextSettings;
  });
}

// ============================================================
// API Settings & Webhooks Repository
// ============================================================
export async function getApiSettings(): Promise<ApiSettingsConfig> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    const [row] = await state.db
      .select()
      .from(apiSettingsTable)
      .where(eq(apiSettingsTable.id, 'default'))
      .limit(1);
    if (!row) return createDefaultApiSettings();
    return {
      publicApiEnabled: row.publicApiEnabled,
      requireAuthForBuilder: row.requireAuthForBuilder,
      ...(typeof row.demoLoginEnabled === 'boolean'
        ? { demoLoginEnabled: row.demoLoginEnabled }
        : {}),
      webhookUrl: row.webhookUrl,
      webhookEvents: row.webhookEventsJson,
      corsOrigins: row.corsOrigins,
      rateLimitPerMinute: row.rateLimitPerMinute,
      metaApiVersion: row.metaApiVersion,
      waDefaultCountryCode: row.waDefaultCountryCode,
      autoPublishOnSave: row.autoPublishOnSave,
      updatedAt: row.updatedAt,
    };
  }
  const store = await loadJsonStore();
  return store.apiSettings || createDefaultApiSettings();
}

export async function saveApiSettings(
  raw: Partial<ApiSettingsConfig>
): Promise<ApiSettingsConfig> {
  await assertStorageReady();
  const cur = await getApiSettings();
  const allowedEvents: WebhookEventName[] = [
    'wa_click',
    'form_submit',
    'project_save',
    'project_publish',
  ];
  const validEvents = Array.isArray(raw.webhookEvents)
    ? raw.webhookEvents.filter((ev): ev is WebhookEventName => allowedEvents.includes(ev))
    : cur.webhookEvents;

  const rateLimit = Number(raw.rateLimitPerMinute);
  const nextDemoLoginEnabled =
    typeof raw.demoLoginEnabled === 'boolean'
      ? raw.demoLoginEnabled
      : typeof cur.demoLoginEnabled === 'boolean'
      ? cur.demoLoginEnabled
      : undefined;

  const next: ApiSettingsConfig = {
    publicApiEnabled:
      typeof raw.publicApiEnabled === 'boolean'
        ? raw.publicApiEnabled
        : cur.publicApiEnabled,
    requireAuthForBuilder:
      typeof raw.requireAuthForBuilder === 'boolean'
        ? raw.requireAuthForBuilder
        : cur.requireAuthForBuilder,
    ...(typeof nextDemoLoginEnabled === 'boolean'
      ? { demoLoginEnabled: nextDemoLoginEnabled }
      : {}),
    webhookUrl:
      typeof raw.webhookUrl === 'string'
        ? raw.webhookUrl.trim().slice(0, 500)
        : cur.webhookUrl,
    webhookEvents: validEvents,
    corsOrigins:
      typeof raw.corsOrigins === 'string' && raw.corsOrigins.trim()
        ? raw.corsOrigins.trim().slice(0, 300)
        : cur.corsOrigins || '*',
    rateLimitPerMinute:
      Number.isFinite(rateLimit) && rateLimit >= 10 && rateLimit <= 5000
        ? Math.round(rateLimit)
        : cur.rateLimitPerMinute,
    metaApiVersion:
      typeof raw.metaApiVersion === 'string' && /^v\d+\.\d+$/.test(raw.metaApiVersion.trim())
        ? raw.metaApiVersion.trim()
        : cur.metaApiVersion,
    waDefaultCountryCode:
      typeof raw.waDefaultCountryCode === 'string' && raw.waDefaultCountryCode.replace(/\D/g, '')
        ? raw.waDefaultCountryCode.replace(/\D/g, '').slice(0, 5)
        : cur.waDefaultCountryCode,
    autoPublishOnSave:
      typeof raw.autoPublishOnSave === 'boolean'
        ? raw.autoPublishOnSave
        : cur.autoPublishOnSave,
    updatedAt: Date.now(),
  };

  const state = await getDbState();
  if (state.db) {
    await state.db
      .insert(apiSettingsTable)
      .values({
        id: 'default',
        publicApiEnabled: next.publicApiEnabled,
        requireAuthForBuilder: next.requireAuthForBuilder,
        demoLoginEnabled:
          typeof next.demoLoginEnabled === 'boolean' ? next.demoLoginEnabled : null,
        webhookUrl: next.webhookUrl,
        webhookEventsJson: next.webhookEvents,
        corsOrigins: next.corsOrigins,
        rateLimitPerMinute: next.rateLimitPerMinute,
        metaApiVersion: next.metaApiVersion,
        waDefaultCountryCode: next.waDefaultCountryCode,
        autoPublishOnSave: next.autoPublishOnSave,
        updatedAt: next.updatedAt,
      })
      .onConflictDoUpdate({
        target: apiSettingsTable.id,
        set: {
          publicApiEnabled: next.publicApiEnabled,
          requireAuthForBuilder: next.requireAuthForBuilder,
          demoLoginEnabled:
            typeof next.demoLoginEnabled === 'boolean' ? next.demoLoginEnabled : null,
          webhookUrl: next.webhookUrl,
          webhookEventsJson: next.webhookEvents,
          corsOrigins: next.corsOrigins,
          rateLimitPerMinute: next.rateLimitPerMinute,
          metaApiVersion: next.metaApiVersion,
          waDefaultCountryCode: next.waDefaultCountryCode,
          autoPublishOnSave: next.autoPublishOnSave,
          updatedAt: next.updatedAt,
        },
      });
    return next;
  }

  return withJsonStoreLock(async () => {
    const store = await loadJsonStore();
    const baseCur = store.apiSettings || createDefaultApiSettings();
    const mergedDemoLogin =
      typeof raw.demoLoginEnabled === 'boolean'
        ? raw.demoLoginEnabled
        : typeof baseCur.demoLoginEnabled === 'boolean'
        ? baseCur.demoLoginEnabled
        : undefined;
    const merged: ApiSettingsConfig = {
      publicApiEnabled:
        typeof raw.publicApiEnabled === 'boolean'
          ? raw.publicApiEnabled
          : baseCur.publicApiEnabled,
      requireAuthForBuilder:
        typeof raw.requireAuthForBuilder === 'boolean'
          ? raw.requireAuthForBuilder
          : baseCur.requireAuthForBuilder,
      ...(typeof mergedDemoLogin === 'boolean'
        ? { demoLoginEnabled: mergedDemoLogin }
        : {}),
      webhookUrl:
        typeof raw.webhookUrl === 'string'
          ? raw.webhookUrl.trim().slice(0, 500)
          : baseCur.webhookUrl,
      webhookEvents: Array.isArray(raw.webhookEvents)
        ? raw.webhookEvents.filter((ev): ev is WebhookEventName => allowedEvents.includes(ev))
        : baseCur.webhookEvents,
      corsOrigins:
        typeof raw.corsOrigins === 'string' && raw.corsOrigins.trim()
          ? raw.corsOrigins.trim().slice(0, 300)
          : baseCur.corsOrigins || '*',
      rateLimitPerMinute:
        Number.isFinite(rateLimit) && rateLimit >= 10 && rateLimit <= 5000
          ? Math.round(rateLimit)
          : baseCur.rateLimitPerMinute,
      metaApiVersion:
        typeof raw.metaApiVersion === 'string' && /^v\d+\.\d+$/.test(raw.metaApiVersion.trim())
          ? raw.metaApiVersion.trim()
          : baseCur.metaApiVersion,
      waDefaultCountryCode:
        typeof raw.waDefaultCountryCode === 'string' && raw.waDefaultCountryCode.replace(/\D/g, '')
          ? raw.waDefaultCountryCode.replace(/\D/g, '').slice(0, 5)
          : baseCur.waDefaultCountryCode,
      autoPublishOnSave:
        typeof raw.autoPublishOnSave === 'boolean'
          ? raw.autoPublishOnSave
          : baseCur.autoPublishOnSave,
      updatedAt: Date.now(),
    };
    await persistJsonStore({ ...store, apiSettings: merged });
    return merged;
  });
}

// ============================================================
// UI Appearance Labels Repository (Menu "Tampilan")
// ============================================================
export async function getUiAppearanceSettings(): Promise<UiAppearanceSettingsConfig> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    const [row] = await state.db
      .select()
      .from(uiAppearanceSettingsTable)
      .where(eq(uiAppearanceSettingsTable.id, 'default'))
      .limit(1);
    if (!row) {
      return { labels: {}, hiddenKeys: {}, updatedAt: 0 };
    }
    const unpacked = unpackUiAppearanceStoragePayload(row.labelsJson);
    return {
      labels: unpacked.labels,
      hiddenKeys: unpacked.hiddenKeys,
      updatedAt: Number(row.updatedAt || 0),
    };
  }
  const store = await loadJsonStore();
  if (!store.uiAppearanceSettings) {
    return { labels: {}, hiddenKeys: {}, updatedAt: 0 };
  }
  const unpacked = unpackUiAppearanceStoragePayload(store.uiAppearanceSettings.labels);
  const directHidden = sanitizeUiAppearanceHiddenMap(store.uiAppearanceSettings.hiddenKeys);
  return {
    labels: unpacked.labels,
    hiddenKeys: { ...unpacked.hiddenKeys, ...directHidden },
    updatedAt: Number(store.uiAppearanceSettings.updatedAt || 0),
  };
}

export async function saveUiAppearanceSettings(input: {
  labels?: UiAppearanceLabelsMap;
  patch?: Record<string, string>;
  hiddenKeys?: UiAppearanceHiddenMap;
  hiddenPatch?: Record<string, boolean>;
  resetAll?: boolean;
}): Promise<UiAppearanceSettingsConfig> {
  await assertStorageReady();
  const now = Date.now();
  const state = await getDbState();

  const computeNextLabels = (currentLabels: UiAppearanceLabelsMap): UiAppearanceLabelsMap => {
    if (input.resetAll) {
      return {};
    }
    if (input.labels !== undefined) {
      return sanitizeUiAppearanceLabelsMap(input.labels);
    }
    if (input.patch && typeof input.patch === 'object') {
      const merged: Record<string, string> = { ...currentLabels };
      for (const [k, v] of Object.entries(input.patch)) {
        if (typeof k !== 'string' || !k) continue;
        if (typeof v !== 'string') continue;
        const cleanVal = v.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 260);
        if (!cleanVal) {
          delete merged[k];
        } else {
          merged[k] = cleanVal;
        }
      }
      return sanitizeUiAppearanceLabelsMap(merged);
    }
    return sanitizeUiAppearanceLabelsMap(currentLabels);
  };

  const computeNextHidden = (currentHidden: UiAppearanceHiddenMap): UiAppearanceHiddenMap => {
    if (input.resetAll) {
      return {};
    }
    if (input.hiddenKeys !== undefined) {
      return sanitizeUiAppearanceHiddenMap(input.hiddenKeys);
    }
    if (input.hiddenPatch && typeof input.hiddenPatch === 'object') {
      const merged: Record<string, boolean> = { ...currentHidden };
      for (const [k, v] of Object.entries(input.hiddenPatch)) {
        if (typeof k !== 'string' || !k) continue;
        if (v === true) {
          merged[k] = true;
        } else {
          delete merged[k];
        }
      }
      return sanitizeUiAppearanceHiddenMap(merged);
    }
    return sanitizeUiAppearanceHiddenMap(currentHidden);
  };

  if (state.db) {
    const cur = await getUiAppearanceSettings();
    const nextLabels = computeNextLabels(cur.labels);
    const nextHidden = computeNextHidden(cur.hiddenKeys ?? {});
    const packedPayload = packUiAppearanceStoragePayload(nextLabels, nextHidden);
    const next: UiAppearanceSettingsConfig = {
      labels: nextLabels,
      hiddenKeys: nextHidden,
      updatedAt: now,
    };
    await state.db
      .insert(uiAppearanceSettingsTable)
      .values({
        id: 'default',
        labelsJson: packedPayload,
        updatedAt: next.updatedAt,
      })
      .onConflictDoUpdate({
        target: uiAppearanceSettingsTable.id,
        set: {
          labelsJson: packedPayload,
          updatedAt: next.updatedAt,
        },
      });
    return next;
  }

  return withJsonStoreLock(async () => {
    const store = await loadJsonStore();
    const unpacked = unpackUiAppearanceStoragePayload(store.uiAppearanceSettings?.labels);
    const curHidden = {
      ...unpacked.hiddenKeys,
      ...sanitizeUiAppearanceHiddenMap(store.uiAppearanceSettings?.hiddenKeys),
    };
    const next: UiAppearanceSettingsConfig = {
      labels: computeNextLabels(unpacked.labels),
      hiddenKeys: computeNextHidden(curHidden),
      updatedAt: now,
    };
    await persistJsonStore({ ...store, uiAppearanceSettings: next });
    return next;
  });
}

export async function insertWebhookLog(log: WebhookLogRecord): Promise<void> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    await state.db.insert(webhookLogsTable).values({
      id: log.id,
      eventType: log.eventType,
      targetUrl: log.targetUrl,
      statusCode: log.statusCode ?? null,
      success: log.success,
      payloadSummary: log.payloadSummary,
      errorMessage: log.errorMessage ?? null,
      createdAt: log.createdAt,
    });
    return;
  }
  await withJsonStoreLock(async () => {
    const store = await loadJsonStore();
    await persistJsonStore({
      ...store,
      webhookLogs: [log, ...store.webhookLogs].slice(0, 200),
    });
  });
}

export async function listWebhookLogs(): Promise<WebhookLogRecord[]> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    const rows = await state.db
      .select()
      .from(webhookLogsTable)
      .orderBy(desc(webhookLogsTable.createdAt))
      .limit(50);
    return rows.map((r) => ({
      id: r.id,
      eventType: r.eventType,
      targetUrl: r.targetUrl,
      statusCode: r.statusCode ?? undefined,
      success: r.success,
      payloadSummary: r.payloadSummary,
      errorMessage: r.errorMessage ?? undefined,
      createdAt: r.createdAt,
    }));
  }
  const store = await loadJsonStore();
  return store.webhookLogs.slice(0, 50);
}

export async function clearWebhookLogs(): Promise<void> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    await state.db.delete(webhookLogsTable);
    return;
  }
  await withJsonStoreLock(async () => {
    const store = await loadJsonStore();
    await persistJsonStore({ ...store, webhookLogs: [] });
  });
}

export async function dispatchWebhookEvent(
  eventType: WebhookEventName | 'webhook_test',
  payload: Record<string, unknown>,
  overrideUrl?: string
): Promise<WebhookLogRecord | null> {
  const api = await getApiSettings();
  const targetUrl = (overrideUrl ?? api.webhookUrl).trim();
  if (!targetUrl) return null;

  if (
    eventType !== 'webhook_test' &&
    !api.webhookEvents.includes(eventType)
  ) {
    return null;
  }

  const envelope = {
    event: eventType,
    timestamp: Date.now(),
    data: payload,
  };
  const bodyStr = JSON.stringify(envelope);
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Lynk-Event': eventType,
  };
  const signingSecret = process.env.WEBHOOK_SIGNING_SECRET?.trim() || '';
  if (signingSecret) {
    const sig = crypto
      .createHmac('sha256', signingSecret)
      .update(bodyStr)
      .digest('hex');
    headers['X-Lynk-Signature'] = `sha256=${sig}`;
  }

  try {
    const { response } = await safeFetch(targetUrl, {
      method: 'POST',
      headers,
      body: bodyStr,
      timeoutMs: 5000,
      maxRedirects: 2,
    });
    await readResponseTextWithCap(response, 128 * 1024).catch(() => '');
    const log: WebhookLogRecord = {
      id: `wh_${crypto.randomBytes(6).toString('hex')}`,
      eventType,
      targetUrl,
      statusCode: response.status,
      success: response.ok,
      payloadSummary: bodyStr.slice(0, 200),
      errorMessage: response.ok ? undefined : `HTTP ${response.status}`,
      createdAt: Date.now(),
    };
    await insertWebhookLog(log);
    return log;
  } catch (err) {
    const msg =
      err instanceof SsrfBlockedError
        ? err.message
        : err instanceof Error
        ? err.message
        : 'Timeout / jaringan gagal';
    const log: WebhookLogRecord = {
      id: `wh_${crypto.randomBytes(6).toString('hex')}`,
      eventType,
      targetUrl,
      success: false,
      payloadSummary: bodyStr.slice(0, 200),
      errorMessage: msg,
      createdAt: Date.now(),
    };
    await insertWebhookLog(log);
    return log;
  }
}

export async function getDbDiagnostics(): Promise<DbDiagnostics> {
  const state = await getDbState();
  const envStatus = {
    postgresConfigured: state.configured,
    sessionSecretConfigured: isNonEmptyEnvSecret('SESSION_SECRET'),
    metaCapiConfigured: isNonEmptyEnvSecret('META_CAPI_ACCESS_TOKEN'),
    webhookSecretConfigured: isNonEmptyEnvSecret('WEBHOOK_SIGNING_SECRET'),
  };

  if (state.db) {
    const now = Date.now();
    const [
      [uCnt],
      [sCnt],
      [pCnt],
      [aCnt],
      [apiCnt],
      [whCnt],
      [apCnt],
      [mCnt],
      [uiCnt],
      [wtCnt],
      [fsCnt],
    ] = await Promise.all([
      state.db.select({ value: count() }).from(usersTable),
      state.db
        .select({ value: count() })
        .from(sessionsTable)
        .where(gt(sessionsTable.expiresAt, now)),
      state.db.select({ value: count() }).from(projectsTable),
      state.db.select({ value: count() }).from(analyticsEventsTable),
      state.db.select({ value: count() }).from(apiSettingsTable),
      state.db.select({ value: count() }).from(webhookLogsTable),
      state.db.select({ value: count() }).from(accessPoliciesTable),
      state.db.select({ value: count() }).from(mediaAssetsTable),
      state.db.select({ value: count() }).from(uiAppearanceSettingsTable),
      state.db.select({ value: count() }).from(webTemplatesTable),
      state.db.select({ value: count() }).from(formSubmissionsTable),
    ]);

    return {
      engine: 'postgresql',
      connected: true,
      ready: true,
      degraded: false,
      host: state.host,
      database: state.database,
      ssl: state.ssl,
      sslVerifyMode: state.sslVerifyMode,
      appliedMigrations: state.appliedMigrations,
      envStatus,
      tables: {
        users: Number(uCnt?.value ?? 0),
        sessions: Number(sCnt?.value ?? 0),
        projects: Number(pCnt?.value ?? 0),
        analyticsEvents: Number(aCnt?.value ?? 0),
        apiSettings: Number(apiCnt?.value ?? 0),
        webhookLogs: Number(whCnt?.value ?? 0),
        accessPolicies: Number(apCnt?.value ?? 0),
        mediaAssets: Number(mCnt?.value ?? 0),
        uiAppearance: Number(uiCnt?.value ?? 0),
        webTemplates: Number(wtCnt?.value ?? 0),
        formSubmissions: Number(fsCnt?.value ?? 0),
      },
    };
  }

  try {
    const store = await loadJsonStore();
    const now = Date.now();
    return {
      engine: state.engine,
      connected: false,
      ready: state.ready,
      degraded: state.degraded,
      corrupt: false,
      host: state.host,
      database: state.database,
      ssl: state.ssl,
      sslVerifyMode: state.sslVerifyMode,
      lastError: state.lastError,
      envStatus,
      tables: {
        users: store.users.length,
        sessions: store.sessions.filter((s) => s.expiresAt > now).length,
        projects: Object.keys(store.projects).length,
        analyticsEvents: store.events.length,
        apiSettings: store.apiSettings ? 1 : 0,
        webhookLogs: store.webhookLogs.length,
        accessPolicies: store.accessSettings ? 1 : 0,
        mediaAssets: Array.isArray(store.mediaAssets) ? store.mediaAssets.length : 0,
        uiAppearance: store.uiAppearanceSettings ? 1 : 0,
        webTemplates: Array.isArray(store.webTemplates) ? store.webTemplates.length : 0,
        formSubmissions: Array.isArray(store.formSubmissions) ? store.formSubmissions.length : 0,
      },
    };
  } catch (err) {
    return {
      engine: state.engine,
      connected: false,
      ready: false,
      degraded: true,
      corrupt: true,
      host: state.host,
      database: state.database,
      ssl: state.ssl,
      sslVerifyMode: state.sslVerifyMode,
      lastError: err instanceof Error ? err.message : 'Store JSON korup',
      envStatus,
      tables: {
        users: 0,
        sessions: 0,
        projects: 0,
        analyticsEvents: 0,
        apiSettings: 0,
        webhookLogs: 0,
        accessPolicies: 0,
        mediaAssets: 0,
        uiAppearance: 0,
        webTemplates: 0,
        formSubmissions: 0,
      },
    };
  }
}

function sqlText(val: string | null | undefined): string {
  if (val === null || val === undefined) return 'NULL';
  const s = String(val);
  let tag = '$lynk$';
  let idx = 1;
  while (s.includes(tag)) {
    tag = `$lynk_${idx}$`;
    idx += 1;
  }
  return `${tag}${s}${tag}`;
}

function sqlBool(val: boolean | null | undefined): string {
  return val ? 'TRUE' : 'FALSE';
}

function sqlNum(val: number | null | undefined): string {
  if (typeof val !== 'number' || !Number.isFinite(val)) return 'NULL';
  return String(Math.round(val));
}

function sqlJsonb(val: unknown): string {
  return `${sqlText(JSON.stringify(val ?? null))}::jsonb`;
}

/**
 * Consistent point-in-time SQL snapshot (F-13):
 * Uses PostgreSQL REPEATABLE READ READ ONLY transaction so all tables share the exact same MVCC snapshot.
 */
export async function exportFullPostgresSqlDump(schemaSql: string): Promise<string> {
  await assertStorageReady();
  const state = await getDbState();
  const now = Date.now();

  let users: StoredUserRecord[] = [];
  let projects: StoredProjectEntry[] = [];
  let events: AnalyticsEventRecord[] = [];
  let access: AccessSettingsConfig = createDefaultAccessSettings();
  let api: ApiSettingsConfig = createDefaultApiSettings();
  let webhookLogs: WebhookLogRecord[] = [];
  let mediaAssets: MediaAssetMeta[] = [];
  let sessions: StoredSessionRecord[] = [];
  let uiAppearance: UiAppearanceSettingsConfig | null = null;
  let webTemplates: SavedWebTemplate[] = [];
  let formSubmissions: FormSubmissionRecord[] = [];

  if (state.pool) {
    const client = await state.pool.connect();
    try {
      await client.query('BEGIN TRANSACTION ISOLATION LEVEL REPEATABLE READ READ ONLY');

      const [uRes, pRes, eRes, apRes, apiRes, whRes, mRes, sRes, uiRes, wtRes, fsRes] =
        await Promise.all([
          client.query('SELECT * FROM users'),
          client.query('SELECT * FROM projects ORDER BY updated_at DESC'),
          client.query('SELECT * FROM analytics_events ORDER BY created_at DESC LIMIT 5000'),
          client.query(`SELECT * FROM access_policies WHERE id = 'default' LIMIT 1`),
          client.query(`SELECT * FROM api_settings WHERE id = 'default' LIMIT 1`),
          client.query('SELECT * FROM webhook_logs ORDER BY created_at DESC LIMIT 200'),
          client.query('SELECT * FROM media_assets ORDER BY created_at DESC'),
          client.query('SELECT * FROM sessions WHERE expires_at > $1', [now]),
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
        isActive: r.is_active,
        unitScope: r.unit_scope_json,
        permissions: r.permissions_json,
        planTier: (r.plan_tier as SaasPlanTier) || 'free',
        maxSites: typeof r.max_sites === 'number' ? Number(r.max_sites) : 3,
        subscriptionExpiresAt: r.subscription_expires_at ? Number(r.subscription_expires_at) : null,
        createdAt: Number(r.created_at),
        updatedAt: Number(r.updated_at),
        lastLoginAt: r.last_login_at ? Number(r.last_login_at) : null,
      }));

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
        sourceTemplateId: r.source_template_id ?? null,
        posStoreId: r.pos_store_id ?? null,
        posSyncEnabled: Boolean(r.pos_sync_enabled),
      }));

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
      if (pol) {
        access = {
          allUsersSuperAdmin: false,
          autoGrantSuperAdminOnJoin: false,
          defaultRole: pol.default_role === 'editor' ? 'editor' : 'viewer',
          activeMemberId: pol.active_member_id,
          members: [],
          updatedAt: Number(pol.updated_at),
        };
      }

      const apiRow = apiRes.rows[0];
      if (apiRow) {
        api = {
          publicApiEnabled: Boolean(apiRow.public_api_enabled),
          requireAuthForBuilder: Boolean(apiRow.require_auth_for_builder),
          demoLoginEnabled:
            typeof apiRow.demo_login_enabled === 'boolean'
              ? apiRow.demo_login_enabled
              : undefined,
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

      sessions = sRes.rows.map((r) => ({
        tokenHash: r.token_hash,
        userId: r.user_id,
        expiresAt: Number(r.expires_at),
        userAgent: r.user_agent,
        ipAddress: r.ip_address,
        createdAt: Number(r.created_at),
      }));

      const uiRow = uiRes.rows[0];
      if (uiRow) {
        const unpacked = unpackUiAppearanceStoragePayload(uiRow.labels_json);
        uiAppearance = {
          labels: unpacked.labels,
          hiddenKeys: unpacked.hiddenKeys,
          updatedAt: Number(uiRow.updated_at || now),
        };
      }

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
        createdAt: Number(r.created_at || now),
        updatedAt: Number(r.updated_at || now),
      }));

      formSubmissions = fsRes.rows.map((r) => ({
        id: r.id,
        projectId: r.project_id,
        projectTitle: r.project_title,
        slug: r.slug || '',
        componentId: r.component_id,
        formTitle: r.form_title,
        formCategory: r.form_category ?? undefined,
        values:
          r.values_json && typeof r.values_json === 'object' ? r.values_json : {},
        sourceChannel: r.source_channel ?? undefined,
        isTest: Boolean(r.is_test),
        createdAt: Number(r.created_at || now),
      }));
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    } finally {
      client.release();
    }
  } else {
    const store = await loadJsonStore();
    users = [...store.users];
    projects = Object.values(store.projects).map(normalizeLoadedProjectEntry);
    events = [...store.events];
    access = store.accessSettings || createDefaultAccessSettings();
    api = store.apiSettings || createDefaultApiSettings();
    webhookLogs = [...store.webhookLogs];
    mediaAssets = Array.isArray(store.mediaAssets) ? [...store.mediaAssets] : [];
    sessions = store.sessions.filter((s) => s.expiresAt > now);
    uiAppearance = store.uiAppearanceSettings
      ? {
          labels: sanitizeUiAppearanceLabelsMap(store.uiAppearanceSettings.labels),
          hiddenKeys: sanitizeUiAppearanceHiddenMap(store.uiAppearanceSettings.hiddenKeys),
          updatedAt: Number(store.uiAppearanceSettings.updatedAt || now),
        }
      : null;
    webTemplates = Array.isArray(store.webTemplates) ? [...store.webTemplates] : [];
    formSubmissions = Array.isArray(store.formSubmissions) ? [...store.formSubmissions] : [];
  }

  const userIds = new Set(users.map((u) => u.id));

  const lines: string[] = [
    `-- ============================================================`,
    `-- Lynk Builder — Full PostgreSQL Snapshot Backup (Consistent MVCC v007)`,
    `-- Diekspor: ${new Date(now).toISOString()}`,
    `-- Engine sumber: ${state.db ? 'PostgreSQL (REPEATABLE READ READ ONLY)' : 'JSON Store Lokal'}`,
    `-- ============================================================`,
    ``,
    schemaSql.trim(),
    ``,
    `BEGIN;`,
    ``,
  ];

  lines.push(`-- 1. Users (${users.length} baris)`);
  for (const u of users) {
    lines.push(
      `INSERT INTO users (id, name, email, password_hash, role, is_active, unit_scope_json, permissions_json, plan_tier, max_sites, subscription_expires_at, created_at, updated_at, last_login_at) VALUES (${sqlText(u.id)}, ${sqlText(u.name)}, ${sqlText(u.email.trim().toLowerCase())}, ${sqlText(u.passwordHash)}, ${sqlText(u.role)}, ${sqlBool(u.isActive)}, ${sqlJsonb(u.unitScope)}, ${sqlJsonb(u.permissions)}, ${sqlText(u.planTier ?? 'free')}, ${sqlNum(typeof u.maxSites === 'number' ? u.maxSites : 3)}, ${sqlNum(u.subscriptionExpiresAt ?? null)}, ${sqlNum(u.createdAt)}, ${sqlNum(u.updatedAt)}, ${sqlNum(u.lastLoginAt ?? null)}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, email = EXCLUDED.email, password_hash = EXCLUDED.password_hash, role = EXCLUDED.role, is_active = EXCLUDED.is_active, unit_scope_json = EXCLUDED.unit_scope_json, permissions_json = EXCLUDED.permissions_json, plan_tier = EXCLUDED.plan_tier, max_sites = EXCLUDED.max_sites, subscription_expires_at = EXCLUDED.subscription_expires_at, updated_at = EXCLUDED.updated_at, last_login_at = EXCLUDED.last_login_at;`
    );
  }
  lines.push(``);

  lines.push(`-- 2. Access Policies`);
  lines.push(
    `INSERT INTO access_policies (id, all_users_super_admin, auto_grant_super_admin_on_join, default_role, active_member_id, updated_at) VALUES ('default', FALSE, FALSE, ${sqlText(access.defaultRole === 'editor' ? 'editor' : 'viewer')}, ${sqlText(access.activeMemberId)}, ${sqlNum(access.updatedAt)}) ON CONFLICT (id) DO UPDATE SET all_users_super_admin = EXCLUDED.all_users_super_admin, auto_grant_super_admin_on_join = EXCLUDED.auto_grant_super_admin_on_join, default_role = EXCLUDED.default_role, active_member_id = EXCLUDED.active_member_id, updated_at = EXCLUDED.updated_at;`
  );
  lines.push(``);

  const demoLoginSql =
    typeof api.demoLoginEnabled === 'boolean' ? sqlBool(api.demoLoginEnabled) : 'NULL';
  lines.push(`-- 3. API Settings`);
  lines.push(
    `INSERT INTO api_settings (id, public_api_enabled, require_auth_for_builder, demo_login_enabled, webhook_url, webhook_events_json, cors_origins, rate_limit_per_minute, meta_api_version, wa_default_country_code, auto_publish_on_save, updated_at) VALUES ('default', ${sqlBool(api.publicApiEnabled)}, ${sqlBool(api.requireAuthForBuilder)}, ${demoLoginSql}, ${sqlText(api.webhookUrl)}, ${sqlJsonb(api.webhookEvents)}, ${sqlText(api.corsOrigins)}, ${sqlNum(api.rateLimitPerMinute)}, ${sqlText(api.metaApiVersion)}, ${sqlText(api.waDefaultCountryCode)}, ${sqlBool(api.autoPublishOnSave)}, ${sqlNum(api.updatedAt)}) ON CONFLICT (id) DO UPDATE SET public_api_enabled = EXCLUDED.public_api_enabled, require_auth_for_builder = EXCLUDED.require_auth_for_builder, demo_login_enabled = EXCLUDED.demo_login_enabled, webhook_url = EXCLUDED.webhook_url, webhook_events_json = EXCLUDED.webhook_events_json, cors_origins = EXCLUDED.cors_origins, rate_limit_per_minute = EXCLUDED.rate_limit_per_minute, meta_api_version = EXCLUDED.meta_api_version, wa_default_country_code = EXCLUDED.wa_default_country_code, auto_publish_on_save = EXCLUDED.auto_publish_on_save, updated_at = EXCLUDED.updated_at;`
  );
  lines.push(``);

  lines.push(`-- 4. Projects (${projects.length} baris)`);
  for (const entry of projects) {
    const rec = entry.record;
    const pub = rec.project.publishing;
    const slug = normalizeServerSlug(pub?.slug || rec.project.title || rec.id, 'unit-usaha');
    const customDomain = normalizeHostHeader(pub?.customDomain);
    const ownerId = entry.ownerUserId && userIds.has(entry.ownerUserId) ? entry.ownerUserId : null;
    const rev = rec.revision ?? 1;
    lines.push(
      `INSERT INTO projects (id, owner_user_id, revision, title, slug, custom_domain, use_custom_domain, is_published, published_at, source_template_id, pos_store_id, pos_sync_enabled, project_json, rendered_html, updated_at, last_saved_at, created_at) VALUES (${sqlText(rec.id)}, ${sqlText(ownerId)}, ${sqlNum(rev)}, ${sqlText(rec.project.title)}, ${sqlText(slug)}, ${sqlText(customDomain)}, ${sqlBool(Boolean(pub?.useCustomDomain))}, ${sqlBool(Boolean(pub?.isPublished))}, ${sqlNum(pub?.publishedAt ?? null)}, ${sqlText(entry.sourceTemplateId ?? null)}, ${sqlText(entry.posStoreId ?? null)}, ${sqlBool(Boolean(entry.posSyncEnabled))}, ${sqlJsonb(rec.project)}, ${sqlText(entry.renderedHtml)}, ${sqlNum(rec.updatedAt)}, ${sqlNum(entry.savedAt || rec.lastSavedAt || rec.updatedAt)}, ${sqlNum(entry.savedAt || rec.updatedAt)}) ON CONFLICT (id) DO UPDATE SET owner_user_id = EXCLUDED.owner_user_id, revision = EXCLUDED.revision, title = EXCLUDED.title, slug = EXCLUDED.slug, custom_domain = EXCLUDED.custom_domain, use_custom_domain = EXCLUDED.use_custom_domain, is_published = EXCLUDED.is_published, published_at = EXCLUDED.published_at, source_template_id = EXCLUDED.source_template_id, pos_store_id = EXCLUDED.pos_store_id, pos_sync_enabled = EXCLUDED.pos_sync_enabled, project_json = EXCLUDED.project_json, rendered_html = EXCLUDED.rendered_html, updated_at = EXCLUDED.updated_at, last_saved_at = EXCLUDED.last_saved_at;`
    );
  }
  lines.push(``);

  lines.push(`-- 5. Analytics Events (${events.length} baris)`);
  for (const ev of events) {
    lines.push(
      `INSERT INTO analytics_events (id, project_id, project_title, slug, event_type, channel, source_label, cta_label, wa_phone, order_value, utm_source, utm_medium, utm_campaign, utm_content, click_id_type, device_type, is_test, created_at) VALUES (${sqlText(ev.id)}, ${sqlText(ev.projectId)}, ${sqlText(ev.projectTitle)}, ${sqlText(ev.slug)}, ${sqlText(ev.eventType)}, ${sqlText(ev.channel)}, ${sqlText(ev.sourceLabel)}, ${sqlText(ev.ctaLabel ?? null)}, ${sqlText(ev.waPhone ?? null)}, ${sqlNum(ev.orderValue ?? null)}, ${sqlText(ev.utmSource ?? null)}, ${sqlText(ev.utmMedium ?? null)}, ${sqlText(ev.utmCampaign ?? null)}, ${sqlText(ev.utmContent ?? null)}, ${sqlText(ev.clickIdType ?? null)}, ${sqlText(ev.deviceType)}, ${sqlBool(Boolean(ev.isTest))}, ${sqlNum(ev.createdAt)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push(``);

  lines.push(`-- 6. Webhook Logs (${webhookLogs.length} baris)`);
  for (const lg of webhookLogs) {
    lines.push(
      `INSERT INTO webhook_logs (id, event_type, target_url, status_code, success, payload_summary, error_message, created_at) VALUES (${sqlText(lg.id)}, ${sqlText(lg.eventType)}, ${sqlText(lg.targetUrl)}, ${sqlNum(lg.statusCode ?? null)}, ${sqlBool(lg.success)}, ${sqlText(lg.payloadSummary)}, ${sqlText(lg.errorMessage ?? null)}, ${sqlNum(lg.createdAt)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push(``);

  lines.push(`-- 7. Media Assets (${mediaAssets.length} baris)`);
  for (const m of mediaAssets) {
    lines.push(
      `INSERT INTO media_assets (id, filename, mime_type, size_bytes, sha256, created_by, created_at) VALUES (${sqlText(m.id)}, ${sqlText(m.filename)}, ${sqlText(m.mimeType)}, ${sqlNum(m.sizeBytes)}, ${sqlText(m.sha256)}, NULL, ${sqlNum(m.createdAt)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push(``);

  const validSessions = sessions.filter((s) => userIds.has(s.userId));
  lines.push(`-- 8. Active Sessions (${validSessions.length} baris)`);
  for (const s of validSessions) {
    lines.push(
      `INSERT INTO sessions (token_hash, user_id, expires_at, user_agent, ip_address, created_at) VALUES (${sqlText(s.tokenHash)}, ${sqlText(s.userId)}, ${sqlNum(s.expiresAt)}, ${sqlText(s.userAgent)}, ${sqlText(s.ipAddress)}, ${sqlNum(s.createdAt)}) ON CONFLICT (token_hash) DO NOTHING;`
    );
  }
  lines.push(``);

  if (uiAppearance) {
    const packedUi = packUiAppearanceStoragePayload(
      uiAppearance.labels,
      uiAppearance.hiddenKeys || {}
    );
    lines.push(`-- 9. UI Appearance Settings`);
    lines.push(
      `INSERT INTO ui_appearance_settings (id, labels_json, updated_at) VALUES ('default', ${sqlJsonb(packedUi)}, ${sqlNum(uiAppearance.updatedAt)}) ON CONFLICT (id) DO UPDATE SET labels_json = EXCLUDED.labels_json, updated_at = EXCLUDED.updated_at;`
    );
    lines.push(``);
  }

  lines.push(`-- 10. Web Templates (${webTemplates.length} baris)`);
  for (const wt of webTemplates) {
    lines.push(
      `INSERT INTO web_templates (id, name, description, category, visibility, allow_collaborative_edit, snapshot_json, main_block_count, sub_page_count, total_block_count, sub_page_titles_json, palette_colors_json, created_by_user_id, created_by_name, updated_by_name, usage_count, created_at, updated_at) VALUES (${sqlText(wt.id)}, ${sqlText(wt.name)}, ${sqlText(wt.description || '')}, ${sqlText(wt.category || 'bisnis')}, ${sqlText(wt.visibility || 'shared')}, ${sqlBool(Boolean(wt.allowCollaborativeEdit))}, ${sqlJsonb(wt.snapshot)}, ${sqlNum(wt.mainBlockCount)}, ${sqlNum(wt.subPageCount)}, ${sqlNum(wt.totalBlockCount)}, ${sqlJsonb(wt.subPageTitles || [])}, ${sqlJsonb(wt.paletteColors || [])}, ${sqlText(wt.createdByUserId)}, ${sqlText(wt.createdByName || 'Pengguna')}, ${sqlText(wt.updatedByName ?? null)}, ${sqlNum(wt.usageCount || 0)}, ${sqlNum(wt.createdAt)}, ${sqlNum(wt.updatedAt)}) ON CONFLICT (id) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description, category = EXCLUDED.category, visibility = EXCLUDED.visibility, allow_collaborative_edit = EXCLUDED.allow_collaborative_edit, snapshot_json = EXCLUDED.snapshot_json, main_block_count = EXCLUDED.main_block_count, sub_page_count = EXCLUDED.sub_page_count, total_block_count = EXCLUDED.total_block_count, sub_page_titles_json = EXCLUDED.sub_page_titles_json, palette_colors_json = EXCLUDED.palette_colors_json, updated_by_name = EXCLUDED.updated_by_name, usage_count = EXCLUDED.usage_count, updated_at = EXCLUDED.updated_at;`
    );
  }
  lines.push(``);

  lines.push(`-- 11. Form Submissions (${formSubmissions.length} baris)`);
  for (const fsRow of formSubmissions) {
    lines.push(
      `INSERT INTO form_submissions (id, project_id, project_title, slug, component_id, form_title, form_category, values_json, source_channel, is_test, created_at) VALUES (${sqlText(fsRow.id)}, ${sqlText(fsRow.projectId)}, ${sqlText(fsRow.projectTitle)}, ${sqlText(fsRow.slug || '')}, ${sqlText(fsRow.componentId)}, ${sqlText(fsRow.formTitle)}, ${sqlText(fsRow.formCategory ?? null)}, ${sqlJsonb(fsRow.values || {})}, ${sqlText(fsRow.sourceChannel ?? null)}, ${sqlBool(Boolean(fsRow.isTest))}, ${sqlNum(fsRow.createdAt)}) ON CONFLICT (id) DO NOTHING;`
    );
  }
  lines.push(``);

  lines.push(`COMMIT;`);
  lines.push(``);

  return lines.join('\n');
}

// ============================================================
// Web Templates Repository (Multi-User Full-Page + Subpages)
// ============================================================
function rowToSavedWebTemplate(
  row: typeof webTemplatesTable.$inferSelect
): SavedWebTemplate {
  return {
    id: row.id,
    name: row.name,
    description: row.description || '',
    category: row.category || 'bisnis',
    visibility: row.visibility === 'private' ? 'private' : 'shared',
    allowCollaborativeEdit: Boolean(row.allowCollaborativeEdit),
    snapshot: row.snapshotJson,
    mainBlockCount: Number(row.mainBlockCount || 0),
    subPageCount: Number(row.subPageCount || 0),
    totalBlockCount: Number(row.totalBlockCount || 0),
    subPageTitles: Array.isArray(row.subPageTitlesJson) ? row.subPageTitlesJson : [],
    paletteColors: Array.isArray(row.paletteColorsJson) ? row.paletteColorsJson : [],
    createdByUserId: row.createdByUserId,
    createdByName: row.createdByName || 'Pengguna',
    updatedByName: row.updatedByName || undefined,
    usageCount: Number(row.usageCount || 0),
    createdAt: Number(row.createdAt || Date.now()),
    updatedAt: Number(row.updatedAt || Date.now()),
  };
}

export async function listWebTemplates(
  viewerUser?: StoredUserRecord | null
): Promise<SavedWebTemplate[]> {
  await assertStorageReady();
  const state = await getDbState();
  let all: SavedWebTemplate[] = [];

  if (state.db) {
    const rows = await state.db
      .select()
      .from(webTemplatesTable)
      .orderBy(desc(webTemplatesTable.updatedAt));
    all = rows.map(rowToSavedWebTemplate);
  } else {
    const store = await loadJsonStore();
    all = Array.isArray(store.webTemplates) ? [...store.webTemplates] : [];
    all.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
  }

  if (!viewerUser) {
    return all.filter((t) => t.visibility === 'shared');
  }
  const isAdmin = viewerUser.role === 'super_admin' || viewerUser.role === 'admin';
  return all.filter(
    (t) => t.visibility === 'shared' || t.createdByUserId === viewerUser.id || isAdmin
  );
}

export async function getWebTemplateById(id: string): Promise<SavedWebTemplate | null> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    const rows = await state.db
      .select()
      .from(webTemplatesTable)
      .where(eq(webTemplatesTable.id, id))
      .limit(1);
    return rows[0] ? rowToSavedWebTemplate(rows[0]) : null;
  }
  const store = await loadJsonStore();
  const list = Array.isArray(store.webTemplates) ? store.webTemplates : [];
  return list.find((t) => t.id === id) || null;
}

export async function upsertWebTemplate(template: SavedWebTemplate): Promise<SavedWebTemplate> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    await state.db
      .insert(webTemplatesTable)
      .values({
        id: template.id,
        name: template.name,
        description: template.description || '',
        category: template.category,
        visibility: template.visibility,
        allowCollaborativeEdit: Boolean(template.allowCollaborativeEdit),
        snapshotJson: template.snapshot,
        mainBlockCount: template.mainBlockCount,
        subPageCount: template.subPageCount,
        totalBlockCount: template.totalBlockCount,
        subPageTitlesJson: template.subPageTitles,
        paletteColorsJson: template.paletteColors,
        createdByUserId: template.createdByUserId,
        createdByName: template.createdByName,
        updatedByName: template.updatedByName ?? null,
        usageCount: template.usageCount,
        createdAt: template.createdAt,
        updatedAt: template.updatedAt,
      })
      .onConflictDoUpdate({
        target: webTemplatesTable.id,
        set: {
          name: template.name,
          description: template.description || '',
          category: template.category,
          visibility: template.visibility,
          allowCollaborativeEdit: Boolean(template.allowCollaborativeEdit),
          snapshotJson: template.snapshot,
          mainBlockCount: template.mainBlockCount,
          subPageCount: template.subPageCount,
          totalBlockCount: template.totalBlockCount,
          subPageTitlesJson: template.subPageTitles,
          paletteColorsJson: template.paletteColors,
          updatedByName: template.updatedByName ?? null,
          usageCount: template.usageCount,
          updatedAt: template.updatedAt,
        },
      });
    return template;
  }

  return withJsonStoreLock(async () => {
    const store = await loadJsonStore();
    const existing = Array.isArray(store.webTemplates) ? store.webTemplates : [];
    const idx = existing.findIndex((t) => t.id === template.id);
    const next =
      idx >= 0
        ? existing.map((t, i) => (i === idx ? template : t))
        : [template, ...existing];
    await persistJsonStore({
      ...store,
      webTemplates: next.slice(0, 200),
    });
    return template;
  });
}

export async function deleteWebTemplate(id: string): Promise<boolean> {
  await assertStorageReady();
  const state = await getDbState();
  if (state.db) {
    const deleted = await state.db
      .delete(webTemplatesTable)
      .where(eq(webTemplatesTable.id, id))
      .returning({ id: webTemplatesTable.id });
    return deleted.length > 0;
  }

  return withJsonStoreLock(async () => {
    const store = await loadJsonStore();
    const existing = Array.isArray(store.webTemplates) ? store.webTemplates : [];
    const next = existing.filter((t) => t.id !== id);
    if (next.length === existing.length) return false;
    await persistJsonStore({
      ...store,
      webTemplates: next,
    });
    return true;
  });
}

export async function incrementWebTemplateUsage(id: string): Promise<SavedWebTemplate | null> {
  await assertStorageReady();
  const existing = await getWebTemplateById(id);
  if (!existing) return null;
  const updated: SavedWebTemplate = {
    ...existing,
    usageCount: (existing.usageCount || 0) + 1,
  };
  await upsertWebTemplate(updated);
  return updated;
}

/**
 * Grants a self-service SaaS buyer scoped access strictly to their own newly created site
 * (editor + publishing + analytics on their own unitScope ONLY — never elevates role or access_control).
 */
export async function grantBuyerSelfSiteAccess(
  userId: string,
  projectId: string
): Promise<StoredUserRecord | null> {
  await assertStorageReady();
  const existing = await getUserById(userId);
  if (!existing) return null;
  const nextScope: 'all' | string[] =
    existing.unitScope === 'all'
      ? 'all'
      : Array.from(new Set([...(Array.isArray(existing.unitScope) ? existing.unitScope : []), projectId]));
  const nextPermissions: FeaturePermissionsMap =
    existing.role === 'super_admin'
      ? { ...FULL_PERMISSIONS }
      : {
          ...existing.permissions,
          editor: true,
          publishing: true,
          analytics: true,
        };
  const nextRole: AccessRole =
    existing.role === 'viewer' ? 'editor' : existing.role;
  const updated: StoredUserRecord = {
    ...existing,
    role: nextRole,
    unitScope: nextScope,
    permissions: nextPermissions,
    updatedAt: Date.now(),
  };
  await upsertUser(updated);
  return updated;
}
