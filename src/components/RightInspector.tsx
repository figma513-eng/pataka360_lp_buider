import { useEffect, useState } from 'react';
import {
  ArrowLeft,
  ChevronRight,
  ClipboardCopy,
  ClipboardPaste,
  Copy,
  FileText,
  Layers,
  Palette,
  Pencil,
  Plus,
  SlidersHorizontal,
  Trash2,
  X,
} from 'lucide-react';
import {
  AdvanceOptions,
  BlockType,
  BottomNavbarConfig,
  BottomNavbarItemAction,
  BuilderBlock,
  BuilderSubPage,
  MenuIconSheetPosition,
  PageTheme,
  ViewportBreakpoint,
  WhatsappCenterConfig,
} from '../types/builder';
import { BLOCK_TYPE_NAMES, createBlock } from '../data/presets';
import { useUiLabel } from '../contexts/UiLabelsContext';
import { getBlockThemeStatus, resetBlockThemeToGlobal } from '../utils/blockThemeHelpers';
import { ExtractedSubLayer } from '../utils/layerStructure';
import { BlockContentTab } from './inspector/BlockContentTab';
import { BlockDesignTab } from './inspector/BlockDesignTab';

interface RightInspectorProps {
  selectedBlock: BuilderBlock | null;
  selectedSubLayer?: ExtractedSubLayer | null;
  onClearSubLayer?: () => void;
  onSelectSubLayer?: (blockId: string, subLayerId: string | null) => void;
  allBlocks?: BuilderBlock[];
  pages?: BuilderSubPage[];
  activeSubPageId?: string | null;
  whatsappCenter?: WhatsappCenterConfig;
  canPaste?: boolean;
  onCopyBlock?: (id: string) => void;
  onPasteBlock?: () => void;
  onSelectSubPage?: (pageId: string | null) => void;
  onAddSubPage?: () => string | null;
  onAddChildToActionSheet?: (ownerId: string, type: BlockType) => void;
  onAddChildToCardFooter?: (cardId: string, type: BlockType) => void;
  theme: PageTheme;
  advanceOptions: AdvanceOptions;
  selectedParentNavId: string | null;
  selectedParentNavLabel: string | null;
  inspectorMode?: 'block' | 'navbar';
  bottomNavbar?: BottomNavbarConfig;
  activeNavItemId?: string | null;
  activeViewportBreakpoint?: ViewportBreakpoint;
  onChangeViewportBreakpoint?: (bp: ViewportBreakpoint) => void;
  contentFocusNonce?: number;
  onOpenNavbarSettings: (itemId?: string) => void;
  onUpdateBottomNavbar?: (updater: (prev: BottomNavbarConfig) => BottomNavbarConfig) => void;
  onSelectNavItem?: (itemId: string) => void;
  onUpdateAdvanceOptions: (patch: Partial<AdvanceOptions>) => void;
  onUpdateBlock: (id: string, updater: (block: BuilderBlock) => BuilderBlock) => void;
  onDuplicateBlock: (id: string) => void;
  onAddChildToContainer: (containerId: string, type: BlockType) => void;
  onSelectBlock: (id: string | null) => void;
}

type ComponentInspectorTab = 'konten' | 'desain';

