import React, { useEffect, useState, type CSSProperties } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowLeft,
  CheckCircle2,
  Eye,
  EyeOff,
  FileText,
  Image as ImageIcon,
  Link2,
  ListOrdered,
  MousePointerClick,
  Plus,
  RotateCcw,
  Search,
  Settings2,
  ShoppingBag,
  Trash2,
  Type,
  Upload,
  Video,
  X,
} from 'lucide-react';
import {
  AdvanceOptions,
  BlockStyle,
  BlockType,
  BottomNavbarConfig,
  BuilderBlock,
  BuilderSubPage,
  CarouselItem,
  CatalogCustomerField,
  CatalogItem,
  CatalogProductType,
  CatalogShippingOptionConfig,
  CategoryJumpItem,
  CustomFieldInputType,
  FloatingCartPosition,
  FnbMenuItem,
  MenuIconAction,
  MenuIconSheetPosition,
  PageTheme,
  ShippingMethodId,
  ShowcaseCardVariant,
  ShowcaseFeeItem,
  SocialFollowerAccount,
  SocialLinkItem,
  SocialPlatform,
  SocialPostItem,
  TrainingCustomBox,
  TrainingMediaItem,
  TrainingProgramItem,
  UniversalActionType,
  WhatsappCenterConfig,
} from '../../types/builder';
import {
  WHATSAPP_TEMPLATE_TYPE_LABELS,
  resolveWhatsappCenter,
} from '../../utils/whatsappBuilder';
import { DynamicFormBuilderEditor } from './DynamicFormBuilderEditor';
import { ContainerSliderControls } from './ContainerSliderControls';
import {
  BLOCK_TYPE_NAMES,
  CAROUSEL_SAMPLE_1_SVG,
  CAROUSEL_SAMPLE_2_SVG,
  CAROUSEL_SAMPLE_3_SVG,
  DEFAULT_STYLE,
  MAPS_LOCATION_SVG,
  PREBUILT_SECTIONS,
  PRODUCT_CARD_SVG,
  createBlock,
  createId,
} from '../../data/presets';
import { TOOL_ITEMS, getSectionIcon } from '../LeftSidebar';
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
import {
  resolveProjectFloatingCartConfig,
  supportsUniversalCart,
} from '../../utils/universalLayerHelpers';
import { IconPicker } from '../IconPicker';
import { RichTextEditor } from '../RichTextEditor';
import { SocialGlyph } from '../SocialIcon';
import { useUiLabel } from '../../contexts/UiLabelsContext';
import { ThemeOverrideTokenKey, withLocalThemeTokenPatch } from '../../utils/blockThemeHelpers';
import {
  ContentSectionKey,
  ExtractedSubLayer,
  isSubLayerDeleted,
  isSubLayerHidden,
  restoreSubLayer,
} from '../../utils/layerStructure';
import {
  AccordionSection,
  ItemOverflowMenu,
  MediaSourceInput,
  SectionEmptyNote,
  SegmentedControl,
  SliderRow,
  ToggleSwitch,
} from './InspectorPrimitives';

interface BlockContentTabProps {
  selectedBlock: BuilderBlock;
  selectedSubLayer?: ExtractedSubLayer | null;
  onClearSubLayer?: () => void;
  onSelectSubLayer?: (blockId: string, subLayerId: string | null) => void;
  allBlocks?: BuilderBlock[];
  pages?: BuilderSubPage[];
  bottomNavbar?: BottomNavbarConfig;
  activeSubPageId?: string | null;
  whatsappCenter?: WhatsappCenterConfig;
  theme: PageTheme;
  advanceOptions: AdvanceOptions;
  onUpdateAdvanceOptions: (patch: Partial<AdvanceOptions>) => void;
  onUpdateBlock: (id: string, updater: (block: BuilderBlock) => BuilderBlock) => void;
  onDuplicateBlock: (id: string) => void;
  onAddChildToContainer: (containerId: string, type: BlockType) => void;
  onAddChildToActionSheet?: (ownerId: string, type: BlockType) => void;
  onAddChildToCardFooter?: (cardId: string, type: BlockType) => void;
  onSelectSubPage?: (pageId: string | null) => void;
  onAddSubPage?: () => string | null;
  onSelectBlock?: (id: string) => void;
  onSetUploadError: (msg: string | null) => void;
}

type ContentSectionId = ContentSectionKey;

function rangeProgressStyle(current: number, min: number, max: number): CSSProperties {
  const span = max - min;
  const pct = span > 0 ? Math.max(0, Math.min(100, ((current - min) / span) * 100)) : 0;
  return {
    background: `linear-gradient(to right, #94A3B8 0%, #94A3B8 ${pct}%, #E2E8F0 ${pct}%, #E2E8F0 100%)`,
  };
}

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

function flattenTargetBlocks(
  blocks: BuilderBlock[],
  excludeId: string,
  depth = 0
): { id: string; label: string; type: BlockType; depth: number }[] {
  const result: { id: string; label: string; type: BlockType; depth: number }[] = [];
  for (const blk of blocks) {
    if (blk.id !== excludeId) {
      result.push({
        id: blk.id,
        label: blk.label?.trim() || BLOCK_TYPE_NAMES[blk.type] || blk.type,
        type: blk.type,
        depth,
      });
    }
    if (blk.children && blk.children.length > 0) {
      result.push(...flattenTargetBlocks(blk.children, excludeId, depth + 1));
    }
    if (blk.content?.cardFooterBlocks && blk.content.cardFooterBlocks.length > 0) {
      result.push(...flattenTargetBlocks(blk.content.cardFooterBlocks, excludeId, depth + 1));
    }
    if (blk.content?.actionSheetBlocks && blk.content.actionSheetBlocks.length > 0) {
      result.push(...flattenTargetBlocks(blk.content.actionSheetBlocks, excludeId, depth + 1));
    }
  }
  return result;
}

