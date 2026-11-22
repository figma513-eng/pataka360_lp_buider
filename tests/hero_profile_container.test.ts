import test from 'node:test';
import assert from 'node:assert/strict';
import {
  DEFAULT_ADVANCE_OPTIONS,
  INITIAL_PROJECT,
  PREBUILT_SECTIONS,
  createBlock,
} from '../src/data/presets.ts';
import {
  deleteBlockById,
  findBlockById,
  findLayerAncestorGroupIds,
  hasBlockNestedChildren,
  insertBlocksAtTarget,
  insertChildIntoContainer,
  isContainerBlockType,
} from '../src/utils/treeHelpers.ts';
import { sanitizeBuilderProject } from '../src/utils/htmlSanitizer.ts';
import { renderBlockHtml } from '../src/utils/exporterBlocks.ts';

const baseProject = INITIAL_PROJECT;
const testTheme = baseProject.theme;

test('hero_profile is recognized as a container and supports nested child & template insertion', () => {
  assert.equal(isContainerBlockType('hero_profile'), true);

  const hero = createBlock('hero_profile', testTheme);
  hero.content.heroVariant = 'banner';
  hero.content.heroTitle = 'Pataka Jas Club';

  const btn = createBlock('button', testTheme);
  btn.content.label = 'Daftar Bimbel';

  let tree = insertChildIntoContainer([hero], hero.id, btn);
  assert.equal(tree[0].children?.length, 1);
  assert.equal(hasBlockNestedChildren(tree[0]), true);
  assert.equal(findBlockById(tree, btn.id)?.id, btn.id);
  assert.deepEqual(findLayerAncestorGroupIds(tree, btn.id), [hero.id]);

  const rowSection = PREBUILT_SECTIONS.find((s) => s.id === 'row-slide-horizontal');
  assert.ok(rowSection, 'Expected row-slide-horizontal preset to exist');
  const createdRowBlocks = rowSection.createBlocks(testTheme);

  tree = insertBlocksAtTarget(tree, createdRowBlocks, hero.id, 'inside');
  assert.equal(tree[0].children?.length, 1 + createdRowBlocks.length);
  assert.equal(findBlockById(tree, createdRowBlocks[0].id)?.id, createdRowBlocks[0].id);

  // Deleting a child inside hero_profile works cleanly
  tree = deleteBlockById(tree, btn.id);
  assert.equal(findBlockById(tree, btn.id), null);
  assert.equal(tree[0].children?.length, createdRowBlocks.length);
});

test('sanitizeBuilderProject preserves hero_profile children and hero container options', () => {
  const hero = createBlock('hero_profile', testTheme);
  hero.content.heroVariant = 'banner';
  hero.content.heroHideDefaultContent = true;
  hero.content.heroChildrenPosition = 'on_cover';
  const childText = createBlock('text', testTheme);
  childText.content.text = 'Promo Spesial Anggota';
  hero.children = [childText];

  const sanitizedProject = sanitizeBuilderProject({
    ...baseProject,
    blocks: [hero],
  });
  const sanitized = sanitizedProject.blocks[0];
  assert.equal(sanitized.content.heroHideDefaultContent, true);
  assert.equal(sanitized.content.heroChildrenPosition, 'on_cover');
  assert.equal(sanitized.children?.length, 1);
  assert.equal(sanitized.children?.[0].content.text, 'Promo Spesial Anggota');
});

test('renderBlockHtml places Cover as Layer 1 background and Data & Daftar Item as Layer 2 on top of Cover by default', () => {
  const hero = createBlock('hero_profile', testTheme);
  hero.content.heroVariant = 'banner';
  hero.content.heroTitle = 'Warung Barokah';

  const childBtn = createBlock('button', testTheme);
  childBtn.content.label = 'Kutipan Pembina';
  hero.children = [childBtn];

  // Default (undefined heroChildrenPosition) => Layer 1 background cover + Layer 2 overlay items above profile card
  const defaultHtml = renderBlockHtml(hero, testTheme, DEFAULT_ADVANCE_OPTIONS);
  assert.match(defaultHtml, /data-hero-layer="background-cover"/);
  assert.match(defaultHtml, /data-hero-layer="overlay-items"/);
  const overlayIdx = defaultHtml.indexOf('Kutipan Pembina');
  const profileHeadingIdx = defaultHtml.indexOf('<h1');
  assert.ok(overlayIdx > -1 && profileHeadingIdx > -1, 'Expected both overlay child and profile card');
  assert.ok(
    overlayIdx < profileHeadingIdx,
    'Layer 2 (Data & Daftar Item on cover) must render above the overlapping profile card'
  );

  // Inside card mode still works
  const heroInside = {
    ...hero,
    content: {
      ...hero.content,
      heroChildrenPosition: 'inside_card' as const,
    },
  };
  const insideHtml = renderBlockHtml(heroInside, testTheme, DEFAULT_ADVANCE_OPTIONS);
  assert.doesNotMatch(insideHtml, /data-hero-layer="overlay-items"/);
  assert.ok(insideHtml.indexOf('<h1') < insideHtml.indexOf('Kutipan Pembina'));

  // Hide default content on cover omits profile heading while keeping Layer 2 child on cover
  const heroCoverOnly = {
    ...hero,
    content: {
      ...hero.content,
      heroHideDefaultContent: true,
      heroChildrenPosition: 'on_cover' as const,
    },
  };
  const coverOnlyHtml = renderBlockHtml(heroCoverOnly, testTheme, DEFAULT_ADVANCE_OPTIONS);
  assert.doesNotMatch(coverOnlyHtml, /<h1[^>]*>Warung Barokah<\/h1>/);
  assert.match(coverOnlyHtml, /data-hero-layer="overlay-items"/);
  assert.match(coverOnlyHtml, /Kutipan Pembina/);

  // Compact mode with child
  const heroCompact = {
    ...hero,
    content: {
      ...hero.content,
      heroVariant: 'compact' as const,
      heroHideDefaultContent: false,
    },
  };
  const compactHtml = renderBlockHtml(heroCompact, testTheme, DEFAULT_ADVANCE_OPTIONS);
  assert.match(compactHtml, /Warung Barokah/);
  assert.match(compactHtml, /Kutipan Pembina/);
});

