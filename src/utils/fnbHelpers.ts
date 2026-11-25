import type { BlockContent, FnbImageShape, FnbMenuItem } from '../types/builder.ts';

export const FNB_IMAGE_SHAPE_OPTIONS: { id: FnbImageShape; label: string }[] = [
  { id: 'rounded', label: 'Membulat' },
  { id: 'squircle', label: 'Squircle' },
  { id: 'circle', label: 'Bulat' },
  { id: 'square', label: 'Kotak' },
  { id: 'pill', label: 'Kapsul' },
];

export const FNB_IMAGE_SHAPE_LABELS: Record<FnbImageShape, string> = {
  rounded: 'Membulat',
  squircle: 'Squircle',
  circle: 'Bulat',
  square: 'Kotak',
  pill: 'Kapsul',
};

export interface ResolvedFnbItemImageGeometry {
  shape: FnbImageShape;
  frameWidth: number;
  frameHeight: number;
  baseSize: number;
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

function clampNum(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, val));
}

export function resolveFnbItemImageGeometry(
  item: FnbMenuItem,
  content: BlockContent,
  fallbackAccent: string
): ResolvedFnbItemImageGeometry {
  const rawShape = item.imageShape ?? content.fnbItemImageShape ?? 'rounded';
  const shape: FnbImageShape =
    rawShape === 'square' ||
    rawShape === 'circle' ||
    rawShape === 'squircle' ||
    rawShape === 'pill' ||
    rawShape === 'rounded'
      ? rawShape
      : 'rounded';

  const baseSize = Math.round(
    clampNum(
      typeof item.imageSize === 'number'
        ? item.imageSize
        : typeof content.fnbItemImageSize === 'number'
        ? content.fnbItemImageSize
        : 80,
      44,
      160
    )
  );

  const frameWidth = shape === 'pill' ? Math.round(baseSize * 0.84) : baseSize;
  const frameHeight = baseSize;

  const customRadius = Math.round(
    clampNum(
      typeof item.imageRadius === 'number'
        ? item.imageRadius
        : typeof content.fnbItemImageRadius === 'number'
        ? content.fnbItemImageRadius
        : 12,
      0,
      48
    )
  );

  const padding = Math.round(
    clampNum(
      typeof item.imagePadding === 'number'
        ? item.imagePadding
        : typeof content.fnbItemImagePadding === 'number'
        ? content.fnbItemImagePadding
        : 0,
      0,
      24
    )
  );

  let radiusCss = `${customRadius}px`;
  let innerRadiusCss = `${Math.max(0, customRadius - padding)}px`;
  if (shape === 'square') {
    radiusCss = '0px';
    innerRadiusCss = '0px';
  } else if (shape === 'circle' || shape === 'pill') {
    radiusCss = '9999px';
    innerRadiusCss = '9999px';
  } else if (shape === 'squircle') {
    radiusCss = '28%';
    innerRadiusCss = padding > 0 ? '24%' : '28%';
  }

  const zoom = Math.round(
    clampNum(
      typeof item.imageZoom === 'number'
        ? item.imageZoom
        : typeof content.imageZoom === 'number'
        ? content.imageZoom
        : 100,
      40,
      260
    )
  );

  const rawFit = item.imageFit ?? content.fnbItemImageFit ?? 'cover';
  const fit: 'cover' | 'contain' = rawFit === 'contain' ? 'contain' : 'cover';

  const posX = Math.round(clampNum(typeof item.imagePositionX === 'number' ? item.imagePositionX : 50, 0, 100));
  const posY = Math.round(clampNum(typeof item.imagePositionY === 'number' ? item.imagePositionY : 50, 0, 100));

  const defaultBg = item.image
    ? content.fnbItemImageBg || '#F1F5F9'
    : item.monogramBg || '#FFEDD5';
  const bgColor = item.imageBgColor || defaultBg;
  const borderColor = item.imageBorderColor || 'transparent';
  const borderWidth = Math.round(
    clampNum(
      typeof item.imageBorderWidth === 'number'
        ? item.imageBorderWidth
        : item.imageBorderColor
        ? 1
        : 0,
      0,
      4
    )
  );

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
      item.imageBorderWidth !== undefined ||
      item.cardBgColor ||
      item.accentColor ||
      item.badgeBgColor ||
      item.badgeTextColor
  );

  void fallbackAccent;

  return {
    shape,
    frameWidth,
    frameHeight,
    baseSize,
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

/**
 * Extracts item ID from any F&B item sub-layer ID:
 * - `fnb_<id>` (entire menu item card)
 * - `fnb_img_<id>` (item product image & shape)
 * - `fnb_info_<id>` (item badge, title & description)
 * - `fnb_action_<id>` (item price & add button)
 */
export function parseFnbItemSubLayerId(
  subId: string | null | undefined
): { kind: 'card' | 'img' | 'info' | 'action'; itemKey: string } | null {
  if (!subId) return null;
  if (subId.startsWith('fnb_img_')) return { kind: 'img', itemKey: subId.slice(8) };
  if (subId.startsWith('fnb_info_')) return { kind: 'info', itemKey: subId.slice(9) };
  if (subId.startsWith('fnb_action_')) return { kind: 'action', itemKey: subId.slice(11) };
  // Avoid matching structural part IDs
  if (
    subId === 'fnb_categories' ||
    subId === 'fnb_search' ||
    subId === 'fnb_section_heading' ||
    subId === 'fnb_floating_cart' ||
    subId === 'fnb_customer_form' ||
    subId === 'fnb_shipping'
  ) {
    return null;
  }
  if (subId.startsWith('fnb_')) return { kind: 'card', itemKey: subId.slice(4) };
  return null;
}

export function findFnbItemBySubLayerKey(
  items: FnbMenuItem[],
  itemKey: string
): FnbMenuItem | null {
  return items.find((it, idx) => String(it.id || idx) === itemKey) ?? null;
}
