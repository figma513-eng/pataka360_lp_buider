import type {
  AccessRole,
  AccessSettingsConfig,
  ApiSettingsConfig,
  AuthUser,
  DbDiagnostics,
  MediaAssetMeta,
  ProjectRecord,
  RestorePreviewSummary,
  WebhookLogRecord,
} from '../types/builder';

const LEGACY_AUTH_TOKEN_KEY = 'lynk_auth_token';
let cachedCsrfToken: string | null = null;
let inMemorySessionToken: string | null = null;

/**
 * Purges any legacy session token left in localStorage from pre-hardening versions.
 * Active authentication uses HttpOnly cookies exclusively.
 */
export function clearStoredAuthToken(): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.removeItem(LEGACY_AUTH_TOKEN_KEY);
  } catch {
    // Abaikan jika storage dibatasi
  }
}

export function getStoredAuthToken(): string | null {
  return null;
}

export function setStoredAuthToken(_token: string): void {
  clearStoredAuthToken();
}

function readCsrfCookie(): string | null {
  if (typeof document === 'undefined') return null;
  const parts = (document.cookie || '').split(';');
  for (const part of parts) {
    const idx = part.indexOf('=');
    if (idx === -1) continue;
    const key = part.slice(0, idx).trim();
    if (key === 'lynk_csrf') {
      try {
        return decodeURIComponent(part.slice(idx + 1).trim());
      } catch {
        return part.slice(idx + 1).trim();
      }
    }
  }
  return null;
}

export function getActiveCsrfToken(): string | null {
  return readCsrfCookie() || cachedCsrfToken;
}

