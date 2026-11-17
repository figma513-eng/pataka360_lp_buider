const DANGEROUS_SCHEME_RE = /^(javascript|vbscript|data):/i;
const ALLOWED_SCHEME_RE = /^(https?:|mailto:|tel:|sms:|whatsapp:|\/|#)/i;

/**
 * Normalizes and validates user-provided link URLs:
 * - Blocks javascript:, vbscript:, data: schemes
 * - Auto-prepends https:// for bare domains like "shopee.co.id/toko"
 */
export function sanitizeExternalUrl(raw?: string | null, fallback = '#'): string {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return fallback;

  // Strip control/whitespace characters before scheme inspection
  const compact = trimmed.replace(/[\u0000-\u001F\u007F\s]+/g, '');
  if (DANGEROUS_SCHEME_RE.test(compact)) {
    return fallback;
  }

  if (ALLOWED_SCHEME_RE.test(trimmed)) {
    return trimmed;
  }

  if (trimmed.startsWith('//')) {
    return `https:${trimmed}`;
  }

  // Bare domain (e.g. "wa.me/628123", "tokopedia.com/toko")
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed) && trimmed.includes('.')) {
    return `https://${trimmed}`;
  }

  return fallback;
}
