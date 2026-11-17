export type VideoEmbedPlatform = 'youtube' | 'facebook' | 'tiktok' | 'instagram';

export function isDirectVideoUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const pathname = parsed.pathname.toLowerCase();
    return /\.(mp4|webm|ogg|mov|m4v)$/.test(pathname);
  } catch {
    return false;
  }
}

export function extractYouTubeId(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
  ];
  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match?.[1]) return match[1];
  }
  return null;
}

export function extractTikTokId(url?: string): string | null {
  if (!url) return null;
  const trimmed = url.trim();
  const patterns = [
    /tiktok\.com\/@[^/]+\/(?:video|photo)\/(\d{10,25})/,
    /tiktok\.com\/v\/(\d{10,25})/,
    /tiktok\.com\/embed\/v2\/(\d{10,25})/,
    /tiktok\.com\/player\/v1\/(\d{10,25})/,
    /\/(?:video|photo)\/(\d{10,25})/,
  ];
  for (const regex of patterns) {
    const match = trimmed.match(regex);
    if (match?.[1]) return match[1];
  }
  if (/^\d{10,25}$/.test(trimmed)) return trimmed;
  return null;
}

export function isValidTikTokUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (extractTikTokId(trimmed)) return true;
  if (isDirectVideoUrl(trimmed)) return true;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'tiktok.com' ||
      host.endsWith('.tiktok.com') ||
      host === 'tiktokv.com' ||
      host.endsWith('.tiktokv.com')
    );
  } catch {
    return false;
  }
}

export function isValidFacebookVideoUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (isDirectVideoUrl(trimmed)) return true;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.toLowerCase();
    return (
      host === 'facebook.com' ||
      host.endsWith('.facebook.com') ||
      host === 'fb.watch' ||
      host === 'fb.com' ||
      host.endsWith('.fb.com')
    );
  } catch {
    return false;
  }
}

export function normalizeFacebookVideoUrl(url: string): string {
  const trimmed = url.trim();
  return trimmed.startsWith('http') ? trimmed : `https://${trimmed}`;
}

export function extractInstagramInfo(
  url?: string
): { kind: 'p' | 'reel' | 'tv'; code: string } | null {
  if (!url) return null;
  const trimmed = url.trim();
  const match = trimmed.match(
    /(?:instagram\.com|instagr\.am)\/(?:share\/)?(?:[^/]+\/)?(reel|reels|p|tv)\/([A-Za-z0-9_-]{5,})/i
  );
  if (!match?.[1] || !match?.[2]) return null;
  const rawKind = match[1].toLowerCase();
  const kind: 'p' | 'reel' | 'tv' = rawKind === 'reels' ? 'reel' : (rawKind as 'p' | 'reel' | 'tv');
  return { kind, code: match[2] };
}

export function isValidInstagramVideoUrl(url?: string): boolean {
  if (!url) return false;
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (extractInstagramInfo(trimmed)) return true;
  if (isDirectVideoUrl(trimmed)) return true;
  try {
    const parsed = new URL(trimmed.startsWith('http') ? trimmed : `https://${trimmed}`);
    const host = parsed.hostname.toLowerCase();
    const isIgHost =
      host === 'instagram.com' ||
      host.endsWith('.instagram.com') ||
      host === 'instagr.am' ||
      host.endsWith('.instagr.am');
    return isIgHost && /\/share\//i.test(parsed.pathname);
  } catch {
    return false;
  }
}
