import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
function resolveSecretFilePath(): string {
  const baseDir = process.env.LYNK_DATA_DIR?.trim()
    ? path.resolve(process.env.LYNK_DATA_DIR.trim())
    : path.resolve(__dirname, '../../.data');
  return path.join(baseDir, '.dev-session-secret');
}

const PLACEHOLDER_PATTERNS = [
  /^ganti/i,
  /^replace/i,
  /^change[-_]?me/i,
  /^your[-_]?secret/i,
  /^my[-_]?.*secret/i,
  /^secret/i,
  /^default/i,
  /^example/i,
  /^test$/i,
  /^123456/,
];

let cachedSecret: string | null = null;
let warnedDevSecret = false;

export function cleanEnvSecret(raw?: string): string {
  const trimmed = (raw ?? '').trim();
  if (
    trimmed.length >= 2 &&
    ((trimmed.startsWith('"') && trimmed.endsWith('"')) ||
      (trimmed.startsWith("'") && trimmed.endsWith("'")))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

export function isProductionMode(): boolean {
  return cleanEnvSecret(process.env.NODE_ENV).toLowerCase() === 'production';
}

export function isManagedAiStudioCloudRun(): boolean {
  if (cleanEnvSecret(process.env.REQUIRE_ENV_SECRETS).toLowerCase() === 'true') {
    return false;
  }
  return Boolean(
    process.env.K_SERVICE?.trim() ||
      process.env.K_REVISION?.trim() ||
      process.env.CLOUD_RUN_TIMEOUT_SECONDS?.trim() ||
      process.env.APPLET_ID?.trim()
  );
}

export function isValidSecretValue(raw: string | undefined): {
  valid: boolean;
  reason?: string;
} {
  const val = cleanEnvSecret(raw);
  if (!val) {
    return { valid: false, reason: 'SESSION_SECRET belum diatur' };
  }
  if (val.length < 32) {
    return {
      valid: false,
      reason: 'SESSION_SECRET minimal harus 32 karakter acak berentropi tinggi',
    };
  }
  for (const re of PLACEHOLDER_PATTERNS) {
    if (re.test(val)) {
      return {
        valid: false,
        reason: 'SESSION_SECRET terdeteksi masih menggunakan nilai placeholder',
      };
    }
  }
  // Reject trivial repeated character strings like "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
  if (new Set(val).size < 8) {
    return {
      valid: false,
      reason: 'SESSION_SECRET memiliki entropi terlalu rendah',
    };
  }
  return { valid: true };
}

export function bootstrapManagedCloudRunDefaults(): void {
  if (!isManagedAiStudioCloudRun() || !isProductionMode()) {
    return;
  }

  const currentSecret = cleanEnvSecret(process.env.SESSION_SECRET);
  if (!isValidSecretValue(currentSecret).valid) {
    let runtimeSecret = '';
    try {
      const secretFile = path.join(path.dirname(resolveSecretFilePath()), '.runtime-session-secret');
      fs.mkdirSync(path.dirname(secretFile), { recursive: true });
      if (fs.existsSync(secretFile)) {
        const existing = fs.readFileSync(secretFile, 'utf-8').trim();
        if (isValidSecretValue(existing).valid) {
          runtimeSecret = existing;
        }
      }
      if (!runtimeSecret) {
        runtimeSecret = crypto.randomBytes(32).toString('hex');
        fs.writeFileSync(secretFile, runtimeSecret, { mode: 0o600 });
      }
    } catch {
      runtimeSecret = crypto.randomBytes(32).toString('hex');
    }
    process.env.SESSION_SECRET = runtimeSecret;
    console.warn(
      '[SECURITY][CLOUD-RUN] SESSION_SECRET belum diatur atau belum valid; instance Cloud Run AI Studio memakai kunci acak lokal sementara. Set SESSION_SECRET (32+ karakter acak) di panel Secrets untuk persistensi sesi lintas-revisi.'
    );
  }

  const requirePg = cleanEnvSecret(process.env.REQUIRE_POSTGRES).toLowerCase() === 'true';
  if (!requirePg) {
    const pgHost = cleanEnvSecret(process.env.PGHOST || process.env.SQL_HOST).toLowerCase();
    const hasRemotePg =
      Boolean(cleanEnvSecret(process.env.DATABASE_URL || process.env.POSTGRES_URL)) ||
      (Boolean(pgHost) && pgHost !== 'localhost' && pgHost !== '127.0.0.1');

    if (!hasRemotePg) {
      if (!process.env.ALLOW_LOCAL_JSON_STORAGE) {
        process.env.ALLOW_LOCAL_JSON_STORAGE = 'true';
      }
      if (!process.env.ALLOW_LOCAL_JSON_FALLBACK) {
        process.env.ALLOW_LOCAL_JSON_FALLBACK = 'true';
      }
      console.warn(
        '[DB][CLOUD-RUN] PostgreSQL remote belum dikonfigurasi pada deployment Cloud Run AI Studio; mengaktifkan JSON store lokal agar aplikasi dapat beroperasi.'
      );
    }
  }
}

export function validateStartupSecrets(): {
  sessionSecretConfigured: boolean;
  warning?: string;
} {
  const rawEnv = cleanEnvSecret(process.env.SESSION_SECRET);
  const check = isValidSecretValue(rawEnv);

  if (isProductionMode()) {
    if (!check.valid) {
      throw new Error(
        `[SECURITY] Startup dibatalkan: ${check.reason}. Set environment variable SESSION_SECRET minimal 32 karakter (contoh: openssl rand -hex 32).`
      );
    }
    cachedSecret = rawEnv;
    return { sessionSecretConfigured: true };
  }

  if (check.valid) {
    cachedSecret = rawEnv;
    return { sessionSecretConfigured: true };
  }

  // Non-production convenience: persist a unique per-workspace random dev secret in .data/ (never hardcoded)
  try {
    const devSecretFile = resolveSecretFilePath();
    fs.mkdirSync(path.dirname(devSecretFile), { recursive: true });
    if (fs.existsSync(devSecretFile)) {
      const existing = fs.readFileSync(devSecretFile, 'utf-8').trim();
      if (isValidSecretValue(existing).valid) {
        cachedSecret = existing;
      }
    }
    if (!cachedSecret) {
      const generated = crypto.randomBytes(32).toString('hex');
      fs.writeFileSync(devSecretFile, generated, { mode: 0o600 });
      cachedSecret = generated;
    }
  } catch {
    cachedSecret = crypto.randomBytes(32).toString('hex');
  }

  const warning =
    rawEnv && !check.valid
      ? `${check.reason}; mode development memakai kunci acak lokal sementara.`
      : 'SESSION_SECRET belum diset di environment; mode development memakai kunci acak lokal di .data/.dev-session-secret (wajib diisi di production).';

  if (!warnedDevSecret) {
    warnedDevSecret = true;
    console.warn(`[SECURITY] ${warning}`);
  }

  return {
    sessionSecretConfigured: false,
    warning,
  };
}

export function getSessionSigningSecret(): string {
  if (cachedSecret) return cachedSecret;
  validateStartupSecrets();
  return cachedSecret!;
}

export function resetCachedSecretForTests(): void {
  cachedSecret = null;
}

export function hashSessionTokenWithHmac(rawToken: string): string {
  const secret = getSessionSigningSecret();
  return crypto.createHmac('sha256', secret).update(rawToken).digest('hex');
}

export function isNonEmptyEnvSecret(envName: string): boolean {
  const raw = cleanEnvSecret(process.env[envName]);
  if (!raw) return false;
  if (envName === 'SESSION_SECRET') {
    return isValidSecretValue(raw).valid;
  }
  const lower = raw.toLowerCase();
  return !['-', 'skip', 'none', 'null', 'undefined', 'belum', 'n/a'].includes(lower);
}
