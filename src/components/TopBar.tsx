import { useEffect, useRef, useState } from 'react';
import {
  BarChart3,
  Check,
  ChevronDown,
  ExternalLink,
  Eye,
  FilePlus2,
  FolderKanban,
  LogIn,
  LogOut,
  Megaphone,
  PenTool,
  Plus,
  Save,
  Settings,
  SlidersHorizontal,
} from 'lucide-react';
import { AuthUser, FeaturePermissionsMap, ProjectRecord, ServerSyncState } from '../types/builder';
import { CollabPeer } from '../utils/collabClient';
import { resolveProjectPublishing } from '../utils/publishingHelpers';
import { useUiLabel } from '../contexts/UiLabelsContext';

export type WorkspacePageId =
  | 'editor'
  | 'analitik'
  | 'ads'
  | 'setting_usaha'
  | 'setting_sistem';

interface TopBarProps {
  activePage: WorkspacePageId;
  onNavigatePage: (page: WorkspacePageId) => void;
  projects: ProjectRecord[];
  activeProjectId: string;
  projectTitle: string;
  projectSlug: string;
  isPublished: boolean;
  permissions: FeaturePermissionsMap;
  authUser: AuthUser | null;
  activePeers?: CollabPeer[];
  hasUnsavedChanges?: boolean;
  isSaving?: boolean;
  syncState?: ServerSyncState;
  syncError?: string | null;
  revision?: number;
  onSelectProject: (id: string) => void;
  onCreateProject: (mode: 'template' | 'blank') => void;
  onOpenSaasWizard?: () => void;
  onOpenProjectsManager: () => void;
  onSaveProject?: () => void;
  onOpenPreview?: () => void;
  onOpenLogin: () => void;
  onLogout: () => void;
}

function getUserInitials(name?: string | null): string {
  const parts = String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (parts.length === 0) return 'LB';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
}

