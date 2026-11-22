import type { UiAppearanceHiddenMap, UiAppearanceLabelsMap } from '../types/builder';
import {
  UI_LABEL_CATALOG,
  UI_LABEL_CATEGORIES,
  UI_LABEL_DEFAULT_MAP,
  getUiLabelKind,
  sanitizeUiAppearanceHiddenMap,
  sanitizeUiAppearanceLabelsMap,
  type UiLabelCategory,
  type UiLabelKind,
} from './uiAppearanceLabels';

const KIND_LABELS: Record<UiLabelKind, string> = {
  judul: 'Judul',
  label: 'Label',
  deskripsi: 'Deskripsi',
};

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function escapeJsonForScriptTag(obj: unknown): string {
  return JSON.stringify(obj, null, 2).replace(/<\//g, '<\\/');
}

function formatDateStamp(ts: number): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}`;
}

export function buildUiAppearanceHtmlFilename(ts = Date.now()): string {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `lynk-tampilan-editor-${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}.html`;
}

/**
 * Generates a standalone, human-editable AND machine-importable HTML file
 * representing the complete Pengaturan Tampilan (labels & visibility).
 * Users can edit it directly in a browser (then download the updated HTML),
 * or edit the HTML table cells in any code/text editor and re-import it.
 */
export function generateUiAppearanceHtml(
  labels: UiAppearanceLabelsMap,
  hiddenKeys: UiAppearanceHiddenMap,
  options?: { exportedAt?: number }
): string {
  const exportedAt = options?.exportedAt ?? Date.now();
  const cleanLabels = sanitizeUiAppearanceLabelsMap(labels);
  const cleanHidden = sanitizeUiAppearanceHiddenMap(hiddenKeys);
  const customCount = Object.keys(cleanLabels).length;
  const hiddenCount = Object.values(cleanHidden).filter(Boolean).length;

  const byCategory = new Map<UiLabelCategory, typeof UI_LABEL_CATALOG>();
  for (const item of UI_LABEL_CATALOG) {
    const list = byCategory.get(item.category);
    if (list) list.push(item);
    else byCategory.set(item.category, [item]);
  }

  const sectionsHtml = UI_LABEL_CATEGORIES.map((cat) => {
    const items = byCategory.get(cat.id) ?? [];
    if (items.length === 0) return '';

    const rowsHtml = items
      .map((item, idx) => {
        const kind = getUiLabelKind(item);
        const currentValue = cleanLabels[item.key] ?? item.defaultLabel;
        const isVisible = !cleanHidden[item.key];
        const isCustom = Boolean(cleanLabels[item.key]);
        const rowClass = !isVisible ? 'row-hidden' : isCustom ? 'row-custom' : '';

        return `          <tr class="${rowClass}" data-ui-key="${escapeHtml(item.key)}" data-ui-category="${escapeHtml(
          item.category
        )}" data-ui-kind="${escapeHtml(kind)}" data-ui-default="${escapeHtml(
          item.defaultLabel
        )}" data-ui-visible="${isVisible ? 'true' : 'false'}">
            <td class="col-no">${idx + 1}</td>
            <td class="col-key"><code>${escapeHtml(item.key)}</code></td>
            <td class="col-kind"><span class="badge badge-${kind}">${KIND_LABELS[kind]}</span></td>
            <td class="col-default" data-ui-default-cell="true">${escapeHtml(item.defaultLabel)}</td>
            <td class="col-value" data-ui-value="true" contenteditable="true" spellcheck="false">${escapeHtml(
              currentValue
            )}</td>
            <td class="col-status" data-ui-status="true" data-status-toggle="true" title="Klik untuk ganti Tampil / Sembunyi">${
              isVisible ? 'Tampil' : 'Sembunyi'
            }</td>
            <td class="col-scope">${escapeHtml(item.scopeNote)}</td>
          </tr>`;
      })
      .join('\n');

    return `    <section class="cat-section" data-ui-category="${escapeHtml(cat.id)}">
      <div class="cat-header">
        <div>
          <h2>${escapeHtml(cat.label)}</h2>
          <p>${escapeHtml(cat.description)}</p>
        </div>
        <span class="cat-count">${items.length} item</span>
      </div>
      <div class="table-wrap">
        <table>
          <thead>
            <tr>
              <th style="width:44px">No</th>
              <th style="width:210px">Kunci (Key)</th>
              <th style="width:82px">Jenis</th>
              <th style="width:220px">Teks Bawaan</th>
              <th style="width:260px">Teks Aktif (Edit di sini)</th>
              <th style="width:105px">Status</th>
              <th>Keterangan Lokasi</th>
            </tr>
          </thead>
          <tbody>
