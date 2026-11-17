import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Check,
  CheckCircle2,
  Crown,
  Database,
  Edit3,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  Mail,
  Shield,
  ShieldCheck,
  Smartphone,
  User,
  UserCog,
} from 'lucide-react';
import { AccessRole, AuthUser } from '../types/builder';
import {
  ALL_FEATURE_KEYS,
  FEATURE_META,
  ROLE_META,
  getPresetPermissionsForRole,
} from '../utils/accessControl';
import { loginUser, registerUser, seedDemoRolesOnServer } from '../utils/authClient';
import {
  DEMO_ROLE_PROFILES,
  ROLE_ACCESS_ORDER,
  resolveDemoEmailByAlias,
} from '../utils/demoAccounts';

interface LoginPageProps {
  needsSetup: boolean;
  demoModeAvailable?: boolean;
  demoAccountsSeeded?: boolean;
  roleSummary?: Record<AccessRole, number>;
  onDemoSeeded?: () => Promise<void> | void;
  onSuccess: (user: AuthUser) => void;
}

const ROLE_ICON: Record<AccessRole, React.ComponentType<{ className?: string }>> = {
  super_admin: Crown,
  admin: UserCog,
  editor: Edit3,
  viewer: Eye,
};

export function LoginPage({
  needsSetup,
  demoModeAvailable = false,
  demoAccountsSeeded = false,
  roleSummary,
  onDemoSeeded,
  onSuccess,
}: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>(() =>
    needsSetup && !demoModeAvailable ? 'register' : 'login'
  );
  const [selectedRole, setSelectedRole] = useState<AccessRole>('super_admin');
  const [name, setName] = useState(needsSetup ? 'Super Admin Utama' : '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [seedingDemo, setSeedingDemo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [infoNote, setInfoNote] = useState<string | null>(null);

  useEffect(() => {
    if (needsSetup && !demoModeAvailable) {
      setMode('register');
      setName((prev) => prev || 'Super Admin Utama');
    }
  }, [needsSetup, demoModeAvailable]);

  const canAutofillDemo = demoModeAvailable && (needsSetup || demoAccountsSeeded);
  const activeRoleProfile = DEMO_ROLE_PROFILES[selectedRole];
  const activeRolePermissions = getPresetPermissionsForRole(selectedRole);

  const handleSelectRoleCard = (role: AccessRole) => {
    const profile = DEMO_ROLE_PROFILES[role];
    setSelectedRole(role);
    setMode('login');
    setError(null);

    if (canAutofillDemo) {
      setEmail(profile.email);
      setPassword(profile.demoPassword);
      setInfoNote(
        `Kredensial demo ${profile.shortLabel} diisikan ke formulir. Klik tombol masuk untuk melanjutkan.`
      );
    } else if (demoModeAvailable) {
      setInfoNote(
        `Level akses ${profile.shortLabel} dipilih. Masukkan email dan kata sandi akun terdaftar Anda.`
      );
    } else {
      setInfoNote(null);
    }
  };

  const handleSeedDemoAccounts = async () => {
    if (!demoModeAvailable || seedingDemo) return;
    setError(null);
    setSeedingDemo(true);
    const seedRes = await seedDemoRolesOnServer();
    if (seedRes.ok) {
      await onDemoSeeded?.();
      const profile = DEMO_ROLE_PROFILES[selectedRole];
      setEmail(profile.email);
      setPassword(profile.demoPassword);
      setInfoNote(
        `4 akun demo (${ROLE_ACCESS_ORDER.map((r) => DEMO_ROLE_PROFILES[r].shortLabel).join(', ')}) siap digunakan.`
      );
    } else {
      setError(seedRes.error || 'Gagal menyiapkan akun demo 4 role.');
    }
    setSeedingDemo(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanIdentifier = email.trim();
    if (!cleanIdentifier || !password) {
      setError('Username atau email dan kata sandi wajib diisi.');
      return;
    }

    if (mode === 'register' && name.trim().length < 2) {
      setError('Nama lengkap minimal 2 karakter.');
      return;
    }

    if (password.length < 6) {
      setError('Kata sandi minimal 6 karakter.');
      return;
    }

    setLoading(true);

    if (mode === 'login') {
      const resolvedDemoEmail = demoModeAvailable
        ? resolveDemoEmailByAlias(cleanIdentifier)
        : null;
      const matchedDemoProfile = resolvedDemoEmail
        ? ROLE_ACCESS_ORDER.map((r) => DEMO_ROLE_PROFILES[r]).find(
            (p) => p.email === resolvedDemoEmail
          )
        : null;

      if (
        needsSetup &&
        demoModeAvailable &&
        matchedDemoProfile &&
        password === matchedDemoProfile.demoPassword
      ) {
        const seedRes = await seedDemoRolesOnServer();
        if (!seedRes.ok && seedRes.code !== 'SETUP_ALREADY_COMPLETED') {
          setLoading(false);
          setError(seedRes.error || 'Gagal menyiapkan akun demo 4 role di server.');
          return;
        }
        await onDemoSeeded?.();
      }

      const res = await loginUser(resolvedDemoEmail || cleanIdentifier, password);
      setLoading(false);

      if (!res.ok || !res.user) {
        setError(res.error || 'Autentikasi gagal. Periksa kembali username/email dan kata sandi.');
        return;
      }
      onSuccess(res.user);
      return;
    }

    const res = await registerUser(name.trim(), cleanIdentifier, password);
    setLoading(false);

    if (!res.ok || !res.user) {
      setError(res.error || 'Pendaftaran akun gagal. Periksa kembali data Anda.');
      return;
    }
    onSuccess(res.user);
  };

  const countEnabledPermissions = ALL_FEATURE_KEYS.filter((k) => activeRolePermissions[k]).length;

  return (
    <div className="min-h-screen w-screen bg-[#F7F9F8] flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-5xl space-y-5">
        {/* Brand Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 px-1">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                Lynk Builder
              </h1>
              <p className="text-xs text-slate-500">
                Sistem Akses Multi-User — Super Admin, Admin, Editor &amp; Viewer
              </p>
            </div>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-white border border-slate-200 text-[11px] font-medium text-slate-600 self-start sm:self-auto">
            <Shield className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>
              {demoModeAvailable ? 'Mode Preview / Sandbox Aktif' : 'Autentikasi RBAC Server'}
            </span>
          </div>
        </div>

        {/* Main 2-Column Layout: Left Login Form, Right Separate Access & Demo Info Panel */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
          {/* Left: Login & Registration Card */}
          <div className="lg:col-span-7 bg-white rounded-2xl border border-slate-200 overflow-hidden">
            {needsSetup && (
              <div className="px-5 py-3 bg-[#EFF7F4] border-b border-emerald-200/80 flex items-start gap-2.5">
                <ShieldCheck className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
                <div className="text-xs text-emerald-950 leading-relaxed">
                  <strong className="font-semibold">Aktivasi Awal Sistem:</strong> Pilih salah satu
                  level akses di bawah untuk langsung uji coba 4 role demo, atau buka tab{' '}
                  <strong className="font-semibold">Buat Super Admin</strong> untuk membuat akun
                  pemilik kustom.
                </div>
              </div>
            )}

            {/* Mode Tabs */}
            <div className="grid grid-cols-2 border-b border-slate-200 bg-slate-50/70">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                }}
                className={`py-3 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  mode === 'login'
                    ? 'bg-white text-emerald-700 border-b-2 border-emerald-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                Masuk Akun
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setInfoNote(null);
                }}
                className={`py-3 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                  mode === 'register'
                    ? 'bg-white text-emerald-700 border-b-2 border-emerald-600'
                    : 'text-slate-500 hover:text-slate-800'
                }`}
              >
                {needsSetup ? 'Buat Super Admin' : 'Daftar Akun Baru'}
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
              {mode === 'login' && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <label className="block text-xs font-bold text-slate-800">
                      Pilih Level Akses
                    </label>
                    <span className="text-[11px] text-slate-500">
                      {canAutofillDemo
                        ? 'Klik role untuk isi user & password otomatis'
                        : 'Pilih peran sesuai akun Anda'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {ROLE_ACCESS_ORDER.map((role) => {
                      const profile = DEMO_ROLE_PROFILES[role];
                      const Icon = ROLE_ICON[role];
                      const isSelected = selectedRole === role;
                      const accountCount = roleSummary?.[role];

                      return (
                        <button
                          key={role}
                          type="button"
                          onClick={() => handleSelectRoleCard(role)}
                          aria-pressed={isSelected}
                          className={`group flex flex-col items-center justify-center text-center px-2.5 py-3 rounded-xl border transition-colors cursor-pointer ${
                            isSelected
                              ? 'bg-[#EFF7F4] border-emerald-600 text-emerald-950'
                              : 'bg-slate-50/70 border-slate-200 text-slate-700 hover:bg-white hover:border-slate-300'
                          }`}
                        >
                          <div
                            className={`w-8 h-8 rounded-lg flex items-center justify-center mb-1.5 ${
                              isSelected
                                ? 'bg-emerald-600 text-white'
                                : 'bg-white border border-slate-200 text-slate-500 group-hover:text-slate-800'
                            }`}
                          >
                            <Icon className="w-4 h-4" />
                          </div>
                          <span className="text-xs font-bold leading-tight">
                            {profile.shortLabel}
                          </span>
                          {typeof accountCount === 'number' && (
                            <span className="text-[10px] font-mono tabular-nums text-slate-500 mt-0.5">
                              {accountCount} akun
                            </span>
                          )}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {infoNote && mode === 'login' && !error && (
                <div className="px-3.5 py-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-xs flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                  <span>{infoNote}</span>
                </div>
              )}

              {error && (
                <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs font-medium flex items-start gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                  <span>{error}</span>
                </div>
              )}

              {mode === 'register' && (
                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-700">
                    Nama Lengkap
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Contoh: Budi Santoso"
                      className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
                    />
                  </div>
                </div>
              )}

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  {mode === 'login' ? 'Username atau Email' : 'Email'}
                </label>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={mode === 'login' ? 'text' : 'email'}
                    required
                    autoComplete={mode === 'login' ? 'username' : 'email'}
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder={
                      mode === 'login'
                        ? demoModeAvailable
                          ? 'Contoh: superadmin atau nama@bisnis.id'
                          : 'Masukkan email akun terdaftar'
                        : 'nama@bisnis.id'
                    }
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono placeholder:font-sans placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-slate-700">
                  Kata Sandi
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    minLength={6}
                    autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Minimal 6 karakter"
                    className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 font-mono placeholder:font-sans placeholder:text-slate-400 outline-none focus:border-emerald-600 focus:ring-2 focus:ring-emerald-600/15"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={showPassword ? 'Sembunyikan sandi' : 'Lihat sandi'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-700 cursor-pointer"
                  >
                    {showPassword ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
              >
                <span>
                  {loading
                    ? 'Memproses...'
                    : mode === 'register'
                    ? needsSetup
                      ? 'Buat Akun Super Admin & Masuk'
                      : 'Daftar & Masuk Workspace'
                    : `Masuk sebagai ${activeRoleProfile.shortLabel}`}
                </span>
                <ArrowRight className="w-4 h-4 shrink-0" />
              </button>
            </form>
          </div>

          {/* Right: Separate Information Panel (System Role Matrix & Sandbox Demo Accounts) */}
          <div className="lg:col-span-5 bg-white rounded-2xl border border-slate-200 overflow-hidden">
            <div className="px-5 py-3.5 border-b border-slate-200 bg-slate-50/70 flex items-center justify-between gap-2">
              <div>
                <h2 className="text-xs font-bold text-slate-900">
                  Data Akses Sistem &amp; Akun Demo
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  Matriks izin asli dari sistem RBAC Lynk Builder
                </p>
              </div>
              <span
                className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 tabular-nums ${ROLE_META[selectedRole].badgeClass}`}
              >
                {countEnabledPermissions}/{ALL_FEATURE_KEYS.length} Fitur
              </span>
            </div>

            <div className="p-4 sm:p-5 space-y-4">
              {/* Active Role Permission Breakdown */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {activeRoleProfile.label}
                  </span>
                  {typeof roleSummary?.[selectedRole] === 'number' && (
                    <span className="text-[11px] font-mono tabular-nums text-slate-500">
                      {roleSummary[selectedRole]} terdaftar
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  {activeRoleProfile.subtitle}
                </p>

                <div className="grid grid-cols-1 gap-1.5 pt-1">
                  {ALL_FEATURE_KEYS.map((key) => {
                    const allowed = activeRolePermissions[key];
                    return (
                      <div
                        key={key}
                        className={`px-2.5 py-1.5 rounded-lg border flex items-center justify-between gap-2 text-[11px] ${
                          allowed
                            ? 'bg-emerald-50/60 border-emerald-200/80 text-slate-800'
                            : 'bg-slate-50 border-slate-200/70 text-slate-400'
                        }`}
                      >
                        <span className="font-medium truncate">{FEATURE_META[key].label}</span>
                        <span
                          className={`inline-flex items-center gap-1 font-semibold shrink-0 ${
                            allowed ? 'text-emerald-700' : 'text-slate-400'
                          }`}
                        >
                          {allowed ? (
                            <>
                              <Check className="w-3 h-3" />
                              <span>Aktif</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3 h-3" />
                              <span>Terkunci</span>
                            </>
                          )}
                        </span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Separate Sandbox Demo Panel */}
              {demoModeAvailable ? (
                <div className="pt-3 border-t border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                      <h3 className="text-xs font-bold text-slate-900">
                        Panel Akun Demo 4 Role
                      </h3>
                    </div>
                    {needsSetup && (
                      <button
                        type="button"
                        disabled={seedingDemo}
                        onClick={() => void handleSeedDemoAccounts()}
                        className="px-2.5 py-1 rounded-lg bg-slate-900 hover:bg-slate-800 disabled:opacity-60 text-white text-[11px] font-semibold cursor-pointer whitespace-nowrap"
                      >
                        {seedingDemo ? 'Menyiapkan...' : 'Siapkan 4 Akun'}
                      </button>
                    )}
                  </div>

                  {!needsSetup && !demoAccountsSeeded ? (
                    <div className="px-3 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                      Server sudah memiliki akun terdaftar. Masuk sebagai{' '}
                      <strong className="font-semibold">Super Admin</strong> lalu buka{' '}
                      <strong className="font-semibold">Setting Akses &amp; Tim</strong> untuk
                      menambahkan preset 4 role demo secara aman.
                    </div>
                  ) : (
                    <div className="space-y-1.5">
                      {ROLE_ACCESS_ORDER.map((role) => {
                        const profile = DEMO_ROLE_PROFILES[role];
                        const isSelected = selectedRole === role;
                        return (
                          <button
                            key={role}
                            type="button"
                            onClick={() => handleSelectRoleCard(role)}
                            className={`w-full text-left px-3 py-2 rounded-xl border transition-colors cursor-pointer flex items-center justify-between gap-2 ${
                              isSelected
                                ? 'bg-[#EFF7F4] border-emerald-500'
                                : 'bg-slate-50/70 border-slate-200 hover:bg-white'
                            }`}
                          >
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[11px] font-bold text-slate-900">
                                  {profile.shortLabel}
                                </span>
                                <span className="text-[10px] font-mono text-slate-500">
                                  ({profile.usernameAlias})
                                </span>
                              </div>
                              <div className="text-[10px] font-mono text-slate-600 truncate mt-0.5">
                                {profile.email}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <div className="text-[10px] font-mono font-semibold text-emerald-700">
                                {profile.demoPassword}
                              </div>
                              <div className="text-[10px] text-slate-400">Klik isi otomatis</div>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              ) : (
                <div className="pt-3 border-t border-slate-200">
                  <p className="text-[11px] text-slate-500 leading-relaxed">
                    Panel demo dinonaktifkan di lingkungan production. Hubungi Super Admin Anda
                    untuk mendapatkan kredensial akun tim.
                  </p>
                </div>
              )}

              <p className="text-[11px] text-slate-400 leading-relaxed border-t border-slate-100 pt-2.5">
                Demo akun ditampilkan pada panel informasi terpisah ini untuk pengujian sandbox dan
                tidak pernah membocorkan password akun pengguna sebenarnya.
              </p>
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            Sesi HttpOnly &amp; Proyek tersinkron ke penyimpanan server Lynk Builder
          </span>
        </div>
      </div>
    </div>
  );
}
