import fs from 'node:fs';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';
import { runPostgresMigrations } from './migrations.ts';
import { cleanEnvSecret, isProductionMode } from '../server/secrets.ts';

const { Pool } = pg;

export type SslVerifyMode = 'strict' | 'custom-ca' | 'insecure-dev-override' | 'disabled';

export interface PostgresState {
  engine: 'postgresql' | 'local-json';
  connected: boolean;
  ready: boolean;
  degraded: boolean;
  configured: boolean;
  host?: string;
  database?: string;
  ssl: boolean;
  sslVerifyMode: SslVerifyMode;
  lastError?: string;
  appliedMigrations: string[];
  pool: pg.Pool | null;
  db: NodePgDatabase<typeof schema> | null;
}

interface PgConnectionParams {
  configured: boolean;
  connectionString?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  ssl: boolean;
  sslConfig?: { rejectUnauthorized: boolean; ca?: string };
  sslVerifyMode: SslVerifyMode;
}

let cachedState: PostgresState | null = null;
let initPromise: Promise<PostgresState> | null = null;

export function resolvePgSslConfig(useSsl: boolean): {
  sslConfig?: { rejectUnauthorized: boolean; ca?: string };
  sslVerifyMode: SslVerifyMode;
} {
  if (!useSsl) {
    return { sslConfig: undefined, sslVerifyMode: 'disabled' };
  }

  const inlineCa = process.env.PGSSL_CA?.trim().replace(/\\n/g, '\n');
  const caFile = process.env.PGSSL_CA_FILE?.trim();
  let caContent: string | undefined = inlineCa || undefined;

  if (!caContent && caFile) {
    caContent = fs.readFileSync(caFile, 'utf-8');
  }

  // Strict verification is DEFAULT whenever TLS is enabled (F-16).
  // Allow insecure self-signed certs ONLY via explicit opt-in outside production.
  const insecureOptIn =
    process.env.PGSSL_REJECT_UNAUTHORIZED?.trim().toLowerCase() === 'false';

  if (insecureOptIn) {
    if (isProductionMode()) {
      console.warn(
        '[DB][SECURITY] PGSSL_REJECT_UNAUTHORIZED=false diabaikan pada mode production. TLS tetap memverifikasi sertifikat (rejectUnauthorized=true).'
      );
      return {
        sslConfig: caContent ? { rejectUnauthorized: true, ca: caContent } : { rejectUnauthorized: true },
        sslVerifyMode: caContent ? 'custom-ca' : 'strict',
      };
    }
    console.warn(
      '[DB][DEV] PGSSL_REJECT_UNAUTHORIZED=false aktif — sertifikat TLS self-signed diizinkan hanya untuk development.'
    );
    return {
      sslConfig: caContent
        ? { rejectUnauthorized: false, ca: caContent }
        : { rejectUnauthorized: false },
      sslVerifyMode: 'insecure-dev-override',
    };
  }

  return {
    sslConfig: caContent ? { rejectUnauthorized: true, ca: caContent } : { rejectUnauthorized: true },
    sslVerifyMode: caContent ? 'custom-ca' : 'strict',
  };
}

