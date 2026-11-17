import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import type { MediaAssetMeta } from '../types/builder.ts';
import { AppError } from './errors.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const MAX_MEDIA_BYTES = 5 * 1024 * 1024; // 5 MB max per uploaded media asset
const SAFE_MEDIA_FILENAME_RE = /^med_[a-zA-Z0-9_-]{8,64}\.(jpg|jpeg|png|webp|gif)$/;

export function resolveMediaDir(): string {
  const baseDir = process.env.LYNK_DATA_DIR?.trim()
    ? path.resolve(process.env.LYNK_DATA_DIR.trim())
    : path.resolve(__dirname, '../../.data');
  return path.join(baseDir, 'media');
}

export function isSafeMediaFilename(filename: string): boolean {
  return SAFE_MEDIA_FILENAME_RE.test(filename);
}

export function mimeTypeFromExt(ext: string): string {
  const clean = ext.toLowerCase().replace(/^\./, '');
  if (clean === 'png') return 'image/png';
  if (clean === 'webp') return 'image/webp';
  if (clean === 'gif') return 'image/gif';
  return 'image/jpeg';
}

export function detectImageMagicMime(buf: Buffer): { mimeType: string; ext: string } | null {
  if (buf.length < 12) return null;

  // JPEG: FF D8 FF
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) {
    return { mimeType: 'image/jpeg', ext: 'jpg' };
  }

  // PNG: 89 50 4E 47 0D 0A 1A 0A
  if (
    buf[0] === 0x89 &&
    buf[1] === 0x50 &&
    buf[2] === 0x4e &&
    buf[3] === 0x47 &&
    buf[4] === 0x0d &&
    buf[5] === 0x0a &&
    buf[6] === 0x1a &&
    buf[7] === 0x0a
  ) {
    return { mimeType: 'image/png', ext: 'png' };
  }

  // GIF87a / GIF89a
  const header6 = buf.subarray(0, 6).toString('ascii');
  if (header6 === 'GIF87a' || header6 === 'GIF89a') {
    return { mimeType: 'image/gif', ext: 'gif' };
  }

  // RIFF....WEBP
  const riff = buf.subarray(0, 4).toString('ascii');
  const webp = buf.subarray(8, 12).toString('ascii');
  if (riff === 'RIFF' && webp === 'WEBP') {
    return { mimeType: 'image/webp', ext: 'webp' };
  }

  return null;
}

export function decodeBase64MediaInput(dataUrlOrBase64: string): {
  buffer: Buffer;
  mimeType: string;
  ext: string;
} {
  const trimmed = (dataUrlOrBase64 || '').trim();
  const dataUrlMatch = trimmed.match(
    /^data:(image\/(?:png|jpeg|jpg|webp|gif));base64,([a-zA-Z0-9+/=\r\n]+)$/i
  );

  let rawBase64 = '';
  if (dataUrlMatch) {
    rawBase64 = dataUrlMatch[2];
  } else if (/^[a-zA-Z0-9+/=\r\n]+$/.test(trimmed)) {
    rawBase64 = trimmed;
  } else {
    throw new AppError(
      400,
      'INVALID_MEDIA_FORMAT',
      'Format media tidak didukung. Hanya gambar raster PNG, JPG, WebP, atau GIF yang diizinkan.'
    );
  }

  const buffer = Buffer.from(rawBase64, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_MEDIA_BYTES) {
    throw new AppError(
      400,
      'MEDIA_SIZE_INVALID',
      `Ukuran gambar harus antara 1 byte hingga ${Math.round(MAX_MEDIA_BYTES / (1024 * 1024))} MB.`
    );
  }

  const detected = detectImageMagicMime(buffer);
  if (!detected) {
    throw new AppError(
      400,
      'INVALID_IMAGE_MAGIC_BYTES',
      'Konten berkas tidak cocok dengan signature gambar valid (PNG/JPG/WebP/GIF).'
    );
  }

  return {
    buffer,
    mimeType: detected.mimeType,
    ext: detected.ext,
  };
}

