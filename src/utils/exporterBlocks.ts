import type {
  AdvanceOptions,
  BlockStyle,
  BuilderBlock,
  BuilderProject,
  CatalogCustomerField,
  CatalogProductType,
  CatalogShippingOptionConfig,
  PageTheme,
  ShadowPreset,
} from '../types/builder.ts';
import { renderButtonIconSvgString, resolveButtonIcon } from './buttonIcons.ts';
import { SOCIAL_PLATFORMS, resolveSocialMetrics } from './socialIcons.ts';
import {
  type VideoEmbedPlatform,
  extractInstagramInfo,
  extractTikTokId,
  extractYouTubeId,
  isDirectVideoUrl,
  isValidFacebookVideoUrl,
  isValidInstagramVideoUrl,
  isValidTikTokUrl,
  normalizeFacebookVideoUrl,
} from './videoHelpers.ts';
import { sanitizeExternalUrl } from './urlHelpers.ts';
import {
  GOSEND_DEFAULT_CHECKLISTS,
  buildTrainingWhatsappUrl,
  normalizeWhatsappNumber,
  resolveCartButtonMetrics,
  resolveCatalogCustomerFields,
  resolveCatalogShippingOptions,
  resolveTrainingFormFields,
} from './cartHelpers.ts';
import { resolveProjectAds, resolveProjectPublishing } from './publishingHelpers.ts';
import { formatRichHtmlWithSpacing } from './richTextHelpers.ts';
import { resolveBottomNavbar, resolveNavbarMetrics } from '../data/presets.ts';
import { resolveCssFontFamily } from './fontHelpers.ts';
import { buildLinearGradientCss } from './gradientHelpers.ts';
import { sanitizeCssColor } from './htmlSanitizer.ts';

export { extractYouTubeId };

function hexToRgb(hex?: string): { r: number; g: number; b: number } | null {
  if (!hex) return null;
  const clean = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) return null;
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}

export function shadowToCss(shadow: ShadowPreset, shadowColor?: string): string {
  const rgb = hexToRgb(shadowColor);
  const c = (alpha: number) =>
    rgb ? `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})` : `rgba(15, 23, 42, ${alpha})`;
  switch (shadow) {
    case 'sm':
      return `0 2px 8px ${c(rgb ? 0.22 : 0.08)}`;
    case 'md':
      return `0 8px 24px ${c(rgb ? 0.30 : 0.14)}`;
    case 'lg':
      return `0 16px 36px ${c(rgb ? 0.38 : 0.22)}`;
    default:
      return 'none';
  }
}

export function resolveBlockTextColor(
  style: BlockStyle,
  theme: PageTheme,
  inheritedTextColor?: string
): string {
  if (style.useThemeTextColor === false) {
    return style.textColor || theme.textColor;
  }
  if (
    style.useThemeTextColor === undefined &&
    style.textColor &&
    style.textColor.trim().toLowerCase() !== theme.textColor.trim().toLowerCase()
  ) {
    return style.textColor;
  }
  return inheritedTextColor ?? theme.textColor;
}

