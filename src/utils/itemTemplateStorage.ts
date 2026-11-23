import { BuilderBlock, SavedItemTemplate, SavedItemTemplateTarget } from '../types/builder';
import { createId } from '../data/presets';
import { cloneBlockDeep } from './treeHelpers';

const IDB_NAME = 'lynk_builder_item_templates_v1';
const IDB_STORE = 'templates';
const IDB_VERSION = 1;
const LS_PREFIX = 'lynk_builder_item_templates_v1:';

function scopeKey(userId?: string | null): string {
  const clean = (userId ?? '').trim();
  return clean ? `user:${clean}` : 'anon';
}

function openTemplatesDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(IDB_STORE)) {
          db.createObjectStore(IDB_STORE);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

function sanitizeTemplatesList(raw: unknown): SavedItemTemplate[] {
  if (!Array.isArray(raw)) return [];
  const valid: SavedItemTemplate[] = [];
  for (const item of raw) {
    if (!item || typeof item !== 'object') continue;
    const rec = item as Partial<SavedItemTemplate>;
    if (
      typeof rec.id !== 'string' ||
      typeof rec.name !== 'string' ||
      !rec.block ||
      typeof rec.block !== 'object' ||
      typeof rec.block.type !== 'string'
    ) {
      continue;
    }
    valid.push({
      id: rec.id,
      name: rec.name.trim() || rec.block.label || 'Item Template',
      description: typeof rec.description === 'string' ? rec.description : '',
      target: rec.target === 'alat' ? 'alat' : 'blok',
      blockType: rec.blockType ?? rec.block.type,
      block: rec.block,
      createdAt: typeof rec.createdAt === 'number' ? rec.createdAt : Date.now(),
      updatedAt: typeof rec.updatedAt === 'number' ? rec.updatedAt : Date.now(),
    });
  }
  return valid;
}

export function loadItemTemplatesSync(userId?: string | null): SavedItemTemplate[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(`${LS_PREFIX}${scopeKey(userId)}`);
    if (!raw) return [];
    return sanitizeTemplatesList(JSON.parse(raw));
  } catch {
    return [];
  }
}

export async function loadItemTemplates(userId?: string | null): Promise<SavedItemTemplate[]> {
  const key = scopeKey(userId);
  const db = await openTemplatesDb();
  if (db) {
    try {
      const result = await new Promise<unknown>((resolve) => {
        const tx = db.transaction(IDB_STORE, 'readonly');
        const store = tx.objectStore(IDB_STORE);
        const req = store.get(key);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
      });
      if (Array.isArray(result)) {
        return sanitizeTemplatesList(result);
      }
    } catch {
      // fallback to localStorage
    }
  }
  return loadItemTemplatesSync(userId);
}

export async function saveItemTemplates(
  templates: SavedItemTemplate[],
  userId?: string | null
): Promise<void> {
  const key = scopeKey(userId);
  const db = await openTemplatesDb();
  if (db) {
    try {
      await new Promise<void>((resolve, reject) => {
        const tx = db.transaction(IDB_STORE, 'readwrite');
        const store = tx.objectStore(IDB_STORE);
        store.put(templates, key);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error);
      });
    } catch {
      // ignore idb write error, fallback below
    }
  }
  if (typeof window !== 'undefined') {
    try {
      window.localStorage.setItem(`${LS_PREFIX}${key}`, JSON.stringify(templates));
    } catch {
      // localStorage quota may be exceeded when templates include base64 images; IndexedDB holds them safely
    }
  }
}

export function createSavedItemTemplate(
  block: BuilderBlock,
  options: {
    name: string;
    description?: string;
    target: SavedItemTemplateTarget;
  }
): SavedItemTemplate {
  const now = Date.now();
  const snapshot = cloneBlockDeep(block);
  const cleanName = options.name.trim() || snapshot.label || 'Item Template';
  snapshot.label = cleanName;
  return {
    id: createId('item_tpl'),
    name: cleanName,
    description: options.description?.trim() ?? '',
    target: options.target,
    blockType: snapshot.type,
    block: snapshot,
    createdAt: now,
    updatedAt: now,
  };
}

export function countNestedBlocks(blocks: BuilderBlock[]): number {
  let count = 0;
  for (const blk of blocks) {
    count += 1;
    if (blk.children?.length) count += countNestedBlocks(blk.children);
    if (blk.content?.cardFooterBlocks?.length) {
      count += countNestedBlocks(blk.content.cardFooterBlocks);
    }
    if (blk.content?.actionSheetBlocks?.length) {
      count += countNestedBlocks(blk.content.actionSheetBlocks);
    }
  }
  return count;
}
