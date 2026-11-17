import 'dotenv/config';
import path from 'node:path';
import pg from 'pg';
import { resolvePgSslConfig } from '../src/db/index.ts';
import {
  migrateJsonToPostgres,
  verifyJsonVsPostgresIntegrity,
} from '../src/db/jsonToPgMigrator.ts';
import { cleanEnvSecret } from '../src/server/secrets.ts';

function readArgValue(name: string): string | undefined {
  const args = process.argv.slice(2);
  for (let i = 0; i < args.length; i += 1) {
    const a = args[i] || '';
    if (a === name && args[i + 1]) return args[i + 1];
    if (a.startsWith(`${name}=`)) return a.slice(name.length + 1);
  }
  return undefined;
}

function createOptionalCliPool(): { pool: pg.Pool; label: string } | null {
  const rawUrl =
    cleanEnvSecret(process.env.DATABASE_URL) ||
    cleanEnvSecret(process.env.POSTGRES_URL) ||
    '';
  const envSsl = cleanEnvSecret(process.env.PGSSL).toLowerCase() === 'true';

  if (rawUrl) {
    let useSsl = envSsl;
    let label = 'DSN';
    try {
      const u = new URL(rawUrl);
      const sslMode = u.searchParams.get('sslmode');
      useSsl =
        envSsl ||
        sslMode === 'require' ||
        sslMode === 'verify-full' ||
        sslMode === 'verify-ca';
      label = `${u.hostname}/${u.pathname.replace(/^\//, '') || 'postgres'}`;
    } catch {
      // Keep generic label without exposing DSN credentials
    }
    const { sslConfig } = resolvePgSslConfig(useSsl);
    return {
      pool: new pg.Pool({
        connectionString: rawUrl,
        ssl: sslConfig,
        connectionTimeoutMillis: 5000,
      }),
      label,
    };
  }

  const host = cleanEnvSecret(process.env.PGHOST) || cleanEnvSecret(process.env.SQL_HOST);
  const user = cleanEnvSecret(process.env.PGUSER) || cleanEnvSecret(process.env.SQL_USER);
  const database =
    cleanEnvSecret(process.env.PGDATABASE) ||
    cleanEnvSecret(process.env.SQL_DATABASE) ||
    'lynk_builder';
  const password = cleanEnvSecret(process.env.PGPASSWORD ?? process.env.SQL_PASSWORD);
  const port = Number(cleanEnvSecret(process.env.PGPORT || process.env.SQL_PORT) || 5432) || 5432;

  if (!host || !user) return null;
  const { sslConfig } = resolvePgSslConfig(envSsl);
  return {
    pool: new pg.Pool({
      host,
      port,
      user,
      password,
      database,
      ssl: sslConfig,
      connectionTimeoutMillis: 5000,
    }),
    label: `${host}/${database}`,
  };
}

async function main() {
  const args = process.argv.slice(2);
  const apply = args.includes('--apply');
  const verifyOnly = args.includes('--verify-only');
  const includeSessions = args.includes('--include-sessions');
  const dryRun = !apply;

  const sourceStorePath = readArgValue('--source-file');
  const sourceDir = readArgValue('--source-dir');
  const resolvedSourceFile = sourceStorePath
    ? path.resolve(sourceStorePath)
    : sourceDir
    ? path.join(path.resolve(sourceDir), 'lynk-server-store.json')
    : undefined;
  const sourceMediaDir = sourceDir ? path.join(path.resolve(sourceDir), 'media') : undefined;
  const targetMediaDir = readArgValue('--target-media-dir');

  const pgTarget = createOptionalCliPool();

  try {
    if (verifyOnly) {
      if (!pgTarget) {
        console.error(
          '[pg:verify] Konfigurasi PostgreSQL tidak tersedia (DATABASE_URL atau PGHOST/PGUSER belum diatur).'
        );
        process.exitCode = 1;
        return;
      }
      const report = await verifyJsonVsPostgresIntegrity({
        pool: pgTarget.pool,
        sourceStorePath: resolvedSourceFile,
        sourceMediaDir,
        targetMediaDir,
        includeSessions,
      });
      console.log(JSON.stringify({ target: pgTarget.label, ...report }, null, 2));
      if (!report.ok) {
        process.exitCode = 1;
      }
      return;
    }

    if (!dryRun && !pgTarget) {
      console.error(
        '[pg:migrate-json] Mode --apply memerlukan konfigurasi PostgreSQL (DATABASE_URL atau PGHOST/PGUSER).'
      );
      process.exitCode = 1;
      return;
    }

    const result = await migrateJsonToPostgres({
      pool: pgTarget?.pool ?? null,
      sourceStorePath: resolvedSourceFile,
      sourceMediaDir,
      targetMediaDir,
      dryRun,
      includeSessions,
      verifyAfterWrite: true,
    });

    console.log(
      JSON.stringify(
        {
          target: pgTarget?.label || 'offline-dry-run',
          ok: result.ok,
          dryRun: result.dryRun,
          applied: result.applied,
          sourceExists: result.plan.sourceExists,
          sourceStorePath: path.basename(result.plan.sourceStorePath),
          counts: result.plan.counts,
          mediaSummary: {
            verifiedCount: result.plan.mediaReport.verifiedCount,
            copiedCount: result.plan.mediaReport.copiedCount,
            recoveredOrphanFiles: result.plan.mediaReport.recoveredOrphanFiles,
            missingOnDisk: result.plan.mediaReport.missingOnDisk,
            invalidDiskFiles: result.plan.mediaReport.invalidDiskFiles,
            checksumOrSizeMismatches: result.plan.mediaReport.checksumOrSizeMismatches.length,
          },
          issues: result.plan.issues,
          blockedByErrors: result.plan.blockedByErrors,
          postgresSchemaVersion: result.postgresMigrations?.currentVersion ?? null,
          integrityOk: result.integrityReport?.ok ?? null,
          integrityReport: result.integrityReport ?? null,
        },
        null,
        2
      )
    );

    if (!result.ok) {
      process.exitCode = 1;
    }
  } finally {
    await pgTarget?.pool.end().catch(() => {});
  }
}

void main();
