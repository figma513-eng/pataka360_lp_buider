import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ArrowLeftRight,
  Award,
  BadgeCheck,
  Bookmark,
  BookmarkPlus,
  CalendarDays,
  Check,
  ChevronsUpDown,
  Coffee,
  Columns2,
  Columns3,
  Disc3,
  Eye,
  FileText,
  GraduationCap,
  Grid3X3,
  Image as ImageIcon,
  Images,
  Layers,
  LayoutGrid,
  Link2,
  Mail,
  MapPin,
  Minus,
  MousePointerClick,
  Newspaper,
  Package,
  Palette,
  PanelBottomOpen,
  PanelTop,
  Pencil,
  Quote,
  Search,
  Shapes,
  Share2,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Square,
  Store,
  Tag,
  Tags,
  Ticket,
  Trash2,
  Type,
  UserCheck,
  Users,
  UtensilsCrossed,
  Video,
  Wrench,
  X,
} from 'lucide-react';
import {
  AdvanceOptions,
  AuthUser,
  BlockType,
  BottomNavbarConfig,
  BuilderBlock,
  BuilderSubPage,
  PageTheme,
  PrebuiltSectionCategory,
  SavedItemTemplate,
  SavedItemTemplateTarget,
  SavedWebTemplate,
} from '../types/builder';
import {
  BLOCK_TYPE_NAMES,
  PREBUILT_SECTION_CATEGORIES,
  PREBUILT_SECTIONS,
  PrebuiltSection,
  createBlock,
  createPngImageBlock,
} from '../data/presets';
import { useUiLabel } from '../contexts/UiLabelsContext';
import { SocialGlyph } from './SocialIcon';
import { HomePageSettings } from './inspector/HomePageSettings';
import { ItemPreviewModal, ItemPreviewPayload } from './modals/ItemPreviewModal';
import { countNestedBlocks } from '../utils/itemTemplateStorage';

type SidebarTab = 'alat' | 'blok' | 'tema' | 'layer';

const PREVIEW_MODE_LS_KEY = 'lynk_sidebar_preview_before_insert_v1';

function hasBlockInTree(nodes: BuilderBlock[] | undefined, targetId: string): boolean {
  if (!Array.isArray(nodes) || !targetId) return false;
  for (const node of nodes) {
    if (node.id === targetId) return true;
    if (hasBlockInTree(node.children, targetId)) return true;
    if (hasBlockInTree(node.content?.actionSheetBlocks, targetId)) return true;
    if (hasBlockInTree(node.content?.cardFooterBlocks, targetId)) return true;
  }
  return false;
}

interface LeftSidebarProps {
  onAddBlock: (type: BlockType, toolPreset?: 'png') => void;
  onAddSection: (section: PrebuiltSection) => void;
  itemTemplates?: SavedItemTemplate[];
  onAddItemTemplate?: (template: SavedItemTemplate) => void;
  onOpenSaveItemTemplate?: (defaultTarget?: SavedItemTemplateTarget) => void;
  onDeleteItemTemplate?: (id: string) => void;
  onUpdateItemTemplate?: (
    id: string,
    patch: Partial<Pick<SavedItemTemplate, 'name' | 'description' | 'target'>>
  ) => void;
  blocks: BuilderBlock[];
  pages?: BuilderSubPage[];
  activeSubPageId?: string | null;
  onSelectSubPage?: (pageId: string | null) => void;
  onAddSubPage?: () => string | null;
  onUpdateSubPage?: (pageId: string, patch: Partial<BuilderSubPage>) => void;
  onDuplicateSubPage?: (pageId: string) => void;
  onDeleteSubPage?: (pageId: string) => void;
  selectedId: string | null;
  selectedSubLayerId?: string | null;
  theme: PageTheme;
  advanceOptions: AdvanceOptions;
  bottomNavbar: BottomNavbarConfig;
  activeNavItemId: string;
  navbarFocusNonce?: number;
  layerFocusNonce?: number;
  onSelectTheme: (next: PageTheme) => void;
  onUpdateAdvanceOptions: (patch: Partial<AdvanceOptions>) => void;
  onUpdateBottomNavbar: (updater: (prev: BottomNavbarConfig) => BottomNavbarConfig) => void;
  onSelectNavItem: (id: string) => void;
  onSelectBlock: (id: string | null) => void;
  onSelectSubLayer?: (blockId: string, subLayerId: string | null) => void;
  onToggleSubLayerVisibility?: (blockId: string, subLayerId: string) => void;
  onToggleSubLayerLock?: (blockId: string, subLayerId: string) => void;
  onDeleteSubLayer?: (blockId: string, subLayerId: string) => void;
  onMoveBlock: (id: string, dir: 'up' | 'down') => void;
  onReorderBlock: (
    draggedId: string,
    targetId: string,
    position: 'before' | 'after' | 'inside'
  ) => void;
  onDuplicateBlock?: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onUpdateBlock?: (id: string, updater: (block: BuilderBlock) => BuilderBlock) => void;
  onResetPageThemeOverrides?: () => void;
  onAddChildToContainer: (containerId: string, type: BlockType) => void;
  webTemplates?: SavedWebTemplate[];
  webTemplatesLoading?: boolean;
  currentUser?: AuthUser | null;
  canEditCanvas?: boolean;
  canCreateProject?: boolean;
  onOpenSaveWebTemplate?: () => void;
  onOpenEditWebTemplate?: (tpl: SavedWebTemplate) => void;
  onApplyWebTemplate?: (tpl: SavedWebTemplate) => void;
  onCreateProjectFromWebTemplate?: (tpl: SavedWebTemplate) => void;
  onOverwriteWebTemplateFromCanvas?: (tpl: SavedWebTemplate) => void;
  onDeleteWebTemplate?: (tpl: SavedWebTemplate) => void;
  onImportWebTemplateJson?: (rawText: string) => void;
  onRefreshWebTemplates?: () => void;
}

export interface ToolPaletteItem {
  key: string;
  type: BlockType;
  toolPreset?: 'png';
  sectionId?: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
}