${rowsHtml}
          </tbody>
        </table>
      </div>
    </section>`;
  })
    .filter(Boolean)
    .join('\n\n');

  const embeddedPayload = {
    schema: 'lynk-builder-ui-appearance',
    version: 2,
    exportedAt,
    totalCatalogItems: UI_LABEL_CATALOG.length,
    labels: cleanLabels,
    hiddenKeys: cleanHidden,
  };

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Pengaturan Tampilan Editor — Export HTML</title>
  <style>
    :root {
      --navy: #17243D;
      --green: #00C98A;
      --green-dark: #008F63;
      --bg: #F0F5FA;
      --border: #DCE5EF;
      --muted: #5B708B;
    }
    * { box-sizing: border-box; }
    body {
      margin: 0;
      padding: 24px 16px 56px;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
      background: var(--bg);
      color: var(--navy);
      font-size: 13px;
      line-height: 1.45;
    }
    .container { max-width: 1280px; margin: 0 auto; }
    .hero {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 16px;
      padding: 20px 24px;
      margin-bottom: 16px;
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      justify-content: space-between;
      gap: 16px;
    }
    .hero h1 { margin: 0 0 6px; font-size: 18px; }
    .hero p { margin: 0; color: var(--muted); font-size: 12.5px; max-width: 720px; }
    .meta { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 10px; font-size: 12px; color: var(--muted); }
    .meta strong { color: var(--navy); }
    .toolbar {
      display: flex;
      flex-wrap: wrap;
      align-items: center;
      gap: 10px;
      margin-bottom: 16px;
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 12px;
      padding: 12px 16px;
    }
    .toolbar input[type="search"] {
      flex: 1;
      min-width: 220px;
      padding: 8px 12px;
      border: 1px solid var(--border);
      border-radius: 8px;
      font-size: 12.5px;
      outline: none;
    }
    .toolbar input[type="search"]:focus { border-color: var(--green); }
    .btn {
      display: inline-flex;
      align-items: center;
      gap: 6px;
      padding: 8px 14px;
      border-radius: 9px;
      border: 1px solid var(--border);
      background: #fff;
      color: var(--navy);
      font-size: 12px;
      font-weight: 600;
      cursor: pointer;
    }
    .btn-primary {
      background: var(--navy);
      border-color: var(--navy);
      color: #fff;
    }
    .btn-primary:hover { opacity: 0.92; }
    .cat-section {
      background: #fff;
      border: 1px solid var(--border);
      border-radius: 14px;
      margin-bottom: 16px;
      overflow: hidden;
    }
    .cat-header {
      padding: 14px 18px;
      background: #F8FBFE;
      border-bottom: 1px solid var(--border);
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 12px;
    }
    .cat-header h2 { margin: 0 0 3px; font-size: 14px; }
    .cat-header p { margin: 0; color: var(--muted); font-size: 11.5px; }
    .cat-count {
      background: #ECFDF6;
      color: var(--green-dark);
      border: 1px solid rgba(0, 201, 138, 0.35);
      padding: 3px 10px;
      border-radius: 999px;
      font-size: 11px;
      font-weight: 700;
      white-space: nowrap;
    }
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; text-align: left; }
    th {
      background: #F4F7FB;
      color: var(--muted);
      font-size: 11px;
      font-weight: 700;
      padding: 9px 12px;
      border-bottom: 1px solid var(--border);
    }
    td {
      padding: 8px 12px;
      border-bottom: 1px solid #EEF3F8;
      vertical-align: top;
      font-size: 12px;
    }
    tr:last-child td { border-bottom: none; }
    tr.row-custom { background: #ECFDF6; }
    tr.row-hidden { background: #FFF5F5; opacity: 0.85; }
    tr.row-hidden td.col-default { text-decoration: line-through; color: #94A3B8; }
    .col-no { color: #8FA4BF; text-align: right; font-variant-numeric: tabular-nums; }
    .col-key code {
      font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
      font-size: 11px;
      background: #F1F5F9;
      padding: 2px 6px;
      border-radius: 5px;
      color: #334155;
      word-break: break-all;
    }
    .col-value {
      background: #fff;
      border: 1px dashed #CBD5E1;
      border-radius: 6px;
      font-weight: 600;
      outline: none;
    }
    .col-value:focus {
      border-style: solid;
      border-color: var(--green);
      box-shadow: 0 0 0 2px rgba(0, 201, 138, 0.18);
    }
    .col-status {
      font-weight: 700;
      cursor: pointer;
      user-select: none;
      text-align: center;
      color: var(--green-dark);
    }
    tr.row-hidden .col-status { color: #E11D48; }
    .col-scope { color: var(--muted); font-size: 11px; }
    .badge {
      display: inline-block;
      padding: 2px 7px;
      border-radius: 6px;
      font-size: 10.5px;
      font-weight: 700;
      border: 1px solid var(--border);
    }
    .badge-judul { background: #ECFDF6; color: var(--green-dark); border-color: rgba(0,201,138,0.4); }
    .badge-label { background: #F0F5FA; color: var(--muted); }
    .badge-deskripsi { background: #EEF2FF; color: #3730A3; border-color: #C7D2FE; }
  </style>
</head>
<body>
  <div class="container">
    <header class="hero">
      <div>
        <h1>Pengaturan Tampilan Editor (Export HTML)</h1>
        <p>
          Anda dapat mengedit langsung kolom <strong>Teks Aktif</strong> atau klik kolom <strong>Status</strong>
          (<em>Tampil</em> / <em>Sembunyi</em>) di browser maupun editor teks, lalu unggah kembali file HTML ini
          melalui tombol <strong>Import HTML</strong> pada menu <strong>Pengaturan → Tampilan</strong>.
        </p>
        <div class="meta">
          <span>Diekspor: <strong>${escapeHtml(formatDateStamp(exportedAt))}</strong></span>
          <span>·</span>
          <span>Total Item: <strong>${UI_LABEL_CATALOG.length}</strong></span>
          <span>·</span>
          <span>Diubah: <strong>${customCount}</strong></span>
          <span>·</span>
          <span>Disembunyikan: <strong>${hiddenCount}</strong></span>
        </div>
      </div>
      <div>
        <button type="button" class="btn btn-primary" id="btn-download-updated">Unduh HTML Hasil Edit</button>
      </div>
    </header>

    <div class="toolbar">
      <input type="search" id="search-input" placeholder="Cari kunci, teks bawaan, atau teks aktif..." />
      <span id="filter-count" style="font-size:12px;color:#5B708B;"></span>
    </div>

${sectionsHtml}
  </div>

  <script type="application/json" id="lynk-ui-appearance-data">
${escapeJsonForScriptTag(embeddedPayload)}
  </script>

  <script>
    (function () {
      var searchEl = document.getElementById('search-input');
      var countEl = document.getElementById('filter-count');
      var rows = Array.prototype.slice.call(document.querySelectorAll('tr[data-ui-key]'));

      function syncRowVisual(tr) {
        var defVal = (tr.getAttribute('data-ui-default') || '').trim();
        var valCell = tr.querySelector('[data-ui-value]');
        var curVal = valCell ? (valCell.textContent || '').trim() : defVal;
        var vis = tr.getAttribute('data-ui-visible') !== 'false';
        tr.classList.toggle('row-hidden', !vis);
        tr.classList.toggle('row-custom', vis && curVal !== '' && curVal !== defVal);
      }

      rows.forEach(function (tr) {
        var valCell = tr.querySelector('[data-ui-value]');
        var statusCell = tr.querySelector('[data-ui-status]');
        if (valCell) {
          valCell.addEventListener('input', function () { syncRowVisual(tr); });
        }
        if (statusCell) {
          statusCell.addEventListener('click', function () {
            var nextVis = tr.getAttribute('data-ui-visible') === 'false';
            tr.setAttribute('data-ui-visible', nextVis ? 'true' : 'false');
            statusCell.textContent = nextVis ? 'Tampil' : 'Sembunyi';
            syncRowVisual(tr);
          });
        }
      });

      if (searchEl) {
        searchEl.addEventListener('input', function () {
          var q = (searchEl.value || '').trim().toLowerCase();
          var shown = 0;
          rows.forEach(function (tr) {
            var match = !q || (tr.textContent || '').toLowerCase().indexOf(q) !== -1;
            tr.style.display = match ? '' : 'none';
            if (match) shown += 1;
          });
          if (countEl) countEl.textContent = q ? (shown + ' cocok') : '';
        });
      }

      var dlBtn = document.getElementById('btn-download-updated');
      if (dlBtn) {
        dlBtn.addEventListener('click', function () {
          var nextLabels = {};
          var nextHidden = {};
          rows.forEach(function (tr) {
            var k = tr.getAttribute('data-ui-key');
            if (!k) return;
            var defVal = (tr.getAttribute('data-ui-default') || '').trim();
            var valCell = tr.querySelector('[data-ui-value]');
            var curVal = valCell ? (valCell.textContent || '').trim() : defVal;
            if (curVal && curVal !== defVal) {
              nextLabels[k] = curVal;
            }
            var statusCell = tr.querySelector('[data-ui-status]');
            var statusTxt = statusCell ? (statusCell.textContent || '').trim().toLowerCase() : '';
            var isHidden = statusTxt === 'sembunyi' || statusTxt === 'hidden' || tr.getAttribute('data-ui-visible') === 'false';
            tr.setAttribute('data-ui-visible', isHidden ? 'false' : 'true');
            if (isHidden) {
              nextHidden[k] = true;
            }
          });
          var jsonEl = document.getElementById('lynk-ui-appearance-data');
          if (jsonEl) {
            jsonEl.textContent = '\\n' + JSON.stringify({
              schema: 'lynk-builder-ui-appearance',
              version: 2,
              exportedAt: Date.now(),
              totalCatalogItems: rows.length,
              labels: nextLabels,
              hiddenKeys: nextHidden
            }, null, 2) + '\\n  ';
          }
          var html = '<!DOCTYPE html>\\n' + document.documentElement.outerHTML;
          var blob = new Blob([html], { type: 'text/html;charset=utf-8' });
          var url = URL.createObjectURL(blob);
          var a = document.createElement('a');
          a.href = url;
          a.download = 'lynk-tampilan-editor-updated.html';
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        });
      }
    })();
  </script>
</body>
</html>
`;
}

