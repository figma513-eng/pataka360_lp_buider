import type {
  AdChannel,
  BuilderBlock,
  BuilderProject,
  ProjectAdsConfig,
  ProjectPublishingConfig,
} from '../types/builder.ts';
import { normalizeWhatsappNumber } from './cartHelpers.ts';

export function sanitizeSlug(raw: string, fallback = 'unit-usaha'): string {
  const cleaned = raw
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '');
  return cleaned || fallback;
}

export function normalizeCustomDomain(raw: string): string {
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed) return '';
  const withoutProtocol = trimmed.replace(/^https?:\/\//, '');
  const hostOnly = withoutProtocol.split('/')[0]?.split('?')[0]?.split('#')[0] ?? '';
  return hostOnly.replace(/:\d+$/, '').replace(/^\.+|\.+$/g, '');
}

export function isValidCustomDomain(domain: string): boolean {
  if (!domain) return true;
  return /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)+$/.test(
    domain
  );
}

export const DEFAULT_ADS_CONFIG: ProjectAdsConfig = {
  metaPixelId: '',
  metaTestEventCode: '',
  metaWaEvent: 'Lead',
  metaCapiForwarding: true,
  tiktokPixelId: '',
  googleTagId: '',
  googleAdsConversionLabel: '',
  gtmContainerId: '',
  waAddonEnabled: false,
  waAddonNumber: '6281234567890',
  waAddonGreeting: 'Halo Admin, saya lihat promo dari iklan dan ingin konsultasi / order.',
  appendAdAttributionToWa: true,
};

export function createDefaultPublishingConfig(title: string): ProjectPublishingConfig {
  return {
    slug: sanitizeSlug(title, 'halaman-usaha'),
    customDomain: '',
    useCustomDomain: false,
    isPublished: false,
    seoTitle: '',
    seoDescription: '',
    seoImage: '',
    seoImageAlt: '',
    seoSiteName: '',
    seoShareText: '',
  };
}

function isShareableImageCandidate(raw?: string): string | null {
  if (!raw || typeof raw !== 'string') return null;
  const trimmed = raw.trim();
  if (!trimmed) return null;
  // Social scrapers (WhatsApp, FB, Telegram, X) cannot read inline base64 data URIs
  if (/^data:/i.test(trimmed)) return null;
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('/api/media/') ||
    trimmed.startsWith('/assets/')
  ) {
    return trimmed;
  }
  return null;
}

export function findFallbackShareImageFromBlocks(blocks: BuilderBlock[]): string {
  for (const blk of blocks) {
    const c = blk.content;
    if (blk.type === 'hero_profile') {
      const cover = isShareableImageCandidate(c.heroCoverImage);
      if (cover) return cover;
      const logo = isShareableImageCandidate(c.heroLogoImage);
      if (logo) return logo;
    }
    if (blk.type === 'image') {
      const src = isShareableImageCandidate(c.src);
      if (src) return src;
    }
    if (blk.type === 'carousel' && Array.isArray(c.carouselItems)) {
      for (const item of c.carouselItems) {
        const img = isShareableImageCandidate(item?.image);
        if (img) return img;
      }
    }
    if (blk.type === 'catalog' && Array.isArray(c.catalogItems)) {
      for (const item of c.catalogItems) {
        const img = isShareableImageCandidate(item?.image);
        if (img) return img;
      }
    }
    if (blk.type === 'fnb_catalog' && Array.isArray(c.fnbItems)) {
      for (const item of c.fnbItems) {
        const img = isShareableImageCandidate(item?.image);
        if (img) return img;
      }
    }
    if (blk.type === 'menu_icon') {
      const img = isShareableImageCandidate(c.menuIconImage);
      if (img) return img;
    }
    if (blk.children?.length) {
      const nested = findFallbackShareImageFromBlocks(blk.children);
      if (nested) return nested;
    }
  }
  return '';
}

export function findDefaultWaPhoneFromBlocks(blocks: BuilderBlock[]): string {
  for (const blk of blocks) {
    if (blk.type === 'catalog' && blk.content.catalogWhatsappNumber?.trim()) {
      return normalizeWhatsappNumber(blk.content.catalogWhatsappNumber);
    }
    if (blk.type === 'button' && blk.content.url) {
      const m = blk.content.url.match(/wa\.me\/(\d+)|phone=(\d+)/i);
      if (m) return normalizeWhatsappNumber(m[1] || m[2]);
    }
    if (blk.children?.length) {
      const nested = findDefaultWaPhoneFromBlocks(blk.children);
      if (nested) return nested;
    }
  }
  return '6281234567890';
}

export function resolveProjectPublishing(project: BuilderProject): ProjectPublishingConfig {
  const base = createDefaultPublishingConfig(project.title);
  const pub = project.publishing;
  if (!pub) return base;
  return {
    ...base,
    ...pub,
    slug: sanitizeSlug(pub.slug || project.title, base.slug),
    customDomain: normalizeCustomDomain(pub.customDomain || ''),
  };
}

