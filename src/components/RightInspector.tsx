import React, { useState } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  ChevronDown,
  Copy,
  Eye,
  EyeOff,
  FileText,
  GraduationCap,
  GripVertical,
  Image as ImageIcon,
  Info,
  LayoutTemplate,
  Palette,
  PanelBottom,
  Plus,
  RotateCcw,
  ShoppingCart,
  SlidersHorizontal,
  Trash2,
  Type,
  Upload,
  Video,
  X,
} from 'lucide-react';
import {
  AdvanceOptions,
  BlockLayoutMode,
  BlockStyle,
  BlockType,
  BottomNavbarConfig,
  BottomNavbarItem,
  BottomNavbarItemAction,
  BottomSheetTriggerStyle,
  BuilderBlock,
  CarouselAspectRatio,
  CarouselItem,
  CatalogCartButtonSize,
  CatalogCustomerField,
  CatalogItem,
  CatalogProductType,
  CatalogShippingOptionConfig,
  CategoryJumpItem,
  CategoryScrollMode,
  CustomFieldInputType,
  FloatingCartPosition,
  FnbMenuItem,
  HeroProfileVariant,
  PageTheme,
  ShadowPreset,
  ShippingMethodId,
  SocialFollowerAccount,
  SocialLinkItem,
  SocialPlatform,
  SocialPostItem,
  TrainingCustomBox,
  TrainingMediaItem,
  TrainingProgramItem,
} from '../types/builder';
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
} from '../utils/cartHelpers';
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
  resolveNavbarMetrics,
} from '../data/presets';
import { SOCIAL_PLATFORMS, SOCIAL_PLATFORM_LIST, resolveSocialMetrics } from '../utils/socialIcons';
import { resolveButtonIcon } from '../utils/buttonIcons';
import { ButtonGlyph } from './ButtonIcon';
import { IconPicker } from './IconPicker';
import { RichTextEditor } from './RichTextEditor';
import { SocialGlyph } from './SocialIcon';

import { readVideoFileSafe, uploadCompressedImageOrFallback } from '../utils/imageHelpers';
import { FONT_OPTIONS } from '../utils/fontHelpers';
import { GRADIENT_PRESETS, buildLinearGradientCss, clampGradientAngle } from '../utils/gradientHelpers';
import { cloneBlockDeep } from '../utils/treeHelpers';

interface RightInspectorProps {
  selectedBlock: BuilderBlock | null;
  theme: PageTheme;
  advanceOptions: AdvanceOptions;
  bottomNavbar: BottomNavbarConfig;
  inspectorMode: 'element' | 'navbar';
  activeNavItemId: string;
  selectedParentNavId: string | null;
  selectedParentNavLabel: string | null;
  onChangeInspectorMode: (mode: 'element' | 'navbar') => void;
  onSelectNavItem: (id: string) => void;
  onUpdateBottomNavbar: (updater: (prev: BottomNavbarConfig) => BottomNavbarConfig) => void;
  onUpdateAdvanceOptions: (patch: Partial<AdvanceOptions>) => void;
  onUpdateBlock: (id: string, updater: (block: BuilderBlock) => BuilderBlock) => void;
  onDuplicateBlock: (id: string) => void;
  onAddChildToContainer: (containerId: string, type: BlockType) => void;
  onSelectBlock?: (id: string) => void;
}

