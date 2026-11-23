import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Database,
  Download,
  Globe,
  KeyRound,
  RefreshCw,
  Save,
  Send,
  Settings2,
  Shield,
  Trash2,
  Upload,
  Webhook,
  X,
} from 'lucide-react';
import {
  ApiSettingsConfig,
  DbDiagnostics,
  RestorePreviewSummary,
  WebhookEventName,
  WebhookLogRecord,
} from '../types/builder';
import {
  applyBackupRestoreOnServer,
  clearWebhookLogsOnServer,
  exportCompleteBackupFromServer,
  fetchApiSettingsFromServer,
  fetchFullSqlDumpFromServer,
  fetchSchemaSqlFromServer,
  previewBackupRestoreOnServer,
  reconnectDbOnServer,
  saveApiSettingsToServer,
  testWebhookOnServer,
} from '../utils/authClient';
import { copyTextToClipboard } from '../utils/clipboardHelpers';
import { downloadTextFile } from '../utils/projectStorage';

interface ApiSettingsModalProps {
  onClose?: () => void;
  onSaved?: (settings: ApiSettingsConfig) => void;
  onRestoreCompleted?: () => void;
  asPage?: boolean;
}

type ApiTab = 'webhook' | 'public_api' | 'database';

const WEBHOOK_EVENT_OPTIONS: {
  id: WebhookEventName;
  label: string;
  desc: string;
}[] = [
  {
    id: 'wa_click',
    label: 'Klik WhatsApp (wa_click)',
    desc: 'Kirim payload otomatis saat pengunjung klik CTA WA / checkout keranjang.',
  },
  {
    id: 'form_submit',
    label: 'Submit Formulir (form_submit)',
    desc: 'Kirim data lead saat formulir di landing page dikirim pengunjung.',
  },
  {
    id: 'project_save',
    label: 'Simpan Proyek (project_save)',
    desc: 'Notifikasi server-to-server setiap perubahan proyek disimpan.',
  },
  {
    id: 'project_publish',
    label: 'Publikasi Halaman (project_publish)',
    desc: 'Trigger sinkronisasi CDN / CRM saat halaman ditayangkan ke publik.',
  },
];

