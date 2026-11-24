import crypto from 'node:crypto';
import type pg from 'pg';

export interface MigrationDefinition {
  version: string;
  name: string;
  statements: string[];
}

export const POSTGRES_MIGRATIONS: MigrationDefinition[] = [
  {
    version: '001',
    name: 'initial_schema',
    statements: [
      `CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        email TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        is_active BOOLEAN NOT NULL DEFAULT TRUE,
        unit_scope_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        permissions_json JSONB NOT NULL,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL,
        last_login_at BIGINT
      );`,
      `CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);`,
      `CREATE TABLE IF NOT EXISTS sessions (
        token_hash TEXT PRIMARY KEY,
        user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        expires_at BIGINT NOT NULL,
        user_agent TEXT NOT NULL DEFAULT '',
        ip_address TEXT NOT NULL DEFAULT '',
        created_at BIGINT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);`,
      `CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);`,
      `CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
        title TEXT NOT NULL,
        slug TEXT NOT NULL UNIQUE,
        custom_domain TEXT NOT NULL DEFAULT '',
        use_custom_domain BOOLEAN NOT NULL DEFAULT FALSE,
        is_published BOOLEAN NOT NULL DEFAULT FALSE,
        published_at BIGINT,
        project_json JSONB NOT NULL,
        rendered_html TEXT NOT NULL DEFAULT '',
        updated_at BIGINT NOT NULL,
        last_saved_at BIGINT NOT NULL,
        created_at BIGINT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects (slug);`,
      `CREATE INDEX IF NOT EXISTS idx_projects_custom_domain ON projects (custom_domain);`,
      `CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects (owner_user_id);`,
      `CREATE TABLE IF NOT EXISTS analytics_events (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        project_title TEXT NOT NULL,
        slug TEXT NOT NULL DEFAULT '',
        event_type TEXT NOT NULL,
        channel TEXT NOT NULL DEFAULT 'organic',
        source_label TEXT NOT NULL DEFAULT 'Organik',
        cta_label TEXT,
        wa_phone TEXT,
        order_value INTEGER,
        utm_source TEXT,
        utm_medium TEXT,
        utm_campaign TEXT,
        utm_content TEXT,
        click_id_type TEXT,
        device_type TEXT NOT NULL DEFAULT 'desktop',
        is_test BOOLEAN NOT NULL DEFAULT FALSE,
        created_at BIGINT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_analytics_project_created ON analytics_events (project_id, created_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events (created_at DESC);`,
      `CREATE TABLE IF NOT EXISTS access_policies (
        id TEXT PRIMARY KEY,
        all_users_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
        auto_grant_super_admin_on_join BOOLEAN NOT NULL DEFAULT FALSE,
        default_role TEXT NOT NULL DEFAULT 'viewer',
        active_member_id TEXT NOT NULL DEFAULT 'owner-super-admin',
        updated_at BIGINT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS api_settings (
        id TEXT PRIMARY KEY,
        public_api_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        require_auth_for_builder BOOLEAN NOT NULL DEFAULT TRUE,
        webhook_url TEXT NOT NULL DEFAULT '',
        webhook_events_json JSONB NOT NULL DEFAULT '["wa_click","form_submit","project_publish"]'::jsonb,
        cors_origins TEXT NOT NULL DEFAULT '*',
        rate_limit_per_minute INTEGER NOT NULL DEFAULT 120,
        meta_api_version TEXT NOT NULL DEFAULT 'v21.0',
        wa_default_country_code TEXT NOT NULL DEFAULT '62',
        auto_publish_on_save BOOLEAN NOT NULL DEFAULT FALSE,
        updated_at BIGINT NOT NULL
      );`,
      `CREATE TABLE IF NOT EXISTS webhook_logs (
        id TEXT PRIMARY KEY,
        event_type TEXT NOT NULL,
        target_url TEXT NOT NULL,
        status_code INTEGER,
        success BOOLEAN NOT NULL DEFAULT FALSE,
        payload_summary TEXT NOT NULL DEFAULT '',
        error_message TEXT,
        created_at BIGINT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs (created_at DESC);`,
    ],
  },
  {
    version: '002',
    name: 'p0a_access_hardening',
    statements: [
      `UPDATE access_policies
       SET all_users_super_admin = FALSE,
           auto_grant_super_admin_on_join = FALSE,
           default_role = CASE WHEN default_role = 'editor' THEN 'editor' ELSE 'viewer' END
       WHERE all_users_super_admin = TRUE
          OR auto_grant_super_admin_on_join = TRUE
          OR default_role IN ('super_admin', 'admin');`,
    ],
  },
  {
    version: '003',
    name: 'revisions_and_media_assets',
    statements: [
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;`,
      `CREATE TABLE IF NOT EXISTS media_assets (
        id TEXT PRIMARY KEY,
        filename TEXT NOT NULL UNIQUE,
        mime_type TEXT NOT NULL,
        size_bytes INTEGER NOT NULL,
        sha256 TEXT NOT NULL,
        created_by TEXT,
        created_at BIGINT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_media_filename ON media_assets (filename);`,
    ],
  },
  {
    version: '004',
    name: 'analytics_bigint_and_case_insensitive_email',
    statements: [
      `ALTER TABLE analytics_events ALTER COLUMN order_value TYPE BIGINT;`,
      `CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));`,
      `ALTER TABLE api_settings ADD COLUMN IF NOT EXISTS demo_login_enabled BOOLEAN;`,
    ],
  },
  {
    version: '005',
    name: 'ui_appearance_settings',
    statements: [
      `CREATE TABLE IF NOT EXISTS ui_appearance_settings (
        id TEXT PRIMARY KEY,
        labels_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        updated_at BIGINT NOT NULL
      );`,
    ],
  },
  {
    version: '006',
    name: 'web_templates',
    statements: [
      `CREATE TABLE IF NOT EXISTS web_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        description TEXT NOT NULL DEFAULT '',
        category TEXT NOT NULL DEFAULT 'bisnis',
        visibility TEXT NOT NULL DEFAULT 'shared',
        allow_collaborative_edit BOOLEAN NOT NULL DEFAULT FALSE,
        snapshot_json JSONB NOT NULL,
        main_block_count INTEGER NOT NULL DEFAULT 0,
        sub_page_count INTEGER NOT NULL DEFAULT 0,
        total_block_count INTEGER NOT NULL DEFAULT 0,
        sub_page_titles_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        palette_colors_json JSONB NOT NULL DEFAULT '[]'::jsonb,
        created_by_user_id TEXT NOT NULL,
        created_by_name TEXT NOT NULL DEFAULT 'Pengguna',
        updated_by_name TEXT,
        usage_count INTEGER NOT NULL DEFAULT 0,
        created_at BIGINT NOT NULL,
        updated_at BIGINT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_web_templates_updated ON web_templates (updated_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_web_templates_visibility ON web_templates (visibility);`,
    ],
  },
  {
    version: '007',
    name: 'saas_pos_bridge_and_form_submissions',
    statements: [
      `CREATE TABLE IF NOT EXISTS form_submissions (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        project_title TEXT NOT NULL,
        slug TEXT NOT NULL DEFAULT '',
        component_id TEXT NOT NULL,
        form_title TEXT NOT NULL,
        form_category TEXT,
        values_json JSONB NOT NULL DEFAULT '{}'::jsonb,
        source_channel TEXT,
        is_test BOOLEAN NOT NULL DEFAULT FALSE,
        created_at BIGINT NOT NULL
      );`,
      `CREATE INDEX IF NOT EXISTS idx_form_submissions_project_created ON form_submissions (project_id, created_at DESC);`,
      `CREATE INDEX IF NOT EXISTS idx_form_submissions_created ON form_submissions (created_at DESC);`,
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS source_template_id TEXT;`,
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS pos_store_id TEXT;`,
      `ALTER TABLE projects ADD COLUMN IF NOT EXISTS pos_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE;`,
      `CREATE INDEX IF NOT EXISTS idx_projects_pos_store_id ON projects (pos_store_id);`,
      `UPDATE projects SET slug = lower(trim(slug)) WHERE slug <> lower(trim(slug));`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug_lower_unique ON projects (lower(slug));`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'free';`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS max_sites INTEGER NOT NULL DEFAULT 3;`,
      `ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at BIGINT;`,
      `UPDATE users SET email = lower(trim(email)) WHERE email <> lower(trim(email));`,
      `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower_unique ON users (lower(email));`,
      `CREATE INDEX IF NOT EXISTS idx_web_templates_category ON web_templates (category);`,
    ],
  },
  {
    version: '008',
    name: 'media_assets_binary_storage',
    statements: [
      `ALTER TABLE media_assets ADD COLUMN IF NOT EXISTS data_base64 TEXT;`,
    ],
  },
];

