import type { BuilderBlock } from '../types/builder.ts';
import { createId } from '../data/presets.ts';

export function isContainerBlockType(type: BuilderBlock['type']): boolean {
  return (
    type === 'container' ||
    type === 'row' ||
    type === 'toggle_container' ||
    type === 'bottom_sheet' ||
    type === 'menu_icon' ||
    type === 'showcase_card' ||
    type === 'hero_profile' ||
    type === 'fnb_catalog'
  );
}

export function findBlockById(blocks: BuilderBlock[], id: string | null): BuilderBlock | null {
  if (!id) return null;
  for (const block of blocks) {
    if (block.id === id) return block;
    if (block.children) {
      const found = findBlockById(block.children, id);
      if (found) return found;
    }
    if (block.content?.actionSheetBlocks?.length) {
      const foundInSheet = findBlockById(block.content.actionSheetBlocks, id);
      if (foundInSheet) return foundInSheet;
    }
    if (block.content?.cardFooterBlocks?.length) {
      const foundInFooter = findBlockById(block.content.cardFooterBlocks, id);
      if (foundInFooter) return foundInFooter;
    }
  }
  return null;
}

export function findParentBlockId(
  blocks: BuilderBlock[],
  targetId: string | null,
  parentId: string | null = null
): string | null {
  if (!targetId) return null;
  for (const block of blocks) {
    if (block.id === targetId) return parentId;
    if (block.children?.length) {
      const found = findParentBlockId(block.children, targetId, block.id);
      if (found !== null) return found;
    }
    if (block.content?.actionSheetBlocks?.length) {
      const found = findParentBlockId(block.content.actionSheetBlocks, targetId, block.id);
      if (found !== null) return found;
    }
    if (block.content?.cardFooterBlocks?.length) {
      const found = findParentBlockId(block.content.cardFooterBlocks, targetId, block.id);
      if (found !== null) return found;
    }
  }
  return null;
}

export function updateBlockById(
  blocks: BuilderBlock[],
  id: string,
  updater: (block: BuilderBlock) => BuilderBlock
): BuilderBlock[] {
  return blocks.map((block) => {
    if (block.id === id) {
      return updater(block);
    }
    let next = block;
    if (block.children) {
      const updatedChildren = updateBlockById(block.children, id, updater);
      if (updatedChildren !== block.children) {
        next = { ...next, children: updatedChildren };
      }
    }
    if (block.content?.actionSheetBlocks?.length) {
      const updatedSheet = updateBlockById(block.content.actionSheetBlocks, id, updater);
      if (updatedSheet !== block.content.actionSheetBlocks) {
        next = {
          ...next,
          content: {
            ...next.content,
            actionSheetBlocks: updatedSheet,
          },
        };
      }
    }
    if (block.content?.cardFooterBlocks?.length) {
      const updatedFooter = updateBlockById(block.content.cardFooterBlocks, id, updater);
      if (updatedFooter !== block.content.cardFooterBlocks) {
        next = {
          ...next,
          content: {
            ...next.content,
            cardFooterBlocks: updatedFooter,
          },
        };
      }
    }
    return next;
  });
}

export function deleteBlockById(blocks: BuilderBlock[], id: string): BuilderBlock[] {
  return blocks
    .filter((block) => block.id !== id)
    .map((block) => {
      let next = block;
      if (block.children) {
        next = { ...next, children: deleteBlockById(block.children, id) };
      }
      if (block.content?.actionSheetBlocks?.length) {
        next = {
          ...next,
          content: {
            ...next.content,
            actionSheetBlocks: deleteBlockById(block.content.actionSheetBlocks, id),
          },
        };
      }
      if (block.content?.cardFooterBlocks?.length) {
        next = {
          ...next,
          content: {
            ...next.content,
            cardFooterBlocks: deleteBlockById(block.content.cardFooterBlocks, id),
          },
        };
      }
      return next;
    });
}

