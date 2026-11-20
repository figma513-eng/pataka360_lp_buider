import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import vm from 'node:vm';
import type { BuilderProject } from '../src/types/builder.ts';
import {
  BLOCK_TYPE_NAMES,
  THEMES,
  createBlock,
  createSubPage,
} from '../src/data/presets.ts';
import { generateProjectHtml } from '../src/utils/htmlExporter.ts';
import { sanitizeBuilderProject } from '../src/utils/htmlSanitizer.ts';
import {
  cloneBlockDeep,
  deleteBlockById,
  findBlockById,
  insertBlockIntoActionSheet,
  insertBlockIntoCardFooter,
  insertChildIntoContainer,
  isContainerBlockType,
  moveBlockIntoCardFooter,
  updateBlockById,
} from '../src/utils/treeHelpers.ts';
import { findFirstFloatingCartConfig, resolveUniversalCartMeta } from '../src/utils/universalLayerHelpers.ts';

function makeProject(
  blocks: BuilderProject['blocks'],
  pages?: BuilderProject['pages']
): BuilderProject {
  return {
    title: 'Uji Universal Layers & Multi-Page',
    theme: THEMES[0],
    advanceOptions: {
      showUnitSold: true,
      blockLayout: 'default',
      pageTopPadding: 12,
    },
    blocks,
    pages,
  };
}

