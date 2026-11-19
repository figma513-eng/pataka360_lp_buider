export type DeviceCategory =
  | 'responsive'
  | 'mobile'
  | 'foldables'
  | 'tablets-desktops'
  | 'smart-displays';

export interface DevicePreset {
  id: string;
  name: string;
  category: DeviceCategory;
  width: number;
  height: number;
}

export const DEVICE_CATEGORY_LABELS: { id: DeviceCategory; label: string }[] = [
  { id: 'mobile', label: 'Mobile' },
  { id: 'foldables', label: 'Foldables' },
  { id: 'tablets-desktops', label: 'Tablets & Desktops' },
  { id: 'smart-displays', label: 'Smart Displays' },
];

export const RESPONSIVE_PRESET: DevicePreset = {
  id: 'responsive',
  name: 'Responsive',
  category: 'responsive',
  width: 440,
  height: 844,
};

export const BUILTIN_DEVICE_PRESETS: DevicePreset[] = [
  // Mobile
  { id: 'mobile-440', name: 'Mobile 440 px', category: 'mobile', width: 440, height: 844 },
  { id: 'mobile-576', name: 'Mobile 576 px', category: 'mobile', width: 576, height: 844 },
  { id: 'iphone-se', name: 'iPhone SE', category: 'mobile', width: 375, height: 667 },
  { id: 'pixel-9', name: 'Pixel 9', category: 'mobile', width: 412, height: 915 },
  {
    id: 'galaxy-a55',
    name: 'Samsung Galaxy A55',
    category: 'mobile',
    width: 384,
    height: 854,
  },
  // Foldables
  {
    id: 'pixel-9-pro-fold',
    name: 'Pixel 9 Pro Fold',
    category: 'foldables',
    width: 850,
    height: 880,
  },
  {
    id: 'galaxy-z-fold-6',
    name: 'Galaxy Z Fold 6',
    category: 'foldables',
    width: 688,
    height: 836,
  },
  // Tablets & Desktops
  {
    id: 'ipad-mini',
    name: 'iPad Mini',
    category: 'tablets-desktops',
    width: 768,
    height: 1024,
  },
  {
    id: 'ipad-pro-13',
    name: 'iPad Pro 13',
    category: 'tablets-desktops',
    width: 1032,
    height: 1376,
  },
  {
    id: 'surface-pro-10',
    name: 'Surface Pro 10',
    category: 'tablets-desktops',
    width: 960,
    height: 1440,
  },
  // Smart Displays
  {
    id: 'nest-hub-max',
    name: 'Nest Hub Max',
    category: 'smart-displays',
    width: 1280,
    height: 800,
  },
];

export const ALL_DEFAULT_DEVICES: DevicePreset[] = [
  RESPONSIVE_PRESET,
  ...BUILTIN_DEVICE_PRESETS,
];

export function clampDimension(val: number, min: number, max: number): number {
  if (!Number.isFinite(val)) return min;
  return Math.max(min, Math.min(max, Math.round(val)));
}
