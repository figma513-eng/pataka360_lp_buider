import React, { useEffect, useRef, useState } from 'react';
import {
  ChevronDown,
  Copy,
  ArrowUp,
  ArrowDown,
  MoreVertical,
  Pencil,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { BlockLayoutMode } from '../../types/builder';

export function AccordionSection({
  id,
  title,
  icon,
  badge,
  isOpen,
  onToggle,
  fullWidthBody = false,
  children,
}: {
  id: string;
  title: string;
  icon?: React.ReactNode;
  badge?: string | number;
  isOpen: boolean;
  onToggle: () => void;
  fullWidthBody?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div
      data-accordion-id={id}
      className={`rounded-xl border transition-all ${
        isOpen
          ? 'border-[#00C98A]/55 bg-white shadow-2xs'
          : 'border-[#DCE5EF] bg-white shadow-2xs hover:border-[#00C98A]/70'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`w-full px-3 py-1.5 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer ${
          isOpen
            ? 'bg-[#F3FBF7] border-b border-[#E6EEF5] text-[#17243D] rounded-t-xl'
            : 'bg-white hover:bg-[#F7FBFD] text-[#17243D] rounded-xl'
        }`}
      >
        <div className="flex items-center gap-1.5 min-w-0">
          {icon && (
            <span
              className={`w-4.5 h-4.5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
                isOpen
                  ? 'bg-[#00C98A] text-white'
                  : 'bg-[#F0F5FA] text-[#51637D]'
              }`}
            >
              {icon}
            </span>
          )}
          <span className="text-[10.5px] font-semibold text-[#17243D] tracking-[0.01em] truncate">
            {title}
          </span>
          {badge !== undefined && badge !== '' && (
            <span className="px-1.5 py-0.5 rounded bg-[#F0F5FA] border border-[#DCE5EF] text-[9px] font-semibold text-[#51637D] tabular-nums shrink-0">
              {badge}
            </span>
          )}
        </div>
        <span
          className={`w-4.5 h-4.5 rounded-md flex items-center justify-center shrink-0 transition-colors ${
            isOpen ? 'bg-[#17243D] text-white' : 'bg-[#F0F5FA] text-[#51637D]'
          }`}
        >
          <ChevronDown
            className={`w-2.5 h-2.5 transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </span>
      </button>
      {isOpen && (
        <div
          data-accordion-body={id}
          className={
            fullWidthBody
              ? 'px-2 py-2 bg-white rounded-b-xl'
              : 'px-4 py-2.5 bg-white rounded-b-xl'
          }
        >
          <div
            data-accordion-inner={id}
            className={fullWidthBody ? 'space-y-1.5' : 'w-[94%] mx-auto space-y-2'}
          >
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-4.5 w-8 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
        checked ? 'bg-[#00C98A]' : 'bg-[#CBD5E1]'
      }`}
    >
      <span
        className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white shadow-xs transition-transform ${
          checked ? 'translate-x-4' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

export function SliderRow({
  label,
  value,
  min,
  max,
  step = 1,
  current,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  step?: number;
  current: number;
  onChange: (val: number) => void;
}) {
  const safeSpan = max - min;
  const pct = safeSpan > 0 ? Math.max(0, Math.min(100, ((current - min) / safeSpan) * 100)) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-[10px] mb-1">
        <span className="font-medium text-[#334155]">{label}</span>
        <span className="font-mono text-[9.5px] font-semibold text-[#334155] bg-[#F4F7FB] border border-[#E2EAF2] px-1.5 py-0.5 rounded tabular-nums">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        style={{
          background: `linear-gradient(to right, #94A3B8 0%, #94A3B8 ${pct}%, #E2E8F0 ${pct}%, #E2E8F0 100%)`,
        }}
        className="w-full cursor-pointer"
      />
    </div>
  );
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  columns,
}: {
  options: { id: T; label: React.ReactNode }[];
  value: T;
  onChange: (id: T) => void;
  columns?: number;
}) {
  const cols = columns ?? Math.min(options.length, 4);
  return (
    <div
      className="grid gap-1 p-0.5 rounded-lg bg-[#F4F7FB] border border-[#E2EAF2]"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`py-1 px-1.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer truncate flex items-center justify-center gap-1 ${
              active
                ? 'bg-[#17243D] text-white shadow-2xs'
                : 'text-[#475569] hover:text-[#17243D] hover:bg-white/80'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}

export function SectionEmptyNote({ message }: { message: string }) {
  return (
    <div className="px-2.5 py-2 rounded-lg bg-[#F0F5FA]/70 border border-dashed border-[#DCE5EF] text-[10.5px] text-[#8FA4BF] leading-relaxed">
      {message}
    </div>
  );
}

export function MediaSourceInput({
  label,
  value,
  placeholder = 'https://... (link gambar)',
  previewFallback,
  uploading,
  onChangeUrl,
  onUploadFile,
  onSavePreparedUrl,
  onClear,
}: {
  label?: string;
  value?: string;
  placeholder?: string;
  previewFallback?: string;
  uploading?: boolean;
  onChangeUrl: (nextUrl: string) => void;
  onUploadFile?: (file: File) => void;
  onSavePreparedUrl?: (url: string, meta: { fileName: string; formatLabel: string; sizeBytes: number }) => void;
  onClear?: () => void;
}) {
  const [preparing, setPreparing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [pendingUpload, setPendingUpload] = useState<{
    dataUrl: string;
    fileName: string;
    formatLabel: string;
    mimeType: string;
    sizeBytes: number;
    width?: number;
    height?: number;
    note?: string;
    originalFile: File;
  } | null>(null);

  const isEmbedded = Boolean(value && value.startsWith('data:'));
  const isSvgPlaceholder = Boolean(value && value.startsWith('data:image/svg+xml'));
  const displaySrc = pendingUpload?.dataUrl || value || previewFallback || '';
  const isBusy = Boolean(uploading || preparing || saving);

  const handleSelectFile = async (file: File) => {
    setLocalError(null);
    setPreparing(true);
    try {
      const { prepareImageForWebpPreview } = await import('../../utils/imageHelpers');
      const prepared = await prepareImageForWebpPreview(file);
      setPendingUpload({ ...prepared, originalFile: file });
    } catch (err) {
      setPendingUpload(null);
      setLocalError(err instanceof Error ? err.message : 'Gagal memproses gambar ke format WebP.');
    } finally {
      setPreparing(false);
    }
  };

  const handleConfirmSave = async () => {
    if (!pendingUpload) return;
    setLocalError(null);
    setSaving(true);
    try {
      const { savePreparedImageToProject } = await import('../../utils/imageHelpers');
      const finalUrl = await savePreparedImageToProject(pendingUpload);
      if (onSavePreparedUrl) {
        onSavePreparedUrl(finalUrl, {
          fileName: pendingUpload.fileName,
          formatLabel: pendingUpload.formatLabel,
          sizeBytes: pendingUpload.sizeBytes,
        });
      } else {
        onChangeUrl(finalUrl);
      }
      setPendingUpload(null);
    } catch (err) {
      // Fallback to legacy handler only if server save unexpectedly throws
      if (onUploadFile && pendingUpload.originalFile) {
        try {
          onUploadFile(pendingUpload.originalFile);
          setPendingUpload(null);
          return;
        } catch {
          // ignore and display primary error below
        }
      }
      setLocalError(err instanceof Error ? err.message : 'Gagal menyimpan gambar ke penyimpanan proyek.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[10.5px] font-semibold text-[#17243D]">{label}</label>
      )}
      <div className="flex items-center gap-1.5">
        {displaySrc && (
          <div className="w-8 h-8 rounded-lg border border-[#DCE5EF] bg-[#F0F5FA] overflow-hidden shrink-0 flex items-center justify-center">
            <img
              src={displaySrc}
              alt="Preview"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0 flex items-center gap-1">
          <input
            type="url"
            value={isEmbedded ? '' : value ?? ''}
            placeholder={
              isEmbedded && !isSvgPlaceholder ? 'Gambar terunggah (isi URL untuk ganti)' : placeholder
            }
            onChange={(e) => {
              setPendingUpload(null);
              setLocalError(null);
              onChangeUrl(e.target.value);
            }}
            className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded-lg border border-[#DCE5EF] bg-white text-[#17243D] outline-none focus:border-[#00C98A]"
          />
          <label
            title="Upload gambar (otomatis dikonversi ke WebP sebelum disimpan)"
            className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border border-[#DCE5EF] bg-[#F0F5FA] hover:bg-[#DCE5EF]/50 text-[10.5px] font-semibold text-[#17243D] cursor-pointer shrink-0 transition-colors ${
              isBusy ? 'opacity-60 pointer-events-none' : ''
            }`}
          >
            <Upload className="w-3 h-3 text-[#00C98A]" />
            <span>{preparing ? 'Konversi...' : saving ? 'Menyimpan...' : uploading ? '...' : 'Upload'}</span>
            <input
              type="file"
              accept="image/*"
              disabled={isBusy}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) void handleSelectFile(file);
              }}
              className="hidden"
            />
          </label>
          {onClear && value && !pendingUpload && (
            <button
              type="button"
              onClick={onClear}
              title="Hapus gambar"
              className="p-1 rounded-lg border border-[#DCE5EF] bg-white text-[#8FA4BF] hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
            >
              <X className="w-3 h-3" />
            </button>
          )}
        </div>
      </div>

      {/* Step 1 -> Step 2 WebP Preview & Explicit Save Card */}
      {pendingUpload && (
        <div
          data-webp-preview-card="true"
          className="p-2 rounded-lg border border-[#00C98A]/60 bg-[#ECFDF6] space-y-2"
        >
          <div className="flex items-start gap-2">
            <div className="w-12 h-12 rounded-md border border-[#00C98A]/40 bg-white overflow-hidden shrink-0 flex items-center justify-center">
              <img
                src={pendingUpload.dataUrl}
                alt={pendingUpload.fileName}
                className="w-full h-full object-contain"
              />
            </div>
            <div className="min-w-0 flex-1 space-y-0.5">
              <div className="text-[10.5px] font-bold text-[#17243D] truncate" title={pendingUpload.fileName}>
                {pendingUpload.fileName}
              </div>
              <div className="flex items-center flex-wrap gap-1 text-[9px] font-semibold">
                <span className="px-1.5 py-0.5 rounded bg-[#17243D] text-white">
                  {pendingUpload.formatLabel}
                </span>
                <span className="px-1.5 py-0.5 rounded bg-white border border-[#DCE5EF] text-[#334155] tabular-nums">
                  {pendingUpload.sizeBytes < 1024
                    ? `${pendingUpload.sizeBytes} B`
                    : pendingUpload.sizeBytes < 1024 * 1024
                    ? `${(pendingUpload.sizeBytes / 1024).toFixed(1)} KB`
                    : `${(pendingUpload.sizeBytes / (1024 * 1024)).toFixed(2)} MB`}
                </span>
                {pendingUpload.width && pendingUpload.height && (
                  <span className="px-1.5 py-0.5 rounded bg-white border border-[#DCE5EF] text-[#51637D] tabular-nums">
                    {pendingUpload.width}×{pendingUpload.height}
                  </span>
                )}
              </div>
              {pendingUpload.note && (
                <p className="text-[9.5px] text-[#007A54] leading-snug">{pendingUpload.note}</p>
              )}
            </div>
          </div>

          <div className="flex items-center justify-end gap-1.5">
            <button
              type="button"
              disabled={saving}
              onClick={() => {
                setPendingUpload(null);
                setLocalError(null);
              }}
              className="px-2 py-1 rounded-md border border-[#DCE5EF] bg-white text-[10px] font-semibold text-[#51637D] hover:bg-[#F0F5FA] cursor-pointer disabled:opacity-50"
            >
              Batal
            </button>
            <button
              type="button"
              disabled={saving}
              onClick={() => void handleConfirmSave()}
              className="px-2.5 py-1 rounded-md bg-[#00C98A] hover:bg-[#00B37B] text-white text-[10px] font-bold shadow-2xs cursor-pointer disabled:opacity-50"
            >
              {saving ? 'Menyimpan...' : 'Simpan Gambar'}
            </button>
          </div>
        </div>
      )}

      {localError && (
        <div className="px-2 py-1.5 rounded-md bg-red-50 border border-red-200 text-[10px] font-medium text-red-700 leading-snug">
          {localError}
        </div>
      )}
    </div>
  );
}

