import 'dotenv/config';
import pg from 'pg';
import {
  getDbState,
  getPostgresMigrationStatus,
  resolvePgSslConfig,
} from '../src/db/index.ts';
import { cleanEnvSecret } from '../src/server/secrets.ts';

async function checkStatusDirect(): Promise<boolean> {
  const rawUrl =
    cleanEnvSecret(process.env.DATABASE_URL) ||
    cleanEnvSecret(process.env.POSTGRES_URL) ||
    '';
  const envSsl = cleanEnvSecret(process.env.PGSSL).toLowerCase() === 'true';
  const host = cleanEnvSecret(process.env.PGHOST) || cleanEnvSecret(process.env.SQL_HOST);
  const user = cleanEnvSecret(process.env.PGUSER) || cleanEnvSecret(process.env.SQL_USER);
  const database =
    cleanEnvSecret(process.env.PGDATABASE) ||
    cleanEnvSecret(process.env.SQL_DATABASE) ||
    'lynk_builder';
  const password = cleanEnvSecret(process.env.PGPASSWORD ?? process.env.SQL_PASSWORD);
  const port = Number(cleanEnvSecret(process.env.PGPORT || process.env.SQL_PORT) || 5432) || 5432;

  if (!rawUrl && (!host || !user)) {
    console.error('[db:migrate:status] DATABASE_URL / PGHOST belum dikonfigurasi.');
    return false;
  }

  let useSsl = envSsl;
  if (rawUrl) {
    try {
      const sslMode = new URL(rawUrl).searchParams.get('sslmode');
      useSsl = envSsl || sslMode === 'require' || sslMode === 'verify-full' || sslMode === 'verify-ca';
    } catch {
      // ignore invalid URL parse
    }
  }
  const { sslConfig } = resolvePgSslConfig(useSsl);
  const pool = new pg.Pool(
    rawUrl
      ? { connectionString: rawUrl, ssl: sslConfig, connectionTimeoutMillis: 5000 }
      : { host, port, user, password, database, ssl: sslConfig, connectionTimeoutMillis: 5000 }
  );

  try {
    const status = await getPostgresMigrationStatus(pool);
    console.log(
      JSON.stringify(
        {
          currentVersion: status.currentVersion,
          latestAvailableVersion: status.latestAvailableVersion,
          upToDate: status.upToDate,
          appliedVersions: status.appliedMigrations.map((m) => m.version),
          pendingVersions: status.pendingVersions,
          tamperedMigrations: status.tamperedMigrations,
        },
        null,
        2
      )
    );
    return status.tamperedMigrations.length === 0;
  } finally {
    await pool.end().catch(() => {});
  }
}

async function main() {
  const statusOnly = process.argv.includes('--status');
  if (statusOnly) {
    const ok = await checkStatusDirect();
    if (!ok) process.exitCode = 1;
    return;
  }

  const state = await getDbState();
  if (state.engine !== 'postgresql' || !state.connected || !state.pool) {
    console.error(
      `[db:migrate] PostgreSQL tidak terhubung (${state.lastError || 'variabel DATABASE_URL / PGHOST belum diatur'}).`
    );
    process.exitCode = 1;
    return;
  }
  console.log(
    `[db:migrate] Migrasi selesai untuk ${state.host || 'DSN'}/${state.database || 'default'}. Versi aktif: ${state.activeSchemaVersion || state.appliedMigrations.at(-1) || '004'} (${state.appliedMigrations.join(', ')})`
  );
  await state.pool.end().catch(() => {});
}

void main();
