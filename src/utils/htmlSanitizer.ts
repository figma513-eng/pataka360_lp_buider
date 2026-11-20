import type { BuilderBlock, BuilderProject, PageTheme } from '../types/builder.ts';
import { sanitizeExternalUrl } from './urlHelpers.ts';
import { sanitizeFontFamily } from './fontHelpers.ts';

const SAFE_COLOR_REGEX =
  /^(#[0-9a-fA-F]{3,8}|rgb\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*\)|rgba\(\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*\d{1,3}\s*,\s*(0|1|1\.0+|0?\.\d+)\s*\)|transparent|inherit|[a-zA-Z]{3,20})$/;

const LEGACY_FONT_COLOR_MAP: Record<string, string> = {
  black: '#000000',
  white: '#FFFFFF',
  red: '#DC2626',
  blue: '#2563EB',
  green: '#059669',
};

const BLOCKED_TAGS = new Set([
  'script',
  'style',
  'iframe',
  'object',
  'embed',
  'applet',
  'svg',
  'math',
  'form',
  'input',
  'textarea',
  'select',
  'button',
  'meta',
  'link',
  'base',
  'noscript',
  'template',
]);

export function sanitizeCssColor(raw?: string | null, fallback = '#0F172A'): string {
  const val = (raw ?? '').trim();
  if (!val) return fallback;
  if (SAFE_COLOR_REGEX.test(val)) return val;
  return fallback;
}

export function sanitizeOptionalCssColor(raw?: string | null): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (SAFE_COLOR_REGEX.test(trimmed)) return trimmed;
  return null;
}

