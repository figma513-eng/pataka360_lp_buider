import dns from 'node:dns/promises';
import net from 'node:net';

export class SsrfBlockedError extends Error {
  public readonly code = 'SSRF_BLOCKED';

  constructor(message: string) {
    super(message);
    this.name = 'SsrfBlockedError';
  }
}

export type LookupFn = (hostname: string) => Promise<Array<{ address: string; family: number }>>;

const defaultLookup: LookupFn = async (hostname: string) => {
  const results = await dns.lookup(hostname, { all: true, verbatim: true });
  return results.map((r) => ({ address: r.address, family: r.family }));
};

function stripBrackets(hostname: string): string {
  const trimmed = hostname.trim();
  if (trimmed.startsWith('[') && trimmed.endsWith(']')) {
    return trimmed.slice(1, -1);
  }
  return trimmed;
}

export function isBlockedIpv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((n) => !Number.isInteger(n) || n < 0 || n > 255)) {
    return true;
  }
  const [a, b, c] = parts;

  // 0.0.0.0/8 (This network)
  if (a === 0) return true;
  // 10.0.0.0/8 (Private RFC1918)
  if (a === 10) return true;
  // 100.64.0.0/10 (Carrier-grade NAT / Alibaba cloud metadata 100.100.100.200)
  if (a === 100 && b >= 64 && b <= 127) return true;
  // 127.0.0.0/8 (Loopback)
  if (a === 127) return true;
  // 169.254.0.0/16 (Link-local & Cloud Metadata 169.254.169.254)
  if (a === 169 && b === 254) return true;
  // 172.16.0.0/12 (Private RFC1918)
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.0.0.0/24 (IETF protocol assignments)
  if (a === 192 && b === 0 && c === 0) return true;
  // 192.0.2.0/24 (TEST-NET-1)
  if (a === 192 && b === 0 && c === 2) return true;
  // 192.168.0.0/16 (Private RFC1918)
  if (a === 192 && b === 168) return true;
  // 198.18.0.0/15 (Benchmarking)
  if (a === 198 && (b === 18 || b === 19)) return true;
  // 198.51.100.0/24 (TEST-NET-2)
  if (a === 198 && b === 51 && c === 100) return true;
  // 203.0.113.0/24 (TEST-NET-3)
  if (a === 203 && b === 0 && c === 113) return true;
  // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved / Broadcast)
  if (a >= 224) return true;

  return false;
}

function expandIpv6ToHextets(rawIp: string): number[] | null {
  // Remove zone index if present (e.g. fe80::1%eth0)
  const ip = rawIp.split('%')[0].toLowerCase();
  if (!ip) return null;

  // Handle embedded IPv4 dotted suffix like ::ffff:127.0.0.1
  let normalized = ip;
  const lastColon = ip.lastIndexOf(':');
  if (lastColon >= 0 && ip.slice(lastColon + 1).includes('.')) {
    const v4Part = ip.slice(lastColon + 1);
    const v4Octets = v4Part.split('.').map(Number);
    if (
      v4Octets.length !== 4 ||
      v4Octets.some((n) => !Number.isInteger(n) || n < 0 || n > 255)
    ) {
      return null;
    }
    const high = ((v4Octets[0] << 8) | v4Octets[1]).toString(16);
    const low = ((v4Octets[2] << 8) | v4Octets[3]).toString(16);
    normalized = `${ip.slice(0, lastColon)}:${high}:${low}`;
  }

  const dblIdx = normalized.indexOf('::');
  if (dblIdx !== -1) {
    if (normalized.indexOf('::', dblIdx + 2) !== -1) return null;
    const left = normalized.slice(0, dblIdx).split(':').filter(Boolean);
    const right = normalized.slice(dblIdx + 2).split(':').filter(Boolean);
    const missing = 8 - (left.length + right.length);
    if (missing < 1) return null;
    const full = [...left, ...Array(missing).fill('0'), ...right];
    if (full.length !== 8) return null;
    return full.map((h) => parseInt(h, 16));
  }

  const parts = normalized.split(':');
  if (parts.length !== 8) return null;
  return parts.map((h) => parseInt(h, 16));
}

export function isBlockedIp(rawIp: string): boolean {
  const clean = stripBrackets(rawIp).split('%')[0].trim();
  const family = net.isIP(clean);
  if (family === 4) {
    return isBlockedIpv4(clean);
  }
  if (family === 6) {
    const hextets = expandIpv6ToHextets(clean);
    if (!hextets || hextets.some((h) => !Number.isInteger(h) || h < 0 || h > 0xffff)) {
      return true;
    }
    const allZeroExceptLast = hextets.slice(0, 7).every((h) => h === 0);
    // ::/128 unspecified or ::1/128 loopback
    if (allZeroExceptLast && (hextets[7] === 0 || hextets[7] === 1)) {
      return true;
    }
    // ::ffff:0:0/96 IPv4-mapped IPv6 or ::/96 deprecated IPv4-compatible
    const isMappedV4 =
      hextets[0] === 0 &&
      hextets[1] === 0 &&
      hextets[2] === 0 &&
      hextets[3] === 0 &&
      hextets[4] === 0 &&
      (hextets[5] === 0xffff || hextets[5] === 0);
    if (isMappedV4) {
      const v4 = `${(hextets[6] >> 8) & 0xff}.${hextets[6] & 0xff}.${(hextets[7] >> 8) & 0xff}.${hextets[7] & 0xff}`;
      return isBlockedIpv4(v4);
    }
    // 64:ff9b::/96 & 64:ff9b:1::/48 NAT64
    if (hextets[0] === 0x0064 && hextets[1] === 0xff9b) {
      const v4 = `${(hextets[6] >> 8) & 0xff}.${hextets[6] & 0xff}.${(hextets[7] >> 8) & 0xff}.${hextets[7] & 0xff}`;
      return isBlockedIpv4(v4);
    }
    // fc00::/7 Unique local address (includes fd00:ec2::254 AWS EC2 metadata)
    if ((hextets[0] & 0xfe00) === 0xfc00) return true;
    // fe80::/10 Link-local
    if ((hextets[0] & 0xffc0) === 0xfe80) return true;
    // ff00::/8 Multicast
    if ((hextets[0] & 0xff00) === 0xff00) return true;
    // 2001:db8::/32 documentation
    if (hextets[0] === 0x2001 && hextets[1] === 0x0db8) return true;
    return false;
  }
  return true;
}

