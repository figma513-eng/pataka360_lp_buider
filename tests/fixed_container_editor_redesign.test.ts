import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { generateProjectHtml } from '../src/utils/htmlExporter.ts';
import { BUILTIN_DEVICE_PRESETS, RESPONSIVE_PRESET } from '../src/utils/devicePresets.ts';
import { removeSelectedItemByIdOrIndex } from '../src/utils/itemListHelpers.ts';
import { createBlock, INITIAL_PROJECT } from '../src/data/presets.ts';

const ROOT = process.cwd();
const readSrc = (rel: string) => fs.readFileSync(path.join(ROOT, rel), 'utf8');

// =========================================================================
// BAGIAN 2 — FIXED CONTAINER GLOBAL (576px WEB / 440px MOBILE)
// =========================================================================
test('Bagian 2: Generated public HTML enforces global .app-container (576px desktop, 440px mobile, centered, zero overflow)', () => {
  const project = structuredClone(INITIAL_PROJECT);
  const html = generateProjectHtml(project, { projectId: 'test-fixed-container' });

  // Single global container CSS rules
  assert.match(
    html,
    /\.app-container\s*\{[^}]*width:\s*100%;[^}]*max-width:\s*576px;[^}]*margin-left:\s*auto;[^}]*margin-right:\s*auto;[^}]*min-height:\s*100vh;[^}]*box-sizing:\s*border-box;/s
  );
  assert.match(html, /\.app-container \*\s*\{\s*box-sizing:\s*border-box;\s*\}/);
  assert.match(html, /@media\s*\(max-width:\s*440px\)\s*\{[^}]*\.app-container\s*\{[^}]*max-width:\s*440px;/s);

  // Horizontal overflow prevention
  assert.match(html, /overflow-x:\s*clip;/);

  // No conflicting legacy 680px or 420px container overrides
  assert.doesNotMatch(html, /max-width:\s*680px/);
  assert.doesNotMatch(html, /\.page-pad\s*\{[^}]*max-width:\s*420px/);

  // Main page wrapper inside .app-container
  assert.ok(html.includes('<div class="app-container">'), 'HTML must wrap content in .app-container');
  assert.ok(html.includes('<main id="lynk-main-view"'), 'Main view must be rendered');
  assert.ok(html.includes('id="lynk-subpage-detail"'), 'Subpage detail must be inside .app-container');
  assert.ok(html.includes('id="lynk-subpage-cart"'), 'Subpage cart must be inside .app-container');

  // Floating/fixed bars stay bounded within 576px desktop / 440px mobile container
  assert.match(html, /\.lynk-bottom-nav\s*\{[^}]*max-width:\s*576px;/s);
  assert.match(html, /id="lynk-cart-bar"[^>]*max-width:\s*576px;/);
  assert.match(html, /id="lynk-fnb-float-bar"[^>]*max-width:\s*576px;/);
  assert.match(html, /\.lynk-sheet-panel\s*\{[^}]*max-width:\s*576px;/s);
  assert.match(
    html,
    /\.lynk-bottom-nav,\s*#lynk-cart-bar,\s*#lynk-fnb-float-bar,\s*\.lynk-sheet-panel\s*\{\s*max-width:\s*440px;/s
  );
});

test('Bagian 2: Global CSS (src/index.css) and PreviewModal enforce .app-container without 680px override', () => {
  const indexCss = readSrc('src/index.css');
  assert.match(indexCss, /\.app-container\s*\{[^}]*max-width:\s*576px;/s);
  assert.match(indexCss, /@media\s*\(max-width:\s*440px\)\s*\{[^}]*\.app-container\s*\{[^}]*max-width:\s*440px;/s);

  const previewModal = readSrc('src/components/modals/PreviewModal.tsx');
  assert.ok(previewModal.includes('app-container'), 'PreviewModal must wrap views in app-container');
  assert.doesNotMatch(previewModal, /max-w-\[680px\]/);

  const mobileCanvas = readSrc('src/components/MobileCanvas.tsx');
  assert.doesNotMatch(mobileCanvas, /max-w-\[680px\]/);
});

