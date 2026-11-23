import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  Menu,
  Minus,
  Plus,
  Search,
  ShoppingBag,
  X,
} from 'lucide-react';
import { BlockContent, FnbHeroSlideItem, PageTheme } from '../types/builder';

interface FnbHeroSliderProps {
  blockId: string;
  content: BlockContent;
  theme: PageTheme;
  borderRadius?: number;
  isEditor?: boolean;
  cartQtyMap?: Record<string, number>;
  totalCartCount?: number;
  onAddCart?: (item: FnbHeroSlideItem, variant: string) => void;
  onIncCart?: (item: FnbHeroSlideItem, variant: string) => void;
  onDecCart?: (item: FnbHeroSlideItem, variant: string) => void;
  onOpenCart?: () => void;
}

function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

function parseVariantsList(raw?: string): string[] {
  if (!raw?.trim()) return [];
  return raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseColorRgb(color: string | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!color) return fallback;
  const trimmed = color.trim();
  if (trimmed.startsWith('#')) {
    const hex = trimmed.slice(1);
    if (hex.length === 3) {
      const r = parseInt(hex[0] + hex[0], 16);
      const g = parseInt(hex[1] + hex[1], 16);
      const b = parseInt(hex[2] + hex[2], 16);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return [r, g, b];
    } else if (hex.length >= 6) {
      const r = parseInt(hex.slice(0, 2), 16);
      const g = parseInt(hex.slice(2, 4), 16);
      const b = parseInt(hex.slice(4, 6), 16);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return [r, g, b];
    }
  }
  const rgbMatch = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (rgbMatch) {
    return [
      Math.min(255, Math.max(0, Number(rgbMatch[1]))),
      Math.min(255, Math.max(0, Number(rgbMatch[2]))),
      Math.min(255, Math.max(0, Number(rgbMatch[3]))),
    ];
  }
  return fallback;
}

function lerpColor(
  colorA: string | undefined,
  colorB: string | undefined,
  t: number,
  fallback: [number, number, number]
): string {
  const clamped = Math.max(0, Math.min(1, t));
  const [r1, g1, b1] = parseColorRgb(colorA, fallback);
  const [r2, g2, b2] = parseColorRgb(colorB, fallback);
  const r = Math.round(r1 + (r2 - r1) * clamped);
  const g = Math.round(g1 + (g2 - g1) * clamped);
  const b = Math.round(b1 + (b2 - b1) * clamped);
  return `rgb(${r}, ${g}, ${b})`;
}

