import React, { useEffect, useMemo, useState } from 'react';
import { Eye, Monitor, Plus, Smartphone, X } from 'lucide-react';
import { AdvanceOptions, BuilderBlock, BuilderProject, PageTheme } from '../../types/builder';
import { createDefaultBottomNavbar } from '../../data/presets';
import { generateProjectHtml } from '../../utils/htmlExporter';
import { countNestedBlocks } from '../../utils/itemTemplateStorage';

export interface ItemPreviewPayload {
  title: string;
  description?: string;
  badge: string;
  icon?: React.ReactNode;
  blocks: BuilderBlock[];
  onInsert: () => void;
}

interface ItemPreviewModalProps {
  item: ItemPreviewPayload | null;
  theme: PageTheme;
  advanceOptions: AdvanceOptions;
  onClose: () => void;
}

export function ItemPreviewModal({
  item,
  theme,
  advanceOptions,
  onClose,
}: ItemPreviewModalProps) {
  const [viewport, setViewport] = useState<'mobile' | 'desktop'>('mobile');

  useEffect(() => {
    if (!item) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [item, onClose]);

  const previewHtml = useMemo(() => {
    if (!item) return '';
    const syntheticProject: BuilderProject = {
      title: item.title,
      theme,
      blocks: item.blocks,
      advanceOptions: {
        ...advanceOptions,
      },
      bottomNavbar: createDefaultBottomNavbar(theme, false),
    };
    return generateProjectHtml(syntheticProject);
  }, [item, theme, advanceOptions]);

  if (!item) return null;

  const totalElements = countNestedBlocks(item.blocks);

  return (
    <div
      className="fixed inset-0 z-[90] bg-slate-950/60 backdrop-blur-[2px] flex items-center justify-center p-3 sm:p-5"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label={`Pratinjau ${item.title}`}
    >
      <div
        className="bg-white rounded-2xl border border-[#DCE5EF] shadow-2xl w-full max-w-[780px] max-h-[90vh] flex flex-col overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-4 py-3 border-b border-[#DCE5EF] flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-9 h-9 rounded-xl bg-[#ECFDF6] border border-[#00C98A]/30 text-[#00A873] flex items-center justify-center shrink-0">
              {item.icon ?? <Eye className="w-4 h-4" />}
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h3 className="text-[14px] font-bold text-[#17243D] truncate">{item.title}</h3>
                <span className="px-2 py-0.5 rounded-md bg-[#F0F5FA] border border-[#DCE5EF] text-[10px] font-semibold text-[#51637D]">
                  {item.badge}
                </span>
                <span className="text-[10.5px] font-medium text-[#8FA4BF]">
                  {totalElements} elemen
                </span>
              </div>
              {item.description && (
                <p className="text-[11.5px] text-[#5B708B] truncate mt-0.5">{item.description}</p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <div className="hidden sm:flex items-center p-0.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
              <button
                type="button"
                onClick={() => setViewport('mobile')}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  viewport === 'mobile'
                    ? 'bg-white text-[#17243D] shadow-xs'
                    : 'text-[#64748B] hover:text-[#17243D]'
                }`}
              >
                <Smartphone className="w-3.5 h-3.5" />
                HP
              </button>
              <button
                type="button"
                onClick={() => setViewport('desktop')}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer ${
                  viewport === 'desktop'
                    ? 'bg-white text-[#17243D] shadow-xs'
                    : 'text-[#64748B] hover:text-[#17243D]'
                }`}
              >
                <Monitor className="w-3.5 h-3.5" />
                Lebar
              </button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup pratinjau"
              className="p-1.5 rounded-lg border border-[#DCE5EF] text-[#51637D] hover:bg-[#F0F5FA] hover:text-[#17243D] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Live Rendered Preview */}
        <div className="flex-1 overflow-auto bg-[#EDF2F7] p-4 sm:p-6 flex items-start justify-center min-h-[380px]">
          <div
            className={`transition-all duration-200 overflow-hidden shadow-xl ${
              viewport === 'mobile'
                ? 'w-[390px] max-w-full rounded-[28px] bg-[#17243D] p-[6px] border border-[#223456]'
                : 'w-full max-w-[680px] rounded-xl bg-white border border-[#DCE5EF]'
            }`}
          >
            {viewport === 'mobile' ? (
              <div className="rounded-[22px] overflow-hidden bg-white">
                <div className="h-5 bg-[#17243D] flex items-center justify-center">
                  <div className="w-16 h-1.5 rounded-full bg-slate-700" />
                </div>
                <iframe
                  title={`Pratinjau ${item.title}`}
                  srcDoc={previewHtml}
                  sandbox="allow-scripts allow-forms allow-popups"
                  className="w-full h-[460px] border-0 bg-white block"
                />
              </div>
            ) : (
              <iframe
                title={`Pratinjau ${item.title}`}
                srcDoc={previewHtml}
                sandbox="allow-scripts allow-forms allow-popups"
                className="w-full h-[460px] border-0 bg-white block"
              />
            )}
          </div>
        </div>

        {/* Footer Actions */}
        <div className="px-4 py-3 border-t border-[#DCE5EF] bg-white flex items-center justify-between gap-3 shrink-0">
          <p className="text-[11px] text-[#64748B]">
            Pratinjau otomatis mengikuti warna &amp; tipografi tema halaman aktif.
          </p>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-2 rounded-xl border border-[#DCE5EF] text-[12px] font-semibold text-[#51637D] hover:bg-[#F0F5FA] transition-colors cursor-pointer"
            >
              Tutup
            </button>
            <button
              type="button"
              onClick={() => {
                item.onInsert();
                onClose();
              }}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#00C98A] hover:bg-[#00B078] text-white text-[12px] font-bold shadow-sm transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Tambahkan ke Canvas
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