/**
 * ALAT = Komponen Mandiri (dapat disusun bebas ke dalam card/wadah/kolom mana pun).
 * Template siap pakai (Hero Profil, Katalog F&B/Produk/Pelatihan, Kartu Kutipan/Berita/Tiket, dll.)
 * dipisahkan ke tab BLOK agar terstruktur rapi per kategori.
 */
export const TOOL_ITEMS: ToolPaletteItem[] = [
  {
    key: 'text',
    type: 'text',
    label: 'Teks Biasa',
    desc: 'Judul, subjudul, atau paragraf mandiri',
    icon: <Type className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'image',
    type: 'image',
    label: 'Gambar',
    desc: 'Foto, logo, poster, atau ilustrasi',
    icon: <ImageIcon className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'image_png',
    type: 'image',
    toolPreset: 'png',
    label: 'Gambar PNG',
    desc: 'PNG transparan, hapus latar putih/polos, bayangan siluet & pop-out 3D',
    icon: <Sparkles className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'button',
    type: 'button',
    label: 'Tombol Link',
    desc: 'Tautan CTA interaktif mandiri',
    icon: <MousePointerClick className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'cart_button',
    type: 'cart_button',
    label: 'Tombol Keranjang',
    desc: 'Bisa diletakkan di card mana pun · - 1 + & label mengambang',
    icon: <ShoppingCart className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'back_button',
    type: 'back_button',
    label: 'Tombol Kembali',
    desc: 'Navigasi Back ke halaman sebelumnya / Beranda',
    icon: <ArrowLeft className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'menu_icon',
    type: 'menu_icon',
    label: 'Menu Icon',
    desc: 'Upload/URL gambar · Buka sheet 4 arah atau ke card lain',
    icon: <Shapes className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'row',
    type: 'row',
    label: 'Kolom / Grid / Row',
    desc: 'Tambah kolom & baris grid (1–20), slide horizontal/vertikal',
    icon: <Columns2 className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'container',
    type: 'container',
    label: 'Kotak / Wadah',
    desc: 'Pembungkus elemen, card custom & latar gradasi',
    icon: <Square className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'toggle_container',
    type: 'toggle_container',
    label: 'Wadah Show / Hide',
    desc: 'Buka-tutup elemen secara dinamis (default hide)',
    icon: <ChevronsUpDown className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'bottom_sheet',
    type: 'bottom_sheet',
    label: 'Bottom Sheet',
    desc: 'Klik ikon/tombol buka panel mengambang',
    icon: <PanelBottomOpen className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'category_tabs',
    type: 'category_tabs',
    label: 'Tombol Kategori',
    desc: 'Filter kategori atau lompat ke bagian tertentu',
    icon: <LayoutGrid className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'form',
    type: 'form',
    label: 'Form Isian',
    desc: 'Form & checklist dengan opsi wajib isi / tidak wajib',
    icon: <FileText className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'divider',
    type: 'divider',
    label: 'Garis Pembatas',
    desc: 'Pemisah antar bagian halaman',
    icon: <Minus className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'maps_place',
    type: 'maps_place',
    label: 'Lokasi Maps',
    desc: 'Kartu alamat, rating & tombol Google Maps',
    icon: <MapPin className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'social',
    type: 'social',
    label: 'Ikon Sosmed',
    desc: 'Baris ikon link seluruh sosial media',
    icon: <Share2 className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'youtube',
    type: 'youtube',
    label: 'Video YouTube',
    desc: 'Embed bersih + Play/Pause/Volume',
    icon: <Video className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'facebook_video',
    type: 'facebook_video',
    label: 'Video Facebook',
    desc: 'Embed FB bersih + Play/Pause/Volume',
    icon: <SocialGlyph platform="facebook" className="w-4 h-4" />,
  },
  {
    key: 'tiktok_video',
    type: 'tiktok_video',
    label: 'Video TikTok',
    desc: 'Embed TikTok bersih + Play/Pause/Volume',
    icon: <SocialGlyph platform="tiktok" className="w-4 h-4" />,
  },
  {
    key: 'instagram_video',
    type: 'instagram_video',
    label: 'Video Instagram',
    desc: 'Embed IG bersih + Play/Pause/Volume',
    icon: <SocialGlyph platform="instagram" className="w-4 h-4" />,
  },
];

export const SECTION_ICONS: Record<string, React.ReactNode> = {
  'kartu-kutipan-tokoh': <Quote className="w-4 h-4" strokeWidth={1.85} />,
  'kartu-informasi-nasional': <Newspaper className="w-4 h-4" strokeWidth={1.85} />,
  'kartu-even-promo': <CalendarDays className="w-4 h-4" strokeWidth={1.85} />,
  'kartu-sertifikasi': <Award className="w-4 h-4" strokeWidth={1.85} />,
  'kartu-produk-3d-popout': <Sparkles className="w-4 h-4" strokeWidth={1.85} />,
  'kartu-store-gradasi': <ShoppingBag className="w-4 h-4" strokeWidth={1.85} />,
  'kartu-feed-kegiatan': <Users className="w-4 h-4" strokeWidth={1.85} />,
  'kartu-tarif-keanggotaan': <Ticket className="w-4 h-4" strokeWidth={1.85} />,
  'menu-grid-spesial': <Grid3X3 className="w-4 h-4" strokeWidth={1.85} />,
  'hero-profil-kompak': <UserCheck className="w-4 h-4" strokeWidth={1.85} />,
  'hero-profil-banner': <PanelTop className="w-4 h-4" strokeWidth={1.85} />,
  'tombol-kategori-scroll': <Tags className="w-4 h-4" strokeWidth={1.85} />,
  'row-slide-horizontal': <Columns3 className="w-4 h-4" strokeWidth={1.85} />,
  'slide-produk-fnb': <Coffee className="w-4 h-4" strokeWidth={1.85} />,
  'slide-kuliner-putar': <Disc3 className="w-4 h-4" strokeWidth={1.85} />,
  'studio-produk-melayang': <Shirt className="w-4 h-4" strokeWidth={1.85} />,
  'interactive-box-showcase': <Package className="w-4 h-4" strokeWidth={1.85} />,
  'katalog-fnb': <UtensilsCrossed className="w-4 h-4" strokeWidth={1.85} />,
  'kotak-outlet-dinamis': <Store className="w-4 h-4" strokeWidth={1.85} />,
  'kotak-promo-gradasi': <Sparkles className="w-4 h-4" strokeWidth={1.85} />,
  'bottom-sheet-maps': <PanelBottomOpen className="w-4 h-4" strokeWidth={1.85} />,
  'lokasi-maps': <MapPin className="w-4 h-4" strokeWidth={1.85} />,
  'sosmed-postingan': <Share2 className="w-4 h-4" strokeWidth={1.85} />,
  'sosmed-follower-cards': <UserCheck className="w-4 h-4" strokeWidth={1.85} />,
  'foto-carousel': <Images className="w-4 h-4" strokeWidth={1.85} />,
  'katalog-produk-pelatihan': <GraduationCap className="w-4 h-4" strokeWidth={1.85} />,
  'katalog-produk-fisik': <Package className="w-4 h-4" strokeWidth={1.85} />,
  'katalog-produk-digital': <ShoppingBag className="w-4 h-4" strokeWidth={1.85} />,
  'hero-profile': <BadgeCheck className="w-4 h-4" strokeWidth={1.85} />,
  'link-stack': <Link2 className="w-4 h-4" strokeWidth={1.85} />,
  'digital-product': <Tag className="w-4 h-4" strokeWidth={1.85} />,
  'contact-lead': <Mail className="w-4 h-4" strokeWidth={1.85} />,
};