export function resolveProjectAds(project: BuilderProject): ProjectAdsConfig {
  const detectedWa = findDefaultWaPhoneFromBlocks(project.blocks);
  const ads = project.adsConfig;
  if (!ads) {
    return {
      ...DEFAULT_ADS_CONFIG,
      waAddonNumber: detectedWa,
    };
  }
  return {
    ...DEFAULT_ADS_CONFIG,
    ...ads,
    waAddonNumber: ads.waAddonNumber?.trim() || detectedWa,
  };
}

export function buildLiveUrls(
  publishing: ProjectPublishingConfig,
  origin: string
): {
  internalPath: string;
  internalUrl: string;
  internalFullPath: string;
  internalFullUrl: string;
  customUrl: string | null;
  customFullUrl: string | null;
  customSlugUrl: string | null;
  customSlugFullUrl: string | null;
  primaryUrl: string;
  primaryFullUrl: string;
} {
  const slug = sanitizeSlug(publishing.slug, 'unit-usaha');
  const cleanOrigin = origin.replace(/\/+$/, '');
  const internalPath = `/p/${slug}`;
  const internalUrl = `${cleanOrigin}${internalPath}`;
  const internalFullPath = `${internalPath}/full`;
  const internalFullUrl = `${cleanOrigin}${internalFullPath}`;
  const domain = normalizeCustomDomain(publishing.customDomain);
  const customUrl = domain ? `https://${domain}` : null;
  const customFullUrl = domain ? `https://${domain}/full` : null;
  const customSlugUrl = domain ? `https://${domain}/${slug}` : null;
  const customSlugFullUrl = domain ? `https://${domain}/${slug}/full` : null;
  const primaryUrl = publishing.useCustomDomain && customUrl ? customUrl : internalUrl;
  const primaryFullUrl =
    publishing.useCustomDomain && customFullUrl ? customFullUrl : internalFullUrl;
  return {
    internalPath,
    internalUrl,
    internalFullPath,
    internalFullUrl,
    customUrl,
    customFullUrl,
    customSlugUrl,
    customSlugFullUrl,
    primaryUrl,
    primaryFullUrl,
  };
}

export function buildAdCampaignUrl(
  baseUrl: string,
  channel: Exclude<AdChannel, 'organic'>,
  campaignName: string,
  contentTag?: string
): string {
  const cleanCamp = sanitizeSlug(campaignName || 'promo-utama', 'promo-utama');
  const cleanContent = contentTag?.trim() ? sanitizeSlug(contentTag, '') : '';
  const params = new URLSearchParams();
  if (channel === 'meta') {
    params.set('utm_source', 'meta');
    params.set('utm_medium', 'paid_social');
  } else if (channel === 'meta_wa_addon') {
    params.set('utm_source', 'meta');
    params.set('utm_medium', 'ctwa_addon');
  } else if (channel === 'tiktok') {
    params.set('utm_source', 'tiktok');
    params.set('utm_medium', 'paid_social');
  } else if (channel === 'google') {
    params.set('utm_source', 'google');
    params.set('utm_medium', 'cpc');
  }
  params.set('utm_campaign', cleanCamp);
  if (cleanContent) params.set('utm_content', cleanContent);
  const sep = baseUrl.includes('?') ? '&' : '?';
  return `${baseUrl}${sep}${params.toString()}`;
}

export function isWhatsappHref(url?: string): boolean {
  if (!url) return false;
  const lower = url.trim().toLowerCase();
  return (
    lower.includes('wa.me/') ||
    lower.includes('api.whatsapp.com') ||
    lower.includes('chat.whatsapp.com') ||
    lower.startsWith('whatsapp://')
  );
}

export function extractWhatsappPhoneFromUrl(url?: string): string | undefined {
  if (!url) return undefined;
  const m = url.match(/wa\.me\/(\d{7,16})|[?&]phone=(\d{7,16})/i);
  return m?.[1] || m?.[2] || undefined;
}

export const AD_CHANNEL_META: Record<
  AdChannel,
  { label: string; shortLabel: string; color: string; bgClass: string; textClass: string }
> = {
  meta: {
    label: 'Meta Ads (FB / IG)',
    shortLabel: 'Meta Ads',
    color: '#1877F2',
    bgClass: 'bg-blue-50 border-blue-200',
    textClass: 'text-blue-700',
  },
  meta_wa_addon: {
    label: 'Meta Add-On WA (CTWA)',
    shortLabel: 'Meta WA Add-On',
    color: '#059669',
    bgClass: 'bg-emerald-50 border-emerald-200',
    textClass: 'text-emerald-700',
  },
  tiktok: {
    label: 'TikTok Ads',
    shortLabel: 'TikTok Ads',
    color: '#0F172A',
    bgClass: 'bg-slate-100 border-slate-300',
    textClass: 'text-slate-800',
  },
  google: {
    label: 'Google Ads',
    shortLabel: 'Google Ads',
    color: '#D97706',
    bgClass: 'bg-amber-50 border-amber-200',
    textClass: 'text-amber-800',
  },
  organic: {
    label: 'Organik / Langsung',
    shortLabel: 'Organik',
    color: '#64748B',
    bgClass: 'bg-slate-50 border-slate-200',
    textClass: 'text-slate-600',
  },
};
