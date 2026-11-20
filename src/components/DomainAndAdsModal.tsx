import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  ExternalLink,
  Globe,
  Megaphone,
  MessageCircle,
  Save,
  Sparkles,
  X,
} from 'lucide-react';
import {
  AdChannel,
  MetaWaEventName,
  ProjectAdsConfig,
  ProjectPublishingConfig,
  ProjectRecord,
} from '../types/builder';
import {
  AD_CHANNEL_META,
  buildAdCampaignUrl,
  buildLiveUrls,
  isValidCustomDomain,
  normalizeCustomDomain,
  resolveProjectAds,
  resolveProjectPublishing,
  sanitizeSlug,
} from '../utils/publishingHelpers';
import { copyTextToClipboard } from '../utils/clipboardHelpers';

export type DomainAndAdsTab = 'domain' | 'pixels' | 'wa_addon';

interface DomainAndAdsModalProps {
  activeRecord: ProjectRecord;
  allProjects: ProjectRecord[];
  onApplySettings: (
    nextPublishing: ProjectPublishingConfig,
    nextAdsConfig: ProjectAdsConfig,
    publishNow: boolean
  ) => Promise<{ ok: boolean; error?: string }>;
  onClose?: () => void;
  asPage?: boolean;
  visibleTabs?: DomainAndAdsTab[];
  initialTab?: DomainAndAdsTab;
}

