import {
  BarChart3,
  Code2,
  Copy,
  Download,
  FolderKanban,
  Globe,
  LogIn,
  LogOut,
  Settings2,
  ShieldCheck,
  Smartphone,
  Upload,
} from 'lucide-react';
import { AuthUser, FeaturePermissionsMap } from '../types/builder';
import { CollabPeer } from '../utils/collabClient';

interface TopBarProps {
  projectTitle: string;
  projectSlug: string;
  isPublished: boolean;
  projectCount: number;
  permissions: FeaturePermissionsMap;
  authUser: AuthUser | null;
  activePeers?: CollabPeer[];
  onChangeTitle: (title: string) => void;
  onOpenProjects: () => void;
  onOpenDomainAndAds: () => void;
  onOpenDashboard: () => void;
  onOpenAccessSettings: () => void;
  onOpenApiSettings: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
  isAllSuperAdmin: boolean;
  onOpenImport: () => void;
  onBackup: () => void;
  onCopyHtml: () => void;
  onOpenCode: () => void;
  copied: boolean;
}

function getPeerInitials(name: string): string {
  const parts = String(name || '').trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'TM';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function TopBar({
  projectTitle,
  projectSlug,
  isPublished,
  projectCount,
  permissions,
  authUser,
  activePeers = [],
  onChangeTitle,
  onOpenProjects,
  onOpenDomainAndAds,
  onOpenDashboard,
  onOpenAccessSettings,
  onOpenApiSettings,
  onOpenLogin,
  onLogout,
  isAllSuperAdmin,
  onOpenImport,
  onBackup,
  onCopyHtml,
  onOpenCode,
  copied,
}: TopBarProps) {
  const canDomainOrAds = permissions.publishing || permissions.ads_wa;
  const uniquePeers = Array.from(
    new Map(activePeers.map((peer) => [peer.userId, peer])).values()
  );

  return (
    <header className="h-14 bg-white border-b border-slate-100 px-3 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 shrink-0 z-20">
      {/* Left: Brand + Unit Usaha */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-xs">
            <Smartphone className="w-4 h-4" />
          </div>
          <span className="font-bold text-slate-800 tracking-tight text-[15px] whitespace-nowrap">
            Lynk Builder
          </span>
        </div>

        <div className="h-5 w-px bg-slate-200/80 hidden sm:block" />

        <div className="flex items-center gap-1.5 min-w-0">
          <button
            type="button"
            onClick={onOpenProjects}
            title="Kelola Daftar Usaha / Proyek"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-emerald-200/80 bg-[#EFF7F4] hover:bg-emerald-100/70 text-emerald-700 text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <FolderKanban className="w-3.5 h-3.5 text-emerald-600" />
            <span>Usaha ({projectCount})</span>
          </button>

          <input
            type="text"
            value={projectTitle}
            disabled={!permissions.editor}
            onChange={(e) => onChangeTitle(e.target.value)}
            aria-label="Judul Halaman"
            className="hidden lg:block text-[13px] font-medium text-slate-700 bg-slate-50/80 hover:bg-[#EFF7F4]/60 focus:bg-white border border-transparent focus:border-emerald-300 rounded-xl px-2.5 py-1.5 w-32 xl:w-40 truncate transition-colors outline-none disabled:opacity-60"
          />

          {uniquePeers.length > 0 && (
            <div
              className="hidden md:flex items-center -space-x-1.5 pl-1 shrink-0"
              aria-label="Rekan tim yang sedang membuka halaman ini"
            >
              {uniquePeers.slice(0, 4).map((peer) => (
                <span
                  key={peer.userId}
                  title={`Sedang membuka: ${peer.name}`}
                  style={{ backgroundColor: peer.color }}
                  className="w-6 h-6 rounded-full text-[10px] font-bold text-white flex items-center justify-center ring-2 ring-white shadow-xs select-none"
                >
                  {getPeerInitials(peer.name)}
                </span>
              ))}
              {uniquePeers.length > 4 && (
                <span
                  title={`${uniquePeers.length - 4} rekan lainnya sedang membuka halaman ini`}
                  className="w-6 h-6 rounded-full text-[10px] font-bold bg-slate-700 text-white flex items-center justify-center ring-2 ring-white shadow-xs select-none"
                >
                  +{uniquePeers.length - 4}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right: Dashboard, Domain & Ads, Akses, Setting API, Import/Backup, Copy HTML, Auth */}
      <div className="flex items-center gap-1.5 shrink-0">
        {permissions.analytics && (
          <button
            type="button"
            onClick={onOpenDashboard}
            title="Dashboard Trafik Klik WA & Sumber Iklan"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200/90 bg-white text-slate-700 hover:bg-[#EFF7F4] hover:text-emerald-700 hover:border-emerald-200 text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Dashboard WA</span>
          </button>
        )}

        {canDomainOrAds && (
          <button
            type="button"
            onClick={onOpenDomainAndAds}
            title={`Atur Domain, Slug (/p/${projectSlug}) & Pixel Iklan (${isPublished ? 'Tayang' : 'Draft'})`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200/90 bg-white text-slate-700 hover:bg-[#EFF7F4] hover:text-emerald-700 hover:border-emerald-200 text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Globe className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden md:inline">Domain & Iklan</span>
          </button>
        )}

        {permissions.access_control && (
          <>
            <button
              type="button"
              onClick={onOpenAccessSettings}
              title={
                isAllSuperAdmin
                  ? 'Setting Akses: Semua Super Admin (Full Fitur)'
                  : 'Setting Akses & Hak Fitur'
              }
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200/90 bg-white text-slate-700 hover:bg-[#EFF7F4] hover:text-emerald-700 hover:border-emerald-200 text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden lg:inline">Akses</span>
            </button>

            <button
              type="button"
              onClick={onOpenApiSettings}
              title="Setting API, Webhook, Keamanan & Database PostgreSQL"
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200/90 bg-white text-slate-700 hover:bg-[#EFF7F4] hover:text-emerald-700 hover:border-emerald-200 text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Settings2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden lg:inline">Setting API</span>
            </button>
          </>
        )}

        {permissions.export_backup && (
          <>
            <button
              type="button"
              onClick={onOpenImport}
              title="Import Backup .json"
              className="hidden 2xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200/90 bg-white text-slate-600 hover:bg-[#EFF7F4] hover:text-emerald-700 hover:border-emerald-200 text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Upload className="w-3.5 h-3.5 text-emerald-600" />
              <span>Import</span>
            </button>

            <button
              type="button"
              onClick={onBackup}
              title="Unduh Backup .json"
              className="hidden 2xl:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200/90 bg-white text-slate-600 hover:bg-[#EFF7F4] hover:text-emerald-700 hover:border-emerald-200 text-[13px] font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              <span>Backup</span>
            </button>

            <div className="inline-flex items-center rounded-xl overflow-hidden shadow-xs shrink-0">
              <button
                type="button"
                onClick={onCopyHtml}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500 hover:bg-emerald-600 text-white text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>{copied ? 'Tersalin!' : 'Copy HTML'}</span>
              </button>
              <button
                type="button"
                onClick={onOpenCode}
                title="Lihat Kode HTML"
                aria-label="Lihat Kode HTML"
                className="px-2 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white border-l border-emerald-400/40 transition-colors cursor-pointer"
              >
                <Code2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </>
        )}

        {authUser ? (
          <button
            type="button"
            onClick={onLogout}
            title={`Keluar dari akun ${authUser.name} (${authUser.email})`}
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200/90 bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-[12px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <span className="hidden xl:inline max-w-24 truncate text-slate-700">
              {authUser.name}
            </span>
            <LogOut className="w-3.5 h-3.5" />
          </button>
        ) : (
          <button
            type="button"
            onClick={onOpenLogin}
            title="Masuk ke Akun Builder"
            className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-slate-200/90 bg-white text-slate-700 hover:bg-[#EFF7F4] hover:text-emerald-700 hover:border-emerald-200 text-[12px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">Masuk</span>
          </button>
        )}
      </div>
    </header>
  );
}
