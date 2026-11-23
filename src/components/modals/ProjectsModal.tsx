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
          ? 'w-full max-w-5xl mx-auto flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-[#DCE5EF] overflow-hidden'
          : 'w-full max-w-3xl max-h-[88vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-[#DCE5EF] overflow-hidden'
      }
    >
      <div className="px-5 py-4 border-b border-[#DCE5EF] flex items-center justify-between gap-3 bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#ECFDF6] border border-[#00C98A]/35 text-[#00A873] flex items-center justify-center shrink-0">
            <FolderKanban className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#17243D] tracking-tight truncate">
              Daftar Unit Usaha ({projects.length})
            </h2>
            <p className="text-xs text-[#5B708B] flex items-center gap-1.5 mt-0.5">
              <HardDrive className="w-3.5 h-3.5 text-[#00A873] shrink-0" />
              <span className="truncate">
                Setiap unit usaha memiliki slug, domain kustom, dan pelacakan klik WA sendiri
              </span>
            </p>
          </div>
        </div>
        {!asPage && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F0F5FA] text-[#5B708B] hover:text-[#17243D] transition-colors cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

        <div className="px-5 py-3 border-b border-[#DCE5EF] flex flex-wrap items-center justify-between gap-2 bg-[#F0F5FA]/50 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onCreateProject('template');
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#17243D] hover:bg-[#223456] text-white text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5 text-[#00C98A]" />
              <span>Usaha Baru (Templat)</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onCreateProject('blank');
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] hover:border-[#8FA4BF] text-[#17243D] text-xs font-semibold cursor-pointer transition-colors whitespace-nowrap"
            >
              <FilePlus2 className="w-3.5 h-3.5 text-[#5B708B]" />
              <span>Kanvas Kosong</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenDashboard();
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] hover:border-[#8FA4BF] text-[#17243D] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <BarChart3 className="w-3.5 h-3.5 text-[#00A873]" />
              <span>Analitik WA</span>
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onOpenImport();
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] hover:border-[#8FA4BF] text-[#17243D] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <FileUp className="w-3.5 h-3.5 text-[#5B708B]" />
              <span>Impor</span>
            </button>
            <button
              type="button"
              onClick={onBackupAll}
              className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl border border-[#00C98A]/35 bg-[#ECFDF6] hover:bg-[#00C98A]/15 text-[#008F63] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums"
            >
              <Download className="w-3.5 h-3.5 text-[#00A873]" />
              <span>Backup ({projects.length})</span>
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-2.5 bg-[#F0F5FA]/60">
          {projects.map((rec, idx) => {
            const isActive = rec.id === activeProjectId;
            const isConfirming = confirmDeleteId === rec.id;
            const pub = resolveProjectPublishing(rec.project);

            return (
              <div
                key={rec.id}
                className={`p-3.5 rounded-xl border transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                  isActive
                    ? 'bg-[#ECFDF6]/70 border-[#00C98A]/60'
                    : 'bg-white border-[#DCE5EF] hover:border-[#8FA4BF]'
                }`}
              >
                <div className="flex items-start sm:items-center gap-3 min-w-0">
                  <div
                    className={`w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0 tabular-nums ${
                      isActive
                        ? 'bg-[#17243D] text-[#00C98A]'
                        : 'bg-[#F0F5FA] text-[#5B708B]'
                    }`}
                  >
                    {idx + 1}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-bold text-[#17243D] truncate">
                        {rec.project.title || `Usaha #${idx + 1}`}
                      </span>
                      {isActive && (
                        <span className="px-2 py-0.5 rounded-md bg-[#17243D] text-[#00C98A] text-[10px] font-semibold">
                          Sedang Diedit
                        </span>
                      )}
                      <span
                        className={`text-[11px] font-semibold ${
                          pub.isPublished ? 'text-[#008F63]' : 'text-[#8FA4BF]'
                        }`}
                      >
                        · {pub.isPublished ? 'Tayang' : 'Draf'}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-[#5B708B] mt-1 flex-wrap tabular-nums">
                      <span className="font-mono text-[#17243D]">
                        {pub.useCustomDomain && pub.customDomain
                          ? pub.customDomain
                          : `/${pub.slug}`}
                      </span>
                      <span aria-hidden="true">·</span>
                      <span>{rec.project.blocks.length} elemen</span>
                      <span aria-hidden="true">·</span>
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
                      className="px-3 py-1.5 rounded-lg bg-[#17243D] hover:bg-[#223456] text-white text-xs font-semibold transition-colors cursor-pointer"
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
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] hover:border-[#8FA4BF] text-[#17243D] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Globe className="w-3.5 h-3.5 text-[#00A873]" />
                    <span>Domain &amp; Iklan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onDuplicateProject(rec.id);
                      onClose();
                    }}
                    title="Duplikat layout usaha ini untuk usaha baru"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] hover:border-[#8FA4BF] text-[#17243D] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Copy className="w-3.5 h-3.5 text-[#5B708B]" />
                    <span>Duplikat</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => onDownloadHtml(rec)}
                    title="Unduh file HTML halaman usaha ini"
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] hover:border-[#8FA4BF] text-[#17243D] text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
                  >
                    <Download className="w-3.5 h-3.5 text-[#5B708B]" />
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
                          className="px-2.5 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                        >
                          Yakin Hapus
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(null)}
                          className="px-2 py-1.5 rounded-lg border border-[#DCE5EF] bg-white text-[#5B708B] hover:text-[#17243D] text-xs font-semibold cursor-pointer"
                        >
                          Batal
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteId(rec.id)}
                        title="Hapus usaha ini"
                        className="p-1.5 rounded-lg border border-[#DCE5EF] bg-white hover:bg-rose-50 hover:border-rose-200 text-[#8FA4BF] hover:text-rose-600 transition-colors cursor-pointer"
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

        <div className="px-5 py-3 border-t border-[#DCE5EF] bg-white text-[11px] text-[#5B708B] shrink-0">
          Tips: Selesaikan 1 usaha hingga rapi, lalu klik <strong className="text-[#17243D]">Duplikat</strong> untuk membuat usaha berikutnya agar tidak perlu menyusun ulang dari awal.
        </div>
      </div>
  );

  if (asPage) {
    return cardContent;
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#17243D]/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      {cardContent}
    </div>
  );
}
