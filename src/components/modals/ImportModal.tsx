import React, { useState } from 'react';
import { FileUp, X } from 'lucide-react';
import type { BuilderProject, WorkspaceBundle } from '../../types/builder';

export type ImportedPayload =
  | { kind: 'single'; project: BuilderProject }
  | { kind: 'workspace'; bundle: WorkspaceBundle };

export function ImportModal({
  onImport,
  onClose = () => {},
  asPage = false,
}: {
  onImport: (payload: ImportedPayload) => void;
  onClose?: () => void;
  asPage?: boolean;
}) {
  const [rawJson, setRawJson] = useState('');
  const [error, setError] = useState<string | null>(null);

  const tryParseAndImport = (text: string) => {
    try {
      const parsed = JSON.parse(text) as Record<string, unknown>;
      if (parsed && Array.isArray(parsed.projects) && parsed.projects.length > 0) {
        onImport({ kind: 'workspace', bundle: parsed as unknown as WorkspaceBundle });
        onClose();
        return;
      }
      const single = parsed as unknown as BuilderProject;
      if (!single || !Array.isArray(single.blocks) || !single.theme) {
        setError('Format file backup tidak valid.');
        return;
      }
      onImport({ kind: 'single', project: single });
      onClose();
    } catch {
      setError('Gagal membaca JSON. Pastikan isi file backup valid.');
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        tryParseAndImport(reader.result);
      }
    };
    reader.readAsText(file);
  };

  const cardContent = (
    <div
      onClick={(e) => {
        if (!asPage) e.stopPropagation();
      }}
      className={
        asPage
          ? 'w-full max-w-3xl mx-auto bg-white rounded-2xl border border-[#DCE5EF] overflow-hidden'
          : 'w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-[#DCE5EF] overflow-hidden'
      }
    >
      <div className="px-5 py-4 border-b border-[#DCE5EF] bg-white flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-[#ECFDF6] border border-[#00C98A]/35 text-[#00A873] flex items-center justify-center shrink-0">
            <FileUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <h2 className="text-sm font-bold text-[#17243D] tracking-tight">
              Impor Backup Proyek (.json)
            </h2>
            <p className="text-xs text-[#5B708B] mt-0.5">
              Mendukung file backup 1 usaha maupun backup semua usaha sekaligus.
            </p>
          </div>
        </div>
        {!asPage && (
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[#F0F5FA] text-[#5B708B] hover:text-[#17243D] transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

        <div className="p-5 space-y-4">
          <label className="flex flex-col items-center justify-center gap-2 py-7 px-4 rounded-xl border-2 border-dashed border-[#DCE5EF] bg-[#F0F5FA]/60 hover:bg-[#ECFDF6]/60 hover:border-[#00C98A] cursor-pointer transition-colors">
            <div className="w-10 h-10 rounded-xl bg-white border border-[#DCE5EF] text-[#00A873] flex items-center justify-center">
              <FileUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-semibold text-[#17243D]">
              Pilih file backup .json dari perangkat
            </span>
            <span className="text-[11px] text-[#8FA4BF]">
              Format .json tunggal atau bundel seluruh unit usaha
            </span>
            <input type="file" accept=".json,application/json" onChange={handleFileChange} className="hidden" />
          </label>

          <div>
            <label className="block text-xs font-semibold text-[#5B708B] mb-1.5">
              Atau tempel isi JSON di sini:
            </label>
            <textarea
              rows={5}
              value={rawJson}
              onChange={(e) => {
                setRawJson(e.target.value);
                setError(null);
              }}
              placeholder='{"title": "...", "theme": {...}, "blocks": [...]}'
              className="w-full p-3 text-xs font-mono text-[#17243D] placeholder:text-[#8FA4BF] rounded-xl border border-[#DCE5EF] bg-[#F0F5FA]/40 focus:bg-white focus:border-[#00C98A] outline-none transition-colors"
            />
          </div>

          {error && (
            <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
              {error}
            </div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <span className="text-[11px] text-[#8FA4BF]">
              Usaha yang diimpor ditambahkan ke daftar tanpa menghapus proyek lama.
            </span>
            <div className="flex gap-2 shrink-0">
              {!asPage && (
                <button
                  type="button"
                  onClick={onClose}
                  className="px-4 py-2 rounded-xl border border-[#DCE5EF] bg-white text-xs font-semibold text-[#17243D] hover:bg-[#F0F5FA] transition-colors cursor-pointer"
                >
                  Batal
                </button>
              )}
              <button
                type="button"
                onClick={() => tryParseAndImport(rawJson)}
                disabled={!rawJson.trim()}
                className="px-4 py-2 rounded-xl bg-[#17243D] hover:bg-[#223456] disabled:opacity-40 text-xs font-semibold text-white transition-colors cursor-pointer"
              >
                Muat Proyek
              </button>
            </div>
          </div>
        </div>
      </div>
  );

  if (asPage) {
    return cardContent;
  }

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#17243D]/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      {cardContent}
    </div>
  );
}
