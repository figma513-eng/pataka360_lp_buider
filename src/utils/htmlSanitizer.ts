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
        imageBgColor: it.imageBgColor
          ? sanitizeCssColor(it.imageBgColor, '#F1F5F9')
          : it.imageBgColor,
        imageBorderColor: it.imageBorderColor
          ? sanitizeCssColor(it.imageBorderColor, '#E2E8F0')
          : it.imageBorderColor,
        cardBgColor: it.cardBgColor ? sanitizeCssColor(it.cardBgColor, '#FFFFFF') : it.cardBgColor,
        accentColor: it.accentColor ? sanitizeCssColor(it.accentColor, '#EA580C') : it.accentColor,
        badgeBgColor: it.badgeBgColor
          ? sanitizeCssColor(it.badgeBgColor, '#F1F5F9')
          : it.badgeBgColor,
        badgeTextColor: it.badgeTextColor
          ? sanitizeCssColor(it.badgeTextColor, '#334155')
          : it.badgeTextColor,
        imageSize:
          typeof it.imageSize === 'number' && Number.isFinite(it.imageSize)
            ? Math.max(44, Math.min(160, Math.round(it.imageSize)))
            : undefined,
        imageZoom:
          typeof it.imageZoom === 'number' && Number.isFinite(it.imageZoom)
            ? Math.max(40, Math.min(260, Math.round(it.imageZoom)))
            : undefined,
        imageRadius:
          typeof it.imageRadius === 'number' && Number.isFinite(it.imageRadius)
            ? Math.max(0, Math.min(48, Math.round(it.imageRadius)))
            : undefined,
        imagePadding:
          typeof it.imagePadding === 'number' && Number.isFinite(it.imagePadding)
            ? Math.max(0, Math.min(24, Math.round(it.imagePadding)))
            : undefined,
        imagePositionX:
          typeof it.imagePositionX === 'number' && Number.isFinite(it.imagePositionX)
            ? Math.max(0, Math.min(100, Math.round(it.imagePositionX)))
            : undefined,
        imagePositionY:
          typeof it.imagePositionY === 'number' && Number.isFinite(it.imagePositionY)
            ? Math.max(0, Math.min(100, Math.round(it.imagePositionY)))
            : undefined,
        imageBorderWidth:
          typeof it.imageBorderWidth === 'number' && Number.isFinite(it.imageBorderWidth)
            ? Math.max(0, Math.min(4, Math.round(it.imageBorderWidth)))
            : undefined,
      }))
    : c.fnbItems;

  const sanitizedBoxShowcaseItems = Array.isArray(c.boxShowcaseItems)
    ? c.boxShowcaseItems.map((it) => ({
        ...it,
        title: String(it.title || 'Produk').slice(0, 120),
        category: it.category ? String(it.category).slice(0, 60) : undefined,
        price: String(it.price || '').slice(0, 40),
        rating: it.rating ? String(it.rating).slice(0, 12) : undefined,
        image:
          it.image && /^(data:image\/|https?:\/\/|\/)/i.test(String(it.image).trim())
            ? String(it.image).trim()
            : '',
        boxColorOverride: it.boxColorOverride
          ? sanitizeOptionalCssColor(it.boxColorOverride) ?? undefined
          : undefined,
      }))
    : c.boxShowcaseItems;

  const sanitizedBoxRevealItems = Array.isArray(c.boxRevealItems)
    ? c.boxRevealItems.map((it) => ({
        ...it,
        title: String(it.title || 'Produk').slice(0, 120),
        price: String(it.price || '').slice(0, 40),
        description: it.description ? String(it.description).slice(0, 400) : undefined,
        variants: it.variants ? String(it.variants).slice(0, 180) : undefined,
        image:
          it.image && /^(data:image\/|https?:\/\/|\/)/i.test(String(it.image).trim())
            ? String(it.image).trim()
            : '',
        lidLogoImage:
          it.lidLogoImage && /^(data:image\/|https?:\/\/|\/)/i.test(String(it.lidLogoImage).trim())
            ? String(it.lidLogoImage).trim()
            : undefined,
        lidLogoSize:
          typeof it.lidLogoSize === 'number' && Number.isFinite(it.lidLogoSize)
            ? Math.max(10, Math.min(100, Math.round(it.lidLogoSize)))
            : undefined,
        lidLogoPadding:
          typeof it.lidLogoPadding === 'number' && Number.isFinite(it.lidLogoPadding)
            ? Math.max(0, Math.min(48, Math.round(it.lidLogoPadding)))
            : undefined,
        lidLogoFit: it.lidLogoFit === 'cover' || it.lidLogoFit === 'contain' ? it.lidLogoFit : undefined,
        boxShapeOverride:
          it.boxShapeOverride === 'square' ||
          it.boxShapeOverride === 'rounded' ||
          it.boxShapeOverride === 'circle'
            ? it.boxShapeOverride
            : undefined,
        boxColorOverride: it.boxColorOverride
          ? sanitizeOptionalCssColor(it.boxColorOverride) ?? undefined
          : undefined,
      }))
    : c.boxRevealItems;

  const sanitizedMixRasaFlavors = Array.isArray(c.mixRasaFlavors)
    ? c.mixRasaFlavors.map((flv) => ({
        ...flv,
        id: String(flv.id || 'mr_flv').slice(0, 60),
        name: String(flv.name || 'Rasa Pilihan').slice(0, 80),
        subtitle:
          typeof flv.subtitle === 'string' ? flv.subtitle.slice(0, 80) : flv.subtitle,
        price: String(flv.price || 'Rp0').slice(0, 40),
        image:
          flv.image && /^(data:image\/|https?:\/\/|\/)/i.test(String(flv.image).trim())
            ? String(flv.image).trim()
            : '',
        imageScale:
          typeof flv.imageScale === 'number' && Number.isFinite(flv.imageScale)
            ? Math.max(50, Math.min(200, Math.round(flv.imageScale)))
            : undefined,
        accentColor: flv.accentColor
          ? sanitizeOptionalCssColor(flv.accentColor) ?? undefined
          : undefined,
      }))
    : c.mixRasaFlavors;

  const sanitizedSlideMixFlavors = Array.isArray(c.slideMixFlavors)
    ? c.slideMixFlavors.map((flv) => ({
        ...flv,
        id: String(flv.id || 'smr_flv').slice(0, 60),
        name: String(flv.name || 'Rasa Pilihan').slice(0, 80),
        subtitle:
          typeof flv.subtitle === 'string' ? flv.subtitle.slice(0, 80) : flv.subtitle,
        price: String(flv.price || 'Rp0').slice(0, 40),
        image:
          flv.image && /^(data:image\/|https?:\/\/|\/)/i.test(String(flv.image).trim())
            ? String(flv.image).trim()
            : '',
        imageScale:
          typeof flv.imageScale === 'number' && Number.isFinite(flv.imageScale)
            ? Math.max(50, Math.min(200, Math.round(flv.imageScale)))
            : undefined,
        accentColor: flv.accentColor
          ? sanitizeOptionalCssColor(flv.accentColor) ?? undefined
          : undefined,
      }))
    : c.slideMixFlavors;

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
      maxHeight:
        typeof block.style?.maxHeight === 'number' && Number.isFinite(block.style.maxHeight)
          ? Math.max(0, Math.min(1200, Math.round(block.style.maxHeight)))
          : block.style?.maxHeight,
      letterSpacing:
        typeof block.style?.letterSpacing === 'number' && Number.isFinite(block.style.letterSpacing)
          ? Math.max(-2, Math.min(12, Math.round(block.style.letterSpacing * 10) / 10))
          : block.style?.letterSpacing,
      paragraphGap:
        typeof block.style?.paragraphGap === 'number' && Number.isFinite(block.style.paragraphGap)
          ? Math.max(0, Math.min(40, Math.round(block.style.paragraphGap)))
          : block.style?.paragraphGap,
      maxLines:
        block.style?.maxLines === 0 ||
        block.style?.maxLines === 1 ||
        block.style?.maxLines === 2 ||
        block.style?.maxLines === 3 ||
        block.style?.maxLines === 4
          ? block.style.maxLines
          : block.style?.maxLines,
      marginTop:
        typeof block.style?.marginTop === 'number' && Number.isFinite(block.style.marginTop)
          ? Math.max(0, Math.min(80, Math.round(block.style.marginTop)))
          : block.style?.marginTop,
      minWidth:
        typeof block.style?.minWidth === 'number' && Number.isFinite(block.style.minWidth)
          ? Math.max(0, Math.min(576, Math.round(block.style.minWidth)))
          : block.style?.minWidth,
      maxWidth:
        typeof block.style?.maxWidth === 'number' && Number.isFinite(block.style.maxWidth)
          ? Math.max(0, Math.min(576, Math.round(block.style.maxWidth)))
          : block.style?.maxWidth,
      heightPx:
        typeof block.style?.heightPx === 'number' && Number.isFinite(block.style.heightPx)
          ? Math.max(0, Math.min(1600, Math.round(block.style.heightPx)))
          : block.style?.heightPx,
      gap:
        typeof block.style?.gap === 'number' && Number.isFinite(block.style.gap)
          ? Math.max(0, Math.min(64, Math.round(block.style.gap)))
          : block.style?.gap,
      zIndex:
        typeof block.style?.zIndex === 'number' && Number.isFinite(block.style.zIndex)
          ? Math.max(-10, Math.min(999, Math.round(block.style.zIndex)))
          : block.style?.zIndex,
      opacity:
        typeof block.style?.opacity === 'number' && Number.isFinite(block.style.opacity)
          ? Math.max(0, Math.min(100, Math.round(block.style.opacity)))
          : block.style?.opacity,
      transformScale:
        typeof block.style?.transformScale === 'number' && Number.isFinite(block.style.transformScale)
          ? Math.max(50, Math.min(150, Math.round(block.style.transformScale)))
          : block.style?.transformScale,
      transformRotate:
        typeof block.style?.transformRotate === 'number' && Number.isFinite(block.style.transformRotate)
          ? Math.max(-180, Math.min(180, Math.round(block.style.transformRotate)))
          : block.style?.transformRotate,
      transitionMs:
        typeof block.style?.transitionMs === 'number' && Number.isFinite(block.style.transitionMs)
          ? Math.max(0, Math.min(2000, Math.round(block.style.transitionMs)))
          : block.style?.transitionMs,
      bgImageUrl: block.style?.bgImageUrl
        ? sanitizeImageOrMediaUrl(block.style.bgImageUrl)
        : block.style?.bgImageUrl,
      bgImageScale:
        typeof block.style?.bgImageScale === 'number' && Number.isFinite(block.style.bgImageScale)
          ? Math.max(50, Math.min(250, Math.round(block.style.bgImageScale)))
          : block.style?.bgImageScale,
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
      responsive: block.style?.responsive
        ? (() => {
            const sanitizeLayer = (
              raw?: NonNullable<BuilderBlock['style']['responsive']>['tablet']
            ) => {
              if (!raw || typeof raw !== 'object') return undefined;
              const out: NonNullable<BuilderBlock['style']['responsive']>['tablet'] = {};
              const clampNum = (v: unknown, min: number, max: number) =>
                typeof v === 'number' && Number.isFinite(v)
                  ? Math.max(min, Math.min(max, Math.round(v)))
                  : undefined;
              if (raw.widthPercent !== undefined) out.widthPercent = clampNum(raw.widthPercent, 10, 100);
              if (raw.minWidth !== undefined) out.minWidth = clampNum(raw.minWidth, 0, 1280);
              if (raw.maxWidth !== undefined) out.maxWidth = clampNum(raw.maxWidth, 0, 1280);
              if (raw.heightPx !== undefined) out.heightPx = clampNum(raw.heightPx, 0, 1600);
              if (raw.minHeight !== undefined) out.minHeight = clampNum(raw.minHeight, 0, 1200);
              if (raw.maxHeight !== undefined) out.maxHeight = clampNum(raw.maxHeight, 0, 1600);
              if (
                raw.displayMode === 'block' ||
                raw.displayMode === 'flex' ||
                raw.displayMode === 'grid' ||
                raw.displayMode === 'inline-flex'
              ) {
                out.displayMode = raw.displayMode;
              }
              if (
                raw.flexDirection === 'column' ||
                raw.flexDirection === 'row' ||
                raw.flexDirection === 'column-reverse' ||
                raw.flexDirection === 'row-reverse'
              ) {
                out.flexDirection = raw.flexDirection;
              }
              if (
                raw.alignItems === 'stretch' ||
                raw.alignItems === 'flex-start' ||
                raw.alignItems === 'center' ||
                raw.alignItems === 'flex-end'
              ) {
                out.alignItems = raw.alignItems;
              }
              if (
                raw.justifyContent === 'flex-start' ||
                raw.justifyContent === 'center' ||
                raw.justifyContent === 'flex-end' ||
                raw.justifyContent === 'space-between' ||
                raw.justifyContent === 'space-around'
              ) {
                out.justifyContent = raw.justifyContent;
              }
              if (raw.flexWrap === 'nowrap' || raw.flexWrap === 'wrap') {
                out.flexWrap = raw.flexWrap;
              }
              if (raw.gap !== undefined) out.gap = clampNum(raw.gap, 0, 64);
              if (raw.paddingTop !== undefined) out.paddingTop = clampNum(raw.paddingTop, 0, 96);
              if (raw.paddingRight !== undefined) out.paddingRight = clampNum(raw.paddingRight, 0, 96);
              if (raw.paddingBottom !== undefined) out.paddingBottom = clampNum(raw.paddingBottom, 0, 96);
              if (raw.paddingLeft !== undefined) out.paddingLeft = clampNum(raw.paddingLeft, 0, 96);
              if (raw.marginTop !== undefined) out.marginTop = clampNum(raw.marginTop, 0, 96);
              if (raw.marginBottom !== undefined) out.marginBottom = clampNum(raw.marginBottom, 0, 96);
              return Object.keys(out).length > 0 ? out : undefined;
            };
            const tablet = sanitizeLayer(block.style.responsive.tablet);
            const mobile = sanitizeLayer(block.style.responsive.mobile);
            return tablet || mobile ? { ...(tablet ? { tablet } : {}), ...(mobile ? { mobile } : {}) } : undefined;
          })()
        : undefined,
    },
    content: {
      ...c,
      videoMuted: typeof c.videoMuted === 'boolean' ? c.videoMuted : c.videoMuted,
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
      fnbFloatingCartPosition:
        c.fnbFloatingCartPosition === 'bottom-floating' ||
        c.fnbFloatingCartPosition === 'bottom-docked' ||
        c.fnbFloatingCartPosition === 'top-floating' ||
        c.fnbFloatingCartPosition === 'bottom-left' ||
        c.fnbFloatingCartPosition === 'bottom-right' ||
        c.fnbFloatingCartPosition === 'top-left' ||
        c.fnbFloatingCartPosition === 'top-right'
          ? c.fnbFloatingCartPosition
          : c.fnbFloatingCartPosition,
      thickness:
        typeof c.thickness === 'number' && Number.isFinite(c.thickness)
          ? Math.max(1, Math.min(12, Math.round(c.thickness)))
          : c.thickness,
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
      carouselShowDots:
        typeof c.carouselShowDots === 'boolean' ? c.carouselShowDots : c.carouselShowDots,
      carouselShowArrows:
        typeof c.carouselShowArrows === 'boolean' ? c.carouselShowArrows : c.carouselShowArrows,
      carouselShowScrollbar:
        typeof c.carouselShowScrollbar === 'boolean'
          ? c.carouselShowScrollbar
          : c.carouselShowScrollbar,
      socialItems: sanitizedSocialItems,
      socialFollowerAccounts: sanitizedSocialFollowers,
      socialFeedPosts: sanitizedSocialPosts,
      fnbItems: sanitizedFnbItems,
      boxShowcaseItems: sanitizedBoxShowcaseItems,
      boxShowcaseColor: c.boxShowcaseColor
        ? sanitizeOptionalCssColor(c.boxShowcaseColor) ?? '#F46A1F'
        : c.boxShowcaseColor,
      boxShowcaseBgColor: c.boxShowcaseBgColor
        ? sanitizeOptionalCssColor(c.boxShowcaseBgColor) ?? '#F4F4F6'
        : c.boxShowcaseBgColor,
      boxShowcaseFloatingCartBg: c.boxShowcaseFloatingCartBg
        ? sanitizeOptionalCssColor(c.boxShowcaseFloatingCartBg) ?? '#25272D'
        : c.boxShowcaseFloatingCartBg,
      boxShowcaseSlideMode:
        c.boxShowcaseSlideMode === 'auto' || c.boxShowcaseSlideMode === 'manual'
          ? c.boxShowcaseSlideMode
          : c.boxShowcaseSlideMode,
      boxShowcaseAutoIntervalSec:
        typeof c.boxShowcaseAutoIntervalSec === 'number' &&
        Number.isFinite(c.boxShowcaseAutoIntervalSec)
          ? Math.max(1.4, Math.min(8, c.boxShowcaseAutoIntervalSec))
          : c.boxShowcaseAutoIntervalSec,
      boxShowcaseBoxWidth:
        typeof c.boxShowcaseBoxWidth === 'number' && Number.isFinite(c.boxShowcaseBoxWidth)
          ? Math.max(100, Math.min(260, Math.round(c.boxShowcaseBoxWidth)))
          : undefined,
      boxShowcaseBoxHeight:
        typeof c.boxShowcaseBoxHeight === 'number' && Number.isFinite(c.boxShowcaseBoxHeight)
          ? Math.max(70, Math.min(240, Math.round(c.boxShowcaseBoxHeight)))
          : undefined,
      boxShowcaseImageScale:
        typeof c.boxShowcaseImageScale === 'number' && Number.isFinite(c.boxShowcaseImageScale)
          ? Math.max(40, Math.min(180, Math.round(c.boxShowcaseImageScale)))
          : c.boxShowcaseImageScale,
      boxRevealItems: sanitizedBoxRevealItems,
      boxRevealColor: c.boxRevealColor
        ? sanitizeOptionalCssColor(c.boxRevealColor) ?? '#5C3626'
        : c.boxRevealColor,
      boxRevealBgColor: c.boxRevealBgColor
        ? sanitizeOptionalCssColor(c.boxRevealBgColor) ?? '#EFEFEF'
        : c.boxRevealBgColor,
      boxRevealFloatingCartBg: c.boxRevealFloatingCartBg
        ? sanitizeOptionalCssColor(c.boxRevealFloatingCartBg) ?? '#5C3626'
        : c.boxRevealFloatingCartBg,
      boxRevealShowCartButton:
        typeof c.boxRevealShowCartButton === 'boolean'
          ? c.boxRevealShowCartButton
          : c.boxRevealShowCartButton,
      boxRevealShowDots:
        typeof c.boxRevealShowDots === 'boolean' ? c.boxRevealShowDots : c.boxRevealShowDots,
      boxRevealDotsPosition:
        c.boxRevealDotsPosition === 'right' ||
        c.boxRevealDotsPosition === 'left' ||
        c.boxRevealDotsPosition === 'bottom' ||
        c.boxRevealDotsPosition === 'top'
          ? c.boxRevealDotsPosition
          : c.boxRevealDotsPosition,
      boxRevealVerticalSwipeEnabled:
        typeof c.boxRevealVerticalSwipeEnabled === 'boolean'
          ? c.boxRevealVerticalSwipeEnabled
          : c.boxRevealVerticalSwipeEnabled,
      boxRevealSlideMode:
        c.boxRevealSlideMode === 'auto' || c.boxRevealSlideMode === 'manual'
          ? c.boxRevealSlideMode
          : c.boxRevealSlideMode,
      boxRevealAutoIntervalSec:
        typeof c.boxRevealAutoIntervalSec === 'number' &&
        Number.isFinite(c.boxRevealAutoIntervalSec)
          ? Math.max(2, Math.min(10, Math.round(c.boxRevealAutoIntervalSec * 10) / 10))
          : c.boxRevealAutoIntervalSec,
      boxRevealZoomEffectEnabled:
        typeof c.boxRevealZoomEffectEnabled === 'boolean'
          ? c.boxRevealZoomEffectEnabled
          : c.boxRevealZoomEffectEnabled,
      boxRevealProductZoomStart:
        typeof c.boxRevealProductZoomStart === 'number' &&
        Number.isFinite(c.boxRevealProductZoomStart)
          ? Math.max(50, Math.min(180, Math.round(c.boxRevealProductZoomStart)))
          : c.boxRevealProductZoomStart,
      boxRevealProductZoomEnd:
        typeof c.boxRevealProductZoomEnd === 'number' && Number.isFinite(c.boxRevealProductZoomEnd)
          ? Math.max(40, Math.min(160, Math.round(c.boxRevealProductZoomEnd)))
          : c.boxRevealProductZoomEnd,
      boxRevealBoxSize:
        typeof c.boxRevealBoxSize === 'number' && Number.isFinite(c.boxRevealBoxSize)
          ? Math.max(140, Math.min(300, Math.round(c.boxRevealBoxSize)))
          : c.boxRevealBoxSize,
      boxRevealBorderThickness:
        typeof c.boxRevealBorderThickness === 'number' &&
        Number.isFinite(c.boxRevealBorderThickness)
          ? Math.max(1, Math.min(36, Math.round(c.boxRevealBorderThickness)))
          : c.boxRevealBorderThickness,
      boxRevealBoxShape:
        c.boxRevealBoxShape === 'square' ||
        c.boxRevealBoxShape === 'rounded' ||
        c.boxRevealBoxShape === 'circle'
          ? c.boxRevealBoxShape
          : c.boxRevealBoxShape,
      boxRevealBoxCornerRadius:
        typeof c.boxRevealBoxCornerRadius === 'number' &&
        Number.isFinite(c.boxRevealBoxCornerRadius)
          ? Math.max(0, Math.min(90, Math.round(c.boxRevealBoxCornerRadius)))
          : c.boxRevealBoxCornerRadius,
      boxRevealLidOpenStyle:
        c.boxRevealLidOpenStyle === 'hinge_top' ||
        c.boxRevealLidOpenStyle === 'hinge_left' ||
        c.boxRevealLidOpenStyle === 'hinge_right' ||
        c.boxRevealLidOpenStyle === 'lift' ||
        c.boxRevealLidOpenStyle === 'spin_lift'
          ? c.boxRevealLidOpenStyle
          : c.boxRevealLidOpenStyle,
      boxRevealInnerRimAccent:
        typeof c.boxRevealInnerRimAccent === 'boolean'
          ? c.boxRevealInnerRimAccent
          : c.boxRevealInnerRimAccent,
      boxRevealInnerRimColor: c.boxRevealInnerRimColor
        ? sanitizeOptionalCssColor(c.boxRevealInnerRimColor) ?? '#D4AF37'
        : c.boxRevealInnerRimColor,
      boxRevealShadowIntensity:
        typeof c.boxRevealShadowIntensity === 'number' &&
        Number.isFinite(c.boxRevealShadowIntensity)
          ? Math.max(0, Math.min(100, Math.round(c.boxRevealShadowIntensity)))
          : c.boxRevealShadowIntensity,
      boxRevealLidLogoImage:
        typeof c.boxRevealLidLogoImage === 'string' &&
        /^(data:image\/|https?:\/\/|\/)/i.test(c.boxRevealLidLogoImage.trim())
          ? c.boxRevealLidLogoImage.trim()
          : '',
      boxRevealLidLogoSize:
        typeof c.boxRevealLidLogoSize === 'number' && Number.isFinite(c.boxRevealLidLogoSize)
          ? Math.max(10, Math.min(100, Math.round(c.boxRevealLidLogoSize)))
          : c.boxRevealLidLogoSize,
      boxRevealLidLogoPadding:
        typeof c.boxRevealLidLogoPadding === 'number' && Number.isFinite(c.boxRevealLidLogoPadding)
          ? Math.max(0, Math.min(48, Math.round(c.boxRevealLidLogoPadding)))
          : c.boxRevealLidLogoPadding,
      boxRevealLidLogoFit:
        c.boxRevealLidLogoFit === 'cover' || c.boxRevealLidLogoFit === 'contain'
          ? c.boxRevealLidLogoFit
          : c.boxRevealLidLogoFit,
      boxRevealTransitionEffect:
        c.boxRevealTransitionEffect === 'slide_vertical' ||
        c.boxRevealTransitionEffect === 'fade' ||
        c.boxRevealTransitionEffect === 'zoom_out' ||
        c.boxRevealTransitionEffect === 'flip'
          ? c.boxRevealTransitionEffect
          : c.boxRevealTransitionEffect,
      boxRevealTransitionDurationMs:
        typeof c.boxRevealTransitionDurationMs === 'number' &&
        Number.isFinite(c.boxRevealTransitionDurationMs)
          ? Math.max(220, Math.min(1400, Math.round(c.boxRevealTransitionDurationMs)))
          : c.boxRevealTransitionDurationMs,
      mixRasaTitle:
        typeof c.mixRasaTitle === 'string' ? c.mixRasaTitle.slice(0, 120) : c.mixRasaTitle,
      mixRasaProductSize:
        typeof c.mixRasaProductSize === 'string'
          ? c.mixRasaProductSize.slice(0, 80)
          : c.mixRasaProductSize,
      mixRasaShowProductSize:
        typeof c.mixRasaShowProductSize === 'boolean'
          ? c.mixRasaShowProductSize
          : c.mixRasaShowProductSize,
      mixRasaShowDescription:
        typeof c.mixRasaShowDescription === 'boolean'
          ? c.mixRasaShowDescription
          : c.mixRasaShowDescription,
      mixRasaDescription:
        typeof c.mixRasaDescription === 'string'
          ? c.mixRasaDescription.slice(0, 320)
          : c.mixRasaDescription,
      mixRasaSliceCount:
        c.mixRasaSliceCount === 2 || c.mixRasaSliceCount === 3 || c.mixRasaSliceCount === 4
          ? c.mixRasaSliceCount
          : c.mixRasaSliceCount,
      mixRasaAllowSliceSwitch:
        typeof c.mixRasaAllowSliceSwitch === 'boolean'
          ? c.mixRasaAllowSliceSwitch
          : c.mixRasaAllowSliceSwitch,
      mixRasaPreviewSize:
        typeof c.mixRasaPreviewSize === 'number' && Number.isFinite(c.mixRasaPreviewSize)
          ? Math.max(150, Math.min(320, Math.round(c.mixRasaPreviewSize)))
          : c.mixRasaPreviewSize,
      mixRasaShowBackButton:
        typeof c.mixRasaShowBackButton === 'boolean'
          ? c.mixRasaShowBackButton
          : c.mixRasaShowBackButton,
      mixRasaCenterHeader:
        typeof c.mixRasaCenterHeader === 'boolean'
          ? c.mixRasaCenterHeader
          : c.mixRasaCenterHeader,
      mixRasaBackActionType:
        c.mixRasaBackActionType === 'back' ||
        c.mixRasaBackActionType === 'page' ||
        c.mixRasaBackActionType === 'url'
          ? c.mixRasaBackActionType
          : c.mixRasaBackActionType,
      mixRasaBackTargetPageId:
        typeof c.mixRasaBackTargetPageId === 'string'
          ? c.mixRasaBackTargetPageId.slice(0, 80)
          : c.mixRasaBackTargetPageId,
      mixRasaBackUrl: c.mixRasaBackUrl
        ? sanitizeExternalUrl(c.mixRasaBackUrl, '')
        : c.mixRasaBackUrl,
      mixRasaFlavors: sanitizedMixRasaFlavors,
      mixRasaDefaultSelectionIds: Array.isArray(c.mixRasaDefaultSelectionIds)
        ? c.mixRasaDefaultSelectionIds.slice(0, 4).map((id) => String(id).slice(0, 60))
        : c.mixRasaDefaultSelectionIds,
      mixRasaBgColor: c.mixRasaBgColor
        ? sanitizeOptionalCssColor(c.mixRasaBgColor) ?? '#FFFFFF'
        : c.mixRasaBgColor,
      mixRasaAccentColor: c.mixRasaAccentColor
        ? sanitizeOptionalCssColor(c.mixRasaAccentColor) ?? '#EA6314'
        : c.mixRasaAccentColor,
      mixRasaFloatingCartEnabled:
        typeof c.mixRasaFloatingCartEnabled === 'boolean'
          ? c.mixRasaFloatingCartEnabled
          : c.mixRasaFloatingCartEnabled,
      mixRasaFloatingCartLabel:
        typeof c.mixRasaFloatingCartLabel === 'string'
          ? c.mixRasaFloatingCartLabel.slice(0, 60)
          : c.mixRasaFloatingCartLabel,
      mixRasaFloatingCartBg: c.mixRasaFloatingCartBg
        ? sanitizeOptionalCssColor(c.mixRasaFloatingCartBg) ?? '#EA6314'
        : c.mixRasaFloatingCartBg,
      mixRasaCartButtonLabel:
        typeof c.mixRasaCartButtonLabel === 'string'
          ? c.mixRasaCartButtonLabel.slice(0, 60)
          : c.mixRasaCartButtonLabel,
      mixRasaStoreName:
        typeof c.mixRasaStoreName === 'string'
          ? c.mixRasaStoreName.slice(0, 120)
          : c.mixRasaStoreName,
      mixRasaWaEnabled:
        typeof c.mixRasaWaEnabled === 'boolean' ? c.mixRasaWaEnabled : c.mixRasaWaEnabled,
      mixRasaWaNumber:
        typeof c.mixRasaWaNumber === 'string'
          ? c.mixRasaWaNumber.replace(/[^\d+]/g, '').slice(0, 24)
          : c.mixRasaWaNumber,
      mixRasaWaLabel:
        typeof c.mixRasaWaLabel === 'string'
          ? c.mixRasaWaLabel.slice(0, 60)
          : c.mixRasaWaLabel,
      mixRasaWaIntro:
        typeof c.mixRasaWaIntro === 'string'
          ? c.mixRasaWaIntro.slice(0, 400)
          : c.mixRasaWaIntro,
      mixRasaWaIncludeDetails:
        typeof c.mixRasaWaIncludeDetails === 'boolean'
          ? c.mixRasaWaIncludeDetails
          : c.mixRasaWaIncludeDetails,
      slideMixTitle:
        typeof c.slideMixTitle === 'string' ? c.slideMixTitle.slice(0, 120) : c.slideMixTitle,
      slideMixProductSize:
        typeof c.slideMixProductSize === 'string'
          ? c.slideMixProductSize.slice(0, 80)
          : c.slideMixProductSize,
      slideMixShowProductSize:
        typeof c.slideMixShowProductSize === 'boolean'
          ? c.slideMixShowProductSize
          : c.slideMixShowProductSize,
      slideMixShowDescription:
        typeof c.slideMixShowDescription === 'boolean'
          ? c.slideMixShowDescription
          : c.slideMixShowDescription,
      slideMixDescription:
        typeof c.slideMixDescription === 'string'
          ? c.slideMixDescription.slice(0, 320)
          : c.slideMixDescription,
      slideMixShowBackButton:
        typeof c.slideMixShowBackButton === 'boolean'
          ? c.slideMixShowBackButton
          : c.slideMixShowBackButton,
      slideMixBackLabel:
        typeof c.slideMixBackLabel === 'string'
          ? c.slideMixBackLabel.slice(0, 40)
          : c.slideMixBackLabel,
      slideMixCenterHeader:
        typeof c.slideMixCenterHeader === 'boolean'
          ? c.slideMixCenterHeader
          : c.slideMixCenterHeader,
      slideMixBackActionType:
        c.slideMixBackActionType === 'back' ||
        c.slideMixBackActionType === 'page' ||
        c.slideMixBackActionType === 'url'
          ? c.slideMixBackActionType
          : c.slideMixBackActionType,
      slideMixBackTargetPageId:
        typeof c.slideMixBackTargetPageId === 'string'
          ? c.slideMixBackTargetPageId.slice(0, 80)
          : c.slideMixBackTargetPageId,
      slideMixBackUrl: c.slideMixBackUrl
        ? sanitizeExternalUrl(c.slideMixBackUrl, '')
        : c.slideMixBackUrl,
      slideMixFlavors: sanitizedSlideMixFlavors,
      slideMixDefaultLeftId:
        typeof c.slideMixDefaultLeftId === 'string'
          ? c.slideMixDefaultLeftId.slice(0, 60)
          : c.slideMixDefaultLeftId,
      slideMixDefaultRightId:
        typeof c.slideMixDefaultRightId === 'string'
          ? c.slideMixDefaultRightId.slice(0, 60)
          : c.slideMixDefaultRightId,
      slideMixShowDiceButton:
        typeof c.slideMixShowDiceButton === 'boolean'
          ? c.slideMixShowDiceButton
          : c.slideMixShowDiceButton,
      slideMixLoop:
        typeof c.slideMixLoop === 'boolean' ? c.slideMixLoop : c.slideMixLoop,
      slideMixAutoSlide:
        typeof c.slideMixAutoSlide === 'boolean'
          ? c.slideMixAutoSlide
          : c.slideMixAutoSlide,
      slideMixAutoSlideMs:
        typeof c.slideMixAutoSlideMs === 'number' && Number.isFinite(c.slideMixAutoSlideMs)
          ? Math.max(1500, Math.min(10000, Math.round(c.slideMixAutoSlideMs)))
          : c.slideMixAutoSlideMs,
      slideMixPreviewSize:
        typeof c.slideMixPreviewSize === 'number' && Number.isFinite(c.slideMixPreviewSize)
          ? Math.max(170, Math.min(300, Math.round(c.slideMixPreviewSize)))
          : c.slideMixPreviewSize,
      slideMixPeekSize:
        typeof c.slideMixPeekSize === 'number' && Number.isFinite(c.slideMixPeekSize)
          ? Math.max(60, Math.min(130, Math.round(c.slideMixPeekSize)))
          : c.slideMixPeekSize,
      slideMixPeekOpacity:
        typeof c.slideMixPeekOpacity === 'number' && Number.isFinite(c.slideMixPeekOpacity)
          ? Math.max(0, Math.min(90, Math.round(c.slideMixPeekOpacity)))
          : c.slideMixPeekOpacity,
      slideMixDividerWidth:
        typeof c.slideMixDividerWidth === 'number' && Number.isFinite(c.slideMixDividerWidth)
          ? Math.max(0, Math.min(10, Math.round(c.slideMixDividerWidth)))
          : c.slideMixDividerWidth,
      slideMixDividerColor: c.slideMixDividerColor
        ? sanitizeOptionalCssColor(c.slideMixDividerColor) ?? '#FFFFFF'
        : c.slideMixDividerColor,
      slideMixBgColor: c.slideMixBgColor
        ? sanitizeOptionalCssColor(c.slideMixBgColor) ?? '#FFFFFF'
        : c.slideMixBgColor,
      slideMixAccentColor: c.slideMixAccentColor
        ? sanitizeOptionalCssColor(c.slideMixAccentColor) ?? '#EA6314'
        : c.slideMixAccentColor,
      slideMixPricePrefix:
        typeof c.slideMixPricePrefix === 'string'
          ? c.slideMixPricePrefix.slice(0, 40)
          : c.slideMixPricePrefix,
      slideMixFloatingCartEnabled:
        typeof c.slideMixFloatingCartEnabled === 'boolean'
          ? c.slideMixFloatingCartEnabled
          : c.slideMixFloatingCartEnabled,
      slideMixFloatingCartLabel:
        typeof c.slideMixFloatingCartLabel === 'string'
          ? c.slideMixFloatingCartLabel.slice(0, 60)
          : c.slideMixFloatingCartLabel,
      slideMixFloatingCartBg: c.slideMixFloatingCartBg
        ? sanitizeOptionalCssColor(c.slideMixFloatingCartBg) ?? '#EA6314'
        : c.slideMixFloatingCartBg,
      slideMixCartButtonLabel:
        typeof c.slideMixCartButtonLabel === 'string'
          ? c.slideMixCartButtonLabel.slice(0, 60)
          : c.slideMixCartButtonLabel,
      slideMixStoreName:
        typeof c.slideMixStoreName === 'string'
          ? c.slideMixStoreName.slice(0, 120)
          : c.slideMixStoreName,
      slideMixWaEnabled:
        typeof c.slideMixWaEnabled === 'boolean'
          ? c.slideMixWaEnabled
          : c.slideMixWaEnabled,
      slideMixWaNumber:
        typeof c.slideMixWaNumber === 'string'
          ? c.slideMixWaNumber.replace(/[^\d+]/g, '').slice(0, 24)
          : c.slideMixWaNumber,
      slideMixWaLabel:
        typeof c.slideMixWaLabel === 'string'
          ? c.slideMixWaLabel.slice(0, 60)
          : c.slideMixWaLabel,
      slideMixWaIntro:
        typeof c.slideMixWaIntro === 'string'
          ? c.slideMixWaIntro.slice(0, 400)
          : c.slideMixWaIntro,
      slideMixWaIncludeDetails:
        typeof c.slideMixWaIncludeDetails === 'boolean'
          ? c.slideMixWaIncludeDetails
          : c.slideMixWaIncludeDetails,
      adminCtaEnabled:
        typeof c.adminCtaEnabled === 'boolean' ? c.adminCtaEnabled : c.adminCtaEnabled,
      adminCtaLabel:
        typeof c.adminCtaLabel === 'string' ? c.adminCtaLabel.slice(0, 80) : c.adminCtaLabel,
      adminCtaActionType:
        c.adminCtaActionType === 'whatsapp' ||
        c.adminCtaActionType === 'page' ||
        c.adminCtaActionType === 'sheet'
          ? c.adminCtaActionType
          : c.adminCtaActionType,
      adminCtaWhatsappNumber:
        typeof c.adminCtaWhatsappNumber === 'string'
          ? c.adminCtaWhatsappNumber.slice(0, 32)
          : c.adminCtaWhatsappNumber,
      adminCtaWhatsappMessage:
        typeof c.adminCtaWhatsappMessage === 'string'
          ? c.adminCtaWhatsappMessage.slice(0, 400)
          : c.adminCtaWhatsappMessage,
      adminCtaTargetPageId:
        typeof c.adminCtaTargetPageId === 'string'
          ? c.adminCtaTargetPageId.slice(0, 100)
          : c.adminCtaTargetPageId,
      adminCtaBgColor: c.adminCtaBgColor
        ? sanitizeOptionalCssColor(c.adminCtaBgColor) ?? '#16A34A'
        : c.adminCtaBgColor,
      adminCtaTextColor: c.adminCtaTextColor
        ? sanitizeOptionalCssColor(c.adminCtaTextColor) ?? '#FFFFFF'
        : c.adminCtaTextColor,
      categoryButtons: sanitizedCategoryButtons,
      categoryScrollMode:
        c.categoryScrollMode === 'horizontal' ||
        c.categoryScrollMode === 'vertical' ||
        c.categoryScrollMode === 'wrap'
          ? c.categoryScrollMode
          : c.categoryScrollMode,
      categoryShowScrollbar:
        typeof c.categoryShowScrollbar === 'boolean'
          ? c.categoryShowScrollbar
          : c.categoryShowScrollbar,
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
      rowShowDots: typeof c.rowShowDots === 'boolean' ? c.rowShowDots : c.rowShowDots,
      rowShowScrollbar:
        typeof c.rowShowScrollbar === 'boolean' ? c.rowShowScrollbar : c.rowShowScrollbar,
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
      imageZoom:
        typeof c.imageZoom === 'number' && Number.isFinite(c.imageZoom)
          ? Math.max(50, Math.min(250, Math.round(c.imageZoom)))
          : c.imageZoom,
      heroLogoZoom:
        typeof c.heroLogoZoom === 'number' && Number.isFinite(c.heroLogoZoom)
          ? Math.max(50, Math.min(250, Math.round(c.heroLogoZoom)))
          : c.heroLogoZoom,
      heroCoverZoom:
        typeof c.heroCoverZoom === 'number' && Number.isFinite(c.heroCoverZoom)
          ? Math.max(50, Math.min(250, Math.round(c.heroCoverZoom)))
          : c.heroCoverZoom,
      menuIconImageFit:
        c.menuIconImageFit === 'cover' || c.menuIconImageFit === 'contain'
          ? c.menuIconImageFit
          : c.menuIconImageFit,
      menuIconImageZoom:
        typeof c.menuIconImageZoom === 'number' && Number.isFinite(c.menuIconImageZoom)
          ? Math.max(50, Math.min(250, Math.round(c.menuIconImageZoom)))
          : c.menuIconImageZoom,
      menuIconAction:
        c.menuIconAction === 'sheet' ||
        c.menuIconAction === 'card' ||
        c.menuIconAction === 'page' ||
        c.menuIconAction === 'url' ||
        c.menuIconAction === 'back'
          ? c.menuIconAction
          : c.menuIconAction,
      menuIconSheetPosition:
        c.menuIconSheetPosition === 'bottom' ||
        c.menuIconSheetPosition === 'right' ||
        c.menuIconSheetPosition === 'left' ||
        c.menuIconSheetPosition === 'top'
          ? c.menuIconSheetPosition
          : c.menuIconSheetPosition,
      sheetPosition:
        c.sheetPosition === 'bottom' ||
        c.sheetPosition === 'right' ||
        c.sheetPosition === 'left' ||
        c.sheetPosition === 'top'
          ? c.sheetPosition
          : undefined,
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
      cartFloatingPosition:
        c.cartFloatingPosition === 'bottom-floating' ||
        c.cartFloatingPosition === 'bottom-docked' ||
        c.cartFloatingPosition === 'top-floating' ||
        c.cartFloatingPosition === 'bottom-left' ||
        c.cartFloatingPosition === 'bottom-right' ||
        c.cartFloatingPosition === 'top-left' ||
        c.cartFloatingPosition === 'top-right'
          ? c.cartFloatingPosition
          : c.cartFloatingPosition,
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
      cardMediaSize:
        typeof c.cardMediaSize === 'number' && Number.isFinite(c.cardMediaSize)
          ? Math.max(28, Math.min(260, Math.round(c.cardMediaSize)))
          : c.cardMediaSize,
      cardMediaHeight:
        typeof c.cardMediaHeight === 'number' && Number.isFinite(c.cardMediaHeight)
          ? Math.max(60, Math.min(480, Math.round(c.cardMediaHeight)))
          : c.cardMediaHeight,
      cardImageZoom:
        typeof c.cardImageZoom === 'number' && Number.isFinite(c.cardImageZoom)
          ? Math.max(50, Math.min(250, Math.round(c.cardImageZoom)))
          : c.cardImageZoom,
      cardImageFit:
        c.cardImageFit === 'cover' || c.cardImageFit === 'contain'
          ? c.cardImageFit
          : c.cardImageFit,
      cardImageRadius:
        typeof c.cardImageRadius === 'number' && Number.isFinite(c.cardImageRadius)
          ? Math.max(0, Math.min(999, Math.round(c.cardImageRadius)))
          : c.cardImageRadius,
      cardTitleSize:
        typeof c.cardTitleSize === 'number' && Number.isFinite(c.cardTitleSize)
          ? Math.max(9, Math.min(36, Math.round(c.cardTitleSize)))
          : c.cardTitleSize,
      cardSubtitleSize:
        typeof c.cardSubtitleSize === 'number' && Number.isFinite(c.cardSubtitleSize)
          ? Math.max(9, Math.min(28, Math.round(c.cardSubtitleSize)))
          : c.cardSubtitleSize,
      cardTitleLines:
        c.cardTitleLines === 0 ||
        c.cardTitleLines === 1 ||
        c.cardTitleLines === 2 ||
        c.cardTitleLines === 3
          ? c.cardTitleLines
          : c.cardTitleLines,
      cardSubtitleLines:
        c.cardSubtitleLines === 0 ||
        c.cardSubtitleLines === 1 ||
        c.cardSubtitleLines === 2 ||
        c.cardSubtitleLines === 3
          ? c.cardSubtitleLines
          : c.cardSubtitleLines,
      cardTextGap:
        typeof c.cardTextGap === 'number' && Number.isFinite(c.cardTextGap)
          ? Math.max(0, Math.min(32, Math.round(c.cardTextGap)))
          : c.cardTextGap,
      cardLineHeight:
        typeof c.cardLineHeight === 'number' && Number.isFinite(c.cardLineHeight)
          ? Math.max(1, Math.min(2.6, Math.round(c.cardLineHeight * 100) / 100))
          : c.cardLineHeight,
      cardLetterSpacing:
        typeof c.cardLetterSpacing === 'number' && Number.isFinite(c.cardLetterSpacing)
          ? Math.max(-2, Math.min(10, Math.round(c.cardLetterSpacing * 10) / 10))
          : c.cardLetterSpacing,
      actionType:
        c.actionType === 'none' ||
        c.actionType === 'url' ||
        c.actionType === 'sheet' ||
        c.actionType === 'page' ||
        c.actionType === 'card' ||
        c.actionType === 'back'
          ? c.actionType
          : c.actionType,
      actionUrl: c.actionUrl ? sanitizeExternalUrl(c.actionUrl, '') : c.actionUrl,
      buttonOpenInNewTab:
        typeof c.buttonOpenInNewTab === 'boolean' ? c.buttonOpenInNewTab : c.buttonOpenInNewTab,
      actionSheetPosition:
        c.actionSheetPosition === 'bottom' ||
        c.actionSheetPosition === 'right' ||
        c.actionSheetPosition === 'left' ||
        c.actionSheetPosition === 'top'
          ? c.actionSheetPosition
          : c.actionSheetPosition,
      actionSheetTitle:
        typeof c.actionSheetTitle === 'string'
          ? c.actionSheetTitle.slice(0, 120)
          : c.actionSheetTitle,
      actionSheetBlocks: Array.isArray(c.actionSheetBlocks)
        ? c.actionSheetBlocks.map(sanitizeBlockTree)
        : c.actionSheetBlocks,
      cardHideDefaultContent:
        typeof c.cardHideDefaultContent === 'boolean'
          ? c.cardHideDefaultContent
          : c.cardHideDefaultContent,
      cardHideDefaultFooter:
        typeof c.cardHideDefaultFooter === 'boolean'
          ? c.cardHideDefaultFooter
          : c.cardHideDefaultFooter,
      heroHideDefaultContent:
        typeof c.heroHideDefaultContent === 'boolean'
          ? c.heroHideDefaultContent
          : c.heroHideDefaultContent,
      heroChildrenPosition:
        c.heroChildrenPosition === 'on_cover' ||
        c.heroChildrenPosition === 'inside_card' ||
        c.heroChildrenPosition === 'below_card' ||
        c.heroChildrenPosition === 'overlap_cover'
          ? c.heroChildrenPosition
          : c.heroChildrenPosition,
      cardFooterBlocks: Array.isArray(c.cardFooterBlocks)
        ? c.cardFooterBlocks.map(sanitizeBlockTree)
        : c.cardFooterBlocks,
      actionTargetPageId:
        typeof c.actionTargetPageId === 'string'
          ? c.actionTargetPageId.replace(/[^\w-]/g, '').slice(0, 80)
          : c.actionTargetPageId,
      actionTargetBlockId:
        typeof c.actionTargetBlockId === 'string'
          ? c.actionTargetBlockId.replace(/[^\w-]/g, '').slice(0, 80)
          : c.actionTargetBlockId,
      universalCartImage: c.universalCartImage
        ? sanitizeImageOrMediaUrl(c.universalCartImage)
        : c.universalCartImage,
      universalCartAccentColor: c.universalCartAccentColor
        ? sanitizeCssColor(c.universalCartAccentColor, '#059669')
        : c.universalCartAccentColor,
      universalCartFloatingBg: c.universalCartFloatingBg
        ? sanitizeCssColor(c.universalCartFloatingBg, '#059669')
        : c.universalCartFloatingBg,
      universalCartFloatingPosition:
        c.universalCartFloatingPosition === 'bottom-floating' ||
        c.universalCartFloatingPosition === 'bottom-docked' ||
        c.universalCartFloatingPosition === 'top-floating' ||
        c.universalCartFloatingPosition === 'bottom-left' ||
        c.universalCartFloatingPosition === 'bottom-right' ||
        c.universalCartFloatingPosition === 'top-left' ||
        c.universalCartFloatingPosition === 'top-right'
          ? c.universalCartFloatingPosition
          : c.universalCartFloatingPosition,
      universalCartUnitSold:
        typeof c.universalCartUnitSold === 'number' && Number.isFinite(c.universalCartUnitSold)
          ? Math.max(0, Math.min(9999999, Math.round(c.universalCartUnitSold)))
          : c.universalCartUnitSold,
      backButtonLabel:
        typeof c.backButtonLabel === 'string'
          ? c.backButtonLabel.slice(0, 80)
          : c.backButtonLabel,
      backButtonBg: c.backButtonBg ? sanitizeCssColor(c.backButtonBg, '#FFFFFF') : c.backButtonBg,
      backButtonText: c.backButtonText
        ? sanitizeCssColor(c.backButtonText, '#0F172A')
        : c.backButtonText,
      backButtonIcon:
        typeof c.backButtonIcon === 'string'
          ? (c.backButtonIcon.replace(/[^\w-]/g, '').slice(0, 40) as BuilderBlock['content']['backButtonIcon'])
          : c.backButtonIcon,
      backButtonIconColor: c.backButtonIconColor
        ? sanitizeCssColor(c.backButtonIconColor, '#0F172A')
        : c.backButtonIconColor,
      backTargetPageId:
        typeof c.backTargetPageId === 'string'
          ? c.backTargetPageId.replace(/[^\w-]/g, '').slice(0, 80)
          : c.backTargetPageId,
      // Container Slider (Section G)
      containerLayoutMode:
        c.containerLayoutMode === 'normal' ||
        c.containerLayoutMode === 'slider_horizontal' ||
        c.containerLayoutMode === 'slider_vertical'
          ? c.containerLayoutMode
          : c.containerLayoutMode,
      sliderVisibleItems:
        typeof c.sliderVisibleItems === 'number' && Number.isFinite(c.sliderVisibleItems)
          ? Math.max(1, Math.min(6, Math.round(c.sliderVisibleItems)))
          : c.sliderVisibleItems,
      sliderGap:
        typeof c.sliderGap === 'number' && Number.isFinite(c.sliderGap)
          ? Math.max(0, Math.min(48, Math.round(c.sliderGap)))
          : c.sliderGap,
      sliderSpeedMs:
        typeof c.sliderSpeedMs === 'number' && Number.isFinite(c.sliderSpeedMs)
          ? Math.max(100, Math.min(2000, Math.round(c.sliderSpeedMs)))
          : c.sliderSpeedMs,
      sliderAutoplayIntervalMs:
        typeof c.sliderAutoplayIntervalMs === 'number' && Number.isFinite(c.sliderAutoplayIntervalMs)
          ? Math.max(1200, Math.min(15000, Math.round(c.sliderAutoplayIntervalMs)))
          : c.sliderAutoplayIntervalMs,
      sliderShowScrollbar:
        typeof c.sliderShowScrollbar === 'boolean'
          ? c.sliderShowScrollbar
          : c.sliderShowScrollbar,
      whatsappTemplateId:
        typeof c.whatsappTemplateId === 'string'
          ? c.whatsappTemplateId.replace(/[^\w-]/g, '').slice(0, 80)
          : c.whatsappTemplateId,
      whatsappLinkId:
        typeof c.whatsappLinkId === 'string'
          ? c.whatsappLinkId.replace(/[^\w-]/g, '').slice(0, 80)
          : c.whatsappLinkId,
      formWhatsappTemplateId:
        typeof c.formWhatsappTemplateId === 'string'
          ? c.formWhatsappTemplateId.replace(/[^\w-]/g, '').slice(0, 80)
          : c.formWhatsappTemplateId,
      formFields: Array.isArray(c.formFields)
        ? c.formFields.map((fld) => ({
            ...fld,
            id: String(fld.id || '').replace(/[^\w-]/g, '').slice(0, 64) || 'fld_1',
            label: String(fld.label || 'Kolom').slice(0, 120),
            placeholder: String(fld.placeholder || '').slice(0, 160),
            helpText: fld.helpText ? String(fld.helpText).slice(0, 200) : fld.helpText,
            errorMessage: fld.errorMessage ? String(fld.errorMessage).slice(0, 200) : fld.errorMessage,
            minLength:
              typeof fld.minLength === 'number' && Number.isFinite(fld.minLength) && fld.minLength > 0
                ? Math.min(2000, Math.round(fld.minLength))
                : undefined,
            maxLength:
              typeof fld.maxLength === 'number' && Number.isFinite(fld.maxLength) && fld.maxLength > 0
                ? Math.min(5000, Math.round(fld.maxLength))
                : undefined,
            phoneFormat:
              fld.phoneFormat === 'whatsapp'
                ? 'whatsapp'
                : fld.phoneFormat === 'general'
                ? 'general'
                : undefined,
            description: fld.description ? String(fld.description).slice(0, 400) : fld.description,
            options: Array.isArray(fld.options)
              ? fld.options.map((o) => String(o || '').slice(0, 120)).slice(0, 40)
              : fld.options,
          }))
        : c.formFields,
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
              sheetPosition:
                it.sheetPosition === 'bottom' ||
                it.sheetPosition === 'right' ||
                it.sheetPosition === 'left' ||
                it.sheetPosition === 'top'
                  ? it.sheetPosition
                  : undefined,
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

  const safePages = Array.isArray(raw.pages)
    ? raw.pages.map((pg, idx) => ({
        id: String(pg.id || `pg_${idx + 1}`).replace(/[^\w-]/g, '').slice(0, 64),
        title: String(pg.title || `Halaman ${idx + 2}`).slice(0, 80),
        showBackButton: pg.showBackButton !== false,
        backButtonLabel:
          typeof pg.backButtonLabel === 'string'
            ? pg.backButtonLabel.slice(0, 60)
            : 'Kembali',
        blocks: Array.isArray(pg.blocks) ? pg.blocks.map(sanitizeBlockTree) : [],
      }))
    : undefined;

  const safeWhatsappCenter = raw.whatsappCenter
    ? {
        mainPhone: String(raw.whatsappCenter.mainPhone || '').replace(/[^\d+]/g, '').slice(0, 24),
        businessName: String(raw.whatsappCenter.businessName || raw.title || 'Usaha Aktif').slice(0, 120),
        businessInfo: String(raw.whatsappCenter.businessInfo || '').slice(0, 300),
        defaultTemplateByType: { ...(raw.whatsappCenter.defaultTemplateByType || {}) },
        templates: Array.isArray(raw.whatsappCenter.templates)
          ? raw.whatsappCenter.templates.slice(0, 50).map((t, idx) => ({
              id: String(t.id || `wa_tpl_${idx + 1}`).replace(/[^\w-]/g, '').slice(0, 64),
              name: String(t.name || `Templat ${idx + 1}`).slice(0, 100),
              type: t.type || 'templat_khusus',
              body: String(t.body || '')
                .replace(/<[^>]+>/g, '')
                .slice(0, 4000),
              isDefault: Boolean(t.isDefault),
              updatedAt: typeof t.updatedAt === 'number' ? t.updatedAt : Date.now(),
            }))
          : [],
        links: Array.isArray(raw.whatsappCenter.links)
          ? raw.whatsappCenter.links.slice(0, 50).map((l, idx) => ({
              id: String(l.id || `wa_link_${idx + 1}`).replace(/[^\w-]/g, '').slice(0, 64),
              name: String(l.name || `Tautan WA ${idx + 1}`).slice(0, 100),
              functionType: l.functionType || 'konsultasi',
              phone: String(l.phone || '').replace(/[^\d+]/g, '').slice(0, 24),
              templateId: l.templateId ? String(l.templateId).replace(/[^\w-]/g, '').slice(0, 64) : undefined,
              customMessage: l.customMessage
                ? String(l.customMessage).replace(/<[^>]+>/g, '').slice(0, 2000)
                : undefined,
              active: l.active !== false,
              updatedAt: typeof l.updatedAt === 'number' ? l.updatedAt : Date.now(),
            }))
          : [],
        updatedAt: typeof raw.whatsappCenter.updatedAt === 'number' ? raw.whatsappCenter.updatedAt : Date.now(),
      }
    : undefined;

  return {
    ...raw,
    title: String(raw.title || 'Halaman Usaha').slice(0, 120),
    theme: sanitizeTheme(raw.theme),
    blocks: safeBlocks,
    pages: safePages,
    bottomNavbar: safeNav,
    publishing,
    adsConfig: ads,
    whatsappCenter: safeWhatsappCenter,
  };
}
