import { BuilderBlock } from '../types/builder';
import { SOCIAL_PLATFORMS } from './socialIcons';

export type SubLayerIconKind =
  | 'image'
  | 'text'
  | 'card'
  | 'sliders'
  | 'cart'
  | 'link'
  | 'map'
  | 'video'
  | 'list'
  | 'layers'
  | 'form'
  | 'share'
  | 'sparkles'
  | 'divider'
  | 'back';

export type ContentSectionKey =
  | 'items'
  | 'main'
  | 'nav'
  | 'general'
  | 'actions'
  | 'typo'
  | 'extra';

export type DesignSectionKey =
  | 'specific'
  | 'visual'
  | 'layout'
  | 'position'
  | 'typo'
  | 'responsive'
  | 'effects';

export interface ExtractedSubLayer {
  /** Stable identifier unique within the parent block */
  id: string;
  /** Human-readable Indonesian label displayed in the Layer Tree & Right Inspector breadcrumb */
  label: string;
  /** Concise subtitle / type tag */
  typeLabel: string;
  /** Structural part of the component vs an individual data item in a list */
  kind: 'part' | 'item';
  /** Semantic icon identifier */
  icon: SubLayerIconKind;
  /** Optional layer order badge (e.g. "Lapisan 1", "Lapisan 3") */
  layerBadge?: string;
  /** True when the sub-layer is currently hidden/inactive */
  isHidden?: boolean;
  /** True when the sub-layer is currently locked against edits/deletion */
  isLocked?: boolean;
  /** True when this sub-layer can be deleted independently without deleting parent */
  canDelete?: boolean;
  /** True when this sub-layer can be toggled visible/hidden independently */
  canToggleVisibility?: boolean;
  /** True when this sub-layer can be locked/unlocked independently */
  canLock?: boolean;
  /** Optional drill-down key matching BlockContentTab's editingItemKey (e.g. "slide:id", "catalog:id") */
  itemKey?: string;
  /** Optional sub-tab hint inside Data & Daftar Item (catalog / fnb / training) */
  subListTab?:
    | 'products'
    | 'customer'
    | 'shipping'
    | 'menu'
    | 'programs'
    | 'boxes'
    | 'media'
    | 'checklist'
    | 'form';
  /** Konten accordion sections relevant to this sub-layer */
  contentSections: ContentSectionKey[];
  /** Desain accordion sections relevant to this sub-layer */
  designSections: DesignSectionKey[];
}

function snippet(text: string | undefined, maxLen = 28): string {
  const clean = (text ?? '').replace(/\s+/g, ' ').trim();
  if (!clean) return '';
  return clean.length > maxLen ? `${clean.slice(0, maxLen - 1)}…` : clean;
}

const ACTION_TYPE_LABELS: Record<string, string> = {
  url: 'Buka URL',
  sheet: 'Buka Sheet',
  page: 'Pindah Halaman',
  card: 'Lompat ke Kartu',
  back: 'Kembali',
};

export function isSubLayerHidden(block: BuilderBlock | null | undefined, subId: string): boolean {
  const c = block?.content;
  if (!c) return false;
  if (Array.isArray(c.hiddenSubLayers) && c.hiddenSubLayers.includes(subId)) {
    return true;
  }
  if (subId === 'button_icon' && c.buttonHideIcon) return true;
  if (subId === 'button_text' && c.buttonHideText) return true;
  if (subId === 'card_body' && c.cardHideDefaultContent) return true;
  if (subId === 'card_footer' && c.cardHideDefaultFooter) return true;
  if (subId === 'menu_icon_label' && c.menuIconShowLabel === false) return true;
  if (subId === 'cart_product' && c.cartShowProductInfo === false) return true;
  return false;
}

export function isSubLayerDeleted(block: BuilderBlock | null | undefined, subId: string): boolean {
  const c = block?.content;
  if (!c) return false;
  return Array.isArray(c.deletedSubLayers) && c.deletedSubLayers.includes(subId);
}

export function isSubLayerLocked(block: BuilderBlock | null | undefined, subId: string): boolean {
  const c = block?.content;
  if (!c) return false;
  return Array.isArray(c.lockedSubLayers) && c.lockedSubLayers.includes(subId);
}

/**
 * Toggles visibility of a single sub-layer independently without mutating siblings or parent.
 */
export function toggleSubLayerVisibility(block: BuilderBlock, subId: string): BuilderBlock {
  const c = block.content ?? {};
  const currentHidden = new Set(c.hiddenSubLayers ?? []);
  const wasHidden = isSubLayerHidden(block, subId);
  const nextHidden = !wasHidden;

  if (nextHidden) {
    currentHidden.add(subId);
  } else {
    currentHidden.delete(subId);
  }

  const nextContent = {
    ...c,
    hiddenSubLayers: Array.from(currentHidden),
  };

  // Keep dedicated legacy visibility booleans synchronized cleanly
  if (subId === 'button_icon') nextContent.buttonHideIcon = nextHidden;
  if (subId === 'button_text') nextContent.buttonHideText = nextHidden;
  if (subId === 'card_body') nextContent.cardHideDefaultContent = nextHidden;
  if (subId === 'card_footer') nextContent.cardHideDefaultFooter = nextHidden;
  if (subId === 'menu_icon_label') nextContent.menuIconShowLabel = !nextHidden;
  if (subId === 'cart_product') nextContent.cartShowProductInfo = !nextHidden;

  if (subId.startsWith('soc_') && Array.isArray(c.socialItems)) {
    const targetId = subId.slice(4);
    nextContent.socialItems = c.socialItems.map((it, idx) =>
      String(it.id || idx) === targetId ? { ...it, visible: !nextHidden } : it
    );
  }

  return { ...block, content: nextContent };
}

