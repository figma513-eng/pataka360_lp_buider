import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import type { AddressInfo } from 'node:net';

import {
  CURRENT_SCHEMA_VERSION,
  MigrationIntegrityError,
  POSTGRES_MIGRATIONS,
  computeMigrationChecksum,
  getPostgresMigrationStatus,
  runPostgresMigrationsDetailed,
  type AppliedMigrationRow,
  type PgClientLike,
  type PgPoolLike,
  type PgQueryResult,
} from '../src/db/migrations.ts';
import * as pgSchema from '../src/db/schema.ts';
import {
  auditAndMigrateMediaFiles,
  buildSourceSnapshotFromJson,
  compareNormalizedSnapshots,
  loadLocalJsonStoreReadOnly,
  migrateJsonToPostgres,
} from '../src/db/jsonToPgMigrator.ts';
import { getDbState, resetDbConnectionCheck } from '../src/db/index.ts';
import {
  type JsonStoreData,
  createDefaultAccessSettings,
  createDefaultApiSettings,
  getPresetPermissionsForRole,
  hashPassword,
  resetJsonStoreCacheForTests,
} from '../src/db/repository.ts';
import { INITIAL_PROJECT } from '../src/data/presets.ts';
import { createApp } from '../server.ts';

// Valid 1x1 PNG pixel binary
const TINY_PNG_BYTES = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
  'base64'
);

/**
 * Isolated SQL contract test-double for verifying transaction, checksum, and idempotency logic
 * when no PostgreSQL server binary is installed in the workspace container.
 * NOTE: Does NOT count as real PostgreSQL integration testing.
 */
class MockContractPool implements PgPoolLike {
  public migrations = new Map<string, AppliedMigrationRow>();
  private snapshotMigrations: Map<string, AppliedMigrationRow> | null = null;
  public inTransaction = false;
  public queryLog: string[] = [];
  public failOnSqlMatch: string | null = null;

  public users = new Map<string, Record<string, unknown>>();
  public sessions = new Map<string, Record<string, unknown>>();
  public projects = new Map<string, Record<string, unknown>>();
  public analyticsEvents = new Map<string, Record<string, unknown>>();
  public accessPolicies = new Map<string, Record<string, unknown>>();
  public apiSettings = new Map<string, Record<string, unknown>>();
  public webhookLogs = new Map<string, Record<string, unknown>>();
  public mediaAssets = new Map<string, Record<string, unknown>>();
  public uiAppearanceSettings = new Map<string, Record<string, unknown>>();

  private txBackup: {
    users: Map<string, Record<string, unknown>>;
    sessions: Map<string, Record<string, unknown>>;
    projects: Map<string, Record<string, unknown>>;
    analyticsEvents: Map<string, Record<string, unknown>>;
    accessPolicies: Map<string, Record<string, unknown>>;
    apiSettings: Map<string, Record<string, unknown>>;
    webhookLogs: Map<string, Record<string, unknown>>;
    mediaAssets: Map<string, Record<string, unknown>>;
    uiAppearanceSettings: Map<string, Record<string, unknown>>;
  } | null = null;

