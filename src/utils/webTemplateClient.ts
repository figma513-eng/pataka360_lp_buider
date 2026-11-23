import type {
  AuthUser,
  ProjectRecord,
  SavedWebTemplate,
  WebTemplateCategory,
  WebTemplateSnapshot,
  WebTemplateVisibility,
} from '../types/builder';
import { authFetch } from './authClient';
import { computeWebTemplateStats } from './webTemplateHelpers';

const LOCAL_CACHE_KEY = 'lynk_web_templates_cache_v1';

function readLocalCache(): SavedWebTemplate[] {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return [];
    const raw = window.localStorage.getItem(LOCAL_CACHE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as SavedWebTemplate[]) : [];
  } catch {
    return [];
  }
}

function writeLocalCache(list: SavedWebTemplate[]): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    window.localStorage.setItem(LOCAL_CACHE_KEY, JSON.stringify(list.slice(0, 60)));
  } catch {
    // Abaikan jika quota storage penuh
  }
}

export interface CreateWebTemplateInput {
  name: string;
  description: string;
  category: WebTemplateCategory;
  visibility: WebTemplateVisibility;
  allowCollaborativeEdit: boolean;
  snapshot: WebTemplateSnapshot;
}

export interface UpdateWebTemplateInput {
  name?: string;
  description?: string;
  category?: WebTemplateCategory;
  visibility?: WebTemplateVisibility;
  allowCollaborativeEdit?: boolean;
  snapshot?: WebTemplateSnapshot;
}

export async function fetchWebTemplatesFromServer(): Promise<{
  ok: boolean;
  templates: SavedWebTemplate[];
  source: 'server' | 'local';
  error?: string;
}> {
  try {
    const res = await authFetch('/api/web-templates');
    if (res.ok) {
      const data = (await res.json()) as { ok?: boolean; templates?: SavedWebTemplate[] };
      const list = Array.isArray(data.templates) ? data.templates : [];
      writeLocalCache(list);
      return { ok: true, templates: list, source: 'server' };
    }
    return {
      ok: false,
      templates: readLocalCache(),
      source: 'local',
      error: res.status === 401 ? 'AUTH_REQUIRED' : `HTTP_${res.status}`,
    };
  } catch {
    return {
      ok: false,
      templates: readLocalCache(),
      source: 'local',
      error: 'NETWORK_ERROR',
    };
  }
}

export async function createWebTemplateOnServer(
  input: CreateWebTemplateInput,
  fallbackUser?: { id?: string; name?: string }
): Promise<{
  ok: boolean;
  template?: SavedWebTemplate;
  source: 'server' | 'local';
  error?: string;
}> {
  try {
    const res = await authFetch('/api/web-templates', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(input),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      template?: SavedWebTemplate;
      error?: string;
    };
    if (res.ok && data.ok && data.template) {
      const prev = readLocalCache().filter((t) => t.id !== data.template!.id);
      writeLocalCache([data.template, ...prev]);
      return { ok: true, template: data.template, source: 'server' };
    }
    if (res.status >= 400 && res.status < 500 && res.status !== 401) {
      return { ok: false, source: 'server', error: data.error || 'Gagal menyimpan Template Web.' };
    }
  } catch {
    // Fallback ke cache lokal saat offline
  }

  const now = Date.now();
  const stats = computeWebTemplateStats(input.snapshot);
  const localTpl: SavedWebTemplate = {
    id: `wtpl_local_${now}_${Math.random().toString(36).slice(2, 7)}`,
    name: input.name.trim(),
    description: input.description.trim(),
    category: input.category,
    visibility: input.visibility,
    allowCollaborativeEdit: input.allowCollaborativeEdit,
    snapshot: input.snapshot,
    mainBlockCount: stats.mainBlockCount,
    subPageCount: stats.subPageCount,
    totalBlockCount: stats.totalBlockCount,
    subPageTitles: stats.subPageTitles,
    paletteColors: stats.paletteColors,
    createdByUserId: fallbackUser?.id || 'local-user',
    createdByName: fallbackUser?.name || 'Pengguna Lokal',
    usageCount: 0,
    createdAt: now,
    updatedAt: now,
  };
  writeLocalCache([localTpl, ...readLocalCache()]);
  return { ok: true, template: localTpl, source: 'local' };
}

