import { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  Copy,
  Download,
  ExternalLink,
  FileJson,
  Globe,
  Save,
  Settings,
  Trash2,
} from 'lucide-react';
import {
  FeaturePermissionsMap,
  ProjectPublishingConfig,
  ProjectRecord,
} from '../types/builder';
import {
  buildLiveUrls,
  isValidCustomDomain,
  normalizeCustomDomain,
  resolveProjectPublishing,
  sanitizeSlug,
} from '../utils/publishingHelpers';
import { copyTextToClipboard } from '../utils/clipboardHelpers';
import { ToggleSwitch } from './inspector/InspectorPrimitives';

interface BusinessSettingsPageProps {
  activeRecord: ProjectRecord;
  allProjects: ProjectRecord[];
  permissions: FeaturePermissionsMap;
  canDelete: boolean;
  onSaveBusinessSettings: (params: {
    title: string;
    nextPublishing: ProjectPublishingConfig;
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
  const [saving, setSaving] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [serverAppUrl, setServerAppUrl] = useState<string | null>(null);
  const isDirtyRef = useRef(false);
  const lastProjectIdRef = useRef(activeRecord.id);

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
      setConfirmDelete(false);
    }
    if (switched || !isDirtyRef.current) {
      setTitle(activeRecord.project.title);
      setPub(resolveProjectPublishing(activeRecord.project));
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
  const urls = useMemo(() => buildLiveUrls({ ...pub, slug: cleanSlug, customDomain: cleanDomain }, origin), [pub, cleanSlug, cleanDomain, origin]);

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
    };
    const res = await onSaveBusinessSettings({
      title: title.trim(),
      nextPublishing: nextPub,
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
                  Setting Usaha Aktif
                </h1>
                <span
                  className={`px-2 py-0.5 rounded-md text-[11px] font-semibold border ${
                    pub.isPublished
                      ? 'bg-[#ECFDF6] text-[#059669] border-[#00C98A]/40'
                      : 'bg-[#F0F5FA] text-[#51637D] border-[#DCE5EF]'
                  }`}
                >
                  {pub.isPublished ? 'Tayang Publik' : 'Draft'}
                </span>
              </div>
              <p className="text-xs text-[#8FA4BF] mt-0.5 truncate">
                Mengatur identitas, URL publik, domain, dan aksi cepat hanya untuk unit usaha aktif.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <a
              href={`/p/${cleanSlug}?preview=1`}
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
                <span>{copiedKey === 'url' ? 'Tersalin' : 'Salin Link'}</span>
              </button>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-[#17243D]">
                  {pub.isPublished ? 'Tayang' : 'Draft'}
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

        {/* Section 2: Domain Kustom */}
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

        {/* Section 3: Aksi Cepat Usaha */}
        <div className="bg-white rounded-2xl border border-[#DCE5EF] p-5 space-y-3">
          <div className="pb-2 border-b border-[#DCE5EF]">
            <h2 className="text-sm font-bold text-[#17243D]">Aksi Cepat Usaha Ini</h2>
            <p className="text-xs text-[#8FA4BF] mt-0.5">
              Duplikasi, unduh ekspor statis, backup JSON, atau hapus unit usaha aktif.
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
                    <span>Backup JSON Usaha</span>
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
