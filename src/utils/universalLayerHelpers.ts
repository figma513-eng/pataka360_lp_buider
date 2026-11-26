import type { CSSProperties } from 'react';
import type {
  BuilderBlock,
  BuilderProject,
  BuilderSubPage,
  FloatingCartPosition,
  MenuIconSheetPosition,
  PageTheme,
  UniversalActionType,
} from '../types/builder.ts';

export interface ResolvedUniversalCartMeta {
  enabled: boolean;
  itemId: string;
  compositeKey: string;
  name: string;
  price: string;
  image: string;
  unitSold: number;
  showUnitSold: boolean;
  buttonLabel: string;
  accentColor: string;
  whatsappNumber: string;
  storeName: string;
  floatingEnabled: boolean;
  floatingLabel: string;
  floatingBg: string;
  floatingPosition: FloatingCartPosition;
}

export interface ResolvedBlockAction {
  type: UniversalActionType;
  url: string;
  openInNewTab: boolean;
  sheetPosition: MenuIconSheetPosition;
  sheetTitle: string;
  sheetBlocks: BuilderBlock[];
  targetPageId: string;
  targetBlockId: string;
}

export interface ResolvedProjectFloatingCart {
  label: string;
  bg: string;
  position: FloatingCartPosition;
  offsetY: number;
  sourceBlockId: string;
  sourceBlockLabel: string;
  sourceType: 'fnb_catalog' | 'cart_button' | 'universal_cart';
  totalSources: number;
  alwaysShowWhenEmpty?: boolean;
}

export function isTopFloatingCartPosition(pos?: FloatingCartPosition): boolean {
  return pos === 'top-floating' || pos === 'top-left' || pos === 'top-right';
}

export const UNIVERSAL_CART_EXCLUDED_TYPES = new Set([
  'catalog',
  'fnb_catalog',
  'fnb_hero_slider',
  'culinary_spin_slider',
  'floating_product_studio',
  'interactive_box_showcase',
  'product_box_reveal',
  'mix_rasa',
  'slide_mix_rasa',
  'cart_button',
  'divider',
  'back_button',
]);

export function supportsUniversalCart(blockType: BuilderBlock['type']): boolean {
  return !UNIVERSAL_CART_EXCLUDED_TYPES.has(blockType);
}

export function resolveUniversalCartMeta(
  block: BuilderBlock,
  theme: PageTheme
): ResolvedUniversalCartMeta | null {
  const c = block.content || {};
  if (!c.universalCartEnabled || !supportsUniversalCart(block.type)) return null;

  const fallbackName =
    c.universalCartName ||
    c.cardTitle ||
    c.text ||
    c.label ||
    c.menuIconLabel ||
    block.label ||
    'Produk Pilihan';
  const fallbackPrice = c.universalCartPrice || c.cardPrice || 'Rp 50.000';
  const fallbackImage = c.universalCartImage || c.cardImage || c.src || c.menuIconImage || '';

  return {
    enabled: true,
    itemId: `uc_${block.id}`,
    compositeKey: `${block.id}::uc_${block.id}`,
    name: String(fallbackName).trim() || 'Produk Pilihan',
    price: String(fallbackPrice).trim() || 'Rp 50.000',
    image: fallbackImage,
    unitSold:
      typeof c.universalCartUnitSold === 'number' && Number.isFinite(c.universalCartUnitSold)
        ? Math.max(0, Math.round(c.universalCartUnitSold))
        : 0,
    showUnitSold: c.universalCartShowUnitSold === true,
    buttonLabel: (c.universalCartButtonLabel || 'Tambah').trim() || 'Tambah',
    accentColor: c.universalCartAccentColor || c.cardAccentColor || theme.accentColor || '#059669',
    whatsappNumber: (c.universalCartWhatsappNumber || c.cardWhatsappNumber || '6281234567890').trim(),
    storeName: (c.universalCartStoreName || 'Toko Resmi').trim(),
    floatingEnabled: c.universalCartFloatingEnabled !== false,
    floatingLabel: (c.universalCartFloatingLabel || 'Lihat Keranjang').trim() || 'Lihat Keranjang',
    floatingBg: c.universalCartFloatingBg || theme.accentColor || '#059669',
    floatingPosition: c.universalCartFloatingPosition || 'bottom-floating',
  };
}

