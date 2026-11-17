import type { BuilderBlock, BuilderProject } from '../types/builder.ts';

export interface FontOption {
  id: string;
  label: string;
  category: 'Sans' | 'Display' | 'Serif' | 'Script' | 'Mono';
  cssStack: string;
  googleSpec: string;
}

export const FONT_OPTIONS: FontOption[] = [
  {
    id: 'Plus Jakarta Sans',
    label: 'Plus Jakarta Sans',
    category: 'Sans',
    cssStack: "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    googleSpec: 'Plus+Jakarta+Sans:wght@400;500;600;700;800',
  },
  {
    id: 'Outfit',
    label: 'Outfit',
    category: 'Display',
    cssStack: "'Outfit', -apple-system, BlinkMacSystemFont, sans-serif",
    googleSpec: 'Outfit:wght@400;500;600;700;800',
  },
  {
    id: 'Bricolage Grotesque',
    label: 'Bricolage Grotesque',
    category: 'Display',
    cssStack: "'Bricolage Grotesque', -apple-system, BlinkMacSystemFont, sans-serif",
    googleSpec: 'Bricolage+Grotesque:wght@400;500;600;700;800',
  },
  {
    id: 'Manrope',
    label: 'Manrope',
    category: 'Sans',
    cssStack: "'Manrope', -apple-system, BlinkMacSystemFont, sans-serif",
    googleSpec: 'Manrope:wght@400;500;600;700;800',
  },
  {
    id: 'DM Sans',
    label: 'DM Sans',
    category: 'Sans',
    cssStack: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    googleSpec: 'DM+Sans:wght@400;500;600;700',
  },
  {
    id: 'Poppins',
    label: 'Poppins',
    category: 'Sans',
    cssStack: "'Poppins', -apple-system, BlinkMacSystemFont, sans-serif",
    googleSpec: 'Poppins:wght@400;500;600;700;800',
  },
  {
    id: 'Montserrat',
    label: 'Montserrat',
    category: 'Display',
    cssStack: "'Montserrat', -apple-system, BlinkMacSystemFont, sans-serif",
    googleSpec: 'Montserrat:wght@400;500;600;700;800',
  },
  {
    id: 'Oswald',
    label: 'Oswald',
    category: 'Display',
    cssStack: "'Oswald', -apple-system, BlinkMacSystemFont, sans-serif",
    googleSpec: 'Oswald:wght@400;500;600;700',
  },
  {
    id: 'Playfair Display',
    label: 'Playfair Display',
    category: 'Serif',
    cssStack: "'Playfair Display', Georgia, serif",
    googleSpec: 'Playfair+Display:wght@400;600;700;800',
  },
  {
    id: 'Fraunces',
    label: 'Fraunces',
    category: 'Serif',
    cssStack: "'Fraunces', Georgia, serif",
    googleSpec: 'Fraunces:wght@400;600;700;800',
  },
  {
    id: 'Cormorant Garamond',
    label: 'Cormorant Garamond',
    category: 'Serif',
    cssStack: "'Cormorant Garamond', Georgia, serif",
    googleSpec: 'Cormorant+Garamond:wght@400;600;700',
  },
  {
    id: 'Lora',
    label: 'Lora',
    category: 'Serif',
    cssStack: "'Lora', Georgia, serif",
    googleSpec: 'Lora:wght@400;500;600;700',
  },
  {
    id: 'Pacifico',
    label: 'Pacifico',
    category: 'Script',
    cssStack: "'Pacifico', cursive",
    googleSpec: 'Pacifico',
  },
  {
    id: 'Caveat',
    label: 'Caveat',
    category: 'Script',
    cssStack: "'Caveat', cursive",
    googleSpec: 'Caveat:wght@500;700',
  },
  {
    id: 'JetBrains Mono',
    label: 'JetBrains Mono',
    category: 'Mono',
    cssStack: "'JetBrains Mono', monospace",
    googleSpec: 'JetBrains+Mono:wght@400;500;700',
  },
];

const FONT_MAP = new Map<string, FontOption>(
  FONT_OPTIONS.map((opt) => [opt.id.toLowerCase(), opt])
);

export function sanitizeFontFamily(raw?: string | null): string | undefined {
  if (!raw) return undefined;
  const trimmed = raw.trim().toLowerCase();
  if (!trimmed || trimmed === 'inherit' || trimmed === 'default') return undefined;
  const found = FONT_MAP.get(trimmed);
  return found ? found.id : undefined;
}

export function resolveCssFontFamily(raw?: string | null): string | undefined {
  const safe = sanitizeFontFamily(raw);
  if (!safe) return undefined;
  return FONT_MAP.get(safe.toLowerCase())?.cssStack;
}

export function collectProjectFontIds(project: BuilderProject): string[] {
  const set = new Set<string>(['Plus Jakarta Sans']);
  const themeFont = sanitizeFontFamily(project.theme?.fontFamily);
  if (themeFont) set.add(themeFont);

  const scan = (blocks: BuilderBlock[]) => {
    for (const blk of blocks) {
      const f1 = sanitizeFontFamily(blk.style?.fontFamily);
      if (f1) set.add(f1);
      if (blk.content?.heroCoverTitleEnabled !== false && blk.content?.heroCoverFontFamily !== '__none__') {
        const f2 = sanitizeFontFamily(blk.content?.heroCoverFontFamily);
        if (f2) set.add(f2);
      }
      if (Array.isArray(blk.children)) scan(blk.children);
    }
  };
  if (Array.isArray(project.blocks)) scan(project.blocks);
  if (Array.isArray(project.bottomNavbar?.items)) {
    for (const item of project.bottomNavbar.items) {
      if (Array.isArray(item.children)) scan(item.children);
    }
  }
  return Array.from(set);
}

export function buildGoogleFontsHref(fontIds?: string[]): string {
  const targetIds =
    fontIds && fontIds.length > 0 ? fontIds : FONT_OPTIONS.map((f) => f.id);
  const specs: string[] = [];
  for (const id of targetIds) {
    const opt = FONT_MAP.get(id.toLowerCase());
    if (opt && !specs.includes(opt.googleSpec)) {
      specs.push(opt.googleSpec);
    }
  }
  if (specs.length === 0) {
    specs.push('Plus+Jakarta+Sans:wght@400;600;700');
  }
  return `https://fonts.googleapis.com/css2?${specs.map((s) => `family=${s}`).join('&')}&display=swap`;
}
