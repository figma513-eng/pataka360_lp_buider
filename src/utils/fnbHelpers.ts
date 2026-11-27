import type {
  BlockContent,
  BuilderBlock,
  FnbImageShape,
  FnbMenuItem,
} from '../types/builder.ts';

export const FNB_IMAGE_SHAPE_OPTIONS: { id: FnbImageShape; label: string }[] = [
  { id: 'rounded', label: 'Membulat' },
  { id: 'square', label: 'Kotak' },
  { id: 'circle', label: 'Lingkaran' },
  { id: 'squircle', label: 'Squircle' },
  { id: 'pill', label: 'Kapsul' },
];

export const FNB_IMAGE_SHAPE_LABELS: Record<FnbImageShape, string> = {
  rounded: 'Membulat',
  square: 'Kotak',
  circle: 'Lingkaran',
  squircle: 'Squircle',
  pill: 'Kapsul',
};

export interface FnbItemImageGeometry {
  shape: FnbImageShape;
  baseSize: number;
  frameWidth: number;
  frameHeight: number;
  radiusCss: string;
  innerRadiusCss: string;
  zoom: number;
  fit: 'cover' | 'contain';
  padding: number;
  posX: number;
  posY: number;
  bgColor: string;
  borderColor: string;
  borderWidth: number;
  hasPerItemOverride: boolean;
}

const VALID_FNB_SHAPES: readonly FnbImageShape[] = [
  'rounded',
  'square',
  'circle',
  'squircle',
  'pill',
];

export function resolveFnbItemImageGeometry(
  item: FnbMenuItem,
  content: BlockContent,
  fallbackAccent = '#EA580C'
): FnbItemImageGeometry {
  const rawShape = item.imageShape ?? content.fnbItemImageShape ?? 'rounded';
  const shape: FnbImageShape = VALID_FNB_SHAPES.includes(rawShape) ? rawShape : 'rounded';
  const baseSize = Math.max(
    44,
    Math.min(160, Math.round(item.imageSize ?? content.fnbItemImageSize ?? 84))
  );
  const frameWidth = shape === 'pill' ? Math.round(baseSize * 1.24) : baseSize;
  const frameHeight = baseSize;

  const customRadius = Math.max(
    0,
    Math.min(40, Math.round(item.imageRadius ?? content.fnbItemImageRadius ?? 12))
  );
  const padding = Math.max(
    0,
    Math.min(24, Math.round(item.imagePadding ?? content.fnbItemImagePadding ?? 0))
  );

  let radiusCss = `${customRadius}px`;
  let innerRadiusCss = `${Math.max(0, customRadius - Math.round(padding * 0.6))}px`;
  if (shape === 'square') {
    radiusCss = '0px';
    innerRadiusCss = '0px';
  } else if (shape === 'circle') {
    radiusCss = '9999px';
    innerRadiusCss = '9999px';
  } else if (shape === 'squircle') {
    const sqR = Math.round(baseSize * 0.28);
    radiusCss = `${sqR}px`;
    innerRadiusCss = `${Math.max(4, sqR - Math.round(padding * 0.6))}px`;
  } else if (shape === 'pill') {
    radiusCss = '9999px';
    innerRadiusCss = '9999px';
  }

  const zoom = Math.max(
    40,
    Math.min(260, Math.round(item.imageZoom ?? content.imageZoom ?? 100))
  );
  const fit: 'cover' | 'contain' =
    item.imageFit === 'contain' || item.imageFit === 'cover'
      ? item.imageFit
      : content.fnbItemImageFit === 'contain'
      ? 'contain'
      : 'cover';
  const posX = Math.max(0, Math.min(100, Math.round(item.imagePositionX ?? 50)));
  const posY = Math.max(0, Math.min(100, Math.round(item.imagePositionY ?? 50)));
  const bgColor =
    item.imageBgColor?.trim() ||
    content.fnbItemImageBg?.trim() ||
    item.monogramBg?.trim() ||
    '#FFF7ED';
  const borderWidth = Math.max(0, Math.min(4, Math.round(item.imageBorderWidth ?? 0)));
  const borderColor = item.imageBorderColor?.trim() || (borderWidth > 0 ? fallbackAccent : 'transparent');

  const hasPerItemOverride = Boolean(
    item.imageShape !== undefined ||
      item.imageRadius !== undefined ||
      item.imageSize !== undefined ||
      item.imageZoom !== undefined ||
      item.imageFit !== undefined ||
      item.imagePadding !== undefined ||
      item.imagePositionX !== undefined ||
      item.imagePositionY !== undefined ||
      item.imageBgColor ||
      item.imageBorderColor ||
      (typeof item.imageBorderWidth === 'number' && item.imageBorderWidth > 0) ||
      item.cardBgColor ||
      item.accentColor ||
      item.badgeBgColor ||
      item.badgeTextColor
  );

  return {
    shape,
    baseSize,
    frameWidth,
    frameHeight,
    radiusCss,
    innerRadiusCss,
    zoom,
    fit,
    padding,
    posX,
    posY,
    bgColor,
    borderColor,
    borderWidth,
    hasPerItemOverride,
  };
}

