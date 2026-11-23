import { uploadMediaAsset } from './authClient';

export interface ImageCompressionOptions {
  maxDimension?: number;
  quality?: number;
  format?: 'webp' | 'jpeg' | 'png';
}

const MAX_RAW_IMAGE_BYTES = 20 * 1024 * 1024;
const SKIP_COMPRESS_BYTES = 60 * 1024;

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        resolve(reader.result);
      } else {
        reject(new Error('Gagal membaca file.'));
      }
    };
    reader.onerror = () => reject(reader.error ?? new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });
}

function loadImageElement(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('File bukan gambar yang valid.'));
    img.src = src;
  });
}

/**
 * Reads an image File and compresses raster images client-side using Canvas
 * so large phone/camera photos don't bloat memory, Undo history, or IndexedDB.
 */
export async function readAndCompressImage(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<string> {
  if (file.size > MAX_RAW_IMAGE_BYTES) {
    throw new Error('Ukuran gambar terlalu besar (maksimal 20 MB).');
  }

  const maxDimension = options.maxDimension ?? 1080;
  const quality = options.quality ?? 0.82;
  const preferredFormat = options.format;
  const originalDataUrl = await readFileAsDataUrl(file);

  // Preserve vector SVGs, animated GIFs, or already-tiny files without re-encoding
  const isSvgOrGif =
    file.type === 'image/svg+xml' ||
    file.type === 'image/gif' ||
    originalDataUrl.startsWith('data:image/svg+xml') ||
    originalDataUrl.startsWith('data:image/gif');

  const needsFormatConvert =
    preferredFormat === 'jpeg' && !originalDataUrl.startsWith('data:image/jpeg');

  if (isSvgOrGif || (!needsFormatConvert && file.size <= SKIP_COMPRESS_BYTES)) {
    return originalDataUrl;
  }

  try {
    const img = await loadImageElement(originalDataUrl);
    const naturalW = img.naturalWidth || img.width;
    const naturalH = img.naturalHeight || img.height;
    if (!naturalW || !naturalH) {
      return originalDataUrl;
    }

    const scale = Math.min(1, maxDimension / Math.max(naturalW, naturalH));
    const targetW = Math.max(1, Math.round(naturalW * scale));
    const targetH = Math.max(1, Math.round(naturalH * scale));

    const canvas = document.createElement('canvas');
    canvas.width = targetW;
    canvas.height = targetH;
    const ctx = canvas.getContext('2d');
    if (!ctx) return originalDataUrl;

    if (preferredFormat === 'jpeg') {
      ctx.fillStyle = '#FFFFFF';
      ctx.fillRect(0, 0, targetW, targetH);
    }
    ctx.drawImage(img, 0, 0, targetW, targetH);

    if (preferredFormat === 'jpeg') {
      return canvas.toDataURL('image/jpeg', quality);
    }
    if (preferredFormat === 'png') {
      return canvas.toDataURL('image/png');
    }

    // Prefer WebP for smaller size & alpha support; fall back to JPEG/PNG if unsupported
    let compressed = canvas.toDataURL('image/webp', quality);
    if (!compressed.startsWith('data:image/webp')) {
      const targetMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      compressed = canvas.toDataURL(targetMime, quality);
    }

    if (compressed.length < originalDataUrl.length || scale < 1) {
      return compressed;
    }
    return originalDataUrl;
  } catch {
    return originalDataUrl;
  }
}

export interface PreparedImageUpload {
  dataUrl: string;
  fileName: string;
  formatLabel: string;
  mimeType: string;
  sizeBytes: number;
  width?: number;
  height?: number;
  note?: string;
}

export function formatBytesLabel(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes < 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function estimateDataUrlBytes(dataUrl: string): number {
  const commaIdx = dataUrl.indexOf(',');
  if (commaIdx === -1) return dataUrl.length;
  const header = dataUrl.slice(0, commaIdx);
  const body = dataUrl.slice(commaIdx + 1);
  if (header.includes(';base64')) {
    const padding = body.endsWith('==') ? 2 : body.endsWith('=') ? 1 : 0;
    return Math.max(0, Math.floor((body.length * 3) / 4) - padding);
  }
  try {
    return decodeURIComponent(body).length;
  } catch {
    return body.length;
  }
}

function replaceExt(fileName: string, nextExt: string): string {
  const clean = (fileName || 'gambar').trim() || 'gambar';
  const dot = clean.lastIndexOf('.');
  const base = dot > 0 ? clean.slice(0, dot) : clean;
  return `${base}.${nextExt}`;
}

/**
 * Step 1 of standard Image Upload flow:
 * Reads file, converts supported raster images to WebP (preserving animated GIF & vector SVG),
 * validates output (never returns corrupt data), and returns preview + file metadata WITHOUT saving yet.
 */
export async function prepareImageForWebpPreview(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<PreparedImageUpload> {
  if (file.size > MAX_RAW_IMAGE_BYTES) {
    throw new Error('Ukuran gambar terlalu besar (maksimal 20 MB).');
  }
  if (!file.type.startsWith('image/') && !/\.(png|jpe?g|webp|gif|svg|bmp|avif)$/i.test(file.name)) {
    throw new Error('Format berkas tidak didukung. Pilih gambar PNG, JPG, WebP, GIF, atau SVG.');
  }

  const originalDataUrl = await readFileAsDataUrl(file);
  const isSvg =
    file.type === 'image/svg+xml' ||
    file.name.toLowerCase().endsWith('.svg') ||
    originalDataUrl.startsWith('data:image/svg+xml');
  const isGif =
    file.type === 'image/gif' ||
    file.name.toLowerCase().endsWith('.gif') ||
    originalDataUrl.startsWith('data:image/gif');

  // Special handling for SVG: validate XML/SVG structure so vector never breaks
  if (isSvg) {
    const rawText = await file.text();
    if (!/<svg[\s>]/i.test(rawText)) {
      throw new Error('File SVG tidak valid atau rusak.');
    }
    return {
      dataUrl: originalDataUrl,
      fileName: file.name || 'gambar.svg',
      formatLabel: 'SVG (Vektor)',
      mimeType: 'image/svg+xml',
      sizeBytes: file.size || estimateDataUrlBytes(originalDataUrl),
      note: 'Vektor SVG dipertahankan utuh agar tampilan tetap tajam.',
    };
  }

  // Special handling for animated GIF: preserve frames without flattening to static WebP
  if (isGif) {
    const img = await loadImageElement(originalDataUrl);
    return {
      dataUrl: originalDataUrl,
      fileName: file.name || 'animasi.gif',
      formatLabel: 'GIF (Animasi)',
      mimeType: 'image/gif',
      sizeBytes: file.size || estimateDataUrlBytes(originalDataUrl),
      width: img.naturalWidth || img.width,
      height: img.naturalHeight || img.height,
      note: 'Animasi GIF dipertahankan tanpa menghilangkan frame.',
    };
  }

  // Raster conversion to WebP via Canvas
  const maxDimension = options.maxDimension ?? 1080;
  const quality = options.quality ?? 0.84;
  const img = await loadImageElement(originalDataUrl);
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;
  if (!naturalW || !naturalH) {
    throw new Error('Konversi gagal: dimensi gambar tidak valid atau file rusak.');
  }

  const scale = Math.min(1, maxDimension / Math.max(naturalW, naturalH));
  const targetW = Math.max(1, Math.round(naturalW * scale));
  const targetH = Math.max(1, Math.round(naturalH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = targetW;
  canvas.height = targetH;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Konversi WebP gagal: Canvas 2D tidak tersedia pada browser ini.');
  }

  ctx.drawImage(img, 0, 0, targetW, targetH);
  const webpDataUrl = canvas.toDataURL('image/webp', quality);
  if (!webpDataUrl.startsWith('data:image/webp')) {
    throw new Error('Browser tidak mendukung konversi gambar ke format WebP.');
  }

  return {
    dataUrl: webpDataUrl,
    fileName: replaceExt(file.name, 'webp'),
    formatLabel: 'WebP',
    mimeType: 'image/webp',
    sizeBytes: estimateDataUrlBytes(webpDataUrl),
    width: targetW,
    height: targetH,
    note: 'Dikonversi ke WebP. Klik SIMPAN untuk menyimpan ke proyek.',
  };
}

/**
 * Step 2 of standard Image Upload flow (triggered ONLY when user clicks SIMPAN):
 * Persists prepared image to server project media storage (`/api/media/upload`)
 * with safe Data URL fallback for SVG or offline editing.
 */
export async function savePreparedImageToProject(prepared: PreparedImageUpload): Promise<string> {
  if (!prepared?.dataUrl) {
    throw new Error('Tidak ada gambar siap simpan.');
  }
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(prepared.dataUrl)) {
    const uploaded = await uploadMediaAsset(prepared.dataUrl);
    if (uploaded.ok && uploaded.url) {
      return uploaded.url;
    }
  }
  return prepared.dataUrl;
}

/**
 * Compresses raster image AND uploads it to server `/api/media/upload` so project JSON
 * stores lightweight `/api/media/...` URLs rather than huge base64 strings.
 * Falls back to compressed data URL only if user is editing unauthenticated/offline
 * or when uploading SVG.
 */
export async function uploadCompressedImageOrFallback(
  file: File,
  options: ImageCompressionOptions = {}
): Promise<string> {
  const compressed = await readAndCompressImage(file, options);

  // Only raster formats supported by /api/media/upload magic-byte verifier
  if (/^data:image\/(png|jpe?g|webp|gif);base64,/i.test(compressed)) {
    const uploaded = await uploadMediaAsset(compressed);
    if (uploaded.ok && uploaded.url) {
      return uploaded.url;
    }
  }
  return compressed;
}

export async function readVideoFileSafe(file: File, maxMb = 12): Promise<string> {
  const maxBytes = maxMb * 1024 * 1024;
  if (file.size > maxBytes) {
    throw new Error(
      `Ukuran video (${(file.size / (1024 * 1024)).toFixed(1)} MB) melebihi batas ${maxMb} MB. Gunakan URL video agar halaman tetap ringan.`
    );
  }
  return readFileAsDataUrl(file);
}

export interface RemoveBackgroundOptions {
  /** Toleransi warna latar belakang (10 - 110, default 42) */
  tolerance?: number;
  /** Kehalusan tepi anti-aliasing (0 - 30, default 16) */
  edgeFeather?: number;
  /** Deteksi otomatis warna 4 sudut ('auto_corners') atau khusus latar putih ('white') */
  mode?: 'auto_corners' | 'white';
  /** Dimensi maksimal output PNG (default 1024px) */
  maxDimension?: number;
}

function loadImageForCanvas(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    if (/^https?:\/\//i.test(src)) {
      img.crossOrigin = 'anonymous';
    }
    img.onload = () => resolve(img);
    img.onerror = () =>
      reject(
        new Error(
          'Gagal memuat gambar untuk hapus background (pastikan gambar diupload langsung atau URL mendukung CORS).'
        )
      );
    img.src = src;
  });
}

/**
 * Menghapus background putih atau warna polos menggunakan edge flood-fill dari 4 tepi gambar
 * dengan anti-aliased feathering sehingga detail putih di dalam objek tetap aman terjaga.
 * Mengembalikan URL PNG transparan (otomatis disimpan via /api/media/upload jika tersedia).
 */
export async function removeSolidBackgroundFromImage(
  src: string,
  options: RemoveBackgroundOptions = {}
): Promise<string> {
  if (!src?.trim()) {
    throw new Error('Belum ada gambar untuk diproses.');
  }
  const tolerance = Math.max(8, Math.min(120, options.tolerance ?? 42));
  const feather = Math.max(0, Math.min(40, options.edgeFeather ?? 18));
  const mode = options.mode ?? 'auto_corners';
  const maxDimension = options.maxDimension ?? 1024;

  const img = await loadImageForCanvas(src);
  const naturalW = img.naturalWidth || img.width;
  const naturalH = img.naturalHeight || img.height;
  if (!naturalW || !naturalH) {
    throw new Error('Dimensi gambar tidak valid.');
  }

  const scale = Math.min(1, maxDimension / Math.max(naturalW, naturalH));
  const w = Math.max(1, Math.round(naturalW * scale));
  const h = Math.max(1, Math.round(naturalH * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) {
    throw new Error('Canvas 2D tidak tersedia pada browser ini.');
  }

  ctx.drawImage(img, 0, 0, w, h);

  let imageData: ImageData;
  try {
    imageData = ctx.getImageData(0, 0, w, h);
  } catch {
    throw new Error(
      'Gambar dari URL eksternal diblokir oleh kebijakan CORS browser. Upload file gambar langsung untuk menghapus background.'
    );
  }

  const data = imageData.data;

  // Sample target background colors (white or 4-corner solid color)
  const samplePoints: Array<[number, number]> = [
    [0, 0],
    [w - 1, 0],
    [0, h - 1],
    [w - 1, h - 1],
    [Math.floor(w / 2), 0],
    [Math.floor(w / 2), h - 1],
  ];

  const bgColors: Array<[number, number, number]> = [];
  if (mode === 'white') {
    bgColors.push([255, 255, 255]);
  } else {
    for (const [sx, sy] of samplePoints) {
      const idx = (sy * w + sx) * 4;
      if (data[idx + 3] < 20) continue; // already transparent
      const r = data[idx];
      const g = data[idx + 1];
      const b = data[idx + 2];
      // Avoid duplicate near-identical samples
      const exists = bgColors.some(
        ([cr, cg, cb]) => Math.abs(cr - r) + Math.abs(cg - g) + Math.abs(cb - b) < 24
      );
      if (!exists) bgColors.push([r, g, b]);
    }
    if (bgColors.length === 0) {
      bgColors.push([255, 255, 255]);
    }
  }

  const colorDist = (r: number, g: number, b: number): number => {
    let best = 999;
    for (let i = 0; i < bgColors.length; i += 1) {
      const [br, bg, bb] = bgColors[i];
      const dr = r - br;
      const dg = g - bg;
      const db = b - bb;
      // Weighted Euclidean distance scaled to 0..255
      const d = Math.sqrt(dr * dr * 0.3 + dg * dg * 0.59 + db * db * 0.11);
      if (d < best) best = d;
    }
    return best;
  };

  const totalPixels = w * h;
  const visited = new Uint8Array(totalPixels);
  const isBg = new Uint8Array(totalPixels);
  const queue = new Int32Array(totalPixels);
  let head = 0;
  let tail = 0;

  const tryEnqueue = (px: number, py: number) => {
    const pIdx = py * w + px;
    if (visited[pIdx]) return;
    const i4 = pIdx * 4;
    const alpha = data[i4 + 3];
    const d = alpha < 20 ? 0 : colorDist(data[i4], data[i4 + 1], data[i4 + 2]);
    if (d <= tolerance) {
      visited[pIdx] = 1;
      isBg[pIdx] = 1;
      queue[tail++] = pIdx;
    }
  };

  // Seed flood-fill from all 4 outer edges
  for (let x = 0; x < w; x += 1) {
    tryEnqueue(x, 0);
    tryEnqueue(x, h - 1);
  }
  for (let y = 1; y < h - 1; y += 1) {
    tryEnqueue(0, y);
    tryEnqueue(w - 1, y);
  }

  while (head < tail) {
    const cur = queue[head++];
    const cx = cur % w;
    const cy = (cur - cx) / w;
    if (cx > 0) tryEnqueue(cx - 1, cy);
    if (cx < w - 1) tryEnqueue(cx + 1, cy);
    if (cy > 0) tryEnqueue(cx, cy - 1);
    if (cy < h - 1) tryEnqueue(cx, cy + 1);
  }

  // Clear flood-filled background pixels + smooth feather border pixels adjacent to background
  const maxDist = tolerance + feather;
  for (let p = 0; p < totalPixels; p += 1) {
    const i4 = p * 4;
    if (isBg[p]) {
      data[i4 + 3] = 0;
    } else if (feather > 0 && data[i4 + 3] > 0) {
      const px = p % w;
      const py = (p - px) / w;
      const touchesBg =
        (px > 0 && isBg[p - 1]) ||
        (px < w - 1 && isBg[p + 1]) ||
        (py > 0 && isBg[p - w]) ||
        (py < h - 1 && isBg[p + w]);
      if (touchesBg) {
        const d = colorDist(data[i4], data[i4 + 1], data[i4 + 2]);
        if (d < maxDist) {
          const ratio = Math.max(0, Math.min(1, (d - tolerance) / Math.max(1, feather)));
          data[i4 + 3] = Math.round(data[i4 + 3] * ratio);
        }
      }
    }
  }

  ctx.putImageData(imageData, 0, 0);
  const pngDataUrl = canvas.toDataURL('image/png');
  const uploaded = await uploadMediaAsset(pngDataUrl);
  if (uploaded.ok && uploaded.url) {
    return uploaded.url;
  }
  return pngDataUrl;
}