/**
 * Toggles lock state of a single sub-layer independently.
 */
export function toggleSubLayerLock(block: BuilderBlock, subId: string): BuilderBlock {
  const c = block.content ?? {};
  const locked = new Set(c.lockedSubLayers ?? []);
  if (locked.has(subId)) {
    locked.delete(subId);
  } else {
    locked.add(subId);
  }
  return {
    ...block,
    content: {
      ...c,
      lockedSubLayers: Array.from(locked),
    },
  };
}

/**
 * Restores a previously deleted structural sub-layer on a parent component.
 */
export function restoreSubLayer(block: BuilderBlock, subId: string): BuilderBlock {
  const c = block.content ?? {};
  const deleted = (c.deletedSubLayers ?? []).filter((id) => id !== subId);
  const hidden = (c.hiddenSubLayers ?? []).filter((id) => id !== subId);
  const nextContent = {
    ...c,
    deletedSubLayers: deleted,
    hiddenSubLayers: hidden,
  };

  if (subId === 'button_icon') {
    nextContent.buttonHideIcon = false;
    if (!nextContent.buttonIcon || nextContent.buttonIcon === 'none') {
      nextContent.buttonIcon = 'external-link';
    }
  }
  if (subId === 'button_text') {
    nextContent.buttonHideText = false;
    if (!nextContent.label?.trim()) nextContent.label = 'Tombol';
  }
  if (subId === 'card_header') {
    if (!nextContent.cardHeaderTitle?.trim()) nextContent.cardHeaderTitle = 'Judul Bagian';
  }
  if (subId === 'card_body') {
    nextContent.cardHideDefaultContent = false;
  }
  if (subId === 'card_footer') {
    nextContent.cardHideDefaultFooter = false;
  }
  if (subId === 'menu_icon_label') {
    nextContent.menuIconShowLabel = true;
  }
  if (subId === 'cart_product') {
    nextContent.cartShowProductInfo = true;
  }

  return { ...block, content: nextContent };
}

/**
 * Deletes ONLY the targeted sub-layer or list item independently.
 * NEVER deletes the parent block or affects unrelated sibling layers.
 */
