import type {
  BlockStyle,
  ResponsiveStyleOverride,
  ViewportBreakpoint,
} from '../types/builder.ts';

export const VIEWPORT_PRESET_WIDTHS = {
  mobile: 440,
  tablet: 768,
  desktop: 1024,
} as const;

export const VIEWPORT_PRESET_HEIGHTS = {
  mobile: 844,
  tablet: 1024,
  desktop: 844,
} as const;

export function resolveViewportBreakpoint(width: number): ViewportBreakpoint {
  if (width <= 575) return 'mobile';
  if (width <= 959) return 'tablet';
  return 'desktop';
}

export function getViewportBreakpointLabel(bp: ViewportBreakpoint): string {
  if (bp === 'mobile') return 'Mobile';
  if (bp === 'tablet') return 'Tablet';
  return 'Desktop';
}

const RESPONSIVE_KEYS: (keyof ResponsiveStyleOverride)[] = [
  'widthPercent',
  'minWidth',
  'maxWidth',
  'heightPx',
  'minHeight',
  'maxHeight',
  'displayMode',
  'flexDirection',
  'alignItems',
  'justifyContent',
  'flexWrap',
  'gap',
  'paddingTop',
  'paddingRight',
  'paddingBottom',
  'paddingLeft',
  'marginTop',
  'marginBottom',
];

function applyOverrideLayer(
  base: BlockStyle,
  override?: ResponsiveStyleOverride
): BlockStyle {
  if (!override) return base;
  const next: BlockStyle = { ...base };
  for (const key of RESPONSIVE_KEYS) {
    const val = override[key];
    if (val !== undefined) {
      (next as unknown as Record<string, unknown>)[key] = val;
    }
  }
  return next;
}

/**
 * Resolves effective BlockStyle for a given viewport breakpoint without mutating the base style.
 * Cascade order: Desktop (base) -> Tablet override -> Mobile override.
 */
export function resolveEffectiveBlockStyle(
  style: BlockStyle,
  breakpoint: ViewportBreakpoint
): BlockStyle {
  if (!style.responsive || breakpoint === 'desktop') return style;
  if (breakpoint === 'tablet') {
    return applyOverrideLayer(style, style.responsive.tablet);
  }
  const withTablet = applyOverrideLayer(style, style.responsive.tablet);
  return applyOverrideLayer(withTablet, style.responsive.mobile);
}

export function getResponsiveOverrideForBreakpoint(
  style: BlockStyle,
  breakpoint: 'tablet' | 'mobile'
): ResponsiveStyleOverride {
  return style.responsive?.[breakpoint] ?? {};
}

export function patchResponsiveOverride(
  style: BlockStyle,
  breakpoint: 'tablet' | 'mobile',
  patch: Partial<ResponsiveStyleOverride>
): BlockStyle {
  const prevLayer = style.responsive?.[breakpoint] ?? {};
  const nextLayer: ResponsiveStyleOverride = { ...prevLayer };
  for (const [k, v] of Object.entries(patch)) {
    const key = k as keyof ResponsiveStyleOverride;
    if (v === undefined || (typeof v === 'string' && String(v).trim() === '')) {
      delete nextLayer[key];
    } else {
      (nextLayer as Record<string, unknown>)[key] = v;
    }
  }
  const hasEntries = Object.keys(nextLayer).length > 0;
  const nextResponsive: NonNullable<BlockStyle['responsive']> = {
    ...(style.responsive ?? {}),
  };
  if (hasEntries) {
    nextResponsive[breakpoint] = nextLayer;
  } else {
    delete nextResponsive[breakpoint];
  }
  const hasAnyBreakpoint = Boolean(nextResponsive.tablet || nextResponsive.mobile);
  return {
    ...style,
    responsive: hasAnyBreakpoint ? nextResponsive : undefined,
  };
}

export function clearResponsiveOverride(
  style: BlockStyle,
  breakpoint: 'tablet' | 'mobile'
): BlockStyle {
  if (!style.responsive?.[breakpoint]) return style;
  const nextResponsive = { ...style.responsive };
  delete nextResponsive[breakpoint];
  const hasAny = Boolean(nextResponsive.tablet || nextResponsive.mobile);
  return {
    ...style,
    responsive: hasAny ? nextResponsive : undefined,
  };
}