export function ApiSettingsModal({
  onClose = () => {},
  onSaved,
  onRestoreCompleted,
  asPage = false,
}: ApiSettingsModalProps) {
  const [tab, setTab] = useState<ApiTab>('webhook');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [testingWebhook, setTestingWebhook] = useState(false);
  const [reconnectingDb, setReconnectingDb] = useState(false);
  const [exportingFullSql, setExportingFullSql] = useState(false);
  const [exportingCompleteJson, setExportingCompleteJson] = useState(false);
  const [restoreBundle, setRestoreBundle] = useState<unknown | null>(null);
  const [restoreFilename, setRestoreFilename] = useState<string>('');
  const [restorePreview, setRestorePreview] = useState<RestorePreviewSummary | null>(null);
  const [previewingRestore, setPreviewingRestore] = useState(false);
  const [applyingRestore, setApplyingRestore] = useState(false);
  const [confirmOverwriteRestore, setConfirmOverwriteRestore] = useState(false);
  const [copiedPath, setCopiedPath] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{
    type: 'ok' | 'err';
    text: string;
  } | null>(null);

  const [settings, setSettings] = useState<ApiSettingsConfig>({
    publicApiEnabled: true,
    requireAuthForBuilder: true,
    webhookUrl: '',
    webhookEvents: ['wa_click', 'form_submit', 'project_publish'],
    corsOrigins: '*',
    rateLimitPerMinute: 120,
    metaApiVersion: 'v21.0',
    waDefaultCountryCode: '62',
    autoPublishOnSave: false,
    updatedAt: Date.now(),
  });
  const [diagnostics, setDiagnostics] = useState<DbDiagnostics | null>(null);
  const [logs, setLogs] = useState<WebhookLogRecord[]>([]);

  const loadAll = async () => {
    setLoading(true);
    const res = await fetchApiSettingsFromServer();
    setLoading(false);
    if (!res.ok || !res.data) {
      setFeedback({
        type: 'err',
        text: res.error || 'Gagal memuat konfigurasi API dari server.',
      });
      return;
    }
    setSettings(res.data.settings);
    setDiagnostics(res.data.diagnostics);
    setLogs(res.data.logs);
  };

  useEffect(() => {
    void loadAll();
  }, []);

  const handleSave = async () => {
    setSaving(true);
    setFeedback(null);
    const res = await saveApiSettingsToServer(settings);
    setSaving(false);
    if (!res.ok || !res.settings) {
      setFeedback({
        type: 'err',
        text: res.error || 'Gagal menyimpan Setting API.',
      });
      return;
    }
    setSettings(res.settings);
    onSaved?.(res.settings);
    setFeedback({
      type: 'ok',
      text: 'Semua pengaturan API, keamanan, dan webhook berhasil disimpan.',
    });
  };

  const handleTestWebhook = async () => {
    if (!settings.webhookUrl.trim()) {
      setFeedback({
        type: 'err',
        text: 'Masukkan URL Webhook HTTPS tujuan terlebih dahulu.',
      });
      return;
    }
    setTestingWebhook(true);
    setFeedback(null);
    const res = await testWebhookOnServer(settings.webhookUrl.trim());
    setTestingWebhook(false);
    if (res.log) {
      setLogs((prev) => [res.log!, ...prev].slice(0, 50));
    }
    if (res.ok) {
      setFeedback({
        type: 'ok',
        text: `Webhook berhasil dikirim (HTTP ${res.log?.statusCode ?? 200}).`,
      });
    } else {
      setFeedback({
        type: 'err',
        text:
          res.log?.errorMessage ||
          res.error ||
          'Gagal mengirim test webhook ke endpoint tujuan.',
      });
    }
  };

  const handleClearLogs = async () => {
    const ok = await clearWebhookLogsOnServer();
    if (ok) {
      setLogs([]);
      setFeedback({ type: 'ok', text: 'Riwayat log webhook dibersihkan.' });
    }
  };

  const handleReconnectDb = async () => {
    setReconnectingDb(true);
    setFeedback(null);
    const res = await reconnectDbOnServer();
    setReconnectingDb(false);
    if (res.diagnostics) {
      setDiagnostics(res.diagnostics);
      setFeedback({
        type: res.diagnostics.connected ? 'ok' : 'err',
        text: res.diagnostics.connected
          ? `Terhubung ke PostgreSQL (${res.diagnostics.host || 'DSN'}/${res.diagnostics.database || 'default'}).`
          : res.diagnostics.lastError ||
            'Variabel PostgreSQL belum aktif atau host tidak terjangkau; memakai fallback JSON lokal.',
      });
    }
  };

  const handleDownloadSchema = async () => {
    const sql = await fetchSchemaSqlFromServer();
    if (!sql) {
      setFeedback({ type: 'err', text: 'Gagal mengunduh berkas skema SQL.' });
      return;
    }
    downloadTextFile('lynk-builder-schema.sql', sql, 'application/sql;charset=utf-8');
  };

  const handleDownloadFullDbSql = async () => {
    setExportingFullSql(true);
    setFeedback(null);
    const sql = await fetchFullSqlDumpFromServer();
    setExportingFullSql(false);
    if (!sql) {
      setFeedback({ type: 'err', text: 'Gagal mengekspor full dump database SQL.' });
      return;
    }
    const stamp = new Date().toISOString().slice(0, 10);
    downloadTextFile(`lynk-builder-full-${stamp}.sql`, sql, 'application/sql;charset=utf-8');
    setFeedback({
      type: 'ok',
      text: 'Full backup SQL (skema + seluruh data 7 tabel) berhasil diunduh untuk PostgreSQL lokal.',
    });
  };

  const handleDownloadCompleteJsonBackup = async () => {
    setExportingCompleteJson(true);
    setFeedback(null);
    const res = await exportCompleteBackupFromServer();
    setExportingCompleteJson(false);
    if (!res.ok || !res.content) {
      setFeedback({ type: 'err', text: res.error || 'Gagal mengunduh backup lengkap (.json).' });
      return;
    }
    downloadTextFile(
      res.filename || `lynk-builder-complete-backup-${new Date().toISOString().slice(0, 10)}.json`,
      res.content,
      'application/json;charset=utf-8'
    );
    setFeedback({
      type: 'ok',
      text: 'Backup lengkap terverifikasi SHA-256 (proyek, analitik, aset media, & setting — tanpa password/token) berhasil diunduh.',
    });
  };

  const handleSelectRestoreFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    setFeedback(null);
    setRestorePreview(null);
    setRestoreBundle(null);
    setConfirmOverwriteRestore(false);
    setRestoreFilename(file.name);
    setPreviewingRestore(true);
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as unknown;
      const res = await previewBackupRestoreOnServer(parsed);
      setPreviewingRestore(false);
      if (!res.summary) {
        setFeedback({ type: 'err', text: res.error || 'Berkas backup gagal divalidasi.' });
        return;
      }
      setRestoreBundle(parsed);
      setRestorePreview(res.summary);
      if (!res.summary.valid) {
        setFeedback({
          type: 'err',
          text: res.summary.errors[0] || 'Berkas backup tidak lolos pemeriksaan integritas.',
        });
      }
    } catch {
      setPreviewingRestore(false);
      setFeedback({ type: 'err', text: 'File bukan JSON backup yang valid.' });
    }
  };

  const handleApplyRestore = async () => {
    if (!restoreBundle || !restorePreview?.valid || !confirmOverwriteRestore) return;
    setApplyingRestore(true);
    setFeedback(null);
    const res = await applyBackupRestoreOnServer(restoreBundle, true);
    setApplyingRestore(false);
    if (!res.ok) {
      setFeedback({ type: 'err', text: res.error || 'Proses restore gagal.' });
      return;
    }
    setRestorePreview(null);
    setRestoreBundle(null);
    setConfirmOverwriteRestore(false);
    await loadAll();
    onRestoreCompleted?.();
    setFeedback({
      type: 'ok',
      text: `Restore selesai (${res.restoredCounts?.projects ?? 0} proyek, ${res.restoredCounts?.analyticsEvents ?? 0} analitik, ${res.restoredCounts?.media ?? 0} media). Snapshot pre-restore disimpan (${res.preRestoreBackupPath}).`,
    });
  };

  const handleCopyEndpoint = async (path: string) => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : 'https://domain-anda.com';
    const full = `${origin}${path}`;
    const ok = await copyTextToClipboard(full);
    if (ok) {
      setCopiedPath(path);
      setTimeout(() => setCopiedPath((p) => (p === path ? null : p)), 1800);
    }
  };

  const toggleWebhookEvent = (ev: WebhookEventName) => {
    setSettings((prev) => {
      const exists = prev.webhookEvents.includes(ev);
      return {
        ...prev,
        webhookEvents: exists
          ? prev.webhookEvents.filter((item) => item !== ev)
          : [...prev.webhookEvents, ev],
      };
    });
  };

  const cardContent = (
    <div
      className={
        asPage
          ? 'bg-white w-full max-w-5xl mx-auto flex-1 min-h-0 rounded-2xl border border-[#DCE5EF] shadow-xs flex flex-col overflow-hidden'
          : 'bg-white w-full max-w-4xl max-h-[92vh] rounded-2xl border border-[#DCE5EF] shadow-2xl flex flex-col overflow-hidden'
      }
      onClick={(e) => {
        if (!asPage) e.stopPropagation();
      }}
    >
      {/* Header */}
      <div className="px-5 py-4 border-b border-[#DCE5EF] flex items-center justify-between gap-3 bg-white shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#ECFDF6] border border-[#00C98A]/35 text-[#00A873] flex items-center justify-center shrink-0">
            <Settings2 className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#17243D] tracking-tight truncate">
              Setting API, Webhook &amp; PostgreSQL
            </h2>
            <p className="text-xs text-[#5B708B] truncate mt-0.5">
              Kelola REST API publik, integrasi webhook event, proteksi login, &amp; koneksi database.
            </p>
          </div>
        </div>

        {!asPage && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Setting API"
            className="p-2 rounded-xl text-[#5B708B] hover:bg-[#F0F5FA] hover:text-[#17243D] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

        {/* Navigation Tabs */}
        <div className="px-5 bg-white border-b border-[#DCE5EF] flex items-center gap-2 overflow-x-auto shrink-0">
          <button
            type="button"
            onClick={() => setTab('webhook')}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'webhook'
                ? 'border-[#00C98A] text-[#17243D]'
                : 'border-transparent text-[#5B708B] hover:text-[#17243D]'
            }`}
          >
            <Webhook className={`w-3.5 h-3.5 ${tab === 'webhook' ? 'text-[#00A873]' : 'text-[#8FA4BF]'}`} />
            <span>Webhook &amp; Log Event</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('public_api')}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'public_api'
                ? 'border-[#00C98A] text-[#17243D]'
                : 'border-transparent text-[#5B708B] hover:text-[#17243D]'
            }`}
          >
            <Globe className={`w-3.5 h-3.5 ${tab === 'public_api' ? 'text-[#00A873]' : 'text-[#8FA4BF]'}`} />
            <span>Public API &amp; Keamanan</span>
          </button>

          <button
            type="button"
            onClick={() => setTab('database')}
            className={`inline-flex items-center gap-1.5 px-3 py-2.5 text-xs font-bold border-b-2 transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              tab === 'database'
                ? 'border-[#00C98A] text-[#17243D]'
                : 'border-transparent text-[#5B708B] hover:text-[#17243D]'
            }`}
          >
            <Database className={`w-3.5 h-3.5 ${tab === 'database' ? 'text-[#00A873]' : 'text-[#8FA4BF]'}`} />
            <span>Database PostgreSQL &amp; Server</span>
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto bg-[#F0F5FA]/70 p-5 space-y-4">
          {feedback && (
            <div
              className={`px-3.5 py-2.5 rounded-xl border text-xs font-medium flex items-start gap-2 ${
                feedback.type === 'ok'
                  ? 'bg-[#ECFDF6] border-[#00C98A]/40 text-[#008F63]'
                  : 'bg-rose-50 border-rose-200 text-rose-800'
              }`}
            >
              {feedback.type === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              )}
              <span>{feedback.text}</span>
            </div>
          )}

          {loading ? (
            <div className="bg-white rounded-xl border border-[#DCE5EF] p-8 text-center text-xs text-[#5B708B]">
              Memuat konfigurasi API &amp; diagnostik PostgreSQL...
            </div>
          ) : (
            <>
              {tab === 'webhook' && (
                <div className="space-y-4">
                  {/* Webhook Endpoint */}
                  <div className="bg-white rounded-xl border border-[#DCE5EF] p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-[#17243D]">
                          Endpoint Outgoing Webhook (HTTPS)
                        </h3>
                        <p className="text-[11px] text-[#5B708B] mt-0.5">
                          Terima payload JSON real-time ke CRM, Zapier, Make, n8n, atau backend Anda.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => void handleTestWebhook()}
                        disabled={testingWebhook}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#00C98A]/35 bg-[#ECFDF6] hover:bg-[#00C98A]/15 text-[#008F63] text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-60"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>{testingWebhook ? 'Mengirim...' : 'Uji Kirim Webhook'}</span>
                      </button>
                    </div>

                    <input
                      type="url"
                      value={settings.webhookUrl}
                      onChange={(e) =>
                        setSettings((prev) => ({ ...prev, webhookUrl: e.target.value }))
                      }
                      placeholder="https://hook.domain-anda.com/lynk-events"
                      className="w-full px-3 py-2 rounded-xl border border-[#DCE5EF] bg-white text-xs font-mono text-[#17243D] placeholder:text-[#8FA4BF] outline-none focus:border-[#00C98A] transition-colors"
                    />

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-1">
                      {WEBHOOK_EVENT_OPTIONS.map((opt) => {
                        const checked = settings.webhookEvents.includes(opt.id);
                        return (
                          <label
                            key={opt.id}
                            className={`flex items-start gap-2.5 p-3 rounded-xl border cursor-pointer transition-colors ${
                              checked
                                ? 'bg-[#ECFDF6]/70 border-[#00C98A]/45'
                                : 'bg-white border-[#DCE5EF] hover:bg-[#F0F5FA]/60'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => toggleWebhookEvent(opt.id)}
                              className="mt-0.5 rounded border-[#DCE5EF] accent-[#00C98A] cursor-pointer"
                            />
                            <div className="min-w-0">
                              <div className="text-xs font-semibold text-[#17243D]">
                                {opt.label}
                              </div>
                              <div className="text-[11px] text-[#5B708B] leading-snug mt-0.5">
                                {opt.desc}
                              </div>
                            </div>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  {/* Webhook Delivery Logs */}
                  <div className="bg-white rounded-xl border border-[#DCE5EF] overflow-hidden">
                    <div className="px-4 py-3 border-b border-[#EEF3F8] flex items-center justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-[#17243D] tabular-nums">
                          Riwayat Pengiriman Webhook ({logs.length})
                        </h3>
                        <p className="text-[11px] text-[#5B708B]">
                          50 pengiriman event terakhir dari server ke URL webhook Anda.
                        </p>
                      </div>
                      {logs.length > 0 && (
                        <button
                          type="button"
                          onClick={() => void handleClearLogs()}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#DCE5EF] text-[11px] font-semibold text-[#5B708B] hover:bg-rose-50 hover:text-rose-700 hover:border-rose-200 cursor-pointer whitespace-nowrap shrink-0 transition-colors"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Bersihkan Log</span>
                        </button>
                      )}
                    </div>

                    {logs.length === 0 ? (
                      <div className="p-6 text-center text-xs text-[#5B708B]">
                        Belum ada riwayat pengiriman webhook.
                      </div>
                    ) : (
                      <div className="divide-y divide-[#EEF3F8] max-h-64 overflow-y-auto">
                        {logs.map((log) => (
                          <div key={log.id} className="px-4 py-2.5 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <span
                                  className={`px-1.5 py-0.5 rounded text-[10px] font-bold border ${
                                    log.success
                                      ? 'bg-[#ECFDF6] text-[#008F63] border-[#00C98A]/40'
                                      : 'bg-rose-50 text-rose-700 border-rose-200'
                                  }`}
                                >
                                  {log.success ? `HTTP ${log.statusCode ?? 200}` : log.errorMessage || 'Gagal'}
                                </span>
                                <span className="text-xs font-bold text-[#17243D] font-mono">
                                  {log.eventType}
                                </span>
                                <span className="text-[11px] text-[#8FA4BF] tabular-nums">
                                  {new Date(log.createdAt).toLocaleString('id-ID')}
                                </span>
                              </div>
                              <p className="text-[11px] text-[#5B708B] font-mono truncate mt-0.5">
                                {log.targetUrl}
                              </p>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}

              {tab === 'public_api' && (
                <div className="space-y-4">
                  {/* Auth & Security */}
                  <div className="bg-white rounded-xl border border-[#DCE5EF] p-4 space-y-3">
                    <h3 className="text-xs font-bold text-[#17243D] flex items-center gap-1.5">
                      <Shield className="w-3.5 h-3.5 text-[#00A873]" />
                      Keamanan Sesi Login &amp; Akses Builder
                    </h3>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[#DCE5EF] cursor-pointer hover:bg-[#F0F5FA]/60 transition-colors">
                        <input
                          type="checkbox"
                          checked={settings.requireAuthForBuilder}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              requireAuthForBuilder: e.target.checked,
                            }))
                          }
                          className="mt-0.5 rounded border-[#DCE5EF] accent-[#00C98A] cursor-pointer"
                        />
                        <div>
                          <div className="text-xs font-semibold text-[#17243D]">
                            Wajibkan Login untuk Editor Builder
                          </div>
                          <div className="text-[11px] text-[#5B708B] mt-0.5">
                            Lindungi dashboard, edit blok, ekspor, dan seluruh endpoint `/api/*` dengan sesi login.
                          </div>
                        </div>
                      </label>

                      <label className="flex items-start gap-2.5 p-3 rounded-xl border border-[#DCE5EF] cursor-pointer hover:bg-[#F0F5FA]/60 transition-colors">
                        <input
                          type="checkbox"
                          checked={settings.autoPublishOnSave}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              autoPublishOnSave: e.target.checked,
                            }))
                          }
                          className="mt-0.5 rounded border-[#DCE5EF] accent-[#00C98A] cursor-pointer"
                        />
                        <div>
                          <div className="text-xs font-semibold text-[#17243D]">
                            Auto-Publish Saat Klik Simpan
                          </div>
                          <div className="text-[11px] text-[#5B708B] mt-0.5">
                            Setiap penyimpanan langsung menayangkan `/p/:slug` dan memperbarui REST API publik.
                          </div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Public REST API & Gateway Parameters */}
                  <div className="bg-white rounded-xl border border-[#DCE5EF] p-4 space-y-3.5">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-xs font-bold text-[#17243D]">
                          Public Headless REST API (JSON)
                        </h3>
                        <p className="text-[11px] text-[#5B708B] mt-0.5">
                          Ekspos data halaman yang sudah tayang untuk aplikasi eksternal / mobile app.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setSettings((prev) => ({
                            ...prev,
                            publicApiEnabled: !prev.publicApiEnabled,
                          }))
                        }
                        aria-pressed={settings.publicApiEnabled}
                        className={`px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors ${
                          settings.publicApiEnabled
                            ? 'bg-[#17243D] border-[#17243D] text-white'
                            : 'bg-white border-[#DCE5EF] text-[#5B708B] hover:bg-[#F0F5FA]'
                        }`}
                      >
                        {settings.publicApiEnabled ? 'API Publik Aktif' : 'API Publik Nonaktif'}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-[#5B708B]">
                          CORS Allowed Origins
                        </label>
                        <input
                          type="text"
                          value={settings.corsOrigins}
                          onChange={(e) =>
                            setSettings((prev) => ({ ...prev, corsOrigins: e.target.value }))
                          }
                          placeholder="* atau https://app.anda.com"
                          className="w-full px-3 py-2 rounded-xl border border-[#DCE5EF] bg-white text-xs font-mono text-[#17243D] placeholder:text-[#8FA4BF] outline-none focus:border-[#00C98A]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-[#5B708B]">
                          Rate Limit (req / menit)
                        </label>
                        <input
                          type="number"
                          min={10}
                          max={5000}
                          value={settings.rateLimitPerMinute}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              rateLimitPerMinute: Number(e.target.value) || 120,
                            }))
                          }
                          className="w-full px-3 py-2 rounded-xl border border-[#DCE5EF] bg-white text-xs tabular-nums text-[#17243D] outline-none focus:border-[#00C98A]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-[#5B708B]">
                          Versi Graph Meta CAPI
                        </label>
                        <input
                          type="text"
                          value={settings.metaApiVersion}
                          onChange={(e) =>
                            setSettings((prev) => ({ ...prev, metaApiVersion: e.target.value }))
                          }
                          placeholder="v21.0"
                          className="w-full px-3 py-2 rounded-xl border border-[#DCE5EF] bg-white text-xs font-mono text-[#17243D] placeholder:text-[#8FA4BF] outline-none focus:border-[#00C98A]"
                        />
                      </div>

                      <div className="space-y-1">
                        <label className="block text-[11px] font-semibold text-[#5B708B]">
                          Kode Negara WA Default
                        </label>
                        <input
                          type="text"
                          value={settings.waDefaultCountryCode}
                          onChange={(e) =>
                            setSettings((prev) => ({
                              ...prev,
                              waDefaultCountryCode: e.target.value.replace(/\D/g, ''),
                            }))
                          }
                          placeholder="62"
                          className="w-full px-3 py-2 rounded-xl border border-[#DCE5EF] bg-white text-xs font-mono tabular-nums text-[#17243D] placeholder:text-[#8FA4BF] outline-none focus:border-[#00C98A]"
                        />
                      </div>
                    </div>

                    {/* Endpoint List */}
                    <div className="space-y-2 pt-2.5 border-t border-[#EEF3F8]">
                      <p className="text-[11px] font-bold text-[#17243D]">
                        Daftar Endpoint Publik Tersedia:
                      </p>
                      {[
                        {
                          method: 'GET',
                          path: '/api/v1/public/pages',
                          desc: 'Daftar seluruh unit usaha yang sudah tayang publik.',
                        },
                        {
                          method: 'GET',
                          path: '/api/v1/public/pages/:slug',
                          desc: 'Detail blok JSON, tema, dan metadata halaman berdasarkan slug.',
                        },
                        {
                          method: 'GET',
                          path: '/api/health',
                          desc: 'Cek kesehatan server, koneksi PostgreSQL, & status Meta CAPI.',
                        },
                      ].map((ep) => (
                        <div
                          key={ep.path}
                          className="flex items-center justify-between gap-2 px-3 py-2 rounded-xl bg-[#F0F5FA]/70 border border-[#DCE5EF]"
                        >
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="px-1.5 py-0.5 rounded text-[10px] font-bold bg-[#ECFDF6] border border-[#00C98A]/40 text-[#008F63]">
                                {ep.method}
                              </span>
                              <code className="text-xs font-mono text-[#17243D] truncate">
                                {ep.path}
                              </code>
                            </div>
                            <p className="text-[11px] text-[#5B708B] mt-0.5">{ep.desc}</p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void handleCopyEndpoint(ep.path)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] hover:border-[#8FA4BF] text-[11px] font-semibold text-[#17243D] shrink-0 cursor-pointer whitespace-nowrap transition-colors"
                          >
                            {copiedPath === ep.path ? (
                              <>
                                <Check className="w-3 h-3 text-[#00A873]" />
                                <span>Disalin</span>
                              </>
                            ) : (
                              <>
                                <Copy className="w-3 h-3 text-[#5B708B]" />
                                <span>Salin URL</span>
                              </>
                            )}
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {tab === 'database' && diagnostics && (
                <div className="space-y-4">
                  {/* PostgreSQL Connection Status Card */}
                  <div className="bg-white rounded-xl border border-[#DCE5EF] p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-[#17243D] flex items-center gap-1.5">
                          <Database className="w-3.5 h-3.5 text-[#00A873]" />
                          Status Mesin Database
                        </h3>
                        <p className="text-[11px] text-[#5B708B] mt-0.5">
                          Skema Drizzle ORM siap otomatis ke PostgreSQL begitu kredensial lingkungan aktif.
                        </p>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleDownloadSchema()}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] hover:border-[#8FA4BF] text-xs font-semibold text-[#17243D] cursor-pointer whitespace-nowrap transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-[#5B708B]" />
                          <span>Unduh schema.sql</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleDownloadFullDbSql()}
                          disabled={exportingFullSql}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#00C98A]/35 bg-[#ECFDF6] hover:bg-[#00C98A]/15 disabled:opacity-60 text-xs font-semibold text-[#008F63] cursor-pointer whitespace-nowrap transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-[#00A873]" />
                          <span>{exportingFullSql ? 'Mengekspor...' : 'Unduh Full DB (.sql)'}</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleReconnectDb()}
                          disabled={reconnectingDb}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#17243D] hover:bg-[#223456] disabled:opacity-60 text-white text-xs font-semibold cursor-pointer whitespace-nowrap transition-colors"
                        >
                          <RefreshCw
                            className={`w-3.5 h-3.5 text-[#00C98A] ${reconnectingDb ? 'animate-spin' : ''}`}
                          />
                          <span>{reconnectingDb ? 'Menguji...' : 'Uji Koneksi PG'}</span>
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                      <div className="rounded-xl bg-[#F0F5FA]/70 border border-[#DCE5EF] px-3 py-2.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#8FA4BF]">
                          Engine Aktif
                        </div>
                        <div
                          className={`text-xs font-bold mt-0.5 ${
                            diagnostics.connected ? 'text-[#008F63]' : 'text-amber-700'
                          }`}
                        >
                          {diagnostics.connected
                            ? 'PostgreSQL (Aktif)'
                            : 'JSON Store Lokal (Fallback)'}
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#F0F5FA]/70 border border-[#DCE5EF] px-3 py-2.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#8FA4BF]">
                          Host &amp; Database
                        </div>
                        <div className="text-xs font-bold text-[#17243D] mt-0.5 font-mono truncate">
                          {diagnostics.host
                            ? `${diagnostics.host}/${diagnostics.database || 'postgres'}`
                            : 'Belum diatur (env DATABASE_URL / PGHOST)'}
                        </div>
                      </div>

                      <div className="rounded-xl bg-[#F0F5FA]/70 border border-[#DCE5EF] px-3 py-2.5">
                        <div className="text-[10px] font-semibold uppercase tracking-wide text-[#8FA4BF]">
                          Enkripsi TLS / SSL
                        </div>
                        <div className="text-xs font-bold text-[#17243D] mt-0.5">
                          {diagnostics.ssl ? 'Aktif (SSL/TLS)' : 'Standar'}
                        </div>
                      </div>
                    </div>

                    {diagnostics.lastError && !diagnostics.connected && (
                      <div className="px-3 py-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-mono">
                        Diagnostic: {diagnostics.lastError}
                      </div>
                    )}
                  </div>

                  {/* Complete Portable Backup & Staged Restore (F-14) */}
                  <div className="bg-white rounded-xl border border-[#DCE5EF] p-4 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div>
                        <h3 className="text-xs font-bold text-[#17243D]">
                          Backup Lengkap (.json) &amp; Restore Bertahap
                        </h3>
                        <p className="text-[11px] text-[#5B708B] mt-0.5">
                          Mencakup seluruh proyek, log analitik, aset media upload, &amp; setting aman dengan checksum SHA-256 (mengecualikan hash password &amp; sesi).
                        </p>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          type="button"
                          onClick={() => void handleDownloadCompleteJsonBackup()}
                          disabled={exportingCompleteJson}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#00C98A]/35 bg-[#ECFDF6] hover:bg-[#00C98A]/15 disabled:opacity-60 text-xs font-semibold text-[#008F63] cursor-pointer whitespace-nowrap transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 text-[#00A873]" />
                          <span>
                            {exportingCompleteJson ? 'Menyiapkan...' : 'Unduh Backup Lengkap (.json)'}
                          </span>
                        </button>
                        <label className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] hover:border-[#8FA4BF] text-xs font-semibold text-[#17243D] cursor-pointer whitespace-nowrap transition-colors">
                          <Upload className="w-3.5 h-3.5 text-[#5B708B]" />
                          <span>{previewingRestore ? 'Memeriksa...' : 'Pilih File Restore'}</span>
                          <input
                            type="file"
                            accept=".json,application/json"
                            onChange={(e) => void handleSelectRestoreFile(e)}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {restorePreview && (
                      <div className="rounded-xl border border-[#DCE5EF] bg-[#F0F5FA]/70 p-3.5 space-y-3">
                        <div className="flex items-center justify-between gap-2 flex-wrap">
                          <div className="text-xs font-bold text-[#17243D]">
                            Pratinjau Restore: <span className="font-mono">{restoreFilename}</span>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border ${
                              restorePreview.valid && restorePreview.checksumValid
                                ? 'bg-[#ECFDF6] text-[#008F63] border-[#00C98A]/40'
                                : 'bg-rose-50 text-rose-700 border-rose-200'
                            }`}
                          >
                            {restorePreview.checksumValid ? 'Checksum SHA-256 Valid' : 'Checksum Tidak Valid'}
                          </span>
                        </div>

                        <div className="grid grid-cols-3 gap-2 text-[11px]">
                          <div className="bg-white rounded-lg border border-[#DCE5EF] px-2.5 py-2">
                            <div className="text-[#8FA4BF]">Proyek Masuk / Saat Ini</div>
                            <div className="font-bold text-[#17243D] tabular-nums mt-0.5">
                              {restorePreview.incomingCounts.projects} / {restorePreview.existingCounts.projects}
                            </div>
                          </div>
                          <div className="bg-white rounded-lg border border-[#DCE5EF] px-2.5 py-2">
                            <div className="text-[#8FA4BF]">Analitik Masuk / Saat Ini</div>
                            <div className="font-bold text-[#17243D] tabular-nums mt-0.5">
                              {restorePreview.incomingCounts.analyticsEvents} / {restorePreview.existingCounts.analyticsEvents}
                            </div>
                          </div>
                          <div className="bg-white rounded-lg border border-[#DCE5EF] px-2.5 py-2">
                            <div className="text-[#8FA4BF]">Media Masuk / Saat Ini</div>
                            <div className="font-bold text-[#17243D] tabular-nums mt-0.5">
                              {restorePreview.incomingCounts.media} / {restorePreview.existingCounts.media}
                            </div>
                          </div>
                        </div>

                        {restorePreview.errors.length > 0 && (
                          <div className="text-[11px] text-rose-700 bg-rose-50 border border-rose-200 rounded-lg px-3 py-2 space-y-1">
                            {restorePreview.errors.map((er, i) => (
                              <div key={i}>• {er}</div>
                            ))}
                          </div>
                        )}

                        {restorePreview.warnings.length > 0 && (
                          <div className="text-[11px] text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2 space-y-1">
                            {restorePreview.warnings.map((w, i) => (
                              <div key={i}>• {w}</div>
                            ))}
                          </div>
                        )}

                        {restorePreview.valid && (
                          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pt-1">
                            <label className="inline-flex items-center gap-2 text-xs text-[#17243D] cursor-pointer">
                              <input
                                type="checkbox"
                                checked={confirmOverwriteRestore}
                                onChange={(e) => setConfirmOverwriteRestore(e.target.checked)}
                                className="rounded border-[#DCE5EF] accent-[#00C98A] cursor-pointer"
                              />
                              <span>Saya mengerti data proyek saat ini akan digantikan oleh backup (snapshot pre-restore dibuat otomatis).</span>
                            </label>
                            <button
                              type="button"
                              disabled={!confirmOverwriteRestore || applyingRestore}
                              onClick={() => void handleApplyRestore()}
                              className="px-3.5 py-1.5 rounded-xl bg-[#17243D] hover:bg-[#223456] disabled:opacity-50 text-white text-xs font-semibold cursor-pointer whitespace-nowrap shrink-0 transition-colors"
                            >
                              {applyingRestore ? 'Memulihkan...' : 'Terapkan Restore Sekarang'}
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Table Counts */}
                  <div className="bg-white rounded-xl border border-[#DCE5EF] p-4 space-y-3">
                    <h3 className="text-xs font-bold text-[#17243D]">
                      Statistik Tabel Database (PostgreSQL v007)
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
                      {[
                        { label: 'users', val: diagnostics.tables.users },
                        { label: 'sessions', val: diagnostics.tables.sessions },
                        { label: 'projects', val: diagnostics.tables.projects },
                        { label: 'web_templates', val: diagnostics.tables.webTemplates ?? 0 },
                        { label: 'form_submissions', val: diagnostics.tables.formSubmissions ?? 0 },
                        { label: 'analytics_events', val: diagnostics.tables.analyticsEvents },
                        { label: 'access_policies', val: diagnostics.tables.accessPolicies },
                        { label: 'api_settings', val: diagnostics.tables.apiSettings },
                        { label: 'webhook_logs', val: diagnostics.tables.webhookLogs },
                        { label: 'media_assets', val: diagnostics.tables.mediaAssets ?? 0 },
                      ].map((t) => (
                        <div
                          key={t.label}
                          className="rounded-xl border border-[#DCE5EF] bg-[#F0F5FA]/70 px-3 py-2"
                        >
                          <div className="text-[11px] font-mono text-[#5B708B]">{t.label}</div>
                          <div className="text-base font-bold text-[#17243D] tabular-nums mt-0.5">
                            {t.val}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Environment Secrets Checklist (Read-Only, never inputs secrets) */}
                  <div className="bg-white rounded-xl border border-[#DCE5EF] p-4 space-y-3">
                    <h3 className="text-xs font-bold text-[#17243D] flex items-center gap-1.5">
                      <KeyRound className="w-3.5 h-3.5 text-[#00A873]" />
                      Variabel Lingkungan Server (.env)
                    </h3>
                    <p className="text-[11px] text-[#5B708B]">
                      Demi keamanan, kredensial rahasia dibaca server dari environment variables dan tidak pernah diekspos di UI.
                    </p>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {[
                        {
                          key: 'DATABASE_URL / PGHOST',
                          ok: diagnostics.envStatus.postgresConfigured,
                          desc: 'Koneksi utama PostgreSQL 14+',
                        },
                        {
                          key: 'SESSION_SECRET',
                          ok: diagnostics.envStatus.sessionSecretConfigured,
                          desc: 'Signing HMAC token sesi login',
                        },
                        {
                          key: 'META_CAPI_ACCESS_TOKEN',
                          ok: diagnostics.envStatus.metaCapiConfigured,
                          desc: 'Server-side Meta Conversions API',
                        },
                        {
                          key: 'WEBHOOK_SIGNING_SECRET',
                          ok: diagnostics.envStatus.webhookSecretConfigured,
                          desc: 'Signature X-Lynk-Signature HMAC-SHA256',
                        },
                      ].map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border border-[#DCE5EF] bg-[#F0F5FA]/70"
                        >
                          <div className="min-w-0">
                            <div className="text-xs font-mono font-bold text-[#17243D] truncate">
                              {item.key}
                            </div>
                            <div className="text-[11px] text-[#5B708B] truncate">
                              {item.desc}
                            </div>
                          </div>
                          <span
                            className={`px-2 py-0.5 rounded-md text-[10px] font-bold border shrink-0 ${
                              item.ok
                                ? 'bg-[#ECFDF6] text-[#008F63] border-[#00C98A]/40'
                                : 'bg-white text-[#5B708B] border-[#DCE5EF]'
                            }`}
                          >
                            {item.ok ? 'Terkonfigurasi' : 'Opsional / Default'}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3.5 border-t border-[#DCE5EF] bg-white flex items-center justify-between gap-3 shrink-0">
          <div className="text-[11px] text-[#5B708B] hidden sm:block">
            {diagnostics?.connected
              ? 'Disimpan langsung ke tabel api_settings PostgreSQL.'
              : 'Disimpan ke penyimpanan server lokal & siap migrasi PostgreSQL.'}
          </div>

          <div className="flex items-center gap-2 ml-auto">
            {!asPage && (
              <button
                type="button"
                onClick={onClose}
                className="px-3.5 py-2 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-xs font-semibold text-[#17243D] cursor-pointer whitespace-nowrap transition-colors"
              >
                Tutup
              </button>
            )}
            <button
              type="button"
              onClick={() => void handleSave()}
              disabled={saving || loading}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#17243D] hover:bg-[#223456] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Save className="w-3.5 h-3.5 text-[#00C98A]" />
              <span>{saving ? 'Menyimpan...' : 'Simpan Setting API'}</span>
            </button>
          </div>
        </div>
      </div>
  );

  if (asPage) {
    return cardContent;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-[#17243D]/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4"
      onClick={onClose}
    >
      {cardContent}
    </div>
  );
}
