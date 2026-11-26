import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronRight,
  MessageCircle,
  ShoppingCart,
  X,
} from 'lucide-react';
import type { BlockContent, MixRasaFlavorItem, PageTheme } from '../types/builder';

export interface MixRasaCartPayload {
  itemId: string;
  title: string;
  variant: string;
  price: string;
  unitPrice: number;
  image: string;
  flavors: string[];
  sliceCount: 2 | 3 | 4;
  productSize: string;
}

export function parseMixRasaPrice(raw?: string | number): number {
  if (typeof raw === 'number' && Number.isFinite(raw)) return Math.max(0, Math.round(raw));
  const digits = String(raw || '').replace(/[^\d]/g, '');
  const parsed = Number(digits);
  return Number.isFinite(parsed) ? parsed : 0;
}

export function formatMixRasaRp(amount: number): string {
  const safe = Math.max(0, Math.round(Number.isFinite(amount) ? amount : 0));
  return 'Rp' + safe.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

export function buildMixRasaProductLabel(title?: string, productSize?: string): string {
  const cleanTitle = (title || 'Pizza Mix Rasa').trim() || 'Pizza Mix Rasa';
  const cleanSize = (productSize || '').trim();
  if (!cleanSize) return cleanTitle;
  if (cleanTitle.toLowerCase().includes(cleanSize.toLowerCase())) return cleanTitle;
  const titleFirstWord = cleanTitle.split(/\s+/)[0]?.toLowerCase() || '';
  const sizeParts = cleanSize.split(/\s+/);
  if (
    titleFirstWord &&
    sizeParts.length > 1 &&
    sizeParts[0].toLowerCase() === titleFirstWord
  ) {
    return `${cleanTitle} ${sizeParts.slice(1).join(' ')}`.trim();
  }
  return `${cleanTitle} ${cleanSize}`.trim();
}

export function normalizeMixRasaPhone(raw?: string): string {
  const digits = String(raw || '').replace(/[^\d]/g, '');
  if (!digits) return '6281234567890';
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  return digits;
}

export function buildMixRasaWaMessage(params: {
  title?: string;
  productSize?: string;
  selectedFlavors: MixRasaFlavorItem[];
  totalAmount: number;
  qty?: number;
  intro?: string;
  includeDetails?: boolean;
}): string {
  const intro = (params.intro ?? 'Halo, saya ingin memesan:').trim() || 'Halo, saya ingin memesan:';
  if (params.includeDetails === false) {
    return intro;
  }
  const productLabel = buildMixRasaProductLabel(params.title, params.productSize);
  const flavorLines = params.selectedFlavors
    .map((f, idx) => `${idx + 1}. ${f.name || `Rasa ${idx + 1}`}`)
    .join('\n');
  const qty = Math.max(1, Math.round(params.qty ?? 1));
  return [
    intro,
    '',
    `Produk: ${productLabel}`,
    '',
    'Kombinasi Rasa:',
    flavorLines,
    '',
    `Jumlah: ${qty}`,
    `Total: ${formatMixRasaRp(params.totalAmount)}`,
    '',
    'Mohon informasi pemesanannya. Terima kasih.',
  ].join('\n');
}

export function buildMixRasaWaUrl(params: {
  phone?: string;
  title?: string;
  productSize?: string;
  selectedFlavors: MixRasaFlavorItem[];
  totalAmount: number;
  qty?: number;
  intro?: string;
  includeDetails?: boolean;
}): string {
  const cleanPhone = normalizeMixRasaPhone(params.phone);
  const message = buildMixRasaWaMessage(params);
  return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(message)}`;
}

export function buildMixRasaCartPayload(params: {
  title?: string;
  productSize?: string;
  sliceCount: 2 | 3 | 4;
  selectedFlavors: MixRasaFlavorItem[];
  totalAmount: number;
}): MixRasaCartPayload {
  const productLabel = buildMixRasaProductLabel(params.title, params.productSize);
  const flavorNames = params.selectedFlavors.map((f, idx) => f.name || `Rasa ${idx + 1}`);
  const idSig = params.selectedFlavors.map((f) => f.id).join('_');
  const sizePart = (params.productSize || '').trim();
  const numberedFlavors = flavorNames.map((n, i) => `${i + 1}. ${n}`).join(', ');
  const variant = sizePart
    ? `${numberedFlavors} · ${params.sliceCount} Bagian · ${sizePart}`
    : `${numberedFlavors} · ${params.sliceCount} Bagian`;

  return {
    itemId: `mix_${params.sliceCount}_${idSig}`,
    title: productLabel,
    variant,
    price: formatMixRasaRp(params.totalAmount),
    unitPrice: params.totalAmount,
    image: params.selectedFlavors[0]?.image || '',
    flavors: flavorNames,
    sliceCount: params.sliceCount,
    productSize: sizePart || 'Standar',
  };
}

export function getMixRasaSliceClipPath(sliceCount: 2 | 3 | 4, idx: number): string {
  if (sliceCount === 2) {
    return idx === 0 ? 'inset(0 50% 0 0)' : 'inset(0 0 0 50%)';
  }
  if (sliceCount === 3) {
    if (idx === 0) return 'polygon(50% 50%, 50% -150%, 223.2% -150%, 223.2% 150%)';
    if (idx === 1) return 'polygon(50% 50%, 223.2% 150%, 50% 250%, -123.2% 150%)';
    return 'polygon(50% 50%, -123.2% 150%, -123.2% -150%, 50% -150%)';
  }
  if (idx === 0) return 'inset(0 50% 50% 0)';
  if (idx === 1) return 'inset(0 0 50% 50%)';
  if (idx === 2) return 'inset(50% 50% 0 0)';
  return 'inset(50% 0 0 50%)';
}

export function getMixRasaSlotLabel(sliceCount: 2 | 3 | 4, idx: number): string {
  if (sliceCount === 2) return idx === 0 ? 'Bagian Kiri' : 'Bagian Kanan';
  return `Bagian ${idx + 1}`;
}

interface MixRasaConfiguratorProps {
  blockId: string;
  content: BlockContent;
  theme: PageTheme;
  borderRadius?: number;
  isEditor?: boolean;
  onAddMixToCart?: (payload: MixRasaCartPayload) => void;
  onBackClick?: () => void;
}

function CircularSplitPreview({
  selectedFlavors,
  sliceCount,
  sizeClass,
  sizePx,
  dividerWidth = 3,
  interactive = false,
  activePickerSlot = null,
  onSelectSlot,
}: {
  selectedFlavors: MixRasaFlavorItem[];
  sliceCount: 2 | 3 | 4;
  sizeClass?: string;
  sizePx?: number;
  dividerWidth?: number;
  interactive?: boolean;
  activePickerSlot?: number | null;
  onSelectSlot?: (idx: number) => void;
}) {
  return (
    <div
      className={`relative rounded-full overflow-hidden shrink-0 ${sizeClass || ''}`}
      style={{
        ...(sizePx
          ? {
              width: `min(${sizePx}px, 72vw)`,
              height: `min(${sizePx}px, 72vw)`,
            }
          : {}),
        boxShadow:
          dividerWidth >= 3
            ? '0 14px 32px -10px rgba(15, 23, 42, 0.24), 0 4px 12px rgba(15, 23, 42, 0.08)'
            : '0 4px 10px -2px rgba(15, 23, 42, 0.16)',
        backgroundColor: '#F8FAFC',
      }}
    >
      {selectedFlavors.map((flavor, idx) => {
        const clipPath = getMixRasaSliceClipPath(sliceCount, idx);
        const isActive = activePickerSlot === idx;
        const scale = Math.max(50, Math.min(200, Number(flavor.imageScale ?? 100))) / 100;
        return (
          <div
            key={`${idx}_${flavor.id}`}
            onClick={
              interactive && onSelectSlot
                ? (e) => {
                    e.stopPropagation();
                    onSelectSlot(idx);
                  }
                : undefined
            }
            role={interactive ? 'button' : undefined}
            aria-label={interactive ? `Pilih rasa ${getMixRasaSlotLabel(sliceCount, idx)}` : undefined}
            className={`absolute inset-0 transition-opacity duration-200 ${
              interactive ? 'cursor-pointer' : ''
            }`}
            style={{
              clipPath,
              WebkitClipPath: clipPath,
              filter: isActive ? 'brightness(1.06)' : undefined,
            }}
          >
            {flavor.image ? (
              <img
                src={flavor.image}
                alt={flavor.name}
                referrerPolicy="no-referrer"
                draggable={false}
                className="w-full h-full object-cover select-none transition-transform duration-200"
                style={
                  scale !== 1
                    ? { transform: `scale(${scale})`, transformOrigin: 'center center' }
                    : undefined
                }
              />
            ) : (
              <div
                className="w-full h-full flex items-center justify-center text-white text-xs font-bold"
                style={{ backgroundColor: flavor.accentColor || '#EA6314' }}
              >
                {flavor.name.slice(0, 2).toUpperCase()}
              </div>
            )}
          </div>
        );
      })}

      {/* Crisp white radial slice seams */}
      <svg
        viewBox="0 0 200 200"
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 w-full h-full"
      >
        {sliceCount === 2 && (
          <line
            x1="100"
            y1="0"
            x2="100"
            y2="200"
            stroke="#FFFFFF"
            strokeWidth={dividerWidth}
          />
        )}
        {sliceCount === 3 && (
          <>
            <line x1="100" y1="100" x2="100" y2="0" stroke="#FFFFFF" strokeWidth={dividerWidth} />
            <line x1="100" y1="100" x2="186.6" y2="150" stroke="#FFFFFF" strokeWidth={dividerWidth} />
            <line x1="100" y1="100" x2="13.4" y2="150" stroke="#FFFFFF" strokeWidth={dividerWidth} />
          </>
        )}
        {sliceCount === 4 && (
          <>
            <line x1="100" y1="0" x2="100" y2="200" stroke="#FFFFFF" strokeWidth={dividerWidth} />
            <line x1="0" y1="100" x2="200" y2="100" stroke="#FFFFFF" strokeWidth={dividerWidth} />
          </>
        )}
      </svg>
    </div>
  );
}

export function MixRasaConfigurator({
  blockId,
  content,
  theme,
  borderRadius = 24,
  isEditor = false,
  onAddMixToCart,
  onBackClick,
}: MixRasaConfiguratorProps) {
  const flavors = useMemo(
    () => (Array.isArray(content.mixRasaFlavors) ? content.mixRasaFlavors : []),
    [content.mixRasaFlavors]
  );
  const defaultSliceCount: 2 | 3 | 4 =
    content.mixRasaSliceCount === 3 || content.mixRasaSliceCount === 4
      ? content.mixRasaSliceCount
      : 2;
  const allowSliceSwitch = content.mixRasaAllowSliceSwitch !== false;
  const [activeSliceCount, setActiveSliceCount] = useState<2 | 3 | 4>(defaultSliceCount);

  useEffect(() => {
    setActiveSliceCount(defaultSliceCount);
  }, [defaultSliceCount]);

  const sliceCount: 2 | 3 | 4 = allowSliceSwitch ? activeSliceCount : defaultSliceCount;

  const title = (content.mixRasaTitle || 'Pizza Mix Rasa').trim() || 'Pizza Mix Rasa';
  const showProductSize = content.mixRasaShowProductSize !== false;
  const productSize = (content.mixRasaProductSize || 'Pizza 35 cm').trim() || 'Pizza 35 cm';
  const effectiveProductSize = showProductSize ? productSize : '';
  const showDescription = Boolean(content.mixRasaShowDescription);
  const descriptionText = (content.mixRasaDescription || '').trim();
  const previewSize = Math.max(150, Math.min(320, Number(content.mixRasaPreviewSize ?? 232)));
  const showBackButton = content.mixRasaShowBackButton !== false;
  const centerHeader = Boolean(content.mixRasaCenterHeader);
  const cardBg = content.mixRasaBgColor || '#FFFFFF';
  const accentColor = content.mixRasaAccentColor || '#EA6314';

  const floatingCartEnabled = content.mixRasaFloatingCartEnabled !== false;
  const cartButtonLabel = (content.mixRasaCartButtonLabel || 'Gabungkan Rasa').trim() || 'Gabungkan Rasa';
  const cartButtonBg = content.mixRasaFloatingCartBg || accentColor;

  const waEnabled = Boolean(content.mixRasaWaEnabled);
  const waLabel = (content.mixRasaWaLabel || 'Pesan via WhatsApp').trim() || 'Pesan via WhatsApp';
  const waNumber = content.mixRasaWaNumber || content.catalogWhatsappNumber || '6281234567890';
  const waIntro = content.mixRasaWaIntro ?? 'Halo, saya ingin memesan:';
  const waIncludeDetails = content.mixRasaWaIncludeDetails !== false;

  const defaultSelectionIds = useMemo(() => {
    const raw = Array.isArray(content.mixRasaDefaultSelectionIds)
      ? content.mixRasaDefaultSelectionIds
      : [];
    const out: string[] = [];
    for (let i = 0; i < sliceCount; i++) {
      const candidate = raw[i];
      if (candidate && flavors.some((f) => f.id === candidate)) {
        out.push(candidate);
      } else if (flavors.length > 0) {
        out.push(flavors[i % flavors.length].id);
      }
    }
    return out;
  }, [content.mixRasaDefaultSelectionIds, flavors, sliceCount]);

  const [selectedIds, setSelectedIds] = useState<string[]>(defaultSelectionIds);
  const [pickerSlotIdx, setPickerSlotIdx] = useState<number | null>(null);
  const [justAdded, setJustAdded] = useState(false);

  // Sync when slice count or flavor list changes in Inspector
  useEffect(() => {
    setSelectedIds((prev) => {
      if (flavors.length === 0) return [];
      const next: string[] = [];
      for (let i = 0; i < sliceCount; i++) {
        const existing = prev[i];
        if (existing && flavors.some((f) => f.id === existing)) {
          next.push(existing);
        } else {
          next.push(defaultSelectionIds[i] || flavors[i % flavors.length].id);
        }
      }
      return next;
    });
    setPickerSlotIdx((cur) => (cur !== null && cur >= sliceCount ? null : cur));
  }, [sliceCount, flavors, defaultSelectionIds]);

  const selectedFlavors: MixRasaFlavorItem[] = useMemo(() => {
    if (flavors.length === 0) return [];
    const out: MixRasaFlavorItem[] = [];
    for (let i = 0; i < sliceCount; i++) {
      const id = selectedIds[i];
      const match = flavors.find((f) => f.id === id) || flavors[i % flavors.length];
      out.push(match);
    }
    return out;
  }, [flavors, selectedIds, sliceCount]);

  const totalAmount = useMemo(
    () => selectedFlavors.reduce((sum, f) => sum + parseMixRasaPrice(f.price), 0),
    [selectedFlavors]
  );

  const combinedNamesText = selectedFlavors.map((f) => f.name).join(' + ');

  const waUrl = useMemo(
    () =>
      buildMixRasaWaUrl({
        phone: waNumber,
        title,
        productSize: effectiveProductSize,
        selectedFlavors,
        totalAmount,
        qty: 1,
        intro: waIntro,
        includeDetails: waIncludeDetails,
      }),
    [waNumber, title, effectiveProductSize, selectedFlavors, totalAmount, waIntro, waIncludeDetails]
  );

  const handleChooseFlavor = (slotIdx: number, flavorId: string) => {
    setSelectedIds((prev) => {
      const next = [...prev];
      while (next.length < sliceCount) {
        next.push(flavors[next.length % flavors.length]?.id || '');
      }
      next[slotIdx] = flavorId;
      return next;
    });
    setPickerSlotIdx(null);
  };

  const handleAddToCart = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (selectedFlavors.length === 0) return;
    const payload = buildMixRasaCartPayload({
      title,
      productSize: effectiveProductSize,
      sliceCount,
      selectedFlavors,
      totalAmount,
    });
    onAddMixToCart?.(payload);
    setJustAdded(true);
    window.setTimeout(() => setJustAdded(false), 1400);
  };

  if (flavors.length === 0) {
    return (
      <div
        className="w-full p-6 text-center border border-dashed border-slate-300 bg-white"
        style={{ borderRadius: `${borderRadius}px` }}
      >
        <p className="text-sm font-bold text-slate-700">Mix Rasa</p>
        <p className="text-xs text-slate-500 mt-1">
          Tambahkan minimal 1 pilihan rasa melalui Inspector.
        </p>
      </div>
    );
  }

  return (
    <div
      data-mix-rasa-root={blockId}
      className="relative w-full overflow-hidden select-none"
      style={{
        backgroundColor: cardBg,
        borderRadius: `${borderRadius}px`,
        color: '#0F172A',
        fontFamily: theme.fontFamily || 'inherit',
      }}
    >
      <div className="px-4 pt-4 pb-5 flex flex-col gap-4">
        {/* Header Bar: Optional Back Button + Left/Center Title & Subtitle */}
        <div
          data-canvas-sublayer="mr_header"
          className={`relative flex items-center min-h-[40px] ${
            centerHeader ? 'justify-center' : 'justify-start gap-2.5'
          }`}
        >
          {showBackButton && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                onBackClick?.();
              }}
              aria-label="Kembali"
              className={`${
                centerHeader ? 'absolute left-0 top-1/2 -translate-y-1/2' : ''
              } w-8 h-8 rounded-full flex items-center justify-center text-slate-800 hover:bg-slate-100 transition-colors cursor-pointer shrink-0`}
            >
              <ArrowLeft className="w-4 h-4" strokeWidth={2.2} />
            </button>
          )}
          <div
            className={`min-w-0 ${
              centerHeader
                ? `text-center w-full ${showBackButton ? 'px-10' : 'px-2'}`
                : 'text-left flex-1'
            }`}
          >
            <h3 className="text-[16px] font-extrabold leading-tight tracking-tight text-slate-900 truncate">
              {title}
            </h3>
            {showProductSize && (
              <p className="text-[11.5px] font-medium text-slate-500 mt-0.5 truncate">
                {productSize} ({sliceCount} Rasa)
              </p>
            )}
          </div>
        </div>

        {/* Keterangan Produk (Opsional via Toggle) */}
        {showDescription && descriptionText && (
          <p
            className={`text-[12px] leading-relaxed text-slate-600 -mt-1.5 whitespace-pre-line ${
              centerHeader ? 'text-center px-1' : 'text-left'
            }`}
          >
            {descriptionText}
          </p>
        )}

        {/* Pilihan Jumlah Rasa (2 Rasa / 3 Rasa / 4 Rasa) */}
        {allowSliceSwitch && (
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-xl bg-slate-100/90 border border-slate-200/70">
            {([2, 3, 4] as const).map((cnt) => {
              const active = sliceCount === cnt;
              return (
                <button
                  key={cnt}
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveSliceCount(cnt);
                    setPickerSlotIdx(null);
                  }}
                  className="py-1.5 rounded-lg text-[11.5px] font-bold transition-all cursor-pointer"
                  style={
                    active
                      ? {
                          backgroundColor: accentColor,
                          color: '#FFFFFF',
                          boxShadow: `0 4px 10px -4px ${accentColor}99`,
                        }
                      : {
                          backgroundColor: 'transparent',
                          color: '#475569',
                        }
                  }
                >
                  {cnt} Rasa
                </button>
              );
            })}
          </div>
        )}

        {/* Live Split Circular Product Preview */}
        <div
          data-canvas-sublayer="mr_preview"
          className="w-full flex items-center justify-center py-1"
        >
          <CircularSplitPreview
            selectedFlavors={selectedFlavors}
            sliceCount={sliceCount}
            sizePx={previewSize}
            dividerWidth={3.5}
            interactive
            activePickerSlot={pickerSlotIdx}
            onSelectSlot={(idx) => setPickerSlotIdx((cur) => (cur === idx ? null : idx))}
          />
        </div>

        {/* Flavor Slot Selector Cards */}
        <div
          data-canvas-sublayer="mr_slots"
          className={`grid gap-2.5 ${
            sliceCount === 3 ? 'grid-cols-3' : 'grid-cols-2'
          }`}
        >
          {selectedFlavors.map((flavor, idx) => {
            const isPicking = pickerSlotIdx === idx;
            return (
              <button
                key={`slot_${idx}`}
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setPickerSlotIdx((cur) => (cur === idx ? null : idx));
                }}
                className="group text-left rounded-2xl px-3 py-2.5 border transition-all cursor-pointer flex items-center justify-between gap-1.5 bg-white"
                style={{
                  borderColor: isPicking ? accentColor : '#E2E8F0',
                  boxShadow: isPicking
                    ? `0 0 0 2px ${accentColor}26`
                    : '0 2px 8px rgba(15, 23, 42, 0.04)',
                }}
              >
                <div className="min-w-0 flex-1">
                  <div className="text-[12px] font-bold text-slate-900 truncate leading-snug">
                    {flavor.name}
                  </div>
                  <div className="text-[11.5px] font-extrabold text-slate-800 mt-0.5 tabular-nums truncate">
                    {formatMixRasaRp(parseMixRasaPrice(flavor.price))}
                  </div>
                </div>
                <ChevronRight
                  className={`w-4 h-4 shrink-0 transition-transform ${
                    isPicking ? 'rotate-90 text-orange-600' : 'text-slate-400'
                  }`}
                />
              </button>
            );
          })}
        </div>

        {/* Inline Flavor Picker Drawer when a Slot is Clicked */}
        {pickerSlotIdx !== null && (
          <div
            onClick={(e) => e.stopPropagation()}
            className="rounded-2xl border border-slate-200 bg-slate-50/95 p-3 space-y-2.5"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-700">
                Pilih Rasa — {getMixRasaSlotLabel(sliceCount, pickerSlotIdx)}
              </span>
              <button
                type="button"
                onClick={() => setPickerSlotIdx(null)}
                aria-label="Tutup pilihan rasa"
                className="w-6 h-6 rounded-full bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="grid grid-cols-3 gap-2">
              {flavors.map((flv) => {
                const isSelected = selectedFlavors[pickerSlotIdx]?.id === flv.id;
                return (
                  <button
                    key={flv.id}
                    type="button"
                    onClick={() => handleChooseFlavor(pickerSlotIdx, flv.id)}
                    className="flex flex-col items-center gap-1 p-2 rounded-xl border bg-white text-center transition-all cursor-pointer"
                    style={{
                      borderColor: isSelected ? accentColor : '#E2E8F0',
                      boxShadow: isSelected ? `0 0 0 1.5px ${accentColor}` : undefined,
                    }}
                  >
                    <div className="relative w-11 h-11 rounded-full overflow-hidden bg-slate-100 shrink-0">
                      {flv.image ? (
                        <img
                          src={flv.image}
                          alt={flv.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                          style={
                            (flv.imageScale ?? 100) !== 100
                              ? {
                                  transform: `scale(${
                                    Math.max(50, Math.min(200, Number(flv.imageScale ?? 100))) / 100
                                  })`,
                                  transformOrigin: 'center center',
                                }
                              : undefined
                          }
                        />
                      ) : (
                        <div
                          className="w-full h-full flex items-center justify-center text-white text-[10px] font-bold"
                          style={{ backgroundColor: flv.accentColor || accentColor }}
                        >
                          {flv.name.slice(0, 2).toUpperCase()}
                        </div>
                      )}
                      {isSelected && (
                        <span
                          className="absolute inset-0 flex items-center justify-center text-white"
                          style={{ backgroundColor: 'rgba(15, 23, 42, 0.35)' }}
                        >
                          <Check className="w-4 h-4" strokeWidth={3} />
                        </span>
                      )}
                    </div>
                    <span className="text-[10.5px] font-bold text-slate-800 leading-tight line-clamp-1 w-full">
                      {flv.name}
                    </span>
                    <span className="text-[9.5px] font-semibold text-slate-500 tabular-nums">
                      {formatMixRasaRp(parseMixRasaPrice(flv.price))}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Live Combination Summary Row */}
        <div
          data-canvas-sublayer="mr_summary"
          className="flex items-center gap-3.5 px-1 pt-0.5"
        >
          <CircularSplitPreview
            selectedFlavors={selectedFlavors}
            sliceCount={sliceCount}
            sizeClass="w-[54px] h-[54px]"
            dividerWidth={2}
          />
          <div className="min-w-0 flex-1 text-left">
            <div className="text-[11px] font-semibold text-slate-500 leading-tight">
              Kombinasi Pilihan
            </div>
            <div className="text-[12px] font-bold text-slate-800 leading-snug line-clamp-2 mt-0.5">
              {combinedNamesText}
            </div>
            <div className="text-[10.5px] font-medium text-slate-500 mt-1">
              Total Harga
            </div>
            <div className="text-[18px] font-black text-slate-900 leading-tight tabular-nums tracking-tight">
              {formatMixRasaRp(totalAmount)}
            </div>
          </div>
        </div>

        {/* Aksi Pemesanan: Keranjang Melayang & Link WhatsApp (render ONLY enabled actions) */}
        {(floatingCartEnabled || waEnabled) && (
          <div data-canvas-sublayer="mr_actions" className="flex flex-col gap-2.5 pt-1">
            {floatingCartEnabled && (
              <button
                type="button"
                onClick={handleAddToCart}
                className="w-full py-3 px-4 rounded-xl text-white text-[13.5px] font-extrabold flex items-center justify-center gap-2 shadow-sm active:scale-[0.99] transition-all cursor-pointer"
                style={{
                  backgroundColor: justAdded ? '#059669' : cartButtonBg,
                  boxShadow: `0 8px 18px -6px ${justAdded ? '#059669' : cartButtonBg}88`,
                }}
              >
                {justAdded ? (
                  <>
                    <Check className="w-4 h-4" strokeWidth={2.6} />
                    <span>Masuk Keranjang!</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-4 h-4" strokeWidth={2.2} />
                    <span>{cartButtonLabel}</span>
                  </>
                )}
              </button>
            )}

            {waEnabled && (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => {
                  e.stopPropagation();
                  if (isEditor) {
                    e.preventDefault();
                  }
                }}
                className="w-full py-2.5 px-4 rounded-xl text-white text-[13px] font-bold flex items-center justify-center gap-2 transition-all cursor-pointer no-underline"
                style={{
                  backgroundColor: '#16A34A',
                  boxShadow: '0 6px 16px -6px rgba(22, 163, 74, 0.55)',
                }}
              >
                <MessageCircle className="w-4 h-4" strokeWidth={2.2} />
                <span>{waLabel}</span>
              </a>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
