import React, { useMemo, useState } from 'react';
import { Link2, Search, X } from 'lucide-react';
import { ButtonIconId } from '../types/builder';
import { BUTTON_ICON_LIST, sanitizeIconUrl } from '../utils/buttonIcons';
import { ButtonGlyph } from './ButtonIcon';

interface IconPickerProps {
  selectedIcon: ButtonIconId;
  iconUrl?: string;
  allowNone?: boolean;
  accentVariant?: 'blue' | 'emerald';
  onSelectIcon: (icon: ButtonIconId) => void;
  onChangeIconUrl: (url: string) => void;
}

export function IconPicker({
  selectedIcon,
  iconUrl = '',
  allowNone = true,
  accentVariant = 'blue',
  onSelectIcon,
  onChangeIconUrl,
}: IconPickerProps) {
  const [query, setQuery] = useState('');

  const icons = useMemo(() => {
    const base = allowNone ? BUTTON_ICON_LIST : BUTTON_ICON_LIST.filter((ic) => ic.id !== 'none');
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter(
      (ic) => ic.label.toLowerCase().includes(q) || ic.id.toLowerCase().includes(q)
    );
  }, [allowNone, query]);

  const activeCls =
    accentVariant === 'emerald'
      ? 'bg-emerald-600 text-white border-emerald-600'
      : 'bg-blue-600 text-white border-blue-600';

  const focusBorderCls =
    accentVariant === 'emerald' ? 'focus:border-emerald-500' : 'focus:border-blue-500';

  const hasCustomUrl = Boolean(sanitizeIconUrl(iconUrl));

  return (
    <div className="space-y-2">
      {/* Pencarian ikon cepat */}
      <div className="relative">
        <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Cari ikon (mis. chat, wa, toko, promo)..."
          className={`w-full pl-8 pr-7 py-1 text-[11px] rounded-lg border border-slate-200 bg-white outline-none ${focusBorderCls}`}
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery('')}
            aria-label="Hapus pencarian"
            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
          >
            <X className="w-3 h-3" />
          </button>
        )}
      </div>

      {/* Grid Ikon */}
      <div className="grid grid-cols-4 gap-1 max-h-[176px] overflow-y-auto pr-0.5">
        {icons.map((ic) => {
          const isActive = !hasCustomUrl && selectedIcon === ic.id;
          return (
            <button
              key={ic.id}
              type="button"
              onClick={() => {
                if (hasCustomUrl) onChangeIconUrl('');
                onSelectIcon(ic.id);
              }}
              className={`flex flex-col items-center justify-center gap-0.5 py-1.5 px-1 rounded-lg border text-[10px] font-medium transition-colors cursor-pointer ${
                isActive ? activeCls : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
            >
              {ic.id === 'none' ? (
                <span className="h-3.5 leading-3.5 text-[11px] font-bold">—</span>
              ) : (
                <ButtonGlyph icon={ic.id} className="w-3.5 h-3.5" />
              )}
              <span className="truncate max-w-full">{ic.label}</span>
            </button>
          );
        })}
        {icons.length === 0 && (
          <div className="col-span-4 py-3 text-center text-[11px] text-slate-400">
            Ikon tidak ditemukan
          </div>
        )}
      </div>

      {/* Link Ikon Kustom (URL gambar / SVG) */}
      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5">
        <div className="flex items-center justify-between gap-2">
          <label className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-700">
            <Link2 className="w-3 h-3 text-slate-500" />
            <span>Link Ikon Kustom (URL)</span>
          </label>
          {iconUrl.trim() && (
            <button
              type="button"
              onClick={() => onChangeIconUrl('')}
              className="text-[10.5px] font-semibold text-red-600 hover:underline cursor-pointer"
            >
              Hapus Link
            </button>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          {hasCustomUrl && (
            <span className="w-7 h-7 rounded-md border border-slate-200 bg-white flex items-center justify-center shrink-0 p-1">
              <ButtonGlyph icon="info" iconUrl={iconUrl} className="w-4 h-4" />
            </span>
          )}
          <input
            type="url"
            value={iconUrl}
            onChange={(e) => onChangeIconUrl(e.target.value)}
            placeholder="https://.../icon.png atau .svg"
            className={`flex-1 min-w-0 px-2 py-1 text-[11px] rounded-md border border-slate-200 bg-white outline-none ${focusBorderCls}`}
          />
        </div>
      </div>
    </div>
  );
}