export function resolveBlockAction(block: BuilderBlock): ResolvedBlockAction {
  const c = block.content || {};
  let type: UniversalActionType = c.actionType || 'none';
  let resolvedUrl = (c.actionUrl || '').trim();

  // Keep seamless compatibility with back_button & legacy button.content.url
  if (type === 'none' && block.type === 'back_button') {
    type = 'back';
  }
  if (block.type === 'button') {
    const legacyUrl = (c.url || '').trim();
    if (!c.actionType && legacyUrl && legacyUrl !== '#') {
      type = 'url';
    }
    if (type === 'url' && !resolvedUrl) {
      resolvedUrl = legacyUrl;
    }
  }

  return {
    type,
    url: resolvedUrl,
    openInNewTab: c.buttonOpenInNewTab !== false,
    sheetPosition: c.actionSheetPosition || 'bottom',
    sheetTitle: (c.actionSheetTitle || block.label || 'Detail Informasi').trim(),
    sheetBlocks: Array.isArray(c.actionSheetBlocks) ? c.actionSheetBlocks : [],
    targetPageId: (c.actionTargetPageId || '').trim(),
    targetBlockId: (c.actionTargetBlockId || '').trim(),
  };
}

export function getActionBadgeLabel(block: BuilderBlock): string | null {
  const act = resolveBlockAction(block);
  if (act.type === 'none') return null;
  if (act.type === 'sheet') {
    const posMap: Record<MenuIconSheetPosition, string> = {
      bottom: 'Sheet Bawah',
      right: 'Sheet Kanan',
      left: 'Sheet Kiri',
      top: 'Sheet Atas',
    };
    return `${posMap[act.sheetPosition]} (${act.sheetBlocks.length})`;
  }
  if (act.type === 'page') return 'Buka Halaman';
  if (act.type === 'card') return 'Ke Card';
  if (act.type === 'url') return 'Link URL';
  if (act.type === 'back') return 'Kembali';
  return null;
}

export function buildLineClampStyle(lines?: number): CSSProperties {
  if (!lines || lines <= 0) return {};
  return {
    display: '-webkit-box',
    WebkitLineClamp: lines,
    WebkitBoxOrient: 'vertical',
    overflow: 'hidden',
  };
}

export function buildLineClampCss(lines?: number): string {
  if (!lines || lines <= 0) return '';
  return `display:-webkit-box;-webkit-line-clamp:${lines};-webkit-box-orient:vertical;overflow:hidden;`;
}

export function walkAllBlocks(
  blocks: BuilderBlock[],
  visitor: (block: BuilderBlock) => void
): void {
  for (const b of blocks) {
    visitor(b);
    if (b.children?.length) {
      walkAllBlocks(b.children, visitor);
    }
    if (b.content?.actionSheetBlocks?.length) {
      walkAllBlocks(b.content.actionSheetBlocks, visitor);
    }
    if (b.content?.cardFooterBlocks?.length) {
      walkAllBlocks(b.content.cardFooterBlocks, visitor);
    }
  }
}

export function walkProjectBlocks(
  project: Pick<BuilderProject, 'blocks' | 'pages' | 'bottomNavbar'>,
  visitor: (block: BuilderBlock) => void
): void {
  walkAllBlocks(project.blocks || [], visitor);
  for (const item of project.bottomNavbar?.items ?? []) {
    if (item.children?.length) {
      walkAllBlocks(item.children, visitor);
    }
  }
  for (const page of project.pages ?? []) {
    if (page.blocks?.length) {
      walkAllBlocks(page.blocks, visitor);
    }
  }
}

