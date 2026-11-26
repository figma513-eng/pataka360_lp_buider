import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  MessageCircle,
  Minus,
  Plus,
  ShoppingBag,
} from 'lucide-react';
import { BlockContent, FnbHeroSlideItem, PageTheme } from '../types/builder';

interface CulinarySpinSliderProps {
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
  onAdminCtaClick?: (item: FnbHeroSlideItem) => void;
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

function smoothstep(x: number): number {
  const c = Math.max(0, Math.min(1, x));
  return c * c * (3 - 2 * c);
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export function CulinarySpinSlider({
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
  onAdminCtaClick,
}: CulinarySpinSliderProps) {
  const items = content.culinarySpinItems ?? [];
  const total = items.length;
  const adminCtaEnabled = Boolean(content.adminCtaEnabled);
  const adminCtaLabel = (content.adminCtaLabel ?? '').trim() || 'Tanya Admin';
  const adminCtaBg = content.adminCtaBgColor || '#16A34A';
  const adminCtaText = content.adminCtaTextColor || '#FFFFFF';

  const [virtualPos, setVirtualPos] = useState<number>(0);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [detailOpen, setDetailOpen] = useState<boolean>(false);
  const [selectedVariantByItem, setSelectedVariantByItem] = useState<Record<string, string>>({});
  const [stageWidth, setStageWidth] = useState<number>(340);

  const rootRef = useRef<HTMLDivElement | null>(null);
  const posRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);
  const swipeStepRef = useRef<number>(180);
  const wheelAccRef = useRef<{ dx: number; timer: number | null }>({ dx: 0, timer: null });
  const dragRef = useRef<{
    active: boolean;
    source: 'pointer' | 'touch' | null;
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
    lastMovedAt: number;
  }>({
    active: false,
    source: null,
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
    lastMovedAt: 0,
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
    (targetPos: number, durationMs = 480) => {
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

  useEffect(() => {
    return () => {
      cancelAnimation();
      if (wheelAccRef.current.timer !== null) {
        window.clearTimeout(wheelAccRef.current.timer);
      }
    };
  }, [cancelAnimation]);

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
    if (!content.culinaryAutoplay || detailOpen || isDragging || total <= 1) return;
    const timer = window.setInterval(() => {
      if (dragRef.current.active) return;
      animateToPos(Math.round(posRef.current) + 1, 560);
    }, 3900);
    return () => window.clearInterval(timer);
  }, [content.culinaryAutoplay, detailOpen, isDragging, total, animateToPos]);

  // Native non-passive touch & wheel listeners so iOS/Android swipe and Mac trackpad horizontal swipe never get cancelled
  useEffect(() => {
    const el = rootRef.current;
    if (!el || total <= 1) return;

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length !== 1) return;
      const target = e.target as HTMLElement | null;
      if (target?.closest('button, input, a')) return;
      const t = e.touches[0];
      cancelAnimation();
      dragRef.current = {
        active: true,
        source: 'touch',
        pointerId: null,
        startX: t.clientX,
        startY: t.clientY,
        startPos: posRef.current,
        lastX: t.clientX,
        lastTime: performance.now(),
        vx: 0,
        dx: 0,
        intent: null,
        moved: false,
        lastMovedAt: dragRef.current.lastMovedAt,
      };
    };

    const onTouchMove = (e: TouchEvent) => {
      const d = dragRef.current;
      if (!d.active || d.source !== 'touch' || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - d.startX;
      const dy = t.clientY - d.startY;
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
        d.lastMovedAt = performance.now();
        setIsDragging(true);
      }
      if (d.intent === 'h') {
        e.preventDefault();
        const now = performance.now();
        const dt = Math.max(8, now - d.lastTime);
        d.vx = (t.clientX - d.lastX) / dt;
        d.lastX = t.clientX;
        d.lastTime = now;
        d.dx = dx;
        d.lastMovedAt = now;
        setPositionImmediate(d.startPos - dx / swipeStepRef.current);
      }
    };

    const onTouchEnd = () => {
      const d = dragRef.current;
      if (!d.active || d.source !== 'touch') return;
      const wasH = d.intent === 'h';
      const dx = d.dx;
      const vx = d.vx;
      const startPos = d.startPos;
      const curPos = posRef.current;
      d.active = false;
      d.source = null;
      d.intent = null;
      setIsDragging(false);
      if (!wasH) return;
      let targetPos = Math.round(curPos);
      if (Math.abs(curPos - startPos) < 0.5) {
        if (dx <= -28 || vx <= -0.28) targetPos = Math.round(startPos) + 1;
        else if (dx >= 28 || vx >= 0.28) targetPos = Math.round(startPos) - 1;
        else targetPos = Math.round(startPos);
      }
      const dist = Math.abs(targetPos - curPos);
      animateToPos(targetPos, Math.max(260, Math.min(520, Math.round(220 + dist * 300))));
    };

    const onWheel = (e: WheelEvent) => {
      if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.15 || Math.abs(e.deltaX) < 3) return;
      e.preventDefault();
      cancelAnimation();
      const nextPos = posRef.current + e.deltaX / (swipeStepRef.current * 1.15);
      setPositionImmediate(nextPos);
      if (wheelAccRef.current.timer !== null) {
        window.clearTimeout(wheelAccRef.current.timer);
      }
      wheelAccRef.current.timer = window.setTimeout(() => {
        wheelAccRef.current.timer = null;
        animateToPos(Math.round(posRef.current), 360);
      }, 120);
    };

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: false });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('wheel', onWheel);
    };
  }, [total, cancelAnimation, setPositionImmediate, animateToPos]);

  if (total === 0) {
    return (
      <div className="p-6 text-center rounded-2xl border border-dashed border-slate-300 bg-slate-50 text-xs text-slate-400">
        Slide Kuliner Putar masih kosong — tambahkan menu di panel Konten.
      </div>
    );
  }

  const nearestSlot = Math.round(virtualPos);
  const safeIdx = wrapIndex(nearestSlot, total);
  const activeItem = items[safeIdx];

  const floorSlot = Math.floor(virtualPos);
  const frac = virtualPos - floorSlot;
  const itemA = items[wrapIndex(floorSlot, total)];
  const itemB = items[wrapIndex(floorSlot + 1, total)];

  const showHeader = content.culinaryShowHeader !== false;
  const showCartBadge = content.culinaryShowCartBadge !== false;
  const showAmbientBlur = content.culinaryShowAmbientBlur !== false;
  const showInfo = content.culinaryShowInfo !== false;
  const showPrice = content.culinaryShowPrice !== false;
  const showDescription = Boolean(content.culinaryShowDescription);
  const showCartButton = content.culinaryShowCartButton !== false;
  const showDots = Boolean(content.culinaryShowDots);
  const dotsPos = content.culinaryDotsPosition ?? 'below';
  const enableDetail = content.culinaryEnableDetail !== false;
  const plateSize = Math.max(140, Math.min(280, content.culinaryPlateSize ?? 216));
  const imageZoom = Math.max(60, Math.min(180, content.culinaryImageZoom ?? 100));
  const spinAngle = Math.max(0, Math.min(120, content.culinarySpinAngle ?? 58));
  const blurOpacityMax = Math.max(0, Math.min(85, content.culinaryBlurOpacity ?? 38)) / 100;
  const blurPx = Math.max(0, Math.min(28, content.culinaryBlurAmount ?? 9));
  const hasShadow = content.culinaryDropShadow !== false;
  const cardBg = content.culinaryCardBg || '#F8FAFC';
  const accentColor = content.culinaryAccentColor || '#F43F5E';

  const swipeStepPx = Math.max(135, stageWidth * 0.54);
  swipeStepRef.current = swipeStepPx;
  // Balanced spin-arc spacing so neighboring plates visibly peek in along the curve on both sides!
  const slotSpacingPx = Math.max(148, stageWidth * 0.56);

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

  const finalizePointerDrag = (endEvent?: PointerEvent | React.PointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d.active || d.source !== 'pointer') return;
    const wasH = d.intent === 'h';
    const dx = d.dx;
    const vx = d.vx;
    const startPos = d.startPos;
    const curPos = posRef.current;
    const ptrId = d.pointerId;

    d.active = false;
    d.source = null;
    d.intent = null;
    d.pointerId = null;
    setIsDragging(false);

    if (rootRef.current && ptrId !== null) {
      try {
        if (rootRef.current.hasPointerCapture(ptrId)) {
          rootRef.current.releasePointerCapture(ptrId);
        }
      } catch {
        // ignore
      }
    }
    void endEvent;

    if (!wasH) return;

    let targetPos = Math.round(curPos);
    if (Math.abs(curPos - startPos) < 0.5) {
      if (dx <= -28 || vx <= -0.28) targetPos = Math.round(startPos) + 1;
      else if (dx >= 28 || vx >= 0.28) targetPos = Math.round(startPos) - 1;
      else targetPos = Math.round(startPos);
    }

    const dist = Math.abs(targetPos - curPos);
    animateToPos(targetPos, Math.max(260, Math.min(520, Math.round(220 + dist * 300))));
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (total <= 1) return;
    // Touch is handled by dedicated non-passive touchstart/touchmove/touchend listeners
    if (e.pointerType === 'touch') return;
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    if ((e.target as HTMLElement).closest('button, input, a')) return;
    // Prevent HTML5 drag / text-selection hijack when dragging with mouse in Canvas or Preview
    e.preventDefault();
    cancelAnimation();
    dragRef.current = {
      active: true,
      source: 'pointer',
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
      lastMovedAt: dragRef.current.lastMovedAt,
    };

    const onWinMove = (ev: PointerEvent) => {
      const d = dragRef.current;
      if (!d.active || d.source !== 'pointer' || ev.pointerId !== d.pointerId) return;
      const dx = ev.clientX - d.startX;
      const dy = ev.clientY - d.startY;
      if (d.intent === null) {
        if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
        if (Math.abs(dy) > Math.abs(dx) * 1.35) {
          d.intent = 'v';
          d.active = false;
          d.source = null;
          setIsDragging(false);
          cleanupWin();
          return;
        }
        d.intent = 'h';
        d.moved = true;
        d.lastMovedAt = performance.now();
        setIsDragging(true);
      }
      if (d.intent === 'h') {
        const now = performance.now();
        const dt = Math.max(8, now - d.lastTime);
        d.vx = (ev.clientX - d.lastX) / dt;
        d.lastX = ev.clientX;
        d.lastTime = now;
        d.dx = dx;
        d.lastMovedAt = now;
        setPositionImmediate(d.startPos - dx / swipeStepRef.current);
      }
    };

    const onWinUp = (ev: PointerEvent) => {
      cleanupWin();
      finalizePointerDrag(ev);
    };

    const cleanupWin = () => {
      window.removeEventListener('pointermove', onWinMove);
      window.removeEventListener('pointerup', onWinUp);
      window.removeEventListener('pointercancel', onWinUp);
    };

    window.addEventListener('pointermove', onWinMove);
    window.addEventListener('pointerup', onWinUp);
    window.addEventListener('pointercancel', onWinUp);
  };

  const handleSlotClick = (slotIdx: number, e: React.MouseEvent) => {
    const recentlyDragged =
      dragRef.current.moved && performance.now() - dragRef.current.lastMovedAt < 260;
    dragRef.current.moved = false;
    if (recentlyDragged) {
      e.stopPropagation();
      return;
    }
    e.stopPropagation();
    if (slotIdx !== nearestSlot) {
      animateToPos(slotIdx, 480);
    } else if (enableDetail) {
      setDetailOpen((v) => !v);
    }
  };

  const slotIndices =
    total === 1
      ? [0]
      : [nearestSlot - 2, nearestSlot - 1, nearestSlot, nearestSlot + 1, nearestSlot + 2];

  const isTransitioningText = total > 1 && frac > 0.002 && frac < 0.998;
  const activeDotBucket =
    total <= 1 ? 0 : safeIdx === 0 ? 0 : safeIdx === total - 1 ? 2 : 1;

  const ambientOpacityA = Math.max(0, 1 - frac * 1.45) * blurOpacityMax;
  const ambientOpacityB = Math.max(0, (frac - 0.15) * 1.25) * blurOpacityMax;

  return (
    <div
      ref={rootRef}
      data-culinary-spin-slider={blockId}
      data-fnb-swipe-zone="true"
      onPointerDown={handlePointerDown}
      onMouseDown={(e) => {
        if (total <= 1 || e.button !== 0) return;
        if ((e.target as HTMLElement).closest('button, input, a')) return;
        e.preventDefault();
      }}
      onDragStart={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
      style={{
        backgroundColor: cardBg,
        borderRadius: `${Math.max(0, borderRadius)}px`,
        minHeight: `${Math.max(330, plateSize + (showInfo || showCartButton ? 160 : 110))}px`,
        touchAction: 'pan-y',
        userSelect: 'none',
        cursor: total <= 1 ? 'default' : isDragging ? 'grabbing' : 'grab',
      }}
      className="relative w-full overflow-hidden flex flex-col justify-between select-none"
    >
      {/* Ambient Blurred Mirror Backdrop (Video 1 signature) */}
      {showAmbientBlur && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 overflow-hidden"
          style={{ zIndex: 1 }}
        >
          {itemA.image && (
            <img
              src={itemA.image}
              alt=""
              draggable={false}
              referrerPolicy="no-referrer"
              style={{
                position: 'absolute',
                left: '50%',
                top: '26%',
                width: `${Math.round(plateSize * 2.1)}px`,
                height: `${Math.round(plateSize * 2.1)}px`,
                objectFit: 'contain',
                transform: `translate3d(-50%, -50%, 0) scale(${(1.02 + frac * 0.08).toFixed(3)}) rotate(${(-frac * 18).toFixed(1)}deg)`,
                filter: `blur(${blurPx}px) saturate(1.15)`,
                opacity: ambientOpacityA,
                willChange: 'transform, opacity',
              }}
            />
          )}
          {total > 1 && itemB.image && frac > 0.01 && (
            <img
              src={itemB.image}
              alt=""
              draggable={false}
              referrerPolicy="no-referrer"
              style={{
                position: 'absolute',
                left: '50%',
                top: '26%',
                width: `${Math.round(plateSize * 2.1)}px`,
                height: `${Math.round(plateSize * 2.1)}px`,
                objectFit: 'contain',
                transform: `translate3d(-50%, -50%, 0) scale(${(1.1 - frac * 0.08).toFixed(3)}) rotate(${((1 - frac) * 18).toFixed(1)}deg)`,
                filter: `blur(${blurPx}px) saturate(1.15)`,
                opacity: ambientOpacityB,
                willChange: 'transform, opacity',
              }}
            />
          )}
          {/* Soft white radial vignette fade towards bottom */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: `linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.3) 58%, ${cardBg} 100%)`,
            }}
          />
        </div>
      )}

      {/* Floating Minimal Header (Video 1: left accent arrow, right round accent cart button + badge) */}
      {showHeader && (
        <div className="relative z-20 flex items-center justify-between px-4 pt-3.5 pb-1">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (detailOpen) {
                setDetailOpen(false);
              } else if (total > 1) {
                animateToPos(Math.round(posRef.current) - 1, 480);
              }
            }}
            aria-label={detailOpen ? 'Tutup detail' : 'Menu sebelumnya'}
            style={{ color: accentColor }}
            className="w-9 h-9 rounded-full flex items-center justify-center hover:bg-black/5 active:scale-95 transition-all cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5 stroke-[2.1]" />
          </button>

          {showCartBadge && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (onOpenCart && computedCartBadge > 0) {
                  onOpenCart();
                } else if (showCartButton && onAddCart) {
                  onAddCart(activeItem, currentVariant);
                } else if (enableDetail) {
                  setDetailOpen((v) => !v);
                }
              }}
              aria-label="Keranjang"
              style={{
                backgroundColor: accentColor,
                boxShadow: `0 8px 20px ${accentColor}55`,
              }}
              className="relative w-10 h-10 rounded-full text-white flex items-center justify-center hover:scale-105 active:scale-95 transition-transform cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 stroke-[2.2]" />
              {computedCartBadge > 0 && (
                <span
                  style={{ color: accentColor }}
                  className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 rounded-full bg-white text-[10px] font-extrabold flex items-center justify-center shadow-sm tabular-nums"
                >
                  {computedCartBadge}
                </span>
              )}
            </button>
          )}
        </div>
      )}

      {/* Spin-Arc Rotational Plate Stage */}
      <div
        style={{
          height: `${Math.round(plateSize + 44)}px`,
        }}
        className="relative z-10 w-full flex items-center justify-center"
      >
        {slotIndices.map((slotIdx) => {
          const item = items[wrapIndex(slotIdx, total)];
          const rel = slotIdx - virtualPos;
          const absRel = Math.abs(rel);
          const focus = Math.max(0, 1 - absRel);
          const smoothFocus = smoothstep(focus);

          const baseScale = 0.68 + 0.32 * smoothFocus;
          const effScale = baseScale * (imageZoom / 100);
          const tx = rel * slotSpacingPx;
          // Arc downward as plates spin off-stage, matching Video 1
          const ty = Math.pow(Math.min(1.4, absRel), 1.35) * 46;
          const rotDeg = rel * spinAngle;
          const op = Math.max(0, 1 - Math.max(0, absRel - 0.95) * 0.85);
          const z = Math.round(20 - Math.min(16, absRel * 10));

          const shadowCss = !hasShadow
            ? 'none'
            : `drop-shadow(0px ${(12 + 10 * smoothFocus).toFixed(1)}px ${(14 + 10 * smoothFocus).toFixed(1)}px rgba(15, 23, 42, ${(0.16 + 0.14 * smoothFocus).toFixed(2)}))`;

          return (
            <div
              key={slotIdx}
              onClick={(e) => handleSlotClick(slotIdx, e)}
              style={{
                position: 'absolute',
                left: '50%',
                top: '50%',
                width: `${plateSize}px`,
                height: `${plateSize}px`,
                transform: `translate3d(-50%, -50%, 0) translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0) rotate(${rotDeg.toFixed(2)}deg) scale(${effScale.toFixed(4)})`,
                opacity: op,
                zIndex: z,
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
                    filter: shadowCss,
                    pointerEvents: 'none',
                  }}
                />
              ) : (
                <div className="w-36 h-36 rounded-full bg-white/90 border border-dashed border-slate-300 flex items-center justify-center text-[11px] text-slate-400">
                  PNG Piring
                </div>
              )}
            </div>
          );
        })}

        {/* Subtle Prev / Next Tap Buttons for 1-click spin on Desktop & Mobile */}
        {total > 1 && (
          <>
            <button
              type="button"
              aria-label="Menu sebelumnya"
              onClick={(e) => {
                e.stopPropagation();
                animateToPos(Math.round(posRef.current) - 1, 460);
              }}
              className="absolute left-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-slate-700 shadow-sm border border-slate-200/70 backdrop-blur-xs flex items-center justify-center active:scale-90 transition-all cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4 stroke-[2.4]" />
            </button>
            <button
              type="button"
              aria-label="Menu berikutnya"
              onClick={(e) => {
                e.stopPropagation();
                animateToPos(Math.round(posRef.current) + 1, 460);
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 z-30 w-8 h-8 rounded-full bg-white/85 hover:bg-white text-slate-700 shadow-sm border border-slate-200/70 backdrop-blur-xs flex items-center justify-center active:scale-90 transition-all cursor-pointer"
            >
              <ChevronRight className="w-4 h-4 stroke-[2.4]" />
            </button>
          </>
        )}

        {showDots && dotsPos === 'overlay' && total > 1 && (
          <div className="absolute bottom-1.5 left-1/2 -translate-x-1/2 z-30 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/45 backdrop-blur-xs">
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

      {/* Optional Info, Variants, Cart & Admin CTA Footer (All Toggleable Tampil/Sembunyi) */}
      {(showInfo || showDescription || showCartButton || adminCtaEnabled || detailOpen || (showDots && dotsPos === 'below')) && (
        <div className="relative z-20 px-5 pb-5 pt-1 text-center space-y-2">
          {showInfo && (
            <div className="relative min-h-[44px]">
              {isTransitioningText ? (
                <>
                  <div
                    style={{
                      transform: `translate3d(${(-frac * 44).toFixed(1)}px, 0, 0)`,
                      opacity: Math.max(0, 1 - frac * 1.45),
                      willChange: 'transform, opacity',
                    }}
                  >
                    <div
                      style={{ color: itemA.titleColor || '#1E293B' }}
                      className="text-[18px] font-bold tracking-tight leading-snug"
                    >
                      {itemA.title}
                    </div>
                    {showPrice && (
                      <div
                        style={{ color: accentColor }}
                        className="text-[15px] font-extrabold mt-0.5 tabular-nums"
                      >
                        {itemA.price}
                      </div>
                    )}
                  </div>
                  <div
                    aria-hidden="true"
                    style={{
                      position: 'absolute',
                      inset: 0,
                      transform: `translate3d(${((1 - frac) * 44).toFixed(1)}px, 0, 0)`,
                      opacity: Math.max(0, (frac - 0.12) * 1.35),
                      pointerEvents: 'none',
                      willChange: 'transform, opacity',
                    }}
                  >
                    <div
                      style={{ color: itemB.titleColor || '#1E293B' }}
                      className="text-[18px] font-bold tracking-tight leading-snug"
                    >
                      {itemB.title}
                    </div>
                    {showPrice && (
                      <div
                        style={{ color: accentColor }}
                        className="text-[15px] font-extrabold mt-0.5 tabular-nums"
                      >
                        {itemB.price}
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div>
                  {activeItem.badge?.trim() && detailOpen && (
                    <span
                      style={{ backgroundColor: `${accentColor}18`, color: accentColor }}
                      className="inline-block mb-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide"
                    >
                      {activeItem.badge}
                    </span>
                  )}
                  <div
                    style={{ color: activeItem.titleColor || '#1E293B' }}
                    className="text-[18px] font-bold tracking-tight leading-snug"
                  >
                    {activeItem.title}
                  </div>
                  {showPrice && (
                    <div
                      style={{ color: accentColor }}
                      className="text-[15px] font-extrabold mt-0.5 tabular-nums"
                    >
                      {activeItem.price}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {(showDescription || detailOpen) && (activeItem.description || activeItem.subtitle) && (
            <p className="text-[11.5px] leading-relaxed text-slate-600 px-1">
              {activeItem.description || activeItem.subtitle}
            </p>
          )}

          {detailOpen && activeVariants.length > 0 && (
            <div
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5"
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
                    style={
                      isSel
                        ? { backgroundColor: accentColor, color: '#FFFFFF', borderColor: accentColor }
                        : undefined
                    }
                    className={`px-3 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
                      isSel
                        ? 'shadow-xs'
                        : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
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
              className="flex items-center justify-center pt-1"
            >
              {activeQty > 0 ? (
                <div className="inline-flex items-center gap-3 px-3 py-1.5 rounded-full bg-white border border-slate-200 text-slate-900 shadow-sm">
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
                    style={{ backgroundColor: accentColor }}
                    className="w-7 h-7 rounded-full text-white flex items-center justify-center cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => onAddCart?.(activeItem, currentVariant)}
                  style={{ backgroundColor: accentColor }}
                  className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full text-white font-bold text-xs shadow-sm hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer"
                >
                  <ShoppingBag className="w-3.5 h-3.5" />
                  <span>Pesan Sekarang</span>
                </button>
              )}
            </div>
          )}

          {adminCtaEnabled && (
            <div
              onClick={(e) => e.stopPropagation()}
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center justify-center pt-1"
            >
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isEditor) onAdminCtaClick?.(activeItem);
                }}
                style={{ backgroundColor: adminCtaBg, color: adminCtaText }}
                className="inline-flex items-center justify-center gap-2 px-5 py-2 rounded-full font-bold text-xs shadow-sm hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer border-0"
              >
                <MessageCircle className="w-3.5 h-3.5 shrink-0" strokeWidth={2.2} />
                <span>{adminCtaLabel}</span>
              </button>
            </div>
          )}

          {showDots && dotsPos === 'below' && total > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-2">
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
                      backgroundColor: isAct ? accentColor : '#CBD5E1',
                    }}
                    className="rounded-full transition-all duration-200 cursor-pointer"
                  />
                );
              })}
            </div>
          )}

          {isEditor && total > 1 && (
            <div className="pt-0.5 text-[9.5px] text-slate-400/90 font-medium">
              Geser piring kiri/kanan untuk efek putar · klik tengah untuk detail
            </div>
          )}
        </div>
      )}
    </div>
  );
}
