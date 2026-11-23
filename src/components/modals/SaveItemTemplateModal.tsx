import React, { useEffect, useMemo, useState } from 'react';
import { BookmarkPlus, Check, LayoutGrid, Wrench, X } from 'lucide-react';
import {
  AdvanceOptions,
  BuilderBlock,
  BuilderProject,
  PageTheme,
  SavedItemTemplateTarget,
} from '../../types/builder';
import { BLOCK_TYPE_NAMES, createDefaultBottomNavbar } from '../../data/presets';
import { generateProjectHtml } from '../../utils/htmlExporter';
import { countNestedBlocks } from '../../utils/itemTemplateStorage';

interface SaveItemTemplateModalProps {
  block: BuilderBlock | null;
  defaultTarget?: SavedItemTemplateTarget;
  theme: PageTheme;
  advanceOptions: AdvanceOptions;
  onClose: () => void;
  onConfirm: (payload: {
    name: string;
    description: string;
    target: SavedItemTemplateTarget;
  }) => void;
}

export function SaveItemTemplateModal({
  block,
  defaultTarget = 'blok',
  theme,
  advanceOptions,
  onClose,
  onConfirm,
}: SaveItemTemplateModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [target, setTarget] = useState<SavedItemTemplateTarget>(defaultTarget);

  useEffect(() => {
    if (!block) return;
    const fallbackName = block.label?.trim() || BLOCK_TYPE_NAMES[block.type] || 'Item Template';
    setName(fallbackName);
    setDescription('');
    setTarget(defaultTarget);
  }, [block, defaultTarget]);

  useEffect(() => {
    if (!block) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [block, onClose]);

  const previewHtml = useMemo(() => {
    if (!block) return '';
    const syntheticProject: BuilderProject = {
      title: block.label || 'Item Template',
      theme,
      blocks: [block],
      advanceOptions: {
        ...advanceOptions,
      },
      bottomNavbar: createDefaultBottomNavbar(theme, false),
    };
    return generateProjectHtml(syntheticProject);
  }, [block, theme, advanceOptions]);

  if (!block) return null;

  const totalElements = countNestedBlocks([block]);
  const blockTypeLabel = BLOCK_TYPE_NAMES[block.type] || block.type;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = name.trim() || blockTypeLabel;
    onConfirm({
      name: cleanName,
      description: description.trim(),
      target,
    });
  };

  return (
    <div
      className="fixed inset-0 z-[95] bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Simpan sebagai Item Template"
    >
      <div
        className="bg-white rounded-2xl border border-[#DCE5EF] shadow-2xl w-full max-w-[720px] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#DCE5EF] flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-[#ECFDF6] border border-[#00C98A]/35 text-[#00A873] flex items-center justify-center shrink-0">
              <BookmarkPlus className="w-4.5 h-4.5" />
            </span>
            <div className="min-w-0">
              <h3 className="text-[14px] font-bold text-[#17243D]">Simpan ke Item Template</h3>
              <p className="text-[11px] text-[#5B708B] truncate">
                Simpan desain dari Canvas untuk memperkaya daftar Alat maupun Blok Anda.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup modal simpan template"
            className="p-1.5 rounded-lg border border-[#DCE5EF] text-[#51637D] hover:bg-[#F0F5FA] hover:text-[#17243D] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-auto grid grid-cols-1 md:grid-cols-2">
          {/* Left: Form */}
          <div className="p-4 space-y-4 border-b md:border-b-0 md:border-r border-[#DCE5EF]">
            <div className="px-2.5 py-2 rounded-xl bg-[#F8FAFC] border border-[#DCE5EF] flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-[#51637D]">Sumber Elemen</span>
              <span className="text-[11px] font-bold text-[#17243D]">
                {blockTypeLabel} · {totalElements} lapisan
              </span>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="item-template-name"
                className="block text-[11.5px] font-bold text-[#17243D]"
              >
                Nama Item Template
              </label>
              <input
                id="item-template-name"
                type="text"
                required
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Mis. Kartu Promo Lebaran / Tombol WA Gradasi"
                className="w-full px-3 py-2 text-[12.5px] rounded-xl border border-[#DCE5EF] bg-[#F8FAFC] text-[#17243D] placeholder:text-[#8FA4BF] outline-none focus:bg-white focus:border-[#00C98A] transition-colors"
              />
            </div>

            <div className="space-y-1.5">
              <span className="block text-[11.5px] font-bold text-[#17243D]">
                Simpan &amp; Perkaya ke Bagian
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setTarget('alat')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    target === 'alat'
                      ? 'border-[#00C98A] bg-[#ECFDF6] ring-2 ring-[#00C98A]/20'
                      : 'border-[#DCE5EF] bg-white hover:border-[#00C98A]/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        target === 'alat'
                          ? 'bg-[#00C98A] text-white'
                          : 'bg-[#F0F5FA] text-[#5B708B]'
                      }`}
                    >
                      <Wrench className="w-3.5 h-3.5" />
                    </span>
                    {target === 'alat' && <Check className="w-4 h-4 text-[#00A873]" />}
                  </div>
                  <div className="text-[12px] font-bold text-[#17243D]">Alat</div>
                  <div className="text-[10px] text-[#5B708B] leading-snug mt-0.5">
                    Muncul di tab Alat sebagai komponen siap pakai
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setTarget('blok')}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    target === 'blok'
                      ? 'border-[#00C98A] bg-[#ECFDF6] ring-2 ring-[#00C98A]/20'
                      : 'border-[#DCE5EF] bg-white hover:border-[#00C98A]/50'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <span
                      className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                        target === 'blok'
                          ? 'bg-[#00C98A] text-white'
                          : 'bg-[#F0F5FA] text-[#5B708B]'
                      }`}
                    >
                      <LayoutGrid className="w-3.5 h-3.5" />
                    </span>
                    {target === 'blok' && <Check className="w-4 h-4 text-[#00A873]" />}
                  </div>
                  <div className="text-[12px] font-bold text-[#17243D]">Blok</div>
                  <div className="text-[10px] text-[#5B708B] leading-snug mt-0.5">
                    Muncul di tab Blok sebagai template card / seksi
                  </div>
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="item-template-desc"
                className="block text-[11.5px] font-bold text-[#17243D]"
              >
                Catatan / Deskripsi <span className="font-normal text-[#8FA4BF]">(opsional)</span>
              </label>
              <textarea
                id="item-template-desc"
                rows={2}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Mis. Sudah termasuk warna brand, icon WA, dan teks siap edit"
                className="w-full px-3 py-2 text-[12px] rounded-xl border border-[#DCE5EF] bg-[#F8FAFC] text-[#17243D] placeholder:text-[#8FA4BF] outline-none focus:bg-white focus:border-[#00C98A] transition-colors resize-none"
              />
            </div>

            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-[#DCE5EF] text-[12px] font-semibold text-[#51637D] hover:bg-[#F0F5FA] transition-colors cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00C98A] hover:bg-[#00B078] text-white text-[12px] font-bold shadow-sm transition-colors cursor-pointer"
              >
                <BookmarkPlus className="w-4 h-4" />
                Simpan Item Template
              </button>
            </div>
          </div>

          {/* Right: Live Mini Preview */}
          <div className="bg-[#EDF2F7] p-4 flex flex-col items-center justify-center min-h-[300px]">
            <div className="text-[10.5px] font-semibold text-[#5B708B] mb-2">
              Pratinjau Item yang Disimpan
            </div>
            <div className="w-full max-w-[310px] rounded-2xl border border-[#DCE5EF] bg-white shadow-md overflow-hidden">
              <iframe
                title="Pratinjau Item Template"
                srcDoc={previewHtml}
                sandbox="allow-scripts"
                className="w-full h-[300px] border-0 bg-white block pointer-events-none"
              />
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
