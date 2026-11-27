import type {
  BlockType,
  BuilderBlock,
  CategoryJumpItem,
} from '../types/builder.ts';

export interface CategoryCardTarget {
  key: string; // `${blockId}::${itemId}`
  blockId: string;
  itemId: string;
  title: string;
  subtitle?: string;
}

export interface CategoryTargetGroup {
  blockId: string;
  label: string;
  type: BlockType;
  depth: number;
  cards: CategoryCardTarget[];
}

const SHOW_ALL_KEYWORDS = new Set([
  'semua',
  'all',
  'semua menu',
  'semua produk',
  'semua kategori',
  'tampilkan semua',
]);

const STRUCTURAL_TYPES = new Set<BlockType>([
  'category_tabs',
  'hero_profile',
  'back_button',
  'divider',
  'bottom_sheet',
]);

export function stripHtmlTags(raw?: string): string {
  if (!raw) return '';
  return String(raw)
    .replace(/<[^>]*>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isShowAllCategoryButton(btn: CategoryJumpItem | null | undefined): boolean {
  if (!btn) return true;
  if (btn.isShowAll) return true;
  const lbl = (btn.label || '').trim().toLowerCase();
  const tgt = (btn.targetTitle || '').trim().toLowerCase();
  return SHOW_ALL_KEYWORDS.has(lbl) || SHOW_ALL_KEYWORDS.has(tgt);
}

export function isStructuralCategoryBlock(block: BuilderBlock): boolean {
  return STRUCTURAL_TYPES.has(block.type);
}

export function extractBlockCards(block: BuilderBlock): CategoryCardTarget[] {
  const c = block.content || {};
  const bid = block.id;
  const out: CategoryCardTarget[] = [];

  switch (block.type) {
    case 'culinary_spin_slider':
      (c.culinarySpinItems ?? []).forEach((it, idx) => {
        const itemId = it.id || `dish_${idx}`;
        out.push({
          key: `${bid}::${itemId}`,
          blockId: bid,
          itemId,
          title: (it.title || `Menu ${idx + 1}`).trim(),
          subtitle: it.price || it.badge || it.subtitle || undefined,
        });
      });
      break;
    case 'fnb_hero_slider':
      (c.fnbSliderItems ?? []).forEach((it, idx) => {
        const itemId = it.id || `slide_${idx}`;
        out.push({
          key: `${bid}::${itemId}`,
          blockId: bid,
          itemId,
          title: (it.title || `Slide ${idx + 1}`).trim(),
          subtitle: it.price || it.badge || it.subtitle || undefined,
        });
      });
      break;
    case 'floating_product_studio':
      (c.floatingStudioItems ?? []).forEach((it, idx) => {
        const itemId = it.id || `studio_${idx}`;
        out.push({
          key: `${bid}::${itemId}`,
          blockId: bid,
          itemId,
          title: (it.title || `Produk ${idx + 1}`).trim(),
          subtitle: it.price || it.badge || it.subtitle || undefined,
        });
      });
      break;
    case 'interactive_box_showcase':
      (c.boxShowcaseItems ?? []).forEach((it, idx) => {
        const itemId = it.id || `box_${idx}`;
        out.push({
          key: `${bid}::${itemId}`,
          blockId: bid,
          itemId,
          title: (it.title || `Box ${idx + 1}`).trim(),
          subtitle: it.category || it.price || undefined,
        });
      });
      break;
    case 'product_box_reveal':
      (c.boxRevealItems ?? []).forEach((it, idx) => {
        const itemId = it.id || `reveal_${idx}`;
        out.push({
          key: `${bid}::${itemId}`,
          blockId: bid,
          itemId,
          title: (it.title || `Kotak ${idx + 1}`).trim(),
          subtitle: it.price || undefined,
        });
      });
      break;
    case 'fnb_catalog':
      (c.fnbItems ?? []).forEach((it, idx) => {
        const itemId = it.id || `fnb_${idx}`;
        out.push({
          key: `${bid}::${itemId}`,
          blockId: bid,
          itemId,
          title: (it.title || `Menu ${idx + 1}`).trim(),
          subtitle: it.category || it.price || undefined,
        });
      });
      break;
    case 'catalog':
      (c.catalogItems ?? []).forEach((it, idx) => {
        const itemId = it.id || `cat_${idx}`;
        out.push({
          key: `${bid}::${itemId}`,
          blockId: bid,
          itemId,
          title: (it.title || `Produk ${idx + 1}`).trim(),
          subtitle: it.subtitle || it.price || undefined,
        });
      });
      break;
    case 'training_catalog':
      (c.trainingPrograms ?? []).forEach((it, idx) => {
        const itemId = it.id || `trn_${idx}`;
        out.push({
          key: `${bid}::${itemId}`,
          blockId: bid,
          itemId,
          title: (it.title || `Program ${idx + 1}`).trim(),
          subtitle: it.price || undefined,
        });
      });
      break;
    case 'carousel':
      (c.carouselItems ?? []).forEach((it, idx) => {
        const itemId = it.id || `car_${idx}`;
        out.push({
          key: `${bid}::${itemId}`,
          blockId: bid,
          itemId,
          title: (it.title || `Foto ${idx + 1}`).trim(),
          subtitle: it.caption || undefined,
        });
      });
      break;
    case 'mix_rasa':
      (c.mixRasaFlavors ?? []).forEach((it, idx) => {
        const itemId = it.id || `flv_${idx}`;
        out.push({
          key: `${bid}::${itemId}`,
          blockId: bid,
          itemId,
          title: (it.name || `Rasa ${idx + 1}`).trim(),
          subtitle: it.price || undefined,
        });
      });
      break;
    case 'slide_mix_rasa':
      (c.slideMixFlavors ?? []).forEach((it, idx) => {
        const itemId = it.id || `smr_${idx}`;
        out.push({
          key: `${bid}::${itemId}`,
          blockId: bid,
          itemId,
          title: (it.name || `Rasa ${idx + 1}`).trim(),
          subtitle: it.price || undefined,
        });
      });
      break;
    default:
      break;
  }

  return out;
}

export function extractBlockPrimaryTitle(block: BuilderBlock): string {
  const c = block.content || {};
  switch (block.type) {
    case 'culinary_spin_slider': {
      const items = c.culinarySpinItems ?? [];
      if (items.length > 0 && items[0].title?.trim()) {
        return items.length > 1
          ? `${items[0].title.trim()} (+${items.length - 1})`
          : items[0].title.trim();
      }
      break;
    }
    case 'fnb_hero_slider': {
      const items = c.fnbSliderItems ?? [];
      if (items.length > 0 && items[0].title?.trim()) {
        return items.length > 1
          ? `${items[0].title.trim()} (+${items.length - 1})`
          : items[0].title.trim();
      }
      break;
    }
    case 'floating_product_studio': {
      const items = c.floatingStudioItems ?? [];
      if (items.length > 0 && items[0].title?.trim()) {
        return items.length > 1
          ? `${items[0].title.trim()} (+${items.length - 1})`
          : items[0].title.trim();
      }
      break;
    }
    case 'interactive_box_showcase': {
      const items = c.boxShowcaseItems ?? [];
      if (items.length > 0 && items[0].title?.trim()) {
        return items.length > 1
          ? `${items[0].title.trim()} (+${items.length - 1})`
          : items[0].title.trim();
      }
      break;
    }
    case 'product_box_reveal': {
      const items = c.boxRevealItems ?? [];
      if (items.length > 0 && items[0].title?.trim()) {
        return items.length > 1
          ? `${items[0].title.trim()} (+${items.length - 1})`
          : items[0].title.trim();
      }
      break;
    }
    case 'mix_rasa':
      if (c.mixRasaTitle?.trim()) return c.mixRasaTitle.trim();
      break;
    case 'slide_mix_rasa':
      if (c.slideMixTitle?.trim()) return c.slideMixTitle.trim();
      break;
    case 'showcase_card':
      if (c.cardTitle?.trim()) return c.cardTitle.trim();
      if (c.cardHeaderTitle?.trim()) return c.cardHeaderTitle.trim();
      break;
    case 'training_catalog':
      if (c.trainingHeading?.trim()) return c.trainingHeading.trim();
      break;
    case 'text': {
      const plain = stripHtmlTags(c.text);
      if (plain) return plain.slice(0, 48);
      break;
    }
    case 'button':
      if (c.label?.trim()) return c.label.trim();
      break;
    case 'cart_button':
      if (c.cartProductName?.trim()) return c.cartProductName.trim();
      break;
    case 'maps_place':
      if (c.mapsTitle?.trim()) return c.mapsTitle.trim();
      break;
    case 'hero_profile':
      if (c.heroTitle?.trim()) return c.heroTitle.trim();
      break;
    default:
      break;
  }
  return block.label?.trim() || block.type;
}

export function extractBlockSearchText(block: BuilderBlock): string {
  const c = block.content || {};
  const parts: string[] = [];
  const push = (val?: string | null) => {
    const clean = stripHtmlTags(val || '').toLowerCase();
    if (clean && !parts.includes(clean)) parts.push(clean);
  };

  push(block.label);
  push(c.text);
  push(c.heroTitle);
  push(c.label);
  push(c.cardTitle);
  push(c.cardHeaderTitle);
  push(c.cardBadge);
  push(c.cardSubtitle);
  push(c.mixRasaTitle);
  push(c.mixRasaProductSize);
  push(c.slideMixTitle);
  push(c.slideMixProductSize);
  push(c.trainingHeading);
  push(c.trainingSubheading);
  push(c.mapsTitle);
  push(c.cartProductName);
  push(c.universalCartName);
  push(c.boxShowcaseBrandLabel);
  push(c.socialFeedAccountName);

  for (const card of extractBlockCards(block)) {
    push(card.title);
    push(card.subtitle);
  }

  if (Array.isArray(block.children)) {
    for (const ch of block.children) {
      const sub = extractBlockSearchText(ch);
      if (sub) parts.push(sub);
    }
  }

  return parts.join(' | ').slice(0, 600);
}

export function listCategoryTargets(
  blocks: BuilderBlock[],
  excludeBlockId?: string,
  depth = 0
): CategoryTargetGroup[] {
  const result: CategoryTargetGroup[] = [];
  for (const blk of blocks) {
    if (blk.id === excludeBlockId) continue;
    if (blk.type !== 'category_tabs' && blk.type !== 'divider') {
      result.push({
        blockId: blk.id,
        label: extractBlockPrimaryTitle(blk),
        type: blk.type,
        depth,
        cards: extractBlockCards(blk),
      });
    }
    if (Array.isArray(blk.children) && blk.children.length > 0) {
      result.push(...listCategoryTargets(blk.children, excludeBlockId, depth + 1));
    }
  }
  return result;
}

function collectDescendantIds(block: BuilderBlock): string[] {
  const ids: string[] = [block.id];
  if (Array.isArray(block.children)) {
    for (const ch of block.children) {
      ids.push(...collectDescendantIds(ch));
    }
  }
  return ids;
}

export function matchesCategoryFilter(
  block: BuilderBlock,
  activeButton: CategoryJumpItem | null
): boolean {
  if (!activeButton || isShowAllCategoryButton(activeButton)) return true;
  if (isStructuralCategoryBlock(block)) return true;

  const explicitIds = Array.isArray(activeButton.targetIds)
    ? activeButton.targetIds.filter(Boolean)
    : [];

  if (explicitIds.length > 0) {
    const allIds = collectDescendantIds(block);
    const idSet = new Set(allIds);
    for (const target of explicitIds) {
      const sep = target.indexOf('::');
      const targetBlockId = sep === -1 ? target : target.slice(0, sep);
      if (idSet.has(targetBlockId)) return true;
    }
    return false;
  }

  const query = (activeButton.targetTitle || activeButton.label || '').trim().toLowerCase();
  if (!query) return true;

  const haystack = extractBlockSearchText(block);
  if (!haystack) return false;
  return haystack.includes(query);
}

/**
 * Returns a block whose internal cards/items (or container/row children) are filtered
 * to match the active category button, while keeping untouched blocks intact.
 */
export function filterBlockCardsForCategory(
  block: BuilderBlock,
  activeButton: CategoryJumpItem | null
): BuilderBlock {
  if (!activeButton || isShowAllCategoryButton(activeButton)) return block;
  if (isStructuralCategoryBlock(block)) return block;

  const explicitIds = Array.isArray(activeButton.targetIds)
    ? activeButton.targetIds.filter(Boolean)
    : [];

  // If the entire block itself was explicitly linked, keep all of its cards visible
  if (explicitIds.includes(block.id)) {
    return block;
  }

  // Collect card-level itemIds explicitly linked to this block (`${block.id}::${itemId}`)
  const prefix = `${block.id}::`;
  const linkedItemIds = new Set(
    explicitIds
      .filter((id) => id.startsWith(prefix))
      .map((id) => id.slice(prefix.length))
      .filter(Boolean)
  );

  const query = (activeButton.targetTitle || activeButton.label || '').trim().toLowerCase();

  const shouldFilterList = <T extends { id?: string }>(
    list: T[] | undefined,
    fallbackPrefix: string,
    getText: (item: T) => string
  ): T[] | undefined => {
    if (!Array.isArray(list) || list.length === 0) return list;
    if (linkedItemIds.size > 0) {
      const filtered = list.filter((it, idx) =>
        linkedItemIds.has(it.id || `${fallbackPrefix}_${idx}`)
      );
      return filtered.length > 0 ? filtered : list;
    }
    if (explicitIds.length > 0 || !query) return list;
    // Keyword auto-filter on individual cards when only a subset of cards match
    const filtered = list.filter((it) => getText(it).toLowerCase().includes(query));
    if (filtered.length > 0 && filtered.length < list.length) {
      return filtered;
    }
    return list;
  };

  const c = block.content;
  let nextContent = c;

  switch (block.type) {
    case 'culinary_spin_slider': {
      const filtered = shouldFilterList(
        c.culinarySpinItems,
        'dish',
        (it) => `${it.title || ''} ${it.subtitle || ''} ${it.badge || ''} ${it.description || ''}`
      );
      if (filtered !== c.culinarySpinItems) nextContent = { ...c, culinarySpinItems: filtered };
      break;
    }
    case 'fnb_hero_slider': {
      const filtered = shouldFilterList(
        c.fnbSliderItems,
        'slide',
        (it) => `${it.title || ''} ${it.subtitle || ''} ${it.badge || ''} ${it.description || ''}`
      );
      if (filtered !== c.fnbSliderItems) nextContent = { ...c, fnbSliderItems: filtered };
      break;
    }
    case 'floating_product_studio': {
      const filtered = shouldFilterList(
        c.floatingStudioItems,
        'studio',
        (it) => `${it.title || ''} ${it.subtitle || ''} ${it.badge || ''} ${it.description || ''}`
      );
      if (filtered !== c.floatingStudioItems) nextContent = { ...c, floatingStudioItems: filtered };
      break;
    }
    case 'interactive_box_showcase': {
      const filtered = shouldFilterList(
        c.boxShowcaseItems,
        'box',
        (it) => `${it.title || ''} ${it.category || ''} ${it.description || ''}`
      );
      if (filtered !== c.boxShowcaseItems) nextContent = { ...c, boxShowcaseItems: filtered };
      break;
    }
    case 'product_box_reveal': {
      const filtered = shouldFilterList(
        c.boxRevealItems,
        'reveal',
        (it) => `${it.title || ''} ${it.description || ''}`
      );
      if (filtered !== c.boxRevealItems) nextContent = { ...c, boxRevealItems: filtered };
      break;
    }
    case 'fnb_catalog': {
      const filtered = shouldFilterList(
        c.fnbItems,
        'fnb',
        (it) => `${it.title || ''} ${it.category || ''} ${it.description || ''}`
      );
      if (filtered !== c.fnbItems) nextContent = { ...c, fnbItems: filtered };
      break;
    }
    case 'catalog': {
      const filtered = shouldFilterList(
        c.catalogItems,
        'cat',
        (it) => `${it.title || ''} ${it.subtitle || ''} ${it.description || ''}`
      );
      if (filtered !== c.catalogItems) nextContent = { ...c, catalogItems: filtered };
      break;
    }
    case 'training_catalog': {
      const filtered = shouldFilterList(
        c.trainingPrograms,
        'trn',
        (it) => `${it.title || ''} ${it.description || ''}`
      );
      if (filtered !== c.trainingPrograms) nextContent = { ...c, trainingPrograms: filtered };
      break;
    }
    case 'carousel': {
      const filtered = shouldFilterList(
        c.carouselItems,
        'car',
        (it) => `${it.title || ''} ${it.caption || ''}`
      );
      if (filtered !== c.carouselItems) nextContent = { ...c, carouselItems: filtered };
      break;
    }
    default:
      break;
  }

  let nextChildren = block.children;
  if (Array.isArray(block.children) && block.children.length > 0) {
    const filteredChildren = block.children
      .filter((ch) => matchesCategoryFilter(ch, activeButton))
      .map((ch) => filterBlockCardsForCategory(ch, activeButton));
    if (filteredChildren.length > 0) {
      nextChildren = filteredChildren;
    }
  }

  if (nextContent === c && nextChildren === block.children) return block;
  return {
    ...block,
    content: nextContent,
    children: nextChildren,
  };
}

export function findCategoryJumpTarget(
  blocks: BuilderBlock[],
  button: CategoryJumpItem
): { blockId: string; itemId?: string } | null {
  const explicitIds = Array.isArray(button.targetIds) ? button.targetIds.filter(Boolean) : [];
  if (explicitIds.length > 0) {
    const first = explicitIds[0];
    const sep = first.indexOf('::');
    if (sep === -1) return { blockId: first };
    return { blockId: first.slice(0, sep), itemId: first.slice(sep + 2) };
  }

  const query = (button.targetTitle || button.label || '').trim().toLowerCase();
  if (!query) return null;

  const flat = listCategoryTargets(blocks);
  // 1. Exact block title/label match
  for (const grp of flat) {
    if (grp.label.trim().toLowerCase() === query) {
      return { blockId: grp.blockId };
    }
  }
  // 2. Exact card title/subtitle match inside any block
  for (const grp of flat) {
    for (const card of grp.cards) {
      if (
        card.title.trim().toLowerCase() === query ||
        (card.subtitle || '').trim().toLowerCase() === query
      ) {
        return { blockId: grp.blockId, itemId: card.itemId };
      }
    }
  }
  // 3. Partial block label or card match
  for (const grp of flat) {
    if (grp.label.trim().toLowerCase().includes(query)) {
      return { blockId: grp.blockId };
    }
    for (const card of grp.cards) {
      const combined = `${card.title} ${card.subtitle || ''}`.toLowerCase();
      if (combined.includes(query)) {
        return { blockId: grp.blockId, itemId: card.itemId };
      }
    }
  }

  // 4. Deep fallback on full block search text
  const walk = (list: BuilderBlock[]): { blockId: string } | null => {
    for (const blk of list) {
      if (blk.type !== 'category_tabs' && extractBlockSearchText(blk).includes(query)) {
        return { blockId: blk.id };
      }
      if (blk.children?.length) {
        const hit = walk(blk.children);
        if (hit) return hit;
      }
    }
    return null;
  };
  return walk(blocks);
}