export function escapeHtml(str?: string | number | null): string {
  return String(str ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function styleObjectToCss(
  style: BlockStyle,
  resolvedTextColor?: string,
  options?: { isHeroBanner?: boolean; themeFontFamily?: string }
): string {
  const padX = style.paddingX ?? style.padding;
  const padTop = style.paddingTop ?? style.padding;
  const padBottom = style.paddingBottom ?? style.padding;
  const gradCss = options?.isHeroBanner ? null : buildLinearGradientCss(style);
  const parts: string[] = [
    `width: ${style.widthPercent}%`,
    `margin: 0 auto ${style.marginBottom}px auto`,
    `padding: ${padTop}px ${padX}px ${padBottom}px ${padX}px`,
    `min-height: ${style.minHeight}px`,
    `border-radius: ${style.borderRadius}px`,
    `text-align: ${style.align}`,
    `color: ${resolvedTextColor ?? style.textColor}`,
    ...(options?.isHeroBanner
      ? ['background-color: transparent']
      : gradCss
      ? [
          `background-color: ${style.gradientColor1 || style.backgroundColor || '#EA580C'}`,
          `background-image: ${gradCss}`,
        ]
      : [`background-color: ${style.backgroundColor}`]),
    `box-sizing: border-box`,
  ];

  const fontStack =
    resolveCssFontFamily(style.fontFamily) || resolveCssFontFamily(options?.themeFontFamily);
  if (fontStack) {
    parts.push(`font-family: ${fontStack}`);
  }
  if (style.fontSize && Number.isFinite(style.fontSize)) {
    parts.push(`font-size: ${Math.max(10, Math.min(48, Math.round(style.fontSize)))}px`);
  }
  if (style.fontWeightCss) {
    parts.push(`font-weight: ${style.fontWeightCss}`);
  }
  if (style.lineHeight && Number.isFinite(style.lineHeight)) {
    parts.push(`line-height: ${style.lineHeight}`);
  }

  if (!options?.isHeroBanner) {
    if (style.borderWidth > 0) {
      parts.push(`border: ${style.borderWidth}px solid ${style.borderColor}`);
    }
    if (style.shadow !== 'none') {
      parts.push(`box-shadow: ${shadowToCss(style.shadow, style.shadowColor)}`);
    }
    if (style.blur > 0) {
      parts.push(`backdrop-filter: blur(${style.blur}px)`);
      parts.push(`-webkit-backdrop-filter: blur(${style.blur}px)`);
    }
  }

  return parts.join('; ');
}

export function renderBlockHtml(
  block: BuilderBlock,
  theme: PageTheme,
  advance: AdvanceOptions,
  indent = '      ',
  inheritedTextColor?: string
): string {
  const html = renderBlockHtmlInner(block, theme, advance, indent, inheritedTextColor);
  if (!html) return html;
  return html.replace(
    /^(\s*<[a-zA-Z0-9-]+)/,
    `$1 data-block-id="${escapeHtml(block.id)}"`
  );
}

function renderBlockHtmlInner(
  block: BuilderBlock,
  theme: PageTheme,
  advance: AdvanceOptions,
  indent = '      ',
  inheritedTextColor?: string
): string {
  const resolvedTextColor = resolveBlockTextColor(block.style, theme, inheritedTextColor);
  const nextInheritedTextColor =
    block.style.useThemeTextColor === false
      ? block.style.textColor
      : block.style.useThemeTextColor === undefined &&
        block.style.textColor &&
        block.style.textColor.trim().toLowerCase() !== theme.textColor.trim().toLowerCase()
      ? block.style.textColor
      : inheritedTextColor;
  const isHeroBanner =
    block.type === 'hero_profile' && block.content.heroVariant === 'banner';
  const css = styleObjectToCss(block.style, resolvedTextColor, {
    isHeroBanner,
    themeFontFamily: theme.fontFamily,
  });
  const hoverCls = block.style.hoverLift ? ' class="lynk-hover-lift"' : '';

  switch (block.type) {
    case 'container': {
      const inner = (block.children ?? [])
        .map((child) =>
          renderBlockHtml(child, theme, advance, indent + '  ', nextInheritedTextColor)
        )
        .filter(Boolean)
        .join('\n');
      const jumpAttr = block.label.trim()
        ? ` data-jump-title="${escapeHtml(block.label.trim().toLowerCase())}"`
        : '';
      return `${indent}<div${hoverCls}${jumpAttr} style="${css}">\n${inner}\n${indent}</div>`;
    }

    case 'toggle_container': {
      const defaultOpen = Boolean(block.content.toggleDefaultOpen);
      const showLabel = block.content.toggleShowLabel || 'Tampilkan Konten';
      const hideLabel = block.content.toggleHideLabel || showLabel;
      const btnBg = block.content.toggleButtonBg || theme.accentColor;
      const btnText = block.content.toggleButtonText || '#FFFFFF';
      const btnStyle = block.content.toggleButtonStyle ?? 'solid';
      const btnRadius = Math.min(block.style.borderRadius, 12);
      const btnCss =
        btnStyle === 'outline'
          ? `width: 100%; padding: 10px 14px; border-radius: ${btnRadius}px; border: 1.5px solid ${btnBg}; background: transparent; color: ${btnBg}; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; gap: 8px; cursor: pointer; font-family: inherit; box-sizing: border-box;`
          : `width: 100%; padding: 10px 14px; border-radius: ${btnRadius}px; border: 0; background: ${btnBg}; color: ${btnText}; font-size: 14px; font-weight: 600; display: flex; align-items: center; justify-content: space-between; gap: 8px; cursor: pointer; font-family: inherit; box-sizing: border-box;`;
      const inner = (block.children ?? [])
        .map((child) =>
          renderBlockHtml(child, theme, advance, indent + '    ', nextInheritedTextColor)
        )
        .filter(Boolean)
        .join('\n');
      const initialLabel = defaultOpen ? hideLabel : showLabel;
      const chevronRot = defaultOpen ? 'rotate(180deg)' : 'rotate(0deg)';
      const leftIconId = resolveButtonIcon(block.content.toggleButtonIcon, showLabel);
      const leftIconSvg = renderButtonIconSvgString(leftIconId, 16, block.content.toggleButtonIconUrl);
      return `${indent}<div data-toggle-box style="${css}">
${indent}  <button type="button" data-toggle-btn data-show-label="${escapeHtml(showLabel)}" data-hide-label="${escapeHtml(
        hideLabel
      )}" aria-expanded="${defaultOpen ? 'true' : 'false'}" style="${btnCss}">
${indent}    <span style="display: inline-flex; align-items: center; gap: 8px; min-width: 0;">${leftIconSvg}<span data-toggle-label style="overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(
        initialLabel
      )}</span></span>
${indent}    <svg data-toggle-chevron viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink: 0; transition: transform 0.2s ease; transform: ${chevronRot};" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg>
${indent}  </button>
${indent}  <div data-toggle-panel style="display: ${defaultOpen ? 'block' : 'none'}; margin-top: 12px;">
${inner}
${indent}  </div>
${indent}</div>`;
    }

    case 'bottom_sheet': {
      const safeId = block.id.replace(/[^a-zA-Z0-9_-]/g, '');
      const sheetId = `sheet_${safeId}`;
      const triggerStyle = block.content.sheetTriggerStyle ?? 'icon';
      const triggerLabel = block.content.sheetTriggerLabel ?? 'Lokasi Maps';
      const triggerSublabel = block.content.sheetTriggerSublabel ?? '';
      const triggerBg = block.content.sheetTriggerBg || theme.accentColor;
      const triggerText = block.content.sheetTriggerText || '#FFFFFF';
      const iconSize = Math.max(36, Math.min(72, block.content.sheetIconSize ?? 52));
      const glyphSize = Math.round(iconSize * 0.44);
      const iconId = resolveButtonIcon(block.content.sheetTriggerIcon ?? 'map-pin', triggerLabel);
      const iconSvg =
        renderButtonIconSvgString(
          iconId,
          triggerStyle === 'icon' ? glyphSize : 16,
          block.content.sheetTriggerIconUrl
        ) ||
        `<svg viewBox="0 0 24 24" width="${
          triggerStyle === 'icon' ? glyphSize : 16
        }" height="${
          triggerStyle === 'icon' ? glyphSize : 16
        }" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 15h18"/><path d="m9 10 3-3 3 3"/></svg>`;
      const sheetTitle = block.content.sheetTitle?.trim() || 'Bottom Sheet';
      const align = block.style.align;
      const justify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';
      const btnRadius = Math.min(block.style.borderRadius, 14);
      const inner = (block.children ?? [])
        .map((child) =>
          renderBlockHtml(child, theme, advance, indent + '        ', theme.textColor)
        )
        .filter(Boolean)
        .join('\n');

      let triggerHtml = '';
      if (triggerStyle === 'icon') {
        const labelHtml = triggerLabel.trim()
          ? `<span style="font-size: 12px; font-weight: 600; line-height: 1.25;">${escapeHtml(
              triggerLabel
            )}</span>`
          : '';
        const sublabelHtml = triggerSublabel.trim()
          ? `<span style="font-size: 11px; opacity: 0.72; line-height: 1.25;">${escapeHtml(
              triggerSublabel
            )}</span>`
          : '';
        triggerHtml = `<button type="button" data-sheet-open="${sheetId}" style="display: inline-flex; flex-direction: column; align-items: center; gap: 6px; border: 0; background: transparent; color: inherit; cursor: pointer; padding: 0; font-family: inherit;">
${indent}    <span style="width: ${iconSize}px; height: ${iconSize}px; border-radius: 9999px; background: ${triggerBg}; color: ${triggerText}; display: flex; align-items: center; justify-content: center; box-shadow: 0 6px 16px rgba(15, 23, 42, 0.16);">${iconSvg}</span>${labelHtml}${sublabelHtml}
${indent}  </button>`;
      } else if (triggerStyle === 'pill') {
        const sublabelHtml = triggerSublabel.trim()
          ? `<span style="display: block; font-size: 10px; opacity: 0.85; line-height: 1.2; margin-top: 2px;">${escapeHtml(
              triggerSublabel
            )}</span>`
          : '';
        triggerHtml = `<button type="button" data-sheet-open="${sheetId}" style="display: inline-flex; align-items: center; gap: 10px; padding: 10px 16px; border: 0; border-radius: 9999px; background: ${triggerBg}; color: ${triggerText}; cursor: pointer; font-family: inherit; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.14);">
${indent}    ${iconSvg}<span style="text-align: left; min-width: 0;"><span style="display: block; font-size: 12px; font-weight: 700; line-height: 1.2;">${escapeHtml(
          triggerLabel || 'Buka Panel'
        )}</span>${sublabelHtml}</span>
${indent}  </button>`;
      } else {
        triggerHtml = `<button type="button" data-sheet-open="${sheetId}" style="width: 100%; display: flex; align-items: center; justify-content: center; gap: 8px; padding: 11px 16px; border: 0; border-radius: ${btnRadius}px; background: ${triggerBg}; color: ${triggerText}; font-size: 14px; font-weight: 600; cursor: pointer; font-family: inherit; box-shadow: 0 4px 12px rgba(15, 23, 42, 0.12); box-sizing: border-box;">
${indent}    ${iconSvg}<span>${escapeHtml(triggerLabel || 'Buka Bottom Sheet')}</span>
${indent}  </button>`;
      }

      return `${indent}<div style="${css}; display: flex; justify-content: ${justify};">
${indent}  ${triggerHtml}
${indent}  <div id="${sheetId}" data-bottom-sheet class="lynk-sheet-backdrop" role="dialog" aria-modal="true" aria-label="${escapeHtml(
        sheetTitle
      )}">
${indent}    <div class="lynk-sheet-panel" style="background-color: ${theme.cardBg}; color: ${
        theme.textColor
      }; border-top: 1px solid ${theme.borderColor};">
${indent}      <div class="lynk-sheet-header" style="border-bottom: 1px solid ${theme.borderColor};">
${indent}        <div class="lynk-sheet-handle"></div>
${indent}        <div style="width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
${indent}          <div style="font-size: 15px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(
        sheetTitle
      )}</div>
${indent}          <button type="button" data-sheet-close aria-label="Tutup Bottom Sheet" style="width: 30px; height: 30px; border-radius: 9999px; border: 0; background: rgba(148, 163, 184, 0.16); color: inherit; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">&#10005;</button>
${indent}        </div>
${indent}      </div>
${indent}      <div class="lynk-sheet-body">
${inner || `${indent}        <div style="padding: 28px 0; text-align: center; font-size: 12px; opacity: 0.65;">Belum ada konten di dalam Bottom Sheet.</div>`}
${indent}      </div>
${indent}    </div>
${indent}  </div>
${indent}</div>`;
    }

    case 'menu_icon': {
      const c = block.content;
      const safeId = block.id.replace(/[^a-zA-Z0-9_-]/g, '');
      const sheetId = `sheet_mico_${safeId}`;
      const shape = c.menuIconShape ?? 'circle';
      const radiusCss =
        shape === 'circle'
          ? '9999px'
          : shape === 'square'
          ? '0px'
          : `${Math.max(0, Math.min(48, c.menuIconRadius ?? 14))}px`;
      const size = Math.max(36, Math.min(160, c.menuIconSize ?? 64));
      const fit = c.menuIconImageFit ?? 'cover';
      const imgSrc = (c.menuIconImage ?? '').trim();
      const showLabel = c.menuIconShowLabel !== false;
      const iconLabel = c.menuIconLabel ?? 'Menu Icon';
      const bgColor = c.menuIconBg || theme.accentColor;
      const labelColor = c.menuIconTextColor || resolvedTextColor;
      const action = c.menuIconAction ?? 'sheet';
      const sheetPos = c.menuIconSheetPosition ?? 'bottom';
      const targetId = (c.menuIconTargetBlockId ?? '').trim();
      const sheetTitle = c.sheetTitle?.trim() || 'Menu Panel';
      const align = block.style.align;
      const justify = align === 'left' ? 'flex-start' : align === 'right' ? 'flex-end' : 'center';

      const visualHtml = imgSrc
        ? `<img src="${escapeHtml(imgSrc)}" alt="${escapeHtml(
            iconLabel
          )}" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: ${fit}; display: block;" />`
        : `<svg viewBox="0 0 24 24" width="${Math.round(size * 0.44)}" height="${Math.round(
            size * 0.44
          )}" fill="none" stroke="#FFFFFF" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8.3 10a.7.7 0 0 1-.626-1.079L11.4 3a.7.7 0 0 1 1.198-.043L16.3 8.9a.7.7 0 0 1-.572 1.1Z"/><rect x="3" y="14" width="7" height="7" rx="1"/><circle cx="17.5" cy="17.5" r="3.5"/></svg>`;

      const labelHtml =
        showLabel && iconLabel.trim()
          ? `<span style="font-size: 12px; font-weight: 600; line-height: 1.25; color: ${escapeHtml(
              labelColor
            )}; text-align: center;">${escapeHtml(iconLabel)}</span>`
          : '';

      const triggerAttr =
        action === 'card'
          ? `data-jump-block="${escapeHtml(targetId)}"`
          : `data-sheet-open="${sheetId}"`;

      const triggerHtml = `<button type="button" ${triggerAttr} style="display: inline-flex; flex-direction: column; align-items: center; gap: 6px; border: 0; background: transparent; color: inherit; cursor: pointer; padding: 0; font-family: inherit;">
${indent}    <span style="width: ${size}px; height: ${size}px; border-radius: ${radiusCss}; background: ${escapeHtml(
        bgColor
      )}; display: flex; align-items: center; justify-content: center; overflow: hidden; box-shadow: 0 6px 16px rgba(15, 23, 42, 0.16);">${visualHtml}</span>${labelHtml}
${indent}  </button>`;

      if (action === 'card') {
        return `${indent}<div style="${css}; display: flex; justify-content: ${justify};">
${indent}  ${triggerHtml}
${indent}</div>`;
      }

      const inner = (block.children ?? [])
        .map((child) =>
          renderBlockHtml(child, theme, advance, indent + '        ', theme.textColor)
        )
        .filter(Boolean)
        .join('\n');
      const handleHtml =
        sheetPos === 'bottom' || sheetPos === 'top'
          ? `${indent}        <div class="lynk-sheet-handle"></div>\n`
          : '';

      return `${indent}<div style="${css}; display: flex; justify-content: ${justify};">
${indent}  ${triggerHtml}
${indent}  <div id="${sheetId}" data-bottom-sheet data-sheet-pos="${sheetPos}" class="lynk-sheet-backdrop lynk-sheet-pos-${sheetPos}" role="dialog" aria-modal="true" aria-label="${escapeHtml(
        sheetTitle
      )}">
${indent}    <div class="lynk-sheet-panel" style="background-color: ${theme.cardBg}; color: ${
        theme.textColor
      }; border: 1px solid ${theme.borderColor};">
${indent}      <div class="lynk-sheet-header" style="border-bottom: 1px solid ${theme.borderColor};">
${handleHtml}${indent}        <div style="width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
${indent}          <div style="font-size: 15px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(
        sheetTitle
      )}</div>
${indent}          <button type="button" data-sheet-close aria-label="Tutup Panel" style="width: 30px; height: 30px; border-radius: 9999px; border: 0; background: rgba(148, 163, 184, 0.16); color: inherit; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">&#10005;</button>
${indent}        </div>
${indent}      </div>
${indent}      <div class="lynk-sheet-body">
${inner || `${indent}        <div style="padding: 28px 0; text-align: center; font-size: 12px; opacity: 0.65;">Belum ada konten di dalam panel ini.</div>`}
${indent}      </div>
${indent}    </div>
${indent}  </div>
${indent}</div>`;
    }

    case 'row': {
      const c = block.content;
      const rowMode = c.rowLayoutMode ?? 'grid';
      const rowCols = Math.max(1, Math.min(20, c.rowColumns ?? 2));
      const rowColWidth = Math.max(80, Math.min(340, c.rowColumnWidth ?? 156));
      const rowColMinH = Math.max(0, Math.min(360, c.rowColumnMinHeight ?? 0));
      const rowGap = Math.max(0, Math.min(32, c.rowGap ?? 12));
      const minHStyle = rowColMinH > 0 ? ` min-height: ${rowColMinH}px;` : '';
      const rowChildren = block.children ?? [];

      if (rowMode === 'horizontal') {
        const cols = rowChildren
          .map(
            (child) =>
              `${indent}    <div style="flex: 0 0 ${rowColWidth}px; width: ${rowColWidth}px; min-width: ${rowColWidth}px;${minHStyle} scroll-snap-align: start; display: flex; flex-direction: column;">\n${renderBlockHtml(
                child,
                theme,
                advance,
                indent + '      ',
                nextInheritedTextColor
              )}\n${indent}    </div>`
          )
          .join('\n');
        const dotsHtml =
          rowChildren.length > 1
            ? `\n${indent}  <div class="lynk-row-dots" data-row-dots="3" aria-label="Indikator progress slide">\n${indent}    <button type="button" class="lynk-row-dot is-active" data-row-dot="0" aria-label="Slide awal" style="--dot-accent: ${escapeHtml(
                theme.accentColor
              )};"></button>\n${indent}    <button type="button" class="lynk-row-dot" data-row-dot="1" aria-label="Slide tengah" style="--dot-accent: ${escapeHtml(
                theme.accentColor
              )};"></button>\n${indent}    <button type="button" class="lynk-row-dot" data-row-dot="2" aria-label="Slide akhir" style="--dot-accent: ${escapeHtml(
                theme.accentColor
              )};"></button>\n${indent}  </div>`
            : '';
        return `${indent}<div${hoverCls} data-row-mode="horizontal" data-row-slider style="${css}">\n${indent}  <div data-row-track class="lynk-row-track" style="display: flex; flex-direction: row; flex-wrap: nowrap; overflow-x: auto; gap: ${rowGap}px; align-items: stretch; scroll-snap-type: x proximity; -webkit-overflow-scrolling: touch; padding-bottom: 4px;">\n${cols}\n${indent}  </div>${dotsHtml}\n${indent}</div>`;
      }

      if (rowMode === 'vertical') {
        const cols = rowChildren
          .map(
            (child) =>
              `${indent}  <div style="width: 100%; min-width: 0;${minHStyle} display: flex; flex-direction: column;">\n${renderBlockHtml(
                child,
                theme,
                advance,
                indent + '    ',
                nextInheritedTextColor
              )}\n${indent}  </div>`
          )
          .join('\n');
        return `${indent}<div${hoverCls} data-row-mode="vertical" style="${css}; display: flex; flex-direction: column; gap: ${rowGap}px; align-items: stretch;">\n${cols}\n${indent}</div>`;
      }

      const cols = rowChildren
        .map(
          (child) =>
            `${indent}  <div style="min-width: 0;${minHStyle} display: flex; flex-direction: column;">\n${renderBlockHtml(
              child,
              theme,
              advance,
              indent + '    ',
              nextInheritedTextColor
            )}\n${indent}  </div>`
        )
        .join('\n');
      return `${indent}<div${hoverCls} data-row-mode="grid" style="${css}; display: grid; grid-template-columns: repeat(${rowCols}, minmax(0, 1fr)); gap: ${rowGap}px; align-items: stretch;">\n${cols}\n${indent}</div>`;
    }

    case 'text': {
      const rawText = block.content.text ?? '';
      if (!rawText.trim()) return '';
      const tag = block.content.variant === 'h1' ? 'h1' : block.content.variant === 'h2' ? 'h2' : 'p';
      const fontSize = block.style.fontSize
        ? `${Math.max(10, Math.min(48, Math.round(block.style.fontSize)))}px`
        : block.content.variant === 'h1'
        ? '22px'
        : block.content.variant === 'h2'
        ? '18px'
        : '14px';
      const weight =
        block.style.fontWeightCss ||
        (block.content.fontWeight === 'bold'
          ? '700'
          : block.content.fontWeight === 'semibold'
          ? '600'
          : '400');
      const lineHeight = block.style.lineHeight ? String(block.style.lineHeight) : '1.5';
      return `${indent}<${tag}${hoverCls} data-jump-title="${escapeHtml(
        rawText.trim().toLowerCase()
      )}" style="${css}; font-size: ${fontSize}; font-weight: ${weight}; line-height: ${lineHeight}; white-space: pre-line;">${escapeHtml(
        rawText
      )}</${tag}>`;
    }

    case 'image': {
      const src = escapeHtml(block.content.src ?? '');
      const alt = escapeHtml(block.content.alt ?? 'Gambar');
      const fit = block.content.objectFit ?? 'cover';

      if (block.content.imageShape === 'circle') {
        const s = block.style;
        const padX = s.paddingX ?? s.padding;
        const padTop = s.paddingTop ?? s.padding;
        const padBottom = s.paddingBottom ?? s.padding;
        const circleSize = Math.max(40, Math.min(280, block.content.circleSize ?? 112));
        const imageZoom = Math.max(40, Math.min(250, block.content.imageZoom ?? 100));
        const justify =
          s.align === 'left' ? 'flex-start' : s.align === 'right' ? 'flex-end' : 'center';
        const circleBg =
          s.backgroundColor && s.backgroundColor !== 'transparent'
            ? s.backgroundColor
            : '#F1F5F9';
        const circleBorder =
          s.borderWidth > 0 ? `border: ${s.borderWidth}px solid ${s.borderColor};` : '';
        const circleShadow =
          s.shadow !== 'none' ? `box-shadow: ${shadowToCss(s.shadow, s.shadowColor)};` : '';
        const wrapCss = `width: ${s.widthPercent}%; margin: 0 auto ${s.marginBottom}px auto; padding: ${padTop}px ${padX}px ${padBottom}px ${padX}px; box-sizing: border-box; display: flex; justify-content: ${justify};`;

        return `${indent}<div style="${wrapCss}">\n${indent}  <div style="width: ${circleSize}px; height: ${circleSize}px; border-radius: 9999px; overflow: hidden; display: flex; align-items: center; justify-content: center; flex-shrink: 0; background-color: ${circleBg}; ${circleBorder} ${circleShadow}">\n${indent}    <img src="${src}" alt="${alt}" style="width: 100%; height: 100%; display: block; object-fit: ${fit}; transform: scale(${(
          imageZoom / 100
        ).toFixed(2)}); transform-origin: center center;" />\n${indent}  </div>\n${indent}</div>`;
      }

      const ratioCss =
        block.content.aspectRatio && block.content.aspectRatio !== 'auto'
          ? `aspect-ratio: ${block.content.aspectRatio};`
          : '';
      return `${indent}<div style="${css}; overflow: hidden;">\n${indent}  <img src="${src}" alt="${alt}" style="width: 100%; height: 100%; display: block; object-fit: ${fit}; border-radius: ${block.style.borderRadius}px; ${ratioCss}" />\n${indent}</div>`;
    }

    case 'button': {
      const href = escapeHtml(sanitizeExternalUrl(block.content.url, '#'));
      const rawLabel = block.content.label ?? 'Tautan';
      const label = escapeHtml(rawLabel);
      const btnGrad = buildLinearGradientCss(block.style);
      const bg = btnGrad
        ? block.style.gradientColor1 || '#2563EB'
        : block.content.buttonBg ?? '#2563EB';
      const fg = block.content.buttonText ?? '#FFFFFF';
      const fontSize = block.style.fontSize
        ? `${Math.max(10, Math.min(32, Math.round(block.style.fontSize)))}px`
        : '14px';
      const weight = block.style.fontWeightCss || '600';
      const leftIconId = resolveButtonIcon(block.content.buttonIcon, rawLabel);
      const leftIconSvg = renderButtonIconSvgString(leftIconId, 16, block.content.buttonIconUrl);
      return `${indent}<a href="${href}" target="_blank" rel="noopener noreferrer"${hoverCls} style="${css}; display: flex; align-items: center; justify-content: center; gap: 8px; text-decoration: none; font-weight: ${weight}; font-size: ${fontSize}; background-color: ${bg};${
        btnGrad ? ` background-image: ${btnGrad};` : ''
      } color: ${fg}; padding: 12px 18px;">${leftIconSvg}<span>${label}</span></a>`;
    }

    case 'form': {
      const title = escapeHtml(block.content.formTitle ?? 'Formulir');
      const namePh = escapeHtml(block.content.namePlaceholder ?? 'Nama');
      const emailPh = escapeHtml(block.content.emailPlaceholder ?? 'Email');
      const btnLabel = escapeHtml(block.content.submitLabel ?? 'Kirim');
      const btnBg = block.content.buttonColor ?? '#2563EB';
      const successMsg = escapeHtml(block.content.successMessage ?? 'Terima kasih!');
      return `${indent}<form onsubmit="event.preventDefault(); this.querySelector('.form-msg').style.display='block';" style="${css}">
${indent}  <div style="font-weight: 700; font-size: 15px; margin-bottom: 12px;">${title}</div>
${indent}  <input type="text" required placeholder="${namePh}" style="width: 100%; padding: 10px 12px; margin-bottom: 8px; border: 1px solid #CBD5E1; border-radius: 8px; box-sizing: border-box; font-size: 14px;" />
${indent}  <input type="text" required placeholder="${emailPh}" style="width: 100%; padding: 10px 12px; margin-bottom: 12px; border: 1px solid #CBD5E1; border-radius: 8px; box-sizing: border-box; font-size: 14px;" />
${indent}  <button type="submit" style="width: 100%; padding: 11px 16px; border: none; border-radius: 8px; background-color: ${btnBg}; color: #FFFFFF; font-weight: 600; font-size: 14px; cursor: pointer;">${btnLabel}</button>
${indent}  <div class="form-msg" style="display: none; margin-top: 10px; font-size: 13px; color: #16A34A; font-weight: 500;">${successMsg}</div>
${indent}</form>`;
    }

    case 'divider': {
      const lineColor = block.content.lineColor ?? '#E2E8F0';
      const thickness = block.content.thickness ?? 1;
      const lineStyle = block.content.lineStyle ?? 'solid';
      return `${indent}<div style="${css}; display: flex; align-items: center;">\n${indent}  <hr style="width: 100%; border: none; border-top: ${thickness}px ${lineStyle} ${lineColor}; margin: 0;" />\n${indent}</div>`;
    }

    case 'youtube':
    case 'facebook_video':
    case 'tiktok_video':
    case 'instagram_video': {
      const platform: VideoEmbedPlatform =
        block.type === 'facebook_video'
          ? 'facebook'
          : block.type === 'tiktok_video'
          ? 'tiktok'
          : block.type === 'instagram_video'
          ? 'instagram'
          : 'youtube';
      const platformLabel =
        platform === 'facebook'
          ? 'Facebook'
          : platform === 'tiktok'
          ? 'TikTok'
          : platform === 'instagram'
          ? 'Instagram'
          : 'YouTube';
      const rawUrl =
        platform === 'youtube'
          ? block.content.youtubeUrl ?? block.content.videoUrl
          : block.content.videoUrl;
      const ratio =
        block.content.videoAspectRatio ??
        block.content.youtubeAspectRatio ??
        (platform === 'tiktok' || platform === 'instagram' ? '9/16' : '16/9');
      const autoPlay = block.content.videoAutoplay ?? block.content.youtubeAutoplay ?? true;
      const volume = block.content.videoVolume ?? block.content.youtubeVolume ?? 75;
      const poster = block.content.videoPoster?.trim() ?? '';

      const trimmedRawUrl = rawUrl?.trim() ?? '';
      const directUrl = isDirectVideoUrl(trimmedRawUrl) ? trimmedRawUrl : null;
      const ytId = !directUrl && platform === 'youtube' ? extractYouTubeId(trimmedRawUrl) : null;
      const ttId = !directUrl && platform === 'tiktok' ? extractTikTokId(trimmedRawUrl) : null;
      const fbUrl =
        !directUrl && platform === 'facebook' && isValidFacebookVideoUrl(trimmedRawUrl)
          ? normalizeFacebookVideoUrl(trimmedRawUrl)
          : null;
      const igInfo = !directUrl && platform === 'instagram' ? extractInstagramInfo(trimmedRawUrl) : null;
      const igId = igInfo ? `${igInfo.kind}/${igInfo.code}` : null;
      const validShort =
        (platform === 'tiktok' && isValidTikTokUrl(trimmedRawUrl)) ||
        (platform === 'instagram' && isValidInstagramVideoUrl(trimmedRawUrl));

      const vidId = directUrl || ytId || ttId || fbUrl || igId || (validShort ? trimmedRawUrl : null);

      if (!vidId) {
        return `${indent}<div style="${css}; padding: 16px; background: #F1F5F9; font-size: 13px;">URL Video ${platformLabel} belum valid</div>`;
      }

      const initialPoster =
        poster || (ytId ? `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg` : '');
      const initialStageInner = initialPoster
        ? `<img src="${escapeHtml(initialPoster)}" alt="Video preview" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover; display: block;" />`
        : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; background: linear-gradient(135deg, #0F172A, #020617); color: #CBD5E1; font-size: 12px; font-weight: 500;">Video siap diputar</div>`;

      return `${indent}<div data-vid-player data-vid-platform="${platform}" data-vid-id="${escapeHtml(
        vidId
      )}" data-vid-direct="${escapeHtml(directUrl ?? '')}" data-vid-url="${escapeHtml(
        trimmedRawUrl || vidId
      )}" data-vid-poster="${escapeHtml(poster)}" data-vid-autoplay="${
        autoPlay ? '1' : '0'
      }" data-vid-volume="${volume}" data-vid-accent="${escapeHtml(
        theme.accentColor
      )}" style="${css}">
${indent}  <div data-vid-stage style="width: 100%; aspect-ratio: ${ratio}; border-radius: ${block.style.borderRadius}px; overflow: hidden; background: #020617; position: relative;">
${indent}    <div data-vid-cover style="position: absolute; inset: 0; z-index: 2; transition: opacity 0.3s ease; opacity: 1;">
${indent}      ${initialStageInner}
${indent}    </div>
${indent}  </div>
${indent}  <div style="display: flex; align-items: center; gap: 6px; margin-top: 8px; padding: 6px; border-radius: 12px; background: #F1F5F9; border: 1px solid #E2E8F0;">
${indent}    <button type="button" data-vid-play style="padding: 6px 10px; border: none; border-radius: 8px; background: ${theme.accentColor}; color: #FFFFFF; font-size: 11px; font-weight: 600; cursor: pointer; white-space: nowrap; flex-shrink: 0;">&#9654; Play</button>
${indent}    <button type="button" data-vid-pause disabled style="padding: 6px 10px; border: 1px solid #CBD5E1; border-radius: 8px; background: #FFFFFF; color: #0F172A; font-size: 11px; font-weight: 600; cursor: not-allowed; opacity: 0.45; white-space: nowrap; flex-shrink: 0;">&#10074;&#10074; Pause</button>
${indent}    <div style="flex: 1; min-width: 0; display: flex; align-items: center; gap: 6px; padding: 0 4px;">
${indent}      <button type="button" data-vid-mute aria-label="Toggle suara" style="padding: 4px; border: none; background: transparent; cursor: pointer; font-size: 13px; line-height: 1; flex-shrink: 0;">&#128266;</button>
${indent}      <input type="range" data-vid-vol min="0" max="100" value="${volume}" aria-label="Volume Audio" style="flex: 1; min-width: 44px; accent-color: ${theme.accentColor}; cursor: pointer;" />
${indent}      <span data-vid-vol-label style="font-size: 11px; font-weight: 600; color: #475569; min-width: 30px; text-align: right; flex-shrink: 0;">${volume}%</span>
${indent}    </div>
${indent}  </div>
${indent}</div>`;
    }

    case 'catalog': {
      const items = block.content.catalogItems ?? [];
      const layout = advance.blockLayout;
      const isGrid = layout === 'grid';
      const detailEnabled = block.content.catalogDetailEnabled ?? true;
      const cartEnabled = block.content.catalogCartEnabled ?? true;
      const cartBtn = resolveCartButtonMetrics(block.content.catalogCartButtonSize);
      const wrapperStyle = isGrid
        ? `${css}; display: grid; grid-template-columns: repeat(2, 1fr); gap: 10px; text-align: left;`
        : `${css}; display: flex; flex-direction: column; gap: 10px; text-align: left;`;

      const makeCartSvg = (sz: number) =>
        `<svg viewBox="0 0 24 24" width="${sz}" height="${sz}" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`;
      const gridCartSvg = makeCartSvg(cartBtn.gridIconSize);
      const iconCartSvg = makeCartSvg(cartBtn.iconOnlySize);
      const compactCartSvg = makeCartSvg(cartBtn.compactIconSize);

      const itemCards = items
        .map((item) => {
          const soldHtml = advance.showUnitSold
            ? ` · ${item.unitSold} terjual`
            : '';
          const meta = `${escapeHtml(item.price)}${soldHtml}`;
          const cardBase = `background: ${theme.cardBg}; border: 1px solid ${theme.borderColor}; border-radius: 14px; overflow: hidden; text-decoration: none; color: ${theme.textColor};`;
          const fit = item.imageObjectFit ?? 'cover';
          const ratio = item.imageAspectRatio;
          const ratioCss = (fallback?: string) => {
            const eff = ratio === 'auto' ? undefined : ratio ?? fallback;
            return eff ? `aspect-ratio: ${eff};` : '';
          };
          const badgeHtml = item.badge?.trim()
            ? `<span style="display:inline-block; padding:2px 6px; border-radius:6px; font-size:9px; font-weight:700; color:#FFFFFF; background:${theme.accentColor};">${escapeHtml(item.badge.trim())}</span>`
            : '';
          const detailAttr = detailEnabled
            ? `data-open-detail="${escapeHtml(block.id)}::${escapeHtml(item.id)}" role="button" tabindex="0"`
            : '';
          const quickBtnAttr = `data-quick-add="${escapeHtml(block.id)}::${escapeHtml(item.id)}"`;

          if (layout === 'grid') {
            const safeItemUrl = escapeHtml(sanitizeExternalUrl(item.url, '#'));
            const mediaAndText = `
${indent}    ${badgeHtml ? `<div style="position:absolute; top:8px; left:8px; z-index:2;">${badgeHtml}</div>` : ''}
${indent}    <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" style="width: 100%; ${ratioCss('1/1')} object-fit: ${fit}; display: block;" />
${indent}    <div style="padding: 10px 10px ${cartEnabled ? '8px' : '10px'} 10px;">
${indent}      <div style="font-size: 13px; font-weight: 700; margin-bottom: 4px;">${escapeHtml(item.title)}</div>
${indent}      <div style="font-size: 11px; opacity: 0.75;">${meta}</div>
${indent}    </div>`;
            const quickBtnHtml = cartEnabled
              ? `\n${indent}    <div style="padding: 0 10px 10px 10px; margin-top: auto;"><button type="button" ${quickBtnAttr} style="width:100%; padding:${cartBtn.gridPadding}; border:0; border-radius:${cartBtn.gridRadius}px; background:${theme.accentColor}; color:#FFFFFF; font-size:${cartBtn.gridFontSize}px; font-weight:600; display:inline-flex; align-items:center; justify-content:center; gap:${cartBtn.gridGap}px; cursor:pointer;">${gridCartSvg}<span>+ Keranjang</span></button></div>`
              : '';
            if (detailEnabled) {
              return `${indent}  <div ${detailAttr} style="${cardBase} position: relative; display: flex; flex-direction: column; cursor: pointer;">${mediaAndText}${quickBtnHtml}\n${indent}  </div>`;
            }
            return `${indent}  <div style="${cardBase} position: relative; display: flex; flex-direction: column;">\n${indent}    <a href="${safeItemUrl}" target="_blank" rel="noopener noreferrer" style="display: flex; flex-direction: column; flex: 1; text-decoration: none; color: inherit;">${mediaAndText}\n${indent}    </a>${quickBtnHtml}\n${indent}  </div>`;
          }

          if (layout === 'large-image') {
            const safeItemUrl = escapeHtml(sanitizeExternalUrl(item.url, '#'));
            const quickBtnHtml = cartEnabled
              ? `<button type="button" ${quickBtnAttr} aria-label="Tambah ke keranjang" style="width:${cartBtn.iconBoxSize}px; height:${cartBtn.iconBoxSize}px; border:0; border-radius:${cartBtn.iconBoxRadius}px; background:${theme.accentColor}; color:#FFFFFF; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; cursor:pointer;">${iconCartSvg}</button>`
              : '';
            if (detailEnabled) {
              const inner = `
${indent}    ${badgeHtml ? `<div style="position:absolute; top:10px; left:10px; z-index:2;">${badgeHtml}</div>` : ''}
${indent}    <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" style="width: 100%; ${ratioCss('16/10')} object-fit: ${fit}; display: block;" />
${indent}    <div style="padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
${indent}      <div style="min-width: 0;">
${indent}        <div style="font-size: 14px; font-weight: 700;">${escapeHtml(item.title)}</div>
${indent}        <div style="font-size: 12px; opacity: 0.75; margin-top: 2px;">${meta}</div>
${indent}      </div>
${indent}      <div style="display:flex; align-items:center; gap:6px; flex-shrink:0;">
${indent}        <span style="font-size: 12px; font-weight: 600; color: ${theme.accentColor}; white-space: nowrap;">${escapeHtml(item.ctaLabel)}</span>
${indent}        ${quickBtnHtml}
${indent}      </div>
${indent}    </div>`;
              return `${indent}  <div ${detailAttr} style="${cardBase} position: relative; display: block; cursor: pointer;">${inner}\n${indent}  </div>`;
            }
            return `${indent}  <div style="${cardBase} position: relative; display: block;">
${indent}    <a href="${safeItemUrl}" target="_blank" rel="noopener noreferrer" style="display: block; position: relative; text-decoration: none; color: inherit;">
${indent}      ${badgeHtml ? `<div style="position:absolute; top:10px; left:10px; z-index:2;">${badgeHtml}</div>` : ''}
${indent}      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" style="width: 100%; ${ratioCss('16/10')} object-fit: ${fit}; display: block;" />
${indent}    </a>
${indent}    <div style="padding: 12px 14px; display: flex; justify-content: space-between; align-items: center; gap: 8px;">
${indent}      <a href="${safeItemUrl}" target="_blank" rel="noopener noreferrer" style="flex: 1; min-width: 0; display: flex; justify-content: space-between; align-items: center; gap: 8px; text-decoration: none; color: inherit;">
${indent}        <div style="min-width: 0;">
${indent}          <div style="font-size: 14px; font-weight: 700;">${escapeHtml(item.title)}</div>
${indent}          <div style="font-size: 12px; opacity: 0.75; margin-top: 2px;">${meta}</div>
${indent}        </div>
${indent}        <span style="font-size: 12px; font-weight: 600; color: ${theme.accentColor}; white-space: nowrap;">${escapeHtml(item.ctaLabel)}</span>
${indent}      </a>
${indent}      ${quickBtnHtml}
${indent}    </div>
${indent}  </div>`;
          }

          if (layout === 'compact') {
            const thumbSize = ratio && ratio !== 'auto'
              ? `width: 56px; ${ratioCss()}`
              : 'width: 52px; height: 52px;';
            const safeItemUrl = escapeHtml(sanitizeExternalUrl(item.url, '#'));
            const primaryBtn = detailEnabled
              ? `<button type="button" ${detailAttr} style="flex:1; padding: 8px 12px; border:0; border-radius: 8px; background: ${theme.accentColor}; color: #FFFFFF; font-size: 12px; font-weight: 600; cursor: pointer;">${escapeHtml(item.ctaLabel)}</button>`
              : `<a href="${safeItemUrl}" target="_blank" rel="noopener noreferrer" style="flex:1; display: block; text-align: center; padding: 8px 12px; border-radius: 8px; background: ${theme.accentColor}; color: #FFFFFF; font-size: 12px; font-weight: 600; text-decoration: none;">${escapeHtml(item.ctaLabel)}</a>`;
            return `${indent}  <div style="${cardBase} padding: 12px;">
${indent}    <div ${detailAttr} style="display: flex; gap: 10px; align-items: center; margin-bottom: 10px; ${detailEnabled ? 'cursor: pointer;' : ''}">
${indent}      <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" style="${thumbSize} border-radius: 10px; object-fit: ${fit}; flex-shrink: 0;" />
${indent}      <div style="min-width: 0;">
${indent}        ${badgeHtml ? `<div style="margin-bottom: 3px;">${badgeHtml}</div>` : ''}
${indent}        <div style="font-size: 13px; font-weight: 700;">${escapeHtml(item.title)}</div>
${indent}        <div style="font-size: 11px; opacity: 0.75; margin-top: 2px;">${meta}</div>
${indent}      </div>
${indent}    </div>
${indent}    <div style="display:flex; align-items:center; gap:6px;">
${indent}      ${primaryBtn}
${indent}      ${cartEnabled ? `<button type="button" ${quickBtnAttr} aria-label="Tambah ke keranjang" style="padding:${cartBtn.compactPadding}; border-radius:${cartBtn.compactRadius}px; border:1px solid ${theme.accentColor}; background:transparent; color:${theme.accentColor}; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; cursor:pointer;">${compactCartSvg}</button>` : ''}
${indent}    </div>
${indent}  </div>`;
          }

          // default layout
          const defaultThumbSize = ratio && ratio !== 'auto'
            ? `width: 64px; ${ratioCss()}`
            : 'width: 56px; height: 56px;';
          const defaultBody = `
${indent}    <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title)}" style="${defaultThumbSize} border-radius: 10px; object-fit: ${fit}; flex-shrink: 0;" />
${indent}    <div style="flex: 1; min-width: 0;">
${indent}      ${badgeHtml ? `<div style="margin-bottom: 3px;">${badgeHtml}</div>` : ''}
${indent}      <div style="font-size: 13px; font-weight: 700;">${escapeHtml(item.title)}</div>
${indent}      <div style="font-size: 11px; opacity: 0.72; margin-top: 2px;">${escapeHtml(item.subtitle)}</div>
${indent}      <div style="font-size: 12px; font-weight: 600; color: ${theme.accentColor}; margin-top: 4px;">${meta}</div>
${indent}    </div>`;
          const defaultQuickBtn = cartEnabled
            ? `\n${indent}    <button type="button" ${quickBtnAttr} aria-label="Tambah ke keranjang" style="width:${cartBtn.iconBoxSize}px; height:${cartBtn.iconBoxSize}px; border:0; border-radius:${cartBtn.iconBoxRadius}px; background:${theme.accentColor}; color:#FFFFFF; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0; cursor:pointer;">${iconCartSvg}</button>`
            : '';
          const safeItemUrl = escapeHtml(sanitizeExternalUrl(item.url, '#'));
          if (detailEnabled) {
            return `${indent}  <div ${detailAttr} style="${cardBase} display: flex; align-items: center; gap: 12px; padding: 10px 12px; cursor: pointer;">${defaultBody}${defaultQuickBtn}\n${indent}  </div>`;
          }
          return `${indent}  <div style="${cardBase} display: flex; align-items: center; gap: 12px; padding: 10px 12px;">\n${indent}    <a href="${safeItemUrl}" target="_blank" rel="noopener noreferrer" style="flex: 1; min-width: 0; display: flex; align-items: center; gap: 12px; text-decoration: none; color: inherit;">${defaultBody}\n${indent}    </a>${defaultQuickBtn}\n${indent}  </div>`;
        })
        .join('\n');

      return `${indent}<div style="${wrapperStyle}">\n${itemCards}\n${indent}</div>`;
    }

    case 'social': {
      const visibleItems = (block.content.socialItems ?? []).filter((item) => item.visible);
      if (visibleItems.length === 0) return '';

      const socialStyle = block.content.socialStyle ?? 'filled';
      const socialShape = block.content.socialShape ?? 'circle';
      const { boxSize, iconSize, gap } = resolveSocialMetrics(block.content);
      const useBrand = block.content.socialUseBrandColors ?? true;
      const customColor = block.content.socialColor ?? theme.accentColor;

      const justify =
        block.style.align === 'left'
          ? 'flex-start'
          : block.style.align === 'right'
          ? 'flex-end'
          : 'center';

      const radius = socialShape === 'rounded' ? '12px' : '9999px';

      const links = visibleItems
        .map((item) => {
          const meta = SOCIAL_PLATFORMS[item.platform];
          const activeColor = useBrand ? meta.brandColor : customColor;
          const visualCss =
            socialStyle === 'filled'
              ? `background-color: ${activeColor}; color: #FFFFFF;`
              : socialStyle === 'outline'
              ? `background-color: transparent; color: ${activeColor}; border: 1.5px solid ${activeColor};`
              : `background-color: transparent; color: ${activeColor};`;
          const href = escapeHtml(sanitizeExternalUrl(item.url, '#'));
          const label = escapeHtml(meta.label);

          return `${indent}  <a href="${href}" target="_blank" rel="noopener noreferrer" aria-label="${label}" title="${label}" style="width: ${boxSize}px; height: ${boxSize}px; border-radius: ${radius}; display: inline-flex; align-items: center; justify-content: center; text-decoration: none; box-sizing: border-box; flex-shrink: 0; ${visualCss}"><svg viewBox="${meta.viewBox}" width="${iconSize}" height="${iconSize}" aria-hidden="true">${meta.svgInner}</svg></a>`;
        })
        .join('\n');

      return `${indent}<div style="${css}; display: flex; flex-wrap: wrap; align-items: center; justify-content: ${justify}; gap: ${gap}px;">\n${links}\n${indent}</div>`;
    }

    case 'social_follower': {
      const accounts = block.content.socialFollowerAccounts ?? [];
      if (accounts.length === 0) return '';

      const gap = block.content.socialFollowerGap ?? 10;
      const radius = block.style.borderRadius;
      const cardBg =
        block.style.backgroundColor && block.style.backgroundColor !== 'transparent'
          ? block.style.backgroundColor
          : theme.cardBg;
      const borderCol =
        block.style.borderWidth > 0 ? block.style.borderColor : theme.borderColor;
      const textCol = resolvedTextColor;

      const cardsHtml = accounts
        .map((acc) => {
          const meta = SOCIAL_PLATFORMS[acc.platform] ?? SOCIAL_PLATFORMS.instagram;
          const avatar = acc.avatar?.trim() ?? '';
          const accountName = acc.accountName || 'Nama Akun Sosmed';
          const handle = acc.handle || '@username';
          const accountUrl = sanitizeExternalUrl(acc.accountUrl, meta.placeholderUrl);
          const followLabel = acc.followLabel?.trim() || 'Ikuti';

          const avatarHtml = avatar
            ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(accountName)}" referrerpolicy="no-referrer" style="width: 44px; height: 44px; border-radius: 9999px; object-fit: cover; border: 1px solid ${borderCol}; display: block;" />`
            : `<div style="width: 44px; height: 44px; border-radius: 9999px; background: ${meta.brandColor}; color: #FFFFFF; display: flex; align-items: center; justify-content: center;"><svg viewBox="${meta.viewBox}" width="20" height="20" aria-hidden="true">${meta.svgInner}</svg></div>`;

          const verifiedHtml = acc.verified
            ? `<svg viewBox="0 0 24 24" width="14" height="14" fill="#3B82F6" aria-hidden="true" style="flex-shrink: 0;"><path d="M12 2l2.39 1.66 2.86-.42.98 2.72 2.48 1.52-.64 2.82 1.24 2.61-2.06 2.04.14 2.89-2.83.62-1.68 2.38L12 20.1l-2.88.74-1.68-2.38-2.83-.62.14-2.89L2.69 12.9l1.24-2.61-.64-2.82 2.48-1.52.98-2.72 2.86.42L12 2zm-1.1 13.1l5.1-5.1-1.4-1.4-3.7 3.7-1.7-1.7-1.4 1.4 3.1 3.1z"/></svg>`
            : '';

          const bioHtml = acc.bio?.trim()
            ? `\n${indent}    <p style="margin: 0; font-size: 11px; opacity: 0.82; line-height: 1.5; white-space: pre-line;">${escapeHtml(
                acc.bio
              )}</p>`
            : '';

          const stats = [
            { label: acc.postsLabel?.trim() || 'Postingan', val: acc.postsCount?.trim() ?? '' },
            { label: acc.followersLabel?.trim() || 'Follower', val: acc.followers?.trim() ?? '' },
            { label: acc.followingLabel?.trim() || 'Mengikuti', val: acc.following?.trim() ?? '' },
          ].filter((x) => Boolean(x.val));

          const statsHtml = stats.length
            ? `\n${indent}    <div style="display: grid; grid-template-columns: repeat(${stats.length}, 1fr); gap: 4px; padding: 8px; border-radius: 12px; border: 1px solid ${borderCol}; background: rgba(148, 163, 184, 0.06); text-align: center;">\n${stats
                .map(
                  (st) =>
                    `${indent}      <div><div style="font-size: 12px; font-weight: 700;">${escapeHtml(
                      st.val
                    )}</div><div style="font-size: 10px; opacity: 0.7;">${escapeHtml(
                      st.label
                    )}</div></div>`
                )
                .join('\n')}\n${indent}    </div>`
            : '';

          return `${indent}  <div style="width: 100%; box-sizing: border-box; background: ${cardBg}; border: 1px solid ${borderCol}; border-radius: ${radius}px; color: ${textCol}; padding: 14px; box-shadow: 0 1px 2px rgba(15, 23, 42, 0.05); display: flex; flex-direction: column; gap: 10px; text-align: left;">
${indent}    <div style="display: flex; align-items: center; justify-content: space-between; gap: 10px;">
${indent}      <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
${indent}        <div style="position: relative; flex-shrink: 0;">
${indent}          ${avatarHtml}
${indent}          <span style="position: absolute; bottom: -2px; right: -2px; width: 18px; height: 18px; border-radius: 9999px; background: ${meta.brandColor}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2px #FFFFFF;"><svg viewBox="${meta.viewBox}" width="10" height="10" aria-hidden="true">${meta.svgInner}</svg></span>
${indent}        </div>
${indent}        <div style="min-width: 0;">
${indent}          <div style="display: flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 700;"><span>${escapeHtml(
            accountName
          )}</span>${verifiedHtml}</div>
${indent}          <div style="font-size: 11px; opacity: 0.7;">${escapeHtml(handle)} · ${escapeHtml(
            meta.label
          )}</div>
${indent}        </div>
${indent}      </div>
${indent}      <a href="${escapeHtml(
            accountUrl
          )}" target="_blank" rel="noopener noreferrer" style="padding: 6px 12px; border-radius: 8px; background: ${
            meta.brandColor
          }; color: #FFFFFF; font-size: 11px; font-weight: 600; text-decoration: none; flex-shrink: 0;">${escapeHtml(
            followLabel
          )}</a>
${indent}    </div>${bioHtml}${statsHtml}
${indent}  </div>`;
        })
        .join('\n');

      return `${indent}<div style="${css}; display: flex; flex-direction: column; gap: ${gap}px; text-align: left;">\n${cardsHtml}\n${indent}</div>`;
    }

    case 'carousel': {
      const items = block.content.carouselItems ?? [];
      if (items.length === 0) return '';
      const ratio = block.content.carouselAspectRatio ?? '4/5';
      const fit = block.content.carouselObjectFit ?? 'cover';
      const radius = block.style.borderRadius;
      const align = block.style.align;

      const slidesHtml = items
        .map((item, idx) => {
          const cleanUrl = sanitizeExternalUrl(item.url, '');
          const titleHtml = item.title.trim()
            ? `<div style="font-size: 13px; font-weight: 700; line-height: 1.35;">${escapeHtml(item.title)}</div>`
            : '';
          const captionHtml = item.caption.trim()
            ? `<div style="font-size: 12px; opacity: 0.78; line-height: 1.45; margin-top: 4px; white-space: pre-line;">${escapeHtml(item.caption)}</div>`
            : '';
          const footerHtml =
            titleHtml || captionHtml
              ? `<div style="padding: 10px 14px; text-align: ${align};">${titleHtml}${captionHtml}</div>`
              : '';
          const linkBadge = cleanUrl
            ? `<span style="position: absolute; bottom: 8px; right: 8px; padding: 2px 8px; border-radius: 9999px; background: rgba(15, 23, 42, 0.7); color: #FFFFFF; font-size: 10px; font-weight: 600;">Link &#8599;</span>`
            : '';
          const cardHtml = `<div style="background: ${theme.cardBg}; border: 1px solid ${theme.borderColor}; border-radius: ${radius}px; overflow: hidden; color: ${resolvedTextColor};">
${indent}        <div style="position: relative; width: 100%; aspect-ratio: ${ratio}; background: #F1F5F9; overflow: hidden;">
${indent}          <img src="${escapeHtml(item.image)}" alt="${escapeHtml(item.title || `Foto ${idx + 1}`)}" draggable="false" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: ${fit}; display: block;" />${linkBadge}
${indent}        </div>${footerHtml}
${indent}      </div>`;

          if (cleanUrl) {
            return `${indent}    <div style="flex: 0 0 100%; scroll-snap-align: start; box-sizing: border-box;">\n${indent}      <a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" draggable="false" style="display: block; text-decoration: none; color: inherit;">${cardHtml}</a>\n${indent}    </div>`;
          }
          return `${indent}    <div style="flex: 0 0 100%; scroll-snap-align: start; box-sizing: border-box;">\n${indent}      ${cardHtml}\n${indent}    </div>`;
        })
        .join('\n');

      const dotsHtml =
        items.length > 1
          ? `\n${indent}  <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 10px;">\n${items
              .map(
                (_, idx) =>
                  `${indent}    <button type="button" data-car-dot="${idx}" aria-label="Lihat foto ${idx + 1}" style="height: 6px; width: ${
                    idx === 0 ? '20px' : '6px'
                  }; border-radius: 9999px; border: none; padding: 0; background: ${
                    idx === 0 ? theme.accentColor : '#CBD5E1'
                  }; cursor: pointer; transition: all 0.2s ease;"></button>`
              )
              .join('\n')}\n${indent}  </div>`
          : '';

      const navHtml =
        items.length > 1
          ? `\n${indent}    <div data-car-counter style="position: absolute; top: 10px; right: 10px; z-index: 3; padding: 2px 8px; border-radius: 9999px; background: rgba(15, 23, 42, 0.65); color: #FFFFFF; font-size: 10px; font-weight: 600; pointer-events: none;">1 / ${items.length}</div>
${indent}    <button type="button" data-car-prev aria-label="Foto sebelumnya" style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); z-index: 3; width: 28px; height: 28px; border-radius: 9999px; border: 1px solid #E2E8F0; background: rgba(255, 255, 255, 0.92); color: #0F172A; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0.3;">&#8249;</button>
${indent}    <button type="button" data-car-next aria-label="Foto berikutnya" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); z-index: 3; width: 28px; height: 28px; border-radius: 9999px; border: 1px solid #E2E8F0; background: rgba(255, 255, 255, 0.92); color: #0F172A; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; cursor: pointer;">&#8250;</button>`
          : '';

      return `${indent}<div data-carousel data-car-accent="${escapeHtml(theme.accentColor)}" style="${css}">
${indent}  <div style="position: relative;">
${indent}    <div data-car-track style="display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth; border-radius: ${radius}px; -webkit-overflow-scrolling: touch; cursor: grab;">
${slidesHtml}
${indent}    </div>${navHtml}
${indent}  </div>${dotsHtml}
${indent}</div>`;
    }

    case 'social_feed': {
      const platform = block.content.socialFeedPlatform ?? 'instagram';
      const meta = SOCIAL_PLATFORMS[platform] ?? SOCIAL_PLATFORMS.instagram;
      const avatar = block.content.socialFeedAvatar?.trim() ?? '';
      const accountName = block.content.socialFeedAccountName ?? 'Studio Kreatif';
      const handle = block.content.socialFeedHandle ?? '@studiokreatif';
      const accountUrl = sanitizeExternalUrl(block.content.socialFeedAccountUrl, meta.placeholderUrl);
      const verified = block.content.socialFeedVerified ?? true;
      const followLabel = block.content.socialFeedFollowLabel ?? 'Ikuti';
      const ratio = block.content.socialFeedRatio ?? '4/5';
      const posts = block.content.socialFeedPosts ?? [];
      const mediaRadius = Math.max(8, Math.min(block.style.borderRadius, 14));

      const avatarHtml = avatar
        ? `<img src="${escapeHtml(avatar)}" alt="${escapeHtml(accountName)}" referrerpolicy="no-referrer" style="width: 44px; height: 44px; border-radius: 9999px; object-fit: cover; border: 1px solid ${theme.borderColor}; display: block;" />`
        : `<div style="width: 44px; height: 44px; border-radius: 9999px; background: ${meta.brandColor}; color: #FFFFFF; display: flex; align-items: center; justify-content: center;"><svg viewBox="${meta.viewBox}" width="20" height="20" aria-hidden="true">${meta.svgInner}</svg></div>`;

      const verifiedHtml = verified
        ? `<svg viewBox="0 0 24 24" width="14" height="14" fill="#3B82F6" aria-hidden="true" style="flex-shrink: 0;"><path d="M12 2l2.39 1.66 2.86-.42.98 2.72 2.48 1.52-.64 2.82 1.24 2.61-2.06 2.04.14 2.89-2.83.62-1.68 2.38L12 20.1l-2.88.74-1.68-2.38-2.83-.62.14-2.89L2.69 12.9l1.24-2.61-.64-2.82 2.48-1.52.98-2.72 2.86.42L12 2zm-1.1 13.1l5.1-5.1-1.4-1.4-3.7 3.7-1.7-1.7-1.4 1.4 3.1 3.1z"/></svg>`
        : '';

      const followersVal = block.content.socialFeedFollowers?.trim() ?? '';
      const followersLbl =
        block.content.socialFeedFollowersLabel?.trim() ||
        (platform === 'youtube' ? 'Subscriber' : 'Follower');
      const followerHtml = followersVal
        ? `<div style="padding: 4px 8px; border-radius: 8px; border: 1px solid ${theme.borderColor}; background: rgba(148, 163, 184, 0.06); text-align: center; line-height: 1.2; flex-shrink: 0;"><div style="font-size: 11px; font-weight: 700;">${escapeHtml(
            followersVal
          )}</div><div style="font-size: 9.5px; opacity: 0.7;">${escapeHtml(
            followersLbl
          )}</div></div>`
        : '';

      const bioHtml = block.content.socialFeedBio?.trim()
        ? `\n${indent}  <p style="margin: 0; font-size: 11px; opacity: 0.82; line-height: 1.5; white-space: pre-line;">${escapeHtml(
            block.content.socialFeedBio
          )}</p>`
        : '';

      const slidesHtml = posts
        .map((post, idx) => {
          const rawVid = post.videoUrl?.trim() ?? '';
          const ytId = rawVid ? extractYouTubeId(rawVid) : null;
          const isDirect =
            isDirectVideoUrl(rawVid) || /^data:video\//i.test(rawVid);
          const ttId = !isDirect && rawVid && isValidTikTokUrl(rawVid) ? extractTikTokId(rawVid) || rawVid : null;
          const igInfo = !isDirect && rawVid && isValidInstagramVideoUrl(rawVid) ? extractInstagramInfo(rawVid) : null;
          const fbUrl = !isDirect && rawVid && isValidFacebookVideoUrl(rawVid) ? normalizeFacebookVideoUrl(rawVid) : null;
          const vidKind = isDirect
            ? 'direct'
            : ytId
            ? 'youtube'
            : ttId
            ? 'tiktok'
            : igInfo || (rawVid && isValidInstagramVideoUrl(rawVid))
            ? 'instagram'
            : fbUrl
            ? 'facebook'
            : '';
          const vidId = isDirect
            ? rawVid
            : ytId || ttId || (igInfo ? `${igInfo.kind}/${igInfo.code}` : rawVid) || fbUrl || '';
          const poster =
            post.imageUrl?.trim() ||
            (ytId ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg` : '');

          const mediaHtml =
            post.mediaType === 'video'
              ? `<div data-sf-video-box data-sf-kind="${escapeHtml(vidKind)}" data-sf-id="${escapeHtml(
                  vidId
                )}" data-sf-url="${escapeHtml(rawVid)}" style="position: relative; width: 100%; aspect-ratio: ${ratio}; background: #0F172A; overflow: hidden;">
${indent}          ${
                  poster
                    ? `<img src="${escapeHtml(poster)}" alt="${escapeHtml(
                        post.caption || `Video ${idx + 1}`
                      )}" draggable="false" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover; display: block;" />`
                    : `<div style="width: 100%; height: 100%; background: linear-gradient(135deg, #1E293B, #020617);"></div>`
                }
${indent}          <div style="position: absolute; inset: 0; background: rgba(2, 6, 23, 0.25); pointer-events: none;"></div>
${indent}          <button type="button" data-sf-play aria-label="Putar video" style="position: absolute; left: 50%; top: 50%; transform: translate(-50%, -50%); z-index: 3; width: 56px; height: 56px; border-radius: 9999px; border: none; background: rgba(255, 255, 255, 0.95); color: ${theme.accentColor}; box-shadow: 0 10px 25px rgba(0,0,0,0.25); display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 20px; padding-left: 4px;">&#9654;</button>
${indent}        </div>`
              : `<div style="position: relative; width: 100%; aspect-ratio: ${ratio}; background: #F1F5F9; overflow: hidden;">
${indent}          <img src="${escapeHtml(post.imageUrl)}" alt="${escapeHtml(
                  post.caption || `Postingan ${idx + 1}`
                )}" draggable="false" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover; display: block;" />
