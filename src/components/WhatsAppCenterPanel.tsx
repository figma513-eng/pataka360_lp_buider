import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Bold,
  Code,
  Copy,
  CornerDownLeft,
  Eye,
  Italic,
  Link2,
  List,
  ListOrdered,
  MessageCircle,
  Minus,
  Plus,
  Save,
  Smile,
  Strikethrough,
  Trash2,
} from 'lucide-react';
import type {
  AnalyticsEventRecord,
  WhatsappCenterConfig,
  WhatsappLinkItem,
  WhatsappTemplate,
  WhatsappTemplateType,
} from '../types/builder';
import { fetchAnalyticsSummary } from '../utils/analyticsClient';
import {
  WHATSAPP_EMOJI_SHORTCUTS,
  WHATSAPP_TEMPLATE_TYPE_LABELS,
  WHATSAPP_VARIABLE_GROUPS,
  WhatsappFormatAction,
  applyWhatsappFormat,
  buildWaMeUrl,
  buildWhatsappSampleContext,
  normalizeWaPhone,
  renderWhatsappTemplate,
} from '../utils/whatsappBuilder';

interface WhatsAppCenterPanelProps {
  projectId: string;
  config: WhatsappCenterConfig;
  canEdit: boolean;
  saving?: boolean;
  onChange: (next: WhatsappCenterConfig) => void;
  onSave: () => void;
}

type CenterSubTab = 'rekap' | 'tautan' | 'templat' | 'global';

const TEMPLATE_TYPES: WhatsappTemplateType[] = [
  'pesanan_baru',
  'checkout_keranjang',
  'pendaftaran',
  'booking',
  'konsultasi',
  'templat_khusus',
];

