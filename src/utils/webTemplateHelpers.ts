import {
  DEFAULT_ADVANCE_OPTIONS,
  INITIAL_PROJECT,
  createId,
  resolveBottomNavbar,
} from '../data/presets';
import type {
  BuilderBlock,
  BuilderProject,
  BuilderSubPage,
  PageTheme,
  SavedWebTemplate,
  WebTemplateCategory,
  WebTemplateSnapshot,
  WebTemplateVisibility,
} from '../types/builder';
import {
  DEFAULT_ADS_CONFIG,
  createDefaultPublishingConfig,
  resolveProjectAds,
  resolveProjectPublishing,
  sanitizeSlug,
} from './publishingHelpers';
import { createDefaultWhatsappCenter, resolveWhatsappCenter } from './whatsappBuilder';

export const WEB_TEMPLATE_CATEGORIES: Array<{
  id: WebTemplateCategory;
  label: string;
}> = [
  { id: 'bisnis', label: 'Bisnis & Profil' },
  { id: 'kuliner', label: 'Kuliner & F&B' },
  { id: 'toko', label: 'Toko & Katalog' },
  { id: 'jasa', label: 'Jasa & Klinik' },
  { id: 'event', label: 'Event & Kursus' },
  { id: 'portofolio', label: 'Portofolio' },
  { id: 'lainnya', label: 'Lainnya' },
];

export const WEB_TEMPLATE_CATEGORY_LABELS: Record<WebTemplateCategory, string> =
  WEB_TEMPLATE_CATEGORIES.reduce(
    (acc, item) => {
      acc[item.id] = item.label;
      return acc;
    },
    {} as Record<WebTemplateCategory, string>
  );

export function normalizeWebTemplateCategory(raw: unknown): WebTemplateCategory {
  if (typeof raw === 'string' && raw in WEB_TEMPLATE_CATEGORY_LABELS) {
    return raw as WebTemplateCategory;
  }
  return 'bisnis';
}

export function normalizeWebTemplateVisibility(raw: unknown): WebTemplateVisibility {
  return raw === 'private' ? 'private' : 'shared';
}

function deepCloneJson<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

export function countBlocksRecursive(blocks: BuilderBlock[] | undefined): number {
  if (!Array.isArray(blocks) || blocks.length === 0) return 0;
  let total = 0;
  for (const blk of blocks) {
    total += 1;
    if (Array.isArray(blk.children) && blk.children.length > 0) {
      total += countBlocksRecursive(blk.children);
    }
    if (Array.isArray(blk.content?.actionSheetBlocks) && blk.content.actionSheetBlocks.length > 0) {
      total += countBlocksRecursive(blk.content.actionSheetBlocks);
    }
    if (Array.isArray(blk.content?.cardFooterBlocks) && blk.content.cardFooterBlocks.length > 0) {
      total += countBlocksRecursive(blk.content.cardFooterBlocks);
    }
  }
  return total;
}

export function computeWebTemplateStats(snapshot: WebTemplateSnapshot): {
  mainBlockCount: number;
  subPageCount: number;
  totalBlockCount: number;
  subPageTitles: string[];
  paletteColors: string[];
} {
  const mainBlockCount = countBlocksRecursive(snapshot.blocks);
  const pages = Array.isArray(snapshot.pages) ? snapshot.pages : [];
  let subBlocks = 0;
  const subPageTitles: string[] = [];
  for (const pg of pages) {
    subBlocks += countBlocksRecursive(pg.blocks);
    const title = typeof pg.title === 'string' && pg.title.trim() ? pg.title.trim() : 'Sub Halaman';
    subPageTitles.push(title);
  }
  const theme = snapshot.theme || INITIAL_PROJECT.theme;
  const paletteColors = [
    theme.canvasBg || '#F8FAFC',
    theme.cardBg || '#FFFFFF',
    theme.accentColor || '#00C98A',
    theme.textColor || '#17243D',
  ];
  return {
    mainBlockCount,
    subPageCount: pages.length,
    totalBlockCount: mainBlockCount + subBlocks,
    subPageTitles,
    paletteColors,
  };
}

