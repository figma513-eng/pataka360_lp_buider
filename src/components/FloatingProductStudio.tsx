import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import { BlockContent, FnbHeroSlideItem, PageTheme } from '../types/builder';

interface FloatingProductStudioProps {
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

function parseColorRgb(
  color: string | undefined,
  fallback: [number, number, number]
): [number, number, number] {
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

export function FloatingProductStudio({
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
}: FloatingProductStudioProps) {
  const items = content.floatingStudioItems ?? [];
  const total = items.length;

  const [virtualPos, setVirtualPos] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [selectedVariantByItem, setSelectedVariantByItem] = useState<Record<string, string>>({});
  const [stageWidth, setStageWidth] = useState<number>(340);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
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
    (targetPos: number, durationMs = 460) => {
      cancelAnimation();
      const fromPos = posRef.current;
      const delta = targetPos - fromPos;
      if (Math.abs(delta) < 0.0005) {
        setPositionImmediate(targetPos);
        return;
      }
      const startTime = performance.now();
      const step = (now: number) => {
        const progress = Math.min(1, (now - startTime) / durationMs);
        const nextPos = fromPos + delta * easeOutCubic(progress);
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

  const animateToItemIndex = useCallback(
    (targetItemIdx: number) => {
      if (total <= 1) return;
      const curRounded = Math.round(posRef.current);
      const curWrapped = wrapIndex(curRounded, total);
      let diff = wrapIndex(targetItemIdx, total) - curWrapped;
      if (diff > total / 2) diff -= total;
      if (diff < -total / 2) diff += total;
      animateToPos(curRounded + diff, 480);
    },
    [animateToPos, total]
  );

  useEffect(() => () => cancelAnimation(), [cancelAnimation]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    const measure = () => {
      if (el.clientWidth > 0) setStageWidth(el.clientWidth);
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

  useEffect(() => {
    if (total <= 1 && posRef.current !== 0) {
      cancelAnimation();
      setPositionImmediate(0);
    }
  }, [total, cancelAnimation, setPositionImmediate]);

  useEffect(() => {
    if (!content.studioAutoplay || isDragging || total <= 1) return;
    const timer = window.setInterval(() => {
      if (dragRef.current.active) return;
      animateToPos(Math.round(posRef.current) + 1, 520);
    }, 3600);
    return () => window.clearInterval(timer);
  }, [content.studioAutoplay, isDragging, total, animateToPos]);

  if (total === 0) {
    return (
      <div className="p-6 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
        Studio Produk Melayang masih kosong — tambahkan produk di panel Konten.
      </div>
    );
  }

  const nearestSlot = Math.round(virtualPos);
  const safeIdx = wrapIndex(nearestSlot, total);
  const activeItem = items[safeIdx];
  const nextPreviewItem = items[wrapIndex(nearestSlot + 1, total)];

  const floorSlot = Math.floor(virtualPos);
  const frac = virtualPos - floorSlot;
  const itemA = items[wrapIndex(floorSlot, total)];
  const itemB = items[wrapIndex(floorSlot + 1, total)];

  // Smooth real-time full-bleed studio spotlight RGB color morphing
  const morphedSpotlight = lerpColor(itemA.gradientFrom, itemB.gradientFrom, frac, [176, 182, 190]);
  const morphedBackdrop = lerpColor(itemA.gradientTo, itemB.gradientTo, frac, [122, 130, 142]);

  const showHeader = Boolean(content.studioShowHeader);
  const showCornerPreview = content.studioShowCornerPreview !== false && total > 1;
  const showInfo = content.studioShowInfo !== false;
  const showPrice = content.studioShowPrice !== false;
  const showSwatches = content.studioShowSwatches !== false && total > 1;
  const showDescription = Boolean(content.studioShowDescription);
  const showCartButton = content.studioShowCartButton !== false;
  const showDots = Boolean(content.studioShowDots);
  const dotsPos = content.studioDotsPosition ?? 'below';
  const levitate = content.studioLevitateEnabled !== false;
  const groundShadow = content.studioGroundShadow !== false;

  const productSize = Math.max(150, Math.min(310, content.studioProductSize ?? 236));
  const imageZoom = Math.max(60, Math.min(180, content.studioImageZoom ?? 100));
  const cornerSize = Math.max(44, Math.min(92, content.studioCornerSize ?? 64));
  const minHeight = Math.max(320, Math.min(560, content.studioMinHeight ?? 430));
  const textColor = content.studioTextColor || '#FFFFFF';

  const swipeStepPx = Math.max(140, stageWidth * 0.58);

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
    if (total <= 1) return;
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
        // ignore
      }
    }

    if (d.intent === 'h') {
      const now = performance.now();
      const dt = Math.max(8, now - d.lastTime);
      d.vx = (e.clientX - d.lastX) / dt;
      d.lastX = e.clientX;
      d.lastTime = now;
      d.dx = dx;
      setPositionImmediate(d.startPos - dx / swipeStepPx);
    }
  };

  const finishDrag = (e?: React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.active) return;
    const wasH = d.intent === 'h';
    const dx = d.dx;
    const vx = d.vx;
    const startPos = d.startPos;
    const curPos = posRef.current;
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

    if (!wasH) return;

    let targetPos = Math.round(curPos);
    if (Math.abs(curPos - startPos) < 0.5) {
      if (dx <= -30 || vx <= -0.3) targetPos = Math.round(startPos) + 1;
      else if (dx >= 30 || vx >= 0.3) targetPos = Math.round(startPos) - 1;
      else targetPos = Math.round(startPos);
    }

    const dist = Math.abs(targetPos - curPos);
    animateToPos(targetPos, Math.max(240, Math.min(480, Math.round(210 + dist * 280))));
  };

  // Persistent 3-slot hero fly pool around nearestSlot: previous, center, next
  const slotIndices = total === 1 ? [0] : [nearestSlot - 1, nearestSlot, nearestSlot + 1];
  const isAtRest = !isDragging && Math.abs(virtualPos - nearestSlot) < 0.01;
  const isTransitioningText = total > 1 && frac > 0.002 && frac < 0.998;
  const activeDotBucket =
    total <= 1 ? 0 : safeIdx === 0 ? 0 : safeIdx === total - 1 ? 2 : 1;

  return (
    <div
      ref={rootRef}
      data-floating-product-studio={blockId}
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
        background: `radial-gradient(circle at 50% 42%, ${morphedSpotlight} 0%, ${morphedBackdrop} 78%)`,
        borderRadius: `${Math.max(0, borderRadius)}px`,
        minHeight: `${minHeight}px`,
        color: textColor,
        touchAction: 'pan-y',
        userSelect: 'none',
        cursor: total <= 1 ? 'default' : isDragging ? 'grabbing' : 'grab',
      }}
      className="relative w-full overflow-hidden flex flex-col justify-between select-none"
    >
      {/* Inline keyframes for subtle studio levitation */}
      <style>{`
        @keyframes fpsLevitate {
          0%, 100% { transform: translate3d(0, 0px, 0); }
          50% { transform: translate3d(0, -8px, 0); }
        }
        @keyframes fpsShadowPulse {
          0%, 100% { transform: translateX(-50%) scaleX(1) scaleY(1); opacity: 0.5; }
          50% { transform: translateX(-50%) scaleX(0.86) scaleY(0.88); opacity: 0.34; }
        }
      `}</style>

      {/* Optional Minimal Studio Header */}
      {showHeader && (
        <div className="relative z-20 flex items-center justify-between px-4 pt-3.5 pb-1">
          <div className="text-[11px] font-bold uppercase tracking-widest opacity-85 truncate">
            {content.studioStoreName || 'Studio Edition'}
          </div>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenCart && computedCartBadge > 0) {
                onOpenCart();
              } else if (showCartButton && onAddCart) {
                onAddCart(activeItem, currentVariant);
              }
            }}
            aria-label="Keranjang"
            className="relative w-9 h-9 rounded-full bg-white/15 hover:bg-white/25 backdrop-blur-xs flex items-center justify-center transition-all cursor-pointer"
          >
            <ShoppingBag className="w-4 h-4 stroke-[2]" />
            {computedCartBadge > 0 && (
              <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-[16px] px-1 rounded-full bg-white text-slate-900 text-[9.5px] font-extrabold flex items-center justify-center tabular-nums shadow-xs">
                {computedCartBadge}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Main Levitating 3D Product Studio Stage */}
      <div
        style={{
          height: `${Math.round(productSize + 64)}px`,
        }}
        className="relative z-10 w-full flex-1 flex items-center justify-center pt-4"
      >
        {slotIndices.map((slotIdx) => {
          const item = items[wrapIndex(slotIdx, total)];
          const rel = slotIdx - virtualPos; // 0 = center, +1 = entering from bottom-right corner, -1 = leaving left
          const absRel = Math.abs(rel);
          const focus = Math.max(0, 1 - absRel);
          const sFocus = smoothstep(focus);

          // Hero-Fly trajectory: incoming item (+1) rises & grows smoothly from lower-right towards center;
          // outgoing item (-1) glides smoothly out left-downwards and fades!
          const tx = rel > 0 ? rel * stageWidth * 0.44 : rel * stageWidth * 0.62;
          const ty = rel > 0 ? rel * 76 : absRel * 18;
          const baseScale = rel > 0 ? 0.34 + 0.66 * sFocus : 0.72 + 0.28 * sFocus;
          const effScale = baseScale * (imageZoom / 100);
          const op = Math.max(0, Math.pow(Math.max(0, 1 - absRel * 0.96), 1.15));
          const z = Math.round(20 - Math.min(16, absRel * 10));

          const isMainFocused = slotIdx === nearestSlot && isAtRest;

          return (
            <div
              key={slotIdx}
              onClick={(e) => {
                if (dragRef.current.moved) {
                  dragRef.current.moved = false;
                  e.stopPropagation();
                  return;
                }
                if (!isEditor) e.stopPropagation();
                if (total > 1) {
                  animateToPos(nearestSlot + 1, 480);
                }
              }}
              style={{
                position: 'absolute',
                left: '50%',
                top: '46%',
                width: `${productSize}px`,
                height: `${productSize}px`,
                transform: `translate3d(-50%, -50%, 0) translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) scale(${effScale.toFixed(4)})`,
                opacity: op,
                zIndex: z,
                pointerEvents: absRel < 0.45 ? 'auto' : 'none',
                willChange: 'transform, opacity',
                cursor: total > 1 ? 'pointer' : 'default',
              }}
              className="flex items-center justify-center"
            >
              <div
                style={{
                  width: '100%',
                  height: '100%',
                  animation:
                    levitate && isMainFocused ? 'fpsLevitate 3.4s ease-in-out infinite' : 'none',
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
                      filter: 'drop-shadow(0px 10px 18px rgba(0, 0, 0, 0.22))',
                      pointerEvents: 'none',
                    }}
                  />
                ) : (
                  <div className="w-36 h-36 rounded-2xl bg-white/15 border border-dashed border-white/40 flex items-center justify-center text-xs text-white/80">
                    PNG Produk
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {/* Detached Levitating Oval Floor Contact Shadow (Video 2 signature!) */}
        {groundShadow && (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              left: '50%',
              bottom: '16px',
              width: `${Math.round(productSize * 0.56)}px`,
              height: '14px',
              borderRadius: '9999px',
              background:
                'radial-gradient(ellipse at center, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.18) 55%, rgba(0,0,0,0) 78%)',
              filter: 'blur(4px)',
              transform: 'translateX(-50%)',
              animation:
                levitate && isAtRest ? 'fpsShadowPulse 3.4s ease-in-out infinite' : 'none',
              pointerEvents: 'none',
              zIndex: 4,
            }}
          />
        )}

        {/* Floating Corner Next-Product Switcher Thumbnail (Video 2 signature!) */}
        {showCornerPreview && nextPreviewItem && (
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              animateToPos(nearestSlot + 1, 480);
            }}
            onPointerDown={(e) => e.stopPropagation()}
            aria-label={`Lihat berikutnya: ${nextPreviewItem.title}`}
            title={`Klik untuk pindah ke ${nextPreviewItem.title}`}
            style={{
              position: 'absolute',
              right: '14px',
              bottom: '8px',
              width: `${cornerSize}px`,
              height: `${Math.round(cornerSize + 14)}px`,
              zIndex: 25,
            }}
            className="group flex flex-col items-center justify-end cursor-pointer transition-transform duration-200 hover:scale-110 active:scale-95"
          >
            <div
              style={{
                width: `${cornerSize}px`,
                height: `${cornerSize}px`,
              }}
              className="flex items-center justify-center"
            >
              {nextPreviewItem.image ? (
                <img
                  src={nextPreviewItem.image}
                  alt={nextPreviewItem.title}
                  draggable={false}
                  referrerPolicy="no-referrer"
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'contain',
                    filter: 'drop-shadow(0px 6px 10px rgba(0,0,0,0.28))',
                  }}
                />
              ) : (
                <div className="w-10 h-10 rounded-xl bg-white/25 border border-white/40" />
              )}
            </div>
            {groundShadow && (
              <span
                aria-hidden="true"
                style={{
                  width: `${Math.round(cornerSize * 0.62)}px`,
                  height: '6px',
                  marginTop: '2px',
                  borderRadius: '9999px',
                  background:
                    'radial-gradient(ellipse at center, rgba(0,0,0,0.42) 0%, rgba(0,0,0,0) 76%)',
                  filter: 'blur(2px)',
                }}
              />
            )}
          </button>
        )}

        {showDots && dotsPos === 'overlay' && total > 1 && (
          <div className="absolute bottom-2 left-4 z-25 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-black/25 backdrop-blur-xs">
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
                    backgroundColor: isAct ? '#FFFFFF' : 'rgba(255,255,255,0.45)',
                  }}
                  className="rounded-full transition-all duration-200 cursor-pointer"
                />
              );
            })}
          </div>
        )}
      </div>

      {/* Optional Info, Swatches, Variants & Cart Footer (All Toggleable Tampil/Sembunyi) */}
      {(showInfo ||
        showSwatches ||
        showDescription ||
        showCartButton ||
        (showDots && dotsPos === 'below')) && (
        <div className="relative z-20 px-5 pb-5 pt-2 text-center space-y-2.5">
          {/* Color Studio Variant Swatches */}
          {showSwatches && (
            <div
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-2"
            >
              {items.map((it, idx) => {
                const isCur = idx === safeIdx;
                return (
                  <button
                    key={it.id}
                    type="button"
                    aria-label={it.title}
                    title={it.title}
                    onClick={() => animateToItemIndex(idx)}
                    style={{
                      background: `linear-gradient(135deg, ${it.gradientFrom || '#CBD5E1'}, ${it.gradientTo || '#475569'})`,
                      boxShadow: isCur ? '0 0 0 2px #FFFFFF, 0 3px 10px rgba(0,0,0,0.35)' : 'none',
                    }}
                    className={`w-5 h-5 rounded-full border border-white/60 transition-transform cursor-pointer ${
                      isCur ? 'scale-115' : 'opacity-75 hover:opacity-100'
                    }`}
                  />
                );
              })}
            </div>
          )}

          {showInfo && (
            <div className="relative min-h-[44px]">
              {isTransitioningText ? (
                <>
                  <div
                    style={{
                      transform: `translate3d(${(-frac * 42).toFixed(1)}px, 0, 0)`,
                      opacity: Math.max(0, 1 - frac * 1.45),
                    }}
                  >
                    <div className="text-[18px] font-bold tracking-tight leading-snug">
                      {itemA.title}
                    </div>
                    {showPrice && (
                      <div className="text-[15px] font-extrabold mt-0.5 opacity-95 tabular-nums">
                        {itemA.price}
                      </div>
                    )}
                  </div>
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      transform: `translate3d(${((1 - frac) * 42).toFixed(1)}px, 0, 0)`,
                      opacity: Math.max(0, (frac - 0.12) * 1.35),
                      pointerEvents: 'none',
                    }}
                  >
                    <div className="text-[18px] font-bold tracking-tight leading-snug">
                      {itemB.title}
                    </div>
                    {showPrice && (
                      <div className="text-[15px] font-extrabold mt-0.5 opacity-95 tabular-nums">
                        {itemB.price}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  <div className="text-[18px] font-bold tracking-tight leading-snug">
                    {activeItem.title}
                  </div>
                  {showPrice && (
                    <div className="text-[15px] font-extrabold mt-0.5 opacity-95 tabular-nums">
                      {activeItem.price}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {showDescription && (activeItem.description || activeItem.subtitle) && (
            <p className="text-[11.5px] leading-relaxed opacity-90 px-1">
              {activeItem.description || activeItem.subtitle}
            </p>
          )}

          {showCartButton && activeVariants.length > 0 && (
            <div
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex flex-wrap items-center justify-center gap-1.5"
            >
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
                    className={`px-2.5 py-0.5 rounded-full text-[10.5px] font-semibold transition-all cursor-pointer ${
                      isSel
                        ? 'bg-white text-slate-900 shadow-xs'
                        : 'bg-white/20 text-white hover:bg-white/30'
                    }`}
                  >
                    {variant}
                  </button>
                );
              })}
            </div>
          )}

          {showCartButton && (
            <div
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center justify-center pt-0.5"
            >
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
                    style={{ backgroundColor: activeItem.gradientTo || theme.accentColor }}
                    className="w-7 h-7 rounded-full text-white flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onAddCart?.(activeItem, currentVariant)}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full bg-white text-slate-900 font-bold text-xs shadow-md hover:scale-[1.02] active:scale-[0.98] transition-transform cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Tambah ke Keranjang</span>
                </button>
              )}
            </div>
          )}

          {showDots && dotsPos === 'below' && total > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-1">
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
                      backgroundColor: isAct ? '#FFFFFF' : 'rgba(255,255,255,0.4)',
                    }}
                    className="rounded-full transition-all duration-200 cursor-pointer"
                  />
                );
              })}
            </div>
          )}

          {isEditor && total > 1 && (
            <div className="pt-0.5 text-[9.5px] opacity-75 font-medium">
              Klik miniatur pojok kanan bawah atau geser untuk ganti warna studio
            </div>
          )}
        </div>
      )}
    </div>
  );
}