// =========================================================================
// BAGIAN 3 — ZOOM CANVAS (50%, 75%, 100% + SLIDER SAMPAI 250%)
// =========================================================================
test('Bagian 3: MobileCanvas provides Zoom Canvas presets 50%, 75%, 100% and range slider up to 250%', () => {
  const mobileCanvas = readSrc('src/components/MobileCanvas.tsx');

  // Quick presets 50%, 75%, 100% + range slider 50%..250%
  assert.match(mobileCanvas, /0\.5,\s*0\.75,\s*1/);
  assert.ok(mobileCanvas.includes('max={250}'), 'Zoom slider must reach 250%');
  assert.ok(mobileCanvas.includes('min={50}'), 'Zoom slider must start at 50%');
  // Scale applied only to canvas transform stage, never document/browser zoom
  assert.ok(mobileCanvas.includes('data-canvas-zoom-stage'), 'Zoom stage wrapper must exist');
  assert.ok(mobileCanvas.includes('transform: `scale(${zoom})`'), 'Canvas scale transform must be applied');
  assert.doesNotMatch(mobileCanvas, /document\.body\.style\.zoom/);
  assert.doesNotMatch(mobileCanvas, /document\.documentElement\.style\.zoom/);
});

// =========================================================================
// BAGIAN 4 — PREVIEW MOBILE (Mobile 440 px & Mobile 576 px)
// =========================================================================
test('Bagian 4: Device presets, MobileCanvas, and PreviewModal expose Mobile 440 px and Mobile 576 px', () => {
  assert.equal(RESPONSIVE_PRESET.width, 440);
  const mobile440 = BUILTIN_DEVICE_PRESETS.find((p) => p.id === 'mobile-440');
  const mobile576 = BUILTIN_DEVICE_PRESETS.find((p) => p.id === 'mobile-576');
  assert.ok(mobile440 && mobile440.width === 440, 'mobile-440 preset must exist with width 440');
  assert.ok(mobile576 && mobile576.width === 576, 'mobile-576 preset must exist with width 576');

  const mobileCanvas = readSrc('src/components/MobileCanvas.tsx');
  assert.ok(mobileCanvas.includes('Mobile 440 px'), 'MobileCanvas must have Mobile 440 px button');
  assert.ok(mobileCanvas.includes('Mobile 576 px'), 'MobileCanvas must have Mobile 576 px button');
  assert.doesNotMatch(mobileCanvas, /Mobile \(390px\)/);
  assert.doesNotMatch(mobileCanvas, /Lebar \(680px\)/);

  const previewModal = readSrc('src/components/modals/PreviewModal.tsx');
  assert.ok(previewModal.includes('Mobile 440 px'), 'PreviewModal must have Mobile 440 px button');
  assert.ok(previewModal.includes('Mobile 576 px'), 'PreviewModal must have Mobile 576 px button');
});

// =========================================================================
// BAGIAN 5 & 6 — NAVBAR KIRI (Alat, Blok, Tema) & NAVBAR KANAN (Desain, Konten)
// =========================================================================
test('Bagian 5: LeftSidebar has 3 tabs (Alat, Blok, Tema) and displays all layers via HomePageSettings', () => {
  const leftSidebar = readSrc('src/components/LeftSidebar.tsx');
  assert.match(leftSidebar, /type SidebarTab = 'alat' \| 'blok' \| 'tema'/);
  assert.ok(leftSidebar.includes('HomePageSettings'), 'LeftSidebar must render HomePageSettings inside Tema tab');
  assert.ok(leftSidebar.includes("setActiveTab('tema')"), 'LeftSidebar must support switching to Tema tab');

  const homeSettings = readSrc('src/components/inspector/HomePageSettings.tsx');
  assert.match(homeSettings, /body:\s*true/, 'BODY / Lapisan section should open cleanly inside Tema tab');
  assert.ok(homeSettings.includes('data-all-layers-list'), 'All layers container must exist');
  assert.ok(homeSettings.includes('navSheetLayers'), 'Bottom navbar modal sheet layers must also be displayed');
  assert.ok(homeSettings.includes('countLayerTree'), 'Recursive layer counter must count all nested layers');
});