${indent}        </div>`;

          const cleanUrl = sanitizeExternalUrl(post.url, '');
          const metaRow =
            post.likes?.trim() || post.comments?.trim() || cleanUrl
              ? `<div style="display: flex; align-items: center; justify-content: space-between; gap: 8px; font-size: 11px; margin-bottom: 4px;">
${indent}            <div style="display: flex; align-items: center; gap: 10px; opacity: 0.82;">
${indent}              ${post.likes?.trim() ? `<span>&#10084;&#65039; <strong>${escapeHtml(post.likes)}</strong></span>` : ''}
${indent}              ${post.comments?.trim() ? `<span>&#128172; <strong>${escapeHtml(post.comments)}</strong></span>` : ''}
${indent}            </div>
${indent}            ${cleanUrl ? `<a href="${escapeHtml(cleanUrl)}" target="_blank" rel="noopener noreferrer" style="color: ${theme.accentColor}; font-weight: 600; text-decoration: none;">Lihat Post &#8599;</a>` : ''}
${indent}          </div>`
              : '';
          const captionRow = post.caption.trim()
            ? `<div style="font-size: 11px; line-height: 1.45; opacity: 0.85; white-space: pre-line;">${escapeHtml(post.caption)}</div>`
            : '';
          const footerHtml =
            metaRow || captionRow
              ? `\n${indent}        <div style="padding: 10px 12px;">${metaRow}${captionRow}</div>`
              : '';

          return `${indent}    <div style="flex: 0 0 100%; scroll-snap-align: start; box-sizing: border-box;">