export function sanitizeInlineRichStyle(styleAttr: string | null): string {
  if (!styleAttr) return '';
  if (/expression\s*\(|javascript:|vbscript:|url\s*\(|-moz-binding|@import/i.test(styleAttr)) {
    return '';
  }
  const parts: string[] = [];
  const declarations = styleAttr.split(';');
  for (const decl of declarations) {
    const colon = decl.indexOf(':');
    if (colon === -1) continue;
    const prop = decl.slice(0, colon).trim().toLowerCase();
    const val = decl.slice(colon + 1).trim();
    if (prop === 'color') {
      const safe = sanitizeOptionalCssColor(val);
      if (safe) parts.push(`color:${safe}`);
    } else if (prop === 'font-weight') {
      if (val === 'bold' || val === '700' || val === '600' || val === 'normal' || val === '400') {
        parts.push(`font-weight:${val}`);
      }
    } else if (prop === 'font-style') {
      if (val === 'italic' || val === 'normal') {
        parts.push(`font-style:${val}`);
      }
    } else if (prop === 'margin-bottom') {
      const m = val.match(/^(\d{1,2})px$/i);
      if (m) {
        const px = Math.max(0, Math.min(40, Number(m[1])));
        parts.push(`margin-bottom:${px}px`);
      }
    }
  }
  return parts.join(';');
}

function escapeHtmlText(str: string): string {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function extractAttr(attrsRaw: string, attrName: string): string | null {
  const re = new RegExp(
    `(?:^|\\s)${attrName}\\s*=\\s*(?:"([^"]*)"|'([^']*)'|([^\\s"'>]+))`,
    'i'
  );
  const match = attrsRaw.match(re);
  if (!match) return null;
  return match[1] ?? match[2] ?? match[3] ?? null;
}

/**
 * Isomorphic strict allowlist HTML sanitizer (no DOMParser dependency — runs identically in Node & Browser).
 */
export function sanitizeRichHtmlIsomorphic(rawInput?: string): string {
  const raw = (rawInput ?? '').trim();
  if (!raw) return '';

  if (!/[<>]/.test(raw)) {
    return raw
      .split('\n')
      .map((line) => `<div>${line ? escapeHtmlText(line) : '<br>'}</div>`)
      .join('');
  }

  // Remove HTML comments completely
  const cleanedRaw = raw.replace(/<!--[\s\S]*?-->/g, '');

  const tokenRe = /<(\/)?([a-zA-Z0-9:-]+)([^>]*)>/g;
  let out = '';
  let lastIdx = 0;
  const openStack: string[] = [];
  let blockedDepth = 0;
  let blockedTagName = '';

  const closeTag = (tag: string) => {
    const idx = openStack.lastIndexOf(tag);
    if (idx === -1) return;
    while (openStack.length > idx) {
      const popped = openStack.pop()!;
      out += `</${popped}>`;
    }
  };

  let match: RegExpExecArray | null;
  while ((match = tokenRe.exec(cleanedRaw)) !== null) {
    if (match.index > lastIdx) {
      const textChunk = cleanedRaw.slice(lastIdx, match.index);
      if (blockedDepth === 0) {
        out += escapeHtmlText(textChunk.replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&nbsp;/gi, (ent) => {
          const low = ent.toLowerCase();
          if (low === '&amp;') return '&';
          if (low === '&lt;') return '<';
          if (low === '&gt;') return '>';
          if (low === '&quot;') return '"';
          if (low === '&#39;') return "'";
          return '\u00a0';
        })).replace(/\u00a0/g, '&nbsp;');
      }
    }
    lastIdx = tokenRe.lastIndex;

    const isClosing = Boolean(match[1]);
    const tag = match[2].toLowerCase();
    const attrsRaw = match[3] || '';
    const isSelfClosing = /\/\s*$/.test(attrsRaw);

    if (blockedDepth > 0) {
      if (!isClosing && tag === blockedTagName && !isSelfClosing) {
        blockedDepth += 1;
      } else if (isClosing && tag === blockedTagName) {
        blockedDepth -= 1;
        if (blockedDepth === 0) blockedTagName = '';
      }
      continue;
    }

    if (BLOCKED_TAGS.has(tag)) {
      if (!isClosing && !isSelfClosing) {
        blockedDepth = 1;
        blockedTagName = tag;
      }
      continue;
    }

    if (tag === 'br') {
      if (!isClosing) out += '<br>';
      continue;
    }

    if (tag === 'b' || tag === 'strong') {
      if (!isClosing) {
        out += '<strong>';
        openStack.push('strong');
      } else {
        closeTag('strong');
      }
      continue;
    }

    if (tag === 'i' || tag === 'em') {
      if (!isClosing) {
        out += '<em>';
        openStack.push('em');
      } else {
        closeTag('em');
      }
      continue;
    }

    if (tag === 'u') {
      if (!isClosing) {
        out += '<u>';
        openStack.push('u');
      } else {
        closeTag('u');
      }
      continue;
    }

    if (tag === 'font') {
      if (!isClosing) {
        const colorAttr = extractAttr(attrsRaw, 'color');
        const safeCol =
          sanitizeOptionalCssColor(colorAttr) ??
          (colorAttr ? LEGACY_FONT_COLOR_MAP[colorAttr.toLowerCase()] ?? null : null);
        if (safeCol) {
          out += `<span style="color:${safeCol}">`;
          openStack.push('span');
        }
      } else {
        closeTag('span');
      }
      continue;
    }

    if (tag === 'span') {
      if (!isClosing) {
        const safeStyle = sanitizeInlineRichStyle(extractAttr(attrsRaw, 'style'));
        if (safeStyle) {
          out += `<span style="${safeStyle}">`;
          openStack.push('span');
        }
      } else {
        closeTag('span');
      }
      continue;
    }

    if (tag === 'p' || tag === 'div' || tag === 'li') {
      if (!isClosing) {
        const safeStyle = sanitizeInlineRichStyle(extractAttr(attrsRaw, 'style'));
        const prefix = tag === 'li' ? '• ' : '';
        out += safeStyle ? `<div style="${safeStyle}">${prefix}` : `<div>${prefix}`;
        openStack.push('div');
      } else {
        closeTag('div');
      }
    }
  }

  if (lastIdx < cleanedRaw.length && blockedDepth === 0) {
    out += escapeHtmlText(cleanedRaw.slice(lastIdx));
  }

  while (openStack.length > 0) {
    out += `</${openStack.pop()!}>`;
  }

  return out;
}

export function sanitizeImageOrMediaUrl(raw?: string | null): string {
  const val = (raw ?? '').trim();
  if (!val) return '';
  if (val.startsWith('/api/media/') || val.startsWith('/assets/')) {
    return val;
  }
  // Allow existing inline raster data URLs (legacy data preserved); explicitly block SVG/HTML/JS data URLs
  if (/^data:image\/(png|jpeg|jpg|webp|gif);base64,[a-zA-Z0-9+/=]+$/i.test(val)) {
    return val;
  }
  if (/^data:image\/svg\+xml/i.test(val)) {
    // Reject potentially active SVG scripts inside data URIs
    if (/<script|on\w+\s*=|javascript:/i.test(val)) {
      return '';
    }
    return val;
  }
  if (/^data:video\/(mp4|webm|ogg);base64,[a-zA-Z0-9+/=]+$/i.test(val)) {
    return val;
  }
  return sanitizeExternalUrl(val, '');
}

function sanitizeBlockTree(block: BuilderBlock): BuilderBlock {
  const c = block.content || {};
  const sanitizedCatalogItems = Array.isArray(c.catalogItems)
    ? c.catalogItems.map((it) => ({
        ...it,
        url: it.url ? sanitizeExternalUrl(it.url, '#') : '',
        image: sanitizeImageOrMediaUrl(it.image),
        gallery: Array.isArray(it.gallery)
          ? it.gallery.map((g) => sanitizeImageOrMediaUrl(g)).filter(Boolean)
          : it.gallery,
      }))
    : c.catalogItems;

  const sanitizedCustomBoxes = Array.isArray(c.trainingCustomBoxes)
    ? c.trainingCustomBoxes.map((b) => ({
        ...b,
        contentHtml: sanitizeRichHtmlIsomorphic(b.contentHtml),
        textColor: b.textColor ? sanitizeCssColor(b.textColor, '#0F172A') : b.textColor,
      }))
    : c.trainingCustomBoxes;

  const sanitizedTrainingMedia = Array.isArray(c.trainingMedia)
    ? c.trainingMedia.map((m) => ({
        ...m,
        imageUrl: sanitizeImageOrMediaUrl(m.imageUrl),
        linkUrl: m.linkUrl ? sanitizeExternalUrl(m.linkUrl, '') : m.linkUrl,
      }))
    : c.trainingMedia;

  const sanitizedCarousel = Array.isArray(c.carouselItems)
    ? c.carouselItems.map((it) => ({
        ...it,
        image: sanitizeImageOrMediaUrl(it.image),
        url: it.url ? sanitizeExternalUrl(it.url, '') : it.url,
      }))
    : c.carouselItems;

  const sanitizedSocialItems = Array.isArray(c.socialItems)
    ? c.socialItems.map((it) => ({
        ...it,
        url: it.url ? sanitizeExternalUrl(it.url, '#') : '#',
      }))
    : c.socialItems;

  const sanitizedSocialFollowers = Array.isArray(c.socialFollowerAccounts)
    ? c.socialFollowerAccounts.map((acc) => ({
        ...acc,
        avatar: acc.avatar ? sanitizeImageOrMediaUrl(acc.avatar) : acc.avatar,
        accountUrl: acc.accountUrl ? sanitizeExternalUrl(acc.accountUrl, '') : acc.accountUrl,
      }))
    : c.socialFollowerAccounts;

  const sanitizedSocialPosts = Array.isArray(c.socialFeedPosts)
    ? c.socialFeedPosts.map((p) => ({
        ...p,
        imageUrl: sanitizeImageOrMediaUrl(p.imageUrl),
        videoUrl: p.videoUrl ? sanitizeImageOrMediaUrl(p.videoUrl) : p.videoUrl,
        url: p.url ? sanitizeExternalUrl(p.url, '') : p.url,
      }))
    : c.socialFeedPosts;

  const sanitizedFnbItems = Array.isArray(c.fnbItems)
    ? c.fnbItems.map((it) => ({
        ...it,
        image: it.image ? sanitizeImageOrMediaUrl(it.image) : '',
        monogramBg: it.monogramBg ? sanitizeCssColor(it.monogramBg, '#FFEDD5') : it.monogramBg,
        monogramColor: it.monogramColor
          ? sanitizeCssColor(it.monogramColor, '#C2410C')
          : it.monogramColor,
      }))
    : c.fnbItems;

  const sanitizedCategoryButtons = Array.isArray(c.categoryButtons)
    ? c.categoryButtons.map((btn) => ({
        ...btn,
        label: String(btn.label || 'Kategori').slice(0, 60),
        targetTitle: btn.targetTitle ? String(btn.targetTitle).slice(0, 120) : undefined,
      }))
    : c.categoryButtons;

  const rawAngle = Number(block.style?.gradientAngle);
  const safeAngle = Number.isFinite(rawAngle)
    ? Math.max(0, Math.min(360, Math.round(rawAngle)))
    : block.style?.gradientAngle;

  return {
    ...block,
    style: {
      ...block.style,
      backgroundColor: sanitizeCssColor(block.style?.backgroundColor, '#FFFFFF'),
      gradientColor1: block.style?.gradientColor1
        ? sanitizeCssColor(block.style.gradientColor1, '#EA580C')
        : block.style?.gradientColor1,
      gradientColor2: block.style?.gradientColor2
        ? sanitizeCssColor(block.style.gradientColor2, '#9A3412')
        : block.style?.gradientColor2,
      gradientColor3: block.style?.gradientColor3
        ? sanitizeCssColor(block.style.gradientColor3, '#7C2D12')
        : block.style?.gradientColor3,
      gradientAngle: safeAngle,
      fontFamily: sanitizeFontFamily(block.style?.fontFamily),
      textColor: sanitizeCssColor(block.style?.textColor, '#0F172A'),
      borderColor: sanitizeCssColor(block.style?.borderColor, '#E2E8F0'),
      shadowColor: block.style?.shadowColor
        ? sanitizeCssColor(block.style.shadowColor, '#0F172A')
        : block.style?.shadowColor,
      shadowSize:
        typeof block.style?.shadowSize === 'number' && Number.isFinite(block.style.shadowSize)
          ? Math.max(0, Math.min(48, Math.round(block.style.shadowSize)))
          : block.style?.shadowSize,
      shapePreset:
        block.style?.shapePreset === 'circle' ||
        block.style?.shapePreset === 'rounded' ||
        block.style?.shapePreset === 'square' ||
        block.style?.shapePreset === 'pill'
          ? block.style.shapePreset
          : block.style?.shapePreset,
      paddingTop:
        typeof block.style?.paddingTop === 'number' && Number.isFinite(block.style.paddingTop)
          ? Math.max(0, Math.min(80, Math.round(block.style.paddingTop)))
          : block.style?.paddingTop,
      paddingBottom:
        typeof block.style?.paddingBottom === 'number' && Number.isFinite(block.style.paddingBottom)
          ? Math.max(0, Math.min(80, Math.round(block.style.paddingBottom)))
          : block.style?.paddingBottom,
      paddingLeft:
        typeof block.style?.paddingLeft === 'number' && Number.isFinite(block.style.paddingLeft)
          ? Math.max(0, Math.min(80, Math.round(block.style.paddingLeft)))
          : block.style?.paddingLeft,
      paddingRight:
        typeof block.style?.paddingRight === 'number' && Number.isFinite(block.style.paddingRight)
          ? Math.max(0, Math.min(80, Math.round(block.style.paddingRight)))
          : block.style?.paddingRight,
      marginTop:
        typeof block.style?.marginTop === 'number' && Number.isFinite(block.style.marginTop)
          ? Math.max(0, Math.min(80, Math.round(block.style.marginTop)))
          : block.style?.marginTop,
      themeOverrideMode:
        block.style?.themeOverrideMode === 'local'
          ? 'local'
          : block.style?.themeOverrideMode === 'global'
          ? 'global'
          : undefined,
      themeOverrideTokens: block.style?.themeOverrideTokens
        ? {
            textColor: Boolean(block.style.themeOverrideTokens.textColor),
            backgroundColor: Boolean(block.style.themeOverrideTokens.backgroundColor),
            borderColor: Boolean(block.style.themeOverrideTokens.borderColor),
            fontFamily: Boolean(block.style.themeOverrideTokens.fontFamily),
            accentColor: Boolean(block.style.themeOverrideTokens.accentColor),
          }
        : undefined,
    },
    content: {
      ...c,
      src: c.src ? sanitizeImageOrMediaUrl(c.src) : c.src,
      url: c.url ? sanitizeExternalUrl(c.url, '#') : c.url,
      heroLogoImage: c.heroLogoImage ? sanitizeImageOrMediaUrl(c.heroLogoImage) : c.heroLogoImage,
      heroCoverImage: c.heroCoverImage
        ? sanitizeImageOrMediaUrl(c.heroCoverImage)
        : c.heroCoverImage,
      heroCoverTitleEnabled:
        c.heroCoverTitleEnabled === false || c.heroCoverFontFamily === '__none__'
          ? false
          : c.heroCoverTitleEnabled,
      heroCoverFontFamily: sanitizeFontFamily(c.heroCoverFontFamily),
      heroCoverTitleSize:
        typeof c.heroCoverTitleSize === 'number' && Number.isFinite(c.heroCoverTitleSize)
          ? Math.max(12, Math.min(48, Math.round(c.heroCoverTitleSize)))
          : c.heroCoverTitleSize,
      heroCoverTitleColor: c.heroCoverTitleColor
        ? sanitizeCssColor(c.heroCoverTitleColor, '#FFFFFF')
        : c.heroCoverTitleColor,
      heroStatusColor: c.heroStatusColor
        ? sanitizeCssColor(c.heroStatusColor, '#16A34A')
        : c.heroStatusColor,
      heroLogoBg: c.heroLogoBg ? sanitizeCssColor(c.heroLogoBg, '#FFEDD5') : c.heroLogoBg,
      heroLogoColor: c.heroLogoColor
        ? sanitizeCssColor(c.heroLogoColor, '#C2410C')
        : c.heroLogoColor,
      fnbAccentColor: c.fnbAccentColor
        ? sanitizeCssColor(c.fnbAccentColor, '#EA580C')
        : c.fnbAccentColor,
      fnbFloatingCartBg: c.fnbFloatingCartBg
        ? sanitizeCssColor(c.fnbFloatingCartBg, '#EA580C')
        : c.fnbFloatingCartBg,
      categoryActiveBg: c.categoryActiveBg
        ? sanitizeCssColor(c.categoryActiveBg, '#EA580C')
        : c.categoryActiveBg,
      categoryActiveText: c.categoryActiveText
        ? sanitizeCssColor(c.categoryActiveText, '#FFFFFF')
        : c.categoryActiveText,
      categoryInactiveBg: c.categoryInactiveBg
        ? sanitizeCssColor(c.categoryInactiveBg, '#F1F5F9')
        : c.categoryInactiveBg,
      categoryInactiveText: c.categoryInactiveText
        ? sanitizeCssColor(c.categoryInactiveText, '#334155')
        : c.categoryInactiveText,
      buttonIconUrl: c.buttonIconUrl ? sanitizeImageOrMediaUrl(c.buttonIconUrl) : c.buttonIconUrl,
      toggleButtonIconUrl: c.toggleButtonIconUrl
        ? sanitizeImageOrMediaUrl(c.toggleButtonIconUrl)
        : c.toggleButtonIconUrl,
      sheetTriggerIconUrl: c.sheetTriggerIconUrl
        ? sanitizeImageOrMediaUrl(c.sheetTriggerIconUrl)
        : c.sheetTriggerIconUrl,
      videoUrl: c.videoUrl ? sanitizeImageOrMediaUrl(c.videoUrl) : c.videoUrl,
      videoPoster: c.videoPoster ? sanitizeImageOrMediaUrl(c.videoPoster) : c.videoPoster,
      youtubeUrl: c.youtubeUrl ? sanitizeExternalUrl(c.youtubeUrl, '') : c.youtubeUrl,
      mapsPhotoUrl: c.mapsPhotoUrl ? sanitizeImageOrMediaUrl(c.mapsPhotoUrl) : c.mapsPhotoUrl,
      mapsUrl: c.mapsUrl ? sanitizeExternalUrl(c.mapsUrl, '') : c.mapsUrl,
      socialFeedAvatar: c.socialFeedAvatar
        ? sanitizeImageOrMediaUrl(c.socialFeedAvatar)
        : c.socialFeedAvatar,
      socialFeedAccountUrl: c.socialFeedAccountUrl
        ? sanitizeExternalUrl(c.socialFeedAccountUrl, '')
        : c.socialFeedAccountUrl,
      catalogItems: sanitizedCatalogItems,
      trainingCustomBoxes: sanitizedCustomBoxes,
      trainingMedia: sanitizedTrainingMedia,
      carouselItems: sanitizedCarousel,
      socialItems: sanitizedSocialItems,
      socialFollowerAccounts: sanitizedSocialFollowers,
      socialFeedPosts: sanitizedSocialPosts,
      fnbItems: sanitizedFnbItems,
      categoryButtons: sanitizedCategoryButtons,
      categoryScrollMode:
        c.categoryScrollMode === 'horizontal' ||
        c.categoryScrollMode === 'vertical' ||
        c.categoryScrollMode === 'wrap'
          ? c.categoryScrollMode
          : c.categoryScrollMode,
      rowLayoutMode:
        c.rowLayoutMode === 'horizontal' ||
        c.rowLayoutMode === 'vertical' ||
        c.rowLayoutMode === 'grid'
          ? c.rowLayoutMode
          : c.rowLayoutMode,
      rowColumns:
        typeof c.rowColumns === 'number' && Number.isFinite(c.rowColumns)
          ? Math.max(1, Math.min(20, Math.round(c.rowColumns)))
          : c.rowColumns,
      rowGridRows:
        typeof c.rowGridRows === 'number' && Number.isFinite(c.rowGridRows)
          ? Math.max(1, Math.min(10, Math.round(c.rowGridRows)))
          : c.rowGridRows,
      rowColumnWidth:
        typeof c.rowColumnWidth === 'number' && Number.isFinite(c.rowColumnWidth)
          ? Math.max(80, Math.min(340, Math.round(c.rowColumnWidth)))
          : c.rowColumnWidth,
      rowColumnMinHeight:
        typeof c.rowColumnMinHeight === 'number' && Number.isFinite(c.rowColumnMinHeight)
          ? Math.max(0, Math.min(360, Math.round(c.rowColumnMinHeight)))
          : c.rowColumnMinHeight,
      rowGap:
        typeof c.rowGap === 'number' && Number.isFinite(c.rowGap)
          ? Math.max(0, Math.min(32, Math.round(c.rowGap)))
          : c.rowGap,
      menuIconImage: c.menuIconImage ? sanitizeImageOrMediaUrl(c.menuIconImage) : c.menuIconImage,
      menuIconShape:
        c.menuIconShape === 'circle' ||
        c.menuIconShape === 'rounded' ||
        c.menuIconShape === 'square' ||
        c.menuIconShape === 'pill'
          ? c.menuIconShape
          : c.menuIconShape,
      menuIconRadius:
        typeof c.menuIconRadius === 'number' && Number.isFinite(c.menuIconRadius)
          ? Math.max(0, Math.min(48, Math.round(c.menuIconRadius)))
          : c.menuIconRadius,
      menuIconSize:
        typeof c.menuIconSize === 'number' && Number.isFinite(c.menuIconSize)
          ? Math.max(36, Math.min(160, Math.round(c.menuIconSize)))
          : c.menuIconSize,
      menuIconImageSize:
        typeof c.menuIconImageSize === 'number' && Number.isFinite(c.menuIconImageSize)
          ? Math.max(16, Math.min(160, Math.round(c.menuIconImageSize)))
          : c.menuIconImageSize,
      menuIconImageFit:
        c.menuIconImageFit === 'cover' || c.menuIconImageFit === 'contain'
          ? c.menuIconImageFit
          : c.menuIconImageFit,
      menuIconAction:
        c.menuIconAction === 'sheet' || c.menuIconAction === 'card'
          ? c.menuIconAction
          : c.menuIconAction,
      menuIconSheetPosition:
        c.menuIconSheetPosition === 'bottom' ||
        c.menuIconSheetPosition === 'right' ||
        c.menuIconSheetPosition === 'left' ||
        c.menuIconSheetPosition === 'top'
          ? c.menuIconSheetPosition
          : c.menuIconSheetPosition,
      menuIconBg: c.menuIconBg ? sanitizeCssColor(c.menuIconBg, '#F0F5FA') : c.menuIconBg,
      menuIconTextColor: c.menuIconTextColor
        ? sanitizeCssColor(c.menuIconTextColor, '#17243D')
        : c.menuIconTextColor,
      formChecklistItems: Array.isArray(c.formChecklistItems)
        ? c.formChecklistItems.map((it) => String(it || '').slice(0, 240))
        : c.formChecklistItems,
      cartProductImage: c.cartProductImage
        ? sanitizeImageOrMediaUrl(c.cartProductImage)
        : c.cartProductImage,
      cartAccentColor: c.cartAccentColor
        ? sanitizeCssColor(c.cartAccentColor, '#EA580C')
        : c.cartAccentColor,
      cartFloatingBg: c.cartFloatingBg
        ? sanitizeCssColor(c.cartFloatingBg, '#059669')
        : c.cartFloatingBg,
      cardImage: c.cardImage ? sanitizeImageOrMediaUrl(c.cardImage) : c.cardImage,
      cardGalleryImages: Array.isArray(c.cardGalleryImages)
        ? c.cardGalleryImages.map((g) => sanitizeImageOrMediaUrl(g))
        : c.cardGalleryImages,
      cardMoreUrl: c.cardMoreUrl ? sanitizeExternalUrl(c.cardMoreUrl, '') : c.cardMoreUrl,
      cardActionUrl: c.cardActionUrl ? sanitizeExternalUrl(c.cardActionUrl, '') : c.cardActionUrl,
      cardGradientFrom: c.cardGradientFrom
        ? sanitizeCssColor(c.cardGradientFrom, '#F97316')
        : c.cardGradientFrom,
      cardGradientTo: c.cardGradientTo
        ? sanitizeCssColor(c.cardGradientTo, '#EA580C')
        : c.cardGradientTo,
      cardAccentColor: c.cardAccentColor
        ? sanitizeCssColor(c.cardAccentColor, '#2563EB')
        : c.cardAccentColor,
      cardTextColor: c.cardTextColor
        ? sanitizeCssColor(c.cardTextColor, '#FFFFFF')
        : c.cardTextColor,
      cardFeeItems: Array.isArray(c.cardFeeItems)
        ? c.cardFeeItems.map((fi) => ({
            id: String(fi.id || 'fee'),
            label: String(fi.label || '').slice(0, 80),
            value: String(fi.value || '').slice(0, 60),
          }))
        : c.cardFeeItems,
    },
    children: Array.isArray(block.children)
      ? block.children.map(sanitizeBlockTree)
      : undefined,
  };
}

function sanitizeTheme(theme: PageTheme): PageTheme {
  return {
    ...theme,
    canvasBg: sanitizeCssColor(theme?.canvasBg, '#F7F9F8'),
    cardBg: sanitizeCssColor(theme?.cardBg, '#FFFFFF'),
    textColor: sanitizeCssColor(theme?.textColor, '#0F172A'),
    accentColor: sanitizeCssColor(theme?.accentColor, '#10B981'),
    borderColor: sanitizeCssColor(theme?.borderColor, '#E2E8F0'),
    fontFamily: sanitizeFontFamily(theme?.fontFamily),
  };
}

export function sanitizeBuilderProject(raw: BuilderProject): BuilderProject {
  const safeBlocks = Array.isArray(raw.blocks) ? raw.blocks.map(sanitizeBlockTree) : [];
  const safeNav = raw.bottomNavbar
    ? {
        ...raw.bottomNavbar,
        barBg: sanitizeCssColor(raw.bottomNavbar.barBg, '#FFFFFF'),
        textColor: sanitizeCssColor(raw.bottomNavbar.textColor, '#0F172A'),
        accentColor: sanitizeCssColor(raw.bottomNavbar.accentColor, '#10B981'),
        borderColor: sanitizeCssColor(raw.bottomNavbar.borderColor, '#E2E8F0'),
        items: Array.isArray(raw.bottomNavbar.items)
          ? raw.bottomNavbar.items.map((it) => ({
              ...it,
              iconUrl: it.iconUrl ? sanitizeImageOrMediaUrl(it.iconUrl) : it.iconUrl,
              linkUrl: it.linkUrl ? sanitizeExternalUrl(it.linkUrl, '#') : it.linkUrl,
              children: Array.isArray(it.children) ? it.children.map(sanitizeBlockTree) : [],
            }))
          : [],
      }
    : undefined;

  const ads = raw.adsConfig
    ? {
        ...raw.adsConfig,
        metaPixelId: String(raw.adsConfig.metaPixelId || '').replace(/[^\w-]/g, '').slice(0, 40),
        tiktokPixelId: String(raw.adsConfig.tiktokPixelId || '').replace(/[^\w-]/g, '').slice(0, 40),
        googleTagId: String(raw.adsConfig.googleTagId || '').replace(/[^\w-]/g, '').slice(0, 40),
        googleAdsConversionLabel: raw.adsConfig.googleAdsConversionLabel
          ? String(raw.adsConfig.googleAdsConversionLabel).replace(/[^\w-]/g, '').slice(0, 60)
          : raw.adsConfig.googleAdsConversionLabel,
        gtmContainerId: raw.adsConfig.gtmContainerId
          ? String(raw.adsConfig.gtmContainerId).replace(/[^\w-]/g, '').slice(0, 40)
          : raw.adsConfig.gtmContainerId,
      }
    : undefined;

  const publishing = raw.publishing
    ? {
        ...raw.publishing,
        seoTitle:
          typeof raw.publishing.seoTitle === 'string'
            ? raw.publishing.seoTitle.trim().slice(0, 120)
            : raw.publishing.seoTitle,
        seoDescription:
          typeof raw.publishing.seoDescription === 'string'
            ? raw.publishing.seoDescription.trim().slice(0, 300)
            : raw.publishing.seoDescription,
        seoImage: raw.publishing.seoImage
          ? sanitizeImageOrMediaUrl(raw.publishing.seoImage)
          : '',
        seoImageAlt:
          typeof raw.publishing.seoImageAlt === 'string'
            ? raw.publishing.seoImageAlt.trim().slice(0, 120)
            : raw.publishing.seoImageAlt,
        seoSiteName:
          typeof raw.publishing.seoSiteName === 'string'
            ? raw.publishing.seoSiteName.trim().slice(0, 80)
            : raw.publishing.seoSiteName,
        seoShareText:
          typeof raw.publishing.seoShareText === 'string'
            ? raw.publishing.seoShareText.trim().slice(0, 280)
            : raw.publishing.seoShareText,
      }
    : undefined;

  return {
    ...raw,
    title: String(raw.title || 'Halaman Usaha').slice(0, 120),
    theme: sanitizeTheme(raw.theme),
    blocks: safeBlocks,
    bottomNavbar: safeNav,
    publishing,
    adsConfig: ads,
  };
}
