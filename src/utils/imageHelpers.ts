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
