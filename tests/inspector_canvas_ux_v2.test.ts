import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import { INITIAL_PROJECT, THEMES, createBlock } from '../src/data/presets.ts';
import { sanitizeBuilderProject } from '../src/utils/htmlSanitizer.ts';
import {
  generateProjectHtml,
  resolveShadowSizePx,
  shadowToCss,
} from '../src/utils/htmlExporter.ts';

describe('Unified Inspector UI/UX, Inline Header Rename, Canvas Overlap Fix & Lapisan Duplicate', () => {
  it('Supports independent paddingLeft/Right, marginTop, shadowSize, shapePreset, and menuIconImageSize with full backward compatibility', () => {
    const theme = THEMES[0];
    const card = createBlock('container', theme);
    card.style = {
      ...card.style,
      shapePreset: 'pill',
      paddingTop: 10,
      paddingRight: 6,
      paddingBottom: 12,
      paddingLeft: 4,
      marginTop: 14,
      marginBottom: 18,
      shadowSize: 16,
      shadowColor: '#2563EB',
    };

    const mico = createBlock('menu_icon', theme);
    mico.content = {
      ...mico.content,
      menuIconImage: 'https://example.com/icon.png',
      menuIconSize: 72,
      menuIconImageSize: 44,
      menuIconShape: 'pill',
      menuIconLabel: 'TNI',
    };
    mico.style = {
      ...mico.style,
      fontSize: 14,
      fontWeightCss: '700',
    };

    const sanitized = sanitizeBuilderProject({
      ...INITIAL_PROJECT,
      theme,
      blocks: [card, mico],
    });

    assert.equal(sanitized.blocks[0].style.paddingLeft, 4);
    assert.equal(sanitized.blocks[0].style.paddingRight, 6);
    assert.equal(sanitized.blocks[0].style.marginTop, 14);
    assert.equal(sanitized.blocks[0].style.shadowSize, 16);
    assert.equal(sanitized.blocks[0].style.shapePreset, 'pill');
    assert.equal(sanitized.blocks[1].content.menuIconImageSize, 44);
    assert.equal(sanitized.blocks[1].content.menuIconShape, 'pill');

    // Numeric shadowSize renders smooth CSS & legacy preset fallback remains intact
    assert.ok(shadowToCss('sm', '#2563EB', 16).includes('16px rgba(37, 99, 235'));
    assert.equal(shadowToCss('md', undefined, 0), 'none');
    assert.equal(resolveShadowSizePx('md', undefined), 24);
    assert.equal(resolveShadowSizePx('none', 12), 12);

    const html = generateProjectHtml(sanitized, { projectId: 'ux_v2_test' });
    assert.ok(html.includes('padding: 10px 6px 12px 4px'), 'Exported HTML must apply 4-side padding');
    assert.ok(html.includes('margin: 14px auto 18px auto'), 'Exported HTML must apply marginTop & marginBottom');
    assert.ok(html.includes('border-radius: 9999px'), 'Exported HTML must apply pill shapePreset radius');
    assert.ok(html.includes('width: 44px; height: 44px;'), 'Exported HTML must apply menuIconImageSize');
  });

  it('Enables inline layer name editing directly in RightInspector header and removes Identity accordion from BlockContentTab', () => {
    const rightInspectorSrc = fs.readFileSync(
      path.resolve('src/components/RightInspector.tsx'),
      'utf-8'
    );
    const contentTabSrc = fs.readFileSync(
      path.resolve('src/components/inspector/BlockContentTab.tsx'),
      'utf-8'
    );

    assert.ok(
      rightInspectorSrc.includes('value={selectedBlock.label}') &&
        rightInspectorSrc.includes('...blk, label: e.target.value'),
      'RightInspector header must render inline editable input for selectedBlock.label'
    );
    assert.equal(
      contentTabSrc.includes("id=\"identity\""),
      false,
      'BlockContentTab must no longer render redundant Identitas Komponen accordion'
    );
  });

  it('Prevents stacked ancestor hover badges and clipped nested toolbars in MobileCanvas', () => {
    const canvasSrc = fs.readFileSync(path.resolve('src/components/MobileCanvas.tsx'), 'utf-8');

    assert.ok(
      canvasSrc.includes('hoveredBlockId') && canvasSrc.includes('setHoveredBlockId(block.id)'),
      'MobileCanvas must track single innermost hoveredBlockId'
    );
    assert.equal(
      canvasSrc.includes('group-hover:opacity-90'),
      false,
      'MobileCanvas must not use cascading group-hover badges that stack on ancestors'
    );
    assert.ok(
      canvasSrc.includes("depth > 0 || s.fullBleed ? 'top-1 left-1.5'"),
      'Nested/full-bleed drag badge must sit inside top edge to avoid clipping'
    );
    assert.ok(
      canvasSrc.includes("depth > 0 || s.fullBleed ? 'top-1 right-1.5'"),
      'Nested/full-bleed quick toolbar must sit inside top edge to avoid clipping'
    );
  });

  it('Adds Duplicate (Copy) action button to every layer row in Body (Lapisan)', () => {
    const homeSettingsSrc = fs.readFileSync(
      path.resolve('src/components/inspector/HomePageSettings.tsx'),
      'utf-8'
    );
    const leftSidebarSrc = fs.readFileSync(
      path.resolve('src/components/LeftSidebar.tsx'),
      'utf-8'
    );
    const appSrc = fs.readFileSync(path.resolve('src/App.tsx'), 'utf-8');

    assert.ok(
      homeSettingsSrc.includes('onDuplicateBlock(blk.id)') &&
        homeSettingsSrc.includes('title="Duplikat Lapisan"'),
      'HomePageSettings must render Duplicate button on every layer row'
    );
    assert.ok(
      leftSidebarSrc.includes('onDuplicateBlock={onDuplicateBlock}'),
      'LeftSidebar must forward onDuplicateBlock to HomePageSettings'
    );
    assert.ok(
      appSrc.includes('onDuplicateBlock={handleDuplicateBlock}'),
      'App must wire handleDuplicateBlock to LeftSidebar'
    );
  });

  it('Unifies Gaya Visual & Layout & Spasi in BlockDesignTab and moves Tipografi & Row/Menu Icon settings into BlockContentTab', () => {
    const designTabSrc = fs.readFileSync(
      path.resolve('src/components/inspector/BlockDesignTab.tsx'),
      'utf-8'
    );
    const contentTabSrc = fs.readFileSync(
      path.resolve('src/components/inspector/BlockContentTab.tsx'),
      'utf-8'
    );

    // BlockDesignTab unified controls across all components
    for (const expected of [
      "label: 'Bulat'",
      "label: 'Segi Empat'",
      "label: 'Kotak'",
      "label: 'Kapsul'",
      'Kartu Bersih + Lift',
      'Box Promo Gradasi',
      'Padding Atas',
      'Padding Bawah',
      'Padding Kanan',
      'Padding Kiri',
      'Jarak Atas (Margin)',
      'shadowSize: val',
      'Warna Shadow',
    ]) {
      assert.ok(
        designTabSrc.includes(expected),
        `BlockDesignTab must include unified control: ${expected}`
      );
    }

    // BlockContentTab unified Tipografi + Menu Icon photo size + Row settings
    for (const expected of [
      'renderTypographyControls',
      'Ukuran Foto (px)',
      'menuIconImageSize',
      'renderRowSettings',
      'Jumlah Kolom / Slide (1–20)',
    ]) {
      assert.ok(
        contentTabSrc.includes(expected),
        `BlockContentTab must include: ${expected}`
      );
    }
  });
});
