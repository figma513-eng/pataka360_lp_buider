import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Heart, MessageCircle, ShoppingBag, Star } from 'lucide-react';
import { BlockContent, InteractiveBoxItem, PageTheme } from '../types/builder';

interface InteractiveBoxShowcaseProps {
  blockId: string;
  content: BlockContent;
  theme: PageTheme;
  borderRadius?: number;
  isEditor?: boolean;
  cartQtyMap?: Record<string, number>;
  onAddCart?: (item: InteractiveBoxItem) => void;
  onOpenCart?: () => void;
  onAdminCtaClick?: (item: InteractiveBoxItem) => void;
}

function wrapIndex(index: number, length: number): number {
  if (length <= 0) return 0;
  return ((index % length) + length) % length;
}

function clamp(v: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, v));
}

function smoothstep(x: number): number {
  const c = clamp(x, 0, 1);
  return c * c * (3 - 2 * c);
}

function easeInOutCubic(t: number): number {
  const c = clamp(t, 0, 1);
  return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2;
}

function easeOutCubic(t: number): number {
  const c = clamp(t, 0, 1);
  return 1 - Math.pow(1 - c, 3);
}

function parseHexToRgb(hex: string | undefined, fallback: [number, number, number]): [number, number, number] {
  if (!hex) return fallback;
  const trimmed = hex.trim();
  if (trimmed.startsWith('#')) {
    const raw = trimmed.slice(1);
    if (raw.length === 3) {
      const r = parseInt(raw[0] + raw[0], 16);
      const g = parseInt(raw[1] + raw[1], 16);
      const b = parseInt(raw[2] + raw[2], 16);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return [r, g, b];
    } else if (raw.length >= 6) {
      const r = parseInt(raw.slice(0, 2), 16);
      const g = parseInt(raw.slice(2, 4), 16);
      const b = parseInt(raw.slice(4, 6), 16);
      if (!Number.isNaN(r) && !Number.isNaN(g) && !Number.isNaN(b)) return [r, g, b];
    }
  }
  const m = trimmed.match(/rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
  if (m) {
    return [clamp(Number(m[1]), 0, 255), clamp(Number(m[2]), 0, 255), clamp(Number(m[3]), 0, 255)];
  }
  return fallback;
}

function shiftRgb(rgb: [number, number, number], delta: number): string {
  const r = clamp(Math.round(rgb[0] + delta), 0, 255);
  const g = clamp(Math.round(rgb[1] + delta), 0, 255);
  const b = clamp(Math.round(rgb[2] + delta), 0, 255);
  return `rgb(${r}, ${g}, ${b})`;
}

function deriveBoxPalette(baseColor?: string) {
  const rgb = parseHexToRgb(baseColor, [244, 106, 31]); // #F46A1F signature shoebox orange
  return {
    base: `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`,
    light: shiftRgb(rgb, 24),
    midDark: shiftRgb(rgb, -18),
    deep: shiftRgb(rgb, -38),
    shadowRgba: `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, 0.22)`,
  };
}

export function InteractiveBoxShowcase({
  blockId,
  content,
  theme,
  borderRadius = 24,
  isEditor = false,
  cartQtyMap = {},
  onAddCart,
  onOpenCart,
  onAdminCtaClick,
}: InteractiveBoxShowcaseProps) {
  const items = content.boxShowcaseItems ?? [];
  const total = items.length;
  const slideMode = content.boxShowcaseSlideMode === 'auto' ? 'auto' : 'manual';
  const autoIntervalMs = Math.round(clamp(content.boxShowcaseAutoIntervalSec ?? 2.5, 1.4, 8) * 1000);
  const defaultBoxColor = content.boxShowcaseColor || '#F46A1F';
  const stageBgColor = content.boxShowcaseBgColor || '#F4F4F6';
  const brandLabel = (content.boxShowcaseBrandLabel ?? '').trim();
  const showRating = content.boxShowcaseShowRating !== false;
  const showFavorite = content.boxShowcaseShowFavorite !== false;
  const showCartButton = content.boxShowcaseShowCartButton !== false;
  const adminCtaEnabled = Boolean(content.adminCtaEnabled);
  const adminCtaLabel = (content.adminCtaLabel ?? '').trim() || 'Tanya Admin';
  const adminCtaBg = content.adminCtaBgColor || '#16A34A';
  const adminCtaText = content.adminCtaTextColor || '#FFFFFF';

  const [virtualPos, setVirtualPos] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isHovered, setIsHovered] = useState<boolean>(false);
  const [stageWidth, setStageWidth] = useState<number>(332);
  const [likedIds, setLikedIds] = useState<Record<string, boolean>>({});
  const [brokenImgMap, setBrokenImgMap] = useState<Record<string, boolean>>({});
  const [addedPulse, setAddedPulse] = useState<boolean>(false);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const reducedMotionRef = useRef<boolean>(false);
  const dragRef = useRef<{
    active: boolean;
    pointerId: number | null;
    startX: number;
    startY: number;
    startPos: number;
    lastX: number;
    lastTime: number;
    vx: number;
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
    intent: null,
    moved: false,
  });

  useEffect(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      reducedMotionRef.current = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
  }, []);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const updateWidth = () => {
      const w = el.getBoundingClientRect().width;
      if (w > 120) setStageWidth(w);
    };
    updateWidth();
    if (typeof ResizeObserver !== 'undefined') {
      const ro = new ResizeObserver(updateWidth);
      ro.observe(el);
      return () => ro.disconnect();
    }
    window.addEventListener('resize', updateWidth);
    return () => window.removeEventListener('resize', updateWidth);
  }, []);

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

  useEffect(() => {
    if (total <= 1 && posRef.current !== 0) {
      cancelAnimation();
      setPositionImmediate(0);
    }
  }, [total, cancelAnimation, setPositionImmediate]);

  useEffect(() => () => cancelAnimation(), [cancelAnimation]);

  const animateToPos = useCallback(
    (targetPos: number, durationMs = 760, useInOut = true) => {
      cancelAnimation();
      const fromPos = posRef.current;
      const delta = targetPos - fromPos;
      if (Math.abs(delta) < 0.0005 || reducedMotionRef.current) {
        setPositionImmediate(targetPos);
        return;
      }
      const startTime = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - startTime) / durationMs);
        const eased = useInOut ? easeInOutCubic(progress) : easeOutCubic(progress);
        const nextVal = fromPos + delta * eased;
        posRef.current = nextVal;
        setVirtualPos(nextVal);
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

  const goByDelta = useCallback(
    (delta: number, durationMs = 740, useInOut = true) => {
      if (total <= 1) return;
      const base = Math.round(posRef.current);
      animateToPos(base + delta, durationMs, useInOut);
    },
    [total, animateToPos]
  );

  // Auto Slide timer (choreographed like storyboard 0.0s -> 7.5s)
  useEffect(() => {
    if (slideMode !== 'auto' || total <= 1 || isDragging || isHovered) return;
    const timer = window.setInterval(() => {
      goByDelta(1, 780, true);
    }, autoIntervalMs);
    return () => window.clearInterval(timer);
  }, [slideMode, total, isDragging, isHovered, autoIntervalMs, goByDelta]);

  // Pointer drag handlers for 1:1 tactile horizontal swipe
  const defaultBoxW = Math.round(clamp(stageWidth * 0.51, 134, 188));
  const maxSafeW = Math.max(120, Math.round(stageWidth - 40));
  const boxW =
    typeof content.boxShowcaseBoxWidth === 'number' && Number.isFinite(content.boxShowcaseBoxWidth)
      ? Math.round(clamp(content.boxShowcaseBoxWidth, 100, Math.min(260, maxSafeW)))
      : defaultBoxW;
  const boxH =
    typeof content.boxShowcaseBoxHeight === 'number' && Number.isFinite(content.boxShowcaseBoxHeight)
      ? Math.round(clamp(content.boxShowcaseBoxHeight, 70, 240))
      : Math.round(boxW * 0.64);
  const imageScaleFactor = clamp(content.boxShowcaseImageScale ?? 100, 40, 180) / 100;
  const peekPx = Math.round(clamp(stageWidth * 0.058, 15, 22));
  const slotSpacing = Math.max(Math.round(stageWidth * 0.5 + boxW * 0.5 - peekPx), boxW + 28);

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (total <= 1) return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const target = e.target as HTMLElement | null;
    if (target?.closest('button, a, input')) return;

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
      intent: null,
      moved: false,
    };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.active || d.pointerId !== e.pointerId) return;
    const dx = e.clientX - d.startX;
    const dy = e.clientY - d.startY;
    if (!d.intent) {
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) {
        d.intent = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
      } else {
        return;
      }
    }
    if (d.intent === 'v') {
      d.active = false;
      setIsDragging(false);
      return;
    }

    d.moved = true;
    setIsDragging(true);
    const now = performance.now();
    const dt = Math.max(1, now - d.lastTime);
    d.vx = (e.clientX - d.lastX) / dt;
    d.lastX = e.clientX;
    d.lastTime = now;

    const dragScale = Math.max(180, slotSpacing * 0.95);
    const nextPos = d.startPos - dx / dragScale;
    setPositionImmediate(nextPos);
  };

  const finishDrag = (e: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.active || d.pointerId !== e.pointerId) return;
    d.active = false;
    setIsDragging(false);
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }

    if (!d.moved) return;

    const deltaFromStart = posRef.current - d.startPos;
    let target = Math.round(posRef.current);
    if (Math.abs(d.vx) > 0.35) {
      target = d.vx < 0 ? Math.ceil(d.startPos + 0.05) : Math.floor(d.startPos - 0.05);
    } else if (Math.abs(deltaFromStart) > 0.16) {
      target = deltaFromStart > 0 ? Math.round(d.startPos) + 1 : Math.round(d.startPos) - 1;
    }
    animateToPos(target, 540, false);
  };

  const nearestSlot = Math.round(virtualPos);
  const activeIdx = total > 0 ? wrapIndex(nearestSlot, total) : 0;
  const activeItem: InteractiveBoxItem | undefined = items[activeIdx];
  const activeCartQty = activeItem ? cartQtyMap[activeItem.id] ?? 0 : 0;

  // Text fade & subtle horizontal shift synchronized with swipe (matches frames 1.5s, 4.0s, 7.0s)
  const fractional = virtualPos - nearestSlot; // -0.5 .. +0.5
  const distFromCenter = Math.abs(fractional);
  const textOpacity = clamp(1 - distFromCenter * 3.1, 0, 1);
  const textShiftX = -fractional * 34;

  // Visible box slots around current virtualPos
  const visibleSlots = useMemo(() => {
    if (total === 0) return [];
    if (total === 1) return [0];
    const center = Math.round(virtualPos);
    return [center - 2, center - 1, center, center + 1, center + 2];
  }, [total, Math.round(virtualPos)]);

  const handleBagClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeItem) return;
    if (onAddCart) {
      onAddCart(activeItem);
      setAddedPulse(true);
      window.setTimeout(() => setAddedPulse(false), 380);
    } else if (onOpenCart) {
      onOpenCart();
    }
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!activeItem) return;
    setLikedIds((prev) => ({ ...prev, [activeItem.id]: !prev[activeItem.id] }));
  };

  if (total === 0) {
    return (
      <div
        ref={rootRef}
        style={{ backgroundColor: stageBgColor, borderRadius: `${borderRadius}px` }}
        className="w-full py-12 px-6 text-center text-xs text-slate-500 border border-slate-200"
      >
        Belum ada box produk. Tambahkan box melalui panel Konten.
      </div>
    );
  }

  const stageHeight = Math.round(boxH * 2.15 + 26);

  return (
    <div
      ref={rootRef}
      data-box-showcase={blockId}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      style={{
        background: `linear-gradient(180deg, ${stageBgColor} 0%, #FFFFFF 100%)`,
        borderRadius: `${borderRadius}px`,
        fontFamily: theme.fontFamily ? undefined : "'Plus Jakarta Sans', system-ui, sans-serif",
      }}
      className="relative w-full select-none overflow-hidden flex flex-col justify-between pt-3.5 pb-4"
    >
      {/* Top Header Bar — only shown when brandLabel is filled (empty hides logo & arrows cleanly) */}
      {brandLabel && (
        <div
          data-canvas-sublayer="ibs_header"
          className="relative z-20 flex items-center justify-between px-4 pb-1"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goByDelta(-1, 680, true);
            }}
            disabled={total <= 1}
            aria-label="Box sebelumnya"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#3A3D45] hover:bg-black/5 active:scale-95 disabled:opacity-25 transition-all cursor-pointer border-0 bg-transparent"
          >
            <ChevronLeft className="w-4 h-4" strokeWidth={2.2} />
          </button>

          <div className="flex items-center justify-center min-w-0 px-2">
            <span className="text-[11px] font-extrabold tracking-[0.18em] uppercase text-[#1D1F24] truncate max-w-[170px]">
              {brandLabel}
            </span>
          </div>

          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              goByDelta(1, 680, true);
            }}
            disabled={total <= 1}
            aria-label="Box berikutnya"
            className="w-8 h-8 rounded-full flex items-center justify-center text-[#3A3D45]/45 hover:text-[#3A3D45] hover:bg-black/5 active:scale-95 disabled:opacity-20 transition-all cursor-pointer border-0 bg-transparent"
          >
            <ChevronRight className="w-4 h-4" strokeWidth={2.2} />
          </button>
        </div>
      )}

      {/* 3D Interactive Shoebox Carousel Stage */}
      <div
        data-canvas-sublayer="ibs_stage"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={finishDrag}
        onPointerCancel={finishDrag}
        style={{
          height: `${stageHeight}px`,
          touchAction: 'pan-y',
          perspective: '1050px',
          perspectiveOrigin: '50% 62%',
        }}
        className={`relative w-full overflow-hidden ${
          total > 1 ? (isDragging ? 'cursor-grabbing' : 'cursor-grab') : ''
        }`}
      >
        {visibleSlots.map((slotIdx) => {
          const itemIdx = wrapIndex(slotIdx, total);
          const item = items[itemIdx];
          if (!item) return null;

          const d = slotIdx - virtualPos; // 0 = center, -1 = left peeking, +1 = right peeking
          const absD = Math.abs(d);
          if (absD > 1.75) return null;

          const tx = d * slotSpacing;
          // Choreographed 3D lid physics:
          // - Center (absD <= 0.14): 100% open (lid folded up behind box)
          // - Side peeking (absD >= 0.58): 100% closed (solid orange box lid flat)
          // - Mid-swipe (0.14..0.58): smooth close/open matching frames 1.5s & 4.0s
          const openProgress = 1 - smoothstep((absD - 0.14) / 0.44);
          const lidAngle = openProgress * 162; // 0deg = shut, 162deg = flipped open upward
          const productReveal = smoothstep((openProgress - 0.18) / 0.62);
          const productScale = (0.88 + 0.12 * productReveal) * imageScaleFactor;
          const productLiftY = (1 - productReveal) * 6;
          const palette = deriveBoxPalette(item.boxColorOverride || defaultBoxColor);
          const itemKey = String(item.id || itemIdx);
          const imgSrc = (item.image || '').trim();
          const showImg = Boolean(imgSrc) && !brokenImgMap[`${itemKey}::${imgSrc}`];

          const isSideClickable = absD > 0.45 && total > 1;
          const boxTopY = Math.round(boxH + 14);

          return (
            <div
              key={slotIdx}
              data-canvas-sublayer={absD < 0.35 ? `ibs_${itemKey}` : undefined}
              onClick={(e) => {
                if (!isSideClickable) return;
                if (dragRef.current.moved) return;
                e.stopPropagation();
                animateToPos(slotIdx, 720, true);
              }}
              style={{
                width: `${boxW}px`,
                height: `${boxH}px`,
                left: '50%',
                top: `${boxTopY}px`,
                marginLeft: `${-Math.round(boxW / 2)}px`,
                transform: `translate3d(${tx.toFixed(2)}px, 0px, 0px)`,
                transformStyle: 'preserve-3d',
                zIndex: absD < 0.45 ? 10 : 5,
                willChange: 'transform',
              }}
              className={`absolute ${isSideClickable ? 'cursor-pointer' : ''}`}
            >
              {/* Soft Realistic Contact Shadow Below Shoebox */}
              <div
                style={{
                  position: 'absolute',
                  left: '6%',
                  right: '6%',
                  bottom: '-11px',
                  height: '18px',
                  borderRadius: '50%',
                  background:
                    'radial-gradient(ellipse at center, rgba(25,20,16,0.24) 0%, rgba(25,20,16,0.08) 54%, rgba(25,20,16,0) 78%)',
                  transform: `scaleX(${(0.96 + openProgress * 0.04).toFixed(3)})`,
                  pointerEvents: 'none',
                }}
              />

              {/* Outer Shoebox Base Tray (Orange Walls + Warm Kraft Interior Cavity) */}
              <div
                style={{
                  position: 'relative',
                  width: '100%',
                  height: '100%',
                  borderRadius: '4px',
                  background: `linear-gradient(180deg, ${palette.base} 0%, ${palette.midDark} 86%, ${palette.deep} 100%)`,
                  boxShadow:
                    '0 10px 22px -6px rgba(18, 16, 14, 0.22), 0 2px 6px rgba(18, 16, 14, 0.12)',
                  padding: '5px 7px 9px 7px',
                  boxSizing: 'border-box',
                }}
              >
                {/* Crisp subtle left/right wall bevel highlights */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '4px',
                    borderTop: `1px solid ${palette.light}`,
                    borderBottom: `2px solid ${palette.deep}`,
                    pointerEvents: 'none',
                  }}
                />

                {/* Recessed Warm Kraft Corrugated Cardboard Interior */}
                <div
                  style={{
                    position: 'relative',
                    width: '100%',
                    height: '100%',
                    borderRadius: '2px',
                    background:
                      'linear-gradient(180deg, #D3B28C 0%, #E5CAAA 44%, #DFC19C 100%)',
                    boxShadow:
                      'inset 0 11px 16px rgba(72, 42, 16, 0.26), inset 7px 0 10px rgba(72, 42, 16, 0.16), inset -7px 0 10px rgba(72, 42, 16, 0.16), inset 0 -5px 8px rgba(72, 42, 16, 0.14)',
                    overflow: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  {/* Subtle Kraft Interior Back Wall Depth Strip */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '14%',
                      background:
                        'linear-gradient(180deg, rgba(95,58,24,0.22) 0%, rgba(95,58,24,0.03) 100%)',
                      pointerEvents: 'none',
                    }}
                  />

                  {/* Product Nestled Inside the Box Cavity */}
                  <div
                    style={{
                      position: 'relative',
                      width: '92%',
                      height: '92%',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      opacity: productReveal,
                      transform: `translate3d(0, ${productLiftY.toFixed(2)}px, 0) scale(${productScale.toFixed(3)})`,
                      willChange: 'transform, opacity',
                    }}
                  >
                    {showImg ? (
                      <img
                        src={imgSrc}
                        alt={item.title || 'Produk'}
                        draggable={false}
                        referrerPolicy="no-referrer"
                        onError={() =>
                          setBrokenImgMap((prev) => ({
                            ...prev,
                            [`${itemKey}::${imgSrc}`]: true,
                          }))
                        }
                        style={{
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          filter: 'drop-shadow(0 6px 8px rgba(32, 19, 8, 0.28))',
                          pointerEvents: 'none',
                        }}
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center text-[#7C5B3A]/70 text-[10px] font-semibold">
                        <ShoppingBag className="w-6 h-6 mb-1 opacity-70" />
                        <span className="truncate max-w-[110px]">{item.title || 'Produk'}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* 3D Hinged Shoebox Lid (Rotates upward around TOP back hinge 0deg -> 162deg) */}
              <div
                style={{
                  position: 'absolute',
                  top: '-1px',
                  left: '-2px',
                  right: '-2px',
                  height: `${boxH + 2}px`,
                  transformOrigin: '50% 0%',
                  transform: `rotateX(${lidAngle.toFixed(2)}deg)`,
                  transformStyle: 'preserve-3d',
                  pointerEvents: 'none',
                  willChange: 'transform',
                }}
              >
                {/* FRONT FACE: Closed Solid Orange Shoebox Lid (Visible when closed / mid-swipe) */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '4px',
                    background: `linear-gradient(160deg, ${palette.light} 0%, ${palette.base} 38%, ${palette.midDark} 100%)`,
                    boxShadow:
                      'inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -5px 0 rgba(0,0,0,0.14), 0 6px 14px rgba(0,0,0,0.16)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    overflow: 'hidden',
                  }}
                >
                  {/* Subtle closed box lid rim crease (clean solid surface without brand logo) */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: '8px',
                      height: '1px',
                      background: 'rgba(255,255,255,0.22)',
                    }}
                  />
                </div>

                {/* BACK FACE: Open Lid Underside (Warm Kraft Cardboard + Top Orange Lip Strip!) */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    borderRadius: '4px 4px 2px 2px',
                    transform: 'rotateX(180deg)',
                    backfaceVisibility: 'hidden',
                    WebkitBackfaceVisibility: 'hidden',
                    background:
                      'linear-gradient(180deg, #EAD4B8 0%, #E1C6A4 58%, #D4B38C 100%)',
                    boxShadow:
                      'inset 0 -10px 14px rgba(78, 48, 18, 0.16), inset 5px 0 8px rgba(78, 48, 18, 0.08), inset -5px 0 8px rgba(78, 48, 18, 0.08)',
                    overflow: 'hidden',
                  }}
                >
                  {/* Signature Vivid Orange Top Lip Rim Strip (Matches reference open lid top edge!) */}
                  <div
                    style={{
                      position: 'absolute',
                      top: 0,
                      left: 0,
                      right: 0,
                      height: '12px',
                      background: `linear-gradient(180deg, ${palette.light} 0%, ${palette.base} 55%, ${palette.midDark} 100%)`,
                      boxShadow: '0 2px 4px rgba(65, 36, 12, 0.2)',
                    }}
                  />
                  {/* Subtle inner side fold lines for authentic cardboard lid craft */}
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      left: '7px',
                      bottom: '4px',
                      width: '1px',
                      background: 'rgba(110, 72, 34, 0.16)',
                    }}
                  />
                  <div
                    style={{
                      position: 'absolute',
                      top: '12px',
                      right: '7px',
                      bottom: '4px',
                      width: '1px',
                      background: 'rgba(110, 72, 34, 0.16)',
                    }}
                  />
                  {/* Bottom hinge shadow crease */}
                  <div
                    style={{
                      position: 'absolute',
                      left: 0,
                      right: 0,
                      bottom: 0,
                      height: '8px',
                      background:
                        'linear-gradient(0deg, rgba(72, 42, 16, 0.22) 0%, rgba(72, 42, 16, 0) 100%)',
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Synchronized Center-Aligned Product Info Block */}
      <div
        data-canvas-sublayer="ibs_info"
        style={{
          opacity: textOpacity,
          transform: `translate3d(${textShiftX.toFixed(2)}px, 0, 0)`,
          willChange: 'transform, opacity',
        }}
        className="px-6 pt-1 pb-3 text-center min-h-[78px] flex flex-col items-center justify-center"
      >
        {(activeItem?.category || '').trim() && (
          <div className="text-[9.5px] font-semibold tracking-[0.12em] uppercase text-[#9AA0AA] mb-1">
            {activeItem?.category}
          </div>
        )}
        <div
          style={{ textWrap: 'balance' }}
          className="text-[14.5px] font-semibold text-[#23262D] leading-snug max-w-[210px] line-clamp-2"
        >
          {activeItem?.title || 'Produk'}
        </div>
        {(activeItem?.price || '').trim() && (
          <div className="text-[18px] font-extrabold text-[#14161B] tabular-nums mt-1.5 tracking-tight">
            {activeItem?.price}
          </div>
        )}
      </div>

      {/* Bottom Minimalist Action Row (Rating Left · Circular Dark Bag Center · Heart Right) */}
      {(showRating || showCartButton || showFavorite) && (
        <div
          data-canvas-sublayer="ibs_actions"
          className="relative z-20 flex items-center justify-between px-6 pt-1"
        >
          {/* Left: Rating Indicator */}
          <div className="w-12 flex items-center justify-start">
            {showRating && (activeItem?.rating || '').trim() && (
              <div
                style={{
                  opacity: clamp(0.35 + textOpacity * 0.65, 0.35, 1),
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-white shadow-[0_3px_10px_rgba(15,23,42,0.08)] border border-black/[0.04] text-[10.5px] font-bold text-[#252830] tabular-nums"
              >
                <span>{activeItem?.rating}</span>
                <Star className="w-2.5 h-2.5 fill-[#252830] text-[#252830]" />
              </div>
            )}
          </div>

          {/* Center: Signature Dark Circular Shopping Bag Button */}
          <div className="flex items-center justify-center">
            {showCartButton && (
              <button
                type="button"
                onClick={handleBagClick}
                aria-label={`Tambah ${activeItem?.title || 'produk'} ke keranjang`}
                style={{
                  transform: addedPulse ? 'scale(0.9)' : 'scale(1)',
                }}
                className="relative w-12 h-12 rounded-full bg-[#25272D] hover:bg-[#16181D] text-white shadow-[0_8px_20px_rgba(20,22,28,0.28)] flex items-center justify-center transition-transform duration-150 cursor-pointer border-0"
              >
                <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={2} />
                {activeCartQty > 0 && (
                  <span
                    style={{ backgroundColor: defaultBoxColor }}
                    className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full text-[10px] font-extrabold text-white flex items-center justify-center tabular-nums shadow-xs"
                  >
                    {activeCartQty}
                  </span>
                )}
              </button>
            )}
          </div>

          {/* Right: Clean Favorite Heart Button */}
          <div className="w-12 flex items-center justify-end">
            {showFavorite && activeItem && (
              <button
                type="button"
                onClick={handleToggleFavorite}
                aria-label="Simpan favorit"
                className="w-9 h-9 rounded-full bg-white shadow-[0_3px_10px_rgba(15,23,42,0.08)] border border-black/[0.04] flex items-center justify-center text-[#8B919C] hover:text-[#EF4444] active:scale-95 transition-all cursor-pointer"
              >
                <Heart
                  className={`w-4 h-4 transition-colors ${
                    likedIds[activeItem.id] ? 'fill-[#EF4444] text-[#EF4444]' : ''
                  }`}
                  strokeWidth={1.9}
                />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Optional Customizable "Tanya Admin" Action Button */}
      {adminCtaEnabled && activeItem && (
        <div
          onClick={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          className="relative z-20 flex items-center justify-center px-6 pt-3"
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (!isEditor) onAdminCtaClick?.(activeItem);
            }}
            style={{ backgroundColor: adminCtaBg, color: adminCtaText }}
            className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-full text-xs font-bold shadow-[0_6px_16px_rgba(15,23,42,0.14)] hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer border-0"
          >
            <MessageCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
            <span>{adminCtaLabel}</span>
          </button>
        </div>
      )}
    </div>
  );
}
