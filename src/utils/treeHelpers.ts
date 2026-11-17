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
    if (block.children) {
      return {
        ...block,
        children: updateBlockById(block.children, id, updater),
      };
    }
    return block;
  });
}

export function deleteBlockById(blocks: BuilderBlock[], id: string): BuilderBlock[] {
  return blocks
    .filter((block) => block.id !== id)
    .map((block) =>
      block.children
        ? { ...block, children: deleteBlockById(block.children, id) }
        : block
    );
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
    } else if (block.children) {
      const res = duplicateBlockById(block.children, id);
      if (res.clonedId) clonedId = res.clonedId;
      nextBlocks.push({ ...block, children: res.nextBlocks });
    } else {
      nextBlocks.push(block);
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

  return blocks.map((block) =>
    block.children
      ? { ...block, children: moveBlockInTree(block.children, id, direction) }
      : block
  );
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
        block.type === 'bottom_sheet')
    ) {
      return {
        ...block,
        children: [...(block.children ?? []), newChild],
      };
    }
    if (block.children) {
      return {
        ...block,
        children: insertChildIntoContainer(block.children, containerId, newChild),
      };
    }
    return block;
  });
}

function containsBlockId(node: BuilderBlock, id: string): boolean {
  if (node.id === id) return true;
  if (!node.children) return false;
  return node.children.some((child) => containsBlockId(child, id));
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
    if (block.children) {
      const childRes = extractBlockById(block.children, id);
      if (childRes.extracted) {
        extracted = childRes.extracted;
        remaining.push({ ...block, children: childRes.remaining });
        continue;
      }
    }
    remaining.push(block);
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
          block.type === 'bottom_sheet')
      ) {
        return { ...block, children: [...(block.children ?? []), ...toInsert] };
      }
      if (block.children) {
        return {
          ...block,
          children: insertBlocksAtTarget(block.children, toInsert, targetId, position),
        };
      }
      return block;
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
    } else if (block.children) {
      next.push({
        ...block,
        children: insertBlocksAtTarget(block.children, toInsert, targetId, position),
      });
    } else {
      next.push(block);
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
