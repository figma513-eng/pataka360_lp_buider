import { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  FilePlus2,
  Globe,
  Layers,
  LayoutTemplate,
  Loader2,
  LogOut,
  Search,
  Sparkles,
  Store,
  X,
} from 'lucide-react';
import type {
  AuthUser,
  ProjectRecord,
  SavedWebTemplate,
  WebTemplateCategory,
} from '../../types/builder';
import { sanitizeSlug } from '../../utils/publishingHelpers';
import {
  WEB_TEMPLATE_CATEGORIES,
  WEB_TEMPLATE_CATEGORY_LABELS,
} from '../../utils/webTemplateHelpers';
import {
  checkSaasSlugAvailability,
  createSaasBuyerSite,
  type SaasSlugCheckResult,
} from '../../utils/webTemplateClient';

interface SaasOnboardingModalProps {
  isOpen: boolean;
  canDismiss: boolean;
  userName?: string;
  templates: SavedWebTemplate[];
  templatesLoading?: boolean;
  onRefreshTemplates?: () => void;
  onClose?: () => void;
  onLogout?: () => void;
  onCreated: (result: { record: ProjectRecord; user?: AuthUser; livePath: string }) => void;
}

export function SaasOnboardingModal({
  isOpen,
  canDismiss,
  userName,
  templates,
  templatesLoading = false,
  onRefreshTemplates,
  onClose,
  onLogout,
  onCreated,
}: SaasOnboardingModalProps) {
  const [step, setStep] = useState<1 | 2>(1);
  const [businessName, setBusinessName] = useState('');
  const [slugInput, setSlugInput] = useState('');
  const [slugTouchedManually, setSlugTouchedManually] = useState(false);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugCheck, setSlugCheck] = useState<SaasSlugCheckResult | null>(null);

  // Step 2 states
  const [selectedTemplateId, setSelectedTemplateId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<WebTemplateCategory | 'all'>('all');
  const [expandedPagesId, setExpandedPagesId] = useState<string | null>(null);
  const [publishImmediately, setPublishImmediately] = useState(false);

  // Submit state
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const reqSeqRef = useRef(0);

  const originDisplay = useMemo(() => {
    if (typeof window === 'undefined') return 'domainanda.com';
    return window.location.origin.replace(/^https?:\/\//, '');
  }, []);

  // Reset saat modal dibuka baru
  useEffect(() => {
    if (!isOpen) return;
    setStep(1);
    setBusinessName('');
    setSlugInput('');
    setSlugTouchedManually(false);
    setSlugCheck(null);
    setCheckingSlug(false);
    setSearch('');
    setCategoryFilter('all');
    setExpandedPagesId(null);
    setPublishImmediately(false);
    setSubmitError(null);
    setSubmitting(false);
    // Pilih template pertama secara otomatis jika tersedia
    setSelectedTemplateId(templates[0]?.id ?? null);
    onRefreshTemplates?.();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // Sinkronkan pilihan default jika template selesai dimuat & belum memilih
  useEffect(() => {
    if (!isOpen) return;
    if (selectedTemplateId === null && templates.length > 0 && step === 1) {
      setSelectedTemplateId(templates[0].id);
    }
  }, [isOpen, templates, selectedTemplateId, step]);

  // Debounced live check ketersediaan slug
  useEffect(() => {
    if (!isOpen) return;
    const cleaned = sanitizeSlug(slugInput, '');
    if (!cleaned || cleaned.length < 2) {
      setSlugCheck(null);
      setCheckingSlug(false);
      return;
    }

    const seq = ++reqSeqRef.current;
    setCheckingSlug(true);
    const timer = window.setTimeout(async () => {
      const res = await checkSaasSlugAvailability(cleaned);
      if (seq !== reqSeqRef.current) return;
      setSlugCheck(res);
      setCheckingSlug(false);
    }, 320);

    return () => window.clearTimeout(timer);
  }, [isOpen, slugInput]);

  const filteredTemplates = useMemo(() => {
    const q = search.trim().toLowerCase();
    return templates.filter((tpl) => {
      if (categoryFilter !== 'all' && tpl.category !== categoryFilter) return false;
      if (!q) return true;
      return (
        tpl.name.toLowerCase().includes(q) ||
        tpl.description.toLowerCase().includes(q) ||
        tpl.subPageTitles.some((t) => t.toLowerCase().includes(q))
      );
    });
  }, [templates, search, categoryFilter]);

  if (!isOpen) return null;

  const cleanSlugPreview = sanitizeSlug(slugInput, '');
  const canProceedStep1 =
    businessName.trim().length >= 2 &&
    cleanSlugPreview.length >= 2 &&
    !checkingSlug &&
    Boolean(slugCheck?.available);

  const handleBusinessNameChange = (val: string) => {
    setBusinessName(val);
    setSubmitError(null);
    if (!slugTouchedManually) {
      setSlugInput(sanitizeSlug(val, ''));
    }
  };

  const handleSlugInputChange = (val: string) => {
    setSlugTouchedManually(true);
    setSubmitError(null);
    const cleaned = val
      .toLowerCase()
      .replace(/[^a-z0-9-]+/g, '-')
      .replace(/-{2,}/g, '-')
      .slice(0, 60);
    setSlugInput(cleaned);
  };

  const handleCreateSite = async () => {
    if (!canProceedStep1 && step === 1) return;
    setSubmitting(true);
    setSubmitError(null);

    const res = await createSaasBuyerSite({
      businessName: businessName.trim(),
      slug: cleanSlugPreview,
      templateId: selectedTemplateId,
      publishImmediately,
    });

    setSubmitting(false);
    if (!res.ok || !res.record) {
      setSubmitError(res.error || 'Gagal membuat halaman usaha.');
      if (res.suggestedSlug) {
        setSlugCheck({
          ok: true,
          slug: cleanSlugPreview,
          available: false,
          reason: res.error,
          suggestedSlug: res.suggestedSlug,
        });
        setStep(1);
      }
      return;
    }

    onCreated({
      record: res.record,
      user: res.user,
      livePath: res.livePath || `/${cleanSlugPreview}`,
    });
  };

  const selectedTemplateObj = templates.find((t) => t.id === selectedTemplateId) ?? null;

  return (
    <div
      className="fixed inset-0 z-[80] bg-[#0F1B2E]/70 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5"
      role="dialog"
      aria-modal="true"
      aria-labelledby="saas-onboarding-title"
    >
      <div className="w-full max-w-3xl max-h-[92vh] bg-white rounded-2xl border border-[#DCE5EF] shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#DCE5EF] bg-gradient-to-r from-[#17243D] to-[#1E3154] text-white flex items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-xl bg-[#00C98A]/20 border border-[#00C98A]/40 flex items-center justify-center shrink-0">
              <Store className="w-4.5 h-4.5 text-[#00C98A]" />
            </div>
            <div className="min-w-0">
              <h2 id="saas-onboarding-title" className="text-sm sm:text-base font-bold truncate">
                {canDismiss ? 'Buat Web Usaha Baru' : `Selamat Datang${userName ? `, ${userName}` : ''}!`}
              </h2>
              <p className="text-[11px] text-slate-300 truncate">
                Tentukan nama usaha &amp; link web Anda, lalu pilih Template Web siap pakai untuk langsung diedit.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            {!canDismiss && onLogout && (
              <button
                type="button"
                onClick={onLogout}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 text-[11px] font-semibold text-white transition-colors cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Keluar</span>
              </button>
            )}
            {canDismiss && onClose && (
              <button
                type="button"
                onClick={onClose}
                aria-label="Tutup"
                className="w-8 h-8 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Step Indicator */}
        <div className="px-5 py-2.5 bg-[#F0F5FA] border-b border-[#DCE5EF] flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setStep(1)}
            className={`inline-flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer ${
              step === 1 ? 'text-[#17243D]' : 'text-[#00A873]'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                step === 1
                  ? 'bg-[#17243D] text-white'
                  : 'bg-[#00C98A] text-white'
              }`}
            >
              {step > 1 ? <Check className="w-3 h-3" /> : '1'}
            </span>
            <span>Nama Usaha &amp; Link</span>
          </button>

          <div className="h-px flex-1 bg-[#DCE5EF]" />

          <button
            type="button"
            disabled={!canProceedStep1}
            onClick={() => canProceedStep1 && setStep(2)}
            className={`inline-flex items-center gap-2 text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
              step === 2 ? 'text-[#17243D]' : 'text-[#5B708B]'
            }`}
          >
            <span
              className={`w-5 h-5 rounded-full text-[11px] font-bold flex items-center justify-center ${
                step === 2 ? 'bg-[#17243D] text-white' : 'bg-[#DCE5EF] text-[#5B708B]'
              }`}
            >
              2
            </span>
            <span>Pilih Template Web</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-4">
          {submitError && (
            <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-medium flex items-start gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          {step === 1 ? (
            <div className="max-w-xl mx-auto space-y-5 py-2">
              <div>
                <label
                  htmlFor="saas-biz-name"
                  className="block text-xs font-bold text-[#17243D] mb-1.5"
                >
                  Nama Usaha Anda
                </label>
                <input
                  id="saas-biz-name"
                  type="text"
                  autoFocus
                  value={businessName}
                  onChange={(e) => handleBusinessNameChange(e.target.value)}
                  placeholder="Contoh: Kopi Senja Jakarta, Butik Luna, Bengkel Jaya..."
                  maxLength={80}
                  className="w-full px-3.5 py-2.5 rounded-xl border border-[#DCE5EF] bg-white text-sm font-medium text-[#17243D] placeholder:text-[#8FA4BF] outline-none focus:border-[#00C98A] focus:ring-2 focus:ring-[#00C98A]/15"
                />
                <p className="text-[11px] text-[#5B708B] mt-1">
                  Nama ini tampil sebagai judul halaman usaha Anda dan dapat diubah kapan saja nanti.
                </p>
              </div>

              <div>
                <label
                  htmlFor="saas-biz-slug"
                  className="block text-xs font-bold text-[#17243D] mb-1.5"
                >
                  Alamat Link Web Usaha
                </label>
                <div className="flex items-stretch rounded-xl border border-[#DCE5EF] bg-white overflow-hidden focus-within:border-[#00C98A] focus-within:ring-2 focus-within:ring-[#00C98A]/15">
                  <span className="px-3 py-2.5 bg-[#F0F5FA] border-r border-[#DCE5EF] text-xs font-mono text-[#5B708B] flex items-center gap-1.5 select-none shrink-0">
                    <Globe className="w-3.5 h-3.5 text-[#00A873]" />
                    <span>{originDisplay}/</span>
                  </span>
                  <input
                    id="saas-biz-slug"
                    type="text"
                    value={slugInput}
                    onChange={(e) => handleSlugInputChange(e.target.value)}
                    placeholder="nama-usaha-anda"
                    maxLength={60}
                    className="flex-1 min-w-0 px-3 py-2.5 text-sm font-mono font-semibold text-[#17243D] placeholder:text-[#8FA4BF] outline-none"
                  />
                </div>

                {/* Live availability feedback */}
                <div className="mt-2 min-h-[26px]">
                  {checkingSlug ? (
                    <div className="inline-flex items-center gap-1.5 text-xs text-[#5B708B]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00A873]" />
                      <span>Memeriksa ketersediaan alamat link...</span>
                    </div>
                  ) : slugCheck?.available ? (
                    <div className="p-2.5 rounded-xl bg-[#ECFDF6] border border-[#00C98A]/40 text-xs text-[#17243D] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#00A873] shrink-0" />
                      <div className="min-w-0">
                        <span className="font-semibold text-[#059669]">Alamat tersedia!</span>{' '}
                        <span className="font-mono text-[#17243D] break-all">
                          {originDisplay}/{slugCheck.slug}
                        </span>
                      </div>
                    </div>
                  ) : slugCheck && !slugCheck.available ? (
                    <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-xs text-amber-900 space-y-1.5">
                      <div className="flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                        <span>{slugCheck.reason || 'Alamat ini tidak tersedia.'}</span>
                      </div>
                      {slugCheck.suggestedSlug && (
                        <button
                          type="button"
                          onClick={() => {
                            setSlugTouchedManually(true);
                            setSlugInput(slugCheck.suggestedSlug || '');
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white border border-amber-300 hover:bg-amber-100 text-[11px] font-mono font-semibold text-amber-900 cursor-pointer"
                        >
                          <span>Pakai saran: /{slugCheck.suggestedSlug}</span>
                        </button>
                      )}
                    </div>
                  ) : (
                    <p className="text-[11px] text-[#8FA4BF]">
                      Gunakan huruf kecil, angka, atau tanda hubung (-). Contoh:{' '}
                      <span className="font-mono text-[#5B708B]">kopi-senja</span>
                    </p>
                  )}
                </div>
              </div>

              {/* Quick Journey Preview */}
              <div className="rounded-xl border border-[#DCE5EF] bg-[#F8FAFC] p-3.5">
                <div className="text-[11px] font-bold text-[#17243D] mb-2">
                  Alur Pembuatan Web Anda:
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
                  {[
                    { num: '1', label: 'Nama & Link Web' },
                    { num: '2', label: 'Pilih Template Web' },
                    { num: '3', label: 'Edit Konten & Menu' },
                    { num: '4', label: 'Simpan & Publish' },
                  ].map((item) => (
                    <div
                      key={item.num}
                      className="rounded-lg bg-white border border-[#DCE5EF] px-2.5 py-2 flex items-center gap-2"
                    >
                      <span className="w-4.5 h-4.5 rounded-md bg-[#17243D] text-[#00C98A] text-[10px] font-bold flex items-center justify-center shrink-0">
                        {item.num}
                      </span>
                      <span className="font-semibold text-[#17243D] leading-tight">
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {/* Chosen identity summary bar */}
              <div className="px-3.5 py-2.5 rounded-xl bg-[#ECFDF6] border border-[#00C98A]/40 flex flex-wrap items-center justify-between gap-2">
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#17243D] truncate">
                    {businessName.trim()}
                  </div>
                  <div className="text-[11px] font-mono text-[#059669] truncate">
                    https://{originDisplay}/{cleanSlugPreview}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="text-[11px] font-semibold text-[#17243D] underline hover:text-[#00A873] cursor-pointer"
                >
                  Ubah Nama / Link
                </button>
              </div>

              {/* Search & Category filter */}
              <div className="flex flex-col sm:flex-row gap-2">
                <div className="relative flex-1">
                  <Search className="w-3.5 h-3.5 text-[#8FA4BF] absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Cari template (kuliner, katalog, profil, jasa...)"
                    className="w-full pl-8 pr-3 py-2 rounded-xl border border-[#DCE5EF] bg-white text-xs text-[#17243D] placeholder:text-[#8FA4BF] outline-none focus:border-[#00C98A]"
                  />
                </div>
                <div className="flex items-center gap-1 overflow-x-auto no-scrollbar pb-0.5">
                  <button
                    type="button"
                    onClick={() => setCategoryFilter('all')}
                    className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                      categoryFilter === 'all'
                        ? 'bg-[#17243D] text-white'
                        : 'bg-[#F0F5FA] text-[#5B708B] hover:text-[#17243D]'
                    }`}
                  >
                    Semua ({templates.length})
                  </button>
                  {WEB_TEMPLATE_CATEGORIES.map((cat) => (
                    <button
                      key={cat.id}
                      type="button"
                      onClick={() => setCategoryFilter(cat.id)}
                      className={`px-2.5 py-1.5 rounded-lg text-[11px] font-semibold whitespace-nowrap cursor-pointer transition-colors ${
                        categoryFilter === cat.id
                          ? 'bg-[#17243D] text-white'
                          : 'bg-[#F0F5FA] text-[#5B708B] hover:text-[#17243D]'
                      }`}
                    >
                      {cat.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Template Grid */}
              {templatesLoading ? (
                <div className="py-10 text-center text-xs text-[#5B708B] flex flex-col items-center gap-2">
                  <Loader2 className="w-5 h-5 animate-spin text-[#00A873]" />
                  <span>Memuat daftar Template Web...</span>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Option: Blank Canvas */}
                  <button
                    type="button"
                    onClick={() => setSelectedTemplateId(null)}
                    className={`text-left rounded-xl border-2 p-3.5 transition-all cursor-pointer flex flex-col justify-between gap-2 ${
                      selectedTemplateId === null
                        ? 'border-[#00C98A] bg-[#ECFDF6]/60 shadow-xs'
                        : 'border-[#DCE5EF] bg-white hover:border-[#8FA4BF]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2.5">
                        <div className="w-9 h-9 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] flex items-center justify-center shrink-0">
                          <FilePlus2 className="w-4.5 h-4.5 text-[#17243D]" />
                        </div>
                        <div>
                          <div className="text-xs font-bold text-[#17243D]">
                            Mulai dari Kanvas Kosong
                          </div>
                          <div className="text-[11px] text-[#5B708B]">
                            Susun blok &amp; halaman dari nol
                          </div>
                        </div>
                      </div>
                      {selectedTemplateId === null && (
                        <span className="w-5 h-5 rounded-full bg-[#00C98A] text-white flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-[#5B708B] leading-relaxed">
                      Cocok jika Anda ingin merancang struktur halaman sendiri menggunakan blok katalog, slider, dan formulir.
                    </p>
                  </button>

                  {/* Saved Web Templates */}
                  {filteredTemplates.map((tpl) => {
                    const isSelected = selectedTemplateId === tpl.id;
                    const isExpanded = expandedPagesId === tpl.id;
                    return (
                      <div
                        key={tpl.id}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedTemplateId(tpl.id)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            setSelectedTemplateId(tpl.id);
                          }
                        }}
                        className={`text-left rounded-xl border-2 p-3.5 transition-all cursor-pointer flex flex-col justify-between gap-2.5 ${
                          isSelected
                            ? 'border-[#00C98A] bg-[#ECFDF6]/60 shadow-xs'
                            : 'border-[#DCE5EF] bg-white hover:border-[#8FA4BF]'
                        }`}
                      >
                        <div className="space-y-2">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="flex items-center gap-1.5 flex-wrap">
                                <span className="px-1.5 py-0.5 rounded bg-[#F0F5FA] border border-[#DCE5EF] text-[10px] font-semibold text-[#5B708B]">
                                  {WEB_TEMPLATE_CATEGORY_LABELS[tpl.category] || tpl.category}
                                </span>
                                {tpl.usageCount > 0 && (
                                  <span className="text-[10px] text-[#8FA4BF] font-medium">
                                    Dipakai {tpl.usageCount}x
                                  </span>
                                )}
                              </div>
                              <h3 className="text-xs font-bold text-[#17243D] mt-1 truncate">
                                {tpl.name}
                              </h3>
                            </div>
                            {isSelected ? (
                              <span className="w-5 h-5 rounded-full bg-[#00C98A] text-white flex items-center justify-center shrink-0">
                                <Check className="w-3 h-3" />
                              </span>
                            ) : (
                              <LayoutTemplate className="w-4 h-4 text-[#8FA4BF] shrink-0" />
                            )}
                          </div>

                          {tpl.description && (
                            <p className="text-[11px] text-[#5B708B] line-clamp-2 leading-relaxed">
                              {tpl.description}
                            </p>
                          )}
                        </div>

                        <div className="space-y-2 pt-1 border-t border-[#DCE5EF]/70">
                          <div className="flex items-center justify-between gap-2">
                            <div className="inline-flex items-center gap-1.5 text-[11px] font-semibold text-[#17243D]">
                              <Layers className="w-3.5 h-3.5 text-[#00A873]" />
                              <span>
                                Beranda
                                {tpl.subPageCount > 0 ? ` + ${tpl.subPageCount} Sub Halaman` : ''}
                              </span>
                              <span className="text-[#8FA4BF] font-normal">
                                · {tpl.totalBlockCount} blok
                              </span>
                            </div>

                            {tpl.paletteColors.length > 0 && (
                              <div className="flex items-center -space-x-1">
                                {tpl.paletteColors.slice(0, 4).map((hex, idx) => (
                                  <span
                                    key={`${tpl.id}_c_${idx}`}
                                    style={{ backgroundColor: hex }}
                                    className="w-3.5 h-3.5 rounded-full ring-1 ring-white border border-slate-200"
                                  />
                                ))}
                              </div>
                            )}
                          </div>

                          {tpl.subPageTitles.length > 0 && (
                            <div>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setExpandedPagesId(isExpanded ? null : tpl.id);
                                }}
                                className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#00A873] hover:underline cursor-pointer"
                              >
                                {isExpanded ? (
                                  <ChevronUp className="w-3 h-3" />
                                ) : (
                                  <ChevronDown className="w-3 h-3" />
                                )}
                                <span>
                                  {isExpanded
                                    ? 'Sembunyikan daftar sub halaman'
                                    : `Lihat ${tpl.subPageTitles.length} sub halaman di dalamnya`}
                                </span>
                              </button>
                              {isExpanded && (
                                <div className="mt-1.5 flex flex-wrap gap-1">
                                  {tpl.subPageTitles.map((title, i) => (
                                    <span
                                      key={`${tpl.id}_pg_${i}`}
                                      className="px-2 py-0.5 rounded-md bg-white border border-[#DCE5EF] text-[10px] font-medium text-[#17243D]"
                                    >
                                      {title}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              {!templatesLoading && templates.length === 0 && (
                <div className="rounded-xl border border-dashed border-[#DCE5EF] bg-[#F8FAFC] p-4 text-center text-xs text-[#5B708B]">
                  Belum ada Template Web bersama yang disimpan Admin. Anda dapat memilih{' '}
                  <strong className="text-[#17243D]">Mulai dari Kanvas Kosong</strong> sekarang.
                </div>
              )}

              {/* Publish toggle */}
              <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[#DCE5EF] bg-[#F8FAFC] cursor-pointer">
                <input
                  type="checkbox"
                  checked={publishImmediately}
                  onChange={(e) => setPublishImmediately(e.target.checked)}
                  className="mt-0.5 rounded border-[#DCE5EF] accent-[#00C98A] cursor-pointer"
                />
                <div className="text-xs">
                  <div className="font-semibold text-[#17243D]">
                    Langsung Tayangkan Publik di /{cleanSlugPreview}
                  </div>
                  <div className="text-[11px] text-[#5B708B]">
                    Biarkan tidak dicentang jika ingin mengedit konten terlebih dahulu sebagai Draf sebelum Publish.
                  </div>
                </div>
              </label>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#DCE5EF] bg-[#F8FAFC] flex items-center justify-between gap-3 shrink-0">
          {step === 1 ? (
            <>
              <span className="text-[11px] text-[#5B708B] hidden sm:inline">
                Langkah 1 dari 2 — Pilih nama usaha &amp; alamat web
              </span>
              <button
                type="button"
                disabled={!canProceedStep1}
                onClick={() => setStep(2)}
                className="ml-auto inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#17243D] hover:bg-[#223456] text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <span>Lanjut Pilih Template</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#00C98A]" />
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                disabled={submitting}
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-[#17243D] text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Kembali</span>
              </button>

              <button
                type="button"
                disabled={submitting}
                onClick={() => void handleCreateSite()}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#00C98A] hover:bg-[#00B37B] text-white text-xs font-bold shadow-xs transition-colors cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Menyiapkan Web Usaha...</span>
                  </>
                ) : (
                  <>
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>
                      {selectedTemplateObj
                        ? `Gunakan "${selectedTemplateObj.name}" & Mulai Edit`
                        : 'Buat Kanvas Kosong & Mulai Edit'}
                    </span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
