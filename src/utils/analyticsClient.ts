import type { AdChannel, AnalyticsEventRecord, ProjectRecord } from '../types/builder';
import { authFetch } from './authClient';
import { AD_CHANNEL_META } from './publishingHelpers';

const LOCAL_ANALYTICS_KEY = 'lynk_builder_analytics_v1';

export interface SaveProjectResponse {
  ok: boolean;
  savedAt: number;
  slug: string;
  isPublished?: boolean;
  revision?: number;
  conflict?: boolean;
  currentRevision?: number;
  serverRecord?: ProjectRecord;
  status?: number;
  error?: string;
}

export interface AnalyticsSummaryResponse {
  events: AnalyticsEventRecord[];
  capiConfiguredOnServer: boolean;
}

function readLocalEvents(): AnalyticsEventRecord[] {
  try {
    const raw = localStorage.getItem(LOCAL_ANALYTICS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as AnalyticsEventRecord[]) : [];
  } catch {
    return [];
  }
}

function writeLocalEvents(events: AnalyticsEventRecord[]) {
  try {
    localStorage.setItem(LOCAL_ANALYTICS_KEY, JSON.stringify(events.slice(0, 1000)));
  } catch {
    // Abaikan kuota penyimpanan browser
  }
}

export async function saveProjectToServer(
  record: ProjectRecord,
  renderedHtml: string,
  publishNow = false,
  options?: { keepalive?: boolean }
): Promise<SaveProjectResponse> {
  const endpoint = publishNow
    ? `/api/projects/${encodeURIComponent(record.id)}/publish`
    : `/api/projects/${encodeURIComponent(record.id)}/save`;

  try {
    const resp = await authFetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      keepalive: Boolean(options?.keepalive),
      body: JSON.stringify({
        record,
        renderedHtml,
        baseRevision: record.revision,
      }),
    });
    const data = (await resp.json().catch(() => ({}))) as Partial<SaveProjectResponse> & {
      code?: string;
      error?: string;
    };

    if (resp.status === 409 && data.code === 'REVISION_CONFLICT') {
      return {
        ok: false,
        status: 409,
        conflict: true,
        currentRevision: data.currentRevision,
        serverRecord: data.serverRecord,
        savedAt: record.lastSavedAt ?? 0,
        slug: record.project.publishing?.slug || '',
        error:
          data.error ||
          'Proyek telah diperbarui di sesi/perangkat lain. Pilih muat versi terbaru atau timpa server.',
      };
    }

    if (!resp.ok) {
      return {
        ok: false,
        status: resp.status,
        savedAt: record.lastSavedAt ?? 0,
        slug: record.project.publishing?.slug || '',
        error: data.error || 'Gagal menyimpan ke server.',
      };
    }

    return {
      ok: true,
      status: resp.status,
      savedAt: data.savedAt ?? Date.now(),
      slug: data.slug ?? record.project.publishing?.slug ?? '',
      isPublished: data.isPublished,
      revision: data.revision ?? record.revision ?? 1,
    };
  } catch {
    return {
      ok: false,
      savedAt: record.lastSavedAt ?? 0,
      slug: record.project.publishing?.slug || '',
      error: 'Koneksi server tidak tersedia; perubahan tersimpan lokal.',
    };
  }
}

export async function deleteProjectOnServer(
  projectId: string
): Promise<{ ok: boolean; error?: string }> {
  try {
    const res = await authFetch(`/api/projects/${encodeURIComponent(projectId)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      return { ok: false, error: data.error || 'Gagal menghapus proyek di server.' };
    }
    return { ok: true };
  } catch {
    return { ok: false, error: 'Offline: penghapusan belum disinkronkan ke server.' };
  }
}

export async function trackAnalyticsEvent(params: {
  projectId: string;
  projectTitle: string;
  slug: string;
  eventType: 'page_view' | 'wa_click' | 'form_submit';
  channel?: AdChannel;
  ctaLabel?: string;
  waPhone?: string;
  orderValue?: number;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  clickIdType?: 'fbclid' | 'ctwa_clid' | 'ttclid' | 'gclid';
  isTest?: boolean;
}): Promise<void> {
  const channel: AdChannel = params.channel ?? 'organic';
  const event: AnalyticsEventRecord = {
    id: `evt_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 7)}`,
    projectId: params.projectId,
    projectTitle: params.projectTitle,
    slug: params.slug,
    eventType: params.eventType,
    channel,
    sourceLabel: AD_CHANNEL_META[channel].shortLabel,
    ctaLabel: params.ctaLabel,
    waPhone: params.waPhone,
    orderValue: params.orderValue,
    utmSource: params.utmSource,
    utmMedium: params.utmMedium,
    utmCampaign: params.utmCampaign,
    utmContent: params.utmContent,
    clickIdType: params.clickIdType,
    deviceType:
      typeof window !== 'undefined' && window.innerWidth < 768 ? 'mobile' : 'desktop',
    isTest: params.isTest,
    createdAt: Date.now(),
  };

  const existing = readLocalEvents();
  writeLocalEvents([event, ...existing]);

  try {
    await fetch('/api/track/event', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(event),
      keepalive: true,
    });
  } catch {
    // Fallback sudah tersimpan di localStorage
  }
}

export async function fetchAnalyticsSummary(): Promise<AnalyticsSummaryResponse> {
  const localEvents = readLocalEvents();
  try {
    const resp = await authFetch('/api/analytics');
    if (!resp.ok) {
      return { events: localEvents, capiConfiguredOnServer: false };
    }
    const data = (await resp.json()) as Partial<AnalyticsSummaryResponse>;
    const serverEvents = Array.isArray(data.events) ? data.events : [];
    const seen = new Set<string>();
    const merged: AnalyticsEventRecord[] = [];
    for (const ev of [...serverEvents, ...localEvents]) {
      if (!ev || !ev.id || seen.has(ev.id)) continue;
      seen.add(ev.id);
      merged.push(ev);
    }
    merged.sort((a, b) => b.createdAt - a.createdAt);
    writeLocalEvents(merged);
    return {
      events: merged,
      capiConfiguredOnServer: Boolean(data.capiConfiguredOnServer),
    };
  } catch {
    return { events: localEvents, capiConfiguredOnServer: false };
  }
}

export async function clearAnalyticsOnServer(projectId?: string): Promise<void> {
  const localEvents = readLocalEvents();
  if (projectId) {
    writeLocalEvents(localEvents.filter((ev) => ev.projectId !== projectId));
  } else {
    writeLocalEvents([]);
  }
  try {
    const query = projectId ? `?projectId=${encodeURIComponent(projectId)}` : '';
    await authFetch(`/api/analytics${query}`, { method: 'DELETE' });
  } catch {
    // Abaikan jika offline
  }
}
