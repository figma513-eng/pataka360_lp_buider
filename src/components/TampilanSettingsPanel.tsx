import React, { useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  Check,
  Copy,
  Download,
  Eye,
  EyeOff,
  FileCode2,
  Loader2,
  RotateCcw,
  Save,
  Search,
  Type,
  Upload,
  X,
} from 'lucide-react';
import { useUiLabel } from '../contexts/UiLabelsContext';
import { saveUiAppearanceSettingsToServer } from '../utils/authClient';
import {
  UI_LABEL_CATALOG,
  UI_LABEL_CATEGORIES,
  UI_LABEL_DEFAULT_MAP,
  getUiLabelKind,
  type UiLabelCatalogItem,
  type UiLabelCategory,
  type UiLabelKind,
} from '../utils/uiAppearanceLabels';
import {
  buildUiAppearanceHtmlFilename,
  generateUiAppearanceHtml,
  parseUiAppearanceHtml,
} from '../utils/uiAppearanceHtmlCodec';
import { ToggleSwitch } from './inspector/InspectorPrimitives';

type FilterCategory = 'all' | UiLabelCategory;
type StatusFilter = 'all' | 'judul' | 'label' | 'deskripsi' | 'customized' | 'hidden';

const CATEGORY_LABEL_MAP: Record<UiLabelCategory, string> = Object.fromEntries(
  UI_LABEL_CATEGORIES.map((c) => [c.id, c.label])
) as Record<UiLabelCategory, string>;

const KIND_ORDER: Record<UiLabelKind, number> = {
  judul: 0,
  label: 1,
  deskripsi: 2,
};

const CORE_CONTENT_CATEGORIES = UI_LABEL_CATEGORIES.filter((c) => c.isCoreContentSection);
const OTHER_EDITOR_CATEGORIES = UI_LABEL_CATEGORIES.filter((c) => !c.isCoreContentSection);

