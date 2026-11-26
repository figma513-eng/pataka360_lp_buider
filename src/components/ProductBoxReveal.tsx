import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Minus,
  Plus,
  RotateCcw,
  ShoppingBag,
} from 'lucide-react';
import type { BlockContent, PageTheme, ProductBoxRevealItem } from '../types/builder';

interface ProductBoxRevealProps {
  blockId: string;
  content: BlockContent;
  theme: PageTheme;
  borderRadius?: number;
  isEditor?: boolean;
  cartQtyMap?: Record<string, number>;
  onAddCart?: (item: ProductBoxRevealItem, selectedVariant?: string) => void;
  onIncCart?: (item: ProductBoxRevealItem, selectedVariant?: string) => void;
  onDecCart?: (item: ProductBoxRevealItem, selectedVariant?: string) => void;
  onOpenCart?: () => void;
  onAdminCtaClick?: (item: ProductBoxRevealItem, selectedVariant?: string) => void;
}

export const WOOD_BOX_COLOR_PRESETS = [
  { hex: '#5C3626', label: 'Walnut' },
  { hex: '#4A3F36', label: 'Espresso' },
  { hex: '#A9866A', label: 'Teak' },
  { hex: '#2D2927', label: 'Ebony' },
  { hex: '#6E2C22', label: 'Mahogany' },
  { hex: '#C2A88D', label: 'Natural Oak' },
] as const;

