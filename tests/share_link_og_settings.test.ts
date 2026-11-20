import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { test } from 'node:test';
import { DEFAULT_STYLE, INITIAL_PROJECT } from '../src/data/presets.ts';
import { generateProjectHtml } from '../src/utils/htmlExporter.ts';
import { sanitizeBuilderProject } from '../src/utils/htmlSanitizer.ts';
import { findFallbackShareImageFromBlocks } from '../src/utils/publishingHelpers.ts';
import { PublicPageHtmlCache } from '../src/server/publicPageCache.ts';

function cloneDefaultProject() {
  return structuredClone(INITIAL_PROJECT);
}

test('generateProjectHtml emits full WhatsApp/OpenGraph rich card tags with absolute media URL', () => {
  const project = cloneDefaultProject();
  project.title = 'Pataka Jas Club';
  project.publishing = {
    slug: 'jasclub',
    customDomain: '',
    useCustomDomain: false,
    isPublished: true,
    seoTitle: 'Pataka Jas Club — Katalog & Reservasi Resmi',
    seoDescription: 'Sewa & jahit jas premium cepat, rapi, dan bisa konsultasi langsung via WhatsApp.',
    seoImage: '/api/media/med_banner_jas.jpg',
    seoImageAlt: 'Banner Pataka Jas Club',
    seoSiteName: 'Pataka Jas Club',
    seoShareText: 'Cek katalog resmi Pataka Jas Club',
  };

  const html = generateProjectHtml(project, {
    projectId: 'proj_jas',
    publicOrigin: 'https://cekdetail.pataka360.com',
    canonicalUrl: 'https://cekdetail.pataka360.com/p/jasclub',
  });

  assert.match(html, /<title>Pataka Jas Club — Katalog &amp; Reservasi Resmi<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/cekdetail\.pataka360\.com\/p\/jasclub" \/>/);
  assert.match(html, /<meta property="og:url" content="https:\/\/cekdetail\.pataka360\.com\/p\/jasclub" \/>/);
  assert.match(html, /<meta property="og:site_name" content="Pataka Jas Club" \/>/);
  assert.match(html, /<meta property="og:title" content="Pataka Jas Club — Katalog &amp; Reservasi Resmi" \/>/);
  assert.match(html, /<meta property="og:description" content="Sewa &amp; jahit jas premium cepat, rapi, dan bisa konsultasi langsung via WhatsApp\." \/>/);
  assert.match(html, /<meta property="og:image" content="https:\/\/cekdetail\.pataka360\.com\/api\/media\/med_banner_jas\.jpg" \/>/);
  assert.match(html, /<meta property="og:image:secure_url" content="https:\/\/cekdetail\.pataka360\.com\/api\/media\/med_banner_jas\.jpg" \/>/);
  assert.match(html, /<meta property="og:image:type" content="image\/jpeg" \/>/);
  assert.match(html, /<meta property="og:image:width" content="1200" \/>/);
  assert.match(html, /<meta property="og:image:height" content="630" \/>/);
  assert.match(html, /<meta property="og:image:alt" content="Banner Pataka Jas Club" \/>/);
  assert.match(html, /<meta name="twitter:card" content="summary_large_image" \/>/);
  assert.match(html, /<meta name="twitter:image" content="https:\/\/cekdetail\.pataka360\.com\/api\/media\/med_banner_jas\.jpg" \/>/);
  assert.match(html, /<script type="application\/ld\+json">.*?"@type":"WebPage".*?<\/script>/);
});

test('fallback share image detects hosted block image and ignores inline base64 data URIs', () => {
  const project = cloneDefaultProject();
  project.blocks = [
    {
      id: 'b_img_data',
      type: 'image',
      label: 'Inline Image',
      content: { src: 'data:image/png;base64,iVBORw0KGgo=' },
      style: { ...DEFAULT_STYLE },
    },
    {
      id: 'b_hero',
      type: 'hero_profile',
      label: 'Hero',
      content: { heroCoverImage: '/api/media/hero_cover.png' },
      style: { ...DEFAULT_STYLE },
    },
  ];

  assert.equal(findFallbackShareImageFromBlocks(project.blocks), '/api/media/hero_cover.png');

  const html = generateProjectHtml(project, {
    publicOrigin: 'https://cekdetail.pataka360.com',
  });
  assert.match(
    html,
    /<meta property="og:image" content="https:\/\/cekdetail\.pataka360\.com\/api\/media\/hero_cover\.png" \/>/
  );
  assert.match(html, /<meta property="og:image:type" content="image\/png" \/>/);
});

test('sanitizeBuilderProject preserves valid SEO share fields and strips unsafe seoImage schemes', () => {
  const project = cloneDefaultProject();
  project.publishing = {
    slug: 'jasclub',
    customDomain: '',
    useCustomDomain: false,
    isPublished: true,
    seoTitle: '  Judul Share Baru  ',
    seoDescription: '  Deskripsi Share Baru  ',
    seoImage: 'javascript:alert(1)',
    seoImageAlt: '  Alt Banner  ',
    seoSiteName: '  Pataka360  ',
    seoShareText: '  Lihat penawaran terbaru kami  ',
  };

  const sanitized = sanitizeBuilderProject(project);
  assert.equal(sanitized.publishing?.seoTitle, 'Judul Share Baru');
  assert.equal(sanitized.publishing?.seoDescription, 'Deskripsi Share Baru');
  assert.equal(sanitized.publishing?.seoImage, '');
  assert.equal(sanitized.publishing?.seoImageAlt, 'Alt Banner');
  assert.equal(sanitized.publishing?.seoSiteName, 'Pataka360');
  assert.equal(sanitized.publishing?.seoShareText, 'Lihat penawaran terbaru kami');

  project.publishing.seoImage = '/api/media/med_ok.jpg';
  const sanitizedWithImg = sanitizeBuilderProject(project);
  assert.equal(sanitizedWithImg.publishing?.seoImage, '/api/media/med_ok.jpg');
});

test('PublicPageHtmlCache isolates entries by origin and invalidates all origin variants on project update', () => {
  const cache = new PublicPageHtmlCache({ maxEntries: 50, ttlMs: 60_000 });
  cache.setBySlug(
    'jasclub',
    { projectId: 'p1', slug: 'jasclub', revision: 1, html: '<html data-o="local">' },
    'http://localhost:3000'
  );
  cache.setBySlug(
    'jasclub',
    { projectId: 'p1', slug: 'jasclub', revision: 1, html: '<html data-o="prod">' },
    'https://cekdetail.pataka360.com'
  );

  assert.equal(
    cache.getBySlug('jasclub', 'http://localhost:3000')?.html,
    '<html data-o="local">'
  );
  assert.equal(
    cache.getBySlug('jasclub', 'https://cekdetail.pataka360.com')?.html,
    '<html data-o="prod">'
  );

  cache.invalidateProject('p1', ['jasclub']);
  assert.equal(cache.getBySlug('jasclub', 'http://localhost:3000'), null);
  assert.equal(cache.getBySlug('jasclub', 'https://cekdetail.pataka360.com'), null);
});

test('BusinessSettingsPage & server.ts wire Share Link preview settings end-to-end', () => {
  const settingsSrc = fs.readFileSync(
    path.resolve('src/components/BusinessSettingsPage.tsx'),
    'utf8'
  );
  assert.match(settingsSrc, /Tampilan Share Link \(WhatsApp &amp; Media Sosial\)/);
  assert.match(settingsSrc, /Gambar Banner Preview Link/);
  assert.match(settingsSrc, /Judul Preview Link \(og:title\)/);
  assert.match(settingsSrc, /Deskripsi Preview Link \(og:description\)/);
  assert.match(settingsSrc, /Preview Kartu Share WhatsApp/);
  assert.match(settingsSrc, /Salin Pesan \+ Link/);
  assert.match(settingsSrc, /Bagikan ke WA/);

  const serverSrc = fs.readFileSync(path.resolve('server.ts'), 'utf8');
  assert.match(serverSrc, /seoImage:\s*sanitizedInputProject\.publishing\?\.seoImage/);
  assert.match(serverSrc, /seoSiteName:\s*sanitizedInputProject\.publishing\?\.seoSiteName/);
  assert.match(serverSrc, /seoShareText:\s*sanitizedInputProject\.publishing\?\.seoShareText/);
  assert.match(serverSrc, /Cross-Origin-Resource-Policy/);
  assert.match(serverSrc, /resolveRequestPublicOrigin/);
});
