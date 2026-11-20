import 'dotenv/config';
import express, {
  type NextFunction,
  type Request,
  type Response as ExpressResponse,
} from 'express';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import type {
  AccessRole,
  AccessSettingsConfig,
  AnalyticsEventRecord,
  CatalogCustomerField,
  FeaturePermissionKey,
  FormSubmissionRecord,
  ProjectRecord,
} from './src/types/builder.ts';
import { getDbState, resetDbConnectionCheck } from './src/db/index.ts';
import {
  FULL_PERMISSIONS,
  type StoredProjectEntry,
  type StoredUserRecord,
  appendProjectToUserScope,
  clearAnalyticsEvents,
  clearWebhookLogs,
  countUsers,
  createSession,
  deleteProjectEntry,
  deleteSessionByToken,
  dispatchWebhookEvent,
  ensureP0AAccessHardening,
  exportFullPostgresSqlDump,
  getAccessSettings,
  getApiSettings,
  getDbDiagnostics,
  getPresetPermissionsForRole,
  getProjectEntryByDomain,
  getProjectEntryById,
  getProjectEntryBySlug,
  getSessionUserByToken,
  getUiAppearanceSettings,
  getUserByEmail,
  hashPassword,
  insertAnalyticsEvent,
  insertFormSubmission,
  listAnalyticsEvents,
  listFormSubmissions,
  listProjectEntries,
  listUsers,
  listWebhookLogs,
  normalizeHostHeader,
  normalizeServerSlug,
  registerUserAtomically,
  saveAccessSettings,
  saveApiSettings,
  saveUiAppearanceSettings,
  toPublicAuthUser,
  updateUserLoginTime,
  upsertMediaAssetMeta,
  upsertProjectEntry,
  upsertUser,
  verifyPassword,
} from './src/db/repository.ts';
import { validateDynamicFormSubmission } from './src/utils/formValidation.ts';
import { findBlockById } from './src/utils/treeHelpers.ts';
import {
  applyBackupRestore,
  exportCompleteBackupBundle,
  previewBackupRestore,
} from './src/db/backupService.ts';
import { buildFullProjectBackupZip } from './src/server/fullExportService.ts';
import { applyZipRestore, previewZipRestore } from './src/server/zipRestoreService.ts';
import {
  isSafeMediaFilename,
  readMediaFileSafe,
  writeMediaFile,
} from './src/server/mediaService.ts';
import {
  AppError,
  type RequestWithContext,
  asyncHandler,
  centralErrorHandler,
  registerProcessErrorGuards,
  requestIdMiddleware,
} from './src/server/errors.ts';
import { apiRateLimiter, authRateLimiter } from './src/server/rateLimiter.ts';
import { resolveClientIp } from './src/server/proxyIp.ts';
import { publicPageCache } from './src/server/publicPageCache.ts';
import { CollabHub } from './src/server/collabHub.ts';
import {
  bootstrapManagedCloudRunDefaults,
  isProductionMode,
  validateStartupSecrets,
} from './src/server/secrets.ts';
import {
  DEMO_ROLE_PROFILES,
  ROLE_ACCESS_ORDER,
  resolveDemoEmailByAlias,
} from './src/utils/demoAccounts.ts';
import {
  SsrfBlockedError,
  assertSafeExternalUrl,
  readResponseTextWithCap,
  safeFetch,
} from './src/server/ssrfGuard.ts';
import { sanitizeBuilderProject } from './src/utils/htmlSanitizer.ts';
import { generateProjectHtml } from './src/utils/htmlExporter.ts';
import {
  extractInstagramInfo,
  extractTikTokId,
  isDirectVideoUrl,
  isValidFacebookVideoUrl,
  isValidInstagramVideoUrl,
  isValidTikTokUrl,
} from './src/utils/videoHelpers.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = Number(process.env.PORT) || 3000;
const SESSION_COOKIE_NAME = 'lynk_session';
const CSRF_COOKIE_NAME = 'lynk_csrf';
const PUBLIC_PAGE_CSP =
  "default-src 'self' https: data: blob:; script-src 'self' 'unsafe-inline' https:; style-src 'self' 'unsafe-inline' https:; img-src 'self' https: data: blob:; media-src 'self' https: data: blob:; frame-src 'self' https:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'self' https:;";
const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

interface AuthenticatedRequest extends RequestWithContext {
  authUser?: StoredUserRecord | null;
  authToken?: string | null;
  authSource?: 'cookie' | 'bearer' | null;
}

function resolveBindHost(): string {
  const explicit = process.env.HOST?.trim();
  if (explicit) return explicit;
  if (process.env.K_SERVICE || process.env.DISABLE_HMR === 'true') {
    return '0.0.0.0';
  }
  return '127.0.0.1';
}

function getAuthMaxAttempts(): number {
  const raw = Number(process.env.AUTH_RATE_LIMIT_MAX);
  return Number.isFinite(raw) && raw >= 3 ? Math.round(raw) : 10;
}

