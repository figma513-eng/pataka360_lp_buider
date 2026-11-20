import crypto from 'node:crypto';

export interface CachedPublicPage {
  key: string;
  projectId: string;
  slug: string;
  revision: number;
  html: string;
  etag: string;
  cachedAt: number;
}

export interface CachePublicPageInput {
  projectId: string;
  slug: string;
  revision: number;
  html: string;
}

function buildPageEtag(projectId: string, revision: number, html: string): string {
  const digest = crypto.createHash('sha1').update(html).digest('hex').slice(0, 12);
  return `"p-${projectId.slice(0, 16)}-v${revision}-${digest}"`;
}

/**
 * In-memory LRU + TTL cache for published public HTML landing pages (/p/:slug & custom domains).
 * Dramatically reduces CPU & DB load during high-concurrency ad bursts while guaranteeing
 * immediate invalidation on save, publish, delete, or backup restore.
 */
export class PublicPageHtmlCache {
  private readonly entries = new Map<string, CachedPublicPage>();
  private readonly maxEntries: number;
  private readonly ttlMs: number;

  constructor(options?: { maxEntries?: number; ttlMs?: number }) {
    this.maxEntries = Math.max(20, options?.maxEntries ?? 300);
    this.ttlMs = Math.max(1000, options?.ttlMs ?? 30_000);
  }

  private getKey(key: string): CachedPublicPage | null {
    const entry = this.entries.get(key);
    if (!entry) return null;
    if (Date.now() - entry.cachedAt >= this.ttlMs) {
      this.entries.delete(key);
      return null;
    }
    // Touch LRU order
    this.entries.delete(key);
    this.entries.set(key, entry);
    return entry;
  }

  private setKey(key: string, input: CachePublicPageInput): CachedPublicPage {
    const entry: CachedPublicPage = {
      key,
      projectId: input.projectId,
      slug: input.slug,
      revision: input.revision,
      html: input.html,
      etag: buildPageEtag(input.projectId, input.revision, input.html),
      cachedAt: Date.now(),
    };
    this.entries.delete(key);
    this.entries.set(key, entry);

    while (this.entries.size > this.maxEntries) {
      const oldestKey = this.entries.keys().next().value;
      if (oldestKey === undefined) break;
      this.entries.delete(oldestKey);
    }
    return entry;
  }

  public getBySlug(slug: string, origin?: string): CachedPublicPage | null {
    const clean = slug.trim().toLowerCase();
    if (!clean) return null;
    const cleanOrigin = origin ? origin.trim().toLowerCase().replace(/\/+$/, '') : '';
    const key = cleanOrigin ? `slug:${cleanOrigin}:${clean}` : `slug:${clean}`;
    return this.getKey(key);
  }

  public setBySlug(
    slug: string,
    input: CachePublicPageInput,
    origin?: string
  ): CachedPublicPage {
    const clean = slug.trim().toLowerCase();
    const cleanOrigin = origin ? origin.trim().toLowerCase().replace(/\/+$/, '') : '';
    const key = cleanOrigin ? `slug:${cleanOrigin}:${clean}` : `slug:${clean}`;
    return this.setKey(key, input);
  }

  public getByDomainPath(host: string, cleanPath: string): CachedPublicPage | null {
    const h = host.trim().toLowerCase();
    const p = cleanPath.trim().toLowerCase();
    if (!h) return null;
    return this.getKey(`domain:${h}:${p}`);
  }

  public setByDomainPath(
    host: string,
    cleanPath: string,
    input: CachePublicPageInput
  ): CachedPublicPage {
    const h = host.trim().toLowerCase();
    const p = cleanPath.trim().toLowerCase();
    return this.setKey(`domain:${h}:${p}`, input);
  }

  public invalidateProject(projectId: string, slugs: Array<string | undefined | null> = []): void {
    const targetSlugs = new Set(
      slugs.map((s) => String(s || '').trim().toLowerCase()).filter(Boolean)
    );
    for (const [key, val] of this.entries) {
      if (
        val.projectId === projectId ||
        targetSlugs.has(val.slug.toLowerCase()) ||
        (key.startsWith('slug:') && targetSlugs.has(key.split(':').pop() || ''))
      ) {
        this.entries.delete(key);
      }
    }
  }

  public clear(): void {
    this.entries.clear();
  }

  public get size(): number {
    return this.entries.size;
  }
}

export const publicPageCache = new PublicPageHtmlCache({
  maxEntries: 300,
  ttlMs: 30_000,
});