export async function authFetch(input: RequestInfo | URL, init: RequestInit = {}): Promise<Response> {
  const headers = new Headers(init.headers || {});
  const method = (init.method || 'GET').toUpperCase();

  if (inMemorySessionToken && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${inMemorySessionToken}`);
  }

  if (method !== 'GET' && method !== 'HEAD' && method !== 'OPTIONS') {
    if (!headers.has('X-Lynk-Requested-With')) {
      headers.set('X-Lynk-Requested-With', 'fetch');
    }
    const csrf = getActiveCsrfToken();
    if (csrf && !headers.has('X-Lynk-CSRF')) {
      headers.set('X-Lynk-CSRF', csrf);
    }
  }

  return fetch(input, {
    ...init,
    credentials: 'include',
    headers,
  });
}

export interface AuthMeResponse {
  authenticated: boolean;
  user: AuthUser | null;
  needsSetup: boolean;
  requireAuthForBuilder: boolean;
  csrfToken?: string;
  demoModeAvailable?: boolean;
  demoAccountsSeeded?: boolean;
  roleSummary?: Record<AccessRole, number>;
}

export async function fetchAuthMe(): Promise<AuthMeResponse> {
  clearStoredAuthToken();
  try {
    const res = await authFetch('/api/auth/me');
    if (!res.ok) {
      return {
        authenticated: false,
        user: null,
        needsSetup: false,
        requireAuthForBuilder: true,
      };
    }
    const data = (await res.json()) as AuthMeResponse;
    if (typeof data.csrfToken === 'string' && data.csrfToken) {
      cachedCsrfToken = data.csrfToken;
    }
    if (!data.authenticated) {
      inMemorySessionToken = null;
    }
    return data;
  } catch {
    return {
      authenticated: false,
      user: null,
      needsSetup: false,
      requireAuthForBuilder: true,
    };
  }
}

export async function seedDemoRolesOnServer(): Promise<{
  ok: boolean;
  createdCount?: number;
  error?: string;
  code?: string;
}> {
  try {
    const res = await authFetch('/api/auth/seed-demo-roles', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      createdCount?: number;
      error?: string;
      code?: string;
    };
    if (!res.ok || !data.ok) {
      return {
        ok: false,
        error: data.error || 'Gagal menyiapkan akun demo 4 role.',
        code: data.code,
      };
    }
    return { ok: true, createdCount: data.createdCount ?? 0 };
  } catch {
    return { ok: false, error: 'Tidak dapat terhubung ke server.' };
  }
}

export async function loginUser(
  email: string,
  password: string
): Promise<{ ok: boolean; user?: AuthUser; error?: string }> {
  clearStoredAuthToken();
  inMemorySessionToken = null;
  try {
    const res = await authFetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      user?: AuthUser;
      csrfToken?: string;
      sessionToken?: string;
      error?: string;
    };
    if (typeof data.csrfToken === 'string' && data.csrfToken) {
      cachedCsrfToken = data.csrfToken;
    }
    if (!res.ok || !data.user) {
      return { ok: false, error: data.error || 'Gagal masuk. Periksa email & sandi.' };
    }
    const verifyRes = await fetch('/api/auth/me', { credentials: 'include' }).catch(() => null);
    if (verifyRes && verifyRes.ok) {
      const verifyData = (await verifyRes.json().catch(() => null)) as AuthMeResponse | null;
      if (verifyData && !verifyData.authenticated) {
        if (typeof data.sessionToken === 'string' && data.sessionToken) {
          inMemorySessionToken = data.sessionToken;
          const bearerCheck = await authFetch('/api/auth/me').catch(() => null);
          const bearerData = (await bearerCheck?.json().catch(() => null)) as AuthMeResponse | null;
          if (bearerData?.authenticated) {
            return { ok: true, user: data.user };
          }
          inMemorySessionToken = null;
        }
        return {
          ok: false,
          error:
            'Browser memblokir penyimpanan cookie sesi di dalam iframe pratinjau. Buka URL aplikasi langsung di tab browser baru (ikon "Open in new tab") lalu coba login kembali.',
        };
      }
    }
    return { ok: true, user: data.user };
  } catch {
    return { ok: false, error: 'Tidak dapat terhubung ke server.' };
  }
}

export async function registerUser(
  name: string,
  email: string,
  password: string
): Promise<{ ok: boolean; user?: AuthUser; error?: string }> {
  clearStoredAuthToken();
  inMemorySessionToken = null;
  try {
    const res = await authFetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, email, password }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      user?: AuthUser;
      csrfToken?: string;
      sessionToken?: string;
      error?: string;
    };
    if (typeof data.csrfToken === 'string' && data.csrfToken) {
      cachedCsrfToken = data.csrfToken;
    }
    if (!res.ok || !data.user) {
      return { ok: false, error: data.error || 'Gagal mendaftar akun.' };
    }
    const verifyRes = await fetch('/api/auth/me', { credentials: 'include' }).catch(() => null);
    if (verifyRes && verifyRes.ok) {
      const verifyData = (await verifyRes.json().catch(() => null)) as AuthMeResponse | null;
      if (verifyData && !verifyData.authenticated) {
        if (typeof data.sessionToken === 'string' && data.sessionToken) {
          inMemorySessionToken = data.sessionToken;
          const bearerCheck = await authFetch('/api/auth/me').catch(() => null);
          const bearerData = (await bearerCheck?.json().catch(() => null)) as AuthMeResponse | null;
          if (bearerData?.authenticated) {
            return { ok: true, user: data.user };
          }
          inMemorySessionToken = null;
        }
        return {
          ok: false,
          error:
            'Akun berhasil dibuat, namun browser memblokir cookie sesi di dalam iframe pratinjau. Buka URL aplikasi langsung di tab browser baru lalu masuk menggunakan akun yang baru Anda buat.',
        };
      }
    }
    return { ok: true, user: data.user };
  } catch {
    return { ok: false, error: 'Tidak dapat terhubung ke server.' };
  }
}

export async function logoutUser(): Promise<void> {
  try {
    await authFetch('/api/auth/logout', { method: 'POST' });
  } catch {
    // Abaikan error offline
  }
  inMemorySessionToken = null;
  clearStoredAuthToken();
}

export async function createMemberWithPasswordOnServer(params: {
  name: string;
  email: string;
  password: string;
  role: AccessRole;
  unitScope?: 'all' | string[];
}): Promise<{ ok: boolean; settings?: AccessSettingsConfig; error?: string }> {
  try {
    const res = await authFetch('/api/auth/admin-create-member', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      settings?: AccessSettingsConfig;
      error?: string;
    };
    if (!res.ok) {
      return { ok: false, error: data.error || 'Gagal membuat akun login anggota.' };
    }
    return { ok: true, settings: data.settings };
  } catch {
    return { ok: false, error: 'Koneksi server gagal.' };
  }
}

export async function fetchProjectsFromServer(): Promise<ProjectRecord[] | null> {
  try {
    const res = await authFetch('/api/projects');
    if (!res.ok) return null;
    const data = (await res.json()) as { projects?: ProjectRecord[] };
    return Array.isArray(data.projects) ? data.projects : null;
  } catch {
    return null;
  }
}

export interface ApiSettingsBundleResponse {
  settings: ApiSettingsConfig;
  diagnostics: DbDiagnostics;
  logs: WebhookLogRecord[];
}

export async function fetchApiSettingsFromServer(): Promise<{
  ok: boolean;
  data?: ApiSettingsBundleResponse;
  error?: string;
}> {
  try {
    const res = await authFetch('/api/settings/api');
    const data = (await res.json().catch(() => ({}))) as Partial<ApiSettingsBundleResponse> & {
      error?: string;
    };
    if (!res.ok || !data.settings || !data.diagnostics) {
      return { ok: false, error: data.error || 'Gagal memuat Setting API.' };
    }
    return {
      ok: true,
      data: {
        settings: data.settings,
        diagnostics: data.diagnostics,
        logs: Array.isArray(data.logs) ? data.logs : [],
      },
    };
  } catch {
    return { ok: false, error: 'Server tidak merespons.' };
  }
}

export async function saveApiSettingsToServer(
  settings: Partial<ApiSettingsConfig>
): Promise<{ ok: boolean; settings?: ApiSettingsConfig; error?: string }> {
  try {
    const res = await authFetch('/api/settings/api', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      settings?: ApiSettingsConfig;
      error?: string;
    };
    if (!res.ok || !data.settings) {
      return { ok: false, error: data.error || 'Gagal menyimpan Setting API.' };
    }
    return { ok: true, settings: data.settings };
  } catch {
    return { ok: false, error: 'Koneksi server terputus.' };
  }
}

export async function testWebhookOnServer(webhookUrl: string): Promise<{
  ok: boolean;
  log?: WebhookLogRecord;
  error?: string;
}> {
  try {
    const res = await authFetch('/api/settings/api/test-webhook', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ webhookUrl }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      log?: WebhookLogRecord;
      error?: string;
    };
    if (!res.ok && !data.log) {
      return { ok: false, error: data.error || 'Gagal menguji webhook.' };
    }
    return { ok: Boolean(data.ok), log: data.log, error: data.error };
  } catch {
    return { ok: false, error: 'Tidak dapat menghubungi server.' };
  }
}

export async function clearWebhookLogsOnServer(): Promise<boolean> {
  try {
    const res = await authFetch('/api/settings/api/webhook-logs', { method: 'DELETE' });
    return res.ok;
  } catch {
    return false;
  }
}

export async function reconnectDbOnServer(): Promise<{
  ok: boolean;
  diagnostics?: DbDiagnostics;
}> {
  try {
    const res = await authFetch('/api/settings/api/reconnect-db', { method: 'POST' });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      diagnostics?: DbDiagnostics;
    };
    return { ok: Boolean(data.ok), diagnostics: data.diagnostics };
  } catch {
    return { ok: false };
  }
}

export async function fetchSchemaSqlFromServer(): Promise<string | null> {
  try {
    const res = await authFetch('/api/settings/api/schema-sql');
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function fetchFullSqlDumpFromServer(): Promise<string | null> {
  try {
    const res = await authFetch('/api/settings/api/export-sql');
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  }
}

export async function uploadMediaAsset(
  dataUrl: string,
  preferredId?: string
): Promise<{
  ok: boolean;
  url?: string;
  asset?: MediaAssetMeta;
  status?: number;
  error?: string;
}> {
  try {
    const res = await authFetch('/api/media/upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dataUrl, preferredId }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      asset?: MediaAssetMeta;
      error?: string;
    };
    if (!res.ok || !data.asset?.url) {
      return {
        ok: false,
        status: res.status,
        error: data.error || 'Gagal mengunggah gambar ke server.',
      };
    }
    return { ok: true, url: data.asset.url, asset: data.asset, status: res.status };
  } catch {
    return { ok: false, error: 'Server tidak terjangkau saat mengunggah gambar.' };
  }
}

export async function exportCompleteBackupFromServer(): Promise<{
  ok: boolean;
  content?: string;
  filename?: string;
  error?: string;
}> {
  try {
    const res = await authFetch('/api/backup/export');
    if (!res.ok) {
      const errData = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: errData.error || 'Gagal mengekspor backup lengkap.' };
    }
    const content = await res.text();
    const stamp = new Date().toISOString().slice(0, 10);
    return {
      ok: true,
      content,
      filename: `lynk-builder-complete-backup-${stamp}.json`,
    };
  } catch {
    return { ok: false, error: 'Tidak dapat menghubungi server untuk ekspor backup.' };
  }
}

export async function previewBackupRestoreOnServer(bundle: unknown): Promise<{
  ok: boolean;
  summary?: RestorePreviewSummary;
  error?: string;
}> {
  try {
    const res = await authFetch('/api/backup/restore/preview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundle }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      summary?: RestorePreviewSummary;
      error?: string;
    };
    if (!res.ok || !data.summary) {
      return {
        ok: false,
        error: data.error || 'Gagal memvalidasi berkas backup.',
      };
    }
    return { ok: Boolean(data.ok), summary: data.summary, error: data.error };
  } catch {
    return { ok: false, error: 'Koneksi ke server gagal saat memvalidasi backup.' };
  }
}

export async function applyBackupRestoreOnServer(
  bundle: unknown,
  confirmOverwrite: boolean
): Promise<{
  ok: boolean;
  preRestoreBackupPath?: string;
  restoredCounts?: { projects: number; analyticsEvents: number; media: number };
  error?: string;
}> {
  try {
    const res = await authFetch('/api/backup/restore/apply', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ bundle, confirmOverwrite }),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      preRestoreBackupPath?: string;
      restoredCounts?: { projects: number; analyticsEvents: number; media: number };
      error?: string;
    };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'Gagal memulihkan backup di server.' };
    }
    return {
      ok: true,
      preRestoreBackupPath: data.preRestoreBackupPath,
      restoredCounts: data.restoredCounts,
    };
  } catch {
    return { ok: false, error: 'Koneksi terputus saat proses restore.' };
  }
}