export function cloneBlockDeep(block: BuilderBlock): BuilderBlock {
  return {
    ...block,
    id: createId(block.type.slice(0, 3)),
    style: {
      ...block.style,
      themeOverrideTokens: block.style.themeOverrideTokens
        ? { ...block.style.themeOverrideTokens }
        : undefined,
      responsive: block.style.responsive
        ? {
            ...(block.style.responsive.tablet
              ? { tablet: { ...block.style.responsive.tablet } }
              : {}),
            ...(block.style.responsive.mobile
              ? { mobile: { ...block.style.responsive.mobile } }
              : {}),
          }
        : undefined,
    },
    content: {
      ...block.content,
      catalogItems: block.content.catalogItems?.map((it) => ({
        ...it,
        id: createId('item'),
        gallery: it.gallery ? [...it.gallery] : undefined,
      })),
      socialItems: block.content.socialItems?.map((it) => ({
        ...it,
        id: createId(`soc_${it.platform}`),
      })),
      carouselItems: block.content.carouselItems?.map((it) => ({
        ...it,
        id: createId('slide'),
      })),
      socialFeedPosts: block.content.socialFeedPosts?.map((it) => ({
        ...it,
        id: createId('sfp'),
      })),
      socialFollowerAccounts: block.content.socialFollowerAccounts?.map((it) => ({
        ...it,
        id: createId('sfa'),
      })),
      catalogShippingOptions: block.content.catalogShippingOptions?.map((it) => ({
        ...it,
        checklistItems: it.checklistItems ? [...it.checklistItems] : undefined,
      })),
      catalogCustomerFields: block.content.catalogCustomerFields?.map((it) => ({
        ...it,
        id: createId('cf'),
        options: it.options ? [...it.options] : undefined,
        requiredOptionIndexes: it.requiredOptionIndexes
          ? [...it.requiredOptionIndexes]
          : undefined,
      })),
      trainingPrograms: block.content.trainingPrograms?.map((it) => ({
        ...it,
        id: createId('trp'),
      })),
      trainingCustomBoxes: block.content.trainingCustomBoxes?.map((it) => ({
        ...it,
        id: createId('trb'),
      })),
      trainingMedia: block.content.trainingMedia?.map((it) => ({
        ...it,
        id: createId('trm'),
      })),
      trainingChecklistItems: block.content.trainingChecklistItems
        ? [...block.content.trainingChecklistItems]
        : undefined,
      trainingFormFields: block.content.trainingFormFields?.map((it) => ({
        ...it,
        id: createId('tf'),
        options: it.options ? [...it.options] : undefined,
        requiredOptionIndexes: it.requiredOptionIndexes
          ? [...it.requiredOptionIndexes]
          : undefined,
      })),
      fnbItems: block.content.fnbItems?.map((it) => ({
        ...it,
        id: createId('fnb'),
      })),
      categoryButtons: block.content.categoryButtons?.map((it) => ({
        ...it,
        id: createId('catbtn'),
        targetIds: it.targetIds ? [...it.targetIds] : undefined,
      })),
      formFields: block.content.formFields?.map((it) => ({
        ...it,
        id: createId('fld'),
        options: it.options ? [...it.options] : undefined,
        requiredOptionIndexes: it.requiredOptionIndexes
          ? [...it.requiredOptionIndexes]
          : undefined,
      })),
      formChecklistItems: block.content.formChecklistItems
        ? [...block.content.formChecklistItems]
        : undefined,
      cardGalleryImages: block.content.cardGalleryImages
        ? [...block.content.cardGalleryImages]
        : undefined,
      cardFeeItems: block.content.cardFeeItems?.map((it) => ({
        ...it,
        id: createId('fee'),
      })),
      actionSheetBlocks: block.content.actionSheetBlocks
        ? block.content.actionSheetBlocks.map(cloneBlockDeep)
        : undefined,
      cardFooterBlocks: block.content.cardFooterBlocks
        ? block.content.cardFooterBlocks.map(cloneBlockDeep)
        : undefined,
    },
    children: block.children ? block.children.map(cloneBlockDeep) : undefined,
  };
}