export function TopBar({
  activePage,
  onNavigatePage,
  projects,
  activeProjectId,
  projectTitle,
  projectSlug,
  isPublished,
  permissions,
  authUser,
  activePeers = [],
  hasUnsavedChanges = false,
  isSaving = false,
  syncState = 'idle',
  syncError = null,
  revision,
  onSelectProject,
  onCreateProject,
  onOpenSaasWizard,
  onOpenProjectsManager,
  onSaveProject,
  onOpenPreview,
  onOpenLogin,
  onLogout,
}: TopBarProps) {
  const { label, isVisible } = useUiLabel();
  const [bizOpen, setBizOpen] = useState(false);
  const [bizSearch, setBizSearch] = useState('');
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setBizOpen(false);
      }
    };
    if (bizOpen) {
      document.addEventListener('mousedown', onDocClick);
    }
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [bizOpen]);

  const uniquePeers = Array.from(
    new Map(activePeers.map((peer) => [peer.userId, peer])).values()
  );

  const canAnalytics = permissions.analytics;
  const canAds = permissions.ads_wa || permissions.publishing;
  const canSystemSettings =
    permissions.publishing ||
    permissions.access_control ||
    permissions.export_backup ||
    permissions.projects;

  const filteredProjects = projects.filter((rec) => {
    const q = bizSearch.trim().toLowerCase();
    if (!q) return true;
    const pub = resolveProjectPublishing(rec.project);
    return (
      rec.project.title.toLowerCase().includes(q) ||
      pub.slug.toLowerCase().includes(q)
    );
  });

  const displaySlug = projectSlug ? `/${projectSlug}` : '/halaman';
  const publicHref = projectSlug
    ? isPublished
      ? `/${projectSlug}`
      : `/${projectSlug}?preview=1`
    : undefined;
  const userInitials = getUserInitials(authUser?.name);

  return (
    <header className="min-h-14 bg-white border-b border-[#DCE5EF] px-3 sm:px-4 flex items-center justify-between gap-2 shrink-0 z-30">
      {/* KIRI — Identitas aplikasi & bisnis */}
      <div className="flex items-center gap-2 min-w-0 shrink-0">
        {/* 1. Brand */}
        <button
          type="button"
          onClick={() => onNavigatePage('editor')}
          className="inline-flex items-center gap-2 shrink-0 cursor-pointer group"
        >
          <span className="w-7 h-7 rounded-lg bg-[#17243D] text-white text-[11px] font-extrabold tracking-tight flex items-center justify-center shrink-0">
            <span className="text-[#00C98A]">L</span>B
          </span>
          <span className="font-bold text-[#17243D] tracking-tight text-[14px] whitespace-nowrap">
            Lynk Builder
          </span>
        </button>

        {/* 2. Pipe Separator */}
        <span className="text-[#DCE5EF] font-light select-none shrink-0" aria-hidden="true">
          |
        </span>

        {/* 3. Gear icon ONLY -> Usaha Aktif */}
        <button
          type="button"
          onClick={() => onNavigatePage('setting_usaha')}
          title="Pengaturan Usaha Aktif (Identitas, Pusat WhatsApp, Slug, Domain & Publikasi)"
          aria-label="Usaha Aktif"
          className={`w-8 h-8 rounded-lg border flex items-center justify-center transition-colors shrink-0 cursor-pointer ${
            activePage === 'setting_usaha'
              ? 'bg-[#17243D] border-[#17243D] text-white'
              : 'bg-white border-[#DCE5EF] text-[#17243D] hover:bg-[#F0F5FA] hover:border-[#8FA4BF]'
          }`}
        >
          <Settings className="w-4 h-4" strokeWidth={1.9} />
        </button>

        {/* 4. Business Selector Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={() => setBizOpen((o) => !o)}
            aria-expanded={bizOpen}
            aria-haspopup="listbox"
            title={`${projectTitle} (${displaySlug})`}
            className="inline-flex items-center gap-1.5 h-8 px-2.5 rounded-lg border border-[#DCE5EF] bg-[#F0F5FA]/70 hover:bg-[#F0F5FA] text-[#17243D] text-[12.5px] font-semibold transition-colors max-w-[165px] xl:max-w-[215px] cursor-pointer"
          >
            <span className="truncate">
              {projectTitle || 'Pilih Usaha'}{' '}
              <span className="font-normal text-[#8FA4BF]">({displaySlug})</span>
            </span>
            <ChevronDown className="w-3.5 h-3.5 text-[#8FA4BF] shrink-0" />
          </button>

          {bizOpen && (
            <div className="absolute left-0 mt-1.5 w-72 rounded-xl bg-white border border-[#DCE5EF] shadow-lg overflow-hidden z-50">
              <div className="px-3 py-2 border-b border-[#DCE5EF] bg-[#F0F5FA]/60 flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#17243D]">
                  Unit Usaha ({projects.length})
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setBizOpen(false);
                    onNavigatePage('setting_usaha');
                  }}
                  className="text-[11px] font-semibold text-[#00A873] hover:underline cursor-pointer"
                >
                  Pengaturan Usaha Aktif
                </button>
              </div>

              {projects.length > 4 && (
                <div className="p-2 border-b border-[#DCE5EF]">
                  <input
                    type="text"
                    value={bizSearch}
                    onChange={(e) => setBizSearch(e.target.value)}
                    placeholder="Cari nama atau slug usaha..."
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-[#F0F5FA]/40 text-[#17243D] placeholder:text-[#8FA4BF] outline-none focus:border-[#00C98A]"
                  />
                </div>
              )}

              <div className="max-h-60 overflow-y-auto py-1" role="listbox">
                {filteredProjects.length === 0 ? (
                  <div className="px-3 py-4 text-center text-xs text-[#8FA4BF]">
                    Tidak ada unit usaha yang cocok.
                  </div>
                ) : (
                  filteredProjects.map((rec) => {
                    const pub = resolveProjectPublishing(rec.project);
                    const isCurrent = rec.id === activeProjectId;
                    return (
                      <button
                        key={rec.id}
                        type="button"
                        role="option"
                        aria-selected={isCurrent}
                        onClick={() => {
                          onSelectProject(rec.id);
                          setBizOpen(false);
                          setBizSearch('');
                        }}
                        className={`w-full px-3 py-2 text-left flex items-center justify-between gap-2 text-xs transition-colors cursor-pointer ${
                          isCurrent
                            ? 'bg-[#ECFDF6] text-[#17243D] font-semibold'
                            : 'text-[#17243D] hover:bg-[#F0F5FA]'
                        }`}
                      >
                        <div className="min-w-0">
                          <div className="truncate">{rec.project.title || 'Tanpa Judul'}</div>
                          <div className="text-[11px] font-mono text-[#8FA4BF] truncate">
                            /{pub.slug} · {pub.isPublished ? 'Tayang' : 'Draf'}
                          </div>
                        </div>
                        {isCurrent && <Check className="w-3.5 h-3.5 text-[#00C98A] shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>

              {(onOpenSaasWizard || permissions.projects || canSystemSettings) && (
                <div className="p-2 border-t border-[#DCE5EF] bg-[#F0F5FA]/50 space-y-1.5">
                  {onOpenSaasWizard && (
                    <button
                      type="button"
                      onClick={() => {
                        setBizOpen(false);
                        onOpenSaasWizard();
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#00C98A] hover:bg-[#00B37B] text-white text-[11px] font-bold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Buat Web Usaha (Pilih Template)</span>
                    </button>
                  )}
                  {permissions.projects && (
                    <div className="grid grid-cols-2 gap-1.5">
                      <button
                        type="button"
                        onClick={() => {
                          onCreateProject('template');
                          setBizOpen(false);
                        }}
                        className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-[#17243D] hover:bg-[#223456] text-white text-[11px] font-semibold cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-[#00C98A]" />
                        <span>Templat Baru</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          onCreateProject('blank');
                          setBizOpen(false);
                        }}
                        className="inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-[#17243D] text-[11px] font-semibold cursor-pointer"
                      >
                        <FilePlus2 className="w-3 h-3 text-[#8FA4BF]" />
                        <span>Kanvas Kosong</span>
                      </button>
                    </div>
                  )}
                  {(permissions.projects || canSystemSettings) && (
                    <button
                      type="button"
                      onClick={() => {
                        setBizOpen(false);
                        onOpenProjectsManager();
                      }}
                      className="w-full inline-flex items-center justify-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-[#17243D] text-[11px] font-semibold cursor-pointer"
                    >
                      <FolderKanban className="w-3.5 h-3.5 text-[#8FA4BF]" />
                      <span>Kelola Semua Daftar Usaha</span>
                    </button>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* 5. User Avatar / Inisial Pengakses (Dinamis dari authUser) + Peers */}
        <div className="flex items-center gap-1 shrink-0">
          <span
            title={
              authUser
                ? `${authUser.name} (${authUser.email})`
                : 'Mode tamu tanpa login'
            }
            className="w-7 h-7 rounded-full bg-[#17243D] text-white text-[10.5px] font-bold flex items-center justify-center border border-[#DCE5EF] select-none shrink-0"
          >
            {userInitials}
          </span>
          {uniquePeers.length > 0 && (
            <div
              className="hidden xl:flex items-center -space-x-1.5 pl-0.5 shrink-0"
              aria-label="Rekan tim yang sedang membuka halaman ini"
            >
              {uniquePeers.slice(0, 3).map((peer) => (
                <span
                  key={peer.userId}
                  title={`Sedang membuka: ${peer.name}`}
                  style={{ backgroundColor: peer.color }}
                  className="w-6 h-6 rounded-full text-[9.5px] font-bold text-white flex items-center justify-center ring-2 ring-white select-none"
                >
                  {getUserInitials(peer.name)}
                </span>
              ))}
              {uniquePeers.length > 3 && (
                <span
                  title={`${uniquePeers.length - 3} rekan lainnya aktif`}
                  className="w-6 h-6 rounded-full text-[9.5px] font-bold bg-[#8FA4BF] text-white flex items-center justify-center ring-2 ring-white select-none"
                >
                  +{uniquePeers.length - 3}
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* TENGAH — Navigasi halaman (Editor pertama) */}
      <nav
        aria-label="Navigasi Halaman Utama"
        className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar min-w-0"
      >
        {isVisible('topbar.nav.editor') && (
          <button
            type="button"
            onClick={() => onNavigatePage('editor')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activePage === 'editor'
                ? 'bg-[#17243D] text-white'
                : 'text-[#5B708B] hover:text-[#17243D] hover:bg-[#F0F5FA]'
            }`}
          >
            <PenTool
              className={`w-3.5 h-3.5 shrink-0 ${
                activePage === 'editor' ? 'text-[#00C98A]' : 'text-[#8FA4BF]'
              }`}
              strokeWidth={1.9}
            />
            <span>{label('topbar.nav.editor', 'Editor')}</span>
          </button>
        )}

        {canAnalytics && isVisible('topbar.nav.analytics') && (
          <button
            type="button"
            onClick={() => onNavigatePage('analitik')}
            title="Analitik Trafik Klik WA & Sumber Iklan"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activePage === 'analitik'
                ? 'bg-[#17243D] text-white'
                : 'text-[#5B708B] hover:text-[#17243D] hover:bg-[#F0F5FA]'
            }`}
          >
            <BarChart3
              className={`w-3.5 h-3.5 shrink-0 ${
                activePage === 'analitik' ? 'text-[#00C98A]' : 'text-[#8FA4BF]'
              }`}
              strokeWidth={1.9}
            />
            <span>{label('topbar.nav.analytics', 'Analitik')}</span>
          </button>
        )}

        {canAds && isVisible('topbar.nav.ads') && (
          <button
            type="button"
            onClick={() => onNavigatePage('ads')}
            title="Pixel Iklan, Builder UTM & Add-On WhatsApp"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activePage === 'ads'
                ? 'bg-[#17243D] text-white'
                : 'text-[#5B708B] hover:text-[#17243D] hover:bg-[#F0F5FA]'
            }`}
          >
            <Megaphone
              className={`w-3.5 h-3.5 shrink-0 ${
                activePage === 'ads' ? 'text-[#00C98A]' : 'text-[#8FA4BF]'
              }`}
              strokeWidth={1.9}
            />
            <span>{label('topbar.nav.ads', 'Iklan')}</span>
          </button>
        )}

        {canSystemSettings && isVisible('topbar.nav.settings') && (
          <button
            type="button"
            onClick={() => onNavigatePage('setting_sistem')}
            title="Pengaturan Sistem (Domain, Akses, Pengaturan API, Tampilan, Impor, Cadangan, Salin HTML, Daftar Usaha)"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[13px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activePage === 'setting_sistem'
                ? 'bg-[#17243D] text-white'
                : 'text-[#5B708B] hover:text-[#17243D] hover:bg-[#F0F5FA]'
            }`}
          >
            <SlidersHorizontal
              className={`w-3.5 h-3.5 shrink-0 ${
                activePage === 'setting_sistem' ? 'text-[#00C98A]' : 'text-[#8FA4BF]'
              }`}
              strokeWidth={1.9}
            />
            <span>{label('topbar.nav.settings', 'Pengaturan')}</span>
          </button>
        )}
      </nav>

      {/* KANAN — Simpan, Preview, /p/slug, Logout */}
      <div className="flex items-center gap-1.5 shrink-0">
        {onSaveProject && (
          <button
            type="button"
            onClick={onSaveProject}
            disabled={isSaving || !activeProjectId}
            title={
              syncError ||
              `Simpan perubahan unit usaha (Ctrl+S)${revision ? ` · Revisi v${revision}` : ''}${
                hasUnsavedChanges ? ' · Belum tersimpan' : ''
              }`
            }
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-[12.5px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              syncState === 'conflict' || syncState === 'error'
                ? 'border-rose-300 bg-rose-50 hover:bg-rose-100 text-rose-800'
                : hasUnsavedChanges || syncState === 'local_saved' || syncState === 'pending'
                ? 'border-[#00C98A] bg-[#00C98A] hover:bg-[#00B37B] text-white'
                : 'border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-[#17243D]'
            }`}
          >
            <Save
              className={`w-3.5 h-3.5 shrink-0 ${
                isSaving || syncState === 'syncing'
                  ? 'animate-pulse'
                  : hasUnsavedChanges || syncState === 'local_saved' || syncState === 'pending'
                  ? 'text-white'
                  : 'text-[#00C98A]'
              }`}
              strokeWidth={1.9}
            />
            <span>
              {isSaving || syncState === 'syncing'
                ? 'Menyimpan...'
                : syncState === 'conflict'
                ? 'Konflik Versi'
                : syncState === 'error'
                ? 'Simpan Ulang'
                : label('topbar.action.save', 'Simpan')}
            </span>
          </button>
        )}

        {onOpenPreview && isVisible('topbar.action.preview') && (
          <button
            type="button"
            onClick={onOpenPreview}
            disabled={!activeProjectId}
            title="Pratinjau halaman"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCE5EF] bg-white text-[#17243D] hover:bg-[#F0F5FA] hover:border-[#8FA4BF] text-[12.5px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Eye className="w-3.5 h-3.5 text-[#00C98A] shrink-0" strokeWidth={1.9} />
            <span>{label('topbar.action.preview', 'Pratinjau')}</span>
          </button>
        )}

        {publicHref ? (
          <a
            href={publicHref}
            target="_blank"
            rel="noopener noreferrer"
            title={`Buka halaman publik ${displaySlug} (${isPublished ? 'Tayang' : 'Pratinjau Draf'})`}
            className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-[#DCE5EF] bg-[#F0F5FA]/70 hover:bg-[#ECFDF6] hover:border-[#00C98A] text-[#17243D] text-[12px] font-mono font-medium transition-colors whitespace-nowrap shrink-0 max-w-[165px]"
          >
            <span className="truncate">{displaySlug}</span>
            <ExternalLink className="w-3 h-3 text-[#8FA4BF] shrink-0" />
          </a>
        ) : (
          <span className="hidden md:inline-block text-[12px] font-mono text-[#8FA4BF] px-2">
            /—
          </span>
        )}

        {authUser ? (
          isVisible('topbar.action.logout') && (
            <button
              type="button"
              onClick={onLogout}
              title={`Keluar dari akun ${authUser.name} (${authUser.email})`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-[#DCE5EF] bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 text-[#17243D] text-[12.5px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5 text-[#8FA4BF]" />
              <span>{label('topbar.action.logout', 'Keluar')}</span>
            </button>
          )
        ) : (
          <button
            type="button"
            onClick={onOpenLogin}
            title="Masuk ke Akun Builder"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#17243D] hover:bg-[#223456] text-white text-[12.5px] font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <LogIn className="w-3.5 h-3.5 text-[#00C98A]" />
            <span>{label('topbar.action.login', 'Masuk')}</span>
          </button>
        )}
      </div>
    </header>
  );
}
