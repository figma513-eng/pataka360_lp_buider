import {
  DEFAULT_ADVANCE_OPTIONS,
  INITIAL_PROJECT,
  createDefaultBottomNavbar,
  createId,
  resolveBottomNavbar,
} from '../data/presets';
import type { BuilderBlock, BuilderProject, ProjectRecord, WorkspaceBundle } from '../types/builder';
import {
  DEFAULT_ADS_CONFIG,
  createDefaultPublishingConfig,
  resolveProjectAds,
  resolveProjectPublishing,
  sanitizeSlug,
} from './publishingHelpers';
import { createDefaultWhatsappCenter, resolveWhatsappCenter } from './whatsappBuilder';

const LEGACY_STORAGE_KEY = 'lynk_builder_project_v2';
const IDB_NAME = 'lynk_builder_idb';
const IDB_VERSION = 1;
const IDB_STORE = 'workspace';
const LEGACY_IDB_KEY = 'state';

function getScopedIdbKey(userId?: string | null): string {
  return userId && userId.trim() ? `workspace:user:${userId.trim()}` : 'workspace:anon';
}

function cloneBlocksWithNewIds(blocks: BuilderBlock[]): BuilderBlock[] {
  return blocks.map((blk) => ({
    ...blk,
    id: createId(blk.type.slice(0, 3)),
    style: { ...blk.style },
    content: {
      ...blk.content,
      catalogItems: blk.content.catalogItems?.map((it) => ({
        ...it,
        id: createId('item'),
        gallery: it.gallery ? [...it.gallery] : undefined,
      })),
      socialItems: blk.content.socialItems?.map((it) => ({
        ...it,
        id: createId(`soc_${it.platform}`),
      })),
      carouselItems: blk.content.carouselItems?.map((it) => ({
        ...it,
        id: createId('slide'),
      })),
      socialFeedPosts: blk.content.socialFeedPosts?.map((it) => ({
        ...it,
        id: createId('sfp'),
      })),
      socialFollowerAccounts: blk.content.socialFollowerAccounts?.map((it) => ({
        ...it,
        id: createId('sfa'),
      })),
      catalogShippingOptions: blk.content.catalogShippingOptions?.map((it) => ({
        ...it,
        checklistItems: it.checklistItems ? [...it.checklistItems] : undefined,
      })),
      catalogCustomerFields: blk.content.catalogCustomerFields?.map((it) => ({
        ...it,
        id: createId('cf'),
      })),
      trainingPrograms: blk.content.trainingPrograms?.map((it) => ({
        ...it,
        id: createId('trp'),
      })),
      trainingCustomBoxes: blk.content.trainingCustomBoxes?.map((it) => ({
        ...it,
        id: createId('trb'),
      })),
      trainingMedia: blk.content.trainingMedia?.map((it) => ({
        ...it,
        id: createId('trm'),
      })),
      trainingChecklistItems: blk.content.trainingChecklistItems
        ? [...blk.content.trainingChecklistItems]
        : undefined,
      trainingFormFields: blk.content.trainingFormFields?.map((it) => ({
        ...it,
        id: createId('tf'),
      })),
      fnbItems: blk.content.fnbItems?.map((it) => ({
        ...it,
        id: createId('fnb'),
      })),
      categoryButtons: blk.content.categoryButtons?.map((it) => ({
        ...it,
        id: createId('catbtn'),
        targetIds: it.targetIds ? [...it.targetIds] : undefined,
      })),
    },
    children: blk.children ? cloneBlocksWithNewIds(blk.children) : undefined,
  }));
}

export function normalizeProject(raw: BuilderProject): BuilderProject {
  const title = typeof raw.title === 'string' && raw.title.trim() ? raw.title : 'Halaman Usaha';
  const baseNormalized: BuilderProject = {
    title,
    theme: raw.theme,
    blocks: Array.isArray(raw.blocks) ? raw.blocks : [],
    pages: Array.isArray(raw.pages) ? raw.pages : undefined,
    advanceOptions: {
      ...DEFAULT_ADVANCE_OPTIONS,
      ...(raw.advanceOptions ?? {}),
    },
    bottomNavbar: raw.bottomNavbar,
    publishing: raw.publishing,
    adsConfig: raw.adsConfig,
    whatsappCenter: raw.whatsappCenter,
  };
  return {
    ...baseNormalized,
    bottomNavbar: resolveBottomNavbar(baseNormalized),
    publishing: resolveProjectPublishing(baseNormalized),
    adsConfig: resolveProjectAds(baseNormalized),
    whatsappCenter: resolveWhatsappCenter(baseNormalized),
  };
}