export const CURRENT_SCHEMA_VERSION =
  POSTGRES_MIGRATIONS[POSTGRES_MIGRATIONS.length - 1]?.version ?? '000';

export interface PgQueryResult<T = Record<string, unknown>> {
  rows: T[];
  rowCount?: number | null;
}

export interface PgClientLike {
  query<T = Record<string, unknown>>(sql: string, params?: unknown[]): Promise<PgQueryResult<T>>;
  release(): void;
}

export interface PgPoolLike {
  connect(): Promise<PgClientLike>;
}

export interface AppliedMigrationRow {
  version: string;
  name: string;
  checksum: string;
  applied_at: string | number;
}

export interface MigrationTamperIssue {
  version: string;
  appliedName: string;
  expectedName: string;
  appliedChecksum: string;
  expectedChecksum: string;
  reason: 'CHECKSUM_MISMATCH' | 'NAME_MISMATCH';
}

export interface MigrationStatusReport {
  currentVersion: string | null;
  latestAvailableVersion: string;
  upToDate: boolean;
  appliedMigrations: Array<{
    version: string;
    name: string;
    checksum: string;
    appliedAt: number;
  }>;
  pendingVersions: string[];
  tamperedMigrations: MigrationTamperIssue[];
  unknownAppliedVersions: string[];
}