test('Bagian 6: RightInspector orders tabs Konten then Desain, focuses Konten on canvas click, and uses compact gray sliders', () => {
  const rightInspector = readSrc('src/components/RightInspector.tsx');
  assert.match(rightInspector, /type ComponentInspectorTab = 'konten' \| 'desain'/);
  const kontenIdx = rightInspector.indexOf("id: 'konten'");
  const desainIdx = rightInspector.indexOf("id: 'desain'");
  assert.ok(kontenIdx > 0 && desainIdx > kontenIdx, 'Konten tab must appear before Desain tab');
  assert.ok(rightInspector.includes('contentFocusNonce'), 'RightInspector must respond to canvas click focus nonce');
  assert.ok(rightInspector.includes('inspector-compact'), 'RightInspector must apply compact density class');
  // Removed Komponen/Home/Tema right navbar buttons
  assert.doesNotMatch(rightInspector, /setActiveMode\('home'\)/);
  assert.doesNotMatch(rightInspector, /setActiveMode\('component'\)/);
  assert.doesNotMatch(rightInspector, /id:\s*'tema'/);
  // Preserved underlying functionality hooks
  assert.ok(rightInspector.includes('onOpenNavbarSettings'), 'Must still route back to Navbar/Tema in LeftSidebar');
  assert.ok(rightInspector.includes('resetBlockThemeToGlobal'), 'Must preserve theme override reset');
  assert.ok(rightInspector.includes('onDuplicateBlock'), 'Must preserve block duplicate');

  const appSrc = readSrc('src/App.tsx');
  assert.ok(appSrc.includes('handleCanvasSelectBlock'), 'App must wire canvas click to focus Konten');
  assert.ok(appSrc.includes('contentFocusNonce={contentFocusNonce}'), 'App must pass contentFocusNonce to RightInspector');

  const indexCss = readSrc('src/index.css');
  assert.ok(indexCss.includes('input[type="range"]'), 'Global gray range slider CSS must exist');
  assert.ok(indexCss.includes('.inspector-compact'), 'Compact inspector CSS must exist');

  const primitives = readSrc('src/components/inspector/InspectorPrimitives.tsx');
  assert.ok(primitives.includes('#94A3B8'), 'SliderRow must render gray progress bar');
});

// =========================================================================
// BAGIAN 7 — PENGATURAN COVER & FOTO (INDEPENDEN)
// =========================================================================
test('Bagian 7: Cover & Foto have independent state, previews, pixel sliders, and zero cross-mutation', () => {
  const contentTab = readSrc('src/components/inspector/BlockContentTab.tsx');

  // Independent upload states (no shared heroUploadingField)
  assert.ok(contentTab.includes('uploadingHeroCover'), 'Cover must have isolated upload state');
  assert.ok(contentTab.includes('uploadingHeroPhoto'), 'Foto must have isolated upload state');
  assert.doesNotMatch(contentTab, /heroUploadingField/);

  // Separate UI sections with pixel unit sliders and previews
  assert.ok(contentTab.includes('data-hero-setting="cover"'));
  assert.ok(contentTab.includes('data-hero-setting="foto"'));
  assert.ok(contentTab.includes('Pengaturan Cover'));
  assert.ok(contentTab.includes('Pengaturan Foto'));
  assert.ok(contentTab.includes('Ukuran Tinggi Cover (px)'));
  assert.ok(contentTab.includes('Ukuran Foto (px)'));
  assert.ok(contentTab.includes('uploadHeroCover'));
  assert.ok(contentTab.includes('uploadHeroPhoto'));

  // Data-level isolation check on hero_profile block + HTML export
  const project = structuredClone(INITIAL_PROJECT);
  const hero = createBlock('hero_profile', project.theme);
  hero.content.heroVariant = 'banner';
  hero.content.heroCoverImage = 'https://example.com/cover-awal.jpg';
  hero.content.heroCoverHeight = 200;
  hero.content.heroLogoImage = 'https://example.com/foto-awal.jpg';
  hero.content.heroLogoSize = 84;

  // Update ONLY Cover
  const afterCoverChange = {
    ...hero,
    content: { ...hero.content, heroCoverImage: 'https://example.com/cover-baru.jpg', heroCoverHeight: 260 },
  };
  assert.equal(afterCoverChange.content.heroLogoImage, 'https://example.com/foto-awal.jpg');
  assert.equal(afterCoverChange.content.heroLogoSize, 84);

  // Update ONLY Foto
  const afterFotoChange = {
    ...afterCoverChange,
    content: { ...afterCoverChange.content, heroLogoImage: 'https://example.com/foto-baru.jpg', heroLogoSize: 110 },
  };
  assert.equal(afterFotoChange.content.heroCoverImage, 'https://example.com/cover-baru.jpg');
  assert.equal(afterFotoChange.content.heroCoverHeight, 260);

  // Exported HTML renders both independently with their pixel sizes
  project.blocks = [afterFotoChange];
  const html = generateProjectHtml(project, { projectId: 'test-hero-independent' });
  assert.ok(html.includes('https://example.com/cover-baru.jpg'));
  assert.match(html, /height:\s*260px/);
  assert.ok(html.includes('https://example.com/foto-baru.jpg'));
  assert.match(html, /width:\s*110px;\s*height:\s*110px/);
});

