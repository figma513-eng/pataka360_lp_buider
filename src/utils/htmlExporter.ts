import type { BottomNavbarItem, BuilderBlock, BuilderProject } from '../types/builder.ts';
import { renderButtonIconSvgString, resolveButtonIcon } from './buttonIcons.ts';
import { sanitizeExternalUrl } from './urlHelpers.ts';
import { extractYouTubeId } from './videoHelpers.ts';
import { GOSEND_DEFAULT_CHECKLISTS, normalizeWhatsappNumber } from './cartHelpers.ts';
import {
  findFallbackShareImageFromBlocks,
  resolveProjectAds,
  resolveProjectPublishing,
} from './publishingHelpers.ts';
import { resolveBottomNavbar, resolveNavbarMetrics } from '../data/presets.ts';
import {
  buildGoogleFontsHref,
  collectProjectFontIds,
  resolveCssFontFamily,
} from './fontHelpers.ts';
import {
  type ExportedCatalogConfig,
  collectCatalogData,
  escapeHtml,
  renderBlockHtml,
  resolveBlockTextColor,
  resolveShadowSizePx,
  shadowToCss,
} from './exporterBlocks.ts';
import { resolveProjectFloatingCartConfig } from './universalLayerHelpers.ts';
import { resolveWhatsappCenter } from './whatsappBuilder.ts';
import { buildResponsiveBlockCssRules } from './responsiveStyle.ts';

export { extractYouTubeId, resolveBlockTextColor, resolveShadowSizePx, shadowToCss };



function resolveAbsoluteShareUrl(rawUrl: string | undefined, origin?: string): string {
  const val = (rawUrl || '').trim();
  if (!val || /^data:/i.test(val)) return '';
  if (/^https?:\/\//i.test(val)) return val;
  if (val.startsWith('/')) {
    const cleanOrigin = (origin || '').trim().replace(/\/+$/, '');
    return cleanOrigin ? `${cleanOrigin}${val}` : val;
  }
  return '';
}

function inferImageMimeType(url: string): string {
  const clean = url.split('?')[0]?.split('#')[0]?.toLowerCase() ?? '';
  if (clean.endsWith('.jpg') || clean.endsWith('.jpeg')) return 'image/jpeg';
  if (clean.endsWith('.png')) return 'image/png';
  if (clean.endsWith('.webp')) return 'image/webp';
  if (clean.endsWith('.gif')) return 'image/gif';
  return '';
}

export function generateProjectHtml(
  project: BuilderProject,
  exportOpts?: { projectId?: string; publicOrigin?: string; canonicalUrl?: string }
): string {
  const adv = project.advanceOptions;
  const pub = resolveProjectPublishing(project);
  const ads = resolveProjectAds(project);
  const pageTitle = pub.seoTitle?.trim() || project.title || 'Halaman Usaha';
  const pageDescription =
    pub.seoDescription?.trim() || `Katalog dan layanan resmi ${project.title}.`;
  const effectiveOrigin =
    (exportOpts?.publicOrigin || '').trim().replace(/\/+$/, '') ||
    (pub.useCustomDomain && pub.customDomain ? `https://${pub.customDomain}` : '');
  const canonicalUrl =
    (exportOpts?.canonicalUrl || '').trim() ||
    (pub.useCustomDomain && pub.customDomain
      ? `https://${pub.customDomain}`
      : effectiveOrigin
      ? `${effectiveOrigin}/${pub.slug}`
      : '');
  const pageSiteName = pub.seoSiteName?.trim() || project.title || 'Halaman Usaha';
  const rawShareImage =
    pub.seoImage?.trim() || findFallbackShareImageFromBlocks(project.blocks) || '';
  const resolvedOgImage = resolveAbsoluteShareUrl(rawShareImage, effectiveOrigin);
  const ogImageAlt = pub.seoImageAlt?.trim() || pageTitle;
  const ogImageMime = resolvedOgImage ? inferImageMimeType(resolvedOgImage) : '';
  const twitterCardType = resolvedOgImage ? 'summary_large_image' : 'summary';

  const canonicalTag = canonicalUrl
    ? `\n  <link rel="canonical" href="${escapeHtml(canonicalUrl)}" />\n  <meta property="og:url" content="${escapeHtml(canonicalUrl)}" />`
    : '';
  const ogImageTags = resolvedOgImage
    ? `\n  <meta property="og:image" content="${escapeHtml(resolvedOgImage)}" />${
        resolvedOgImage.startsWith('https://')
          ? `\n  <meta property="og:image:secure_url" content="${escapeHtml(resolvedOgImage)}" />`
          : ''
      }${
        ogImageMime
          ? `\n  <meta property="og:image:type" content="${escapeHtml(ogImageMime)}" />`
          : ''
      }\n  <meta property="og:image:width" content="1200" />\n  <meta property="og:image:height" content="630" />\n  <meta property="og:image:alt" content="${escapeHtml(ogImageAlt)}" />`
    : '';
  const twitterImageTags = resolvedOgImage
    ? `\n  <meta name="twitter:image" content="${escapeHtml(resolvedOgImage)}" />\n  <meta name="twitter:image:alt" content="${escapeHtml(ogImageAlt)}" />`
    : '';
  const structuredDataObj: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'WebPage',
    name: pageTitle,
    description: pageDescription,
    ...(canonicalUrl ? { url: canonicalUrl } : {}),
    ...(resolvedOgImage ? { image: resolvedOgImage } : {}),
  };
  const structuredDataJson = JSON.stringify(structuredDataObj).replace(/</g, '\\u003c');

  const cleanMetaPixel = ads.metaPixelId.replace(/[^0-9]/g, '');
  const cleanTiktokPixel = ads.tiktokPixelId.replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanGoogleTag = ads.googleTagId.replace(/[^a-zA-Z0-9_-]/g, '');
  const cleanGoogleConvLabel = (ads.googleAdsConversionLabel ?? '').replace(/[^a-zA-Z0-9_/-]/g, '');
  const cleanGtmId = (ads.gtmContainerId ?? '').replace(/[^a-zA-Z0-9_-]/g, '');

  const metaPixelSnippet = cleanMetaPixel
    ? `
  <!-- Meta Pixel Code -->
  <script>
    !function(f,b,e,v,n,t,s){if(f.fbq)return;n=f.fbq=function(){n.callMethod?
    n.callMethod.apply(n,arguments):n.queue.push(arguments)};if(!f._fbq)f._fbq=n;
    n.push=n;n.loaded=!0;n.version='2.0';n.queue=[];t=b.createElement(e);t.async=!0;
    t.src=v;s=b.getElementsByTagName(e)[0];s.parentNode.insertBefore(t,s)}(window,
    document,'script','https://connect.facebook.net/en_US/fbevents.js');
    fbq('init', '${escapeHtml(cleanMetaPixel)}');
    fbq('track', 'PageView');
  </script>`
    : '';

  const tiktokPixelSnippet = cleanTiktokPixel
    ? `
  <!-- TikTok Pixel Code -->
  <script>
    !function(w,d,t){w.TiktokAnalyticsObject=t;var ttq=w[t]=w[t]||[];
    ttq.methods=["page","track","identify","instances","debug","on","off","once","ready","alias","group","enableCookie","disableCookie","holdConsent","revokeConsent","grantConsent"];
    ttq.setAndDefer=function(t,e){t[e]=function(){t.push([e].concat(Array.prototype.slice.call(arguments,0)))}};
    for(var i=0;i<ttq.methods.length;i++)ttq.setAndDefer(ttq,ttq.methods[i]);
    ttq.instance=function(t){for(var e=ttq._i[t]||[],n=0;n<ttq.methods.length;n++)ttq.setAndDefer(e,ttq.methods[n]);return e};
    ttq.load=function(e,n){var r="https://analytics.tiktok.com/i18n/pixel/events.js",o=n&&n.partner;
    ttq._i=ttq._i||{};ttq._i[e]=[];ttq._i[e]._u=r;ttq._t=ttq._t||{};ttq._t[e]=+new Date;
    ttq._o=ttq._o||{};ttq._o[e]=n||{};var a=document.createElement("script");a.type="text/javascript";a.async=!0;
    a.src=r+"?sdkid="+e+"&lib="+t;var s=document.getElementsByTagName("script")[0];s.parentNode.insertBefore(a,s)};
    ttq.load('${escapeHtml(cleanTiktokPixel)}');
    ttq.page();
    }(window,document,'ttq');
  </script>`
    : '';

  const googleTagSnippet = cleanGoogleTag
    ? `
  <!-- Google Tag (GA4 / Google Ads) -->
  <script async src="https://www.googletagmanager.com/gtag/js?id=${escapeHtml(cleanGoogleTag)}"></script>
  <script>
    window.dataLayer = window.dataLayer || [];
    function gtag(){dataLayer.push(arguments);}
    gtag('js', new Date());
    gtag('config', '${escapeHtml(cleanGoogleTag)}');
  </script>`
    : '';

  const gtmSnippet = cleanGtmId
    ? `
  <!-- Google Tag Manager -->
  <script>(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
  var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';j.async=true;
  j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
  })(window,document,'script','dataLayer','${escapeHtml(cleanGtmId)}');</script>`
    : '';

  const bottomNavbar = resolveBottomNavbar(project);
  const enabledNavItems = bottomNavbar.items.filter((it) => it.enabled !== false);
  const showBottomNavbar = bottomNavbar.enabled && enabledNavItems.length > 0;
  const navMetrics = resolveNavbarMetrics(bottomNavbar);
  const isRoundedOrFloatingNav = navMetrics.floating || navMetrics.borderRadius > 0;
  const navReservedHeight = showBottomNavbar
    ? navMetrics.bottomOffset +
      navMetrics.barPaddingY * 2 +
      navMetrics.iconSize +
      navMetrics.labelSize +
      24
    : 0;

  const waAddonPhone = normalizeWhatsappNumber(ads.waAddonNumber);
  const waAddonMsg = (ads.waAddonGreeting ?? '').trim() || `Halo ${project.title}, saya tertarik dengan penawaran di halaman ini.`;
  const waAddonHref = `https://wa.me/${waAddonPhone}?text=${encodeURIComponent(waAddonMsg)}`;
  const waAddonHtml = ads.waAddonEnabled
    ? `
  <a id="lynk-wa-addon-btn" href="${escapeHtml(waAddonHref)}" target="_blank" rel="noopener noreferrer" data-lynk-wa-source="Add-On WA Meta" style="position: fixed; right: max(16px, calc((100vw - 576px) / 2 + 16px)); bottom: ${
        showBottomNavbar ? `${navReservedHeight + 16}px` : '18px'
      }; z-index: 8900; display: inline-flex; align-items: center; gap: 8px; padding: 10px 16px; border-radius: 9999px; background: #059669; color: #FFFFFF; text-decoration: none; font-size: 13px; font-weight: 700; box-shadow: 0 10px 24px rgba(5, 150, 105, 0.35);">
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
    <span>Chat WhatsApp</span>
  </a>`
    : '';

  const catalogMap: Record<string, ExportedCatalogConfig> = {};
  collectCatalogData(project.blocks, catalogMap);
  bottomNavbar.items.forEach((navItem) => {
    if (navItem.children?.length) {
      collectCatalogData(navItem.children, catalogMap);
    }
  });
  const subPages = Array.isArray(project.pages) ? project.pages : [];
  subPages.forEach((pg) => {
    if (pg.blocks?.length) {
      collectCatalogData(pg.blocks, catalogMap);
    }
  });

  const bottomNavbarSheetsHtml = showBottomNavbar
    ? enabledNavItems
        .filter((it) => it.action === 'sheet')
        .map((it) => {
          const safeId = it.id.replace(/[^a-zA-Z0-9_-]/g, '');
          const sheetId = `sheet_nav_${safeId}`;
          const sheetTitle = it.sheetTitle?.trim() || it.label || 'Info';
          const sheetPos = it.sheetPosition ?? 'bottom';
          const inner = (it.children ?? [])
            .map((child) => renderBlockHtml(child, project.theme, adv, '        ', project.theme.textColor))
            .filter(Boolean)
            .join('\n');
          return `  <div id="${sheetId}" data-bottom-sheet data-sheet-pos="${sheetPos}" class="lynk-sheet-backdrop lynk-sheet-pos-${sheetPos}" role="dialog" aria-modal="true" aria-label="${escapeHtml(
            sheetTitle
          )}">
    <div class="lynk-sheet-panel" style="background-color: ${project.theme.cardBg}; color: ${
            project.theme.textColor
          }; border-top: 1px solid ${project.theme.borderColor};">
      <div class="lynk-sheet-header" style="border-bottom: 1px solid ${project.theme.borderColor};">
        <div class="lynk-sheet-handle"></div>
        <div style="width: 100%; display: flex; align-items: center; justify-content: space-between; gap: 8px;">
          <div style="font-size: 15px; font-weight: 700; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(
            sheetTitle
          )}</div>
          <button type="button" data-sheet-close aria-label="Tutup Bottom Sheet" style="width: 30px; height: 30px; border-radius: 9999px; border: 0; background: rgba(148, 163, 184, 0.16); color: inherit; font-size: 14px; font-weight: 700; cursor: pointer; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">&#10005;</button>
        </div>
      </div>
      <div class="lynk-sheet-body">
${inner || `        <div style="padding: 28px 0; text-align: center; font-size: 12px; opacity: 0.65;">Belum ada konten di dalam Bottom Sheet.</div>`}
      </div>
    </div>
  </div>`;
        })
        .join('\n')
    : '';

  const bottomNavbarHtml = showBottomNavbar
    ? `
  <nav class="lynk-bottom-nav" aria-label="Navigasi Bawah" style="width: min(${
      navMetrics.barWidthPercent
    }%, ${Math.round((576 * navMetrics.barWidthPercent) / 100)}px); left: 50%; transform: translateX(-50%); bottom: ${
      navMetrics.bottomOffset
    }px; padding: ${navMetrics.barPaddingY}px 8px calc(${
      navMetrics.barPaddingY
    }px + env(safe-area-inset-bottom, 0px)) 8px; border-radius: ${
      navMetrics.borderRadius
    }px; background-color: ${bottomNavbar.barBg}; color: ${bottomNavbar.textColor}; ${
      isRoundedOrFloatingNav
        ? `border: 1px solid ${bottomNavbar.borderColor};`
        : `border-top: 1px solid ${bottomNavbar.borderColor};`
    } box-shadow: ${navMetrics.shadowCss};">
    <div class="lynk-bottom-nav-grid" style="grid-template-columns: repeat(${
      enabledNavItems.length
    }, minmax(0, 1fr));">
${enabledNavItems
  .map((item) => {
    const safeId = item.id.replace(/[^a-zA-Z0-9_-]/g, '');
    const sheetId = `sheet_nav_${safeId}`;
    const isCenterHome =
      bottomNavbar.centerStyle === 'elevated' &&
      (item.action === 'scroll_top' || item.id === 'nav_home');
    const iconId = resolveButtonIcon(item.icon, item.label);
    const glyphId = iconId === 'none' ? 'info' : iconId;
    const glyphSize = isCenterHome ? navMetrics.fabIconSize : navMetrics.iconSize;
    const iconSvg =
      renderButtonIconSvgString(glyphId, glyphSize, item.iconUrl) ||
      `<svg viewBox="0 0 24 24" width="${glyphSize}" height="${glyphSize}" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="9"/></svg>`;
    const iconWrapHtml = isCenterHome
      ? `<span class="lynk-bottom-nav-home-fab" style="background-color: ${bottomNavbar.accentColor}; border-color: ${bottomNavbar.barBg}; width: ${navMetrics.fabBoxSize}px; height: ${navMetrics.fabBoxSize}px; margin-top: ${navMetrics.fabMarginTop}px;">${iconSvg}</span>`
      : `<span class="lynk-bottom-nav-icon" style="width: ${Math.max(
          20,
          navMetrics.iconSize + 6
        )}px; height: ${Math.max(20, navMetrics.iconSize + 6)}px;">${iconSvg}</span>`;
    const labelColorStyle = isCenterHome
      ? `style="font-size: ${navMetrics.labelSize}px; color: ${bottomNavbar.accentColor}; font-weight: 700;"`
      : `style="font-size: ${navMetrics.labelSize}px;"`;
    if (item.action === 'link') {
      const safeHref = escapeHtml(sanitizeExternalUrl(item.linkUrl, '#'));
      return `      <a href="${safeHref}" target="_blank" rel="noopener noreferrer" class="lynk-bottom-nav-btn" style="text-decoration: none;">
        ${iconWrapHtml}
        <span class="lynk-bottom-nav-label" ${labelColorStyle}>${escapeHtml(
        item.label || 'Menu'
      )}</span>
      </a>`;
    }
    const triggerAttr =
      item.action === 'scroll_top' ? 'data-nav-home="1"' : `data-sheet-open="${sheetId}"`;
    return `      <button type="button" class="lynk-bottom-nav-btn" ${triggerAttr}>
        ${iconWrapHtml}
        <span class="lynk-bottom-nav-label" ${labelColorStyle}>${escapeHtml(
      item.label || 'Menu'
    )}</span>
      </button>`;
  })
  .join('\n')}
    </div>
  </nav>`
    : '';

  const resolvedProjectFloat = resolveProjectFloatingCartConfig(
    project.blocks,
    bottomNavbar.items,
    subPages
  );
  const fnbFloatConfig = resolvedProjectFloat
    ? {
        position: resolvedProjectFloat.position,
        offsetY: Math.max(0, Math.min(120, resolvedProjectFloat.offsetY ?? 16)),
        bgColor: resolvedProjectFloat.bg || project.theme.accentColor || '#059669',
        actionLabel: resolvedProjectFloat.label || 'Lihat Keranjang',
        alwaysShowWhenEmpty: Boolean(resolvedProjectFloat.alwaysShowWhenEmpty),
      }
    : null;
  const googleFontsHref = buildGoogleFontsHref(collectProjectFontIds(project));
  const bodyFontStack =
    resolveCssFontFamily(project.theme.fontFamily) ||
    "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif";

  const resolvedWaCenter = resolveWhatsappCenter(project);

  const serializedStore = JSON.stringify({
    projectId: exportOpts?.projectId || '',
    projectTitle: project.title,
    slug: pub.slug,
    showUnitSold: adv.showUnitSold,
    navReservedHeight: showBottomNavbar ? navReservedHeight : 0,
    fnbFloatConfig,
    whatsappCenter: resolvedWaCenter,
    ads: {
      metaPixelId: cleanMetaPixel,
      metaWaEvent: ads.metaWaEvent || 'Lead',
      tiktokPixelId: cleanTiktokPixel,
      googleTagId: cleanGoogleTag,
      googleAdsConversionLabel: cleanGoogleConvLabel,
      appendAdAttributionToWa: ads.appendAdAttributionToWa,
    },
    theme: {
      canvasBg: project.theme.canvasBg,
      cardBg: project.theme.cardBg,
      textColor: project.theme.textColor,
      accentColor: project.theme.accentColor,
      borderColor: project.theme.borderColor,
    },
    catalogs: catalogMap,
  }).replace(/</g, '\\u003c');

  const bodyBlocks = project.blocks
    .map((block) => {
      const rendered = renderBlockHtml(block, project.theme, adv, '      ', undefined, resolvedWaCenter);
      if (!rendered) return '';
      return `    <div class="${block.style.fullBleed ? 'page-full' : 'page-pad'}">\n${rendered}\n    </div>`;
    })
    .filter(Boolean)
    .join('\n');

  const allResponsiveSourceBlocks: BuilderBlock[] = [
    ...project.blocks,
    ...subPages.flatMap((pg) => pg.blocks ?? []),
    ...bottomNavbar.items.flatMap((it) => it.children ?? []),
  ];
  const responsiveCssRules = buildResponsiveBlockCssRules(allResponsiveSourceBlocks);

  const subPagesHtml = subPages
    .map((pg) => {
      const pgBlocksHtml = (pg.blocks ?? [])
        .map((block) => {
          const rendered = renderBlockHtml(block, project.theme, adv, '      ', undefined, resolvedWaCenter);
          if (!rendered) return '';
          return `    <div class="${block.style.fullBleed ? 'page-full' : 'page-pad'}">\n${rendered}\n    </div>`;
        })
        .filter(Boolean)
        .join('\n');
      const backBarHtml =
        pg.showBackButton !== false
          ? `    <div class="page-pad" style="padding-top: 10px; padding-bottom: 10px; border-bottom: 1px solid ${project.theme.borderColor}; background: ${project.theme.cardBg}; display: flex; align-items: center; gap: 10px; position: sticky; top: 0; z-index: 40;">
      <button type="button" data-page-back="1" style="display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; border-radius: 10px; border: 1px solid ${project.theme.borderColor}; background: transparent; color: ${project.theme.textColor}; font-size: 12px; font-weight: 700; cursor: pointer; font-family: inherit;">&larr; ${escapeHtml(
              pg.backButtonLabel || 'Kembali'
            )}</button>
      <div style="font-size: 14px; font-weight: 700; color: ${project.theme.textColor}; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${escapeHtml(
              pg.title || 'Halaman'
            )}</div>
    </div>\n`
          : '';
      return `    <section class="lynk-custom-page page-shell" data-custom-page="${escapeHtml(
        pg.id
      )}" style="display: none;">
${backBarHtml}${
        pgBlocksHtml ||
        `    <div class="page-pad" style="padding-top: 32px; padding-bottom: 32px; text-align: center; font-size: 13px; opacity: 0.65;">Belum ada komponen di halaman ini.</div>`
      }
    </section>`;
    })
    .join('\n');

  return `<!doctype html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
  <title>${escapeHtml(pageTitle)}</title>
  <meta name="description" content="${escapeHtml(pageDescription)}" />${canonicalTag}
  <meta property="og:type" content="website" />
  <meta property="og:locale" content="id_ID" />
  <meta property="og:site_name" content="${escapeHtml(pageSiteName)}" />
  <meta property="og:title" content="${escapeHtml(pageTitle)}" />
  <meta property="og:description" content="${escapeHtml(pageDescription)}" />${ogImageTags}
  <meta name="twitter:card" content="${twitterCardType}" />
  <meta name="twitter:title" content="${escapeHtml(pageTitle)}" />
  <meta name="twitter:description" content="${escapeHtml(pageDescription)}" />${twitterImageTags}
  <script type="application/ld+json">${structuredDataJson}</script>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
  <link href="${escapeHtml(googleFontsHref)}" rel="stylesheet" />${metaPixelSnippet}${tiktokPixelSnippet}${googleTagSnippet}${gtmSnippet}
  <style>
    html, body {
      max-width: 100%;
      overflow-x: clip;
      background-color: ${project.theme.canvasBg};
      touch-action: pan-x pan-y;
      -webkit-text-size-adjust: 100%;
      text-size-adjust: 100%;
      overscroll-behavior-x: none;
    }
    button, a, [role="button"] {
      touch-action: manipulation;
    }
    @media (max-width: 768px) {
      input, select, textarea {
        font-size: 16px !important;
      }
    }
    :fullscreen,
    :-webkit-full-screen,
    :-moz-full-screen {
      background-color: ${project.theme.canvasBg};
      overflow-y: auto;
    }
    #lynk-fullscreen-btn {
      position: fixed;
      top: 12px;
      right: max(12px, calc((100vw - 576px) / 2 + 12px));
      z-index: 8850;
      display: none;
      align-items: center;
      gap: 6px;
      padding: 7px 12px;
      border-radius: 9999px;
      border: 1px solid rgba(255, 255, 255, 0.22);
      background: rgba(15, 23, 42, 0.74);
      color: #FFFFFF;
      font-family: inherit;
      font-size: 11px;
      font-weight: 700;
      line-height: 1;
      cursor: pointer;
      backdrop-filter: blur(8px);
      -webkit-backdrop-filter: blur(8px);
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.22);
      transition: transform 0.16s ease, background-color 0.16s ease, opacity 0.16s ease;
    }
    #lynk-fullscreen-btn:hover {
      background: rgba(15, 23, 42, 0.9);
      transform: translateY(-1px);
    }
    #lynk-fullscreen-btn[hidden] {
      display: none !important;
    }
    @media (max-width: 440px) {
      #lynk-fullscreen-btn {
        right: 12px;
      }
    }
    body {
      margin: 0;
      padding: 0;
      min-height: 100vh;
      font-family: ${bodyFontStack};
      background-color: ${project.theme.canvasBg};
      color: ${project.theme.textColor};
      box-sizing: border-box;
    }
    .app-container {
      width: 100%;
      max-width: 576px;
      margin-left: auto;
      margin-right: auto;
      min-height: 100vh;
      padding: ${
        project.advanceOptions.pageTopPadding ??
        (project.blocks[0]?.style.fullBleed ? 0 : 12)
      }px 0 ${showBottomNavbar ? `${navReservedHeight + 36}px` : '24px'} 0;
      box-sizing: border-box;
      overflow-x: clip;
      position: relative;
    }
    .app-container * {
      box-sizing: border-box;
    }
    .app-container img,
    .app-container iframe {
      max-width: 100%;
    }
    @media (max-width: 440px) {
      .app-container {
        max-width: 440px;
      }
      .lynk-bottom-nav,
      #lynk-cart-bar,
      #lynk-fnb-float-bar,
      .lynk-sheet-panel {
        max-width: 440px;
      }
    }
    .lynk-hover-lift {
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .lynk-hover-lift:hover {
      transform: translateY(-3px);
    }
    .lynk-popout-card {
      transition: transform 280ms cubic-bezier(0.22, 1, 0.36, 1), box-shadow 280ms ease;
    }
    .lynk-popout-card.has-float-3d:hover,
    .lynk-popout-card.has-float-3d:active {
      transform: translateY(-4px);
    }
    .lynk-popout-card-img {
      transform: translate(var(--pop-x, 12px), var(--pop-y, 8px)) rotate(var(--pop-rot, -20deg)) scale(var(--pop-scale, 1));
      filter: var(--pop-shadow, drop-shadow(8px 18px 20px rgba(15, 23, 42, 0.34)));
      transition: transform 340ms cubic-bezier(0.22, 1, 0.36, 1), filter 340ms ease;
      will-change: transform, filter;
    }
    .lynk-popout-card.has-float-3d:hover .lynk-popout-card-img,
    .lynk-popout-card.has-float-3d:active .lynk-popout-card-img {
      transform: translate(var(--pop-x, 12px), calc(var(--pop-y, 8px) - 10px)) rotate(calc(var(--pop-rot, -20deg) - 6deg)) scale(calc(var(--pop-scale, 1) * 1.07));
      filter: var(--pop-shadow-hover, drop-shadow(12px 28px 28px rgba(15, 23, 42, 0.42)));
    }
    .lynk-png-float-img {
      transform: translate(var(--png-x, 0px), var(--png-y, 0px)) rotate(var(--png-rot, 0deg)) scale(var(--png-scale, 1));
      filter: var(--png-shadow, none);
      transition: transform 320ms cubic-bezier(0.22, 1, 0.36, 1), filter 320ms ease;
      will-change: transform, filter;
    }
    .lynk-png-float-wrap.has-float-3d:hover .lynk-png-float-img,
    .lynk-png-float-wrap.has-float-3d:active .lynk-png-float-img {
      transform: translate(var(--png-x, 0px), calc(var(--png-y, 0px) - 8px)) rotate(calc(var(--png-rot, 0deg) - 5deg)) scale(calc(var(--png-scale, 1) * 1.06));
      filter: var(--png-shadow-hover, drop-shadow(8px 24px 24px rgba(15, 23, 42, 0.36)));
    }
    .page-shell {
      width: 100%;
      box-sizing: border-box;
    }
    .page-pad {
      width: 100%;
      margin: 0 auto;
      padding-left: 16px;
      padding-right: 16px;
      box-sizing: border-box;
    }
    .page-full {
      width: 100%;
      padding-left: 0;
      padding-right: 0;
      box-sizing: border-box;
    }
    [data-car-track] {
      scrollbar-width: none;
    }
    [data-car-track]::-webkit-scrollbar {
      display: none;
    }
    .lynk-bottom-nav {
      position: fixed;
      z-index: 8800;
      max-width: 576px;
      box-sizing: border-box;
      transition: all 0.2s ease;
    }
    .lynk-bottom-nav-grid {
      max-width: 576px;
      margin: 0 auto;
      display: grid;
      align-items: end;
      gap: 2px;
    }
    .lynk-bottom-nav-btn {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: flex-end;
      gap: 3px;
      padding: 2px 4px;
      border: 0;
      border-radius: 12px;
      background: transparent;
      color: inherit;
      font-family: inherit;
      cursor: pointer;
      min-width: 0;
    }
    .lynk-bottom-nav-btn:active {
      opacity: 0.78;
    }
    .lynk-bottom-nav-icon {
      width: 24px;
      height: 24px;
      display: flex;
      align-items: center;
      justify-content: center;
    }
    .lynk-bottom-nav-home-fab {
      margin-top: -22px;
      width: 46px;
      height: 46px;
      border-radius: 9999px;
      border: 4px solid #FFFFFF;
      color: #FFFFFF;
      display: flex;
      align-items: center;
      justify-content: center;
      box-shadow: 0 6px 18px rgba(15, 23, 42, 0.22);
      flex-shrink: 0;
    }
    .lynk-bottom-nav-label {
      font-size: 10px;
      font-weight: 600;
      line-height: 1.2;
      max-width: 100%;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      opacity: 0.88;
    }
    .lynk-sheet-backdrop {
      position: fixed;
      inset: 0;
      z-index: 9600;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      background: rgba(2, 6, 23, 0.56);
      backdrop-filter: blur(2px);
      opacity: 0;
      pointer-events: none;
      transition: opacity 0.24s ease;
    }
    .lynk-sheet-backdrop.is-open {
      opacity: 1;
      pointer-events: auto;
    }
    .lynk-sheet-panel {
      width: 100%;
      max-width: 576px;
      max-height: 85vh;
      border-top-left-radius: 22px;
      border-top-right-radius: 22px;
      box-shadow: 0 -18px 48px rgba(2, 6, 23, 0.28);
      display: flex;
      flex-direction: column;
      overflow: hidden;
      transform: translateY(100%);
      transition: transform 0.28s cubic-bezier(0.22, 1, 0.36, 1);
      box-sizing: border-box;
    }
    .lynk-sheet-backdrop.is-open .lynk-sheet-panel {
      transform: translate(0, 0);
    }
    .lynk-sheet-pos-top,
    .lynk-sheet-backdrop[data-sheet-pos="top"] {
      align-items: flex-start;
      justify-content: center;
    }
    .lynk-sheet-pos-top .lynk-sheet-panel,
    .lynk-sheet-backdrop[data-sheet-pos="top"] .lynk-sheet-panel {
      border-radius: 0 0 22px 22px;
      transform: translateY(-100%);
    }
    .lynk-sheet-pos-right,
    .lynk-sheet-backdrop[data-sheet-pos="right"] {
      align-items: stretch;
      justify-content: flex-end;
    }
    .lynk-sheet-pos-right .lynk-sheet-panel,
    .lynk-sheet-backdrop[data-sheet-pos="right"] .lynk-sheet-panel {
      width: min(86vw, 380px);
      max-width: 380px;
      height: 100%;
      max-height: 100vh;
      border-radius: 22px 0 0 22px;
      transform: translateX(100%);
    }
    .lynk-sheet-pos-left,
    .lynk-sheet-backdrop[data-sheet-pos="left"] {
      align-items: stretch;
      justify-content: flex-start;
    }
    .lynk-sheet-pos-left .lynk-sheet-panel,
    .lynk-sheet-backdrop[data-sheet-pos="left"] .lynk-sheet-panel {
      width: min(86vw, 380px);
      max-width: 380px;
      height: 100%;
      max-height: 100vh;
      border-radius: 0 22px 22px 0;
      transform: translateX(-100%);
    }
    .lynk-sheet-header {
      padding: 10px 16px 12px 16px;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      flex-shrink: 0;
      border-bottom: 1px solid rgba(148, 163, 184, 0.22);
    }
    .lynk-sheet-header-row {
      width: 100%;
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 8px;
    }
    .lynk-sheet-title {
      margin: 0;
      font-size: 15px;
      font-weight: 700;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .lynk-sheet-close {
      width: 30px;
      height: 30px;
      border-radius: 9999px;
      border: 0;
      background: rgba(148, 163, 184, 0.16);
      color: inherit;
      font-size: 16px;
      font-weight: 700;
      cursor: pointer;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .lynk-sheet-handle {
      width: 40px;
      height: 4px;
      border-radius: 9999px;
      background: rgba(148, 163, 184, 0.55);
    }
    .lynk-sheet-body {
      flex: 1;
      overflow-y: auto;
      padding: 16px;
      box-sizing: border-box;
    }
    .lynk-hide-scrollbar {
      scrollbar-width: none;
      -ms-overflow-style: none;
    }
    .lynk-hide-scrollbar::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }
    .lynk-row-track::-webkit-scrollbar {
      height: 5px;
    }
    .lynk-row-track::-webkit-scrollbar-thumb {
      background: rgba(148, 163, 184, 0.55);
      border-radius: 9999px;
    }
    .lynk-row-track.lynk-hide-scrollbar::-webkit-scrollbar {
      display: none;
      width: 0;
      height: 0;
    }
    .lynk-row-dots {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 6px;
      padding-top: 8px;
    }
    .lynk-row-dots.is-overlay {
      position: absolute;
      bottom: 10px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 20;
      display: inline-flex;
      padding: 4px 10px;
      border-radius: 9999px;
      background: rgba(2, 6, 23, 0.52);
      backdrop-filter: blur(4px);
    }
    .lynk-row-dot {
      width: 6px;
      height: 6px;
      padding: 0;
      border: 0;
      border-radius: 9999px;
      background: #CBD5E1;
      cursor: pointer;
      transition: width 0.2s ease, background-color 0.2s ease;
    }
    .lynk-row-dots.is-overlay .lynk-row-dot:not(.is-active) {
      background: rgba(255, 255, 255, 0.58);
    }
    .lynk-row-dot.is-active {
      width: 18px;
      background: var(--dot-accent, #10B981);
    }
    .lynk-card-highlight {
      outline: 2px solid #10B981 !important;
      outline-offset: 3px;
      transition: outline-color 0.3s ease;
    }
    @keyframes fpsLevitate {
      0%, 100% { transform: translate3d(0, 0px, 0); }
      50% { transform: translate3d(0, -10px, 0); }
    }
    @keyframes fpsShadowPulse {
      0%, 100% { transform: scaleX(1) scaleY(1); opacity: 0.92; }
      50% { transform: scaleX(0.82) scaleY(0.86); opacity: 0.54; }
    }${responsiveCssRules ? '\n' + responsiveCssRules : ''}
  </style>
</head>
<body>
  <button type="button" id="lynk-fullscreen-btn" hidden style="display: none;" aria-label="Lihat Penuh">
    <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>
    <span>Lihat Penuh</span>
  </button>
  <div class="app-container">
    <main id="lynk-main-view" class="page-shell">
${bodyBlocks}
    </main>${subPagesHtml ? '\n' + subPagesHtml : ''}
    <section id="lynk-subpage-detail" class="page-pad" style="display: none; padding-bottom: 108px;"></section>
    <section id="lynk-subpage-cart" class="page-pad" style="display: none; padding-bottom: 100px;"></section>
  </div>${waAddonHtml}${bottomNavbarHtml}${bottomNavbarSheetsHtml ? '\n' + bottomNavbarSheetsHtml : ''}
  <div id="lynk-cart-bar" style="display: none; position: fixed; left: 50%; transform: translateX(-50%); width: 100%; max-width: 576px; bottom: ${
      showBottomNavbar ? `${navReservedHeight + 2}px` : '0'
    }; z-index: 9650; background: #FFFFFF; border-top: 1px solid #E2E8F0; box-shadow: 0 -8px 24px rgba(15, 23, 42, 0.14); box-sizing: border-box;">
    <div class="page-pad" style="padding-top: 10px; padding-bottom: 10px; display: flex; align-items: center; justify-content: space-between; gap: 12px;">
      <div style="min-width: 0;">
        <div id="lynk-cart-bar-count" style="font-size: 11px; font-weight: 600; color: #64748B;">0 item di keranjang</div>
        <div id="lynk-cart-bar-total" style="font-size: 14px; font-weight: 700; color: #0F172A;">Rp 0</div>
      </div>
      <button type="button" id="lynk-open-cart-btn" style="padding: 9px 16px; border: 0; border-radius: 12px; background: #059669; color: #FFFFFF; font-size: 12px; font-weight: 700; cursor: pointer; flex-shrink: 0;">Lihat Keranjang</button>
    </div>
  </div>
  <div id="lynk-fnb-float-bar" style="display: none; position: fixed; left: 50%; transform: translateX(-50%); width: 100%; max-width: 576px; z-index: 9660; justify-content: center; padding: 0 14px; pointer-events: none; box-sizing: border-box;">
    <button type="button" id="lynk-fnb-float-btn" style="width: 100%; max-width: 400px; pointer-events: auto; border: 0; border-radius: 9999px; background: #EA580C; color: #FFFFFF; padding: 10px 16px; display: flex; align-items: center; justify-content: space-between; gap: 12px; cursor: pointer; font-family: inherit; box-shadow: 0 10px 26px rgba(15, 23, 42, 0.22);">
      <span style="display: flex; align-items: center; gap: 10px; min-width: 0; text-align: left;">
        <span style="width: 32px; height: 32px; border-radius: 9999px; background: rgba(255,255,255,0.2); display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>
        </span>
        <span style="min-width: 0;">
          <span id="lynk-fnb-float-count" style="display: block; font-size: 11px; font-weight: 600; opacity: 0.9; line-height: 1.2;">0 item</span>
          <span id="lynk-fnb-float-total" style="display: block; font-size: 14px; font-weight: 800; line-height: 1.25;">Rp 0</span>
        </span>
      </span>
      <span style="display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 800; flex-shrink: 0;">
        <span id="lynk-fnb-float-label">Lanjut</span>
        <span>&#10003;</span>
      </span>
    </button>
  </div>
  <div id="lynk-toast" style="display: none; position: fixed; bottom: ${
      showBottomNavbar ? `${navReservedHeight + 24}px` : '76px'
    }; left: 50%; transform: translateX(-50%); z-index: 9700; background: rgba(15, 23, 42, 0.92); color: #FFFFFF; padding: 7px 14px; border-radius: 9999px; font-size: 12px; font-weight: 600; white-space: nowrap; pointer-events: none;"></div>
  <script type="application/json" id="lynk-store-data">${serializedStore}</script>
  <script>
    (function () {
      var carousels = document.querySelectorAll('[data-carousel]');
      carousels.forEach(function (car) {
        var track = car.querySelector('[data-car-track]');
        if (!track) return;
        var prev = car.querySelector('[data-car-prev]');
        var next = car.querySelector('[data-car-next]');
        var counter = car.querySelector('[data-car-counter]');
        var dots = car.querySelectorAll('[data-car-dot]');
        var accent = car.getAttribute('data-car-accent') || '#2563EB';
        var total = dots.length || track.children.length;
        var active = 0;
        var dragging = false;
        var moved = false;
        var startX = 0;
        var startLeft = 0;

        function syncUI(idx) {
          active = Math.max(0, Math.min(total - 1, idx));
          if (counter) counter.textContent = (active + 1) + ' / ' + total;
          if (prev) prev.style.opacity = active === 0 ? '0.3' : '0.95';
          if (next) next.style.opacity = active === total - 1 ? '0.3' : '0.95';
          dots.forEach(function (d, i) {
            d.style.width = i === active ? '20px' : '6px';
            var isOv = d.getAttribute('data-dot-overlay') === '1';
            d.style.background = i === active ? accent : (isOv ? 'rgba(255, 255, 255, 0.58)' : '#CBD5E1');
          });
        }
        function goTo(idx) {
          var bounded = Math.max(0, Math.min(total - 1, idx));
          track.scrollTo({ left: bounded * track.clientWidth, behavior: 'smooth' });
          syncUI(bounded);
        }
        track.addEventListener('scroll', function () {
          if (!track.clientWidth) return;
          var idx = Math.round(track.scrollLeft / track.clientWidth);
          if (idx !== active) syncUI(idx);
        });
        if (prev) prev.addEventListener('click', function () { goTo(active - 1); });
        if (next) next.addEventListener('click', function () { goTo(active + 1); });
        dots.forEach(function (dot) {
          dot.addEventListener('click', function () {
            goTo(Number(dot.getAttribute('data-car-dot') || 0));
          });
        });
        track.addEventListener('pointerdown', function (e) {
          if (e.pointerType !== 'mouse' || e.button !== 0) return;
          dragging = true;
          moved = false;
          startX = e.clientX;
          startLeft = track.scrollLeft;
          track.style.cursor = 'grabbing';
        });
        window.addEventListener('pointermove', function (e) {
          if (!dragging) return;
          var dx = e.clientX - startX;
          if (Math.abs(dx) > 6) moved = true;
          if (moved) track.scrollLeft = startLeft - dx;
        });
        window.addEventListener('pointerup', function () {
          if (!dragging) return;
          dragging = false;
          track.style.cursor = 'grab';
          if (moved && track.clientWidth) {
            goTo(Math.round(track.scrollLeft / track.clientWidth));
          }
          setTimeout(function () { moved = false; }, 60);
        });
        track.addEventListener('click', function (e) {
          if (moved) e.preventDefault();
        }, true);
      });
      var sfPlayBtns = document.querySelectorAll('[data-sf-play]');
      sfPlayBtns.forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var box = btn.closest('[data-sf-video-box]');
          if (!box) return;
          var kind = box.getAttribute('data-sf-kind');
          var id = box.getAttribute('data-sf-id') || '';
          var rawUrl = box.getAttribute('data-sf-url') || '';
          function mountDirect(src) {
            box.innerHTML = '';
            var v = document.createElement('video');
            v.src = src;
            v.controls = true;
            v.autoplay = true;
            v.playsInline = true;
            v.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;background:#000;';
            box.appendChild(v);
            v.play().catch(function () {});
          }
          function mountIframe(src) {
            box.innerHTML = '';
            var ifr = document.createElement('iframe');
            ifr.src = src;
            ifr.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture');
            ifr.allowFullscreen = true;
            ifr.style.cssText = 'width:100%;height:100%;border:0;display:block;background:#000;';
            box.appendChild(ifr);
          }
          if (kind === 'direct' && id) {
            mountDirect(id);
          } else if (kind === 'youtube' && id) {
            mountIframe('https://www.youtube.com/embed/' + id + '?autoplay=1&rel=0&modestbranding=1&playsinline=1');
          } else if (kind && rawUrl && location.protocol.indexOf('http') === 0) {
            fetch('/api/resolve-video?platform=' + encodeURIComponent(kind) + '&url=' + encodeURIComponent(rawUrl))
              .then(function (r) { return r.ok ? r.json() : null; })
              .then(function (d) {
                if (d && d.directVideoUrl) { mountDirect(d.directVideoUrl); return; }
                var resolvedId = (d && d.videoId) || id;
                if (kind === 'tiktok') mountIframe('https://www.tiktok.com/player/v1/' + resolvedId + '?autoplay=1&rel=0');
                else if (kind === 'instagram') mountIframe('https://www.instagram.com/' + resolvedId + '/embed/?autoplay=1');
                else if (kind === 'facebook') mountIframe('https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent((d && d.canonicalUrl) || rawUrl) + '&show_text=false&autoplay=true');
              })
              .catch(function () {});
          } else if (kind === 'tiktok' && id) {
            mountIframe('https://www.tiktok.com/player/v1/' + id + '?autoplay=1&rel=0');
          } else if (kind === 'instagram' && id) {
            mountIframe('https://www.instagram.com/' + id + '/embed/?autoplay=1');
          } else if (kind === 'facebook' && (id || rawUrl)) {
            mountIframe('https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(id || rawUrl) + '&show_text=false&autoplay=true');
          }
        });
      });
      var sfaCards = document.querySelectorAll('[data-sfa-card]');
      sfaCards.forEach(function (card) {
        var toggleBtn = card.querySelector('[data-sfa-toggle]');
        var panel = card.querySelector('[data-sfa-panel]');
        var chevron = card.querySelector('[data-sfa-chevron]');
        if (toggleBtn && panel) {
          toggleBtn.addEventListener('click', function () {
            var isOpen = panel.style.display !== 'none';
            panel.style.display = isOpen ? 'none' : 'block';
            toggleBtn.setAttribute('aria-expanded', isOpen ? 'false' : 'true');
            if (chevron) chevron.style.transform = isOpen ? 'rotate(0deg)' : 'rotate(180deg)';
          });
        }
        var slides = card.querySelectorAll('[data-sfa-slide]');
        if (slides.length > 1) {
          var prevBtn = card.querySelector('[data-sfa-prev]');
          var nextBtn = card.querySelector('[data-sfa-next]');
          var counter = card.querySelector('[data-sfa-counter]');
          var current = 0;
          function showSlide(idx) {
            current = (idx + slides.length) % slides.length;
            slides.forEach(function (s, i) {
              s.style.display = i === current ? 'block' : 'none';
            });
            if (counter) counter.textContent = (current + 1) + ' / ' + slides.length;
          }
          if (prevBtn) prevBtn.addEventListener('click', function () { showSlide(current - 1); });
          if (nextBtn) nextBtn.addEventListener('click', function () { showSlide(current + 1); });
        }
      });
    })();
    (function () {
      var players = document.querySelectorAll('[data-vid-player]');
      if (!players.length) return;
      function sendCmd(wrap, cmd, val) {
        var platform = wrap.getAttribute('data-vid-platform');
        var videoEl = wrap.querySelector('video');
        if (videoEl) {
          if (cmd === 'play') {
            videoEl.play().catch(function () {
              videoEl.muted = true;
              wrap._vidMuted = true;
              syncVolumeUI(wrap, Number(wrap.getAttribute('data-vid-volume') || 75), true);
              videoEl.play().catch(function () {});
            });
          } else if (cmd === 'pause') videoEl.pause();
          else if (cmd === 'mute') videoEl.muted = true;
          else if (cmd === 'unMute') videoEl.muted = false;
          else if (cmd === 'setVolume' && val !== undefined) {
            videoEl.volume = Math.max(0, Math.min(1, val / 100));
          }
          return;
        }
        var iframe = wrap.querySelector('iframe');
        if (!iframe || !iframe.contentWindow) return;
        if (platform === 'youtube') {
          var func = cmd === 'play' ? 'playVideo' : cmd === 'pause' ? 'pauseVideo' : cmd;
          try {
            iframe.contentWindow.postMessage(JSON.stringify({ event: 'command', func: func, args: val !== undefined ? [val] : [] }), '*');
          } catch (e) {}
          return;
        }
        if (platform === 'tiktok') {
          try {
            if (cmd === 'mute') {
              iframe.contentWindow.postMessage({ 'x-tiktok-player': true, type: 'mute' }, '*');
            } else if (cmd === 'unMute') {
              iframe.contentWindow.postMessage({ 'x-tiktok-player': true, type: 'unMute' }, '*');
            } else if (cmd === 'setVolume' && val !== undefined) {
              iframe.contentWindow.postMessage({ 'x-tiktok-player': true, type: 'setVolume', value: Math.max(0, Math.min(100, Math.round(val))) }, '*');
            } else {
              iframe.contentWindow.postMessage({ 'x-tiktok-player': true, type: cmd }, '*');
            }
          } catch (e) {}
        }
      }
      function makeFallbackBox(text) {
        var box = document.createElement('div');
        box.style.cssText = 'width:100%;height:100%;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,#0F172A,#020617);color:#CBD5E1;font-size:12px;font-weight:500;';
        box.textContent = text;
        return box;
      }
      function makeCover(wrap) {
        var platform = wrap.getAttribute('data-vid-platform');
        var id = wrap.getAttribute('data-vid-id');
        var poster = wrap._resolvedPoster || wrap.getAttribute('data-vid-poster') || '';
        var cover = document.createElement('div');
        cover.setAttribute('data-vid-cover', '');
        cover.style.cssText = 'position:absolute;inset:0;z-index:2;transition:opacity 0.3s ease;opacity:1;';
        if (poster) {
          var pImg = document.createElement('img');
          pImg.src = poster;
          pImg.alt = 'Video preview';
          pImg.referrerPolicy = 'no-referrer';
          pImg.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
          pImg.onerror = function () {
            cover.innerHTML = '';
            cover.appendChild(makeFallbackBox(wrap._vidPlaying && !wrap._vidPaused ? 'Memutar video...' : 'Video siap diputar'));
          };
          cover.appendChild(pImg);
          return cover;
        }
        if (platform === 'youtube') {
          var hq = 'https://i.ytimg.com/vi/' + id + '/hqdefault.jpg';
          var max = 'https://i.ytimg.com/vi/' + id + '/maxresdefault.jpg';
          var img = document.createElement('img');
          img.src = max;
          img.alt = 'Video preview';
          img.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
          img.onerror = function () {
            if (img.src !== hq) { img.src = hq; }
            else {
              cover.innerHTML = '';
              cover.appendChild(makeFallbackBox(wrap._vidPlaying && !wrap._vidPaused ? 'Memutar video...' : 'Video siap diputar'));
            }
          };
          cover.appendChild(img);
          return cover;
        }
        cover.appendChild(makeFallbackBox(wrap._vidPlaying && !wrap._vidPaused ? 'Memutar video...' : 'Video siap diputar'));
        return cover;
      }
      function clearPlayerTimers(wrap) {
        if (wrap._vidRevealTimer) { clearTimeout(wrap._vidRevealTimer); wrap._vidRevealTimer = null; }
        if (wrap._vidFallbackTimer) { clearTimeout(wrap._vidFallbackTimer); wrap._vidFallbackTimer = null; }
        if (wrap._vidAutoCheckTimer) { clearTimeout(wrap._vidAutoCheckTimer); wrap._vidAutoCheckTimer = null; }
        wrap._vidRevealScheduled = false;
      }
      function syncVolumeUI(wrap, vol, muted) {
        var slider = wrap.querySelector('[data-vid-vol]');
        var label = wrap.querySelector('[data-vid-vol-label]');
        var muteBtn = wrap.querySelector('[data-vid-mute]');
        var shown = muted ? 0 : vol;
        if (slider) slider.value = String(shown);
        if (label) label.textContent = shown + '%';
        if (muteBtn) muteBtn.textContent = shown === 0 ? '\\uD83D\\uDD07' : '\\uD83D\\uDD0A';
      }
      function showCover(wrap) {
        wrap._vidRevealed = false;
        var cover = wrap.querySelector('[data-vid-cover]');
        if (cover) {
          cover.style.opacity = '1';
          cover.style.pointerEvents = 'auto';
        }
      }
      function revealPlayer(wrap) {
        wrap._vidRevealed = true;
        if (wrap._vidRevealTimer) { clearTimeout(wrap._vidRevealTimer); wrap._vidRevealTimer = null; }
        if (wrap._vidFallbackTimer) { clearTimeout(wrap._vidFallbackTimer); wrap._vidFallbackTimer = null; }
        var cover = wrap.querySelector('[data-vid-cover]');
        if (cover) {
          cover.style.opacity = '0';
          cover.style.pointerEvents = 'none';
        }
        var platform = wrap.getAttribute('data-vid-platform');
        if (platform === 'facebook' || platform === 'instagram') {
          var iframe = wrap.querySelector('iframe');
          if (iframe) iframe.style.pointerEvents = 'auto';
          var shield = wrap.querySelector('[data-vid-shield]');
          if (shield && shield.parentNode) shield.parentNode.removeChild(shield);
        }
      }
      var VID_PLAY_SVG = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true" style="margin-left:3px;"><polygon points="6 4 20 12 6 20 6 4"/></svg>';
      var VID_PAUSE_SVG = '<svg viewBox="0 0 24 24" width="24" height="24" fill="currentColor" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1"/><rect x="14" y="4" width="4" height="16" rx="1"/></svg>';
      function ensureToggleBtn(wrap) {
        var stage = wrap.querySelector('[data-vid-stage]');
        if (!stage) return null;
        var btn = stage.querySelector('[data-vid-toggle]');
        if (!btn) {
          btn = document.createElement('button');
          btn.type = 'button';
          btn.setAttribute('data-vid-toggle', '');
          btn.setAttribute('data-vid-playing', '0');
          btn.setAttribute('aria-label', 'Putar video');
          btn.style.cssText = 'position:absolute;inset:0;z-index:4;width:100%;height:100%;border:0;padding:0;background:transparent;display:flex;align-items:center;justify-content:center;cursor:pointer;transition:opacity 0.3s ease;opacity:1;';
          btn.innerHTML = '<span data-vid-icon-wrap style="width:56px;height:56px;border-radius:9999px;background:rgba(15,23,42,0.72);border:1.5px solid rgba(255,255,255,0.32);backdrop-filter:blur(4px);color:#FFFFFF;display:flex;align-items:center;justify-content:center;box-shadow:0 10px 26px rgba(0,0,0,0.35);">' + VID_PLAY_SVG + '</span>';
          stage.appendChild(btn);
        }
        if (!btn._vidBound) {
          btn._vidBound = true;
          btn.addEventListener('click', function () {
            if (wrap._vidPlaying && !wrap._vidPaused) {
              pausePlayer(wrap);
            } else {
              startOrResume(wrap, false);
            }
          });
        }
        return btn;
      }
      function ensureMediaWrap(wrap) {
        var stage = wrap.querySelector('[data-vid-stage]');
        if (!stage) return null;
        var media = stage.querySelector('[data-vid-media]');
        if (!media) {
          media = document.createElement('div');
          media.setAttribute('data-vid-media', '');
          var z = Math.max(50, Math.min(350, Number(wrap.getAttribute('data-vid-zoom') || 100)));
          media.style.cssText = 'position:absolute;inset:0;' + (z !== 100 ? 'transform:scale(' + (z / 100).toFixed(3) + ');transform-origin:center center;' : '');
          stage.insertBefore(media, stage.firstChild);
        }
        return media;
      }
      function setButtonStates(wrap, playing, paused, skipFlash) {
        var btn = ensureToggleBtn(wrap);
        if (!btn) return;
        var iconWrap = btn.querySelector('[data-vid-icon-wrap]');
        var accent = wrap.getAttribute('data-vid-accent') || '#2563EB';
        var activePlay = playing && !paused;
        if (wrap._vidFlashTimer) {
          clearTimeout(wrap._vidFlashTimer);
          wrap._vidFlashTimer = null;
        }
        btn.style.opacity = '1';
        if (activePlay) {
          btn.setAttribute('data-vid-playing', '1');
          btn.setAttribute('aria-label', 'Jeda video');
          if (iconWrap) {
            iconWrap.innerHTML = VID_PAUSE_SVG;
            iconWrap.style.background = 'rgba(15, 23, 42, 0.72)';
            if (skipFlash) {
              iconWrap.style.opacity = '0';
              iconWrap.style.visibility = 'hidden';
            } else {
              iconWrap.style.visibility = 'visible';
              iconWrap.style.opacity = '1';
              wrap._vidFlashTimer = setTimeout(function () {
                if (wrap._vidPlaying && !wrap._vidPaused) {
                  iconWrap.style.opacity = '0';
                  iconWrap.style.visibility = 'hidden';
                }
              }, 650);
            }
          }
        } else {
          btn.setAttribute('data-vid-playing', '0');
          btn.setAttribute('aria-label', 'Putar video');
          if (iconWrap) {
            iconWrap.innerHTML = VID_PLAY_SVG;
            iconWrap.style.background = accent;
            iconWrap.style.visibility = 'visible';
            iconWrap.style.opacity = '1';
          }
        }
      }
      function pausePlayer(wrap) {
        if (!wrap._vidMounted || wrap._vidPaused) return;
        clearPlayerTimers(wrap);
        wrap._vidPaused = true;
        wrap._vidPlaying = false;
        var platform = wrap.getAttribute('data-vid-platform');
        var hasDirect = Boolean(wrap._resolvedDirect || wrap.getAttribute('data-vid-direct'));
        if (!hasDirect && (platform === 'facebook' || platform === 'instagram')) {
          wrap._vidMounted = false;
          var media = ensureMediaWrap(wrap);
          if (media) {
            media.innerHTML = '';
            media.appendChild(makeCover(wrap));
          }
          ensureToggleBtn(wrap);
        } else {
          sendCmd(wrap, 'pause');
        }
        showCover(wrap);
        setButtonStates(wrap, false, true, false);
      }
      function resetPlayer(wrap) {
        clearPlayerTimers(wrap);
        wrap._vidMounted = false;
        wrap._vidPlaying = false;
        wrap._vidPaused = false;
        wrap._vidPlayedOnce = false;
        wrap._vidRevealed = false;
        var media = ensureMediaWrap(wrap);
        if (media) {
          media.innerHTML = '';
          media.appendChild(makeCover(wrap));
        }
        ensureToggleBtn(wrap);
        setButtonStates(wrap, false, false, false);
      }
      function startOrResume(wrap, isAuto) {
        clearPlayerTimers(wrap);
        var platform = wrap.getAttribute('data-vid-platform');
        var id = wrap._resolvedId || wrap.getAttribute('data-vid-id');
        var direct = wrap._resolvedDirect || wrap.getAttribute('data-vid-direct') || '';
        var vol = Number(wrap.getAttribute('data-vid-volume') || 75);
        var media = ensureMediaWrap(wrap);
        if (!media) return;
        wrap._vidAutoMode = Boolean(isAuto);
        wrap._vidPlaying = true;
        wrap._vidPaused = false;
        setButtonStates(wrap, true, false, Boolean(isAuto));
        showCover(wrap);
        if (!wrap._vidMounted) {
          wrap._vidMounted = true;
          wrap._vidMuted = wrap.getAttribute('data-vid-muted') === '1';
          wrap._vidPlayedOnce = false;
          wrap._autoUnmuteAt = 0;
          if (wrap._vidMuted) {
            syncVolumeUI(wrap, vol, true);
          }
          if (direct) {
            media.innerHTML = '';
            var vid = document.createElement('video');
            vid.src = direct;
            vid.playsInline = true;
            vid.preload = 'auto';
            vid.style.cssText = 'width:100%;height:100%;object-fit:cover;display:block;';
            vid.volume = Math.max(0, Math.min(1, vol / 100));
            vid.muted = wrap._vidMuted || vol === 0;
            vid.addEventListener('playing', function () {
              wrap._vidPlayedOnce = true;
              revealPlayer(wrap);
            });
            vid.addEventListener('ended', function () {
              resetPlayer(wrap);
            });
            vid.addEventListener('error', function () {
              wrap._resolvedDirect = '';
              wrap.setAttribute('data-vid-direct', '');
              wrap._vidMounted = false;
              startOrResume(wrap, isAuto);
            });
            media.appendChild(vid);
            media.appendChild(makeCover(wrap));
            ensureToggleBtn(wrap);
            vid.play().catch(function () {
              vid.muted = true;
              wrap._vidMuted = true;
              syncVolumeUI(wrap, vol, true);
              vid.play().catch(function () {});
            });
            return;
          }
          var origin = location.origin && location.origin.indexOf('http') === 0 ? '&origin=' + encodeURIComponent(location.origin) : '';
          var fbHref = wrap._resolvedCanonical || id;
          var fbMute = (isAuto || wrap._vidMuted || vol === 0) ? 1 : 0;
          var src = platform === 'tiktok'
            ? 'https://www.tiktok.com/player/v1/' + id + '?autoplay=1&controls=0&progress_bar=0&play_button=0&volume_control=0&fullscreen_button=0&timestamp=0&music_info=0&description=0&rel=0&loop=0'
            : platform === 'instagram'
            ? 'https://www.instagram.com/' + id + '/embed/?autoplay=1'
            : platform === 'facebook'
            ? 'https://www.facebook.com/plugins/video.php?href=' + encodeURIComponent(fbHref) + '&show_text=false&autoplay=true&mute=' + fbMute
            : 'https://www.youtube.com/embed/' + id + '?autoplay=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&fs=0&disablekb=1&playsinline=1&enablejsapi=1' + origin;
          media.innerHTML = '';
          var iframe = document.createElement('iframe');
          iframe.src = src;
          iframe.setAttribute('allow', 'autoplay; encrypted-media; picture-in-picture; clipboard-write');
          iframe.style.cssText = platform === 'instagram'
            ? 'position:absolute;top:-54px;left:-2px;width:calc(100% + 4px);height:calc(100% + 132px);border:0;pointer-events:none;display:block;'
            : 'width:100%;height:100%;border:0;pointer-events:none;display:block;';
          var shield = document.createElement('div');
          shield.setAttribute('data-vid-shield', '');
          shield.style.cssText = 'position:absolute;inset:0;z-index:1;';
          var cover = makeCover(wrap);
          iframe.addEventListener('load', function () {
            try {
              if (platform === 'instagram' || platform === 'facebook') {
                if (wrap._vidPlaying && !wrap._vidPaused && !wrap._vidRevealScheduled) {
                  wrap._vidRevealScheduled = true;
                  if (wrap._vidFallbackTimer) { clearTimeout(wrap._vidFallbackTimer); wrap._vidFallbackTimer = null; }
                  wrap._vidRevealTimer = setTimeout(function () { revealPlayer(wrap); }, 1500);
                }
              } else if (platform === 'youtube') {
                iframe.contentWindow.postMessage(JSON.stringify({ event: 'listening' }), '*');
                sendCmd(wrap, 'addEventListener', ['onStateChange']);
                if (!wrap._vidMuted && vol > 0) sendCmd(wrap, 'setVolume', [vol]);
              } else if (platform === 'tiktok') {
                if (!wrap._vidMuted && vol > 0) {
                  sendCmd(wrap, 'unMute');
                  sendCmd(wrap, 'setVolume', vol);
                } else {
                  sendCmd(wrap, 'mute');
                }
                sendCmd(wrap, 'play');
              }
            } catch (e) {}
          });
          media.appendChild(iframe);
          media.appendChild(shield);
          media.appendChild(cover);
          ensureToggleBtn(wrap);
        } else {
          if (direct) {
            revealPlayer(wrap);
          }
          if (!wrap._vidMuted && vol > 0) {
            sendCmd(wrap, 'unMute');
            sendCmd(wrap, 'setVolume', vol);
          }
          sendCmd(wrap, 'play');
        }
        var fbDelay = platform === 'instagram' ? 2600 : platform === 'facebook' ? 2800 : 4800;
        wrap._vidFallbackTimer = setTimeout(function () { revealPlayer(wrap); }, fbDelay);
        if (platform === 'youtube' && isAuto && !wrap._vidPlayedOnce) {
          wrap._vidAutoCheckTimer = setTimeout(function () {
            if (!wrap._vidPlayedOnce) {
              wrap._vidMuted = true;
              syncVolumeUI(wrap, vol, true);
              sendCmd(wrap, 'mute');
              sendCmd(wrap, 'play');
            }
          }, 2000);
        }
      }
      players.forEach(function (wrap) {
        var platform = wrap.getAttribute('data-vid-platform');
        var rawUrl = wrap.getAttribute('data-vid-url') || '';
        var customPoster = wrap.getAttribute('data-vid-poster') || '';
        if (platform !== 'youtube' && rawUrl && location.protocol.indexOf('http') === 0) {
          fetch('/api/resolve-video?platform=' + encodeURIComponent(platform) + '&url=' + encodeURIComponent(rawUrl))
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (d) {
              if (!d) return;
              if (d.canonicalUrl) wrap._resolvedCanonical = d.canonicalUrl;
              if (d.directVideoUrl) wrap._resolvedDirect = d.directVideoUrl;
              if (d.videoId) wrap._resolvedId = d.videoId;
              if (d.posterUrl && !customPoster) {
                wrap._resolvedPoster = d.posterUrl;
                var cover = wrap.querySelector('[data-vid-cover]');
                if (cover && !wrap._vidRevealed && cover.parentNode) {
                  var nextCover = makeCover(wrap);
                  nextCover.style.opacity = cover.style.opacity || '1';
                  nextCover.style.pointerEvents = cover.style.pointerEvents || 'auto';
                  cover.parentNode.replaceChild(nextCover, cover);
                }
              }
            })
            .catch(function () {});
        }
        if (platform === 'tiktok' && rawUrl) {
          fetch('https://www.tiktok.com/oembed?url=' + encodeURIComponent(rawUrl))
            .then(function (r) { return r.ok ? r.json() : null; })
            .then(function (data) {
              if (!data) return;
              if (!wrap._resolvedId && data.embed_product_id) wrap._resolvedId = data.embed_product_id;
              if (data.thumbnail_url && !customPoster && !wrap._resolvedPoster) {
                wrap._resolvedPoster = data.thumbnail_url;
                var cover = wrap.querySelector('[data-vid-cover]');
                if (cover && !wrap._vidRevealed && cover.parentNode) {
                  var nextCover = makeCover(wrap);
                  nextCover.style.opacity = cover.style.opacity || '1';
                  nextCover.style.pointerEvents = cover.style.pointerEvents || 'auto';
                  cover.parentNode.replaceChild(nextCover, cover);
                }
              }
            })
            .catch(function () {});
        }
        ensureToggleBtn(wrap);
        var muteBtn = wrap.querySelector('[data-vid-mute]');
        var slider = wrap.querySelector('[data-vid-vol]');
        if (muteBtn) {
          muteBtn.addEventListener('click', function () {
            var vol = Number(wrap.getAttribute('data-vid-volume') || 75);
            var nextMuted = !wrap._vidMuted;
            wrap._vidMuted = nextMuted;
            if (nextMuted) {
              sendCmd(wrap, 'mute');
              syncVolumeUI(wrap, vol, true);
            } else {
              if (vol === 0) {
                vol = 75;
                wrap.setAttribute('data-vid-volume', '75');
              }
              sendCmd(wrap, 'unMute');
              sendCmd(wrap, 'setVolume', vol);
              syncVolumeUI(wrap, vol, false);
            }
          });
        }
        if (slider) {
          slider.addEventListener('input', function () {
            var nextVol = Number(slider.value);
            wrap.setAttribute('data-vid-volume', String(nextVol));
            wrap._vidMuted = nextVol === 0;
            if (nextVol === 0) {
              sendCmd(wrap, 'mute');
            } else {
              sendCmd(wrap, 'unMute');
              sendCmd(wrap, 'setVolume', nextVol);
            }
            syncVolumeUI(wrap, nextVol, nextVol === 0);
          });
        }
        if (wrap.getAttribute('data-vid-autoplay') === '1') {
          startOrResume(wrap, true);
        }
      });
      window.addEventListener('message', function (ev) {
        if (!ev.origin) return;
        var isYt = ev.origin.indexOf('youtube.com') !== -1 || ev.origin.indexOf('youtube-nocookie.com') !== -1;
        var isTt = ev.origin.indexOf('tiktok.com') !== -1;
        if (!isYt && !isTt) return;
        var data = ev.data;
        if (typeof data === 'string') {
          try { data = JSON.parse(data); } catch (e) { return; }
        }
        if (!data) return;
        players.forEach(function (wrap) {
          var platform = wrap.getAttribute('data-vid-platform');
          if ((platform === 'youtube' && !isYt) || (platform === 'tiktok' && !isTt)) return;
          var iframe = wrap.querySelector('iframe');
          if (!iframe || iframe.contentWindow !== ev.source) return;
          var vol = Number(wrap.getAttribute('data-vid-volume') || 75);
          var state = null;
          if (platform === 'youtube') {
            if (data.event === 'infoDelivery' && data.info && typeof data.info.playerState === 'number') state = data.info.playerState;
            else if (data.event === 'onStateChange' && typeof data.info === 'number') state = data.info;
          } else if (platform === 'tiktok') {
            if (data.type === 'onPlayerReady') {
              if (!wrap._vidMuted && vol > 0) {
                sendCmd(wrap, 'unMute');
                sendCmd(wrap, 'setVolume', vol);
              } else {
                sendCmd(wrap, 'mute');
              }
              if (wrap._vidPlaying && !wrap._vidPaused) sendCmd(wrap, 'play');
              return;
            } else if (data.type === 'onMute' && typeof data.value === 'boolean') {
              wrap._vidMuted = data.value;
              syncVolumeUI(wrap, vol, data.value);
              return;
            } else if (data.type === 'onStateChange' && typeof data.value === 'number') {
              state = data.value;
            } else if (data.type === 'onEnded') {
              state = 0;
            }
          }
          if (state === 1) {
            wrap._vidPlayedOnce = true;
            if (wrap._vidAutoCheckTimer) { clearTimeout(wrap._vidAutoCheckTimer); wrap._vidAutoCheckTimer = null; }
            if (!wrap._vidMuted && vol > 0) {
              sendCmd(wrap, 'unMute');
              sendCmd(wrap, 'setVolume', vol);
            }
            if (!wrap._vidRevealScheduled) {
              wrap._vidRevealScheduled = true;
              if (wrap._vidFallbackTimer) { clearTimeout(wrap._vidFallbackTimer); wrap._vidFallbackTimer = null; }
              var rDelay = platform === 'youtube' ? 3800 : 1800;
              wrap._vidRevealTimer = setTimeout(function () { revealPlayer(wrap); }, rDelay);
            }
          } else if (state === 0) {
            resetPlayer(wrap);
          }
        });
      });
    })();

    (function () {
      document.querySelectorAll('[data-maps-photo-open]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          e.stopPropagation();
          var src = btn.getAttribute('data-maps-photo-open');
          var title = btn.getAttribute('data-maps-photo-title') || '';
          if (!src) return;
          var overlay = document.createElement('div');
          overlay.style.cssText = 'position:fixed;inset:0;z-index:9999;background:rgba(2,6,23,0.82);backdrop-filter:blur(4px);display:flex;align-items:center;justify-content:center;padding:16px;';
          var box = document.createElement('div');
          box.style.cssText = 'position:relative;max-width:512px;width:100%;border-radius:16px;overflow:hidden;background:#0F172A;box-shadow:0 24px 48px rgba(0,0,0,0.45);';
          var closeBtn = document.createElement('button');
          closeBtn.type = 'button';
          closeBtn.textContent = '✕';
          closeBtn.setAttribute('aria-label', 'Tutup foto');
          closeBtn.style.cssText = 'position:absolute;top:12px;right:12px;z-index:10;width:32px;height:32px;border-radius:9999px;border:0;background:rgba(15,23,42,0.85);color:#FFFFFF;font-size:14px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;';
          var img = document.createElement('img');
          img.src = src;
          img.alt = title || 'Foto Lokasi';
          img.referrerPolicy = 'no-referrer';
          img.style.cssText = 'width:100%;max-height:75vh;object-fit:contain;display:block;';
          box.appendChild(closeBtn);
          box.appendChild(img);
          if (title) {
            var cap = document.createElement('div');
            cap.textContent = title;
            cap.style.cssText = 'padding:10px 16px;background:#0F172A;color:#FFFFFF;font-size:12px;font-weight:600;';
            box.appendChild(cap);
          }
          overlay.appendChild(box);
          function close() { if (overlay.parentNode) overlay.parentNode.removeChild(overlay); }
          overlay.addEventListener('click', close);
          box.addEventListener('click', function (ev) { ev.stopPropagation(); });
          closeBtn.addEventListener('click', close);
          document.body.appendChild(overlay);
        });
      });

      document.querySelectorAll('[data-toggle-box]').forEach(function (box) {
        var btn = box.querySelector('[data-toggle-btn]');
        var panel = box.querySelector('[data-toggle-panel]');
        var labelEl = box.querySelector('[data-toggle-label]');
        var chevronEl = box.querySelector('[data-toggle-chevron]');
        if (!btn || !panel) return;
        btn.addEventListener('click', function () {
          var isOpen = panel.style.display !== 'none';
          var nextOpen = !isOpen;
          panel.style.display = nextOpen ? 'block' : 'none';
          btn.setAttribute('aria-expanded', nextOpen ? 'true' : 'false');
          if (labelEl) {
            var nextText = nextOpen
              ? btn.getAttribute('data-hide-label')
              : btn.getAttribute('data-show-label');
            if (nextText) labelEl.textContent = nextText;
          }
          if (chevronEl) {
            chevronEl.style.transform = nextOpen ? 'rotate(180deg)' : 'rotate(0deg)';
          }
        });
      });

      var sheetNodes = document.querySelectorAll('[data-bottom-sheet]');
      sheetNodes.forEach(function (sheet) {
        if (sheet.parentNode !== document.body) {
          document.body.appendChild(sheet);
        }
        var panel = sheet.querySelector('.lynk-sheet-panel');
        var closeBtn = sheet.querySelector('[data-sheet-close]');
        function closeSheet() {
          sheet.classList.remove('is-open');
          if (!document.querySelector('[data-bottom-sheet].is-open')) {
            document.body.style.overflow = '';
          }
          if (typeof window.__lynkSyncCart === 'function') window.__lynkSyncCart();
        }
        sheet.addEventListener('click', function (ev) {
          if (ev.target === sheet) closeSheet();
        });
        if (closeBtn) {
          closeBtn.addEventListener('click', closeSheet);
        }
      });
      function closeAllBottomSheets() {
        document.querySelectorAll('[data-bottom-sheet].is-open').forEach(function (openSheet) {
          openSheet.classList.remove('is-open');
        });
        document.body.style.overflow = '';
        if (typeof window.__lynkSyncCart === 'function') window.__lynkSyncCart();
      }
      function isInnerInteractiveClick(el, target) {
        if (!target || !target.closest) return false;
        if (!el || !el.hasAttribute || !el.hasAttribute('data-universal-layer')) return false;
        var hit = target.closest('button, a, input, textarea, select, [data-universal-cart-box], [data-fnb-add], [data-fnb-stepper], [data-fnb-inc], [data-fnb-dec], [data-quick-add]');
        return Boolean(hit && hit !== el && el.contains(hit));
      }
      document.querySelectorAll('[data-sheet-open]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          if (isInnerInteractiveClick(btn, e.target)) return;
          e.stopPropagation();
          var targetId = btn.getAttribute('data-sheet-open');
          var sheet = targetId ? document.getElementById(targetId) : null;
          if (!sheet) return;
          var wasOpen = sheet.classList.contains('is-open');
          closeAllBottomSheets();
          if (!wasOpen) {
            sheet.classList.add('is-open');
            document.body.style.overflow = 'hidden';
            if (typeof window.__lynkSyncCart === 'function') window.__lynkSyncCart();
          }
        });
      });
      document.querySelectorAll('[data-action-url]').forEach(function (el) {
        el.addEventListener('click', function (e) {
          if (isInnerInteractiveClick(el, e.target)) return;
          var url = (el.getAttribute('data-action-url') || '').trim();
          if (!url || !/^https?:\\/\\//i.test(url)) return;
          e.stopPropagation();
          var a = document.createElement('a');
          a.href = url;
          a.target = '_blank';
          a.rel = 'noopener noreferrer';
          document.body.appendChild(a);
          a.click();
          if (a.parentNode) a.parentNode.removeChild(a);
        });
      });
      document.querySelectorAll('[data-open-page]').forEach(function (el) {
        el.addEventListener('click', function (e) {
          if (isInnerInteractiveClick(el, e.target)) return;
          var targetPageId = (el.getAttribute('data-open-page') || '').trim();
          if (!targetPageId) return;
          e.stopPropagation();
          closeAllBottomSheets();
          if (targetPageId === 'home') {
            if (typeof window.__lynkGoHome === 'function') window.__lynkGoHome();
            return;
          }
          if (typeof window.__lynkOpenPage === 'function') {
            window.__lynkOpenPage(targetPageId, true);
          }
        });
      });
      document.querySelectorAll('[data-page-back]').forEach(function (el) {
        el.addEventListener('click', function (e) {
          if (isInnerInteractiveClick(el, e.target)) return;
          e.stopPropagation();
          closeAllBottomSheets();
          var targetBack = (el.getAttribute('data-back-target') || '').trim();
          if (typeof window.__lynkBackPage === 'function') {
            window.__lynkBackPage(targetBack);
          } else if (typeof window.__lynkGoHome === 'function') {
            window.__lynkGoHome();
          }
        });
      });
      document.querySelectorAll('[data-nav-home]').forEach(function (homeBtn) {
        homeBtn.addEventListener('click', function (e) {
          e.stopPropagation();
          closeAllBottomSheets();
          if (typeof window.__lynkGoHome === 'function') {
            window.__lynkGoHome();
            return;
          }
          window.scrollTo({ top: 0, behavior: 'smooth' });
        });
      });
      document.addEventListener('keydown', function (ev) {
        if (ev.key === 'Escape') {
          closeAllBottomSheets();
        }
      });

      document.querySelectorAll('[data-jump-block]').forEach(function (btn) {
        btn.addEventListener('click', function (e) {
          if (isInnerInteractiveClick(btn, e.target)) return;
          e.stopPropagation();
          var targetId = btn.getAttribute('data-jump-block');
          if (!targetId) return;
          closeAllBottomSheets();
          if (typeof window.__lynkGoHome === 'function') {
            window.__lynkGoHome();
          }
          setTimeout(function () {
            var allNodes = document.querySelectorAll('[data-block-id]');
            var targetEl = null;
            for (var i = 0; i < allNodes.length; i++) {
              if (allNodes[i].getAttribute('data-block-id') === targetId) {
                targetEl = allNodes[i];
                break;
              }
            }
            if (!targetEl) return;
            targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            targetEl.classList.add('lynk-card-highlight');
            setTimeout(function () {
              targetEl.classList.remove('lynk-card-highlight');
            }, 1200);
          }, 30);
        });
      });

      document.querySelectorAll('[data-row-slider]').forEach(function (wrap) {
        var track = wrap.querySelector('[data-row-track]');
        var dots = Array.prototype.slice.call(wrap.querySelectorAll('[data-row-dot]'));
        if (!track || dots.length === 0) return;
        function setActiveDot(idx) {
          dots.forEach(function (d, i) {
            if (i === idx) d.classList.add('is-active');
            else d.classList.remove('is-active');
          });
        }
        track.addEventListener('scroll', function () {
          var maxScroll = Math.max(1, track.scrollWidth - track.clientWidth);
          var ratio = track.scrollLeft / maxScroll;
          var idx = ratio < 0.33 ? 0 : ratio <= 0.67 ? 1 : 2;
          setActiveDot(idx);
        }, { passive: true });
        dots.forEach(function (dot, idx) {
          dot.addEventListener('click', function (e) {
            e.stopPropagation();
            var maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
            var targetLeft = idx === 0 ? 0 : idx === 1 ? maxScroll / 2 : maxScroll;
            track.scrollTo({ left: targetLeft, behavior: 'smooth' });
            setActiveDot(idx);
          });
        });
      });

      // Tombol Kategori -> Lompat & Highlight Judul yang Sama
      document.querySelectorAll('[data-cat-jump]').forEach(function (groupEl) {
        var aBg = groupEl.getAttribute('data-cat-active-bg') || '#EA580C';
        var aTxt = groupEl.getAttribute('data-cat-active-text') || '#FFFFFF';
        var iBg = groupEl.getAttribute('data-cat-inactive-bg') || '#F1F5F9';
        var iTxt = groupEl.getAttribute('data-cat-inactive-text') || '#334155';
        var btns = groupEl.querySelectorAll('[data-cat-jump-btn]');
        btns.forEach(function (btn) {
          btn.addEventListener('click', function () {
            var activeId = btn.getAttribute('data-cat-jump-btn') || '';
            btns.forEach(function (b) {
              var on = (b.getAttribute('data-cat-jump-btn') || '') === activeId;
              b.style.backgroundColor = on ? aBg : iBg;
              b.style.color = on ? aTxt : iTxt;
            });
            var rawTarget = (btn.getAttribute('data-cat-target') || btn.textContent || '').trim().toLowerCase();
            if (!rawTarget) return;
            var candidates = document.querySelectorAll('[data-jump-title]');
            var match = null;
            for (var i = 0; i < candidates.length; i++) {
              var key = (candidates[i].getAttribute('data-jump-title') || '').trim().toLowerCase();
              if (key === rawTarget) { match = candidates[i]; break; }
            }
            if (!match) {
              for (var j = 0; j < candidates.length; j++) {
                var key2 = (candidates[j].getAttribute('data-jump-title') || '').trim().toLowerCase();
                if (key2.indexOf(rawTarget) !== -1 || rawTarget.indexOf(key2) !== -1) { match = candidates[j]; break; }
              }
            }
            if (match) {
              match.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          });
        });
      });

      // Sub-Page Detail Produk & Keranjang Pesan via WhatsApp
      var storeEl = document.getElementById('lynk-store-data');
      var mainView = document.getElementById('lynk-main-view');
      var detailView = document.getElementById('lynk-subpage-detail');
      var cartView = document.getElementById('lynk-subpage-cart');
      var cartBar = document.getElementById('lynk-cart-bar');
      var cartBarCount = document.getElementById('lynk-cart-bar-count');
      var cartBarTotal = document.getElementById('lynk-cart-bar-total');
      var openCartBtn = document.getElementById('lynk-open-cart-btn');
      var fnbFloatBar = document.getElementById('lynk-fnb-float-bar');
      var fnbFloatBtn = document.getElementById('lynk-fnb-float-btn');
      var fnbFloatCount = document.getElementById('lynk-fnb-float-count');
      var fnbFloatTotal = document.getElementById('lynk-fnb-float-total');
      var fnbFloatLabel = document.getElementById('lynk-fnb-float-label');
      var toastEl = document.getElementById('lynk-toast');

      if (storeEl && mainView && detailView && cartView) {
        var storeData = null;
        try { storeData = JSON.parse(storeEl.textContent || '{}'); } catch (e) { storeData = null; }
        if (storeData && storeData.catalogs) {
          var catalogs = storeData.catalogs;
          var theme = storeData.theme || {};
          var cart = [];
          var customer = {
            name: '',
            phone: '',
            address: '',
            notes: '',
            customValues: {},
            shippingMethod: 'makan_ditempat',
            arrivalTime: '',
            guestCount: '',
            checklistConfirmed: false,
            checklistChecked: {}
          };
          var shippingOptions = [
            {
              id: 'makan_ditempat',
              enabled: true,
              label: 'Makan di tempat',
              askArrivalTime: true,
              arrivalTimeLabel: 'Waktu Kedatangan',
              arrivalTimePlaceholder: 'Contoh: 18:30 WIB',
              askGuestCount: true,
              guestCountLabel: 'Jumlah Orang',
              guestCountPlaceholder: 'Contoh: 4 orang',
              checklistEnabled: false,
              checklistText: '',
              checklistItems: [],
              noteTitle: 'Catatan:',
              noteText: 'Durasi masak ± 30 menit'
            },
            {
              id: 'ambil_sendiri',
              enabled: true,
              label: 'Ambil sendiri ke lokasi',
              askArrivalTime: true,
              arrivalTimeLabel: 'Diambil Jam Berapa',
              arrivalTimePlaceholder: 'Contoh: 17:00 WIB',
              askGuestCount: false,
              guestCountLabel: 'Jumlah Orang',
              guestCountPlaceholder: 'Contoh: 2 orang',
              checklistEnabled: false,
              checklistText: '',
              checklistItems: [],
              noteTitle: 'Catatan:',
              noteText: 'Durasi masak ± 30 menit'
            },
            {
              id: 'kurir_sendiri',
              enabled: true,
              label: 'Pesan kurir sendiri',
              askArrivalTime: false,
              arrivalTimeLabel: 'Waktu Pengiriman',
              arrivalTimePlaceholder: 'Contoh: 18:00 WIB',
              askGuestCount: false,
              guestCountLabel: 'Jumlah Orang',
              guestCountPlaceholder: 'Contoh: 1 orang',
              checklistEnabled: true,
              checklistText: 'Pesan kurir setelah pembayaran dan makanan telah siap',
              checklistItems: ['Pesan kurir setelah pembayaran dan makanan telah siap'],
              noteTitle: 'Catatan Penting:',
              noteText: 'Biaya makanan / pesanan tidak termasuk biaya kirim (kurir).'
            },
            {
              id: 'gosend_penjual',
              enabled: true,
              label: 'Dikirim Via Gosend Oleh Penjual',
              askArrivalTime: false,
              arrivalTimeLabel: 'Waktu Pengiriman',
              arrivalTimePlaceholder: 'Contoh: 18:00 WIB',
              askGuestCount: false,
              guestCountLabel: 'Jumlah Orang',
              guestCountPlaceholder: 'Contoh: 1 orang',
              checklistEnabled: true,
              checklistText: ${JSON.stringify(GOSEND_DEFAULT_CHECKLISTS.join('\n'))},
              checklistItems: ${JSON.stringify(GOSEND_DEFAULT_CHECKLISTS)},
              noteTitle: 'Catatan Penting:',
              noteText: 'Biaya makanan / pesanan tidak termasuk biaya kirim (kurir).'
            }
          ];
          function getEnabledShipOptions(cfgObj) {
            var list = (cfgObj && cfgObj.shippingOptions && cfgObj.shippingOptions.length)
              ? cfgObj.shippingOptions
              : shippingOptions;
            return list.filter(function (o) { return o && o.enabled !== false; });
          }
          function getOptionChecklists(opt) {
            if (!opt) return [];
            if (Array.isArray(opt.checklistItems)) {
              return opt.checklistItems.map(function (s) { return String(s || '').trim(); }).filter(Boolean);
            }
            var txt = String(opt.checklistText || '').trim();
            if (!txt) return [];
            return txt.split('\\n').map(function (s) { return s.trim(); }).filter(Boolean);
          }
          function getCustomerFields(cfgObj) {
            if (cfgObj && Array.isArray(cfgObj.customerFields)) {
              return cfgObj.customerFields;
            }
            var isDig = cfgObj && (cfgObj.productType === 'digital' || cfgObj.productType === 'service');
            if (isDig) {
              return [
                { id: 'cf_name', label: 'Nama Lengkap', placeholder: 'Masukkan nama lengkap', type: 'text', required: true },
                { id: 'cf_email', label: 'Email Pengiriman File', placeholder: 'email@contoh.com', type: 'email', required: true },
                { id: 'cf_phone', label: 'No. WhatsApp', placeholder: '08xxxxxxxxxx', type: 'tel', required: true }
              ];
            }
            return [
              { id: 'cf_name', label: 'Nama Lengkap', placeholder: 'Masukkan nama lengkap', type: 'text', required: true },
              { id: 'cf_phone', label: 'No. HP / WhatsApp', placeholder: '08xxxxxxxxxx', type: 'tel', required: true },
              { id: 'cf_address', label: 'Alamat Lengkap', placeholder: 'Alamat lengkap pengiriman / patokan lokasi', type: 'textarea', required: false },
              { id: 'cf_notes', label: 'Catatan Pesanan', placeholder: 'Catatan tambahan (opsional)', type: 'text', required: false }
            ];
          }
          var activeRoute = { type: 'home', blockId: '', itemId: '' };
          var toastTimer = null;

          function isPhysicalType(pt) {
            return pt !== 'digital' && pt !== 'service';
          }
          function resolveProductType(cfg, item) {
            if (item && (item.productType === 'physical' || item.productType === 'digital' || item.productType === 'service')) {
              return item.productType;
            }
            return (cfg && (cfg.productType === 'digital' || cfg.productType === 'service')) ? cfg.productType : 'physical';
          }
          function collectPickupNotes(items) {
            var seen = {};
            var res = [];
            function pushNote(raw) {
              var s = String(raw || '').trim();
              if (!s || seen[s]) return;
              seen[s] = true;
              res.push(s);
            }
            items.forEach(function (it) { pushNote(it.pickupNote); });
            return res;
          }
          function esc(v) {
            return String(v == null ? '' : v)
              .replace(/&/g, '&amp;')
              .replace(/</g, '&lt;')
              .replace(/>/g, '&gt;')
              .replace(/"/g, '&quot;');
          }
          function safeHref(raw, fallback) {
            var fb = fallback || '#';
            var s = String(raw || '').trim();
            if (!s) return fb;
            var compact = s.replace(/[\\u0000-\\u001F\\u007F\\s]+/g, '');
            if (/^(javascript|vbscript|data):/i.test(compact)) return fb;
            if (/^(https?:|mailto:|tel:|sms:|whatsapp:|\\/|#)/i.test(s)) return s;
            if (s.indexOf('//') === 0) return 'https:' + s;
            if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(s) && s.indexOf('.') !== -1) return 'https://' + s;
            return fb;
          }
          function parsePrice(str) {
            if (!str) return 0;
            var cleaned = String(str).trim().replace(/,\\d{1,2}$/, '');
            var digits = cleaned.replace(/[^\\d]/g, '');
            var num = Number(digits);
            return digits && isFinite(num) ? num : 0;
          }
          function formatRp(num) {
            return 'Rp ' + Math.max(0, Math.round(num)).toLocaleString('id-ID');
          }
          function parseVars(vStr) {
            if (!vStr) return [];
            return String(vStr).split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          }
          function normalizeWa(raw) {
            var d = String(raw || '').replace(/[^\\d]/g, '');
            if (!d) return '6281234567890';
            if (d.charAt(0) === '0') return '62' + d.slice(1);
            if (d.charAt(0) === '8') return '62' + d;
            return d;
          }
          function buildWaUrl(cfg, items, cust) {
            var phone = normalizeWa(cfg && cfg.whatsappNumber);
            var sName = ((cfg && cfg.storeName) || storeData.projectTitle || '').trim();
            var intro = ((cfg && cfg.whatsappIntro) || '').trim() || 'Halo, saya ingin memesan produk berikut:';
            var lines = [];
            if (sName) lines.push('*' + sName + '*');
            lines.push(intro);
            lines.push('');
            var total = 0;
            var totalQty = 0;
            var hasNum = false;
            lines.push('*Daftar Produk & Jumlah Pesanan:*');
            items.forEach(function (it, idx) {
              var vText = it.variant ? ' (' + it.variant + ')' : '';
              var sub = it.unitPrice * it.qty;
              totalQty += it.qty;
              if (it.unitPrice > 0) {
                hasNum = true;
                total += sub;
                lines.push((idx + 1) + '. ' + it.title + vText + ' — Jumlah: ' + it.qty + ' (' + formatRp(sub) + ')');
              } else {
                lines.push((idx + 1) + '. ' + it.title + vText + ' — Jumlah: ' + it.qty + (it.priceText ? ' (' + it.priceText + ')' : ''));
              }
            });
            lines.push('');
            lines.push('*Total Jumlah Pesanan: ' + totalQty + ' pcs*');
            if (hasNum) {
              lines.push('*Total Estimasi: ' + formatRp(total) + '*');
            }
            var hasPhysical = items.some(function (it) { return isPhysicalType(it.productType); });
            if (cust) {
              var cLines = [];
              if (Array.isArray(cust.customFields) && cust.customFields.length) {
                cust.customFields.forEach(function (cf) {
                  if (cf && cf.value && cf.value.trim()) {
                    cLines.push(String(cf.label || '').trim() + ': ' + cf.value.trim());
                  }
                });
              } else {
                if (cust.name && cust.name.trim()) cLines.push('Nama: ' + cust.name.trim());
                if (cust.phone && cust.phone.trim()) cLines.push('No. WA: ' + cust.phone.trim());
                if (cust.address && cust.address.trim()) cLines.push('Alamat: ' + cust.address.trim());
                if (cust.notes && cust.notes.trim()) cLines.push('Catatan: ' + cust.notes.trim());
              }
              var selectedLabel = '';
              if (hasPhysical && cust.shippingMethod) {
                var displayTitle = (cust.shippingOptionLabel && cust.shippingOptionLabel.trim()) || '';
                var displayNum = cust.shippingOptionNumber || 1;
                if (displayTitle) {
                  selectedLabel = displayNum + '. ' + displayTitle;
                  cLines.push('Pilihan: ' + selectedLabel);
                  if (cust.arrivalTime && cust.arrivalTime.trim()) {
                    cLines.push(((cust.arrivalTimeLabel && cust.arrivalTimeLabel.trim()) || 'Waktu') + ': ' + cust.arrivalTime.trim());
                  }
                  if (cust.guestCount && cust.guestCount.trim()) {
                    cLines.push(((cust.guestCountLabel && cust.guestCountLabel.trim()) || 'Jumlah Orang') + ': ' + cust.guestCount.trim());
                  }
                  if (Array.isArray(cust.checklistCheckedItems) && cust.checklistCheckedItems.length) {
                    cLines.push('Konfirmasi Checklist:');
                    cust.checklistCheckedItems.forEach(function (txt) {
                      if (txt && txt.trim()) cLines.push('- [✓] ' + txt.trim());
                    });
                  } else if (cust.checklistConfirmed && cust.checklistText && cust.checklistText.trim()) {
                    cLines.push('Konfirmasi: [✓] ' + cust.checklistText.trim());
                  }
                  if (cust.pickupNote && cust.pickupNote.trim()) {
                    cLines.push('Info Produk: ' + cust.pickupNote.trim());
                  }
                  if (cust.shippingNote && cust.shippingNote.trim()) {
                    var nHead = ((cust.shippingNoteTitle && cust.shippingNoteTitle.trim()) || 'Catatan:').replace(/:+$/, '');
                    cLines.push(nHead + ': ' + cust.shippingNote.trim());
                  }
                }
              }
              if (cLines.length) {
                lines.push('');
                lines.push(selectedLabel ? '*Data Pemesan & Pilihan:*' : '*Data Pemesan:*');
                cLines.forEach(function (cl) { lines.push(cl); });
              }
            }
            return 'https://wa.me/' + phone + '?text=' + encodeURIComponent(lines.join('\\n'));
          }
          function showToast(msg) {
            if (!toastEl) return;
            toastEl.textContent = msg;
            toastEl.style.display = 'block';
            if (toastTimer) clearTimeout(toastTimer);
            toastTimer = setTimeout(function () { toastEl.style.display = 'none'; }, 1800);
          }
          function getCartTotals() {
            var count = 0;
            var sum = 0;
            cart.forEach(function (c) {
              count += c.qty;
              sum += c.unitPrice * c.qty;
            });
            return { count: count, sum: sum };
          }
          function syncFnbUi(totals) {
            var qtyMap = {};
            cart.forEach(function (c) {
              var k = c.blockId + '::' + c.itemId;
              qtyMap[k] = (qtyMap[k] || 0) + c.qty;
            });
            document.querySelectorAll('[data-fnb-add]').forEach(function (btn) {
              var key = btn.getAttribute('data-fnb-add') || '';
              var q = qtyMap[key] || 0;
              btn.style.display = q > 0 ? 'none' : (btn.getAttribute('data-add-display') || 'inline-block');
            });
            document.querySelectorAll('[data-fnb-stepper]').forEach(function (st) {
              var key = st.getAttribute('data-fnb-stepper') || '';
              var q = qtyMap[key] || 0;
              st.style.display = q > 0 ? 'inline-flex' : 'none';
            });
            document.querySelectorAll('[data-fnb-qty]').forEach(function (el) {
              var key = el.getAttribute('data-fnb-qty') || '';
              el.textContent = String(qtyMap[key] || 0);
            });

            var sheetOpen = Boolean(document.querySelector('[data-bottom-sheet].is-open'));
            var floatCfg = storeData.fnbFloatConfig;
            var useFnbCapsule = Boolean(fnbFloatBar && floatCfg && (totals.count > 0 || floatCfg.alwaysShowWhenEmpty) && activeRoute.type !== 'cart');
            if (fnbFloatBar) {
              if (!useFnbCapsule) {
                fnbFloatBar.style.display = 'none';
              } else {
                var pos = floatCfg.position || 'bottom-floating';
                var off = Math.max(0, Math.min(120, Number(floatCfg.offsetY || 16)));
                var navH = sheetOpen ? 0 : Number(storeData.navReservedHeight || 0);
                var isTop = pos === 'top-floating' || pos === 'top-left' || pos === 'top-right';
                var isDocked = pos === 'bottom-docked';
                var isLeft = pos === 'bottom-left' || pos === 'top-left';
                var isRight = pos === 'bottom-right' || pos === 'top-right';
                fnbFloatBar.style.display = 'flex';
                fnbFloatBar.style.justifyContent = isLeft ? 'flex-start' : isRight ? 'flex-end' : 'center';
                fnbFloatBar.style.paddingLeft = isDocked ? '0' : '14px';
                fnbFloatBar.style.paddingRight = isDocked ? '0' : '14px';
                if (isTop) {
                  fnbFloatBar.style.top = off + 'px';
                  fnbFloatBar.style.bottom = 'auto';
                } else {
                  fnbFloatBar.style.top = 'auto';
                  fnbFloatBar.style.bottom = (isDocked ? navH : (navH > 0 ? navH + off : off)) + 'px';
                }
                if (fnbFloatBtn) {
                  fnbFloatBtn.style.background = floatCfg.bgColor || theme.accentColor || '#EA580C';
                  fnbFloatBtn.style.borderRadius = isDocked ? '0px' : '9999px';
                  fnbFloatBtn.style.width = isLeft || isRight ? 'auto' : '100%';
                  fnbFloatBtn.style.maxWidth = isDocked ? '100%' : isLeft || isRight ? '300px' : '400px';
                }
                if (fnbFloatCount) fnbFloatCount.textContent = totals.count + ' item';
                if (fnbFloatTotal) fnbFloatTotal.textContent = totals.sum > 0 ? formatRp(totals.sum) : (totals.count === 0 ? 'Rp 0' : 'Siap pesan');
                if (fnbFloatLabel) fnbFloatLabel.textContent = floatCfg.actionLabel || 'Lanjut';
              }
            }
            return useFnbCapsule;
          }
          function syncCartBar() {
            var totals = getCartTotals();
            var useFnbCapsule = syncFnbUi(totals);
            var showBar = !useFnbCapsule && totals.count > 0 && activeRoute.type !== 'cart';
            var sheetOpen = Boolean(document.querySelector('[data-bottom-sheet].is-open'));
            var rawNavH = Number(storeData.navReservedHeight || 0);
            var effNavH = sheetOpen ? 0 : rawNavH;
            if (cartBar) {
              cartBar.style.display = showBar ? 'block' : 'none';
              cartBar.style.bottom = (effNavH > 0 ? (effNavH + 2) : 0) + 'px';
              if (cartBarCount) cartBarCount.textContent = totals.count + ' item di keranjang';
              if (cartBarTotal) cartBarTotal.textContent = totals.sum > 0 ? formatRp(totals.sum) : 'Siap pesan via WA';
            }
            var hasAnyFloat = (showBar || useFnbCapsule);
            var basePad = rawNavH > 0 ? (rawNavH + 36) : 24;
            document.body.style.paddingBottom = (hasAnyFloat ? basePad + 72 : basePad) + 'px';
            var waFloatBtn = document.getElementById('lynk-wa-addon-btn');
            if (waFloatBtn) waFloatBtn.style.bottom = (rawNavH > 0 ? (rawNavH + (hasAnyFloat ? 82 : 16)) : (hasAnyFloat ? 82 : 18)) + 'px';
          }
          window.__lynkSyncCart = syncCartBar;
          function addCartItem(blockId, item, variant, qty) {
            var cfg = catalogs[blockId];
            var v = variant || '';
            var key = blockId + '::' + item.id + '::' + v;
            var q = Math.max(1, qty || 1);
            var existing = null;
            for (var i = 0; i < cart.length; i++) {
              if (cart[i].key === key) { existing = cart[i]; break; }
            }
            if (existing) {
              existing.qty += q;
            } else {
              cart.push({
                key: key,
                blockId: blockId,
                itemId: item.id,
                title: item.title,
                priceText: item.price,
                unitPrice: parsePrice(item.price),
                image: item.image,
                variant: v,
                qty: q,
                productType: resolveProductType(cfg, item),
                pickupNote: (item && item.pickupNote ? String(item.pickupNote).trim() : '')
              });
            }
            syncCartBar();
            showToast('"' + item.title + '" masuk ke keranjang');
          }
          window.__lynkAddCartItem = addCartItem;
          function findItem(blockId, itemId) {
            var cfg = catalogs[blockId];
            if (!cfg || !cfg.items) return null;
            for (var i = 0; i < cfg.items.length; i++) {
              if (cfg.items[i].id === itemId) return { cfg: cfg, item: cfg.items[i] };
            }
            return null;
          }
          function getFirstCatalogCfg() {
            if (cart.length && catalogs[cart[0].blockId]) return catalogs[cart[0].blockId];
            var keys = Object.keys(catalogs);
            return keys.length ? catalogs[keys[0]] : null;
          }
          function renderDetailPage(blockId, itemId) {
            var found = findItem(blockId, itemId);
            if (!found) { goHome(); return; }
            var cfg = found.cfg;
            var item = found.item;
            var variants = parseVars(item.variants);
            var selectedVar = variants.length ? variants[0] : '';
            var qty = 1;
            var photos = [item.image].concat(Array.isArray(item.gallery) ? item.gallery : []).filter(Boolean);
            var activePhoto = 0;
            var totals = getCartTotals();

            var thumbsHtml = photos.length > 1
              ? '<div style="padding:10px; display:flex; gap:8px; overflow-x:auto; border-top:1px solid ' + esc(theme.borderColor) + ';">' +
                  photos.map(function (src, idx) {
                    return '<button type="button" data-det-thumb="' + idx + '" style="width:54px; height:54px; padding:0; border-radius:8px; overflow:hidden; border:2px solid ' + (idx === 0 ? esc(theme.accentColor) : esc(theme.borderColor)) + '; cursor:pointer; flex-shrink:0;"><img src="' + esc(src) + '" alt="" style="width:100%; height:100%; object-fit:cover; display:block;" /></button>';
                  }).join('') +
                '</div>'
              : '';

            var varsHtml = variants.length
              ? '<div style="padding-top:12px; border-top:1px solid ' + esc(theme.borderColor) + ';"><div style="font-size:12px; font-weight:600; opacity:0.8; margin-bottom:8px;">Pilih Varian:</div><div style="display:flex; flex-wrap:wrap; gap:6px;">' +
                  variants.map(function (v, idx) {
                    var on = idx === 0;
                    return '<button type="button" data-det-var="' + esc(v) + '" style="padding:6px 12px; border-radius:8px; font-size:12px; font-weight:600; cursor:pointer; border:1px solid ' + (on ? esc(theme.accentColor) : esc(theme.borderColor)) + '; background:' + (on ? esc(theme.accentColor) : 'transparent') + '; color:' + (on ? '#FFFFFF' : esc(theme.textColor)) + ';">' + esc(v) + '</button>';
                  }).join('') +
                '</div></div>'
              : '';

            var safeItemUrl = safeHref(item.url, '');
            var hasCustomUrl = Boolean(safeItemUrl) && item.url.indexOf('https://example.com') !== 0;
            var soldHtml = storeData.showUnitSold ? '<span style="font-size:12px; opacity:0.65;"> · ' + esc(item.unitSold) + ' terjual</span>' : '';

            detailView.innerHTML =
              '<div style="display:flex; flex-direction:column; gap:14px;">' +
                '<div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">' +
                  '<button type="button" data-nav-home style="padding:7px 12px; border-radius:12px; border:1px solid ' + esc(theme.borderColor) + '; background:' + esc(theme.cardBg) + '; color:' + esc(theme.textColor) + '; font-size:12px; font-weight:600; cursor:pointer;">&larr; Kembali</button>' +
                  (cfg.cartEnabled ? '<button type="button" data-nav-cart style="padding:7px 12px; border-radius:12px; border:1px solid ' + esc(theme.borderColor) + '; background:' + esc(theme.cardBg) + '; color:' + esc(theme.textColor) + '; font-size:12px; font-weight:600; cursor:pointer;">Keranjang (<span id="lynk-det-cart-count">' + totals.count + '</span>)</button>' : '') +
                '</div>' +
                '<div style="background:' + esc(theme.cardBg) + '; border:1px solid ' + esc(theme.borderColor) + '; border-radius:16px; overflow:hidden;">' +
                  '<div style="position:relative; background:#F1F5F9;">' +
                    (item.badge && item.badge.trim() ? '<span style="position:absolute; top:12px; left:12px; z-index:2; padding:4px 10px; border-radius:8px; font-size:11px; font-weight:700; color:#FFFFFF; background:' + esc(theme.accentColor) + ';">' + esc(item.badge.trim()) + '</span>' : '') +
                    '<img id="lynk-det-main-img" src="' + esc(photos[0] || item.image) + '" alt="' + esc(item.title) + '" style="width:100%; aspect-ratio:4/3; object-fit:cover; display:block;" />' +
                  '</div>' +
                  thumbsHtml +
                '</div>' +
                '<div style="background:' + esc(theme.cardBg) + '; border:1px solid ' + esc(theme.borderColor) + '; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:12px;">' +
                  '<div>' +
                    '<h1 style="margin:0; font-size:18px; font-weight:700; line-height:1.35;">' + esc(item.title) + '</h1>' +
                    (item.subtitle ? '<p style="margin:4px 0 0; font-size:12px; opacity:0.75;">' + esc(item.subtitle) + '</p>' : '') +
                    '<div style="margin-top:8px; display:flex; align-items:baseline; gap:8px;">' +
                      '<span style="font-size:18px; font-weight:700; color:' + esc(theme.accentColor) + ';">' + esc(item.price) + '</span>' +
                      soldHtml +
                    '</div>' +
                  '</div>' +
                  varsHtml +
                  (cfg.cartEnabled
                    ? '<div style="display:flex; align-items:center; justify-content:space-between; padding-top:12px; border-top:1px solid ' + esc(theme.borderColor) + ';">' +
                        '<span style="font-size:12px; font-weight:600; opacity:0.8;">Jumlah</span>' +
                        '<div style="display:inline-flex; align-items:center; gap:8px;">' +
                          '<button type="button" id="lynk-det-minus" style="width:32px; height:32px; border-radius:8px; border:1px solid ' + esc(theme.borderColor) + '; background:transparent; color:' + esc(theme.textColor) + '; font-size:14px; font-weight:700; cursor:pointer;">-</button>' +
                          '<span id="lynk-det-qty" style="min-width:24px; text-align:center; font-size:14px; font-weight:700;">1</span>' +
                          '<button type="button" id="lynk-det-plus" style="width:32px; height:32px; border-radius:8px; border:1px solid ' + esc(theme.borderColor) + '; background:transparent; color:' + esc(theme.textColor) + '; font-size:14px; font-weight:700; cursor:pointer;">+</button>' +
                        '</div>' +
                      '</div>'
                    : '') +
                  (item.description && item.description.trim()
                    ? '<div style="padding-top:12px; border-top:1px solid ' + esc(theme.borderColor) + ';"><div style="font-size:12px; font-weight:600; opacity:0.8; margin-bottom:4px;">Deskripsi Produk</div><div style="font-size:13px; line-height:1.6; opacity:0.9; white-space:pre-line;">' + esc(item.description) + '</div></div>'
                    : '') +
                  '<div style="padding-top:8px; display:flex; flex-direction:column; gap:8px;">' +
                    (cfg.cartEnabled
                      ? '<button type="button" id="lynk-det-add" style="width:100%; padding:11px 16px; border:0; border-radius:12px; background:' + esc(theme.accentColor) + '; color:#FFFFFF; font-size:13px; font-weight:700; cursor:pointer;">Tambah ke Keranjang</button>' +
                        '<a id="lynk-det-wa" href="#" target="_blank" rel="noopener noreferrer" style="width:100%; box-sizing:border-box; padding:11px 16px; border-radius:12px; background:#059669; color:#FFFFFF; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:8px; text-align:center; text-decoration:none;">Pesan Langsung via WhatsApp</a>'
                      : '') +
                    (hasCustomUrl
                      ? '<a href="' + esc(safeItemUrl) + '" target="_blank" rel="noopener noreferrer" style="width:100%; box-sizing:border-box; padding:10px 16px; border-radius:12px; border:1px solid ' + esc(theme.borderColor) + '; color:' + esc(theme.textColor) + '; font-size:12px; font-weight:600; display:flex; align-items:center; justify-content:center; text-align:center; text-decoration:none;">' + esc(cfg.cartEnabled ? 'Kunjungi Tautan Produk' : (item.ctaLabel || 'Buka Tautan')) + '</a>'
                      : '') +
                  '</div>' +
                '</div>' +
              '</div>';

            function syncDirectWa() {
              var waLink = document.getElementById('lynk-det-wa');
              if (!waLink) return;
              var unitP = parsePrice(item.price);
              waLink.setAttribute('data-lynk-order-value', String(unitP * qty));
              waLink.href = buildWaUrl(cfg, [{
                title: item.title,
                priceText: item.price,
                unitPrice: unitP,
                variant: selectedVar,
                qty: qty,
                productType: resolveProductType(cfg, item)
              }], null);
            }
            syncDirectWa();

            var detHome = detailView.querySelector('[data-nav-home]');
            if (detHome) detHome.addEventListener('click', goHome);
            var navCart = detailView.querySelector('[data-nav-cart]');
            if (navCart) navCart.addEventListener('click', openCart);

            detailView.querySelectorAll('[data-det-thumb]').forEach(function (tBtn) {
              tBtn.addEventListener('click', function () {
                activePhoto = Number(tBtn.getAttribute('data-det-thumb') || 0);
                var mainImg = document.getElementById('lynk-det-main-img');
                if (mainImg && photos[activePhoto]) mainImg.src = photos[activePhoto];
                detailView.querySelectorAll('[data-det-thumb]').forEach(function (b, idx) {
                  b.style.borderColor = idx === activePhoto ? (theme.accentColor || '#2563EB') : (theme.borderColor || '#E2E8F0');
                });
              });
            });

            detailView.querySelectorAll('[data-det-var]').forEach(function (vBtn) {
              vBtn.addEventListener('click', function () {
                selectedVar = vBtn.getAttribute('data-det-var') || '';
                detailView.querySelectorAll('[data-det-var]').forEach(function (b) {
                  var on = (b.getAttribute('data-det-var') || '') === selectedVar;
                  b.style.background = on ? (theme.accentColor || '#2563EB') : 'transparent';
                  b.style.borderColor = on ? (theme.accentColor || '#2563EB') : (theme.borderColor || '#E2E8F0');
                  b.style.color = on ? '#FFFFFF' : (theme.textColor || '#0F172A');
                });
                syncDirectWa();
              });
            });

            var minusBtn = document.getElementById('lynk-det-minus');
            var plusBtn = document.getElementById('lynk-det-plus');
            var qtyEl = document.getElementById('lynk-det-qty');
            if (minusBtn && qtyEl) {
              minusBtn.addEventListener('click', function () {
                qty = Math.max(1, qty - 1);
                qtyEl.textContent = String(qty);
                syncDirectWa();
              });
            }
            if (plusBtn && qtyEl) {
              plusBtn.addEventListener('click', function () {
                qty += 1;
                qtyEl.textContent = String(qty);
                syncDirectWa();
              });
            }
            var addBtn = document.getElementById('lynk-det-add');
            if (addBtn) {
              addBtn.addEventListener('click', function () {
                addCartItem(blockId, item, selectedVar, qty);
                var cBadge = document.getElementById('lynk-det-cart-count');
                if (cBadge) cBadge.textContent = String(getCartTotals().count);
              });
            }
          }

          function renderCartPage() {
            var cfg = getFirstCatalogCfg() || { whatsappNumber: '6281234567890', storeName: storeData.projectTitle, whatsappIntro: '', askCustomerInfo: true };
            var totals = getCartTotals();

            if (!cart.length) {
              cartView.innerHTML =
                '<div style="display:flex; flex-direction:column; gap:14px;">' +
                  '<div><button type="button" data-nav-home style="padding:7px 12px; border-radius:12px; border:1px solid ' + esc(theme.borderColor) + '; background:' + esc(theme.cardBg) + '; color:' + esc(theme.textColor) + '; font-size:12px; font-weight:600; cursor:pointer;">&larr; Kembali</button></div>' +
                  '<div style="background:' + esc(theme.cardBg) + '; border:1px solid ' + esc(theme.borderColor) + '; border-radius:16px; padding:32px 20px; text-align:center;">' +
                    '<div style="font-size:15px; font-weight:700; margin-bottom:6px;">Keranjang masih kosong</div>' +
                    '<p style="margin:0 0 16px; font-size:12px; opacity:0.7;">Pilih produk dari katalog terlebih dahulu untuk memesan via WhatsApp.</p>' +
                    '<button type="button" data-nav-home style="padding:9px 16px; border:0; border-radius:12px; background:' + esc(theme.accentColor) + '; color:#FFFFFF; font-size:12px; font-weight:600; cursor:pointer;">Lihat Katalog Produk</button>' +
                  '</div>' +
                '</div>';
              cartView.querySelectorAll('[data-nav-home]').forEach(function (b) { b.addEventListener('click', goHome); });
              return;
            }

            var itemsHtml = cart.map(function (entry) {
              var linePrice = entry.unitPrice > 0 ? formatRp(entry.unitPrice * entry.qty) : entry.priceText;
              return (
                '<div style="padding:12px; display:flex; align-items:flex-start; gap:12px; border-bottom:1px solid ' + esc(theme.borderColor) + ';">' +
                  '<img src="' + esc(entry.image) + '" alt="' + esc(entry.title) + '" style="width:56px; height:56px; border-radius:12px; object-fit:cover; background:#F1F5F9; flex-shrink:0;" />' +
                  '<div style="min-width:0; flex:1;">' +
                    '<div style="display:flex; justify-content:space-between; align-items:flex-start; gap:8px;">' +
                      '<div style="min-width:0;">' +
                        '<div style="font-size:13px; font-weight:700;">' + esc(entry.title) + '</div>' +
                        (entry.variant ? '<div style="font-size:11px; opacity:0.7;">Varian: ' + esc(entry.variant) + '</div>' : '') +
                      '</div>' +
                      '<button type="button" data-cart-del="' + esc(entry.key) + '" aria-label="Hapus item" style="border:0; background:transparent; color:#94A3B8; font-size:14px; font-weight:700; cursor:pointer; padding:2px 6px;">✕</button>' +
                    '</div>' +
                    '<div style="display:flex; justify-content:space-between; align-items:center; gap:8px; margin-top:8px;">' +
                      '<div style="font-size:13px; font-weight:700; color:' + esc(theme.accentColor) + ';">' + esc(linePrice) + '</div>' +
                      '<div style="display:inline-flex; align-items:center; gap:6px;">' +
                        '<button type="button" data-cart-dec="' + esc(entry.key) + '" style="width:26px; height:26px; border-radius:6px; border:1px solid ' + esc(theme.borderColor) + '; background:transparent; color:' + esc(theme.textColor) + '; font-weight:700; cursor:pointer;">-</button>' +
                        '<span style="min-width:20px; text-align:center; font-size:12px; font-weight:700;">' + entry.qty + '</span>' +
                        '<button type="button" data-cart-inc="' + esc(entry.key) + '" style="width:26px; height:26px; border-radius:6px; border:1px solid ' + esc(theme.borderColor) + '; background:transparent; color:' + esc(theme.textColor) + '; font-weight:700; cursor:pointer;">+</button>' +
                      '</div>' +
                    '</div>' +
                  '</div>' +
                '</div>'
              );
            }).join('');

            var hasPhysical = cart.some(function (c) { return isPhysicalType(c.productType); });
            var enabledOpts = getEnabledShipOptions(cfg);
            var showChoices = cfg.shippingEnabled !== false && hasPhysical && enabledOpts.length > 0;
            var selIdx = -1;
            for (var ei = 0; ei < enabledOpts.length; ei++) {
              if (enabledOpts[ei].id === (customer.shippingMethod || 'makan_ditempat')) { selIdx = ei; break; }
            }
            if (selIdx < 0) selIdx = 0;
            var activeOpt = enabledOpts[selIdx] || null;
            if (activeOpt && customer.shippingMethod !== activeOpt.id) {
              customer.shippingMethod = activeOpt.id;
            }
            var pickupNoteText = collectPickupNotes(cart).join('; ');

            var inputStyle = 'width:100%; box-sizing:border-box; padding:9px 12px; border-radius:12px; border:1px solid ' + esc(theme.borderColor) + '; background:transparent; color:' + esc(theme.textColor) + '; font-size:12px; font-family:inherit; outline:none;';
            var custFields = getCustomerFields(cfg);
            var customerFormHtml = (cfg.askCustomerInfo !== false && custFields.length > 0)
              ? '<div style="background:' + esc(theme.cardBg) + '; border:1px solid ' + esc(theme.borderColor) + '; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:10px;">' +
                  '<div style="font-size:13px; font-weight:700;">Data Pemesan</div>' +
                  custFields.map(function (cf) {
                    var val = customer.customValues[cf.id] || '';
                    var reqMark = cf.required ? ' *' : '';
                    var ctrl = cf.type === 'textarea'
                      ? '<textarea rows="2" data-cust-field="' + esc(cf.id) + '" placeholder="' + esc(cf.placeholder || cf.label) + '" style="' + inputStyle + ' resize:vertical;">' + esc(val) + '</textarea>'
                      : '<input type="' + esc(cf.type || 'text') + '" data-cust-field="' + esc(cf.id) + '" placeholder="' + esc(cf.placeholder || cf.label) + '" value="' + esc(val) + '" style="' + inputStyle + '" />';
                    return '<div style="display:flex; flex-direction:column; gap:4px;"><label style="font-size:11px; font-weight:600; opacity:0.8;">' + esc(cf.label + reqMark) + '</label>' + ctrl + '</div>';
                  }).join('') +
                '</div>'
              : '';

            var fieldInputStyle = 'width:100%; box-sizing:border-box; padding:7px 10px; border-radius:8px; border:1px solid ' + esc(theme.borderColor) + '; background:' + esc(theme.cardBg) + '; color:' + esc(theme.textColor) + '; font-size:12px; font-family:inherit; outline:none;';
            var shipCardsHtml = enabledOpts.map(function (opt, idx) {
              var on = activeOpt && activeOpt.id === opt.id;
              var optChks = getOptionChecklists(opt);
              var subFieldsHtml = '';
              if (on) {
                var inputsParts = [];
                if (opt.askArrivalTime) {
                  inputsParts.push(
                    '<div style="flex:1; min-width:0;">' +
                      '<label style="display:block; font-size:11px; font-weight:600; opacity:0.8; margin-bottom:4px;">' + esc((opt.arrivalTimeLabel || 'Waktu') + (opt.arrivalTimeRequired ? ' *' : '')) + '</label>' +
                      '<input id="lynk-ship-time" type="text" value="' + esc(customer.arrivalTime) + '" placeholder="' + esc(opt.arrivalTimePlaceholder || 'Contoh: 18:30 WIB') + '" style="' + fieldInputStyle + '" />' +
                    '</div>'
                  );
                }
                if (opt.askGuestCount) {
                  inputsParts.push(
                    '<div style="flex:1; min-width:0;">' +
                      '<label style="display:block; font-size:11px; font-weight:600; opacity:0.8; margin-bottom:4px;">' + esc((opt.guestCountLabel || 'Jumlah Orang') + (opt.guestCountRequired ? ' *' : '')) + '</label>' +
                      '<input id="lynk-ship-guests" type="text" value="' + esc(customer.guestCount) + '" placeholder="' + esc(opt.guestCountPlaceholder || 'Contoh: 4 orang') + '" style="' + fieldInputStyle + '" />' +
                    '</div>'
                  );
                }
                var gridInputsHtml = inputsParts.length
                  ? '<div style="display:flex; gap:8px;">' + inputsParts.join('') + '</div>'
                  : '';
                var checkHtml = (opt.checklistEnabled && optChks.length > 0)
                  ? '<div style="display:flex; flex-direction:column; gap:6px;">' +
                      (opt.checklistRequired ? '<div style="font-size:11px; font-weight:700; opacity:0.85;">Checklist Wajib Dicentang <span style="color:#DC2626;">*</span></div>' : '') +
                      optChks.map(function (chkText, cIdx) {
                        var isChk = Boolean(customer.checklistChecked[cIdx]);
                        return '<label style="display:flex; align-items:flex-start; gap:8px; padding:8px 10px; border-radius:8px; border:1px solid ' + (isChk ? '#10B981' : esc(theme.borderColor)) + '; background:' + esc(theme.cardBg) + '; cursor:pointer;">' +
                          '<input type="checkbox" data-ship-chk="' + cIdx + '" ' + (isChk ? 'checked' : '') + ' style="margin-top:2px; cursor:pointer; accent-color:#059669;" />' +
                          '<span style="font-size:11px; font-weight:500; line-height:1.45;">' + esc(chkText) + '</span>' +
                        '</label>';
                      }).join('') +
                    '</div>'
                  : '';
                var pickupItemHtml = (opt.id === 'ambil_sendiri' && pickupNoteText)
                  ? '<div style="font-size:11px; font-weight:600; color:#78350F; background:#FFFBEB; border:1px solid #FDE68A; border-radius:8px; padding:6px 10px; line-height:1.4;">Info Produk: ' + esc(pickupNoteText) + '</div>'
                  : '';
                if (gridInputsHtml || checkHtml || pickupItemHtml) {
                  subFieldsHtml = '<div style="padding:0 12px 12px 12px; display:flex; flex-direction:column; gap:8px;">' + gridInputsHtml + checkHtml + pickupItemHtml + '</div>';
                }
              }
              return (
                '<div style="border-radius:12px; border:1px solid ' + (on ? esc(theme.accentColor) : esc(theme.borderColor)) + '; background:' + (on ? esc(theme.accentColor) + '14' : 'transparent') + '; overflow:hidden;">' +
                  '<label data-ship-opt="' + esc(opt.id) + '" style="display:flex; align-items:flex-start; gap:10px; padding:10px 12px; cursor:pointer;">' +
                    '<input type="radio" name="lynk_ship" ' + (on ? 'checked' : '') + ' style="margin-top:2px; cursor:pointer;" />' +
                    '<div style="min-width:0; flex:1; font-size:12px; font-weight:600; line-height:1.35;">' + (idx + 1) + '. ' + esc(opt.label) + '</div>' +
                  '</label>' +
                  subFieldsHtml +
                '</div>'
              );
            }).join('');

            var activeNoteBoxHtml = (activeOpt && activeOpt.noteText && activeOpt.noteText.trim())
              ? '<div style="border-radius:12px; background:#FFFBEB; border:2px solid #FCD34D; padding:12px 14px; color:#451A03;">' +
                  '<div style="font-size:12px; font-weight:700; margin-bottom:4px; color:#78350F;">' + esc((activeOpt.noteTitle && activeOpt.noteTitle.trim()) || 'Catatan:') + '</div>' +
                  '<div style="font-size:12px; font-weight:700; line-height:1.5; color:#451A03; white-space:pre-line;">' + esc(activeOpt.noteText.trim()) + '</div>' +
                '</div>'
              : '';

            var shippingSectionHtml = showChoices
              ? '<div style="background:' + esc(theme.cardBg) + '; border:1px solid ' + esc(theme.borderColor) + '; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:10px;">' +
                  '<div style="font-size:13px; font-weight:700;">Pilihan</div>' +
                  '<div style="display:flex; flex-direction:column; gap:8px;">' + shipCardsHtml + '</div>' +
                  activeNoteBoxHtml +
                '</div>'
              : '';

            function getStoreGroups() {
              var map = {};
              var list = [];
              cart.forEach(function (entry) {
                var cCfg = catalogs[entry.blockId] || cfg;
                var norm = normalizeWa(cCfg && cCfg.whatsappNumber);
                if (!map[norm]) {
                  map[norm] = {
                    phone: norm,
                    cfg: cCfg,
                    storeName: ((cCfg && cCfg.storeName) || storeData.projectTitle || 'Toko').trim(),
                    entries: []
                  };
                  list.push(map[norm]);
                }
                map[norm].entries.push(entry);
              });
              return list;
            }

            var storeGroups = getStoreGroups();
            var waSectionHtml = storeGroups.length <= 1
              ? '<a id="lynk-cart-wa-btn" href="#" target="_blank" rel="noopener noreferrer" style="width:100%; box-sizing:border-box; padding:12px 16px; border-radius:12px; background:#059669; color:#FFFFFF; font-size:13px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:8px; text-align:center; text-decoration:none;">Kirim Pesanan via WhatsApp</a>'
              : '<div style="display:flex; flex-direction:column; gap:8px; padding-top:4px;">' +
                  '<div style="font-size:11px; font-weight:600; color:#92400E; background:#FFFBEB; border:1px solid #FDE68A; border-radius:8px; padding:8px 10px; line-height:1.4;">Keranjang berisi produk dari ' + storeGroups.length + ' nomor WhatsApp berbeda. Kirim pesanan per toko di bawah ini:</div>' +
                  storeGroups.map(function (grp, gi) {
                    var cnt = grp.entries.reduce(function (s, e) { return s + e.qty; }, 0);
                    return '<a data-cart-wa-grp="' + gi + '" href="#" target="_blank" rel="noopener noreferrer" style="width:100%; box-sizing:border-box; padding:10px 16px; border-radius:12px; background:#059669; color:#FFFFFF; font-size:12px; font-weight:700; display:flex; align-items:center; justify-content:center; gap:8px; text-align:center; text-decoration:none;">Kirim ke ' + esc(grp.storeName) + ' (' + cnt + ' item)</a>';
                  }).join('') +
                '</div>';

            cartView.innerHTML =
              '<div style="display:flex; flex-direction:column; gap:14px;">' +
                '<div style="display:flex; align-items:center; justify-content:space-between; gap:8px;">' +
                  '<button type="button" data-nav-home style="padding:7px 12px; border-radius:12px; border:1px solid ' + esc(theme.borderColor) + '; background:' + esc(theme.cardBg) + '; color:' + esc(theme.textColor) + '; font-size:12px; font-weight:600; cursor:pointer;">&larr; Kembali</button>' +
                  '<button type="button" id="lynk-cart-clear" style="padding:7px 10px; border:0; border-radius:10px; background:transparent; color:#DC2626; font-size:12px; font-weight:600; cursor:pointer;">Kosongkan</button>' +
                '</div>' +
                '<div style="background:' + esc(theme.cardBg) + '; border:1px solid ' + esc(theme.borderColor) + '; border-radius:16px; overflow:hidden;">' +
                  itemsHtml +
                '</div>' +
                customerFormHtml +
                shippingSectionHtml +
                '<div style="background:' + esc(theme.cardBg) + '; border:1px solid ' + esc(theme.borderColor) + '; border-radius:16px; padding:16px; display:flex; flex-direction:column; gap:10px;">' +
                  '<div style="display:flex; justify-content:space-between; font-size:12px; opacity:0.75;"><span>Total Item</span><span style="font-weight:600;">' + totals.count + ' produk</span></div>' +
                  '<div style="display:flex; justify-content:space-between; align-items:center;"><span style="font-size:13px; font-weight:700;">Total Estimasi</span><span style="font-size:16px; font-weight:700; color:' + esc(theme.accentColor) + ';">' + (totals.sum > 0 ? formatRp(totals.sum) : 'Sesuai konfirmasi WA') + '</span></div>' +
                  '<div id="lynk-cart-error" style="display:none; font-size:12px; font-weight:600; color:#B91C1C; background:#FEF2F2; border:1px solid #FECACA; border-radius:10px; padding:8px 12px; line-height:1.45;"></div>' +
                  waSectionHtml +
                '</div>' +
              '</div>';

            function buildGroupPayload(gCfg, gItems) {
              var gHasPhysical = gItems.some(function (it) { return isPhysicalType(it.productType); });
              var gOpts = getEnabledShipOptions(gCfg);
              var gShowChoices = gCfg.shippingEnabled !== false && gHasPhysical && gOpts.length > 0;
              var gSelIdx = -1;
              for (var gi = 0; gi < gOpts.length; gi++) {
                if (gOpts[gi].id === (customer.shippingMethod || 'makan_ditempat')) { gSelIdx = gi; break; }
              }
              if (gSelIdx < 0) gSelIdx = 0;
              var gSelOpt = gOpts[gSelIdx] || null;
              var gOptChks = gSelOpt ? getOptionChecklists(gSelOpt) : [];
              var gCheckedItems = gOptChks.filter(function (_, cIdx) { return Boolean(customer.checklistChecked[cIdx]); });
              var gPickupNote = collectPickupNotes(gItems).join('; ');
              if (gCfg.askCustomerInfo === false && !gShowChoices) return null;
              var gCustomFields = getCustomerFields(gCfg).map(function (cf) {
                return { label: cf.label, value: customer.customValues[cf.id] || '' };
              });
              return {
                name: gCfg.askCustomerInfo !== false ? customer.name : '',
                phone: gCfg.askCustomerInfo !== false ? customer.phone : '',
                address: gCfg.askCustomerInfo !== false ? customer.address : '',
                notes: gCfg.askCustomerInfo !== false ? customer.notes : '',
                customFields: gCfg.askCustomerInfo !== false ? gCustomFields : [],
                shippingMethod: gShowChoices && gSelOpt ? gSelOpt.id : '',
                shippingOptionNumber: gShowChoices && gSelOpt ? (gSelIdx + 1) : 1,
                shippingOptionLabel: gShowChoices && gSelOpt ? gSelOpt.label : '',
                arrivalTimeLabel: gShowChoices && gSelOpt && gSelOpt.askArrivalTime ? (gSelOpt.arrivalTimeLabel || 'Waktu') : '',
                arrivalTime: gShowChoices && gSelOpt && gSelOpt.askArrivalTime ? customer.arrivalTime : '',
                guestCountLabel: gShowChoices && gSelOpt && gSelOpt.askGuestCount ? (gSelOpt.guestCountLabel || 'Jumlah Orang') : '',
                guestCount: gShowChoices && gSelOpt && gSelOpt.askGuestCount ? customer.guestCount : '',
                checklistConfirmed: gShowChoices && gSelOpt && gSelOpt.checklistEnabled ? gCheckedItems.length > 0 : false,
                checklistText: gShowChoices && gSelOpt && gSelOpt.checklistEnabled ? (gOptChks[0] || '') : '',
                checklistCheckedItems: gShowChoices && gSelOpt && gSelOpt.checklistEnabled ? gCheckedItems : [],
                pickupNote: gShowChoices && gSelOpt && gSelOpt.id === 'ambil_sendiri' ? gPickupNote : '',
                shippingNoteTitle: gShowChoices && gSelOpt ? (gSelOpt.noteTitle || 'Catatan:') : '',
                shippingNote: gShowChoices && gSelOpt && gSelOpt.noteText ? gSelOpt.noteText.trim() : ''
              };
            }

            function syncCartWa() {
              var groups = getStoreGroups();
              var singleBtn = document.getElementById('lynk-cart-wa-btn');
              if (singleBtn && groups.length > 0) {
                var grpTotal = groups[0].entries.reduce(function (s, e) { return s + (e.unitPrice || 0) * (e.qty || 1); }, 0);
                singleBtn.setAttribute('data-lynk-order-value', String(grpTotal));
                singleBtn.href = buildWaUrl(groups[0].cfg, groups[0].entries, buildGroupPayload(groups[0].cfg, groups[0].entries));
              }
              cartView.querySelectorAll('[data-cart-wa-grp]').forEach(function (btn) {
                var gi = Number(btn.getAttribute('data-cart-wa-grp'));
                var grp = groups[gi];
                if (grp) {
                  var gSum = grp.entries.reduce(function (s, e) { return s + (e.unitPrice || 0) * (e.qty || 1); }, 0);
                  btn.setAttribute('data-lynk-order-value', String(gSum));
                  btn.href = buildWaUrl(grp.cfg, grp.entries, buildGroupPayload(grp.cfg, grp.entries));
                }
              });
            }

            function hideCartError() {
              var errBox = document.getElementById('lynk-cart-error');
              if (errBox) {
                errBox.style.display = 'none';
                errBox.textContent = '';
              }
            }

            function validateCartCheckout(gCfg, gItems) {
              var missing = [];
              if (gCfg && gCfg.askCustomerInfo !== false) {
                var cFields = getCustomerFields(gCfg);
                cFields.forEach(function (cf) {
                  if (cf.required && !String(customer.customValues[cf.id] || '').trim()) {
                    missing.push(cf.label || 'Data Pemesan');
                  }
                });
              }
              var gHasPhysical = gItems.some(function (it) { return isPhysicalType(it.productType); });
              var gOpts = getEnabledShipOptions(gCfg || cfg);
              var gShowChoices = (gCfg ? gCfg.shippingEnabled : cfg.shippingEnabled) !== false && gHasPhysical && gOpts.length > 0;
              if (gShowChoices) {
                var gSelIdx = -1;
                for (var gi = 0; gi < gOpts.length; gi++) {
                  if (gOpts[gi].id === (customer.shippingMethod || 'makan_ditempat')) { gSelIdx = gi; break; }
                }
                if (gSelIdx < 0) gSelIdx = 0;
                var gSelOpt = gOpts[gSelIdx] || null;
                if (gSelOpt) {
                  if (gSelOpt.askArrivalTime && gSelOpt.arrivalTimeRequired && !String(customer.arrivalTime || '').trim()) {
                    missing.push(gSelOpt.arrivalTimeLabel || 'Waktu Kedatangan');
                  }
                  if (gSelOpt.askGuestCount && gSelOpt.guestCountRequired && !String(customer.guestCount || '').trim()) {
                    missing.push(gSelOpt.guestCountLabel || 'Jumlah Orang');
                  }
                  if (gSelOpt.checklistEnabled && gSelOpt.checklistRequired) {
                    var reqChks = getOptionChecklists(gSelOpt);
                    var anyUnchecked = reqChks.some(function (_, cIdx) { return !customer.checklistChecked[cIdx]; });
                    if (reqChks.length > 0 && anyUnchecked) {
                      missing.push('Checklist ' + (gSelOpt.label || 'Konfirmasi'));
                    }
                  }
                }
              }
              var errBox = document.getElementById('lynk-cart-error');
              if (missing.length > 0) {
                if (errBox) {
                  errBox.textContent = 'Mohon lengkapi bagian wajib: ' + missing.join(', ');
                  errBox.style.display = 'block';
                }
                return false;
              }
              hideCartError();
              return true;
            }

            syncCartWa();

            var singleWaBtn = document.getElementById('lynk-cart-wa-btn');
            if (singleWaBtn) {
              singleWaBtn.addEventListener('click', function (ev) {
                var groups = getStoreGroups();
                if (groups.length > 0 && !validateCartCheckout(groups[0].cfg, groups[0].entries)) {
                  ev.preventDefault();
                }
              });
            }
            cartView.querySelectorAll('[data-cart-wa-grp]').forEach(function (btn) {
              btn.addEventListener('click', function (ev) {
                var gi = Number(btn.getAttribute('data-cart-wa-grp'));
                var groups = getStoreGroups();
                var grp = groups[gi];
                if (grp && !validateCartCheckout(grp.cfg, grp.entries)) {
                  ev.preventDefault();
                }
              });
            });

            cartView.querySelectorAll('[data-nav-home]').forEach(function (b) { b.addEventListener('click', goHome); });
            var clearBtn = document.getElementById('lynk-cart-clear');
            if (clearBtn) clearBtn.addEventListener('click', function () { cart = []; syncCartBar(); renderCartPage(); });

            cartView.querySelectorAll('[data-cart-del]').forEach(function (b) {
              b.addEventListener('click', function () {
                var k = b.getAttribute('data-cart-del');
                cart = cart.filter(function (c) { return c.key !== k; });
                syncCartBar();
                renderCartPage();
              });
            });
            cartView.querySelectorAll('[data-cart-inc]').forEach(function (b) {
              b.addEventListener('click', function () {
                var k = b.getAttribute('data-cart-inc');
                cart.forEach(function (c) { if (c.key === k) c.qty += 1; });
                syncCartBar();
                renderCartPage();
              });
            });
            cartView.querySelectorAll('[data-cart-dec]').forEach(function (b) {
              b.addEventListener('click', function () {
                var k = b.getAttribute('data-cart-dec');
                cart = cart.map(function (c) { return c.key === k ? Object.assign({}, c, { qty: c.qty - 1 }) : c; }).filter(function (c) { return c.qty > 0; });
                syncCartBar();
                renderCartPage();
              });
            });

            cartView.querySelectorAll('[data-ship-opt]').forEach(function (lbl) {
              lbl.addEventListener('click', function () {
                var nextMethod = lbl.getAttribute('data-ship-opt') || 'makan_ditempat';
                if (customer.shippingMethod !== nextMethod) {
                  customer.shippingMethod = nextMethod;
                  customer.checklistConfirmed = false;
                  customer.checklistChecked = {};
                  renderCartPage();
                }
              });
            });

            var sTime = document.getElementById('lynk-ship-time');
            var sGuests = document.getElementById('lynk-ship-guests');
            if (sTime) sTime.addEventListener('input', function () { customer.arrivalTime = sTime.value; hideCartError(); syncCartWa(); });
            if (sGuests) sGuests.addEventListener('input', function () { customer.guestCount = sGuests.value; hideCartError(); syncCartWa(); });

            cartView.querySelectorAll('[data-ship-chk]').forEach(function (chkEl) {
              chkEl.addEventListener('change', function () {
                var cIdx = chkEl.getAttribute('data-ship-chk');
                customer.checklistChecked[cIdx] = chkEl.checked;
                if (chkEl.parentElement) {
                  chkEl.parentElement.style.borderColor = chkEl.checked ? '#10B981' : (theme.borderColor || '#E2E8F0');
                }
                hideCartError();
                syncCartWa();
              });
            });

            cartView.querySelectorAll('[data-cust-field]').forEach(function (el) {
              el.addEventListener('input', function () {
                var fid = el.getAttribute('data-cust-field');
                if (fid) {
                  customer.customValues[fid] = el.value;
                  hideCartError();
                  syncCartWa();
                }
              });
            });
          }

          var pageHistory = ['home'];
          function findCustomPageEl(pageId) {
            if (!pageId) return null;
            var nodes = document.querySelectorAll('[data-custom-page]');
            for (var i = 0; i < nodes.length; i++) {
              if (nodes[i].getAttribute('data-custom-page') === pageId) return nodes[i];
            }
            return null;
          }
          function hideAllCustomPages() {
            document.querySelectorAll('[data-custom-page]').forEach(function (pgEl) {
              pgEl.style.display = 'none';
            });
          }
          function applyView(route, pushHash) {
            activeRoute = route;
            if (typeof closeAllBottomSheets === 'function') closeAllBottomSheets();
            hideAllCustomPages();
            if (route.type === 'detail') {
              mainView.style.display = 'none';
              cartView.style.display = 'none';
              detailView.style.display = 'block';
              renderDetailPage(route.blockId, route.itemId);
              var targetDetHash = '#produk-' + encodeURIComponent(route.blockId) + '--' + encodeURIComponent(route.itemId);
              if (pushHash && location.hash !== targetDetHash) location.hash = targetDetHash;
            } else if (route.type === 'cart') {
              mainView.style.display = 'none';
              detailView.style.display = 'none';
              cartView.style.display = 'block';
              renderCartPage();
              if (pushHash && location.hash !== '#keranjang') location.hash = '#keranjang';
            } else if (route.type === 'page' && route.pageId) {
              var pgNode = findCustomPageEl(route.pageId);
              if (pgNode) {
                mainView.style.display = 'none';
                detailView.style.display = 'none';
                cartView.style.display = 'none';
                pgNode.style.display = 'block';
                var targetPageHash = '#halaman-' + encodeURIComponent(route.pageId);
                if (pushHash && location.hash !== targetPageHash) location.hash = targetPageHash;
              } else {
                activeRoute = { type: 'home', blockId: '', itemId: '' };
                detailView.style.display = 'none';
                cartView.style.display = 'none';
                mainView.style.display = 'block';
                if (pushHash && location.hash) history.replaceState(null, '', location.pathname + location.search);
              }
            } else {
              detailView.style.display = 'none';
              cartView.style.display = 'none';
              mainView.style.display = 'block';
              if (pushHash && location.hash) history.replaceState(null, '', location.pathname + location.search);
            }
            syncCartBar();
            if (typeof window.scrollTo === 'function') {
              try { window.scrollTo({ top: 0, behavior: 'smooth' }); } catch (e) { window.scrollTo(0, 0); }
            }
          }
          function goHome() {
            pageHistory = ['home'];
            applyView({ type: 'home', blockId: '', itemId: '' }, true);
          }
          function openCustomPage(pageId, pushHistory) {
            if (!pageId || pageId === 'home') {
              goHome();
              return;
            }
            if (!findCustomPageEl(pageId)) return;
            if (pushHistory !== false && pageHistory[pageHistory.length - 1] !== pageId) {
              pageHistory.push(pageId);
            }
            applyView({ type: 'page', pageId: pageId, blockId: '', itemId: '' }, true);
          }
          function goBackCustomPage(explicitTarget) {
            if (explicitTarget === 'home') {
              goHome();
              return;
            }
            if (explicitTarget && findCustomPageEl(explicitTarget)) {
              openCustomPage(explicitTarget, true);
              return;
            }
            if (pageHistory.length > 1) {
              pageHistory.pop();
            }
            var prev = pageHistory[pageHistory.length - 1] || 'home';
            if (prev === 'home') {
              goHome();
            } else {
              applyView({ type: 'page', pageId: prev, blockId: '', itemId: '' }, true);
            }
          }
          window.__lynkGoHome = goHome;
          window.__lynkOpenPage = openCustomPage;
          window.__lynkBackPage = goBackCustomPage;
          function openCart() {
            applyView({ type: 'cart', blockId: '', itemId: '' }, true);
          }
          function syncFromHash() {
            var h = location.hash || '';
            if (h === '#keranjang') {
              if (activeRoute.type === 'cart') return;
              applyView({ type: 'cart', blockId: '', itemId: '' }, false);
            } else if (h.indexOf('#halaman-') === 0) {
              var pId = decodeURIComponent(h.slice('#halaman-'.length));
              if (activeRoute.type === 'page' && activeRoute.pageId === pId) return;
              if (findCustomPageEl(pId)) {
                if (pageHistory[pageHistory.length - 1] !== pId) pageHistory.push(pId);
                applyView({ type: 'page', pageId: pId, blockId: '', itemId: '' }, false);
                return;
              }
              if (activeRoute.type === 'home') return;
              applyView({ type: 'home', blockId: '', itemId: '' }, false);
            } else if (h.indexOf('#produk-') === 0) {
              var raw = h.slice('#produk-'.length);
              var sep = raw.indexOf('--');
              if (sep > 0) {
                var bId = decodeURIComponent(raw.slice(0, sep));
                var iId = decodeURIComponent(raw.slice(sep + 2));
                if (activeRoute.type === 'detail' && activeRoute.blockId === bId && activeRoute.itemId === iId) return;
                if (findItem(bId, iId)) {
                  applyView({ type: 'detail', blockId: bId, itemId: iId }, false);
                  return;
                }
              }
              if (activeRoute.type === 'home') return;
              applyView({ type: 'home', blockId: '', itemId: '' }, false);
            } else {
              if (activeRoute.type === 'home') return;
              applyView({ type: 'home', blockId: '', itemId: '' }, false);
            }
          }

          function parsePairAttr(raw) {
            if (!raw) return null;
            var sep = raw.indexOf('::');
            if (sep <= 0) return null;
            var bId = raw.slice(0, sep);
            var iId = raw.slice(sep + 2);
            if (!bId || !iId) return null;
            return [bId, iId];
          }

          document.addEventListener('click', function (e) {
            var target = e.target;
            if (!target || !target.closest) return;

            var quickBtn = target.closest('[data-quick-add]');
            if (quickBtn) {
              e.preventDefault();
              e.stopPropagation();
              var qParts = parsePairAttr(quickBtn.getAttribute('data-quick-add'));
              if (!qParts) return;
              var qFound = findItem(qParts[0], qParts[1]);
              if (!qFound) return;
              var qVars = parseVars(qFound.item.variants);
              addCartItem(qParts[0], qFound.item, qVars.length ? qVars[0] : '', 1);
              return;
            }

            var fnbAddBtn = target.closest('[data-fnb-add]');
            if (fnbAddBtn) {
              e.preventDefault();
              e.stopPropagation();
              var faParts = parsePairAttr(fnbAddBtn.getAttribute('data-fnb-add'));
              if (!faParts) return;
              var faFound = findItem(faParts[0], faParts[1]);
              if (!faFound) return;
              addCartItem(faParts[0], faFound.item, '', 1);
              return;
            }

            var fnbIncBtn = target.closest('[data-fnb-inc]');
            if (fnbIncBtn) {
              e.preventDefault();
              e.stopPropagation();
              var fiParts = parsePairAttr(fnbIncBtn.getAttribute('data-fnb-inc'));
              if (!fiParts) return;
              var targetIncKey = fiParts[0] + '::' + fiParts[1] + '::';
              var foundIncCart = null;
              for (var i = 0; i < cart.length; i++) {
                if (cart[i].key === targetIncKey) { foundIncCart = cart[i]; break; }
              }
              if (foundIncCart) {
                foundIncCart.qty += 1;
                syncCartBar();
              } else {
                var fiFound = findItem(fiParts[0], fiParts[1]);
                if (fiFound) addCartItem(fiParts[0], fiFound.item, '', 1);
              }
              return;
            }

            var fnbDecBtn = target.closest('[data-fnb-dec]');
            if (fnbDecBtn) {
              e.preventDefault();
              e.stopPropagation();
              var fdParts = parsePairAttr(fnbDecBtn.getAttribute('data-fnb-dec'));
              if (!fdParts) return;
              var targetDecKey = fdParts[0] + '::' + fdParts[1] + '::';
              cart = cart.map(function (c) { return c.key === targetDecKey ? Object.assign({}, c, { qty: c.qty - 1 }) : c; }).filter(function (c) { return c.qty > 0; });
              syncCartBar();
              return;
            }

            if (!target.closest('button, a, input, textarea, select')) {
              var detailCard = target.closest('[data-open-detail]');
              if (detailCard) {
                var dParts = parsePairAttr(detailCard.getAttribute('data-open-detail'));
                if (!dParts) return;
                applyView({ type: 'detail', blockId: dParts[0], itemId: dParts[1] }, true);
              }
            }
          });

          document.addEventListener('keydown', function (e) {
            if (e.key !== 'Enter' && e.key !== ' ') return;
            var target = e.target;
            if (!target || !target.closest) return;
            if (target.closest('button, a, input, textarea, select')) return;
            var detailCard = target.closest('[data-open-detail]');
            if (!detailCard) return;
            var dParts = parsePairAttr(detailCard.getAttribute('data-open-detail'));
            if (!dParts) return;
            e.preventDefault();
            applyView({ type: 'detail', blockId: dParts[0], itemId: dParts[1] }, true);
          });

          document.querySelectorAll('[data-fnb-catalog]').forEach(function (fnbBox) {
            var activeCat = 'semua';
            var searchInput = fnbBox.querySelector('[data-fnb-search]');
            var catBtns = fnbBox.querySelectorAll('[data-fnb-cat]');
            var accentCol = fnbBox.getAttribute('data-fnb-accent') || '#EA580C';
            var emptyBox = fnbBox.querySelector('[data-fnb-empty]');

            function applyFnbFilter() {
              var q = searchInput ? String(searchInput.value || '').trim().toLowerCase() : '';
              var visibleTotal = 0;
              fnbBox.querySelectorAll('[data-fnb-section]').forEach(function (sec) {
                var secVisible = 0;
                sec.querySelectorAll('[data-fnb-item]').forEach(function (card) {
                  var catVal = card.getAttribute('data-fnb-cat-val') || '';
                  var hay = card.getAttribute('data-fnb-haystack') || '';
                  var okCat = activeCat === 'semua' || catVal === activeCat;
                  var okSearch = !q || hay.indexOf(q) !== -1;
                  var show = okCat && okSearch;
                  card.style.display = show ? 'flex' : 'none';
                  if (show) { secVisible += 1; visibleTotal += 1; }
                });
                sec.style.display = secVisible > 0 ? 'flex' : 'none';
              });
              if (emptyBox) emptyBox.style.display = visibleTotal === 0 ? 'block' : 'none';
            }

            if (searchInput) {
              searchInput.addEventListener('input', applyFnbFilter);
            }
            catBtns.forEach(function (cb) {
              cb.addEventListener('click', function () {
                activeCat = cb.getAttribute('data-fnb-cat') || 'semua';
                catBtns.forEach(function (b) {
                  var on = (b.getAttribute('data-fnb-cat') || 'semua') === activeCat;
                  b.style.background = on ? accentCol : '#F1F5F9';
                  b.style.color = on ? '#FFFFFF' : '#334155';
                });
                applyFnbFilter();
              });
            });
          });

          if (openCartBtn) openCartBtn.addEventListener('click', openCart);
          if (fnbFloatBtn) fnbFloatBtn.addEventListener('click', openCart);
          window.addEventListener('hashchange', syncFromHash);
          if (location.hash) syncFromHash();
          syncCartBar();
        }
      }

      // Katalog Produk Pelatihan Interactive Handler
      document.querySelectorAll('[data-training-catalog]').forEach(function (box) {
        var cfgEl = box.querySelector('[data-trn-config]');
        if (!cfgEl) return;
        var tCfg = null;
        try { tCfg = JSON.parse(cfgEl.textContent || '{}'); } catch (e) { tCfg = null; }
        if (!tCfg) return;

        var programs = Array.isArray(tCfg.programs) ? tCfg.programs : [];
        var mediaList = Array.isArray(tCfg.mediaList) ? tCfg.mediaList : [];
        var chkItems = Array.isArray(tCfg.checklistItems) ? tCfg.checklistItems : [];
        var formFields = Array.isArray(tCfg.formFields) ? tCfg.formFields : [];
        var activeProgIdx = 0;
        var activeMediaIdx = 0;
        var isExpanded = Boolean(tCfg.defaultExpanded);
        var checkedMap = {};
        var formValues = {};

        function normalizeTrnWa(raw) {
          var d = String(raw || '').replace(/[^\\d]/g, '');
          if (!d) return '6281234567890';
          if (d.charAt(0) === '0') return '62' + d.slice(1);
          if (d.charAt(0) === '8') return '62' + d;
          return d;
        }

        function syncTrainingWa() {
          var waBtn = box.querySelector('[data-trn-wa]');
          if (!waBtn) return;
          var phone = normalizeTrnWa(tCfg.waNumber);
          var lines = [];
          lines.push((tCfg.waIntro && tCfg.waIntro.trim()) || 'Halo, saya ingin konsultasi mengenai program pelatihan berikut:');
          lines.push('');
          if (tCfg.heading && tCfg.heading.trim()) lines.push('*Nama Pelatihan:* ' + tCfg.heading.trim());
          if (tCfg.batch && tCfg.batch.trim()) lines.push('*Angkatan:* ' + tCfg.batch.trim());
          if (tCfg.schedule && tCfg.schedule.trim()) lines.push('*Tanggal:* ' + tCfg.schedule.trim());
          var prog = programs[activeProgIdx] || null;
          if (prog) {
            lines.push('');
            lines.push('*Biaya & Program:*');
            lines.push('Program: ' + (prog.title || ''));
            if (prog.subtitle && prog.subtitle.trim()) lines.push('Info: ' + prog.subtitle.trim());
            if (prog.originalPrice && prog.originalPrice.trim()) lines.push('Biaya Normal: ' + prog.originalPrice.trim());
            if (prog.price && prog.price.trim()) lines.push('Biaya: ' + prog.price.trim());
            if (prog.discountLabel && prog.discountLabel.trim()) lines.push('Potongan: ' + prog.discountLabel.trim());
            if (prog.cashbackLabel && prog.cashbackLabel.trim()) lines.push('Cashback: ' + prog.cashbackLabel.trim());
          }
          if (chkItems.length) {
            lines.push('');
            lines.push('*Checklist Syarat Berkas:*');
            chkItems.forEach(function (it, idx) {
              if (String(it || '').trim()) {
                lines.push('- [' + (checkedMap[idx] ? '✓' : ' ') + '] ' + String(it).trim());
              }
            });
          }
          var validFields = formFields.filter(function (f) { return String(f.label || '').trim(); });
          if (validFields.length) {
            lines.push('');
            lines.push('*Formulir:*');
            validFields.forEach(function (f) {
              var val = String(formValues[f.id] || '').trim() || '-';
              lines.push('- ' + String(f.label || '').trim() + ': ' + val);
            });
          }
          if (prog && prog.price) {
            var numVal = Number(String(prog.price).replace(/[^\\d]/g, '')) || 0;
            if (numVal > 0) waBtn.setAttribute('data-lynk-order-value', String(numVal));
            else waBtn.removeAttribute('data-lynk-order-value');
          } else {
            waBtn.removeAttribute('data-lynk-order-value');
          }
          waBtn.href = 'https://wa.me/' + phone + '?text=' + encodeURIComponent(lines.join('\\n'));
        }

        var toggleBtn = box.querySelector('[data-trn-toggle]');
        var drawerEl = box.querySelector('[data-trn-drawer]');
        var toggleLabelEl = box.querySelector('[data-trn-toggle-label]');
        var toggleIconEl = box.querySelector('[data-trn-toggle-icon]');

        function renderDrawer() {
          if (drawerEl) drawerEl.style.display = isExpanded ? 'flex' : 'none';
          if (toggleBtn) {
            var acc = tCfg.accentColor || '#2563EB';
            toggleBtn.style.background = isExpanded ? acc : 'transparent';
            toggleBtn.style.color = isExpanded ? '#FFFFFF' : acc;
          }
          if (toggleLabelEl) {
            toggleLabelEl.textContent = isExpanded
              ? (tCfg.collapseLabel || 'Tutup Detail')
              : (tCfg.expandLabel || 'Selengkapnya');
          }
          if (toggleIconEl) {
            toggleIconEl.style.transform = isExpanded ? 'rotate(180deg)' : 'rotate(0deg)';
          }
        }
        if (toggleBtn) {
          toggleBtn.addEventListener('click', function () {
            isExpanded = !isExpanded;
            renderDrawer();
          });
        }
        renderDrawer();

        function renderProgram() {
          var prog = programs[activeProgIdx];
          if (!prog) return;
          box.querySelectorAll('[data-trn-prog-idx]').forEach(function (btn) {
            var on = Number(btn.getAttribute('data-trn-prog-idx')) === activeProgIdx;
            btn.style.background = on ? (tCfg.accentColor || '#2563EB') : 'transparent';
            btn.style.borderColor = on ? (tCfg.accentColor || '#2563EB') : (tCfg.borderColor || '#E2E8F0');
            btn.style.color = on ? '#FFFFFF' : (tCfg.textColor || '#0F172A');
          });
          var bEl = box.querySelector('[data-trn-badge]');
          var tEl = box.querySelector('[data-trn-title]');
          var sEl = box.querySelector('[data-trn-subtitle]');
          var dEl = box.querySelector('[data-trn-desc]');
          var pBox = box.querySelector('[data-trn-price-box]');
          var oEl = box.querySelector('[data-trn-orig-price]');
          var prEl = box.querySelector('[data-trn-price]');
          var discEl = box.querySelector('[data-trn-discount]');
          var cbEl = box.querySelector('[data-trn-cashback]');

          var sPriceBox = box.querySelector('[data-trn-sum-price-box]');
          var sOrigEl = box.querySelector('[data-trn-sum-orig]');
          var sPriceEl = box.querySelector('[data-trn-sum-price]');
          var sDiscEl = box.querySelector('[data-trn-sum-disc]');
          var sCbEl = box.querySelector('[data-trn-sum-cb]');

          if (bEl) { bEl.textContent = (prog.badge || '').trim(); bEl.style.display = bEl.textContent ? 'inline-block' : 'none'; }
          if (tEl) tEl.textContent = prog.title || '';
          if (sEl) { sEl.textContent = (prog.subtitle || '').trim(); sEl.style.display = sEl.textContent ? 'block' : 'none'; }
          if (dEl) {
            var descHtml = prog.descriptionHtml || '';
            dEl.innerHTML = descHtml;
            dEl.style.display = descHtml ? 'block' : 'none';
          }
          if (oEl) { oEl.textContent = (prog.originalPrice || '').trim(); oEl.style.display = oEl.textContent ? 'inline' : 'none'; }
          if (prEl) { prEl.textContent = (prog.price || '').trim(); prEl.style.display = prEl.textContent ? 'inline' : 'none'; }
          if (discEl) { discEl.textContent = (prog.discountLabel || '').trim(); discEl.style.display = discEl.textContent ? 'inline-flex' : 'none'; }
          if (cbEl) { cbEl.textContent = (prog.cashbackLabel || '').trim(); cbEl.style.display = cbEl.textContent ? 'inline-flex' : 'none'; }

          if (sOrigEl) { sOrigEl.textContent = (prog.originalPrice || '').trim(); sOrigEl.style.display = sOrigEl.textContent ? 'inline' : 'none'; }
          if (sPriceEl) { sPriceEl.textContent = (prog.price || '').trim(); sPriceEl.style.display = sPriceEl.textContent ? 'inline' : 'none'; }
          if (sDiscEl) { sDiscEl.textContent = (prog.discountLabel || '').trim(); sDiscEl.style.display = sDiscEl.textContent ? 'inline-flex' : 'none'; }
          if (sCbEl) { sCbEl.textContent = (prog.cashbackLabel || '').trim(); sCbEl.style.display = sCbEl.textContent ? 'inline-flex' : 'none'; }

          var hasP = Boolean((prog.price || '').trim() || (prog.originalPrice || '').trim() || (prog.discountLabel || '').trim() || (prog.cashbackLabel || '').trim());
          if (pBox) pBox.style.display = hasP ? 'flex' : 'none';
          if (sPriceBox) sPriceBox.style.display = hasP ? 'flex' : 'none';
          syncTrainingWa();
        }

        function renderMedia() {
          var m = mediaList[activeMediaIdx];
          if (!m) return;
          var imgEl = box.querySelector('[data-trn-img]');
          var cEl = box.querySelector('[data-trn-counter]');
          var footEl = box.querySelector('[data-trn-media-foot]');
          var capEl = box.querySelector('[data-trn-caption]');
          if (imgEl && m.imageUrl) { imgEl.src = m.imageUrl; imgEl.alt = m.caption || 'Foto pelatihan'; }
          if (cEl) cEl.textContent = (activeMediaIdx + 1) + ' / ' + mediaList.length;
          var capTxt = (m.caption || '').trim();
          if (capEl) capEl.textContent = capTxt;
          if (footEl) footEl.style.display = capTxt ? 'block' : 'none';
        }

        box.querySelectorAll('[data-trn-prog-idx]').forEach(function (btn) {
          btn.addEventListener('click', function () {
            activeProgIdx = Number(btn.getAttribute('data-trn-prog-idx')) || 0;
            renderProgram();
          });
        });
        var prevMediaBtn = box.querySelector('[data-trn-prev]');
        var nextMediaBtn = box.querySelector('[data-trn-next]');
        if (prevMediaBtn) prevMediaBtn.addEventListener('click', function () {
          activeMediaIdx = activeMediaIdx <= 0 ? mediaList.length - 1 : activeMediaIdx - 1;
          renderMedia();
        });
        if (nextMediaBtn) nextMediaBtn.addEventListener('click', function () {
          activeMediaIdx = activeMediaIdx >= mediaList.length - 1 ? 0 : activeMediaIdx + 1;
          renderMedia();
        });

        var trnErrEl = box.querySelector('[data-trn-error]');
        function hideTrnError() {
          if (trnErrEl) {
            trnErrEl.style.display = 'none';
            trnErrEl.textContent = '';
          }
        }
        var trnWaBtn = box.querySelector('[data-trn-wa]');
        if (trnWaBtn) {
          trnWaBtn.addEventListener('click', function (ev) {
            var missing = [];
            formFields.forEach(function (f) {
              if (f.required && !String(formValues[f.id] || '').trim()) {
                missing.push(String(f.label || 'Formulir').trim());
              }
            });
            if (tCfg.checklistRequired && chkItems.length > 0) {
              var anyUnchecked = chkItems.some(function (_, i) { return !checkedMap[i]; });
              if (anyUnchecked) {
                missing.push(String(tCfg.checklistTitle || 'Checklist Syarat Berkas').trim());
              }
            }
            if (missing.length > 0) {
              ev.preventDefault();
              if (trnErrEl) {
                trnErrEl.textContent = 'Mohon lengkapi bagian wajib: ' + missing.join(', ');
                trnErrEl.style.display = 'block';
              }
              return;
            }
            hideTrnError();
          });
        }

        box.querySelectorAll('[data-trn-chk]').forEach(function (chk) {
          chk.addEventListener('change', function () {
            var idx = Number(chk.getAttribute('data-trn-chk'));
            checkedMap[idx] = chk.checked;
            if (chk.parentElement) {
              chk.parentElement.style.borderColor = chk.checked ? '#10B981' : (tCfg.borderColor || '#E2E8F0');
              chk.parentElement.style.background = chk.checked ? 'rgba(16,185,129,0.08)' : 'transparent';
            }
            var cntEl = box.querySelector('[data-trn-chk-count]');
            if (cntEl) {
              var ready = chkItems.filter(function (_, i) { return Boolean(checkedMap[i]); }).length;
              cntEl.textContent = ready + '/' + chkItems.length + ' siap';
            }
            hideTrnError();
            syncTrainingWa();
          });
        });

        box.querySelectorAll('[data-trn-field]').forEach(function (fEl) {
          fEl.addEventListener('input', function () {
            var fid = fEl.getAttribute('data-trn-field');
            if (fid) {
              formValues[fid] = fEl.value;
              hideTrnError();
              syncTrainingWa();
            }
          });
        });

        syncTrainingWa();
      });

      // Container Parent-Child Slider Runtime (Bagian G)
      document.querySelectorAll('[data-lb-cslider]').forEach(function (sliderEl) {
        var track = sliderEl.querySelector('.lynk-cslider-track');
        if (!track) return;
        var items = Array.prototype.slice.call(track.querySelectorAll(':scope > .lynk-cslider-item'));
        if (items.length <= 1) return;
        var mode = sliderEl.getAttribute('data-slider-mode') || 'slider_horizontal';
        var isHoriz = mode === 'slider_horizontal';
        var loop = sliderEl.getAttribute('data-loop') === '1';
        var autoplay = sliderEl.getAttribute('data-autoplay') === '1';
        var intervalMs = Math.max(1000, Number(sliderEl.getAttribute('data-autoplay-interval') || 3500));
        var transition = sliderEl.getAttribute('data-transition') || 'smooth';
        var mouseDrag = sliderEl.getAttribute('data-mouse-drag') === '1';
        var dots = Array.prototype.slice.call(sliderEl.querySelectorAll(':scope > .lynk-cslider-dots .lynk-cslider-dot'));
        var prevBtn = sliderEl.querySelector(':scope > .lynk-cslider-prev');
        var nextBtn = sliderEl.querySelector(':scope > .lynk-cslider-next');
        var activeIdx = 0;

        var sliderAccent = sliderEl.getAttribute('data-slider-accent') || '#00C98A';
        function updateDots(idx) {
          dots.forEach(function (dot, i) {
            dot.style.width = i === idx ? '18px' : '7px';
            var isOv = dot.getAttribute('data-dot-overlay') === '1';
            dot.style.background = i === idx ? sliderAccent : (isOv ? 'rgba(255, 255, 255, 0.58)' : '#CBD5E1');
          });
        }

        function goTo(idx) {
          var targetIdx = idx;
          if (targetIdx < 0) targetIdx = loop ? items.length - 1 : 0;
          if (targetIdx >= items.length) targetIdx = loop ? 0 : items.length - 1;
          activeIdx = targetIdx;
          var targetEl = items[activeIdx];
          if (targetEl) {
            var behavior = transition === 'instant' ? 'auto' : 'smooth';
            if (isHoriz) {
              track.scrollTo({ left: targetEl.offsetLeft, behavior: behavior });
            } else {
              track.scrollTo({ top: targetEl.offsetTop, behavior: behavior });
            }
          }
          updateDots(activeIdx);
        }

        if (prevBtn) prevBtn.addEventListener('click', function () { goTo(activeIdx - 1); });
        if (nextBtn) nextBtn.addEventListener('click', function () { goTo(activeIdx + 1); });
        dots.forEach(function (dot, i) {
          dot.addEventListener('click', function () { goTo(i); });
        });

        track.addEventListener('scroll', function () {
          var pos = isHoriz ? track.scrollLeft : track.scrollTop;
          var closest = 0;
          var minDist = Infinity;
          items.forEach(function (it, i) {
            var off = isHoriz ? it.offsetLeft : it.offsetTop;
            var d = Math.abs(off - pos);
            if (d < minDist) { minDist = d; closest = i; }
          });
          if (closest !== activeIdx) {
            activeIdx = closest;
            updateDots(activeIdx);
          }
        }, { passive: true });

        if (mouseDrag) {
          var dragging = false;
          var startCoord = 0;
          var startScroll = 0;
          track.addEventListener('mousedown', function (e) {
            if (e.target && e.target.closest && e.target.closest('a, button, input, select, textarea')) return;
            dragging = true;
            startCoord = isHoriz ? e.pageX : e.pageY;
            startScroll = isHoriz ? track.scrollLeft : track.scrollTop;
          });
          window.addEventListener('mousemove', function (e) {
            if (!dragging) return;
            var cur = isHoriz ? e.pageX : e.pageY;
            if (isHoriz) track.scrollLeft = startScroll - (cur - startCoord);
            else track.scrollTop = startScroll - (cur - startCoord);
          });
          window.addEventListener('mouseup', function () { dragging = false; });
        }

        if (autoplay) {
          var timer = setInterval(function () { goTo(activeIdx + 1); }, intervalMs);
          sliderEl.addEventListener('mouseenter', function () { clearInterval(timer); });
        }
      });

      // Helper render templat WhatsApp di sisi klien (tanpa token mentah)
      function renderWaTemplateClient(rawTpl, ctx) {
        var text = String(rawTpl || '').replace(/\\{\\{\\s*([a-zA-Z0-9_]+)\\s*\\}\\}/g, function (_, key) {
          var v = ctx && ctx[key] !== undefined && ctx[key] !== null ? String(ctx[key]).trim() : '';
          return v;
        });
        return text
          .split('\\n')
          .filter(function (line) {
            var t = line.trim();
            if (!t) return true;
            if (/^[-•*]?\\s*[^:\\n]{1,42}:\\s*$/.test(t)) return false;
            return true;
          })
          .join('\\n')
          .replace(/\\n{3,}/g, '\\n\\n')
          .trim();
      }

      // Ad Attribution, Meta/TikTok/Google Pixel, Dynamic Form & WA Click Tracker
      (function () {
        var sEl = document.getElementById('lynk-store-data');
        if (!sEl) return;
        var sData = {};
        try { sData = JSON.parse(sEl.textContent || '{}'); } catch (e) { return; }
        var adsCfg = sData.ads || {};
        var isPreview = /[?&]preview=1(&|$)/.test(location.search || '');
        var dedupeMap = {};

        function detectAttribution() {
          var key = 'lynk_attr_' + (sData.slug || 'default');
          var stored = null;
          try { stored = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch (e) {}
          var sp = new URLSearchParams(location.search || '');
          var utmSource = sp.get('utm_source') || '';
          var utmMedium = sp.get('utm_medium') || '';
          var utmCampaign = sp.get('utm_campaign') || '';
          var utmContent = sp.get('utm_content') || '';
          var fbclid = sp.get('fbclid') || '';
          var ctwaClid = sp.get('ctwa_clid') || '';
          var ttclid = sp.get('ttclid') || '';
          var gclid = sp.get('gclid') || sp.get('gbraid') || sp.get('wbraid') || '';

          var hasNew = Boolean(utmSource || utmMedium || utmCampaign || fbclid || ctwaClid || ttclid || gclid);
          if (!hasNew && stored) return stored;

          var us = utmSource.toLowerCase();
          var um = utmMedium.toLowerCase();
          var channel = 'organic';
          var clickIdType = '';
          if (ctwaClid || um.indexOf('ctwa') !== -1 || um.indexOf('click_to_wa') !== -1 || us === 'meta_wa') {
            channel = 'meta_wa_addon';
            if (ctwaClid) clickIdType = 'ctwa_clid';
            else if (fbclid) clickIdType = 'fbclid';
          } else if (fbclid || us === 'meta' || us === 'fb' || us === 'facebook' || us === 'ig' || us === 'instagram') {
            channel = 'meta';
            if (fbclid) clickIdType = 'fbclid';
          } else if (ttclid || us === 'tiktok' || us === 'tt') {
            channel = 'tiktok';
            if (ttclid) clickIdType = 'ttclid';
          } else if (gclid || us === 'google' || us === 'adwords' || us === 'gads') {
            channel = 'google';
            if (gclid) clickIdType = 'gclid';
          }

          var res = {
            channel: channel,
            utmSource: utmSource,
            utmMedium: utmMedium,
            utmCampaign: utmCampaign,
            utmContent: utmContent,
            clickIdType: clickIdType
          };
          try { sessionStorage.setItem(key, JSON.stringify(res)); } catch (e) {}
          return res;
        }

        var attr = detectAttribution();
        var channelLabels = {
          meta: 'Meta Ads',
          meta_wa_addon: 'Meta WA Add-On',
          tiktok: 'TikTok Ads',
          google: 'Google Ads',
          organic: 'Organik'
        };

        function sendServerEvent(eventType, extra) {
          if (location.protocol.indexOf('http') !== 0 || !sData.projectId) return;
          var dedupeKey = [
            sData.projectId,
            eventType,
            (extra && (extra.componentId || extra.waLinkId || extra.ctaLabel)) || ''
          ].join(':');
          var now = Date.now();
          if (dedupeMap[dedupeKey] && now - dedupeMap[dedupeKey] < 2500) return;
          dedupeMap[dedupeKey] = now;

          var payload = {
            projectId: sData.projectId,
            projectTitle: sData.projectTitle || '',
            slug: sData.slug || '',
            eventType: eventType,
            channel: attr.channel || 'organic',
            sourceLabel: channelLabels[attr.channel] || 'Organik',
            utmSource: attr.utmSource || undefined,
            utmMedium: attr.utmMedium || undefined,
            utmCampaign: attr.utmCampaign || undefined,
            utmContent: attr.utmContent || undefined,
            clickIdType: attr.clickIdType || undefined,
            deviceType: window.innerWidth < 768 ? 'mobile' : 'desktop',
            isTest: isPreview,
            dedupeKey: dedupeKey,
            createdAt: now
          };
          if (extra) {
            for (var k in extra) {
              if (Object.prototype.hasOwnProperty.call(extra, k)) payload[k] = extra[k];
            }
          }
          try {
            var body = JSON.stringify(payload);
            if (navigator.sendBeacon) {
              navigator.sendBeacon('/api/track/event', new Blob([body], { type: 'application/json' }));
            } else {
              fetch('/api/track/event', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: body,
                keepalive: true
              }).catch(function () {});
            }
          } catch (e) {}
        }

        sendServerEvent('page_view');

        // Form Dinamis (14 tipe + 6 aturan wajib + tampilan bersyarat + simpan DB + WA)
        document.querySelectorAll('[data-lynk-form]').forEach(function (formEl) {
          var openedTracked = false;
          var formBlockId = formEl.getAttribute('data-form-block-id') || '';
          var formTitle = formEl.getAttribute('data-form-title') || 'Formulir';
          var formCategory = formEl.getAttribute('data-form-category') || 'konsultasi';

          function collectFormValues() {
            var vals = {};
            formEl.querySelectorAll('[data-form-input]').forEach(function (inp) {
              var fid = inp.getAttribute('data-field-id');
              if (!fid) return;
              if (inp.type === 'file') {
                vals[fid] = inp.files && inp.files[0] ? inp.files[0].name : '';
              } else {
                vals[fid] = String(inp.value || '').trim();
              }
            });
            formEl.querySelectorAll('[data-form-radio-group]').forEach(function (grp) {
              var fid = grp.getAttribute('data-field-id');
              if (!fid) return;
              var checked = grp.querySelector('input[type="radio"]:checked');
              vals[fid] = checked ? String(checked.value || '') : '';
            });
            formEl.querySelectorAll('[data-form-check-group]').forEach(function (grp) {
              var fid = grp.getAttribute('data-field-id');
              if (!fid) return;
              var arr = [];
              grp.querySelectorAll('input[type="checkbox"]:checked').forEach(function (c) {
                arr.push(String(c.value || ''));
              });
              vals[fid] = arr;
            });
            return vals;
          }

          function syncConditionals() {
            var vals = collectFormValues();
            formEl.querySelectorAll('[data-cond-field]').forEach(function (wrap) {
              var cf = wrap.getAttribute('data-cond-field');
              var cv = String(wrap.getAttribute('data-cond-val') || '').trim().toLowerCase();
              var cur = vals[cf];
              var visible = true;
              if (!cv) {
                visible = Array.isArray(cur) ? cur.length > 0 : Boolean(String(cur || '').trim());
              } else if (Array.isArray(cur)) {
                visible = cur.some(function (x) { return String(x).trim().toLowerCase() === cv; });
              } else {
                visible = String(cur || '').trim().toLowerCase() === cv;
              }
              wrap.style.display = visible ? '' : 'none';
            });
          }

          function validateFieldEl(el, vals) {
            var wrap = el.closest('[data-form-field-wrap]');
            if (wrap && wrap.style.display === 'none') return null;
            var fid = el.getAttribute('data-field-id') || '';
            var ftype = el.getAttribute('data-field-type') || 'text';
            var flabel = el.getAttribute('data-field-label') || 'Kolom ini';
            var rule = el.getAttribute('data-required-rule') || 'optional';
            var customErr = el.getAttribute('data-err-msg') || '';
            var rawVal = vals[fid];

            if (ftype === 'checkbox_group') {
              var arr = Array.isArray(rawVal) ? rawVal : [];
              var allBoxes = el.querySelectorAll('input[type="checkbox"]');
              if (rule === 'required_one' && arr.length === 0) return customErr || ('Wajib memilih salah satu pada "' + flabel + '".');
              if (rule === 'required_multi' && arr.length === 0) return customErr || ('Wajib memilih minimal satu pilihan pada "' + flabel + '".');
              if (rule === 'required_fill' && arr.length === 0) return customErr || ('Kolom "' + flabel + '" wajib diisi.');
              if (rule === 'required_min_choices') {
                var minC = Math.max(1, Number(el.getAttribute('data-min-choices') || 1));
                if (arr.length < minC) return customErr || ('"' + flabel + '" wajib memilih minimal ' + minC + ' pilihan.');
              }
              if (rule === 'required_consent_all' && allBoxes.length > 0 && arr.length < allBoxes.length) {
                return customErr || ('Wajib mencentang seluruh persetujuan pada "' + flabel + '".');
              }
              if (rule === 'required_consent_specific') {
                var reqIdxs = String(el.getAttribute('data-req-idxs') || '0').split(',').map(Number);
                for (var ri = 0; ri < reqIdxs.length; ri++) {
                  var box = el.querySelector('input[data-check-idx="' + reqIdxs[ri] + '"]');
                  if (box && !box.checked) {
                    return customErr || ('Wajib mencentang persetujuan "' + box.value + '".');
                  }
                }
              }
              return null;
            }

            var strVal = String(rawVal || '').trim();
            if (rule !== 'optional' && !strVal) {
              if (rule === 'required_one') return customErr || ('Wajib memilih salah satu pada "' + flabel + '".');
              return customErr || ('Kolom "' + flabel + '" wajib diisi.');
            }
            if (!strVal) return null;
            if (ftype === 'email' && !/^[^\\s@]+@[^\\s@]+\\.[^\\s@]{2,}$/.test(strVal)) {
              return customErr || ('Format email pada "' + flabel + '" tidak valid.');
            }
            if (ftype === 'phone' || ftype === 'tel') {
              var phoneFmt = el.getAttribute('data-phone-format') || 'general';
              var digits = strVal.replace(/[^\\d]/g, '');
              if (phoneFmt === 'whatsapp') {
                var validWaPrefix = /^(\\+?628|08)/.test(strVal.replace(/[\\s()-]/g, ''));
                if (!validWaPrefix || digits.length < 10 || digits.length > 15) {
                  return customErr || ('Nomor WhatsApp pada "' + flabel + '" harus diawali 08 atau 628 (10–15 digit).');
                }
              } else if (digits.length < 8 || digits.length > 16) {
                return customErr || ('Nomor telepon pada "' + flabel + '" harus terdiri dari 8–16 digit.');
              }
            }
            if (ftype === 'number') {
              var num = Number(strVal);
              if (!Number.isFinite(num)) return customErr || ('Kolom "' + flabel + '" harus berupa angka yang valid.');
              var minV = el.getAttribute('data-min-val');
              var maxV = el.getAttribute('data-max-val');
              if (minV !== null && minV !== '' && num < Number(minV)) return customErr || ('Nilai "' + flabel + '" minimal ' + minV + '.');
              if (maxV !== null && maxV !== '' && num > Number(maxV)) return customErr || ('Nilai "' + flabel + '" maksimal ' + maxV + '.');
            }
            var minL = el.getAttribute('data-min-len');
            var maxL = el.getAttribute('data-max-len');
            if (minL && strVal.length < Number(minL)) return customErr || ('"' + flabel + '" minimal ' + minL + ' karakter.');
            if (maxL && strVal.length > Number(maxL)) return customErr || ('"' + flabel + '" maksimal ' + maxL + ' karakter.');
            return null;
          }

          formEl.addEventListener('focusin', function () {
            if (!openedTracked) {
              openedTracked = true;
              sendServerEvent('form_open', {
                componentId: formBlockId,
                componentType: 'form',
                ctaLabel: formTitle
              });
            }
          });

          formEl.addEventListener('input', function (ev) {
            syncConditionals();
            var t = ev.target && ev.target.closest ? ev.target.closest('[data-form-input], [data-form-radio-group], [data-form-check-group]') : null;
            if (t) {
              var vals = collectFormValues();
              var fErr = validateFieldEl(t, vals);
              var errBox = formEl.querySelector('[data-field-err="' + (t.getAttribute('data-field-id') || '') + '"]');
              if (errBox) {
                errBox.textContent = fErr || '';
                errBox.style.display = fErr ? 'block' : 'none';
              }
            }
          });
          formEl.addEventListener('change', syncConditionals);
          syncConditionals();

          formEl.addEventListener('submit', function (ev) {
            ev.preventDefault();
            syncConditionals();
            var errEl = formEl.querySelector('.form-err');
            var msgEl = formEl.querySelector('.form-msg');
            var vals = collectFormValues();
            var firstErr = null;

            formEl.querySelectorAll('[data-form-input], [data-form-radio-group], [data-form-check-group]').forEach(function (el) {
              var fid = el.getAttribute('data-field-id') || '';
              var err = validateFieldEl(el, vals);
              var fErrBox = formEl.querySelector('[data-field-err="' + fid + '"]');
              if (fErrBox) {
                fErrBox.textContent = err || '';
                fErrBox.style.display = err ? 'block' : 'none';
              }
              if (err && !firstErr) firstErr = err;
            });

            var checkedChecklist = [];
            formEl.querySelectorAll('[data-form-chk-group]').forEach(function (grp) {
              var chkRule = grp.getAttribute('data-form-chk-rule') || (grp.getAttribute('data-form-chk-required') === '1' ? 'required_consent_all' : 'optional');
              var chkTitle = grp.getAttribute('data-form-chk-title') || 'Persetujuan';
              var chkMin = Math.max(1, Number(grp.getAttribute('data-form-chk-min') || 1));
              var boxes = grp.querySelectorAll('[data-form-chk]');
              boxes.forEach(function (b) { if (b.checked) checkedChecklist.push(String(b.value || 'Ya')); });
              if (chkRule === 'required_consent_all' && boxes.length > 0 && checkedChecklist.length < boxes.length && !firstErr) {
                firstErr = 'Wajib mencentang seluruh persetujuan pada "' + chkTitle + '".';
              } else if ((chkRule === 'required_one' || chkRule === 'required_multi' || chkRule === 'required_fill') && checkedChecklist.length === 0 && !firstErr) {
                firstErr = 'Wajib memilih minimal satu butir pada "' + chkTitle + '".';
              } else if (chkRule === 'required_min_choices' && checkedChecklist.length < chkMin && !firstErr) {
                firstErr = '"' + chkTitle + '" wajib mencentang minimal ' + chkMin + ' pilihan.';
              } else if (chkRule === 'required_consent_specific' && boxes.length > 0 && !boxes[0].checked && !firstErr) {
                firstErr = 'Wajib mencentang persetujuan pertama pada "' + chkTitle + '".';
              }
            });

            if (firstErr) {
              if (errEl) { errEl.textContent = firstErr; errEl.style.display = 'block'; }
              if (msgEl) msgEl.style.display = 'none';
              return;
            }
            if (errEl) { errEl.style.display = 'none'; errEl.textContent = ''; }

            var finishSuccess = function () {
              if (msgEl) msgEl.style.display = 'block';
              if (typeof window.fbq === 'function') window.fbq('track', 'Lead');
              if (typeof window.ttq === 'object' && window.ttq.track) window.ttq.track('SubmitForm');
              if (typeof window.gtag === 'function') window.gtag('event', 'generate_lead', { event_category: 'Form' });
              sendServerEvent('form_submit', {
                componentId: formBlockId,
                componentType: 'form',
                ctaLabel: formTitle
              });

              if (formEl.getAttribute('data-form-wa-enabled') === '1') {
                var waCenter = sData.whatsappCenter || {};
                var waLinks = Array.isArray(waCenter.links) ? waCenter.links : [];
                var waTemplates = Array.isArray(waCenter.templates) ? waCenter.templates : [];
                var linkId = formEl.getAttribute('data-form-wa-link-id') || '';
                var tplId = formEl.getAttribute('data-form-wa-template-id') || '';
                var chosenLink = waLinks.find(function (l) { return l.id === linkId && l.active; });
                var effectiveTplId = tplId || (chosenLink && chosenLink.templateId) || (waCenter.defaultTemplateByType && waCenter.defaultTemplateByType[formCategory]) || '';
                var chosenTpl = waTemplates.find(function (t) { return t.id === effectiveTplId; }) || waTemplates.find(function (t) { return t.type === formCategory; }) || waTemplates[0];
                var phone = String(formEl.getAttribute('data-form-wa-phone') || (chosenLink && chosenLink.phone) || waCenter.mainPhone || '').replace(/[^\\d]/g, '');
                if (phone.indexOf('0') === 0) phone = '62' + phone.slice(1);

                var summaryLines = [];
                var ctx = {
                  nama_usaha: waCenter.businessName || sData.projectTitle || '',
                  info_usaha: waCenter.businessInfo || '',
                  nama_formulir: formTitle,
                  halaman_asal: location.href || '',
                  tanggal: new Date().toLocaleDateString('id-ID')
                };
                formEl.querySelectorAll('[data-form-input], [data-form-radio-group], [data-form-check-group]').forEach(function (el) {
                  var fid = el.getAttribute('data-field-id');
                  var lbl = el.getAttribute('data-field-label') || fid;
                  var ft = el.getAttribute('data-field-type') || '';
                  var v = vals[fid];
                  var txt = Array.isArray(v) ? v.join(', ') : String(v || '').trim();
                  if (txt) {
                    summaryLines.push(lbl + ': ' + txt);
                    if (ft === 'name' && !ctx.nama_pelanggan) ctx.nama_pelanggan = txt;
                    if ((ft === 'phone' || ft === 'tel') && !ctx.nomor_telepon) ctx.nomor_telepon = txt;
                    if (ft === 'email' && !ctx.email) ctx.email = txt;
                    if (ft === 'address' && !ctx.alamat) ctx.alamat = txt;
                    if (ft === 'date' && !ctx.tanggal) ctx.tanggal = txt;
                    if (ft === 'time' && !ctx.waktu) ctx.waktu = txt;
                  }
                });
                ctx.ringkasan_formulir = summaryLines.join('\\n');
                var msgText = chosenTpl
                  ? renderWaTemplateClient(chosenTpl.body, ctx)
                  : ('Halo ' + ctx.nama_usaha + ', saya mengisi ' + formTitle + ':\\n' + ctx.ringkasan_formulir);
                if (phone) {
                  sendServerEvent('wa_click', {
                    componentId: formBlockId,
                    componentType: 'form',
                    buttonLabel: formTitle,
                    ctaLabel: formTitle,
                    waPhone: phone,
                    waLinkId: chosenLink ? chosenLink.id : undefined,
                    waTemplateId: chosenTpl ? chosenTpl.id : undefined
                  });
                  window.open('https://wa.me/' + phone + '?text=' + encodeURIComponent(msgText), '_blank', 'noopener');
                }
              }
            };

            if (formEl.getAttribute('data-form-save-db') === '1' && location.protocol.indexOf('http') === 0 && sData.projectId) {
              fetch('/api/form-submissions', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  projectId: sData.projectId,
                  componentId: formBlockId,
                  formTitle: formTitle,
                  formCategory: formCategory,
                  values: vals,
                  checkedChecklist: checkedChecklist,
                  sourceChannel: attr.channel || 'organic',
                  isTest: isPreview
                })
              })
                .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, data: d }; }); })
                .then(function (res) {
                  if (!res.ok) {
                    if (errEl) {
                      errEl.textContent = (res.data && res.data.error) || 'Gagal mengirim formulir. Periksa kembali isian Anda.';
                      errEl.style.display = 'block';
                    }
                    return;
                  }
                  finishSuccess();
                })
                .catch(function () { finishSuccess(); });
            } else {
              finishSuccess();
            }
          });
        });

        document.addEventListener('click', function (e) {
          var t = e.target;
          if (!t || !t.closest) return;

          var addBtn = t.closest('[data-quick-add], [data-fnb-add], #lynk-det-add');
          if (addBtn) {
            if (typeof window.fbq === 'function') window.fbq('track', 'AddToCart');
            if (typeof window.ttq === 'object' && window.ttq.track) window.ttq.track('AddToCart');
            if (typeof window.gtag === 'function') window.gtag('event', 'add_to_cart');
            return;
          }

          if (!t.closest('button, a, input, textarea, select')) {
            var detailCard = t.closest('[data-open-detail]');
            if (detailCard) {
              if (typeof window.fbq === 'function') window.fbq('track', 'ViewContent');
              if (typeof window.ttq === 'object' && window.ttq.track) window.ttq.track('ViewContent');
              if (typeof window.gtag === 'function') window.gtag('event', 'view_item');
              return;
            }
          }

          var anchor = t.closest('a[href]');
          if (!anchor) return;
          var href = anchor.getAttribute('href') || '';
          var low = href.toLowerCase();
          var isWa = low.indexOf('wa.me/') !== -1 || low.indexOf('api.whatsapp.com') !== -1 || low.indexOf('whatsapp://') === 0;
          if (!isWa) return;

          if (adsCfg.appendAdAttributionToWa && attr.channel !== 'organic' && href.indexOf('text=') !== -1) {
            try {
              var urlObj = new URL(href);
              var curText = urlObj.searchParams.get('text') || '';
              var tagLine = '[Sumber: ' + (channelLabels[attr.channel] || attr.channel) + (attr.utmCampaign ? ' · ' + attr.utmCampaign : '') + ']';
              if (curText.indexOf('[Sumber:') === -1) {
                urlObj.searchParams.set('text', (curText ? curText + '\\n\\n' : '') + tagLine);
                anchor.setAttribute('href', urlObj.toString());
              }
            } catch (err) {}
          }

          var phoneMatch = href.match(/wa\\.me\\/(\\d+)|[?&]phone=(\\d+)/i);
          var waPhone = phoneMatch ? (phoneMatch[1] || phoneMatch[2]) : '';
          var ctaLabel = anchor.getAttribute('data-lynk-wa-source') || (anchor.textContent || '').trim().slice(0, 60) || 'Tombol WhatsApp';
          var blockWrap = anchor.closest('[data-block-id]');
          var compId = anchor.getAttribute('data-lynk-component-id') || (blockWrap ? blockWrap.getAttribute('data-block-id') : '') || undefined;
          var compType = anchor.getAttribute('data-lynk-component-type') || undefined;
          var waLinkId = anchor.getAttribute('data-lynk-wa-link-id') || undefined;
          var waTemplateId = anchor.getAttribute('data-lynk-wa-template-id') || undefined;
          var productName = anchor.getAttribute('data-lynk-product-name') || undefined;

          var metaEvent = adsCfg.metaWaEvent || 'Lead';
          if (typeof window.fbq === 'function') {
            window.fbq('track', metaEvent, { content_name: ctaLabel, content_category: attr.channel });
          }
          if (typeof window.ttq === 'object' && window.ttq.track) {
            window.ttq.track('Contact', { description: ctaLabel });
          }
          if (typeof window.gtag === 'function') {
            window.gtag('event', 'generate_lead', { event_category: 'WhatsApp', event_label: ctaLabel });
            if (adsCfg.googleTagId && adsCfg.googleAdsConversionLabel) {
              window.gtag('event', 'conversion', { send_to: adsCfg.googleTagId + '/' + adsCfg.googleAdsConversionLabel });
            }
          }

          var rawOrderVal = anchor.getAttribute('data-lynk-order-value');
          var parsedOrderVal = rawOrderVal !== null && rawOrderVal !== '' ? Number(rawOrderVal) : NaN;
          var extraPayload = {
            ctaLabel: ctaLabel,
            buttonLabel: ctaLabel,
            waPhone: waPhone,
            componentId: compId,
            componentType: compType,
            waLinkId: waLinkId,
            waTemplateId: waTemplateId,
            productName: productName
          };
          if (Number.isFinite(parsedOrderVal) && parsedOrderVal > 0) {
            extraPayload.orderValue = Math.round(parsedOrderVal);
          }
          sendServerEvent('wa_click', extraPayload);
        }, true);
      })();

      // Browser Mode & Fullscreen Mode Controller (Capability-Detected, Silent-Fail)
      (function () {
        var fsBtn = document.getElementById('lynk-fullscreen-btn');
        var autoAttempted = false;

        function getFsTarget() {
          return (document && document.documentElement) || (document && document.body) || null;
        }

        function getRequestFsFn(el) {
          if (!el) return null;
          return (
            el.requestFullscreen ||
            el.webkitRequestFullscreen ||
            el.mozRequestFullScreen ||
            el.msRequestFullscreen ||
            null
          );
        }

        function isFsSupported() {
          if (!document) return false;
          var target = getFsTarget();
          var hasMethod = typeof getRequestFsFn(target) === 'function';
          var enabled =
            document.fullscreenEnabled === true ||
            document.webkitFullscreenEnabled === true ||
            document.mozFullScreenEnabled === true ||
            document.msFullscreenEnabled === true;
          return Boolean(enabled && hasMethod);
        }

        function getActiveFsEl() {
          if (!document) return null;
          return (
            document.fullscreenElement ||
            document.webkitFullscreenElement ||
            document.mozFullScreenElement ||
            document.msFullscreenElement ||
            null
          );
        }

        function isFullPathname(pathname) {
          return /(?:^|\\/)full\\/?$/i.test(String(pathname || ''));
        }

        function buildFullPathname(pathname) {
          var raw = String(pathname || '/');
          if (isFullPathname(raw)) {
            return raw.replace(/\\/+$/, '') || '/full';
          }
          var trimmed = raw.replace(/\\/+$/, '');
          if (!trimmed || trimmed === '/') return '/full';
          return trimmed + '/full';
        }

        function syncUrlToFullMode() {
          var loc = typeof location !== 'undefined' ? location : null;
          if (!loc || (loc.protocol !== 'http:' && loc.protocol !== 'https:')) return;
          var hist = (typeof history !== 'undefined' && history) || (window && window.history);
          if (!hist || typeof hist.replaceState !== 'function') return;
          var currentPath = String(loc.pathname || '/');
          var nextPath = buildFullPathname(currentPath);
          if (nextPath !== currentPath) {
            var nextUrl = nextPath + (loc.search || '') + (loc.hash || '');
            try {
              hist.replaceState(hist.state || null, '', nextUrl);
            } catch (err) {}
          }
        }

        function syncFsButton() {
          if (!fsBtn) return;
          var shouldShow = isFsSupported() && !getActiveFsEl();
          if (shouldShow) {
            fsBtn.hidden = false;
            if (fsBtn.removeAttribute) fsBtn.removeAttribute('hidden');
            if (fsBtn.style) fsBtn.style.display = 'inline-flex';
          } else {
            fsBtn.hidden = true;
            if (fsBtn.setAttribute) fsBtn.setAttribute('hidden', '');
            if (fsBtn.style) fsBtn.style.display = 'none';
          }
        }

        function requestFsDirectly() {
          if (!isFsSupported() || getActiveFsEl()) return;
          var target = getFsTarget();
          var reqFn = getRequestFsFn(target);
          if (typeof reqFn !== 'function') return;
          try {
            var result = reqFn.call(target);
            if (result && typeof result.then === 'function') {
              result.then(
                function () {
                  syncFsButton();
                },
                function () {
                  syncFsButton();
                }
              );
            }
          } catch (err) {
            // Silently ignore rejection; page stays normal in Browser Mode
          }
        }

        if (fsBtn && fsBtn.addEventListener) {
          fsBtn.addEventListener('click', function () {
            // Invoke Fullscreen API synchronously inside click user activation
            requestFsDirectly();
            syncUrlToFullMode();
            syncFsButton();
          });
        }

        ['fullscreenchange', 'webkitfullscreenchange', 'mozfullscreenchange', 'MSFullscreenChange'].forEach(
          function (evName) {
            if (document && document.addEventListener) {
              document.addEventListener(evName, function () {
                syncFsButton();
              });
            }
          }
        );

        syncFsButton();

        // Direct /full entry: try fullscreen once silently; never retry on failure
        if (!autoAttempted) {
          autoAttempted = true;
          var initPath = typeof location !== 'undefined' && location ? location.pathname : '';
          if (isFullPathname(initPath)) {
            requestFsDirectly();
          }
        }
      })();

      // Slide Produk F&B (Real-Time RGB Curved Arch Color Morphing + 5-Slot Persistent Center-Scale Peek + Hero Expand Detail)
      (function () {
        var sliders = document.querySelectorAll('[data-fnb-hero-slider]');
        if (!sliders.length) return;

        function parseRgb(col, fb) {
          if (!col) return fb;
          var s = String(col).trim();
          if (s.charAt(0) === '#') {
            var h = s.slice(1);
            if (h.length === 3) {
              var r3 = parseInt(h[0] + h[0], 16), g3 = parseInt(h[1] + h[1], 16), b3 = parseInt(h[2] + h[2], 16);
              if (!isNaN(r3) && !isNaN(g3) && !isNaN(b3)) return [r3, g3, b3];
            } else if (h.length >= 6) {
              var r6 = parseInt(h.slice(0, 2), 16), g6 = parseInt(h.slice(2, 4), 16), b6 = parseInt(h.slice(4, 6), 16);
              if (!isNaN(r6) && !isNaN(g6) && !isNaN(b6)) return [r6, g6, b6];
            }
          }
          var m = s.match(/rgba?\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)/i);
          if (m) return [Math.min(255, +m[1]), Math.min(255, +m[2]), Math.min(255, +m[3])];
          return fb;
        }
        function lerpRgb(cA, cB, t, fb) {
          var k = Math.max(0, Math.min(1, t));
          var a = parseRgb(cA, fb);
          var b = parseRgb(cB, fb);
          return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * k) + ',' + Math.round(a[1] + (b[1] - a[1]) * k) + ',' + Math.round(a[2] + (b[2] - a[2]) * k) + ')';
        }
        function smoothstep(x) {
          var c = Math.max(0, Math.min(1, x));
          return c * c * (3 - 2 * c);
        }
        function easeOutCubic(t) {
          return 1 - Math.pow(1 - t, 3);
        }

        sliders.forEach(function (root) {
          var blockId = root.getAttribute('data-fnb-hero-slider') || '';
          var rawItems = root.getAttribute('data-fhs-items') || '[]';
          var items = [];
          try { items = JSON.parse(rawItems); } catch (_e) { items = []; }
          if (!items.length) return;

          var archH = parseInt(root.getAttribute('data-fhs-arch-h') || '205', 10) || 205;
          var archCurve = parseInt(root.getAttribute('data-fhs-arch-curve') || '100', 10) || 100;
          var prodSize = parseInt(root.getAttribute('data-fhs-size') || '215', 10) || 215;
          var zoomPct = parseInt(root.getAttribute('data-fhs-zoom') || '100', 10) || 100;
          var peekPct = (parseInt(root.getAttribute('data-fhs-peek') || '74', 10) || 74) / 100;
          var hasShadow = root.getAttribute('data-fhs-shadow') !== '0';
          var enableDetail = root.getAttribute('data-fhs-detail') !== '0';
          var enableCart = root.getAttribute('data-fhs-cart') !== '0';
          var autoplay = root.getAttribute('data-fhs-autoplay') === '1';

          var archBase = root.querySelector('[data-fhs-arch-base]');
          var stage = root.querySelector('[data-fhs-stage]');
          var labelA = root.querySelector('[data-fhs-label-a]');
          var titleA = root.querySelector('[data-fhs-title-a]');
          var priceA = root.querySelector('[data-fhs-price-a]');
          var labelB = root.querySelector('[data-fhs-label-b]');
          var titleB = root.querySelector('[data-fhs-title-b]');
          var priceB = root.querySelector('[data-fhs-price-b]');
          var badgeEl = root.querySelector('[data-fhs-badge]');
          var detailPanel = root.querySelector('[data-fhs-detail-panel]');
          var descEl = root.querySelector('[data-fhs-desc]');
          var variantsEl = root.querySelector('[data-fhs-variants]');
          var cartActionsEl = root.querySelector('[data-fhs-cart-actions]');
          var menuBtn = root.querySelector('[data-fhs-menu]');
          var detailDotsEl = root.querySelector('[data-fhs-detail-dots]');
          var dotsBelowEl = root.querySelector('[data-fhs-dots-below]');
          var dotsOverlayEl = root.querySelector('[data-fhs-dots-overlay]');
          var searchToggleBtn = root.querySelector('[data-fhs-search-toggle]');
          var searchBox = root.querySelector('[data-fhs-search-box]');
          var searchInput = root.querySelector('[data-fhs-search-input]');
          var searchResults = root.querySelector('[data-fhs-search-results]');
          var openCartHeaderBtn = root.querySelector('[data-fhs-open-cart]');
          var cartBadgeEl = root.querySelector('[data-fhs-cart-badge]');

          // Continuous unbounded float slide position
          var pos = 0;
          var rafId = null;
          var detailOpen = false;
          var detailTransitionUntil = 0;
          var selectedVariants = {};
          var lastRenderedUiKey = '';

          // Drag state with velocity & scroll-intent lock
          var drag = {
            active: false,
            pointerId: null,
            startX: 0,
            startY: 0,
            startPos: 0,
            lastX: 0,
            lastTime: 0,
            vx: 0,
            dx: 0,
            intent: null,
            moved: false,
          };

          function wrap(i) {
            return ((i % items.length) + items.length) % items.length;
          }

          // Build persistent 5-slot DOM pool once (ZERO innerHTML thrashing during swipe/rAF!)
          var slotOffsets = items.length === 1 ? [0] : [-2, -1, 0, 1, 2];
          var wPx = Math.round(prodSize * 0.84);
          var slotPool = [];
          if (stage) {
            stage.innerHTML = '';
            slotOffsets.forEach(function (off) {
              var box = document.createElement('div');
              box.setAttribute('data-fhs-slot-pool', String(off));
              box.style.position = 'absolute';
              box.style.left = '50%';
              box.style.top = '50%';
              box.style.width = wPx + 'px';
              box.style.height = prodSize + 'px';
              box.style.cursor = 'pointer';
              box.style.display = 'flex';
              box.style.alignItems = 'center';
              box.style.justifyContent = 'center';
              box.style.willChange = 'transform, opacity';

              var img = document.createElement('img');
              img.draggable = false;
              img.referrerPolicy = 'no-referrer';
              img.style.width = '100%';
              img.style.height = '100%';
              img.style.objectFit = 'contain';
              img.style.pointerEvents = 'none';
              box.appendChild(img);
              stage.appendChild(box);
              slotPool.push({ off: off, el: box, img: img, curSrc: '', curSlotIdx: 0 });
            });
          }

          function cancelAnim() {
            if (rafId !== null) {
              cancelAnimationFrame(rafId);
              rafId = null;
            }
          }

          function animateToPos(targetPos, durationMs) {
            cancelAnim();
            var fromPos = pos;
            var delta = targetPos - fromPos;
            if (Math.abs(delta) < 0.0005) {
              pos = targetPos;
              renderFrame();
              return;
            }
            var dur = durationMs || 440;
            var startT = performance.now();
            function tick(now) {
              var p = Math.min(1, (now - startT) / dur);
              pos = fromPos + delta * easeOutCubic(p);
              renderFrame();
              if (p < 1) {
                rafId = requestAnimationFrame(tick);
              } else {
                rafId = null;
                pos = targetPos;
                renderFrame();
              }
            }
            rafId = requestAnimationFrame(tick);
          }

          function animateToItemIdx(targetItemIdx) {
            if (items.length <= 1) return;
            var curRounded = Math.round(pos);
            var curWrapped = wrap(curRounded);
            var diff = wrap(targetItemIdx) - curWrapped;
            if (diff > items.length / 2) diff -= items.length;
            if (diff < -items.length / 2) diff += items.length;
            animateToPos(curRounded + diff, 460);
          }

          function syncHeaderCartBadge() {
            if (!cartBadgeEl) return;
            var totalQty = 0;
            document.querySelectorAll('[data-fnb-qty]').forEach(function (qEl) {
              var n = parseInt(qEl.textContent || '0', 10);
              if (!isNaN(n) && n > 0) totalQty += n;
            });
            if (totalQty > 0) {
              cartBadgeEl.textContent = String(totalQty);
              cartBadgeEl.style.display = 'flex';
            } else {
              cartBadgeEl.style.display = 'none';
            }
          }

          function renderFrame() {
            var sw = root.clientWidth || 340;
            var slotSpacingPx = Math.max(142, sw * 0.49);
            var nearestSlot = Math.round(pos);
            var activeIdx = wrap(nearestSlot);
            var cur = items[activeIdx];

            // Real-time RGB color morphing between floor(pos) and floor(pos)+1
            var floorSlot = Math.floor(pos);
            var frac = pos - floorSlot;
            var itemA = items[wrap(floorSlot)];
            var itemB = items[wrap(floorSlot + 1)];
            var morphedFrom = detailOpen ? (cur.gradientFrom || '#FF9A7B') : lerpRgb(itemA.gradientFrom, itemB.gradientFrom, frac, [255, 154, 123]);
            var morphedTo = detailOpen ? (cur.gradientTo || '#FFB778') : lerpRgb(itemA.gradientTo, itemB.gradientTo, frac, [255, 183, 120]);

            if (archBase) {
              archBase.style.left = detailOpen ? '0%' : '-22%';
              archBase.style.width = detailOpen ? '100%' : '144%';
              archBase.style.height = detailOpen ? '100%' : archH + 'px';
              archBase.style.borderBottomLeftRadius = detailOpen ? '0px' : '50% ' + archCurve + '%';
              archBase.style.borderBottomRightRadius = detailOpen ? '0px' : '50% ' + archCurve + '%';
              archBase.style.background = 'linear-gradient(155deg, ' + morphedFrom + ', ' + morphedTo + ')';
            }
            if (cartBadgeEl) {
              cartBadgeEl.style.color = morphedFrom;
            }

            // Update 5 persistent product slots smoothly via GPU translate3d + Hermite center-scale
            var detailShadow = hasShadow ? 'drop-shadow(0px 26px 26px rgba(15,23,42,0.28))' : 'none';
            slotPool.forEach(function (slot) {
              var slotIdx = nearestSlot + slot.off;
              var it = items[wrap(slotIdx)];
              slot.curSlotIdx = slotIdx;
              slot.el.setAttribute('data-fhs-slot-idx', String(slotIdx));

              if (slot.curSrc !== it.image) {
                slot.curSrc = it.image;
                slot.img.src = it.image || '';
                slot.img.alt = it.title || '';
              }

              var rel = slotIdx - pos;
              var absRel = Math.abs(rel);
              var isNearest = slotIdx === nearestSlot;
              var focus = Math.max(0, 1 - absRel);
              var sFocus = smoothstep(focus);

              var baseScale = detailOpen
                ? (isNearest ? 1.09 : peekPct * 0.72)
                : (peekPct + (1 - peekPct) * sFocus);
              var effScale = baseScale * (zoomPct / 100);
              var tx = detailOpen
                ? (isNearest ? 0 : (rel < 0 ? -sw * 0.95 : sw * 0.95))
                : rel * slotSpacingPx;
              var ty = detailOpen
                ? (isNearest ? -6 : 24)
                : Math.pow(Math.min(1.5, absRel), 1.15) * 18;
              var op = detailOpen
                ? (isNearest ? 1 : 0)
                : Math.max(0, 1 - Math.max(0, absRel - 0.85) * 0.72);
              var z = (isNearest && detailOpen) ? 20 : Math.round(20 - Math.min(16, absRel * 10));

              var useDetailTrans = (detailOpen || performance.now() < detailTransitionUntil) && !drag.active;
              slot.el.style.transition = useDetailTrans
                ? 'transform 420ms cubic-bezier(0.22,1,0.36,1), opacity 320ms ease'
                : 'none';
              slot.el.style.transform = 'translate3d(-50%,-50%,0) translate3d(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px,0) scale(' + effScale.toFixed(4) + ')';
              slot.el.style.opacity = op.toFixed(3);
              slot.el.style.zIndex = String(z);
              slot.el.style.pointerEvents = (detailOpen && !isNearest) ? 'none' : 'auto';

              if (!hasShadow) {
                slot.img.style.filter = 'none';
              } else if (detailOpen && isNearest) {
                slot.img.style.filter = detailShadow;
              } else {
                var shY = (10 + 10 * sFocus).toFixed(1);
                var shA = (0.12 + 0.12 * sFocus).toFixed(2);
                slot.img.style.filter = 'drop-shadow(0px ' + shY + 'px ' + shY + 'px rgba(15,23,42,' + shA + '))';
              }
            });

            // Dual-layer synchronized cross-glide title & price
            var isMid = !detailOpen && items.length > 1 && frac > 0.002 && frac < 0.998;
            if (isMid) {
              if (labelA && titleA && priceA) {
                titleA.textContent = itemA.title;
                titleA.style.color = itemA.titleColor || '#B5836D';
                priceA.textContent = itemA.price;
                priceA.style.color = '#1E293B';
                labelA.style.transform = 'translate3d(' + (-frac * 46).toFixed(1) + 'px,0,0)';
                labelA.style.opacity = String(Math.max(0, 1 - frac * 1.45).toFixed(3));
              }
              if (labelB && titleB && priceB) {
                titleB.textContent = itemB.title;
                titleB.style.color = itemB.titleColor || '#B5836D';
                priceB.textContent = itemB.price;
                priceB.style.color = '#1E293B';
                labelB.style.transform = 'translate3d(' + ((1 - frac) * 46).toFixed(1) + 'px,0,0)';
                labelB.style.opacity = String(Math.max(0, (frac - 0.12) * 1.35).toFixed(3));
              }
            } else {
              if (labelA && titleA && priceA) {
                titleA.textContent = cur.title;
                titleA.style.color = detailOpen ? '#FFFFFF' : (cur.titleColor || '#B5836D');
                priceA.textContent = cur.price;
                priceA.style.color = detailOpen ? 'rgba(255,255,255,0.95)' : '#1E293B';
                labelA.style.transform = 'translate3d(0,0,0)';
                labelA.style.opacity = '1';
              }
              if (labelB) {
                labelB.style.opacity = '0';
              }
            }

            // Discrete UI chrome updates (only rebuild when activeIdx, detailOpen, or variant changes!)
            var selVar = selectedVariants[cur.id] || '';
            var uiKey = activeIdx + '|' + (detailOpen ? '1' : '0') + '|' + selVar;
            if (uiKey !== lastRenderedUiKey) {
              lastRenderedUiKey = uiKey;

              if (menuBtn) {
                menuBtn.innerHTML = detailOpen
                  ? '<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="m15 18-6-6 6-6"/></svg>'
                  : '<svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><line x1="4" y1="7" x2="20" y2="7"/><line x1="4" y1="12" x2="16" y2="12"/><line x1="4" y1="17" x2="20" y2="17"/></svg>';
              }

              if (detailDotsEl) {
                if (detailOpen && items.length > 1) {
                  detailDotsEl.style.display = 'flex';
                  detailDotsEl.innerHTML = items.slice(0, 6).map(function (_it, idx) {
                    var isC = idx === activeIdx;
                    return '<button type="button" data-fhs-goto="' + idx + '" style="width:' + (isC ? '18px' : '6px') + '; height:5px; border-radius:9999px; border:0; padding:0; cursor:pointer; background:' + (isC ? '#FFFFFF' : 'rgba(255,255,255,0.45)') + '; transition:all 260ms ease;"></button>';
                  }).join('');
                } else {
                  detailDotsEl.style.display = 'none';
                }
              }

              var b = activeIdx === 0 ? 0 : activeIdx === items.length - 1 ? 2 : 1;
              if (dotsBelowEl) {
                if (!detailOpen && items.length > 1) {
                  dotsBelowEl.style.display = 'flex';
                  dotsBelowEl.innerHTML = [0, 1, 2].map(function (d) {
                    var isA = b === d;
                    var tIdx = d === 0 ? 0 : d === 2 ? items.length - 1 : Math.floor(items.length / 2);
                    return '<button type="button" data-fhs-goto="' + tIdx + '" style="width:' + (isA ? '18px' : '6px') + '; height:6px; border-radius:9999px; border:0; padding:0; cursor:pointer; background:' + (isA ? cur.gradientFrom : '#CBD5E1') + '; transition:all 220ms ease;"></button>';
                  }).join('');
                } else {
                  dotsBelowEl.style.display = 'none';
                }
              }
              if (dotsOverlayEl) {
                if (!detailOpen && items.length > 1) {
                  dotsOverlayEl.style.display = 'inline-flex';
                  dotsOverlayEl.innerHTML = [0, 1, 2].map(function (d) {
                    var isA = b === d;
                    var tIdx = d === 0 ? 0 : d === 2 ? items.length - 1 : Math.floor(items.length / 2);
                    return '<button type="button" data-fhs-goto="' + tIdx + '" style="width:' + (isA ? '18px' : '6px') + '; height:6px; border-radius:9999px; border:0; padding:0; cursor:pointer; background:' + (isA ? '#FFFFFF' : 'rgba(255,255,255,0.5)') + '; transition:all 220ms ease;"></button>';
                  }).join('');
                } else {
                  dotsOverlayEl.style.display = 'none';
                }
              }

              if (badgeEl) {
                if (detailOpen && cur.badge) {
                  badgeEl.textContent = cur.badge;
                  badgeEl.style.display = 'inline-block';
                } else {
                  badgeEl.style.display = 'none';
                }
              }
              if (detailPanel) {
                detailPanel.style.display = detailOpen ? 'block' : 'none';
              }
              if (detailOpen) {
                if (descEl) {
                  descEl.textContent = cur.description || cur.subtitle || '';
                  descEl.style.display = (cur.description || cur.subtitle) ? 'block' : 'none';
                }
                var vars = (cur.variants || '').split(',').map(function (x) { return x.trim(); }).filter(Boolean);
                if (vars.length && !selectedVariants[cur.id]) selectedVariants[cur.id] = vars[0];
                if (variantsEl) {
                  variantsEl.innerHTML = vars.map(function (v) {
                    var on = selectedVariants[cur.id] === v;
                    return '<button type="button" data-fhs-var="' + v.replace(/"/g, '&quot;') + '" style="padding:5px 12px; border-radius:9999px; border:0; font-size:11px; font-weight:600; cursor:pointer; font-family:inherit; background:' + (on ? '#FFFFFF' : 'rgba(255,255,255,0.22)') + '; color:' + (on ? '#0F172A' : '#FFFFFF') + ';">' + v + '</button>';
                  }).join('');
                }
                if (cartActionsEl && enableCart) {
                  var pairKey = blockId + '::' + cur.id;
                  cartActionsEl.innerHTML =
                    '<button type="button" data-fnb-add="' + pairKey + '" style="display:inline-flex; align-items:center; gap:8px; padding:10px 20px; border-radius:9999px; border:0; background:#FFFFFF; color:' + cur.gradientFrom + '; font-size:12px; font-weight:800; cursor:pointer; font-family:inherit; box-shadow:0 6px 16px rgba(15,23,42,0.18);">+ Tambah ke Keranjang</button>' +
                    '<div data-fnb-stepper="' + pairKey + '" style="display:none; align-items:center; gap:12px; padding:6px 12px; border-radius:9999px; background:#FFFFFF; color:#0F172A; box-shadow:0 6px 16px rgba(15,23,42,0.18);">' +
                      '<button type="button" data-fnb-dec="' + pairKey + '" style="width:28px; height:28px; border-radius:9999px; border:0; background:#F1F5F9; color:#0F172A; font-weight:800; cursor:pointer;">-</button>' +
                      '<span data-fnb-qty="' + pairKey + '" style="min-width:20px; text-align:center; font-size:13px; font-weight:800;">0</span>' +
                      '<button type="button" data-fnb-inc="' + pairKey + '" style="width:28px; height:28px; border-radius:9999px; border:0; background:' + cur.gradientFrom + '; color:#FFFFFF; font-weight:800; cursor:pointer;">+</button>' +
                    '</div>';
                }
              }
              if (typeof window.__lynkSyncAdminWa === 'function') {
                window.__lynkSyncAdminWa(root, cur.title, cur.price);
              }
            }
          }

          root.addEventListener('pointerdown', function (e) {
            if (detailOpen || items.length <= 1) return;
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            if (e.target && e.target.closest && e.target.closest('button, input, a')) return;
            cancelAnim();
            drag.active = true;
            drag.pointerId = e.pointerId;
            drag.startX = e.clientX;
            drag.startY = e.clientY;
            drag.startPos = pos;
            drag.lastX = e.clientX;
            drag.lastTime = performance.now();
            drag.vx = 0;
            drag.dx = 0;
            drag.intent = null;
            drag.moved = false;
          });

          root.addEventListener('pointermove', function (e) {
            if (!drag.active) return;
            var dx = e.clientX - drag.startX;
            var dy = e.clientY - drag.startY;
            if (drag.intent === null) {
              if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
              if (Math.abs(dy) > Math.abs(dx) * 1.25) {
                drag.intent = 'v';
                drag.active = false;
                return;
              }
              drag.intent = 'h';
              drag.moved = true;
              root.style.cursor = 'grabbing';
              try { root.setPointerCapture(e.pointerId); } catch (_e) {}
            }
            if (drag.intent === 'h') {
              var now = performance.now();
              var dt = Math.max(8, now - drag.lastTime);
              drag.vx = (e.clientX - drag.lastX) / dt;
              drag.lastX = e.clientX;
              drag.lastTime = now;
              drag.dx = dx;
              var sw = root.clientWidth || 340;
              var swipeStep = Math.max(140, sw * 0.56);
              pos = drag.startPos - dx / swipeStep;
              renderFrame();
            }
          });

          function endDrag(e) {
            if (!drag.active) return;
            var wasH = drag.intent === 'h';
            var dx = drag.dx;
            var vx = drag.vx;
            var sPos = drag.startPos;
            var pId = drag.pointerId;
            drag.active = false;
            drag.intent = null;
            drag.pointerId = null;
            root.style.cursor = (!detailOpen && items.length > 1) ? 'grab' : 'default';
            if (e && pId !== null) {
              try {
                if (root.hasPointerCapture && root.hasPointerCapture(pId)) root.releasePointerCapture(pId);
              } catch (_e) {}
            }
            if (!wasH) return;
            var targetPos = Math.round(pos);
            if (Math.abs(pos - sPos) < 0.5) {
              if (dx <= -32 || vx <= -0.32) targetPos = Math.round(sPos) + 1;
              else if (dx >= 32 || vx >= 0.32) targetPos = Math.round(sPos) - 1;
              else targetPos = Math.round(sPos);
            }
            var dist = Math.abs(targetPos - pos);
            var dur = Math.max(220, Math.min(440, Math.round(200 + dist * 280)));
            animateToPos(targetPos, dur);
          }

          root.addEventListener('pointerup', endDrag);
          root.addEventListener('pointercancel', endDrag);
          window.addEventListener('resize', renderFrame);

          root.addEventListener('click', function (e) {
            var t = e.target;
            if (!t || !t.closest) return;
            var gotoBtn = t.closest('[data-fhs-goto]');
            if (gotoBtn) {
              animateToItemIdx(parseInt(gotoBtn.getAttribute('data-fhs-goto') || '0', 10) || 0);
              if (searchBox && searchBox.style.display !== 'none') {
                searchBox.style.display = 'none';
                if (searchInput) searchInput.value = '';
                if (searchResults) searchResults.innerHTML = '';
              }
              return;
            }
            var varBtn = t.closest('[data-fhs-var]');
            if (varBtn) {
              var curItem = items[wrap(Math.round(pos))];
              selectedVariants[curItem.id] = varBtn.getAttribute('data-fhs-var') || '';
              lastRenderedUiKey = '';
              renderFrame();
              return;
            }
            var slotEl = t.closest('[data-fhs-slot-idx]');
            if (slotEl) {
              if (drag.moved) { drag.moved = false; return; }
              var clickedSlotIdx = parseInt(slotEl.getAttribute('data-fhs-slot-idx') || '0', 10);
              var nearestSlot = Math.round(pos);
              if (clickedSlotIdx !== nearestSlot && !detailOpen) {
                animateToPos(clickedSlotIdx, 460);
              } else if (enableDetail) {
                pos = nearestSlot;
                detailOpen = !detailOpen;
                detailTransitionUntil = performance.now() + 460;
                root.style.cursor = (!detailOpen && items.length > 1) ? 'grab' : 'default';
                lastRenderedUiKey = '';
                renderFrame();
              }
              return;
            }
          });

          document.addEventListener('click', function () {
            setTimeout(syncHeaderCartBadge, 40);
          });

          if (menuBtn) {
            menuBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              if (detailOpen) {
                detailOpen = false;
                detailTransitionUntil = performance.now() + 460;
                root.style.cursor = items.length > 1 ? 'grab' : 'default';
                lastRenderedUiKey = '';
                renderFrame();
              } else if (enableDetail) {
                pos = Math.round(pos);
                detailOpen = true;
                detailTransitionUntil = performance.now() + 460;
                root.style.cursor = 'default';
                lastRenderedUiKey = '';
                renderFrame();
              }
            });
          }

          if (openCartHeaderBtn) {
            openCartHeaderBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              var floatBtn = document.getElementById('lynk-fnb-float-btn') || document.getElementById('lynk-open-cart-btn');
              if (floatBtn) floatBtn.click();
              else if (enableDetail && !detailOpen) {
                pos = Math.round(pos);
                detailOpen = true;
                detailTransitionUntil = performance.now() + 460;
                lastRenderedUiKey = '';
                renderFrame();
              }
            });
          }

          if (searchToggleBtn && searchBox) {
            searchToggleBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              var nextOpen = searchBox.style.display === 'none';
              searchBox.style.display = nextOpen ? 'block' : 'none';
              if (nextOpen && searchInput) searchInput.focus();
            });
          }
          if (searchInput && searchResults) {
            searchInput.addEventListener('input', function () {
              var q = (searchInput.value || '').trim().toLowerCase();
              if (!q) { searchResults.innerHTML = ''; return; }
              var matches = items.map(function (it, idx) { return { it: it, idx: idx }; }).filter(function (x) {
                return (x.it.title || '').toLowerCase().indexOf(q) >= 0 || (x.it.subtitle || '').toLowerCase().indexOf(q) >= 0;
              });
              searchResults.innerHTML = matches.length
                ? matches.map(function (m) {
                    return '<button type="button" data-fhs-goto="' + m.idx + '" style="display:flex; align-items:center; justify-content:space-between; width:100%; padding:6px 8px; border-radius:8px; border:0; background:#F8FAFC; cursor:pointer; font-size:12px; font-family:inherit; text-align:left;"><span style="font-weight:600; color:#0F172A;">' + m.it.title + '</span><span style="font-weight:700; color:#475569;">' + m.it.price + '</span></button>';
                  }).join('')
                : '<div style="font-size:11px; color:#94A3B8; text-align:center; padding:6px;">Menu tidak ditemukan</div>';
            });
          }

          if (autoplay && items.length > 1) {
            setInterval(function () {
              if (!detailOpen && !drag.active) {
                animateToPos(Math.round(pos) + 1, 520);
              }
            }, 3800);
          }

          renderFrame();
          syncHeaderCartBadge();
        });
      })();

      // --- SLIDE KULINER PUTAR (AMBIENT BLUR + SPIN-ARC ROTATIONAL SWIPE 60FPS) ---
      (function initCulinarySpinSliders() {
        var sliders = Array.prototype.slice.call(document.querySelectorAll('[data-culinary-spin-slider]'));
        if (!sliders.length) return;

        function cssSmoothstep(x) {
          var c = Math.max(0, Math.min(1, x));
          return c * c * (3 - 2 * c);
        }
        function cssEaseOutCubic(t) {
          return 1 - Math.pow(1 - t, 3);
        }

        sliders.forEach(function (root) {
          var blockId = root.getAttribute('data-culinary-spin-slider') || '';
          var items = [];
          try {
            items = JSON.parse(root.getAttribute('data-css-items') || '[]');
          } catch (_) {
            items = [];
          }
          if (!items.length) return;

          var plateSize = Number(root.getAttribute('data-css-size') || 220);
          var imageZoom = Number(root.getAttribute('data-css-zoom') || 100) / 100;
          var spinAngle = Number(root.getAttribute('data-css-spin') || 58);
          var blurOpacityMax = Number(root.getAttribute('data-css-blur-op') || 45) / 100;
          var hasShadow = root.getAttribute('data-css-shadow') !== '0';
          var accentColor = root.getAttribute('data-css-accent') || '#DC2626';
          var showInfo = root.getAttribute('data-css-show-info') !== '0';
          var showPrice = root.getAttribute('data-css-show-price') !== '0';
          var showDescDefault = root.getAttribute('data-css-show-desc') === '1';
          var showCartBtn = root.getAttribute('data-css-show-cart') !== '0';
          var enableDetail = root.getAttribute('data-css-detail') !== '0';
          var autoplay = root.getAttribute('data-css-autoplay') === '1';
          var dotsMode = root.getAttribute('data-css-dots') || 'none';

          var blurA = root.querySelector('[data-css-blur-a]');
          var blurB = root.querySelector('[data-css-blur-b]');
          var stage = root.querySelector('[data-css-stage]');
          var badgeEl = root.querySelector('[data-css-badge]');
          var labelA = root.querySelector('[data-css-label-a]');
          var labelB = root.querySelector('[data-css-label-b]');
          var titleA = root.querySelector('[data-css-title-a]');
          var priceA = root.querySelector('[data-css-price-a]');
          var titleB = root.querySelector('[data-css-title-b]');
          var priceB = root.querySelector('[data-css-price-b]');
          var detailPanel = root.querySelector('[data-css-detail-panel]');
          var descEl = root.querySelector('[data-css-desc]');
          var variantsEl = root.querySelector('[data-css-variants]');
          var cartActionsEl = root.querySelector('[data-css-cart-actions]');
          var dotsOverlay = root.querySelector('[data-css-dots-overlay]');
          var dotsBelow = root.querySelector('[data-css-dots-below]');
          var backBtn = root.querySelector('[data-css-back]');
          var prevBtn = root.querySelector('[data-css-prev]');
          var nextBtn = root.querySelector('[data-css-next]');
          var openCartHeaderBtn = root.querySelector('[data-css-open-cart]');
          var cartBadgeEl = root.querySelector('[data-css-cart-badge]');

          var pos = 0;
          var rafId = null;
          var detailOpen = false;
          var selectedVariants = {};
          var lastUiKey = '';
          var lastBlurSrcA = '';
          var lastBlurSrcB = '';
          var wheelTimer = null;
          var drag = {
            active: false,
            source: null,
            pointerId: null,
            startX: 0,
            startY: 0,
            startPos: 0,
            lastX: 0,
            lastTime: 0,
            vx: 0,
            dx: 0,
            intent: null,
            moved: false,
            lastMovedAt: 0,
          };

          function wrap(i) {
            return ((i % items.length) + items.length) % items.length;
          }
          function parseVariants(raw) {
            return String(raw || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          }
          function getActiveVariant(it) {
            var list = parseVariants(it.variants);
            if (!list.length) return '';
            return selectedVariants[it.id] || list[0];
          }
          function getStageSpan() {
            var w = root.clientWidth || 340;
            return Math.max(148, Math.min(225, w * 0.56));
          }
          function getSwipeStep() {
            var w = root.clientWidth || 340;
            return Math.max(135, Math.min(220, w * 0.54));
          }

          var pool = [];
          if (stage) {
            stage.innerHTML = '';
            var slotCount = items.length === 1 ? 1 : 5;
            for (var p = 0; p < slotCount; p++) {
              var slotEl = document.createElement('div');
              slotEl.setAttribute('data-css-slot', String(p));
              slotEl.style.cssText =
                'position:absolute; left:50%; top:50%; width:' + plateSize + 'px; height:' + plateSize +
                'px; display:flex; align-items:center; justify-content:center; will-change:transform, opacity; cursor:pointer;';
              var imgEl = document.createElement('img');
              imgEl.draggable = false;
              imgEl.referrerPolicy = 'no-referrer';
              imgEl.style.cssText = 'width:100%; height:100%; object-fit:contain; pointer-events:none; user-select:none;';
              slotEl.appendChild(imgEl);
              stage.appendChild(slotEl);
              pool.push({ el: slotEl, img: imgEl, src: '', slotIdx: 0, isCenter: false });
            }
          }

          function syncHeaderCartBadge() {
            if (!cartBadgeEl) return;
            var totalQty = 0;
            document.querySelectorAll('[data-fnb-qty]').forEach(function (qEl) {
              var n = parseInt(qEl.textContent || '0', 10);
              if (!isNaN(n) && n > 0) totalQty += n;
            });
            cartBadgeEl.textContent = String(totalQty);
            cartBadgeEl.style.display = totalQty > 0 ? 'flex' : 'none';
          }

          function syncActiveUi(idx) {
            var active = items[idx] || items[0];
            var activeVar = getActiveVariant(active);
            var uiKey = idx + '|' + (detailOpen ? '1' : '0') + '|' + activeVar;
            if (uiKey === lastUiKey) return;
            lastUiKey = uiKey;

            if (badgeEl) {
              badgeEl.textContent = active.badge || '';
              badgeEl.style.display = showInfo && active.badge ? 'inline-block' : 'none';
            }
            if (detailPanel) {
              var panelVisible = showDescDefault || detailOpen;
              detailPanel.style.display = panelVisible ? 'block' : 'none';
              if (descEl) {
                var descTxt = active.description || active.subtitle || '';
                descEl.textContent = descTxt;
                descEl.style.display = descTxt ? 'block' : 'none';
              }
              if (variantsEl) {
                var vList = parseVariants(active.variants);
                if (vList.length) {
                  variantsEl.style.display = 'flex';
                  variantsEl.innerHTML = vList.map(function (v) {
                    var on = v === activeVar;
                    return '<button type="button" data-css-var="' + v.replace(/"/g, '&quot;') + '" style="padding:4px 10px; border-radius:9999px; border:1px solid ' + (on ? accentColor : '#CBD5E1') + '; background:' + (on ? accentColor : '#FFFFFF') + '; color:' + (on ? '#FFFFFF' : '#334155') + '; font-size:11px; font-weight:700; cursor:pointer; font-family:inherit;">' + v + '</button>';
                  }).join('');
                } else {
                  variantsEl.style.display = 'none';
                  variantsEl.innerHTML = '';
                }
              }
            }
            if (cartActionsEl && showCartBtn) {
              var fnbKey = blockId + '::' + active.id;
              cartActionsEl.innerHTML =
                '<button type="button" data-fnb-add="' + fnbKey + '" data-add-display="inline-flex" style="display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:9px 20px; border-radius:9999px; border:0; background:' + accentColor + '; color:#FFFFFF; font-size:12.5px; font-weight:700; cursor:pointer; font-family:inherit; box-shadow:0 8px 18px rgba(15,23,42,0.16);">+ Tambah ke Keranjang</button>' +
                '<div data-fnb-stepper="' + fnbKey + '" style="display:none; align-items:center; gap:10px; padding:4px 8px; border-radius:9999px; background:#FFFFFF; border:1px solid ' + accentColor + '33; box-shadow:0 4px 12px rgba(15,23,42,0.08);">' +
                '  <button type="button" data-fnb-dec="' + fnbKey + '" style="width:26px; height:26px; border-radius:9999px; border:0; background:#F1F5F9; color:#0F172A; font-size:15px; font-weight:700; cursor:pointer;">-</button>' +
                '  <span data-fnb-qty="' + fnbKey + '" style="min-width:20px; text-align:center; font-size:13px; font-weight:800; color:#0F172A;">0</span>' +
                '  <button type="button" data-fnb-inc="' + fnbKey + '" style="width:26px; height:26px; border-radius:9999px; border:0; background:' + accentColor + '; color:#FFFFFF; font-size:15px; font-weight:700; cursor:pointer;">+</button>' +
                '</div>';
            }

            if (dotsOverlay && dotsMode === 'overlay') {
              dotsOverlay.innerHTML = items.map(function (_, i) {
                var on = i === idx;
                return '<button type="button" data-css-dot="' + i + '" aria-label="Slide ' + (i + 1) + '" style="width:' + (on ? 18 : 6) + 'px; height:6px; padding:0; border:0; border-radius:9999px; background:' + (on ? '#FFFFFF' : 'rgba(255,255,255,0.52)') + '; cursor:pointer; transition:all 220ms ease;"></button>';
              }).join('');
            }
            if (dotsBelow && dotsMode === 'below') {
              dotsBelow.innerHTML = items.map(function (_, i) {
                var on = i === idx;
                return '<button type="button" data-css-dot="' + i + '" aria-label="Slide ' + (i + 1) + '" style="width:' + (on ? 18 : 6) + 'px; height:6px; padding:0; border:0; border-radius:9999px; background:' + (on ? accentColor : '#CBD5E1') + '; cursor:pointer; transition:all 220ms ease;"></button>';
              }).join('');
            }
            if (typeof window.__lynkSyncAdminWa === 'function') {
              window.__lynkSyncAdminWa(root, active.title, active.price);
            }
          }

          function renderFrame() {
            var baseFloor = Math.floor(pos);
            var frac = pos - baseFloor;
            var easedFrac = cssSmoothstep(frac);
            var fromIdx = wrap(baseFloor);
            var toIdx = wrap(baseFloor + 1);
            var nearestInt = Math.round(pos);
            var activeIdx = wrap(nearestInt);
            var fromItem = items[fromIdx] || items[0];
            var toItem = items[toIdx] || fromItem;

            if (blurA && blurB) {
              if (lastBlurSrcA !== (fromItem.image || '')) {
                blurA.src = fromItem.image || '';
                lastBlurSrcA = fromItem.image || '';
              }
              if (lastBlurSrcB !== (toItem.image || '')) {
                blurB.src = toItem.image || '';
                lastBlurSrcB = toItem.image || '';
              }
              blurA.style.opacity = (Math.max(0, 1 - easedFrac * 1.45) * blurOpacityMax).toFixed(4);
              blurA.style.transform = 'translate3d(-50%,-50%,0) scale(' + (1.02 + easedFrac * 0.08).toFixed(3) + ') rotate(' + (-easedFrac * 18).toFixed(1) + 'deg)';
              blurB.style.opacity = (Math.max(0, (easedFrac - 0.15) * 1.25) * blurOpacityMax).toFixed(4);
              blurB.style.transform = 'translate3d(-50%,-50%,0) scale(' + (1.1 - easedFrac * 0.08).toFixed(3) + ') rotate(' + ((1 - easedFrac) * 18).toFixed(1) + 'deg)';
            }

            if (labelA && labelB) {
              var showDual = frac > 0.002 && frac < 0.998 && fromIdx !== toIdx;
              if (showDual) {
                if (titleA) { titleA.textContent = fromItem.title; titleA.style.color = fromItem.titleColor || '#1E293B'; }
                if (priceA) { priceA.textContent = fromItem.price; }
                labelA.style.opacity = Math.max(0, 1 - easedFrac * 1.35).toFixed(3);
                labelA.style.transform = 'translate3d(' + (-easedFrac * 24).toFixed(2) + 'px,0,0)';

                if (titleB) { titleB.textContent = toItem.title; titleB.style.color = toItem.titleColor || '#1E293B'; }
                if (priceB) { priceB.textContent = toItem.price; }
                labelB.style.opacity = Math.max(0, Math.min(1, (easedFrac - 0.15) * 1.25)).toFixed(3);
                labelB.style.transform = 'translate3d(' + ((1 - easedFrac) * 24).toFixed(2) + 'px,0,0)';
              } else {
                var act = items[activeIdx] || items[0];
                if (titleA) { titleA.textContent = act.title; titleA.style.color = act.titleColor || '#1E293B'; }
                if (priceA) { priceA.textContent = act.price; }
                labelA.style.opacity = '1';
                labelA.style.transform = 'translate3d(0,0,0)';
                labelB.style.opacity = '0';
              }
            }

            var span = getStageSpan();
            for (var s = 0; s < pool.length; s++) {
              var slotObj = pool[s];
              var relIdx = pool.length === 1 ? 0 : s - 2;
              var slotIdx = nearestInt + relIdx;
              var itemIdx = wrap(slotIdx);
              var item = items[itemIdx];
              var dist = slotIdx - pos;
              var absDist = Math.abs(dist);
              var isCenter = absDist < 0.32;
              var focus = cssSmoothstep(Math.max(0, 1 - absDist));
              var scale = (0.68 + 0.32 * focus) * imageZoom;
              var tx = dist * span;
              var ty = Math.pow(Math.min(1.4, absDist), 1.35) * 46;
              var rot = dist * spinAngle;
              var opacity = Math.max(0, 1 - Math.max(0, absDist - 0.95) * 0.85);

              slotObj.slotIdx = slotIdx;
              slotObj.isCenter = isCenter;
              if (slotObj.src !== (item.image || '')) {
                slotObj.img.src = item.image || '';
                slotObj.img.alt = item.title || '';
                slotObj.src = item.image || '';
              }
              slotObj.el.style.transform =
                'translate3d(-50%,-50%,0) translate3d(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px,0) rotate(' + rot.toFixed(2) + 'deg) scale(' + scale.toFixed(4) + ')';
              slotObj.el.style.opacity = opacity.toFixed(3);
              slotObj.el.style.zIndex = String(Math.round(20 - Math.min(16, absDist * 10)));
              slotObj.img.style.filter = hasShadow
                ? (isCenter ? 'drop-shadow(0px 22px 24px rgba(15,23,42,0.26))' : 'drop-shadow(0px 12px 14px rgba(15,23,42,0.14))')
                : 'none';
            }

            syncActiveUi(activeIdx);
          }

          function cancelAnim() {
            if (rafId !== null) {
              cancelAnimationFrame(rafId);
              rafId = null;
            }
          }
          function animateToPos(targetPos, durationMs) {
            cancelAnim();
            var fromPos = pos;
            var delta = targetPos - fromPos;
            if (Math.abs(delta) < 0.0005) {
              pos = targetPos;
              renderFrame();
              return;
            }
            var start = performance.now();
            var dur = durationMs || 480;
            function step(now) {
              var prog = Math.min(1, (now - start) / dur);
              pos = fromPos + delta * cssEaseOutCubic(prog);
              renderFrame();
              if (prog < 1) rafId = requestAnimationFrame(step);
              else {
                pos = targetPos;
                rafId = null;
                renderFrame();
              }
            }
            rafId = requestAnimationFrame(step);
          }
          function goToIndex(targetIdx) {
            if (items.length <= 1) return;
            var cur = Math.round(pos);
            var curMod = wrap(cur);
            var diff = targetIdx - curMod;
            if (diff > items.length / 2) diff -= items.length;
            if (diff < -items.length / 2) diff += items.length;
            animateToPos(cur + diff, 460);
          }

          root.addEventListener('dragstart', function (e) {
            e.preventDefault();
          });

          function snapFromDrag() {
            var base = Math.round(drag.startPos);
            var target = Math.round(pos);
            if (target === base) {
              var thr = Math.max(28, getSwipeStep() * 0.2);
              if (drag.dx <= -thr || drag.vx < -0.28) target = base + 1;
              else if (drag.dx >= thr || drag.vx > 0.28) target = base - 1;
            }
            var spd = Math.min(1.5, Math.abs(drag.vx));
            animateToPos(target, Math.round(470 - spd * 120));
          }

          // Mouse / pen drag with window-level listeners (never loses fast flicks or steals clicks!)
          root.addEventListener('pointerdown', function (e) {
            if (items.length <= 1 || e.pointerType === 'touch') return;
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            if (e.target && e.target.closest && e.target.closest('button, input, a')) return;
            e.preventDefault();
            cancelAnim();
            drag.active = true;
            drag.source = 'pointer';
            drag.pointerId = e.pointerId;
            drag.startX = e.clientX;
            drag.startY = e.clientY;
            drag.startPos = pos;
            drag.lastX = e.clientX;
            drag.lastTime = performance.now();
            drag.vx = 0;
            drag.dx = 0;
            drag.intent = null;
            drag.moved = false;

            function onWinMove(ev) {
              if (!drag.active || drag.source !== 'pointer' || ev.pointerId !== drag.pointerId) return;
              var dx = ev.clientX - drag.startX;
              var dy = ev.clientY - drag.startY;
              if (drag.intent === null) {
                if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
                if (Math.abs(dy) > Math.abs(dx) * 1.35) {
                  drag.intent = 'v';
                  drag.active = false;
                  drag.source = null;
                  root.style.cursor = 'grab';
                  cleanupWin();
                  return;
                }
                drag.intent = 'h';
                drag.moved = true;
                drag.lastMovedAt = performance.now();
                root.style.cursor = 'grabbing';
              }
              if (drag.intent !== 'h') return;
              var now = performance.now();
              var dt = Math.max(8, now - drag.lastTime);
              drag.vx = (ev.clientX - drag.lastX) / dt;
              drag.lastX = ev.clientX;
              drag.lastTime = now;
              drag.dx = dx;
              drag.lastMovedAt = now;
              pos = drag.startPos - dx / getSwipeStep();
              renderFrame();
            }
            function onWinUp() {
              cleanupWin();
              if (!drag.active || drag.source !== 'pointer') return;
              var wasH = drag.intent === 'h';
              drag.active = false;
              drag.source = null;
              drag.intent = null;
              root.style.cursor = 'grab';
              if (wasH) snapFromDrag();
            }
            function cleanupWin() {
              window.removeEventListener('pointermove', onWinMove);
              window.removeEventListener('pointerup', onWinUp);
              window.removeEventListener('pointercancel', onWinUp);
            }
            window.addEventListener('pointermove', onWinMove);
            window.addEventListener('pointerup', onWinUp);
            window.addEventListener('pointercancel', onWinUp);
          });

          // Dedicated non-passive touch swipe for iOS Safari / Android Chrome
          root.addEventListener('touchstart', function (e) {
            if (items.length <= 1 || e.touches.length !== 1) return;
            if (e.target && e.target.closest && e.target.closest('button, input, a')) return;
            var t = e.touches[0];
            cancelAnim();
            drag.active = true;
            drag.source = 'touch';
            drag.startX = t.clientX;
            drag.startY = t.clientY;
            drag.startPos = pos;
            drag.lastX = t.clientX;
            drag.lastTime = performance.now();
            drag.vx = 0;
            drag.dx = 0;
            drag.intent = null;
            drag.moved = false;
          }, { passive: true });
          root.addEventListener('touchmove', function (e) {
            if (!drag.active || drag.source !== 'touch' || e.touches.length !== 1) return;
            var t = e.touches[0];
            var dx = t.clientX - drag.startX;
            var dy = t.clientY - drag.startY;
            if (drag.intent === null) {
              if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
              if (Math.abs(dy) > Math.abs(dx) * 1.25) {
                drag.intent = 'v';
                drag.active = false;
                drag.source = null;
                return;
              }
              drag.intent = 'h';
              drag.moved = true;
              drag.lastMovedAt = performance.now();
            }
            if (drag.intent === 'h') {
              e.preventDefault();
              var now = performance.now();
              var dt = Math.max(8, now - drag.lastTime);
              drag.vx = (t.clientX - drag.lastX) / dt;
              drag.lastX = t.clientX;
              drag.lastTime = now;
              drag.dx = dx;
              drag.lastMovedAt = now;
              pos = drag.startPos - dx / getSwipeStep();
              renderFrame();
            }
          }, { passive: false });
          function finishTouch() {
            if (!drag.active || drag.source !== 'touch') return;
            var wasH = drag.intent === 'h';
            drag.active = false;
            drag.source = null;
            drag.intent = null;
            if (wasH) snapFromDrag();
          }
          root.addEventListener('touchend', finishTouch, { passive: true });
          root.addEventListener('touchcancel', finishTouch, { passive: true });

          // Horizontal trackpad two-finger swipe support
          root.addEventListener('wheel', function (e) {
            if (items.length <= 1) return;
            if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.15 || Math.abs(e.deltaX) < 3) return;
            e.preventDefault();
            cancelAnim();
            pos = pos + e.deltaX / (getSwipeStep() * 1.15);
            renderFrame();
            if (wheelTimer) clearTimeout(wheelTimer);
            wheelTimer = setTimeout(function () {
              wheelTimer = null;
              animateToPos(Math.round(pos), 360);
            }, 120);
          }, { passive: false });

          root.addEventListener('click', function (e) {
            var target = e.target;
            if (!target || !target.closest) return;
            var varBtn = target.closest('[data-css-var]');
            if (varBtn) {
              e.stopPropagation();
              var act = items[wrap(Math.round(pos))];
              if (act) {
                selectedVariants[act.id] = varBtn.getAttribute('data-css-var') || '';
                lastUiKey = '';
                renderFrame();
              }
              return;
            }
            var dotBtn = target.closest('[data-css-dot]');
            if (dotBtn) {
              e.stopPropagation();
              goToIndex(Number(dotBtn.getAttribute('data-css-dot') || 0));
              return;
            }
            var slotHit = target.closest('[data-css-slot]');
            if (slotHit) {
              var recentlyMoved = drag.moved && (performance.now() - drag.lastMovedAt) < 260;
              drag.moved = false;
              if (recentlyMoved) return;
              var sIdx = Number(slotHit.getAttribute('data-css-slot') || 0);
              var slotObj = pool[sIdx];
              if (slotObj) {
                if (slotObj.isCenter && enableDetail) {
                  detailOpen = !detailOpen;
                  lastUiKey = '';
                  renderFrame();
                } else if (!slotObj.isCenter) {
                  animateToPos(slotObj.slotIdx, 460);
                }
              }
            }
          });

          if (prevBtn) {
            prevBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              animateToPos(Math.round(pos) - 1, 460);
            });
          }
          if (nextBtn) {
            nextBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              animateToPos(Math.round(pos) + 1, 460);
            });
          }
          if (backBtn) {
            backBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              if (detailOpen) {
                detailOpen = false;
                lastUiKey = '';
                renderFrame();
              } else if (items.length > 1) {
                animateToPos(Math.round(pos) - 1, 460);
              }
            });
          }
          if (openCartHeaderBtn) {
            openCartHeaderBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              var floatBtn = document.getElementById('lynk-fnb-float-btn') || document.getElementById('lynk-open-cart-btn');
              if (floatBtn) floatBtn.click();
            });
          }
          window.addEventListener('resize', renderFrame);
          document.addEventListener('click', function () {
            setTimeout(syncHeaderCartBadge, 40);
          });
          if (autoplay && items.length > 1) {
            setInterval(function () {
              if (!drag.active) animateToPos(Math.round(pos) + 1, 520);
            }, 4000);
          }

          renderFrame();
          syncHeaderCartBadge();
        });
      })();

      // --- STUDIO PRODUK MELAYANG (FULL-BLEED COLOR MORPH + CORNER SWITCHER 60FPS) ---
      (function initFloatingProductStudios() {
        var studios = Array.prototype.slice.call(document.querySelectorAll('[data-floating-product-studio]'));
        if (!studios.length) return;

        function fpsParseRgb(color, fallback) {
          if (!color) return fallback;
          var t = String(color).trim();
          if (t.charAt(0) === '#') {
            var h = t.slice(1);
            if (h.length === 3) return [parseInt(h[0] + h[0], 16), parseInt(h[1] + h[1], 16), parseInt(h[2] + h[2], 16)];
            if (h.length >= 6) return [parseInt(h.slice(0, 2), 16), parseInt(h.slice(2, 4), 16), parseInt(h.slice(4, 6), 16)];
          }
          var m = t.match(/rgba?\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)/i);
          if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
          return fallback;
        }
        function fpsLerpColor(cA, cB, t, fallback) {
          var cl = Math.max(0, Math.min(1, t));
          var a = fpsParseRgb(cA, fallback);
          var b = fpsParseRgb(cB, fallback);
          return 'rgb(' + Math.round(a[0] + (b[0] - a[0]) * cl) + ',' + Math.round(a[1] + (b[1] - a[1]) * cl) + ',' + Math.round(a[2] + (b[2] - a[2]) * cl) + ')';
        }
        function fpsSmoothstep(x) {
          var c = Math.max(0, Math.min(1, x));
          return c * c * (3 - 2 * c);
        }
        function fpsEaseOutCubic(t) {
          return 1 - Math.pow(1 - t, 3);
        }

        studios.forEach(function (root) {
          var blockId = root.getAttribute('data-floating-product-studio') || '';
          var items = [];
          try {
            items = JSON.parse(root.getAttribute('data-fps-items') || '[]');
          } catch (_) {
            items = [];
          }
          if (!items.length) return;

          var productSize = Number(root.getAttribute('data-fps-size') || 224);
          var imageZoom = Number(root.getAttribute('data-fps-zoom') || 100) / 100;
          var textColor = root.getAttribute('data-fps-text') || '#FFFFFF';
          var levitate = root.getAttribute('data-fps-levitate') !== '0';
          var groundShadow = root.getAttribute('data-fps-shadow') !== '0';
          var showInfo = root.getAttribute('data-fps-show-info') !== '0';
          var showSwatches = root.getAttribute('data-fps-show-swatches') !== '0';
          var showDesc = root.getAttribute('data-fps-show-desc') === '1';
          var showCartBtn = root.getAttribute('data-fps-show-cart') !== '0';
          var autoplay = root.getAttribute('data-fps-autoplay') === '1';
          var dotsMode = root.getAttribute('data-fps-dots') || 'none';

          var stage = root.querySelector('[data-fps-stage]');
          var cornerBtn = root.querySelector('[data-fps-corner]');
          var cornerImg = root.querySelector('[data-fps-corner-img]');
          var swatchesEl = root.querySelector('[data-fps-swatches]');
          var badgeEl = root.querySelector('[data-fps-badge]');
          var labelA = root.querySelector('[data-fps-label-a]');
          var labelB = root.querySelector('[data-fps-label-b]');
          var titleA = root.querySelector('[data-fps-title-a]');
          var priceA = root.querySelector('[data-fps-price-a]');
          var titleB = root.querySelector('[data-fps-title-b]');
          var priceB = root.querySelector('[data-fps-price-b]');
          var descEl = root.querySelector('[data-fps-desc]');
          var variantsEl = root.querySelector('[data-fps-variants]');
          var cartActionsEl = root.querySelector('[data-fps-cart-actions]');
          var dotsOverlay = root.querySelector('[data-fps-dots-overlay]');
          var dotsBelow = root.querySelector('[data-fps-dots-below]');
          var openCartHeaderBtn = root.querySelector('[data-fps-open-cart]');
          var cartBadgeEl = root.querySelector('[data-fps-cart-badge]');

          var pos = 0;
          var rafId = null;
          var selectedVariants = {};
          var lastUiKey = '';
          var lastCornerSrc = '';
          var wheelTimer = null;
          var drag = {
            active: false,
            source: null,
            pointerId: null,
            startX: 0,
            startY: 0,
            startPos: 0,
            lastX: 0,
            lastTime: 0,
            vx: 0,
            dx: 0,
            intent: null,
            moved: false,
          };

          function wrap(i) {
            return ((i % items.length) + items.length) % items.length;
          }
          function parseVariants(raw) {
            return String(raw || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
          }
          function getActiveVariant(it) {
            var list = parseVariants(it.variants);
            if (!list.length) return '';
            return selectedVariants[it.id] || list[0];
          }
          function getStageSpan() {
            var w = root.clientWidth || 340;
            return Math.max(170, Math.min(280, w * 0.72));
          }

          var pool = [];
          if (stage) {
            stage.innerHTML = '';
            var slotCount = items.length === 1 ? 1 : 3;
            for (var p = 0; p < slotCount; p++) {
              var slotEl = document.createElement('div');
              slotEl.style.cssText =
                'position:absolute; left:50%; top:46%; width:' + productSize + 'px; height:' + (productSize + 24) +
                'px; display:flex; flex-direction:column; align-items:center; justify-content:center; will-change:transform, opacity; pointer-events:none;';
              var imgEl = document.createElement('img');
              imgEl.draggable = false;
              imgEl.referrerPolicy = 'no-referrer';
              imgEl.style.cssText =
                'width:' + productSize + 'px; height:' + productSize + 'px; object-fit:contain; filter:drop-shadow(0 18px 22px rgba(0,0,0,0.22)); pointer-events:none; user-select:none;' +
                (levitate ? ' animation:fpsLevitate 3.4s ease-in-out infinite;' : '');
              slotEl.appendChild(imgEl);
              var shadowEl = null;
              if (groundShadow) {
                shadowEl = document.createElement('span');
                shadowEl.setAttribute('aria-hidden', 'true');
                shadowEl.style.cssText =
                  'width:' + Math.round(productSize * 0.58) + 'px; height:' + Math.max(10, Math.round(productSize * 0.08)) +
                  'px; border-radius:9999px; margin-top:12px; background:radial-gradient(ellipse at center, rgba(0,0,0,0.48) 0%, rgba(0,0,0,0.18) 54%, rgba(0,0,0,0) 76%); filter:blur(3px);' +
                  (levitate ? ' animation:fpsShadowPulse 3.4s ease-in-out infinite;' : '');
                slotEl.appendChild(shadowEl);
              }
              stage.appendChild(slotEl);
              pool.push({ el: slotEl, img: imgEl, shadow: shadowEl, src: '' });
            }
          }

          function syncHeaderCartBadge() {
            if (!cartBadgeEl) return;
            var totalQty = 0;
            document.querySelectorAll('[data-fnb-qty]').forEach(function (qEl) {
              var n = parseInt(qEl.textContent || '0', 10);
              if (!isNaN(n) && n > 0) totalQty += n;
            });
            cartBadgeEl.textContent = String(totalQty);
            cartBadgeEl.style.display = totalQty > 0 ? 'flex' : 'none';
          }

          function syncActiveUi(idx) {
            var active = items[idx] || items[0];
            var activeVar = getActiveVariant(active);
            var uiKey = idx + '|' + activeVar;
            if (uiKey === lastUiKey) return;
            lastUiKey = uiKey;

            if (cornerImg && items.length > 1) {
              var nxt = items[wrap(idx + 1)];
              if (nxt && lastCornerSrc !== (nxt.image || '')) {
                cornerImg.src = nxt.image || '';
                lastCornerSrc = nxt.image || '';
              }
            }
            if (badgeEl) {
              badgeEl.textContent = active.badge || '';
              badgeEl.style.display = showInfo && active.badge ? 'inline-block' : 'none';
            }
            if (swatchesEl && showSwatches) {
              swatchesEl.innerHTML = items.map(function (it, i) {
                var on = i === idx;
                return '<button type="button" data-fps-swatch="' + i + '" aria-label="' + (it.title || 'Varian').replace(/"/g, '&quot;') + '" style="width:' + (on ? 22 : 16) + 'px; height:' + (on ? 22 : 16) + 'px; border-radius:9999px; border:2px solid ' + (on ? '#FFFFFF' : 'rgba(255,255,255,0.45)') + '; background:radial-gradient(circle, ' + (it.gradientFrom || '#A3A8B2') + ', ' + (it.gradientTo || '#828894') + '); box-shadow:' + (on ? '0 0 0 2px rgba(0,0,0,0.22)' : 'none') + '; cursor:pointer; padding:0; transition:all 220ms ease;"></button>';
              }).join('');
            }
            if (showDesc && descEl) {
              var descTxt = active.description || active.subtitle || '';
              descEl.textContent = descTxt;
              descEl.style.display = descTxt ? 'block' : 'none';
            }
            if (showDesc && variantsEl) {
              var vList = parseVariants(active.variants);
              if (vList.length) {
                variantsEl.style.display = 'flex';
                variantsEl.innerHTML = vList.map(function (v) {
                  var on = v === activeVar;
                  return '<button type="button" data-fps-var="' + v.replace(/"/g, '&quot;') + '" style="padding:4px 10px; border-radius:9999px; border:1px solid ' + (on ? '#FFFFFF' : 'rgba(255,255,255,0.38)') + '; background:' + (on ? '#FFFFFF' : 'rgba(255,255,255,0.12)') + '; color:' + (on ? '#0F172A' : textColor) + '; font-size:11px; font-weight:700; cursor:pointer; font-family:inherit;">' + v + '</button>';
                }).join('');
              } else {
                variantsEl.style.display = 'none';
                variantsEl.innerHTML = '';
              }
            }
            if (cartActionsEl && showCartBtn) {
              var fnbKey = blockId + '::' + active.id;
              cartActionsEl.innerHTML =
                '<button type="button" data-fnb-add="' + fnbKey + '" data-add-display="inline-flex" style="display:inline-flex; align-items:center; justify-content:center; gap:6px; padding:9px 20px; border-radius:9999px; border:0; background:#FFFFFF; color:#0F172A; font-size:12.5px; font-weight:800; cursor:pointer; font-family:inherit; box-shadow:0 10px 22px rgba(0,0,0,0.22);">+ Tambah ke Keranjang</button>' +
                '<div data-fnb-stepper="' + fnbKey + '" style="display:none; align-items:center; gap:10px; padding:4px 8px; border-radius:9999px; background:#FFFFFF; box-shadow:0 8px 20px rgba(0,0,0,0.22);">' +
                '  <button type="button" data-fnb-dec="' + fnbKey + '" style="width:26px; height:26px; border-radius:9999px; border:0; background:#F1F5F9; color:#0F172A; font-size:15px; font-weight:700; cursor:pointer;">-</button>' +
                '  <span data-fnb-qty="' + fnbKey + '" style="min-width:20px; text-align:center; font-size:13px; font-weight:800; color:#0F172A;">0</span>' +
                '  <button type="button" data-fnb-inc="' + fnbKey + '" style="width:26px; height:26px; border-radius:9999px; border:0; background:#0F172A; color:#FFFFFF; font-size:15px; font-weight:700; cursor:pointer;">+</button>' +
                '</div>';
            }
            if (dotsOverlay && dotsMode === 'overlay') {
              dotsOverlay.innerHTML = items.map(function (_, i) {
                var on = i === idx;
                return '<button type="button" data-fps-dot="' + i + '" aria-label="Slide ' + (i + 1) + '" style="width:' + (on ? 18 : 6) + 'px; height:6px; padding:0; border:0; border-radius:9999px; background:' + (on ? '#FFFFFF' : 'rgba(255,255,255,0.48)') + '; cursor:pointer; transition:all 220ms ease;"></button>';
              }).join('');
            }
            if (dotsBelow && dotsMode === 'below') {
              dotsBelow.innerHTML = items.map(function (_, i) {
                var on = i === idx;
                return '<button type="button" data-fps-dot="' + i + '" aria-label="Slide ' + (i + 1) + '" style="width:' + (on ? 18 : 6) + 'px; height:6px; padding:0; border:0; border-radius:9999px; background:' + (on ? '#FFFFFF' : 'rgba(255,255,255,0.42)') + '; cursor:pointer; transition:all 220ms ease;"></button>';
              }).join('');
            }
          }

          function renderFrame() {
            var baseFloor = Math.floor(pos);
            var frac = pos - baseFloor;
            var easedFrac = fpsSmoothstep(frac);
            var fromIdx = wrap(baseFloor);
            var toIdx = wrap(baseFloor + 1);
            var nearestInt = Math.round(pos);
            var activeIdx = wrap(nearestInt);
            var fromItem = items[fromIdx] || items[0];
            var toItem = items[toIdx] || fromItem;

            var morphedFrom = fpsLerpColor(fromItem.gradientFrom, toItem.gradientFrom, easedFrac, [163, 168, 178]);
            var morphedTo = fpsLerpColor(fromItem.gradientTo, toItem.gradientTo, easedFrac, [130, 136, 148]);
            root.style.background = 'radial-gradient(circle at 50% 42%, ' + morphedFrom + ' 0%, ' + morphedTo + ' 78%)';

            if (labelA && labelB) {
              var showDual = frac > 0.002 && frac < 0.998 && fromIdx !== toIdx;
              if (showDual) {
                if (titleA) titleA.textContent = fromItem.title;
                if (priceA) priceA.textContent = fromItem.price;
                labelA.style.opacity = Math.max(0, 1 - easedFrac * 1.35).toFixed(3);
                labelA.style.transform = 'translate3d(' + (-easedFrac * 24).toFixed(2) + 'px,0,0)';

                if (titleB) titleB.textContent = toItem.title;
                if (priceB) priceB.textContent = toItem.price;
                labelB.style.opacity = Math.max(0, Math.min(1, (easedFrac - 0.15) * 1.25)).toFixed(3);
                labelB.style.transform = 'translate3d(' + ((1 - easedFrac) * 24).toFixed(2) + 'px,0,0)';
              } else {
                var act = items[activeIdx] || items[0];
                if (titleA) titleA.textContent = act.title;
                if (priceA) priceA.textContent = act.price;
                labelA.style.opacity = '1';
                labelA.style.transform = 'translate3d(0,0,0)';
                labelB.style.opacity = '0';
              }
            }

            var span = getStageSpan();
            for (var s = 0; s < pool.length; s++) {
              var slotObj = pool[s];
              var relIdx = pool.length === 1 ? 0 : s - 1;
              var slotIdx = nearestInt + relIdx;
              var itemIdx = wrap(slotIdx);
              var item = items[itemIdx];
              var dist = slotIdx - pos;
              var absDist = Math.abs(dist);
              var tx = dist * span;
              var ty = dist > 0 ? Math.min(1, dist) * 58 : -Math.min(1, -dist) * 20;
              var scale = Math.max(0.32, (1 - absDist * 0.56)) * imageZoom;
              var opacity = Math.max(0, 1 - absDist * 1.12);

              if (slotObj.src !== (item.image || '')) {
                slotObj.img.src = item.image || '';
                slotObj.img.alt = item.title || '';
                slotObj.src = item.image || '';
              }
              slotObj.el.style.transform =
                'translate3d(-50%,-50%,0) translate3d(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px,0) scale(' + scale.toFixed(4) + ')';
              slotObj.el.style.opacity = opacity.toFixed(3);
              slotObj.el.style.zIndex = String(Math.round(25 - absDist * 10));
            }

            if (cornerBtn) {
              var dragPull = Math.abs(pos - nearestInt);
              cornerBtn.style.opacity = Math.max(0.35, 1 - dragPull * 1.2).toFixed(3);
              cornerBtn.style.transform = 'scale(' + (1 - dragPull * 0.14).toFixed(3) + ')';
            }

            syncActiveUi(activeIdx);
          }

          function cancelAnim() {
            if (rafId !== null) {
              cancelAnimationFrame(rafId);
              rafId = null;
            }
          }
          function animateToPos(targetPos, durationMs) {
            cancelAnim();
            var fromPos = pos;
            var delta = targetPos - fromPos;
            if (Math.abs(delta) < 0.0005) {
              pos = targetPos;
              renderFrame();
              return;
            }
            var start = performance.now();
            var dur = durationMs || 500;
            function step(now) {
              var prog = Math.min(1, (now - start) / dur);
              pos = fromPos + delta * fpsEaseOutCubic(prog);
              renderFrame();
              if (prog < 1) rafId = requestAnimationFrame(step);
              else {
                pos = targetPos;
                rafId = null;
                renderFrame();
              }
            }
            rafId = requestAnimationFrame(step);
          }
          function goToIndex(targetIdx) {
            if (items.length <= 1) return;
            var cur = Math.round(pos);
            var curMod = wrap(cur);
            var diff = targetIdx - curMod;
            if (diff > items.length / 2) diff -= items.length;
            if (diff < -items.length / 2) diff += items.length;
            animateToPos(cur + diff, 480);
          }

          root.addEventListener('dragstart', function (e) {
            e.preventDefault();
          });

          function snapFromDrag() {
            var base = Math.round(drag.startPos);
            var target = Math.round(pos);
            if (target === base) {
              var thr = Math.max(28, getStageSpan() * 0.2);
              if (drag.dx <= -thr || drag.vx < -0.28) target = base + 1;
              else if (drag.dx >= thr || drag.vx > 0.28) target = base - 1;
            }
            var spd = Math.min(1.5, Math.abs(drag.vx));
            animateToPos(target, Math.round(490 - spd * 120));
          }

          root.addEventListener('pointerdown', function (e) {
            if (items.length <= 1 || e.pointerType === 'touch') return;
            if (e.button !== 0 && e.pointerType === 'mouse') return;
            if (e.target && e.target.closest && e.target.closest('button, input, a')) return;
            e.preventDefault();
            cancelAnim();
            drag.active = true;
            drag.source = 'pointer';
            drag.pointerId = e.pointerId;
            drag.startX = e.clientX;
            drag.startY = e.clientY;
            drag.startPos = pos;
            drag.lastX = e.clientX;
            drag.lastTime = performance.now();
            drag.vx = 0;
            drag.dx = 0;
            drag.intent = null;
            drag.moved = false;

            function onWinMove(ev) {
              if (!drag.active || drag.source !== 'pointer' || ev.pointerId !== drag.pointerId) return;
              var dx = ev.clientX - drag.startX;
              var dy = ev.clientY - drag.startY;
              if (drag.intent === null) {
                if (Math.abs(dx) < 4 && Math.abs(dy) < 4) return;
                if (Math.abs(dy) > Math.abs(dx) * 1.35) {
                  drag.intent = 'v';
                  drag.active = false;
                  drag.source = null;
                  root.style.cursor = 'grab';
                  cleanupWin();
                  return;
                }
                drag.intent = 'h';
                drag.moved = true;
                root.style.cursor = 'grabbing';
              }
              if (drag.intent !== 'h') return;
              var now = performance.now();
              var dt = Math.max(8, now - drag.lastTime);
              drag.vx = (ev.clientX - drag.lastX) / dt;
              drag.lastX = ev.clientX;
              drag.lastTime = now;
              drag.dx = dx;
              pos = drag.startPos - dx / getStageSpan();
              renderFrame();
            }
            function onWinUp() {
              cleanupWin();
              if (!drag.active || drag.source !== 'pointer') return;
              var wasH = drag.intent === 'h';
              drag.active = false;
              drag.source = null;
              drag.intent = null;
              root.style.cursor = 'grab';
              if (wasH) snapFromDrag();
            }
            function cleanupWin() {
              window.removeEventListener('pointermove', onWinMove);
              window.removeEventListener('pointerup', onWinUp);
              window.removeEventListener('pointercancel', onWinUp);
            }
            window.addEventListener('pointermove', onWinMove);
            window.addEventListener('pointerup', onWinUp);
            window.addEventListener('pointercancel', onWinUp);
          });

          root.addEventListener('touchstart', function (e) {
            if (items.length <= 1 || e.touches.length !== 1) return;
            if (e.target && e.target.closest && e.target.closest('button, input, a')) return;
            var t = e.touches[0];
            cancelAnim();
            drag.active = true;
            drag.source = 'touch';
            drag.startX = t.clientX;
            drag.startY = t.clientY;
            drag.startPos = pos;
            drag.lastX = t.clientX;
            drag.lastTime = performance.now();
            drag.vx = 0;
            drag.dx = 0;
            drag.intent = null;
            drag.moved = false;
          }, { passive: true });
          root.addEventListener('touchmove', function (e) {
            if (!drag.active || drag.source !== 'touch' || e.touches.length !== 1) return;
            var t = e.touches[0];
            var dx = t.clientX - drag.startX;
            var dy = t.clientY - drag.startY;
            if (drag.intent === null) {
              if (Math.abs(dx) < 5 && Math.abs(dy) < 5) return;
              if (Math.abs(dy) > Math.abs(dx) * 1.25) {
                drag.intent = 'v';
                drag.active = false;
                drag.source = null;
                return;
              }
              drag.intent = 'h';
              drag.moved = true;
            }
            if (drag.intent === 'h') {
              e.preventDefault();
              var now = performance.now();
              var dt = Math.max(8, now - drag.lastTime);
              drag.vx = (t.clientX - drag.lastX) / dt;
              drag.lastX = t.clientX;
              drag.lastTime = now;
              drag.dx = dx;
              pos = drag.startPos - dx / getStageSpan();
              renderFrame();
            }
          }, { passive: false });
          function finishTouch() {
            if (!drag.active || drag.source !== 'touch') return;
            var wasH = drag.intent === 'h';
            drag.active = false;
            drag.source = null;
            drag.intent = null;
            if (wasH) snapFromDrag();
          }
          root.addEventListener('touchend', finishTouch, { passive: true });
          root.addEventListener('touchcancel', finishTouch, { passive: true });

          root.addEventListener('wheel', function (e) {
            if (items.length <= 1) return;
            if (Math.abs(e.deltaX) <= Math.abs(e.deltaY) * 1.15 || Math.abs(e.deltaX) < 3) return;
            e.preventDefault();
            cancelAnim();
            pos = pos + e.deltaX / (getStageSpan() * 1.15);
            renderFrame();
            if (wheelTimer) clearTimeout(wheelTimer);
            wheelTimer = setTimeout(function () {
              wheelTimer = null;
              animateToPos(Math.round(pos), 360);
            }, 120);
          }, { passive: false });

          if (cornerBtn) {
            cornerBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              animateToPos(Math.round(pos) + 1, 500);
            });
          }
          if (openCartHeaderBtn) {
            openCartHeaderBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              var floatBtn = document.getElementById('lynk-fnb-float-btn') || document.getElementById('lynk-open-cart-btn');
              if (floatBtn) floatBtn.click();
            });
          }
          root.addEventListener('click', function (e) {
            var target = e.target;
            if (!target || !target.closest) return;
            var swBtn = target.closest('[data-fps-swatch]');
            if (swBtn) {
              e.stopPropagation();
              goToIndex(Number(swBtn.getAttribute('data-fps-swatch') || 0));
              return;
            }
            var varBtn = target.closest('[data-fps-var]');
            if (varBtn) {
              e.stopPropagation();
              var act = items[wrap(Math.round(pos))];
              if (act) {
                selectedVariants[act.id] = varBtn.getAttribute('data-fps-var') || '';
                lastUiKey = '';
                renderFrame();
              }
              return;
            }
            var dotBtn = target.closest('[data-fps-dot]');
            if (dotBtn) {
              e.stopPropagation();
              goToIndex(Number(dotBtn.getAttribute('data-fps-dot') || 0));
            }
          });

          window.addEventListener('resize', renderFrame);
          document.addEventListener('click', function () {
            setTimeout(syncHeaderCartBadge, 40);
          });
          if (autoplay && items.length > 1) {
            setInterval(function () {
              if (!drag.active) animateToPos(Math.round(pos) + 1, 520);
            }, 4000);
          }

          renderFrame();
          syncHeaderCartBadge();
        });
      })();

      // --- INTERACTIVE BOX SHOWCASE (3D SHOEBOX LID-OPEN SWIPE SHOWCASE) ---
      (function initInteractiveBoxShowcases() {
        var showcases = Array.prototype.slice.call(document.querySelectorAll('[data-interactive-box-showcase]'));
        if (!showcases.length) return;

        function ibsClamp(v, mn, mx) { return Math.max(mn, Math.min(mx, v)); }
        function ibsSmooth(x) { var c = ibsClamp(x, 0, 1); return c * c * (3 - 2 * c); }
        function ibsEaseInOut(t) { var c = ibsClamp(t, 0, 1); return c < 0.5 ? 4 * c * c * c : 1 - Math.pow(-2 * c + 2, 3) / 2; }
        function ibsEaseOut(t) { var c = ibsClamp(t, 0, 1); return 1 - Math.pow(1 - c, 3); }
        function ibsParseRgb(hex) {
          if (!hex) return [244, 106, 31];
          var t = String(hex).trim();
          if (t.charAt(0) === '#') {
            var h = t.slice(1);
            if (h.length === 3) return [parseInt(h[0]+h[0],16)||244, parseInt(h[1]+h[1],16)||106, parseInt(h[2]+h[2],16)||31];
            if (h.length >= 6) return [parseInt(h.slice(0,2),16)||244, parseInt(h.slice(2,4),16)||106, parseInt(h.slice(4,6),16)||31];
          }
          var m = t.match(/rgba?\\(\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)/i);
          if (m) return [Number(m[1]), Number(m[2]), Number(m[3])];
          return [244, 106, 31];
        }
        function ibsShift(rgb, d) {
          return 'rgb(' + ibsClamp(rgb[0]+d,0,255) + ',' + ibsClamp(rgb[1]+d,0,255) + ',' + ibsClamp(rgb[2]+d,0,255) + ')';
        }
        function ibsPalette(hex) {
          var rgb = ibsParseRgb(hex);
          return {
            base: 'rgb(' + rgb[0] + ',' + rgb[1] + ',' + rgb[2] + ')',
            light: ibsShift(rgb, 24),
            midDark: ibsShift(rgb, -18),
            deep: ibsShift(rgb, -38)
          };
        }
        function ibsEsc(s) {
          return String(s || '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
        }

        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        showcases.forEach(function (root) {
          var blockId = root.getAttribute('data-interactive-box-showcase') || '';
          var items = [];
          try { items = JSON.parse(root.getAttribute('data-ibs-items') || '[]'); } catch (_) { items = []; }
          if (!items.length) return;

          var slideMode = root.getAttribute('data-ibs-mode') === 'auto' ? 'auto' : 'manual';
          var intervalMs = Math.max(1400, Math.min(8000, Number(root.getAttribute('data-ibs-interval') || 2500)));
          var baseColor = root.getAttribute('data-ibs-color') || '#F46A1F';
          var customBoxWAttr = root.getAttribute('data-ibs-box-w');
          var customBoxHAttr = root.getAttribute('data-ibs-box-h');
          var customBoxW = customBoxWAttr ? Number(customBoxWAttr) : NaN;
          var customBoxH = customBoxHAttr ? Number(customBoxHAttr) : NaN;
          var imgScaleFactor = ibsClamp(Number(root.getAttribute('data-ibs-img-scale') || 100), 40, 180) / 100;
          var stage = root.querySelector('[data-ibs-stage]');
          var infoEl = root.querySelector('[data-ibs-info]');
          var catEl = root.querySelector('[data-ibs-cat]');
          var titleEl = root.querySelector('[data-ibs-title]');
          var priceEl = root.querySelector('[data-ibs-price]');
          var ratingWrap = root.querySelector('[data-ibs-rating]');
          var ratingVal = root.querySelector('[data-ibs-rating-val]');
          var bagBtn = root.querySelector('[data-ibs-bag]');
          var favBtn = root.querySelector('[data-ibs-fav]');
          var favIcon = root.querySelector('[data-ibs-fav-icon]');
          var prevBtn = root.querySelector('[data-ibs-prev]');
          var nextBtn = root.querySelector('[data-ibs-next]');
          if (!stage) return;

          var total = items.length;
          var pos = 0;
          var rafId = null;
          var hovered = false;
          var liked = {};
          var slotNodes = {};
          var drag = { active: false, startX: 0, startY: 0, startPos: 0, lastX: 0, lastT: 0, vx: 0, intent: null, moved: false };

          function wrap(i) { return ((i % total) + total) % total; }
          function cancelAnim() { if (rafId !== null) { cancelAnimationFrame(rafId); rafId = null; } }

          function getMetrics() {
            var sw = root.getBoundingClientRect().width || 332;
            var defaultW = Math.round(ibsClamp(sw * 0.51, 134, 188));
            var maxSafeW = Math.max(120, Math.round(sw - 40));
            var boxW = Number.isFinite(customBoxW) ? Math.round(ibsClamp(customBoxW, 100, Math.min(260, maxSafeW))) : defaultW;
            var boxH = Number.isFinite(customBoxH) ? Math.round(ibsClamp(customBoxH, 70, 240)) : Math.round(boxW * 0.64);
            var peekPx = Math.round(ibsClamp(sw * 0.058, 15, 22));
            var spacing = Math.max(Math.round(sw * 0.5 + boxW * 0.5 - peekPx), boxW + 28);
            var stageH = Math.round(boxH * 2.15 + 26);
            return { sw: sw, boxW: boxW, boxH: boxH, spacing: spacing, stageH: stageH, boxTopY: Math.round(boxH + 14) };
          }

          function buildSlotNode(slotIdx) {
            var item = items[wrap(slotIdx)];
            var pal = ibsPalette(item.boxColorOverride || baseColor);
            var el = document.createElement('div');
            el.setAttribute('data-ibs-slot', String(slotIdx));
            el.style.cssText = 'position:absolute; left:50%; transform-style:preserve-3d; will-change:transform;';
            el.innerHTML =
              '<div data-ibs-sh style="position:absolute; left:6%; right:6%; bottom:-11px; height:18px; border-radius:50%; background:radial-gradient(ellipse at center, rgba(25,20,16,0.24) 0%, rgba(25,20,16,0.08) 54%, rgba(25,20,16,0) 78%); pointer-events:none;"></div>' +
              '<div style="position:relative; width:100%; height:100%; border-radius:4px; background:linear-gradient(180deg,' + pal.base + ' 0%,' + pal.midDark + ' 86%,' + pal.deep + ' 100%); box-shadow:0 10px 22px -6px rgba(18,16,14,0.22), 0 2px 6px rgba(18,16,14,0.12); padding:5px 7px 9px 7px; box-sizing:border-box;">' +
                '<div style="position:absolute; inset:0; border-radius:4px; border-top:1px solid ' + pal.light + '; border-bottom:2px solid ' + pal.deep + '; pointer-events:none;"></div>' +
                '<div style="position:relative; width:100%; height:100%; border-radius:2px; background:linear-gradient(180deg, #D3B28C 0%, #E5CAAA 44%, #DFC19C 100%); box-shadow:inset 0 11px 16px rgba(72,42,16,0.26), inset 7px 0 10px rgba(72,42,16,0.16), inset -7px 0 10px rgba(72,42,16,0.16), inset 0 -5px 8px rgba(72,42,16,0.14); overflow:hidden; display:flex; align-items:center; justify-content:center;">' +
                  '<div style="position:absolute; top:0; left:0; right:0; height:14%; background:linear-gradient(180deg, rgba(95,58,24,0.22) 0%, rgba(95,58,24,0.03) 100%); pointer-events:none;"></div>' +
                  '<div data-ibs-prod style="position:relative; width:92%; height:92%; display:flex; align-items:center; justify-content:center; will-change:transform, opacity;">' +
                    (item.image ? '<img src="' + ibsEsc(item.image) + '" alt="' + ibsEsc(item.title) + '" draggable="false" referrerpolicy="no-referrer" style="width:100%; height:100%; object-fit:contain; filter:drop-shadow(0 6px 8px rgba(32,19,8,0.28)); pointer-events:none;" />' : '<span style="font-size:10px; font-weight:700; color:#7C5B3A;">' + ibsEsc(item.title) + '</span>') +
                  '</div>' +
                '</div>' +
              '</div>' +
              '<div data-ibs-lid style="position:absolute; top:-1px; left:-2px; right:-2px; height:calc(100% + 2px); transform-origin:50% 0%; transform-style:preserve-3d; pointer-events:none; will-change:transform;">' +
                '<div style="position:absolute; inset:0; border-radius:4px; background:linear-gradient(160deg,' + pal.light + ' 0%,' + pal.base + ' 38%,' + pal.midDark + ' 100%); box-shadow:inset 0 1px 0 rgba(255,255,255,0.28), inset 0 -5px 0 rgba(0,0,0,0.14), 0 6px 14px rgba(0,0,0,0.16); backface-visibility:hidden; -webkit-backface-visibility:hidden; display:flex; align-items:center; justify-content:center; overflow:hidden;">' +
                  '<div style="position:absolute; left:0; right:0; bottom:8px; height:1px; background:rgba(255,255,255,0.22);"></div>' +
                '</div>' +
                '<div style="position:absolute; inset:0; border-radius:4px 4px 2px 2px; transform:rotateX(180deg); backface-visibility:hidden; -webkit-backface-visibility:hidden; background:linear-gradient(180deg, #EAD4B8 0%, #E1C6A4 58%, #D4B38C 100%); box-shadow:inset 0 -10px 14px rgba(78,48,18,0.16), inset 5px 0 8px rgba(78,48,18,0.08), inset -5px 0 8px rgba(78,48,18,0.08); overflow:hidden;">' +
                  '<div style="position:absolute; top:0; left:0; right:0; height:12px; background:linear-gradient(180deg,' + pal.light + ' 0%,' + pal.base + ' 55%,' + pal.midDark + ' 100%); box-shadow:0 2px 4px rgba(65,36,12,0.2);"></div>' +
                  '<div style="position:absolute; top:12px; left:7px; bottom:4px; width:1px; background:rgba(110,72,34,0.16);"></div>' +
                  '<div style="position:absolute; top:12px; right:7px; bottom:4px; width:1px; background:rgba(110,72,34,0.16);"></div>' +
                  '<div style="position:absolute; left:0; right:0; bottom:0; height:8px; background:linear-gradient(0deg, rgba(72,42,16,0.22) 0%, rgba(72,42,16,0) 100%);"></div>' +
                '</div>' +
              '</div>';
            el.addEventListener('click', function (e) {
              if (drag.moved || total <= 1) return;
              var curD = slotIdx - pos;
              if (Math.abs(curD) > 0.45) {
                e.stopPropagation();
                animateTo(slotIdx, 720, true);
              }
            });
            return el;
          }

          var lastActiveIdx = -1;
          function syncFavUi(itemId) {
            if (!favIcon || !favBtn) return;
            var on = Boolean(liked[itemId]);
            favIcon.setAttribute('fill', on ? '#EF4444' : 'none');
            favBtn.style.color = on ? '#EF4444' : '#8B919C';
          }

          function renderFrame() {
            var m = getMetrics();
            stage.style.height = m.stageH + 'px';
            var center = Math.round(pos);
            var wanted = total === 1 ? [0] : [center - 2, center - 1, center, center + 1, center + 2];
            var keep = {};
            wanted.forEach(function (s) { keep[s] = true; });
            Object.keys(slotNodes).forEach(function (k) {
              if (!keep[k]) {
                if (slotNodes[k].parentNode) slotNodes[k].parentNode.removeChild(slotNodes[k]);
                delete slotNodes[k];
              }
            });

            wanted.forEach(function (slotIdx) {
              var d = slotIdx - pos;
              var absD = Math.abs(d);
              var node = slotNodes[slotIdx];
              if (absD > 1.75) {
                if (node && node.parentNode) { node.parentNode.removeChild(node); delete slotNodes[slotIdx]; }
                return;
              }
              if (!node) {
                node = buildSlotNode(slotIdx);
                slotNodes[slotIdx] = node;
                stage.appendChild(node);
              }
              var openP = 1 - ibsSmooth((absD - 0.14) / 0.44);
              var lidAngle = openP * 162;
              var reveal = ibsSmooth((openP - 0.18) / 0.62);
              var prodScale = (0.88 + 0.12 * reveal) * imgScaleFactor;
              var prodY = (1 - reveal) * 6;
              var tx = d * m.spacing;

              node.style.width = m.boxW + 'px';
              node.style.height = m.boxH + 'px';
              node.style.top = m.boxTopY + 'px';
              node.style.marginLeft = (-Math.round(m.boxW / 2)) + 'px';
              node.style.transform = 'translate3d(' + tx.toFixed(2) + 'px, 0px, 0px)';
              node.style.zIndex = absD < 0.45 ? '10' : '5';
              node.style.cursor = absD > 0.45 && total > 1 ? 'pointer' : '';

              var lid = node.querySelector('[data-ibs-lid]');
              if (lid) lid.style.transform = 'rotateX(' + lidAngle.toFixed(2) + 'deg)';
              var prod = node.querySelector('[data-ibs-prod]');
              if (prod) {
                prod.style.opacity = String(reveal.toFixed(3));
                prod.style.transform = 'translate3d(0,' + prodY.toFixed(2) + 'px,0) scale(' + prodScale.toFixed(3) + ')';
              }
            });

            var nearest = Math.round(pos);
            var activeIdx = wrap(nearest);
            var activeItem = items[activeIdx];
            var frac = pos - nearest;
            var textOp = ibsClamp(1 - Math.abs(frac) * 3.1, 0, 1);
            var textX = -frac * 34;

            if (infoEl) {
              infoEl.style.opacity = String(textOp.toFixed(3));
              infoEl.style.transform = 'translate3d(' + textX.toFixed(2) + 'px,0,0)';
            }
            if (ratingWrap) ratingWrap.style.opacity = String(ibsClamp(0.35 + textOp * 0.65, 0.35, 1).toFixed(3));

            if (activeIdx !== lastActiveIdx && activeItem) {
              lastActiveIdx = activeIdx;
              if (catEl) catEl.textContent = activeItem.category || '';
              if (titleEl) titleEl.textContent = activeItem.title || '';
              if (priceEl) priceEl.textContent = activeItem.price || '';
              if (ratingWrap && ratingVal) {
                ratingVal.textContent = activeItem.rating || '';
                ratingWrap.style.display = activeItem.rating ? 'inline-flex' : 'none';
              }
              if (bagBtn) bagBtn.setAttribute('data-fnb-add', blockId + '::' + activeItem.id);
              if (typeof window.__lynkSyncAdminWa === 'function') {
                window.__lynkSyncAdminWa(root, activeItem.title, activeItem.price);
              }
              syncFavUi(activeItem.id);
            }
          }

          function animateTo(target, dur, useInOut) {
            cancelAnim();
            var from = pos;
            var delta = target - from;
            if (Math.abs(delta) < 0.0005 || reduceMotion) {
              pos = target;
              renderFrame();
              return;
            }
            var t0 = performance.now();
            function tick(now) {
              var p = Math.min(1, (now - t0) / dur);
              var e = useInOut ? ibsEaseInOut(p) : ibsEaseOut(p);
              pos = from + delta * e;
              renderFrame();
              if (p < 1) rafId = requestAnimationFrame(tick);
              else { rafId = null; pos = target; renderFrame(); }
            }
            rafId = requestAnimationFrame(tick);
          }

          if (prevBtn) prevBtn.addEventListener('click', function (e) { e.stopPropagation(); if (total > 1) animateTo(Math.round(pos) - 1, 680, true); });
          if (nextBtn) nextBtn.addEventListener('click', function (e) { e.stopPropagation(); if (total > 1) animateTo(Math.round(pos) + 1, 680, true); });
          if (favBtn) favBtn.addEventListener('click', function (e) {
            e.stopPropagation();
            var act = items[wrap(Math.round(pos))];
            if (act) { liked[act.id] = !liked[act.id]; syncFavUi(act.id); }
          });

          function startDrag(x, y) {
            if (total <= 1) return;
            cancelAnim();
            drag = { active: true, startX: x, startY: y, startPos: pos, lastX: x, lastT: performance.now(), vx: 0, intent: null, moved: false };
          }
          function moveDrag(x, y, ev) {
            if (!drag.active) return;
            var dx = x - drag.startX;
            var dy = y - drag.startY;
            if (!drag.intent) {
              if (Math.abs(dx) > 6 || Math.abs(dy) > 6) drag.intent = Math.abs(dx) >= Math.abs(dy) ? 'h' : 'v';
              else return;
            }
            if (drag.intent === 'v') { drag.active = false; return; }
            if (ev && ev.cancelable) ev.preventDefault();
            drag.moved = true;
            var now = performance.now();
            var dt = Math.max(1, now - drag.lastT);
            drag.vx = (x - drag.lastX) / dt;
            drag.lastX = x;
            drag.lastT = now;
            var m = getMetrics();
            pos = drag.startPos - dx / Math.max(180, m.spacing * 0.95);
            renderFrame();
          }
          function endDrag() {
            if (!drag.active) return;
            drag.active = false;
            if (!drag.moved) return;
            var delta = pos - drag.startPos;
            var target = Math.round(pos);
            if (Math.abs(drag.vx) > 0.35) target = drag.vx < 0 ? Math.ceil(drag.startPos + 0.05) : Math.floor(drag.startPos - 0.05);
            else if (Math.abs(delta) > 0.16) target = delta > 0 ? Math.round(drag.startPos) + 1 : Math.round(drag.startPos) - 1;
            animateTo(target, 540, false);
          }

          stage.addEventListener('mousedown', function (e) { if (e.button === 0) startDrag(e.clientX, e.clientY); });
          window.addEventListener('mousemove', function (e) { moveDrag(e.clientX, e.clientY, e); });
          window.addEventListener('mouseup', endDrag);
          stage.addEventListener('touchstart', function (e) { if (e.touches[0]) startDrag(e.touches[0].clientX, e.touches[0].clientY); }, { passive: true });
          stage.addEventListener('touchmove', function (e) { if (e.touches[0]) moveDrag(e.touches[0].clientX, e.touches[0].clientY, e); }, { passive: false });
          stage.addEventListener('touchend', endDrag, { passive: true });
          stage.addEventListener('touchcancel', endDrag, { passive: true });
          root.addEventListener('mouseenter', function () { hovered = true; });
          root.addEventListener('mouseleave', function () { hovered = false; });
          window.addEventListener('resize', renderFrame);

          if (slideMode === 'auto' && total > 1) {
            setInterval(function () {
              if (!drag.active && !hovered) animateTo(Math.round(pos) + 1, 780, true);
            }, intervalMs);
          }

          renderFrame();
          if (typeof requestAnimationFrame === 'function') {
            requestAnimationFrame(renderFrame);
          }
          if (typeof ResizeObserver === 'function') {
            try {
              var ro = new ResizeObserver(function () { renderFrame(); });
              ro.observe(root);
            } catch (_) {}
          }
        });
      })();

      // --- DYNAMIC ADMIN CTA WHATSAPP LINK SYNC ---
      window.__lynkSyncAdminWa = function (root, title, price) {
        if (!root) return;
        var anchor = root.querySelector('[data-admin-cta-wa]');
        if (!anchor) return;
        var rawPhone = anchor.getAttribute('data-wa-num') || '6281234567890';
        var digits = String(rawPhone).replace(/\\D/g, '');
        var cleanPhone = digits.charAt(0) === '0' ? '62' + digits.slice(1) : (digits || '6281234567890');
        var prodLabel = [title ? String(title).trim() : '', price ? String(price).trim() : ''].filter(Boolean).join(' - ');
        var rawTpl = (anchor.getAttribute('data-wa-msg') || '').trim() ||
          (prodLabel ? 'Halo Admin, saya ingin bertanya tentang ' + prodLabel + '.' : 'Halo Admin, saya ingin bertanya tentang produk ini.');
        var finalMsg = rawTpl
          .replace(/\\{produk\\}/gi, prodLabel || (title ? String(title).trim() : 'produk ini'))
          .replace(/\\{nama\\}/gi, title ? String(title).trim() : 'produk ini')
          .replace(/\\{harga\\}/gi, price ? String(price).trim() : '');
        anchor.setAttribute('href', 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(finalMsg));
      };

      // --- ANIMATED PRODUCT BOX REVEAL (ONE-SHOT CLOSED -> OPEN, STOPS ON FINAL FRAME) ---
      (function initProductBoxReveals() {
        var roots = Array.prototype.slice.call(document.querySelectorAll('[data-product-box-reveal]'));
        if (!roots.length) return;
        var reduceMotion = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        var grain = 'repeating-linear-gradient(2deg, rgba(255,255,255,0.05) 0px, rgba(255,255,255,0.05) 2px, rgba(0,0,0,0.09) 2px, rgba(0,0,0,0.09) 5px, rgba(255,255,255,0.02) 5px, rgba(255,255,255,0.02) 9px)';
        function pbrRgb(hex) {
          var s = String(hex || '#5C3626').trim().replace('#', '');
          if (/^[0-9a-fA-F]{3}$/.test(s)) return { r: parseInt(s[0]+s[0],16), g: parseInt(s[1]+s[1],16), b: parseInt(s[2]+s[2],16) };
          if (/^[0-9a-fA-F]{6}$/.test(s)) return { r: parseInt(s.slice(0,2),16), g: parseInt(s.slice(2,4),16), b: parseInt(s.slice(4,6),16) };
          return { r: 92, g: 54, b: 38 };
        }
        function pbrShade(c, d) {
          var cl = function (v) { return Math.max(0, Math.min(255, Math.round(v))); };
          return 'rgb(' + cl(c.r + d) + ',' + cl(c.g + d) + ',' + cl(c.b + d) + ')';
        }
        roots.forEach(function (root) {
          var blockId = root.getAttribute('data-product-box-reveal') || '';
          var rawItems = root.getAttribute('data-pbr-items') || '[]';
          var defaultColor = root.getAttribute('data-pbr-color') || '#5C3626';
          var defaultBoxShape = root.getAttribute('data-pbr-box-shape') || 'square';
          var cornerRadiusPx = Math.max(0, Math.min(90, Number(root.getAttribute('data-pbr-corner-radius') || 24)));
          var borderThickPx = Math.max(1, Math.min(36, Number(root.getAttribute('data-pbr-border-thick') || 18)));
          var lidOpenStyle = root.getAttribute('data-pbr-lid-style') || 'hinge_top';
          var zoomOn = root.getAttribute('data-pbr-zoom-on') !== '0';
          var zoomStart = Math.max(50, Math.min(180, Number(root.getAttribute('data-pbr-zoom-start') || 118))) / 100;
          var zoomEnd = Math.max(40, Math.min(160, Number(root.getAttribute('data-pbr-zoom-end') || 100))) / 100;
          var transEffect = root.getAttribute('data-pbr-trans') || 'slide_vertical';
          var transMs = Math.max(220, Math.min(1400, Number(root.getAttribute('data-pbr-trans-ms') || 520)));
          var vSwipe = root.getAttribute('data-pbr-vswipe') !== '0';
          var slideMode = root.getAttribute('data-pbr-slide-mode') === 'auto' ? 'auto' : 'manual';
          var autoMs = Math.max(2000, Math.min(10000, Number(root.getAttribute('data-pbr-auto-ms') || 4000)));
          var globalLidLogo = root.getAttribute('data-pbr-global-lid-logo') || '';
          var globalLidSize = Math.max(10, Math.min(100, Number(root.getAttribute('data-pbr-global-lid-size') || 44)));
          var globalLidPad = Math.max(0, Math.min(48, Number(root.getAttribute('data-pbr-global-lid-pad') || 12)));
          var globalLidFit = root.getAttribute('data-pbr-global-lid-fit') === 'cover' ? 'cover' : 'contain';
          var items = [];
          try { items = JSON.parse(rawItems); } catch (e) { items = []; }
          if (!items.length) return;

          var boxWrap = root.querySelector('[data-pbr-box-wrap]');
          var shadowEl = root.querySelector('[data-pbr-shadow-el]');
          var lid = root.querySelector('[data-pbr-lid]');
          var lidGrooveEl = root.querySelector('[data-pbr-lid-groove]');
          var hingeLineEl = root.querySelector('[data-pbr-hinge-line]');
          var lidLogoWrap = root.querySelector('[data-pbr-lid-logo-wrap]');
          var lidLogoEl = root.querySelector('[data-pbr-lid-logo]');
          var frame = root.querySelector('[data-pbr-frame]');
          var cavity = root.querySelector('[data-pbr-cavity]');
          var cushionEl = root.querySelector('[data-pbr-cushion]');
          var prodWrap = root.querySelector('[data-pbr-product]');
          var imgEl = root.querySelector('[data-pbr-img]');
          var emptyEl = root.querySelector('[data-pbr-empty]');
          var titleEl = root.querySelector('[data-pbr-title]');
          var priceEl = root.querySelector('[data-pbr-price]');
          var descEl = root.querySelector('[data-pbr-desc]');
          var variantsEl = root.querySelector('[data-pbr-variants]');
          var replayBtn = root.querySelector('[data-pbr-replay]');
          var prevBtn = root.querySelector('[data-pbr-prev]');
          var nextBtn = root.querySelector('[data-pbr-next]');
          var addBtn = root.querySelector('[data-pbr-add]');
          var stepperEl = root.querySelector('[data-pbr-stepper]');
          var decBtn = root.querySelector('[data-pbr-dec]');
          var qtyEl = root.querySelector('[data-pbr-qty]');
          var incBtn = root.querySelector('[data-pbr-inc]');
          var dots = Array.prototype.slice.call(root.querySelectorAll('[data-pbr-dot]'));
          var vdots = Array.prototype.slice.call(root.querySelectorAll('[data-pbr-vdot]'));

          var activeIdx = 0;
          var selectedVariants = {};
          var timer = null;
          var raf1 = null;
          var raf2 = null;
          var autoTimer = null;
          var isHovered = false;
          var isDragging = false;

          function parseVars(raw) {
            if (!raw) return [];
            return String(raw).split(/[,|\\n]+/).map(function (s) { return s.trim(); }).filter(Boolean);
          }

          function clearTimers() {
            if (timer) { clearTimeout(timer); timer = null; }
            if (raf1) { cancelAnimationFrame(raf1); raf1 = null; }
            if (raf2) { cancelAnimationFrame(raf2); raf2 = null; }
          }

          function getLidMotion(style) {
            if (style === 'hinge_left') {
              return { origin: '0% 50%', closed: 'rotateY(0deg) translateX(0px)', open: 'rotateY(-108deg) translateX(-10px)' };
            }
            if (style === 'hinge_right') {
              return { origin: '100% 50%', closed: 'rotateY(0deg) translateX(0px)', open: 'rotateY(108deg) translateX(10px)' };
            }
            if (style === 'lift') {
              return { origin: '50% 50%', closed: 'translateY(0px) scale(1)', open: 'translateY(-46px) scale(1.06)' };
            }
            if (style === 'spin_lift') {
              return { origin: '50% 50%', closed: 'translateY(0px) rotate(0deg) scale(1)', open: 'translateY(-44px) rotate(58deg) scale(1.05)' };
            }
            return { origin: '50% 0%', closed: 'rotateX(0deg) translateY(0px)', open: 'rotateX(108deg) translateY(-10px)' };
          }
          var lidMotion = getLidMotion(lidOpenStyle);

          function applyBoxShape(shape) {
            var eff = (shape === 'circle' || shape === 'rounded' || shape === 'square') ? shape : defaultBoxShape;
            var isCircle = eff === 'circle';
            var outerR = isCircle ? '50%' : (eff === 'rounded' ? cornerRadiusPx + 'px' : '7px');
            var cavityR = isCircle
              ? '50%'
              : (eff === 'rounded'
                  ? Math.max(2, cornerRadiusPx - Math.round(borderThickPx * 0.65)) + 'px'
                  : (borderThickPx <= 4 ? '5px' : '3px'));
            var grooveR = isCircle ? '50%' : (eff === 'rounded' ? Math.max(2, cornerRadiusPx - 6) + 'px' : '4px');
            if (shadowEl) shadowEl.style.borderRadius = outerR;
            if (frame) frame.style.borderRadius = outerR;
            if (cavity) cavity.style.borderRadius = cavityR;
            if (cushionEl) cushionEl.style.borderRadius = isCircle ? '50%' : cavityR;
            if (lid) lid.style.borderRadius = outerR;
            if (lidGrooveEl) lidGrooveEl.style.borderRadius = grooveR;
            if (lidLogoWrap) lidLogoWrap.style.borderRadius = outerR;
            if (hingeLineEl) hingeLineEl.style.display = (!isCircle && lidOpenStyle === 'hinge_top') ? 'block' : 'none';
            return { isCircle: isCircle, outerR: outerR };
          }

          function setOpenState(open, instant) {
            root.setAttribute('data-pbr-state', open ? 'open' : 'closed');
            var pScale = zoomOn ? (open ? zoomEnd : zoomStart) : zoomEnd;
            if (lid) {
              lid.style.transformOrigin = lidMotion.origin;
              lid.style.transition = instant ? 'none' : 'transform 900ms cubic-bezier(0.22, 1, 0.36, 1), opacity 320ms ease 520ms';
              lid.style.transform = open ? lidMotion.open : lidMotion.closed;
              lid.style.opacity = open ? '0' : '1';
              lid.style.pointerEvents = open ? 'none' : 'auto';
            }
            if (prodWrap) {
              prodWrap.style.transition = instant ? 'none' : 'opacity 540ms cubic-bezier(0.16, 1, 0.3, 1) 240ms, transform 720ms cubic-bezier(0.16, 1, 0.3, 1) 200ms';
              prodWrap.style.opacity = open ? '1' : '0';
              prodWrap.style.transform = 'scale(' + pScale.toFixed(3) + ')';
            }
          }

          function triggerClosedThenOpen(withBoxTransition, dir) {
            clearTimers();
            if (reduceMotion) {
              if (boxWrap) { boxWrap.style.transition = 'none'; boxWrap.style.transform = 'none'; boxWrap.style.opacity = '1'; }
              setOpenState(true, true);
              return;
            }
            setOpenState(false, true);
            if (withBoxTransition && boxWrap) {
              var enterTransform = 'translate3d(0,0,0)';
              if (transEffect === 'slide_vertical') enterTransform = 'translate3d(0,' + (dir > 0 ? 54 : -54) + 'px,0) scale(0.96)';
              else if (transEffect === 'zoom_out') enterTransform = 'translate3d(0,0,0) scale(1.16)';
              else if (transEffect === 'flip') enterTransform = 'rotateY(' + (dir > 0 ? 68 : -68) + 'deg) scale(0.92)';
              boxWrap.style.transition = 'none';
              boxWrap.style.transform = enterTransform;
              boxWrap.style.opacity = '0';
              raf1 = requestAnimationFrame(function () {
                raf2 = requestAnimationFrame(function () {
                  boxWrap.style.transition = 'transform ' + transMs + 'ms cubic-bezier(0.22, 1, 0.36, 1), opacity ' + Math.round(transMs * 0.8) + 'ms ease';
                  boxWrap.style.transform = 'translate3d(0,0,0) scale(1) rotateY(0deg)';
                  boxWrap.style.opacity = '1';
                  var openDelay = Math.max(240, Math.round(transMs * 0.72));
                  timer = setTimeout(function () {
                    setOpenState(true, false);
                    timer = null;
                  }, openDelay);
                });
              });
            } else {
              raf1 = requestAnimationFrame(function () {
                raf2 = requestAnimationFrame(function () {
                  timer = setTimeout(function () {
                    setOpenState(true, false);
                    timer = null;
                  }, 360);
                });
              });
            }
          }

          function renderVariants(it, col) {
            if (!variantsEl) return;
            var list = parseVars(it.variants);
            if (!list.length) {
              variantsEl.style.display = 'none';
              variantsEl.innerHTML = '';
              return;
            }
            if (!selectedVariants[it.id] || list.indexOf(selectedVariants[it.id]) === -1) {
              selectedVariants[it.id] = list[0];
            }
            var activeV = selectedVariants[it.id];
            variantsEl.style.display = 'flex';
            variantsEl.innerHTML = '';
            list.forEach(function (v) {
              var b = document.createElement('button');
              b.type = 'button';
              b.textContent = v;
              var isSel = v === activeV;
              b.style.cssText = 'padding:4px 10px; border-radius:9999px; font-size:11px; font-weight:600; cursor:pointer; background:' + (isSel ? col : 'rgba(255,255,255,0.86)') + '; color:' + (isSel ? '#FFFFFF' : '#4A3D36') + '; border:1px solid ' + (isSel ? col : 'rgba(92,54,38,0.16)') + ';';
              b.addEventListener('click', function (ev) {
                ev.stopPropagation();
                selectedVariants[it.id] = v;
                renderVariants(it, col);
                if (typeof window.__lynkSyncAdminWa === 'function') {
                  window.__lynkSyncAdminWa(root, it.title + ' (' + v + ')', it.price);
                }
              });
              variantsEl.appendChild(b);
            });
          }

          function applyItem(nextIdx, withTransition, explicitDir) {
            var wrapped = ((nextIdx % items.length) + items.length) % items.length;
            var dir = explicitDir || (wrapped >= activeIdx ? 1 : -1);
            var same = wrapped === activeIdx;
            activeIdx = wrapped;
            var it = items[activeIdx];
            if (!it) return;
            var col = it.boxColor || defaultColor;
            var shapeInfo = applyBoxShape(it.boxShape || defaultBoxShape);
            var rgb = pbrRgb(col);
            if (lid) lid.style.background = grain + ', linear-gradient(155deg, ' + pbrShade(rgb, 26) + ' 0%, ' + pbrShade(rgb, 0) + ' 48%, ' + pbrShade(rgb, -34) + ' 100%)';
            if (frame) frame.style.background = grain + ', linear-gradient(145deg, ' + pbrShade(rgb, 26) + ' 0%, ' + pbrShade(rgb, -14) + ' 55%, ' + pbrShade(rgb, -56) + ' 100%)';
            if (cavity) cavity.style.background = 'radial-gradient(circle at 50% 46%, ' + pbrShade(rgb, -34) + ' 0%, ' + pbrShade(rgb, -68) + ' 62%, #110C0A 100%)';
            if (lidLogoEl) {
              var logoSrc = it.lidLogoImage || globalLidLogo;
              var effPad = typeof it.lidLogoPadding === 'number' ? Math.max(0, Math.min(48, Math.round(it.lidLogoPadding))) : globalLidPad;
              var effSize = typeof it.lidLogoSize === 'number' ? Math.max(10, Math.min(100, Math.round(it.lidLogoSize))) : globalLidSize;
              var effFit = it.lidLogoFit === 'cover' || it.lidLogoFit === 'contain' ? it.lidLogoFit : globalLidFit;
              if (lidLogoWrap) {
                lidLogoWrap.style.padding = effPad + 'px';
                lidLogoWrap.style.display = logoSrc ? 'flex' : 'none';
              }
              if (logoSrc) {
                lidLogoEl.setAttribute('src', logoSrc);
                lidLogoEl.style.display = 'block';
                lidLogoEl.style.width = effSize + '%';
                lidLogoEl.style.height = effSize + '%';
                lidLogoEl.style.objectFit = effFit;
                lidLogoEl.style.borderRadius = shapeInfo.isCircle ? '50%' : ((effPad === 0 && effSize >= 98) ? shapeInfo.outerR : '2px');
                lidLogoEl.style.filter = (effPad === 0 && effFit === 'cover') ? 'none' : 'drop-shadow(0 2px 4px rgba(0,0,0,0.38))';
              } else {
                lidLogoEl.setAttribute('src', '');
                lidLogoEl.style.display = 'none';
              }
            }
            if (titleEl) titleEl.textContent = it.title || 'Produk Eksklusif';
            if (priceEl) priceEl.textContent = it.price || '';
            if (descEl) {
              descEl.textContent = it.description || '';
              descEl.style.display = it.description ? 'block' : 'none';
            }
            if (imgEl) {
              if (it.image) {
                imgEl.setAttribute('src', it.image);
                imgEl.setAttribute('alt', it.title || 'Foto Produk');
                imgEl.style.display = 'block';
                if (emptyEl) emptyEl.style.display = 'none';
              } else {
                imgEl.setAttribute('src', '');
                imgEl.style.display = 'none';
                if (emptyEl) emptyEl.style.display = 'flex';
              }
            }
            renderVariants(it, col);
            var itemKey = blockId + '::' + it.id;
            if (addBtn) addBtn.setAttribute('data-fnb-add', itemKey);
            if (stepperEl) stepperEl.setAttribute('data-fnb-stepper', itemKey);
            if (decBtn) decBtn.setAttribute('data-fnb-dec', itemKey);
            if (qtyEl) qtyEl.setAttribute('data-fnb-qty', itemKey);
            if (incBtn) {
              incBtn.setAttribute('data-fnb-inc', itemKey);
              incBtn.style.background = col;
            }
            if (typeof window.__lynkSyncCart === 'function') window.__lynkSyncCart();
            if (typeof window.__lynkSyncAdminWa === 'function') {
              var selV = selectedVariants[it.id];
              window.__lynkSyncAdminWa(root, selV ? it.title + ' (' + selV + ')' : it.title, it.price);
            }
            dots.forEach(function (dot, di) {
              var isSel = di === activeIdx;
              dot.setAttribute('aria-selected', isSel ? 'true' : 'false');
              dot.style.width = isSel ? '26px' : '20px';
              dot.style.height = isSel ? '26px' : '20px';
              dot.style.boxShadow = isSel
                ? '0 0 0 2px #EFEFEF, 0 0 0 3.5px #5C3626, 0 4px 10px rgba(0,0,0,0.18)'
                : '0 2px 6px rgba(0,0,0,0.16)';
            });
            vdots.forEach(function (vdot, di) {
              var isSel = di === activeIdx;
              var orient = vdot.getAttribute('data-pbr-vdot-orient') || 'v';
              var dcol = (items[di] && items[di].boxColor) || defaultColor;
              vdot.setAttribute('aria-selected', isSel ? 'true' : 'false');
              if (orient === 'v') {
                vdot.style.width = isSel ? '8px' : '6px';
                vdot.style.height = isSel ? '20px' : '6px';
              } else {
                vdot.style.width = isSel ? '20px' : '7px';
                vdot.style.height = '7px';
              }
              vdot.style.background = isSel ? dcol : 'rgba(92,75,66,0.32)';
            });
            triggerClosedThenOpen(withTransition && !same, dir);
          }

          function restartAutoSlide() {
            if (autoTimer) { clearInterval(autoTimer); autoTimer = null; }
            if (slideMode !== 'auto' || items.length <= 1) return;
            autoTimer = setInterval(function () {
              if (!isHovered && !isDragging) {
                applyItem(activeIdx + 1, true, 1);
              }
            }, autoMs);
          }

          root.addEventListener('mouseenter', function () { isHovered = true; });
          root.addEventListener('mouseleave', function () { isHovered = false; });

          dots.forEach(function (dot, di) {
            dot.addEventListener('click', function (e) {
              e.stopPropagation();
              applyItem(di, true);
              restartAutoSlide();
            });
          });
          vdots.forEach(function (vdot, di) {
            vdot.addEventListener('click', function (e) {
              e.stopPropagation();
              applyItem(di, true);
              restartAutoSlide();
            });
          });
          if (prevBtn) {
            prevBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              if (items.length > 1) {
                applyItem(activeIdx - 1, true, -1);
                restartAutoSlide();
              }
            });
          }
          if (nextBtn) {
            nextBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              if (items.length > 1) {
                applyItem(activeIdx + 1, true, 1);
                restartAutoSlide();
              }
            });
          }
          if (replayBtn) {
            replayBtn.addEventListener('click', function (e) {
              e.stopPropagation();
              triggerClosedThenOpen(false, 1);
            });
          }
          if (lid) {
            lid.addEventListener('click', function (e) {
              e.stopPropagation();
              setOpenState(true, false);
            });
          }
          if (vSwipe && items.length > 1) {
            var swipeState = { active: false, sx: 0, sy: 0 };
            root.addEventListener('pointerdown', function (e) {
              if (e.button !== 0 && e.pointerType === 'mouse') return;
              if (e.target && e.target.closest && e.target.closest('button, a, input')) return;
              swipeState = { active: true, sx: e.clientX, sy: e.clientY };
              isDragging = true;
            });
            root.addEventListener('pointerup', function (e) {
              if (!swipeState.active) return;
              swipeState.active = false;
              isDragging = false;
              var dx = e.clientX - swipeState.sx;
              var dy = e.clientY - swipeState.sy;
              if (Math.abs(dy) >= 34 && Math.abs(dy) > Math.abs(dx) * 1.15) {
                applyItem(activeIdx + (dy < 0 ? 1 : -1), true, dy < 0 ? 1 : -1);
                restartAutoSlide();
              }
            });
            root.addEventListener('pointercancel', function () { swipeState.active = false; isDragging = false; });
          }

          renderVariants(items[0], items[0].boxColor || defaultColor);

          if (typeof IntersectionObserver !== 'undefined') {
            var io = new IntersectionObserver(function (entries) {
              for (var k = 0; k < entries.length; k++) {
                if (entries[k].isIntersecting) {
                  triggerClosedThenOpen(false, 1);
                  restartAutoSlide();
                  io.disconnect();
                  break;
                }
              }
            }, { threshold: 0.25 });
            io.observe(root);
          } else {
            triggerClosedThenOpen(false, 1);
            restartAutoSlide();
          }
        });
      })();

      // --- MIX RASA CONFIGURATOR INTERACTIVE RUNTIME ---
      (function initMixRasaConfigurators() {
        var roots = document.querySelectorAll('[data-mix-rasa]');
        if (!roots.length) return;

        function mrParsePrice(raw) {
          if (typeof raw === 'number' && isFinite(raw)) return Math.max(0, Math.round(raw));
          var digits = String(raw || '').replace(/[^\\d]/g, '');
          var parsed = Number(digits);
          return isFinite(parsed) ? parsed : 0;
        }
        function mrFormatRp(amount) {
          var safe = Math.max(0, Math.round(isFinite(amount) ? amount : 0));
          return 'Rp' + String(safe).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.');
        }
        function mrEsc(s) {
          return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        }
        function mrBuildProductLabel(title, size) {
          var cleanTitle = String(title || 'Pizza Mix Rasa').trim() || 'Pizza Mix Rasa';
          var cleanSize = String(size || '').trim();
          if (!cleanSize) return cleanTitle;
          if (cleanTitle.toLowerCase().indexOf(cleanSize.toLowerCase()) !== -1) return cleanTitle;
          var titleFirst = (cleanTitle.split(/\\s+/)[0] || '').toLowerCase();
          var sizeParts = cleanSize.split(/\\s+/);
          if (titleFirst && sizeParts.length > 1 && sizeParts[0].toLowerCase() === titleFirst) {
            return (cleanTitle + ' ' + sizeParts.slice(1).join(' ')).trim();
          }
          return (cleanTitle + ' ' + cleanSize).trim();
        }
        function mrSlotLabel(sc, idx) {
          if (sc === 2) return idx === 0 ? 'Bagian Kiri' : 'Bagian Kanan';
          return 'Bagian ' + (idx + 1);
        }
        function mrClipPath(sc, idx) {
          if (sc === 2) return idx === 0 ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)';
          if (sc === 3) {
            if (idx === 0) return 'polygon(50% 50%, 50% -150%, 223.2% -150%, 223.2% 150%)';
            if (idx === 1) return 'polygon(50% 50%, 223.2% 150%, 50% 250%, -123.2% 150%)';
            return 'polygon(50% 50%, -123.2% 150%, -123.2% -150%, 50% -150%)';
          }
          if (idx === 0) return 'inset(0 50% 50% 0)';
          if (idx === 1) return 'inset(0 0 50% 50%)';
          if (idx === 2) return 'inset(50% 50% 0 0)';
          return 'inset(50% 0 0 50%)';
        }
        function mrSeamsSvg(sc, strokeW, strokeColor) {
          if (!isFinite(strokeW) || strokeW <= 0) return '';
          var col = mrEsc(strokeColor || '#FFFFFF');
          if (sc === 2) {
            return '<svg viewBox="0 0 200 200" aria-hidden="true" style="pointer-events:none; position:absolute; inset:0; width:100%; height:100%;"><line x1="100" y1="0" x2="100" y2="200" stroke="' + col + '" stroke-width="' + strokeW + '"/></svg>';
          }
          if (sc === 3) {
            return '<svg viewBox="0 0 200 200" aria-hidden="true" style="pointer-events:none; position:absolute; inset:0; width:100%; height:100%;"><line x1="100" y1="100" x2="100" y2="0" stroke="' + col + '" stroke-width="' + strokeW + '"/><line x1="100" y1="100" x2="186.6" y2="150" stroke="' + col + '" stroke-width="' + strokeW + '"/><line x1="100" y1="100" x2="13.4" y2="150" stroke="' + col + '" stroke-width="' + strokeW + '"/></svg>';
          }
          return '<svg viewBox="0 0 200 200" aria-hidden="true" style="pointer-events:none; position:absolute; inset:0; width:100%; height:100%;"><line x1="100" y1="0" x2="100" y2="200" stroke="' + col + '" stroke-width="' + strokeW + '"/><line x1="0" y1="100" x2="200" y2="100" stroke="' + col + '" stroke-width="' + strokeW + '"/></svg>';
        }
        function mrImgScaleCss(flv) {
          var s = Number(flv && flv.imageScale);
          if (!isFinite(s) || s === 100) return '';
          var clamped = Math.max(50, Math.min(200, Math.round(s))) / 100;
          return ' transform:scale(' + clamped + '); transform-origin:center center;';
        }

        roots.forEach(function (root) {
          var cfgEl = root.querySelector('[data-mr-config]');
          if (!cfgEl) return;
          var cfg = null;
          try { cfg = JSON.parse(cfgEl.textContent || '{}'); } catch (e) { cfg = null; }
          if (!cfg || !Array.isArray(cfg.flavors) || !cfg.flavors.length) return;

          var flavors = cfg.flavors;
          var sliceCount = (cfg.sliceCount === 3 || cfg.sliceCount === 4) ? cfg.sliceCount : 2;
          var accentColor = cfg.accentColor || '#EA6314';
          var dividerWidth = isFinite(Number(cfg.dividerWidth)) ? Math.max(0, Math.min(20, Number(cfg.dividerWidth))) : 4;
          var dividerColor = cfg.dividerColor || '#FFFFFF';
          var miniDividerWidth = dividerWidth === 0 ? 0 : Math.max(1.5, Math.min(8, Math.round(dividerWidth * 6) / 10));
          var effectiveSize = cfg.showProductSize === false ? '' : String(cfg.productSize || '');
          var selectedIds = [];
          function ensureSelectedIds() {
            var next = [];
            for (var i = 0; i < sliceCount; i++) {
              var cid = selectedIds[i] || (Array.isArray(cfg.selectedIds) ? cfg.selectedIds[i] : '');
              var matched = null;
              for (var j = 0; j < flavors.length; j++) {
                if (flavors[j].id === cid) { matched = flavors[j]; break; }
              }
              next.push(matched ? matched.id : flavors[i % flavors.length].id);
            }
            selectedIds = next;
          }
          ensureSelectedIds();

          var pickerSlot = null;
          var addedTimer = null;

          var mainPreviewEl = root.querySelector('[data-mr-main-preview]');
          var miniPreviewEl = root.querySelector('[data-mr-mini-preview]');
          var slotsGridEl = root.querySelector('[data-mr-slots]');
          var sizeSubtitleEl = root.querySelector('[data-mr-size-subtitle]');
          var pickerBox = root.querySelector('[data-mr-picker]');
          var pickerTitle = root.querySelector('[data-mr-picker-title]');
          var pickerGrid = root.querySelector('[data-mr-picker-grid]');
          var pickerClose = root.querySelector('[data-mr-picker-close]');
          var combinedEl = root.querySelector('[data-mr-combined]');
          var totalEl = root.querySelector('[data-mr-total]');
          var addCartBtn = root.querySelector('[data-mr-add-cart]');
          var addCartLabelEl = root.querySelector('[data-mr-add-cart-label]');
          var waLinkEl = root.querySelector('[data-mr-wa-link]');
          var backBtn = root.querySelector('[data-mr-back]');

          function getSelectedFlavors() {
            var out = [];
            for (var k = 0; k < sliceCount; k++) {
              var id = selectedIds[k];
              var found = null;
              for (var m = 0; m < flavors.length; m++) {
                if (flavors[m].id === id) { found = flavors[m]; break; }
              }
              out.push(found || flavors[k % flavors.length]);
            }
            return out;
          }

          function buildSliceInner(flv) {
            if (flv.image) {
              return '<img src="' + mrEsc(flv.image) + '" alt="' + mrEsc(flv.name) + '" referrerpolicy="no-referrer" draggable="false" style="width:100%; height:100%; object-fit:cover; display:block; user-select:none;' + mrImgScaleCss(flv) + '" />';
            }
            return '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#FFFFFF; font-size:12px; font-weight:700; background:' + mrEsc(flv.accentColor || accentColor) + ';">' + mrEsc(String(flv.name || '').slice(0, 2).toUpperCase()) + '</div>';
          }

          function rebuildStructure() {
            ensureSelectedIds();
            var chosen = getSelectedFlavors();

            if (mainPreviewEl) {
              var mainHtml = '';
              for (var i = 0; i < chosen.length; i++) {
                var clip = mrClipPath(sliceCount, i);
                mainHtml += '<div data-mr-slice="' + i + '" role="button" style="position:absolute; inset:0; clip-path:' + clip + '; -webkit-clip-path:' + clip + '; cursor:pointer;">' + buildSliceInner(chosen[i]) + '</div>';
              }
              mainPreviewEl.innerHTML = mainHtml + mrSeamsSvg(sliceCount, dividerWidth, dividerColor);
              mainPreviewEl.querySelectorAll('[data-mr-slice]').forEach(function (el) {
                el.addEventListener('click', function () {
                  var idx = Number(el.getAttribute('data-mr-slice'));
                  pickerSlot = (pickerSlot === idx) ? null : idx;
                  syncUi();
                });
              });
            }

            if (miniPreviewEl) {
              var miniHtml = '';
              for (var j = 0; j < chosen.length; j++) {
                var mclip = mrClipPath(sliceCount, j);
                miniHtml += '<div data-mr-mini-slice="' + j + '" style="position:absolute; inset:0; clip-path:' + mclip + '; -webkit-clip-path:' + mclip + ';">' + buildSliceInner(chosen[j]) + '</div>';
              }
              miniPreviewEl.innerHTML = miniHtml + mrSeamsSvg(sliceCount, miniDividerWidth, dividerColor);
            }

            if (slotsGridEl) {
              slotsGridEl.style.gridTemplateColumns = 'repeat(' + (sliceCount === 3 ? 3 : 2) + ', minmax(0, 1fr))';
              slotsGridEl.innerHTML = chosen.map(function (flv, idx) {
                return (
                  '<button type="button" data-mr-slot="' + idx + '" style="text-align:left; border-radius:16px; padding:10px 12px; border:1px solid #E2E8F0; background:#FFFFFF; box-shadow:0 2px 8px rgba(15,23,42,0.04); display:flex; align-items:center; justify-content:space-between; gap:6px; cursor:pointer; font-family:inherit; min-width:0; transition:border-color 0.16s, box-shadow 0.16s;">' +
                    '<div style="min-width:0; flex:1;">' +
                      '<div data-mr-slot-name="' + idx + '" style="font-size:12px; font-weight:700; color:#0F172A; line-height:1.3; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + mrEsc(flv.name) + '</div>' +
                      '<div data-mr-slot-price="' + idx + '" style="font-size:11.5px; font-weight:800; color:#1E293B; margin-top:2px; font-variant-numeric:tabular-nums; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + mrEsc(mrFormatRp(mrParsePrice(flv.price))) + '</div>' +
                    '</div>' +
                    '<svg data-mr-slot-chev="' + idx + '" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#94A3B8" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0; transition:transform 0.16s;"><path d="m9 18 6-6-6-6"/></svg>' +
                  '</button>'
                );
              }).join('');
              slotsGridEl.querySelectorAll('[data-mr-slot]').forEach(function (btn) {
                btn.addEventListener('click', function () {
                  var idx = Number(btn.getAttribute('data-mr-slot'));
                  pickerSlot = (pickerSlot === idx) ? null : idx;
                  syncUi();
                });
              });
            }

            if (sizeSubtitleEl && effectiveSize) {
              sizeSubtitleEl.textContent = effectiveSize + ' (' + sliceCount + ' Rasa)';
            }

            root.querySelectorAll('[data-mr-slice-btn]').forEach(function (btn) {
              var cnt = Number(btn.getAttribute('data-mr-slice-btn'));
              var on = cnt === sliceCount;
              btn.style.background = on ? accentColor : 'transparent';
              btn.style.color = on ? '#FFFFFF' : '#475569';
              btn.style.boxShadow = on ? ('0 4px 10px -4px ' + accentColor + '99') : 'none';
            });
          }

          function syncUi() {
            var chosen = getSelectedFlavors();
            var total = 0;
            var names = [];
            for (var idx = 0; idx < chosen.length; idx++) {
              var flv = chosen[idx];
              var p = mrParsePrice(flv.price);
              total += p;
              names.push(flv.name || ('Rasa ' + (idx + 1)));

              var mainSlice = root.querySelector('[data-mr-slice="' + idx + '"]');
              var miniSlice = root.querySelector('[data-mr-mini-slice="' + idx + '"]');
              if (mainSlice) {
                mainSlice.innerHTML = buildSliceInner(flv);
                mainSlice.style.filter = (pickerSlot === idx) ? 'brightness(1.06)' : '';
              }
              if (miniSlice) {
                miniSlice.innerHTML = buildSliceInner(flv);
              }

              var slotBtn = root.querySelector('[data-mr-slot="' + idx + '"]');
              var slotName = root.querySelector('[data-mr-slot-name="' + idx + '"]');
              var slotPrice = root.querySelector('[data-mr-slot-price="' + idx + '"]');
              var slotChev = root.querySelector('[data-mr-slot-chev="' + idx + '"]');
              if (slotName) slotName.textContent = flv.name || '';
              if (slotPrice) slotPrice.textContent = mrFormatRp(p);
              if (slotBtn) {
                var active = pickerSlot === idx;
                slotBtn.style.borderColor = active ? accentColor : '#E2E8F0';
                slotBtn.style.boxShadow = active ? ('0 0 0 2px ' + accentColor + '26') : '0 2px 8px rgba(15,23,42,0.04)';
              }
              if (slotChev) {
                slotChev.style.transform = pickerSlot === idx ? 'rotate(90deg)' : '';
                slotChev.setAttribute('stroke', pickerSlot === idx ? accentColor : '#94A3B8');
              }
            }

            if (combinedEl) combinedEl.textContent = names.join(' + ');
            if (totalEl) totalEl.textContent = mrFormatRp(total);

            if (waLinkEl && cfg.waEnabled) {
              var intro = String(cfg.waIntro || 'Halo, saya ingin memesan:').trim() || 'Halo, saya ingin memesan:';
              var waMsg = intro;
              if (cfg.waIncludeDetails !== false) {
                var prodLabel = mrBuildProductLabel(cfg.title, effectiveSize);
                var lines = [];
                for (var n = 0; n < chosen.length; n++) {
                  lines.push((n + 1) + '. ' + (chosen[n].name || ('Rasa ' + (n + 1))));
                }
                waMsg = [
                  intro,
                  '',
                  'Produk: ' + prodLabel,
                  '',
                  'Kombinasi Rasa:',
                  lines.join('\\n'),
                  '',
                  'Jumlah: 1',
                  'Total: ' + mrFormatRp(total),
                  '',
                  'Mohon informasi pemesanannya. Terima kasih.'
                ].join('\\n');
              }
              var cleanPhone = String(cfg.waNumber || '6281234567890').replace(/[^\\d]/g, '') || '6281234567890';
              if (cleanPhone.charAt(0) === '0') cleanPhone = '62' + cleanPhone.slice(1);
              waLinkEl.setAttribute('href', 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(waMsg));
            }

            if (pickerBox && pickerGrid) {
              if (pickerSlot === null) {
                pickerBox.style.display = 'none';
              } else {
                pickerBox.style.display = 'block';
                if (pickerTitle) pickerTitle.textContent = 'Pilih Rasa — ' + mrSlotLabel(sliceCount, pickerSlot);
                var curId = selectedIds[pickerSlot];
                pickerGrid.innerHTML = flavors.map(function (f) {
                  var isSel = f.id === curId;
                  var thumb = f.image
                    ? '<img src="' + mrEsc(f.image) + '" alt="' + mrEsc(f.name) + '" referrerpolicy="no-referrer" style="width:100%; height:100%; object-fit:cover; display:block;' + mrImgScaleCss(f) + '" />'
                    : '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#FFFFFF; font-size:10px; font-weight:700; background:' + mrEsc(f.accentColor || accentColor) + ';">' + mrEsc(String(f.name || '').slice(0, 2).toUpperCase()) + '</div>';
                  var checkOverlay = isSel
                    ? '<span style="position:absolute; inset:0; background:rgba(15,23,42,0.35); color:#FFFFFF; display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:800;">&#10003;</span>'
                    : '';
                  return (
                    '<button type="button" data-mr-pick="' + mrEsc(f.id) + '" style="display:flex; flex-direction:column; align-items:center; gap:4px; padding:8px 6px; border-radius:12px; border:1px solid ' + (isSel ? mrEsc(accentColor) : '#E2E8F0') + '; background:#FFFFFF; cursor:pointer; font-family:inherit; text-align:center;' + (isSel ? (' box-shadow:0 0 0 1.5px ' + mrEsc(accentColor) + ';') : '') + '">' +
                      '<div style="position:relative; width:44px; height:44px; border-radius:9999px; overflow:hidden; background:#F1F5F9; flex-shrink:0;">' + thumb + checkOverlay + '</div>' +
                      '<span style="font-size:10.5px; font-weight:700; color:#1E293B; line-height:1.2; max-width:100%; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + mrEsc(f.name) + '</span>' +
                      '<span style="font-size:9.5px; font-weight:600; color:#64748B; font-variant-numeric:tabular-nums;">' + mrEsc(mrFormatRp(mrParsePrice(f.price))) + '</span>' +
                    '</button>'
                  );
                }).join('');
                pickerGrid.querySelectorAll('[data-mr-pick]').forEach(function (btn) {
                  btn.addEventListener('click', function () {
                    var fid = btn.getAttribute('data-mr-pick');
                    if (fid && pickerSlot !== null) {
                      selectedIds[pickerSlot] = fid;
                      pickerSlot = null;
                      syncUi();
                    }
                  });
                });
              }
            }
          }

          root.querySelectorAll('[data-mr-slice-btn]').forEach(function (btn) {
            btn.addEventListener('click', function () {
              var nextCount = Number(btn.getAttribute('data-mr-slice-btn'));
              if (nextCount !== 2 && nextCount !== 3 && nextCount !== 4) return;
              if (nextCount === sliceCount) return;
              sliceCount = nextCount;
              pickerSlot = null;
              rebuildStructure();
              syncUi();
            });
          });

          if (pickerClose) {
            pickerClose.addEventListener('click', function () {
              pickerSlot = null;
              syncUi();
            });
          }

          if (addCartBtn && cfg.floatingCartEnabled) {
            addCartBtn.addEventListener('click', function () {
              var chosen = getSelectedFlavors();
              var total = 0;
              var idParts = [];
              var numbered = [];
              for (var k = 0; k < chosen.length; k++) {
                total += mrParsePrice(chosen[k].price);
                idParts.push(chosen[k].id);
                numbered.push((k + 1) + '. ' + (chosen[k].name || ('Rasa ' + (k + 1))));
              }
              var prodLabel = mrBuildProductLabel(cfg.title, effectiveSize);
              var sizePart = effectiveSize.trim();
              var variantText = sizePart
                ? (numbered.join(', ') + ' · ' + sliceCount + ' Bagian · ' + sizePart)
                : (numbered.join(', ') + ' · ' + sliceCount + ' Bagian');
              var dynamicItem = {
                id: 'mix_' + sliceCount + '_' + idParts.join('_'),
                title: prodLabel,
                price: mrFormatRp(total),
                image: (chosen[0] && chosen[0].image) || '',
                productType: 'physical'
              };
              if (typeof window.__lynkAddCartItem === 'function') {
                window.__lynkAddCartItem(cfg.blockId, dynamicItem, variantText, 1);
              }
              addCartBtn.style.background = '#059669';
              if (addCartLabelEl) addCartLabelEl.textContent = 'Masuk Keranjang!';
              if (addedTimer) clearTimeout(addedTimer);
              addedTimer = setTimeout(function () {
                addCartBtn.style.background = cfg.cartButtonBg || accentColor;
                if (addCartLabelEl) addCartLabelEl.textContent = cfg.cartButtonLabel || 'Gabungkan Rasa';
              }, 1400);
            });
          }

          if (backBtn) {
            backBtn.addEventListener('click', function () {
              var actionType = cfg.backActionType || 'back';
              if (actionType === 'page' && cfg.backTargetPageId && typeof window.__lynkOpenPage === 'function') {
                window.__lynkOpenPage(cfg.backTargetPageId);
              } else if (actionType === 'url' && cfg.backUrl) {
                window.location.href = cfg.backUrl;
              } else if (typeof window.__lynkBackPage === 'function') {
                window.__lynkBackPage();
              } else if (window.history && window.history.length > 1) {
                window.history.back();
              }
            });
          }

          rebuildStructure();
          syncUi();
        });
      })();

      // --- SLIDE MIX RASA INTERACTIVE 5-SLOT SYMMETRIC WHEEL RUNTIME ---
      (function initSlideMixRasaBlocks() {
        var roots = document.querySelectorAll('[data-slide-mix-rasa]');
        if (!roots.length) return;

        var WHEEL_OFFSETS = [-2, -1, 0, 1, 2];

        function smrParsePrice(raw) {
          if (typeof raw === 'number' && isFinite(raw)) return Math.max(0, Math.round(raw));
          var digits = String(raw || '').replace(/[^\\d]/g, '');
          var parsed = Number(digits);
          return isFinite(parsed) ? parsed : 0;
        }
        function smrFormatRp(amount) {
          var safe = Math.max(0, Math.round(isFinite(amount) ? amount : 0));
          return 'Rp' + String(safe).replace(/\\B(?=(\\d{3})+(?!\\d))/g, '.');
        }
        function smrEsc(s) {
          return String(s || '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
        }
        function smrWrap(idx, total) {
          if (total <= 0) return 0;
          return ((idx % total) + total) % total;
        }
        function smrBuildProductLabel(title, size) {
          var cleanTitle = String(title || 'Pizza Mix Rasa').trim() || 'Pizza Mix Rasa';
          var cleanSize = String(size || '').trim();
          if (!cleanSize) return cleanTitle;
          if (cleanTitle.toLowerCase().indexOf(cleanSize.toLowerCase()) !== -1) return cleanTitle;
          return (cleanTitle + ' ' + cleanSize).trim();
        }
        function smrSlotInnerHtml(flv, accent) {
          if (!flv) return '';
          var scaleNum = Number(flv.imageScale);
          if (!isFinite(scaleNum)) scaleNum = 100;
          var clamped = Math.max(50, Math.min(200, Math.round(scaleNum))) / 100;
          var scaleCss = clamped !== 1 ? (' transform:scale(' + clamped + '); transform-origin:center center;') : '';
          if (flv.image) {
            return '<img src="' + smrEsc(flv.image) + '" alt="' + smrEsc(flv.name) + '" referrerpolicy="no-referrer" draggable="false" style="width:100%; height:100%; object-fit:cover; display:block; user-select:none; pointer-events:none;' + scaleCss + '" />';
          }
          return '<div style="width:100%; height:100%; display:flex; align-items:center; justify-content:center; color:#FFFFFF; font-size:14px; font-weight:700; pointer-events:none; background:' + smrEsc(flv.accentColor || accent || '#EA6314') + ';">' + smrEsc(String(flv.name || '').slice(0, 2).toUpperCase()) + '</div>';
        }

        roots.forEach(function (root) {
          var cfgEl = root.querySelector('[data-smr-config]');
          if (!cfgEl) return;
          var cfg = null;
          try { cfg = JSON.parse(cfgEl.textContent || '{}'); } catch (e) { cfg = null; }
          if (!cfg || !Array.isArray(cfg.flavors) || !cfg.flavors.length) return;

          var flavors = cfg.flavors;
          var total = flavors.length;
          var leftVirtual = Math.max(0, Math.min(total - 1, Number(cfg.leftIdx) || 0));
          var rightVirtual = Math.max(0, Math.min(total - 1, Number(cfg.rightIdx) || (total > 1 ? 1 : 0)));
          var enableLoop = cfg.enableLoop !== false;
          var accent = cfg.accentColor || '#EA6314';
          var rawPreviewSize = Math.max(150, Math.min(320, Number(cfg.previewSize) || 236));
          var rawPeekSize = Math.max(56, Math.min(160, Number(cfg.peekSize) || 102));
          var peekOpacity = isFinite(Number(cfg.peekOpacity)) ? Math.max(0.1, Math.min(1, Number(cfg.peekOpacity))) : 0.58;
          var itemGap = isFinite(Number(cfg.itemGap)) ? Math.max(0, Math.min(64, Number(cfg.itemGap))) : 22;
          var transitionMs = isFinite(Number(cfg.transitionMs)) ? Math.max(180, Math.min(900, Number(cfg.transitionMs))) : 420;
          var isIconOnly = cfg.buttonDisplay === 'icon_only';
          var iconPx = Number(cfg.iconPx) || (isIconOnly ? 19 : 16);
          var effectiveSize = cfg.showProductSize === false ? '' : String(cfg.productSize || '');

          var stageEl = root.querySelector('[data-smr-stage]');
          var leftCol = root.querySelector('[data-smr-col="left"]');
          var rightCol = root.querySelector('[data-smr-col="right"]');
          var labelsEl = root.querySelector('[data-smr-labels]');
          var diceBtn = root.querySelector('[data-smr-dice]');
          var priceEl = root.querySelector('[data-smr-price]');
          var addCartBtn = root.querySelector('[data-smr-add-cart]');
          var addCartLabelEl = root.querySelector('[data-smr-add-cart-label]');
          var waLinkEl = root.querySelector('[data-smr-wa-link]');
          var adminWaEl = root.querySelector('[data-smr-admin-wa]');
          var backBtn = root.querySelector('[data-smr-back]');

          var nodeMaps = { left: {}, right: {} };
          var dragProgress = { left: 0, right: 0 };
          var draggingSide = null;
          var suppressClickUntil = 0;
          var wheelLock = { left: 0, right: 0 };
          var addedTimer = null;
          var autoTurn = 'right';

          var geom = {
            stageAvailW: 360,
            mainD: rawPreviewSize,
            peekD: rawPeekSize,
            gapPx: itemGap,
            padY: 14,
            centerY: 0,
            stepDist: 0,
            stageH: 0,
            peekScale: 0.43,
            sideLabelMaxW: 110
          };

          function hydrateSide(side, colEl) {
            if (!colEl) return;
            var existing = colEl.querySelectorAll('[data-smr-slot-v]');
            for (var i = 0; i < existing.length; i++) {
              var el = existing[i];
              var v = parseInt(el.getAttribute('data-smr-slot-v'), 10);
              if (isFinite(v)) nodeMaps[side][v] = el;
            }
          }
          hydrateSide('left', leftCol);
          hydrateSide('right', rightCol);

          function computeGeometry() {
            var w = stageEl && stageEl.clientWidth > 0 ? stageEl.clientWidth : 360;
            var maxMainFit = Math.max(140, w - 12);
            var fitRatio = rawPreviewSize > maxMainFit ? (maxMainFit / rawPreviewSize) : 1;
            var mainD = Math.round(rawPreviewSize * fitRatio);
            var peekD = Math.min(Math.round(rawPeekSize * fitRatio), Math.round(mainD * 0.78));
            var gapPx = Math.round(itemGap * (fitRatio < 0.85 ? 0.85 : 1));
            var padY = 14;
            geom.stageAvailW = w;
            geom.mainD = mainD;
            geom.peekD = peekD;
            geom.gapPx = gapPx;
            geom.padY = padY;
            geom.centerY = padY + peekD + gapPx + mainD / 2;
            geom.stepDist = mainD / 2 + gapPx + peekD / 2;
            geom.stageH = padY + peekD + gapPx + mainD + gapPx + peekD + padY;
            geom.peekScale = mainD > 0 ? (peekD / mainD) : 0.43;
            geom.sideLabelMaxW = Math.max(68, Math.floor(w / 2 - peekD / 2 - 10));

            if (stageEl) stageEl.style.height = geom.stageH + 'px';
            if (diceBtn) diceBtn.style.bottom = Math.max(6, padY + Math.round((peekD - 40) / 2)) + 'px';
          }

          function canStep(vIdx, delta) {
            if (total <= 1) return false;
            if (enableLoop) return true;
            var next = vIdx + delta;
            return next >= 0 && next < total;
          }

          function applySlotStyles(el, pos, k, instant) {
            var absPos = Math.abs(pos);
            var yOffset = absPos <= 1
              ? pos * geom.stepDist
              : (pos < 0 ? -1 : 1) * (geom.stepDist + (absPos - 1) * (geom.peekD * 0.85 + geom.gapPx));
            var scale = absPos <= 1
              ? (1 - absPos * (1 - geom.peekScale))
              : Math.max(0.24, geom.peekScale * (1 - (absPos - 1) * 0.28));
            var opacity = absPos <= 1
              ? (1 - absPos * (1 - peekOpacity))
              : Math.max(0, peekOpacity * (1 - (absPos - 1)));
            var zIndex = Math.max(1, Math.round(40 - absPos * 25));
            var isDominant = absPos < 0.45;

            el.setAttribute('data-smr-slot-k', String(k));
            el.style.top = geom.centerY + 'px';
            el.style.width = geom.mainD + 'px';
            el.style.height = geom.mainD + 'px';
            el.style.zIndex = String(zIndex);
            el.style.opacity = opacity.toFixed(4);
            el.style.transition = instant
              ? 'none'
              : ('transform ' + transitionMs + 'ms cubic-bezier(0.22,1,0.36,1), opacity ' + transitionMs + 'ms cubic-bezier(0.22,1,0.36,1), box-shadow ' + transitionMs + 'ms ease');
            el.style.transform = 'translate3d(-50%, calc(-50% + ' + yOffset.toFixed(2) + 'px), 0) scale(' + scale.toFixed(4) + ')';
            el.style.boxShadow = isDominant
              ? '0 18px 36px -12px rgba(15,23,42,0.28), 0 6px 14px rgba(15,23,42,0.10)'
              : '0 4px 12px rgba(15,23,42,0.08)';
            el.style.pointerEvents = absPos <= 1.25 ? 'auto' : 'none';
            el.style.cursor = (k === -1 || k === 1) ? 'pointer' : '';
          }

          function renderSide(side, instant) {
            var colEl = side === 'left' ? leftCol : rightCol;
            if (!colEl) return;
            var virtualIdx = side === 'left' ? leftVirtual : rightVirtual;
            var prog = dragProgress[side];
            var draggingThis = draggingSide === side;
            var map = nodeMaps[side];
            var offsets = total <= 1 ? [0] : WHEEL_OFFSETS;
            var activeKeys = {};

            for (var i = 0; i < offsets.length; i++) {
              var k = offsets[i];
              var itemVirtual = virtualIdx + k;
              if (!enableLoop && (itemVirtual < 0 || itemVirtual >= total)) continue;
              activeKeys[itemVirtual] = true;
              var flvIdx = enableLoop ? smrWrap(itemVirtual, total) : itemVirtual;
              var flv = flavors[flvIdx];
              if (!flv) continue;

              var el = map[itemVirtual];
              if (!el) {
                el = document.createElement('div');
                el.setAttribute('data-smr-slot-v', String(itemVirtual));
                el.style.position = 'absolute';
                el.style.left = '50%';
                el.style.borderRadius = '9999px';
                el.style.overflow = 'hidden';
                el.style.background = '#F8FAFC';
                el.style.willChange = 'transform, opacity';
                el.innerHTML = smrSlotInnerHtml(flv, accent);
                applySlotStyles(el, k + prog, k, true);
                colEl.appendChild(el);
                map[itemVirtual] = el;
              } else {
                applySlotStyles(el, k + prog, k, Boolean(instant || draggingThis));
              }
            }

            var existingKeys = Object.keys(map);
            for (var j = 0; j < existingKeys.length; j++) {
              var keyStr = existingKeys[j];
              if (!activeKeys[keyStr]) {
                var stale = map[keyStr];
                if (stale && stale.parentNode) stale.parentNode.removeChild(stale);
                delete map[keyStr];
              }
            }
          }

          function syncMetaUi() {
            var safeL = enableLoop ? smrWrap(leftVirtual, total) : Math.max(0, Math.min(total - 1, leftVirtual));
            var safeR = enableLoop ? smrWrap(rightVirtual, total) : Math.max(0, Math.min(total - 1, rightVirtual));
            var lf = flavors[safeL];
            var rf = flavors[safeR];
            var same = lf.id === rf.id;
            var sum = smrParsePrice(lf.price) + smrParsePrice(rf.price);

            if (leftCol) leftCol.setAttribute('aria-label', 'Geser rasa kiri: ' + (lf.name || ''));
            if (rightCol) rightCol.setAttribute('aria-label', 'Geser rasa kanan: ' + (rf.name || ''));

            if (labelsEl) {
              if (same) {
                labelsEl.innerHTML =
                  '<div style="pointer-events:none; position:absolute; left:50%; top:' + (geom.padY + geom.peekD + geom.gapPx / 2) + 'px; transform:translate(-50%, -50%); padding:4px 12px; border-radius:9999px; text-align:center; max-width:84%; border:1px solid rgba(226,232,240,0.75); box-shadow:0 1px 4px rgba(15,23,42,0.06); background:rgba(255,255,255,0.92); backdrop-filter:blur(6px); -webkit-backdrop-filter:blur(6px); box-sizing:border-box;">' +
                    '<div style="font-size:12.5px; font-weight:800; color:#0F172A; line-height:1.2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + smrEsc(lf.name) + '</div>' +
                    '<div style="font-size:10px; font-weight:500; color:#64748B; line-height:1.2; margin-top:2px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">' + smrEsc((lf.subtitle || '').trim() || 'Resep asli') + '</div>' +
                  '</div>';
              } else {
                var lblTop = geom.padY + Math.round(geom.peekD * 0.52);
                labelsEl.innerHTML =
                  '<div style="pointer-events:none; position:absolute; left:2px; top:' + lblTop + 'px; transform:translateY(-50%); max-width:' + geom.sideLabelMaxW + 'px; text-align:left;">' +
                    '<div style="font-size:12.5px; font-weight:700; color:#0F172A; line-height:1.2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-shadow:0 1px 4px rgba(255,255,255,0.9);">' + smrEsc(lf.name) + '</div>' +
                    '<div style="font-size:11px; font-weight:600; color:#64748B; margin-top:2px; font-variant-numeric:tabular-nums; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-shadow:0 1px 4px rgba(255,255,255,0.9);">' + smrEsc(smrFormatRp(smrParsePrice(lf.price))) + '</div>' +
                  '</div>' +
                  '<div style="pointer-events:none; position:absolute; right:2px; top:' + lblTop + 'px; transform:translateY(-50%); max-width:' + geom.sideLabelMaxW + 'px; text-align:right;">' +
                    '<div style="font-size:12.5px; font-weight:700; color:#0F172A; line-height:1.2; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-shadow:0 1px 4px rgba(255,255,255,0.9);">' + smrEsc(rf.name) + '</div>' +
                    '<div style="font-size:11px; font-weight:600; color:#64748B; margin-top:2px; font-variant-numeric:tabular-nums; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; text-shadow:0 1px 4px rgba(255,255,255,0.9);">' + smrEsc(smrFormatRp(smrParsePrice(rf.price))) + '</div>' +
                  '</div>';
              }
            }

            if (priceEl) {
              priceEl.textContent = (cfg.pricePrefix || 'Harga') + ' ' + smrFormatRp(sum);
            }

            var prodLabel = smrBuildProductLabel(cfg.title, effectiveSize);
            if (waLinkEl && cfg.waEnabled) {
              var msg = cfg.waIncludeDetails !== false
                ? [
                    cfg.waIntro || 'Halo, saya ingin memesan:',
                    '',
                    'Produk: ' + prodLabel,
                    '',
                    'Kombinasi Rasa:',
                    '1. ' + (lf.name || 'Rasa Kiri'),
                    '2. ' + (rf.name || 'Rasa Kanan'),
                    '',
                    'Jumlah: 1',
                    'Total: ' + smrFormatRp(sum),
                    '',
                    'Mohon informasi pemesanannya. Terima kasih.'
                  ].join('\\n')
                : (cfg.waIntro || 'Halo, saya ingin memesan:');
              waLinkEl.setAttribute('href', 'https://wa.me/' + encodeURIComponent(cfg.waNumber || '6281234567890') + '?text=' + encodeURIComponent(msg));
            }
            if (adminWaEl) {
              var adminMsg = (cfg.adminCtaWaMessage || 'Halo Admin, saya ingin bertanya tentang produk ini:') + ' ' + prodLabel + ' (' + lf.name + ' + ' + rf.name + ') - ' + smrFormatRp(sum);
              adminWaEl.setAttribute('href', 'https://wa.me/' + encodeURIComponent(cfg.adminCtaWaNumber || cfg.waNumber || '6281234567890') + '?text=' + encodeURIComponent(adminMsg));
            }
          }

          function stepSide(side, delta) {
            if (total <= 1) return;
            if (side === 'left') {
              if (!canStep(leftVirtual, delta)) return;
              leftVirtual += delta;
              renderSide('left', false);
            } else {
              if (!canStep(rightVirtual, delta)) return;
              rightVirtual += delta;
              renderSide('right', false);
            }
            syncMetaUi();
          }

          function bindWheelSide(colEl, side) {
            if (!colEl) return;
            var drag = null;

            colEl.addEventListener('pointerdown', function (e) {
              if ((e.button !== 0 && e.pointerType === 'mouse') || total <= 1) return;
              drag = {
                startX: e.clientX,
                startY: e.clientY,
                axis: null,
                moved: false,
                progress: 0
              };
              draggingSide = side;
              colEl.style.cursor = 'grabbing';
              try { colEl.setPointerCapture(e.pointerId); } catch (err) {}
            });

            colEl.addEventListener('pointermove', function (e) {
              if (!drag) return;
              var dx = e.clientX - drag.startX;
              var dy = e.clientY - drag.startY;
              if (!drag.axis && (Math.abs(dx) > 5 || Math.abs(dy) > 5)) {
                drag.axis = Math.abs(dx) > Math.abs(dy) * 1.15 ? 'x' : 'y';
                drag.moved = true;
              }
              if (!drag.axis) return;
              var rawProg = drag.axis === 'y'
                ? dy / Math.max(80, geom.stepDist)
                : ((dx * (side === 'left' ? 1 : -1)) / Math.max(90, geom.mainD * 0.62));
              drag.progress = Math.max(-1.05, Math.min(1.05, rawProg));
              dragProgress[side] = drag.progress;
              renderSide(side, true);
            });

            function finishDrag(e) {
              if (!drag) return;
              var d = drag;
              drag = null;
              draggingSide = null;
              colEl.style.cursor = total > 1 ? 'grab' : 'default';
              try { colEl.releasePointerCapture(e.pointerId); } catch (err) {}
              dragProgress[side] = 0;

              if (d.moved) suppressClickUntil = Date.now() + 260;

              if (d.moved && Math.abs(d.progress) >= 0.2) {
                stepSide(side, d.progress < 0 ? 1 : -1);
              } else {
                renderSide(side, false);
              }
            }

            colEl.addEventListener('pointerup', finishDrag);
            colEl.addEventListener('pointercancel', finishDrag);

            colEl.addEventListener('click', function (e) {
              if (Date.now() < suppressClickUntil || total <= 1) return;
              var slotEl = e.target && e.target.closest ? e.target.closest('[data-smr-slot-k]') : null;
              if (!slotEl) return;
              var k = parseInt(slotEl.getAttribute('data-smr-slot-k'), 10);
              if (k === -1) stepSide(side, -1);
              else if (k === 1) stepSide(side, 1);
            });

            colEl.addEventListener('wheel', function (e) {
              if (total <= 1) return;
              var primaryDelta = Math.abs(e.deltaY) >= Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
              if (Math.abs(primaryDelta) < 10) return;
              e.preventDefault();
              var now = Date.now();
              if (now - wheelLock[side] < 240) return;
              wheelLock[side] = now;
              stepSide(side, primaryDelta > 0 ? 1 : -1);
            }, { passive: false });
          }

          bindWheelSide(leftCol, 'left');
          bindWheelSide(rightCol, 'right');

          if (diceBtn && total > 1) {
            diceBtn.addEventListener('click', function () {
              var safeL = enableLoop ? smrWrap(leftVirtual, total) : leftVirtual;
              var safeR = enableLoop ? smrWrap(rightVirtual, total) : rightVirtual;
              if (!enableLoop) {
                var nl = Math.floor(Math.random() * total);
                var nr = Math.floor(Math.random() * total);
                if (nl === safeL && nr === safeR) nr = (safeR + 1) % total;
                leftVirtual = nl;
                rightVirtual = nr;
              } else {
                var deltaL = 1 + Math.floor(Math.random() * Math.max(1, total - 1));
                var deltaR = 1 + Math.floor(Math.random() * Math.max(1, total - 1));
                if (smrWrap(leftVirtual + deltaL, total) === safeL && smrWrap(rightVirtual - deltaR, total) === safeR) {
                  deltaR += 1;
                }
                leftVirtual += deltaL;
                rightVirtual -= deltaR;
              }
              diceBtn.style.transform = 'rotate(180deg) scale(1.08)';
              setTimeout(function () { diceBtn.style.transform = 'rotate(0deg) scale(1)'; }, 380);
              renderSide('left', false);
              renderSide('right', false);
              syncMetaUi();
            });
          }

          if (cfg.autoSlide && total > 1) {
            var intervalMs = Math.max(1500, Math.min(10000, Number(cfg.autoSlideMs) || 3200));
            setInterval(function () {
              if (draggingSide) return;
              var turn = autoTurn;
              autoTurn = turn === 'right' ? 'left' : 'right';
              stepSide(turn, 1);
            }, intervalMs);
          }

          if (addCartBtn && cfg.floatingCartEnabled) {
            var defaultCartIconHtml = '<svg data-smr-add-cart-icon viewBox="0 0 24 24" width="' + iconPx + '" height="' + iconPx + '" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>';
            var checkIconHtml = '<svg data-smr-add-cart-icon viewBox="0 0 24 24" width="' + iconPx + '" height="' + iconPx + '" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0;"><path d="M20 6 9 17l-5-5"/></svg>';
            addCartBtn.addEventListener('click', function () {
              var safeL = enableLoop ? smrWrap(leftVirtual, total) : Math.max(0, Math.min(total - 1, leftVirtual));
              var safeR = enableLoop ? smrWrap(rightVirtual, total) : Math.max(0, Math.min(total - 1, rightVirtual));
              var lf = flavors[safeL];
              var rf = flavors[safeR];
              var sum = smrParsePrice(lf.price) + smrParsePrice(rf.price);
              var prodLabel = smrBuildProductLabel(cfg.title, effectiveSize);
              var sizePart = effectiveSize.trim();
              var variantText = sizePart
                ? ('1. ' + lf.name + ', 2. ' + rf.name + ' · 2 Bagian · ' + sizePart)
                : ('1. ' + lf.name + ', 2. ' + rf.name + ' · 2 Bagian');
              var dynamicItem = {
                id: 'smr_2_' + lf.id + '_' + rf.id,
                title: prodLabel,
                price: smrFormatRp(sum),
                image: lf.image || rf.image || '',
                productType: 'physical'
              };
              if (typeof window.__lynkAddCartItem === 'function') {
                window.__lynkAddCartItem(cfg.blockId, dynamicItem, variantText, 1);
              }
              addCartBtn.style.background = '#059669';
              addCartBtn.style.boxShadow = '0 8px 18px -6px #05966988';
              var curIcon = addCartBtn.querySelector('[data-smr-add-cart-icon]');
              if (curIcon) curIcon.outerHTML = checkIconHtml;
              if (addCartLabelEl) addCartLabelEl.textContent = 'Masuk Keranjang!';
              if (addedTimer) clearTimeout(addedTimer);
              addedTimer = setTimeout(function () {
                var bg = cfg.cartButtonBg || accent;
                addCartBtn.style.background = bg;
                addCartBtn.style.boxShadow = '0 8px 18px -6px ' + bg + '88';
                var nextIcon = addCartBtn.querySelector('[data-smr-add-cart-icon]');
                if (nextIcon) nextIcon.outerHTML = defaultCartIconHtml;
                if (addCartLabelEl) addCartLabelEl.textContent = cfg.cartButtonLabel || 'Gabungkan Rasa';
              }, 1400);
            });
          }

          if (backBtn) {
            backBtn.addEventListener('click', function () {
              var actionType = cfg.backActionType || 'back';
              if (actionType === 'page' && cfg.backTargetPageId && typeof window.__lynkOpenPage === 'function') {
                window.__lynkOpenPage(cfg.backTargetPageId);
              } else if (actionType === 'url' && cfg.backUrl) {
                window.location.href = cfg.backUrl;
              } else if (typeof window.__lynkBackPage === 'function') {
                window.__lynkBackPage();
              } else if (window.history && window.history.length > 1) {
                window.history.back();
              }
            });
          }

          function handleResize() {
            computeGeometry();
            renderSide('left', true);
            renderSide('right', true);
            syncMetaUi();
          }

          handleResize();
          if (typeof ResizeObserver !== 'undefined' && stageEl) {
            var ro = new ResizeObserver(handleResize);
            ro.observe(stageEl);
          } else {
            window.addEventListener('resize', handleResize);
          }
        });
      })();

      // --- PREVENT ACCIDENTAL PINCH / DOUBLE-TAP / WHEEL ZOOM ON PUBLISHED BUSINESS SITE ---
      (function initAntiZoomGuard() {
        var lastTapAt = 0;
        document.addEventListener('gesturestart', function (e) { e.preventDefault(); }, { passive: false });
        document.addEventListener('gesturechange', function (e) { e.preventDefault(); }, { passive: false });
        document.addEventListener('gestureend', function (e) { e.preventDefault(); }, { passive: false });
        document.addEventListener('touchstart', function (e) {
          if (e.touches && e.touches.length > 1) e.preventDefault();
        }, { passive: false });
        document.addEventListener('touchmove', function (e) {
          if (e.touches && e.touches.length > 1) e.preventDefault();
        }, { passive: false });
        document.addEventListener('touchend', function (e) {
          var t = e.target;
          if (t && t.closest && t.closest('input, textarea, select')) return;
          var now = Date.now();
          if (now - lastTapAt <= 280 && e.touches && e.touches.length === 0) {
            e.preventDefault();
          }
          lastTapAt = now;
        }, { passive: false });
        window.addEventListener('wheel', function (e) {
          if (e.ctrlKey || e.metaKey) e.preventDefault();
        }, { passive: false });
        window.addEventListener('keydown', function (e) {
          if ((e.ctrlKey || e.metaKey) && (e.key === '+' || e.key === '-' || e.key === '=' || e.key === '0')) {
            e.preventDefault();
          }
        });
      })();
    })();
  </script>
</body>
</html>`;
}
