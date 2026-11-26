import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowLeftRight,
  ArrowUp,
  BookmarkPlus,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ClipboardCopy,
  ClipboardPaste,
  Copy,
  Eye,
  GripVertical,
  Home,
  ImageOff,
  Lock,
  Minus,
  Monitor,
  MousePointer2,
  Move,
  PanelBottomOpen,
  Plus,
  Redo2,
  Shapes,
  ShoppingCart,
  Smartphone,
  Tablet,
  Trash2,
  Undo2,
  X,
} from 'lucide-react';
import {
  AdvanceOptions,
  BlockType,
  BottomNavbarConfig,
  BuilderBlock,
  BuilderSubPage,
  CategoryJumpItem,
  FnbHeroSlideItem,
  FnbMenuItem,
  InteractiveBoxItem,
  PageTheme,
  ProductBoxRevealItem,
  ViewportBreakpoint,
} from '../types/builder';
import { BLOCK_TYPE_NAMES, resolveNavbarMetrics } from '../data/presets';
import { resolveBlockTextColor, shadowToCss } from '../utils/htmlExporter';
import { SOCIAL_PLATFORMS, resolveSocialMetrics } from '../utils/socialIcons';
import { resolveButtonIcon, sanitizeIconUrl } from '../utils/buttonIcons';
import { formatRupiah, resolveCartButtonMetrics } from '../utils/cartHelpers';
import { resolveCssFontFamily } from '../utils/fontHelpers';
import { buildLinearGradientCss, resolveBackgroundInlineProps } from '../utils/gradientHelpers';
import { clampDimension } from '../utils/devicePresets';
import {
  VIEWPORT_PRESET_HEIGHTS,
  VIEWPORT_PRESET_WIDTHS,
  resolveEffectiveBlockStyle,
  resolveViewportBreakpoint,
} from '../utils/responsiveStyle';
import {
  buildLineClampStyle,
  getActionBadgeLabel,
  isTopFloatingCartPosition,
  resolveProjectFloatingCartConfig,
  resolveUniversalCartMeta,
} from '../utils/universalLayerHelpers';
import { blockHasPopoutVisual, resolveImagePopoutMetrics } from '../utils/popoutHelpers';
import { ButtonGlyph } from './ButtonIcon';
import { CleanVideoEmbed } from './CleanVideoEmbed';
import {
  CategoryJumpTabs,
  FnbCatalogCard,
  FnbFloatingCartCapsule,
  HeroProfileCard,
  fnbPriceSum,
} from './DynamicBlocks';
import { CulinarySpinSlider } from './CulinarySpinSlider';
import { FloatingProductStudio } from './FloatingProductStudio';
import { InteractiveBoxShowcase } from './InteractiveBoxShowcase';
import { ProductBoxReveal } from './ProductBoxReveal';
import { MixRasaConfigurator, parseMixRasaPrice } from './MixRasaConfigurator';
import { FnbHeroSlider } from './FnbHeroSlider';
import { MapsPlaceCard } from './MapsPlaceCard';
import { PhotoCarousel } from './PhotoCarousel';
import { SocialFeedCard } from './SocialFeedCard';
import { SocialFollowerList } from './SocialFollowerList';
import { SocialGlyph } from './SocialIcon';
import { ShowcaseCardView } from './ShowcaseCardView';
import { TrainingCatalogCard } from './TrainingCatalogCard';
import { CollabPeer } from '../utils/collabClient';
import { buildSectionDReactStyle } from '../utils/blockStyleCss';
import {
  DYNAMIC_FORM_FIELD_TYPE_LABELS,
  resolveFieldRequiredRule,
} from '../utils/formValidation';
import { hydrateDefaultFormFields } from './inspector/DynamicFormBuilderEditor';
import { useUiLabel } from '../contexts/UiLabelsContext';

interface MobileCanvasProps {
  blocks: BuilderBlock[];
  pages?: BuilderSubPage[];
  activeSubPageId?: string | null;
  onSelectSubPage?: (pageId: string | null) => void;
  onAddSubPage?: () => string | null;
  theme: PageTheme;
  advanceOptions: AdvanceOptions;
  bottomNavbar: BottomNavbarConfig;
  inspectorMode: 'element' | 'navbar';
  selectedId: string | null;
  selectedSubLayerId?: string | null;
  selectedSubLayerLabel?: string | null;
  onSelectSubLayer?: (blockId: string, subLayerId: string | null) => void;
  interactionMode?: 'pointer' | 'drag';
  onChangeInteractionMode?: (mode: 'pointer' | 'drag') => void;
  canvasScrollNonce?: number;
  remotePeersByBlock?: Record<string, CollabPeer[]>;
  canUndo?: boolean;
  onUndo?: () => void;
  canRedo?: boolean;
  onRedo?: () => void;
  canPaste?: boolean;
  onCopyBlock?: (id: string) => void;
  onPasteBlock?: () => void;
  onOpenPreview: () => void;
  viewportBreakpoint?: ViewportBreakpoint;
  onViewportBreakpointChange?: (bp: ViewportBreakpoint) => void;
  onSelectBlock: (id: string | null) => void;
  onOpenNavbarSettings: (itemId?: string) => void;
  onMoveBlock: (id: string, dir: 'up' | 'down') => void;
  onDuplicateBlock: (id: string) => void;
  onSaveAsItemTemplate?: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onToggleFullBleed?: (id: string) => void;
  onDropNewBlock: (
    type: BlockType,
    targetId?: string,
    position?: 'before' | 'after' | 'inside',
    toolPreset?: 'png'
  ) => void;
  onDropSection: (
    sectionId: string,
    targetId?: string,
    position?: 'before' | 'after' | 'inside'
  ) => void;
  onDropItemTemplate?: (
    templateId: string,
    targetId?: string,
    position?: 'before' | 'after' | 'inside'
  ) => void;
  onReorderBlock: (
    draggedId: string,
    targetId: string,
    position: 'before' | 'after' | 'inside'
  ) => void;
  onDropNewBlockToCardFooter?: (cardId: string, type: BlockType, toolPreset?: 'png') => void;
  onDropSectionToCardFooter?: (sectionId: string, cardId: string) => void;
  onDropItemTemplateToCardFooter?: (templateId: string, cardId: string) => void;
  onMoveBlockToCardFooter?: (draggedId: string, cardId: string) => void;
}

