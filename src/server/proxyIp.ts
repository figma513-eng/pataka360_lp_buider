import net from 'node:net';
import type { Request } from 'express';

export function normalizeIpCandidate(raw?: string | null): string | null {
  if (!raw) return null;
  let val = String(raw).trim();
  if (!val) return null;

  // Strip surrounding quotes if present (e.g., Forwarded: for="[2001:db8::1]")
  if (
    (val.startsWith('"') && val.endsWith('"')) ||
    (val.startsWith("'") && val.endsWith("'"))
  ) {
    val = val.slice(1, -1).trim();
  }

  // Handle IPv6 bracketed notation [::1]:port or [::1]
  if (val.startsWith('[')) {
    const closeBracket = val.indexOf(']');
    if (closeBracket > 1) {
      val = val.slice(1, closeBracket);
    }
  } else {
    // Strip IPv4 :port (single colon, e.g., 203.0.113.5:54321)
    const firstColon = val.indexOf(':');
    const lastColon = val.lastIndexOf(':');
    if (firstColon > 0 && firstColon === lastColon) {
      const possibleIp = val.slice(0, firstColon);
      if (net.isIP(possibleIp) === 4) {
        val = possibleIp;
      }
    }
  }

  // Strip IPv6 zone ID if present (e.g., fe80::1%eth0)
  const pctIdx = val.indexOf('%');
  if (pctIdx > 0) {
    val = val.slice(0, pctIdx);
  }

  // Normalize IPv4-mapped IPv6 addresses (e.g., ::ffff:203.0.113.5 -> 203.0.113.5)
  if (val.toLowerCase().startsWith('::ffff:')) {
    const mapped = val.slice(7);
    if (net.isIP(mapped) === 4) {
      val = mapped;
    }
  }

  return net.isIP(val) !== 0 ? val : null;
}

function ipv4ToUint32(ip: string): number | null {
  if (net.isIP(ip) !== 4) return null;
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return null;
  }
  return (((parts[0] << 24) >>> 0) | (parts[1] << 16) | (parts[2] << 8) | parts[3]) >>> 0;
}

/**
 * Returns true if the IP belongs to loopback, link-local (including GCP/Cloud Run proxy 169.254.169.126),
 * RFC1918 private networks, CGNAT, or IPv6 ULA/link-local ranges.
 */
export function isInternalProxyIp(ip: string): boolean {
  const clean = normalizeIpCandidate(ip);
  if (!clean) return true;

  const v4 = ipv4ToUint32(clean);
  if (v4 !== null) {
    const first = (v4 >>> 24) & 0xff;
    const second = (v4 >>> 16) & 0xff;
    if (first === 127) return true; // 127.0.0.0/8 loopback
    if (first === 10) return true; // 10.0.0.0/8 private
    if (first === 169 && second === 254) return true; // 169.254.0.0/16 link-local / GCP proxy
    if (first === 172 && second >= 16 && second <= 31) return true; // 172.16.0.0/12 private
    if (first === 192 && second === 168) return true; // 192.168.0.0/16 private
    if (first === 100 && second >= 64 && second <= 127) return true; // 100.64.0.0/10 CGNAT
    if (first === 0) return true; // 0.0.0.0/8 unspecified
    return false;
  }

  const lower = clean.toLowerCase();
  if (lower === '::1' || lower === '::') return true;
  if (lower.startsWith('fe80:') || lower.startsWith('fc') || lower.startsWith('fd')) {
    return true;
  }
  return false;
}

function parseForwardedHeaderIps(headerVal?: string | string[]): string[] {
  const raw = Array.isArray(headerVal) ? headerVal.join(',') : String(headerVal || '');
  if (!raw.trim()) return [];
  const results: string[] = [];
  for (const segment of raw.split(',')) {
    for (const part of segment.split(';')) {
      const eq = part.indexOf('=');
      if (eq === -1) continue;
      const key = part.slice(0, eq).trim().toLowerCase();
      if (key === 'for') {
        const ip = normalizeIpCandidate(part.slice(eq + 1));
        if (ip) results.push(ip);
      }
    }
  }
  return results;
}

function parseHeaderIpList(headerVal?: string | string[]): string[] {
  const raw = Array.isArray(headerVal) ? headerVal.join(',') : String(headerVal || '');
  if (!raw.trim()) return [];
  const ips: string[] = [];
  for (const part of raw.split(',')) {
    const ip = normalizeIpCandidate(part);
    if (ip) ips.push(ip);
  }
  return ips;
}

/**
 * Resolves the real visitor IP cleanly behind Cloud Run / GFE / Cloudflare / AI Studio proxies.
 * When `trustedProxy` is false, ignores X-Forwarded-* headers to prevent IP spoofing.
 */
export function resolveClientIp(
  req: Pick<Request, 'headers' | 'ip' | 'socket'>,
  options?: { trustedProxy?: boolean }
): string {
  const socketIp = normalizeIpCandidate(req.socket?.remoteAddress);
  const expressIp = normalizeIpCandidate(req.ip);
  const trusted = Boolean(options?.trustedProxy);

  if (!trusted) {
    return socketIp || expressIp || 'unknown';
  }

  // 1. Prefer dedicated single-IP CDN / edge proxy headers if present and external
  const edgeHeaders = ['cf-connecting-ip', 'true-client-ip', 'x-client-ip', 'x-real-ip'] as const;
  for (const headerName of edgeHeaders) {
    const candidates = parseHeaderIpList(req.headers[headerName]);
    for (const candidate of candidates) {
      if (!isInternalProxyIp(candidate)) {
        return candidate;
      }
    }
  }

  // 2. Walk X-Forwarded-For from RIGHT to LEFT to pick the closest external client IP
  //    (prevents spoofed left-most IPs while skipping internal proxy hops like 169.254.169.126)
  const xffIps = parseHeaderIpList(req.headers['x-forwarded-for']);
  for (let i = xffIps.length - 1; i >= 0; i -= 1) {
    if (!isInternalProxyIp(xffIps[i])) {
      return xffIps[i];
    }
  }

  // 3. Parse RFC 7239 Forwarded header right-to-left
  const fwdIps = parseForwardedHeaderIps(req.headers.forwarded);
  for (let i = fwdIps.length - 1; i >= 0; i -= 1) {
    if (!isInternalProxyIp(fwdIps[i])) {
      return fwdIps[i];
    }
  }

  // 4. Fallback to first available XFF / expressIp / socketIp
  if (xffIps.length > 0) return xffIps[0];
  if (expressIp) return expressIp;
  if (socketIp) return socketIp;
  return 'unknown';
}
