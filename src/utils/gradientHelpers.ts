import type { BlockStyle } from '../types/builder.ts';
import { sanitizeCssColor } from './htmlSanitizer.ts';

export interface GradientPreset {
  id: string;
  name: string;
  color1: string;
  color2: string;
  color3?: string;
  angle: number;
  suggestedTextColor: string;
}

export const GRADIENT_PRESETS: GradientPreset[] = [
  {
    id: 'amber-orange',
    name: 'Amber Sunset',
    color1: '#FFD000',
    color2: '#F97316',
    color3: '#C2410C',
    angle: 180,
    suggestedTextColor: '#FFFFFF',
  },
  {
    id: 'magenta-plum',
    name: 'Magenta Berry',
    color1: '#F731A5',
    color2: '#7E22CE',
    color3: '#2E073F',
    angle: 180,
    suggestedTextColor: '#FFFFFF',
  },
  {
    id: 'coral-violet',
    name: 'Coral Violet',
    color1: '#FB7185',
    color2: '#A855F7',
    color3: '#6D28D9',
    angle: 180,
    suggestedTextColor: '#FFFFFF',
  },
  {
    id: 'aqua-navy',
    name: 'Aqua Samudra',
    color1: '#0EA5E9',
    color2: '#1D4ED8',
    color3: '#1E1B4B',
    angle: 180,
    suggestedTextColor: '#FFFFFF',
  },
  {
    id: 'royal-indigo',
    name: 'Indigo Malam',
    color1: '#1D4ED8',
    color2: '#4338CA',
    color3: '#4C1D95',
    angle: 180,
    suggestedTextColor: '#FFFFFF',
  },
  {
    id: 'sky-blue',
    name: 'Biru Langit',
    color1: '#00A8FF',
    color2: '#0284C7',
    color3: '#1E40AF',
    angle: 180,
    suggestedTextColor: '#FFFFFF',
  },
  {
    id: 'crimson-red',
    name: 'Merah Menyala',
    color1: '#EF4444',
    color2: '#DC2626',
    color3: '#7F1D1D',
    angle: 180,
    suggestedTextColor: '#FFFFFF',
  },
  {
    id: 'warm-brand-cta',
    name: 'Oranye Promo',
    color1: '#EA580C',
    color2: '#9A3412',
    angle: 135,
    suggestedTextColor: '#FFFFFF',
  },
  {
    id: 'emerald-teal',
    name: 'Emerald Segar',
    color1: '#10B981',
    color2: '#047857',
    angle: 135,
    suggestedTextColor: '#FFFFFF',
  },
  {
    id: 'soft-ice-lavender',
    name: 'Pastel Lembut',
    color1: '#EFF6FF',
    color2: '#FAF5FF',
    angle: 135,
    suggestedTextColor: '#0F172A',
  },
  {
    id: 'soft-peach-cream',
    name: 'Krem Hangat',
    color1: '#FFF7ED',
    color2: '#FEF3C7',
    angle: 135,
    suggestedTextColor: '#0F172A',
  },
];

export function clampGradientAngle(angle?: number): number {
  const num = Number(angle);
  if (!Number.isFinite(num)) return 135;
  return Math.max(0, Math.min(360, Math.round(num)));
}

export function buildLinearGradientCss(
  style: Pick<
    BlockStyle,
    'backgroundMode' | 'gradientColor1' | 'gradientColor2' | 'gradientColor3' | 'gradientAngle'
  >
): string | null {
  if (style.backgroundMode !== 'gradient') return null;
  const c1 = sanitizeCssColor(style.gradientColor1, '#EA580C');
  const c2 = sanitizeCssColor(style.gradientColor2, '#9A3412');
  const c3 = style.gradientColor3 ? sanitizeCssColor(style.gradientColor3, '') : '';
  const angle = clampGradientAngle(style.gradientAngle ?? 135);
  return c3
    ? `linear-gradient(${angle}deg, ${c1} 0%, ${c2} 50%, ${c3} 100%)`
    : `linear-gradient(${angle}deg, ${c1} 0%, ${c2} 100%)`;
}

export function resolveBackgroundInlineProps(style: BlockStyle): {
  backgroundColor: string;
  backgroundImage?: string;
} {
  const grad = buildLinearGradientCss(style);
  if (grad) {
    return {
      backgroundColor: sanitizeCssColor(style.gradientColor1, style.backgroundColor || '#EA580C'),
      backgroundImage: grad,
    };
  }
  return {
    backgroundColor: style.backgroundColor,
  };
}
