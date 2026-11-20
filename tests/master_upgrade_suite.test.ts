import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createBlock, INITIAL_PROJECT, THEMES } from '../src/data/presets.ts';
import { sanitizeBuilderProject } from '../src/utils/htmlSanitizer.ts';
import { generateProjectHtml } from '../src/utils/htmlExporter.ts';
import { buildSectionDInlineCss, buildSectionDReactStyle } from '../src/utils/blockStyleCss.ts';
import {
  DYNAMIC_FORM_FIELD_TYPES,
  FORM_REQUIRED_RULE_LABELS,
  isFieldVisiblyActive,
  validateDynamicFormSubmission,
} from '../src/utils/formValidation.ts';
import {
  WHATSAPP_VARIABLE_GROUPS,
  applyWhatsappFormat,
  buildWaMeUrl,
  createDefaultWhatsappCenter,
  renderWhatsappTemplate,
  resolveWhatsappDispatch,
} from '../src/utils/whatsappBuilder.ts';
import { UI_LABEL_CATALOG, UI_LABEL_DEFAULT_MAP } from '../src/utils/uiAppearanceLabels.ts';
import { BuilderProject, CatalogCustomerField } from '../src/types/builder.ts';

const readSrc = (rel: string) => fs.readFileSync(path.join(process.cwd(), rel), 'utf8');

test('Section B & UI Labels: Pengaturan Umum exists, labels unique, Bahasa Indonesia standardized', () => {
  const keys = UI_LABEL_CATALOG.map((item) => item.key);
  assert.equal(new Set(keys).size, keys.length, 'Every UI appearance label key must be unique');
  assert.equal(UI_LABEL_DEFAULT_MAP['konten.sec.general'], 'Pengaturan Umum');
  assert.equal(UI_LABEL_DEFAULT_MAP['desain.sec.specific'], 'Pengaturan Khusus Komponen');

  const topBarSrc = readSrc('src/components/TopBar.tsx');
  assert.ok(topBarSrc.includes('Pratinjau'), 'TopBar should use Bahasa Indonesia Pratinjau');
  assert.ok(topBarSrc.includes('Usaha Aktif'), 'TopBar should use Usaha Aktif');

  const rightInspectorSrc = readSrc('src/components/RightInspector.tsx');
  assert.ok(rightInspectorSrc.includes('Properti Komponen'), 'RightInspector uses Properti Komponen');
  assert.ok(rightInspectorSrc.includes('Salin Komponen'), 'RightInspector has Salin Komponen');
  assert.ok(rightInspectorSrc.includes('Tempel Komponen'), 'RightInspector has Tempel Komponen');

  const contentTabSrc = readSrc('src/components/inspector/BlockContentTab.tsx');
  const idxItems = contentTabSrc.indexOf('id="items"');
  const idxMain = contentTabSrc.indexOf('id="main"');
  const idxNav = contentTabSrc.indexOf('id="nav"');
  const idxGeneral = contentTabSrc.indexOf('id="general"');
  const idxActions = contentTabSrc.indexOf('id="actions"');
  assert.ok(
    idxItems > 0 &&
      idxMain > idxItems &&
      idxNav > idxMain &&
      idxGeneral > idxNav &&
      idxActions > idxGeneral,
    'Konten tab must follow order: Data & Daftar Item (1) -> Konten Utama (2) -> Tautan & Navigasi (3) -> Pengaturan Umum (4) -> Aksi & Interaksi (5)'
  );

  const designTabSrc = readSrc('src/components/inspector/BlockDesignTab.tsx');
  const idxSpecific = designTabSrc.indexOf('id="specific"');
  const idxVisual = designTabSrc.indexOf('id="visual"');
  assert.ok(
    idxSpecific > 0 && idxVisual > idxSpecific,
    'Desain tab must place Pengaturan Khusus Komponen (id="specific") at the very top before Gaya Visual (id="visual")'
  );
  assert.ok(
    designTabSrc.includes("case 'row':"),
    'Desain tab Pengaturan Khusus Komponen must handle row (Kolom / Slide)'
  );
});

