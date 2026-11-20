import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCheck,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  Globe,
  Image as ImageIcon,
  Link2,
  Loader2,
  MessageCircle,
  Save,
  Settings,
  Share2,
  Sparkles,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  FeaturePermissionsMap,
  ProjectPublishingConfig,
  ProjectRecord,
  WhatsappCenterConfig,
} from '../types/builder';
import {
  buildLiveUrls,
  findFallbackShareImageFromBlocks,
  isValidCustomDomain,
  normalizeCustomDomain,
  resolveProjectPublishing,
  sanitizeSlug,
} from '../utils/publishingHelpers';
import { copyTextToClipboard } from '../utils/clipboardHelpers';
import { uploadCompressedImageOrFallback } from '../utils/imageHelpers';
import { resolveWhatsappCenter } from '../utils/whatsappBuilder';
import { ToggleSwitch } from './inspector/InspectorPrimitives';
import { WhatsAppCenterPanel } from './WhatsAppCenterPanel';

interface BusinessSettingsPageProps {
  activeRecord: ProjectRecord;
  allProjects: ProjectRecord[];
  permissions: FeaturePermissionsMap;
  canDelete: boolean;
  onSaveBusinessSettings: (params: {
    title: string;
    nextPublishing: ProjectPublishingConfig;
    nextWhatsappCenter?: WhatsappCenterConfig;
    publishNow: boolean;
  }) => Promise<{ ok: boolean; error?: string }>;
  onDuplicateProject: (id: string) => void;
  onDeleteProject: (id: string) => void;
  onDownloadHtml: (record: ProjectRecord) => void;
  onBackupProject: () => void;
  onOpenSystemTab?: (tab: 'daftar_usaha' | 'domain') => void;
}

