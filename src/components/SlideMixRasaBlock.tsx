import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  Dices,
  MessageCircle,
  ShoppingCart,
} from 'lucide-react';
import type { BlockContent, MixRasaFlavorItem, PageTheme } from '../types/builder';
import {
  type MixRasaCartPayload,
  buildMixRasaCartPayload,
  buildMixRasaWaUrl,
  formatMixRasaRp,
  parseMixRasaPrice,
} from './MixRasaConfigurator';

interface SlideMixRasaBlockProps {
  blockId: string;
  content: BlockContent;
  theme: PageTheme;
  borderRadius?: number;
  isEditor?: boolean;
  onAddMixToCart?: (payload: MixRasaCartPayload) => void;
  onBackClick?: () => void;
  onAdminCtaClick?: (productTitle: string, productPrice: string) => void;
}

function resolveFlavorIndex(
  flavors: MixRasaFlavorItem[],
  preferredId: string | undefined,
  fallbackIdx: number
): number {
  if (!flavors.length) return 0;
  if (preferredId) {
    const idx = flavors.findIndex((f) => f.id === preferredId);
    if (idx !== -1) return idx;
  }
  return ((fallbackIdx % flavors.length) + flavors.length) % flavors.length;
}

function wrapIndex(idx: number, total: number): number {
  if (total <= 0) return 0;
  return ((idx % total) + total) % total;
}

const WHEEL_OFFSETS = [-2, -1, 0, 1, 2] as const;