export function TampilanSettingsPanel() {
  const { labels, hiddenKeys, setAppearanceSettings } = useUiLabel();
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({});
  const [savedFlashKeys, setSavedFlashKeys] = useState<Record<string, boolean>>({});
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [isBulkTogglingDesc, setIsBulkTogglingDesc] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);
  const [showImportPanel, setShowImportPanel] = useState(false);
  const [importRawText, setImportRawText] = useState('');
  const [importFileName, setImportFileName] = useState<string | null>(null);
  const [importMode, setImportMode] = useState<'merge' | 'replace'>('merge');
  const [isApplyingImport, setIsApplyingImport] = useState(false);
  const [copiedHtmlFlash, setCopiedHtmlFlash] = useState(false);
  const importFileInputRef = useRef<HTMLInputElement>(null);

  const customCount = useMemo(() => Object.keys(labels).length, [labels]);
  const hiddenCount = useMemo(
    () => Object.values(hiddenKeys).filter(Boolean).length,
    [hiddenKeys]
  );

  const categoryScopedItems = useMemo(
    () =>
      selectedCategory === 'all'
        ? UI_LABEL_CATALOG
        : UI_LABEL_CATALOG.filter((item) => item.category === selectedCategory),
    [selectedCategory]
  );

  const scopedCounts = useMemo(() => {
    let judul = 0;
    let label = 0;
    let deskripsi = 0;
    let customized = 0;
    let hidden = 0;
    let visibleDesc = 0;
    for (const item of categoryScopedItems) {
      const k = getUiLabelKind(item);
      if (k === 'judul') judul += 1;
      else if (k === 'deskripsi') {
        deskripsi += 1;
        if (!hiddenKeys[item.key]) visibleDesc += 1;
      } else {
        label += 1;
      }
      if (labels[item.key]) customized += 1;
      if (hiddenKeys[item.key]) hidden += 1;
    }
    return { judul, label, deskripsi, customized, hidden, visibleDesc };
  }, [categoryScopedItems, labels, hiddenKeys]);

  const descriptionItems = useMemo(
    () => UI_LABEL_CATALOG.filter((item) => getUiLabelKind(item) === 'deskripsi'),
    []
  );

  const dirtyEntries = useMemo(() => {
    const entries: Array<[string, string]> = [];
    for (const item of UI_LABEL_CATALOG) {
      if (!(item.key in drafts)) continue;
      const draftVal = drafts[item.key].trim();
      const persistedVal = labels[item.key] ?? item.defaultLabel;
      const normalizedNext = draftVal === '' ? item.defaultLabel : draftVal;
      if (normalizedNext !== persistedVal) {
        entries.push([item.key, draftVal]);
      }
    }
    return entries;
  }, [drafts, labels]);

  const filteredItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return categoryScopedItems.filter((item) => {
      const kind = getUiLabelKind(item);
      if (statusFilter === 'judul' && kind !== 'judul') return false;
      if (statusFilter === 'label' && kind !== 'label') return false;
      if (statusFilter === 'deskripsi' && kind !== 'deskripsi') return false;
      if (statusFilter === 'customized' && !labels[item.key]) return false;
      if (statusFilter === 'hidden' && !hiddenKeys[item.key]) return false;
      if (!q) return true;
      const currentVal = (drafts[item.key] ?? labels[item.key] ?? item.defaultLabel).toLowerCase();
      const catLabel = CATEGORY_LABEL_MAP[item.category].toLowerCase();
      const groupTitle = (item.groupTitle ?? '').toLowerCase();
      return (
        item.defaultLabel.toLowerCase().includes(q) ||
        currentVal.includes(q) ||
        item.scopeNote.toLowerCase().includes(q) ||
        groupTitle.includes(q) ||
        catLabel.includes(q)
      );
    });
  }, [categoryScopedItems, statusFilter, searchQuery, drafts, labels, hiddenKeys]);

  const groupedSections = useMemo(() => {
    const byCat = new Map<UiLabelCategory, UiLabelCatalogItem[]>();
    for (const item of filteredItems) {
      const list = byCat.get(item.category);
      if (list) list.push(item);
      else byCat.set(item.category, [item]);
    }
    return UI_LABEL_CATEGORIES.map((cat) => {
      const items = byCat.get(cat.id) ?? [];
      const sorted = [...items].sort((a, b) => KIND_ORDER[getUiLabelKind(a)] - KIND_ORDER[getUiLabelKind(b)]);
      let judulCount = 0;
      let labelCount = 0;
      let deskripsiCount = 0;
      for (const it of sorted) {
        const k = getUiLabelKind(it);
        if (k === 'judul') judulCount += 1;
        else if (k === 'deskripsi') deskripsiCount += 1;
        else labelCount += 1;
      }
      return {
        category: cat,
        items: sorted,
        judulCount,
        labelCount,
        deskripsiCount,
      };
    }).filter((section) => section.items.length > 0);
  }, [filteredItems]);

  const markSavedFlash = (keys: string[]) => {
    setSavedFlashKeys((prev) => {
      const next = { ...prev };
      for (const k of keys) next[k] = true;
      return next;
    });
    window.setTimeout(() => {
      setSavedFlashKeys((prev) => {
        const next = { ...prev };
        for (const k of keys) delete next[k];
        return next;
      });
    }, 1800);
  };

  const handleInputChange = (key: string, value: string, defaultLabel: string) => {
    const persisted = labels[key] ?? defaultLabel;
    if (value === persisted) {
      setDrafts((prev) => {
        if (!(key in prev)) return prev;
        const next = { ...prev };
        delete next[key];
        return next;
      });
      return;
    }
    setDrafts((prev) => ({ ...prev, [key]: value }));
  };

  const handleSaveSingle = async (key: string, defaultLabel: string) => {
    const rawValue = key in drafts ? drafts[key] : (labels[key] ?? defaultLabel);
    const trimmed = rawValue.trim();
    const patchVal = trimmed === defaultLabel ? '' : trimmed;

    setFeedback(null);
    setSavingKeys((prev) => ({ ...prev, [key]: true }));
    const res = await saveUiAppearanceSettingsToServer({ patch: { [key]: patchVal } });
    setSavingKeys((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    if (!res.ok || !res.settings) {
      setFeedback({
        type: 'error',
        text: res.error || 'Gagal menyimpan perubahan teks ke database.',
      });
      return;
    }

    setAppearanceSettings(res.settings);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    markSavedFlash([key]);
    setFeedback({
      type: 'ok',
      text:
        patchVal === ''
          ? `Teks "${defaultLabel}" dikembalikan ke nama bawaan.`
          : `Teks "${defaultLabel}" disimpan menjadi "${patchVal}".`,
    });
  };

  const handleToggleVisibility = async (
    key: string,
    defaultLabel: string,
    nextVisible: boolean
  ) => {
    setFeedback(null);
    setSavingKeys((prev) => ({ ...prev, [key]: true }));
    const res = await saveUiAppearanceSettingsToServer({
      hiddenPatch: { [key]: !nextVisible },
    });
    setSavingKeys((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    if (!res.ok || !res.settings) {
      setFeedback({
        type: 'error',
        text: res.error || 'Gagal memperbarui status tampil/sembunyi ke database.',
      });
      return;
    }

    setAppearanceSettings(res.settings);
    markSavedFlash([key]);
    setFeedback({
      type: 'ok',
      text: nextVisible
        ? `Teks "${defaultLabel}" ditampilkan kembali di editor.`
        : `Teks "${defaultLabel}" disembunyikan dari editor.`,
    });
  };

  const handleBulkToggleAllDescriptions = async (hideAll: boolean) => {
    const targetItems =
      selectedCategory === 'all'
        ? descriptionItems
        : descriptionItems.filter((item) => item.category === selectedCategory);
    if (targetItems.length === 0) return;

    setFeedback(null);
    setIsBulkTogglingDesc(true);
    const hiddenPatch: Record<string, boolean> = {};
    for (const item of targetItems) {
      hiddenPatch[item.key] = hideAll;
    }
    const res = await saveUiAppearanceSettingsToServer({ hiddenPatch });
    setIsBulkTogglingDesc(false);

    if (!res.ok || !res.settings) {
      setFeedback({
        type: 'error',
        text: res.error || 'Gagal memperbarui visibilitas deskripsi ke database.',
      });
      return;
    }

    setAppearanceSettings(res.settings);
    markSavedFlash(targetItems.map((i) => i.key));
    setFeedback({
      type: 'ok',
      text: hideAll
        ? `${targetItems.length} deskripsi berhasil disembunyikan dari editor.`
        : `${targetItems.length} deskripsi ditampilkan kembali di editor.`,
    });
  };

  const handleResetSingle = async (key: string, defaultLabel: string) => {
    setFeedback(null);
    setSavingKeys((prev) => ({ ...prev, [key]: true }));
    const res = await saveUiAppearanceSettingsToServer({
      patch: { [key]: '' },
      hiddenPatch: { [key]: false },
    });
    setSavingKeys((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    if (!res.ok || !res.settings) {
      setFeedback({
        type: 'error',
        text: res.error || 'Gagal mengembalikan teks ke bawaan.',
      });
      return;
    }

    setAppearanceSettings(res.settings);
    setDrafts((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });
    markSavedFlash([key]);
    setFeedback({
      type: 'ok',
      text: `Teks "${defaultLabel}" dikembalikan ke bawaan dan ditampilkan.`,
    });
  };

  const handleSaveAllDirty = async () => {
    if (dirtyEntries.length === 0) return;
    setFeedback(null);
    setIsBulkSaving(true);
    const patchObj: Record<string, string> = {};
    const keys: string[] = [];
    const defaultByKey = new Map(UI_LABEL_CATALOG.map((i) => [i.key, i.defaultLabel]));
    for (const [k, val] of dirtyEntries) {
      const def = defaultByKey.get(k) ?? '';
      const trimmed = val.trim();
      patchObj[k] = trimmed === def ? '' : trimmed;
      keys.push(k);
    }

    const res = await saveUiAppearanceSettingsToServer({ patch: patchObj });
    setIsBulkSaving(false);
    if (!res.ok || !res.settings) {
      setFeedback({
        type: 'error',
        text: res.error || 'Gagal menyimpan perubahan massal ke database.',
      });
      return;
    }
    setAppearanceSettings(res.settings);
    setDrafts((prev) => {
      const next = { ...prev };
      for (const k of keys) delete next[k];
      return next;
    });
    markSavedFlash(keys);
    setFeedback({
      type: 'ok',
      text: `${keys.length} perubahan teks berhasil disimpan ke database.`,
    });
  };

  const handleResetAll = async () => {
    setFeedback(null);
    setIsResettingAll(true);
    const res = await saveUiAppearanceSettingsToServer({ resetAll: true });
    setIsResettingAll(false);
    setConfirmResetAll(false);
    if (!res.ok || !res.settings) {
      setFeedback({
        type: 'error',
        text: res.error || 'Gagal mereset semua pengaturan tampilan.',
      });
      return;
    }
    setAppearanceSettings(res.settings);
    setDrafts({});
    setFeedback({
      type: 'ok',
      text: 'Seluruh teks tampilan berhasil dikembalikan ke bawaan dan ditampilkan kembali.',
    });
  };

  const buildCurrentExportMaps = () => {
    const mergedLabels: Record<string, string> = { ...labels };
    for (const [k, rawVal] of Object.entries(drafts)) {
      const trimmed = rawVal.trim();
      const def = UI_LABEL_DEFAULT_MAP[k];
      if (!trimmed || (def && trimmed === def)) {
        delete mergedLabels[k];
      } else {
        mergedLabels[k] = trimmed;
      }
    }
    return { exportLabels: mergedLabels, exportHidden: hiddenKeys };
  };

  const handleExportHtml = () => {
    const { exportLabels, exportHidden } = buildCurrentExportMaps();
    const html = generateUiAppearanceHtml(exportLabels, exportHidden);
    const filename = buildUiAppearanceHtmlFilename();
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    setFeedback({
      type: 'ok',
      text: `File "${filename}" (${UI_LABEL_CATALOG.length} item teks) berhasil diekspor. Anda dapat mengeditnya di browser/editor teks lalu mengimpornya kembali.`,
    });
  };

  const handleCopyHtml = async () => {
    const { exportLabels, exportHidden } = buildCurrentExportMaps();
    const html = generateUiAppearanceHtml(exportLabels, exportHidden);
    try {
      await navigator.clipboard.writeText(html);
      setCopiedHtmlFlash(true);
      window.setTimeout(() => setCopiedHtmlFlash(false), 1800);
      setFeedback({
        type: 'ok',
        text: `Kode HTML Pengaturan Tampilan (${UI_LABEL_CATALOG.length} item) disalin ke clipboard.`,
      });
    } catch {
      setFeedback({
        type: 'error',
        text: 'Gagal menyalin HTML ke clipboard. Gunakan tombol Export HTML untuk mengunduh file.',
      });
    }
  };

  const parsedImport = useMemo(() => {
    if (!importRawText.trim()) return null;
    return parseUiAppearanceHtml(importRawText);
  }, [importRawText]);

  const importDiffSummary = useMemo(() => {
    if (!parsedImport || !parsedImport.ok) return null;

    const nextLabels: Record<string, string> =
      importMode === 'replace' ? { ...parsedImport.labels } : { ...labels };
    const nextHidden: Record<string, boolean> =
      importMode === 'replace' ? { ...parsedImport.hiddenKeys } : { ...hiddenKeys };

    if (importMode === 'merge') {
      if (parsedImport.source === 'html-table') {
        for (const key of parsedImport.presentKeys) {
          if (parsedImport.labels[key]) {
            nextLabels[key] = parsedImport.labels[key];
          } else {
            delete nextLabels[key];
          }
          if (parsedImport.hiddenKeys[key]) {
            nextHidden[key] = true;
          } else {
            delete nextHidden[key];
          }
        }
      } else {
        for (const [k, v] of Object.entries(parsedImport.labels)) {
          nextLabels[k] = v;
        }
        for (const [k, v] of Object.entries(parsedImport.hiddenKeys)) {
          if (v) nextHidden[k] = true;
        }
      }
    }

    const allCandidateKeys = Array.from(
      new Set([
        ...Object.keys(labels),
        ...Object.keys(hiddenKeys),
        ...Object.keys(nextLabels),
        ...Object.keys(nextHidden),
      ])
    );

    let labelChangedCount = 0;
    let labelResetCount = 0;
    let newlyHiddenCount = 0;
    let newlyShownCount = 0;

    const previewItems: Array<{
      key: string;
      defaultLabel: string;
      prevText: string;
      nextText: string;
      textChanged: boolean;
      prevVisible: boolean;
      nextVisible: boolean;
      visibilityChanged: boolean;
    }> = [];

    for (const key of allCandidateKeys) {
      const def = UI_LABEL_DEFAULT_MAP[key] ?? key;
      const prevCustom = labels[key] ?? '';
      const nextCustom = nextLabels[key] ?? '';
      const prevText = prevCustom || def;
      const nextText = nextCustom || def;
      const textChanged = prevText !== nextText;

      const prevVisible = !hiddenKeys[key];
      const nextVisible = !nextHidden[key];
      const visibilityChanged = prevVisible !== nextVisible;

      if (!textChanged && !visibilityChanged) continue;

      if (textChanged) {
        if (!nextCustom && prevCustom) labelResetCount += 1;
        else labelChangedCount += 1;
      }
      if (visibilityChanged) {
        if (!nextVisible) newlyHiddenCount += 1;
        else newlyShownCount += 1;
      }

      previewItems.push({
        key,
        defaultLabel: def,
        prevText,
        nextText,
        textChanged,
        prevVisible,
        nextVisible,
        visibilityChanged,
      });
    }

    return {
      nextLabels,
      nextHidden,
      totalChanges: previewItems.length,
      labelChangedCount,
      labelResetCount,
      newlyHiddenCount,
      newlyShownCount,
      previewItems,
    };
  }, [parsedImport, importMode, labels, hiddenKeys]);

  const handleImportFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImportFileName(file.name);
    const reader = new FileReader();
    reader.onload = () => {
      const text = typeof reader.result === 'string' ? reader.result : '';
      setImportRawText(text);
    };
    reader.onerror = () => {
      setFeedback({
        type: 'error',
        text: `Gagal membaca file "${file.name}".`,
      });
    };
    reader.readAsText(file, 'utf-8');
    e.target.value = '';
  };

  const handleApplyImportHtml = async () => {
    if (!parsedImport || !parsedImport.ok || !importDiffSummary) return;

    setFeedback(null);
    setIsApplyingImport(true);
    let res;
    if (importMode === 'replace') {
      res = await saveUiAppearanceSettingsToServer({
        labels: importDiffSummary.nextLabels,
        hiddenKeys: importDiffSummary.nextHidden,
      });
    } else if (parsedImport.source === 'html-table') {
      const patch: Record<string, string> = {};
      const hiddenPatch: Record<string, boolean> = {};
      for (const key of parsedImport.presentKeys) {
        patch[key] = parsedImport.labels[key] ?? '';
        hiddenPatch[key] = Boolean(parsedImport.hiddenKeys[key]);
      }
      res = await saveUiAppearanceSettingsToServer({ patch, hiddenPatch });
    } else {
      res = await saveUiAppearanceSettingsToServer({
        patch: parsedImport.labels,
        hiddenPatch: parsedImport.hiddenKeys,
      });
    }
    setIsApplyingImport(false);

    if (!res.ok || !res.settings) {
      setFeedback({
        type: 'error',
        text: res.error || 'Gagal menerapkan hasil Import HTML ke database.',
      });
      return;
    }

    setAppearanceSettings(res.settings);
    setDrafts({});
    setShowImportPanel(false);
    setImportRawText('');
    setImportFileName(null);
    setFeedback({
      type: 'ok',
      text:
        importDiffSummary.totalChanges > 0
          ? `Import HTML berhasil (${importMode === 'replace' ? 'Timpa Semua' : 'Gabungkan'}). ${importDiffSummary.totalChanges} pengaturan tampilan diperbarui dan disimpan.`
          : 'Import HTML selesai diproses. Tidak ada perbedaan dengan pengaturan tampilan aktif saat ini.',
    });
  };

  return (
    <div className="max-w-5xl w-full mx-auto space-y-4 pb-6">
      {/* Header Summary & Actions */}
      <div className="bg-white rounded-2xl border border-[#DCE5EF] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#ECFDF6] border border-[#00C98A]/35 text-[#00A873] flex items-center justify-center shrink-0 mt-0.5">
            <Type className="w-4 h-4" />
          </div>
          <div className="space-y-1 min-w-0">
            <h2 className="text-sm font-bold text-[#17243D] tracking-tight">
              Tampilan, Penamaan &amp; Visibilitas Teks Editor
            </h2>
            <p className="text-xs text-[#5B708B] leading-relaxed max-w-2xl">
              Dikelompokkan berdasarkan 5 bagian utama konten (<strong>1. Data &amp; Daftar Item</strong> hingga <strong>5. Aksi &amp; Interaksi</strong>) serta bagian editor lainnya. Di setiap bagian, teks dipisahkan rapi menjadi <strong>Judul</strong>, <strong>Label</strong>, dan <strong>Deskripsi</strong> agar mudah diubah atau disembunyikan.
            </p>
            <div className="flex flex-wrap items-center gap-2 text-xs text-[#8FA4BF] pt-0.5 tabular-nums">
              <span>{UI_LABEL_CATALOG.length} teks tersedia</span>
              <span aria-hidden="true">·</span>
              <span>{descriptionItems.length} deskripsi</span>
              <span aria-hidden="true">·</span>
              <span className={customCount > 0 ? 'text-[#008F63] font-semibold' : ''}>
                {customCount} diubah
              </span>
              <span aria-hidden="true">·</span>
              <span className={hiddenCount > 0 ? 'text-rose-600 font-semibold' : ''}>
                {hiddenCount} disembunyikan
              </span>
              {dirtyEntries.length > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span className="text-amber-700 font-semibold">
                    {dirtyEntries.length} belum disimpan
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleExportHtml}
            title="Unduh seluruh Pengaturan Tampilan sebagai file HTML yang dapat diedit & diimpor ulang"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#ECFDF6] hover:border-[#00C98A] text-xs font-semibold text-[#17243D] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <Download className="w-3.5 h-3.5 text-[#00A873]" />
            <span>Export HTML</span>
          </button>

          <button
            type="button"
            onClick={() => void handleCopyHtml()}
            title="Salin kode HTML Pengaturan Tampilan ke clipboard"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-xs font-semibold text-[#5B708B] hover:text-[#17243D] transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            {copiedHtmlFlash ? (
              <Check className="w-3.5 h-3.5 text-[#00A873]" />
            ) : (
              <Copy className="w-3.5 h-3.5 text-[#8FA4BF]" />
            )}
            <span>{copiedHtmlFlash ? 'Tersalin' : 'Salin HTML'}</span>
          </button>

          <button
            type="button"
            onClick={() => setShowImportPanel((v) => !v)}
            aria-expanded={showImportPanel}
            className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
              showImportPanel
                ? 'bg-[#17243D] border-[#17243D] text-white'
                : 'bg-[#ECFDF6] border-[#00C98A]/45 text-[#065F46] hover:border-[#00C98A]'
            }`}
          >
            <Upload className={`w-3.5 h-3.5 ${showImportPanel ? 'text-[#00C98A]' : 'text-[#00A873]'}`} />
            <span>Import HTML</span>
          </button>

          {dirtyEntries.length > 0 && (
            <button
              type="button"
              disabled={isBulkSaving}
              onClick={() => void handleSaveAllDirty()}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#17243D] hover:bg-[#223456] disabled:opacity-60 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0 tabular-nums"
            >
              {isBulkSaving ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00C98A]" />
              ) : (
                <Save className="w-3.5 h-3.5 text-[#00C98A]" />
              )}
              <span>Simpan Semua ({dirtyEntries.length})</span>
            </button>
          )}

          {(customCount > 0 || hiddenCount > 0) && !confirmResetAll && (
            <button
              type="button"
              onClick={() => setConfirmResetAll(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-xs font-semibold text-[#17243D] transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <RotateCcw className="w-3.5 h-3.5 text-[#8FA4BF]" />
              <span>Reset Semua</span>
            </button>
          )}

          {confirmResetAll && (
            <div className="flex items-center gap-1.5 bg-rose-50 border border-rose-200 rounded-xl px-2.5 py-1.5">
              <span className="text-[11px] font-semibold text-rose-800 whitespace-nowrap">
                Kembalikan semua?
              </span>
              <button
                type="button"
                disabled={isResettingAll}
                onClick={() => void handleResetAll()}
                className="px-2.5 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white text-[11px] font-semibold cursor-pointer whitespace-nowrap"
              >
                {isResettingAll ? 'Mereset...' : 'Ya, Reset'}
              </button>
              <button
                type="button"
                disabled={isResettingAll}
                onClick={() => setConfirmResetAll(false)}
                className="px-2 py-1 rounded-lg bg-white border border-rose-200 text-rose-700 text-[11px] font-semibold hover:bg-rose-100/50 cursor-pointer whitespace-nowrap"
              >
                Batal
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Import HTML Panel */}
      {showImportPanel && (
        <div
          data-import-html-panel="1"
          className="bg-white rounded-2xl border border-[#00C98A]/50 p-5 space-y-4 shadow-xs"
        >
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-start gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-[#ECFDF6] border border-[#00C98A]/35 text-[#00A873] flex items-center justify-center shrink-0 mt-0.5">
                <FileCode2 className="w-4 h-4" />
              </div>
              <div className="space-y-0.5">
                <h3 className="text-xs font-bold text-[#17243D]">
                  Import HTML untuk Update Pengaturan Tampilan
                </h3>
                <p className="text-[11.5px] text-[#5B708B] leading-relaxed">
                  Unggah file <code>.html</code> hasil <strong>Export HTML</strong> yang sudah Anda edit (di browser atau text editor), atau tempelkan langsung kode HTML di bawah ini untuk melihat pratinjau perubahan sebelum disimpan.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowImportPanel(false)}
              aria-label="Tutup panel Import HTML"
              className="p-1 text-[#8FA4BF] hover:text-[#17243D] cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex flex-wrap items-center gap-2">
              <input
                ref={importFileInputRef}
                type="file"
                accept=".html,.htm,text/html,application/json"
                onChange={handleImportFileChange}
                className="hidden"
              />
              <button
                type="button"
                onClick={() => importFileInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#17243D] hover:bg-[#223456] text-white text-xs font-semibold transition-colors cursor-pointer"
              >
                <Upload className="w-3.5 h-3.5 text-[#00C98A]" />
                <span>Pilih File HTML</span>
              </button>
              {importFileName && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] text-[11px] font-medium text-[#17243D]">
                  <FileCode2 className="w-3 h-3 text-[#00A873]" />
                  <span>{importFileName}</span>
                </span>
              )}
              {importRawText.trim().length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setImportRawText('');
                    setImportFileName(null);
                  }}
                  className="text-[11px] font-semibold text-[#8FA4BF] hover:text-rose-600 cursor-pointer"
                >
                  Bersihkan
                </button>
              )}
            </div>

            <div
              role="group"
              aria-label="Mode penerapan Import HTML"
              className="inline-flex items-center gap-1 bg-[#F0F5FA] p-1 rounded-xl"
            >
              <button
                type="button"
                onClick={() => setImportMode('merge')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  importMode === 'merge'
                    ? 'bg-white text-[#17243D] shadow-xs'
                    : 'text-[#5B708B] hover:text-[#17243D]'
                }`}
              >
                Gabungkan (Update)
              </button>
              <button
                type="button"
                onClick={() => setImportMode('replace')}
                className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                  importMode === 'replace'
                    ? 'bg-white text-[#17243D] shadow-xs'
                    : 'text-[#5B708B] hover:text-[#17243D]'
                }`}
              >
                Timpa Semua
              </button>
            </div>
          </div>

          <textarea
            rows={5}
            value={importRawText}
            onChange={(e) => {
              setImportRawText(e.target.value);
              if (!e.target.value.trim()) setImportFileName(null);
            }}
            placeholder="Tempelkan isi file HTML hasil Export HTML di sini (atau klik Pilih File HTML di atas)..."
            aria-label="Konten HTML untuk diimpor"
            className="w-full px-3 py-2 text-[11.5px] font-mono rounded-xl border border-[#DCE5EF] bg-[#F0F5FA]/40 text-[#17243D] placeholder:text-[#8FA4BF] outline-none focus:bg-white focus:border-[#00C98A] resize-y"
          />

          {parsedImport && !parsedImport.ok && (
            <div className="px-3.5 py-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <span>{parsedImport.error}</span>
            </div>
          )}

          {parsedImport && parsedImport.ok && importDiffSummary && (
            <div className="rounded-xl border border-[#DCE5EF] bg-[#F8FBFE] p-3.5 space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap items-center gap-2 text-[11.5px] text-[#5B708B] tabular-nums">
                  <span className="px-2 py-0.5 rounded-md bg-[#ECFDF6] border border-[#00C98A]/40 text-[#008F63] font-bold">
                    {parsedImport.source === 'html-table'
                      ? 'Tabel HTML'
                      : parsedImport.source === 'html-json'
                      ? 'JSON HTML'
                      : 'JSON'}
                  </span>
                  <span>
                    <strong className="text-[#17243D]">{parsedImport.parsedRowCount}</strong> item terbaca
                  </span>
                  <span aria-hidden="true">·</span>
                  <span>
                    <strong className="text-[#008F63]">{importDiffSummary.totalChanges}</strong> perubahan terdeteksi
                  </span>
                  {importDiffSummary.totalChanges > 0 && (
                    <span className="text-[#17243D]">
                      (
                      {[
                        importDiffSummary.labelChangedCount > 0
                          ? `${importDiffSummary.labelChangedCount} ubah teks`
                          : null,
                        importDiffSummary.labelResetCount > 0
                          ? `${importDiffSummary.labelResetCount} reset bawaan`
                          : null,
                        importDiffSummary.newlyHiddenCount > 0
                          ? `${importDiffSummary.newlyHiddenCount} sembunyi`
                          : null,
                        importDiffSummary.newlyShownCount > 0
                          ? `${importDiffSummary.newlyShownCount} tampil`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(', ')}
                      )
                    </span>
                  )}
                </div>
                {parsedImport.unknownKeys.length > 0 && (
                  <span className="text-[10.5px] text-amber-700 font-medium">
                    {parsedImport.unknownKeys.length} kunci tidak dikenal (diabaikan jika tidak terpakai)
                  </span>
                )}
              </div>

              {importDiffSummary.previewItems.length === 0 ? (
                <div className="text-xs text-[#5B708B] py-1">
                  Semua nilai dan status tampil/sembunyi pada file HTML sudah sama dengan pengaturan aktif saat ini.
                </div>
              ) : (
                <div className="max-h-52 overflow-y-auto rounded-lg border border-[#DCE5EF] bg-white divide-y divide-[#EEF3F8]">
                  {importDiffSummary.previewItems.slice(0, 20).map((diff) => (
                    <div
                      key={diff.key}
                      className="px-3 py-2 text-[11px] flex flex-wrap items-center justify-between gap-2"
                    >
                      <div className="min-w-0 flex-1 space-y-0.5">
                        <div className="font-mono text-[10px] text-[#8FA4BF] truncate">
                          {diff.key}
                        </div>
                        {diff.textChanged ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="line-through text-[#8FA4BF]">{diff.prevText}</span>
                            <span className="text-[#8FA4BF]">→</span>
                            <span className="font-semibold text-[#17243D]">{diff.nextText}</span>
                          </div>
                        ) : (
                          <div className="font-medium text-[#17243D]">{diff.nextText}</div>
                        )}
                      </div>
                      {diff.visibilityChanged && (
                        <span
                          className={`px-2 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                            diff.nextVisible
                              ? 'bg-[#ECFDF6] text-[#008F63]'
                              : 'bg-rose-50 text-rose-600'
                          }`}
                        >
                          {diff.nextVisible ? 'Tampil' : 'Sembunyi'}
                        </span>
                      )}
                    </div>
                  ))}
                  {importDiffSummary.previewItems.length > 20 && (
                    <div className="px-3 py-1.5 text-[10.5px] text-[#8FA4BF] bg-[#F8FBFE] text-center">
                      + {importDiffSummary.previewItems.length - 20} perubahan lainnya...
                    </div>
                  )}
                </div>
              )}

              <div className="flex items-center justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowImportPanel(false)}
                  className="px-3 py-1.5 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-xs font-semibold text-[#5B708B] cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="button"
                  disabled={isApplyingImport}
                  onClick={() => void handleApplyImportHtml()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-[#00C98A] hover:bg-[#00B37B] disabled:opacity-60 text-white text-xs font-bold transition-colors cursor-pointer"
                >
                  {isApplyingImport ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  <span>
                    {isApplyingImport
                      ? 'Menyimpan...'
                      : importMode === 'replace'
                      ? 'Timpa & Simpan Tampilan'
                      : 'Terapkan & Simpan Update'}
                  </span>
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inline Feedback Banner */}
      {feedback && (
        <div
          role="status"
          className={`px-4 py-2.5 rounded-xl border text-xs font-medium flex items-center justify-between gap-2 ${
            feedback.type === 'ok'
              ? 'bg-[#ECFDF6] border-[#00C98A]/40 text-[#17243D]'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'ok' ? (
              <Check className="w-4 h-4 text-[#00A873] shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            aria-label="Tutup pemberitahuan"
            className="p-1 text-[#8FA4BF] hover:text-[#17243D] cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Search + Category Bands (5 Core Sections & Other Sections) + Jenis Filters */}
      <div className="bg-white rounded-2xl border border-[#DCE5EF] p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8FA4BF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari judul, label, deskripsi, atau komponen (misal: Katalog, Slider, WhatsApp, Sheet, Tombol)..."
            aria-label="Cari teks tampilan"
            className="w-full pl-9 pr-9 py-2 text-xs rounded-xl border border-[#DCE5EF] bg-[#F0F5FA]/50 text-[#17243D] placeholder:text-[#8FA4BF] outline-none focus:bg-white focus:border-[#00C98A] transition-colors"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery('')}
              aria-label="Hapus pencarian"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1 text-[#8FA4BF] hover:text-[#17243D] cursor-pointer"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Band 1: 5 Bagian Utama Konten (1 - 5) */}
        <div className="space-y-1.5">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#5B708B]">
            5 Bagian Utama Konten (Judul, Label &amp; Deskripsi)
          </div>
          <div
            role="tablist"
            aria-label="Filter 5 bagian utama konten"
            className="flex flex-wrap items-center gap-1.5"
          >
            <button
              type="button"
              role="tab"
              aria-selected={selectedCategory === 'all'}
              onClick={() => setSelectedCategory('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                selectedCategory === 'all'
                  ? 'bg-[#17243D] text-white'
                  : 'bg-[#F0F5FA] text-[#5B708B] hover:text-[#17243D]'
              }`}
            >
              Semua ({UI_LABEL_CATALOG.length})
            </button>
            {CORE_CONTENT_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              const catCount = UI_LABEL_CATALOG.filter((i) => i.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                    active
                      ? 'bg-[#17243D] text-white'
                      : 'bg-[#ECFDF6] text-[#17243D] border border-[#00C98A]/35 hover:border-[#00C98A]'
                  }`}
                >
                  {cat.label} ({catCount})
                </button>
              );
            })}
          </div>
        </div>

        {/* Band 2: Bagian Editor Lainnya */}
        <div className="space-y-1.5 pt-1 border-t border-[#EEF3F8]">
          <div className="text-[10.5px] font-bold uppercase tracking-wider text-[#8FA4BF]">
            Bagian Editor Lainnya (Desain, Tema, Layer, Navbar, Alat, Blok, Inspektor &amp; Navigasi Atas)
          </div>
          <div
            role="tablist"
            aria-label="Filter bagian editor lainnya"
            className="flex flex-wrap items-center gap-1.5"
          >
            {OTHER_EDITOR_CATEGORIES.map((cat) => {
              const active = selectedCategory === cat.id;
              const catCount = UI_LABEL_CATALOG.filter((i) => i.category === cat.id).length;
              return (
                <button
                  key={cat.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer tabular-nums ${
                    active
                      ? 'bg-[#17243D] text-white'
                      : 'bg-[#F0F5FA] text-[#5B708B] hover:text-[#17243D]'
                  }`}
                >
                  {cat.label} ({catCount})
                </button>
              );
            })}
          </div>
        </div>

        {/* Jenis (Judul / Label / Deskripsi) & Status Filter Bar */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-1 border-t border-[#EEF3F8]">
          <div
            role="group"
            aria-label="Filter jenis dan status teks"
            className="flex flex-wrap items-center gap-1 bg-[#F0F5FA] p-1 rounded-xl"
          >
            {(
              [
                { id: 'all', label: `Semua (${categoryScopedItems.length})` },
                { id: 'judul', label: `Judul (${scopedCounts.judul})` },
                { id: 'label', label: `Label (${scopedCounts.label})` },
                { id: 'deskripsi', label: `Deskripsi (${scopedCounts.deskripsi})` },
                { id: 'customized', label: `Diubah (${scopedCounts.customized})` },
                { id: 'hidden', label: `Disembunyikan (${scopedCounts.hidden})` },
              ] as const
            ).map((st) => {
              const active = statusFilter === st.id;
              return (
                <button
                  key={st.id}
                  type="button"
                  onClick={() => setStatusFilter(st.id)}
                  className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap tabular-nums ${
                    active
                      ? 'bg-white text-[#17243D] shadow-xs'
                      : 'text-[#5B708B] hover:text-[#17243D]'
                  }`}
                >
                  {st.label}
                </button>
              );
            })}
          </div>

          {scopedCounts.deskripsi > 0 && (
            <button
              type="button"
              disabled={isBulkTogglingDesc}
              onClick={() => void handleBulkToggleAllDescriptions(scopedCounts.visibleDesc > 0)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-[11px] font-semibold text-[#17243D] transition-colors cursor-pointer whitespace-nowrap"
            >
              {isBulkTogglingDesc ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#00A873]" />
              ) : scopedCounts.visibleDesc > 0 ? (
                <EyeOff className="w-3.5 h-3.5 text-rose-500" />
              ) : (
                <Eye className="w-3.5 h-3.5 text-[#00A873]" />
              )}
              <span>
                {scopedCounts.visibleDesc > 0
                  ? `Sembunyikan Semua Deskripsi (${scopedCounts.visibleDesc})`
                  : `Tampilkan Semua Deskripsi (${scopedCounts.deskripsi})`}
              </span>
            </button>
          )}
        </div>
      </div>

      {/* Grouped Table: Separated cleanly per section with Judul -> Label -> Deskripsi ordering */}
      <div className="bg-white rounded-2xl border border-[#DCE5EF] overflow-hidden">
        {groupedSections.length === 0 ? (
          <div className="py-12 px-6 text-center space-y-2.5">
            <div className="text-sm font-semibold text-[#17243D]">
              Tidak ada teks yang cocok dengan filter Anda.
            </div>
            <p className="text-xs text-[#8FA4BF]">
              Coba kata kunci lain atau tampilkan semua kategori dan status.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
                setStatusFilter('all');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#17243D] text-white text-xs font-semibold hover:bg-[#223456] cursor-pointer"
            >
              Tampilkan Semua Teks
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DCE5EF] bg-[#F0F5FA]/70 text-[11.5px] font-semibold text-[#5B708B]">
                  <th className="py-2.5 pl-4 pr-2 w-12 text-right tabular-nums">No.</th>
                  <th className="py-2.5 px-3 min-w-[230px]">Jenis, Nama &amp; Komponen Terkait</th>
                  <th className="py-2.5 px-3 min-w-[260px]">Ubah / Ringkas Teks</th>
                  <th className="py-2.5 px-2 w-24 text-center">Tampil</th>
                  <th className="py-2.5 pl-2 pr-4 w-24 text-center">Simpan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5EF]">
                {groupedSections.map((section) => (
                  <React.Fragment key={section.category.id}>
                    {/* Section Group Header */}
                    <tr
                      className={
                        section.category.isCoreContentSection
                          ? 'bg-[#ECFDF6]/70 border-t border-[#00C98A]/30'
                          : 'bg-[#F0F5FA]/90 border-t border-[#DCE5EF]'
                      }
                    >
                      <td colSpan={5} className="py-2.5 px-4">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="space-y-0.5 min-w-0">
                            <div className="text-xs font-bold text-[#17243D]">
                              {section.category.label}
                            </div>
                            <div className="text-[11px] text-[#5B708B]">
                              {section.category.description}
                            </div>
                          </div>
                          <div className="flex items-center gap-1.5 text-[10.5px] font-semibold shrink-0 tabular-nums">
                            <span className="px-2 py-0.5 rounded-md bg-white border border-[#00C98A]/40 text-[#008F63]">
                              {section.judulCount} Judul
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white border border-[#DCE5EF] text-[#5B708B]">
                              {section.labelCount} Label
                            </span>
                            <span className="px-2 py-0.5 rounded-md bg-white border border-[#17243D]/20 text-[#17243D]">
                              {section.deskripsiCount} Deskripsi
                            </span>
                          </div>
                        </div>
                      </td>
                    </tr>

                    {section.items.map((item, idx) => {
                      const kind = getUiLabelKind(item);
                      const persistedVal = labels[item.key] ?? item.defaultLabel;
                      const inputValue = item.key in drafts ? drafts[item.key] : persistedVal;
                      const isDirty =
                        item.key in drafts &&
                        (drafts[item.key].trim() === ''
                          ? item.defaultLabel
                          : drafts[item.key].trim()) !== persistedVal;
                      const isCustomized = Boolean(labels[item.key]);
                      const isHidden = Boolean(hiddenKeys[item.key]);
                      const isVisibleRow = !isHidden;
                      const isSavingRow = Boolean(savingKeys[item.key]);
                      const isSavedFlash = Boolean(savedFlashKeys[item.key]);
                      const useMultiline =
                        kind === 'deskripsi' ||
                        item.defaultLabel.length > 52 ||
                        inputValue.length > 52;

                      const kindBadge =
                        kind === 'judul'
                          ? { label: 'Judul', cls: 'bg-[#ECFDF6] text-[#008F63] border-[#00C98A]/40' }
                          : kind === 'deskripsi'
                          ? { label: 'Deskripsi', cls: 'bg-[#17243D]/5 text-[#17243D] border-[#17243D]/20' }
                          : { label: 'Label', cls: 'bg-[#F0F5FA] text-[#5B708B] border-[#DCE5EF]' };

                      return (
                        <tr
                          key={item.key}
                          className={`transition-colors ${
                            isHidden
                              ? 'bg-[#F0F5FA]/60'
                              : isDirty
                              ? 'bg-[#ECFDF6]/40'
                              : 'hover:bg-[#F0F5FA]/50'
                          }`}
                        >
                          <td className="py-2.5 pl-4 pr-2 text-xs font-semibold text-[#8FA4BF] text-right tabular-nums align-top">
                            {idx + 1}.
                          </td>
                          <td className="py-2.5 px-3 align-top space-y-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              <span
                                className={`inline-flex items-center px-1.5 py-0.5 rounded-md border text-[10px] font-bold leading-none ${kindBadge.cls}`}
                              >
                                {kindBadge.label}
                              </span>
                              {item.groupTitle && (
                                <span className="text-[10.5px] font-semibold text-[#5B708B]">
                                  {item.groupTitle}
                                </span>
                              )}
                            </div>
                            <div
                              className={`text-xs font-semibold leading-snug ${
                                isHidden ? 'text-[#8FA4BF] line-through' : 'text-[#17243D]'
                              }`}
                            >
                              {item.defaultLabel}
                            </div>
                            <div className="text-[10.5px] text-[#8FA4BF] flex flex-wrap items-center gap-1.5">
                              <span>{item.scopeNote}</span>
                              {isCustomized && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-[#00A873] font-medium">Diubah</span>
                                </>
                              )}
                              {isHidden && (
                                <>
                                  <span aria-hidden="true">·</span>
                                  <span className="text-rose-600 font-medium">Disembunyikan</span>
                                </>
                              )}
                            </div>
                          </td>
                          <td className="py-2 px-3 align-top">
                            {useMultiline ? (
                              <div className="space-y-1">
                                <textarea
                                  rows={2}
                                  value={inputValue}
                                  placeholder={item.defaultLabel}
                                  aria-label={`Ubah teks untuk ${item.defaultLabel}`}
                                  onChange={(e) =>
                                    handleInputChange(item.key, e.target.value, item.defaultLabel)
                                  }
                                  onKeyDown={(e) => {
                                    if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                                      e.preventDefault();
                                      void handleSaveSingle(item.key, item.defaultLabel);
                                    }
                                  }}
                                  className={`w-full px-3 py-1.5 text-xs rounded-lg border outline-none transition-colors resize-y leading-relaxed ${
                                    isDirty
                                      ? 'border-[#00C98A] bg-white text-[#17243D]'
                                      : isCustomized
                                      ? 'border-[#00C98A]/50 bg-[#ECFDF6]/40 text-[#17243D] focus:bg-white focus:border-[#00C98A]'
                                      : 'border-[#DCE5EF] bg-[#F0F5FA]/40 text-[#17243D] focus:bg-white focus:border-[#00C98A]'
                                  }`}
                                />
                                <div className="flex items-center justify-between text-[10px] text-[#8FA4BF] tabular-nums">
                                  <span>Ketik versi lebih ringkas lalu klik Simpan</span>
                                  <span>{inputValue.trim().length} karakter</span>
                                </div>
                              </div>
                            ) : (
                              <input
                                type="text"
                                value={inputValue}
                                placeholder={item.defaultLabel}
                                aria-label={`Ubah teks untuk ${item.defaultLabel}`}
                                onChange={(e) =>
                                  handleInputChange(item.key, e.target.value, item.defaultLabel)
                                }
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') {
                                    e.preventDefault();
                                    void handleSaveSingle(item.key, item.defaultLabel);
                                  }
                                }}
                                className={`w-full px-3 py-1.5 text-xs rounded-lg border outline-none transition-colors ${
                                  isDirty
                                    ? 'border-[#00C98A] bg-white text-[#17243D]'
                                    : isCustomized
                                    ? 'border-[#00C98A]/50 bg-[#ECFDF6]/40 text-[#17243D] focus:bg-white focus:border-[#00C98A]'
                                    : 'border-[#DCE5EF] bg-[#F0F5FA]/40 text-[#17243D] focus:bg-white focus:border-[#00C98A]'
                                }`}
                              />
                            )}
                          </td>
                          <td className="py-2.5 px-2 align-top">
                            <div className="flex flex-col items-center justify-center gap-1 pt-0.5">
                              <ToggleSwitch
                                checked={isVisibleRow}
                                onChange={(nextVisible) =>
                                  void handleToggleVisibility(
                                    item.key,
                                    item.defaultLabel,
                                    nextVisible
                                  )
                                }
                                label={`Tampilkan atau sembunyikan ${item.defaultLabel}`}
                              />
                              <span
                                className={`inline-flex items-center gap-1 text-[10px] font-semibold ${
                                  isVisibleRow ? 'text-[#00A873]' : 'text-[#8FA4BF]'
                                }`}
                              >
                                {isVisibleRow ? (
                                  <>
                                    <Eye className="w-2.5 h-2.5" />
                                    <span>Tampil</span>
                                  </>
                                ) : (
                                  <>
                                    <EyeOff className="w-2.5 h-2.5" />
                                    <span>Sembunyi</span>
                                  </>
                                )}
                              </span>
                            </div>
                          </td>
                          <td className="py-2.5 pl-2 pr-4 align-top">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                type="button"
                                disabled={isSavingRow}
                                onClick={() => void handleSaveSingle(item.key, item.defaultLabel)}
                                title={`Simpan perubahan teks "${item.defaultLabel}"`}
                                aria-label={`Simpan ${item.defaultLabel}`}
                                className={`w-8 h-8 rounded-lg border inline-flex items-center justify-center transition-colors cursor-pointer ${
                                  isSavedFlash
                                    ? 'bg-[#00C98A] border-[#00C98A] text-white'
                                    : isDirty
                                    ? 'bg-[#17243D] border-[#17243D] text-[#00C98A] hover:bg-[#223456]'
                                    : 'bg-white border-[#DCE5EF] text-[#5B708B] hover:bg-[#ECFDF6] hover:border-[#00C98A] hover:text-[#00A873]'
                                }`}
                              >
                                {isSavingRow ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : isSavedFlash ? (
                                  <Check className="w-3.5 h-3.5" />
                                ) : (
                                  <Save className="w-3.5 h-3.5" />
                                )}
                              </button>

                              {(isCustomized || isHidden) && (
                                <button
                                  type="button"
                                  disabled={isSavingRow}
                                  onClick={() => void handleResetSingle(item.key, item.defaultLabel)}
                                  title={`Kembalikan "${item.defaultLabel}" ke bawaan & tampilkan`}
                                  aria-label={`Reset ${item.defaultLabel}`}
                                  className="w-8 h-8 rounded-lg border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-[#8FA4BF] hover:text-[#17243D] inline-flex items-center justify-center transition-colors cursor-pointer"
                                >
                                  <RotateCcw className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