function escapeHtmlServer(raw: string): string {
  return String(raw || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function renderStatusHtml(title: string, message: string): string {
  const safeTitle = escapeHtmlServer(title);
  const safeMessage = escapeHtmlServer(message);
  return `<!doctype html><html lang="id"><head><meta charset="UTF-8"/><meta name="viewport" content="width=device-width,initial-scale=1.0"/><title>${safeTitle}</title><style>body{margin:0;min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;font-family:-apple-system,BlinkMacSystemFont,sans-serif;background:#F7F9F8;color:#0F172A;box-sizing:border-box;}.box{max-width:420px;width:100%;background:#FFFFFF;border:1px solid #E2E8F0;border-radius:16px;padding:28px;text-align:center;}h1{margin:0 0 8px;font-size:18px;}p{margin:0;font-size:13px;color:#475569;line-height:1.6;}</style></head><body><div class="box"><h1>${safeTitle}</h1><p>${safeMessage}</p></div></body></html>`;
}

function getMetaCapiToken(): string {
  const raw = process.env.META_CAPI_ACCESS_TOKEN?.trim() || '';
  if (!raw) return '';
  const lower = raw.toLowerCase();
  if (['-', 'skip', 'none', 'null', 'undefined', 'belum', 'n/a'].includes(lower)) {
    return '';
  }
  return raw;
}

async function forwardToMetaCapi(
  pixelId: string,
  event: AnalyticsEventRecord,
  metaEventName: string,
  apiVersion = 'v21.0',
  testEventCode?: string,
  clientIp?: string,
  userAgent?: string
) {
  const token = getMetaCapiToken();
  if (!token || !pixelId) return;

  const eventName =
    event.eventType === 'page_view'
      ? 'PageView'
      : event.eventType === 'form_submit'
      ? 'Lead'
      : metaEventName || 'Lead';

  const payload: Record<string, unknown> = {
    data: [
      {
        event_name: eventName,
        event_time: Math.floor((event.createdAt || Date.now()) / 1000),
        event_id: event.id,
        action_source: 'website',
        user_data: {
          client_ip_address: clientIp || undefined,
          client_user_agent: userAgent || undefined,
        },
        custom_data: {
          content_name: event.ctaLabel || event.projectTitle,
          content_category: event.channel,
          currency: 'IDR',
          value: typeof event.orderValue === 'number' ? event.orderValue : 0,
        },
      },
    ],
  };

  if (testEventCode?.trim()) {
    payload.test_event_code = testEventCode.trim();
  }

  const ver = /^v\d+\.\d+$/.test(apiVersion) ? apiVersion : 'v21.0';
  try {
    await safeFetch(
      `https://graph.facebook.com/${ver}/${encodeURIComponent(pixelId)}/events?access_token=${encodeURIComponent(token)}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        timeoutMs: 5000,
        maxRedirects: 2,
      }
    );
  } catch {
    // Jangan ganggu response user jika Meta CAPI timeout
  }
}

function parseCookies(header?: string): Record<string, string> {
  const out: Record<string, string> = {};
  if (!header) return out;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx <= 0) continue;
    const key = part.slice(0, idx).trim();
    const val = part.slice(idx + 1).trim();
    if (key) {
      try {
        out[key] = decodeURIComponent(val);
      } catch {
        out[key] = val;
      }
    }
  }
  return out;
}

function extractAuthToken(
  req: { headers: http.IncomingMessage['headers'] }
): { token: string | null; source: 'cookie' | 'bearer' | null } {
  const authHeader = req.headers.authorization;
  if (typeof authHeader === 'string' && authHeader.toLowerCase().startsWith('bearer ')) {
    const bearer = authHeader.slice(7).trim();
    if (bearer) return { token: bearer, source: 'bearer' };
  }
  const cookies = parseCookies(
    typeof req.headers.cookie === 'string' ? req.headers.cookie : undefined
  );
  if (cookies[SESSION_COOKIE_NAME]) {
    return { token: cookies[SESSION_COOKIE_NAME], source: 'cookie' };
  }
  return { token: null, source: null };
}

function isTrustedProxyRuntime(): boolean {
  if (process.env.TRUST_PROXY?.trim().toLowerCase() === 'true') return true;
  if (process.env.TRUST_PROXY?.trim().toLowerCase() === 'false') return false;
  if (process.env.NODE_ENV === 'test') return false;
  return Boolean(
    process.env.K_SERVICE?.trim() ||
      process.env.K_REVISION?.trim() ||
      process.env.CLOUD_RUN_TIMEOUT_SECONDS?.trim() ||
      process.env.APPLET_ID?.trim()
  );
}

function resolveConfiguredAppOrigin(): string | undefined {
  const raw = process.env.APP_URL?.trim();
  if (!raw || raw === 'MY_APP_URL') return undefined;
  try {
    const parsed = new URL(raw);
    if (parsed.protocol === 'http:' || parsed.protocol === 'https:') {
      return parsed.origin;
    }
  } catch {
    // ignore invalid APP_URL
  }
  return undefined;
}

function resolveRequestPublicOrigin(req: Request): string | undefined {
  const forwardedHost = String(req.headers['x-forwarded-host'] || '')
    .split(',')[0]
    .trim();
  const rawHost = forwardedHost || String(req.headers.host || '').trim();
  if (rawHost) {
    const cleanHost = rawHost.replace(/[^a-zA-Z0-9.:-]/g, '');
    if (cleanHost) {
      const hostWithoutPort = cleanHost.split(':')[0]?.toLowerCase() ?? '';
      const isLocalHost =
        hostWithoutPort === 'localhost' ||
        hostWithoutPort === '127.0.0.1' ||
        hostWithoutPort === '::1';
      const proto = isRequestHttps(req) ? 'https' : isLocalHost ? 'http' : 'https';
      return `${proto}://${cleanHost}`;
    }
  }
  return resolveConfiguredAppOrigin();
}

function getClientIp(req: Request): string {
  return resolveClientIp(req, { trustedProxy: isTrustedProxyRuntime() });
}

function matchesIfNoneMatch(headerValue: string | string[] | undefined, etag: string): boolean {
  if (!headerValue) return false;
  const raw = Array.isArray(headerValue) ? headerValue.join(',') : String(headerValue);
  if (!raw.trim()) return false;
  const cleanTarget = etag.replace(/^W\//i, '').trim();
  return raw.split(',').some((part) => {
    const token = part.trim();
    if (token === '*') return true;
    return token === etag || token.replace(/^W\//i, '').trim() === cleanTarget;
  });
}

function isRequestHttps(req: Request): boolean {
  if (req.secure) return true;
  const proto = String(req.headers['x-forwarded-proto'] || '').split(',')[0].trim().toLowerCase();
  if (proto === 'https') return true;
  const ssl = String(req.headers['x-forwarded-ssl'] || '').trim().toLowerCase();
  if (ssl === 'on') return true;
  const forwarded = String(req.headers.forwarded || '').toLowerCase();
  if (/proto=https\b/.test(forwarded)) return true;

  if (isTrustedProxyRuntime()) {
    const appOrigin = resolveConfiguredAppOrigin();
    const originHeader = String(req.headers.origin || '').trim();
    const refererHeader = String(req.headers.referer || '').trim();
    if (
      appOrigin?.startsWith('https://') &&
      (originHeader.startsWith('https://') || refererHeader.startsWith('https://'))
    ) {
      return true;
    }
  }
  return false;
}

function buildCookieSecurityFlags(req: Request): string[] {
  if (isRequestHttps(req)) {
    // AI Studio Web Preview runs inside a cross-site iframe (aistudio.google.com -> *.run.app).
    // Modern browsers withhold SameSite=Lax cookies inside cross-site iframes; SameSite=None; Secure; Partitioned works both in iframes and top-level HTTPS tabs.
    return ['SameSite=None', 'Secure', 'Partitioned'];
  }
  return ['SameSite=Lax'];
}

function appendSetCookie(res: ExpressResponse, cookieStr: string): void {
  const prev = res.getHeader('Set-Cookie');
  if (!prev) {
    res.setHeader('Set-Cookie', [cookieStr]);
  } else if (Array.isArray(prev)) {
    res.setHeader('Set-Cookie', [...prev.map(String), cookieStr]);
  } else {
    res.setHeader('Set-Cookie', [String(prev), cookieStr]);
  }
}

function setSessionCookie(req: Request, res: ExpressResponse, token: string, expiresAt: number) {
  const maxAge = Math.max(1, Math.floor((expiresAt - Date.now()) / 1000));
  const parts = [
    `${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`,
    'Path=/',
    'HttpOnly',
    `Max-Age=${maxAge}`,
    ...buildCookieSecurityFlags(req),
  ];
  appendSetCookie(res, parts.join('; '));
}

function ensureCsrfCookie(req: Request, res: ExpressResponse): string {
  const cookies = parseCookies(req.headers.cookie);
  const existing = cookies[CSRF_COOKIE_NAME];
  if (existing && /^[a-f0-9]{32}$/.test(existing)) {
    return existing;
  }
  const csrfToken = crypto.randomBytes(16).toString('hex');
  const parts = [
    `${CSRF_COOKIE_NAME}=${csrfToken}`,
    'Path=/',
    `Max-Age=${60 * 60 * 24 * 14}`,
    ...buildCookieSecurityFlags(req),
  ];
  appendSetCookie(res, parts.join('; '));
  return csrfToken;
}

function clearSessionCookie(req: Request, res: ExpressResponse) {
  const parts = [
    `${SESSION_COOKIE_NAME}=`,
    'Path=/',
    'HttpOnly',
    'Max-Age=0',
    ...buildCookieSecurityFlags(req),
  ];
  appendSetCookie(res, parts.join('; '));
}

/**
 * CSRF & Cross-Origin Mutation Guard (F-04):
 * Blocks cross-site state-changing requests to private/auth API routes.
 */
function csrfProtectionMiddleware(
  req: AuthenticatedRequest,
  res: ExpressResponse,
  next: NextFunction
): void {
  const method = req.method.toUpperCase();
  if (method === 'GET' || method === 'HEAD' || method === 'OPTIONS') {
    return next();
  }
  if (
    !req.path.startsWith('/api/') ||
    req.path === '/api/track/event' ||
    req.path === '/api/form-submissions'
  ) {
    return next();
  }

  const secFetchSite = String(req.headers['sec-fetch-site'] || '').toLowerCase();
  if (secFetchSite === 'cross-site') {
    res.status(403).json({
      error: 'Permintaan cross-site diblokir oleh kebijakan CSRF.',
      code: 'CSRF_CROSS_SITE',
    });
    return;
  }

  const reqHost = normalizeHostHeader(String(req.headers.host || ''));
  const forwardedHost = isTrustedProxyRuntime()
    ? normalizeHostHeader(String(req.headers['x-forwarded-host'] || '').split(',')[0])
    : '';
  const appOrigin = resolveConfiguredAppOrigin();
  const appHost = appOrigin ? normalizeHostHeader(new URL(appOrigin).host) : '';
  const originHeader = req.headers.origin;
  if (typeof originHeader === 'string' && originHeader.trim()) {
    try {
      const originHost = normalizeHostHeader(new URL(originHeader).host);
      const matchesHost = Boolean(reqHost && originHost === reqHost);
      const matchesForwarded = Boolean(forwardedHost && originHost === forwardedHost);
      const matchesAppUrl = Boolean(appHost && originHost === appHost);
      if (
        (reqHost || forwardedHost || appHost) &&
        originHost &&
        !matchesHost &&
        !matchesForwarded &&
        !matchesAppUrl
      ) {
        res.status(403).json({
          error: 'Origin tidak cocok dengan host server (CSRF).',
          code: 'CSRF_ORIGIN_MISMATCH',
        });
        return;
      }
    } catch {
      res.status(403).json({
        error: 'Header Origin tidak valid.',
        code: 'CSRF_INVALID_ORIGIN',
      });
      return;
    }
  }

  // If browser sent Origin/Referer and uses cookie auth (no Bearer header), require matching X-Lynk-CSRF token or custom fetch header
  const isBrowserContext = Boolean(originHeader || req.headers.referer || secFetchSite);
  if (isBrowserContext && req.authSource === 'cookie') {
    const cookies = parseCookies(req.headers.cookie);
    const cookieCsrf = cookies[CSRF_COOKIE_NAME];
    const headerCsrf = String(req.headers['x-lynk-csrf'] || '').trim();
    const customFetchHeader = String(req.headers['x-lynk-requested-with'] || '').trim();
    const csrfMatch = cookieCsrf && headerCsrf && cookieCsrf === headerCsrf;
    if (!csrfMatch && customFetchHeader !== 'fetch') {
      res.status(403).json({
        error: 'Token CSRF atau header verifikasi permintaan tidak valid.',
        code: 'CSRF_TOKEN_INVALID',
      });
      return;
    }
  }

  next();
}

async function resolveAuthMiddleware(
  req: AuthenticatedRequest,
  _res: ExpressResponse,
  next: NextFunction
) {
  try {
    const { token, source } = extractAuthToken(req);
    req.authToken = token;
    req.authSource = source;
    req.authUser = token ? await getSessionUserByToken(token) : null;
  } catch {
    req.authUser = null;
  }
  next();
}

function requireAuthenticatedAccess(permission?: FeaturePermissionKey) {
  return async (req: AuthenticatedRequest, res: ExpressResponse, next: NextFunction) => {
    if (!req.authUser) {
      return res.status(401).json({
        error: 'Sesi login diperlukan untuk mengakses fitur ini.',
        code: 'AUTH_REQUIRED',
      });
    }

    if (!req.authUser.isActive) {
      return res.status(403).json({
        error: 'Akun Anda berstatus nonaktif. Hubungi Super Admin.',
        code: 'ACCOUNT_DISABLED',
      });
    }

    if (permission) {
      const isSuper = req.authUser.role === 'super_admin';
      const hasPerm = isSuper || Boolean(req.authUser.permissions?.[permission]);
      if (!hasPerm) {
        return res.status(403).json({
          error: 'Akun Anda tidak memiliki izin untuk fitur ini.',
          code: 'FORBIDDEN',
        });
      }
    }

    return next();
  };
}

function canUserAccessExistingProject(
  user: StoredUserRecord | null | undefined,
  entry: StoredProjectEntry
): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === 'super_admin') return true;
  if (user.unitScope === 'all') return true;
  if (Array.isArray(user.unitScope)) {
    return user.unitScope.includes(entry.record.id);
  }
  return false;
}

function canUserAccessProjectId(
  user: StoredUserRecord | null | undefined,
  projectId: string
): boolean {
  if (!user || !user.isActive) return false;
  if (user.role === 'super_admin') return true;
  if (user.unitScope === 'all') return true;
  return Array.isArray(user.unitScope) && user.unitScope.includes(projectId);
}

function unescapeJsonString(raw?: string): string | null {
  if (!raw) return null;
  try {
    return JSON.parse(`"${raw}"`);
  } catch {
    return raw.replace(/\\\//g, '/').replace(/\\u0025/g, '%').replace(/&amp;/g, '&');
  }
}

async function verifyPlayableVideoUrl(videoUrl: string | null): Promise<string | null> {
  if (!videoUrl) return null;
  try {
    const { response: head, finalUrl } = await safeFetch(videoUrl, {
      method: 'HEAD',
      headers: { 'User-Agent': USER_AGENT },
      timeoutMs: 4500,
      maxRedirects: 3,
    });
    const corp = (head.headers.get('cross-origin-resource-policy') || '').toLowerCase();
    const ct = (head.headers.get('content-type') || '').toLowerCase();
    if (
      head.ok &&
      corp !== 'same-origin' &&
      (ct.includes('video') || ct.includes('octet-stream') || !ct)
    ) {
      return finalUrl;
    }
  } catch {
    // ignore blocked or unreachable video candidate
  }
  return null;
}

export async function createApp(options?: { attachViteOrStatic?: boolean }) {
  registerProcessErrorGuards();
  validateStartupSecrets();

  // Inisialisasi PostgreSQL atau fallback JSON lokal saat server boot (kecuali saat ready false di fail-closed)
  const dbState = await getDbState();
  if (dbState.ready) {
    await ensureP0AAccessHardening();
  }

  const app = express();
  const collabHub = new CollabHub();
  (app.locals as Record<string, unknown>).collabHub = collabHub;
  if (isTrustedProxyRuntime()) {
    app.set('trust proxy', ['loopback', 'linklocal', 'uniquelocal']);
  }
  app.use(requestIdMiddleware);
  app.use((_req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
    next();
  });
  app.use(express.json({ limit: '25mb' }));
  app.use(asyncHandler(resolveAuthMiddleware));
  app.use(csrfProtectionMiddleware);

  // ============================================================
  // Health Check Endpoints (Liveness + Readiness)
  // ============================================================
  app.get('/api/health/live', (_req, res) => {
    res.json({ ok: true, timestamp: Date.now() });
  });

  app.get(
    '/api/health/ready',
    asyncHandler(async (_req, res) => {
      const diag = await getDbDiagnostics();
      const status = diag.ready && !diag.degraded && !diag.corrupt ? 200 : 503;
      res.status(status).json({
        ok: status === 200,
        ready: diag.ready,
        degraded: diag.degraded,
        corrupt: Boolean(diag.corrupt),
        dbEngine: diag.engine,
        dbConnected: diag.connected,
        lastError: diag.lastError,
      });
    })
  );

  app.get(
    '/api/health',
    asyncHandler(async (_req, res) => {
      const diag = await getDbDiagnostics();
      const healthy = diag.ready && !diag.degraded && !diag.corrupt;
      res.status(healthy ? 200 : 503).json({
        ok: healthy,
        ready: diag.ready,
        degraded: diag.degraded,
        corrupt: Boolean(diag.corrupt),
        capiConfigured: Boolean(getMetaCapiToken()),
        dbEngine: diag.engine,
        dbConnected: diag.connected,
        sslVerifyMode: diag.sslVerifyMode,
        appUrl: resolveConfiguredAppOrigin(),
        lastError: diag.lastError,
      });
    })
  );

  // ============================================================
  // Authentication & Session Endpoints
  // ============================================================
  app.get(
    '/api/auth/me',
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const csrfToken = ensureCsrfCookie(req, res);
      const [totalUsers, api] = await Promise.all([countUsers(), getApiSettings()]);

      const user =
        req.authUser && req.authUser.isActive
          ? toPublicAuthUser(req.authUser)
          : null;

      let demoModeAvailable = false;
      let demoAccountsSeeded = false;
      let roleSummary: Record<AccessRole, number> | undefined;

      if (!isProductionMode()) {
        demoModeAvailable = true;
        const [allUsers, superDemo] = await Promise.all([
          listUsers(),
          getUserByEmail(DEMO_ROLE_PROFILES.super_admin.email),
        ]);
        demoAccountsSeeded = Boolean(superDemo);
        roleSummary = {
          super_admin: allUsers.filter((u) => u.isActive && u.role === 'super_admin').length,
          admin: allUsers.filter((u) => u.isActive && u.role === 'admin').length,
          editor: allUsers.filter((u) => u.isActive && u.role === 'editor').length,
          viewer: allUsers.filter((u) => u.isActive && u.role === 'viewer').length,
        };
      }

      res.json({
        authenticated: Boolean(user),
        user,
        needsSetup: totalUsers === 0,
        requireAuthForBuilder: api.requireAuthForBuilder,
        csrfToken,
        demoModeAvailable,
        demoAccountsSeeded,
        roleSummary,
      });
    })
  );

  app.post(
    '/api/auth/bootstrap-super-admin',
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const clientIp = getClientIp(req);
      const limitCheck = authRateLimiter.consume(
        `bootstrap:${clientIp}`,
        getAuthMaxAttempts(),
        15 * 60_000
      );
      if (!limitCheck.allowed) {
        res.setHeader('Retry-After', String(limitCheck.retryAfterSeconds));
        return res.status(429).json({
          error: 'Terlalu banyak percobaan aktivasi Super Admin. Coba lagi beberapa menit lagi.',
          code: 'RATE_LIMITED',
        });
      }

      if ((await countUsers()) > 0) {
        return res.status(409).json({
          error: 'Aktivasi awal selesai. Akun Super Admin sudah terdaftar di server ini.',
          code: 'SETUP_ALREADY_COMPLETED',
        });
      }

      const body = (req.body || {}) as {
        name?: string;
        email?: string;
        password?: string;
      };
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (!name || name.length < 2) {
        return res.status(400).json({ error: 'Nama lengkap minimal 2 karakter.' });
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Format email tidak valid.' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
      }

      const regResult = await registerUserAtomically({ name, email, password });
      if (!regResult.ok || !regResult.isFirstUser) {
        return res.status(409).json({
          error: 'Aktivasi awal sudah diselesaikan oleh admin lain.',
          code: 'SETUP_ALREADY_COMPLETED',
        });
      }

      const newUser = regResult.user;
      const access = await getAccessSettings();
      const cleanedMembers = access.members.filter(
        (m) =>
          m.id !== newUser.id &&
          m.email.toLowerCase() !== newUser.email &&
          m.id !== 'owner-super-admin'
      );
      await saveAccessSettings({
        ...access,
        allUsersSuperAdmin: false,
        autoGrantSuperAdminOnJoin: false,
        defaultRole: access.defaultRole === 'editor' ? 'editor' : 'viewer',
        activeMemberId: newUser.id,
        members: [
          {
            id: newUser.id,
            name: newUser.name,
            email: newUser.email,
            role: newUser.role,
            isActive: newUser.isActive,
            unitScope: newUser.unitScope,
            permissions: newUser.permissions,
            createdAt: newUser.createdAt,
          },
          ...cleanedMembers,
        ],
      });

      const { rawToken, expiresAt } = await createSession({
        userId: newUser.id,
        userAgent: String(req.headers['user-agent'] || ''),
        ipAddress: clientIp === 'unknown' ? '' : clientIp,
      });
      setSessionCookie(req, res, rawToken, expiresAt);
      const csrfToken = ensureCsrfCookie(req, res);

      return res.status(201).json({
        ok: true,
        user: toPublicAuthUser(newUser),
        csrfToken,
        ...(isProductionMode() ? {} : { sessionToken: rawToken }),
      });
    })
  );

  app.post(
    '/api/auth/seed-demo-roles',
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      if (isProductionMode()) {
        return res.status(403).json({
          error: 'Akun demo sandbox dinonaktifkan pada mode production.',
          code: 'FORBIDDEN',
        });
      }

      const clientIp = getClientIp(req);
      const limitCheck = authRateLimiter.consume(
        `seed_demo:${clientIp}`,
        Math.max(10, getAuthMaxAttempts()),
        15 * 60_000
      );
      if (!limitCheck.allowed) {
        res.setHeader('Retry-After', String(limitCheck.retryAfterSeconds));
        return res.status(429).json({
          error: 'Terlalu banyak permintaan inisialisasi akun demo. Coba lagi sebentar.',
          code: 'RATE_LIMITED',
        });
      }

      const totalBefore = await countUsers();
      const isSuperAdminCaller = Boolean(
        req.authUser && req.authUser.isActive && req.authUser.role === 'super_admin'
      );

      if (totalBefore > 0 && !isSuperAdminCaller) {
        return res.status(409).json({
          error:
            'Server sudah memiliki akun terdaftar. Masuk sebagai Super Admin untuk menambahkan preset akun demo.',
          code: 'SETUP_ALREADY_COMPLETED',
        });
      }

      let createdCount = 0;
      const createdUsers: StoredUserRecord[] = [];
      const now = Date.now();

      for (const role of ROLE_ACCESS_ORDER) {
        const profile = DEMO_ROLE_PROFILES[role];
        const existing = await getUserByEmail(profile.email);
        if (existing) continue;

        if ((await countUsers()) === 0) {
          const firstReg = await registerUserAtomically({
            name: profile.name,
            email: profile.email,
            password: profile.demoPassword,
          });
          if (firstReg.ok) {
            createdUsers.push(firstReg.user);
            createdCount += 1;
            continue;
          }
        }

        const created: StoredUserRecord = {
          id: `usr_demo_${role}`,
          name: profile.name,
          email: profile.email,
          passwordHash: hashPassword(profile.demoPassword),
          role: profile.role,
          isActive: true,
          unitScope: 'all',
          permissions:
            profile.role === 'super_admin'
              ? { ...FULL_PERMISSIONS }
              : getPresetPermissionsForRole(profile.role),
          createdAt: now,
          updatedAt: now,
        };
        await upsertUser(created);
        createdUsers.push(created);
        createdCount += 1;
      }

      if (createdUsers.length > 0) {
        const access = await getAccessSettings();
        const existingEmails = new Set(access.members.map((m) => m.email.toLowerCase()));
        const existingIds = new Set(access.members.map((m) => m.id));
        const additions = createdUsers
          .filter((u) => !existingEmails.has(u.email.toLowerCase()) && !existingIds.has(u.id))
          .map((u) => ({
            id: u.id,
            name: u.name,
            email: u.email,
            role: u.role,
            isActive: u.isActive,
            unitScope: u.unitScope,
            permissions: u.permissions,
            createdAt: u.createdAt,
          }));
        if (additions.length > 0) {
          const updatedAccess = await saveAccessSettings({
            ...access,
            allUsersSuperAdmin: false,
            autoGrantSuperAdminOnJoin: false,
            defaultRole: access.defaultRole === 'editor' ? 'editor' : 'viewer',
            activeMemberId: access.activeMemberId || createdUsers[0].id,
            members: [
              ...access.members.filter(
                (m) => m.id !== 'owner-super-admin' || createdUsers.some((u) => u.id === 'owner-super-admin')
              ),
              ...additions,
            ],
          });
          collabHub.updateConnectedUsers(await listUsers());
          collabHub.broadcastAccessUpdated();
          void updatedAccess;
        }
      }

      return res.status(201).json({
        ok: true,
        createdCount,
        totalDemoRoles: ROLE_ACCESS_ORDER.length,
      });
    })
  );

  app.post(
    '/api/auth/register',
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const clientIp = getClientIp(req);
      const ipKey = `reg:${clientIp}`;
      const limitCheck = authRateLimiter.consume(ipKey, getAuthMaxAttempts(), 15 * 60_000);
      if (!limitCheck.allowed) {
        res.setHeader('Retry-After', String(limitCheck.retryAfterSeconds));
        return res.status(429).json({
          error: 'Terlalu banyak percobaan pendaftaran. Coba lagi beberapa menit lagi.',
          code: 'RATE_LIMITED',
        });
      }

      const body = (req.body || {}) as {
        name?: string;
        email?: string;
        password?: string;
      };
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (!name || name.length < 2) {
        return res.status(400).json({ error: 'Nama lengkap minimal 2 karakter.' });
      }
      if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Format email tidak valid.' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Kata sandi minimal 6 karakter.' });
      }

      const regResult = await registerUserAtomically({ name, email, password });

      if (!regResult.ok) {
        return res
          .status(409)
          .json({ error: 'Email tersebut sudah terdaftar. Silakan masuk.' });
      }

      const newUser = regResult.user;

      const { rawToken, expiresAt } = await createSession({
        userId: newUser.id,
        userAgent: String(req.headers['user-agent'] || ''),
        ipAddress: clientIp === 'unknown' ? '' : clientIp,
      });
      setSessionCookie(req, res, rawToken, expiresAt);
      const csrfToken = ensureCsrfCookie(req, res);

      return res.status(201).json({
        ok: true,
        user: toPublicAuthUser(newUser),
        csrfToken,
        ...(isProductionMode() ? {} : { sessionToken: rawToken }),
      });
    })
  );

  app.post(
    '/api/auth/login',
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const body = (req.body || {}) as { email?: string; username?: string; password?: string };
      const rawIdentifier = String(body.email || body.username || '').trim().toLowerCase();
      const mappedDemoEmail =
        rawIdentifier && !rawIdentifier.includes('@') && !isProductionMode()
          ? resolveDemoEmailByAlias(rawIdentifier)
          : null;
      const email = mappedDemoEmail || rawIdentifier;
      const password = String(body.password || '');
      const clientIp = getClientIp(req);

      const maxAttempts = getAuthMaxAttempts();
      const ipLimit = authRateLimiter.consume(`login_ip:${clientIp}`, maxAttempts * 2, 5 * 60_000);
      const emailLimit = email
        ? authRateLimiter.consume(`login_acct:${clientIp}:${email}`, maxAttempts, 5 * 60_000)
        : { allowed: true, retryAfterSeconds: 0, remaining: maxAttempts };

      if (!ipLimit.allowed || !emailLimit.allowed) {
        const retryAfter = Math.max(ipLimit.retryAfterSeconds, emailLimit.retryAfterSeconds);
        res.setHeader('Retry-After', String(retryAfter));
        return res.status(429).json({
          error: `Terlalu banyak percobaan login gagal. Coba lagi dalam ${retryAfter} detik.`,
          code: 'RATE_LIMITED',
        });
      }

      if (!email || !password) {
        return res.status(400).json({ error: 'Email dan kata sandi wajib diisi.' });
      }

      if ((await countUsers()) === 0) {
        return res.status(401).json({
          error:
            'Belum ada akun terdaftar di server ini. Silakan buka tab "Buat Super Admin" untuk membuat akun pemilik pertama.',
          code: 'SETUP_REQUIRED',
        });
      }

      const user = await getUserByEmail(email);
      // Generic message avoids user enumeration
      if (!user || !verifyPassword(password, user.passwordHash)) {
        return res.status(401).json({ error: 'Email atau kata sandi salah.' });
      }

      if (!user.isActive) {
        return res.status(403).json({
          error: 'Akun Anda sedang dinonaktifkan oleh Super Admin.',
          code: 'ACCOUNT_DISABLED',
        });
      }

      if (email) {
        authRateLimiter.resetKey(`login_acct:${clientIp}:${email}`);
      }
      await updateUserLoginTime(user.id);
      const { rawToken, expiresAt } = await createSession({
        userId: user.id,
        userAgent: String(req.headers['user-agent'] || ''),
        ipAddress: clientIp === 'unknown' ? '' : clientIp,
      });
      setSessionCookie(req, res, rawToken, expiresAt);
      const csrfToken = ensureCsrfCookie(req, res);

      return res.json({
        ok: true,
        user: toPublicAuthUser(user),
        csrfToken,
        ...(isProductionMode() ? {} : { sessionToken: rawToken }),
      });
    })
  );

  app.post(
    '/api/auth/logout',
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      if (req.authToken) {
        await deleteSessionByToken(req.authToken);
      }
      clearSessionCookie(req, res);
      return res.json({ ok: true });
    })
  );

  app.post(
    '/api/auth/admin-create-member',
    requireAuthenticatedAccess('access_control'),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const limitCheck = authRateLimiter.consume(
        `admin_create:${req.authUser!.id}`,
        Math.max(20, getAuthMaxAttempts() * 2),
        5 * 60_000
      );
      if (!limitCheck.allowed) {
        res.setHeader('Retry-After', String(limitCheck.retryAfterSeconds));
        return res.status(429).json({
          error: 'Terlalu banyak permintaan pembuatan akun. Coba lagi sebentar.',
          code: 'RATE_LIMITED',
        });
      }

      const body = (req.body || {}) as {
        name?: string;
        email?: string;
        password?: string;
        role?: AccessRole;
        unitScope?: 'all' | string[];
      };
      const name = String(body.name || '').trim();
      const email = String(body.email || '').trim().toLowerCase();
      const password = String(body.password || '');

      if (!name || !email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        return res.status(400).json({ error: 'Nama dan email valid wajib diisi.' });
      }
      if (!password || password.length < 6) {
        return res.status(400).json({ error: 'Kata sandi awal minimal 6 karakter.' });
      }

      const existing = await getUserByEmail(email);
      if (existing) {
        return res.status(409).json({ error: `Akun "${email}" sudah terdaftar.` });
      }

      const requestedRole: AccessRole =
        body.role === 'super_admin' ||
        body.role === 'admin' ||
        body.role === 'editor' ||
        body.role === 'viewer'
          ? body.role
          : 'viewer';

      if (requestedRole === 'super_admin' && req.authUser?.role !== 'super_admin') {
        return res.status(403).json({
          error: 'Hanya Super Admin yang dapat membuat akun Super Admin lain.',
          code: 'FORBIDDEN',
        });
      }

      const unitScope: 'all' | string[] =
        requestedRole === 'super_admin'
          ? 'all'
          : body.unitScope === 'all'
          ? 'all'
          : Array.isArray(body.unitScope)
          ? body.unitScope.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
          : requestedRole === 'admin' || requestedRole === 'editor'
          ? 'all'
          : [];

      const now = Date.now();
      const created: StoredUserRecord = {
        id: `usr_${crypto.randomBytes(6).toString('hex')}`,
        name: name.slice(0, 80),
        email: email.slice(0, 120),
        passwordHash: hashPassword(password),
        role: requestedRole,
        isActive: true,
        unitScope,
        permissions:
          requestedRole === 'super_admin'
            ? { ...FULL_PERMISSIONS }
            : getPresetPermissionsForRole(requestedRole),
        createdAt: now,
        updatedAt: now,
      };
      await upsertUser(created);

      const access = await getAccessSettings();
      const nextSettings = await saveAccessSettings({
        ...access,
        allUsersSuperAdmin: false,
        autoGrantSuperAdminOnJoin: false,
        members: [
          ...access.members.filter((m) => m.email.toLowerCase() !== email),
          {
            id: created.id,
            name: created.name,
            email: created.email,
            role: created.role,
            isActive: created.isActive,
            unitScope: created.unitScope,
            permissions: created.permissions,
            createdAt: created.createdAt,
          },
        ],
      });

      collabHub.updateConnectedUsers(await listUsers());
      collabHub.broadcastAccessUpdated(created.id);

      return res.status(201).json({
        ok: true,
        user: toPublicAuthUser(created),
        settings: nextSettings,
      });
    })
  );

  // ============================================================
  // Media Asset Endpoints (F-15)
  // ============================================================
  app.post(
    '/api/media/upload',
    requireAuthenticatedAccess('editor'),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const body = (req.body || {}) as { dataUrl?: string; preferredId?: string };
      if (!body.dataUrl || typeof body.dataUrl !== 'string') {
        return res.status(400).json({
          error: 'Payload dataUrl gambar wajib dikirim.',
          code: 'INVALID_MEDIA_PAYLOAD',
        });
      }
      const { meta } = await writeMediaFile({
        dataUrl: body.dataUrl,
        preferredId: body.preferredId,
      });
      await upsertMediaAssetMeta(meta, req.authUser?.id ?? null);
      return res.status(201).json({ ok: true, asset: meta });
    })
  );

  app.get(
    '/api/media/:filename',
    asyncHandler(async (req, res) => {
      const filename = String(req.params.filename || '').trim();
      if (!isSafeMediaFilename(filename)) {
        return res.status(400).json({ error: 'Nama berkas media tidak valid.' });
      }
      const loaded = await readMediaFileSafe(filename);
      if (!loaded) {
        return res.status(404).json({ error: 'Media tidak ditemukan.' });
      }
      res.setHeader('Content-Type', loaded.mimeType);
      res.setHeader('Content-Length', String(loaded.buffer.length));
      res.setHeader('X-Content-Type-Options', 'nosniff');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      res.setHeader('Access-Control-Allow-Origin', '*');
      res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
      return res.status(200).send(loaded.buffer);
    })
  );

  // ============================================================
  // Custom Domain Host Mapping (Public Pages)
  // ============================================================
  app.use(
    asyncHandler(async (req, res, next) => {
      if (
        req.method !== 'GET' ||
        req.path.startsWith('/api/') ||
        req.path.startsWith('/p/') ||
        req.path === '/ws/collab'
      ) {
        return next();
      }
      const reqHost = normalizeHostHeader(req.headers.host);
      if (!reqHost || reqHost === 'localhost' || reqHost === '127.0.0.1' || reqHost.endsWith('.run.app')) {
        return next();
      }
      const cleanPath = req.path.replace(/^\/+|\/+$/g, '');
      const isPreviewRequest = req.query.preview === '1';

      if (!isPreviewRequest) {
        const cached = publicPageCache.getByDomainPath(reqHost, cleanPath);
        if (cached) {
          res.setHeader('Content-Security-Policy', PUBLIC_PAGE_CSP);
          res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
          res.setHeader('ETag', cached.etag);
          res.setHeader('X-Cache', 'HIT');
          if (matchesIfNoneMatch(req.headers['if-none-match'], cached.etag)) {
            return res.status(304).end();
          }
          return res
            .status(200)
            .setHeader('Content-Type', 'text/html; charset=utf-8')
            .send(cached.html);
        }
      }

      const matched = await getProjectEntryByDomain(reqHost);
      if (!matched) return next();
      const slug = normalizeServerSlug(
        matched.record.project.publishing?.slug ||
          matched.record.project.title ||
          matched.record.id,
        'unit-usaha'
      );
      const isBrowserPath = cleanPath === '' || cleanPath === slug;
      const isFullscreenPath = cleanPath === 'full' || cleanPath === `${slug}/full`;
      if (isBrowserPath || isFullscreenPath) {
        const publicOrigin = resolveRequestPublicOrigin(req) || `https://${reqHost}`;
        const baseCanonicalPath =
          cleanPath === slug || cleanPath === `${slug}/full` ? slug : '';
        const canonicalUrl = baseCanonicalPath
          ? `${publicOrigin}/${baseCanonicalPath}`
          : publicOrigin;
        const freshHtml = generateProjectHtml(
          sanitizeBuilderProject(matched.record.project),
          { projectId: matched.record.id, publicOrigin, canonicalUrl }
        );
        const stored = publicPageCache.setByDomainPath(reqHost, cleanPath, {
          projectId: matched.record.id,
          slug,
          revision: matched.record.revision ?? 1,
          html: freshHtml,
        });
        res.setHeader('Content-Security-Policy', PUBLIC_PAGE_CSP);
        res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
        res.setHeader('ETag', stored.etag);
        res.setHeader('X-Cache', 'MISS');
        if (matchesIfNoneMatch(req.headers['if-none-match'], stored.etag)) {
          return res.status(304).end();
        }
        return res
          .status(200)
          .setHeader('Content-Type', 'text/html; charset=utf-8')
          .send(freshHtml);
      }
      return next();
    })
  );

  // ============================================================
  // Projects CRUD (with OCC Revision Control + Server HTML Sanitization)
  // ============================================================
  app.get(
    '/api/projects',
    requireAuthenticatedAccess(),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const entries = await listProjectEntries();
      const filtered = entries
        .filter((entry) => canUserAccessExistingProject(req.authUser, entry))
        .map((entry) => ({
          ...entry.record,
          revision: entry.record.revision ?? 1,
        }));

      return res.json({ projects: filtered });
    })
  );

  app.post(
    '/api/projects/:id/save',
    requireAuthenticatedAccess('editor'),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const projectId = String(req.params.id || '').trim();
      const body = req.body as {
        record?: ProjectRecord;
        renderedHtml?: string;
        baseRevision?: number;
      };
      if (!projectId || !body?.record?.project) {
        return res.status(400).json({ error: 'Payload proyek tidak valid' });
      }
      if (typeof body.record.id !== 'string' || body.record.id !== projectId) {
        return res.status(400).json({
          error: 'ID proyek pada body tidak cocok dengan parameter URL.',
          code: 'PROJECT_ID_MISMATCH',
        });
      }

      const [existingEntry, entries, api] = await Promise.all([
        getProjectEntryById(projectId),
        listProjectEntries(),
        getApiSettings(),
      ]);

      const actor = req.authUser!;
      let resolvedOwnerUserId: string;

      if (existingEntry) {
        if (!canUserAccessExistingProject(actor, existingEntry)) {
          return res.status(403).json({
            error: 'Anda tidak memiliki akses ke unit usaha ini.',
            code: 'PROJECT_SCOPE_FORBIDDEN',
          });
        }
        resolvedOwnerUserId = existingEntry.ownerUserId || actor.id;
      } else {
        const canCreateProject =
          actor.role === 'super_admin' || Boolean(actor.permissions?.projects);
        if (!canCreateProject) {
          return res.status(403).json({
            error: 'Akun Anda tidak memiliki izin membuat unit usaha baru.',
            code: 'FORBIDDEN',
          });
        }
        resolvedOwnerUserId = actor.id;
      }

      const sanitizedInputProject = sanitizeBuilderProject(body.record.project);
      const requestedSlug = normalizeServerSlug(
        sanitizedInputProject.publishing?.slug || sanitizedInputProject.title || projectId,
        'unit-usaha'
      );

      const conflict = entries.find(
        (entry) =>
          entry.record.id !== projectId &&
          normalizeServerSlug(
            entry.record.project.publishing?.slug ||
              entry.record.project.title ||
              entry.record.id,
            'unit-usaha'
          ) === requestedSlug
      );
      if (conflict) {
        return res.status(409).json({
          error: `Slug "/p/${requestedSlug}" sudah dipakai oleh unit usaha "${conflict.record.project.title}". Gunakan slug lain.`,
          code: 'SLUG_CONFLICT',
        });
      }

      const savedAt = Date.now();
      const autoPub = api.autoPublishOnSave;
      const wasPublished = Boolean(sanitizedInputProject.publishing?.isPublished);
      const isPublishedNow = wasPublished || autoPub;

      const updatedRecord: ProjectRecord = {
        id: projectId,
        revision: existingEntry?.record.revision ?? 1,
        updatedAt: savedAt,
        lastSavedAt: savedAt,
        project: {
          ...sanitizedInputProject,
          publishing: {
            slug: requestedSlug,
            customDomain: normalizeHostHeader(sanitizedInputProject.publishing?.customDomain),
            useCustomDomain: Boolean(sanitizedInputProject.publishing?.useCustomDomain),
            isPublished: isPublishedNow,
            publishedAt:
              sanitizedInputProject.publishing?.publishedAt ||
              (isPublishedNow ? savedAt : undefined),
            seoTitle: sanitizedInputProject.publishing?.seoTitle,
            seoDescription: sanitizedInputProject.publishing?.seoDescription,
            seoImage: sanitizedInputProject.publishing?.seoImage,
            seoImageAlt: sanitizedInputProject.publishing?.seoImageAlt,
            seoSiteName: sanitizedInputProject.publishing?.seoSiteName,
            seoShareText: sanitizedInputProject.publishing?.seoShareText,
          },
        },
      };

      // Server generates authoritative HTML from sanitized project payload (F-22)
      const authoritativeHtml = generateProjectHtml(updatedRecord.project, {
        projectId,
        publicOrigin: resolveRequestPublicOrigin(req),
      });

      const expectedRevision =
        typeof body.baseRevision === 'number'
          ? body.baseRevision
          : typeof body.record.revision === 'number'
          ? body.record.revision
          : existingEntry
          ? existingEntry.record.revision ?? 1
          : undefined;

      const savedEntry = await upsertProjectEntry(
        {
          record: updatedRecord,
          renderedHtml: authoritativeHtml,
          savedAt,
          ownerUserId: resolvedOwnerUserId,
        },
        { expectedRevision }
      );

      publicPageCache.invalidateProject(projectId, [
        existingEntry?.record.project.publishing?.slug,
        requestedSlug,
      ]);

      if (!existingEntry && Array.isArray(actor.unitScope)) {
        await appendProjectToUserScope(actor.id, projectId);
      }

      void dispatchWebhookEvent('project_save', {
        projectId,
        title: updatedRecord.project.title,
        slug: requestedSlug,
        isPublished: isPublishedNow,
        revision: savedEntry.record.revision,
        savedAt,
      });

      collabHub.broadcastProjectUpdated(
        savedEntry.record,
        { id: actor.id, name: actor.name, email: actor.email },
        'saved'
      );

      return res.json({
        ok: true,
        savedAt,
        slug: requestedSlug,
        isPublished: isPublishedNow,
        revision: savedEntry.record.revision ?? 1,
      });
    })
  );

  app.post(
    '/api/projects/:id/publish',
    requireAuthenticatedAccess('publishing'),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const projectId = String(req.params.id || '').trim();
      const body = req.body as {
        record?: ProjectRecord;
        renderedHtml?: string;
        baseRevision?: number;
      };
      if (!projectId || !body?.record?.project) {
        return res.status(400).json({ error: 'Payload publikasi tidak valid' });
      }
      if (typeof body.record.id !== 'string' || body.record.id !== projectId) {
        return res.status(400).json({
          error: 'ID proyek pada body tidak cocok dengan parameter URL.',
          code: 'PROJECT_ID_MISMATCH',
        });
      }

      const [existingEntry, entries] = await Promise.all([
        getProjectEntryById(projectId),
        listProjectEntries(),
      ]);

      const actor = req.authUser!;
      let resolvedOwnerUserId: string;

      if (existingEntry) {
        if (!canUserAccessExistingProject(actor, existingEntry)) {
          return res.status(403).json({
            error: 'Anda tidak memiliki akses ke unit usaha ini.',
            code: 'PROJECT_SCOPE_FORBIDDEN',
          });
        }
        resolvedOwnerUserId = existingEntry.ownerUserId || actor.id;
      } else {
        const canCreateProject =
          actor.role === 'super_admin' || Boolean(actor.permissions?.projects);
        if (!canCreateProject) {
          return res.status(403).json({
            error: 'Akun Anda tidak memiliki izin membuat unit usaha baru.',
            code: 'FORBIDDEN',
          });
        }
        resolvedOwnerUserId = actor.id;
      }

      const sanitizedInputProject = sanitizeBuilderProject(body.record.project);
      const requestedSlug = normalizeServerSlug(
        sanitizedInputProject.publishing?.slug || sanitizedInputProject.title || projectId,
        'unit-usaha'
      );

      const conflict = entries.find(
        (entry) =>
          entry.record.id !== projectId &&
          normalizeServerSlug(
            entry.record.project.publishing?.slug ||
              entry.record.project.title ||
              entry.record.id,
            'unit-usaha'
          ) === requestedSlug
      );
      if (conflict) {
        return res.status(409).json({
          error: `Slug "/p/${requestedSlug}" sudah dipakai oleh unit usaha "${conflict.record.project.title}". Pilih slug unik terlebih dahulu.`,
          code: 'SLUG_CONFLICT',
        });
      }

      const now = Date.now();
      const updatedRecord: ProjectRecord = {
        id: projectId,
        revision: existingEntry?.record.revision ?? 1,
        updatedAt: now,
        lastSavedAt: now,
        project: {
          ...sanitizedInputProject,
          publishing: {
            slug: requestedSlug,
            customDomain: normalizeHostHeader(sanitizedInputProject.publishing?.customDomain),
            useCustomDomain: Boolean(sanitizedInputProject.publishing?.useCustomDomain),
            isPublished: true,
            publishedAt: now,
            seoTitle: sanitizedInputProject.publishing?.seoTitle,
            seoDescription: sanitizedInputProject.publishing?.seoDescription,
            seoImage: sanitizedInputProject.publishing?.seoImage,
            seoImageAlt: sanitizedInputProject.publishing?.seoImageAlt,
            seoSiteName: sanitizedInputProject.publishing?.seoSiteName,
            seoShareText: sanitizedInputProject.publishing?.seoShareText,
          },
        },
      };

      const authoritativeHtml = generateProjectHtml(updatedRecord.project, {
        projectId,
        publicOrigin: resolveRequestPublicOrigin(req),
      });
      const expectedRevision =
        typeof body.baseRevision === 'number'
          ? body.baseRevision
          : typeof body.record.revision === 'number'
          ? body.record.revision
          : existingEntry
          ? existingEntry.record.revision ?? 1
          : undefined;

      const savedEntry = await upsertProjectEntry(
        {
          record: updatedRecord,
          renderedHtml: authoritativeHtml,
          savedAt: now,
          ownerUserId: resolvedOwnerUserId,
        },
        { expectedRevision }
      );

      publicPageCache.invalidateProject(projectId, [
        existingEntry?.record.project.publishing?.slug,
        requestedSlug,
      ]);

      if (!existingEntry && Array.isArray(actor.unitScope)) {
        await appendProjectToUserScope(actor.id, projectId);
      }

      void dispatchWebhookEvent('project_publish', {
        projectId,
        title: updatedRecord.project.title,
        slug: requestedSlug,
        revision: savedEntry.record.revision,
        publishedAt: now,
      });

      collabHub.broadcastProjectUpdated(
        savedEntry.record,
        { id: actor.id, name: actor.name, email: actor.email },
        'published'
      );

      return res.json({
        ok: true,
        savedAt: now,
        slug: requestedSlug,
        isPublished: true,
        revision: savedEntry.record.revision ?? 1,
      });
    })
  );

  app.delete(
    '/api/projects/:id',
    requireAuthenticatedAccess('projects'),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const projectId = String(req.params.id || '').trim();
      const existingEntry = await getProjectEntryById(projectId);
      if (!existingEntry) {
        return res.status(404).json({ error: 'Unit usaha tidak ditemukan.' });
      }
      if (!canUserAccessExistingProject(req.authUser, existingEntry)) {
        return res.status(403).json({
          error: 'Tidak memiliki izin menghapus unit usaha ini.',
          code: 'PROJECT_SCOPE_FORBIDDEN',
        });
      }
      await deleteProjectEntry(projectId);
      publicPageCache.invalidateProject(projectId, [
        existingEntry.record.project.publishing?.slug,
      ]);
      collabHub.broadcastProjectDeleted(projectId, {
        id: req.authUser!.id,
        name: req.authUser!.name,
        email: req.authUser!.email,
      });
      return res.json({ ok: true });
    })
  );

  // ============================================================
  // Analytics & Event Tracking
  // ============================================================
  app.post(
    '/api/track/event',
    asyncHandler(async (req, res) => {
      const api = await getApiSettings();
      const clientIp = getClientIp(req);
      const limitCheck = apiRateLimiter.consume(
        `track:${clientIp}`,
        Math.max(60, api.rateLimitPerMinute * 2),
        60_000
      );
      if (!limitCheck.allowed) {
        res.setHeader('Retry-After', String(limitCheck.retryAfterSeconds));
        return res.status(429).json({ error: 'Terlalu banyak permintaan tracking.' });
      }

      const raw = (req.body || {}) as Partial<AnalyticsEventRecord>;
      if (!raw.projectId || !raw.eventType) {
        return res.status(400).json({ error: 'Data event tidak lengkap' });
      }

      const ua = String(req.headers['user-agent'] || '');
      const inferredDevice: 'mobile' | 'desktop' =
        raw.deviceType === 'mobile' || raw.deviceType === 'desktop'
          ? raw.deviceType
          : /mobile|android|iphone|ipad|ipod/i.test(ua)
          ? 'mobile'
          : 'desktop';

      const eventType: AnalyticsEventRecord['eventType'] =
        raw.eventType === 'wa_click' ||
        raw.eventType === 'form_submit' ||
        raw.eventType === 'form_open'
          ? raw.eventType
          : 'page_view';

      const event: AnalyticsEventRecord = {
        id: raw.id || `evt_${crypto.randomBytes(6).toString('hex')}`,
        projectId: String(raw.projectId).slice(0, 80),
        projectTitle: String(raw.projectTitle || 'Unit Usaha').slice(0, 120),
        slug: String(raw.slug || '').slice(0, 100),
        eventType,
        channel: raw.channel || 'organic',
        sourceLabel: String(raw.sourceLabel || 'Organik').slice(0, 60),
        ctaLabel: raw.ctaLabel ? String(raw.ctaLabel).slice(0, 80) : undefined,
        waPhone: raw.waPhone ? String(raw.waPhone).slice(0, 24) : undefined,
        orderValue:
          typeof raw.orderValue === 'number' && Number.isFinite(raw.orderValue)
            ? Math.max(0, Math.round(raw.orderValue))
            : undefined,
        componentId: raw.componentId ? String(raw.componentId).slice(0, 80) : undefined,
        componentType: raw.componentType ? String(raw.componentType).slice(0, 40) : undefined,
        buttonLabel: raw.buttonLabel ? String(raw.buttonLabel).slice(0, 80) : undefined,
        waLinkId: raw.waLinkId ? String(raw.waLinkId).slice(0, 80) : undefined,
        waTemplateId: raw.waTemplateId ? String(raw.waTemplateId).slice(0, 80) : undefined,
        productId: raw.productId ? String(raw.productId).slice(0, 80) : undefined,
        productName: raw.productName ? String(raw.productName).slice(0, 120) : undefined,
        dedupeKey: raw.dedupeKey ? String(raw.dedupeKey).slice(0, 120) : undefined,
        utmSource: raw.utmSource ? String(raw.utmSource).slice(0, 60) : undefined,
        utmMedium: raw.utmMedium ? String(raw.utmMedium).slice(0, 60) : undefined,
        utmCampaign: raw.utmCampaign ? String(raw.utmCampaign).slice(0, 80) : undefined,
        utmContent: raw.utmContent ? String(raw.utmContent).slice(0, 80) : undefined,
        clickIdType: raw.clickIdType,
        deviceType: inferredDevice,
        isTest: Boolean(raw.isTest),
        createdAt: typeof raw.createdAt === 'number' ? raw.createdAt : Date.now(),
      };

      const inserted = await insertAnalyticsEvent(event);
      if (!inserted) {
        return res.json({ ok: true, id: event.id, deduplicated: true });
      }

      const projEntry = await getProjectEntryById(event.projectId);
      const ads = projEntry?.record.project.adsConfig;
      if (!event.isTest && ads?.metaCapiForwarding && ads.metaPixelId) {
        void forwardToMetaCapi(
          ads.metaPixelId,
          event,
          ads.metaWaEvent || 'Lead',
          api.metaApiVersion,
          ads.metaTestEventCode,
          clientIp === 'unknown' ? undefined : clientIp,
          ua
        );
      }

      if (
        !event.isTest &&
        (event.eventType === 'wa_click' || event.eventType === 'form_submit')
      ) {
        void dispatchWebhookEvent(event.eventType, {
          eventId: event.id,
          projectId: event.projectId,
          projectTitle: event.projectTitle,
          slug: event.slug,
          channel: event.channel,
          ctaLabel: event.ctaLabel,
          waPhone: event.waPhone,
          orderValue: event.orderValue,
          componentId: event.componentId,
          waLinkId: event.waLinkId,
          waTemplateId: event.waTemplateId,
          productName: event.productName,
          deviceType: event.deviceType,
          createdAt: event.createdAt,
        });
      }

      return res.json({ ok: true, id: event.id });
    })
  );

  // ============================================================
  // Dynamic Form Submissions (Section H — Server-side Validation)
  // ============================================================
  app.post(
    '/api/form-submissions',
    asyncHandler(async (req, res) => {
      const api = await getApiSettings();
      const clientIp = getClientIp(req);
      const limitCheck = apiRateLimiter.consume(
        `form:${clientIp}`,
        Math.max(30, api.rateLimitPerMinute),
        60_000
      );
      if (!limitCheck.allowed) {
        res.setHeader('Retry-After', String(limitCheck.retryAfterSeconds));
        return res.status(429).json({ error: 'Terlalu banyak pengiriman formulir. Coba lagi sebentar.' });
      }

      const body = (req.body || {}) as {
        projectId?: string;
        projectTitle?: string;
        slug?: string;
        componentId?: string;
        formTitle?: string;
        formCategory?: string;
        fields?: CatalogCustomerField[];
        values?: Record<string, string | string[] | boolean>;
        checklist?: {
          enabled?: boolean;
          title?: string;
          items?: string[];
          checkedItems?: string[];
          rule?: any;
          legacyRequired?: boolean;
          minChoices?: number;
        };
        sourceChannel?: AnalyticsEventRecord['channel'];
        isTest?: boolean;
      };

      if (!body.projectId || !body.componentId || !body.values || typeof body.values !== 'object') {
        return res.status(400).json({ error: 'Data pengiriman formulir tidak lengkap.' });
      }

      // Resolve authoritative form schema from saved project when available
      const projEntry = await getProjectEntryById(String(body.projectId));
      let fieldsToValidate: CatalogCustomerField[] = Array.isArray(body.fields) ? body.fields : [];
      let checklistConfig = body.checklist;
      let resolvedFormTitle = String(body.formTitle || 'Formulir').slice(0, 120);

      if (projEntry) {
        const allTrees = [
          projEntry.record.project.blocks,
          ...(projEntry.record.project.pages || []).map((p) => p.blocks),
        ];
        for (const tree of allTrees) {
          const blk = findBlockById(tree, String(body.componentId));
          if (blk && blk.type === 'form') {
            if (Array.isArray(blk.content.formFields) && blk.content.formFields.length > 0) {
              fieldsToValidate = blk.content.formFields;
            }
            if (blk.content.formTitle) {
              resolvedFormTitle = blk.content.formTitle.slice(0, 120);
            }
            if (blk.content.formChecklistEnabled) {
              checklistConfig = {
                enabled: true,
                title: blk.content.formChecklistTitle,
                items: blk.content.formChecklistItems,
                checkedItems: body.checklist?.checkedItems || [],
                rule: blk.content.formChecklistRule,
                legacyRequired: blk.content.formChecklistRequired,
                minChoices: blk.content.formChecklistMinChoices,
              };
            }
            break;
          }
        }
      }

      if (fieldsToValidate.length > 0 || checklistConfig?.enabled) {
        const validation = validateDynamicFormSubmission({
          fields: fieldsToValidate,
          values: body.values,
          checklist: checklistConfig,
        });
        if (!validation.valid) {
          return res.status(422).json({
            ok: false,
            error: validation.firstError || 'Isian formulir belum lengkap atau tidak valid.',
            fieldErrors: validation.errors,
          });
        }
      }

      const cleanValues: Record<string, string | string[] | boolean> = {};
      for (const [k, v] of Object.entries(body.values).slice(0, 60)) {
        const cleanKey = String(k).slice(0, 80);
        if (Array.isArray(v)) {
          cleanValues[cleanKey] = v.map((x) => String(x).slice(0, 200)).slice(0, 40);
        } else if (typeof v === 'boolean') {
          cleanValues[cleanKey] = v;
        } else {
          cleanValues[cleanKey] = String(v ?? '').slice(0, 2000);
        }
      }

      const submission: FormSubmissionRecord = {
        id: `sub_${crypto.randomBytes(6).toString('hex')}`,
        projectId: String(body.projectId).slice(0, 80),
        projectTitle: String(body.projectTitle || projEntry?.record.project.title || 'Unit Usaha').slice(0, 120),
        slug: String(body.slug || projEntry?.record.project.publishing?.slug || '').slice(0, 100),
        componentId: String(body.componentId).slice(0, 80),
        formTitle: resolvedFormTitle,
        formCategory: body.formCategory ? String(body.formCategory).slice(0, 40) : undefined,
        values: cleanValues,
        sourceChannel: body.sourceChannel || 'organic',
        isTest: Boolean(body.isTest),
        createdAt: Date.now(),
      };

      await insertFormSubmission(submission);

      const ua = String(req.headers['user-agent'] || '');
      const deviceType: 'mobile' | 'desktop' = /mobile|android|iphone|ipad|ipod/i.test(ua)
        ? 'mobile'
        : 'desktop';

      await insertAnalyticsEvent({
        id: `evt_fs_${submission.id}`,
        projectId: submission.projectId,
        projectTitle: submission.projectTitle,
        slug: submission.slug,
        eventType: 'form_submit',
        channel: submission.sourceChannel || 'organic',
        sourceLabel: submission.sourceChannel || 'Organik',
        ctaLabel: submission.formTitle,
        componentId: submission.componentId,
        componentType: 'form',
        buttonLabel: submission.formTitle,
        deviceType,
        isTest: submission.isTest,
        createdAt: submission.createdAt,
      });

      if (!submission.isTest) {
        void dispatchWebhookEvent('form_submit', {
          submissionId: submission.id,
          projectId: submission.projectId,
          formTitle: submission.formTitle,
          values: submission.values,
          createdAt: submission.createdAt,
        });
      }

      return res.status(201).json({ ok: true, submission });
    })
  );

  app.get(
    '/api/form-submissions',
    requireAuthenticatedAccess('analytics'),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const projectId =
        typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
      if (projectId && !canUserAccessProjectId(req.authUser, projectId)) {
        return res.status(403).json({ error: 'Akses data formulir proyek di luar izin Anda.' });
      }
      const submissions = await listFormSubmissions(projectId);
      const scoped = projectId
        ? submissions
        : submissions.filter((s) => canUserAccessProjectId(req.authUser, s.projectId));
      return res.json({ submissions: scoped });
    })
  );

  app.get(
    '/api/analytics',
    requireAuthenticatedAccess('analytics'),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const projectId =
        typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
      if (projectId && !canUserAccessProjectId(req.authUser, projectId)) {
        return res.status(403).json({ error: 'Akses analitik proyek di luar izin Anda.' });
      }
      const events = await listAnalyticsEvents(projectId);
      const scopedEvents = projectId
        ? events
        : events.filter((ev) => canUserAccessProjectId(req.authUser, ev.projectId));
      return res.json({
        events: scopedEvents,
        capiConfiguredOnServer: Boolean(getMetaCapiToken()),
      });
    })
  );

  app.delete(
    '/api/analytics',
    requireAuthenticatedAccess('analytics'),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const projectId =
        typeof req.query.projectId === 'string' ? req.query.projectId : undefined;
      if (projectId) {
        if (!canUserAccessProjectId(req.authUser, projectId)) {
          return res
            .status(403)
            .json({ error: 'Akses hapus analitik proyek di luar izin Anda.' });
        }
      } else if (req.authUser?.role !== 'super_admin' && req.authUser?.unitScope !== 'all') {
        return res.status(403).json({
          error: 'Hanya akun dengan akses penuh yang dapat menghapus seluruh log analitik.',
        });
      }
      await clearAnalyticsEvents(projectId);
      return res.json({ ok: true });
    })
  );

  // ============================================================
  // Access Control Settings
  // ============================================================
  app.get(
    '/api/access-settings',
    requireAuthenticatedAccess('access_control'),
    asyncHandler(async (_req, res) => {
      const settings = await getAccessSettings();
      return res.json({ settings });
    })
  );

  app.put(
    '/api/access-settings',
    requireAuthenticatedAccess('access_control'),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const raw = (req.body as { settings?: AccessSettingsConfig } | undefined)?.settings;
      if (!raw || typeof raw !== 'object' || !Array.isArray(raw.members)) {
        return res.status(400).json({ error: 'Payload access settings tidak valid.' });
      }

      const actor = req.authUser!;
      const existingUsers = await listUsers();

      // Anti-self-elevation & Super Admin protection
      if (actor.role !== 'super_admin') {
        const selfUpdate = raw.members.find(
          (m) => m.id === actor.id || m.email?.toLowerCase() === actor.email.toLowerCase()
        );
        if (selfUpdate) {
          const permKeys: FeaturePermissionKey[] = [
            'editor',
            'projects',
            'publishing',
            'ads_wa',
            'analytics',
            'export_backup',
            'access_control',
          ];
          const permsUnchanged = permKeys.every(
            (k) => Boolean(selfUpdate.permissions?.[k]) === Boolean(actor.permissions?.[k])
          );
          const scopeEqual = (() => {
            if (selfUpdate.unitScope === 'all' || actor.unitScope === 'all') {
              return selfUpdate.unitScope === actor.unitScope;
            }
            const nextArr = Array.isArray(selfUpdate.unitScope)
              ? [...selfUpdate.unitScope].sort()
              : [];
            const curArr = Array.isArray(actor.unitScope)
              ? [...actor.unitScope].sort()
              : [];
            return (
              nextArr.length === curArr.length && nextArr.every((v, i) => v === curArr[i])
            );
          })();
          if (selfUpdate.role !== actor.role || !permsUnchanged || !scopeEqual) {
            return res.status(403).json({
              error: 'Pengguna tidak dapat mengubah atau menaikkan peran/izin dirinya sendiri.',
              code: 'SELF_ELEVATION_FORBIDDEN',
            });
          }
        }
        const touchesSuperAdmin = raw.members.some((m) => {
          if (m.role === 'super_admin') return true;
          const prev = existingUsers.find(
            (u) =>
              u.id === m.id || u.email.toLowerCase() === String(m.email || '').toLowerCase()
          );
          return prev?.role === 'super_admin';
        });
        const deletedSuperAdmin = existingUsers.some(
          (u) =>
            u.role === 'super_admin' &&
            !raw.members.some(
              (m) =>
                m.id === u.id ||
                String(m.email || '').toLowerCase() === u.email.toLowerCase()
            )
        );
        if (touchesSuperAdmin || deletedSuperAdmin) {
          return res.status(403).json({
            error: 'Hanya Super Admin yang dapat mengelola akun atau peran Super Admin.',
            code: 'FORBIDDEN',
          });
        }
      }

      // Ensure at least one active Super Admin remains if users exist
      if (existingUsers.length > 0) {
        const hasActiveSuper = raw.members.some(
          (m) => m.role === 'super_admin' && m.isActive !== false
        );
        if (!hasActiveSuper) {
          return res.status(400).json({
            error: 'Minimal harus ada satu akun Super Admin aktif di sistem.',
          });
        }
      }

      const nextSettings = await saveAccessSettings(raw);
      collabHub.updateConnectedUsers(await listUsers());
      collabHub.broadcastAccessUpdated();
      return res.json({ ok: true, settings: nextSettings });
    })
  );

  // ============================================================
  // Setting API Hub & Complete Backup/Restore (F-13, F-14)
  // ============================================================
  app.get(
    '/api/settings/api',
    requireAuthenticatedAccess('access_control'),
    asyncHandler(async (_req, res) => {
      const [settings, diagnostics, logs] = await Promise.all([
        getApiSettings(),
        getDbDiagnostics(),
        listWebhookLogs(),
      ]);
      return res.json({ settings, diagnostics, logs });
    })
  );

  app.put(
    '/api/settings/api',
    requireAuthenticatedAccess('access_control'),
    asyncHandler(async (req, res) => {
      const body = (req.body as { settings?: Record<string, unknown> } | undefined)?.settings;
      if (!body || typeof body !== 'object') {
        return res.status(400).json({ error: 'Payload API settings tidak valid.' });
      }
      if (typeof body.webhookUrl === 'string' && body.webhookUrl.trim()) {
        try {
          await assertSafeExternalUrl(body.webhookUrl.trim());
        } catch (err) {
          throw new AppError(
            400,
            'SSRF_BLOCKED',
            err instanceof Error ? err.message : 'URL webhook diblokir kebijakan SSRF.'
          );
        }
      }
      const updated = await saveApiSettings(body);
      return res.json({ ok: true, settings: updated });
    })
  );

  // ============================================================
  // UI Appearance Labels ("Tampilan")
  // ============================================================
  app.get(
    '/api/settings/appearance',
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const api = await getApiSettings();
      if (api.requireAuthForBuilder && !req.authUser) {
        return res.status(401).json({
          error: 'Sesi login diperlukan untuk mengakses tampilan aplikasi.',
          code: 'AUTH_REQUIRED',
        });
      }
      if (req.authUser && !req.authUser.isActive) {
        return res.status(403).json({
          error: 'Akun Anda berstatus nonaktif. Hubungi Super Admin.',
          code: 'ACCOUNT_DISABLED',
        });
      }
      const settings = await getUiAppearanceSettings();
      return res.json({ settings });
    })
  );

  app.put(
    '/api/settings/appearance',
    requireAuthenticatedAccess('access_control'),
    asyncHandler(async (req, res) => {
      const body = (req.body || {}) as {
        labels?: unknown;
        patch?: unknown;
        hiddenKeys?: unknown;
        hiddenPatch?: unknown;
        resetAll?: unknown;
      };
      const isResetAll = body.resetAll === true;
      const hasLabels =
        Boolean(body.labels) && typeof body.labels === 'object' && !Array.isArray(body.labels);
      const hasPatch =
        Boolean(body.patch) && typeof body.patch === 'object' && !Array.isArray(body.patch);
      const hasHiddenKeys =
        Boolean(body.hiddenKeys) &&
        typeof body.hiddenKeys === 'object' &&
        !Array.isArray(body.hiddenKeys);
      const hasHiddenPatch =
        Boolean(body.hiddenPatch) &&
        typeof body.hiddenPatch === 'object' &&
        !Array.isArray(body.hiddenPatch);

      if (!isResetAll && !hasLabels && !hasPatch && !hasHiddenKeys && !hasHiddenPatch) {
        return res.status(400).json({ error: 'Payload pengaturan tampilan tidak valid.' });
      }

      const saved = await saveUiAppearanceSettings({
        resetAll: isResetAll,
        labels: hasLabels ? (body.labels as Record<string, string>) : undefined,
        patch: hasPatch ? (body.patch as Record<string, string>) : undefined,
        hiddenKeys: hasHiddenKeys ? (body.hiddenKeys as Record<string, boolean>) : undefined,
        hiddenPatch: hasHiddenPatch ? (body.hiddenPatch as Record<string, boolean>) : undefined,
      });
      collabHub.broadcastAppearanceUpdated(saved);
      return res.json({ ok: true, settings: saved });
    })
  );

  app.post(
    '/api/settings/api/test-webhook',
    requireAuthenticatedAccess('access_control'),
    asyncHandler(async (req, res) => {
      const body = (req.body || {}) as { webhookUrl?: string };
      const api = await getApiSettings();
      const target = (body.webhookUrl ?? api.webhookUrl).trim();
      if (!target) {
        return res.status(400).json({ error: 'Masukkan URL Webhook terlebih dahulu.' });
      }
      const log = await dispatchWebhookEvent(
        'webhook_test',
        {
          message: 'Uji koneksi Webhook dari Lynk Builder',
          triggeredAt: Date.now(),
        },
        target
      );
      if (log && !log.success && log.errorMessage?.toLowerCase().includes('ssrf')) {
        return res.status(400).json({ ok: false, error: log.errorMessage, log });
      }
      return res.json({ ok: Boolean(log?.success), log });
    })
  );

  app.get(
    '/api/settings/api/webhook-logs',
    requireAuthenticatedAccess('access_control'),
    asyncHandler(async (_req, res) => {
      const logs = await listWebhookLogs();
      return res.json({ logs });
    })
  );

  app.delete(
    '/api/settings/api/webhook-logs',
    requireAuthenticatedAccess('access_control'),
    asyncHandler(async (_req, res) => {
      await clearWebhookLogs();
      return res.json({ ok: true });
    })
  );

  app.post(
    '/api/settings/api/reconnect-db',
    requireAuthenticatedAccess('access_control'),
    asyncHandler(async (_req, res) => {
      await resetDbConnectionCheck();
      const diagnostics = await getDbDiagnostics();
      return res.json({ ok: diagnostics.connected, diagnostics });
    })
  );

  app.get(
    '/api/settings/api/schema-sql',
    requireAuthenticatedAccess('access_control'),
    asyncHandler(async (_req, res) => {
      const sqlPath = path.join(__dirname, 'src', 'db', 'schema.sql');
      const sql = await fs.readFile(sqlPath, 'utf-8');
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      return res.send(sql);
    })
  );

  app.get(
    '/api/settings/api/export-sql',
    requireAuthenticatedAccess('access_control'),
    asyncHandler(async (_req, res) => {
      const sqlPath = path.join(__dirname, 'src', 'db', 'schema.sql');
      const schemaSql = await fs.readFile(sqlPath, 'utf-8');
      const dumpSql = await exportFullPostgresSqlDump(schemaSql);
      res.setHeader('Content-Type', 'application/sql; charset=utf-8');
      return res.send(dumpSql);
    })
  );

  app.get(
    '/api/backup/export',
    requireAuthenticatedAccess('access_control'),
    asyncHandler(async (_req, res) => {
      const bundle = await exportCompleteBackupBundle();
      const stamp = new Date().toISOString().slice(0, 10);
      res.setHeader('Content-Type', 'application/json; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="lynk-builder-complete-backup-${stamp}.json"`
      );
      return res.status(200).send(JSON.stringify(bundle, null, 2));
    })
  );

  app.post(
    '/api/backup/restore/preview',
    requireAuthenticatedAccess('access_control'),
    asyncHandler(async (req, res) => {
      const bundle = (req.body as { bundle?: unknown } | undefined)?.bundle ?? req.body;
      const preview = await previewBackupRestore(bundle);
      return res.json({ ok: preview.summary.valid, summary: preview.summary });
    })
  );

  app.post(
    '/api/backup/restore/apply',
    requireAuthenticatedAccess('access_control'),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const body = (req.body || {}) as { bundle?: unknown; confirmOverwrite?: boolean };
      const result = await applyBackupRestore({
        bundle: body.bundle,
        confirmOverwrite: Boolean(body.confirmOverwrite),
        actorUserId: req.authUser!.id,
      });
      publicPageCache.clear();
      collabHub.updateConnectedUsers(await listUsers());
      collabHub.broadcastAccessUpdated();
      collabHub.broadcastAppearanceUpdated(await getUiAppearanceSettings());
      return res.json(result);
    })
  );

  app.get(
    '/api/backup/export-zip',
    requireAuthenticatedAccess('access_control'),
    asyncHandler(async (_req, res) => {
      const { filename, buffer } = await buildFullProjectBackupZip();
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      return res.status(200).send(buffer);
    })
  );

  app.post(
    '/api/backup/restore/zip/preview',
    requireAuthenticatedAccess('access_control'),
    asyncHandler(async (req, res) => {
      const body = (req.body || {}) as { zipBase64?: unknown };
      const b64 = typeof body.zipBase64 === 'string' ? body.zipBase64.trim() : '';
      if (!b64) {
        return res.status(400).json({ error: 'Payload zipBase64 wajib diisi.' });
      }
      const zipBuffer = Buffer.from(b64, 'base64');
      const preview = await previewZipRestore(zipBuffer);
      return res.json({ ok: preview.summary.valid, summary: preview.summary });
    })
  );

  app.post(
    '/api/backup/restore/zip/apply',
    requireAuthenticatedAccess('access_control'),
    asyncHandler(async (req: AuthenticatedRequest, res) => {
      const body = (req.body || {}) as {
        zipBase64?: unknown;
        mode?: unknown;
        selectedProjectIds?: unknown;
        confirmOverwrite?: unknown;
      };
      const b64 = typeof body.zipBase64 === 'string' ? body.zipBase64.trim() : '';
      if (!b64) {
        return res.status(400).json({ error: 'Payload zipBase64 wajib diisi.' });
      }
      const zipBuffer = Buffer.from(b64, 'base64');
      const result = await applyZipRestore({
        zipBuffer,
        mode: body.mode === 'project' ? 'project' : 'full',
        selectedProjectIds: Array.isArray(body.selectedProjectIds)
          ? body.selectedProjectIds.filter((x): x is string => typeof x === 'string')
          : undefined,
        confirmOverwrite: Boolean(body.confirmOverwrite),
        actorUserId: req.authUser!.id,
      });
      publicPageCache.clear();
      collabHub.updateConnectedUsers(await listUsers());
      collabHub.broadcastAccessUpdated();
      collabHub.broadcastAppearanceUpdated(await getUiAppearanceSettings());
      return res.json(result);
    })
  );

  // ============================================================
  // Public REST JSON API (/api/v1/public/*)
  // ============================================================
  app.use(
    '/api/v1/public',
    asyncHandler(async (req, res, next) => {
      const api = await getApiSettings();
      const originHeader = req.headers.origin;
      if (api.corsOrigins.trim() === '*') {
        res.setHeader('Access-Control-Allow-Origin', '*');
      } else if (originHeader) {
        const allowedList = api.corsOrigins
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        if (allowedList.includes(originHeader)) {
          res.setHeader('Access-Control-Allow-Origin', originHeader);
          res.setHeader('Vary', 'Origin');
        }
      }
      res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
      res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
      if (req.method === 'OPTIONS') {
        return res.status(204).end();
      }
      if (!api.publicApiEnabled) {
        return res.status(403).json({
          error: 'Public REST API dinonaktifkan oleh administrator.',
        });
      }
      const clientIp = getClientIp(req);
      const limitCheck = apiRateLimiter.consume(
        `pubapi:${clientIp}`,
        api.rateLimitPerMinute,
        60_000
      );
      if (!limitCheck.allowed) {
        res.setHeader('Retry-After', String(limitCheck.retryAfterSeconds));
        return res.status(429).json({
          error: 'Melebihi batas permintaan per menit (rate limit).',
        });
      }
      return next();
    })
  );

  app.get(
    '/api/v1/public/pages',
    asyncHandler(async (_req, res) => {
      const entries = await listProjectEntries();
      const published = entries
        .filter((e) => Boolean(e.record.project.publishing?.isPublished))
        .map((e) => ({
          id: e.record.id,
          title: e.record.project.title,
          slug: e.record.project.publishing?.slug || '',
          customDomain: e.record.project.publishing?.customDomain || null,
          publishedAt: e.record.project.publishing?.publishedAt || e.savedAt,
          updatedAt: e.record.updatedAt,
          seoTitle: e.record.project.publishing?.seoTitle || e.record.project.title,
          seoDescription: e.record.project.publishing?.seoDescription || '',
          seoImage: e.record.project.publishing?.seoImage || '',
          seoSiteName: e.record.project.publishing?.seoSiteName || '',
        }));
      return res.json({ count: published.length, pages: published });
    })
  );

  app.get(
    '/api/v1/public/pages/:slug',
    asyncHandler(async (req, res) => {
      const entry = await getProjectEntryBySlug(req.params.slug || '');
      if (!entry || !entry.record.project.publishing?.isPublished) {
        return res.status(404).json({ error: 'Halaman publik tidak ditemukan.' });
      }
      return res.json({
        id: entry.record.id,
        title: entry.record.project.title,
        slug: entry.record.project.publishing?.slug,
        publishedAt: entry.record.project.publishing?.publishedAt,
        updatedAt: entry.record.updatedAt,
        theme: entry.record.project.theme,
        blocksCount: entry.record.project.blocks.length,
        blocks: entry.record.project.blocks,
      });
    })
  );

  // ============================================================
  // Published HTML Landing Page Routes — Browser Mode (/p/:slug)
  // & Fullscreen Mode (/p/:slug/full) serving the exact same page
  // ============================================================
  const handlePublicSlugLandingPage = asyncHandler(
    async (req: AuthenticatedRequest, res) => {
      const slug = normalizeServerSlug(req.params.slug || '', '');
      if (!slug) {
        return res
          .status(404)
          .setHeader('Content-Type', 'text/html; charset=utf-8')
          .setHeader('Cache-Control', 'no-store')
          .send(renderStatusHtml('Halaman Tidak Ditemukan', 'Slug halaman tidak valid.'));
      }

      const isPreviewRequest = req.query.preview === '1';
      const requestOrigin = resolveRequestPublicOrigin(req);

      if (!isPreviewRequest) {
        const cached = publicPageCache.getBySlug(slug, requestOrigin);
        if (cached) {
          res.setHeader('Content-Security-Policy', PUBLIC_PAGE_CSP);
          res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
          res.setHeader('ETag', cached.etag);
          res.setHeader('X-Cache', 'HIT');
          if (matchesIfNoneMatch(req.headers['if-none-match'], cached.etag)) {
            return res.status(304).end();
          }
          return res
            .status(200)
            .setHeader('Content-Type', 'text/html; charset=utf-8')
            .send(cached.html);
        }
      }

      const entry = await getProjectEntryBySlug(slug);
      if (!entry) {
        return res
          .status(404)
          .setHeader('Content-Type', 'text/html; charset=utf-8')
          .setHeader('Cache-Control', 'no-store')
          .send(
            renderStatusHtml(
              'Halaman Belum Tersedia',
              `Landing page dengan slug "/p/${slug}" belum disimpan atau dipublikasikan. Silakan klik Simpan & Tayangkan di Lynk Builder.`
            )
          );
      }

      const actor = req.authUser;
      const canPreviewRole =
        actor &&
        (actor.role === 'super_admin' ||
          Boolean(actor.permissions?.editor) ||
          Boolean(actor.permissions?.publishing) ||
          Boolean(actor.permissions?.projects));
      const allowDraftPreview =
        isPreviewRequest &&
        Boolean(actor) &&
        Boolean(canPreviewRole) &&
        canUserAccessExistingProject(actor, entry);

      if (!entry.record.project.publishing?.isPublished && !allowDraftPreview) {
        return res
          .status(403)
          .setHeader('Content-Type', 'text/html; charset=utf-8')
          .setHeader('Cache-Control', 'no-store')
          .send(
            renderStatusHtml(
              'Halaman Masih Berstatus Draft',
              `Unit usaha "${entry.record.project.title}" sudah tersimpan, namun status publikasinya masih Draft. Aktifkan status Tayang Publik di menu Domain & Iklan.`
            )
          );
      }

      const freshHtml = generateProjectHtml(
        sanitizeBuilderProject(entry.record.project),
        {
          projectId: entry.record.id,
          publicOrigin: requestOrigin,
          canonicalUrl: requestOrigin ? `${requestOrigin}/p/${slug}` : undefined,
        }
      );

      if (entry.record.project.publishing?.isPublished && !isPreviewRequest) {
        const stored = publicPageCache.setBySlug(
          slug,
          {
            projectId: entry.record.id,
            slug,
            revision: entry.record.revision ?? 1,
            html: freshHtml,
          },
          requestOrigin
        );
        res.setHeader('Content-Security-Policy', PUBLIC_PAGE_CSP);
        res.setHeader('Cache-Control', 'public, max-age=30, stale-while-revalidate=120');
        res.setHeader('ETag', stored.etag);
        res.setHeader('X-Cache', 'MISS');
        if (matchesIfNoneMatch(req.headers['if-none-match'], stored.etag)) {
          return res.status(304).end();
        }
        return res
          .status(200)
          .setHeader('Content-Type', 'text/html; charset=utf-8')
          .send(freshHtml);
      }

      return res
        .status(200)
        .setHeader('Content-Type', 'text/html; charset=utf-8')
        .setHeader('Content-Security-Policy', PUBLIC_PAGE_CSP)
        .setHeader('Cache-Control', 'no-store, private')
        .setHeader('X-Cache', 'BYPASS')
        .send(freshHtml);
    }
  );

  app.get('/p/:slug', handlePublicSlugLandingPage);
  app.get('/p/:slug/full', handlePublicSlugLandingPage);

  // ============================================================
  // Video Link Resolver (Strict SSRF Guard - F-03)
  // ============================================================
  app.get(
    '/api/resolve-video',
    asyncHandler(async (req, res) => {
      const rawUrl = typeof req.query.url === 'string' ? req.query.url.trim() : '';
      const platform = typeof req.query.platform === 'string' ? req.query.platform.trim() : '';

      if (!rawUrl) {
        return res.status(400).json({ error: 'URL wajib diisi' });
      }

      const normalizedInput =
        rawUrl.startsWith('http://') || rawUrl.startsWith('https://')
          ? rawUrl
          : `https://${rawUrl}`;

      try {
        await assertSafeExternalUrl(normalizedInput);
      } catch (err) {
        const msg =
          err instanceof SsrfBlockedError ? err.message : 'URL tidak diizinkan';
        return res.status(400).json({ error: msg, code: 'SSRF_BLOCKED' });
      }

      if (isDirectVideoUrl(normalizedInput)) {
        return res.json({
          canonicalUrl: normalizedInput,
          directVideoUrl: normalizedInput,
          posterUrl: null,
          videoId: null,
        });
      }

      const allowed =
        (platform === 'tiktok' && isValidTikTokUrl(normalizedInput)) ||
        (platform === 'facebook' && isValidFacebookVideoUrl(normalizedInput)) ||
        (platform === 'instagram' && isValidInstagramVideoUrl(normalizedInput));

      if (!allowed) {
        return res.status(400).json({ error: 'URL tidak cocok dengan platform' });
      }

      let canonicalUrl = normalizedInput;
      let pageHtml = '';

      try {
        const { response: resp, finalUrl } = await safeFetch(normalizedInput, {
          timeoutMs: 7000,
          maxRedirects: 5,
          headers: {
            'User-Agent': USER_AGENT,
            Accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9,id;q=0.8',
          },
        });
        if (finalUrl) canonicalUrl = finalUrl;
        if (resp.ok) {
          pageHtml = await readResponseTextWithCap(resp, 1.5 * 1024 * 1024);
        }
      } catch (err) {
        if (err instanceof SsrfBlockedError) {
          return res.status(400).json({ error: err.message, code: 'SSRF_BLOCKED' });
        }
        // Lanjutkan dengan URL asli jika fetch halaman utama timeout
      }

      if (platform === 'tiktok') {
        let videoId = extractTikTokId(canonicalUrl) || extractTikTokId(normalizedInput);
        let posterUrl: string | null = null;

        const targetForOembed = videoId
          ? `https://www.tiktok.com/@tiktok/video/${videoId}`
          : canonicalUrl;

        try {
          const { response: oe } = await safeFetch(
            `https://www.tiktok.com/oembed?url=${encodeURIComponent(targetForOembed)}`,
            { headers: { 'User-Agent': USER_AGENT }, timeoutMs: 5000, maxRedirects: 3 }
          );
          if (oe.ok) {
            const rawJson = await readResponseTextWithCap(oe, 256 * 1024);
            const data = JSON.parse(rawJson) as {
              thumbnail_url?: string;
              embed_product_id?: string;
              html?: string;
            };
            if (data.thumbnail_url) posterUrl = data.thumbnail_url;
            if (!videoId && data.embed_product_id) videoId = data.embed_product_id;
            if (!videoId && data.html) {
              const m = data.html.match(/player\/v1\/(\d{10,25})|data-video-id="(\d{10,25})"/);
              if (m) videoId = m[1] || m[2] || null;
            }
          }
        } catch {
          // ignore oembed failure
        }

        if (!videoId && pageHtml) {
          const canonMatch = pageHtml.match(/rel="canonical"\s+href="([^"]+)"/i)?.[1];
          if (canonMatch) {
            canonicalUrl = canonMatch;
            videoId = extractTikTokId(canonMatch);
          }
        }

        return res.json({
          canonicalUrl,
          videoId,
          posterUrl,
          directVideoUrl: null,
        });
      }

      if (platform === 'facebook') {
        const canonMatch = pageHtml.match(/rel="canonical"\s+href="([^"]+)"/i)?.[1];
        if (canonMatch && isValidFacebookVideoUrl(canonMatch)) {
          canonicalUrl = canonMatch;
        }

        let directVideoUrl: string | null = null;
        let posterUrl: string | null =
          pageHtml.match(/property="og:image"\s+content="([^"]+)"/i)?.[1]?.replace(/&amp;/g, '&') ??
          null;

        try {
          const { response: pluginResp } = await safeFetch(
            `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(canonicalUrl)}&show_text=false`,
            {
              headers: {
                'User-Agent': USER_AGENT,
                Accept: 'text/html,application/xhtml+xml',
              },
              timeoutMs: 7000,
              maxRedirects: 3,
            }
          );
          if (pluginResp.ok) {
            const pHtml = await readResponseTextWithCap(pluginResp, 1.5 * 1024 * 1024);
            const rawVideo =
              pHtml.match(/"hd_src_no_ratelimit":"([^"]+)"/)?.[1] ||
              pHtml.match(/"hd_src":"([^"]+)"/)?.[1] ||
              pHtml.match(/"sd_src_no_ratelimit":"([^"]+)"/)?.[1] ||
              pHtml.match(/"sd_src":"([^"]+)"/)?.[1] ||
              pHtml.match(/"playable_url_quality_hd":"([^"]+)"/)?.[1] ||
              pHtml.match(/"playable_url":"([^"]+)"/)?.[1];

            const candidate = unescapeJsonString(rawVideo);
            directVideoUrl = await verifyPlayableVideoUrl(candidate);

            if (!posterUrl) {
              const rawThumb =
                pHtml.match(/"thumbnailImage":\{"uri":"([^"]+)"/)?.[1] ||
                pHtml.match(/"preferred_thumbnail":\{"image":\{"uri":"([^"]+)"/)?.[1];
              posterUrl = unescapeJsonString(rawThumb);
            }
          }
        } catch {
          // fallback ke iframe FB jika plugin fetch gagal
        }

        return res.json({
          canonicalUrl,
          directVideoUrl,
          posterUrl,
          videoId: null,
        });
      }

      if (platform === 'instagram') {
        const canonMatch = pageHtml.match(/rel="canonical"\s+href="([^"]+)"/i)?.[1];
        if (canonMatch && isValidInstagramVideoUrl(canonMatch)) {
          canonicalUrl = canonMatch;
        }

        const igInfo =
          extractInstagramInfo(canonicalUrl) || extractInstagramInfo(normalizedInput);
        let directVideoUrl: string | null = null;
        let posterUrl: string | null =
          pageHtml.match(/property="og:image"\s+content="([^"]+)"/i)?.[1]?.replace(/&amp;/g, '&') ??
          null;

        const rawOgVid = pageHtml.match(
          /property="og:video(?::secure_url)?"\s+content="([^"]+)"/i
        )?.[1];
        if (rawOgVid) {
          directVideoUrl = await verifyPlayableVideoUrl(rawOgVid.replace(/&amp;/g, '&'));
        }

        if (!directVideoUrl && igInfo) {
          try {
            const { response: igEmbedResp } = await safeFetch(
              `https://www.instagram.com/${igInfo.kind}/${igInfo.code}/embed/`,
              {
                headers: {
                  'User-Agent': USER_AGENT,
                  Accept: 'text/html,application/xhtml+xml',
                },
                timeoutMs: 6000,
                maxRedirects: 3,
              }
            );
            if (igEmbedResp.ok) {
              const igHtml = await readResponseTextWithCap(igEmbedResp, 1.5 * 1024 * 1024);
              const rawVid = igHtml.match(/"video_url":"([^"]+)"/)?.[1];
              const candidate = unescapeJsonString(rawVid);
              if (candidate) {
                directVideoUrl = await verifyPlayableVideoUrl(candidate);
              }
              if (!posterUrl) {
                const rawImg = igHtml.match(/"display_url":"([^"]+)"/)?.[1];
                posterUrl = unescapeJsonString(rawImg);
              }
            }
          } catch {
            // fallback ke IG embed iframe
          }
        }

        return res.json({
          canonicalUrl,
          videoId: igInfo ? `${igInfo.kind}/${igInfo.code}` : null,
          directVideoUrl,
          posterUrl,
        });
      }

      return res.json({
        canonicalUrl,
        directVideoUrl: null,
        posterUrl: null,
        videoId: null,
      });
    })
  );

  // Unknown API routes return clean JSON 404 instead of SPA HTML
  app.all('/api/*', (_req, res) => {
    return res.status(404).json({
      error: 'Endpoint API tidak ditemukan.',
      code: 'API_NOT_FOUND',
    });
  });

  if (options?.attachViteOrStatic !== false) {
    if (process.env.NODE_ENV !== 'production') {
      const { createServer: createViteServer } = await import('vite');
      const vite = await createViteServer({
        server: { middlewareMode: true },
        appType: 'spa',
      });
      app.use(vite.middlewares);
    } else {
      const distDir = path.join(__dirname, 'dist');
      app.use(express.static(distDir));
      app.get(
        '*',
        asyncHandler(async (_req, res) => {
          const html = await fs.readFile(path.join(distDir, 'index.html'), 'utf-8');
          res.status(200).setHeader('Content-Type', 'text/html; charset=utf-8').end(html);
        })
      );
    }
  }

  app.use(centralErrorHandler);
  return app;
}