export function deleteSubLayerIndependently(block: BuilderBlock, subId: string): BuilderBlock {
  const c = block.content ?? {};
  if (isSubLayerLocked(block, subId)) {
    return block;
  }

  const deleted = new Set(c.deletedSubLayers ?? []);
  const hidden = new Set(c.hiddenSubLayers ?? []);
  const nextStyles = { ...(c.subLayerStyles ?? {}) };
  delete nextStyles[subId];

  // Universal add-ons
  if (subId === 'universal_cart') {
    return {
      ...block,
      content: {
        ...c,
        universalCartEnabled: false,
      },
    };
  }
  if (subId === 'universal_action') {
    return {
      ...block,
      content: {
        ...c,
        actionType: 'none',
      },
    };
  }

  // List item deletions (remove only the specific item from its array)
  if (subId.startsWith('card_fee_') && Array.isArray(c.cardFeeItems)) {
    const key = subId.slice(9);
    return {
      ...block,
      content: {
        ...c,
        cardFeeItems: c.cardFeeItems.filter((it, idx) => String(it.id || idx) !== key),
      },
    };
  }
  if (subId.startsWith('slide_') && Array.isArray(c.carouselItems)) {
    const key = subId.slice(6);
    return {
      ...block,
      content: {
        ...c,
        carouselItems: c.carouselItems.filter((it, idx) => String(it.id || idx) !== key),
      },
    };
  }
  if (subId.startsWith('catalog_') && Array.isArray(c.catalogItems)) {
    const key = subId.slice(8);
    return {
      ...block,
      content: {
        ...c,
        catalogItems: c.catalogItems.filter((it, idx) => String(it.id || idx) !== key),
      },
    };
  }
  if (subId.startsWith('fnb_') && Array.isArray(c.fnbItems)) {
    const key = subId.slice(4);
    return {
      ...block,
      content: {
        ...c,
        fnbItems: c.fnbItems.filter((it, idx) => String(it.id || idx) !== key),
      },
    };
  }
  if (subId.startsWith('fhs_') && Array.isArray(c.fnbSliderItems)) {
    const key = subId.slice(4);
    return {
      ...block,
      content: {
        ...c,
        fnbSliderItems: c.fnbSliderItems.filter((it, idx) => String(it.id || idx) !== key),
      },
    };
  }
  if (subId.startsWith('css_') && Array.isArray(c.culinarySpinItems)) {
    const key = subId.slice(4);
    return {
      ...block,
      content: {
        ...c,
        culinarySpinItems: c.culinarySpinItems.filter((it, idx) => String(it.id || idx) !== key),
      },
    };
  }
  if (subId.startsWith('fps_') && Array.isArray(c.floatingStudioItems)) {
    const key = subId.slice(4);
    return {
      ...block,
      content: {
        ...c,
        floatingStudioItems: c.floatingStudioItems.filter(
          (it, idx) => String(it.id || idx) !== key
        ),
      },
    };
  }
  if (subId.startsWith('tr_prog_') && Array.isArray(c.trainingPrograms)) {
    const key = subId.slice(8);
    return {
      ...block,
      content: {
        ...c,
        trainingPrograms: c.trainingPrograms.filter((it, idx) => String(it.id || idx) !== key),
      },
    };
  }
  if (subId.startsWith('tr_box_') && Array.isArray(c.trainingCustomBoxes)) {
    const key = subId.slice(7);
    return {
      ...block,
      content: {
        ...c,
        trainingCustomBoxes: c.trainingCustomBoxes.filter((it, idx) => String(it.id || idx) !== key),
      },
    };
  }
  if (subId.startsWith('tr_media_') && Array.isArray(c.trainingMedia)) {
    const key = subId.slice(9);
    return {
      ...block,
      content: {
        ...c,
        trainingMedia: c.trainingMedia.filter((it, idx) => String(it.id || idx) !== key),
      },
    };
  }
  if (subId.startsWith('cat_') && Array.isArray(c.categoryButtons)) {
    const key = subId.slice(4);
    return {
      ...block,
      content: {
        ...c,
        categoryButtons: c.categoryButtons.filter((it, idx) => String(it.id || idx) !== key),
      },
    };
  }
  if (subId.startsWith('form_field_') && Array.isArray(c.formFields)) {
    const key = subId.slice(11);
    return {
      ...block,
      content: {
        ...c,
        formFields: c.formFields.filter((it, idx) => String(it.id || idx) !== key),
      },
    };
  }
  if (subId.startsWith('soc_') && Array.isArray(c.socialItems)) {
    const key = subId.slice(4);
    return {
      ...block,
      content: {
        ...c,
        socialItems: c.socialItems.filter((it, idx) => String(it.id || idx) !== key),
      },
    };
  }
  if (subId.startsWith('sfa_') && Array.isArray(c.socialFollowerAccounts)) {
    const key = subId.slice(4);
    return {
      ...block,
      content: {
        ...c,
        socialFollowerAccounts: c.socialFollowerAccounts.filter((it, idx) => String(it.id || idx) !== key),
      },
    };
  }
  if (subId.startsWith('sfp_') && Array.isArray(c.socialFeedPosts)) {
    const key = subId.slice(4);
    return {
      ...block,
      content: {
        ...c,
        socialFeedPosts: c.socialFeedPosts.filter((it, idx) => String(it.id || idx) !== key),
      },
    };
  }

  // Structural part deletions: mark deleted & clear ONLY that part's fields
  deleted.add(subId);
  hidden.delete(subId);

  const nextContent = {
    ...c,
    deletedSubLayers: Array.from(deleted),
    hiddenSubLayers: Array.from(hidden),
    subLayerStyles: nextStyles,
  };

  switch (subId) {
    case 'button_icon':
      nextContent.buttonHideIcon = true;
      nextContent.buttonIcon = 'none';
      nextContent.buttonIconUrl = '';
      break;
    case 'button_text':
      nextContent.buttonHideText = true;
      break;
    case 'card_header':
      nextContent.cardHeaderTitle = '';
      nextContent.cardMoreLabel = '';
      nextContent.cardMoreUrl = '';
      break;
    case 'card_media':
      nextContent.cardImage = '';
      nextContent.cardGalleryImages = [];
      break;
    case 'card_body':
      nextContent.cardHideDefaultContent = true;
      break;
    case 'card_footer':
      nextContent.cardHideDefaultFooter = true;
      nextContent.cardFooterBlocks = [];
      break;
    case 'menu_icon_label':
      nextContent.menuIconShowLabel = false;
      break;
    case 'cart_product':
      nextContent.cartShowProductInfo = false;
      break;
    case 'hero_avatar':
      nextContent.heroLogoImage = '';
      break;
    default:
      break;
  }

  return {
    ...block,
    content: nextContent,
  };
}

/**
 * Extracts real, visual, independently editable sub-layers and list items for ALL block types.
 * - Atomic elements (text, image, divider, videos) remain clean single-layer nodes without redundant pseudo-children.
 * - Structural containers (container, row) show their actual child blocks without fake layout pseudo-nodes.
 * - Button exposes the 3-Layer Standard: Parent (Wadah Tombol) -> Ikon Tombol + Teks Tombol.
 * - Showcase Card exposes real independent parts: Header (when present), Media, Konten/Teks, Tarif items, Footer (when applicable).
 * - Deleted sub-layers are excluded cleanly so deleted parts vanish from both Canvas and Layer Tree.
 */
