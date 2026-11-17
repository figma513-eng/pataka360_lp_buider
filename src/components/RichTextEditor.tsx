import React, { useEffect, useRef, useState } from 'react';
import { Bold, Italic, Palette, RotateCcw } from 'lucide-react';
import { formatRichHtmlWithSpacing, sanitizeRichHtml } from '../utils/richTextHelpers';

interface RichTextEditorProps {
  value: string;
  placeholder?: string;
  defaultFontWeight?: 'normal' | 'bold';
  defaultFontStyle?: 'normal' | 'italic';
  textColor?: string;
  lineHeight?: number;
  paragraphGap?: number;
  onChangeHtml: (html: string) => void;
  onChangeStyle?: (patch: {
    defaultFontWeight?: 'normal' | 'bold';
    defaultFontStyle?: 'normal' | 'italic';
    textColor?: string;
    lineHeight?: number;
    paragraphGap?: number;
  }) => void;
  showStyleControls?: boolean;
}

const PRESET_TEXT_COLORS = [
  '#0F172A',
  '#475569',
  '#2563EB',
  '#059669',
  '#D97706',
  '#DC2626',
  '#7C3AED',
  '#FFFFFF',
];

export function RichTextEditor({
  value,
  placeholder = 'Tulis isi teks di sini... Blok/pilih kata untuk atur tebal, miring, atau warna teks.',
  defaultFontWeight = 'normal',
  defaultFontStyle = 'normal',
  textColor = '',
  lineHeight = 1.6,
  paragraphGap = 6,
  onChangeHtml,
  onChangeStyle,
  showStyleControls = true,
}: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const lastEmittedRef = useRef<string>('');
  const [selectionColor, setSelectionColor] = useState('#DC2626');

  // Sync external value into DOM only when it didn't originate from typing here
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    const formatted = sanitizeRichHtml(value);
    if (value !== lastEmittedRef.current && el.innerHTML !== formatted) {
      el.innerHTML = formatted;
      lastEmittedRef.current = value;
    }
  }, [value]);

  const captureSelection = () => {
    const el = editorRef.current;
    if (!el) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (el.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const restoreSelection = (): boolean => {
    const el = editorRef.current;
    if (!el) return false;
    el.focus();
    const sel = window.getSelection();
    if (!sel) return false;
    if (savedRangeRef.current && el.contains(savedRangeRef.current.commonAncestorContainer)) {
      sel.removeAllRanges();
      sel.addRange(savedRangeRef.current);
      return true;
    }
    return false;
  };

  const emitCurrent = () => {
    const el = editorRef.current;
    if (!el) return;
    const cleaned = sanitizeRichHtml(el.innerHTML);
    lastEmittedRef.current = cleaned;
    onChangeHtml(cleaned);
    captureSelection();
  };

  const applySelectionFormat = (mode: 'bold' | 'italic' | 'normal') => {
    const el = editorRef.current;
    if (!el) return;
    restoreSelection();

    const sel = window.getSelection();
    const hasSelectedText = Boolean(sel && !sel.isCollapsed && sel.toString().length > 0);

    if (!hasSelectedText && onChangeStyle) {
      if (mode === 'bold') {
        onChangeStyle({
          defaultFontWeight: defaultFontWeight === 'bold' ? 'normal' : 'bold',
        });
      } else if (mode === 'italic') {
        onChangeStyle({
          defaultFontStyle: defaultFontStyle === 'italic' ? 'normal' : 'italic',
        });
      } else {
        onChangeStyle({ defaultFontWeight: 'normal', defaultFontStyle: 'normal' });
      }
      return;
    }

    try {
      document.execCommand('styleWithCSS', false, 'false');
      if (mode === 'bold') {
        document.execCommand('bold', false);
      } else if (mode === 'italic') {
        document.execCommand('italic', false);
      } else {
        // Set back to Biasa (normal weight & style without losing line structure)
        if (document.queryCommandState('bold')) {
          document.execCommand('bold', false);
        }
        if (document.queryCommandState('italic')) {
          document.execCommand('italic', false);
        }
        document.execCommand('removeFormat', false);
      }
    } catch {
      // Fallback ignored if selection command unsupported
    }
    emitCurrent();
  };

  const applySelectionColor = (colorHex: string) => {
    setSelectionColor(colorHex);
    const el = editorRef.current;
    if (!el) return;
    restoreSelection();

    const sel = window.getSelection();
    const hasSelectedText = Boolean(sel && !sel.isCollapsed && sel.toString().length > 0);

    if (!hasSelectedText) {
      onChangeStyle?.({ textColor: colorHex });
      return;
    }

    try {
      document.execCommand('styleWithCSS', false, 'true');
      document.execCommand('foreColor', false, colorHex);
    } catch {
      // ignore
    }
    emitCurrent();
  };

  const isEmpty = !value || value === '<br>' || value === '<div><br></div>';

  return (
    <div className="space-y-2">
      {/* Toolbar Format Teks Pilihan */}
      <div className="p-1.5 rounded-lg border border-slate-200 bg-slate-50 space-y-1.5">
        <div className="flex flex-wrap items-center gap-1">
          <button
            type="button"
            title="Tebal (Bold) — blok teks dulu untuk sebagian kata, atau langsung klik untuk seluruh box"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applySelectionFormat('bold')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-bold border cursor-pointer transition-colors ${
              defaultFontWeight === 'bold'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Bold className="w-3 h-3" />
            <span>Tebal</span>
          </button>

          <button
            type="button"
            title="Biasa (Normal / Hapus Bold & Miring pada teks dipilih)"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applySelectionFormat('normal')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] font-medium border cursor-pointer transition-colors ${
              defaultFontWeight === 'normal' && defaultFontStyle === 'normal'
                ? 'bg-slate-800 text-white border-slate-800'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>Biasa</span>
          </button>

          <button
            type="button"
            title="Miring (Italic)"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => applySelectionFormat('italic')}
            className={`inline-flex items-center gap-1 px-2 py-1 rounded text-[11px] italic border cursor-pointer transition-colors ${
              defaultFontStyle === 'italic'
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <Italic className="w-3 h-3" />
            <span>Miring</span>
          </button>

          <div className="h-4 w-px bg-slate-200 mx-0.5" />

          {/* Warna Teks yang Dipilih */}
          <label
            title="Pilih warna untuk teks yang sedang diblok (atau warna teks box)"
            onMouseDown={captureSelection}
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-white hover:bg-slate-100 cursor-pointer"
          >
            <Palette className="w-3 h-3 text-slate-600" />
            <input
              type="color"
              value={selectionColor}
              onChange={(e) => applySelectionColor(e.target.value)}
              className="w-4 h-4 p-0 border-0 bg-transparent cursor-pointer"
            />
            <span className="text-[10.5px] font-medium text-slate-600">Warna</span>
          </label>
        </div>

        {/* Preset Swatch Warna Cepat */}
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-[10px] text-slate-500 mr-0.5">Cepat:</span>
          {PRESET_TEXT_COLORS.map((col) => (
            <button
              key={col}
              type="button"
              title={`Ubah warna ke ${col}`}
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => applySelectionColor(col)}
              style={{ backgroundColor: col }}
              className="w-4 h-4 rounded-full border border-slate-300 cursor-pointer hover:scale-110 transition-transform"
            />
          ))}
          {textColor && onChangeStyle && (
            <button
              type="button"
              title="Reset ke warna teks tema"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => onChangeStyle({ textColor: '' })}
              className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] text-slate-600 hover:bg-slate-100 cursor-pointer ml-auto"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Ikuti Tema</span>
            </button>
          )}
        </div>
      </div>

      {/* Area Ketik ContentEditable */}
      <div className="relative rounded-lg border border-slate-200 bg-white focus-within:border-emerald-500">
        {isEmpty && (
          <div className="pointer-events-none absolute inset-x-2.5 top-2 text-[11px] text-slate-400 leading-snug">
            {placeholder}
          </div>
        )}
        <div
          ref={editorRef}
          contentEditable
          suppressContentEditableWarning
          onInput={emitCurrent}
          onMouseUp={captureSelection}
          onKeyUp={captureSelection}
          onBlur={captureSelection}
          style={{
            fontWeight: defaultFontWeight === 'bold' ? 700 : 400,
            fontStyle: defaultFontStyle === 'italic' ? 'italic' : 'normal',
            lineHeight,
            color: textColor || '#1E293B',
          }}
          className="min-h-[84px] max-h-[220px] overflow-y-auto px-2.5 py-2 text-xs outline-none [&_div]:min-h-[1em]"
        />
      </div>

      {/* Jarak Baris & Enter Spasi */}
      {showStyleControls && onChangeStyle && (
        <div className="grid grid-cols-2 gap-1.5">
          <div>
            <label className="block text-[10.5px] font-medium text-slate-600 mb-0.5">
              Jarak Antar Baris ({lineHeight.toFixed(1)})
            </label>
            <select
              value={String(lineHeight)}
              onChange={(e) => onChangeStyle({ lineHeight: Number(e.target.value) })}
              className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-emerald-500"
            >
              <option value="1.3">Rapat (1.3)</option>
              <option value="1.5">Standar (1.5)</option>
              <option value="1.6">Nyaman (1.6)</option>
              <option value="1.8">Lega (1.8)</option>
              <option value="2.1">Sangat Lega (2.1)</option>
              <option value="2.4">Ekstra (2.4)</option>
            </select>
          </div>
          <div>
            <label className="block text-[10.5px] font-medium text-slate-600 mb-0.5">
              Jarak Enter / Spasi ({paragraphGap}px)
            </label>
            <select
              value={String(paragraphGap)}
              onChange={(e) => onChangeStyle({ paragraphGap: Number(e.target.value) })}
              className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-emerald-500"
            >
              <option value="0">0px (Menyatu)</option>
              <option value="4">4px (Sedikit)</option>
              <option value="8">8px (Sedang)</option>
              <option value="14">14px (Jauh)</option>
              <option value="20">20px (Sangat Jauh)</option>
              <option value="28">28px (Ekstra)</option>
            </select>
          </div>
        </div>
      )}

      {/* Preview mini live spasi enter jika paragraphGap > 0 */}
      {showStyleControls && paragraphGap > 0 && !isEmpty && (
        <div className="px-2 py-1.5 rounded bg-slate-50 border border-slate-200/70">
          <div className="text-[10px] font-medium text-slate-400 mb-1">
            Pratinjau hasil jarak &amp; warna:
          </div>
          <div
            style={{
              fontWeight: defaultFontWeight === 'bold' ? 700 : 400,
              fontStyle: defaultFontStyle === 'italic' ? 'italic' : 'normal',
              lineHeight,
              color: textColor || '#1E293B',
            }}
            className="text-[11px]"
            dangerouslySetInnerHTML={{
              __html: formatRichHtmlWithSpacing(value, paragraphGap),
            }}
          />
        </div>
      )}
    </div>
  );
}