export function resolveProjectFloatingCartConfig(
  blocks: BuilderBlock[],
  navItems?: { children?: BuilderBlock[] }[],
  pages?: BuilderSubPage[]
): ResolvedProjectFloatingCart | null {
  let fnbMatch: BuilderBlock | null = null;
  let cartBtnMatch: BuilderBlock | null = null;
  let showcaseCartMatch: BuilderBlock | null = null;
  let universalCartMatch: BuilderBlock | null = null;
  let totalSources = 0;

  const inspect = (list: BuilderBlock[]) => {
    walkAllBlocks(list, (b) => {
      if (
        (b.type === 'fnb_catalog' && b.content.fnbFloatingCartEnabled !== false) ||
        (b.type === 'fnb_hero_slider' &&
          b.content.fnbSliderEnableCart !== false &&
          b.content.fnbSliderFloatingCartEnabled !== false) ||
        (b.type === 'culinary_spin_slider' &&
          b.content.culinaryShowCartButton !== false &&
          b.content.culinaryFloatingCartEnabled !== false) ||
        (b.type === 'floating_product_studio' &&
          b.content.studioShowCartButton !== false &&
          b.content.studioFloatingCartEnabled !== false) ||
        (b.type === 'interactive_box_showcase' &&
          b.content.boxShowcaseShowCartButton !== false &&
          b.content.boxShowcaseFloatingCartEnabled !== false) ||
        (b.type === 'product_box_reveal' &&
          b.content.boxRevealShowCartButton !== false &&
          b.content.boxRevealFloatingCartEnabled !== false) ||
        (b.type === 'mix_rasa' && b.content.mixRasaFloatingCartEnabled !== false) ||
        (b.type === 'slide_mix_rasa' && b.content.slideMixFloatingCartEnabled !== false)
      ) {
        totalSources += 1;
        if (!fnbMatch) fnbMatch = b;
      } else if (b.type === 'cart_button' && b.content.cartFloatingEnabled !== false) {
        totalSources += 1;
        if (!cartBtnMatch) cartBtnMatch = b;
      } else if (
        b.type === 'showcase_card' &&
        (b.content.cardVariant === 'popout_product' ||
          b.content.cardVariant === 'store_card') &&
        Boolean(b.content.cardEnableCart) &&
        !b.content.universalCartEnabled
      ) {
        totalSources += 1;
        if (!showcaseCartMatch) showcaseCartMatch = b;
      } else if (
        b.content.universalCartEnabled &&
        b.content.universalCartFloatingEnabled !== false &&
        supportsUniversalCart(b.type)
      ) {
        totalSources += 1;
        if (!universalCartMatch) universalCartMatch = b;
      }
    });
  };

  inspect(blocks);
  for (const nav of navItems ?? []) {
    if (nav.children?.length) inspect(nav.children);
  }
  for (const pg of pages ?? []) {
    if (pg.blocks?.length) inspect(pg.blocks);
  }

  if (fnbMatch) {
    const blk = fnbMatch as BuilderBlock;
    const c = blk.content;
    const isHeroSlider = blk.type === 'fnb_hero_slider';
    const isCulinary = blk.type === 'culinary_spin_slider';
    const isStudio = blk.type === 'floating_product_studio';
    const isBoxShowcase = blk.type === 'interactive_box_showcase';
    const isBoxReveal = blk.type === 'product_box_reveal';
    const isMixRasa = blk.type === 'mix_rasa';
    const isSlideMixRasa = blk.type === 'slide_mix_rasa';
    return {
      label: isHeroSlider
        ? c.fnbSliderFloatingCartLabel || 'Lihat Keranjang'
        : isCulinary
        ? c.culinaryFloatingCartLabel || 'Lihat Pesanan'
        : isStudio
        ? c.studioFloatingCartLabel || 'Lihat Keranjang'
        : isBoxShowcase
        ? c.boxShowcaseFloatingCartLabel || 'Lihat Keranjang'
        : isBoxReveal
        ? c.boxRevealFloatingCartLabel || 'Lihat Keranjang'
        : isMixRasa
        ? c.mixRasaFloatingCartLabel || 'Lihat Keranjang'
        : isSlideMixRasa
        ? c.slideMixFloatingCartLabel || 'Lihat Keranjang'
        : c.fnbFloatingCartLabel || 'Lanjut',
      bg: isHeroSlider
        ? c.fnbSliderFloatingCartBg || c.fnbSliderItems?.[0]?.gradientFrom || '#EA580C'
        : isCulinary
        ? c.culinaryFloatingCartBg || c.culinaryAccentColor || '#F43F5E'
        : isStudio
        ? c.studioFloatingCartBg || c.floatingStudioItems?.[0]?.gradientTo || '#111827'
        : isBoxShowcase
        ? c.boxShowcaseFloatingCartBg || c.boxShowcaseColor || '#25272D'
        : isBoxReveal
        ? c.boxRevealFloatingCartBg || c.boxRevealColor || '#5C3626'
        : isMixRasa
        ? c.mixRasaFloatingCartBg || c.mixRasaAccentColor || '#EA6314'
        : isSlideMixRasa
        ? c.slideMixFloatingCartBg || c.slideMixAccentColor || '#EA6314'
        : c.fnbFloatingCartBg || c.fnbAccentColor || '#EA580C',
      position: isHeroSlider
        ? c.fnbSliderFloatingCartPosition || 'bottom-floating'
        : isCulinary
        ? c.culinaryFloatingCartPosition || 'bottom-floating'
        : isStudio
        ? c.studioFloatingCartPosition || 'bottom-floating'
        : isBoxShowcase
        ? c.boxShowcaseFloatingCartPosition || 'bottom-floating'
        : isBoxReveal
        ? c.boxRevealFloatingCartPosition || 'bottom-floating'
        : isMixRasa
        ? c.mixRasaFloatingCartPosition || 'bottom-floating'
        : isSlideMixRasa
        ? c.slideMixFloatingCartPosition || 'bottom-floating'
        : c.fnbFloatingCartPosition || 'bottom-floating',
      offsetY: typeof c.fnbFloatingCartOffsetY === 'number' ? c.fnbFloatingCartOffsetY : 16,
      sourceBlockId: blk.id,
      sourceBlockLabel:
        blk.label ||
        (isHeroSlider
          ? 'Slide Produk F&B'
          : isCulinary
          ? 'Slide Kuliner Putar'
          : isStudio
          ? 'Studio Produk Melayang'
          : isBoxShowcase
          ? 'Interactive Box Showcase'
          : isBoxReveal
          ? 'Animated Product Box Reveal'
          : isMixRasa
          ? 'Mix Rasa'
          : isSlideMixRasa
          ? 'Slide Mix Rasa'
          : 'Katalog FnB'),
      sourceType: 'fnb_catalog',
      totalSources,
      alwaysShowWhenEmpty: isMixRasa || isSlideMixRasa,
    };
  }
  if (cartBtnMatch) {
    const blk = cartBtnMatch as BuilderBlock;
    const c = blk.content;
    return {
      label: c.cartFloatingLabel || 'Lihat Keranjang',
      bg: c.cartFloatingBg || c.cartAccentColor || '#059669',
      position: c.cartFloatingPosition || 'bottom-floating',
      offsetY: 16,
      sourceBlockId: blk.id,
      sourceBlockLabel: blk.label || 'Tombol Keranjang',
      sourceType: 'cart_button',
      totalSources,
    };
  }
  if (showcaseCartMatch) {
    const blk = showcaseCartMatch as BuilderBlock;
    const c = blk.content;
    return {
      label: 'Lihat Keranjang',
      bg: c.cardAccentColor || c.cardGradientTo || '#059669',
      position: 'bottom-floating',
      offsetY: 16,
      sourceBlockId: blk.id,
      sourceBlockLabel: c.cardTitle?.trim() || blk.label || 'Koleksi Produk 3D Pop-Out',
      sourceType: 'cart_button',
      totalSources,
    };
  }
  if (universalCartMatch) {
    const blk = universalCartMatch as BuilderBlock;
    const c = blk.content;
    return {
      label: c.universalCartFloatingLabel || 'Lihat Keranjang',
      bg: c.universalCartFloatingBg || c.universalCartAccentColor || '#059669',
      position: c.universalCartFloatingPosition || 'bottom-floating',
      offsetY: 16,
      sourceBlockId: blk.id,
      sourceBlockLabel: blk.label || 'Keranjang Universal',
      sourceType: 'universal_cart',
      totalSources,
    };
  }
  return null;
}