export function getSectionIcon(sectionId: string): React.ReactNode {
  return SECTION_ICONS[sectionId] ?? <LayoutGrid className="w-4 h-4" strokeWidth={1.85} />;
}

export function getBlockTypePaletteIcon(type: BlockType): React.ReactNode {
  const toolMatch = TOOL_ITEMS.find((t) => t.type === type);
  if (toolMatch) return toolMatch.icon;
  switch (type) {
    case 'catalog':
      return <ShoppingBag className="w-4 h-4" strokeWidth={1.85} />;
    case 'training_catalog':
      return <GraduationCap className="w-4 h-4" strokeWidth={1.85} />;
    case 'fnb_catalog':
      return <UtensilsCrossed className="w-4 h-4" strokeWidth={1.85} />;
    case 'fnb_hero_slider':
      return <Coffee className="w-4 h-4" strokeWidth={1.85} />;
    case 'culinary_spin_slider':
      return <Disc3 className="w-4 h-4" strokeWidth={1.85} />;
    case 'floating_product_studio':
      return <Shirt className="w-4 h-4" strokeWidth={1.85} />;
    case 'interactive_box_showcase':
    case 'product_box_reveal':
      return <Package className="w-4 h-4" strokeWidth={1.85} />;
    case 'carousel':
      return <Images className="w-4 h-4" strokeWidth={1.85} />;
    case 'social_feed':
      return <Share2 className="w-4 h-4" strokeWidth={1.85} />;
    case 'social_follower':
      return <UserCheck className="w-4 h-4" strokeWidth={1.85} />;
    case 'hero_profile':
      return <PanelTop className="w-4 h-4" strokeWidth={1.85} />;
    case 'showcase_card':
      return <Sparkles className="w-4 h-4" strokeWidth={1.85} />;
    default:
      return <Bookmark className="w-4 h-4" strokeWidth={1.85} />;
  }
}

const CATEGORY_LABEL_MAP: Record<PrebuiltSectionCategory, string> = {
  kartu_info: 'Kartu & Info',
  katalog_store: 'Katalog & Store',
  event_kegiatan: 'Event & Kegiatan',
  tarif_paket: 'Tarif & Paket',
  hero_profil: 'Hero & Profil',
  menu_layout: 'Menu & Grid',
  kontak_medsos: 'Medsos & Kontak',
};