/**
 * Extracts a clean, reusable full-site snapshot (Beranda + Sub Halaman + Tema + Top + Bottom Navbar)
 * while stripping private tracking pixels, custom domains, and live publish state.
 */
export function buildWebTemplateSnapshot(project: BuilderProject): WebTemplateSnapshot {
  const resolvedNav = resolveBottomNavbar(project);
  const safeTheme: PageTheme = deepCloneJson(project.theme || INITIAL_PROJECT.theme);
  const safeBlocks: BuilderBlock[] = deepCloneJson(Array.isArray(project.blocks) ? project.blocks : []);
  const safePages: BuilderSubPage[] = deepCloneJson(Array.isArray(project.pages) ? project.pages : []);
  const safeAdvance = deepCloneJson({
    ...DEFAULT_ADVANCE_OPTIONS,
    ...(project.advanceOptions || {}),
  });
  const safeNavbar = deepCloneJson(resolvedNav);

  return {
    theme: safeTheme,
    blocks: safeBlocks,
    pages: safePages,
    advanceOptions: safeAdvance,
    bottomNavbar: safeNavbar,
  };
}

/**
 * First pass collects every block ID in a block tree so cross-block references
 * (`actionTargetBlockId`) can be remapped consistently alongside `pageIdMap`.
 */
function collectBlockIdRemap(
  blocks: BuilderBlock[] | undefined,
  blockIdMap: Map<string, string>
): void {
  if (!Array.isArray(blocks)) return;
  for (const blk of blocks) {
    if (blk.id && !blockIdMap.has(blk.id)) {
      blockIdMap.set(blk.id, createId(blk.type.slice(0, 3) || 'blk'));
    }
    if (Array.isArray(blk.children)) collectBlockIdRemap(blk.children, blockIdMap);
    if (Array.isArray(blk.content?.actionSheetBlocks)) {
      collectBlockIdRemap(blk.content.actionSheetBlocks, blockIdMap);
    }
    if (Array.isArray(blk.content?.cardFooterBlocks)) {
      collectBlockIdRemap(blk.content.cardFooterBlocks, blockIdMap);
    }
  }
}