export type ParsedFnbItemSubLayer = {
  kind: 'card' | 'img' | 'info' | 'action';
  itemKey: string;
};

const FNB_STRUCTURAL_SUB_IDS = new Set([
  'fnb_categories',
  'fnb_search',
  'fnb_section_heading',
  'fnb_floating_cart',
  'fnb_customer_form',
  'fnb_shipping',
]);

export function parseFnbItemSubLayerId(
  subId: string | null | undefined
): ParsedFnbItemSubLayer | null {
  if (!subId || FNB_STRUCTURAL_SUB_IDS.has(subId)) return null;
  if (subId.startsWith('fnb_img_')) {
    const itemKey = subId.slice('fnb_img_'.length);
    return itemKey ? { kind: 'img', itemKey } : null;
  }
  if (subId.startsWith('fnb_info_')) {
    const itemKey = subId.slice('fnb_info_'.length);
    return itemKey ? { kind: 'info', itemKey } : null;
  }
  if (subId.startsWith('fnb_action_')) {
    const itemKey = subId.slice('fnb_action_'.length);
    return itemKey ? { kind: 'action', itemKey } : null;
  }
  if (subId.startsWith('fnb_')) {
    const itemKey = subId.slice('fnb_'.length);
    return itemKey ? { kind: 'card', itemKey } : null;
  }
  return null;
}

export function findFnbItemBySubLayerKey(
  items: FnbMenuItem[] | undefined,
  itemKey: string
): FnbMenuItem | null {
  if (!Array.isArray(items) || !itemKey) return null;
  for (let i = 0; i < items.length; i += 1) {
    const it = items[i];
    if (String(it.id || i) === itemKey) return it;
  }
  return null;
}

export type FnbUnifiedEntry =
  | {
      kind: 'menu';
      key: string;
      id: string;
      item: FnbMenuItem;
      menuIndex: number;
    }
  | {
      kind: 'block';
      key: string;
      id: string;
      block: BuilderBlock;
      childIndex: number;
    };

export function makeFnbMenuKey(id: string): string {
  return `menu:${id}`;
}

export function makeFnbBlockKey(id: string): string {
  return `block:${id}`;
}

export function resolveOrderedFnbEntries(block: BuilderBlock): FnbUnifiedEntry[] {
  const items = block.content?.fnbItems ?? [];
  const children = block.children ?? [];

  const menuMap = new Map<string, { item: FnbMenuItem; index: number; id: string }>();
  items.forEach((item, index) => {
    const id = String(item.id || index);
    menuMap.set(makeFnbMenuKey(id), { item, index, id });
  });

  const blockMap = new Map<string, { block: BuilderBlock; index: number }>();
  children.forEach((ch, index) => {
    blockMap.set(makeFnbBlockKey(ch.id), { block: ch, index });
  });

  const explicitOrder = Array.isArray(block.content?.fnbItemOrder)
    ? block.content.fnbItemOrder.filter(
        (k): k is string => typeof k === 'string' && k.trim().length > 0
      )
    : [];

  const result: FnbUnifiedEntry[] = [];
  const seen = new Set<string>();

  if (explicitOrder.length > 0) {
    for (const rawKey of explicitOrder) {
      const key = rawKey.trim();
      if (seen.has(key)) continue;
      const m = menuMap.get(key);
      if (m) {
        seen.add(key);
        result.push({
          kind: 'menu',
          key,
          id: m.id,
          item: m.item,
          menuIndex: m.index,
        });
        continue;
      }
      const b = blockMap.get(key);
      if (b) {
        seen.add(key);
        result.push({
          kind: 'block',
          key,
          id: b.block.id,
          block: b.block,
          childIndex: b.index,
        });
      }
    }
  }

  const remainingMenus: FnbUnifiedEntry[] = [];
  items.forEach((item, index) => {
    const id = String(item.id || index);
    const key = makeFnbMenuKey(id);
    if (!seen.has(key)) {
      seen.add(key);
      remainingMenus.push({
        kind: 'menu',
        key,
        id,
        item,
        menuIndex: index,
      });
    }
  });

  const remainingBlocks: FnbUnifiedEntry[] = [];
  children.forEach((ch, index) => {
    const key = makeFnbBlockKey(ch.id);
    if (!seen.has(key)) {
      seen.add(key);
      remainingBlocks.push({
        kind: 'block',
        key,
        id: ch.id,
        block: ch,
        childIndex: index,
      });
    }
  });

  if (explicitOrder.length === 0 && block.content?.fnbChildrenPosition === 'above') {
    return [...remainingBlocks, ...remainingMenus];
  }

  return [...result, ...remainingMenus, ...remainingBlocks];
}

