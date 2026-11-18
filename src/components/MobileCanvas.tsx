import React, { useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeftRight,
  ArrowUp,
  Check,
  ChevronDown,
  Copy,
  Eye,
  GripVertical,
  ImageOff,
  Monitor,
  PanelBottomOpen,
  Plus,
  ShoppingCart,
  Smartphone,
  Trash2,
  X,
} from 'lucide-react';
import {
  AdvanceOptions,
  BlockType,
  BottomNavbarConfig,
  BuilderBlock,
  CategoryJumpItem,
  FnbMenuItem,
  PageTheme,
} from '../types/builder';
import { BLOCK_TYPE_NAMES, resolveNavbarMetrics } from '../data/presets';
import { resolveBlockTextColor, shadowToCss } from '../utils/htmlExporter';
import { SOCIAL_PLATFORMS, resolveSocialMetrics } from '../utils/socialIcons';
import { resolveButtonIcon, sanitizeIconUrl } from '../utils/buttonIcons';
import { resolveCartButtonMetrics } from '../utils/cartHelpers';
import { resolveCssFontFamily } from '../utils/fontHelpers';
import { buildLinearGradientCss, resolveBackgroundInlineProps } from '../utils/gradientHelpers';
import { clampDimension } from '../utils/devicePresets';
import { ButtonGlyph } from './ButtonIcon';
import { CleanVideoEmbed } from './CleanVideoEmbed';
import {
  CategoryJumpTabs,
  FnbCatalogCard,
  FnbFloatingCartCapsule,
  HeroProfileCard,
  fnbPriceSum,
} from './DynamicBlocks';
import { MapsPlaceCard } from './MapsPlaceCard';
import { PhotoCarousel } from './PhotoCarousel';
import { SocialFeedCard } from './SocialFeedCard';
import { SocialFollowerList } from './SocialFollowerList';
import { SocialGlyph } from './SocialIcon';
import { TrainingCatalogCard } from './TrainingCatalogCard';
import { CollabPeer } from '../utils/collabClient';

interface MobileCanvasProps {
  blocks: BuilderBlock[];
  theme: PageTheme;
  advanceOptions: AdvanceOptions;
  bottomNavbar: BottomNavbarConfig;
  inspectorMode: 'element' | 'navbar';
  selectedId: string | null;
  remotePeersByBlock?: Record<string, CollabPeer[]>;
  onOpenPreview: () => void;
  onSelectBlock: (id: string | null) => void;
  onOpenNavbarSettings: (itemId?: string) => void;
  onMoveBlock: (id: string, dir: 'up' | 'down') => void;
  onDuplicateBlock: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onToggleFullBleed?: (id: string) => void;
  onDropNewBlock: (
    type: BlockType,
    targetId?: string,
    position?: 'before' | 'after' | 'inside'
  ) => void;
  onDropSection: (
    sectionId: string,
    targetId?: string,
    position?: 'before' | 'after' | 'inside'
  ) => void;
  onReorderBlock: (
    draggedId: string,
    targetId: string,
    position: 'before' | 'after' | 'inside'
  ) => void;
}

