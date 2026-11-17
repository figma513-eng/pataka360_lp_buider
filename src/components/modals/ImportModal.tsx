import React, { useState } from 'react';
import { FileUp, X } from 'lucide-react';
import type { BuilderProject, WorkspaceBundle } from '../../types/builder';

export type ImportedPayload =
  | { kind: 'single'; project: BuilderProject }
  | { kind: 'workspace'; bundle: WorkspaceBundle };

export function ImportModal({
  onImport,
  onClose,
}: {
  onImport: (payload: ImportedPayload) => void;
  onClose: () => void;
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

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
      >
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Import Backup Proyek (.json)</h2>
            <p className="text-[11px] text-slate-500 mt-0.5">
              Mendukung file backup 1 usaha maupun backup semua usaha sekaligus.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <label className="flex flex-col items-center justify-center gap-2 py-6 px-4 rounded-xl border-2 border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 cursor-pointer transition-colors">
            <FileUp className="w-6 h-6 text-blue-600" />
            <span className="text-xs font-semibold text-slate-700">
              Pilih file backup .json dari perangkat
            </span>
            <input type="file" accept=".json,application/json" onChange={handleFileChange} className="hidden" />
          </label>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
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
              className="w-full p-3 text-xs font-mono rounded-xl border border-slate-200 focus:border-blue-500 outline-none"
            />
          </div>

          {error && <div className="text-xs text-red-600 font-medium">{error}</div>}

          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] text-slate-400">
              Usaha yang diimpor ditambahkan ke daftar tanpa menghapus proyek lama.
            </span>
            <div className="flex gap-2 shrink-0">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-lg border border-slate-200 text-xs font-semibold text-slate-700 hover:bg-slate-50 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={() => tryParseAndImport(rawJson)}
                disabled={!rawJson.trim()}
                className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-xs font-semibold text-white cursor-pointer"
              >
                Muat Proyek
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
