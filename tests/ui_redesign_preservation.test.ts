import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

import type { BlockType, BuilderBlock, PageTheme } from '../src/types/builder.ts';
import {
  INITIAL_PROJECT,
  PREBUILT_SECTIONS,
  THEMES,
  createBlock,
} from '../src/data/presets.ts';
import {
  getBlockThemeStatus,
  getDefaultBlockBgForTheme,
  resetBlockThemeToGlobal,
  withLocalThemeTokenPatch,
} from '../src/utils/blockThemeHelpers.ts';
import { sanitizeBuilderProject } from '../src/utils/htmlSanitizer.ts';
import { generateProjectHtml } from '../src/utils/htmlExporter.ts';

const ALL_23_BLOCK_TYPES: BlockType[] = [
  'hero_profile',
  'category_tabs',
  'fnb_catalog',
  'row',
  'text',
  'button',
  'image',
  'youtube',
  'facebook_video',
  'tiktok_video',
  'instagram_video',
  'carousel',
  'catalog',
  'training_catalog',
  'maps_place',
  'social',
  'social_follower',
  'social_feed',
  'form',
  'divider',
  'container',
  'toggle_container',
  'bottom_sheet',
];

function applyThemeRemap(
  blocks: BuilderBlock[],
  prevTheme: PageTheme,
  nextTheme: PageTheme
): BuilderBlock[] {
  const eq = (a?: string, b?: string) =>
    Boolean(a && b && a.trim().toLowerCase() === b.trim().toLowerCase());

  return blocks.map((blk) => {
    const status = getBlockThemeStatus(blk, prevTheme);
    if (blk.style.themeOverrideMode === 'local') {
      const nextAccent = (val?: string) =>
        !status.tokens.accentColor && eq(val, prevTheme.accentColor)
          ? nextTheme.accentColor
          : val;
      return {
        ...blk,
        style: {
          ...blk.style,
          textColor: !status.tokens.textColor ? nextTheme.textColor : blk.style.textColor,
          backgroundColor:
            !status.tokens.backgroundColor && blk.style.backgroundColor !== 'transparent'
              ? getDefaultBlockBgForTheme(blk, nextTheme)
              : blk.style.backgroundColor,
          borderColor: !status.tokens.borderColor
            ? nextTheme.borderColor
            : blk.style.borderColor,
        },
        content: {
          ...blk.content,
          buttonBg: nextAccent(blk.content.buttonBg),
          buttonColor: nextAccent(blk.content.buttonColor),
          toggleButtonBg: nextAccent(blk.content.toggleButtonBg),
          sheetTriggerBg: nextAccent(blk.content.sheetTriggerBg),
          socialColor: nextAccent(blk.content.socialColor),
          fnbAccentColor: nextAccent(blk.content.fnbAccentColor),
          categoryActiveBg: nextAccent(blk.content.categoryActiveBg),
        },
        children: blk.children ? applyThemeRemap(blk.children, prevTheme, nextTheme) : undefined,
      };
    }

    return {
      ...blk,
      style: {
        ...blk.style,
        textColor:
          blk.style.useThemeTextColor !== false || eq(blk.style.textColor, prevTheme.textColor)
            ? nextTheme.textColor
            : blk.style.textColor,
        backgroundColor: eq(blk.style.backgroundColor, prevTheme.cardBg)
          ? nextTheme.cardBg
          : blk.style.backgroundColor,
        borderColor: eq(blk.style.borderColor, prevTheme.borderColor)
          ? nextTheme.borderColor
          : blk.style.borderColor,
      },
      content: {
        ...blk.content,
        buttonBg: eq(blk.content.buttonBg, prevTheme.accentColor)
          ? nextTheme.accentColor
          : blk.content.buttonBg,
        buttonColor: eq(blk.content.buttonColor, prevTheme.accentColor)
          ? nextTheme.accentColor
          : blk.content.buttonColor,
      },
      children: blk.children ? applyThemeRemap(blk.children, prevTheme, nextTheme) : undefined,
    };
  });
}

