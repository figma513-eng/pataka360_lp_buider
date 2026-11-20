import {
  AccessMemberRecord,
  AccessRole,
  AccessSettingsConfig,
  AuthUser,
  FeaturePermissionKey,
  FeaturePermissionsMap,
} from '../types/builder';
import { authFetch } from './authClient';

const ACCESS_LOCAL_STORAGE_KEY = 'lynk_builder_access_settings_v1';

export const ALL_FEATURE_KEYS: FeaturePermissionKey[] = [
  'editor',
  'projects',
  'publishing',
  'ads_wa',
  'analytics',
  'export_backup',
  'access_control',
];

export const FEATURE_META: Record<
  FeaturePermissionKey,
  { label: string; description: string }
> = {
  editor: {
    label: 'Editor Kanvas & Blok',
    description: 'Tambah, edit, duplikat, hapus blok, tema, dan pengaturan responsif.',
  },
  projects: {
    label: 'Kelola Multi-Unit Usaha',
    description: 'Buat unit usaha baru, duplikat, hapus, dan pindah antar proyek.',
  },
  publishing: {
    label: 'Domain, Slug & Publikasi',
    description: 'Atur URL slug /p/:slug, custom domain, SEO, dan status tayang.',
  },
  ads_wa: {
    label: 'Pixel Iklan & Add-On WA Meta',
    description: 'Kelola Meta Pixel, CAPI, TikTok Pixel, Google Tag, GTM, dan Add-On WA.',
  },
  analytics: {
    label: 'Dashboard Trafik Klik WA',
    description: 'Pantau KPI klik WhatsApp, sumber iklan, ekspor CSV, dan reset log.',
  },
  export_backup: {
    label: 'Ekspor HTML & Backup JSON',
    description: 'Salin kode HTML, unduh file .html, serta import/ekspor backup.',
  },
  access_control: {
    label: 'Setting Akses & Tim',
    description: 'Kelola daftar akun, peran Super Admin, dan izin seluruh fitur.',
  },
};

export const ROLE_META: Record<
  AccessRole,
  { label: string; shortLabel: string; badgeClass: string }
> = {
  super_admin: {
    label: 'Super Admin (Full Fitur)',
    shortLabel: 'Super Admin',
    badgeClass: 'bg-[#ECFDF6] text-[#008F63] border-[#00C98A]/40',
  },
  admin: {
    label: 'Admin Unit Usaha',
    shortLabel: 'Admin',
    badgeClass: 'bg-[#F0F5FA] text-[#17243D] border-[#DCE5EF]',
  },
  editor: {
    label: 'Editor Halaman',
    shortLabel: 'Editor',
    badgeClass: 'bg-amber-50 text-amber-800 border-amber-200',
  },
  viewer: {
    label: 'Analis / Viewer',
    shortLabel: 'Viewer',
    badgeClass: 'bg-[#F0F5FA]/70 text-[#5B708B] border-[#DCE5EF]',
  },
};

export const FULL_FEATURE_PERMISSIONS: FeaturePermissionsMap = {
  editor: true,
  projects: true,
  publishing: true,
  ads_wa: true,
  analytics: true,
  export_backup: true,
  access_control: true,
};

export function getPresetPermissionsForRole(role: AccessRole): FeaturePermissionsMap {
  if (role === 'super_admin') {
    return { ...FULL_FEATURE_PERMISSIONS };
  }
  if (role === 'admin') {
    return {
      editor: true,
      projects: true,
      publishing: true,
      ads_wa: true,
      analytics: true,
      export_backup: true,
      access_control: false,
    };
  }
  if (role === 'editor') {
    return {
      editor: true,
      projects: false,
      publishing: false,
      ads_wa: false,
      analytics: true,
      export_backup: true,
      access_control: false,
    };
  }
  return {
    editor: false,
    projects: false,
    publishing: false,
    ads_wa: false,
    analytics: true,
    export_backup: false,
    access_control: false,
  };
}

export function createDefaultAccessSettings(): AccessSettingsConfig {
  const now = Date.now();
  return {
    allUsersSuperAdmin: false,
    autoGrantSuperAdminOnJoin: false,
    defaultRole: 'viewer',
    activeMemberId: 'owner-super-admin',
    members: [
      {
        id: 'owner-super-admin',
        name: 'Super Admin Utama',
        email: 'owner@lynkbuilder.local',
        role: 'super_admin',
        isActive: true,
        unitScope: 'all',
        permissions: { ...FULL_FEATURE_PERMISSIONS },
        createdAt: now,
      },
    ],
    updatedAt: now,
  };
}

function normalizePermissions(
  raw: Partial<FeaturePermissionsMap> | undefined,
  forceFull: boolean,
  role: AccessRole
): FeaturePermissionsMap {
  if (forceFull || role === 'super_admin') {
    return { ...FULL_FEATURE_PERMISSIONS };
  }
  const fallback = getPresetPermissionsForRole(role);
  return {
    editor: typeof raw?.editor === 'boolean' ? raw.editor : fallback.editor,
    projects: typeof raw?.projects === 'boolean' ? raw.projects : fallback.projects,
    publishing: typeof raw?.publishing === 'boolean' ? raw.publishing : fallback.publishing,
    ads_wa: typeof raw?.ads_wa === 'boolean' ? raw.ads_wa : fallback.ads_wa,
    analytics: typeof raw?.analytics === 'boolean' ? raw.analytics : fallback.analytics,
    export_backup:
      typeof raw?.export_backup === 'boolean' ? raw.export_backup : fallback.export_backup,
    access_control:
      typeof raw?.access_control === 'boolean' ? raw.access_control : fallback.access_control,
  };
}