export function WhatsAppCenterPanel({
  projectId,
  config,
  canEdit,
  saving = false,
  onChange,
  onSave,
}: WhatsAppCenterPanelProps) {
  const [activeTab, setActiveTab] = useState<CenterSubTab>('rekap');
  const [events, setEvents] = useState<AnalyticsEventRecord[]>([]);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>(
    () => config.templates[0]?.id || ''
  );
  const [selectedVarGroup, setSelectedVarGroup] = useState<string>(
    WHATSAPP_VARIABLE_GROUPS[0].id
  );
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [previewLinkId, setPreviewLinkId] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  useEffect(() => {
    let active = true;
    void fetchAnalyticsSummary().then((res) => {
      if (active) setEvents(res.events);
    });
    return () => {
      active = false;
    };
  }, [projectId]);

  useEffect(() => {
    if (!config.templates.some((t) => t.id === selectedTemplateId)) {
      setSelectedTemplateId(config.templates[0]?.id || '');
    }
  }, [config.templates, selectedTemplateId]);

  const projectWaEvents = useMemo(
    () => events.filter((ev) => ev.projectId === projectId && ev.eventType === 'wa_click'),
    [events, projectId]
  );

  const clicksByLinkId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ev of projectWaEvents) {
      if (ev.waLinkId) {
        map[ev.waLinkId] = (map[ev.waLinkId] || 0) + 1;
      }
    }
    return map;
  }, [projectWaEvents]);

  const clicksByTemplateId = useMemo(() => {
    const map: Record<string, number> = {};
    for (const ev of projectWaEvents) {
      if (ev.waTemplateId) {
        map[ev.waTemplateId] = (map[ev.waTemplateId] || 0) + 1;
      }
    }
    return map;
  }, [projectWaEvents]);

  const stats = useMemo(() => {
    const totalLinks = config.links.length;
    const activeLinks = config.links.filter((l) => l.active).length;
    const inactiveLinks = totalLinks - activeLinks;
    const totalClicks = projectWaEvents.length;
    return { totalLinks, activeLinks, inactiveLinks, totalClicks };
  }, [config.links, projectWaEvents]);

  const activeTemplate = useMemo(
    () => config.templates.find((t) => t.id === selectedTemplateId) || config.templates[0] || null,
    [config.templates, selectedTemplateId]
  );

  const sampleContext = useMemo(() => buildWhatsappSampleContext(config), [config]);

  const updateConfig = (updater: (prev: WhatsappCenterConfig) => WhatsappCenterConfig) => {
    onChange({
      ...updater(config),
      updatedAt: Date.now(),
    });
  };

  // --- Link CRUD ---
  const handleAddLink = () => {
    const id = `wa_link_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    const nextItem: WhatsappLinkItem = {
      id,
      name: `Tautan WhatsApp ${config.links.length + 1}`,
      functionType: 'konsultasi',
      phone: config.mainPhone || '',
      templateId: config.defaultTemplateByType.konsultasi || config.templates[0]?.id,
      active: true,
      updatedAt: Date.now(),
    };
    updateConfig((prev) => ({
      ...prev,
      links: [...prev.links, nextItem],
    }));
  };

  const handleUpdateLink = (id: string, patch: Partial<WhatsappLinkItem>) => {
    updateConfig((prev) => ({
      ...prev,
      links: prev.links.map((item) =>
        item.id === id ? { ...item, ...patch, updatedAt: Date.now() } : item
      ),
    }));
  };

  const handleDuplicateLink = (link: WhatsappLinkItem) => {
    const id = `wa_link_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    updateConfig((prev) => ({
      ...prev,
      links: [
        ...prev.links,
        {
          ...link,
          id,
          name: `${link.name} (Salinan)`,
          updatedAt: Date.now(),
        },
      ],
    }));
  };

  const handleDeleteLink = (id: string) => {
    updateConfig((prev) => ({
      ...prev,
      links: prev.links.filter((l) => l.id !== id),
    }));
  };

  // --- Template CRUD ---
  const handleAddTemplate = () => {
    const id = `wa_tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    const nextTpl: WhatsappTemplate = {
      id,
      name: `Templat Baru ${config.templates.length + 1}`,
      type: 'templat_khusus',
      body: 'Halo *{{nama_usaha}}* 👋\nSaya ingin menanyakan informasi terkait *{{nama_produk}}*.',
      updatedAt: Date.now(),
    };
    updateConfig((prev) => ({
      ...prev,
      templates: [...prev.templates, nextTpl],
    }));
    setSelectedTemplateId(id);
  };

  const handleDuplicateTemplate = (tpl: WhatsappTemplate) => {
    const id = `wa_tpl_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 5)}`;
    const copy: WhatsappTemplate = {
      ...tpl,
      id,
      name: `${tpl.name} (Salinan)`,
      isDefault: false,
      updatedAt: Date.now(),
    };
    updateConfig((prev) => ({
      ...prev,
      templates: [...prev.templates, copy],
    }));
    setSelectedTemplateId(id);
  };

  const handleUpdateTemplate = (id: string, patch: Partial<WhatsappTemplate>) => {
    updateConfig((prev) => ({
      ...prev,
      templates: prev.templates.map((t) =>
        t.id === id ? { ...t, ...patch, updatedAt: Date.now() } : t
      ),
    }));
  };

  const handleDeleteTemplate = (id: string) => {
    if (config.templates.length <= 1) return;
    updateConfig((prev) => ({
      ...prev,
      templates: prev.templates.filter((t) => t.id !== id),
    }));
  };

  // --- Formatting Toolbar & Variable Insertion ---
  const applyFormatToActiveTemplate = (action: WhatsappFormatAction) => {
    if (!activeTemplate || !canEdit) return;
    const el = textareaRef.current;
    const start = el ? el.selectionStart : activeTemplate.body.length;
    const end = el ? el.selectionEnd : activeTemplate.body.length;
    const { nextText, nextCursor } = applyWhatsappFormat(activeTemplate.body, start, end, action);
    handleUpdateTemplate(activeTemplate.id, { body: nextText });
    window.requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    });
  };

  const insertSnippetIntoActiveTemplate = (snippet: string) => {
    if (!activeTemplate || !canEdit) return;
    const el = textareaRef.current;
    const start = el ? el.selectionStart : activeTemplate.body.length;
    const end = el ? el.selectionEnd : activeTemplate.body.length;
    const before = activeTemplate.body.slice(0, start);
    const after = activeTemplate.body.slice(end);
    const nextText = `${before}${snippet}${after}`;
    const nextCursor = before.length + snippet.length;
    handleUpdateTemplate(activeTemplate.id, { body: nextText });
    window.requestAnimationFrame(() => {
      if (textareaRef.current) {
        textareaRef.current.focus();
        textareaRef.current.setSelectionRange(nextCursor, nextCursor);
      }
    });
  };

  const renderedTemplatePreview = useMemo(() => {
    if (!activeTemplate) return '';
    return renderWhatsappTemplate(activeTemplate.body, sampleContext, { useSampleFallback: true });
  }, [activeTemplate, sampleContext]);

  const activeVarGroupObj = useMemo(
    () =>
      WHATSAPP_VARIABLE_GROUPS.find((g) => g.id === selectedVarGroup) ||
      WHATSAPP_VARIABLE_GROUPS[0],
    [selectedVarGroup]
  );

  return (
    <div className="bg-white rounded-2xl border border-[#DCE5EF] p-5 space-y-4">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-3 pb-3 border-b border-[#DCE5EF]">
        <div className="flex items-start gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-[#ECFDF6] border border-[#00C98A]/30 text-[#059669] flex items-center justify-center shrink-0 mt-0.5">
            <MessageCircle className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-sm font-bold text-[#17243D]">
              Pusat WhatsApp &amp; Pembuat Pesan
            </h2>
            <p className="text-xs text-[#8FA4BF] mt-0.5">
              Kelola nomor utama, daftar tautan WhatsApp, templat pesan otomatis, variabel dinamis, dan rekap klik secara terpusat.
            </p>
          </div>
        </div>

        {canEdit && (
          <button
            type="button"
            disabled={saving}
            onClick={onSave}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#17243D] hover:bg-[#223456] text-white text-xs font-semibold disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5 text-[#00C98A]" />
            <span>{saving ? 'Menyimpan...' : 'Simpan Pusat WhatsApp'}</span>
          </button>
        )}
      </div>

      {/* Sub-navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 bg-[#F0F5FA] p-1 rounded-xl">
        {(
          [
            { id: 'rekap', label: 'Rekap WhatsApp' },
            { id: 'tautan', label: `Daftar Tautan (${config.links.length})` },
            { id: 'templat', label: `Pembuat Templat (${config.templates.length})` },
            { id: 'global', label: 'Pengaturan Global' },
          ] as { id: CenterSubTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
              activeTab === tab.id
                ? 'bg-white text-[#17243D] shadow-2xs'
                : 'text-[#51637D] hover:text-[#17243D]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: REKAP WHATSAPP */}
      {activeTab === 'rekap' && (
        <div className="space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl border border-[#DCE5EF] bg-[#F8FAFC]">
              <div className="text-[11px] font-medium text-[#51637D]">Total Tautan</div>
              <div className="text-xl font-bold text-[#17243D] mt-0.5 tabular-nums">
                {stats.totalLinks}
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-[#DCE5EF] bg-[#ECFDF6]/60">
              <div className="text-[11px] font-medium text-[#059669]">Total Klik WhatsApp</div>
              <div className="text-xl font-bold text-[#059669] mt-0.5 tabular-nums">
                {stats.totalClicks}
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-[#DCE5EF] bg-white">
              <div className="text-[11px] font-medium text-[#51637D]">Tautan Aktif</div>
              <div className="text-xl font-bold text-[#17243D] mt-0.5 tabular-nums">
                {stats.activeLinks}
              </div>
            </div>
            <div className="p-3.5 rounded-xl border border-[#DCE5EF] bg-white">
              <div className="text-[11px] font-medium text-[#51637D]">Tidak Aktif</div>
              <div className="text-xl font-bold text-[#8FA4BF] mt-0.5 tabular-nums">
                {stats.inactiveLinks}
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#DCE5EF] overflow-hidden">
            <div className="px-3.5 py-2.5 bg-[#F8FAFC] border-b border-[#DCE5EF] text-xs font-bold text-[#17243D]">
              Ringkasan Penggunaan Tautan &amp; Templat (Data Aktual)
            </div>
            <div className="divide-y divide-[#EDF2F7] text-xs">
              {config.links.length === 0 ? (
                <div className="p-4 text-center text-[#8FA4BF]">
                  Belum ada tautan WhatsApp. Tambahkan di tab Daftar Tautan.
                </div>
              ) : (
                config.links.map((lk) => {
                  const tplName =
                    config.templates.find((t) => t.id === lk.templateId)?.name || 'Templat Bawaan';
                  return (
                    <div
                      key={lk.id}
                      className="px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="min-w-0">
                        <div className="font-semibold text-[#17243D] flex items-center gap-2">
                          <span>{lk.name}</span>
                          <span
                            className={`text-[10px] px-1.5 py-0.5 rounded font-semibold ${
                              lk.active
                                ? 'bg-[#ECFDF6] text-[#059669]'
                                : 'bg-slate-100 text-slate-500'
                            }`}
                          >
                            {lk.active ? 'Aktif' : 'Tidak Aktif'}
                          </span>
                        </div>
                        <div className="text-[11px] text-[#51637D] mt-0.5">
                          {WHATSAPP_TEMPLATE_TYPE_LABELS[lk.functionType]} · {lk.phone || config.mainPhone || 'Belum diisi'} · Templat: {tplName}
                        </div>
                      </div>
                      <div className="text-right tabular-nums">
                        <div className="text-sm font-bold text-[#059669]">
                          {clicksByLinkId[lk.id] || 0} klik
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: DAFTAR TAUTAN WHATSAPP */}
      {activeTab === 'tautan' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between gap-2">
            <p className="text-xs text-[#51637D]">
              Setiap tautan dapat dihubungkan ke tombol, katalog, keranjang, atau formulir pada halaman Anda.
            </p>
            {canEdit && (
              <button
                type="button"
                onClick={handleAddLink}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-xs font-semibold cursor-pointer shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Tambah Tautan</span>
              </button>
            )}
          </div>

          <div className="space-y-3">
            {config.links.map((lk) => {
              const chosenTpl = config.templates.find((t) => t.id === lk.templateId);
              const previewText = renderWhatsappTemplate(
                lk.customMessage?.trim() || chosenTpl?.body || '',
                sampleContext,
                { useSampleFallback: true }
              );
              const previewUrl = buildWaMeUrl(lk.phone || config.mainPhone, previewText);
              return (
                <div
                  key={lk.id}
                  className="p-3.5 rounded-xl border border-[#DCE5EF] bg-[#FAFBFD] space-y-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Link2 className="w-3.5 h-3.5 text-[#059669]" />
                      <span className="text-xs font-bold text-[#17243D]">{lk.name}</span>
                      <span className="text-[11px] font-mono text-[#059669] font-semibold">
                        ({clicksByLinkId[lk.id] || 0} klik)
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          setPreviewLinkId((prev) => (prev === lk.id ? null : lk.id))
                        }
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#DCE5EF] bg-white text-[11px] font-semibold text-[#17243D] hover:bg-[#F0F5FA] cursor-pointer"
                      >
                        <Eye className="w-3 h-3" />
                        <span>Pratinjau</span>
                      </button>
                      {canEdit && (
                        <>
                          <button
                            type="button"
                            onClick={() => handleUpdateLink(lk.id, { active: !lk.active })}
                            className={`px-2 py-1 rounded-lg text-[11px] font-semibold cursor-pointer border ${
                              lk.active
                                ? 'bg-[#ECFDF6] border-[#00C98A]/40 text-[#059669]'
                                : 'bg-white border-[#DCE5EF] text-[#51637D]'
                            }`}
                          >
                            {lk.active ? 'Aktif' : 'Tidak Aktif'}
                          </button>
                          <button
                            type="button"
                            title="Duplikat tautan"
                            onClick={() => handleDuplicateLink(lk)}
                            className="p-1.5 rounded-lg border border-[#DCE5EF] bg-white text-[#51637D] hover:text-[#17243D] cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          <button
                            type="button"
                            title="Hapus tautan"
                            onClick={() => handleDeleteLink(lk.id)}
                            className="p-1.5 rounded-lg border border-red-200 bg-white text-red-500 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#51637D] mb-1">
                        Nama Tautan
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={lk.name}
                        onChange={(e) => handleUpdateLink(lk.id, { name: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#DCE5EF] bg-white text-xs text-[#17243D] outline-none focus:border-[#00C98A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#51637D] mb-1">
                        Fungsi
                      </label>
                      <select
                        disabled={!canEdit}
                        value={lk.functionType}
                        onChange={(e) =>
                          handleUpdateLink(lk.id, {
                            functionType: e.target.value as WhatsappTemplateType,
                          })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#DCE5EF] bg-white text-xs text-[#17243D] outline-none focus:border-[#00C98A]"
                      >
                        {TEMPLATE_TYPES.map((t) => (
                          <option key={t} value={t}>
                            {WHATSAPP_TEMPLATE_TYPE_LABELS[t]}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#51637D] mb-1">
                        Nomor Tujuan (WA)
                      </label>
                      <input
                        type="text"
                        disabled={!canEdit}
                        value={lk.phone}
                        placeholder={config.mainPhone || '6281234567890'}
                        onChange={(e) => handleUpdateLink(lk.id, { phone: e.target.value })}
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#DCE5EF] bg-white text-xs font-mono text-[#17243D] outline-none focus:border-[#00C98A]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#51637D] mb-1">
                        Templat Pesan
                      </label>
                      <select
                        disabled={!canEdit}
                        value={lk.templateId || ''}
                        onChange={(e) =>
                          handleUpdateLink(lk.id, { templateId: e.target.value || undefined })
                        }
                        className="w-full px-2.5 py-1.5 rounded-lg border border-[#DCE5EF] bg-white text-xs text-[#17243D] outline-none focus:border-[#00C98A]"
                      >
                        <option value="">Ikuti Bawaan Fungsi</option>
                        {config.templates.map((tpl) => (
                          <option key={tpl.id} value={tpl.id}>
                            {tpl.name}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  {previewLinkId === lk.id && (
                    <div className="p-3 rounded-xl bg-[#0B141A] text-white space-y-2">
                      <div className="flex items-center justify-between text-[10px] text-emerald-300">
                        <span>Pratinjau Pesan (Data Contoh — Tanpa Kirim Sungguhan)</span>
                        <span className="font-mono">
                          +{normalizeWaPhone(lk.phone || config.mainPhone) || 'nomor-belum-diisi'}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-lg bg-[#005C4B] text-xs whitespace-pre-wrap leading-relaxed">
                        {previewText}
                      </div>
                      <div className="text-[10px] font-mono text-slate-400 truncate">
                        {previewUrl}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* TAB 3: PEMBUAT PESAN & TEMPLAT WHATSAPP */}
      {activeTab === 'templat' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
          {/* Left: Template List */}
          <div className="lg:col-span-4 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#17243D]">Daftar Templat Pesan</span>
              {canEdit && (
                <button
                  type="button"
                  onClick={handleAddTemplate}
                  className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#059669] hover:bg-[#047857] text-white text-[11px] font-semibold cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                  <span>Templat Baru</span>
                </button>
              )}
            </div>
            <div className="space-y-1.5 max-h-[420px] overflow-y-auto pr-1">
              {config.templates.map((tpl) => {
                const isSel = activeTemplate?.id === tpl.id;
                const clicks = clicksByTemplateId[tpl.id] || 0;
                return (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplateId(tpl.id)}
                    className={`p-2.5 rounded-xl border cursor-pointer transition-colors ${
                      isSel
                        ? 'border-[#00C98A] bg-[#ECFDF6]/70'
                        : 'border-[#DCE5EF] bg-white hover:bg-[#F8FAFC]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <div className="text-xs font-bold text-[#17243D] truncate">{tpl.name}</div>
                        <div className="text-[10px] text-[#51637D] mt-0.5">
                          {WHATSAPP_TEMPLATE_TYPE_LABELS[tpl.type]} · {clicks} klik
                        </div>
                      </div>
                      {canEdit && (
                        <div className="flex items-center gap-1 shrink-0" onClick={(e) => e.stopPropagation()}>
                          <button
                            type="button"
                            title="Duplikat templat"
                            onClick={() => handleDuplicateTemplate(tpl)}
                            className="p-1 rounded hover:bg-white text-[#51637D] hover:text-[#17243D] cursor-pointer"
                          >
                            <Copy className="w-3 h-3" />
                          </button>
                          {config.templates.length > 1 && (
                            <button
                              type="button"
                              title="Hapus templat"
                              onClick={() => handleDeleteTemplate(tpl.id)}
                              className="p-1 rounded hover:bg-red-50 text-red-500 cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right: Visual Editor + Variables + Live Preview */}
          {activeTemplate && (
            <div className="lg:col-span-8 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Nama Templat
                  </label>
                  <input
                    type="text"
                    disabled={!canEdit}
                    value={activeTemplate.name}
                    onChange={(e) =>
                      handleUpdateTemplate(activeTemplate.id, { name: e.target.value })
                    }
                    className="w-full px-3 py-1.5 rounded-xl border border-[#DCE5EF] bg-white text-xs text-[#17243D] outline-none focus:border-[#00C98A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Jenis Templat
                  </label>
                  <select
                    disabled={!canEdit}
                    value={activeTemplate.type}
                    onChange={(e) =>
                      handleUpdateTemplate(activeTemplate.id, {
                        type: e.target.value as WhatsappTemplateType,
                      })
                    }
                    className="w-full px-3 py-1.5 rounded-xl border border-[#DCE5EF] bg-white text-xs text-[#17243D] outline-none focus:border-[#00C98A]"
                  >
                    {TEMPLATE_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {WHATSAPP_TEMPLATE_TYPE_LABELS[t]}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Formatting Toolbar */}
              <div className="rounded-xl border border-[#DCE5EF] overflow-hidden bg-white">
                <div className="px-2.5 py-1.5 bg-[#F8FAFC] border-b border-[#DCE5EF] flex flex-wrap items-center gap-1">
                  <button
                    type="button"
                    disabled={!canEdit}
                    title="Tebal (*teks*)"
                    onClick={() => applyFormatToActiveTemplate('bold')}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white border border-transparent hover:border-[#DCE5EF] text-[11px] font-semibold text-[#17243D] cursor-pointer"
                  >
                    <Bold className="w-3.5 h-3.5" />
                    <span>Tebal</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    title="Miring (_teks_)"
                    onClick={() => applyFormatToActiveTemplate('italic')}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white border border-transparent hover:border-[#DCE5EF] text-[11px] font-semibold text-[#17243D] cursor-pointer"
                  >
                    <Italic className="w-3.5 h-3.5" />
                    <span>Miring</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    title="Coret (~teks~)"
                    onClick={() => applyFormatToActiveTemplate('strike')}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white border border-transparent hover:border-[#DCE5EF] text-[11px] font-semibold text-[#17243D] cursor-pointer"
                  >
                    <Strikethrough className="w-3.5 h-3.5" />
                    <span>Coret</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    title="Monospace (```teks```)"
                    onClick={() => applyFormatToActiveTemplate('monospace')}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white border border-transparent hover:border-[#DCE5EF] text-[11px] font-semibold text-[#17243D] cursor-pointer"
                  >
                    <Code className="w-3.5 h-3.5" />
                    <span>Monospace</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    title="Daftar Poin"
                    onClick={() => applyFormatToActiveTemplate('bullet_list')}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white border border-transparent hover:border-[#DCE5EF] text-[11px] font-semibold text-[#17243D] cursor-pointer"
                  >
                    <List className="w-3.5 h-3.5" />
                    <span>Poin</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    title="Daftar Nomor"
                    onClick={() => applyFormatToActiveTemplate('numbered_list')}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white border border-transparent hover:border-[#DCE5EF] text-[11px] font-semibold text-[#17243D] cursor-pointer"
                  >
                    <ListOrdered className="w-3.5 h-3.5" />
                    <span>Nomor</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    title="Baris Baru"
                    onClick={() => applyFormatToActiveTemplate('newline')}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white border border-transparent hover:border-[#DCE5EF] text-[11px] font-semibold text-[#17243D] cursor-pointer"
                  >
                    <CornerDownLeft className="w-3.5 h-3.5" />
                    <span>Baris</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    title="Garis Pemisah"
                    onClick={() => applyFormatToActiveTemplate('divider')}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white border border-transparent hover:border-[#DCE5EF] text-[11px] font-semibold text-[#17243D] cursor-pointer"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Pemisah</span>
                  </button>
                  <button
                    type="button"
                    disabled={!canEdit}
                    title="Sisipkan Emoji"
                    onClick={() => setShowEmojiPicker((v) => !v)}
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md hover:bg-white border border-transparent hover:border-[#DCE5EF] text-[11px] font-semibold text-[#17243D] cursor-pointer"
                  >
                    <Smile className="w-3.5 h-3.5" />
                    <span>Emoji</span>
                  </button>
                </div>

                {showEmojiPicker && (
                  <div className="px-2.5 py-2 bg-[#FAFBFD] border-b border-[#DCE5EF] flex flex-wrap gap-1.5">
                    {WHATSAPP_EMOJI_SHORTCUTS.map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => {
                          insertSnippetIntoActiveTemplate(em);
                          setShowEmojiPicker(false);
                        }}
                        className="w-7 h-7 rounded-lg bg-white border border-[#DCE5EF] hover:border-[#00C98A] text-sm cursor-pointer"
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                )}

                <textarea
                  ref={textareaRef}
                  rows={6}
                  disabled={!canEdit}
                  value={activeTemplate.body}
                  onChange={(e) =>
                    handleUpdateTemplate(activeTemplate.id, { body: e.target.value })
                  }
                  placeholder="Tulis templat pesan WhatsApp di sini..."
                  className="w-full p-3 text-xs font-mono text-[#17243D] outline-none resize-y leading-relaxed"
                />
              </div>

              {/* Dynamic Variable Picker */}
              <div className="p-3 rounded-xl border border-[#DCE5EF] bg-[#F8FAFC] space-y-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#17243D]">
                    Sisipkan Variabel Dinamis
                  </span>
                  <div className="flex flex-wrap gap-1">
                    {WHATSAPP_VARIABLE_GROUPS.map((grp) => (
                      <button
                        key={grp.id}
                        type="button"
                        onClick={() => setSelectedVarGroup(grp.id)}
                        className={`px-2 py-0.5 rounded-md text-[10px] font-semibold cursor-pointer ${
                          selectedVarGroup === grp.id
                            ? 'bg-[#17243D] text-white'
                            : 'bg-white border border-[#DCE5EF] text-[#51637D] hover:text-[#17243D]'
                        }`}
                      >
                        {grp.label}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {activeVarGroupObj.items.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      disabled={!canEdit}
                      onClick={() => insertSnippetIntoActiveTemplate(item.token)}
                      className="px-2 py-1 rounded-lg bg-white border border-[#DCE5EF] hover:border-[#00C98A] hover:bg-[#ECFDF6] text-[11px] font-medium text-[#17243D] cursor-pointer"
                      title={`Sisipkan ${item.token}`}
                    >
                      + {item.label}{' '}
                      <span className="font-mono text-[10px] text-[#059669]">{item.token}</span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Live Sample Preview */}
              <div className="p-3.5 rounded-xl bg-[#0B141A] text-white space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-emerald-300">
                    Pratinjau Pesan WhatsApp (Data Contoh — Tanpa Kirim Sungguhan)
                  </span>
                  <span className="text-[10px] text-slate-400">Sintaks WA Murni</span>
                </div>
                <div className="p-3 rounded-xl bg-[#005C4B] text-xs whitespace-pre-wrap leading-relaxed text-white">
                  {renderedTemplatePreview || 'Tulis isi pesan untuk melihat pratinjau.'}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: PENGATURAN GLOBAL WHATSAPP */}
      {activeTab === 'global' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1">
                Nomor WhatsApp Utama Usaha
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={config.mainPhone}
                onChange={(e) =>
                  updateConfig((prev) => ({ ...prev, mainPhone: e.target.value }))
                }
                placeholder="Contoh: 6281234567890"
                className="w-full px-3 py-2 rounded-xl border border-[#DCE5EF] bg-white text-xs font-mono text-[#17243D] outline-none focus:border-[#00C98A]"
              />
              <p className="text-[11px] text-[#8FA4BF] mt-1">
                Digunakan sebagai nomor tujuan utama bila komponen belum memilih nomor khusus.
              </p>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1">
                Nama Usaha pada Pesan
              </label>
              <input
                type="text"
                disabled={!canEdit}
                value={config.businessName}
                onChange={(e) =>
                  updateConfig((prev) => ({ ...prev, businessName: e.target.value }))
                }
                placeholder="Nama usaha untuk variabel {{nama_usaha}}"
                className="w-full px-3 py-2 rounded-xl border border-[#DCE5EF] bg-white text-xs text-[#17243D] outline-none focus:border-[#00C98A]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#17243D] mb-1">
              Informasi Singkat Usaha (Variabel {'{{info_usaha}}'})
            </label>
            <input
              type="text"
              disabled={!canEdit}
              value={config.businessInfo || ''}
              onChange={(e) =>
                updateConfig((prev) => ({ ...prev, businessInfo: e.target.value }))
              }
              placeholder="Contoh: Buka Senin–Minggu 08.00–21.00 WIB"
              className="w-full px-3 py-2 rounded-xl border border-[#DCE5EF] bg-white text-xs text-[#17243D] outline-none focus:border-[#00C98A]"
            />
          </div>

          <div className="p-3.5 rounded-xl border border-[#DCE5EF] bg-[#F8FAFC] space-y-2.5">
            <div className="text-xs font-bold text-[#17243D]">
              Pengaturan Templat Bawaan Berdasarkan Fungsi
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {TEMPLATE_TYPES.filter((t) => t !== 'templat_khusus').map((fnType) => (
                <div key={fnType}>
                  <label className="block text-[10px] font-semibold text-[#51637D] mb-1">
                    {WHATSAPP_TEMPLATE_TYPE_LABELS[fnType]}
                  </label>
                  <select
                    disabled={!canEdit}
                    value={config.defaultTemplateByType[fnType] || ''}
                    onChange={(e) =>
                      updateConfig((prev) => ({
                        ...prev,
                        defaultTemplateByType: {
                          ...prev.defaultTemplateByType,
                          [fnType]: e.target.value || undefined,
                        },
                      }))
                    }
                    className="w-full px-2.5 py-1.5 rounded-lg border border-[#DCE5EF] bg-white text-xs text-[#17243D] outline-none focus:border-[#00C98A]"
                  >
                    <option value="">Pilih Templat</option>
                    {config.templates.map((tpl) => (
                      <option key={tpl.id} value={tpl.id}>
                        {tpl.name}
                      </option>
                    ))}
                  </select>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