export function BlockContentTab({
  selectedBlock,
  selectedSubLayer = null,
  onClearSubLayer,
  onSelectSubLayer,
  allBlocks = [],
  pages = [],
  bottomNavbar,
  activeSubPageId = null,
  whatsappCenter,
  theme,
  advanceOptions,
  onUpdateAdvanceOptions,
  onUpdateBlock,
  onDuplicateBlock,
  onAddChildToContainer,
  onAddChildToActionSheet,
  onAddChildToCardFooter,
  onSelectSubPage,
  onAddSubPage,
  onSelectBlock,
  onSetUploadError,
}: BlockContentTabProps) {
  const { label, isVisible } = useUiLabel();
  const resolvePrimaryContentSection = (): ContentSectionId => {
    if (selectedSubLayer && selectedSubLayer.contentSections.length > 0) {
      return selectedSubLayer.contentSections[0];
    }
    if (
      selectedBlock.type === 'carousel' ||
      selectedBlock.type === 'catalog' ||
      selectedBlock.type === 'fnb_catalog' ||
      selectedBlock.type === 'training_catalog' ||
      selectedBlock.type === 'category_tabs' ||
      selectedBlock.type === 'social' ||
      selectedBlock.type === 'social_follower' ||
      selectedBlock.type === 'social_feed' ||
      selectedBlock.type === 'container' ||
      selectedBlock.type === 'row'
    ) {
      return 'items';
    }
    if (selectedBlock.type === 'divider') return 'general';
    return 'main';
  };
  const [activeOpenSection, setActiveOpenSection] = useState<ContentSectionId | null>(() =>
    resolvePrimaryContentSection()
  );
  const openSections: Record<ContentSectionId, boolean> = {
    general: activeOpenSection === 'general',
    main: activeOpenSection === 'main',
    typo: activeOpenSection === 'typo',
    items: activeOpenSection === 'items',
    nav: activeOpenSection === 'nav',
    actions: activeOpenSection === 'actions',
    extra: activeOpenSection === 'extra',
  };
  const [heroTemplateSearch, setHeroTemplateSearch] = useState('');

  // Drill-down key: e.g., "catalog:item_1", "fnb:fnb_1", "shipping:makan_ditempat", "cf:cf_1"
  const [editingItemKey, setEditingItemKey] = useState<string | null>(null);
  const [catalogSubList, setCatalogSubList] = useState<'products' | 'customer' | 'shipping'>(
    'products'
  );
  const [fnbSubList, setFnbSubList] = useState<'menu' | 'customer' | 'shipping'>('menu');
  const [trainingSubList, setTrainingSubList] = useState<
    'programs' | 'boxes' | 'media' | 'checklist' | 'form'
  >('programs');

  const [newSocialPlatform, setNewSocialPlatform] = useState<SocialPlatform>('instagram');
  const [newSocialFollowerPlatform, setNewSocialFollowerPlatform] =
    useState<SocialPlatform>('tiktok');
  const [uploadingHeroCover, setUploadingHeroCover] = useState(false);
  const [uploadingHeroPhoto, setUploadingHeroPhoto] = useState(false);

  useEffect(() => {
    setActiveOpenSection(resolvePrimaryContentSection());
    if (!selectedSubLayer) {
      setEditingItemKey(null);
      return;
    }

    if (selectedSubLayer.subListTab) {
      if (selectedBlock.type === 'catalog') {
        if (
          selectedSubLayer.subListTab === 'products' ||
          selectedSubLayer.subListTab === 'customer' ||
          selectedSubLayer.subListTab === 'shipping'
        ) {
          setCatalogSubList(selectedSubLayer.subListTab);
        }
      } else if (selectedBlock.type === 'fnb_catalog') {
        if (
          selectedSubLayer.subListTab === 'menu' ||
          selectedSubLayer.subListTab === 'customer' ||
          selectedSubLayer.subListTab === 'shipping'
        ) {
          setFnbSubList(selectedSubLayer.subListTab);
        }
      } else if (selectedBlock.type === 'training_catalog') {
        if (
          selectedSubLayer.subListTab === 'programs' ||
          selectedSubLayer.subListTab === 'boxes' ||
          selectedSubLayer.subListTab === 'media' ||
          selectedSubLayer.subListTab === 'checklist' ||
          selectedSubLayer.subListTab === 'form'
        ) {
          setTrainingSubList(selectedSubLayer.subListTab);
        }
      }
    }

    setEditingItemKey(selectedSubLayer.itemKey ?? null);
  }, [selectedBlock.id, selectedBlock.type, selectedSubLayer?.id, selectedSubLayer?.itemKey, selectedSubLayer?.subListTab]);

  const isContentSectionAllowed = (sec: ContentSectionId) =>
    !selectedSubLayer || selectedSubLayer.contentSections.includes(sec);

  // Single-accordion discipline: opening one section cleanly collapses others
  const toggleSection = (id: ContentSectionId) => {
    setActiveOpenSection((prev) => (prev === id ? null : id));
  };

  const c = selectedBlock.content;
  const s = selectedBlock.style;
  const isCustomTextColor = s.useThemeTextColor === false;

  const updateContent = (patch: Partial<BuilderBlock['content']>) => {
    onUpdateBlock(selectedBlock.id, (blk) => ({
      ...blk,
      content: { ...blk.content, ...patch },
    }));
  };

  const updateStyle = (patch: Partial<BlockStyle>) => {
    onUpdateBlock(selectedBlock.id, (blk) => ({
      ...blk,
      style: { ...blk.style, ...patch },
    }));
  };

  const updateStyleWithToken = (
    patch: Partial<BlockStyle>,
    tokenKeys: ThemeOverrideTokenKey[]
  ) => {
    onUpdateBlock(selectedBlock.id, (blk) =>
      withLocalThemeTokenPatch(blk, patch, undefined, tokenKeys)
    );
  };

  const updateAccentContent = (patch: Partial<BuilderBlock['content']>) => {
    onUpdateBlock(selectedBlock.id, (blk) =>
      withLocalThemeTokenPatch(blk, {}, patch, ['accentColor'])
    );
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
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Jenis Teks (Semantik)
              </label>
              <select
                value={c.variant ?? 'body'}
                onChange={(e) =>
                  updateContent({ variant: e.target.value as 'h1' | 'h2' | 'body' })
                }
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
              >
                <option value="h1">Judul Besar (H1)</option>
                <option value="h2">Subjudul (H2)</option>
                <option value="body">Paragraf</option>
              </select>
            </div>
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
              {!(c.text ?? '').trim() && isVisible('konten.desc.teksKosong') && (
                <p className="text-[11px] text-[#8FA4BF]">
                  {label(
                    'konten.desc.teksKosong',
                    'Teks kosong otomatis disembunyikan di pratinjau & halaman publik.'
                  )}
                </p>
              )}
            </div>
          </div>
        );

      case 'image':
        return (
          <div className="space-y-2.5">
            <MediaSourceInput
              label={label('konten.field.gambarUtama', 'Sumber Gambar (Upload WebP / URL)')}
              value={c.src ?? ''}
              onChangeUrl={(url) => updateContent({ src: url })}
              onSavePreparedUrl={(url, meta) =>
                updateContent({
                  src: url,
                  imageName: c.imageName?.trim() ? c.imageName : meta.fileName,
                })
              }
              onUploadFile={(file) =>
                handleCompressAndSet(
                  file,
                  { maxDimension: 1080, quality: 0.82 },
                  (blk, url) => ({ ...blk, content: { ...blk.content, src: url } })
                )
              }
              onClear={c.src ? () => updateContent({ src: '' }) : undefined}
            />
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                  Nama Gambar
                </label>
                <input
                  type="text"
                  value={c.imageName ?? ''}
                  placeholder="banner-utama.webp"
                  onChange={(e) => updateContent({ imageName: e.target.value })}
                  className="w-full px-2 py-1 text-[11px] rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                  Teks Alt (SEO / Aksesibilitas)
                </label>
                <input
                  type="text"
                  value={c.alt ?? ''}
                  placeholder="Deskripsi gambar"
                  onChange={(e) => updateContent({ alt: e.target.value })}
                  className="w-full px-2 py-1 text-[11px] rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                  Object Fit
                </label>
                <select
                  value={c.objectFit ?? 'cover'}
                  onChange={(e) =>
                    updateContent({
                      objectFit: e.target.value as 'cover' | 'contain' | 'fill' | 'none' | 'scale-down',
                    })
                  }
                  className="w-full px-2 py-1 text-[11px] rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                >
                  <option value="cover">Cover (Penuh)</option>
                  <option value="contain">Contain (Utuh)</option>
                  <option value="fill">Fill (Regang)</option>
                  <option value="scale-down">Scale Down</option>
                  <option value="none">None (Asli)</option>
                </select>
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                  Posisi Fokus
                </label>
                <select
                  value={c.objectPosition ?? 'center'}
                  onChange={(e) => updateContent({ objectPosition: e.target.value })}
                  className="w-full px-2 py-1 text-[11px] rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                >
                  <option value="center">Tengah</option>
                  <option value="top">Atas</option>
                  <option value="bottom">Bawah</option>
                  <option value="left">Kiri</option>
                  <option value="right">Kanan</option>
                </select>
              </div>
            </div>
            <div>
              <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                Rasio Aspek
              </label>
              <SegmentedControl<'auto' | '16/9' | '4/3' | '1/1'>
                columns={4}
                value={c.aspectRatio ?? 'auto'}
                onChange={(val) => updateContent({ aspectRatio: val })}
                options={[
                  { id: 'auto', label: 'Auto' },
                  { id: '16/9', label: '16:9' },
                  { id: '4/3', label: '4:3' },
                  { id: '1/1', label: '1:1' },
                ]}
              />
            </div>
          </div>
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

        const subId = selectedSubLayer?.id;
        const showHeroCoverPanel = !subId || subId === 'hero_cover';
        const showHeroPhotoPanel = !subId || subId === 'hero_avatar' || subId === 'hero_profile_card';
        const showHeroInfoPanel = !subId || subId === 'hero_profile_card';

        return (
          <div className="space-y-3">
            {/* PENGATURAN COVER (TERPISAH & INDEPENDEN) */}
            {showHeroCoverPanel && (
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

              {heroVariant === 'compact' && isVisible('konten.desc.heroBannerOverlap') && (
                <p className="text-[10.5px] text-[#8FA4BF] leading-snug">
                  {label(
                    'konten.desc.heroBannerOverlap',
                    'Pilih model Banner Overlap di tab Desain untuk menampilkan cover di bagian atas profil.'
                  )}
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
            )}

            {/* PENGATURAN FOTO (TERPISAH & INDEPENDEN) */}
            {showHeroPhotoPanel && (
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
            )}

            {showHeroInfoPanel && (
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  {label('konten.main.label.namaUsaha', 'Nama Usaha / Judul')}
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
                  {label('konten.main.label.taglineUsaha', 'Tagline / Deskripsi')}
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
                    {label('konten.main.label.jamBuka', 'Jam Buka')}
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
                  {label('konten.main.label.lokasiAlamat', 'Lokasi / Alamat')}
                </label>
                <input
                  type="text"
                  value={c.heroLocation ?? ''}
                  onChange={(e) => updateContent({ heroLocation: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                />
              </div>
            </div>
            )}
          </div>
        );
      }

      case 'fnb_catalog':
        return (
          <div>
            <label className="block text-xs font-semibold text-[#17243D] mb-1">
              {label('konten.main.label.namaTokoFnb', 'Nama Toko / Warung F&B')}
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
                {label('konten.main.label.namaPelatihan', 'Nama Pelatihan')}
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

      case 'maps_place': {
        const subId = selectedSubLayer?.id;
        const showMapsPhoto = !subId || subId === 'maps_photo';
        const showMapsInfo = !subId || subId === 'maps_info';
        return (
          <div className="space-y-2.5">
            {showMapsPhoto && (
              <>
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
              </>
            )}
            {showMapsInfo && (
              <>
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    {label('konten.main.label.namaTempatMaps', 'Nama Tempat / Lokasi')}
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
              </>
            )}
          </div>
        );
      }

      case 'button': {
        const subId = selectedSubLayer?.id;
        const iconDeleted = isSubLayerDeleted(selectedBlock, 'button_icon');
        const textDeleted = isSubLayerDeleted(selectedBlock, 'button_text');
        const iconHidden = isSubLayerHidden(selectedBlock, 'button_icon');
        const textHidden = isSubLayerHidden(selectedBlock, 'button_text');

        // Sub-Layer 1: Ikon Tombol
        if (subId === 'button_icon') {
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#F8FBFE] border border-[#DCE5EF]">
                <span className="text-[11px] font-semibold text-[#17243D]">
                  Tampilkan Ikon pada Tombol
                </span>
                <ToggleSwitch
                  checked={!iconHidden}
                  onChange={(show) => updateContent({ buttonHideIcon: !show })}
                  label="Tampilkan Ikon Tombol"
                />
              </div>
              <IconPicker
                selectedIcon={c.buttonIcon ?? 'none'}
                iconUrl={c.buttonIconUrl ?? ''}
                allowNone
                accentVariant="emerald"
                onSelectIcon={(icon) =>
                  updateContent({ buttonIcon: icon, buttonHideIcon: icon === 'none' })
                }
                onChangeIconUrl={(url) =>
                  updateContent({ buttonIconUrl: url, buttonHideIcon: false })
                }
              />
              <div>
                <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                  Tooltip Ikon (Opsional)
                </label>
                <input
                  type="text"
                  value={c.buttonIconTooltip ?? ''}
                  placeholder="Contoh: Buka tautan resmi"
                  onChange={(e) => updateContent({ buttonIconTooltip: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                />
              </div>
            </div>
          );
        }

        // Sub-Layer 2: Teks Tombol
        if (subId === 'button_text') {
          return (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#F8FBFE] border border-[#DCE5EF]">
                <span className="text-[11px] font-semibold text-[#17243D]">
                  Tampilkan Teks pada Tombol
                </span>
                <ToggleSwitch
                  checked={!textHidden}
                  onChange={(show) => updateContent({ buttonHideText: !show })}
                  label="Tampilkan Teks Tombol"
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-[#17243D] mb-1">
                  {label('konten.field.teksTombol', 'Teks Tombol')}
                </label>
                <input
                  type="text"
                  value={c.label ?? ''}
                  placeholder="Contoh: Pesan Sekarang"
                  onChange={(e) => updateContent({ label: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                />
              </div>
            </div>
          );
        }

        // Parent Layer: Wadah Tombol (Struktur 3-Layer + Aksi Tombol)
        const actionKind = c.buttonActionKind ?? 'url';
        return (
          <div className="space-y-3">
            {/* 3-Layer Quick Navigator & Restore */}
            <div className="p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-1.5">
              <div className="text-[10px] font-bold text-[#51637D] uppercase tracking-wide">
                Struktur 3-Lapisan Tombol
              </div>
              <div className="grid grid-cols-2 gap-1.5">
                {iconDeleted ? (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBlock(selectedBlock.id, (blk) => restoreSubLayer(blk, 'button_icon'))
                    }
                    className="px-2 py-1.5 rounded-md border border-dashed border-[#00C98A] bg-white text-[10.5px] font-semibold text-[#008F63] hover:bg-[#ECFDF6] cursor-pointer"
                  >
                    + Pulihkan Ikon
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectSubLayer?.(selectedBlock.id, 'button_icon')}
                    className="px-2 py-1.5 rounded-md border border-[#DCE5EF] bg-white hover:border-[#00C98A] text-[10.5px] font-semibold text-[#17243D] text-left cursor-pointer truncate"
                  >
                    Edit Ikon Tombol →
                  </button>
                )}
                {textDeleted ? (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBlock(selectedBlock.id, (blk) => restoreSubLayer(blk, 'button_text'))
                    }
                    className="px-2 py-1.5 rounded-md border border-dashed border-[#00C98A] bg-white text-[10.5px] font-semibold text-[#008F63] hover:bg-[#ECFDF6] cursor-pointer"
                  >
                    + Pulihkan Teks
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => onSelectSubLayer?.(selectedBlock.id, 'button_text')}
                    className="px-2 py-1.5 rounded-md border border-[#DCE5EF] bg-white hover:border-[#00C98A] text-[10.5px] font-semibold text-[#17243D] text-left cursor-pointer truncate"
                  >
                    Edit Teks Tombol →
                  </button>
                )}
              </div>
            </div>

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

            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Jenis Aksi Tombol
              </label>
              <select
                value={actionKind}
                onChange={(e) =>
                  updateContent({
                    buttonActionKind: e.target.value as NonNullable<
                      BuilderBlock['content']['buttonActionKind']
                    >,
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
              >
                <option value="url">Buka URL / Tautan</option>
                <option value="whatsapp">Kirim Pesan WhatsApp</option>
                <option value="page">Pindah Halaman</option>
                <option value="scroll">Gulir ke Bagian / Kartu</option>
                <option value="form">Buka Form / Sheet</option>
                <option value="action">Aksi Kustom</option>
              </select>
            </div>

            {actionKind === 'url' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    URL Tujuan
                  </label>
                  <input
                    type="url"
                    value={c.url ?? ''}
                    placeholder="https://contoh.com"
                    onChange={(e) => updateContent({ url: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-[#17243D]">Buka di Tab Baru</span>
                  <ToggleSwitch
                    checked={c.buttonOpenInNewTab !== false}
                    onChange={(val) => updateContent({ buttonOpenInNewTab: val })}
                    label="Buka di Tab Baru"
                  />
                </div>
              </div>
            )}

            {actionKind === 'whatsapp' && (
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Nomor WhatsApp (Format 628...)
                  </label>
                  <input
                    type="text"
                    value={c.buttonWhatsappNumber ?? ''}
                    placeholder="6281234567890"
                    onChange={(e) => updateContent({ buttonWhatsappNumber: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Pesan Otomatis
                  </label>
                  <textarea
                    rows={2}
                    value={c.buttonWhatsappMessage ?? ''}
                    placeholder="Halo, saya ingin bertanya tentang..."
                    onChange={(e) => updateContent({ buttonWhatsappMessage: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none resize-y"
                  />
                </div>
              </div>
            )}

            {actionKind === 'action' && (
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Nama / Target Aksi Kustom
                </label>
                <input
                  type="text"
                  value={c.buttonCustomAction ?? ''}
                  placeholder="Contoh: open-promo-modal"
                  onChange={(e) => updateContent({ buttonCustomAction: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                />
              </div>
            )}

            <div className="grid grid-cols-1 gap-2 pt-1 border-t border-[#E6EEF5]">
              <div>
                <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                  Tooltip Tombol (Opsional)
                </label>
                <input
                  type="text"
                  value={c.buttonTooltip ?? ''}
                  placeholder="Muncul saat kursor diarahkan"
                  onChange={(e) => updateContent({ buttonTooltip: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-[#17243D]">Nonaktifkan Tombol</span>
                <ToggleSwitch
                  checked={Boolean(c.buttonDisabled)}
                  onChange={(val) => updateContent({ buttonDisabled: val })}
                  label="Nonaktifkan Tombol"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-[#17243D]">
                  Konfirmasi Sebelum Aksi
                </span>
                <ToggleSwitch
                  checked={Boolean(c.buttonConfirmAction)}
                  onChange={(val) => updateContent({ buttonConfirmAction: val })}
                  label="Konfirmasi Sebelum Aksi"
                />
              </div>
              {c.buttonConfirmAction && (
                <input
                  type="text"
                  value={c.buttonConfirmMessage ?? ''}
                  placeholder="Pesan konfirmasi (mis. Lanjutkan ke tautan?)"
                  onChange={(e) => updateContent({ buttonConfirmMessage: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                />
              )}
            </div>
          </div>
        );
      }

      case 'form':
        return (
          <DynamicFormBuilderEditor
            selectedBlock={selectedBlock}
            whatsappCenter={whatsappCenter}
            onUpdateBlock={onUpdateBlock}
          />
        );

      case 'youtube':
      case 'facebook_video':
      case 'tiktok_video':
      case 'instagram_video': {
        const isYt = selectedBlock.type === 'youtube';
        const isFb = selectedBlock.type === 'facebook_video';
        const isIg = selectedBlock.type === 'instagram_video';
        const currentUrl = isYt ? c.youtubeUrl ?? '' : c.videoUrl ?? '';
        const currentAuto = c.videoAutoplay ?? c.youtubeAutoplay ?? true;
        const currentMuted = Boolean(c.videoMuted);
        const currentVol = c.videoVolume ?? c.youtubeVolume ?? 75;
        return (
          <div className="space-y-3">
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
                  {label('konten.main.label.urlSampulVideo', 'URL Gambar Sampul (Opsional)')}
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
            <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2.5">
              <div className="text-[11px] font-bold text-[#17243D]">Perilaku Pemutaran Video</div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-[#17243D]">Putar Otomatis (Autoplay)</span>
                <ToggleSwitch
                  checked={currentAuto}
                  onChange={(checked) =>
                    updateContent(
                      isYt
                        ? { youtubeAutoplay: checked, videoAutoplay: checked }
                        : { videoAutoplay: checked }
                    )
                  }
                  label="Putar Otomatis Video"
                />
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-xs font-medium text-[#17243D]">Bisukan Audio (Mute)</span>
                <ToggleSwitch
                  checked={currentMuted}
                  onChange={(checked) => updateContent({ videoMuted: checked })}
                  label="Bisukan Audio"
                />
              </div>
              {!currentMuted && (
                <SliderRow
                  label="Volume Audio"
                  value={`${currentVol}%`}
                  min={0}
                  max={100}
                  current={currentVol}
                  onChange={(val) =>
                    updateContent(
                      isYt ? { youtubeVolume: val, videoVolume: val } : { videoVolume: val }
                    )
                  }
                />
              )}
            </div>
          </div>
        );
      }

      case 'menu_icon': {
        const subId = selectedSubLayer?.id;
        const showIconVisual = !subId || subId === 'menu_icon_visual';
        const showIconLabel = !subId || subId === 'menu_icon_label';
        return (
          <div className="space-y-3">
            {showIconVisual && (
              <MediaSourceInput
                label="Gambar / Ikon Menu (Upload atau Link URL)"
                value={c.menuIconImage ?? ''}
                placeholder="https://.../icon.png"
                onChangeUrl={(url) => updateContent({ menuIconImage: url })}
                onUploadFile={(file) =>
                  handleCompressAndSet(
                    file,
                    { maxDimension: 640, quality: 0.85 },
                    (blk, url) => ({
                      ...blk,
                      content: { ...blk.content, menuIconImage: url },
                    })
                  )
                }
                onClear={() => updateContent({ menuIconImage: '' })}
              />
            )}

            {showIconLabel && (
              <>
                <div className="flex items-center justify-between gap-2 pt-0.5">
                  <span className="text-[11px] font-semibold text-[#17243D]">
                    Tampilkan Label Teks
                  </span>
                  <ToggleSwitch
                    label="Tampilkan Label Teks"
                    checked={c.menuIconShowLabel !== false}
                    onChange={(checked) => updateContent({ menuIconShowLabel: checked })}
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    {label('konten.main.label.labelMenuIcon', 'Label Menu Icon')}
                  </label>
                  <input
                    type="text"
                    value={c.menuIconLabel ?? 'Menu Icon'}
                    onChange={(e) => updateContent({ menuIconLabel: e.target.value })}
                    placeholder="Contoh: Promo, Lokasi, Menu"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                  />
                </div>
              </>
            )}
          </div>
        );
      }

      case 'cart_button': {
        const subId = selectedSubLayer?.id;
        const showCartProduct = !subId || subId === 'cart_product';
        const showCartAction = !subId || subId === 'cart_action';
        return (
          <div className="space-y-2.5">
            {showCartProduct && (
              <>
                <MediaSourceInput
                  label="Foto Produk (Opsional)"
                  value={c.cartProductImage ?? ''}
                  placeholder="https://..."
                  onChangeUrl={(url) => updateContent({ cartProductImage: url })}
                  onUploadFile={(f) =>
                    handleCompressAndSet(f, { maxDimension: 640, quality: 0.84 }, (blk, url) => ({
                      ...blk,
                      content: { ...blk.content, cartProductImage: url },
                    }))
                  }
                  onClear={c.cartProductImage ? () => updateContent({ cartProductImage: '' }) : undefined}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                      Nama Produk
                    </label>
                    <input
                      type="text"
                      value={c.cartProductName ?? 'Produk Pilihan'}
                      onChange={(e) => updateContent({ cartProductName: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                      Harga
                    </label>
                    <input
                      type="text"
                      value={c.cartProductPrice ?? 'Rp 50.000'}
                      onChange={(e) => updateContent({ cartProductPrice: e.target.value })}
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white tabular-nums"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Keterangan Produk
                  </label>
                  <textarea
                    rows={2}
                    value={c.cartProductDesc ?? ''}
                    placeholder="Deskripsi singkat produk..."
                    onChange={(e) => updateContent({ cartProductDesc: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white resize-y"
                  />
                </div>
                <div className="flex items-center justify-between gap-2 pt-1">
                  <span className="text-xs font-medium text-[#17243D]">
                    Tampilkan Info Produk & Harga
                  </span>
                  <ToggleSwitch
                    checked={c.cartShowProductInfo !== false}
                    onChange={(val) => updateContent({ cartShowProductInfo: val })}
                    label="Tampilkan Info Produk"
                  />
                </div>
              </>
            )}
            {showCartAction && (
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Label Tombol Tambah
                  </label>
                  <input
                    type="text"
                    value={c.cartButtonLabel ?? 'Tambah'}
                    onChange={(e) => updateContent({ cartButtonLabel: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Warna Tombol
                  </label>
                  <input
                    type="color"
                    value={c.cartAccentColor || theme.accentColor || '#059669'}
                    onChange={(e) => updateContent({ cartAccentColor: e.target.value })}
                    className="w-full h-8 rounded-lg border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                  />
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'showcase_card': {
        const variant: ShowcaseCardVariant = c.cardVariant ?? 'quote_banner';
        const galleryImages = c.cardGalleryImages ?? [];
        const feeItems: ShowcaseFeeItem[] = c.cardFeeItems ?? [
          { id: 'fee_1', label: 'Pendaftaran', value: 'Rp. 100.000' },
          { id: 'fee_2', label: 'Iuran Anggota', value: 'Rp. 400.000' },
        ];
        const hasMainImage =
          variant === 'quote_banner' ||
          variant === 'news_banner' ||
          variant === 'event_poster' ||
          variant === 'badge_tile' ||
          variant === 'store_card' ||
          variant === 'activity_post';

        const bodyChildren = selectedBlock.children ?? [];
        const footerChildren = c.cardFooterBlocks ?? [];
        const topQuickTypes: { type: BlockType; label: string }[] = [
          { type: 'image', label: '+ Gambar' },
          { type: 'text', label: '+ Teks' },
          { type: 'menu_icon', label: '+ Icon' },
          { type: 'button', label: '+ Tombol' },
          { type: 'cart_button', label: '+ Keranjang' },
          { type: 'row', label: '+ Kolom' },
        ];
        const footerQuickTypes: { type: BlockType; label: string }[] = [
          { type: 'cart_button', label: '+ Keranjang' },
          { type: 'button', label: '+ Tombol' },
          { type: 'menu_icon', label: '+ Icon' },
          { type: 'text', label: '+ Teks' },
          { type: 'row', label: '+ Kolom' },
          { type: 'back_button', label: '+ Back' },
        ];

        const subId = selectedSubLayer?.id;

        // Dedicated Sub-Layer: Header Kartu (independent of media, body, footer)
        if (subId === 'card_header') {
          return (
            <div className="space-y-2.5">
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Judul Header Kartu
                </label>
                <input
                  type="text"
                  value={c.cardHeaderTitle ?? ''}
                  placeholder="Contoh: Info Terbaru"
                  onChange={(e) => updateContent({ cardHeaderTitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Label Tautan Header (Opsional)
                </label>
                <input
                  type="text"
                  value={c.cardMoreLabel ?? ''}
                  placeholder="Contoh: Selengkapnya"
                  onChange={(e) => updateContent({ cardMoreLabel: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                />
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  URL Tautan Header
                </label>
                <input
                  type="url"
                  value={c.cardMoreUrl ?? ''}
                  placeholder="https://..."
                  onChange={(e) => updateContent({ cardMoreUrl: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                />
              </div>
            </div>
          );
        }

        const showCardTypePicker = !subId;
        const showCardTopZone = !subId || subId === 'card_body';
        const showCardFooterZone = !subId || subId === 'card_footer';
        const showCardTextFields = !subId || subId === 'card_body';
        const showCardMediaFields = !subId || subId === 'card_media';
        const showCardFeeFields =
          !subId || subId === 'card_body' || subId === 'card_footer' || subId.startsWith('card_fee_');
        const showCardColorsAndLink = !subId || subId === 'card_body' || subId === 'card_footer';

        const hasHeaderNow =
          Boolean(c.cardHeaderTitle?.trim() || c.cardMoreLabel?.trim()) &&
          !isSubLayerDeleted(selectedBlock, 'card_header');
        const deletedParts = (c.deletedSubLayers ?? []).filter((id) =>
          ['card_header', 'card_media', 'card_body', 'card_footer'].includes(id)
        );

        return (
          <div className="space-y-2.5">
            {!subId && (
              <div className="p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-1.5">
                <div className="text-[10px] font-bold text-[#51637D] uppercase tracking-wide">
                  Struktur Bagian Kartu
                </div>
                <div className="flex flex-wrap gap-1">
                  {!hasHeaderNow ? (
                    <button
                      type="button"
                      onClick={() => {
                        onUpdateBlock(selectedBlock.id, (blk) => restoreSubLayer(blk, 'card_header'));
                        onSelectSubLayer?.(selectedBlock.id, 'card_header');
                      }}
                      className="px-2 py-1 rounded-md border border-dashed border-[#00C98A] bg-white text-[10px] font-semibold text-[#008F63] hover:bg-[#ECFDF6] cursor-pointer"
                    >
                      + Tambah Header
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onSelectSubLayer?.(selectedBlock.id, 'card_header')}
                      className="px-2 py-1 rounded-md border border-[#DCE5EF] bg-white hover:border-[#00C98A] text-[10px] font-semibold text-[#17243D] cursor-pointer"
                    >
                      Header →
                    </button>
                  )}
                  {deletedParts
                    .filter((id) => id !== 'card_header')
                    .map((id) => (
                      <button
                        key={id}
                        type="button"
                        onClick={() =>
                          onUpdateBlock(selectedBlock.id, (blk) => restoreSubLayer(blk, id))
                        }
                        className="px-2 py-1 rounded-md border border-dashed border-amber-400 bg-amber-50 text-[10px] font-semibold text-amber-800 hover:bg-amber-100 cursor-pointer"
                      >
                        + Pulihkan{' '}
                        {id === 'card_media'
                          ? 'Gambar'
                          : id === 'card_body'
                          ? 'Konten'
                          : 'Footer'}
                      </button>
                    ))}
                </div>
              </div>
            )}

            {showCardTypePicker && isVisible('konten.field.jenisTampilanKartu') && (
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  {label('konten.field.jenisTampilanKartu', 'Jenis Tampilan Kartu')}
                </label>
                <select
                  value={variant}
                  onChange={(e) =>
                    updateContent({ cardVariant: e.target.value as ShowcaseCardVariant })
                  }
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white font-semibold text-[#17243D]"
                >
                  <option value="quote_banner">Kutipan Tokoh (Banner Gradasi)</option>
                  <option value="news_banner">Berita / Informasi Nasional</option>
                  <option value="event_poster">Poster Even & Promo</option>
                  <option value="badge_tile">Kartu Sertifikasi / Badge</option>
                  <option value="store_card">Kartu Store Gradasi + Harga</option>
                  <option value="activity_post">Feed Kegiatan + Galeri</option>
                  <option value="membership_ticket">Kartu Tarif / Tiket Anggota</option>
                </select>
              </div>
            )}

            {/* Mode Dinamis & Drag-Drop Isi Kartu (Zona Atas & Strip Bawah) */}
            {(showCardTopZone || showCardFooterZone) && (
            <div className="p-2.5 rounded-xl bg-[#F0F7FF] border border-sky-200/80 space-y-2.5">
              {(isVisible('konten.field.modeDinamisKartu') ||
                isVisible('konten.desc.modeDinamisKartu')) && (
                <div>
                  {isVisible('konten.field.modeDinamisKartu') && (
                    <div className="text-[11px] font-bold text-[#17243D]">
                      {label('konten.field.modeDinamisKartu', 'Mode Dinamis & Drag-Drop Isi Kartu')}
                    </div>
                  )}
                  {isVisible('konten.desc.modeDinamisKartu') && (
                    <p className="text-[10px] text-[#51637D] leading-snug mt-0.5">
                      {label(
                        'konten.desc.modeDinamisKartu',
                        'Tarik langsung alat/blok ke kartu di kanvas, atau tambah komponen di Zona Atas & Strip Bawah di bawah ini.'
                      )}
                    </p>
                  )}
                </div>
              )}

              {(isVisible('konten.field.tampilkanKontenBawaan') ||
                isVisible('konten.field.tampilkanStripBawaan')) && (
                <div className="space-y-1.5 bg-white rounded-lg border border-[#DCE5EF] p-2">
                  {isVisible('konten.field.tampilkanKontenBawaan') && (
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] font-semibold text-[#17243D]">
                        {label(
                          'konten.field.tampilkanKontenBawaan',
                          'Tampilkan Konten Bawaan (Atas)'
                        )}
                      </span>
                      <ToggleSwitch
                        checked={!c.cardHideDefaultContent}
                        onChange={(show) => updateContent({ cardHideDefaultContent: !show })}
                        label="Tampilkan konten template bawaan pada bagian atas kartu"
                      />
                    </div>
                  )}
                  {isVisible('konten.field.tampilkanStripBawaan') && (
                    <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#F0F5FA]">
                      <span className="text-[10.5px] font-semibold text-[#17243D]">
                        {label(
                          'konten.field.tampilkanStripBawaan',
                          'Tampilkan Total / Strip Bawaan (Bawah)'
                        )}
                      </span>
                      <ToggleSwitch
                        checked={!c.cardHideDefaultFooter}
                        onChange={(show) => updateContent({ cardHideDefaultFooter: !show })}
                        label="Tampilkan teks total bawaan pada strip warna bawah"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Zona Atas / Bagian Putih */}
              {showCardTopZone && isVisible('konten.field.zonaAtasKartu') && (
                <div className="bg-white rounded-lg border border-[#DCE5EF] p-2 space-y-1.5">
                  <div className="flex items-center justify-between gap-1">
                    <span className="text-[10.5px] font-bold text-[#17243D]">
                      {label('konten.field.zonaAtasKartu', 'Zona Atas / Isi Kartu')} ({bodyChildren.length})
                    </span>
                    <span className="text-[9.5px] text-[#64748B]">Gambar, teks, icon, dll</span>
                  </div>
                  {bodyChildren.length > 0 && (
                    <div className="space-y-1">
                      {bodyChildren.map((child) => (
                        <div
                          key={child.id}
                          className="flex items-center justify-between gap-1.5 px-2 py-1 rounded-md bg-[#F8FAFC] border border-[#DCE5EF]"
                        >
                          <button
                            type="button"
                            onClick={() => onSelectBlock?.(child.id)}
                            className="min-w-0 flex-1 text-left text-[10.5px] font-semibold text-[#17243D] hover:text-[#00A873] truncate cursor-pointer"
                          >
                            {child.label?.trim() || BLOCK_TYPE_NAMES[child.type]}
                          </button>
                          <button
                            type="button"
                            title="Hapus komponen ini"
                            onClick={() =>
                              onUpdateBlock(selectedBlock.id, (blk) => ({
                                ...blk,
                                children: (blk.children ?? []).filter((item) => item.id !== child.id),
                              }))
                            }
                            className="p-0.5 text-[#8FA4BF] hover:text-red-600 cursor-pointer"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {topQuickTypes.map((qt) => (
                      <button
                        key={qt.type}
                        type="button"
                        onClick={() => onAddChildToContainer(selectedBlock.id, qt.type)}
                        className="px-2 py-1 rounded-md bg-[#F0F5FA] hover:bg-[#ECFDF6] border border-[#DCE5EF] hover:border-[#00C98A] text-[10px] font-semibold text-[#17243D] cursor-pointer transition-colors"
                      >
                        {qt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Zona Bawah / Strip Warna (Biru/Merah/Aksen) */}
              {showCardFooterZone && (
              <div className="bg-white rounded-lg border border-sky-200 p-2 space-y-1.5">
                <div className="flex items-center justify-between gap-1">
                  {isVisible('konten.field.stripBawahKartu') && (
                    <span className="text-[10.5px] font-bold text-sky-900">
                      {label('konten.field.stripBawahKartu', 'Strip Bawah / Area Warna')} ({footerChildren.length})
                    </span>
                  )}
                  <span className="text-[9.5px] text-sky-700">Keranjang, tombol, sheet, hal. 2</span>
                </div>
                {footerChildren.length > 0 && (
                  <div className="space-y-1">
                    {footerChildren.map((child) => (
                      <div
                        key={child.id}
                        className="flex items-center justify-between gap-1.5 px-2 py-1 rounded-md bg-sky-50/70 border border-sky-200"
                      >
                        <button
                          type="button"
                          onClick={() => onSelectBlock?.(child.id)}
                          className="min-w-0 flex-1 text-left text-[10.5px] font-semibold text-[#17243D] hover:text-sky-700 truncate cursor-pointer"
                        >
                          {child.label?.trim() || BLOCK_TYPE_NAMES[child.type]}
                        </button>
                        <button
                          type="button"
                          title="Hapus komponen strip bawah"
                          onClick={() =>
                            updateContent({
                              cardFooterBlocks: footerChildren.filter((item) => item.id !== child.id),
                            })
                          }
                          className="p-0.5 text-[#8FA4BF] hover:text-red-600 cursor-pointer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                {onAddChildToCardFooter && (
                  <div className="flex flex-wrap gap-1 pt-0.5">
                    {footerQuickTypes.map((qt) => (
                      <button
                        key={qt.type}
                        type="button"
                        onClick={() => onAddChildToCardFooter(selectedBlock.id, qt.type)}
                        className="px-2 py-1 rounded-md bg-sky-50 hover:bg-sky-100 border border-sky-200 text-[10px] font-semibold text-sky-900 cursor-pointer transition-colors"
                      >
                        {qt.label}
                      </button>
                    ))}
                  </div>
                )}
                {isVisible('konten.desc.stripBawahKartu') && (
                  <div className="text-[9.5px] text-[#64748B] leading-snug">
                    {label(
                      'konten.desc.stripBawahKartu',
                      'Klik komponen di strip bawah untuk atur Aksi: Keranjang, Bottom/Left/Right/Top Sheet, Halaman 2, atau Link.'
                    )}
                  </div>
                )}
              </div>
              )}
            </div>
            )}

            {showCardTextFields && (
              <>
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                {variant === 'quote_banner'
                  ? 'Nama Tokoh'
                  : variant === 'activity_post'
                  ? 'Nama Penulis / Pejabat'
                  : 'Judul Kartu'}
              </label>
              <input
                type="text"
                value={c.cardTitle ?? ''}
                onChange={(e) => updateContent({ cardTitle: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
              />
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                {variant === 'activity_post' ? 'Jabatan / Subjudul' : 'Subjudul / Keterangan (Opsional)'}
              </label>
              <input
                type="text"
                value={c.cardSubtitle ?? ''}
                placeholder="Tambahkan keterangan atau paragraf ke-2..."
                onChange={(e) => updateContent({ cardSubtitle: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
              />
            </div>

            {(variant === 'quote_banner' || variant === 'activity_post') && (
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  {variant === 'quote_banner' ? 'Teks Kutipan' : 'Judul Kegiatan'}
                </label>
                <textarea
                  rows={2}
                  value={c.cardQuote ?? ''}
                  onChange={(e) => updateContent({ cardQuote: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white resize-y"
                />
              </div>
            )}
              </>
            )}

            {showCardMediaFields && variant === 'quote_banner' && (
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Posisi Foto Tokoh
                </label>
                <SegmentedControl<'left' | 'right'>
                  columns={2}
                  value={c.cardImagePosition ?? 'right'}
                  onChange={(pos) => updateContent({ cardImagePosition: pos })}
                  options={[
                    { id: 'left', label: 'Kiri' },
                    { id: 'right', label: 'Kanan' },
                  ]}
                />
              </div>
            )}

            {showCardMediaFields && hasMainImage && (
              <MediaSourceInput
                label={variant === 'activity_post' ? 'Foto Profil Penulis' : 'Gambar / Foto Kartu'}
                value={c.cardImage ?? ''}
                placeholder="https://..."
                onChangeUrl={(url) => updateContent({ cardImage: url })}
                onUploadFile={(f) =>
                  handleCompressAndSet(f, { maxDimension: 960, quality: 0.85 }, (blk, url) => ({
                    ...blk,
                    content: { ...blk.content, cardImage: url },
                  }))
                }
                onClear={c.cardImage ? () => updateContent({ cardImage: '' }) : undefined}
              />
            )}

            {/* Ukuran Box Foto & Perbesar/Perkecil Foto di Dalam Card */}
            {showCardMediaFields && hasMainImage && (
              <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2">
                <div className="text-[11px] font-bold text-[#17243D]">
                  Ukuran Box Foto &amp; Zoom Foto
                </div>
                {(variant === 'badge_tile' ||
                  variant === 'store_card' ||
                  variant === 'quote_banner' ||
                  variant === 'activity_post') && (
                  <SliderRow
                    label={
                      variant === 'activity_post'
                        ? 'Ukuran Foto Profil'
                        : variant === 'quote_banner'
                        ? 'Lebar Box Foto'
                        : 'Ukuran Box Foto / Ikon'
                    }
                    value={`${c.cardMediaSize ?? (variant === 'badge_tile' ? 56 : variant === 'store_card' ? 80 : variant === 'quote_banner' ? 112 : 42)}px`}
                    min={32}
                    max={200}
                    step={2}
                    current={
                      c.cardMediaSize ??
                      (variant === 'badge_tile'
                        ? 56
                        : variant === 'store_card'
                        ? 80
                        : variant === 'quote_banner'
                        ? 112
                        : 42)
                    }
                    onChange={(val) => updateContent({ cardMediaSize: val })}
                  />
                )}
                {(variant === 'news_banner' ||
                  variant === 'event_poster' ||
                  variant === 'quote_banner' ||
                  variant === 'activity_post') && (
                  <SliderRow
                    label={
                      variant === 'activity_post'
                        ? 'Tinggi Foto Galeri'
                        : 'Tinggi Box Foto / Kartu'
                    }
                    value={`${c.cardMediaHeight ?? (variant === 'news_banner' ? 156 : variant === 'event_poster' ? 190 : variant === 'quote_banner' ? 132 : 84)}px`}
                    min={64}
                    max={360}
                    step={4}
                    current={
                      c.cardMediaHeight ??
                      (variant === 'news_banner'
                        ? 156
                        : variant === 'event_poster'
                        ? 190
                        : variant === 'quote_banner'
                        ? 132
                        : 84)
                    }
                    onChange={(val) => updateContent({ cardMediaHeight: val })}
                  />
                )}
                <div>
                  <div className="flex items-center justify-between text-[11px] mb-1">
                    <span className="font-medium text-[#17243D]">Perbesar / Perkecil Foto</span>
                    <div className="flex items-center gap-1.5">
                      {(c.cardImageZoom ?? 100) !== 100 && (
                        <button
                          type="button"
                          onClick={() => updateContent({ cardImageZoom: 100 })}
                          className="px-1.5 py-0.5 rounded bg-white border border-[#DCE5EF] text-[10px] font-semibold text-[#17243D] cursor-pointer"
                        >
                          100%
                        </button>
                      )}
                      <span className="font-mono text-[10.5px] font-semibold text-[#17243D] tabular-nums">
                        {c.cardImageZoom ?? 100}%
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={250}
                    step={5}
                    value={c.cardImageZoom ?? 100}
                    onChange={(e) => updateContent({ cardImageZoom: Number(e.target.value) })}
                    style={rangeProgressStyle(c.cardImageZoom ?? 100, 50, 250)}
                    className="w-full cursor-pointer"
                  />
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#51637D] mb-1">
                      Penyesuaian Foto
                    </label>
                    <SegmentedControl<'cover' | 'contain'>
                      columns={2}
                      value={c.cardImageFit ?? (variant === 'badge_tile' || variant === 'store_card' ? 'contain' : 'cover')}
                      onChange={(fit) => updateContent({ cardImageFit: fit })}
                      options={[
                        { id: 'cover', label: 'Cover' },
                        { id: 'contain', label: 'Utuh' },
                      ]}
                    />
                  </div>
                  <div>
                    <SliderRow
                      label="Lengkung Foto"
                      value={`${c.cardImageRadius ?? 12}px`}
                      min={0}
                      max={48}
                      current={c.cardImageRadius ?? 12}
                      onChange={(val) => updateContent({ cardImageRadius: val })}
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Tipografi & Baris Teks Kartu */}
            {showCardTextFields && (
            <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2">
              <div className="text-[11px] font-bold text-[#17243D]">
                Ukuran Teks Judul &amp; Paragraf Kartu
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SliderRow
                  label="Ukuran Judul"
                  value={c.cardTitleSize ? `${c.cardTitleSize}px` : 'Auto'}
                  min={9}
                  max={30}
                  current={c.cardTitleSize ?? 13}
                  onChange={(val) => updateContent({ cardTitleSize: val })}
                />
                <SliderRow
                  label="Ukuran Subjudul"
                  value={c.cardSubtitleSize ? `${c.cardSubtitleSize}px` : 'Auto'}
                  min={9}
                  max={22}
                  current={c.cardSubtitleSize ?? 11}
                  onChange={(val) => updateContent({ cardSubtitleSize: val })}
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-[#51637D] mb-1">
                    Baris Judul
                  </label>
                  <div className="grid grid-cols-4 gap-0.5">
                    {(
                      [
                        { v: 0, l: 'Auto' },
                        { v: 1, l: '1' },
                        { v: 2, l: '2' },
                        { v: 3, l: '3' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => updateContent({ cardTitleLines: opt.v })}
                        className={`py-1 rounded border text-[10px] font-semibold cursor-pointer ${
                          (c.cardTitleLines ?? 0) === opt.v
                            ? 'bg-[#17243D] text-white border-[#17243D]'
                            : 'bg-white text-[#17243D] border-[#DCE5EF]'
                        }`}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#51637D] mb-1">
                    Baris Subjudul
                  </label>
                  <div className="grid grid-cols-4 gap-0.5">
                    {(
                      [
                        { v: 0, l: 'Auto' },
                        { v: 1, l: '1' },
                        { v: 2, l: '2' },
                        { v: 3, l: '3' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.v}
                        type="button"
                        onClick={() => updateContent({ cardSubtitleLines: opt.v })}
                        className={`py-1 rounded border text-[10px] font-semibold cursor-pointer ${
                          (c.cardSubtitleLines ?? 0) === opt.v
                            ? 'bg-[#17243D] text-white border-[#17243D]'
                            : 'bg-white text-[#17243D] border-[#DCE5EF]'
                        }`}
                      >
                        {opt.l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <SliderRow
                  label="Jarak Antar Teks"
                  value={`${c.cardTextGap ?? 4}px`}
                  min={0}
                  max={20}
                  current={c.cardTextGap ?? 4}
                  onChange={(val) => updateContent({ cardTextGap: val })}
                />
                <SliderRow
                  label="Jarak Huruf"
                  value={`${(c.cardLetterSpacing ?? 0).toFixed(1)}px`}
                  min={-1}
                  max={5}
                  step={0.5}
                  current={c.cardLetterSpacing ?? 0}
                  onChange={(val) => updateContent({ cardLetterSpacing: val })}
                />
              </div>
            </div>
            )}

            {showCardTextFields && variant === 'store_card' && (
              <div className="space-y-2 p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Harga Produk
                  </label>
                  <input
                    type="text"
                    value={c.cardPrice ?? 'Rp. 80.000,-'}
                    onChange={(e) => updateContent({ cardPrice: e.target.value })}
                    className="w-full px-2 py-1.5 text-xs rounded border border-[#DCE5EF] bg-white tabular-nums"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-[#17243D]">
                    Ikon Play Pojok Kanan
                  </span>
                  <ToggleSwitch
                    checked={c.cardShowPlayIcon !== false}
                    onChange={(val) => updateContent({ cardShowPlayIcon: val })}
                    label="Ikon Play"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-medium text-[#17243D]">
                    Tombol Keranjang (- 1 +)
                  </span>
                  <ToggleSwitch
                    checked={Boolean(c.cardEnableCart)}
                    onChange={(val) => updateContent({ cardEnableCart: val })}
                    label="Aktifkan Keranjang"
                  />
                </div>
                {c.cardEnableCart && (
                  <div>
                    <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                      No. WhatsApp Checkout
                    </label>
                    <input
                      type="text"
                      value={c.cardWhatsappNumber ?? '6281234567890'}
                      onChange={(e) => updateContent({ cardWhatsappNumber: e.target.value })}
                      className="w-full px-2 py-1 text-xs rounded border border-[#DCE5EF] bg-white tabular-nums"
                    />
                  </div>
                )}
              </div>
            )}

            {variant === 'activity_post' && (
              <div className="space-y-2 p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                      Tanggal
                    </label>
                    <input
                      type="text"
                      value={c.cardDate ?? '18/02/2026'}
                      onChange={(e) => updateContent({ cardDate: e.target.value })}
                      className="w-full px-2 py-1 text-xs rounded border border-[#DCE5EF] bg-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                      Jumlah Views
                    </label>
                    <input
                      type="text"
                      value={c.cardViews ?? '200'}
                      onChange={(e) => updateContent({ cardViews: e.target.value })}
                      className="w-full px-2 py-1 text-xs rounded border border-[#DCE5EF] bg-white tabular-nums"
                    />
                  </div>
                </div>
                <div className="space-y-1.5 pt-1 border-t border-[#DCE5EF]">
                  <div className="text-[11px] font-bold text-[#17243D]">
                    Galeri Foto ({galleryImages.length})
                  </div>
                  {galleryImages.map((imgUrl, idx) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <input
                        type="url"
                        value={imgUrl}
                        placeholder="URL gambar..."
                        onChange={(e) => {
                          const next = [...galleryImages];
                          next[idx] = e.target.value;
                          updateContent({ cardGalleryImages: next });
                        }}
                        className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateContent({
                            cardGalleryImages: galleryImages.filter((_, i) => i !== idx),
                          })
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
                      updateContent({
                        cardGalleryImages: [
                          ...galleryImages,
                          SAMPLE_CAROUSEL_IMAGES[galleryImages.length % SAMPLE_CAROUSEL_IMAGES.length],
                        ],
                      })
                    }
                    className="w-full py-1 rounded border border-dashed border-[#00C98A] text-[11px] font-semibold text-[#17243D] cursor-pointer"
                  >
                    + Tambah Foto Galeri
                  </button>
                </div>
              </div>
            )}

            {showCardFeeFields && variant === 'membership_ticket' && (
              <div className="space-y-2 p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
                <div className="text-[11px] font-bold text-[#17243D]">Rincian Biaya</div>
                {feeItems.map((fee, idx) => (
                  <div key={idx} className="flex items-center gap-1.5">
                    <input
                      type="text"
                      value={fee.label}
                      placeholder="Label"
                      onChange={(e) => {
                        const next = feeItems.map((it, i) =>
                          i === idx ? { ...it, label: e.target.value } : it
                        );
                        updateContent({ cardFeeItems: next });
                      }}
                      className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                    />
                    <input
                      type="text"
                      value={fee.value}
                      placeholder="Rp. 100.000"
                      onChange={(e) => {
                        const next = feeItems.map((it, i) =>
                          i === idx ? { ...it, value: e.target.value } : it
                        );
                        updateContent({ cardFeeItems: next });
                      }}
                      className="w-24 px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white tabular-nums"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        updateContent({ cardFeeItems: feeItems.filter((_, i) => i !== idx) })
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
                    updateContent({
                      cardFeeItems: [
                        ...feeItems,
                        { id: createId('fee'), label: 'Biaya Lain', value: 'Rp. 50.000' },
                      ],
                    })
                  }
                  className="w-full py-1 rounded border border-dashed border-[#00C98A] text-[11px] font-semibold text-[#17243D] cursor-pointer"
                >
                  + Tambah Baris Biaya
                </button>
                <div className="grid grid-cols-2 gap-1.5 pt-1 border-t border-[#DCE5EF]">
                  <input
                    type="text"
                    value={c.cardTotalLabel ?? 'Total'}
                    placeholder="Label Total"
                    onChange={(e) => updateContent({ cardTotalLabel: e.target.value })}
                    className="px-2 py-1 text-[11px] font-semibold rounded border border-[#DCE5EF] bg-white"
                  />
                  <input
                    type="text"
                    value={c.cardTotalValue ?? 'Rp. 500.000,-'}
                    placeholder="Nilai Total"
                    onChange={(e) => updateContent({ cardTotalValue: e.target.value })}
                    className="px-2 py-1 text-[11px] font-bold rounded border border-[#DCE5EF] bg-white tabular-nums"
                  />
                </div>
              </div>
            )}

            {showCardColorsAndLink && (
              <>
            <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2">
              <div className="text-[11px] font-bold text-[#17243D]">Warna & Gradasi Kartu</div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-[#8FA4BF] mb-0.5">
                    Gradasi Awal / Utama
                  </label>
                  <input
                    type="color"
                    value={c.cardGradientFrom ?? '#F59E0B'}
                    onChange={(e) => updateContent({ cardGradientFrom: e.target.value })}
                    className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#8FA4BF] mb-0.5">
                    Gradasi Akhir
                  </label>
                  <input
                    type="color"
                    value={c.cardGradientTo ?? '#D97706'}
                    onChange={(e) => updateContent({ cardGradientTo: e.target.value })}
                    className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#8FA4BF] mb-0.5">
                    Warna Aksen / Strip
                  </label>
                  <input
                    type="color"
                    value={c.cardAccentColor ?? '#2563EB'}
                    onChange={(e) => updateContent({ cardAccentColor: e.target.value })}
                    className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#8FA4BF] mb-0.5">
                    Warna Teks
                  </label>
                  <input
                    type="color"
                    value={c.cardTextColor ?? '#FFFFFF'}
                    onChange={(e) => updateContent({ cardTextColor: e.target.value })}
                    className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                  />
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                  Label Tautan
                </label>
                <input
                  type="text"
                  value={c.cardMoreLabel ?? 'Selengkapnya'}
                  onChange={(e) => updateContent({ cardMoreLabel: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                  URL Tautan (Opsional)
                </label>
                <input
                  type="url"
                  value={c.cardActionUrl ?? ''}
                  placeholder="https://..."
                  onChange={(e) => updateContent({ cardActionUrl: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
            </div>
              </>
            )}
          </div>
        );
      }

      case 'back_button':
        return (
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                {label('konten.main.label.labelTombolKembali', 'Label Tombol Kembali')}
              </label>
              <input
                type="text"
                value={c.backButtonLabel ?? 'Kembali'}
                onChange={(e) => updateContent({ backButtonLabel: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Ikon Tombol Kembali
              </label>
              <IconPicker
                selectedIcon={c.backButtonIcon ?? 'arrow-left'}
                iconUrl={c.buttonIconUrl ?? ''}
                accentVariant="emerald"
                onSelectIcon={(icon) => updateContent({ backButtonIcon: icon })}
                onChangeIconUrl={(url) => updateContent({ buttonIconUrl: url })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Tujuan Saat Diklik
              </label>
              <select
                value={c.backTargetPageId ?? ''}
                onChange={(e) => updateContent({ backTargetPageId: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white text-[#17243D]"
              >
                <option value="">Otomatis Kembali ke Halaman Sebelumnya</option>
                <option value="home">Kembali ke Beranda (Utama)</option>
                {pages.map((pg) => (
                  <option key={pg.id} value={pg.id}>
                    Ke Halaman: {pg.title}
                  </option>
                ))}
              </select>
            </div>
          </div>
        );

      default:
        return null;
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

  const renderDataItemsSection = (): { badge?: string | number; body: React.ReactNode } | null => {
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
                {isVisible('konten.desc.produkKosong') && (
                  <SectionEmptyNote
                    message={label('konten.desc.produkKosong', 'Item produk tidak ditemukan.')}
                  />
                )}
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
                  {label('konten.items.label.namaProduk', 'Nama Produk')}
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
                  {label('konten.items.label.ringkasanItem', 'Ringkasan')}
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
                    {label('konten.items.label.hargaItem', 'Harga')}
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
                  <div className="space-y-1.5">
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
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] font-medium text-[#64748B]">
                        Status Kolom Waktu
                      </span>
                      <button
                        type="button"
                        onClick={() => updateOpt({ arrivalTimeRequired: !opt.arrivalTimeRequired })}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                          opt.arrivalTimeRequired
                            ? 'bg-[#17243D] text-white border-[#17243D]'
                            : 'bg-white text-[#64748B] border-[#DCE5EF]'
                        }`}
                      >
                        {opt.arrivalTimeRequired ? 'Wajib Isi' : 'Tidak Wajib'}
                      </button>
                    </div>
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
                  <div className="space-y-1.5">
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
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] font-medium text-[#64748B]">
                        Status Kolom Jumlah Orang
                      </span>
                      <button
                        type="button"
                        onClick={() => updateOpt({ guestCountRequired: !opt.guestCountRequired })}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                          opt.guestCountRequired
                            ? 'bg-[#17243D] text-white border-[#17243D]'
                            : 'bg-white text-[#64748B] border-[#DCE5EF]'
                        }`}
                      >
                        {opt.guestCountRequired ? 'Wajib Isi' : 'Tidak Wajib'}
                      </button>
                    </div>
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
                    <div className="flex items-center justify-between gap-2 pb-1">
                      <span className="text-[10.5px] font-medium text-[#64748B]">
                        Status Checklist
                      </span>
                      <button
                        type="button"
                        onClick={() => updateOpt({ checklistRequired: !opt.checklistRequired })}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                          opt.checklistRequired
                            ? 'bg-[#17243D] text-white border-[#17243D]'
                            : 'bg-white text-[#64748B] border-[#DCE5EF]'
                        }`}
                      >
                        {opt.checklistRequired ? 'Wajib Dicentang' : 'Tidak Wajib'}
                      </button>
                    </div>
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
                    <div className="flex items-center gap-1.5">
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
                        className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateContent({
                            catalogCustomerFields: customerFields.map((it, i) =>
                              i === fIdx ? { ...it, required: !it.required } : it
                            ),
                          })
                        }
                        className={`shrink-0 px-2 py-1 rounded text-[10px] font-bold border cursor-pointer transition-colors ${
                          field.required
                            ? 'bg-[#17243D] text-white border-[#17243D]'
                            : 'bg-white text-[#64748B] border-[#DCE5EF]'
                        }`}
                      >
                        {field.required ? 'Wajib Isi' : 'Tidak Wajib'}
                      </button>
                    </div>
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
      const customerFields = resolveCatalogCustomerFields(c);
      const shippingOpts = resolveCatalogShippingOptions(c);
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
                    {label('konten.items.label.namaMenu', 'Nama Menu')}
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
                    {label('konten.items.label.hargaItem', 'Harga')}
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

      if (editingItemKey?.startsWith('fnb_ship:')) {
        const optId = editingItemKey.slice('fnb_ship:'.length) as ShippingMethodId;
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
                  <div className="space-y-1.5">
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
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] font-medium text-[#64748B]">
                        Status Kolom Waktu
                      </span>
                      <button
                        type="button"
                        onClick={() => updateOpt({ arrivalTimeRequired: !opt.arrivalTimeRequired })}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                          opt.arrivalTimeRequired
                            ? 'bg-[#17243D] text-white border-[#17243D]'
                            : 'bg-white text-[#64748B] border-[#DCE5EF]'
                        }`}
                      >
                        {opt.arrivalTimeRequired ? 'Wajib Isi' : 'Tidak Wajib'}
                      </button>
                    </div>
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
                  <div className="space-y-1.5">
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
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] font-medium text-[#64748B]">
                        Status Kolom Jumlah Orang
                      </span>
                      <button
                        type="button"
                        onClick={() => updateOpt({ guestCountRequired: !opt.guestCountRequired })}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                          opt.guestCountRequired
                            ? 'bg-[#17243D] text-white border-[#17243D]'
                            : 'bg-white text-[#64748B] border-[#DCE5EF]'
                        }`}
                      >
                        {opt.guestCountRequired ? 'Wajib Isi' : 'Tidak Wajib'}
                      </button>
                    </div>
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
                    <div className="flex items-center justify-between gap-2 pb-1">
                      <span className="text-[10.5px] font-medium text-[#64748B]">
                        Status Checklist
                      </span>
                      <button
                        type="button"
                        onClick={() => updateOpt({ checklistRequired: !opt.checklistRequired })}
                        className={`px-2 py-0.5 rounded text-[10px] font-bold border cursor-pointer ${
                          opt.checklistRequired
                            ? 'bg-[#17243D] text-white border-[#17243D]'
                            : 'bg-white text-[#64748B] border-[#DCE5EF]'
                        }`}
                      >
                        {opt.checklistRequired ? 'Wajib Dicentang' : 'Tidak Wajib'}
                      </button>
                    </div>
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

      return {
        badge: items.length,
        body: (
          <div className="space-y-2.5">
            <div className="grid grid-cols-3 gap-1 p-1 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
              {(
                [
                  { id: 'menu', label: `Menu (${items.length})` },
                  { id: 'customer', label: `Pemesan (${customerFields.length})` },
                  { id: 'shipping', label: `Kirim (${shippingOpts.length})` },
                ] as const
              ).map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setFnbSubList(tab.id)}
                  className={`py-1 px-1 rounded text-[10.5px] font-semibold cursor-pointer truncate ${
                    fnbSubList === tab.id
                      ? 'bg-[#17243D] text-white'
                      : 'text-[#8FA4BF] hover:text-[#17243D]'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {fnbSubList === 'menu' && (
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
            )}

            {fnbSubList === 'customer' && (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      updateContent({
                        catalogCustomerFields: getDefaultCustomerFields('physical'),
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
                    <div className="flex items-center gap-1.5">
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
                        className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateContent({
                            catalogCustomerFields: customerFields.map((it, i) =>
                              i === fIdx ? { ...it, required: !it.required } : it
                            ),
                          })
                        }
                        className={`shrink-0 px-2 py-1 rounded text-[10px] font-bold border cursor-pointer transition-colors ${
                          field.required
                            ? 'bg-[#17243D] text-white border-[#17243D]'
                            : 'bg-white text-[#64748B] border-[#DCE5EF]'
                        }`}
                      >
                        {field.required ? 'Wajib Isi' : 'Tidak Wajib'}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {fnbSubList === 'shipping' && (
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
                    onClick={() => setEditingItemKey(`fnb_ship:${opt.id}`)}
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
                      onEdit={() => setEditingItemKey(`fnb_ship:${opt.id}`)}
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
                <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
                  <span className="text-[11px] font-semibold text-[#17243D]">
                    Status Checklist Berkas
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      updateContent({ trainingChecklistRequired: !c.trainingChecklistRequired })
                    }
                    className={`px-2 py-0.5 rounded text-[10.5px] font-bold border cursor-pointer transition-colors ${
                      c.trainingChecklistRequired
                        ? 'bg-[#17243D] text-white border-[#17243D]'
                        : 'bg-white text-[#64748B] border-[#DCE5EF]'
                    }`}
                  >
                    {c.trainingChecklistRequired ? 'Wajib Dicentang' : 'Tidak Wajib'}
                  </button>
                </div>
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
                    <div className="flex items-center gap-1.5">
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
                        className="flex-1 min-w-0 px-2 py-1 text-[10.5px] rounded border border-[#DCE5EF] bg-white"
                      />
                      <button
                        type="button"
                        onClick={() =>
                          updateContent({
                            trainingFormFields: formFields.map((it, i) =>
                              i === fIdx ? { ...it, required: !it.required } : it
                            ),
                          })
                        }
                        className={`shrink-0 px-2 py-1 rounded text-[10px] font-bold border cursor-pointer transition-colors ${
                          field.required
                            ? 'bg-[#17243D] text-white border-[#17243D]'
                            : 'bg-white text-[#64748B] border-[#DCE5EF]'
                        }`}
                      >
                        {field.required ? 'Wajib Isi' : 'Tidak Wajib'}
                      </button>
                    </div>
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
                  {label('konten.items.label.judulFoto', 'Judul Foto')}
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
            <div className="p-2 rounded-lg bg-[#F8FBFE] border border-[#DCE5EF] space-y-1.5">
              <div className="text-[10.5px] font-bold text-[#5B708B]">
                Opsi Tampilan Slide
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#17243D]">
                  Tampilkan Titik Slide (Dots)
                </span>
                <ToggleSwitch
                  checked={c.carouselShowDots !== false}
                  onChange={(v) => updateContent({ carouselShowDots: v })}
                  label="Tampilkan atau sembunyikan titik indikator slide carousel"
                />
              </div>
              {c.carouselShowDots !== false && (
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  {([
                    { id: 'below', label: 'Di Bawah Foto' },
                    { id: 'overlay', label: 'Mengambang di Atas Foto' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateContent({ carouselDotsPosition: opt.id })}
                      className={`py-1 px-2 rounded-lg text-[10.5px] font-semibold border cursor-pointer ${
                        (c.carouselDotsPosition ?? 'below') === opt.id
                          ? 'bg-[#17243D] text-white border-[#17243D]'
                          : 'bg-white text-[#17243D] border-[#DCE5EF] hover:bg-[#F0F5FA]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#17243D]">
                  Tampilkan Tombol Panah
                </span>
                <ToggleSwitch
                  checked={c.carouselShowArrows !== false}
                  onChange={(v) => updateContent({ carouselShowArrows: v })}
                  label="Tampilkan atau sembunyikan tombol navigasi panah dan nomor slide"
                />
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#17243D]">
                  Tampilkan Scrollbar
                </span>
                <ToggleSwitch
                  checked={Boolean(c.carouselShowScrollbar)}
                  onChange={(v) => updateContent({ carouselShowScrollbar: v })}
                  label="Tampilkan atau sembunyikan garis scrollbar horizontal carousel"
                />
              </div>
            </div>
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
                  {label('konten.items.label.platformSosmed', 'Platform')}
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

              {/* Opsi Tombol Dropdown Postingan (Foto / Video Embed) */}
              <div className="p-2.5 rounded-lg bg-[#F8FBFE] border border-[#DCE5EF] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-[11px] font-bold text-[#17243D]">
                      Tombol Dropdown Postingan
                    </div>
                    <div className="text-[10px] text-[#64748B]">
                      Tampilkan / embed postingan foto atau video di dalam kartu
                    </div>
                  </div>
                  <ToggleSwitch
                    checked={Boolean(acc.showPostsDropdown)}
                    onChange={(v) => {
                      const existingPosts = acc.posts ?? [];
                      updateAcc(acc.id, {
                        showPostsDropdown: v,
                        postsDropdownLabel: acc.postsDropdownLabel || 'Lihat Postingan',
                        posts:
                          v && existingPosts.length === 0
                            ? [
                                {
                                  id: createId('sfap'),
                                  mediaType: 'image',
                                  imageUrl: SAMPLE_CAROUSEL_IMAGES[0],
                                  videoUrl: '',
                                  caption: 'Contoh postingan terbaru dari akun ini.',
                                  url: acc.accountUrl || '',
                                },
                              ]
                            : existingPosts,
                      });
                    }}
                    label="Aktifkan tombol dropdown postingan"
                  />
                </div>

                {acc.showPostsDropdown && (() => {
                  const accPosts = acc.posts ?? [];
                  const updateAccPost = (postId: string, patch: Partial<SocialPostItem>) => {
                    updateAcc(acc.id, {
                      posts: accPosts.map((p) => (p.id === postId ? { ...p, ...patch } : p)),
                    });
                  };
                  const addAccPost = (mediaType: 'image' | 'video') => {
                    const nextPost: SocialPostItem = {
                      id: createId('sfap'),
                      mediaType,
                      imageUrl:
                        SAMPLE_CAROUSEL_IMAGES[accPosts.length % SAMPLE_CAROUSEL_IMAGES.length],
                      videoUrl: '',
                      caption:
                        mediaType === 'video'
                          ? `Video embed #${accPosts.length + 1}`
                          : `Postingan foto #${accPosts.length + 1}`,
                      url: '',
                    };
                    updateAcc(acc.id, { posts: [...accPosts, nextPost] });
                  };
                  return (
                    <div className="space-y-2 pt-1.5 border-t border-[#DCE5EF]">
                      <div className="grid grid-cols-2 gap-1.5">
                        <div className="space-y-1">
                          <label className="block text-[10px] font-semibold text-[#5B708B]">
                            Teks Tombol Dropdown
                          </label>
                          <input
                            type="text"
                            value={acc.postsDropdownLabel ?? 'Lihat Postingan'}
                            placeholder="Lihat Postingan"
                            onChange={(e) =>
                              updateAcc(acc.id, { postsDropdownLabel: e.target.value })
                            }
                            className="w-full px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-[10px] font-semibold text-[#5B708B]">
                            Rasio Media
                          </label>
                          <select
                            value={acc.postsRatio ?? '4/5'}
                            onChange={(e) =>
                              updateAcc(acc.id, {
                                postsRatio: e.target.value as
                                  | '1/1'
                                  | '4/5'
                                  | '3/4'
                                  | '16/9'
                                  | '9/16',
                              })
                            }
                            className="w-full px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                          >
                            <option value="1/1">1:1 (Persegi)</option>
                            <option value="4/5">4:5 (Potret IG)</option>
                            <option value="3/4">3:4 (Potret)</option>
                            <option value="16/9">16:9 (Video / YouTube)</option>
                            <option value="9/16">9:16 (Reels / TikTok)</option>
                          </select>
                        </div>
                      </div>

                      <div className="flex items-center justify-between gap-2">
                        <span className="text-[10.5px] font-semibold text-[#17243D]">
                          Terbuka secara Default
                        </span>
                        <ToggleSwitch
                          checked={Boolean(acc.postsDefaultOpen)}
                          onChange={(v) => updateAcc(acc.id, { postsDefaultOpen: v })}
                          label="Buka dropdown postingan secara default"
                        />
                      </div>

                      <div className="grid grid-cols-2 gap-1.5">
                        <button
                          type="button"
                          onClick={() => addAccPost('image')}
                          className="inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#17243D] text-white text-[11px] font-semibold cursor-pointer"
                        >
                          <ImageIcon className="w-3.5 h-3.5 text-[#00C98A]" />
                          <span>+ Foto</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => addAccPost('video')}
                          className="inline-flex items-center justify-center gap-1 py-1.5 rounded-lg bg-[#0F172A] text-white text-[11px] font-semibold cursor-pointer"
                        >
                          <Video className="w-3.5 h-3.5 text-[#00C98A]" />
                          <span>+ Video Embed</span>
                        </button>
                      </div>

                      {accPosts.length === 0 ? (
                        <div className="text-[11px] text-[#64748B] text-center py-2 bg-white rounded border border-dashed border-[#CBD5E1]">
                          Belum ada postingan. Klik + Foto atau + Video Embed di atas.
                        </div>
                      ) : (
                        <div className="space-y-2">
                          {accPosts.map((post, pIdx) => (
                            <div
                              key={post.id}
                              className="p-2 rounded-lg bg-white border border-[#DCE5EF] space-y-2"
                            >
                              <div className="flex items-center justify-between gap-2">
                                <span className="text-[11px] font-bold text-[#17243D]">
                                  Postingan #{pIdx + 1}
                                </span>
                                <div className="inline-flex items-center gap-1">
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateAccPost(post.id, { mediaType: 'image' })
                                    }
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                                      (post.mediaType ?? 'image') === 'image'
                                        ? 'bg-[#17243D] text-white border-[#17243D]'
                                        : 'bg-[#F8FBFE] text-[#475569] border-[#DCE5EF]'
                                    }`}
                                  >
                                    Foto
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateAccPost(post.id, { mediaType: 'video' })
                                    }
                                    className={`px-2 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                                      post.mediaType === 'video'
                                        ? 'bg-[#17243D] text-white border-[#17243D]'
                                        : 'bg-[#F8FBFE] text-[#475569] border-[#DCE5EF]'
                                    }`}
                                  >
                                    Video
                                  </button>
                                  <button
                                    type="button"
                                    title="Hapus postingan"
                                    onClick={() =>
                                      updateAcc(acc.id, {
                                        posts: accPosts.filter((p) => p.id !== post.id),
                                      })
                                    }
                                    className="p-1 rounded text-rose-500 hover:bg-rose-50 cursor-pointer"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>

                              {post.mediaType === 'video' && (
                                <input
                                  type="url"
                                  value={post.videoUrl ?? ''}
                                  placeholder="URL Video (YouTube, TikTok, Reels, FB, atau MP4)"
                                  onChange={(e) =>
                                    updateAccPost(post.id, { videoUrl: e.target.value })
                                  }
                                  className="w-full px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-[#F8FBFE]"
                                />
                              )}

                              <MediaSourceInput
                                label={
                                  post.mediaType === 'video'
                                    ? 'Thumbnail Video (Opsional)'
                                    : 'Foto Postingan'
                                }
                                value={post.imageUrl}
                                previewFallback={CAROUSEL_SAMPLE_1_SVG}
                                onChangeUrl={(url) =>
                                  updateAccPost(post.id, {
                                    imageUrl:
                                      url ||
                                      SAMPLE_CAROUSEL_IMAGES[
                                        pIdx % SAMPLE_CAROUSEL_IMAGES.length
                                      ],
                                  })
                                }
                                onUploadFile={(f) =>
                                  handleCompressAndSet(
                                    f,
                                    { maxDimension: 1080, quality: 0.82 },
                                    (blk, url) => ({
                                      ...blk,
                                      content: {
                                        ...blk.content,
                                        socialFollowerAccounts: (
                                          blk.content.socialFollowerAccounts ?? []
                                        ).map((a) =>
                                          a.id === acc.id
                                            ? {
                                                ...a,
                                                posts: (a.posts ?? []).map((p) =>
                                                  p.id === post.id
                                                    ? { ...p, imageUrl: url }
                                                    : p
                                                ),
                                              }
                                            : a
                                        ),
                                      },
                                    })
                                  )
                                }
                              />

                              <input
                                type="text"
                                value={post.caption}
                                placeholder="Caption singkat (opsional)..."
                                onChange={(e) =>
                                  updateAccPost(post.id, { caption: e.target.value })
                                }
                                className="w-full px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                              />
                              <input
                                type="url"
                                value={post.url ?? ''}
                                placeholder="Tautan ke postingan asli (opsional)"
                                onChange={(e) =>
                                  updateAccPost(post.id, { url: e.target.value })
                                }
                                className="w-full px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                              />
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })()}
              </div>
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
            <div className="p-2 rounded-lg bg-[#F8FBFE] border border-[#DCE5EF] space-y-1.5">
              <div className="text-[10.5px] font-bold text-[#5B708B]">
                Opsi Titik Slide (Dots)
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#17243D]">
                  Tampilkan Titik Slide
                </span>
                <ToggleSwitch
                  checked={c.socialFeedShowDots !== false}
                  onChange={(v) => updateContent({ socialFeedShowDots: v })}
                  label="Tampilkan atau sembunyikan titik indikator slide postingan"
                />
              </div>
              {c.socialFeedShowDots !== false && (
                <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                  {([
                    { id: 'below', label: 'Di Bawah Foto' },
                    { id: 'overlay', label: 'Mengambang di Atas Foto' },
                  ] as const).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => updateContent({ socialFeedDotsPosition: opt.id })}
                      className={`py-1 px-2 rounded-lg text-[10.5px] font-semibold border cursor-pointer ${
                        (c.socialFeedDotsPosition ?? 'below') === opt.id
                          ? 'bg-[#17243D] text-white border-[#17243D]'
                          : 'bg-white text-[#17243D] border-[#DCE5EF] hover:bg-[#F0F5FA]'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
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
                  {label('konten.items.label.labelTombolKategori', 'Label Tombol')}
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
                  {label('konten.items.label.tujuanGulirKategori', 'Judul Tujuan Gulir')}
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
            {(c.categoryScrollMode ?? 'vertical') !== 'wrap' && (
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#F8FBFE] border border-[#DCE5EF]">
                <span className="text-[11px] font-semibold text-[#17243D]">
                  Tampilkan Scrollbar
                </span>
                <ToggleSwitch
                  checked={Boolean(c.categoryShowScrollbar)}
                  onChange={(v) => updateContent({ categoryShowScrollbar: v })}
                  label="Tampilkan atau sembunyikan garis scrollbar daftar kategori"
                />
              </div>
            )}
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

    // Helper bersama: daftar alat lengkap (19 elemen) + pencarian Template Blok & Card untuk seluruh wadah Data & Daftar Item
    const renderUniversalContainerPicker = (opts: {
      disabled?: boolean;
      excludeHeroTemplates?: boolean;
      onAddTool: (toolType: BlockType) => void;
      onAddTemplate: (sectionId: string) => void;
    }) => {
      const baseTemplates = opts.excludeHeroTemplates
        ? PREBUILT_SECTIONS.filter(
            (sec) =>
              sec.id !== 'hero-profil-kompak' &&
              sec.id !== 'hero-profil-banner' &&
              sec.id !== 'hero-profile'
          )
        : PREBUILT_SECTIONS;
      const q = heroTemplateSearch.trim().toLowerCase();
      const filteredTemplates = q
        ? baseTemplates.filter(
            (sec) =>
              sec.title.toLowerCase().includes(q) || sec.description.toLowerCase().includes(q)
          )
        : baseTemplates;

      return (
        <>
          {/* + Tambah Elemen ke Wadah (Semua Alat Standar) */}
          <div>
            <div className="text-[11px] font-semibold text-[#17243D] mb-1.5">
              {label('konten.field.tambahElemenWadah', '+ Tambah Elemen ke Wadah')}
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {TOOL_ITEMS.map((tool) => (
                <button
                  key={tool.key}
                  type="button"
                  disabled={opts.disabled}
                  onClick={() => opts.onAddTool(tool.type)}
                  title={tool.desc}
                  className="group inline-flex items-center gap-1.5 py-1.5 px-2 rounded-lg bg-white border border-[#DCE5EF] hover:border-[#00C98A] hover:bg-[#ECFDF6]/60 text-[11px] font-medium text-[#17243D] text-left transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <span className="text-[#5B708B] group-hover:text-[#008F63] shrink-0">
                    {tool.icon}
                  </span>
                  <span className="truncate">
                    {label(`alat.item.${tool.key}.label`, tool.label)}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Template Blok & Card */}
          <div className="pt-2 border-t border-[#DCE5EF] space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-semibold text-[#5B708B]">
                Template Blok &amp; Card ({filteredTemplates.length})
              </span>
            </div>

            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#8FA4BF] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={heroTemplateSearch}
                onChange={(e) => setHeroTemplateSearch(e.target.value)}
                placeholder="Cari template blok..."
                className="w-full pl-8 pr-7 py-1.5 text-[11px] rounded-lg border border-[#DCE5EF] bg-white text-[#17243D] placeholder:text-[#8FA4BF] focus:border-[#00C98A] outline-none"
              />
              {heroTemplateSearch && (
                <button
                  type="button"
                  onClick={() => setHeroTemplateSearch('')}
                  aria-label="Hapus pencarian"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-[#8FA4BF] hover:text-[#17243D] cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="max-h-64 overflow-y-auto space-y-1.5 pr-0.5">
              {filteredTemplates.length === 0 ? (
                <SectionEmptyNote message="Template tidak ditemukan untuk kata kunci tersebut." />
              ) : (
                filteredTemplates.map((sec) => (
                  <button
                    key={sec.id}
                    type="button"
                    disabled={opts.disabled}
                    onClick={() => opts.onAddTemplate(sec.id)}
                    className="group w-full p-2 rounded-lg bg-white border border-[#DCE5EF] hover:border-[#00C98A] hover:bg-[#ECFDF6]/45 flex items-center gap-2.5 text-left transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                  >
                    <div className="w-8 h-8 rounded-lg bg-[#F0F5FA] group-hover:bg-[#ECFDF6] border border-[#DCE5EF] group-hover:border-[#00C98A]/40 flex items-center justify-center text-[#5B708B] group-hover:text-[#008F63] shrink-0 transition-colors">
                      {getSectionIcon(sec.id)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] font-bold text-[#17243D] truncate">
                        {label(`blok.sec.${sec.id}.title`, sec.title)}
                      </div>
                      <div className="text-[10px] text-[#8FA4BF] truncate">
                        {label(`blok.sec.${sec.id}.desc`, sec.description)}
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>
        </>
      );
    };

    const appendTemplateToBlock = (sectionId: string, maxItems?: number) => {
      const sec = PREBUILT_SECTIONS.find((item) => item.id === sectionId);
      if (!sec) return;
      const createdBlocks = sec.createBlocks(theme);
      if (!createdBlocks.length) return;
      onUpdateBlock(selectedBlock.id, (blk) => {
        const current = blk.children ?? [];
        const remaining =
          typeof maxItems === 'number'
            ? Math.max(0, maxItems - current.length)
            : createdBlocks.length;
        if (remaining <= 0) return blk;
        return {
          ...blk,
          children: [...current, ...createdBlocks.slice(0, remaining)],
        };
      });
    };

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

      const makeEmptySlide = (idx: number): BuilderBlock => ({
        id: createId('slide'),
        type: 'container',
        label: `Slide ${idx}`,
        style: {
          ...DEFAULT_STYLE,
          widthPercent: 100,
          minHeight: Math.max(96, rowColMinH || 110),
          padding: 12,
          marginBottom: 0,
          borderRadius: 16,
          borderWidth: 1,
          borderColor: theme.borderColor,
          backgroundColor: theme.cardBg,
          textColor: theme.textColor,
          shadow: 'sm',
          hoverLift: false,
          align: 'left',
        },
        content: {},
        children: [],
      });

      const canAddMore = rowChildren.length < 20;
      const isRowHorizontal = (c.rowLayoutMode ?? 'grid') === 'horizontal';

      return {
        badge: rowChildren.length,
        body: (
          <div className="space-y-2.5">
            {/* Opsi Tampilan Slide Horizontal: Hide/Show Scrollbar & Titik Indikator (Dots) */}
            {isRowHorizontal && (
              <div className="p-2 rounded-lg bg-[#F8FBFE] border border-[#DCE5EF] space-y-1.5">
                <div className="text-[10.5px] font-bold text-[#5B708B]">
                  Opsi Tampilan Slide
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[#17243D]">
                    Tampilkan Scrollbar
                  </span>
                  <ToggleSwitch
                    checked={Boolean(c.rowShowScrollbar)}
                    onChange={(v) => updateContent({ rowShowScrollbar: v })}
                    label="Tampilkan atau sembunyikan garis scrollbar horizontal"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[#17243D]">
                    Tampilkan Titik Slide (Dots)
                  </span>
                  <ToggleSwitch
                    checked={c.rowShowDots !== false}
                    onChange={(v) => updateContent({ rowShowDots: v })}
                    label="Tampilkan atau sembunyikan 3 titik indikator progress slide"
                  />
                </div>
                {c.rowShowDots !== false && (
                  <div className="grid grid-cols-2 gap-1.5 pt-0.5">
                    {([
                      { id: 'below', label: 'Di Bawah' },
                      { id: 'overlay', label: 'Mengambang di Atas' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateContent({ rowDotsPosition: opt.id })}
                        className={`py-1 px-2 rounded-lg text-[10.5px] font-semibold border cursor-pointer ${
                          (c.rowDotsPosition ?? 'below') === opt.id
                            ? 'bg-[#17243D] text-white border-[#17243D]'
                            : 'bg-white text-[#17243D] border-[#DCE5EF] hover:bg-[#F0F5FA]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Buat Slide Kosong Horizontal / Vertikal */}
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() => {
                  const next = [...rowChildren];
                  const desired = Math.min(20, Math.max(3, next.length === 0 ? 3 : next.length));
                  while (next.length < desired) next.push(makeEmptySlide(next.length + 1));
                  onUpdateBlock(selectedBlock.id, (blk) => ({
                    ...blk,
                    content: {
                      ...blk.content,
                      rowLayoutMode: 'horizontal',
                      rowColumnWidth: blk.content.rowColumnWidth ?? 160,
                      rowGap: blk.content.rowGap ?? 10,
                    },
                    children: next,
                  }));
                }}
                className="py-1.5 px-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] hover:border-[#00C98A] text-[10.5px] font-bold text-[#17243D] cursor-pointer text-center"
              >
                Slide Kosong Horizontal
              </button>
              <button
                type="button"
                onClick={() => {
                  const next = [...rowChildren];
                  const desired = Math.min(20, Math.max(2, next.length === 0 ? 2 : next.length));
                  while (next.length < desired) next.push(makeEmptySlide(next.length + 1));
                  onUpdateBlock(selectedBlock.id, (blk) => ({
                    ...blk,
                    content: {
                      ...blk.content,
                      rowLayoutMode: 'vertical',
                      rowGap: blk.content.rowGap ?? 10,
                    },
                    children: next,
                  }));
                }}
                className="py-1.5 px-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] hover:border-[#00C98A] text-[10.5px] font-bold text-[#17243D] cursor-pointer text-center"
              >
                Slide Kosong Vertikal
              </button>
            </div>

            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                disabled={!canAddMore}
                onClick={() =>
                  updateRowChildren([...rowChildren, makeEmptySlide(rowChildren.length + 1)])
                }
                className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#17243D] text-white text-[11px] font-semibold disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-3 h-3 text-[#00C98A]" />
                <span>Slide Kosong</span>
              </button>
              <button
                type="button"
                disabled={!canAddMore}
                onClick={() =>
                  updateRowChildren([...rowChildren, makeColCard(rowChildren.length + 1)])
                }
                className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-white border border-[#DCE5EF] text-[11px] font-semibold text-[#17243D] disabled:opacity-40 cursor-pointer"
              >
                <Plus className="w-3 h-3 text-[#00C98A]" />
                <span>Kolom Kotak</span>
              </button>
            </div>

            <div className="space-y-1.5">
              {isVisible('konten.items.title.isiWadah') && (
                <div className="text-[11px] font-semibold text-[#17243D]">
                  {label('konten.items.title.isiWadah', 'Isi Komponen Wadah')} ({rowChildren.length}/20)
                </div>
              )}
              {rowChildren.length === 0 ? (
                <SectionEmptyNote message="Baris ini masih kosong. Pilih elemen atau template blok di bawah untuk menambah kolom / slide." />
              ) : (
                rowChildren.map((child, idx) => (
                  <div
                    key={child.id}
                    onClick={() => onSelectBlock?.(child.id)}
                    className="p-2 rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] flex items-center justify-between gap-2 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#17243D] truncate">
                        {idx + 1}.{' '}
                        {child.label ||
                          label(`komponen.type.${child.type}`, BLOCK_TYPE_NAMES[child.type])}
                      </div>
                      <div className="text-[10.5px] text-[#8FA4BF]">
                        {label(`komponen.type.${child.type}`, BLOCK_TYPE_NAMES[child.type])} · Klik
                        untuk edit
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-0.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        title="Hapus komponen"
                        onClick={() =>
                          updateRowChildren(
                            removeSelectedItemByIdOrIndex(rowChildren, child.id, idx)
                          )
                        }
                        className="p-1 rounded-md text-[#8FA4BF] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                      <ItemOverflowMenu
                        onEdit={() => onSelectBlock?.(child.id)}
                        editLabel="Buka Komponen"
                        onDuplicate={() => {
                          if (rowChildren.length >= 20) return;
                          const dup = cloneBlockDeep(child);
                          dup.label = `${
                            child.label ||
                            label(`komponen.type.${child.type}`, BLOCK_TYPE_NAMES[child.type])
                          } Salinan`;
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
                  </div>
                ))
              )}
            </div>

            {renderUniversalContainerPicker({
              disabled: !canAddMore,
              onAddTool: (toolType) => onAddChildToContainer(selectedBlock.id, toolType),
              onAddTemplate: (sectionId) => appendTemplateToBlock(sectionId, 20),
            })}
          </div>
        ),
      };
    }

    // --- HERO_PROFILE (COMPOSABLE CONTAINER: ISI WADAH + ELEMEN ALAT + TEMPLATE BLOK & CARD) ---
    if (selectedBlock.type === 'hero_profile') {
      const children = selectedBlock.children ?? [];
      const heroVariant = c.heroVariant ?? 'compact';
      const rawChildrenPos = c.heroChildrenPosition ?? 'on_cover';
      const childrenPos: 'on_cover' | 'inside_card' | 'below_card' =
        rawChildrenPos === 'overlap_cover' ? 'on_cover' : rawChildrenPos;

      const appendHeroTool = (childType: BlockType) => {
        const created = createBlock(childType, theme);
        onUpdateBlock(selectedBlock.id, (blk) => ({
          ...blk,
          children: [...(blk.children ?? []), created],
        }));
      };

      return {
        badge: children.length,
        body: (
          <div className="space-y-3" data-hero-container-panel="true">
            {/* Pengaturan Tampilan Isi Wadah Hero */}
            <div className="p-2 rounded-lg bg-[#F8FBFE] border border-[#DCE5EF] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#17243D]">
                  Tampilkan Info Profil Bawaan
                </span>
                <ToggleSwitch
                  checked={!c.heroHideDefaultContent}
                  onChange={(show) => updateContent({ heroHideDefaultContent: !show })}
                  label="Tampilkan logo dan teks profil bawaan Hero"
                />
              </div>

              {heroVariant === 'banner' && (
                <div className="pt-1.5 border-t border-[#E6EEF6] space-y-1">
                  <div className="text-[10.5px] font-semibold text-[#5B708B]">
                    Posisi Isi Wadah
                  </div>
                  <SegmentedControl<'on_cover' | 'inside_card' | 'below_card'>
                    value={childrenPos}
                    onChange={(val) => updateContent({ heroChildrenPosition: val })}
                    options={[
                      { id: 'on_cover', label: 'Di Atas Cover' },
                      { id: 'inside_card', label: 'Dalam Kartu' },
                      { id: 'below_card', label: 'Bawah Kartu' },
                    ]}
                  />
                  {childrenPos === 'on_cover' && (
                    <p className="text-[10px] text-[#5B708B] leading-snug">
                      Lapisan 1: Cover (Background) · Lapisan 2: Data &amp; Daftar Item di atas cover.
                    </p>
                  )}
                </div>
              )}
            </div>

            {/* 1. Isi Komponen Wadah */}
            <div className="space-y-1.5">
              {isVisible('konten.items.title.isiWadah') && (
                <div className="text-[11px] font-semibold text-[#17243D]">
                  {label('konten.items.title.isiWadah', 'Isi Komponen Wadah')}
                </div>
              )}
              {children.length === 0 ? (
                <SectionEmptyNote message="Wadah Profile Hero masih kosong. Pilih elemen atau template blok di bawah untuk menambah isi." />
              ) : (
                children.map((child, idx) => (
                  <div
                    key={child.id}
                    onClick={() => onSelectBlock?.(child.id)}
                    className="p-2 rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] flex items-center justify-between gap-2 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#17243D] truncate">
                        {idx + 1}.{' '}
                        {child.label.trim() ||
                          label(`komponen.type.${child.type}`, BLOCK_TYPE_NAMES[child.type])}
                      </div>
                      <div className="text-[10.5px] text-[#8FA4BF]">
                        {label(`komponen.type.${child.type}`, BLOCK_TYPE_NAMES[child.type])} · Klik
                        untuk edit
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-0.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        title="Hapus komponen"
                        onClick={() =>
                          onUpdateBlock(selectedBlock.id, (blk) => ({
                            ...blk,
                            children: removeSelectedItemByIdOrIndex(
                              blk.children ?? [],
                              child.id,
                              idx
                            ),
                          }))
                        }
                        className="p-1 rounded-md text-[#8FA4BF] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
                  </div>
                ))
              )}
            </div>

            {renderUniversalContainerPicker({
              excludeHeroTemplates: true,
              onAddTool: appendHeroTool,
              onAddTemplate: (sectionId) => appendTemplateToBlock(sectionId),
            })}
          </div>
        ),
      };
    }

    // --- CONTAINER / TOGGLE_CONTAINER / BOTTOM_SHEET / MENU_ICON (SHEET MODE) ---
    if (
      selectedBlock.type === 'container' ||
      selectedBlock.type === 'toggle_container' ||
      selectedBlock.type === 'bottom_sheet' ||
      (selectedBlock.type === 'menu_icon' &&
        (selectedBlock.content.menuIconAction ?? 'sheet') === 'sheet')
    ) {
      const children = selectedBlock.children ?? [];

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
            {(selectedBlock.type === 'bottom_sheet' || selectedBlock.type === 'menu_icon') && (
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
              {isVisible('konten.items.title.isiWadah') && (
                <div className="text-[11px] font-semibold text-[#17243D]">
                  {label('konten.items.title.isiWadah', 'Isi Komponen Wadah')}
                </div>
              )}
              {children.length === 0 ? (
                isVisible('konten.desc.wadahKosong') ? (
                  <SectionEmptyNote
                    message={label(
                      'konten.desc.wadahKosong',
                      'Wadah ini masih kosong. Tambahkan komponen di bawah.'
                    )}
                  />
                ) : null
              ) : (
                children.map((child, idx) => (
                  <div
                    key={child.id}
                    onClick={() => onSelectBlock?.(child.id)}
                    className="p-2 rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] flex items-center justify-between gap-2 cursor-pointer transition-colors"
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-bold text-[#17243D] truncate">
                        {idx + 1}.{' '}
                        {child.label.trim() ||
                          label(`komponen.type.${child.type}`, BLOCK_TYPE_NAMES[child.type])}
                      </div>
                      <div className="text-[10.5px] text-[#8FA4BF]">
                        {label(`komponen.type.${child.type}`, BLOCK_TYPE_NAMES[child.type])} · Klik
                        untuk edit
                      </div>
                    </div>
                    <div
                      className="flex items-center gap-0.5 shrink-0"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        title="Hapus komponen"
                        onClick={() =>
                          onUpdateBlock(selectedBlock.id, (blk) => ({
                            ...blk,
                            children: removeSelectedItemByIdOrIndex(
                              blk.children ?? [],
                              child.id,
                              idx
                            ),
                          }))
                        }
                        className="p-1 rounded-md text-[#8FA4BF] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
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
                  </div>
                ))
              )}
            </div>

            {renderUniversalContainerPicker({
              onAddTool: (toolType) => onAddChildToContainer(selectedBlock.id, toolType),
              onAddTemplate: (sectionId) => appendTemplateToBlock(sectionId),
            })}
          </div>
        ),
      };
    }

    return null;
  };

  // --- 4. TAUTAN & NAVIGASI ---
  const renderNavSection = () => {
    switch (selectedBlock.type) {
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
                {label('konten.nav.label.teksTombolIkuti', 'Teks Tombol Ikuti')}
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
                {label('konten.nav.label.linkProfilAkun', 'Link Profil Akun')}
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
        return isVisible('konten.desc.kategoriNav') ? (
          <SectionEmptyNote
            message={label(
              'konten.desc.kategoriNav',
              'Setiap tombol di daftar Data & Daftar Item otomatis menggulir halaman ke judul target saat diklik pengunjung.'
            )}
          />
        ) : null;

      case 'menu_icon': {
        const action: MenuIconAction = c.menuIconAction ?? 'sheet';
        const sheetPos: MenuIconSheetPosition = c.menuIconSheetPosition ?? 'bottom';
        const targetCandidates = flattenTargetBlocks(allBlocks, selectedBlock.id);
        return (
          <div className="space-y-2.5">
            {action === 'sheet' && (
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  {label('konten.nav.label.judulSheet', 'Judul Panel Sheet')}
                </label>
                <input
                  type="text"
                  value={c.sheetTitle ?? 'Menu Panel'}
                  onChange={(e) => updateContent({ sheetTitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
            )}

            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1.5">
                {label('konten.nav.label.fungsiKlikMenu', 'Fungsi Saat Diklik')}
              </label>
              <div className="grid grid-cols-2 gap-1.5">
                {(
                  [
                    { id: 'sheet' as const, label: 'Tampilkan Sheet' },
                    { id: 'card' as const, label: 'Menuju Card Lain' },
                    { id: 'page' as const, label: 'Buka Halaman Baru' },
                    { id: 'url' as const, label: 'Tautan Link URL' },
                    { id: 'back' as const, label: 'Kembali (Back)' },
                  ] as const
                ).map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => updateContent({ menuIconAction: opt.id })}
                    className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                      action === opt.id
                        ? 'bg-[#17243D] text-white border-[#17243D]'
                        : 'bg-white text-[#17243D] border-[#DCE5EF] hover:border-[#8FA4BF]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {action === 'sheet' && (
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1.5">
                  {label('konten.nav.label.arahSheet', 'Arah Muncul Sheet')}
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {(
                    [
                      { id: 'bottom' as const, label: 'Bawah' },
                      { id: 'right' as const, label: 'Kanan' },
                      { id: 'left' as const, label: 'Kiri' },
                      { id: 'top' as const, label: 'Atas' },
                    ] as const
                  ).map((pos) => (
                    <button
                      key={pos.id}
                      type="button"
                      onClick={() => updateContent({ menuIconSheetPosition: pos.id })}
                      className={`py-1.5 rounded-lg text-[11px] font-semibold border cursor-pointer ${
                        sheetPos === pos.id
                          ? 'bg-[#17243D] text-white border-[#17243D]'
                          : 'bg-[#F0F5FA] text-[#17243D] border-[#DCE5EF] hover:border-[#8FA4BF]'
                      }`}
                    >
                      {pos.label}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {action === 'card' && (
              <div className="space-y-1.5 pt-1 border-t border-[#DCE5EF]">
                <label className="block text-[11px] font-semibold text-[#17243D]">
                  {label('konten.nav.label.pilihCardTujuan', 'Pilih Card / Komponen Tujuan')}
                </label>
                <select
                  value={c.menuIconTargetBlockId ?? ''}
                  onChange={(e) => updateContent({ menuIconTargetBlockId: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white text-[#17243D]"
                >
                  <option value="">-- Pilih card / blok tujuan --</option>
                  {targetCandidates.map((cand, idx) => (
                    <option key={cand.id} value={cand.id}>
                      {cand.depth > 0 ? '↳ '.repeat(cand.depth) : `${idx + 1}. `}
                      {cand.label} ({BLOCK_TYPE_NAMES[cand.type]})
                    </option>
                  ))}
                </select>
              </div>
            )}

            {action === 'page' && (
              <div className="space-y-2 pt-1 border-t border-[#DCE5EF]">
                <label className="block text-[11px] font-semibold text-[#17243D]">
                  {label('konten.nav.label.pilihHalamanTujuan', 'Pilih Halaman Tujuan')}
                </label>
                <select
                  value={c.actionTargetPageId ?? ''}
                  onChange={(e) => updateContent({ actionTargetPageId: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white text-[#17243D]"
                >
                  <option value="">-- Pilih halaman --</option>
                  <option value="home">Beranda (Utama)</option>
                  {pages.map((pg) => (
                    <option key={pg.id} value={pg.id}>
                      {pg.title}
                    </option>
                  ))}
                </select>
                <div className="flex gap-1.5">
                  {onAddSubPage && (
                    <button
                      type="button"
                      onClick={() => {
                        const newId = onAddSubPage();
                        if (newId) updateContent({ actionTargetPageId: newId });
                      }}
                      className="flex-1 py-1.5 px-2 rounded-lg border border-dashed border-[#00C98A] bg-[#ECFDF6] text-[11px] font-bold text-[#0F766E] cursor-pointer"
                    >
                      + Buat Halaman Baru
                    </button>
                  )}
                  {c.actionTargetPageId && c.actionTargetPageId !== 'home' && onSelectSubPage && (
                    <button
                      type="button"
                      onClick={() => onSelectSubPage(c.actionTargetPageId || null)}
                      className="py-1.5 px-2 rounded-lg border border-[#DCE5EF] bg-white text-[11px] font-semibold text-[#17243D] cursor-pointer"
                    >
                      Edit Halaman
                    </button>
                  )}
                </div>
              </div>
            )}

            {action === 'url' && (
              <div className="space-y-1 pt-1 border-t border-[#DCE5EF]">
                <label className="block text-[11px] font-semibold text-[#17243D]">
                  URL Tautan Tujuan
                </label>
                <input
                  type="url"
                  value={c.actionUrl ?? ''}
                  placeholder="https://..."
                  onChange={(e) => updateContent({ actionUrl: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                />
              </div>
            )}
          </div>
        );
      }

      default:
        return null;
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
                    {label('konten.actions.label.namaTokoWa', 'Nama Toko (di Pesan WA)')}
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
                    {label('konten.actions.label.pesanPembukaWa', 'Pesan Pembuka WhatsApp')}
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
                  <span className="text-xs font-medium text-[#17243D]">
                    {label('konten.actions.label.formDataPemesan', 'Form Data Pemesan')}
                  </span>
                  <ToggleSwitch
                    checked={c.catalogAskCustomerInfo ?? true}
                    onChange={(checked) => updateContent({ catalogAskCustomerInfo: checked })}
                    label="Form Data Pemesan"
                  />
                </div>

                {hasPhysicalItem && (
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-[#17243D]">
                      {label('konten.actions.label.opsiPengiriman', 'Opsi Pengiriman')}
                    </span>
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
              <span className="text-xs font-medium text-[#17243D]">
                {label('konten.actions.label.formDataPemesan', 'Form Data Pemesan')}
              </span>
              <ToggleSwitch
                checked={c.catalogAskCustomerInfo !== false}
                onChange={(val) => updateContent({ catalogAskCustomerInfo: val })}
                label="Form Data Pemesan"
              />
            </div>
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-medium text-[#17243D]">
                {label('konten.actions.label.opsiPengiriman', 'Opsi Pengiriman')}
              </span>
              <ToggleSwitch
                checked={c.catalogShippingEnabled !== false}
                onChange={(val) => updateContent({ catalogShippingEnabled: val })}
                label="Opsi Pengiriman"
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

      case 'cart_button':
        return (
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                No. WhatsApp Checkout
              </label>
              <input
                type="text"
                value={c.cartWhatsappNumber ?? '6281234567890'}
                onChange={(e) => updateContent({ cartWhatsappNumber: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white tabular-nums"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Nama Toko (di Pesan WA)
              </label>
              <input
                type="text"
                value={c.cartStoreName ?? ''}
                placeholder="Otomatis pakai nama halaman"
                onChange={(e) => updateContent({ cartStoreName: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
              />
            </div>
            <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#17243D]">
                  Label Keranjang Mengambang
                </span>
                <ToggleSwitch
                  checked={c.cartFloatingEnabled !== false}
                  onChange={(val) => updateContent({ cartFloatingEnabled: val })}
                  label="Label Keranjang Mengambang"
                />
              </div>
              {c.cartFloatingEnabled !== false && (
                <div className="space-y-2 pt-1 border-t border-[#DCE5EF]">
                  <div className="grid grid-cols-3 gap-1.5">
                    <div className="col-span-2">
                      <label className="block text-[10px] font-semibold text-[#64748B] mb-0.5">
                        Teks Label Mengambang
                      </label>
                      <input
                        type="text"
                        value={c.cartFloatingLabel ?? 'Lihat Keranjang'}
                        onChange={(e) => updateContent({ cartFloatingLabel: e.target.value })}
                        className="w-full px-2 py-1 text-xs rounded border border-[#DCE5EF] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#64748B] mb-0.5">
                        Warna
                      </label>
                      <input
                        type="color"
                        value={c.cartFloatingBg || c.cartAccentColor || theme.accentColor || '#059669'}
                        onChange={(e) => updateContent({ cartFloatingBg: e.target.value })}
                        className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#64748B] mb-1">
                      Posisi Label Mengambang
                    </label>
                    <select
                      value={c.cartFloatingPosition ?? 'bottom-floating'}
                      onChange={(e) =>
                        updateContent({
                          cartFloatingPosition: e.target.value as FloatingCartPosition,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                    >
                      <option value="bottom-floating">Melayang Bawah Penuh (Default)</option>
                      <option value="bottom-docked">Menempel Tepi Bawah</option>
                      <option value="bottom-left">Melayang Kiri Bawah</option>
                      <option value="bottom-right">Melayang Kanan Bawah</option>
                      <option value="top-floating">Melayang Atas Penuh</option>
                      <option value="top-left">Melayang Kiri Atas</option>
                      <option value="top-right">Melayang Kanan Atas</option>
                    </select>
                  </div>
                  {(() => {
                    const globalCart = resolveProjectFloatingCartConfig(
                      allBlocks,
                      bottomNavbar?.items,
                      pages
                    );
                    if (!globalCart || globalCart.totalSources <= 1) return null;
                    const isPrimary = globalCart.sourceBlockId === selectedBlock.id;
                    return (
                      <div
                        className={`p-2 rounded-lg border text-[10px] leading-relaxed ${
                          isPrimary
                            ? 'bg-[#ECFDF6] border-[#00C98A]/40 text-[#0F5132]'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        {isPrimary ? (
                          <span>
                            Pengendali aktif Floating Cart global ({globalCart.totalSources} komponen keranjang terdeteksi).
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <div>
                              Floating Cart global saat ini dikendalikan oleh <strong>{globalCart.sourceBlockLabel}</strong>.
                            </div>
                            {onSelectBlock && (
                              <button
                                type="button"
                                onClick={() => onSelectBlock(globalCart.sourceBlockId)}
                                className="underline font-bold cursor-pointer"
                              >
                                Buka komponen pengendali
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </div>
              )}
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
                {label('konten.actions.label.tombolShowHideBuka', 'Teks Tombol saat Sembunyi')}
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
                {label('konten.actions.label.tombolShowHideTutup', 'Teks Tombol saat Tampil')}
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
                {label('konten.actions.label.labelPemicuSheet', 'Label Pemicu')}
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
                {label('konten.actions.label.judulBottomSheet', 'Judul Bottom Sheet')}
              </label>
              <input
                type="text"
                value={c.sheetTitle ?? 'Lokasi & Ulasan'}
                onChange={(e) => updateContent({ sheetTitle: e.target.value })}
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Arah Buka Sheet
              </label>
              <div className="grid grid-cols-4 gap-1">
                {(
                  [
                    { id: 'bottom', label: 'Bawah' },
                    { id: 'top', label: 'Atas' },
                    { id: 'right', label: 'Kanan' },
                    { id: 'left', label: 'Kiri' },
                  ] as const
                ).map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => updateContent({ sheetPosition: pos.id })}
                    className={`py-1 px-1.5 rounded-md border text-[10.5px] font-semibold cursor-pointer transition-colors ${
                      (c.sheetPosition ?? 'bottom') === pos.id
                        ? 'bg-[#17243D] text-white border-[#17243D]'
                        : 'bg-[#F0F5FA] text-[#51637D] border-[#DCE5EF] hover:border-[#00C98A]'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
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
        return null;
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
        return null;
    }
  };

  // --- UNIVERSAL CLICK ACTION CONTROLS (EVERY LAYER) ---
  const renderUniversalActionControls = () => {
    if (
      selectedBlock.type === 'divider' ||
      selectedBlock.type === 'back_button' ||
      selectedBlock.type === 'menu_icon'
    ) {
      return null;
    }
    const isButtonBlock = selectedBlock.type === 'button';
    const legacyButtonUrl = isButtonBlock ? (c.url ?? '').trim() : '';
    const actionType: UniversalActionType =
      c.actionType ?? (isButtonBlock && legacyButtonUrl && legacyButtonUrl !== '#' ? 'url' : 'none');
    const sheetPos: MenuIconSheetPosition = c.actionSheetPosition ?? 'bottom';
    const sheetBlocks = c.actionSheetBlocks ?? [];
    const targetCandidates = flattenTargetBlocks(allBlocks, selectedBlock.id);
    const currentUrlValue = isButtonBlock
      ? (c.actionUrl ?? c.url ?? '')
      : (c.actionUrl ?? '');

    const sheetQuickTypes: { type: BlockType; label: string }[] = [
      { type: 'text', label: '+ Teks' },
      { type: 'image', label: '+ Gambar' },
      { type: 'button', label: '+ Tombol' },
      { type: 'showcase_card', label: '+ Kartu' },
      { type: 'cart_button', label: '+ Keranjang' },
      { type: 'form', label: '+ Formulir' },
      { type: 'maps_place', label: '+ Maps' },
      { type: 'back_button', label: '+ Back' },
    ];

    return (
      <div className="space-y-2.5 pt-2 border-t border-[#DCE5EF] first:border-t-0 first:pt-0">
        <div>
          {isVisible('konten.nav.title.aksiKlikUniversal') && (
            <label className="block text-[11px] font-bold text-[#17243D] mb-1">
              {isButtonBlock
                ? 'Aksi Saat Tombol Diklik'
                : label('konten.nav.title.aksiKlikUniversal', 'Aksi Saat Lapisan / Kartu Diklik')}
            </label>
          )}
          <select
            value={actionType}
            onChange={(e) => {
              const nextAction = e.target.value as UniversalActionType;
              updateContent({
                actionType: nextAction,
                ...(isButtonBlock && nextAction === 'url' && !c.actionUrl && c.url
                  ? { actionUrl: c.url }
                  : {}),
                ...(nextAction === 'sheet' && !c.actionSheetPosition
                  ? { actionSheetPosition: 'bottom' }
                  : {}),
                ...(nextAction === 'sheet' && !c.actionSheetTitle
                  ? { actionSheetTitle: c.cardTitle || c.label || selectedBlock.label || 'Detail Panel' }
                  : {}),
              });
            }}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white font-semibold text-[#17243D]"
          >
            <option value="none">
              {isButtonBlock ? 'Tidak Ada Aksi' : 'Tidak Ada Aksi Tambahan'}
            </option>
            <option value="url">Buka Tautan Link (URL)</option>
            <option value="sheet">Buka Sheet (Bawah / Kanan / Kiri / Atas)</option>
            <option value="page">Buka Halaman Baru / Halaman Lain</option>
            <option value="card">Gulir ke Card / Lapisan Lain</option>
            <option value="back">Tombol Kembali (Back)</option>
          </select>
        </div>

        {actionType === 'url' && (
          <div className="space-y-2">
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                {label('konten.field.urlTujuan', 'URL Tujuan')}
              </label>
              <input
                type="url"
                value={currentUrlValue}
                placeholder="https://..."
                onChange={(e) =>
                  updateContent(
                    isButtonBlock
                      ? { actionUrl: e.target.value, url: e.target.value, actionType: 'url' }
                      : { actionUrl: e.target.value }
                  )
                }
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white"
              />
            </div>
            {isButtonBlock && (
              <div className="flex items-center justify-between gap-2 px-2 py-1.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
                <span className="text-[11px] font-medium text-[#17243D]">
                  Buka di tab baru
                </span>
                <ToggleSwitch
                  checked={c.buttonOpenInNewTab !== false}
                  onChange={(checked) => updateContent({ buttonOpenInNewTab: checked })}
                  label="Buka tautan di tab baru"
                />
              </div>
            )}
          </div>
        )}

        {actionType === 'sheet' && (
          <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2">
            <div>
              <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                {label('konten.nav.label.arahSheet', 'Arah Muncul Sheet')}
              </label>
              <div className="grid grid-cols-4 gap-1">
                {(
                  [
                    { id: 'bottom' as const, label: 'Bawah' },
                    { id: 'right' as const, label: 'Kanan' },
                    { id: 'left' as const, label: 'Kiri' },
                    { id: 'top' as const, label: 'Atas' },
                  ] as const
                ).map((pos) => (
                  <button
                    key={pos.id}
                    type="button"
                    onClick={() => updateContent({ actionSheetPosition: pos.id })}
                    className={`py-1 rounded text-[10.5px] font-semibold border cursor-pointer ${
                      sheetPos === pos.id
                        ? 'bg-[#17243D] text-white border-[#17243D]'
                        : 'bg-white text-[#17243D] border-[#DCE5EF]'
                    }`}
                  >
                    {pos.label}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                {label('konten.nav.label.judulSheet', 'Judul Panel Sheet')}
              </label>
              <input
                type="text"
                value={c.actionSheetTitle ?? ''}
                placeholder="Judul panel sheet..."
                onChange={(e) => updateContent({ actionSheetTitle: e.target.value })}
                className="w-full px-2 py-1.5 text-xs rounded border border-[#DCE5EF] bg-white"
              />
            </div>

            <div className="space-y-1.5 pt-1 border-t border-[#DCE5EF]">
              {isVisible('konten.nav.title.isiKomponenSheet') && (
                <div className="flex items-center justify-between">
                  <span className="text-[10.5px] font-bold text-[#17243D]">
                    {label('konten.nav.title.isiKomponenSheet', 'Isi Komponen Sheet')} ({sheetBlocks.length})
                  </span>
                </div>
              )}
              {sheetBlocks.length === 0 ? (
                isVisible('konten.desc.sheetKosong') ? (
                  <p className="text-[10px] text-[#8FA4BF]">
                    {label(
                      'konten.desc.sheetKosong',
                      'Belum ada isi di panel sheet. Tambahkan elemen di bawah ini:'
                    )}
                  </p>
                ) : null
              ) : (
                <div className="space-y-1">
                  {sheetBlocks.map((child) => (
                    <div
                      key={child.id}
                      className="flex items-center justify-between gap-1.5 px-2 py-1 rounded bg-white border border-[#DCE5EF]"
                    >
                      <button
                        type="button"
                        onClick={() => onSelectBlock?.(child.id)}
                        className="flex-1 text-left truncate text-[11px] font-semibold text-[#17243D] hover:text-[#00A873] cursor-pointer"
                      >
                        {child.label || BLOCK_TYPE_NAMES[child.type]}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          updateContent({
                            actionSheetBlocks: sheetBlocks.filter((b) => b.id !== child.id),
                          })
                        }
                        className="p-0.5 text-[#8FA4BF] hover:text-red-600 cursor-pointer"
                        title="Hapus elemen sheet"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
              {onAddChildToActionSheet && (
                <div className="grid grid-cols-2 gap-1 pt-1">
                  {sheetQuickTypes.map((qt) => (
                    <button
                      key={qt.type}
                      type="button"
                      onClick={() => onAddChildToActionSheet(selectedBlock.id, qt.type)}
                      className="py-1 px-2 rounded border border-dashed border-[#00C98A] bg-white hover:bg-[#ECFDF6] text-[10.5px] font-semibold text-[#17243D] cursor-pointer text-left"
                    >
                      {qt.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {actionType === 'page' && (
          <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2">
            <label className="block text-[10.5px] font-semibold text-[#17243D]">
              {label('konten.nav.label.pilihHalamanTujuan', 'Pilih Halaman Tujuan')}
            </label>
            <select
              value={c.actionTargetPageId ?? ''}
              onChange={(e) => updateContent({ actionTargetPageId: e.target.value })}
              className="w-full px-2 py-1.5 text-xs rounded border border-[#DCE5EF] bg-white text-[#17243D]"
            >
              <option value="">-- Pilih Halaman --</option>
              <option value="home">Beranda (Halaman Utama)</option>
              {pages.map((pg) => (
                <option key={pg.id} value={pg.id}>
                  {pg.title} {activeSubPageId === pg.id ? '(Sedang Dibuka)' : ''}
                </option>
              ))}
            </select>
            <div className="flex gap-1.5">
              {onAddSubPage && (
                <button
                  type="button"
                  onClick={() => {
                    const createdId = onAddSubPage();
                    if (createdId) updateContent({ actionTargetPageId: createdId });
                  }}
                  className="flex-1 py-1.5 px-2 rounded-lg border border-dashed border-[#00C98A] bg-[#ECFDF6] text-[10.5px] font-bold text-[#0F766E] cursor-pointer"
                >
                  + Buat Halaman Baru
                </button>
              )}
              {c.actionTargetPageId && c.actionTargetPageId !== 'home' && onSelectSubPage && (
                <button
                  type="button"
                  onClick={() => onSelectSubPage(c.actionTargetPageId || null)}
                  className="py-1.5 px-2 rounded-lg border border-[#DCE5EF] bg-white text-[10.5px] font-semibold text-[#17243D] cursor-pointer"
                >
                  Edit Halaman
                </button>
              )}
            </div>
          </div>
        )}

        {actionType === 'card' && (
          <div className="space-y-1">
            <label className="block text-[11px] font-semibold text-[#17243D]">
              {label('konten.nav.label.pilihCardTujuan', 'Pilih Card / Komponen Tujuan')}
            </label>
            <select
              value={c.actionTargetBlockId ?? ''}
              onChange={(e) => updateContent({ actionTargetBlockId: e.target.value })}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white text-[#17243D]"
            >
              <option value="">-- Pilih card / blok tujuan --</option>
              {targetCandidates.map((cand, idx) => (
                <option key={cand.id} value={cand.id}>
                  {cand.depth > 0 ? '↳ '.repeat(cand.depth) : `${idx + 1}. `}
                  {cand.label} ({BLOCK_TYPE_NAMES[cand.type]})
                </option>
              ))}
            </select>
          </div>
        )}

        {actionType === 'back' && isVisible('konten.desc.tombolBack') && (
          <p className="text-[10.5px] text-[#51637D] bg-[#F0F5FA] p-2 rounded-lg border border-[#DCE5EF]">
            {label(
              'konten.desc.tombolBack',
              'Saat diklik, pengunjung otomatis kembali ke halaman sebelumnya (atau Beranda).'
            )}
          </p>
        )}
      </div>
    );
  };

  // --- UNIVERSAL CART MODE CONTROLS (ALL CARD/BLOCK LAYERS) ---
  const renderUniversalCartControls = () => {
    if (!supportsUniversalCart(selectedBlock.type)) return null;
    const enabled = Boolean(c.universalCartEnabled);
    const defaultName = c.cardTitle || c.cartProductName || selectedBlock.label || 'Produk';
    return (
      <div className="space-y-2.5 pt-2 border-t border-[#DCE5EF] first:border-t-0 first:pt-0">
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#ECFDF6] border border-[#00C98A]/40">
          <div className="flex items-center gap-1.5 min-w-0">
            <ShoppingBag className="w-3.5 h-3.5 text-[#00A873] shrink-0" />
            <div className="min-w-0">
              {isVisible('konten.field.fungsiKeranjangUniversal') && (
                <div className="text-[11px] font-bold text-[#17243D]">
                  {label('konten.field.fungsiKeranjangUniversal', 'Aktifkan Fungsi Keranjang')}
                </div>
              )}
              {isVisible('konten.desc.fungsiKeranjangUniversal') && (
                <div className="text-[9.5px] text-[#51637D]">
                  {label(
                    'konten.desc.fungsiKeranjangUniversal',
                    'Harga, terjual, tambah - 1 +, & info keranjang mengambang'
                  )}
                </div>
              )}
            </div>
          </div>
          <ToggleSwitch
            checked={enabled}
            onChange={(checked) =>
              updateContent({
                universalCartEnabled: checked,
                ...(checked && !c.universalCartName ? { universalCartName: defaultName } : {}),
                ...(checked && !c.universalCartPrice ? { universalCartPrice: c.cardPrice || 'Rp 50.000' } : {}),
                ...(checked && c.universalCartFloatingEnabled === undefined
                  ? { universalCartFloatingEnabled: true }
                  : {}),
              })
            }
            label="Aktifkan Fungsi Keranjang"
          />
        </div>

        {enabled && (
          <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2">
            <div>
              <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                {label('konten.actions.label.namaProdukKeranjang', 'Nama Produk di Keranjang')}
              </label>
              <input
                type="text"
                value={c.universalCartName ?? defaultName}
                onChange={(e) => updateContent({ universalCartName: e.target.value })}
                className="w-full px-2 py-1.5 text-xs rounded border border-[#DCE5EF] bg-white"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                  Harga (Rp)
                </label>
                <input
                  type="text"
                  value={c.universalCartPrice ?? c.cardPrice ?? 'Rp 50.000'}
                  placeholder="Rp 50.000"
                  onChange={(e) =>
                    updateContent({ universalCartPrice: e.target.value })
                  }
                  className="w-full px-2 py-1.5 text-xs rounded border border-[#DCE5EF] bg-white tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                  Jumlah Terjual
                </label>
                <input
                  type="number"
                  min={0}
                  value={c.universalCartUnitSold ?? 0}
                  onChange={(e) =>
                    updateContent({ universalCartUnitSold: Math.max(0, Number(e.target.value) || 0) })
                  }
                  className="w-full px-2 py-1.5 text-xs rounded border border-[#DCE5EF] bg-white tabular-nums"
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-[#17243D]">
                Tampilkan Label Jumlah Terjual
              </span>
              <ToggleSwitch
                checked={c.universalCartShowUnitSold !== false}
                onChange={(checked) => updateContent({ universalCartShowUnitSold: checked })}
                label="Tampilkan Jumlah Terjual"
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                  {label('konten.actions.label.labelTombolTambah', 'Label Tombol Tambah')}
                </label>
                <input
                  type="text"
                  value={c.universalCartButtonLabel ?? 'Tambah'}
                  onChange={(e) => updateContent({ universalCartButtonLabel: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs rounded border border-[#DCE5EF] bg-white"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                  Warna Tombol
                </label>
                <input
                  type="color"
                  value={c.universalCartAccentColor ?? theme.accentColor ?? '#EA580C'}
                  onChange={(e) => updateContent({ universalCartAccentColor: e.target.value })}
                  className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                  {label('konten.field.noWhatsappCheckout', 'Nomor WhatsApp Checkout')}
                </label>
                <input
                  type="text"
                  value={c.universalCartWhatsappNumber ?? '6281234567890'}
                  onChange={(e) => updateContent({ universalCartWhatsappNumber: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs rounded border border-[#DCE5EF] bg-white tabular-nums"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                  {label('konten.actions.label.namaTokoWa', 'Nama Toko (di Pesan WA)')}
                </label>
                <input
                  type="text"
                  value={c.universalCartStoreName ?? ''}
                  placeholder="Otomatis nama halaman"
                  onChange={(e) => updateContent({ universalCartStoreName: e.target.value })}
                  className="w-full px-2 py-1.5 text-xs rounded border border-[#DCE5EF] bg-white"
                />
              </div>
            </div>

            {/* Info Keranjang Mengambang */}
            <div className="pt-2 border-t border-[#DCE5EF] space-y-2">
              <div className="flex items-center justify-between gap-2">
                {isVisible('konten.actions.title.keranjangMengambang') && (
                  <span className="text-[11px] font-bold text-[#17243D]">
                    {label('konten.actions.title.keranjangMengambang', 'Info Keranjang Mengambang')}
                  </span>
                )}
                <ToggleSwitch
                  checked={c.universalCartFloatingEnabled !== false}
                  onChange={(checked) => updateContent({ universalCartFloatingEnabled: checked })}
                  label="Info Keranjang Mengambang"
                />
              </div>
              {c.universalCartFloatingEnabled !== false && (
                <>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#51637D] mb-1">
                        Label Bar Mengambang
                      </label>
                      <input
                        type="text"
                        value={c.universalCartFloatingLabel ?? 'Lihat Keranjang'}
                        onChange={(e) =>
                          updateContent({ universalCartFloatingLabel: e.target.value })
                        }
                        className="w-full px-2 py-1 text-xs rounded border border-[#DCE5EF] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold text-[#51637D] mb-1">
                        Warna Bar
                      </label>
                      <input
                        type="color"
                        value={c.universalCartFloatingBg ?? '#17243D'}
                        onChange={(e) => updateContent({ universalCartFloatingBg: e.target.value })}
                        className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#51637D] mb-1">
                      Posisi Bar Mengambang
                    </label>
                    <select
                      value={c.universalCartFloatingPosition ?? 'bottom-floating'}
                      onChange={(e) =>
                        updateContent({
                          universalCartFloatingPosition: e.target.value as FloatingCartPosition,
                        })
                      }
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                    >
                      <option value="bottom-floating">Melayang Bawah Penuh (Default)</option>
                      <option value="bottom-docked">Menempel Tepi Bawah</option>
                      <option value="bottom-left">Melayang Kiri Bawah</option>
                      <option value="bottom-right">Melayang Kanan Bawah</option>
                      <option value="top-floating">Melayang Atas Penuh</option>
                      <option value="top-left">Melayang Kiri Atas</option>
                      <option value="top-right">Melayang Kanan Atas</option>
                    </select>
                  </div>
                  {(() => {
                    const globalCart = resolveProjectFloatingCartConfig(
                      allBlocks,
                      bottomNavbar?.items,
                      pages
                    );
                    if (!globalCart || globalCart.totalSources <= 1) return null;
                    const isPrimary = globalCart.sourceBlockId === selectedBlock.id;
                    return (
                      <div
                        className={`p-2 rounded-lg border text-[10px] leading-relaxed ${
                          isPrimary
                            ? 'bg-[#ECFDF6] border-[#00C98A]/40 text-[#0F5132]'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        {isPrimary ? (
                          <span>
                            Pengendali aktif Floating Cart global ({globalCart.totalSources} komponen keranjang terdeteksi).
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <div>
                              Floating Cart global saat ini dikendalikan oleh <strong>{globalCart.sourceBlockLabel}</strong>.
                            </div>
                            {onSelectBlock && (
                              <button
                                type="button"
                                onClick={() => onSelectBlock(globalCart.sourceBlockId)}
                                className="underline font-bold cursor-pointer"
                              >
                                Buka komponen pengendali
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  const mainContent = renderMainContent();
  const itemsInfo = renderDataItemsSection();
  const specificNavContent = renderNavSection();
  const universalActionContent = renderUniversalActionControls();
  const navContent =
    specificNavContent || universalActionContent ? (
      <div className="space-y-3">
        {specificNavContent}
        {universalActionContent}
      </div>
    ) : null;

  const specificActionsContent = renderActionsSection();
  const universalCartContent = renderUniversalCartControls();
  const actionsContent =
    specificActionsContent || universalCartContent ? (
      <div className="space-y-3">
        {specificActionsContent}
        {universalCartContent}
      </div>
    ) : null;

  const extraContent = renderExtraSection();

  const resolvedWaCenter = resolveWhatsappCenter({ whatsappCenter });
  const supportsWaCenterIntegration =
    selectedBlock.type === 'button' ||
    selectedBlock.type === 'catalog' ||
    selectedBlock.type === 'fnb_catalog' ||
    selectedBlock.type === 'cart_button' ||
    selectedBlock.type === 'training_catalog' ||
    selectedBlock.type === 'form' ||
    Boolean(c.universalCartEnabled);

  return (
    <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2 bg-[#F4F7FB]">
      {/* 1. DATA & DAFTAR ITEM — Tampil paling atas jika tersedia */}
      {itemsInfo && isVisible('konten.sec.items') && isContentSectionAllowed('items') && (
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
      )}

      {/* 2. KONTEN UTAMA */}
      {mainContent && isVisible('konten.sec.main') && isContentSectionAllowed('main') && (
        <AccordionSection
          id="main"
          title={label('konten.sec.main', 'Konten Utama')}
          icon={<FileText className="w-3.5 h-3.5" />}
          isOpen={openSections.main}
          onToggle={() => toggleSection('main')}
        >
          {mainContent}
        </AccordionSection>
      )}

      {/* 3. TAUTAN & NAVIGASI */}
      {navContent && isVisible('konten.sec.nav') && isContentSectionAllowed('nav') && (
        <AccordionSection
          id="nav"
          title={label('konten.sec.nav', 'Tautan & Navigasi')}
          icon={<Link2 className="w-3.5 h-3.5" />}
          isOpen={openSections.nav}
          onToggle={() => toggleSection('nav')}
        >
          {navContent}
        </AccordionSection>
      )}

      {/* 4. PENGATURAN UMUM */}
      {isVisible('konten.sec.general') && isContentSectionAllowed('general') && (
        <AccordionSection
          id="general"
          title={label('konten.sec.general', 'Pengaturan Umum')}
          icon={<Settings2 className="w-3.5 h-3.5" />}
          isOpen={openSections.general}
          onToggle={() => toggleSection('general')}
        >
          <div className="space-y-2.5">
            {isVisible('konten.field.namaLapisan') && (
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  {label('konten.field.namaLapisan', 'Nama Lapisan Komponen')}
                </label>
                <input
                  type="text"
                  value={selectedBlock.label}
                  onChange={(e) =>
                    onUpdateBlock(selectedBlock.id, (blk) => ({ ...blk, label: e.target.value }))
                  }
                  placeholder={BLOCK_TYPE_NAMES[selectedBlock.type] || selectedBlock.type}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                />
              </div>
            )}

            {isVisible('konten.field.visibilitasKomponen') && (
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#F8FBFE] border border-[#DCE5EF]">
                <div className="min-w-0">
                  <div className="text-[11px] font-semibold text-[#17243D]">
                    {label('konten.field.visibilitasKomponen', 'Visibilitas Komponen')}
                  </div>
                  {(s.visibility === 'hidden'
                    ? isVisible('konten.desc.visibilitasSembunyi')
                    : isVisible('konten.desc.visibilitasAktif')) && (
                    <div className="text-[10px] text-[#51637D]">
                      {s.visibility === 'hidden'
                        ? label(
                            'konten.desc.visibilitasSembunyi',
                            'Disembunyikan pada halaman publik'
                          )
                        : label('konten.desc.visibilitasAktif', 'Tampil aktif pada halaman')}
                    </div>
                  )}
                </div>
                <ToggleSwitch
                  checked={s.visibility !== 'hidden'}
                  onChange={(visible) => updateStyle({ visibility: visible ? 'visible' : 'hidden' })}
                  label={label('konten.field.visibilitasKomponen', 'Visibilitas Komponen')}
                />
              </div>
            )}

            {selectedBlock.type === 'container' && (
              <ContainerSliderControls
                selectedBlock={selectedBlock}
                onUpdateBlock={onUpdateBlock}
              />
            )}

            {supportsWaCenterIntegration && isVisible('konten.field.pusatWaTerhubung') && (
              <div className="p-2.5 rounded-lg bg-[#ECFDF6]/60 border border-[#00C98A]/30 space-y-2">
                <div className="text-[11px] font-bold text-[#17243D]">
                  {label('konten.field.pusatWaTerhubung', 'Pusat WhatsApp (Terhubung)')}
                </div>
                {isVisible('konten.field.tautanWaAktif') && (
                  <div>
                    <label className="block text-[10px] font-semibold text-[#51637D] mb-0.5">
                      {label('konten.field.tautanWaAktif', 'Tautan WhatsApp Aktif')}
                    </label>
                    <select
                      value={c.whatsappLinkId ?? ''}
                      onChange={(e) => {
                        const linkId = e.target.value || undefined;
                        const found = resolvedWaCenter.links.find((l) => l.id === linkId);
                        updateContent({
                          whatsappLinkId: linkId,
                          ...(found?.templateId && !c.whatsappTemplateId
                            ? { whatsappTemplateId: found.templateId }
                            : {}),
                        });
                      }}
                      className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white"
                    >
                      <option value="">
                        Nomor Utama ({resolvedWaCenter.mainPhone || 'Belum diisi'})
                      </option>
                      {resolvedWaCenter.links
                        .filter((l) => l.active)
                        .map((l) => (
                          <option key={l.id} value={l.id}>
                            {l.name} ({l.phone || resolvedWaCenter.mainPhone})
                          </option>
                        ))}
                    </select>
                  </div>
                )}
                {isVisible('konten.field.templatPesanWa') && (
                  <div>
                    <label className="block text-[10px] font-semibold text-[#51637D] mb-0.5">
                      {label('konten.field.templatPesanWa', 'Templat Pesan WhatsApp')}
                    </label>
                    <select
                      value={c.whatsappTemplateId ?? ''}
                      onChange={(e) =>
                        updateContent({
                          whatsappTemplateId: e.target.value || undefined,
                          ...(selectedBlock.type === 'form'
                            ? { formWhatsappTemplateId: e.target.value || undefined }
                            : {}),
                        })
                      }
                      className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white"
                    >
                      <option value="">Otomatis (Ikuti pengaturan Pusat WhatsApp)</option>
                      {resolvedWaCenter.templates.map((tpl) => (
                        <option key={tpl.id} value={tpl.id}>
                          {tpl.name} ({WHATSAPP_TEMPLATE_TYPE_LABELS[tpl.type]})
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            )}
          </div>
        </AccordionSection>
      )}

      {/* 5. AKSI & INTERAKSI */}
      {actionsContent && isVisible('konten.sec.actions') && isContentSectionAllowed('actions') && (
        <AccordionSection
          id="actions"
          title={label('konten.sec.actions', 'Aksi & Interaksi')}
          icon={<MousePointerClick className="w-3.5 h-3.5" />}
          isOpen={openSections.actions}
          onToggle={() => toggleSection('actions')}
        >
          {actionsContent}
        </AccordionSection>
      )}

      {extraContent && isVisible('konten.sec.extra') && isContentSectionAllowed('extra') && (
        <AccordionSection
          id="extra"
          title={label('konten.sec.extra', 'Pengaturan Tambahan')}
          icon={<Settings2 className="w-3.5 h-3.5" />}
          isOpen={openSections.extra}
          onToggle={() => toggleSection('extra')}
        >
          {extraContent}
        </AccordionSection>
      )}

      {selectedSubLayer && onClearSubLayer && (
        <button
          type="button"
          onClick={onClearSubLayer}
          className="w-full py-2 px-3 rounded-lg border border-dashed border-[#00C98A]/60 bg-white text-[11px] font-semibold text-[#008F63] hover:bg-[#ECFDF6] transition-colors cursor-pointer"
        >
          Tampilkan Semua Pengaturan Konten Komponen Induk
        </button>
      )}
    </div>
  );
}