export function RightInspector({
  selectedBlock,
  selectedSubLayer = null,
  onClearSubLayer,
  onSelectSubLayer,
  allBlocks = [],
  pages = [],
  activeSubPageId = null,
  whatsappCenter,
  canPaste = false,
  onCopyBlock,
  onPasteBlock,
  onSelectSubPage,
  onAddSubPage,
  onAddChildToActionSheet,
  onAddChildToCardFooter,
  theme,
  advanceOptions,
  selectedParentNavId,
  selectedParentNavLabel,
  inspectorMode = 'block',
  bottomNavbar,
  activeNavItemId = null,
  activeViewportBreakpoint = 'mobile',
  onChangeViewportBreakpoint,
  contentFocusNonce = 0,
  onOpenNavbarSettings,
  onUpdateBottomNavbar,
  onSelectNavItem,
  onUpdateAdvanceOptions,
  onUpdateBlock,
  onDuplicateBlock,
  onAddChildToContainer,
  onSelectBlock,
}: RightInspectorProps) {
  const { label, isVisible } = useUiLabel();
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
              <span>Kembali ke Navigasi ({selectedParentNavLabel || 'Menu'})</span>
            </button>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          <div className="min-w-0 flex-1">
            {selectedBlock ? (
              <div className="group/rename relative flex items-center">
                <input
                  type="text"
                  value={selectedBlock.label}
                  placeholder={blockTypeDisplay}
                  aria-label={label('konten.field.namaLapisan', 'Nama Lapisan Komponen')}
                  title="Klik untuk ubah nama lapisan komponen"
                  onChange={(e) =>
                    onUpdateBlock(selectedBlock.id, (blk) => ({ ...blk, label: e.target.value }))
                  }
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.currentTarget.blur();
                    }
                  }}
                  className="w-full text-[13px] font-bold text-[#17243D] bg-transparent hover:bg-[#F0F5FA] focus:bg-[#F0F5FA] border border-transparent hover:border-[#DCE5EF] focus:border-[#00C98A] rounded-md px-1.5 py-0.5 -ml-1.5 pr-6 outline-none truncate transition-colors"
                />
                <Pencil className="w-3 h-3 text-[#8FA4BF] opacity-60 group-hover/rename:opacity-100 group-focus-within/rename:text-[#00C98A] pointer-events-none absolute right-1.5" />
              </div>
            ) : inspectorMode === 'navbar' && bottomNavbar ? (
              <div className="text-[12px] font-bold text-[#17243D] truncate">
                {label('komponen.navbar.title', 'Bottom Navbar')}
              </div>
            ) : (
              isVisible('komponen.header.properti') && (
                <div className="text-[12px] font-bold text-[#17243D] truncate">
                  {label('komponen.header.properti', 'Properti Komponen')}
                </div>
              )
            )}
            {(selectedBlock || inspectorMode === 'navbar' || isVisible('komponen.header.pilihElemen')) && (
              <div className="text-[10.5px] font-medium text-[#00A873] truncate">
                {selectedBlock
                  ? selectedSubLayer
                    ? `${blockTypeDisplay} · ${selectedSubLayer.typeLabel}`
                    : blockTypeDisplay
                  : inspectorMode === 'navbar' && bottomNavbar
                  ? bottomNavbar.enabled
                    ? `Aktif · ${bottomNavbar.items.length} Menu Navigasi`
                    : 'Nonaktif · Pengaturan di Tema -> Bottom'
                  : label('komponen.header.pilihElemen', 'Pilih elemen pada Kanvas')}
              </div>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0">
            {selectedBlock && onCopyBlock && isVisible('komponen.action.copy') && (
              <button
                type="button"
                onClick={() => onCopyBlock(selectedBlock.id)}
                title={`${label('komponen.action.copy', 'Salin Komponen')} (Ctrl+C)`}
                className="p-1 rounded-md border border-[#DCE5EF] text-[#51637D] hover:bg-[#F0F5FA] hover:text-[#17243D] transition-colors cursor-pointer"
              >
                <ClipboardCopy className="w-3 h-3" />
              </button>
            )}
            {onPasteBlock && canPaste && isVisible('komponen.action.paste') && (
              <button
                type="button"
                onClick={onPasteBlock}
                title={`${label('komponen.action.paste', 'Tempel Komponen')} (Ctrl+V)`}
                className="p-1 rounded-md border border-[#00C98A]/50 bg-[#ECFDF6] text-[#00A873] hover:bg-[#D1FAE5] transition-colors cursor-pointer"
              >
                <ClipboardPaste className="w-3 h-3" />
              </button>
            )}
            {selectedBlock && (
              <>
                {isVisible('komponen.action.duplicate') && (
                  <button
                    type="button"
                    onClick={() => onDuplicateBlock(selectedBlock.id)}
                    title={label('komponen.action.duplicate', 'Duplikat Komponen')}
                    className="p-1 rounded-md border border-[#DCE5EF] text-[#51637D] hover:bg-[#F0F5FA] hover:text-[#17243D] transition-colors cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
                {isVisible('komponen.action.resetTheme') && (() => {
                  const themeStatus = getBlockThemeStatus(selectedBlock, theme);
                  const isLocalOverride = themeStatus.mode === 'local';
                  return (
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateBlock(selectedBlock.id, (blk) => resetBlockThemeToGlobal(blk, theme))
                      }
                      title={
                        isLocalOverride
                          ? 'Komponen memiliki override tema lokal — klik untuk reset ke Tema Global'
                          : label('komponen.action.resetTheme', 'Kembalikan Gaya Tema Global')
                      }
                      className={`inline-flex items-center gap-1 px-1.5 py-1 rounded-md border text-[9.5px] font-bold transition-colors cursor-pointer ${
                        isLocalOverride
                          ? 'border-amber-300 bg-amber-50 text-amber-800 hover:bg-amber-100'
                          : 'border-[#DCE5EF] text-[#51637D] hover:bg-[#ECFDF6] hover:text-[#00A873]'
                      }`}
                    >
                      <Palette className="w-3 h-3" />
                      {isLocalOverride && <span>{label('komponen.action.resetShort', 'Reset')}</span>}
                    </button>
                  );
                })()}
              </>
            )}
          </div>
        </div>

        {/* Active Sub-Layer Structure Breadcrumb */}
        {selectedBlock && selectedSubLayer && (
          <div
            data-inspector-sublayer-bar={selectedSubLayer.id}
            className="flex items-center justify-between gap-1.5 px-2 py-1.5 rounded-lg bg-[#ECFDF6] border border-[#00C98A]/50"
          >
            <div className="flex items-center gap-1 min-w-0 text-[10.5px]">
              <Layers className="w-3 h-3 text-[#008F63] shrink-0" />
              <button
                type="button"
                onClick={() => onClearSubLayer?.()}
                className="text-[#5B708B] hover:text-[#17243D] font-medium truncate max-w-[78px] cursor-pointer"
                title="Kembali ke seluruh pengaturan komponen induk"
              >
                {selectedBlock.label?.trim() || blockTypeDisplay}
              </button>
              <ChevronRight className="w-3 h-3 text-[#8FA4BF] shrink-0" />
              <span className="font-bold text-[#17243D] truncate" title={selectedSubLayer.label}>
                {selectedSubLayer.label}
              </span>
            </div>
            {onClearSubLayer && (
              <button
                type="button"
                onClick={onClearSubLayer}
                className="px-1.5 py-0.5 rounded bg-white border border-[#00C98A]/40 text-[9.5px] font-bold text-[#008F63] hover:bg-[#17243D] hover:text-white hover:border-[#17243D] transition-colors shrink-0 cursor-pointer"
              >
                {label('komponen.sublayer.showAllBtn', 'Semua')}
              </button>
            )}
          </div>
        )}

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
        inspectorMode === 'navbar' && bottomNavbar ? (
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5 bg-[#F4F7FB]">
            {/* Contextual Bottom Navbar Quick Controls */}
            <div className="p-3 rounded-xl border border-[#00C98A]/40 bg-white space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <div className="text-[11.5px] font-bold text-[#17243D]">
                    {label('komponen.navbar.quickTitle', 'Editor Cepat Bottom Navbar')}
                  </div>
                  {isVisible('komponen.navbar.quickDesc') && (
                    <div className="text-[9.5px] text-[#8FA4BF]">
                      {label('komponen.navbar.quickDesc', 'Tersinkron langsung dengan Tema → Bottom')}
                    </div>
                  )}
                </div>
                {onUpdateBottomNavbar ? (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBottomNavbar((prev) => ({ ...prev, enabled: !prev.enabled }))
                    }
                    className={`px-2 py-0.5 rounded text-[10px] font-bold border transition-colors cursor-pointer ${
                      bottomNavbar.enabled
                        ? 'bg-[#ECFDF6] text-[#008F63] border-[#00C98A]/50'
                        : 'bg-[#F1F5F9] text-[#64748B] border-[#DCE5EF]'
                    }`}
                  >
                    {bottomNavbar.enabled ? 'Aktif' : 'Nonaktif'}
                  </button>
                ) : (
                  <span
                    className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold ${
                      bottomNavbar.enabled
                        ? 'bg-[#ECFDF6] text-[#008F63]'
                        : 'bg-[#F1F5F9] text-[#64748B]'
                    }`}
                  >
                    {bottomNavbar.enabled ? 'Aktif' : 'Nonaktif'}
                  </span>
                )}
              </div>

              {onUpdateBottomNavbar && (
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { floating: false, label: 'Menempel Bawah' },
                      { floating: true, label: 'Mengambang' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={String(opt.floating)}
                      type="button"
                      onClick={() =>
                        onUpdateBottomNavbar((prev) => ({
                          ...prev,
                          floating: opt.floating,
                          barWidthPercent: opt.floating ? prev.barWidthPercent ?? 94 : 100,
                          bottomOffset: opt.floating ? prev.bottomOffset ?? 12 : 0,
                          borderRadius: opt.floating ? prev.borderRadius ?? 20 : 0,
                        }))
                      }
                      className={`py-1 px-2 rounded-lg text-[10.5px] font-semibold border transition-colors cursor-pointer ${
                        Boolean(bottomNavbar.floating) === opt.floating
                          ? 'bg-[#17243D] text-white border-[#17243D]'
                          : 'bg-[#F8FAFC] text-[#51637D] border-[#DCE5EF] hover:border-[#00C98A]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* Quick 5-menu switcher */}
              <div className="space-y-1">
                <div className="text-[10px] font-semibold text-[#51637D]">
                  Pilih Menu ({bottomNavbar.items.length})
                </div>
                <div className="grid grid-cols-5 gap-1">
                  {bottomNavbar.items.map((it) => {
                    const isCur = it.id === (activeNavItemId ?? bottomNavbar.items[0]?.id);
                    return (
                      <button
                        key={it.id}
                        type="button"
                        onClick={() => {
                          onSelectNavItem?.(it.id);
                          onOpenNavbarSettings(it.id);
                        }}
                        title={it.label || 'Menu'}
                        className={`py-1 px-1 rounded-md border text-[9.5px] font-semibold truncate cursor-pointer transition-colors ${
                          isCur
                            ? 'bg-[#17243D] text-white border-[#17243D]'
                            : 'bg-[#F8FAFC] text-[#51637D] border-[#DCE5EF] hover:border-[#00C98A]'
                        } ${it.enabled === false ? 'opacity-50' : ''}`}
                      >
                        {it.label || 'Menu'}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {(() => {
              const activeNav =
                bottomNavbar.items.find((it) => it.id === activeNavItemId) ??
                bottomNavbar.items[0] ??
                null;
              if (!activeNav) return null;
              const children = activeNav.children ?? [];
              const patchActiveNav = (patch: Partial<typeof activeNav>) => {
                if (!onUpdateBottomNavbar) return;
                onUpdateBottomNavbar((prev) => ({
                  ...prev,
                  items: prev.items.map((it) =>
                    it.id === activeNav.id ? { ...it, ...patch } : it
                  ),
                }));
              };
              const addChildToNavSheet = (type: BlockType) => {
                if (!onUpdateBottomNavbar) return;
                const newBlk = createBlock(type, theme);
                patchActiveNav({
                  action: 'sheet',
                  children: [...children, { ...newBlk, style: { ...newBlk.style, marginBottom: 8 } }],
                });
              };
              return (
                <div className="p-3 rounded-xl border border-[#DCE5EF] bg-white space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[11px] font-bold text-[#17243D] truncate">
                        Menu: {activeNav.label || 'Menu Navigasi'}
                      </div>
                      <div className="text-[10px] text-[#8FA4BF]">
                        {activeNav.action === 'sheet'
                          ? `Panel Modal · ${children.length} komponen`
                          : activeNav.action === 'scroll_top'
                          ? 'Aksi: Gulir ke Beranda'
                          : 'Aksi: Tautan Eksternal'}
                      </div>
                    </div>
                    {onUpdateBottomNavbar && (
                      <button
                        type="button"
                        onClick={() => patchActiveNav({ enabled: activeNav.enabled === false })}
                        className={`px-1.5 py-0.5 rounded text-[9.5px] font-bold border cursor-pointer ${
                          activeNav.enabled !== false
                            ? 'bg-[#ECFDF6] text-[#008F63] border-[#00C98A]/40'
                            : 'bg-[#F1F5F9] text-[#64748B] border-[#DCE5EF]'
                        }`}
                      >
                        {activeNav.enabled !== false ? 'Tampil' : 'Sembunyi'}
                      </button>
                    )}
                  </div>

                  {onUpdateBottomNavbar && (
                    <div className="space-y-2">
                      <div>
                        <label className="block text-[10px] font-semibold text-[#51637D] mb-0.5">
                          Label Menu
                        </label>
                        <input
                          type="text"
                          value={activeNav.label}
                          onChange={(e) => patchActiveNav({ label: e.target.value })}
                          className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-semibold text-[#51637D] mb-0.5">
                          Aksi Saat Diklik
                        </label>
                        <select
                          value={activeNav.action}
                          onChange={(e) =>
                            patchActiveNav({ action: e.target.value as BottomNavbarItemAction })
                          }
                          className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                        >
                          <option value="sheet">Buka Modal Sheet</option>
                          <option value="scroll_top">Ke Atas / Beranda</option>
                          <option value="link">Buka Tautan / WA</option>
                        </select>
                      </div>
                      {activeNav.action === 'link' && (
                        <div>
                          <label className="block text-[10px] font-semibold text-[#51637D] mb-0.5">
                            URL Tautan / WA
                          </label>
                          <input
                            type="url"
                            value={activeNav.linkUrl ?? ''}
                            onChange={(e) => patchActiveNav({ linkUrl: e.target.value })}
                            placeholder="https://wa.me/628..."
                            className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                          />
                        </div>
                      )}
                      {activeNav.action === 'sheet' && (
                        <>
                          <div>
                            <label className="block text-[10px] font-semibold text-[#51637D] mb-0.5">
                              Judul Panel Sheet
                            </label>
                            <input
                              type="text"
                              value={activeNav.sheetTitle}
                              onChange={(e) => patchActiveNav({ sheetTitle: e.target.value })}
                              placeholder={activeNav.label}
                              className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                            />
                          </div>
                          <div>
                            <label className="block text-[10px] font-semibold text-[#51637D] mb-1">
                              Arah Buka Sheet
                            </label>
                            <div className="grid grid-cols-4 gap-1">
                              {(
                                [
                                  { id: 'bottom', label: 'Bawah' },
                                  { id: 'top', label: 'Atas' },
                                  { id: 'right', label: 'Kanan' },
                                  { id: 'left', label: 'Kiri' },
                                ] as Array<{ id: MenuIconSheetPosition; label: string }>
                              ).map((pos) => (
                                <button
                                  key={pos.id}
                                  type="button"
                                  onClick={() => patchActiveNav({ sheetPosition: pos.id })}
                                  className={`py-1 px-1 rounded border text-[10px] font-semibold cursor-pointer ${
                                    (activeNav.sheetPosition ?? 'bottom') === pos.id
                                      ? 'bg-[#17243D] text-white border-[#17243D]'
                                      : 'bg-[#F8FAFC] text-[#51637D] border-[#DCE5EF] hover:border-[#00C98A]'
                                  }`}
                                >
                                  {pos.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  )}

                  {activeNav.action === 'sheet' && (
                    <div className="space-y-1.5 pt-1 border-t border-[#DCE5EF]">
                      <div className="text-[10px] font-semibold text-[#51637D]">
                        Komponen di Dalam Sheet ({children.length})
                      </div>
                      {children.length > 0 ? (
                        <div className="space-y-1">
                          {children.map((child, idx) => (
                            <div
                              key={child.id}
                              className="flex items-center gap-1 px-2 py-1.5 rounded-lg border border-[#DCE5EF] bg-[#F8FAFC] hover:border-[#00C98A]"
                            >
                              <button
                                type="button"
                                onClick={() => onSelectBlock(child.id)}
                                className="flex-1 min-w-0 flex items-center justify-between gap-1 text-left cursor-pointer"
                              >
                                <span className="text-[11px] font-semibold text-[#17243D] truncate">
                                  {idx + 1}. {child.label || BLOCK_TYPE_NAMES[child.type]}
                                </span>
                                <ChevronRight className="w-3 h-3 text-[#8FA4BF] shrink-0" />
                              </button>
                              {onUpdateBottomNavbar && (
                                <button
                                  type="button"
                                  title="Hapus dari sheet"
                                  onClick={() =>
                                    patchActiveNav({
                                      children: children.filter((c) => c.id !== child.id),
                                    })
                                  }
                                  className="p-0.5 rounded text-[#8FA4BF] hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[10px] text-[#8FA4BF] leading-relaxed">
                          Sheet masih kosong. Tambahkan komponen cepat di bawah ini.
                        </p>
                      )}
                      {onUpdateBottomNavbar && (
                        <div className="grid grid-cols-2 gap-1 pt-1">
                          {(
                            [
                              { type: 'text', label: 'Teks' },
                              { type: 'button', label: 'Tombol' },
                              { type: 'image', label: 'Gambar' },
                              { type: 'maps_place', label: 'Maps' },
                            ] as Array<{ type: BlockType; label: string }>
                          ).map((quick) => (
                            <button
                              key={quick.type}
                              type="button"
                              onClick={() => addChildToNavSheet(quick.type)}
                              className="inline-flex items-center justify-center gap-1 py-1 px-1.5 rounded-md border border-[#DCE5EF] bg-white hover:border-[#00C98A] hover:bg-[#ECFDF6] text-[10px] font-semibold text-[#17243D] cursor-pointer"
                            >
                              <Plus className="w-2.5 h-2.5 text-[#00A873]" />
                              <span>{quick.label}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="flex-1 flex items-center justify-center p-4 bg-[#F0F5FA]/50">
            {(isVisible('komponen.empty.title') || isVisible('komponen.empty.desc')) && (
              <div className="p-3.5 rounded-xl border border-dashed border-[#DCE5EF] bg-white text-center space-y-1">
                {isVisible('komponen.empty.title') && (
                  <div className="text-[11.5px] font-bold text-[#17243D]">
                    {label('komponen.empty.title', 'Belum Ada Komponen Dipilih')}
                  </div>
                )}
                {isVisible('komponen.empty.desc') && (
                  <p className="text-[10.5px] text-[#51637D] leading-relaxed">
                    {label(
                      'komponen.empty.desc',
                      'Klik komponen pada Kanvas atau pilih dari Tema -> Lapisan di panel kiri untuk mengubah Konten dan Desain.'
                    )}
                  </p>
                )}
              </div>
            )}
          </div>
        )
      ) : (
        <div className="flex-1 overflow-y-auto inspector-compact">
          {inspectorTab === 'konten' && (
            <BlockContentTab
              selectedBlock={selectedBlock}
              selectedSubLayer={selectedSubLayer}
              onClearSubLayer={onClearSubLayer}
              onSelectSubLayer={onSelectSubLayer}
              allBlocks={allBlocks}
              pages={pages}
              bottomNavbar={bottomNavbar}
              activeSubPageId={activeSubPageId}
              whatsappCenter={whatsappCenter}
              onSelectSubPage={onSelectSubPage}
              onAddSubPage={onAddSubPage}
              onAddChildToActionSheet={onAddChildToActionSheet}
              onAddChildToCardFooter={onAddChildToCardFooter}
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
              selectedSubLayer={selectedSubLayer}
              onClearSubLayer={onClearSubLayer}
              onSelectSubLayer={onSelectSubLayer}
              allBlocks={allBlocks}
              pages={pages}
              bottomNavbar={bottomNavbar}
              onSelectBlock={onSelectBlock}
              theme={theme}
              advanceOptions={advanceOptions}
              activeViewportBreakpoint={activeViewportBreakpoint}
              onChangeViewportBreakpoint={onChangeViewportBreakpoint}
              onUpdateAdvanceOptions={onUpdateAdvanceOptions}
              onUpdateBlock={onUpdateBlock}
            />
          )}
        </div>
      )}
    </aside>
  );
}
