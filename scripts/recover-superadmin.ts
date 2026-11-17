import 'dotenv/config';
import crypto from 'node:crypto';
import { getDbState } from '../src/db/index.ts';
import {
  FULL_PERMISSIONS,
  type StoredUserRecord,
  getAccessSettings,
  getUserByEmail,
  hashPassword,
  listUsers,
  saveAccessSettings,
  upsertUser,
} from '../src/db/repository.ts';

function parseArgs(argv: string[]): Record<string, string | boolean> {
  const out: Record<string, string | boolean> = {};
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (!arg.startsWith('--')) continue;
    const eq = arg.indexOf('=');
    if (eq > 2) {
      out[arg.slice(2, eq)] = arg.slice(eq + 1);
    } else {
      const key = arg.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        out[key] = next;
        i += 1;
      } else {
        out[key] = true;
      }
    }
  }
  return out;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const state = await getDbState();

  try {
    if (args.list === true || (!args.email && !args.password)) {
      const users = await listUsers();
      console.log(`[auth:recover-superadmin] Engine: ${state.engine}`);
      if (users.length === 0) {
        console.log('Belum ada user terdaftar. Buka halaman login untuk membuat Super Admin pertama.');
        return;
      }
      console.table(
        users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          lastLoginAt: u.lastLoginAt ? new Date(u.lastLoginAt).toISOString() : '-',
        }))
      );
      console.log(
        'Cara pulihkan / reset sandi Super Admin:\n  npm run auth:recover-superadmin -- --email admin@anda.com --password SandiBaruMinimal6Karakter'
      );
      return;
    }

    const email = String(args.email || '')
      .trim()
      .toLowerCase();
    const password = typeof args.password === 'string' ? args.password : '';
    const customName = typeof args.name === 'string' ? args.name.trim() : '';

    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      console.error('[auth:recover-superadmin] Email valid wajib diisi via --email.');
      process.exitCode = 1;
      return;
    }

    const existing = await getUserByEmail(email);
    const now = Date.now();

    if (!existing && password.length < 6) {
      console.error(
        `[auth:recover-superadmin] Akun "${email}" belum ada. Sertakan --password (minimal 6 karakter) untuk membuat akun Super Admin baru.`
      );
      process.exitCode = 1;
      return;
    }

    if (password && password.length < 6) {
      console.error('[auth:recover-superadmin] Kata sandi baru minimal 6 karakter.');
      process.exitCode = 1;
      return;
    }

    const nextUser: StoredUserRecord = existing
      ? {
          ...existing,
          name: customName ? customName.slice(0, 80) : existing.name,
          passwordHash: password ? hashPassword(password) : existing.passwordHash,
          role: 'super_admin',
          isActive: true,
          unitScope: 'all',
          permissions: { ...FULL_PERMISSIONS },
          updatedAt: now,
        }
      : {
          id: `usr_${crypto.randomBytes(6).toString('hex')}`,
          name: (customName || 'Super Admin').slice(0, 80),
          email: email.slice(0, 120),
          passwordHash: hashPassword(password),
          role: 'super_admin',
          isActive: true,
          unitScope: 'all',
          permissions: { ...FULL_PERMISSIONS },
          createdAt: now,
          updatedAt: now,
        };

    await upsertUser(nextUser);

    const access = await getAccessSettings();
    const cleanedMembers = access.members.filter(
      (m) => m.id !== nextUser.id && m.email.toLowerCase() !== nextUser.email.toLowerCase()
    );
    await saveAccessSettings({
      ...access,
      allUsersSuperAdmin: false,
      autoGrantSuperAdminOnJoin: false,
      defaultRole: access.defaultRole === 'editor' ? 'editor' : 'viewer',
      activeMemberId: nextUser.id,
      members: [
        {
          id: nextUser.id,
          name: nextUser.name,
          email: nextUser.email,
          role: 'super_admin',
          isActive: true,
          unitScope: 'all',
          permissions: { ...FULL_PERMISSIONS },
          createdAt: nextUser.createdAt,
        },
        ...cleanedMembers,
      ],
    });

    console.log(
      `[auth:recover-superadmin] Berhasil! Akun "${nextUser.email}" sekarang aktif sebagai Super Admin (${
        password ? 'kata sandi diperbarui' : 'kata sandi lama dipertahankan'
      }). Restart server jika memakai Local JSON Store agar cache memori termuat ulang.`
    );
  } finally {
    if (state.pool) {
      await state.pool.end().catch(() => {});
    }
  }
}

void main();