  async connect(): Promise<PgClientLike> {
    const self = this;
    return {
      async query<T = Record<string, unknown>>(
        sql: string,
        params: unknown[] = []
      ): Promise<PgQueryResult<T>> {
        const trimmed = sql.trim();
        self.queryLog.push(trimmed);

        if (self.failOnSqlMatch && trimmed.includes(self.failOnSqlMatch)) {
          throw new Error(`Simulated SQL failure on: ${self.failOnSqlMatch}`);
        }

        if (trimmed.startsWith('BEGIN')) {
          self.inTransaction = true;
          self.snapshotMigrations = new Map(self.migrations);
          self.txBackup = {
            users: new Map(self.users),
            sessions: new Map(self.sessions),
            projects: new Map(self.projects),
            analyticsEvents: new Map(self.analyticsEvents),
            accessPolicies: new Map(self.accessPolicies),
            apiSettings: new Map(self.apiSettings),
            webhookLogs: new Map(self.webhookLogs),
            mediaAssets: new Map(self.mediaAssets),
            uiAppearanceSettings: new Map(self.uiAppearanceSettings),
          };
          return { rows: [] };
        }
        if (trimmed === 'COMMIT') {
          self.inTransaction = false;
          self.snapshotMigrations = null;
          self.txBackup = null;
          return { rows: [] };
        }
        if (trimmed === 'ROLLBACK') {
          if (self.snapshotMigrations) {
            self.migrations = self.snapshotMigrations;
          }
          if (self.txBackup) {
            self.users = self.txBackup.users;
            self.sessions = self.txBackup.sessions;
            self.projects = self.txBackup.projects;
            self.analyticsEvents = self.txBackup.analyticsEvents;
            self.accessPolicies = self.txBackup.accessPolicies;
            self.apiSettings = self.txBackup.apiSettings;
            self.webhookLogs = self.txBackup.webhookLogs;
            self.mediaAssets = self.txBackup.mediaAssets;
            self.uiAppearanceSettings = self.txBackup.uiAppearanceSettings;
          }
          self.inTransaction = false;
          self.snapshotMigrations = null;
          self.txBackup = null;
          return { rows: [] };
        }
        if (trimmed.startsWith('SELECT pg_advisory_xact_lock')) {
          return { rows: [{ pg_advisory_xact_lock: '' }] as unknown as T[] };
        }
        if (trimmed.includes('FROM schema_migrations')) {
          const rows = Array.from(self.migrations.values()).sort((a, b) =>
            a.version.localeCompare(b.version)
          );
          return { rows: rows as unknown as T[] };
        }
        if (trimmed.startsWith('INSERT INTO schema_migrations')) {
          const [version, name, checksum, applied_at] = params as [
            string,
            string,
            string,
            number,
          ];
          self.migrations.set(version, { version, name, checksum, applied_at });
          return { rows: [], rowCount: 1 };
        }
        if (trimmed.startsWith('INSERT INTO users')) {
          const [
            id,
            name,
            email,
            password_hash,
            role,
            is_active,
            unit_scope_raw,
            permissions_raw,
            created_at,
            updated_at,
            last_login_at,
          ] = params as [
            string,
            string,
            string,
            string,
            string,
            boolean,
            string,
            string,
            number,
            number,
            number | null,
          ];
          self.users.set(id, {
            id,
            name,
            email,
            password_hash,
            role,
            is_active,
            unit_scope_json: JSON.parse(unit_scope_raw),
            permissions_json: JSON.parse(permissions_raw),
            created_at,
            updated_at,
            last_login_at,
          });
          return { rows: [], rowCount: 1 };
        }
        if (trimmed.startsWith('INSERT INTO access_policies')) {
          const [default_role, active_member_id, updated_at] = params as [string, string, number];
          self.accessPolicies.set('default', {
            id: 'default',
            all_users_super_admin: false,
            auto_grant_super_admin_on_join: false,
            default_role,
            active_member_id,
            updated_at,
          });
          return { rows: [], rowCount: 1 };
        }
        if (trimmed.startsWith('INSERT INTO api_settings')) {
          const [
            public_api_enabled,
            require_auth_for_builder,
            webhook_url,
            webhook_events_raw,
            cors_origins,
            rate_limit_per_minute,
            meta_api_version,
            wa_default_country_code,
            auto_publish_on_save,
            updated_at,
          ] = params as [
            boolean,
            boolean,
            string,
            string,
            string,
            number,
            string,
            string,
            boolean,
            number,
          ];
          self.apiSettings.set('default', {
            id: 'default',
            public_api_enabled,
            require_auth_for_builder,
            webhook_url,
            webhook_events_json: JSON.parse(webhook_events_raw),
            cors_origins,
            rate_limit_per_minute,
            meta_api_version,
            wa_default_country_code,
            auto_publish_on_save,
            updated_at,
          });
          return { rows: [], rowCount: 1 };
        }
        if (trimmed.startsWith('INSERT INTO ui_appearance_settings')) {
          const [labels_raw, updated_at] = params as [string, number];
          self.uiAppearanceSettings.set('default', {
            id: 'default',
            labels_json: JSON.parse(labels_raw),
            updated_at,
          });
          return { rows: [], rowCount: 1 };
        }
        if (trimmed.startsWith('INSERT INTO projects')) {
          const [
            id,
            owner_user_id,
            revision,
            title,
            slug,
            custom_domain,
            use_custom_domain,
            is_published,
            published_at,
            project_raw,
            rendered_html,
            updated_at,
            last_saved_at,
            created_at,
          ] = params as [
            string,
            string | null,
            number,
            string,
            string,
            string,
            boolean,
            boolean,
            number | null,
            string,
            string,
            number,
            number,
            number,
          ];
          self.projects.set(id, {
            id,
            owner_user_id,
            revision,
            title,
            slug,
            custom_domain,
            use_custom_domain,
            is_published,
            published_at,
            project_json: JSON.parse(project_raw),
            rendered_html,
            updated_at,
            last_saved_at,
            created_at,
          });
          return { rows: [], rowCount: 1 };
        }
        if (trimmed.startsWith('INSERT INTO analytics_events')) {
          const [
            id,
            project_id,
            project_title,
            slug,
            event_type,
            channel,
            source_label,
            cta_label,
            wa_phone,
            order_value,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            click_id_type,
            device_type,
            is_test,
            created_at,
          ] = params as [
            string,
            string,
            string,
            string,
            string,
            string,
            string,
            string | null,
            string | null,
            number | null,
            string | null,
            string | null,
            string | null,
            string | null,
            string | null,
            string,
            boolean,
            number,
          ];
          self.analyticsEvents.set(id, {
            id,
            project_id,
            project_title,
            slug,
            event_type,
            channel,
            source_label,
            cta_label,
            wa_phone,
            order_value,
            utm_source,
            utm_medium,
            utm_campaign,
            utm_content,
            click_id_type,
            device_type,
            is_test,
            created_at,
          });
          return { rows: [], rowCount: 1 };
        }
        if (trimmed.startsWith('INSERT INTO webhook_logs')) {
          const [id, event_type, target_url, status_code, success, payload_summary, error_message, created_at] =
            params as [string, string, string, number | null, boolean, string, string | null, number];
          self.webhookLogs.set(id, {
            id,
            event_type,
            target_url,
            status_code,
            success,
            payload_summary,
            error_message,
            created_at,
          });
          return { rows: [], rowCount: 1 };
        }
        if (trimmed.startsWith('INSERT INTO media_assets')) {
          const [id, filename, mime_type, size_bytes, sha256, created_by, created_at] = params as [
            string,
            string,
            string,
            number,
            string,
            string | null,
            number,
          ];
          self.mediaAssets.set(id, {
            id,
            filename,
            mime_type,
            size_bytes,
            sha256,
            created_by,
            created_at,
          });
          return { rows: [], rowCount: 1 };
        }
        if (trimmed.startsWith('INSERT INTO sessions')) {
          const [token_hash, user_id, expires_at, user_agent, ip_address, created_at] = params as [
            string,
            string,
            number,
            string,
            string,
            number,
          ];
          self.sessions.set(token_hash, {
            token_hash,
            user_id,
            expires_at,
            user_agent,
            ip_address,
            created_at,
          });
          return { rows: [], rowCount: 1 };
        }
        if (trimmed.startsWith('SELECT * FROM users')) {
          return { rows: Array.from(self.users.values()) as unknown as T[] };
        }
        if (trimmed.startsWith('SELECT * FROM projects')) {
          return { rows: Array.from(self.projects.values()) as unknown as T[] };
        }
        if (trimmed.startsWith('SELECT * FROM analytics_events')) {
          return { rows: Array.from(self.analyticsEvents.values()) as unknown as T[] };
        }
        if (trimmed.startsWith('SELECT * FROM access_policies')) {
          return { rows: Array.from(self.accessPolicies.values()) as unknown as T[] };
        }
        if (trimmed.startsWith('SELECT * FROM api_settings')) {
          return { rows: Array.from(self.apiSettings.values()) as unknown as T[] };
        }
        if (trimmed.startsWith('SELECT * FROM webhook_logs')) {
          return { rows: Array.from(self.webhookLogs.values()) as unknown as T[] };
        }
        if (trimmed.startsWith('SELECT * FROM media_assets')) {
          return { rows: Array.from(self.mediaAssets.values()) as unknown as T[] };
        }
        if (trimmed.startsWith('SELECT * FROM sessions')) {
          return { rows: Array.from(self.sessions.values()) as unknown as T[] };
        }
        if (trimmed.startsWith('SELECT * FROM ui_appearance_settings')) {
          return { rows: Array.from(self.uiAppearanceSettings.values()) as unknown as T[] };
        }
        return { rows: [] };
      },
      release() {},
    };
  }
}

