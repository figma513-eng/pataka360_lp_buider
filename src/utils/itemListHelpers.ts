/**
 * Pure helper utilities for DATA & DAFTAR ITEM removal and independent
 * Cover / Foto content updates.
 */

/**
 * Removes strictly ONE selected item from a list.
 * - If `targetIndex` is valid and matches `targetId` (or `targetId` is empty), removes that exact index.
 * - Otherwise finds the first item whose `id === targetId` and removes only that single entry.
 * - Never mutates the original array and never removes multiple items if duplicate IDs exist.
 */
export function removeSelectedItemByIdOrIndex<T extends { id?: string }>(
  items: readonly T[],
  targetId?: string,
  targetIndex?: number
): T[] {
  if (!Array.isArray(items) || items.length === 0) return [];

  if (
    typeof targetIndex === 'number' &&
    Number.isInteger(targetIndex) &&
    targetIndex >= 0 &&
    targetIndex < items.length
  ) {
    const candidate = items[targetIndex];
    if (!targetId || candidate?.id === targetId) {
      return [...items.slice(0, targetIndex), ...items.slice(targetIndex + 1)];
    }
  }

  if (targetId) {
    const idx = items.findIndex((item) => item.id === targetId);
    if (idx !== -1) {
      return [...items.slice(0, idx), ...items.slice(idx + 1)];
    }
  }

  return [...items];
}
