import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createBlock, INITIAL_PROJECT, THEMES } from '../src/data/presets';
import { sanitizeBuilderProject } from '../src/utils/htmlSanitizer';
import { generateProjectHtml } from '../src/utils/htmlExporter';
import { insertChildIntoContainer } from '../src/utils/treeHelpers';
import { BuilderProject, MenuIconSheetPosition } from '../src/types/builder';

const readSrc = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

test('A. Menu Icon: preset, sanitization, shapes (Bulat/Segi Empat/Kotak), 4-dir sheet & card jump HTML export', () => {
  const theme = THEMES[0];
  const targetCard = createBlock('container', theme);
  targetCard.label = 'Card Promo Spesial';

  // 1. Sheet mode across all 4 positions (bottom, right, left, top) + shapes
  const positions: MenuIconSheetPosition[] = ['bottom', 'right', 'left', 'top'];
  for (const pos of positions) {
    const iconBlock = createBlock('menu_icon', theme);
    iconBlock.content.menuIconImage = 'https://example.com/icon.png';
    iconBlock.content.menuIconShape = pos === 'bottom' ? 'circle' : pos === 'right' ? 'rounded' : 'square';
    iconBlock.content.menuIconRadius = 18;
    iconBlock.content.menuIconAction = 'sheet';
    iconBlock.content.menuIconSheetPosition = pos;
    iconBlock.content.sheetTitle = `Panel ${pos}`;

    const project: BuilderProject = {
      ...INITIAL_PROJECT,
      blocks: [iconBlock, targetCard],
    };

    const sanitized = sanitizeBuilderProject(project);
    assert.equal(sanitized.blocks[0].type, 'menu_icon');
    assert.equal(sanitized.blocks[0].content.menuIconImage, 'https://example.com/icon.png');
    assert.equal(sanitized.blocks[0].content.menuIconSheetPosition, pos);

    const html = generateProjectHtml(sanitized, { projectId: 'test-mico' });
    assert.ok(html.includes(`lynk-sheet-pos-${pos}`), `Expected sheet position class for ${pos}`);
    assert.ok(html.includes(`data-sheet-pos="${pos}"`), `Expected data-sheet-pos for ${pos}`);
    assert.ok(html.includes('https://example.com/icon.png'), 'Expected uploaded/URL icon image in HTML');
    if (pos === 'bottom') assert.ok(html.includes('border-radius: 9999px'), 'Circle shape radius');
    if (pos === 'right') assert.ok(html.includes('border-radius: 18px'), 'Rounded shape custom radius');
    if (pos === 'left' || pos === 'top') assert.ok(html.includes('border-radius: 0px'), 'Square shape radius');
  }

  // 2. Card jump mode ("Menuju ke tampilan card lain")
  const jumpIcon = createBlock('menu_icon', theme);
  jumpIcon.content.menuIconAction = 'card';
  jumpIcon.content.menuIconTargetBlockId = targetCard.id;
  jumpIcon.content.menuIconLabel = 'Ke Promo';

  const jumpProject: BuilderProject = {
    ...INITIAL_PROJECT,
    blocks: [jumpIcon, targetCard],
  };
  const jumpHtml = generateProjectHtml(sanitizeBuilderProject(jumpProject), { projectId: 'test-jump' });
  assert.ok(jumpHtml.includes(`data-jump-block="${targetCard.id}"`), 'Expected data-jump-block attribute');
  assert.ok(jumpHtml.includes(`data-block-id="${targetCard.id}"`), 'Expected target card data-block-id attribute');

  // 3. Container child insertion works for menu_icon
  const extraText = createBlock('text', theme);
  const updatedTree = insertChildIntoContainer([jumpIcon], jumpIcon.id, extraText);
  assert.equal((updatedTree[0].children ?? []).length, (jumpIcon.children ?? []).length + 1);

  // 4. Registered in LeftSidebar Alat palette
  const sidebarSrc = readSrc('src/components/LeftSidebar.tsx');
  assert.ok(sidebarSrc.includes("key: 'menu_icon'"), 'Menu Icon must exist in LeftSidebar TOOL_ITEMS');
});

