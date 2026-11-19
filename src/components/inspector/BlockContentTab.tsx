import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Link2,
  ListOrdered,
  MousePointerClick,
  Plus,
  RotateCcw,
  Settings2,
  Tag,
  Trash2,
  Upload,
  Video,
  X,
} from 'lucide-react';
import {
  AdvanceOptions,
  BlockType,
  BuilderBlock,
  CarouselItem,
  CatalogCustomerField,
  CatalogItem,
  CatalogProductType,
  CatalogShippingOptionConfig,
  CategoryJumpItem,
  CustomFieldInputType,
  FnbMenuItem,
  PageTheme,
  ShippingMethodId,
  SocialFollowerAccount,
  SocialLinkItem,
  SocialPlatform,
  SocialPostItem,
  TrainingCustomBox,
  TrainingMediaItem,
  TrainingProgramItem,
} from '../../types/builder';
import {
  BLOCK_TYPE_NAMES,
  CAROUSEL_SAMPLE_1_SVG,
  CAROUSEL_SAMPLE_2_SVG,
  CAROUSEL_SAMPLE_3_SVG,
  DEFAULT_STYLE,
  MAPS_LOCATION_SVG,
  PRODUCT_CARD_SVG,
  createBlock,
  createId,
} from '../../data/presets';
import {
  cloneDefaultCatalogShippingOptions,
  getDefaultCustomerFields,
  getDefaultTrainingFormFields,
  isDigitalProductType,
  isPhysicalProductType,
  resolveCatalogCustomerFields,
  resolveCatalogShippingOptions,
  resolveShippingOptionChecklistItems,
  resolveTrainingFormFields,
} from '../../utils/cartHelpers';
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_LIST } from '../../utils/socialIcons';
import { readVideoFileSafe, uploadCompressedImageOrFallback } from '../../utils/imageHelpers';
import { FONT_OPTIONS } from '../../utils/fontHelpers';
import { cloneBlockDeep } from '../../utils/treeHelpers';
import { removeSelectedItemByIdOrIndex } from '../../utils/itemListHelpers';
import { RichTextEditor } from '../RichTextEditor';
import { SocialGlyph } from '../SocialIcon';
import { useUiLabel } from '../../contexts/UiLabelsContext';
import {
  AccordionSection,
  ItemOverflowMenu,
  MediaSourceInput,
  SectionEmptyNote,
  SliderRow,
  ToggleSwitch,
} from './InspectorPrimitives';

interface BlockContentTabProps {
  selectedBlock: BuilderBlock;
  theme: PageTheme;
  advanceOptions: AdvanceOptions;
  onUpdateAdvanceOptions: (patch: Partial<AdvanceOptions>) => void;
  onUpdateBlock: (id: string, updater: (block: BuilderBlock) => BuilderBlock) => void;
  onDuplicateBlock: (id: string) => void;
  onAddChildToContainer: (containerId: string, type: BlockType) => void;
  onSelectBlock?: (id: string) => void;
  onSetUploadError: (msg: string | null) => void;
}

type ContentSectionId = 'identity' | 'main' | 'items' | 'nav' | 'actions' | 'extra';

const SAMPLE_CAROUSEL_IMAGES = [
  CAROUSEL_SAMPLE_1_SVG,
  CAROUSEL_SAMPLE_2_SVG,
  CAROUSEL_SAMPLE_3_SVG,
];

function getImgSourceLabel(val?: string) {
  if (!val?.trim()) return 'Tanpa Foto';
  if (val.startsWith('data:image/svg+xml')) return 'Gambar Bawaan';
  if (val.startsWith('data:image/')) return 'Upload Lokal';
  if (val.startsWith('/api/media/') || val.startsWith('/assets/')) return 'Upload Server';
  return 'Link URL';
}

