import { BuilderBlock } from '../types/builder';
import { SOCIAL_PLATFORMS } from './socialIcons';
import {
  FNB_IMAGE_SHAPE_LABELS,
  findFnbItemBySubLayerKey,
  parseFnbItemSubLayerId,
  resolveFnbItemImageGeometry,
} from './fnbHelpers';

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
  /** Optional mini thumbnail URL for visual identification in Layer Tree */
  thumbnailUrl?: string;
  /** Optional nested sub-layers (e.g. Foto & Shape, Info, Harga & Tombol inside each F&B item) */
  children?: ExtractedSubLayer[];
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
  if (subId === 'fnb_categories' && !c.fnbShowCategories) return true;
  if (subId === 'fnb_search' && c.fnbShowSearch === false) return true;
  if (subId === 'fnb_section_heading' && c.fnbGroupByCategory === false) return true;
  if (subId === 'fnb_floating_cart' && c.fnbFloatingCartEnabled === false) return true;
  if (subId === 'fnb_customer_form' && c.catalogAskCustomerInfo === false) return true;
  if (subId === 'fnb_shipping' && c.catalogShippingEnabled === false) return true;
  if (subId === 'catalog_floating_cart' && c.catalogCartEnabled === false) return true;
  if (subId === 'catalog_customer_form' && c.catalogAskCustomerInfo === false) return true;
  if (subId === 'catalog_shipping' && c.catalogShippingEnabled === false) return true;
  if (subId === 'pbr_dots' && c.boxRevealShowDots === false) return true;
  if (
    subId === 'pbr_cart_action' &&
    (c.boxRevealShowCartButton === false || c.boxRevealFloatingCartEnabled === false)
  )
    return true;
  if (subId === 'pbr_admin_cta' && !c.adminCtaEnabled) return true;
  if (subId === 'ibs_admin_cta' && !c.adminCtaEnabled) return true;
  if (subId === 'fhs_dots' && c.fnbSliderShowDots === false) return true;
  if (subId === 'fhs_cart' && c.fnbSliderShowCart === false) return true;
  if (subId === 'fhs_admin_cta' && !c.adminCtaEnabled) return true;
  if (subId === 'css_dots' && c.culinaryShowDots === false) return true;
  if (subId === 'css_cart' && c.culinaryShowCartButton === false) return true;
  if (subId === 'css_admin_cta' && !c.adminCtaEnabled) return true;
  if (subId === 'fps_dots' && c.studioShowDots === false) return true;
  if (subId === 'fps_cart' && c.studioShowCartButton === false) return true;
  if (subId === 'carousel_controls' && c.carouselShowDots === false) return true;
  const parsedFnb = parseFnbItemSubLayerId(subId);
  if (parsedFnb?.kind === 'card' && Array.isArray(c.fnbItems)) {
    const matched = findFnbItemBySubLayerKey(c.fnbItems, parsedFnb.itemKey);
    if (matched?.hidden) return true;
  }
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
  if (subId === 'fnb_categories') nextContent.fnbShowCategories = !nextHidden;
  if (subId === 'fnb_search') nextContent.fnbShowSearch = !nextHidden;
  if (subId === 'fnb_section_heading') nextContent.fnbGroupByCategory = !nextHidden;
  if (subId === 'fnb_floating_cart') nextContent.fnbFloatingCartEnabled = !nextHidden;
  if (subId === 'fnb_customer_form') nextContent.catalogAskCustomerInfo = !nextHidden;
  if (subId === 'fnb_shipping') nextContent.catalogShippingEnabled = !nextHidden;
  if (subId === 'catalog_floating_cart') nextContent.catalogCartEnabled = !nextHidden;
  if (subId === 'catalog_customer_form') nextContent.catalogAskCustomerInfo = !nextHidden;
  if (subId === 'catalog_shipping') nextContent.catalogShippingEnabled = !nextHidden;
  if (subId === 'pbr_dots') nextContent.boxRevealShowDots = !nextHidden;
  if (subId === 'pbr_cart_action') {
    nextContent.boxRevealShowCartButton = !nextHidden;
    nextContent.boxRevealFloatingCartEnabled = !nextHidden;
  }
  if (subId === 'pbr_admin_cta' || subId === 'ibs_admin_cta' || subId === 'fhs_admin_cta' || subId === 'css_admin_cta') {
    nextContent.adminCtaEnabled = !nextHidden;
  }
  if (subId === 'fhs_dots') nextContent.fnbSliderShowDots = !nextHidden;
  if (subId === 'fhs_cart') nextContent.fnbSliderShowCart = !nextHidden;
  if (subId === 'css_dots') nextContent.culinaryShowDots = !nextHidden;
  if (subId === 'css_cart') nextContent.culinaryShowCartButton = !nextHidden;
  if (subId === 'fps_dots') nextContent.studioShowDots = !nextHidden;
  if (subId === 'fps_cart') nextContent.studioShowCartButton = !nextHidden;
  if (subId === 'carousel_controls') nextContent.carouselShowDots = !nextHidden;

  const parsedFnb = parseFnbItemSubLayerId(subId);
  if (parsedFnb?.kind === 'card' && Array.isArray(c.fnbItems)) {
    nextContent.fnbItems = c.fnbItems.map((it, idx) =>
      String(it.id || idx) === parsedFnb.itemKey ? { ...it, hidden: nextHidden } : it
    );
  }

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
  if (subId === 'fnb_categories') nextContent.fnbShowCategories = true;
  if (subId === 'fnb_search') nextContent.fnbShowSearch = true;
  if (subId === 'fnb_section_heading') nextContent.fnbGroupByCategory = true;
  if (subId === 'fnb_floating_cart') nextContent.fnbFloatingCartEnabled = true;
  if (subId === 'fnb_customer_form' || subId === 'catalog_customer_form') nextContent.catalogAskCustomerInfo = true;
  if (subId === 'fnb_shipping' || subId === 'catalog_shipping') nextContent.catalogShippingEnabled = true;
  if (subId === 'catalog_floating_cart') nextContent.catalogCartEnabled = true;
  if (subId === 'pbr_dots') nextContent.boxRevealShowDots = true;
  if (subId === 'pbr_cart_action') {
    nextContent.boxRevealShowCartButton = true;
    nextContent.boxRevealFloatingCartEnabled = true;
  }
  if (subId === 'pbr_admin_cta' || subId === 'ibs_admin_cta' || subId === 'fhs_admin_cta' || subId === 'css_admin_cta') {
    nextContent.adminCtaEnabled = true;
  }
  if (subId === 'fhs_dots') nextContent.fnbSliderShowDots = true;
  if (subId === 'fhs_cart') nextContent.fnbSliderShowCart = true;
  if (subId === 'css_dots') nextContent.culinaryShowDots = true;
  if (subId === 'css_cart') nextContent.culinaryShowCartButton = true;
  if (subId === 'fps_dots') nextContent.studioShowDots = true;
  if (subId === 'fps_cart') nextContent.studioShowCartButton = true;
  if (subId === 'carousel_controls') nextContent.carouselShowDots = true;

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
  if (
    subId.startsWith('catalog_') &&
    subId !== 'catalog_header' &&
    subId !== 'catalog_floating_cart' &&
    subId !== 'catalog_customer_form' &&
    subId !== 'catalog_shipping' &&
    !subId.startsWith('catalog_img_') &&
    !subId.startsWith('catalog_info_') &&
    !subId.startsWith('catalog_price_') &&
    Array.isArray(c.catalogItems)
  ) {
    const key = subId.slice(8);
    return {
      ...block,
      content: {
        ...c,
        catalogItems: c.catalogItems.filter((it, idx) => String(it.id || idx) !== key),
      },
    };
  }
  if (subId.startsWith('catalog_img_') && Array.isArray(c.catalogItems)) {
    const key = subId.slice('catalog_img_'.length);
    return {
      ...block,
      content: {
        ...c,
        catalogItems: c.catalogItems.map((it, idx) =>
          String(it.id || idx) === key ? { ...it, image: '' } : it
        ),
      },
    };
  }
  const parsedFnbDel = parseFnbItemSubLayerId(subId);
  if (parsedFnbDel && Array.isArray(c.fnbItems)) {
    if (parsedFnbDel.kind === 'card') {
      return {
        ...block,
        content: {
          ...c,
          fnbItems: c.fnbItems.filter((it, idx) => String(it.id || idx) !== parsedFnbDel.itemKey),
        },
      };
    }
    if (parsedFnbDel.kind === 'img') {
      return {
        ...block,
        content: {
          ...c,
          fnbItems: c.fnbItems.map((it, idx) =>
            String(it.id || idx) === parsedFnbDel.itemKey ? { ...it, image: '' } : it
          ),
        },
      };
    }
  }
  if (
    subId.startsWith('fhs_') &&
    subId !== 'fhs_stage' &&
    subId !== 'fhs_dots' &&
    subId !== 'fhs_cart' &&
    subId !== 'fhs_admin_cta' &&
    !subId.startsWith('fhs_img_') &&
    !subId.startsWith('fhs_info_') &&
    Array.isArray(c.fnbSliderItems)
  ) {
    const key = subId.slice(4);
    return {
      ...block,
      content: {
        ...c,
        fnbSliderItems: c.fnbSliderItems.filter((it, idx) => String(it.id || idx) !== key),
      },
    };
  }
  if (
    subId.startsWith('css_') &&
    subId !== 'css_stage' &&
    subId !== 'css_dots' &&
    subId !== 'css_cart' &&
    subId !== 'css_admin_cta' &&
    !subId.startsWith('css_img_') &&
    !subId.startsWith('css_info_') &&
    Array.isArray(c.culinarySpinItems)
  ) {
    const key = subId.slice(4);
    return {
      ...block,
      content: {
        ...c,
        culinarySpinItems: c.culinarySpinItems.filter((it, idx) => String(it.id || idx) !== key),
      },
    };
  }
  if (
    subId.startsWith('fps_') &&
    subId !== 'fps_stage' &&
    subId !== 'fps_dots' &&
    subId !== 'fps_cart' &&
    !subId.startsWith('fps_img_') &&
    !subId.startsWith('fps_info_') &&
    Array.isArray(c.floatingStudioItems)
  ) {
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
  if (
    subId.startsWith('ibs_') &&
    subId !== 'ibs_header' &&
    subId !== 'ibs_stage' &&
    subId !== 'ibs_info' &&
    subId !== 'ibs_actions' &&
    subId !== 'ibs_admin_cta' &&
    !subId.startsWith('ibs_img_') &&
    !subId.startsWith('ibs_info_') &&
    !subId.startsWith('ibs_color_') &&
    Array.isArray(c.boxShowcaseItems)
  ) {
    const key = subId.slice(4);
    return {
      ...block,
      content: {
        ...c,
        boxShowcaseItems: c.boxShowcaseItems.filter(
          (it, idx) => String(it.id || idx) !== key
        ),
      },
    };
  }
  if (subId.startsWith('ibs_img_') && Array.isArray(c.boxShowcaseItems)) {
    const key = subId.slice('ibs_img_'.length);
    return {
      ...block,
      content: {
        ...c,
        boxShowcaseItems: c.boxShowcaseItems.map((it, idx) =>
          String(it.id || idx) === key ? { ...it, image: '' } : it
        ),
      },
    };
  }
  if (subId.startsWith('pbr_img_') && Array.isArray(c.boxRevealItems)) {
    const key = subId.slice('pbr_img_'.length);
    return {
      ...block,
      content: {
        ...c,
        boxRevealItems: c.boxRevealItems.map((it, idx) =>
          String(it.id || idx) === key ? { ...it, image: '' } : it
        ),
      },
    };
  }
  if (
    subId.startsWith('pbr_') &&
    subId !== 'pbr_lid_logo' &&
    subId !== 'pbr_box_frame' &&
    subId !== 'pbr_dots' &&
    subId !== 'pbr_cart_action' &&
    subId !== 'pbr_admin_cta' &&
    !subId.startsWith('pbr_info_') &&
    !subId.startsWith('pbr_variant_') &&
    Array.isArray(c.boxRevealItems)
  ) {
    const key = subId.slice(4);
    return {
      ...block,
      content: {
        ...c,
        boxRevealItems: c.boxRevealItems.filter(
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
  if (subId.startsWith('cat_') && subId !== 'cat_bar' && Array.isArray(c.categoryButtons)) {
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
    case 'fnb_categories':
      nextContent.fnbShowCategories = false;
      break;
    case 'fnb_search':
      nextContent.fnbShowSearch = false;
      break;
    case 'fnb_section_heading':
      nextContent.fnbGroupByCategory = false;
      break;
    case 'fnb_floating_cart':
      nextContent.fnbFloatingCartEnabled = false;
      break;
    case 'fnb_customer_form':
      nextContent.catalogAskCustomerInfo = false;
      break;
    case 'fnb_shipping':
    case 'catalog_shipping':
      nextContent.catalogShippingEnabled = false;
      break;
    case 'catalog_floating_cart':
      nextContent.catalogCartEnabled = false;
      break;
    case 'catalog_customer_form':
      nextContent.catalogAskCustomerInfo = false;
      break;
    case 'pbr_lid_logo':
      nextContent.boxRevealLidLogoImage = '';
      break;
    case 'pbr_dots':
      nextContent.boxRevealShowDots = false;
      break;
    case 'pbr_cart_action':
      nextContent.boxRevealShowCartButton = false;
      nextContent.boxRevealFloatingCartEnabled = false;
      break;
    case 'pbr_admin_cta':
    case 'ibs_admin_cta':
    case 'fhs_admin_cta':
    case 'css_admin_cta':
      nextContent.adminCtaEnabled = false;
      break;
    case 'fhs_dots':
      nextContent.fnbSliderShowDots = false;
      break;
    case 'fhs_cart':
      nextContent.fnbSliderShowCart = false;
      break;
    case 'css_dots':
      nextContent.culinaryShowDots = false;
      break;
    case 'css_cart':
      nextContent.culinaryShowCartButton = false;
      break;
    case 'fps_dots':
      nextContent.studioShowDots = false;
      break;
    case 'fps_cart':
      nextContent.studioShowCartButton = false;
      break;
    case 'carousel_controls':
      nextContent.carouselShowDots = false;
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
 * Standard Baku Ekstraksi Layer — extracts complete, visual, independently editable sub-layers
 * and list items for ALL block types without exception (atomic, container, media, slider, catalog, box reveal, etc.).
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
      pushIfNotDeleted({
        id: 'carousel_controls',
        label: 'Kontrol & Indikator Slide',
        typeLabel:
          c.carouselShowDots !== false ? 'Titik Slide & Panah Aktif' : 'Kontrol Navigasi Slide',
        kind: 'part',
        icon: 'sliders',
        canDelete: false,
        contentSections: ['main', 'actions'],
        designSections: ['specific', 'layout'],
      });
      items.forEach((item, idx) => {
        const key = String(item.id || idx);
        layers.push({
          id: `slide_${key}`,
          label: item.title?.trim() || `Slide ${idx + 1}`,
          typeLabel: item.caption?.trim() ? snippet(item.caption, 22) : `Item Slide #${idx + 1}`,
          kind: 'item',
          icon: 'image',
          itemKey: `slide:${item.id}`,
          thumbnailUrl: item.image?.trim() || undefined,
          canDelete: true,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `slide_${key}`),
          contentSections: ['items'],
          designSections: ['specific', 'visual'],
          children: [
            {
              id: `slide_img_${key}`,
              label: 'Gambar Slide',
              typeLabel: item.image ? 'Media Slide' : 'Belum ada gambar',
              kind: 'item',
              icon: 'image',
              itemKey: `slide:${item.id}`,
              canDelete: false,
              canToggleVisibility: false,
              canLock: true,
              isLocked: isSubLayerLocked(block, `slide_img_${key}`),
              contentSections: ['items'],
              designSections: ['specific', 'visual'],
            },
            {
              id: `slide_text_${key}`,
              label: 'Judul & Keterangan',
              typeLabel: snippet(item.caption || item.title, 22) || 'Teks Slide',
              kind: 'item',
              icon: 'text',
              itemKey: `slide:${item.id}`,
              canDelete: false,
              canToggleVisibility: false,
              canLock: true,
              isLocked: isSubLayerLocked(block, `slide_text_${key}`),
              contentSections: ['items'],
              designSections: ['specific', 'typo'],
            },
          ],
        });
      });
      break;
    }

    case 'catalog': {
      const items = c.catalogItems ?? [];
      pushIfNotDeleted({
        id: 'catalog_header',
        label: c.catalogStoreName?.trim()
          ? `Toko · ${snippet(c.catalogStoreName, 20)}`
          : 'Pengaturan Toko & Katalog',
        typeLabel: `${items.length} Produk · Katalog`,
        kind: 'part',
        icon: 'card',
        canDelete: false,
        contentSections: ['main', 'general'],
        designSections: ['specific', 'visual', 'typo'],
      });
      pushIfNotDeleted({
        id: 'catalog_floating_cart',
        label: 'Keranjang & Checkout WA',
        typeLabel: c.catalogCartEnabled !== false ? 'Keranjang Aktif' : 'Nonaktif',
        kind: 'part',
        icon: 'cart',
        canDelete: false,
        contentSections: ['actions'],
        designSections: ['specific'],
      });
      pushIfNotDeleted({
        id: 'catalog_customer_form',
        label: 'Form Data Pemesan',
        typeLabel: c.catalogAskCustomerInfo !== false ? 'Aktif saat Checkout' : 'Nonaktif',
        kind: 'part',
        icon: 'form',
        subListTab: 'customer',
        canDelete: false,
        contentSections: ['items', 'actions'],
        designSections: ['specific'],
      });
      pushIfNotDeleted({
        id: 'catalog_shipping',
        label: 'Opsi Pengiriman',
        typeLabel: c.catalogShippingEnabled !== false ? 'Layanan & Ongkir' : 'Nonaktif',
        kind: 'part',
        icon: 'link',
        subListTab: 'shipping',
        canDelete: false,
        contentSections: ['items', 'actions'],
        designSections: ['specific'],
      });
      items.forEach((item, idx) => {
        const key = String(item.id || idx);
        layers.push({
          id: `catalog_${key}`,
          label: item.title?.trim() || `Produk ${idx + 1}`,
          typeLabel: item.price?.trim() || 'Item Produk',
          kind: 'item',
          icon: 'cart',
          itemKey: `catalog:${item.id}`,
          subListTab: 'products',
          thumbnailUrl: item.image?.trim() || undefined,
          canDelete: true,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `catalog_${key}`),
          contentSections: ['items'],
          designSections: ['specific', 'visual', 'typo'],
          children: [
            {
              id: `catalog_img_${key}`,
              label: 'Foto Produk',
              typeLabel: item.image ? 'Media Produk' : 'Belum ada foto',
              kind: 'item',
              icon: 'image',
              itemKey: `catalog:${item.id}`,
              subListTab: 'products',
              canDelete: Boolean(item.image),
              canToggleVisibility: false,
              canLock: true,
              isLocked: isSubLayerLocked(block, `catalog_img_${key}`),
              contentSections: ['items'],
              designSections: ['specific', 'visual'],
            },
            {
              id: `catalog_info_${key}`,
              label: 'Judul, Deskripsi & Varian',
              typeLabel: item.variants?.trim()
                ? `Varian: ${snippet(item.variants, 18)}`
                : snippet(item.subtitle || item.description, 22) || 'Detail Produk',
              kind: 'item',
              icon: 'text',
              itemKey: `catalog:${item.id}`,
              subListTab: 'products',
              canDelete: false,
              canToggleVisibility: false,
              canLock: true,
              isLocked: isSubLayerLocked(block, `catalog_info_${key}`),
              contentSections: ['items'],
              designSections: ['specific', 'typo'],
            },
            {
              id: `catalog_price_${key}`,
              label: 'Harga & Tombol Beli',
              typeLabel: item.price?.trim() || 'Rp 0',
              kind: 'item',
              icon: 'cart',
              itemKey: `catalog:${item.id}`,
              subListTab: 'products',
              canDelete: false,
              canToggleVisibility: false,
              canLock: true,
              isLocked: isSubLayerLocked(block, `catalog_price_${key}`),
              contentSections: ['items'],
              designSections: ['specific'],
            },
          ],
        });
      });
      break;
    }

    case 'fnb_catalog': {
      const items = c.fnbItems ?? [];
      const catNames: string[] = [];
      for (const it of items) {
        const cat = (it.category || 'Menu').trim();
        if (cat && !catNames.includes(cat)) catNames.push(cat);
      }

      pushIfNotDeleted({
        id: 'fnb_categories',
        label: 'Tab Kategori',
        typeLabel:
          catNames.length > 0 ? `${catNames.length} Kategori · Bar Filter` : 'Bar Filter Kategori',
        kind: 'part',
        icon: 'sliders',
        isHidden: isSubLayerHidden(block, 'fnb_categories'),
        contentSections: ['actions'],
        designSections: ['specific'],
      });

      pushIfNotDeleted({
        id: 'fnb_search',
        label: 'Kolom Pencarian',
        typeLabel: snippet(c.fnbSearchPlaceholder || 'Cari makanan dan minuman...', 24),
        kind: 'part',
        icon: 'sliders',
        isHidden: isSubLayerHidden(block, 'fnb_search'),
        contentSections: ['actions'],
        designSections: ['specific'],
      });

      pushIfNotDeleted({
        id: 'fnb_section_heading',
        label: 'Judul Grup Kategori',
        typeLabel: c.fnbGroupByCategory !== false ? 'Dikelompokkan per Kategori' : 'Nonaktif',
        kind: 'part',
        icon: 'text',
        isHidden: isSubLayerHidden(block, 'fnb_section_heading'),
        contentSections: ['actions'],
        designSections: ['specific', 'typo'],
      });

      pushIfNotDeleted({
        id: 'fnb_floating_cart',
        label: 'Keranjang Mengambang',
        typeLabel: c.fnbFloatingCartLabel?.trim()
          ? `Tombol "${snippet(c.fnbFloatingCartLabel, 14)}" · Checkout`
          : 'Ringkasan Pesanan & WA',
        kind: 'part',
        icon: 'cart',
        isHidden: isSubLayerHidden(block, 'fnb_floating_cart'),
        contentSections: ['actions'],
        designSections: ['specific'],
      });

      pushIfNotDeleted({
        id: 'fnb_customer_form',
        label: 'Form Data Pemesan',
        typeLabel: c.catalogAskCustomerInfo !== false ? 'Aktif saat Checkout' : 'Nonaktif',
        kind: 'part',
        icon: 'form',
        subListTab: 'customer',
        canDelete: false,
        isHidden: isSubLayerHidden(block, 'fnb_customer_form'),
        contentSections: ['items', 'actions'],
        designSections: ['specific'],
      });

      pushIfNotDeleted({
        id: 'fnb_shipping',
        label: 'Opsi Pengiriman',
        typeLabel: c.catalogShippingEnabled !== false ? 'Layanan & Ongkir' : 'Nonaktif',
        kind: 'part',
        icon: 'link',
        subListTab: 'shipping',
        canDelete: false,
        isHidden: isSubLayerHidden(block, 'fnb_shipping'),
        contentSections: ['items', 'actions'],
        designSections: ['specific'],
      });

      items.forEach((item, idx) => {
        const key = String(item.id || idx);
        const itemId = `fnb_${key}`;
        const imgSubId = `fnb_img_${key}`;
        const infoSubId = `fnb_info_${key}`;
        const actionSubId = `fnb_action_${key}`;
        const geom = resolveFnbItemImageGeometry(item, c, c.fnbAccentColor || '#EA580C');
        const shapeLabel = FNB_IMAGE_SHAPE_LABELS[geom.shape] || 'Membulat';

        const itemChildren: ExtractedSubLayer[] = [
          {
            id: imgSubId,
            label: 'Gambar & Shape',
            typeLabel: `${geom.baseSize}px · ${geom.zoom}% · ${shapeLabel}`,
            kind: 'item',
            icon: 'image',
            itemKey: `fnb:${item.id}`,
            subListTab: 'menu',
            canDelete: Boolean(item.image),
            canToggleVisibility: true,
            canLock: true,
            isHidden: isSubLayerHidden(block, imgSubId),
            isLocked: isSubLayerLocked(block, imgSubId),
            contentSections: ['items'],
            designSections: ['specific'],
          },
          {
            id: infoSubId,
            label: 'Badge, Judul & Deskripsi',
            typeLabel: item.badge?.trim()
              ? `Badge: ${snippet(item.badge, 18)}`
              : snippet(item.description, 22) || 'Teks Menu',
            kind: 'item',
            icon: 'text',
            itemKey: `fnb:${item.id}`,
            subListTab: 'menu',
            canDelete: false,
            canToggleVisibility: false,
            canLock: true,
            isLocked: isSubLayerLocked(block, infoSubId),
            contentSections: ['items'],
            designSections: ['specific', 'typo'],
          },
          {
            id: actionSubId,
            label: 'Harga & Tombol Tambah',
            typeLabel: item.price?.trim() || 'Rp 0',
            kind: 'item',
            icon: 'cart',
            itemKey: `fnb:${item.id}`,
            subListTab: 'menu',
            canDelete: false,
            canToggleVisibility: false,
            canLock: true,
            isLocked: isSubLayerLocked(block, actionSubId),
            contentSections: ['items'],
            designSections: ['specific'],
          },
        ];

        layers.push({
          id: itemId,
          label: item.title?.trim() || `Menu ${idx + 1}`,
          typeLabel: [item.category, item.price].filter(Boolean).join(' · ') || 'Item Menu',
          kind: 'item',
          icon: 'list',
          itemKey: `fnb:${item.id}`,
          subListTab: 'menu',
          thumbnailUrl: item.image?.trim() || undefined,
          canDelete: true,
          canToggleVisibility: true,
          canLock: true,
          isHidden: Boolean(item.hidden) || isSubLayerHidden(block, itemId),
          isLocked: isSubLayerLocked(block, itemId),
          contentSections: ['items'],
          designSections: ['specific'],
          children: itemChildren,
        });
      });
      break;
    }

    case 'fnb_hero_slider': {
      const items = c.fnbSliderItems ?? [];
      pushIfNotDeleted({
        id: 'fhs_stage',
        label: 'Panggung & Animasi Slide',
        typeLabel: c.fnbSliderAutoplay ? 'Auto Slide · Panggung F&B' : 'Manual · Panggung F&B',
        kind: 'part',
        icon: 'sparkles',
        canDelete: false,
        contentSections: ['main'],
        designSections: ['specific', 'visual', 'layout'],
      });
      pushIfNotDeleted({
        id: 'fhs_dots',
        label: 'Indikator Titik Slide',
        typeLabel: c.fnbSliderDotsPosition === 'overlay' ? 'Melayang di Atas' : 'Di Bawah Kartu',
        kind: 'part',
        icon: 'sliders',
        canDelete: false,
        contentSections: ['main'],
        designSections: ['specific'],
      });
      pushIfNotDeleted({
        id: 'fhs_cart',
        label: 'Keranjang & Checkout WA',
        typeLabel: c.fnbSliderShowCart !== false ? 'Keranjang Aktif' : 'Nonaktif',
        kind: 'part',
        icon: 'cart',
        canDelete: false,
        contentSections: ['main', 'actions'],
        designSections: ['specific'],
      });
      pushIfNotDeleted({
        id: 'fhs_admin_cta',
        label: c.adminCtaLabel?.trim() || 'Tombol Tanya Admin',
        typeLabel: c.adminCtaEnabled ? 'Aktif · CTA Admin' : 'Nonaktif',
        kind: 'part',
        icon: 'link',
        canDelete: false,
        contentSections: ['main'],
        designSections: ['specific'],
      });
      items.forEach((item, idx) => {
        const key = String(item.id || idx);
        layers.push({
          id: `fhs_${key}`,
          label: item.title?.trim() || `Slide Produk ${idx + 1}`,
          typeLabel: item.price?.trim() || 'Slide F&B',
          kind: 'item',
          icon: 'image',
          itemKey: `fhs:${item.id}`,
          thumbnailUrl: item.image?.trim() || undefined,
          canDelete: true,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `fhs_${key}`),
          contentSections: ['items'],
          designSections: ['specific', 'visual'],
          children: [
            {
              id: `fhs_img_${key}`,
              label: 'Foto Produk',
              typeLabel: item.image ? 'Media Slide' : 'Belum ada foto',
              kind: 'item',
              icon: 'image',
              itemKey: `fhs:${item.id}`,
              canDelete: false,
              canToggleVisibility: false,
              canLock: true,
              isLocked: isSubLayerLocked(block, `fhs_img_${key}`),
              contentSections: ['items'],
              designSections: ['specific', 'visual'],
            },
            {
              id: `fhs_info_${key}`,
              label: 'Judul, Harga & Varian',
              typeLabel: item.price?.trim() || 'Info Produk',
              kind: 'item',
              icon: 'text',
              itemKey: `fhs:${item.id}`,
              canDelete: false,
              canToggleVisibility: false,
              canLock: true,
              isLocked: isSubLayerLocked(block, `fhs_info_${key}`),
              contentSections: ['items'],
              designSections: ['specific', 'typo'],
            },
          ],
        });
      });
      break;
    }

    case 'culinary_spin_slider': {
      const items = c.culinarySpinItems ?? [];
      pushIfNotDeleted({
        id: 'css_stage',
        label: 'Panggung Putar 360°',
        typeLabel: c.culinaryAutoplay ? 'Auto Putar · Piring Kuliner' : 'Manual · Piring Kuliner',
        kind: 'part',
        icon: 'sparkles',
        canDelete: false,
        contentSections: ['main'],
        designSections: ['specific', 'visual', 'layout'],
      });
      pushIfNotDeleted({
        id: 'css_dots',
        label: 'Indikator Titik Slide',
        typeLabel: c.culinaryDotsPosition === 'overlay' ? 'Melayang di Atas' : 'Di Bawah Kartu',
        kind: 'part',
        icon: 'sliders',
        canDelete: false,
        contentSections: ['main'],
        designSections: ['specific'],
      });
      pushIfNotDeleted({
        id: 'css_cart',
        label: 'Keranjang & Checkout WA',
        typeLabel: c.culinaryShowCartButton !== false ? 'Keranjang Aktif' : 'Nonaktif',
        kind: 'part',
        icon: 'cart',
        canDelete: false,
        contentSections: ['main', 'actions'],
        designSections: ['specific'],
      });
      pushIfNotDeleted({
        id: 'css_admin_cta',
        label: c.adminCtaLabel?.trim() || 'Tombol Tanya Admin',
        typeLabel: c.adminCtaEnabled ? 'Aktif · CTA Admin' : 'Nonaktif',
        kind: 'part',
        icon: 'link',
        canDelete: false,
        contentSections: ['main'],
        designSections: ['specific'],
      });
      items.forEach((item, idx) => {
        const key = String(item.id || idx);
        layers.push({
          id: `css_${key}`,
          label: item.title?.trim() || `Menu Putar ${idx + 1}`,
          typeLabel: item.price?.trim() || 'Kuliner Putar',
          kind: 'item',
          icon: 'image',
          itemKey: `css:${item.id}`,
          thumbnailUrl: item.image?.trim() || undefined,
          canDelete: true,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `css_${key}`),
          contentSections: ['items'],
          designSections: ['specific', 'visual'],
          children: [
            {
              id: `css_img_${key}`,
              label: 'Foto Menu Putar',
              typeLabel: item.image ? 'Media Piring' : 'Belum ada foto',
              kind: 'item',
              icon: 'image',
              itemKey: `css:${item.id}`,
              canDelete: false,
              canToggleVisibility: false,
              canLock: true,
              isLocked: isSubLayerLocked(block, `css_img_${key}`),
              contentSections: ['items'],
              designSections: ['specific', 'visual'],
            },
            {
              id: `css_info_${key}`,
              label: 'Nama Menu, Harga & Deskripsi',
              typeLabel: item.price?.trim() || 'Info Menu',
              kind: 'item',
              icon: 'text',
              itemKey: `css:${item.id}`,
              canDelete: false,
              canToggleVisibility: false,
              canLock: true,
              isLocked: isSubLayerLocked(block, `css_info_${key}`),
              contentSections: ['items'],
              designSections: ['specific', 'typo'],
            },
          ],
        });
      });
      break;
    }

    case 'floating_product_studio': {
      const items = c.floatingStudioItems ?? [];
      pushIfNotDeleted({
        id: 'fps_stage',
        label: 'Panggung Produk Melayang',
        typeLabel: c.studioLevitateEnabled !== false ? 'Efek Melayang & Bayangan' : 'Panggung Studio',
        kind: 'part',
        icon: 'sparkles',
        canDelete: false,
        contentSections: ['main'],
        designSections: ['specific', 'visual', 'layout'],
      });
      pushIfNotDeleted({
        id: 'fps_dots',
        label: 'Indikator Titik Slide',
        typeLabel: c.studioDotsPosition === 'overlay' ? 'Melayang di Atas' : 'Di Bawah Kartu',
        kind: 'part',
        icon: 'sliders',
        canDelete: false,
        contentSections: ['main'],
        designSections: ['specific'],
      });
      pushIfNotDeleted({
        id: 'fps_cart',
        label: 'Keranjang & Checkout WA',
        typeLabel: c.studioShowCartButton !== false ? 'Keranjang Aktif' : 'Nonaktif',
        kind: 'part',
        icon: 'cart',
        canDelete: false,
        contentSections: ['main', 'actions'],
        designSections: ['specific'],
      });
      items.forEach((item, idx) => {
        const key = String(item.id || idx);
        layers.push({
          id: `fps_${key}`,
          label: item.title?.trim() || `Produk Studio ${idx + 1}`,
          typeLabel: item.price?.trim() || 'Studio Melayang',
          kind: 'item',
          icon: 'image',
          itemKey: `fps:${item.id}`,
          thumbnailUrl: item.image?.trim() || undefined,
          canDelete: true,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `fps_${key}`),
          contentSections: ['items'],
          designSections: ['specific', 'visual'],
          children: [
            {
              id: `fps_img_${key}`,
              label: 'Foto Produk Studio',
              typeLabel: item.image ? 'Media Melayang' : 'Belum ada foto',
              kind: 'item',
              icon: 'image',
              itemKey: `fps:${item.id}`,
              canDelete: false,
              canToggleVisibility: false,
              canLock: true,
              isLocked: isSubLayerLocked(block, `fps_img_${key}`),
              contentSections: ['items'],
              designSections: ['specific', 'visual'],
            },
            {
              id: `fps_info_${key}`,
              label: 'Judul, Harga & Varian',
              typeLabel: item.price?.trim() || 'Info Produk',
              kind: 'item',
              icon: 'text',
              itemKey: `fps:${item.id}`,
              canDelete: false,
              canToggleVisibility: false,
              canLock: true,
              isLocked: isSubLayerLocked(block, `fps_info_${key}`),
              contentSections: ['items'],
              designSections: ['specific', 'typo'],
            },
          ],
        });
      });
      break;
    }

    case 'interactive_box_showcase': {
      const items = c.boxShowcaseItems ?? [];
      pushIfNotDeleted({
        id: 'ibs_header',
        label: c.boxShowcaseBrandLabel?.trim()
          ? `Header · ${snippet(c.boxShowcaseBrandLabel, 18)}`
          : 'Header Brand & Navigasi',
        typeLabel: c.boxShowcaseBrandLabel?.trim() ? 'Label Brand & Panah' : 'Tersembunyi (Kosong)',
        kind: 'part',
        icon: 'text',
        canDelete: false,
        contentSections: ['main'],
        designSections: ['specific'],
      });
      pushIfNotDeleted({
        id: 'ibs_stage',
        label: 'Panggung & Ukuran Box 3D',
        typeLabel: `${c.boxShowcaseBoxWidth ? `${c.boxShowcaseBoxWidth}px` : 'Auto'} × ${
          c.boxShowcaseBoxHeight ? `${c.boxShowcaseBoxHeight}px` : 'Auto'
        } · Foto ${c.boxShowcaseImageScale ?? 100}%`,
        kind: 'part',
        icon: 'sparkles',
        canDelete: false,
        contentSections: ['main'],
        designSections: ['specific', 'visual'],
      });
      pushIfNotDeleted({
        id: 'ibs_info',
        label: 'Info Produk & Harga',
        typeLabel: 'Kategori, Judul & Harga',
        kind: 'part',
        icon: 'text',
        canDelete: false,
        contentSections: ['items'],
        designSections: ['specific', 'typo'],
      });
      pushIfNotDeleted({
        id: 'ibs_actions',
        label: 'Aksi Rating, Keranjang & Favorit',
        typeLabel: c.boxShowcaseShowCartButton !== false ? 'Keranjang Aktif' : 'Bar Aksi Bawah',
        kind: 'part',
        icon: 'cart',
        canDelete: false,
        contentSections: ['main', 'actions'],
        designSections: ['specific'],
      });
      pushIfNotDeleted({
        id: 'ibs_admin_cta',
        label: c.adminCtaLabel?.trim() || 'Tombol Tanya Admin',
        typeLabel: c.adminCtaEnabled ? 'Aktif · CTA Admin' : 'Nonaktif',
        kind: 'part',
        icon: 'link',
        canDelete: false,
        contentSections: ['main'],
        designSections: ['specific'],
      });
      items.forEach((item, idx) => {
        const key = String(item.id || idx);
        layers.push({
          id: `ibs_${key}`,
          label: item.title?.trim() || `Box Produk #${idx + 1}`,
          typeLabel:
            [item.category?.trim(), item.price?.trim()].filter(Boolean).join(' · ') || 'Box Produk',
          kind: 'item',
          icon: 'image',
          itemKey: `ibs:${item.id}`,
          thumbnailUrl: item.image?.trim() || undefined,
          canDelete: items.length > 1,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `ibs_${key}`),
          contentSections: ['items'],
          designSections: ['specific', 'visual'],
          children: [
            {
              id: `ibs_img_${key}`,
              label: 'Foto Produk dalam Box',
              typeLabel: `Skala ${c.boxShowcaseImageScale ?? 100}%`,
              kind: 'item',
              icon: 'image',
              itemKey: `ibs:${item.id}`,
              canDelete: Boolean(item.image),
              canToggleVisibility: false,
              canLock: true,
              isLocked: isSubLayerLocked(block, `ibs_img_${key}`),
              contentSections: ['items'],
              designSections: ['specific'],
            },
            {
              id: `ibs_info_${key}`,
              label: 'Kategori, Judul & Harga',
              typeLabel: item.price?.trim() || 'Detail Produk',
              kind: 'item',
              icon: 'text',
              itemKey: `ibs:${item.id}`,
              canDelete: false,
              canToggleVisibility: false,
              canLock: true,
              isLocked: isSubLayerLocked(block, `ibs_info_${key}`),
              contentSections: ['items'],
              designSections: ['specific', 'typo'],
            },
            {
              id: `ibs_color_${key}`,
              label: 'Warna Box',
              typeLabel: item.boxColorOverride || c.boxShowcaseColor || '#F46A1F',
              kind: 'item',
              icon: 'sliders',
              itemKey: `ibs:${item.id}`,
              canDelete: false,
              canToggleVisibility: false,
              canLock: true,
              isLocked: isSubLayerLocked(block, `ibs_color_${key}`),
              contentSections: ['items'],
              designSections: ['specific'],
            },
          ],
        });
      });
      break;
    }

    case 'product_box_reveal': {
      const items = c.boxRevealItems ?? [];
      const boxSize = c.boxRevealBoxSize ?? 220;
      const borderThick = c.boxRevealBorderThickness ?? 18;
      const dotsPosLabel: Record<string, string> = {
        right: 'Kanan (Vertikal)',
        left: 'Kiri (Vertikal)',
        bottom: 'Bawah (Horizontal)',
        top: 'Atas (Horizontal)',
      };
      pushIfNotDeleted({
        id: 'pbr_lid_logo',
        label: 'Tutup Kotak & Logo',
        typeLabel: c.boxRevealLidLogoImage
          ? `Logo Tutup · ${c.boxRevealLidLogoSize ?? 44}%`
          : 'Tutup Kayu (Belum ada logo)',
        kind: 'part',
        icon: 'image',
        canDelete: Boolean(c.boxRevealLidLogoImage),
        contentSections: ['main'],
        designSections: ['specific'],
      });
      pushIfNotDeleted({
        id: 'pbr_box_frame',
        label: 'Ukuran & Outline Box Dalam',
        typeLabel: `${boxSize}px · Outline ${borderThick}px · Zoom ${c.boxRevealProductZoomStart ?? 118}%→${c.boxRevealProductZoomEnd ?? 100}%`,
        kind: 'part',
        icon: 'card',
        canDelete: false,
        contentSections: ['main'],
        designSections: ['specific'],
      });
      pushIfNotDeleted({
        id: 'pbr_dots',
        label: 'Slide Vertikal & Indikator (•••)',
        typeLabel: dotsPosLabel[c.boxRevealDotsPosition || 'right'] || 'Kanan (Vertikal)',
        kind: 'part',
        icon: 'sliders',
        canDelete: false,
        contentSections: ['main'],
        designSections: ['specific'],
      });
      pushIfNotDeleted({
        id: 'pbr_cart_action',
        label: 'Keranjang & Checkout WA',
        typeLabel: c.boxRevealShowCartButton !== false ? 'Keranjang Aktif' : 'Nonaktif',
        kind: 'part',
        icon: 'cart',
        canDelete: false,
        contentSections: ['main'],
        designSections: ['specific'],
      });
      pushIfNotDeleted({
        id: 'pbr_admin_cta',
        label: c.adminCtaLabel?.trim() || 'Tombol Tanya Admin',
        typeLabel: c.adminCtaEnabled ? 'Aktif · CTA Admin' : 'Nonaktif',
        kind: 'part',
        icon: 'link',
        canDelete: false,
        contentSections: ['main'],
        designSections: ['specific'],
      });

      items.forEach((item, idx) => {
        const key = String(item.id || idx);
        layers.push({
          id: `pbr_${key}`,
          label: item.title?.trim() || `Kotak Produk #${idx + 1}`,
          typeLabel:
            [item.price?.trim(), item.variants?.trim() ? snippet(item.variants, 16) : '']
              .filter(Boolean)
              .join(' · ') || 'Kotak Produk',
          kind: 'item',
          icon: 'card',
          itemKey: `pbr:${item.id}`,
          thumbnailUrl: item.image?.trim() || undefined,
          canDelete: items.length > 1,
          canToggleVisibility: false,
          canLock: true,
          isLocked: isSubLayerLocked(block, `pbr_${key}`),
          contentSections: ['items'],
          designSections: ['specific'],
          children: [
            {
              id: `pbr_img_${key}`,
              label: 'Foto Produk & Zoom Out',
              typeLabel: item.image
                ? `${c.boxRevealProductZoomStart ?? 118}% → ${c.boxRevealProductZoomEnd ?? 100}%`
                : 'Belum ada foto',
              kind: 'item',
              icon: 'image',
              itemKey: `pbr:${item.id}`,
              canDelete: Boolean(item.image),
              canToggleVisibility: false,
              canLock: true,
              isLocked: isSubLayerLocked(block, `pbr_img_${key}`),
              contentSections: ['items'],
              designSections: ['specific'],
            },
            {
              id: `pbr_info_${key}`,
              label: 'Judul, Harga & Deskripsi',
              typeLabel: snippet(item.description || item.price, 22) || 'Detail Produk',
              kind: 'item',
              icon: 'text',
              itemKey: `pbr:${item.id}`,
              canDelete: false,
              canToggleVisibility: true,
              canLock: true,
              isHidden: isSubLayerHidden(block, `pbr_info_${key}`),
              isLocked: isSubLayerLocked(block, `pbr_info_${key}`),
              contentSections: ['items'],
              designSections: ['specific'],
            },
            {
              id: `pbr_variant_${key}`,
              label: 'Varian & Warna Kotak',
              typeLabel: item.variants?.trim()
                ? snippet(item.variants, 22)
                : item.boxColorOverride || c.boxRevealColor || '#5C3626',
              kind: 'item',
              icon: 'sliders',
              itemKey: `pbr:${item.id}`,
              canDelete: false,
              canToggleVisibility: true,
              canLock: true,
              isHidden: isSubLayerHidden(block, `pbr_variant_${key}`),
              isLocked: isSubLayerLocked(block, `pbr_variant_${key}`),
              contentSections: ['items'],
              designSections: ['specific'],
            },
          ],
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
      pushIfNotDeleted({
        id: 'cat_bar',
        label: 'Gaya Bar Tab Kategori',
        typeLabel: `${buttons.length} Kategori`,
        kind: 'part',
        icon: 'sliders',
        canDelete: false,
        contentSections: ['main'],
        designSections: ['specific', 'visual', 'layout'],
      });
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
      pushIfNotDeleted({
        id: 'social_bar',
        label: 'Tata Letak Ikon Sosmed',
        typeLabel: `${items.length} Tautan Aktif`,
        kind: 'part',
        icon: 'share',
        canDelete: false,
        contentSections: ['main'],
        designSections: ['specific', 'layout'],
      });
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
      pushIfNotDeleted({
        id: 'sfa_layout',
        label: 'Tata Letak & Gaya Kartu Akun',
        typeLabel: `${accounts.length} Akun Sosmed`,
        kind: 'part',
        icon: 'sliders',
        canDelete: false,
        contentSections: ['main'],
        designSections: ['specific', 'visual', 'layout'],
      });
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
          thumbnailUrl: post.imageUrl?.trim() || undefined,
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

    case 'text': {
      pushIfNotDeleted({
        id: 'text_body',
        label: c.text?.trim() ? `Teks · ${snippet(c.text, 22)}` : 'Isi Teks & Tipografi',
        typeLabel: 'Konten Teks Utama',
        kind: 'part',
        icon: 'text',
        canDelete: false,
        canToggleVisibility: false,
        contentSections: ['main', 'typo'],
        designSections: ['typo', 'visual'],
      });
      pushIfNotDeleted({
        id: 'text_box',
        label: 'Wadah & Latar Teks',
        typeLabel: 'Padding, Radius & Warna',
        kind: 'part',
        icon: 'card',
        canDelete: false,
        canToggleVisibility: false,
        contentSections: ['general'],
        designSections: ['visual', 'layout', 'effects'],
      });
      break;
    }

    case 'image': {
      pushIfNotDeleted({
        id: 'image_media',
        label: c.alt?.trim() ? `Gambar · ${snippet(c.alt, 20)}` : 'Media Gambar',
        typeLabel: c.objectFit ? `Fit: ${c.objectFit}` : 'Foto & Bentuk',
        kind: 'part',
        icon: 'image',
        thumbnailUrl: c.src?.trim() || undefined,
        canDelete: false,
        canToggleVisibility: false,
        contentSections: ['main'],
        designSections: ['specific', 'visual', 'effects'],
      });
      pushIfNotDeleted({
        id: 'image_frame',
        label: 'Bingkai, Ukuran & Aksi Klik',
        typeLabel: c.url?.trim() ? 'Tautan Aktif' : 'Rasio, Radius & Spasi',
        kind: 'part',
        icon: 'sliders',
        canDelete: false,
        canToggleVisibility: false,
        contentSections: ['nav', 'general'],
        designSections: ['layout', 'visual'],
      });
      break;
    }

    case 'divider': {
      pushIfNotDeleted({
        id: 'divider_line',
        label: 'Garis Pemisah',
        typeLabel: `${block.style?.borderStyle || 'solid'} · ${block.style?.borderWidth ?? 1}px`,
        kind: 'part',
        icon: 'sliders',
        canDelete: false,
        canToggleVisibility: false,
        contentSections: ['main'],
        designSections: ['specific', 'layout'],
      });
      break;
    }

    case 'youtube':
    case 'facebook_video':
    case 'tiktok_video':
    case 'instagram_video': {
      const platformName =
        block.type === 'youtube'
          ? 'YouTube'
          : block.type === 'facebook_video'
          ? 'Facebook'
          : block.type === 'tiktok_video'
          ? 'TikTok'
          : 'Instagram';
      pushIfNotDeleted({
        id: 'video_embed',
        label: `Pemutar Video ${platformName}`,
        typeLabel: c.videoUrl?.trim() ? snippet(c.videoUrl, 22) : `URL ${platformName}`,
        kind: 'part',
        icon: 'video',
        canDelete: false,
        canToggleVisibility: false,
        contentSections: ['main'],
        designSections: ['specific', 'visual'],
      });
      pushIfNotDeleted({
        id: 'video_frame',
        label: 'Bingkai & Rasio Video',
        typeLabel: c.videoAspectRatio || '16:9',
        kind: 'part',
        icon: 'sliders',
        canDelete: false,
        canToggleVisibility: false,
        contentSections: ['general'],
        designSections: ['layout', 'visual', 'effects'],
      });
      break;
    }

    case 'container': {
      pushIfNotDeleted({
        id: 'container_surface',
        label: 'Wadah & Latar Grup',
        typeLabel: 'Warna, Gradasi & Border',
        kind: 'part',
        icon: 'card',
        canDelete: false,
        canToggleVisibility: false,
        contentSections: ['main', 'general'],
        designSections: ['visual', 'effects'],
      });
      pushIfNotDeleted({
        id: 'container_layout',
        label: 'Tata Letak & Spasi Grup',
        typeLabel: `${(block.children ?? []).length} Blok di Dalam`,
        kind: 'part',
        icon: 'sliders',
        canDelete: false,
        canToggleVisibility: false,
        contentSections: ['nav'],
        designSections: ['layout', 'specific'],
      });
      break;
    }

    case 'row': {
      pushIfNotDeleted({
        id: 'row_layout',
        label: 'Tata Letak Baris / Kolom',
        typeLabel: `${(block.children ?? []).length} Elemen Sejajar`,
        kind: 'part',
        icon: 'sliders',
        canDelete: false,
        canToggleVisibility: false,
        contentSections: ['main'],
        designSections: ['layout', 'specific'],
      });
      pushIfNotDeleted({
        id: 'row_surface',
        label: 'Wadah & Latar Baris',
        typeLabel: 'Latar, Radius & Spasi',
        kind: 'part',
        icon: 'card',
        canDelete: false,
        canToggleVisibility: false,
        contentSections: ['general'],
        designSections: ['visual', 'effects'],
      });
      break;
    }

    default: {
      pushIfNotDeleted({
        id: 'block_content_core',
        label: 'Konten Utama Blok',
        typeLabel: block.label || 'Pengaturan Konten',
        kind: 'part',
        icon: 'card',
        canDelete: false,
        canToggleVisibility: false,
        contentSections: ['main'],
        designSections: ['specific', 'visual', 'layout'],
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
  for (const l of layers) {
    if (l.id === subLayerId) return l;
    if (Array.isArray(l.children)) {
      const child = l.children.find((ch) => ch.id === subLayerId);
      if (child) return child;
    }
  }
  return null;
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
