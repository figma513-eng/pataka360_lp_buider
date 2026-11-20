import { useState } from 'react';
import { Check, Copy, Download, X } from 'lucide-react';
import type { BuilderProject } from '../../types/builder';
import { generateProjectHtml } from '../../utils/htmlExporter';
import { copyTextToClipboard } from '../../utils/clipboardHelpers';

export function CodeModal({
  projectId,
  project,
  onClose = () => {},
  asPage = false,
}: {
  projectId: string;
  project: BuilderProject;
  onClose?: () => void;
  asPage?: boolean;
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

  const cardContent = (
    <div
      onClick={(e) => {
        if (!asPage) e.stopPropagation();
      }}
      className={
        asPage
          ? 'w-full max-w-5xl mx-auto flex-1 min-h-0 flex flex-col bg-white rounded-2xl overflow-hidden border border-[#DCE5EF]'
          : 'w-full max-w-3xl max-h-[85vh] flex flex-col bg-white rounded-2xl overflow-hidden shadow-2xl border border-[#DCE5EF]'
      }
    >
      <div className="px-5 py-3.5 border-b border-[#DCE5EF] bg-white flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#17243D] tracking-tight">Kode Ekspor HTML</h2>
          <p className="text-xs text-[#5B708B] mt-0.5">
            Siap ditempel ke platform link-in-bio atau diunggah sebagai halaman statis.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleDownloadHtml}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] hover:border-[#8FA4BF] text-xs font-semibold text-[#17243D] transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5 text-[#00A873]" />
            <span>Unduh .html</span>
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#17243D] hover:bg-[#223456] text-xs font-semibold text-white transition-colors cursor-pointer whitespace-nowrap"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-[#00C98A]" /> : <Copy className="w-3.5 h-3.5 text-[#00C98A]" />}
            <span>{copied ? 'Tersalin!' : 'Salin Kode'}</span>
          </button>
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
      </div>
      {copyError && (
        <div className="px-5 py-2 bg-amber-50 border-b border-amber-200 text-amber-800 text-xs font-medium">
          {copyError}
        </div>
      )}
      <pre className="flex-1 overflow-auto p-4 bg-[#17243D] text-[#E6EEF8] text-xs font-mono leading-relaxed min-h-[260px]">
        <code>{html}</code>
      </pre>
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
