import React, { useEffect, useRef, useState } from 'react';
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
  Minus,
  Monitor,
  PanelBottomOpen,
  Plus,
  Shapes,
  ShoppingCart,
  Smartphone,
  Trash2,
  Undo2,
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
import { ShowcaseCardView } from './ShowcaseCardView';
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
  canUndo?: boolean;
  onUndo?: () => void;
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
  canUndo = false,
  onUndo,
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
    width: 440,
    height: 844,
  });
  const [zoom, setZoom] = useState<number>(1);
  const [measuredFrameHeight, setMeasuredFrameHeight] = useState<number>(844);
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
  const [rowActiveDots, setRowActiveDots] = useState<Record<string, number>>({});
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const rowTrackRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const canvasFrameRef = useRef<HTMLDivElement>(null);
  const canvasRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = canvasFrameRef.current;
    if (!el) return;
    const syncHeight = () => {
      const nextH = Math.max(640, el.offsetHeight || viewportSize.height);
      setMeasuredFrameHeight(nextH);
    };
    syncHeight();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(syncHeight);
      ro.observe(el);
      return () => ro.disconnect();
    }
  }, [blocks, viewportSize.height, bottomNavbar.enabled]);

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
  const isWideViewport = frameWidth >= 576;

  const handleSelectPresetWidth = (mode: 'mobile-440' | 'mobile-576') => {
    if (mode === 'mobile-440') {
      setViewportSize({ width: 440, height: 844 });
    } else {
      setViewportSize({ width: 576, height: 844 });
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
    const padLeft = s.paddingLeft ?? padX;
    const padRight = s.paddingRight ?? padX;
    const marginTop = s.marginTop ?? 0;
    const isHeroBanner = block.type === 'hero_profile' && (block.content.heroVariant ?? 'compact') === 'banner';
    const isHeroCompact = block.type === 'hero_profile' && !isHeroBanner;
    const bgProps =
      isEmptyText || isCircleImage || isHeroBanner
        ? { backgroundColor: 'transparent' }
        : resolveBackgroundInlineProps(s);
    const resolvedFontFamily =
      resolveCssFontFamily(s.fontFamily) || resolveCssFontFamily(theme.fontFamily);
    const resolvedRadius = isHeroCompact
      ? `${block.content.heroCardRadius ?? s.borderRadius}px`
      : isHeroBanner
      ? '0px'
      : s.shapePreset === 'circle' || s.shapePreset === 'pill'
      ? '9999px'
      : s.shapePreset === 'square'
      ? '0px'
      : `${s.borderRadius}px`;
    const inlineStyle: React.CSSProperties = {
      width: `${s.widthPercent}%`,
      minHeight: isEmptyText || isCircleImage ? '0px' : `${s.minHeight}px`,
      borderRadius: resolvedRadius,
      padding: isEmptyText
        ? isSelected
          ? '6px 8px'
          : '0px'
        : isHeroBanner
        ? '0px'
        : `${padTop}px ${padRight}px ${padBottom}px ${padLeft}px`,
      marginTop: isEmptyText ? '0px' : `${marginTop}px`,
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
          : shadowToCss(s.shadow, s.shadowColor, s.shadowSize),
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
          : 'w-full px-4'
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
          data-block-id={block.id}
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
              block.type === 'bottom_sheet' ||
              block.type === 'menu_icon'
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
          onMouseOver={(e) => {
            e.stopPropagation();
            if (hoveredBlockId !== block.id) {
              setHoveredBlockId(block.id);
            }
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
          className={`relative transition-all cursor-grab active:cursor-grabbing ${
            isSelected ? 'z-30' : hoveredBlockId === block.id ? 'z-20' : 'z-0'
          } ${
            s.hoverLift ? 'hover:-translate-y-0.5 hover:shadow-lg' : ''
          } ${isDraggingThis ? 'opacity-40 scale-[0.99]' : ''} ${
            isDropTarget && dragState.position === 'inside'
              ? 'ring-2 ring-dashed ring-blue-600 bg-blue-50/20'
              : isSelected
              ? depth > 0 || s.fullBleed
                ? 'ring-2 ring-inset ring-blue-600'
                : 'ring-2 ring-blue-600 ring-offset-1 ring-offset-transparent'
              : hoveredBlockId === block.id
              ? depth > 0 || s.fullBleed
                ? 'ring-1 ring-inset ring-blue-400/80'
                : 'ring-1 ring-blue-400/80'
              : ''
          }`}
        >
          {/* Drag Handle Badge — only for selected OR single innermost hovered block (no ancestor stacking) */}
          {(isSelected || hoveredBlockId === block.id) && (
            <div
              title="Tarik untuk geser posisi"
              className={`absolute ${
                depth > 0 || s.fullBleed ? 'top-1 left-1.5' : '-top-2.5 left-2'
              } z-30 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md bg-slate-900/95 text-white text-[9.5px] font-medium shadow-sm pointer-events-none max-w-[140px] truncate`}
            >
              <GripVertical className="w-2.5 h-2.5 shrink-0" />
              <span className="truncate">{block.label.trim() || BLOCK_TYPE_NAMES[block.type]}</span>
            </div>
          )}

          {primaryRemoteEditor && (
            <div
              style={{ backgroundColor: primaryRemoteEditor.color }}
              className={`absolute ${isSelected ? '-bottom-2.5' : 'top-1'} right-1.5 z-30 px-1.5 py-0.5 rounded-md text-white text-[10px] font-semibold shadow-sm pointer-events-none whitespace-nowrap`}
            >
              Sedang diedit: {primaryRemoteEditor.name}
              {remoteEditors.length > 1 ? ` +${remoteEditors.length - 1}` : ''}
            </div>
          )}

          {/* Quick Toolbar when Selected — placed cleanly inside on nested/full-bleed blocks so never clipped */}
          {isSelected && (
            <div
              onClick={(e) => e.stopPropagation()}
              onDragStart={(e) => e.stopPropagation()}
              className={`absolute ${
                depth > 0 || s.fullBleed ? 'top-1 right-1.5' : '-top-7 right-0'
              } z-40 flex items-center gap-0.5 bg-slate-900/95 text-white rounded-lg px-1 py-0.5 shadow-md`}
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

          {block.type === 'menu_icon' && (() => {
            const shape = block.content.menuIconShape ?? s.shapePreset ?? 'circle';
            const radius =
              shape === 'circle' || shape === 'pill'
                ? '9999px'
                : shape === 'square'
                ? '0px'
                : `${Math.max(0, Math.min(48, block.content.menuIconRadius ?? s.borderRadius ?? 14))}px`;
            const size = Math.max(36, Math.min(160, block.content.menuIconSize ?? 64));
            const imgSize =
              typeof block.content.menuIconImageSize === 'number' &&
              Number.isFinite(block.content.menuIconImageSize) &&
              block.content.menuIconImageSize > 0
                ? Math.max(16, Math.min(160, Math.round(block.content.menuIconImageSize)))
                : null;
            const iconWidth = shape === 'pill' ? Math.round(size * 1.45) : size;
            const fit = block.content.menuIconImageFit ?? 'cover';
            const imgSrc = (block.content.menuIconImage ?? '').trim();
            const showLabel = block.content.menuIconShowLabel !== false;
            const iconLabel = block.content.menuIconLabel ?? 'Menu Icon';
            const bgColor = block.content.menuIconBg || theme.accentColor;
            const labelColor =
              s.useThemeTextColor === false
                ? s.textColor || block.content.menuIconTextColor || resolvedTextColor
                : block.content.menuIconTextColor || resolvedTextColor;
            const labelFontSize = s.fontSize
              ? s.fontSize
              : block.content.variant === 'h1'
              ? 18
              : block.content.variant === 'h2'
              ? 15
              : 12;
            const labelFontWeight = s.fontWeightCss
              ? Number(s.fontWeightCss)
              : block.content.fontWeight === 'bold'
              ? 700
              : block.content.fontWeight === 'normal'
              ? 400
              : 600;
            const action = block.content.menuIconAction ?? 'sheet';
            const sheetPos = block.content.menuIconSheetPosition ?? 'bottom';
            const targetId = (block.content.menuIconTargetBlockId ?? '').trim();
            const sheetTitle = block.content.sheetTitle ?? 'Menu Panel';
            const childCount = (block.children ?? []).length;
            const hasSelectedChild =
              selectedId !== null && selectedId !== block.id && hasDescendantId(block, selectedId);
            const isDragInside = isDropTarget && dragState.position === 'inside';
            const isOpen =
              action === 'sheet' &&
              (Boolean(openSheets[block.id]) || hasSelectedChild || isDragInside);
            const posLabelMap: Record<string, string> = {
              bottom: 'Bawah',
              right: 'Kanan',
              left: 'Kiri',
              top: 'Atas',
            };
            const justifyClass =
              s.align === 'left'
                ? 'justify-start'
                : s.align === 'right'
                ? 'justify-end'
                : 'justify-center';

            return (
              <div>
                <div className={`flex ${justifyClass}`}>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onSelectBlock(block.id);
                      if (action === 'sheet') {
                        setOpenSheets((prev) => ({ ...prev, [block.id]: !isOpen }));
                      } else if (targetId && canvasRootRef.current) {
                        const targetEl = canvasRootRef.current.querySelector<HTMLElement>(
                          `[data-block-id="${CSS.escape(targetId)}"]`
                        );
                        if (targetEl) {
                          targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        }
                      }
                    }}
                    className="inline-flex flex-col items-center gap-1.5 cursor-pointer group/mico"
                  >
                    <span
                      style={{
                        width: `${iconWidth}px`,
                        height: `${size}px`,
                        borderRadius: radius,
                        backgroundColor: bgColor,
                      }}
                      className="flex items-center justify-center overflow-hidden shadow-md transition-transform group-hover/mico:scale-105"
                    >
                      {imgSrc && !brokenImages[`mico_${block.id}`] ? (
                        <img
                          src={imgSrc}
                          alt={iconLabel}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setBrokenImages((prev) => ({ ...prev, [`mico_${block.id}`]: true }))
                          }
                          style={{
                            objectFit: fit,
                            width: imgSize ? `${imgSize}px` : '100%',
                            height: imgSize ? `${imgSize}px` : '100%',
                          }}
                          className="block"
                        />
                      ) : (
                        <Shapes
                          style={{
                            width: `${Math.round(size * 0.44)}px`,
                            height: `${Math.round(size * 0.44)}px`,
                            color: '#FFFFFF',
                          }}
                        />
                      )}
                    </span>
                    {showLabel && iconLabel.trim() && (
                      <span
                        style={{
                          color: labelColor,
                          fontSize: `${labelFontSize}px`,
                          fontWeight: labelFontWeight,
                          lineHeight: s.lineHeight ? String(s.lineHeight) : '1.25',
                          textAlign: s.align,
                        }}
                        className="leading-tight"
                      >
                        {iconLabel}
                      </span>
                    )}
                  </button>
                </div>

                <div className="mt-1.5 text-[10px] text-slate-400 text-center select-none">
                  {action === 'sheet'
                    ? isOpen
                      ? `Sheet (${posLabelMap[sheetPos] || 'Bawah'}) terbuka · Klik ikon untuk tutup`
                      : `Sheet ${posLabelMap[sheetPos] || 'Bawah'} (${childCount} elemen) · Klik ikon untuk edit isi`
                    : targetId
                    ? 'Aksi: Menuju card tujuan · Klik ikon untuk uji lompat'
                    : 'Aksi: Menuju card lain (pilih tujuan di panel Konten)'}
                </div>

                {isOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      if (block.children && block.children.length > 0) return;
                      handleBlockDrop(e, block.id, 'inside');
                    }}
                    style={{
                      backgroundColor: theme.cardBg,
                      borderColor: theme.borderColor,
                      color: theme.textColor,
                    }}
                    className="mt-3 rounded-2xl border shadow-lg overflow-hidden"
                  >
                    <div
                      className="pt-2 pb-2 px-3.5 border-b flex items-center justify-between gap-2"
                      style={{ borderColor: theme.borderColor }}
                    >
                      <span className="text-xs font-bold truncate">
                        {sheetTitle || 'Menu Panel'} · {posLabelMap[sheetPos] || 'Bawah'}
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
                    <div className="p-3">
                      {block.children && block.children.length > 0 ? (
                        block.children.map((child) =>
                          renderBlockContent(child, depth + 1, nextInheritedTextColor)
                        )
                      ) : (
                        <div className="py-5 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-lg">
                          Panel Menu Icon kosong — tarik elemen ke sini atau tambah dari panel kanan
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
          const rowCols = Math.max(1, Math.min(20, block.content.rowColumns ?? 2));
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
                Row kosong — tambah kolom / slide lewat panel kanan atau tarik elemen ke sini
              </div>
            );
          }

          if (rowMode === 'horizontal') {
            const activeDot = rowActiveDots[block.id] ?? 0;
            return (
              <div>
                <div
                  ref={(el) => {
                    rowTrackRefs.current[block.id] = el;
                  }}
                  onScroll={(e) => {
                    const el = e.currentTarget;
                    const maxScroll = Math.max(1, el.scrollWidth - el.clientWidth);
                    const ratio = el.scrollLeft / maxScroll;
                    const nextDot = ratio < 0.33 ? 0 : ratio <= 0.67 ? 1 : 2;
                    setRowActiveDots((prev) =>
                      prev[block.id] === nextDot ? prev : { ...prev, [block.id]: nextDot }
                    );
                  }}
                  style={{
                    gap: `${rowGap}px`,
                    WebkitOverflowScrolling: 'touch',
                    scrollSnapType: 'x proximity',
                  }}
                  className="flex flex-row flex-nowrap items-stretch overflow-x-auto pt-1.5 pb-2 px-0.5 touch-pan-x no-scrollbar"
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
                {rowChildren.length > 1 && (
                  <div
                    data-row-dots="3"
                    className="flex items-center justify-center gap-1.5 pt-2"
                    aria-label="Indikator progress slide"
                  >
                    {[0, 1, 2].map((dotIdx) => {
                      const isActive = activeDot === dotIdx;
                      return (
                        <button
                          key={dotIdx}
                          type="button"
                          aria-label={`Slide posisi ${dotIdx + 1}`}
                          onClick={(e) => {
                            e.stopPropagation();
                            const track = rowTrackRefs.current[block.id];
                            if (!track) return;
                            const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
                            const targetLeft =
                              dotIdx === 0 ? 0 : dotIdx === 1 ? maxScroll / 2 : maxScroll;
                            track.scrollTo({ left: targetLeft, behavior: 'smooth' });
                            setRowActiveDots((prev) => ({ ...prev, [block.id]: dotIdx }));
                          }}
                          style={{
                            width: isActive ? '18px' : '6px',
                            height: '6px',
                            backgroundColor: isActive ? theme.accentColor : '#CBD5E1',
                          }}
                          className="rounded-full transition-all duration-200 cursor-pointer"
                        />
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          if (rowMode === 'vertical') {
            return (
              <div
                style={{
                  gap: `${rowGap}px`,
                }}
                className="flex flex-col items-stretch"
              >
                {rowChildren.map((child) => (
                  <div
                    key={child.id}
                    style={{
                      minHeight: rowColMinH > 0 ? `${rowColMinH}px` : undefined,
                    }}
                    className="w-full min-w-0 flex flex-col [&>*]:flex-1"
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
                    boxShadow: shadowToCss(s.shadow, s.shadowColor, s.shadowSize),
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

        {block.type === 'form' && (() => {
          const nameReq = block.content.formNameRequired !== false;
          const emailReq = block.content.formEmailRequired !== false;
          const chkEnabled = Boolean(block.content.formChecklistEnabled);
          const chkItems = (block.content.formChecklistItems ?? []).filter((x) => x.trim());
          const chkReq = Boolean(block.content.formChecklistRequired);
          return (
            <div className="space-y-2.5 text-left">
              <div className="font-bold text-sm">{block.content.formTitle || 'Formulir'}</div>
              <div className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white/90 text-slate-400 text-xs flex items-center justify-between gap-2">
                <span className="truncate">{block.content.namePlaceholder || 'Nama Lengkap'}</span>
                <span className={`text-[9.5px] font-semibold shrink-0 ${nameReq ? 'text-rose-500' : 'text-slate-400'}`}>
                  {nameReq ? 'Wajib *' : 'Opsional'}
                </span>
              </div>
              <div className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white/90 text-slate-400 text-xs flex items-center justify-between gap-2">
                <span className="truncate">{block.content.emailPlaceholder || 'Email / WhatsApp'}</span>
                <span className={`text-[9.5px] font-semibold shrink-0 ${emailReq ? 'text-rose-500' : 'text-slate-400'}`}>
                  {emailReq ? 'Wajib *' : 'Opsional'}
                </span>
              </div>
              {chkEnabled && chkItems.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white/75 p-2 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                    <span>{block.content.formChecklistTitle?.trim() || 'Persetujuan / Checklist'}</span>
                    <span className={`text-[9.5px] font-semibold ${chkReq ? 'text-rose-500' : 'text-slate-400'}`}>
                      {chkReq ? 'Wajib *' : 'Opsional'}
                    </span>
                  </div>
                  {chkItems.map((itemText, idx) => (
                    <div key={`fchk_${idx}`} className="flex items-start gap-1.5 text-[11px] text-slate-600">
                      <span className="w-3.5 h-3.5 mt-0.5 rounded border border-slate-300 bg-white shrink-0" />
                      <span className="leading-snug">{itemText}</span>
                    </div>
                  ))}
                </div>
              )}
              <div
                className="w-full py-2.5 px-4 rounded-lg text-white text-xs font-semibold text-center"
                style={{ backgroundColor: block.content.buttonColor ?? theme.accentColor }}
              >
                {block.content.submitLabel || 'Kirim Data'}
              </div>
            </div>
          );
        })()}

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

        {block.type === 'cart_button' && (() => {
          const itemKey = `cb_${block.id}`;
          const qty = fnbPreviewQtys[itemKey] ?? 0;
          const accent = block.content.cartAccentColor || theme.accentColor;
          const showInfo = block.content.cartShowProductInfo !== false;
          const prodName = block.content.cartProductName?.trim() || 'Produk Pilihan';
          const prodDesc = block.content.cartProductDesc?.trim() || '';
          const prodPrice = block.content.cartProductPrice?.trim() || 'Rp 0';
          const btnLabel = block.content.cartButtonLabel?.trim() || 'Tambah';
          return (
            <div className="flex items-center justify-between gap-2.5 text-left">
              {showInfo && (
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  {block.content.cartProductImage && (
                    <img
                      src={block.content.cartProductImage}
                      alt={prodName}
                      referrerPolicy="no-referrer"
                      className="w-11 h-11 rounded-lg object-cover shrink-0 border border-slate-200/70"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold leading-snug truncate">{prodName}</div>
                    {prodDesc && (
                      <div className="text-[10.5px] opacity-70 leading-snug line-clamp-2">
                        {prodDesc}
                      </div>
                    )}
                    <div
                      style={{ color: accent }}
                      className="text-xs font-extrabold tabular-nums mt-0.5"
                    >
                      {prodPrice}
                    </div>
                  </div>
                </div>
              )}

              <div
                className={`shrink-0 flex items-center ${!showInfo ? 'w-full justify-center' : ''}`}
                onClick={(e) => e.stopPropagation()}
              >
                {qty > 0 ? (
                  <div
                    style={{ borderColor: accent }}
                    className="inline-flex items-center gap-1.5 rounded-full border bg-white px-1.5 py-1 shadow-xs"
                  >
                    <button
                      type="button"
                      onClick={() =>
                        setFnbPreviewQtys((prev) => ({
                          ...prev,
                          [itemKey]: Math.max(0, (prev[itemKey] ?? 0) - 1),
                        }))
                      }
                      className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center cursor-pointer"
                      aria-label="Kurangi"
                    >
                      <Minus className="w-3 h-3" />
                    </button>
                    <span className="text-xs font-bold text-slate-900 min-w-[18px] text-center tabular-nums">
                      {qty}
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        setFnbPreviewQtys((prev) => ({
                          ...prev,
                          [itemKey]: (prev[itemKey] ?? 0) + 1,
                        }))
                      }
                      style={{ backgroundColor: accent }}
                      className="w-6 h-6 rounded-full text-white flex items-center justify-center cursor-pointer"
                      aria-label="Tambah"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() =>
                      setFnbPreviewQtys((prev) => ({
                        ...prev,
                        [itemKey]: (prev[itemKey] ?? 0) + 1,
                      }))
                    }
                    style={{ backgroundColor: accent }}
                    className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-white text-xs font-bold shadow-xs cursor-pointer hover:opacity-95 ${
                      !showInfo ? 'w-full' : ''
                    }`}
                  >
                    <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                    <span>{btnLabel}</span>
                  </button>
                )}
              </div>
            </div>
          );
        })()}

        {block.type === 'showcase_card' && (
          <ShowcaseCardView
            content={block.content}
            theme={theme}
            borderRadius={s.borderRadius}
            isEditor
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
      {/* Workspace Toolbar: Preview Mobile (440px / 576px) & Zoom Canvas */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="min-h-12 px-4 py-1.5 bg-white border-b border-[#DCE5EF] flex items-center justify-between gap-2 text-[13px] text-[#17243D] shrink-0 overflow-x-auto no-scrollbar"
      >
        <div className="flex items-center gap-1.5 shrink-0" role="group" aria-label="Preview Mobile">
          <button
            type="button"
            onClick={() => handleSelectPresetWidth('mobile-440')}
            aria-pressed={!isWideViewport}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              !isWideViewport
                ? 'bg-[#17243D] border-[#17243D] text-white'
                : 'bg-white border-[#DCE5EF] text-[#17243D] hover:bg-[#F0F5FA]'
            }`}
          >
            <Smartphone className={`w-3.5 h-3.5 ${!isWideViewport ? 'text-[#00C98A]' : 'text-[#8FA4BF]'}`} />
            <span>Mobile 440 px</span>
          </button>

          <button
            type="button"
            onClick={() => handleSelectPresetWidth('mobile-576')}
            aria-pressed={isWideViewport}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              isWideViewport
                ? 'bg-[#17243D] border-[#17243D] text-white'
                : 'bg-white border-[#DCE5EF] text-[#17243D] hover:bg-[#F0F5FA]'
            }`}
          >
            <Monitor className={`w-3.5 h-3.5 ${isWideViewport ? 'text-[#00C98A]' : 'text-[#8FA4BF]'}`} />
            <span>Mobile 576 px</span>
          </button>

          <div className="ml-3 pl-3 border-l border-[#DCE5EF] flex items-center shrink-0">
            <button
              type="button"
              data-toolbar-undo="1"
              disabled={!canUndo || !onUndo}
              onClick={() => onUndo?.()}
              title={canUndo ? 'Urungkan perubahan terakhir (Ctrl+Z)' : 'Belum ada riwayat Undo'}
              aria-label="Undo"
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold transition-colors whitespace-nowrap shrink-0 ${
                canUndo && onUndo
                  ? 'bg-white border-[#DCE5EF] text-[#17243D] hover:bg-[#F0F5FA] hover:border-[#8FA4BF] cursor-pointer'
                  : 'bg-[#F8FAFC] border-[#E2E8F0] text-[#94A3B8] cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-3.5 h-3.5" />
              <span>Undo</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0" role="group" aria-label="Zoom Canvas">
          <span className="hidden xl:inline text-[11px] text-[#8FA4BF] font-mono tabular-nums">
            {frameWidth}×{frameHeight}px
          </span>
          <div className="flex items-center gap-0.5 bg-[#F0F5FA] border border-[#DCE5EF] rounded-lg p-0.5">
            {([0.5, 0.75, 1] as const).map((z) => {
              const active = Math.abs(zoom - z) < 0.005;
              return (
                <button
                  key={z}
                  type="button"
                  aria-pressed={active}
                  onClick={() => setZoom(z)}
                  className={`px-2 py-0.5 rounded-md text-[11px] font-medium tabular-nums cursor-pointer transition-colors whitespace-nowrap ${
                    active
                      ? 'bg-[#17243D] text-white'
                      : 'text-[#5B708B] hover:text-[#17243D]'
                  }`}
                >
                  {Math.round(z * 100)}%
                </button>
              );
            })}
          </div>
          {(() => {
            const zoomPct = Math.round(zoom * 100);
            const sliderFill = Math.max(0, Math.min(100, ((zoomPct - 50) / (250 - 50)) * 100));
            return (
              <div className="flex items-center gap-1.5 bg-[#F0F5FA] border border-[#DCE5EF] rounded-lg px-2 py-1">
                <input
                  type="range"
                  min={50}
                  max={250}
                  step={5}
                  value={zoomPct}
                  aria-label="Slider Zoom Canvas (50% - 250%)"
                  onChange={(e) => {
                    const nextPct = Math.max(50, Math.min(250, Number(e.target.value)));
                    setZoom(nextPct / 100);
                  }}
                  style={{
                    background: `linear-gradient(to right, #94A3B8 0%, #94A3B8 ${sliderFill}%, #E2E8F0 ${sliderFill}%, #E2E8F0 100%)`,
                  }}
                  className="w-20 sm:w-24 cursor-pointer"
                />
                <span className="text-[10.5px] font-mono font-semibold text-[#17243D] tabular-nums w-9 text-right">
                  {zoomPct}%
                </span>
              </div>
            );
          })()}
        </div>
      </div>

      {/* Scrollable Canvas Area (Zoom scales Canvas only) */}
      <div ref={scrollAreaRef} className="flex-1 overflow-auto py-8 px-4">
        <div
          data-canvas-zoom-stage
          data-canvas-zoom={Math.round(zoom * 100)}
          style={{
            width: `${Math.round(frameWidth * zoom)}px`,
            height: `${Math.round(measuredFrameHeight * zoom)}px`,
            margin: '0 auto',
          }}
          className="relative shrink-0"
        >
        <div
          ref={canvasFrameRef}
          data-canvas-frame
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
                onMouseLeave={() => setHoveredBlockId(null)}
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
                    <div className="w-full max-w-[576px] mx-auto px-4">
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
                  const collectNested = (list: BuilderBlock[]): BuilderBlock[] => {
                    const acc: BuilderBlock[] = [];
                    list.forEach((b) => {
                      acc.push(b);
                      if (b.children?.length) acc.push(...collectNested(b.children));
                    });
                    return acc;
                  };
                  const allFlat = collectNested(blocks);
                  const firstFnbBlock = allFlat.find(
                    (b) => b.type === 'fnb_catalog' && b.content.fnbFloatingCartEnabled !== false
                  );
                  const cartBtnBlocks = allFlat.filter((b) => b.type === 'cart_button');
                  const firstCartBtn = cartBtnBlocks.find(
                    (b) => b.content.cartFloatingEnabled !== false
                  );

                  const floatSource = firstFnbBlock ?? firstCartBtn;
                  if (!floatSource) return null;

                  const pos =
                    floatSource.type === 'fnb_catalog'
                      ? floatSource.content.fnbFloatingCartPosition ?? 'bottom-floating'
                      : floatSource.content.cartFloatingPosition ?? 'bottom-floating';
                  if (pos === 'top-floating') return null;

                  const fnbItems = firstFnbBlock?.content.fnbItems ?? [];
                  const fnbCount = fnbItems.reduce(
                    (sum, it) => sum + (fnbPreviewQtys[it.id] ?? 0),
                    0
                  );
                  const cbCount = cartBtnBlocks.reduce(
                    (sum, cb) => sum + (fnbPreviewQtys[`cb_${cb.id}`] ?? 0),
                    0
                  );
                  const activeCount = fnbCount + cbCount;

                  const pricedEntries: Array<{ price: string; qty: number }> = [
                    ...fnbItems.map((it) => ({ price: it.price, qty: fnbPreviewQtys[it.id] ?? 0 })),
                    ...cartBtnBlocks.map((cb) => ({
                      price: cb.content.cartProductPrice || '0',
                      qty: fnbPreviewQtys[`cb_${cb.id}`] ?? 0,
                    })),
                  ];
                  const activeAmount = fnbPriceSum(pricedEntries);

                  const isPosPreview =
                    activeCount === 0 &&
                    ((firstFnbBlock && selectedId === firstFnbBlock.id && fnbItems.length > 0) ||
                      (firstCartBtn && selectedId === firstCartBtn.id));

                  const displayCount = activeCount > 0 ? activeCount : isPosPreview ? 1 : 0;
                  const displayAmount =
                    activeCount > 0
                      ? activeAmount
                      : isPosPreview
                      ? fnbPriceSum([
                          {
                            price:
                              floatSource.type === 'fnb_catalog'
                                ? fnbItems[0]?.price || '0'
                                : floatSource.content.cartProductPrice || '0',
                            qty: 1,
                          },
                        ])
                      : 0;
                  if (displayCount <= 0) return null;
                  return (
                    <FnbFloatingCartCapsule
                      count={displayCount}
                      totalAmount={displayAmount}
                      position={pos}
                      offsetY={
                        floatSource.type === 'fnb_catalog'
                          ? floatSource.content.fnbFloatingCartOffsetY ?? 16
                          : 16
                      }
                      bgColor={
                        floatSource.type === 'fnb_catalog'
                          ? floatSource.content.fnbFloatingCartBg ||
                            floatSource.content.fnbAccentColor ||
                            theme.accentColor
                          : floatSource.content.cartFloatingBg ||
                            floatSource.content.cartAccentColor ||
                            theme.accentColor
                      }
                      actionLabel={
                        floatSource.type === 'fnb_catalog'
                          ? floatSource.content.fnbFloatingCartLabel || 'Lanjut'
                          : floatSource.content.cartFloatingLabel || 'Lihat Keranjang'
                      }
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
