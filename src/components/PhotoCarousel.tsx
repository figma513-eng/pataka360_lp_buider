import React, { useEffect, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, ExternalLink, ImageOff } from 'lucide-react';
import { CarouselAspectRatio, CarouselItem, TextAlign } from '../types/builder';
import { sanitizeExternalUrl } from '../utils/urlHelpers';

interface PhotoCarouselProps {
  items: CarouselItem[];
  aspectRatio: CarouselAspectRatio;
  objectFit: 'cover' | 'contain';
  borderRadius: number;
  cardBg: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
  align: TextAlign;
  showDots?: boolean;
  showArrows?: boolean;
  showScrollbar?: boolean;
  isEditor?: boolean;
}

export function PhotoCarousel({
  items,
  aspectRatio,
  objectFit,
  borderRadius,
  cardBg,
  borderColor,
  textColor,
  accentColor,
  align,
  showDots = true,
  showArrows = true,
  showScrollbar = false,
  isEditor = false,
}: PhotoCarouselProps) {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startScrollLeft: number;
    moved: boolean;
  }>({ active: false, startX: 0, startScrollLeft: 0, moved: false });

  const [activeIndex, setActiveIndex] = useState(0);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (activeIndex >= items.length && items.length > 0) {
      setActiveIndex(items.length - 1);
    }
  }, [activeIndex, items.length]);

  const scrollToSlide = (index: number) => {
    const track = trackRef.current;
    if (!track || items.length === 0) return;
    const bounded = Math.max(0, Math.min(items.length - 1, index));
    const slideWidth = track.clientWidth;
    track.scrollTo({ left: bounded * slideWidth, behavior: 'smooth' });
    setActiveIndex(bounded);
  };

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const idx = Math.round(track.scrollLeft / track.clientWidth);
    const bounded = Math.max(0, Math.min(items.length - 1, idx));
    if (bounded !== activeIndex) {
      setActiveIndex(bounded);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const track = trackRef.current;
    if (!track) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScrollLeft: track.scrollLeft,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const track = trackRef.current;
    if (!track) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 6) {
      dragRef.current.moved = true;
    }
    if (e.pointerType === 'mouse' && dragRef.current.moved) {
      track.scrollLeft = dragRef.current.startScrollLeft - dx;
    }
  };

  const handlePointerUp = () => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    const track = trackRef.current;
    if (track && track.clientWidth > 0 && dragRef.current.moved) {
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      scrollToSlide(idx);
    }
    window.setTimeout(() => {
      dragRef.current.moved = false;
    }, 60);
  };

  if (items.length === 0) {
    return (
      <div className="py-6 px-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
        Belum ada foto di carousel. Atur jumlah foto atau tambah foto di panel Pengaturan.
      </div>
    );
  }

  const textAlignClass =
    align === 'center' ? 'text-center' : align === 'right' ? 'text-right' : 'text-left';

  return (
    <div
      className="relative w-full select-none"
      onDragStart={(e) => {
        if (e.currentTarget.closest('[data-canvas-mode="drag"]')) return;
        // Prevent outer block HTML5 drag from hijacking horizontal mouse swipe
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <div className="relative">
        <div
          ref={trackRef}
          onScroll={handleScroll}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
          className={`flex overflow-x-auto snap-x snap-mandatory scroll-smooth touch-pan-x cursor-grab active:cursor-grabbing ${
            showScrollbar ? 'pb-1.5' : 'no-scrollbar'
          }`}
          style={{ borderRadius: `${borderRadius}px` }}
        >
          {items.map((item, idx) => {
            const imgKey = `${item.id}_${item.image}`;
            const hasError = brokenImages[imgKey];
            const rawUrl = item.url?.trim() ?? '';
            const cleanUrl = sanitizeExternalUrl(rawUrl, '');
            const hasLink = Boolean(cleanUrl);

            const slideInner = (
              <div
                data-canvas-sublayer={`slide_${item.id || idx}`}
                style={{
                  backgroundColor: cardBg,
                  borderColor,
                  borderRadius: `${borderRadius}px`,
                  color: textColor,
                }}
                className="border overflow-hidden flex flex-col"
              >
                <div
                  className="relative w-full bg-slate-100 overflow-hidden"
                  style={{ aspectRatio }}
                >
                  {!item.image || hasError ? (
                    <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-slate-400">
                      <ImageOff className="w-6 h-6" />
                      <span className="text-[11px]">Foto tidak dapat dimuat</span>
                    </div>
                  ) : (
                    <img
                      src={item.image}
                      alt={item.title || `Foto ${idx + 1}`}
                      draggable={false}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setBrokenImages((prev) => ({ ...prev, [imgKey]: true }))
                      }
                      style={{ objectFit }}
                      className="w-full h-full block"
                    />
                  )}

                  {hasLink && (
                    <span className="absolute bottom-2 right-2 inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-900/70 text-white text-[10px] font-medium backdrop-blur-xs">
                      <ExternalLink className="w-2.5 h-2.5" />
                      <span>Link</span>
                    </span>
                  )}
                </div>

                {(item.title.trim() || item.caption.trim()) && (
                  <div className={`px-3.5 py-2.5 space-y-1 ${textAlignClass}`}>
                    {item.title.trim() && (
                      <div className="text-xs font-bold leading-snug">{item.title}</div>
                    )}
                    {item.caption.trim() && (
                      <div className="text-[11px] opacity-75 leading-relaxed whitespace-pre-line">
                        {item.caption}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );

            return (
              <div key={item.id} className="w-full shrink-0 snap-start">
                {!isEditor && hasLink ? (
                  <a
                    href={cleanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    draggable={false}
                    onClick={(e) => {
                      if (dragRef.current.moved) {
                        e.preventDefault();
                      }
                    }}
                    className="block hover:opacity-95 transition-opacity"
                  >
                    {slideInner}
                  </a>
                ) : (
                  slideInner
                )}
              </div>
            );
          })}
        </div>

        {/* Slide counter pill */}
        {showArrows && items.length > 1 && (
          <div className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full bg-slate-900/65 text-white text-[10px] font-semibold tabular-nums backdrop-blur-xs pointer-events-none">
            {activeIndex + 1} / {items.length}
          </div>
        )}

        {/* Prev / Next Navigation Buttons */}
        {showArrows && items.length > 1 && (
          <>
            <button
              type="button"
              aria-label="Foto sebelumnya"
              disabled={activeIndex === 0}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                scrollToSlide(activeIndex - 1);
              }}
              className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/90 text-slate-800 shadow-md border border-slate-200/80 flex items-center justify-center transition-opacity cursor-pointer ${
                activeIndex === 0
                  ? 'opacity-30 cursor-default'
                  : 'opacity-90 hover:opacity-100 hover:bg-white'
              }`}
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              type="button"
              aria-label="Foto berikutnya"
              disabled={activeIndex === items.length - 1}
              onPointerDown={(e) => e.stopPropagation()}
              onClick={(e) => {
                e.stopPropagation();
                scrollToSlide(activeIndex + 1);
              }}
              className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/90 text-slate-800 shadow-md border border-slate-200/80 flex items-center justify-center transition-opacity cursor-pointer ${
                activeIndex === items.length - 1
                  ? 'opacity-30 cursor-default'
                  : 'opacity-90 hover:opacity-100 hover:bg-white'
              }`}
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </>
        )}
      </div>

      {/* Dot Indicators */}
      {showDots && items.length > 1 && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          className="flex items-center justify-center gap-1.5 mt-2.5"
        >
          {items.map((item, idx) => {
            const isActive = idx === activeIndex;
            return (
              <button
                key={item.id}
                type="button"
                aria-label={`Lihat foto ${idx + 1}`}
                onClick={(e) => {
                  e.stopPropagation();
                  scrollToSlide(idx);
                }}
                style={{
                  backgroundColor: isActive ? accentColor : '#CBD5E1',
                }}
                className={`h-1.5 rounded-full transition-all cursor-pointer ${
                  isActive ? 'w-5' : 'w-1.5 hover:opacity-80'
                }`}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