describe('UI/UX Redesign Preservation & Per-Component Theme Override', () => {
  it('Creates, sanitizes, and exports all supported BlockTypes cleanly', () => {
    const theme = THEMES[0];
    const blocks = ALL_23_BLOCK_TYPES.map((type) => createBlock(type, theme));
    assert.equal(blocks.length, ALL_23_BLOCK_TYPES.length);

    const sanitized = sanitizeBuilderProject({
      ...INITIAL_PROJECT,
      theme,
      blocks,
    });
    assert.equal(sanitized.blocks.length, ALL_23_BLOCK_TYPES.length);

    const html = generateProjectHtml(sanitized, { projectId: 'test_proj' });
    assert.ok(html.toLowerCase().includes('<!doctype html>'));
    assert.ok(html.includes('cart') || html.includes('lb-fnb'));
  });

  it('Preserves all PREBUILT_SECTIONS generators', () => {
    assert.ok(PREBUILT_SECTIONS.length >= 4);
    const theme = THEMES[0];
    for (const sec of PREBUILT_SECTIONS) {
      const created = sec.createBlocks(theme);
      assert.ok(Array.isArray(created) && created.length > 0, `Section ${sec.id} should create blocks`);
    }
  });

  it('Marks local token overrides and resets only theme tokens without losing content or spacing', () => {
    const themeA = THEMES[0];
    const btn = createBlock('button', themeA);
    btn.label = 'CTA Utama';
    btn.content.label = 'Beli Sekarang via WA';
    btn.content.url = 'https://wa.me/628123456789';
    btn.style.marginBottom = 28;
    btn.style.borderRadius = 16;

    const initialStatus = getBlockThemeStatus(btn, themeA);
    assert.equal(initialStatus.mode, 'global');
    assert.equal(initialStatus.hasAnyOverride, false);

    const customized = withLocalThemeTokenPatch(
      btn,
      {
        useThemeTextColor: false,
        textColor: '#111827',
        fontFamily: 'Outfit',
      },
      {
        buttonBg: '#FF5500',
      },
      ['textColor', 'fontFamily', 'accentColor']
    );

    const localStatus = getBlockThemeStatus(customized, themeA);
    assert.equal(localStatus.mode, 'local');
    assert.equal(localStatus.tokens.textColor, true);
    assert.equal(localStatus.tokens.fontFamily, true);
    assert.equal(localStatus.tokens.accentColor, true);
    assert.equal(localStatus.tokens.borderColor, false);

    // Sanitizing preserves themeOverrideMode & themeOverrideTokens
    const sanitized = sanitizeBuilderProject({
      ...INITIAL_PROJECT,
      theme: themeA,
      blocks: [customized],
    });
    assert.equal(sanitized.blocks[0].style.themeOverrideMode, 'local');
    assert.equal(sanitized.blocks[0].style.themeOverrideTokens?.accentColor, true);
    assert.equal(sanitized.blocks[0].style.fontFamily, 'Outfit');

    // Reset back to global theme restores visual defaults while preserving content/spacing
    const resetBlk = resetBlockThemeToGlobal(sanitized.blocks[0], themeA);
    const afterReset = getBlockThemeStatus(resetBlk, themeA);
    assert.equal(afterReset.mode, 'global');
    assert.equal(resetBlk.style.fontFamily, undefined);
    assert.equal(resetBlk.content.buttonBg, themeA.accentColor);
    assert.equal(resetBlk.label, 'CTA Utama');
    assert.equal(resetBlk.content.label, 'Beli Sekarang via WA');
    assert.equal(resetBlk.content.url, 'https://wa.me/628123456789');
    assert.equal(resetBlk.style.marginBottom, 28);
    assert.equal(resetBlk.style.borderRadius, 16);
  });

  it('Preserves local theme overrides when switching global theme while updating global blocks', () => {
    const themeA = THEMES[0];
    const themeB = THEMES[2]; // Shopee Oranye

    const globalBtn = createBlock('button', themeA);
    const localBtn = withLocalThemeTokenPatch(
      createBlock('button', themeA),
      { useThemeTextColor: false, textColor: '#123456' },
      { buttonBg: '#7C3AED' },
      ['textColor', 'accentColor']
    );

    const remapped = applyThemeRemap([globalBtn, localBtn], themeA, themeB);
    // Global block inherited themeB accent
    assert.equal(remapped[0].content.buttonBg, themeB.accentColor);
    assert.equal(remapped[0].style.textColor, themeB.textColor);
    // Local overridden block kept its own textColor & buttonBg
    assert.equal(remapped[1].content.buttonBg, '#7C3AED');
    assert.equal(remapped[1].style.textColor, '#123456');
  });

  it('Maps dedicated functional icons to all Blok cards in LeftSidebar and all 4 nav menus in TopBar', () => {
    const leftSidebarSrc = fs.readFileSync(
      path.resolve('src/components/LeftSidebar.tsx'),
      'utf-8'
    );
    for (const sec of PREBUILT_SECTIONS) {
      assert.ok(
        leftSidebarSrc.includes(`'${sec.id}':`),
        `LeftSidebar SECTION_ICONS must define icon for section "${sec.id}"`
      );
    }
    assert.ok(leftSidebarSrc.includes('getSectionIcon(section.id)'));

    const topBarSrc = fs.readFileSync(
      path.resolve('src/components/TopBar.tsx'),
      'utf-8'
    );
    assert.ok(topBarSrc.includes('<PenTool'));
    assert.ok(topBarSrc.includes('<BarChart3'));
    assert.ok(topBarSrc.includes('<Megaphone'));
    assert.ok(topBarSrc.includes('<SlidersHorizontal'));
  });

  it('Places Simpan and Preview in TopBar right section ordered: Simpan, Preview, /p/slug, Logout', () => {
    const topBarSrc = fs.readFileSync(
      path.resolve('src/components/TopBar.tsx'),
      'utf-8'
    );
    const mobileCanvasSrc = fs.readFileSync(
      path.resolve('src/components/MobileCanvas.tsx'),
      'utf-8'
    );

    const saveIdx = topBarSrc.indexOf('onClick={onSaveProject}');
    const previewIdx = topBarSrc.indexOf('onClick={onOpenPreview}');
    const slugIdx = topBarSrc.indexOf('{displaySlug}', previewIdx);
    const logoutIdx = topBarSrc.indexOf('onClick={onLogout}');

    assert.ok(saveIdx > 0, 'TopBar must render Simpan button');
    assert.ok(previewIdx > saveIdx, 'Preview must come after Simpan in TopBar');
    assert.ok(slugIdx > previewIdx, '/p/slug link must come after Preview in TopBar');
    assert.ok(logoutIdx > slugIdx, 'Logout must come after /p/slug in TopBar');

    assert.equal(
      mobileCanvasSrc.includes('onSaveProject'),
      false,
      'MobileCanvas toolbar must no longer contain Simpan button'
    );
  });
});
