import React from 'react';
import { Eye, Minus, Play, Plus, ShoppingCart, Wallet } from 'lucide-react';
import { BlockContent, BlockStyle, PageTheme } from '../types/builder';
import { buildLineClampStyle } from '../utils/universalLayerHelpers';
import { resolveImagePopoutMetrics } from '../utils/popoutHelpers';

interface ShowcaseCardViewProps {
  content: BlockContent;
  theme: PageTheme;
  borderRadius: number;
  blockStyle?: BlockStyle;
  isEditor?: boolean;
  enableSubLayerClick?: boolean;
  selectedSubLayerId?: string | null;
  onSelectSubLayer?: (subLayerId: string) => void;
  cartQty?: number;
  onAddCart?: () => void;
  onIncCart?: () => void;
  onDecCart?: () => void;
  bodySlot?: React.ReactNode;
  footerSlot?: React.ReactNode;
}

export function ShowcaseCardView({
  content,
  theme,
  borderRadius,
  blockStyle,
  isEditor = false,
  enableSubLayerClick = true,
  selectedSubLayerId = null,
  onSelectSubLayer,
  cartQty = 0,
  onAddCart,
  onIncCart,
  onDecCart,
  bodySlot,
  footerSlot,
}: ShowcaseCardViewProps) {
  const variant = content.cardVariant ?? 'news_banner';
  const gradFrom = content.cardGradientFrom || '#F59E0B';
  const gradTo = content.cardGradientTo || '#D97706';
  const accent = content.cardAccentColor || theme.accentColor || '#2563EB';
  const textColor = content.cardTextColor || '#FFFFFF';
  const radius = Math.max(0, borderRadius ?? 14);
  const actionUrl = content.cardActionUrl?.trim() || '';
  const hasUniversalAction = Boolean(content.actionType && content.actionType !== 'none');

  const hiddenSet = new Set(content.hiddenSubLayers ?? []);
  const deletedSet = new Set(content.deletedSubLayers ?? []);
  const isHeaderRemoved = deletedSet.has('card_header') || hiddenSet.has('card_header');
  const isMediaRemoved = deletedSet.has('card_media') || hiddenSet.has('card_media');
  const hideDefaultContent =
    Boolean(content.cardHideDefaultContent) ||
    deletedSet.has('card_body') ||
    hiddenSet.has('card_body');
  const hideDefaultFooter =
    Boolean(content.cardHideDefaultFooter) ||
    deletedSet.has('card_footer') ||
    hiddenSet.has('card_footer');
  const hasInteractiveSlots = Boolean(bodySlot || footerSlot);

  const subStyles = content.subLayerStyles ?? {};
  const headerSubStyle = subStyles.card_header;
  const mediaSubStyle = subStyles.card_media;
  const bodySubStyle = subStyles.card_body;
  const footerSubStyle = subStyles.card_footer;

  const subSelectProps = (subId: string) =>
    isEditor
      ? {
          'data-canvas-sublayer': subId,
          'data-card-sublayer': subId,
          ...(enableSubLayerClick && onSelectSubLayer
            ? {
                onClick: (e: React.MouseEvent) => {
                  e.stopPropagation();
                  onSelectSubLayer(subId);
                },
              }
            : {}),
        }
      : {};

  const subOutlineClass = (subId: string) =>
    isEditor && selectedSubLayerId === subId
      ? 'ring-2 ring-[#00C98A] ring-offset-1 rounded-md'
      : '';

  const renderCardHeaderBar = (darkSurface = false) => {
    if (isHeaderRemoved) return null;
    const hTitle = content.cardHeaderTitle?.trim();
    const hMore = content.cardMoreLabel?.trim();
    if (!hTitle && !hMore) return null;
    const hUrl = content.cardMoreUrl?.trim() || actionUrl;
    return (
      <div
        {...subSelectProps('card_header')}
        style={{
          backgroundColor:
            headerSubStyle?.backgroundColor && headerSubStyle.backgroundColor !== 'transparent'
              ? headerSubStyle.backgroundColor
              : undefined,
          color: headerSubStyle?.textColor || (darkSurface ? textColor : theme.textColor || '#17243D'),
          fontSize: headerSubStyle?.fontSize ? `${headerSubStyle.fontSize}px` : '12px',
          fontWeight: headerSubStyle?.fontWeightCss ? Number(headerSubStyle.fontWeightCss) : 700,
          fontStyle: headerSubStyle?.fontStyle,
          letterSpacing:
            typeof headerSubStyle?.letterSpacing === 'number'
              ? `${headerSubStyle.letterSpacing}px`
              : undefined,
          paddingTop: headerSubStyle?.paddingTop ?? 8,
          paddingBottom: headerSubStyle?.paddingBottom ?? 6,
          paddingLeft: headerSubStyle?.paddingLeft ?? 12,
          paddingRight: headerSubStyle?.paddingRight ?? 12,
          opacity: typeof headerSubStyle?.opacity === 'number' ? headerSubStyle.opacity / 100 : undefined,
        }}
        className={`w-full flex items-center justify-between gap-2 border-b ${
          darkSurface ? 'border-white/15' : 'border-slate-200/70'
        } ${subOutlineClass('card_header')}`}
      >
        <span className="truncate">{hTitle || 'Header Kartu'}</span>
        {hMore &&
          (!isEditor && hUrl ? (
            <a
              href={hUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: darkSurface ? textColor : accent }}
              className="text-[10.5px] font-semibold shrink-0 hover:underline"
            >
              {hMore}
            </a>
          ) : (
            <span
              style={{ color: darkSurface ? textColor : accent }}
              className="text-[10.5px] font-semibold shrink-0"
            >
              {hMore}
            </span>
          ))}
      </div>
    );
  };

  const zoom =
    typeof content.cardImageZoom === 'number' && Number.isFinite(content.cardImageZoom)
      ? Math.max(50, Math.min(250, content.cardImageZoom))
      : 100;
  const imgFit = content.cardImageFit === 'contain' ? 'contain' : 'cover';
  const imgStyle: React.CSSProperties = {
    width: '100%',
    height: '100%',
    objectFit: imgFit,
    display: 'block',
    transform: zoom !== 100 ? `scale(${zoom / 100})` : undefined,
    transformOrigin: 'center center',
    transition: 'transform 160ms ease',
    opacity: typeof mediaSubStyle?.opacity === 'number' ? mediaSubStyle.opacity / 100 : undefined,
  };

  const titleLines =
    typeof content.cardTitleLines === 'number'
      ? content.cardTitleLines
      : typeof blockStyle?.maxLines === 'number'
      ? blockStyle.maxLines
      : 0;
  const subtitleLines =
    typeof content.cardSubtitleLines === 'number' ? content.cardSubtitleLines : 0;
  const textGap =
    typeof content.cardTextGap === 'number'
      ? content.cardTextGap
      : typeof blockStyle?.paragraphGap === 'number'
      ? blockStyle.paragraphGap
      : 4;
  const lineHeight = content.cardLineHeight ?? blockStyle?.lineHeight ?? 1.28;
  const letterSpacing =
    typeof content.cardLetterSpacing === 'number'
      ? `${content.cardLetterSpacing}px`
      : typeof blockStyle?.letterSpacing === 'number'
      ? `${blockStyle.letterSpacing}px`
      : undefined;
  const minHStyle =
    typeof blockStyle?.minHeight === 'number' && blockStyle.minHeight > 0
      ? `${blockStyle.minHeight}px`
      : undefined;
  const maxHStyle =
    typeof blockStyle?.maxHeight === 'number' && blockStyle.maxHeight > 0
      ? `${blockStyle.maxHeight}px`
      : undefined;

  const wrapLink = (node: React.ReactNode) => {
    if (
      !isEditor &&
      !hasUniversalAction &&
      !hasInteractiveSlots &&
      actionUrl &&
      variant !== 'store_card' &&
      variant !== 'popout_product' &&
      variant !== 'activity_post'
    ) {
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

  const renderOptionalFooterStrip = () =>
    !hideDefaultFooter && footerSlot ? (
      <div
        {...subSelectProps('card_footer')}
        style={{
          backgroundColor:
            footerSubStyle?.backgroundColor && footerSubStyle.backgroundColor !== 'transparent'
              ? footerSubStyle.backgroundColor
              : accent,
          color: footerSubStyle?.textColor || textColor,
          opacity: typeof footerSubStyle?.opacity === 'number' ? footerSubStyle.opacity / 100 : undefined,
        }}
        className={`w-full px-3 py-2.5 flex flex-col gap-1.5 ${subOutlineClass('card_footer')}`}
      >
        {footerSlot}
      </div>
    ) : null;

  const bodyTextStyleOverride: React.CSSProperties = {
    color: bodySubStyle?.textColor || undefined,
    fontStyle: bodySubStyle?.fontStyle,
    fontWeight: bodySubStyle?.fontWeightCss ? Number(bodySubStyle.fontWeightCss) : undefined,
    textAlign: bodySubStyle?.align,
    textTransform: bodySubStyle?.textTransform,
    textDecoration: bodySubStyle?.textDecoration,
    opacity: typeof bodySubStyle?.opacity === 'number' ? bodySubStyle.opacity / 100 : undefined,
  };

  if (variant === 'quote_banner') {
    const imgPos = content.cardImagePosition === 'left' ? 'left' : 'right';
    const mediaW = content.cardMediaSize ?? 82;
    const mediaH = content.cardMediaHeight ?? Math.round(mediaW * 1.14);
    const mediaRadius = mediaSubStyle?.borderRadius ?? content.cardImageRadius ?? 10;
    const titleSize = bodySubStyle?.fontSize ?? content.cardTitleSize ?? blockStyle?.fontSize ?? 11.5;
    const subtitleSize = content.cardSubtitleSize ?? 9.5;
    return wrapLink(
      <div
        style={{
          background: `linear-gradient(135deg, ${gradFrom}, ${gradTo})`,
          borderRadius: `${radius}px`,
          color: textColor,
          minHeight: minHStyle ?? '118px',
          maxHeight: maxHStyle,
          letterSpacing,
        }}
        className="relative overflow-hidden shadow-sm flex flex-col"
      >
        {renderCardHeaderBar(true)}
        {(!hideDefaultContent || (!isMediaRemoved && content.cardImage)) && (
          <div
            className={`flex items-end justify-between gap-2 px-3.5 pt-3 pb-2.5 flex-1 ${
              imgPos === 'left' ? 'flex-row-reverse text-right' : 'flex-row text-left'
            }`}
          >
            {!hideDefaultContent && (
              <div
                {...subSelectProps('card_body')}
                className={`flex-1 min-w-0 flex flex-col justify-between z-10 ${subOutlineClass('card_body')}`}
                style={{ gap: `${Math.max(4, textGap)}px`, ...bodyTextStyleOverride }}
              >
                {content.cardQuote?.trim() && (
                  <p
                    style={{
                      fontSize: `${Math.max(10, titleSize - 0.5)}px`,
                      lineHeight,
                      ...buildLineClampStyle(titleLines),
                    }}
                    className="font-medium opacity-95"
                  >
                    {content.cardQuote}
                  </p>
                )}
                <div style={{ display: 'flex', flexDirection: 'column', gap: `${Math.max(1, textGap / 2)}px` }}>
                  {content.cardTitle?.trim() && (
                    <div
                      style={{
                        fontSize: `${titleSize}px`,
                        lineHeight,
                        ...buildLineClampStyle(titleLines || 2),
                      }}
                      className="font-extrabold"
                    >
                      {content.cardTitle}
                    </div>
                  )}
                  {content.cardSubtitle?.trim() && (
                    <div
                      style={{
                        fontSize: `${subtitleSize}px`,
                        lineHeight,
                        ...buildLineClampStyle(subtitleLines || 2),
                      }}
                      className="opacity-90"
                    >
                      {content.cardSubtitle}
                    </div>
                  )}
                </div>
              </div>
            )}
            {!isMediaRemoved && content.cardImage && (
              <div
                {...subSelectProps('card_media')}
                style={{
                  width: `${mediaW}px`,
                  height: `${mediaH}px`,
                  borderRadius: `${mediaRadius}px`,
                }}
                className={`shrink-0 overflow-hidden bg-white/15 border border-white/20 self-end ${subOutlineClass('card_media')}`}
              >
                <img
                  src={content.cardImage}
                  alt={content.cardTitle || 'Tokoh'}
                  referrerPolicy="no-referrer"
                  style={{ ...imgStyle, objectPosition: 'top center' }}
                />
              </div>
            )}
          </div>
        )}
        {bodySlot && <div className="w-full px-3 py-2">{bodySlot}</div>}
        {renderOptionalFooterStrip()}
      </div>
    );
  }

  if (variant === 'news_banner') {
    const mediaHeight = content.cardMediaHeight;
    const titleSize = bodySubStyle?.fontSize ?? content.cardTitleSize ?? blockStyle?.fontSize ?? 12;
    const subtitleSize = content.cardSubtitleSize ?? 10;
    return wrapLink(
      <div
        style={{
          borderRadius: `${radius}px`,
          minHeight: minHStyle,
          maxHeight: maxHStyle,
          letterSpacing,
        }}
        className="relative overflow-hidden bg-white shadow-sm flex flex-col"
      >
        {renderCardHeaderBar(false)}
        {(!isMediaRemoved || !hideDefaultContent) && (
          <div
            style={{ height: mediaHeight ? `${mediaHeight}px` : undefined }}
            className={`relative overflow-hidden bg-slate-200 ${
              isMediaRemoved ? 'min-h-[72px]' : mediaHeight ? '' : 'aspect-[16/9]'
            }`}
          >
            {!isMediaRemoved && content.cardImage && (
              <div
                {...subSelectProps('card_media')}
                className={`w-full h-full ${subOutlineClass('card_media')}`}
              >
                <img
                  src={content.cardImage}
                  alt={content.cardTitle || 'Berita'}
                  referrerPolicy="no-referrer"
                  style={imgStyle}
                />
              </div>
            )}
            {!hideDefaultContent && (
              <div
                {...subSelectProps('card_body')}
                style={{
                  background: `linear-gradient(180deg, rgba(0,0,0,0) 0%, ${accent}EE 62%, ${accent} 100%)`,
                  color: bodySubStyle?.textColor || textColor,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: `${textGap}px`,
                  ...bodyTextStyleOverride,
                }}
                className={`${isMediaRemoved ? 'relative py-3' : 'absolute inset-x-0 bottom-0 py-2 pt-5'} px-3 text-center ${subOutlineClass('card_body')}`}
              >
                <div
                  style={{
                    fontSize: `${titleSize}px`,
                    lineHeight,
                    ...buildLineClampStyle(titleLines || 2),
                  }}
                  className="font-bold drop-shadow-sm"
                >
                  {content.cardTitle || 'Judul Informasi'}
                </div>
                {content.cardSubtitle?.trim() && (
                  <div
                    style={{
                      fontSize: `${subtitleSize}px`,
                      lineHeight,
                      ...buildLineClampStyle(subtitleLines || 2),
                    }}
                    className="opacity-90"
                  >
                    {content.cardSubtitle}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        {bodySlot && <div className="w-full p-2.5 bg-white text-[#17243D]">{bodySlot}</div>}
        {renderOptionalFooterStrip()}
      </div>
    );
  }

  if (variant === 'event_poster') {
    const mediaHeight = content.cardMediaHeight;
    const titleSize = bodySubStyle?.fontSize ?? content.cardTitleSize ?? blockStyle?.fontSize ?? 11;
    const subtitleSize = content.cardSubtitleSize ?? 9.5;
    return wrapLink(
      <div
        style={{
          borderRadius: `${radius}px`,
          borderColor: accent,
          minHeight: minHStyle,
          maxHeight: maxHStyle,
          letterSpacing,
        }}
        className="overflow-hidden border-2 bg-white shadow-sm flex flex-col"
      >
        {renderCardHeaderBar(false)}
        {!isMediaRemoved && content.cardImage && (
          <div
            {...subSelectProps('card_media')}
            style={{ height: mediaHeight ? `${mediaHeight}px` : undefined }}
            className={`w-full bg-slate-100 overflow-hidden ${mediaHeight ? '' : 'aspect-[3/4]'} ${subOutlineClass('card_media')}`}
          >
            <img
              src={content.cardImage}
              alt={content.cardTitle || 'Poster Event'}
              referrerPolicy="no-referrer"
              style={imgStyle}
            />
          </div>
        )}
        {bodySlot && <div className="w-full p-2.5 bg-white text-[#17243D]">{bodySlot}</div>}
        {(!hideDefaultFooter || footerSlot) && (
          <div
            {...subSelectProps('card_footer')}
            style={{
              backgroundColor:
                footerSubStyle?.backgroundColor && footerSubStyle.backgroundColor !== 'transparent'
                  ? footerSubStyle.backgroundColor
                  : accent,
              color: footerSubStyle?.textColor || textColor,
              display: 'flex',
              flexDirection: 'column',
              gap: `${textGap}px`,
            }}
            className={`px-2 py-2 text-center ${subOutlineClass('card_footer')}`}
          >
            {!hideDefaultFooter && !hideDefaultContent && (
              <div {...subSelectProps('card_body')} style={bodyTextStyleOverride} className={subOutlineClass('card_body')}>
                <div
                  style={{
                    fontSize: `${titleSize}px`,
                    lineHeight,
                    ...buildLineClampStyle(titleLines || 2),
                  }}
                  className="font-bold"
                >
                  {content.cardTitle || 'Nama Event / Promo'}
                </div>
                {content.cardSubtitle?.trim() && (
                  <div
                    style={{
                      fontSize: `${subtitleSize}px`,
                      lineHeight,
                      ...buildLineClampStyle(subtitleLines || 2),
                    }}
                    className="opacity-90"
                  >
                    {content.cardSubtitle}
                  </div>
                )}
              </div>
            )}
            {footerSlot}
          </div>
        )}
      </div>
    );
  }

  if (variant === 'badge_tile') {
    const boxSize = content.cardMediaSize ?? 52;
    const boxRadius = content.cardImageRadius ?? 12;
    const titleSize = content.cardTitleSize ?? blockStyle?.fontSize ?? 11.5;
    const subtitleSize = content.cardSubtitleSize ?? 9.5;
    return wrapLink(
      <div
        style={{
          background: `linear-gradient(180deg, ${gradFrom} 0%, ${gradTo} 100%)`,
          borderRadius: `${radius}px`,
          color: textColor,
          minHeight: minHStyle ?? '124px',
          maxHeight: maxHStyle,
          gap: `${Math.max(4, textGap + 2)}px`,
          letterSpacing,
        }}
        className="overflow-hidden flex flex-col shadow-sm"
      >
        <div
          style={{ gap: `${Math.max(4, textGap + 2)}px` }}
          className="px-2.5 py-3 flex flex-col items-center justify-between text-center flex-1"
        >
          {renderCardHeaderBar(true)}
          {!isMediaRemoved && content.cardImage && (
            <div
              {...subSelectProps('card_media')}
              style={{
                width: `${boxSize}px`,
                height: `${boxSize}px`,
                borderRadius: `${mediaSubStyle?.borderRadius ?? boxRadius}px`,
              }}
              className={`overflow-hidden bg-white/15 border border-white/25 flex items-center justify-center shrink-0 ${subOutlineClass('card_media')}`}
            >
              <img
                src={content.cardImage}
                alt={content.cardTitle || 'Badge'}
                referrerPolicy="no-referrer"
                style={imgStyle}
              />
            </div>
          )}
          {!hideDefaultContent && (
            <div
              {...subSelectProps('card_body')}
              className={`w-full flex flex-col items-center ${subOutlineClass('card_body')}`}
              style={{ gap: `${textGap}px`, ...bodyTextStyleOverride }}
            >
              <div
                style={{
                  fontSize: `${bodySubStyle?.fontSize ?? titleSize}px`,
                  lineHeight,
                  ...buildLineClampStyle(titleLines),
                }}
                className="font-bold whitespace-pre-line"
              >
                {content.cardTitle || 'Sertifikasi'}
              </div>
              {content.cardSubtitle?.trim() && (
                <div
                  style={{
                    fontSize: `${subtitleSize}px`,
                    lineHeight,
                    ...buildLineClampStyle(subtitleLines || 2),
                  }}
                  className="opacity-90 whitespace-pre-line"
                >
                  {content.cardSubtitle}
                </div>
              )}
            </div>
          )}
          {bodySlot && <div className="w-full">{bodySlot}</div>}
        </div>
        {renderOptionalFooterStrip()}
      </div>
    );
  }

  if (variant === 'store_card') {
    const cartEnabled = Boolean(content.cardEnableCart) && !content.universalCartEnabled;
    const boxSize = content.cardMediaSize ?? 68;
    const boxRadius = content.cardImageRadius ?? 12;
    const titleSize = content.cardTitleSize ?? blockStyle?.fontSize ?? 13;
    const subtitleSize = content.cardSubtitleSize ?? 10.5;
    return (
      <div
        style={{
          background: `linear-gradient(180deg, ${gradFrom} 0%, ${gradTo} 100%)`,
          borderRadius: `${radius}px`,
          color: textColor,
          minHeight: minHStyle ?? '168px',
          maxHeight: maxHStyle,
          letterSpacing,
        }}
        className="relative overflow-hidden flex flex-col shadow-sm"
      >
        {renderCardHeaderBar(true)}
        <div className="px-2.5 pt-3 pb-3 flex flex-col items-center text-center justify-between gap-2 flex-1">
          {!isMediaRemoved && content.cardImage && (
            <div
              {...subSelectProps('card_media')}
              style={{
                width: `${boxSize}px`,
                height: `${boxSize}px`,
                borderRadius: `${mediaSubStyle?.borderRadius ?? boxRadius}px`,
              }}
              className={`mt-2 overflow-hidden bg-white/15 border border-white/25 shadow-sm flex items-center justify-center shrink-0 ${subOutlineClass('card_media')}`}
            >
              <img
                src={content.cardImage}
                alt={content.cardTitle || 'Produk'}
                referrerPolicy="no-referrer"
                style={imgStyle}
              />
            </div>
          )}
          {!hideDefaultContent && (
            <>
              {content.cardShowPlayIcon !== false && (
                <span className="absolute top-2 right-2 w-5 h-5 rounded-full bg-white/30 backdrop-blur-sm flex items-center justify-center text-white">
                  <Play className="w-2.5 h-2.5 fill-current ml-0.5" />
                </span>
              )}
              <div
                {...subSelectProps('card_body')}
                className={`w-full flex flex-col items-center ${subOutlineClass('card_body')}`}
                style={{ gap: `${textGap}px`, ...bodyTextStyleOverride }}
              >
                <div
                  style={{
                    fontSize: `${bodySubStyle?.fontSize ?? titleSize}px`,
                    lineHeight,
                    ...buildLineClampStyle(titleLines || 2),
                  }}
                  className="font-extrabold w-full"
                >
                  {content.cardTitle || 'Nama Produk'}
                </div>
                {content.cardSubtitle?.trim() && (
                  <div
                    style={{
                      fontSize: `${subtitleSize}px`,
                      lineHeight,
                      ...buildLineClampStyle(subtitleLines || 2),
                    }}
                    className="opacity-85 w-full"
                  >
                    {content.cardSubtitle}
                  </div>
                )}
                {content.cardPrice?.trim() && !content.universalCartEnabled && (
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
            </>
          )}
          {bodySlot && <div className="w-full">{bodySlot}</div>}
        </div>
        {renderOptionalFooterStrip()}
      </div>
    );
  }

  if (variant === 'popout_product') {
    const cartEnabled = Boolean(content.cardEnableCart) && !content.universalCartEnabled;
    const cartPos = content.cardPopoutCartPosition ?? 'bottom-left';
    const showAccentLine = content.cardPopoutAccentLine !== false;
    const mediaW = Math.max(88, Math.min(240, content.cardMediaSize ?? 150));
    const titleSize = content.cardTitleSize ?? blockStyle?.fontSize ?? 15.5;
    const subtitleSize = content.cardSubtitleSize ?? 11.5;
    const pop = resolveImagePopoutMetrics(content, {
      offsetX: 16,
      offsetY: 10,
      rotate: -24,
      scale: 108,
      dropShadowEnabled: true,
      dropShadowX: 8,
      dropShadowY: 18,
      dropShadowBlur: 20,
      dropShadowColor: 'rgba(15, 23, 42, 0.35)',
      hoverFloat3D: true,
      popoutEnabled: true,
    });
    const cardSurfaceStyle: React.CSSProperties = {
      background: `linear-gradient(160deg, ${gradFrom} 0%, ${gradTo} 100%)`,
      borderRadius: `${radius}px`,
      color: textColor,
      minHeight: minHStyle ?? '208px',
      maxHeight: maxHStyle,
      letterSpacing,
      overflow: 'visible',
      boxShadow: '0 14px 26px -12px rgba(15, 23, 42, 0.24)',
    };
    const imgVarsStyle = {
      '--pop-x': `${pop.offsetX}px`,
      '--pop-y': `${pop.offsetY}px`,
      '--pop-rot': `${pop.rotate}deg`,
      '--pop-scale': `${pop.scale}`,
      '--pop-shadow': pop.dropShadowCss,
      '--pop-shadow-hover': pop.hoverDropShadowCss,
    } as React.CSSProperties;

    const cardNode = (
      <div className="relative pr-3.5 pb-2.5 overflow-visible">
        <div
          style={cardSurfaceStyle}
          className={`lynk-popout-card ${pop.hoverFloat3D ? 'has-float-3d' : ''} relative flex flex-col justify-between`}
        >
          {renderCardHeaderBar(true)}

          <div className="relative z-10 px-3.5 pt-3.5 pb-3 flex flex-col justify-between flex-1">
            {!hideDefaultContent && (
              <div
                {...subSelectProps('card_body')}
                className={`w-full flex flex-col items-start text-left ${subOutlineClass('card_body')}`}
                style={{ gap: `${Math.max(2, textGap)}px`, ...bodyTextStyleOverride }}
              >
                <div
                  style={{
                    fontSize: `${bodySubStyle?.fontSize ?? titleSize}px`,
                    lineHeight: lineHeight || 1.18,
                    ...buildLineClampStyle(titleLines || 2),
                  }}
                  className="font-extrabold tracking-tight w-full pr-6"
                >
                  {content.cardTitle || 'Alpha Savage'}
                </div>

                {content.cardPrice?.trim() && !content.universalCartEnabled && (
                  <div
                    style={{ fontSize: `${subtitleSize}px` }}
                    className="font-semibold opacity-85 tabular-nums"
                  >
                    {content.cardPrice}
                  </div>
                )}

                {content.cardSubtitle?.trim() && (
                  <div
                    style={{
                      fontSize: `${Math.max(9.5, subtitleSize - 1)}px`,
                      lineHeight,
                      ...buildLineClampStyle(subtitleLines || 2),
                    }}
                    className="opacity-80 max-w-[78%]"
                  >
                    {content.cardSubtitle}
                  </div>
                )}

                {showAccentLine && (
                  <span
                    aria-hidden="true"
                    className="block mt-2 w-[1.5px] h-11 rounded-full"
                    style={{ backgroundColor: textColor, opacity: 0.28 }}
                  />
                )}
              </div>
            )}

            {bodySlot && <div className="w-full relative z-20 mt-2">{bodySlot}</div>}

            {/* Compact corner Cart (+ / Beli) button */}
            {cartEnabled && (
              <div
                className={
                  cartPos === 'top-right'
                    ? 'absolute top-2.5 right-2.5 z-30'
                    : 'mt-auto pt-3 z-30 self-start'
                }
                onClick={(e) => {
                  e.stopPropagation();
                }}
              >
                {!isEditor && cartQty > 0 ? (
                  <div className="inline-flex items-center gap-1 bg-white/95 text-slate-900 rounded-full px-1.5 py-0.5 shadow-md backdrop-blur-xs">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        onDecCart?.();
                      }}
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
                      onClick={(e) => {
                        e.stopPropagation();
                        onIncCart?.();
                      }}
                      className="w-5 h-5 rounded-full bg-emerald-600 text-white hover:bg-emerald-700 flex items-center justify-center cursor-pointer"
                      aria-label="Tambah jumlah"
                    >
                      <Plus className="w-3 h-3" />
                    </button>
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!isEditor) onAddCart?.();
                    }}
                    title="Tambah ke Keranjang"
                    aria-label="Tambah ke Keranjang"
                    className="w-7 h-7 rounded-full bg-white/95 hover:bg-white text-slate-900 shadow-md flex items-center justify-center cursor-pointer transition-transform active:scale-95"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.6]" />
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Floating Pop-Out PNG Image */}
          {!isMediaRemoved && content.cardImage && (
            <div
              {...subSelectProps('card_media')}
              style={{
                width: `${mediaW}px`,
                height: `${Math.round(mediaW * 0.78)}px`,
              }}
              className={`absolute right-0 bottom-0 z-20 flex items-center justify-center overflow-visible ${
                isEditor ? 'cursor-pointer' : 'pointer-events-none'
              } ${subOutlineClass('card_media')}`}
            >
              <img
                src={content.cardImage}
                alt={content.cardTitle || 'Produk 3D'}
                referrerPolicy="no-referrer"
                style={{
                  width: '100%',
                  height: '100%',
                  objectFit: content.cardImageFit ?? 'contain',
                  display: 'block',
                  opacity:
                    typeof mediaSubStyle?.opacity === 'number'
                      ? mediaSubStyle.opacity / 100
                      : undefined,
                  ...imgVarsStyle,
                }}
                className="lynk-popout-card-img select-none"
              />
            </div>
          )}

          {renderOptionalFooterStrip()}
        </div>
      </div>
    );

    if (!isEditor && !hasUniversalAction && !hasInteractiveSlots && actionUrl) {
      return (
        <a
          href={actionUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block no-underline"
        >
          {cardNode}
        </a>
      );
    }
    return cardNode;
  }

  if (variant === 'activity_post') {
    const gallery = (content.cardGalleryImages ?? []).filter(Boolean).slice(0, 6);
    const moreLabel = content.cardMoreLabel?.trim() || 'Selengkapnya';
    const moreUrl = content.cardMoreUrl?.trim() || actionUrl;
    const avatarSize = content.cardMediaSize ?? 40;
    const titleSize = content.cardTitleSize ?? blockStyle?.fontSize ?? 13;
    const subtitleSize = content.cardSubtitleSize ?? 11;
    const galleryRadius = content.cardImageRadius ?? 8;
    return (
      <div
        style={{
          borderRadius: `${radius}px`,
          backgroundColor: theme.cardBg || '#FFFFFF',
          borderColor: theme.borderColor || '#E2E8F0',
          color: theme.textColor || '#1E293B',
          minHeight: minHStyle,
          maxHeight: maxHStyle,
          letterSpacing,
        }}
        className="border overflow-hidden shadow-sm text-left flex flex-col"
      >
        {renderCardHeaderBar(false)}
        <div className="p-3 space-y-2.5">
          {!hideDefaultContent && (
            <>
              <div
                {...subSelectProps('card_body')}
                style={bodyTextStyleOverride}
                className={`flex items-center gap-2.5 ${subOutlineClass('card_body')}`}
              >
                {!isMediaRemoved && content.cardImage && (
                  <div
                    {...subSelectProps('card_media')}
                    style={{ width: `${avatarSize}px`, height: `${avatarSize}px` }}
                    className={`rounded-full overflow-hidden shrink-0 border border-slate-200 ${subOutlineClass('card_media')}`}
                  >
                    <img
                      src={content.cardImage}
                      alt={content.cardTitle || 'Profil'}
                      referrerPolicy="no-referrer"
                      style={imgStyle}
                    />
                  </div>
                )}
                <div className="min-w-0 flex-1 flex flex-col" style={{ gap: `${textGap}px` }}>
                  <div
                    style={{
                      fontSize: `${bodySubStyle?.fontSize ?? titleSize}px`,
                      lineHeight,
                      ...buildLineClampStyle(titleLines || 2),
                    }}
                    className="font-extrabold"
                  >
                    {content.cardTitle || 'Nama Pengurus'}
                  </div>
                  {content.cardSubtitle?.trim() && (
                    <div
                      style={{
                        fontSize: `${subtitleSize}px`,
                        lineHeight,
                        ...buildLineClampStyle(subtitleLines || 2),
                      }}
                      className="opacity-70"
                    >
                      {content.cardSubtitle}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between gap-2 text-[11px] opacity-75">
                <span className="font-medium truncate">
                  {content.cardQuote?.trim() || content.cardHeaderTitle?.trim() || 'Judul Kegiatan'}
                </span>
                {content.cardDate?.trim() && (
                  <span className="shrink-0 tabular-nums">{content.cardDate}</span>
                )}
              </div>

              {!isMediaRemoved && gallery.length > 0 && (
                <div
                  {...subSelectProps('card_media')}
                  className={`grid grid-cols-3 gap-1.5 ${subOutlineClass('card_media')}`}
                >
                  {gallery.map((imgUrl, idx) => (
                    <div
                      key={`gal_${idx}`}
                      style={{
                        borderRadius: `${mediaSubStyle?.borderRadius ?? galleryRadius}px`,
                        height: content.cardMediaHeight ? `${content.cardMediaHeight}px` : undefined,
                      }}
                      className={`${content.cardMediaHeight ? '' : 'aspect-square'} overflow-hidden bg-slate-100`}
                    >
                      <img
                        src={imgUrl}
                        alt={`Foto ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        style={imgStyle}
                      />
                    </div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between pt-1 text-[11px]">
                {!isEditor && !hasUniversalAction && moreUrl ? (
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
            </>
          )}
          {bodySlot && <div className="w-full">{bodySlot}</div>}
        </div>
        {renderOptionalFooterStrip()}
      </div>
    );
  }

  // membership_ticket (Dual-Zone Composable Card: Bagian Atas Putih + Bagian Bawah Strip Warna)
  const feeItems = content.cardFeeItems ?? [];
  const totalLabel = content.cardTotalLabel?.trim() || 'Total :';
  const totalValue = content.cardTotalValue?.trim() || content.cardPrice?.trim() || 'Rp. 500.000,-';
  const titleSize = content.cardTitleSize ?? blockStyle?.fontSize ?? 13.5;
  const subtitleSize = content.cardSubtitleSize ?? 11.5;
  return wrapLink(
    <div
      style={{
        borderRadius: `${radius}px`,
        minHeight: minHStyle,
        maxHeight: maxHStyle,
        letterSpacing,
      }}
      className="relative overflow-hidden bg-white border border-slate-200 shadow-sm text-left"
    >
      {renderCardHeaderBar(false)}
      {/* Zona Atas (Putih): Konten Bawaan (Opsional) + Drop-Zone Komponen Bebas */}
      <div
        className="px-3.5 pt-3.5 pb-4"
        style={{ display: 'flex', flexDirection: 'column', gap: `${Math.max(6, textGap)}px` }}
      >
        {!hideDefaultContent && (
          <div
            {...subSelectProps('card_body')}
            style={{ display: 'flex', flexDirection: 'column', gap: `${Math.max(6, textGap)}px`, ...bodyTextStyleOverride }}
            className={subOutlineClass('card_body')}
          >
            <div
              style={{
                color: bodySubStyle?.textColor || '#0284C7',
                fontSize: `${bodySubStyle?.fontSize ?? titleSize}px`,
                lineHeight,
                ...buildLineClampStyle(titleLines),
              }}
              className="text-center font-extrabold"
            >
              {content.cardTitle || 'Anggota Pratama'}
            </div>
            {content.cardSubtitle?.trim() && (
              <div
                style={{
                  color: '#475569',
                  fontSize: `${Math.max(10, subtitleSize - 1)}px`,
                  lineHeight,
                  ...buildLineClampStyle(subtitleLines),
                }}
                className="text-center"
              >
                {content.cardSubtitle}
              </div>
            )}
            {feeItems.length > 0 && (
              <div
                style={{ display: 'flex', flexDirection: 'column', gap: `${Math.max(3, textGap)}px` }}
                className="pt-0.5"
              >
                {feeItems.map((fee, feeIdx) => (
                  <div
                    key={fee.id}
                    {...subSelectProps(`card_fee_${fee.id || feeIdx}`)}
                    style={{ color: '#0284C7', fontSize: `${subtitleSize}px`, lineHeight }}
                    className={`flex items-center justify-between gap-2 font-semibold ${subOutlineClass(
                      `card_fee_${fee.id || feeIdx}`
                    )}`}
                  >
                    <span className="truncate">{fee.label}</span>
                    <span className="shrink-0 tabular-nums">: {fee.value}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {bodySlot}
      </div>

      {/* Perforated ticket notches + Zona Bawah Strip Warna (Total Bawaan Opsional + Drop-Zone Aksi/Keranjang/Tombol/Icon) */}
      {(!hideDefaultFooter || footerSlot) && (
        <div className="relative">
          <span
            aria-hidden="true"
            className="absolute -left-2.5 -top-2.5 w-5 h-5 rounded-full bg-slate-100 border border-slate-200 z-10 pointer-events-none"
          />
          <span
            aria-hidden="true"
            className="absolute -right-2.5 -top-2.5 w-5 h-5 rounded-full bg-slate-100 border border-slate-200 z-10 pointer-events-none"
          />
          <div
            {...subSelectProps('card_footer')}
            style={{
              backgroundColor:
                footerSubStyle?.backgroundColor && footerSubStyle.backgroundColor !== 'transparent'
                  ? footerSubStyle.backgroundColor
                  : accent,
              color: footerSubStyle?.textColor || textColor,
            }}
            className={`px-3.5 py-3 flex flex-col gap-2 ${subOutlineClass('card_footer')}`}
          >
            {!hideDefaultFooter && (
              <div className="flex items-center justify-center gap-2 font-extrabold text-[13.5px]">
                <Wallet className="w-4 h-4 shrink-0" />
                <span>{totalLabel}</span>
                <span className="tabular-nums">{totalValue}</span>
              </div>
            )}
            {footerSlot}
          </div>
        </div>
      )}
    </div>
  );
}
