import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import { describe, it } from 'node:test';
import vm from 'node:vm';
import type { BuilderProject } from '../src/types/builder.ts';
import {
  BLOCK_TYPE_NAMES,
  PREBUILT_SECTION_CATEGORIES,
  PREBUILT_SECTIONS,
  THEMES,
  createBlock,
} from '../src/data/presets.ts';
import { generateProjectHtml } from '../src/utils/htmlExporter.ts';
import { sanitizeBuilderProject } from '../src/utils/htmlSanitizer.ts';
import { cloneBlockDeep } from '../src/utils/treeHelpers.ts';

function makeBaseProject(blocks: BuilderProject['blocks']): BuilderProject {
  return {
    title: 'Uji Portal Dinamis',
    theme: THEMES[0],
    advanceOptions: {
      showUnitSold: false,
      blockLayout: 'default',
      pageTopPadding: 12,
    },
    blocks,
  };
}

// Lightweight DOM + VM runner for exported HTML inline script verification
class MiniEl {
  tagName: string;
  _attrs = new Map<string, string>();
  children: MiniEl[] = [];
  parentNode: MiniEl | null = null;
  style: Record<string, string> = {};
  _text = '';
  value = '';
  checked = false;
  classList = {
    add: () => {},
    remove: () => {},
    contains: () => false,
  };
  private listeners = new Map<string, Array<(ev: unknown) => void>>();

  constructor(tag: string) {
    this.tagName = tag.toUpperCase();
  }
  get parentElement(): MiniEl | null {
    return this.parentNode && this.parentNode.tagName !== '#DOCUMENT' ? this.parentNode : null;
  }
  get id() {
    return this._attrs.get('id') || '';
  }
  set id(v: string) {
    this._attrs.set('id', String(v));
  }
  get href() {
    return this._attrs.get('href') || '';
  }
  set href(v: string) {
    this._attrs.set('href', String(v));
  }
  get src() {
    return this._attrs.get('src') || '';
  }
  set src(v: string) {
    this._attrs.set('src', String(v));
  }
  get textContent(): string {
    if (this.children.length === 0) return this._text;
    return this._text + this.children.map((c) => c.textContent).join('');
  }
  set textContent(v: string) {
    this.children = [];
    this._text = String(v ?? '');
  }
  get innerHTML(): string {
    return this._text;
  }
  set innerHTML(html: string) {
    this.children = [];
    this._text = '';
    if (html) parseInto(String(html), this);
  }
  setAttribute(name: string, val: string) {
    const k = name.toLowerCase();
    const s = String(val);
    this._attrs.set(k, s);
    if (k === 'value') this.value = s;
    if (k === 'checked') this.checked = true;
    if (k === 'style') {
      s.split(';').forEach((part) => {
        const idx = part.indexOf(':');
        if (idx > 0) {
          const prop = part.slice(0, idx).trim().replace(/-([a-z])/g, (_, c) => c.toUpperCase());
          this.style[prop] = part.slice(idx + 1).trim();
        }
      });
    }
  }
  getAttribute(name: string) {
    const k = name.toLowerCase();
    return this._attrs.has(k) ? this._attrs.get(k)! : null;
  }
  hasAttribute(name: string) {
    return this._attrs.has(name.toLowerCase());
  }
  removeAttribute(name: string) {
    this._attrs.delete(name.toLowerCase());
  }
  appendChild(c: MiniEl) {
    c.parentNode = this;
    this.children.push(c);
    return c;
  }
  addEventListener(type: string, fn: (ev: unknown) => void) {
    const list = this.listeners.get(type) ?? [];
    list.push(fn);
    this.listeners.set(type, list);
  }
  dispatchEvent(ev: {
    type: string;
    target?: unknown;
    defaultPrevented?: boolean;
    preventDefault: () => void;
    stopPropagation: () => void;
    stopImmediatePropagation: () => void;
  }) {
    ev.target = ev.target ?? this;
    let cur: MiniEl | null = this;
    while (cur) {
      const fns = cur.listeners.get(ev.type) ?? [];
      for (const fn of fns) fn(ev);
      cur = cur.parentNode;
    }
  }
  click() {
    let prevented = false;
    const ev = {
      type: 'click',
      target: this,
      get defaultPrevented() {
        return prevented;
      },
      preventDefault() {
        prevented = true;
      },
      stopPropagation() {},
      stopImmediatePropagation() {},
    };
    this.dispatchEvent(ev);
    return prevented;
  }
  submit() {
    let prevented = false;
    const ev = {
      type: 'submit',
      target: this,
      get defaultPrevented() {
        return prevented;
      },
      preventDefault() {
        prevented = true;
      },
      stopPropagation() {},
      stopImmediatePropagation() {},
    };
    this.dispatchEvent(ev);
    return prevented;
  }
  matches(selector: string): boolean {
    return selector
      .split(',')
      .map((s) => s.trim())
      .some((part) => matchSimple(this, part));
  }
  closest(selector: string): MiniEl | null {
    let cur: MiniEl | null = this;
    while (cur && cur.tagName !== '#DOCUMENT') {
      if (cur.matches(selector)) return cur;
      cur = cur.parentNode;
    }
    return null;
  }
  querySelectorAll(selector: string): MiniEl[] {
    const out: MiniEl[] = [];
    const walk = (n: MiniEl) => {
      for (const c of n.children) {
        if (c.matches(selector)) out.push(c);
        walk(c);
      }
    };
    walk(this);
    return out;
  }
  querySelector(selector: string): MiniEl | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
}