export function isBlockedHostnameString(hostname: string): boolean {
  const host = stripBrackets(hostname).toLowerCase().replace(/\.+$/, '');
  if (!host) return true;
  if (
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal') ||
    host === 'metadata.google.internal' ||
    host === 'metadata.goog' ||
    host === 'instance-data'
  ) {
    return true;
  }
  if (net.isIP(host)) {
    return isBlockedIp(host);
  }
  // Block single-label internal hostnames and numeric/hex/octal obfuscated hosts like 0x7f000001 or 2130706433
  if (/^\d+$/.test(host) || /^0x[0-9a-f]+$/i.test(host) || !host.includes('.')) {
    return true;
  }
  return false;
}

export async function assertSafeExternalUrl(
  rawUrl: string,
  options?: { lookupFn?: LookupFn; allowedPorts?: number[] }
): Promise<URL> {
  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new SsrfBlockedError('Format URL eksternal tidak valid.');
  }

  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    throw new SsrfBlockedError('Protokol URL eksternal harus HTTP atau HTTPS.');
  }

  if (parsed.username || parsed.password) {
    throw new SsrfBlockedError('URL eksternal tidak boleh mengandung kredensial userinfo.');
  }

  const allowedPorts = options?.allowedPorts ?? [80, 443];
  const explicitPort = parsed.port ? Number(parsed.port) : null;
  if (explicitPort !== null && !allowedPorts.includes(explicitPort)) {
    throw new SsrfBlockedError('Port URL eksternal tidak diizinkan oleh kebijakan keamanan.');
  }

  const cleanHost = stripBrackets(parsed.hostname);
  if (isBlockedHostnameString(cleanHost)) {
    throw new SsrfBlockedError('Host tujuan diblokir oleh kebijakan SSRF.');
  }

  const lookupFn = options?.lookupFn ?? defaultLookup;
  let records: Array<{ address: string; family: number }>;
  try {
    records = await lookupFn(cleanHost);
  } catch {
    throw new SsrfBlockedError('Domain tujuan tidak dapat di-resolve oleh DNS.');
  }

  if (!records || records.length === 0) {
    throw new SsrfBlockedError('DNS tidak mengembalikan alamat IP yang valid.');
  }

  for (const rec of records) {
    if (isBlockedIp(rec.address)) {
      throw new SsrfBlockedError('Alamat IP hasil resolusi DNS termasuk jaringan internal/terlarang.');
    }
  }

  return parsed;
}

export interface SafeFetchOptions extends RequestInit {
  timeoutMs?: number;
  maxRedirects?: number;
  maxBytes?: number;
  lookupFn?: LookupFn;
  allowedPorts?: number[];
  fetchImpl?: typeof fetch;
}

export interface SafeFetchResult {
  response: Response;
  finalUrl: string;
  bodyText?: string;
}

export async function safeFetch(
  initialUrl: string,
  options: SafeFetchOptions = {}
): Promise<{ response: Response; finalUrl: string }> {
  const {
    timeoutMs = 7000,
    maxRedirects = 5,
    lookupFn,
    allowedPorts,
    fetchImpl = fetch,
    ...init
  } = options;

  let currentUrl = initialUrl;

  for (let hop = 0; hop <= maxRedirects; hop += 1) {
    const safeUrl = await assertSafeExternalUrl(currentUrl, { lookupFn, allowedPorts });

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    let resp: Response;
    try {
      resp = await fetchImpl(safeUrl.toString(), {
        ...init,
        redirect: 'manual',
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    if (resp.status >= 300 && resp.status < 400) {
      const location = resp.headers.get('location');
      if (!location) {
        return { response: resp, finalUrl: safeUrl.toString() };
      }
      if (hop >= maxRedirects) {
        throw new SsrfBlockedError('Terlalu banyak redirect pada URL tujuan.');
      }
      currentUrl = new URL(location, safeUrl).toString();
      continue;
    }

    return { response: resp, finalUrl: safeUrl.toString() };
  }

  throw new SsrfBlockedError('Redirect melebihi batas maksimal.');
}

export async function readResponseTextWithCap(
  resp: Response,
  maxBytes = 2 * 1024 * 1024
): Promise<string> {
  const clHeader = resp.headers.get('content-length');
  if (clHeader) {
    const len = Number(clHeader);
    if (Number.isFinite(len) && len > maxBytes) {
      throw new SsrfBlockedError('Ukuran respons eksternal melebihi batas maksimal.');
    }
  }

  if (!resp.body) {
    const text = await resp.text();
    if (Buffer.byteLength(text, 'utf8') > maxBytes) {
      throw new SsrfBlockedError('Ukuran respons eksternal melebihi batas maksimal.');
    }
    return text;
  }

  const reader = resp.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) {
      total += value.byteLength;
      if (total > maxBytes) {
        await reader.cancel().catch(() => {});
        throw new SsrfBlockedError('Ukuran respons eksternal melebihi batas maksimal.');
      }
      chunks.push(value);
    }
  }

  return Buffer.concat(chunks.map((c) => Buffer.from(c))).toString('utf8');
}