test('row horizontal slider respects rowShowScrollbar and rowShowDots hide/show toggles', () => {
  const row = createBlock('row', testTheme);
  row.content.rowLayoutMode = 'horizontal';
  row.children = [createBlock('text', testTheme), createBlock('text', testTheme)];

  // Default: scrollbar hidden (lynk-hide-scrollbar), 3 dots shown
  const defaultHtml = renderBlockHtml(row, testTheme, DEFAULT_ADVANCE_OPTIONS);
  assert.match(defaultHtml, /class="lynk-row-track lynk-hide-scrollbar"/);
  assert.match(defaultHtml, /data-row-dots="3"/);

  // Explicit Hide Dots + Show Scrollbar
  const customRow = {
    ...row,
    content: {
      ...row.content,
      rowShowScrollbar: true,
      rowShowDots: false,
    },
  };
  const customHtml = renderBlockHtml(customRow, testTheme, DEFAULT_ADVANCE_OPTIONS);
  assert.match(customHtml, /class="lynk-row-track"/);
  assert.doesNotMatch(customHtml, /lynk-hide-scrollbar/);
  assert.doesNotMatch(customHtml, /data-row-dots="3"/);
});

test('container slider, carousel, and category_tabs respect Hide/Show Scrollbar, Dots, and Arrows toggles and sanitizer preserves them', () => {
  const cnt = createBlock('container', testTheme);
  cnt.content.containerLayoutMode = 'slider_horizontal';
  cnt.content.sliderShowScrollbar = false;
  cnt.content.sliderShowDots = false;
  cnt.children = [createBlock('text', testTheme), createBlock('text', testTheme)];

  const cntHiddenHtml = renderBlockHtml(cnt, testTheme, DEFAULT_ADVANCE_OPTIONS);
  assert.match(cntHiddenHtml, /class="lynk-cslider-track lynk-hide-scrollbar"/);
  assert.doesNotMatch(cntHiddenHtml, /lynk-cslider-dots/);

  const cntShown = {
    ...cnt,
    content: { ...cnt.content, sliderShowScrollbar: true, sliderShowDots: true },
  };
  const cntShownHtml = renderBlockHtml(cntShown, testTheme, DEFAULT_ADVANCE_OPTIONS);
  assert.match(cntShownHtml, /class="lynk-cslider-track"/);
  assert.doesNotMatch(cntShownHtml, /lynk-hide-scrollbar/);
  assert.match(cntShownHtml, /lynk-cslider-dots/);

  const car = createBlock('carousel', testTheme);
  car.content.carouselShowDots = false;
  car.content.carouselShowArrows = false;
  car.content.carouselShowScrollbar = true;
  const carHtml = renderBlockHtml(car, testTheme, DEFAULT_ADVANCE_OPTIONS);
  assert.doesNotMatch(carHtml, /data-car-dot=/);
  assert.doesNotMatch(carHtml, /data-car-prev/);
  assert.doesNotMatch(carHtml, /lynk-hide-scrollbar/);

  const cat = createBlock('category_tabs', testTheme);
  cat.content.categoryScrollMode = 'horizontal';
  cat.content.categoryShowScrollbar = false;
  const catHiddenHtml = renderBlockHtml(cat, testTheme, DEFAULT_ADVANCE_OPTIONS);
  assert.match(catHiddenHtml, /class="lynk-hide-scrollbar"/);

  const catShown = {
    ...cat,
    content: { ...cat.content, categoryShowScrollbar: true },
  };
  const catShownHtml = renderBlockHtml(catShown, testTheme, DEFAULT_ADVANCE_OPTIONS);
  assert.doesNotMatch(catShownHtml, /lynk-hide-scrollbar/);

  // Verify htmlSanitizer preserves all 7 new boolean flags
  const rowFlagged = createBlock('row', testTheme);
  rowFlagged.content.rowShowDots = false;
  rowFlagged.content.rowShowScrollbar = true;

  const sanitized = sanitizeBuilderProject({
    ...baseProject,
    blocks: [cntShown, car, catShown, rowFlagged],
  });
  assert.equal(sanitized.blocks[0].content.sliderShowScrollbar, true);
  assert.equal(sanitized.blocks[1].content.carouselShowDots, false);
  assert.equal(sanitized.blocks[1].content.carouselShowArrows, false);
  assert.equal(sanitized.blocks[1].content.carouselShowScrollbar, true);
  assert.equal(sanitized.blocks[2].content.categoryShowScrollbar, true);
  assert.equal(sanitized.blocks[3].content.rowShowDots, false);
  assert.equal(sanitized.blocks[3].content.rowShowScrollbar, true);
});