export async function updateWebTemplateOnServer(
  id: string,
  patch: UpdateWebTemplateInput
): Promise<{
  ok: boolean;
  template?: SavedWebTemplate;
  error?: string;
}> {
  if (id.startsWith('wtpl_local_')) {
    const list = readLocalCache();
    const existing = list.find((t) => t.id === id);
    if (!existing) return { ok: false, error: 'Template lokal tidak ditemukan.' };
    const nextSnap = patch.snapshot ?? existing.snapshot;
    const stats = computeWebTemplateStats(nextSnap);
    const updated: SavedWebTemplate = {
      ...existing,
      ...patch,
      snapshot: nextSnap,
      ...stats,
      updatedAt: Date.now(),
    };
    writeLocalCache(list.map((t) => (t.id === id ? updated : t)));
    return { ok: true, template: updated };
  }

  try {
    const res = await authFetch(`/api/web-templates/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(patch),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      template?: SavedWebTemplate;
      error?: string;
    };
    if (!res.ok || !data.ok || !data.template) {
      return { ok: false, error: data.error || 'Gagal memperbarui Template Web.' };
    }
    const prev = readLocalCache().filter((t) => t.id !== id);
    writeLocalCache([data.template, ...prev]);
    return { ok: true, template: data.template };
  } catch {
    return { ok: false, error: 'Gagal menghubungi server saat memperbarui template.' };
  }
}

export async function recordWebTemplateUseOnServer(id: string): Promise<{
  ok: boolean;
  template?: SavedWebTemplate;
}> {
  if (id.startsWith('wtpl_local_')) {
    const list = readLocalCache();
    const existing = list.find((t) => t.id === id);
    if (!existing) return { ok: false };
    const updated = { ...existing, usageCount: (existing.usageCount || 0) + 1 };
    writeLocalCache(list.map((t) => (t.id === id ? updated : t)));
    return { ok: true, template: updated };
  }
  try {
    const res = await authFetch(`/api/web-templates/${encodeURIComponent(id)}/use`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    const data = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      template?: SavedWebTemplate;
    };
    if (res.ok && data.ok && data.template) {
      const prev = readLocalCache().filter((t) => t.id !== id);
      writeLocalCache([data.template, ...prev]);
      return { ok: true, template: data.template };
    }
  } catch {
    // Non-fatal usage counter
  }
  return { ok: false };
}

export async function deleteWebTemplateOnServer(id: string): Promise<{
  ok: boolean;
  error?: string;
}> {
  if (id.startsWith('wtpl_local_')) {
    writeLocalCache(readLocalCache().filter((t) => t.id !== id));
    return { ok: true };
  }
  try {
    const res = await authFetch(`/api/web-templates/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
    if (!res.ok || !data.ok) {
      return { ok: false, error: data.error || 'Gagal menghapus Template Web.' };
    }
    writeLocalCache(readLocalCache().filter((t) => t.id !== id));
    return { ok: true };
  } catch {
    return { ok: false, error: 'Gagal menghubungi server saat menghapus template.' };
  }
}

export interface SaasSlugCheckResult {
  ok: boolean;
  slug: string;
  available: boolean;
  reason?: string;
  suggestedSlug?: string;
}

export async function checkSaasSlugAvailability(rawSlug: string): Promise<SaasSlugCheckResult> {
  try {
    const res = await authFetch(
      `/api/saas/check-slug?slug=${encodeURIComponent(rawSlug.trim())}`
    );
    const data = (await res.json().catch(() => ({}))) as Partial<SaasSlugCheckResult> & {
      error?: string;
    };
    if (res.ok && data.ok) {
      return {
        ok: true,
        slug: String(data.slug || ''),
        available: Boolean(data.available),
        reason: data.reason,
        suggestedSlug: data.suggestedSlug,
      };
    }
    return {
      ok: false,
      slug: rawSlug,
      available: false,
      reason: data.error || 'Gagal memeriksa ketersediaan link.',
    };
  } catch {
    return {
      ok: false,
      slug: rawSlug,
      available: false,
      reason: 'Tidak dapat terhubung ke server untuk memeriksa link.',
    };
  }
}

export interface CreateSaasBuyerSitePayload {
  businessName: string;
  slug: string;
  templateId?: string | null;
  publishImmediately?: boolean;
}

export interface CreateSaasBuyerSiteResult {
  ok: boolean;
  record?: ProjectRecord;
  user?: AuthUser;
  livePath?: string;
  suggestedSlug?: string;
  error?: string;
}

export async function createSaasBuyerSite(
  payload: CreateSaasBuyerSitePayload
): Promise<CreateSaasBuyerSiteResult> {
  try {
    const res = await authFetch('/api/saas/onboarding/create-site', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = (await res.json().catch(() => ({}))) as CreateSaasBuyerSiteResult;
    if (res.ok && data.ok && data.record) {
      return data;
    }
    return {
      ok: false,
      error: data.error || 'Gagal membuat web usaha baru.',
      suggestedSlug: data.suggestedSlug,
    };
  } catch {
    return {
      ok: false,
      error: 'Gagal menghubungi server saat membuat web usaha.',
    };
  }
}

