import React from 'react';
import { Eye, Minus, Play, Plus, ShoppingCart, Wallet } from 'lucide-react';
import { BlockContent, PageTheme } from '../types/builder';

interface ShowcaseCardViewProps {
  content: BlockContent;
  theme: PageTheme;
  borderRadius: number;
  isEditor?: boolean;
  cartQty?: number;
  onAddCart?: () => void;
  onIncCart?: () => void;
  onDecCart?: () => void;
}

export function ShowcaseCardView({
  content,
  theme,
  borderRadius,
  isEditor = false,
  cartQty = 0,
  onAddCart,
  onIncCart,
  onDecCart,
}: ShowcaseCardViewProps) {
  const variant = content.cardVariant ?? 'news_banner';
  const gradFrom = content.cardGradientFrom || '#F59E0B';
  const gradTo = content.cardGradientTo || '#D97706';
  const accent = content.cardAccentColor || theme.accentColor || '#2563EB';
  const textColor = content.cardTextColor || '#FFFFFF';
  const radius = Math.max(8, borderRadius || 14);
  const actionUrl = content.cardActionUrl?.trim() || '';

  const wrapLink = (node: React.ReactNode) => {
    if (!isEditor && actionUrl && variant !== 'store_card' && variant !== 'activity_post') {
      return (
        <a
          href={actionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block no-underline"
        >
          {node}
        </a>
      );
    }
    return node;
  };

  if (variant === 'quote_banner') {
    const imgPos = content.cardImagePosition === 'left' ? 'left' : 'right';
    return wrapLink(
      <div
        style={{
          background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`,
          borderRadius: `${radius}px`,
          color: textColor,
        }}
        className={`relative overflow-hidden flex items-end justify-between gap-2 px-3.5 pt-3 pb-2.5 min-h-[118px] shadow-sm ${
          imgPos === 'left' ? 'flex-row-reverse text-right' : 'flex-row text-left'
        }`}
      >
        <div className="flex-1 min-w-0 flex flex-col justify-between gap-2 z-10">
          {content.cardQuote?.trim() && (
            <p className="text-[11px] leading-snug font-medium opacity-95">
              {content.cardQuote}
            </p>
          )}
          <div className="space-y-0.5">
            {content.cardTitle?.trim() && (
              <div className="text-[11.5px] font-extrabold leading-tight truncate">
                {content.cardTitle}
              </div>
            )}
            {content.cardSubtitle?.trim() && (
              <div className="text-[9.5px] opacity-90 leading-tight truncate">
                {content.cardSubtitle}
              </div>
            )}
          </div>
        </div>
        {content.cardImage && (
          <div className="w-[82px] h-[94px] shrink-0 rounded-lg overflow-hidden bg-white/15 border border-white/20 self-end">
            <img
              src={content.cardImage}
              alt={content.cardTitle || 'Tokoh'}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover object-top block"
            />
          </div>
        )}
      </div>
    );
  }

  if (variant === 'news_banner') {
    return wrapLink(
      <div
        style={{ borderRadius: `${radius}px` }}
        className="relative overflow-hidden bg-slate-200 aspect-[16/9] shadow-sm"
      >
        {content.cardImage && (
          <img
            src={content.cardImage}
            alt={content.cardTitle || 'Berita'}
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover block"
          />
        )}
        <div
          style={{
            background: `linear-gradient(180deg, rgba(0,0,0,0) 0%, ${accent}EE 62%, ${accent} 100%)`,
            color: textColor,
          }}
          className="absolute inset-x-0 bottom-0 px-3 py-2 pt-5 text-center"
        >
          <div className="text-[11.5px] font-bold leading-snug line-clamp-2 drop-shadow-sm">
            {content.cardTitle || 'Judul Informasi'}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'event_poster') {
    return wrapLink(
      <div
        style={{
          borderRadius: `${radius}px`,
          borderColor: accent,
        }}
        className="overflow-hidden border-2 bg-white shadow-sm flex flex-col"
      >
        <div className="aspect-[3/4] w-full bg-slate-100 overflow-hidden">
          {content.cardImage && (
            <img
              src={content.cardImage}
              alt={content.cardTitle || 'Poster Event'}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover block"
            />
          )}
        </div>
        <div
          style={{ backgroundColor: accent, color: textColor }}
          className="px-2 py-2 text-center"
        >
          <div className="text-[10.5px] font-bold leading-tight line-clamp-2">
            {content.cardTitle || 'Nama Event / Promo'}
          </div>
        </div>
      </div>
    );
  }

  if (variant === 'badge_tile') {
    return wrapLink(
      <div
        style={{
          background: `linear-gradient(180deg, ${gradFrom} 0%, ${gradTo} 100%)`,
          borderRadius: `${radius}px`,
          color: textColor,
        }}
        className="overflow-hidden px-2 py-3 flex flex-col items-center justify-between text-center gap-2 min-h-[124px] shadow-sm"
      >
        {content.cardImage && (
          <div className="w-12 h-12 rounded-xl overflow-hidden bg-white/15 border border-white/25 flex items-center justify-center shrink-0">
            <img
              src={content.cardImage}
              alt={content.cardTitle || 'Badge'}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover block"
            />
          </div>
        )}
        <div className="text-[11px] font-bold leading-tight whitespace-pre-line">
          {content.cardTitle || 'Sertifikasi'}
        </div>
      </div>
    );
  }

  if (variant === 'store_card') {
    const cartEnabled = Boolean(content.cardEnableCart);
    return (
      <div
        style={{
          background: `linear-gradient(180deg, ${gradFrom} 0%, ${gradTo} 100%)`,
          borderRadius: `${radius}px`,
          color: textColor,
        }}
        className="relative overflow-hidden px-2.5 pt-3 pb-3 flex flex-col items-center text-center justify-between gap-2 min-h-[168px] shadow-sm"
      >
        {content.cardShowPlayIcon !== false && (
          <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-white">
            <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
          </span>
        )}
        {content.cardImage && (
          <div className="w-16 h-16 mt-2 rounded-xl overflow-hidden bg-white/15 border border-white/25 shadow-sm flex items-center justify-center shrink-0">
            <img
              src={content.cardImage}
              alt={content.cardTitle || 'Produk'}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover block"
            />
          </div>
        )}
        <div className="space-y-0.5 w-full">
          <div className="text-[13px] font-extrabold leading-tight truncate">
            {content.cardTitle || 'Nama Produk'}
          </div>
          {content.cardPrice?.trim() && (
            <div className="text-[11px] font-semibold opacity-95 tabular-nums">
              {content.cardPrice}
            </div>
          )}
        </div>

        {cartEnabled && (
          <div
            className="w-full pt-1 flex items-center justify-center"
            onClick={(e) => {
              if (isEditor) e.stopPropagation();
            }}
          >
            {!isEditor && cartQty > 0 ? (
              <div className="inline-flex items-center gap-1.5 bg-white text-slate-900 rounded-full px-1.5 py-0.5 shadow-sm">
                <button
                  type="button"
                  onClick={onDecCart}
                  className="w-5 h-5 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center cursor-pointer"
                  aria-label="Kurangi jumlah"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-[11px] font-bold min-w-[14px] text-center tabular-nums">
                  {cartQty}
                </span>
                <button
                  type="button"
                  onClick={onIncCart}
                  className="w-5 h-5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center cursor-pointer"
                  aria-label="Tambah jumlah"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={!isEditor ? onAddCart : undefined}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white text-slate-900 text-[10.5px] font-bold shadow-sm hover:bg-slate-50 cursor-pointer"
              >
                <ShoppingCart className="w-3 h-3" />
                <span>Tambah</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'activity_post') {
    const gallery = (content.cardGalleryImages ?? []).filter(Boolean).slice(0, 6);
    const moreLabel = content.cardMoreLabel?.trim() || 'Selengkapnya';
    const moreUrl = content.cardMoreUrl?.trim() || actionUrl;
    return (
      <div
        style={{
          borderRadius: `${radius}px`,
          backgroundColor: theme.cardBg || '#FFFFFF',
          borderColor: theme.borderColor || '#E2E8F0',
          color: theme.textColor || '#1E293B',
        }}
        className="border p-3 space-y-2.5 shadow-sm text-left"
      >
        <div className="flex items-center gap-2.5">
          {content.cardImage && (
            <img
              src={content.cardImage}
              alt={content.cardTitle || 'Profil'}
              referrerPolicy="no-referrer"
              className="w-10 h-10 rounded-full object-cover shrink-0 border border-slate-200"
            />
          )}
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-extrabold leading-tight truncate">
              {content.cardTitle || 'Nama Pengurus'}
            </div>
            {content.cardSubtitle?.trim() && (
              <div className="text-[11px] opacity-70 truncate">
                {content.cardSubtitle}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-between gap-2 text-[11px] opacity-75">
          <span className="font-medium truncate">
            {content.cardHeaderTitle?.trim() || content.cardQuote?.trim() || 'Judul Kegiatan'}
          </span>
          {content.cardDate?.trim() && (
            <span className="shrink-0 tabular-nums">{content.cardDate}</span>
          )}
        </div>

        {gallery.length > 0 && (
          <div className="grid grid-cols-3 gap-1.5">
            {gallery.map((imgUrl, idx) => (
              <div
                key={`gal_${idx}`}
                className="aspect-square rounded-lg overflow-hidden bg-slate-100"
              >
                <img
                  src={imgUrl}
                  alt={`Foto ${idx + 1}`}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover block"
                />
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between pt-1 text-[11px]">
          {!isEditor && moreUrl ? (
            <a
              href={moreUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: accent }}
              className="font-semibold hover:underline"
            >
              {moreLabel}
            </a>
          ) : (
            <span style={{ color: accent }} className="font-semibold">
              {moreLabel}
            </span>
          )}
          {content.cardViews?.trim() && (
            <span className="inline-flex items-center gap-1 opacity-65 tabular-nums">
              <Eye className="w-3.5 h-3.5" />
              <span>{content.cardViews}</span>
            </span>
          )}
        </div>
      </div>
    );
  }

  // membership_ticket
  const feeItems = content.cardFeeItems ?? [];
  const totalLabel = content.cardTotalLabel?.trim() || 'Total :';
  const totalValue = content.cardTotalValue?.trim() || content.cardPrice?.trim() || 'Rp. 500.000,-';
  return wrapLink(
    <div
      style={{ borderRadius: `${radius}px` }}
      className="relative overflow-hidden bg-white border border-slate-200 shadow-sm text-left"
    >
      <div className="px-4 pt-3.5 pb-4 space-y-2">
        <div
          style={{ color: '#0284C7' }}
          className="text-center text-[13.5px] font-extrabold leading-tight"
        >
          {content.cardTitle || 'Anggota Pratama'}
        </div>
        <div className="space-y-1 pt-0.5">
          {feeItems.map((fee) => (
            <div
              key={fee.id}
              style={{ color: '#0284C7' }}
              className="flex items-center justify-between gap-2 text-[11.5px] font-semibold"
            >
              <span className="truncate">{fee.label}</span>
              <span className="shrink-0 tabular-nums">: {fee.value}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Perforated ticket notches + colored total footer */}
      <div className="relative">
        <span
          aria-hidden="true"
          className="absolute -left-2.5 -top-2.5 w-5 h-5 rounded-full bg-slate-100 border border-slate-200 z-10"
        />
        <span
          aria-hidden="true"
          className="absolute -right-2.5 -top-2.5 w-5 h-5 rounded-full bg-slate-100 border border-slate-200 z-10"
        />
        <div
          style={{ backgroundColor: accent, color: textColor }}
          className="px-4 py-3 flex items-center justify-center gap-2 font-extrabold text-[13.5px]"
        >
          <Wallet className="w-4 h-4 shrink-0" />
          <span>{totalLabel}</span>
          <span className="tabular-nums">{totalValue}</span>
        </div>
      </div>
    </div>
  );
}
