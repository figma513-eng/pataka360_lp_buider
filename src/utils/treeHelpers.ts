import type { BuilderBlock } from '../types/builder.ts';
import { createId } from '../data/presets.ts';

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
      return next;
    });
}

export function cloneBlockDeep(block: BuilderBlock): BuilderBlock {
  return {
    ...block,
    id: createId(block.type.slice(0, 3)),
    style: { ...block.style },
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
      })),
      fnbItems: block.content.fnbItems?.map((it) => ({
        ...it,
        id: createId('fnb'),
      })),
      categoryButtons: block.content.categoryButtons?.map((it) => ({
        ...it,
        id: createId('catbtn'),
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
    return next;
  });
}

export function insertChildIntoContainer(
  blocks: BuilderBlock[],
  containerId: string,
  newChild: BuilderBlock
): BuilderBlock[] {
  return blocks.map((block) => {
    if (
      block.id === containerId &&
      (block.type === 'container' ||
        block.type === 'row' ||
        block.type === 'toggle_container' ||
        block.type === 'bottom_sheet' ||
        block.type === 'menu_icon')
    ) {
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

function containsBlockId(node: BuilderBlock, id: string): boolean {
  if (node.id === id) return true;
  if (node.children?.some((child) => containsBlockId(child, id))) return true;
  if (node.content?.actionSheetBlocks?.some((child) => containsBlockId(child, id))) return true;
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
      if (
        block.id === targetId &&
        (block.type === 'container' ||
          block.type === 'row' ||
          block.type === 'toggle_container' ||
          block.type === 'bottom_sheet' ||
          block.type === 'menu_icon')
      ) {
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