export function SlideMixRasaBlock({
  blockId,
  content,
  theme,
  borderRadius = 24,
  isEditor = false,
  onAddMixToCart,
  onBackClick,
  onAdminCtaClick,
}: SlideMixRasaBlockProps) {
  const flavors = useMemo(
    () => (Array.isArray(content.slideMixFlavors) ? content.slideMixFlavors : []),
    [content.slideMixFlavors]
  );

  const title = (content.slideMixTitle || 'Pizza Mix Rasa').trim() || 'Pizza Mix Rasa';
  const showProductSize = content.slideMixShowProductSize !== false;
  const productSize = (content.slideMixProductSize || '35 cm').trim() || '35 cm';
  const effectiveSize = showProductSize ? productSize : '';
  const showDescription = Boolean(content.slideMixShowDescription);
  const descriptionText = (content.slideMixDescription || '').trim();
  const showBackButton = content.slideMixShowBackButton !== false;
  const backLabel = (content.slideMixBackLabel ?? 'Menu').trim();
  const centerHeader = content.slideMixCenterHeader !== false;

  const loop = content.slideMixLoop !== false;
  const showDiceButton = content.slideMixShowDiceButton !== false;
  const autoSlide = Boolean(content.slideMixAutoSlide);
  const autoSlideMs = Math.max(1500, Math.min(10000, Number(content.slideMixAutoSlideMs ?? 3200)));

  const rawPreviewSize = Math.max(150, Math.min(320, Number(content.slideMixPreviewSize ?? 236)));
  const rawPeekSize = Math.max(56, Math.min(160, Number(content.slideMixPeekSize ?? 102)));
  const peekOpacity = Math.max(10, Math.min(100, Number(content.slideMixPeekOpacity ?? 58))) / 100;
  const itemGap = Math.max(0, Math.min(64, Number(content.slideMixItemGap ?? 22)));
  const transitionMs = Math.max(180, Math.min(900, Number(content.slideMixTransitionMs ?? 420)));
  const dividerWidth = Math.max(0, Math.min(20, Number(content.slideMixDividerWidth ?? 4)));
  const dividerColor = content.slideMixDividerColor || '#FFFFFF';

  const cardBg = content.slideMixBgColor || '#FFFFFF';
  const accentColor = content.slideMixAccentColor || '#EA6314';
  const pricePrefix = (content.slideMixPricePrefix ?? 'Harga').trim() || 'Harga';

  const buttonSize: 'sm' | 'md' | 'lg' =
    content.slideMixButtonSize === 'sm' || content.slideMixButtonSize === 'lg'
      ? content.slideMixButtonSize
      : 'md';
  const buttonDisplay: 'icon_text' | 'icon_only' =
    content.slideMixButtonDisplay === 'icon_only' ? 'icon_only' : 'icon_text';
  const buttonLayout: 'stack' | 'row' =
    content.slideMixButtonLayout === 'row' ? 'row' : 'stack';

  const floatingCartEnabled = content.slideMixFloatingCartEnabled !== false;
  const cartButtonLabel =
    (content.slideMixCartButtonLabel || 'Gabungkan Rasa').trim() || 'Gabungkan Rasa';
  const cartButtonBg = content.slideMixFloatingCartBg || accentColor;

  const waEnabled = Boolean(content.slideMixWaEnabled);
  const waLabel = (content.slideMixWaLabel || 'Pesan via WhatsApp').trim() || 'Pesan via WhatsApp';
  const waNumber = content.slideMixWaNumber || content.catalogWhatsappNumber || '6281234567890';
  const waIntro = content.slideMixWaIntro ?? 'Halo, saya ingin memesan:';
  const waIncludeDetails = content.slideMixWaIncludeDetails !== false;

  const adminCtaEnabled = Boolean(content.adminCtaEnabled);
  const adminCtaLabel = (content.adminCtaLabel || 'Tanya Admin').trim() || 'Tanya Admin';
  const adminCtaBg = content.adminCtaBgColor || '#1E293B';

  const defaultLeftIdx = useMemo(
    () => resolveFlavorIndex(flavors, content.slideMixDefaultLeftId, 0),
    [flavors, content.slideMixDefaultLeftId]
  );
  const defaultRightIdx = useMemo(
    () => resolveFlavorIndex(flavors, content.slideMixDefaultRightId, flavors.length > 1 ? 1 : 0),
    [flavors, content.slideMixDefaultRightId]
  );

  // Virtual indices increment/decrement continuously so React keeps the exact DOM nodes
  // across steps, allowing silky 60fps native CSS transitions on Y, scale, opacity & z-index.
  const [leftVirtual, setLeftVirtual] = useState<number>(defaultLeftIdx);
  const [rightVirtual, setRightVirtual] = useState<number>(defaultRightIdx);
  const [leftDragProgress, setLeftDragProgress] = useState<number>(0);
  const [rightDragProgress, setRightDragProgress] = useState<number>(0);
  const [isDraggingSide, setIsDraggingSide] = useState<'left' | 'right' | null>(null);
  const [diceSpin, setDiceSpin] = useState(false);
  const [justAdded, setJustAdded] = useState(false);
  const [stageAvailW, setStageAvailW] = useState<number>(360);

  const stageRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    side: 'left' | 'right';
    startX: number;
    startY: number;
    axis: 'x' | 'y' | null;
    moved: boolean;
    progress: number;
  } | null>(null);
  const autoTurnRef = useRef<'left' | 'right'>('right');
  const wheelLockRef = useRef<{ left: number; right: number }>({ left: 0, right: 0 });
  const suppressClickUntilRef = useRef<number>(0);

  useEffect(() => {
    setLeftVirtual(defaultLeftIdx);
  }, [defaultLeftIdx]);

  useEffect(() => {
    setRightVirtual(defaultRightIdx);
  }, [defaultRightIdx]);

  useEffect(() => {
    const el = stageRef.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth;
      if (w > 0) setStageAvailW(w);
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

  // Responsive fitted geometry: guarantees Top Gap === Bottom Gap === itemGap
  // and ensures the Main circle NEVER clips or overflows narrow viewports.
  const maxMainFit = Math.max(140, stageAvailW - 12);
  const fitRatio = rawPreviewSize > maxMainFit ? maxMainFit / rawPreviewSize : 1;
  const mainD = Math.round(rawPreviewSize * fitRatio);
  const peekD = Math.min(Math.round(rawPeekSize * fitRatio), Math.round(mainD * 0.78));
  const gapPx = Math.round(itemGap * (fitRatio < 0.85 ? 0.85 : 1));
  const padY = 14;
  const centerY = padY + peekD + gapPx + mainD / 2;
  const stepDist = mainD / 2 + gapPx + peekD / 2;
  const stageH = padY + peekD + gapPx + mainD + gapPx + peekD + padY;
  const peekScale = mainD > 0 ? peekD / mainD : 0.43;

  const canStep = (virtualIdx: number, delta: number): boolean => {
    if (flavors.length <= 1) return false;
    if (loop) return true;
    const next = virtualIdx + delta;
    return next >= 0 && next < flavors.length;
  };

  const stepSide = (side: 'left' | 'right', delta: number) => {
    if (flavors.length <= 1) return;
    if (side === 'left') {
      setLeftVirtual((prev) => {
        if (!canStep(prev, delta)) return prev;
        return prev + delta;
      });
    } else {
      setRightVirtual((prev) => {
        if (!canStep(prev, delta)) return prev;
        return prev + delta;
      });
    }
  };

  useEffect(() => {
    if (!autoSlide || flavors.length <= 1 || isDraggingSide) return;
    const timer = window.setInterval(() => {
      const turn = autoTurnRef.current;
      autoTurnRef.current = turn === 'right' ? 'left' : 'right';
      stepSide(turn, 1);
    }, autoSlideMs);
    return () => window.clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoSlide, autoSlideMs, flavors.length, loop, isDraggingSide]);

  if (flavors.length === 0) {
    return (
      <div
        className="w-full p-6 text-center border border-dashed border-slate-300 bg-white"
        style={{ borderRadius: `${borderRadius}px` }}
      >
        <p className="text-sm font-bold text-slate-700">Slide Mix Rasa</p>
        <p className="text-xs text-slate-500 mt-1">
          Tambahkan minimal 1 pilihan rasa melalui Inspector.
        </p>
      </div>
    );
  }

  const total = flavors.length;
  const safeLeftIdx = loop
    ? wrapIndex(leftVirtual, total)
    : Math.max(0, Math.min(total - 1, leftVirtual));
  const safeRightIdx = loop
    ? wrapIndex(rightVirtual, total)
    : Math.max(0, Math.min(total - 1, rightVirtual));
  const leftFlavor = flavors[safeLeftIdx];
  const rightFlavor = flavors[safeRightIdx];
  const isSameFlavor = leftFlavor.id === rightFlavor.id;

  const totalAmount = parseMixRasaPrice(leftFlavor.price) + parseMixRasaPrice(rightFlavor.price);
  const selectedPair = [leftFlavor, rightFlavor];

  const waUrl = buildMixRasaWaUrl({
    phone: waNumber,
    title,
    productSize: effectiveSize,
    selectedFlavors: selectedPair,
    totalAmount,
    qty: 1,
    intro: waIntro,
    includeDetails: waIncludeDetails,
  });

  const handlePointerDown = (side: 'left' | 'right', e: React.PointerEvent<HTMLDivElement>) => {
    if ((e.button !== 0 && e.pointerType === 'mouse') || total <= 1) return;
    e.stopPropagation();
    (e.currentTarget as HTMLDivElement).setPointerCapture?.(e.pointerId);
    dragRef.current = {
      side,
      startX: e.clientX,
      startY: e.clientY,
      axis: null,
      moved: false,
      progress: 0,
    };
    setIsDraggingSide(side);
  };

  const handlePointerMove = (side: 'left' | 'right', e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.side !== side) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    if (!dragRef.current.axis && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
      dragRef.current.axis = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'x' : 'y';
      dragRef.current.moved = true;
    }
    if (!dragRef.current.axis) return;

    let rawProgress = 0;
    if (dragRef.current.axis === 'y') {
      rawProgress = dy / Math.max(80, stepDist);
    } else {
      // Smooth horizontal swipe drives the exact same seamless wheel interpolation
      const dirSign = side === 'left' ? 1 : -1;
      rawProgress = (dx * dirSign) / Math.max(90, mainD * 0.62);
    }

    const clamped = Math.max(-1.05, Math.min(1.05, rawProgress));
    dragRef.current.progress = clamped;
    if (side === 'left') setLeftDragProgress(clamped);
    else setRightDragProgress(clamped);
  };

  const finishDrag = (side: 'left' | 'right', e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current || dragRef.current.side !== side) return;
    const { progress, moved } = dragRef.current;
    dragRef.current = null;
    try {
      (e.currentTarget as HTMLDivElement).releasePointerCapture?.(e.pointerId);
    } catch {
      // ignore if capture already released
    }

    setIsDraggingSide(null);
    if (side === 'left') setLeftDragProgress(0);
    else setRightDragProgress(0);

    if (moved) {
      suppressClickUntilRef.current = Date.now() + 260;
    }

    if (moved && Math.abs(progress) >= 0.2) {
      // progress < 0 (dragged up / swiped forward) => advance to next (+1)
      // progress > 0 (dragged down / swiped back) => move to previous (-1)
      stepSide(side, progress < 0 ? 1 : -1);
    }
  };

  const handleWheelSide = (side: 'left' | 'right', e: React.WheelEvent<HTMLDivElement>) => {
    if (total <= 1) return;
    const primaryDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    if (Math.abs(primaryDelta) < 10) return;
    const now = Date.now();
    if (now - wheelLockRef.current[side] < 240) return;
    wheelLockRef.current[side] = now;
    stepSide(side, primaryDelta > 0 ? 1 : -1);
  };

  const handleRandomize = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (total <= 1) return;
    let deltaL = 1 + Math.floor(Math.random() * Math.max(1, total - 1));
    let deltaR = 1 + Math.floor(Math.random() * Math.max(1, total - 1));
    if (!loop) {
      const nextL = Math.floor(Math.random() * total);
      let nextR = Math.floor(Math.random() * total);
      if (nextL === safeLeftIdx && nextR === safeRightIdx) {
        nextR = (safeRightIdx + 1) % total;
      }
      setLeftVirtual(nextL);
      setRightVirtual(nextR);
    } else {
      if (
        wrapIndex(leftVirtual + deltaL, total) === safeLeftIdx &&
        wrapIndex(rightVirtual + deltaR, total) === safeRightIdx
      ) {
        deltaR += 1;
      }
      setLeftVirtual((prev) => prev + deltaL);
      setRightVirtual((prev) => prev - deltaR);
    }
    setDiceSpin(true);
    window.setTimeout(() => setDiceSpin(false), 420);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    const payload = buildMixRasaCartPayload({
      title,
      productSize: effectiveSize,
      sliceCount: 2,
      selectedFlavors: selectedPair,
      totalAmount,
    });
    onAddMixToCart?.(payload);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
  };

  const renderWheelSide = (side: 'left' | 'right') => {
    const virtualIdx = side === 'left' ? leftVirtual : rightVirtual;
    const dragProgress = side === 'left' ? leftDragProgress : rightDragProgress;
    const draggingThis = isDraggingSide === side;
    const seamClip =
      side === 'left'
        ? 'polygon(-100% -100%, 50% -100%, 50% 200%, -100% 200%)'
        : 'polygon(50% -100%, 200% -100%, 200% 200%, 50% 200%)';

    const offsetsToRender = total <= 1 ? ([0] as const) : WHEEL_OFFSETS;

    return (
      <div
        role="slider"
        aria-label={`Geser rasa ${side === 'left' ? 'kiri' : 'kanan'}: ${
          side === 'left' ? leftFlavor.name : rightFlavor.name
        }`}
        aria-valuenow={(side === 'left' ? safeLeftIdx : safeRightIdx) + 1}
        aria-valuemin={1}
        aria-valuemax={total}
        onPointerDown={(e) => handlePointerDown(side, e)}
        onPointerMove={(e) => handlePointerMove(side, e)}
        onPointerUp={(e) => finishDrag(side, e)}
        onPointerCancel={(e) => finishDrag(side, e)}
        onWheel={(e) => handleWheelSide(side, e)}
        className="absolute inset-0 touch-none"
        style={{
          clipPath: seamClip,
          WebkitClipPath: seamClip,
          cursor: total > 1 ? (draggingThis ? 'grabbing' : 'grab') : 'default',
        }}
      >
        {offsetsToRender.map((k) => {
          const itemVirtual = virtualIdx + k;
          if (!loop && (itemVirtual < 0 || itemVirtual >= total)) return null;
          const flavorIdx = loop ? wrapIndex(itemVirtual, total) : itemVirtual;
          const flv = flavors[flavorIdx];
          if (!flv) return null;

          const pos = k + dragProgress;
          const absPos = Math.abs(pos);

          // Continuous Y position: exact equal stepDist above and below center
          const yOffset =
            absPos <= 1
              ? pos * stepDist
              : Math.sign(pos) * (stepDist + (absPos - 1) * (peekD * 0.85 + gapPx));

          // Continuous scale: mainD (1.0) at center -> peekD (peekScale) at ±1 -> gently smaller beyond
          const scale =
            absPos <= 1
              ? 1 - absPos * (1 - peekScale)
              : Math.max(0.24, peekScale * (1 - (absPos - 1) * 0.28));

          // Continuous opacity: 1.0 at center -> peekOpacity at ±1 -> 0 at ±2
          const opacity =
            absPos <= 1
              ? 1 - absPos * (1 - peekOpacity)
              : Math.max(0, peekOpacity * (1 - (absPos - 1)));

          // Main product ALWAYS floats cleanly above top & bottom products
          const zIndex = Math.max(1, Math.round(40 - absPos * 25));
          const isDominant = absPos < 0.45;
          const imgScale = Math.max(50, Math.min(200, Number(flv.imageScale ?? 100))) / 100;

          return (
            <div
              key={`${side}-${itemVirtual}`}
              onClick={(e) => {
                if (Date.now() < suppressClickUntilRef.current) return;
                if (k === -1) {
                  e.stopPropagation();
                  stepSide(side, -1);
                } else if (k === 1) {
                  e.stopPropagation();
                  stepSide(side, 1);
                }
              }}
              style={{
                position: 'absolute',
                left: '50%',
                top: `${centerY}px`,
                width: `${mainD}px`,
                height: `${mainD}px`,
                zIndex,
                opacity,
                transform: `translate3d(-50%, calc(-50% + ${yOffset.toFixed(2)}px), 0) scale(${scale.toFixed(4)})`,
                transition: draggingThis
                  ? 'none'
                  : `transform ${transitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), opacity ${transitionMs}ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow ${transitionMs}ms ease`,
                borderRadius: '9999px',
                overflow: 'hidden',
                backgroundColor: '#F8FAFC',
                boxShadow: isDominant
                  ? '0 18px 36px -12px rgba(15, 23, 42, 0.28), 0 6px 14px rgba(15, 23, 42, 0.10)'
                  : '0 4px 12px rgba(15, 23, 42, 0.08)',
                willChange: 'transform, opacity',
                pointerEvents: absPos <= 1.25 ? 'auto' : 'none',
                cursor: k === -1 || k === 1 ? 'pointer' : undefined,
              }}
            >
              {flv.image ? (
                <img
                  src={flv.image}
                  alt={flv.name}
                  referrerPolicy="no-referrer"
                  draggable={false}
                  className="w-full h-full object-cover select-none pointer-events-none"
                  style={
                    imgScale !== 1
                      ? { transform: `scale(${imgScale})`, transformOrigin: 'center center' }
                      : undefined
                  }
                />
              ) : (
                <div
                  className="w-full h-full flex items-center justify-center text-white text-sm font-bold pointer-events-none"
                  style={{ backgroundColor: flv.accentColor || accentColor }}
                >
                  {flv.name.slice(0, 2).toUpperCase()}
                </div>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  // Button size & display metrics (icon + text vs icon only)
  const isIconOnly = buttonDisplay === 'icon_only';
  const useRowLayout = isIconOnly || buttonLayout === 'row';
  const btnSizeClasses = isIconOnly
    ? buttonSize === 'sm'
      ? 'w-10 h-10 rounded-full'
      : buttonSize === 'lg'
      ? 'w-14 h-14 rounded-full'
      : 'w-12 h-12 rounded-full'
    : buttonSize === 'sm'
    ? 'py-2 px-3.5 text-[12px] rounded-xl gap-1.5'
    : buttonSize === 'lg'
    ? 'py-3.5 px-5 text-[14.5px] rounded-2xl gap-2.5'
    : 'py-2.5 px-4 text-[13px] rounded-xl gap-2';
  const iconSizeClass = isIconOnly
    ? buttonSize === 'sm'
      ? 'w-4 h-4'
      : buttonSize === 'lg'
      ? 'w-[22px] h-[22px]'
      : 'w-[19px] h-[19px]'
    : buttonSize === 'sm'
    ? 'w-3.5 h-3.5'
    : buttonSize === 'lg'
    ? 'w-[18px] h-[18px]'
    : 'w-4 h-4';

  const headerLine = effectiveSize ? `${title}, ${effectiveSize}` : title;
  const sideLabelMaxW = Math.max(68, Math.floor(stageAvailW / 2 - peekD / 2 - 10));

  return (
    <div
      data-slide-mix-rasa-root={blockId}
      className="relative w-full overflow-hidden select-none"
      style={{
        backgroundColor: cardBg,
        borderRadius: `${borderRadius}px`,
        color: '#0F172A',
        fontFamily: theme.fontFamily || 'inherit',
      }}
    >
      <div className="px-3.5 pt-3.5 pb-4 flex flex-col gap-2">
        {/* Header Bar */}
        <div
          data-canvas-sublayer="smr_header"
          className={`relative flex items-center min-h-[34px] ${
            centerHeader ? 'justify-center' : 'justify-start gap-2'
          }`}
        >
          {showBackButton && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBackClick?.();
              }}
              aria-label={backLabel || 'Kembali'}
              className={`${
                centerHeader ? 'absolute left-0 top-1/2 -translate-y-1/2' : ''
              } inline-flex items-center gap-0.5 text-[12.5px] font-bold hover:opacity-80 transition-opacity cursor-pointer shrink-0`}
              style={{ color: accentColor }}
            >
              <ChevronLeft className="w-4 h-4 -ml-1" strokeWidth={2.5} />
              {backLabel && <span>{backLabel}</span>}
            </button>
          )}
          <div
            className={`min-w-0 ${
              centerHeader
                ? `text-center w-full ${showBackButton ? 'px-14' : 'px-2'}`
                : 'text-left flex-1'
            }`}
          >
            <h3 className="text-[14.5px] font-extrabold leading-tight tracking-tight text-slate-900 truncate">
              {headerLine}
            </h3>
          </div>
        </div>

        {/* Optional Product Description */}
        {showDescription && descriptionText && (
          <p
            className={`text-[11.5px] leading-relaxed text-slate-500 -mt-0.5 whitespace-pre-line ${
              centerHeader ? 'text-center px-2' : 'text-left'
            }`}
          >
            {descriptionText}
          </p>
        )}

        {/* Unified 3-Product Symmetric Wheel Stage (Atas, Tengah UTAMA, Bawah) */}
        <div
          ref={stageRef}
          data-canvas-sublayer="smr_stage"
          className="relative w-full overflow-visible"
          style={{ height: `${stageH}px` }}
        >
          {/* Left & Right Continuous Animated Half-Wheels */}
          {renderWheelSide('left')}
          {renderWheelSide('right')}

          {/* Crisp Center Vertical Seam (Always above products, never clips outer arcs) */}
          {dividerWidth > 0 && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 -translate-x-1/2"
              style={{
                top: `${padY}px`,
                bottom: `${padY}px`,
                width: `${dividerWidth}px`,
                backgroundColor: dividerColor,
                zIndex: 45,
              }}
            />
          )}

          {/* Dynamic Flavor Labels (Zero shift to symmetric Top/Bottom gap!) */}
          {isSameFlavor ? (
            <div
              className="pointer-events-none absolute left-1/2 -translate-x-1/2 -translate-y-1/2 px-3 py-1 rounded-full text-center max-w-[84%] border border-slate-200/70 shadow-xs"
              style={{
                top: `${padY + peekD + gapPx / 2}px`,
                zIndex: 48,
                backgroundColor: 'rgba(255, 255, 255, 0.92)',
                backdropFilter: 'blur(6px)',
              }}
            >
              <div className="text-[12.5px] font-extrabold text-slate-900 leading-tight truncate">
                {leftFlavor.name}
              </div>
              <div className="text-[10px] font-medium text-slate-500 leading-tight mt-0.5 truncate">
                {leftFlavor.subtitle?.trim() || 'Resep asli'}
              </div>
            </div>
          ) : (
            <>
              <div
                className="pointer-events-none absolute left-0.5 text-left"
                style={{
                  top: `${padY + Math.round(peekD * 0.52)}px`,
                  transform: 'translateY(-50%)',
                  maxWidth: `${sideLabelMaxW}px`,
                  zIndex: 48,
                }}
              >
                <div
                  className="text-[12.5px] font-bold text-slate-900 leading-tight truncate"
                  style={{ textShadow: '0 1px 4px rgba(255,255,255,0.9)' }}
                >
                  {leftFlavor.name}
                </div>
                <div
                  className="text-[11px] font-semibold text-slate-500 mt-0.5 tabular-nums truncate"
                  style={{ textShadow: '0 1px 4px rgba(255,255,255,0.9)' }}
                >
                  {formatMixRasaRp(parseMixRasaPrice(leftFlavor.price))}
                </div>
              </div>
              <div
                className="pointer-events-none absolute right-0.5 text-right"
                style={{
                  top: `${padY + Math.round(peekD * 0.52)}px`,
                  transform: 'translateY(-50%)',
                  maxWidth: `${sideLabelMaxW}px`,
                  zIndex: 48,
                }}
              >
                <div
                  className="text-[12.5px] font-bold text-slate-900 leading-tight truncate"
                  style={{ textShadow: '0 1px 4px rgba(255,255,255,0.9)' }}
                >
                  {rightFlavor.name}
                </div>
                <div
                  className="text-[11px] font-semibold text-slate-500 mt-0.5 tabular-nums truncate"
                  style={{ textShadow: '0 1px 4px rgba(255,255,255,0.9)' }}
                >
                  {formatMixRasaRp(parseMixRasaPrice(rightFlavor.price))}
                </div>
              </div>
            </>
          )}

          {/* Dice / Acak Kombinasi Button (Bottom-Right beside bottom peek) */}
          {showDiceButton && total > 1 && (
            <button
              type="button"
              onClick={handleRandomize}
              title="Acak Kombinasi Rasa"
              aria-label="Acak Kombinasi Rasa"
              className="absolute right-1 w-10 h-10 rounded-full bg-white border border-slate-200/90 text-slate-700 hover:text-slate-900 flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer"
              style={{
                bottom: `${Math.max(6, padY + Math.round((peekD - 40) / 2))}px`,
                zIndex: 48,
              }}
            >
              <Dices
                className={`w-[18px] h-[18px] transition-transform duration-300 ${
                  diceSpin ? 'rotate-180 scale-110' : ''
                }`}
                strokeWidth={2}
              />
            </button>
          )}
        </div>

        {/* Live Total Price Line */}
        <div className="text-center pt-0.5">
          <div className="text-[14px] font-extrabold text-slate-900 tabular-nums tracking-tight">
            {pricePrefix} {formatMixRasaRp(totalAmount)}
          </div>
        </div>

        {/* Aksi Pemesanan Lynk Builder (Ukuran & Ikon Saja / Ikon + Teks) */}
        {(floatingCartEnabled || waEnabled || adminCtaEnabled) && (
          <div
            data-canvas-sublayer="smr_actions"
            className={`pt-1 ${
              isIconOnly
                ? 'flex flex-wrap items-center justify-center gap-3'
                : useRowLayout
                ? 'flex flex-wrap items-center gap-2'
                : 'flex flex-col gap-2'
            }`}
          >
            {floatingCartEnabled && (
              <button
                type="button"
                onClick={handleAddToCart}
                title={cartButtonLabel}
                aria-label={cartButtonLabel}
                className={`${
                  isIconOnly ? 'shrink-0' : useRowLayout ? 'flex-1 min-w-[120px]' : 'w-full'
                } ${btnSizeClasses} text-white font-extrabold flex items-center justify-center shadow-sm active:scale-[0.97] transition-all cursor-pointer`}
                style={{
                  backgroundColor: justAdded ? '#059669' : cartButtonBg,
                  boxShadow: `0 8px 18px -6px ${justAdded ? '#059669' : cartButtonBg}88`,
                }}
              >
                {justAdded ? (
                  <>
                    <Check className={iconSizeClass} strokeWidth={2.6} />
                    {!isIconOnly && <span className="truncate">Masuk Keranjang!</span>}
                  </>
                ) : (
                  <>
                    <ShoppingCart className={iconSizeClass} strokeWidth={2.2} />
                    {!isIconOnly && <span className="truncate">{cartButtonLabel}</span>}
                  </>
                )}
              </button>
            )}

            {waEnabled && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                title={waLabel}
                aria-label={waLabel}
                onClick={(e) => {
                  e.stopPropagation();
                  if (isEditor) e.preventDefault();
                }}
                className={`${
                  isIconOnly ? 'shrink-0' : useRowLayout ? 'flex-1 min-w-[120px]' : 'w-full'
                } ${btnSizeClasses} text-white font-bold flex items-center justify-center transition-all cursor-pointer no-underline active:scale-[0.97]`}
                style={{
                  backgroundColor: '#16A34A',
                  boxShadow: '0 6px 16px -6px rgba(22, 163, 74, 0.55)',
                }}
              >
                <MessageCircle className={iconSizeClass} strokeWidth={2.2} />
                {!isIconOnly && <span className="truncate">{waLabel}</span>}
              </a>
            )}

            {adminCtaEnabled && (
              <button
                type="button"
                title={adminCtaLabel}
                aria-label={adminCtaLabel}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isEditor) {
                    onAdminCtaClick?.(
                      `${title} (${leftFlavor.name} + ${rightFlavor.name})`,
                      formatMixRasaRp(totalAmount)
                    );
                  }
                }}
                className={`${
                  isIconOnly ? 'shrink-0' : useRowLayout ? 'flex-1 min-w-[120px]' : 'w-full'
                } ${btnSizeClasses} text-white font-bold flex items-center justify-center transition-all cursor-pointer active:scale-[0.97]`}
                style={{
                  backgroundColor: adminCtaBg,
                  boxShadow: `0 6px 14px -6px ${adminCtaBg}66`,
                }}
              >
                <MessageCircle className={iconSizeClass} strokeWidth={2.1} />
                {!isIconOnly && <span className="truncate">{adminCtaLabel}</span>}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
