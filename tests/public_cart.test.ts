import assert from 'node:assert/strict';
import http from 'node:http';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import { after, before, describe, it } from 'node:test';
import vm from 'node:vm';
import type { BuilderProject } from '../src/types/builder.ts';
import { createBlock, THEMES } from '../src/data/presets.ts';
import { generateProjectHtml } from '../src/utils/htmlExporter.ts';
import { sanitizeBuilderProject } from '../src/utils/htmlSanitizer.ts';

class MockClassList {
  private set = new Set<string>();
  private el: MockElement;
  constructor(el: MockElement) {
    this.el = el;
  }
  syncFromAttr(raw: string) {
    this.set = new Set(String(raw || '').split(/\s+/).filter(Boolean));
  }
  add(...tokens: string[]) {
    for (const t of tokens) if (t) this.set.add(t);
    this.el._attrs.set('class', [...this.set].join(' '));
  }
  remove(...tokens: string[]) {
    for (const t of tokens) this.set.delete(t);
    this.el._attrs.set('class', [...this.set].join(' '));
  }
  contains(token: string) {
    return this.set.has(token);
  }
}

class MockElement {
  tagName: string;
  _attrs = new Map<string, string>();
  children: MockElement[] = [];
  parentNode: MockElement | null = null;
  style: Record<string, string> = {};
  classList: MockClassList;
  _text = '';
  value = '';
  checked = false;
  disabled = false;
  scrollLeft = 0;
  clientWidth = 375;
  private listeners = new Map<string, Array<(ev: unknown) => void>>();

  constructor(tag: string) {
    this.tagName = tag.toUpperCase();
    this.classList = new MockClassList(this);
  }

  get parentElement(): MockElement | null {
    return this.parentNode && this.parentNode.tagName !== '#DOCUMENT' ? this.parentNode : null;
  }

  get id(): string {
    return this._attrs.get('id') || '';
  }
  set id(v: string) {
    this._attrs.set('id', String(v));
  }

  get href(): string {
    return this._attrs.get('href') || '';
  }
  set href(v: string) {
    this._attrs.set('href', String(v));
  }

  get src(): string {
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
    return this._text + this.children.map((c) => c.outerHTML).join('');
  }
  set innerHTML(html: string) {
    this.children = [];
    this._text = '';
    if (!html) return;
    parseHtmlInto(String(html), this);
  }

  get outerHTML(): string {
    const tag = this.tagName.toLowerCase();
    const attrs = [...this._attrs.entries()]
      .map(([k, v]) => ` ${k}="${v.replace(/"/g, '&quot;')}"`)
      .join('');
    return `<${tag}${attrs}>${this.innerHTML}</${tag}>`;
  }

  setAttribute(name: string, val: string) {
    const key = name.toLowerCase();
    const sVal = String(val);
    this._attrs.set(key, sVal);
    if (key === 'class') this.classList.syncFromAttr(sVal);
    if (key === 'style') parseStyleString(sVal, this.style);
    if (key === 'value') this.value = sVal;
    if (key === 'checked') this.checked = true;
  }

  getAttribute(name: string): string | null {
    const key = name.toLowerCase();
    if (key === 'style' && Object.keys(this.style).length > 0 && !this._attrs.has('style')) {
      return Object.entries(this.style).map(([k, v]) => `${k}:${v}`).join(';');
    }
    return this._attrs.has(key) ? this._attrs.get(key)! : null;
  }

  hasAttribute(name: string): boolean {
    return this._attrs.has(name.toLowerCase());
  }

  removeAttribute(name: string) {
    this._attrs.delete(name.toLowerCase());
  }

  appendChild(child: MockElement): MockElement {
    if (child.parentNode) {
      child.parentNode.removeChild(child);
    }
    child.parentNode = this;
    this.children.push(child);
    return child;
  }

  removeChild(child: MockElement): MockElement {
    const idx = this.children.indexOf(child);
    if (idx >= 0) this.children.splice(idx, 1);
    child.parentNode = null;
    return child;
  }

  replaceChild(nextChild: MockElement, oldChild: MockElement): MockElement {
    const idx = this.children.indexOf(oldChild);
    if (idx >= 0) {
      oldChild.parentNode = null;
      nextChild.parentNode = this;
      this.children[idx] = nextChild;
    }
    return oldChild;
  }