export function normalizeAccessSettings(raw: unknown): AccessSettingsConfig {
  const fallback = createDefaultAccessSettings();
  if (!raw || typeof raw !== 'object') return fallback;

  const obj = raw as Partial<AccessSettingsConfig>;
  const defaultRole: AccessRole = obj.defaultRole === 'editor' ? 'editor' : 'viewer';

  const rawMembers = Array.isArray(obj.members) && obj.members.length > 0
    ? obj.members
    : fallback.members;

  const members: AccessMemberRecord[] = rawMembers.map((m, idx) => {
    const memberRole: AccessRole =
      m.role === 'super_admin' || m.role === 'admin' || m.role === 'editor' || m.role === 'viewer'
        ? m.role
        : 'viewer';
    return {
      id: typeof m.id === 'string' && m.id.trim() ? m.id.trim() : `member-${idx + 1}`,
      name: typeof m.name === 'string' && m.name.trim() ? m.name.trim() : `Pengguna ${idx + 1}`,
      email: typeof m.email === 'string' && m.email.trim() ? m.email.trim() : `user${idx + 1}@tim.local`,
      role: memberRole,
      isActive: typeof m.isActive === 'boolean' ? m.isActive : true,
      unitScope:
        memberRole === 'super_admin'
          ? 'all'
          : m.unitScope === 'all' || Array.isArray(m.unitScope)
          ? m.unitScope
          : [],
      permissions: normalizePermissions(m.permissions, false, memberRole),
      createdAt: typeof m.createdAt === 'number' ? m.createdAt : Date.now(),
    };
  });

  const activeExists = members.some((m) => m.id === obj.activeMemberId);
  return {
    allUsersSuperAdmin: false,
    autoGrantSuperAdminOnJoin: false,
    defaultRole,
    activeMemberId: activeExists && obj.activeMemberId ? obj.activeMemberId : members[0].id,
    members,
    updatedAt: typeof obj.updatedAt === 'number' ? obj.updatedAt : Date.now(),
  };
}

export function promoteAllMembersToSuperAdmin(
  settings: AccessSettingsConfig
): AccessSettingsConfig {
  const now = Date.now();
  return {
    ...settings,
    allUsersSuperAdmin: false,
    autoGrantSuperAdminOnJoin: false,
    defaultRole: 'viewer',
    members: settings.members.map((m) => ({
      ...m,
      role: 'super_admin',
      isActive: true,
      unitScope: 'all',
      permissions: { ...FULL_FEATURE_PERMISSIONS },
    })),
    updatedAt: now,
  };
}

export function resolveEffectivePermissions(
  _settings: AccessSettingsConfig,
  authUser?: AuthUser | null
): FeaturePermissionsMap {
  if (!authUser) {
    // Public browser editor sandbox only — never grants admin/server permissions to anonymous callers
    return {
      editor: true,
      projects: false,
      publishing: false,
      ads_wa: false,
      analytics: false,
      export_backup: true,
      access_control: false,
    };
  }
  if (!authUser.isActive) {
    return {
      editor: false,
      projects: false,
      publishing: false,
      ads_wa: false,
      analytics: false,
      export_backup: false,
      access_control: false,
    };
  }
  if (authUser.role === 'super_admin') return { ...FULL_FEATURE_PERMISSIONS };
  return normalizePermissions(authUser.permissions, false, authUser.role);
}

function readLocalAccessSettings(): AccessSettingsConfig | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = window.localStorage.getItem(ACCESS_LOCAL_STORAGE_KEY);
    if (!raw) return null;
    return normalizeAccessSettings(JSON.parse(raw));
  } catch {
    return null;
  }
}

function writeLocalAccessSettings(settings: AccessSettingsConfig): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(ACCESS_LOCAL_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // Ignore storage quota issues
  }
}

export async function fetchAccessSettings(): Promise<AccessSettingsConfig> {
  const localFallback = readLocalAccessSettings() ?? createDefaultAccessSettings();
  try {
    const res = await authFetch('/api/access-settings');
    if (!res.ok) return localFallback;
    const data = (await res.json()) as { settings?: unknown };
    if (!data?.settings) return localFallback;
    const normalized = normalizeAccessSettings(data.settings);
    writeLocalAccessSettings(normalized);
    return normalized;
  } catch {
    return localFallback;
  }
}

export async function saveAccessSettings(
  settings: AccessSettingsConfig
): Promise<{ ok: boolean; settings: AccessSettingsConfig; error?: string }> {
  const normalized = normalizeAccessSettings({
    ...settings,
    updatedAt: Date.now(),
  });
  writeLocalAccessSettings(normalized);

  try {
    const res = await authFetch('/api/access-settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ settings: normalized }),
    });
    if (!res.ok) {
      return {
        ok: false,
        settings: normalized,
        error: 'Tersimpan lokal, namun gagal sinkron ke server.',
      };
    }
    const data = (await res.json()) as { settings?: unknown };
    const synced = data?.settings ? normalizeAccessSettings(data.settings) : normalized;
    writeLocalAccessSettings(synced);
    return { ok: true, settings: synced };
  } catch {
    return {
      ok: false,
      settings: normalized,
      error: 'Server sedang offline; pengaturan akses disimpan lokal.',
    };
  }
}
