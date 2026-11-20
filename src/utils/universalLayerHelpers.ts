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
  sheetPosition: MenuIconSheetPosition;
  sheetTitle: string;
  sheetBlocks: BuilderBlock[];
  targetPageId: string;
  targetBlockId: string;
}

export const UNIVERSAL_CART_EXCLUDED_TYPES = new Set([
  'catalog',
  'fnb_catalog',
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

  // Keep seamless compatibility with menu_icon & showcase_card legacy action properties
  if (type === 'none' && block.type === 'back_button') {
    type = 'back';
  }

  return {
    type,
    url: (c.actionUrl || '').trim(),
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
  let fnbMatch: BuilderBlock | null = null;
  let cartBtnMatch: BuilderBlock | null = null;
  let universalCartMatch: BuilderBlock | null = null;

  const inspect = (list: BuilderBlock[]) => {
    walkAllBlocks(list, (b) => {
      if (!fnbMatch && b.type === 'fnb_catalog' && b.content.fnbFloatingCartEnabled !== false) {
        fnbMatch = b;
      }
      if (!cartBtnMatch && b.type === 'cart_button' && b.content.cartFloatingEnabled !== false) {
        cartBtnMatch = b;
      }
      if (
        !universalCartMatch &&
        b.content.universalCartEnabled &&
        b.content.universalCartFloatingEnabled !== false &&
        supportsUniversalCart(b.type)
      ) {
        universalCartMatch = b;
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
    const c = (fnbMatch as BuilderBlock).content;
    return {
      label: c.fnbFloatingCartLabel || 'Lanjut',
      bg: c.fnbFloatingCartBg || '#EA580C',
      position: c.fnbFloatingCartPosition || 'bottom-floating',
      offsetY: typeof c.fnbFloatingCartOffsetY === 'number' ? c.fnbFloatingCartOffsetY : 16,
    };
  }
  if (cartBtnMatch) {
    const c = (cartBtnMatch as BuilderBlock).content;
    return {
      label: c.cartFloatingLabel || 'Lihat Keranjang',
      bg: c.cartFloatingBg || '#059669',
      position: c.cartFloatingPosition || 'bottom-floating',
      offsetY: 16,
    };
  }
  if (universalCartMatch) {
    const c = (universalCartMatch as BuilderBlock).content;
    return {
      label: c.universalCartFloatingLabel || 'Lihat Keranjang',
      bg: c.universalCartFloatingBg || '#059669',
      position: c.universalCartFloatingPosition || 'bottom-floating',
      offsetY: 16,
    };
  }
  return null;
}
