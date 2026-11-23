import React, { useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  ChevronUp,
  Download,
  FilePlus2,
  Files,
  Globe,
  Layers,
  Lock,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Upload,
  Users,
} from 'lucide-react';
import type { AuthUser, SavedWebTemplate } from '../../types/builder';
import {
  WEB_TEMPLATE_CATEGORY_LABELS,
  buildExportableWebTemplateJson,
} from '../../utils/webTemplateHelpers';

interface WebTemplatesSectionProps {
  templates: SavedWebTemplate[];
  loading?: boolean;
  currentUser?: AuthUser | null;
  canEditCanvas?: boolean;
  canCreateProject?: boolean;
  onOpenSaveModal: () => void;
  onOpenEditModal: (tpl: SavedWebTemplate) => void;
  onApplyToCurrentProject: (tpl: SavedWebTemplate) => void;
  onCreateProjectFromTemplate?: (tpl: SavedWebTemplate) => void;
  onOverwriteFromCanvas?: (tpl: SavedWebTemplate) => void;
  onDeleteTemplate: (tpl: SavedWebTemplate) => void;
  onImportTemplateJson: (rawText: string) => void;
  onRefresh?: () => void;
}

type FilterScope = 'all' | 'shared' | 'mine';

export function WebTemplatesSection({
  templates,
  loading = false,
  currentUser = null,
  canEditCanvas = true,
  canCreateProject = true,
  onOpenSaveModal,
  onOpenEditModal,
  onApplyToCurrentProject,
  onCreateProjectFromTemplate,
  onOverwriteFromCanvas,
  onDeleteTemplate,
  onImportTemplateJson,
  onRefresh,
}: WebTemplatesSectionProps) {
  const [search, setSearch] = useState('');
  const [scope, setScope] = useState<FilterScope>('all');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [confirmState, setConfirmState] = useState<{
    id: string;
    action: 'apply' | 'overwrite' | 'delete';
  } | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const isAdmin =
    currentUser?.role === 'super_admin' || currentUser?.role === 'admin';

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((tpl) => {
      if (scope === 'shared' && tpl.visibility !== 'shared') return false;
      if (scope === 'mine' && currentUser?.id && tpl.createdByUserId !== currentUser.id) {
        return false;
      }
      if (!q) return true;
      const catLabel = (WEB_TEMPLATE_CATEGORY_LABELS[tpl.category] || '').toLowerCase();
      return (
        tpl.name.toLowerCase().includes(q) ||
        (tpl.description || '').toLowerCase().includes(q) ||
        catLabel.includes(q) ||
        (tpl.createdByName || '').toLowerCase().includes(q) ||
        (tpl.subPageTitles || []).some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [templates, search, scope, currentUser?.id]);

  const handleDownloadJson = (tpl: SavedWebTemplate) => {
    const json = buildExportableWebTemplateJson(tpl);
    const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const safeSlug = tpl.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '') || 'template-web';
    a.href = url;
    a.download = `${safeSlug}.webtemplate.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        onImportTemplateJson(reader.result);
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="space-y-2.5">
      <p className="text-[10.5px] text-[#51637D] leading-relaxed">
        Simpan seluruh halaman penuh beserta sub-halaman di dalamnya agar bisa dipakai &amp; diedit
        oleh banyak orang.
      </p>

      {/* Primary Action Bar */}
      <div className="flex items-center gap-1.5">
        {canEditCanvas && (
          <button
            type="button"
            onClick={onOpenSaveModal}
            className="flex-1 inline-flex items-center justify-center gap-1.5 px-2.5 py-2 rounded-lg bg-[#00C98A] hover:bg-[#00B37B] text-white text-[11px] font-bold shadow-xs transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>Simpan Web Ini</span>
          </button>
        )}

        {canEditCanvas && (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            title="Impor file Template Web (.json)"
            className="inline-flex items-center gap-1 px-2 py-2 rounded-lg border border-[#DCE5EF] bg-white hover:bg-[#F8FAFC] hover:border-[#00C98A] text-[#51637D] hover:text-[#17243D] text-[10.5px] font-semibold transition-colors cursor-pointer shrink-0"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Impor</span>
          </button>
        )}

        {onRefresh && (
          <button
            type="button"
            onClick={onRefresh}
            disabled={loading}
            title="Muat ulang daftar Template Web"
            className="p-2 rounded-lg border border-[#DCE5EF] bg-white hover:bg-[#F8FAFC] text-[#64748B] hover:text-[#17243D] transition-colors cursor-pointer shrink-0 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept=".json,application/json"
          onChange={handleFileChange}
          className="hidden"
        />
      </div>

      {/* Search & Filter */}
      {templates.length > 0 && (
        <div className="space-y-1.5">
          <div className="relative">
            <Search className="w-3 h-3 text-[#8FA4BF] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Cari nama, kategori, sub-halaman..."
              className="w-full pl-7 pr-2.5 py-1.5 text-[11px] rounded-lg border border-[#DCE5EF] bg-white text-[#17243D] placeholder:text-[#8FA4BF] outline-none focus:border-[#00C98A]"
            />
          </div>

          <div className="grid grid-cols-3 gap-1">
            {(
              [
                { id: 'all', label: `Semua (${templates.length})` },
                {
                  id: 'shared',
                  label: `Tim (${templates.filter((t) => t.visibility === 'shared').length})`,
                },
                {
                  id: 'mine',
                  label: 'Milik Saya',
                },
              ] as const
            ).map((tab) => {
              const active = scope === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setScope(tab.id)}
                  className={`py-1 px-1.5 rounded-md text-[10px] font-semibold border transition-colors cursor-pointer truncate ${
                    active
                      ? 'bg-[#17243D] text-white border-[#17243D]'
                      : 'bg-white text-[#5B708B] border-[#DCE5EF] hover:border-[#8FA4BF]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Template List */}
      {loading && templates.length === 0 ? (
        <div className="py-5 px-3 text-center rounded-xl border border-dashed border-[#DCE5EF] bg-white text-[11px] text-[#8FA4BF]">
          Memuat pustaka Template Web...
        </div>
      ) : filteredTemplates.length === 0 ? (
        <div className="py-5 px-3 text-center rounded-xl border border-dashed border-[#DCE5EF] bg-white/80 space-y-1.5">
          <div className="w-8 h-8 mx-auto rounded-full bg-[#ECFDF6] text-[#00A873] flex items-center justify-center">
            <Globe className="w-4 h-4" />
          </div>
          <div className="text-[11.5px] font-bold text-[#17243D]">
            {templates.length === 0 ? 'Belum ada Template Web' : 'Template tidak ditemukan'}
          </div>
          <p className="text-[10px] text-[#64748B] leading-snug">
            {templates.length === 0
              ? 'Klik "Simpan Web Ini" untuk membungkus Beranda + semua Sub Halaman menjadi template siap pakai banyak orang.'
              : 'Coba ubah kata kunci pencarian atau filter.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2 max-h-[380px] overflow-y-auto pr-0.5">
          {filteredTemplates.map((tpl) => {
            const isOwner = Boolean(currentUser?.id && tpl.createdByUserId === currentUser.id);
            const canEditMaster =
              canEditCanvas &&
              (isOwner || isAdmin || (tpl.visibility === 'shared' && tpl.allowCollaborativeEdit));
            const canDelete = isOwner || isAdmin;
            const isExpanded = expandedId === tpl.id;
            const activeConfirm = confirmState?.id === tpl.id ? confirmState.action : null;

            return (
              <div
                key={tpl.id}
                className="rounded-xl border border-[#DCE5EF] bg-white p-2.5 space-y-2 hover:border-[#00C98A]/70 transition-colors"
              >
                {/* Swatches + Category + Visibility */}
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1 min-w-0">
                    {(tpl.paletteColors || []).slice(0, 4).map((sw, idx) => (
                      <span
                        key={idx}
                        style={{ backgroundColor: sw }}
                        className="w-2.5 h-2.5 rounded-full border border-black/15 shrink-0"
                      />
                    ))}
                    <span className="ml-1 px-1.5 py-0.5 rounded bg-[#F0F5FA] text-[9px] font-bold text-[#51637D] truncate">
                      {WEB_TEMPLATE_CATEGORY_LABELS[tpl.category] || 'Bisnis'}
                    </span>
                  </div>
                  <span
                    className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-bold shrink-0 ${
                      tpl.visibility === 'shared'
                        ? 'bg-[#ECFDF6] text-[#065F46] border border-[#00C98A]/30'
                        : 'bg-slate-100 text-slate-600 border border-slate-200'
                    }`}
                  >
                    {tpl.visibility === 'shared' ? (
                      <>
                        <Users className="w-2.5 h-2.5" />
                        <span>Publik Tim</span>
                      </>
                    ) : (
                      <>
                        <Lock className="w-2.5 h-2.5" />
                        <span>Pribadi</span>
                      </>
                    )}
                  </span>
                </div>

                {/* Title & Description */}
                <div>
                  <div className="text-[12px] font-bold text-[#17243D] leading-snug break-words">
                    {tpl.name}
                  </div>
                  {tpl.description && (
                    <p className="text-[10px] text-[#64748B] leading-snug mt-0.5 line-clamp-2">
                      {tpl.description}
                    </p>
                  )}
                </div>

                {/* Structure Summary & Creator */}
                <div className="flex flex-wrap items-center gap-1 text-[9.5px] text-[#51637D]">
                  <button
                    type="button"
                    onClick={() => setExpandedId(isExpanded ? null : tpl.id)}
                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 font-semibold border border-blue-200/70 hover:bg-blue-100 cursor-pointer"
                  >
                    <Files className="w-2.5 h-2.5" />
                    <span>
                      Beranda + {tpl.subPageCount} Sub ({tpl.totalBlockCount} blok)
                    </span>
                    {isExpanded ? (
                      <ChevronUp className="w-2.5 h-2.5" />
                    ) : (
                      <ChevronDown className="w-2.5 h-2.5" />
                    )}
                  </button>
                  {tpl.usageCount > 0 && (
                    <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 font-medium">
                      Dipakai {tpl.usageCount}x
                    </span>
                  )}
                </div>

                {/* Expandable Sub-pages Structure Preview */}
                {isExpanded && (
                  <div className="p-2 rounded-lg bg-[#F8FAFC] border border-[#DCE5EF] space-y-1 text-[10px]">
                    <div className="flex items-center justify-between text-[#17243D] font-semibold">
                      <span className="inline-flex items-center gap-1">
                        <Layers className="w-3 h-3 text-[#00A873]" />
                        Beranda (Halaman Utama)
                      </span>
                      <span className="text-[#64748B]">{tpl.mainBlockCount} blok</span>
                    </div>
                    {tpl.subPageTitles.length === 0 ? (
                      <div className="text-[9.5px] text-[#8FA4BF] pl-4">
                        Tidak ada sub-halaman tambahan
                      </div>
                    ) : (
                      <div className="pl-3 space-y-0.5 border-l-2 border-blue-200 ml-1">
                        {tpl.subPageTitles.map((subTitle, idx) => (
                          <div key={idx} className="text-[10px] text-[#334155] truncate">
                            • {subTitle}
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="pt-1 border-t border-[#E2E8F0] text-[9.5px] text-[#64748B] flex items-center justify-between gap-2">
                      <span className="truncate">Dibuat oleh {tpl.createdByName}</span>
                      {tpl.allowCollaborativeEdit && (
                        <span className="text-[#008F63] font-semibold shrink-0">Kolaboratif</span>
                      )}
                    </div>
                  </div>
                )}

                {/* Inline Confirmation Banner (No window.confirm!) */}
                {activeConfirm && (
                  <div className="p-2 rounded-lg bg-amber-50 border border-amber-200 space-y-1.5">
                    <div className="text-[10px] font-semibold text-amber-900 leading-snug">
                      {activeConfirm === 'apply'
                        ? 'Terapkan template ini ke proyek aktif? Isi Beranda, Sub Halaman, Tema & Navbar saat ini akan diganti (slug & publish tetap aman).'
                        : activeConfirm === 'overwrite'
                        ? 'Timpa isi Template Web master ini dengan desain Kanvas + Sub Halaman Anda saat ini?'
                        : `Hapus Template Web "${tpl.name}" secara permanen?`}
                    </div>
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => setConfirmState(null)}
                        className="px-2 py-1 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                      >
                        Batal
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          const act = activeConfirm;
                          setConfirmState(null);
                          if (act === 'apply') onApplyToCurrentProject(tpl);
                          else if (act === 'overwrite') onOverwriteFromCanvas?.(tpl);
                          else if (act === 'delete') onDeleteTemplate(tpl);
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-md text-[10px] font-bold text-white cursor-pointer ${
                          activeConfirm === 'delete'
                            ? 'bg-red-600 hover:bg-red-700'
                            : 'bg-[#00C98A] hover:bg-[#00B37B]'
                        }`}
                      >
                        <Check className="w-3 h-3" />
                        <span>
                          {activeConfirm === 'apply'
                            ? 'Ya, Terapkan'
                            : activeConfirm === 'overwrite'
                            ? 'Ya, Perbarui'
                            : 'Ya, Hapus'}
                        </span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Primary Use Buttons */}
                <div className="flex items-center gap-1.5 pt-0.5">
                  {canEditCanvas && (
                    <button
                      type="button"
                      onClick={() => setConfirmState({ id: tpl.id, action: 'apply' })}
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-[#ECFDF6] hover:bg-[#00C98A] text-[#065F46] hover:text-white border border-[#00C98A]/35 text-[10.5px] font-bold transition-colors cursor-pointer"
                    >
                      <Sparkles className="w-3 h-3" />
                      <span>Terapkan</span>
                    </button>
                  )}

                  {canCreateProject && onCreateProjectFromTemplate && (
                    <button
                      type="button"
                      onClick={() => onCreateProjectFromTemplate(tpl)}
                      title="Buat proyek baru independen dari Template Web ini"
                      className="flex-1 inline-flex items-center justify-center gap-1 px-2 py-1.5 rounded-lg bg-[#17243D] hover:bg-[#233454] text-white text-[10.5px] font-bold transition-colors cursor-pointer"
                    >
                      <FilePlus2 className="w-3 h-3" />
                      <span>Proyek Baru</span>
                    </button>
                  )}
                </div>

                {/* Secondary Manage Footer */}
                <div className="flex items-center justify-between pt-1 border-t border-[#F1F5F9]">
                  <span className="text-[9.5px] text-[#8FA4BF] truncate max-w-[110px]">
                    oleh {tpl.createdByName}
                  </span>
                  <div className="flex items-center gap-0.5">
                    {canEditMaster && onOverwriteFromCanvas && (
                      <button
                        type="button"
                        onClick={() => setConfirmState({ id: tpl.id, action: 'overwrite' })}
                        title="Perbarui isi template master dari Kanvas saat ini"
                        className="p-1 rounded hover:bg-amber-50 text-[#64748B] hover:text-amber-700 cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3" />
                      </button>
                    )}
                    {canEditMaster && (
                      <button
                        type="button"
                        onClick={() => onOpenEditModal(tpl)}
                        title="Edit info Template Web"
                        className="p-1 rounded hover:bg-[#F0F5FA] text-[#64748B] hover:text-[#17243D] cursor-pointer"
                      >
                        <Pencil className="w-3 h-3" />
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() => handleDownloadJson(tpl)}
                      title="Unduh file JSON Template Web"
                      className="p-1 rounded hover:bg-[#F0F5FA] text-[#64748B] hover:text-[#00A873] cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                    {canDelete && (
                      <button
                        type="button"
                        onClick={() => setConfirmState({ id: tpl.id, action: 'delete' })}
                        title="Hapus Template Web"
                        className="p-1 rounded hover:bg-red-50 text-[#64748B] hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
