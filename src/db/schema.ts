import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
} from 'drizzle-orm/pg-core';
import type {
  AccessRole,
  BuilderProject,
  FeaturePermissionsMap,
  WebhookEventName,
} from '../types/builder.ts';

export const schemaMigrationsTable = pgTable('schema_migrations', {
  version: text('version').primaryKey(),
  name: text('name').notNull(),
  checksum: text('checksum').notNull(),
  appliedAt: bigint('applied_at', { mode: 'number' }).notNull(),
});

export const usersTable = pgTable(
  'users',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    passwordHash: text('password_hash').notNull(),
    role: text('role').$type<AccessRole>().notNull().default('viewer'),
    isActive: boolean('is_active').notNull().default(true),
    unitScopeJson: jsonb('unit_scope_json').$type<'all' | string[]>().notNull().default([]),
    permissionsJson: jsonb('permissions_json').$type<FeaturePermissionsMap>().notNull(),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
    lastLoginAt: bigint('last_login_at', { mode: 'number' }),
  },
  (table) => [
    index('idx_users_email').on(table.email),
    index('idx_users_email_lower').on(sql`lower(${table.email})`),
  ]
);

export const sessionsTable = pgTable(
  'sessions',
  {
    tokenHash: text('token_hash').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => usersTable.id, { onDelete: 'cascade' }),
    expiresAt: bigint('expires_at', { mode: 'number' }).notNull(),
    userAgent: text('user_agent').notNull().default(''),
    ipAddress: text('ip_address').notNull().default(''),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (table) => [
    index('idx_sessions_user_id').on(table.userId),
    index('idx_sessions_expires_at').on(table.expiresAt),
  ]
);

export const projectsTable = pgTable(
  'projects',
  {
    id: text('id').primaryKey(),
    ownerUserId: text('owner_user_id').references(() => usersTable.id, {
      onDelete: 'set null',
    }),
    revision: integer('revision').notNull().default(1),
    title: text('title').notNull(),
    slug: text('slug').notNull().unique(),
    customDomain: text('custom_domain').notNull().default(''),
    useCustomDomain: boolean('use_custom_domain').notNull().default(false),
    isPublished: boolean('is_published').notNull().default(false),
    publishedAt: bigint('published_at', { mode: 'number' }),
    projectJson: jsonb('project_json').$type<BuilderProject>().notNull(),
    renderedHtml: text('rendered_html').notNull().default(''),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
    lastSavedAt: bigint('last_saved_at', { mode: 'number' }).notNull(),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (table) => [
    index('idx_projects_slug').on(table.slug),
    index('idx_projects_custom_domain').on(table.customDomain),
    index('idx_projects_owner').on(table.ownerUserId),
  ]
);

export const analyticsEventsTable = pgTable(
  'analytics_events',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    projectTitle: text('project_title').notNull(),
    slug: text('slug').notNull().default(''),
    eventType: text('event_type').notNull(),
    channel: text('channel').notNull().default('organic'),
    sourceLabel: text('source_label').notNull().default('Organik'),
    ctaLabel: text('cta_label'),
    waPhone: text('wa_phone'),
    orderValue: bigint('order_value', { mode: 'number' }),
    utmSource: text('utm_source'),
    utmMedium: text('utm_medium'),
    utmCampaign: text('utm_campaign'),
    utmContent: text('utm_content'),
    clickIdType: text('click_id_type'),
    deviceType: text('device_type').notNull().default('desktop'),
    isTest: boolean('is_test').notNull().default(false),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (table) => [
    index('idx_analytics_project_created').on(table.projectId, table.createdAt.desc()),
    index('idx_analytics_created').on(table.createdAt.desc()),
  ]
);

export const accessPoliciesTable = pgTable('access_policies', {
  id: text('id').primaryKey(),
  allUsersSuperAdmin: boolean('all_users_super_admin').notNull().default(false),
  autoGrantSuperAdminOnJoin: boolean('auto_grant_super_admin_on_join').notNull().default(false),
  defaultRole: text('default_role').$type<AccessRole>().notNull().default('viewer'),
  activeMemberId: text('active_member_id').notNull().default('owner-super-admin'),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

export const apiSettingsTable = pgTable('api_settings', {
  id: text('id').primaryKey(),
  publicApiEnabled: boolean('public_api_enabled').notNull().default(true),
  requireAuthForBuilder: boolean('require_auth_for_builder').notNull().default(true),
  demoLoginEnabled: boolean('demo_login_enabled'),
  webhookUrl: text('webhook_url').notNull().default(''),
  webhookEventsJson: jsonb('webhook_events_json')
    .$type<WebhookEventName[]>()
    .notNull()
    .default(['wa_click', 'form_submit', 'project_publish']),
  corsOrigins: text('cors_origins').notNull().default('*'),
  rateLimitPerMinute: integer('rate_limit_per_minute').notNull().default(120),
  metaApiVersion: text('meta_api_version').notNull().default('v21.0'),
  waDefaultCountryCode: text('wa_default_country_code').notNull().default('62'),
  autoPublishOnSave: boolean('auto_publish_on_save').notNull().default(false),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

export const webhookLogsTable = pgTable(
  'webhook_logs',
  {
    id: text('id').primaryKey(),
    eventType: text('event_type').notNull(),
    targetUrl: text('target_url').notNull(),
    statusCode: integer('status_code'),
    success: boolean('success').notNull().default(false),
    payloadSummary: text('payload_summary').notNull().default(''),
    errorMessage: text('error_message'),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (table) => [index('idx_webhook_logs_created').on(table.createdAt.desc())]
);

export const mediaAssetsTable = pgTable(
  'media_assets',
  {
    id: text('id').primaryKey(),
    filename: text('filename').notNull().unique(),
    mimeType: text('mime_type').notNull(),
    sizeBytes: integer('size_bytes').notNull(),
    sha256: text('sha256').notNull(),
    createdBy: text('created_by'),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (table) => [index('idx_media_filename').on(table.filename)]
);
