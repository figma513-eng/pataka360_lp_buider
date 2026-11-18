import type { BlockStyle, BuilderBlock, PageTheme } from '../types/builder.ts';

export type ThemeOverrideTokenKey =
  | 'textColor'
  | 'backgroundColor'
  | 'borderColor'
  | 'fontFamily'
  | 'accentColor';

export interface BlockThemeStatus {
  mode: 'global' | 'local';
  hasAnyOverride: boolean;
  tokens: Record<ThemeOverrideTokenKey, boolean>;
}

const eqColor = (a?: string, b?: string) =>
  Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());

export function getDefaultBlockBgForTheme(block: BuilderBlock, theme: PageTheme): string {
  if (
    block.type === 'container' ||
    block.type === 'toggle_container' ||
    block.type === 'form' ||
    block.type === 'row' ||
    block.type === 'maps_place' ||
    block.type === 'catalog' ||
    block.type === 'fnb_catalog' ||
    block.type === 'training_catalog' ||
    block.type === 'hero_profile'
  ) {
    return theme.cardBg || '#FFFFFF';
  }
  return 'transparent';
}

export function getBlockThemeStatus(block: BuilderBlock, theme: PageTheme): BlockThemeStatus {
  const s = block.style;
  const c = block.content;
  const explicitTokens = s.themeOverrideTokens ?? {};

  const textOverridden =
    Boolean(explicitTokens.textColor) ||
    s.useThemeTextColor === false ||
    (s.useThemeTextColor === undefined &&
      Boolean(s.textColor) &&
      !eqColor(s.textColor, theme.textColor));

  const bgOverridden =
    Boolean(explicitTokens.backgroundColor) ||
    s.backgroundMode === 'gradient' ||
    (Boolean(s.backgroundColor) &&
      s.backgroundColor !== 'transparent' &&
      !eqColor(s.backgroundColor, theme.cardBg) &&
      !eqColor(s.backgroundColor, '#FFFFFF'));

  const borderOverridden =
    Boolean(explicitTokens.borderColor) ||
    (Boolean(s.borderColor) &&
      !eqColor(s.borderColor, theme.borderColor) &&
      !eqColor(s.borderColor, '#E2E8F0'));

  const fontOverridden = Boolean(explicitTokens.fontFamily) || Boolean(s.fontFamily);

  const accentOverridden =
    Boolean(explicitTokens.accentColor) ||
    (Boolean(c.buttonBg) && !eqColor(c.buttonBg, theme.accentColor)) ||
    (Boolean(c.buttonColor) && !eqColor(c.buttonColor, theme.accentColor)) ||
    (Boolean(c.toggleButtonBg) && !eqColor(c.toggleButtonBg, theme.accentColor)) ||
    (Boolean(c.sheetTriggerBg) && !eqColor(c.sheetTriggerBg, theme.accentColor)) ||
    (Boolean(c.socialColor) && !eqColor(c.socialColor, theme.accentColor)) ||
    (Boolean(c.fnbAccentColor) && !eqColor(c.fnbAccentColor, theme.accentColor)) ||
    (Boolean(c.categoryActiveBg) && !eqColor(c.categoryActiveBg, theme.accentColor));

  const tokens: Record<ThemeOverrideTokenKey, boolean> = {
    textColor: textOverridden,
    backgroundColor: bgOverridden,
    borderColor: borderOverridden,
    fontFamily: fontOverridden,
    accentColor: accentOverridden,
  };

  const hasAnyOverride =
    textOverridden || bgOverridden || borderOverridden || fontOverridden || accentOverridden;

  const mode: 'global' | 'local' =
    s.themeOverrideMode === 'local' || hasAnyOverride ? 'local' : 'global';

  return { mode, hasAnyOverride, tokens };
}

export function withLocalThemeTokenPatch(
  block: BuilderBlock,
  stylePatch: Partial<BlockStyle>,
  contentPatch?: Partial<BuilderBlock['content']>,
  tokenKeys: ThemeOverrideTokenKey[] = []
): BuilderBlock {
  const prevTokens = block.style.themeOverrideTokens ?? {};
  const nextTokens = { ...prevTokens };
  for (const key of tokenKeys) {
    nextTokens[key] = true;
  }

  return {
    ...block,
    style: {
      ...block.style,
      ...stylePatch,
      themeOverrideMode: 'local',
      themeOverrideTokens: nextTokens,
    },
    content: contentPatch ? { ...block.content, ...contentPatch } : block.content,
  };
}

/**
 * Resets ONLY visual theme override tokens on a single block back to global theme defaults.
 * Preserves 100% of component content, items, URLs, labels, spacing, and interactions.
 */
export function resetBlockThemeToGlobal(
  block: BuilderBlock,
  theme: PageTheme
): BuilderBlock {
  const defaultBg = getDefaultBlockBgForTheme(block, theme);
  const c = { ...block.content };

  if (c.buttonBg !== undefined) c.buttonBg = theme.accentColor;
  if (c.buttonColor !== undefined) c.buttonColor = theme.accentColor;
  if (c.toggleButtonBg !== undefined) c.toggleButtonBg = theme.accentColor;
  if (c.sheetTriggerBg !== undefined) c.sheetTriggerBg = theme.accentColor;
  if (c.socialColor !== undefined) c.socialColor = theme.accentColor;
  if (c.fnbAccentColor !== undefined) c.fnbAccentColor = theme.accentColor;
  if (c.fnbFloatingCartBg !== undefined) c.fnbFloatingCartBg = theme.accentColor;
  if (c.categoryActiveBg !== undefined) c.categoryActiveBg = theme.accentColor;
  if (c.lineColor !== undefined) c.lineColor = theme.borderColor;

  return {
    ...block,
    style: {
      ...block.style,
      themeOverrideMode: 'global',
      themeOverrideTokens: undefined,
      useThemeTextColor: true,
      textColor: theme.textColor,
      backgroundMode: 'solid',
      backgroundColor:
        block.style.backgroundColor === 'transparent' ? 'transparent' : defaultBg,
      borderColor: theme.borderColor,
      fontFamily: undefined,
    },
    content: c,
  };
}