function remapBlocksWithFreshIds(
  blocks: BuilderBlock[] | undefined,
  pageIdMap: Map<string, string>,
  blockIdMap: Map<string, string>
): BuilderBlock[] {
  if (!Array.isArray(blocks)) return [];
  return blocks.map((blk) => {
    const cloned = deepCloneJson(blk);
    const nextId = blockIdMap.get(cloned.id) || createId(cloned.type.slice(0, 3) || 'blk');
    const c = cloned.content || {};

    if (c.actionTargetPageId && pageIdMap.has(c.actionTargetPageId)) {
      c.actionTargetPageId = pageIdMap.get(c.actionTargetPageId);
    }
    if (c.backTargetPageId && pageIdMap.has(c.backTargetPageId)) {
      c.backTargetPageId = pageIdMap.get(c.backTargetPageId);
    }
    if (c.actionTargetBlockId && blockIdMap.has(c.actionTargetBlockId)) {
      c.actionTargetBlockId = blockIdMap.get(c.actionTargetBlockId);
    }
    if (Array.isArray(c.actionSheetBlocks)) {
      c.actionSheetBlocks = remapBlocksWithFreshIds(c.actionSheetBlocks, pageIdMap, blockIdMap);
    }
    if (Array.isArray(c.cardFooterBlocks)) {
      c.cardFooterBlocks = remapBlocksWithFreshIds(c.cardFooterBlocks, pageIdMap, blockIdMap);
    }
    if (Array.isArray(c.catalogItems)) {
      c.catalogItems = c.catalogItems.map((it) => ({ ...it, id: createId('item') }));
    }
    if (Array.isArray(c.socialItems)) {
      c.socialItems = c.socialItems.map((it) => ({ ...it, id: createId(`soc_${it.platform}`) }));
    }
    if (Array.isArray(c.carouselItems)) {
      c.carouselItems = c.carouselItems.map((it) => ({ ...it, id: createId('slide') }));
    }
    if (Array.isArray(c.socialFeedPosts)) {
      c.socialFeedPosts = c.socialFeedPosts.map((it) => ({ ...it, id: createId('sfp') }));
    }
    if (Array.isArray(c.socialFollowerAccounts)) {
      c.socialFollowerAccounts = c.socialFollowerAccounts.map((it) => ({
        ...it,
        id: createId('sfa'),
      }));
    }
    if (Array.isArray(c.catalogCustomerFields)) {
      c.catalogCustomerFields = c.catalogCustomerFields.map((it) => ({ ...it, id: createId('cf') }));
    }
    if (Array.isArray(c.trainingPrograms)) {
      c.trainingPrograms = c.trainingPrograms.map((it) => ({ ...it, id: createId('trp') }));
    }
    if (Array.isArray(c.trainingCustomBoxes)) {
      c.trainingCustomBoxes = c.trainingCustomBoxes.map((it) => ({ ...it, id: createId('trb') }));
    }
    if (Array.isArray(c.trainingMedia)) {
      c.trainingMedia = c.trainingMedia.map((it) => ({ ...it, id: createId('trm') }));
    }
    if (Array.isArray(c.trainingFormFields)) {
      c.trainingFormFields = c.trainingFormFields.map((it) => ({ ...it, id: createId('tf') }));
    }
    if (Array.isArray(c.fnbItems)) {
      c.fnbItems = c.fnbItems.map((it) => ({ ...it, id: createId('fnb') }));
    }
    if (Array.isArray(c.fnbSliderItems)) {
      c.fnbSliderItems = c.fnbSliderItems.map((it) => ({ ...it, id: createId('fnbs') }));
    }
    if (Array.isArray(c.culinarySpinItems)) {
      c.culinarySpinItems = c.culinarySpinItems.map((it) => ({ ...it, id: createId('culs') }));
    }
    if (Array.isArray(c.floatingStudioItems)) {
      c.floatingStudioItems = c.floatingStudioItems.map((it) => ({ ...it, id: createId('fstd') }));
    }
    if (Array.isArray(c.cardFeeItems)) {
      c.cardFeeItems = c.cardFeeItems.map((it) => ({ ...it, id: createId('fee') }));
    }
    if (Array.isArray(c.categoryButtons)) {
      c.categoryButtons = c.categoryButtons.map((it) => ({ ...it, id: createId('catbtn') }));
    }

    return {
      ...cloned,
      id: nextId,
      content: c,
      children: cloned.children
        ? remapBlocksWithFreshIds(cloned.children, pageIdMap, blockIdMap)
        : undefined,
    };
  });
}

/**
 * Instantiates a SavedWebTemplate into a full BuilderProject with brand-new IDs
 * while preserving every link between Beranda, Sub Halaman, Back Button, and Bottom Navbar.
 */