function clampNum(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function parseVariantsList(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(/[,|\n]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseHexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = (hex || '#5C3626').trim().replace('#', '');
  if (/^[0-9a-fA-F]{3}$/.test(clean)) {
    return {
      r: parseInt(clean[0] + clean[0], 16),
      g: parseInt(clean[1] + clean[1], 16),
      b: parseInt(clean[2] + clean[2], 16),
    };
  }
  if (/^[0-9a-fA-F]{6}$/.test(clean)) {
    return {
      r: parseInt(clean.slice(0, 2), 16),
      g: parseInt(clean.slice(2, 4), 16),
      b: parseInt(clean.slice(4, 6), 16),
    };
  }
  return { r: 92, g: 54, b: 38 };
}

function shadeRgb(rgb: { r: number; g: number; b: number }, delta: number): string {
  const clamp = (v: number) => Math.max(0, Math.min(255, Math.round(v)));
  return `rgb(${clamp(rgb.r + delta)}, ${clamp(rgb.g + delta)}, ${clamp(rgb.b + delta)})`;
}

export function buildWoodSurfacePalette(hex: string) {
  const rgb = parseHexToRgb(hex);
  const base = shadeRgb(rgb, 0);
  const light = shadeRgb(rgb, 26);
  const mid = shadeRgb(rgb, -14);
  const dark = shadeRgb(rgb, -34);
  const deep = shadeRgb(rgb, -56);
  const cavity = shadeRgb(rgb, -68);
  const grainOverlay = `repeating-linear-gradient(
    2deg,
    rgba(255, 255, 255, 0.05) 0px,
    rgba(255, 255, 255, 0.05) 2px,
    rgba(0, 0, 0, 0.09) 2px,
    rgba(0, 0, 0, 0.09) 5px,
    rgba(255, 255, 255, 0.02) 5px,
    rgba(255, 255, 255, 0.02) 9px
  )`;
  const lidBackground = `${grainOverlay}, linear-gradient(155deg, ${light} 0%, ${base} 48%, ${dark} 100%)`;
  const frameBackground = `${grainOverlay}, linear-gradient(145deg, ${light} 0%, ${mid} 55%, ${deep} 100%)`;
  const cavityBackground = `radial-gradient(circle at 50% 46%, ${dark} 0%, ${cavity} 62%, #110C0A 100%)`;
  return { base, light, mid, dark, deep, cavity, lidBackground, frameBackground, cavityBackground };
}

export function ProductBoxReveal({
  blockId,
  content,
  theme,
  borderRadius = 24,
  isEditor = false,
  cartQtyMap = {},
  onAddCart,
  onIncCart,
  onDecCart,
  onOpenCart,
  onAdminCtaClick,
}: ProductBoxRevealProps) {
  const items = content.boxRevealItems ?? [];
  const hiddenSet = useMemo(() => new Set(content.hiddenSubLayers ?? []), [content.hiddenSubLayers]);

  const [activeIndex, setActiveIndex] = useState(0);
  const safeIndex = items.length > 0 ? Math.min(activeIndex, items.length - 1) : 0;
  const currentItem: ProductBoxRevealItem | undefined = items[safeIndex];

  const [isOpen, setIsOpen] = useState(false);
  const [suppressLidAnim, setSuppressLidAnim] = useState(false);
  const [transitionStage, setTransitionStage] = useState<'idle' | 'entering'>('idle');
  const [slideDir, setSlideDir] = useState<1 | -1>(1);
  const [hasTriggeredView, setHasTriggeredView] = useState(false);
  const [selectedVariants, setSelectedVariants] = useState<Record<string, string>>({});

  const rootRef = useRef<HTMLDivElement | null>(null);
  const openTimerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);
  const isHoveredRef = useRef(false);
  const autoNonceRef = useRef(0);
  const [autoResetTick, setAutoResetTick] = useState(0);
  const swipeRef = useRef<{
    active: boolean;
    pointerId: number;
    startX: number;
    startY: number;
    moved: boolean;
  }>({
    active: false,
    pointerId: -1,
    startX: 0,
    startY: 0,
    moved: false,
  });

  const stageBg = content.boxRevealBgColor || '#EFEFEF';
  const defaultBoxColor = content.boxRevealColor || '#5C3626';
  const activeBoxColor = currentItem?.boxColorOverride || defaultBoxColor;
  const wood = useMemo(() => buildWoodSurfacePalette(activeBoxColor), [activeBoxColor]);

  // Configurable box sizing & inner outline thickness (down to 1px)
  const boxSizePx = clampNum(content.boxRevealBoxSize ?? 220, 140, 300);
  const borderThicknessPx = clampNum(content.boxRevealBorderThickness ?? 18, 1, 36);

  // Lid logo image (per-box override falls back to global lid logo, inset down to 0px)
  const lidLogoUrl = (currentItem?.lidLogoImage || content.boxRevealLidLogoImage || '').trim();
  const lidLogoSizePct = clampNum(
    currentItem?.lidLogoSize ?? content.boxRevealLidLogoSize ?? 44,
    10,
    100
  );
  const lidLogoPaddingPx = clampNum(
    currentItem?.lidLogoPadding ?? content.boxRevealLidLogoPadding ?? 12,
    0,
    48
  );
  const lidLogoFit: 'contain' | 'cover' =
    currentItem?.lidLogoFit ?? content.boxRevealLidLogoFit ?? 'contain';
  const showLidLogo = Boolean(lidLogoUrl) && !hiddenSet.has('pbr_lid_logo');

  // Product Zoom-Out Effect inside box (start -> end scale)
  const zoomEffectEnabled = content.boxRevealZoomEffectEnabled !== false;
  const zoomStartScale = clampNum(content.boxRevealProductZoomStart ?? 118, 50, 180) / 100;
  const zoomEndScale = clampNum(content.boxRevealProductZoomEnd ?? 100, 40, 160) / 100;

  // Box-to-box transition effect & duration
  const transitionEffect = content.boxRevealTransitionEffect || 'slide_vertical';
  const transitionDurationMs = clampNum(content.boxRevealTransitionDurationMs ?? 520, 220, 1400);

  // Vertical slide + (...) dots indicator + Auto / Manual slide mode
  const verticalSwipeEnabled = content.boxRevealVerticalSwipeEnabled !== false;
  const slideMode = content.boxRevealSlideMode === 'auto' ? 'auto' : 'manual';
  const autoIntervalMs = Math.round(clampNum(content.boxRevealAutoIntervalSec ?? 4, 2, 10) * 1000);
  const showDots = content.boxRevealShowDots !== false && !hiddenSet.has('pbr_dots');
  const dotsPosition = content.boxRevealDotsPosition || 'right';

  // Unified Cart & Floating Cart toggle + Tanya Admin action
  const showCart =
    content.boxRevealShowCartButton !== false &&
    content.boxRevealFloatingCartEnabled !== false &&
    !hiddenSet.has('pbr_cart_action');
  const cartButtonBg = content.boxRevealFloatingCartBg || '#8E6D5B';
  const adminCtaEnabled = Boolean(content.adminCtaEnabled) && !hiddenSet.has('pbr_admin_cta');
  const adminCtaLabel = (content.adminCtaLabel ?? '').trim() || 'Tanya Admin';
  const adminCtaBg = content.adminCtaBgColor || '#8E6D5B';
  const adminCtaText = content.adminCtaTextColor || '#FFFFFF';

  const variantList = useMemo(
    () => parseVariantsList(currentItem?.variants),
    [currentItem?.variants]
  );
  const activeVariant = currentItem
    ? selectedVariants[currentItem.id] && variantList.includes(selectedVariants[currentItem.id])
      ? selectedVariants[currentItem.id]
      : variantList[0] || ''
    : '';

  const currentQty = currentItem ? cartQtyMap[currentItem.id] ?? 0 : 0;

  const clearScheduled = () => {
    if (openTimerRef.current !== null) {
      window.clearTimeout(openTimerRef.current);
      openTimerRef.current = null;
    }
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  const triggerClosedThenOpen = (withBoxTransition: boolean, dir: 1 | -1 = 1) => {
    clearScheduled();
    const reducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion) {
      setSuppressLidAnim(false);
      setTransitionStage('idle');
      setIsOpen(true);
      return;
    }

    // Snap immediately to CLOSED state so every incoming box starts closed
    setSuppressLidAnim(true);
    setIsOpen(false);
    setSlideDir(dir);

    if (withBoxTransition) {
      setTransitionStage('entering');
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = window.requestAnimationFrame(() => {
          setTransitionStage('idle');
          setSuppressLidAnim(false);
          const openDelay = Math.max(240, Math.round(transitionDurationMs * 0.72));
          openTimerRef.current = window.setTimeout(() => {
            setIsOpen(true);
            openTimerRef.current = null;
          }, openDelay);
        });
      });
    } else {
      setTransitionStage('idle');
      rafRef.current = window.requestAnimationFrame(() => {
        rafRef.current = window.requestAnimationFrame(() => {
          setSuppressLidAnim(false);
          openTimerRef.current = window.setTimeout(() => {
            setIsOpen(true);
            openTimerRef.current = null;
          }, 360);
        });
      });
    }
  };

  // Trigger one-shot closed -> open reveal once visible
  useEffect(() => {
    const node = rootRef.current;
    if (!node) return;
    if (typeof IntersectionObserver === 'undefined') {
      setHasTriggeredView(true);
      return;
    }
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) {
          setHasTriggeredView(true);
          observer.disconnect();
        }
      },
      { threshold: 0.25 }
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, [blockId]);

  // Initial reveal when component enters viewport
  const hasMountedInitialRef = useRef(false);
  useEffect(() => {
    if (!hasTriggeredView) return;
    if (!hasMountedInitialRef.current) {
      hasMountedInitialRef.current = true;
      triggerClosedThenOpen(false, 1);
    }
    return () => clearScheduled();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hasTriggeredView]);

  const navigateToIndex = (nextIdx: number, explicitDir?: 1 | -1, isManual = true) => {
    if (items.length === 0) return;
    const wrapped = ((nextIdx % items.length) + items.length) % items.length;
    if (isManual) {
      autoNonceRef.current += 1;
      setAutoResetTick(autoNonceRef.current);
    }
    if (wrapped === safeIndex) {
      triggerClosedThenOpen(false, 1);
      return;
    }
    const computedDir: 1 | -1 = explicitDir ?? (wrapped > safeIndex ? 1 : -1);
    setActiveIndex(wrapped);
    triggerClosedThenOpen(true, computedDir);
  };

  // Auto Slide interval when slideMode === 'auto'
  useEffect(() => {
    if (slideMode !== 'auto' || items.length <= 1 || !hasTriggeredView) return;
    const id = window.setInterval(() => {
      if (isHoveredRef.current || swipeRef.current.active) return;
      setActiveIndex((prev) => {
        const next = ((prev + 1) % items.length + items.length) % items.length;
        return next;
      });
      triggerClosedThenOpen(true, 1);
    }, autoIntervalMs);
    return () => window.clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [slideMode, autoIntervalMs, items.length, hasTriggeredView, autoResetTick]);

  const handleStep = (delta: 1 | -1) => {
    if (items.length <= 1) return;
    navigateToIndex(safeIndex + delta, delta, true);
  };

  const handleReplay = (e: React.MouseEvent) => {
    e.stopPropagation();
    triggerClosedThenOpen(false, 1);
  };

  // Vertical swipe drag handlers on the stage
  const handleStagePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!verticalSwipeEnabled || items.length <= 1) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a, input')) return;
    swipeRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      moved: false,
    };
  };

  const handleStagePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const s = swipeRef.current;
    if (!s.active || s.pointerId !== e.pointerId) return;
    s.active = false;
    const dx = e.clientX - s.startX;
    const dy = e.clientY - s.startY;
    if (Math.abs(dy) >= 34 && Math.abs(dy) > Math.abs(dx) * 1.15) {
      // Swipe up -> next box (+1), swipe down -> previous box (-1)
      handleStep(dy < 0 ? 1 : -1);
    }
  };

  const handleStagePointerCancel = () => {
    swipeRef.current.active = false;
  };

  // Compute stage wrapper transform for inter-box transition
  const getBoxTransitionStyle = (): React.CSSProperties => {
    const entering = transitionStage === 'entering';
    let transform = 'translate3d(0, 0, 0) scale(1) rotateX(0deg)';
    let opacity = 1;

    if (entering) {
      if (transitionEffect === 'slide_vertical') {
        transform = `translate3d(0, ${slideDir > 0 ? 54 : -54}px, 0) scale(0.96)`;
        opacity = 0;
      } else if (transitionEffect === 'fade') {
        transform = 'translate3d(0, 0, 0) scale(1)';
        opacity = 0;
      } else if (transitionEffect === 'zoom_out') {
        transform = 'translate3d(0, 0, 0) scale(1.16)';
        opacity = 0;
      } else if (transitionEffect === 'flip') {
        transform = `rotateY(${slideDir > 0 ? 68 : -68}deg) scale(0.92)`;
        opacity = 0;
      }
    }

    return {
      transform,
      opacity,
      transition: entering
        ? 'none'
        : `transform ${transitionDurationMs}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${Math.round(
            transitionDurationMs * 0.8
          )}ms ease`,
      willChange: 'transform, opacity',
    };
  };

  if (!currentItem) {
    return (
      <div
        className="w-full py-12 px-6 text-center text-xs text-slate-500"
        style={{ backgroundColor: stageBg, borderRadius: `${borderRadius}px` }}
      >
        Belum ada kotak produk. Klik &ldquo;Tambah Kotak&rdquo; di Inspector.
      </div>
    );
  }

  const isVerticalDots = dotsPosition === 'right' || dotsPosition === 'left';
  const currentItemKey = String(currentItem.id || safeIndex);

  const renderDotsStrip = (placement: 'right' | 'left' | 'top' | 'bottom') => {
    if (!showDots || items.length <= 1) return null;
    const isVert = placement === 'right' || placement === 'left';

    if (isVert) {
      return (
        <div
          data-canvas-sublayer="pbr_dots"
          className={`absolute top-1/2 -translate-y-1/2 z-20 flex flex-col items-center gap-2 py-2 px-1.5 rounded-full ${
            placement === 'right' ? 'right-2.5' : 'left-2.5'
          }`}
          style={{
            backgroundColor: 'rgba(255, 255, 255, 0.72)',
            backdropFilter: 'blur(6px)',
            boxShadow: '0 4px 14px rgba(35, 29, 26, 0.09)',
            border: '1px solid rgba(92, 54, 38, 0.1)',
          }}
          role="tablist"
          aria-label="Navigasi slide kotak vertikal"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStep(-1);
            }}
            title="Kotak sebelumnya"
            aria-label="Kotak sebelumnya"
            className="w-5 h-5 rounded-full flex items-center justify-center text-[#5C4B42] hover:bg-black/5 active:scale-90 transition-all cursor-pointer"
          >
            <ChevronUp className="w-3.5 h-3.5" />
          </button>

          <div className="flex flex-col items-center gap-1.5 py-0.5">
            {items.map((item, idx) => {
              const isSelected = idx === safeIndex;
              const dotCol = item.boxColorOverride || defaultBoxColor;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  title={item.title || `Kotak ${idx + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToIndex(idx);
                  }}
                  className="rounded-full transition-all cursor-pointer border-0"
                  style={{
                    width: isSelected ? '8px' : '6px',
                    height: isSelected ? '20px' : '6px',
                    backgroundColor: isSelected ? dotCol : 'rgba(92, 75, 66, 0.32)',
                  }}
                />
              );
            })}
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              handleStep(1);
            }}
            title="Kotak berikutnya"
            aria-label="Kotak berikutnya"
            className="w-5 h-5 rounded-full flex items-center justify-center text-[#5C4B42] hover:bg-black/5 active:scale-90 transition-all cursor-pointer"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      );
    }

    // Horizontal (...) indicator for top or bottom placement
    return (
      <div
        data-canvas-sublayer="pbr_dots"
        className={`flex items-center justify-center gap-2 ${
          placement === 'top' ? 'mb-5' : 'mt-4'
        }`}
        role="tablist"
        aria-label="Navigasi slide kotak"
      >
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleStep(-1);
          }}
          title="Kotak sebelumnya"
          aria-label="Kotak sebelumnya"
          className="w-6 h-6 rounded-full flex items-center justify-center bg-white/80 text-[#5C4B42] hover:bg-white shadow-xs transition-all cursor-pointer"
        >
          <ChevronUp className="w-3.5 h-3.5" />
        </button>

        <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-white/75 shadow-xs border border-black/5">
          {items.map((item, idx) => {
            const isSelected = idx === safeIndex;
            const dotCol = item.boxColorOverride || defaultBoxColor;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={isSelected}
                title={item.title || `Kotak ${idx + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  navigateToIndex(idx);
                }}
                className="rounded-full transition-all cursor-pointer border-0"
                style={{
                  width: isSelected ? '20px' : '7px',
                  height: '7px',
                  backgroundColor: isSelected ? dotCol : 'rgba(92, 75, 66, 0.3)',
                }}
              />
            );
          })}
        </div>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            handleStep(1);
          }}
          title="Kotak berikutnya"
          aria-label="Kotak berikutnya"
          className="w-6 h-6 rounded-full flex items-center justify-center bg-white/80 text-[#5C4B42] hover:bg-white shadow-xs transition-all cursor-pointer"
        >
          <ChevronDown className="w-3.5 h-3.5" />
        </button>
      </div>
    );
  };

  const productTransformScale = zoomEffectEnabled
    ? isOpen
      ? zoomEndScale
      : zoomStartScale
    : zoomEndScale;

  return (
    <div
      ref={rootRef}
      data-pbr-root={blockId}
      data-pbr-state={isOpen ? 'open' : 'closed'}
      onPointerDown={handleStagePointerDown}
      onPointerUp={handleStagePointerUp}
      onPointerCancel={handleStagePointerCancel}
      onMouseEnter={() => {
        isHoveredRef.current = true;
      }}
      onMouseLeave={() => {
        isHoveredRef.current = false;
      }}
      className="relative w-full overflow-hidden select-none"
      style={{
        backgroundColor: stageBg,
        borderRadius: `${borderRadius}px`,
        color: '#2A2421',
        fontFamily: theme.fontFamily || 'inherit',
        touchAction: verticalSwipeEnabled && items.length > 1 ? 'pan-x' : 'auto',
      }}
    >
      {/* Subtle studio lighting vignette matching reference card */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(circle at 50% 34%, rgba(255,255,255,0.68) 0%, rgba(235,233,230,0.22) 58%, rgba(210,206,202,0.24) 100%)',
        }}
      />

      {/* Discreet replay button top-right (shifts slightly if right dots active) */}
      <button
        type="button"
        onClick={handleReplay}
        title="Putar ulang animasi buka kotak"
        aria-label="Putar ulang animasi buka kotak"
        className="absolute top-3.5 right-3.5 z-20 w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
        style={{
          backgroundColor: 'rgba(255,255,255,0.78)',
          color: '#5C4B42',
          boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
        }}
      >
        <RotateCcw className="w-3.5 h-3.5" />
      </button>

      {/* Vertical (...) dots overlay when positioned on right or left */}
      {isVerticalDots && renderDotsStrip(dotsPosition)}

      {/* Main vertical product box stage */}
      <div
        className={`relative z-10 flex flex-col items-center pt-10 pb-7 ${
          isVerticalDots && showDots && items.length > 1
            ? dotsPosition === 'right'
              ? 'pl-5 pr-11'
              : 'pl-11 pr-5'
            : 'px-5'
        }`}
      >
        {/* Top horizontal (...) dots when configured */}
        {dotsPosition === 'top' && renderDotsStrip('top')}

        {/* 3D Perspective Wooden Box Stage with configurable inter-box transition */}
        <div
          data-canvas-sublayer="pbr_box_frame"
          className="relative flex items-center justify-center"
          style={{
            width: `min(${boxSizePx}px, 74vw)`,
            aspectRatio: '1 / 1',
            perspective: '960px',
          }}
        >
          <div
            data-canvas-sublayer={`pbr_${currentItemKey}`}
            className="relative w-full h-full flex items-center justify-center"
            style={getBoxTransitionStyle()}
          >
            {/* Directional studio floor shadow matching reference */}
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0"
              style={{
                borderRadius: '8px',
                transform: 'translate(10px, 18px) scale(0.96)',
                background: 'rgba(24, 16, 12, 0.28)',
                filter: 'blur(20px)',
              }}
            />

            {/* Open Wooden Box Outer Frame (Configurable inner outline wall thickness) */}
            <div
              className="relative w-full h-full"
              style={{
                borderRadius: '7px',
                padding: `${borderThicknessPx}px`,
                background: wood.frameBackground,
                boxShadow:
                  'inset 0 2px 2px rgba(255,255,255,0.22), inset 0 -3px 6px rgba(0,0,0,0.45), 0 14px 28px -8px rgba(20,14,10,0.34)',
                boxSizing: 'border-box',
              }}
            >
              {/* Inner bevel lip around the box cavity */}
              <div
                className="relative w-full h-full overflow-hidden flex items-center justify-center"
                style={{
                  borderRadius: borderThicknessPx <= 4 ? '5px' : '3px',
                  background: wood.cavityBackground,
                  boxShadow:
                    'inset 0 10px 22px rgba(0,0,0,0.78), inset 0 2px 6px rgba(0,0,0,0.65), 0 1px 0 rgba(255,255,255,0.14)',
                }}
              >
                {/* Soft padded velvet cushion contour */}
                <div
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-2 rounded-sm"
                  style={{
                    border: '1px solid rgba(255,255,255,0.04)',
                    background:
                      'radial-gradient(circle at 50% 48%, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0.35) 100%)',
                  }}
                />

                {/* Product Photo inside wooden box with configurable Zoom-Out Start -> End scale */}
                <div
                  data-canvas-sublayer={`pbr_img_${currentItemKey}`}
                  className="relative z-10 w-full h-full flex items-center justify-center p-2.5"
                  style={{
                    opacity: isOpen ? 1 : 0,
                    transform: `scale(${productTransformScale.toFixed(3)})`,
                    transition: suppressLidAnim
                      ? 'none'
                      : 'opacity 540ms cubic-bezier(0.16, 1, 0.3, 1) 240ms, transform 720ms cubic-bezier(0.16, 1, 0.3, 1) 200ms',
                    willChange: 'transform, opacity',
                  }}
                >
                  {currentItem.image ? (
                    <img
                      src={currentItem.image}
                      alt={currentItem.title || 'Foto Produk'}
                      referrerPolicy="no-referrer"
                      draggable={false}
                      className="max-w-full max-h-full object-contain"
                      style={{
                        filter: 'drop-shadow(0 10px 14px rgba(0, 0, 0, 0.58))',
                      }}
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center gap-1.5 text-center px-3">
                      <div
                        className="w-11 h-11 rounded-full flex items-center justify-center"
                        style={{
                          backgroundColor: 'rgba(255,255,255,0.08)',
                          color: 'rgba(255,255,255,0.58)',
                        }}
                      >
                        <ShoppingBag className="w-5 h-5" />
                      </div>
                      <span className="text-[10.5px] font-medium text-white/60">
                        Upload foto produk
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Hinged Wooden Box Lid (Starts CLOSED -> Opens smoothly upward -> Stops open & clear) */}
            <div
              data-canvas-sublayer="pbr_lid_logo"
              aria-hidden="true"
              onClick={() => {
                if (!isOpen) setIsOpen(true);
              }}
              className="absolute inset-0 z-20 flex items-center justify-center"
              style={{
                borderRadius: '7px',
                background: wood.lidBackground,
                transformOrigin: '50% 0%',
                transform: isOpen
                  ? 'rotateX(108deg) translateY(-10px)'
                  : 'rotateX(0deg) translateY(0px)',
                opacity: isOpen ? 0 : 1,
                pointerEvents: isOpen ? 'none' : 'auto',
                cursor: isOpen ? 'default' : 'pointer',
                boxShadow:
                  'inset 0 2px 3px rgba(255,255,255,0.22), inset 0 -4px 8px rgba(0,0,0,0.44), 0 12px 24px -6px rgba(20,14,10,0.34)',
                transition: suppressLidAnim
                  ? 'none'
                  : 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease 520ms',
                willChange: 'transform, opacity',
              }}
            >
              {/* Subtle chamfered border groove on closed wooden lid */}
              <div
                className="pointer-events-none absolute inset-2.5 rounded-[4px]"
                style={{
                  border: '1px solid rgba(255,255,255,0.09)',
                  boxShadow: 'inset 0 1px 4px rgba(0,0,0,0.22)',
                }}
              />
              {/* Top hinge shadow line */}
              <div
                className="pointer-events-none absolute top-0 left-3 right-3 h-[2px]"
                style={{ background: 'rgba(0,0,0,0.28)' }}
              />
              {/* Custom Lid Logo / Image (uploadable per-box or globally, adjustable down to 0px inset) */}
              {showLidLogo && (
                <div
                  className="pointer-events-none absolute inset-0 flex items-center justify-center overflow-hidden"
                  style={{
                    borderRadius: '7px',
                    padding: `${lidLogoPaddingPx}px`,
                    boxSizing: 'border-box',
                  }}
                >
                  <img
                    src={lidLogoUrl}
                    alt="Logo Tutup Kotak"
                    referrerPolicy="no-referrer"
                    draggable={false}
                    style={{
                      width: `${lidLogoSizePct}%`,
                      height: `${lidLogoSizePct}%`,
                      objectFit: lidLogoFit,
                      borderRadius: lidLogoPaddingPx === 0 && lidLogoSizePct >= 98 ? '7px' : '2px',
                      filter:
                        lidLogoPaddingPx === 0 && lidLogoFit === 'cover'
                          ? 'none'
                          : 'drop-shadow(0 2px 4px rgba(0,0,0,0.38))',
                      pointerEvents: 'none',
                    }}
                  />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Product Title, Price & Description */}
        {!hiddenSet.has(`pbr_info_${currentItemKey}`) && (
          <div
            data-canvas-sublayer={`pbr_info_${currentItemKey}`}
            className="mt-6 text-center max-w-[270px]"
          >
            <h3 className="text-[15.5px] font-bold tracking-tight text-[#231D1A] leading-snug">
              {currentItem.title || 'Produk Eksklusif'}
            </h3>
            {currentItem.price && (
              <p className="mt-1 text-[14px] font-bold text-[#6B5A50] tabular-nums">
                {currentItem.price}
              </p>
            )}
            {currentItem.description && (
              <p className="mt-2 text-[11.5px] leading-relaxed text-[#5D514A] whitespace-pre-line">
                {currentItem.description}
              </p>
            )}
          </div>
        )}

        {/* Selectable Variants Chips */}
        {variantList.length > 0 && !hiddenSet.has(`pbr_variant_${currentItemKey}`) && (
          <div
            data-canvas-sublayer={`pbr_variant_${currentItemKey}`}
            className="mt-3.5 flex flex-wrap items-center justify-center gap-1.5 max-w-[280px]"
            role="radiogroup"
            aria-label="Pilih varian produk"
          >
            {variantList.map((variant) => {
              const isSel = variant === activeVariant;
              return (
                <button
                  key={variant}
                  type="button"
                  role="radio"
                  aria-checked={isSel}
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedVariants((prev) => ({ ...prev, [currentItem.id]: variant }));
                  }}
                  className="px-2.5 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer"
                  style={{
                    backgroundColor: isSel ? activeBoxColor : 'rgba(255,255,255,0.84)',
                    color: isSel ? '#FFFFFF' : '#4A3D36',
                    border: isSel
                      ? `1px solid ${activeBoxColor}`
                      : '1px solid rgba(92, 54, 38, 0.16)',
                    boxShadow: isSel ? '0 3px 10px rgba(35,29,26,0.18)' : 'none',
                  }}
                >
                  {variant}
                </button>
              );
            })}
          </div>
        )}

        {/* Box Color Swatches (circular wood swatches matching reference when >= 2 boxes) */}
        {items.length > 1 && (
          <div
            className="mt-4 flex items-center justify-center gap-3"
            role="tablist"
            aria-label="Pilih kotak produk"
          >
            {items.map((item, idx) => {
              const dotColor = item.boxColorOverride || defaultBoxColor;
              const isSelected = idx === safeIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  title={item.title || `Kotak ${idx + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    navigateToIndex(idx);
                  }}
                  className="relative rounded-full transition-transform cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#5C3626]"
                  style={{
                    width: isSelected ? '26px' : '20px',
                    height: isSelected ? '26px' : '20px',
                    background: `radial-gradient(circle at 35% 30%, rgba(255,255,255,0.26) 0%, transparent 55%), ${dotColor}`,
                    boxShadow: isSelected
                      ? '0 0 0 2px #EFEFEF, 0 0 0 3.5px #5C3626, 0 4px 10px rgba(0,0,0,0.18)'
                      : '0 2px 6px rgba(0,0,0,0.16)',
                  }}
                />
              );
            })}
          </div>
        )}

        {/* Bottom horizontal (...) dots when configured */}
        {dotsPosition === 'bottom' && renderDotsStrip('bottom')}

        {/* Action Bar (Cart & Optional Tanya Admin) */}
        {(showCart || adminCtaEnabled) && (
          <div className="mt-5 w-full max-w-[280px] flex flex-wrap items-center justify-center gap-2.5">
            {showCart && (
              <div data-canvas-sublayer="pbr_cart_action" className="flex items-center justify-center">
                {currentQty > 0 ? (
                  <div
                    className="inline-flex items-center gap-1.5 rounded-full px-2 py-1"
                    style={{
                      backgroundColor: '#FFFFFF',
                      boxShadow: '0 4px 14px rgba(35, 29, 26, 0.1)',
                      border: '1px solid rgba(92, 54, 38, 0.14)',
                    }}
                  >
                    <button
                      type="button"
                      aria-label="Kurangi jumlah"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDecCart?.(currentItem, activeVariant || undefined);
                      }}
                      className="w-7 h-7 rounded-full flex items-center justify-center bg-[#EFEAE6] text-[#3B2B23] hover:bg-[#E4DCD5] transition-colors cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onOpenCart?.();
                      }}
                      className="min-w-[26px] text-center text-xs font-bold text-[#231D1A] tabular-nums cursor-pointer"
                    >
                      {currentQty}
                    </button>
                    <button
                      type="button"
                      aria-label="Tambah jumlah"
                      onClick={(e) => {
                        e.stopPropagation();
                        (onIncCart || onAddCart)?.(currentItem, activeVariant || undefined);
                      }}
                      className="w-7 h-7 rounded-full flex items-center justify-center text-white transition-opacity hover:opacity-90 cursor-pointer"
                      style={{ backgroundColor: activeBoxColor }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddCart?.(currentItem, activeVariant || undefined);
                    }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold text-white transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap"
                    style={{
                      backgroundColor: cartButtonBg,
                      boxShadow: '0 6px 16px rgba(92, 54, 38, 0.24)',
                    }}
                  >
                    <ShoppingBag className="w-3.5 h-3.5 shrink-0" />
                    <span>Keranjang</span>
                  </button>
                )}
              </div>
            )}

            {adminCtaEnabled && (
              <button
                data-canvas-sublayer="pbr_admin_cta"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isEditor) {
                    onAdminCtaClick?.(currentItem, activeVariant || undefined);
                  }
                }}
                className="inline-flex items-center justify-center gap-1.5 px-5 py-2.5 rounded-full text-xs font-bold transition-transform active:scale-[0.98] cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: adminCtaBg,
                  color: adminCtaText,
                  boxShadow: '0 6px 16px rgba(15, 23, 42, 0.14)',
                }}
              >
                <MessageCircle className="w-3.5 h-3.5 shrink-0" />
                <span>{adminCtaLabel}</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