${indent}      <div style="border: 1px solid ${theme.borderColor}; border-radius: ${mediaRadius}px; overflow: hidden; background: rgba(148, 163, 184, 0.05);">
${indent}        ${mediaHtml}${footerHtml}
${indent}      </div>
${indent}    </div>`;
        })
        .join('\n');

      const navHtml =
        posts.length > 1
          ? `\n${indent}    <div data-car-counter style="position: absolute; top: 10px; right: 10px; z-index: 3; padding: 2px 8px; border-radius: 9999px; background: rgba(15, 23, 42, 0.65); color: #FFFFFF; font-size: 10px; font-weight: 600; pointer-events: none;">1 / ${posts.length}</div>
${indent}    <button type="button" data-car-prev aria-label="Postingan sebelumnya" style="position: absolute; left: 8px; top: 50%; transform: translateY(-50%); z-index: 3; width: 28px; height: 28px; border-radius: 9999px; border: 1px solid #E2E8F0; background: rgba(255, 255, 255, 0.92); color: #0F172A; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; cursor: pointer; opacity: 0.3;">&#8249;</button>
${indent}    <button type="button" data-car-next aria-label="Postingan berikutnya" style="position: absolute; right: 8px; top: 50%; transform: translateY(-50%); z-index: 3; width: 28px; height: 28px; border-radius: 9999px; border: 1px solid #E2E8F0; background: rgba(255, 255, 255, 0.92); color: #0F172A; font-size: 16px; line-height: 1; display: flex; align-items: center; justify-content: center; cursor: pointer;">&#8250;</button>`
          : '';

      const dotsHtml =
        posts.length > 1
          ? `\n${indent}  <div style="display: flex; align-items: center; justify-content: center; gap: 6px; margin-top: 10px;">\n${posts
              .map(
                (_, idx) =>
                  `${indent}    <button type="button" data-car-dot="${idx}" aria-label="Lihat postingan ${idx + 1}" style="height: 6px; width: ${
                    idx === 0 ? '20px' : '6px'
                  }; border-radius: 9999px; border: none; padding: 0; background: ${
                    idx === 0 ? meta.brandColor : '#CBD5E1'
                  }; cursor: pointer; transition: all 0.2s ease;"></button>`
              )
              .join('\n')}\n${indent}  </div>`
          : '';

      return `${indent}<div style="${css}; text-align: left; display: flex; flex-direction: column; gap: 12px;">
