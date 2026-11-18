import React, { useMemo, useState } from 'react';
import {
  AlertCircle,
  Check,
  Loader2,
  RotateCcw,
  Save,
  Search,
  X,
} from 'lucide-react';
import { useUiLabel } from '../contexts/UiLabelsContext';
import { saveUiAppearanceSettingsToServer } from '../utils/authClient';
import {
  UI_LABEL_CATALOG,
  UI_LABEL_CATEGORIES,
  type UiLabelCategory,
} from '../utils/uiAppearanceLabels';

type FilterCategory = 'all' | UiLabelCategory;

const CATEGORY_LABEL_MAP: Record<UiLabelCategory, string> = Object.fromEntries(
  UI_LABEL_CATEGORIES.map((c) => [c.id, c.label])
) as Record<UiLabelCategory, string>;

export function TampilanSettingsPanel() {
  const { labels, setAppearanceSettings } = useUiLabel();
  const [selectedCategory, setSelectedCategory] = useState<FilterCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingKeys, setSavingKeys] = useState<Record<string, boolean>>({});
  const [savedFlashKeys, setSavedFlashKeys] = useState<Record<string, boolean>>({});
  const [isBulkSaving, setIsBulkSaving] = useState(false);
  const [confirmResetAll, setConfirmResetAll] = useState(false);
  const [isResettingAll, setIsResettingAll] = useState(false);
  const [feedback, setFeedback] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  const customCount = useMemo(() => Object.keys(labels).length, [labels]);

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
    return UI_LABEL_CATALOG.filter((item) => {
      if (selectedCategory !== 'all' && item.category !== selectedCategory) {
        return false;
      }
      if (!q) return true;
      const currentVal = (drafts[item.key] ?? labels[item.key] ?? item.defaultLabel).toLowerCase();
      const catLabel = CATEGORY_LABEL_MAP[item.category].toLowerCase();
      return (
        item.defaultLabel.toLowerCase().includes(q) ||
        currentVal.includes(q) ||
        item.scopeNote.toLowerCase().includes(q) ||
        catLabel.includes(q)
      );
    });
  }, [selectedCategory, searchQuery, drafts, labels]);

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
        text: res.error || 'Gagal menyimpan perubahan label ke database.',
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
          ? `Label "${defaultLabel}" dikembalikan ke nama bawaan.`
          : `Label "${defaultLabel}" disimpan menjadi "${patchVal}".`,
    });
  };

  const handleResetSingle = async (key: string, defaultLabel: string) => {
    setFeedback(null);
    setSavingKeys((prev) => ({ ...prev, [key]: true }));
    const res = await saveUiAppearanceSettingsToServer({ patch: { [key]: '' } });
    setSavingKeys((prev) => {
      const next = { ...prev };
      delete next[key];
      return next;
    });

    if (!res.ok || !res.settings) {
      setFeedback({
        type: 'error',
        text: res.error || 'Gagal mengembalikan label ke bawaan.',
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
      text: `Label "${defaultLabel}" dikembalikan ke nama bawaan.`,
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
      text: `${keys.length} perubahan label berhasil disimpan ke database.`,
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
        text: res.error || 'Gagal mereset semua nama tampilan.',
      });
      return;
    }
    setAppearanceSettings(res.settings);
    setDrafts({});
    setFeedback({
      type: 'ok',
      text: 'Seluruh label tampilan berhasil dikembalikan ke nama bawaan.',
    });
  };

  return (
    <div className="max-w-5xl w-full mx-auto space-y-4 pb-6">
      {/* Header Summary & Actions */}
      <div className="bg-white rounded-2xl border border-[#DCE5EF] p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="space-y-1 min-w-0">
          <h2 className="text-base font-bold text-[#17243D] tracking-tight">
            Tampilan &amp; Penamaan Label Editor
          </h2>
          <p className="text-xs text-[#51637D] leading-relaxed max-w-2xl">
            Sesuaikan nama tampilan di panel Alat, Blok, Komponen, Home, Desain &amp; isinya, Konten &amp; isinya, serta Tema &amp; isinya. Perubahan tersimpan ke database dan langsung diterapkan ke editor.
          </p>
          <div className="flex items-center gap-2 text-xs text-[#8FA4BF] pt-0.5 tabular-nums">
            <span>{UI_LABEL_CATALOG.length} label tersedia</span>
            <span aria-hidden="true">·</span>
            <span className={customCount > 0 ? 'text-[#00A873] font-semibold' : ''}>
              {customCount} label diubah
            </span>
            {dirtyEntries.length > 0 && (
              <>
                <span aria-hidden="true">·</span>
                <span className="text-amber-600 font-semibold">
                  {dirtyEntries.length} belum disimpan
                </span>
              </>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
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

          {customCount > 0 && !confirmResetAll && (
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

      {/* Search + Category Filter Tabs */}
      <div className="bg-white rounded-2xl border border-[#DCE5EF] p-4 space-y-3">
        <div className="relative">
          <Search className="w-4 h-4 text-[#8FA4BF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari nama label (misal: Pengaturan Khusus Komponen, Alat, Blok, Home)..."
            aria-label="Cari label tampilan"
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

        <div
          role="tablist"
          aria-label="Filter kategori tampilan"
          className="flex items-center gap-1.5 overflow-x-auto pb-0.5"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === 'all'}
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#17243D] text-white'
                : 'bg-[#F0F5FA] text-[#51637D] hover:text-[#17243D]'
            }`}
          >
            Semua ({UI_LABEL_CATALOG.length})
          </button>
          {UI_LABEL_CATEGORIES.map((cat) => {
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
                    : 'bg-[#F0F5FA] text-[#51637D] hover:text-[#17243D]'
                }`}
              >
                {cat.label} ({catCount})
              </button>
            );
          })}
        </div>
      </div>

      {/* Numbered Table: No. | Nama | Ubah | Icon Simpan */}
      <div className="bg-white rounded-2xl border border-[#DCE5EF] overflow-hidden">
        {filteredItems.length === 0 ? (
          <div className="py-12 px-6 text-center space-y-2.5">
            <div className="text-sm font-semibold text-[#17243D]">
              Tidak ada label yang cocok dengan pencarian Anda.
            </div>
            <p className="text-xs text-[#8FA4BF]">
              Coba kata kunci lain atau tampilkan semua kategori label.
            </p>
            <button
              type="button"
              onClick={() => {
                setSearchQuery('');
                setSelectedCategory('all');
              }}
              className="px-3.5 py-1.5 rounded-xl bg-[#17243D] text-white text-xs font-semibold hover:bg-[#223456] cursor-pointer"
            >
              Tampilkan Semua Label
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#DCE5EF] bg-[#F0F5FA]/70 text-[11.5px] font-semibold text-[#51637D]">
                  <th className="py-2.5 pl-4 pr-2 w-12 text-right tabular-nums">No.</th>
                  <th className="py-2.5 px-3 min-w-[210px]">Nama</th>
                  <th className="py-2.5 px-3 min-w-[230px]">Ubah</th>
                  <th className="py-2.5 pl-2 pr-4 w-24 text-center">Simpan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#DCE5EF]">
                {filteredItems.map((item, idx) => {
                  const persistedVal = labels[item.key] ?? item.defaultLabel;
                  const inputValue = item.key in drafts ? drafts[item.key] : persistedVal;
                  const isDirty =
                    item.key in drafts &&
                    (drafts[item.key].trim() === ''
                      ? item.defaultLabel
                      : drafts[item.key].trim()) !== persistedVal;
                  const isCustomized = Boolean(labels[item.key]);
                  const isSavingRow = Boolean(savingKeys[item.key]);
                  const isSavedFlash = Boolean(savedFlashKeys[item.key]);

                  return (
                    <tr
                      key={item.key}
                      className={`transition-colors ${
                        isDirty ? 'bg-[#ECFDF6]/40' : 'hover:bg-[#F0F5FA]/50'
                      }`}
                    >
                      <td className="py-2.5 pl-4 pr-2 text-xs font-semibold text-[#8FA4BF] text-right tabular-nums align-middle">
                        {idx + 1}.
                      </td>
                      <td className="py-2.5 px-3 align-middle">
                        <div className="text-xs font-semibold text-[#17243D]">
                          {item.defaultLabel}
                        </div>
                        <div className="text-[11px] text-[#8FA4BF] flex items-center gap-1.5">
                          <span>{CATEGORY_LABEL_MAP[item.category]}</span>
                          <span aria-hidden="true">·</span>
                          <span>{item.scopeNote}</span>
                          {isCustomized && (
                            <>
                              <span aria-hidden="true">·</span>
                              <span className="text-[#00A873] font-medium">Diubah</span>
                            </>
                          )}
                        </div>
                      </td>
                      <td className="py-2 px-3 align-middle">
                        <input
                          type="text"
                          value={inputValue}
                          placeholder={item.defaultLabel}
                          aria-label={`Ubah nama untuk ${item.defaultLabel}`}
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
                      </td>
                      <td className="py-2 pl-2 pr-4 align-middle">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            type="button"
                            disabled={isSavingRow}
                            onClick={() => void handleSaveSingle(item.key, item.defaultLabel)}
                            title={`Simpan perubahan nama "${item.defaultLabel}"`}
                            aria-label={`Simpan ${item.defaultLabel}`}
                            className={`w-8 h-8 rounded-lg border inline-flex items-center justify-center transition-colors cursor-pointer ${
                              isSavedFlash
                                ? 'bg-[#00C98A] border-[#00C98A] text-white'
                                : isDirty
                                ? 'bg-[#17243D] border-[#17243D] text-[#00C98A] hover:bg-[#223456]'
                                : 'bg-white border-[#DCE5EF] text-[#51637D] hover:bg-[#ECFDF6] hover:border-[#00C98A] hover:text-[#00A873]'
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

                          {isCustomized && (
                            <button
                              type="button"
                              disabled={isSavingRow}
                              onClick={() => void handleResetSingle(item.key, item.defaultLabel)}
                              title={`Kembalikan ke "${item.defaultLabel}"`}
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
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