export function BlockContentTab({
  selectedBlock,
  theme,
  advanceOptions,
  onUpdateAdvanceOptions,
  onUpdateBlock,
  onDuplicateBlock,
  onAddChildToContainer,
  onSelectBlock,
  onSetUploadError,
}: BlockContentTabProps) {
  const { label } = useUiLabel();
  const [openSections, setOpenSections] = useState<Record<ContentSectionId, boolean>>({
    identity: true,
    main: true,
    items: true,
    nav: false,
    actions: false,
    extra: false,
  });

  // Drill-down key: e.g., "catalog:item_1", "fnb:fnb_1", "shipping:makan_ditempat", "cf:cf_1"
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);
  const [catalogSubList, setCatalogSubList] = useState<'products' | 'customer' | 'shipping'>(
    'products'
  );
  const [trainingSubList, setTrainingSubList] = useState<
    'programs' | 'boxes' | 'media' | 'checklist' | 'form'
  >('programs');

  const [newSocialPlatform, setNewSocialPlatform] = useState<SocialPlatform>('instagram');
  const [newSocialFollowerPlatform, setNewSocialFollowerPlatform] =
    useState<SocialPlatform>('tiktok');
  const [uploadingHeroCover, setUploadingHeroCover] = useState(false);
  const [uploadingHeroPhoto, setUploadingHeroPhoto] = useState(false);

  useEffect(() => {
    setEditingItemKey(null);
  }, [selectedBlock.id]);

  const toggleSection = (id: ContentSectionId) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const c = selectedBlock.content;

  const updateContent = (patch: Partial<BuilderBlock['content']>) => {
    onUpdateBlock(selectedBlock.id, (blk) => ({
      ...blk,
      content: { ...blk.content, ...patch },
    }));
  };

  const handleCompressAndSet = async (
    file: File,
    opts: { maxDimension: number; quality: number },
    applyUrl: (blk: BuilderBlock, url: string) => BuilderBlock
  ) => {
    const targetBlockId = selectedBlock.id;
    onSetUploadError(null);
    try {
      const url = await uploadCompressedImageOrFallback(file, opts);
      onUpdateBlock(targetBlockId, (blk) => applyUrl(blk, url));
    } catch (err) {
      onSetUploadError(err instanceof Error ? err.message : 'Gagal memproses gambar.');
    }
  };

  const moveArrayItem = <T,>(arr: T[], idx: number, dir: -1 | 1): T[] => {
    const target = idx + dir;
    if (target < 0 || target >= arr.length) return arr;
    const copy = [...arr];
    const [moved] = copy.splice(idx, 1);
    copy.splice(target, 0, moved);
    return copy;
  };

  // --- 2. KONTEN UTAMA ---
  const renderMainContent = () => {
    switch (selectedBlock.type) {
      case 'text':
        return (
          <div className="space-y-1.5">
            <label className="block text-xs font-semibold text-[#17243D]">
              {label('konten.field.isiTeks', 'Isi Teks')}
            </label>
            <textarea
              rows={4}
              value={c.text ?? ''}
              placeholder="Tulis teks (kosongkan jika tidak digunakan)"
              onChange={(e) => updateContent({ text: e.target.value })}
              className="w-full px-2.5 py-2 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none resize-y"
            />
            {!(c.text ?? '').trim() && (
              <p className="text-[11px] text-[#8FA4BF]">
                Teks kosong otomatis disembunyikan di pratinjau &amp; halaman publik.
              </p>
            )}
          </div>
        );

      case 'image':
        return (
          <MediaSourceInput
            label={label('konten.field.gambarUtama', 'Gambar Utama (Upload atau URL)')}
            value={c.src ?? ''}
            onChangeUrl={(url) => updateContent({ src: url })}
            onUploadFile={(file) =>
              handleCompressAndSet(
                file,
                { maxDimension: 1080, quality: 0.82 },
                (blk, url) => ({ ...blk, content: { ...blk.content, src: url } })
              )
            }
          />
        );

      case 'hero_profile': {
        const heroVariant = c.heroVariant ?? 'compact';
        const coverTitleShown =
          c.heroCoverTitleEnabled !== false && c.heroCoverFontFamily !== '__none__';
        const coverHeightPx = Math.max(100, Math.min(340, c.heroCoverHeight ?? 170));
        const photoSizePx = Math.max(
          40,
          Math.min(140, c.heroLogoSize ?? (heroVariant === 'banner' ? 78 : 72))
        );

        const uploadHeroCover = async (file: File) => {
          const targetBlockId = selectedBlock.id;
          onSetUploadError(null);
          setUploadingHeroCover(true);
          try {
            const url = await uploadCompressedImageOrFallback(file, {
              maxDimension: 1200,
              quality: 0.84,
            });
            onUpdateBlock(targetBlockId, (blk) => ({
              ...blk,
              content: { ...blk.content, heroCoverImage: url },
            }));
          } catch (err) {
            onSetUploadError(err instanceof Error ? err.message : 'Gagal memproses gambar cover.');
          } finally {
            setUploadingHeroCover(false);
          }
        };

        const uploadHeroPhoto = async (file: File) => {
          const targetBlockId = selectedBlock.id;
          onSetUploadError(null);
          setUploadingHeroPhoto(true);
          try {
            const url = await uploadCompressedImageOrFallback(file, {
              maxDimension: 480,
              quality: 0.84,
            });
            onUpdateBlock(targetBlockId, (blk) => ({
              ...blk,
              content: { ...blk.content, heroLogoImage: url },
            }));
          } catch (err) {
            onSetUploadError(err instanceof Error ? err.message : 'Gagal memproses foto profil.');
          } finally {
            setUploadingHeroPhoto(false);
          }
        };

        return (
          <div className="space-y-3">
            {/* PENGATURAN COVER (TERPISAH & INDEPENDEN) */}
            <div
              data-hero-setting="cover"
              className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#17243D]">Pengaturan Cover</span>
                <span className="px-2 py-0.5 rounded bg-white border border-[#DCE5EF] text-[10px] font-semibold text-[#8FA4BF]">
                  {getImgSourceLabel(c.heroCoverImage)} · {coverHeightPx}px
                </span>
              </div>

              <div className="w-full h-20 rounded-lg border border-[#DCE5EF] bg-white overflow-hidden flex items-center justify-center">
                {c.heroCoverImage ? (
                  <img
                    src={c.heroCoverImage}
                    alt="Preview Cover"
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[11px] font-medium text-[#8FA4BF]">
                    Belum ada gambar cover
                  </span>
                )}
              </div>

              <MediaSourceInput
                label="Upload / URL Cover"
                value={c.heroCoverImage ?? ''}
                placeholder="https://contoh.com/foto-cover.jpg"
                uploading={uploadingHeroCover}
                onChangeUrl={(url) => updateContent({ heroCoverImage: url })}
                onUploadFile={uploadHeroCover}
                onClear={
                  c.heroCoverImage ? () => updateContent({ heroCoverImage: '' }) : undefined
                }
              />

              <SliderRow
                label="Ukuran Tinggi Cover (px)"
                value={`${coverHeightPx}px`}
                min={100}
                max={340}
                current={coverHeightPx}
                onChange={(v) => updateContent({ heroCoverHeight: v })}
              />

              {heroVariant === 'compact' && (
                <p className="text-[10.5px] text-[#8FA4BF] leading-snug">
                  Pilih model Banner Overlap di tab Desain untuk menampilkan cover di bagian atas profil.
                </p>
              )}

              <div className="flex items-center justify-between gap-2 pt-1.5 border-t border-[#DCE5EF]">
                <span className="text-xs font-medium text-[#17243D]">
                  Teks di Tengah Banner
                </span>
                <ToggleSwitch
                  checked={coverTitleShown}
                  onChange={(val) => updateContent({ heroCoverTitleEnabled: val })}
                  label="Tampilkan teks di banner"
                />
              </div>
              {coverTitleShown && (
                <input
                  type="text"
                  value={c.heroCoverTitle ?? ''}
                  onChange={(e) => updateContent({ heroCoverTitle: e.target.value })}
                  placeholder="Contoh: Warung Barokah"
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                />
              )}
            </div>

            {/* PENGATURAN FOTO (TERPISAH & INDEPENDEN) */}
            <div
              data-hero-setting="foto"
              className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2.5"
            >
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#17243D]">Pengaturan Foto</span>
                <span className="px-2 py-0.5 rounded bg-white border border-[#DCE5EF] text-[10px] font-semibold text-[#8FA4BF]">
                  {c.heroLogoImage ? getImgSourceLabel(c.heroLogoImage) : 'Inisial'} · {photoSizePx}px
                </span>
              </div>

              <div className="flex items-center gap-3 p-2 rounded-lg bg-white border border-[#DCE5EF]">
                <div
                  style={{
                    width: `${Math.min(56, Math.max(36, Math.round(photoSizePx * 0.6)))}px`,
                    height: `${Math.min(56, Math.max(36, Math.round(photoSizePx * 0.6)))}px`,
                    backgroundColor: c.heroLogoImage ? '#FFFFFF' : c.heroLogoBg ?? '#FFEDD5',
                    color: c.heroLogoColor ?? '#C2410C',
                  }}
                  className="rounded-full border border-[#DCE5EF] overflow-hidden shrink-0 flex items-center justify-center text-xs font-bold"
                >
                  {c.heroLogoImage ? (
                    <img
                      src={c.heroLogoImage}
                      alt="Preview Foto"
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span>{(c.heroLogoMonogram || 'WB').slice(0, 2).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-[#17243D]">Preview Foto Profil</div>
                  <div className="text-[10.5px] text-[#8FA4BF] tabular-nums">
                    Diameter tampil: {photoSizePx}px × {photoSizePx}px
                  </div>
                </div>
              </div>

              <MediaSourceInput
                label="Upload / URL Foto"
                value={c.heroLogoImage ?? ''}
                placeholder="https://... (kosongkan pakai inisial)"
                uploading={uploadingHeroPhoto}
                onChangeUrl={(url) => updateContent({ heroLogoImage: url })}
                onUploadFile={uploadHeroPhoto}
                onClear={
                  c.heroLogoImage ? () => updateContent({ heroLogoImage: '' }) : undefined
                }
              />

              <SliderRow
                label="Ukuran Foto (px)"
                value={`${photoSizePx}px`}
                min={40}
                max={140}
                current={photoSizePx}
                onChange={(v) => updateContent({ heroLogoSize: v })}
              />

              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="block text-[10px] font-medium text-[#8FA4BF] mb-0.5">
                    Inisial
                  </label>
                  <input
                    type="text"
                    maxLength={2}
                    value={c.heroLogoMonogram ?? 'WB'}
                    onChange={(e) => updateContent({ heroLogoMonogram: e.target.value })}
                    className="w-full px-2 py-1 text-xs rounded border border-[#DCE5EF] bg-white uppercase"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#8FA4BF] mb-0.5">
                    Latar
                  </label>
                  <input
                    type="color"
                    value={c.heroLogoBg ?? '#FFEDD5'}
                    onChange={(e) => updateContent({ heroLogoBg: e.target.value })}
                    className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#8FA4BF] mb-0.5">
                    Teks
                  </label>
                  <input
                    type="color"
                    value={c.heroLogoColor ?? '#C2410C'}
                    onChange={(e) => updateContent({ heroLogoColor: e.target.value })}
                    className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Nama Usaha / Judul
                </label>
                <input
                  type="text"
                  value={c.heroTitle ?? ''}
                  onChange={(e) => updateContent({ heroTitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Tagline / Deskripsi
                </label>
                <textarea
                  rows={2}
                  value={c.heroSubtitle ?? ''}
                  onChange={(e) => updateContent({ heroSubtitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Rating
                  </label>
                  <input
                    type="text"
                    value={c.heroRating ?? ''}
                    placeholder="4.9"
                    onChange={(e) => updateContent({ heroRating: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Jam Buka
                  </label>
                  <input
                    type="text"
                    value={c.heroHours ?? ''}
                    placeholder="09.00-21.00 WIB"
                    onChange={(e) => updateContent({ heroHours: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Lokasi / Alamat
                </label>
                <input
                  type="text"
                  value={c.heroLocation ?? ''}
                  onChange={(e) => updateContent({ heroLocation: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                />
              </div>
            </div>
          </div>
        );
      }

      case 'fnb_catalog':
        return (
          <div>
            <label className="block text-xs font-semibold text-[#17243D] mb-1">
              Nama Toko / Warung F&amp;B
            </label>
            <input
              type="text"
              value={c.catalogStoreName ?? 'Warung Barokah'}
              onChange={(e) => updateContent({ catalogStoreName: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
            />
          </div>
        );

      case 'training_catalog':
        return (
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1">
                Nama Pelatihan
              </label>
              <input
                type="text"
                value={c.trainingHeading ?? ''}
                placeholder="Diksar Satpam Gada Pratama"
                onChange={(e) => updateContent({ trainingHeading: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Angkatan
                </label>
                <input
                  type="text"
                  value={c.trainingBatch ?? ''}
                  placeholder="Angkatan 200"
                  onChange={(e) => updateContent({ trainingBatch: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Jadwal
                </label>
                <input
                  type="text"
                  value={c.trainingSchedule ?? ''}
                  placeholder="17 - 24 Agustus 2026"
                  onChange={(e) => updateContent({ trainingSchedule: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Deskripsi Singkat
              </label>
              <textarea
                rows={2}
                value={c.trainingSubheading ?? ''}
                placeholder="Deskripsi singkat pelatihan..."
                onChange={(e) => updateContent({ trainingSubheading: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
              />
            </div>
          </div>
        );

      case 'social_feed': {
        const platform = c.socialFeedPlatform ?? 'instagram';
        const meta = SOCIAL_PLATFORMS[platform] ?? SOCIAL_PLATFORMS.instagram;
        return (
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1">
                Platform Sosial Media
              </label>
              <select
                value={platform}
                onChange={(e) => {
                  const nextPlat = e.target.value as SocialPlatform;
                  const nextMeta = SOCIAL_PLATFORMS[nextPlat];
                  const curLabel = platform === 'youtube' ? 'Subscriber' : 'Follower';
                  const nxtLabel = nextPlat === 'youtube' ? 'Subscriber' : 'Follower';
                  updateContent({
                    socialFeedPlatform: nextPlat,
                    socialFeedAccountUrl:
                      !c.socialFeedAccountUrl || c.socialFeedAccountUrl === meta.placeholderUrl
                        ? nextMeta.placeholderUrl
                        : c.socialFeedAccountUrl,
                    socialFeedFollowersLabel:
                      !c.socialFeedFollowersLabel || c.socialFeedFollowersLabel === curLabel
                        ? nxtLabel
                        : c.socialFeedFollowersLabel,
                  });
                }}
                className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
              >
                {SOCIAL_PLATFORM_LIST.map((plat) => (
                  <option key={plat.id} value={plat.id}>
                    {plat.label}
                  </option>
                ))}
              </select>
            </div>
            <MediaSourceInput
              label="Foto Profil Akun"
              value={c.socialFeedAvatar ?? ''}
              placeholder="URL Foto Profil (opsional)"
              onChangeUrl={(url) => updateContent({ socialFeedAvatar: url })}
              onUploadFile={(f) =>
                handleCompressAndSet(f, { maxDimension: 480, quality: 0.84 }, (blk, url) => ({
                  ...blk,
                  content: { ...blk.content, socialFeedAvatar: url },
                }))
              }
              onClear={
                c.socialFeedAvatar ? () => updateContent({ socialFeedAvatar: '' }) : undefined
              }
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Nama Akun
                </label>
                <input
                  type="text"
                  value={c.socialFeedAccountName ?? ''}
                  placeholder="Studio Kreatif"
                  onChange={(e) => updateContent({ socialFeedAccountName: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Username / Handle
                </label>
                <input
                  type="text"
                  value={c.socialFeedHandle ?? ''}
                  placeholder="@studiokreatif"
                  onChange={(e) => updateContent({ socialFeedHandle: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Bio Singkat Akun (Opsional)
              </label>
              <textarea
                rows={2}
                value={c.socialFeedBio ?? ''}
                placeholder="Kosongkan jika tidak ingin menampilkan bio..."
                onChange={(e) => updateContent({ socialFeedBio: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
              />
            </div>
          </div>
        );
      }

      case 'maps_place':
        return (
          <div className="space-y-2.5">
            <MediaSourceInput
              label="Foto Lokasi Maps"
              value={c.mapsPhotoUrl ?? ''}
              previewFallback={MAPS_LOCATION_SVG}
              onChangeUrl={(url) =>
                updateContent({ mapsPhotoUrl: url || MAPS_LOCATION_SVG })
              }
              onUploadFile={(f) =>
                handleCompressAndSet(f, { maxDimension: 1080, quality: 0.82 }, (blk, url) => ({
                  ...blk,
                  content: { ...blk.content, mapsPhotoUrl: url },
                }))
              }
            />
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Badge Foto (opsional)
              </label>
              <input
                type="text"
                value={c.mapsPhotoBadgeLabel ?? 'Lihat foto'}
                placeholder="Lihat foto"
                onChange={(e) => updateContent({ mapsPhotoBadgeLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Nama Tempat / Lokasi
              </label>
              <input
                type="text"
                value={c.mapsTitle ?? ''}
                placeholder="Lokasi Usaha"
                onChange={(e) => updateContent({ mapsTitle: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Rating (0–5)
                </label>
                <input
                  type="number"
                  min={0}
                  max={5}
                  step={0.1}
                  value={c.mapsRating ?? 4.9}
                  onChange={(e) => {
                    const val = parseFloat(e.target.value);
                    updateContent({
                      mapsRating: Number.isFinite(val) ? Math.max(0, Math.min(5, val)) : 0,
                    });
                  }}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Jumlah Ulasan
                </label>
                <input
                  type="text"
                  value={c.mapsReviewCount ?? ''}
                  placeholder="1.643"
                  onChange={(e) => updateContent({ mapsReviewCount: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none tabular-nums"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Kategori / Layanan Utama
              </label>
              <input
                type="text"
                value={c.mapsService ?? ''}
                onChange={(e) => updateContent({ mapsService: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#17243D]">
                Ikon Aksesibilitas (Kursi Roda)
              </span>
              <ToggleSwitch
                checked={c.mapsAccessible ?? true}
                onChange={(next) => updateContent({ mapsAccessible: next })}
                label="Ikon Aksesibilitas"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Layanan Tambahan (pisah koma)
              </label>
              <input
                type="text"
                value={c.mapsServicesList ?? ''}
                placeholder="Parkir Luas, WiFi Gratis"
                onChange={(e) => updateContent({ mapsServicesList: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Alamat / Jam Operasional
              </label>
              <input
                type="text"
                value={c.mapsAddress ?? ''}
                placeholder="Jl. Merdeka No. 10 · 08.00–17.00"
                onChange={(e) => updateContent({ mapsAddress: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none"
              />
            </div>
          </div>
        );

      case 'button':
        return (
          <div>
            <label className="block text-xs font-semibold text-[#17243D] mb-1">
              {label('konten.field.teksTombol', 'Teks Tombol')}
            </label>
            <input
              type="text"
              value={c.label ?? ''}
              onChange={(e) => updateContent({ label: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
            />
          </div>
        );

      case 'form':
        return (
          <div>
            <label className="block text-xs font-semibold text-[#17243D] mb-1">
              {label('konten.field.judulForm', 'Judul Form')}
            </label>
            <input
              type="text"
              value={c.formTitle ?? ''}
              onChange={(e) => updateContent({ formTitle: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
            />
          </div>
        );

      case 'youtube':
      case 'facebook_video':
      case 'tiktok_video':
      case 'instagram_video': {
        const isYt = selectedBlock.type === 'youtube';
        const isFb = selectedBlock.type === 'facebook_video';
        const isIg = selectedBlock.type === 'instagram_video';
        const currentUrl = isYt ? c.youtubeUrl ?? '' : c.videoUrl ?? '';
        return (
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1">
                {isYt
                  ? 'URL Video YouTube'
                  : isFb
                  ? 'URL Video Facebook'
                  : isIg
                  ? 'URL Video / Reels Instagram'
                  : 'URL Video TikTok'}
              </label>
              <input
                type="url"
                value={currentUrl}
                placeholder="https://..."
                onChange={(e) =>
                  updateContent(
                    isYt ? { youtubeUrl: e.target.value } : { videoUrl: e.target.value }
                  )
                }
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
              />
            </div>
            {!isYt && (
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  URL Gambar Sampul (Opsional)
                </label>
                <input
                  type="url"
                  value={c.videoPoster ?? ''}
                  placeholder="https://..."
                  onChange={(e) => updateContent({ videoPoster: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                />
              </div>
            )}
          </div>
        );
      }

      default:
        return (
          <SectionEmptyNote message="Komponen ini tidak memiliki teks utama tunggal. Kelola item atau elemen di bagian Data & Daftar Item di bawah." />
        );
    }
  };

  // --- 3. DATA & DAFTAR ITEM (MULTI-ITEM DRILL-DOWN) ---
  const renderDrillHeader = (
    title: string,
    onDeleteSelected?: () => void,
    deleteDisabled?: boolean
  ) => (
    <div className="sticky top-0 z-10 -mx-3.5 px-3.5 py-2 mb-2.5 bg-[#F0F5FA] border-y border-[#DCE5EF] flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={() => setEditingItemKey(null)}
        className="inline-flex items-center gap-1.5 text-xs font-bold text-[#17243D] hover:text-[#00C98A] cursor-pointer shrink-0"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        <span>Kembali ke Daftar</span>
      </button>
      <div className="flex items-center gap-1.5 min-w-0">
        <span className="text-[11px] font-semibold text-[#8FA4BF] truncate max-w-[110px]">
          {title}
        </span>
        {onDeleteSelected && (
          <button
            type="button"
            disabled={deleteDisabled}
            onClick={() => {
              if (deleteDisabled) return;
              onDeleteSelected();
              setEditingItemKey(null);
            }}
            title="Hapus item ini"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md border border-red-200 bg-white text-red-600 hover:bg-red-50 disabled:opacity-35 disabled:pointer-events-none text-[11px] font-semibold cursor-pointer shrink-0 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            <span>Hapus</span>
          </button>
        )}
      </div>
    </div>
  );

  const renderDataItemsSection = (): { badge?: string | number; body: React.ReactNode } => {
    // --- CATALOG ---
    if (selectedBlock.type === 'catalog') {
      const items = c.catalogItems ?? [];
      const cartEnabled = c.catalogCartEnabled ?? true;
      const rawProductType = c.catalogProductType ?? 'physical';
      const normalizedProductType: 'physical' | 'digital' = isDigitalProductType(rawProductType)
        ? 'digital'
        : 'physical';
      const customerFields = resolveCatalogCustomerFields(c);
      const shippingOpts = resolveCatalogShippingOptions(c);

      const updateCatalogItem = (itemId: string, patch: Partial<CatalogItem>) => {
        updateContent({
          catalogItems: items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
        });
      };

      // Drill-down: Product detail
      if (editingItemKey?.startsWith('catalog:')) {
        const targetId = editingItemKey.slice('catalog:'.length);
        const item = items.find((it) => it.id === targetId);
        if (!item) {
          return {
            badge: items.length,
            body: (
              <div className="space-y-2">
                {renderDrillHeader('Produk')}
                <SectionEmptyNote message="Item produk tidak ditemukan." />
              </div>
            ),
          };
        }
        const isPhys =
          item.productType === 'physical' ||
          ((!item.productType || item.productType === 'inherit') &&
            normalizedProductType === 'physical');
        return {
          badge: items.length,
          body: (
            <div className="space-y-3">
              {renderDrillHeader(item.title || 'Detail Produk', () =>
                updateContent({
                  catalogItems: removeSelectedItemByIdOrIndex(items, item.id),
                })
              )}
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Nama Produk
                </label>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateCatalogItem(item.id, { title: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Ringkasan
                </label>
                <input
                  type="text"
                  value={item.subtitle}
                  onChange={(e) => updateCatalogItem(item.id, { subtitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Harga
                  </label>
                  <input
                    type="text"
                    value={item.price}
                    onChange={(e) => updateCatalogItem(item.id, { price: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Terjual
                  </label>
                  <input
                    type="number"
                    min={0}
                    value={item.unitSold}
                    onChange={(e) =>
                      updateCatalogItem(item.id, {
                        unitSold: Math.max(0, Number(e.target.value)),
                      })
                    }
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white tabular-nums"
                  />
                </div>
              </div>

              <MediaSourceInput
                label="Foto Utama Produk"
                value={item.image}
                previewFallback={PRODUCT_CARD_SVG}
                onChangeUrl={(url) =>
                  updateCatalogItem(item.id, { image: url || PRODUCT_CARD_SVG })
                }
                onUploadFile={(f) =>
                  handleCompressAndSet(f, { maxDimension: 1080, quality: 0.82 }, (blk, url) => ({
                    ...blk,
                    content: {
                      ...blk.content,
                      catalogItems: (blk.content.catalogItems ?? []).map((it) =>
                        it.id === item.id ? { ...it, image: url } : it
                      ),
                    },
                  }))
                }
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[#17243D] mb-1">
                    Rasio Foto
                  </label>
                  <select
                    value={item.imageAspectRatio ?? 'auto'}
                    onChange={(e) =>
                      updateCatalogItem(item.id, {
                        imageAspectRatio: e.target.value as 'auto' | '16/9' | '4/3' | '1/1',
                      })
                    }
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                  >
                    <option value="auto">Otomatis</option>
                    <option value="16/9">16:9</option>
                    <option value="4/3">4:3</option>
                    <option value="1/1">1:1 Kotak</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#17243D] mb-1">
                    Tampilan Foto
                  </label>
                  <select
                    value={item.imageObjectFit ?? 'cover'}
                    onChange={(e) =>
                      updateCatalogItem(item.id, {
                        imageObjectFit: e.target.value as 'cover' | 'contain',
                      })
                    }
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                  >
                    <option value="cover">Penuh</option>
                    <option value="contain">Utuh</option>
                  </select>
                </div>
              </div>

              <div className="p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#17243D]">
                    Galeri Foto ({(item.gallery ?? []).length})
                  </span>
                  <label className="inline-flex items-center gap-1 text-[11px] font-bold text-[#00C98A] cursor-pointer">
                    <Plus className="w-3 h-3" />
                    <span>Tambah Foto</span>
                    <input
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        e.target.value = '';
                        if (file) {
                          handleCompressAndSet(
                            file,
                            { maxDimension: 1080, quality: 0.82 },
                            (blk, url) => ({
                              ...blk,
                              content: {
                                ...blk.content,
                                catalogItems: (blk.content.catalogItems ?? []).map((it) =>
                                  it.id === item.id
                                    ? { ...it, gallery: [...(it.gallery ?? []), url] }
                                    : it
                                ),
                              },
                            })
                          );
                        }
                      }}
                    />
                  </label>
                </div>
                {(item.gallery ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-1.5">
                    {(item.gallery ?? []).map((gSrc, gIdx) => (
                      <div
                        key={`${item.id}_gal_${gIdx}`}
                        className="relative w-10 h-10 rounded-lg border border-[#DCE5EF] bg-white overflow-hidden"
                      >
                        <img
                          src={gSrc}
                          alt={`Galeri ${gIdx + 1}`}
                          className="w-full h-full object-cover"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateCatalogItem(item.id, {
                              gallery: (item.gallery ?? []).filter((_, i) => i !== gIdx),
                            })
                          }
                          className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-[#17243D]/80 text-white flex items-center justify-center hover:bg-red-600 cursor-pointer"
                        >
                          <X className="w-2.5 h-2.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[#17243D] mb-1">
                    Teks Tombol
                  </label>
                  <input
                    type="text"
                    value={item.ctaLabel}
                    onChange={(e) => updateCatalogItem(item.id, { ctaLabel: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#17243D] mb-1">
                    Link Tujuan
                  </label>
                  <input
                    type="url"
                    value={item.url}
                    onChange={(e) => updateCatalogItem(item.id, { url: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#17243D] mb-1">
                    Badge
                  </label>
                  <input
                    type="text"
                    value={item.badge ?? ''}
                    placeholder="Promo"
                    onChange={(e) => updateCatalogItem(item.id, { badge: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#17243D] mb-1">
                    Varian
                  </label>
                  <input
                    type="text"
                    value={item.variants ?? ''}
                    placeholder="Reguler, VIP"
                    onChange={(e) => updateCatalogItem(item.id, { variants: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-medium text-[#17243D] mb-1">
                  Deskripsi Detail
                </label>
                <textarea
                  rows={3}
                  value={item.description ?? ''}
                  onChange={(e) => updateCatalogItem(item.id, { description: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white resize-y"
                />
              </div>

              {cartEnabled && (
                <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                      Jenis Produk
                    </label>
                    <select
                      value={item.productType ?? 'inherit'}
                      onChange={(e) =>
                        updateCatalogItem(item.id, {
                          productType: e.target.value as 'inherit' | CatalogProductType,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                    >
                      <option value="inherit">
                        Ikuti Katalog ({normalizedProductType === 'digital' ? 'Digital' : 'Fisik'})
                      </option>
                      <option value="physical">Produk Fisik</option>
                      <option value="digital">Produk Digital</option>
                    </select>
                  </div>
                  {isPhys && (
                    <div>
                      <label className="block text-[11px] font-medium text-[#17243D] mb-1">
                        Catatan Ambil di Lokasi
                      </label>
                      <input
                        type="text"
                        value={item.pickupNote ?? ''}
                        placeholder="Misal: Masak ± 30 menit"
                        onChange={(e) => updateCatalogItem(item.id, { pickupNote: e.target.value })}
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          ),
        };
      }

      // Drill-down: Shipping Option detail
      if (editingItemKey?.startsWith('shipping:')) {
        const optId = editingItemKey.slice('shipping:'.length) as ShippingMethodId;
        const opt = shippingOpts.find((o) => o.id === optId);
        if (!opt) {
          return { badge: items.length, body: renderDrillHeader('Opsi Pengiriman') };
        }
        const updateOpt = (patch: Partial<CatalogShippingOptionConfig>) => {
          updateContent({
            catalogShippingOptions: shippingOpts.map((o) =>
              o.id === opt.id ? { ...o, ...patch } : o
            ),
          });
        };
        const currentChecklistItems = resolveShippingOptionChecklistItems(opt);
        const saveChecklists = (nextList: string[]) => {
          updateOpt({
            checklistItems: nextList,
            checklistText: nextList.join('\n'),
          });
        };
        return {
          badge: items.length,
          body: (
            <div className="space-y-3">
              {renderDrillHeader(opt.label)}
              <div className="flex items-center justify-between p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
                <span className="text-xs font-bold text-[#17243D]">Aktifkan Pilihan Ini</span>
                <ToggleSwitch
                  checked={opt.enabled !== false}
                  onChange={(checked) => updateOpt({ enabled: checked })}
                  label={`Aktifkan ${opt.label}`}
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Nama Pilihan
                </label>
                <input
                  type="text"
                  value={opt.label}
                  onChange={(e) => updateOpt({ label: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
              <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#17243D]">
                    Tambahkan Waktu / Jam
                  </span>
                  <ToggleSwitch
                    checked={Boolean(opt.askArrivalTime)}
                    onChange={(checked) => updateOpt({ askArrivalTime: checked })}
                    label="Tambahkan input waktu"
                  />
                </div>
                {opt.askArrivalTime && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={opt.arrivalTimeLabel ?? ''}
                      placeholder="Label"
                      onChange={(e) => updateOpt({ arrivalTimeLabel: e.target.value })}
                      className="px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                    />
                    <input
                      type="text"
                      value={opt.arrivalTimePlaceholder ?? ''}
                      placeholder="18:30 WIB"
                      onChange={(e) => updateOpt({ arrivalTimePlaceholder: e.target.value })}
                      className="px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                    />
                  </div>
                )}
              </div>
              <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#17243D]">
                    Tambahkan Jumlah Orang
                  </span>
                  <ToggleSwitch
                    checked={Boolean(opt.askGuestCount)}
                    onChange={(checked) => updateOpt({ askGuestCount: checked })}
                    label="Tambahkan jumlah orang"
                  />
                </div>
                {opt.askGuestCount && (
                  <div className="grid grid-cols-2 gap-1.5">
                    <input
                      type="text"
                      value={opt.guestCountLabel ?? ''}
                      placeholder="Label"
                      onChange={(e) => updateOpt({ guestCountLabel: e.target.value })}
                      className="px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                    />
                    <input
                      type="text"
                      value={opt.guestCountPlaceholder ?? ''}
                      placeholder="4 orang"
                      onChange={(e) => updateOpt({ guestCountPlaceholder: e.target.value })}
                      className="px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                    />
                  </div>
                )}
              </div>
              <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#17243D]">
                    Checklist Konfirmasi ({currentChecklistItems.length})
                  </span>
                  <ToggleSwitch
                    checked={Boolean(opt.checklistEnabled)}
                    onChange={(checked) => updateOpt({ checklistEnabled: checked })}
                    label="Checklist konfirmasi"
                  />
                </div>
                {opt.checklistEnabled && (
                  <div className="space-y-1.5">
                    {currentChecklistItems.map((chkTxt, cIdx) => (
                      <div key={cIdx} className="flex items-start gap-1.5">
                        <textarea
                          rows={2}
                          value={chkTxt}
                          onChange={(e) => {
                            const next = [...currentChecklistItems];
                            next[cIdx] = e.target.value;
                            saveChecklists(next);
                          }}
                          className="flex-1 px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white resize-y"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            saveChecklists(currentChecklistItems.filter((_, i) => i !== cIdx))
                          }
                          className="p-1 text-[#8FA4BF] hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      onClick={() =>
                        saveChecklists([...currentChecklistItems, 'Pernyataan konfirmasi baru'])
                      }
                      className="w-full py-1 rounded border border-dashed border-[#00C98A] text-[11px] font-semibold text-[#17243D] cursor-pointer"
                    >
                      + Tambah Checklist
                    </button>
                  </div>
                )}
              </div>
              <div className="space-y-1.5">
                <input
                  type="text"
                  value={opt.noteTitle ?? 'Catatan:'}
                  placeholder="Judul catatan"
                  onChange={(e) => updateOpt({ noteTitle: e.target.value })}
                  className="w-full px-2 py-1 text-[11px] font-semibold rounded border border-[#DCE5EF] bg-white"
                />
                <textarea
                  rows={2}
                  value={opt.noteText ?? ''}
                  placeholder="Catatan khusus pilihan ini"
                  onChange={(e) => updateOpt({ noteText: e.target.value })}
                  className="w-full px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white resize-y"
                />
              </div>
            </div>
          ),
        };
      }

      // Main List View for Catalog
      return {
        badge: items.length,
        body: (
          <div className="space-y-2.5">
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
              {(
                [
                  { id: 'products', label: `Produk (${items.length})` },
                  { id: 'customer', label: `Pemesan (${customerFields.length})` },
                  { id: 'shipping', label: `Kirim (${shippingOpts.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCatalogSubList(tab.id)}
                  className={`py-1 px-1 rounded text-[10.5px] font-semibold cursor-pointer truncate ${
                    catalogSubList === tab.id
                      ? 'bg-[#17243D] text-white'
                      : 'text-[#8FA4BF] hover:text-[#17243D]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {catalogSubList === 'products' && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextItem: CatalogItem = {
                      id: createId('item'),
                      title: `Produk #${items.length + 1}`,
                      subtitle: 'Deskripsi singkat produk Anda',
                      description: 'Tuliskan detail lengkap produk di sini.',
                      variants: 'Reguler, Paket Lengkap',
                      price: 'Rp 75.000',
                      ctaLabel: 'Lihat Detail',
                      url: 'https://example.com',
                      image: PRODUCT_CARD_SVG,
                      imageAspectRatio: '4/3',
                      imageObjectFit: 'cover',
                      unitSold: 12,
                    };
                    updateContent({ catalogItems: [...items, nextItem] });
                    setEditingItemKey(`catalog:${nextItem.id}`);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#17243D] hover:bg-[#17243D]/90 text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#00C98A]" />
                  <span>Tambah Produk</span>
                </button>

                {items.map((item, idx) => (
                  <div
                    key={item.id}
                    onClick={() => setEditingItemKey(`catalog:${item.id}`)}
                    className="p-2 rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] flex items-center gap-2 cursor-pointer transition-colors"
                  >
                    <div className="w-8 h-8 rounded border border-[#DCE5EF] bg-[#F0F5FA] overflow-hidden shrink-0">
                      <img
                        src={item.image || PRODUCT_CARD_SVG}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-xs font-bold text-[#17243D] truncate">
                        {item.title || `Produk #${idx + 1}`}
                      </div>
                      <div className="text-[10.5px] text-[#8FA4BF] truncate tabular-nums">
                        {item.price || 'Tanpa harga'} · {item.unitSold} terjual
                      </div>
                    </div>
                    <ItemOverflowMenu
                      onEdit={() => setEditingItemKey(`catalog:${item.id}`)}
                      onDuplicate={() => {
                        const dup: CatalogItem = {
                          ...item,
                          id: createId('item'),
                          title: `${item.title} Salinan`,
                        };
                        const copy = [...items];
                        copy.splice(idx + 1, 0, dup);
                        updateContent({ catalogItems: copy });
                      }}
                      onMoveUp={() => updateContent({ catalogItems: moveArrayItem(items, idx, -1) })}
                      onMoveDown={() => updateContent({ catalogItems: moveArrayItem(items, idx, 1) })}
                      disableMoveUp={idx === 0}
                      disableMoveDown={idx === items.length - 1}
                      onDelete={() => {
                        updateContent({
                          catalogItems: removeSelectedItemByIdOrIndex(items, item.id, idx),
                        });
                        if (editingItemKey === `catalog:${item.id}`) setEditingItemKey(null);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {catalogSubList === 'customer' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateContent({
                        catalogCustomerFields: getDefaultCustomerFields(normalizedProductType),
                      })
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8FA4BF] hover:text-[#17243D] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateContent({
                        catalogCustomerFields: [
                          ...customerFields,
                          {
                            id: createId('cf'),
                            label: `Kolom #${customerFields.length + 1}`,
                            placeholder: 'Isi data di sini',
                            type: 'text',
                            required: false,
                          } as CatalogCustomerField,
                        ],
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#17243D] text-white text-[11px] font-semibold cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#00C98A]" />
                    <span>Tambah Kolom</span>
                  </button>
                </div>

                {customerFields.map((field, fIdx) => (
                  <div
                    key={field.id}
                    className="p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) =>
                          updateContent({
                            catalogCustomerFields: customerFields.map((it, i) =>
                              i === fIdx ? { ...it, label: e.target.value } : it
                            ),
                          })
                        }
                        className="flex-1 min-w-0 px-2 py-1 text-[11px] font-semibold rounded border border-[#DCE5EF] bg-white"
                      />
                      <select
                        value={field.type}
                        onChange={(e) =>
                          updateContent({
                            catalogCustomerFields: customerFields.map((it, i) =>
                              i === fIdx
                                ? { ...it, type: e.target.value as CustomFieldInputType }
                                : it
                            ),
                          })
                        }
                        className="px-1.5 py-1 text-[10.5px] rounded border border-[#DCE5EF] bg-white"
                      >
                        <option value="text">Teks</option>
                        <option value="tel">No. WA</option>
                        <option value="email">Email</option>
                        <option value="textarea">Paragraf</option>
                        <option value="number">Angka</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          updateContent({
                            catalogCustomerFields: customerFields.filter((_, i) => i !== fIdx),
                          })
                        }
                        className="p-1 text-[#8FA4BF] hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={field.placeholder}
                      placeholder="Placeholder..."
                      onChange={(e) =>
                        updateContent({
                          catalogCustomerFields: customerFields.map((it, i) =>
                            i === fIdx ? { ...it, placeholder: e.target.value } : it
                          ),
                        })
                      }
                      className="w-full px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                    />
                  </div>
                ))}
              </div>
            )}

            {catalogSubList === 'shipping' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold text-[#8FA4BF]">
                    Klik opsi untuk edit detail
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateContent({
                        catalogShippingOptions: cloneDefaultCatalogShippingOptions(),
                      })
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00C98A] hover:underline cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                </div>
                {shippingOpts.map((opt, idx) => (
                  <div
                    key={opt.id}
                    onClick={() => setEditingItemKey(`shipping:${opt.id}`)}
                    className="p-2 rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className={`w-2 h-2 rounded-full shrink-0 ${
                          opt.enabled !== false ? 'bg-[#00C98A]' : 'bg-[#8FA4BF]'
                        }`}
                      />
                      <span className="text-xs font-semibold text-[#17243D] truncate">
                        {idx + 1}. {opt.label}
                      </span>
                    </div>
                    <ItemOverflowMenu
                      onEdit={() => setEditingItemKey(`shipping:${opt.id}`)}
                      editLabel="Atur Opsi"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ),
      };
    }

    // --- FNB CATALOG ---
    if (selectedBlock.type === 'fnb_catalog') {
      const items = c.fnbItems ?? [];
      const updateFnbItem = (id: string, patch: Partial<FnbMenuItem>) => {
        updateContent({
          fnbItems: items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
        });
      };

      if (editingItemKey?.startsWith('fnb:')) {
        const targetId = editingItemKey.slice('fnb:'.length);
        const item = items.find((it) => it.id === targetId);
        if (!item) return { badge: items.length, body: renderDrillHeader('Menu F&B') };
        return {
          badge: items.length,
          body: (
            <div className="space-y-2.5">
              {renderDrillHeader(item.title || 'Detail Menu', () =>
                updateContent({
                  fnbItems: removeSelectedItemByIdOrIndex(items, item.id),
                })
              )}
              <MediaSourceInput
                label="Foto Menu (Upload atau URL)"
                value={item.image ?? ''}
                placeholder="https://... (kosongkan pakai inisial)"
                onChangeUrl={(url) => updateFnbItem(item.id, { image: url })}
                onUploadFile={(f) =>
                  handleCompressAndSet(f, { maxDimension: 640, quality: 0.84 }, (blk, url) => ({
                    ...blk,
                    content: {
                      ...blk.content,
                      fnbItems: (blk.content.fnbItems ?? []).map((it) =>
                        it.id === item.id ? { ...it, image: url } : it
                      ),
                    },
                  }))
                }
                onClear={item.image ? () => updateFnbItem(item.id, { image: '' }) : undefined}
              />
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Nama Menu
                  </label>
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => updateFnbItem(item.id, { title: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Harga
                  </label>
                  <input
                    type="text"
                    value={item.price}
                    onChange={(e) => updateFnbItem(item.id, { price: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Kategori
                  </label>
                  <input
                    type="text"
                    value={item.category}
                    onChange={(e) => updateFnbItem(item.id, { category: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Badge
                  </label>
                  <input
                    type="text"
                    value={item.badge ?? ''}
                    placeholder="Best seller"
                    onChange={(e) => updateFnbItem(item.id, { badge: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                  />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Deskripsi Singkat
                </label>
                <textarea
                  rows={2}
                  value={item.description}
                  onChange={(e) => updateFnbItem(item.id, { description: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
              {!item.image && (
                <div className="grid grid-cols-3 gap-1.5 pt-1">
                  <input
                    type="text"
                    maxLength={2}
                    value={item.monogram ?? ''}
                    placeholder="Inisial"
                    onChange={(e) => updateFnbItem(item.id, { monogram: e.target.value })}
                    className="px-2 py-1 text-xs rounded border border-[#DCE5EF] uppercase bg-white"
                  />
                  <input
                    type="color"
                    value={item.monogramBg ?? '#FFEDD5'}
                    onChange={(e) => updateFnbItem(item.id, { monogramBg: e.target.value })}
                    className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                  />
                  <input
                    type="color"
                    value={item.monogramColor ?? '#C2410C'}
                    onChange={(e) => updateFnbItem(item.id, { monogramColor: e.target.value })}
                    className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                  />
                </div>
              )}
            </div>
          ),
        };
      }

      return {
        badge: items.length,
        body: (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                const nextItem: FnbMenuItem = {
                  id: createId('fnb'),
                  title: `Menu Baru ${items.length + 1}`,
                  description: 'Deskripsi singkat menu pilihan.',
                  category: 'Makanan',
                  badge: '',
                  price: 'Rp 25.000',
                  image: '',
                  monogram: 'MN',
                  monogramBg: '#FFEDD5',
                  monogramColor: '#C2410C',
                };
                updateContent({ fnbItems: [...items, nextItem] });
                setEditingItemKey(`fnb:${nextItem.id}`);
              }}
              className="w-full inline-flex items-center justify-center gap-1.5 py-1.5 px-3 rounded-lg bg-[#17243D] text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#00C98A]" />
              <span>Tambah Menu</span>
            </button>

            {items.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => setEditingItemKey(`fnb:${item.id}`)}
                className="p-2 rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] flex items-center gap-2 cursor-pointer"
              >
                <div
                  style={{
                    backgroundColor: item.image ? '#FFFFFF' : item.monogramBg ?? '#FFEDD5',
                    color: item.monogramColor ?? '#C2410C',
                  }}
                  className="w-8 h-8 rounded border border-[#DCE5EF] overflow-hidden shrink-0 flex items-center justify-center text-[11px] font-bold"
                >
                  {item.image ? (
                    <img src={item.image} alt={item.title} className="w-full h-full object-cover" />
                  ) : (
                    <span>{(item.monogram || item.title.slice(0, 2)).toUpperCase()}</span>
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#17243D] truncate">{item.title}</div>
                  <div className="text-[10.5px] text-[#8FA4BF] truncate tabular-nums">
                    {item.category} · {item.price}
                  </div>
                </div>
                <ItemOverflowMenu
                  onEdit={() => setEditingItemKey(`fnb:${item.id}`)}
                  onDuplicate={() => {
                    const dup: FnbMenuItem = {
                      ...item,
                      id: createId('fnb'),
                      title: `${item.title} Salinan`,
                    };
                    const copy = [...items];
                    copy.splice(idx + 1, 0, dup);
                    updateContent({ fnbItems: copy });
                  }}
                  onMoveUp={() => updateContent({ fnbItems: moveArrayItem(items, idx, -1) })}
                  onMoveDown={() => updateContent({ fnbItems: moveArrayItem(items, idx, 1) })}
                  disableMoveUp={idx === 0}
                  disableMoveDown={idx === items.length - 1}
                  onDelete={() => {
                    updateContent({
                      fnbItems: removeSelectedItemByIdOrIndex(items, item.id, idx),
                    });
                    if (editingItemKey === `fnb:${item.id}`) setEditingItemKey(null);
                  }}
                />
              </div>
            ))}
          </div>
        ),
      };
    }

    // --- TRAINING CATALOG ---
    if (selectedBlock.type === 'training_catalog') {
      const programs = c.trainingPrograms ?? [];
      const customBoxes = c.trainingCustomBoxes ?? [];
      const mediaList = c.trainingMedia ?? [];
      const checklistItems = c.trainingChecklistItems ?? [];
      const formFields = resolveTrainingFormFields(c);

      const updateProgram = (id: string, patch: Partial<TrainingProgramItem>) =>
        updateContent({
          trainingPrograms: programs.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        });
      const updateCustomBox = (id: string, patch: Partial<TrainingCustomBox>) =>
        updateContent({
          trainingCustomBoxes: customBoxes.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        });
      const updateMedia = (id: string, patch: Partial<TrainingMediaItem>) =>
        updateContent({
          trainingMedia: mediaList.map((m) => (m.id === id ? { ...m, ...patch } : m)),
        });

      if (editingItemKey?.startsWith('tr_prog:')) {
        const id = editingItemKey.slice('tr_prog:'.length);
        const prog = programs.find((p) => p.id === id);
        if (!prog) return { badge: programs.length, body: renderDrillHeader('Program') };
        return {
          badge: programs.length,
          body: (
            <div className="space-y-2.5">
              {renderDrillHeader(
                prog.title || 'Program',
                () =>
                  updateContent({
                    trainingPrograms: removeSelectedItemByIdOrIndex(programs, prog.id),
                  }),
                programs.length <= 1
              )}
              <input
                type="text"
                value={prog.title}
                placeholder="Nama program"
                onChange={(e) => updateProgram(prog.id, { title: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[#DCE5EF] bg-white"
              />
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={prog.badge ?? ''}
                  placeholder="Badge"
                  onChange={(e) => updateProgram(prog.id, { badge: e.target.value })}
                  className="px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                />
                <input
                  type="text"
                  value={prog.subtitle ?? ''}
                  placeholder="Sub-judul"
                  onChange={(e) => updateProgram(prog.id, { subtitle: e.target.value })}
                  className="px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                />
              </div>
              <RichTextEditor
                value={prog.description}
                placeholder="Deskripsi lengkap program..."
                onChangeHtml={(html) => updateProgram(prog.id, { description: html })}
                showStyleControls={false}
              />
              <div className="grid grid-cols-2 gap-1.5">
                <input
                  type="text"
                  value={prog.originalPrice ?? ''}
                  placeholder="Harga Coret"
                  onChange={(e) => updateProgram(prog.id, { originalPrice: e.target.value })}
                  className="px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white tabular-nums"
                />
                <input
                  type="text"
                  value={prog.price}
                  placeholder="Biaya Pelatihan"
                  onChange={(e) => updateProgram(prog.id, { price: e.target.value })}
                  className="px-2 py-1 text-[11px] font-semibold rounded border border-[#DCE5EF] bg-white tabular-nums"
                />
                <input
                  type="text"
                  value={prog.discountLabel ?? ''}
                  placeholder="Potongan"
                  onChange={(e) => updateProgram(prog.id, { discountLabel: e.target.value })}
                  className="px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                />
                <input
                  type="text"
                  value={prog.cashbackLabel ?? ''}
                  placeholder="Cashback"
                  onChange={(e) => updateProgram(prog.id, { cashbackLabel: e.target.value })}
                  className="px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                />
              </div>
            </div>
          ),
        };
      }

      if (editingItemKey?.startsWith('tr_box:')) {
        const id = editingItemKey.slice('tr_box:'.length);
        const box = customBoxes.find((b) => b.id === id);
        if (!box) return { badge: programs.length, body: renderDrillHeader('Box Konten') };
        return {
          badge: programs.length,
          body: (
            <div className="space-y-2.5">
              {renderDrillHeader(box.title || 'Box Konten', () =>
                updateContent({
                  trainingCustomBoxes: removeSelectedItemByIdOrIndex(customBoxes, box.id),
                })
              )}
              <label className="inline-flex items-center gap-2 text-xs font-medium text-[#17243D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={box.showBorder !== false}
                  onChange={(e) => updateCustomBox(box.id, { showBorder: e.target.checked })}
                  className="accent-[#00C98A]"
                />
                <span>Tampilkan Bingkai Kotak</span>
              </label>
              <input
                type="text"
                value={box.title ?? ''}
                placeholder="Judul Box (opsional)"
                onChange={(e) => updateCustomBox(box.id, { title: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[#DCE5EF] bg-white"
              />
              <RichTextEditor
                value={box.contentHtml}
                placeholder="Tulis isi box..."
                defaultFontWeight={box.defaultFontWeight ?? 'normal'}
                defaultFontStyle={box.defaultFontStyle ?? 'normal'}
                textColor={box.textColor ?? ''}
                lineHeight={box.lineHeight ?? 1.6}
                paragraphGap={box.paragraphGap ?? 6}
                onChangeHtml={(html) => updateCustomBox(box.id, { contentHtml: html })}
                onChangeStyle={(patch) => updateCustomBox(box.id, patch)}
                showStyleControls
              />
            </div>
          ),
        };
      }

      if (editingItemKey?.startsWith('tr_media:')) {
        const id = editingItemKey.slice('tr_media:'.length);
        const media = mediaList.find((m) => m.id === id);
        if (!media) return { badge: programs.length, body: renderDrillHeader('Foto') };
        return {
          badge: programs.length,
          body: (
            <div className="space-y-2.5">
              {renderDrillHeader('Foto Pelatihan', () =>
                updateContent({
                  trainingMedia: removeSelectedItemByIdOrIndex(mediaList, media.id),
                })
              )}
              <MediaSourceInput
                label="Foto Dokumentasi"
                value={media.imageUrl}
                onChangeUrl={(url) => updateMedia(media.id, { imageUrl: url })}
                onUploadFile={(f) =>
                  handleCompressAndSet(f, { maxDimension: 1080, quality: 0.82 }, (blk, url) => ({
                    ...blk,
                    content: {
                      ...blk.content,
                      trainingMedia: (blk.content.trainingMedia ?? []).map((m) =>
                        m.id === media.id ? { ...m, imageUrl: url } : m
                      ),
                    },
                  }))
                }
              />
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Keterangan Foto
                </label>
                <input
                  type="text"
                  value={media.caption}
                  onChange={(e) => updateMedia(media.id, { caption: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
            </div>
          ),
        };
      }

      return {
        badge: programs.length,
        body: (
          <div className="space-y-2.5">
            <div className="flex flex-wrap gap-1 p-1 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
              {(
                [
                  { id: 'programs', label: `Program (${programs.length})` },
                  { id: 'boxes', label: `Box (${customBoxes.length})` },
                  { id: 'media', label: `Foto (${mediaList.length})` },
                  { id: 'checklist', label: `Berkas (${checklistItems.length})` },
                  { id: 'form', label: `Form (${formFields.length})` },
                ] as const
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setTrainingSubList(t.id)}
                  className={`px-2 py-1 rounded text-[10.5px] font-semibold cursor-pointer ${
                    trainingSubList === t.id
                      ? 'bg-[#17243D] text-white'
                      : 'text-[#8FA4BF] hover:text-[#17243D]'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {trainingSubList === 'programs' && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextProg: TrainingProgramItem = {
                      id: createId('trp'),
                      badge: 'Program Baru',
                      title: `Program Pelatihan #${programs.length + 1}`,
                      subtitle: 'Penjelasan singkat program',
                      description: '<div>Tuliskan deskripsi lengkap, materi, dan fasilitas.</div>',
                      originalPrice: 'Rp 1.500.000',
                      price: 'Rp 1.150.000',
                      discountLabel: 'Potongan Rp 350.000',
                      cashbackLabel: 'Cashback Rp 100.000',
                    };
                    updateContent({ trainingPrograms: [...programs, nextProg] });
                    setEditingItemKey(`tr_prog:${nextProg.id}`);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#17243D] text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#00C98A]" />
                  <span>Tambah Program</span>
                </button>
                {programs.map((prog, idx) => (
                  <div
                    key={prog.id}
                    onClick={() => setEditingItemKey(`tr_prog:${prog.id}`)}
                    className="p-2 rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#17243D] truncate">{prog.title}</div>
                      <div className="text-[10.5px] text-[#8FA4BF] truncate tabular-nums">
                        {prog.price}
                      </div>
                    </div>
                    <ItemOverflowMenu
                      onEdit={() => setEditingItemKey(`tr_prog:${prog.id}`)}
                      onMoveUp={() =>
                        updateContent({ trainingPrograms: moveArrayItem(programs, idx, -1) })
                      }
                      onMoveDown={() =>
                        updateContent({ trainingPrograms: moveArrayItem(programs, idx, 1) })
                      }
                      disableMoveUp={idx === 0}
                      disableMoveDown={idx === programs.length - 1}
                      disableDelete={programs.length <= 1}
                      onDelete={() => {
                        updateContent({
                          trainingPrograms: removeSelectedItemByIdOrIndex(programs, prog.id, idx),
                        });
                        if (editingItemKey === `tr_prog:${prog.id}`) setEditingItemKey(null);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {trainingSubList === 'boxes' && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextBox: TrainingCustomBox = {
                      id: createId('trb'),
                      title: `Box Informasi #${customBoxes.length + 1}`,
                      contentHtml: '<div>Tulis informasi materi, fasilitas, atau catatan di sini.</div>',
                      defaultFontWeight: 'normal',
                      defaultFontStyle: 'normal',
                      textColor: '',
                      lineHeight: 1.6,
                      paragraphGap: 6,
                      showBorder: true,
                    };
                    updateContent({ trainingCustomBoxes: [...customBoxes, nextBox] });
                    setEditingItemKey(`tr_box:${nextBox.id}`);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#17243D] text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#00C98A]" />
                  <span>Tambah Box Deskripsi</span>
                </button>
                {customBoxes.map((box, idx) => (
                  <div
                    key={box.id}
                    onClick={() => setEditingItemKey(`tr_box:${box.id}`)}
                    className="p-2 rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#17243D] truncate">
                        {box.title || `Box #${idx + 1}`}
                      </div>
                      <div className="text-[10.5px] text-[#8FA4BF]">
                        {box.showBorder !== false ? 'Dengan Bingkai' : 'Tanpa Bingkai'}
                      </div>
                    </div>
                    <ItemOverflowMenu
                      onEdit={() => setEditingItemKey(`tr_box:${box.id}`)}
                      onMoveUp={() =>
                        updateContent({
                          trainingCustomBoxes: moveArrayItem(customBoxes, idx, -1),
                        })
                      }
                      onMoveDown={() =>
                        updateContent({
                          trainingCustomBoxes: moveArrayItem(customBoxes, idx, 1),
                        })
                      }
                      disableMoveUp={idx === 0}
                      disableMoveDown={idx === customBoxes.length - 1}
                      onDelete={() => {
                        updateContent({
                          trainingCustomBoxes: removeSelectedItemByIdOrIndex(
                            customBoxes,
                            box.id,
                            idx
                          ),
                        });
                        if (editingItemKey === `tr_box:${box.id}`) setEditingItemKey(null);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {trainingSubList === 'media' && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    const nextM: TrainingMediaItem = {
                      id: createId('trm'),
                      type: 'image',
                      imageUrl: CAROUSEL_SAMPLE_1_SVG,
                      caption: 'Dokumentasi kegiatan pelatihan.',
                      linkUrl: '',
                      linkLabel: '',
                    };
                    updateContent({ trainingMedia: [...mediaList, nextM] });
                    setEditingItemKey(`tr_media:${nextM.id}`);
                  }}
                  className="w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#17243D] text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#00C98A]" />
                  <span>Tambah Foto</span>
                </button>
                {mediaList.map((m, idx) => (
                  <div
                    key={m.id}
                    onClick={() => setEditingItemKey(`tr_media:${m.id}`)}
                    className="p-2 rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] flex items-center gap-2 cursor-pointer"
                  >
                    <img
                      src={m.imageUrl}
                      alt={`Foto ${idx + 1}`}
                      className="w-8 h-8 rounded border border-[#DCE5EF] object-cover shrink-0"
                    />
                    <div className="min-w-0 flex-1 text-xs font-semibold text-[#17243D] truncate">
                      {m.caption || `Foto #${idx + 1}`}
                    </div>
                    <ItemOverflowMenu
                      onEdit={() => setEditingItemKey(`tr_media:${m.id}`)}
                      onDelete={() => {
                        updateContent({
                          trainingMedia: removeSelectedItemByIdOrIndex(mediaList, m.id, idx),
                        });
                        if (editingItemKey === `tr_media:${m.id}`) setEditingItemKey(null);
                      }}
                    />
                  </div>
                ))}
              </div>
            )}

            {trainingSubList === 'checklist' && (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() =>
                    updateContent({
                      trainingChecklistItems: [...checklistItems, 'Syarat berkas baru'],
                    })
                  }
                  className="w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#17243D] text-white text-xs font-semibold cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 text-[#00C98A]" />
                  <span>Tambah Berkas</span>
                </button>
                {checklistItems.map((txt, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={txt}
                      onChange={(e) => {
                        const next = [...checklistItems];
                        next[idx] = e.target.value;
                        updateContent({ trainingChecklistItems: next });
                      }}
                      className="flex-1 px-2 py-1 text-xs rounded border border-[#DCE5EF] bg-white"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateContent({
                          trainingChecklistItems: checklistItems.filter((_, i) => i !== idx),
                        })
                      }
                      className="p-1 text-[#8FA4BF] hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {trainingSubList === 'form' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() =>
                      updateContent({ trainingFormFields: getDefaultTrainingFormFields() })
                    }
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#8FA4BF] hover:text-[#17243D] cursor-pointer"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Reset</span>
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateContent({
                        trainingFormFields: [
                          ...formFields,
                          {
                            id: createId('tf'),
                            label: `Kolom #${formFields.length + 1}`,
                            placeholder: 'Isi di sini',
                            type: 'text',
                            required: false,
                          },
                        ],
                      })
                    }
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#17243D] text-white text-[11px] font-semibold cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#00C98A]" />
                    <span>Tambah Kolom</span>
                  </button>
                </div>
                {formFields.map((field, fIdx) => (
                  <div
                    key={field.id}
                    className="p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-1.5"
                  >
                    <div className="flex items-center gap-1.5">
                      <input
                        type="text"
                        value={field.label}
                        onChange={(e) =>
                          updateContent({
                            trainingFormFields: formFields.map((it, i) =>
                              i === fIdx ? { ...it, label: e.target.value } : it
                            ),
                          })
                        }
                        className="flex-1 min-w-0 px-2 py-1 text-[11px] font-semibold rounded border border-[#DCE5EF] bg-white"
                      />
                      <select
                        value={field.type}
                        onChange={(e) =>
                          updateContent({
                            trainingFormFields: formFields.map((it, i) =>
                              i === fIdx
                                ? { ...it, type: e.target.value as CustomFieldInputType }
                                : it
                            ),
                          })
                        }
                        className="px-1.5 py-1 text-[10.5px] rounded border border-[#DCE5EF] bg-white"
                      >
                        <option value="text">Teks</option>
                        <option value="tel">No. WA</option>
                        <option value="email">Email</option>
                        <option value="textarea">Paragraf</option>
                        <option value="number">Angka</option>
                      </select>
                      <button
                        type="button"
                        onClick={() =>
                          updateContent({
                            trainingFormFields: formFields.filter((_, i) => i !== fIdx),
                          })
                        }
                        className="p-1 text-[#8FA4BF] hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                    <input
                      type="text"
                      value={field.placeholder}
                      onChange={(e) =>
                        updateContent({
                          trainingFormFields: formFields.map((it, i) =>
                            i === fIdx ? { ...it, placeholder: e.target.value } : it
                          ),
                        })
                      }
                      className="w-full px-2 py-1 text-[10.5px] rounded border border-[#DCE5EF] bg-white"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        ),
      };
    }

    // --- CAROUSEL ---
    if (selectedBlock.type === 'carousel') {
      const items = c.carouselItems ?? [];
      const updateSlide = (id: string, patch: Partial<CarouselItem>) =>
        updateContent({
          carouselItems: items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
        });
      const makeSlide = (index: number): CarouselItem => ({
        id: createId('slide'),
        image: SAMPLE_CAROUSEL_IMAGES[index % SAMPLE_CAROUSEL_IMAGES.length],
        title: `Foto #${index + 1}`,
        caption: 'Tambahkan keterangan singkat di bawah foto ini.',
        url: '',
      });
      const setSlideCount = (targetCount: number) => {
        if (Number.isNaN(targetCount)) return;
        const clamped = Math.max(1, Math.min(20, Math.round(targetCount)));
        if (clamped === items.length) return;
        if (clamped < items.length) {
          updateContent({ carouselItems: items.slice(0, clamped) });
        } else {
          const additions: CarouselItem[] = [];
          for (let i = items.length; i < clamped; i++) additions.push(makeSlide(i));
          updateContent({ carouselItems: [...items, ...additions] });
        }
      };

      if (editingItemKey?.startsWith('slide:')) {
        const id = editingItemKey.slice('slide:'.length);
        const idx = items.findIndex((s) => s.id === id);
        const item = items[idx];
        if (!item) return { badge: items.length, body: renderDrillHeader('Foto Carousel') };
        return {
          badge: items.length,
          body: (
            <div className="space-y-2.5">
              {renderDrillHeader(
                item.title || `Foto #${idx + 1}`,
                () =>
                  updateContent({
                    carouselItems: removeSelectedItemByIdOrIndex(items, item.id, idx),
                  }),
                items.length <= 1
              )}
              <MediaSourceInput
                label="Gambar Slide (Upload atau URL)"
                value={item.image}
                previewFallback={CAROUSEL_SAMPLE_1_SVG}
                onChangeUrl={(url) =>
                  updateSlide(item.id, {
                    image: url || SAMPLE_CAROUSEL_IMAGES[idx % SAMPLE_CAROUSEL_IMAGES.length],
                  })
                }
                onUploadFile={(f) =>
                  handleCompressAndSet(f, { maxDimension: 1080, quality: 0.82 }, (blk, url) => ({
                    ...blk,
                    content: {
                      ...blk.content,
                      carouselItems: (blk.content.carouselItems ?? []).map((it) =>
                        it.id === item.id ? { ...it, image: url } : it
                      ),
                    },
                  }))
                }
              />
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Judul Foto
                </label>
                <input
                  type="text"
                  value={item.title}
                  onChange={(e) => updateSlide(item.id, { title: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Keterangan
                </label>
                <textarea
                  rows={2}
                  value={item.caption}
                  onChange={(e) => updateSlide(item.id, { caption: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Link Tujuan (Opsional)
                </label>
                <input
                  type="url"
                  value={item.url ?? ''}
                  placeholder="https://..."
                  onChange={(e) => updateSlide(item.id, { url: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
            </div>
          ),
        };
      }

      return {
        badge: items.length,
        body: (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
              <span className="text-xs font-semibold text-[#17243D]">Jumlah Foto</span>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setSlideCount(items.length - 1)}
                  disabled={items.length <= 1}
                  className="w-6 h-6 rounded border border-[#DCE5EF] bg-white text-xs font-bold cursor-pointer disabled:opacity-40"
                >
                  -
                </button>
                <span className="w-8 text-center text-xs font-bold tabular-nums">
                  {items.length}
                </span>
                <button
                  type="button"
                  onClick={() => setSlideCount(items.length + 1)}
                  disabled={items.length >= 20}
                  className="w-6 h-6 rounded border border-[#DCE5EF] bg-white text-xs font-bold cursor-pointer disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
            <button
              type="button"
              disabled={items.length >= 20}
              onClick={() => {
                const nextSlide = makeSlide(items.length);
                updateContent({ carouselItems: [...items, nextSlide] });
                setEditingItemKey(`slide:${nextSlide.id}`);
              }}
              className="w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#17243D] text-white text-xs font-semibold cursor-pointer disabled:opacity-45"
            >
              <Plus className="w-3.5 h-3.5 text-[#00C98A]" />
              <span>Tambah Slide ({items.length}/20)</span>
            </button>

            {items.map((item, idx) => (
              <div
                key={item.id}
                onClick={() => setEditingItemKey(`slide:${item.id}`)}
                className="p-2 rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] flex items-center gap-2 cursor-pointer"
              >
                <img
                  src={item.image || CAROUSEL_SAMPLE_1_SVG}
                  alt={item.title}
                  className="w-8 h-8 rounded border border-[#DCE5EF] object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#17243D] truncate">
                    {item.title || `Foto #${idx + 1}`}
                  </div>
                  <div className="text-[10.5px] text-[#8FA4BF] truncate">{item.caption}</div>
                </div>
                <ItemOverflowMenu
                  onEdit={() => setEditingItemKey(`slide:${item.id}`)}
                  onMoveUp={() =>
                    updateContent({ carouselItems: moveArrayItem(items, idx, -1) })
                  }
                  onMoveDown={() =>
                    updateContent({ carouselItems: moveArrayItem(items, idx, 1) })
                  }
                  disableMoveUp={idx === 0}
                  disableMoveDown={idx === items.length - 1}
                  disableDelete={items.length <= 1}
                  onDelete={() => {
                    updateContent({
                      carouselItems: removeSelectedItemByIdOrIndex(items, item.id, idx),
                    });
                    if (editingItemKey === `slide:${item.id}`) setEditingItemKey(null);
                  }}
                />
              </div>
            ))}
          </div>
        ),
      };
    }

    // --- SOCIAL LINKS ---
    if (selectedBlock.type === 'social') {
      const items = c.socialItems ?? [];
      const updateSocial = (id: string, patch: Partial<SocialLinkItem>) =>
        updateContent({
          socialItems: items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
        });

      if (editingItemKey?.startsWith('soc:')) {
        const id = editingItemKey.slice('soc:'.length);
        const item = items.find((i) => i.id === id);
        if (!item) return { badge: items.length, body: renderDrillHeader('Ikon Sosmed') };
        const meta = SOCIAL_PLATFORMS[item.platform];
        return {
          badge: items.length,
          body: (
            <div className="space-y-2.5">
              {renderDrillHeader(meta.label, () =>
                updateContent({
                  socialItems: removeSelectedItemByIdOrIndex(items, item.id),
                })
              )}
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Platform
                </label>
                <select
                  value={item.platform}
                  onChange={(e) => {
                    const nextPlat = e.target.value as SocialPlatform;
                    const nextMeta = SOCIAL_PLATFORMS[nextPlat];
                    updateSocial(item.id, {
                      platform: nextPlat,
                      url:
                        !item.url || item.url === meta.placeholderUrl
                          ? nextMeta.placeholderUrl
                          : item.url,
                    });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[#DCE5EF] bg-white"
                >
                  {SOCIAL_PLATFORM_LIST.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  URL Profil
                </label>
                <input
                  type="url"
                  value={item.url}
                  placeholder={meta.placeholderUrl}
                  onChange={(e) => updateSocial(item.id, { url: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#17243D]">Tampilkan Ikon</span>
                <ToggleSwitch
                  checked={item.visible}
                  onChange={(v) => updateSocial(item.id, { visible: v })}
                  label="Tampilkan Ikon"
                />
              </div>
            </div>
          ),
        };
      }

      return {
        badge: items.length,
        body: (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <select
                value={newSocialPlatform}
                onChange={(e) => setNewSocialPlatform(e.target.value as SocialPlatform)}
                className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
              >
                {SOCIAL_PLATFORM_LIST.map((plat) => (
                  <option key={plat.id} value={plat.id}>
                    {plat.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const meta = SOCIAL_PLATFORMS[newSocialPlatform];
                  const next: SocialLinkItem = {
                    id: createId(`soc_${newSocialPlatform}`),
                    platform: newSocialPlatform,
                    url: meta.placeholderUrl,
                    visible: true,
                  };
                  updateContent({ socialItems: [...items, next] });
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#17243D] text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#00C98A]" />
                <span>Tambah</span>
              </button>
            </div>
            {items.map((item, idx) => {
              const meta = SOCIAL_PLATFORMS[item.platform];
              return (
                <div
                  key={item.id}
                  onClick={() => setEditingItemKey(`soc:${item.id}`)}
                  className="p-2 rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] flex items-center gap-2 cursor-pointer"
                >
                  <span
                    style={{ backgroundColor: meta.brandColor }}
                    className="w-7 h-7 rounded-md text-white inline-flex items-center justify-center shrink-0"
                  >
                    <SocialGlyph platform={item.platform} className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[#17243D] truncate">{meta.label}</div>
                    <div className="text-[10.5px] text-[#8FA4BF] truncate">{item.url}</div>
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      updateSocial(item.id, { visible: !item.visible });
                    }}
                    className="p-1 text-[#8FA4BF] hover:text-[#17243D] cursor-pointer"
                    title={item.visible ? 'Sembunyikan' : 'Tampilkan'}
                  >
                    {item.visible ? (
                      <Eye className="w-3.5 h-3.5 text-[#00C98A]" />
                    ) : (
                      <EyeOff className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <ItemOverflowMenu
                    onEdit={() => setEditingItemKey(`soc:${item.id}`)}
                    onMoveUp={() => updateContent({ socialItems: moveArrayItem(items, idx, -1) })}
                    onMoveDown={() => updateContent({ socialItems: moveArrayItem(items, idx, 1) })}
                    disableMoveUp={idx === 0}
                    disableMoveDown={idx === items.length - 1}
                    onDelete={() => {
                      updateContent({
                        socialItems: removeSelectedItemByIdOrIndex(items, item.id, idx),
                      });
                      if (editingItemKey === `soc:${item.id}`) setEditingItemKey(null);
                    }}
                  />
                </div>
              );
            })}
          </div>
        ),
      };
    }

    // --- SOCIAL FOLLOWER ---
    if (selectedBlock.type === 'social_follower') {
      const accounts = c.socialFollowerAccounts ?? [];
      const makeAcc = (platform: SocialPlatform): SocialFollowerAccount => {
        const meta = SOCIAL_PLATFORMS[platform] ?? SOCIAL_PLATFORMS.instagram;
        return {
          id: createId(`sfa_${platform}`),
          platform,
          avatar: '',
          accountName: 'Studio Kreatif Nusantara',
          handle: '@studiokreatif',
          accountUrl: meta.placeholderUrl,
          verified: true,
          postsCount: '128',
          postsLabel: 'Postingan',
          followers: '45,8 rb',
          followersLabel: 'Follower',
          following: '312',
          followingLabel: 'Mengikuti',
          bio: '',
          followLabel: 'Ikuti',
        };
      };
      const updateAcc = (id: string, patch: Partial<SocialFollowerAccount>) =>
        updateContent({
          socialFollowerAccounts: accounts.map((a) => (a.id === id ? { ...a, ...patch } : a)),
        });

      if (editingItemKey?.startsWith('sfa:')) {
        const id = editingItemKey.slice('sfa:'.length);
        const acc = accounts.find((a) => a.id === id);
        if (!acc) return { badge: accounts.length, body: renderDrillHeader('Akun Sosmed') };
        const meta = SOCIAL_PLATFORMS[acc.platform] ?? SOCIAL_PLATFORMS.instagram;
        return {
          badge: accounts.length,
          body: (
            <div className="space-y-2.5">
              {renderDrillHeader(acc.accountName || meta.label, () =>
                updateContent({
                  socialFollowerAccounts: removeSelectedItemByIdOrIndex(accounts, acc.id),
                })
              )}
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Platform
                </label>
                <select
                  value={acc.platform}
                  onChange={(e) => {
                    const nextPlat = e.target.value as SocialPlatform;
                    const nextMeta = SOCIAL_PLATFORMS[nextPlat];
                    updateAcc(acc.id, {
                      platform: nextPlat,
                      accountUrl:
                        !acc.accountUrl || acc.accountUrl === meta.placeholderUrl
                          ? nextMeta.placeholderUrl
                          : acc.accountUrl,
                    });
                  }}
                  className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-[#DCE5EF] bg-white"
                >
                  {SOCIAL_PLATFORM_LIST.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.label}
                    </option>
                  ))}
                </select>
              </div>
              <MediaSourceInput
                label="Foto Profil Akun"
                value={acc.avatar ?? ''}
                placeholder="URL Foto Profil (opsional)"
                onChangeUrl={(url) => updateAcc(acc.id, { avatar: url })}
                onUploadFile={(f) =>
                  handleCompressAndSet(f, { maxDimension: 512, quality: 0.85 }, (blk, url) => ({
                    ...blk,
                    content: {
                      ...blk.content,
                      socialFollowerAccounts: (blk.content.socialFollowerAccounts ?? []).map((a) =>
                        a.id === acc.id ? { ...a, avatar: url } : a
                      ),
                    },
                  }))
                }
                onClear={acc.avatar ? () => updateAcc(acc.id, { avatar: '' }) : undefined}
              />
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={acc.accountName}
                  placeholder="Nama Akun"
                  onChange={(e) => updateAcc(acc.id, { accountName: e.target.value })}
                  className="px-2 py-1.5 text-xs font-semibold rounded border border-[#DCE5EF] bg-white"
                />
                <input
                  type="text"
                  value={acc.handle}
                  placeholder="@handle"
                  onChange={(e) => updateAcc(acc.id, { handle: e.target.value })}
                  className="px-2 py-1.5 text-xs rounded border border-[#DCE5EF] bg-white"
                />
                <input
                  type="text"
                  value={acc.followLabel ?? 'Ikuti'}
                  placeholder="Teks Tombol"
                  onChange={(e) => updateAcc(acc.id, { followLabel: e.target.value })}
                  className="px-2 py-1.5 text-xs rounded border border-[#DCE5EF] bg-white"
                />
                <input
                  type="url"
                  value={acc.accountUrl ?? ''}
                  placeholder={meta.placeholderUrl}
                  onChange={(e) => updateAcc(acc.id, { accountUrl: e.target.value })}
                  className="px-2 py-1.5 text-xs rounded border border-[#DCE5EF] bg-white"
                />
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#17243D]">Centang Verifikasi</span>
                <ToggleSwitch
                  checked={acc.verified ?? true}
                  onChange={(v) => updateAcc(acc.id, { verified: v })}
                  label="Centang Verifikasi"
                />
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                <div className="space-y-1">
                  <input
                    type="text"
                    value={acc.postsCount ?? ''}
                    placeholder="128"
                    onChange={(e) => updateAcc(acc.id, { postsCount: e.target.value })}
                    className="w-full px-1.5 py-1 text-[11px] font-bold text-center rounded border border-[#DCE5EF] bg-white"
                  />
                  <input
                    type="text"
                    value={acc.postsLabel ?? 'Postingan'}
                    onChange={(e) => updateAcc(acc.id, { postsLabel: e.target.value })}
                    className="w-full px-1 py-0.5 text-[10px] text-center rounded border border-[#DCE5EF] bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <input
                    type="text"
                    value={acc.followers ?? ''}
                    placeholder="45,8 rb"
                    onChange={(e) => updateAcc(acc.id, { followers: e.target.value })}
                    className="w-full px-1.5 py-1 text-[11px] font-bold text-center rounded border border-[#DCE5EF] bg-white"
                  />
                  <input
                    type="text"
                    value={acc.followersLabel ?? 'Follower'}
                    onChange={(e) => updateAcc(acc.id, { followersLabel: e.target.value })}
                    className="w-full px-1 py-0.5 text-[10px] text-center rounded border border-[#DCE5EF] bg-white"
                  />
                </div>
                <div className="space-y-1">
                  <input
                    type="text"
                    value={acc.following ?? ''}
                    placeholder="312"
                    onChange={(e) => updateAcc(acc.id, { following: e.target.value })}
                    className="w-full px-1.5 py-1 text-[11px] font-bold text-center rounded border border-[#DCE5EF] bg-white"
                  />
                  <input
                    type="text"
                    value={acc.followingLabel ?? 'Mengikuti'}
                    onChange={(e) => updateAcc(acc.id, { followingLabel: e.target.value })}
                    className="w-full px-1 py-0.5 text-[10px] text-center rounded border border-[#DCE5EF] bg-white"
                  />
                </div>
              </div>
              <textarea
                rows={2}
                value={acc.bio ?? ''}
                placeholder="Bio singkat (opsional)..."
                onChange={(e) => updateAcc(acc.id, { bio: e.target.value })}
                className="w-full px-2 py-1 text-xs rounded border border-[#DCE5EF] bg-white resize-y"
              />
            </div>
          ),
        };
      }

      return {
        badge: accounts.length,
        body: (
          <div className="space-y-2">
            <div className="flex items-center gap-1.5">
              <select
                value={newSocialFollowerPlatform}
                onChange={(e) => setNewSocialFollowerPlatform(e.target.value as SocialPlatform)}
                className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
              >
                {SOCIAL_PLATFORM_LIST.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={() => {
                  const next = makeAcc(newSocialFollowerPlatform);
                  updateContent({ socialFollowerAccounts: [...accounts, next] });
                  setEditingItemKey(`sfa:${next.id}`);
                }}
                className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-[#17243D] text-white text-xs font-semibold cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5 text-[#00C98A]" />
                <span>Tambah</span>
              </button>
            </div>
            <button
              type="button"
              onClick={() => {
                const existing = new Set(accounts.map((a) => a.platform));
                const popular: SocialPlatform[] = [
                  'instagram',
                  'tiktok',
                  'facebook',
                  'youtube',
                  'threads',
                  'twitter',
                  'telegram',
                ];
                const additions = popular.filter((p) => !existing.has(p)).map(makeAcc);
                if (additions.length > 0) {
                  updateContent({ socialFollowerAccounts: [...accounts, ...additions] });
                }
              }}
              className="w-full py-1.5 px-2.5 rounded-lg border border-[#DCE5EF] bg-[#F0F5FA] hover:border-[#00C98A] text-[11px] font-semibold text-[#17243D] cursor-pointer"
            >
              + Tambah Cepat Sosmed Populer
            </button>

            {accounts.map((acc, idx) => {
              const meta = SOCIAL_PLATFORMS[acc.platform] ?? SOCIAL_PLATFORMS.instagram;
              return (
                <div
                  key={acc.id}
                  onClick={() => setEditingItemKey(`sfa:${acc.id}`)}
                  className="p-2 rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] flex items-center gap-2 cursor-pointer"
                >
                  <span
                    style={{ backgroundColor: meta.brandColor }}
                    className="w-7 h-7 rounded-md text-white inline-flex items-center justify-center shrink-0"
                  >
                    <SocialGlyph platform={acc.platform} className="w-3.5 h-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-bold text-[#17243D] truncate">
                      {acc.accountName || meta.label}
                    </div>
                    <div className="text-[10.5px] text-[#8FA4BF] truncate">
                      {acc.handle} · {acc.followers} {acc.followersLabel || 'Follower'}
                    </div>
                  </div>
                  <ItemOverflowMenu
                    onEdit={() => setEditingItemKey(`sfa:${acc.id}`)}
                    onMoveUp={() =>
                      updateContent({
                        socialFollowerAccounts: moveArrayItem(accounts, idx, -1),
                      })
                    }
                    onMoveDown={() =>
                      updateContent({
                        socialFollowerAccounts: moveArrayItem(accounts, idx, 1),
                      })
                    }
                    disableMoveUp={idx === 0}
                    disableMoveDown={idx === accounts.length - 1}
                    onDelete={() => {
                      updateContent({
                        socialFollowerAccounts: removeSelectedItemByIdOrIndex(
                          accounts,
                          acc.id,
                          idx
                        ),
                      });
                      if (editingItemKey === `sfa:${acc.id}`) setEditingItemKey(null);
                    }}
                  />
                </div>
              );
            })}
          </div>
        ),
      };
    }

    // --- SOCIAL FEED POSTS ---
    if (selectedBlock.type === 'social_feed') {
      const posts = c.socialFeedPosts ?? [];
      const updatePost = (id: string, patch: Partial<SocialPostItem>) =>
        updateContent({
          socialFeedPosts: posts.map((p) => (p.id === id ? { ...p, ...patch } : p)),
        });
      const makePost = (index: number): SocialPostItem => ({
        id: createId('sfp'),
        mediaType: 'image',
        imageUrl: SAMPLE_CAROUSEL_IMAGES[index % SAMPLE_CAROUSEL_IMAGES.length],
        videoUrl: '',
        caption: `Postingan #${index + 1} — tambahkan cerita atau detail konten Anda di sini.`,
        likes: '245',
        comments: '18',
        url: '',
      });
      const setPostCount = (target: number) => {
        const clamped = Math.max(1, Math.min(20, Math.round(target)));
        if (clamped === posts.length) return;
        if (clamped < posts.length) {
          updateContent({ socialFeedPosts: posts.slice(0, clamped) });
        } else {
          const additions: SocialPostItem[] = [];
          for (let i = posts.length; i < clamped; i++) additions.push(makePost(i));
          updateContent({ socialFeedPosts: [...posts, ...additions] });
        }
      };

      if (editingItemKey?.startsWith('sfp:')) {
        const id = editingItemKey.slice('sfp:'.length);
        const idx = posts.findIndex((p) => p.id === id);
        const post = posts[idx];
        if (!post) return { badge: posts.length, body: renderDrillHeader('Postingan') };
        return {
          badge: posts.length,
          body: (
            <div className="space-y-2.5">
              {renderDrillHeader(
                `Postingan #${idx + 1}`,
                () =>
                  updateContent({
                    socialFeedPosts: removeSelectedItemByIdOrIndex(posts, post.id, idx),
                  }),
                posts.length <= 1
              )}
              <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
                <button
                  type="button"
                  onClick={() => updatePost(post.id, { mediaType: 'image' })}
                  className={`py-1 rounded text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                    post.mediaType === 'image' ? 'bg-[#17243D] text-white' : 'text-[#8FA4BF]'
                  }`}
                >
                  <ImageIcon className="w-3 h-3" />
                  <span>Gambar</span>
                </button>
                <button
                  type="button"
                  onClick={() => updatePost(post.id, { mediaType: 'video' })}
                  className={`py-1 rounded text-xs font-semibold flex items-center justify-center gap-1 cursor-pointer ${
                    post.mediaType === 'video' ? 'bg-[#17243D] text-white' : 'text-[#8FA4BF]'
                  }`}
                >
                  <Video className="w-3 h-3" />
                  <span>Video</span>
                </button>
              </div>

              {post.mediaType === 'video' && (
                <div className="space-y-1.5">
                  <label className="block text-[11px] font-semibold text-[#17243D]">
                    Link Video atau Upload
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="url"
                      value={post.videoUrl?.startsWith('data:') ? '' : post.videoUrl ?? ''}
                      placeholder="https://..."
                      onChange={(e) => updatePost(post.id, { videoUrl: e.target.value })}
                      className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                    />
                    <label className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-[#DCE5EF] bg-[#F0F5FA] text-[11px] font-semibold text-[#17243D] cursor-pointer">
                      <Upload className="w-3.5 h-3.5 text-[#00C98A]" />
                      <span>Video</span>
                      <input
                        type="file"
                        accept="video/*"
                        className="hidden"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          e.target.value = '';
                          if (!file) return;
                          onSetUploadError(null);
                          try {
                            const videoData = await readVideoFileSafe(file, 12);
                            updatePost(post.id, { videoUrl: videoData, mediaType: 'video' });
                          } catch (err) {
                            onSetUploadError(
                              err instanceof Error ? err.message : 'Gagal membaca file video.'
                            );
                          }
                        }}
                      />
                    </label>
                  </div>
                </div>
              )}

              <MediaSourceInput
                label={post.mediaType === 'video' ? 'Thumbnail Video' : 'Foto Postingan'}
                value={post.imageUrl}
                previewFallback={CAROUSEL_SAMPLE_1_SVG}
                onChangeUrl={(url) =>
                  updatePost(post.id, {
                    imageUrl: url || SAMPLE_CAROUSEL_IMAGES[idx % SAMPLE_CAROUSEL_IMAGES.length],
                  })
                }
                onUploadFile={(f) =>
                  handleCompressAndSet(f, { maxDimension: 1080, quality: 0.82 }, (blk, url) => ({
                    ...blk,
                    content: {
                      ...blk.content,
                      socialFeedPosts: (blk.content.socialFeedPosts ?? []).map((p) =>
                        p.id === post.id ? { ...p, imageUrl: url } : p
                      ),
                    },
                  }))
                }
              />

              <textarea
                rows={2}
                value={post.caption}
                placeholder="Caption postingan..."
                onChange={(e) => updatePost(post.id, { caption: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white resize-y"
              />
              <div className="grid grid-cols-3 gap-1.5">
                <input
                  type="text"
                  value={post.likes ?? ''}
                  placeholder="Suka"
                  onChange={(e) => updatePost(post.id, { likes: e.target.value })}
                  className="px-2 py-1 text-xs rounded border border-[#DCE5EF] bg-white tabular-nums"
                />
                <input
                  type="text"
                  value={post.comments ?? ''}
                  placeholder="Komen"
                  onChange={(e) => updatePost(post.id, { comments: e.target.value })}
                  className="px-2 py-1 text-xs rounded border border-[#DCE5EF] bg-white tabular-nums"
                />
                <input
                  type="url"
                  value={post.url ?? ''}
                  placeholder="Link"
                  onChange={(e) => updatePost(post.id, { url: e.target.value })}
                  className="px-2 py-1 text-xs rounded border border-[#DCE5EF] bg-white"
                />
              </div>
            </div>
          ),
        };
      }

      return {
        badge: posts.length,
        body: (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
              <span className="text-xs font-semibold text-[#17243D]">Jumlah Postingan</span>
              <div className="inline-flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => setPostCount(posts.length - 1)}
                  disabled={posts.length <= 1}
                  className="w-6 h-6 rounded border border-[#DCE5EF] bg-white text-xs font-bold cursor-pointer disabled:opacity-40"
                >
                  -
                </button>
                <span className="w-8 text-center text-xs font-bold tabular-nums">
                  {posts.length}
                </span>
                <button
                  type="button"
                  onClick={() => setPostCount(posts.length + 1)}
                  disabled={posts.length >= 20}
                  className="w-6 h-6 rounded border border-[#DCE5EF] bg-white text-xs font-bold cursor-pointer disabled:opacity-40"
                >
                  +
                </button>
              </div>
            </div>
            <button
              type="button"
              disabled={posts.length >= 20}
              onClick={() => {
                const next = makePost(posts.length);
                updateContent({ socialFeedPosts: [...posts, next] });
                setEditingItemKey(`sfp:${next.id}`);
              }}
              className="w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#17243D] text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#00C98A]" />
              <span>Tambah Postingan ({posts.length}/20)</span>
            </button>
            {posts.map((post, idx) => (
              <div
                key={post.id}
                onClick={() => setEditingItemKey(`sfp:${post.id}`)}
                className="p-2 rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] flex items-center gap-2 cursor-pointer"
              >
                <img
                  src={post.imageUrl || CAROUSEL_SAMPLE_1_SVG}
                  alt={`Post ${idx + 1}`}
                  className="w-8 h-8 rounded border border-[#DCE5EF] object-cover shrink-0"
                />
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold text-[#17243D] truncate">
                    Postingan #{idx + 1} · {post.mediaType === 'video' ? 'Video' : 'Gambar'}
                  </div>
                  <div className="text-[10.5px] text-[#8FA4BF] truncate">{post.caption}</div>
                </div>
                <ItemOverflowMenu
                  onEdit={() => setEditingItemKey(`sfp:${post.id}`)}
                  onMoveUp={() =>
                    updateContent({ socialFeedPosts: moveArrayItem(posts, idx, -1) })
                  }
                  onMoveDown={() =>
                    updateContent({ socialFeedPosts: moveArrayItem(posts, idx, 1) })
                  }
                  disableMoveUp={idx === 0}
                  disableMoveDown={idx === posts.length - 1}
                  disableDelete={posts.length <= 1}
                  onDelete={() => {
                    updateContent({
                      socialFeedPosts: removeSelectedItemByIdOrIndex(posts, post.id, idx),
                    });
                    if (editingItemKey === `sfp:${post.id}`) setEditingItemKey(null);
                  }}
                />
              </div>
            ))}
          </div>
        ),
      };
    }

    // --- CATEGORY TABS ---
    if (selectedBlock.type === 'category_tabs') {
      const buttons = c.categoryButtons ?? [];
      const updateBtn = (id: string, patch: Partial<CategoryJumpItem>) =>
        updateContent({
          categoryButtons: buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)),
        });

      if (editingItemKey?.startsWith('cat:')) {
        const id = editingItemKey.slice('cat:'.length);
        const btn = buttons.find((b) => b.id === id);
        if (!btn) return { badge: buttons.length, body: renderDrillHeader('Tombol Kategori') };
        return {
          badge: buttons.length,
          body: (
            <div className="space-y-2.5">
              {renderDrillHeader(btn.label || 'Kategori', () =>
                updateContent({
                  categoryButtons: removeSelectedItemByIdOrIndex(buttons, btn.id),
                })
              )}
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Label Tombol
                </label>
                <input
                  type="text"
                  value={btn.label}
                  onChange={(e) =>
                    updateBtn(btn.id, { label: e.target.value, targetTitle: e.target.value })
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Judul Tujuan Gulir
                </label>
                <input
                  type="text"
                  value={btn.targetTitle ?? btn.label}
                  onChange={(e) => updateBtn(btn.id, { targetTitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
            </div>
          ),
        };
      }

      return {
        badge: buttons.length,
        body: (
          <div className="space-y-2">
            <button
              type="button"
              onClick={() => {
                const nextBtn: CategoryJumpItem = {
                  id: createId('catbtn'),
                  label: `Kategori ${buttons.length + 1}`,
                  targetTitle: `Kategori ${buttons.length + 1}`,
                };
                updateContent({ categoryButtons: [...buttons, nextBtn] });
                setEditingItemKey(`cat:${nextBtn.id}`);
              }}
              className="w-full inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#17243D] text-white text-xs font-semibold cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-[#00C98A]" />
              <span>Tambah Kategori</span>
            </button>

            {buttons.map((btn, idx) => (
              <div
                key={btn.id}
                onClick={() => setEditingItemKey(`cat:${btn.id}`)}
                className="p-2 rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#17243D] truncate">{btn.label}</div>
                  <div className="text-[10.5px] text-[#8FA4BF] truncate">
                    Tujuan: {btn.targetTitle ?? btn.label}
                  </div>
                </div>
                <ItemOverflowMenu
                  onEdit={() => setEditingItemKey(`cat:${btn.id}`)}
                  onMoveUp={() =>
                    updateContent({ categoryButtons: moveArrayItem(buttons, idx, -1) })
                  }
                  onMoveDown={() =>
                    updateContent({ categoryButtons: moveArrayItem(buttons, idx, 1) })
                  }
                  disableMoveUp={idx === 0}
                  disableMoveDown={idx === buttons.length - 1}
                  onDelete={() => {
                    updateContent({
                      categoryButtons: removeSelectedItemByIdOrIndex(buttons, btn.id, idx),
                    });
                    if (editingItemKey === `cat:${btn.id}`) setEditingItemKey(null);
                  }}
                />
              </div>
            ))}
          </div>
        ),
      };
    }

    // --- ROW ---
    if (selectedBlock.type === 'row') {
      const rowChildren = selectedBlock.children ?? [];
      const rowColMinH = Math.max(0, Math.min(360, c.rowColumnMinHeight ?? 0));
      const updateRowChildren = (nextChildren: BuilderBlock[]) =>
        onUpdateBlock(selectedBlock.id, (blk) => ({ ...blk, children: nextChildren }));

      const makeColCard = (idx: number): BuilderBlock => ({
        id: createId('cnt'),
        type: 'container',
        label: `Kotak ${idx}`,
        style: {
          ...DEFAULT_STYLE,
          widthPercent: 100,
          minHeight: Math.max(100, rowColMinH || 112),
          padding: 12,
          marginBottom: 0,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.borderColor,
          backgroundColor: theme.cardBg,
          textColor: theme.textColor,
          shadow: 'sm',
          hoverLift: true,
          align: 'left',
        },
        content: {},
        children: [
          {
            id: createId('txt'),
            type: 'text',
            label: `Judul Kolom ${idx}`,
            style: {
              ...DEFAULT_STYLE,
              padding: 0,
              marginBottom: 4,
              minHeight: 20,
              fontSize: 13,
              textColor: theme.textColor,
              align: 'left',
            },
            content: { text: `Kolom ${idx}`, variant: 'h2', fontWeight: 'bold' },
          },
          {
            id: createId('txt'),
            type: 'text',
            label: `Isi Kolom ${idx}`,
            style: {
              ...DEFAULT_STYLE,
              padding: 0,
              marginBottom: 0,
              minHeight: 16,
              fontSize: 11,
              textColor: theme.textColor,
              align: 'left',
            },
            content: { text: 'Keterangan singkat item.', variant: 'body', fontWeight: 'normal' },
          },
        ],
      });

      return {
        badge: rowChildren.length,
        body: (
          <div className="space-y-2.5">
            <button
              type="button"
              onClick={() => {
                const next = [...rowChildren];
                while (next.length < 5) next.push(makeColCard(next.length + 1));
                onUpdateBlock(selectedBlock.id, (blk) => ({
                  ...blk,
                  content: {
                    ...blk.content,
                    rowLayoutMode: 'horizontal',
                    rowColumnWidth: blk.content.rowColumnWidth ?? 150,
                    rowGap: blk.content.rowGap ?? 10,
                  },
                  children: next,
                }));
              }}
              className="w-full py-1.5 px-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] hover:border-[#00C98A] text-[11px] font-bold text-[#17243D] cursor-pointer"
            >
              + Buat 5 Kolom Slide Horizontal
            </button>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => updateRowChildren([...rowChildren, makeColCard(rowChildren.length + 1)])}
                className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#17243D] text-white text-[11px] font-semibold cursor-pointer"
              >
                <Plus className="w-3 h-3 text-[#00C98A]" />
                <span>Kolom Kotak</span>
              </button>
              <button
                type="button"
                onClick={() => onAddChildToContainer(selectedBlock.id, 'image')}
                className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white border border-[#DCE5EF] text-[11px] font-semibold text-[#17243D] cursor-pointer"
              >
                <Plus className="w-3 h-3 text-[#00C98A]" />
                <span>Kolom Gambar</span>
              </button>
              <button
                type="button"
                onClick={() => onAddChildToContainer(selectedBlock.id, 'button')}
                className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white border border-[#DCE5EF] text-[11px] font-semibold text-[#17243D] cursor-pointer"
              >
                <Plus className="w-3 h-3 text-[#00C98A]" />
                <span>Kolom Tombol</span>
              </button>
              <button
                type="button"
                onClick={() => onAddChildToContainer(selectedBlock.id, 'text')}
                className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white border border-[#DCE5EF] text-[11px] font-semibold text-[#17243D] cursor-pointer"
              >
                <Plus className="w-3 h-3 text-[#00C98A]" />
                <span>Kolom Teks</span>
              </button>
            </div>

            {rowChildren.map((child, idx) => (
              <div
                key={child.id}
                onClick={() => onSelectBlock?.(child.id)}
                className="p-2 rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] flex items-center justify-between gap-2 cursor-pointer"
              >
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#17243D] truncate">
                    {idx + 1}. {child.label || label(`komponen.type.${child.type}`, BLOCK_TYPE_NAMES[child.type])}
                  </div>
                  <div className="text-[10.5px] text-[#8FA4BF]">
                    {label(`komponen.type.${child.type}`, BLOCK_TYPE_NAMES[child.type])} · Klik untuk edit
                  </div>
                </div>
                <ItemOverflowMenu
                  onEdit={() => onSelectBlock?.(child.id)}
                  editLabel="Buka Komponen"
                  onDuplicate={() => {
                    const dup = cloneBlockDeep(child);
                    dup.label = `${child.label || label(`komponen.type.${child.type}`, BLOCK_TYPE_NAMES[child.type])} Salinan`;
                    const next = [...rowChildren];
                    next.splice(idx + 1, 0, dup);
                    updateRowChildren(next);
                  }}
                  onMoveUp={() => updateRowChildren(moveArrayItem(rowChildren, idx, -1))}
                  onMoveDown={() => updateRowChildren(moveArrayItem(rowChildren, idx, 1))}
                  disableMoveUp={idx === 0}
                  disableMoveDown={idx === rowChildren.length - 1}
                  onDelete={() =>
                    updateRowChildren(
                      removeSelectedItemByIdOrIndex(rowChildren, child.id, idx)
                    )
                  }
                />
              </div>
            ))}
          </div>
        ),
      };
    }

    // --- CONTAINER / TOGGLE_CONTAINER / BOTTOM_SHEET ---
    if (
      selectedBlock.type === 'container' ||
      selectedBlock.type === 'toggle_container' ||
      selectedBlock.type === 'bottom_sheet'
    ) {
      const children = selectedBlock.children ?? [];
      const addableTypes: BlockType[] =
        selectedBlock.type === 'bottom_sheet'
          ? ['maps_place', 'text', 'image', 'button', 'form', 'catalog', 'carousel', 'social']
          : ['text', 'image', 'button', 'form', 'youtube', 'divider'];

      const applySheetTemplate = (tplId: 'maps' | 'contact' | 'promo' | 'form') => {
        let nextTitle = 'Lokasi & Ulasan';
        let nextChildren: BuilderBlock[] = [];
        if (tplId === 'maps') {
          nextTitle = 'Lokasi & Ulasan';
          const blk = createBlock('maps_place', theme);
          nextChildren = [{ ...blk, style: { ...blk.style, marginBottom: 0 } }];
        } else if (tplId === 'contact') {
          nextTitle = 'Hubungi Kami';
          const txt = createBlock('text', theme);
          const btn = createBlock('button', theme);
          const soc = createBlock('social', theme);
          nextChildren = [
            {
              ...txt,
              label: 'Info Kontak',
              style: { ...txt.style, align: 'left', marginBottom: 8 },
              content: {
                text: 'Pilih saluran tercepat untuk terhubung langsung dengan tim kami.',
                variant: 'body',
                fontWeight: 'normal',
              },
            },
            {
              ...btn,
              label: 'Tombol WhatsApp',
              style: { ...btn.style, marginBottom: 12 },
              content: {
                label: 'Chat via WhatsApp',
                url: 'https://wa.me/6281234567890',
                buttonBg: '#059669',
                buttonText: '#FFFFFF',
                buttonIcon: 'phone',
              },
            },
            { ...soc, style: { ...soc.style, marginBottom: 0 } },
          ];
        } else if (tplId === 'promo') {
          nextTitle = 'Info & Promo Spesial';
          const img = createBlock('image', theme);
          const txt = createBlock('text', theme);
          const btn = createBlock('button', theme);
          nextChildren = [
            { ...img, style: { ...img.style, marginBottom: 10 } },
            {
              ...txt,
              label: 'Judul Promo',
              style: { ...txt.style, align: 'left', marginBottom: 10 },
              content: {
                text: 'Penawaran terbatas minggu ini — klik tombol di bawah untuk klaim langsung.',
                variant: 'body',
                fontWeight: 'normal',
              },
            },
            {
              ...btn,
              style: { ...btn.style, marginBottom: 0 },
              content: {
                label: 'Ambil Promo Sekarang',
                url: 'https://example.com/promo',
                buttonBg: theme.accentColor,
                buttonText: '#FFFFFF',
                buttonIcon: 'shopping-bag',
              },
            },
          ];
        } else {
          nextTitle = 'Formulir Pendaftaran';
          const frm = createBlock('form', theme);
          nextChildren = [{ ...frm, style: { ...frm.style, marginBottom: 0 } }];
        }
        onUpdateBlock(selectedBlock.id, (blk) => ({
          ...blk,
          content: { ...blk.content, sheetTitle: nextTitle },
          children: nextChildren,
        }));
      };

      return {
        badge: children.length,
        body: (
          <div className="space-y-3">
            {selectedBlock.type === 'bottom_sheet' && (
              <div>
                <div className="text-[11px] font-semibold text-[#17243D] mb-1.5">
                  Isi Cepat Template Sheet
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(
                    [
                      { id: 'maps', label: 'Maps & Ulasan' },
                      { id: 'contact', label: 'Kontak & WA' },
                      { id: 'promo', label: 'Promo / Info' },
                      { id: 'form', label: 'Form Isian' },
                    ] as const
                  ).map((tpl) => (
                    <button
                      key={tpl.id}
                      type="button"
                      onClick={() => applySheetTemplate(tpl.id)}
                      className="py-1.5 px-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] hover:border-[#00C98A] text-[11px] font-semibold text-[#17243D] text-left truncate cursor-pointer"
                    >
                      {tpl.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-1.5">
              {children.length === 0 ? (
                <SectionEmptyNote message="Wadah ini masih kosong. Tambahkan komponen di bawah." />
              ) : (
                children.map((child, idx) => (
                  <div
                    key={child.id}
                    onClick={() => onSelectBlock?.(child.id)}
                    className="p-2 rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] flex items-center justify-between gap-2 cursor-pointer"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#17243D] truncate">
                        {idx + 1}. {child.label.trim() || label(`komponen.type.${child.type}`, BLOCK_TYPE_NAMES[child.type])}
                      </div>
                      <div className="text-[10.5px] text-[#8FA4BF]">
                        {label(`komponen.type.${child.type}`, BLOCK_TYPE_NAMES[child.type])} · Klik untuk edit
                      </div>
                    </div>
                    <ItemOverflowMenu
                      onEdit={() => onSelectBlock?.(child.id)}
                      editLabel="Buka Komponen"
                      onMoveUp={() =>
                        onUpdateBlock(selectedBlock.id, (blk) => ({
                          ...blk,
                          children: moveArrayItem(blk.children ?? [], idx, -1),
                        }))
                      }
                      onMoveDown={() =>
                        onUpdateBlock(selectedBlock.id, (blk) => ({
                          ...blk,
                          children: moveArrayItem(blk.children ?? [], idx, 1),
                        }))
                      }
                      disableMoveUp={idx === 0}
                      disableMoveDown={idx === children.length - 1}
                      onDelete={() =>
                        onUpdateBlock(selectedBlock.id, (blk) => ({
                          ...blk,
                          children: removeSelectedItemByIdOrIndex(
                            blk.children ?? [],
                            child.id,
                            idx
                          ),
                        }))
                      }
                    />
                  </div>
                ))
              )}
            </div>

            <div>
              <div className="text-[11px] font-semibold text-[#17243D] mb-1.5">
                {label('konten.field.tambahElemenWadah', '+ Tambah Elemen ke Wadah')}
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {addableTypes.map((childType) => (
                  <button
                    key={childType}
                    type="button"
                    onClick={() => onAddChildToContainer(selectedBlock.id, childType)}
                    className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] hover:border-[#00C98A] text-[11px] font-medium text-[#17243D] cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#00C98A] shrink-0" />
                    <span className="truncate">{label(`komponen.type.${childType}`, BLOCK_TYPE_NAMES[childType])}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>
        ),
      };
    }

    return {
      body: (
        <SectionEmptyNote message="Komponen ini tidak memiliki daftar item berulang." />
      ),
    };
  };

  // --- 4. TAUTAN & NAVIGASI ---
  const renderNavSection = () => {
    switch (selectedBlock.type) {
      case 'button':
        return (
          <div>
            <label className="block text-xs font-semibold text-[#17243D] mb-1">
              {label('konten.field.urlTujuan', 'URL Tujuan')}
            </label>
            <input
              type="url"
              value={c.url ?? ''}
              placeholder="https://..."
              onChange={(e) => updateContent({ url: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
            />
          </div>
        );

      case 'maps_place':
        return (
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1">
                {label('konten.field.linkGoogleMaps', 'Link Google Maps (Opsional)')}
              </label>
              <input
                type="url"
                value={c.mapsUrl ?? ''}
                placeholder="https://maps.google.com/..."
                onChange={(e) => updateContent({ mapsUrl: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1">
                {label('konten.field.labelTombolMaps', 'Label Tombol Maps')}
              </label>
              <input
                type="text"
                value={c.mapsButtonLabel ?? 'Buka di Google Maps'}
                onChange={(e) => updateContent({ mapsButtonLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
              />
            </div>
          </div>
        );

      case 'social_feed': {
        const platform = c.socialFeedPlatform ?? 'instagram';
        const meta = SOCIAL_PLATFORMS[platform] ?? SOCIAL_PLATFORMS.instagram;
        return (
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1">
                Teks Tombol Ikuti
              </label>
              <input
                type="text"
                value={c.socialFeedFollowLabel ?? 'Ikuti'}
                onChange={(e) => updateContent({ socialFeedFollowLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1">
                Link Profil Akun
              </label>
              <input
                type="url"
                value={c.socialFeedAccountUrl ?? ''}
                placeholder={meta.placeholderUrl}
                onChange={(e) => updateContent({ socialFeedAccountUrl: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
              />
            </div>
          </div>
        );
      }

      case 'category_tabs':
        return (
          <SectionEmptyNote message="Setiap tombol di daftar Data & Daftar Item otomatis menggulir halaman ke judul target saat diklik pengunjung." />
        );

      default:
        return (
          <SectionEmptyNote message="Tautan atau navigasi diatur langsung di dalam daftar item atau bagian Konten Utama." />
        );
    }
  };

  // --- 5. AKSI & INTERAKSI ---
  const renderActionsSection = () => {
    switch (selectedBlock.type) {
      case 'catalog': {
        const cartEnabled = c.catalogCartEnabled ?? true;
        const detailEnabled = c.catalogDetailEnabled ?? true;
        const rawProductType = c.catalogProductType ?? 'physical';
        const normalizedProductType: 'physical' | 'digital' = isDigitalProductType(rawProductType)
          ? 'digital'
          : 'physical';
        const hasPhysicalItem =
          isPhysicalProductType(rawProductType) ||
          (c.catalogItems ?? []).some((it) => it.productType === 'physical');
        const customerFields = resolveCatalogCustomerFields(c);

        const switchCatalogKind = (nextKind: 'physical' | 'digital') => {
          const prevDefaultIds = getDefaultCustomerFields(normalizedProductType)
            .map((f) => f.id)
            .join('|');
          const currentIds = customerFields.map((f) => f.id).join('|');
          const shouldReplaceDefaults =
            !c.catalogCustomerFields || currentIds === prevDefaultIds;
          updateContent({
            catalogProductType: nextKind,
            catalogShippingEnabled: nextKind === 'physical',
            ...(shouldReplaceDefaults
              ? { catalogCustomerFields: getDefaultCustomerFields(nextKind) }
              : {}),
          });
        };

        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#17243D]">
                {label('konten.field.halamanDetailProduk', 'Halaman Detail Produk')}
              </span>
              <ToggleSwitch
                checked={detailEnabled}
                onChange={(checked) => updateContent({ catalogDetailEnabled: checked })}
                label="Halaman Detail"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#17243D]">
                {label('konten.field.keranjangWhatsapp', 'Keranjang WhatsApp')}
              </span>
              <ToggleSwitch
                checked={cartEnabled}
                onChange={(checked) => updateContent({ catalogCartEnabled: checked })}
                label={label('konten.field.keranjangWhatsapp', 'Keranjang WhatsApp')}
              />
            </div>

            {cartEnabled && (
              <div className="space-y-2.5 pt-2 border-t border-[#DCE5EF]">
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Jenis Katalog Produk
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'physical', label: 'Produk Fisik' },
                        { id: 'digital', label: 'Produk Digital' },
                      ] as const
                    ).map((pt) => (
                      <button
                        key={pt.id}
                        type="button"
                        onClick={() => switchCatalogKind(pt.id)}
                        className={`py-1.5 px-2 rounded-lg text-xs font-semibold border cursor-pointer ${
                          normalizedProductType === pt.id
                            ? 'bg-[#17243D] text-white border-[#17243D]'
                            : 'bg-white text-[#17243D] border-[#DCE5EF]'
                        }`}
                      >
                        {pt.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    {label('konten.field.noWhatsappCheckout', 'Nomor WhatsApp Checkout')}
                  </label>
                  <input
                    type="text"
                    value={c.catalogWhatsappNumber ?? '6281234567890'}
                    onChange={(e) => updateContent({ catalogWhatsappNumber: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Nama Toko (di Pesan WA)
                  </label>
                  <input
                    type="text"
                    value={c.catalogStoreName ?? ''}
                    placeholder="Otomatis pakai nama halaman"
                    onChange={(e) => updateContent({ catalogStoreName: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Pesan Pembuka WhatsApp
                  </label>
                  <input
                    type="text"
                    value={
                      c.catalogWhatsappIntro ?? 'Halo, saya ingin memesan produk berikut:'
                    }
                    onChange={(e) => updateContent({ catalogWhatsappIntro: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                  />
                </div>

                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-medium text-[#17243D]">Form Data Pemesan</span>
                  <ToggleSwitch
                    checked={c.catalogAskCustomerInfo ?? true}
                    onChange={(checked) => updateContent({ catalogAskCustomerInfo: checked })}
                    label="Form Data Pemesan"
                  />
                </div>

                {hasPhysicalItem && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#17243D]">Opsi Pengiriman</span>
                    <ToggleSwitch
                      checked={c.catalogShippingEnabled ?? true}
                      onChange={(checked) => updateContent({ catalogShippingEnabled: checked })}
                      label="Opsi Pengiriman"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        );
      }

      case 'fnb_catalog':
        return (
          <div className="space-y-2.5">
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1">
                No. WhatsApp Checkout
              </label>
              <input
                type="text"
                value={c.catalogWhatsappNumber ?? '6281234567890'}
                onChange={(e) => updateContent({ catalogWhatsappNumber: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white tabular-nums"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1">
                Teks Tombol Lanjut Keranjang
              </label>
              <input
                type="text"
                value={c.fnbFloatingCartLabel ?? 'Lanjut'}
                onChange={(e) => updateContent({ fnbFloatingCartLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#17243D]">Kolom Pencarian</span>
              <ToggleSwitch
                checked={c.fnbShowSearch !== false}
                onChange={(val) => updateContent({ fnbShowSearch: val })}
                label="Kolom Pencarian"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#17243D]">Tab Kategori Bawaan</span>
              <ToggleSwitch
                checked={Boolean(c.fnbShowCategories)}
                onChange={(val) => updateContent({ fnbShowCategories: val })}
                label="Tab Kategori Bawaan"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#17243D]">Kelompokkan per Kategori</span>
              <ToggleSwitch
                checked={c.fnbGroupByCategory !== false}
                onChange={(val) => updateContent({ fnbGroupByCategory: val })}
                label="Kelompokkan per Kategori"
              />
            </div>
          </div>
        );

      case 'training_catalog':
        return (
          <div className="space-y-2.5">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Label Tombol Buka
                </label>
                <input
                  type="text"
                  value={c.trainingExpandLabel ?? 'Selengkapnya'}
                  onChange={(e) => updateContent({ trainingExpandLabel: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Label Tombol Tutup
                </label>
                <input
                  type="text"
                  value={c.trainingCollapseLabel ?? 'Tutup Detail'}
                  onChange={(e) => updateContent({ trainingCollapseLabel: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(c.trainingDefaultExpanded)}
                onChange={(e) => updateContent({ trainingDefaultExpanded: e.target.checked })}
                className="accent-[#00C98A]"
              />
              <span className="text-[11px] font-medium text-[#17243D]">
                Buka wadah detail secara default
              </span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  No. WhatsApp
                </label>
                <input
                  type="text"
                  value={c.trainingWaNumber ?? '6281234567890'}
                  onChange={(e) => updateContent({ trainingWaNumber: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Label Tombol WA
                </label>
                <input
                  type="text"
                  value={c.trainingWaButtonLabel ?? 'Konsultasi via WhatsApp'}
                  onChange={(e) => updateContent({ trainingWaButtonLabel: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Pesan Pembuka WA
              </label>
              <input
                type="text"
                value={c.trainingWaIntro ?? ''}
                onChange={(e) => updateContent({ trainingWaIntro: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
              />
            </div>
          </div>
        );

      case 'toggle_container':
        return (
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Teks Tombol saat Sembunyi
              </label>
              <input
                type="text"
                value={c.toggleShowLabel ?? 'Tampilkan Konten'}
                onChange={(e) => updateContent({ toggleShowLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Teks Tombol saat Tampil
              </label>
              <input
                type="text"
                value={c.toggleHideLabel ?? 'Sembunyikan Konten'}
                onChange={(e) => updateContent({ toggleHideLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Kondisi Awal Halaman Dibuka
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                <button
                  type="button"
                  onClick={() => updateContent({ toggleDefaultOpen: false })}
                  className={`py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                    !c.toggleDefaultOpen
                      ? 'bg-[#17243D] text-white border-[#17243D]'
                      : 'bg-white text-[#17243D] border-[#DCE5EF]'
                  }`}
                >
                  Hide (Default)
                </button>
                <button
                  type="button"
                  onClick={() => updateContent({ toggleDefaultOpen: true })}
                  className={`py-1.5 rounded-lg text-xs font-semibold border cursor-pointer ${
                    c.toggleDefaultOpen
                      ? 'bg-[#17243D] text-white border-[#17243D]'
                      : 'bg-white text-[#17243D] border-[#DCE5EF]'
                  }`}
                >
                  Show (Terbuka)
                </button>
              </div>
            </div>
          </div>
        );

      case 'bottom_sheet':
        return (
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Label Pemicu
              </label>
              <input
                type="text"
                value={c.sheetTriggerLabel ?? 'Lokasi Maps'}
                onChange={(e) => updateContent({ sheetTriggerLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
              />
            </div>
            {(c.sheetTriggerStyle ?? 'icon') !== 'button' && (
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Keterangan Tambahan (Opsional)
                </label>
                <input
                  type="text"
                  value={c.sheetTriggerSublabel ?? ''}
                  placeholder="Lihat lokasi & ulasan"
                  onChange={(e) => updateContent({ sheetTriggerSublabel: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
            )}
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Judul Bottom Sheet
              </label>
              <input
                type="text"
                value={c.sheetTitle ?? 'Lokasi & Ulasan'}
                onChange={(e) => updateContent({ sheetTitle: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
              />
            </div>
          </div>
        );

      case 'form':
        return (
          <div>
            <label className="block text-xs font-semibold text-[#17243D] mb-1">
              {label('konten.field.labelTombolKirim', 'Label Tombol Kirim')}
            </label>
            <input
              type="text"
              value={c.submitLabel ?? ''}
              onChange={(e) => updateContent({ submitLabel: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
            />
          </div>
        );

      default:
        return (
          <SectionEmptyNote message="Komponen ini tidak memiliki pengaturan aksi atau interaksi khusus." />
        );
    }
  };

  // --- 6. PENGATURAN TAMBAHAN ---
  const renderExtraSection = () => {
    switch (selectedBlock.type) {
      case 'catalog':
        return (
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-medium text-[#17243D]">
              Tampilkan Jumlah Terjual (Unit Sold)
            </span>
            <ToggleSwitch
              checked={advanceOptions.showUnitSold}
              onChange={(checked) => onUpdateAdvanceOptions({ showUnitSold: checked })}
              label="Show Unit Sold"
            />
          </div>
        );

      case 'hero_profile':
        return (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#17243D]">
                Tampilkan Badge Status Buka/Tutup
              </span>
              <ToggleSwitch
                checked={Boolean(c.heroStatusEnabled)}
                onChange={(val) => updateContent({ heroStatusEnabled: val })}
                label="Tampilkan Badge Status"
              />
            </div>
            {c.heroStatusEnabled && (
              <div className="grid grid-cols-3 gap-2">
                <input
                  type="text"
                  value={c.heroStatusText ?? 'Buka sekarang'}
                  onChange={(e) => updateContent({ heroStatusText: e.target.value })}
                  className="col-span-2 px-2 py-1 text-xs rounded border border-[#DCE5EF] bg-white"
                />
                <input
                  type="color"
                  value={c.heroStatusColor ?? '#16A34A'}
                  onChange={(e) => updateContent({ heroStatusColor: e.target.value })}
                  className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                />
              </div>
            )}
            {(c.heroVariant ?? 'compact') === 'banner' && (
              <div>
                <label className="block text-[11px] font-medium text-[#17243D] mb-1">
                  Font Judul Banner
                </label>
                <select
                  value={
                    c.heroCoverTitleEnabled !== false && c.heroCoverFontFamily !== '__none__'
                      ? c.heroCoverFontFamily ?? 'Pacifico'
                      : '__none__'
                  }
                  onChange={(e) => {
                    const val = e.target.value;
                    if (val === '__none__') {
                      updateContent({ heroCoverTitleEnabled: false });
                    } else {
                      updateContent({ heroCoverTitleEnabled: true, heroCoverFontFamily: val });
                    }
                  }}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                >
                  <option value="__none__">Tidak ditampilkan</option>
                  <option value="">Ikuti Font Kartu</option>
                  {(['Sans', 'Display', 'Serif', 'Script', 'Mono'] as const).map((cat) => (
                    <optgroup key={cat} label={cat}>
                      {FONT_OPTIONS.filter((f) => f.category === cat).map((f) => (
                        <option key={f.id} value={f.id}>
                          {f.label}
                        </option>
                      ))}
                    </optgroup>
                  ))}
                </select>
              </div>
            )}
          </div>
        );

      case 'social_feed': {
        const platform = c.socialFeedPlatform ?? 'instagram';
        return (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#17243D] flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#00C98A]" />
                <span>Centang Verifikasi Akun</span>
              </span>
              <ToggleSwitch
                checked={c.socialFeedVerified ?? true}
                onChange={(checked) => updateContent({ socialFeedVerified: checked })}
                label="Centang Verifikasi"
              />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-[#8FA4BF] mb-1">
                  Jumlah Follower
                </label>
                <input
                  type="text"
                  value={c.socialFeedFollowers ?? ''}
                  placeholder="45,8 rb"
                  onChange={(e) => updateContent({ socialFeedFollowers: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#8FA4BF] mb-1">
                  Label Statistik
                </label>
                <input
                  type="text"
                  value={
                    c.socialFeedFollowersLabel ??
                    (platform === 'youtube' ? 'Subscriber' : 'Follower')
                  }
                  onChange={(e) => updateContent({ socialFeedFollowersLabel: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
            </div>
          </div>
        );
      }

      case 'training_catalog':
        return (
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Judul Syarat Berkas
              </label>
              <input
                type="text"
                value={c.trainingChecklistTitle ?? 'Checklist Syarat Berkas'}
                onChange={(e) => updateContent({ trainingChecklistTitle: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Judul Formulir Pendaftaran
              </label>
              <input
                type="text"
                value={c.trainingFormTitle ?? 'Formulir Pendaftaran / Konsultasi'}
                onChange={(e) => updateContent({ trainingFormTitle: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
              />
            </div>
          </div>
        );

      default:
        return (
          <SectionEmptyNote message="Tidak ada pengaturan konten tambahan untuk komponen ini." />
        );
    }
  };

  const itemsInfo = renderDataItemsSection();

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-[#F0F5FA]/50">
      <AccordionSection
        id="identity"
        title={label('konten.sec.identity', 'Identitas Komponen')}
        icon={<Tag className="w-3.5 h-3.5" />}
        isOpen={openSections.identity}
        onToggle={() => toggleSection('identity')}
      >
        <div>
          <label className="block text-xs font-semibold text-[#17243D] mb-1">
            {label('konten.field.namaLapisan', 'Nama Lapisan Komponen')}
          </label>
          <input
            type="text"
            value={selectedBlock.label}
            onChange={(e) =>
              onUpdateBlock(selectedBlock.id, (blk) => ({ ...blk, label: e.target.value }))
            }
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
          />
        </div>
        <div className="flex items-center justify-between gap-2">
          <span className="px-2 py-0.5 rounded bg-[#F0F5FA] border border-[#DCE5EF] text-[10.5px] font-semibold text-[#17243D]">
            {label(`komponen.type.${selectedBlock.type}`, BLOCK_TYPE_NAMES[selectedBlock.type])}
          </span>
          <button
            type="button"
            onClick={() => onDuplicateBlock(selectedBlock.id)}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] text-[11px] font-semibold text-[#17243D] cursor-pointer"
          >
            <Copy className="w-3 h-3 text-[#00C98A]" />
            <span>{label('komponen.action.duplicate', 'Duplikat Komponen')}</span>
          </button>
        </div>
      </AccordionSection>

      <AccordionSection
        id="main"
        title={label('konten.sec.main', 'Konten Utama')}
        icon={<FileText className="w-3.5 h-3.5" />}
        isOpen={openSections.main}
        onToggle={() => toggleSection('main')}
      >
        {renderMainContent()}
      </AccordionSection>

      <AccordionSection
        id="items"
        title={label('konten.sec.items', 'Data & Daftar Item')}
        icon={<ListOrdered className="w-3.5 h-3.5" />}
        badge={itemsInfo.badge}
        isOpen={openSections.items}
        onToggle={() => toggleSection('items')}
      >
        {itemsInfo.body}
      </AccordionSection>

      <AccordionSection
        id="nav"
        title={label('konten.sec.nav', 'Tautan & Navigasi')}
        icon={<Link2 className="w-3.5 h-3.5" />}
        isOpen={openSections.nav}
        onToggle={() => toggleSection('nav')}
      >
        {renderNavSection()}
      </AccordionSection>

      <AccordionSection
        id="actions"
        title={label('konten.sec.actions', 'Aksi & Interaksi')}
        icon={<MousePointerClick className="w-3.5 h-3.5" />}
        isOpen={openSections.actions}
        onToggle={() => toggleSection('actions')}
      >
        {renderActionsSection()}
      </AccordionSection>

      <AccordionSection
        id="extra"
        title={label('konten.sec.extra', 'Pengaturan Tambahan')}
        icon={<Settings2 className="w-3.5 h-3.5" />}
        isOpen={openSections.extra}
        onToggle={() => toggleSection('extra')}
      >
        {renderExtraSection()}
      </AccordionSection>
    </div>
  );
}