${indent}  <div style="display: flex; align-items: center; justify-content: space-between; gap: 8px;">
${indent}    <div style="display: flex; align-items: center; gap: 10px; min-width: 0;">
${indent}      <div style="position: relative; flex-shrink: 0;">
${indent}        ${avatarHtml}
${indent}        <span style="position: absolute; bottom: -2px; right: -2px; width: 18px; height: 18px; border-radius: 9999px; background: ${meta.brandColor}; color: #FFFFFF; display: flex; align-items: center; justify-content: center; box-shadow: 0 0 0 2px #FFFFFF;"><svg viewBox="${meta.viewBox}" width="10" height="10" aria-hidden="true">${meta.svgInner}</svg></span>
${indent}      </div>
${indent}      <div style="min-width: 0;">
${indent}        <div style="display: flex; align-items: center; gap: 4px; font-size: 13px; font-weight: 700;"><span>${escapeHtml(accountName)}</span>${verifiedHtml}</div>
${indent}        <div style="font-size: 11px; opacity: 0.7;">${escapeHtml(handle)} · ${escapeHtml(meta.label)}</div>
${indent}      </div>
${indent}    </div>
${indent}    <div style="display: flex; align-items: center; gap: 6px; flex-shrink: 0;">
${indent}      ${followerHtml}
${indent}      <a href="${escapeHtml(accountUrl)}" target="_blank" rel="noopener noreferrer" style="padding: 6px 12px; border-radius: 8px; background: ${meta.brandColor}; color: #FFFFFF; font-size: 11px; font-weight: 600; text-decoration: none; flex-shrink: 0;">${escapeHtml(followLabel)}</a>
${indent}    </div>
${indent}  </div>${bioHtml}
${indent}  <div data-carousel data-car-accent="${escapeHtml(meta.brandColor)}">
${indent}    <div style="position: relative;">
${indent}      <div data-car-track style="display: flex; overflow-x: auto; scroll-snap-type: x mandatory; scroll-behavior: smooth; border-radius: ${mediaRadius}px; -webkit-overflow-scrolling: touch; cursor: grab;">
${slidesHtml}
${indent}      </div>${navHtml}
${indent}    </div>${dotsHtml}
${indent}  </div>
${indent}</div>`;
    }

    case 'maps_place': {
      const photoUrl = block.content.mapsPhotoUrl ?? '';
      const photoBadgeLabel = (block.content.mapsPhotoBadgeLabel ?? 'Lihat foto').trim();
      const photoRatio = block.content.mapsPhotoRatio ?? '16/9';
      const title = block.content.mapsTitle ?? 'Nama Lokasi';
      const rawRating = block.content.mapsRating ?? 4.9;
      const clampedRating = Math.max(0, Math.min(5, Number.isFinite(rawRating) ? rawRating : 4.9));
      const formattedRating = clampedRating.toFixed(1).replace('.', ',');
      const reviewCount = (block.content.mapsReviewCount ?? '1.643').trim();
      const service = (block.content.mapsService ?? 'Layanan Satpam').trim();
      const accessible = block.content.mapsAccessible ?? true;
      const servicesList = (block.content.mapsServicesList ?? '')
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      const address = (block.content.mapsAddress ?? '').trim();
      const mapsUrl = sanitizeExternalUrl(block.content.mapsUrl, '');
      const buttonLabel = (block.content.mapsButtonLabel ?? 'Buka di Google Maps').trim();
      const topRadius = Math.max(0, block.style.borderRadius - 1);
      const align = block.style.align;
      const justify = align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start';
      const safeId = block.id.replace(/[^a-zA-Z0-9_-]/g, '');

      const starsHtml = [0, 1, 2, 3, 4]
        .map((idx) => {
          const fillPercent = Math.max(0, Math.min(1, clampedRating - idx)) * 100;
          const gradId = `mstar_${safeId}_${idx}`;
          return `<svg viewBox="0 0 20 20" width="14" height="14" style="flex-shrink:0;" aria-hidden="true"><defs><linearGradient id="${gradId}" x1="0" y1="0" x2="1" y2="0"><stop offset="${fillPercent}%" stop-color="#FBBF24"/><stop offset="${fillPercent}%" stop-color="#E2E8F0"/></linearGradient></defs><path fill="url(#${gradId})" d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.17c.969 0 1.371 1.24.588 1.81l-3.374 2.45a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.374-2.45a1 1 0 00-1.176 0l-3.374 2.45c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.17a1 1 0 00.95-.69l1.29-3.967z"/></svg>`;
        })
        .join('');

      const photoBadgeHtml =
        photoBadgeLabel && photoUrl
          ? `<button type="button" data-maps-photo-open="${escapeHtml(photoUrl)}" data-maps-photo-title="${escapeHtml(
              title
            )}" style="position: absolute; bottom: 12px; left: 12px; display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 8px; border: 0; background: rgba(15, 23, 42, 0.78); color: #FFFFFF; font-size: 12px; font-weight: 500; cursor: pointer; backdrop-filter: blur(4px); box-shadow: 0 2px 6px rgba(0,0,0,0.2);"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg><span>${escapeHtml(
              photoBadgeLabel
            )}</span></button>`
          : '';

      const reviewHtml = reviewCount
        ? `<span style="opacity: 0.7; font-variant-numeric: tabular-nums;">(${escapeHtml(reviewCount)})</span>`
        : '';

      const accessibleIconSvg = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="#2563EB" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" title="Akses ramah kursi roda" aria-hidden="true"><circle cx="16" cy="4" r="1"/><path d="m18 19 1-7-6 1"/><path d="m5 8 3-3 5.5 3-2.36 3.5"/><path d="M4.24 14.5a5 5 0 0 0 6.88 6"/><path d="M13.76 17.5a5 5 0 0 0-6.88-6"/></svg>`;

      const serviceRowHtml =
        service || accessible
          ? `<div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: ${justify}; gap: 6px; font-size: 12px; opacity: 0.85;">${
              service ? `<span>${escapeHtml(service)}</span>` : ''
            }${service && accessible ? '<span>·</span>' : ''}${
              accessible ? `<span style="display:inline-flex;align-items:center;">${accessibleIconSvg}</span>` : ''
            }</div>`
          : '';

      const serviceTagsHtml = servicesList.length
        ? `<div style="display: flex; flex-wrap: wrap; justify-content: ${justify}; gap: 6px; padding-top: 4px;">${servicesList
            .map(
              (tag) =>
                `<span style="padding: 2px 8px; border-radius: 6px; border: 1px solid ${theme.borderColor}; background: rgba(100,116,139,0.06); font-size: 11px; font-weight: 500; opacity: 0.9;">${escapeHtml(
                  tag
                )}</span>`
            )
            .join('')}</div>`
        : '';

      const addressHtml = address
        ? `<div style="display: flex; align-items: flex-start; justify-content: ${justify}; gap: 6px; font-size: 11px; opacity: 0.75; padding-top: 2px;"><svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;margin-top:1px;" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg><span>${escapeHtml(
            address
          )}</span></div>`
        : '';

      const buttonHtml =
        mapsUrl && buttonLabel
          ? `<div style="width: 100%; padding-top: 8px;"><a href="${escapeHtml(
              mapsUrl
            )}" target="_blank" rel="noopener noreferrer" style="width: 100%; box-sizing: border-box; padding: 8px 12px; border-radius: 8px; background: ${
              theme.accentColor
            }; color: #FFFFFF; font-size: 12px; font-weight: 600; text-decoration: none; display: inline-flex; align-items: center; justify-content: center; gap: 6px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg><span>${escapeHtml(
              buttonLabel
            )}</span></a></div>`
          : '';

      const imgHtml = photoUrl
        ? `<img src="${escapeHtml(photoUrl)}" alt="${escapeHtml(
            title
          )}" referrerpolicy="no-referrer" style="width: 100%; height: 100%; object-fit: cover; display: block;" />`
        : `<div style="width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; color: #94A3B8; font-size: 12px;">Foto lokasi belum tersedia</div>`;

      return `${indent}<div${hoverCls} data-jump-title="${escapeHtml(
        title.trim().toLowerCase()
      )}" style="${css}; overflow: hidden;">
${indent}  <div style="position: relative; width: 100%; aspect-ratio: ${photoRatio}; background: #E2E8F0; overflow: hidden; border-top-left-radius: ${topRadius}px; border-top-right-radius: ${topRadius}px;">
${indent}    ${imgHtml}
${indent}    ${photoBadgeHtml}
${indent}  </div>
${indent}  <div style="padding: 14px 16px; display: flex; flex-direction: column; gap: 6px; text-align: ${align};">
${indent}    <div style="font-size: 16px; font-weight: 700; line-height: 1.35; letter-spacing: -0.01em;">${escapeHtml(
        title
      )}</div>
${indent}    <div style="display: flex; flex-wrap: wrap; align-items: center; justify-content: ${justify}; gap: 6px; font-size: 12px;">
${indent}      <span style="font-weight: 500; font-variant-numeric: tabular-nums; opacity: 0.85;">${escapeHtml(
        formattedRating
      )}</span>
${indent}      <span style="display: inline-flex; align-items: center; gap: 2px;">${starsHtml}</span>
${indent}      ${reviewHtml}
${indent}    </div>
${indent}    ${serviceRowHtml}
${indent}    ${serviceTagsHtml}
${indent}    ${addressHtml}
${indent}    ${buttonHtml}
${indent}  </div>
${indent}</div>`;
    }

    case 'training_catalog': {
      const heading = (block.content.trainingHeading ?? '').trim();
      const batch = (block.content.trainingBatch ?? '').trim();
      const schedule = (block.content.trainingSchedule ?? '').trim();
      const subheading = (block.content.trainingSubheading ?? '').trim();
      const expandLabel = (block.content.trainingExpandLabel ?? '').trim() || 'Selengkapnya';
      const collapseLabel =
        (block.content.trainingCollapseLabel ?? '').trim() || 'Tutup Detail';
      const defaultExpanded = Boolean(block.content.trainingDefaultExpanded);
      const programs = block.content.trainingPrograms ?? [];
      const customBoxes = block.content.trainingCustomBoxes ?? [];
      const mediaList = block.content.trainingMedia ?? [];
      const mediaRatio = block.content.trainingMediaRatio ?? '16/9';
      const checklistTitle =
        (block.content.trainingChecklistTitle ?? '').trim() || 'Checklist Syarat Berkas';
      const checklistItems = (block.content.trainingChecklistItems ?? [])
        .map((x) => x.trim())
        .filter(Boolean);
      const formTitle =
        (block.content.trainingFormTitle ?? '').trim() || 'Formulir Pendaftaran / Konsultasi';
      const formFields = resolveTrainingFormFields(block.content);
      const waNumber = block.content.trainingWaNumber ?? '6281234567890';
      const waLabel =
        (block.content.trainingWaButtonLabel ?? '').trim() || 'Konsultasi via WhatsApp';
      const waIntro =
        (block.content.trainingWaIntro ?? '').trim() ||
        'Halo, saya ingin konsultasi mengenai program pelatihan berikut:';
      const align = block.style.align;
      const innerRadius = Math.max(10, block.style.borderRadius - 4);
      const activeProg = programs[0] ?? null;
      const activeMedia = mediaList[0] ?? null;
      const initialWaHref = buildTrainingWhatsappUrl({
        phone: waNumber,
        heading,
        batch,
        schedule,
        intro: waIntro,
        program: activeProg,
        checklistStatus: checklistItems.map((it) => ({ label: it, checked: false })),
        formEntries: formFields.map((f) => ({ label: f.label, value: '' })),
      });

      const programsWithHtml = programs.map((p) => ({
        ...p,
        descriptionHtml: p.description ? formatRichHtmlWithSpacing(p.description, 4) : '',
      }));

      const cfgJson = JSON.stringify({
        heading,
        batch,
        schedule,
        expandLabel,
        collapseLabel,
        defaultExpanded,
        waNumber,
        waIntro,
        accentColor: theme.accentColor,
        borderColor: theme.borderColor,
        textColor: resolvedTextColor,
        programs: programsWithHtml,
        mediaList: mediaList.map((m) => ({
          id: m.id,
          imageUrl: m.imageUrl,
          caption: m.caption,
        })),
        checklistItems,
        formFields,
      }).replace(/</g, '\\u003c');

      const metaRowsHtml =
        batch || schedule
          ? `<div style="display:flex; flex-wrap:wrap; align-items:center; gap:6px 12px; font-size:11.5px; opacity:0.82;">${
              batch
                ? `<span style="display:inline-flex; align-items:center; gap:4px; font-weight:500;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="${theme.accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="12 2 2 7 12 12 22 7 12 2"/><polyline points="2 17 12 22 22 17"/><polyline points="2 12 12 17 22 12"/></svg><span>${escapeHtml(
                    batch
                  )}</span></span>`
                : ''
            }${
              schedule
                ? `<span style="display:inline-flex; align-items:center; gap:4px;"><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="${theme.accentColor}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 7.5V6a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h3.5"/><path d="M16 2v4"/><path d="M8 2v4"/><path d="M3 10h5"/><path d="M17.5 17.5 16 16.3V14"/><circle cx="16" cy="16" r="6"/></svg><span>${escapeHtml(
                    schedule
                  )}</span></span>`
                : ''
            }</div>`
          : '';

      const headerHtml =
        heading || batch || schedule
          ? `<div style="display:flex; flex-direction:column; gap:6px;">${
              heading
                ? `<div style="display:flex; align-items:center; gap:8px;"><span style="width:28px; height:28px; border-radius:8px; background:${theme.accentColor}1A; color:${theme.accentColor}; display:inline-flex; align-items:center; justify-content:center; flex-shrink:0;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M22 10v6M2 10l10-5 10 5-10 5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/></svg></span><h3 style="margin:0; font-size:15px; font-weight:700; line-height:1.35;">${escapeHtml(
                    heading
                  )}</h3></div>`
                : ''
            }${metaRowsHtml}</div>`
          : '';

      const mediaNavHtml =
        mediaList.length > 1
          ? `<span data-trn-counter style="position:absolute; top:10px; right:10px; z-index:2; padding:2px 8px; border-radius:9999px; background:rgba(15,23,42,0.68); color:#FFFFFF; font-size:10px; font-weight:600; font-variant-numeric:tabular-nums;">1 / ${mediaList.length}</span>` +
            `<button type="button" data-trn-prev aria-label="Slide sebelumnya" style="position:absolute; left:8px; top:50%; transform:translateY(-50%); z-index:2; width:28px; height:28px; border-radius:9999px; border:1px solid #E2E8F0; background:rgba(255,255,255,0.92); color:#0F172A; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center;">&#8249;</button>` +
            `<button type="button" data-trn-next aria-label="Slide berikutnya" style="position:absolute; right:8px; top:50%; transform:translateY(-50%); z-index:2; width:28px; height:28px; border-radius:9999px; border:1px solid #E2E8F0; background:rgba(255,255,255,0.92); color:#0F172A; font-size:16px; cursor:pointer; display:flex; align-items:center; justify-content:center;">&#8250;</button>`
          : '';

      const mediaHtml = activeMedia
        ? `<div style="border:1px solid ${theme.borderColor}; border-radius:${innerRadius}px; overflow:hidden; background:${theme.cardBg};">
${indent}    <div style="position:relative; aspect-ratio:${mediaRatio}; background:#F1F5F9; overflow:hidden;">
${indent}      ${mediaNavHtml}
${indent}      <img data-trn-img src="${escapeHtml(activeMedia.imageUrl)}" alt="${escapeHtml(
            activeMedia.caption || 'Foto pelatihan'
          )}" referrerpolicy="no-referrer" style="width:100%; height:100%; object-fit:cover; display:block;" />
${indent}    </div>
${indent}    <div data-trn-media-foot style="padding:10px 12px; border-top:1px solid ${
            theme.borderColor
          }; display:${activeMedia.caption?.trim() ? 'block' : 'none'};">
${indent}      <p data-trn-caption style="margin:0; font-size:11.5px; opacity:0.85; line-height:1.4;">${escapeHtml(
            activeMedia.caption || ''
          )}</p>
${indent}    </div>
${indent}  </div>`
        : '';

      const hasSummaryPrice = Boolean(
        activeProg &&
          (activeProg.price?.trim() ||
            activeProg.originalPrice?.trim() ||
            activeProg.discountLabel?.trim() ||
            activeProg.cashbackLabel?.trim())
      );

      const summaryPriceHtml = activeProg
        ? `<div data-trn-sum-price-box style="border:1px solid ${
            theme.borderColor
          }; background:${theme.accentColor}0E; border-radius:${innerRadius}px; padding:10px; display:${
            hasSummaryPrice ? 'flex' : 'none'
          }; flex-direction:column; gap:6px;">
${indent}    <div style="font-size:10.5px; font-weight:600; text-transform:uppercase; letter-spacing:0.04em; opacity:0.7;">Biaya Pelatihan</div>
${indent}    <div style="display:flex; flex-wrap:wrap; align-items:baseline; gap:8px;">
${indent}      <span data-trn-sum-orig style="display:${
            activeProg.originalPrice?.trim() ? 'inline' : 'none'
          }; font-size:12px; text-decoration:line-through; opacity:0.55; font-variant-numeric:tabular-nums;">${escapeHtml(
            activeProg.originalPrice?.trim() || ''
          )}</span>
${indent}      <span data-trn-sum-price style="display:${
            activeProg.price?.trim() ? 'inline' : 'none'
          }; font-size:16px; font-weight:800; color:${
            theme.accentColor
          }; font-variant-numeric:tabular-nums;">${escapeHtml(
            activeProg.price?.trim() || ''
          )}</span>
${indent}    </div>
${indent}    <div style="display:flex; flex-wrap:wrap; gap:6px;">
${indent}      <span data-trn-sum-disc style="display:${
            activeProg.discountLabel?.trim() ? 'inline-flex' : 'none'
          }; align-items:center; padding:2px 8px; border-radius:6px; background:rgba(244,63,94,0.12); color:#BE123C; font-size:11px; font-weight:700;">${escapeHtml(
            activeProg.discountLabel?.trim() || ''
          )}</span>
${indent}      <span data-trn-sum-cb style="display:${
            activeProg.cashbackLabel?.trim() ? 'inline-flex' : 'none'
          }; align-items:center; padding:2px 8px; border-radius:6px; background:rgba(16,185,129,0.14); color:#047857; font-size:11px; font-weight:700;">${escapeHtml(
            activeProg.cashbackLabel?.trim() || ''
          )}</span>
${indent}    </div>
${indent}  </div>`
        : '';

      const shortDescHtml = subheading
        ? `<p style="margin:0; font-size:12px; opacity:0.8; line-height:1.55; white-space:pre-line;">${escapeHtml(
            subheading
          )}</p>`
        : '';

      const toggleBtnHtml = `<button type="button" data-trn-toggle style="width:100%; box-sizing:border-box; padding:9px 14px; border-radius:${innerRadius}px; border:1px solid ${
        theme.accentColor
      }; background:${defaultExpanded ? theme.accentColor : 'transparent'}; color:${
        defaultExpanded ? '#FFFFFF' : theme.accentColor
      }; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit; display:flex; align-items:center; justify-content:center; gap:6px; transition:all 0.18s;"><span data-trn-toggle-label>${escapeHtml(
        defaultExpanded ? collapseLabel : expandLabel
      )}</span><svg data-trn-toggle-icon viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="transition:transform 0.2s; transform:${
        defaultExpanded ? 'rotate(180deg)' : 'rotate(0deg)'
      };" aria-hidden="true"><polyline points="6 9 12 15 18 9"/></svg></button>`;

      const progTabsHtml =
        programs.length > 1
          ? `<div style="display:flex; flex-wrap:wrap; gap:6px;">${programs
              .map((p, idx) => {
                const on = idx === 0;
                return `<button type="button" data-trn-prog-idx="${idx}" style="padding:6px 10px; border-radius:8px; border:1px solid ${
                  on ? theme.accentColor : theme.borderColor
                }; background:${on ? theme.accentColor : 'transparent'}; color:${
                  on ? '#FFFFFF' : resolvedTextColor
                }; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit;">${escapeHtml(
                  p.title
                )}</button>`;
              })
              .join('')}</div>`
          : '';

      const activeDescFormatted = activeProg?.description
        ? formatRichHtmlWithSpacing(activeProg.description, 4)
        : '';

      const progHtml = activeProg
        ? `<div style="border:1px solid ${theme.borderColor}; border-radius:${innerRadius}px; padding:12px; display:flex; flex-direction:column; gap:10px;">
${indent}    <div style="display:flex; flex-direction:column; gap:4px;">
${indent}      <span data-trn-badge style="display:${
            activeProg.badge?.trim() ? 'inline-block' : 'none'
          }; align-self:flex-start; padding:2px 8px; border-radius:4px; background:${
            theme.accentColor
          }; color:#FFFFFF; font-size:10px; font-weight:700;">${escapeHtml(
            activeProg.badge?.trim() || ''
          )}</span>
${indent}      <div data-trn-title style="font-size:14px; font-weight:700; line-height:1.35;">${escapeHtml(
            activeProg.title
          )}</div>
${indent}      <div data-trn-subtitle style="display:${
            activeProg.subtitle?.trim() ? 'block' : 'none'
          }; font-size:12px; opacity:0.75; line-height:1.35;">${escapeHtml(
            activeProg.subtitle?.trim() || ''
          )}</div>
${indent}    </div>
${indent}    <div data-trn-desc style="display:${
            activeDescFormatted ? 'block' : 'none'
          }; font-size:12px; line-height:1.55; opacity:0.9;">${activeDescFormatted}</div>
${indent}    <div data-trn-price-box style="border:1px solid ${
            theme.borderColor
          }; background:${theme.accentColor}0E; border-radius:12px; padding:10px; display:${
            hasSummaryPrice ? 'flex' : 'none'
          }; flex-direction:column; gap:6px;">
${indent}      <div style="display:flex; flex-wrap:wrap; align-items:baseline; gap:8px;">
${indent}        <span data-trn-orig-price style="display:${
            activeProg.originalPrice?.trim() ? 'inline' : 'none'
          }; font-size:12px; text-decoration:line-through; opacity:0.55; font-variant-numeric:tabular-nums;">${escapeHtml(
            activeProg.originalPrice?.trim() || ''
          )}</span>
${indent}        <span data-trn-price style="display:${
            activeProg.price?.trim() ? 'inline' : 'none'
          }; font-size:16px; font-weight:800; color:${
            theme.accentColor
          }; font-variant-numeric:tabular-nums;">${escapeHtml(
            activeProg.price?.trim() || ''
          )}</span>
${indent}      </div>
${indent}      <div style="display:flex; flex-wrap:wrap; gap:6px;">
${indent}        <span data-trn-discount style="display:${
            activeProg.discountLabel?.trim() ? 'inline-flex' : 'none'
          }; align-items:center; padding:2px 8px; border-radius:6px; background:rgba(244,63,94,0.12); color:#BE123C; font-size:11px; font-weight:700;">${escapeHtml(
            activeProg.discountLabel?.trim() || ''
          )}</span>
${indent}        <span data-trn-cashback style="display:${
            activeProg.cashbackLabel?.trim() ? 'inline-flex' : 'none'
          }; align-items:center; padding:2px 8px; border-radius:6px; background:rgba(16,185,129,0.14); color:#047857; font-size:11px; font-weight:700;">${escapeHtml(
            activeProg.cashbackLabel?.trim() || ''
          )}</span>
${indent}      </div>
${indent}    </div>
${indent}  </div>`
        : '';

      const customBoxesHtml = customBoxes
        .map((cBox) => {
          const bodyHtml = formatRichHtmlWithSpacing(cBox.contentHtml, cBox.paragraphGap ?? 6);
          const boxTitle = (cBox.title ?? '').trim();
          if (!boxTitle && !bodyHtml) return '';
          const bordered = cBox.showBorder !== false;
          const wrapStyle = bordered
            ? `border:1px solid ${theme.borderColor}; border-radius:${innerRadius}px; padding:12px;`
            : `padding:4px 0;`;
          const boxColor = (cBox.textColor ?? '').trim() || resolvedTextColor;
          const boxWeight = cBox.defaultFontWeight === 'bold' ? 700 : 400;
          const boxFontStyle = cBox.defaultFontStyle === 'italic' ? 'italic' : 'normal';
          const boxLineHeight = cBox.lineHeight ?? 1.6;
          return `${indent}    <div style="${wrapStyle} display:flex; flex-direction:column; gap:6px;">${
            boxTitle
              ? `<div style="font-size:12px; font-weight:700; line-height:1.35;">${escapeHtml(
                  boxTitle
                )}</div>`
              : ''
          }${
            bodyHtml
              ? `<div style="font-size:12px; font-weight:${boxWeight}; font-style:${boxFontStyle}; color:${escapeHtml(
                  boxColor
                )}; line-height:${boxLineHeight};">${bodyHtml}</div>`
              : ''
          }</div>`;
        })
        .filter(Boolean)
        .join('\n');

      const chkHtml = checklistItems.length
        ? `<div style="border:1px solid ${theme.borderColor}; border-radius:${innerRadius}px; padding:12px; display:flex; flex-direction:column; gap:8px;">