export function findFirstFloatingCartConfig(
  blocks: BuilderBlock[],
  navItems?: { children?: BuilderBlock[] }[],
  pages?: BuilderSubPage[]
): {
  label: string;
  bg: string;
  position: FloatingCartPosition;
  offsetY: number;
} | null {
  const resolved = resolveProjectFloatingCartConfig(blocks, navItems, pages);
  if (!resolved) return null;
  return {
    label: resolved.label,
    bg: resolved.bg,
    position: resolved.position,
    offsetY: resolved.offsetY,
  };
}

export function buildAdminCtaWhatsappUrl(
  phoneRaw: string | undefined,
  messageTemplate?: string,
  productTitle?: string,
  productPrice?: string
): string {
  const digits = (phoneRaw || '6281234567890').replace(/\D/g, '');
  const cleanPhone = digits.startsWith('0')
    ? `62${digits.slice(1)}`
    : digits || '6281234567890';
  const prodLabel = [productTitle?.trim(), productPrice?.trim()].filter(Boolean).join(' - ');
  const rawTpl =
    (messageTemplate || '').trim() ||
    (prodLabel
      ? `Halo Admin, saya ingin bertanya tentang ${prodLabel}.`
      : 'Halo Admin, saya ingin bertanya tentang produk ini.');
  const finalMsg = rawTpl
    .replace(/\{produk\}/gi, prodLabel || productTitle?.trim() || 'produk ini')
    .replace(/\{nama\}/gi, productTitle?.trim() || 'produk ini')
    .replace(/\{harga\}/gi, productPrice?.trim() || '');
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(finalMsg)}`;
}