export function DomainAndAdsModal({
  activeRecord,
  allProjects,
  onApplySettings,
  onClose = () => {},
  asPage = false,
  visibleTabs,
  initialTab,
}: DomainAndAdsModalProps) {
  const allowedTabs: DomainAndAdsTab[] =
    visibleTabs && visibleTabs.length > 0 ? visibleTabs : ['domain', 'pixels', 'wa_addon'];
  const [tab, setTab] = useState<DomainAndAdsTab>(() => {
    if (initialTab && allowedTabs.includes(initialTab)) return initialTab;
    return allowedTabs[0];
  });
  const [pub, setPub] = useState<ProjectPublishingConfig>(() =>
    resolveProjectPublishing(activeRecord.project)
  );
  const [ads, setAds] = useState<ProjectAdsConfig>(() =>
    resolveProjectAds(activeRecord.project)
  );
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const isDirtyRef = useRef(false);
  const lastProjectIdRef = useRef(activeRecord.id);

  const updatePub = (
    updater:
      | ProjectPublishingConfig
      | ((prev: ProjectPublishingConfig) => ProjectPublishingConfig)
  ) => {
    isDirtyRef.current = true;
    setPub(updater);
  };

  const updateAds = (
    updater: ProjectAdsConfig | ((prev: ProjectAdsConfig) => ProjectAdsConfig)
  ) => {
    isDirtyRef.current = true;
    setAds(updater);
  };

  useEffect(() => {
    const projectSwitched = lastProjectIdRef.current !== activeRecord.id;
    if (projectSwitched) {
      lastProjectIdRef.current = activeRecord.id;
      isDirtyRef.current = false;
      setFeedback(null);
    }
    if (projectSwitched || !isDirtyRef.current) {
      setPub(resolveProjectPublishing(activeRecord.project));
      setAds(resolveProjectAds(activeRecord.project));
    }
  }, [activeRecord.id, activeRecord.revision, activeRecord.lastSavedAt, activeRecord.project]);

  useEffect(() => {
    if (!allowedTabs.includes(tab)) {
      setTab(allowedTabs[0]);
    }
  }, [tab, allowedTabs]);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [capiReady, setCapiReady] = useState<boolean | null>(null);
  const [serverAppUrl, setServerAppUrl] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (!active || !data) return;
        if (typeof data.capiConfigured === 'boolean') {
          setCapiReady(data.capiConfigured);
        }
        if (typeof data.appUrl === 'string' && data.appUrl) {
          setServerAppUrl(data.appUrl);
        }
      })
      .catch(() => {
        if (active) setCapiReady(null);
      });
    return () => {
      active = false;
    };
  }, []);

  // UTM Campaign Builder state
  const [utmChannel, setUtmChannel] = useState<Exclude<AdChannel, 'organic'>>('meta_wa_addon');
  const [utmCampaign, setUtmCampaign] = useState('promo-utama');
  const [utmContent, setUtmContent] = useState('video-1');

  const isVirtualAiStudioHost =
    typeof window !== 'undefined' && window.location.hostname.endsWith('.ai.studio');
  const origin =
    isVirtualAiStudioHost && serverAppUrl
      ? serverAppUrl
      : typeof window !== 'undefined'
      ? window.location.origin
      : 'https://app.domain';
  const urls = useMemo(() => buildLiveUrls(pub, origin), [pub, origin]);
  const cleanSlug = sanitizeSlug(pub.slug, 'unit-usaha');
  const cleanDomain = normalizeCustomDomain(pub.customDomain);
  const domainValid = isValidCustomDomain(cleanDomain);

  const slugConflictProject = useMemo(() => {
    return allProjects.find(
      (rec) =>
        rec.id !== activeRecord.id &&
        sanitizeSlug(rec.project.publishing?.slug || rec.project.title, '') === cleanSlug
    );
  }, [allProjects, activeRecord.id, cleanSlug]);

  const campaignUrl = useMemo(
    () => buildAdCampaignUrl(urls.primaryUrl, utmChannel, utmCampaign, utmContent),
    [urls.primaryUrl, utmChannel, utmCampaign, utmContent]
  );

  const handleCopy = async (key: string, text: string) => {
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1800);
    }
  };

  const handleSubmit = async (publishNow: boolean) => {
    const validateDomainTab = allowedTabs.includes('domain');
    if (validateDomainTab && slugConflictProject) {
      setFeedback({
        type: 'err',
        text: `Slug "/p/${cleanSlug}" sudah dipakai oleh "${slugConflictProject.project.title}". Pilih slug lain.`,
      });
      setTab('domain');
      return;
    }
    if (validateDomainTab && pub.useCustomDomain && (!cleanDomain || !domainValid)) {
      setFeedback({
        type: 'err',
        text: 'Format domain kustom belum valid (contoh: promo.tokokopi.id).',
      });
      setTab('domain');
      return;
    }

    setSaving(true);
    setFeedback(null);
    const nextPub: ProjectPublishingConfig = {
      ...pub,
      slug: cleanSlug,
      customDomain: cleanDomain,
      isPublished: publishNow ? true : pub.isPublished,
      publishedAt: publishNow ? Date.now() : pub.publishedAt,
    };
    const res = await onApplySettings(nextPub, ads, publishNow);
    setSaving(false);

    if (res.ok) {
      isDirtyRef.current = false;
      setPub(nextPub);
      setFeedback({
        type: 'ok',
        text: publishNow
          ? `Tersimpan & Tayang di ${urls.internalPath}`
          : validateDomainTab
          ? 'Pengaturan domain, slug & tracking berhasil disimpan.'
          : 'Pengaturan Pixel Iklan & Add-On WhatsApp berhasil disimpan.',
      });
    } else {
      setFeedback({
        type: 'err',
        text: res.error || 'Gagal menyimpan pengaturan.',
      });
    }
  };

  const sampleWaAttribution = ads.appendAdAttributionToWa
    ? `\n\n[Sumber: ${AD_CHANNEL_META[utmChannel].shortLabel} · ${sanitizeSlug(utmCampaign || 'promo-utama', 'promo-utama')}]`
    : '';

  const cardContent = (
    <div
      onClick={(e) => {
        if (!asPage) e.stopPropagation();
      }}
      className={
        asPage
          ? 'w-full max-w-4xl mx-auto flex-1 min-h-0 flex flex-col bg-white rounded-2xl border border-[#DCE5EF] shadow-xs overflow-hidden'
          : 'w-full max-w-3xl max-h-[90vh] flex flex-col bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden'
      }
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between gap-3 bg-slate-50/70 shrink-0">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-[#17243D] truncate">
              {allowedTabs.length === 1 && allowedTabs[0] === 'domain'
                ? 'Domain & Slug Publik'
                : !allowedTabs.includes('domain')
                ? 'Tracking Iklan, Pixel & Add-On WhatsApp'
                : 'Domain, Slug & Tracking Iklan'}
            </h2>
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-md border ${
                pub.isPublished
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-slate-100 text-slate-600 border-slate-200'
              }`}
            >
              {pub.isPublished ? 'Tayang Publik' : 'Draft'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5 truncate">
            Unit Usaha: <strong className="text-slate-700">{activeRecord.project.title}</strong>
          </p>
        </div>
        {!asPage && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup pengaturan"
            className="p-1.5 rounded-lg hover:bg-slate-200/70 text-slate-500 cursor-pointer shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Navigation Tabs */}
      {allowedTabs.length > 1 && (
        <div className="px-5 py-2.5 border-b border-slate-200 bg-white flex items-center gap-1.5 overflow-x-auto shrink-0">
          {allowedTabs.includes('domain') && (
            <button
              type="button"
              onClick={() => setTab('domain')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === 'domain'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-600 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Domain & Slug</span>
            </button>
          )}
          {allowedTabs.includes('pixels') && (
            <button
              type="button"
              onClick={() => setTab('pixels')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === 'pixels'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-600 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <Megaphone className="w-3.5 h-3.5" />
              <span>Pixel Meta, TikTok & Google</span>
            </button>
          )}
          {allowedTabs.includes('wa_addon') && (
            <button
              type="button"
              onClick={() => setTab('wa_addon')}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                tab === 'wa_addon'
                  ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  : 'text-slate-600 hover:bg-slate-100 border border-transparent'
              }`}
            >
              <MessageCircle className="w-3.5 h-3.5" />
              <span>Add-On WA Meta</span>
            </button>
          )}
        </div>
      )}

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 bg-[#F7F9F8]">
          {tab === 'domain' && (
            <>
              {/* Slug & Live URL */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Slug URL Unit Usaha</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Alamat unik per unit usaha agar bisa langsung dibuka dari HP, iklan Meta, TikTok, dan Google.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pub.isPublished}
                      onChange={(e) => updatePub((prev) => ({ ...prev, isPublished: e.target.checked }))}
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Tayang Publik</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Slug Halaman
                  </label>
                  <div className="flex items-center rounded-xl border border-slate-200 bg-slate-50 overflow-hidden focus-within:border-emerald-500 focus-within:bg-white">
                    <span className="px-3 py-2 text-xs font-mono text-slate-500 border-r border-slate-200 bg-slate-100/80 select-none shrink-0">
                      {origin.replace(/^https?:\/\//, '')}/p/
                    </span>
                    <input
                      type="text"
                      value={pub.slug}
                      onChange={(e) =>
                        updatePub((prev) => ({
                          ...prev,
                          slug: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'),
                        }))
                      }
                      onBlur={() => updatePub((prev) => ({ ...prev, slug: cleanSlug }))}
                      placeholder="kopi-senja-jakarta"
                      className="flex-1 px-3 py-2 text-xs font-mono text-slate-900 bg-transparent outline-none min-w-0"
                    />
                  </div>
                  {slugConflictProject && (
                    <p className="text-[11px] text-red-600 font-medium mt-1">
                      Slug ini sudah dipakai unit usaha "{slugConflictProject.project.title}".
                    </p>
                  )}
                </div>

                {pub.isPublished ? (
                  <div className="space-y-2.5">
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Tautan Live Bawaan
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-600">
                            Browser Mode
                          </span>
                        </div>
                        <a
                          href={
                            isVirtualAiStudioHost && serverAppUrl
                              ? urls.internalUrl
                              : urls.internalPath
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs font-mono text-emerald-700 hover:text-emerald-800 hover:underline truncate mt-0.5"
                        >
                          {urls.internalUrl}
                        </a>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy('live_url', urls.internalUrl)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
                        >
                          {copiedKey === 'live_url' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedKey === 'live_url' ? 'Tersalin' : 'Salin'}</span>
                        </button>
                        <a
                          href={
                            isVirtualAiStudioHost && serverAppUrl
                              ? urls.internalUrl
                              : urls.internalPath
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Buka Live</span>
                        </a>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Tautan Lihat Penuh
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-600">
                            Fullscreen Mode
                          </span>
                        </div>
                        <a
                          href={
                            isVirtualAiStudioHost && serverAppUrl
                              ? urls.internalFullUrl
                              : urls.internalFullPath
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs font-mono text-emerald-700 hover:text-emerald-800 hover:underline truncate mt-0.5"
                        >
                          {urls.internalFullUrl}
                        </a>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy('live_full_url', urls.internalFullUrl)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
                        >
                          {copiedKey === 'live_full_url' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedKey === 'live_full_url' ? 'Tersalin' : 'Salin'}</span>
                        </button>
                        <a
                          href={
                            isVirtualAiStudioHost && serverAppUrl
                              ? urls.internalFullUrl
                              : urls.internalFullPath
                          }
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Buka</span>
                        </a>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2.5">
                    <div className="p-3 rounded-xl bg-slate-50/70 border border-dashed border-slate-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Tautan Live Bawaan
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-500">
                            Browser Mode
                          </span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-[10px] font-semibold text-slate-600">
                          Draft · Nonaktif
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-400 truncate select-all">
                        {urls.internalUrl}
                      </div>
                    </div>

                    <div className="p-3 rounded-xl bg-slate-50/70 border border-dashed border-slate-200 space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-400">
                            Tautan Lihat Penuh
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-500">
                            Fullscreen Mode
                          </span>
                        </div>
                        <span className="px-1.5 py-0.5 rounded bg-slate-200/80 text-[10px] font-semibold text-slate-600">
                          Draft · Nonaktif
                        </span>
                      </div>
                      <div className="text-xs font-mono text-slate-400 truncate select-all">
                        {urls.internalFullUrl}
                      </div>
                    </div>

                    <p className="text-[11px] text-slate-500">
                      Publikasi sedang nonaktif. Aktifkan <span className="font-semibold text-slate-700">Tayang Publik</span> lalu simpan untuk mengaktifkan tautan live Browser Mode &amp; Fullscreen Mode.
                    </p>
                  </div>
                )}
                {isVirtualAiStudioHost && pub.isPublished && (
                  <div className="px-3 py-2 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                    Domain virtual <span className="font-mono font-semibold">lynk-builder.ai.studio</span> hanya label contoh di editor. Gunakan URL publik aktif di atas (<span className="font-mono">{urls.internalUrl}</span>) saat membagikan atau mengetes di tab baru.
                  </div>
                )}
              </div>

              {/* Domain Kustom */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">Domain Kustom Unit Usaha</h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Gunakan subdomain/domain brand sendiri (contoh: promo.tokoanda.com) untuk meningkatkan kepercayaan iklan.
                    </p>
                  </div>
                  <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={pub.useCustomDomain}
                      onChange={(e) =>
                        updatePub((prev) => ({ ...prev, useCustomDomain: e.target.checked }))
                      }
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                    <span>Aktifkan</span>
                  </label>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nama Domain / Subdomain
                  </label>
                  <input
                    type="text"
                    value={pub.customDomain}
                    onChange={(e) =>
                      updatePub((prev) => ({ ...prev, customDomain: e.target.value }))
                    }
                    onBlur={() =>
                      updatePub((prev) => ({
                        ...prev,
                        customDomain: normalizeCustomDomain(prev.customDomain),
                      }))
                    }
                    placeholder="order.usahaku.id"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-emerald-500"
                  />
                  {(pub.useCustomDomain || Boolean(pub.customDomain.trim())) && !domainValid && (
                    <p className="text-[11px] text-red-600 font-medium mt-1">
                      Masukkan nama domain valid tanpa https:// (contoh: promo.brandanda.com).
                    </p>
                  )}
                </div>

                {pub.useCustomDomain && cleanDomain && domainValid && pub.isPublished && urls.customUrl && urls.customFullUrl && (
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Tautan Domain Kustom
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-600">
                            Browser Mode
                          </span>
                        </div>
                        <a
                          href={urls.customUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs font-mono text-emerald-700 hover:text-emerald-800 hover:underline truncate mt-0.5"
                        >
                          {urls.customUrl}
                        </a>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy('custom_url', urls.customUrl || '')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
                        >
                          {copiedKey === 'custom_url' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedKey === 'custom_url' ? 'Tersalin' : 'Salin'}</span>
                        </button>
                        <a
                          href={urls.customUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Buka Live</span>
                        </a>
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-slate-50 border border-slate-200">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                            Tautan Lihat Penuh (Domain Kustom)
                          </span>
                          <span className="px-1.5 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-600">
                            Fullscreen Mode
                          </span>
                        </div>
                        <a
                          href={urls.customFullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-xs font-mono text-emerald-700 hover:text-emerald-800 hover:underline truncate mt-0.5"
                        >
                          {urls.customFullUrl}
                        </a>
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleCopy('custom_full_url', urls.customFullUrl || '')}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-xs font-semibold text-slate-700 cursor-pointer"
                        >
                          {copiedKey === 'custom_full_url' ? (
                            <Check className="w-3.5 h-3.5 text-emerald-600" />
                          ) : (
                            <Copy className="w-3.5 h-3.5" />
                          )}
                          <span>{copiedKey === 'custom_full_url' ? 'Tersalin' : 'Salin'}</span>
                        </button>
                        <a
                          href={urls.customFullUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Buka</span>
                        </a>
                      </div>
                    </div>
                  </div>
                )}

                {cleanDomain && domainValid && (
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2 text-[11px] text-slate-600">
                    <div className="font-semibold text-slate-800">
                      Panduan DNS (CNAME Record di Cloudflare / Niagahoster / DomaiNesia):
                    </div>
                    <div className="grid grid-cols-3 gap-2 font-mono bg-white p-2.5 rounded-lg border border-slate-200 text-[11px]">
                      <div>
                        <span className="text-slate-400 block text-[10px]">Type</span>
                        <span className="font-bold text-slate-800">CNAME</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-slate-400 block text-[10px]">Host / Name</span>
                        <span className="font-bold text-slate-800 truncate block">{cleanDomain}</span>
                      </div>
                      <div className="min-w-0">
                        <span className="text-slate-400 block text-[10px]">Target</span>
                        <span className="font-bold text-slate-800 truncate block">
                          {origin.replace(/^https?:\/\//, '')}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* SEO & UTM Link Generator untuk Iklan */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3.5">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Link Campaign Siap Pasang (UTM Tracker Iklan)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Buat link khusus untuk iklan Meta, TikTok, Google, atau Add-On WA agar sumber klik tercatat akurat di Dashboard.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Platform Iklan
                    </label>
                    <select
                      value={utmChannel}
                      onChange={(e) =>
                        setUtmChannel(e.target.value as Exclude<AdChannel, 'organic'>)
                      }
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-800 outline-none focus:border-emerald-500"
                    >
                      <option value="meta_wa_addon">Meta Add-On WA (CTWA)</option>
                      <option value="meta">Meta Ads (FB / IG)</option>
                      <option value="tiktok">TikTok Ads</option>
                      <option value="google">Google Ads</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Nama Campaign
                    </label>
                    <input
                      type="text"
                      value={utmCampaign}
                      onChange={(e) => setUtmCampaign(e.target.value)}
                      placeholder="promo-gajian"
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Variasi Iklan / Konten
                    </label>
                    <input
                      type="text"
                      value={utmContent}
                      onChange={(e) => setUtmContent(e.target.value)}
                      placeholder="video-testimoni-1"
                      className="w-full px-2.5 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200">
                  <code className="text-[11px] font-mono text-slate-700 truncate">
                    {campaignUrl}
                  </code>
                  <button
                    type="button"
                    onClick={() => handleCopy('utm_url', campaignUrl)}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-white text-[11px] font-semibold shrink-0 cursor-pointer"
                  >
                    {copiedKey === 'utm_url' ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Copy className="w-3 h-3" />
                    )}
                    <span>{copiedKey === 'utm_url' ? 'Tersalin' : 'Salin Link Iklan'}</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Judul Preview Link (SEO / Share WA)
                    </label>
                    <input
                      type="text"
                      value={pub.seoTitle ?? ''}
                      onChange={(e) => updatePub((prev) => ({ ...prev, seoTitle: e.target.value }))}
                      placeholder={activeRecord.project.title}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Deskripsi Singkat Link
                    </label>
                    <input
                      type="text"
                      value={pub.seoDescription ?? ''}
                      onChange={(e) =>
                        updatePub((prev) => ({ ...prev, seoDescription: e.target.value }))
                      }
                      placeholder={`Pesan cepat & promo resmi ${activeRecord.project.title}`}
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-800 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'pixels' && (
            <>
              {/* Meta Pixel & CAPI */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3.5">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="text-xs font-bold text-slate-900">
                      Meta Pixel (Facebook & Instagram Ads)
                    </h3>
                    <p className="text-[11px] text-slate-500 mt-0.5">
                      Otomatis menembakkan event PageView, ViewContent, AddToCart, dan event konversi saat pengunjung klik WhatsApp.
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Meta Pixel ID
                    </label>
                    <input
                      type="text"
                      value={ads.metaPixelId}
                      onChange={(e) =>
                        updateAds((prev) => ({
                          ...prev,
                          metaPixelId: e.target.value.replace(/[^0-9]/g, ''),
                        }))
                      }
                      placeholder="Contoh: 123456789012345"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Event Konversi Klik WA
                    </label>
                    <select
                      value={ads.metaWaEvent}
                      onChange={(e) =>
                        updateAds((prev) => ({
                          ...prev,
                          metaWaEvent: e.target.value as MetaWaEventName,
                        }))
                      }
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 bg-white text-xs text-slate-900 outline-none focus:border-emerald-500"
                    >
                      <option value="Lead">Lead (Direkomendasikan untuk Iklan WA)</option>
                      <option value="Contact">Contact</option>
                      <option value="InitiateCheckout">InitiateCheckout</option>
                      <option value="Purchase">Purchase</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Test Event Code (Opsional)
                    </label>
                    <input
                      type="text"
                      value={ads.metaTestEventCode ?? ''}
                      onChange={(e) =>
                        updateAds((prev) => ({ ...prev, metaTestEventCode: e.target.value }))
                      }
                      placeholder="TEST12345"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="flex flex-col justify-end">
                    <label className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                      <span className="text-xs font-semibold text-slate-700">
                        Aktifkan Bridge Server CAPI
                      </span>
                      <input
                        type="checkbox"
                        checked={ads.metaCapiForwarding}
                        onChange={(e) =>
                          updateAds((prev) => ({ ...prev, metaCapiForwarding: e.target.checked }))
                        }
                        className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                      />
                    </label>
                    <p className="text-[10px] text-slate-500 mt-1">
                      {capiReady
                        ? 'Token CAPI server aktif — event akan diteruskan ke Meta.'
                        : 'Sistem server siap (opsional). Akan aktif otomatis jika token META_CAPI_ACCESS_TOKEN dipasang.'}
                    </p>
                  </div>
                </div>
              </div>

              {/* TikTok Pixel */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">TikTok Pixel</h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Otomatis melacak PageView, ViewContent, AddToCart, SubmitForm, dan Contact saat tombol WhatsApp diklik.
                  </p>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    TikTok Pixel ID
                  </label>
                  <input
                    type="text"
                    value={ads.tiktokPixelId}
                    onChange={(e) =>
                      updateAds((prev) => ({ ...prev, tiktokPixelId: e.target.value.trim() }))
                    }
                    placeholder="Contoh: C9ABCDEFG1234567890"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-emerald-500"
                  />
                </div>
              </div>

              {/* Google Ads & GA4 & GTM */}
              <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Google Ads, Google Analytics 4 & Tag Manager
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Menembakkan event generate_lead dan konversi Google Ads saat pengunjung menekan tombol WhatsApp atau mengirim formulir.
                  </p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Google Tag ID (GA4 / AW)
                    </label>
                    <input
                      type="text"
                      value={ads.googleTagId}
                      onChange={(e) =>
                        updateAds((prev) => ({ ...prev, googleTagId: e.target.value.trim() }))
                      }
                      placeholder="G-XXXX atau AW-XXXX"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      Conversion Label (Opsional)
                    </label>
                    <input
                      type="text"
                      value={ads.googleAdsConversionLabel ?? ''}
                      onChange={(e) =>
                        updateAds((prev) => ({
                          ...prev,
                          googleAdsConversionLabel: e.target.value.trim(),
                        }))
                      }
                      placeholder="AbCdEfGhIjKlMnOp"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                      GTM Container ID (Opsional)
                    </label>
                    <input
                      type="text"
                      value={ads.gtmContainerId ?? ''}
                      onChange={(e) =>
                        updateAds((prev) => ({ ...prev, gtmContainerId: e.target.value.trim() }))
                      }
                      placeholder="GTM-XXXXXXX"
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>
              </div>
            </>
          )}

          {tab === 'wa_addon' && (
            <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-xs font-bold text-slate-900">
                    Add-On WhatsApp dari Meta (Click-to-WhatsApp)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Tambahkan tombol chat WhatsApp melayang di landing page dan catat sumber iklan Meta/TikTok/Google secara otomatis di pesan masuk CS.
                  </p>
                </div>
                <label className="inline-flex items-center gap-2 text-xs font-semibold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={ads.waAddonEnabled}
                    onChange={(e) =>
                      updateAds((prev) => ({ ...prev, waAddonEnabled: e.target.checked }))
                    }
                    className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                  />
                  <span>Tampilkan Tombol WA Melayang</span>
                </label>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                    Nomor WhatsApp Tujuan (Format 62...)
                  </label>
                  <input
                    type="text"
                    value={ads.waAddonNumber}
                    onChange={(e) =>
                      updateAds((prev) => ({ ...prev, waAddonNumber: e.target.value }))
                    }
                    placeholder="6281234567890"
                    className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs font-mono text-slate-900 outline-none focus:border-emerald-500"
                  />
                </div>
                <div className="flex items-end">
                  <label className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-slate-200 bg-slate-50 cursor-pointer">
                    <span className="text-xs font-semibold text-slate-700">
                      Sisipkan Sumber Iklan ke Pesan WA
                    </span>
                    <input
                      type="checkbox"
                      checked={ads.appendAdAttributionToWa}
                      onChange={(e) =>
                        updateAds((prev) => ({
                          ...prev,
                          appendAdAttributionToWa: e.target.checked,
                        }))
                      }
                      className="rounded border-slate-300 text-emerald-600 focus:ring-emerald-500 cursor-pointer"
                    />
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Teks Sapaan Otomatis (Pre-filled Chat Add-On WA)
                </label>
                <textarea
                  rows={3}
                  value={ads.waAddonGreeting ?? ''}
                  onChange={(e) =>
                    updateAds((prev) => ({ ...prev, waAddonGreeting: e.target.value }))
                  }
                  placeholder="Halo Admin, saya lihat promo dari iklan dan ingin konsultasi / order."
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-xs text-slate-900 outline-none focus:border-emerald-500"
                />
              </div>

              <div className="p-3.5 rounded-xl bg-emerald-50/70 border border-emerald-200 space-y-1.5">
                <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-800">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Simulasi Pesan yang Diterima Admin CS WhatsApp</span>
                </div>
                <pre className="text-xs text-slate-800 whitespace-pre-wrap font-sans bg-white p-3 rounded-lg border border-emerald-100 leading-relaxed">
                  {(ads.waAddonGreeting ?? '').trim() ||
                    `Halo ${activeRecord.project.title}, saya tertarik dengan penawaran di halaman ini.`}
                  {sampleWaAttribution}
                </pre>
              </div>
            </div>
          )}

          {feedback && (
            <div
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-medium ${
                feedback.type === 'ok'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : 'bg-red-50 border-red-200 text-red-700'
              }`}
            >
              {feedback.text}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-slate-200 bg-white flex flex-wrap items-center justify-between gap-2 shrink-0">
          <div className="text-[11px] text-slate-500">
            Semua tombol WA & form di unit usaha ini otomatis terhubung ke tracking di atas.
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {!asPage && (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Tutup
              </button>
            )}
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSubmit(false)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-emerald-200 bg-emerald-50 hover:bg-emerald-100 text-emerald-800 text-xs font-semibold disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Simpan</span>
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleSubmit(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
            >
              <Globe className="w-3.5 h-3.5" />
              <span>{saving ? 'Menyimpan...' : 'Simpan & Tayangkan'}</span>
            </button>
          </div>
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
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
    >
      {cardContent}
    </div>
  );
}