function buildSampleStore(now = Date.now()): JsonStoreData {
  const adminId = 'usr_super_01';
  const editorId = 'usr_editor_01';
  const projectA = {
    id: 'proj_main_01',
    revision: 3,
    updatedAt: now - 5000,
    lastSavedAt: now - 5000,
    project: {
      ...INITIAL_PROJECT,
      title: 'Klinik Sehat Nusantara',
      publishing: {
        customDomain: '',
        useCustomDomain: false,
        ...INITIAL_PROJECT.publishing,
        slug: 'klinik-sehat',
        isPublished: true,
        publishedAt: now - 4000,
      },
    },
  };

  return {
    schemaVersion: 1,
    dbEngine: 'local-json',
    users: [
      {
        id: adminId,
        name: 'Pemilik Utama',
        email: 'Owner@LynkBuilder.Local',
        passwordHash: hashPassword('StrongAdmin!Pass99'),
        role: 'super_admin',
        isActive: true,
        unitScope: 'all',
        permissions: getPresetPermissionsForRole('super_admin'),
        createdAt: now - 20000,
        updatedAt: now - 10000,
        lastLoginAt: now - 1000,
      },
      {
        id: editorId,
        name: 'Editor Konten',
        email: 'editor@lynkbuilder.local',
        passwordHash: hashPassword('StrongEditor!Pass99'),
        role: 'editor',
        isActive: true,
        unitScope: ['proj_main_01'],
        permissions: getPresetPermissionsForRole('editor'),
        createdAt: now - 15000,
        updatedAt: now - 9000,
        lastLoginAt: null,
      },
    ],
    sessions: [
      {
        tokenHash: crypto.createHash('sha256').update('active-session-token').digest('hex'),
        userId: adminId,
        expiresAt: now + 3600_000,
        userAgent: 'TestAgent/1.0',
        ipAddress: '127.0.0.1',
        createdAt: now - 2000,
      },
    ],
    projects: {
      proj_main_01: {
        record: projectA,
        renderedHtml: '<!doctype html><html><body><h1>Klinik Sehat Nusantara</h1></body></html>',
        savedAt: now - 5000,
        ownerUserId: adminId,
      },
    },
    events: [
      {
        id: 'evt_large_order_01',
        projectId: 'proj_main_01',
        projectTitle: 'Klinik Sehat Nusantara',
        slug: 'klinik-sehat',
        eventType: 'form_submit',
        channel: 'meta',
        sourceLabel: 'Meta Ads',
        orderValue: 5_000_000_000, // Exceeds 32-bit INTEGER (>2.14B IDR) to verify BIGINT alignment
        deviceType: 'mobile',
        isTest: false,
        createdAt: now - 3000,
      },
    ],
    accessSettings: {
      ...createDefaultAccessSettings(),
      defaultRole: 'viewer',
      updatedAt: now - 7000,
    },
    apiSettings: {
      ...createDefaultApiSettings(),
      rateLimitPerMinute: 180,
      updatedAt: now - 6000,
    },
    webhookLogs: [
      {
        id: 'wh_01',
        eventType: 'project_publish',
        targetUrl: 'https://hooks.example.com/lynk',
        statusCode: 200,
        success: true,
        payloadSummary: '{"slug":"klinik-sehat"}',
        createdAt: now - 4000,
      },
    ],
    mediaAssets: [],
  };
}