function matchSimple(el: MiniEl, sel: string): boolean {
  let rest = sel.trim();
  if (!rest) return false;
  if (rest.includes(' ')) {
    const parts = rest.split(/\s+/);
    const tail = parts.pop()!;
    if (!matchSimple(el, tail)) return false;
    let p = el.parentElement;
    while (p) {
      if (matchSimple(p, parts.join(' '))) return true;
      p = p.parentElement;
    }
    return false;
  }
  const tagM = rest.match(/^[a-zA-Z0-9_-]+/);
  if (tagM) {
    if (el.tagName !== tagM[0].toUpperCase()) return false;
    rest = rest.slice(tagM[0].length);
  }
  while (rest.length > 0) {
    if (rest.startsWith('#')) {
      const m = rest.match(/^#([a-zA-Z0-9_-]+)/);
      if (!m || el.id !== m[1]) return false;
      rest = rest.slice(m[0].length);
    } else if (rest.startsWith('.')) {
      const m = rest.match(/^\.([a-zA-Z0-9_-]+)/);
      const cls = (el.getAttribute('class') || '').split(/\s+/);
      if (!m || !cls.includes(m[1])) return false;
      rest = rest.slice(m[0].length);
    } else if (rest.startsWith('[')) {
      const m = rest.match(/^\[([a-zA-Z0-9_-]+)(?:="([^"]*)")?\]/);
      if (!m) return false;
      if (m[2] !== undefined) {
        if (el.getAttribute(m[1]) !== m[2]) return false;
      } else if (!el.hasAttribute(m[1])) {
        return false;
      }
      rest = rest.slice(m[0].length);
    } else {
      return false;
    }
  }
  return true;
}

const VOID_TAGS = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'source']);

function decodeEnt(s: string) {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&');
}