export function getCollabHub(app: express.Express): CollabHub | undefined {
  return (app.locals as Record<string, unknown>).collabHub as CollabHub | undefined;
}

export function attachCollabToServer(
  app: express.Express,
  httpServer: http.Server
): CollabHub | null {
  const collabHub = getCollabHub(app);
  if (!collabHub) return null;

  collabHub.attach(httpServer, {
    authenticateUpgrade: async (req) => {
      const { token } = extractAuthToken(req);
      if (!token) return null;
      const user = await getSessionUserByToken(token);
      if (!user || !user.isActive) return null;
      return user;
    },
    canAccessProject: async (user, projectId) => {
      const existing = await getProjectEntryById(projectId);
      if (existing) {
        return canUserAccessExistingProject(user, existing);
      }
      return (
        Boolean(user.isActive) &&
        (user.role === 'super_admin' ||
          user.unitScope === 'all' ||
          canUserAccessProjectId(user, projectId) ||
          Boolean(user.permissions?.projects))
      );
    },
  });
  return collabHub;
}

export async function startServer() {
  bootstrapManagedCloudRunDefaults();
  const app = await createApp({ attachViteOrStatic: true });
  const host = resolveBindHost();
  const server = http.createServer(app);
  const collabHub = attachCollabToServer(app, server);
  server.on('close', () => {
    collabHub?.close();
  });
  return server.listen(PORT, host, () => {
    console.log(`Server running on http://${host}:${PORT}`);
  });
}

const isMainModule =
  Boolean(process.argv[1]) && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href;

if (isMainModule) {
  startServer().catch((err) => {
    console.error('[SERVER] Fatal startup error:', err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