export async function writeMediaFile(params: {
  dataUrl: string;
  preferredId?: string;
}): Promise<{ meta: MediaAssetMeta; buffer: Buffer }> {
  const { buffer, mimeType, ext } = decodeBase64MediaInput(params.dataUrl);
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const rawId =
    params.preferredId && /^med_[a-zA-Z0-9_-]{8,50}$/.test(params.preferredId)
      ? params.preferredId
      : `med_${crypto.randomBytes(8).toString('hex')}`;
  const filename = `${rawId}.${ext}`;
  const mediaDir = resolveMediaDir();
  await fs.mkdir(mediaDir, { recursive: true });

  const targetPath = path.join(mediaDir, filename);
  const tmpPath = `${targetPath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  const handle = await fs.open(tmpPath, 'w', 0o600);
  try {
    await handle.writeFile(buffer);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(tmpPath, targetPath);

  const meta: MediaAssetMeta = {
    id: rawId,
    filename,
    url: `/api/media/${filename}`,
    mimeType,
    sizeBytes: buffer.length,
    sha256,
    createdAt: Date.now(),
  };

  return { meta, buffer };
}

export async function writeMediaBufferExact(params: {
  id: string;
  filename: string;
  base64Data: string;
}): Promise<MediaAssetMeta> {
  if (!isSafeMediaFilename(params.filename)) {
    throw new AppError(400, 'INVALID_MEDIA_FILENAME', `Nama berkas media tidak valid: ${params.filename}`);
  }
  const buffer = Buffer.from(params.base64Data, 'base64');
  if (buffer.length === 0 || buffer.length > MAX_MEDIA_BYTES) {
    throw new AppError(400, 'MEDIA_SIZE_INVALID', 'Ukuran media pada bundle tidak valid.');
  }
  const detected = detectImageMagicMime(buffer);
  if (!detected) {
    throw new AppError(400, 'INVALID_IMAGE_MAGIC_BYTES', `Berkas media korup atau tidak valid: ${params.filename}`);
  }
  const sha256 = crypto.createHash('sha256').update(buffer).digest('hex');
  const mediaDir = resolveMediaDir();
  await fs.mkdir(mediaDir, { recursive: true });

  const targetPath = path.join(mediaDir, params.filename);
  const tmpPath = `${targetPath}.${process.pid}.${crypto.randomBytes(4).toString('hex')}.tmp`;
  const handle = await fs.open(tmpPath, 'w', 0o600);
  try {
    await handle.writeFile(buffer);
    await handle.sync();
  } finally {
    await handle.close();
  }
  await fs.rename(tmpPath, targetPath);

  return {
    id: params.id,
    filename: params.filename,
    url: `/api/media/${params.filename}`,
    mimeType: detected.mimeType,
    sizeBytes: buffer.length,
    sha256,
    createdAt: Date.now(),
  };
}

export async function readMediaFileSafe(filename: string): Promise<{
  buffer: Buffer;
  mimeType: string;
} | null> {
  if (!isSafeMediaFilename(filename)) {
    return null;
  }
  const mediaDir = resolveMediaDir();
  const fullPath = path.resolve(mediaDir, filename);
  if (!fullPath.startsWith(mediaDir + path.sep)) {
    return null;
  }
  try {
    const buffer = await fs.readFile(fullPath);
    const ext = path.extname(filename);
    return {
      buffer,
      mimeType: mimeTypeFromExt(ext),
    };
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') return null;
    throw err;
  }
}

export async function exportAllDiskMediaAssets(): Promise<
  Array<{ id: string; filename: string; mimeType: string; sizeBytes: number; sha256: string; base64: string }>
> {
  const mediaDir = resolveMediaDir();
  let entries: string[] = [];
  try {
    entries = await fs.readdir(mediaDir);
  } catch (err) {
    const code = (err as NodeJS.ErrnoException)?.code;
    if (code === 'ENOENT') return [];
    throw err;
  }

  const out: Array<{
    id: string;
    filename: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
    base64: string;
  }> = [];

  for (const name of entries.sort()) {
    if (!isSafeMediaFilename(name)) continue;
    const loaded = await readMediaFileSafe(name);
    if (!loaded) continue;
    const id = name.replace(/\.[^.]+$/, '');
    out.push({
      id,
      filename: name,
      mimeType: loaded.mimeType,
      sizeBytes: loaded.buffer.length,
      sha256: crypto.createHash('sha256').update(loaded.buffer).digest('hex'),
      base64: loaded.buffer.toString('base64'),
    });
  }

  return out;
}