export interface MigrationRunResult {
  currentVersion: string | null;
  latestAvailableVersion: string;
  appliedVersions: string[];
  newlyAppliedVersions: string[];
  status: MigrationStatusReport;
}

export class MigrationIntegrityError extends Error {
  public readonly code: 'MIGRATION_CHECKSUM_MISMATCH' | 'UNKNOWN_APPLIED_MIGRATION';
  public readonly issues: MigrationTamperIssue[];
  public readonly unknownVersions: string[];

  constructor(
    code: 'MIGRATION_CHECKSUM_MISMATCH' | 'UNKNOWN_APPLIED_MIGRATION',
    message: string,
    issues: MigrationTamperIssue[] = [],
    unknownVersions: string[] = []
  ) {
    super(message);
    this.name = 'MigrationIntegrityError';
    this.code = code;
    this.issues = issues;
    this.unknownVersions = unknownVersions;
  }
}

export function computeMigrationChecksum(statements: string[]): string {
  return crypto.createHash('sha256').update(statements.join('\n')).digest('hex').slice(0, 16);
}

const MIGRATION_TABLE_DDL = `
  CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    checksum TEXT NOT NULL,
    applied_at BIGINT NOT NULL
  );
`;

const MIGRATION_LOCK_KEY = 94827164;

function buildMigrationStatus(appliedRows: AppliedMigrationRow[]): MigrationStatusReport {
  const byVersion = new Map(POSTGRES_MIGRATIONS.map((m) => [m.version, m]));
  const appliedMigrations: MigrationStatusReport['appliedMigrations'] = [];
  const appliedSet = new Set<string>();
  const tamperedMigrations: MigrationTamperIssue[] = [];
  const unknownAppliedVersions: string[] = [];

  for (const row of appliedRows) {
    const version = String(row.version);
    const appliedName = String(row.name || '');
    const appliedChecksum = String(row.checksum || '');
    const appliedAt = Number(row.applied_at || 0);
    appliedSet.add(version);
    appliedMigrations.push({ version, name: appliedName, checksum: appliedChecksum, appliedAt });

    const def = byVersion.get(version);
    if (!def) {
      unknownAppliedVersions.push(version);
      continue;
    }

    const expectedChecksum = computeMigrationChecksum(def.statements);
    if (appliedName !== def.name) {
      tamperedMigrations.push({
        version,
        appliedName,
        expectedName: def.name,
        appliedChecksum,
        expectedChecksum,
        reason: 'NAME_MISMATCH',
      });
    } else if (appliedChecksum !== expectedChecksum) {
      tamperedMigrations.push({
        version,
        appliedName,
        expectedName: def.name,
        appliedChecksum,
        expectedChecksum,
        reason: 'CHECKSUM_MISMATCH',
      });
    }
  }

  const pendingVersions = POSTGRES_MIGRATIONS.filter((m) => !appliedSet.has(m.version)).map(
    (m) => m.version
  );

  const sortedApplied = appliedMigrations.map((m) => m.version).sort();
  const currentVersion = sortedApplied.length > 0 ? sortedApplied[sortedApplied.length - 1] : null;
  const upToDate =
    pendingVersions.length === 0 &&
    tamperedMigrations.length === 0 &&
    unknownAppliedVersions.length === 0;

  return {
    currentVersion,
    latestAvailableVersion: CURRENT_SCHEMA_VERSION,
    upToDate,
    appliedMigrations,
    pendingVersions,
    tamperedMigrations,
    unknownAppliedVersions,
  };
}

