import fs from 'node:fs';
import { drizzle, type NodePgDatabase } from 'drizzle-orm/node-postgres';
import pg from 'pg';
import * as schema from './schema.ts';
import {
  CURRENT_SCHEMA_VERSION,
  MigrationIntegrityError,
  getPostgresMigrationStatus,
  runPostgresMigrations,
  runPostgresMigrationsDetailed,
} from './migrations.ts';
import { cleanEnvSecret, isProductionMode } from '../server/secrets.ts';

const { Pool } = pg;

export {
  CURRENT_SCHEMA_VERSION,
  MigrationIntegrityError,
  getPostgresMigrationStatus,
  runPostgresMigrationsDetailed,
};

export type SslVerifyMode = 'strict' | 'custom-ca' | 'insecure-dev-override' | 'disabled';

export function resolveRequestedDbEngine(): 'postgresql' | 'local-json' | 'auto' {
  const raw = process.env.DB_ENGINE?.trim().toLowerCase();
  if (raw === 'postgresql' || raw === 'postgres' || raw === 'pg') return 'postgresql';
  if (raw === 'local-json' || raw === 'json' || raw === 'local') return 'local-json';
  return 'auto';
}

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
  activeSchemaVersion?: string;
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

  const requestedEngine = resolveRequestedDbEngine();
  if (requestedEngine === 'postgresql') {
    return process.env.ALLOW_LOCAL_JSON_FALLBACK?.trim().toLowerCase() === 'true';
  }

  if (isProductionMode()) {
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
    const requestedEngine = resolveRequestedDbEngine();
    const params = resolvePgConnectionParams();

    if (requestedEngine === 'local-json') {
      const explicitRequirePg = process.env.REQUIRE_POSTGRES?.trim().toLowerCase() === 'true';
      const state: PostgresState = {
        engine: 'local-json',
        connected: false,
        ready: !explicitRequirePg,
        degraded: explicitRequirePg,
        configured: params.configured,
        ssl: false,
        sslVerifyMode: 'disabled',
        lastError: explicitRequirePg
          ? 'Konflik konfigurasi: DB_ENGINE=local-json tidak dapat digunakan ketika REQUIRE_POSTGRES=true.'
          : undefined,
        appliedMigrations: [],
        pool: null,
        db: null,
      };
      cachedState = state;
      return state;
    }

    if (!params.configured) {
      const jsonAllowed = isLocalJsonFallbackAllowed(false);
      const state: PostgresState = {
        engine: jsonAllowed ? 'local-json' : 'postgresql',
        connected: false,
        ready: jsonAllowed,
        degraded: !jsonAllowed,
        configured: false,
        ssl: false,
        sslVerifyMode: 'disabled',
        lastError: jsonAllowed
          ? undefined
          : 'PostgreSQL wajib dikonfigurasi (set DATABASE_URL/PGHOST atau nonaktifkan DB_ENGINE=postgresql / REQUIRE_POSTGRES=true).',
        appliedMigrations: [],
        pool: null,
        db: null,
      };
      cachedState = state;
      return state;
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
      const migrationReport = await runPostgresMigrationsDetailed(pool);
      const appliedMigrations = migrationReport.appliedVersions;
      const db = drizzle(pool, { schema });
      const state: PostgresState = {
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
        activeSchemaVersion: migrationReport.currentVersion ?? undefined,
        pool,
        db,
      };
      cachedState = state;
      console.log(
        `[DB] Terhubung ke PostgreSQL (${params.host || 'DSN'}/${params.database || 'default'}, TLS=${params.sslVerifyMode}, schema=${migrationReport.currentVersion || '004'})`
      );
      return state;
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Gagal terhubung ke PostgreSQL';
      await pool.end().catch(() => {});
      const allowFallback = isLocalJsonFallbackAllowed(true);
      if (allowFallback) {
        console.warn(`[DB] PostgreSQL tidak aktif, memakai penyimpanan JSON lokal (dev): ${msg}`);
      } else {
        console.error(`[DB][FAIL-CLOSED] PostgreSQL gagal terhubung & fallback dinonaktifkan: ${msg}`);
      }
      const state: PostgresState = {
        engine: allowFallback ? 'local-json' : 'postgresql',
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
      cachedState = state;
      return state;
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