export function BusinessSettingsPage({
  activeRecord,
  allProjects,
  permissions,
  canDelete,
  onSaveBusinessSettings,
  onDuplicateProject,
  onDeleteProject,
  onDownloadHtml,
  onBackupProject,
  onOpenSystemTab,
}: BusinessSettingsPageProps) {
  const [title, setTitle] = useState(activeRecord.project.title);
  const [pub, setPub] = useState<ProjectPublishingConfig>(() =>
    resolveProjectPublishing(activeRecord.project)
  );
  const [waCenter, setWaCenter] = useState<WhatsappCenterConfig>(() =>
    resolveWhatsappCenter(activeRecord.project)
  );
  const [saving, setSaving] = useState(false);
  const [uploadingOgImage, setUploadingOgImage] = useState(false);
  const [ogUploadError, setOgUploadError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [serverAppUrl, setServerAppUrl] = useState<string | null>(null);
  const isDirtyRef = useRef(false);
  const lastProjectIdRef = useRef(activeRecord.id);
  const ogFileInputRef = useRef<HTMLInputElement | null>(null);

  const editTitle = (next: string) => {
    isDirtyRef.current = true;
    setTitle(next);
  };

  const editPub = (
    updater:
      | ProjectPublishingConfig
      | ((prev: ProjectPublishingConfig) => ProjectPublishingConfig)
  ) => {
    isDirtyRef.current = true;
    setPub(updater);
  };

  useEffect(() => {
    const switched = lastProjectIdRef.current !== activeRecord.id;
    if (switched) {
      lastProjectIdRef.current = activeRecord.id;
      isDirtyRef.current = false;
      setFeedback(null);
      setOgUploadError(null);
      setConfirmDelete(false);
    }
    if (switched || !isDirtyRef.current) {
      setTitle(activeRecord.project.title);
      setPub(resolveProjectPublishing(activeRecord.project));
      setWaCenter(resolveWhatsappCenter(activeRecord.project));
    }
  }, [activeRecord.id, activeRecord.revision, activeRecord.lastSavedAt, activeRecord.project]);

  useEffect(() => {
    let active = true;
    fetch('/api/health')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (active && data && typeof data.appUrl === 'string' && data.appUrl) {
          setServerAppUrl(data.appUrl);
        }
      })
      .catch(() => {});
    return () => {
      active = false;
    };
  }, []);

  const isVirtualAiStudioHost =
    typeof window !== 'undefined' && window.location.hostname.endsWith('.ai.studio');
  const origin =
    isVirtualAiStudioHost && serverAppUrl
      ? serverAppUrl
      : typeof window !== 'undefined'
      ? window.location.origin
      : 'https://app.domain';

  const cleanSlug = sanitizeSlug(pub.slug, 'unit-usaha');
  const cleanDomain = normalizeCustomDomain(pub.customDomain);
  const domainValid = isValidCustomDomain(cleanDomain);
  const urls = useMemo(
    () => buildLiveUrls({ ...pub, slug: cleanSlug, customDomain: cleanDomain }, origin),
    [pub, cleanSlug, cleanDomain, origin]
  );

  const fallbackPageImage = useMemo(
    () => findFallbackShareImageFromBlocks(activeRecord.project.blocks),
    [activeRecord.project.blocks]
  );

  const effectivePreviewImage = (pub.seoImage || '').trim() || fallbackPageImage;
  const usingFallbackImage = !(pub.seoImage || '').trim() && Boolean(fallbackPageImage);
  const isInlineDataOgImage = /^data:/i.test((pub.seoImage || '').trim());

  const previewTitle = (pub.seoTitle || '').trim() || title.trim() || 'Halaman Usaha';
  const previewDescription =
    (pub.seoDescription || '').trim() ||
    `Katalog dan layanan resmi ${title.trim() || 'Halaman Usaha'}.`;
  const previewDomain = useMemo(() => {
    if (pub.seoSiteName?.trim()) return pub.seoSiteName.trim();
    try {
      return new URL(urls.primaryUrl).host;
    } catch {
      return cleanDomain || 'domain-anda.com';
    }
  }, [pub.seoSiteName, urls.primaryUrl, cleanDomain]);

  const previewShareCaption = (pub.seoShareText || '').trim();
  const fullShareMessage = previewShareCaption
    ? `${previewShareCaption} ${urls.primaryUrl}`
    : urls.primaryUrl;
  const waShareHref = `https://wa.me/?text=${encodeURIComponent(fullShareMessage)}`;

  const slugConflict = useMemo(() => {
    return allProjects.find(
      (rec) =>
        rec.id !== activeRecord.id &&
        sanitizeSlug(rec.project.publishing?.slug || rec.project.title, '') === cleanSlug
    );
  }, [allProjects, activeRecord.id, cleanSlug]);

  const handleCopy = async (key: string, text: string) => {
    const ok = await copyTextToClipboard(text);
    if (ok) {
      setCopiedKey(key);
      setTimeout(() => setCopiedKey((prev) => (prev === key ? null : prev)), 1800);
    }
  };

  const handleUploadOgImage = async (file: File | undefined) => {
    if (!file) return;
    setOgUploadError(null);
    setUploadingOgImage(true);
    try {
      // JPEG 1200px max guarantees universal WhatsApp, Facebook, Telegram, and X large-card rendering
      const uploadedUrl = await uploadCompressedImageOrFallback(file, {
        maxDimension: 1200,
        quality: 0.86,
        format: 'jpeg',
      });
      editPub((prev) => ({ ...prev, seoImage: uploadedUrl }));
    } catch (err) {
      setOgUploadError(
        err instanceof Error ? err.message : 'Gagal mengunggah gambar preview link.'
      );
    } finally {
      setUploadingOgImage(false);
      if (ogFileInputRef.current) {
        ogFileInputRef.current.value = '';
      }
    }
  };

  const handleSave = async (publishNow: boolean) => {
    if (!title.trim()) {
      setFeedback({ type: 'err', text: 'Nama unit usaha tidak boleh kosong.' });
      return;
    }
    if (slugConflict) {
      setFeedback({
        type: 'err',
        text: `Slug "/p/${cleanSlug}" sudah dipakai oleh "${slugConflict.project.title}".`,
      });
      return;
    }
    if (pub.useCustomDomain && (!cleanDomain || !domainValid)) {
      setFeedback({
        type: 'err',
        text: 'Format domain kustom belum valid (contoh: promo.tokokopi.id).',
      });
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
      seoTitle: (pub.seoTitle || '').trim(),
      seoDescription: (pub.seoDescription || '').trim(),
      seoImage: (pub.seoImage || '').trim(),
      seoImageAlt: (pub.seoImageAlt || '').trim(),
      seoSiteName: (pub.seoSiteName || '').trim(),
      seoShareText: (pub.seoShareText || '').trim(),
    };
    const res = await onSaveBusinessSettings({
      title: title.trim(),
      nextPublishing: nextPub,
      nextWhatsappCenter: waCenter,
      publishNow,
    });
    setSaving(false);
    if (res.ok) {
      isDirtyRef.current = false;
      setPub(nextPub);
      setFeedback({
        type: 'ok',
        text: publishNow
          ? `Usaha berhasil disimpan & ditayangkan di /p/${cleanSlug}.`
          : 'Pengaturan usaha aktif berhasil disimpan.',
      });
    } else {
      setFeedback({ type: 'err', text: res.error || 'Gagal menyimpan pengaturan usaha.' });
    }
  };

  const canEditIdentity = permissions.editor || permissions.publishing;
  const openPageHref = pub.isPublished ? `/p/${cleanSlug}` : `/p/${cleanSlug}?preview=1`;

  return (
    <div className="flex-1 h-full overflow-y-auto bg-[#F0F5FA] p-4 sm:p-6">
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Page Header Card */}
        <div className="bg-white rounded-2xl border border-[#DCE5EF] p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-xl bg-[#17243D] text-white flex items-center justify-center shrink-0">
              <Settings className="w-5 h-5 text-[#00C98A]" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-base font-bold text-[#17243D] truncate">
                  Pengaturan Usaha Aktif
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                    pub.isPublished
                      ? 'bg-[#ECFDF6] text-[#059669] border-[#00C98A]/40'
                      : 'bg-[#F0F5FA] text-[#51637D] border-[#DCE5EF]'
                  }`}
                >
                  {pub.isPublished ? 'Tayang Publik' : 'Draf'}
                </span>
              </div>
              <p className="text-xs text-[#8FA4BF] mt-0.5 truncate">
                Mengatur identitas, tampilan tautan berbagi, Pusat WhatsApp, URL publik, domain, dan aksi cepat unit usaha aktif.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={openPageHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-xs font-semibold text-[#17243D]"
            >
              <ExternalLink className="w-3.5 h-3.5 text-[#00C98A]" />
              <span>Buka Halaman</span>
            </a>
            {onOpenSystemTab && (
              <button
                type="button"
                onClick={() => onOpenSystemTab('daftar_usaha')}
                className="px-3 py-1.5 rounded-xl border border-[#DCE5EF] bg-[#F0F5FA] hover:bg-[#DCE5EF]/60 text-xs font-semibold text-[#17243D] cursor-pointer"
              >
                Kelola Semua Usaha
              </button>
            )}
          </div>
        </div>

        {feedback && (
          <div
            className={`px-4 py-3 rounded-xl border text-xs font-medium ${
              feedback.type === 'ok'
                ? 'bg-[#ECFDF6] border-[#00C98A]/40 text-[#17243D]'
                : 'bg-red-50 border-red-200 text-red-700'
            }`}
          >
            {feedback.text}
          </div>
        )}

        {/* Section 1: Identitas & Status Publikasi */}
        <div className="bg-white rounded-2xl border border-[#DCE5EF] p-5 space-y-4">
          <div className="pb-2.5 border-b border-[#DCE5EF]">
            <h2 className="text-sm font-bold text-[#17243D]">Identitas &amp; URL Publik</h2>
            <p className="text-xs text-[#8FA4BF] mt-0.5">
              Nama usaha, tautan slug, dan status tayang untuk pengunjung.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1.5">
                Nama Unit Usaha
              </label>
              <input
                type="text"
                value={title}
                disabled={!canEditIdentity}
                onChange={(e) => editTitle(e.target.value)}
                placeholder="Contoh: Warung Kopi Barokah"
                className="w-full px-3 py-2 text-xs rounded-xl border border-[#DCE5EF] bg-white text-[#17243D] outline-none focus:border-[#00C98A] disabled:opacity-60"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1.5">
                Slug URL Publik
              </label>
              <div className="flex items-center rounded-xl border border-[#DCE5EF] overflow-hidden focus-within:border-[#00C98A]">
                <span className="px-2.5 py-2 bg-[#F0F5FA] text-xs font-mono text-[#51637D] border-r border-[#DCE5EF]">
                  /p/
                </span>
                <input
                  type="text"
                  value={pub.slug}
                  disabled={!permissions.publishing}
                  onChange={(e) => editPub((prev) => ({ ...prev, slug: e.target.value }))}
                  placeholder="nama-usaha"
                  className="flex-1 px-2.5 py-2 text-xs font-mono text-[#17243D] bg-white outline-none disabled:opacity-60"
                />
              </div>
              {slugConflict && (
                <p className="text-[11px] text-red-600 mt-1 font-medium">
                  Slug ini sudah dipakai oleh &ldquo;{slugConflict.project.title}&rdquo;.
                </p>
              )}
            </div>
          </div>

          <div className="p-3.5 rounded-xl bg-[#F0F5FA]/70 border border-[#DCE5EF] flex flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="text-xs font-bold text-[#17243D]">Status Tayang Halaman</div>
              <div className="text-[11px] text-[#51637D] truncate mt-0.5 font-mono">
                {urls.primaryUrl}
              </div>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              <button
                type="button"
                onClick={() => void handleCopy('url', urls.primaryUrl)}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-[11px] font-semibold text-[#17243D] cursor-pointer"
              >
                {copiedKey === 'url' ? (
                  <Check className="w-3 h-3 text-[#00C98A]" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedKey === 'url' ? 'Tersalin' : 'Salin Tautan'}</span>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#17243D]">
                  {pub.isPublished ? 'Tayang' : 'Draf'}
                </span>
                <ToggleSwitch
                  checked={pub.isPublished}
                  onChange={(checked) =>
                    editPub((prev) => ({ ...prev, isPublished: checked }))
                  }
                  label="Aktifkan publikasi halaman"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Section 2: Tampilan Tautan Berbagi (WhatsApp & Media Sosial) */}
        <div className="bg-white rounded-2xl border border-[#DCE5EF] p-5 space-y-4">
          <div className="flex flex-wrap items-start justify-between gap-2 pb-2.5 border-b border-[#DCE5EF]">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#ECFDF6] border border-[#00C98A]/30 text-[#059669] flex items-center justify-center shrink-0 mt-0.5">
                <Share2 className="w-4 h-4" />
              </div>
              <div>
                <h2 className="text-sm font-bold text-[#17243D]">
                  Tampilan Tautan Berbagi (WhatsApp &amp; Media Sosial)
                </h2>
                <p className="text-xs text-[#8FA4BF] mt-0.5">
                  Atur gambar banner, judul, deskripsi, dan teks pesan agar kartu link tampil profesional saat dibagikan ke WhatsApp, Telegram, Facebook, atau X.
                </p>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
            {/* Left: Form Inputs */}
            <div className="lg:col-span-7 space-y-3.5">
              {/* Gambar Banner Preview */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <label className="text-xs font-semibold text-[#17243D]">
                    Gambar Banner Preview Link
                  </label>
                  <span className="text-[10px] font-medium text-[#8FA4BF]">
                    Ideal 1200 × 630 px (1.91:1)
                  </span>
                </div>

                <input
                  ref={ogFileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  className="hidden"
                  onChange={(e) => void handleUploadOgImage(e.target.files?.[0])}
                />

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={pub.seoImage ?? ''}
                    disabled={!permissions.publishing || uploadingOgImage}
                    onChange={(e) =>
                      editPub((prev) => ({ ...prev, seoImage: e.target.value }))
                    }
                    placeholder="Upload gambar atau tempel URL gambar (https://...)"
                    className="flex-1 min-w-0 px-3 py-2 text-xs rounded-xl border border-[#DCE5EF] bg-white text-[#17243D] outline-none focus:border-[#00C98A] disabled:opacity-60"
                  />
                  <button
                    type="button"
                    disabled={!permissions.publishing || uploadingOgImage}
                    onClick={() => ogFileInputRef.current?.click()}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#17243D] hover:bg-[#223456] text-white text-xs font-semibold shrink-0 disabled:opacity-50 cursor-pointer"
                  >
                    {uploadingOgImage ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00C98A]" />
                    ) : (
                      <Upload className="w-3.5 h-3.5 text-[#00C98A]" />
                    )}
                    <span>{uploadingOgImage ? 'Mengunggah...' : 'Upload'}</span>
                  </button>
                  {Boolean(pub.seoImage?.trim()) && permissions.publishing && (
                    <button
                      type="button"
                      title="Hapus gambar banner"
                      onClick={() => editPub((prev) => ({ ...prev, seoImage: '' }))}
                      className="p-2 rounded-xl border border-[#DCE5EF] bg-white hover:bg-red-50 hover:border-red-200 text-[#51637D] hover:text-red-600 shrink-0 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  {fallbackPageImage && fallbackPageImage !== (pub.seoImage || '').trim() && (
                    <button
                      type="button"
                      disabled={!permissions.publishing}
                      onClick={() =>
                        editPub((prev) => ({ ...prev, seoImage: fallbackPageImage }))
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#DCE5EF] bg-[#F0F5FA] hover:bg-[#DCE5EF]/70 text-[11px] font-semibold text-[#17243D] cursor-pointer disabled:opacity-50"
                    >
                      <Sparkles className="w-3 h-3 text-[#00C98A]" />
                      <span>Pakai Gambar dari Halaman</span>
                    </button>
                  )}
                  {usingFallbackImage && (
                    <span className="text-[11px] text-[#51637D]">
                      Saat ini otomatis menggunakan gambar pertama di halaman.
                    </span>
                  )}
                </div>

                {ogUploadError && (
                  <p className="text-[11px] text-red-600 font-medium">{ogUploadError}</p>
                )}
                {isInlineDataOgImage && (
                  <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5">
                    Gambar tersimpan sebagai data lokal (offline). Pastikan login saat upload atau gunakan URL https:// agar WhatsApp dapat menampilkan gambar banner.
                  </p>
                )}
              </div>

              {/* Judul Share Link */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="text-xs font-semibold text-[#17243D]">
                    Judul Preview Link (og:title)
                  </label>
                  <span
                    className={`text-[10px] font-mono ${
                      (pub.seoTitle || '').length > 65 ? 'text-amber-600' : 'text-[#8FA4BF]'
                    }`}
                  >
                    {(pub.seoTitle || '').length}/60
                  </span>
                </div>
                <input
                  type="text"
                  maxLength={120}
                  value={pub.seoTitle ?? ''}
                  disabled={!permissions.publishing}
                  onChange={(e) =>
                    editPub((prev) => ({ ...prev, seoTitle: e.target.value }))
                  }
                  placeholder={title || 'Contoh: Pataka Jas Club — Katalog & Reservasi Resmi'}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#DCE5EF] bg-white text-[#17243D] outline-none focus:border-[#00C98A] disabled:opacity-60"
                />
              </div>

              {/* Deskripsi Share Link */}
              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <label className="text-xs font-semibold text-[#17243D]">
                    Deskripsi Preview Link (og:description)
                  </label>
                  <span
                    className={`text-[10px] font-mono ${
                      (pub.seoDescription || '').length > 160
                        ? 'text-amber-600'
                        : 'text-[#8FA4BF]'
                    }`}
                  >
                    {(pub.seoDescription || '').length}/160
                  </span>
                </div>
                <textarea
                  rows={3}
                  maxLength={300}
                  value={pub.seoDescription ?? ''}
                  disabled={!permissions.publishing}
                  onChange={(e) =>
                    editPub((prev) => ({ ...prev, seoDescription: e.target.value }))
                  }
                  placeholder={`Katalog dan layanan resmi ${title || 'unit usaha Anda'}. Pesan cepat langsung via WhatsApp.`}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#DCE5EF] bg-white text-[#17243D] outline-none focus:border-[#00C98A] resize-none leading-relaxed disabled:opacity-60"
                />
              </div>

              {/* Nama Situs & Alt Gambar */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-[#17243D] mb-1">
                    Nama Situs / Brand (og:site_name)
                  </label>
                  <input
                    type="text"
                    maxLength={80}
                    value={pub.seoSiteName ?? ''}
                    disabled={!permissions.publishing}
                    onChange={(e) =>
                      editPub((prev) => ({ ...prev, seoSiteName: e.target.value }))
                    }
                    placeholder={title || 'cekdetail.pataka360.com'}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#DCE5EF] bg-white text-[#17243D] outline-none focus:border-[#00C98A] disabled:opacity-60"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#17243D] mb-1">
                    Teks Alt Gambar (Opsional)
                  </label>
                  <input
                    type="text"
                    maxLength={120}
                    value={pub.seoImageAlt ?? ''}
                    disabled={!permissions.publishing}
                    onChange={(e) =>
                      editPub((prev) => ({ ...prev, seoImageAlt: e.target.value }))
                    }
                    placeholder={previewTitle}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-[#DCE5EF] bg-white text-[#17243D] outline-none focus:border-[#00C98A] disabled:opacity-60"
                  />
                </div>
              </div>

              {/* Teks Pengantar Pesan Share */}
              <div>
                <label className="block text-xs font-semibold text-[#17243D] mb-1">
                  Teks Pesan Saat Share (Opsional)
                </label>
                <input
                  type="text"
                  maxLength={280}
                  value={pub.seoShareText ?? ''}
                  disabled={!permissions.publishing}
                  onChange={(e) =>
                    editPub((prev) => ({ ...prev, seoShareText: e.target.value }))
                  }
                  placeholder={`Contoh: ${previewTitle}`}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-[#DCE5EF] bg-white text-[#17243D] outline-none focus:border-[#00C98A] disabled:opacity-60"
                />
                <p className="text-[11px] text-[#8FA4BF] mt-1">
                  Muncul tepat sebelum link saat memakai tombol &ldquo;Salin Pesan + Link&rdquo; atau &ldquo;Bagikan ke WA&rdquo;.
                </p>
              </div>
            </div>

            {/* Right: Live WhatsApp Share Card Preview */}
            <div className="lg:col-span-5 space-y-2.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#17243D]">
                  Pratinjau Berbagi WhatsApp
                </span>
                <span className="text-[10px] font-semibold text-[#059669] bg-[#ECFDF6] border border-[#00C98A]/30 px-2 py-0.5 rounded-md">
                  Pratinjau Langsung
                </span>
              </div>

              {/* WhatsApp Chat Wallpaper & Bubble */}
              <div className="rounded-2xl bg-[#0B141A] p-3.5 border border-[#1E2B33] shadow-sm">
                <div className="rounded-xl overflow-hidden bg-[#005C4B] shadow-md">
                  {/* Top Rich Card Container */}
                  <div className="bg-[#024A3D] overflow-hidden">
                    {/* Large Banner Image (1.91:1) */}
                    <div className="relative w-full aspect-[1200/630] bg-[#0B1F1B] flex items-center justify-center overflow-hidden">
                      {effectivePreviewImage ? (
                        <>
                          <img
                            src={effectivePreviewImage}
                            alt={pub.seoImageAlt?.trim() || previewTitle}
                            className="w-full h-full object-cover"
                          />
                          {usingFallbackImage && (
                            <span className="absolute top-2 right-2 px-1.5 py-0.5 rounded bg-black/65 text-[9px] font-medium text-white/90">
                              Otomatis dari halaman
                            </span>
                          )}
                        </>
                      ) : (
                        <div className="flex flex-col items-center justify-center text-center px-4 py-3 text-[#7BA59B]">
                          <ImageIcon className="w-7 h-7 mb-1.5 opacity-70" />
                          <span className="text-[11px] font-semibold text-[#B4D2CA]">
                            Belum ada gambar banner
                          </span>
                          <span className="text-[10px] opacity-80 mt-0.5">
                            Upload gambar 1200×630 agar kartu tampil penuh
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Card Text Metadata */}
                    <div className="px-3 py-2.5 space-y-1">
                      <div className="text-[13px] font-bold text-[#E9EDEF] leading-snug line-clamp-2 break-words">
                        {previewTitle}
                      </div>
                      <div className="text-[11px] text-[#A8C6BF] leading-relaxed line-clamp-3 break-words">
                        {previewDescription}
                      </div>
                      <div className="flex items-center gap-1 pt-0.5 text-[11px] text-[#B8D4CD]">
                        <Link2 className="w-3 h-3 shrink-0 opacity-80" />
                        <span className="truncate">{previewDomain}</span>
                      </div>
                    </div>
                  </div>

                  {/* Bubble Message Text + Link + Timestamp */}
                  <div className="px-3 py-2 text-[12px] leading-snug text-[#E9EDEF] break-words">
                    {previewShareCaption && (
                      <span className="font-semibold text-white mr-1">
                        {previewShareCaption}
                      </span>
                    )}
                    <span className="text-[#53BDEB] underline break-all">
                      {urls.primaryUrl}
                    </span>
                    <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#99BEB7]">
                      <span>12:20</span>
                      <CheckCheck className="w-3.5 h-3.5 text-[#53BDEB]" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Quick Share Action Buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => void handleCopy('share_msg', fullShareMessage)}
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-[11px] font-semibold text-[#17243D] cursor-pointer"
                >
                  {copiedKey === 'share_msg' ? (
                    <Check className="w-3.5 h-3.5 text-[#00C98A]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5 text-[#51637D]" />
                  )}
                  <span>{copiedKey === 'share_msg' ? 'Tersalin!' : 'Salin Pesan + Link'}</span>
                </button>
                <a
                  href={waShareHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#059669] hover:bg-[#047857] text-white text-[11px] font-semibold"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  <span>Bagikan ke WA</span>
                </a>
              </div>

              <p className="text-[11px] text-[#8FA4BF] leading-relaxed">
                Klik <strong className="text-[#51637D]">Simpan &amp; Tayangkan</strong> setelah mengubah gambar atau teks. Jika WhatsApp masih menyimpan preview lama, tambahkan{' '}
                <code className="px-1 py-0.5 rounded bg-[#F0F5FA] border border-[#DCE5EF] text-[#17243D] font-mono">
                  ?v=2
                </code>{' '}
                di ujung link untuk menyegarkan cache WA.
              </p>
            </div>
          </div>

          {canEditIdentity && (
            <div className="pt-3 border-t border-[#DCE5EF] flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-xs font-semibold text-[#17243D] disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Perubahan</span>
              </button>
              {permissions.publishing && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSave(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#17243D] hover:bg-[#223456] text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5 text-[#00C98A]" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan & Tayangkan'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Section 3: Domain Kustom */}
        <div className="bg-white rounded-2xl border border-[#DCE5EF] p-5 space-y-4">
          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#DCE5EF]">
            <div>
              <h2 className="text-sm font-bold text-[#17243D]">Domain Kustom</h2>
              <p className="text-xs text-[#8FA4BF] mt-0.5">
                Arahkan domain atau subdomain milik usaha ini langsung ke halaman /p/{cleanSlug}.
              </p>
            </div>
            <ToggleSwitch
              checked={pub.useCustomDomain}
              onChange={(checked) =>
                editPub((prev) => ({ ...prev, useCustomDomain: checked }))
              }
              label="Gunakan Domain Kustom"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1.5">
                Nama Domain / Subdomain
              </label>
              <input
                type="text"
                value={pub.customDomain}
                disabled={!permissions.publishing}
                onChange={(e) => editPub((prev) => ({ ...prev, customDomain: e.target.value }))}
                placeholder="promo.usahamu.id"
                className="w-full px-3 py-2 text-xs font-mono rounded-xl border border-[#DCE5EF] bg-white text-[#17243D] outline-none focus:border-[#00C98A] disabled:opacity-60"
              />
              {pub.useCustomDomain && pub.customDomain && !domainValid && (
                <p className="text-[11px] text-red-600 mt-1">
                  Format domain belum valid. Contoh: tokokopi.id atau order.tokokopi.id
                </p>
              )}
            </div>

            {pub.useCustomDomain && (
              <div className="p-3 rounded-xl bg-[#F0F5FA] border border-[#DCE5EF] text-[11px] text-[#51637D] leading-relaxed">
                <strong className="text-[#17243D]">Panduan DNS:</strong> Tambahkan record{' '}
                <code className="px-1 py-0.5 rounded bg-white border border-[#DCE5EF] font-mono">
                  CNAME
                </code>{' '}
                di panel domain Anda menuju host server aplikasi ini, lalu aktifkan HTTPS proxy.
              </div>
            )}
          </div>

          {canEditIdentity && (
            <div className="pt-2 border-t border-[#DCE5EF] flex flex-wrap items-center justify-end gap-2">
              <button
                type="button"
                disabled={saving}
                onClick={() => void handleSave(false)}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-xs font-semibold text-[#17243D] disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>Simpan Perubahan</span>
              </button>
              {permissions.publishing && (
                <button
                  type="button"
                  disabled={saving}
                  onClick={() => void handleSave(true)}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#17243D] hover:bg-[#223456] text-xs font-semibold text-white disabled:opacity-50 cursor-pointer"
                >
                  <Globe className="w-3.5 h-3.5 text-[#00C98A]" />
                  <span>{saving ? 'Menyimpan...' : 'Simpan & Tayangkan'}</span>
                </button>
              )}
            </div>
          )}
        </div>

        {/* Section 3B: Pusat WhatsApp & Pembuat Pesan (Section I & J) */}
        <WhatsAppCenterPanel
          projectId={activeRecord.id}
          config={waCenter}
          canEdit={canEditIdentity}
          saving={saving}
          onChange={setWaCenter}
          onSave={() => void handleSave(false)}
        />

        {/* Section 4: Aksi Cepat Usaha */}
        <div className="bg-white rounded-2xl border border-[#DCE5EF] p-5 space-y-3">
          <div className="pb-2 border-b border-[#DCE5EF]">
            <h2 className="text-sm font-bold text-[#17243D]">Aksi Cepat Usaha Ini</h2>
            <p className="text-xs text-[#8FA4BF] mt-0.5">
              Duplikasi, unduh ekspor statis, cadangkan JSON, atau hapus unit usaha aktif.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              {permissions.projects && (
                <button
                  type="button"
                  onClick={() => onDuplicateProject(activeRecord.id)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-xs font-semibold text-[#17243D] cursor-pointer"
                >
                  <Copy className="w-3.5 h-3.5 text-[#00C98A]" />
                  <span>Duplikat Usaha Ini</span>
                </button>
              )}
              {permissions.export_backup && (
                <>
                  <button
                    type="button"
                    onClick={() => onDownloadHtml(activeRecord)}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-xs font-semibold text-[#17243D] cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Unduh HTML</span>
                  </button>
                  <button
                    type="button"
                    onClick={onBackupProject}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-xs font-semibold text-[#17243D] cursor-pointer"
                  >
                    <FileJson className="w-3.5 h-3.5" />
                    <span>Cadangkan JSON Usaha</span>
                  </button>
                </>
              )}
            </div>

            {permissions.projects && canDelete && (
              confirmDelete ? (
                <div className="inline-flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => {
                      onDeleteProject(activeRecord.id);
                      setConfirmDelete(false);
                    }}
                    className="px-3 py-2 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold cursor-pointer"
                  >
                    Yakin Hapus Usaha
                  </button>
                  <button
                    type="button"
                    onClick={() => setConfirmDelete(false)}
                    className="px-3 py-2 rounded-xl border border-[#DCE5EF] bg-white text-xs font-semibold text-[#51637D] cursor-pointer"
                  >
                    Batal
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => setConfirmDelete(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-red-200 bg-red-50/70 hover:bg-red-100 text-xs font-semibold text-red-700 cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Hapus Usaha Ini</span>
                </button>
              )
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