export interface ParsedUiAppearanceImportResult {
  ok: boolean;
  error?: string;
  source?: 'html-table' | 'html-json' | 'raw-json';
  parsedRowCount: number;
  labels: UiAppearanceLabelsMap;
  hiddenKeys: UiAppearanceHiddenMap;
  presentKeys: string[];
  unknownKeys: string[];
}

function parseVisibilityToken(rawText: string | null | undefined): boolean | null {
  if (!rawText) return null;
  const norm = rawText.trim().toLowerCase();
  if (!norm) return null;
  if (
    norm === 'sembunyi' ||
    norm === 'sembunyikan' ||
    norm === 'disembunyikan' ||
    norm === 'hidden' ||
    norm === 'hide' ||
    norm === 'false' ||
    norm === '0' ||
    norm === 'off' ||
    norm === 'tidak' ||
    norm === 'no'
  ) {
    return false;
  }
  if (
    norm === 'tampil' ||
    norm === 'tampilkan' ||
    norm === 'visible' ||
    norm === 'show' ||
    norm === 'true' ||
    norm === '1' ||
    norm === 'on' ||
    norm === 'ya' ||
    norm === 'yes'
  ) {
    return true;
  }
  return null;
}

/**
 * Safely parses an exported HTML Tampilan document (or raw JSON fallback) using DOMParser.
 * Never executes scripts or injects HTML into the DOM.
 * Table row edits (`tr[data-ui-key]`) take priority over the embedded JSON script so manual
 * HTML table edits always apply cleanly on re-import.
 */
