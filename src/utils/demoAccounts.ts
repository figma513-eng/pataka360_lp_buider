import type { AccessRole } from '../types/builder.ts';

export interface DemoRoleProfile {
  role: AccessRole;
  shortLabel: string;
  label: string;
  subtitle: string;
  name: string;
  email: string;
  usernameAlias: string;
  demoPassword: string;
}

export const ROLE_ACCESS_ORDER: AccessRole[] = [
  'super_admin',
  'admin',
  'editor',
  'viewer',
];

export const DEMO_ROLE_PROFILES: Record<AccessRole, DemoRoleProfile> = {
  super_admin: {
    role: 'super_admin',
    shortLabel: 'Super Admin',
    label: 'Super Admin (Full Fitur)',
    subtitle: 'Kontrol penuh seluruh workspace, tim, API & database.',
    name: 'Super Admin Utama',
    email: 'superadmin@lynkbuilder.local',
    usernameAlias: 'superadmin',
    demoPassword: 'LynkSuper#2026',
  },
  admin: {
    role: 'admin',
    shortLabel: 'Admin',
    label: 'Admin Unit Usaha',
    subtitle: 'Kelola proyek, publikasi slug, pixel iklan & analitik.',
    name: 'Admin Unit Usaha',
    email: 'admin@lynkbuilder.local',
    usernameAlias: 'admin',
    demoPassword: 'LynkAdmin#2026',
  },
  editor: {
    role: 'editor',
    shortLabel: 'Editor',
    label: 'Editor Halaman',
    subtitle: 'Edit kanvas & blok halaman, lihat analitik & ekspor.',
    name: 'Editor Halaman',
    email: 'editor@lynkbuilder.local',
    usernameAlias: 'editor',
    demoPassword: 'LynkEditor#2026',
  },
  viewer: {
    role: 'viewer',
    shortLabel: 'Viewer',
    label: 'Analis / Viewer',
    subtitle: 'Pantau dashboard analitik & pratinjau halaman (read-only).',
    name: 'Analis Viewer',
    email: 'viewer@lynkbuilder.local',
    usernameAlias: 'viewer',
    demoPassword: 'LynkViewer#2026',
  },
};

export function resolveDemoEmailByAlias(identifier: string): string | null {
  const clean = identifier.trim().toLowerCase();
  if (!clean) return null;
  for (const role of ROLE_ACCESS_ORDER) {
    const profile = DEMO_ROLE_PROFILES[role];
    if (clean === profile.email || clean === profile.usernameAlias) {
      return profile.email;
    }
  }
  return null;
}