describe('PostgreSQL Readiness, Schema Sync & JSON->PG Migration Suite', () => {
  it('1. Schema synchronization: schema.sql, schema.ts, and migrations.ts are aligned across all 10 tables & v005 indexes', async () => {
    const schemaSql = await fs.readFile(path.resolve('src/db/schema.sql'), 'utf-8');
    const schemaTs = await fs.readFile(path.resolve('src/db/schema.ts'), 'utf-8');

    const expectedTables = [
      'schema_migrations',
      'users',
      'sessions',
      'projects',
      'analytics_events',
      'access_policies',
      'api_settings',
      'webhook_logs',
      'media_assets',
      'ui_appearance_settings',
    ];
    for (const table of expectedTables) {
      assert.ok(
        schemaSql.includes(`CREATE TABLE IF NOT EXISTS ${table}`),
        `schema.sql missing table ${table}`
      );
    }

    assert.equal(Object.keys(pgSchema).length >= 10, true);
    assert.equal(CURRENT_SCHEMA_VERSION, '005');
    assert.equal(POSTGRES_MIGRATIONS.map((m) => m.version).join(','), '001,002,003,004,005');

    // Verify v004 BIGINT and idx_users_email_lower alignment across all three files
    assert.ok(schemaSql.includes('order_value BIGINT'));
    assert.ok(schemaSql.includes('idx_users_email_lower ON users (lower(email))'));
    assert.ok(schemaTs.includes("bigint('order_value', { mode: 'number' })"));
    assert.ok(schemaTs.includes("index('idx_users_email_lower')"));
    assert.ok(
      POSTGRES_MIGRATIONS[3].statements.some((s) =>
        s.includes('ALTER TABLE analytics_events ALTER COLUMN order_value TYPE BIGINT')
      )
    );
    assert.ok(
      POSTGRES_MIGRATIONS[3].statements.some((s) =>
        s.includes('CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email))')
      )
    );
  });

  it('2. Migration runner contract: enforces transactions, advisory lock, schema version reporting, and rejects silent historical edits', async () => {
    const pool = new MockContractPool();

    const first = await runPostgresMigrationsDetailed(pool);
    assert.equal(first.currentVersion, '005');
    assert.equal(first.latestAvailableVersion, '005');
    assert.deepEqual(first.newlyAppliedVersions, ['001', '002', '003', '004', '005']);
    assert.ok(pool.queryLog.includes('BEGIN'));
    assert.ok(pool.queryLog.some((q) => q.includes('pg_advisory_xact_lock')));
    assert.ok(pool.queryLog.includes('COMMIT'));

    // Re-running must be strictly idempotent
    const second = await runPostgresMigrationsDetailed(pool);
    assert.equal(second.currentVersion, '005');
    assert.deepEqual(second.newlyAppliedVersions, []);
    assert.equal(second.status.upToDate, true);

    // Silent modification to an applied historical migration must be rejected cleanly
    const existing001 = pool.migrations.get('001')!;
    pool.migrations.set('001', {
      ...existing001,
      checksum: 'deadbeef00000000',
    });

    const status = await getPostgresMigrationStatus(pool);
    assert.equal(status.upToDate, false);
    assert.equal(status.tamperedMigrations.length, 1);
    assert.equal(status.tamperedMigrations[0].reason, 'CHECKSUM_MISMATCH');

    await assert.rejects(
      () => runPostgresMigrationsDetailed(pool),
      (err: unknown) =>
        err instanceof MigrationIntegrityError && err.code === 'MIGRATION_CHECKSUM_MISMATCH'
    );

    // Unknown applied version in DB must also fail closed
    pool.migrations.set('001', {
      ...existing001,
      checksum: computeMigrationChecksum(POSTGRES_MIGRATIONS[0].statements),
    });
    pool.migrations.set('999', {
      version: '999',
      name: 'future_unknown',
      checksum: '1234567890abcdef',
      applied_at: Date.now(),
    });
    await assert.rejects(
      () => runPostgresMigrationsDetailed(pool),
      (err: unknown) =>
        err instanceof MigrationIntegrityError && err.code === 'UNKNOWN_APPLIED_MIGRATION'
    );
  });

  it('3. Media migration: copies physical files atomically, verifies size & SHA-256, recovers orphans, and validates URLs', async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'lynk-media-mig-'));
    try {
      const srcMediaDir = path.join(tmpRoot, 'src-media');
      const dstMediaDir = path.join(tmpRoot, 'dst-media');
      await fs.mkdir(srcMediaDir, { recursive: true });

      const knownFile = 'med_logo0001.png';
      const orphanFile = 'med_orphan02.png';
      await fs.writeFile(path.join(srcMediaDir, knownFile), TINY_PNG_BYTES);
      await fs.writeFile(path.join(srcMediaDir, orphanFile), TINY_PNG_BYTES);

      const expectedSha = crypto.createHash('sha256').update(TINY_PNG_BYTES).digest('hex');

      // Dry-run must NOT write to targetMediaDir
      const dryReport = await auditAndMigrateMediaFiles({
        sourceMediaDir: srcMediaDir,
        targetMediaDir: dstMediaDir,
        metadataList: [
          {
            id: 'med_logo0001',
            filename: knownFile,
            url: `/api/media/${knownFile}`,
            mimeType: 'image/png',
            sizeBytes: TINY_PNG_BYTES.length,
            sha256: expectedSha,
            createdAt: Date.now(),
          },
        ],
        dryRun: true,
      });
      assert.equal(dryReport.verifiedCount, 2);
      assert.equal(dryReport.copiedCount, 0);
      assert.deepEqual(dryReport.recoveredOrphanFiles, [orphanFile]);
      await assert.rejects(() => fs.stat(dstMediaDir));

      // Apply mode must copy & verify exact bytes + SHA-256
      const applyReport = await auditAndMigrateMediaFiles({
        sourceMediaDir: srcMediaDir,
        targetMediaDir: dstMediaDir,
        metadataList: [
          {
            id: 'med_logo0001',
            filename: knownFile,
            url: `/api/media/${knownFile}`,
            mimeType: 'image/png',
            sizeBytes: TINY_PNG_BYTES.length,
            sha256: expectedSha,
            createdAt: Date.now(),
          },
        ],
        dryRun: false,
      });
      assert.equal(applyReport.copiedCount, 2);
      assert.equal(applyReport.missingOnDisk.length, 0);
      assert.equal(applyReport.checksumOrSizeMismatches.length, 0);

      for (const entry of applyReport.entries) {
        assert.equal(entry.url, `/api/media/${entry.filename}`);
        const copiedBytes = await fs.readFile(path.join(dstMediaDir, entry.filename));
        assert.equal(copiedBytes.length, entry.sizeBytes);
        assert.equal(
          crypto.createHash('sha256').update(copiedBytes).digest('hex'),
          entry.sha256
        );
      }
    } finally {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it('4. JSON->PG migrator: dry-run, source immutability, idempotent apply, default session exclusion, and rollback on failure', async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'lynk-json2pg-'));
    try {
      const srcDataDir = path.join(tmpRoot, 'src-data');
      const srcMediaDir = path.join(srcDataDir, 'media');
      const dstMediaDir = path.join(tmpRoot, 'dst-media');
      await fs.mkdir(srcMediaDir, { recursive: true });

      const mediaFilename = 'med_hero0001.png';
      await fs.writeFile(path.join(srcMediaDir, mediaFilename), TINY_PNG_BYTES);
      const mediaSha = crypto.createHash('sha256').update(TINY_PNG_BYTES).digest('hex');

      const sampleStore = buildSampleStore();
      sampleStore.mediaAssets = [
        {
          id: 'med_hero0001',
          filename: mediaFilename,
          url: `/api/media/${mediaFilename}`,
          mimeType: 'image/png',
          sizeBytes: TINY_PNG_BYTES.length,
          sha256: mediaSha,
          createdAt: Date.now() - 2000,
        },
      ];

      const storePath = path.join(srcDataDir, 'lynk-server-store.json');
      const rawBefore = JSON.stringify(sampleStore, null, 2);
      await fs.writeFile(storePath, rawBefore, 'utf-8');

      // Dry-run works without a pool and skips sessions by default
      const dryRes = await migrateJsonToPostgres({
        sourceStorePath: storePath,
        sourceMediaDir: srcMediaDir,
        targetMediaDir: dstMediaDir,
        dryRun: true,
      });
      assert.equal(dryRes.ok, true);
      assert.equal(dryRes.applied, false);
      assert.equal(dryRes.plan.counts.users, 2);
      assert.equal(dryRes.plan.counts.sessionsTotal, 1);
      assert.equal(dryRes.plan.counts.sessionsToMigrate, 0);
      assert.equal(dryRes.plan.counts.sessionsSkippedByPolicy, 1);
      assert.equal(dryRes.plan.counts.projects, 1);
      assert.equal(dryRes.plan.counts.analyticsEvents, 1);
      assert.equal(dryRes.plan.counts.mediaAssets, 1);

      // Apply migration twice against mock SQL contract pool (verifying idempotency)
      const pool = new MockContractPool();
      const firstApply = await migrateJsonToPostgres({
        pool,
        sourceStorePath: storePath,
        sourceMediaDir: srcMediaDir,
        targetMediaDir: dstMediaDir,
        dryRun: false,
      });
      assert.equal(firstApply.ok, true);
      assert.equal(firstApply.applied, true);
      assert.equal(firstApply.postgresMigrations?.currentVersion, '005');
      assert.equal(firstApply.integrityReport?.ok, true);
      assert.equal(pool.sessions.size, 0, 'Active sessions must NOT be migrated by default');

      const secondApply = await migrateJsonToPostgres({
        pool,
        sourceStorePath: storePath,
        sourceMediaDir: srcMediaDir,
        targetMediaDir: dstMediaDir,
        dryRun: false,
      });
      assert.equal(secondApply.ok, true);
      assert.equal(secondApply.integrityReport?.ok, true);
      assert.equal(pool.users.size, 2);
      assert.equal(pool.projects.size, 1);
      assert.equal(pool.analyticsEvents.size, 1);
      assert.equal(pool.mediaAssets.size, 1);

      // Verify source JSON was NEVER modified or deleted
      const rawAfter = await fs.readFile(storePath, 'utf-8');
      assert.equal(rawAfter, rawBefore);

      // Verify transactional rollback when a mid-migration INSERT fails
      const failingPool = new MockContractPool();
      failingPool.failOnSqlMatch = 'INSERT INTO analytics_events';
      await assert.rejects(() =>
        migrateJsonToPostgres({
          pool: failingPool,
          sourceStorePath: storePath,
          sourceMediaDir: srcMediaDir,
          targetMediaDir: dstMediaDir,
          dryRun: false,
        })
      );
      assert.equal(failingPool.users.size, 0, 'Users insert must roll back on analytics error');
      assert.equal(failingPool.projects.size, 0, 'Projects insert must roll back on analytics error');

      // Duplicate slug in JSON must block pre-flight cleanly
      const dupStore = buildSampleStore();
      dupStore.projects.proj_dup = {
        ...dupStore.projects.proj_main_01,
        record: {
          ...dupStore.projects.proj_main_01.record,
          id: 'proj_dup',
        },
      };
      const dupPath = path.join(srcDataDir, 'dup-store.json');
      await fs.writeFile(dupPath, JSON.stringify(dupStore), 'utf-8');
      const dupPlan = await migrateJsonToPostgres({
        sourceStorePath: dupPath,
        sourceMediaDir: srcMediaDir,
        dryRun: true,
      });
      assert.equal(dupPlan.ok, false);
      assert.equal(dupPlan.plan.blockedByErrors, true);
      assert.ok(dupPlan.plan.issues.some((i) => i.code === 'DUPLICATE_PROJECT_SLUG'));
    } finally {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it('5. Data integrity comparator: detects missing IDs, altered passwordHash, altered JSONB, altered BIGINT analytics, and corrupted disk media', async () => {
    const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), 'lynk-diff-'));
    try {
      const mediaDir = path.join(tmpRoot, 'media');
      await fs.mkdir(mediaDir, { recursive: true });
      const filename = 'med_check0001.png';
      await fs.writeFile(path.join(mediaDir, filename), TINY_PNG_BYTES);
      const sha = crypto.createHash('sha256').update(TINY_PNG_BYTES).digest('hex');

      const store = buildSampleStore();
      store.mediaAssets = [
        {
          id: 'med_check0001',
          filename,
          url: `/api/media/${filename}`,
          mimeType: 'image/png',
          sizeBytes: TINY_PNG_BYTES.length,
          sha256: sha,
          createdAt: Date.now() - 1000,
        },
      ];
      const storePath = path.join(tmpRoot, 'lynk-server-store.json');
      await fs.writeFile(storePath, JSON.stringify(store), 'utf-8');

      const loaded = await loadLocalJsonStoreReadOnly(storePath);
      const mediaReport = await auditAndMigrateMediaFiles({
        sourceMediaDir: mediaDir,
        targetMediaDir: mediaDir,
        metadataList: loaded.store.mediaAssets || [],
        dryRun: true,
      });

      const sourceSnap = buildSourceSnapshotFromJson({
        store: loaded.store,
        mediaEntries: mediaReport.entries,
        includeSessions: false,
      });
      const alteredSnap = structuredClone(sourceSnap);
      alteredSnap.users[0].passwordHash = 'tampered:hash';
      alteredSnap.projects[0].projectJsonCanonical = '{"tampered":true}';
      alteredSnap.analyticsEvents[0].orderValue = 999;
      alteredSnap.webhookLogs = [];

      // Corrupt media file on disk to test disk SHA-256 verification
      await fs.writeFile(path.join(mediaDir, filename), Buffer.from('corrupt-bytes'));

      const diff = await compareNormalizedSnapshots({
        source: sourceSnap,
        target: alteredSnap,
        includeSessions: false,
        targetMediaDir: mediaDir,
      });

      assert.equal(diff.ok, false);
      assert.deepEqual(diff.tables.users.fieldMismatches[0].fields, ['passwordHash']);
      assert.deepEqual(diff.tables.projects.fieldMismatches[0].fields, ['projectJson']);
      assert.deepEqual(diff.tables.analytics_events.fieldMismatches[0].fields, ['orderValue']);
      assert.deepEqual(diff.tables.webhook_logs.missingInTarget, ['wh_01']);
      assert.equal(diff.mediaDiskVerification.ok, false);
      assert.deepEqual(diff.mediaDiskVerification.mismatchedFiles, [filename]);

      // Ensure comparison report never leaks raw password hashes
      const serialized = JSON.stringify(diff);
      assert.equal(serialized.includes('tampered:hash'), false);
      assert.equal(serialized.includes(sourceSnap.users[0].passwordHash), false);
    } finally {
      await fs.rm(tmpRoot, { recursive: true, force: true });
    }
  });

  it('6. Fail-closed connection test: DB_ENGINE=postgresql with unreachable endpoint fails closed (503, no silent Local JSON fallback)', async () => {
    const tmpDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lynk-pg-failclosed-'));
    const prevEnv = {
      DB_ENGINE: process.env.DB_ENGINE,
      PGHOST: process.env.PGHOST,
      PGPORT: process.env.PGPORT,
      PGUSER: process.env.PGUSER,
      PGPASSWORD: process.env.PGPASSWORD,
      PGDATABASE: process.env.PGDATABASE,
      PGSSL: process.env.PGSSL,
      DATABASE_URL: process.env.DATABASE_URL,
      ALLOW_LOCAL_JSON_FALLBACK: process.env.ALLOW_LOCAL_JSON_FALLBACK,
      REQUIRE_POSTGRES: process.env.REQUIRE_POSTGRES,
      LYNK_DATA_DIR: process.env.LYNK_DATA_DIR,
    };

    let server: http.Server | null = null;
    try {
      delete process.env.DATABASE_URL;
      delete process.env.ALLOW_LOCAL_JSON_FALLBACK;
      process.env.DB_ENGINE = 'postgresql';
      process.env.REQUIRE_POSTGRES = 'true';
      process.env.PGHOST = '127.0.0.1';
      process.env.PGPORT = '59999';
      process.env.PGUSER = 'lynk_test';
      process.env.PGPASSWORD = 'invalid';
      process.env.PGDATABASE = 'lynk_test';
      process.env.PGSSL = 'false';
      process.env.LYNK_DATA_DIR = tmpDataDir;

      resetJsonStoreCacheForTests();
      const state = await resetDbConnectionCheck();
      assert.equal(state.engine, 'postgresql');
      assert.equal(state.connected, false);
      assert.equal(state.ready, false);
      assert.equal(state.degraded, true);

      const dbStateAgain = await getDbState();
      assert.equal(dbStateAgain.engine, 'postgresql');
      assert.equal(dbStateAgain.ready, false);

      const app = await createApp({ attachViteOrStatic: false });
      const activeServer = await new Promise<http.Server>((resolve) => {
        const s = app.listen(0, '127.0.0.1', () => resolve(s));
      });
      server = activeServer;
      const addr = activeServer.address() as AddressInfo;
      const readyRes = await fetch(`http://127.0.0.1:${addr.port}/api/health/ready`);
      assert.equal(readyRes.status, 503);
      const readyBody = (await readyRes.json()) as {
        ready: boolean;
        degraded: boolean;
        dbEngine: string;
        dbConnected: boolean;
      };
      assert.equal(readyBody.ready, false);
      assert.equal(readyBody.degraded, true);
      assert.equal(readyBody.dbEngine, 'postgresql');
      assert.equal(readyBody.dbConnected, false);
    } finally {
      if (server) {
        await new Promise<void>((resolve) => server!.close(() => resolve()));
      }
      for (const [k, v] of Object.entries(prevEnv)) {
        if (v === undefined) {
          delete process.env[k];
        } else {
          process.env[k] = v;
        }
      }
      resetJsonStoreCacheForTests();
      await resetDbConnectionCheck();
      await fs.rm(tmpDataDir, { recursive: true, force: true });
    }
  });
});
