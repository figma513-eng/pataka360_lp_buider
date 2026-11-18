import React, { useMemo, useState } from 'react';
import { Check, Clock, MapPin, Minus, Plus, Search, ShoppingBag, Star } from 'lucide-react';
import type {
  BuilderBlock,
  CategoryJumpItem,
  FloatingCartPosition,
  FnbMenuItem,
  PageTheme,
} from '../types/builder';
import { formatRupiah, parsePriceToNumber } from '../utils/cartHelpers';
import { resolveCssFontFamily } from '../utils/fontHelpers';
import { resolveBackgroundInlineProps } from '../utils/gradientHelpers';
import { shadowToCss } from '../utils/exporterBlocks';

export function HeroProfileCard({
  block,
  theme,
  resolvedTextColor,
}: {
  block: BuilderBlock;
  theme: PageTheme;
  resolvedTextColor: string;
}) {
  const c = block.content;
  const s = block.style;
  const variant = c.heroVariant ?? 'compact';
  const logoSize = Math.max(40, Math.min(140, c.heroLogoSize ?? (variant === 'banner' ? 78 : 72)));
  const titleSize = Math.max(14, Math.min(38, c.heroTitleSize ?? (variant === 'banner' ? 22 : 20)));
  const subtitleSize = Math.max(11, Math.min(22, c.heroSubtitleSize ?? 13));
  const infoSize = Math.max(10, Math.min(18, c.heroInfoSize ?? 12));
  const cardRadius = Math.max(0, Math.min(36, c.heroCardRadius ?? (variant === 'banner' ? 24 : s.borderRadius)));
  const statusColor = c.heroStatusColor || '#16A34A';
  const logoBg = c.heroLogoBg || '#FFEDD5';
  const logoColor = c.heroLogoColor || '#C2410C';
  const monogram =
    (c.heroLogoMonogram || c.heroTitle || 'WB').trim().slice(0, 2).toUpperCase() || 'WB';
  const blockFont = resolveCssFontFamily(s.fontFamily) || resolveCssFontFamily(theme.fontFamily);
  const coverTitleFont = resolveCssFontFamily(c.heroCoverFontFamily) || blockFont;
  const cardBgProps = resolveBackgroundInlineProps({
    ...s,
    backgroundColor: s.backgroundColor === 'transparent' ? theme.cardBg : s.backgroundColor,
  });

  const renderAvatar = (withShadow = false) => (
    <div
      style={{
        width: `${logoSize}px`,
        height: `${logoSize}px`,
        backgroundColor: c.heroLogoImage ? '#FFFFFF' : logoBg,
        color: logoColor,
        boxShadow: withShadow ? '0 8px 20px rgba(15, 23, 42, 0.14)' : undefined,
      }}
      className="rounded-full shrink-0 overflow-hidden flex items-center justify-center font-extrabold select-none border-2 border-white"
    >
      {c.heroLogoImage ? (
        <img
          src={c.heroLogoImage}
          alt={c.heroTitle || 'Logo Usaha'}
          referrerPolicy="no-referrer"
          className="w-full h-full object-cover block"
        />
      ) : (
        <span style={{ fontSize: `${Math.round(logoSize * 0.34)}px` }}>{monogram}</span>
      )}
    </div>
  );

  if (variant === 'banner') {
    const coverHeight = Math.max(100, Math.min(340, c.heroCoverHeight ?? 170));
    const overlapPx = Math.max(0, Math.min(80, c.heroOverlapPx ?? 34));
    const horizontalMargin = s.fullBleed ? '14px' : '8px';
    const showCoverTitle =
      c.heroCoverTitleEnabled !== false &&
      c.heroCoverFontFamily !== '__none__' &&
      Boolean((c.heroCoverTitle ?? '').trim());
    const coverTitleSize = Math.max(12, Math.min(48, c.heroCoverTitleSize ?? 26));
    const coverTitleColor = c.heroCoverTitleColor || '#FFFFFF';

    return (
      <div
        data-jump-title={(c.heroTitle || '').trim().toLowerCase() || undefined}
        style={{ fontFamily: blockFont }}
        className="w-full"
      >
        <div
          style={{ height: `${coverHeight}px` }}
          className="relative w-full overflow-hidden bg-slate-900"
        >
          {c.heroCoverImage ? (
            <img
              src={c.heroCoverImage}
              alt={c.heroTitle || 'Banner Usaha'}
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover block"
            />
          ) : (
            <div className="w-full h-full bg-linear-to-br from-amber-900 via-orange-950 to-slate-900" />
          )}
          <div className="absolute inset-0 bg-linear-to-t from-black/55 via-black/20 to-black/15" />
          {showCoverTitle && (
            <div
              style={{
                fontFamily: coverTitleFont,
                paddingBottom: `${Math.max(14, overlapPx * 0.65)}px`,
              }}
              className="absolute inset-x-4 inset-y-0 flex items-center justify-center text-center pointer-events-none"
            >
              <span
                style={{
                  fontSize: `${coverTitleSize}px`,
                  color: coverTitleColor,
                }}
                className="font-bold drop-shadow-[0_2px_10px_rgba(0,0,0,0.65)] leading-tight"
              >
                {c.heroCoverTitle}
              </span>
            </div>
          )}
        </div>

        <div
          style={{
            marginTop: `-${overlapPx}px`,
            marginLeft: horizontalMargin,
            marginRight: horizontalMargin,
            borderRadius: `${cardRadius}px`,
            borderWidth: s.borderWidth > 0 ? `${s.borderWidth}px` : '1px',
            borderStyle: 'solid',
            borderColor: s.borderColor || theme.borderColor,
            boxShadow:
              s.shadow !== 'none'
                ? shadowToCss(s.shadow, s.shadowColor)
                : '0 10px 26px rgba(15, 23, 42, 0.12)',
            color: resolvedTextColor,
            ...cardBgProps,
          }}
          className="relative z-10 p-4 sm:p-5 flex items-start gap-3.5"
        >
          {renderAvatar(true)}
          <div className="min-w-0 flex-1 text-left space-y-1.5">
            {c.heroStatusEnabled && (c.heroStatusText || '').trim() && (
              <div
                style={{
                  backgroundColor: `${statusColor}16`,
                  color: statusColor,
                }}
                className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
              >
                <span
                  style={{ backgroundColor: statusColor }}
                  className="w-2 h-2 rounded-full shrink-0"
                />
                <span>{c.heroStatusText}</span>
              </div>
            )}
            <h1
              style={{
                fontSize: `${titleSize}px`,
                lineHeight: 1.2,
                fontWeight: s.fontWeightCss ? Number(s.fontWeightCss) : 800,
              }}
              className="m-0 tracking-tight break-words"
            >
              {c.heroTitle || 'Warung Barokah'}
            </h1>
            {(c.heroSubtitle || '').trim() && (
              <p
                style={{ fontSize: `${subtitleSize}px`, lineHeight: 1.4 }}
                className="m-0 opacity-80 break-words"
              >
                {c.heroSubtitle}
              </p>
            )}
            {((c.heroRating || '').trim() || (c.heroHours || '').trim()) && (
              <div
                style={{ fontSize: `${infoSize}px` }}
                className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 opacity-85 font-medium tabular-nums"
              >
                {(c.heroRating || '').trim() && (
                  <span className="inline-flex items-center gap-1">
                    <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400 shrink-0" />
                    <span>{c.heroRating}</span>
                  </span>
                )}
                {(c.heroHours || '').trim() && (
                  <span className="inline-flex items-center gap-1">
                    <Clock className="w-3.5 h-3.5 opacity-70 shrink-0" />
                    <span>{c.heroHours}</span>
                  </span>
                )}
              </div>
            )}
            {(c.heroLocation || '').trim() && (
              <div
                style={{ fontSize: `${infoSize}px`, lineHeight: 1.4 }}
                className="flex items-start gap-1.5 opacity-80"
              >
                <MapPin className="w-3.5 h-3.5 opacity-70 shrink-0 mt-0.5" />
                <span className="break-words">{c.heroLocation}</span>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      data-jump-title={(c.heroTitle || '').trim().toLowerCase() || undefined}
      style={{ fontFamily: blockFont, color: resolvedTextColor }}
      className="p-4 flex items-center gap-3.5 text-left"
    >
      {renderAvatar(false)}
      <div className="min-w-0 flex-1 space-y-1">
        {c.heroStatusEnabled !== false && (c.heroStatusText || 'Buka sekarang').trim() && (
          <div
            style={{
              backgroundColor: `${statusColor}16`,
              color: statusColor,
            }}
            className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold"
          >
            <span
              style={{ backgroundColor: statusColor }}
              className="w-2 h-2 rounded-full shrink-0"
            />
            <span>{c.heroStatusText || 'Buka sekarang'}</span>
          </div>
        )}
        <h1
          style={{
            fontSize: `${titleSize}px`,
            lineHeight: 1.2,
            fontWeight: s.fontWeightCss ? Number(s.fontWeightCss) : 800,
          }}
          className="m-0 tracking-tight break-words"
        >
          {c.heroTitle || 'Warung Barokah Demo'}
        </h1>
        {(c.heroSubtitle || '').trim() && (
          <p
            style={{ fontSize: `${subtitleSize}px`, lineHeight: 1.4 }}
            className="m-0 opacity-80 break-words"
          >
            {c.heroSubtitle}
          </p>
        )}
        {((c.heroLocation || '').trim() || (c.heroHours || '').trim()) && (
          <div
            style={{ fontSize: `${infoSize}px` }}
            className="flex flex-wrap items-center gap-x-3 gap-y-1 pt-0.5 opacity-75 tabular-nums"
          >
            {(c.heroLocation || '').trim() && (
              <span className="inline-flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 shrink-0" />
                <span>{c.heroLocation}</span>
              </span>
            )}
            {(c.heroHours || '').trim() && (
              <span className="inline-flex items-center gap-1">
                <Clock className="w-3.5 h-3.5 shrink-0" />
                <span>{c.heroHours}</span>
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function CategoryJumpTabs({
  block,
  theme,
  activeId,
  onSelect,
}: {
  block: BuilderBlock;
  theme: PageTheme;
  activeId: string | null;
  onSelect: (item: CategoryJumpItem, e: React.MouseEvent) => void;
}) {
  const c = block.content;
  const s = block.style;
  const items = c.categoryButtons ?? [];
  const mode = c.categoryScrollMode ?? 'vertical';
  const maxHeight = Math.max(48, Math.min(320, c.categoryMaxHeight ?? 112));
  const activeBg = c.categoryActiveBg || theme.accentColor || '#EA580C';
  const activeText = c.categoryActiveText || '#FFFFFF';
  const inactiveBg = c.categoryInactiveBg || '#F1F5F9';
  const inactiveText = c.categoryInactiveText || '#334155';
  const radius = c.categoryRadius ?? 9999;
  const fontSize = Math.max(10, Math.min(20, c.categoryFontSize ?? 13));
  const padX = Math.max(8, Math.min(32, c.categoryButtonPaddingX ?? 16));
  const padY = Math.max(4, Math.min(18, c.categoryButtonPaddingY ?? 8));
  const gap = Math.max(4, Math.min(20, c.categoryGap ?? 8));
  const fontStack = resolveCssFontFamily(s.fontFamily) || resolveCssFontFamily(theme.fontFamily);
  const currentActiveId = activeId ?? c.categoryActiveId ?? items[0]?.id ?? null;

  const justify =
    mode === 'horizontal'
      ? 'justify-start'
      : s.align === 'center'
      ? 'justify-center'
      : s.align === 'right'
      ? 'justify-end'
      : 'justify-start';

  if (items.length === 0) {
    return (
      <div className="py-2 text-xs text-slate-400">
        Belum ada tombol kategori. Tambahkan tombol di panel kanan.
      </div>
    );
  }

  const containerStyle: React.CSSProperties = {
    gap: `${gap}px`,
    fontFamily: fontStack,
    ...(mode === 'vertical'
      ? {
          maxHeight: `${maxHeight}px`,
          overflowY: 'auto',
          paddingRight: '2px',
          WebkitOverflowScrolling: 'touch',
        }
      : mode === 'horizontal'
      ? {
          overflowX: 'auto',
          paddingBottom: '4px',
          scrollSnapType: 'x proximity',
          WebkitOverflowScrolling: 'touch',
        }
      : {}),
  };

  return (
    <div
      style={containerStyle}
      className={`flex ${
        mode === 'horizontal' ? 'flex-nowrap touch-pan-x' : 'flex-wrap'
      } items-center ${justify}`}
    >
      {items.map((btn) => {
        const isOn = btn.id === currentActiveId;
        return (
          <button
            key={btn.id}
            type="button"
            onClick={(e) => onSelect(btn, e)}
            style={{
              backgroundColor: isOn ? activeBg : inactiveBg,
              color: isOn ? activeText : inactiveText,
              borderRadius: `${radius}px`,
              fontSize: `${fontSize}px`,
              padding: `${padY}px ${padX}px`,
              fontWeight: s.fontWeightCss ? Number(s.fontWeightCss) : 700,
              fontFamily: fontStack,
            }}
            className="shrink-0 whitespace-nowrap border-0 cursor-pointer transition-all hover:opacity-90 active:scale-[0.98]"
          >
            {btn.label}
          </button>
        );
      })}
    </div>
  );
}

export function FnbCatalogCard({
  block,
  theme,
  cartQtyLookup,
  externalCategoryFilter,
  onClearExternalFilter,
  onAddItem,
  onIncrementItem,
  onDecrementItem,
}: {
  block: BuilderBlock;
  theme: PageTheme;
  cartQtyLookup: Record<string, number>;
  externalCategoryFilter?: string | null;
  onClearExternalFilter?: () => void;
  onAddItem: (item: FnbMenuItem) => void;
  onIncrementItem: (item: FnbMenuItem) => void;
  onDecrementItem: (item: FnbMenuItem) => void;
}) {
  const c = block.content;
  const s = block.style;
  const items = c.fnbItems ?? [];
  const [searchQuery, setSearchQuery] = useState('');
  const [localCat, setLocalCat] = useState<string>('Semua');

  const accent = c.fnbAccentColor || theme.accentColor || '#EA580C';
  const imgSize = Math.max(52, Math.min(130, c.fnbItemImageSize ?? 80));
  const titleSize = Math.max(12, Math.min(24, c.fnbItemTitleSize ?? s.fontSize ?? 15));
  const descSize = Math.max(10, Math.min(18, c.fnbItemDescSize ?? 12));
  const fontStack = resolveCssFontFamily(s.fontFamily) || resolveCssFontFamily(theme.fontFamily);

  const categories = useMemo(() => {
    const seen: string[] = [];
    for (const it of items) {
      const cat = (it.category || 'Menu').trim();
      if (cat && !seen.includes(cat)) seen.push(cat);
    }
    return seen;
  }, [items]);

  const effectiveCat = externalCategoryFilter || localCat;

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return items.filter((it) => {
      const catMatch =
        !effectiveCat ||
        effectiveCat === 'Semua' ||
        (it.category || 'Menu').trim().toLowerCase() === effectiveCat.toLowerCase();
      if (!catMatch) return false;
      if (!q) return true;
      return (
        it.title.toLowerCase().includes(q) ||
        (it.description || '').toLowerCase().includes(q) ||
        (it.category || '').toLowerCase().includes(q)
      );
    });
  }, [items, effectiveCat, searchQuery]);

  const groupedSections = useMemo(() => {
    if (c.fnbGroupByCategory === false) {
      return [{ category: '', items: filteredItems }];
    }
    const groups: { category: string; items: FnbMenuItem[] }[] = [];
    for (const it of filteredItems) {
      const cat = (it.category || 'Menu').trim() || 'Menu';
      let grp = groups.find((g) => g.category.toLowerCase() === cat.toLowerCase());
      if (!grp) {
        grp = { category: cat, items: [] };
        groups.push(grp);
      }
      grp.items.push(it);
    }
    return groups;
  }, [filteredItems, c.fnbGroupByCategory]);

  return (
    <div style={{ fontFamily: fontStack }} className="space-y-3.5 text-left">
      {c.fnbShowCategories && categories.length > 0 && (
        <div className="flex items-center gap-2 overflow-x-auto pb-1">
          {['Semua', ...categories].map((cat) => {
            const on = (effectiveCat || 'Semua').toLowerCase() === cat.toLowerCase();
            return (
              <button
                key={cat}
                type="button"
                onClick={() => {
                  setLocalCat(cat);
                  onClearExternalFilter?.();
                }}
                style={{
                  backgroundColor: on ? accent : '#F1F5F9',
                  color: on ? '#FFFFFF' : '#334155',
                }}
                className="px-3.5 py-1.5 rounded-full text-xs font-bold shrink-0 cursor-pointer border-0 transition-colors"
              >
                {cat}
              </button>
            );
          })}
        </div>
      )}

      {c.fnbShowSearch !== false && (
        <div
          style={{
            backgroundColor: theme.cardBg,
            borderColor: theme.borderColor,
          }}
          className="flex items-center gap-2.5 px-3.5 py-2.5 rounded-2xl border shadow-2xs"
        >
          <Search className="w-4 h-4 text-slate-400 shrink-0" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={c.fnbSearchPlaceholder || 'Cari makanan dan minuman...'}
            style={{ color: theme.textColor }}
            className="w-full bg-transparent text-xs outline-none placeholder:text-slate-400"
          />
        </div>
      )}

      {filteredItems.length === 0 ? (
        <div
          style={{ backgroundColor: theme.cardBg, borderColor: theme.borderColor }}
          className="p-6 rounded-2xl border text-center text-xs opacity-70"
        >
          Menu yang dicari tidak ditemukan.
        </div>
      ) : (
        <div className="space-y-4">
          {groupedSections.map((sec, sIdx) => (
            <div key={`${sec.category}_${sIdx}`} className="space-y-2.5">
              {sec.category && (
                <h3
                  data-jump-title={sec.category.toLowerCase()}
                  style={{ color: theme.textColor }}
                  className="text-base font-extrabold tracking-tight m-0 pt-1"
                >
                  {sec.category}
                </h3>
              )}
              <div className="space-y-2.5">
                {sec.items.map((item) => {
                  const qty = cartQtyLookup[item.id] ?? 0;
                  const mono =
                    (item.monogram || item.title || 'MN').trim().slice(0, 2).toUpperCase() || 'MN';
                  return (
                    <div
                      key={item.id}
                      style={{
                        backgroundColor: theme.cardBg,
                        borderColor: theme.borderColor,
                        color: theme.textColor,
                      }}
                      className="p-3 rounded-2xl border shadow-2xs flex items-stretch gap-3 transition-transform hover:-translate-y-0.5"
                    >
                      <div
                        style={{
                          width: `${imgSize}px`,
                          height: `${imgSize}px`,
                          backgroundColor: item.image ? '#F1F5F9' : item.monogramBg || '#FFEDD5',
                          color: item.monogramColor || accent,
                        }}
                        className="rounded-xl shrink-0 overflow-hidden flex items-center justify-center font-extrabold select-none self-center"
                      >
                        {item.image ? (
                          <img
                            src={item.image}
                            alt={item.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover block"
                          />
                        ) : (
                          <span style={{ fontSize: `${Math.round(imgSize * 0.24)}px` }}>
                            {mono}
                          </span>
                        )}
                      </div>

                      <div className="min-w-0 flex-1 flex flex-col justify-between gap-2">
                        <div className="space-y-1">
                          {(item.badge || '').trim() && (
                            <span className="inline-block px-2 py-0.5 rounded-full bg-slate-100 text-slate-700 text-[10px] font-bold">
                              {item.badge}
                            </span>
                          )}
                          <div
                            style={{ fontSize: `${titleSize}px`, lineHeight: 1.25 }}
                            className="font-bold break-words"
                          >
                            {item.title}
                          </div>
                          {(item.description || '').trim() && (
                            <p
                              style={{ fontSize: `${descSize}px`, lineHeight: 1.4 }}
                              className="m-0 opacity-70 line-clamp-2 break-words"
                            >
                              {item.description}
                            </p>
                          )}
                        </div>

                        <div className="flex items-center justify-between gap-2 pt-0.5">
                          <div
                            style={{ color: accent }}
                            className="text-sm font-extrabold tabular-nums truncate"
                          >
                            {item.price || 'Rp 0'}
                          </div>

                          {qty <= 0 ? (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                onAddItem(item);
                              }}
                              style={{
                                backgroundColor: `${accent}14`,
                                color: accent,
                                borderColor: `${accent}38`,
                              }}
                              className="px-3.5 py-1.5 rounded-full border text-xs font-bold cursor-pointer hover:opacity-90 active:scale-95 transition-all shrink-0"
                            >
                              Tambah
                            </button>
                          ) : (
                            <div
                              style={{ backgroundColor: `${accent}16` }}
                              className="inline-flex items-center gap-2 p-1 rounded-full shrink-0"
                            >
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onDecrementItem(item);
                                }}
                                aria-label="Kurangi"
                                style={{ color: accent }}
                                className="w-6 h-6 rounded-full bg-white shadow-2xs flex items-center justify-center cursor-pointer hover:opacity-90 border-0"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span
                                style={{ color: theme.textColor }}
                                className="min-w-[16px] text-center text-xs font-extrabold tabular-nums"
                              >
                                {qty}
                              </span>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onIncrementItem(item);
                                }}
                                aria-label="Tambah"
                                style={{ backgroundColor: accent, color: '#FFFFFF' }}
                                className="w-6 h-6 rounded-full flex items-center justify-center cursor-pointer hover:opacity-95 border-0"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function FnbFloatingCartCapsule({
  count,
  totalAmount,
  position = 'bottom-floating',
  offsetY = 16,
  bgColor = '#EA580C',
  actionLabel = 'Lanjut',
  onClick,
}: {
  count: number;
  totalAmount: number;
  position?: FloatingCartPosition;
  offsetY?: number;
  bgColor?: string;
  actionLabel?: string;
  onClick: () => void;
}) {
  if (count <= 0) return null;

  const isTop = position === 'top-floating';
  const isDocked = position === 'bottom-docked';
  const isLeft = position === 'bottom-left';
  const isRight = position === 'bottom-right';
  const safeOffset = Math.max(0, Math.min(120, offsetY));

  const wrapperStyle: React.CSSProperties = {
    position: 'sticky',
    zIndex: 30,
    ...(isTop ? { top: `${safeOffset}px` } : { bottom: `${isDocked ? 0 : safeOffset}px` }),
    display: 'flex',
    justifyContent: isLeft ? 'flex-start' : isRight ? 'flex-end' : 'center',
    paddingLeft: isDocked ? 0 : '14px',
    paddingRight: isDocked ? 0 : '14px',
    pointerEvents: 'none',
  };

  const buttonStyle: React.CSSProperties = {
    backgroundColor: bgColor,
    color: '#FFFFFF',
    borderRadius: isDocked ? '0px' : '9999px',
    width: isLeft || isRight ? 'auto' : '100%',
    maxWidth: isDocked ? '100%' : isLeft || isRight ? '300px' : '400px',
    pointerEvents: 'auto',
    boxShadow: '0 10px 26px rgba(15, 23, 42, 0.22)',
  };

  return (
    <div style={wrapperStyle}>
      <button
        type="button"
        onClick={onClick}
        style={buttonStyle}
        className="px-4 py-2.5 flex items-center justify-between gap-3 border-0 cursor-pointer transition-transform hover:scale-[1.01] active:scale-[0.99]"
      >
        <div className="flex items-center gap-2.5 min-w-0 text-left">
          <span className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
            <ShoppingBag className="w-4 h-4 text-white" />
          </span>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-white/90 leading-tight tabular-nums">
              {count} item
            </div>
            <div className="text-sm font-extrabold leading-tight tabular-nums truncate">
              {totalAmount > 0 ? formatRupiah(totalAmount) : 'Siap pesan'}
            </div>
          </div>
        </div>
        <span className="inline-flex items-center gap-1 text-xs font-extrabold shrink-0 whitespace-nowrap">
          <span>{actionLabel || 'Lanjut'}</span>
          <Check className="w-3.5 h-3.5" />
        </span>
      </button>
    </div>
  );
}

export function fnbPriceSum(items: { price: string; qty: number }[]): number {
  return items.reduce((sum, it) => sum + parsePriceToNumber(it.price) * it.qty, 0);
}
