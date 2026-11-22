import React, { useMemo, useState } from 'react';
import { Search, X } from 'lucide-react';
import { ButtonIconId } from '../types/builder';
import {
  BUTTON_ICON_CATEGORIES,
  BUTTON_ICON_LIST,
  ButtonIconCategory,
  getButtonIconCategory,
  sanitizeIconUrl,
} from '../utils/buttonIcons';
import { ButtonGlyph } from './ButtonIcon';
import { MediaSourceInput } from './inspector/InspectorPrimitives';

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
  accentVariant = 'emerald',
  onSelectIcon,
  onChangeIconUrl,
}: IconPickerProps) {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ButtonIconCategory>('Semua');

  const icons = useMemo(() => {
    const base = allowNone ? BUTTON_ICON_LIST : BUTTON_ICON_LIST.filter((ic) => ic.id !== 'none');
    const q = query.trim().toLowerCase();
    return base.filter((ic) => {
      if (category !== 'Semua' && ic.id !== 'none' && getButtonIconCategory(ic.id) !== category) {
        return false;
      }
      if (!q) return true;
      return ic.label.toLowerCase().includes(q) || ic.id.toLowerCase().includes(q);
    });
  }, [allowNone, query, category]);

  const activeCls =
    accentVariant === 'emerald'
      ? 'bg-[#17243D] text-white border-[#17243D]'
      : 'bg-blue-600 text-white border-blue-600';

  const focusBorderCls =
    accentVariant === 'emerald' ? 'focus:border-[#00C98A]' : 'focus:border-blue-500';

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

      {/* Filter Kategori Ikon */}
      <div className="flex flex-wrap gap-1">
        {BUTTON_ICON_CATEGORIES.map((cat) => {
          const isCatActive = category === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setCategory(cat)}
              className={`px-2 py-0.5 rounded-md text-[9.5px] font-semibold border transition-colors cursor-pointer ${
                isCatActive
                  ? 'bg-[#ECFDF6] border-[#00C98A] text-[#008F63]'
                  : 'bg-white border-slate-200 text-slate-500 hover:border-slate-300 hover:text-slate-700'
              }`}
            >
              {cat}
            </button>
          );
        })}
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

      {/* Upload / Link Ikon Kustom (WebP / SVG dengan preview & simpan) */}
      <div className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-1">
        <MediaSourceInput
          label="Ikon Kustom (Upload / URL SVG & Gambar)"
          value={iconUrl}
          placeholder="https://.../icon.svg atau .png"
          onChangeUrl={(nextUrl) => onChangeIconUrl(nextUrl)}
          onSavePreparedUrl={(url) => onChangeIconUrl(url)}
          onClear={iconUrl.trim() ? () => onChangeIconUrl('') : undefined}
        />
      </div>
    </div>
  );
}
