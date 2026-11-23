import { sql } from 'drizzle-orm';
import {
  bigint,
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  uniqueIndex,
} from 'drizzle-orm/pg-core';
import type {
  AccessRole,
  AdChannel,
  BuilderProject,
  FeaturePermissionsMap,
  SaasPlanTier,
  UiAppearanceLabelsMap,
  WebTemplateCategory,
  WebTemplateSnapshot,
  WebTemplateVisibility,
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
    planTier: text('plan_tier').$type<SaasPlanTier>().notNull().default('free'),
    maxSites: integer('max_sites').notNull().default(3),
    subscriptionExpiresAt: bigint('subscription_expires_at', { mode: 'number' }),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
    lastLoginAt: bigint('last_login_at', { mode: 'number' }),
  },
  (table) => [
    index('idx_users_email').on(table.email),
    index('idx_users_email_lower').on(sql`lower(${table.email})`),
    uniqueIndex('idx_users_email_lower_unique').on(sql`lower(${table.email})`),
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
    sourceTemplateId: text('source_template_id'),
    posStoreId: text('pos_store_id'),
    posSyncEnabled: boolean('pos_sync_enabled').notNull().default(false),
    projectJson: jsonb('project_json').$type<BuilderProject>().notNull(),
    renderedHtml: text('rendered_html').notNull().default(''),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
    lastSavedAt: bigint('last_saved_at', { mode: 'number' }).notNull(),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (table) => [
    index('idx_projects_slug').on(table.slug),
    uniqueIndex('idx_projects_slug_lower_unique').on(sql`lower(${table.slug})`),
    index('idx_projects_custom_domain').on(table.customDomain),
    index('idx_projects_owner').on(table.ownerUserId),
    index('idx_projects_pos_store_id').on(table.posStoreId),
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

export const uiAppearanceSettingsTable = pgTable('ui_appearance_settings', {
  id: text('id').primaryKey(),
  labelsJson: jsonb('labels_json').$type<UiAppearanceLabelsMap>().notNull().default({}),
  updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
});

export const webTemplatesTable = pgTable(
  'web_templates',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    description: text('description').notNull().default(''),
    category: text('category').$type<WebTemplateCategory>().notNull().default('bisnis'),
    visibility: text('visibility').$type<WebTemplateVisibility>().notNull().default('shared'),
    allowCollaborativeEdit: boolean('allow_collaborative_edit').notNull().default(false),
    snapshotJson: jsonb('snapshot_json').$type<WebTemplateSnapshot>().notNull(),
    mainBlockCount: integer('main_block_count').notNull().default(0),
    subPageCount: integer('sub_page_count').notNull().default(0),
    totalBlockCount: integer('total_block_count').notNull().default(0),
    subPageTitlesJson: jsonb('sub_page_titles_json').$type<string[]>().notNull().default([]),
    paletteColorsJson: jsonb('palette_colors_json').$type<string[]>().notNull().default([]),
    createdByUserId: text('created_by_user_id').notNull(),
    createdByName: text('created_by_name').notNull().default('Pengguna'),
    updatedByName: text('updated_by_name'),
    usageCount: integer('usage_count').notNull().default(0),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
    updatedAt: bigint('updated_at', { mode: 'number' }).notNull(),
  },
  (table) => [
    index('idx_web_templates_updated').on(table.updatedAt.desc()),
    index('idx_web_templates_visibility').on(table.visibility),
    index('idx_web_templates_category').on(table.category),
  ]
);

export const formSubmissionsTable = pgTable(
  'form_submissions',
  {
    id: text('id').primaryKey(),
    projectId: text('project_id').notNull(),
    projectTitle: text('project_title').notNull(),
    slug: text('slug').notNull().default(''),
    componentId: text('component_id').notNull(),
    formTitle: text('form_title').notNull(),
    formCategory: text('form_category'),
    valuesJson: jsonb('values_json')
      .$type<Record<string, string | string[] | boolean>>()
      .notNull()
      .default({}),
    sourceChannel: text('source_channel').$type<AdChannel>(),
    isTest: boolean('is_test').notNull().default(false),
    createdAt: bigint('created_at', { mode: 'number' }).notNull(),
  },
  (table) => [
    index('idx_form_submissions_project_created').on(table.projectId, table.createdAt.desc()),
    index('idx_form_submissions_created').on(table.createdAt.desc()),
  ]
);
