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
import { AdChannel, AnalyticsEventRecord, ProjectRecord } from '../types/builder';
import {
  clearAnalyticsOnServer,
  fetchAnalyticsSummary,
} from '../utils/analyticsClient';
import { formatRupiah } from '../utils/cartHelpers';
import { AD_CHANNEL_META, resolveProjectPublishing } from '../utils/publishingHelpers';
import { downloadTextFile } from '../utils/projectStorage';

type TimeRange = 'today' | '7d' | '30d' | 'all';

interface WaTrafficDashboardModalProps {
  projects: ProjectRecord[];
  activeProjectId: string;
  onSelectProject?: (projectId: string) => void;
  onOpenDomainSettings?: (projectId: string) => void;
  onClose: () => void;
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
  onClose,
}: WaTrafficDashboardModalProps) {
  const [events, setEvents] = useState<AnalyticsEventRecord[]>([]);
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
    const res = await fetchAnalyticsSummary();
    setEvents(res.events);
    setCapiConfigured(res.capiConfiguredOnServer);
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
    let formSubmits = 0;
    let totalOrderValue = 0;

    for (const ev of filteredEvents) {
      if (ev.eventType === 'page_view') pageViews += 1;
      else if (ev.eventType === 'wa_click') {
        waClicks += 1;
        if (typeof ev.orderValue === 'number' && ev.orderValue > 0) {
          totalOrderValue += ev.orderValue;
        }
      } else if (ev.eventType === 'form_submit') {
        formSubmits += 1;
      }
    }

    const ctr = pageViews > 0 ? Math.min(100, (waClicks / pageViews) * 100) : 0;
    return { pageViews, waClicks, formSubmits, totalOrderValue, ctr };
  }, [filteredEvents]);

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

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-6xl h-[92vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        {/* Header */}
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3 bg-white shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm font-bold text-slate-900 truncate">
                Dashboard Trafik Klik WhatsApp & Iklan
              </h2>
              <div className="flex items-center gap-2 text-[11px] text-slate-500">
                <span>{projects.length} unit usaha</span>
                <span aria-hidden="true">·</span>
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
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 disabled:opacity-40 text-xs font-semibold text-slate-700 cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Ekspor CSV</span>
            </button>
            <button
              type="button"
              onClick={() => void refreshData()}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer whitespace-nowrap"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Segarkan</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup dashboard"
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Filter Bar */}
        <div className="px-5 py-2.5 border-b border-slate-200 bg-slate-50/70 flex flex-wrap items-center justify-between gap-2.5 shrink-0">
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={selectedProjectFilter}
              onChange={(e) => setSelectedProjectFilter(e.target.value)}
              aria-label="Filter Unit Usaha"
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-semibold text-slate-700 outline-none focus:border-emerald-500"
            >
              <option value="all">Semua Unit Usaha ({projects.length})</option>
              {projects.map((rec) => (
                <option key={rec.id} value={rec.id}>
                  {rec.project.title}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-0.5 p-0.5 bg-slate-200/70 rounded-lg">
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
                  className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    timeRange === rng.id
                      ? 'bg-white text-slate-900 shadow-2xs'
                      : 'text-slate-600 hover:text-slate-900'
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
              className="px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white text-xs font-medium text-slate-700 outline-none focus:border-emerald-500"
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
            <label className="inline-flex items-center gap-1.5 text-xs text-slate-600 cursor-pointer whitespace-nowrap">
              <input
                type="checkbox"
                checked={includeTest}
                onChange={(e) => setIncludeTest(e.target.checked)}
                className="rounded border-slate-300 text-emerald-600 cursor-pointer"
              />
              <span>Sertakan Uji Preview</span>
            </label>

            {confirmClear ? (
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => void handleClearLogs()}
                  className="px-2.5 py-1 rounded-lg bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                >
                  Yakin Reset
                </button>
                <button
                  type="button"
                  onClick={() => setConfirmClear(false)}
                  className="px-2 py-1 rounded-lg border border-slate-200 bg-white text-slate-600 text-xs cursor-pointer"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => setConfirmClear(true)}
                disabled={events.length === 0}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-red-50 hover:text-red-600 disabled:opacity-40 text-xs font-medium text-slate-600 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Reset Data</span>
              </button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#F7F9F8]">
          {/* 4 KPI Strip */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-medium text-slate-500">Kunjungan Halaman</div>
              <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {kpis.pageViews.toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Total page view tercatat</div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-medium text-slate-500">Total Klik WhatsApp</div>
              <div className="text-2xl font-bold text-emerald-700 mt-1 tabular-nums">
                {kpis.waClicks.toLocaleString('id-ID')}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Tombol WA, Katalog & Add-On
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-medium text-slate-500">Rasio Klik WA (CTR)</div>
              <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums">
                {kpis.ctr.toFixed(1)}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Form masuk: <span className="tabular-nums">{kpis.formSubmits}</span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-4">
              <div className="text-xs font-medium text-slate-500">Estimasi Order WA</div>
              <div className="text-2xl font-bold text-slate-900 mt-1 tabular-nums truncate">
                {formatRupiah(kpis.totalOrderValue)}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Dari checkout katalog & detail</div>
            </div>
          </div>

          {/* Trend Chart + Channel Attribution */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            <div className="lg:col-span-2 bg-white rounded-xl border border-slate-200 p-4 flex flex-col justify-between">
              <div className="flex items-center justify-between gap-2 mb-4">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Tren Kunjungan vs Klik WhatsApp
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Perbandingan harian trafik masuk dan konversi tombol WA
                  </p>
                </div>
                <div className="flex items-center gap-3 text-[11px] font-medium text-slate-600">
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-slate-300 inline-block" />
                    Kunjungan
                  </span>
                  <span className="inline-flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-xs bg-emerald-600 inline-block" />
                    Klik WA
                  </span>
                </div>
              </div>

              <div className="h-44 flex items-end gap-2 pt-4 border-t border-slate-100">
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
                          className="w-2.5 sm:w-3.5 rounded-t bg-slate-200 transition-all"
                        />
                        <div
                          style={{ height: `${clickH}px` }}
                          className="w-2.5 sm:w-3.5 rounded-t bg-emerald-600 transition-all"
                        />
                      </div>
                      <div className="text-[10px] font-medium text-slate-500 truncate w-full text-center tabular-nums">
                        {day.label}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Channel Attribution */}
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
              <div>
                <h3 className="text-xs font-bold text-slate-900">Sumber Iklan (Atribusi Klik WA)</h3>
                <p className="text-[11px] text-slate-500">
                  Deteksi otomatis UTM & click ID Meta, TikTok, Google
                </p>
              </div>

              <div className="space-y-3 pt-1">
                {channelBreakdown.map((ch) => (
                  <div key={ch.channel} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700 truncate">{ch.label}</span>
                      <span className="font-mono text-slate-900 font-semibold tabular-nums shrink-0">
                        {ch.clicks} klik ({ch.sharePct}%)
                      </span>
                    </div>
                    <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${ch.sharePct}%`,
                          backgroundColor: ch.color,
                        }}
                      />
                    </div>
                    <div className="text-[10px] text-slate-400 tabular-nums">
                      {ch.views} kunjungan
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Per Business Unit Table */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Performa Trafik Klik WA per Unit Usaha
                </h3>
                <p className="text-[11px] text-slate-500">
                  Klik salah satu baris untuk memfilter detail trafik unit usaha tersebut.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                    <th className="py-2.5 px-4">Unit Usaha</th>
                    <th className="py-2.5 px-3">Slug / Domain</th>
                    <th className="py-2.5 px-3 text-right">Kunjungan</th>
                    <th className="py-2.5 px-3 text-right">Klik WA</th>
                    <th className="py-2.5 px-3 text-right">CTR</th>
                    <th className="py-2.5 px-3">Sumber Teratas</th>
                    <th className="py-2.5 px-4 text-right">Aksi</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
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
                          isSelected ? 'bg-emerald-50/60' : 'hover:bg-slate-50'
                        }`}
                      >
                        <td className="py-2.5 px-4 font-semibold text-slate-900">
                          <div className="flex items-center gap-2">
                            <span className="truncate max-w-[180px]">{row.title}</span>
                            {row.projectId === activeProjectId && (
                              <span className="text-[10px] font-medium text-emerald-700">
                                · Aktif
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5 px-3 font-mono text-[11px] text-slate-600">
                          {row.domain}
                          <span className="text-slate-400">
                            {' '}
                            · {row.isPublished ? 'Tayang' : 'Draft'}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {row.views}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums font-bold text-emerald-700">
                          {row.waClicks}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono tabular-nums text-slate-700">
                          {ctr}%
                        </td>
                        <td className="py-2.5 px-3 text-slate-700">{topLabel}</td>
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
                                  onClose();
                                  onOpenDomainSettings(row.projectId);
                                }}
                                className="px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-semibold text-slate-700 cursor-pointer"
                              >
                                Atur
                              </button>
                            )}
                            <a
                              href={`/p/${row.slug}?preview=1`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-slate-200 bg-white hover:bg-emerald-50 text-[11px] font-semibold text-emerald-700"
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
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="text-xs font-bold text-slate-900">
                  Log Klik WhatsApp Pengunjung ({waClickLogs.length})
                </h3>
                <p className="text-[11px] text-slate-500">
                  Mencatat klik dari tombol link, katalog WA, Add-On WA Meta, dan uji Preview.
                </p>
              </div>
              <div className="relative w-full sm:w-64">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Cari unit usaha, campaign, tombol..."
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 text-xs text-slate-800 outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            {waClickLogs.length === 0 ? (
              <div className="p-8 text-center space-y-2">
                <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto">
                  <MessageCircle className="w-5 h-5" />
                </div>
                <div className="text-xs font-bold text-slate-800">
                  Belum ada klik WhatsApp pada filter ini
                </div>
                <p className="text-[11px] text-slate-500 max-w-md mx-auto">
                  Setiap kali pengunjung membuka link live <span className="font-mono">/p/slug</span> atau menekan tombol WhatsApp di mode Preview, trafiknya akan langsung muncul di sini.
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 bg-slate-50/70 text-[11px] font-semibold text-slate-500">
                      <th className="py-2 px-4">Waktu</th>
                      <th className="py-2 px-3">Unit Usaha</th>
                      <th className="py-2 px-3">Tombol / Aksi WA</th>
                      <th className="py-2 px-3">Sumber Iklan</th>
                      <th className="py-2 px-3">Campaign</th>
                      <th className="py-2 px-4 text-right">Perangkat</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs">
                    {waClickLogs.map((ev) => (
                      <tr key={ev.id} className="hover:bg-slate-50/70">
                        <td className="py-2 px-4 font-mono text-[11px] text-slate-600 tabular-nums whitespace-nowrap">
                          {formatDateTimeShort(ev.createdAt)}
                        </td>
                        <td className="py-2 px-3 font-semibold text-slate-800 whitespace-nowrap">
                          {ev.projectTitle}
                        </td>
                        <td className="py-2 px-3 text-slate-700">
                          <span className="truncate block max-w-[220px]">
                            {ev.ctaLabel || 'Tombol WhatsApp'}
                            {ev.orderValue && ev.orderValue > 0
                              ? ` · ${formatRupiah(ev.orderValue)}`
                              : ''}
                          </span>
                        </td>
                        <td className="py-2 px-3 whitespace-nowrap">
                          <span className="font-medium text-slate-800">
                            {AD_CHANNEL_META[ev.channel]?.shortLabel || ev.sourceLabel}
                          </span>
                          {ev.isTest && (
                            <span className="text-[10px] text-amber-700 ml-1">· Preview</span>
                          )}
                        </td>
                        <td className="py-2 px-3 font-mono text-[11px] text-slate-500">
                          {ev.utmCampaign || '—'}
                        </td>
                        <td className="py-2 px-4 text-right text-[11px] text-slate-500 capitalize">
                          {ev.deviceType}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
