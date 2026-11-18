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
  id: _id,
  title,
  icon,
  badge,
  isOpen,
  onToggle,
  children,
}: {
  id: string;
  title: string;
  icon?: React.ReactNode;
  badge?: string | number;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-xl border transition-all ${
        isOpen
          ? 'border-[#00C98A]/70 bg-white shadow-xs overflow-hidden'
          : 'border-[#DCE5EF] bg-white shadow-2xs hover:border-[#00C98A]'
      }`}
    >
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isOpen}
        className={`w-full px-3 py-2.5 flex items-center justify-between gap-2.5 text-left transition-colors cursor-pointer ${
          isOpen
            ? 'bg-[#ECFDF6]/70 border-b border-[#DCE5EF] text-[#17243D]'
            : 'bg-white hover:bg-[#F7FBFD] text-[#17243D] rounded-xl'
        }`}
      >
        <div className="flex items-center gap-2 min-w-0">
          {icon && (
            <span
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                isOpen
                  ? 'bg-[#00C98A] text-white'
                  : 'bg-[#F0F5FA] text-[#51637D]'
              }`}
            >
              {icon}
            </span>
          )}
          <span className="text-[12.5px] font-semibold text-[#17243D] truncate">
            {title}
          </span>
          {badge !== undefined && badge !== '' && (
            <span className="px-1.5 py-0.5 rounded-md bg-[#F0F5FA] border border-[#DCE5EF] text-[10px] font-semibold text-[#51637D] tabular-nums shrink-0">
              {badge}
            </span>
          )}
        </div>
        <span
          className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
            isOpen ? 'bg-[#17243D] text-white' : 'bg-[#F0F5FA] text-[#51637D]'
          }`}
        >
          <ChevronDown
            className={`w-3.5 h-3.5 transition-transform duration-150 ${
              isOpen ? 'rotate-180' : ''
            }`}
          />
        </span>
      </button>
      {isOpen && <div className="p-3 space-y-3 bg-white">{children}</div>}
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
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer ${
        checked ? 'bg-[#00C98A]' : 'bg-[#DCE5EF]'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
          checked ? 'translate-x-4.5' : 'translate-x-0.5'
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
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium text-[#17243D]">{label}</span>
        <span className="font-mono text-[11px] font-semibold text-[#17243D] bg-[#F0F5FA] border border-[#DCE5EF] px-1.5 py-0.5 rounded tabular-nums">
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
        className="w-full accent-[#00C98A] cursor-pointer"
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
      className="grid gap-1 p-1 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]"
      style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
    >
      {options.map((opt) => {
        const active = value === opt.id;
        return (
          <button
            key={opt.id}
            type="button"
            onClick={() => onChange(opt.id)}
            className={`py-1.5 px-2 rounded-md text-[11px] font-semibold transition-colors cursor-pointer truncate flex items-center justify-center gap-1 ${
              active
                ? 'bg-[#17243D] text-white shadow-2xs'
                : 'text-[#17243D]/75 hover:text-[#17243D] hover:bg-white/70'
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
    <div className="px-3 py-2.5 rounded-lg bg-[#F0F5FA]/70 border border-dashed border-[#DCE5EF] text-[11px] text-[#8FA4BF] leading-relaxed">
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
  onClear,
}: {
  label?: string;
  value?: string;
  placeholder?: string;
  previewFallback?: string;
  uploading?: boolean;
  onChangeUrl: (nextUrl: string) => void;
  onUploadFile: (file: File) => void;
  onClear?: () => void;
}) {
  const isEmbedded = Boolean(value && value.startsWith('data:'));
  const isSvgPlaceholder = Boolean(value && value.startsWith('data:image/svg+xml'));
  const displaySrc = value || previewFallback || '';

  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-[11px] font-semibold text-[#17243D]">{label}</label>
      )}
      <div className="flex items-center gap-2">
        {displaySrc && (
          <div className="w-10 h-10 rounded-lg border border-[#DCE5EF] bg-[#F0F5FA] overflow-hidden shrink-0 flex items-center justify-center">
            <img
              src={displaySrc}
              alt="Preview"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
          </div>
        )}
        <div className="flex-1 min-w-0 flex items-center gap-1.5">
          <input
            type="url"
            value={isEmbedded ? '' : value ?? ''}
            placeholder={
              isEmbedded && !isSvgPlaceholder ? 'Gambar terunggah (isi URL untuk ganti)' : placeholder
            }
            onChange={(e) => onChangeUrl(e.target.value)}
            className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white text-[#17243D] outline-none focus:border-[#00C98A]"
          />
          <label
            title="Upload gambar dari perangkat"
            className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#DCE5EF] bg-[#F0F5FA] hover:bg-[#DCE5EF]/50 text-[11px] font-semibold text-[#17243D] cursor-pointer shrink-0 transition-colors"
          >
            <Upload className="w-3.5 h-3.5 text-[#00C98A]" />
            <span>{uploading ? '...' : 'Upload'}</span>
            <input
              type="file"
              accept="image/*"
              disabled={uploading}
              onChange={(e) => {
                const file = e.target.files?.[0];
                e.target.value = '';
                if (file) onUploadFile(file);
              }}
              className="hidden"
            />
          </label>
          {onClear && value && (
            <button
              type="button"
              onClick={onClear}
              title="Hapus gambar"
              className="p-1.5 rounded-lg border border-[#DCE5EF] bg-white text-[#8FA4BF] hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>
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
    <div ref={menuRef} className="relative shrink-0">
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
              onClick={() => {
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
              onClick={() => {
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
              onClick={() => {
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
              onClick={() => {
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
              onClick={() => {
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