export function instantiateWebTemplateSnapshot(
  snapshot: WebTemplateSnapshot,
  options: {
    mode: 'replace_current' | 'new_project';
    baseProject?: BuilderProject;
    nextTitle?: string;
  }
): BuilderProject {
  const pageIdMap = new Map<string, string>();
  const blockIdMap = new Map<string, string>();
  const srcPages = Array.isArray(snapshot.pages) ? snapshot.pages : [];

  for (const pg of srcPages) {
    if (pg.id && !pageIdMap.has(pg.id)) {
      pageIdMap.set(pg.id, createId('page'));
    }
  }

  collectBlockIdRemap(snapshot.blocks, blockIdMap);
  for (const pg of srcPages) {
    collectBlockIdRemap(pg.blocks, blockIdMap);
  }
  const rawNav = snapshot.bottomNavbar
    ? deepCloneJson(snapshot.bottomNavbar)
    : resolveBottomNavbar({
        title: options.nextTitle || 'Halaman Web',
        theme: snapshot.theme || INITIAL_PROJECT.theme,
        blocks: [],
        advanceOptions: DEFAULT_ADVANCE_OPTIONS,
      });

  for (const item of rawNav.items || []) {
    collectBlockIdRemap(item.children, blockIdMap);
  }

  const freshBlocks = remapBlocksWithFreshIds(snapshot.blocks, pageIdMap, blockIdMap);
  const freshPages: BuilderSubPage[] = srcPages.map((pg) => ({
    ...deepCloneJson(pg),
    id: pageIdMap.get(pg.id) || createId('page'),
    blocks: remapBlocksWithFreshIds(pg.blocks, pageIdMap, blockIdMap),
  }));

  const freshNavbar = {
    ...rawNav,
    items: (rawNav.items || []).map((item) => ({
      ...item,
      id: createId('nav'),
      children: remapBlocksWithFreshIds(item.children, pageIdMap, blockIdMap),
    })),
  };

  const freshTheme = deepCloneJson(snapshot.theme || INITIAL_PROJECT.theme);
  const freshAdvance = deepCloneJson({
    ...DEFAULT_ADVANCE_OPTIONS,
    ...(snapshot.advanceOptions || {}),
  });

  if (options.mode === 'replace_current' && options.baseProject) {
    return {
      ...options.baseProject,
      theme: freshTheme,
      blocks: freshBlocks,
      pages: freshPages,
      advanceOptions: freshAdvance,
      bottomNavbar: freshNavbar,
      publishing: resolveProjectPublishing(options.baseProject),
      adsConfig: resolveProjectAds(options.baseProject),
      whatsappCenter: resolveWhatsappCenter(options.baseProject),
    };
  }

  const finalTitle = (options.nextTitle || 'Proyek dari Template').trim() || 'Proyek dari Template';
  return {
    title: finalTitle,
    theme: freshTheme,
    blocks: freshBlocks,
    pages: freshPages,
    advanceOptions: freshAdvance,
    bottomNavbar: freshNavbar,
    publishing: {
      ...createDefaultPublishingConfig(finalTitle),
      slug: sanitizeSlug(finalTitle, 'template-web'),
      customDomain: '',
      useCustomDomain: false,
      isPublished: false,
    },
    adsConfig: { ...DEFAULT_ADS_CONFIG },
    whatsappCenter: createDefaultWhatsappCenter(finalTitle, ''),
  };
}

export function buildExportableWebTemplateJson(tpl: SavedWebTemplate): string {
  return JSON.stringify(
    {
      format: 'lynk-web-template-v1',
      exportedAt: Date.now(),
      name: tpl.name,
      description: tpl.description,
      category: tpl.category,
      visibility: tpl.visibility,
      allowCollaborativeEdit: tpl.allowCollaborativeEdit,
      snapshot: tpl.snapshot,
    },
    null,
    2
  );
}

export function parseImportedWebTemplateJson(rawText: string): {
  name: string;
  description: string;
  category: WebTemplateCategory;
  visibility: WebTemplateVisibility;
  allowCollaborativeEdit: boolean;
  snapshot: WebTemplateSnapshot;
} | null {
  try {
    const parsed = JSON.parse(rawText) as Record<string, unknown>;
    if (!parsed || typeof parsed !== 'object') return null;
    const snapCandidate = (parsed.snapshot ?? parsed.project ?? parsed) as Partial<WebTemplateSnapshot>;
    if (!snapCandidate || !Array.isArray(snapCandidate.blocks) || !snapCandidate.theme) {
      return null;
    }
    const baseProj: BuilderProject = {
      title: typeof parsed.name === 'string' && parsed.name.trim() ? parsed.name.trim() : 'Template Impor',
      theme: snapCandidate.theme,
      blocks: snapCandidate.blocks,
      pages: Array.isArray(snapCandidate.pages) ? snapCandidate.pages : [],
      advanceOptions: {
        ...DEFAULT_ADVANCE_OPTIONS,
        ...(snapCandidate.advanceOptions || {}),
      },
      bottomNavbar: snapCandidate.bottomNavbar,
    };
    const snapshot = buildWebTemplateSnapshot(baseProj);
    return {
      name:
        typeof parsed.name === 'string' && parsed.name.trim()
          ? parsed.name.trim().slice(0, 80)
          : 'Template Web Impor',
      description:
        typeof parsed.description === 'string' ? parsed.description.trim().slice(0, 240) : '',
      category: normalizeWebTemplateCategory(parsed.category),
      visibility: normalizeWebTemplateVisibility(parsed.visibility),
      allowCollaborativeEdit: Boolean(parsed.allowCollaborativeEdit),
      snapshot,
    };
  } catch {
    return null;
  }
}