export function parseUiAppearanceHtml(inputText: string): ParsedUiAppearanceImportResult {
  const trimmed = inputText.trim();
  if (!trimmed) {
    return {
      ok: false,
      error: 'Konten HTML kosong. Unggah file HTML atau tempel kode HTML terlebih dahulu.',
      parsedRowCount: 0,
      labels: {},
      hiddenKeys: {},
      presentKeys: [],
      unknownKeys: [],
    };
  }

  // Bonus support: raw JSON payload
  if (trimmed.startsWith('{') && trimmed.endsWith('}')) {
    try {
      const parsed = JSON.parse(trimmed) as {
        labels?: unknown;
        hiddenKeys?: unknown;
      };
      if (parsed && typeof parsed === 'object' && ('labels' in parsed || 'hiddenKeys' in parsed)) {
        const cleanLabels = sanitizeUiAppearanceLabelsMap(parsed.labels);
        const cleanHidden = sanitizeUiAppearanceHiddenMap(parsed.hiddenKeys);
        const allKeys = Array.from(
          new Set([...Object.keys(cleanLabels), ...Object.keys(cleanHidden)])
        );
        const unknownKeys = allKeys.filter((k) => !(k in UI_LABEL_DEFAULT_MAP));
        return {
          ok: true,
          source: 'raw-json',
          parsedRowCount: allKeys.length,
          labels: cleanLabels,
          hiddenKeys: cleanHidden,
          presentKeys: allKeys,
          unknownKeys,
        };
      }
    } catch {
      // fall through to HTML parser
    }
  }

  if (typeof DOMParser === 'undefined') {
    return {
      ok: false,
      error: 'Browser tidak mendukung DOMParser untuk membaca file HTML.',
      parsedRowCount: 0,
      labels: {},
      hiddenKeys: {},
      presentKeys: [],
      unknownKeys: [],
    };
  }

  const doc = new DOMParser().parseFromString(trimmed, 'text/html');
  const rows = Array.from(doc.querySelectorAll<HTMLTableRowElement>('tr[data-ui-key]'));

  if (rows.length > 0) {
    const rawLabels: Record<string, string> = {};
    const rawHidden: Record<string, boolean> = {};
    const presentKeys: string[] = [];
    const unknownKeys: string[] = [];

    for (const tr of rows) {
      const key = (tr.getAttribute('data-ui-key') || '').trim();
      if (!key || key.length > 120) continue;
      presentKeys.push(key);
      if (!(key in UI_LABEL_DEFAULT_MAP)) {
        unknownKeys.push(key);
      }

      const valEl = tr.querySelector<HTMLElement>('[data-ui-value]');
      let rawVal = '';
      if (valEl) {
        const inputInside = valEl.querySelector<HTMLInputElement | HTMLTextAreaElement>(
          'input, textarea'
        );
        rawVal = inputInside ? inputInside.value : (valEl.textContent ?? '');
      }
      const cleanVal = rawVal.replace(/[\u0000-\u001F\u007F]/g, '').trim().slice(0, 260);
      const defVal = UI_LABEL_DEFAULT_MAP[key];
      if (cleanVal && (!defVal || cleanVal !== defVal)) {
        rawLabels[key] = cleanVal;
      }

      const statusEl = tr.querySelector<HTMLElement>('[data-ui-status]');
      let visible: boolean | null = null;
      if (statusEl) {
        const checkbox = statusEl.querySelector<HTMLInputElement>('input[type="checkbox"]');
        const select = statusEl.querySelector<HTMLSelectElement>('select');
        if (checkbox) {
          visible = checkbox.checked;
        } else if (select) {
          visible = parseVisibilityToken(select.value);
        } else {
          visible = parseVisibilityToken(statusEl.textContent);
        }
      }
      if (visible === null) {
        visible = parseVisibilityToken(tr.getAttribute('data-ui-visible'));
      }
      if (visible === false) {
        rawHidden[key] = true;
      }
    }

    return {
      ok: true,
      source: 'html-table',
      parsedRowCount: presentKeys.length,
      labels: sanitizeUiAppearanceLabelsMap(rawLabels),
      hiddenKeys: sanitizeUiAppearanceHiddenMap(rawHidden),
      presentKeys,
      unknownKeys,
    };
  }

  // Fallback: embedded JSON script tag inside HTML
  const jsonScript = doc.querySelector<HTMLScriptElement>(
    'script#lynk-ui-appearance-data[type="application/json"], script#lynk-ui-appearance-data'
  );
  if (jsonScript?.textContent?.trim()) {
    try {
      const parsed = JSON.parse(jsonScript.textContent.trim()) as {
        labels?: unknown;
        hiddenKeys?: unknown;
      };
      const cleanLabels = sanitizeUiAppearanceLabelsMap(parsed?.labels);
      const cleanHidden = sanitizeUiAppearanceHiddenMap(parsed?.hiddenKeys);
      const presentKeys = Array.from(
        new Set([...Object.keys(cleanLabels), ...Object.keys(cleanHidden)])
      );
      const unknownKeys = presentKeys.filter((k) => !(k in UI_LABEL_DEFAULT_MAP));
      return {
        ok: true,
        source: 'html-json',
        parsedRowCount: presentKeys.length,
        labels: cleanLabels,
        hiddenKeys: cleanHidden,
        presentKeys,
        unknownKeys,
      };
    } catch {
      return {
        ok: false,
        error: 'Blok data JSON di dalam file HTML rusak atau tidak valid.',
        parsedRowCount: 0,
        labels: {},
        hiddenKeys: {},
        presentKeys: [],
        unknownKeys: [],
      };
    }
  }

  return {
    ok: false,
    error:
      'Format HTML tidak dikenali. Pastikan file HTML berasal dari fitur Export HTML Pengaturan Tampilan (memiliki baris tr[data-ui-key] atau script#lynk-ui-appearance-data).',
    parsedRowCount: 0,
    labels: {},
    hiddenKeys: {},
    presentKeys: [],
    unknownKeys: [],
  };
}