function parseInto(html: string, root: MiniEl) {
  const stack: MiniEl[] = [root];
  const re = /<script\b([^>]*)>([\s\S]*?)<\/script>|<\/([a-zA-Z0-9-]+)>|<([a-zA-Z0-9-]+)([^>]*?)(\/?)>|([^<]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html)) !== null) {
    const parent = stack[stack.length - 1];
    if (m[2] !== undefined) {
      const sc = new MiniEl('script');
      applyAttrs(m[1] || '', sc);
      sc._text = m[2];
      parent.appendChild(sc);
    } else if (m[3]) {
      const closeTag = m[3].toUpperCase();
      for (let i = stack.length - 1; i > 0; i--) {
        if (stack[i].tagName === closeTag) {
          stack.length = i;
          break;
        }
      }
    } else if (m[4]) {
      const tag = m[4].toLowerCase();
      const el = new MiniEl(tag);
      applyAttrs(m[5] || '', el);
      parent.appendChild(el);
      if (!m[6] && !VOID_TAGS.has(tag)) stack.push(el);
    } else if (m[7]) {
      parent._text += decodeEnt(m[7]);
    }
  }
}

function applyAttrs(raw: string, el: MiniEl) {
  const attrRe = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g;
  let m: RegExpExecArray | null;
  while ((m = attrRe.exec(raw)) !== null) {
    const name = m[1];
    const val = m[2] !== undefined ? decodeEnt(m[2]) : m[3] !== undefined ? decodeEnt(m[3]) : '';
    el.setAttribute(name, val);
  }
}

function runExportedPageInVm(html: string) {
  const doc = new MiniEl('#document');
  parseInto(html, doc);
  const body = doc.querySelector('body') || doc;
  const locationObj = {
    protocol: 'https:',
    pathname: '/p/test',
    search: '',
    hash: '',
  };
  const win: Record<string, unknown> = {
    innerWidth: 390,
    location: locationObj,
    history: { replaceState: () => {} },
    scrollTo: () => {},
    addEventListener: () => {},
    setTimeout: (fn: () => void) => {
      void fn;
      return 1;
    },
    clearTimeout: () => {},
    navigator: {},
    URLSearchParams,
    document: Object.assign(doc, {
      body,
      getElementById: (id: string) => doc.querySelector(`#${id}`),
    }),
  };
  win.window = win;
  const ctx = vm.createContext({
    ...win,
    console,
    encodeURIComponent,
    decodeURIComponent,
    JSON,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    Date,
    RegExp,
    sessionStorage: { getItem: () => null, setItem: () => {} },
  });
  const scripts = doc.querySelectorAll('script').filter((s) => !s.getAttribute('type'));
  for (const s of scripts) {
    if (s._text.trim()) {
      vm.runInContext(s._text, ctx);
    }
  }
  return { doc, win };
}

