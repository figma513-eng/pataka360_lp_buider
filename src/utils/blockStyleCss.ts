import type { CSSProperties } from 'react';
import type { BlockStyle } from '../types/builder.ts';

function sanitizeCssUrl(url?: string): string {
  if (!url) return '';
  const trimmed = url.trim();
  if (/^(https?:\/\/|\/|data:image\/)/i.test(trimmed)) {
    return trimmed.replace(/["'()\\]/g, '');
  }
  return '';
}

/**
 * Menghasilkan objek React CSSProperties untuk semua properti Panel Desain (Bagian D)
 * yang diterapkan secara konsisten di Kanvas Editor.
 */
export function buildSectionDReactStyle(style: BlockStyle): CSSProperties {
  const out: CSSProperties = {};

  // Tata Letak
  if (style.displayMode && style.displayMode !== 'block') {
    out.display = style.displayMode;
  }
  if (style.flexDirection) {
    out.flexDirection = style.flexDirection;
  }
  if (style.alignItems) {
    out.alignItems = style.alignItems;
  }
  if (style.justifyContent) {
    out.justifyContent = style.justifyContent;
  }
  if (style.flexWrap) {
    out.flexWrap = style.flexWrap;
  }
  if (typeof style.gap === 'number' && style.gap >= 0) {
    out.gap = `${style.gap}px`;
  }
  if (style.overflow && style.overflow !== 'visible') {
    out.overflow = style.overflow;
  }

  // Ukuran (Min / Maks / Tinggi)
  if (typeof style.minWidth === 'number' && style.minWidth > 0) {
    out.minWidth = `${style.minWidth}px`;
  }
  if (typeof style.maxWidth === 'number' && style.maxWidth > 0) {
    out.maxWidth = `${style.maxWidth}px`;
  }
  if (typeof style.heightPx === 'number' && style.heightPx > 0) {
    out.height = `${style.heightPx}px`;
  }
  if (typeof style.maxHeight === 'number' && style.maxHeight > 0) {
    out.maxHeight = `${style.maxHeight}px`;
  }

  // Posisi
  if (style.positionMode && style.positionMode !== 'static') {
    out.position = style.positionMode;
    if (typeof style.posTop === 'number') out.top = `${style.posTop}px`;
    if (typeof style.posRight === 'number') out.right = `${style.posRight}px`;
    if (typeof style.posBottom === 'number') out.bottom = `${style.posBottom}px`;
    if (typeof style.posLeft === 'number') out.left = `${style.posLeft}px`;
  }
  if (typeof style.zIndex === 'number' && style.zIndex !== 0) {
    out.zIndex = style.zIndex;
  }

  // Garis Tepi Gaya
  if (style.borderStyle && style.borderWidth > 0) {
    out.borderStyle = style.borderStyle;
  }

  // Latar Belakang Gambar
  const safeBgUrl = sanitizeCssUrl(style.bgImageUrl);
  if (safeBgUrl) {
    out.backgroundImage = `url("${safeBgUrl}")`;
    out.backgroundPosition = style.bgPosition || 'center';
    out.backgroundSize = style.bgSize || 'cover';
    out.backgroundRepeat = style.bgRepeat || 'no-repeat';
  }

  // Tipografi tambahan
  if (style.fontFamily) out.fontFamily = style.fontFamily;
  if (typeof style.fontSize === 'number' && style.fontSize > 0) out.fontSize = `${style.fontSize}px`;
  if (style.fontWeightCss) out.fontWeight = Number(style.fontWeightCss);
  if (typeof style.lineHeight === 'number' && style.lineHeight > 0) out.lineHeight = style.lineHeight;
  if (typeof style.letterSpacing === 'number' && style.letterSpacing !== 0) {
    out.letterSpacing = `${style.letterSpacing}px`;
  }
  if (style.textDecoration && style.textDecoration !== 'none') {
    out.textDecoration = style.textDecoration;
  }
  if (style.textTransform && style.textTransform !== 'none') {
    out.textTransform = style.textTransform;
  }

  // Efek (Transparansi, Visibilitas, Transformasi, Transisi)
  if (typeof style.opacity === 'number' && style.opacity < 100) {
    out.opacity = Math.max(0, Math.min(1, style.opacity / 100));
  }
  if (style.visibility === 'hidden') {
    // Di editor kanvas tetap terlihat redup agar pengguna masih dapat memilih dan memulihkannya
    out.opacity = 0.35;
  }
  const transforms: string[] = [];
  if (typeof style.transformScale === 'number' && style.transformScale !== 100) {
    transforms.push(`scale(${(style.transformScale / 100).toFixed(3)})`);
  }
  if (typeof style.transformRotate === 'number' && style.transformRotate !== 0) {
    transforms.push(`rotate(${style.transformRotate}deg)`);
  }
  if (transforms.length > 0) {
    out.transform = transforms.join(' ');
  }
  if (typeof style.transitionMs === 'number' && style.transitionMs > 0) {
    out.transition = `all ${style.transitionMs}ms ease`;
  }

  return out;
}

/**
 * Menghasilkan deklarasi CSS inline string untuk Pratinjau & Ekspor HTML
 * agar tampilan 100% identik dengan Kanvas Editor.
 */
export function buildSectionDInlineCss(style: BlockStyle): string {
  const parts: string[] = [];

  if (style.displayMode && style.displayMode !== 'block') {
    parts.push(`display:${style.displayMode}`);
  }
  if (style.flexDirection) parts.push(`flex-direction:${style.flexDirection}`);
  if (style.alignItems) parts.push(`align-items:${style.alignItems}`);
  if (style.justifyContent) parts.push(`justify-content:${style.justifyContent}`);
  if (style.flexWrap) parts.push(`flex-wrap:${style.flexWrap}`);
  if (typeof style.gap === 'number' && style.gap >= 0) parts.push(`gap:${style.gap}px`);
  if (style.overflow && style.overflow !== 'visible') parts.push(`overflow:${style.overflow}`);

  if (typeof style.minWidth === 'number' && style.minWidth > 0) {
    parts.push(`min-width:${style.minWidth}px`);
  }
  if (typeof style.maxWidth === 'number' && style.maxWidth > 0) {
    parts.push(`max-width:${style.maxWidth}px`);
  }
  if (typeof style.heightPx === 'number' && style.heightPx > 0) {
    parts.push(`height:${style.heightPx}px`);
  }
  if (typeof style.maxHeight === 'number' && style.maxHeight > 0) {
    parts.push(`max-height:${style.maxHeight}px`);
  }

  if (style.positionMode && style.positionMode !== 'static') {
    parts.push(`position:${style.positionMode}`);
    if (typeof style.posTop === 'number') parts.push(`top:${style.posTop}px`);
    if (typeof style.posRight === 'number') parts.push(`right:${style.posRight}px`);
    if (typeof style.posBottom === 'number') parts.push(`bottom:${style.posBottom}px`);
    if (typeof style.posLeft === 'number') parts.push(`left:${style.posLeft}px`);
  }
  if (typeof style.zIndex === 'number' && style.zIndex !== 0) {
    parts.push(`z-index:${style.zIndex}`);
  }

  if (style.borderStyle && style.borderWidth > 0) {
    parts.push(`border-style:${style.borderStyle}`);
  }

  const safeBgUrl = sanitizeCssUrl(style.bgImageUrl);
  if (safeBgUrl) {
    parts.push(`background-image:url("${safeBgUrl}")`);
    parts.push(`background-position:${style.bgPosition || 'center'}`);
    parts.push(`background-size:${style.bgSize || 'cover'}`);
    parts.push(`background-repeat:${style.bgRepeat || 'no-repeat'}`);
  }

  if (style.fontFamily) parts.push(`font-family:${style.fontFamily}`);
  if (typeof style.fontSize === 'number' && style.fontSize > 0) {
    parts.push(`font-size:${style.fontSize}px`);
  }
  if (style.fontWeightCss) parts.push(`font-weight:${style.fontWeightCss}`);
  if (typeof style.lineHeight === 'number' && style.lineHeight > 0) {
    parts.push(`line-height:${style.lineHeight}`);
  }
  if (typeof style.letterSpacing === 'number' && style.letterSpacing !== 0) {
    parts.push(`letter-spacing:${style.letterSpacing}px`);
  }
  if (style.textDecoration && style.textDecoration !== 'none') {
    parts.push(`text-decoration:${style.textDecoration}`);
  }
  if (style.textTransform && style.textTransform !== 'none') {
    parts.push(`text-transform:${style.textTransform}`);
  }

  if (typeof style.opacity === 'number' && style.opacity < 100) {
    parts.push(`opacity:${Math.max(0, Math.min(1, style.opacity / 100)).toFixed(2)}`);
  }
  if (style.visibility === 'hidden') {
    parts.push('display:none');
  }
  const transforms: string[] = [];
  if (typeof style.transformScale === 'number' && style.transformScale !== 100) {
    transforms.push(`scale(${(style.transformScale / 100).toFixed(3)})`);
  }
  if (typeof style.transformRotate === 'number' && style.transformRotate !== 0) {
    transforms.push(`rotate(${style.transformRotate}deg)`);
  }
  if (transforms.length > 0) {
    parts.push(`transform:${transforms.join(' ')}`);
  }
  if (typeof style.transitionMs === 'number' && style.transitionMs > 0) {
    parts.push(`transition:all ${style.transitionMs}ms ease`);
  }

  return parts.length > 0 ? `${parts.join(';')};` : '';
}