function resolvePgConnectionParams(): PgConnectionParams {
  const rawUrl =
    cleanEnvSecret(process.env.DATABASE_URL) ||
    cleanEnvSecret(process.env.POSTGRES_URL) ||
    '';

  const envSsl = cleanEnvSecret(process.env.PGSSL).toLowerCase() === 'true';

  if (rawUrl) {
    try {
      const u = new URL(rawUrl);
      const sslMode = u.searchParams.get('sslmode');
      const useSsl =
        envSsl ||
        sslMode === 'require' ||
        sslMode === 'verify-full' ||
        sslMode === 'verify-ca';
      const { sslConfig, sslVerifyMode } = resolvePgSslConfig(useSsl);
      return {
        configured: true,
        connectionString: rawUrl,
        host: u.hostname,
        database: u.pathname.replace(/^\//, '') || 'postgres',
        ssl: useSsl,
        sslConfig,
        sslVerifyMode,
      };
    } catch {
      const { sslConfig, sslVerifyMode } = resolvePgSslConfig(envSsl);
      return {
        configured: true,
        connectionString: rawUrl,
        ssl: envSsl,
        sslConfig,
        sslVerifyMode,
      };
    }
  }

  const host = cleanEnvSecret(process.env.PGHOST) || cleanEnvSecret(process.env.SQL_HOST) || '';
  const user = cleanEnvSecret(process.env.PGUSER) || cleanEnvSecret(process.env.SQL_USER) || '';
  const database =
    cleanEnvSecret(process.env.PGDATABASE) || cleanEnvSecret(process.env.SQL_DATABASE) || 'lynk_builder';
  const password = cleanEnvSecret(process.env.PGPASSWORD ?? process.env.SQL_PASSWORD);
  const port = Number(cleanEnvSecret(process.env.PGPORT || process.env.SQL_PORT) || 5432) || 5432;

  if (!host || !user) {
    return { configured: false, ssl: false, sslVerifyMode: 'disabled' };
  }

  const { sslConfig, sslVerifyMode } = resolvePgSslConfig(envSsl);
  return {
    configured: true,
    host,
    port,
    user,
    password,
    database,
    ssl: envSsl,
    sslConfig,
    sslVerifyMode,
  };
}

export function isLocalJsonFallbackAllowed(pgConfigured: boolean): boolean {
  const explicitRequirePg = process.env.REQUIRE_POSTGRES?.trim().toLowerCase() === 'true';
  if (explicitRequirePg) return false;

  if (isProductionMode()) {
    // In production, if Postgres is configured or fallback not explicitly opted in, fail closed!
    if (pgConfigured) {
      return process.env.ALLOW_LOCAL_JSON_FALLBACK?.trim().toLowerCase() === 'true';
    }
    return process.env.ALLOW_LOCAL_JSON_STORAGE?.trim().toLowerCase() === 'true';
  }

  return process.env.ALLOW_LOCAL_JSON_FALLBACK?.trim().toLowerCase() !== 'false';
}

export async function ensurePostgresSchema(pool: pg.Pool): Promise<string[]> {
  return runPostgresMigrations(pool);
}

export async function getDbState(): Promise<PostgresState> {
  if (cachedState) return cachedState;
  if (initPromise) return initPromise;

  initPromise = (async (): Promise<PostgresState> => {
    const params = resolvePgConnectionParams();
    if (!params.configured) {
      const jsonAllowed = isLocalJsonFallbackAllowed(false);
      cachedState = {
        engine: 'local-json',
        connected: false,
        ready: jsonAllowed,
        degraded: !jsonAllowed,
        configured: false,
        ssl: false,
        sslVerifyMode: 'disabled',
        lastError: jsonAllowed
          ? undefined
          : 'PostgreSQL wajib dikonfigurasi pada mode production (set DATABASE_URL/PGHOST atau ALLOW_LOCAL_JSON_STORAGE=true).',
        appliedMigrations: [],
        pool: null,
        db: null,
      };
      return cachedState;
    }

    const pool = new Pool({
      ...(params.connectionString
        ? { connectionString: params.connectionString }
        : {
            host: params.host,
            port: params.port,
            user: params.user,
            password: params.password,
            database: params.database,
          }),
      ssl: params.sslConfig,
      max: 10,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 5000,
    });

    try {
      const appliedMigrations = await ensurePostgresSchema(pool);
      const db = drizzle(pool, { schema });
      cachedState = {
        engine: 'postgresql',
        connected: true,
        ready: true,
        degraded: false,
        configured: true,
        host: params.host,
        database: params.database,
        ssl: params.ssl,
        sslVerifyMode: params.sslVerifyMode,
        appliedMigrations,
        pool,
        db,
      };
      console.log(
        `[DB] Terhubung ke PostgreSQL (${params.host || 'DSN'}/${params.database || 'default'}, TLS=${params.sslVerifyMode}, migrations=${appliedMigrations.join(',')})`
      );
      return cachedState;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal terhubung ke PostgreSQL';
      await pool.end().catch(() => {});
      const allowFallback = isLocalJsonFallbackAllowed(true);
      if (allowFallback) {
        console.warn(`[DB] PostgreSQL tidak aktif, memakai penyimpanan JSON lokal (dev): ${msg}`);
      } else {
        console.error(`[DB][FAIL-CLOSED] PostgreSQL gagal terhubung & fallback dinonaktifkan: ${msg}`);
      }
      cachedState = {
        engine: 'local-json',
        connected: false,
        ready: allowFallback,
        degraded: !allowFallback,
        configured: true,
        host: params.host,
        database: params.database,
        ssl: params.ssl,
        sslVerifyMode: params.sslVerifyMode,
        lastError: msg,
        appliedMigrations: [],
        pool: null,
        db: null,
      };
      return cachedState;
    }
  })();

  return initPromise;
}

export async function resetDbConnectionCheck(): Promise<PostgresState> {
  if (cachedState?.pool) {
    await cachedState.pool.end().catch(() => {});
  }
  cachedState = null;
  initPromise = null;
  return getDbState();
}