describe('Dynamic Cards, Standalone Cart Button, Required Forms & Grid Controls', () => {
  it('1. All 8 new dynamic card templates & Menu Grid 3x3 build, sanitize, and export cleanly', () => {
    const expectedIds = [
      'kartu-kutipan-tokoh',
      'kartu-informasi-nasional',
      'kartu-even-promo',
      'kartu-sertifikasi',
      'kartu-store-gradasi',
      'kartu-feed-kegiatan',
      'kartu-tarif-keanggotaan',
      'menu-grid-spesial',
    ];
    for (const id of expectedIds) {
      const sec = PREBUILT_SECTIONS.find((s) => s.id === id);
      assert.ok(sec, `Missing PREBUILT_SECTIONS entry: ${id}`);
      assert.ok(sec.category, `Section ${id} must have a category`);
      const blocks = sec.createBlocks(THEMES[0]);
      assert.ok(blocks.length > 0, `Section ${id} should build at least 1 block`);
      const sanitized = sanitizeBuilderProject(makeBaseProject(blocks));
      const html = generateProjectHtml(sanitized);
      assert.ok(html.toLowerCase().includes('<!doctype html>'), `Section ${id} failed HTML export`);
    }
    assert.ok(PREBUILT_SECTION_CATEGORIES.length >= 6);
    assert.equal(BLOCK_TYPE_NAMES.cart_button, 'Tombol Keranjang');
    assert.equal(BLOCK_TYPE_NAMES.showcase_card, 'Kartu Dinamis');
  });

  it('2. LeftSidebar separates standalone Alat vs categorized Blok and maps every section icon', async () => {
    const src = await fs.readFile(path.resolve('src/components/LeftSidebar.tsx'), 'utf8');
    // Standalone cart_button is in TOOL_ITEMS
    assert.match(src, /type:\s*'cart_button'/);
    // Template blocks moved out of standalone TOOL_ITEMS
    const toolMatch = src.match(/const TOOL_ITEMS[\s\S]*?\];/);
    assert.ok(toolMatch, 'TOOL_ITEMS block not found');
    assert.doesNotMatch(toolMatch[0], /type:\s*'hero_profile'/);
    assert.doesNotMatch(toolMatch[0], /type:\s*'fnb_catalog'/);
    assert.doesNotMatch(toolMatch[0], /type:\s*'training_catalog'/);
    assert.doesNotMatch(toolMatch[0], /type:\s*'social_follower'/);
    // Every PREBUILT_SECTIONS id has a SECTION_ICONS entry
    for (const sec of PREBUILT_SECTIONS) {
      assert.ok(
        src.includes(`'${sec.id}':`),
        `LeftSidebar SECTION_ICONS missing '${sec.id}'`
      );
    }
  });

  it('3. Standalone cart_button nested inside a container works end-to-end with - 1 + stepper and floating cart label', () => {
    const card = createBlock('container', THEMES[0]);
    const cb = createBlock('cart_button', THEMES[0]);
    cb.content = {
      ...cb.content,
      cartProductName: 'Topi APSI Resmi',
      cartProductDesc: 'Bordir logo premium',
      cartProductPrice: 'Rp 80.000',
      cartButtonLabel: 'Keranjang',
      cartWhatsappNumber: '6281122334455',
      cartStoreName: 'APSI Store',
      cartFloatingEnabled: true,
      cartFloatingLabel: 'Cek Keranjang Belanja',
      cartFloatingBg: '#059669',
    };
    card.children = [cb];

    const project = sanitizeBuilderProject(makeBaseProject([card]));
    const html = generateProjectHtml(project);

    assert.ok(html.includes('Topi APSI Resmi'));
    assert.ok(html.includes('Cek Keranjang Belanja'));

    const { doc } = runExportedPageInVm(html);
    const addBtn = doc.querySelector('[data-fnb-add]');
    const stepper = doc.querySelector('[data-fnb-stepper]');
    const qtyEl = doc.querySelector('[data-fnb-qty]');
    const floatBar = doc.querySelector('#lynk-fnb-float-bar');
    const floatLabel = doc.querySelector('#lynk-fnb-float-label');

    assert.ok(addBtn && stepper && qtyEl && floatBar && floatLabel);
    assert.equal(floatBar.style.display, 'none');

    // Click Add -> quantity 1, button hides, stepper shows inline-flex, floating bar shows custom label
    addBtn.click();
    assert.equal(qtyEl.textContent, '1');
    assert.equal(addBtn.style.display, 'none');
    assert.equal(stepper.style.display, 'inline-flex');
    assert.equal(floatBar.style.display, 'flex');
    assert.equal(floatLabel.textContent, 'Cek Keranjang Belanja');

    // Increment to 2
    const incBtn = doc.querySelector('[data-fnb-inc]');
    assert.ok(incBtn);
    incBtn.click();
    assert.equal(qtyEl.textContent, '2');

    // Open cart via floating bar button -> verify WA link targets 6281122334455
    const floatBtn = doc.querySelector('#lynk-fnb-float-btn');
    assert.ok(floatBtn);
    floatBtn.click();
    const waBtn = doc.querySelector('#lynk-cart-wa-btn');
    assert.ok(waBtn);
    assert.ok(waBtn.href.startsWith('https://wa.me/6281122334455?text='));
    assert.ok(decodeURIComponent(waBtn.href).includes('Topi APSI Resmi'));

    // Decrement back to 0 -> button restores inline-flex
    const decBtn = doc.querySelector('[data-fnb-dec]');
    assert.ok(decBtn);
    decBtn.click();
    decBtn.click();
    assert.equal(addBtn.style.display, 'inline-flex');
    assert.equal(stepper.style.display, 'none');
  });

  it('4. Required vs Optional validation works in Form block, Catalog/F&B Checkout, and Training Catalog', () => {
    // (A) Form block with required checklist + optional email
    const formBlk = createBlock('form', THEMES[0]);
    formBlk.content = {
      ...formBlk.content,
      formTitle: 'Form Konsultasi',
      formNameRequired: true,
      formEmailRequired: false,
      formChecklistEnabled: true,
      formChecklistTitle: 'Syarat Konsultasi',
      formChecklistItems: ['Saya setuju dihubungi tim'],
      formChecklistRequired: true,
    };
    const clonedForm = cloneBlockDeep(formBlk);
    assert.deepEqual(clonedForm.content.formChecklistItems, ['Saya setuju dihubungi tim']);

    const formHtml = generateProjectHtml(sanitizeBuilderProject(makeBaseProject([formBlk])));
    const { doc: formDoc } = runExportedPageInVm(formHtml);
    const formEl = formDoc.querySelector('[data-lynk-form]');
    const textInputs = formDoc.querySelectorAll('input[type="text"]');
    const nameInput = textInputs[0];
    const emailInput = textInputs[1];
    const formChk = formDoc.querySelector('[data-form-chk]');
    const formErr = formDoc.querySelector('.form-err');
    const formMsg = formDoc.querySelector('.form-msg');
    assert.ok(formEl && nameInput && emailInput && formChk && formErr && formMsg);
    assert.equal(nameInput.hasAttribute('required'), true);
    assert.equal(emailInput.hasAttribute('required'), false);

    // Submit empty -> blocked with error
    formEl.submit();
    assert.equal(formErr.style.display, 'block');
    assert.equal(formMsg.style.display, 'none');

    // Fill name ONLY (email is optional!) + check required checklist -> succeeds!
    nameInput.value = 'Budi Santoso';
    formChk.checked = true;
    formEl.submit();
    assert.equal(formErr.style.display, 'none');
    assert.equal(formMsg.style.display, 'block');

    // (B) Training Catalog with required field + required checklist
    const trn = createBlock('training_catalog', THEMES[0]);
    trn.content = {
      ...trn.content,
      trainingChecklistItems: ['Fotokopi KTP'],
      trainingChecklistRequired: true,
      trainingFormFields: [
        { id: 'tf_nama', label: 'Nama Lengkap', placeholder: 'Nama', type: 'text', required: true },
        { id: 'tf_catatan', label: 'Catatan', placeholder: 'Opsional', type: 'text', required: false },
      ],
    };
    const trnHtml = generateProjectHtml(sanitizeBuilderProject(makeBaseProject([trn])));
    const { doc: trnDoc } = runExportedPageInVm(trnHtml);
    const trnWa = trnDoc.querySelector('[data-trn-wa]');
    const trnErr = trnDoc.querySelector('[data-trn-error]');
    const trnNama = trnDoc.querySelector('[data-trn-field="tf_nama"]');
    const trnChk = trnDoc.querySelector('[data-trn-chk="0"]');
    assert.ok(trnWa && trnErr && trnNama && trnChk);

    // Clicking WA without filling required name & checklist -> prevented!
    const blocked1 = trnWa.click();
    assert.equal(blocked1, true);
    assert.equal(trnErr.style.display, 'block');

    // Fill required name + check checklist (leave optional Catatan empty) -> allowed!
    trnNama.value = 'Rina';
    trnNama.dispatchEvent({
      type: 'input',
      preventDefault() {},
      stopPropagation() {},
      stopImmediatePropagation() {},
    });
    trnChk.checked = true;
    trnChk.dispatchEvent({
      type: 'change',
      preventDefault() {},
      stopPropagation() {},
      stopImmediatePropagation() {},
    });
    const blocked2 = trnWa.click();
    assert.equal(blocked2, false);
    assert.equal(trnErr.style.display, 'none');

    // (C) F&B / Catalog Checkout with required customer field & required shipping checklist
    const fnb = createBlock('fnb_catalog', THEMES[0]);
    fnb.content = {
      ...fnb.content,
      catalogCustomerFields: [
        { id: 'cf_nama', label: 'Nama Pemesan', placeholder: 'Nama', type: 'text', required: true },
        { id: 'cf_note', label: 'Catatan', placeholder: 'Opsional', type: 'text', required: false },
      ],
      catalogShippingOptions: [
        {
          id: 'makan_ditempat',
          enabled: true,
          label: 'Makan di Tempat',
          askArrivalTime: true,
          arrivalTimeLabel: 'Jam Datang',
          arrivalTimeRequired: true,
          checklistEnabled: true,
          checklistItems: ['Konfirmasi meja'],
          checklistRequired: true,
        },
      ],
    };
    const fnbHtml = generateProjectHtml(sanitizeBuilderProject(makeBaseProject([fnb])));
    const { doc: fnbDoc } = runExportedPageInVm(fnbHtml);
    const addMenu = fnbDoc.querySelector('[data-fnb-add]');
    const openCartBtn = fnbDoc.querySelector('#lynk-fnb-float-btn');
    assert.ok(addMenu && openCartBtn);
    addMenu.click();
    openCartBtn.click();

    const cartWa = fnbDoc.querySelector('#lynk-cart-wa-btn');
    const cartErr = fnbDoc.querySelector('#lynk-cart-error');
    assert.ok(cartWa && cartErr);

    // Click WA with required fields missing -> prevented!
    assert.equal(cartWa.click(), true);
    assert.equal(cartErr.style.display, 'block');

    // Fill required fields -> allowed!
    const namaInp = fnbDoc.querySelector('[data-cust-field="cf_nama"]');
    const timeInp = fnbDoc.querySelector('#lynk-ship-time');
    const shipChk = fnbDoc.querySelector('[data-ship-chk="0"]');
    assert.ok(namaInp && timeInp && shipChk);
    namaInp.value = 'Andi';
    namaInp.dispatchEvent({
      type: 'input',
      preventDefault() {},
      stopPropagation() {},
      stopImmediatePropagation() {},
    });
    timeInp.value = '19:00 WIB';
    timeInp.dispatchEvent({
      type: 'input',
      preventDefault() {},
      stopPropagation() {},
      stopImmediatePropagation() {},
    });
    shipChk.checked = true;
    shipChk.dispatchEvent({
      type: 'change',
      preventDefault() {},
      stopPropagation() {},
      stopImmediatePropagation() {},
    });
    assert.equal(cartWa.click(), false);
    assert.equal(cartErr.style.display, 'none');
  });

  it('5. Row Grid mode preserves rowColumns and rowGridRows across sanitization and export', () => {
    const grid = createBlock('row', THEMES[0]);
    grid.content = {
      ...grid.content,
      rowLayoutMode: 'grid',
      rowColumns: 3,
      rowGridRows: 3,
      rowGap: 8,
    };
    grid.children = Array.from({ length: 9 }, () => createBlock('menu_icon', THEMES[0]));
    const sanitized = sanitizeBuilderProject(makeBaseProject([grid]));
    assert.equal(sanitized.blocks[0].content.rowColumns, 3);
    assert.equal(sanitized.blocks[0].content.rowGridRows, 3);
    const html = generateProjectHtml(sanitized);
    assert.ok(html.includes('grid-template-columns: repeat(3, minmax(0, 1fr))'));
  });
});
