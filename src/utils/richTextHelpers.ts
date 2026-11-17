import { sanitizeRichHtmlIsomorphic } from './htmlSanitizer.ts';

function escapeText(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

export function sanitizeRichHtml(rawInput?: string): string {
  return sanitizeRichHtmlIsomorphic(rawInput);
}

export function formatRichHtmlWithSpacing(
  rawInput?: string,
  paragraphGap = 6
): string {
  const sanitized = sanitizeRichHtml(rawInput);
  if (!sanitized) return '';

  const gap = Math.max(0, Math.min(40, Number.isFinite(paragraphGap) ? paragraphGap : 6));
  if (typeof DOMParser === 'undefined') {
    return sanitized;
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${sanitized}</div>`, 'text/html');
  const root = doc.body.firstElementChild;
  if (!root) return sanitized;

  // Group top-level nodes into paragraphs so margin-bottom applies cleanly on Enter
  const blocks: string[] = [];
  let inlineBuffer = '';

  const flushInline = () => {
    if (inlineBuffer) {
      blocks.push(inlineBuffer);
      inlineBuffer = '';
    }
  };

  Array.from(root.childNodes).forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const tag = (child as HTMLElement).tagName.toLowerCase();
      if (tag === 'div' || tag === 'p') {
        flushInline();
        blocks.push((child as HTMLElement).innerHTML || '<br>');
        return;
      }
      if (tag === 'br') {
        flushInline();
        blocks.push('<br>');
        return;
      }
      inlineBuffer += (child as HTMLElement).outerHTML;
    } else if (child.nodeType === Node.TEXT_NODE) {
      const text = child.textContent ?? '';
      if (text.includes('\n')) {
        const segs = text.split('\n');
        segs.forEach((seg, idx) => {
          inlineBuffer += escapeText(seg);
          if (idx < segs.length - 1) {
            flushInline();
          }
        });
      } else {
        inlineBuffer += escapeText(text);
      }
    }
  });
  flushInline();

  if (blocks.length === 0) return '';

  return blocks
    .map((inner, idx) => {
      const isLast = idx === blocks.length - 1;
      const mb = isLast ? 0 : gap;
      const content = inner === '<br>' || inner.trim() === '' ? '&nbsp;' : inner;
      return `<div style="margin-bottom:${mb}px;">${content}</div>`;
    })
    .join('');
}

export function stripHtmlToText(rawInput?: string): string {
  const raw = rawInput ?? '';
  if (!raw) return '';
  if (!/[<>]/.test(raw)) return raw.trim();
  if (typeof DOMParser === 'undefined') {
    return raw.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }
  const parser = new DOMParser();
  const doc = parser.parseFromString(
    raw.replace(/<\/(div|p)>/gi, '\n').replace(/<br\s*\/?>/gi, '\n'),
    'text/html'
  );
  return (doc.body.textContent ?? '').replace(/\n{3,}/g, '\n\n').trim();
}
