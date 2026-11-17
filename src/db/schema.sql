-- Lynk Builder — Skema PostgreSQL Lengkap (v004)
-- Sinkron 100% dengan src/db/schema.ts & src/db/migrations.ts
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
  created_at BIGINT NOT NULL,
  updated_at BIGINT NOT NULL,
  last_login_at BIGINT
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users (email);
CREATE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));

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
  project_json JSONB NOT NULL,
  rendered_html TEXT NOT NULL DEFAULT '',
  updated_at BIGINT NOT NULL,
  last_saved_at BIGINT NOT NULL,
  created_at BIGINT NOT NULL
);
ALTER TABLE projects ADD COLUMN IF NOT EXISTS revision INTEGER NOT NULL DEFAULT 1;
CREATE INDEX IF NOT EXISTS idx_projects_slug ON projects (slug);
CREATE INDEX IF NOT EXISTS idx_projects_custom_domain ON projects (custom_domain);
CREATE INDEX IF NOT EXISTS idx_projects_owner ON projects (owner_user_id);

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
