import { useState } from 'react';
import { Check, Copy, Download, X } from 'lucide-react';
import type { BuilderProject } from '../../types/builder';
import { generateProjectHtml } from '../../utils/htmlExporter';
import { copyTextToClipboard } from '../../utils/clipboardHelpers';

export function CodeModal({
  projectId,
  project,
  onClose,
}: {
  projectId: string;
  project: BuilderProject;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState<string | null>(null);
  const html = generateProjectHtml(project, { projectId });

  const handleCopy = async () => {
    const ok = await copyTextToClipboard(html);
    if (ok) {
      setCopyError(null);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } else {
      setCopyError('Gagal menyalin otomatis. Silakan klik tombol Unduh .html.');
      setTimeout(() => setCopyError(null), 3500);
    }
  };

  const handleDownloadHtml = () => {
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${project.title.toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'halaman'}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-3xl max-h-[85vh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl border border-slate-200"
      >
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">Kode Ekspor HTML</h2>
            <p className="text-xs text-slate-500">
              Siap ditempel ke platform link-in-bio atau diunggah sebagai halaman statis.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleDownloadHtml}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 text-xs font-semibold text-slate-700 cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh .html</span>
            </button>
            <button
              type="button"
              onClick={handleCopy}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-xs font-semibold text-white cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copied ? 'Tersalin!' : 'Salin Kode'}</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
        {copyError && (
          <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-medium">
            {copyError}
          </div>
        )}
        <pre className="flex-1 overflow-auto p-4 bg-slate-950 text-slate-100 text-xs font-mono leading-relaxed">
          <code>{html}</code>
        </pre>
      </div>
    </div>
  );
}
