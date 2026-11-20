import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  FilePlus2,
  Files,
  GripVertical,
  Layers,
  Palette,
  PanelBottom,
  PanelTop,
  Plus,
  RotateCcw,
  Trash2,
} from 'lucide-react';
import {
  AdvanceOptions,
  BlockType,
  BottomNavbarConfig,
  BottomNavbarItem,
  BottomNavbarItemAction,
  BuilderBlock,
  BuilderSubPage,
  PageTheme,
  ShadowPreset,
} from '../../types/builder';
import {
  BLOCK_TYPE_NAMES,
  THEMES,
  createBlock,
  resolveNavbarMetrics,
} from '../../data/presets';
import { resolveButtonIcon } from '../../utils/buttonIcons';
import { FONT_OPTIONS } from '../../utils/fontHelpers';
import { useUiLabel } from '../../contexts/UiLabelsContext';
import {
  countDirectNestedChildren,
  hasBlockNestedChildren,
  resolveExpandedLayerGroupsForSelection,
} from '../../utils/treeHelpers';
import { ButtonGlyph } from '../ButtonIcon';
import { IconPicker } from '../IconPicker';
import { AccordionSection, SliderRow, ToggleSwitch } from './InspectorPrimitives';

interface HomePageSettingsProps {
  blocks: BuilderBlock[];
  pages?: BuilderSubPage[];
  activeSubPageId?: string | null;
  onSelectSubPage?: (pageId: string | null) => void;
  onAddSubPage?: () => string | null;
  onUpdateSubPage?: (pageId: string, patch: Partial<BuilderSubPage>) => void;
  onDuplicateSubPage?: (pageId: string) => void;
  onDeleteSubPage?: (pageId: string) => void;
  selectedId: string | null;
  theme: PageTheme;
  advanceOptions: AdvanceOptions;
  bottomNavbar: BottomNavbarConfig;
  activeNavItemId: string;
  navbarFocusNonce?: number;
  layerFocusNonce?: number;
  onSelectTheme: (next: PageTheme) => void;
  onUpdateAdvanceOptions: (patch: Partial<AdvanceOptions>) => void;
  onUpdateBottomNavbar: (updater: (prev: BottomNavbarConfig) => BottomNavbarConfig) => void;
  onSelectNavItem: (id: string) => void;
  onSelectBlock: (id: string | null) => void;
  onMoveBlock: (id: string, dir: 'up' | 'down') => void;
  onReorderBlock: (
    draggedId: string,
    targetId: string,
    position: 'before' | 'after' | 'inside'
  ) => void;
  onDuplicateBlock?: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onAddChildToContainer: (containerId: string, type: BlockType) => void;
}

type HomeSectionId = 'temaGlobal' | 'pages' | 'top' | 'body' | 'bottom';

