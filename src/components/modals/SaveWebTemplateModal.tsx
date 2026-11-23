import React, { useEffect, useState } from 'react';
import {
  Check,
  Files,
  Globe,
  Layers,
  Lock,
  Save,
  Sparkles,
  Users,
  X,
} from 'lucide-react';
import type {
  SavedWebTemplate,
  WebTemplateCategory,
  WebTemplateVisibility,
} from '../../types/builder';
import { WEB_TEMPLATE_CATEGORIES } from '../../utils/webTemplateHelpers';

interface SaveWebTemplateModalProps {
  isOpen: boolean;
  mode: 'create' | 'edit';
  initialTemplate?: SavedWebTemplate | null;
  defaultName: string;
  mainBlockCount: number;
  subPageTitles: string[];
  paletteColors: string[];
  hasBottomNavbar: boolean;
  canEditVisibility?: boolean;
  isSubmitting?: boolean;
  onClose: () => void;
  onSubmit: (payload: {
    name: string;
    description: string;
    category: WebTemplateCategory;
    visibility: WebTemplateVisibility;
    allowCollaborativeEdit: boolean;
    includeCanvasSnapshot?: boolean;
  }) => void;
}

export function SaveWebTemplateModal({
  isOpen,
  mode,
  initialTemplate,
  defaultName,
  mainBlockCount,
  subPageTitles,
  paletteColors,
  hasBottomNavbar,
  canEditVisibility = true,
  isSubmitting = false,
  onClose,
  onSubmit,
}: SaveWebTemplateModalProps) {
  const [name, setName] = useState(defaultName);
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<WebTemplateCategory>('bisnis');
  const [visibility, setVisibility] = useState<WebTemplateVisibility>('shared');
  const [allowCollaborativeEdit, setAllowCollaborativeEdit] = useState(false);
  const [refreshSnapshotOnEdit, setRefreshSnapshotOnEdit] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (!isOpen) return;
    setErrorMsg('');
    if (mode === 'edit' && initialTemplate) {
      setName(initialTemplate.name);
      setDescription(initialTemplate.description || '');
      setCategory(initialTemplate.category || 'bisnis');
      setVisibility(initialTemplate.visibility || 'shared');
      setAllowCollaborativeEdit(Boolean(initialTemplate.allowCollaborativeEdit));
      setRefreshSnapshotOnEdit(false);
    } else {
      setName(defaultName || 'Template Web Baru');
      setDescription('');
      setCategory('bisnis');
      setVisibility('shared');
      setAllowCollaborativeEdit(false);
      setRefreshSnapshotOnEdit(false);
    }
  }, [isOpen, mode, initialTemplate, defaultName]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) {
      setErrorMsg('Nama Template Web wajib diisi.');
      return;
    }
    onSubmit({
      name: trimmed,
      description: description.trim(),
      category,
      visibility,
      allowCollaborativeEdit,
      includeCanvasSnapshot: mode === 'create' ? true : refreshSnapshotOnEdit,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[120] bg-slate-900/55 backdrop-blur-[2px] flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md bg-white rounded-2xl border border-[#DCE5EF] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3.5 border-b border-[#DCE5EF] bg-[#F8FAFC] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-[#ECFDF6] border border-[#00C98A]/30 text-[#00A873] flex items-center justify-center shrink-0">
              <Globe className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h3 className="text-[13.5px] font-bold text-[#17243D] truncate">
                {mode === 'edit' ? 'Edit Info Template Web' : 'Simpan sebagai Template Web'}
              </h3>
              <p className="text-[10.5px] text-[#64748B] truncate">
                {mode === 'edit'
                  ? 'Ubah nama, kategori, akses berbagi, atau perbarui isi halaman.'
                  : 'Menyimpan Beranda + seluruh Sub Halaman + Tema & Navbar.'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal"
            className="w-7 h-7 rounded-lg text-[#64748B] hover:text-[#17243D] hover:bg-slate-200/70 flex items-center justify-center cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-3.5 overflow-y-auto">
          {/* Snapshot Summary Card */}
          <div className="p-3 rounded-xl bg-[#F0F5FA]/75 border border-[#DCE5EF] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[10.5px] font-bold text-[#17243D] inline-flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#00A873]" />
                <span>
                  {mode === 'edit' && !refreshSnapshotOnEdit
                    ? 'Isi Template Tersimpan'
                    : 'Paket Halaman yang Disimpan'}
                </span>
              </span>
              <div className="flex items-center gap-1">
                {(mode === 'edit' && !refreshSnapshotOnEdit && initialTemplate
                  ? initialTemplate.paletteColors
                  : paletteColors
                )
                  .slice(0, 4)
                  .map((sw, idx) => (
                    <span
                      key={idx}
                      style={{ backgroundColor: sw }}
                      className="w-3.5 h-3.5 rounded-full border border-black/15"
                    />
                  ))}
              </div>
            </div>

            {(() => {
              const effectiveMain =
                mode === 'edit' && !refreshSnapshotOnEdit && initialTemplate
                  ? initialTemplate.mainBlockCount
                  : mainBlockCount;
              const effectiveSubTitles =
                mode === 'edit' && !refreshSnapshotOnEdit && initialTemplate
                  ? initialTemplate.subPageTitles
                  : subPageTitles;
              return (
                <>
                  <div className="flex flex-wrap items-center gap-1.5 text-[10.5px]">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#DCE5EF] font-semibold text-[#17243D]">
                      <Layers className="w-3 h-3 text-[#00A873]" />
                      Beranda ({effectiveMain} blok)
                    </span>
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-white border border-[#DCE5EF] font-semibold text-[#17243D]">
                      <Files className="w-3 h-3 text-blue-600" />
                      {effectiveSubTitles.length} Sub Halaman
                    </span>
                    {hasBottomNavbar && (
                      <span className="px-2 py-0.5 rounded-md bg-white border border-[#DCE5EF] font-medium text-[#51637D]">
                        + Tema &amp; Navbar
                      </span>
                    )}
                  </div>
                  {effectiveSubTitles.length > 0 && (
                    <div className="flex flex-wrap gap-1 pt-0.5">
                      {effectiveSubTitles.slice(0, 8).map((title, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded bg-blue-50 text-blue-700 text-[9.5px] font-medium border border-blue-200/70"
                        >
                          /{title}
                        </span>
                      ))}
                      {effectiveSubTitles.length > 8 && (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 text-[9.5px] font-medium">
                          +{effectiveSubTitles.length - 8} lainnya
                        </span>
                      )}
                    </div>
                  )}
                </>
              );
            })()}
          </div>

          {errorMsg && (
            <div className="px-3 py-2 rounded-lg bg-red-50 border border-red-200 text-[11px] font-medium text-red-700">
              {errorMsg}
            </div>
          )}

          {/* Nama Template */}
          <div>
            <label className="block text-[11.5px] font-semibold text-[#17243D] mb-1">
              Nama Template Web <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={name}
              maxLength={80}
              onChange={(e) => {
                setName(e.target.value);
                if (errorMsg) setErrorMsg('');
              }}
              placeholder="Contoh: Toko Kopi + 3 Sub Halaman Menu"
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE5EF] bg-white text-[#17243D] outline-none focus:border-[#00C98A]"
            />
          </div>

          {/* Kategori */}
          <div>
            <label className="block text-[11.5px] font-semibold text-[#17243D] mb-1">
              Kategori Template
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as WebTemplateCategory)}
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE5EF] bg-white text-[#17243D] outline-none focus:border-[#00C98A]"
            >
              {WEB_TEMPLATE_CATEGORIES.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Deskripsi */}
          <div>
            <label className="block text-[11.5px] font-semibold text-[#17243D] mb-1">
              Deskripsi Singkat <span className="text-[#8FA4BF] font-normal">(opsional)</span>
            </label>
            <textarea
              rows={2}
              maxLength={240}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Jelaskan isi halaman & sub-halaman agar tim mudah memilih template ini..."
              className="w-full px-3 py-2 text-xs rounded-lg border border-[#DCE5EF] bg-white text-[#17243D] outline-none focus:border-[#00C98A] resize-none"
            />
          </div>

          {/* Visibilitas Multi-User */}
          {canEditVisibility && (
            <div className="space-y-2">
              <label className="block text-[11.5px] font-semibold text-[#17243D]">
                Akses Penggunaan
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setVisibility('shared')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    visibility === 'shared'
                      ? 'border-[#00C98A] bg-[#ECFDF6] ring-1 ring-[#00C98A]/30'
                      : 'border-[#DCE5EF] bg-white hover:border-[#8FA4BF]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Users className="w-4 h-4 text-[#00A873]" />
                    {visibility === 'shared' && <Check className="w-3.5 h-3.5 text-[#00A873]" />}
                  </div>
                  <div className="text-[11.5px] font-bold text-[#17243D]">Publik Tim</div>
                  <div className="text-[10px] text-[#51637D] leading-snug mt-0.5">
                    Bisa dipakai &amp; diedit salinannya oleh banyak orang
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setVisibility('private')}
                  className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                    visibility === 'private'
                      ? 'border-[#17243D] bg-slate-50 ring-1 ring-slate-300'
                      : 'border-[#DCE5EF] bg-white hover:border-[#8FA4BF]'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1">
                    <Lock className="w-4 h-4 text-[#51637D]" />
                    {visibility === 'private' && <Check className="w-3.5 h-3.5 text-[#17243D]" />}
                  </div>
                  <div className="text-[11.5px] font-bold text-[#17243D]">Pribadi</div>
                  <div className="text-[10px] text-[#51637D] leading-snug mt-0.5">
                    Hanya terlihat oleh Anda &amp; Admin
                  </div>
                </button>
              </div>

              {visibility === 'shared' && (
                <label className="flex items-start gap-2 p-2.5 rounded-lg bg-[#F8FAFC] border border-[#DCE5EF] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allowCollaborativeEdit}
                    onChange={(e) => setAllowCollaborativeEdit(e.target.checked)}
                    className="mt-0.5 rounded border-[#CBD5E1] text-[#00C98A] focus:ring-[#00C98A]"
                  />
                  <span className="text-[10.5px] text-[#51637D] leading-snug">
                    <strong className="text-[#17243D]">
                      Izinkan editor lain ikut memperbarui template master
                    </strong>
                    <br />
                    Tanpa dicentang pun, semua orang tetap bebas memakai &amp; mengedit salinannya
                    di proyek masing-masing.
                  </span>
                </label>
              )}
            </div>
          )}

          {mode === 'edit' && (
            <label className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50/70 border border-amber-200 cursor-pointer">
              <input
                type="checkbox"
                checked={refreshSnapshotOnEdit}
                onChange={(e) => setRefreshSnapshotOnEdit(e.target.checked)}
                className="mt-0.5 rounded border-amber-300 text-amber-600 focus:ring-amber-500"
              />
              <span className="text-[10.5px] text-amber-900 leading-snug">
                <strong>Timpa isi template dengan Kanvas saat ini</strong> (Beranda {mainBlockCount}{' '}
                blok + {subPageTitles.length} sub-halaman)
              </span>
            </label>
          )}

          {/* Footer buttons */}
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#DCE5EF]">
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              className="px-3.5 py-2 rounded-lg border border-[#DCE5EF] bg-white hover:bg-[#F8FAFC] text-xs font-semibold text-[#51637D] cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-[#00C98A] hover:bg-[#00B37B] disabled:opacity-60 text-white text-xs font-bold shadow-xs cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>
                {isSubmitting
                  ? 'Menyimpan...'
                  : mode === 'edit'
                  ? 'Simpan Perubahan'
                  : 'Simpan Template Web'}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