  addEventListener(type: string, fn: (ev: unknown) => void) {
    const list = this.listeners.get(type) ?? [];
    list.push(fn);
    this.listeners.set(type, list);
  }

  dispatchEvent(ev: {
    type: string;
    target?: MockElement;
    key?: string;
    defaultPrevented?: boolean;
    stopPropagation?: () => void;
    preventDefault?: () => void;
    _stopped?: boolean;
  }) {
    ev.target = ev.target || this;
    ev.defaultPrevented = false;
    ev._stopped = false;
    ev.preventDefault = () => {
      ev.defaultPrevented = true;
    };
    ev.stopPropagation = () => {
      ev._stopped = true;
    };
    let cur: MockElement | null = this;
    while (cur && !ev._stopped) {
      const fns = cur.listeners.get(ev.type) ?? [];
      for (const fn of [...fns]) {
        fn(ev);
      }
      cur = cur.parentNode;
    }
  }

  click() {
    this.dispatchEvent({ type: 'click', target: this });
  }

  matches(selector: string): boolean {
    return selector
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean)
      .some((part) => matchesCompound(this, part));
  }

  closest(selector: string): MockElement | null {
    let cur: MockElement | null = this;
    while (cur && cur.tagName !== '#DOCUMENT') {
      if (cur.matches(selector)) return cur;
      cur = cur.parentNode;
    }
    return null;
  }

  querySelectorAll(selector: string): MockElement[] {
    const out: MockElement[] = [];
    const walk = (node: MockElement) => {
      for (const ch of node.children) {
        if (ch.matches(selector)) out.push(ch);
        walk(ch);
      }
    };
    walk(this);
    return out;
  }

  querySelector(selector: string): MockElement | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }

  scrollIntoView() {}
  scrollTo() {}
}

function parseStyleString(raw: string, out: Record<string, string>) {
  for (const decl of raw.split(';')) {
    const idx = decl.indexOf(':');
    if (idx <= 0) continue;
    const prop = decl.slice(0, idx).trim();
    const camel = prop.replace(/-([a-z])/g, (_, ch) => ch.toUpperCase());
    out[camel] = decl.slice(idx + 1).trim();
    out[prop] = decl.slice(idx + 1).trim();
  }
}

function matchesCompound(el: MockElement, compound: string): boolean {
  if (!compound || el.tagName === '#DOCUMENT') return false;
  let rem = compound.trim();
  // Check tag name at start
  const tagMatch = rem.match(/^([a-zA-Z0-9_-]+)/);
  if (tagMatch) {
    if (el.tagName !== tagMatch[1].toUpperCase()) return false;
    rem = rem.slice(tagMatch[1].length);
  }
  while (rem.length > 0) {
    if (rem[0] === '#') {
      const m = rem.match(/^#([a-zA-Z0-9_-]+)/);
      if (!m || el.id !== m[1]) return false;
      rem = rem.slice(m[0].length);
    } else if (rem[0] === '.') {
      const m = rem.match(/^\.([a-zA-Z0-9_-]+)/);
      if (!m || !el.classList.contains(m[1])) return false;
      rem = rem.slice(m[0].length);
    } else if (rem[0] === '[') {
      const closeIdx = rem.indexOf(']');
      if (closeIdx === -1) return false;
      const expr = rem.slice(1, closeIdx);
      const eq = expr.indexOf('=');
      if (eq === -1) {
        if (!el.hasAttribute(expr.trim())) return false;
      } else {
        const attrName = expr.slice(0, eq).trim();
        let attrVal = expr.slice(eq + 1).trim();
        if (
          (attrVal.startsWith('"') && attrVal.endsWith('"')) ||
          (attrVal.startsWith("'") && attrVal.endsWith("'"))
        ) {
          attrVal = attrVal.slice(1, -1);
        }
        if (el.getAttribute(attrName) !== attrVal) return false;
      }
      rem = rem.slice(closeIdx + 1);
    } else {
      return false;
    }
  }
  return true;
}

function decodeEntities(s: string): string {
  return s
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .replace(/&larr;/g, '←');
}

const VOID_TAGS = new Set(['img', 'input', 'br', 'hr', 'meta', 'link']);

function parseHtmlInto(html: string, root: MockElement) {
  const stack: MockElement[] = [root];
  const tokenRe = /<(\/)?([a-zA-Z0-9_-]+)((?:\s+[^<>]*?)?)(\/)?>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(html)) !== null) {
    const parent = stack[stack.length - 1];
    if (m[5]) {
      const txt = decodeEntities(m[5]);
      if (parent.children.length === 0) parent._text += txt;
      continue;
    }
    const isClose = Boolean(m[1]);
    const tag = m[2].toLowerCase();
    const attrsStr = m[3] || '';
    const selfClose = Boolean(m[4]) || VOID_TAGS.has(tag);

    if (isClose) {
      if (tag === 'script' || tag === 'style') continue;
      for (let i = stack.length - 1; i >= 1; i--) {
        if (stack[i].tagName.toLowerCase() === tag) {
          stack.length = i;
          break;
        }
      }
      continue;
    }

    if (tag === 'script' || tag === 'style') {
      // Skip inner text until closing tag
      const closeRe = new RegExp(`</${tag}>`, 'i');
      const rest = html.slice(tokenRe.lastIndex);
      const cMatch = closeRe.exec(rest);
      const el = new MockElement(tag);
      parseAttrs(attrsStr, el);
      if (cMatch) {
        el._text = rest.slice(0, cMatch.index);
        tokenRe.lastIndex += cMatch.index + cMatch[0].length;
      }
      parent.appendChild(el);
      continue;
    }

    const el = new MockElement(tag);
    parseAttrs(attrsStr, el);
    parent.appendChild(el);
    if (!selfClose) {
      stack.push(el);
    }
  }
}