test('B. Row / Kolom Dinamis: 1-20 columns, vertical/horizontal empty slides, strictly 3-dot progress on horizontal', () => {
  const theme = THEMES[0];

  // 1. Sanitizer allows 1..20 columns and vertical mode
  const row20 = createBlock('row', theme);
  row20.content.rowLayoutMode = 'grid';
  row20.content.rowColumns = 20;
  row20.children = Array.from({ length: 20 }, (_, i) => {
    const emptySlide = createBlock('container', theme);
    emptySlide.label = `Slide ${i + 1}`;
    emptySlide.children = [];
    return emptySlide;
  });

  const san20 = sanitizeBuilderProject({ ...INITIAL_PROJECT, blocks: [row20] });
  assert.equal(san20.blocks[0].content.rowColumns, 20);
  assert.equal((san20.blocks[0].children ?? []).length, 20);

  // Clamp above 20 -> 20
  const rowOverflow = createBlock('row', theme);
  rowOverflow.content.rowColumns = 35;
  assert.equal(
    sanitizeBuilderProject({ ...INITIAL_PROJECT, blocks: [rowOverflow] }).blocks[0].content.rowColumns,
    20
  );

  // 2. Horizontal slide with 10 slides renders strictly 3 progress dots
  const horizRow = createBlock('row', theme);
  horizRow.content.rowLayoutMode = 'horizontal';
  horizRow.children = Array.from({ length: 10 }, (_, i) => {
    const c = createBlock('container', theme);
    c.label = `Slide H ${i + 1}`;
    c.children = [];
    return c;
  });

  const horizHtml = generateProjectHtml(sanitizeBuilderProject({ ...INITIAL_PROJECT, blocks: [horizRow] }), {
    projectId: 'test-row-h',
  });
  assert.ok(horizHtml.includes('data-row-dots="3"'), 'Horizontal row must render 3-dot progress container');
  const dotMatches = horizHtml.match(/data-row-dot="[0-9]+"/g) ?? [];
  assert.equal(dotMatches.length, 3, 'Horizontal row progress must use ONLY 3 dots even with 10 slides');

  // 3. Vertical slide mode exports flex-direction: column
  const vertRow = createBlock('row', theme);
  vertRow.content.rowLayoutMode = 'vertical';
  vertRow.children = [createBlock('container', theme), createBlock('container', theme)];
  const vertSan = sanitizeBuilderProject({ ...INITIAL_PROJECT, blocks: [vertRow] });
  assert.equal(vertSan.blocks[0].content.rowLayoutMode, 'vertical');
  const vertHtml = generateProjectHtml(vertSan, { projectId: 'test-row-v' });
  assert.ok(vertHtml.includes('data-row-mode="vertical"'), 'Vertical row mode attribute');
  assert.ok(vertHtml.includes('flex-direction: column'), 'Vertical row uses column flex layout');
});

test('C. Undo button placed after Mobile 440 & Mobile 576 with spacing, wired in App.tsx', () => {
  const canvasSrc = readSrc('src/components/MobileCanvas.tsx');
  const idx440 = canvasSrc.indexOf('Mobile 440 px');
  const idx576 = canvasSrc.indexOf('Mobile 576 px');
  const idxUndo = canvasSrc.indexOf('data-toolbar-undo="1"');
  assert.ok(idx440 > 0 && idx576 > idx440 && idxUndo > idx576, 'Undo button must appear after Mobile 440 px and Mobile 576 px');

  const appSrc = readSrc('src/App.tsx');
  assert.ok(appSrc.includes('undoStackByProject'), 'App.tsx must maintain undo stack');
  assert.ok(appSrc.includes('const handleUndo = useCallback'), 'App.tsx must define handleUndo');
  assert.ok(appSrc.includes('canUndo={canUndo}') && appSrc.includes('onUndo={handleUndo}'), 'App.tsx must pass Undo props to MobileCanvas');
});

test('D. Manual Save Only: debounced autosave and automatic pagehide/online saves are disabled', () => {
  const appSrc = readSrc('src/App.tsx');
  assert.ok(!appSrc.includes('Debounced autosave (450ms online)'), 'Debounced autosave must be removed');
  assert.ok(!appSrc.includes('flushUnsavedIfPossible'), 'Automatic pagehide/visibilitychange flush must be removed');
  assert.ok(appSrc.includes('Manual Save mode'), 'Manual Save mode guard should be active');
  assert.ok(appSrc.includes('handleSaveProject'), 'Explicit Save button handler must remain intact');
});