function smoothstep(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function FnbHeroSlider({
  blockId,
  content,
  theme,
  borderRadius = 24,
  isEditor = false,
  cartQtyMap = {},
  totalCartCount,
  onAddCart,
  onIncCart,
  onDecCart,
  onOpenCart,
}: FnbHeroSliderProps) {
  const items = content.fnbSliderItems ?? [];
  const total = items.length;

  // Continuous virtual slide position (unbounded float for seamless infinite circular glide)
  const [virtualPos, setVirtualPos] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [detailTransitioning, setDetailTransitioning] = useState<boolean>(false);
  const [searchOpen, setSearchOpen] = useState<boolean>(false);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedVariantByItem, setSelectedVariantByItem] = useState<Record<string, string>>({});
  const [stageWidth, setStageWidth] = useState<number>(340);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const detailTimerRef = useRef<number | null>(null);

  const toggleDetailState = useCallback((next: boolean | ((prev: boolean) => boolean)) => {
    setDetailTransitioning(true);
    setDetailOpen(next);
    if (detailTimerRef.current !== null) window.clearTimeout(detailTimerRef.current);
    detailTimerRef.current = window.setTimeout(() => {
      setDetailTransitioning(false);
      detailTimerRef.current = null;
    }, 460);
  }, []);
  const dragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    startPos: number;
    lastX: number;
    lastTime: number;
    vx: number;
    dx: number;
    intent: 'h' | 'v' | null;
    moved: boolean;
  }>({
    active: false,
    pointerId: null,
    startX: 0,
    startY: 0,
    startPos: 0,
    lastX: 0,
    lastTime: 0,
    vx: 0,
    dx: 0,
    intent: null,
    moved: false,
  });

  const cancelAnimation = useCallback(() => {
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const setPositionImmediate = useCallback((nextPos: number) => {
    posRef.current = nextPos;
    setVirtualPos(nextPos);
  }, []);

  const animateToPos = useCallback(
    (targetPos: number, durationMs = 440) => {
      cancelAnimation();
      const fromPos = posRef.current;
      const delta = targetPos - fromPos;
      if (Math.abs(delta) < 0.0005) {
        setPositionImmediate(targetPos);
        return;
      }
      const startTime = performance.now();
      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / durationMs);
        const eased = easeOutCubic(progress);
        const nextPos = fromPos + delta * eased;
        posRef.current = nextPos;
        setVirtualPos(nextPos);
        if (progress < 1) {
          rafRef.current = window.requestAnimationFrame(step);
        } else {
          rafRef.current = null;
          posRef.current = targetPos;
          setVirtualPos(targetPos);
        }
      };
      rafRef.current = window.requestAnimationFrame(step);
    },
    [cancelAnimation, setPositionImmediate]
  );

  // Shortest circular jump to a target item index
  const animateToItemIndex = useCallback(
    (targetItemIdx: number) => {
      if (total <= 1) return;
      const curRounded = Math.round(posRef.current);
      const curWrapped = wrapIndex(curRounded, total);
      let diff = wrapIndex(targetItemIdx, total) - curWrapped;
      if (diff > total / 2) diff -= total;
      if (diff < -total / 2) diff += total;
      animateToPos(curRounded + diff, 460);
    },
    [animateToPos, total]
  );

  useEffect(() => {
    return () => {
      cancelAnimation();
      if (detailTimerRef.current !== null) window.clearTimeout(detailTimerRef.current);
    };
  }, [cancelAnimation]);

  // Track exact container width responsively across Canvas, Preview (Mobile/Desktop)
  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setStageWidth(w);
    };
    measure();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, []);

  // Keep virtual position clean if items count drops to 1
  useEffect(() => {
    if (total <= 1 && posRef.current !== 0) {
      cancelAnimation();
      setPositionImmediate(0);
    }
  }, [total, cancelAnimation, setPositionImmediate]);

  // Autoplay uses smooth rAF glide (smoothly morphs color + center-scales next cup!)
  useEffect(() => {
    if (!content.fnbSliderAutoplay || detailOpen || isDragging || total <= 1) return;
    const timer = window.setInterval(() => {
      if (dragRef.current.active) return;
      const target = Math.round(posRef.current) + 1;
      animateToPos(target, 520);
    }, 3800);
    return () => window.clearInterval(timer);
  }, [content.fnbSliderAutoplay, detailOpen, isDragging, total, animateToPos]);

  if (total === 0) {
    return (
      <div className="p-6 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
        Slide Produk F&amp;B masih kosong — tambahkan produk di panel Konten.
      </div>
    );
  }

  const nearestSlot = Math.round(virtualPos);
  const safeIdx = wrapIndex(nearestSlot, total);
  const activeItem = items[safeIdx];

  // Continuous color morphing interpolation between floor(virtualPos) and floor(virtualPos)+1
  const floorSlot = Math.floor(virtualPos);
  const frac = virtualPos - floorSlot; // always in [0, 1)
  const itemA = items[wrapIndex(floorSlot, total)];
  const itemB = items[wrapIndex(floorSlot + 1, total)];

  const morphedGradFrom = detailOpen
    ? activeItem.gradientFrom || '#FF9A7B'
    : lerpColor(itemA.gradientFrom, itemB.gradientFrom, frac, [255, 154, 123]);
  const morphedGradTo = detailOpen
    ? activeItem.gradientTo || '#FFB778'
    : lerpColor(itemA.gradientTo, itemB.gradientTo, frac, [255, 183, 120]);
  const morphedAccentRgb = morphedGradFrom;

  const showHeader = content.fnbSliderShowHeader !== false;
  const showSearch = content.fnbSliderShowSearch !== false;
  const showCart = content.fnbSliderShowCart !== false && content.fnbSliderEnableCart !== false;
  const enableDetail = content.fnbSliderEnableDetail !== false;
  const enableCart = content.fnbSliderEnableCart !== false;
  const showDots = Boolean(content.fnbSliderShowDots);
  const dotsPos = content.fnbSliderDotsPosition ?? 'below';
  const archHeight = Math.max(140, Math.min(320, content.fnbSliderArchHeight ?? 205));
  const archCurve = Math.max(30, Math.min(140, content.fnbSliderArchCurve ?? 100));
  const productSize = Math.max(120, Math.min(300, content.fnbSliderProductSize ?? 215));
  const imageZoom = Math.max(60, Math.min(180, content.fnbSliderImageZoom ?? 100));
  const peekScale = Math.max(55, Math.min(92, content.fnbSliderPeekScale ?? 74)) / 100;
  const hasShadow = content.fnbSliderDropShadow !== false;
  const lowerBg = content.fnbSliderCardBg || '#FFFFFF';

  const swipeStepPx = Math.max(140, stageWidth * 0.56);
  const slotSpacingPx = Math.max(142, stageWidth * 0.49);

  const activeVariants = parseVariantsList(activeItem.variants);
  const currentVariant = selectedVariantByItem[activeItem.id] || activeVariants[0] || '';
  const activeQty =
    cartQtyMap[`${activeItem.id}::${currentVariant}`] ??
    cartQtyMap[activeItem.id] ??
    0;
  const computedCartBadge =
    typeof totalCartCount === 'number'
      ? totalCartCount
      : Object.values(cartQtyMap).reduce((sum, n) => sum + (Number(n) || 0), 0);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (detailOpen || total <= 1) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest('button, input, a')) return;
    cancelAnimation();
    dragRef.current = {
      active: true,
      pointerId: e.pointerId,
      startX: e.clientX,
      startY: e.clientY,
      startPos: posRef.current,
      lastX: e.clientX,
      lastTime: performance.now(),
      vx: 0,
      dx: 0,
      intent: null,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.active) return;

    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;

    if (d.intent === null) {
      if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
      if (Math.abs(dy) > Math.abs(dx) * 1.25) {
        // User is scrolling vertically — do not hijack scroll
        d.intent = 'v';
        d.active = false;
        setIsDragging(false);
        return;
      }
      d.intent = 'h';
      d.moved = true;
      setIsDragging(true);
      try {
        e.currentTarget.setPointerCapture(e.pointerId);
      } catch {
        // ignore pointer capture error
      }
    }

    if (d.intent === 'h') {
      const now = performance.now();
      const dt = Math.max(8, now - d.lastTime);
      d.vx = (e.clientX - d.lastX) / dt;
      d.lastX = e.clientX;
      d.lastTime = now;
      d.dx = dx;

      // Dragging finger/mouse left (dx < 0) advances virtualPos forward (+1 = next product)
      const nextPos = d.startPos - dx / swipeStepPx;
      setPositionImmediate(nextPos);
    }
  };

  const finishDrag = (e?: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.active) return;
    const wasHorizontal = d.intent === 'h';
    const dx = d.dx;
    const vx = d.vx;
    const startPos = d.startPos;
    const currentPos = posRef.current;
    const ptrId = d.pointerId;

    d.active = false;
    d.intent = null;
    d.pointerId = null;
    setIsDragging(false);

    if (e && ptrId !== null) {
      try {
        if (e.currentTarget.hasPointerCapture(ptrId)) {
          e.currentTarget.releasePointerCapture(ptrId);
        }
      } catch {
        // ignore
      }
    }

    if (!wasHorizontal) return;

    // Velocity-aware & distance-aware target snapping
    let targetPos = Math.round(currentPos);
    if (Math.abs(currentPos - startPos) < 0.5) {
      if (dx <= -32 || vx <= -0.32) {
        targetPos = Math.round(startPos) + 1;
      } else if (dx >= 32 || vx >= 0.32) {
        targetPos = Math.round(startPos) - 1;
      } else {
        targetPos = Math.round(startPos);
      }
    }

    const distToTarget = Math.abs(targetPos - currentPos);
    const animMs = Math.max(220, Math.min(440, Math.round(200 + distToTarget * 280)));
    animateToPos(targetPos, animMs);
  };

  const handleSlotClick = (slotIdx: number, e: React.MouseEvent) => {
    if (dragRef.current.moved) {
      dragRef.current.moved = false;
      e.stopPropagation();
      return;
    }
    if (!isEditor) e.stopPropagation();
    const relOffset = slotIdx - nearestSlot;
    if (relOffset === 0) {
      if (enableDetail) {
        if (Math.abs(posRef.current - nearestSlot) > 0.005) {
          setPositionImmediate(nearestSlot);
        }
        toggleDetailState((prev) => !prev);
      }
    } else if (!detailOpen) {
      animateToPos(slotIdx, 460);
    }
  };

  const detailDropShadowStyle = hasShadow
    ? 'drop-shadow(0px 26px 26px rgba(15, 23, 42, 0.28))'
    : 'none';

  const matchingSearchItems = searchQuery.trim()
    ? items
        .map((it, idx) => ({ item: it, idx }))
        .filter(
          ({ item }) =>
            item.title.toLowerCase().includes(searchQuery.trim().toLowerCase()) ||
            (item.subtitle ?? '').toLowerCase().includes(searchQuery.trim().toLowerCase())
        )
    : [];

  // 5 persistent virtual slots centered on nearestSlot so incoming +2 / -2 cups glide in seamlessly
  const slotIndices =
    total === 1
      ? [0]
      : [nearestSlot - 2, nearestSlot - 1, nearestSlot, nearestSlot + 1, nearestSlot + 2];

  const cardMinHeight = Math.max(380, archHeight + 175);
  const archRadiusBottomY = `${Math.round(archCurve)}%`;
  const activeDotBucket =
    total <= 1 ? 0 : safeIdx === 0 ? 0 : safeIdx === total - 1 ? 2 : 1;

  const isTransitioningText = !detailOpen && total > 1 && frac > 0.002 && frac < 0.998;

  return (
    <div
      ref={rootRef}
      data-fnb-hero-slider={blockId}
      data-fnb-swipe-zone="true"
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={finishDrag}
      onPointerCancel={finishDrag}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{
        backgroundColor: lowerBg,
        borderRadius: `${Math.max(0, borderRadius)}px`,
        minHeight: `${cardMinHeight}px`,
        touchAction: 'pan-y',
        userSelect: 'none',
        cursor: detailOpen || total <= 1 ? 'default' : isDragging ? 'grabbing' : 'grab',
      }}
      className="relative w-full overflow-hidden flex flex-col justify-between select-none"
    >
      {/* Dynamic Curved Arch Backdrop — Real-Time RGB Morphed Gradient */}
      <div
        aria-hidden="true"
        style={{
          position: 'absolute',
          top: 0,
          left: detailOpen ? '0%' : '-22%',
          width: detailOpen ? '100%' : '144%',
          height: detailOpen ? '100%' : `${archHeight}px`,
          borderBottomLeftRadius: detailOpen ? '0px' : `50% ${archRadiusBottomY}`,
          borderBottomRightRadius: detailOpen ? '0px' : `50% ${archRadiusBottomY}`,
          background: `linear-gradient(155deg, ${morphedGradFrom}, ${morphedGradTo})`,
          transition:
            'left 440ms cubic-bezier(0.22, 1, 0.36, 1), width 440ms cubic-bezier(0.22, 1, 0.36, 1), height 440ms cubic-bezier(0.22, 1, 0.36, 1), border-radius 440ms cubic-bezier(0.22, 1, 0.36, 1)',
          willChange: 'height, border-radius',
          zIndex: 1,
        }}
      />

      {/* Floating Minimalist Top Bar (Menu / Back, Detail Dots, Search, Cart Bag) */}
      {showHeader && (
        <div className="relative z-20 flex items-center justify-between px-4 pt-3.5 pb-1 text-white">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (detailOpen) {
                toggleDetailState(false);
              } else if (enableDetail) {
                toggleDetailState(true);
              }
            }}
            aria-label={detailOpen ? 'Kembali ke daftar slide' : 'Menu produk'}
            className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
          >
            {detailOpen ? (
              <ChevronLeft className="w-5 h-5 stroke-[2.2]" />
            ) : (
              <Menu className="w-5 h-5 stroke-[2]" />
            )}
          </button>

          {/* Center pill slide indicators in Detail mode */}
          {detailOpen && total > 1 ? (
            <div className="flex items-center gap-1.5">
              {items.slice(0, 6).map((it, idx) => {
                const isCur = idx === safeIdx;
                return (
                  <button
                    key={it.id}
                    type="button"
                    aria-label={`Pilih ${it.title}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      animateToItemIndex(idx);
                    }}
                    style={{
                      width: isCur ? '18px' : '6px',
                      height: '5px',
                      backgroundColor: isCur ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
                    }}
                    className="rounded-full transition-all duration-300 cursor-pointer"
                  />
                );
              })}
            </div>
          ) : (
            <div className="flex-1" />
          )}

          <div className="flex items-center gap-1.5">
            {showSearch && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setSearchOpen((v) => !v);
                }}
                aria-label="Cari menu"
                className="w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
              >
                {searchOpen ? <X className="w-4 h-4" /> : <Search className="w-4 h-4 stroke-[2]" />}
              </button>
            )}
            {showCart && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (onOpenCart && computedCartBadge > 0) {
                    onOpenCart();
                  } else if (enableCart && onAddCart) {
                    onAddCart(activeItem, currentVariant);
                  } else if (enableDetail) {
                    toggleDetailState(true);
                  }
                }}
                aria-label="Keranjang belanja"
                className="relative w-8 h-8 rounded-full flex items-center justify-center hover:bg-white/15 active:scale-95 transition-all cursor-pointer"
              >
                <ShoppingBag className="w-4 h-4 stroke-[2]" />
                {computedCartBadge > 0 && (
                  <span
                    style={{
                      backgroundColor: '#FFFFFF',
                      color: morphedAccentRgb || theme.accentColor,
                    }}
                    className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full text-[9.5px] font-extrabold flex items-center justify-center shadow-xs tabular-nums"
                  >
                    {computedCartBadge}
                  </span>
                )}
              </button>
            )}
          </div>
        </div>
      )}

      {/* Optional Quick-Search Popover Bar */}
      {searchOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="relative z-30 mx-4 mt-1 mb-1 rounded-xl bg-white/95 backdrop-blur-md shadow-md border border-white/60 p-2 space-y-1.5"
        >
          <div className="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-100/80">
            <Search className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Cari minuman / menu..."
              className="w-full bg-transparent text-xs text-slate-800 placeholder:text-slate-400 outline-none"
              autoFocus
            />
          </div>
          {searchQuery.trim() && (
            <div className="max-h-32 overflow-y-auto space-y-1">
              {matchingSearchItems.length === 0 ? (
                <div className="text-[11px] text-slate-400 text-center py-1.5">
                  Menu tidak ditemukan
                </div>
              ) : (
                matchingSearchItems.map(({ item, idx }) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      animateToItemIndex(idx);
                      setSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg hover:bg-slate-100 text-left cursor-pointer"
                  >
                    <span className="text-xs font-semibold text-slate-800 truncate">
                      {item.title}
                    </span>
                    <span className="text-[11px] font-bold text-slate-600 shrink-0 tabular-nums">
                      {item.price}
                    </span>
                  </button>
                ))
              )}
            </div>
          )}
        </div>
      )}

      {/* Center-Focus 3D Peek Product Stage (5 Persistent Virtual Slots) */}
      <div
        style={{
          height: `${Math.round(productSize + 24)}px`,
        }}
        className="relative z-10 w-full flex items-center justify-center mt-1"
      >
        {slotIndices.map((slotIdx) => {
          const item = items[wrapIndex(slotIdx, total)];
          const rel = slotIdx - virtualPos; // continuous float: 0 = center, ±1 = side peek, ±2 = edge entry
          const absRel = Math.abs(rel);
          const isNearestCenter = slotIdx === nearestSlot;

          // Hermite smoothstep center-scale bell curve: 1.0 at dead center -> peekScale at ±1
          const focus = Math.max(0, 1 - absRel);
          const smoothFocus = smoothstep(focus);

          const baseScale = detailOpen
            ? isNearestCenter
              ? 1.09
              : peekScale * 0.72
            : peekScale + (1 - peekScale) * smoothFocus;
          const effectiveScale = baseScale * (imageZoom / 100);

          const tx = detailOpen
            ? isNearestCenter
              ? 0
              : rel < 0
              ? -stageWidth * 0.95
              : stageWidth * 0.95
            : rel * slotSpacingPx;

          // Subtle curved vertical arc matching the curved backdrop
          const ty = detailOpen
            ? isNearestCenter
              ? -6
              : 24
            : Math.pow(Math.min(1.5, absRel), 1.15) * 18;

          const slotOpacity = detailOpen
            ? isNearestCenter
              ? 1
              : 0
            : Math.max(0, 1 - Math.max(0, absRel - 0.85) * 0.72);

          const zIndex = isNearestCenter && detailOpen ? 20 : Math.round(20 - Math.min(16, absRel * 10));

          const dynamicShadow = !hasShadow
            ? 'none'
            : detailOpen && isNearestCenter
            ? detailDropShadowStyle
            : `drop-shadow(0px ${(10 + 10 * smoothFocus).toFixed(1)}px ${(10 + 10 * smoothFocus).toFixed(1)}px rgba(15, 23, 42, ${(0.12 + 0.12 * smoothFocus).toFixed(2)}))`;

          return (
            <div
              key={slotIdx}
              onClick={(e) => handleSlotClick(slotIdx, e)}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: `${Math.round(productSize * 0.84)}px`,
                height: `${productSize}px`,
                transform: `translate3d(-50%, -50%, 0) translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${effectiveScale.toFixed(4)})`,
                opacity: slotOpacity,
                zIndex,
                pointerEvents: detailOpen && !isNearestCenter ? 'none' : 'auto',
                transition:
                  (detailOpen || detailTransitioning) && !isDragging
                    ? 'transform 420ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease'
                    : 'none',
                willChange: 'transform, opacity',
                cursor: 'pointer',
              }}
              className="flex items-center justify-center"
            >
              {item.image ? (
                <img
                  src={item.image}
                  alt={item.title}
                  draggable={false}
                  referrerPolicy="no-referrer"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: dynamicShadow,
                    pointerEvents: 'none',
                  }}
                />
              ) : (
                <div className="w-24 h-32 rounded-2xl bg-white/80 border border-dashed border-slate-300 flex items-center justify-center text-[10px] text-slate-400">
                  PNG
                </div>
              )}
            </div>
          );
        })}

        {/* Overlay Dots inside stage if requested */}
        {showDots && dotsPos === 'overlay' && total > 1 && !detailOpen && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-25 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/45 backdrop-blur-xs">
            {[0, 1, 2].map((d) => {
              const isAct = activeDotBucket === d;
              return (
                <button
                  key={d}
                  type="button"
                  aria-label={`Slide ${d + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const target = d === 0 ? 0 : d === 2 ? total - 1 : Math.floor(total / 2);
                    animateToItemIndex(target);
                  }}
                  style={{
                    width: isAct ? '18px' : '6px',
                    height: '6px',
                    backgroundColor: isAct ? '#FFFFFF' : 'rgba(255,255,255,0.5)',
                  }}
                  className="rounded-full transition-all duration-200 cursor-pointer"
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Synchronized Title, Price (Dual-Layer Cross-Glide) & Expanded Detail Body */}
      <div
        className={`relative z-20 px-5 text-center ${detailOpen ? 'pb-5 pt-2' : 'pb-6 pt-1'}`}
      >
        {activeItem.badge?.trim() && detailOpen && (
          <span className="inline-block mb-1.5 px-2.5 py-0.5 rounded-full bg-white/20 backdrop-blur-xs text-[10px] font-bold tracking-wide text-white uppercase">
            {activeItem.badge}
          </span>
        )}

        <div className="relative min-h-[52px]">
          {isTransitioningText ? (
            <>
              {/* Outgoing label A */}
              <div
                style={{
                  transform: `translate3d(${(-frac * 46).toFixed(1)}px, 0, 0)`,
                  opacity: Math.max(0, 1 - frac * 1.45),
                  willChange: 'transform, opacity',
                }}
              >
                <div
                  style={{ color: itemA.titleColor || '#B5836D' }}
                  className="text-[19px] font-semibold tracking-tight leading-snug"
                >
                  {itemA.title}
                </div>
                <div className="text-[17px] font-extrabold mt-0.5 text-slate-800 tabular-nums">
                  {itemA.price}
                </div>
              </div>
              {/* Incoming label B */}
              <div
                aria-hidden="true"
                style={{
                  position: 'absolute',
                  inset: 0,
                  transform: `translate3d(${((1 - frac) * 46).toFixed(1)}px, 0, 0)`,
                  opacity: Math.max(0, (frac - 0.12) * 1.35),
                  pointerEvents: 'none',
                  willChange: 'transform, opacity',
                }}
              >
                <div
                  style={{ color: itemB.titleColor || '#B5836D' }}
                  className="text-[19px] font-semibold tracking-tight leading-snug"
                >
                  {itemB.title}
                </div>
                <div className="text-[17px] font-extrabold mt-0.5 text-slate-800 tabular-nums">
                  {itemB.price}
                </div>
              </div>
            </>
          ) : (
            <div>
              <div
                style={{
                  color: detailOpen ? '#FFFFFF' : activeItem.titleColor || '#B5836D',
                  transition: 'color 300ms ease',
                }}
                className="text-[19px] font-semibold tracking-tight leading-snug"
              >
                {activeItem.title}
              </div>
              <div
                style={{
                  color: detailOpen ? 'rgba(255,255,255,0.95)' : '#1E293B',
                  transition: 'color 300ms ease',
                }}
                className="text-[17px] font-extrabold mt-0.5 tabular-nums"
              >
                {activeItem.price}
              </div>
            </div>
          )}
        </div>

        {/* Expanded Hero Detail Controls (Visible when tapped!) */}
        {detailOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
            className="mt-3 space-y-3 text-left"
          >
            {(activeItem.description || activeItem.subtitle) && (
              <p className="text-[12px] leading-relaxed text-white/90 text-center px-1">
                {activeItem.description || activeItem.subtitle}
              </p>
            )}

            {activeVariants.length > 0 && (
              <div className="flex flex-wrap items-center justify-center gap-1.5">
                {activeVariants.map((variant) => {
                  const isSel = currentVariant === variant;
                  return (
                    <button
                      key={variant}
                      type="button"
                      onClick={() =>
                        setSelectedVariantByItem((prev) => ({
                          ...prev,
                          [activeItem.id]: variant,
                        }))
                      }
                      className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer ${
                        isSel
                          ? 'bg-white text-slate-900 shadow-sm'
                          : 'bg-white/20 text-white hover:bg-white/30'
                      }`}
                    >
                      {variant}
                    </button>
                  );
                })}
              </div>
            )}

            {enableCart && (
              <div className="flex items-center justify-center gap-2 pt-1">
                {activeQty > 0 ? (
                  <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-white text-slate-900 shadow-md">
                    <button
                      type="button"
                      onClick={() => onDecCart?.(activeItem, currentVariant)}
                      aria-label="Kurangi jumlah"
                      className="w-7 h-7 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>
                    <span className="text-sm font-extrabold min-w-[20px] text-center tabular-nums">
                      {activeQty}
                    </span>
                    <button
                      type="button"
                      onClick={() => onIncCart?.(activeItem, currentVariant)}
                      aria-label="Tambah jumlah"
                      className="w-7 h-7 rounded-full text-white flex items-center justify-center cursor-pointer"
                      style={{ backgroundColor: activeItem.gradientFrom || theme.accentColor }}
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={() => onAddCart?.(activeItem, currentVariant)}
                    style={{ color: activeItem.gradientFrom || '#0F172A' }}
                    className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-white font-bold text-xs shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
                  >
                    <ShoppingBag className="w-3.5 h-3.5" />
                    <span>Tambah ke Keranjang</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}

        {/* Optional Below Dots */}
        {showDots && dotsPos === 'below' && total > 1 && !detailOpen && (
          <div className="flex items-center justify-center gap-1.5 pt-3">
            {[0, 1, 2].map((d) => {
              const isAct = activeDotBucket === d;
              return (
                <button
                  key={d}
                  type="button"
                  aria-label={`Slide ${d + 1}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    const target = d === 0 ? 0 : d === 2 ? total - 1 : Math.floor(total / 2);
                    animateToItemIndex(target);
                  }}
                  style={{
                    width: isAct ? '18px' : '6px',
                    height: '6px',
                    backgroundColor: isAct ? morphedAccentRgb || theme.accentColor : '#CBD5E1',
                  }}
                  className="rounded-full transition-all duration-200 cursor-pointer"
                />
              );
            })}
          </div>
        )}

        {/* Subtle editor hint when not in detail mode */}
        {isEditor && !detailOpen && total > 1 && (
          <div className="mt-2 text-[9.5px] text-slate-400/90 font-medium">
            Geser produk ke kiri/kanan atau klik produk tengah untuk preview Detail
          </div>
        )}
      </div>
    </div>
  );
}