test('Section D: All Design Panel properties map consistently to Canvas React CSS and Exported HTML CSS', () => {
  const theme = THEMES[0];
  const card = createBlock('container', theme);
  card.style = {
    ...card.style,
    displayMode: 'flex',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    flexWrap: 'wrap',
    gap: 14,
    overflow: 'hidden',
    minWidth: 120,
    maxWidth: 520,
    heightPx: 260,
    maxHeight: 400,
    positionMode: 'relative',
    posTop: 4,
    posLeft: 8,
    zIndex: 12,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#00C98A',
    bgImageUrl: 'https://example.com/bg.jpg',
    bgPosition: 'center',
    bgSize: 'cover',
    bgRepeat: 'no-repeat',
    textDecoration: 'underline',
    textTransform: 'uppercase',
    opacity: 85,
    transformScale: 105,
    transformRotate: 3,
    transitionMs: 250,
  };

  const reactCss = buildSectionDReactStyle(card.style);
  assert.equal(reactCss.display, 'flex');
  assert.equal(reactCss.flexDirection, 'row');
  assert.equal(reactCss.gap, '14px');
  assert.equal(reactCss.minWidth, '120px');
  assert.equal(reactCss.maxWidth, '520px');
  assert.equal(reactCss.height, '260px');
  assert.equal(reactCss.position, 'relative');
  assert.equal(reactCss.zIndex, 12);
  assert.equal(reactCss.borderStyle, 'dashed');
  assert.equal(reactCss.textTransform, 'uppercase');
  assert.equal(reactCss.opacity, 0.85);
  assert.ok(String(reactCss.transform).includes('scale(1.050)'));
  assert.ok(String(reactCss.transform).includes('rotate(3deg)'));

  const inlineCss = buildSectionDInlineCss(card.style);
  assert.ok(inlineCss.includes('display:flex'));
  assert.ok(inlineCss.includes('min-width:120px'));
  assert.ok(inlineCss.includes('max-width:520px'));
  assert.ok(inlineCss.includes('border-style:dashed'));
  assert.ok(inlineCss.includes('text-transform:uppercase'));
  assert.ok(inlineCss.includes('transition:all 250ms ease'));

  const project: BuilderProject = { ...INITIAL_PROJECT, blocks: [card] };
  const sanitized = sanitizeBuilderProject(project);
  const html = generateProjectHtml(sanitized, { projectId: 'test-sec-d' });
  assert.ok(html.includes('max-width: 576px'), 'Section E: 576px centered container must be preserved');
  assert.ok(html.includes('border: 2px dashed #00C98A'));
  assert.ok(html.includes('min-width:120px'));
  assert.ok(html.includes('background-image:url("https://example.com/bg.jpg")'));
});

test('Section F: Undo, Redo, Copy, Paste wired across App.tsx and MobileCanvas.tsx', () => {
  const appSrc = readSrc('src/App.tsx');
  assert.ok(appSrc.includes('redoStackByProject'), 'App.tsx maintains redo stack');
  assert.ok(appSrc.includes('const handleRedo = useCallback'), 'App.tsx implements handleRedo');
  assert.ok(appSrc.includes('const handleCopyBlock = useCallback'), 'App.tsx implements handleCopyBlock');
  assert.ok(appSrc.includes('const handlePasteBlock = useCallback'), 'App.tsx implements handlePasteBlock');

  const canvasSrc = readSrc('src/components/MobileCanvas.tsx');
  assert.ok(canvasSrc.includes('data-toolbar-undo="1"'), 'Canvas has Batalkan/Undo button');
  assert.ok(canvasSrc.includes('data-toolbar-redo="1"'), 'Canvas has Ulangi/Redo button');
});

