-- Lynk Builder — Skema PostgreSQL Lengkap (v007)
-- Sinkron 100% dengan src/db/schema.ts & src/db/migrations.ts
-- Siap untuk SaaS Multi-Pembeli + Jembatan Integrasi POS Next.js
-- PostgreSQL 14+

CREATE TABLE IF NOT EXISTS schema_migrations (
  version TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  checksum TEXT NOT NULL,
  applied_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'viewer',
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  unit_scope_json JSONB NOT NULL DEFAULT '[]'::jsonb,
  permissions_json JSONB NOT NULL,
  plan_tier TEXT NOT NULL DEFAULT 'free',
  max_sites INTEGER NOT NULL DEFAULT 3,
  subscription_expires_at BIGINT,
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  last_login_at BIGINT
);
ALTER TABLE users ADD COLUMN IF NOT EXISTS plan_tier TEXT NOT NULL DEFAULT 'free';
ALTER TABLE users ADD COLUMN IF NOT EXISTS max_sites INTEGER NOT NULL DEFAULT 3;
ALTER TABLE users ADD COLUMN IF NOT EXISTS subscription_expires_at BIGINT;
UPDATE users SET email = lower(email) WHERE email <> lower(email);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower_unique ON users (lower(email));

CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at BIGINT NOT NULL,
  user_agent TEXT NOT NULL DEFAULT '',
  ip_address TEXT NOT NULL DEFAULT '',
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions (user_id);
CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions (expires_at);

CREATE TABLE IF NOT EXISTS projects (
  id TEXT PRIMARY KEY,
  owner_user_id TEXT REFERENCES users(id) ON DELETE SET NULL,
  revision INTEGER NOT NULL DEFAULT 1,
  title TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  custom_domain TEXT NOT NULL DEFAULT '',
  use_custom_domain BOOLEAN NOT NULL DEFAULT FALSE,
  is_published BOOLEAN NOT NULL DEFAULT FALSE,
  published_at BIGINT,
  source_template_id TEXT,
  pos_store_id TEXT,
  pos_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  project_json JSONB NOT NULL,
  rendered_html TEXT NOT NULL DEFAULT '',
  updated_at BIGINT NOT NULL,
  last_saved_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS source_template_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pos_store_id TEXT;
ALTER TABLE projects ADD COLUMN IF NOT EXISTS pos_sync_enabled BOOLEAN NOT NULL DEFAULT FALSE;
UPDATE projects SET slug = lower(slug) WHERE slug <> lower(slug);
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects (slug);
CREATE UNIQUE INDEX IF NOT EXISTS idx_projects_slug_lower_unique ON projects (lower(slug));
CREATE INDEX IF NOT EXISTS idx_projects_custom_domain ON projects (custom_domain);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects (owner_user_id);
CREATE INDEX IF NOT EXISTS idx_projects_pos_store_id ON projects (pos_store_id);

CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  project_title TEXT NOT NULL,
  slug TEXT NOT NULL DEFAULT '',
  event_type TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'organic',
  source_label TEXT NOT NULL DEFAULT 'Organik',
  cta_label TEXT,
  wa_phone TEXT,
  order_value BIGINT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  click_id_type TEXT,
  device_type TEXT NOT NULL DEFAULT 'desktop',
  is_test BOOLEAN NOT NULL DEFAULT FALSE,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_analytics_project_created ON analytics_events (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_created ON analytics_events (created_at DESC);

CREATE TABLE IF NOT EXISTS form_submissions (
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
);
CREATE INDEX IF NOT EXISTS idx_form_submissions_project_created ON form_submissions (project_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_form_submissions_created ON form_submissions (created_at DESC);

CREATE TABLE IF NOT EXISTS access_policies (
  id TEXT PRIMARY KEY,
  all_users_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
  auto_grant_super_admin_on_join BOOLEAN NOT NULL DEFAULT FALSE,
  default_role TEXT NOT NULL DEFAULT 'viewer',
  active_member_id TEXT NOT NULL DEFAULT 'owner-super-admin',
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS api_settings (
  id TEXT PRIMARY KEY,
  public_api_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  require_auth_for_builder BOOLEAN NOT NULL DEFAULT TRUE,
  demo_login_enabled BOOLEAN,
  webhook_url TEXT NOT NULL DEFAULT '',
  webhook_events_json JSONB NOT NULL DEFAULT '["wa_click","form_submit","project_publish"]'::jsonb,
  cors_origins TEXT NOT NULL DEFAULT '*',
  rate_limit_per_minute INTEGER NOT NULL DEFAULT 120,
  meta_api_version TEXT NOT NULL DEFAULT 'v21.0',
  wa_default_country_code TEXT NOT NULL DEFAULT '62',
  auto_publish_on_save BOOLEAN NOT NULL DEFAULT FALSE,
  updated_at BIGINT NOT NULL
);
ALTER TABLE api_settings ADD COLUMN IF NOT EXISTS demo_login_enabled BOOLEAN;

CREATE TABLE IF NOT EXISTS webhook_logs (
  id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  target_url TEXT NOT NULL,
  status_code INTEGER,
  success BOOLEAN NOT NULL DEFAULT FALSE,
  payload_summary TEXT NOT NULL DEFAULT '',
  error_message TEXT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_webhook_logs_created ON webhook_logs (created_at DESC);

CREATE TABLE IF NOT EXISTS media_assets (
  id TEXT PRIMARY KEY,
  filename TEXT NOT NULL UNIQUE,
  mime_type TEXT NOT NULL,
  size_bytes INTEGER NOT NULL,
  sha256 TEXT NOT NULL,
  created_by TEXT,
  created_at BIGINT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_media_filename ON media_assets (filename);

CREATE TABLE IF NOT EXISTS ui_appearance_settings (
  id TEXT PRIMARY KEY,
  labels_json JSONB NOT NULL DEFAULT '{}'::jsonb,
  updated_at BIGINT NOT NULL
);

CREATE TABLE IF NOT EXISTS web_templates (
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
);
CREATE INDEX IF NOT EXISTS idx_web_templates_updated ON web_templates (updated_at DESC);
CREATE INDEX IF NOT EXISTS idx_web_templates_visibility ON web_templates (visibility);
CREATE INDEX IF NOT EXISTS idx_web_templates_category ON web_templates (category);
