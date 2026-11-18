import { useState } from 'react';
import {
  BarChart3,
  Copy,
  Download,
  FilePlus2,
  FileUp,
  FolderKanban,
  Globe,
  HardDrive,
  Plus,
  Trash2,
  X,
} from 'lucide-react';
import type { ProjectRecord } from '../../types/builder';
import { resolveProjectPublishing } from '../../utils/publishingHelpers';

function formatUpdatedAt(ts: number): string {
  const diffSec = Math.max(0, Math.floor((Date.now() - ts) / 1000));
  if (diffSec < 60) return 'Baru saja';
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} menit lalu`;
  const diffHour = Math.floor(diffMin / 60);
  if (diffHour < 24) return `${diffHour} jam lalu`;
  return new Date(ts).toLocaleDateString('id-ID', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function ProjectsModal({
  projects,
  activeProjectId,
  onSelectProject,
  onCreateProject,
  onDuplicateProject,
  onDeleteProject,
  onDownloadHtml,
  onOpenDomainAndAds,
  onOpenDashboard,
  onBackupAll,
  onOpenImport,
  onClose = () => {},
  asPage = false,
}: {
  projects: ProjectRecord[];
  activeProjectId: string;
  onSelectProject: (id: string) => void;
  onCreateProject: (mode: 'template' | 'blank') => void;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onDownloadHtml: (record: ProjectRecord) => void;
  onOpenDomainAndAds: (id: string) => void;
  onOpenDashboard: () => void;
  onBackupAll: () => void;
  onOpenImport: () => void;
  onClose?: () => void;
  asPage?: boolean;
}) {
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const cardContent = (
    <div
      onClick={(e) => {
        if (!asPage) e.stopPropagation();
      }}
      className={
        asPage
          ? 'w-full max-w-5xl mx-auto flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-[#DCE5EF] shadow-xs overflow-hidden'
          : 'w-full max-w-3xl max-h-[88vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden'
      }
    >
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/70 shrink-0">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0">
            <FolderKanban className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-slate-900 truncate">
              Daftar Unit Usaha ({projects.length})
            </h2>
            <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-0.5">
              <HardDrive className="w-3 h-3 text-emerald-600 shrink-0" />
              <span>Setiap unit usaha memiliki slug, domain kustom, dan pelacakan klik WA sendiri</span>
            </p>
          </div>
        </div>
        {!asPage && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-500 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

        <div className="px-5 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2 bg-white shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onCreateProject('template');
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Usaha Baru (Template)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onCreateProject('blank');
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer transition-colors"
            >
              <FilePlus2 className="w-3.5 h-3.5" />
              <span>Kanvas Kosong</span>
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDashboard();
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              <BarChart3 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Dashboard WA</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenImport();
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-semibold cursor-pointer"
            >
              <FileUp className="w-3.5 h-3.5" />
              <span>Import</span>
            </button>
            <button
              type="button"
              onClick={onBackupAll}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-xs font-semibold cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Backup ({projects.length})</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2.5 bg-slate-50/50">
          {projects.map((rec, idx) => {
            const isActive = rec.id === activeProjectId;
            const isConfirming = confirmDeleteId === rec.id;
            const pub = resolveProjectPublishing(rec.project);

            return (
              <div
                key={rec.id}
                className={`p-3.5 rounded-xl border transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isActive
                    ? 'bg-emerald-50/50 border-emerald-300 ring-1 ring-emerald-500/20'
                    : 'bg-white border-slate-200 hover:border-slate-300'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 text-xs font-bold flex items-center justify-center shrink-0 tabular-nums">
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-slate-900 truncate">
                        {rec.project.title || `Usaha #${idx + 1}`}
                      </span>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-md bg-emerald-600 text-white text-[10px] font-semibold">
                          Sedang Diedit
                        </span>
                      )}
                      <span
                        className={`text-[10px] font-semibold ${
                          pub.isPublished ? 'text-emerald-700' : 'text-slate-500'
                        }`}
                      >
                        · {pub.isPublished ? 'Tayang' : 'Draft'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-slate-500 mt-1 flex-wrap">
                      <span className="font-mono text-slate-700">
                        {pub.useCustomDomain && pub.customDomain
                          ? pub.customDomain
                          : `/p/${pub.slug}`}
                      </span>
                      <span>·</span>
                      <span>{rec.project.blocks.length} elemen</span>
                      <span>·</span>
                      <span>Diubah {formatUpdatedAt(rec.updatedAt)}</span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 flex-wrap shrink-0">
                  {!isActive && (
                    <button
                      type="button"
                      onClick={() => {
                        onSelectProject(rec.id);
                        onClose();
                      }}
                      className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer"
                    >
                      Buka
                    </button>
                  )}
                  <button
                    type="button"
                    onClick={() => {
                      onSelectProject(rec.id);
                      onClose();
                      onOpenDomainAndAds(rec.id);
                    }}
                    title="Atur Domain, Slug & Pixel Iklan"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer"
                  >
                    <Globe className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Domain & Iklan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDuplicateProject(rec.id);
                      onClose();
                    }}
                    title="Duplikat layout usaha ini untuk usaha baru"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>Duplikat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownloadHtml(rec)}
                    title="Unduh file HTML halaman usaha ini"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-medium cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>HTML</span>
                  </button>

                  {projects.length > 1 && (
                    isConfirming ? (
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => {
                            onDeleteProject(rec.id);
                            setConfirmDeleteId(null);
                          }}
                          className="px-2.5 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                        >
                          Yakin Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(rec.id)}
                        title="Hapus usaha ini"
                        className="p-1.5 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:border-red-200 text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )
                  )}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-2.5 border-t border-slate-200 bg-white text-[11px] text-slate-500 shrink-0">
          Tips: Selesaikan 1 usaha hingga rapi, lalu klik <strong>Duplikat</strong> untuk membuat usaha berikutnya agar tidak perlu menyusun ulang dari awal.
        </div>
      </div>
  );

  if (asPage) {
    return cardContent;
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      {cardContent}
    </div>
  );
}
