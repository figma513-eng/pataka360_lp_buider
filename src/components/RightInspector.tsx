import { useState } from 'react';
import {
  ArrowLeft,
  Copy,
  FileText,
  Home,
  Layers,
  Palette,
  SlidersHorizontal,
  X,
} from 'lucide-react';
import {
  AdvanceOptions,
  BlockType,
  BottomNavbarConfig,
  BuilderBlock,
  PageTheme,
} from '../types/builder';
import { BLOCK_TYPE_NAMES } from '../data/presets';
import { useUiLabel } from '../contexts/UiLabelsContext';
import { resetBlockThemeToGlobal } from '../utils/blockThemeHelpers';
import { BlockContentTab } from './inspector/BlockContentTab';
import { BlockDesignTab } from './inspector/BlockDesignTab';
import { BlockThemeTab } from './inspector/BlockThemeTab';
import { HomePageSettings } from './inspector/HomePageSettings';

interface RightInspectorProps {
  blocks: BuilderBlock[];
  selectedBlock: BuilderBlock | null;
  theme: PageTheme;
  advanceOptions: AdvanceOptions;
  bottomNavbar: BottomNavbarConfig;
  inspectorMode: 'element' | 'navbar';
  activeNavItemId: string;
  selectedParentNavId: string | null;
  selectedParentNavLabel: string | null;
  navbarFocusNonce?: number;
  onChangeInspectorMode: (mode: 'element' | 'navbar') => void;
  onSelectNavItem: (id: string) => void;
  onSelectTheme: (next: PageTheme) => void;
  onUpdateBottomNavbar: (updater: (prev: BottomNavbarConfig) => BottomNavbarConfig) => void;
  onUpdateAdvanceOptions: (patch: Partial<AdvanceOptions>) => void;
  onUpdateBlock: (id: string, updater: (block: BuilderBlock) => BuilderBlock) => void;
  onDuplicateBlock: (id: string) => void;
  onMoveBlock: (id: string, dir: 'up' | 'down') => void;
  onReorderBlock: (
    draggedId: string,
    targetId: string,
    position: 'before' | 'after' | 'inside'
  ) => void;
  onDeleteBlock: (id: string) => void;
  onAddChildToContainer: (containerId: string, type: BlockType) => void;
  onSelectBlock: (id: string | null) => void;
}

type ComponentInspectorTab = 'desain' | 'konten' | 'tema';