test('Section G: Parent-Child Container Slider (Horizontal & Vertical) preserves children and emits runtime HTML', () => {
  const theme = THEMES[0];
  const childA = createBlock('text', theme);
  childA.content.text = 'Slide Anak Pertama';
  const childB = createBlock('button', theme);
  childB.content.label = 'Tombol Anak Kedua';

  for (const mode of ['slider_horizontal', 'slider_vertical'] as const) {
    const parent = createBlock('container', theme);
    parent.label = `Wadah ${mode}`;
    parent.content.containerLayoutMode = mode;
    parent.content.sliderVisibleItems = 2;
    parent.content.sliderGap = 16;
    parent.content.sliderSpeedMs = 400;
    parent.content.sliderTransition = 'smooth';
    parent.content.sliderLoop = true;
    parent.content.sliderAutoplay = true;
    parent.content.sliderAutoplayIntervalMs = 3000;
    parent.content.sliderShowArrows = true;
    parent.content.sliderShowDots = true;
    parent.content.sliderTouchSwipe = true;
    parent.content.sliderMouseDrag = true;
    parent.content.sliderSnap = true;
    parent.content.sliderOverflow = 'hidden';
    parent.children = [childA, childB];

    const sanitized = sanitizeBuilderProject({ ...INITIAL_PROJECT, blocks: [parent] });
    assert.equal(sanitized.blocks[0].content.containerLayoutMode, mode);
    assert.equal(sanitized.blocks[0].children?.length, 2, 'Children remain preserved in tree');

    const html = generateProjectHtml(sanitized, { projectId: `test-slider-${mode}` });
    assert.ok(html.includes(`data-lb-cslider="1"`), 'Slider wrapper attribute emitted');
    assert.ok(html.includes(`data-slider-mode="${mode}"`), 'Slider mode emitted');
    assert.ok(html.includes(`data-block-id="${childA.id}"`), 'First child block remains intact');
    assert.ok(html.includes(`data-block-id="${childB.id}"`), 'Second child block remains intact');
    assert.ok(html.includes('lynk-cslider-prev') && html.includes('lynk-cslider-next'), 'Navigation arrows emitted');
    assert.ok(html.includes('lynk-cslider-dots'), 'Pagination dots emitted');
  }
});

test('Section H: Dynamic Form Builder supports all 14 field types, 6 granular required rules, conditionals & HTML export', () => {
  assert.equal(DYNAMIC_FORM_FIELD_TYPES.length, 14, 'Must support all 14 dynamic field types');
  assert.equal(Object.keys(FORM_REQUIRED_RULE_LABELS).length, 7, 'Optional + 6 granular required rules');

  const fields: CatalogCustomerField[] = [
    { id: 'f_nama', label: 'Nama Lengkap', placeholder: '', type: 'name', requiredRule: 'required_fill' },
    { id: 'f_email', label: 'Email', placeholder: '', type: 'email', requiredRule: 'required_fill' },
    { id: 'f_phone', label: 'Telepon', placeholder: '', type: 'phone', requiredRule: 'required_fill' },
    { id: 'f_num', label: 'Jumlah', placeholder: '', type: 'number', requiredRule: 'required_fill', minValue: 2, maxValue: 10 },
    { id: 'f_radio', label: 'Paket', placeholder: '', type: 'radio', requiredRule: 'required_one', options: ['Reguler', 'VIP'] },
    {
      id: 'f_min',
      label: 'Minat',
      placeholder: '',
      type: 'checkbox_group',
      requiredRule: 'required_min_choices',
      minChoices: 2,
      options: ['A', 'B', 'C'],
    },
    {
      id: 'f_consent_spec',
      label: 'Persetujuan Khusus',
      placeholder: '',
      type: 'checkbox_group',
      requiredRule: 'required_consent_specific',
      options: ['Setuju Syarat', 'Info Promo'],
      requiredOptionIndexes: [0],
    },
    {
      id: 'f_consent_all',
      label: 'Persetujuan Penuh',
      placeholder: '',
      type: 'checkbox_group',
      requiredRule: 'required_consent_all',
      options: ['Poin 1', 'Poin 2'],
    },
    {
      id: 'f_cond',
      label: 'Catatan VIP',
      placeholder: '',
      type: 'textarea',
      requiredRule: 'required_fill',
      conditionalFieldId: 'f_radio',
      conditionalValue: 'VIP',
    },
  ];

  // Conditional field hidden when Paket = Reguler
  assert.equal(isFieldVisiblyActive(fields[8], { f_radio: 'Reguler' }), false);
  assert.equal(isFieldVisiblyActive(fields[8], { f_radio: 'VIP' }), true);

  // Invalid submission catches every rule
  const invalid = validateDynamicFormSubmission({
    fields,
    values: {
      f_nama: '',
      f_email: 'bukan-email',
      f_phone: '123',
      f_num: '1',
      f_radio: 'VIP',
      f_min: ['A'],
      f_consent_spec: ['Info Promo'],
      f_consent_all: ['Poin 1'],
      f_cond: '',
    },
  });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.f_nama);
  assert.ok(invalid.errors.f_email);
  assert.ok(invalid.errors.f_phone);
  assert.ok(invalid.errors.f_num);
  assert.ok(invalid.errors.f_min);
  assert.ok(invalid.errors.f_consent_spec);
  assert.ok(invalid.errors.f_consent_all);
  assert.ok(invalid.errors.f_cond);

  // Valid submission passes cleanly
  const valid = validateDynamicFormSubmission({
    fields,
    values: {
      f_nama: 'Budi Santoso',
      f_email: 'budi@contoh.id',
      f_phone: '081234567890',
      f_num: '5',
      f_radio: 'Reguler',
      f_min: ['A', 'B'],
      f_consent_spec: ['Setuju Syarat'],
      f_consent_all: ['Poin 1', 'Poin 2'],
    },
  });
  assert.equal(valid.valid, true);

  // Exported HTML contains dynamic inputs & validation attributes
  const theme = THEMES[0];
  const formBlk = createBlock('form', theme);
  formBlk.content.formTitle = 'Formulir Pendaftaran';
  formBlk.content.formFields = fields;
  formBlk.content.formWhatsappEnabled = true;
  const html = generateProjectHtml(
    sanitizeBuilderProject({ ...INITIAL_PROJECT, blocks: [formBlk] }),
    { projectId: 'test-dyn-form' }
  );
  assert.ok(html.includes('data-form-block-id='));
  assert.ok(html.includes('data-required-rule="required_min_choices"'));
  assert.ok(html.includes('data-cond-field="f_radio"'));
  assert.ok(html.includes('/api/form-submissions'));
});