export function cloneProjectForNewBusiness(
  source: BuilderProject,
  nextTitle: string
): BuilderProject {
  const normalized = normalizeProject(source);
  const srcAds = resolveProjectAds(normalized);
  const srcNav = resolveBottomNavbar(normalized);
  const srcWa = resolveWhatsappCenter(normalized);
  return {
    title: nextTitle,
    theme: { ...normalized.theme },
    advanceOptions: { ...normalized.advanceOptions },
    blocks: cloneBlocksWithNewIds(normalized.blocks),
    pages: normalized.pages?.map((pg) => ({
      ...pg,
      blocks: cloneBlocksWithNewIds(pg.blocks),
    })),
    bottomNavbar: {
      ...srcNav,
      items: srcNav.items.map((it) => ({
        ...it,
        children: cloneBlocksWithNewIds(it.children),
      })),
    },
    publishing: {
      ...createDefaultPublishingConfig(nextTitle),
      slug: sanitizeSlug(nextTitle, 'unit-usaha'),
      customDomain: '',
      useCustomDomain: false,
      isPublished: false,
    },
    adsConfig: {
      ...srcAds,
    },
    whatsappCenter: {
      ...srcWa,
      businessName: nextTitle,
      templates: srcWa.templates.map((t) => ({ ...t })),
      links: srcWa.links.map((l) => ({ ...l })),
    },
  };
}

export function createBlankProject(title: string): BuilderProject {
  return {
    title,
    theme: { ...INITIAL_PROJECT.theme },
    advanceOptions: { ...DEFAULT_ADVANCE_OPTIONS },
    blocks: [],
    bottomNavbar: createDefaultBottomNavbar(INITIAL_PROJECT.theme, false),
    publishing: createDefaultPublishingConfig(title),
    adsConfig: { ...DEFAULT_ADS_CONFIG },
    whatsappCenter: createDefaultWhatsappCenter(title, ''),
  };
}

export function readLegacyLocalProject(): BuilderProject | null {
  try {
    if (typeof localStorage === 'undefined') return null;
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as BuilderProject;
    if (parsed && Array.isArray(parsed.blocks) && parsed.theme) {
      return normalizeProject(parsed);
    }
  } catch {
    // Ignore invalid JSON
  }
  return null;
}

export function createStarterWorkspaceSync(useLegacyFallback = false): WorkspaceBundle {
  const starter = useLegacyFallback
    ? readLegacyLocalProject() ?? normalizeProject(INITIAL_PROJECT)
    : normalizeProject(INITIAL_PROJECT);
  const firstId = createId('proj');
  const now = Date.now();
  return {
    version: 1,
    activeProjectId: firstId,
    projects: [
      {
        id: firstId,
        revision: 1,
        project: starter,
        updatedAt: now,
        lastSavedAt: 0,
      },
    ],
  };
}

export function getInitialWorkspaceSync(): WorkspaceBundle {
  return createStarterWorkspaceSync(false);
}

function openWorkspaceDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB tidak tersedia di browser ini.'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Gagal membuka IndexedDB.'));
  });
}

function normalizeWorkspace(raw: unknown): WorkspaceBundle | null {
  if (!raw || typeof raw !== 'object') return null;
  const candidate = raw as Partial<WorkspaceBundle>;
  if (!Array.isArray(candidate.projects) || candidate.projects.length === 0) return null;

  const validRecords: ProjectRecord[] = [];
  for (const item of candidate.projects) {
    if (
      item &&
      typeof item.id === 'string' &&
      item.project &&
      Array.isArray(item.project.blocks) &&
      item.project.theme
    ) {
      const updated = typeof item.updatedAt === 'number' ? item.updatedAt : Date.now();
      validRecords.push({
        id: item.id,
        revision: typeof item.revision === 'number' ? item.revision : 1,
        project: normalizeProject(item.project),
        updatedAt: updated,
        lastSavedAt: typeof item.lastSavedAt === 'number' ? item.lastSavedAt : 0,
      });
    }
  }

  if (validRecords.length === 0) return null;
  const hasActive = validRecords.some((p) => p.id === candidate.activeProjectId);
  return {
    version: 1,
    activeProjectId:
      hasActive && candidate.activeProjectId ? candidate.activeProjectId : validRecords[0].id,
    projects: validRecords,
  };
}