export function MobileCanvas({
  blocks,
  theme,
  advanceOptions,
  bottomNavbar,
  inspectorMode,
  selectedId,
  remotePeersByBlock = {},
  onOpenPreview,
  onSelectBlock,
  onOpenNavbarSettings,
  onMoveBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onToggleFullBleed,
  onDropNewBlock,
  onDropSection,
  onReorderBlock,
}: MobileCanvasProps) {
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: 390,
    height: 844,
  });
  const [zoom, setZoom] = useState<0.5 | 0.65 | 0.75 | 0.85 | 1>(1);
  const [dragOverRoot, setDragOverRoot] = useState(false);
  const [dragState, setDragState] = useState<{
    draggedId: string | null;
    targetId: string | null;
    position: 'before' | 'after' | 'inside' | null;
  }>({ draggedId: null, targetId: null, position: null });
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [openToggles, setOpenToggles] = useState<Record<string, boolean>>({});
  const [openSheets, setOpenSheets] = useState<Record<string, boolean>>({});
  const [openNavSheetId, setOpenNavSheetId] = useState<string | null>(null);
  const [activeCategoryTabIds, setActiveCategoryTabIds] = useState<Record<string, string>>({});
  const [fnbPreviewQtys, setFnbPreviewQtys] = useState<Record<string, number>>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const canvasRootRef = useRef<HTMLDivElement>(null);

  const jumpToMatchingHeadingInCanvas = (targetTitle: string) => {
    const query = targetTitle.trim().toLowerCase();
    if (!query || !canvasRootRef.current) return;
    const candidates = Array.from(
      canvasRootRef.current.querySelectorAll<HTMLElement>('[data-jump-title]')
    );
    const exact = candidates.find(
      (el) => (el.getAttribute('data-jump-title') || '').trim().toLowerCase() === query
    );
    const partial =
      exact ??
      candidates.find((el) =>
        (el.getAttribute('data-jump-title') || '').trim().toLowerCase().includes(query)
      );
    if (partial) {
      partial.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const hasDescendantId = (node: BuilderBlock, targetId: string): boolean => {
    if (!node.children || node.children.length === 0) return false;
    return node.children.some((ch) => ch.id === targetId || hasDescendantId(ch, targetId));
  };

  const navIdWithSelectedChild = (() => {
    if (!selectedId) return null;
    for (const navItem of bottomNavbar.items) {
      if (navItem.children.some((ch) => ch.id === selectedId || hasDescendantId(ch, selectedId))) {
        return navItem.id;
      }
    }
    return null;
  })();

  const activeEditorNavSheetId =
    navIdWithSelectedChild ??
    (inspectorMode === 'navbar' || selectedId === null ? openNavSheetId : null);
  const enabledNavItems = bottomNavbar.items.filter((it) => it.enabled !== false);
  const activeEditorNavItem = bottomNavbar.enabled
    ? enabledNavItems.find((it) => it.id === activeEditorNavSheetId && it.action === 'sheet') ?? null
    : null;

  const frameWidth = viewportSize.width;
  const frameHeight = viewportSize.height;
  const isWideViewport = frameWidth >= 600;

  const handleSelectPresetWidth = (mode: 'mobile' | 'wide') => {
    if (mode === 'mobile') {
      setViewportSize({ width: 390, height: 844 });
      setZoom(1);
    } else {
      setViewportSize({ width: 680, height: 840 });
      setZoom(0.85);
    }
  };

  const handleStartResizeResponsive = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = viewportSize.width;
    const startH = viewportSize.height;
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / zoom;
      const nextW = clampDimension(startW + dx * 2, 320, 960);
      setViewportSize({ width: nextW, height: startH });
    };
    const onUp = () => {
      window.removeEventListener('pointermove', onMove);
      window.removeEventListener('pointerup', onUp);
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
  };

  const renderBlockContent = (
    block: BuilderBlock,
    depth = 0,
    inheritedTextColor?: string
  ) => {
    const s = block.style;
    const isSelected = block.id === selectedId;
    const isEmptyText = block.type === 'text' && !(block.content.text ?? '').trim();
    const isCircleImage = block.type === 'image' && block.content.imageShape === 'circle';
    const resolvedTextColor = resolveBlockTextColor(s, theme, inheritedTextColor);
    const nextInheritedTextColor =
      s.useThemeTextColor === false
        ? s.textColor
        : s.useThemeTextColor === undefined &&
          s.textColor &&
          s.textColor.trim().toLowerCase() !== theme.textColor.trim().toLowerCase()
        ? s.textColor
        : inheritedTextColor;
    const padX = s.paddingX ?? s.padding;
    const padTop = s.paddingTop ?? s.padding;
    const padBottom = s.paddingBottom ?? s.padding;
    const isHeroBanner = block.type === 'hero_profile' && (block.content.heroVariant ?? 'compact') === 'banner';
    const isHeroCompact = block.type === 'hero_profile' && !isHeroBanner;
    const bgProps =
      isEmptyText || isCircleImage || isHeroBanner
        ? { backgroundColor: 'transparent' }
        : resolveBackgroundInlineProps(s);
    const resolvedFontFamily =
      resolveCssFontFamily(s.fontFamily) || resolveCssFontFamily(theme.fontFamily);
    const inlineStyle: React.CSSProperties = {
      width: `${s.widthPercent}%`,
      minHeight: isEmptyText || isCircleImage ? '0px' : `${s.minHeight}px`,
      borderRadius: `${isHeroCompact ? (block.content.heroCardRadius ?? s.borderRadius) : isHeroBanner ? 0 : s.borderRadius}px`,
      padding: isEmptyText
        ? isSelected
          ? '6px 8px'
          : '0px'
        : isHeroBanner
        ? '0px'
        : `${padTop}px ${padX}px ${padBottom}px ${padX}px`,
      marginBottom: isEmptyText ? (isSelected ? '4px' : '0px') : `${s.marginBottom}px`,
      textAlign: s.align,
      ...bgProps,
      color: resolvedTextColor,
      fontFamily: resolvedFontFamily,
      fontSize: s.fontSize ? `${s.fontSize}px` : undefined,
      fontWeight: s.fontWeightCss ? Number(s.fontWeightCss) : undefined,
      lineHeight: s.lineHeight ? String(s.lineHeight) : undefined,
      borderWidth: isEmptyText || isCircleImage || isHeroBanner ? '0px' : `${s.borderWidth}px`,
      borderStyle:
        !isEmptyText && !isCircleImage && !isHeroBanner && s.borderWidth > 0 ? 'solid' : 'none',
      borderColor: s.borderColor,
      boxShadow:
        isEmptyText || isCircleImage || isHeroBanner
          ? 'none'
          : shadowToCss(s.shadow, s.shadowColor),
      backdropFilter:
        !isEmptyText && !isCircleImage && s.blur > 0 ? `blur(${s.blur}px)` : undefined,
      WebkitBackdropFilter:
        !isEmptyText && !isCircleImage && s.blur > 0 ? `blur(${s.blur}px)` : undefined,
      boxSizing: 'border-box',
      marginLeft: 'auto',
      marginRight: 'auto',
    };

    const isDraggingThis = dragState.draggedId === block.id;
    const isDropTarget = dragState.targetId === block.id;
    const remoteEditors = Array.from(
      new Map((remotePeersByBlock[block.id] ?? []).map((p) => [p.userId, p])).values()
    );
    const primaryRemoteEditor = remoteEditors[0] ?? null;
    const topLevelPadClass =
      depth === 0
        ? s.fullBleed
          ? 'w-full px-0'
          : isWideViewport
          ? 'max-w-[680px] mx-auto px-10'
          : 'px-4'
        : '';

    const handleBlockDrop = (
      e: React.DragEvent,
      targetId: string,
      pos: 'before' | 'after' | 'inside'
    ) => {
      e.preventDefault();
      e.stopPropagation();

      const existingId = e.dataTransfer.getData('application/lynk-existing-block');
      const newBlockType = e.dataTransfer.getData('application/lynk-block-type') as BlockType;
      const sectionId = e.dataTransfer.getData('application/lynk-section-id');

      if (existingId && existingId !== targetId) {
        onReorderBlock(existingId, targetId, pos);
      } else if (newBlockType) {
        onDropNewBlock(newBlockType, targetId, pos);
      } else if (sectionId) {
        onDropSection(sectionId, targetId, pos);
      }

      setDragState({ draggedId: null, targetId: null, position: null });
      setDragOverRoot(false);
    };

    return (
      <div key={block.id} className={`relative ${topLevelPadClass}`}>
        {isDropTarget && dragState.position === 'before' && (
          <div className="h-1 bg-blue-600 rounded-full mb-1.5 shadow-xs transition-all" />
        )}

        <div
          draggable
          onDragStart={(e) => {
            e.stopPropagation();
            e.dataTransfer.setData('application/lynk-existing-block', block.id);
            e.dataTransfer.effectAllowed = 'move';
            setDragState({ draggedId: block.id, targetId: null, position: null });
          }}
          onDragOver={(e) => {
            e.preventDefault();
            e.stopPropagation();
            if (dragState.draggedId === block.id) return;

            const rect = e.currentTarget.getBoundingClientRect();
            const relY = e.clientY - rect.top;
            let pos: 'before' | 'after' | 'inside' =
              relY < rect.height / 2 ? 'before' : 'after';

            if (
              block.type === 'container' ||
              block.type === 'row' ||
              block.type === 'toggle_container' ||
              block.type === 'bottom_sheet'
            ) {
              if (relY < rect.height * 0.25) pos = 'before';
              else if (relY > rect.height * 0.75) pos = 'after';
              else pos = 'inside';
            }

            if (dragState.targetId !== block.id || dragState.position !== pos) {
              setDragState((prev) => ({ ...prev, targetId: block.id, position: pos }));
            }
          }}
          onDrop={(e) => {
            const pos =
              dragState.targetId === block.id && dragState.position
                ? dragState.position
                : 'after';
            handleBlockDrop(e, block.id, pos);
          }}
          onDragEnd={() => {
            setDragState({ draggedId: null, targetId: null, position: null });
            setDragOverRoot(false);
          }}
          onClick={(e) => {
            e.stopPropagation();
            onSelectBlock(block.id);
          }}
          style={{
            ...inlineStyle,
            outline:
              !isSelected && primaryRemoteEditor
                ? `2px dashed ${primaryRemoteEditor.color}`
                : inlineStyle.outline,
            outlineOffset: !isSelected && primaryRemoteEditor ? '2px' : undefined,
          }}
          className={`relative transition-all cursor-grab active:cursor-grabbing group ${
            s.hoverLift ? 'hover:-translate-y-0.5 hover:shadow-lg' : ''
          } ${isDraggingThis ? 'opacity-40 scale-[0.99]' : ''} ${
            isDropTarget && dragState.position === 'inside'
              ? 'ring-2 ring-dashed ring-blue-600 bg-blue-50/20'
              : isSelected
              ? s.fullBleed && depth === 0
                ? 'ring-2 ring-inset ring-blue-600'
                : 'ring-2 ring-blue-600 ring-offset-2 ring-offset-transparent'
              : 'hover:ring-1 hover:ring-blue-400/70'
          }`}
        >
          {/* Drag Handle Badge on Hover/Selected */}
          <div
            title="Tarik untuk geser posisi"
            className={`absolute -top-3 left-2 z-20 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-900 text-white text-[10px] font-medium shadow-sm transition-opacity pointer-events-none ${
              isSelected ? 'opacity-100' : 'opacity-0 group-hover:opacity-90'
            }`}
          >
            <GripVertical className="w-3 h-3" />
            <span>{block.label.trim() || BLOCK_TYPE_NAMES[block.type]}</span>
          </div>

          {primaryRemoteEditor && (
            <div
              style={{ backgroundColor: primaryRemoteEditor.color }}
              className={`absolute ${isSelected ? '-bottom-2.5' : '-top-2.5'} right-2 z-20 px-1.5 py-0.5 rounded-md text-white text-[10px] font-semibold shadow-sm pointer-events-none whitespace-nowrap`}
            >
              Sedang diedit: {primaryRemoteEditor.name}
              {remoteEditors.length > 1 ? ` +${remoteEditors.length - 1}` : ''}
            </div>
          )}

          {/* Quick Toolbar when Selected */}
          {isSelected && (
            <div
              onClick={(e) => e.stopPropagation()}
              onDragStart={(e) => e.stopPropagation()}
              className="absolute -top-8 right-0 z-20 flex items-center gap-0.5 bg-slate-900 text-white rounded-lg px-1.5 py-1 shadow-md"
            >
              <button
                type="button"
                onClick={() => onMoveBlock(block.id, 'up')}
                title="Naikkan"
                className="p-1 hover:bg-slate-700 rounded cursor-pointer"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onMoveBlock(block.id, 'down')}
                title="Turunkan"
                className="p-1 hover:bg-slate-700 rounded cursor-pointer"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
              {onToggleFullBleed && (
                <button
                  type="button"
                  onClick={() => onToggleFullBleed(block.id)}
                  title={s.fullBleed ? 'Kembalikan margin kanan-kiri' : 'Full kanan-kiri (tanpa margin)'}
                  className={`p-1 rounded cursor-pointer transition-colors ${
                    s.fullBleed ? 'bg-blue-600 text-white' : 'hover:bg-slate-700'
                  }`}
                >
                  <ArrowLeftRight className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                onClick={() => onDuplicateBlock(block.id)}
                title="Duplikat"
                className="p-1 hover:bg-slate-700 rounded cursor-pointer"
              >
                <Copy className="w-3 h-3" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteBlock(block.id)}
                title="Hapus"
                className="p-1 hover:bg-red-600 rounded cursor-pointer"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}

          {block.type === 'container' && (
            <div
              data-jump-title={block.label?.trim().toLowerCase() || undefined}
              onDragOver={(e) => {
                e.preventDefault();
              }}
              onDrop={(e) => {
                if (block.children && block.children.length > 0) return;
                handleBlockDrop(e, block.id, 'inside');
              }}
            >
              {block.children && block.children.length > 0 ? (
                block.children.map((child) =>
                  renderBlockContent(child, depth + 1, nextInheritedTextColor)
                )
              ) : (
                <div className="py-5 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-lg">
                  Wadah kosong — tarik &amp; lepas komponen ke sini
                </div>
              )}
            </div>
          )}

          {block.type === 'toggle_container' && (() => {
            const defaultOpen = Boolean(block.content.toggleDefaultOpen);
            const hasSelectedChild =
              selectedId !== null && selectedId !== block.id && hasDescendantId(block, selectedId);
            const isDragInside = isDropTarget && dragState.position === 'inside';
            const isOpen = (openToggles[block.id] ?? defaultOpen) || hasSelectedChild || isDragInside;
            const showLabel = block.content.toggleShowLabel || 'Tampilkan Konten';
            const hideLabel = block.content.toggleHideLabel || showLabel;
            const btnBg = block.content.toggleButtonBg || theme.accentColor;
            const btnText = block.content.toggleButtonText || '#FFFFFF';
            const btnStyle = block.content.toggleButtonStyle ?? 'solid';
            const childCount = (block.children ?? []).length;
            const activeLabel = isOpen ? hideLabel : showLabel;
            const leftIcon = resolveButtonIcon(block.content.toggleButtonIcon, showLabel);

            return (
              <div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBlock(block.id);
                    setOpenToggles((prev) => ({ ...prev, [block.id]: !isOpen }));
                  }}
                  style={
                    btnStyle === 'outline'
                      ? {
                          backgroundColor: 'transparent',
                          color: btnBg,
                          border: `1.5px solid ${btnBg}`,
                          borderRadius: `${Math.min(s.borderRadius, 12)}px`,
                        }
                      : {
                          backgroundColor: btnBg,
                          color: btnText,
                          borderRadius: `${Math.min(s.borderRadius, 12)}px`,
                        }
                  }
                  className="w-full py-2.5 px-3.5 text-sm font-semibold flex items-center justify-between gap-2 cursor-pointer transition-opacity hover:opacity-95"
                >
                  <span className="inline-flex items-center gap-2 min-w-0">
                    {(leftIcon !== 'none' || Boolean(sanitizeIconUrl(block.content.toggleButtonIconUrl))) && (
                      <ButtonGlyph
                        icon={leftIcon}
                        iconUrl={block.content.toggleButtonIconUrl}
                        className="w-4 h-4 shrink-0"
                      />
                    )}
                    <span className="truncate">{activeLabel}</span>
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                      isOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>
                <div className="mt-1.5 text-[10px] text-slate-400 text-center select-none">
                  {isOpen
                    ? 'Terbuka di editor · Klik tombol untuk tutup kembali'
                    : `${defaultOpen ? 'Default: Tampil' : 'Default: Sembunyi (Hide)'} · ${childCount} elemen (klik tombol untuk buka)`}
                </div>
                {isOpen && (
                  <div
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      if (block.children && block.children.length > 0) return;
                      handleBlockDrop(e, block.id, 'inside');
                    }}
                    className="mt-3 pt-3 border-t border-slate-200/70"
                  >
                    {block.children && block.children.length > 0 ? (
                      block.children.map((child) =>
                        renderBlockContent(child, depth + 1, nextInheritedTextColor)
                      )
                    ) : (
                      <div className="py-5 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-lg">
                        Wadah show/hide kosong — tarik &amp; lepas komponen ke sini
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })()}

          {block.type === 'bottom_sheet' && (() => {
            const hasSelectedChild =
              selectedId !== null && selectedId !== block.id && hasDescendantId(block, selectedId);
            const isDragInside = isDropTarget && dragState.position === 'inside';
            const isOpen = Boolean(openSheets[block.id]) || hasSelectedChild || isDragInside;
            const triggerStyle = block.content.sheetTriggerStyle ?? 'icon';
            const triggerLabel = block.content.sheetTriggerLabel ?? 'Lokasi Maps';
            const triggerSublabel = block.content.sheetTriggerSublabel ?? '';
            const triggerBg = block.content.sheetTriggerBg || theme.accentColor;
            const triggerText = block.content.sheetTriggerText || '#FFFFFF';
            const iconSize = Math.max(36, Math.min(72, block.content.sheetIconSize ?? 52));
            const glyphSize = Math.round(iconSize * 0.44);
            const triggerIcon = resolveButtonIcon(
              block.content.sheetTriggerIcon ?? 'map-pin',
              triggerLabel
            );
            const hasTriggerGlyph =
              triggerIcon !== 'none' || Boolean(sanitizeIconUrl(block.content.sheetTriggerIconUrl));
            const sheetTitle = block.content.sheetTitle ?? 'Lokasi & Ulasan';
            const childCount = (block.children ?? []).length;
            const justifyClass =
              s.align === 'left'
                ? 'justify-start'
                : s.align === 'right'
                ? 'justify-end'
                : 'justify-center';

            return (
              <div>
                <div className={`flex ${justifyClass}`}>
                  {triggerStyle === 'icon' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBlock(block.id);
                        setOpenSheets((prev) => ({ ...prev, [block.id]: !isOpen }));
                      }}
                      className="inline-flex flex-col items-center gap-1.5 cursor-pointer group/trig"
                    >
                      <span
                        style={{
                          width: `${iconSize}px`,
                          height: `${iconSize}px`,
                          backgroundColor: triggerBg,
                          color: triggerText,
                        }}
                        className="rounded-full flex items-center justify-center shadow-md transition-transform group-hover/trig:scale-105"
                      >
                        {hasTriggerGlyph ? (
                          <ButtonGlyph
                            icon={triggerIcon}
                            iconUrl={block.content.sheetTriggerIconUrl}
                            style={{ width: `${glyphSize}px`, height: `${glyphSize}px` }}
                          />
                        ) : (
                          <PanelBottomOpen
                            style={{ width: `${glyphSize}px`, height: `${glyphSize}px` }}
                          />
                        )}
                      </span>
                      {triggerLabel.trim() && (
                        <span className="text-xs font-semibold leading-tight">
                          {triggerLabel}
                        </span>
                      )}
                      {triggerSublabel.trim() && (
                        <span className="text-[11px] opacity-70 leading-tight">
                          {triggerSublabel}
                        </span>
                      )}
                    </button>
                  )}

                  {triggerStyle === 'pill' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBlock(block.id);
                        setOpenSheets((prev) => ({ ...prev, [block.id]: !isOpen }));
                      }}
                      style={{
                        backgroundColor: triggerBg,
                        color: triggerText,
                      }}
                      className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-sm cursor-pointer transition-opacity hover:opacity-95"
                    >
                      {hasTriggerGlyph && (
                        <ButtonGlyph
                          icon={triggerIcon}
                          iconUrl={block.content.sheetTriggerIconUrl}
                          className="w-4 h-4 shrink-0"
                        />
                      )}
                      <span className="text-left min-w-0">
                        <span className="block text-xs font-bold leading-tight truncate">
                          {triggerLabel || 'Buka Panel'}
                        </span>
                        {triggerSublabel.trim() && (
                          <span className="block text-[10px] opacity-85 leading-tight truncate mt-0.5">
                            {triggerSublabel}
                          </span>
                        )}
                      </span>
                    </button>
                  )}

                  {triggerStyle === 'button' && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectBlock(block.id);
                        setOpenSheets((prev) => ({ ...prev, [block.id]: !isOpen }));
                      }}
                      style={{
                        backgroundColor: triggerBg,
                        color: triggerText,
                        borderRadius: `${Math.min(s.borderRadius, 14)}px`,
                      }}
                      className="w-full py-2.5 px-4 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-opacity hover:opacity-95"
                    >
                      {hasTriggerGlyph && (
                        <ButtonGlyph
                          icon={triggerIcon}
                          iconUrl={block.content.sheetTriggerIconUrl}
                          className="w-4 h-4 shrink-0"
                        />
                      )}
                      <span className="truncate">{triggerLabel || 'Buka Bottom Sheet'}</span>
                    </button>
                  )}
                </div>

                <div className="mt-1.5 text-[10px] text-slate-400 text-center select-none">
                  {isOpen
                    ? 'Editor Bottom Sheet terbuka · Klik pemicu untuk tutup'
                    : `Bottom Sheet (${childCount} elemen) · Klik untuk lihat & edit isi`}
                </div>

                {isOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      if (block.children && block.children.length > 0) return;
                      handleBlockDrop(e, block.id, 'inside');
                    }}
                    style={{
                      backgroundColor: theme.cardBg,
                      borderColor: theme.borderColor,
                      color: theme.textColor,
                    }}
                    className="mt-3 rounded-t-2xl rounded-b-xl border shadow-lg overflow-hidden"
                  >
                    <div className="pt-2 pb-2 px-3.5 border-b flex flex-col items-center gap-1.5" style={{ borderColor: theme.borderColor }}>
                      <div className="w-9 h-1 rounded-full bg-slate-300/80" />
                      <div className="w-full flex items-center justify-between gap-2">
                        <span className="text-xs font-bold truncate">
                          {sheetTitle || 'Bottom Sheet'}
                        </span>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setOpenSheets((prev) => ({ ...prev, [block.id]: false }));
                          }}
                          title="Tutup preview sheet di editor"
                          className="p-1 rounded-lg hover:bg-slate-200/60 opacity-70 hover:opacity-100 cursor-pointer"
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="p-3">
                      {block.children && block.children.length > 0 ? (
                        block.children.map((child) =>
                          renderBlockContent(child, depth + 1, nextInheritedTextColor)
                        )
                      ) : (
                        <div className="py-5 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-lg">
                          Bottom Sheet kosong — tarik elemen ke sini atau tambah dari panel kanan
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })()}

        {block.type === 'row' && (() => {
          const rowMode = block.content.rowLayoutMode ?? 'grid';
          const rowCols = Math.max(1, Math.min(6, block.content.rowColumns ?? 2));
          const rowColWidth = Math.max(80, Math.min(340, block.content.rowColumnWidth ?? 156));
          const rowColMinH = Math.max(0, Math.min(360, block.content.rowColumnMinHeight ?? 0));
          const rowGap = Math.max(0, Math.min(32, block.content.rowGap ?? 12));
          const rowChildren = block.children ?? [];

          if (rowChildren.length === 0) {
            return (
              <div
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => handleBlockDrop(e, block.id, 'inside')}
                className="py-5 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-lg"
              >
                Row kosong — tambah kolom lewat panel kanan atau tarik elemen ke sini
              </div>
            );
          }

          if (rowMode === 'horizontal') {
            return (
              <div
                style={{
                  gap: `${rowGap}px`,
                  WebkitOverflowScrolling: 'touch',
                  scrollSnapType: 'x proximity',
                }}
                className="flex flex-row flex-nowrap items-stretch overflow-x-auto pb-1.5 touch-pan-x"
              >
                {rowChildren.map((child) => (
                  <div
                    key={child.id}
                    style={{
                      flex: `0 0 ${rowColWidth}px`,
                      width: `${rowColWidth}px`,
                      minWidth: `${rowColWidth}px`,
                      minHeight: rowColMinH > 0 ? `${rowColMinH}px` : undefined,
                      scrollSnapAlign: 'start',
                    }}
                    className="flex flex-col [&>*]:flex-1"
                  >
                    {renderBlockContent(child, depth + 1, nextInheritedTextColor)}
                  </div>
                ))}
              </div>
            );
          }

          return (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${rowCols}, minmax(0, 1fr))`,
                gap: `${rowGap}px`,
              }}
              className="items-stretch"
            >
              {rowChildren.map((child) => (
                <div
                  key={child.id}
                  style={{
                    minHeight: rowColMinH > 0 ? `${rowColMinH}px` : undefined,
                  }}
                  className="min-w-0 flex flex-col [&>*]:flex-1"
                >
                  {renderBlockContent(child, depth + 1, nextInheritedTextColor)}
                </div>
              ))}
            </div>
          );
        })()}

        {block.type === 'text' && (
          isEmptyText ? (
            isSelected ? (
              <div className="py-1.5 px-2.5 rounded-lg border border-dashed border-slate-300 bg-slate-50/80 text-[11px] italic text-slate-400 text-center">
                Teks kosong — tidak tampil di halaman (isi teks atau klik hapus)
              </div>
            ) : (
              <div className="h-1.5 w-full group-hover:h-5 flex items-center justify-center overflow-hidden transition-all">
                <span className="hidden group-hover:inline text-[10px] italic text-slate-400">
                  Teks kosong (tersembunyi)
                </span>
              </div>
            )
          ) : (
            <div
              data-jump-title={(block.content.text ?? '').trim().toLowerCase() || undefined}
              style={{
                fontSize: s.fontSize ? `${s.fontSize}px` : undefined,
                fontFamily: resolvedFontFamily,
                fontWeight: s.fontWeightCss ? Number(s.fontWeightCss) : undefined,
                lineHeight: s.lineHeight ? String(s.lineHeight) : undefined,
              }}
              className={`leading-relaxed break-words whitespace-pre-line ${
                !s.fontSize
                  ? block.content.variant === 'h1'
                    ? 'text-xl'
                    : block.content.variant === 'h2'
                    ? 'text-base'
                    : 'text-sm'
                  : ''
              } ${
                !s.fontWeightCss
                  ? block.content.fontWeight === 'bold'
                    ? 'font-bold'
                    : block.content.fontWeight === 'semibold'
                    ? 'font-semibold'
                    : 'font-normal'
                  : ''
              }`}
            >
              {block.content.text}
            </div>
          )
        )}

        {block.type === 'image' &&
          (block.content.imageShape === 'circle' ? (() => {
            const circleSize = Math.max(40, Math.min(280, block.content.circleSize ?? 112));
            const imageZoom = Math.max(40, Math.min(250, block.content.imageZoom ?? 100));
            const justifyClass =
              s.align === 'left'
                ? 'justify-start'
                : s.align === 'right'
                ? 'justify-end'
                : 'justify-center';
            return (
              <div className={`w-full flex ${justifyClass}`}>
                <div
                  className="overflow-hidden flex items-center justify-center shrink-0"
                  style={{
                    width: `${circleSize}px`,
                    height: `${circleSize}px`,
                    borderRadius: '9999px',
                    backgroundColor:
                      s.backgroundColor && s.backgroundColor !== 'transparent'
                        ? s.backgroundColor
                        : '#F1F5F9',
                    borderWidth: s.borderWidth > 0 ? `${s.borderWidth}px` : undefined,
                    borderStyle: s.borderWidth > 0 ? 'solid' : undefined,
                    borderColor: s.borderWidth > 0 ? s.borderColor : undefined,
                    boxShadow: shadowToCss(s.shadow, s.shadowColor),
                  }}
                >
                  {!block.content.src || brokenImages[block.id] ? (
                    <div className="flex flex-col items-center justify-center gap-1 p-2 text-slate-400 text-[10px] text-center">
                      <ImageOff className="w-4 h-4" />
                    </div>
                  ) : (
                    <img
                      src={block.content.src}
                      alt={block.content.alt || 'Foto Profil'}
                      referrerPolicy="no-referrer"
                      onError={() => setBrokenImages((prev) => ({ ...prev, [block.id]: true }))}
                      className="w-full h-full block"
                      style={{
                        objectFit: block.content.objectFit ?? 'cover',
                        transform: `scale(${imageZoom / 100})`,
                        transformOrigin: 'center center',
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })() : (
            <div
              className="overflow-hidden w-full h-full flex items-center justify-center bg-slate-100/70"
              style={{
                borderRadius: `${s.borderRadius}px`,
                aspectRatio:
                  block.content.aspectRatio && block.content.aspectRatio !== 'auto'
                    ? block.content.aspectRatio
                    : undefined,
              }}
            >
              {!block.content.src || brokenImages[block.id] ? (
                <div className="flex flex-col items-center justify-center gap-1.5 py-6 px-4 text-slate-400 text-xs">
                  <ImageOff className="w-5 h-5" />
                  <span>{block.content.alt || 'Gambar belum dimuat'}</span>
                </div>
              ) : (
                <img
                  src={block.content.src}
                  alt={block.content.alt || 'Gambar'}
                  referrerPolicy="no-referrer"
                  onError={() => setBrokenImages((prev) => ({ ...prev, [block.id]: true }))}
                  className="w-full h-full block"
                  style={{
                    objectFit: block.content.objectFit ?? 'cover',
                    borderRadius: `${s.borderRadius}px`,
                  }}
                />
              )}
            </div>
          ))}

        {block.type === 'button' && (() => {
          const btnLabel = block.content.label || 'Tombol Link';
          const leftIcon = resolveButtonIcon(block.content.buttonIcon, btnLabel);
          const btnGrad = buildLinearGradientCss(s);
          return (
            <div
              className="w-full py-3 px-4 font-semibold text-sm flex items-center justify-center gap-2 transition-opacity"
              style={{
                backgroundColor: btnGrad
                  ? s.gradientColor1 || '#EA580C'
                  : block.content.buttonBg ?? theme.accentColor,
                backgroundImage: btnGrad || undefined,
                color: block.content.buttonText ?? '#FFFFFF',
                borderRadius: `${s.borderRadius}px`,
              }}
            >
              {(leftIcon !== 'none' || Boolean(sanitizeIconUrl(block.content.buttonIconUrl))) && (
                <ButtonGlyph
                  icon={leftIcon}
                  iconUrl={block.content.buttonIconUrl}
                  className="w-4 h-4 shrink-0"
                />
              )}
              <span className="truncate">{btnLabel}</span>
            </div>
          );
        })()}

        {block.type === 'form' && (
          <div className="space-y-2.5 text-left">
            <div className="font-bold text-sm">{block.content.formTitle || 'Formulir'}</div>
            <div className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white/90 text-slate-400 text-xs">
              {block.content.namePlaceholder || 'Nama Lengkap'}
            </div>
            <div className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white/90 text-slate-400 text-xs">
              {block.content.emailPlaceholder || 'Email / WhatsApp'}
            </div>
            <div
              className="w-full py-2.5 px-4 rounded-lg text-white text-xs font-semibold text-center"
              style={{ backgroundColor: block.content.buttonColor ?? theme.accentColor }}
            >
              {block.content.submitLabel || 'Kirim Data'}
            </div>
          </div>
        )}

        {block.type === 'divider' && (
          <div className="w-full flex items-center py-1">
            <hr
              className="w-full"
              style={{
                border: 'none',
                borderTopWidth: `${block.content.thickness ?? 1}px`,
                borderTopStyle: block.content.lineStyle ?? 'solid',
                borderTopColor: block.content.lineColor ?? theme.borderColor,
              }}
            />
          </div>
        )}

        {(block.type === 'youtube' ||
          block.type === 'facebook_video' ||
          block.type === 'tiktok_video' ||
          block.type === 'instagram_video') && (
          <CleanVideoEmbed
            platform={
              block.type === 'facebook_video'
                ? 'facebook'
                : block.type === 'tiktok_video'
                ? 'tiktok'
                : block.type === 'instagram_video'
                ? 'instagram'
                : 'youtube'
            }
            videoUrl={
              block.type === 'youtube'
                ? block.content.youtubeUrl
                : block.content.videoUrl
            }
            posterUrl={block.content.videoPoster}
            aspectRatio={
              block.content.videoAspectRatio ??
              block.content.youtubeAspectRatio ??
              (block.type === 'tiktok_video' || block.type === 'instagram_video' ? '9/16' : '16/9')
            }
            autoPlay={block.content.videoAutoplay ?? block.content.youtubeAutoplay ?? true}
            volume={block.content.videoVolume ?? block.content.youtubeVolume ?? 75}
            borderRadius={s.borderRadius}
            accentColor={theme.accentColor}
            isEditor
          />
        )}

        {block.type === 'catalog' && (() => {
          const detailEnabled = block.content.catalogDetailEnabled ?? true;
          const cartEnabled = block.content.catalogCartEnabled ?? true;
          const cartBtn = resolveCartButtonMetrics(block.content.catalogCartButtonSize);
          return (
            <div className="space-y-2">
              <div
                className={
                  advanceOptions.blockLayout === 'grid'
                    ? 'grid grid-cols-2 gap-2.5 text-left'
                    : 'flex flex-col gap-2.5 text-left'
                }
              >
                {(block.content.catalogItems ?? []).map((item) => {
                  const unitSoldText = advanceOptions.showUnitSold
                    ? ` · ${item.unitSold} terjual`
                    : '';
                  const imgKey = `${block.id}_${item.id}_${item.image}`;
                  const hasImgError = brokenImages[imgKey];
                  const fit = item.imageObjectFit ?? 'cover';
                  const ratio = item.imageAspectRatio;

                  const renderThumb = (
                    className: string,
                    fallbackRatio?: string
                  ) => {
                    const effectiveRatio =
                      ratio === 'auto' ? undefined : ratio ?? fallbackRatio;
                    const thumbStyle: React.CSSProperties = {
                      objectFit: fit,
                      aspectRatio: effectiveRatio,
                    };
                    return !item.image || hasImgError ? (
                      <div
                        style={thumbStyle}
                        className={`${className} flex items-center justify-center bg-slate-100 text-slate-400`}
                      >
                        <ImageOff className="w-4 h-4" />
                      </div>
                    ) : (
                      <img
                        src={item.image}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        onError={() => setBrokenImages((prev) => ({ ...prev, [imgKey]: true }))}
                        style={thumbStyle}
                        className={className}
                      />
                    );
                  };

                  const badgeEl = item.badge?.trim() ? (
                    <span
                      className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
                      style={{ backgroundColor: theme.accentColor }}
                    >
                      {item.badge.trim()}
                    </span>
                  ) : null;

                  if (advanceOptions.blockLayout === 'grid') {
                    return (
                      <div
                        key={item.id}
                        style={{
                          backgroundColor: theme.cardBg,
                          borderColor: theme.borderColor,
                        }}
                        className="rounded-xl border overflow-hidden flex flex-col relative"
                      >
                        {badgeEl && <div className="absolute top-2 left-2 z-10">{badgeEl}</div>}
                        {renderThumb('w-full bg-slate-100', '1/1')}
                        <div className="p-2.5 space-y-1.5 flex-1 flex flex-col justify-between">
                          <div>
                            <div className="text-xs font-bold leading-snug line-clamp-2">
                              {item.title}
                            </div>
                            <div
                              className="text-[11px] font-semibold tabular-nums mt-0.5"
                              style={{ color: theme.accentColor }}
                            >
                              {item.price}
                              <span className="opacity-70 font-normal">{unitSoldText}</span>
                            </div>
                          </div>
                          {cartEnabled && (
                            <div
                              className="w-full font-semibold text-white flex items-center justify-center"
                              style={{
                                backgroundColor: theme.accentColor,
                                padding: cartBtn.gridPadding,
                                fontSize: `${cartBtn.gridFontSize}px`,
                                borderRadius: `${cartBtn.gridRadius}px`,
                                gap: `${cartBtn.gridGap}px`,
                              }}
                            >
                              <ShoppingCart
                                style={{
                                  width: `${cartBtn.gridIconSize}px`,
                                  height: `${cartBtn.gridIconSize}px`,
                                }}
                              />
                              <span>+ Keranjang</span>
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  if (advanceOptions.blockLayout === 'large-image') {
                    return (
                      <div
                        key={item.id}
                        style={{
                          backgroundColor: theme.cardBg,
                          borderColor: theme.borderColor,
                        }}
                        className="rounded-2xl border overflow-hidden relative"
                      >
                        {badgeEl && <div className="absolute top-2.5 left-2.5 z-10">{badgeEl}</div>}
                        {renderThumb('w-full bg-slate-100', '16/10')}
                        <div className="p-3 flex items-center justify-between gap-2">
                          <div className="min-w-0">
                            <div className="text-xs font-bold truncate">{item.title}</div>
                            <div className="text-[11px] opacity-75 mt-0.5 tabular-nums">
                              {item.price}
                              {unitSoldText}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 shrink-0">
                            <span
                              className="text-xs font-semibold"
                              style={{ color: theme.accentColor }}
                            >
                              {item.ctaLabel}
                            </span>
                            {cartEnabled && (
                              <span
                                className="text-white inline-flex items-center justify-center"
                                style={{
                                  backgroundColor: theme.accentColor,
                                  width: `${cartBtn.iconBoxSize}px`,
                                  height: `${cartBtn.iconBoxSize}px`,
                                  borderRadius: `${cartBtn.iconBoxRadius}px`,
                                }}
                              >
                                <ShoppingCart
                                  style={{
                                    width: `${cartBtn.iconOnlySize}px`,
                                    height: `${cartBtn.iconOnlySize}px`,
                                  }}
                                />
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (advanceOptions.blockLayout === 'compact') {
                    return (
                      <div
                        key={item.id}
                        style={{
                          backgroundColor: theme.cardBg,
                          borderColor: theme.borderColor,
                        }}
                        className="rounded-xl border p-3 space-y-2.5"
                      >
                        <div className="flex items-center gap-2.5">
                          {renderThumb(
                            ratio && ratio !== 'auto'
                              ? 'w-14 rounded-lg bg-slate-100 shrink-0'
                              : 'w-12 h-12 rounded-lg bg-slate-100 shrink-0'
                          )}
                          <div className="min-w-0 flex-1">
                            {badgeEl && <div className="mb-0.5">{badgeEl}</div>}
                            <div className="text-xs font-bold leading-snug truncate">
                              {item.title}
                            </div>
                            <div className="text-[11px] opacity-75 mt-0.5 tabular-nums">
                              {item.price}
                              {unitSoldText}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <div
                            className="flex-1 py-2 px-3 rounded-lg text-center text-xs font-semibold text-white"
                            style={{ backgroundColor: theme.accentColor }}
                          >
                            {item.ctaLabel}
                          </div>
                          {cartEnabled && (
                            <div
                              className="border font-semibold flex items-center justify-center shrink-0"
                              style={{
                                borderColor: theme.accentColor,
                                color: theme.accentColor,
                                padding: cartBtn.compactPadding,
                                borderRadius: `${cartBtn.compactRadius}px`,
                              }}
                            >
                              <ShoppingCart
                                style={{
                                  width: `${cartBtn.compactIconSize}px`,
                                  height: `${cartBtn.compactIconSize}px`,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  }

                  // default horizontal list layout
                  return (
                    <div
                      key={item.id}
                      style={{
                        backgroundColor: theme.cardBg,
                        borderColor: theme.borderColor,
                      }}
                      className="rounded-xl border p-2.5 flex items-center gap-3"
                    >
                      {renderThumb(
                        ratio && ratio !== 'auto'
                          ? 'w-16 rounded-lg bg-slate-100 shrink-0'
                          : 'w-14 h-14 rounded-lg bg-slate-100 shrink-0'
                      )}
                      <div className="min-w-0 flex-1">
                        {badgeEl && <div className="mb-0.5">{badgeEl}</div>}
                        <div className="text-xs font-bold truncate">{item.title}</div>
                        <div className="text-[11px] opacity-70 truncate mt-0.5">{item.subtitle}</div>
                        <div
                          className="text-[11px] font-semibold mt-1 tabular-nums"
                          style={{ color: theme.accentColor }}
                        >
                          {item.price}
                          <span className="opacity-70 font-normal">{unitSoldText}</span>
                        </div>
                      </div>
                      {cartEnabled && (
                        <div
                          className="text-white flex items-center justify-center shrink-0"
                          style={{
                            backgroundColor: theme.accentColor,
                            width: `${cartBtn.iconBoxSize}px`,
                            height: `${cartBtn.iconBoxSize}px`,
                            borderRadius: `${cartBtn.iconBoxRadius}px`,
                          }}
                        >
                          <ShoppingCart
                            style={{
                              width: `${cartBtn.iconOnlySize}px`,
                              height: `${cartBtn.iconOnlySize}px`,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {(detailEnabled || cartEnabled) && (
                <div className="text-[10px] text-center opacity-60 pt-0.5">
                  {detailEnabled && cartEnabled
                    ? 'Sub-Page Detail & Keranjang WA aktif (uji di Pratinjau)'
                    : detailEnabled
                    ? 'Sub-Page Detail Produk aktif (uji di Pratinjau)'
                    : 'Keranjang Pesan WA aktif (uji di Pratinjau)'}
                </div>
              )}
            </div>
          );
        })()}

        {block.type === 'social' && (() => {
          const allItems = block.content.socialItems ?? [];
          const visibleItems = allItems.filter((item) => item.visible);
          const socialStyle = block.content.socialStyle ?? 'filled';
          const socialShape = block.content.socialShape ?? 'circle';
          const { boxSize, iconSize, gap } = resolveSocialMetrics(block.content);
          const useBrand = block.content.socialUseBrandColors ?? true;
          const customColor = block.content.socialColor ?? theme.accentColor;

          const justifyClass =
            s.align === 'left'
              ? 'justify-start'
              : s.align === 'right'
              ? 'justify-end'
              : 'justify-center';

          const shapeClass = socialShape === 'rounded' ? 'rounded-xl' : 'rounded-full';

          if (visibleItems.length === 0) {
            return (
              <div className="py-3 px-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
                Belum ada ikon sosial media yang ditampilkan. Aktifkan atau tambah ikon di panel Pengaturan.
              </div>
            );
          }

          return (
            <div
              style={{ gap: `${gap}px` }}
              className={`flex flex-wrap items-center ${justifyClass}`}
            >
              {visibleItems.map((item) => {
                const meta = SOCIAL_PLATFORMS[item.platform];
                const activeColor = useBrand ? meta.brandColor : customColor;
                const itemStyle: React.CSSProperties = {
                  width: `${boxSize}px`,
                  height: `${boxSize}px`,
                  ...(socialStyle === 'filled'
                    ? { backgroundColor: activeColor, color: '#FFFFFF' }
                    : socialStyle === 'outline'
                    ? {
                        backgroundColor: 'transparent',
                        color: activeColor,
                        border: `1.5px solid ${activeColor}`,
                      }
                    : { backgroundColor: 'transparent', color: activeColor }),
                };

                return (
                  <div
                    key={item.id}
                    title={meta.label}
                    style={itemStyle}
                    className={`${shapeClass} inline-flex items-center justify-center transition-transform shrink-0`}
                  >
                    <SocialGlyph
                      platform={item.platform}
                      className=""
                      style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
                    />
                  </div>
                );
              })}
            </div>
          );
        })()}

        {block.type === 'social_follower' && (
          <SocialFollowerList
            accounts={block.content.socialFollowerAccounts ?? []}
            gap={block.content.socialFollowerGap ?? 10}
            borderRadius={s.borderRadius}
            cardBg={
              s.backgroundColor && s.backgroundColor !== 'transparent'
                ? s.backgroundColor
                : theme.cardBg
            }
            borderColor={s.borderWidth > 0 ? s.borderColor : theme.borderColor}
            textColor={resolvedTextColor}
            isEditor
          />
        )}

        {block.type === 'carousel' && (
          <PhotoCarousel
            items={block.content.carouselItems ?? []}
            aspectRatio={block.content.carouselAspectRatio ?? '4/5'}
            objectFit={block.content.carouselObjectFit ?? 'cover'}
            borderRadius={s.borderRadius}
            cardBg={theme.cardBg}
            borderColor={theme.borderColor}
            textColor={resolvedTextColor}
            accentColor={theme.accentColor}
            align={s.align}
            isEditor
          />
        )}

        {block.type === 'social_feed' && (
          <SocialFeedCard
            platform={block.content.socialFeedPlatform ?? 'instagram'}
            avatar={block.content.socialFeedAvatar}
            accountName={block.content.socialFeedAccountName ?? 'Studio Kreatif'}
            handle={block.content.socialFeedHandle ?? '@studiokreatif'}
            accountUrl={block.content.socialFeedAccountUrl}
            verified={block.content.socialFeedVerified ?? true}
            followers={block.content.socialFeedFollowers}
            followersLabel={block.content.socialFeedFollowersLabel}
            bio={block.content.socialFeedBio}
            followLabel={block.content.socialFeedFollowLabel}
            aspectRatio={block.content.socialFeedRatio ?? '4/5'}
            posts={block.content.socialFeedPosts ?? []}
            borderRadius={s.borderRadius}
            borderColor={theme.borderColor}
            textColor={resolvedTextColor}
            accentColor={theme.accentColor}
            isEditor
          />
        )}

        {block.type === 'maps_place' && (
          <MapsPlaceCard
            photoUrl={block.content.mapsPhotoUrl ?? ''}
            photoBadgeLabel={block.content.mapsPhotoBadgeLabel}
            photoRatio={block.content.mapsPhotoRatio}
            title={block.content.mapsTitle ?? 'Nama Lokasi'}
            rating={block.content.mapsRating}
            reviewCount={block.content.mapsReviewCount}
            service={block.content.mapsService}
            accessible={block.content.mapsAccessible}
            servicesList={block.content.mapsServicesList}
            address={block.content.mapsAddress}
            mapsUrl={block.content.mapsUrl}
            buttonLabel={block.content.mapsButtonLabel}
            borderRadius={s.borderRadius}
            textColor={resolvedTextColor}
            borderColor={theme.borderColor}
            accentColor={theme.accentColor}
            align={s.align}
            isEditor
          />
        )}

        {block.type === 'training_catalog' && (
          <TrainingCatalogCard
            content={block.content}
            borderRadius={s.borderRadius}
            cardBg={
              s.backgroundColor && s.backgroundColor !== 'transparent'
                ? s.backgroundColor
                : theme.cardBg
            }
            borderColor={s.borderWidth > 0 ? s.borderColor : theme.borderColor}
            textColor={resolvedTextColor}
            accentColor={theme.accentColor}
            align={s.align}
            isEditor
          />
        )}

        {block.type === 'hero_profile' && (
          <HeroProfileCard
            block={block}
            theme={theme}
            resolvedTextColor={resolvedTextColor}
          />
        )}

        {block.type === 'category_tabs' && (
          <CategoryJumpTabs
            block={block}
            theme={theme}
            activeId={activeCategoryTabIds[block.id] ?? null}
            onSelect={(catItem: CategoryJumpItem, e) => {
              e.stopPropagation();
              onSelectBlock(block.id);
              setActiveCategoryTabIds((prev) => ({ ...prev, [block.id]: catItem.id }));
              jumpToMatchingHeadingInCanvas(catItem.targetTitle || catItem.label);
            }}
          />
        )}

        {block.type === 'fnb_catalog' && (
          <FnbCatalogCard
            block={block}
            theme={theme}
            cartQtyLookup={fnbPreviewQtys}
            onAddItem={(item: FnbMenuItem) => {
              setFnbPreviewQtys((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
            }}
            onIncrementItem={(item: FnbMenuItem) => {
              setFnbPreviewQtys((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
            }}
            onDecrementItem={(item: FnbMenuItem) => {
              setFnbPreviewQtys((prev) => {
                const next = Math.max(0, (prev[item.id] ?? 0) - 1);
                return { ...prev, [item.id]: next };
              });
            }}
          />
        )}
        </div>

        {isDropTarget && dragState.position === 'after' && (
          <div className="h-1 bg-blue-600 rounded-full mt-1.5 shadow-xs transition-all" />
        )}
      </div>
    );
  };

  return (
    <main
      onClick={() => onSelectBlock(null)}
      className="flex-1 bg-[#F0F5FA] flex flex-col overflow-hidden relative"
    >
      {/* Workspace Toolbar: Mobile (390px), Lebar (680px) & Zoom */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="min-h-12 px-4 py-1.5 bg-white border-b border-[#DCE5EF] flex items-center justify-between gap-2 text-[13px] text-[#17243D] shrink-0 overflow-x-auto no-scrollbar"
      >
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            type="button"
            onClick={() => handleSelectPresetWidth('mobile')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              !isWideViewport
                ? 'bg-[#17243D] border-[#17243D] text-white'
                : 'bg-white border-[#DCE5EF] text-[#17243D] hover:bg-[#F0F5FA]'
            }`}
          >
            <Smartphone className={`w-3.5 h-3.5 ${!isWideViewport ? 'text-[#00C98A]' : 'text-[#8FA4BF]'}`} />
            <span>Mobile (390px)</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPresetWidth('wide')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isWideViewport
                ? 'bg-[#17243D] border-[#17243D] text-white'
                : 'bg-white border-[#DCE5EF] text-[#17243D] hover:bg-[#F0F5FA]'
            }`}
          >
            <Monitor className={`w-3.5 h-3.5 ${isWideViewport ? 'text-[#00C98A]' : 'text-[#8FA4BF]'}`} />
            <span>Lebar (680px)</span>
          </button>
        </div>

        <div className="hidden lg:flex items-center gap-2.5 shrink-0">
          <span className="text-[11px] text-[#8FA4BF] font-mono tabular-nums">
            {frameWidth}×{frameHeight}px
          </span>
          <div className="flex items-center gap-0.5 bg-[#F0F5FA] border border-[#DCE5EF] rounded-lg p-0.5">
            {([0.5, 0.65, 0.75, 0.85, 1] as const).map((z) => (
              <button
                key={z}
                type="button"
                onClick={() => setZoom(z)}
                className={`px-2 py-0.5 rounded-md text-[11px] font-medium tabular-nums cursor-pointer transition-colors ${
                  zoom === z
                    ? 'bg-[#17243D] text-white'
                    : 'text-[#5B708B] hover:text-[#17243D]'
                }`}
              >
                {Math.round(z * 100)}%
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Scrollable Canvas Area */}
      <div ref={scrollAreaRef} className="flex-1 overflow-auto py-8 px-4">
        <div
          style={{
            width: `${frameWidth * zoom}px`,
            margin: '0 auto',
          }}
          className="transition-all relative"
        >
        <div
          style={{
            width: `${frameWidth}px`,
            minHeight: `${Math.max(640, frameHeight)}px`,
            transform: `scale(${zoom})`,
            transformOrigin: 'top left',
            backgroundColor: isWideViewport ? theme.canvasBg : '#0F172A',
            color: theme.textColor,
          }}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOverRoot(true);
          }}
          onDragLeave={() => setDragOverRoot(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOverRoot(false);
            setDragState({ draggedId: null, targetId: null, position: null });

            const existingId = e.dataTransfer.getData('application/lynk-existing-block');
            const droppedType = e.dataTransfer.getData('application/lynk-block-type') as BlockType;
            const sectionId = e.dataTransfer.getData('application/lynk-section-id');

            if (existingId && blocks.length > 0) {
              const lastId = blocks[blocks.length - 1].id;
              if (existingId !== lastId) {
                onReorderBlock(existingId, lastId, 'after');
              }
            } else if (droppedType) {
              onDropNewBlock(droppedType);
            } else if (sectionId) {
              onDropSection(sectionId);
            }
          }}
          className={`shadow-xl transition-all shrink-0 overflow-hidden ${
            isWideViewport
              ? 'rounded-2xl border border-[#DCE5EF] bg-white'
              : 'rounded-[36px] bg-[#17243D] p-[7px] border border-[#223456]'
          } ${dragOverRoot ? 'ring-4 ring-[#00C98A]/40' : ''}`}
        >
          {/* Device Header: Desktop/Wide Browser Bar or Sleek Smartphone Bezel */}
          {isWideViewport ? (
            <div className="h-9 px-4 bg-[#F0F5FA] border-b border-[#DCE5EF] flex items-center justify-between gap-3">
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#00C98A]" />
              </div>
              <div className="flex-1 max-w-sm mx-auto px-3 py-1 rounded-md bg-white border border-[#DCE5EF] text-[11px] text-[#5B708B] text-center truncate font-mono">
                halaman-anda.lynk.id
              </div>
              <span className="text-[10px] font-medium text-[#8FA4BF] font-mono tabular-nums shrink-0">
                {frameWidth}×{frameHeight}
              </span>
            </div>
          ) : (
            <div className="pt-1.5 pb-2 flex items-center justify-center gap-2 bg-[#17243D]">
              <div className="w-12 h-1 rounded-full bg-[#2B3F66]" />
              <div className="w-1.5 h-1.5 rounded-full bg-[#2B3F66]" />
            </div>
          )}

          {/* Inner Page Content */}
          {(() => {
            const resolvedTopPad =
              advanceOptions.pageTopPadding ?? (blocks[0]?.style.fullBleed ? 0 : 12);
            const showNavbar = bottomNavbar.enabled && enabledNavItems.length > 0;
            const navMetrics = resolveNavbarMetrics(bottomNavbar);
            const isRoundedOrFloating = navMetrics.floating || navMetrics.borderRadius > 0;
            return (
              <div
                ref={canvasRootRef}
                style={{
                  backgroundColor: theme.canvasBg,
                  color: theme.textColor,
                  fontFamily: resolveCssFontFamily(theme.fontFamily),
                  paddingTop: `${resolvedTopPad}px`,
                  paddingBottom: showNavbar ? '0px' : isWideViewport ? '48px' : '32px',
                  minHeight: isWideViewport
                    ? `${Math.max(580, frameHeight - 36)}px`
                    : `${Math.max(600, frameHeight - 28)}px`,
                }}
                className={`flex flex-col justify-between relative ${
                  isWideViewport ? '' : 'rounded-[24px] overflow-hidden'
                }`}
              >
                {(() => {
                  const firstFnbBlock = blocks.find((b) => b.type === 'fnb_catalog');
                  if (!firstFnbBlock || firstFnbBlock.content.fnbFloatingCartEnabled === false) {
                    return null;
                  }
                  const fnbItems = firstFnbBlock.content.fnbItems ?? [];
                  const activeCount = fnbItems.reduce(
                    (sum, it) => sum + (fnbPreviewQtys[it.id] ?? 0),
                    0
                  );
                  const activeAmount = fnbPriceSum(
                    fnbItems.map((it) => ({ price: it.price, qty: fnbPreviewQtys[it.id] ?? 0 }))
                  );
                  const isPosPreview =
                    selectedId === firstFnbBlock.id &&
                    activeCount === 0 &&
                    fnbItems.length > 0;
                  const displayCount = activeCount > 0 ? activeCount : isPosPreview ? 1 : 0;
                  const displayAmount =
                    activeCount > 0
                      ? activeAmount
                      : isPosPreview
                      ? fnbPriceSum([{ price: fnbItems[0].price, qty: 1 }])
                      : 0;
                  if (
                    displayCount <= 0 ||
                    firstFnbBlock.content.fnbFloatingCartPosition !== 'top-floating'
                  ) {
                    return null;
                  }
                  return (
                    <FnbFloatingCartCapsule
                      count={displayCount}
                      totalAmount={displayAmount}
                      position="top-floating"
                      offsetY={firstFnbBlock.content.fnbFloatingCartOffsetY ?? 16}
                      bgColor={
                        firstFnbBlock.content.fnbFloatingCartBg ||
                        firstFnbBlock.content.fnbAccentColor ||
                        theme.accentColor
                      }
                      actionLabel={firstFnbBlock.content.fnbFloatingCartLabel || 'Lanjut'}
                      onClick={onOpenPreview}
                    />
                  );
                })()}

                <div className="flex-1 pb-6">
                  {blocks.length === 0 ? (
                    <div className={isWideViewport ? 'max-w-[680px] mx-auto px-10' : 'px-4'}>
                      <div className="my-16 py-12 px-6 rounded-2xl border-2 border-dashed border-slate-300 text-center space-y-3">
                        <div className="w-10 h-10 rounded-full bg-[#EFF7F4] text-emerald-600 mx-auto flex items-center justify-center">
                          <Plus className="w-5 h-5" />
                        </div>
                        <div className="text-sm font-semibold">Kanvas Masih Kosong</div>
                        <p className="text-xs opacity-70 leading-relaxed">
                          Pilih komponen dari panel <strong>Alat</strong> atau <strong>Blok</strong> di sebelah kiri untuk mulai menyusun halaman.
                        </p>
                      </div>
                    </div>
                  ) : (
                    blocks.map((block) => renderBlockContent(block, 0))
                  )}
                </div>

                {(() => {
                  const firstFnbBlock = blocks.find((b) => b.type === 'fnb_catalog');
                  if (!firstFnbBlock || firstFnbBlock.content.fnbFloatingCartEnabled === false) {
                    return null;
                  }
                  const pos = firstFnbBlock.content.fnbFloatingCartPosition ?? 'bottom-floating';
                  if (pos === 'top-floating') return null;
                  const fnbItems = firstFnbBlock.content.fnbItems ?? [];
                  const activeCount = fnbItems.reduce(
                    (sum, it) => sum + (fnbPreviewQtys[it.id] ?? 0),
                    0
                  );
                  const activeAmount = fnbPriceSum(
                    fnbItems.map((it) => ({ price: it.price, qty: fnbPreviewQtys[it.id] ?? 0 }))
                  );
                  const isPosPreview =
                    selectedId === firstFnbBlock.id &&
                    activeCount === 0 &&
                    fnbItems.length > 0;
                  const displayCount = activeCount > 0 ? activeCount : isPosPreview ? 1 : 0;
                  const displayAmount =
                    activeCount > 0
                      ? activeAmount
                      : isPosPreview
                      ? fnbPriceSum([{ price: fnbItems[0].price, qty: 1 }])
                      : 0;
                  if (displayCount <= 0) return null;
                  return (
                    <FnbFloatingCartCapsule
                      count={displayCount}
                      totalAmount={displayAmount}
                      position={pos}
                      offsetY={firstFnbBlock.content.fnbFloatingCartOffsetY ?? 16}
                      bgColor={
                        firstFnbBlock.content.fnbFloatingCartBg ||
                        firstFnbBlock.content.fnbAccentColor ||
                        theme.accentColor
                      }
                      actionLabel={firstFnbBlock.content.fnbFloatingCartLabel || 'Lanjut'}
                      onClick={onOpenPreview}
                    />
                  );
                })()}

                {showNavbar && (
                  <div
                    style={{ paddingBottom: `${navMetrics.bottomOffset}px` }}
                    className="sticky bottom-0 z-20 shrink-0 pointer-events-none"
                  >
                    {/* Pratinjau Modal Bottom Sheet dari Navbar */}
                    {activeEditorNavItem && (
                      <div
                        onClick={(e) => e.stopPropagation()}
                        style={{
                          backgroundColor: theme.cardBg,
                          color: theme.textColor,
                          borderColor: theme.borderColor,
                        }}
                        className="pointer-events-auto mx-1.5 mb-2 rounded-t-[20px] rounded-b-2xl border shadow-2xl overflow-hidden"
                      >
                        <div
                          className="pt-2 pb-2 px-3.5 border-b flex flex-col items-center gap-1.5"
                          style={{ borderColor: theme.borderColor }}
                        >
                          <div className="w-9 h-1 rounded-full bg-slate-300/80" />
                          <div className="w-full flex items-center justify-between gap-2">
                            <div className="min-w-0 flex items-center gap-1.5">
                              <span className="text-xs font-bold truncate">
                                {activeEditorNavItem.sheetTitle?.trim() || activeEditorNavItem.label}
                              </span>
                              <span className="px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 text-[9px] font-bold uppercase tracking-wider shrink-0">
                                Bottom Sheet
                              </span>
                            </div>
                            <button
                              type="button"
                              onClick={() => {
                                setOpenNavSheetId(null);
                                if (navIdWithSelectedChild) {
                                  onOpenNavbarSettings(activeEditorNavItem.id);
                                }
                              }}
                              title="Tutup modal sheet"
                              className="p-1 rounded-full hover:bg-slate-200/60 opacity-75 hover:opacity-100 cursor-pointer"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                        <div className="max-h-[340px] overflow-y-auto p-3 space-y-2">
                          {activeEditorNavItem.children.length > 0 ? (
                            activeEditorNavItem.children.map((child) =>
                              renderBlockContent(child, 1)
                            )
                          ) : (
                            <div className="py-5 px-3 text-center text-[11px] opacity-65 border border-dashed border-slate-300 rounded-xl">
                              Sheet <strong>{activeEditorNavItem.label}</strong> masih kosong — tambahkan elemen di panel kanan.
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Floating / Pinned Bottom Navbar */}
                    <nav
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenNavbarSettings();
                      }}
                      style={{
                        width: `${navMetrics.barWidthPercent}%`,
                        margin: '0 auto',
                        paddingTop: `${navMetrics.barPaddingY}px`,
                        paddingBottom: `${navMetrics.barPaddingY}px`,
                        borderRadius: `${navMetrics.borderRadius}px`,
                        backgroundColor: bottomNavbar.barBg,
                        color: bottomNavbar.textColor,
                        boxShadow: navMetrics.shadowCss,
                        ...(isRoundedOrFloating
                          ? { border: `1px solid ${bottomNavbar.borderColor}` }
                          : { borderTop: `1px solid ${bottomNavbar.borderColor}` }),
                      }}
                      className={`pointer-events-auto px-1.5 transition-all ${
                        inspectorMode === 'navbar'
                          ? 'ring-2 ring-emerald-500 ring-inset'
                          : 'hover:ring-1 hover:ring-emerald-400/70'
                      }`}
                    >
                      <div
                        style={{
                          gridTemplateColumns: `repeat(${enabledNavItems.length}, minmax(0, 1fr))`,
                        }}
                        className="grid items-end gap-0.5 max-w-[540px] mx-auto"
                      >
                        {enabledNavItems.map((item) => {
                          const isCenterHome =
                            bottomNavbar.centerStyle === 'elevated' &&
                            (item.action === 'scroll_top' || item.id === 'nav_home');
                          const isSheetOpen =
                            activeEditorNavItem?.id === item.id && item.action === 'sheet';
                          const iconId = resolveButtonIcon(item.icon, item.label);
                          const displayIcon = iconId === 'none' ? 'info' : iconId;

                          return (
                            <button
                              key={item.id}
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onOpenNavbarSettings(item.id);
                                if (item.action === 'scroll_top') {
                                  setOpenNavSheetId(null);
                                  scrollAreaRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
                                } else if (item.action === 'sheet') {
                                  setOpenNavSheetId((prev) =>
                                    prev === item.id ? null : item.id
                                  );
                                } else {
                                  setOpenNavSheetId(null);
                                }
                              }}
                              className="flex flex-col items-center justify-end gap-0.5 py-0.5 px-1 rounded-xl cursor-pointer transition-opacity hover:opacity-90 min-w-0"
                            >
                              {isCenterHome ? (
                                <span
                                  style={{
                                    backgroundColor: bottomNavbar.accentColor,
                                    borderColor: bottomNavbar.barBg,
                                    width: `${navMetrics.fabBoxSize}px`,
                                    height: `${navMetrics.fabBoxSize}px`,
                                    marginTop: `${navMetrics.fabMarginTop}px`,
                                  }}
                                  className="rounded-full border-4 text-white flex items-center justify-center shadow-md shrink-0"
                                >
                                  <ButtonGlyph
                                    icon={displayIcon}
                                    iconUrl={item.iconUrl}
                                    style={{
                                      width: `${navMetrics.fabIconSize}px`,
                                      height: `${navMetrics.fabIconSize}px`,
                                    }}
                                    className="shrink-0"
                                  />
                                </span>
                              ) : (
                                <span
                                  style={{
                                    ...(isSheetOpen
                                      ? { color: bottomNavbar.accentColor }
                                      : undefined),
                                    width: `${Math.max(20, navMetrics.iconSize + 6)}px`,
                                    height: `${Math.max(20, navMetrics.iconSize + 6)}px`,
                                  }}
                                  className="flex items-center justify-center shrink-0"
                                >
                                  <ButtonGlyph
                                    icon={displayIcon}
                                    iconUrl={item.iconUrl}
                                    style={{
                                      width: `${navMetrics.iconSize}px`,
                                      height: `${navMetrics.iconSize}px`,
                                    }}
                                    className="shrink-0"
                                  />
                                </span>
                              )}
                              <span
                                style={{
                                  ...(isSheetOpen || isCenterHome
                                    ? { color: bottomNavbar.accentColor }
                                    : undefined),
                                  fontSize: `${navMetrics.labelSize}px`,
                                }}
                                className={`leading-tight truncate max-w-full ${
                                  isSheetOpen || isCenterHome
                                    ? 'font-bold'
                                    : 'font-medium opacity-80'
                                }`}
                              >
                                {item.label || 'Menu'}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </nav>
                  </div>
                )}
              </div>
            );
          })()}
        </div>

        {/* Drag handle for quick horizontal responsive testing */}
        <div
          onPointerDown={handleStartResizeResponsive}
          title="Tarik kanan/kiri untuk uji lebar responsif"
          className="hidden md:flex items-center justify-center absolute -right-4 top-24 w-3 h-20 rounded-full bg-slate-300/80 hover:bg-emerald-500 transition-colors cursor-ew-resize group"
        >
          <div className="w-0.5 h-8 rounded-full bg-white/90" />
        </div>
        </div>
      </div>
    </main>
  );
}