export function extractBlockSubLayers(block: BuilderBlock): ExtractedSubLayer[] {
  const c = block.content ?? {};
  const layers: ExtractedSubLayer[] = [];

  const pushIfNotDeleted = (sub: ExtractedSubLayer) => {
    if (isSubLayerDeleted(block, sub.id)) return;
    layers.push({
      ...sub,
      isHidden: sub.isHidden ?? isSubLayerHidden(block, sub.id),
      isLocked: isSubLayerLocked(block, sub.id),
      canToggleVisibility: sub.canToggleVisibility ?? true,
      canLock: sub.canLock ?? true,
      canDelete: sub.canDelete ?? true,
    });
  };

  switch (block.type) {
    case 'hero_profile': {
      const isBanner = c.heroVariant === 'banner';
      if (isBanner) {
        pushIfNotDeleted({
          id: 'hero_cover',
          label: c.heroCoverTitle?.trim()
            ? `Cover Banner · ${snippet(c.heroCoverTitle, 18)}`
            : 'Cover Banner',
          typeLabel: 'Latar Cover & Teks Banner',
          kind: 'part',
          icon: 'image',
          layerBadge: 'Lapisan 1',
          contentSections: ['main', 'general'],
          designSections: ['specific', 'visual', 'layout', 'effects'],
        });
        pushIfNotDeleted({
          id: 'hero_profile_card',
          label: c.heroTitle?.trim()
            ? `Kartu Profil · ${snippet(c.heroTitle, 18)}`
            : 'Kartu Profil',
          typeLabel: 'Logo, Nama & Info Usaha',
          kind: 'part',
          icon: 'card',
          layerBadge: 'Lapisan 3',
          contentSections: ['main', 'typo', 'nav', 'actions'],
          designSections: ['specific', 'visual', 'typo', 'layout'],
        });
      } else {
        pushIfNotDeleted({
          id: 'hero_avatar',
          label: c.heroLogoImage ? 'Foto Profil / Logo' : `Logo Inisial (${c.heroLogoMonogram || 'WB'})`,
          typeLabel: 'Foto & Inisial',
          kind: 'part',
          icon: 'image',
          contentSections: ['main'],
          designSections: ['specific', 'visual', 'effects'],
        });
        pushIfNotDeleted({
          id: 'hero_profile_card',
          label: c.heroTitle?.trim()
            ? `Info Profil · ${snippet(c.heroTitle, 18)}`
            : 'Info Profil & Status',
          typeLabel: 'Judul, Tagline, Jam & Alamat',
          kind: 'part',
          icon: 'card',
          contentSections: ['main', 'typo', 'nav', 'actions'],
          designSections: ['specific', 'visual', 'typo', 'layout'],
        });
      }
      break;
    }

    case 'showcase_card': {
      const variant = c.cardVariant ?? 'quote_banner';
      const hasHeader = Boolean(c.cardHeaderTitle?.trim() || c.cardMoreLabel?.trim());
      if (hasHeader) {
        pushIfNotDeleted({
          id: 'card_header',
          label: c.cardHeaderTitle?.trim()
            ? `Header · ${snippet(c.cardHeaderTitle, 20)}`
            : 'Header Kartu',
          typeLabel: 'Judul & Tautan Header',
          kind: 'part',
          icon: 'text',
          contentSections: ['main', 'nav'],
          designSections: ['specific', 'typo', 'layout', 'visual'],
        });
      }

      const hasImageVariant =
        variant === 'quote_banner' ||
        variant === 'news_banner' ||
        variant === 'event_poster' ||
        variant === 'badge_tile' ||
        variant === 'store_card' ||
        variant === 'popout_product' ||
        variant === 'activity_post';
      const hasMediaContent =
        Boolean(c.cardImage?.trim()) ||
        (variant === 'activity_post' && (c.cardGalleryImages ?? []).length > 0);
      if (hasImageVariant && hasMediaContent) {
        pushIfNotDeleted({
          id: 'card_media',
          label:
            variant === 'activity_post'
              ? `Galeri Foto (${(c.cardGalleryImages ?? []).length})`
              : 'Gambar Kartu',
          typeLabel: variant === 'activity_post' ? 'Media Galeri' : 'Media Utama',
          kind: 'part',
          icon: 'image',
          contentSections: ['main'],
          designSections: ['specific', 'visual', 'layout', 'effects'],
        });
      }

      pushIfNotDeleted({
        id: 'card_body',
        label: c.cardTitle?.trim()
          ? `Konten · ${snippet(c.cardTitle, 20)}`
          : c.cardQuote?.trim()
          ? `Kutipan · ${snippet(c.cardQuote, 18)}`
          : 'Konten & Teks Kartu',
        typeLabel: 'Judul, Subjudul & Kutipan',
        kind: 'part',
        icon: 'text',
        isHidden: isSubLayerHidden(block, 'card_body'),
        contentSections: ['main', 'typo'],
        designSections: ['specific', 'typo', 'visual', 'layout'],
      });

      if (variant === 'membership_ticket' && Array.isArray(c.cardFeeItems)) {
        c.cardFeeItems.forEach((fee, idx) => {
          layers.push({
            id: `card_fee_${fee.id || idx}`,
            label: fee.label?.trim() || `Biaya ${idx + 1}`,
            typeLabel: fee.value?.trim() || 'Rincian Tarif',
            kind: 'item',
            icon: 'list',
            isLocked: isSubLayerLocked(block, `card_fee_${fee.id || idx}`),
            canDelete: true,
            canToggleVisibility: false,
            canLock: true,
            contentSections: ['main'],
            designSections: ['specific', 'typo'],
          });
        });
      }

      const variantHasNativeFooter =
        variant === 'membership_ticket' ||
        variant === 'event_poster' ||
        Boolean(c.cardTotalLabel?.trim() || c.cardTotalValue?.trim()) ||
        (Array.isArray(c.cardFooterBlocks) && c.cardFooterBlocks.length > 0);

      if (variantHasNativeFooter) {
        const footerPreview = [c.cardTotalLabel, c.cardTotalValue].filter(Boolean).join(' ').trim();
        pushIfNotDeleted({
          id: 'card_footer',
          label: footerPreview
            ? `Strip Bawah · ${snippet(footerPreview, 18)}`
            : 'Strip Bawah / Footer',
          typeLabel: 'Total & Area Bawah',
          kind: 'part',
          icon: 'layers',
          isHidden: isSubLayerHidden(block, 'card_footer'),
          contentSections: ['main', 'nav', 'actions'],
          designSections: ['specific', 'visual', 'layout', 'typo'],
        });
      }
      break;
    }

    // Structural containers display their real child blocks directly — no fake pseudo-sublayers
    case 'row':
    case 'container':
      break;

    case 'toggle_container': {
      pushIfNotDeleted({
        id: 'toggle_trigger',
        label: c.toggleShowLabel?.trim()
          ? `Pemicu · ${snippet(c.toggleShowLabel, 20)}`
          : 'Tombol Buka / Tutup',
        typeLabel: 'Judul & Ikon Pemicu',
        kind: 'part',
        icon: 'sliders',
        canDelete: false,
        contentSections: ['main', 'typo', 'general'],
        designSections: ['specific', 'visual', 'typo'],
      });
      break;
    }

    case 'bottom_sheet': {
      pushIfNotDeleted({
        id: 'sheet_trigger',
        label: c.sheetTriggerLabel?.trim()
          ? `Pemicu · ${snippet(c.sheetTriggerLabel, 20)}`
          : 'Tombol Pemicu Sheet',
        typeLabel: 'Tombol Pembuka Panel',
        kind: 'part',
        icon: 'link',
        canDelete: false,
        contentSections: ['main', 'typo', 'nav'],
        designSections: ['specific', 'visual', 'typo'],
      });
      pushIfNotDeleted({
        id: 'sheet_header',
        label: c.sheetTitle?.trim()
          ? `Panel · ${snippet(c.sheetTitle, 20)}`
          : 'Header & Panel Sheet',
        typeLabel: 'Judul, Subjudul & Tinggi Sheet',
        kind: 'part',
        icon: 'layers',
        canDelete: false,
        contentSections: ['main', 'items', 'general'],
        designSections: ['specific', 'visual', 'layout'],
      });
      break;
    }

    // Atomic single-layer elements: Text, Image, Divider, Videos
    case 'text':
    case 'image':
    case 'divider':
    case 'youtube':
    case 'facebook_video':
    case 'tiktok_video':
    case 'instagram_video':
      break;

    // 3-Layer Button Standard: Parent (Wadah Tombol) -> Ikon Tombol + Teks Tombol
    case 'button': {
      const hasIconSelected =
        Boolean(c.buttonIconUrl?.trim()) || (Boolean(c.buttonIcon) && c.buttonIcon !== 'none');
      pushIfNotDeleted({
        id: 'button_icon',
        label: hasIconSelected ? 'Ikon Tombol' : 'Ikon Tombol (Kosong)',
        typeLabel: hasIconSelected
          ? `${c.buttonIconSize ?? 16}px · Layer Ikon`
          : 'Pilih ikon atau sembunyikan',
        kind: 'part',
        icon: 'sparkles',
        isHidden: isSubLayerHidden(block, 'button_icon'),
        contentSections: ['main'],
        designSections: ['specific', 'visual', 'layout', 'effects'],
      });
      pushIfNotDeleted({
        id: 'button_text',
        label: c.label?.trim() ? `Teks · ${snippet(c.label, 20)}` : 'Teks Tombol',
        typeLabel: 'Label & Tipografi Tombol',
        kind: 'part',
        icon: 'text',
        isHidden: isSubLayerHidden(block, 'button_text'),
        contentSections: ['main', 'typo'],
        designSections: ['typo', 'layout', 'effects'],
      });
      break;
    }

    case 'cart_button': {
      pushIfNotDeleted({
        id: 'cart_product',
        label: c.cartProductName?.trim()
          ? `Produk · ${snippet(c.cartProductName, 18)}`
          : 'Info Produk & Harga',
        typeLabel: c.cartProductPrice?.trim() || 'Nama, Foto & Harga',
        kind: 'part',
        icon: 'card',
        isHidden: isSubLayerHidden(block, 'cart_product'),
        contentSections: ['main', 'typo'],
        designSections: ['specific', 'visual', 'typo'],
      });
      pushIfNotDeleted({
        id: 'cart_action',
        label: c.cartButtonLabel?.trim()
          ? `Tombol · ${snippet(c.cartButtonLabel, 18)}`
          : 'Tombol Keranjang & Checkout WA',
        typeLabel: 'Tambah ke Keranjang & WA',
        kind: 'part',
        icon: 'cart',
        canDelete: false,
        contentSections: ['main', 'actions', 'general'],
        designSections: ['specific', 'visual', 'layout'],
      });
      break;
    }

    case 'back_button': {
      pushIfNotDeleted({
        id: 'back_label',
        label: c.backButtonLabel?.trim()
          ? `Teks · ${snippet(c.backButtonLabel, 20)}`
          : 'Teks & Ikon Kembali',
        typeLabel: 'Label & Ikon Tombol Kembali',
        kind: 'part',
        icon: 'back',
        canDelete: false,
        contentSections: ['main', 'typo'],
        designSections: ['specific', 'visual', 'layout', 'typo', 'effects'],
      });
      break;
    }

    case 'menu_icon': {
      pushIfNotDeleted({
        id: 'menu_icon_visual',
        label: c.menuIconImage ? 'Gambar Ikon Menu' : 'Wadah & Ikon Menu',
        typeLabel: `${c.menuIconSize ?? 64}px · ${c.menuIconImageFit === 'contain' ? 'Utuh' : 'Penuh'}`,
        kind: 'part',
        icon: 'image',
        canDelete: false,
        contentSections: ['main'],
        designSections: ['specific', 'visual', 'effects'],
      });
      pushIfNotDeleted({
        id: 'menu_icon_label',
        label: c.menuIconLabel?.trim()
          ? `Label · ${snippet(c.menuIconLabel, 20)}`
          : 'Label Teks Menu',
        typeLabel: 'Teks di Bawah Ikon',
        kind: 'part',
        icon: 'text',
        isHidden: isSubLayerHidden(block, 'menu_icon_label'),
        contentSections: ['main', 'typo'],
        designSections: ['typo', 'layout'],
      });
      break;
    }

    case 'maps_place': {
      pushIfNotDeleted({
        id: 'maps_photo',
        label: 'Foto Lokasi & Badge',
        typeLabel: c.mapsPhotoBadgeLabel?.trim() || 'Media Lokasi',
        kind: 'part',
        icon: 'image',
        contentSections: ['main'],
        designSections: ['specific', 'visual', 'effects'],
      });
      pushIfNotDeleted({
        id: 'maps_info',
        label: c.mapsTitle?.trim()
          ? `Info · ${snippet(c.mapsTitle, 20)}`
          : 'Nama, Rating & Alamat',
        typeLabel: c.mapsRating ? `Rating ${c.mapsRating}` : 'Detail Lokasi',
        kind: 'part',
        icon: 'map',
        canDelete: false,
        contentSections: ['main', 'typo'],
        designSections: ['specific', 'typo', 'visual'],
      });
      pushIfNotDeleted({
        id: 'maps_action',
        label: c.mapsButtonLabel?.trim()
          ? `Tombol · ${snippet(c.mapsButtonLabel, 18)}`
          : 'Tautan Google Maps',
        typeLabel: 'Buka Peta & Rute',
        kind: 'part',
        icon: 'link',
        contentSections: ['nav', 'actions'],
        designSections: ['specific', 'layout'],
      });
      break;
    }

    case 'carousel': {
      const items = c.carouselItems ?? [];
      items.forEach((item, idx) => {
        layers.push({
          id: `slide_${item.id || idx}`,
          label: item.title?.trim() || `Slide ${idx + 1}`,
          typeLabel: item.caption?.trim() ? snippet(item.caption, 22) : `Item Slide #${idx + 1}`,
          kind: 'item',
          icon: 'image',
          itemKey: `slide:${item.id}`,
          canDelete: true,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `slide_${item.id || idx}`),
          contentSections: ['items'],
          designSections: ['specific', 'visual'],
        });
      });
      break;
    }

    case 'catalog': {
      const items = c.catalogItems ?? [];
      items.forEach((item, idx) => {
        layers.push({
          id: `catalog_${item.id || idx}`,
          label: item.title?.trim() || `Produk ${idx + 1}`,
          typeLabel: item.price?.trim() || 'Item Produk',
          kind: 'item',
          icon: 'cart',
          itemKey: `catalog:${item.id}`,
          subListTab: 'products',
          canDelete: true,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `catalog_${item.id || idx}`),
          contentSections: ['items'],
          designSections: ['specific', 'visual', 'typo'],
        });
      });
      break;
    }

    case 'fnb_catalog': {
      const items = c.fnbItems ?? [];
      items.forEach((item, idx) => {
        layers.push({
          id: `fnb_${item.id || idx}`,
          label: item.title?.trim() || `Menu ${idx + 1}`,
          typeLabel: [item.category, item.price].filter(Boolean).join(' · ') || 'Item Menu',
          kind: 'item',
          icon: 'list',
          itemKey: `fnb:${item.id}`,
          subListTab: 'menu',
          canDelete: true,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `fnb_${item.id || idx}`),
          contentSections: ['items'],
          designSections: ['specific', 'visual', 'typo'],
        });
      });
      break;
    }

    case 'fnb_hero_slider': {
      const items = c.fnbSliderItems ?? [];
      items.forEach((item, idx) => {
        layers.push({
          id: `fhs_${item.id || idx}`,
          label: item.title?.trim() || `Slide Produk ${idx + 1}`,
          typeLabel: item.price?.trim() || 'Slide F&B',
          kind: 'item',
          icon: 'image',
          itemKey: `fhs:${item.id}`,
          canDelete: true,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `fhs_${item.id || idx}`),
          contentSections: ['items'],
          designSections: ['specific', 'visual'],
        });
      });
      break;
    }

    case 'culinary_spin_slider': {
      const items = c.culinarySpinItems ?? [];
      items.forEach((item, idx) => {
        layers.push({
          id: `css_${item.id || idx}`,
          label: item.title?.trim() || `Menu Putar ${idx + 1}`,
          typeLabel: item.price?.trim() || 'Kuliner Putar',
          kind: 'item',
          icon: 'image',
          itemKey: `css:${item.id}`,
          canDelete: true,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `css_${item.id || idx}`),
          contentSections: ['items'],
          designSections: ['specific', 'visual'],
        });
      });
      break;
    }

    case 'floating_product_studio': {
      const items = c.floatingStudioItems ?? [];
      items.forEach((item, idx) => {
        layers.push({
          id: `fps_${item.id || idx}`,
          label: item.title?.trim() || `Produk Studio ${idx + 1}`,
          typeLabel: item.price?.trim() || 'Studio Melayang',
          kind: 'item',
          icon: 'image',
          itemKey: `fps:${item.id}`,
          canDelete: true,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `fps_${item.id || idx}`),
          contentSections: ['items'],
          designSections: ['specific', 'visual'],
        });
      });
      break;
    }

    case 'training_catalog': {
      pushIfNotDeleted({
        id: 'training_header',
        label: c.trainingHeading?.trim()
          ? `Header · ${snippet(c.trainingHeading, 20)}`
          : 'Header & Jadwal Pelatihan',
        typeLabel: c.trainingBatch?.trim() || 'Judul, Angkatan & Jadwal',
        kind: 'part',
        icon: 'card',
        canDelete: false,
        contentSections: ['main', 'typo'],
        designSections: ['specific', 'visual', 'typo'],
      });
      (c.trainingPrograms ?? []).forEach((prog, idx) => {
        layers.push({
          id: `tr_prog_${prog.id || idx}`,
          label: prog.title?.trim() || `Program ${idx + 1}`,
          typeLabel: prog.price?.trim() || 'Program Pelatihan',
          kind: 'item',
          icon: 'list',
          itemKey: `tr_prog:${prog.id}`,
          subListTab: 'programs',
          canDelete: true,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `tr_prog_${prog.id || idx}`),
          contentSections: ['items'],
          designSections: ['specific', 'visual'],
        });
      });
      (c.trainingCustomBoxes ?? []).forEach((box, idx) => {
        layers.push({
          id: `tr_box_${box.id || idx}`,
          label: box.title?.trim() || `Kotak Info ${idx + 1}`,
          typeLabel: 'Kotak Info Tambahan',
          kind: 'item',
          icon: 'card',
          itemKey: `tr_box:${box.id}`,
          subListTab: 'boxes',
          canDelete: true,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `tr_box_${box.id || idx}`),
          contentSections: ['items'],
          designSections: ['specific', 'visual'],
        });
      });
      (c.trainingMedia ?? []).forEach((media, idx) => {
        layers.push({
          id: `tr_media_${media.id || idx}`,
          label: media.caption?.trim() || `Media ${idx + 1}`,
          typeLabel: media.type === 'post' ? 'Postingan Galeri' : 'Foto Galeri',
          kind: 'item',
          icon: media.type === 'post' ? 'card' : 'image',
          itemKey: `tr_media:${media.id}`,
          subListTab: 'media',
          canDelete: true,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `tr_media_${media.id || idx}`),
          contentSections: ['items'],
          designSections: ['specific'],
        });
      });
      pushIfNotDeleted({
        id: 'training_form',
        label: 'Formulir & Checkout Pelatihan',
        typeLabel: 'Isian Peserta & WhatsApp',
        kind: 'part',
        icon: 'form',
        subListTab: 'form',
        canDelete: false,
        contentSections: ['items', 'actions', 'general'],
        designSections: ['specific', 'layout'],
      });
      break;
    }

    case 'category_tabs': {
      const buttons = c.categoryButtons ?? [];
      buttons.forEach((btn, idx) => {
        layers.push({
          id: `cat_${btn.id || idx}`,
          label: btn.label?.trim() || `Kategori ${idx + 1}`,
          typeLabel: btn.targetTitle?.trim() ? `→ ${snippet(btn.targetTitle, 18)}` : 'Tombol Kategori',
          kind: 'item',
          icon: 'list',
          itemKey: `cat:${btn.id}`,
          canDelete: true,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `cat_${btn.id || idx}`),
          contentSections: ['items'],
          designSections: ['specific', 'typo'],
        });
      });
      break;
    }

    case 'form': {
      const fields = c.formFields ?? [];
      pushIfNotDeleted({
        id: 'form_header',
        label: c.formTitle?.trim() ? `Header · ${snippet(c.formTitle, 20)}` : 'Judul & Pengiriman Form',
        typeLabel: c.submitLabel?.trim() || 'Tombol Kirim & WA',
        kind: 'part',
        icon: 'form',
        canDelete: false,
        contentSections: ['main', 'actions', 'general'],
        designSections: ['specific', 'visual', 'typo', 'layout'],
      });
      fields.forEach((field, idx) => {
        layers.push({
          id: `form_field_${field.id || idx}`,
          label: field.label?.trim() || `Kolom ${idx + 1}`,
          typeLabel: field.required ? 'Wajib Isi' : 'Opsional',
          kind: 'item',
          icon: 'list',
          canDelete: true,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `form_field_${field.id || idx}`),
          contentSections: ['main'],
          designSections: ['specific', 'typo'],
        });
      });
      break;
    }

    case 'social': {
      const items = c.socialItems ?? [];
      items.forEach((item, idx) => {
        const meta = SOCIAL_PLATFORMS[item.platform];
        layers.push({
          id: `soc_${item.id || idx}`,
          label: meta?.label || item.platform,
          typeLabel: item.url?.trim() ? snippet(item.url, 22) : 'Belum ada URL',
          kind: 'item',
          icon: 'share',
          isHidden: !item.visible,
          isLocked: isSubLayerLocked(block, `soc_${item.id || idx}`),
          canDelete: true,
          canToggleVisibility: true,
          canLock: true,
          itemKey: `soc:${item.id}`,
          contentSections: ['items'],
          designSections: ['specific'],
        });
      });
      break;
    }

    case 'social_follower': {
      const accounts = c.socialFollowerAccounts ?? [];
      accounts.forEach((acc, idx) => {
        layers.push({
          id: `sfa_${acc.id || idx}`,
          label: acc.accountName?.trim() || acc.handle?.trim() || `Akun ${idx + 1}`,
          typeLabel:
            [SOCIAL_PLATFORMS[acc.platform]?.label, acc.followers].filter(Boolean).join(' · ') ||
            'Kartu Akun',
          kind: 'item',
          icon: 'card',
          itemKey: `sfa:${acc.id}`,
          canDelete: true,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `sfa_${acc.id || idx}`),
          contentSections: ['items'],
          designSections: ['specific', 'visual', 'typo'],
        });
      });
      break;
    }

    case 'social_feed': {
      const posts = c.socialFeedPosts ?? [];
      pushIfNotDeleted({
        id: 'social_feed_profile',
        label: c.socialFeedAccountName?.trim()
          ? `Profil · ${snippet(c.socialFeedAccountName, 18)}`
          : 'Header Profil Akun',
        typeLabel:
          c.socialFeedHandle?.trim() ||
          SOCIAL_PLATFORMS[c.socialFeedPlatform ?? 'instagram']?.label ||
          'Profil Sosmed',
        kind: 'part',
        icon: 'share',
        canDelete: false,
        contentSections: ['main', 'nav', 'typo'],
        designSections: ['specific', 'visual', 'typo'],
      });
      posts.forEach((post, idx) => {
        layers.push({
          id: `sfp_${post.id || idx}`,
          label: snippet(post.caption, 24) || `Postingan ${idx + 1}`,
          typeLabel: post.mediaType === 'video' ? 'Video Post' : 'Foto Post',
          kind: 'item',
          icon: post.mediaType === 'video' ? 'video' : 'image',
          itemKey: `sfp:${post.id}`,
          canDelete: true,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `sfp_${post.id || idx}`),
          contentSections: ['items'],
          designSections: ['specific', 'visual'],
        });
      });
      break;
    }
  }

  // Universal add-ons active on ANY block
  if (c.universalCartEnabled) {
    layers.push({
      id: 'universal_cart',
      label: c.universalCartName?.trim()
        ? `Keranjang · ${snippet(c.universalCartName, 18)}`
        : 'Tombol Keranjang Universal',
      typeLabel: c.universalCartPrice?.trim() || 'Checkout WA Aktif',
      kind: 'part',
      icon: 'cart',
      canDelete: true,
      canToggleVisibility: false,
      canLock: false,
      contentSections: ['actions', 'general'],
      designSections: ['visual', 'layout'],
    });
  }

  if (c.actionType && c.actionType !== 'none' && block.type !== 'button') {
    layers.push({
      id: 'universal_action',
      label: `Aksi Klik · ${ACTION_TYPE_LABELS[c.actionType] || c.actionType}`,
      typeLabel: 'Interaksi Saat Diklik',
      kind: 'part',
      icon: 'sparkles',
      canDelete: true,
      canToggleVisibility: false,
      canLock: false,
      contentSections: ['nav'],
      designSections: ['layout'],
    });
  }

  return layers;
}

export function findExtractedSubLayer(
  block: BuilderBlock | null | undefined,
  subLayerId: string | null | undefined
): ExtractedSubLayer | null {
  if (!block || !subLayerId) return null;
  const layers = extractBlockSubLayers(block);
  return layers.find((l) => l.id === subLayerId) ?? null;
}

export function countTotalExtractedLayers(blocks: BuilderBlock[]): number {
  return blocks.reduce((sum, blk) => {
    const subCount = extractBlockSubLayers(blk).length;
    const childCount = Array.isArray(blk.children) ? countTotalExtractedLayers(blk.children) : 0;
    const footerCount = Array.isArray(blk.content?.cardFooterBlocks)
      ? countTotalExtractedLayers(blk.content.cardFooterBlocks)
      : 0;
    const sheetCount = Array.isArray(blk.content?.actionSheetBlocks)
      ? countTotalExtractedLayers(blk.content.actionSheetBlocks)
      : 0;
    return sum + 1 + subCount + childCount + footerCount + sheetCount;
  }, 0);
}