${indent}    <div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">
${indent}      <div style="font-size:12px; font-weight:700;">${escapeHtml(checklistTitle)}</div>
${indent}      <span data-trn-chk-count style="font-size:10.5px; font-weight:600; opacity:0.7; font-variant-numeric:tabular-nums;">0/${checklistItems.length} siap</span>
${indent}    </div>
${indent}    <div style="display:flex; flex-direction:column; gap:6px;">
${checklistItems
  .map(
    (itemText, idx) =>
      `${indent}      <label style="display:flex; align-items:flex-start; gap:8px; padding:8px; border-radius:8px; border:1px solid ${theme.borderColor}; cursor:pointer;"><input type="checkbox" data-trn-chk="${idx}" style="margin-top:2px; accent-color:#059669; cursor:pointer;" /><span style="font-size:12px; line-height:1.4;">${escapeHtml(
        itemText
      )}</span></label>`
  )
  .join('\n')}
${indent}    </div>
${indent}  </div>`
        : '';

      const inputStyle = `width:100%; box-sizing:border-box; padding:7px 10px; border-radius:8px; border:1px solid ${theme.borderColor}; background:transparent; color:${resolvedTextColor}; font-size:12px; font-family:inherit; outline:none;`;
      const fieldsHtml = formFields
        .map((f) => {
          const reqMark = f.required ? ' *' : '';
          const ctrl =
            f.type === 'textarea'
              ? `<textarea rows="2" data-trn-field="${escapeHtml(
                  f.id
                )}" placeholder="${escapeHtml(
                  f.placeholder || f.label
                )}" style="${inputStyle} resize:vertical;"></textarea>`
              : `<input type="${escapeHtml(f.type)}" data-trn-field="${escapeHtml(
                  f.id
                )}" placeholder="${escapeHtml(
                  f.placeholder || f.label
                )}" style="${inputStyle}" />`;
          return `${indent}      <div style="display:flex; flex-direction:column; gap:4px;"><label style="font-size:11px; font-weight:600; opacity:0.8;">${escapeHtml(
            f.label + reqMark
          )}</label>${ctrl}</div>`;
        })
        .join('\n');

      const formHtml = `<div style="border:1px solid ${theme.borderColor}; border-radius:${innerRadius}px; padding:12px; display:flex; flex-direction:column; gap:10px;">
${indent}    <div style="font-size:12px; font-weight:700;">${escapeHtml(formTitle)}</div>
${indent}    <div style="display:flex; flex-direction:column; gap:8px;">
${fieldsHtml}
${indent}    </div>
${indent}    <a data-trn-wa href="${escapeHtml(
        initialWaHref
      )}" target="_blank" rel="noopener noreferrer" style="width:100%; box-sizing:border-box; padding:10px 16px; border-radius:12px; background:#059669; color:#FFFFFF; font-size:12px; font-weight:700; text-decoration:none; display:flex; align-items:center; justify-content:center; gap:8px;"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg><span>${escapeHtml(
        waLabel
      )}</span></a>
${indent}  </div>`;

      const drawerHtml = `<div data-trn-drawer style="display:${
        defaultExpanded ? 'flex' : 'none'
      }; flex-direction:column; gap:12px; padding-top:12px; border-top:1px solid ${
        theme.borderColor
      };">
${progTabsHtml ? `${indent}    ${progTabsHtml}\n` : ''}${
        progHtml ? `${indent}    ${progHtml}\n` : ''
      }${customBoxesHtml ? `${customBoxesHtml}\n` : ''}${
        chkHtml ? `${indent}    ${chkHtml}\n` : ''
      }${indent}    ${formHtml}
${indent}  </div>`;

      return `${indent}<div data-training-catalog style="${css}; text-align:${align}; display:flex; flex-direction:column; gap:12px;">
${indent}  <script type="application/json" data-trn-config>${cfgJson}</script>
${headerHtml ? `${indent}  ${headerHtml}\n` : ''}${
        mediaHtml ? `${indent}  ${mediaHtml}\n` : ''
      }${summaryPriceHtml ? `${indent}  ${summaryPriceHtml}\n` : ''}${
        shortDescHtml ? `${indent}  ${shortDescHtml}\n` : ''
      }${indent}  ${toggleBtnHtml}
${indent}  ${drawerHtml}
${indent}</div>`;
    }

    case 'hero_profile': {
      const c = block.content;
      const s = block.style;
      const variant = c.heroVariant ?? 'compact';
      const logoSize = Math.max(
        40,
        Math.min(140, c.heroLogoSize ?? (variant === 'banner' ? 78 : 72))
      );
      const titleSize = Math.max(
        14,
        Math.min(38, c.heroTitleSize ?? (variant === 'banner' ? 22 : 20))
      );
      const subtitleSize = Math.max(11, Math.min(22, c.heroSubtitleSize ?? 13));
      const infoSize = Math.max(10, Math.min(18, c.heroInfoSize ?? 12));
      const cardRadius = Math.max(
        0,
        Math.min(36, c.heroCardRadius ?? (variant === 'banner' ? 24 : s.borderRadius))
      );
      const statusColor = c.heroStatusColor || '#16A34A';
      const logoBg = c.heroLogoBg || '#FFEDD5';
      const logoColor = c.heroLogoColor || '#C2410C';
      const monogram =
        (c.heroLogoMonogram || c.heroTitle || 'WB').trim().slice(0, 2).toUpperCase() || 'WB';
      const fontStack =
        resolveCssFontFamily(s.fontFamily) || resolveCssFontFamily(theme.fontFamily);
      const coverFontStack = resolveCssFontFamily(c.heroCoverFontFamily) || fontStack;
      const titleWeight = s.fontWeightCss || '800';
      const heroTitle = c.heroTitle || (variant === 'banner' ? 'Warung Barokah' : 'Warung Barokah Demo');
      const pinSvg = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;" aria-hidden="true"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;
      const clockSvg = `<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;" aria-hidden="true"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>`;
      const starSvg = `<svg viewBox="0 0 24 24" width="14" height="14" fill="#FBBF24" stroke="#FBBF24" stroke-width="1.5" style="flex-shrink:0;" aria-hidden="true"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`;

      const renderAvatar = (withShadow: boolean) => {
        const avatarBg = c.heroLogoImage ? '#FFFFFF' : logoBg;
        const avatarShadow = withShadow ? 'box-shadow: 0 8px 20px rgba(15, 23, 42, 0.14);' : '';
        const inner = c.heroLogoImage
          ? `<img src="${escapeHtml(c.heroLogoImage)}" alt="${escapeHtml(
              heroTitle
            )}" referrerpolicy="no-referrer" style="width:100%; height:100%; object-fit:cover; display:block;" />`
          : `<span style="font-size:${Math.round(logoSize * 0.34)}px; font-weight:800;">${escapeHtml(
              monogram
            )}</span>`;
        return `<div style="width:${logoSize}px; height:${logoSize}px; border-radius:9999px; flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center; background-color:${avatarBg}; color:${logoColor}; border:2px solid #FFFFFF; ${avatarShadow}">${inner}</div>`;
      };

      const statusHtml =
        (variant === 'compact' ? c.heroStatusEnabled !== false : Boolean(c.heroStatusEnabled)) &&
        (c.heroStatusText || (variant === 'compact' ? 'Buka sekarang' : '')).trim()
          ? `<div style="display:inline-flex; align-items:center; gap:6px; padding:2px 10px; border-radius:9999px; background:${statusColor}16; color:${statusColor}; font-size:11px; font-weight:700; width:fit-content;"><span style="width:8px; height:8px; border-radius:9999px; background:${statusColor}; flex-shrink:0;"></span><span>${escapeHtml(
              c.heroStatusText || 'Buka sekarang'
            )}</span></div>`
          : '';

      if (variant === 'banner') {
        const coverHeight = Math.max(100, Math.min(340, c.heroCoverHeight ?? 170));
        const overlapPx = Math.max(0, Math.min(80, c.heroOverlapPx ?? 34));
        const hMargin = s.fullBleed ? '14px' : '8px';
        const cardGrad = buildLinearGradientCss(s);
        const cardBgColor =
          cardGrad
            ? s.gradientColor1 || '#EFF6FF'
            : s.backgroundColor && s.backgroundColor !== 'transparent'
            ? s.backgroundColor
            : theme.cardBg;
        const cardShadow =
          s.shadow !== 'none'
            ? shadowToCss(s.shadow, s.shadowColor)
            : '0 10px 26px rgba(15, 23, 42, 0.12)';
        const cardBorderWidth = s.borderWidth > 0 ? s.borderWidth : 1;
        const cardBorderColor = s.borderColor || theme.borderColor;
        const coverImgHtml = c.heroCoverImage
          ? `<img src="${escapeHtml(c.heroCoverImage)}" alt="${escapeHtml(
              heroTitle
            )}" referrerpolicy="no-referrer" style="width:100%; height:100%; object-fit:cover; display:block;" />`
          : `<div style="width:100%; height:100%; background:linear-gradient(135deg, #78350F 0%, #431407 50%, #0F172A 100%);"></div>`;
        const showCoverTitle =
          c.heroCoverTitleEnabled !== false &&
          c.heroCoverFontFamily !== '__none__' &&
          Boolean((c.heroCoverTitle ?? '').trim());
        const coverTitleSize = Math.max(12, Math.min(48, c.heroCoverTitleSize ?? 26));
        const coverTitleColor = sanitizeCssColor(c.heroCoverTitleColor, '#FFFFFF');
        const coverTitleHtml = showCoverTitle
          ? `<div style="position:absolute; inset:0 16px; display:flex; align-items:center; justify-content:center; text-align:center; padding-bottom:${Math.max(
              14,
              Math.round(overlapPx * 0.65)
            )}px; pointer-events:none; ${
              coverFontStack ? `font-family:${coverFontStack};` : ''
            }"><span style="color:${coverTitleColor}; font-size:${coverTitleSize}px; font-weight:700; line-height:1.18; text-shadow:0 2px 10px rgba(0,0,0,0.65);">${escapeHtml(
              c.heroCoverTitle || ''
            )}</span></div>`
          : '';
        const metaRow =
          (c.heroRating || '').trim() || (c.heroHours || '').trim()
            ? `<div style="display:flex; flex-wrap:wrap; align-items:center; gap:4px 12px; padding-top:2px; font-size:${infoSize}px; font-weight:500; opacity:0.85; font-variant-numeric:tabular-nums;">${
                (c.heroRating || '').trim()
                  ? `<span style="display:inline-flex; align-items:center; gap:4px;">${starSvg}<span>${escapeHtml(
                      c.heroRating || ''
                    )}</span></span>`
                  : ''
              }${
                (c.heroHours || '').trim()
                  ? `<span style="display:inline-flex; align-items:center; gap:4px;">${clockSvg}<span>${escapeHtml(
                      c.heroHours || ''
                    )}</span></span>`
                  : ''
              }</div>`
            : '';
        const locRow = (c.heroLocation || '').trim()
          ? `<div style="display:flex; align-items:flex-start; gap:6px; font-size:${infoSize}px; line-height:1.4; opacity:0.8;">${pinSvg.replace(
              'style="flex-shrink:0;"',
              'style="flex-shrink:0; margin-top:2px;"'
            )}<span>${escapeHtml(c.heroLocation || '')}</span></div>`
          : '';

        return `${indent}<div${hoverCls} data-jump-title="${escapeHtml(
          heroTitle.trim().toLowerCase()
        )}" style="${css}; padding: 0;">
${indent}  <div style="position:relative; width:100%; height:${coverHeight}px; overflow:hidden; background:#0F172A;">
${indent}    ${coverImgHtml}
${indent}    <div style="position:absolute; inset:0; background:linear-gradient(to top, rgba(0,0,0,0.55), rgba(0,0,0,0.20), rgba(0,0,0,0.15));"></div>
${indent}    ${coverTitleHtml}
${indent}  </div>
${indent}  <div style="position:relative; z-index:2; margin:-${overlapPx}px ${hMargin} 0 ${hMargin}; padding:18px; border-radius:${cardRadius}px; border:${cardBorderWidth}px solid ${cardBorderColor}; box-shadow:${cardShadow}; background-color:${cardBgColor};${
          cardGrad ? ` background-image:${cardGrad};` : ''
        } color:${resolvedTextColor}; display:flex; align-items:flex-start; gap:14px; text-align:left;">
${indent}    ${renderAvatar(true)}
${indent}    <div style="min-width:0; flex:1; display:flex; flex-direction:column; gap:6px;">
${indent}      ${statusHtml}
${indent}      <h1 style="margin:0; font-size:${titleSize}px; line-height:1.2; font-weight:${titleWeight}; letter-spacing:-0.02em;">${escapeHtml(
          heroTitle
        )}</h1>
${indent}      ${
          (c.heroSubtitle || '').trim()
            ? `<p style="margin:0; font-size:${subtitleSize}px; line-height:1.4; opacity:0.8;">${escapeHtml(
                c.heroSubtitle || ''
              )}</p>`
            : ''
        }
${indent}      ${metaRow}
${indent}      ${locRow}
${indent}    </div>
${indent}  </div>
${indent}</div>`;
      }

      const compactLocRow =
        (c.heroLocation || '').trim() || (c.heroHours || '').trim()
          ? `<div style="display:flex; flex-wrap:wrap; align-items:center; gap:4px 12px; padding-top:2px; font-size:${infoSize}px; opacity:0.75; font-variant-numeric:tabular-nums;">${
              (c.heroLocation || '').trim()
                ? `<span style="display:inline-flex; align-items:center; gap:4px;">${pinSvg}<span>${escapeHtml(
                    c.heroLocation || ''
                  )}</span></span>`
                : ''
            }${
              (c.heroHours || '').trim()
                ? `<span style="display:inline-flex; align-items:center; gap:4px;">${clockSvg}<span>${escapeHtml(
                    c.heroHours || ''
                  )}</span></span>`
                : ''
            }</div>`
          : '';

      return `${indent}<div${hoverCls} data-jump-title="${escapeHtml(
        heroTitle.trim().toLowerCase()
      )}" style="${css}; border-radius:${cardRadius}px; padding:16px; display:flex; align-items:center; gap:14px; text-align:left;">
${indent}  ${renderAvatar(false)}
${indent}  <div style="min-width:0; flex:1; display:flex; flex-direction:column; gap:4px;">
${indent}    ${statusHtml}
${indent}    <h1 style="margin:0; font-size:${titleSize}px; line-height:1.2; font-weight:${titleWeight}; letter-spacing:-0.02em;">${escapeHtml(
        heroTitle
      )}</h1>
${indent}    ${
        (c.heroSubtitle || '').trim()
          ? `<p style="margin:0; font-size:${subtitleSize}px; line-height:1.4; opacity:0.8;">${escapeHtml(
              c.heroSubtitle || ''
            )}</p>`
          : ''
      }
${indent}    ${compactLocRow}
${indent}  </div>
${indent}</div>`;
    }

    case 'category_tabs': {
      const c = block.content;
      const items = c.categoryButtons ?? [];
      if (items.length === 0) return '';
      const mode = c.categoryScrollMode ?? 'vertical';
      const maxHeight = Math.max(48, Math.min(320, c.categoryMaxHeight ?? 112));
      const activeBg = c.categoryActiveBg || theme.accentColor || '#EA580C';
      const activeText = c.categoryActiveText || '#FFFFFF';
      const inactiveBg = c.categoryInactiveBg || '#F1F5F9';
      const inactiveText = c.categoryInactiveText || '#334155';
      const radius = c.categoryRadius ?? 9999;
      const fontSize = Math.max(10, Math.min(20, c.categoryFontSize ?? 13));
      const padX = Math.max(8, Math.min(32, c.categoryButtonPaddingX ?? 16));
      const padY = Math.max(4, Math.min(18, c.categoryButtonPaddingY ?? 8));
      const gap = Math.max(4, Math.min(20, c.categoryGap ?? 8));
      const weight = block.style.fontWeightCss || '700';
      const justify =
        mode === 'horizontal'
          ? 'flex-start'
          : block.style.align === 'center'
          ? 'center'
          : block.style.align === 'right'
          ? 'flex-end'
          : 'flex-start';
      const activeId = c.categoryActiveId ?? items[0]?.id ?? '';
      const modeCss =
        mode === 'vertical'
          ? `flex-wrap:wrap; max-height:${maxHeight}px; overflow-y:auto; padding-right:2px; -webkit-overflow-scrolling:touch;`
          : mode === 'horizontal'
          ? 'flex-wrap:nowrap; overflow-x:auto; padding-bottom:4px; scroll-snap-type:x proximity; -webkit-overflow-scrolling:touch;'
          : 'flex-wrap:wrap;';

      const btnsHtml = items
        .map((btn) => {
          const isOn = btn.id === activeId;
          const targetHeading = (btn.targetTitle || btn.label || '').trim().toLowerCase();
          return `${indent}  <button type="button" data-cat-jump-btn="${escapeHtml(
            btn.id
          )}" data-cat-target="${escapeHtml(
            targetHeading
          )}" style="flex-shrink:0; white-space:nowrap; border:0; cursor:pointer; font-family:inherit; border-radius:${radius}px; font-size:${fontSize}px; font-weight:${weight}; padding:${padY}px ${padX}px; background-color:${
            isOn ? activeBg : inactiveBg
          }; color:${isOn ? activeText : inactiveText}; transition:all 0.18s ease;">${escapeHtml(
            btn.label
          )}</button>`;
        })
        .join('\n');

      return `${indent}<div data-cat-jump data-cat-active-bg="${escapeHtml(
        activeBg
      )}" data-cat-active-text="${escapeHtml(activeText)}" data-cat-inactive-bg="${escapeHtml(
        inactiveBg
      )}" data-cat-inactive-text="${escapeHtml(
        inactiveText
      )}" style="${css}; display:flex; align-items:center; justify-content:${justify}; gap:${gap}px; ${modeCss}">
${btnsHtml}
${indent}</div>`;
    }

    case 'fnb_catalog': {
      const c = block.content;
      const items = c.fnbItems ?? [];
      const accent = c.fnbAccentColor || theme.accentColor || '#EA580C';
      const imgSize = Math.max(52, Math.min(130, c.fnbItemImageSize ?? 80));
      const titleSize = Math.max(12, Math.min(24, c.fnbItemTitleSize ?? block.style.fontSize ?? 15));
      const descSize = Math.max(10, Math.min(18, c.fnbItemDescSize ?? 12));
      const showCats = Boolean(c.fnbShowCategories);
      const showSearch = c.fnbShowSearch !== false;
      const groupByCat = c.fnbGroupByCategory !== false;
      const searchPh = c.fnbSearchPlaceholder || 'Cari makanan dan minuman...';

      const cats: string[] = [];
      for (const it of items) {
        const cat = (it.category || 'Menu').trim();
        if (cat && !cats.includes(cat)) cats.push(cat);
      }

      const catBarHtml =
        showCats && cats.length > 0
          ? `<div style="display:flex; align-items:center; gap:8px; overflow-x:auto; padding-bottom:4px;">${['Semua', ...cats]
              .map((cat, idx) => {
                const on = idx === 0;
                return `<button type="button" data-fnb-cat="${escapeHtml(
                  cat.toLowerCase()
                )}" style="padding:6px 14px; border-radius:9999px; border:0; font-size:12px; font-weight:700; cursor:pointer; flex-shrink:0; font-family:inherit; background:${
                  on ? accent : '#F1F5F9'
                }; color:${on ? '#FFFFFF' : '#334155'};">${escapeHtml(cat)}</button>`;
              })
              .join('')}</div>`
          : '';

      const searchHtml = showSearch
        ? `<div style="display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:16px; border:1px solid ${theme.borderColor}; background:${theme.cardBg}; box-shadow:0 1px 2px rgba(15,23,42,0.04);"><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#94A3B8" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;" aria-hidden="true"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg><input type="search" data-fnb-search placeholder="${escapeHtml(
            searchPh
          )}" style="width:100%; border:0; outline:none; background:transparent; color:${theme.textColor}; font-size:12px; font-family:inherit;" /></div>`
        : '';

      const groups: { category: string; items: typeof items }[] = [];
      if (!groupByCat) {
        groups.push({ category: '', items });
      } else {
        for (const it of items) {
          const cat = (it.category || 'Menu').trim() || 'Menu';
          let g = groups.find((x) => x.category.toLowerCase() === cat.toLowerCase());
          if (!g) {
            g = { category: cat, items: [] };
            groups.push(g);
          }
          g.items.push(it);
        }
      }

      const sectionsHtml = groups
        .map((sec) => {
          const headingHtml = sec.category
            ? `<h3 data-jump-title="${escapeHtml(
                sec.category.toLowerCase()
              )}" style="margin:0; padding-top:4px; font-size:16px; font-weight:800; letter-spacing:-0.01em; color:${
                theme.textColor
              };">${escapeHtml(sec.category)}</h3>`
            : '';

          const cardsHtml = sec.items
            .map((item) => {
              const mono =
                (item.monogram || item.title || 'MN').trim().slice(0, 2).toUpperCase() || 'MN';
              const mediaHtml = item.image
                ? `<img src="${escapeHtml(item.image)}" alt="${escapeHtml(
                    item.title
                  )}" referrerpolicy="no-referrer" style="width:100%; height:100%; object-fit:cover; display:block;" />`
                : `<span style="font-size:${Math.round(imgSize * 0.24)}px; font-weight:800;">${escapeHtml(
                    mono
                  )}</span>`;
              const badgeHtml = (item.badge || '').trim()
                ? `<span style="display:inline-block; padding:2px 8px; border-radius:9999px; background:#F1F5F9; color:#334155; font-size:10px; font-weight:700; width:fit-content;">${escapeHtml(
                    (item.badge || '').trim()
                  )}</span>`
                : '';
              const descHtml = (item.description || '').trim()
                ? `<p style="margin:0; font-size:${descSize}px; line-height:1.4; opacity:0.7;">${escapeHtml(
                    item.description || ''
                  )}</p>`
                : '';
              const searchHaystack = `${item.title} ${item.description || ''} ${
                item.category || ''
              }`.toLowerCase();

              return `${indent}      <div data-fnb-item="${escapeHtml(
                item.id
              )}" data-fnb-cat-val="${escapeHtml(
                (item.category || 'Menu').trim().toLowerCase()
              )}" data-fnb-haystack="${escapeHtml(
                searchHaystack
              )}" style="padding:12px; border-radius:16px; border:1px solid ${
                theme.borderColor
              }; background:${theme.cardBg}; color:${
                theme.textColor
              }; box-shadow:0 1px 2px rgba(15,23,42,0.04); display:flex; align-items:stretch; gap:12px;">
${indent}        <div style="width:${imgSize}px; height:${imgSize}px; border-radius:12px; flex-shrink:0; overflow:hidden; display:flex; align-items:center; justify-content:center; align-self:center; background:${
                item.image ? '#F1F5F9' : item.monogramBg || '#FFEDD5'
              }; color:${item.monogramColor || accent};">${mediaHtml}</div>
${indent}        <div style="min-width:0; flex:1; display:flex; flex-direction:column; justify-content:space-between; gap:8px;">
${indent}          <div style="display:flex; flex-direction:column; gap:4px;">
${indent}            ${badgeHtml}
${indent}            <div style="font-size:${titleSize}px; line-height:1.25; font-weight:700;">${escapeHtml(
                item.title
              )}</div>
${indent}            ${descHtml}
${indent}          </div>
${indent}          <div style="display:flex; align-items:center; justify-content:space-between; gap:8px; padding-top:2px;">
${indent}            <div style="font-size:14px; font-weight:800; color:${accent}; font-variant-numeric:tabular-nums;">${escapeHtml(
                item.price || 'Rp 0'
              )}</div>
${indent}            <div style="flex-shrink:0;">
${indent}              <button type="button" data-fnb-add="${escapeHtml(block.id)}::${escapeHtml(
                item.id
              )}" style="padding:6px 14px; border-radius:9999px; border:1px solid ${accent}38; background:${accent}14; color:${accent}; font-size:12px; font-weight:700; cursor:pointer; font-family:inherit;">Tambah</button>
${indent}              <div data-fnb-stepper="${escapeHtml(block.id)}::${escapeHtml(
                item.id
              )}" style="display:none; align-items:center; gap:8px; padding:4px; border-radius:9999px; background:${accent}16;">
${indent}                <button type="button" data-fnb-dec="${escapeHtml(
                block.id
              )}::${escapeHtml(
                item.id
              )}" aria-label="Kurangi" style="width:24px; height:24px; border-radius:9999px; border:0; background:#FFFFFF; color:${accent}; font-size:14px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center; box-shadow:0 1px 2px rgba(0,0,0,0.08);">-</button>
${indent}                <span data-fnb-qty="${escapeHtml(block.id)}::${escapeHtml(
                item.id
              )}" style="min-width:16px; text-align:center; font-size:12px; font-weight:800; font-variant-numeric:tabular-nums;">0</span>
${indent}                <button type="button" data-fnb-inc="${escapeHtml(
                block.id
              )}::${escapeHtml(
                item.id
              )}" aria-label="Tambah" style="width:24px; height:24px; border-radius:9999px; border:0; background:${accent}; color:#FFFFFF; font-size:14px; font-weight:700; cursor:pointer; display:flex; align-items:center; justify-content:center;">+</button>
${indent}              </div>
${indent}            </div>
${indent}          </div>
${indent}        </div>
${indent}      </div>`;
            })
            .join('\n');

          return `${indent}    <div data-fnb-section style="display:flex; flex-direction:column; gap:10px;">
${headingHtml ? `${indent}      ${headingHtml}\n` : ''}${cardsHtml}
${indent}    </div>`;
        })
        .join('\n');

      return `${indent}<div data-fnb-catalog="${escapeHtml(
        block.id
      )}" data-fnb-accent="${escapeHtml(
        accent
      )}" style="${css}; display:flex; flex-direction:column; gap:14px; text-align:left;">
${catBarHtml ? `${indent}  ${catBarHtml}\n` : ''}${
        searchHtml ? `${indent}  ${searchHtml}\n` : ''
      }${indent}  <div data-fnb-sections style="display:flex; flex-direction:column; gap:16px;">
${sectionsHtml}
${indent}  </div>
${indent}  <div data-fnb-empty style="display:none; padding:24px; border-radius:16px; border:1px solid ${theme.borderColor}; background:${theme.cardBg}; text-align:center; font-size:12px; opacity:0.7;">Menu yang dicari tidak ditemukan.</div>
${indent}</div>`;
    }
  }
}

