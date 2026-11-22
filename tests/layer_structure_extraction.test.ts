import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { BlockType } from '../src/types/builder';
import { PREBUILT_SECTIONS, THEMES, createBlock } from '../src/data/presets';
import {
  countTotalExtractedLayers,
  extractBlockSubLayers,
  findExtractedSubLayer,
} from '../src/utils/layerStructure';

const ALL_27_BLOCK_TYPES: BlockType[] = [
  'row',
  'container',
  'toggle_container',
  'text',
  'image',
  'button',
  'form',
  'divider',
  'youtube',
  'facebook_video',
  'tiktok_video',
  'instagram_video',
  'catalog',
  'social',
  'social_follower',
  'carousel',
  'social_feed',
  'maps_place',
  'bottom_sheet',
  'training_catalog',
  'hero_profile',
  'fnb_catalog',
  'category_tabs',
  'menu_icon',
  'cart_button',
  'showcase_card',
  'back_button',
];

const DEFAULT_THEME = THEMES[0];

test('ALL 27 BlockTypes extract non-empty sub-layers with valid Konten & Desain bindings', () => {
  assert.equal(ALL_27_BLOCK_TYPES.length, 27);

  for (const type of ALL_27_BLOCK_TYPES) {
    const blk = createBlock(type, DEFAULT_THEME);
    const subLayers = extractBlockSubLayers(blk);
    assert.ok(
      subLayers.length > 0,
      `BlockType "${type}" must extract at least 1 sub-layer (got 0)`
    );

    const seenIds = new Set<string>();
    for (const sub of subLayers) {
      assert.ok(sub.id.trim().length > 0, `${type}: sub.id must be non-empty`);
      assert.ok(!seenIds.has(sub.id), `${type}: duplicate sub-layer id "${sub.id}"`);
      seenIds.add(sub.id);
      assert.ok(sub.label.trim().length > 0, `${type}.${sub.id}: label must be non-empty`);
      assert.ok(
        sub.contentSections.length > 0,
        `${type}.${sub.id}: must bind at least one Konten section`
      );
      assert.ok(
        sub.designSections.length > 0,
        `${type}.${sub.id}: must bind at least one Desain section`
      );
      assert.equal(
        findExtractedSubLayer(blk, sub.id)?.id,
        sub.id,
        `${type}.${sub.id}: findExtractedSubLayer must locate sub-layer`
      );
    }
  }
});

test('ALL PREBUILT_SECTIONS extract complete layer structures recursively', () => {
  assert.ok(PREBUILT_SECTIONS.length > 0);
  for (const section of PREBUILT_SECTIONS) {
    const blocks = section.createBlocks(DEFAULT_THEME);
    assert.ok(blocks.length > 0, `Section "${section.id}" must create blocks`);
    const total = countTotalExtractedLayers(blocks);
    assert.ok(
      total > blocks.length,
      `Section "${section.id}" must extract sub-layers beyond top-level blocks`
    );
  }
});

test('hero_profile banner extracts Lapisan 1 (Cover Banner) and Lapisan 3 (Kartu Profil)', () => {
  const hero = createBlock('hero_profile', DEFAULT_THEME);
  hero.content.heroVariant = 'banner';
  hero.content.heroCoverTitle = 'Warung Barokah';
  hero.content.heroTitle = 'Warung Barokah';

  const subs = extractBlockSubLayers(hero);
  const cover = subs.find((s) => s.id === 'hero_cover');
  const card = subs.find((s) => s.id === 'hero_profile_card');

  assert.ok(cover, 'hero_cover must exist in banner mode');
  assert.equal(cover.layerBadge, 'Lapisan 1');
  assert.ok(cover.contentSections.includes('main'));
  assert.ok(cover.designSections.includes('specific'));

  assert.ok(card, 'hero_profile_card must exist in banner mode');
  assert.equal(card.layerBadge, 'Lapisan 3');
  assert.ok(card.contentSections.includes('main'));
  assert.ok(card.designSections.includes('specific'));
});

test('Data-list blocks extract every individual item with matching BlockContentTab drill-down itemKey', () => {
  const checks: { type: BlockType; prefix: string }[] = [
    { type: 'carousel', prefix: 'slide:' },
    { type: 'catalog', prefix: 'catalog:' },
    { type: 'fnb_catalog', prefix: 'fnb:' },
    { type: 'training_catalog', prefix: 'tr_prog:' },
    { type: 'category_tabs', prefix: 'cat:' },
    { type: 'social', prefix: 'soc:' },
    { type: 'social_follower', prefix: 'sfa:' },
    { type: 'social_feed', prefix: 'sfp:' },
  ];

  for (const { type, prefix } of checks) {
    const blk = createBlock(type, DEFAULT_THEME);
    const subs = extractBlockSubLayers(blk);
    const itemSubs = subs.filter((s) => s.kind === 'item');
    assert.ok(itemSubs.length > 0, `${type} must extract individual item sub-layers`);
    assert.ok(
      itemSubs.some((s) => s.itemKey?.startsWith(prefix)),
      `${type} item sub-layers must include itemKey starting with "${prefix}"`
    );
  }
});

test('Universal add-ons (Keranjang Universal & Aksi Klik) are extracted on any block when active', () => {
  const btn = createBlock('text', DEFAULT_THEME);
  btn.content.universalCartEnabled = true;
  btn.content.universalCartName = 'Paket Hemat';
  btn.content.actionType = 'sheet';

  const subs = extractBlockSubLayers(btn);
  assert.ok(subs.some((s) => s.id === 'universal_cart'));
  assert.ok(subs.some((s) => s.id === 'universal_action'));
});

test('UI components wire extracted Layer Tree, hover-only row actions, and Right Inspector sync', () => {
  const root = process.cwd();
  const homeSrc = fs.readFileSync(
    path.join(root, 'src/components/inspector/HomePageSettings.tsx'),
    'utf8'
  );
  const inspectorSrc = fs.readFileSync(
    path.join(root, 'src/components/RightInspector.tsx'),
    'utf8'
  );
  const contentSrc = fs.readFileSync(
    path.join(root, 'src/components/inspector/BlockContentTab.tsx'),
    'utf8'
  );
  const designSrc = fs.readFileSync(
    path.join(root, 'src/components/inspector/BlockDesignTab.tsx'),
    'utf8'
  );

  assert.match(homeSrc, /extractBlockSubLayers/);
  assert.match(homeSrc, /data-sublayer-id=/);
  assert.match(homeSrc, /hidden group-hover:flex/);
  assert.match(homeSrc, /Lapisan 2 · Isi Wadah/);

  assert.match(inspectorSrc, /data-inspector-sublayer-bar=/);
  assert.match(inspectorSrc, /selectedSubLayer=\{selectedSubLayer\}/);

  assert.match(contentSrc, /isContentSectionAllowed/);
  assert.match(contentSrc, /selectedSubLayer\.itemKey/);

  assert.match(designSrc, /isDesignSectionAllowed/);
  assert.match(designSrc, /showCoverPart/);
});