export function RightInspector({
  blocks,
  selectedBlock,
  theme,
  advanceOptions,
  bottomNavbar,
  inspectorMode,
  activeNavItemId,
  selectedParentNavId,
  selectedParentNavLabel,
  navbarFocusNonce = 0,
  onChangeInspectorMode,
  onSelectNavItem,
  onSelectTheme,
  onUpdateBottomNavbar,
  onUpdateAdvanceOptions,
  onUpdateBlock,
  onDuplicateBlock,
  onMoveBlock,
  onReorderBlock,
  onDeleteBlock,
  onAddChildToContainer,
  onSelectBlock,
}: RightInspectorProps) {
  const { label } = useUiLabel();
  const [inspectorTab, setInspectorTab] = useState<ComponentInspectorTab>('desain');
  const [uploadError, setUploadError] = useState<string | null>(null);

  const isHomeMode = inspectorMode === 'navbar' || !selectedBlock;
  const blockTypeDisplay = selectedBlock
    ? label(`komponen.type.${selectedBlock.type}`, BLOCK_TYPE_NAMES[selectedBlock.type])
    : '';

  return (
    <aside className="w-72 xl:w-[23%] min-w-[260px] max-w-[340px] bg-white border-l border-[#DCE5EF] flex flex-col shrink-0 h-full overflow-hidden">
      {/* Sticky Top Mode Header */}
      <div className="px-3.5 py-2.5 border-b border-[#DCE5EF] bg-white space-y-2.5 shrink-0">
        {selectedParentNavId && !isHomeMode && (
          <div className="px-2.5 py-1.5 rounded-lg bg-[#ECFDF6] border border-[#00C98A]/40">
            <button
              type="button"
              onClick={() => {
                onSelectNavItem(selectedParentNavId);
                onChangeInspectorMode('navbar');
              }}
              className="inline-flex items-center gap-1.5 text-[11.5px] font-semibold text-[#17243D] hover:text-[#00A873] cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-[#00C98A]" />
              <span>Kembali ke Navbar ({selectedParentNavLabel || 'Menu'})</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[13px] font-bold text-[#17243D] truncate">
              {isHomeMode
                ? label('home.title', 'Pengaturan Halaman')
                : selectedBlock.label?.trim() || blockTypeDisplay}
            </div>
            <div className="text-[11px] font-medium text-[#00A873] truncate">
              {isHomeMode
                ? label('home.subtitle', 'Tema Global, Top, Lapisan & Navbar')
                : blockTypeDisplay}
            </div>
          </div>

          {!isHomeMode && selectedBlock && (
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onDuplicateBlock(selectedBlock.id)}
                title={label('komponen.action.duplicate', 'Duplikat Komponen')}
                className="p-1.5 rounded-lg border border-[#DCE5EF] text-[#51637D] hover:bg-[#F0F5FA] hover:text-[#17243D] transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() =>
                  onUpdateBlock(selectedBlock.id, (blk) => resetBlockThemeToGlobal(blk, theme))
                }
                title={label('komponen.action.resetTheme', 'Kembalikan Gaya Tema Global')}
                className="p-1.5 rounded-lg border border-[#DCE5EF] text-[#51637D] hover:bg-[#ECFDF6] hover:text-[#00A873] transition-colors cursor-pointer"
              >
                <Palette className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>

        {/* Switcher [Komponen | Home] */}
        <div
          role="tablist"
          aria-label="Mode Inspektor"
          className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-[#F0F5FA] border border-[#DCE5EF]"
        >
          <button
            type="button"
            role="tab"
            aria-selected={!isHomeMode}
            disabled={!selectedBlock}
            onClick={() => {
              if (selectedBlock) onChangeInspectorMode('element');
            }}
            className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all ${
              !selectedBlock
                ? 'text-[#8FA4BF]/60 cursor-not-allowed'
                : !isHomeMode
                ? 'bg-[#17243D] text-white shadow-xs cursor-pointer'
                : 'text-[#51637D] hover:text-[#17243D] cursor-pointer'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>{label('komponen.tab', 'Komponen')}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={isHomeMode}
            onClick={() => onChangeInspectorMode('navbar')}
            className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-2 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
              isHomeMode
                ? 'bg-[#17243D] text-white shadow-xs'
                : 'text-[#51637D] hover:text-[#17243D]'
            }`}
          >
            <Home className="w-3.5 h-3.5" />
            <span>{label('home.tab', 'Home')}</span>
          </button>
        </div>

        {/* Sticky 3-Tab Bar for Component Mode */}
        {!isHomeMode && selectedBlock && (
          <div
            role="tablist"
            aria-label="Kategori Pengaturan Komponen"
            className="grid grid-cols-3 gap-1 pt-0.5"
          >
            {(
              [
                {
                  id: 'desain' as const,
                  label: label('desain.tab', 'Desain'),
                  icon: <SlidersHorizontal className="w-3 h-3" />,
                },
                {
                  id: 'konten' as const,
                  label: label('konten.tab', 'Konten'),
                  icon: <FileText className="w-3 h-3" />,
                },
                {
                  id: 'tema' as const,
                  label: label('tema.tab', 'Tema'),
                  icon: <Palette className="w-3 h-3" />,
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
                  className={`inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg text-[11.5px] font-semibold border transition-colors cursor-pointer ${
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
        )}
      </div>

      {/* Dismissible upload warning banner */}
      {uploadError && !isHomeMode && (
        <div className="mx-3.5 mt-2.5 p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium flex items-start justify-between gap-2 shrink-0">
          <span>{uploadError}</span>
          <button
            type="button"
            onClick={() => setUploadError(null)}
            className="p-0.5 text-red-500 hover:text-red-700 cursor-pointer shrink-0"
            aria-label="Tutup peringatan"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Inspector Body */}
      {isHomeMode ? (
        <HomePageSettings
          blocks={blocks}
          selectedId={selectedBlock?.id ?? null}
          theme={theme}
          advanceOptions={advanceOptions}
          bottomNavbar={bottomNavbar}
          activeNavItemId={activeNavItemId}
          navbarFocusNonce={navbarFocusNonce}
          onSelectTheme={onSelectTheme}
          onUpdateAdvanceOptions={onUpdateAdvanceOptions}
          onUpdateBottomNavbar={onUpdateBottomNavbar}
          onSelectNavItem={onSelectNavItem}
          onSelectBlock={onSelectBlock}
          onMoveBlock={onMoveBlock}
          onReorderBlock={onReorderBlock}
          onDeleteBlock={onDeleteBlock}
          onAddChildToContainer={onAddChildToContainer}
        />
      ) : (
        <div className="flex-1 overflow-y-auto">
          {inspectorTab === 'desain' && (
            <BlockDesignTab
              selectedBlock={selectedBlock}
              theme={theme}
              advanceOptions={advanceOptions}
              onUpdateAdvanceOptions={onUpdateAdvanceOptions}
              onUpdateBlock={onUpdateBlock}
            />
          )}
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
          {inspectorTab === 'tema' && (
            <BlockThemeTab
              selectedBlock={selectedBlock}
              theme={theme}
              onUpdateBlock={onUpdateBlock}
            />
          )}
        </div>
      )}
    </aside>
  );
}