export function duplicateBlockById(blocks: BuilderBlock[], id: string): {
  nextBlocks: BuilderBlock[];
  clonedId: string | null;
} {
  let clonedId: string | null = null;
  const nextBlocks: BuilderBlock[] = [];

  for (const block of blocks) {
    if (block.id === id) {
      const clone = cloneBlockDeep(block);
      clone.label = `${block.label} (Salinan)`;
      clonedId = clone.id;
      nextBlocks.push(block, clone);
    } else {
      let next = block;
      if (block.children) {
        const res = duplicateBlockById(block.children, id);
        if (res.clonedId) clonedId = res.clonedId;
        next = { ...next, children: res.nextBlocks };
      }
      if (block.content?.actionSheetBlocks?.length) {
        const resSheet = duplicateBlockById(block.content.actionSheetBlocks, id);
        if (resSheet.clonedId) clonedId = resSheet.clonedId;
        next = {
          ...next,
          content: {
            ...next.content,
            actionSheetBlocks: resSheet.nextBlocks,
          },
        };
      }
      if (block.content?.cardFooterBlocks?.length) {
        const resFooter = duplicateBlockById(block.content.cardFooterBlocks, id);
        if (resFooter.clonedId) clonedId = resFooter.clonedId;
        next = {
          ...next,
          content: {
            ...next.content,
            cardFooterBlocks: resFooter.nextBlocks,
          },
        };
      }
      nextBlocks.push(next);
    }
  }

  return { nextBlocks, clonedId };
}

export function moveBlockInTree(
  blocks: BuilderBlock[],
  id: string,
  direction: 'up' | 'down'
): BuilderBlock[] {
  const index = blocks.findIndex((b) => b.id === id);
  if (index !== -1) {
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= blocks.length) return blocks;
    const copy = [...blocks];
    const [moved] = copy.splice(index, 1);
    copy.splice(targetIndex, 0, moved);
    return copy;
  }

  return blocks.map((block) => {
    let next = block;
    if (block.children) {
      next = { ...next, children: moveBlockInTree(block.children, id, direction) };
    }
    if (block.content?.actionSheetBlocks?.length) {
      next = {
        ...next,
        content: {
          ...next.content,
          actionSheetBlocks: moveBlockInTree(block.content.actionSheetBlocks, id, direction),
        },
      };
    }
    if (block.content?.cardFooterBlocks?.length) {
      next = {
        ...next,
        content: {
          ...next.content,
          cardFooterBlocks: moveBlockInTree(block.content.cardFooterBlocks, id, direction),
        },
      };
    }
    return next;
  });
}

export function insertChildIntoContainer(
  blocks: BuilderBlock[],
  containerId: string,
  newChild: BuilderBlock
): BuilderBlock[] {
  return blocks.map((block) => {
    if (block.id === containerId && isContainerBlockType(block.type)) {
      return {
        ...block,
        children: [...(block.children ?? []), newChild],
      };
    }
    let next = block;
    if (block.children) {
      next = {
        ...next,
        children: insertChildIntoContainer(block.children, containerId, newChild),
      };
    }
    if (block.content?.actionSheetBlocks?.length) {
      next = {
        ...next,
        content: {
          ...next.content,
          actionSheetBlocks: insertChildIntoContainer(
            block.content.actionSheetBlocks,
            containerId,
            newChild
          ),
        },
      };
    }
    if (block.content?.cardFooterBlocks?.length) {
      next = {
        ...next,
        content: {
          ...next.content,
          cardFooterBlocks: insertChildIntoContainer(
            block.content.cardFooterBlocks,
            containerId,
            newChild
          ),
        },
      };
    }
    return next;
  });
}

export function insertBlockIntoActionSheet(
  blocks: BuilderBlock[],
  ownerId: string,
  newChild: BuilderBlock
): BuilderBlock[] {
  return updateBlockById(blocks, ownerId, (block) => ({
    ...block,
    content: {
      ...block.content,
      actionSheetBlocks: [...(block.content.actionSheetBlocks ?? []), newChild],
    },
  }));
}

