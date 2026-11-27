import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowDown,
  ArrowLeft,
  ArrowUp,
  Award,
  BadgeCheck,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronsUpDown,
  Coffee,
  Columns2,
  Columns3,
  Copy,
  CornerLeftUp,
  Disc3,
  Eye,
  EyeOff,
  FilePlus2,
  Files,
  FileText,
  Globe,
  GraduationCap,
  Grid3X3,
  GripVertical,
  Image as ImageIcon,
  Images,
  Layers,
  LayoutGrid,
  Link2,
  ListOrdered,
  Lock,
  Mail,
  MapPin,
  Minus,
  MousePointerClick,
  Newspaper,
  Package,
  Palette,
  PanelBottom,
  PanelBottomOpen,
  PanelTop,
  Pencil,
  Plus,
  Quote,
  RotateCcw,
  Shapes,
  Share2,
  Shirt,
  ShoppingBag,
  ShoppingCart,
  SlidersHorizontal,
  Sparkles,
  Square,
  Store,
  Tag,
  Tags,
  Ticket,
  Trash2,
  Type,
  Unlock,
  UserCheck,
  Users,
  UtensilsCrossed,
  Video,
} from 'lucide-react';
import {
  AdvanceOptions,
  AuthUser,
  BlockType,
  BottomNavbarConfig,
  BottomNavbarItem,
  BottomNavbarItemAction,
  BuilderBlock,
  BuilderSubPage,
  MenuIconSheetPosition,
  PageTheme,
  SavedWebTemplate,
  ShadowPreset,
} from '../../types/builder';
import {
  BLOCK_TYPE_NAMES,
  THEMES,
  createBlock,
  resolveNavbarMetrics,
} from '../../data/presets';
import { resolveButtonIcon } from '../../utils/buttonIcons';
import { FONT_OPTIONS } from '../../utils/fontHelpers';
import { useUiLabel } from '../../contexts/UiLabelsContext';
import {
  countDirectNestedChildren,
  findParentBlockId,
  hasBlockNestedChildren,
  resolveExpandedLayerGroupsForSelection,
} from '../../utils/treeHelpers';
import {
  ExtractedSubLayer,
  SubLayerIconKind,
  extractBlockSubLayers,
} from '../../utils/layerStructure';
import {
  moveFnbCatalogEntry,
  reorderFnbCatalogEntries,
  resolveOrderedFnbEntries,
} from '../../utils/fnbHelpers';
import { getBlockThemeStatus } from '../../utils/blockThemeHelpers';
import { ButtonGlyph } from '../ButtonIcon';
import { IconPicker } from '../IconPicker';
import { SocialGlyph } from '../SocialIcon';
import { AccordionSection, SliderRow, ToggleSwitch } from './InspectorPrimitives';
import { WebTemplatesSection } from './WebTemplatesSection';

