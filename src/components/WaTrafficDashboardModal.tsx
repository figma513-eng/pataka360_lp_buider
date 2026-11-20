import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart3,
  Download,
  ExternalLink,
  MessageCircle,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react';
import {
  AdChannel,
  AnalyticsEventRecord,
  FormSubmissionRecord,
  ProjectRecord,
} from '../types/builder';
import {
  clearAnalyticsOnServer,
  fetchAnalyticsSummary,
  fetchFormSubmissions,
} from '../utils/analyticsClient';
import { formatRupiah } from '../utils/cartHelpers';
import { AD_CHANNEL_META, resolveProjectPublishing } from '../utils/publishingHelpers';
import { downloadTextFile } from '../utils/projectStorage';

type TimeRange = 'today' | '7d' | '30d' | 'all';
type AnalyticsViewTab = 'ringkasan' | 'whatsapp' | 'produk_formulir';

interface WaTrafficDashboardModalProps {
  projects: ProjectRecord[];
  activeProjectId: string;
  onSelectProject?: (projectId: string) => void;
  onOpenDomainSettings?: (projectId: string) => void;
  onClose?: () => void;
  asPage?: boolean;
}

function formatDateTimeShort(ts: number): string {
  return new Date(ts).toLocaleString('id-ID', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getDayKey(ts: number): string {
  const d = new Date(ts);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function WaTrafficDashboardModal({
  projects,
  activeProjectId,
  onSelectProject,
  onOpenDomainSettings,
  onClose = () => {},
  asPage = false,
}: WaTrafficDashboardModalProps) {
  const [events, setEvents] = useState<AnalyticsEventRecord[]>([]);
  const [formSubmissions, setFormSubmissions] = useState<FormSubmissionRecord[]>([]);
  const [activeViewTab, setActiveViewTab] = useState<AnalyticsViewTab>('ringkasan');
  const [loading, setLoading] = useState(true);
  const [capiConfigured, setCapiConfigured] = useState(false);
  const [selectedProjectFilter, setSelectedProjectFilter] = useState<string>('all');
  const [timeRange, setTimeRange] = useState<TimeRange>('7d');
  const [channelFilter, setChannelFilter] = useState<AdChannel | 'all'>('all');
  const [includeTest, setIncludeTest] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmClear, setConfirmClear] = useState(false);

  const refreshData = async () => {
    setLoading(true);
    const [res, subs] = await Promise.all([
      fetchAnalyticsSummary(),
      fetchFormSubmissions(),
    ]);
    setEvents(res.events);
    setCapiConfigured(res.capiConfiguredOnServer);
    setFormSubmissions(subs);
    setLoading(false);
  };

  useEffect(() => {
    void refreshData();
  }, []);

  const allowedProjectIds = useMemo(
    () => new Set(projects.map((p) => p.id)),
    [projects]
  );

  const filteredEvents = useMemo(() => {
    const now = Date.now();
    const startOfToday = new Date();
    startOfToday.setHours(0, 0, 0, 0);

    return events.filter((ev) => {
      if (allowedProjectIds.size > 0 && !allowedProjectIds.has(ev.projectId)) return false;
      if (!includeTest && ev.isTest) return false;
      if (selectedProjectFilter !== 'all' && ev.projectId !== selectedProjectFilter) return false;
      if (channelFilter !== 'all' && ev.channel !== channelFilter) return false;

      if (timeRange === 'today' && ev.createdAt < startOfToday.getTime()) return false;
      if (timeRange === '7d' && ev.createdAt < now - 7 * 86400_000) return false;
      if (timeRange === '30d' && ev.createdAt < now - 30 * 86400_000) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.trim().toLowerCase();
        const hay = `${ev.projectTitle} ${ev.slug} ${ev.ctaLabel || ''} ${ev.sourceLabel} ${
          ev.utmCampaign || ''
        } ${ev.waPhone || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [
    events,
    allowedProjectIds,
    includeTest,
    selectedProjectFilter,
    channelFilter,
    timeRange,
    searchQuery,
  ]);

  const kpis = useMemo(() => {
    let pageViews = 0;
    let waClicks = 0;
    let formOpens = 0;
    let formSubmits = 0;
    let totalOrderValue = 0;

    for (const ev of filteredEvents) {
      if (ev.eventType === 'page_view') pageViews += 1;
      else if (ev.eventType === 'wa_click') {
        waClicks += 1;
        if (typeof ev.orderValue === 'number' && ev.orderValue > 0) {
          totalOrderValue += ev.orderValue;
        }
      } else if (ev.eventType === 'form_open') {
        formOpens += 1;
      } else if (ev.eventType === 'form_submit') {
        formSubmits += 1;
      }
    }

    const ctr = pageViews > 0 ? Math.min(100, (waClicks / pageViews) * 100) : 0;
    const formConversionRate =
      pageViews > 0 ? Math.min(100, (formSubmits / pageViews) * 100) : 0;
    return { pageViews, waClicks, formOpens, formSubmits, totalOrderValue, ctr, formConversionRate };
  }, [filteredEvents]);

  const waBreakdownStats = useMemo(() => {
    const byLink = new Map<string, { id: string; label: string; clicks: number; value: number }>();
    const byTemplate = new Map<string, { id: string; label: string; clicks: number }>();
    const byComponent = new Map<string, { id: string; label: string; type: string; clicks: number }>();
    const byProduct = new Map<string, { name: string; clicks: number; value: number }>();

    const linkNameMap = new Map<string, string>();
    const tplNameMap = new Map<string, string>();
    for (const p of projects) {
      p.project.whatsappCenter?.links?.forEach((l) => linkNameMap.set(l.id, l.name));
      p.project.whatsappCenter?.templates?.forEach((t) => tplNameMap.set(t.id, t.name));
    }

    for (const ev of filteredEvents) {
      if (ev.eventType === 'wa_click') {
        const linkKey = ev.waLinkId || ev.waPhone || 'langsung';
        const linkLabel =
          (ev.waLinkId && linkNameMap.get(ev.waLinkId)) ||
          (ev.waPhone ? `WA ${ev.waPhone}` : 'Tautan Langsung');
        const curLink = byLink.get(linkKey) || { id: linkKey, label: linkLabel, clicks: 0, value: 0 };
        curLink.clicks += 1;
        curLink.value += ev.orderValue || 0;
        byLink.set(linkKey, curLink);

        const tplKey = ev.waTemplateId || 'bawaan';
        const tplLabel =
          (ev.waTemplateId && tplNameMap.get(ev.waTemplateId)) || 'Pesan Langsung / Bawaan';
        const curTpl = byTemplate.get(tplKey) || { id: tplKey, label: tplLabel, clicks: 0 };
        curTpl.clicks += 1;
        byTemplate.set(tplKey, curTpl);

        const compKey = ev.componentId || ev.ctaLabel || 'tombol_wa';
        const compLabel = ev.buttonLabel || ev.ctaLabel || 'Tombol WhatsApp';
        const curComp = byComponent.get(compKey) || {
          id: compKey,
          label: compLabel,
          type: ev.componentType || 'button',
          clicks: 0,
        };
        curComp.clicks += 1;
        byComponent.set(compKey, curComp);

        if (ev.productName || (ev.orderValue && ev.orderValue > 0)) {
          const prodKey = ev.productName || ev.ctaLabel || 'Produk Katalog';
          const curProd = byProduct.get(prodKey) || { name: prodKey, clicks: 0, value: 0 };
          curProd.clicks += 1;
          curProd.value += ev.orderValue || 0;
          byProduct.set(prodKey, curProd);
        }
      }
    }

    return {
      byLink: Array.from(byLink.values()).sort((a, b) => b.clicks - a.clicks),
      byTemplate: Array.from(byTemplate.values()).sort((a, b) => b.clicks - a.clicks),
      byComponent: Array.from(byComponent.values()).sort((a, b) => b.clicks - a.clicks),
      byProduct: Array.from(byProduct.values()).sort((a, b) => b.clicks - a.clicks),
    };
  }, [filteredEvents, projects]);

  const filteredFormSubmissions = useMemo(() => {
    return formSubmissions.filter((sub) => {
      if (allowedProjectIds.size > 0 && !allowedProjectIds.has(sub.projectId)) return false;
      if (!includeTest && sub.isTest) return false;
      if (selectedProjectFilter !== 'all' && sub.projectId !== selectedProjectFilter) return false;
      return true;
    });
  }, [formSubmissions, allowedProjectIds, includeTest, selectedProjectFilter]);

  const channelBreakdown = useMemo(() => {
    const channels: AdChannel[] = ['meta_wa_addon', 'meta', 'tiktok', 'google', 'organic'];
    const map: Record<AdChannel, { views: number; clicks: number }> = {
      meta_wa_addon: { views: 0, clicks: 0 },
      meta: { views: 0, clicks: 0 },
      tiktok: { views: 0, clicks: 0 },
      google: { views: 0, clicks: 0 },
      organic: { views: 0, clicks: 0 },
    };

    for (const ev of filteredEvents) {
      const ch = map[ev.channel] ? ev.channel : 'organic';
      if (ev.eventType === 'page_view') map[ch].views += 1;
      if (ev.eventType === 'wa_click') map[ch].clicks += 1;
    }

    const totalClicks = Math.max(1, kpis.waClicks);
    return channels.map((ch) => ({
      channel: ch,
      label: AD_CHANNEL_META[ch].label,
      color: AD_CHANNEL_META[ch].color,
      views: map[ch].views,
      clicks: map[ch].clicks,
      sharePct: kpis.waClicks > 0 ? Math.round((map[ch].clicks / totalClicks) * 100) : 0,
    }));
  }, [filteredEvents, kpis.waClicks]);

  const perUnitSummary = useMemo(() => {
    const unitMap = new Map<
      string,
      {
        projectId: string;
        title: string;
        slug: string;
        domain: string;
        isPublished: boolean;
        views: number;
        waClicks: number;
        lastClickAt: number;
        channelCounts: Record<AdChannel, number>;
      }
    >();

    projects.forEach((rec) => {
      const pub = resolveProjectPublishing(rec.project);
      unitMap.set(rec.id, {
        projectId: rec.id,
        title: rec.project.title || 'Unit Usaha',
        slug: pub.slug,
        domain: pub.useCustomDomain && pub.customDomain ? pub.customDomain : `/p/${pub.slug}`,
        isPublished: pub.isPublished,
        views: 0,
        waClicks: 0,
        lastClickAt: 0,
        channelCounts: {
          meta: 0,
          meta_wa_addon: 0,
          tiktok: 0,
          google: 0,
          organic: 0,
        },
      });
    });

    for (const ev of filteredEvents) {
      const row = unitMap.get(ev.projectId);
      if (!row) continue;
      if (ev.eventType === 'page_view') row.views += 1;
      if (ev.eventType === 'wa_click') {
        row.waClicks += 1;
        row.channelCounts[ev.channel] = (row.channelCounts[ev.channel] || 0) + 1;
        if (ev.createdAt > row.lastClickAt) row.lastClickAt = ev.createdAt;
      }
    }

    return Array.from(unitMap.values()).sort((a, b) => b.waClicks - a.waClicks);
  }, [projects, filteredEvents]);

  const dailyTrend = useMemo(() => {
    const daysCount = timeRange === 'today' ? 1 : timeRange === '30d' ? 14 : 7;
    const buckets: { key: string; label: string; views: number; clicks: number }[] = [];
    const bucketMap = new Map<string, { views: number; clicks: number }>();

    for (let i = daysCount - 1; i >= 0; i -= 1) {
      const d = new Date(Date.now() - i * 86400_000);
      const key = getDayKey(d.getTime());
      const label = d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
      const entry = { views: 0, clicks: 0 };
      bucketMap.set(key, entry);
      buckets.push({ key, label, views: 0, clicks: 0 });
    }

    for (const ev of filteredEvents) {
      const key = getDayKey(ev.createdAt);
      const bucket = bucketMap.get(key);
      if (!bucket) continue;
      if (ev.eventType === 'page_view') bucket.views += 1;
      if (ev.eventType === 'wa_click') bucket.clicks += 1;
    }

    return buckets.map((b) => {
      const counts = bucketMap.get(b.key)!;
      return { ...b, views: counts.views, clicks: counts.clicks };
    });
  }, [filteredEvents, timeRange]);

  const maxTrendValue = useMemo(() => {
    let max = 1;
    dailyTrend.forEach((d) => {
      if (d.views > max) max = d.views;
      if (d.clicks > max) max = d.clicks;
    });
    return max;
  }, [dailyTrend]);

  const waClickLogs = useMemo(
    () => filteredEvents.filter((ev) => ev.eventType === 'wa_click').slice(0, 80),
    [filteredEvents]
  );

  const handleExportCsv = () => {
    const header = [
      'Waktu',
      'Unit Usaha',
      'Slug',
      'Event',
      'Sumber Iklan',
      'Campaign',
      'Tombol / Produk',
      'Nomor WA',
      'Nilai Order',
      'Perangkat',
      'Mode',
    ].join(',');
    const rows = filteredEvents.map((ev) =>
      [
        `"${new Date(ev.createdAt).toISOString()}"`,
        `"${(ev.projectTitle || '').replace(/"/g, '""')}"`,
        `"${ev.slug || ''}"`,
        ev.eventType,
        `"${ev.sourceLabel}"`,
        `"${(ev.utmCampaign || '').replace(/"/g, '""')}"`,
        `"${(ev.ctaLabel || '').replace(/"/g, '""')}"`,
        `"${ev.waPhone || ''}"`,
        ev.orderValue ?? 0,
        ev.deviceType,
        ev.isTest ? 'Preview' : 'Live',
      ].join(',')
    );
    downloadTextFile(
      `trafik-wa-lynk-${new Date().toISOString().slice(0, 10)}.csv`,
      [header, ...rows].join('\n'),
      'text/csv;charset=utf-8'
    );
  };

  const handleClearLogs = async () => {
    const target = selectedProjectFilter === 'all' ? undefined : selectedProjectFilter;
    await clearAnalyticsOnServer(target);
    setConfirmClear(false);
    await refreshData();
  };

  const cardContent = (
    <div
      onClick={(e) => {
        if (!asPage) e.stopPropagation();
      }}
      className={
        asPage
          ? 'w-full max-w-6xl mx-auto flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-[#DCE5EF] overflow-hidden'
          : 'w-full max-w-6xl h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-[#DCE5EF] overflow-hidden'
      }
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#DCE5EF] flex items-center justify-between gap-3 bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#ECFDF6] border border-[#00C98A]/35 text-[#00A873] flex items-center justify-center shrink-0">
            <BarChart3 className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#17243D] tracking-tight truncate">
              Dasbor Analitik Trafik, WhatsApp &amp; Formulir
            </h2>
            <div className="flex items-center gap-2 text-xs text-[#5B708B] mt-0.5 tabular-nums">
              <span>{projects.length} unit usaha</span>
              <span aria-hidden="true" className="text-[#8FA4BF]">·</span>
              <span>
                Meta CAPI Server: {capiConfigured ? 'Aktif' : 'Siap (opsional via env)'}
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportCsv}
            disabled={filteredEvents.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] hover:border-[#8FA4BF] disabled:opacity-40 text-xs font-semibold text-[#17243D] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-[#00A873]" />
            <span>Ekspor CSV</span>
          </button>
          <button
            type="button"
            onClick={() => void refreshData()}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#17243D] hover:bg-[#223456] text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#00C98A] ${loading ? 'animate-spin' : ''}`} />
            <span>Segarkan</span>
          </button>
          {!asPage && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup dashboard"
              className="p-1.5 rounded-lg hover:bg-[#F0F5FA] text-[#5B708B] hover:text-[#17243D] transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

        {/* Filter Bar */}
        <div className="px-5 py-2.5 border-b border-[#DCE5EF] bg-[#F0F5FA]/60 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              aria-label="Filter Unit Usaha"
              className="px-2.5 py-1.5 rounded-xl border border-[#DCE5EF] bg-white text-xs font-semibold text-[#17243D] outline-none focus:border-[#00C98A] transition-colors"
            >
              <option value="all">Semua Unit Usaha ({projects.length})</option>
              {projects.map((rec) => (
                <option key={rec.id} value={rec.id}>
                  {rec.project.title}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-0.5 p-0.5 bg-[#DCE5EF]/60 rounded-xl">
              {(
                [
                  { id: 'today', label: 'Hari Ini' },
                  { id: '7d', label: '7 Hari' },
                  { id: '30d', label: '30 Hari' },
                  { id: 'all', label: 'Semua' },
                ] as { id: TimeRange; label: string }[]
              ).map((rng) => (
                <button
                  key={rng.id}
                  type="button"
                  onClick={() => setTimeRange(rng.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    timeRange === rng.id
                      ? 'bg-[#17243D] text-white'
                      : 'text-[#5B708B] hover:text-[#17243D]'
                  }`}
                >
                  {rng.label}
                </button>
              ))}
            </div>

            <select
              value={channelFilter}
              onChange={(e) => setChannelFilter(e.target.value as AdChannel | 'all')}
              aria-label="Filter Sumber Iklan"
              className="px-2.5 py-1.5 rounded-xl border border-[#DCE5EF] bg-white text-xs font-medium text-[#17243D] outline-none focus:border-[#00C98A] transition-colors"
            >
              <option value="all">Semua Sumber Iklan</option>
              <option value="meta_wa_addon">Meta Add-On WA</option>
              <option value="meta">Meta Ads (FB / IG)</option>
              <option value="tiktok">TikTok Ads</option>
              <option value="google">Google Ads</option>
              <option value="organic">Organik / Langsung</option>
            </select>
          </div>

          <div className="flex items-center gap-2.5">
            <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#5B708B] cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={includeTest}
                onChange={(e) => setIncludeTest(e.target.checked)}
                className="rounded border-[#DCE5EF] accent-[#00C98A] cursor-pointer"
              />
              <span>Sertakan Uji Pratinjau</span>
            </label>

            {confirmClear ? (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void handleClearLogs()}
                  className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold transition-colors cursor-pointer"
                >
                  Yakin Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1 rounded-lg border border-[#DCE5EF] bg-white text-[#5B708B] hover:text-[#17243D] text-xs font-semibold cursor-pointer"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                disabled={events.length === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl border border-[#DCE5EF] bg-white hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 disabled:opacity-40 text-xs font-semibold text-[#5B708B] transition-colors cursor-pointer whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Data</span>
              </button>
            )}
          </div>
        </div>

        {/* View Sub-Tabs */}
        <div className="px-5 border-b border-[#DCE5EF] bg-white flex items-center gap-1 overflow-x-auto shrink-0">
          {(
            [
              { id: 'ringkasan', label: 'Ringkasan & Sumber Trafik' },
              { id: 'whatsapp', label: 'Per Tautan, Tombol & Templat WA' },
              {
                id: 'produk_formulir',
                label: `Produk & Formulir (${filteredFormSubmissions.length})`,
              },
            ] as { id: AnalyticsViewTab; label: string }[]
          ).map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setActiveViewTab(t.id)}
              className={`px-3.5 py-2.5 text-xs font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums ${
                activeViewTab === t.id
                  ? 'border-[#00C98A] text-[#17243D]'
                  : 'border-transparent text-[#5B708B] hover:text-[#17243D]'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#F0F5FA]/70">
          {/* 5 KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            <div className="bg-white rounded-xl border border-[#DCE5EF] p-4">
              <div className="text-xs font-medium text-[#5B708B]">Kunjungan Halaman</div>
              <div className="text-2xl font-bold text-[#17243D] mt-1 tabular-nums tracking-tight">
                {kpis.pageViews.toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-[#8FA4BF] mt-1">Total kunjungan tercatat</div>
            </div>

            <div className="bg-white rounded-xl border border-[#DCE5EF] p-4">
              <div className="text-xs font-medium text-[#5B708B]">Total Klik WhatsApp</div>
              <div className="text-2xl font-bold text-[#008F63] mt-1 tabular-nums tracking-tight">
                {kpis.waClicks.toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-[#8FA4BF] mt-1">
                Tombol WA, Katalog &amp; Pusat WA
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#DCE5EF] p-4">
              <div className="text-xs font-medium text-[#5B708B]">Rasio Klik WA (CTR)</div>
              <div className="text-2xl font-bold text-[#17243D] mt-1 tabular-nums tracking-tight">
                {kpis.ctr.toFixed(1)}%
              </div>
              <div className="text-[11px] text-[#8FA4BF] mt-1">
                Klik WA ÷ Kunjungan Halaman
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#DCE5EF] p-4">
              <div className="text-xs font-medium text-[#5B708B]">Pengiriman Formulir</div>
              <div className="text-2xl font-bold text-[#17243D] mt-1 tabular-nums tracking-tight">
                {kpis.formSubmits.toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-[#8FA4BF] mt-1 tabular-nums">
                Dibuka: {kpis.formOpens} · Rasio: {kpis.formConversionRate.toFixed(1)}%
              </div>
            </div>

            <div className="bg-white rounded-xl border border-[#DCE5EF] p-4">
              <div className="text-xs font-medium text-[#5B708B]">Estimasi Pesanan WhatsApp</div>
              <div className="text-2xl font-bold text-[#17243D] mt-1 tabular-nums tracking-tight truncate">
                {formatRupiah(kpis.totalOrderValue)}
              </div>
              <div className="text-[11px] text-amber-700 mt-1">
                Estimasi klik checkout WA (bukan transaksi final)
              </div>
            </div>
          </div>

          {activeViewTab === 'whatsapp' && (
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div className="bg-white rounded-xl border border-[#DCE5EF] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#DCE5EF]">
                  <h3 className="text-xs font-bold text-[#17243D]">Statistik per Tautan WhatsApp</h3>
                  <p className="text-[11px] text-[#5B708B] mt-0.5">Performa masing-masing tautan dari Pusat WhatsApp</p>
                </div>
                <div className="divide-y divide-[#EEF3F8] text-xs max-h-80 overflow-y-auto">
                  {waBreakdownStats.byLink.length === 0 ? (
                    <div className="p-5 text-center text-[#8FA4BF]">Belum ada data klik tautan WA.</div>
                  ) : (
                    waBreakdownStats.byLink.map((row) => (
                      <div key={row.id} className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-[#F0F5FA]/50 transition-colors">
                        <span className="font-semibold text-[#17243D] truncate">{row.label}</span>
                        <span className="font-mono font-bold text-[#008F63] tabular-nums shrink-0">
                          {row.clicks} klik
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#DCE5EF] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#DCE5EF]">
                  <h3 className="text-xs font-bold text-[#17243D]">Statistik per Tombol &amp; Komponen</h3>
                  <p className="text-[11px] text-[#5B708B] mt-0.5">Elemen yang paling sering diklik pengunjung</p>
                </div>
                <div className="divide-y divide-[#EEF3F8] text-xs max-h-80 overflow-y-auto">
                  {waBreakdownStats.byComponent.length === 0 ? (
                    <div className="p-5 text-center text-[#8FA4BF]">Belum ada data klik komponen.</div>
                  ) : (
                    waBreakdownStats.byComponent.map((row) => (
                      <div key={row.id} className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-[#F0F5FA]/50 transition-colors">
                        <div className="min-w-0">
                          <div className="font-semibold text-[#17243D] truncate">{row.label}</div>
                          <div className="text-[10px] font-mono text-[#8FA4BF]">{row.type}</div>
                        </div>
                        <span className="font-mono font-bold text-[#008F63] tabular-nums shrink-0">
                          {row.clicks} klik
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#DCE5EF] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#DCE5EF]">
                  <h3 className="text-xs font-bold text-[#17243D]">Statistik per Templat WhatsApp</h3>
                  <p className="text-[11px] text-[#5B708B] mt-0.5">Templat pesan yang paling sering dipakai</p>
                </div>
                <div className="divide-y divide-[#EEF3F8] text-xs max-h-80 overflow-y-auto">
                  {waBreakdownStats.byTemplate.length === 0 ? (
                    <div className="p-5 text-center text-[#8FA4BF]">Belum ada data penggunaan templat.</div>
                  ) : (
                    waBreakdownStats.byTemplate.map((row) => (
                      <div key={row.id} className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-[#F0F5FA]/50 transition-colors">
                        <span className="font-semibold text-[#17243D] truncate">{row.label}</span>
                        <span className="font-mono font-bold text-[#008F63] tabular-nums shrink-0">
                          {row.clicks} klik
                        </span>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {activeViewTab === 'produk_formulir' && (
            <div className="space-y-4">
              <div className="bg-white rounded-xl border border-[#DCE5EF] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#DCE5EF]">
                  <h3 className="text-xs font-bold text-[#17243D]">Statistik per Produk</h3>
                  <p className="text-[11px] text-[#5B708B] mt-0.5">Produk yang paling banyak diminati melalui klik WhatsApp / Keranjang</p>
                </div>
                <div className="divide-y divide-[#EEF3F8] text-xs">
                  {waBreakdownStats.byProduct.length === 0 ? (
                    <div className="p-5 text-center text-[#8FA4BF]">Belum ada klik produk tercatat.</div>
                  ) : (
                    waBreakdownStats.byProduct.map((p) => (
                      <div key={p.name} className="px-4 py-2.5 flex items-center justify-between gap-2 hover:bg-[#F0F5FA]/50 transition-colors">
                        <span className="font-semibold text-[#17243D] truncate">{p.name}</span>
                        <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums">
                          <span className="text-[#008F63] font-bold">{p.clicks} klik</span>
                          {p.value > 0 && (
                            <span className="text-[#5B708B]">{formatRupiah(p.value)}</span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="bg-white rounded-xl border border-[#DCE5EF] overflow-hidden">
                <div className="px-4 py-3 border-b border-[#DCE5EF]">
                  <h3 className="text-xs font-bold text-[#17243D] tabular-nums">
                    Data Kiriman Formulir Tersimpan ({filteredFormSubmissions.length})
                  </h3>
                  <p className="text-[11px] text-[#5B708B] mt-0.5 tabular-nums">
                    Formulir dibuka: {kpis.formOpens} · Formulir dikirim: {kpis.formSubmits}
                  </p>
                </div>
                {filteredFormSubmissions.length === 0 ? (
                  <div className="p-6 text-center text-xs text-[#8FA4BF]">
                    Belum ada data pengiriman formulir pada filter ini.
                  </div>
                ) : (
                  <div className="divide-y divide-[#EEF3F8] text-xs max-h-96 overflow-y-auto">
                    {filteredFormSubmissions.slice(0, 50).map((sub) => (
                      <div key={sub.id} className="px-4 py-3 space-y-1.5 hover:bg-[#F0F5FA]/40 transition-colors">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-bold text-[#17243D]">
                            {sub.formTitle} · {sub.projectTitle}
                          </span>
                          <span className="text-[11px] font-mono text-[#8FA4BF] tabular-nums">
                            {formatDateTimeShort(sub.createdAt)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5">
                          {Object.entries(sub.values).map(([k, v]) => (
                            <span
                              key={k}
                              className="px-2 py-0.5 rounded-md bg-[#F0F5FA] border border-[#DCE5EF] text-[11px] text-[#17243D]"
                            >
                              <strong className="text-[#5B708B]">{k}:</strong>{' '}
                              {Array.isArray(v) ? v.join(', ') : String(v)}
                            </span>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeViewTab === 'ringkasan' && (
          <>

          {/* Trend Chart + Channel Attribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl border border-[#DCE5EF] p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-xs font-bold text-[#17243D]">
                    Tren Kunjungan vs Klik WhatsApp
                  </h3>
                  <p className="text-[11px] text-[#5B708B] mt-0.5">
                    Perbandingan harian trafik masuk dan konversi tombol WA
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-medium text-[#5B708B]">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#CBD8E6] inline-block" />
                    Kunjungan
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-[#00C98A] inline-block" />
                    Klik WA
                  </span>
                </div>
              </div>

              <div className="h-44 flex items-end gap-2 pt-4 border-t border-[#EEF3F8]">
                {dailyTrend.map((day) => {
                  const viewH = Math.max(day.views > 0 ? 6 : 2, Math.round((day.views / maxTrendValue) * 128));
                  const clickH = Math.max(day.clicks > 0 ? 6 : 2, Math.round((day.clicks / maxTrendValue) * 128));
                  return (
                    <div
                      key={day.key}
                      className="flex-1 min-w-0 flex flex-col items-center justify-end gap-1.5"
                      title={`${day.label}: ${day.views} kunjungan, ${day.clicks} klik WA`}
                    >
                      <div className="w-full flex items-end justify-center gap-1 h-32">
                        <div
                          style={{ height: `${viewH}px` }}
                          className="w-2.5 sm:w-3.5 rounded-t bg-[#CBD8E6] transition-all"
                        />
                        <div
                          style={{ height: `${clickH}px` }}
                          className="w-2.5 sm:w-3.5 rounded-t bg-[#00C98A] transition-all"
                        />
                      </div>
                      <div className="text-[10px] font-medium text-[#5B708B] truncate w-full text-center tabular-nums">
                        {day.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Channel Attribution */}
            <div className="bg-white rounded-xl border border-[#DCE5EF] p-4 space-y-3">
              <div>
                <h3 className="text-xs font-bold text-[#17243D]">Sumber Iklan (Atribusi Klik WA)</h3>
                <p className="text-[11px] text-[#5B708B] mt-0.5">
                  Deteksi otomatis UTM &amp; click ID Meta, TikTok, Google
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {channelBreakdown.map((ch) => (
                  <div key={ch.channel} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-[#17243D] truncate">{ch.label}</span>
                      <span className="font-mono text-[#17243D] font-semibold tabular-nums shrink-0">
                        {ch.clicks} klik ({ch.sharePct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-[#F0F5FA] rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${ch.sharePct}%`,
                          backgroundColor: ch.color,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-[#8FA4BF] tabular-nums">
                      {ch.views} kunjungan
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Per Business Unit Table */}
          <div className="bg-white rounded-xl border border-[#DCE5EF] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#DCE5EF] flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-[#17243D]">
                  Performa Trafik Klik WA per Unit Usaha
                </h3>
                <p className="text-[11px] text-[#5B708B] mt-0.5">
                  Klik salah satu baris untuk memfilter detail trafik unit usaha tersebut.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-[#DCE5EF] bg-[#F0F5FA]/70 text-[11px] font-semibold text-[#5B708B]">
                    <th className="py-2.5 px-4">Unit Usaha</th>
                    <th className="py-2.5 px-3">Slug / Domain</th>
                    <th className="py-2.5 px-3 text-right">Kunjungan</th>
                    <th className="py-2.5 px-3 text-right">Klik WA</th>
                    <th className="py-2.5 px-3 text-right">CTR</th>
                    <th className="py-2.5 px-3">Sumber Teratas</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EEF3F8] text-xs">
                  {perUnitSummary.map((row) => {
                    const ctr = row.views > 0 ? ((row.waClicks / row.views) * 100).toFixed(1) : '0.0';
                    const topCh = (Object.entries(row.channelCounts) as [AdChannel, number][])
                      .sort((a, b) => b[1] - a[1])[0];
                    const topLabel = topCh && topCh[1] > 0 ? AD_CHANNEL_META[topCh[0]].shortLabel : '—';
                    const isSelected = selectedProjectFilter === row.projectId;

                    return (
                      <tr
                        key={row.projectId}
                        onClick={() =>
                          setSelectedProjectFilter((prev) =>
                            prev === row.projectId ? 'all' : row.projectId
                          )
                        }
                        className={`cursor-pointer transition-colors ${
                          isSelected ? 'bg-[#ECFDF6]/70' : 'hover:bg-[#F0F5FA]/50'
                        }`}
                      >
                        <td className="py-2.5 px-4 font-semibold text-[#17243D]">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[180px]">{row.title}</span>
                            {row.projectId === activeProjectId && (
                              <span className="text-[10.5px] font-semibold text-[#008F63]">
                                · Aktif
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-[#5B708B]">
                          {row.domain}
                          <span className="text-[#8FA4BF]">
                            {' '}
                            · {row.isPublished ? 'Tayang' : 'Draf'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#17243D]">
                          {row.views}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-[#008F63]">
                          {row.waClicks}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-[#17243D]">
                          {ctr}%
                        </td>
                        <td className="py-2.5 px-3 text-[#5B708B]">{topLabel}</td>
                        <td
                          className="py-2.5 px-4 text-right whitespace-nowrap"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center gap-1.5">
                            {onOpenDomainSettings && (
                              <button
                                type="button"
                                onClick={() => {
                                  if (onSelectProject) onSelectProject(row.projectId);
                                  if (!asPage) onClose();
                                  onOpenDomainSettings(row.projectId);
                                }}
                                className="px-2.5 py-1 rounded-lg border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] hover:border-[#8FA4BF] text-[11px] font-semibold text-[#17243D] transition-colors cursor-pointer"
                              >
                                Atur
                              </button>
                            )}
                            <a
                              href={`/p/${row.slug}?preview=1`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#00C98A]/35 bg-[#ECFDF6] hover:bg-[#00C98A]/15 text-[11px] font-semibold text-[#008F63] transition-colors"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>Buka</span>
                            </a>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* WA Click Log */}
          <div className="bg-white rounded-xl border border-[#DCE5EF] overflow-hidden">
            <div className="px-4 py-3 border-b border-[#DCE5EF] flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-[#17243D] tabular-nums">
                  Log Klik WhatsApp Pengunjung ({waClickLogs.length})
                </h3>
                <p className="text-[11px] text-[#5B708B] mt-0.5">
                  Mencatat klik dari tombol link, katalog WA, Add-On WA Meta, dan uji Pratinjau.
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-[#8FA4BF] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari unit usaha, campaign, tombol..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-xl border border-[#DCE5EF] bg-[#F0F5FA]/50 focus:bg-white text-xs text-[#17243D] placeholder:text-[#8FA4BF] outline-none focus:border-[#00C98A] transition-colors"
                />
              </div>
            </div>

            {waClickLogs.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-[#F0F5FA] border border-[#DCE5EF] text-[#8FA4BF] flex items-center justify-center mx-auto">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-[#17243D]">
                  Belum ada klik WhatsApp pada filter ini
                </div>
                <p className="text-[11px] text-[#5B708B] max-w-md mx-auto">
                  Setiap kali pengunjung membuka link live <span className="font-mono text-[#17243D]">/p/slug</span> atau menekan tombol WhatsApp di mode Pratinjau, trafiknya akan langsung muncul di sini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-[#DCE5EF] bg-[#F0F5FA]/70 text-[11px] font-semibold text-[#5B708B]">
                      <th className="py-2 px-4">Waktu</th>
                      <th className="py-2 px-3">Unit Usaha</th>
                      <th className="py-2 px-3">Tombol / Aksi WA</th>
                      <th className="py-2 px-3">Sumber Iklan</th>
                      <th className="py-2 px-3">Campaign</th>
                      <th className="py-2 px-4 text-right">Perangkat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#EEF3F8] text-xs">
                    {waClickLogs.map((ev) => (
                      <tr key={ev.id} className="hover:bg-[#F0F5FA]/50 transition-colors">
                        <td className="py-2 px-4 font-mono text-[11px] text-[#5B708B] tabular-nums whitespace-nowrap">
                          {formatDateTimeShort(ev.createdAt)}
                        </td>
                        <td className="py-2 px-3 font-semibold text-[#17243D] whitespace-nowrap">
                          {ev.projectTitle}
                        </td>
                        <td className="py-2 px-3 text-[#17243D]">
                          <span className="truncate block max-w-[220px]">
                            {ev.ctaLabel || 'Tombol WhatsApp'}
                            {ev.orderValue && ev.orderValue > 0
                              ? ` · ${formatRupiah(ev.orderValue)}`
                              : ''}
                          </span>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="font-medium text-[#17243D]">
                            {AD_CHANNEL_META[ev.channel]?.shortLabel || ev.sourceLabel}
                          </span>
                          {ev.isTest && (
                            <span className="text-[10.5px] text-amber-700 ml-1">· Pratinjau</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-[#5B708B]">
                          {ev.utmCampaign || '—'}
                        </td>
                        <td className="py-2 px-4 text-right text-[11px] text-[#5B708B] capitalize">
                          {ev.deviceType}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </>
          )}
        </div>
      </div>
  );

  if (asPage) {
    return (
      <div className="flex-1 h-full flex flex-col bg-[#F0F5FA] p-4 sm:p-6 overflow-hidden">
        {cardContent}
      </div>
    );
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#17243D]/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
    >
      {cardContent}
    </div>
  );
}