export function insertBlockIntoCardFooter(
  blocks: BuilderBlock[],
  cardId: string,
  newChild: BuilderBlock
): BuilderBlock[] {
  return updateBlockById(blocks, cardId, (block) => ({
    ...block,
    content: {
      ...block.content,
      cardFooterBlocks: [...(block.content.cardFooterBlocks ?? []), newChild],
    },
  }));
}

function containsBlockId(node: BuilderBlock, id: string): boolean {
  if (node.id === id) return true;
  if (node.children?.some((child) => containsBlockId(child, id))) return true;
  if (node.content?.actionSheetBlocks?.some((child) => containsBlockId(child, id))) return true;
  if (node.content?.cardFooterBlocks?.some((child) => containsBlockId(child, id))) return true;
  return false;
}

function extractBlockById(
  blocks: BuilderBlock[],
  id: string
): { extracted: BuilderBlock | null; remaining: BuilderBlock[] } {
  let extracted: BuilderBlock | null = null;
  const remaining: BuilderBlock[] = [];

  for (const block of blocks) {
    if (block.id === id) {
      extracted = block;
      continue;
    }
    let next = block;
    if (block.children) {
      const childRes = extractBlockById(block.children, id);
      if (childRes.extracted) {
        extracted = childRes.extracted;
        next = { ...next, children: childRes.remaining };
      }
    }
    if (!extracted && block.content?.actionSheetBlocks?.length) {
      const sheetRes = extractBlockById(block.content.actionSheetBlocks, id);
      if (sheetRes.extracted) {
        extracted = sheetRes.extracted;
        next = {
          ...next,
          content: {
            ...next.content,
            actionSheetBlocks: sheetRes.remaining,
          },
        };
      }
    }
    if (!extracted && block.content?.cardFooterBlocks?.length) {
      const footerRes = extractBlockById(block.content.cardFooterBlocks, id);
      if (footerRes.extracted) {
        extracted = footerRes.extracted;
        next = {
          ...next,
          content: {
            ...next.content,
            cardFooterBlocks: footerRes.remaining,
          },
        };
      }
    }
    remaining.push(next);
  }

  return { extracted, remaining };
}

export function insertBlocksAtTarget(
  blocks: BuilderBlock[],
  toInsert: BuilderBlock[],
  targetId: string,
  position: 'before' | 'after' | 'inside'
): BuilderBlock[] {
  if (position === 'inside') {
    return blocks.map((block) => {
      if (block.id === targetId && isContainerBlockType(block.type)) {
        return { ...block, children: [...(block.children ?? []), ...toInsert] };
      }
      let next = block;
      if (block.children) {
        next = {
          ...next,
          children: insertBlocksAtTarget(block.children, toInsert, targetId, position),
        };
      }
      if (block.content?.actionSheetBlocks?.length) {
        next = {
          ...next,
          content: {
            ...next.content,
            actionSheetBlocks: insertBlocksAtTarget(
              block.content.actionSheetBlocks,
              toInsert,
              targetId,
              position
            ),
          },
        };
      }
      if (block.content?.cardFooterBlocks?.length) {
        next = {
          ...next,
          content: {
            ...next.content,
            cardFooterBlocks: insertBlocksAtTarget(
              block.content.cardFooterBlocks,
              toInsert,
              targetId,
              position
            ),
          },
        };
      }
      return next;
    });
  }

  const next: BuilderBlock[] = [];
  for (const block of blocks) {
    if (block.id === targetId) {
      if (position === 'before') {
        next.push(...toInsert, block);
      } else {
        next.push(block, ...toInsert);
      }
    } else {
      let updated = block;
      if (block.children) {
        updated = {
          ...updated,
          children: insertBlocksAtTarget(block.children, toInsert, targetId, position),
        };
      }
      if (block.content?.actionSheetBlocks?.length) {
        updated = {
          ...updated,
          content: {
            ...updated.content,
            actionSheetBlocks: insertBlocksAtTarget(
              block.content.actionSheetBlocks,
              toInsert,
              targetId,
              position
            ),
          },
        };
      }
      if (block.content?.cardFooterBlocks?.length) {
        updated = {
          ...updated,
          content: {
            ...updated.content,
            cardFooterBlocks: insertBlocksAtTarget(
              block.content.cardFooterBlocks,
              toInsert,
              targetId,
              position
            ),
          },
        };
      }
      next.push(updated);
    }
  }
  return next;
}