export function RightInspector({
  selectedBlock,
  theme,
  advanceOptions,
  bottomNavbar,
  inspectorMode,
  activeNavItemId,
  selectedParentNavId,
  selectedParentNavLabel,
  onChangeInspectorMode,
  onSelectNavItem,
  onUpdateBottomNavbar,
  onUpdateAdvanceOptions,
  onUpdateBlock,
  onDuplicateBlock,
  onAddChildToContainer,
  onSelectBlock,
}: RightInspectorProps) {
  const [dragItemState, setDragItemState] = useState<{
    draggedId: string | null;
    targetId: string | null;
  }>({ draggedId: null, targetId: null });
  const [newSocialPlatform, setNewSocialPlatform] = useState<SocialPlatform>('instagram');
  const [newSocialFollowerPlatform, setNewSocialFollowerPlatform] =
    useState<SocialPlatform>('tiktok');
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [heroUploadingField, setHeroUploadingField] = useState<'heroCoverImage' | 'heroLogoImage' | null>(null);
  const [inspectorTab, setInspectorTab] = useState<'content' | 'appearance'>('content');
  const [expandedCatalogItems, setExpandedCatalogItems] = useState<Record<string, boolean>>({});
  const [activeShippingOptionId, setActiveShippingOptionId] =
    useState<ShippingMethodId>('makan_ditempat');

  const updateStyle = (patch: Partial<BlockStyle>) => {
    if (!selectedBlock) return;
    onUpdateBlock(selectedBlock.id, (blk) => ({
      ...blk,
      style: { ...blk.style, ...patch },
    }));
  };

  const updateContent = (patch: Partial<BuilderBlock['content']>) => {
    if (!selectedBlock) return;
    onUpdateBlock(selectedBlock.id, (blk) => ({
      ...blk,
      content: { ...blk.content, ...patch },
    }));
  };

  const handleResetStyle = () => {
    if (!selectedBlock) return;
    onUpdateBlock(selectedBlock.id, (blk) => ({
      ...blk,
      style: {
        ...DEFAULT_STYLE,
        textColor: theme.textColor,
        useThemeTextColor: true,
        shadowColor: undefined,
        backgroundColor:
          blk.type === 'container' || blk.type === 'toggle_container' || blk.type === 'form'
            ? '#FFFFFF'
            : 'transparent',
        borderWidth:
          blk.type === 'container' || blk.type === 'toggle_container' || blk.type === 'form'
            ? 1
            : 0,
        paddingX: undefined,
        paddingTop: undefined,
        paddingBottom: undefined,
        fullBleed: false,
      },
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedBlock) return;
    const targetBlockId = selectedBlock.id;
    setUploadError(null);
    try {
      const compressed = await uploadCompressedImageOrFallback(file, { maxDimension: 1080, quality: 0.82 });
      onUpdateBlock(targetBlockId, (blk) => ({
        ...blk,
        content: { ...blk.content, src: compressed },
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal memproses gambar.');
    }
  };

  const handleCatalogItemImageUpload = async (
    itemId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedBlock) return;
    const targetBlockId = selectedBlock.id;
    setUploadError(null);
    try {
      const compressed = await uploadCompressedImageOrFallback(file, { maxDimension: 1080, quality: 0.82 });
      onUpdateBlock(targetBlockId, (blk) => ({
        ...blk,
        content: {
          ...blk.content,
          catalogItems: (blk.content.catalogItems ?? []).map((item) =>
            item.id === itemId ? { ...item, image: compressed } : item
          ),
        },
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal memproses gambar produk.');
    }
  };

  const handleCatalogItemGalleryUpload = async (
    itemId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedBlock) return;
    const targetBlockId = selectedBlock.id;
    setUploadError(null);
    try {
      const compressed = await uploadCompressedImageOrFallback(file, { maxDimension: 1080, quality: 0.82 });
      onUpdateBlock(targetBlockId, (blk) => ({
        ...blk,
        content: {
          ...blk.content,
          catalogItems: (blk.content.catalogItems ?? []).map((item) =>
            item.id === itemId
              ? { ...item, gallery: [...(item.gallery ?? []), compressed] }
              : item
          ),
        },
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal memproses foto galeri.');
    }
  };

  const handleRemoveCatalogGalleryImage = (itemId: string, idx: number) => {
    if (!selectedBlock) return;
    const current = selectedBlock.content.catalogItems ?? [];
    const target = current.find((it) => it.id === itemId);
    if (!target) return;
    const nextGallery = (target.gallery ?? []).filter((_, i) => i !== idx);
    handleUpdateCatalogItem(itemId, { gallery: nextGallery });
  };

  const handleTrainingMediaUpload = async (
    mediaId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedBlock) return;
    const targetBlockId = selectedBlock.id;
    setUploadError(null);
    try {
      const compressed = await uploadCompressedImageOrFallback(file, { maxDimension: 1080, quality: 0.82 });
      onUpdateBlock(targetBlockId, (blk) => ({
        ...blk,
        content: {
          ...blk.content,
          trainingMedia: (blk.content.trainingMedia ?? []).map((m) =>
            m.id === mediaId ? { ...m, imageUrl: compressed } : m
          ),
        },
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal memproses foto pelatihan.');
    }
  };

  const handleUpdateCatalogItem = (itemId: string, patch: Partial<CatalogItem>) => {
    if (!selectedBlock) return;
    const current = selectedBlock.content.catalogItems ?? [];
    updateContent({
      catalogItems: current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    });
  };

  const handleAddCatalogItem = () => {
    if (!selectedBlock) return;
    const current = selectedBlock.content.catalogItems ?? [];
    const nextItem: CatalogItem = {
      id: createId('item'),
      title: `Produk #${current.length + 1}`,
      subtitle: 'Deskripsi singkat produk Anda',
      description: 'Tuliskan detail lengkap produk, spesifikasi, atau manfaat di sini.',
      variants: 'Reguler, Paket Lengkap',
      price: 'Rp 75.000',
      ctaLabel: 'Lihat Detail',
      url: 'https://example.com',
      image: PRODUCT_CARD_SVG,
      imageAspectRatio: '4/3',
      imageObjectFit: 'cover',
      unitSold: 12,
    };
    updateContent({ catalogItems: [...current, nextItem] });
    setExpandedCatalogItems((prev) => ({ ...prev, [nextItem.id]: true }));
  };

  const handleDeleteCatalogItem = (itemId: string) => {
    if (!selectedBlock) return;
    const current = selectedBlock.content.catalogItems ?? [];
    updateContent({
      catalogItems: current.filter((item) => item.id !== itemId),
    });
  };

  const handleReorderCatalogItem = (draggedId: string, targetId: string) => {
    if (!selectedBlock || draggedId === targetId) return;
    const current = [...(selectedBlock.content.catalogItems ?? [])];
    const fromIdx = current.findIndex((i) => i.id === draggedId);
    const toIdx = current.findIndex((i) => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = current.splice(fromIdx, 1);
    current.splice(toIdx, 0, moved);
    updateContent({ catalogItems: current });
  };

  const handleUpdateSocialItem = (itemId: string, patch: Partial<SocialLinkItem>) => {
    if (!selectedBlock) return;
    const current = selectedBlock.content.socialItems ?? [];
    updateContent({
      socialItems: current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    });
  };

  const handleAddSocialItem = (platform: SocialPlatform) => {
    if (!selectedBlock) return;
    const current = selectedBlock.content.socialItems ?? [];
    const meta = SOCIAL_PLATFORMS[platform];
    const nextItem: SocialLinkItem = {
      id: createId(`soc_${platform}`),
      platform,
      url: meta.placeholderUrl,
      visible: true,
    };
    updateContent({ socialItems: [...current, nextItem] });
  };

  const handleDeleteSocialItem = (itemId: string) => {
    if (!selectedBlock) return;
    const current = selectedBlock.content.socialItems ?? [];
    updateContent({
      socialItems: current.filter((item) => item.id !== itemId),
    });
  };

  const handleReorderSocialItem = (draggedId: string, targetId: string) => {
    if (!selectedBlock || draggedId === targetId) return;
    const current = [...(selectedBlock.content.socialItems ?? [])];
    const fromIdx = current.findIndex((i) => i.id === draggedId);
    const toIdx = current.findIndex((i) => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = current.splice(fromIdx, 1);
    current.splice(toIdx, 0, moved);
    updateContent({ socialItems: current });
  };

  const makeDefaultFollowerAccount = (platform: SocialPlatform): SocialFollowerAccount => {
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

  const handleAddSocialFollowerAccount = (platform: SocialPlatform) => {
    if (!selectedBlock) return;
    const current = selectedBlock.content.socialFollowerAccounts ?? [];
    updateContent({
      socialFollowerAccounts: [...current, makeDefaultFollowerAccount(platform)],
    });
  };

  const handleAddPopularSocialFollowers = () => {
    if (!selectedBlock) return;
    const current = selectedBlock.content.socialFollowerAccounts ?? [];
    const existing = new Set(current.map((a) => a.platform));
    const popular: SocialPlatform[] = [
      'instagram',
      'tiktok',
      'facebook',
      'youtube',
      'threads',
      'twitter',
      'telegram',
    ];
    const additions = popular
      .filter((p) => !existing.has(p))
      .map((p) => makeDefaultFollowerAccount(p));
    if (additions.length === 0) return;
    updateContent({
      socialFollowerAccounts: [...current, ...additions],
    });
  };

  const handleUpdateSocialFollowerAccount = (
    accountId: string,
    patch: Partial<SocialFollowerAccount>
  ) => {
    if (!selectedBlock) return;
    const current = selectedBlock.content.socialFollowerAccounts ?? [];
    updateContent({
      socialFollowerAccounts: current.map((acc) =>
        acc.id === accountId ? { ...acc, ...patch } : acc
      ),
    });
  };

  const handleDeleteSocialFollowerAccount = (accountId: string) => {
    if (!selectedBlock) return;
    const current = selectedBlock.content.socialFollowerAccounts ?? [];
    updateContent({
      socialFollowerAccounts: current.filter((acc) => acc.id !== accountId),
    });
  };

  const handleReorderSocialFollowerAccount = (draggedId: string, targetId: string) => {
    if (!selectedBlock || draggedId === targetId) return;
    const current = [...(selectedBlock.content.socialFollowerAccounts ?? [])];
    const fromIdx = current.findIndex((i) => i.id === draggedId);
    const toIdx = current.findIndex((i) => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = current.splice(fromIdx, 1);
    current.splice(toIdx, 0, moved);
    updateContent({ socialFollowerAccounts: current });
  };

  const handleSocialFollowerAvatarUpload = async (
    accountId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedBlock) return;
    const targetBlockId = selectedBlock.id;
    setUploadError(null);
    try {
      const compressed = await uploadCompressedImageOrFallback(file, { maxDimension: 512, quality: 0.85 });
      onUpdateBlock(targetBlockId, (blk) => ({
        ...blk,
        content: {
          ...blk.content,
          socialFollowerAccounts: (blk.content.socialFollowerAccounts ?? []).map((acc) =>
            acc.id === accountId ? { ...acc, avatar: compressed } : acc
          ),
        },
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal memproses foto profil.');
    }
  };

  const SAMPLE_CAROUSEL_IMAGES = [
    CAROUSEL_SAMPLE_1_SVG,
    CAROUSEL_SAMPLE_2_SVG,
    CAROUSEL_SAMPLE_3_SVG,
  ];

  const handleUpdateCarouselItem = (itemId: string, patch: Partial<CarouselItem>) => {
    if (!selectedBlock) return;
    const current = selectedBlock.content.carouselItems ?? [];
    updateContent({
      carouselItems: current.map((item) => (item.id === itemId ? { ...item, ...patch } : item)),
    });
  };

  const handleCarouselItemImageUpload = async (
    itemId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedBlock) return;
    const targetBlockId = selectedBlock.id;
    setUploadError(null);
    try {
      const compressed = await uploadCompressedImageOrFallback(file, { maxDimension: 1080, quality: 0.82 });
      onUpdateBlock(targetBlockId, (blk) => ({
        ...blk,
        content: {
          ...blk.content,
          carouselItems: (blk.content.carouselItems ?? []).map((item) =>
            item.id === itemId ? { ...item, image: compressed } : item
          ),
        },
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal memproses foto carousel.');
    }
  };

  const makeDefaultCarouselSlide = (index: number): CarouselItem => ({
    id: createId('slide'),
    image: SAMPLE_CAROUSEL_IMAGES[index % SAMPLE_CAROUSEL_IMAGES.length],
    title: `Foto #${index + 1}`,
    caption: 'Tambahkan keterangan singkat di bawah foto ini.',
    url: '',
  });

  const handleAddCarouselItem = () => {
    if (!selectedBlock) return;
    const current = selectedBlock.content.carouselItems ?? [];
    if (current.length >= 20) return;
    updateContent({
      carouselItems: [...current, makeDefaultCarouselSlide(current.length)],
    });
  };

  const handleSetCarouselCount = (targetCount: number) => {
    if (!selectedBlock || Number.isNaN(targetCount)) return;
    const clamped = Math.max(1, Math.min(20, Math.round(targetCount)));
    const current = selectedBlock.content.carouselItems ?? [];
    if (clamped === current.length) return;
    if (clamped < current.length) {
      updateContent({ carouselItems: current.slice(0, clamped) });
    } else {
      const additions: CarouselItem[] = [];
      for (let i = current.length; i < clamped; i++) {
        additions.push(makeDefaultCarouselSlide(i));
      }
      updateContent({ carouselItems: [...current, ...additions] });
    }
  };

  const handleDeleteCarouselItem = (itemId: string) => {
    if (!selectedBlock) return;
    const current = selectedBlock.content.carouselItems ?? [];
    updateContent({
      carouselItems: current.filter((item) => item.id !== itemId),
    });
  };

  const handleReorderCarouselItem = (draggedId: string, targetId: string) => {
    if (!selectedBlock || draggedId === targetId) return;
    const current = [...(selectedBlock.content.carouselItems ?? [])];
    const fromIdx = current.findIndex((i) => i.id === draggedId);
    const toIdx = current.findIndex((i) => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = current.splice(fromIdx, 1);
    current.splice(toIdx, 0, moved);
    updateContent({ carouselItems: current });
  };

  const handleSocialFeedAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedBlock) return;
    const targetBlockId = selectedBlock.id;
    setUploadError(null);
    try {
      const compressed = await uploadCompressedImageOrFallback(file, { maxDimension: 480, quality: 0.84 });
      onUpdateBlock(targetBlockId, (blk) => ({
        ...blk,
        content: { ...blk.content, socialFeedAvatar: compressed },
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal memproses foto profil.');
    }
  };

  const handleMapsPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedBlock) return;
    const targetBlockId = selectedBlock.id;
    setUploadError(null);
    try {
      const compressed = await uploadCompressedImageOrFallback(file, { maxDimension: 1080, quality: 0.82 });
      onUpdateBlock(targetBlockId, (blk) => ({
        ...blk,
        content: { ...blk.content, mapsPhotoUrl: compressed },
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal memproses foto lokasi.');
    }
  };

  const handleUpdateSocialPost = (postId: string, patch: Partial<SocialPostItem>) => {
    if (!selectedBlock) return;
    const current = selectedBlock.content.socialFeedPosts ?? [];
    updateContent({
      socialFeedPosts: current.map((p) => (p.id === postId ? { ...p, ...patch } : p)),
    });
  };

  const handleSocialPostImageUpload = async (
    postId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedBlock) return;
    const targetBlockId = selectedBlock.id;
    setUploadError(null);
    try {
      const compressed = await uploadCompressedImageOrFallback(file, { maxDimension: 1080, quality: 0.82 });
      onUpdateBlock(targetBlockId, (blk) => ({
        ...blk,
        content: {
          ...blk.content,
          socialFeedPosts: (blk.content.socialFeedPosts ?? []).map((p) =>
            p.id === postId ? { ...p, imageUrl: compressed } : p
          ),
        },
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal memproses gambar postingan.');
    }
  };

  const handleSocialPostVideoUpload = async (
    postId: string,
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file || !selectedBlock) return;
    const targetBlockId = selectedBlock.id;
    setUploadError(null);
    try {
      const videoData = await readVideoFileSafe(file, 12);
      onUpdateBlock(targetBlockId, (blk) => ({
        ...blk,
        content: {
          ...blk.content,
          socialFeedPosts: (blk.content.socialFeedPosts ?? []).map((p) =>
            p.id === postId ? { ...p, videoUrl: videoData, mediaType: 'video' } : p
          ),
        },
      }));
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : 'Gagal membaca file video.');
    }
  };

  const makeDefaultSocialPost = (index: number): SocialPostItem => ({
    id: createId('sfp'),
    mediaType: 'image',
    imageUrl: SAMPLE_CAROUSEL_IMAGES[index % SAMPLE_CAROUSEL_IMAGES.length],
    videoUrl: '',
    caption: `Postingan #${index + 1} — tambahkan cerita atau detail konten Anda di sini.`,
    likes: '245',
    comments: '18',
    url: '',
  });

  const handleAddSocialPost = () => {
    if (!selectedBlock) return;
    const current = selectedBlock.content.socialFeedPosts ?? [];
    if (current.length >= 20) return;
    updateContent({
      socialFeedPosts: [...current, makeDefaultSocialPost(current.length)],
    });
  };

  const handleSetSocialPostCount = (targetCount: number) => {
    if (!selectedBlock || Number.isNaN(targetCount)) return;
    const clamped = Math.max(1, Math.min(20, Math.round(targetCount)));
    const current = selectedBlock.content.socialFeedPosts ?? [];
    if (clamped === current.length) return;
    if (clamped < current.length) {
      updateContent({ socialFeedPosts: current.slice(0, clamped) });
    } else {
      const additions: SocialPostItem[] = [];
      for (let i = current.length; i < clamped; i++) {
        additions.push(makeDefaultSocialPost(i));
      }
      updateContent({ socialFeedPosts: [...current, ...additions] });
    }
  };

  const handleDeleteSocialPost = (postId: string) => {
    if (!selectedBlock) return;
    const current = selectedBlock.content.socialFeedPosts ?? [];
    updateContent({
      socialFeedPosts: current.filter((p) => p.id !== postId),
    });
  };

  const handleReorderSocialPost = (draggedId: string, targetId: string) => {
    if (!selectedBlock || draggedId === targetId) return;
    const current = [...(selectedBlock.content.socialFeedPosts ?? [])];
    const fromIdx = current.findIndex((i) => i.id === draggedId);
    const toIdx = current.findIndex((i) => i.id === targetId);
    if (fromIdx === -1 || toIdx === -1) return;
    const [moved] = current.splice(fromIdx, 1);
    current.splice(toIdx, 0, moved);
    updateContent({ socialFeedPosts: current });
  };

  const renderAdvanceOptionSection = () => (
    <section className="space-y-4">
      <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
        Block Layout &amp; Tampilan Katalog
      </h3>

      {/* Show Unit Sold */}
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800">
            <span>Show Unit Sold</span>
            <span
              title="Tampilkan jumlah unit terjual pada detail produk di katalog."
              className="text-slate-400 hover:text-slate-600 cursor-help"
            >
              <Info className="w-3.5 h-3.5" />
            </span>
          </div>
          <div className="text-xs text-slate-600 mt-0.5">
            Show total unit sold on product detail
          </div>
        </div>
        <ToggleSwitch
          checked={advanceOptions.showUnitSold}
          onChange={(checked) => onUpdateAdvanceOptions({ showUnitSold: checked })}
          label="Show total unit sold on product detail"
        />
      </div>

      {/* 5. Block Layout */}
      <div className="space-y-2.5 pt-1">
        <div className="text-xs font-semibold text-slate-800">Block Layout</div>
        <div className="grid grid-cols-2 gap-2.5">
          {(
            [
              { id: 'default', label: 'Default' },
              { id: 'grid', label: 'Grid' },
              { id: 'large-image', label: 'Large Image' },
              { id: 'compact', label: 'Compact' },
            ] as { id: BlockLayoutMode; label: string }[]
          ).map((option) => {
            const active = advanceOptions.blockLayout === option.id;
            return (
              <button
                key={option.id}
                type="button"
                onClick={() => onUpdateAdvanceOptions({ blockLayout: option.id })}
                className="flex flex-col items-center text-center group cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600 rounded-xl"
              >
                <div
                  className={`relative w-full aspect-[4/3.6] rounded-xl p-1.5 border transition-all bg-white ${
                    active
                      ? 'border-emerald-500 ring-2 ring-emerald-500/20'
                      : 'border-slate-200 group-hover:border-slate-300'
                  }`}
                >
                  <LayoutWireframe mode={option.id} />
                </div>
                <span
                  className={`text-xs mt-1.5 font-medium ${
                    active ? 'text-emerald-700 font-semibold' : 'text-slate-700'
                  }`}
                >
                  {option.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
      </section>
  );

  const renderNavbarSettings = () => {
    const items = bottomNavbar.items;
    const activeItem =
      items.find((it) => it.id === activeNavItemId) ?? items[0] ?? null;

    const updateNavItem = (itemId: string, patch: Partial<BottomNavbarItem>) => {
      onUpdateBottomNavbar((prev) => ({
        ...prev,
        items: prev.items.map((it) => (it.id === itemId ? { ...it, ...patch } : it)),
      }));
    };

    const applyNavSheetTemplate = (
      itemId: string,
      tpl: 'galeri' | 'belanja' | 'kontak' | 'alamat' | 'form'
    ) => {
      let nextTitle = 'Informasi';
      let nextChildren: BuilderBlock[] = [];
      if (tpl === 'galeri') {
        nextTitle = 'Galeri Foto & Karya';
        const blk = createBlock('carousel', theme);
        nextChildren = [{ ...blk, style: { ...blk.style, marginBottom: 0 } }];
      } else if (tpl === 'belanja') {
        nextTitle = 'Belanja & Produk';
        const blk = createBlock('catalog', theme);
        nextChildren = [{ ...blk, style: { ...blk.style, marginBottom: 0 } }];
      } else if (tpl === 'kontak') {
        nextTitle = 'Hubungi Kami';
        const txt = createBlock('text', theme);
        const btn = createBlock('button', theme);
        const soc = createBlock('social', theme);
        nextChildren = [
          {
            ...txt,
            label: 'Info Kontak',
            style: { ...txt.style, align: 'left', marginBottom: 10 },
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
      } else if (tpl === 'alamat') {
        nextTitle = 'Alamat & Lokasi Maps';
        const blk = createBlock('maps_place', theme);
        nextChildren = [{ ...blk, style: { ...blk.style, marginBottom: 0 } }];
      } else {
        nextTitle = 'Formulir Pesan';
        const blk = createBlock('form', theme);
        nextChildren = [{ ...blk, style: { ...blk.style, marginBottom: 0 } }];
      }
      updateNavItem(itemId, {
        action: 'sheet',
        sheetTitle: nextTitle,
        children: nextChildren,
      });
    };

    const slotLabel = (idx: number) => {
      if (idx === 0) return 'Menu Kiri 1';
      if (idx === 1) return 'Menu Kiri 2';
      if (idx === 2) return 'Menu Tengah (Home)';
      if (idx === 3) return 'Menu Kanan 1';
      return 'Menu Kanan 2';
    };

    const navMetrics = resolveNavbarMetrics(bottomNavbar);

    return (
      <div className="flex-1 overflow-y-auto p-3.5 space-y-3.5 bg-[#F8FAFC]">
        {/* Kotak 1: Status & Tampilan Navbar */}
        <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <div>
              <h4 className="text-[13px] font-bold text-slate-900">Navbar Bawah</h4>
              <p className="text-[11px] text-slate-500">
                Aktifkan menu mengambang dengan Modal Bottom Sheet
              </p>
            </div>
            <ToggleSwitch
              checked={bottomNavbar.enabled}
              onChange={(checked) =>
                onUpdateBottomNavbar((prev) => ({ ...prev, enabled: checked }))
              }
              label="Aktifkan Navbar Bawah"
            />
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-700 mb-1.5">
              Posisi Navbar
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: false, label: 'Menempel Bawah' },
                  { id: true, label: 'Mengambang (Floating)' },
                ] as const
              ).map((opt) => (
                <button
                  key={String(opt.id)}
                  type="button"
                  onClick={() =>
                    onUpdateBottomNavbar((prev) =>
                      opt.id
                        ? {
                            ...prev,
                            floating: true,
                            barWidthPercent:
                              prev.barWidthPercent === undefined || prev.barWidthPercent === 100
                                ? 94
                                : prev.barWidthPercent,
                            bottomOffset:
                              prev.bottomOffset === undefined || prev.bottomOffset === 0
                                ? 12
                                : prev.bottomOffset,
                            borderRadius:
                              prev.borderRadius === undefined || prev.borderRadius === 0
                                ? 20
                                : prev.borderRadius,
                            barShadow: prev.barShadow ?? 'md',
                          }
                        : {
                            ...prev,
                            floating: false,
                            barWidthPercent: 100,
                            bottomOffset: 0,
                            borderRadius: 0,
                          }
                    )
                  }
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                    navMetrics.floating === opt.id
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-slate-700 mb-1.5">
              Gaya Tombol Tengah (Home)
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              {(
                [
                  { id: 'elevated', label: 'Menonjol (Bulat)' },
                  { id: 'inline', label: 'Sejajar Rata' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() =>
                    onUpdateBottomNavbar((prev) => ({ ...prev, centerStyle: opt.id }))
                  }
                  className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                    bottomNavbar.centerStyle === opt.id
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Pengaturan Ukuran, Posisi Naik/Turun & Shadow */}
          <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
            <div className="text-[11px] font-bold text-slate-700">
              Ukuran, Posisi Naik/Turun &amp; Shadow
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-0.5">
                <span>Ukuran Ikon</span>
                <span className="tabular-nums text-slate-500 font-semibold">
                  {navMetrics.iconSize}px
                </span>
              </div>
              <input
                type="range"
                min={12}
                max={32}
                step={1}
                value={navMetrics.iconSize}
                onChange={(e) =>
                  onUpdateBottomNavbar((prev) => ({ ...prev, iconSize: Number(e.target.value) }))
                }
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-0.5">
                <span>Ukuran Teks</span>
                <span className="tabular-nums text-slate-500 font-semibold">
                  {navMetrics.labelSize}px
                </span>
              </div>
              <input
                type="range"
                min={8}
                max={16}
                step={1}
                value={navMetrics.labelSize}
                onChange={(e) =>
                  onUpdateBottomNavbar((prev) => ({ ...prev, labelSize: Number(e.target.value) }))
                }
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-0.5">
                <span>Tinggi / Tebal Navbar</span>
                <span className="tabular-nums text-slate-500 font-semibold">
                  {navMetrics.barPaddingY}px
                </span>
              </div>
              <input
                type="range"
                min={2}
                max={24}
                step={1}
                value={navMetrics.barPaddingY}
                onChange={(e) =>
                  onUpdateBottomNavbar((prev) => ({
                    ...prev,
                    barPaddingY: Number(e.target.value),
                  }))
                }
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-0.5">
                <span>Lebar Navbar</span>
                <span className="tabular-nums text-slate-500 font-semibold">
                  {navMetrics.barWidthPercent}%
                </span>
              </div>
              <input
                type="range"
                min={70}
                max={100}
                step={1}
                value={navMetrics.barWidthPercent}
                onChange={(e) =>
                  onUpdateBottomNavbar((prev) => ({
                    ...prev,
                    barWidthPercent: Number(e.target.value),
                  }))
                }
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-0.5">
                <span>Naik / Turun dari Bawah</span>
                <span className="tabular-nums text-slate-500 font-semibold">
                  {navMetrics.bottomOffset}px
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={48}
                step={2}
                value={navMetrics.bottomOffset}
                onChange={(e) =>
                  onUpdateBottomNavbar((prev) => ({
                    ...prev,
                    bottomOffset: Number(e.target.value),
                  }))
                }
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] font-medium text-slate-600 mb-0.5">
                <span>Sudut Melengkung</span>
                <span className="tabular-nums text-slate-500 font-semibold">
                  {navMetrics.borderRadius}px
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={32}
                step={2}
                value={navMetrics.borderRadius}
                onChange={(e) =>
                  onUpdateBottomNavbar((prev) => ({
                    ...prev,
                    borderRadius: Number(e.target.value),
                  }))
                }
                className="w-full accent-emerald-600 cursor-pointer"
              />
            </div>

            <div>
              <div className="text-[11px] font-medium text-slate-600 mb-1">
                Bayangan (Shadow)
              </div>
              <div className="grid grid-cols-4 gap-1">
                {(
                  [
                    { id: 'none', label: 'Tanpa' },
                    { id: 'sm', label: 'Halus' },
                    { id: 'md', label: 'Sedang' },
                    { id: 'lg', label: 'Tebal' },
                  ] as { id: ShadowPreset; label: string }[]
                ).map((sh) => (
                  <button
                    key={sh.id}
                    type="button"
                    onClick={() =>
                      onUpdateBottomNavbar((prev) => ({ ...prev, barShadow: sh.id }))
                    }
                    className={`py-1 px-1.5 rounded-md text-[10.5px] font-semibold border transition-colors cursor-pointer ${
                      navMetrics.barShadow === sh.id
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {sh.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-slate-700">Warna Navbar</span>
              <button
                type="button"
                onClick={() =>
                  onUpdateBottomNavbar((prev) => ({
                    ...prev,
                    barBg: theme.cardBg,
                    textColor: theme.textColor,
                    accentColor: theme.accentColor,
                    borderColor: theme.borderColor,
                  }))
                }
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Samakan Tema</span>
              </button>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Latar Bar
                </label>
                <input
                  type="color"
                  value={bottomNavbar.barBg}
                  onChange={(e) =>
                    onUpdateBottomNavbar((prev) => ({ ...prev, barBg: e.target.value }))
                  }
                  className="w-full h-8 rounded-lg border border-slate-200 bg-white p-0.5 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Teks &amp; Ikon
                </label>
                <input
                  type="color"
                  value={bottomNavbar.textColor}
                  onChange={(e) =>
                    onUpdateBottomNavbar((prev) => ({ ...prev, textColor: e.target.value }))
                  }
                  className="w-full h-8 rounded-lg border border-slate-200 bg-white p-0.5 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Aksen (Home)
                </label>
                <input
                  type="color"
                  value={bottomNavbar.accentColor}
                  onChange={(e) =>
                    onUpdateBottomNavbar((prev) => ({ ...prev, accentColor: e.target.value }))
                  }
                  className="w-full h-8 rounded-lg border border-slate-200 bg-white p-0.5 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-slate-500 mb-1">
                  Garis Atas
                </label>
                <input
                  type="color"
                  value={bottomNavbar.borderColor}
                  onChange={(e) =>
                    onUpdateBottomNavbar((prev) => ({ ...prev, borderColor: e.target.value }))
                  }
                  className="w-full h-8 rounded-lg border border-slate-200 bg-white p-0.5 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Kotak 2: Daftar 5 Menu & Editor Menu Terpilih */}
        <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
          <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
            <h4 className="text-[13px] font-bold text-slate-900">5 Menu Navbar</h4>
            <span className="text-[11px] text-slate-400">Klik menu untuk edit</span>
          </div>

          <div className="grid grid-cols-5 gap-1">
            {items.map((it) => {
              const isSelectedNav = activeItem?.id === it.id;
              const icId = resolveButtonIcon(it.icon, it.label);
              const glyph = icId === 'none' ? 'info' : icId;
              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => onSelectNavItem(it.id)}
                  className={`relative flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg border text-center transition-all cursor-pointer min-w-0 ${
                    isSelectedNav
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                  } ${it.enabled === false ? 'opacity-50' : ''}`}
                >
                  <span
                    className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                      it.enabled !== false
                        ? isSelectedNav
                          ? 'bg-emerald-200'
                          : 'bg-emerald-500'
                        : 'bg-slate-400'
                    }`}
                  />
                  <ButtonGlyph icon={glyph} iconUrl={it.iconUrl} className="w-3.5 h-3.5 shrink-0" />
                  <span className="text-[10px] font-semibold truncate max-w-full">
                    {it.label || 'Menu'}
                  </span>
                </button>
              );
            })}
          </div>

          {activeItem && (() => {
            const activeIdx = items.findIndex((i) => i.id === activeItem.id);
            const activeIcon = resolveButtonIcon(activeItem.icon, activeItem.label);
            return (
              <div className="pt-2 border-t border-slate-100 space-y-3">
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <div className="text-xs font-bold text-slate-900">
                      {activeItem.label || 'Menu'}
                    </div>
                    <div className="text-[11px] text-slate-400">{slotLabel(activeIdx)}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] font-medium text-slate-500">
                      {activeItem.enabled !== false ? 'Aktif' : 'Nonaktif'}
                    </span>
                    <ToggleSwitch
                      checked={activeItem.enabled !== false}
                      onChange={(checked) => updateNavItem(activeItem.id, { enabled: checked })}
                      label={`Aktifkan menu ${activeItem.label}`}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Label Menu
                  </label>
                  <input
                    type="text"
                    value={activeItem.label}
                    onChange={(e) => updateNavItem(activeItem.id, { label: e.target.value })}
                    placeholder="Contoh: Galeri"
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:border-emerald-500 outline-none"
                  />
                </div>

                <div>
                  <div className="text-xs font-medium text-slate-700 mb-1.5">Pilih Ikon</div>
                  <IconPicker
                    selectedIcon={activeIcon === 'none' ? 'info' : activeIcon}
                    iconUrl={activeItem.iconUrl ?? ''}
                    allowNone={false}
                    accentVariant="emerald"
                    onSelectIcon={(icon) => updateNavItem(activeItem.id, { icon })}
                    onChangeIconUrl={(iconUrl) => updateNavItem(activeItem.id, { iconUrl })}
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">
                    Aksi Saat Diklik
                  </label>
                  <select
                    value={activeItem.action}
                    onChange={(e) =>
                      updateNavItem(activeItem.id, {
                        action: e.target.value as BottomNavbarItemAction,
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:border-emerald-500 outline-none"
                  >
                    <option value="sheet">Buka Modal Bottom Sheet</option>
                    <option value="scroll_top">Ke Atas / Beranda (Home)</option>
                    <option value="link">Buka Tautan / Link WA</option>
                  </select>
                </div>

                {activeItem.action === 'link' && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-1.5">
                    <label className="block text-[11px] font-semibold text-slate-700">
                      URL Tautan / WhatsApp
                    </label>
                    <input
                      type="url"
                      value={activeItem.linkUrl ?? ''}
                      onChange={(e) =>
                        updateNavItem(activeItem.id, { linkUrl: e.target.value })
                      }
                      placeholder="https://wa.me/62812... atau https://..."
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:border-emerald-500 outline-none"
                    />
                  </div>
                )}

                {activeItem.action === 'sheet' && (
                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-bold text-slate-800">
                        Isi Modal Bottom Sheet
                      </span>
                      <span className="text-[11px] text-slate-400 tabular-nums">
                        {activeItem.children.length} elemen
                      </span>
                    </div>

                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Judul Modal Sheet
                      </label>
                      <input
                        type="text"
                        value={activeItem.sheetTitle}
                        onChange={(e) =>
                          updateNavItem(activeItem.id, { sheetTitle: e.target.value })
                        }
                        placeholder={activeItem.label}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:border-emerald-500 outline-none"
                      />
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-slate-600 mb-1.5">
                        Isi Cepat Template
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(
                          [
                            { id: 'galeri', label: 'Galeri Foto' },
                            { id: 'belanja', label: 'Katalog Belanja' },
                            { id: 'kontak', label: 'Kontak & WA' },
                            { id: 'alamat', label: 'Alamat & Maps' },
                            { id: 'form', label: 'Form Isian' },
                          ] as const
                        ).map((tpl) => (
                          <button
                            key={tpl.id}
                            type="button"
                            onClick={() => applyNavSheetTemplate(activeItem.id, tpl.id)}
                            className="py-1.5 px-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 hover:bg-emerald-50/40 text-[11px] font-medium text-slate-700 cursor-pointer text-left truncate transition-colors"
                          >
                            {tpl.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-slate-600 mb-1.5">
                        Elemen di Dalam Modal
                      </div>
                      {activeItem.children.length > 0 ? (
                        <div className="space-y-1.5">
                          {activeItem.children.map((child, cIdx) => (
                            <div
                              key={child.id}
                              className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white"
                            >
                              <button
                                type="button"
                                onClick={() => onSelectBlock?.(child.id)}
                                className="min-w-0 flex-1 text-left cursor-pointer hover:text-emerald-700"
                              >
                                <div className="text-xs font-semibold text-slate-800 truncate">
                                  {cIdx + 1}. {child.label.trim() || BLOCK_TYPE_NAMES[child.type]}
                                </div>
                                <div className="text-[11px] text-slate-400 truncate">
                                  {BLOCK_TYPE_NAMES[child.type]} · Klik untuk edit
                                </div>
                              </button>
                              <button
                                type="button"
                                onClick={() =>
                                  updateNavItem(activeItem.id, {
                                    children: activeItem.children.filter(
                                      (ch) => ch.id !== child.id
                                    ),
                                  })
                                }
                                title="Hapus elemen dari modal"
                                className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="py-3 px-2.5 rounded-lg border border-dashed border-slate-300 bg-white text-center text-[11px] text-slate-400">
                          Modal sheet ini masih kosong.
                        </div>
                      )}
                    </div>

                    <div>
                      <div className="text-[11px] font-semibold text-slate-600 mb-1.5">
                        + Tambah Elemen ke Modal
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        {(
                          [
                            { type: 'carousel', label: 'Galeri Foto' },
                            { type: 'catalog', label: 'Katalog Produk' },
                            { type: 'maps_place', label: 'Maps & Ulasan' },
                            { type: 'button', label: 'Tombol CTA' },
                            { type: 'text', label: 'Teks / Info' },
                            { type: 'social', label: 'Ikon Sosmed' },
                            { type: 'image', label: 'Gambar' },
                            { type: 'form', label: 'Form Isian' },
                          ] as { type: BlockType; label: string }[]
                        ).map((opt) => (
                          <button
                            key={opt.type}
                            type="button"
                            onClick={() => onAddChildToContainer(activeItem.id, opt.type)}
                            className="flex items-center gap-1 py-1.5 px-2 rounded-lg border border-slate-200 bg-white hover:border-emerald-400 hover:bg-emerald-50/40 text-[11px] font-medium text-slate-700 cursor-pointer truncate transition-colors"
                          >
                            <Plus className="w-3 h-3 text-emerald-600 shrink-0" />
                            <span className="truncate">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })()}
        </div>
      </div>
    );
  };

  const renderElementSettings = () => {
    if (!selectedBlock) {
      return (
        <div className="flex-1 flex flex-col items-center justify-center text-center p-6 space-y-4">
          <div className="w-11 h-11 rounded-xl bg-[#EFF7F4] text-emerald-600 flex items-center justify-center">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div className="space-y-1.5">
            <div className="text-[14px] font-semibold text-slate-800">Belum Ada Elemen Dipilih</div>
            <p className="text-[13px] text-slate-500 leading-relaxed">
              Klik elemen mana saja pada kanvas HP atau tab <strong>Lapisan</strong> untuk mengubah teks, tautan, spasi, dan tampilannya.
            </p>
          </div>
          <div className="w-full p-3 rounded-xl border border-slate-200 bg-slate-50/80 text-left space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="text-xs font-bold text-slate-800">Navbar Bawah (5 Menu)</div>
                <div className="text-[11px] text-slate-500 truncate">
                  {bottomNavbar.enabled ? 'Aktif di halaman bawah' : 'Belum diaktifkan'}
                </div>
              </div>
              <ToggleSwitch
                checked={bottomNavbar.enabled}
                onChange={(checked) =>
                  onUpdateBottomNavbar((prev) => ({ ...prev, enabled: checked }))
                }
                label="Aktifkan Navbar Bawah"
              />
            </div>
            <button
              type="button"
              onClick={() => onChangeInspectorMode('navbar')}
              className="w-full py-1.5 px-3 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 text-xs font-semibold text-emerald-700 cursor-pointer transition-colors"
            >
              Atur 5 Menu Navbar
            </button>
          </div>
        </div>
      );
    }

    const s = selectedBlock.style;
    const c = selectedBlock.content;

    return (
      <div className="flex-1 flex flex-col overflow-hidden">
        {selectedParentNavId && (
          <div className="px-4 py-2 bg-emerald-50/80 border-b border-emerald-100 shrink-0">
            <button
              type="button"
              onClick={() => {
                onSelectNavItem(selectedParentNavId);
                onChangeInspectorMode('navbar');
              }}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-800 hover:text-emerald-950 cursor-pointer"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Kembali ke Navbar ({selectedParentNavLabel || 'Menu'})</span>
            </button>
          </div>
        )}
        {/* Sticky Element Header + Konten / Tampilan Tab Switcher */}
        <div className="px-4 pt-3 pb-3 border-b border-slate-100 bg-white space-y-3 shrink-0">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="text-[14px] font-semibold text-slate-800 truncate">
                {selectedBlock.label}
              </div>
              <div className="text-[12px] text-emerald-600 font-medium">
                {BLOCK_TYPE_NAMES[selectedBlock.type]}
              </div>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                type="button"
                onClick={() => onDuplicateBlock(selectedBlock.id)}
                title="Duplikat Elemen"
                className="p-1.5 rounded-lg border border-slate-200/80 text-slate-500 hover:bg-[#EFF7F4] hover:text-emerald-700 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={handleResetStyle}
                title="Reset Gaya Elemen"
                className="p-1.5 rounded-lg border border-slate-200/80 text-slate-500 hover:bg-[#EFF7F4] hover:text-emerald-700 transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div
            role="tablist"
            aria-label="Kategori Pengaturan Elemen"
            className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-slate-100"
          >
            <button
              type="button"
              role="tab"
              aria-selected={inspectorTab === 'content'}
              onClick={() => setInspectorTab('content')}
              className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                inspectorTab === 'content'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Type className="w-3.5 h-3.5" />
              <span>Konten</span>
            </button>
            <button
              type="button"
              role="tab"
              aria-selected={inspectorTab === 'appearance'}
              onClick={() => setInspectorTab('appearance')}
              className={`inline-flex items-center justify-center gap-1.5 py-1.5 px-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                inspectorTab === 'appearance'
                  ? 'bg-white text-emerald-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Palette className="w-3.5 h-3.5" />
              <span>Tampilan</span>
            </button>
          </div>
        </div>

        {/* Scrollable Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {uploadError && (
            <div className="p-2.5 rounded-xl bg-red-50 border border-red-200 text-red-700 text-[11px] font-medium flex items-start justify-between gap-2">
              <span>{uploadError}</span>
              <button
                type="button"
                onClick={() => setUploadError(null)}
                className="p-0.5 text-red-500 hover:text-red-700 cursor-pointer shrink-0"
                aria-label="Tutup peringatan"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {inspectorTab === 'content' && (
            <section className="space-y-3">
              <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                Konten Elemen
              </h3>

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">Nama Lapisan</label>
            <input
              type="text"
              value={selectedBlock.label}
              onChange={(e) =>
                onUpdateBlock(selectedBlock.id, (blk) => ({ ...blk, label: e.target.value }))
              }
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
            />
          </div>

          {selectedBlock.type === 'container' && (
            <div className="space-y-3">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-medium text-slate-700">Tambah ke Dalam Wadah:</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['text', 'image', 'button', 'divider'] as BlockType[]).map((childType) => (
                    <button
                      key={childType}
                      type="button"
                      onClick={() => onAddChildToContainer(selectedBlock.id, childType)}
                      className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md bg-white border border-slate-200 hover:border-blue-400 text-xs font-medium text-slate-700 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-blue-600" />
                      <span>{BLOCK_TYPE_NAMES[childType]}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-2.5 rounded-xl bg-[#EFF7F4]/70 border border-emerald-200/80 space-y-2">
                <div className="text-[11px] font-bold text-slate-800">
                  Preset Box Dinamis &amp; Gradasi Cepat
                </div>
                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateStyle({
                        backgroundMode: 'solid',
                        backgroundColor: '#FFFFFF',
                        borderRadius: 20,
                        borderWidth: 1,
                        borderColor: '#E2E8F0',
                        shadow: 'sm',
                        hoverLift: true,
                        useThemeTextColor: false,
                        textColor: '#0F172A',
                      })
                    }
                    className="py-1.5 px-2 rounded-lg bg-white border border-slate-200 hover:border-emerald-400 text-[11px] font-semibold text-slate-700 cursor-pointer"
                  >
                    Kartu Bersih + Lift
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateStyle({
                        backgroundMode: 'gradient',
                        gradientColor1: '#EA580C',
                        gradientColor2: '#9A3412',
                        gradientAngle: 135,
                        borderRadius: 24,
                        borderWidth: 0,
                        shadow: 'md',
                        hoverLift: true,
                        useThemeTextColor: false,
                        textColor: '#FFFFFF',
                      })
                    }
                    className="py-1.5 px-2 rounded-lg text-[11px] font-semibold text-white cursor-pointer"
                    style={{ backgroundImage: 'linear-gradient(135deg, #EA580C, #9A3412)' }}
                  >
                    Box Promo Gradasi
                  </button>
                </div>
                <button
                  type="button"
                  onClick={() => setInspectorTab('appearance')}
                  className="w-full py-1.5 px-2 rounded-lg bg-white border border-emerald-200 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                >
                  Atur Warna Gradasi, Derajat (°) &amp; Font →
                </button>
              </div>
            </div>
          )}

          {selectedBlock.type === 'row' && (() => {
            const rowMode = c.rowLayoutMode ?? 'grid';
            const rowCols = Math.max(1, Math.min(6, c.rowColumns ?? 2));
            const rowColWidth = Math.max(80, Math.min(340, c.rowColumnWidth ?? 156));
            const rowColMinH = Math.max(0, Math.min(360, c.rowColumnMinHeight ?? 0));
            const rowGap = Math.max(0, Math.min(32, c.rowGap ?? 12));
            const rowChildren = selectedBlock.children ?? [];

            const updateRowChildren = (nextChildren: BuilderBlock[]) => {
              onUpdateBlock(selectedBlock.id, (blk) => ({
                ...blk,
                children: nextChildren,
              }));
            };

            const addCardColumn = () => {
              const idx = rowChildren.length + 1;
              const newCard: BuilderBlock = {
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
              };
              updateRowChildren([...rowChildren, newCard]);
            };

            const makeFiveHorizontalCols = () => {
              const nextChildren = [...rowChildren];
              while (nextChildren.length < 5) {
                const idx = nextChildren.length + 1;
                nextChildren.push({
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
                      content: { text: 'Isi konten kolom.', variant: 'body', fontWeight: 'normal' },
                    },
                  ],
                });
              }
              onUpdateBlock(selectedBlock.id, (blk) => ({
                ...blk,
                content: {
                  ...blk.content,
                  rowLayoutMode: 'horizontal',
                  rowColumnWidth: blk.content.rowColumnWidth ?? 150,
                  rowGap: blk.content.rowGap ?? 10,
                },
                children: nextChildren,
              }));
            };

            const moveColumn = (idx: number, dir: -1 | 1) => {
              const target = idx + dir;
              if (target < 0 || target >= rowChildren.length) return;
              const copy = [...rowChildren];
              const [moved] = copy.splice(idx, 1);
              copy.splice(target, 0, moved);
              updateRowChildren(copy);
            };

            return (
              <div className="space-y-3.5">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800">Mode Tata Letak Kolom</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateContent({ rowLayoutMode: 'horizontal' })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
                        rowMode === 'horizontal'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Slide Horizontal (4+ Kolom)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateContent({ rowLayoutMode: 'grid' })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
                        rowMode === 'grid'
                          ? 'bg-emerald-600 text-white border-emerald-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      Grid Sejajar (1–6 Kolom)
                    </button>
                  </div>

                  {rowMode === 'horizontal' ? (
                    <div className="space-y-2 pt-1 border-t border-slate-100">
                      <SliderRow
                        label="Ukuran Lebar Tiap Kolom"
                        value={`${rowColWidth}px`}
                        min={80}
                        max={340}
                        current={rowColWidth}
                        onChange={(val) => updateContent({ rowColumnWidth: val })}
                      />
                      <div className="grid grid-cols-4 gap-1">
                        {[
                          { label: 'Kecil', px: 110 },
                          { label: 'Sedang', px: 150 },
                          { label: 'Besar', px: 200 },
                          { label: 'Lebar', px: 260 },
                        ].map((p) => (
                          <button
                            key={p.px}
                            type="button"
                            onClick={() => updateContent({ rowColumnWidth: p.px })}
                            className={`py-1 px-1.5 rounded text-[10px] font-semibold border cursor-pointer ${
                              rowColWidth === p.px
                                ? 'bg-emerald-50 text-emerald-700 border-emerald-300'
                                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {p.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-1.5 pt-1 border-t border-slate-100">
                      <label className="block text-[11px] font-medium text-slate-600">
                        Jumlah Kolom per Baris ({rowCols} Kolom)
                      </label>
                      <div className="grid grid-cols-6 gap-1">
                        {[1, 2, 3, 4, 5, 6].map((n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() => updateContent({ rowColumns: n })}
                            className={`py-1.5 rounded-md text-xs font-bold border cursor-pointer ${
                              rowCols === n
                                ? 'bg-emerald-600 text-white border-emerald-600'
                                : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}

                  <SliderRow
                    label="Tinggi Minimal Kolom"
                    value={rowColMinH === 0 ? 'Auto' : `${rowColMinH}px`}
                    min={0}
                    max={360}
                    current={rowColMinH}
                    onChange={(val) => updateContent({ rowColumnMinHeight: val })}
                  />
                  <SliderRow
                    label="Jarak Antar Kolom"
                    value={`${rowGap}px`}
                    min={0}
                    max={32}
                    current={rowGap}
                    onChange={(val) => updateContent({ rowGap: val })}
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">Ukuran Kotak Wadah (Row)</span>
                    <button
                      type="button"
                      onClick={() => setInspectorTab('appearance')}
                      className="text-[10.5px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                    >
                      Gradasi &amp; Warna →
                    </button>
                  </div>
                  <SliderRow
                    label="Lebar Kotak Wadah"
                    value={`${s.widthPercent}%`}
                    min={50}
                    max={100}
                    current={s.widthPercent}
                    onChange={(val) => updateStyle({ widthPercent: val })}
                  />
                  <SliderRow
                    label="Tinggi Minimal Wadah"
                    value={`${s.minHeight}px`}
                    min={40}
                    max={420}
                    current={s.minHeight}
                    onChange={(val) => updateStyle({ minHeight: val })}
                  />
                  <SliderRow
                    label="Padding Dalam Wadah"
                    value={`${s.padding}px`}
                    min={0}
                    max={32}
                    current={s.padding}
                    onChange={(val) =>
                      updateStyle({
                        padding: val,
                        paddingX: undefined,
                        paddingTop: undefined,
                        paddingBottom: undefined,
                      })
                    }
                  />
                  <SliderRow
                    label="Lengkung Sudut Wadah"
                    value={`${s.borderRadius}px`}
                    min={0}
                    max={32}
                    current={s.borderRadius}
                    onChange={(val) => updateStyle({ borderRadius: val })}
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Daftar Kolom ({rowChildren.length})
                    </span>
                    <button
                      type="button"
                      onClick={makeFiveHorizontalCols}
                      className="px-2 py-1 rounded-lg bg-[#EFF7F4] text-emerald-700 border border-emerald-200 text-[10.5px] font-semibold hover:bg-emerald-100 cursor-pointer"
                    >
                      Buat 5 Kolom Slide
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={addCardColumn}
                      className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold cursor-pointer hover:bg-emerald-700"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Kolom Kotak</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddChildToContainer(selectedBlock.id, 'image')}
                      className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-emerald-400 text-[11px] font-semibold text-slate-700 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-emerald-600" />
                      <span>Kolom Gambar</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddChildToContainer(selectedBlock.id, 'button')}
                      className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-emerald-400 text-[11px] font-semibold text-slate-700 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-emerald-600" />
                      <span>Kolom Tombol</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onAddChildToContainer(selectedBlock.id, 'text')}
                      className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-emerald-400 text-[11px] font-semibold text-slate-700 cursor-pointer"
                    >
                      <Plus className="w-3 h-3 text-emerald-600" />
                      <span>Kolom Teks</span>
                    </button>
                  </div>

                  <div className="space-y-1.5 max-h-56 overflow-y-auto pr-0.5">
                    {rowChildren.map((child, idx) => (
                      <div
                        key={child.id}
                        className="p-2 rounded-lg bg-slate-50 border border-slate-200 flex items-center justify-between gap-1.5"
                      >
                        <button
                          type="button"
                          onClick={() => onSelectBlock?.(child.id)}
                          className="min-w-0 flex-1 text-left cursor-pointer hover:text-emerald-700"
                          title="Klik untuk atur isi & ukuran kotak kolom ini"
                        >
                          <div className="text-xs font-semibold text-slate-800 truncate">
                            {idx + 1}. {child.label || BLOCK_TYPE_NAMES[child.type]}
                          </div>
                          <div className="text-[10px] text-slate-500">
                            {BLOCK_TYPE_NAMES[child.type]} · Klik untuk edit kotak
                          </div>
                        </button>
                        <div className="flex items-center gap-0.5 shrink-0">
                          <button
                            type="button"
                            onClick={() => moveColumn(idx, -1)}
                            disabled={idx === 0}
                            className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                            title="Geser kiri"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveColumn(idx, 1)}
                            disabled={idx === rowChildren.length - 1}
                            className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                            title="Geser kanan"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              const dup = cloneBlockDeep(child);
                              dup.label = `${child.label || BLOCK_TYPE_NAMES[child.type]} Salinan`;
                              const next = [...rowChildren];
                              next.splice(idx + 1, 0, dup);
                              updateRowChildren(next);
                            }}
                            className="p-1 text-slate-500 hover:text-emerald-700 cursor-pointer"
                            title="Duplikat kolom"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateRowChildren(rowChildren.filter((cItem) => cItem.id !== child.id))
                            }
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                            title="Hapus kolom"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {selectedBlock.type === 'hero_profile' && (() => {
            const heroVariant = c.heroVariant ?? 'compact';
            const isFullTop = Boolean(s.fullBleed) && (advanceOptions.pageTopPadding ?? 12) === 0;
            const isEmbeddedImg = (val?: string) => Boolean(val && val.startsWith('data:image/'));
            const getImgSourceLabel = (val?: string) => {
              if (!val?.trim()) return 'Tanpa Foto';
              if (val.startsWith('data:image/svg+xml')) return 'Gambar Bawaan';
              if (val.startsWith('data:image/')) return 'Upload Lokal';
              if (val.startsWith('/api/media/') || val.startsWith('/assets/')) return 'Upload Server';
              return 'Link URL';
            };
            const coverTitleShown =
              c.heroCoverTitleEnabled !== false && c.heroCoverFontFamily !== '__none__';

            const handleHeroUpload = async (
              field: 'heroLogoImage' | 'heroCoverImage',
              e: React.ChangeEvent<HTMLInputElement>
            ) => {
              const file = e.target.files?.[0];
              e.target.value = '';
              if (!file) return;
              const targetBlockId = selectedBlock.id;
              setUploadError(null);
              setHeroUploadingField(field);
              try {
                const url = await uploadCompressedImageOrFallback(file, {
                  maxDimension: field === 'heroCoverImage' ? 1200 : 480,
                  quality: 0.84,
                });
                onUpdateBlock(targetBlockId, (blk) => ({
                  ...blk,
                  content: { ...blk.content, [field]: url },
                }));
              } catch (err) {
                setUploadError(err instanceof Error ? err.message : 'Gagal memproses gambar.');
              } finally {
                setHeroUploadingField((prev) => (prev === field ? null : prev));
              }
            };

            return (
              <div className="space-y-3.5">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800">Model Hero Profil</div>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(
                      [
                        { id: 'compact', label: 'Kompak (Logo + Jam)' },
                        { id: 'banner', label: 'Banner + Kartu Overlap' },
                      ] as { id: HeroProfileVariant; label: string }[]
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() =>
                          updateContent({
                            heroVariant: opt.id,
                            ...(opt.id === 'banner'
                              ? {
                                  heroStatusEnabled: false,
                                  heroCardRadius: c.heroCardRadius ?? 24,
                                  heroLogoSize: c.heroLogoSize ?? 78,
                                }
                              : {
                                  heroStatusEnabled: true,
                                  heroLogoSize: c.heroLogoSize ?? 72,
                                }),
                          })
                        }
                        className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border cursor-pointer transition-colors ${
                          heroVariant === opt.id
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-200/80">
                    <div>
                      <div className="text-xs font-semibold text-slate-800">
                        Full Atas &amp; Samping
                      </div>
                      <div className="text-[10.5px] text-slate-500">
                        Tempel langsung ke paling atas &amp; penuh kiri-kanan
                      </div>
                    </div>
                    <ToggleSwitch
                      checked={isFullTop}
                      onChange={(checked) => {
                        if (checked) {
                          updateStyle({ fullBleed: true, widthPercent: 100, borderRadius: 0 });
                          onUpdateAdvanceOptions({ pageTopPadding: 0 });
                        } else {
                          updateStyle({ fullBleed: false, borderRadius: heroVariant === 'banner' ? 18 : 20 });
                          onUpdateAdvanceOptions({ pageTopPadding: 12 });
                        }
                      }}
                      label="Full Atas & Samping"
                    />
                  </div>
                </div>

                {heroVariant === 'banner' && (
                  <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="text-xs font-bold text-slate-800">Foto Banner Cover</div>
                      <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600">
                        {getImgSourceLabel(c.heroCoverImage)}
                      </span>
                    </div>

                    <div className="relative h-24 w-full rounded-lg overflow-hidden border border-slate-200 bg-slate-900">
                      {c.heroCoverImage ? (
                        <img
                          src={c.heroCoverImage}
                          alt={c.heroTitle || 'Preview cover'}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover block"
                        />
                      ) : (
                        <div className="w-full h-full bg-linear-to-br from-amber-900 via-orange-950 to-slate-900 flex items-center justify-center">
                          <span className="text-[11px] font-medium text-white/75">
                            Gradasi bawaan (tanpa foto)
                          </span>
                        </div>
                      )}
                      {c.heroCoverImage && (
                        <button
                          type="button"
                          onClick={() => updateContent({ heroCoverImage: '' })}
                          className="absolute top-1.5 right-1.5 inline-flex items-center gap-1 px-2 py-1 rounded-md bg-black/65 hover:bg-red-600 text-white text-[10px] font-semibold cursor-pointer transition-colors"
                          title="Hapus foto cover"
                        >
                          <Trash2 className="w-3 h-3" />
                          <span>Hapus Foto</span>
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <label className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/80 hover:bg-emerald-100 text-xs font-semibold text-emerald-700 cursor-pointer transition-colors">
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {heroUploadingField === 'heroCoverImage'
                            ? 'Mengunggah foto...'
                            : 'Upload Gambar dari Perangkat'}
                        </span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={heroUploadingField === 'heroCoverImage'}
                          onChange={(e) => handleHeroUpload('heroCoverImage', e)}
                        />
                      </label>

                      <div>
                        <label className="block text-[10.5px] font-medium text-slate-600 mb-1">
                          Atau Ganti dengan Link Gambar (URL)
                        </label>
                        <input
                          type="text"
                          value={isEmbeddedImg(c.heroCoverImage) ? '' : (c.heroCoverImage ?? '')}
                          onChange={(e) => updateContent({ heroCoverImage: e.target.value })}
                          placeholder={
                            isEmbeddedImg(c.heroCoverImage)
                              ? 'Tempel link https://... untuk mengganti gambar'
                              : 'https://contoh.com/foto-cover.jpg'
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-100 space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <div>
                          <div className="text-xs font-semibold text-slate-800">
                            Teks &amp; Font di Tengah Banner
                          </div>
                          <div className="text-[10.5px] text-slate-500">
                            Matikan jika ingin gambar tampil bersih tanpa teks
                          </div>
                        </div>
                        <ToggleSwitch
                          checked={coverTitleShown}
                          onChange={(val) => updateContent({ heroCoverTitleEnabled: val })}
                          label="Tampilkan teks di banner"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-slate-600 mb-1">
                          Font Teks Cover
                        </label>
                        <select
                          value={coverTitleShown ? (c.heroCoverFontFamily ?? 'Pacifico') : '__none__'}
                          onChange={(e) => {
                            const val = e.target.value;
                            if (val === '__none__') {
                              updateContent({ heroCoverTitleEnabled: false });
                            } else {
                              updateContent({
                                heroCoverTitleEnabled: true,
                                heroCoverFontFamily: val,
                              });
                            }
                          }}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none focus:border-emerald-500"
                        >
                          <option value="__none__">Tidak ditampilkan (Sembunyikan Teks)</option>
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

                      {coverTitleShown && (
                        <>
                          <div>
                            <label className="block text-[11px] font-medium text-slate-600 mb-1">
                              Isi Teks di Tengah Banner
                            </label>
                            <input
                              type="text"
                              value={c.heroCoverTitle ?? ''}
                              onChange={(e) => updateContent({ heroCoverTitle: e.target.value })}
                              placeholder="Contoh: Warung Barokah"
                              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-emerald-500"
                            />
                          </div>
                          <div className="grid grid-cols-3 gap-2 items-end">
                            <div className="col-span-2">
                              <SliderRow
                                label="Ukuran Teks Banner"
                                value={`${c.heroCoverTitleSize ?? 26}px`}
                                min={12}
                                max={48}
                                current={c.heroCoverTitleSize ?? 26}
                                onChange={(val) => updateContent({ heroCoverTitleSize: val })}
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-slate-500 mb-1">
                                Warna Teks
                              </label>
                              <input
                                type="color"
                                value={c.heroCoverTitleColor ?? '#FFFFFF'}
                                onChange={(e) => updateContent({ heroCoverTitleColor: e.target.value })}
                                className="w-full h-7 rounded border border-slate-200 p-0.5 cursor-pointer bg-white"
                              />
                            </div>
                          </div>
                        </>
                      )}
                    </div>

                    <SliderRow
                      label="Tinggi Banner Cover"
                      value={`${c.heroCoverHeight ?? 170}px`}
                      min={100}
                      max={340}
                      current={c.heroCoverHeight ?? 170}
                      onChange={(val) => updateContent({ heroCoverHeight: val })}
                    />
                    <SliderRow
                      label="Jarak Overlap Kartu"
                      value={`${c.heroOverlapPx ?? 34}px`}
                      min={0}
                      max={80}
                      current={c.heroOverlapPx ?? 34}
                      onChange={(val) => updateContent({ heroOverlapPx: val })}
                    />
                  </div>
                )}

                <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <div className="text-xs font-bold text-slate-800">Logo / Foto Profil Bulat</div>
                    <span className="px-2 py-0.5 rounded-md bg-slate-100 text-[10px] font-semibold text-slate-600">
                      {c.heroLogoImage ? getImgSourceLabel(c.heroLogoImage) : 'Pakai Inisial'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div
                      style={{
                        backgroundColor: c.heroLogoImage ? '#FFFFFF' : (c.heroLogoBg ?? '#FFEDD5'),
                        color: c.heroLogoColor ?? '#C2410C',
                      }}
                      className="w-10 h-10 rounded-full border border-slate-200 overflow-hidden flex items-center justify-center font-extrabold text-xs shrink-0"
                    >
                      {c.heroLogoImage ? (
                        <img
                          src={c.heroLogoImage}
                          alt="Logo"
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <span>{(c.heroLogoMonogram || c.heroTitle || 'WB').slice(0, 2).toUpperCase()}</span>
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex gap-1.5">
                      <input
                        type="text"
                        value={isEmbeddedImg(c.heroLogoImage) ? '' : (c.heroLogoImage ?? '')}
                        onChange={(e) => updateContent({ heroLogoImage: e.target.value })}
                        placeholder={
                          isEmbeddedImg(c.heroLogoImage)
                            ? 'Tempel link https://... untuk ganti'
                            : 'https://... (kosongkan pakai inisial)'
                        }
                        className="flex-1 min-w-0 px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 outline-none focus:border-emerald-500"
                      />
                      <label className="px-2.5 py-1.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-semibold cursor-pointer inline-flex items-center gap-1 shrink-0 hover:bg-emerald-100">
                        <Upload className="w-3.5 h-3.5" />
                        <span>{heroUploadingField === 'heroLogoImage' ? '...' : 'Upload'}</span>
                        <input
                          type="file"
                          accept="image/*"
                          className="hidden"
                          disabled={heroUploadingField === 'heroLogoImage'}
                          onChange={(e) => handleHeroUpload('heroLogoImage', e)}
                        />
                      </label>
                      {c.heroLogoImage && (
                        <button
                          type="button"
                          onClick={() => updateContent({ heroLogoImage: '' })}
                          className="px-2 py-1.5 rounded-lg bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-600 text-xs cursor-pointer shrink-0"
                          title="Hapus logo gambar"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        Inisial
                      </label>
                      <input
                        type="text"
                        maxLength={2}
                        value={c.heroLogoMonogram ?? 'WB'}
                        onChange={(e) => updateContent({ heroLogoMonogram: e.target.value })}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-200 uppercase"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        Latar Logo
                      </label>
                      <input
                        type="color"
                        value={c.heroLogoBg ?? '#FFEDD5'}
                        onChange={(e) => updateContent({ heroLogoBg: e.target.value })}
                        className="w-full h-7 rounded border border-slate-200 p-0.5 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        Teks Inisial
                      </label>
                      <input
                        type="color"
                        value={c.heroLogoColor ?? '#C2410C'}
                        onChange={(e) => updateContent({ heroLogoColor: e.target.value })}
                        className="w-full h-7 rounded border border-slate-200 p-0.5 cursor-pointer"
                      />
                    </div>
                  </div>
                  <SliderRow
                    label="Ukuran Lingkaran Logo"
                    value={`${c.heroLogoSize ?? 72}px`}
                    min={40}
                    max={140}
                    current={c.heroLogoSize ?? 72}
                    onChange={(val) => updateContent({ heroLogoSize: val })}
                  />
                </div>

                <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Informasi Usaha</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-600">Tampilkan Badge Status</span>
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
                        className="col-span-2 px-2 py-1 text-xs rounded border border-slate-200"
                        placeholder="Buka sekarang"
                      />
                      <input
                        type="color"
                        value={c.heroStatusColor ?? '#16A34A'}
                        onChange={(e) => updateContent({ heroStatusColor: e.target.value })}
                        className="w-full h-7 rounded border border-slate-200 p-0.5 cursor-pointer"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Nama Usaha / Judul
                    </label>
                    <input
                      type="text"
                      value={c.heroTitle ?? ''}
                      onChange={(e) => updateContent({ heroTitle: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Tagline / Deskripsi
                    </label>
                    <textarea
                      rows={2}
                      value={c.heroSubtitle ?? ''}
                      onChange={(e) => updateContent({ heroSubtitle: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Rating (opsional)
                      </label>
                      <input
                        type="text"
                        value={c.heroRating ?? ''}
                        placeholder="4.9"
                        onChange={(e) => updateContent({ heroRating: e.target.value })}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-200"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Jam Buka
                      </label>
                      <input
                        type="text"
                        value={c.heroHours ?? ''}
                        placeholder="09.00-21.00 WIB"
                        onChange={(e) => updateContent({ heroHours: e.target.value })}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-200"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[11px] font-medium text-slate-600 mb-1">
                      Lokasi / Alamat
                    </label>
                    <input
                      type="text"
                      value={c.heroLocation ?? ''}
                      onChange={(e) => updateContent({ heroLocation: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200"
                    />
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800">Ukuran Teks &amp; Kartu</div>
                  <SliderRow
                    label="Ukuran Judul"
                    value={`${c.heroTitleSize ?? 20}px`}
                    min={14}
                    max={38}
                    current={c.heroTitleSize ?? 20}
                    onChange={(val) => updateContent({ heroTitleSize: val })}
                  />
                  <SliderRow
                    label="Ukuran Tagline"
                    value={`${c.heroSubtitleSize ?? 13}px`}
                    min={11}
                    max={22}
                    current={c.heroSubtitleSize ?? 13}
                    onChange={(val) => updateContent({ heroSubtitleSize: val })}
                  />
                  <SliderRow
                    label="Ukuran Info Jam & Alamat"
                    value={`${c.heroInfoSize ?? 12}px`}
                    min={10}
                    max={18}
                    current={c.heroInfoSize ?? 12}
                    onChange={(val) => updateContent({ heroInfoSize: val })}
                  />
                  <SliderRow
                    label="Lengkung Sudut Kartu Info"
                    value={`${c.heroCardRadius ?? 20}px`}
                    min={0}
                    max={36}
                    current={c.heroCardRadius ?? 20}
                    onChange={(val) => updateContent({ heroCardRadius: val })}
                  />
                </div>
              </div>
            );
          })()}

          {selectedBlock.type === 'category_tabs' && (() => {
            const buttons = c.categoryButtons ?? [];
            const updateBtn = (id: string, patch: Partial<CategoryJumpItem>) => {
              updateContent({
                categoryButtons: buttons.map((b) => (b.id === id ? { ...b, ...patch } : b)),
              });
            };
            const moveBtn = (idx: number, dir: -1 | 1) => {
              const target = idx + dir;
              if (target < 0 || target >= buttons.length) return;
              const copy = [...buttons];
              const [moved] = copy.splice(idx, 1);
              copy.splice(target, 0, moved);
              updateContent({ categoryButtons: copy });
            };

            return (
              <div className="space-y-3.5">
                <div className="p-2.5 rounded-xl bg-white border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">Daftar Tombol Kategori</span>
                    <button
                      type="button"
                      onClick={() =>
                        updateContent({
                          categoryButtons: [
                            ...buttons,
                            {
                              id: createId('catbtn'),
                              label: `Kategori ${buttons.length + 1}`,
                              targetTitle: `Kategori ${buttons.length + 1}`,
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold cursor-pointer hover:bg-emerald-700"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah</span>
                    </button>
                  </div>

                  <p className="text-[11px] text-slate-500 leading-snug">
                    Saat tombol diklik, halaman otomatis menggulir ke judul / kategori yang sama di halaman.
                  </p>

                  <div className="space-y-2 max-h-64 overflow-y-auto pr-0.5">
                    {buttons.map((btn, idx) => (
                      <div
                        key={btn.id}
                        className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={btn.label}
                            onChange={(e) =>
                              updateBtn(btn.id, {
                                label: e.target.value,
                                targetTitle: e.target.value,
                              })
                            }
                            placeholder="Nama tombol (misal: Favorit)"
                            className="flex-1 min-w-0 px-2 py-1 text-xs font-semibold rounded border border-slate-200 bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => moveBtn(idx, -1)}
                            disabled={idx === 0}
                            className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                            title="Geser atas"
                          >
                            <ArrowUp className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => moveBtn(idx, 1)}
                            disabled={idx === buttons.length - 1}
                            className="p-1 text-slate-500 hover:text-slate-800 disabled:opacity-30 cursor-pointer"
                            title="Geser bawah"
                          >
                            <ArrowDown className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              updateContent({
                                categoryButtons: buttons.filter((b) => b.id !== btn.id),
                              })
                            }
                            className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                            title="Hapus"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={btn.targetTitle ?? btn.label}
                          onChange={(e) => updateBtn(btn.id, { targetTitle: e.target.value })}
                          placeholder="Judul tujuan (default sama dengan nama tombol)"
                          className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white text-slate-600"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800">Mode Slide &amp; Ukuran Tombol</div>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        { id: 'horizontal', label: 'Slide Horizontal' },
                        { id: 'vertical', label: 'Slide Vertikal' },
                        { id: 'wrap', label: 'Baris Penuh' },
                      ] as { id: CategoryScrollMode; label: string }[]
                    ).map((m) => (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => updateContent({ categoryScrollMode: m.id })}
                        className={`py-1.5 px-1.5 rounded-lg border text-[10.5px] font-semibold cursor-pointer transition-colors ${
                          (c.categoryScrollMode ?? 'vertical') === m.id
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {m.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10.5px] text-slate-500 leading-snug">
                    {(c.categoryScrollMode ?? 'vertical') === 'horizontal'
                      ? 'Tombol berderet 1 baris dan bisa digeser (slide) ke kiri & kanan.'
                      : (c.categoryScrollMode ?? 'vertical') === 'vertical'
                      ? 'Tombol tersusun turun dalam kotak yang bisa di-scroll atas & bawah.'
                      : 'Semua tombol langsung tampil penuh tanpa kotak scroll.'}
                  </p>

                  {(c.categoryScrollMode ?? 'vertical') === 'vertical' && (
                    <SliderRow
                      label="Tinggi Area Slide Vertikal"
                      value={`${c.categoryMaxHeight ?? 112}px`}
                      min={48}
                      max={320}
                      current={c.categoryMaxHeight ?? 112}
                      onChange={(val) => updateContent({ categoryMaxHeight: val })}
                    />
                  )}

                  <SliderRow
                    label="Ukuran Font Tombol"
                    value={`${c.categoryFontSize ?? 13}px`}
                    min={10}
                    max={20}
                    current={c.categoryFontSize ?? 13}
                    onChange={(val) => updateContent({ categoryFontSize: val })}
                  />
                  <SliderRow
                    label="Lebar Tombol (Padding X)"
                    value={`${c.categoryButtonPaddingX ?? 16}px`}
                    min={8}
                    max={32}
                    current={c.categoryButtonPaddingX ?? 16}
                    onChange={(val) => updateContent({ categoryButtonPaddingX: val })}
                  />
                  <SliderRow
                    label="Tinggi Tombol (Padding Y)"
                    value={`${c.categoryButtonPaddingY ?? 8}px`}
                    min={4}
                    max={18}
                    current={c.categoryButtonPaddingY ?? 8}
                    onChange={(val) => updateContent({ categoryButtonPaddingY: val })}
                  />
                  <SliderRow
                    label="Lengkung Sudut"
                    value={`${c.categoryRadius ?? 9999}px`}
                    min={0}
                    max={32}
                    current={Math.min(32, c.categoryRadius ?? 24)}
                    onChange={(val) =>
                      updateContent({ categoryRadius: val >= 28 ? 9999 : val })
                    }
                  />
                  <SliderRow
                    label="Jarak Antar Tombol"
                    value={`${c.categoryGap ?? 8}px`}
                    min={4}
                    max={20}
                    current={c.categoryGap ?? 8}
                    onChange={(val) => updateContent({ categoryGap: val })}
                  />

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        Tombol Aktif
                      </label>
                      <input
                        type="color"
                        value={c.categoryActiveBg ?? '#EA580C'}
                        onChange={(e) => updateContent({ categoryActiveBg: e.target.value })}
                        className="w-full h-7 rounded border border-slate-200 p-0.5 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        Teks Aktif
                      </label>
                      <input
                        type="color"
                        value={c.categoryActiveText ?? '#FFFFFF'}
                        onChange={(e) => updateContent({ categoryActiveText: e.target.value })}
                        className="w-full h-7 rounded border border-slate-200 p-0.5 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        Tombol Normal
                      </label>
                      <input
                        type="color"
                        value={c.categoryInactiveBg ?? '#F1F5F9'}
                        onChange={(e) => updateContent({ categoryInactiveBg: e.target.value })}
                        className="w-full h-7 rounded border border-slate-200 p-0.5 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        Teks Normal
                      </label>
                      <input
                        type="color"
                        value={c.categoryInactiveText ?? '#334155'}
                        onChange={(e) => updateContent({ categoryInactiveText: e.target.value })}
                        className="w-full h-7 rounded border border-slate-200 p-0.5 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {selectedBlock.type === 'fnb_catalog' && (() => {
            const items = c.fnbItems ?? [];
            const updateFnbItem = (id: string, patch: Partial<FnbMenuItem>) => {
              updateContent({
                fnbItems: items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
              });
            };
            const handleFnbPhotoUpload = async (itemId: string, file?: File) => {
              if (!file) return;
              const targetBlockId = selectedBlock.id;
              setUploadError(null);
              try {
                const url = await uploadCompressedImageOrFallback(file, {
                  maxDimension: 640,
                  quality: 0.84,
                });
                onUpdateBlock(targetBlockId, (blk) => ({
                  ...blk,
                  content: {
                    ...blk.content,
                    fnbItems: (blk.content.fnbItems ?? []).map((it) =>
                      it.id === itemId ? { ...it, image: url } : it
                    ),
                  },
                }));
              } catch (err) {
                setUploadError(err instanceof Error ? err.message : 'Gagal memproses foto menu.');
              }
            };

            return (
              <div className="space-y-3.5">
                {/* Kotak Item Dipilih Mengambang */}
                <div className="p-2.5 rounded-xl bg-[#EFF7F4]/80 border border-emerald-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-800">
                      Kotak Item Dipilih (Mengambang)
                    </span>
                    <ToggleSwitch
                      checked={c.fnbFloatingCartEnabled !== false}
                      onChange={(val) => updateContent({ fnbFloatingCartEnabled: val })}
                      label="Aktifkan kotak item mengambang"
                    />
                  </div>
                  {c.fnbFloatingCartEnabled !== false && (
                    <>
                      <div>
                        <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                          Posisi Kotak Mengambang
                        </label>
                        <select
                          value={c.fnbFloatingCartPosition ?? 'bottom-floating'}
                          onChange={(e) =>
                            updateContent({
                              fnbFloatingCartPosition: e.target.value as FloatingCartPosition,
                            })
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none"
                        >
                          <option value="bottom-floating">Melayang Bawah Penuh (Default)</option>
                          <option value="bottom-docked">Menempel Tepi Bawah</option>
                          <option value="top-floating">Melayang Atas</option>
                          <option value="bottom-left">Melayang Kiri Bawah</option>
                          <option value="bottom-right">Melayang Kanan Bawah</option>
                        </select>
                      </div>
                      <SliderRow
                        label="Jarak Tepi (Offset)"
                        value={`${c.fnbFloatingCartOffsetY ?? 16}px`}
                        min={0}
                        max={100}
                        current={c.fnbFloatingCartOffsetY ?? 16}
                        onChange={(val) => updateContent({ fnbFloatingCartOffsetY: val })}
                      />
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 mb-1">
                            Teks Tombol Lanjut
                          </label>
                          <input
                            type="text"
                            value={c.fnbFloatingCartLabel ?? 'Lanjut'}
                            onChange={(e) =>
                              updateContent({ fnbFloatingCartLabel: e.target.value })
                            }
                            className="w-full px-2 py-1 text-xs rounded border border-slate-200 bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 mb-1">
                            Warna Kotak
                          </label>
                          <input
                            type="color"
                            value={c.fnbFloatingCartBg ?? c.fnbAccentColor ?? '#EA580C'}
                            onChange={(e) => updateContent({ fnbFloatingCartBg: e.target.value })}
                            className="w-full h-7 rounded border border-slate-200 p-0.5 cursor-pointer bg-white"
                          />
                        </div>
                      </div>
                    </>
                  )}
                </div>

                {/* Pengaturan Tampilan & Pencarian Katalog F&B */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="text-xs font-bold text-slate-800">Tampilan &amp; Checkout WA</div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        Nama Toko
                      </label>
                      <input
                        type="text"
                        value={c.catalogStoreName ?? 'Warung Barokah'}
                        onChange={(e) => updateContent({ catalogStoreName: e.target.value })}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-200 bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        No. WhatsApp
                      </label>
                      <input
                        type="text"
                        value={c.catalogWhatsappNumber ?? '6281234567890'}
                        onChange={(e) => updateContent({ catalogWhatsappNumber: e.target.value })}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-200 bg-white"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-700">Kolom Pencarian</span>
                    <ToggleSwitch
                      checked={c.fnbShowSearch !== false}
                      onChange={(val) => updateContent({ fnbShowSearch: val })}
                      label="Tampilkan Kolom Pencarian"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-700">
                      Tab Kategori Bawaan
                    </span>
                    <ToggleSwitch
                      checked={Boolean(c.fnbShowCategories)}
                      onChange={(val) => updateContent({ fnbShowCategories: val })}
                      label="Tampilkan Tab Kategori"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-700">
                      Kelompokkan per Kategori
                    </span>
                    <ToggleSwitch
                      checked={c.fnbGroupByCategory !== false}
                      onChange={(val) => updateContent({ fnbGroupByCategory: val })}
                      label="Kelompokkan per Kategori"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-medium text-slate-700">Warna Aksen Harga</span>
                    <input
                      type="color"
                      value={c.fnbAccentColor ?? '#EA580C'}
                      onChange={(e) => updateContent({ fnbAccentColor: e.target.value })}
                      className="w-8 h-7 rounded border border-slate-200 p-0.5 cursor-pointer bg-white"
                    />
                  </div>
                  <SliderRow
                    label="Ukuran Foto Menu"
                    value={`${c.fnbItemImageSize ?? 80}px`}
                    min={52}
                    max={120}
                    current={c.fnbItemImageSize ?? 80}
                    onChange={(val) => updateContent({ fnbItemImageSize: val })}
                  />
                  <SliderRow
                    label="Ukuran Judul Menu"
                    value={`${c.fnbItemTitleSize ?? 15}px`}
                    min={12}
                    max={24}
                    current={c.fnbItemTitleSize ?? 15}
                    onChange={(val) => updateContent({ fnbItemTitleSize: val })}
                  />
                  <SliderRow
                    label="Ukuran Deskripsi"
                    value={`${c.fnbItemDescSize ?? 12}px`}
                    min={10}
                    max={18}
                    current={c.fnbItemDescSize ?? 12}
                    onChange={(val) => updateContent({ fnbItemDescSize: val })}
                  />
                </div>

                {/* Daftar Menu F&B */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800">
                      Daftar Menu ({items.length})
                    </span>
                    <button
                      type="button"
                      onClick={() =>
                        updateContent({
                          fnbItems: [
                            ...items,
                            {
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
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-600 text-white text-[11px] font-semibold cursor-pointer hover:bg-emerald-700"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Menu</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {items.map((item) => {
                      const isExpanded = Boolean(expandedCatalogItems[item.id]);
                      return (
                        <div
                          key={item.id}
                          className="rounded-xl border border-slate-200 bg-white overflow-hidden"
                        >
                          <div
                            onClick={() =>
                              setExpandedCatalogItems((prev) => ({
                                ...prev,
                                [item.id]: !isExpanded,
                              }))
                            }
                            className="p-2.5 flex items-center justify-between gap-2 cursor-pointer hover:bg-slate-50"
                          >
                            <div className="min-w-0">
                              <div className="text-xs font-bold text-slate-800 truncate">
                                {item.title || 'Menu'}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate tabular-nums">
                                {item.category || 'Menu'} · {item.price || 'Rp 0'}
                              </div>
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  updateContent({
                                    fnbItems: items.filter((it) => it.id !== item.id),
                                  });
                                }}
                                className="p-1 text-slate-400 hover:text-red-600 cursor-pointer"
                                title="Hapus menu"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                              <ChevronDown
                                className={`w-4 h-4 text-slate-400 transition-transform ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="p-2.5 pt-0 space-y-2 border-t border-slate-100">
                              <div className="pt-2">
                                <label className="block text-[10.5px] font-medium text-slate-600 mb-1">
                                  Foto Menu (Link URL atau Upload)
                                </label>
                                <div className="flex gap-1.5">
                                  <input
                                    type="url"
                                    value={item.image ?? ''}
                                    onChange={(e) =>
                                      updateFnbItem(item.id, { image: e.target.value })
                                    }
                                    placeholder="https://... (kosongkan pakai inisial)"
                                    className="flex-1 min-w-0 px-2 py-1 text-xs rounded border border-slate-200"
                                  />
                                  <label className="px-2 py-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-semibold cursor-pointer inline-flex items-center gap-1 shrink-0">
                                    <Upload className="w-3 h-3" />
                                    <span>Upload</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      className="hidden"
                                      onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        e.target.value = '';
                                        handleFnbPhotoUpload(item.id, file);
                                      }}
                                    />
                                  </label>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10.5px] font-medium text-slate-600 mb-1">
                                    Nama Menu
                                  </label>
                                  <input
                                    type="text"
                                    value={item.title}
                                    onChange={(e) =>
                                      updateFnbItem(item.id, { title: e.target.value })
                                    }
                                    className="w-full px-2 py-1 text-xs rounded border border-slate-200"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10.5px] font-medium text-slate-600 mb-1">
                                    Harga
                                  </label>
                                  <input
                                    type="text"
                                    value={item.price}
                                    onChange={(e) =>
                                      updateFnbItem(item.id, { price: e.target.value })
                                    }
                                    placeholder="Rp 25.000"
                                    className="w-full px-2 py-1 text-xs rounded border border-slate-200 tabular-nums"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-2">
                                <div>
                                  <label className="block text-[10.5px] font-medium text-slate-600 mb-1">
                                    Kategori (untuk Judul)
                                  </label>
                                  <input
                                    type="text"
                                    value={item.category}
                                    onChange={(e) =>
                                      updateFnbItem(item.id, { category: e.target.value })
                                    }
                                    placeholder="Favorit / Makanan / Minuman"
                                    className="w-full px-2 py-1 text-xs rounded border border-slate-200"
                                  />
                                </div>
                                <div>
                                  <label className="block text-[10.5px] font-medium text-slate-600 mb-1">
                                    Label Badge (opsional)
                                  </label>
                                  <input
                                    type="text"
                                    value={item.badge ?? ''}
                                    onChange={(e) =>
                                      updateFnbItem(item.id, { badge: e.target.value })
                                    }
                                    placeholder="Best seller"
                                    className="w-full px-2 py-1 text-xs rounded border border-slate-200"
                                  />
                                </div>
                              </div>

                              <div>
                                <label className="block text-[10.5px] font-medium text-slate-600 mb-1">
                                  Deskripsi Singkat
                                </label>
                                <textarea
                                  rows={2}
                                  value={item.description}
                                  onChange={(e) =>
                                    updateFnbItem(item.id, { description: e.target.value })
                                  }
                                  className="w-full px-2 py-1 text-xs rounded border border-slate-200"
                                />
                              </div>

                              {!item.image && (
                                <div className="grid grid-cols-3 gap-1.5 pt-1">
                                  <input
                                    type="text"
                                    maxLength={2}
                                    value={item.monogram ?? ''}
                                    placeholder="Inisial"
                                    onChange={(e) =>
                                      updateFnbItem(item.id, { monogram: e.target.value })
                                    }
                                    className="px-2 py-1 text-xs rounded border border-slate-200 uppercase"
                                  />
                                  <input
                                    type="color"
                                    title="Warna latar inisial"
                                    value={item.monogramBg ?? '#FFEDD5'}
                                    onChange={(e) =>
                                      updateFnbItem(item.id, { monogramBg: e.target.value })
                                    }
                                    className="w-full h-7 rounded border border-slate-200 p-0.5 cursor-pointer"
                                  />
                                  <input
                                    type="color"
                                    title="Warna huruf inisial"
                                    value={item.monogramColor ?? '#C2410C'}
                                    onChange={(e) =>
                                      updateFnbItem(item.id, { monogramColor: e.target.value })
                                    }
                                    className="w-full h-7 rounded border border-slate-200 p-0.5 cursor-pointer"
                                  />
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {selectedBlock.type === 'toggle_container' && (
            <div className="space-y-3">
              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Teks Tombol saat Sembunyi (Tutup)
                  </label>
                  <input
                    type="text"
                    value={c.toggleShowLabel ?? 'Tampilkan Konten'}
                    placeholder="Tampilkan Konten"
                    onChange={(e) => updateContent({ toggleShowLabel: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Teks Tombol saat Tampil (Buka)
                  </label>
                  <input
                    type="text"
                    value={c.toggleHideLabel ?? 'Sembunyikan Konten'}
                    placeholder="Sembunyikan Konten"
                    onChange={(e) => updateContent({ toggleHideLabel: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:border-blue-500 outline-none"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kondisi Awal (Saat Halaman Dibuka)
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      type="button"
                      onClick={() => updateContent({ toggleDefaultOpen: false })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                        !c.toggleDefaultOpen
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Hide (Default)
                    </button>
                    <button
                      type="button"
                      onClick={() => updateContent({ toggleDefaultOpen: true })}
                      className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                        c.toggleDefaultOpen
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      Show (Terbuka)
                    </button>
                  </div>
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Gaya Tombol
                  </label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {(['solid', 'outline'] as const).map((variant) => {
                      const active = (c.toggleButtonStyle ?? 'solid') === variant;
                      return (
                        <button
                          key={variant}
                          type="button"
                          onClick={() => updateContent({ toggleButtonStyle: variant })}
                          className={`py-1 rounded-lg text-[11px] font-semibold border capitalize transition-colors cursor-pointer ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {variant === 'solid' ? 'Penuh (Solid)' : 'Garis (Outline)'}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">
                      Warna Tombol
                    </label>
                    <input
                      type="color"
                      value={c.toggleButtonBg ?? '#2563EB'}
                      onChange={(e) => updateContent({ toggleButtonBg: e.target.value })}
                      className="w-full h-8 rounded border border-slate-200 bg-white p-0.5 cursor-pointer"
                    />
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-1">
                      Warna Teks
                    </label>
                    <input
                      type="color"
                      value={c.toggleButtonText ?? '#FFFFFF'}
                      onChange={(e) => updateContent({ toggleButtonText: e.target.value })}
                      className="w-full h-8 rounded border border-slate-200 bg-white p-0.5 cursor-pointer"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1.5">
                    Ikon Sebelah Kiri Tombol
                  </label>
                  <IconPicker
                    selectedIcon={resolveButtonIcon(
                      c.toggleButtonIcon,
                      c.toggleShowLabel ?? 'Tampilkan Konten'
                    )}
                    iconUrl={c.toggleButtonIconUrl ?? ''}
                    allowNone
                    accentVariant="blue"
                    onSelectIcon={(icon) => updateContent({ toggleButtonIcon: icon })}
                    onChangeIconUrl={(toggleButtonIconUrl) =>
                      updateContent({ toggleButtonIconUrl })
                    }
                  />
                </div>
              </div>

              <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                <div className="text-xs font-medium text-slate-700">Tambah ke Dalam Wadah:</div>
                <div className="grid grid-cols-2 gap-1.5">
                  {(['text', 'image', 'button', 'form', 'youtube', 'divider'] as BlockType[]).map(
                    (childType) => (
                      <button
                        key={childType}
                        type="button"
                        onClick={() => onAddChildToContainer(selectedBlock.id, childType)}
                        className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-md bg-white border border-slate-200 hover:border-blue-400 text-xs font-medium text-slate-700 cursor-pointer"
                      >
                        <Plus className="w-3 h-3 text-blue-600" />
                        <span>{BLOCK_TYPE_NAMES[childType]}</span>
                      </button>
                    )
                  )}
                </div>
              </div>
            </div>
          )}

          {selectedBlock.type === 'bottom_sheet' && (() => {
            const triggerStyle = c.sheetTriggerStyle ?? 'icon';
            const triggerLabel = c.sheetTriggerLabel ?? 'Lokasi Maps';
            const activeIcon = resolveButtonIcon(c.sheetTriggerIcon ?? 'map-pin', triggerLabel);
            const children = selectedBlock.children ?? [];

            const applySheetTemplate = (
              templateId: 'maps' | 'contact' | 'promo' | 'form'
            ) => {
              let nextTitle = 'Lokasi & Ulasan';
              let nextChildren: BuilderBlock[] = [];
              if (templateId === 'maps') {
                nextTitle = 'Lokasi & Ulasan';
                const mapBlk = createBlock('maps_place', theme);
                nextChildren = [{ ...mapBlk, style: { ...mapBlk.style, marginBottom: 0 } }];
              } else if (templateId === 'contact') {
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
                  {
                    ...soc,
                    style: { ...soc.style, marginBottom: 0 },
                  },
                ];
              } else if (templateId === 'promo') {
                nextTitle = 'Info & Promo Spesial';
                const img = createBlock('image', theme);
                const txt = createBlock('text', theme);
                const btn = createBlock('button', theme);
                nextChildren = [
                  {
                    ...img,
                    style: { ...img.style, marginBottom: 10 },
                  },
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
                content: {
                  ...blk.content,
                  sheetTitle: nextTitle,
                },
                children: nextChildren,
              }));
            };

            return (
              <div className="space-y-3.5">
                {/* Kotak 1: Pemicu (Icon / Tombol) */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <h4 className="text-[13px] font-bold text-slate-900">Pemicu Bottom Sheet</h4>
                    <span className="text-[11px] text-slate-400">Tampilan Klik</span>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-1.5">Gaya Pemicu</div>
                    <div className="grid grid-cols-3 gap-1.5">
                      {(
                        [
                          { id: 'icon', label: 'Ikon Bulat' },
                          { id: 'pill', label: 'Kapsul' },
                          { id: 'button', label: 'Tombol' },
                        ] as { id: BottomSheetTriggerStyle; label: string }[]
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => updateContent({ sheetTriggerStyle: opt.id })}
                          className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                            triggerStyle === opt.id
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-1.5">Pilih Ikon</div>
                    <IconPicker
                      selectedIcon={activeIcon}
                      iconUrl={c.sheetTriggerIconUrl ?? ''}
                      allowNone
                      accentVariant="blue"
                      onSelectIcon={(icon) => updateContent({ sheetTriggerIcon: icon })}
                      onChangeIconUrl={(sheetTriggerIconUrl) =>
                        updateContent({ sheetTriggerIconUrl })
                      }
                    />
                  </div>

                  {triggerStyle === 'icon' && (
                    <div>
                      <div className="flex items-center justify-between text-xs font-medium text-slate-700 mb-1">
                        <span>Ukuran Ikon</span>
                        <span className="text-[11px] text-slate-400 tabular-nums">
                          {c.sheetIconSize ?? 52}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={36}
                        max={72}
                        step={2}
                        value={c.sheetIconSize ?? 52}
                        onChange={(e) => updateContent({ sheetIconSize: Number(e.target.value) })}
                        className="w-full accent-blue-600 cursor-pointer"
                      />
                    </div>
                  )}

                  <div className="space-y-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Label Teks
                      </label>
                      <input
                        type="text"
                        value={triggerLabel}
                        placeholder="Lokasi Maps"
                        onChange={(e) => updateContent({ sheetTriggerLabel: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:border-blue-500 outline-none"
                      />
                    </div>
                    {triggerStyle !== 'button' && (
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Keterangan <span className="text-[11px] font-normal text-slate-400">(opsional)</span>
                        </label>
                        <input
                          type="text"
                          value={c.sheetTriggerSublabel ?? ''}
                          placeholder="Lihat lokasi & ulasan"
                          onChange={(e) =>
                            updateContent({ sheetTriggerSublabel: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:border-blue-500 outline-none"
                        />
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Warna Latar
                      </label>
                      <input
                        type="color"
                        value={c.sheetTriggerBg || theme.accentColor}
                        onChange={(e) => updateContent({ sheetTriggerBg: e.target.value })}
                        className="w-full h-8 rounded-lg border border-slate-200 bg-white p-0.5 cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-500 mb-1">
                        Warna Ikon / Teks
                      </label>
                      <input
                        type="color"
                        value={c.sheetTriggerText ?? '#FFFFFF'}
                        onChange={(e) => updateContent({ sheetTriggerText: e.target.value })}
                        className="w-full h-8 rounded-lg border border-slate-200 bg-white p-0.5 cursor-pointer"
                      />
                    </div>
                  </div>
                </div>

                {/* Kotak 2: Isi Bottom Sheet */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <h4 className="text-[13px] font-bold text-slate-900">Isi Bottom Sheet</h4>
                    <span className="text-[11px] text-slate-400 tabular-nums">
                      {children.length} elemen
                    </span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Judul Bottom Sheet
                    </label>
                    <input
                      type="text"
                      value={c.sheetTitle ?? 'Lokasi & Ulasan'}
                      placeholder="Lokasi & Ulasan"
                      onChange={(e) => updateContent({ sheetTitle: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:border-blue-500 outline-none"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-1.5">
                      Isi Cepat Template
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
                          className="py-1.5 px-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-400 hover:bg-blue-50/40 text-[11px] font-medium text-slate-700 cursor-pointer text-left truncate transition-colors"
                        >
                          {tpl.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-1.5">
                      Elemen di Dalam Sheet
                    </div>
                    {children.length > 0 ? (
                      <div className="space-y-1.5">
                        {children.map((child, idx) => (
                          <div
                            key={child.id}
                            className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50"
                          >
                            <button
                              type="button"
                              onClick={() => onSelectBlock?.(child.id)}
                              className="min-w-0 flex-1 text-left cursor-pointer hover:text-blue-600"
                            >
                              <div className="text-xs font-semibold text-slate-800 truncate">
                                {idx + 1}. {child.label.trim() || BLOCK_TYPE_NAMES[child.type]}
                              </div>
                              <div className="text-[11px] text-slate-400 truncate">
                                {BLOCK_TYPE_NAMES[child.type]} · Klik untuk edit
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                onUpdateBlock(selectedBlock.id, (blk) => ({
                                  ...blk,
                                  children: (blk.children ?? []).filter(
                                    (ch) => ch.id !== child.id
                                  ),
                                }))
                              }
                              title="Hapus elemen ini dari sheet"
                              className="p-1 rounded hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="py-3 px-2.5 rounded-lg border border-dashed border-slate-200 text-center text-[11px] text-slate-400">
                        Belum ada elemen di dalam sheet
                      </div>
                    )}
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-slate-700 mb-1.5">
                      Tambah Elemen ke Sheet
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {(
                        [
                          'maps_place',
                          'text',
                          'image',
                          'button',
                          'form',
                          'catalog',
                          'carousel',
                          'social',
                        ] as BlockType[]
                      ).map((childType) => (
                        <button
                          key={childType}
                          type="button"
                          onClick={() => onAddChildToContainer(selectedBlock.id, childType)}
                          className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-slate-50 border border-slate-200 hover:border-blue-400 text-[11px] font-medium text-slate-700 cursor-pointer"
                        >
                          <Plus className="w-3 h-3 text-blue-600 shrink-0" />
                          <span className="truncate">{BLOCK_TYPE_NAMES[childType]}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })()}

          {selectedBlock.type === 'catalog' && (() => {
            const cartEnabled = c.catalogCartEnabled ?? true;
            const detailEnabled = c.catalogDetailEnabled ?? true;
            const rawProductType = c.catalogProductType ?? 'physical';
            const normalizedProductType: 'physical' | 'digital' = isDigitalProductType(rawProductType)
              ? 'digital'
              : 'physical';
            const hasPhysicalItem =
              isPhysicalProductType(rawProductType) ||
              (c.catalogItems ?? []).some((it) => it.productType === 'physical');
            const items = c.catalogItems ?? [];
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
              <div className="space-y-3.5">
                {/* Kotak 1: Fitur Halaman */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-3">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <h4 className="text-[13px] font-bold text-slate-900 flex items-center gap-1.5">
                      <ShoppingCart className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Fitur Katalog</span>
                    </h4>
                    <span className="text-[11px] text-slate-400">
                      {normalizedProductType === 'digital' ? 'Produk Digital' : 'Produk Fisik'}
                    </span>
                  </div>

                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-700">Halaman Detail</span>
                      <ToggleSwitch
                        checked={detailEnabled}
                        onChange={(checked) => updateContent({ catalogDetailEnabled: checked })}
                        label="Halaman Detail"
                      />
                    </div>

                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-medium text-slate-700">
                        Keranjang WhatsApp
                      </span>
                      <ToggleSwitch
                        checked={cartEnabled}
                        onChange={(checked) => updateContent({ catalogCartEnabled: checked })}
                        label="Keranjang WhatsApp"
                      />
                    </div>
                  </div>

                  {cartEnabled && (
                    <div className="pt-2.5 border-t border-slate-100 space-y-3">
                      <div className="space-y-1.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Jenis Katalog Produk
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          {(
                            [
                              { id: 'physical', label: 'Produk Fisik' },
                              { id: 'digital', label: 'Produk Digital' },
                            ] as { id: 'physical' | 'digital'; label: string }[]
                          ).map((pt) => {
                            const active = normalizedProductType === pt.id;
                            return (
                              <button
                                key={pt.id}
                                type="button"
                                onClick={() => switchCatalogKind(pt.id)}
                                className={`py-1.5 px-2.5 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                                  active
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {pt.label}
                              </button>
                            );
                          })}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-snug">
                          {normalizedProductType === 'digital'
                            ? 'Produk → Data Pemesan (kolom dinamis) → Kirim via WA.'
                            : 'Produk → Data Pemesan (kolom dinamis) → Pilihan → Kirim via WA.'}
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                          Tombol Keranjang
                        </div>
                        <div className="grid grid-cols-3 gap-1.5">
                          {(
                            [
                              { id: 'sm', label: 'Kecil' },
                              { id: 'md', label: 'Sedang' },
                              { id: 'lg', label: 'Besar' },
                            ] as { id: CatalogCartButtonSize; label: string }[]
                          ).map((sz) => {
                            const active = (c.catalogCartButtonSize ?? 'md') === sz.id;
                            return (
                              <button
                                key={sz.id}
                                type="button"
                                onClick={() => updateContent({ catalogCartButtonSize: sz.id })}
                                className={`py-1.5 px-2 rounded-lg text-xs font-semibold border cursor-pointer transition-colors ${
                                  active
                                    ? 'bg-emerald-600 text-white border-emerald-600'
                                    : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                }`}
                              >
                                {sz.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Kotak 2: Pesan WhatsApp */}
                {cartEnabled && (
                  <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
                    <div className="pb-2 border-b border-slate-100">
                      <h4 className="text-[13px] font-bold text-slate-900">Pesan WhatsApp</h4>
                    </div>

                    <div className="space-y-2.5">
                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Nomor WhatsApp
                        </label>
                        <input
                          type="text"
                          value={c.catalogWhatsappNumber ?? '6281234567890'}
                          placeholder="6281234567890"
                          onChange={(e) =>
                            updateContent({ catalogWhatsappNumber: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white outline-none focus:border-emerald-500 tabular-nums"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Nama Toko
                        </label>
                        <input
                          type="text"
                          value={c.catalogStoreName ?? ''}
                          placeholder="Otomatis pakai nama halaman"
                          onChange={(e) => updateContent({ catalogStoreName: e.target.value })}
                          className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white outline-none focus:border-emerald-500"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-slate-700 mb-1">
                          Pesan Pembuka
                        </label>
                        <input
                          type="text"
                          value={
                            c.catalogWhatsappIntro ??
                            'Halo, saya ingin memesan produk berikut:'
                          }
                          placeholder="Halo, saya ingin memesan produk berikut:"
                          onChange={(e) =>
                            updateContent({ catalogWhatsappIntro: e.target.value })
                          }
                          className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white outline-none focus:border-emerald-500"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Kotak 3: Checkout & Pengiriman */}
                {cartEnabled && (
                  <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
                    <div className="pb-2 border-b border-slate-100">
                      <h4 className="text-[13px] font-bold text-slate-900">Checkout</h4>
                    </div>

                    <div className="space-y-2.5">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-medium text-slate-700">
                          Form Data Pemesan
                        </span>
                        <ToggleSwitch
                          checked={c.catalogAskCustomerInfo ?? true}
                          onChange={(checked) =>
                            updateContent({ catalogAskCustomerInfo: checked })
                          }
                          label="Form Data Pemesan"
                        />
                      </div>

                      {(c.catalogAskCustomerInfo ?? true) && (
                        <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
                              Kolom Data Pemesan ({customerFields.length})
                            </span>
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() =>
                                  updateContent({
                                    catalogCustomerFields:
                                      getDefaultCustomerFields(normalizedProductType),
                                  })
                                }
                                title="Kembalikan kolom bawaan"
                                className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-500 hover:text-emerald-700 cursor-pointer"
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
                                      },
                                    ],
                                  })
                                }
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[10.5px] font-semibold cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                                <span>Tambah</span>
                              </button>
                            </div>
                          </div>

                          <div className="space-y-1.5">
                            {customerFields.map((field, fIdx) => (
                              <div
                                key={field.id}
                                className="p-2 rounded-lg bg-white border border-slate-200/80 space-y-1.5"
                              >
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="text"
                                    value={field.label}
                                    placeholder="Nama kolom"
                                    onChange={(e) => {
                                      const next = customerFields.map((it, i) =>
                                        i === fIdx ? { ...it, label: e.target.value } : it
                                      );
                                      updateContent({ catalogCustomerFields: next });
                                    }}
                                    className="flex-1 min-w-0 px-2 py-1 text-[11px] font-semibold text-slate-800 rounded border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-emerald-500"
                                  />
                                  <select
                                    value={field.type}
                                    onChange={(e) => {
                                      const next = customerFields.map((it, i) =>
                                        i === fIdx
                                          ? { ...it, type: e.target.value as CustomFieldInputType }
                                          : it
                                      );
                                      updateContent({ catalogCustomerFields: next });
                                    }}
                                    className="px-1.5 py-1 text-[10.5px] rounded border border-slate-200 bg-white outline-none focus:border-emerald-500"
                                  >
                                    <option value="text">Teks</option>
                                    <option value="tel">No. WA</option>
                                    <option value="email">Email</option>
                                    <option value="textarea">Paragraf</option>
                                    <option value="number">Angka</option>
                                  </select>
                                  <button
                                    type="button"
                                    title="Hapus kolom"
                                    onClick={() =>
                                      updateContent({
                                        catalogCustomerFields: customerFields.filter(
                                          (_, i) => i !== fIdx
                                        ),
                                      })
                                    }
                                    className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                                <input
                                  type="text"
                                  value={field.placeholder}
                                  placeholder="Contoh isian (placeholder)"
                                  onChange={(e) => {
                                    const next = customerFields.map((it, i) =>
                                      i === fIdx ? { ...it, placeholder: e.target.value } : it
                                    );
                                    updateContent({ catalogCustomerFields: next });
                                  }}
                                  className="w-full px-2 py-1 text-[10.5px] text-slate-600 rounded border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-emerald-500"
                                />
                              </div>
                            ))}
                            {customerFields.length === 0 && (
                              <div className="text-[11px] text-slate-400 text-center py-2">
                                Belum ada kolom. Klik &ldquo;Tambah&rdquo; untuk menambahkan kolom isian.
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {hasPhysicalItem && (
                        <>
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-slate-700">
                              Opsi Pengiriman
                            </span>
                            <ToggleSwitch
                              checked={c.catalogShippingEnabled ?? true}
                              onChange={(checked) =>
                                updateContent({ catalogShippingEnabled: checked })
                              }
                              label="Opsi Pengiriman"
                            />
                          </div>

                          {(c.catalogShippingEnabled ?? true) && (() => {
                            const shippingOpts = resolveCatalogShippingOptions(c);
                            const activeShipOpt =
                              shippingOpts.find((o) => o.id === activeShippingOptionId) ??
                              shippingOpts[0];
                            const updateShipOpt = (
                              optId: ShippingMethodId,
                              patch: Partial<CatalogShippingOptionConfig>
                            ) => {
                              const nextOpts = shippingOpts.map((o) =>
                                o.id === optId ? { ...o, ...patch } : o
                              );
                              updateContent({ catalogShippingOptions: nextOpts });
                            };

                            return (
                              <div className="pt-2.5 border-t border-slate-100 space-y-2.5">
                                <div className="flex items-center justify-between gap-2">
                                  <span className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    Setting Pilihan &amp; Catatan
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() =>
                                      updateContent({
                                        catalogShippingOptions:
                                          cloneDefaultCatalogShippingOptions(),
                                      })
                                    }
                                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:underline cursor-pointer"
                                  >
                                    <RotateCcw className="w-3 h-3" />
                                    <span>Reset Default</span>
                                  </button>
                                </div>

                                {/* Pilih 1 dari 4 Opsi */}
                                <div className="grid grid-cols-2 gap-1.5">
                                  {shippingOpts.map((opt, oIdx) => {
                                    const isSel = activeShipOpt.id === opt.id;
                                    return (
                                      <button
                                        key={opt.id}
                                        type="button"
                                        onClick={() => setActiveShippingOptionId(opt.id)}
                                        className={`flex items-center gap-1.5 px-2 py-1.5 rounded-lg border text-left text-[11px] font-semibold transition-colors cursor-pointer min-w-0 ${
                                          isSel
                                            ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                                        } ${opt.enabled === false ? 'opacity-55' : ''}`}
                                      >
                                        <span
                                          className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                                            opt.enabled !== false
                                              ? isSel
                                                ? 'bg-emerald-200'
                                                : 'bg-emerald-500'
                                              : 'bg-slate-400'
                                          }`}
                                        />
                                        <span className="truncate">
                                          {oIdx + 1}. {opt.label}
                                        </span>
                                      </button>
                                    );
                                  })}
                                </div>

                                {/* Detail Pengaturan Opsi Terpilih */}
                                {activeShipOpt && (
                                  <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/90 space-y-2.5">
                                    <div className="flex items-center justify-between gap-2 pb-1.5 border-b border-slate-200/70">
                                      <span className="text-xs font-bold text-slate-800 truncate">
                                        {activeShipOpt.label}
                                      </span>
                                      <ToggleSwitch
                                        checked={activeShipOpt.enabled !== false}
                                        onChange={(checked) =>
                                          updateShipOpt(activeShipOpt.id, { enabled: checked })
                                        }
                                        label={`Aktifkan pilihan ${activeShipOpt.label}`}
                                      />
                                    </div>

                                    <div>
                                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                                        Nama Pilihan
                                      </label>
                                      <input
                                        type="text"
                                        value={activeShipOpt.label}
                                        onChange={(e) =>
                                          updateShipOpt(activeShipOpt.id, {
                                            label: e.target.value,
                                          })
                                        }
                                        className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 bg-white focus:border-emerald-500 outline-none"
                                      />
                                    </div>

                                    {/* Isian Waktu / Jam */}
                                    <div className="p-2 rounded-lg bg-white border border-slate-200/80 space-y-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-semibold text-slate-700">
                                          Tambahkan Waktu / Jam
                                        </span>
                                        <ToggleSwitch
                                          checked={Boolean(activeShipOpt.askArrivalTime)}
                                          onChange={(checked) =>
                                            updateShipOpt(activeShipOpt.id, {
                                              askArrivalTime: checked,
                                            })
                                          }
                                          label="Tambahkan input waktu"
                                        />
                                      </div>
                                      {activeShipOpt.askArrivalTime && (
                                        <div className="grid grid-cols-2 gap-1.5">
                                          <input
                                            type="text"
                                            value={activeShipOpt.arrivalTimeLabel ?? ''}
                                            placeholder="Label (mis. Diambil jam)"
                                            onChange={(e) =>
                                              updateShipOpt(activeShipOpt.id, {
                                                arrivalTimeLabel: e.target.value,
                                              })
                                            }
                                            className="w-full px-2 py-1 text-[11px] text-slate-800 rounded border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-emerald-500"
                                          />
                                          <input
                                            type="text"
                                            value={activeShipOpt.arrivalTimePlaceholder ?? ''}
                                            placeholder="Contoh: 18:30 WIB"
                                            onChange={(e) =>
                                              updateShipOpt(activeShipOpt.id, {
                                                arrivalTimePlaceholder: e.target.value,
                                              })
                                            }
                                            className="w-full px-2 py-1 text-[11px] text-slate-800 rounded border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-emerald-500"
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {/* Isian Jumlah Orang */}
                                    <div className="p-2 rounded-lg bg-white border border-slate-200/80 space-y-2">
                                      <div className="flex items-center justify-between gap-2">
                                        <span className="text-[11px] font-semibold text-slate-700">
                                          Tambahkan Jumlah Orang
                                        </span>
                                        <ToggleSwitch
                                          checked={Boolean(activeShipOpt.askGuestCount)}
                                          onChange={(checked) =>
                                            updateShipOpt(activeShipOpt.id, {
                                              askGuestCount: checked,
                                            })
                                          }
                                          label="Tambahkan jumlah orang"
                                        />
                                      </div>
                                      {activeShipOpt.askGuestCount && (
                                        <div className="grid grid-cols-2 gap-1.5">
                                          <input
                                            type="text"
                                            value={activeShipOpt.guestCountLabel ?? ''}
                                            placeholder="Label (mis. Jumlah Orang)"
                                            onChange={(e) =>
                                              updateShipOpt(activeShipOpt.id, {
                                                guestCountLabel: e.target.value,
                                              })
                                            }
                                            className="w-full px-2 py-1 text-[11px] text-slate-800 rounded border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-emerald-500"
                                          />
                                          <input
                                            type="text"
                                            value={activeShipOpt.guestCountPlaceholder ?? ''}
                                            placeholder="Contoh: 4 orang"
                                            onChange={(e) =>
                                              updateShipOpt(activeShipOpt.id, {
                                                guestCountPlaceholder: e.target.value,
                                              })
                                            }
                                            className="w-full px-2 py-1 text-[11px] text-slate-800 rounded border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-emerald-500"
                                          />
                                        </div>
                                      )}
                                    </div>

                                    {/* Checklist Konfirmasi (Bisa Multi-Checklist) */}
                                    {(() => {
                                      const currentChecklistItems =
                                        resolveShippingOptionChecklistItems(activeShipOpt);
                                      const saveChecklists = (nextList: string[]) => {
                                        updateShipOpt(activeShipOpt.id, {
                                          checklistItems: nextList,
                                          checklistText: nextList.join('\n'),
                                        });
                                      };
                                      return (
                                        <div className="p-2 rounded-lg bg-white border border-slate-200/80 space-y-2">
                                          <div className="flex items-center justify-between gap-2">
                                            <span className="text-[11px] font-semibold text-slate-700">
                                              Tampilkan Checklist ({currentChecklistItems.length})
                                            </span>
                                            <ToggleSwitch
                                              checked={Boolean(activeShipOpt.checklistEnabled)}
                                              onChange={(checked) =>
                                                updateShipOpt(activeShipOpt.id, {
                                                  checklistEnabled: checked,
                                                })
                                              }
                                              label="Tampilkan checklist konfirmasi"
                                            />
                                          </div>
                                          {activeShipOpt.checklistEnabled && (
                                            <div className="space-y-1.5">
                                              {currentChecklistItems.map((chkTxt, cIdx) => (
                                                <div
                                                  key={`ship_chk_${activeShipOpt.id}_${cIdx}`}
                                                  className="flex items-start gap-1.5"
                                                >
                                                  <span className="text-[10.5px] font-bold text-slate-400 pt-1.5 w-4 shrink-0 tabular-nums">
                                                    {cIdx + 1}.
                                                  </span>
                                                  <textarea
                                                    rows={2}
                                                    value={chkTxt}
                                                    placeholder="Isi pernyataan checklist..."
                                                    onChange={(e) => {
                                                      const nextList = [...currentChecklistItems];
                                                      nextList[cIdx] = e.target.value;
                                                      saveChecklists(nextList);
                                                    }}
                                                    className="flex-1 min-w-0 px-2 py-1 text-[11px] text-slate-800 rounded border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-emerald-500 resize-y"
                                                  />
                                                  <button
                                                    type="button"
                                                    title="Hapus checklist"
                                                    onClick={() =>
                                                      saveChecklists(
                                                        currentChecklistItems.filter(
                                                          (_, i) => i !== cIdx
                                                        )
                                                      )
                                                    }
                                                    className="p-1 mt-0.5 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                                                  >
                                                    <Trash2 className="w-3.5 h-3.5" />
                                                  </button>
                                                </div>
                                              ))}
                                              <button
                                                type="button"
                                                onClick={() =>
                                                  saveChecklists([
                                                    ...currentChecklistItems,
                                                    'Pernyataan konfirmasi baru',
                                                  ])
                                                }
                                                className="w-full py-1 px-2 rounded-lg border border-dashed border-emerald-300 bg-emerald-50/50 hover:bg-emerald-50 text-emerald-700 text-[11px] font-semibold inline-flex items-center justify-center gap-1 cursor-pointer"
                                              >
                                                <Plus className="w-3 h-3" />
                                                <span>Tambah Checklist</span>
                                              </button>
                                            </div>
                                          )}
                                        </div>
                                      );
                                    })()}

                                    {/* Catatan Pilihan */}
                                    <div className="p-2 rounded-lg bg-white border border-slate-200/80 space-y-2">
                                      <div className="text-[11px] font-semibold text-slate-700">
                                        Catatan Khusus Pilihan Ini
                                      </div>
                                      <input
                                        type="text"
                                        value={activeShipOpt.noteTitle ?? 'Catatan:'}
                                        placeholder="Judul catatan (mis. Catatan: / Catatan Penting:)"
                                        onChange={(e) =>
                                          updateShipOpt(activeShipOpt.id, {
                                            noteTitle: e.target.value,
                                          })
                                        }
                                        className="w-full px-2 py-1 text-[11px] font-semibold text-slate-800 rounded border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-emerald-500"
                                      />
                                      <textarea
                                        rows={2}
                                        value={activeShipOpt.noteText ?? ''}
                                        placeholder="Kosongkan jika tidak perlu catatan"
                                        onChange={(e) =>
                                          updateShipOpt(activeShipOpt.id, {
                                            noteText: e.target.value,
                                          })
                                        }
                                        className="w-full px-2 py-1.5 text-[11px] text-slate-800 rounded border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-emerald-500 resize-y"
                                      />
                                    </div>
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

                {/* Kotak 4: Daftar Produk */}
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between px-0.5 pt-1">
                    <div>
                      <h4 className="text-[13px] font-bold text-slate-900">
                        Daftar Produk ({items.length})
                      </h4>
                      <p className="text-[11px] text-slate-400">
                        Klik produk untuk edit, geser untuk urutkan.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddCatalogItem}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold cursor-pointer transition-colors shrink-0"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {items.map((item, idx) => {
                      const isExpanded = expandedCatalogItems[item.id] ?? idx === 0;
                      const isPhysicalItem =
                        item.productType === 'physical' ||
                        ((!item.productType || item.productType === 'inherit') &&
                          normalizedProductType === 'physical');

                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => {
                            const activeTag = document.activeElement?.tagName;
                            if (activeTag === 'INPUT' || activeTag === 'TEXTAREA' || activeTag === 'SELECT') {
                              e.preventDefault();
                              return;
                            }
                            e.dataTransfer.setData('application/lynk-catalog-item', item.id);
                            e.dataTransfer.effectAllowed = 'move';
                            setDragItemState({ draggedId: item.id, targetId: null });
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (dragItemState.targetId !== item.id) {
                              setDragItemState((prev) => ({ ...prev, targetId: item.id }));
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const draggedId = e.dataTransfer.getData('application/lynk-catalog-item');
                            if (draggedId && draggedId !== item.id) {
                              handleReorderCatalogItem(draggedId, item.id);
                            }
                            setDragItemState({ draggedId: null, targetId: null });
                          }}
                          onDragEnd={() => setDragItemState({ draggedId: null, targetId: null })}
                          className={`rounded-xl border bg-white shadow-2xs overflow-hidden transition-colors ${
                            dragItemState.draggedId === item.id ? 'opacity-45' : ''
                          } ${
                            dragItemState.targetId === item.id && dragItemState.draggedId !== item.id
                              ? 'border-emerald-500 ring-1 ring-emerald-500/30'
                              : 'border-slate-200'
                          }`}
                        >
                          {/* Header Produk */}
                          <div className="px-3 py-2.5 bg-slate-50/70 flex items-center gap-2">
                            <span
                              title="Geser urutan"
                              className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </span>
                            <div className="w-8 h-8 rounded-lg border border-slate-200 bg-white overflow-hidden shrink-0">
                              <img
                                src={item.image || PRODUCT_CARD_SVG}
                                alt={item.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCatalogItems((prev) => ({
                                  ...prev,
                                  [item.id]: !isExpanded,
                                }))
                              }
                              className="flex-1 min-w-0 text-left cursor-pointer"
                            >
                              <div className="text-[13px] font-bold text-slate-900 truncate">
                                {item.title || `Produk #${idx + 1}`}
                              </div>
                              <div className="text-[11px] text-slate-500 truncate tabular-nums">
                                {item.price || 'Tanpa harga'} · {item.unitSold} terjual
                              </div>
                            </button>
                            <button
                              type="button"
                              onClick={() =>
                                setExpandedCatalogItems((prev) => ({
                                  ...prev,
                                  [item.id]: !isExpanded,
                                }))
                              }
                              title={isExpanded ? 'Tutup' : 'Buka'}
                              className="p-1 rounded-md text-slate-500 hover:bg-slate-200/60 cursor-pointer shrink-0"
                            >
                              <ChevronDown
                                className={`w-4 h-4 transition-transform duration-150 ${
                                  isExpanded ? 'rotate-180' : ''
                                }`}
                              />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteCatalogItem(item.id)}
                              title="Hapus produk"
                              className="p-1 rounded-md text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Isi Produk Dipisah Per Kotak */}
                          {isExpanded && (
                            <div className="p-2.5 space-y-2.5 bg-slate-50/40 border-t border-slate-100">
                              {/* Sub-Kotak 1: Info Utama */}
                              <div className="p-2.5 rounded-lg border border-slate-200/80 bg-white space-y-2">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                  Info Produk
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Nama Produk
                                  </label>
                                  <input
                                    type="text"
                                    value={item.title}
                                    placeholder="Nama produk"
                                    onChange={(e) =>
                                      handleUpdateCatalogItem(item.id, { title: e.target.value })
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs font-medium text-slate-800 rounded-lg border border-slate-200 outline-none focus:border-emerald-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Ringkasan
                                  </label>
                                  <input
                                    type="text"
                                    value={item.subtitle}
                                    placeholder="Keterangan singkat produk"
                                    onChange={(e) =>
                                      handleUpdateCatalogItem(item.id, { subtitle: e.target.value })
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 outline-none focus:border-emerald-500"
                                  />
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                      Harga
                                    </label>
                                    <input
                                      type="text"
                                      value={item.price}
                                      placeholder="Rp 99.000"
                                      onChange={(e) =>
                                        handleUpdateCatalogItem(item.id, { price: e.target.value })
                                      }
                                      className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 outline-none focus:border-emerald-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                      Terjual
                                    </label>
                                    <input
                                      type="number"
                                      min={0}
                                      value={item.unitSold}
                                      placeholder="0"
                                      onChange={(e) =>
                                        handleUpdateCatalogItem(item.id, {
                                          unitSold: Math.max(0, Number(e.target.value)),
                                        })
                                      }
                                      className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 outline-none focus:border-emerald-500 tabular-nums"
                                    />
                                  </div>
                                </div>
                              </div>

                              {/* Sub-Kotak 2: Foto & Galeri */}
                              <div className="p-2.5 rounded-lg border border-slate-200/80 bg-white space-y-2">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                  Foto Produk
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <input
                                    type="url"
                                    value={item.image.startsWith('data:') ? '' : item.image}
                                    placeholder={
                                      item.image.startsWith('data:') &&
                                      !item.image.startsWith('data:image/svg+xml')
                                        ? 'Gambar terunggah'
                                        : 'URL gambar...'
                                    }
                                    onChange={(e) =>
                                      handleUpdateCatalogItem(item.id, {
                                        image: e.target.value || PRODUCT_CARD_SVG,
                                      })
                                    }
                                    className="flex-1 min-w-0 px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 outline-none focus:border-emerald-500"
                                  />
                                  <label
                                    title="Upload gambar"
                                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg border border-slate-200 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer shrink-0 transition-colors"
                                  >
                                    <Upload className="w-3.5 h-3.5 text-emerald-600" />
                                    <span>Upload</span>
                                    <input
                                      type="file"
                                      accept="image/*"
                                      onChange={(e) => handleCatalogItemImageUpload(item.id, e)}
                                      className="hidden"
                                    />
                                  </label>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                      Rasio
                                    </label>
                                    <select
                                      value={item.imageAspectRatio ?? 'auto'}
                                      onChange={(e) =>
                                        handleUpdateCatalogItem(item.id, {
                                          imageAspectRatio: e.target.value as
                                            | 'auto'
                                            | '16/9'
                                            | '4/3'
                                            | '1/1',
                                        })
                                      }
                                      className="w-full px-2 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 bg-white outline-none focus:border-emerald-500"
                                    >
                                      <option value="auto">Otomatis</option>
                                      <option value="16/9">16:9</option>
                                      <option value="4/3">4:3</option>
                                      <option value="1/1">1:1 Kotak</option>
                                    </select>
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                      Tampilan
                                    </label>
                                    <select
                                      value={item.imageObjectFit ?? 'cover'}
                                      onChange={(e) =>
                                        handleUpdateCatalogItem(item.id, {
                                          imageObjectFit: e.target.value as 'cover' | 'contain',
                                        })
                                      }
                                      className="w-full px-2 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 bg-white outline-none focus:border-emerald-500"
                                    >
                                      <option value="cover">Penuh</option>
                                      <option value="contain">Utuh</option>
                                    </select>
                                  </div>
                                </div>

                                <div className="pt-1 border-t border-slate-100 space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-700">
                                      Galeri ({(item.gallery ?? []).length})
                                    </span>
                                    <label className="inline-flex items-center gap-1 text-xs font-semibold text-emerald-700 hover:text-emerald-800 cursor-pointer">
                                      <Plus className="w-3 h-3" />
                                      <span>Tambah</span>
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) =>
                                          handleCatalogItemGalleryUpload(item.id, e)
                                        }
                                        className="hidden"
                                      />
                                    </label>
                                  </div>
                                  {(item.gallery ?? []).length > 0 && (
                                    <div className="flex flex-wrap gap-1.5">
                                      {(item.gallery ?? []).map((gSrc, gIdx) => (
                                        <div
                                          key={`${item.id}_gal_${gIdx}`}
                                          className="relative w-10 h-10 rounded-lg border border-slate-200 bg-white overflow-hidden"
                                        >
                                          <img
                                            src={gSrc}
                                            alt={`Galeri ${gIdx + 1}`}
                                            className="w-full h-full object-cover"
                                          />
                                          <button
                                            type="button"
                                            onClick={() =>
                                              handleRemoveCatalogGalleryImage(item.id, gIdx)
                                            }
                                            title="Hapus foto"
                                            className="absolute top-0.5 right-0.5 w-3.5 h-3.5 rounded-full bg-slate-900/75 text-white flex items-center justify-center hover:bg-red-600 cursor-pointer"
                                          >
                                            <X className="w-2.5 h-2.5" />
                                          </button>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>
                              </div>

                              {/* Sub-Kotak 3: Tombol & Detail */}
                              <div className="p-2.5 rounded-lg border border-slate-200/80 bg-white space-y-2">
                                <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                  Detail &amp; Tombol
                                </div>
                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                      Teks Tombol
                                    </label>
                                    <input
                                      type="text"
                                      value={item.ctaLabel}
                                      placeholder="Lihat Detail"
                                      onChange={(e) =>
                                        handleUpdateCatalogItem(item.id, {
                                          ctaLabel: e.target.value,
                                        })
                                      }
                                      className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 outline-none focus:border-emerald-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                      Link Tujuan
                                    </label>
                                    <input
                                      type="url"
                                      value={item.url}
                                      placeholder="https://..."
                                      onChange={(e) =>
                                        handleUpdateCatalogItem(item.id, { url: e.target.value })
                                      }
                                      className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 outline-none focus:border-emerald-500"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-2 gap-2">
                                  <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                      Badge
                                    </label>
                                    <input
                                      type="text"
                                      value={item.badge ?? ''}
                                      placeholder="Promo / Laris"
                                      onChange={(e) =>
                                        handleUpdateCatalogItem(item.id, { badge: e.target.value })
                                      }
                                      className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 outline-none focus:border-emerald-500"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                      Varian
                                    </label>
                                    <input
                                      type="text"
                                      value={item.variants ?? ''}
                                      placeholder="Reguler, VIP"
                                      onChange={(e) =>
                                        handleUpdateCatalogItem(item.id, {
                                          variants: e.target.value,
                                        })
                                      }
                                      className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 outline-none focus:border-emerald-500"
                                    />
                                  </div>
                                </div>

                                <div>
                                  <label className="block text-xs font-medium text-slate-700 mb-1">
                                    Deskripsi Detail
                                  </label>
                                  <textarea
                                    rows={2}
                                    value={item.description ?? ''}
                                    placeholder="Spesifikasi atau isi paket..."
                                    onChange={(e) =>
                                      handleUpdateCatalogItem(item.id, {
                                        description: e.target.value,
                                      })
                                    }
                                    className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 outline-none focus:border-emerald-500 resize-y"
                                  />
                                </div>
                              </div>

                              {/* Sub-Kotak 4: Tipe Item (jika Keranjang aktif) */}
                              {cartEnabled && (
                                <div className="p-2.5 rounded-lg border border-slate-200/80 bg-white space-y-2">
                                  <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                                    Tipe Item
                                  </div>
                                  <div>
                                    <label className="block text-xs font-medium text-slate-700 mb-1">
                                      Jenis Produk
                                    </label>
                                    <select
                                      value={item.productType ?? 'inherit'}
                                      onChange={(e) =>
                                        handleUpdateCatalogItem(item.id, {
                                          productType: e.target.value as
                                            | 'inherit'
                                            | CatalogProductType,
                                        })
                                      }
                                      className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 bg-white outline-none focus:border-emerald-500"
                                    >
                                      <option value="inherit">
                                        Ikuti Katalog (
                                        {normalizedProductType === 'digital' ? 'Digital' : 'Fisik'})
                                      </option>
                                      <option value="physical">Produk Fisik</option>
                                      <option value="digital">Produk Digital</option>
                                    </select>
                                  </div>

                                  {isPhysicalItem && (
                                    <div>
                                      <label className="block text-xs font-medium text-slate-700 mb-1">
                                        Catatan Ambil di Lokasi
                                      </label>
                                      <input
                                        type="text"
                                        value={item.pickupNote ?? ''}
                                        placeholder="Opsional, misal: Masak ± 30 menit"
                                        onChange={(e) =>
                                          handleUpdateCatalogItem(item.id, {
                                            pickupNote: e.target.value,
                                          })
                                        }
                                        className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 outline-none focus:border-emerald-500"
                                      />
                                    </div>
                                  )}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            );
          })()}

          {selectedBlock.type === 'carousel' && (() => {
            const carouselItems = c.carouselItems ?? [];
            const currentRatio: CarouselAspectRatio = c.carouselAspectRatio ?? '4/5';
            const currentFit = c.carouselObjectFit ?? 'cover';

            return (
              <div className="space-y-3.5">
                {/* Ukuran / Rasio Foto */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Ukuran / Rasio Foto
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: '1/1', label: '1:1' },
                        { id: '4/5', label: '4:5' },
                        { id: '9/16', label: '9:16' },
                        { id: '16/9', label: '16:9' },
                      ] as const
                    ).map((opt) => {
                      const active = currentRatio === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => updateContent({ carouselAspectRatio: opt.id })}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer tabular-nums ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Penyesuaian Gambar */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Penyesuaian Foto
                  </label>
                  <select
                    value={currentFit}
                    onChange={(e) =>
                      updateContent({
                        carouselObjectFit: e.target.value as 'cover' | 'contain',
                      })
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-500"
                  >
                    <option value="cover">Penuhi Bingkai (Cover)</option>
                    <option value="contain">Tampil Utuh (Contain)</option>
                  </select>
                </div>

                {/* Pengaturan Jumlah Foto */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-700">Jumlah Foto</span>
                    <div className="inline-flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleSetCarouselCount(carouselItems.length - 1)}
                        disabled={carouselItems.length <= 1}
                        aria-label="Kurangi jumlah foto"
                        className="w-6 h-6 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-xs font-bold text-slate-700 cursor-pointer"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={carouselItems.length}
                        onChange={(e) => handleSetCarouselCount(Number(e.target.value))}
                        className="w-12 h-6 px-1 text-center text-xs font-semibold rounded border border-slate-200 bg-white tabular-nums outline-none focus:border-blue-500"
                      />
                      <button
                        type="button"
                        onClick={() => handleSetCarouselCount(carouselItems.length + 1)}
                        disabled={carouselItems.length >= 20}
                        aria-label="Tambah jumlah foto"
                        className="w-6 h-6 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-xs font-bold text-slate-700 cursor-pointer"
                      >
                        +
                      </button>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddCarouselItem}
                    disabled={carouselItems.length >= 20}
                    className="w-full inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-45 text-[11px] font-semibold cursor-pointer transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Tambah Foto ({carouselItems.length}/20)</span>
                  </button>
                </div>

                {/* Daftar Slide Foto */}
                <div className="space-y-2.5">
                  {carouselItems.map((item, idx) => (
                    <div
                      key={item.id}
                      draggable
                      onDragStart={(e) => {
                        const activeTag = document.activeElement?.tagName;
                        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
                          e.preventDefault();
                          return;
                        }
                        e.dataTransfer.setData('application/lynk-carousel-item', item.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setDragItemState({ draggedId: item.id, targetId: null });
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragItemState.targetId !== item.id) {
                          setDragItemState((prev) => ({ ...prev, targetId: item.id }));
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const draggedId = e.dataTransfer.getData('application/lynk-carousel-item');
                        if (draggedId && draggedId !== item.id) {
                          handleReorderCarouselItem(draggedId, item.id);
                        }
                        setDragItemState({ draggedId: null, targetId: null });
                      }}
                      onDragEnd={() => setDragItemState({ draggedId: null, targetId: null })}
                      className={`p-2.5 rounded-lg border bg-slate-50/70 space-y-2 transition-colors ${
                        dragItemState.draggedId === item.id ? 'opacity-45' : ''
                      } ${
                        dragItemState.targetId === item.id && dragItemState.draggedId !== item.id
                          ? 'border-blue-500 ring-1 ring-blue-500/30'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            title="Tarik untuk ubah urutan foto"
                            className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-[11px] font-bold text-slate-700">
                            Foto #{idx + 1}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeleteCarouselItem(item.id)}
                          disabled={carouselItems.length <= 1}
                          title={
                            carouselItems.length <= 1
                              ? 'Minimal 1 foto harus ada'
                              : 'Hapus foto'
                          }
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-35 cursor-pointer shrink-0"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Upload & Link Gambar */}
                      <div className="flex items-center gap-2">
                        <div className="w-10 h-10 rounded-md border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                          <img
                            src={item.image || CAROUSEL_SAMPLE_1_SVG}
                            alt={item.title || `Foto ${idx + 1}`}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                        <div className="flex-1 min-w-0 flex items-center gap-1">
                          <input
                            type="url"
                            value={item.image.startsWith('data:') ? '' : item.image}
                            placeholder={
                              item.image.startsWith('data:') &&
                              !item.image.startsWith('data:image/svg+xml')
                                ? 'Foto lokal terunggah'
                                : 'https://... (link gambar)'
                            }
                            onChange={(e) =>
                              handleUpdateCarouselItem(item.id, {
                                image:
                                  e.target.value ||
                                  SAMPLE_CAROUSEL_IMAGES[idx % SAMPLE_CAROUSEL_IMAGES.length],
                              })
                            }
                            className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                          />
                          <label
                            title="Upload foto dari perangkat"
                            className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 cursor-pointer shrink-0 transition-colors"
                          >
                            <Upload className="w-3 h-3 text-blue-600" />
                            <span>Upload</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleCarouselItemImageUpload(item.id, e)}
                              className="hidden"
                            />
                          </label>
                        </div>
                      </div>

                      {/* Foto : Judul */}
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Judul Foto
                        </label>
                        <input
                          type="text"
                          value={item.title}
                          placeholder="Judul foto..."
                          onChange={(e) =>
                            handleUpdateCarouselItem(item.id, { title: e.target.value })
                          }
                          className="w-full px-2 py-1 text-xs font-semibold rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                        />
                      </div>

                      {/* Keterangan : Di bawah foto */}
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Keterangan (Di bawah foto)
                        </label>
                        <textarea
                          rows={2}
                          value={item.caption}
                          placeholder="Tulis keterangan foto..."
                          onChange={(e) =>
                            handleUpdateCarouselItem(item.id, { caption: e.target.value })
                          }
                          className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500 resize-y"
                        />
                      </div>

                      {/* Link Tujuan (Opsional) */}
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Link Tujuan Foto (Opsional)
                        </label>
                        <input
                          type="url"
                          value={item.url ?? ''}
                          placeholder="https://... (dibuka saat foto diklik)"
                          onChange={(e) =>
                            handleUpdateCarouselItem(item.id, { url: e.target.value })
                          }
                          className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {selectedBlock.type === 'social_feed' && (() => {
            const platform = c.socialFeedPlatform ?? 'instagram';
            const meta = SOCIAL_PLATFORMS[platform] ?? SOCIAL_PLATFORMS.instagram;
            const posts = c.socialFeedPosts ?? [];
            const currentRatio: CarouselAspectRatio = c.socialFeedRatio ?? '4/5';

            return (
              <div className="space-y-4">
                {/* 1. Logo Sosmed & Profil Akun */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2.5">
                  <div className="text-[11px] font-bold text-slate-700">
                    1. Logo Sosmed &amp; Profil Akun
                  </div>

                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                      Platform Sosial Media
                    </label>
                    <select
                      value={platform}
                      onChange={(e) => {
                        const nextPlat = e.target.value as SocialPlatform;
                        const nextMeta = SOCIAL_PLATFORMS[nextPlat];
                        const currentDefaultLabel =
                          platform === 'youtube' ? 'Subscriber' : 'Follower';
                        const nextDefaultLabel =
                          nextPlat === 'youtube' ? 'Subscriber' : 'Follower';
                        updateContent({
                          socialFeedPlatform: nextPlat,
                          socialFeedAccountUrl:
                            !c.socialFeedAccountUrl || c.socialFeedAccountUrl === meta.placeholderUrl
                              ? nextMeta.placeholderUrl
                              : c.socialFeedAccountUrl,
                          socialFeedFollowersLabel:
                            !c.socialFeedFollowersLabel ||
                            c.socialFeedFollowersLabel === currentDefaultLabel
                              ? nextDefaultLabel
                              : c.socialFeedFollowersLabel,
                        });
                      }}
                      className="w-full px-2 py-1.5 text-xs font-semibold rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                    >
                      {SOCIAL_PLATFORM_LIST.map((plat) => (
                        <option key={plat.id} value={plat.id}>
                          {plat.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Foto Profil (Opsional) */}
                  <div className="flex items-center gap-2">
                    <div
                      style={{ backgroundColor: meta.brandColor }}
                      className="w-9 h-9 rounded-full text-white overflow-hidden shrink-0 flex items-center justify-center border border-slate-200"
                    >
                      {c.socialFeedAvatar ? (
                        <img
                          src={c.socialFeedAvatar}
                          alt={c.socialFeedAccountName || meta.label}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <SocialGlyph platform={platform} className="w-4 h-4" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0 flex items-center gap-1">
                      <input
                        type="url"
                        value={c.socialFeedAvatar?.startsWith('data:') ? '' : c.socialFeedAvatar ?? ''}
                        placeholder={
                          c.socialFeedAvatar?.startsWith('data:')
                            ? 'Foto profil terunggah'
                            : 'URL Foto Profil (opsional)'
                        }
                        onChange={(e) => updateContent({ socialFeedAvatar: e.target.value })}
                        className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                      />
                      <label className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 cursor-pointer shrink-0">
                        <Upload className="w-3 h-3 text-blue-600" />
                        <span>Upload</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleSocialFeedAvatarUpload}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                        Nama Akun
                      </label>
                      <input
                        type="text"
                        value={c.socialFeedAccountName ?? ''}
                        placeholder="Studio Kreatif"
                        onChange={(e) => updateContent({ socialFeedAccountName: e.target.value })}
                        className="w-full px-2 py-1 text-xs font-semibold rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                        Username / Handle
                      </label>
                      <input
                        type="text"
                        value={c.socialFeedHandle ?? ''}
                        placeholder="@studiokreatif"
                        onChange={(e) => updateContent({ socialFeedHandle: e.target.value })}
                        className="w-full px-2 py-1 text-xs rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                        Teks Tombol
                      </label>
                      <input
                        type="text"
                        value={c.socialFeedFollowLabel ?? 'Ikuti'}
                        placeholder="Ikuti"
                        onChange={(e) => updateContent({ socialFeedFollowLabel: e.target.value })}
                        className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                        Link Profil Akun
                      </label>
                      <input
                        type="url"
                        value={c.socialFeedAccountUrl ?? ''}
                        placeholder={meta.placeholderUrl}
                        onChange={(e) => updateContent({ socialFeedAccountUrl: e.target.value })}
                        className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-0.5">
                    <span className="text-[11px] font-medium text-slate-700">
                      Centang Verifikasi Akun
                    </span>
                    <ToggleSwitch
                      checked={c.socialFeedVerified ?? true}
                      onChange={(checked) => updateContent({ socialFeedVerified: checked })}
                      label="Centang Verifikasi Akun"
                    />
                  </div>
                </div>

                {/* 2. Follower / Subscribe */}
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                  <div className="text-[11px] font-bold text-slate-700">
                    2. Follower / Subscribe (Di Sebelah Kiri Tombol Ikuti)
                  </div>
                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                        Jumlah
                      </label>
                      <input
                        type="text"
                        value={c.socialFeedFollowers ?? ''}
                        placeholder="45,8 rb"
                        onChange={(e) => updateContent({ socialFeedFollowers: e.target.value })}
                        className="w-full px-2 py-1 text-[11px] font-semibold rounded border border-slate-200 bg-white outline-none focus:border-blue-500 tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                        Label
                      </label>
                      <input
                        type="text"
                        value={
                          c.socialFeedFollowersLabel ??
                          (platform === 'youtube' ? 'Subscriber' : 'Follower')
                        }
                        placeholder={platform === 'youtube' ? 'Subscriber' : 'Follower'}
                        onChange={(e) =>
                          updateContent({ socialFeedFollowersLabel: e.target.value })
                        }
                        className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                      Bio Singkat Akun (Opsional)
                    </label>
                    <textarea
                      rows={2}
                      value={c.socialFeedBio ?? ''}
                      placeholder="Kosongkan jika tidak ingin menampilkan bio..."
                      onChange={(e) => updateContent({ socialFeedBio: e.target.value })}
                      className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500 resize-y"
                    />
                  </div>
                </div>

                {/* 3. Ukuran / Rasio Postingan */}
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    3. Ukuran / Rasio Postingan
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: '1/1', label: '1:1' },
                        { id: '4/5', label: '4:5' },
                        { id: '9/16', label: '9:16' },
                        { id: '16/9', label: '16:9' },
                      ] as const
                    ).map((opt) => {
                      const active = currentRatio === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => updateContent({ socialFeedRatio: opt.id })}
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer tabular-nums ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* 4. Daftar Postingan Carousel (Gambar / Video) */}
                <div className="space-y-2.5">
                  <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-200 space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-slate-700">
                        4. Jumlah Postingan
                      </span>
                      <div className="inline-flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleSetSocialPostCount(posts.length - 1)}
                          disabled={posts.length <= 1}
                          className="w-6 h-6 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-xs font-bold text-slate-700 cursor-pointer"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min={1}
                          max={20}
                          value={posts.length}
                          onChange={(e) => handleSetSocialPostCount(Number(e.target.value))}
                          className="w-12 h-6 px-1 text-center text-xs font-semibold rounded border border-slate-200 bg-white tabular-nums outline-none focus:border-blue-500"
                        />
                        <button
                          type="button"
                          onClick={() => handleSetSocialPostCount(posts.length + 1)}
                          disabled={posts.length >= 20}
                          className="w-6 h-6 rounded border border-slate-200 bg-white hover:bg-slate-100 disabled:opacity-40 text-xs font-bold text-slate-700 cursor-pointer"
                        >
                          +
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleAddSocialPost}
                      disabled={posts.length >= 20}
                      className="w-full inline-flex items-center justify-center gap-1 py-1.5 px-2.5 rounded-md bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-45 text-[11px] font-semibold cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah Postingan ({posts.length}/20)</span>
                    </button>
                  </div>

                  {posts.map((post, idx) => (
                    <div
                      key={post.id}
                      draggable
                      onDragStart={(e) => {
                        const activeTag = document.activeElement?.tagName;
                        if (activeTag === 'INPUT' || activeTag === 'TEXTAREA') {
                          e.preventDefault();
                          return;
                        }
                        e.dataTransfer.setData('application/lynk-sf-post', post.id);
                        e.dataTransfer.effectAllowed = 'move';
                        setDragItemState({ draggedId: post.id, targetId: null });
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        if (dragItemState.targetId !== post.id) {
                          setDragItemState((prev) => ({ ...prev, targetId: post.id }));
                        }
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        const draggedId = e.dataTransfer.getData('application/lynk-sf-post');
                        if (draggedId && draggedId !== post.id) {
                          handleReorderSocialPost(draggedId, post.id);
                        }
                        setDragItemState({ draggedId: null, targetId: null });
                      }}
                      onDragEnd={() => setDragItemState({ draggedId: null, targetId: null })}
                      className={`p-2.5 rounded-lg border bg-slate-50/70 space-y-2 transition-colors ${
                        dragItemState.draggedId === post.id ? 'opacity-45' : ''
                      } ${
                        dragItemState.targetId === post.id && dragItemState.draggedId !== post.id
                          ? 'border-blue-500 ring-1 ring-blue-500/30'
                          : 'border-slate-200'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-1.5">
                        <div className="flex items-center gap-1.5 min-w-0">
                          <span
                            title="Tarik untuk ubah urutan"
                            className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0"
                          >
                            <GripVertical className="w-3.5 h-3.5" />
                          </span>
                          <span className="text-[11px] font-bold text-slate-700">
                            Postingan #{idx + 1}
                          </span>
                        </div>

                        <div className="flex items-center gap-1">
                          <div className="inline-flex rounded-md border border-slate-200 bg-white p-0.5">
                            <button
                              type="button"
                              onClick={() => handleUpdateSocialPost(post.id, { mediaType: 'image' })}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                                post.mediaType === 'image'
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <ImageIcon className="w-2.5 h-2.5" />
                              <span>Gambar</span>
                            </button>
                            <button
                              type="button"
                              onClick={() => handleUpdateSocialPost(post.id, { mediaType: 'video' })}
                              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                                post.mediaType === 'video'
                                  ? 'bg-blue-600 text-white'
                                  : 'text-slate-600 hover:text-slate-900'
                              }`}
                            >
                              <Video className="w-2.5 h-2.5" />
                              <span>Video</span>
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteSocialPost(post.id)}
                            disabled={posts.length <= 1}
                            title="Hapus postingan"
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 disabled:opacity-35 cursor-pointer shrink-0"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {post.mediaType === 'video' && (
                        <div className="space-y-1.5">
                          <label className="block text-[10px] font-medium text-slate-500">
                            Link Video (YouTube / TikTok / IG / FB / MP4) atau Upload
                          </label>
                          <div className="flex items-center gap-1">
                            <input
                              type="url"
                              value={post.videoUrl?.startsWith('data:') ? '' : post.videoUrl ?? ''}
                              placeholder={
                                post.videoUrl?.startsWith('data:')
                                  ? 'File video lokal terunggah'
                                  : 'https://... (link video)'
                              }
                              onChange={(e) =>
                                handleUpdateSocialPost(post.id, { videoUrl: e.target.value })
                              }
                              className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                            />
                            <label
                              title="Upload video dari perangkat"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 cursor-pointer shrink-0"
                            >
                              <Upload className="w-3 h-3 text-blue-600" />
                              <span>Video</span>
                              <input
                                type="file"
                                accept="video/*"
                                onChange={(e) => handleSocialPostVideoUpload(post.id, e)}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      )}

                      {/* Foto / Sampul Thumbnail */}
                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          {post.mediaType === 'video'
                            ? 'Sampul / Thumbnail Video (Opsional)'
                            : 'Foto Postingan (Link / Upload)'}
                        </label>
                        <div className="flex items-center gap-2">
                          <div className="w-9 h-9 rounded-md border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                            <img
                              src={post.imageUrl || CAROUSEL_SAMPLE_1_SVG}
                              alt={`Post ${idx + 1}`}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="flex-1 min-w-0 flex items-center gap-1">
                            <input
                              type="url"
                              value={post.imageUrl.startsWith('data:') ? '' : post.imageUrl}
                              placeholder={
                                post.imageUrl.startsWith('data:') &&
                                !post.imageUrl.startsWith('data:image/svg+xml')
                                  ? 'Gambar lokal terunggah'
                                  : 'https://... (link foto)'
                              }
                              onChange={(e) =>
                                handleUpdateSocialPost(post.id, {
                                  imageUrl:
                                    e.target.value ||
                                    SAMPLE_CAROUSEL_IMAGES[idx % SAMPLE_CAROUSEL_IMAGES.length],
                                })
                              }
                              className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                            />
                            <label
                              title="Upload foto dari perangkat"
                              className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 cursor-pointer shrink-0"
                            >
                              <Upload className="w-3 h-3 text-blue-600" />
                              <span>Foto</span>
                              <input
                                type="file"
                                accept="image/*"
                                onChange={(e) => handleSocialPostImageUpload(post.id, e)}
                                className="hidden"
                              />
                            </label>
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                          Caption / Keterangan Postingan
                        </label>
                        <textarea
                          rows={2}
                          value={post.caption}
                          placeholder="Tulis caption postingan..."
                          onChange={(e) =>
                            handleUpdateSocialPost(post.id, { caption: e.target.value })
                          }
                          className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500 resize-y"
                        />
                      </div>

                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                            Suka
                          </label>
                          <input
                            type="text"
                            value={post.likes ?? ''}
                            placeholder="1,4 rb"
                            onChange={(e) =>
                              handleUpdateSocialPost(post.id, { likes: e.target.value })
                            }
                            className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500 tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                            Komentar
                          </label>
                          <input
                            type="text"
                            value={post.comments ?? ''}
                            placeholder="68"
                            onChange={(e) =>
                              handleUpdateSocialPost(post.id, { comments: e.target.value })
                            }
                            className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500 tabular-nums"
                          />
                        </div>
                        <div>
                          <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                            Link Post
                          </label>
                          <input
                            type="url"
                            value={post.url ?? ''}
                            placeholder="https://..."
                            onChange={(e) =>
                              handleUpdateSocialPost(post.id, { url: e.target.value })
                            }
                            className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            );
          })()}

          {selectedBlock.type === 'maps_place' && (
            <div className="space-y-3">
              {/* Foto Lokasi Maps */}
              <div className="space-y-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Foto Lokasi Maps
                </label>
                <div className="flex items-center gap-2">
                  <div className="w-16 h-11 rounded-md border border-slate-200 bg-white overflow-hidden shrink-0 flex items-center justify-center">
                    <img
                      src={c.mapsPhotoUrl || MAPS_LOCATION_SVG}
                      alt={c.mapsTitle || 'Foto Lokasi'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  <div className="flex-1 min-w-0 flex items-center gap-1">
                    <input
                      type="url"
                      value={c.mapsPhotoUrl?.startsWith('data:') ? '' : c.mapsPhotoUrl ?? ''}
                      placeholder={
                        c.mapsPhotoUrl?.startsWith('data:') &&
                        !c.mapsPhotoUrl?.startsWith('data:image/svg+xml')
                          ? 'Foto lokal terunggah'
                          : 'https://... (link foto)'
                      }
                      onChange={(e) =>
                        updateContent({
                          mapsPhotoUrl: e.target.value || MAPS_LOCATION_SVG,
                        })
                      }
                      className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                    />
                    <label
                      title="Upload foto lokasi"
                      className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 cursor-pointer shrink-0"
                    >
                      <Upload className="w-3 h-3 text-blue-600" />
                      <span>Upload</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleMapsPhotoUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-1">
                    Rasio Foto Lokasi
                  </label>
                  <div className="grid grid-cols-4 gap-1">
                    {(['16/9', '4/3', '4/5', '1/1'] as const).map((ratio) => {
                      const active = (c.mapsPhotoRatio ?? '16/9') === ratio;
                      return (
                        <button
                          key={ratio}
                          type="button"
                          onClick={() => updateContent({ mapsPhotoRatio: ratio })}
                          className={`py-1 rounded text-[11px] font-semibold border transition-colors cursor-pointer ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {ratio.replace('/', ':')}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                    Teks Badge Foto (kosongkan jika tidak perlu)
                  </label>
                  <input
                    type="text"
                    value={c.mapsPhotoBadgeLabel ?? 'Lihat foto'}
                    placeholder="Lihat foto"
                    onChange={(e) => updateContent({ mapsPhotoBadgeLabel: e.target.value })}
                    className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Nama Lokasi */}
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">
                  Nama Tempat / Lokasi
                </label>
                <input
                  type="text"
                  value={c.mapsTitle ?? ''}
                  placeholder="Diksar Satpam"
                  onChange={(e) => updateContent({ mapsTitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                />
              </div>

              {/* Rating Bintang & Ulasan */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Rating Bintang (0–5)
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
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none tabular-nums"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
                    Jumlah Ulasan
                  </label>
                  <input
                    type="text"
                    value={c.mapsReviewCount ?? ''}
                    placeholder="1.643"
                    onChange={(e) => updateContent({ mapsReviewCount: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none tabular-nums"
                  />
                </div>
              </div>

              {/* Layanan & Aksesibilitas */}
              <div className="space-y-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <div>
                  <label className="block text-[11px] font-semibold text-slate-700 mb-1">
                    Kategori / Layanan Utama
                  </label>
                  <input
                    type="text"
                    value={c.mapsService ?? ''}
                    placeholder="Layanan Satpam"
                    onChange={(e) => updateContent({ mapsService: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white focus:border-blue-500 outline-none"
                  />
                </div>

                <div className="flex items-center justify-between pt-0.5">
                  <span className="text-[11px] font-medium text-slate-600">
                    Ikon Aksesibilitas (Kursi Roda)
                  </span>
                  <ToggleSwitch
                    checked={c.mapsAccessible ?? true}
                    onChange={(next) => updateContent({ mapsAccessible: next })}
                    label="Ikon Aksesibilitas"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                    Daftar Layanan Tambahan (pisahkan dengan koma)
                  </label>
                  <input
                    type="text"
                    value={c.mapsServicesList ?? ''}
                    placeholder="Contoh: Konsultasi Gratis, Buka 24 Jam, Parkir Luas"
                    onChange={(e) => updateContent({ mapsServicesList: e.target.value })}
                    className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                    Alamat / Jam Operasional (Opsional)
                  </label>
                  <input
                    type="text"
                    value={c.mapsAddress ?? ''}
                    placeholder="Jl. Merdeka No. 10, Jakarta · Buka 08.00–17.00"
                    onChange={(e) => updateContent({ mapsAddress: e.target.value })}
                    className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              {/* Link Google Maps */}
              <div className="space-y-2 p-2.5 rounded-lg bg-slate-50 border border-slate-200">
                <label className="block text-[11px] font-semibold text-slate-700">
                  Link Google Maps (Opsional)
                </label>
                <input
                  type="url"
                  value={c.mapsUrl ?? ''}
                  placeholder="https://maps.google.com/..."
                  onChange={(e) => updateContent({ mapsUrl: e.target.value })}
                  className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                />
                <div>
                  <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                    Label Tombol Maps
                  </label>
                  <input
                    type="text"
                    value={c.mapsButtonLabel ?? 'Buka di Google Maps'}
                    placeholder="Buka di Google Maps"
                    onChange={(e) => updateContent({ mapsButtonLabel: e.target.value })}
                    className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                  />
                </div>
              </div>
            </div>
          )}

          {selectedBlock.type === 'training_catalog' && (() => {
            const programs = c.trainingPrograms ?? [];
            const customBoxes = c.trainingCustomBoxes ?? [];
            const mediaList = c.trainingMedia ?? [];
            const checklistItems = c.trainingChecklistItems ?? [];
            const formFields = resolveTrainingFormFields(c);

            const updateProgram = (id: string, patch: Partial<TrainingProgramItem>) => {
              updateContent({
                trainingPrograms: programs.map((p) => (p.id === id ? { ...p, ...patch } : p)),
              });
            };
            const updateCustomBox = (id: string, patch: Partial<TrainingCustomBox>) => {
              updateContent({
                trainingCustomBoxes: customBoxes.map((b) => (b.id === id ? { ...b, ...patch } : b)),
              });
            };
            const moveCustomBox = (index: number, delta: -1 | 1) => {
              const targetIdx = index + delta;
              if (targetIdx < 0 || targetIdx >= customBoxes.length) return;
              const next = [...customBoxes];
              const [moved] = next.splice(index, 1);
              next.splice(targetIdx, 0, moved);
              updateContent({ trainingCustomBoxes: next });
            };
            const updateMedia = (id: string, patch: Partial<TrainingMediaItem>) => {
              updateContent({
                trainingMedia: mediaList.map((m) => (m.id === id ? { ...m, ...patch } : m)),
              });
            };

            return (
              <div className="space-y-3.5">
                {/* Kotak 1: Ringkasan Card Utama, Selengkapnya & WA */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
                  <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
                    <GraduationCap className="w-3.5 h-3.5 text-emerald-600" />
                    <h4 className="text-[13px] font-bold text-slate-900">
                      Ringkasan Card Utama &amp; WA
                    </h4>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Nama Pelatihan
                    </label>
                    <input
                      type="text"
                      value={c.trainingHeading ?? ''}
                      placeholder="Dikssar Satpam Gada Pratama"
                      onChange={(e) => updateContent({ trainingHeading: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white outline-none focus:border-emerald-500"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Angkatan Pelatihan
                      </label>
                      <input
                        type="text"
                        value={c.trainingBatch ?? ''}
                        placeholder="Angkatan 200"
                        onChange={(e) => updateContent({ trainingBatch: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Tanggal / Jadwal Pelatihan
                      </label>
                      <input
                        type="text"
                        value={c.trainingSchedule ?? ''}
                        placeholder="17 Agustus - 24 Agustus 2026"
                        onChange={(e) => updateContent({ trainingSchedule: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Deskripsi Singkat (Tampil di Card Utama)
                    </label>
                    <textarea
                      rows={2}
                      value={c.trainingSubheading ?? ''}
                      placeholder="Deskripsi singkat pelatihan..."
                      onChange={(e) => updateContent({ trainingSubheading: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white outline-none focus:border-emerald-500 resize-y"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Label Tombol Buka
                      </label>
                      <input
                        type="text"
                        value={c.trainingExpandLabel ?? 'Selengkapnya'}
                        placeholder="Selengkapnya"
                        onChange={(e) => updateContent({ trainingExpandLabel: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white outline-none focus:border-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Label Tombol Tutup
                      </label>
                      <input
                        type="text"
                        value={c.trainingCollapseLabel ?? 'Tutup Detail'}
                        placeholder="Tutup Detail"
                        onChange={(e) => updateContent({ trainingCollapseLabel: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <label className="flex items-center gap-2 p-2 rounded-lg bg-slate-50 border border-slate-200 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={Boolean(c.trainingDefaultExpanded)}
                      onChange={(e) =>
                        updateContent({ trainingDefaultExpanded: e.target.checked })
                      }
                      className="accent-emerald-600 cursor-pointer"
                    />
                    <span className="text-[11px] font-medium text-slate-700">
                      Buka wadah &ldquo;Selengkapnya&rdquo; secara default
                    </span>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        No. WhatsApp
                      </label>
                      <input
                        type="text"
                        value={c.trainingWaNumber ?? '6281234567890'}
                        placeholder="6281234567890"
                        onChange={(e) => updateContent({ trainingWaNumber: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white outline-none focus:border-emerald-500 tabular-nums"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-slate-700 mb-1">
                        Label Tombol WA
                      </label>
                      <input
                        type="text"
                        value={c.trainingWaButtonLabel ?? 'Konsultasi via WhatsApp'}
                        placeholder="Konsultasi via WhatsApp"
                        onChange={(e) => updateContent({ trainingWaButtonLabel: e.target.value })}
                        className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1">
                      Pesan Pembuka WA
                    </label>
                    <input
                      type="text"
                      value={c.trainingWaIntro ?? ''}
                      placeholder="Halo, saya ingin konsultasi mengenai program pelatihan berikut:"
                      onChange={(e) => updateContent({ trainingWaIntro: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs text-slate-800 rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white outline-none focus:border-emerald-500"
                    />
                  </div>
                </div>

                {/* Kotak 2: Program Pelatihan (Promo, Harga & Rich Deskripsi) */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <h4 className="text-[13px] font-bold text-slate-900">
                      Program, Promo &amp; Biaya ({programs.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        updateContent({
                          trainingPrograms: [
                            ...programs,
                            {
                              id: createId('trp'),
                              badge: 'Program Baru',
                              title: `Program Pelatihan #${programs.length + 1}`,
                              subtitle: 'Penjelasan singkat program',
                              description: '<div>Tuliskan deskripsi lengkap, materi, dan fasilitas pelatihan.</div>',
                              originalPrice: 'Rp 1.500.000',
                              price: 'Rp 1.150.000',
                              discountLabel: 'Potongan Rp 350.000',
                              cashbackLabel: 'Cashback Rp 100.000',
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah</span>
                    </button>
                  </div>

                  <div className="space-y-2.5">
                    {programs.map((prog, pIdx) => (
                      <div
                        key={prog.id}
                        className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-700">
                            Program #{pIdx + 1}
                          </span>
                          {programs.length > 1 && (
                            <button
                              type="button"
                              onClick={() =>
                                updateContent({
                                  trainingPrograms: programs.filter((p) => p.id !== prog.id),
                                })
                              }
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            value={prog.title}
                            placeholder="Nama program"
                            onChange={(e) => updateProgram(prog.id, { title: e.target.value })}
                            className="col-span-2 px-2 py-1 text-xs font-semibold rounded border border-slate-200 bg-white outline-none focus:border-emerald-500"
                          />
                          <input
                            type="text"
                            value={prog.badge ?? ''}
                            placeholder="Badge (opsional)"
                            onChange={(e) => updateProgram(prog.id, { badge: e.target.value })}
                            className="px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-emerald-500"
                          />
                          <input
                            type="text"
                            value={prog.subtitle ?? ''}
                            placeholder="Sub-judul singkat"
                            onChange={(e) => updateProgram(prog.id, { subtitle: e.target.value })}
                            className="px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-emerald-500"
                          />
                        </div>
                        <RichTextEditor
                          value={prog.description}
                          placeholder="Deskripsi lengkap program... Blok kata untuk atur Bold, Miring, atau Warna Teks."
                          onChangeHtml={(html) => updateProgram(prog.id, { description: html })}
                          showStyleControls={false}
                        />
                        <div className="grid grid-cols-2 gap-1.5">
                          <input
                            type="text"
                            value={prog.originalPrice ?? ''}
                            placeholder="Harga Coret (opsional)"
                            onChange={(e) =>
                              updateProgram(prog.id, { originalPrice: e.target.value })
                            }
                            className="px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-emerald-500 tabular-nums"
                          />
                          <input
                            type="text"
                            value={prog.price}
                            placeholder="Biaya Pelatihan (mis. Rp 1.850.000)"
                            onChange={(e) => updateProgram(prog.id, { price: e.target.value })}
                            className="px-2 py-1 text-[11px] font-semibold rounded border border-slate-200 bg-white outline-none focus:border-emerald-500 tabular-nums"
                          />
                          <input
                            type="text"
                            value={prog.discountLabel ?? ''}
                            placeholder="Potongan (mis. Potongan Rp 650.000)"
                            onChange={(e) =>
                              updateProgram(prog.id, { discountLabel: e.target.value })
                            }
                            className="px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-emerald-500"
                          />
                          <input
                            type="text"
                            value={prog.cashbackLabel ?? ''}
                            placeholder="Cashback (mis. Cashback Rp 150.000)"
                            onChange={(e) =>
                              updateProgram(prog.id, { cashbackLabel: e.target.value })
                            }
                            className="px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-emerald-500"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kotak 3: Box Tambahan di Wadah Selengkapnya */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <h4 className="text-[13px] font-bold text-slate-900">
                      Box Deskripsi &amp; Konten ({customBoxes.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        updateContent({
                          trainingCustomBoxes: [
                            ...customBoxes,
                            {
                              id: createId('trb'),
                              title: `Box Informasi #${customBoxes.length + 1}`,
                              contentHtml:
                                '<div>Tulis informasi materi, fasilitas, atau keterangan tambahan di sini.</div>',
                              defaultFontWeight: 'normal',
                              defaultFontStyle: 'normal',
                              textColor: '',
                              lineHeight: 1.6,
                              paragraphGap: 6,
                              showBorder: true,
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah Box Baru</span>
                    </button>
                  </div>

                  {customBoxes.length === 0 ? (
                    <p className="text-[11px] text-slate-500 leading-relaxed">
                      Belum ada box tambahan. Klik <strong>+ Tambah Box Baru</strong> untuk membuat box deskripsi, materi, atau catatan yang tampil saat &ldquo;Selengkapnya&rdquo; dibuka.
                    </p>
                  ) : (
                    <div className="space-y-2.5">
                      {customBoxes.map((box, bIdx) => (
                        <div
                          key={box.id}
                          className="p-2.5 rounded-xl bg-slate-50 border border-slate-200 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-1.5">
                            <span className="text-[11px] font-bold text-slate-700">
                              Box #{bIdx + 1}
                            </span>
                            <div className="flex items-center gap-1">
                              <label className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] font-medium text-slate-600 cursor-pointer">
                                <input
                                  type="checkbox"
                                  checked={box.showBorder !== false}
                                  onChange={(e) =>
                                    updateCustomBox(box.id, { showBorder: e.target.checked })
                                  }
                                  className="accent-emerald-600 cursor-pointer"
                                />
                                <span>Bingkai</span>
                              </label>
                              <button
                                type="button"
                                title="Naik"
                                disabled={bIdx === 0}
                                onClick={() => moveCustomBox(bIdx, -1)}
                                className="p-1 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-35 cursor-pointer"
                              >
                                <ArrowUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                title="Turun"
                                disabled={bIdx === customBoxes.length - 1}
                                onClick={() => moveCustomBox(bIdx, 1)}
                                className="p-1 rounded text-slate-500 hover:bg-slate-200 disabled:opacity-35 cursor-pointer"
                              >
                                <ArrowDown className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                title="Hapus box"
                                onClick={() =>
                                  updateContent({
                                    trainingCustomBoxes: customBoxes.filter((b) => b.id !== box.id),
                                  })
                                }
                                className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <input
                            type="text"
                            value={box.title ?? ''}
                            placeholder="Judul Box (opsional, mis. Materi & Fasilitas)"
                            onChange={(e) => updateCustomBox(box.id, { title: e.target.value })}
                            className="w-full px-2 py-1 text-xs font-semibold rounded border border-slate-200 bg-white outline-none focus:border-emerald-500"
                          />

                          <RichTextEditor
                            value={box.contentHtml}
                            placeholder="Tulis isi box di sini... Blok kata untuk Bold, Biasa, Miring, atau ganti warna teks."
                            defaultFontWeight={box.defaultFontWeight ?? 'normal'}
                            defaultFontStyle={box.defaultFontStyle ?? 'normal'}
                            textColor={box.textColor ?? ''}
                            lineHeight={box.lineHeight ?? 1.6}
                            paragraphGap={box.paragraphGap ?? 6}
                            onChangeHtml={(html) =>
                              updateCustomBox(box.id, { contentHtml: html })
                            }
                            onChangeStyle={(patch) => updateCustomBox(box.id, patch)}
                            showStyleControls
                          />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Kotak 4: Foto Pelatihan */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <h4 className="text-[13px] font-bold text-slate-900">
                      Foto ({mediaList.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        updateContent({
                          trainingMedia: [
                            ...mediaList,
                            {
                              id: createId('trm'),
                              type: 'image',
                              imageUrl: CAROUSEL_SAMPLE_1_SVG,
                              caption: 'Dokumentasi kegiatan pelatihan.',
                              linkUrl: '',
                              linkLabel: '',
                            },
                          ],
                        })
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah</span>
                    </button>
                  </div>

                  <div className="grid grid-cols-4 gap-1">
                    {(['16/9', '4/3', '4/5', '1/1'] as CarouselAspectRatio[]).map((r) => (
                      <button
                        key={r}
                        type="button"
                        onClick={() => updateContent({ trainingMediaRatio: r })}
                        className={`py-1 rounded text-[11px] font-semibold border cursor-pointer ${
                          (c.trainingMediaRatio ?? '16/9') === r
                            ? 'bg-emerald-600 text-white border-emerald-600'
                            : 'bg-slate-50 text-slate-600 border-slate-200'
                        }`}
                      >
                        {r.replace('/', ':')}
                      </button>
                    ))}
                  </div>

                  <div className="space-y-2">
                    {mediaList.map((media, mIdx) => (
                      <div
                        key={media.id}
                        className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5"
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-[11px] font-bold text-slate-700">
                            Foto #{mIdx + 1}
                          </span>
                          <button
                            type="button"
                            onClick={() =>
                              updateContent({
                                trainingMedia: mediaList.filter((m) => m.id !== media.id),
                              })
                            }
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <label className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 cursor-pointer shrink-0">
                            <Upload className="w-3 h-3" />
                            <span>Unggah</span>
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) => handleTrainingMediaUpload(media.id, e)}
                              className="hidden"
                            />
                          </label>
                          <input
                            type="text"
                            value={media.imageUrl}
                            placeholder="Atau URL foto"
                            onChange={(e) =>
                              updateMedia(media.id, { imageUrl: e.target.value })
                            }
                            className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-emerald-500"
                          />
                        </div>
                        <input
                          type="text"
                          value={media.caption}
                          placeholder="Keterangan foto (opsional)"
                          onChange={(e) => updateMedia(media.id, { caption: e.target.value })}
                          className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-emerald-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kotak 4: Checklist Syarat Berkas */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <h4 className="text-[13px] font-bold text-slate-900">
                      Checklist Syarat Berkas ({checklistItems.length})
                    </h4>
                    <button
                      type="button"
                      onClick={() =>
                        updateContent({
                          trainingChecklistItems: [...checklistItems, 'Syarat berkas baru'],
                        })
                      }
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Tambah</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={c.trainingChecklistTitle ?? 'Checklist Syarat Berkas'}
                    placeholder="Judul syarat berkas"
                    onChange={(e) => updateContent({ trainingChecklistTitle: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white outline-none focus:border-emerald-500"
                  />
                  <div className="space-y-1.5">
                    {checklistItems.map((txt, idx) => (
                      <div key={`trn_chk_${idx}`} className="flex items-center gap-1.5">
                        <span className="text-[11px] font-bold text-slate-400 w-4 shrink-0 tabular-nums">
                          {idx + 1}.
                        </span>
                        <input
                          type="text"
                          value={txt}
                          placeholder="Nama berkas (mis. Fotokopi KTP)"
                          onChange={(e) => {
                            const next = [...checklistItems];
                            next[idx] = e.target.value;
                            updateContent({ trainingChecklistItems: next });
                          }}
                          className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded border border-slate-200 bg-slate-50 focus:bg-white outline-none focus:border-emerald-500"
                        />
                        <button
                          type="button"
                          onClick={() =>
                            updateContent({
                              trainingChecklistItems: checklistItems.filter((_, i) => i !== idx),
                            })
                          }
                          className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Kotak 5: Formulir Pendaftaran Dinamis */}
                <div className="p-3 rounded-xl border border-slate-200 bg-white shadow-2xs space-y-2.5">
                  <div className="flex items-center justify-between gap-2 pb-2 border-b border-slate-100">
                    <h4 className="text-[13px] font-bold text-slate-900">
                      Formulir ({formFields.length} Kolom)
                    </h4>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() =>
                          updateContent({ trainingFormFields: getDefaultTrainingFormFields() })
                        }
                        className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-slate-500 hover:text-emerald-700 cursor-pointer"
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
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Tambah Kolom</span>
                      </button>
                    </div>
                  </div>
                  <input
                    type="text"
                    value={c.trainingFormTitle ?? 'Formulir Pendaftaran / Konsultasi'}
                    placeholder="Judul formulir"
                    onChange={(e) => updateContent({ trainingFormTitle: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs font-semibold rounded-lg border border-slate-200 bg-slate-50/50 focus:bg-white outline-none focus:border-emerald-500"
                  />
                  <div className="space-y-1.5">
                    {formFields.map((field, fIdx) => (
                      <div
                        key={field.id}
                        className="p-2 rounded-lg bg-slate-50 border border-slate-200 space-y-1.5"
                      >
                        <div className="flex items-center gap-1.5">
                          <input
                            type="text"
                            value={field.label}
                            placeholder="Label kolom"
                            onChange={(e) =>
                              updateContent({
                                trainingFormFields: formFields.map((it, i) =>
                                  i === fIdx ? { ...it, label: e.target.value } : it
                                ),
                              })
                            }
                            className="flex-1 min-w-0 px-2 py-1 text-[11px] font-semibold rounded border border-slate-200 bg-white outline-none focus:border-emerald-500"
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
                            className="px-1.5 py-1 text-[10.5px] rounded border border-slate-200 bg-white outline-none focus:border-emerald-500"
                          >
                            <option value="text">Teks</option>
                            <option value="tel">No. WA</option>
                            <option value="email">Email</option>
                            <option value="textarea">Paragraf</option>
                            <option value="number">Angka</option>
                          </select>
                          <button
                            type="button"
                            title="Hapus kolom"
                            onClick={() =>
                              updateContent({
                                trainingFormFields: formFields.filter((_, i) => i !== fIdx),
                              })
                            }
                            className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <input
                          type="text"
                          value={field.placeholder}
                          placeholder="Placeholder kolom"
                          onChange={(e) =>
                            updateContent({
                              trainingFormFields: formFields.map((it, i) =>
                                i === fIdx ? { ...it, placeholder: e.target.value } : it
                              ),
                            })
                          }
                          className="w-full px-2 py-1 text-[10.5px] text-slate-600 rounded border border-slate-200 bg-white outline-none focus:border-emerald-500"
                        />
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            );
          })()}

          {selectedBlock.type === 'text' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Isi Teks</label>
                <textarea
                  rows={3}
                  value={c.text ?? ''}
                  placeholder="Tulis teks (kosongkan jika tidak digunakan)"
                  onChange={(e) => updateContent({ text: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none resize-y"
                />
                {!(c.text ?? '').trim() && (
                  <p className="mt-1 text-[11px] text-slate-400">
                    Teks kosong otomatis disembunyikan di pratinjau &amp; hasil halaman.
                  </p>
                )}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ukuran</label>
                  <select
                    value={c.variant ?? 'body'}
                    onChange={(e) =>
                      updateContent({ variant: e.target.value as 'h1' | 'h2' | 'body' })
                    }
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none"
                  >
                    <option value="h1">Judul Besar</option>
                    <option value="h2">Subjudul</option>
                    <option value="body">Paragraf</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Ketebalan</label>
                  <select
                    value={c.fontWeight ?? 'normal'}
                    onChange={(e) =>
                      updateContent({ fontWeight: e.target.value as 'normal' | 'semibold' | 'bold' })
                    }
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none"
                  >
                    <option value="normal">Normal</option>
                    <option value="semibold">Semi Tebal</option>
                    <option value="bold">Tebal</option>
                  </select>
                </div>
              </div>
            </>
          )}

          {selectedBlock.type === 'button' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Teks Tombol</label>
                <input
                  type="text"
                  value={c.label ?? ''}
                  onChange={(e) => updateContent({ label: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">URL Tujuan</label>
                <input
                  type="url"
                  value={c.url ?? ''}
                  placeholder="https://..."
                  onChange={(e) => updateContent({ url: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Warna Tombol</label>
                  <input
                    type="color"
                    value={c.buttonBg ?? '#2563EB'}
                    onChange={(e) => updateContent({ buttonBg: e.target.value })}
                    className="w-full h-8 rounded-lg border border-slate-200 p-0.5 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Warna Teks</label>
                  <input
                    type="color"
                    value={c.buttonText ?? '#FFFFFF'}
                    onChange={(e) => updateContent({ buttonText: e.target.value })}
                    className="w-full h-8 rounded-lg border border-slate-200 p-0.5 cursor-pointer"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1.5">
                  Ikon Sebelah Kiri Tombol
                </label>
                <IconPicker
                  selectedIcon={resolveButtonIcon(c.buttonIcon, c.label)}
                  iconUrl={c.buttonIconUrl ?? ''}
                  allowNone
                  accentVariant="blue"
                  onSelectIcon={(icon) => updateContent({ buttonIcon: icon })}
                  onChangeIconUrl={(buttonIconUrl) => updateContent({ buttonIconUrl })}
                />
              </div>
            </>
          )}

          {selectedBlock.type === 'image' && (() => {
            const isCircle = c.imageShape === 'circle';
            const circleSize = c.circleSize ?? 112;
            const imageZoom = c.imageZoom ?? 100;
            return (
              <>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Unggah Gambar</label>
                  <label className="flex items-center justify-center gap-1.5 w-full py-2 px-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 hover:bg-slate-100 text-xs font-medium text-slate-700 cursor-pointer transition-colors">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Pilih File Gambar</span>
                    <input type="file" accept="image/*" onChange={handleImageUpload} className="hidden" />
                  </label>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Atau URL Gambar</label>
                  <input
                    type="text"
                    value={c.src ?? ''}
                    onChange={(e) => updateContent({ src: e.target.value })}
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">Bentuk Foto</label>
                  <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg">
                    <button
                      type="button"
                      onClick={() => updateContent({ imageShape: 'rect' })}
                      className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        !isCircle
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Kotak / Banner
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateContent({
                          imageShape: 'circle',
                          aspectRatio: '1/1',
                          objectFit: c.objectFit ?? 'cover',
                          circleSize,
                          imageZoom,
                        })
                      }
                      className={`py-1.5 px-2 rounded-md text-xs font-semibold transition-colors cursor-pointer ${
                        isCircle
                          ? 'bg-white text-emerald-700 shadow-xs'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      Bulat (Lingkaran)
                    </button>
                  </div>
                </div>

                {isCircle && (
                  <div className="p-3 rounded-xl bg-[#EFF7F4]/80 border border-emerald-200/80 space-y-3">
                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">Ukuran Lingkaran</span>
                        <span className="font-semibold text-emerald-700 tabular-nums">
                          {circleSize}px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={48}
                        max={240}
                        step={2}
                        value={circleSize}
                        onChange={(e) =>
                          updateContent({ circleSize: Number(e.target.value) })
                        }
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                    </div>

                    <div>
                      <div className="flex items-center justify-between text-xs mb-1">
                        <span className="font-medium text-slate-700">
                          Besar Foto di Dalam Lingkaran
                        </span>
                        <div className="flex items-center gap-1.5">
                          {imageZoom !== 100 && (
                            <button
                              type="button"
                              onClick={() => updateContent({ imageZoom: 100 })}
                              className="px-1.5 py-0.5 rounded bg-white border border-emerald-200 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                            >
                              100%
                            </button>
                          )}
                          <span className="font-semibold text-emerald-700 tabular-nums">
                            {imageZoom}%
                          </span>
                        </div>
                      </div>
                      <input
                        type="range"
                        min={50}
                        max={220}
                        step={5}
                        value={imageZoom}
                        onChange={(e) =>
                          updateContent({ imageZoom: Number(e.target.value) })
                        }
                        className="w-full accent-emerald-600 cursor-pointer"
                      />
                    </div>

                    <button
                      type="button"
                      onClick={() => setInspectorTab('appearance')}
                      className="w-full py-1.5 px-2.5 rounded-lg bg-white border border-emerald-200 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                    >
                      Atur Outline, Warna &amp; Shadow di Tab Tampilan →
                    </button>
                  </div>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {!isCircle && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">Rasio</label>
                      <select
                        value={c.aspectRatio ?? '16/9'}
                        onChange={(e) =>
                          updateContent({
                            aspectRatio: e.target.value as 'auto' | '16/9' | '4/3' | '1/1',
                          })
                        }
                        className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none"
                      >
                        <option value="auto">Otomatis</option>
                        <option value="16/9">16:9</option>
                        <option value="4/3">4:3</option>
                        <option value="1/1">1:1 Kotak</option>
                      </select>
                    </div>
                  )}
                  <div className={isCircle ? 'col-span-2' : ''}>
                    <label className="block text-xs font-medium text-slate-600 mb-1">Penyesuaian</label>
                    <select
                      value={c.objectFit ?? 'cover'}
                      onChange={(e) =>
                        updateContent({ objectFit: e.target.value as 'cover' | 'contain' })
                      }
                      className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none"
                    >
                      <option value="cover">Penuhi (Cover)</option>
                      <option value="contain">Utuh (Contain)</option>
                    </select>
                  </div>
                </div>
              </>
            );
          })()}

          {selectedBlock.type === 'form' && (
            <>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Judul Form</label>
                <input
                  type="text"
                  value={c.formTitle ?? ''}
                  onChange={(e) => updateContent({ formTitle: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Label Tombol Kirim</label>
                <input
                  type="text"
                  value={c.submitLabel ?? ''}
                  onChange={(e) => updateContent({ submitLabel: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Warna Tombol Form</label>
                <input
                  type="color"
                  value={c.buttonColor ?? '#2563EB'}
                  onChange={(e) => updateContent({ buttonColor: e.target.value })}
                  className="w-full h-8 rounded-lg border border-slate-200 p-0.5 cursor-pointer"
                />
              </div>
            </>
          )}

          {(selectedBlock.type === 'youtube' ||
            selectedBlock.type === 'facebook_video' ||
            selectedBlock.type === 'tiktok_video' ||
            selectedBlock.type === 'instagram_video') && (() => {
            const isYt = selectedBlock.type === 'youtube';
            const isFb = selectedBlock.type === 'facebook_video';
            const isIg = selectedBlock.type === 'instagram_video';
            const currentUrl = isYt ? c.youtubeUrl ?? '' : c.videoUrl ?? '';
            const currentRatio =
              c.videoAspectRatio ??
              c.youtubeAspectRatio ??
              (selectedBlock.type === 'tiktok_video' || isIg ? '9/16' : '16/9');
            const currentAuto = c.videoAutoplay ?? c.youtubeAutoplay ?? true;
            const currentVol = c.videoVolume ?? c.youtubeVolume ?? 75;

            return (
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">
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
                    placeholder={
                      isYt
                        ? 'https://www.youtube.com/watch?v=...'
                        : isFb
                        ? 'https://www.facebook.com/... atau fb.watch/...'
                        : isIg
                        ? 'https://www.instagram.com/reel/...'
                        : 'https://www.tiktok.com/... atau vt.tiktok.com/...'
                    }
                    onChange={(e) =>
                      updateContent(
                        isYt ? { youtubeUrl: e.target.value } : { videoUrl: e.target.value }
                      )
                    }
                    className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                  />
                </div>

                {!isYt && (
                  <div>
                    <label className="block text-xs font-medium text-slate-600 mb-1">
                      URL Gambar Sampul (Opsional)
                    </label>
                    <input
                      type="url"
                      value={c.videoPoster ?? ''}
                      placeholder="https://... (kosongkan untuk sampul bawaan)"
                      onChange={(e) => updateContent({ videoPoster: e.target.value })}
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 focus:border-blue-500 outline-none"
                    />
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Ukuran / Rasio Embed
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {(
                      [
                        { id: '1/1', label: '1:1' },
                        { id: '4/5', label: '4:5' },
                        { id: '9/16', label: '9:16' },
                        { id: '16/9', label: '16:9' },
                      ] as const
                    ).map((opt) => {
                      const active = currentRatio === opt.id;
                      return (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() =>
                            updateContent(
                              isYt
                                ? { youtubeAspectRatio: opt.id, videoAspectRatio: opt.id }
                                : { videoAspectRatio: opt.id }
                            )
                          }
                          className={`py-1.5 px-2 rounded-lg text-xs font-semibold border transition-colors cursor-pointer tabular-nums ${
                            active
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-slate-300'
                          }`}
                        >
                          {opt.label}
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex items-center justify-between gap-3 pt-1">
                  <span className="text-xs font-medium text-slate-700">Auto Play Video</span>
                  <ToggleSwitch
                    checked={currentAuto}
                    onChange={(checked) =>
                      updateContent(
                        isYt
                          ? { youtubeAutoplay: checked, videoAutoplay: checked }
                          : { videoAutoplay: checked }
                      )
                    }
                    label="Auto Play Video"
                  />
                </div>

                <SliderRow
                  label="Volume Audio"
                  value={`${currentVol}%`}
                  min={0}
                  max={100}
                  current={currentVol}
                  onChange={(val) =>
                    updateContent(
                      isYt
                        ? { youtubeVolume: val, videoVolume: val }
                        : { videoVolume: val }
                    )
                  }
                />
              </div>
            );
          })()}

          {selectedBlock.type === 'divider' && (
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Gaya Garis</label>
                <select
                  value={c.lineStyle ?? 'solid'}
                  onChange={(e) =>
                    updateContent({ lineStyle: e.target.value as 'solid' | 'dashed' | 'dotted' })
                  }
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none"
                >
                  <option value="solid">Lurus</option>
                  <option value="dashed">Putus-putus</option>
                  <option value="dotted">Titik-titik</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-slate-600 mb-1">Warna Garis</label>
                <input
                  type="color"
                  value={c.lineColor ?? '#E2E8F0'}
                  onChange={(e) => updateContent({ lineColor: e.target.value })}
                  className="w-full h-8 rounded-lg border border-slate-200 p-0.5 cursor-pointer"
                />
              </div>
            </div>
          )}

          {selectedBlock.type === 'social' && (() => {
            const socialItems = c.socialItems ?? [];
            const visibleCount = socialItems.filter((item) => item.visible).length;

            return (
              <div className="space-y-3.5">
                {/* Tambah Ikon Sosial Media */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">
                      Daftar Ikon ({visibleCount}/{socialItems.length} tampil)
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={newSocialPlatform}
                      onChange={(e) => setNewSocialPlatform(e.target.value as SocialPlatform)}
                      className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-500"
                    >
                      {SOCIAL_PLATFORM_LIST.map((plat) => (
                        <option key={plat.id} value={plat.id}>
                          {plat.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAddSocialItem(newSocialPlatform)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shrink-0 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>
                </div>

                {/* Daftar Kartu Ikon */}
                <div className="space-y-2">
                  {socialItems.length === 0 ? (
                    <div className="py-4 px-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500">
                      Belum ada ikon sosial media. Pilih platform di atas lalu klik <strong>Tambah</strong>.
                    </div>
                  ) : (
                    socialItems.map((item) => {
                      const meta = SOCIAL_PLATFORMS[item.platform];
                      return (
                        <div
                          key={item.id}
                          draggable
                          onDragStart={(e) => {
                            const activeTag = document.activeElement?.tagName;
                            if (activeTag === 'INPUT' || activeTag === 'SELECT') {
                              e.preventDefault();
                              return;
                            }
                            e.dataTransfer.setData('application/lynk-social-item', item.id);
                            e.dataTransfer.effectAllowed = 'move';
                            setDragItemState({ draggedId: item.id, targetId: null });
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (dragItemState.targetId !== item.id) {
                              setDragItemState((prev) => ({ ...prev, targetId: item.id }));
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const draggedId = e.dataTransfer.getData('application/lynk-social-item');
                            if (draggedId && draggedId !== item.id) {
                              handleReorderSocialItem(draggedId, item.id);
                            }
                            setDragItemState({ draggedId: null, targetId: null });
                          }}
                          onDragEnd={() => setDragItemState({ draggedId: null, targetId: null })}
                          className={`p-2.5 rounded-lg border space-y-2 transition-colors ${
                            item.visible
                              ? 'bg-slate-50/70 border-slate-200'
                              : 'bg-slate-100/70 border-slate-200/80 opacity-75'
                          } ${dragItemState.draggedId === item.id ? 'opacity-45' : ''} ${
                            dragItemState.targetId === item.id && dragItemState.draggedId !== item.id
                              ? 'border-blue-500 ring-1 ring-blue-500/30'
                              : ''
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              title="Tarik untuk geser urutan ikon"
                              className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </span>

                            <span
                              style={{ backgroundColor: meta.brandColor }}
                              className="w-6 h-6 rounded-md text-white inline-flex items-center justify-center shrink-0"
                            >
                              <SocialGlyph platform={item.platform} className="w-3.5 h-3.5" />
                            </span>

                            <select
                              value={item.platform}
                              onChange={(e) => {
                                const nextPlatform = e.target.value as SocialPlatform;
                                const nextMeta = SOCIAL_PLATFORMS[nextPlatform];
                                const oldPlaceholder = meta.placeholderUrl;
                                handleUpdateSocialItem(item.id, {
                                  platform: nextPlatform,
                                  url:
                                    !item.url || item.url === oldPlaceholder
                                      ? nextMeta.placeholderUrl
                                      : item.url,
                                });
                              }}
                              className="flex-1 min-w-0 px-2 py-1 text-xs font-semibold rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                            >
                              {SOCIAL_PLATFORM_LIST.map((plat) => (
                                <option key={plat.id} value={plat.id}>
                                  {plat.label}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() =>
                                handleUpdateSocialItem(item.id, { visible: !item.visible })
                              }
                              title={item.visible ? 'Sembunyikan ikon' : 'Tampilkan ikon'}
                              className={`inline-flex items-center gap-1 px-1.5 py-1 rounded text-[11px] font-medium cursor-pointer shrink-0 transition-colors ${
                                item.visible
                                  ? 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                                  : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                              }`}
                            >
                              {item.visible ? (
                                <Eye className="w-3.5 h-3.5" />
                              ) : (
                                <EyeOff className="w-3.5 h-3.5" />
                              )}
                            </button>

                            <button
                              type="button"
                              onClick={() => handleDeleteSocialItem(item.id)}
                              title="Hapus ikon"
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <input
                            type="url"
                            value={item.url}
                            placeholder={meta.placeholderUrl}
                            onChange={(e) =>
                              handleUpdateSocialItem(item.id, { url: e.target.value })
                            }
                            className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                          />
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Gaya, Ukuran, Jarak & Warna Ikon */}
                <div className="pt-2 border-t border-slate-200 space-y-3">
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Gaya Ikon
                      </label>
                      <select
                        value={c.socialStyle ?? 'filled'}
                        onChange={(e) =>
                          updateContent({
                            socialStyle: e.target.value as 'filled' | 'outline' | 'minimal',
                          })
                        }
                        className="w-full px-2 py-1.5 text-[11px] rounded-lg border border-slate-200 bg-white outline-none"
                      >
                        <option value="filled">Isi</option>
                        <option value="outline">Garis</option>
                        <option value="minimal">Minimal</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-slate-600 mb-1">
                        Bentuk
                      </label>
                      <select
                        value={c.socialShape ?? 'circle'}
                        onChange={(e) =>
                          updateContent({
                            socialShape: e.target.value as 'circle' | 'rounded',
                          })
                        }
                        className="w-full px-2 py-1.5 text-[11px] rounded-lg border border-slate-200 bg-white outline-none"
                      >
                        <option value="circle">Bulat</option>
                        <option value="rounded">Kotak Tumpul</option>
                      </select>
                    </div>
                  </div>

                  {(() => {
                    const { boxSize, gap } = resolveSocialMetrics(c);
                    return (
                      <>
                        <SliderRow
                          label="Besar Ikon"
                          value={`${boxSize}px`}
                          min={24}
                          max={64}
                          current={boxSize}
                          onChange={(val) => updateContent({ socialIconSize: val })}
                        />
                        <SliderRow
                          label="Jarak Antar Ikon"
                          value={`${gap}px`}
                          min={0}
                          max={32}
                          current={gap}
                          onChange={(val) => updateContent({ socialGap: val })}
                        />
                      </>
                    );
                  })()}

                  <div className="flex items-center justify-between gap-3">
                    <span className="text-xs font-medium text-slate-700">
                      Gunakan Warna Brand Asli
                    </span>
                    <ToggleSwitch
                      checked={c.socialUseBrandColors ?? true}
                      onChange={(checked) => updateContent({ socialUseBrandColors: checked })}
                      label="Gunakan Warna Brand Asli"
                    />
                  </div>

                  {c.socialUseBrandColors === false && (
                    <div>
                      <label className="block text-xs font-medium text-slate-600 mb-1">
                        Warna Kustom Ikon
                      </label>
                      <input
                        type="color"
                        value={c.socialColor ?? '#2563EB'}
                        onChange={(e) => updateContent({ socialColor: e.target.value })}
                        className="w-full h-8 rounded-lg border border-slate-200 p-0.5 cursor-pointer"
                      />
                    </div>
                  )}
                </div>
              </div>
            );
          })()}

          {selectedBlock.type === 'social_follower' && (() => {
            const accounts = c.socialFollowerAccounts ?? [];
            const gap = c.socialFollowerGap ?? 10;

            return (
              <div className="space-y-3.5">
                {/* Tambah Akun Sosmed */}
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-600">
                      Akun Sosmed &amp; Follower ({accounts.length})
                    </span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <select
                      value={newSocialFollowerPlatform}
                      onChange={(e) =>
                        setNewSocialFollowerPlatform(e.target.value as SocialPlatform)
                      }
                      className="flex-1 min-w-0 px-2 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none focus:border-blue-500"
                    >
                      {SOCIAL_PLATFORM_LIST.map((plat) => (
                        <option key={plat.id} value={plat.id}>
                          {plat.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAddSocialFollowerAccount(newSocialFollowerPlatform)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-semibold cursor-pointer shrink-0 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Tambah</span>
                    </button>
                  </div>
                  <button
                    type="button"
                    onClick={handleAddPopularSocialFollowers}
                    className="w-full py-1.5 px-2.5 rounded-lg border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold cursor-pointer transition-colors"
                  >
                    + Tambah Cepat Sosmed Populer (IG, TikTok, FB, YT, X, dll)
                  </button>
                </div>

                {accounts.length > 1 && (
                  <SliderRow
                    label="Jarak Antar Kartu"
                    value={`${gap}px`}
                    min={0}
                    max={24}
                    current={gap}
                    onChange={(val) => updateContent({ socialFollowerGap: val })}
                  />
                )}

                {/* Daftar Kartu Akun */}
                <div className="space-y-2.5">
                  {accounts.length === 0 ? (
                    <div className="py-4 px-3 rounded-lg border border-dashed border-slate-300 bg-slate-50 text-center text-xs text-slate-500">
                      Belum ada akun sosial media. Pilih platform di atas lalu klik{' '}
                      <strong>Tambah</strong>.
                    </div>
                  ) : (
                    accounts.map((acc, idx) => {
                      const meta = SOCIAL_PLATFORMS[acc.platform] ?? SOCIAL_PLATFORMS.instagram;
                      return (
                        <div
                          key={acc.id}
                          draggable
                          onDragStart={(e) => {
                            const activeTag = document.activeElement?.tagName;
                            if (
                              activeTag === 'INPUT' ||
                              activeTag === 'TEXTAREA' ||
                              activeTag === 'SELECT'
                            ) {
                              e.preventDefault();
                              return;
                            }
                            e.dataTransfer.setData('application/lynk-sfol-item', acc.id);
                            e.dataTransfer.effectAllowed = 'move';
                            setDragItemState({ draggedId: acc.id, targetId: null });
                          }}
                          onDragOver={(e) => {
                            e.preventDefault();
                            if (dragItemState.targetId !== acc.id) {
                              setDragItemState((prev) => ({ ...prev, targetId: acc.id }));
                            }
                          }}
                          onDrop={(e) => {
                            e.preventDefault();
                            const draggedId = e.dataTransfer.getData('application/lynk-sfol-item');
                            if (draggedId && draggedId !== acc.id) {
                              handleReorderSocialFollowerAccount(draggedId, acc.id);
                            }
                            setDragItemState({ draggedId: null, targetId: null });
                          }}
                          onDragEnd={() => setDragItemState({ draggedId: null, targetId: null })}
                          className={`p-2.5 rounded-lg border bg-slate-50/80 space-y-2.5 transition-colors ${
                            dragItemState.draggedId === acc.id ? 'opacity-45' : ''
                          } ${
                            dragItemState.targetId === acc.id &&
                            dragItemState.draggedId !== acc.id
                              ? 'border-blue-500 ring-1 ring-blue-500/30'
                              : 'border-slate-200'
                          }`}
                        >
                          {/* Header Kartu: Drag, Ikon, Pilih Platform, Hapus */}
                          <div className="flex items-center gap-1.5">
                            <span
                              title="Tarik untuk geser urutan kartu"
                              className="text-slate-400 hover:text-slate-600 cursor-grab active:cursor-grabbing shrink-0"
                            >
                              <GripVertical className="w-3.5 h-3.5" />
                            </span>

                            <span
                              style={{ backgroundColor: meta.brandColor }}
                              className="w-6 h-6 rounded-md text-white inline-flex items-center justify-center shrink-0"
                            >
                              <SocialGlyph platform={acc.platform} className="w-3.5 h-3.5" />
                            </span>

                            <select
                              value={acc.platform}
                              onChange={(e) => {
                                const nextPlat = e.target.value as SocialPlatform;
                                const nextMeta = SOCIAL_PLATFORMS[nextPlat];
                                handleUpdateSocialFollowerAccount(acc.id, {
                                  platform: nextPlat,
                                  accountUrl:
                                    !acc.accountUrl || acc.accountUrl === meta.placeholderUrl
                                      ? nextMeta.placeholderUrl
                                      : acc.accountUrl,
                                });
                              }}
                              className="flex-1 min-w-0 px-2 py-1 text-xs font-semibold rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                            >
                              {SOCIAL_PLATFORM_LIST.map((plat) => (
                                <option key={plat.id} value={plat.id}>
                                  #{idx + 1} · {plat.label}
                                </option>
                              ))}
                            </select>

                            <button
                              type="button"
                              onClick={() => handleDeleteSocialFollowerAccount(acc.id)}
                              title="Hapus akun ini"
                              className="p-1 rounded text-slate-400 hover:text-red-600 hover:bg-red-50 cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          {/* Foto Profil */}
                          <div className="flex items-center gap-2">
                            <div
                              style={{ backgroundColor: meta.brandColor }}
                              className="w-9 h-9 rounded-full text-white overflow-hidden shrink-0 flex items-center justify-center border border-slate-200"
                            >
                              {acc.avatar ? (
                                <img
                                  src={acc.avatar}
                                  alt={acc.accountName || meta.label}
                                  className="w-full h-full object-cover"
                                />
                              ) : (
                                <SocialGlyph platform={acc.platform} className="w-4 h-4" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0 flex items-center gap-1">
                              <input
                                type="url"
                                value={acc.avatar?.startsWith('data:') ? '' : acc.avatar ?? ''}
                                placeholder={
                                  acc.avatar?.startsWith('data:')
                                    ? 'Foto profil terunggah'
                                    : 'URL Foto Profil (opsional)'
                                }
                                onChange={(e) =>
                                  handleUpdateSocialFollowerAccount(acc.id, {
                                    avatar: e.target.value,
                                  })
                                }
                                className="flex-1 min-w-0 px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                              />
                              <label className="inline-flex items-center gap-1 px-2 py-1 rounded border border-slate-200 bg-white hover:bg-slate-100 text-[11px] font-medium text-slate-700 cursor-pointer shrink-0">
                                <Upload className="w-3 h-3 text-blue-600" />
                                <span>Upload</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  onChange={(e) => handleSocialFollowerAvatarUpload(acc.id, e)}
                                  className="hidden"
                                />
                              </label>
                              {acc.avatar && (
                                <button
                                  type="button"
                                  title="Reset foto ke ikon platform"
                                  onClick={() =>
                                    handleUpdateSocialFollowerAccount(acc.id, { avatar: '' })
                                  }
                                  className="p-1 rounded border border-slate-200 bg-white text-slate-400 hover:text-red-600 cursor-pointer shrink-0"
                                >
                                  <X className="w-3 h-3" />
                                </button>
                              )}
                            </div>
                          </div>

                          {/* Nama & Handle */}
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                                Nama Akun
                              </label>
                              <input
                                type="text"
                                value={acc.accountName}
                                placeholder="Studio Kreatif Nusantara"
                                onChange={(e) =>
                                  handleUpdateSocialFollowerAccount(acc.id, {
                                    accountName: e.target.value,
                                  })
                                }
                                className="w-full px-2 py-1 text-xs font-semibold rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                                Username / Handle
                              </label>
                              <input
                                type="text"
                                value={acc.handle}
                                placeholder="@studiokreatif"
                                onChange={(e) =>
                                  handleUpdateSocialFollowerAccount(acc.id, {
                                    handle: e.target.value,
                                  })
                                }
                                className="w-full px-2 py-1 text-xs rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>

                          {/* Teks Tombol & Link Profil */}
                          <div className="grid grid-cols-2 gap-1.5">
                            <div>
                              <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                                Teks Tombol
                              </label>
                              <input
                                type="text"
                                value={acc.followLabel ?? 'Ikuti'}
                                placeholder="Ikuti"
                                onChange={(e) =>
                                  handleUpdateSocialFollowerAccount(acc.id, {
                                    followLabel: e.target.value,
                                  })
                                }
                                className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                              />
                            </div>
                            <div>
                              <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                                Link Profil Akun
                              </label>
                              <input
                                type="url"
                                value={acc.accountUrl ?? ''}
                                placeholder={meta.placeholderUrl}
                                onChange={(e) =>
                                  handleUpdateSocialFollowerAccount(acc.id, {
                                    accountUrl: e.target.value,
                                  })
                                }
                                className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500"
                              />
                            </div>
                          </div>

                          {/* Centang Verifikasi */}
                          <div className="flex items-center justify-between gap-2 pt-0.5">
                            <span className="text-[11px] font-medium text-slate-700">
                              Centang Verifikasi Akun
                            </span>
                            <ToggleSwitch
                              checked={acc.verified ?? true}
                              onChange={(checked) =>
                                handleUpdateSocialFollowerAccount(acc.id, { verified: checked })
                              }
                              label="Centang Verifikasi Akun"
                            />
                          </div>

                          {/* 3 Statistik (Angka + Label Opsional) */}
                          <div className="p-2 rounded-lg bg-white border border-slate-200 space-y-1.5">
                            <div className="text-[10px] font-semibold text-slate-500">
                              Statistik &amp; Follower (kosongkan angka untuk sembunyikan)
                            </div>
                            <div className="grid grid-cols-3 gap-1.5">
                              <div className="space-y-1">
                                <input
                                  type="text"
                                  value={acc.postsCount ?? ''}
                                  placeholder="128"
                                  onChange={(e) =>
                                    handleUpdateSocialFollowerAccount(acc.id, {
                                      postsCount: e.target.value,
                                    })
                                  }
                                  className="w-full px-1.5 py-1 text-[11px] font-bold rounded border border-slate-200 bg-slate-50 outline-none focus:border-blue-500 tabular-nums text-center"
                                />
                                <input
                                  type="text"
                                  value={acc.postsLabel ?? 'Postingan'}
                                  placeholder="Postingan"
                                  onChange={(e) =>
                                    handleUpdateSocialFollowerAccount(acc.id, {
                                      postsLabel: e.target.value,
                                    })
                                  }
                                  className="w-full px-1.5 py-0.5 text-[10px] text-slate-600 rounded border border-slate-200 bg-white outline-none focus:border-blue-500 text-center"
                                />
                              </div>
                              <div className="space-y-1">
                                <input
                                  type="text"
                                  value={acc.followers ?? ''}
                                  placeholder="45,8 rb"
                                  onChange={(e) =>
                                    handleUpdateSocialFollowerAccount(acc.id, {
                                      followers: e.target.value,
                                    })
                                  }
                                  className="w-full px-1.5 py-1 text-[11px] font-bold rounded border border-slate-200 bg-slate-50 outline-none focus:border-blue-500 tabular-nums text-center"
                                />
                                <input
                                  type="text"
                                  value={acc.followersLabel ?? 'Follower'}
                                  placeholder="Follower"
                                  onChange={(e) =>
                                    handleUpdateSocialFollowerAccount(acc.id, {
                                      followersLabel: e.target.value,
                                    })
                                  }
                                  className="w-full px-1.5 py-0.5 text-[10px] text-slate-600 rounded border border-slate-200 bg-white outline-none focus:border-blue-500 text-center"
                                />
                              </div>
                              <div className="space-y-1">
                                <input
                                  type="text"
                                  value={acc.following ?? ''}
                                  placeholder="312"
                                  onChange={(e) =>
                                    handleUpdateSocialFollowerAccount(acc.id, {
                                      following: e.target.value,
                                    })
                                  }
                                  className="w-full px-1.5 py-1 text-[11px] font-bold rounded border border-slate-200 bg-slate-50 outline-none focus:border-blue-500 tabular-nums text-center"
                                />
                                <input
                                  type="text"
                                  value={acc.followingLabel ?? 'Mengikuti'}
                                  placeholder="Mengikuti"
                                  onChange={(e) =>
                                    handleUpdateSocialFollowerAccount(acc.id, {
                                      followingLabel: e.target.value,
                                    })
                                  }
                                  className="w-full px-1.5 py-0.5 text-[10px] text-slate-600 rounded border border-slate-200 bg-white outline-none focus:border-blue-500 text-center"
                                />
                              </div>
                            </div>
                          </div>

                          {/* Bio Opsional */}
                          <div>
                            <label className="block text-[10px] font-medium text-slate-500 mb-0.5">
                              Bio Singkat (Opsional)
                            </label>
                            <textarea
                              rows={2}
                              value={acc.bio ?? ''}
                              placeholder="Deskripsi singkat akun sosmed..."
                              onChange={(e) =>
                                handleUpdateSocialFollowerAccount(acc.id, {
                                  bio: e.target.value,
                                })
                              }
                              className="w-full px-2 py-1 text-[11px] rounded border border-slate-200 bg-white outline-none focus:border-blue-500 resize-y"
                            />
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            );
          })()}
            </section>
          )}

          {inspectorTab === 'appearance' && (() => {
            const isProfilePhoto =
              selectedBlock.type === 'image' &&
              (c.imageShape === 'circle' ||
                selectedBlock.label.toLowerCase().includes('profil'));
            const isCustomTextColor = s.useThemeTextColor === false;
            const isContainerLike =
              selectedBlock.type === 'container' ||
              selectedBlock.type === 'toggle_container' ||
              selectedBlock.type === 'row';

            const applyInheritToDescendants = (
              children?: BuilderBlock[]
            ): BuilderBlock[] | undefined =>
              children?.map((ch) => ({
                ...ch,
                style: {
                  ...ch.style,
                  useThemeTextColor: true,
                  textColor: theme.textColor,
                },
                children: applyInheritToDescendants(ch.children),
              }));

            return (
            <div className="space-y-6">
              {isProfilePhoto && (
                <div className="p-3 rounded-xl bg-[#EFF7F4]/80 border border-emerald-200/80 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-semibold text-slate-800">
                      Outline &amp; Shadow Foto Profil
                    </span>
                    {c.imageShape !== 'circle' && (
                      <button
                        type="button"
                        onClick={() =>
                          updateContent({
                            imageShape: 'circle',
                            aspectRatio: '1/1',
                            circleSize: c.circleSize ?? 112,
                            imageZoom: c.imageZoom ?? 100,
                          })
                        }
                        className="px-2 py-0.5 rounded-md bg-white border border-emerald-200 text-[10px] font-semibold text-emerald-700 hover:bg-emerald-50 cursor-pointer"
                      >
                        Jadikan Bulat
                      </button>
                    )}
                  </div>

                  {/* Ukuran Outline */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-700">Ukuran Outline</span>
                      <span className="font-semibold text-emerald-700 tabular-nums">
                        {s.borderWidth}px
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={16}
                      step={1}
                      value={s.borderWidth}
                      onChange={(e) => updateStyle({ borderWidth: Number(e.target.value) })}
                      className="w-full accent-emerald-600 cursor-pointer"
                    />
                    <div className="grid grid-cols-5 gap-1 mt-1.5">
                      {[0, 2, 4, 6, 8].map((w) => (
                        <button
                          key={w}
                          type="button"
                          onClick={() => updateStyle({ borderWidth: w })}
                          className={`py-1 rounded-md border text-[10px] font-semibold cursor-pointer transition-colors ${
                            s.borderWidth === w
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {w}px
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Warna Outline */}
                  <div>
                    <label className="block text-xs font-medium text-slate-700 mb-1.5">
                      Warna Outline
                    </label>
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={s.borderColor || '#FFFFFF'}
                        onChange={(e) =>
                          updateStyle({
                            borderColor: e.target.value,
                            borderWidth: s.borderWidth > 0 ? s.borderWidth : 4,
                          })
                        }
                        className="w-9 h-8 rounded-lg border border-slate-200 p-0.5 cursor-pointer shrink-0 bg-white"
                      />
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {[
                          { color: '#FFFFFF', title: 'Putih' },
                          { color: '#0F172A', title: 'Gelap' },
                          { color: theme.accentColor, title: 'Aksen Tema' },
                          { color: '#F59E0B', title: 'Emas' },
                        ].map((sw, idx) => (
                          <button
                            key={`${sw.color}_${idx}`}
                            type="button"
                            title={sw.title}
                            onClick={() =>
                              updateStyle({
                                borderColor: sw.color,
                                borderWidth: s.borderWidth > 0 ? s.borderWidth : 4,
                              })
                            }
                            style={{ backgroundColor: sw.color }}
                            className={`w-6 h-6 rounded-full border cursor-pointer transition-transform ${
                              s.borderColor.toLowerCase() === sw.color.toLowerCase()
                                ? 'ring-2 ring-emerald-500 ring-offset-1 border-slate-300 scale-105'
                                : 'border-slate-300 hover:scale-105'
                            }`}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Shadow Foto Profil */}
                  <div className="space-y-2">
                    <label className="block text-xs font-medium text-slate-700">
                      Shadow Foto
                    </label>
                    <div className="grid grid-cols-4 gap-1">
                      {(
                        [
                          { id: 'none', label: 'Tanpa' },
                          { id: 'sm', label: 'Halus' },
                          { id: 'md', label: 'Sedang' },
                          { id: 'lg', label: 'Tegas' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.id}
                          type="button"
                          onClick={() => updateStyle({ shadow: opt.id })}
                          className={`py-1 px-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors ${
                            s.shadow === opt.id
                              ? 'bg-emerald-500 text-white border-emerald-500'
                              : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>

                    {s.shadow !== 'none' && (
                      <div className="flex items-center justify-between gap-2 pt-0.5">
                        <span className="text-[11px] font-medium text-slate-600">
                          Warna Shadow
                        </span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="color"
                            value={s.shadowColor || '#0F172A'}
                            onChange={(e) => updateStyle({ shadowColor: e.target.value })}
                            className="w-7 h-7 rounded border border-slate-200 p-0.5 cursor-pointer bg-white"
                          />
                          {s.shadowColor && (
                            <button
                              type="button"
                              onClick={() => updateStyle({ shadowColor: undefined })}
                              className="px-2 py-1 rounded-md bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                            >
                              Default
                            </button>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* 1. Full Kanan-Kiri (Tanpa Margin) */}
              <div className="p-3 rounded-xl bg-[#EFF7F4]/80 border border-emerald-200/70 space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[13px] font-semibold text-slate-800 flex items-center gap-1.5">
                    <LayoutTemplate className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Full Kanan-Kiri (Tanpa Margin)</span>
                  </span>
                  <ToggleSwitch
                    checked={Boolean(s.fullBleed)}
                    onChange={(checked) =>
                      updateStyle(
                        checked
                          ? { fullBleed: true, widthPercent: 100 }
                          : { fullBleed: false }
                      )
                    }
                    label="Full Kanan-Kiri (Tanpa Margin)"
                  />
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[12px] text-slate-600">
                    {s.fullBleed
                      ? 'Menempel penuh ke tepi kiri & kanan.'
                      : 'Melebarkan kotak ini saja sampai tepi.'}
                  </span>
                  {s.fullBleed && s.borderRadius > 0 && (
                    <button
                      type="button"
                      onClick={() => updateStyle({ borderRadius: 0 })}
                      className="px-2 py-0.5 rounded-lg bg-white border border-emerald-200 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 shrink-0 cursor-pointer"
                    >
                      Sudut 0px
                    </button>
                  )}
                </div>
              </div>

              {/* Jarak Atas Halaman */}
              <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-800">
                    Jarak Atas Halaman
                  </span>
                  <span className="text-xs font-semibold text-emerald-700 tabular-nums">
                    {advanceOptions.pageTopPadding ?? (s.fullBleed ? 0 : 12)}px
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1.5">
                  {[
                    { val: 0, label: '0px Rapat' },
                    { val: 12, label: '12px Rapi' },
                    { val: 24, label: '24px Lega' },
                  ].map((opt) => {
                    const currentTop = advanceOptions.pageTopPadding ?? (s.fullBleed ? 0 : 12);
                    const active = currentTop === opt.val;
                    return (
                      <button
                        key={opt.val}
                        type="button"
                        onClick={() => onUpdateAdvanceOptions({ pageTopPadding: opt.val })}
                        className={`py-1 px-2 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
                          active
                            ? 'bg-emerald-500 text-white border-emerald-500'
                            : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {opt.label}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="range"
                  min={0}
                  max={48}
                  step={2}
                  value={advanceOptions.pageTopPadding ?? (s.fullBleed ? 0 : 12)}
                  onChange={(e) =>
                    onUpdateAdvanceOptions({ pageTopPadding: Number(e.target.value) })
                  }
                  className="w-full accent-emerald-600 cursor-pointer"
                />
              </div>

              {/* 2. Block Layout (jika Katalog) */}
              {selectedBlock.type === 'catalog' && (
                <>
                  {renderAdvanceOptionSection()}
                  <hr className="border-slate-100" />
                </>
              )}

              {/* 3. Tata Letak & Spasi */}
              <section className="space-y-3.5">
                <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                  Tata Letak &amp; Spasi
                </h3>

                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1.5">
                    Posisi Isi di Dalamnya
                  </label>
                  <div className="grid grid-cols-3 gap-1.5 p-1 bg-slate-100 rounded-lg">
                    {(
                      [
                        { id: 'left', icon: <AlignLeft className="w-3.5 h-3.5" />, label: 'Kiri' },
                        { id: 'center', icon: <AlignCenter className="w-3.5 h-3.5" />, label: 'Tengah' },
                        { id: 'right', icon: <AlignRight className="w-3.5 h-3.5" />, label: 'Kanan' },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateStyle({ align: opt.id })}
                        title={opt.label}
                        className={`flex items-center justify-center gap-1 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                          s.align === opt.id
                            ? 'bg-white text-blue-600 shadow-xs'
                            : 'text-slate-600 hover:text-slate-900'
                        }`}
                      >
                        {opt.icon}
                      </button>
                    ))}
                  </div>
                </div>

          <SliderRow
            label="Lebar Elemen"
            value={`${s.widthPercent}%`}
            min={30}
            max={100}
            current={s.widthPercent}
            onChange={(val) => updateStyle({ widthPercent: val, fullBleed: val < 100 ? false : s.fullBleed })}
          />

          <SliderRow
            label="Tinggi Minimal"
            value={`${s.minHeight}px`}
            min={0}
            max={300}
            current={s.minHeight}
            onChange={(val) => updateStyle({ minHeight: val })}
          />

          {selectedBlock.type === 'image' &&
          (selectedBlock.content.imageShape === 'circle' ||
            selectedBlock.label.toLowerCase().includes('profil')) ? (
            <div className="space-y-3 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <SliderRow
                label="Padding Atas"
                value={`${s.paddingTop ?? s.padding}px`}
                min={0}
                max={48}
                current={s.paddingTop ?? s.padding}
                onChange={(val) => updateStyle({ paddingTop: val })}
              />
              <SliderRow
                label="Padding Bawah"
                value={`${s.paddingBottom ?? s.padding}px`}
                min={0}
                max={48}
                current={s.paddingBottom ?? s.padding}
                onChange={(val) => updateStyle({ paddingBottom: val })}
              />
            </div>
          ) : (
            <SliderRow
              label="Padding Atas & Bawah"
              value={`${s.padding}px`}
              min={0}
              max={40}
              current={s.padding}
              onChange={(val) =>
                updateStyle({
                  padding: val,
                  paddingTop: undefined,
                  paddingBottom: undefined,
                })
              }
            />
          )}

          <div>
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="font-medium text-slate-600">Padding Kanan &amp; Kiri</span>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => updateStyle({ paddingX: 0 })}
                  className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-pointer transition-colors ${
                    (s.paddingX ?? s.padding) === 0
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-white text-slate-600 border-slate-200 hover:border-slate-300'
                  }`}
                >
                  0px (Full)
                </button>
                <span className="font-semibold text-slate-800 tabular-nums">
                  {s.paddingX ?? s.padding}px
                </span>
              </div>
            </div>
            <input
              type="range"
              min={0}
              max={40}
              value={s.paddingX ?? s.padding}
              onChange={(e) => updateStyle({ paddingX: Number(e.target.value) })}
              className="w-full accent-blue-600 cursor-pointer"
            />
          </div>

          <SliderRow
            label="Jarak Bawah (Margin)"
            value={`${s.marginBottom}px`}
            min={0}
            max={48}
            current={s.marginBottom}
            onChange={(val) => updateStyle({ marginBottom: val })}
          />
        </section>

        <hr className="border-slate-100" />

        {/* Section 3: Gaya Visual */}
        <section className="space-y-3.5">
          <h3 className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
            Gaya Visual
          </h3>

          <SliderRow
            label="Lengkung Sudut"
            value={`${s.borderRadius}px`}
            min={0}
            max={36}
            current={s.borderRadius}
            onChange={(val) => updateStyle({ borderRadius: val })}
          />

          <SliderRow
            label="Efek Kaca (Blur)"
            value={`${s.blur}px`}
            min={0}
            max={24}
            current={s.blur}
            onChange={(val) => updateStyle({ blur: val })}
          />

          <div>
            <label className="block text-xs font-medium text-slate-600 mb-1">
              Efek Bayangan (Shadow)
            </label>
            <select
              value={s.shadow}
              onChange={(e) => updateStyle({ shadow: e.target.value as ShadowPreset })}
              className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none"
            >
              <option value="none">Tanpa Bayangan</option>
              <option value="sm">Halus</option>
              <option value="md">Sedang</option>
              <option value="lg">Tegas</option>
            </select>
            {s.shadow !== 'none' && (
              <div className="mt-2 flex items-center justify-between gap-2">
                <span className="text-[11px] font-medium text-slate-600">Warna Shadow</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={s.shadowColor || '#0F172A'}
                    onChange={(e) => updateStyle({ shadowColor: e.target.value })}
                    className="w-7 h-7 rounded border border-slate-200 p-0.5 cursor-pointer bg-white"
                  />
                  {s.shadowColor && (
                    <button
                      type="button"
                      onClick={() => updateStyle({ shadowColor: undefined })}
                      className="px-2 py-1 rounded border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-50 cursor-pointer"
                    >
                      Default
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between gap-2 p-2.5 rounded-xl bg-slate-50 border border-slate-200/80">
            <div>
              <div className="text-xs font-semibold text-slate-800">Efek Kartu Dinamis (Hover Lift)</div>
              <div className="text-[10.5px] text-slate-500">Kartu terangkat halus saat disentuh / hover</div>
            </div>
            <ToggleSwitch
              checked={Boolean(s.hoverLift)}
              onChange={(checked) => updateStyle({ hoverLift: checked })}
              label="Efek Kartu Dinamis"
            />
          </div>

          {/* Section 4: Tipografi (Font, Ukuran, Ketebalan, Warna) */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-emerald-600" />
                <span>Tipografi &amp; Jenis Font</span>
              </span>
              {s.fontFamily && (
                <button
                  type="button"
                  onClick={() => updateStyle({ fontFamily: undefined })}
                  className="px-2 py-0.5 rounded bg-white border border-slate-200 text-[10px] font-semibold text-slate-600 hover:bg-slate-100 cursor-pointer"
                >
                  Reset Font
                </button>
              )}
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Jenis Font (Google Fonts)
              </label>
              <select
                value={s.fontFamily ?? ''}
                onChange={(e) =>
                  updateStyle({ fontFamily: e.target.value ? e.target.value : undefined })
                }
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-slate-200 bg-white outline-none focus:border-emerald-500"
              >
                <option value="">Ikuti Font Default Tema</option>
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

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-600">Ukuran Teks (Font Size)</span>
                <div className="flex items-center gap-1.5">
                  {s.fontSize !== undefined && (
                    <button
                      type="button"
                      onClick={() => updateStyle({ fontSize: undefined })}
                      className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] font-semibold text-slate-600 cursor-pointer"
                    >
                      Auto
                    </button>
                  )}
                  <span className="font-mono text-[11px] text-emerald-700 bg-[#EFF7F4] px-1.5 py-0.5 rounded tabular-nums">
                    {s.fontSize ? `${s.fontSize}px` : 'Auto'}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={10}
                max={42}
                value={s.fontSize ?? 15}
                onChange={(e) => updateStyle({ fontSize: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>

            <div>
              <label className="block text-[11px] font-medium text-slate-600 mb-1">
                Ketebalan Teks (Weight)
              </label>
              <div className="grid grid-cols-5 gap-1">
                {(['400', '500', '600', '700', '800'] as const).map((w) => (
                  <button
                    key={w}
                    type="button"
                    onClick={() =>
                      updateStyle({ fontWeightCss: s.fontWeightCss === w ? undefined : w })
                    }
                    className={`py-1 rounded border text-[10.5px] font-semibold cursor-pointer tabular-nums ${
                      s.fontWeightCss === w
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-slate-600">Tinggi Baris (Line Height)</span>
                <div className="flex items-center gap-1.5">
                  {s.lineHeight !== undefined && (
                    <button
                      type="button"
                      onClick={() => updateStyle({ lineHeight: undefined })}
                      className="px-1.5 py-0.5 rounded border border-slate-200 bg-white text-[10px] font-semibold text-slate-600 cursor-pointer"
                    >
                      Auto
                    </button>
                  )}
                  <span className="font-mono text-[11px] text-emerald-700 bg-[#EFF7F4] px-1.5 py-0.5 rounded tabular-nums">
                    {s.lineHeight ? s.lineHeight.toFixed(1) : 'Auto'}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={1.0}
                max={2.4}
                step={0.1}
                value={s.lineHeight ?? 1.5}
                onChange={(e) => updateStyle({ lineHeight: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
          </div>

          <div className="space-y-3">
            {/* Warna Latar: Solid vs Gradasi + Derajat */}
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-slate-800">Latar &amp; Gradasi Warna</span>
                <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5">
                  <button
                    type="button"
                    onClick={() => updateStyle({ backgroundMode: 'solid' })}
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                      (s.backgroundMode ?? 'solid') === 'solid'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Solid
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateStyle({
                        backgroundMode: 'gradient',
                        gradientColor1: s.gradientColor1 || '#EA580C',
                        gradientColor2: s.gradientColor2 || '#9A3412',
                        gradientAngle: s.gradientAngle ?? 135,
                      })
                    }
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                      s.backgroundMode === 'gradient'
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Gradasi
                  </button>
                </div>
              </div>

              {(s.backgroundMode ?? 'solid') === 'solid' ? (
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={s.backgroundColor === 'transparent' ? '#ffffff' : s.backgroundColor}
                    onChange={(e) => updateStyle({ backgroundColor: e.target.value })}
                    className="w-8 h-8 rounded border border-slate-200 p-0.5 cursor-pointer shrink-0 bg-white"
                  />
                  <button
                    type="button"
                    onClick={() => updateStyle({ backgroundColor: 'transparent' })}
                    className="text-[11px] px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-100 text-slate-600 cursor-pointer"
                  >
                    Transparan
                  </button>
                </div>
              ) : (
                <div className="space-y-2.5">
                  {/* Live gradient preview bar */}
                  <div
                    className="w-full h-7 rounded-lg border border-slate-200 shadow-2xs"
                    style={{
                      backgroundImage:
                        buildLinearGradientCss(s) ||
                        'linear-gradient(135deg, #EA580C 0%, #9A3412 100%)',
                    }}
                  />

                  <div className="grid grid-cols-3 gap-2">
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        Warna 1
                      </label>
                      <input
                        type="color"
                        value={s.gradientColor1 || '#EA580C'}
                        onChange={(e) => updateStyle({ gradientColor1: e.target.value })}
                        className="w-full h-7 rounded border border-slate-200 p-0.5 cursor-pointer bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        Warna 2
                      </label>
                      <input
                        type="color"
                        value={s.gradientColor2 || '#9A3412'}
                        onChange={(e) => updateStyle({ gradientColor2: e.target.value })}
                        className="w-full h-7 rounded border border-slate-200 p-0.5 cursor-pointer bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-medium text-slate-500 mb-1">
                        Warna 3 (Ops)
                      </label>
                      {s.gradientColor3 ? (
                        <div className="flex items-center gap-1">
                          <input
                            type="color"
                            value={s.gradientColor3}
                            onChange={(e) => updateStyle({ gradientColor3: e.target.value })}
                            className="w-full h-7 rounded border border-slate-200 p-0.5 cursor-pointer bg-white"
                          />
                          <button
                            type="button"
                            onClick={() => updateStyle({ gradientColor3: undefined })}
                            className="px-1 py-1 text-[10px] text-slate-500 hover:text-red-600 cursor-pointer"
                            title="Hapus warna 3"
                          >
                            ✕
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => updateStyle({ gradientColor3: '#7C2D12' })}
                          className="w-full h-7 rounded border border-dashed border-slate-300 bg-white text-[10px] font-semibold text-slate-500 hover:border-emerald-400 cursor-pointer"
                        >
                          + Warna 3
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Sudut Gradasi (0 - 360 derajat) */}
                  <div>
                    <div className="flex items-center justify-between text-xs mb-1">
                      <span className="font-medium text-slate-600">Sudut Gradasi (Derajat)</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min={0}
                          max={360}
                          value={clampGradientAngle(s.gradientAngle ?? 135)}
                          onChange={(e) =>
                            updateStyle({ gradientAngle: clampGradientAngle(Number(e.target.value)) })
                          }
                          className="w-14 px-1.5 py-0.5 text-[11px] font-mono rounded border border-slate-200 bg-white text-right tabular-nums"
                        />
                        <span className="text-[11px] font-semibold text-slate-500">°</span>
                      </div>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={360}
                      step={5}
                      value={clampGradientAngle(s.gradientAngle ?? 135)}
                      onChange={(e) => updateStyle({ gradientAngle: Number(e.target.value) })}
                      className="w-full accent-emerald-500 cursor-pointer"
                    />
                    <div className="grid grid-cols-5 gap-1 mt-1">
                      {[0, 45, 90, 135, 180].map((deg) => (
                        <button
                          key={deg}
                          type="button"
                          onClick={() => updateStyle({ gradientAngle: deg })}
                          className={`py-0.5 rounded border text-[10px] font-semibold cursor-pointer tabular-nums ${
                            clampGradientAngle(s.gradientAngle ?? 135) === deg
                              ? 'bg-emerald-600 text-white border-emerald-600'
                              : 'bg-white text-slate-600 border-slate-200'
                          }`}
                        >
                          {deg}°
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Swatch Presets (@gambar 6) */}
                  <div>
                    <div className="text-[10.5px] font-medium text-slate-500 mb-1.5">
                      Pilihan Gradasi Siap Pakai:
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {GRADIENT_PRESETS.map((gp) => (
                        <button
                          key={gp.id}
                          type="button"
                          title={gp.name}
                          onClick={() =>
                            updateStyle({
                              backgroundMode: 'gradient',
                              gradientColor1: gp.color1,
                              gradientColor2: gp.color2,
                              gradientColor3: gp.color3,
                              gradientAngle: gp.angle,
                              useThemeTextColor: false,
                              textColor: gp.suggestedTextColor,
                            })
                          }
                          className="w-6 h-6 rounded-full border border-white shadow-xs cursor-pointer hover:scale-110 transition-transform"
                          style={{
                            backgroundImage: gp.color3
                              ? `linear-gradient(${gp.angle}deg, ${gp.color1}, ${gp.color2}, ${gp.color3})`
                              : `linear-gradient(${gp.angle}deg, ${gp.color1}, ${gp.color2})`,
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Warna Teks: Default Ikut Template + Opsi Kustom */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-semibold text-slate-700">Warna Teks</span>
                <div className="inline-flex rounded-lg bg-slate-200/70 p-0.5">
                  <button
                    type="button"
                    onClick={() =>
                      updateStyle({
                        useThemeTextColor: true,
                        textColor: theme.textColor,
                      })
                    }
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                      !isCustomTextColor
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Ikut Template
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      updateStyle({
                        useThemeTextColor: false,
                        textColor: s.textColor || theme.textColor,
                      })
                    }
                    className={`px-2 py-0.5 rounded-md text-[10px] font-semibold transition-colors cursor-pointer ${
                      isCustomTextColor
                        ? 'bg-white text-emerald-700 shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Kustom
                  </button>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={isCustomTextColor ? s.textColor : theme.textColor}
                  onChange={(e) =>
                    updateStyle({
                      useThemeTextColor: false,
                      textColor: e.target.value,
                    })
                  }
                  className="w-8 h-8 rounded-lg border border-slate-200 p-0.5 cursor-pointer shrink-0 bg-white"
                />
                <div className="flex items-center gap-1.5 flex-wrap">
                  {[
                    { color: '#FFFFFF', title: 'Putih' },
                    { color: '#0F172A', title: 'Gelap' },
                    { color: theme.textColor, title: 'Warna Template' },
                    { color: theme.accentColor, title: 'Aksen Tema' },
                  ].map((sw, idx) => {
                    const activeColor = isCustomTextColor ? s.textColor : theme.textColor;
                    return (
                      <button
                        key={`${sw.color}_${idx}`}
                        type="button"
                        title={sw.title}
                        onClick={() =>
                          updateStyle({
                            useThemeTextColor: false,
                            textColor: sw.color,
                          })
                        }
                        style={{ backgroundColor: sw.color }}
                        className={`w-6 h-6 rounded-full border cursor-pointer transition-transform ${
                          activeColor.toLowerCase() === sw.color.toLowerCase() && isCustomTextColor
                            ? 'ring-2 ring-emerald-500 ring-offset-1 border-slate-300 scale-105'
                            : 'border-slate-300 hover:scale-105'
                        }`}
                      />
                    );
                  })}
                </div>
              </div>

              <p className="text-[11px] text-slate-500 leading-snug">
                {isCustomTextColor
                  ? isContainerLike
                    ? 'Warna kustom aktif — otomatis diterapkan ke teks di dalam kartu yang mengikuti template.'
                    : 'Menggunakan warna teks kustom untuk elemen ini.'
                  : 'Default mengikuti warna template (atau warna kartu pembungkusnya).'}
              </p>

              {isContainerLike && isCustomTextColor && (
                <button
                  type="button"
                  onClick={() =>
                    onUpdateBlock(selectedBlock.id, (blk) => ({
                      ...blk,
                      children: applyInheritToDescendants(blk.children),
                    }))
                  }
                  className="w-full py-1.5 px-2.5 rounded-lg bg-white border border-emerald-200 text-[11px] font-semibold text-emerald-700 hover:bg-emerald-50 transition-colors cursor-pointer"
                >
                  Samakan Semua Teks di Dalam Kartu
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">
                Garis Tepi ({s.borderWidth}px)
              </label>
              <input
                type="range"
                min={0}
                max={16}
                value={s.borderWidth}
                onChange={(e) => updateStyle({ borderWidth: Number(e.target.value) })}
                className="w-full accent-emerald-500 cursor-pointer"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-slate-600 mb-1">Warna Tepi</label>
              <input
                type="color"
                value={s.borderColor}
                onChange={(e) => updateStyle({ borderColor: e.target.value })}
                className="w-full h-8 rounded border border-slate-200 p-0.5 cursor-pointer"
              />
            </div>
          </div>
        </section>
      </div>
            );
          })()}
        </div>
      </div>
    );
  };

  return (
    <aside className="w-80 bg-white border-l border-slate-100 flex flex-col shrink-0 h-full overflow-hidden">
      <div className="px-4 py-2.5 border-b border-slate-100 flex items-center justify-between gap-2 bg-white shrink-0">
        <span className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
          {inspectorMode === 'navbar' ? 'Pengaturan Navbar' : 'Pengaturan'}
        </span>
        <button
          type="button"
          onClick={() =>
            onChangeInspectorMode(inspectorMode === 'navbar' ? 'element' : 'navbar')
          }
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors ${
            inspectorMode === 'navbar'
              ? 'bg-emerald-600 text-white border-emerald-600'
              : 'bg-slate-50 text-slate-700 border-slate-200 hover:border-emerald-300 hover:bg-[#EFF7F4]'
          }`}
        >
          <span
            className={`w-1.5 h-1.5 rounded-full ${
              bottomNavbar.enabled
                ? inspectorMode === 'navbar'
                  ? 'bg-emerald-200'
                  : 'bg-emerald-500'
                : 'bg-slate-300'
            }`}
          />
          <PanelBottom className="w-3.5 h-3.5" />
          <span>Navbar Bawah</span>
        </button>
      </div>

      {inspectorMode === 'navbar' ? renderNavbarSettings() : renderElementSettings()}
    </aside>
  );
}

function ToggleSwitch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors cursor-pointer focus-visible:outline-2 focus-visible:outline-emerald-600 ${
        checked ? 'bg-emerald-500' : 'bg-slate-200'
      }`}
    >
      <span
        className={`inline-block h-4 w-4 transform rounded-full bg-white shadow-xs transition-transform ${
          checked ? 'translate-x-4.5' : 'translate-x-0.5'
        }`}
      />
    </button>
  );
}

function LayoutWireframe({ mode }: { mode: BlockLayoutMode }) {
  if (mode === 'default') {
    return (
      <div className="w-full h-full flex flex-col justify-between gap-1 py-0.5">
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="flex-1 rounded bg-slate-500/80 px-1.5 flex items-center gap-1.5"
          >
            <div className="w-3 h-3 rounded-xs bg-white/80 shrink-0" />
            <div className="flex-1 h-1 rounded-full bg-white/70" />
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'grid') {
    return (
      <div className="w-full h-full grid grid-cols-2 gap-1 py-0.5">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded bg-slate-500/80 flex items-center justify-center"
          >
            <div className="w-3.5 h-3.5 rounded-xs border border-white/70" />
          </div>
        ))}
      </div>
    );
  }

  if (mode === 'large-image') {
    return (
      <div className="w-full h-full flex flex-col gap-1 py-0.5">
        <div className="flex-1 rounded bg-slate-500/80 flex flex-col justify-between p-1.5">
          <div className="flex-1 flex items-center justify-center">
            <div className="w-4 h-4 rounded-xs border border-white/70" />
          </div>
          <div className="h-1 w-3/4 rounded-full bg-white/80" />
        </div>
      </div>
    );
  }

  // compact
  return (
    <div className="w-full h-full flex flex-col justify-center py-0.5">
      <div className="w-full h-full rounded bg-slate-300/80 p-1.5 flex flex-col justify-between gap-1">
        <div className="flex items-center gap-1.5">
          <div className="w-4 h-4 rounded-xs bg-white/90 shrink-0" />
          <div className="flex-1 space-y-1">
            <div className="h-1 w-4/5 rounded-full bg-white/90" />
            <div className="h-1 w-3/5 rounded-full bg-white/70" />
          </div>
        </div>
        <div className="w-full py-0.5 rounded bg-slate-500/75 text-[7px] font-bold text-white text-center leading-none">
          CTA
        </div>
      </div>
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  current,
  onChange,
}: {
  label: string;
  value: string;
  min: number;
  max: number;
  current: number;
  onChange: (val: number) => void;
}) {
  return (
    <div>
      <div className="flex items-center justify-between text-xs mb-1">
        <span className="font-medium text-slate-600">{label}</span>
        <span className="font-mono text-[11px] text-emerald-700 bg-[#EFF7F4] px-1.5 py-0.5 rounded tabular-nums">
          {value}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        value={current}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-500 cursor-pointer"
      />
    </div>
  );
}