export interface ExportedCatalogConfig {
  productType: CatalogProductType;
  detailEnabled: boolean;
  cartEnabled: boolean;
  whatsappNumber: string;
  storeName: string;
  whatsappIntro: string;
  askCustomerInfo: boolean;
  customerFields: CatalogCustomerField[];
  shippingEnabled: boolean;
  shippingOptions: CatalogShippingOptionConfig[];
  pickupNote: string;
  shippingNote: string;
  items: NonNullable<BuilderBlock['content']['catalogItems']>;
}

export function collectCatalogData(
  blocks: BuilderBlock[],
  out: Record<string, ExportedCatalogConfig>
) {
  blocks.forEach((blk) => {
    if (blk.type === 'catalog') {
      out[blk.id] = {
        productType: blk.content.catalogProductType ?? 'physical',
        detailEnabled: blk.content.catalogDetailEnabled ?? true,
        cartEnabled: blk.content.catalogCartEnabled ?? true,
        whatsappNumber: blk.content.catalogWhatsappNumber ?? '6281234567890',
        storeName: blk.content.catalogStoreName ?? '',
        whatsappIntro:
          blk.content.catalogWhatsappIntro ?? 'Halo, saya ingin memesan produk berikut:',
        askCustomerInfo: blk.content.catalogAskCustomerInfo ?? true,
        customerFields: resolveCatalogCustomerFields(blk.content),
        shippingEnabled: blk.content.catalogShippingEnabled ?? true,
        shippingOptions: resolveCatalogShippingOptions(blk.content),
        pickupNote: blk.content.catalogPickupNote ?? '',
        shippingNote:
          blk.content.catalogShippingNote?.trim() ||
          'Biaya makanan / pesanan tidak termasuk biaya kirim (kurir).',
        items: blk.content.catalogItems ?? [],
      };
    } else if (blk.type === 'fnb_catalog') {
      out[blk.id] = {
        productType: 'physical',
        detailEnabled: false,
        cartEnabled: true,
        whatsappNumber: blk.content.catalogWhatsappNumber ?? '6281234567890',
        storeName: blk.content.catalogStoreName ?? '',
        whatsappIntro:
          blk.content.catalogWhatsappIntro ?? 'Halo, saya ingin memesan menu berikut:',
        askCustomerInfo: blk.content.catalogAskCustomerInfo ?? true,
        customerFields: resolveCatalogCustomerFields({
          catalogProductType: 'physical',
          catalogCustomerFields: blk.content.catalogCustomerFields,
        }),
        shippingEnabled: blk.content.catalogShippingEnabled ?? true,
        shippingOptions: resolveCatalogShippingOptions(blk.content),
        pickupNote: '',
        shippingNote: 'Biaya makanan / pesanan tidak termasuk biaya kirim (kurir).',
        items: (blk.content.fnbItems ?? []).map((it) => ({
          id: it.id,
          title: it.title,
          subtitle: it.category || '',
          price: it.price,
          unitSold: 0,
          image: it.image || '',
          url: '#',
          ctaLabel: 'Tambah',
          badge: it.badge,
          description: it.description,
          productType: 'physical' as CatalogProductType,
        })),
      };
    }
    if (blk.children?.length) {
      collectCatalogData(blk.children, out);
    }
  });
}