export function countResponsiveOverrides(
  style: BlockStyle,
  breakpoint: 'tablet' | 'mobile'
): number {
  const layer = style.responsive?.[breakpoint];
  if (!layer) return 0;
  return RESPONSIVE_KEYS.filter((k) => layer[k] !== undefined).length;
}

function overrideLayerToCssDeclarations(ov: ResponsiveStyleOverride): string[] {
  const decls: string[] = [];
  if (typeof ov.widthPercent === 'number') decls.push(`width: ${ov.widthPercent}% !important`);
  if (typeof ov.minWidth === 'number') decls.push(`min-width: ${ov.minWidth}px !important`);
  if (typeof ov.maxWidth === 'number') decls.push(`max-width: ${ov.maxWidth}px !important`);
  if (typeof ov.heightPx === 'number') decls.push(`height: ${ov.heightPx}px !important`);
  if (typeof ov.minHeight === 'number') decls.push(`min-height: ${ov.minHeight}px !important`);
  if (typeof ov.maxHeight === 'number') decls.push(`max-height: ${ov.maxHeight}px !important`);
  if (ov.displayMode) decls.push(`display: ${ov.displayMode} !important`);
  if (ov.flexDirection) decls.push(`flex-direction: ${ov.flexDirection} !important`);
  if (ov.alignItems) decls.push(`align-items: ${ov.alignItems} !important`);
  if (ov.justifyContent) decls.push(`justify-content: ${ov.justifyContent} !important`);
  if (ov.flexWrap) decls.push(`flex-wrap: ${ov.flexWrap} !important`);
  if (typeof ov.gap === 'number') decls.push(`gap: ${ov.gap}px !important`);
  if (typeof ov.paddingTop === 'number') decls.push(`padding-top: ${ov.paddingTop}px !important`);
  if (typeof ov.paddingRight === 'number') decls.push(`padding-right: ${ov.paddingRight}px !important`);
  if (typeof ov.paddingBottom === 'number') decls.push(`padding-bottom: ${ov.paddingBottom}px !important`);
  if (typeof ov.paddingLeft === 'number') decls.push(`padding-left: ${ov.paddingLeft}px !important`);
  if (typeof ov.marginTop === 'number') decls.push(`margin-top: ${ov.marginTop}px !important`);
  if (typeof ov.marginBottom === 'number') decls.push(`margin-bottom: ${ov.marginBottom}px !important`);
  return decls;
}

/**
 * Generates CSS @media rules for exported HTML so Tablet & Mobile responsive overrides
 * render faithfully on real devices.
 */
export function buildResponsiveBlockCssRules(
  blocks: Array<{ id: string; style: BlockStyle }>
): string {
  const tabletRules: string[] = [];
  const mobileRules: string[] = [];

  for (const blk of blocks) {
    const safeId = blk.id.replace(/[^a-zA-Z0-9_-]/g, '');
    if (!safeId || !blk.style.responsive) continue;
    const tOv = blk.style.responsive.tablet;
    if (tOv) {
      const decls = overrideLayerToCssDeclarations(tOv);
      if (decls.length > 0) {
        tabletRules.push(`  [data-block-id="${safeId}"] { ${decls.join('; ')}; }`);
      }
    }
    const mOv = blk.style.responsive.mobile;
    if (mOv) {
      const decls = overrideLayerToCssDeclarations(mOv);
      if (decls.length > 0) {
        mobileRules.push(`  [data-block-id="${safeId}"] { ${decls.join('; ')}; }`);
      }
    }
  }

  const parts: string[] = [];
  if (tabletRules.length > 0) {
    parts.push(`@media (max-width: 959px) {\n${tabletRules.join('\n')}\n}`);
  }
  if (mobileRules.length > 0) {
    parts.push(`@media (max-width: 575px) {\n${mobileRules.join('\n')}\n}`);
  }
  return parts.join('\n');
}