export function reorderBlockInTree(
  blocks: BuilderBlock[],
  draggedId: string,
  targetId: string,
  position: 'before' | 'after' | 'inside'
): BuilderBlock[] {
  if (draggedId === targetId) return blocks;
  const draggedNode = findBlockById(blocks, draggedId);
  if (!draggedNode || containsBlockId(draggedNode, targetId)) {
    return blocks;
  }

  const { extracted, remaining } = extractBlockById(blocks, draggedId);
  if (!extracted) return blocks;

  return insertBlocksAtTarget(remaining, [extracted], targetId, position);
}

export function moveBlockIntoCardFooter(
  blocks: BuilderBlock[],
  draggedId: string,
  cardId: string
): BuilderBlock[] {
  if (draggedId === cardId) return blocks;
  const draggedNode = findBlockById(blocks, draggedId);
  if (!draggedNode || containsBlockId(draggedNode, cardId)) {
    return blocks;
  }

  const { extracted, remaining } = extractBlockById(blocks, draggedId);
  if (!extracted) return blocks;

  return insertBlockIntoCardFooter(remaining, cardId, extracted);
}

export function hasBlockNestedChildren(block: BuilderBlock): boolean {
  return (
    (Array.isArray(block.children) && block.children.length > 0) ||
    (Array.isArray(block.content?.cardFooterBlocks) &&
      block.content.cardFooterBlocks.length > 0) ||
    (Array.isArray(block.content?.actionSheetBlocks) &&
      block.content.actionSheetBlocks.length > 0)
  );
}

export function countDirectNestedChildren(block: BuilderBlock): number {
  return (
    (Array.isArray(block.children) ? block.children.length : 0) +
    (Array.isArray(block.content?.cardFooterBlocks) ? block.content.cardFooterBlocks.length : 0) +
    (Array.isArray(block.content?.actionSheetBlocks) ? block.content.actionSheetBlocks.length : 0)
  );
}

export function findLayerAncestorGroupIds(
  blocks: BuilderBlock[],
  targetId: string | null
): string[] | null {
  if (!targetId) return null;
  for (const node of blocks) {
    if (node.id === targetId) {
      return hasBlockNestedChildren(node) ? [node.id] : [];
    }
    const childGroups = [
      node.children,
      node.content?.cardFooterBlocks,
      node.content?.actionSheetBlocks,
    ];
    for (const list of childGroups) {
      if (Array.isArray(list) && list.length > 0) {
        const sub = findLayerAncestorGroupIds(list, targetId);
        if (sub !== null) {
          return [node.id, ...sub];
        }
      }
    }
  }
  return null;
}

export function resolveExpandedLayerGroupsForSelection(
  blocks: BuilderBlock[],
  selectedId: string | null,
  navSheetEntries: { navId: string; children: BuilderBlock[] }[] = []
): Record<string, boolean> {
  if (!selectedId) return {};
  const mainPath = findLayerAncestorGroupIds(blocks, selectedId);
  if (mainPath !== null) {
    const next: Record<string, boolean> = {};
    for (const id of mainPath) {
      next[id] = true;
    }
    return next;
  }
  for (const entry of navSheetEntries) {
    const navPath = findLayerAncestorGroupIds(entry.children, selectedId);
    if (navPath !== null) {
      const next: Record<string, boolean> = {
        [`nav:${entry.navId}`]: true,
      };
      for (const id of navPath) {
        next[id] = true;
      }
      return next;
    }
  }
  return {};
}