// =========================================================================
// BAGIAN 8 — DATA & DAFTAR ITEM (HAPUS ITEM TERPILIH)
// =========================================================================
test('Bagian 8: removeSelectedItemByIdOrIndex deletes strictly ONE selected item and preserves all other items', () => {
  const items = [
    { id: 'item_1', title: 'Pertama' },
    { id: 'item_2', title: 'Kedua' },
    { id: 'item_3', title: 'Ketiga' },
  ];

  // Delete middle item
  const afterMiddle = removeSelectedItemByIdOrIndex(items, 'item_2', 1);
  assert.deepEqual(
    afterMiddle.map((i) => i.id),
    ['item_1', 'item_3']
  );

  // Delete first item
  const afterFirst = removeSelectedItemByIdOrIndex(items, 'item_1', 0);
  assert.deepEqual(
    afterFirst.map((i) => i.id),
    ['item_2', 'item_3']
  );

  // Delete last item
  const afterLast = removeSelectedItemByIdOrIndex(items, 'item_3', 2);
  assert.deepEqual(
    afterLast.map((i) => i.id),
    ['item_1', 'item_2']
  );

  // Duplicate ID safety: only removes the exact selected item, never both
  const withDupIds = [
    { id: 'dup', title: 'A' },
    { id: 'dup', title: 'B' },
    { id: 'ok', title: 'C' },
  ];
  const afterDupIndex1 = removeSelectedItemByIdOrIndex(withDupIds, 'dup', 1);
  assert.deepEqual(
    afterDupIndex1.map((i) => i.title),
    ['A', 'C']
  );

  // Original array untouched (immutable)
  assert.equal(items.length, 3);
});

test('Bagian 8: InspectorPrimitives does not clip item menus and exposes direct delete; BlockContentTab uses removeSelectedItemByIdOrIndex', () => {
  const primitives = readSrc('src/components/inspector/InspectorPrimitives.tsx');
  assert.doesNotMatch(primitives, /rounded-xl border overflow-hidden/);
  assert.ok(primitives.includes('aria-label="Hapus item terpilih"'), 'Direct 1-click delete button must exist');

  const contentTab = readSrc('src/components/inspector/BlockContentTab.tsx');
  assert.ok(contentTab.includes('removeSelectedItemByIdOrIndex'), 'BlockContentTab must use removeSelectedItemByIdOrIndex');
  assert.ok(contentTab.includes('onDeleteSelected?: () => void'), 'Drill-down header must support deleting selected item');
});

// =========================================================================
// BAGIAN 9 — PENGATURAN KHUSUS KOMPONEN (DIPERTAHANKAN UTUH)
// =========================================================================
test('Bagian 9: Pengaturan Khusus Komponen preserves menu styles, icon picker, destination link, icon size, and colors', () => {
  const designTab = readSrc('src/components/inspector/BlockDesignTab.tsx');
  assert.ok(designTab.includes('Ikon Bulat'), 'Menu style Ikon Bulat must be preserved');
  assert.ok(designTab.includes('Kapsul'), 'Menu style Kapsul must be preserved');
  assert.ok(designTab.includes('Tombol'), 'Menu style Tombol must be preserved');
  assert.ok(designTab.includes('IconPicker'), 'IconPicker must be preserved');
  assert.ok(designTab.includes('Ukuran Ikon'), 'Icon size control must be preserved');
  assert.ok(designTab.includes('Warna Latar'), 'Background color control must be preserved');
  assert.ok(designTab.includes('Warna Ikon / Teks'), 'Icon/Text color control must be preserved');

  const contentTab = readSrc('src/components/inspector/BlockContentTab.tsx');
  assert.ok(contentTab.includes('Tautan & Navigasi'), 'Destination link section must be preserved');
});