test('Section I & J: Pusat WhatsApp formatting produces pure WA syntax, clean fallback & zero raw tokens', () => {
  assert.ok(WHATSAPP_VARIABLE_GROUPS.length >= 4, 'Grouped variables available');

  const bolded = applyWhatsappFormat('Halo Dunia', 0, 4, 'bold');
  assert.equal(bolded.nextText, '*Halo* Dunia');
  assert.ok(!bolded.nextText.includes('<b>'), 'Never produces raw HTML tags');

  const center = createDefaultWhatsappCenter('Toko Nusantara', '081234567890');
  const rendered = renderWhatsappTemplate(
    '*Halo {{nama_usaha}}*\nNama: {{nama_pelanggan}}\nCatatan: {{catatan}}\nPromo: {{variabel_tidak_ada}}',
    {
      nama_usaha: 'Toko Nusantara',
      nama_pelanggan: 'Siti Rahma',
      catatan: '',
    }
  );
  assert.ok(rendered.includes('*Halo Toko Nusantara*'));
  assert.ok(rendered.includes('Nama: Siti Rahma'));
  assert.ok(!rendered.includes('{{'), 'Zero raw {{token}} allowed in rendered message');
  assert.ok(!rendered.includes('Catatan:'), 'Empty label lines cleanly stripped');

  const dispatch = resolveWhatsappDispatch({
    project: { whatsappCenter: center },
    functionType: 'konsultasi',
    context: { nama_pelanggan: 'Andi' },
  });
  assert.equal(dispatch.phone, '6281234567890');
  assert.ok(!dispatch.message.includes('{{'));
  const waUrl = buildWaMeUrl(dispatch.phone, dispatch.message);
  assert.ok(waUrl.startsWith('https://wa.me/6281234567890?text='));

  // Button linked to Pusat WhatsApp emits wa.me URL + tracking attributes
  const theme = THEMES[0];
  const btn = createBlock('button', theme);
  btn.content.label = 'Chat Admin';
  btn.content.whatsappLinkId = center.links[0].id;
  const html = generateProjectHtml(
    sanitizeBuilderProject({ ...INITIAL_PROJECT, whatsappCenter: center, blocks: [btn] }),
    { projectId: 'test-wa-center' }
  );
  assert.ok(html.includes('https://wa.me/6281234567890?text='));
  assert.ok(html.includes(`data-lynk-wa-link-id="${center.links[0].id}"`));
});

test('Section L: Layer Panel auto-scroll targets 25% top offset inside left panel only', () => {
  const homeSettingsSrc = readSrc('src/components/inspector/HomePageSettings.tsx');
  assert.ok(homeSettingsSrc.includes('root.clientHeight * 0.25'), 'Targets 25% from top of layer panel');
  assert.ok(homeSettingsSrc.includes('root.scrollTo({ top: nextScrollTop'), 'Scrolls only the layer panel container');
  assert.ok(!homeSettingsSrc.includes('scrollIntoView('), 'Never uses scrollIntoView that can shift page/canvas');
});