export function ItemOverflowMenu({
  onEdit,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onDelete,
  disableMoveUp,
  disableMoveDown,
  disableDelete,
  editLabel = 'Edit Detail',
}: {
  onEdit?: () => void;
  onDuplicate?: () => void;
  onMoveUp?: () => void;
  onMoveDown?: () => void;
  onDelete?: () => void;
  disableMoveUp?: boolean;
  disableMoveDown?: boolean;
  disableDelete?: boolean;
  editLabel?: string;
}) {
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  return (
    <div ref={menuRef} className="relative shrink-0 flex items-center gap-0.5">
      {onDelete && (
        <button
          type="button"
          disabled={disableDelete}
          onClick={(e) => {
            e.stopPropagation();
            if (disableDelete) return;
            setOpen(false);
            onDelete();
          }}
          title="Hapus item terpilih"
          aria-label="Hapus item terpilih"
          className="p-1.5 rounded-md text-[#8FA4BF] hover:text-red-600 hover:bg-red-50 disabled:opacity-35 disabled:pointer-events-none cursor-pointer transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      )}
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
        title="Opsi item"
        aria-label="Opsi item"
        className="p-1.5 rounded-md text-[#8FA4BF] hover:text-[#17243D] hover:bg-[#F0F5FA] cursor-pointer transition-colors"
      >
        <MoreVertical className="w-3.5 h-3.5" />
      </button>

      {open && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-0 top-full mt-1 w-40 rounded-lg border border-[#DCE5EF] bg-white shadow-lg py-1 z-30"
        >
          {onEdit && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onEdit();
              }}
              className="w-full px-3 py-1.5 text-left text-xs font-medium text-[#17243D] hover:bg-[#F0F5FA] flex items-center gap-2 cursor-pointer"
            >
              <Pencil className="w-3.5 h-3.5 text-[#00C98A]" />
              <span>{editLabel}</span>
            </button>
          )}
          {onDuplicate && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onDuplicate();
              }}
              className="w-full px-3 py-1.5 text-left text-xs font-medium text-[#17243D] hover:bg-[#F0F5FA] flex items-center gap-2 cursor-pointer"
            >
              <Copy className="w-3.5 h-3.5 text-[#8FA4BF]" />
              <span>Duplikat</span>
            </button>
          )}
          {onMoveUp && (
            <button
              type="button"
              disabled={disableMoveUp}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onMoveUp();
              }}
              className="w-full px-3 py-1.5 text-left text-xs font-medium text-[#17243D] hover:bg-[#F0F5FA] disabled:opacity-35 flex items-center gap-2 cursor-pointer"
            >
              <ArrowUp className="w-3.5 h-3.5 text-[#8FA4BF]" />
              <span>Geser Naik</span>
            </button>
          )}
          {onMoveDown && (
            <button
              type="button"
              disabled={disableMoveDown}
              onClick={(e) => {
                e.stopPropagation();
                setOpen(false);
                onMoveDown();
              }}
              className="w-full px-3 py-1.5 text-left text-xs font-medium text-[#17243D] hover:bg-[#F0F5FA] disabled:opacity-35 flex items-center gap-2 cursor-pointer"
            >
              <ArrowDown className="w-3.5 h-3.5 text-[#8FA4BF]" />
              <span>Geser Turun</span>
            </button>
          )}
          {onDelete && (
            <button
              type="button"
              disabled={disableDelete}
              onClick={(e) => {
                e.stopPropagation();
                if (disableDelete) return;
                setOpen(false);
                onDelete();
              }}
              className="w-full px-3 py-1.5 text-left text-xs font-medium text-red-600 hover:bg-red-50 disabled:opacity-35 flex items-center gap-2 cursor-pointer border-t border-[#DCE5EF]/60 mt-0.5 pt-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Hapus</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export function LayoutWireframe({ mode }: { mode: BlockLayoutMode }) {
  if (mode === 'default') {
    return (
      <div className="w-full h-full flex flex-col justify-between gap-1 py-0.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex-1 rounded bg-[#17243D]/70 px-1.5 flex items-center gap-1.5"
          >
            <div className="w-3 h-3 rounded-xs bg-white/85 shrink-0" />
            <div className="flex-1 h-1 rounded-full bg-white/75" />
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'grid') {
    return (
      <div className="w-full h-full grid grid-cols-2 gap-1 py-0.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded bg-[#17243D]/70 flex items-center justify-center"
          >
            <div className="w-3.5 h-3.5 rounded-xs border border-white/75" />
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'large-image') {
    return (
      <div className="w-full h-full flex flex-col gap-1 py-0.5">
        <div className="flex-1 rounded bg-[#17243D]/70 flex flex-col justify-between p-1.5">
          <div className="flex-1 flex items-center justify-center">
            <div className="w-4 h-4 rounded-xs border border-white/75" />
          </div>
          <div className="h-1 w-3/4 rounded-full bg-white/80" />
        </div>
      </div>
    );
  }

  return (
    <div className="w-full h-full flex flex-col justify-center py-0.5">
      <div className="w-full h-full rounded bg-[#DCE5EF] p-1.5 flex flex-col justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-xs bg-white/95 shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="h-1 w-4/5 rounded-full bg-[#17243D]/70" />
            <div className="h-1 w-3/5 rounded-full bg-[#17243D]/40" />
          </div>
        </div>
        <div className="w-full py-0.5 rounded bg-[#17243D] text-[7px] font-bold text-white text-center leading-none">
          CTA
        </div>
      </div>
    </div>
  );
}