export function LeftSidebar({
  onAddBlock,
  onAddSection,
  itemTemplates = [],
  onAddItemTemplate,
  onOpenSaveItemTemplate,
  onDeleteItemTemplate,
  onUpdateItemTemplate,
  blocks,
  pages = [],
  activeSubPageId = null,
  onSelectSubPage,
  onAddSubPage,
  onUpdateSubPage,
  onDuplicateSubPage,
  onDeleteSubPage,
  selectedId,
  selectedSubLayerId = null,
  theme,
  advanceOptions,
  bottomNavbar,
  activeNavItemId,
  navbarFocusNonce = 0,
  layerFocusNonce = 0,
  onSelectTheme,
  onUpdateAdvanceOptions,
  onUpdateBottomNavbar,
  onSelectNavItem,
  onSelectBlock,
  onSelectSubLayer,
  onToggleSubLayerVisibility,
  onToggleSubLayerLock,
  onDeleteSubLayer,
  onMoveBlock,
  onReorderBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onUpdateBlock,
  onResetPageThemeOverrides,
  onAddChildToContainer,
  webTemplates = [],
  webTemplatesLoading = false,
  currentUser = null,
  canEditCanvas = true,
  canCreateProject = true,
  onOpenSaveWebTemplate,
  onOpenEditWebTemplate,
  onApplyWebTemplate,
  onCreateProjectFromWebTemplate,
  onOverwriteWebTemplateFromCanvas,
  onDeleteWebTemplate,
  onImportWebTemplateJson,
  onRefreshWebTemplates,
}: LeftSidebarProps) {
  const { label, isVisible } = useUiLabel();
  const [activeTab, setActiveTab] = useState<SidebarTab>('alat');
  const [query, setQuery] = useState('');
  const [selectedBlockCategory, setSelectedBlockCategory] = useState<
    'semua' | 'item_template' | PrebuiltSectionCategory
  >('semua');
  const [previewBeforeInsert, setPreviewBeforeInsert] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.localStorage.getItem(PREVIEW_MODE_LS_KEY) === '1';
    } catch {
      return false;
    }
  });
  const [previewItem, setPreviewItem] = useState<ItemPreviewPayload | null>(null);
  const [confirmDeleteTemplateId, setConfirmDeleteTemplateId] = useState<string | null>(null);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTemplateName, setEditingTemplateName] = useState<string>('');

  const togglePreviewBeforeInsert = () => {
    setPreviewBeforeInsert((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(PREVIEW_MODE_LS_KEY, next ? '1' : '0');
      } catch {
        // ignore storage error
      }
      return next;
    });
  };

  const prevNavbarFocusNonceRef = useRef(navbarFocusNonce);
  const prevLayerFocusNonceRef = useRef(layerFocusNonce);
  const selectedIdRef = useRef(selectedId);
  const bottomNavbarItemsRef = useRef(bottomNavbar.items);
  selectedIdRef.current = selectedId;
  bottomNavbarItemsRef.current = bottomNavbar.items;

  useEffect(() => {
    if (navbarFocusNonce > prevNavbarFocusNonceRef.current) {
      prevNavbarFocusNonceRef.current = navbarFocusNonce;
      setActiveTab('tema');
    } else {
      prevNavbarFocusNonceRef.current = navbarFocusNonce;
    }
  }, [navbarFocusNonce]);

  useEffect(() => {
    if (layerFocusNonce > prevLayerFocusNonceRef.current) {
      prevLayerFocusNonceRef.current = layerFocusNonce;
      const curSelectedId = selectedIdRef.current;
      const isInNavSheet = Boolean(
        curSelectedId &&
          bottomNavbarItemsRef.current.some((it) => hasBlockInTree(it.children, curSelectedId))
      );
      setActiveTab(isInNavSheet ? 'tema' : 'layer');
    } else {
      prevLayerFocusNonceRef.current = layerFocusNonce;
    }
  }, [layerFocusNonce]);

  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    return TOOL_ITEMS.filter((item) => {
      if (!isVisible(`alat.tool.${item.key}`)) return false;
      if (!q) return true;
      const displayLabel = label(`alat.tool.${item.key}`, item.label);
      return (
        displayLabel.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
      );
    });
  }, [query, label, isVisible]);

  const filteredSections = useMemo(() => {
    if (selectedBlockCategory === 'item_template') return [];
    const q = query.trim().toLowerCase();
    return PREBUILT_SECTIONS.filter((sec) => {
      if (!isVisible(`blok.sec.${sec.id}`)) return false;
      if (selectedBlockCategory !== 'semua' && sec.category !== selectedBlockCategory) {
        return false;
      }
      if (!q) return true;
      const displayTitle = label(`blok.sec.${sec.id}`, sec.title);
      const catLabel = CATEGORY_LABEL_MAP[sec.category] ?? '';
      return (
        displayTitle.toLowerCase().includes(q) ||
        sec.title.toLowerCase().includes(q) ||
        sec.description.toLowerCase().includes(q) ||
        catLabel.toLowerCase().includes(q)
      );
    });
  }, [query, selectedBlockCategory, label, isVisible]);

  const alatTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return itemTemplates.filter((tpl) => {
      if (tpl.target !== 'alat') return false;
      if (!q) return true;
      const typeName = BLOCK_TYPE_NAMES[tpl.blockType] ?? tpl.blockType;
      return (
        tpl.name.toLowerCase().includes(q) ||
        (tpl.description ?? '').toLowerCase().includes(q) ||
        typeName.toLowerCase().includes(q)
      );
    });
  }, [itemTemplates, query]);

  const blokTemplates = useMemo(() => {
    const q = query.trim().toLowerCase();
    return itemTemplates.filter((tpl) => {
      if (tpl.target !== 'blok') return false;
      if (!q) return true;
      const typeName = BLOCK_TYPE_NAMES[tpl.blockType] ?? tpl.blockType;
      return (
        tpl.name.toLowerCase().includes(q) ||
        (tpl.description ?? '').toLowerCase().includes(q) ||
        typeName.toLowerCase().includes(q)
      );
    });
  }, [itemTemplates, query]);

  const totalBlokTemplatesCount = useMemo(
    () => itemTemplates.filter((t) => t.target === 'blok').length,
    [itemTemplates]
  );

  const openToolPreview = (item: ToolPaletteItem, displayLabel: string) => {
    if (item.sectionId) {
      const sec = PREBUILT_SECTIONS.find((s) => s.id === item.sectionId);
      if (sec) {
        setPreviewItem({
          title: displayLabel,
          description: item.desc,
          badge: 'Alat',
          icon: item.icon,
          blocks: sec.createBlocks(theme),
          onInsert: () => onAddSection(sec),
        });
        return;
      }
    }
    const previewBlock =
      item.toolPreset === 'png'
        ? createPngImageBlock(theme)
        : createBlock(item.type, theme);
    setPreviewItem({
      title: displayLabel,
      description: item.desc,
      badge: item.toolPreset === 'png' ? 'Alat PNG 3D' : 'Alat Mandiri',
      icon: item.icon,
      blocks: [previewBlock],
      onInsert: () => onAddBlock(item.type, item.toolPreset),
    });
  };

  const openSectionPreview = (section: PrebuiltSection, displayTitle: string) => {
    const catLabel = CATEGORY_LABEL_MAP[section.category] ?? 'Blok';
    setPreviewItem({
      title: displayTitle,
      description: section.description,
      badge: `Blok · ${catLabel}`,
      icon: getSectionIcon(section.id),
      blocks: section.createBlocks(theme),
      onInsert: () => onAddSection(section),
    });
  };

  const openSavedTemplatePreview = (tpl: SavedItemTemplate) => {
    setPreviewItem({
      title: tpl.name,
      description:
        tpl.description ||
        `Item Template tersimpan (${BLOCK_TYPE_NAMES[tpl.blockType] ?? tpl.blockType})`,
      badge: `Item Template · ${tpl.target === 'alat' ? 'Alat' : 'Blok'}`,
      icon: getBlockTypePaletteIcon(tpl.blockType),
      blocks: [tpl.block],
      onInsert: () => onAddItemTemplate?.(tpl),
    });
  };

  const handleSaveInlineRename = (tplId: string) => {
    const clean = editingTemplateName.trim();
    if (clean) {
      onUpdateItemTemplate?.(tplId, { name: clean });
    }
    setEditingTemplateId(null);
    setEditingTemplateName('');
  };

  const renderSavedTemplatesSection = (
    target: SavedItemTemplateTarget,
    templatesList: SavedItemTemplate[]
  ) => {
    const otherTarget: SavedItemTemplateTarget = target === 'alat' ? 'blok' : 'alat';
    const otherLabel = otherTarget === 'alat' ? 'Alat' : 'Blok';

    return (
      <div className="space-y-1.5 rounded-xl border border-[#DCE5EF] bg-[#F8FAFC]/80 p-2">
        <div className="flex items-center justify-between gap-1.5">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="w-5 h-5 rounded-md bg-[#ECFDF6] border border-[#00C98A]/35 text-[#00A873] flex items-center justify-center shrink-0">
              <Bookmark className="w-3 h-3" />
            </span>
            <span className="text-[11px] font-bold text-[#17243D] truncate">
              Item Template ({templatesList.length})
            </span>
          </div>
          {onOpenSaveItemTemplate && (
            <button
              type="button"
              disabled={!selectedId}
              onClick={() => onOpenSaveItemTemplate(target)}
              title={
                selectedId
                  ? `Simpan elemen yang sedang dipilih di Canvas ke Item Template (${target === 'alat' ? 'Alat' : 'Blok'})`
                  : 'Pilih satu elemen di Canvas terlebih dahulu untuk disimpan sebagai Item Template'
              }
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-[#00C98A] hover:bg-[#00B078] disabled:bg-[#DCE5EF] disabled:text-[#8FA4BF] text-white text-[10px] font-semibold transition-colors cursor-pointer disabled:cursor-not-allowed shrink-0"
            >
              <BookmarkPlus className="w-3 h-3" />
              <span>Simpan</span>
            </button>
          )}
        </div>

        {templatesList.length === 0 ? (
          <div className="rounded-lg border border-dashed border-[#CBD5E1] bg-white/80 px-2.5 py-2 text-[10.5px] text-[#64748B] leading-snug">
            {query.trim()
              ? 'Tidak ada Item Template yang cocok dengan pencarian.'
              : selectedId
              ? `Klik "Simpan" untuk menyimpan desain terpilih di Canvas ke koleksi Item Template ${target === 'alat' ? 'Alat' : 'Blok'}.`
              : 'Pilih elemen di Canvas lalu klik tombol simpan untuk memperkaya koleksi Item Template Anda.'}
          </div>
        ) : (
          <div className="flex flex-col gap-1.5">
            {templatesList.map((tpl) => {
              const typeLabel = BLOCK_TYPE_NAMES[tpl.blockType] ?? tpl.blockType;
              const elementCount = countNestedBlocks([tpl.block]);
              const isConfirmDelete = confirmDeleteTemplateId === tpl.id;
              const isEditing = editingTemplateId === tpl.id;

              return (
                <div
                  key={tpl.id}
                  draggable={!isEditing}
                  onDragStart={(e) => {
                    if (isEditing) {
                      e.preventDefault();
                      return;
                    }
                    e.dataTransfer.setData('application/lynk-item-template-id', tpl.id);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] transition-colors group overflow-hidden"
                >
                  {isEditing ? (
                    <div className="p-2 flex items-center gap-1">
                      <input
                        type="text"
                        autoFocus
                        value={editingTemplateName}
                        onChange={(e) => setEditingTemplateName(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveInlineRename(tpl.id);
                          if (e.key === 'Escape') {
                            setEditingTemplateId(null);
                            setEditingTemplateName('');
                          }
                        }}
                        className="flex-1 min-w-0 px-2 py-1 text-[11.5px] rounded-md border border-[#00C98A] bg-white text-[#17243D] outline-none"
                      />
                      <button
                        type="button"
                        onClick={() => handleSaveInlineRename(tpl.id)}
                        title="Simpan nama"
                        className="p-1 rounded-md bg-[#00C98A] text-white hover:bg-[#00B078] cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingTemplateId(null);
                          setEditingTemplateName('');
                        }}
                        title="Batal"
                        className="p-1 rounded-md border border-[#DCE5EF] text-[#5B708B] hover:bg-[#F0F5FA] cursor-pointer"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-stretch">
                      <button
                        type="button"
                        title={
                          previewBeforeInsert
                            ? `Klik untuk pratinjau "${tpl.name}" (atau seret ke Canvas)`
                            : `Klik untuk masukkan "${tpl.name}" ke Canvas (atau seret)`
                        }
                        onClick={() => {
                          if (previewBeforeInsert) {
                            openSavedTemplatePreview(tpl);
                          } else {
                            onAddItemTemplate?.(tpl);
                          }
                        }}
                        className="flex-1 flex items-center gap-2 px-2 py-2 text-left hover:bg-[#F0F5FA]/70 transition-colors cursor-pointer min-w-0"
                      >
                        <span className="w-6 h-6 rounded-md bg-[#ECFDF6] text-[#00A873] shrink-0 flex items-center justify-center">
                          {getBlockTypePaletteIcon(tpl.blockType)}
                        </span>
                        <div className="min-w-0 flex-1">
                          <div className="text-[11.5px] font-semibold text-[#17243D] truncate">
                            {tpl.name}
                          </div>
                          <div className="text-[9.5px] text-[#8FA4BF] truncate">
                            {tpl.description
                              ? tpl.description
                              : `${typeLabel} · ${elementCount} lapisan`}
                          </div>
                        </div>
                      </button>

                      {/* Action icons */}
                      <div className="flex items-center gap-0.5 pr-1.5 pl-0.5 bg-white shrink-0">
                        <button
                          type="button"
                          onClick={() => openSavedTemplatePreview(tpl)}
                          title="Pratinjau Item Template"
                          aria-label={`Pratinjau ${tpl.name}`}
                          className="p-1 rounded-md text-[#64748B] hover:text-[#00A873] hover:bg-[#ECFDF6] transition-colors cursor-pointer"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        {onUpdateItemTemplate && (
                          <button
                            type="button"
                            onClick={() =>
                              onUpdateItemTemplate(tpl.id, { target: otherTarget })
                            }
                            title={`Pindahkan ke tab ${otherLabel}`}
                            aria-label={`Pindahkan ${tpl.name} ke ${otherLabel}`}
                            className="p-1 rounded-md text-[#64748B] hover:text-[#17243D] hover:bg-[#F0F5FA] transition-colors cursor-pointer"
                          >
                            <ArrowLeftRight className="w-3 h-3" />
                          </button>
                        )}
                        {onUpdateItemTemplate && (
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTemplateId(tpl.id);
                              setEditingTemplateName(tpl.name);
                              setConfirmDeleteTemplateId(null);
                            }}
                            title="Ubah nama Item Template"
                            aria-label={`Ubah nama ${tpl.name}`}
                            className="p-1 rounded-md text-[#64748B] hover:text-[#17243D] hover:bg-[#F0F5FA] transition-colors cursor-pointer"
                          >
                            <Pencil className="w-3 h-3" />
                          </button>
                        )}
                        {onDeleteItemTemplate &&
                          (isConfirmDelete ? (
                            <div className="flex items-center gap-0.5">
                              <button
                                type="button"
                                onClick={() => {
                                  onDeleteItemTemplate(tpl.id);
                                  setConfirmDeleteTemplateId(null);
                                }}
                                title="Konfirmasi hapus"
                                className="p-1 rounded-md bg-rose-600 text-white hover:bg-rose-700 cursor-pointer"
                              >
                                <Check className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => setConfirmDeleteTemplateId(null)}
                                title="Batal hapus"
                                className="p-1 rounded-md border border-[#DCE5EF] text-[#5B708B] hover:bg-[#F0F5FA] cursor-pointer"
                              >
                                <X className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setConfirmDeleteTemplateId(tpl.id)}
                              title="Hapus Item Template"
                              aria-label={`Hapus ${tpl.name}`}
                              className="p-1 rounded-md text-[#8FA4BF] hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          ))}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="w-64 xl:w-[19%] min-w-[240px] max-w-[300px] bg-white border-r border-[#DCE5EF] flex flex-col shrink-0 h-full overflow-hidden">
      {/* 4 Tabs: Alat, Blok, Tema, Layer */}
      <div
        role="tablist"
        aria-label="Navigasi Panel Kiri"
        className="grid grid-cols-4 border-b border-[#DCE5EF] bg-white shrink-0"
      >
        {(
          [
            { id: 'alat', label: label('alat.tab', 'Alat'), icon: <Wrench className="w-3.5 h-3.5" /> },
            { id: 'blok', label: label('blok.tab', 'Blok'), icon: <LayoutGrid className="w-3.5 h-3.5" /> },
            { id: 'tema', label: label('tema.tab', 'Tema'), icon: <Palette className="w-3.5 h-3.5" /> },
            { id: 'layer', label: label('layer.tab', 'Layer'), icon: <Layers className="w-3.5 h-3.5" /> },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1 py-2.5 px-1 text-[11px] font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? 'border-[#00C98A] text-[#17243D] bg-[#F0F5FA]/45'
                  : 'border-transparent text-[#8FA4BF] hover:text-[#17243D] hover:bg-[#F0F5FA]/30'
              }`}
            >
              <span className={active ? 'text-[#00C98A]' : 'text-[#8FA4BF]'}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Quick Filter & Preview Mode Option (Alat & Blok only) */}
      {(activeTab === 'alat' || activeTab === 'blok') && (
        <div className="px-2.5 pt-2.5 pb-1.5 shrink-0 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8FA4BF] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                activeTab === 'alat'
                  ? label('alat.search', 'Cari alat / item template...')
                  : label('blok.search', 'Cari blok / item template...')
              }
              aria-label={activeTab === 'alat' ? label('alat.search', 'Cari alat') : label('blok.search', 'Cari blok')}
              className="w-full pl-8 pr-2.5 py-1.5 text-[12px] rounded-lg border border-[#DCE5EF] bg-[#F0F5FA]/50 text-[#17243D] placeholder:text-[#8FA4BF] outline-none focus:bg-white focus:border-[#00C98A] transition-colors"
            />
          </div>

          {/* Preview Item Before Insert Toggle */}
          <button
            type="button"
            onClick={togglePreviewBeforeInsert}
            aria-pressed={previewBeforeInsert}
            title="Jika aktif, mengklik item akan menampilkan pratinjau dulu sebelum masuk ke Canvas. Anda juga selalu bisa klik ikon mata pada setiap item."
            className={`w-full flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold transition-colors cursor-pointer ${
              previewBeforeInsert
                ? 'bg-[#ECFDF6] border-[#00C98A] text-[#065F46]'
                : 'bg-[#F8FAFC] border-[#DCE5EF] text-[#51637D] hover:border-[#00C98A]/60 hover:text-[#17243D]'
            }`}
          >
            <span className="inline-flex items-center gap-1.5 min-w-0 truncate">
              <Eye
                className={`w-3.5 h-3.5 shrink-0 ${
                  previewBeforeInsert ? 'text-[#00A873]' : 'text-[#8FA4BF]'
                }`}
              />
              <span className="truncate">Preview sebelum masuk</span>
            </span>
            <span
              className={`w-7 h-4 rounded-full p-0.5 transition-colors flex items-center shrink-0 ${
                previewBeforeInsert ? 'bg-[#00C98A] justify-end' : 'bg-[#CBD5E1] justify-start'
              }`}
            >
              <span className="w-3 h-3 rounded-full bg-white shadow-xs block" />
            </span>
          </button>

          {activeTab === 'blok' && (
            <div className="flex flex-wrap gap-1" role="group" aria-label="Kategori Blok">
              {PREBUILT_SECTION_CATEGORIES.filter((cat) => isVisible(`blok.cat.${cat.id}`)).map((cat) => {
                const active = selectedBlockCategory === cat.id;
                return (
                  <button
                    key={cat.id}
                    type="button"
                    onClick={() => setSelectedBlockCategory(cat.id)}
                    className={`px-2 py-1 rounded-md text-[10.5px] font-semibold border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#17243D] text-white border-[#17243D]'
                        : 'bg-[#F8FAFC] text-[#5B708B] border-[#DCE5EF] hover:border-[#00C98A] hover:text-[#17243D]'
                    }`}
                  >
                    {label(`blok.cat.${cat.id}`, cat.label)}
                  </button>
                );
              })}
              <button
                type="button"
                onClick={() => setSelectedBlockCategory('item_template')}
                className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-[10.5px] font-semibold border transition-colors cursor-pointer ${
                  selectedBlockCategory === 'item_template'
                    ? 'bg-[#00C98A] text-white border-[#00C98A]'
                    : 'bg-[#ECFDF6] text-[#008F63] border-[#00C98A]/40 hover:border-[#00C98A]'
                }`}
              >
                <Bookmark className="w-3 h-3" />
                <span>Item Template</span>
                {totalBlokTemplatesCount > 0 && (
                  <span
                    className={`px-1 rounded text-[9.5px] font-bold ${
                      selectedBlockCategory === 'item_template'
                        ? 'bg-white/25 text-white'
                        : 'bg-[#00C98A]/15 text-[#065F46]'
                    }`}
                  >
                    {totalBlokTemplatesCount}
                  </span>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Body */}
      {activeTab === 'tema' || activeTab === 'layer' ? (
        <HomePageSettings
          panelMode={activeTab === 'layer' ? 'layer' : 'tema'}
          blocks={blocks}
          pages={pages}
          activeSubPageId={activeSubPageId}
          onSelectSubPage={onSelectSubPage}
          onAddSubPage={onAddSubPage}
          onUpdateSubPage={onUpdateSubPage}
          onDuplicateSubPage={onDuplicateSubPage}
          onDeleteSubPage={onDeleteSubPage}
          selectedId={selectedId}
          selectedSubLayerId={selectedSubLayerId}
          theme={theme}
          advanceOptions={advanceOptions}
          bottomNavbar={bottomNavbar}
          activeNavItemId={activeNavItemId}
          navbarFocusNonce={navbarFocusNonce}
          layerFocusNonce={layerFocusNonce}
          onSelectTheme={onSelectTheme}
          onUpdateAdvanceOptions={onUpdateAdvanceOptions}
          onUpdateBottomNavbar={onUpdateBottomNavbar}
          onSelectNavItem={onSelectNavItem}
          onSelectBlock={onSelectBlock}
          onSelectSubLayer={onSelectSubLayer}
          onToggleSubLayerVisibility={onToggleSubLayerVisibility}
          onToggleSubLayerLock={onToggleSubLayerLock}
          onDeleteSubLayer={onDeleteSubLayer}
          onMoveBlock={onMoveBlock}
          onReorderBlock={onReorderBlock}
          onDuplicateBlock={onDuplicateBlock}
          onDeleteBlock={onDeleteBlock}
          onUpdateBlock={onUpdateBlock}
          onResetPageThemeOverrides={onResetPageThemeOverrides}
          onAddChildToContainer={onAddChildToContainer}
          webTemplates={webTemplates}
          webTemplatesLoading={webTemplatesLoading}
          currentUser={currentUser}
          canEditCanvas={canEditCanvas}
          canCreateProject={canCreateProject}
          onOpenSaveWebTemplate={onOpenSaveWebTemplate}
          onOpenEditWebTemplate={onOpenEditWebTemplate}
          onApplyWebTemplate={onApplyWebTemplate}
          onCreateProjectFromWebTemplate={onCreateProjectFromWebTemplate}
          onOverwriteWebTemplateFromCanvas={onOverwriteWebTemplateFromCanvas}
          onDeleteWebTemplate={onDeleteWebTemplate}
          onImportWebTemplateJson={onImportWebTemplateJson}
          onRefreshWebTemplates={onRefreshWebTemplates}
        />
      ) : (
      <div className="flex-1 overflow-y-auto px-2.5 pb-4 pt-1">
        {activeTab === 'alat' && (
          <div className="space-y-3">
            {/* Saved Item Template for Alat */}
            {renderSavedTemplatesSection('alat', alatTemplates)}

            {/* Built-in Alat Mandiri */}
            <div className="space-y-2">
              <div className="px-0.5 space-y-0.5">
                <div className="flex items-center justify-between text-[10.5px] font-semibold text-[#51637D]">
                  <span>{label('alat.header', 'Alat Mandiri')} ({filteredTools.length})</span>
                  {isVisible('alat.hint.dragClick') && (
                    <span className="text-[9.5px] font-medium text-[#8FA4BF]">
                      {previewBeforeInsert
                        ? 'Klik = Preview'
                        : label('alat.hint.dragClick', 'Seret / Klik')}
                    </span>
                  )}
                </div>
                {isVisible('alat.desc') && (
                  <p className="text-[10px] text-[#8FA4BF] leading-snug">
                    {label('alat.desc', 'Komponen dasar atomik untuk menyusun halaman bebas dari awal.')}
                  </p>
                )}
              </div>
              {filteredTools.length === 0 ? (
                <div className="py-6 px-3 text-center text-xs text-[#8FA4BF] border border-dashed border-[#DCE5EF] rounded-xl">
                  Alat tidak ditemukan.
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-1.5">
                  {filteredTools.map((item) => {
                    const displayLabel = label(`alat.tool.${item.key}`, item.label);
                    return (
                      <div
                        key={item.key}
                        draggable
                        onDragStart={(e) => {
                          if (item.sectionId) {
                            e.dataTransfer.setData('application/lynk-section-id', item.sectionId);
                          } else {
                            e.dataTransfer.setData('application/lynk-block-type', item.type);
                            if (item.toolPreset) {
                              e.dataTransfer.setData('application/lynk-block-preset', item.toolPreset);
                            }
                          }
                          e.dataTransfer.effectAllowed = 'copy';
                        }}
                        className="relative flex items-center rounded-lg border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] hover:border-[#00C98A] transition-colors group min-w-0 overflow-hidden"
                      >
                        <button
                          type="button"
                          title={
                            previewBeforeInsert
                              ? `Preview ${displayLabel} — ${item.desc}`
                              : `${displayLabel} — ${item.desc}`
                          }
                          onClick={() => {
                            if (previewBeforeInsert) {
                              openToolPreview(item, displayLabel);
                              return;
                            }
                            if (item.sectionId) {
                              const sec = PREBUILT_SECTIONS.find((s) => s.id === item.sectionId);
                              if (sec) {
                                onAddSection(sec);
                                return;
                              }
                            }
                            onAddBlock(item.type, item.toolPreset);
                          }}
                          className="flex-1 flex items-center gap-1.5 pl-2 pr-1 py-2.5 text-left cursor-pointer min-w-0"
                        >
                          <span className="text-[#8FA4BF] group-hover:text-[#00C98A] shrink-0 flex items-center justify-center transition-colors">
                            {item.icon}
                          </span>
                          <span className="text-[11px] font-medium text-[#17243D] truncate min-w-0">
                            {displayLabel}
                          </span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            openToolPreview(item, displayLabel);
                          }}
                          title={`Preview ${displayLabel}`}
                          aria-label={`Preview ${displayLabel}`}
                          className="p-1.5 mr-0.5 rounded-md text-[#94A3B8] hover:text-[#00A873] hover:bg-[#ECFDF6] transition-colors cursor-pointer shrink-0"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'blok' && (
          <div className="space-y-3">
            {/* Saved Item Template for Blok */}
            {(selectedBlockCategory === 'semua' || selectedBlockCategory === 'item_template') &&
              renderSavedTemplatesSection('blok', blokTemplates)}

            {/* Built-in Template Blok & Card */}
            {selectedBlockCategory !== 'item_template' && (
              <div className="space-y-2">
                <div className="px-0.5 space-y-0.5">
                  <div className="flex items-center justify-between text-[10.5px] font-semibold text-[#51637D]">
                    <span>{label('blok.header', 'Template Blok & Card')} ({filteredSections.length})</span>
                    {isVisible('blok.badge.ready') && (
                      <span className="text-[9.5px] font-medium text-[#008F63]">
                        {previewBeforeInsert
                          ? 'Klik = Preview'
                          : label('blok.badge.ready', 'Siap Pakai')}
                      </span>
                    )}
                  </div>
                  {isVisible('blok.desc') && (
                    <p className="text-[10px] text-[#8FA4BF] leading-snug">
                      {label('blok.desc', 'Template bagian jadi berisi kombinasi elemen & data contoh siap edit.')}
                    </p>
                  )}
                </div>
                {filteredSections.length === 0 ? (
                  <div className="py-6 px-3 text-center text-xs text-[#8FA4BF] border border-dashed border-[#DCE5EF] rounded-xl">
                    Blok tidak ditemukan.
                  </div>
                ) : (
                  <div className="flex flex-col gap-1.5">
                    {filteredSections.map((section) => {
                      const displayTitle = label(`blok.sec.${section.id}`, section.title);
                      const catLabel = CATEGORY_LABEL_MAP[section.category];
                      return (
                        <div
                          key={section.id}
                          draggable
                          onDragStart={(e) => {
                            e.dataTransfer.setData('application/lynk-section-id', section.id);
                            e.dataTransfer.effectAllowed = 'copy';
                          }}
                          className="w-full flex items-center rounded-lg border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] hover:border-[#00C98A] transition-colors group min-w-0 overflow-hidden"
                        >
                          <button
                            type="button"
                            title={
                              previewBeforeInsert
                                ? `Preview ${displayTitle} — ${section.description}`
                                : `${displayTitle} — ${section.description}`
                            }
                            onClick={() => {
                              if (previewBeforeInsert) {
                                openSectionPreview(section, displayTitle);
                              } else {
                                onAddSection(section);
                              }
                            }}
                            className="flex-1 flex items-center gap-2.5 pl-2.5 pr-1.5 py-2.5 text-left cursor-pointer min-w-0"
                          >
                            <span className="w-7 h-7 rounded-md bg-[#F0F5FA] group-hover:bg-[#ECFDF6] text-[#8FA4BF] group-hover:text-[#00C98A] shrink-0 flex items-center justify-center transition-colors">
                              {getSectionIcon(section.id)}
                            </span>
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[12px] font-semibold text-[#17243D] truncate">
                                  {displayTitle}
                                </span>
                              </div>
                              <div className="text-[10.5px] text-[#8FA4BF] truncate">
                                {section.description}
                              </div>
                              <div className="flex items-center gap-1 mt-1 flex-wrap">
                                {selectedBlockCategory === 'semua' && catLabel && (
                                  <span className="inline-block px-1.5 py-0.5 rounded bg-[#F0F5FA] text-[9.5px] font-semibold text-[#5B708B]">
                                    {catLabel}
                                  </span>
                                )}
                                <span className="inline-block px-1.5 py-0.5 rounded bg-[#ECFDF6] text-[9px] font-semibold text-[#008F63]">
                                  Template
                                </span>
                              </div>
                            </div>
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              openSectionPreview(section, displayTitle);
                            }}
                            title={`Preview ${displayTitle}`}
                            aria-label={`Preview ${displayTitle}`}
                            className="p-2 mr-1 rounded-lg text-[#8FA4BF] hover:text-[#00A873] hover:bg-[#ECFDF6] transition-colors cursor-pointer shrink-0"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* Live Preview Modal before inserting item to Canvas */}
      <ItemPreviewModal
        item={previewItem}
        theme={theme}
        advanceOptions={advanceOptions}
        onClose={() => setPreviewItem(null)}
      />
    </aside>
  );
}