test('Right Inspector dropdowns default open, centered compact styling, and Layer Panel auto-accordion switches groups A -> B', async () => {
  const { resolveExpandedLayerGroupsForSelection } = await import('../src/utils/treeHelpers.ts');

  // 1. Right Inspector (Konten & Desain) all dropdowns open by default
  const contentSrc = readSrc('src/components/inspector/BlockContentTab.tsx');
  const designSrc = readSrc('src/components/inspector/BlockDesignTab.tsx');
  const contentStateMatch = contentSrc.match(
    /useState<Record<ContentSectionId,\s*boolean>>\(\{([\s\S]*?)\}\)/
  );
  const designStateMatch = designSrc.match(
    /useState<Record<DesignSectionId,\s*boolean>>\(\{([\s\S]*?)\}\)/
  );
  assert.ok(contentStateMatch, 'BlockContentTab defines openSections state');
  assert.ok(designStateMatch, 'BlockDesignTab defines openSections state');
  assert.ok(!contentStateMatch[1].includes(': false'), 'All BlockContentTab dropdowns default open');
  assert.ok(!designStateMatch[1].includes(': false'), 'All BlockDesignTab dropdowns default open');

  // 2. Centered compact dropdown interiors in AccordionSection & CSS
  const primSrc = readSrc('src/components/inspector/InspectorPrimitives.tsx');
  const cssSrc = readSrc('src/index.css');
  assert.ok(primSrc.includes('data-accordion-body={id}'), 'AccordionSection marks body container');
  assert.ok(primSrc.includes('w-[94%] mx-auto'), 'AccordionSection centers inner dropdown content');
  assert.ok(cssSrc.includes('.inspector-compact [data-accordion-body]'), 'CSS applies symmetrical horizontal breathing room');
  assert.ok(cssSrc.includes('.inspector-compact [data-accordion-inner]'), 'CSS centers inner dropdown column');

  // 3. Layer Panel dropdown switches Canvas A -> Canvas B cleanly
  const theme = THEMES[0];
  const childA1 = createBlock('text', theme);
  childA1.id = 'child_a1';
  const subRowA = createBlock('row', theme);
  subRowA.id = 'row_a';
  const deepBtnA = createBlock('button', theme);
  deepBtnA.id = 'btn_a_deep';
  subRowA.children = [deepBtnA];

  const groupA = createBlock('container', theme);
  groupA.id = 'group_a';
  groupA.children = [childA1, subRowA];

  const childB1 = createBlock('image', theme);
  childB1.id = 'child_b1';
  const footerBtnB = createBlock('cart_button', theme);
  footerBtnB.id = 'footer_b1';
  const groupB = createBlock('showcase_card', theme);
  groupB.id = 'group_b';
  groupB.children = [childB1];
  groupB.content.cardFooterBlocks = [footerBtnB];

  const tree = [groupA, groupB];

  // Click child inside Canvas A -> Group A & subRowA open, Group B closed
  const stateA: Record<string, boolean> = resolveExpandedLayerGroupsForSelection(tree, 'btn_a_deep');
  assert.equal(Boolean(stateA.group_b), false, 'Group B stays closed while Canvas A is active');
  assert.deepEqual(stateA, { group_a: true, row_a: true });

  // Switch click to Canvas B (footer child) -> Group A closes automatically, Group B opens
  const stateB: Record<string, boolean> = resolveExpandedLayerGroupsForSelection(tree, 'footer_b1');
  assert.equal(Boolean(stateB.group_a), false, 'Group A closes automatically when switching to Canvas B');
  assert.deepEqual(stateB, { group_b: true });

  // Click parent group B directly -> Group B opens, Group A remains closed
  const stateBParent: Record<string, boolean> = resolveExpandedLayerGroupsForSelection(tree, 'group_b');
  assert.equal(Boolean(stateBParent.group_a), false);
  assert.deepEqual(stateBParent, { group_b: true });

  const homeSettingsSrc = readSrc('src/components/inspector/HomePageSettings.tsx');
  assert.ok(homeSettingsSrc.includes('data-layer-dropdown-toggle={blk.id}'), 'Layer rows render dropdown toggle');
  assert.ok(homeSettingsSrc.includes('resolveExpandedLayerGroupsForSelection'), 'HomePageSettings uses auto-accordion group resolver');
});
