import type { BlockContent, BuilderBlock } from '../types/builder.ts';

export interface PopoutVisualMetrics {
  enabled: boolean;
  offsetX: number;
  offsetY: number;
  rotate: number;
  scale: number;
  hoverFloat3D: boolean;
  dropShadowEnabled: boolean;
  dropShadowCss: string;
  hoverDropShadowCss: string;
}

function clampNum(val: number | undefined, fallback: number, min: number, max: number): number {
  if (typeof val !== 'number' || !Number.isFinite(val)) return fallback;
  return Math.max(min, Math.min(max, val));
}

function sanitizeColor(raw: string | undefined, fallback: string): string {
  const val = (raw ?? '').trim();
  if (!val) return fallback;
  if (/^(#[0-9a-f]{3,8}|rgba?\([^)]+\)|hsla?\([^)]+\))$/i.test(val)) {
    return val;
  }
  return fallback;
}

export function buildDropShadowFilterCss(
  x: number,
  y: number,
  blur: number,
  color: string
): string {
  return `drop-shadow(${Math.round(x)}px ${Math.round(y)}px ${Math.round(blur)}px ${color})`;
}

export function resolveImagePopoutMetrics(
  content: BlockContent,
  defaults?: {
    offsetX?: number;
    offsetY?: number;
    rotate?: number;
    scale?: number;
    dropShadowEnabled?: boolean;
    dropShadowX?: number;
    dropShadowY?: number;
    dropShadowBlur?: number;
    dropShadowColor?: string;
    hoverFloat3D?: boolean;
    popoutEnabled?: boolean;
  }
): PopoutVisualMetrics {
  const enabled = Boolean(content.imagePopoutEnabled ?? content.imagePngMode ?? defaults?.popoutEnabled);
  const offsetX = clampNum(content.imageOffsetX, defaults?.offsetX ?? 0, -140, 140);
  const offsetY = clampNum(content.imageOffsetY, defaults?.offsetY ?? 0, -140, 140);
  const rotate = clampNum(content.imageRotate, defaults?.rotate ?? 0, -60, 60);
  const rawZoom = content.cardVariant === 'popout_product' ? content.cardImageZoom : content.imageZoom;
  const scale = clampNum(rawZoom, defaults?.scale ?? 100, 40, 250) / 100;
  const hoverFloat3D = Boolean(content.imageHoverFloat3D ?? defaults?.hoverFloat3D);
  const dropShadowEnabled = Boolean(
    content.imageDropShadowEnabled ?? defaults?.dropShadowEnabled ?? false
  );
  const dsX = clampNum(content.imageDropShadowX, defaults?.dropShadowX ?? 6, -40, 40);
  const dsY = clampNum(content.imageDropShadowY, defaults?.dropShadowY ?? 14, -40, 60);
  const dsBlur = clampNum(content.imageDropShadowBlur, defaults?.dropShadowBlur ?? 18, 0, 64);
  const dsColor = sanitizeColor(
    content.imageDropShadowColor,
    defaults?.dropShadowColor ?? 'rgba(15, 23, 42, 0.34)'
  );

  const dropShadowCss = dropShadowEnabled
    ? buildDropShadowFilterCss(dsX, dsY, dsBlur, dsColor)
    : 'none';
  const hoverDropShadowCss = dropShadowEnabled
    ? buildDropShadowFilterCss(dsX + 4, dsY + 10, Math.min(64, dsBlur + 8), dsColor)
    : 'drop-shadow(0px 18px 22px rgba(15, 23, 42, 0.28))';

  return {
    enabled,
    offsetX,
    offsetY,
    rotate,
    scale,
    hoverFloat3D,
    dropShadowEnabled,
    dropShadowCss,
    hoverDropShadowCss,
  };
}

export function blockHasPopoutVisual(block: BuilderBlock): boolean {
  if (
    block.type === 'showcase_card' &&
    block.content.cardVariant === 'popout_product'
  ) {
    return true;
  }
  if (
    block.type === 'image' &&
    (block.content.imagePopoutEnabled || block.content.imagePngMode || block.content.imageHoverFloat3D)
  ) {
    return true;
  }
  if (block.children?.some(blockHasPopoutVisual)) {
    return true;
  }
  return false;
}