function parseAttrs(attrsStr: string, el: MockElement) {
  const attrRe = /([a-zA-Z0-9_-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'>]+)))?/g;
  let am: RegExpExecArray | null;
  while ((am = attrRe.exec(attrsStr)) !== null) {
    const key = am[1].toLowerCase();
    const val = decodeEntities(am[2] ?? am[3] ?? am[4] ?? '');
    el.setAttribute(key, val);
  }
}

function mountPublicHtmlRuntime(html: string) {
  const docEl = new MockElement('#document');
  const bodyMatch = html.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  const bodyHtml = bodyMatch ? bodyMatch[1] : html;
  const body = new MockElement('body');
  docEl.appendChild(body);
  parseHtmlInto(bodyHtml, body);

  const winListeners = new Map<string, Array<(ev: unknown) => void>>();
  const sessionStore = new Map<string, string>();
  const locationObj = {
    protocol: 'https:',
    origin: 'https://example.test',
    pathname: '/p/test-shop',
    search: '',
    _hash: '',
    get hash() {
      return this._hash;
    },
    set hash(val: string) {
      const normalized = val.startsWith('#') ? val : val ? '#' + val : '';
      if (this._hash !== normalized) {
        this._hash = normalized;
        for (const fn of winListeners.get('hashchange') ?? []) {
          fn({ type: 'hashchange' });
        }
      }
    },
  };

  const documentObj = {
    body,
    getElementById(id: string) {
      return body.querySelector(`[id="${id}"]`);
    },
    querySelector(sel: string) {
      return body.querySelector(sel);
    },
    querySelectorAll(sel: string) {
      return body.querySelectorAll(sel);
    },
    createElement(tag: string) {
      return new MockElement(tag);
    },
    addEventListener(type: string, fn: (ev: unknown) => void) {
      docEl.addEventListener(type, fn);
    },
  };

  body.parentNode = docEl;

  const windowObj: Record<string, unknown> = {
    innerWidth: 390,
    location: locationObj,
    document: documentObj,
    scrollTo: () => {},
    addEventListener: (type: string, fn: (ev: unknown) => void) => {
      const list = winListeners.get(type) ?? [];
      list.push(fn);
      winListeners.set(type, list);
    },
  };

  const sandbox: Record<string, unknown> = {
    window: windowObj,
    document: documentObj,
    location: locationObj,
    history: {
      replaceState: (_s: unknown, _t: string, url: string) => {
        const hashIdx = url.indexOf('#');
        locationObj._hash = hashIdx >= 0 ? url.slice(hashIdx) : '';
      },
    },
    navigator: { sendBeacon: () => true },
    sessionStorage: {
      getItem: (k: string) => sessionStore.get(k) ?? null,
      setItem: (k: string, v: string) => sessionStore.set(k, String(v)),
    },
    URL,
    URLSearchParams,
    Blob: class MockBlob {
      parts: unknown[];
      opts?: unknown;
      constructor(parts: unknown[], opts?: unknown) {
        this.parts = parts;
        this.opts = opts;
      }
    },
    fetch: async () => ({ ok: false, json: async () => null }),
    encodeURIComponent,
    decodeURIComponent,
    setTimeout,
    clearTimeout,
    console,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    JSON,
    RegExp,
    Date,
    isFinite,
    isNaN,
  };
  (windowObj as Record<string, unknown>).window = windowObj;

  const scripts = [...html.matchAll(/<script(?![^>]*src)([^>]*)>([\s\S]*?)<\/script>/gi)].filter(
    (m) => !/type=["']application\/json["']/i.test(m[1])
  );
  assert.ok(scripts.length >= 1, 'Expected inline script block');
  for (const sc of scripts) {
    vm.runInNewContext(sc[2], sandbox);
  }

  return { body, documentObj, windowObj, locationObj };
}

function buildCatalogProject(opts: {
  layout?: 'default' | 'grid' | 'large-image' | 'compact';
  detailEnabled?: boolean;
  withFnb?: boolean;
  insideSheet?: boolean;
}): BuilderProject {
  const theme = THEMES[0];
  const catalogBlock = createBlock('catalog', theme);
  catalogBlock.id = 'cat_pub_1';
  catalogBlock.content.catalogWhatsappNumber = '081299988877';
  catalogBlock.content.catalogStoreName = 'Toko Publik Test';
  catalogBlock.content.catalogDetailEnabled = opts.detailEnabled ?? true;
  catalogBlock.content.catalogCartEnabled = true;
  catalogBlock.content.catalogItems = [
    {
      id: 'item_a',
      title: 'Kopi Susu Arena',
      subtitle: 'Botol 250ml',
      badge: 'Terlaris',
      variants: 'Normal Sugar, Less Sugar',
      description: 'Kopi susu segar',
      pickupNote: 'Ambil dingin di kulkas',
      price: 'Rp 25.000',
      ctaLabel: 'Beli',
      url: 'https://toko.example.com/kopi',
      image: '/assets/kopi.png',
      unitSold: 10,
    },
  ];

  const blocks = [];
  if (opts.insideSheet) {
    const sheetBlock = createBlock('bottom_sheet', theme);
    sheetBlock.id = 'sheet_menu_1';
    sheetBlock.content.sheetTriggerLabel = 'Buka Menu';
    sheetBlock.content.sheetTitle = 'Menu Toko';
    sheetBlock.children = [catalogBlock];
    blocks.push(sheetBlock);
  } else {
    blocks.push(catalogBlock);
  }

  if (opts.withFnb) {
    const fnbBlock = createBlock('fnb_catalog', theme);
    fnbBlock.id = 'fnb_pub_1';
    fnbBlock.content.catalogWhatsappNumber = '081299988877';
    fnbBlock.content.catalogStoreName = 'Warung Publik';
    fnbBlock.content.fnbItems = [
      {
        id: 'fnb_1',
        title: 'Nasi Goreng Spesial',
        description: 'Porsi kenyang',
        price: 'Rp 30.000',
        category: 'Makanan',
      },
    ];
    blocks.push(fnbBlock);
  }

  return sanitizeBuilderProject({
    title: 'Toko Publik Test',
    theme,
    advanceOptions: {
      blockLayout: opts.layout ?? 'default',
      showUnitSold: true,
    },
    publishing: {
      slug: 'toko-publik-test',
      isPublished: true,
      customDomain: '',
      useCustomDomain: false,
    },
    blocks,
  });
}

describe('Public URL /p/:slug Shopping Cart Runtime & Markup Suite', () => {
  it('executes cart end-to-end on pages WITHOUT video blocks across all 4 layouts (no early return bug)', () => {
    for (const layout of ['default', 'grid', 'large-image', 'compact'] as const) {
      const proj = buildCatalogProject({ layout, detailEnabled: true });
      const html = generateProjectHtml(proj, { projectId: 'proj_no_vid' });
      const { documentObj } = mountPublicHtmlRuntime(html);

      const quickBtn = documentObj.querySelector('[data-quick-add="cat_pub_1::item_a"]');
      assert.ok(quickBtn, `Expected quick-add button in ${layout}`);
      quickBtn.click();

      const cartBar = documentObj.getElementById('lynk-cart-bar');
      assert.ok(cartBar);
      assert.equal(cartBar.style.display, 'block', `Cart bar must be visible in ${layout}`);
      assert.equal(
        documentObj.getElementById('lynk-cart-bar-count')?.textContent,
        '1 item di keranjang'
      );
      assert.match(documentObj.getElementById('lynk-cart-bar-total')?.textContent || '', /25\.000/);

      // Open cart sub-page via floating bar button
      const openCartBtn = documentObj.getElementById('lynk-open-cart-btn');
      assert.ok(openCartBtn);
      openCartBtn.click();

      const cartView = documentObj.getElementById('lynk-subpage-cart');
      assert.ok(cartView);
      assert.equal(cartView.style.display, 'block');
      assert.equal(documentObj.getElementById('lynk-main-view')?.style.display, 'none');

      // Increment qty inside cart view
      const incBtn = cartView.querySelector('[data-cart-inc]');
      assert.ok(incBtn);
      incBtn.click();
      assert.match(cartView.innerHTML, /50\.000/);

      // Fill customer field & check WA link updates
      const nameInput = cartView.querySelector('[data-cust-field="cf_name"]');
      assert.ok(nameInput);
      nameInput.value = 'Budi Santoso';
      nameInput.dispatchEvent({ type: 'input', target: nameInput });

      const waBtn = documentObj.getElementById('lynk-cart-wa-btn');
      assert.ok(waBtn);
      assert.match(waBtn.href, /^https:\/\/wa\.me\/6281299988877\?text=/);
      const decodedWa = decodeURIComponent(waBtn.href.split('?text=')[1] || '');
      assert.match(decodedWa, /Kopi Susu Arena/);
      assert.match(decodedWa, /Jumlah: 2/);
      assert.match(decodedWa, /Budi Santoso/);

      // Clear cart
      const clearBtn = documentObj.getElementById('lynk-cart-clear');
      assert.ok(clearBtn);
      clearBtn.click();
      assert.match(cartView.innerHTML, /Keranjang masih kosong/);
    }
  });

  it('supports detail sub-page variants, qty stepper, direct WA, and adding to cart without video blocks', () => {
    const proj = buildCatalogProject({ layout: 'default', detailEnabled: true });
    const html = generateProjectHtml(proj, { projectId: 'proj_det' });
    const { documentObj, locationObj } = mountPublicHtmlRuntime(html);

    const card = documentObj.querySelector('[data-open-detail="cat_pub_1::item_a"]');
    assert.ok(card);
    card.click();

    assert.equal(locationObj.hash, '#produk-cat_pub_1--item_a');
    const detailView = documentObj.getElementById('lynk-subpage-detail');
    assert.ok(detailView);
    assert.equal(detailView.style.display, 'block');

    // Select second variant and increment qty
    const varBtns = detailView.querySelectorAll('[data-det-var]');
    assert.equal(varBtns.length, 2);
    varBtns[1].click();
    documentObj.getElementById('lynk-det-plus')?.click();

    const detWa = documentObj.getElementById('lynk-det-wa');
    assert.ok(detWa);
    const decodedDirectWa = decodeURIComponent(detWa.href.split('?text=')[1] || '');
    assert.match(decodedDirectWa, /Less Sugar/);
    assert.match(decodedDirectWa, /Jumlah: 2/);

    documentObj.getElementById('lynk-det-add')?.click();
    assert.equal(documentObj.getElementById('lynk-det-cart-count')?.textContent, '2');

    // Navigate from detail page directly into cart sub-page
    detailView.querySelector('[data-nav-cart]')?.click();
    assert.equal(locationObj.hash, '#keranjang');
    assert.equal(documentObj.getElementById('lynk-subpage-cart')?.style.display, 'block');
  });

  it('never nests <button data-quick-add> inside <a> when catalogDetailEnabled is false, and quick-add works in all layouts', () => {
    for (const layout of ['default', 'grid', 'large-image', 'compact'] as const) {
      const proj = buildCatalogProject({ layout, detailEnabled: false });
      const html = generateProjectHtml(proj, { projectId: 'proj_nodet' });
      const { documentObj } = mountPublicHtmlRuntime(html);

      const quickBtn = documentObj.querySelector('[data-quick-add="cat_pub_1::item_a"]');
      assert.ok(quickBtn, `Expected quick-add button in ${layout} with detailEnabled=false`);
      assert.equal(
        quickBtn.closest('a'),
        null,
        `<button data-quick-add> must NOT be nested inside <a> in ${layout}`
      );

      quickBtn.click();
      assert.equal(documentObj.getElementById('lynk-cart-bar')?.style.display, 'block');
      assert.equal(
        documentObj.getElementById('lynk-cart-bar-count')?.textContent,
        '1 item di keranjang'
      );
    }
  });

  it('supports F&B catalog add/inc/dec & floating capsule AND keeps cart bars above open bottom sheets', () => {
    const proj = buildCatalogProject({
      layout: 'default',
      detailEnabled: true,
      withFnb: true,
      insideSheet: true,
    });
    const html = generateProjectHtml(proj, { projectId: 'proj_sheet_fnb' });
    const { documentObj } = mountPublicHtmlRuntime(html);

    // Z-index of floating bars must sit above .lynk-sheet-backdrop (9600)
    const cartBar = documentObj.getElementById('lynk-cart-bar');
    const fnbFloat = documentObj.getElementById('lynk-fnb-float-bar');
    assert.ok(Number(cartBar?.style.zIndex) > 9600);
    assert.ok(Number(fnbFloat?.style.zIndex) > 9600);

    // Open bottom sheet containing catalog block
    const openSheetBtn = documentObj.querySelector('[data-sheet-open="sheet_sheet_menu_1"]');
    assert.ok(openSheetBtn);
    openSheetBtn.click();
    const sheetEl = documentObj.getElementById('sheet_sheet_menu_1');
    assert.ok(sheetEl?.classList.contains('is-open'));

    // Add item from inside moved bottom sheet
    const sheetQuickAdd = sheetEl?.querySelector('[data-quick-add="cat_pub_1::item_a"]');
    assert.ok(sheetQuickAdd);
    sheetQuickAdd.click();

    // F&B float bar should be visible even while sheet is open
    assert.equal(fnbFloat?.style.display, 'flex');

    // Add & increment F&B menu item
    const fnbAdd = documentObj.querySelector('[data-fnb-add="fnb_pub_1::fnb_1"]');
    assert.ok(fnbAdd);
    fnbAdd.click();
    assert.equal(fnbAdd.style.display, 'none');
    assert.equal(
      documentObj.querySelector('[data-fnb-qty="fnb_pub_1::fnb_1"]')?.textContent,
      '1'
    );

    documentObj.querySelector('[data-fnb-inc="fnb_pub_1::fnb_1"]')?.click();
    assert.equal(
      documentObj.querySelector('[data-fnb-qty="fnb_pub_1::fnb_1"]')?.textContent,
      '2'
    );
    assert.equal(documentObj.getElementById('lynk-fnb-float-count')?.textContent, '3 item');

    // Clicking floating capsule opens cart and automatically closes open bottom sheets
    documentObj.getElementById('lynk-fnb-float-btn')?.click();
    assert.equal(sheetEl?.classList.contains('is-open'), false);
    assert.equal(documentObj.getElementById('lynk-subpage-cart')?.style.display, 'block');
  });

  it('works with video block + toggle_container + multi-store cart + shipping options & checklist', () => {
    const theme = THEMES[0];
    const videoBlock = createBlock('tiktok_video', theme);
    videoBlock.id = 'vid_1';

    const catStore1 = createBlock('catalog', theme);
    catStore1.id = 'cat_s1';
    catStore1.content.catalogStoreName = 'Toko Satu';
    catStore1.content.catalogWhatsappNumber = '08111111111';
    catStore1.content.catalogItems = [
      {
        id: 'p1',
        title: 'Produk Satu',
        subtitle: '',
        price: 'Rp 40.000',
        image: '/assets/p1.png',
        url: 'https://toko1.example.com',
        ctaLabel: 'Beli',
        unitSold: 5,
      },
    ];

    const catStore2 = createBlock('catalog', theme);
    catStore2.id = 'cat_s2';
    catStore2.content.catalogStoreName = 'Toko Dua';
    catStore2.content.catalogWhatsappNumber = '08222222222';
    catStore2.content.catalogItems = [
      {
        id: 'p2',
        title: 'Produk Dua',
        subtitle: '',
        price: 'Rp 60.000',
        image: '/assets/p2.png',
        url: 'https://toko2.example.com',
        ctaLabel: 'Beli',
        unitSold: 3,
      },
    ];

    const toggleBlock = createBlock('toggle_container', theme);
    toggleBlock.id = 'tog_1';
    toggleBlock.content.toggleShowLabel = 'Daftar Produk';
    toggleBlock.children = [catStore1, catStore2];

    const proj = sanitizeBuilderProject({
      title: 'Multi Store Test',
      theme,
      advanceOptions: {
        blockLayout: 'default',
        showUnitSold: true,
      },
      publishing: {
        slug: 'multi-store',
        isPublished: true,
        customDomain: '',
        useCustomDomain: false,
      },
      blocks: [videoBlock, toggleBlock],
    });
    const html = generateProjectHtml(proj, { projectId: 'proj_multi' });
    const { documentObj } = mountPublicHtmlRuntime(html);

    documentObj.querySelector('[data-quick-add="cat_s1::p1"]')?.click();
    documentObj.querySelector('[data-quick-add="cat_s2::p2"]')?.click();
    assert.equal(
      documentObj.getElementById('lynk-cart-bar-count')?.textContent,
      '2 item di keranjang'
    );

    documentObj.getElementById('lynk-open-cart-btn')?.click();
    const cartView = documentObj.getElementById('lynk-subpage-cart');
    assert.ok(cartView);
    assert.equal(cartView.querySelectorAll('[data-cart-wa-grp]').length, 2);

    // Switch shipping method to gosend_penjual and tick first checklist item
    cartView.querySelector('[data-ship-opt="gosend_penjual"]')?.click();
    const firstChk = cartView.querySelector('[data-ship-chk="0"]');
    assert.ok(firstChk, 'Expected gosend checklist checkbox');
    firstChk.checked = true;
    firstChk.dispatchEvent({ type: 'change', target: firstChk });

    const grp0 = cartView.querySelector('[data-cart-wa-grp="0"]');
    const grp1 = cartView.querySelector('[data-cart-wa-grp="1"]');
    assert.ok(grp0 && grp0.href.startsWith('https://wa.me/628111111111?text='));
    assert.ok(grp1 && grp1.href.startsWith('https://wa.me/628222222222?text='));
    const decoded0 = decodeURIComponent(grp0.href.split('?text=')[1] || '');
    assert.match(decoded0, /Produk Satu/);
    assert.match(decoded0, /Konfirmasi Checklist:/);
    assert.match(decoded0, /\[✓\]/);
  });

  describe('Live Server GET /p/:slug Integration', () => {
    let tempDataDir = '';
    let prevDataDir: string | undefined;
    let prevNodeEnv: string | undefined;
    let prevDbUrl: string | undefined;
    let server: http.Server;
    let baseUrl = '';

    before(async () => {
      tempDataDir = await fs.mkdtemp(path.join(os.tmpdir(), 'lynk-pub-cart-'));
      prevDataDir = process.env.LYNK_DATA_DIR;
      prevNodeEnv = process.env.NODE_ENV;
      prevDbUrl = process.env.DATABASE_URL;
      process.env.LYNK_DATA_DIR = tempDataDir;
      process.env.NODE_ENV = 'test';
      delete process.env.DATABASE_URL;

      const [{ createApp }, { resetDbConnectionCheck }, { resetJsonStoreCacheForTests }, { authRateLimiter, apiRateLimiter }] =
        await Promise.all([
          import('../server.ts'),
          import('../src/db/index.ts'),
          import('../src/db/repository.ts'),
          import('../src/server/rateLimiter.ts'),
        ]);
      authRateLimiter.reset();
      apiRateLimiter.reset();
      resetJsonStoreCacheForTests();
      await resetDbConnectionCheck();

      const app = await createApp({ attachViteOrStatic: false });
      await new Promise<void>((resolve) => {
        server = http.createServer(app);
        server.listen(0, '127.0.0.1', () => resolve());
      });
      const addr = server.address() as { port: number };
      baseUrl = `http://127.0.0.1:${addr.port}`;
    });

    after(async () => {
      await new Promise<void>((resolve) => server.close(() => resolve()));
      if (prevDataDir === undefined) delete process.env.LYNK_DATA_DIR;
      else process.env.LYNK_DATA_DIR = prevDataDir;
      if (prevNodeEnv === undefined) delete process.env.NODE_ENV;
      else process.env.NODE_ENV = prevNodeEnv;
      if (prevDbUrl !== undefined) process.env.DATABASE_URL = prevDbUrl;
      const [{ resetDbConnectionCheck }, { resetJsonStoreCacheForTests }] = await Promise.all([
        import('../src/db/index.ts'),
        import('../src/db/repository.ts'),
      ]);
      resetJsonStoreCacheForTests();
      await resetDbConnectionCheck();
      await fs.rm(tempDataDir, { recursive: true, force: true });
    });

    it('serves /p/:slug with live working cart even when page has no video block and detailEnabled=false', async () => {
      const meRes = await fetch(`${baseUrl}/api/auth/me`);
      const meData = (await meRes.json()) as { csrfToken: string };
      let cookies = meRes.headers.getSetCookie().map((c) => c.split(';')[0]);
      const csrfCookie =
        cookies.find((c) => c.startsWith('lynk_csrf='))?.split('=')[1] || meData.csrfToken;

      const regRes = await fetch(`${baseUrl}/api/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: baseUrl,
          Cookie: cookies.join('; '),
          'X-Lynk-CSRF': csrfCookie,
          'X-Lynk-Requested-With': 'fetch',
        },
        body: JSON.stringify({
          name: 'Owner Toko',
          email: 'owner-cart@test.local',
          password: 'Password123!',
        }),
      });
      assert.equal(regRes.status, 201);
      const regCookies = regRes.headers.getSetCookie().map((c) => c.split(';')[0]);
      if (regCookies.length) cookies = regCookies;
      const nextCsrf =
        cookies.find((c) => c.startsWith('lynk_csrf='))?.split('=')[1] || meData.csrfToken;

      const project = buildCatalogProject({
        layout: 'grid',
        detailEnabled: false,
        withFnb: false,
      });
      const pubRes = await fetch(`${baseUrl}/api/projects/proj_pub_cart_live/publish`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Origin: baseUrl,
          Cookie: cookies.join('; '),
          'X-Lynk-CSRF': nextCsrf,
          'X-Lynk-Requested-With': 'fetch',
        },
        body: JSON.stringify({
          record: {
            id: 'proj_pub_cart_live',
            revision: 1,
            updatedAt: Date.now(),
            lastSavedAt: 0,
            project,
          },
        }),
      });
      assert.equal(pubRes.status, 200);

      const pageRes = await fetch(`${baseUrl}/p/toko-publik-test`);
      assert.equal(pageRes.status, 200);
      const html = await pageRes.text();

      const { documentObj } = mountPublicHtmlRuntime(html);
      const quickBtn = documentObj.querySelector('[data-quick-add="cat_pub_1::item_a"]');
      assert.ok(quickBtn);
      assert.equal(quickBtn.closest('a'), null);
      quickBtn.click();

      assert.equal(documentObj.getElementById('lynk-cart-bar')?.style.display, 'block');
      documentObj.getElementById('lynk-open-cart-btn')?.click();
      assert.equal(documentObj.getElementById('lynk-subpage-cart')?.style.display, 'block');
      const waBtn = documentObj.getElementById('lynk-cart-wa-btn');
      assert.ok(waBtn && waBtn.href.includes('Kopi%20Susu%20Arena'));
    });
  });
});
