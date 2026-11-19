import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Copy,
  FileText,
  Palette,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  AdvanceOptions,
  BlockType,
  BuilderBlock,
  PageTheme,
} from '../types/builder';
import { BLOCK_TYPE_NAMES } from '../data/presets';
import { useUiLabel } from '../contexts/UiLabelsContext';
import { resetBlockThemeToGlobal } from '../utils/blockThemeHelpers';
import { BlockContentTab } from './inspector/BlockContentTab';
import { BlockDesignTab } from './inspector/BlockDesignTab';

interface RightInspectorProps {
  selectedBlock: BuilderBlock | null;
  theme: PageTheme;
  advanceOptions: AdvanceOptions;
  selectedParentNavId: string | null;
  selectedParentNavLabel: string | null;
  contentFocusNonce?: number;
  onOpenNavbarSettings: (itemId?: string) => void;
  onUpdateAdvanceOptions: (patch: Partial<AdvanceOptions>) => void;
  onUpdateBlock: (id: string, updater: (block: BuilderBlock) => BuilderBlock) => void;
  onDuplicateBlock: (id: string) => void;
  onAddChildToContainer: (containerId: string, type: BlockType) => void;
  onSelectBlock: (id: string | null) => void;
}

type ComponentInspectorTab = 'konten' | 'desain';

export function RightInspector({
  selectedBlock,
  theme,
  advanceOptions,
  selectedParentNavId,
  selectedParentNavLabel,
  contentFocusNonce = 0,
  onOpenNavbarSettings,
  onUpdateAdvanceOptions,
  onUpdateBlock,
  onDuplicateBlock,
  onAddChildToContainer,
  onSelectBlock,
}: RightInspectorProps) {
  const { label } = useUiLabel();
  const [inspectorTab, setInspectorTab] = useState<ComponentInspectorTab>('konten');
  const [uploadError, setUploadError] = useState<string | null>(null);

  useEffect(() => {
    if (contentFocusNonce > 0) {
      setInspectorTab('konten');
    }
  }, [contentFocusNonce]);

  const blockTypeDisplay = selectedBlock
    ? label(`komponen.type.${selectedBlock.type}`, BLOCK_TYPE_NAMES[selectedBlock.type])
    : '';

  return (
    <aside className="w-72 xl:w-[23%] min-w-[260px] max-w-[340px] bg-white border-l border-[#DCE5EF] flex flex-col shrink-0 h-full overflow-hidden">
      {/* Sticky Top Header */}
      <div className="px-2.5 py-2 border-b border-[#DCE5EF] bg-white space-y-2 shrink-0">
        {selectedParentNavId && selectedBlock && (
          <div className="px-2 py-1 rounded-lg bg-[#ECFDF6] border border-[#00C98A]/40">
            <button
              type="button"
              onClick={() => onOpenNavbarSettings(selectedParentNavId)}
              className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#17243D] hover:text-[#00A873] cursor-pointer"
            >
              <ArrowLeft className="w-3 h-3 text-[#00C98A]" />
              <span>Kembali ke Navbar ({selectedParentNavLabel || 'Menu'})</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[12px] font-bold text-[#17243D] truncate">
              {selectedBlock
                ? selectedBlock.label?.trim() || blockTypeDisplay
                : 'Inspektor Komponen'}
            </div>
            <div className="text-[10.5px] font-medium text-[#00A873] truncate">
              {selectedBlock ? blockTypeDisplay : 'Pilih elemen pada Canvas'}
            </div>
          </div>

          {selectedBlock && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onDuplicateBlock(selectedBlock.id)}
                title={label('komponen.action.duplicate', 'Duplikat Komponen')}
                className="p-1 rounded-md border border-[#DCE5EF] text-[#51637D] hover:bg-[#F0F5FA] hover:text-[#17243D] transition-colors cursor-pointer"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateBlock(selectedBlock.id, (blk) => resetBlockThemeToGlobal(blk, theme))
                }
                title={label('komponen.action.resetTheme', 'Kembalikan Gaya Tema Global')}
                className="p-1 rounded-md border border-[#DCE5EF] text-[#51637D] hover:bg-[#ECFDF6] hover:text-[#00A873] transition-colors cursor-pointer"
              >
                <Palette className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Strictly 2-Tab Bar: Konten (left) & Desain (right) */}
        <div
          role="tablist"
          aria-label="Kategori Pengaturan Komponen"
          className="grid grid-cols-2 gap-1"
        >
          {(
            [
              {
                id: 'konten' as const,
                label: label('konten.tab', 'Konten'),
                icon: <FileText className="w-3 h-3" />,
              },
              {
                id: 'desain' as const,
                label: label('desain.tab', 'Desain'),
                icon: <SlidersHorizontal className="w-3 h-3" />,
              },
            ] as const
          ).map((tab) => {
            const active = inspectorTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setInspectorTab(tab.id)}
                className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#ECFDF6] border-[#00C98A] text-[#17243D]'
                    : 'bg-white border-[#DCE5EF] text-[#51637D] hover:text-[#17243D] hover:bg-[#F0F5FA]'
                }`}
              >
                {tab.icon}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Dismissible upload warning banner */}
      {uploadError && selectedBlock && (
        <div className="mx-2.5 mt-2 p-2 rounded-lg bg-red-50 border border-red-200 text-red-700 text-[10.5px] font-medium flex items-start justify-between gap-2 shrink-0">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="p-0.5 text-red-500 hover:text-red-700 cursor-pointer shrink-0"
            aria-label="Tutup peringatan"
          >
            <X className="w-3 h-3" />
          </button>
        </div>
      )}

      {/* Inspector Body */}
      {!selectedBlock ? (
        <div className="flex-1 flex items-center justify-center p-4 bg-[#F0F5FA]/50">
          <div className="p-3.5 rounded-xl border border-dashed border-[#DCE5EF] bg-white text-center space-y-1">
            <div className="text-[11.5px] font-bold text-[#17243D]">
              Belum Ada Komponen Dipilih
            </div>
            <p className="text-[10.5px] text-[#51637D] leading-relaxed">
              Klik komponen pada Canvas atau pilih dari <strong>Tema &rarr; Lapisan</strong> di panel kiri untuk mengedit <strong>Konten</strong> dan <strong>Desain</strong>.
            </p>
          </div>
        </div>
      ) : (
        <div className="flex-1 overflow-y-auto inspector-compact">
          {inspectorTab === 'konten' && (
            <BlockContentTab
              selectedBlock={selectedBlock}
              theme={theme}
              advanceOptions={advanceOptions}
              onUpdateAdvanceOptions={onUpdateAdvanceOptions}
              onUpdateBlock={onUpdateBlock}
              onDuplicateBlock={onDuplicateBlock}
              onAddChildToContainer={onAddChildToContainer}
              onSelectBlock={onSelectBlock}
              onSetUploadError={setUploadError}
            />
          )}
          {inspectorTab === 'desain' && (
            <BlockDesignTab
              selectedBlock={selectedBlock}
              theme={theme}
              advanceOptions={advanceOptions}
              onUpdateAdvanceOptions={onUpdateAdvanceOptions}
              onUpdateBlock={onUpdateBlock}
            />
          )}
        </div>
      )}
    </aside>
  );
}