export function MobileCanvas({
  blocks,
  pages = [],
  activeSubPageId = null,
  onSelectSubPage,
  theme,
  advanceOptions,
  bottomNavbar,
  inspectorMode,
  selectedId,
  selectedSubLayerId = null,
  selectedSubLayerLabel = null,
  onSelectSubLayer,
  interactionMode = 'pointer',
  onChangeInteractionMode,
  canvasScrollNonce = 0,
  remotePeersByBlock = {},
  canUndo = false,
  onUndo,
  canRedo = false,
  onRedo,
  canPaste = false,
  onCopyBlock,
  onPasteBlock,
  onOpenPreview,
  viewportBreakpoint,
  onViewportBreakpointChange,
  onSelectBlock,
  onOpenNavbarSettings,
  onMoveBlock,
  onDuplicateBlock,
  onSaveAsItemTemplate,
  onDeleteBlock,
  onToggleFullBleed,
  onDropNewBlock,
  onDropSection,
  onDropItemTemplate,
  onReorderBlock,
  onDropNewBlockToCardFooter,
  onDropSectionToCardFooter,
  onDropItemTemplateToCardFooter,
  onMoveBlockToCardFooter,
}: MobileCanvasProps) {
  const { label, isVisible } = useUiLabel();
  const activeSubPage = activeSubPageId
    ? pages.find((p) => p.id === activeSubPageId) ?? null
    : null;
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
  const [dragOverCardZone, setDragOverCardZone] = useState<{
    cardId: string;
    zone: 'body' | 'footer';
  } | null>(null);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});
  const [openToggles, setOpenToggles] = useState<Record<string, boolean>>({});
  const [openSheets, setOpenSheets] = useState<Record<string, boolean>>({});
  const [openNavSheetId, setOpenNavSheetId] = useState<string | null>(null);
  const [activeCategoryTabIds, setActiveCategoryTabIds] = useState<Record<string, string>>({});
  const [fnbPreviewQtys, setFnbPreviewQtys] = useState<Record<string, number>>({});
  const [rowActiveDots, setRowActiveDots] = useState<Record<string, number>>({});
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [isZoomMenuOpen, setIsZoomMenuOpen] = useState(false);
  const zoomMenuRef = useRef<HTMLDivElement>(null);
  const rowTrackRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const scrollAreaRef = useRef<HTMLDivElement>(null);
  const zoomStageRef = useRef<HTMLDivElement>(null);
  const canvasFrameRef = useRef<HTMLDivElement>(null);
  const canvasRootRef = useRef<HTMLDivElement>(null);
  const floatingBarRef = useRef<HTMLDivElement>(null);
  const [floatingBarWidth, setFloatingBarWidth] = useState<number>(280);
  const [selectedOverlayRect, setSelectedOverlayRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
    stageWidth: number;
  } | null>(null);
  const [hoveredOverlayRect, setHoveredOverlayRect] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
    stageWidth: number;
  } | null>(null);

  const findBlockByIdInCanvas = (
    list: BuilderBlock[] | undefined,
    targetId: string
  ): BuilderBlock | null => {
    if (!Array.isArray(list) || !targetId) return null;
    for (const item of list) {
      if (item.id === targetId) return item;
      const inChildren = findBlockByIdInCanvas(item.children, targetId);
      if (inChildren) return inChildren;
      const inSheet = findBlockByIdInCanvas(item.content?.actionSheetBlocks, targetId);
      if (inSheet) return inSheet;
      const inFooter = findBlockByIdInCanvas(item.content?.cardFooterBlocks, targetId);
      if (inFooter) return inFooter;
    }
    return null;
  };

  const navSheetAllChildren = bottomNavbar.items.flatMap((it) => it.children ?? []);
  const selectedBlockObj = selectedId
    ? findBlockByIdInCanvas(blocks, selectedId) ??
      findBlockByIdInCanvas(navSheetAllChildren, selectedId)
    : null;
  const hoveredBlockObj =
    hoveredBlockId && hoveredBlockId !== selectedId
      ? findBlockByIdInCanvas(blocks, hoveredBlockId) ??
        findBlockByIdInCanvas(navSheetAllChildren, hoveredBlockId)
      : null;

  useEffect(() => {
    if (!isZoomMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (zoomMenuRef.current && !zoomMenuRef.current.contains(e.target as Node)) {
        setIsZoomMenuOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsZoomMenuOpen(false);
    };
    document.addEventListener('mousedown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isZoomMenuOpen]);

  useEffect(() => {
    if (!selectedId || canvasScrollNonce <= 0) return;
    const container = scrollAreaRef.current;
    if (!container) return;
    const nodes = container.querySelectorAll<HTMLElement>('[data-block-id]');
    let targetEl: HTMLElement | null = null;
    for (let i = 0; i < nodes.length; i += 1) {
      if (nodes[i].getAttribute('data-block-id') === selectedId) {
        targetEl = nodes[i];
        break;
      }
    }
    if (!targetEl) return;
    const cRect = container.getBoundingClientRect();
    const tRect = targetEl.getBoundingClientRect();
    const isVisibleInView = tRect.top >= cRect.top + 12 && tRect.bottom <= cRect.bottom - 12;
    if (!isVisibleInView) {
      targetEl.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    }
  }, [selectedId, canvasScrollNonce]);

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

  // Sinkronkan highlight visual [data-canvas-sublayer-active="true"] pada kanvas untuk sub-layer aktif
  useEffect(() => {
    const root = canvasRootRef.current;
    if (!root) return;
    root.querySelectorAll<HTMLElement>('[data-canvas-sublayer-active="true"]').forEach((el) => {
      el.removeAttribute('data-canvas-sublayer-active');
    });
    if (!selectedId || !selectedSubLayerId) return;
    const blockNodes = root.querySelectorAll<HTMLElement>('[data-block-id]');
    let ownerBlockEl: HTMLElement | null = null;
    for (let i = 0; i < blockNodes.length; i += 1) {
      if (blockNodes[i].getAttribute('data-block-id') === selectedId) {
        ownerBlockEl = blockNodes[i];
        break;
      }
    }
    if (!ownerBlockEl) return;
    const subNodes = ownerBlockEl.querySelectorAll<HTMLElement>('[data-canvas-sublayer]');
    for (let i = 0; i < subNodes.length; i += 1) {
      const node = subNodes[i];
      if (
        node.getAttribute('data-canvas-sublayer') === selectedSubLayerId &&
        node.closest('[data-block-id]') === ownerBlockEl
      ) {
        node.setAttribute('data-canvas-sublayer-active', 'true');
      }
    }
  }, [selectedId, selectedSubLayerId, blocks, interactionMode]);

  // Ukur posisi objek terpilih & hovered relatif terhadap stage zoom agar floating bar selalu berada di atasnya tanpa menutupi objek/shadow/outline
  useEffect(() => {
    const findBlockDomEl = (targetId: string | null): HTMLElement | null => {
      if (!targetId) return null;
      const scope = canvasFrameRef.current;
      if (!scope) return null;
      const nodes = scope.querySelectorAll<HTMLElement>('[data-block-id]');
      for (let i = 0; i < nodes.length; i += 1) {
        if (nodes[i].getAttribute('data-block-id') === targetId) {
          return nodes[i];
        }
      }
      return null;
    };

    const measure = () => {
      const stageEl = zoomStageRef.current;
      if (!stageEl) {
        setSelectedOverlayRect(null);
        setHoveredOverlayRect(null);
        return;
      }
      const stageRect = stageEl.getBoundingClientRect();

      const selEl = findBlockDomEl(selectedId);
      if (selEl) {
        const r = selEl.getBoundingClientRect();
        setSelectedOverlayRect({
          top: r.top - stageRect.top,
          left: r.left - stageRect.left,
          width: r.width,
          height: r.height,
          stageWidth: stageRect.width,
        });
      } else {
        setSelectedOverlayRect(null);
      }

      const hovEl =
        hoveredBlockId && hoveredBlockId !== selectedId
          ? findBlockDomEl(hoveredBlockId)
          : null;
      if (hovEl) {
        const r = hovEl.getBoundingClientRect();
        setHoveredOverlayRect({
          top: r.top - stageRect.top,
          left: r.left - stageRect.left,
          width: r.width,
          height: r.height,
          stageWidth: stageRect.width,
        });
      } else {
        setHoveredOverlayRect(null);
      }
    };

    const rafId = window.requestAnimationFrame(measure);
    const frameEl = canvasFrameRef.current;
    const selEl = findBlockDomEl(selectedId);
    const ro =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(() => measure())
        : null;
    if (ro && frameEl) ro.observe(frameEl);
    if (ro && selEl) ro.observe(selEl);

    const handleScrollCapture = () => measure();
    frameEl?.addEventListener('scroll', handleScrollCapture, true);
    window.addEventListener('resize', measure);

    return () => {
      window.cancelAnimationFrame(rafId);
      ro?.disconnect();
      frameEl?.removeEventListener('scroll', handleScrollCapture, true);
      window.removeEventListener('resize', measure);
    };
  }, [
    selectedId,
    hoveredBlockId,
    blocks,
    zoom,
    viewportSize.width,
    viewportSize.height,
    measuredFrameHeight,
    activeSubPageId,
    openNavSheetId,
    openToggles,
    openSheets,
    bottomNavbar,
    selectedSubLayerLabel,
  ]);

  useEffect(() => {
    const barEl = floatingBarRef.current;
    if (!barEl) return;
    const syncBarWidth = () => {
      const w = barEl.offsetWidth;
      if (w > 0) setFloatingBarWidth(w);
    };
    syncBarWidth();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(syncBarWidth);
      ro.observe(barEl);
      return () => ro.disconnect();
    }
  }, [selectedId, selectedSubLayerLabel, blocks, interactionMode]);

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
    if (node.children?.some((ch) => ch.id === targetId || hasDescendantId(ch, targetId))) {
      return true;
    }
    if (
      node.content?.cardFooterBlocks?.some(
        (ch) => ch.id === targetId || hasDescendantId(ch, targetId)
      )
    ) {
      return true;
    }
    if (
      node.content?.actionSheetBlocks?.some(
        (ch) => ch.id === targetId || hasDescendantId(ch, targetId)
      )
    ) {
      return true;
    }
    return false;
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
  const activeBreakpoint = resolveViewportBreakpoint(frameWidth);
  const isWideViewport = frameWidth >= 576;

  useEffect(() => {
    if (!viewportBreakpoint) return;
    if (resolveViewportBreakpoint(viewportSize.width) === viewportBreakpoint) return;
    setViewportSize({
      width: VIEWPORT_PRESET_WIDTHS[viewportBreakpoint],
      height: VIEWPORT_PRESET_HEIGHTS[viewportBreakpoint],
    });
  }, [viewportBreakpoint]);

  const handleSelectPresetWidth = (mode: ViewportBreakpoint) => {
    setViewportSize({
      width: VIEWPORT_PRESET_WIDTHS[mode],
      height: VIEWPORT_PRESET_HEIGHTS[mode],
    });
    onViewportBreakpointChange?.(mode);
  };

  const handleStartResizeResponsive = (e: React.PointerEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    const startX = e.clientX;
    const startW = viewportSize.width;
    const startH = viewportSize.height;
    const onMove = (ev: PointerEvent) => {
      const dx = (ev.clientX - startX) / zoom;
      const nextW = clampDimension(startW + dx * 2, 320, 1280);
      setViewportSize({ width: nextW, height: startH });
      onViewportBreakpointChange?.(resolveViewportBreakpoint(nextW));
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
    const s = resolveEffectiveBlockStyle(block.style, activeBreakpoint);
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
    const sectionDStyle = buildSectionDReactStyle(s);
    const hasPopoutOverflow = blockHasPopoutVisual(block);
    const inlineStyle: React.CSSProperties = {
      ...sectionDStyle,
      width: `${s.widthPercent}%`,
      minHeight: isEmptyText || isCircleImage ? '0px' : `${s.minHeight}px`,
      maxHeight: !isEmptyText && !isCircleImage && s.maxHeight && s.maxHeight > 0 ? `${s.maxHeight}px` : sectionDStyle.maxHeight,
      overflow:
        hasPopoutOverflow
          ? 'visible'
          : !isEmptyText && !isCircleImage && s.maxHeight && s.maxHeight > 0
          ? 'hidden'
          : sectionDStyle.overflow,
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
      ...(sectionDStyle.backgroundImage
        ? {
            backgroundImage: sectionDStyle.backgroundImage,
            backgroundPosition: sectionDStyle.backgroundPosition,
            backgroundSize: sectionDStyle.backgroundSize,
            backgroundRepeat: sectionDStyle.backgroundRepeat,
          }
        : {}),
      color: resolvedTextColor,
      fontFamily: resolvedFontFamily,
      fontSize: s.fontSize ? `${s.fontSize}px` : undefined,
      fontWeight: s.fontWeightCss ? Number(s.fontWeightCss) : undefined,
      lineHeight: s.lineHeight ? String(s.lineHeight) : undefined,
      letterSpacing: s.letterSpacing ? `${s.letterSpacing}px` : undefined,
      borderWidth: isEmptyText || isCircleImage || isHeroBanner ? '0px' : `${s.borderWidth}px`,
      borderStyle:
        !isEmptyText && !isCircleImage && !isHeroBanner && s.borderWidth > 0
          ? s.borderStyle || 'solid'
          : 'none',
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
      const blockPreset = e.dataTransfer.getData('application/lynk-block-preset') as 'png' | '';
      const sectionId = e.dataTransfer.getData('application/lynk-section-id');
      const itemTemplateId = e.dataTransfer.getData('application/lynk-item-template-id');

      if (existingId && existingId !== targetId) {
        onReorderBlock(existingId, targetId, pos);
      } else if (newBlockType) {
        onDropNewBlock(newBlockType, targetId, pos, blockPreset === 'png' ? 'png' : undefined);
      } else if (sectionId) {
        onDropSection(sectionId, targetId, pos);
      } else if (itemTemplateId) {
        onDropItemTemplate?.(itemTemplateId, targetId, pos);
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
          draggable={
            interactionMode === 'drag' &&
            !s.locked &&
            block.type !== 'fnb_hero_slider' &&
            block.type !== 'culinary_spin_slider' &&
            block.type !== 'floating_product_studio' &&
            block.type !== 'interactive_box_showcase' &&
            block.type !== 'product_box_reveal' &&
            block.type !== 'mix_rasa'
          }
          onDragStart={(e) => {
            if (
              interactionMode !== 'drag' ||
              s.locked ||
              block.type === 'fnb_hero_slider' ||
              block.type === 'culinary_spin_slider' ||
              block.type === 'floating_product_studio' ||
              block.type === 'interactive_box_showcase' ||
              block.type === 'product_box_reveal' ||
              block.type === 'mix_rasa'
            ) {
              e.preventDefault();
              return;
            }
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
              block.type === 'menu_icon' ||
              block.type === 'showcase_card' ||
              block.type === 'hero_profile'
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
            setDragOverCardZone(null);
            handleBlockDrop(e, block.id, pos);
          }}
          onDragEnd={() => {
            setDragState({ draggedId: null, targetId: null, position: null });
            setDragOverRoot(false);
            setDragOverCardZone(null);
          }}
          onMouseOver={(e) => {
            e.stopPropagation();
            if (hoveredBlockId !== block.id) {
              setHoveredBlockId(block.id);
            }
          }}
          onClick={(e) => {
            e.stopPropagation();
            if (interactionMode === 'pointer' && onSelectSubLayer) {
              const targetEl = e.target as HTMLElement | null;
              const subEl = targetEl?.closest<HTMLElement>('[data-canvas-sublayer]');
              if (subEl) {
                const ownerBlock = subEl.closest<HTMLElement>('[data-block-id]');
                const subId = subEl.getAttribute('data-canvas-sublayer');
                if (ownerBlock?.getAttribute('data-block-id') === block.id && subId) {
                  onSelectSubLayer(block.id, subId);
                  return;
                }
              }
            }
            onSelectBlock(block.id);
          }}
          style={{
            ...inlineStyle,
            outline:
              isDropTarget && dragState.position === 'inside'
                ? '2px dashed #2563EB'
                : isSelected
                ? '2px solid #2563EB'
                : hoveredBlockId === block.id
                ? '1.5px solid rgba(59, 130, 246, 0.7)'
                : primaryRemoteEditor
                ? `2px dashed ${primaryRemoteEditor.color}`
                : inlineStyle.outline,
            outlineOffset:
              isDropTarget && dragState.position === 'inside'
                ? '5px'
                : isSelected
                ? s.fullBleed
                  ? '2px'
                  : '6px'
                : hoveredBlockId === block.id
                ? s.fullBleed
                  ? '1px'
                  : '5px'
                : primaryRemoteEditor
                ? '5px'
                : undefined,
          }}
          className={`relative transition-all ${
            interactionMode === 'drag'
              ? s.locked
                ? 'cursor-not-allowed'
                : 'cursor-grab active:cursor-grabbing'
              : 'cursor-pointer'
          } ${
            isSelected ? 'z-30' : hoveredBlockId === block.id ? 'z-20' : 'z-0'
          } ${
            s.hoverLift ? 'hover:-translate-y-0.5 hover:shadow-lg' : ''
          } ${isDraggingThis ? 'opacity-40 scale-[0.99]' : ''} ${
            isDropTarget && dragState.position === 'inside' ? 'bg-blue-50/20' : ''
          }`}
        >
          {primaryRemoteEditor && !isSelected && (
            <div
              style={{ backgroundColor: primaryRemoteEditor.color }}
              className="absolute -top-7 right-0 z-30 px-1.5 py-0.5 rounded-md text-white text-[10px] font-semibold shadow-sm pointer-events-none whitespace-nowrap"
            >
              Sedang diedit: {primaryRemoteEditor.name}
              {remoteEditors.length > 1 ? ` +${remoteEditors.length - 1}` : ''}
            </div>
          )}

          {block.type === 'container' && (() => {
            const layoutMode = block.content.containerLayoutMode || 'normal';
            const isHSlider = layoutMode === 'slider_horizontal';
            const isVSlider = layoutMode === 'slider_vertical';
            const isSlider = isHSlider || isVSlider;
            const visibleItems = Math.max(1, Math.min(6, Number(block.content.sliderVisibleItems || 1)));
            const sliderGap = Math.max(0, Math.min(48, Number(block.content.sliderGap ?? 12)));
            const children = block.children ?? [];
            const showArrows = block.content.sliderShowArrows !== false;
            const showDots = block.content.sliderShowDots !== false;
            const sliderDotsPosition = block.content.sliderDotsPosition ?? 'below';
            const dotCount = Math.min(children.length, 6);

            return (
              <div
                data-jump-title={block.label?.trim().toLowerCase() || undefined}
                data-container-mode={layoutMode}
                onDragOver={(e) => {
                  e.preventDefault();
                }}
                onDrop={(e) => {
                  if (children.length > 0) return;
                  handleBlockDrop(e, block.id, 'inside');
                }}
                className="relative"
              >
                {isSlider && (
                  <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-md px-2 py-0.5 select-none">
                    <span>
                      {isHSlider ? 'Slider Horizontal' : 'Slider Vertikal'} ({children.length} item · tampil {visibleItems})
                    </span>
                    {showArrows && (
                      <span className="inline-flex items-center gap-0.5 text-slate-500">
                        <ChevronLeft className="w-3 h-3" />
                        <ChevronRight className="w-3 h-3" />
                      </span>
                    )}
                  </div>
                )}

                {children.length > 0 ? (
                  isHSlider ? (
                    <div
                      className={`flex flex-row overflow-x-auto ${
                        block.content.sliderShowScrollbar ? 'pb-1.5' : 'pb-0.5 no-scrollbar'
                      }`}
                      style={{
                        gap: `${sliderGap}px`,
                        scrollSnapType: block.content.sliderSnap !== false ? 'x mandatory' : undefined,
                      }}
                    >
                      {children.map((child) => (
                        <div
                          key={child.id}
                          style={{
                            flex: `0 0 calc((100% - ${Math.max(0, visibleItems - 1) * sliderGap}px) / ${visibleItems})`,
                            scrollSnapAlign: block.content.sliderSnap !== false ? 'start' : undefined,
                            minWidth: 0,
                          }}
                        >
                          {renderBlockContent(child, depth + 1, nextInheritedTextColor)}
                        </div>
                      ))}
                    </div>
                  ) : isVSlider ? (
                    <div
                      className={`flex flex-col overflow-y-auto ${
                        block.content.sliderShowScrollbar ? 'pr-1' : 'no-scrollbar'
                      }`}
                      style={{
                        gap: `${sliderGap}px`,
                        maxHeight: `${Math.max(220, s.maxHeight || 340)}px`,
                        scrollSnapType: block.content.sliderSnap !== false ? 'y mandatory' : undefined,
                      }}
                    >
                      {children.map((child) => (
                        <div
                          key={child.id}
                          style={{
                            flexShrink: 0,
                            scrollSnapAlign: block.content.sliderSnap !== false ? 'start' : undefined,
                          }}
                        >
                          {renderBlockContent(child, depth + 1, nextInheritedTextColor)}
                        </div>
                      ))}
                    </div>
                  ) : (
                    children.map((child) =>
                      renderBlockContent(child, depth + 1, nextInheritedTextColor)
                    )
                  )
                ) : (
                  <div className="py-5 text-center text-xs text-slate-400 border border-dashed border-slate-300 rounded-lg">
                    Wadah kosong — tarik &amp; lepas komponen ke sini
                  </div>
                )}

                {isSlider && showDots && dotCount > 1 && (
                  <div
                    className={
                      sliderDotsPosition === 'overlay'
                        ? 'absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/50 backdrop-blur-xs shadow-sm'
                        : 'mt-2 flex items-center justify-center gap-1.5'
                    }
                  >
                    {Array.from({ length: dotCount }).map((_, idx) => (
                      <span
                        key={idx}
                        style={{
                          backgroundColor:
                            idx === 0
                              ? theme.accentColor
                              : sliderDotsPosition === 'overlay'
                              ? 'rgba(255, 255, 255, 0.58)'
                              : '#CBD5E1',
                        }}
                        className={`rounded-full ${idx === 0 ? 'w-4 h-1.5' : 'w-1.5 h-1.5'}`}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          })()}

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
                  data-canvas-sublayer="toggle_trigger"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (interactionMode === 'pointer' && onSelectSubLayer) {
                      onSelectSubLayer(block.id, 'toggle_trigger');
                    } else {
                      onSelectBlock(block.id);
                    }
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
                      data-canvas-sublayer="sheet_trigger"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (interactionMode === 'pointer' && onSelectSubLayer) {
                          onSelectSubLayer(block.id, 'sheet_trigger');
                        } else {
                          onSelectBlock(block.id);
                        }
                        setOpenSheets((prev) => ({ ...prev, [block.id]: !isOpen }));
                      }}
                      className="inline-flex flex-col items-center gap-1.5 cursor-pointer group/trig rounded-xl"
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
                      data-canvas-sublayer="sheet_trigger"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (interactionMode === 'pointer' && onSelectSubLayer) {
                          onSelectSubLayer(block.id, 'sheet_trigger');
                        } else {
                          onSelectBlock(block.id);
                        }
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
                      data-canvas-sublayer="sheet_trigger"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (interactionMode === 'pointer' && onSelectSubLayer) {
                          onSelectSubLayer(block.id, 'sheet_trigger');
                        } else {
                          onSelectBlock(block.id);
                        }
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
                    <div
                      data-canvas-sublayer="sheet_header"
                      className="pt-2 pb-2 px-3.5 border-b flex flex-col items-center gap-1.5"
                      style={{ borderColor: theme.borderColor }}
                    >
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
                      const hitSub =
                        interactionMode === 'pointer' && onSelectSubLayer
                          ? (e.target as HTMLElement | null)
                              ?.closest<HTMLElement>('[data-canvas-sublayer]')
                              ?.getAttribute('data-canvas-sublayer') ?? null
                          : null;
                      if (hitSub && onSelectSubLayer) {
                        onSelectSubLayer(block.id, hitSub);
                      } else {
                        onSelectBlock(block.id);
                      }
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
                      data-canvas-sublayer="menu_icon_visual"
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
                            transform:
                              typeof block.content.menuIconImageZoom === 'number' &&
                              Number.isFinite(block.content.menuIconImageZoom) &&
                              block.content.menuIconImageZoom !== 100
                                ? `scale(${Math.max(50, Math.min(250, block.content.menuIconImageZoom)) / 100})`
                                : undefined,
                            transformOrigin: 'center center',
                            transition: 'transform 160ms ease',
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
                        data-canvas-sublayer="menu_icon_label"
                        style={{
                          color: labelColor,
                          fontSize: `${labelFontSize}px`,
                          fontWeight: labelFontWeight,
                          lineHeight: s.lineHeight ? String(s.lineHeight) : '1.25',
                          textAlign: s.align,
                        }}
                        className="leading-tight rounded px-0.5"
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
            const showScrollbar = Boolean(block.content.rowShowScrollbar);
            const showDots = block.content.rowShowDots !== false;
            const rowDotsPosition = block.content.rowDotsPosition ?? 'below';
            const hasPopoutChild = rowChildren.some(blockHasPopoutVisual);
            return (
              <div className="relative">
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
                  className={`flex flex-row flex-nowrap items-stretch overflow-x-auto touch-pan-x ${
                    hasPopoutChild
                      ? `pt-3 pr-5 pl-1 ${showScrollbar ? 'pb-6' : 'pb-5 no-scrollbar'}`
                      : `pt-1 px-0.5 ${showScrollbar ? 'pb-2' : 'pb-1 no-scrollbar'}`
                  }`}
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
                        overflow: hasPopoutChild ? 'visible' : undefined,
                      }}
                      className="flex flex-col [&>*]:flex-1"
                    >
                      {renderBlockContent(child, depth + 1, nextInheritedTextColor)}
                    </div>
                  ))}
                </div>
                {showDots && rowChildren.length > 1 && (
                  <div
                    data-row-dots="3"
                    className={
                      rowDotsPosition === 'overlay'
                        ? 'absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/50 backdrop-blur-xs shadow-sm'
                        : 'flex items-center justify-center gap-1.5 pt-2'
                    }
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
                            backgroundColor: isActive
                              ? theme.accentColor
                              : rowDotsPosition === 'overlay'
                              ? 'rgba(255, 255, 255, 0.58)'
                              : '#CBD5E1',
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

          const rowGridRows =
            typeof block.content.rowGridRows === 'number' && block.content.rowGridRows > 0
              ? Math.max(1, Math.min(10, Math.round(block.content.rowGridRows)))
              : 0;
          return (
            <div
              style={{
                display: 'grid',
                gridTemplateColumns: `repeat(${rowCols}, minmax(0, 1fr))`,
                gridTemplateRows:
                  rowGridRows > 0
                    ? `repeat(${rowGridRows}, minmax(${rowColMinH > 0 ? `${rowColMinH}px` : 'auto'}, 1fr))`
                    : undefined,
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
                fontStyle: s.fontStyle,
                lineHeight: s.lineHeight ? String(s.lineHeight) : undefined,
                letterSpacing: s.letterSpacing ? `${s.letterSpacing}px` : undefined,
                ...buildLineClampStyle(s.maxLines),
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
              {s.paragraphGap && s.paragraphGap > 0 && (block.content.text ?? '').includes('\n') ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: `${s.paragraphGap}px` }}>
                  {(block.content.text ?? '').split('\n').map((line, i) => (
                    <span key={i}>{line || '\u00A0'}</span>
                  ))}
                </div>
              ) : (
                block.content.text
              )}
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
                        objectPosition: block.content.objectPosition || 'center',
                        transform: `scale(${imageZoom / 100})`,
                        transformOrigin: 'center center',
                      }}
                    />
                  )}
                </div>
              </div>
            );
          })() : (() => {
            const rectZoom = Math.max(40, Math.min(250, block.content.imageZoom ?? 100));
            const isPngOrPopout = Boolean(
              block.content.imagePngMode ||
                block.content.imagePopoutEnabled ||
                block.content.imageDropShadowEnabled ||
                block.content.imageHoverFloat3D
            );
            if (isPngOrPopout) {
              const pop = resolveImagePopoutMetrics(block.content);
              return (
                <div
                  className={`w-full h-full flex items-center justify-center lynk-png-float-wrap${
                    pop.hoverFloat3D ? ' has-float-3d' : ''
                  }`}
                  style={{
                    overflow: pop.enabled ? 'visible' : 'hidden',
                    borderRadius: pop.enabled ? undefined : `${s.borderRadius}px`,
                    aspectRatio:
                      block.content.aspectRatio && block.content.aspectRatio !== 'auto'
                        ? block.content.aspectRatio
                        : undefined,
                    backgroundColor: 'transparent',
                  }}
                >
                  {!block.content.src || brokenImages[block.id] ? (
                    <div className="flex flex-col items-center justify-center gap-1.5 py-6 px-4 text-slate-400 text-xs rounded-xl border border-dashed border-slate-300 bg-slate-50/70">
                      <ImageOff className="w-5 h-5" />
                      <span>{block.content.alt || 'Gambar PNG belum dimuat'}</span>
                    </div>
                  ) : (
                    <img
                      src={block.content.src}
                      alt={block.content.alt || 'Gambar PNG'}
                      referrerPolicy="no-referrer"
                      onError={() => setBrokenImages((prev) => ({ ...prev, [block.id]: true }))}
                      className="w-full h-full block lynk-png-float-img"
                      style={
                        {
                          objectFit: block.content.objectFit ?? 'contain',
                          objectPosition: block.content.objectPosition || 'center',
                          borderRadius: pop.enabled ? undefined : `${s.borderRadius}px`,
                          '--png-x': `${pop.offsetX}px`,
                          '--png-y': `${pop.offsetY}px`,
                          '--png-rot': `${pop.rotate}deg`,
                          '--png-scale': String(pop.scale),
                          '--png-shadow': pop.dropShadowCss,
                          '--png-shadow-hover': pop.hoverDropShadowCss,
                        } as React.CSSProperties
                      }
                    />
                  )}
                </div>
              );
            }
            return (
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
                      objectPosition: block.content.objectPosition || 'center',
                      borderRadius: `${s.borderRadius}px`,
                      transform: rectZoom !== 100 ? `scale(${rectZoom / 100})` : undefined,
                      transformOrigin: 'center center',
                    }}
                  />
                )}
              </div>
            );
          })())}

        {block.type === 'button' && (() => {
          const btnLabel = block.content.label || 'Tombol Link';
          const leftIcon = resolveButtonIcon(block.content.buttonIcon, btnLabel);
          const btnGrad = buildLinearGradientCss(s);
          const hiddenSubs = new Set(block.content.hiddenSubLayers ?? []);
          const deletedSubs = new Set(block.content.deletedSubLayers ?? []);
          const showIconLayer =
            !block.content.buttonHideIcon &&
            !hiddenSubs.has('button_icon') &&
            !deletedSubs.has('button_icon') &&
            (leftIcon !== 'none' || Boolean(sanitizeIconUrl(block.content.buttonIconUrl)));
          const showTextLayer =
            !block.content.buttonHideText &&
            !hiddenSubs.has('button_text') &&
            !deletedSubs.has('button_text');

          const activeStateKey = block.content.buttonDisabled
            ? 'disabled'
            : block.content.buttonVisualState || 'normal';
          const statePatch = block.content.buttonStateStyles?.[activeStateKey];
          const iconSubStyle = block.content.buttonIconStyle ?? block.content.subLayerStyles?.button_icon;
          const textSubStyle = block.content.buttonTextStyle ?? block.content.subLayerStyles?.button_text;
          const iconPx = Math.max(10, Math.min(48, block.content.buttonIconSize ?? 16));
          const resolvedBtnBg =
            statePatch?.bg ||
            (btnGrad ? s.gradientColor1 || '#EA580C' : block.content.buttonBg ?? theme.accentColor);
          const resolvedBtnText =
            statePatch?.textColor || textSubStyle?.textColor || block.content.buttonText || '#FFFFFF';
          const resolvedIconColor =
            block.content.buttonIconColor || iconSubStyle?.textColor || resolvedBtnText;
          const isIconSelected = isSelected && selectedSubLayerId === 'button_icon';
          const isTextSelected = isSelected && selectedSubLayerId === 'button_text';

          return (
            <div
              title={block.content.buttonTooltip || undefined}
              className={`w-full py-3 px-4 font-semibold text-sm flex items-center justify-center gap-2 transition-all ${
                block.content.buttonDisabled ? 'opacity-55 cursor-not-allowed' : ''
              }`}
              style={{
                backgroundColor: resolvedBtnBg,
                backgroundImage: statePatch?.bg ? undefined : btnGrad || undefined,
                color: resolvedBtnText,
                borderRadius: `${s.borderRadius}px`,
                borderColor: statePatch?.borderColor || undefined,
                borderWidth: statePatch?.borderColor ? '1px' : undefined,
                borderStyle: statePatch?.borderColor ? 'solid' : undefined,
                opacity:
                  typeof statePatch?.opacity === 'number'
                    ? statePatch.opacity / 100
                    : undefined,
                transform:
                  typeof statePatch?.scale === 'number' && statePatch.scale !== 100
                    ? `scale(${statePatch.scale / 100})`
                    : undefined,
                justifyContent:
                  s.align === 'left'
                    ? 'flex-start'
                    : s.align === 'right'
                    ? 'flex-end'
                    : 'center',
              }}
            >
              {showIconLayer && (
                <span
                  data-canvas-sublayer="button_icon"
                  data-button-sublayer="button_icon"
                  title={block.content.buttonIconTooltip || undefined}
                  style={{
                    color: resolvedIconColor,
                    backgroundColor:
                      iconSubStyle?.backgroundColor && iconSubStyle.backgroundColor !== 'transparent'
                        ? iconSubStyle.backgroundColor
                        : undefined,
                    borderRadius:
                      typeof iconSubStyle?.borderRadius === 'number'
                        ? `${iconSubStyle.borderRadius}px`
                        : undefined,
                    padding:
                      typeof iconSubStyle?.padding === 'number' && iconSubStyle.padding > 0
                        ? `${iconSubStyle.padding}px`
                        : undefined,
                    opacity:
                      typeof iconSubStyle?.opacity === 'number'
                        ? iconSubStyle.opacity / 100
                        : undefined,
                    transform:
                      typeof iconSubStyle?.transformRotate === 'number' && iconSubStyle.transformRotate !== 0
                        ? `rotate(${iconSubStyle.transformRotate}deg)`
                        : undefined,
                  }}
                  className={`inline-flex items-center justify-center shrink-0 transition-all ${
                    isIconSelected ? 'outline-2 outline-[#00C98A] outline-offset-2 rounded' : ''
                  }`}
                >
                  <ButtonGlyph
                    icon={leftIcon}
                    iconUrl={block.content.buttonIconUrl}
                    strokeWidth={block.content.buttonIconStrokeWidth ?? 2}
                    className="shrink-0"
                    style={{ width: `${iconPx}px`, height: `${iconPx}px`, color: resolvedIconColor }}
                  />
                </span>
              )}
              {showTextLayer && (
                <span
                  data-canvas-sublayer="button_text"
                  data-button-sublayer="button_text"
                  style={{
                    color: resolvedBtnText,
                    fontFamily: textSubStyle?.fontFamily
                      ? resolveCssFontFamily(textSubStyle.fontFamily)
                      : resolvedFontFamily,
                    fontSize: textSubStyle?.fontSize
                      ? `${textSubStyle.fontSize}px`
                      : s.fontSize
                      ? `${s.fontSize}px`
                      : undefined,
                    fontWeight: textSubStyle?.fontWeightCss
                      ? Number(textSubStyle.fontWeightCss)
                      : s.fontWeightCss
                      ? Number(s.fontWeightCss)
                      : undefined,
                    fontStyle: textSubStyle?.fontStyle ?? s.fontStyle,
                    lineHeight: textSubStyle?.lineHeight
                      ? String(textSubStyle.lineHeight)
                      : s.lineHeight
                      ? String(s.lineHeight)
                      : undefined,
                    letterSpacing:
                      typeof textSubStyle?.letterSpacing === 'number'
                        ? `${textSubStyle.letterSpacing}px`
                        : typeof s.letterSpacing === 'number' && s.letterSpacing !== 0
                        ? `${s.letterSpacing}px`
                        : undefined,
                    textTransform: textSubStyle?.textTransform ?? s.textTransform,
                    textDecoration: textSubStyle?.textDecoration ?? s.textDecoration,
                    opacity:
                      typeof textSubStyle?.opacity === 'number'
                        ? textSubStyle.opacity / 100
                        : undefined,
                  }}
                  className={`truncate transition-all ${
                    isTextSelected ? 'outline-2 outline-[#00C98A] outline-offset-2 rounded px-0.5' : ''
                  }`}
                >
                  {btnLabel}
                </span>
              )}
            </div>
          );
        })()}

        {block.type === 'form' && (() => {
          const dynFields = hydrateDefaultFormFields(block);
          const chkEnabled = Boolean(block.content.formChecklistEnabled);
          const chkItems = (block.content.formChecklistItems ?? []).filter((x) => x.trim());
          const chkRule =
            block.content.formChecklistRule ||
            (block.content.formChecklistRequired ? 'required_consent_all' : 'optional');
          return (
            <div className="space-y-2.5 text-left">
              <div
                data-canvas-sublayer="form_header"
                className="flex items-center justify-between gap-2 rounded-md"
              >
                <div className="font-bold text-sm">{block.content.formTitle || 'Formulir'}</div>
                {block.content.formWhatsappEnabled && (
                  <span className="text-[9.5px] font-semibold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                    Terhubung WA
                  </span>
                )}
              </div>
              {dynFields.map((fld, fldIdx) => {
                const rule = resolveFieldRequiredRule(fld);
                if (fld.type === 'section') {
                  return (
                    <div
                      key={fld.id}
                      data-canvas-sublayer={`form_field_${fld.id || fldIdx}`}
                      className="pt-1.5 border-t border-slate-200 rounded"
                    >
                      <div className="text-xs font-bold text-slate-800">{fld.label}</div>
                      {fld.description && (
                        <div className="text-[11px] text-slate-500 mt-0.5">{fld.description}</div>
                      )}
                    </div>
                  );
                }
                return (
                  <div
                    key={fld.id}
                    data-canvas-sublayer={`form_field_${fld.id || fldIdx}`}
                    className="space-y-1 rounded-md"
                  >
                    <div className="flex items-center justify-between gap-1 text-[11px]">
                      <span className="font-semibold text-slate-700 truncate">
                        {fld.label || 'Kolom'}
                      </span>
                      <span
                        className={`text-[9.5px] font-semibold shrink-0 ${
                          rule !== 'optional' ? 'text-rose-500' : 'text-slate-400'
                        }`}
                      >
                        {rule !== 'optional' ? 'Wajib *' : 'Opsional'}
                      </span>
                    </div>
                    {fld.type === 'radio' || fld.type === 'checkbox_group' ? (
                      <div className="rounded-lg border border-slate-200 bg-white/85 p-2 space-y-1">
                        {(fld.options && fld.options.length > 0
                          ? fld.options
                          : ['Pilihan 1', 'Pilihan 2']
                        )
                          .slice(0, 4)
                          .map((opt, idx) => (
                            <div
                              key={idx}
                              className="flex items-center gap-1.5 text-[11px] text-slate-600"
                            >
                              <span
                                className={`w-3.5 h-3.5 border border-slate-300 bg-white shrink-0 ${
                                  fld.type === 'radio' ? 'rounded-full' : 'rounded'
                                }`}
                              />
                              <span className="truncate">{opt}</span>
                            </div>
                          ))}
                      </div>
                    ) : fld.type === 'textarea' || fld.type === 'address' ? (
                      <div className="w-full px-3 py-2.5 rounded-lg border border-slate-300 bg-white/90 text-slate-400 text-xs min-h-[54px]">
                        {fld.placeholder || DYNAMIC_FORM_FIELD_TYPE_LABELS[fld.type]}
                      </div>
                    ) : (
                      <div className="w-full px-3 py-2 rounded-lg border border-slate-300 bg-white/90 text-slate-400 text-xs flex items-center justify-between gap-2">
                        <span className="truncate">
                          {fld.placeholder || DYNAMIC_FORM_FIELD_TYPE_LABELS[fld.type]}
                        </span>
                        <span className="text-[9px] text-slate-400 shrink-0">
                          {DYNAMIC_FORM_FIELD_TYPE_LABELS[fld.type]}
                        </span>
                      </div>
                    )}
                    {fld.helpText && (
                      <div className="text-[10px] text-slate-400">{fld.helpText}</div>
                    )}
                  </div>
                );
              })}
              {chkEnabled && chkItems.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white/75 p-2 space-y-1">
                  <div className="text-[11px] font-semibold text-slate-700 flex items-center justify-between">
                    <span>{block.content.formChecklistTitle?.trim() || 'Persetujuan & Konfirmasi'}</span>
                    <span className={`text-[9.5px] font-semibold ${chkRule !== 'optional' ? 'text-rose-500' : 'text-slate-400'}`}>
                      {chkRule !== 'optional' ? 'Wajib *' : 'Opsional'}
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
                {block.content.submitLabel || 'Kirim Formulir'}
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
            videoZoom={block.content.videoZoom ?? 100}
            muted={Boolean(block.content.videoMuted)}
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
                {(block.content.catalogItems ?? []).map((item, itemIdx) => {
                  const unitSoldText = advanceOptions.showUnitSold
                    ? ` · ${item.unitSold} terjual`
                    : '';
                  const imgKey = `${block.id}_${item.id}_${item.image}`;
                  const hasImgError = brokenImages[imgKey];
                  const fit = item.imageObjectFit ?? 'cover';
                  const ratio = item.imageAspectRatio;
                  const catalogSubId = `catalog_${item.id || itemIdx}`;

                  const catalogImgZoom =
                    typeof block.content.imageZoom === 'number' &&
                    Number.isFinite(block.content.imageZoom)
                      ? Math.max(50, Math.min(250, block.content.imageZoom))
                      : 100;

                  const renderThumb = (
                    className: string,
                    fallbackRatio?: string
                  ) => {
                    const effectiveRatio =
                      ratio === 'auto' ? undefined : ratio ?? fallbackRatio;
                    const frameStyle: React.CSSProperties = {
                      aspectRatio: effectiveRatio,
                    };
                    return !item.image || hasImgError ? (
                      <div
                        style={frameStyle}
                        className={`${className} flex items-center justify-center bg-slate-100 text-slate-400`}
                      >
                        <ImageOff className="w-4 h-4" />
                      </div>
                    ) : (
                      <div
                        style={frameStyle}
                        className={`${className} overflow-hidden`}
                      >
                        <img
                          src={item.image}
                          alt={item.title}
                          referrerPolicy="no-referrer"
                          onError={() => setBrokenImages((prev) => ({ ...prev, [imgKey]: true }))}
                          style={{
                            objectFit: fit,
                            transform:
                              catalogImgZoom !== 100
                                ? `scale(${catalogImgZoom / 100})`
                                : undefined,
                            transformOrigin: 'center center',
                            transition: 'transform 160ms ease',
                          }}
                          className="w-full h-full block"
                        />
                      </div>
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
                        data-canvas-sublayer={catalogSubId}
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
                        data-canvas-sublayer={catalogSubId}
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
                        data-canvas-sublayer={catalogSubId}
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
                      data-canvas-sublayer={catalogSubId}
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
                const origIdx = allItems.indexOf(item);
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
                    data-canvas-sublayer={`soc_${item.id || (origIdx >= 0 ? origIdx : 0)}`}
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
            accentColor={theme.accentColor}
            isEditor
          />
        )}

        {block.type === 'carousel' && (
          <PhotoCarousel
            items={block.content.carouselItems ?? []}
            aspectRatio={block.content.carouselAspectRatio ?? '4/5'}
            heightPx={block.content.carouselHeightPx}
            widthPx={block.content.carouselWidthPx}
            objectFit={block.content.carouselObjectFit ?? 'cover'}
            borderRadius={s.borderRadius}
            cardBg={theme.cardBg}
            borderColor={theme.borderColor}
            textColor={resolvedTextColor}
            accentColor={theme.accentColor}
            align={s.align}
            showDots={block.content.carouselShowDots !== false}
            dotsPosition={block.content.carouselDotsPosition ?? 'below'}
            showArrows={block.content.carouselShowArrows !== false}
            showScrollbar={Boolean(block.content.carouselShowScrollbar)}
            imageZoom={block.content.imageZoom}
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
            showDots={block.content.socialFeedShowDots !== false}
            dotsPosition={block.content.socialFeedDotsPosition ?? 'below'}
            imageZoom={block.content.imageZoom}
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
            imageZoom={block.content.imageZoom}
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

        {block.type === 'hero_profile' && (() => {
          const heroChildren = block.children ?? [];
          const heroPos = block.content.heroChildrenPosition ?? 'on_cover';
          const isOnCover =
            (block.content.heroVariant ?? 'compact') === 'banner' &&
            (heroPos === 'on_cover' || heroPos === 'overlap_cover');
          const childInheritedColor = isOnCover ? '#FFFFFF' : nextInheritedTextColor;
          const showEmptyDropHint =
            heroChildren.length === 0 &&
            (Boolean(block.content.heroHideDefaultContent) ||
              (isDropTarget && dragState.position === 'inside'));
          const heroChildrenSlot =
            heroChildren.length > 0 ? (
              <div className="space-y-1.5">
                {heroChildren.map((ch) =>
                  renderBlockContent(ch, depth + 1, childInheritedColor)
                )}
              </div>
            ) : showEmptyDropHint ? (
              <div className="mx-3 rounded-lg border border-dashed border-[#00C98A] bg-[#ECFDF6]/90 px-3 py-3 text-center text-[11px] font-medium text-[#008F63]">
                Lepas komponen di sini (Lapisan 2 di atas Cover) atau tambah lewat Data &amp; Daftar Item
              </div>
            ) : undefined;
          return (
            <HeroProfileCard
              block={block}
              theme={theme}
              resolvedTextColor={resolvedTextColor}
              childrenSlot={heroChildrenSlot}
            />
          );
        })()}

        {block.type === 'category_tabs' && (
          <CategoryJumpTabs
            block={block}
            theme={theme}
            activeId={activeCategoryTabIds[block.id] ?? null}
            onSelect={(catItem: CategoryJumpItem, e) => {
              e.stopPropagation();
              if (interactionMode === 'pointer' && onSelectSubLayer) {
                const catIdx = (block.content.categoryButtons ?? []).indexOf(catItem);
                onSelectSubLayer(block.id, `cat_${catItem.id || (catIdx >= 0 ? catIdx : 0)}`);
              } else {
                onSelectBlock(block.id);
              }
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

        {block.type === 'fnb_hero_slider' && (
          <FnbHeroSlider
            blockId={block.id}
            content={block.content}
            theme={theme}
            borderRadius={s.borderRadius}
            isEditor
            cartQtyMap={fnbPreviewQtys}
            onAddCart={(item: FnbHeroSlideItem) => {
              setFnbPreviewQtys((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
            }}
            onIncCart={(item: FnbHeroSlideItem) => {
              setFnbPreviewQtys((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
            }}
            onDecCart={(item: FnbHeroSlideItem) => {
              setFnbPreviewQtys((prev) => ({
                ...prev,
                [item.id]: Math.max(0, (prev[item.id] ?? 0) - 1),
              }));
            }}
            onOpenCart={onOpenPreview}
          />
        )}

        {block.type === 'culinary_spin_slider' && (
          <CulinarySpinSlider
            blockId={block.id}
            content={block.content}
            theme={theme}
            borderRadius={s.borderRadius}
            isEditor
            cartQtyMap={fnbPreviewQtys}
            onAddCart={(item: FnbHeroSlideItem) => {
              setFnbPreviewQtys((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
            }}
            onIncCart={(item: FnbHeroSlideItem) => {
              setFnbPreviewQtys((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
            }}
            onDecCart={(item: FnbHeroSlideItem) => {
              setFnbPreviewQtys((prev) => ({
                ...prev,
                [item.id]: Math.max(0, (prev[item.id] ?? 0) - 1),
              }));
            }}
            onOpenCart={onOpenPreview}
          />
        )}

        {block.type === 'floating_product_studio' && (
          <FloatingProductStudio
            blockId={block.id}
            content={block.content}
            theme={theme}
            borderRadius={s.borderRadius}
            isEditor
            cartQtyMap={fnbPreviewQtys}
            onAddCart={(item: FnbHeroSlideItem) => {
              setFnbPreviewQtys((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
            }}
            onIncCart={(item: FnbHeroSlideItem) => {
              setFnbPreviewQtys((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
            }}
            onDecCart={(item: FnbHeroSlideItem) => {
              setFnbPreviewQtys((prev) => ({
                ...prev,
                [item.id]: Math.max(0, (prev[item.id] ?? 0) - 1),
              }));
            }}
            onOpenCart={onOpenPreview}
          />
        )}

        {block.type === 'interactive_box_showcase' && (
          <InteractiveBoxShowcase
            blockId={block.id}
            content={block.content}
            theme={theme}
            borderRadius={s.borderRadius}
            isEditor
            cartQtyMap={fnbPreviewQtys}
            onAddCart={(item: InteractiveBoxItem) => {
              setFnbPreviewQtys((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
            }}
            onOpenCart={onOpenPreview}
          />
        )}

        {block.type === 'product_box_reveal' && (
          <ProductBoxReveal
            blockId={block.id}
            content={block.content}
            theme={theme}
            borderRadius={s.borderRadius}
            isEditor
            cartQtyMap={fnbPreviewQtys}
            onAddCart={(item: ProductBoxRevealItem) => {
              setFnbPreviewQtys((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
            }}
            onIncCart={(item: ProductBoxRevealItem) => {
              setFnbPreviewQtys((prev) => ({ ...prev, [item.id]: (prev[item.id] ?? 0) + 1 }));
            }}
            onDecCart={(item: ProductBoxRevealItem) => {
              setFnbPreviewQtys((prev) => ({
                ...prev,
                [item.id]: Math.max(0, (prev[item.id] ?? 0) - 1),
              }));
            }}
            onOpenCart={onOpenPreview}
          />
        )}

        {block.type === 'mix_rasa' && (
          <MixRasaConfigurator
            blockId={block.id}
            content={block.content}
            theme={theme}
            borderRadius={s.borderRadius}
            isEditor
            onAddMixToCart={(payload) => {
              setFnbPreviewQtys((prev) => ({
                ...prev,
                [`mr_${block.id}`]: (prev[`mr_${block.id}`] ?? 0) + 1,
                [`mr_amt_${block.id}`]: (prev[`mr_amt_${block.id}`] ?? 0) + payload.unitPrice,
              }));
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
                <div
                  data-canvas-sublayer="cart_product"
                  className="flex items-center gap-2.5 min-w-0 flex-1 rounded-lg"
                >
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
                data-canvas-sublayer="cart_action"
                className={`shrink-0 flex items-center rounded-full ${!showInfo ? 'w-full justify-center' : ''}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (interactionMode === 'pointer' && onSelectSubLayer) {
                    onSelectSubLayer(block.id, 'cart_action');
                  } else {
                    onSelectBlock(block.id);
                  }
                }}
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

        {block.type === 'showcase_card' && (() => {
          const cardVariant = block.content.cardVariant ?? 'news_banner';
          const bodyChildren = block.children ?? [];
          const footerChildren = block.content.cardFooterBlocks ?? [];
          const isDragOverBody =
            dragOverCardZone?.cardId === block.id && dragOverCardZone.zone === 'body';
          const isDragOverFooter =
            dragOverCardZone?.cardId === block.id && dragOverCardZone.zone === 'footer';
          const isDraggingAny =
            Boolean(dragState.draggedId && dragState.draggedId !== block.id) ||
            isDropTarget ||
            isDragOverBody ||
            isDragOverFooter;

          const showBodyDropZone =
            bodyChildren.length > 0 ||
            Boolean(block.content.cardHideDefaultContent) ||
            isDraggingAny;
          const isDualZoneVariant =
            cardVariant === 'membership_ticket' || cardVariant === 'event_poster';
          const showFooterDropZone =
            footerChildren.length > 0 ||
            (isDualZoneVariant &&
              (Boolean(block.content.cardHideDefaultFooter) || isDraggingAny)) ||
            (!isDualZoneVariant && (isDragOverFooter || Boolean(block.content.cardHideDefaultFooter)));

          const handleFooterZoneDrop = (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            const existingId = e.dataTransfer.getData('application/lynk-existing-block');
            const newBlockType = e.dataTransfer.getData('application/lynk-block-type') as BlockType;
            const blockPreset = e.dataTransfer.getData('application/lynk-block-preset') as 'png' | '';
            const sectionId = e.dataTransfer.getData('application/lynk-section-id');
            const itemTemplateId = e.dataTransfer.getData('application/lynk-item-template-id');
            if (existingId && existingId !== block.id) {
              onMoveBlockToCardFooter?.(existingId, block.id);
            } else if (newBlockType) {
              onDropNewBlockToCardFooter?.(
                block.id,
                newBlockType,
                blockPreset === 'png' ? 'png' : undefined
              );
            } else if (sectionId) {
              onDropSectionToCardFooter?.(sectionId, block.id);
            } else if (itemTemplateId) {
              onDropItemTemplateToCardFooter?.(itemTemplateId, block.id);
            }
            setDragState({ draggedId: null, targetId: null, position: null });
            setDragOverRoot(false);
            setDragOverCardZone(null);
          };

          const handleBodyZoneDrop = (e: React.DragEvent) => {
            e.preventDefault();
            e.stopPropagation();
            setDragOverCardZone(null);
            handleBlockDrop(e, block.id, 'inside');
          };

          const bodyZoneTextColor =
            cardVariant === 'membership_ticket' || cardVariant === 'activity_post'
              ? theme.textColor
              : block.content.cardTextColor || '#FFFFFF';
          const footerZoneTextColor = block.content.cardTextColor || '#FFFFFF';

          const bodySlotNode = showBodyDropZone ? (
            <div
              data-card-drop-zone="body"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dragState.draggedId === block.id) return;
                if (!isDragOverBody) {
                  setDragOverCardZone({ cardId: block.id, zone: 'body' });
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setDragOverCardZone((prev) =>
                    prev?.cardId === block.id && prev.zone === 'body' ? null : prev
                  );
                }
              }}
              onDrop={handleBodyZoneDrop}
              className={`w-full space-y-1.5 rounded-lg transition-all ${
                isDragOverBody
                  ? 'ring-2 ring-dashed ring-emerald-500 bg-emerald-500/10 p-1.5'
                  : bodyChildren.length === 0
                  ? 'mt-1'
                  : 'pt-1'
              }`}
            >
              {bodyChildren.map((child) =>
                renderBlockContent(child, depth + 1, bodyZoneTextColor)
              )}
              {(bodyChildren.length === 0 || isDragOverBody) && (
                <div
                  className={`py-2 px-2 text-center text-[10px] font-medium rounded-lg border border-dashed select-none transition-colors ${
                    isDragOverBody
                      ? 'border-emerald-500 text-emerald-700 bg-emerald-50/90'
                      : cardVariant === 'membership_ticket' || cardVariant === 'activity_post'
                      ? 'border-slate-300 text-slate-400 bg-slate-50/60'
                      : 'border-white/45 text-white/80 bg-black/10'
                  }`}
                >
                  {isDragOverBody
                    ? 'Lepas komponen ke Zona Atas kartu'
                    : 'Tarik & lepas komponen ke Zona Atas (gambar, teks, icon...)'}
                </div>
              )}
            </div>
          ) : undefined;

          const footerSlotNode = showFooterDropZone ? (
            <div
              data-card-drop-zone="footer"
              onDragOver={(e) => {
                e.preventDefault();
                e.stopPropagation();
                if (dragState.draggedId === block.id) return;
                if (!isDragOverFooter) {
                  setDragOverCardZone({ cardId: block.id, zone: 'footer' });
                }
              }}
              onDragLeave={(e) => {
                if (!e.currentTarget.contains(e.relatedTarget as Node | null)) {
                  setDragOverCardZone((prev) =>
                    prev?.cardId === block.id && prev.zone === 'footer' ? null : prev
                  );
                }
              }}
              onDrop={handleFooterZoneDrop}
              className={`w-full space-y-1.5 rounded-lg transition-all ${
                isDragOverFooter
                  ? 'ring-2 ring-dashed ring-white bg-white/15 p-1'
                  : ''
              }`}
            >
              {footerChildren.map((child) =>
                renderBlockContent(child, depth + 1, footerZoneTextColor)
              )}
              {(footerChildren.length === 0 || isDragOverFooter) && (
                <div
                  className={`py-1.5 px-2 text-center text-[10px] font-medium rounded-md border border-dashed select-none transition-colors ${
                    isDragOverFooter
                      ? 'border-white text-white bg-white/20'
                      : 'border-white/45 text-white/85 bg-black/10'
                  }`}
                >
                  {isDragOverFooter
                    ? 'Lepas komponen ke Strip Bawah'
                    : '+ Tarik keranjang / tombol / icon ke Strip Bawah'}
                </div>
              )}
            </div>
          ) : undefined;

          const scKey = `sc_${block.id}`;
          return (
            <ShowcaseCardView
              content={block.content}
              theme={theme}
              borderRadius={s.borderRadius}
              blockStyle={s}
              isEditor
              cartQty={fnbPreviewQtys[scKey] ?? 0}
              onAddCart={() => {
                setFnbPreviewQtys((prev) => ({ ...prev, [scKey]: (prev[scKey] ?? 0) + 1 }));
              }}
              onIncCart={() => {
                setFnbPreviewQtys((prev) => ({ ...prev, [scKey]: (prev[scKey] ?? 0) + 1 }));
              }}
              onDecCart={() => {
                setFnbPreviewQtys((prev) => ({
                  ...prev,
                  [scKey]: Math.max(0, (prev[scKey] ?? 0) - 1),
                }));
              }}
              enableSubLayerClick={interactionMode === 'pointer'}
              selectedSubLayerId={isSelected ? selectedSubLayerId : null}
              onSelectSubLayer={(subId) => onSelectSubLayer?.(block.id, subId)}
              bodySlot={bodySlotNode}
              footerSlot={footerSlotNode}
            />
          );
        })()}

        {block.type === 'back_button' && (() => {
          const backRadius = Math.max(0, Math.min(9999, Math.round(s.borderRadius ?? 12)));
          const backFontSize = Math.max(11, Math.min(24, Math.round(s.fontSize ?? 13)));
          const backIconId = block.content.backButtonIcon ?? 'arrow-left';
          const backTextColor = block.content.backButtonText || '#0F172A';
          const backIconColor = block.content.backButtonIconColor || backTextColor;
          const backBorderWidth = s.borderWidth > 0 ? s.borderWidth : 1;
          const backBorderStyle = s.borderStyle ?? 'solid';
          const backBorderColor = s.borderWidth > 0 ? s.borderColor : 'rgba(15, 23, 42, 0.1)';
          const padTop = s.paddingTop ?? Math.max(6, Math.min(24, s.padding || 8));
          const padBottom = s.paddingBottom ?? Math.max(6, Math.min(24, s.padding || 8));
          const padLeft = s.paddingLeft ?? s.paddingX ?? 14;
          const padRight = s.paddingRight ?? s.paddingX ?? 14;
          return (
            <div
              className="w-full flex"
              style={{
                justifyContent:
                  s.align === 'center' ? 'center' : s.align === 'right' ? 'flex-end' : 'flex-start',
              }}
            >
              <button
                type="button"
                data-canvas-sublayer="back_label"
                style={{
                  backgroundColor: block.content.backButtonBg || '#F1F5F9',
                  color: backTextColor,
                  borderRadius: `${backRadius}px`,
                  fontSize: `${backFontSize}px`,
                  padding: `${padTop}px ${padRight}px ${padBottom}px ${padLeft}px`,
                  borderWidth: backBorderStyle === 'none' ? 0 : `${backBorderWidth}px`,
                  borderStyle: backBorderStyle,
                  borderColor: backBorderColor,
                }}
                className="inline-flex items-center gap-1.5 font-bold shadow-xs cursor-pointer"
              >
                {(backIconId !== 'none' || Boolean(block.content.buttonIconUrl)) && (
                  <span style={{ color: backIconColor }} className="inline-flex shrink-0">
                    <ButtonGlyph
                      icon={backIconId}
                      iconUrl={block.content.buttonIconUrl}
                      className="shrink-0"
                      style={{ width: `${Math.max(12, backFontSize)}px`, height: `${Math.max(12, backFontSize)}px` }}
                    />
                  </span>
                )}
                <span>{block.content.backButtonLabel || 'Kembali'}</span>
              </button>
            </div>
          );
        })()}

        {/* Universal Cart Overlay on ANY Card/Layer when universalCartEnabled is active */}
        {(() => {
          const uc = resolveUniversalCartMeta(block, theme);
          if (!uc) return null;
          const qty = fnbPreviewQtys[uc.compositeKey] ?? 0;
          return (
            <div
              data-canvas-sublayer="universal_cart"
              onClick={(e) => {
                e.stopPropagation();
                if (interactionMode === 'pointer' && onSelectSubLayer) {
                  onSelectSubLayer(block.id, 'universal_cart');
                } else {
                  onSelectBlock(block.id);
                }
              }}
              className="mt-2 pt-2 border-t border-black/10 flex flex-wrap items-center justify-between gap-1.5 px-1 rounded-md"
            >
              <div className="min-w-0 text-left">
                <div className="text-xs font-extrabold tabular-nums" style={{ color: uc.accentColor }}>
                  {uc.price}
                </div>
                {uc.showUnitSold && (
                  <div className="text-[10px] opacity-70 tabular-nums">
                    {uc.unitSold} terjual
                  </div>
                )}
              </div>
              {qty > 0 ? (
                <div
                  style={{ borderColor: uc.accentColor }}
                  className="inline-flex items-center gap-1 rounded-full border bg-white px-1 py-0.5 text-[#0F172A] shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() =>
                      setFnbPreviewQtys((prev) => ({
                        ...prev,
                        [uc.compositeKey]: Math.max(0, (prev[uc.compositeKey] ?? 0) - 1),
                      }))
                    }
                    className="w-5 h-5 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-[11px] font-bold min-w-[16px] text-center tabular-nums">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setFnbPreviewQtys((prev) => ({
                        ...prev,
                        [uc.compositeKey]: (prev[uc.compositeKey] ?? 0) + 1,
                      }))
                    }
                    style={{ backgroundColor: uc.accentColor }}
                    className="w-5 h-5 rounded-full text-white flex items-center justify-center cursor-pointer"
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
                      [uc.compositeKey]: (prev[uc.compositeKey] ?? 0) + 1,
                    }))
                  }
                  style={{ backgroundColor: uc.accentColor }}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold text-white shadow-xs cursor-pointer"
                >
                  <ShoppingCart className="w-3 h-3" />
                  <span>{uc.buttonLabel}</span>
                </button>
              )}
            </div>
          );
        })()}

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
      {/* Workspace Toolbar: Kiri (Halaman) | Tengah (Perangkat · Mode Pointer · Riwayat) | Kanan (Zoom) */}
      <div
        onClick={(e) => e.stopPropagation()}
        data-canvas-toolbar="1"
        className="h-12 px-4 sm:px-5 bg-white border-b border-slate-200/80 flex items-center justify-between gap-4 text-[12px] text-slate-700 shrink-0 relative z-20"
      >
        {/* Kiri: Navigasi Halaman */}
        <div
          data-canvas-page-bar="1"
          role="group"
          aria-label="Navigasi Halaman"
          className="flex items-center gap-1.5 min-w-0 max-w-[36%] overflow-x-auto no-scrollbar shrink"
        >
          <div className="inline-flex items-center gap-1 bg-slate-100/85 border border-slate-200/60 rounded-xl p-1 shrink-0">
            <button
              type="button"
              onClick={() => onSelectSubPage?.(null)}
              title={label('canvas.toolbar.home', 'Beranda')}
              aria-label={label('canvas.toolbar.home', 'Beranda')}
              aria-pressed={activeSubPageId === null}
              className={`h-7 px-2.5 inline-flex items-center justify-center gap-1.5 rounded-lg text-[11.5px] transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                activeSubPageId === null
                  ? 'bg-white text-slate-900 font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70'
                  : 'text-slate-500 font-medium hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              <Home
                className={`w-3.5 h-3.5 shrink-0 ${
                  activeSubPageId === null ? 'text-emerald-600' : 'text-current'
                }`}
              />
              <span className="hidden xl:inline">{label('canvas.toolbar.home', 'Beranda')}</span>
            </button>
            {pages.map((pg) => (
              <button
                key={pg.id}
                type="button"
                onClick={() => onSelectSubPage?.(pg.id)}
                className={`inline-flex items-center gap-1.5 px-3 h-7 rounded-lg text-[11.5px] transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                  activeSubPageId === pg.id
                    ? 'bg-white text-slate-900 font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70'
                    : 'text-slate-500 font-medium hover:text-slate-800 hover:bg-white/60'
                }`}
              >
                <span className="max-w-[120px] truncate">{pg.title}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Tengah: Perangkat (PC, Tablet, HP) | Mode Pointer (Klik / Drag) | Riwayat */}
        <div
          className="flex items-center gap-3 lg:gap-4 shrink-0"
          role="group"
          aria-label="Preview Perangkat, Mode Pointer & Riwayat"
        >
          {/* Switcher Ukuran Layar */}
          <div className="inline-flex items-center gap-1 bg-slate-100/85 border border-slate-200/60 rounded-xl p-1">
            <button
              type="button"
              data-viewport-preset="desktop"
              onClick={() => handleSelectPresetWidth('desktop')}
              aria-pressed={activeBreakpoint === 'desktop'}
              title={label('canvas.toolbar.desktop', 'PC / Desktop (1024 px)')}
              aria-label={label('canvas.toolbar.desktop', 'PC / Desktop (1024 px)')}
              className={`w-8 h-7 inline-flex items-center justify-center rounded-lg transition-all duration-150 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                activeBreakpoint === 'desktop'
                  ? 'bg-white text-emerald-600 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              <Monitor className="w-4 h-4" />
            </button>

            <button
              type="button"
              data-viewport-preset="tablet"
              onClick={() => handleSelectPresetWidth('tablet')}
              aria-pressed={activeBreakpoint === 'tablet'}
              title={label('canvas.toolbar.tablet', 'Tablet (768 px)')}
              aria-label={label('canvas.toolbar.tablet', 'Tablet (768 px)')}
              className={`w-8 h-7 inline-flex items-center justify-center rounded-lg transition-all duration-150 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                activeBreakpoint === 'tablet'
                  ? 'bg-white text-emerald-600 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              <Tablet className="w-4 h-4" />
            </button>

            <button
              type="button"
              data-viewport-preset="mobile"
              onClick={() => handleSelectPresetWidth('mobile')}
              aria-pressed={activeBreakpoint === 'mobile'}
              title={label('canvas.toolbar.mobile', 'HP / Mobile (440 px)')}
              aria-label={label('canvas.toolbar.mobile', 'HP / Mobile (440 px)')}
              className={`w-8 h-7 inline-flex items-center justify-center rounded-lg transition-all duration-150 shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                activeBreakpoint === 'mobile'
                  ? 'bg-white text-emerald-600 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70'
                  : 'text-slate-500 hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              <Smartphone className="w-4 h-4" />
            </button>
          </div>

          <span className="w-px h-5 bg-slate-200/90 shrink-0" aria-hidden="true" />

          {/* Mode Pointer Penunjuk: Klik vs Drag (selaras & nyaman di mata) */}
          <div
            className="inline-flex items-center gap-1 bg-slate-100/85 border border-slate-200/60 rounded-xl p-1 shrink-0"
            role="group"
            aria-label="Mode Pointer Penunjuk Kanvas"
          >
            <button
              type="button"
              data-canvas-mode-btn="pointer"
              aria-pressed={interactionMode === 'pointer'}
              onClick={() => onChangeInteractionMode?.('pointer')}
              title="Mode Klik (V) — Klik objek & sub-layer di kanvas untuk edit Konten & Desain"
              className={`h-7 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg text-[11.5px] transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                interactionMode === 'pointer'
                  ? 'bg-white text-slate-900 font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70'
                  : 'text-slate-500 font-medium hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              <MousePointer2
                className={`w-3.5 h-3.5 shrink-0 ${
                  interactionMode === 'pointer' ? 'text-emerald-600' : 'text-current'
                }`}
              />
              <span>{label('canvas.toolbar.modeClick', 'Klik')}</span>
            </button>

            <button
              type="button"
              data-canvas-mode-btn="drag"
              aria-pressed={interactionMode === 'drag'}
              onClick={() => onChangeInteractionMode?.('drag')}
              title="Mode Drag (D) — Tarik & lepas blok untuk mengatur posisi di kanvas"
              className={`h-7 px-3 inline-flex items-center justify-center gap-1.5 rounded-lg text-[11.5px] transition-all duration-150 whitespace-nowrap shrink-0 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                interactionMode === 'drag'
                  ? 'bg-white text-slate-900 font-semibold shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70'
                  : 'text-slate-500 font-medium hover:text-slate-800 hover:bg-white/60'
              }`}
            >
              <Move
                className={`w-3.5 h-3.5 shrink-0 ${
                  interactionMode === 'drag' ? 'text-emerald-600' : 'text-current'
                }`}
              />
              <span>{label('canvas.toolbar.modeDrag', 'Drag')}</span>
            </button>
          </div>

          <span className="w-px h-5 bg-slate-200/90 shrink-0" aria-hidden="true" />

          {/* Aksi Riwayat & Clipboard (simetris & lega) */}
          <div className="flex items-center gap-1 shrink-0">
            <button
              type="button"
              data-toolbar-undo="1"
              disabled={!canUndo || !onUndo}
              onClick={() => onUndo?.()}
              title={
                canUndo
                  ? `${label('canvas.toolbar.undo', 'Undo')} (Ctrl+Z)`
                  : 'Belum ada riwayat pembatalan'
              }
              aria-label={label('canvas.toolbar.undo', 'Undo')}
              className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors duration-150 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                canUndo && onUndo
                  ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              <Undo2 className="w-4 h-4 shrink-0" />
            </button>

            <button
              type="button"
              data-toolbar-redo="1"
              disabled={!canRedo || !onRedo}
              onClick={() => onRedo?.()}
              title={
                canRedo
                  ? `${label('canvas.toolbar.redo', 'Redo')} (Ctrl+Y)`
                  : 'Belum ada riwayat ulangi'
              }
              aria-label={label('canvas.toolbar.redo', 'Redo')}
              className={`w-8 h-8 inline-flex items-center justify-center rounded-lg transition-colors duration-150 shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                canRedo && onRedo
                  ? 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 cursor-pointer'
                  : 'text-slate-300 cursor-not-allowed'
              }`}
            >
              <Redo2 className="w-4 h-4 shrink-0" />
            </button>

            {onCopyBlock && selectedId && (
              <button
                type="button"
                onClick={() => onCopyBlock(selectedId)}
                title="Salin komponen terpilih (Ctrl+C)"
                aria-label="Salin"
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition-colors duration-150 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              >
                <ClipboardCopy className="w-4 h-4" />
              </button>
            )}

            {onPasteBlock && canPaste && (
              <button
                type="button"
                onClick={onPasteBlock}
                title="Tempel komponen (Ctrl+V)"
                aria-label="Tempel"
                className="w-8 h-8 inline-flex items-center justify-center rounded-lg text-emerald-700 bg-emerald-50 hover:bg-emerald-100 transition-colors duration-150 cursor-pointer shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40"
              >
                <ClipboardPaste className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Kanan: Zoom Terpadu Ringkas (- 100% + dengan Popover Preset & Slider) */}
        <div
          ref={zoomMenuRef}
          className="relative flex items-center shrink-0"
          role="group"
          aria-label="Zoom Canvas"
        >
          {(() => {
            const zoomPct = Math.round(zoom * 100);
            const sliderFill = Math.max(0, Math.min(100, ((zoomPct - 50) / (250 - 50)) * 100));
            return (
              <>
                <div className="inline-flex items-center bg-slate-100/85 border border-slate-200/60 rounded-xl p-1 gap-1">
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.max(0.5, Number((z - 0.1).toFixed(2))))}
                    disabled={zoomPct <= 50}
                    title="Perkecil tampilan kanvas"
                    aria-label="Perkecil"
                    className={`w-7 h-7 inline-flex items-center justify-center rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                      zoomPct > 50
                        ? 'text-slate-600 hover:bg-white hover:text-slate-900 cursor-pointer'
                        : 'text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <Minus className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    data-zoom-menu-trigger="1"
                    aria-expanded={isZoomMenuOpen}
                    onClick={() => setIsZoomMenuOpen((v) => !v)}
                    title="Atur skala zoom kanvas (50% – 250%)"
                    className={`inline-flex items-center gap-1 px-2.5 h-7 rounded-lg text-[11.5px] font-semibold tabular-nums transition-all duration-150 whitespace-nowrap cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                      isZoomMenuOpen
                        ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)] ring-1 ring-slate-200/70'
                        : 'text-slate-700 hover:bg-white/80 hover:text-slate-900'
                    }`}
                  >
                    <span>{zoomPct}%</span>
                    <ChevronDown
                      className={`w-3.5 h-3.5 text-slate-400 transition-transform duration-150 ${
                        isZoomMenuOpen ? 'rotate-180' : ''
                      }`}
                    />
                  </button>
                  <button
                    type="button"
                    onClick={() => setZoom((z) => Math.min(2.5, Number((z + 0.1).toFixed(2))))}
                    disabled={zoomPct >= 250}
                    title="Perbesar tampilan kanvas"
                    aria-label="Perbesar"
                    className={`w-7 h-7 inline-flex items-center justify-center rounded-lg transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/40 ${
                      zoomPct < 250
                        ? 'text-slate-600 hover:bg-white hover:text-slate-900 cursor-pointer'
                        : 'text-slate-300 cursor-not-allowed'
                    }`}
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>

                {isZoomMenuOpen && (
                  <div
                    data-zoom-popover="1"
                    className="absolute right-0 top-full mt-2 w-60 bg-white border border-slate-200/90 rounded-2xl shadow-[0_12px_32px_rgba(15,23,42,0.12)] p-3 z-40"
                  >
                    <div className="flex items-center justify-between mb-2.5">
                      <span className="text-[11.5px] font-semibold text-slate-700">Skala Kanvas</span>
                      <button
                        type="button"
                        onClick={() => {
                          setZoom(1);
                          setIsZoomMenuOpen(false);
                        }}
                        className="text-[11px] font-medium text-emerald-600 hover:underline cursor-pointer"
                      >
                        Reset 100%
                      </button>
                    </div>

                    <div className="grid grid-cols-5 gap-1 mb-2.5">
                      {([0.5, 0.75, 1, 1.25, 1.5] as const).map((z) => {
                        const active = Math.abs(zoom - z) < 0.005;
                        return (
                          <button
                            key={z}
                            type="button"
                            aria-pressed={active}
                            onClick={() => {
                              setZoom(z);
                              setIsZoomMenuOpen(false);
                            }}
                            className={`py-1 rounded-md text-[10.5px] font-semibold tabular-nums transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#0F172A] text-white'
                                : 'bg-[#F8FAFC] text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]'
                            }`}
                          >
                            {Math.round(z * 100)}%
                          </button>
                        );
                      })}
                    </div>

                    <div className="flex items-center gap-2 pt-2 border-t border-[#F1F5F9]">
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
                          background: `linear-gradient(to right, #0F172A 0%, #0F172A ${sliderFill}%, #E2E8F0 ${sliderFill}%, #E2E8F0 100%)`,
                        }}
                        className="flex-1 h-1.5 rounded-full cursor-pointer"
                      />
                      <span className="text-[10.5px] font-mono font-semibold text-[#0F172A] tabular-nums w-9 text-right">
                        {zoomPct}%
                      </span>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </div>
      </div>

      {/* Scrollable Canvas Area (Zoom scales Canvas only) */}
      <div ref={scrollAreaRef} className="flex-1 overflow-auto pt-14 pb-12 px-5">
        <div
          ref={zoomStageRef}
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
          data-canvas-mode={interactionMode}
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
            const blockPreset = e.dataTransfer.getData('application/lynk-block-preset') as 'png' | '';
            const sectionId = e.dataTransfer.getData('application/lynk-section-id');
            const itemTemplateId = e.dataTransfer.getData('application/lynk-item-template-id');

            if (existingId && blocks.length > 0) {
              const lastId = blocks[blocks.length - 1].id;
              if (existingId !== lastId) {
                onReorderBlock(existingId, lastId, 'after');
              }
            } else if (droppedType) {
              onDropNewBlock(
                droppedType,
                undefined,
                'inside',
                blockPreset === 'png' ? 'png' : undefined
              );
            } else if (sectionId) {
              onDropSection(sectionId);
            } else if (itemTemplateId) {
              onDropItemTemplate?.(itemTemplateId);
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

            const collectNestedBlocks = (list: BuilderBlock[]): BuilderBlock[] => {
              const acc: BuilderBlock[] = [];
              list.forEach((b) => {
                acc.push(b);
                if (b.children?.length) acc.push(...collectNestedBlocks(b.children));
                if (b.content.actionSheetBlocks?.length) {
                  acc.push(...collectNestedBlocks(b.content.actionSheetBlocks));
                }
                if (b.content.cardFooterBlocks?.length) {
                  acc.push(...collectNestedBlocks(b.content.cardFooterBlocks));
                }
              });
              return acc;
            };
            const allFlatCanvasBlocks = collectNestedBlocks(blocks);
            const canvasFloatingCart = resolveProjectFloatingCartConfig(
              blocks,
              bottomNavbar.items,
              pages
            );
            const floatingCartRenderData = (() => {
              if (!canvasFloatingCart) return null;
              const fnbBlocks = allFlatCanvasBlocks.filter((b) => b.type === 'fnb_catalog');
              const fnbSliderBlocks = allFlatCanvasBlocks.filter(
                (b) => b.type === 'fnb_hero_slider' && b.content.fnbSliderEnableCart !== false
              );
              const culinarySliderBlocks = allFlatCanvasBlocks.filter(
                (b) =>
                  b.type === 'culinary_spin_slider' &&
                  b.content.culinaryShowCartButton !== false
              );
              const studioSliderBlocks = allFlatCanvasBlocks.filter(
                (b) =>
                  b.type === 'floating_product_studio' &&
                  b.content.studioShowCartButton !== false
              );
              const boxShowcaseBlocks = allFlatCanvasBlocks.filter(
                (b) =>
                  b.type === 'interactive_box_showcase' &&
                  b.content.boxShowcaseShowCartButton !== false
              );
              const boxRevealBlocks = allFlatCanvasBlocks.filter(
                (b) =>
                  b.type === 'product_box_reveal' &&
                  b.content.boxRevealShowCartButton !== false &&
                  b.content.boxRevealFloatingCartEnabled !== false
              );
              const mixRasaBlocks = allFlatCanvasBlocks.filter(
                (b) =>
                  b.type === 'mix_rasa' && b.content.mixRasaFloatingCartEnabled !== false
              );
              const cartBtnBlocks = allFlatCanvasBlocks.filter((b) => b.type === 'cart_button');
              const showcaseCartBlocks = allFlatCanvasBlocks.filter(
                (b) =>
                  b.type === 'showcase_card' &&
                  (b.content.cardVariant === 'popout_product' ||
                    b.content.cardVariant === 'store_card') &&
                  Boolean(b.content.cardEnableCart) &&
                  !b.content.universalCartEnabled
              );
              const universalCartBlocks = allFlatCanvasBlocks.filter(
                (b) => resolveUniversalCartMeta(b, theme) !== null
              );
              const fnbItems = fnbBlocks.flatMap((b) => b.content.fnbItems ?? []);
              const fnbSliderItems = fnbSliderBlocks.flatMap(
                (b) => b.content.fnbSliderItems ?? []
              );
              const culinarySliderItems = culinarySliderBlocks.flatMap(
                (b) => b.content.culinarySpinItems ?? []
              );
              const studioSliderItems = studioSliderBlocks.flatMap(
                (b) => b.content.floatingStudioItems ?? []
              );
              const boxShowcaseItems = boxShowcaseBlocks.flatMap(
                (b) => b.content.boxShowcaseItems ?? []
              );
              const boxRevealItems = boxRevealBlocks.flatMap(
                (b) => b.content.boxRevealItems ?? []
              );
              const fnbCount = fnbItems.reduce(
                (sum, it) => sum + (fnbPreviewQtys[it.id] ?? 0),
                0
              );
              const fnbSliderCount = fnbSliderItems.reduce(
                (sum, it) => sum + (fnbPreviewQtys[it.id] ?? 0),
                0
              );
              const culinaryCount = culinarySliderItems.reduce(
                (sum, it) => sum + (fnbPreviewQtys[it.id] ?? 0),
                0
              );
              const studioCount = studioSliderItems.reduce(
                (sum, it) => sum + (fnbPreviewQtys[it.id] ?? 0),
                0
              );
              const boxShowcaseCount = boxShowcaseItems.reduce(
                (sum, it) => sum + (fnbPreviewQtys[it.id] ?? 0),
                0
              );
              const boxRevealCount = boxRevealItems.reduce(
                (sum, it) => sum + (fnbPreviewQtys[it.id] ?? 0),
                0
              );
              const mixRasaCount = mixRasaBlocks.reduce(
                (sum, mb) => sum + (fnbPreviewQtys[`mr_${mb.id}`] ?? 0),
                0
              );
              const mixRasaAmount = mixRasaBlocks.reduce(
                (sum, mb) => sum + (fnbPreviewQtys[`mr_amt_${mb.id}`] ?? 0),
                0
              );
              const cbCount = cartBtnBlocks.reduce(
                (sum, cb) => sum + (fnbPreviewQtys[`cb_${cb.id}`] ?? 0),
                0
              );
              const scCount = showcaseCartBlocks.reduce(
                (sum, sc) => sum + (fnbPreviewQtys[`sc_${sc.id}`] ?? 0),
                0
              );
              const ucCount = universalCartBlocks.reduce(
                (sum, ub) => sum + (fnbPreviewQtys[`uc_${ub.id}`] ?? 0),
                0
              );
              const activeCount =
                fnbCount +
                fnbSliderCount +
                culinaryCount +
                studioCount +
                boxShowcaseCount +
                boxRevealCount +
                mixRasaCount +
                cbCount +
                scCount +
                ucCount;
              const pricedEntries: Array<{ price: string; qty: number }> = [
                ...fnbItems.map((it) => ({ price: it.price, qty: fnbPreviewQtys[it.id] ?? 0 })),
                ...fnbSliderItems.map((it) => ({
                  price: it.price,
                  qty: fnbPreviewQtys[it.id] ?? 0,
                })),
                ...culinarySliderItems.map((it) => ({
                  price: it.price,
                  qty: fnbPreviewQtys[it.id] ?? 0,
                })),
                ...studioSliderItems.map((it) => ({
                  price: it.price,
                  qty: fnbPreviewQtys[it.id] ?? 0,
                })),
                ...boxShowcaseItems.map((it) => ({
                  price: it.price,
                  qty: fnbPreviewQtys[it.id] ?? 0,
                })),
                ...boxRevealItems.map((it) => ({
                  price: it.price,
                  qty: fnbPreviewQtys[it.id] ?? 0,
                })),
                ...cartBtnBlocks.map((cb) => ({
                  price: cb.content.cartProductPrice || '0',
                  qty: fnbPreviewQtys[`cb_${cb.id}`] ?? 0,
                })),
                ...showcaseCartBlocks.map((sc) => ({
                  price: sc.content.cardPrice || '0',
                  qty: fnbPreviewQtys[`sc_${sc.id}`] ?? 0,
                })),
                ...universalCartBlocks.map((ub) => ({
                  price: String(resolveUniversalCartMeta(ub, theme)?.price ?? 0),
                  qty: fnbPreviewQtys[`uc_${ub.id}`] ?? 0,
                })),
              ];
              const activeAmount = fnbPriceSum(pricedEntries) + mixRasaAmount;

              const sourceBlk = allFlatCanvasBlocks.find(
                (b) => b.id === canvasFloatingCart.sourceBlockId
              );
              const isPosPreview =
                activeCount === 0 &&
                Boolean(
                  selectedId &&
                    (selectedId === canvasFloatingCart.sourceBlockId ||
                      fnbBlocks.some((b) => b.id === selectedId) ||
                      fnbSliderBlocks.some((b) => b.id === selectedId) ||
                      culinarySliderBlocks.some((b) => b.id === selectedId) ||
                      studioSliderBlocks.some((b) => b.id === selectedId) ||
                      boxShowcaseBlocks.some((b) => b.id === selectedId) ||
                      boxRevealBlocks.some((b) => b.id === selectedId) ||
                      mixRasaBlocks.some((b) => b.id === selectedId) ||
                      cartBtnBlocks.some((b) => b.id === selectedId) ||
                      showcaseCartBlocks.some((b) => b.id === selectedId) ||
                      universalCartBlocks.some((b) => b.id === selectedId))
                );

              const displayCount = activeCount > 0 ? activeCount : isPosPreview ? 1 : 0;
              const previewUnitPrice =
                sourceBlk?.type === 'fnb_catalog'
                  ? sourceBlk.content.fnbItems?.[0]?.price || '0'
                  : sourceBlk?.type === 'fnb_hero_slider'
                  ? sourceBlk.content.fnbSliderItems?.[0]?.price || '0'
                  : sourceBlk?.type === 'culinary_spin_slider'
                  ? sourceBlk.content.culinarySpinItems?.[0]?.price || '0'
                  : sourceBlk?.type === 'floating_product_studio'
                  ? sourceBlk.content.floatingStudioItems?.[0]?.price || '0'
                  : sourceBlk?.type === 'interactive_box_showcase'
                  ? sourceBlk.content.boxShowcaseItems?.[0]?.price || '0'
                  : sourceBlk?.type === 'product_box_reveal'
                  ? sourceBlk.content.boxRevealItems?.[0]?.price || '0'
                  : sourceBlk?.type === 'mix_rasa'
                  ? String(
                      (sourceBlk.content.mixRasaFlavors ?? [])
                        .slice(0, sourceBlk.content.mixRasaSliceCount ?? 2)
                        .reduce((s, f) => s + parseMixRasaPrice(f.price), 0)
                    )
                  : sourceBlk?.type === 'cart_button'
                  ? sourceBlk.content.cartProductPrice || '0'
                  : sourceBlk?.type === 'showcase_card'
                  ? sourceBlk.content.cardPrice || '0'
                  : sourceBlk
                  ? String(resolveUniversalCartMeta(sourceBlk, theme)?.price ?? 0)
                  : '0';
              const displayAmount =
                activeCount > 0
                  ? activeAmount
                  : isPosPreview
                  ? fnbPriceSum([{ price: previewUnitPrice, qty: 1 }])
                  : 0;

              if (displayCount <= 0) return null;
              return {
                count: displayCount,
                totalAmount: displayAmount,
                position: canvasFloatingCart.position,
                offsetY: canvasFloatingCart.offsetY,
                bgColor: canvasFloatingCart.bg || theme.accentColor,
                actionLabel: canvasFloatingCart.label,
              };
            })();

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
                {floatingCartRenderData &&
                  isTopFloatingCartPosition(floatingCartRenderData.position) && (
                    <FnbFloatingCartCapsule
                      count={floatingCartRenderData.count}
                      totalAmount={floatingCartRenderData.totalAmount}
                      position={floatingCartRenderData.position}
                      offsetY={floatingCartRenderData.offsetY}
                      bgColor={floatingCartRenderData.bgColor}
                      actionLabel={floatingCartRenderData.actionLabel}
                      onClick={onOpenPreview}
                    />
                  )}

                {/* Sub-page automatic Back Header Bar preview */}
                {activeSubPage && activeSubPage.showBackButton !== false && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    className="px-4 py-2.5 border-b border-black/10 flex items-center justify-between gap-2 bg-white/80 backdrop-blur-xs shrink-0"
                  >
                    <button
                      type="button"
                      onClick={() => onSelectSubPage?.(null)}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0F172A] text-xs font-bold cursor-pointer"
                    >
                      <ArrowLeft className="w-3.5 h-3.5" />
                      <span>{activeSubPage.backButtonLabel || 'Kembali'}</span>
                    </button>
                    <span className="text-xs font-bold truncate opacity-80">
                      {activeSubPage.title}
                    </span>
                  </div>
                )}

                <div className="flex-1 pb-6">
                  {blocks.length === 0 ? (
                    <div className="w-full max-w-[576px] mx-auto px-4">
                      <div className="my-16 py-12 px-6 rounded-2xl border-2 border-dashed border-slate-300 text-center space-y-3">
                        <div className="w-10 h-10 rounded-full bg-[#EFF7F4] text-emerald-600 mx-auto flex items-center justify-center">
                          <Plus className="w-5 h-5" />
                        </div>
                        {isVisible('canvas.empty.title') && (
                          <div className="text-sm font-semibold">
                            {label('canvas.empty.title', 'Kanvas Masih Kosong')}
                          </div>
                        )}
                        {isVisible('canvas.empty.desc') && (
                          <p className="text-xs opacity-70 leading-relaxed">
                            {label(
                              'canvas.empty.desc',
                              'Pilih komponen dari panel Alat atau Blok di sebelah kiri untuk mulai menyusun halaman.'
                            )}
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    blocks.map((block) => renderBlockContent(block, 0))
                  )}
                </div>

                {floatingCartRenderData &&
                  !isTopFloatingCartPosition(floatingCartRenderData.position) && (
                    <FnbFloatingCartCapsule
                      count={floatingCartRenderData.count}
                      totalAmount={floatingCartRenderData.totalAmount}
                      position={floatingCartRenderData.position}
                      offsetY={floatingCartRenderData.offsetY}
                      bgColor={floatingCartRenderData.bgColor}
                      actionLabel={floatingCartRenderData.actionLabel}
                      onClick={onOpenPreview}
                    />
                  )}

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

        {/* Hover Pill Ringan (di atas objek, berjarak dari outline & shadow) */}
        {hoveredBlockObj && hoveredOverlayRect && hoveredBlockId !== selectedId && (() => {
          const hovActionBadge = getActionBadgeLabel(hoveredBlockObj);
          const hovGap = Math.max(12, Math.round(9 * zoom) + 4);
          const hovTop = Math.max(-16, Math.round(hoveredOverlayRect.top - hovGap));
          const hovLeft = Math.max(
            4,
            Math.min(hoveredOverlayRect.left, Math.max(4, hoveredOverlayRect.stageWidth - 180))
          );
          return (
            <div
              data-canvas-hover-pill="1"
              style={{
                top: `${hovTop}px`,
                left: `${Math.round(hovLeft)}px`,
                transform: 'translateY(-100%)',
              }}
              className="absolute z-40 pointer-events-none flex items-center gap-1.5 px-2 py-0.5 rounded-md bg-[#0F172A]/88 text-white text-[10px] font-medium shadow-md border border-white/10 backdrop-blur-xs whitespace-nowrap max-w-[260px]"
            >
              {interactionMode === 'drag' ? (
                <GripVertical className="w-2.5 h-2.5 shrink-0 text-slate-300" />
              ) : (
                <MousePointer2 className="w-2.5 h-2.5 shrink-0 text-[#00C98A]" />
              )}
              <span className="truncate">
                {hoveredBlockObj.label.trim() || BLOCK_TYPE_NAMES[hoveredBlockObj.type]}
              </span>
              {hovActionBadge && (
                <span className="px-1 py-px rounded bg-white/15 text-slate-200 text-[9px] font-semibold shrink-0">
                  {hovActionBadge}
                </span>
              )}
            </div>
          );
        })()}

        {/* Unified Floating Bar Terpilih: Informasi (kiri) bersebelahan dengan Copy, Duplikat, Hapus dll (kanan), di atas objek & berjarak dari shadow/outline */}
        {selectedBlockObj && selectedOverlayRect && (() => {
          const selStyle = resolveEffectiveBlockStyle(selectedBlockObj.style, activeBreakpoint);
          const selActionBadge = getActionBadgeLabel(selectedBlockObj);
          const selGap = Math.max(14, Math.round(10 * zoom) + 6);
          const clampedTop = Math.max(-14, Math.round(selectedOverlayRect.top - selGap));
          const maxLeft = selectedOverlayRect.stageWidth - floatingBarWidth - 4;
          const clampedLeft =
            floatingBarWidth + 8 > selectedOverlayRect.stageWidth
              ? Math.round((selectedOverlayRect.stageWidth - floatingBarWidth) / 2)
              : Math.max(4, Math.min(selectedOverlayRect.left, maxLeft));
          const selRemoteEditors = Array.from(
            new Map((remotePeersByBlock[selectedBlockObj.id] ?? []).map((p) => [p.userId, p])).values()
          );
          const selPrimaryRemote = selRemoteEditors[0] ?? null;

          return (
            <div
              ref={floatingBarRef}
              data-selected-block-floating-bar="1"
              onClick={(e) => e.stopPropagation()}
              onDragStart={(e) => e.stopPropagation()}
              style={{
                top: `${clampedTop}px`,
                left: `${Math.round(clampedLeft)}px`,
                transform: 'translateY(-100%)',
              }}
              className="absolute z-50 flex items-center gap-1.5 px-2 py-1 rounded-lg bg-[#0F172A]/95 text-white shadow-lg border border-white/12 backdrop-blur-xs whitespace-nowrap"
            >
              {/* Bagian Informasi */}
              <div className="flex items-center gap-1.5 min-w-0">
                {interactionMode === 'drag' ? (
                  <GripVertical className="w-3 h-3 shrink-0 text-slate-300" />
                ) : (
                  <MousePointer2 className="w-3 h-3 shrink-0 text-[#00C98A]" />
                )}
                <span className="text-[10.5px] font-semibold truncate max-w-[110px]">
                  {selectedBlockObj.label.trim() || BLOCK_TYPE_NAMES[selectedBlockObj.type]}
                </span>
                {selectedSubLayerLabel && (
                  <span
                    title={`Sub-layer aktif: ${selectedSubLayerLabel}`}
                    className="px-1.5 py-0.5 rounded bg-[#00C98A] text-[#052E20] text-[9px] font-bold shrink-0 max-w-[96px] truncate"
                  >
                    {selectedSubLayerLabel}
                  </span>
                )}
                {selActionBadge && (
                  <span
                    title={`Aksi komponen: ${selActionBadge}`}
                    className="px-1.5 py-0.5 rounded bg-white/12 border border-white/10 text-slate-100 text-[9px] font-semibold shrink-0"
                  >
                    {selActionBadge}
                  </span>
                )}
                {selStyle.locked && (
                  <span
                    title="Lapisan terkunci"
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 text-[9px] font-bold shrink-0"
                  >
                    <Lock className="w-2.5 h-2.5" />
                    <span>Kunci</span>
                  </span>
                )}
                {selPrimaryRemote && (
                  <span
                    style={{ backgroundColor: selPrimaryRemote.color }}
                    className="px-1.5 py-0.5 rounded text-white text-[9px] font-semibold shrink-0"
                  >
                    {selPrimaryRemote.name}
                    {selRemoteEditors.length > 1 ? ` +${selRemoteEditors.length - 1}` : ''}
                  </span>
                )}
              </div>

              <span className="w-px h-3.5 bg-white/20 shrink-0" aria-hidden="true" />

              {/* Bagian Aksi Cepat: Naik, Turun, Full-Bleed, Copy, Duplikat, Hapus */}
              <div className="flex items-center gap-0.5 shrink-0">
                <button
                  type="button"
                  disabled={Boolean(selStyle.locked)}
                  onClick={() => onMoveBlock(selectedBlockObj.id, 'up')}
                  title={label('canvas.floating.up', 'Naikkan')}
                  aria-label={label('canvas.floating.up', 'Naikkan')}
                  className="p-1 hover:bg-slate-700 rounded cursor-pointer disabled:opacity-35 disabled:pointer-events-none"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  disabled={Boolean(selStyle.locked)}
                  onClick={() => onMoveBlock(selectedBlockObj.id, 'down')}
                  title={label('canvas.floating.down', 'Turunkan')}
                  aria-label={label('canvas.floating.down', 'Turunkan')}
                  className="p-1 hover:bg-slate-700 rounded cursor-pointer disabled:opacity-35 disabled:pointer-events-none"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
                {onToggleFullBleed && (
                  <button
                    type="button"
                    onClick={() => onToggleFullBleed(selectedBlockObj.id)}
                    title={
                      selStyle.fullBleed
                        ? 'Kembalikan margin kanan-kiri'
                        : label('canvas.floating.fullBleed', 'Full kanan-kiri')
                    }
                    aria-label={label('canvas.floating.fullBleed', 'Full kanan-kiri')}
                    className={`p-1 rounded cursor-pointer transition-colors ${
                      selStyle.fullBleed ? 'bg-blue-600 text-white' : 'hover:bg-slate-700'
                    }`}
                  >
                    <ArrowLeftRight className="w-3 h-3" />
                  </button>
                )}
                {onCopyBlock && (
                  <button
                    type="button"
                    onClick={() => onCopyBlock(selectedBlockObj.id)}
                    title={label('canvas.floating.copy', 'Salin (Copy)')}
                    aria-label={label('canvas.floating.copy', 'Salin (Copy)')}
                    className="p-1 hover:bg-slate-700 rounded cursor-pointer"
                  >
                    <ClipboardCopy className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => onDuplicateBlock(selectedBlockObj.id)}
                  title={label('canvas.floating.duplicate', 'Duplikat')}
                  aria-label={label('canvas.floating.duplicate', 'Duplikat')}
                  className="p-1 hover:bg-slate-700 rounded cursor-pointer"
                >
                  <Copy className="w-3 h-3" />
                </button>
                {onSaveAsItemTemplate && (
                  <button
                    type="button"
                    onClick={() => onSaveAsItemTemplate(selectedBlockObj.id)}
                    title="Simpan ke Item Template"
                    aria-label="Simpan ke Item Template"
                    className="p-1 hover:bg-emerald-600 text-emerald-300 hover:text-white rounded cursor-pointer transition-colors"
                  >
                    <BookmarkPlus className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={Boolean(selStyle.locked)}
                  onClick={() => onDeleteBlock(selectedBlockObj.id)}
                  title={
                    selStyle.locked
                      ? 'Lapisan terkunci'
                      : label('canvas.floating.delete', 'Hapus')
                  }
                  aria-label={label('canvas.floating.delete', 'Hapus')}
                  className="p-1 hover:bg-red-600 rounded cursor-pointer disabled:opacity-35 disabled:pointer-events-none"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })()}

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