async function idbGetKey(db: IDBDatabase, key: string): Promise<unknown> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readonly');
    const store = tx.objectStore(IDB_STORE);
    const req = store.get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error ?? new Error('Gagal membaca IndexedDB.'));
  });
}

async function idbPutKey(db: IDBDatabase, key: string, value: WorkspaceBundle): Promise<void> {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(IDB_STORE, 'readwrite');
    const store = tx.objectStore(IDB_STORE);
    store.put(value, key);
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error ?? new Error('Gagal menulis ke IndexedDB.'));
  });
}

export interface LoadWorkspaceResult {
  workspace: WorkspaceBundle;
  source: 'idb' | 'migrated' | 'fresh' | 'error';
  error?: string;
}

/**
 * Loads user-scoped IndexedDB workspace safely without swallowing IO errors
 * and without writing sensitive multi-user data into shared localStorage.
 */
export async function loadWorkspaceScoped(userId?: string | null): Promise<LoadWorkspaceResult> {
  const scopedKey = getScopedIdbKey(userId);
  try {
    const db = await openWorkspaceDb();
    try {
      const stored = await idbGetKey(db, scopedKey);
      if (stored !== undefined) {
        const normalized = normalizeWorkspace(stored);
        if (normalized) {
          return { workspace: normalized, source: 'idb' };
        }
        return {
          workspace: createStarterWorkspaceSync(false),
          source: 'error',
          error:
            'Cache IndexedDB lokal untuk akun ini rusak. Aplikasi mengambil data terbaru dari server.',
        };
      }

      // First load for this user scope: migrate from legacy shared IDB key only if anonymous/unscoped
      if (!userId) {
        const legacyIdb = await idbGetKey(db, LEGACY_IDB_KEY);
        const normalizedLegacy = normalizeWorkspace(legacyIdb);
        if (normalizedLegacy) {
          await idbPutKey(db, scopedKey, normalizedLegacy);
          return { workspace: normalizedLegacy, source: 'migrated' };
        }
      }

      const fresh = createStarterWorkspaceSync(!userId);
      await idbPutKey(db, scopedKey, fresh);
      return { workspace: fresh, source: 'fresh' };
    } finally {
      db.close();
    }
  } catch (err) {
    return {
      workspace: createStarterWorkspaceSync(false),
      source: 'error',
      error:
        err instanceof Error
          ? err.message
          : 'Penyimpanan browser (IndexedDB) tidak dapat diakses.',
    };
  }
}

export async function saveWorkspaceScoped(
  workspace: WorkspaceBundle,
  userId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  const scopedKey = getScopedIdbKey(userId);
  try {
    const db = await openWorkspaceDb();
    try {
      await idbPutKey(db, scopedKey, workspace);
      return { ok: true };
    } finally {
      db.close();
    }
  } catch (err) {
    return {
      ok: false,
      error:
        err instanceof Error
          ? `Gagal menyimpan cache browser: ${err.message}`
          : 'Gagal menyimpan ke IndexedDB.',
    };
  }
}

export async function loadWorkspaceFromIndexedDb(userId?: string | null): Promise<WorkspaceBundle> {
  const res = await loadWorkspaceScoped(userId);
  return res.workspace;
}

export async function saveWorkspaceToIndexedDb(
  workspace: WorkspaceBundle,
  userId?: string | null
): Promise<{ ok: boolean; error?: string }> {
  return saveWorkspaceScoped(workspace, userId);
}

export function downloadTextFile(filename: string, content: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export function slugifyFilename(title: string, fallback = 'halaman-usaha'): string {
  return (
    title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || fallback
  );
}