export async function getPostgresMigrationStatus(pool: PgPoolLike): Promise<MigrationStatusReport> {
  const client = await pool.connect();
  try {
    await client.query(MIGRATION_TABLE_DDL);
    const appliedRes = await client.query<AppliedMigrationRow>(
      'SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version ASC'
    );
    return buildMigrationStatus(appliedRes.rows);
  } finally {
    client.release();
  }
}

export async function runPostgresMigrationsDetailed(
  pool: PgPoolLike | pg.Pool
): Promise<MigrationRunResult> {
  const client = await (pool as PgPoolLike).connect();
  try {
    await client.query(MIGRATION_TABLE_DDL);
    await client.query('BEGIN');
    try {
      await client.query(`SELECT pg_advisory_xact_lock(${MIGRATION_LOCK_KEY})`);
      const appliedRes = await client.query<AppliedMigrationRow>(
        'SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version ASC'
      );
      const initialStatus = buildMigrationStatus(appliedRes.rows);

      if (initialStatus.unknownAppliedVersions.length > 0) {
        throw new MigrationIntegrityError(
          'UNKNOWN_APPLIED_MIGRATION',
          `Database PostgreSQL memuat versi migrasi tidak dikenal: ${initialStatus.unknownAppliedVersions.join(', ')}`,
          initialStatus.tamperedMigrations,
          initialStatus.unknownAppliedVersions
        );
      }

      if (initialStatus.tamperedMigrations.length > 0) {
        const first = initialStatus.tamperedMigrations[0];
        throw new MigrationIntegrityError(
          'MIGRATION_CHECKSUM_MISMATCH',
          `Integritas migrasi ${first.version} (${first.expectedName}) gagal: ${first.reason}. Perubahan diam-diam pada migrasi lama ditolak.`,
          initialStatus.tamperedMigrations,
          initialStatus.unknownAppliedVersions
        );
      }

      const appliedSet = new Set(initialStatus.appliedMigrations.map((m) => m.version));
      const newlyAppliedVersions: string[] = [];

      for (const mig of POSTGRES_MIGRATIONS) {
        if (appliedSet.has(mig.version)) continue;
        for (const stmt of mig.statements) {
          await client.query(stmt);
        }
        await client.query(
          `INSERT INTO schema_migrations (version, name, checksum, applied_at)
           VALUES ($1, $2, $3, $4)`,
          [mig.version, mig.name, computeMigrationChecksum(mig.statements), Date.now()]
        );
        appliedSet.add(mig.version);
        newlyAppliedVersions.push(mig.version);
      }

      const finalRes = await client.query<AppliedMigrationRow>(
        'SELECT version, name, checksum, applied_at FROM schema_migrations ORDER BY version ASC'
      );
      const finalStatus = buildMigrationStatus(finalRes.rows);
      await client.query('COMMIT');

      return {
        currentVersion: finalStatus.currentVersion,
        latestAvailableVersion: CURRENT_SCHEMA_VERSION,
        appliedVersions: Array.from(appliedSet).sort(),
        newlyAppliedVersions,
        status: finalStatus,
      };
    } catch (err) {
      await client.query('ROLLBACK').catch(() => {});
      throw err;
    }
  } finally {
    client.release();
  }
}

export async function runPostgresMigrations(pool: PgPoolLike | pg.Pool): Promise<string[]> {
  const result = await runPostgresMigrationsDetailed(pool);
  return result.appliedVersions;
}
