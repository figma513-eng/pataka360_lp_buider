import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Database,
  Eye,
  EyeOff,
  Lock,
  Mail,
  ShieldCheck,
  Smartphone,
  User,
} from 'lucide-react';
import { AuthUser } from '../types/builder';
import { loginUser, registerUser } from '../utils/authClient';

interface LoginPageProps {
  needsSetup: boolean;
  onSuccess: (user: AuthUser) => void;
}

export function LoginPage({ needsSetup, onSuccess }: LoginPageProps) {
  const [mode, setMode] = useState<'login' | 'register'>(() =>
    needsSetup ? 'register' : 'login'
  );
  const [name, setName] = useState(needsSetup ? 'Super Admin Utama' : '');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (needsSetup) {
      setMode('register');
      setName((prev) => prev || 'Super Admin Utama');
    }
  }, [needsSetup]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    const cleanEmail = email.trim();
    if (!cleanEmail || !password) {
      setError('Email dan kata sandi wajib diisi.');
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
    const res =
      mode === 'register'
        ? await registerUser(name.trim(), cleanEmail, password)
        : await loginUser(cleanEmail, password);
    setLoading(false);

    if (!res.ok || !res.user) {
      setError(res.error || 'Autentikasi gagal. Periksa kembali data Anda.');
      return;
    }
    onSuccess(res.user);
  };

  return (
    <div className="min-h-screen w-screen bg-[#F7F9F8] flex flex-col justify-center items-center p-4 sm:p-6">
      <div className="w-full max-w-md space-y-5">
        {/* Brand Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="w-11 h-11 rounded-2xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
            <Smartphone className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Lynk Builder
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Masuk untuk mengelola landing page, katalog WA, &amp; analitik iklan.
            </p>
          </div>
        </div>

        {/* Auth Card */}
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          {needsSetup && (
            <div className="px-5 py-3 bg-[#EFF7F4] border-b border-emerald-200/80 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="text-xs text-emerald-900 leading-relaxed">
                <strong className="font-semibold">Aktivasi Awal Sistem:</strong> Belum ada
                akun terdaftar. Akun pertama yang dibuat otomatis menjadi{' '}
                <strong className="font-semibold">Super Admin Utama</strong>.
              </div>
            </div>
          )}

          {/* Mode Tabs */}
          <div className="grid grid-cols-2 border-b border-slate-100 bg-slate-50/70">
            <button
              type="button"
              onClick={() => {
                setMode('login');
                setError(null);
              }}
              className={`py-3 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'login'
                  ? 'bg-white text-emerald-700 border-b-2 border-emerald-500'
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
              }}
              className={`py-3 text-xs font-bold transition-colors cursor-pointer whitespace-nowrap ${
                mode === 'register'
                  ? 'bg-white text-emerald-700 border-b-2 border-emerald-500'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              {needsSetup ? 'Buat Super Admin' : 'Daftar Akun Baru'}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4">
            {needsSetup && mode === 'login' && !error && (
              <div className="px-3.5 py-2.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs leading-relaxed">
                Database server saat ini belum memiliki akun terdaftar. Silakan gunakan tab{' '}
                <button
                  type="button"
                  onClick={() => {
                    setMode('register');
                    setError(null);
                  }}
                  className="font-bold underline cursor-pointer"
                >
                  Buat Super Admin
                </button>{' '}
                untuk membuat akun pemilik pertama.
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
                    className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
                  />
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-700">
                Email
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nama@bisnis.id"
                  className="w-full pl-9 pr-3.5 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
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
                  autoComplete={
                    mode === 'register' ? 'new-password' : 'current-password'
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimal 6 karakter"
                  className="w-full pl-9 pr-10 py-2.5 rounded-xl border border-slate-200 text-xs text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:ring-2 focus:ring-emerald-500/15"
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
              className="w-full py-2.5 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-600 disabled:opacity-60 text-white text-xs font-bold flex items-center justify-center gap-2 transition-colors shadow-xs cursor-pointer whitespace-nowrap"
            >
              <span>
                {loading
                  ? 'Memproses...'
                  : mode === 'register'
                  ? needsSetup
                    ? 'Buat Akun Super Admin & Masuk'
                    : 'Daftar & Masuk Workspace'
                  : 'Masuk ke Lynk Builder'}
              </span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </button>
          </form>
        </div>

        {/* Footer Info */}
        <div className="flex items-center justify-center gap-2 text-[11px] text-slate-500">
          <Database className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          <span>
            Sesi &amp; Proyek tersinkron ke PostgreSQL / Penyimpanan Server
          </span>
        </div>
      </div>
    </div>
  );
}