interface HomePageSettingsProps {
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
  onMoveBlockIntoFnbAt?: (
    draggedBlockId: string,
    fnbCatalogId: string,
    targetEntryKey: string,
    position: 'before' | 'after'
  ) => void;
  onDropNewBlock?: (
    type: BlockType,
    targetId?: string,
    position?: 'before' | 'after' | 'inside',
    toolPreset?: 'png'
  ) => void;
  onDropSection?: (
    sectionId: string,
    targetId?: string,
    position?: 'before' | 'after' | 'inside'
  ) => void;
  onDropItemTemplate?: (
    templateId: string,
    targetId?: string,
    position?: 'before' | 'after' | 'inside'
  ) => void;
  onDuplicateBlock?: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onAddChildToContainer: (containerId: string, type: BlockType) => void;
  onUpdateBlock?: (id: string, updater: (block: BuilderBlock) => BuilderBlock) => void;
  onResetPageThemeOverrides?: () => void;
  panelMode?: 'all' | 'tema' | 'layer';
  // Template Web (Simpan & Bagikan 1 Halaman Penuh + Sub Halaman untuk Multi-User)
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

type HomeSectionId = 'temaGlobal' | 'webTemplates' | 'pages' | 'top' | 'bottom';

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

function renderSubLayerIcon(kind: SubLayerIconKind, className = 'w-3 h-3') {
  switch (kind) {
    case 'image':
      return <ImageIcon className={className} />;
    case 'text':
      return <Type className={className} />;
    case 'card':
      return <LayoutGrid className={className} />;
    case 'sliders':
      return <SlidersHorizontal className={className} />;
    case 'cart':
      return <ShoppingCart className={className} />;
    case 'link':
      return <Link2 className={className} />;
    case 'map':
      return <MapPin className={className} />;
    case 'video':
      return <Video className={className} />;
    case 'list':
      return <ListOrdered className={className} />;
    case 'form':
      return <FileText className={className} />;
    case 'share':
      return <Share2 className={className} />;
    case 'sparkles':
      return <Sparkles className={className} />;
    case 'divider':
      return <Minus className={className} />;
    case 'back':
      return <ArrowLeft className={className} />;
    case 'layers':
    default:
      return <Layers className={className} />;
  }
}

function renderShowcaseVariantIcon(
  variant: BuilderBlock['content']['cardVariant'],
  className: string
): React.ReactNode {
  switch (variant) {
    case 'quote_banner':
      return <Quote className={className} strokeWidth={1.85} />;
    case 'news_banner':
      return <Newspaper className={className} strokeWidth={1.85} />;
    case 'event_poster':
      return <CalendarDays className={className} strokeWidth={1.85} />;
    case 'badge_tile':
      return <Award className={className} strokeWidth={1.85} />;
    case 'store_card':
      return <ShoppingBag className={className} strokeWidth={1.85} />;
    case 'popout_product':
      return <Sparkles className={className} strokeWidth={1.85} />;
    case 'activity_post':
      return <Users className={className} strokeWidth={1.85} />;
    case 'membership_ticket':
      return <Ticket className={className} strokeWidth={1.85} />;
    default:
      return <Sparkles className={className} strokeWidth={1.85} />;
  }
}

function renderBlockLayerIcon(blk: BuilderBlock, className = 'w-3.5 h-3.5'): React.ReactNode {
  const lbl = (blk.label || '').toLowerCase();

  switch (blk.type) {
    case 'text':
      return <Type className={className} strokeWidth={1.85} />;
    case 'image':
      return blk.content?.imagePngMode ? (
        <Sparkles className={className} strokeWidth={1.85} />
      ) : (
        <ImageIcon className={className} strokeWidth={1.85} />
      );
    case 'button':
      return <MousePointerClick className={className} strokeWidth={1.85} />;
    case 'cart_button':
      return <ShoppingCart className={className} strokeWidth={1.85} />;
    case 'back_button':
      return <ArrowLeft className={className} strokeWidth={1.85} />;
    case 'menu_icon':
      return <Shapes className={className} strokeWidth={1.85} />;
    case 'row': {
      const firstShowcaseChild = blk.children?.find((c) => c.type === 'showcase_card');
      if (firstShowcaseChild?.content?.cardVariant) {
        return renderShowcaseVariantIcon(firstShowcaseChild.content.cardVariant, className);
      }
      if (lbl.includes('kutipan') || lbl.includes('quote')) {
        return <Quote className={className} strokeWidth={1.85} />;
      }
      if (lbl.includes('berita') || lbl.includes('informasi')) {
        return <Newspaper className={className} strokeWidth={1.85} />;
      }
      if (lbl.includes('even') || lbl.includes('event') || lbl.includes('promo')) {
        return <CalendarDays className={className} strokeWidth={1.85} />;
      }
      if (lbl.includes('sertifikasi')) {
        return <Award className={className} strokeWidth={1.85} />;
      }
      if (lbl.includes('store') || lbl.includes('produk')) {
        return <ShoppingBag className={className} strokeWidth={1.85} />;
      }
      if (lbl.includes('feed') || lbl.includes('kegiatan')) {
        return <Users className={className} strokeWidth={1.85} />;
      }
      if (lbl.includes('tarif') || lbl.includes('tiket') || lbl.includes('keanggotaan')) {
        return <Ticket className={className} strokeWidth={1.85} />;
      }
      if (lbl.includes('menu') || lbl.includes('grid') || lbl.includes('spesial')) {
        return <Grid3X3 className={className} strokeWidth={1.85} />;
      }
      if (blk.content?.rowLayoutMode === 'horizontal' || lbl.includes('slide')) {
        return <Columns3 className={className} strokeWidth={1.85} />;
      }
      return <Columns2 className={className} strokeWidth={1.85} />;
    }
    case 'container': {
      if (lbl.includes('outlet') || lbl.includes('toko')) {
        return <Store className={className} strokeWidth={1.85} />;
      }
      if (lbl.includes('promo') || lbl.includes('gradasi')) {
        return <Sparkles className={className} strokeWidth={1.85} />;
      }
      if (lbl.includes('header') || lbl.includes('profil') || lbl.includes('hero')) {
        return <BadgeCheck className={className} strokeWidth={1.85} />;
      }
      if (lbl.includes('tautan') || lbl.includes('link')) {
        return <Link2 className={className} strokeWidth={1.85} />;
      }
      if (lbl.includes('produk') || lbl.includes('unggulan')) {
        return <Tag className={className} strokeWidth={1.85} />;
      }
      return <Square className={className} strokeWidth={1.85} />;
    }
    case 'toggle_container':
      return <ChevronsUpDown className={className} strokeWidth={1.85} />;
    case 'bottom_sheet':
      return <PanelBottomOpen className={className} strokeWidth={1.85} />;
    case 'category_tabs':
      return lbl.includes('slide') || lbl.includes('scroll') ? (
        <Tags className={className} strokeWidth={1.85} />
      ) : (
        <LayoutGrid className={className} strokeWidth={1.85} />
      );
    case 'form':
      return lbl.includes('newsletter') || lbl.includes('kontak') || lbl.includes('email') ? (
        <Mail className={className} strokeWidth={1.85} />
      ) : (
        <FileText className={className} strokeWidth={1.85} />
      );
    case 'divider':
      return <Minus className={className} strokeWidth={1.85} />;
    case 'maps_place':
      return <MapPin className={className} strokeWidth={1.85} />;
    case 'social':
    case 'social_feed':
      return <Share2 className={className} strokeWidth={1.85} />;
    case 'social_follower':
      return <UserCheck className={className} strokeWidth={1.85} />;
    case 'carousel':
      return <Images className={className} strokeWidth={1.85} />;
    case 'youtube':
      return <Video className={className} strokeWidth={1.85} />;
    case 'facebook_video':
      return <SocialGlyph platform="facebook" className={className} />;
    case 'tiktok_video':
      return <SocialGlyph platform="tiktok" className={className} />;
    case 'instagram_video':
      return <SocialGlyph platform="instagram" className={className} />;
    case 'hero_profile':
      return blk.content?.heroVariant === 'banner' ? (
        <PanelTop className={className} strokeWidth={1.85} />
      ) : (
        <UserCheck className={className} strokeWidth={1.85} />
      );
    case 'fnb_catalog':
      return <UtensilsCrossed className={className} strokeWidth={1.85} />;
    case 'fnb_hero_slider':
      return <Coffee className={className} strokeWidth={1.85} />;
    case 'culinary_spin_slider':
      return <Disc3 className={className} strokeWidth={1.85} />;
    case 'floating_product_studio':
      return <Shirt className={className} strokeWidth={1.85} />;
    case 'interactive_box_showcase':
    case 'product_box_reveal':
      return <Package className={className} strokeWidth={1.85} />;
    case 'mix_rasa':
    case 'slide_mix_rasa':
      return <Disc3 className={className} strokeWidth={1.85} />;
    case 'catalog':
      return blk.content?.catalogProductType === 'digital' || lbl.includes('digital') ? (
        <ShoppingBag className={className} strokeWidth={1.85} />
      ) : (
        <Package className={className} strokeWidth={1.85} />
      );
    case 'training_catalog':
      return <GraduationCap className={className} strokeWidth={1.85} />;
    case 'showcase_card':
      return renderShowcaseVariantIcon(blk.content?.cardVariant, className);
    default:
      return <Layers className={className} strokeWidth={1.85} />;
  }
}

export function HomePageSettings({
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
  onMoveBlockIntoFnbAt,
  onDropNewBlock,
  onDropSection,
  onDropItemTemplate,
  onDuplicateBlock,
  onDeleteBlock,
  onAddChildToContainer,
  onUpdateBlock,
  onResetPageThemeOverrides,
  panelMode = 'all',
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
}: HomePageSettingsProps) {
  const { label, isVisible } = useUiLabel();
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const showTema = panelMode === 'all' || panelMode === 'tema';
  const showLayer = panelMode === 'all' || panelMode === 'layer';
  const [openSections, setOpenSections] = useState<Record<HomeSectionId, boolean>>({
    temaGlobal: false,
    webTemplates: true,
    pages: true,
    top: false,
    bottom: false,
  });

  const [expandedLayerGroups, setExpandedLayerGroups] = useState<Record<string, boolean>>(() =>
    resolveExpandedLayerGroupsForSelection(
      blocks,
      selectedId,
      bottomNavbar.items
        .filter((it) => Array.isArray(it.children) && it.children.length > 0)
        .map((it) => ({ navId: it.id, children: it.children }))
    )
  );

  const [dragLayerId, setDragLayerId] = useState<string | null>(null);
  const [dragOverInfo, setDragOverInfo] = useState<{
    id: string;
    pos: 'before' | 'after' | 'inside';
  } | null>(null);
  const [dragFnbEntry, setDragFnbEntry] = useState<{
    catalogId: string;
    entryKey: string;
    blockId?: string;
  } | null>(null);
  const [dragOverFnbEntry, setDragOverFnbEntry] = useState<{
    catalogId: string;
    entryKey: string;
    pos: 'before' | 'after';
  } | null>(null);
  const [renamingBlockId, setRenamingBlockId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState('');
  const [expandedSubGroups, setExpandedSubGroups] = useState<Record<string, boolean>>({});
  const [layerItemSearch, setLayerItemSearch] = useState<Record<string, string>>({});

  const toggleSubLayerGroup = (subGroupKey: string) => {
    setExpandedSubGroups((prev) => ({
      ...prev,
      [subGroupKey]: !prev[subGroupKey],
    }));
  };

  const startRenameBlock = (blk: BuilderBlock) => {
    setRenamingBlockId(blk.id);
    setRenameDraft(
      blk.label?.trim() || label(`komponen.type.${blk.type}`, BLOCK_TYPE_NAMES[blk.type])
    );
  };

  const commitRenameBlock = (blk: BuilderBlock) => {
    const trimmed = renameDraft.trim();
    if (onUpdateBlock && trimmed) {
      onUpdateBlock(blk.id, (prev) => ({ ...prev, label: trimmed }));
    }
    setRenamingBlockId(null);
  };

  const cancelRenameBlock = () => {
    setRenamingBlockId(null);
    setRenameDraft('');
  };

  const toggleLayerGroup = (groupKey: string) => {
    setExpandedLayerGroups((prev) => ({
      ...prev,
      [groupKey]: !prev[groupKey],
    }));
  };

  useEffect(() => {
    if (navbarFocusNonce > 0) {
      setOpenSections((prev) => ({ ...prev, bottom: true }));
    }
  }, [navbarFocusNonce]);

  useEffect(() => {
    const isInNavSheet = Boolean(
      selectedId && bottomNavbar.items.some((it) => hasBlockInTree(it.children, selectedId))
    );
    if (isInNavSheet) {
      setOpenSections((prev) => (prev.bottom ? prev : { ...prev, bottom: true }));
    }
    if (!selectedId) {
      setExpandedLayerGroups({});
      return;
    }

    // Otomatis buka grup lapisan yang berkaitan dengan komponen terpilih & tampilkan sub-layernya
    const nextExpanded = resolveExpandedLayerGroupsForSelection(
      blocks,
      selectedId,
      bottomNavbar.items
        .filter((it) => Array.isArray(it.children) && it.children.length > 0)
        .map((it) => ({ navId: it.id, children: it.children }))
    );
    nextExpanded[selectedId] = true;
    setExpandedLayerGroups(nextExpanded);

    if (selectedSubLayerId) {
      const findBlk = (list: BuilderBlock[]): BuilderBlock | null => {
        for (const b of list) {
          if (b.id === selectedId) return b;
          const nested = [
            ...(b.children ?? []),
            ...(b.content?.cardFooterBlocks ?? []),
            ...(b.content?.actionSheetBlocks ?? []),
          ];
          const hit = findBlk(nested);
          if (hit) return hit;
        }
        return null;
      };
      const selectedBlk = findBlk(blocks);
      if (selectedBlk) {
        const subs = extractBlockSubLayers(selectedBlk);
        for (const s of subs) {
          if (s.children?.some((ch) => ch.id === selectedSubLayerId)) {
            setExpandedSubGroups((prev) => ({
              ...prev,
              [`${selectedBlk.id}::${s.id}`]: true,
            }));
            break;
          }
        }
      }
    }

    const timer = window.setTimeout(() => {
      const root = scrollContainerRef.current;
      if (!root) return;

      let target: HTMLElement | null = null;
      if (selectedSubLayerId) {
        const subKey = `${selectedId}::${selectedSubLayerId}`;
        const subNodes = root.querySelectorAll<HTMLElement>('[data-sublayer-id]');
        for (let i = 0; i < subNodes.length; i += 1) {
          if (subNodes[i].getAttribute('data-sublayer-id') === subKey) {
            target = subNodes[i];
            break;
          }
        }
      }

      if (!target) {
        const nodes = root.querySelectorAll<HTMLElement>('[data-layer-item-id]');
        for (let i = 0; i < nodes.length; i += 1) {
          if (nodes[i].getAttribute('data-layer-item-id') === selectedId) {
            target = nodes[i];
            break;
          }
        }
      }

      if (!target) return;
      const containerRect = root.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      const targetOffsetTop = targetRect.top - containerRect.top + root.scrollTop;
      const desiredOffsetFromTop = root.clientHeight * 0.28;
      const maxScrollTop = Math.max(0, root.scrollHeight - root.clientHeight);
      const nextScrollTop = Math.max(
        0,
        Math.min(maxScrollTop, Math.round(targetOffsetTop - desiredOffsetFromTop))
      );
      if (typeof root.scrollTo === 'function') {
        root.scrollTo({ top: nextScrollTop, behavior: 'smooth' });
      } else {
        root.scrollTop = nextScrollTop;
      }
    }, 80);
    return () => window.clearTimeout(timer);
  }, [layerFocusNonce, selectedId, selectedSubLayerId]);

  const toggleSection = (id: HomeSectionId) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const pageTopPadding =
    typeof advanceOptions.pageTopPadding === 'number' ? advanceOptions.pageTopPadding : 16;

  // --- Navbar helpers ---
  const navItems = bottomNavbar.items;
  const activeNavItem = navItems.find((it) => it.id === activeNavItemId) ?? navItems[0] ?? null;
  const navMetrics = resolveNavbarMetrics(bottomNavbar);

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

  const countLayerTree = (nodes: BuilderBlock[]): number =>
    nodes.reduce(
      (sum, node) =>
        sum +
        1 +
        (Array.isArray(node.children) ? countLayerTree(node.children) : 0) +
        (Array.isArray(node.content?.actionSheetBlocks)
          ? countLayerTree(node.content.actionSheetBlocks)
          : 0) +
        (Array.isArray(node.content?.cardFooterBlocks)
          ? countLayerTree(node.content.cardFooterBlocks)
          : 0),
      0
    );

  const navSheetLayers = bottomNavbar.items
    .filter((it) => Array.isArray(it.children) && it.children.length > 0)
    .map((it) => ({
      navItem: it,
      children: it.children,
    }));

  const navSheetLayerCount = navSheetLayers.reduce(
    (sum, entry) => sum + countLayerTree(entry.children),
    0
  );

  const countLocalThemeOverrides = (nodes: BuilderBlock[]): number =>
    nodes.reduce((sum, node) => {
      const selfOverride = getBlockThemeStatus(node, theme).mode === 'local' ? 1 : 0;
      const childrenCount = Array.isArray(node.children)
        ? countLocalThemeOverrides(node.children)
        : 0;
      const sheetCount = Array.isArray(node.content?.actionSheetBlocks)
        ? countLocalThemeOverrides(node.content.actionSheetBlocks)
        : 0;
      const footerCount = Array.isArray(node.content?.cardFooterBlocks)
        ? countLocalThemeOverrides(node.content.cardFooterBlocks)
        : 0;
      return sum + selfOverride + childrenCount + sheetCount + footerCount;
    }, 0);

  const pageThemeOverrideCount = countLocalThemeOverrides(blocks);

  const hasSidebarDragPayload = (dt: DataTransfer | null): boolean => {
    if (!dt) return false;
    const types = Array.from(dt.types ?? []);
    return (
      types.includes('application/lynk-block-type') ||
      types.includes('application/lynk-section-id') ||
      types.includes('application/lynk-item-template-id')
    );
  };

  const handleSidebarDropOnTarget = (
    e: React.DragEvent,
    targetId: string,
    pos: 'before' | 'after' | 'inside'
  ): boolean => {
    const newBlockType = e.dataTransfer.getData('application/lynk-block-type') as BlockType;
    const blockPreset = e.dataTransfer.getData('application/lynk-block-preset') as 'png' | '';
    const sectionId = e.dataTransfer.getData('application/lynk-section-id');
    const itemTemplateId = e.dataTransfer.getData('application/lynk-item-template-id');
    if (newBlockType && onDropNewBlock) {
      onDropNewBlock(newBlockType, targetId, pos, blockPreset === 'png' ? 'png' : undefined);
      return true;
    }
    if (sectionId && onDropSection) {
      onDropSection(sectionId, targetId, pos);
      return true;
    }
    if (itemTemplateId && onDropItemTemplate) {
      onDropItemTemplate(itemTemplateId, targetId, pos);
      return true;
    }
    return false;
  };

  type FnbUnifiedLayerCtx = {
    catalogId: string;
    entryKey: string;
    unifiedIndex: number;
    unifiedCount: number;
  };

  const renderSubLayerRow = (
    blk: BuilderBlock,
    sub: ExtractedSubLayer,
    isNestedChild = false,
    fnbDragCtx?: FnbUnifiedLayerCtx
  ): React.ReactNode => {
    const isSubSelected = blk.id === selectedId && selectedSubLayerId === sub.id;
    const subGroupKey = `${blk.id}::${sub.id}`;
    const hasSubChildren = Array.isArray(sub.children) && sub.children.length > 0;
    const isSubExpanded = Boolean(expandedSubGroups[subGroupKey]);
    const hasActiveChild =
      hasSubChildren &&
      blk.id === selectedId &&
      Boolean(sub.children?.some((ch) => ch.id === selectedSubLayerId));
    const isFnbOver = Boolean(
      fnbDragCtx &&
        dragOverFnbEntry?.catalogId === fnbDragCtx.catalogId &&
        dragOverFnbEntry.entryKey === fnbDragCtx.entryKey
    );
    const isFnbDraggingSelf = Boolean(
      fnbDragCtx &&
        dragFnbEntry?.catalogId === fnbDragCtx.catalogId &&
        dragFnbEntry.entryKey === fnbDragCtx.entryKey
    );

    return (
      <div key={subGroupKey} className="space-y-1">
        <div
          data-sublayer-id={subGroupKey}
          data-sublayer-kind={sub.kind}
          data-sublayer-selected={isSubSelected ? 'true' : 'false'}
          draggable={Boolean(fnbDragCtx && !sub.isLocked)}
          onDragStart={(e) => {
            if (!fnbDragCtx || sub.isLocked) return;
            e.stopPropagation();
            setDragLayerId(null);
            setDragOverInfo(null);
            setDragFnbEntry({
              catalogId: fnbDragCtx.catalogId,
              entryKey: fnbDragCtx.entryKey,
            });
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData(
              'application/lynk-fnb-entry',
              JSON.stringify({
                catalogId: fnbDragCtx.catalogId,
                entryKey: fnbDragCtx.entryKey,
              })
            );
          }}
          onDragOver={(e) => {
            if (!fnbDragCtx) return;
            const canAcceptSameFnb =
              dragFnbEntry?.catalogId === fnbDragCtx.catalogId &&
              dragFnbEntry.entryKey !== fnbDragCtx.entryKey;
            const canAcceptExternalLayer =
              Boolean(dragLayerId) && dragLayerId !== fnbDragCtx.catalogId;
            const canAcceptSidebar = hasSidebarDragPayload(e.dataTransfer);
            if (!canAcceptSameFnb && !canAcceptExternalLayer && !canAcceptSidebar) return;
            e.preventDefault();
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const pos: 'before' | 'after' =
              e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
            setDragOverInfo(null);
            setDragOverFnbEntry((prev) =>
              prev?.catalogId === fnbDragCtx.catalogId &&
              prev.entryKey === fnbDragCtx.entryKey &&
              prev.pos === pos
                ? prev
                : { catalogId: fnbDragCtx.catalogId, entryKey: fnbDragCtx.entryKey, pos }
            );
          }}
          onDragLeave={() => {
            if (!fnbDragCtx) return;
            setDragOverFnbEntry((prev) =>
              prev?.catalogId === fnbDragCtx.catalogId && prev.entryKey === fnbDragCtx.entryKey
                ? null
                : prev
            );
          }}
          onDrop={(e) => {
            if (!fnbDragCtx) return;
            e.preventDefault();
            e.stopPropagation();
            const pos: 'before' | 'after' =
              dragOverFnbEntry?.catalogId === fnbDragCtx.catalogId &&
              dragOverFnbEntry.entryKey === fnbDragCtx.entryKey
                ? dragOverFnbEntry.pos
                : 'after';
            const activeFnbDrag = dragFnbEntry;
            const activeLayerDrag = dragLayerId;
            setDragFnbEntry(null);
            setDragOverFnbEntry(null);
            setDragLayerId(null);
            setDragOverInfo(null);

            if (
              activeFnbDrag &&
              activeFnbDrag.catalogId === fnbDragCtx.catalogId &&
              activeFnbDrag.entryKey !== fnbDragCtx.entryKey
            ) {
              onUpdateBlock?.(fnbDragCtx.catalogId, (prev) =>
                reorderFnbCatalogEntries(prev, activeFnbDrag.entryKey, fnbDragCtx.entryKey, pos)
              );
              return;
            }
            if (handleSidebarDropOnTarget(e, fnbDragCtx.catalogId, 'inside')) {
              return;
            }
            const externalId = activeLayerDrag || e.dataTransfer.getData('text/plain');
            if (externalId && externalId !== fnbDragCtx.catalogId) {
              if (onMoveBlockIntoFnbAt) {
                onMoveBlockIntoFnbAt(externalId, fnbDragCtx.catalogId, fnbDragCtx.entryKey, pos);
              } else {
                onReorderBlock(externalId, fnbDragCtx.catalogId, 'inside');
              }
            }
          }}
          onDragEnd={() => {
            setDragFnbEntry(null);
            setDragOverFnbEntry(null);
          }}
          className={`group/sub w-full flex items-center gap-1 px-1.5 py-1.5 rounded-lg border text-left transition-all ${
            isSubSelected
              ? 'bg-[#ECFDF6] border-[#00C98A] border-l-[3px] text-[#17243D] shadow-2xs'
              : hasActiveChild
              ? 'bg-[#F3FBF7] border-[#00C98A]/55 text-[#17243D]'
              : sub.isHidden
              ? 'bg-[#F8FAFC] border-dashed border-[#DCE5EF] text-[#8FA4BF] hover:border-[#8FA4BF] hover:bg-white'
              : isNestedChild
              ? 'bg-[#F8FBFE] border-[#E6EDF5] text-[#17243D] hover:border-[#00C98A]/60 hover:bg-white'
              : 'bg-white/90 border-[#E6EDF5] text-[#17243D] hover:border-[#00C98A]/60 hover:bg-[#F8FBFE]'
          } ${isFnbDraggingSelf ? 'opacity-45' : ''} ${
            isFnbOver && dragOverFnbEntry?.pos === 'before'
              ? 'border-t-2 border-t-[#00C98A]'
              : isFnbOver && dragOverFnbEntry?.pos === 'after'
              ? 'border-b-2 border-b-[#00C98A]'
              : ''
          }`}
        >
          {fnbDragCtx && (
            <span
              className={`shrink-0 ${
                sub.isLocked
                  ? 'text-[#CBD5E1] cursor-not-allowed'
                  : 'text-[#8FA4BF] cursor-grab active:cursor-grabbing'
              }`}
              title="Seret untuk ubah urutan produk di Katalog F&B"
            >
              <GripVertical className="w-3 h-3" />
            </span>
          )}
          {hasSubChildren && (
            <button
              type="button"
              aria-expanded={isSubExpanded}
              aria-label={isSubExpanded ? 'Tutup detail lapisan item' : 'Buka detail lapisan item'}
              title={isSubExpanded ? 'Tutup lapisan dalam item' : 'Lihat lapisan dalam item (Gambar, Info, Harga)'}
              onClick={(e) => {
                e.stopPropagation();
                toggleSubLayerGroup(subGroupKey);
              }}
              className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                isSubExpanded || hasActiveChild
                  ? 'bg-[#00C98A]/15 text-[#059669] hover:bg-[#00C98A]/25'
                  : 'bg-[#F0F5FA] text-[#64748B] hover:bg-[#DCE5EF]'
              }`}
            >
              <ChevronDown
                className={`w-2.5 h-2.5 transition-transform duration-150 ${
                  isSubExpanded ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>
          )}
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              if (onSelectSubLayer) {
                onSelectSubLayer(blk.id, sub.id);
              } else {
                onSelectBlock(blk.id);
              }
            }}
            className="flex-1 min-w-0 flex items-center gap-1.5 text-left cursor-pointer"
          >
            {sub.thumbnailUrl ? (
              <span className="w-5 h-5 rounded-md overflow-hidden border border-[#DCE5EF] bg-[#F1F5F9] shrink-0 flex items-center justify-center">
                <img
                  src={sub.thumbnailUrl}
                  alt={sub.label}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover block"
                />
              </span>
            ) : (
              <span
                className={`w-5 h-5 rounded-md flex items-center justify-center shrink-0 ${
                  isSubSelected
                    ? 'bg-[#00C98A] text-white'
                    : sub.kind === 'item'
                    ? 'bg-[#F0F5FA] text-[#008F63]'
                    : 'bg-[#F0F5FA] text-[#5B708B]'
                }`}
              >
                {renderSubLayerIcon(sub.icon, 'w-3 h-3')}
              </span>
            )}
            <div className="min-w-0 flex-1">
              <div className="flex items-center gap-1 min-w-0">
                {sub.layerBadge && (
                  <span
                    className={`px-1 py-0 rounded text-[8.5px] font-bold uppercase tracking-wide shrink-0 ${
                      isSubSelected
                        ? 'bg-[#17243D] text-[#7AF0C7]'
                        : 'bg-[#17243D]/10 text-[#17243D]'
                    }`}
                  >
                    {sub.layerBadge}
                  </span>
                )}
                <span
                  className={`truncate text-[10.5px] leading-tight ${
                    isSubSelected
                      ? 'font-bold text-[#17243D]'
                      : sub.isHidden
                      ? 'font-medium text-[#8FA4BF] line-through'
                      : 'font-semibold text-[#17243D]'
                  }`}
                >
                  {sub.label}
                </span>
                {sub.isLocked && (
                  <Lock className="w-2.5 h-2.5 text-amber-600 shrink-0" aria-label="Terkunci" />
                )}
              </div>
              <div className="flex items-center gap-1 mt-0.5 min-w-0">
                <span
                  className={`truncate text-[9px] leading-tight ${
                    isSubSelected ? 'text-[#008F63] font-medium' : 'text-[#8FA4BF]'
                  }`}
                >
                  {sub.typeLabel}
                </span>
                {sub.isHidden && (
                  <span className="inline-flex items-center gap-0.5 text-[8.5px] font-semibold text-[#8FA4BF] shrink-0">
                    <EyeOff className="w-2.5 h-2.5" />
                    <span>Tersembunyi</span>
                  </span>
                )}
              </div>
            </div>
          </button>

          {/* Independent Sub-Layer Actions (NEVER deletes parent block) */}
          <div
            className={`flex items-center gap-0.5 shrink-0 transition-opacity ${
              isSubSelected ? 'opacity-100' : 'opacity-0 group-hover/sub:opacity-100'
            }`}
          >
            {fnbDragCtx && onUpdateBlock && (
              <>
                <button
                  type="button"
                  disabled={fnbDragCtx.unifiedIndex === 0 || Boolean(sub.isLocked)}
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateBlock(fnbDragCtx.catalogId, (prev) =>
                      moveFnbCatalogEntry(prev, fnbDragCtx.entryKey, 'up')
                    );
                  }}
                  title="Naikkan urutan item"
                  aria-label="Naikkan urutan item"
                  className="p-1 rounded text-[#51637D] hover:bg-[#F0F5FA] hover:text-[#17243D] disabled:opacity-30 cursor-pointer transition-colors"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  disabled={
                    fnbDragCtx.unifiedIndex === fnbDragCtx.unifiedCount - 1 || Boolean(sub.isLocked)
                  }
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateBlock(fnbDragCtx.catalogId, (prev) =>
                      moveFnbCatalogEntry(prev, fnbDragCtx.entryKey, 'down')
                    );
                  }}
                  title="Turunkan urutan item"
                  aria-label="Turunkan urutan item"
                  className="p-1 rounded text-[#51637D] hover:bg-[#F0F5FA] hover:text-[#17243D] disabled:opacity-30 cursor-pointer transition-colors"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
              </>
            )}
            {sub.canToggleVisibility && onToggleSubLayerVisibility && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSubLayerVisibility(blk.id, sub.id);
                }}
                title={sub.isHidden ? 'Tampilkan Sub-Lapisan' : 'Sembunyikan Sub-Lapisan'}
                aria-label={sub.isHidden ? 'Tampilkan Sub-Lapisan' : 'Sembunyikan Sub-Lapisan'}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  sub.isHidden
                    ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                    : 'text-[#51637D] hover:bg-[#F0F5FA] hover:text-[#17243D]'
                }`}
              >
                {sub.isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
              </button>
            )}
            {sub.canLock && onToggleSubLayerLock && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleSubLayerLock(blk.id, sub.id);
                }}
                title={sub.isLocked ? 'Buka Kunci Sub-Lapisan' : 'Kunci Sub-Lapisan'}
                aria-label={sub.isLocked ? 'Buka Kunci Sub-Lapisan' : 'Kunci Sub-Lapisan'}
                className={`p-1 rounded cursor-pointer transition-colors ${
                  sub.isLocked
                    ? 'text-amber-700 bg-amber-50 hover:bg-amber-100'
                    : 'text-[#8FA4BF] hover:bg-[#F0F5FA] hover:text-[#17243D]'
                }`}
              >
                {sub.isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
              </button>
            )}
            {sub.canDelete && onDeleteSubLayer && (
              <button
                type="button"
                disabled={Boolean(sub.isLocked)}
                onClick={(e) => {
                  e.stopPropagation();
                  onDeleteSubLayer(blk.id, sub.id);
                }}
                title={
                  sub.isLocked
                    ? 'Sub-lapisan terkunci'
                    : `Hapus hanya ${sub.label} (induk tetap utuh)`
                }
                aria-label={`Hapus sub-lapisan ${sub.label}`}
                className="p-1 rounded text-[#8FA4BF] hover:bg-red-50 hover:text-red-600 disabled:opacity-35 disabled:pointer-events-none cursor-pointer transition-colors"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>

        {hasSubChildren && isSubExpanded && (
          <div className="ml-3 pl-2 border-l border-[#DCE5EF] space-y-1">
            {sub.children!.map((childSub) => renderSubLayerRow(blk, childSub, true))}
          </div>
        )}
      </div>
    );
  };

  const renderLayerNode = (
    blk: BuilderBlock,
    index: number,
    siblingsCount: number,
    depth: number,
    fnbParentCtx?: FnbUnifiedLayerCtx
  ): React.ReactNode => {
    const isSelected = blk.id === selectedId;
    const isParentDirectlySelected = isSelected && !selectedSubLayerId;
    const isContainer =
      blk.type === 'container' ||
      blk.type === 'toggle_container' ||
      blk.type === 'row' ||
      blk.type === 'bottom_sheet' ||
      blk.type === 'menu_icon' ||
      blk.type === 'showcase_card' ||
      blk.type === 'hero_profile' ||
      blk.type === 'fnb_catalog';
    const hasNestedBlocks = hasBlockNestedChildren(blk);
    const nestedBlockCount = hasNestedBlocks ? countDirectNestedChildren(blk) : 0;
    const subLayers = extractBlockSubLayers(blk);
    const hasExpandable = hasNestedBlocks || subLayers.length > 0;
    const totalSubCount = nestedBlockCount + subLayers.length;
    const isGroupExpanded = Boolean(expandedLayerGroups[blk.id]);
    const isOver = dragOverInfo?.id === blk.id;
    const isFnbItemOver = Boolean(
      fnbParentCtx &&
        dragOverFnbEntry?.catalogId === fnbParentCtx.catalogId &&
        dragOverFnbEntry.entryKey === fnbParentCtx.entryKey
    );
    const isHidden = blk.style?.visibility === 'hidden';
    const isLocked = Boolean(blk.style?.locked);
    const isRenaming = renamingBlockId === blk.id;
    const parentBlockId = isSelected ? findParentBlockId(blocks, blk.id) : null;
    const activeSubInThisBlock =
      isSelected && selectedSubLayerId
        ? subLayers.find(
            (s) =>
              s.id === selectedSubLayerId ||
              Boolean(s.children?.some((ch) => ch.id === selectedSubLayerId))
          ) ?? null
        : null;

    const isHeroBanner = blk.type === 'hero_profile' && blk.content?.heroVariant === 'banner';
    const partSubLayers = subLayers.filter((s) => s.kind === 'part');
    const itemSubLayers = subLayers.filter((s) => s.kind === 'item');
    const heroCoverSub = isHeroBanner ? partSubLayers.find((s) => s.id === 'hero_cover') : undefined;
    const heroCardSub = isHeroBanner
      ? partSubLayers.find((s) => s.id === 'hero_profile_card')
      : undefined;
    const heroExtraSubs = isHeroBanner
      ? partSubLayers.filter((s) => s.id !== 'hero_cover' && s.id !== 'hero_profile_card')
      : [];

    const effectiveIndex = fnbParentCtx ? fnbParentCtx.unifiedIndex : index;
    const effectiveSiblingsCount = fnbParentCtx ? fnbParentCtx.unifiedCount : siblingsCount;
    const handleRowMove = (dir: 'up' | 'down') => {
      if (fnbParentCtx && onUpdateBlock) {
        onUpdateBlock(fnbParentCtx.catalogId, (prev) =>
          moveFnbCatalogEntry(prev, fnbParentCtx.entryKey, dir)
        );
      } else {
        onMoveBlock(blk.id, dir);
      }
    };

    return (
      <div key={blk.id} className="space-y-1">
        <div
          data-layer-item-id={blk.id}
          data-layer-selected={isSelected ? 'true' : 'false'}
          data-layer-hidden={isHidden ? 'true' : 'false'}
          data-layer-locked={isLocked ? 'true' : 'false'}
          data-layer-has-children={hasExpandable ? 'true' : 'false'}
          data-layer-expanded={hasExpandable ? (isGroupExpanded ? 'true' : 'false') : undefined}
          draggable={!isRenaming && !isLocked}
          onDragStart={(e) => {
            if (isRenaming || isLocked) return;
            e.stopPropagation();
            setDragLayerId(blk.id);
            if (fnbParentCtx) {
              setDragFnbEntry({
                catalogId: fnbParentCtx.catalogId,
                entryKey: fnbParentCtx.entryKey,
                blockId: blk.id,
              });
            } else {
              setDragFnbEntry(null);
            }
            e.dataTransfer.effectAllowed = 'move';
            e.dataTransfer.setData('text/plain', blk.id);
          }}
          onDragOver={(e) => {
            const isSameFnbMenuDrag = Boolean(
              fnbParentCtx &&
                dragFnbEntry &&
                !dragFnbEntry.blockId &&
                dragFnbEntry.catalogId === fnbParentCtx.catalogId
            );
            const isSameFnbBlockDrag = Boolean(
              fnbParentCtx &&
                dragFnbEntry?.blockId &&
                dragFnbEntry.catalogId === fnbParentCtx.catalogId &&
                dragFnbEntry.entryKey !== fnbParentCtx.entryKey
            );
            const isSidebarDrag = hasSidebarDragPayload(e.dataTransfer);
            const isRegularBlockDrag = Boolean(dragLayerId && dragLayerId !== blk.id);
            if (!isSameFnbMenuDrag && !isSameFnbBlockDrag && !isSidebarDrag && !isRegularBlockDrag) {
              return;
            }
            e.preventDefault();
            e.stopPropagation();
            const rect = e.currentTarget.getBoundingClientRect();
            const relY = e.clientY - rect.top;

            if (isSameFnbMenuDrag && fnbParentCtx) {
              const pos: 'before' | 'after' = relY < rect.height / 2 ? 'before' : 'after';
              setDragOverInfo(null);
              setDragOverFnbEntry({
                catalogId: fnbParentCtx.catalogId,
                entryKey: fnbParentCtx.entryKey,
                pos,
              });
              return;
            }

            let pos: 'before' | 'after' | 'inside' = relY < rect.height / 2 ? 'before' : 'after';
            if (isContainer) {
              const insideMin = blk.type === 'fnb_catalog' ? 0.2 : 0.28;
              const insideMax = blk.type === 'fnb_catalog' ? 0.8 : 0.72;
              if (relY > rect.height * insideMin && relY < rect.height * insideMax) {
                pos = 'inside';
              }
            }

            if (fnbParentCtx && pos !== 'inside') {
              setDragOverInfo(null);
              setDragOverFnbEntry({
                catalogId: fnbParentCtx.catalogId,
                entryKey: fnbParentCtx.entryKey,
                pos,
              });
            } else {
              setDragOverFnbEntry(null);
              setDragOverInfo({ id: blk.id, pos });
            }
          }}
          onDragLeave={() => {
            setDragOverInfo((prev) => (prev?.id === blk.id ? null : prev));
            if (fnbParentCtx) {
              setDragOverFnbEntry((prev) =>
                prev?.catalogId === fnbParentCtx.catalogId &&
                prev.entryKey === fnbParentCtx.entryKey
                  ? null
                  : prev
              );
            }
          }}
          onDrop={(e) => {
            e.preventDefault();
            e.stopPropagation();
            const activeFnbDrag = dragFnbEntry;
            const activeFnbOver = dragOverFnbEntry;
            const sourceId = dragLayerId || e.dataTransfer.getData('text/plain');
            const layerPos = dragOverInfo?.id === blk.id ? dragOverInfo.pos : 'after';
            setDragLayerId(null);
            setDragOverInfo(null);
            setDragFnbEntry(null);
            setDragOverFnbEntry(null);

            // 1. Reorder within the same F&B catalog Daftar Item (menu or sibling card)
            if (
              fnbParentCtx &&
              activeFnbDrag &&
              activeFnbDrag.catalogId === fnbParentCtx.catalogId &&
              activeFnbDrag.entryKey !== fnbParentCtx.entryKey &&
              layerPos !== 'inside'
            ) {
              const fnbPos: 'before' | 'after' =
                activeFnbOver?.catalogId === fnbParentCtx.catalogId &&
                activeFnbOver.entryKey === fnbParentCtx.entryKey
                  ? activeFnbOver.pos
                  : 'after';
              onUpdateBlock?.(fnbParentCtx.catalogId, (prev) =>
                reorderFnbCatalogEntries(prev, activeFnbDrag.entryKey, fnbParentCtx.entryKey, fnbPos)
              );
              return;
            }

            // 2. Sidebar tool/section/template dropped onto this layer (or inside Katalog F&B)
            if (handleSidebarDropOnTarget(e, blk.id, layerPos)) {
              return;
            }

            // 3. External block dropped directly before/after a card inside F&B Daftar Item
            if (
              fnbParentCtx &&
              sourceId &&
              sourceId !== blk.id &&
              sourceId !== fnbParentCtx.catalogId &&
              layerPos !== 'inside' &&
              onMoveBlockIntoFnbAt
            ) {
              const fnbPos: 'before' | 'after' =
                activeFnbOver?.catalogId === fnbParentCtx.catalogId &&
                activeFnbOver.entryKey === fnbParentCtx.entryKey
                  ? activeFnbOver.pos
                  : 'after';
              onMoveBlockIntoFnbAt(sourceId, fnbParentCtx.catalogId, fnbParentCtx.entryKey, fnbPos);
              return;
            }

            // 4. Standard tree reorder (including dropping into fnb_catalog 'inside' or moving out!)
            if (sourceId && sourceId !== blk.id) {
              onReorderBlock(sourceId, blk.id, layerPos);
            }
          }}
          onDragEnd={() => {
            setDragLayerId(null);
            setDragOverInfo(null);
            setDragFnbEntry(null);
            setDragOverFnbEntry(null);
          }}
          className={`group relative flex items-center gap-1 px-1.5 py-1.5 rounded-lg border text-[11px] transition-all ${
            isParentDirectlySelected
              ? 'bg-[#17243D] border-[#00C98A] border-l-4 text-white shadow-sm ring-2 ring-[#00C98A]/35'
              : isSelected
              ? 'bg-[#17243D]/90 border-[#00C98A] text-white shadow-2xs'
              : isGroupExpanded && hasExpandable
              ? 'bg-[#F3FBF7] border-[#00C98A]/55 text-[#17243D]'
              : 'bg-white border-[#DCE5EF] text-[#17243D] hover:border-[#8FA4BF]'
          } ${isHidden && !isSelected ? 'opacity-60 border-dashed' : ''} ${
            (isOver && dragOverInfo.pos === 'before') ||
            (isFnbItemOver && dragOverFnbEntry?.pos === 'before')
              ? 'border-t-2 border-t-[#00C98A]'
              : (isOver && dragOverInfo.pos === 'after') ||
                (isFnbItemOver && dragOverFnbEntry?.pos === 'after')
              ? 'border-b-2 border-b-[#00C98A]'
              : isOver && dragOverInfo.pos === 'inside'
              ? 'ring-2 ring-[#00C98A] bg-[#ECFDF6]/80'
              : ''
          }`}
        >
          <span
            className={`cursor-grab active:cursor-grabbing shrink-0 ${
              isSelected ? 'text-[#00C98A]' : 'text-[#8FA4BF]'
            }`}
            title="Seret untuk urutkan"
          >
            <GripVertical className="w-3 h-3" />
          </span>

          {hasExpandable ? (
            <button
              type="button"
              data-layer-dropdown-toggle={blk.id}
              aria-expanded={isGroupExpanded}
              aria-label={isGroupExpanded ? 'Tutup grup lapisan' : 'Buka grup lapisan'}
              title={isGroupExpanded ? 'Tutup grup lapisan' : 'Buka grup lapisan'}
              onClick={(e) => {
                e.stopPropagation();
                toggleLayerGroup(blk.id);
              }}
              className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                isSelected
                  ? 'bg-white/15 text-[#7AF0C7] hover:bg-white/25'
                  : isGroupExpanded
                  ? 'bg-[#00C98A] text-white hover:bg-[#00B37B]'
                  : 'bg-[#F0F5FA] text-[#51637D] hover:bg-[#DCE5EF]'
              }`}
            >
              <ChevronDown
                className={`w-2.5 h-2.5 transition-transform duration-150 ${
                  isGroupExpanded ? 'rotate-0' : '-rotate-90'
                }`}
              />
            </button>
          ) : (
            <span className="w-2 shrink-0" aria-hidden="true" />
          )}

          <span
            aria-hidden="true"
            className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 transition-colors ${
              isSelected
                ? 'bg-white/15 text-[#7AF0C7]'
                : isGroupExpanded && hasExpandable
                ? 'bg-[#00C98A]/15 text-[#008F63]'
                : 'bg-[#F0F5FA] text-[#51637D]'
            }`}
          >
            {renderBlockLayerIcon(blk, 'w-3.5 h-3.5')}
          </span>

          {isRenaming ? (
            <div className="min-w-0 flex-1 flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
              <input
                type="text"
                autoFocus
                value={renameDraft}
                onChange={(e) => setRenameDraft(e.target.value)}
                onBlur={() => commitRenameBlock(blk)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    commitRenameBlock(blk);
                  } else if (e.key === 'Escape') {
                    e.preventDefault();
                    cancelRenameBlock();
                  }
                }}
                aria-label="Ubah nama lapisan"
                className="w-full px-1.5 py-0.5 text-[11px] font-semibold rounded border border-[#00C98A] bg-white text-[#17243D] outline-none"
              />
            </div>
          ) : (
            <button
              type="button"
              onClick={() => onSelectBlock(blk.id)}
              onDoubleClick={(e) => {
                if (!onUpdateBlock) return;
                e.stopPropagation();
                startRenameBlock(blk);
              }}
              title={blk.label?.trim() || label(`komponen.type.${blk.type}`, BLOCK_TYPE_NAMES[blk.type])}
              className="min-w-0 flex-1 text-left cursor-pointer"
            >
              <div className="flex items-center gap-1 min-w-0">
                <div
                  className={`truncate text-[11px] leading-tight ${
                    isSelected ? 'font-bold text-white' : 'font-semibold text-[#17243D]'
                  } ${isHidden ? 'line-through opacity-80' : ''}`}
                >
                  {blk.label?.trim() || label(`komponen.type.${blk.type}`, BLOCK_TYPE_NAMES[blk.type])}
                </div>
                {hasExpandable && (
                  <span
                    className={`px-1 py-0 rounded text-[9px] font-bold tabular-nums shrink-0 ${
                      isSelected
                        ? 'bg-white/15 text-[#7AF0C7]'
                        : isGroupExpanded
                        ? 'bg-[#00C98A]/15 text-[#059669]'
                        : 'bg-[#F0F5FA] text-[#51637D]'
                    }`}
                  >
                    {totalSubCount}
                  </span>
                )}
                {isLocked && (
                  <span
                    className={`inline-flex items-center px-1 py-0 rounded text-[8.5px] font-semibold shrink-0 ${
                      isSelected
                        ? 'bg-amber-400/25 text-amber-200'
                        : 'bg-amber-50 text-amber-700'
                    }`}
                    title="Lapisan terkunci"
                  >
                    <Lock className="w-2.5 h-2.5" />
                  </span>
                )}
                {isHidden && (
                  <span
                    className={`inline-flex items-center gap-0.5 px-1 py-0 rounded text-[8.5px] font-semibold shrink-0 ${
                      isSelected
                        ? 'bg-amber-400/25 text-amber-200'
                        : 'bg-[#F0F5FA] text-[#8FA4BF]'
                    }`}
                  >
                    <EyeOff className="w-2.5 h-2.5" />
                    <span>Tersembunyi</span>
                  </span>
                )}
              </div>
              <div
                className={`text-[9.5px] truncate ${
                  isSelected ? 'text-[#7AF0C7] font-medium' : 'text-[#8FA4BF]'
                }`}
              >
                {label(`komponen.type.${blk.type}`, BLOCK_TYPE_NAMES[blk.type])}
              </div>
            </button>
          )}

          {/* Action buttons appear cleanly on hover for unselected rows so full layer titles remain readable */}
          {!isSelected && !isRenaming && (
            <div
              className={`hidden group-hover:flex items-center gap-0.5 shrink-0 pl-1 rounded-md ${
                isGroupExpanded ? 'bg-[#F3FBF7]' : 'bg-white'
              }`}
            >
              {onUpdateBlock && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onUpdateBlock(blk.id, (prev) => ({
                      ...prev,
                      style: {
                        ...prev.style,
                        visibility: prev.style?.visibility === 'hidden' ? 'visible' : 'hidden',
                      },
                    }));
                  }}
                  title={isHidden ? 'Tampilkan Lapisan' : 'Sembunyikan Lapisan'}
                  aria-label={isHidden ? 'Tampilkan Lapisan' : 'Sembunyikan Lapisan'}
                  className="p-0.5 rounded cursor-pointer text-[#51637D] hover:bg-[#F0F5FA]"
                >
                  {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                </button>
              )}
              <button
                type="button"
                disabled={effectiveIndex === 0}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRowMove('up');
                }}
                title="Naikkan"
                className="p-0.5 rounded disabled:opacity-30 cursor-pointer text-[#51637D] hover:bg-[#F0F5FA]"
              >
                <ArrowUp className="w-3 h-3" />
              </button>
              <button
                type="button"
                disabled={effectiveIndex === effectiveSiblingsCount - 1}
                onClick={(e) => {
                  e.stopPropagation();
                  handleRowMove('down');
                }}
                title="Turunkan"
                className="p-0.5 rounded disabled:opacity-30 cursor-pointer text-[#51637D] hover:bg-[#F0F5FA]"
              >
                <ArrowDown className="w-3 h-3" />
              </button>
              {onDuplicateBlock && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDuplicateBlock(blk.id);
                  }}
                  title="Duplikat Lapisan"
                  aria-label="Duplikat Lapisan"
                  className="p-0.5 rounded cursor-pointer text-[#8FA4BF] hover:bg-[#ECFDF6] hover:text-[#00A873]"
                >
                  <Copy className="w-3 h-3" />
                </button>
              )}
              <button
                type="button"
                disabled={isLocked}
                onClick={(e) => {
                  e.stopPropagation();
                  if (!isLocked) onDeleteBlock(blk.id);
                }}
                title={isLocked ? 'Lapisan terkunci' : 'Hapus Blok'}
                className="p-0.5 rounded cursor-pointer text-[#8FA4BF] hover:bg-red-50 hover:text-red-600 disabled:opacity-30 disabled:pointer-events-none"
              >
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
          )}
        </div>

        {/* Contextual Action Strip: Only show parent delete/actions when parent itself is directly selected */}
        {isSelected && !activeSubInThisBlock && (
          <div
            data-layer-contextual-toolbar={blk.id}
            className="mx-0.5 px-1.5 py-1 rounded-lg bg-[#ECFDF6] border border-[#00C98A]/45 space-y-1"
          >
            <div className="flex items-center justify-between gap-1 flex-wrap">
              <div className="flex items-center gap-0.5">
                {onUpdateBlock && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      startRenameBlock(blk);
                    }}
                    title="Ubah Nama Lapisan"
                    aria-label="Ubah Nama Lapisan"
                    className="p-1 rounded bg-white border border-[#DCE5EF] text-[#17243D] hover:border-[#00C98A] hover:text-[#00A873] cursor-pointer"
                  >
                    <Pencil className="w-3 h-3" />
                  </button>
                )}
                {onUpdateBlock && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateBlock(blk.id, (prev) => ({
                        ...prev,
                        style: {
                          ...prev.style,
                          visibility: prev.style?.visibility === 'hidden' ? 'visible' : 'hidden',
                        },
                      }));
                    }}
                    title={isHidden ? 'Tampilkan Lapisan' : 'Sembunyikan Lapisan'}
                    aria-label={isHidden ? 'Tampilkan Lapisan' : 'Sembunyikan Lapisan'}
                    className={`p-1 rounded border cursor-pointer ${
                      isHidden
                        ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                        : 'bg-white border-[#DCE5EF] text-[#17243D] hover:border-[#00C98A] hover:text-[#00A873]'
                    }`}
                  >
                    {isHidden ? <EyeOff className="w-3 h-3" /> : <Eye className="w-3 h-3" />}
                  </button>
                )}
                {onUpdateBlock && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onUpdateBlock(blk.id, (prev) => ({
                        ...prev,
                        style: {
                          ...prev.style,
                          locked: !prev.style?.locked,
                        },
                      }));
                    }}
                    title={isLocked ? 'Buka Kunci Lapisan' : 'Kunci Lapisan'}
                    aria-label={isLocked ? 'Buka Kunci Lapisan' : 'Kunci Lapisan'}
                    className={`p-1 rounded border cursor-pointer ${
                      isLocked
                        ? 'bg-amber-50 border-amber-300 text-amber-700 hover:bg-amber-100'
                        : 'bg-white border-[#DCE5EF] text-[#17243D] hover:border-[#00C98A] hover:text-[#00A873]'
                    }`}
                  >
                    {isLocked ? <Lock className="w-3 h-3" /> : <Unlock className="w-3 h-3" />}
                  </button>
                )}
                <button
                  type="button"
                  disabled={effectiveIndex === 0 || isLocked}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRowMove('up');
                  }}
                  title="Naikkan"
                  aria-label="Naikkan Lapisan"
                  className="p-1 rounded bg-white border border-[#DCE5EF] text-[#17243D] hover:border-[#00C98A] disabled:opacity-35 cursor-pointer"
                >
                  <ArrowUp className="w-3 h-3" />
                </button>
                <button
                  type="button"
                  disabled={effectiveIndex === effectiveSiblingsCount - 1 || isLocked}
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRowMove('down');
                  }}
                  title="Turunkan"
                  aria-label="Turunkan Lapisan"
                  className="p-1 rounded bg-white border border-[#DCE5EF] text-[#17243D] hover:border-[#00C98A] disabled:opacity-35 cursor-pointer"
                >
                  <ArrowDown className="w-3 h-3" />
                </button>
                {onDuplicateBlock && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onDuplicateBlock(blk.id);
                    }}
                    title="Duplikat Lapisan"
                    aria-label="Duplikat Lapisan"
                    className="p-1 rounded bg-white border border-[#DCE5EF] text-[#00A873] hover:border-[#00C98A] cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                  </button>
                )}
                <button
                  type="button"
                  disabled={isLocked}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (!isLocked) onDeleteBlock(blk.id);
                  }}
                  title={isLocked ? 'Lapisan terkunci' : 'Hapus Lapisan'}
                  aria-label="Hapus Lapisan"
                  className="p-1 rounded bg-white border border-[#DCE5EF] text-red-600 hover:bg-red-50 hover:border-red-300 disabled:opacity-35 disabled:pointer-events-none cursor-pointer"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>

              {parentBlockId && (
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectBlock(parentBlockId);
                  }}
                  title="Pilih Lapisan Induk"
                  className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-[#17243D] text-white hover:bg-[#17243D]/90 text-[9.5px] font-semibold cursor-pointer"
                >
                  <CornerLeftUp className="w-2.5 h-2.5 text-[#7AF0C7]" />
                  <span>Induk</span>
                </button>
              )}
            </div>

            {isContainer && (
              <div className="flex items-center gap-1 flex-wrap pt-1 border-t border-[#00C98A]/25">
                <span className="text-[9px] font-bold text-[#008F63] uppercase tracking-wide mr-0.5">
                  + Anak:
                </span>
                {(
                  [
                    { type: 'text', label: 'Teks' },
                    { type: 'image', label: 'Gambar' },
                    { type: 'button', label: 'Tombol' },
                    { type: 'row', label: 'Kolom' },
                  ] as { type: BlockType; label: string }[]
                ).map((item) => (
                  <button
                    key={item.type}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddChildToContainer(blk.id, item.type);
                    }}
                    className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded bg-white border border-[#DCE5EF] hover:border-[#00C98A] text-[9.5px] font-semibold text-[#17243D] cursor-pointer"
                  >
                    <Plus className="w-2.5 h-2.5 text-[#00A873]" />
                    <span>{item.label}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {hasExpandable && isGroupExpanded && (
          <div className="space-y-1.5 border-l-2 border-[#00C98A]/35 ml-2 pl-1.5 pt-0.5">
            {isHeroBanner ? (
              <>
                {/* Lapisan 1: Cover Banner */}
                {heroCoverSub && renderSubLayerRow(blk, heroCoverSub)}

                {/* Lapisan 2: Isi Wadah (anak komponen di atas cover) */}
                {Array.isArray(blk.children) && blk.children.length > 0 && (
                  <div className="space-y-1">
                    <div className="text-[9px] font-bold uppercase tracking-wide text-[#008F63] px-1">
                      Lapisan 2 · Isi Wadah ({blk.children.length})
                    </div>
                    {blk.children.map((ch, cIdx) =>
                      renderLayerNode(ch, cIdx, blk.children!.length, depth + 1)
                    )}
                  </div>
                )}

                {/* Lapisan 3: Kartu Profil */}
                {heroCardSub && renderSubLayerRow(blk, heroCardSub)}

                {/* Add-ons aktif (Keranjang / Aksi Klik) */}
                {heroExtraSubs.map((sub) => renderSubLayerRow(blk, sub))}
              </>
            ) : (
              <>
                {/* Bagian Struktural Komponen */}
                {partSubLayers.length > 0 && (
                  <div className="space-y-1">
                    {(itemSubLayers.length > 0 ||
                      (blk.type === 'fnb_catalog' && (blk.children?.length ?? 0) > 0)) && (
                      <div className="text-[9px] font-bold uppercase tracking-wide text-[#51637D] px-1">
                        Bagian Komponen ({partSubLayers.length})
                      </div>
                    )}
                    {partSubLayers.map((sub) => renderSubLayerRow(blk, sub))}
                  </div>
                )}

                {/* Komponen Anak Langsung (Wadah / Row / Kartu Dinamis / Sheet) — Katalog F&B menggabungkan card & blok ke Daftar Item */}
                {blk.type !== 'fnb_catalog' &&
                  Array.isArray(blk.children) &&
                  blk.children.length > 0 && (
                    <div className="space-y-1">
                      <div className="text-[9px] font-bold uppercase tracking-wide text-[#51637D] px-1">
                        {blk.type === 'showcase_card'
                          ? `Zona Atas / Isi Kartu (${blk.children.length})`
                          : `Isi Komponen (${blk.children.length})`}
                      </div>
                      {blk.children.map((ch, cIdx) =>
                        renderLayerNode(ch, cIdx, blk.children!.length, depth + 1)
                      )}
                    </div>
                  )}

                {/* Daftar Item Gabungan Khusus Katalog Menu F&B (Menu + Card & Blok bisa saling geser/pindah posisi) */}
                {blk.type === 'fnb_catalog' &&
                  (() => {
                    const unifiedEntries = resolveOrderedFnbEntries(blk);
                    if (unifiedEntries.length === 0 && !dragLayerId) return null;
                    const itemSubById = new Map<string, ExtractedSubLayer>();
                    for (const s of itemSubLayers) {
                      itemSubById.set(s.id, s);
                    }
                    const rawQuery = (layerItemSearch[blk.id] ?? '').trim().toLowerCase();
                    const filteredEntries = rawQuery
                      ? unifiedEntries.filter((entry) => {
                          if (entry.kind === 'menu') {
                            const sub = itemSubById.get(`fnb_${entry.id}`);
                            return (
                              entry.item.title.toLowerCase().includes(rawQuery) ||
                              (entry.item.category || '').toLowerCase().includes(rawQuery) ||
                              (sub?.typeLabel.toLowerCase().includes(rawQuery) ?? false)
                            );
                          }
                          const blkTitle =
                            entry.block.label?.trim() ||
                            label(
                              `komponen.type.${entry.block.type}`,
                              BLOCK_TYPE_NAMES[entry.block.type]
                            );
                          const blkTypeName = label(
                            `komponen.type.${entry.block.type}`,
                            BLOCK_TYPE_NAMES[entry.block.type]
                          );
                          return (
                            blkTitle.toLowerCase().includes(rawQuery) ||
                            blkTypeName.toLowerCase().includes(rawQuery)
                          );
                        })
                      : unifiedEntries;

                    return (
                      <div
                        className="space-y-1"
                        onDragOver={(e) => {
                          if (!dragLayerId && !hasSidebarDragPayload(e.dataTransfer)) return;
                          if (dragLayerId === blk.id) return;
                          e.preventDefault();
                        }}
                        onDrop={(e) => {
                          if (e.defaultPrevented) return;
                          e.preventDefault();
                          e.stopPropagation();
                          if (handleSidebarDropOnTarget(e, blk.id, 'inside')) {
                            setDragLayerId(null);
                            setDragOverInfo(null);
                            return;
                          }
                          const sourceId = dragLayerId || e.dataTransfer.getData('text/plain');
                          setDragLayerId(null);
                          setDragOverInfo(null);
                          if (sourceId && sourceId !== blk.id) {
                            onReorderBlock(sourceId, blk.id, 'inside');
                          }
                        }}
                      >
                        <div className="flex items-center justify-between gap-1 px-1 pt-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wide text-[#008F63]">
                            Daftar Item ({unifiedEntries.length})
                          </span>
                          {rawQuery ? (
                            <span className="text-[9px] text-[#64748B] tabular-nums">
                              {filteredEntries.length} cocok
                            </span>
                          ) : (
                            <span className="text-[8.5px] text-[#8FA4BF]">
                              Seret untuk atur posisi
                            </span>
                          )}
                        </div>
                        {unifiedEntries.length > 8 && (
                          <input
                            type="search"
                            value={layerItemSearch[blk.id] ?? ''}
                            onChange={(e) =>
                              setLayerItemSearch((prev) => ({
                                ...prev,
                                [blk.id]: e.target.value,
                              }))
                            }
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Cari menu atau card di layer..."
                            className="w-full px-2 py-1 text-[10.5px] rounded-md border border-[#DCE5EF] bg-white text-[#17243D] placeholder:text-[#94A3B8] outline-none focus:border-[#00C98A]"
                          />
                        )}
                        {filteredEntries.length === 0 ? (
                          <div className="px-2 py-2 text-[10px] text-[#8FA4BF] text-center">
                            Item tidak ditemukan
                          </div>
                        ) : (
                          filteredEntries.map((entry) => {
                            const unifiedIndex = unifiedEntries.findIndex(
                              (e) => e.key === entry.key
                            );
                            const fnbCtx: FnbUnifiedLayerCtx = {
                              catalogId: blk.id,
                              entryKey: entry.key,
                              unifiedIndex: unifiedIndex >= 0 ? unifiedIndex : 0,
                              unifiedCount: unifiedEntries.length,
                            };
                            if (entry.kind === 'block') {
                              return renderLayerNode(
                                entry.block,
                                fnbCtx.unifiedIndex,
                                unifiedEntries.length,
                                depth + 1,
                                fnbCtx
                              );
                            }
                            const sub = itemSubById.get(`fnb_${entry.id}`);
                            if (!sub) return null;
                            return renderSubLayerRow(blk, sub, false, fnbCtx);
                          })
                        )}
                      </div>
                    );
                  })()}

                {/* Daftar Item Data (Slide / Produk / Program / Kategori / Sosmed / Kolom Form) */}
                {blk.type !== 'fnb_catalog' &&
                  itemSubLayers.length > 0 &&
                  (() => {
                    const rawQuery = (layerItemSearch[blk.id] ?? '').trim().toLowerCase();
                    const filteredItemSubs = rawQuery
                      ? itemSubLayers.filter(
                          (s) =>
                            s.label.toLowerCase().includes(rawQuery) ||
                            s.typeLabel.toLowerCase().includes(rawQuery)
                        )
                      : itemSubLayers;
                    return (
                      <div className="space-y-1">
                        <div className="flex items-center justify-between gap-1 px-1 pt-0.5">
                          <span className="text-[9px] font-bold uppercase tracking-wide text-[#008F63]">
                            Daftar Item ({itemSubLayers.length})
                          </span>
                          {rawQuery && (
                            <span className="text-[9px] text-[#64748B] tabular-nums">
                              {filteredItemSubs.length} cocok
                            </span>
                          )}
                        </div>
                        {itemSubLayers.length > 8 && (
                          <input
                            type="search"
                            value={layerItemSearch[blk.id] ?? ''}
                            onChange={(e) =>
                              setLayerItemSearch((prev) => ({
                                ...prev,
                                [blk.id]: e.target.value,
                              }))
                            }
                            onClick={(e) => e.stopPropagation()}
                            placeholder="Cari item di layer..."
                            className="w-full px-2 py-1 text-[10.5px] rounded-md border border-[#DCE5EF] bg-white text-[#17243D] placeholder:text-[#94A3B8] outline-none focus:border-[#00C98A]"
                          />
                        )}
                        {filteredItemSubs.length === 0 ? (
                          <div className="px-2 py-2 text-[10px] text-[#8FA4BF] text-center">
                            Item tidak ditemukan
                          </div>
                        ) : (
                          filteredItemSubs.map((sub) => renderSubLayerRow(blk, sub))
                        )}
                      </div>
                    );
                  })()}
              </>
            )}

            {/* Strip Bawah Kartu Dinamis */}
            {Array.isArray(blk.content?.cardFooterBlocks) &&
              blk.content.cardFooterBlocks.length > 0 && (
                <div className="space-y-1 border-l border-dashed border-sky-500/70 pl-1.5">
                  <div className="text-[9px] font-bold uppercase tracking-wide text-sky-700 px-1">
                    Strip Bawah ({blk.content.cardFooterBlocks.length})
                  </div>
                  {blk.content.cardFooterBlocks.map((ch, cIdx) =>
                    renderLayerNode(ch, cIdx, blk.content.cardFooterBlocks!.length, depth + 1)
                  )}
                </div>
              )}

            {/* Isi Sheet Aksi */}
            {Array.isArray(blk.content?.actionSheetBlocks) &&
              blk.content.actionSheetBlocks.length > 0 && (
                <div className="space-y-1 border-l border-dashed border-[#00C98A]/60 pl-1.5">
                  <div className="text-[9px] font-bold uppercase tracking-wide text-[#00A873] px-1">
                    Isi Sheet ({blk.content.actionSheetPosition || 'bottom'})
                  </div>
                  {blk.content.actionSheetBlocks.map((ch, cIdx) =>
                    renderLayerNode(ch, cIdx, blk.content.actionSheetBlocks!.length, depth + 1)
                  )}
                </div>
              )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-2.5 space-y-2 bg-[#F0F5FA]/50">
      {/* 1. Tema Global */}
      {showTema && isVisible('home.sec.temaGlobal') && (
        <AccordionSection
          id="temaGlobal"
          title={label('home.sec.temaGlobal', 'Tema Global')}
          icon={<Palette className="w-3.5 h-3.5" />}
          badge={theme.name}
          isOpen={openSections.temaGlobal}
          onToggle={() => toggleSection('temaGlobal')}
        >
        {isVisible('home.desc.temaGlobal') && (
          <p className="text-[10.5px] text-[#51637D] leading-relaxed">
            {label(
              'home.desc.temaGlobal',
              'Atur palet warna & font standar halaman. Komponen dengan warna kustom lokal tetap dipertahankan kecuali di-reset.'
            )}
          </p>
        )}

        {/* Status Override Tema Halaman (P3-D) */}
        <div
          className={`p-2 rounded-lg border flex items-center justify-between gap-2 ${
            pageThemeOverrideCount > 0
              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
              : 'bg-[#ECFDF6] border-[#00C98A]/35 text-[#065F46]'
          }`}
        >
          <span className="text-[10.5px] font-medium leading-snug">
            {pageThemeOverrideCount > 0
              ? `${pageThemeOverrideCount} komponen di halaman ini memiliki override lokal`
              : 'Seluruh komponen mengikuti Tema Global'}
          </span>
          {pageThemeOverrideCount > 0 && onResetPageThemeOverrides && (
            <button
              type="button"
              onClick={onResetPageThemeOverrides}
              title="Kembalikan seluruh warna komponen di halaman ini ke Tema Global tanpa menghapus isi"
              className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-amber-300 hover:bg-amber-100 text-[10px] font-bold text-amber-800 shrink-0 cursor-pointer"
            >
              <RotateCcw className="w-2.5 h-2.5" />
              <span>Reset Override</span>
            </button>
          )}
        </div>

        <div>
          <label className="block text-xs font-medium text-[#17243D] mb-1">
            {label('home.field.fontUtama', 'Font Utama Halaman')}
          </label>
          <select
            value={theme.fontFamily ?? 'Plus Jakarta Sans'}
            onChange={(e) =>
              onSelectTheme({
                ...theme,
                fontFamily: e.target.value || undefined,
              })
            }
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white text-[#17243D] outline-none focus:border-[#00C98A]"
          >
            {FONT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} ({opt.category})
              </option>
            ))}
          </select>
        </div>

        <div>
          <div className="text-xs font-medium text-[#17243D] mb-1.5">
            {label('home.field.presetTema', 'Preset Tema')}
          </div>
          <div className="grid grid-cols-2 gap-1.5 max-h-56 overflow-y-auto pr-0.5">
            {THEMES.map((preset) => {
              const active = theme.id === preset.id;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    onSelectTheme({
                      ...preset,
                      fontFamily: theme.fontFamily ?? preset.fontFamily,
                    })
                  }
                  className={`p-2 rounded-lg border text-left transition-all cursor-pointer ${
                    active
                      ? 'border-[#00C98A] bg-[#ECFDF6] ring-1 ring-[#00C98A]/30'
                      : 'border-[#DCE5EF] bg-white hover:border-[#8FA4BF]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-1 mb-1">
                    <div className="flex items-center gap-1">
                      {[preset.canvasBg, preset.cardBg, preset.accentColor, preset.textColor].map(
                        (sw, idx) => (
                          <span
                            key={idx}
                            style={{ backgroundColor: sw }}
                            className="w-3 h-3 rounded-full border border-black/10"
                          />
                        )
                      )}
                    </div>
                    {active && <Check className="w-3 h-3 text-[#00A873] shrink-0" />}
                  </div>
                  <div className="text-[11px] font-semibold text-[#17243D] truncate">
                    {preset.name}
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-[#17243D]">
            {label('home.field.warnaTemaManual', 'Warna Tema Manual')}
          </div>
          <div className="grid grid-cols-2 gap-2">
            {(
              [
                { key: 'canvasBg', label: 'Latar Kanvas' },
                { key: 'cardBg', label: 'Latar Kartu' },
                { key: 'textColor', label: 'Warna Teks' },
                { key: 'accentColor', label: 'Warna Aksen' },
                { key: 'borderColor', label: 'Warna Garis' },
              ] as const
            ).map((item) => (
              <div key={item.key}>
                <label className="block text-[10.5px] font-medium text-[#8FA4BF] mb-1">
                  {item.label}
                </label>
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={theme[item.key]}
                    onChange={(e) =>
                      onSelectTheme({
                        ...theme,
                        id: 'custom',
                        name: 'Tema Kustom',
                        [item.key]: e.target.value,
                      })
                    }
                    className="w-7 h-7 rounded-md border border-[#DCE5EF] bg-white p-0.5 cursor-pointer shrink-0"
                  />
                  <span className="text-[10.5px] font-mono text-[#51637D] truncate">
                    {theme[item.key]}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </AccordionSection>
      )}

      {/* 1a. Template Web (Simpan 1 Halaman Penuh + Sub Halaman untuk Multi-User) */}
      {showTema && isVisible('home.sec.webTemplates') && onOpenSaveWebTemplate && (
        <AccordionSection
          id="webTemplates"
          title={label('home.sec.webTemplates', 'Template Web')}
          icon={<Globe className="w-3.5 h-3.5" />}
          badge={`${webTemplates.length} template`}
          isOpen={openSections.webTemplates}
          onToggle={() => toggleSection('webTemplates')}
        >
          <WebTemplatesSection
            templates={webTemplates}
            loading={webTemplatesLoading}
            currentUser={currentUser}
            canEditCanvas={canEditCanvas}
            canCreateProject={canCreateProject}
            onOpenSaveModal={onOpenSaveWebTemplate}
            onOpenEditModal={(tpl) => onOpenEditWebTemplate?.(tpl)}
            onApplyToCurrentProject={(tpl) => onApplyWebTemplate?.(tpl)}
            onCreateProjectFromTemplate={onCreateProjectFromWebTemplate}
            onOverwriteFromCanvas={onOverwriteWebTemplateFromCanvas}
            onDeleteTemplate={(tpl) => onDeleteWebTemplate?.(tpl)}
            onImportTemplateJson={(raw) => onImportWebTemplateJson?.(raw)}
            onRefresh={onRefreshWebTemplates}
          />
        </AccordionSection>
      )}

      {/* 1b. Multi Halaman (Beranda, Tambah Site, Duplikat Site, Hapus Site) */}
      {showTema && isVisible('home.sec.pages') && (
        <AccordionSection
          id="pages"
          title={label('home.sec.pages', 'Multi Halaman')}
          icon={<Files className="w-3.5 h-3.5" />}
          badge={`${pages.length + 1} site`}
          isOpen={openSections.pages}
          onToggle={() => toggleSection('pages')}
        >
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            {isVisible('home.desc.pages') ? (
              <span className="text-[11px] text-[#51637D]">
                {label('home.desc.pages', 'Kelola Beranda, tambah, duplikat, atau hapus site.')}
              </span>
            ) : (
              <span />
            )}
            {onAddSubPage && (
              <button
                type="button"
                data-add-site-btn="1"
                onClick={() => onAddSubPage()}
                title={label('home.action.addSite', '+ Tambah Site')}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-[#00C98A] hover:bg-[#00B37B] text-white text-[10.5px] font-bold cursor-pointer shrink-0"
              >
                <FilePlus2 className="w-3 h-3" />
                <span>{label('home.action.addSite', '+ Tambah Site')}</span>
              </button>
            )}
          </div>

          <button
            type="button"
            onClick={() => onSelectSubPage?.(null)}
            className={`w-full flex items-center justify-between gap-2 px-2.5 py-2 rounded-lg border text-left transition-colors cursor-pointer ${
              activeSubPageId === null
                ? 'bg-[#ECFDF6] border-[#00C98A] text-[#17243D]'
                : 'bg-white border-[#DCE5EF] text-[#17243D] hover:border-[#8FA4BF]'
            }`}
          >
            <div>
              <div className="text-[11.5px] font-bold">
                {label('home.field.berandaTitle', 'Beranda (Halaman Utama)')}
              </div>
              {isVisible('home.desc.berandaSub') && (
                <div className="text-[10px] text-[#8FA4BF]">
                  {label('home.desc.berandaSub', 'Halaman pembuka publik')}
                </div>
              )}
            </div>
            {activeSubPageId === null && (
              <span className="px-1.5 py-0.5 rounded bg-[#00C98A] text-white text-[9.5px] font-bold">
                Aktif
              </span>
            )}
          </button>

          {pages.map((pg, idx) => {
            const isActivePg = activeSubPageId === pg.id;
            return (
              <div
                key={pg.id}
                className={`p-2 rounded-lg border space-y-2 ${
                  isActivePg
                    ? 'bg-[#ECFDF6]/70 border-[#00C98A]'
                    : 'bg-white border-[#DCE5EF]'
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <button
                    type="button"
                    onClick={() => onSelectSubPage?.(pg.id)}
                    className="min-w-0 flex-1 text-left cursor-pointer"
                  >
                    <div className="text-[11.5px] font-bold text-[#17243D] truncate">
                      {idx + 2}. {pg.title}
                    </div>
                    <div className="text-[9.5px] text-[#8FA4BF]">
                      {pg.blocks.length} blok · {pg.showBackButton !== false ? 'Back Aktif' : 'Tanpa Back'}
                    </div>
                  </button>
                  <div className="flex items-center gap-0.5 shrink-0">
                    {onDuplicateSubPage && (
                      <button
                        type="button"
                        onClick={() => onDuplicateSubPage(pg.id)}
                        title={label('home.action.duplicateSite', 'Duplikat Site')}
                        aria-label={label('home.action.duplicateSite', 'Duplikat Site')}
                        className="p-1 rounded hover:bg-white text-[#51637D] hover:text-[#00A873] cursor-pointer"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    )}
                    {onDeleteSubPage && (
                      <button
                        type="button"
                        onClick={() => onDeleteSubPage(pg.id)}
                        title={label('home.action.deleteSite', 'Hapus Site')}
                        aria-label={label('home.action.deleteSite', 'Hapus Site')}
                        className="p-1 rounded hover:bg-red-50 text-[#8FA4BF] hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>

                {isActivePg && onUpdateSubPage && (
                  <div className="pt-1.5 border-t border-[#00C98A]/30 space-y-2">
                    <div>
                      <label className="block text-[10px] font-semibold text-[#51637D] mb-0.5">
                        Nama Halaman
                      </label>
                      <input
                        type="text"
                        value={pg.title}
                        onChange={(e) => onUpdateSubPage(pg.id, { title: e.target.value })}
                        className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                      />
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[10.5px] font-medium text-[#17243D]">
                        Tombol Back Otomatis
                      </span>
                      <ToggleSwitch
                        checked={pg.showBackButton !== false}
                        onChange={(checked) =>
                          onUpdateSubPage(pg.id, { showBackButton: checked })
                        }
                        label="Tampilkan Tombol Back di Atas Halaman"
                      />
                    </div>
                    {pg.showBackButton !== false && (
                      <div>
                        <label className="block text-[10px] font-semibold text-[#51637D] mb-0.5">
                          Label Tombol Back
                        </label>
                        <input
                          type="text"
                          value={pg.backButtonLabel ?? 'Kembali'}
                          onChange={(e) =>
                            onUpdateSubPage(pg.id, { backButtonLabel: e.target.value })
                          }
                          placeholder="Kembali"
                          className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                        />
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </AccordionSection>
      )}

      {/* 2. Top */}
      {showTema && isVisible('home.sec.top') && (
        <AccordionSection
          id="top"
          title={label('home.sec.top', 'Top')}
          icon={<PanelTop className="w-3.5 h-3.5" />}
          badge={`${pageTopPadding}px`}
          isOpen={openSections.top}
          onToggle={() => toggleSection('top')}
        >
        <div className="space-y-2">
          {isVisible('home.desc.top') && (
            <div className="text-[11px] text-[#51637D]">
              {label(
                'home.desc.top',
                'Jarak ruang di bagian paling atas kanvas halaman sebelum blok pertama.'
              )}
            </div>
          )}
          <div className="grid grid-cols-3 gap-1.5">
            {[
              { val: 0, label: '0px Rapat' },
              { val: 12, label: '12px Rapi' },
              { val: 24, label: '24px Lega' },
            ].map((opt) => (
              <button
                key={opt.val}
                type="button"
                onClick={() => onUpdateAdvanceOptions({ pageTopPadding: opt.val })}
                className={`py-1.5 px-2 rounded-lg text-[11px] font-semibold border transition-colors cursor-pointer ${
                  pageTopPadding === opt.val
                    ? 'bg-[#17243D] text-white border-[#17243D]'
                    : 'bg-white text-[#51637D] border-[#DCE5EF] hover:bg-[#F0F5FA]'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <SliderRow
            label={label('home.field.jarakAtas', 'Jarak Atas Halaman')}
            value={`${pageTopPadding}px`}
            min={0}
            max={48}
            step={2}
            current={pageTopPadding}
            onChange={(val) => onUpdateAdvanceOptions({ pageTopPadding: val })}
          />
          {blocks[0] && (
            <button
              type="button"
              onClick={() => onSelectBlock(blocks[0].id)}
              className="w-full py-1.5 px-3 rounded-lg border border-[#DCE5EF] bg-[#F0F5FA]/70 hover:bg-[#F0F5FA] text-xs font-semibold text-[#17243D] cursor-pointer"
            >
              Pilih Blok Teratas ({blocks[0].label || label(`komponen.type.${blocks[0].type}`, BLOCK_TYPE_NAMES[blocks[0].type])})
            </button>
          )}
        </div>
      </AccordionSection>
      )}

      {/* 3. Daftar Lapisan Halaman — langsung tampil di Tab Layer tanpa bungkus Body (Lapisan) */}
      {showLayer && (
        <div className="space-y-1.5" data-all-layers-list>
          {blocks.length === 0 ? (
            isVisible('home.desc.bodyKosong') ? (
              <div className="py-4 px-3 rounded-xl border border-dashed border-[#DCE5EF] bg-white/80 text-center text-[11px] text-[#8FA4BF]">
                {label(
                  'home.desc.bodyKosong',
                  'Kanvas masih kosong. Tambahkan blok dari panel kiri.'
                )}
              </div>
            ) : null
          ) : (
            <div className="space-y-1">
              {blocks.map((blk, idx) => renderLayerNode(blk, idx, blocks.length, 0))}
            </div>
          )}
        </div>
      )}

      {/* 4. Bottom (Navbar Bawah & Lapisan Modal Navbar Bawah) */}
      {showTema && isVisible('home.sec.bottom') && (
        <AccordionSection
          id="bottom"
          title={label('home.sec.bottom', 'Bottom (Navbar Bawah)')}
          icon={<PanelBottom className="w-3.5 h-3.5" />}
          badge={bottomNavbar.enabled ? 'Aktif' : 'Nonaktif'}
          isOpen={openSections.bottom}
          onToggle={() => toggleSection('bottom')}
        >
        <div className="space-y-3">
          {/* Status & Layout Navbar */}
          <div className="p-2.5 rounded-xl border border-[#DCE5EF] bg-white space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#DCE5EF]">
              <div>
                <div className="text-xs font-bold text-[#17243D]">
                  {label('home.field.navbarBawah', 'Navbar Bawah')}
                </div>
                {isVisible('home.desc.navbarBawah') && (
                  <div className="text-[10.5px] text-[#8FA4BF]">
                    {label('home.desc.navbarBawah', 'Menu mengambang & Modal Bottom Sheet')}
                  </div>
                )}
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
              <div className="text-xs font-semibold text-[#17243D] mb-1.5">
                {label('home.field.posisiNavbar', 'Posisi Navbar')}
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
                        ? 'bg-[#17243D] text-white border-[#17243D]'
                        : 'bg-[#F0F5FA] text-[#51637D] border-[#DCE5EF] hover:bg-[#DCE5EF]/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-[#17243D] mb-1.5">
                {label('home.field.gayaTombolTengah', 'Gaya Tombol Tengah (Home)')}
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
                        ? 'bg-[#17243D] text-white border-[#17243D]'
                        : 'bg-[#F0F5FA] text-[#51637D] border-[#DCE5EF] hover:bg-[#DCE5EF]/50'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ukuran, Posisi Naik/Turun & Shadow */}
            <div className="p-2.5 rounded-xl bg-[#F0F5FA]/60 border border-[#DCE5EF] space-y-2.5">
              <div className="text-[11px] font-bold text-[#17243D]">
                {label('home.field.ukuranPosisiShadow', 'Ukuran, Posisi Naik/Turun & Shadow')}
              </div>

              <SliderRow
                label="Ukuran Ikon"
                value={`${navMetrics.iconSize}px`}
                min={12}
                max={32}
                current={navMetrics.iconSize}
                onChange={(val) => onUpdateBottomNavbar((prev) => ({ ...prev, iconSize: val }))}
              />
              <SliderRow
                label="Ukuran Teks"
                value={`${navMetrics.labelSize}px`}
                min={8}
                max={16}
                current={navMetrics.labelSize}
                onChange={(val) => onUpdateBottomNavbar((prev) => ({ ...prev, labelSize: val }))}
              />
              <SliderRow
                label="Tinggi / Tebal Navbar"
                value={`${navMetrics.barPaddingY}px`}
                min={2}
                max={24}
                current={navMetrics.barPaddingY}
                onChange={(val) => onUpdateBottomNavbar((prev) => ({ ...prev, barPaddingY: val }))}
              />
              <SliderRow
                label="Lebar Navbar"
                value={`${navMetrics.barWidthPercent}%`}
                min={70}
                max={100}
                current={navMetrics.barWidthPercent}
                onChange={(val) =>
                  onUpdateBottomNavbar((prev) => ({ ...prev, barWidthPercent: val }))
                }
              />
              <SliderRow
                label="Naik / Turun dari Bawah"
                value={`${navMetrics.bottomOffset}px`}
                min={0}
                max={48}
                step={2}
                current={navMetrics.bottomOffset}
                onChange={(val) =>
                  onUpdateBottomNavbar((prev) => ({ ...prev, bottomOffset: val }))
                }
              />
              <SliderRow
                label="Sudut Melengkung"
                value={`${navMetrics.borderRadius}px`}
                min={0}
                max={32}
                step={2}
                current={navMetrics.borderRadius}
                onChange={(val) =>
                  onUpdateBottomNavbar((prev) => ({ ...prev, borderRadius: val }))
                }
              />

              <div>
                <div className="text-[11px] font-medium text-[#51637D] mb-1">
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
                          ? 'bg-[#17243D] text-white border-[#17243D]'
                          : 'bg-white text-[#51637D] border-[#DCE5EF] hover:bg-[#F0F5FA]'
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
                <span className="text-xs font-semibold text-[#17243D]">
                  {label('home.field.warnaNavbar', 'Warna Navbar')}
                </span>
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
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00A873] hover:underline cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Samakan Tema</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { key: 'barBg', label: 'Latar Bar' },
                    { key: 'textColor', label: 'Teks & Ikon' },
                    { key: 'accentColor', label: 'Aksen (Home)' },
                    { key: 'borderColor', label: 'Garis Atas' },
                  ] as const
                ).map((cField) => (
                  <div key={cField.key}>
                    <label className="block text-[11px] font-medium text-[#8FA4BF] mb-1">
                      {cField.label}
                    </label>
                    <input
                      type="color"
                      value={bottomNavbar[cField.key]}
                      onChange={(e) =>
                        onUpdateBottomNavbar((prev) => ({
                          ...prev,
                          [cField.key]: e.target.value,
                        }))
                      }
                      className="w-full h-8 rounded-lg border border-[#DCE5EF] bg-white p-0.5 cursor-pointer"
                    />
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* 5 Menu Selector + Editor */}
          <div className="p-2.5 rounded-xl border border-[#DCE5EF] bg-white space-y-3">
            <div className="flex items-center justify-between gap-2 pb-2 border-b border-[#DCE5EF]">
              <h4 className="text-xs font-bold text-[#17243D]">
                {label('home.field.menuNavbar', '5 Menu Navbar')}
              </h4>
              <span className="text-[10.5px] text-[#8FA4BF]">Klik menu untuk edit</span>
            </div>

            <div className="grid grid-cols-5 gap-1">
              {navItems.map((it) => {
                const isSelectedNav = activeNavItem?.id === it.id;
                const icId = resolveButtonIcon(it.icon, it.label);
                const glyph = icId === 'none' ? 'info' : icId;
                return (
                  <button
                    key={it.id}
                    type="button"
                    onClick={() => onSelectNavItem(it.id)}
                    className={`relative flex flex-col items-center justify-center gap-1 py-2 px-1 rounded-lg border text-center transition-all cursor-pointer min-w-0 ${
                      isSelectedNav
                        ? 'bg-[#17243D] text-white border-[#17243D] shadow-xs'
                        : 'bg-[#F0F5FA] text-[#17243D] border-[#DCE5EF] hover:border-[#8FA4BF]'
                    } ${it.enabled === false ? 'opacity-50' : ''}`}
                  >
                    <span
                      className={`absolute top-1 right-1 w-1.5 h-1.5 rounded-full ${
                        it.enabled !== false
                          ? isSelectedNav
                            ? 'bg-[#00C98A]'
                            : 'bg-[#00C98A]'
                          : 'bg-[#8FA4BF]'
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

            {activeNavItem && (() => {
              const activeIdx = navItems.findIndex((i) => i.id === activeNavItem.id);
              const activeIcon = resolveButtonIcon(activeNavItem.icon, activeNavItem.label);
              return (
                <div className="pt-2 border-t border-[#DCE5EF] space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <div className="text-xs font-bold text-[#17243D]">
                        {activeNavItem.label || 'Menu'}
                      </div>
                      <div className="text-[11px] text-[#8FA4BF]">{slotLabel(activeIdx)}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-medium text-[#51637D]">
                        {activeNavItem.enabled !== false ? 'Aktif' : 'Nonaktif'}
                      </span>
                      <ToggleSwitch
                        checked={activeNavItem.enabled !== false}
                        onChange={(checked) => updateNavItem(activeNavItem.id, { enabled: checked })}
                        label={`Aktifkan menu ${activeNavItem.label}`}
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#17243D] mb-1">
                      Label Menu
                    </label>
                    <input
                      type="text"
                      value={activeNavItem.label}
                      onChange={(e) => updateNavItem(activeNavItem.id, { label: e.target.value })}
                      placeholder="Contoh: Galeri"
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                    />
                  </div>

                  <div>
                    <div className="text-xs font-medium text-[#17243D] mb-1.5">Pilih Ikon</div>
                    <IconPicker
                      selectedIcon={activeIcon === 'none' ? 'info' : activeIcon}
                      iconUrl={activeNavItem.iconUrl ?? ''}
                      allowNone={false}
                      accentVariant="emerald"
                      onSelectIcon={(icon) => updateNavItem(activeNavItem.id, { icon })}
                      onChangeIconUrl={(iconUrl) => updateNavItem(activeNavItem.id, { iconUrl })}
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[#17243D] mb-1">
                      Aksi Saat Diklik
                    </label>
                    <select
                      value={activeNavItem.action}
                      onChange={(e) =>
                        updateNavItem(activeNavItem.id, {
                          action: e.target.value as BottomNavbarItemAction,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                    >
                      <option value="sheet">Buka Modal Bottom Sheet</option>
                      <option value="scroll_top">Ke Atas / Beranda (Home)</option>
                      <option value="link">Buka Tautan / Link WA</option>
                    </select>
                  </div>

                  {activeNavItem.action === 'link' && (
                    <div className="p-2.5 rounded-xl bg-[#F0F5FA]/60 border border-[#DCE5EF] space-y-1.5">
                      <label className="block text-[11px] font-semibold text-[#17243D]">
                        URL Tautan / WhatsApp
                      </label>
                      <input
                        type="url"
                        value={activeNavItem.linkUrl ?? ''}
                        onChange={(e) =>
                          updateNavItem(activeNavItem.id, { linkUrl: e.target.value })
                        }
                        placeholder="https://wa.me/62812... atau https://..."
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                      />
                    </div>
                  )}

                  {activeNavItem.action === 'sheet' && (
                    <div className="p-2.5 rounded-xl bg-[#F0F5FA]/60 border border-[#DCE5EF] space-y-3">
                      <div className="flex items-center justify-between gap-2">
                        <span className="text-xs font-bold text-[#17243D]">
                          Isi Modal Bottom Sheet
                        </span>
                        <span className="text-[11px] text-[#8FA4BF] tabular-nums">
                          {activeNavItem.children.length} elemen
                        </span>
                      </div>

                      <div>
                        <label className="block text-[11px] font-medium text-[#51637D] mb-1">
                          Judul Modal Sheet
                        </label>
                        <input
                          type="text"
                          value={activeNavItem.sheetTitle}
                          onChange={(e) =>
                            updateNavItem(activeNavItem.id, { sheetTitle: e.target.value })
                          }
                          placeholder={activeNavItem.label}
                          className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white focus:border-[#00C98A] outline-none"
                        />
                      </div>

                      <div>
                        <div className="text-[11px] font-medium text-[#51637D] mb-1">
                          Arah Buka Sheet
                        </div>
                        <div className="grid grid-cols-4 gap-1">
                          {(
                            [
                              { id: 'bottom', label: 'Bawah' },
                              { id: 'top', label: 'Atas' },
                              { id: 'right', label: 'Kanan' },
                              { id: 'left', label: 'Kiri' },
                            ] as { id: MenuIconSheetPosition; label: string }[]
                          ).map((pos) => {
                            const activePos = (activeNavItem.sheetPosition ?? 'bottom') === pos.id;
                            return (
                              <button
                                key={pos.id}
                                type="button"
                                onClick={() =>
                                  updateNavItem(activeNavItem.id, { sheetPosition: pos.id })
                                }
                                className={`py-1 px-1.5 rounded-lg text-[10.5px] font-semibold border transition-colors cursor-pointer ${
                                  activePos
                                    ? 'bg-[#17243D] text-white border-[#17243D]'
                                    : 'bg-white text-[#51637D] border-[#DCE5EF] hover:border-[#8FA4BF]'
                                }`}
                              >
                                {pos.label}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold text-[#51637D] mb-1.5">
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
                              onClick={() => applyNavSheetTemplate(activeNavItem.id, tpl.id)}
                              className="py-1.5 px-2 rounded-lg bg-white border border-[#DCE5EF] hover:border-[#00C98A] text-[11px] font-medium text-[#17243D] cursor-pointer text-left truncate transition-colors"
                            >
                              {tpl.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold text-[#51637D] mb-1.5">
                          Elemen di Dalam Modal
                        </div>
                        {activeNavItem.children.length > 0 ? (
                          <div className="space-y-1.5">
                            {activeNavItem.children.map((child, cIdx) => (
                              <div
                                key={child.id}
                                className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-lg border border-[#DCE5EF] bg-white"
                              >
                                <button
                                  type="button"
                                  onClick={() => onSelectBlock(child.id)}
                                  className="min-w-0 flex-1 text-left cursor-pointer hover:text-[#00A873]"
                                >
                                  <div className="text-xs font-semibold text-[#17243D] truncate">
                                    {cIdx + 1}. {child.label.trim() || label(`komponen.type.${child.type}`, BLOCK_TYPE_NAMES[child.type])}
                                  </div>
                                  <div className="text-[11px] text-[#8FA4BF] truncate">
                                    {label(`komponen.type.${child.type}`, BLOCK_TYPE_NAMES[child.type])} · Klik untuk edit
                                  </div>
                                </button>
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateNavItem(activeNavItem.id, {
                                      children: activeNavItem.children.filter(
                                        (ch) => ch.id !== child.id
                                      ),
                                    })
                                  }
                                  title="Hapus elemen dari modal"
                                  className="p-1 rounded hover:bg-red-50 text-[#8FA4BF] hover:text-red-600 cursor-pointer shrink-0"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="py-3 px-2.5 rounded-lg border border-dashed border-[#DCE5EF] bg-white text-center text-[11px] text-[#8FA4BF]">
                            Modal sheet ini masih kosong.
                          </div>
                        )}
                      </div>

                      <div>
                        <div className="text-[11px] font-semibold text-[#51637D] mb-1.5">
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
                              onClick={() => onAddChildToContainer(activeNavItem.id, opt.type)}
                              className="flex items-center gap-1 py-1.5 px-2 rounded-lg border border-[#DCE5EF] bg-white hover:border-[#00C98A] text-[11px] font-medium text-[#17243D] cursor-pointer truncate transition-colors"
                            >
                              <Plus className="w-3 h-3 text-[#00C98A] shrink-0" />
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

          {/* Lapisan Modal Navbar Bawah */}
          {isVisible('home.sec.navSheetLayers') && (
          <div className="p-2.5 rounded-xl border border-[#DCE5EF] bg-white space-y-2">
            <div className="flex items-center justify-between gap-2">
              <div className="text-[10.5px] font-bold uppercase tracking-wide text-[#51637D]">
                {label('home.sec.navSheetLayers', 'Lapisan Modal Navbar Bawah')}
              </div>
              <span className="px-1.5 py-0.5 rounded-full bg-[#F0F5FA] text-[#51637D] text-[10px] font-semibold">
                {navSheetLayerCount}
              </span>
            </div>
            {navSheetLayers.length === 0 ? (
              isVisible('home.desc.navSheetEmpty') ? (
                <div className="py-2.5 px-2 rounded-lg border border-dashed border-[#DCE5EF] bg-[#F0F5FA]/50 text-center text-[10.5px] text-[#8FA4BF]">
                  {label(
                    'home.desc.navSheetEmpty',
                    'Belum ada lapisan modal pada menu navbar bawah.'
                  )}
                </div>
              ) : null
            ) : (
              <div className="space-y-1.5">
                {navSheetLayers.map(({ navItem, children }) => {
                  const navGroupKey = `nav:${navItem.id}`;
                  const isNavExpanded = Boolean(expandedLayerGroups[navGroupKey]);
                  return (
                    <div key={navItem.id} className="space-y-1">
                      <div className="flex items-center gap-1 px-1.5 py-1 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
                        <button
                          type="button"
                          data-layer-dropdown-toggle={navGroupKey}
                          aria-expanded={isNavExpanded}
                          onClick={() => toggleLayerGroup(navGroupKey)}
                          className={`w-4 h-4 rounded flex items-center justify-center shrink-0 transition-colors cursor-pointer ${
                            isNavExpanded
                              ? 'bg-[#00C98A] text-white'
                              : 'bg-white text-[#51637D] hover:bg-[#DCE5EF]'
                          }`}
                        >
                          <ChevronDown
                            className={`w-2.5 h-2.5 transition-transform duration-150 ${
                              isNavExpanded ? 'rotate-0' : '-rotate-90'
                            }`}
                          />
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            toggleLayerGroup(navGroupKey);
                            onSelectNavItem(navItem.id);
                            setOpenSections((prev) => ({ ...prev, bottom: true }));
                          }}
                          className="flex-1 min-w-0 text-left text-[10px] font-semibold text-[#17243D] hover:text-[#00A873] truncate cursor-pointer"
                        >
                          Navbar: {navItem.label || navItem.sheetTitle || 'Menu'} ({children.length})
                        </button>
                      </div>
                      {isNavExpanded && (
                        <div className="space-y-1 border-l-2 border-[#00C98A]/35 ml-2 pl-1.5">
                          {children.map((ch, cIdx) =>
                            renderLayerNode(ch, cIdx, children.length, 1)
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
          )}
        </div>
      </AccordionSection>
      )}
    </div>
  );
}
