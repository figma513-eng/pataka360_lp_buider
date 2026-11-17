import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { INITIAL_PROJECT, createBlock } from '../src/data/presets.ts';
import { sanitizeBuilderProject } from '../src/utils/htmlSanitizer.ts';
import { generateProjectHtml } from '../src/utils/htmlExporter.ts';

describe('Builder Enhancements: Hero Profil, Katalog F&B, Font, Tombol Kategori & Kotak Gradasi', () => {
  it('Sanitizes fonts, gradient colors/angles, hero_profile, category_tabs, and fnb_catalog safely', () => {
    const hero = createBlock('hero_profile');
    hero.content.heroVariant = 'banner';
    hero.content.heroCoverFontFamily = 'Pacifico';
    hero.content.heroLogoImage = 'javascript:alert(1)';
    hero.content.heroCoverImage = 'https://example.com/banner.jpg';
    hero.style.fontFamily = 'Outfit';
    hero.style.backgroundMode = 'gradient';
    hero.style.gradientColor1 = '#FFAA00';
    hero.style.gradientColor2 = 'expression(bad)';
    hero.style.gradientAngle = 720;

    const tabs = createBlock('category_tabs');
    tabs.content.categoryScrollMode = 'vertical';

    const fnb = createBlock('fnb_catalog');
    if (fnb.content.fnbItems?.[0]) {
      fnb.content.fnbItems[0].image = 'javascript:evil()';
    }

    const box = createBlock('container');
    box.style.fontFamily = 'NotARealFont"onmouseover="alert(1)';
    box.style.backgroundMode = 'gradient';
    box.style.gradientColor1 = '#FFD000';
    box.style.gradientColor2 = '#F97316';
    box.style.gradientColor3 = '#C2410C';
    box.style.gradientAngle = 145;
    box.style.hoverLift = true;

    const dirty = {
      ...INITIAL_PROJECT,
      theme: { ...INITIAL_PROJECT.theme, fontFamily: 'Playfair Display' },
      blocks: [hero, tabs, fnb, box],
    };

    const clean = sanitizeBuilderProject(dirty);
    assert.equal(clean.theme.fontFamily, 'Playfair Display');

    const cleanHero = clean.blocks[0];
    assert.equal(cleanHero.style.fontFamily, 'Outfit');
    assert.equal(cleanHero.content.heroCoverFontFamily, 'Pacifico');
    assert.equal(cleanHero.content.heroLogoImage, '');
    assert.equal(cleanHero.content.heroCoverImage, 'https://example.com/banner.jpg');
    assert.equal(cleanHero.style.gradientAngle, 360);
    assert.equal(cleanHero.style.gradientColor2, '#9A3412');

    const cleanFnb = clean.blocks[2];
    assert.equal(cleanFnb.content.fnbItems?.[0]?.image, '');

    const cleanBox = clean.blocks[3];
    assert.equal(cleanBox.style.fontFamily, undefined);
    assert.equal(cleanBox.style.gradientAngle, 145);
    assert.equal(cleanBox.style.hoverLift, true);
  });

  it('Exports valid executable HTML with Hero Profil, Katalog F&B, Google Fonts, Category Jump & Gradient Box', () => {
    const heroBanner = createBlock('hero_profile');
    heroBanner.content.heroVariant = 'banner';
    heroBanner.content.heroCoverTitle = 'Warung Barokah';
    heroBanner.content.heroCoverFontFamily = 'Pacifico';
    heroBanner.style.fullBleed = true;
    heroBanner.style.backgroundMode = 'gradient';
    heroBanner.style.gradientColor1 = '#EFF6FF';
    heroBanner.style.gradientColor2 = '#FAF5FF';
    heroBanner.style.gradientAngle = 135;

    const tabs = createBlock('category_tabs');
    tabs.content.categoryScrollMode = 'vertical';
    tabs.content.categoryMaxHeight = 96;

    const fnb = createBlock('fnb_catalog');
    fnb.content.fnbFloatingCartPosition = 'bottom-floating';
    fnb.content.fnbFloatingCartOffsetY = 20;
    fnb.content.fnbFloatingCartLabel = 'Lanjut';

    const promoBox = createBlock('container');
    promoBox.label = 'Promo Spesial';
    promoBox.style.backgroundMode = 'gradient';
    promoBox.style.gradientColor1 = '#EA580C';
    promoBox.style.gradientColor2 = '#9A3412';
    promoBox.style.gradientAngle = 125;
    promoBox.style.hoverLift = true;
    promoBox.style.fontFamily = 'Outfit';

    const project = {
      ...INITIAL_PROJECT,
      theme: { ...INITIAL_PROJECT.theme, fontFamily: 'Playfair Display' },
      blocks: [heroBanner, tabs, fnb, promoBox],
    };

    const html = generateProjectHtml(project, { projectId: 'proj_fnb_test' });

    // Every inline executable <script> must compile cleanly with zero SyntaxError
    const scriptMatches = [...html.matchAll(/<script([^>]*)>([\s\S]*?)<\/script>/gi)].filter(
      (m) => !/type=["']application\/json["']/i.test(m[1]) && !/\bsrc=/i.test(m[1])
    );
    assert.ok(scriptMatches.length >= 1, 'Expected inline runtime script');
    for (const m of scriptMatches) {
      assert.doesNotThrow(() => new Function(m[2]), 'Exported JS script must be syntactically valid');
    }

    // Dynamic Google Fonts link includes project fonts
    assert.ok(html.includes('Playfair+Display'), 'Google Fonts link must include theme font');
    assert.ok(html.includes('Pacifico'), 'Google Fonts link must include cover font');
    assert.ok(html.includes('Outfit'), 'Google Fonts link must include block font');

    // Gradient angle + hover lift CSS
    assert.ok(html.includes('linear-gradient(125deg, #EA580C 0%, #9A3412 100%)'));
    assert.ok(html.includes('lynk-hover-lift'));

    // Category jump tabs + matching heading targets
    assert.ok(html.includes('data-cat-jump'));
    assert.ok(html.includes('data-cat-jump-btn'));
    assert.ok(html.includes('data-jump-title="favorit"'));
    assert.ok(html.includes('data-jump-title="makanan"'));
    assert.ok(html.includes('data-jump-title="promo spesial"'));

    // F&B catalog + floating capsule + store catalog collection
    assert.ok(html.includes('data-fnb-catalog='));
    assert.ok(html.includes('data-fnb-add='));
    assert.ok(html.includes('data-fnb-stepper='));
    assert.ok(html.includes('id="lynk-fnb-float-bar"'));

    const storeMatch = html.match(/<script type="application\/json" id="lynk-store-data">([\s\S]*?)<\/script>/);
    assert.ok(storeMatch, 'Expected serialized store JSON');
    const store = JSON.parse(storeMatch[1]);
    assert.equal(store.fnbFloatConfig.position, 'bottom-floating');
    assert.equal(store.fnbFloatConfig.offsetY, 20);
    assert.ok(store.catalogs[fnb.id], 'F&B catalog block must be registered in exported checkout store');
    assert.ok(store.catalogs[fnb.id].items.length >= 3);
  });

  it('Hides banner cover text & skips unused cover font when heroCoverTitleEnabled is false, and supports custom cover text size/color', () => {
    const heroHidden = createBlock('hero_profile');
    heroHidden.content.heroVariant = 'banner';
    heroHidden.content.heroCoverImage = 'https://cdn.example.com/custom-cover.webp';
    heroHidden.content.heroCoverTitle = 'Teks Tersembunyi';
    heroHidden.content.heroCoverFontFamily = 'Pacifico';
    heroHidden.content.heroCoverTitleEnabled = false;

    const hiddenProject = {
      ...INITIAL_PROJECT,
      blocks: [heroHidden],
    };
    const sanitizedHidden = sanitizeBuilderProject(hiddenProject);
    assert.equal(sanitizedHidden.blocks[0].content.heroCoverTitleEnabled, false);
    assert.equal(
      sanitizedHidden.blocks[0].content.heroCoverImage,
      'https://cdn.example.com/custom-cover.webp'
    );

    const hiddenHtml = generateProjectHtml(sanitizedHidden, { projectId: 'proj_cover_hidden' });
    assert.ok(hiddenHtml.includes('https://cdn.example.com/custom-cover.webp'));
    assert.ok(
      !hiddenHtml.includes('Teks Tersembunyi'),
      'Cover title text must not render when heroCoverTitleEnabled is false'
    );
    assert.ok(
      !hiddenHtml.includes('Pacifico'),
      'Unused cover font must not be requested when cover title is hidden'
    );

    const heroCustom = createBlock('hero_profile');
    heroCustom.content.heroVariant = 'banner';
    heroCustom.content.heroCoverTitle = 'Promo Spesial';
    heroCustom.content.heroCoverTitleEnabled = true;
    heroCustom.content.heroCoverFontFamily = 'Fraunces';
    heroCustom.content.heroCoverTitleSize = 34;
    heroCustom.content.heroCoverTitleColor = '#FDE68A';

    const sanitizedCustom = sanitizeBuilderProject({
      ...INITIAL_PROJECT,
      blocks: [heroCustom],
    });
    const customHtml = generateProjectHtml(sanitizedCustom, { projectId: 'proj_cover_custom' });
    assert.ok(customHtml.includes('Promo Spesial'));
    assert.ok(customHtml.includes('Fraunces'));
    assert.ok(customHtml.includes('font-size:34px'));
    assert.ok(customHtml.includes('color:#FDE68A'));
  });

  it('Supports horizontal/vertical category_tabs slide and 4+ column horizontal/grid row with custom column and container sizes', () => {
    const horizTabs = createBlock('category_tabs');
    horizTabs.content.categoryScrollMode = 'horizontal';
    horizTabs.content.categoryButtonPaddingX = 20;
    horizTabs.content.categoryButtonPaddingY = 10;

    const vertTabs = createBlock('category_tabs');
    vertTabs.content.categoryScrollMode = 'vertical';
    vertTabs.content.categoryMaxHeight = 88;

    const slideRow = createBlock('row');
    slideRow.content.rowLayoutMode = 'horizontal';
    slideRow.content.rowColumnWidth = 175;
    slideRow.content.rowColumnMinHeight = 140;
    slideRow.content.rowGap = 14;
    slideRow.style.widthPercent = 96;
    slideRow.style.minHeight = 160;
    slideRow.style.padding = 12;
    slideRow.style.borderRadius = 20;

    // Expand to 5 columns
    const baseChildren = slideRow.children ?? [];
    for (let i = baseChildren.length; i < 5; i += 1) {
      const card = createBlock('container');
      card.label = `Kotak ${i + 1}`;
      baseChildren.push(card);
    }
    slideRow.children = baseChildren;

    const gridRow = createBlock('row');
    gridRow.content.rowLayoutMode = 'grid';
    gridRow.content.rowColumns = 4;
    gridRow.content.rowGap = 8;

    const sanitized = sanitizeBuilderProject({
      ...INITIAL_PROJECT,
      blocks: [horizTabs, vertTabs, slideRow, gridRow],
    });

    assert.equal(sanitized.blocks[0].content.categoryScrollMode, 'horizontal');
    assert.equal(sanitized.blocks[2].content.rowLayoutMode, 'horizontal');
    assert.equal(sanitized.blocks[2].content.rowColumnWidth, 175);
    assert.equal(sanitized.blocks[2].children?.length, 5);
    assert.equal(sanitized.blocks[3].content.rowColumns, 4);

    const html = generateProjectHtml(sanitized, { projectId: 'proj_row_slide_test' });
    assert.ok(html.includes('flex-wrap:nowrap; overflow-x:auto'));
    assert.ok(html.includes('max-height:88px; overflow-y:auto'));
    assert.ok(html.includes('data-row-mode="horizontal"'));
    assert.ok(html.includes('flex: 0 0 175px; width: 175px; min-width: 175px; min-height: 140px;'));
    assert.ok(html.includes('data-row-mode="grid"'));
    assert.ok(html.includes('grid-template-columns: repeat(4, minmax(0, 1fr))'));
  });
});
