import React, { useEffect, useRef, useState } from 'react';
import {
  Check,
  ChevronDown,
  Monitor,
  Pencil,
  RotateCw,
  SlidersHorizontal,
  Smartphone,
  Tablet,
} from 'lucide-react';
import {
  ALL_DEFAULT_DEVICES,
  DEVICE_CATEGORY_LABELS,
  DevicePreset,
  clampDimension,
} from '../utils/devicePresets';

interface DeviceViewportSelectorProps {
  selectedDeviceId: string;
  width: number;
  height: number;
  rotated: boolean;
  customDevices?: DevicePreset[];
  onSelectDevice: (device: DevicePreset) => void;
  onChangeDimensions: (width: number, height: number) => void;
  onToggleRotate: () => void;
  onAddCustomDevice?: (device: DevicePreset) => void;
  compact?: boolean;
  menuAlign?: 'left' | 'right';
}

export function DeviceViewportSelector({
  selectedDeviceId,
  width,
  height,
  rotated,
  customDevices = [],
  onSelectDevice,
  onChangeDimensions,
  onToggleRotate,
  onAddCustomDevice,
  compact = false,
  menuAlign = 'left',
}: DeviceViewportSelectorProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [customName, setCustomName] = useState('Perangkat Kustom');
  const [draftW, setDraftW] = useState(String(width));
  const [draftH, setDraftH] = useState(String(height));
  const containerRef = useRef<HTMLDivElement | null>(null);

  const allDevices = [...ALL_DEFAULT_DEVICES, ...customDevices];
  const activeDevice =
    allDevices.find((d) => d.id === selectedDeviceId) ?? ALL_DEFAULT_DEVICES[0];

  useEffect(() => {
    setDraftW(String(width));
    setDraftH(String(height));
  }, [width, height]);

  useEffect(() => {
    if (!menuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
        setEditMode(false);
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
        setEditMode(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEsc);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEsc);
    };
  }, [menuOpen]);

  const getDeviceIcon = (device: DevicePreset) => {
    if (device.category === 'responsive') return <SlidersHorizontal className="w-3.5 h-3.5" />;
    if (device.category === 'mobile') return <Smartphone className="w-3.5 h-3.5" />;
    if (device.category === 'foldables' || device.category === 'tablets-desktops') {
      return width >= 1000 ? (
        <Monitor className="w-3.5 h-3.5" />
      ) : (
        <Tablet className="w-3.5 h-3.5" />
      );
    }
    return <Monitor className="w-3.5 h-3.5" />;
  };

  const applyCustomSize = (saveAsPreset: boolean) => {
    const nextW = clampDimension(Number(draftW), 280, 1920);
    const nextH = clampDimension(Number(draftH), 420, 2200);
    if (saveAsPreset && onAddCustomDevice) {
      const preset: DevicePreset = {
        id: `custom_${Date.now().toString(36)}`,
        name: customName.trim() || `Kustom ${nextW}×${nextH}`,
        category: nextW < 600 ? 'mobile' : nextW < 1100 ? 'tablets-desktops' : 'smart-displays',
        width: nextW,
        height: nextH,
      };
      onAddCustomDevice(preset);
      onSelectDevice(preset);
    } else {
      onChangeDimensions(nextW, nextH);
    }
    setEditMode(false);
    setMenuOpen(false);
  };

  const isResponsive = selectedDeviceId === 'responsive';

  return (
    <div ref={containerRef} className="relative flex items-center gap-1.5 flex-wrap">
      {/* Dropdown Trigger */}
      <button
        type="button"
        onClick={() => {
          setMenuOpen((prev) => !prev);
          setEditMode(false);
        }}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-emerald-200/80 bg-[#EFF7F4] hover:bg-emerald-100/70 text-emerald-800 text-[12px] font-semibold transition-colors cursor-pointer"
        title="Pilih perangkat / mode responsif"
      >
        <span className="text-emerald-600">{getDeviceIcon(activeDevice)}</span>
        <span className="truncate max-w-[140px] sm:max-w-[180px]">{activeDevice.name}</span>
        <ChevronDown
          className={`w-3.5 h-3.5 text-emerald-600 transition-transform ${
            menuOpen ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Dimensions Readout / Editable W × H */}
      <div className="inline-flex items-center gap-1 bg-slate-50 border border-slate-200/90 rounded-lg px-2 py-0.5 text-[11px] text-slate-600 tabular-nums">
        {isResponsive ? (
          <>
            <input
              type="number"
              min={280}
              max={1920}
              aria-label="Lebar layar (px)"
              value={width}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v)) onChangeDimensions(clampDimension(v, 280, 1920), height);
              }}
              className="w-12 bg-transparent font-semibold text-slate-800 text-center outline-none focus:bg-white rounded px-0.5"
            />
            <span className="text-slate-400">×</span>
            <input
              type="number"
              min={420}
              max={2200}
              aria-label="Tinggi layar (px)"
              value={height}
              onChange={(e) => {
                const v = Number(e.target.value);
                if (!Number.isNaN(v)) onChangeDimensions(width, clampDimension(v, 420, 2200));
              }}
              className="w-12 bg-transparent font-semibold text-slate-800 text-center outline-none focus:bg-white rounded px-0.5"
            />
            <span className="text-slate-400">px</span>
          </>
        ) : (
          <span className="font-medium text-slate-700 px-0.5">
            {width} × {height}
          </span>
        )}
      </div>

      {/* Rotate Orientation */}
      <button
        type="button"
        onClick={onToggleRotate}
        title={rotated ? 'Kembalikan ke Portrait' : 'Putar ke Landscape'}
        className={`inline-flex items-center gap-1 px-2 py-1 rounded-lg border text-[11px] font-medium transition-colors cursor-pointer ${
          rotated
            ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
            : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50 hover:text-slate-900'
        }`}
      >
        <RotateCw className="w-3.5 h-3.5" />
        {!compact && <span className="hidden lg:inline">{rotated ? 'Landscape' : 'Putar'}</span>}
      </button>

      {/* Dropdown Popover (Chrome DevTools Device Style) */}
      {menuOpen && (
        <div
          className={`absolute top-full mt-1.5 z-50 w-64 rounded-xl bg-slate-900 text-slate-100 shadow-2xl border border-slate-700/80 overflow-hidden ${
            menuAlign === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          {!editMode ? (
            <div className="max-h-[70vh] overflow-y-auto py-1.5 text-[12px]">
              {/* Responsive */}
              <button
                type="button"
                onClick={() => {
                  onSelectDevice(ALL_DEFAULT_DEVICES[0]);
                  setMenuOpen(false);
                }}
                className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors cursor-pointer ${
                  selectedDeviceId === 'responsive'
                    ? 'bg-emerald-600/25 text-white font-semibold'
                    : 'hover:bg-slate-800 text-slate-200'
                }`}
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className="w-3.5 flex items-center justify-center shrink-0">
                    {selectedDeviceId === 'responsive' && (
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                    )}
                  </span>
                  <span>Responsive</span>
                </span>
                <span className="text-[10px] text-slate-400 tabular-nums">Bebas</span>
              </button>

              {/* Categories */}
              {DEVICE_CATEGORY_LABELS.map((cat) => {
                const items = allDevices.filter((d) => d.category === cat.id);
                if (items.length === 0) return null;
                return (
                  <div key={cat.id} className="mt-1 pt-1 border-t border-slate-800/90">
                    <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                      {cat.label}
                    </div>
                    {items.map((dev) => {
                      const active = dev.id === selectedDeviceId;
                      return (
                        <button
                          key={dev.id}
                          type="button"
                          onClick={() => {
                            onSelectDevice(dev);
                            setMenuOpen(false);
                          }}
                          className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors cursor-pointer ${
                            active
                              ? 'bg-emerald-600/25 text-white font-semibold'
                              : 'hover:bg-slate-800 text-slate-200'
                          }`}
                        >
                          <span className="flex items-center gap-2 min-w-0">
                            <span className="w-3.5 flex items-center justify-center shrink-0">
                              {active && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                            </span>
                            <span className="truncate">{dev.name}</span>
                          </span>
                          <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                            {dev.width}×{dev.height}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                );
              })}

              {/* Custom Devices if any */}
              {customDevices.length > 0 && (
                <div className="mt-1 pt-1 border-t border-slate-800/90">
                  <div className="px-3 py-1 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                    Kustom
                  </div>
                  {customDevices.map((dev) => {
                    const active = dev.id === selectedDeviceId;
                    return (
                      <button
                        key={dev.id}
                        type="button"
                        onClick={() => {
                          onSelectDevice(dev);
                          setMenuOpen(false);
                        }}
                        className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-emerald-600/25 text-white font-semibold'
                            : 'hover:bg-slate-800 text-slate-200'
                        }`}
                      >
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="w-3.5 flex items-center justify-center shrink-0">
                            {active && <Check className="w-3.5 h-3.5 text-emerald-400" />}
                          </span>
                          <span className="truncate">{dev.name}</span>
                        </span>
                        <span className="text-[10px] text-slate-400 tabular-nums shrink-0">
                          {dev.width}×{dev.height}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}

              {/* Edit... */}
              <div className="mt-1 pt-1 border-t border-slate-800/90">
                <button
                  type="button"
                  onClick={() => {
                    setDraftW(String(width));
                    setDraftH(String(height));
                    setEditMode(true);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-1.5 text-left text-slate-200 hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  <span className="w-3.5 flex items-center justify-center shrink-0">
                    <Pencil className="w-3 h-3 text-slate-400" />
                  </span>
                  <span>Edit...</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="p-3 space-y-2.5 text-xs">
              <div className="flex items-center justify-between">
                <span className="font-semibold text-white">Ukuran Layar Kustom</span>
                <button
                  type="button"
                  onClick={() => setEditMode(false)}
                  className="text-[11px] text-slate-400 hover:text-white cursor-pointer"
                >
                  Kembali
                </button>
              </div>
              <div>
                <label className="block text-[10px] text-slate-400 mb-1">Nama Perangkat</label>
                <input
                  type="text"
                  value={customName}
                  onChange={(e) => setCustomName(e.target.value)}
                  placeholder="Misal: Laptop 1366"
                  className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-xs outline-none focus:border-emerald-500"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Lebar (px)</label>
                  <input
                    type="number"
                    min={280}
                    max={1920}
                    value={draftW}
                    onChange={(e) => setDraftW(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-xs tabular-nums outline-none focus:border-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-slate-400 mb-1">Tinggi (px)</label>
                  <input
                    type="number"
                    min={420}
                    max={2200}
                    value={draftH}
                    onChange={(e) => setDraftH(e.target.value)}
                    className="w-full px-2 py-1 rounded bg-slate-800 border border-slate-700 text-white text-xs tabular-nums outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
              <div className="flex items-center gap-1.5 pt-1">
                {onAddCustomDevice && (
                  <button
                    type="button"
                    onClick={() => applyCustomSize(true)}
                    className="flex-1 py-1.5 px-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold cursor-pointer"
                  >
                    Simpan &amp; Pakai
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => applyCustomSize(false)}
                  className="flex-1 py-1.5 px-2 rounded-lg bg-slate-700 hover:bg-slate-600 text-white text-[11px] font-semibold cursor-pointer"
                >
                  Terapkan
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