class MiniEl {
  tagName: string;
  _attrs = new Map<string, string>();
  _classes = new Set<string>();
  children: MiniEl[] = [];
  parentNode: MiniEl | null = null;
  style: Record<string, string> = {};
  _text = '';
  value = '';
  checked = false;
  classList = {
    add: (cls: string) => {
      this._classes.add(cls);
    },
    remove: (cls: string) => {
      this._classes.delete(cls);
    },
    contains: (cls: string) => this._classes.has(cls),
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
    if (k === 'class') {
      this._classes = new Set(s.split(/\s+/).filter(Boolean));
    }
    if (k === 'value') this.value = s;
    if (k === 'checked') this.checked = true;
    if (k === 'style') {
      s.split(';').forEach((part) => {
        const idx = part.indexOf(':');
        if (idx > 0) {
          const prop = part
            .slice(0, idx)
            .trim()
            .replace(/-([a-z])/g, (_, c) => c.toUpperCase());
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
    if (c.parentNode) {
      const idx = c.parentNode.children.indexOf(c);
      if (idx >= 0) c.parentNode.children.splice(idx, 1);
    }
    c.parentNode = this;
    this.children.push(c);
    return c;
  }
  removeChild(c: MiniEl) {
    const idx = this.children.indexOf(c);
    if (idx >= 0) this.children.splice(idx, 1);
    c.parentNode = null;
    return c;
  }
  contains(node: MiniEl | null): boolean {
    let cur = node;
    while (cur) {
      if (cur === this) return true;
      cur = cur.parentNode;
    }
    return false;
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
    let stopped = false;
    const origStop = ev.stopPropagation;
    ev.stopPropagation = () => {
      stopped = true;
      origStop();
    };
    let cur: MiniEl | null = this;
    while (cur) {
      const fns = cur.listeners.get(ev.type) ?? [];
      for (const fn of fns) fn(ev);
      if (stopped) break;
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
  scrollIntoView() {}
  matches(selector: string): boolean {
    return selector.split(',').some((s) => matchesSingle(this, s.trim()));
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
    const walk = (node: MiniEl) => {
      for (const ch of node.children) {
        if (ch.matches(selector)) out.push(ch);
        walk(ch);
      }
    };
    walk(this);
    return out;
  }
  querySelector(selector: string): MiniEl | null {
    return this.querySelectorAll(selector)[0] ?? null;
  }
  getElementById(id: string): MiniEl | null {
    const walk = (node: MiniEl): MiniEl | null => {
      for (const ch of node.children) {
        if (ch.id === id) return ch;
        const found = walk(ch);
        if (found) return found;
      }
      return null;
    };
    return walk(this);
  }
}

function matchesSingle(el: MiniEl, sel: string): boolean {
  if (!sel) return false;
  // Support combined selectors like [data-bottom-sheet].is-open or [data-attr="val"]
  const parts = sel.match(/(#[a-zA-Z0-9_-]+|\.[a-zA-Z0-9_-]+|\[[^\]]+\]|[a-zA-Z0-9_-]+)/g);
  if (!parts || parts.length === 0) return false;
  for (const part of parts) {
    if (part.startsWith('#')) {
      if (el.id !== part.slice(1)) return false;
    } else if (part.startsWith('.')) {
      if (!el.classList.contains(part.slice(1))) return false;
    } else if (part.startsWith('[') && part.endsWith(']')) {
      const inner = part.slice(1, -1);
      const eq = inner.indexOf('=');
      if (eq === -1) {
        if (!el.hasAttribute(inner)) return false;
      } else if (inner[eq - 1] === '^') {
        const attr = inner.slice(0, eq - 1).trim();
        const val = inner.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        if (!(el.getAttribute(attr) || '').startsWith(val)) return false;
      } else {
        const attr = inner.slice(0, eq).trim();
        const val = inner.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
        if (el.getAttribute(attr) !== val) return false;
      }
    } else {
      if (el.tagName !== part.toUpperCase()) return false;
    }
  }
  return true;
}

const VOID_TAGS = new Set(['img', 'input', 'br', 'hr', 'meta', 'link', 'source']);

function parseInto(html: string, root: MiniEl) {
  const stack: MiniEl[] = [root];
  const tokenRe = /<\/([a-zA-Z0-9-]+)>|<([a-zA-Z0-9-]+)([^>]*)>|([^<]+)/g;
  let m: RegExpExecArray | null;
  while ((m = tokenRe.exec(html)) !== null) {
    if (m[1]) {
      const closing = m[1].toUpperCase();
      for (let i = stack.length - 1; i >= 1; i--) {
        if (stack[i].tagName === closing) {
          stack.length = i;
          break;
        }
      }
    } else if (m[2]) {
      const tag = m[2].toLowerCase();
      const attrStr = m[3] || '';
      const selfClosing = attrStr.trim().endsWith('/') || VOID_TAGS.has(tag);
      const el = new MiniEl(tag);
      const attrRe = /([a-zA-Z0-9_:-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+)))?/g;
      let am: RegExpExecArray | null;
      while ((am = attrRe.exec(attrStr)) !== null) {
        const name = am[1];
        if (!name || name === '/') continue;
        const val = am[2] ?? am[3] ?? am[4] ?? '';
        el.setAttribute(
          name,
          val
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&amp;/g, '&')
        );
      }
      stack[stack.length - 1].appendChild(el);
      if (!selfClosing) stack.push(el);
    } else if (m[4]) {
      const top = stack[stack.length - 1];
      top._text += m[4]
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&');
    }
  }
}

function bootExportedHtml(html: string) {
  const doc = new MiniEl('#DOCUMENT');
  const body = new MiniEl('body');
  const documentElement = new MiniEl('html');
  doc.appendChild(documentElement);
  documentElement.appendChild(body);

  const bodyMatch = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i);
  assert.ok(bodyMatch, 'Exported HTML must have a body');
  const scripts: string[] = [];
  const bodyWithoutScripts = bodyMatch[1].replace(
    /<script([^>]*)>([\s\S]*?)<\/script>/gi,
    (full, attrs, content) => {
      if (/type\s*=\s*["']application\/json["']/i.test(attrs)) {
        return full;
      }
      scripts.push(content);
      return '';
    }
  );
  parseInto(bodyWithoutScripts, body);

  const locationObj = {
    protocol: 'https:',
    pathname: '/p/demo',
    search: '',
    hash: '',
  };
  const win: Record<string, unknown> = {
    location: locationObj,
    history: {
      state: null,
      replaceState: (_s: unknown, _t: string, url: string) => {
        const hIdx = String(url).indexOf('#');
        locationObj.hash = hIdx >= 0 ? String(url).slice(hIdx) : '';
      },
    },
    scrollTo: () => {},
    addEventListener: () => {},
    document: doc,
  };
  Object.assign(doc, {
    body,
    documentElement,
    createElement: (tag: string) => new MiniEl(tag),
  });

  const ctx = vm.createContext({
    window: win,
    document: doc,
    location: locationObj,
    history: win.history,
    console,
    setTimeout,
    clearTimeout,
    encodeURIComponent,
    decodeURIComponent,
    URL,
    URLSearchParams,
    JSON,
    Math,
    Number,
    String,
    Boolean,
    Array,
    Object,
    RegExp,
    Date,
    parseInt,
    parseFloat,
    isNaN,
    isFinite,
  });

  for (const code of scripts) {
    vm.runInContext(code, ctx);
  }

  return { doc, body, win, locationObj };
}

describe('Universal Layers, Typography, Multi-Page, Actions & Universal Cart', () => {
  it('1. Sanitizer and exporter preserve card media sizing/zoom, typography, line clamp, letter-spacing & maxHeight', () => {
    const card = createBlock('showcase_card', THEMES[0]);
    card.id = 'blk_card_media';
    card.style.widthPercent = 85;
    card.style.minHeight = 140;
    card.style.maxHeight = 420;
    card.style.letterSpacing = 1.5;
    card.style.paragraphGap = 10;
    card.style.maxLines = 2;
    card.content.cardVariant = 'badge_tile';
    card.content.cardTitle = 'Sertifikasi Madya';
    card.content.cardSubtitle = 'Pelatihan tingkat supervisor satpam resmi nasional';
    card.content.cardImage = 'https://cdn.example.com/badge.png';
    card.content.cardMediaSize = 76;
    card.content.cardMediaHeight = 150;
    card.content.cardImageZoom = 145;
    card.content.cardImageFit = 'contain';
    card.content.cardImageRadius = 18;
    card.content.cardTitleSize = 18;
    card.content.cardSubtitleSize = 13;
    card.content.cardTitleLines = 2;
    card.content.cardSubtitleLines = 1;
    card.content.cardTextGap = 8;
    card.content.cardLineHeight = 1.5;
    card.content.cardLetterSpacing = 1.2;

    const textBlk = createBlock('text', THEMES[0]);
    textBlk.id = 'blk_text_typo';
    textBlk.content.text = 'Paragraf pertama.\nParagraf kedua.';
    textBlk.style.letterSpacing = 2;
    textBlk.style.paragraphGap = 14;
    textBlk.style.maxLines = 2;
    textBlk.style.maxHeight = 200;

    const project = sanitizeBuilderProject(makeProject([card, textBlk]));
    const sanitizedCard = project.blocks[0];
    assert.equal(sanitizedCard.style.maxHeight, 420);
    assert.equal(sanitizedCard.style.letterSpacing, 1.5);
    assert.equal(sanitizedCard.style.paragraphGap, 10);
    assert.equal(sanitizedCard.style.maxLines, 2);
    assert.equal(sanitizedCard.content.cardMediaSize, 76);
    assert.equal(sanitizedCard.content.cardMediaHeight, 150);
    assert.equal(sanitizedCard.content.cardImageZoom, 145);
    assert.equal(sanitizedCard.content.cardImageFit, 'contain');
    assert.equal(sanitizedCard.content.cardImageRadius, 18);
    assert.equal(sanitizedCard.content.cardTitleSize, 18);
    assert.equal(sanitizedCard.content.cardSubtitleSize, 13);
    assert.equal(sanitizedCard.content.cardTitleLines, 2);
    assert.equal(sanitizedCard.content.cardSubtitleLines, 1);
    assert.equal(sanitizedCard.content.cardTextGap, 8);
    assert.equal(sanitizedCard.content.cardLetterSpacing, 1.2);

    const html = generateProjectHtml(project);
    assert.ok(html.includes('max-height: 420px'), 'Card maxHeight exported');
    assert.ok(html.includes('letter-spacing: 1.5px'), 'Block letterSpacing exported');
    assert.ok(html.includes('scale(1.45)'), 'Card image zoom exported');
    assert.ok(html.includes('object-fit:contain'), 'Card image fit exported');
    assert.ok(html.includes('Pelatihan tingkat supervisor satpam resmi nasional'), 'Card subtitle exported');
    assert.ok(html.includes('-webkit-line-clamp:2'), 'Line clamp exported');
    assert.ok(html.includes('width:76px; height:76px'), 'Badge tile media box size exported');
  });

  it('2. Tree helpers & presets support back_button, createSubPage, and nested actionSheetBlocks CRUD', () => {
    assert.equal(BLOCK_TYPE_NAMES.back_button, 'Tombol Kembali');
    const backBtn = createBlock('back_button', THEMES[0]);
    assert.equal(backBtn.type, 'back_button');
    assert.equal(backBtn.content.backButtonLabel, 'Kembali');

    const subPage = createSubPage(2, THEMES[0]);
    assert.ok(subPage.id.startsWith('pg_'));
    assert.equal(subPage.showBackButton, true);
    assert.ok(subPage.blocks.length >= 1);

    const card = createBlock('showcase_card', THEMES[0]);
    card.id = 'card_root';
    card.content.actionType = 'sheet';
    card.content.actionSheetPosition = 'right';
    const childText = createBlock('text', THEMES[0]);
    childText.id = 'sheet_child_1';
    childText.content.text = 'Isi Panel Kanan';

    let blocks = insertBlockIntoActionSheet([card], 'card_root', childText);
    assert.ok(findBlockById(blocks, 'sheet_child_1'), 'Child inside actionSheetBlocks is findable');

    blocks = updateBlockById(blocks, 'sheet_child_1', (b) => ({
      ...b,
      content: { ...b.content, text: 'Isi Diperbarui' },
    }));
    assert.equal(findBlockById(blocks, 'sheet_child_1')?.content.text, 'Isi Diperbarui');

    const cloned = cloneBlockDeep(blocks[0]);
    assert.notEqual(cloned.id, blocks[0].id);
    assert.equal(cloned.content.actionSheetBlocks?.length, 1);
    assert.notEqual(cloned.content.actionSheetBlocks?.[0].id, 'sheet_child_1');

    blocks = deleteBlockById(blocks, 'sheet_child_1');
    assert.equal(findBlockById(blocks, 'sheet_child_1'), null);
  });

  it('3. Multi-Page navigation + Back button works in exported HTML VM runtime', () => {
    const navCard = createBlock('showcase_card', THEMES[0]);
    navCard.id = 'card_go_p2';
    navCard.content.cardTitle = 'Buka Halaman Detail';
    navCard.content.actionType = 'page';
    navCard.content.actionTargetPageId = 'page_detail_2';

    const backBlk = createBlock('back_button', THEMES[0]);
    backBlk.id = 'blk_back_custom';
    backBlk.content.backButtonLabel = 'Kembali ke Beranda';

    const p2Text = createBlock('text', THEMES[0]);
    p2Text.id = 'blk_p2_txt';
    p2Text.content.text = 'Konten Halaman Kedua';

    const subPage = {
      id: 'page_detail_2',
      title: 'Halaman Detail',
      showBackButton: true,
      backButtonLabel: 'Kembali',
      blocks: [p2Text, backBlk],
    };

    const project = sanitizeBuilderProject(makeProject([navCard], [subPage]));
    assert.equal(project.pages?.length, 1);

    const html = generateProjectHtml(project);
    const { doc, locationObj } = bootExportedHtml(html);

    const mainView = doc.getElementById('lynk-main-view');
    const p2Section = doc.querySelector('[data-custom-page="page_detail_2"]');
    const triggerCard = doc.querySelector('[data-open-page="page_detail_2"]');
    assert.ok(mainView && p2Section && triggerCard, 'Multi-page elements exist');
    assert.equal(p2Section.style.display, 'none', 'Sub-page hidden initially');

    triggerCard.click();
    assert.equal(mainView.style.display, 'none', 'Main view hidden after opening sub-page');
    assert.equal(p2Section.style.display, 'block', 'Sub-page visible after clicking card');
    assert.equal(locationObj.hash, '#halaman-page_detail_2', 'Hash updated to sub-page');

    const backButtonEl = p2Section.querySelector('[data-page-back="1"]');
    assert.ok(backButtonEl, 'Auto Back button exists in sub-page');
    backButtonEl.click();
    assert.equal(mainView.style.display, 'block', 'Main view restored on Back click');
    assert.equal(p2Section.style.display, 'none', 'Sub-page hidden after Back click');
  });

  it('4. Universal Action Sheet (right/left/top/bottom) opens and closes in exported HTML VM runtime', () => {
    const innerSheetText = createBlock('text', THEMES[0]);
    innerSheetText.id = 'blk_inner_sheet';
    innerSheetText.content.text = 'Detail Panel Kanan Dinamis';

    const card = createBlock('showcase_card', THEMES[0]);
    card.id = 'card_sheet_right';
    card.content.cardTitle = 'Info Paket';
    card.content.actionType = 'sheet';
    card.content.actionSheetPosition = 'right';
    card.content.actionSheetTitle = 'Detail Paket Kanan';
    card.content.actionSheetBlocks = [innerSheetText];

    const project = sanitizeBuilderProject(makeProject([card]));
    const html = generateProjectHtml(project);
    const { doc } = bootExportedHtml(html);

    const trigger = doc.querySelector('[data-universal-layer="card_sheet_right"]');
    const sheet = doc.getElementById('sheet_act_card_sheet_right');
    assert.ok(trigger && sheet, 'Action sheet trigger and dialog rendered');
    assert.equal(sheet.getAttribute('data-sheet-pos'), 'right');
    assert.ok(sheet.textContent.includes('Detail Panel Kanan Dinamis'));
    assert.equal(sheet.classList.contains('is-open'), false);

    trigger.click();
    assert.equal(sheet.classList.contains('is-open'), true, 'Sheet opens on card click');

    const closeBtn = sheet.querySelector('[data-sheet-close]');
    assert.ok(closeBtn);
    closeBtn.click();
    assert.equal(sheet.classList.contains('is-open'), false, 'Sheet closes on close click');
  });

  it('5. Universal Cart Mode works on ANY layer (showcase_card & container) with floating bar, stepper, inner click isolation, and WA checkout', () => {
    const card = createBlock('showcase_card', THEMES[0]);
    card.id = 'card_uc_1';
    card.content.cardTitle = 'Topi APSI Resmi';
    card.content.actionType = 'sheet';
    card.content.actionSheetPosition = 'bottom';
    card.content.actionSheetTitle = 'Detail Topi';
    card.content.universalCartEnabled = true;
    card.content.universalCartName = 'Topi APSI Resmi';
    card.content.universalCartPrice = 'Rp 80.000';
    card.content.universalCartUnitSold = 42;
    card.content.universalCartShowUnitSold = true;
    card.content.universalCartButtonLabel = 'Tambah';
    card.content.universalCartWhatsappNumber = '081234567890';
    card.content.universalCartStoreName = 'APSI Official Store';
    card.content.universalCartFloatingEnabled = true;
    card.content.universalCartFloatingLabel = 'Checkout Sekarang';

    const container = createBlock('container', THEMES[0]);
    container.id = 'box_uc_2';
    container.label = 'Paket Seragam';
    container.content.universalCartEnabled = true;
    container.content.universalCartName = 'Paket Seragam Lengkap';
    container.content.universalCartPrice = 'Rp 150.000';
    container.content.universalCartWhatsappNumber = '081234567890';

    const project = sanitizeBuilderProject(makeProject([card, container]));

    // Verify helper resolution
    const meta1 = resolveUniversalCartMeta(project.blocks[0], project.theme);
    assert.ok(meta1);
    assert.equal(meta1.compositeKey, 'card_uc_1::uc_card_uc_1');
    const floatCfg = findFirstFloatingCartConfig(project.blocks, [], []);
    assert.ok(floatCfg);
    assert.equal(floatCfg.label, 'Checkout Sekarang');

    const html = generateProjectHtml(project);
    const { doc, body } = bootExportedHtml(html);

    const sheet = doc.getElementById('sheet_act_card_uc_1');
    const addBtn1 = doc.querySelector('[data-fnb-add="card_uc_1::uc_card_uc_1"]');
    const stepper1 = doc.querySelector('[data-fnb-stepper="card_uc_1::uc_card_uc_1"]');
    const qtyEl1 = doc.querySelector('[data-fnb-qty="card_uc_1::uc_card_uc_1"]');
    const incBtn1 = doc.querySelector('[data-fnb-inc="card_uc_1::uc_card_uc_1"]');
    const addBtn2 = doc.querySelector('[data-fnb-add="box_uc_2::uc_box_uc_2"]');
    const floatBar = doc.getElementById('lynk-fnb-float-bar');
    const floatBtn = doc.getElementById('lynk-fnb-float-btn');
    const floatCount = doc.getElementById('lynk-fnb-float-count');
    const floatTotal = doc.getElementById('lynk-fnb-float-total');

    assert.ok(addBtn1 && stepper1 && qtyEl1 && incBtn1 && addBtn2 && floatBar && floatBtn);
    assert.ok(body.textContent.includes('42 terjual'), 'Unit sold badge rendered');

    // Click "+ Tambah" inside card with actionType='sheet' -> must NOT open sheet!
    addBtn1.click();
    assert.equal(sheet?.classList.contains('is-open'), false, 'Clicking Tambah must not open parent action sheet');
    assert.equal(addBtn1.style.display, 'none', 'Add button hides once qty > 0');
    assert.equal(stepper1.style.display, 'inline-flex', 'Inline - 1 + stepper becomes visible');
    assert.equal(qtyEl1.textContent, '1');
    assert.equal(floatBar.style.display, 'flex', 'Floating cart bar appears automatically');
    assert.equal(floatCount?.textContent, '1 item');
    assert.equal(floatTotal?.textContent, 'Rp 80.000');

    // Increment card 1 and add container item 2
    incBtn1.click();
    addBtn2.click();
    assert.equal(qtyEl1.textContent, '2');
    assert.equal(floatCount?.textContent, '3 item');
    assert.equal(floatTotal?.textContent, 'Rp 310.000');

    // Open cart view from floating cart button and verify WhatsApp checkout link
    floatBtn.click();
    const cartView = doc.getElementById('lynk-subpage-cart');
    assert.equal(cartView?.style.display, 'block', 'Cart page opens from floating bar');
    const waLink = cartView?.querySelector('a[href^="https://wa.me/6281234567890"]');
    assert.ok(waLink, 'WhatsApp checkout link generated with normalized number');
    const decoded = decodeURIComponent(waLink.href);
    assert.ok(decoded.includes('Topi APSI Resmi'), 'WA message contains showcase card item');
    assert.ok(decoded.includes('Paket Seragam Lengkap'), 'WA message contains container item');
    assert.ok(decoded.includes('Rp 310.000'), 'WA message contains combined total');
  });

  it('6. Canvas toolbar has 3 zones (Left Beranda/+ Site, Center Mobile/PC icon-only + Undo, Right 50%/75%/100% + Zoom) and canvas click auto-activates Tema + scrolls selected layer into view', async () => {
    const fs = await import('node:fs/promises');
    const path = await import('node:path');
    const canvasSrc = await fs.readFile(path.join(process.cwd(), 'src/components/MobileCanvas.tsx'), 'utf8');
    const appSrc = await fs.readFile(path.join(process.cwd(), 'src/App.tsx'), 'utf8');
    const leftSrc = await fs.readFile(path.join(process.cwd(), 'src/components/LeftSidebar.tsx'), 'utf8');
    const homeSrc = await fs.readFile(path.join(process.cwd(), 'src/components/inspector/HomePageSettings.tsx'), 'utf8');

    const idxBeranda = canvasSrc.indexOf('data-canvas-page-bar="1"');
    const idxAddSite = canvasSrc.indexOf('<span>+ Site</span>');
    const idxMobile440 = canvasSrc.indexOf('data-viewport-preset="mobile-440"');
    const idxMobile576 = canvasSrc.indexOf('data-viewport-preset="mobile-576"');
    const idxUndo = canvasSrc.indexOf('data-toolbar-undo="1"');
    const idxZoom = canvasSrc.indexOf('aria-label="Zoom Canvas"');

    assert.ok(idxBeranda > 0 && idxAddSite > idxBeranda, 'Left zone has Beranda and + Site');
    assert.ok(idxMobile440 > idxAddSite && idxMobile576 > idxMobile440 && idxUndo > idxMobile576, 'Center zone has Mobile icon, PC icon, Undo after Left zone');
    assert.ok(idxZoom > idxUndo, 'Right zone has Zoom presets & slider after Center zone');
    assert.ok(!canvasSrc.includes('<span>Mobile 440 px</span>'), 'Mobile 440 button is icon-only');
    assert.ok(!canvasSrc.includes('<span>Mobile 576 px</span>'), 'Mobile 576 button is icon-only');

    assert.ok(appSrc.includes('setLayerFocusNonce((n) => n + 1)'), 'Canvas click triggers layerFocusNonce');
    assert.ok(leftSrc.includes('if (layerFocusNonce > 0)') && leftSrc.includes("setActiveTab('tema')"), 'LeftSidebar auto-activates Tema tab on canvas click');
    assert.ok(
      homeSrc.includes('data-layer-item-id={blk.id}') &&
        homeSrc.includes('root.scrollTo({ top: nextScrollTop') &&
        homeSrc.includes('root.clientHeight * 0.25'),
      'HomePageSettings scrolls active layer smoothly inside left layer panel container'
    );
    assert.ok(homeSrc.includes('bg-[#17243D] border-[#00C98A] border-l-4 text-white'), 'Active layer has distinct high-contrast highlight');
  });

  it('7. Composable template cards (membership_ticket & all showcase_card) support drag-drop in upper body zone and colored lower strip (cart, sheets, page 2)', () => {
    assert.equal(isContainerBlockType('showcase_card'), true, 'showcase_card is a container block type');

    const card = createBlock('showcase_card', THEMES[0]);
    card.id = 'card_ticket_dyn';
    card.content.cardVariant = 'membership_ticket';
    card.content.cardTitle = 'Anggota Utama';
    card.content.cardAccentColor = '#0284C7';
    card.content.cardFeeItems = [
      { id: 'f1', label: 'Pendaftaran', value: 'Rp. 20.000' },
      { id: 'f2', label: 'Iuran Anggota', value: 'Rp. 80.000' },
    ];
    card.content.cardTotalLabel = 'Total :';
    card.content.cardTotalValue = 'Rp. 100.000';
    card.content.cardHideDefaultContent = true;
    card.content.cardHideDefaultFooter = true;

    // Upper white zone children: image + text + menu_icon
    const topImg = createBlock('image', THEMES[0]);
    topImg.id = 'top_img_1';
    topImg.content.src = 'https://cdn.example.com/produk-banner.jpg';
    topImg.content.alt = 'Foto Produk Custom';

    const topText = createBlock('text', THEMES[0]);
    topText.id = 'top_txt_1';
    topText.content.text = 'Paket Spesial Tanpa Rincian Biaya';

    const topIcon = createBlock('menu_icon', THEMES[0]);
    topIcon.id = 'top_ico_1';
    topIcon.content.menuIconLabel = 'Detail Cepat';

    // Lower blue strip children: cart_button + action button (opens right sheet) + button to page 2
    const footCart = createBlock('cart_button', THEMES[0]);
    footCart.id = 'foot_cart_1';
    footCart.content.cartProductName = 'Paket VIP Custom';
    footCart.content.cartProductPrice = 'Rp 120.000';
    footCart.content.cartButtonLabel = 'Beli Paket';
    footCart.content.cartWhatsappNumber = '081234567890';
    footCart.content.cartFloatingEnabled = true;

    const footSheetInner = createBlock('text', THEMES[0]);
    footSheetInner.id = 'foot_sheet_txt';
    footSheetInner.content.text = 'Isi Panel Kanan dari Strip Biru';

    const footBtnSheet = createBlock('button', THEMES[0]);
    footBtnSheet.id = 'foot_btn_sheet';
    footBtnSheet.content.label = 'Buka Info Kanan';
    footBtnSheet.content.actionType = 'sheet';
    footBtnSheet.content.actionSheetPosition = 'right';
    footBtnSheet.content.actionSheetTitle = 'Info Strip Biru';
    footBtnSheet.content.actionSheetBlocks = [footSheetInner];

    const footBtnPage2 = createBlock('button', THEMES[0]);
    footBtnPage2.id = 'foot_btn_page2';
    footBtnPage2.content.label = 'Ke Halaman 2';
    footBtnPage2.content.actionType = 'page';
    footBtnPage2.content.actionTargetPageId = 'pg_kedua';

    // Exercise tree helpers (drop into upper body, drop into footer, move existing block into footer, clone, delete)
    let tree = insertChildIntoContainer([card], 'card_ticket_dyn', topImg);
    tree = insertChildIntoContainer(tree, 'card_ticket_dyn', topText);
    tree = insertChildIntoContainer(tree, 'card_ticket_dyn', topIcon);
    tree = insertBlockIntoCardFooter(tree, 'card_ticket_dyn', footCart);
    tree = insertBlockIntoCardFooter(tree, 'card_ticket_dyn', footBtnSheet);
    tree = [...tree, footBtnPage2];
    tree = moveBlockIntoCardFooter(tree, 'foot_btn_page2', 'card_ticket_dyn');

    assert.equal(tree.length, 1, 'Moved block removed from root and placed inside cardFooterBlocks');
    assert.equal(tree[0].children?.length, 3, '3 components in upper white zone');
    assert.equal(tree[0].content.cardFooterBlocks?.length, 3, '3 components in colored lower strip');
    assert.ok(findBlockById(tree, 'foot_cart_1'), 'findBlockById finds block in cardFooterBlocks');
    assert.ok(findBlockById(tree, 'foot_sheet_txt'), 'findBlockById finds nested sheet inside cardFooterBlocks');

    const cloned = cloneBlockDeep(tree[0]);
    assert.notEqual(cloned.id, tree[0].id);
    assert.equal(cloned.content.cardFooterBlocks?.length, 3);
    assert.notEqual(cloned.content.cardFooterBlocks?.[0].id, 'foot_cart_1');

    const afterDelete = deleteBlockById(cloneBlockDeep(tree[0]).content.cardFooterBlocks ? [cloned] : tree, cloned.content.cardFooterBlocks![0].id);
    assert.equal(afterDelete[0].content.cardFooterBlocks?.length, 2, 'deleteBlockById removes from cardFooterBlocks');

    const p2Text = createBlock('text', THEMES[0]);
    p2Text.id = 'pg2_txt';
    p2Text.content.text = 'Selamat Datang di Halaman 2';
    const subPage = {
      id: 'pg_kedua',
      title: 'Halaman 2',
      showBackButton: true,
      backButtonLabel: 'Kembali',
      blocks: [p2Text],
    };

    const project = sanitizeBuilderProject(makeProject(tree, [subPage]));
    assert.equal(project.blocks[0].content.cardHideDefaultContent, true);
    assert.equal(project.blocks[0].content.cardHideDefaultFooter, true);
    assert.equal(project.blocks[0].children?.length, 3);
    assert.equal(project.blocks[0].content.cardFooterBlocks?.length, 3);

    const html = generateProjectHtml(project);
    assert.ok(!html.includes('Iuran Anggota'), 'Default fee rows hidden when cardHideDefaultContent=true');
    assert.ok(!html.includes('Rp. 100.000'), 'Default Total strip hidden when cardHideDefaultFooter=true');
    assert.ok(html.includes('Paket Spesial Tanpa Rincian Biaya'), 'Custom top-zone text exported');
    assert.ok(html.includes('produk-banner.jpg'), 'Custom top-zone image exported');
    assert.ok(html.includes('Detail Cepat'), 'Custom top-zone menu_icon exported');
    assert.ok(html.includes('data-card-zone="body"'), 'Upper body zone container exported');
    assert.ok(html.includes('data-card-zone="footer"'), 'Lower colored strip zone container exported');

    const { doc } = bootExportedHtml(html);

    // 1) Cart button inside blue lower strip adds to cart & activates floating bar
    const addBtn = doc.querySelector('[data-fnb-add="foot_cart_1::cb_foot_cart_1"]');
    const floatBar = doc.getElementById('lynk-fnb-float-bar');
    const floatTotal = doc.getElementById('lynk-fnb-float-total');
    assert.ok(addBtn && floatBar, 'Cart button inside blue strip & floating cart bar exist');
    addBtn.click();
    assert.equal(floatBar.style.display, 'flex', 'Floating cart bar activates from blue-strip cart_button');
    assert.equal(floatTotal?.textContent, 'Rp 120.000');

    // 2) Action button inside blue lower strip opens Right Sheet
    const sheetTrigger = doc.querySelector('[data-universal-layer="foot_btn_sheet"]');
    const rightSheet = doc.getElementById('sheet_act_foot_btn_sheet');
    assert.ok(sheetTrigger && rightSheet, 'Right sheet trigger & dialog from blue strip exist');
    assert.equal(rightSheet.getAttribute('data-sheet-pos'), 'right');
    sheetTrigger.click();
    assert.equal(rightSheet.classList.contains('is-open'), true, 'Right sheet opens from blue-strip button');

    // 3) Page-2 button inside blue lower strip opens Halaman 2
    const page2Trigger = doc.querySelector('[data-open-page="pg_kedua"]');
    const page2View = doc.querySelector('[data-custom-page="pg_kedua"]');
    assert.ok(page2Trigger && page2View, 'Page 2 button & view exist');
    page2Trigger.click();
    assert.equal(page2View.style.display, 'block', 'Halaman 2 opens from blue-strip button');
  });
});