export function applyFnbUnifiedOrder(
  block: BuilderBlock,
  desiredKeys: string[]
): BuilderBlock {
  const items = block.content?.fnbItems ?? [];
  const children = block.children ?? [];

  const menuByKey = new Map<string, FnbMenuItem>();
  items.forEach((item, idx) => {
    menuByKey.set(makeFnbMenuKey(String(item.id || idx)), item);
  });

  const blockByKey = new Map<string, BuilderBlock>();
  children.forEach((ch) => {
    blockByKey.set(makeFnbBlockKey(ch.id), ch);
  });

  const cleanOrder: string[] = [];
  const seen = new Set<string>();
  const nextMenus: FnbMenuItem[] = [];
  const nextChildren: BuilderBlock[] = [];

  for (const key of desiredKeys) {
    if (seen.has(key)) continue;
    const menuItem = menuByKey.get(key);
    if (menuItem) {
      seen.add(key);
      cleanOrder.push(key);
      nextMenus.push(menuItem);
      continue;
    }
    const childBlk = blockByKey.get(key);
    if (childBlk) {
      seen.add(key);
      cleanOrder.push(key);
      nextChildren.push(childBlk);
    }
  }

  items.forEach((item, idx) => {
    const key = makeFnbMenuKey(String(item.id || idx));
    if (!seen.has(key)) {
      seen.add(key);
      cleanOrder.push(key);
      nextMenus.push(item);
    }
  });
  children.forEach((ch) => {
    const key = makeFnbBlockKey(ch.id);
    if (!seen.has(key)) {
      seen.add(key);
      cleanOrder.push(key);
      nextChildren.push(ch);
    }
  });

  return {
    ...block,
    children: nextChildren,
    content: {
      ...block.content,
      fnbItems: nextMenus,
      fnbItemOrder: cleanOrder,
    },
  };
}

export function reorderFnbCatalogEntries(
  block: BuilderBlock,
  sourceKey: string,
  targetKey: string,
  position: 'before' | 'after'
): BuilderBlock {
  if (!sourceKey || !targetKey || sourceKey === targetKey) return block;
  const currentKeys = resolveOrderedFnbEntries(block).map((e) => e.key);
  const srcIdx = currentKeys.indexOf(sourceKey);
  if (srcIdx === -1) return block;

  const withoutSrc = currentKeys.filter((k) => k !== sourceKey);
  const targetIdx = withoutSrc.indexOf(targetKey);
  if (targetIdx === -1) return block;

  const insertAt = position === 'before' ? targetIdx : targetIdx + 1;
  withoutSrc.splice(insertAt, 0, sourceKey);
  return applyFnbUnifiedOrder(block, withoutSrc);
}

export function moveFnbCatalogEntry(
  block: BuilderBlock,
  entryKey: string,
  direction: 'up' | 'down'
): BuilderBlock {
  const currentKeys = resolveOrderedFnbEntries(block).map((e) => e.key);
  const idx = currentKeys.indexOf(entryKey);
  if (idx === -1) return block;
  const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
  if (targetIdx < 0 || targetIdx >= currentKeys.length) return block;

  const nextKeys = [...currentKeys];
  const [moved] = nextKeys.splice(idx, 1);
  nextKeys.splice(targetIdx, 0, moved);
  return applyFnbUnifiedOrder(block, nextKeys);
}

export function insertFnbBlockKeyNear(
  block: BuilderBlock,
  blockId: string,
  targetKey: string,
  position: 'before' | 'after'
): BuilderBlock {
  const newKey = makeFnbBlockKey(blockId);
  const currentKeys = resolveOrderedFnbEntries(block)
    .map((e) => e.key)
    .filter((k) => k !== newKey);
  const targetIdx = currentKeys.indexOf(targetKey);
  if (targetIdx === -1) {
    currentKeys.push(newKey);
  } else {
    const insertAt = position === 'before' ? targetIdx : targetIdx + 1;
    currentKeys.splice(insertAt, 0, newKey);
  }
  return applyFnbUnifiedOrder(block, currentKeys);
}