export function HomePageSettings({
  blocks,
  pages = [],
  activeSubPageId = null,
  onSelectSubPage,
  onAddSubPage,
  onUpdateSubPage,
  onDuplicateSubPage,
  onDeleteSubPage,
  selectedId,
  theme,
  advanceOptions,
  bottomNavbar,
  activeNavItemId,
  navbarFocusNonce = 0,
  layerFocusNonce = 0,
  onSelectTheme,
  onUpdateAdvanceOptions,
  onUpdateBottomNavbar,
  onSelectNavItem,
  onSelectBlock,
  onMoveBlock,
  onReorderBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onAddChildToContainer,
}: HomePageSettingsProps) {
  const { label, isVisible } = useUiLabel();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const [openSections, setOpenSections] = useState<Record<HomeSectionId, boolean>>({
    temaGlobal: false,
    pages: false,
    top: false,
    body: true,
    bottom: false,
  });

  const [expandedLayerGroups, setExpandedLayerGroups] = useState<Record<string, boolean>>(() =>
    resolveExpandedLayerGroupsForSelection(
      blocks,
      selectedId,
      bottomNavbar.items
        .filter((it) => Array.isArray(it.children) && it.children.length > 0)
        .map((it) => ({ navId: it.id, children: it.children }))
    )
  );

  const [dragLayerId, setDragLayerId] = useState<string | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{
    id: string;
    pos: 'before' | 'after' | 'inside';
  } | null>(null);

  const toggleLayerGroup = (groupKey: string) => {
    setExpandedLayerGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  useEffect(() => {
    if (navbarFocusNonce > 0) {
      setOpenSections((prev) => ({ ...prev, bottom: true }));
    }
  }, [navbarFocusNonce]);

  useEffect(() => {
    if (layerFocusNonce > 0 || selectedId) {
      setOpenSections((prev) => (prev.body ? prev : { ...prev, body: true }));
    }
    if (!selectedId) {
      setExpandedLayerGroups({});
      return;
    }

    // Otomatis buka grup lapisan yang berkaitan dengan komponen terpilih & tutup grup lain
    const nextExpanded = resolveExpandedLayerGroupsForSelection(
      blocks,
      selectedId,
      bottomNavbar.items
        .filter((it) => Array.isArray(it.children) && it.children.length > 0)
        .map((it) => ({ navId: it.id, children: it.children }))
    );
    setExpandedLayerGroups(nextExpanded);

    const timer = window.setTimeout(() => {
      const root = scrollContainerRef.current;
      if (!root) return;
      const nodes = root.querySelectorAll<HTMLElement>('[data-layer-item-id]');
      for (let i = 0; i < nodes.length; i += 1) {
        if (nodes[i].getAttribute('data-layer-item-id') === selectedId) {
          const target = nodes[i];
          const containerRect = root.getBoundingClientRect();
          const targetRect = target.getBoundingClientRect();
          const targetOffsetTop = targetRect.top - containerRect.top + root.scrollTop;
          const desiredOffsetFromTop = root.clientHeight * 0.25;
          const maxScrollTop = Math.max(0, root.scrollHeight - root.clientHeight);
          const nextScrollTop = Math.max(
            0,
            Math.min(maxScrollTop, Math.round(targetOffsetTop - desiredOffsetFromTop))
          );
          if (typeof root.scrollTo === 'function') {
            root.scrollTo({ top: nextScrollTop, behavior: 'smooth' });
          } else {
            root.scrollTop = nextScrollTop;
          }
          break;
        }
      }
    }, 60);
    return () => window.clearTimeout(timer);
  }, [layerFocusNonce, selectedId]);

  const toggleSection = (id: HomeSectionId) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const pageTopPadding =
    typeof advanceOptions.pageTopPadding === 'number' ? advanceOptions.pageTopPadding : 16;

  // --- Navbar helpers ---
  const navItems = bottomNavbar.items;
  const activeNavItem = navItems.find((it) => it.id === activeNavItemId) ?? navItems[0] ?? null;
  const navMetrics = resolveNavbarMetrics(bottomNavbar);

  const updateNavItem = (itemId: string, patch: Partial<BottomNavbarItem>) => {
    onUpdateBottomNavbar((prev) => ({
      ...prev,
      items: prev.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
    }));
  };

  const applyNavSheetTemplate = (
    itemId: string,
    tpl: 'galeri' | 'belanja' | 'kontak' | 'alamat' | 'form'
  ) => {
    let nextTitle = 'Informasi';
    let nextChildren: BuilderBlock[] = [];
    if (tpl === 'galeri') {
      nextTitle = 'Galeri Foto & Karya';
      const blk = createBlock('carousel', theme);
      nextChildren = [{ ...blk, style: { ...blk.style, marginBottom: 0 } }];
    } else if (tpl === 'belanja') {
      nextTitle = 'Belanja & Produk';
      const blk = createBlock('catalog', theme);
      nextChildren = [{ ...blk, style: { ...blk.style, marginBottom: 0 } }];
    } else if (tpl === 'kontak') {
      nextTitle = 'Hubungi Kami';
      const txt = createBlock('text', theme);
      const btn = createBlock('button', theme);
      const soc = createBlock('social', theme);
      nextChildren = [
        {
          ...txt,
          label: 'Info Kontak',
          style: { ...txt.style, align: 'left', marginBottom: 10 },
          content: {
            text: 'Pilih saluran tercepat untuk terhubung langsung dengan tim kami.',
            variant: 'body',
            fontWeight: 'normal',
          },
        },
        {
          ...btn,
          label: 'Tombol WhatsApp',
          style: { ...btn.style, marginBottom: 12 },
          content: {
            label: 'Chat via WhatsApp',
            url: 'https://wa.me/6281234567890',
            buttonBg: '#059669',
            buttonText: '#FFFFFF',
            buttonIcon: 'phone',
          },
        },
        { ...soc, style: { ...soc.style, marginBottom: 0 } },
      ];
    } else if (tpl === 'alamat') {
      nextTitle = 'Alamat & Lokasi Maps';
      const blk = createBlock('maps_place', theme);
      nextChildren = [{ ...blk, style: { ...blk.style, marginBottom: 0 } }];
    } else {
      nextTitle = 'Formulir Pesan';
      const blk = createBlock('form', theme);
      nextChildren = [{ ...blk, style: { ...blk.style, marginBottom: 0 } }];
    }
    updateNavItem(itemId, {
      action: 'sheet',
      sheetTitle: nextTitle,
      children: nextChildren,
    });
  };

  const slotLabel = (idx: number) => {
    if (idx === 0) return 'Menu Kiri 1';
    if (idx === 1) return 'Menu Kiri 2';
    if (idx === 2) return 'Menu Tengah (Home)';
    if (idx === 3) return 'Menu Kanan 1';
    return 'Menu Kanan 2';
  };

  const countLayerTree = (nodes: BuilderBlock[]): number =>
    nodes.reduce(
      (sum, node) =>
        sum +
        1 +
        (Array.isArray(node.children) ? countLayerTree(node.children) : 0) +
        (Array.isArray(node.content?.actionSheetBlocks)
          ? countLayerTree(node.content.actionSheetBlocks)
          : 0) +
        (Array.isArray(node.content?.cardFooterBlocks)
          ? countLayerTree(node.content.cardFooterBlocks)
          : 0),
      0
    );

  const navSheetLayers = bottomNavbar.items
    .filter((it) => Array.isArray(it.children) && it.children.length > 0)
    .map((it) => ({
      navItem: it,
      children: it.children,
    }));

  const totalLayerCount =
    countLayerTree(blocks) +
    navSheetLayers.reduce((sum, entry) => sum + countLayerTree(entry.children), 0);

  const renderLayerNode = (
    blk: BuilderBlock,
    index: number,
    siblingsCount: number,
    depth: number
  ): React.ReactNode => {
    const isSelected = blk.id === selectedId;
    const isContainer =
      blk.type === 'container' ||
      blk.type === 'toggle_container' ||
      blk.type === 'row' ||
      blk.type === 'bottom_sheet' ||
      blk.type === 'menu_icon' ||
      blk.type === 'showcase_card';
    const hasChildren = hasBlockNestedChildren(blk);
    const childCount = hasChildren ? countDirectNestedChildren(blk) : 0;
    const isGroupExpanded = Boolean(expandedLayerGroups[blk.id]);
    const isOver = dragOverInfo?.id === blk.id;

    return (
      <div key={blk.id} className="space-y-1">
        <div
          data-layer-item-id={blk.id}
          data-layer-selected={isSelected ? 'true' : 'false'}
          data-layer-has-children={hasChildren ? 'true' : 'false'}
          data-layer-expanded={hasChildren ? (isGroupExpanded ? 'true' : 'false') : undefined}
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            setDragLayerId(blk.id);
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', blk.id);
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (!dragLayerId || dragLayerId === blk.id) return;
            const rect = e.currentTarget.getBoundingClientRect();
            const relY = e.clientY - rect.top;
            let pos: 'before' | 'after' | 'inside' = relY < rect.height / 2 ? 'before' : 'after';
            if (isContainer && relY > rect.height * 0.28 && relY < rect.height * 0.72) {
              pos = 'inside';
            }
            setDragOverInfo({ id: blk.id, pos });
          }}
          onDragLeave={() => {
            setDragOverInfo((prev) => (prev?.id === blk.id ? null : prev));
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const sourceId = dragLayerId || e.dataTransfer.getData('text/plain');
            const pos = dragOverInfo?.id === blk.id ? dragOverInfo.pos : 'after';
            setDragLayerId(null);
            setDragOverInfo(null);
            if (sourceId && sourceId !== blk.id) {
              onReorderBlock(sourceId, blk.id, pos);
            }
          }}
          onDragEnd={() => {
            setDragLayerId(null);
            setDragOverInfo(null);
          }}
          className={`group flex items-center gap-1 px-1.5 py-1 rounded-lg border text-[11px] transition-all ${
            isSelected
              ? 'bg-[#17243D] border-[#00C98A] border-l-4 text-white shadow-sm ring-2 ring-[#00C98A]/35'
              : isGroupExpanded && hasChildren
              ? 'bg-[#F3FBF7] border-[#00C98A]/55 text-[#17243D]'
              : 'bg-white border-[#DCE5EF] text-[#17243D] hover:border-[#8FA4BF]'
          } ${
            isOver && dragOverInfo.pos === 'before'
              ? 'border-t-2 border-t-[#00C98A]'
              : isOver && dragOverInfo.pos === 'after'
              ? 'border-b-2 border-b-[#00C98A]'
              : isOver && dragOverInfo.pos === 'inside'
              ? 'ring-2 ring-[#00C98A]/50'
              : ''
          }`}
        >
          <span
            className={`cursor-grab active:cursor-grabbing shrink-0 ${
              isSelected ? 'text-[#00C98A]' : 'text-[#8FA4BF]'
            }`}
            title="Seret untuk urutkan"
          >
            <GripVertical className="w-3 h-3" />
          </span>

          {hasChildren ? (
            <button
              type="button"
              data-layer-dropdown-toggle={blk.id}
              aria-expanded={isGroupExpanded}
              aria-label={isGroupExpanded ? 'Tutup grup lapisan' : 'Buka grup lapisan'}
              title={isGroupExpanded ? 'Tutup grup lapisan' : 'Buka grup lapisan'}
              onClick={(e) => {
                e.stopPropagation();
                toggleLayerGroup(blk.id);
              }}
              className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-white/15 text-[#7AF0C7] hover:bg-white/25'
                  : isGroupExpanded
                  ? 'bg-[#00C98A] text-white hover:bg-[#00B37B]'
                  : 'bg-[#F0F5FA] text-[#51637D] hover:bg-[#DCE5EF]'
              }`}
            >
              <ChevronDown
                className={`w-2.5 h-2.5 transition-transform duration-150 ${
                  isGroupExpanded ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>
          ) : (
            <span className="w-2 shrink-0" aria-hidden="true" />
          )}

          <button
            type="button"
            onClick={() => onSelectBlock(blk.id)}
            className="min-w-0 flex-1 text-left cursor-pointer"
          >
            <div className="flex items-center gap-1 min-w-0">
              <div
                className={`truncate text-[11px] leading-tight ${
                  isSelected ? 'font-bold text-white' : 'font-semibold text-[#17243D]'
                }`}
              >
                {blk.label?.trim() || label(`komponen.type.${blk.type}`, BLOCK_TYPE_NAMES[blk.type])}
              </div>
              {hasChildren && (
                <span
                  className={`px-1 py-0 rounded text-[9px] font-bold tabular-nums shrink-0 ${
                    isSelected
                      ? 'bg-white/15 text-[#7AF0C7]'
                      : isGroupExpanded
                      ? 'bg-[#00C98A]/15 text-[#059669]'
                      : 'bg-[#F0F5FA] text-[#51637D]'
                  }`}
                >
                  {childCount}
                </span>
              )}
            </div>
            <div
              className={`text-[9.5px] truncate ${
                isSelected ? 'text-[#7AF0C7] font-medium' : 'text-[#8FA4BF]'
              }`}
            >
              {label(`komponen.type.${blk.type}`, BLOCK_TYPE_NAMES[blk.type])}
            </div>
          </button>

          <div className="flex items-center gap-0.5 shrink-0">
            <button
              type="button"
              disabled={index === 0}
              onClick={(e) => {
                e.stopPropagation();
                onMoveBlock(blk.id, 'up');
              }}
              title="Naikkan"
              className={`p-0.5 rounded disabled:opacity-30 cursor-pointer ${
                isSelected
                  ? 'text-white/80 hover:bg-white/15 hover:text-white'
                  : 'text-[#51637D] hover:bg-[#F0F5FA]'
              }`}
            >
              <ArrowUp className="w-3 h-3" />
            </button>
            <button
              type="button"
              disabled={index === siblingsCount - 1}
              onClick={(e) => {
                e.stopPropagation();
                onMoveBlock(blk.id, 'down');
              }}
              title="Turunkan"
              className={`p-0.5 rounded disabled:opacity-30 cursor-pointer ${
                isSelected
                  ? 'text-white/80 hover:bg-white/15 hover:text-white'
                  : 'text-[#51637D] hover:bg-[#F0F5FA]'
              }`}
            >
              <ArrowDown className="w-3 h-3" />
            </button>
            {onDuplicateBlock && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onDuplicateBlock(blk.id);
                }}
                title="Duplikat Lapisan"
                aria-label="Duplikat Lapisan"
                className={`p-0.5 rounded cursor-pointer ${
                  isSelected
                    ? 'text-[#7AF0C7] hover:bg-white/15 hover:text-white'
                    : 'text-[#8FA4BF] hover:bg-[#ECFDF6] hover:text-[#00A873]'
                }`}
              >
                <Copy className="w-3 h-3" />
              </button>
            )}
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onDeleteBlock(blk.id);
              }}
              title="Hapus Blok"
              className={`p-0.5 rounded cursor-pointer ${
                isSelected
                  ? 'text-white/75 hover:bg-red-500/30 hover:text-red-200'
                  : 'text-[#8FA4BF] hover:bg-red-50 hover:text-red-600'
              }`}
            >
              <Trash2 className="w-3 h-3" />
            </button>
          </div>
        </div>

        {hasChildren && isGroupExpanded && (
          <div className="space-y-1">
            {Array.isArray(blk.children) && blk.children.length > 0 && (
              <div className="space-y-1 border-l-2 border-[#00C98A]/35 ml-2 pl-1.5">
                {blk.type === 'showcase_card' && (
                  <div className="text-[9px] font-bold uppercase tracking-wide text-[#51637D] px-1">
                    Zona Atas / Isi Kartu
                  </div>
                )}
                {blk.children.map((ch, cIdx) =>
                  renderLayerNode(ch, cIdx, blk.children!.length, depth + 1)
                )}
              </div>
            )}

            {Array.isArray(blk.content?.cardFooterBlocks) &&
              blk.content.cardFooterBlocks.length > 0 && (
                <div className="space-y-1 border-l border-dashed border-sky-500/70 ml-2 pl-1.5">
                  <div className="text-[9px] font-bold uppercase tracking-wide text-sky-700 px-1">
                    Strip Bawah (Warna)
                  </div>
                  {blk.content.cardFooterBlocks.map((ch, cIdx) =>
                    renderLayerNode(ch, cIdx, blk.content.cardFooterBlocks!.length, depth + 1)
                  )}
                </div>
              )}

            {Array.isArray(blk.content?.actionSheetBlocks) &&
              blk.content.actionSheetBlocks.length > 0 && (
                <div className="space-y-1 border-l border-dashed border-[#00C98A]/60 ml-2 pl-1.5">
                  <div className="text-[9px] font-bold uppercase tracking-wide text-[#00A873] px-1">
                    Isi Sheet ({blk.content.actionSheetPosition || 'bottom'})
                  </div>
                  {blk.content.actionSheetBlocks.map((ch, cIdx) =>
                    renderLayerNode(ch, cIdx, blk.content.actionSheetBlocks!.length, depth + 1)
                  )}
                </div>
              )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-[#F0F5FA]/50">
      {/* 1. Tema Global */}
      {isVisible('home.sec.temaGlobal') && (
        <AccordionSection
          id="temaGlobal"
          title={label('home.sec.temaGlobal', 'Tema Global')}
          icon={<Palette className="w-3.5 h-3.5" />}
          badge={theme.name}
          isOpen={openSections.temaGlobal}
          onToggle={() => toggleSection('temaGlobal')}
        >
        <div>
          <label className="block text-xs font-medium text-[#17243D] mb-1">
            {label('home.field.fontUtama', 'Font Utama Halaman')}
          </label>
          <select
            value={theme.fontFamily ?? 'Plus Jakarta Sans'}
            onChange={(e) =>
              onSelectTheme({
                ...theme,
                fontFamily: e.target.value || undefined,
              })
            }
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white text-[#17243D] outline-none focus:border-[#00C98A]"
          >
            {FONT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} ({opt.category})
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs font-medium text-[#17243D] mb-1.5">
            {label('home.field.presetTema', 'Preset Tema')}
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-0.5">
            {THEMES.map((preset) => {
              const active = theme.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    onSelectTheme({
                      ...preset,
                      fontFamily: theme.fontFamily ?? preset.fontFamily,
                    })
                  }
                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                    active
                      ? 'border-[#00C98A] bg-[#ECFDF6] ring-1 ring-[#00C98A]/30'
                      : 'border-[#DCE5EF] bg-white hover:border-[#8FA4BF]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1">
                      {[preset.canvasBg, preset.cardBg, preset.accentColor, preset.textColor].map(
                        (sw, idx) => (
                          <span
                            key={idx}
                            style={{ backgroundColor: sw }}
                            className="w-3 h-3 rounded-full border border-black/10"
                          />
                        )
                      )}
                    </div>
                    {active && <Check className="w-3 h-3 text-[#00A873] shrink-0" />}
                  </div>
                  <div className="text-[11px] font-semibold text-[#17243D] truncate">
                    {preset.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-[#17243D]">
            {label('home.field.warnaTemaManual', 'Warna Tema Manual')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { key: 'canvasBg', label: 'Latar Kanvas' },
                { key: 'cardBg', label: 'Latar Kartu' },
                { key: 'textColor', label: 'Warna Teks' },
                { key: 'accentColor', label: 'Warna Aksen' },
                { key: 'borderColor', label: 'Warna Garis' },
              ] as const
            ).map((item) => (
              <div key={item.key}>
                <label className="block text-[10.5px] font-medium text-[#8FA4BF] mb-1">
                  {item.label}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={theme[item.key]}
                    onChange={(e) =>
                      onSelectTheme({
                        ...theme,
                        id: 'custom',
                        name: 'Tema Kustom',
                        [item.key]: e.target.value,
                      })
                    }
                    className="w-7 h-7 rounded-md border border-[#DCE5EF] bg-white p-0.5 cursor-pointer shrink-0"
                  />
                  <span className="text-[10.5px] font-mono text-[#51637D] truncate">
                    {theme[item.key]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AccordionSection>
      )}

      {/* 1b. Pengaturan Halaman (Multi-Page) */}
      {isVisible('home.sec.pages') && (
        <AccordionSection
          id="pages"
          title={label('home.sec.pages', 'Halaman (Multi-Page)')}
          icon={<Files className="w-3.5 h-3.5" />}
          badge={`${pages.length + 1} hal`}
          isOpen={openSections.pages}
          onToggle={() => toggleSection('pages')}
        >
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            {isVisible('home.desc.pages') ? (
              <span className="text-[11px] text-[#51637D]">
                {label('home.desc.pages', 'Tambah halaman baru & tombol Back otomatis.')}
              </span>
            ) : (
              <span />
            )}
            {onAddSubPage && (
              <button
                type="button"
                onClick={() => onAddSubPage()}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#00C98A] hover:bg-[#00B37B] text-white text-[10.5px] font-bold cursor-pointer shrink-0"
              >
                <FilePlus2 className="w-3 h-3" />
                <span>Tambah</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSelectSubPage?.(null)}
            className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
              activeSubPageId === null
                ? 'bg-[#ECFDF6] border-[#00C98A] text-[#17243D]'
                : 'bg-white border-[#DCE5EF] text-[#17243D] hover:border-[#8FA4BF]'
            }`}
          >
            <div>
              <div className="text-[11.5px] font-bold">Beranda (Halaman Utama)</div>
              <div className="text-[10px] text-[#8FA4BF]">Halaman pembuka publik</div>
            </div>
            {activeSubPageId === null && (
              <span className="px-1.5 py-0.5 rounded bg-[#00C98A] text-white text-[9.5px] font-bold">
                Aktif
              </span>
            )}
          </button>

          {pages.map((pg, idx) => {
            const isActivePg = activeSubPageId === pg.id;
            return (
              <div
                key={pg.id}
                className={`p-2 rounded-lg border space-y-2 ${
                  isActivePg
                    ? 'bg-[#ECFDF6]/70 border-[#00C98A]'
                    : 'bg-white border-[#DCE5EF]'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectSubPage?.(pg.id)}
                    className="min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <div className="text-[11.5px] font-bold text-[#17243D] truncate">
                      {idx + 2}. {pg.title}
                    </div>
                    <div className="text-[9.5px] text-[#8FA4BF]">
                      {pg.blocks.length} blok · {pg.showBackButton !== false ? 'Back Aktif' : 'Tanpa Back'}
                    </div>
                  </button>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {onDuplicateSubPage && (
                      <button
                        type="button"
                        onClick={() => onDuplicateSubPage(pg.id)}
                        title="Duplikat Halaman"
                        className="p-1 rounded hover:bg-white text-[#51637D] hover:text-[#00A873] cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                    {onDeleteSubPage && (
                      <button
                        type="button"
                        onClick={() => onDeleteSubPage(pg.id)}
                        title="Hapus Halaman"
                        className="p-1 rounded hover:bg-red-50 text-[#8FA4BF] hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {isActivePg && onUpdateSubPage && (
                  <div className="pt-1.5 border-t border-[#00C98A]/30 space-y-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#51637D] mb-0.5">
                        Nama Halaman
                      </label>
                      <input
                        type="text"
                        value={pg.title}
                        onChange={(e) => onUpdateSubPage(pg.id, { title: e.target.value })}
                        className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] font-medium text-[#17243D]">
                        Tombol Back Otomatis
                      </span>
                      <ToggleSwitch
                        checked={pg.showBackButton !== false}
                        onChange={(checked) =>
                          onUpdateSubPage(pg.id, { showBackButton: checked })
                        }
                        label="Tampilkan Tombol Back di Atas Halaman"
                      />
                    </div>
                    {pg.showBackButton !== false && (
                      <div>
                        <label className="block text-[10px] font-semibold text-[#51637D] mb-0.5">
                          Label Tombol Back
                        </label>
                        <input
                          type="text"
                          value={pg.backButtonLabel ?? 'Kembali'}
                          onChange={(e) =>
                            onUpdateSubPage(pg.id, { backButtonLabel: e.target.value })
                          }
                          placeholder="Kembali"
                          className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AccordionSection>
      )}

      {/* 2. Top */}
      {isVisible('home.sec.top') && (
        <AccordionSection
          id="top"
          title={label('home.sec.top', 'Top')}
          icon={<PanelTop className="w-3.5 h-3.5" />}
          badge={`${pageTopPadding}px`}
          isOpen={openSections.top}
          onToggle={() => toggleSection('top')}
        >
        <div className="space-y-2">
          {isVisible('home.desc.top') && (
            <div className="text-[11px] text-[#51637D]">
              {label(
                'home.desc.top',
                'Jarak ruang di bagian paling atas kanvas halaman sebelum blok pertama.'
              )}
            </div>
          )}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { val: 0, label: '0px Rapat' },
              { val: 12, label: '12px Rapi' },
              { val: 24, label: '24px Lega' },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => onUpdateAdvanceOptions({ pageTopPadding: opt.val })}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                  pageTopPadding === opt.val
                    ? 'bg-[#17243D] text-white border-[#17243D]'
                    : 'bg-white text-[#51637D] border-[#DCE5EF] hover:bg-[#F0F5FA]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <SliderRow
            label={label('home.field.jarakAtas', 'Jarak Atas Halaman')}
            value={`${pageTopPadding}px`}
            min={0}
            max={48}
            step={2}
            current={pageTopPadding}
            onChange={(val) => onUpdateAdvanceOptions({ pageTopPadding: val })}
          />
          {blocks[0] && (
            <button
              type="button"
              onClick={() => onSelectBlock(blocks[0].id)}
              className="w-full py-1.5 px-3 rounded-lg border border-[#DCE5EF] bg-[#F0F5FA]/70 hover:bg-[#F0F5FA] text-xs font-semibold text-[#17243D] cursor-pointer"
            >
              Pilih Blok Teratas ({blocks[0].label || label(`komponen.type.${blocks[0].type}`, BLOCK_TYPE_NAMES[blocks[0].type])})
            </button>
          )}
        </div>
      </AccordionSection>
      )}

      {/* 3. Body (Susunan Semua Lapisan) */}
      {isVisible('home.sec.body') && (
        <AccordionSection
          id="body"
          title={label('home.sec.body', 'Body (Lapisan)')}
          icon={<Layers className="w-3.5 h-3.5" />}
          badge={totalLayerCount}
          isOpen={openSections.body}
          onToggle={() => toggleSection('body')}
          fullWidthBody
        >
        <div className="space-y-2" data-all-layers-list>
          {blocks.length === 0 && navSheetLayers.length === 0 ? (
            isVisible('home.desc.bodyKosong') ? (
              <div className="py-3 px-2.5 rounded-xl border border-dashed border-[#DCE5EF] bg-[#F0F5FA]/50 text-center text-[11px] text-[#8FA4BF]">
                {label(
                  'home.desc.bodyKosong',
                  'Kanvas masih kosong. Tambahkan blok dari panel kiri.'
                )}
              </div>
            ) : null
          ) : (
            <>
              {blocks.length > 0 && (
                <div className="space-y-1">
                  {blocks.map((blk, idx) => renderLayerNode(blk, idx, blocks.length, 0))}
                </div>
              )}

              {navSheetLayers.length > 0 && (
                <div className="pt-2 border-t border-[#DCE5EF] space-y-1.5">
                  <div className="text-[10px] font-bold uppercase tracking-wide text-[#51637D]">
                    Lapisan Modal Navbar Bawah
                  </div>
                  {navSheetLayers.map(({ navItem, children }) => {
                    const navGroupKey = `nav:${navItem.id}`;
                    const isNavExpanded = Boolean(expandedLayerGroups[navGroupKey]);
                    return (
                      <div key={navItem.id} className="space-y-1">
                        <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
                          <button
                            type="button"
                            data-layer-dropdown-toggle={navGroupKey}
                            aria-expanded={isNavExpanded}
                            onClick={() => toggleLayerGroup(navGroupKey)}
                            className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                              isNavExpanded
                                ? 'bg-[#00C98A] text-white'
                                : 'bg-white text-[#51637D] hover:bg-[#DCE5EF]'
                            }`}
                          >
                            <ChevronDown
                              className={`w-2.5 h-2.5 transition-transform duration-150 ${
                                isNavExpanded ? 'rotate-0' : '-rotate-90'
                              }`}
                            />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              toggleLayerGroup(navGroupKey);
                              onSelectNavItem(navItem.id);
                              setOpenSections((prev) => ({ ...prev, bottom: true }));
                            }}
                            className="flex-1 min-w-0 text-left text-[10px] font-semibold text-[#17243D] hover:text-[#00A873] truncate cursor-pointer"
                          >
                            Navbar: {navItem.label || navItem.sheetTitle || 'Menu'} ({children.length})
                          </button>
                        </div>
                        {isNavExpanded && (
                          <div className="space-y-1 border-l-2 border-[#00C98A]/35 ml-2 pl-1.5">
                            {children.map((ch, cIdx) =>
                              renderLayerNode(ch, cIdx, children.length, 1)
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </>
          )}
        </div>
      </AccordionSection>
      )}

      {/* 4. Bottom (Navbar Bawah) */}
      {isVisible('home.sec.bottom') && (
        <AccordionSection
          id="bottom"
          title={label('home.sec.bottom', 'Bottom (Navbar Bawah)')}
          icon={<PanelBottom className="w-3.5 h-3.5" />}
          badge={bottomNavbar.enabled ? 'Aktif' : 'Nonaktif'}
          isOpen={openSections.bottom}
          onToggle={() => toggleSection('bottom')}
        >
        <div className="space-y-3">
          {/* Status & Layout Navbar */}
          <div className="p-2.5 rounded-xl border border-[#DCE5EF] bg-white space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#DCE5EF]">
              <div>
                <div className="text-xs font-bold text-[#17243D]">
                  {label('home.field.navbarBawah', 'Navbar Bawah')}
                </div>
                {isVisible('home.desc.navbarBawah') && (
                  <div className="text-[10.5px] text-[#8FA4BF]">
                    {label('home.desc.navbarBawah', 'Menu mengambang & Modal Bottom Sheet')}
                  </div>
                )}
              </div>
              <ToggleSwitch
                checked={bottomNavbar.enabled}
                onChange={(checked) =>
                  onUpdateBottomNavbar((prev) => ({ ...prev, enabled: checked }))
                }
                label="Aktifkan Navbar Bawah"
              />
            </div>

            <div>
              <div className="text-xs font-semibold text-[#17243D] mb-1.5">
                {label('home.field.posisiNavbar', 'Posisi Navbar')}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: false, label: 'Menempel Bawah' },
                    { id: true, label: 'Mengambang (Floating)' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={String(opt.id)}
                    type="button"
                    onClick={() =>
                      onUpdateBottomNavbar((prev) =>
                        opt.id
                          ? {
                              ...prev,
                              floating: true,
                              barWidthPercent:
                                prev.barWidthPercent === undefined || prev.barWidthPercent === 100
                                  ? 94
                                  : prev.barWidthPercent,
                              bottomOffset:
                                prev.bottomOffset === undefined || prev.bottomOffset === 0
                                  ? 12
                                  : prev.bottomOffset,
                              borderRadius:
                                prev.borderRadius === undefined || prev.borderRadius === 0
                                  ? 20
                                  : prev.borderRadius,
                              barShadow: prev.barShadow ?? 'md',
                            }
                          : {
                              ...prev,
                              floating: false,
                              barWidthPercent: 100,
                              bottomOffset: 0,
                              borderRadius: 0,
                            }
                      )
                    }
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                      navMetrics.floating === opt.id
                        ? 'bg-[#17243D] text-white border-[#17243D]'
                        : 'bg-[#F0F5FA] text-[#51637D] border-[#DCE5EF] hover:bg-[#DCE5EF]/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-[#17243D] mb-1.5">
                {label('home.field.gayaTombolTengah', 'Gaya Tombol Tengah (Home)')}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'elevated', label: 'Menonjol (Bulat)' },
                    { id: 'inline', label: 'Sejajar Rata' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() =>
                      onUpdateBottomNavbar((prev) => ({ ...prev, centerStyle: opt.id }))
                    }
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                      bottomNavbar.centerStyle === opt.id
                        ? 'bg-[#17243D] text-white border-[#17243D]'
                        : 'bg-[#F0F5FA] text-[#51637D] border-[#DCE5EF] hover:bg-[#DCE5EF]/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ukuran, Posisi Naik/Turun & Shadow */}
            <div className="p-2.5 rounded-xl bg-[#F0F5FA]/60 border border-[#DCE5EF] space-y-2.5">
              <div className="text-[11px] font-bold text-[#17243D]">
                {label('home.field.ukuranPosisiShadow', 'Ukuran, Posisi Naik/Turun & Shadow')}
              </div>

              <SliderRow
                label="Ukuran Ikon"
                value={`${navMetrics.iconSize}px`}
                min={12}
                max={32}
                current={navMetrics.iconSize}
                onChange={(val) => onUpdateBottomNavbar((prev) => ({ ...prev, iconSize: val }))}
              />
              <SliderRow
                label="Ukuran Teks"
                value={`${navMetrics.labelSize}px`}
                min={8}
                max={16}
                current={navMetrics.labelSize}
                onChange={(val) => onUpdateBottomNavbar((prev) => ({ ...prev, labelSize: val }))}
              />
              <SliderRow
                label="Tinggi / Tebal Navbar"
                value={`${navMetrics.barPaddingY}px`}
                min={2}
                max={24}
                current={navMetrics.barPaddingY}
                onChange={(val) => onUpdateBottomNavbar((prev) => ({ ...prev, barPaddingY: val }))}
              />
              <SliderRow
                label="Lebar Navbar"
                value={`${navMetrics.barWidthPercent}%`}
                min={70}
                max={100}
                current={navMetrics.barWidthPercent}
                onChange={(val) =>
                  onUpdateBottomNavbar((prev) => ({ ...prev, barWidthPercent: val }))
                }
              />
              <SliderRow
                label="Naik / Turun dari Bawah"
                value={`${navMetrics.bottomOffset}px`}
                min={0}
                max={48}
                step={2}
                current={navMetrics.bottomOffset}
                onChange={(val) =>
                  onUpdateBottomNavbar((prev) => ({ ...prev, bottomOffset: val }))
                }
              />
              <SliderRow
                label="Sudut Melengkung"
                value={`${navMetrics.borderRadius}px`}
                min={0}
                max={32}
                step={2}
                current={navMetrics.borderRadius}
                onChange={(val) =>
                  onUpdateBottomNavbar((prev) => ({ ...prev, borderRadius: val }))
                }
              />

              <div>
                <div className="text-[11px] font-medium text-[#51637D] mb-1">
                  Bayangan (Shadow)
                </div>
                <div className="grid grid-cols-4 gap-1">
                  {(
                    [
                      { id: 'none', label: 'Tanpa' },
                      { id: 'sm', label: 'Halus' },
                      { id: 'md', label: 'Sedang' },
                      { id: 'lg', label: 'Tebal' },
                    ] as { id: ShadowPreset; label: string }[]
                  ).map((sh) => (
                    <button
                      key={sh.id}
                      type="button"
                      onClick={() =>
                        onUpdateBottomNavbar((prev) => ({ ...prev, barShadow: sh.id }))
                      }
                      className={`py-1 px-1.5 rounded-md text-[10.5px] font-semibold border transition-colors cursor-pointer ${
                        navMetrics.barShadow === sh.id
                          ? 'bg-[#17243D] text-white border-[#17243D]'
                          : 'bg-white text-[#51637D] border-[#DCE5EF] hover:bg-[#F0F5FA]'
                      }`}
                    >
                      {sh.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#17243D]">
                  {label('home.field.warnaNavbar', 'Warna Navbar')}
                </span>
                <button
                  type="button"
                  onClick={() =>
                    onUpdateBottomNavbar((prev) => ({
                      ...prev,
                      barBg: theme.cardBg,
                      textColor: theme.textColor,
                      accentColor: theme.accentColor,
                      borderColor: theme.borderColor,
                    }))
                  }
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00A873] hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Samakan Tema</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: 'barBg', label: 'Latar Bar' },
                    { key: 'textColor', label: 'Teks & Ikon' },
                    { key: 'accentColor', label: 'Aksen (Home)' },
                    { key: 'borderColor', label: 'Garis Atas' },
                  ] as const
                ).map((cField) => (
                  <div key={cField.key}>
                    <label className="block text-[11px] font-medium text-[#8FA4BF] mb-1">
                      {cField.label}
                    </label>
                    <input
                      type="color"
                      value={bottomNavbar[cField.key]}
                      onChange={(e) =>
                        onUpdateBottomNavbar((prev) => ({
                          ...prev,
                          [cField.key]: e.target.value,
                        }))
                      }
                      className="w-full h-8 rounded-lg border border-[#DCE5EF] bg-white p-0.5 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 5 Menu Selector + Editor */}
          <div className="p-2.5 rounded-xl border border-[#DCE5EF] bg-white space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#DCE5EF]">
              <h4 className="text-xs font-bold text-[#17243D]">
                {label('home.field.menuNavbar', '5 Menu Navbar')}
              </h4>
              <span className="text-[10.5px] text-[#8FA4BF]">Klik menu untuk edit</span>
            </div>

            <div className="grid grid-cols-5 gap-1">
              {navItems.map((it) => {
                const isSelectedNav = activeNavItem?.id === it.id;
                const icId = resolveButtonIcon(it.icon, it.label);
                const glyph = icId === 'none' ? 'info' : icId;
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => onSelectNavItem(it.id)}
                    className={`relative flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg border text-center transition-all cursor-pointer min-w-0 ${
                      isSelectedNav
                        ? 'bg-[#17243D] text-white border-[#17243D] shadow-xs'
                        : 'bg-[#F0F5FA] text-[#17243D] border-[#DCE5EF] hover:border-[#8FA4BF]'
                    } ${it.enabled === false ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                        it.enabled !== false
                          ? isSelectedNav
                            ? 'bg-[#00C98A]'
                            : 'bg-[#00C98A]'
                          : 'bg-[#8FA4BF]'
                      }`}
                    />
                    <ButtonGlyph icon={glyph} iconUrl={it.iconUrl} className="w-3.5 h-3.5 shrink-0" />
                    <span className="text-[10px] font-semibold truncate max-w-full">
                      {it.label || 'Menu'}
                    </span>
                  </button>
                );
              })}
            </div>

            {activeNavItem && (() => {
              const activeIdx = navItems.findIndex((i) => i.id === activeNavItem.id);
              const activeIcon = resolveButtonIcon(activeNavItem.icon, activeNavItem.label);
              return (
                <div className="pt-2 border-t border-[#DCE5EF] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[#17243D]">
                        {activeNavItem.label || 'Menu'}
                      </div>
                      <div className="text-[11px] text-[#8FA4BF]">{slotLabel(activeIdx)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-[#51637D]">
                        {activeNavItem.enabled !== false ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <ToggleSwitch
                        checked={activeNavItem.enabled !== false}
                        onChange={(checked) => updateNavItem(activeNavItem.id, { enabled: checked })}
                        label={`Aktifkan menu ${activeNavItem.label}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#17243D] mb-1">
                      Label Menu
                    </label>
                    <input
                      type="text"
                      value={activeNavItem.label}
                      onChange={(e) => updateNavItem(activeNavItem.id, { label: e.target.value })}
                      placeholder="Contoh: Galeri"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-medium text-[#17243D] mb-1.5">Pilih Ikon</div>
                    <IconPicker
                      selectedIcon={activeIcon === 'none' ? 'info' : activeIcon}
                      iconUrl={activeNavItem.iconUrl ?? ''}
                      allowNone={false}
                      accentVariant="emerald"
                      onSelectIcon={(icon) => updateNavItem(activeNavItem.id, { icon })}
                      onChangeIconUrl={(iconUrl) => updateNavItem(activeNavItem.id, { iconUrl })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#17243D] mb-1">
                      Aksi Saat Diklik
                    </label>
                    <select
                      value={activeNavItem.action}
                      onChange={(e) =>
                        updateNavItem(activeNavItem.id, {
                          action: e.target.value as BottomNavbarItemAction,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                    >
                      <option value="sheet">Buka Modal Bottom Sheet</option>
                      <option value="scroll_top">Ke Atas / Beranda (Home)</option>
                      <option value="link">Buka Tautan / Link WA</option>
                    </select>
                  </div>

                  {activeNavItem.action === 'link' && (
                    <div className="p-2.5 rounded-xl bg-[#F0F5FA]/60 border border-[#DCE5EF] space-y-1.5">
                      <label className="block text-[11px] font-semibold text-[#17243D]">
                        URL Tautan / WhatsApp
                      </label>
                      <input
                        type="url"
                        value={activeNavItem.linkUrl ?? ''}
                        onChange={(e) =>
                          updateNavItem(activeNavItem.id, { linkUrl: e.target.value })
                        }
                        placeholder="https://wa.me/62812... atau https://..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                      />
                    </div>
                  )}

                  {activeNavItem.action === 'sheet' && (
                    <div className="p-2.5 rounded-xl bg-[#F0F5FA]/60 border border-[#DCE5EF] space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#17243D]">
                          Isi Modal Bottom Sheet
                        </span>
                        <span className="text-[11px] text-[#8FA4BF] tabular-nums">
                          {activeNavItem.children.length} elemen
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[#51637D] mb-1">
                          Judul Modal Sheet
                        </label>
                        <input
                          type="text"
                          value={activeNavItem.sheetTitle}
                          onChange={(e) =>
                            updateNavItem(activeNavItem.id, { sheetTitle: e.target.value })
                          }
                          placeholder={activeNavItem.label}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                        />
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold text-[#51637D] mb-1.5">
                          Isi Cepat Template
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(
                            [
                              { id: 'galeri', label: 'Galeri Foto' },
                              { id: 'belanja', label: 'Katalog Belanja' },
                              { id: 'kontak', label: 'Kontak & WA' },
                              { id: 'alamat', label: 'Alamat & Maps' },
                              { id: 'form', label: 'Form Isian' },
                            ] as const
                          ).map((tpl) => (
                            <button
                              key={tpl.id}
                              type="button"
                              onClick={() => applyNavSheetTemplate(activeNavItem.id, tpl.id)}
                              className="py-1.5 px-2 rounded-lg bg-white border border-[#DCE5EF] hover:border-[#00C98A] text-[11px] font-medium text-[#17243D] cursor-pointer text-left truncate transition-colors"
                            >
                              {tpl.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold text-[#51637D] mb-1.5">
                          Elemen di Dalam Modal
                        </div>
                        {activeNavItem.children.length > 0 ? (
                          <div className="space-y-1.5">
                            {activeNavItem.children.map((child, cIdx) => (
                              <div
                                key={child.id}
                                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-[#DCE5EF] bg-white"
                              >
                                <button
                                  type="button"
                                  onClick={() => onSelectBlock(child.id)}
                                  className="min-w-0 flex-1 text-left cursor-pointer hover:text-[#00A873]"
                                >
                                  <div className="text-xs font-semibold text-[#17243D] truncate">
                                    {cIdx + 1}. {child.label.trim() || label(`komponen.type.${child.type}`, BLOCK_TYPE_NAMES[child.type])}
                                  </div>
                                  <div className="text-[11px] text-[#8FA4BF] truncate">
                                    {label(`komponen.type.${child.type}`, BLOCK_TYPE_NAMES[child.type])} · Klik untuk edit
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateNavItem(activeNavItem.id, {
                                      children: activeNavItem.children.filter(
                                        (ch) => ch.id !== child.id
                                      ),
                                    })
                                  }
                                  title="Hapus elemen dari modal"
                                  className="p-1 rounded hover:bg-red-50 text-[#8FA4BF] hover:text-red-600 cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-3 px-2.5 rounded-lg border border-dashed border-[#DCE5EF] bg-white text-center text-[11px] text-[#8FA4BF]">
                            Modal sheet ini masih kosong.
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold text-[#51637D] mb-1.5">
                          + Tambah Elemen ke Modal
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(
                            [
                              { type: 'carousel', label: 'Galeri Foto' },
                              { type: 'catalog', label: 'Katalog Produk' },
                              { type: 'maps_place', label: 'Maps & Ulasan' },
                              { type: 'button', label: 'Tombol CTA' },
                              { type: 'text', label: 'Teks / Info' },
                              { type: 'social', label: 'Ikon Sosmed' },
                              { type: 'image', label: 'Gambar' },
                              { type: 'form', label: 'Form Isian' },
                            ] as { type: BlockType; label: string }[]
                          ).map((opt) => (
                            <button
                              key={opt.type}
                              type="button"
                              onClick={() => onAddChildToContainer(activeNavItem.id, opt.type)}
                              className="flex items-center gap-1 py-1.5 px-2 rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] text-[11px] font-medium text-[#17243D] cursor-pointer truncate transition-colors"
                            >
                              <Plus className="w-3 h-3 text-[#00C98A] shrink-0" />
                              <span className="truncate">{opt.label}</span>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </div>
      </AccordionSection>
      )}
    </div>
  );
}
