import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  BarChart3,
  Check,
  ChevronDown,
  Copy,
  Download,
  ExternalLink,
  Globe,
  MessageCircle,
  Minus,
  PanelBottomOpen,
  Plus,
  Shapes,
  ShoppingBag,
  ShoppingCart,
  Trash2,
  X,
} from 'lucide-react';
import {
  BottomNavbarItem,
  BuilderBlock,
  BuilderProject,
  CatalogItem,
  CategoryJumpItem,
  FnbMenuItem,
  MenuIconSheetPosition,
} from '../../types/builder';
import { resolveBottomNavbar, resolveNavbarMetrics } from '../../data/presets';
import { generateProjectHtml, resolveBlockTextColor, shadowToCss } from '../../utils/htmlExporter';
import { SOCIAL_PLATFORMS, resolveSocialMetrics } from '../../utils/socialIcons';
import { resolveButtonIcon, sanitizeIconUrl } from '../../utils/buttonIcons';
import {
  CartEntry,
  CatalogShippingOptionConfig,
  CustomerOrderInfo,
  DEFAULT_SHIPPING_NOTE,
  ShippingMethodId,
  buildWhatsappOrderUrl,
  collectCartPickupNotes,
  createCartEntry,
  formatRupiah,
  isPhysicalProductType,
  normalizeWhatsappNumber,
  parseVariants,
  resolveCartButtonMetrics,
  resolveCatalogCustomerFields,
  resolveCatalogShippingOptions,
  resolveShippingOptionChecklistItems,
} from '../../utils/cartHelpers';
import { sanitizeExternalUrl } from '../../utils/urlHelpers';
import { DevicePreset } from '../../utils/devicePresets';
import { trackAnalyticsEvent } from '../../utils/analyticsClient';
import {
  extractWhatsappPhoneFromUrl,
  isWhatsappHref,
  resolveProjectAds,
  resolveProjectPublishing,
} from '../../utils/publishingHelpers';
import { resolveCssFontFamily } from '../../utils/fontHelpers';
import { buildLinearGradientCss, resolveBackgroundInlineProps } from '../../utils/gradientHelpers';
import {
  VIEWPORT_PRESET_HEIGHTS,
  VIEWPORT_PRESET_WIDTHS,
  resolveEffectiveBlockStyle,
  resolveViewportBreakpoint,
} from '../../utils/responsiveStyle';
import {
  DynamicFormValues,
  isDynamicFormFieldVisible,
  resolveFieldRequiredRule,
  validateDynamicForm,
  validateDynamicFormField,
} from '../../utils/formValidation';
import { hydrateDefaultFormFields } from '../inspector/DynamicFormBuilderEditor';
import { ButtonGlyph } from '../ButtonIcon';
import { CleanVideoEmbed } from '../CleanVideoEmbed';
import { DeviceViewportSelector } from '../DeviceViewportSelector';
import {
  CategoryJumpTabs,
  FnbCatalogCard,
  FnbFloatingCartCapsule,
  HeroProfileCard,
} from '../DynamicBlocks';
import { MapsPlaceCard } from '../MapsPlaceCard';
import { PhotoCarousel } from '../PhotoCarousel';
import { SocialFeedCard } from '../SocialFeedCard';
import { SocialFollowerList } from '../SocialFollowerList';
import { SocialGlyph } from '../SocialIcon';
import { ShowcaseCardView } from '../ShowcaseCardView';
import { TrainingCatalogCard } from '../TrainingCatalogCard';
import {
  buildLineClampStyle,
  isTopFloatingCartPosition,
  resolveBlockAction,
  resolveProjectFloatingCartConfig,
  resolveUniversalCartMeta,
  supportsUniversalCart,
} from '../../utils/universalLayerHelpers';
import { isSubLayerDeleted, isSubLayerHidden } from '../../utils/layerStructure';
import type { BuilderSubPage } from '../../types/builder';

type PreviewSubPage =
  | { type: 'home' }
  | { type: 'detail'; blockId: string; itemId: string }
  | { type: 'cart'; blockId?: string };

function findBlockById(
  blocks: BuilderBlock[],
  id: string,
  navItems?: BottomNavbarItem[],
  pages?: BuilderSubPage[]
): BuilderBlock | null {
  for (const blk of blocks) {
    if (blk.id === id) return blk;
    if (blk.children?.length) {
      const found = findBlockById(blk.children, id);
      if (found) return found;
    }
    if (blk.content.actionSheetBlocks?.length) {
      const found = findBlockById(blk.content.actionSheetBlocks, id);
      if (found) return found;
    }
    if (blk.content.cardFooterBlocks?.length) {
      const found = findBlockById(blk.content.cardFooterBlocks, id);
      if (found) return found;
    }
  }
  if (navItems?.length) {
    for (const item of navItems) {
      const found = findBlockById(item.children, id);
      if (found) return found;
    }
  }
  if (pages?.length) {
    for (const pg of pages) {
      const found = findBlockById(pg.blocks, id);
      if (found) return found;
    }
  }
  return null;
}

function findFirstCatalogBlock(
  blocks: BuilderBlock[],
  navItems?: BottomNavbarItem[],
  pages?: BuilderSubPage[]
): BuilderBlock | null {
  for (const blk of blocks) {
    if (
      blk.type === 'catalog' ||
      blk.type === 'fnb_catalog' ||
      blk.type === 'cart_button' ||
      (blk.type === 'showcase_card' &&
        blk.content.cardVariant === 'store_card' &&
        Boolean(blk.content.cardEnableCart)) ||
      (supportsUniversalCart(blk.type) && Boolean(blk.content.universalCartEnabled))
    ) {
      return blk;
    }
    if (blk.children?.length) {
      const found = findFirstCatalogBlock(blk.children);
      if (found) return found;
    }
    if (blk.content.actionSheetBlocks?.length) {
      const found = findFirstCatalogBlock(blk.content.actionSheetBlocks);
      if (found) return found;
    }
    if (blk.content.cardFooterBlocks?.length) {
      const found = findFirstCatalogBlock(blk.content.cardFooterBlocks);
      if (found) return found;
    }
  }
  if (navItems?.length) {
    for (const item of navItems) {
      const found = findFirstCatalogBlock(item.children);
      if (found) return found;
    }
  }
  if (pages?.length) {
    for (const pg of pages) {
      const found = findFirstCatalogBlock(pg.blocks);
      if (found) return found;
    }
  }
  return null;
}



export function PreviewModal({
  projectId,
  project,
  onClose,
}: {
  projectId: string;
  project: BuilderProject;
  onClose: () => void;
}) {
  const [submittedForms, setSubmittedForms] = useState<Record<string, boolean>>({});
  const [selectedDeviceId, setSelectedDeviceId] = useState<string>('mobile-440');
  const [previewSize, setPreviewSize] = useState<{ width: number; height: number }>({
    width: 440,
    height: 844,
  });
  const [rotated, setRotated] = useState(false);
  const [customDevices, setCustomDevices] = useState<DevicePreset[]>([]);
  const [openToggles, setOpenToggles] = useState<Record<string, boolean>>({});
  const [activeSheetBlockId, setActiveSheetBlockId] = useState<string | null>(null);
  const [activeNavSheetId, setActiveNavSheetId] = useState<string | null>(null);
  const [sheetEntered, setSheetEntered] = useState(false);
  const [subPage, setSubPage] = useState<PreviewSubPage>({ type: 'home' });
  const [pageHistory, setPageHistory] = useState<string[]>(['home']);
  const [cart, setCart] = useState<CartEntry[]>([]);
  const [activeCategoryTabs, setActiveCategoryTabs] = useState<Record<string, string>>({});
  const [detailVariant, setDetailVariant] = useState('');
  const [detailQty, setDetailQty] = useState(1);
  const [detailPhotoIdx, setDetailPhotoIdx] = useState(0);
  const [toastText, setToastText] = useState<string | null>(null);
  const [customer, setCustomer] = useState<CustomerOrderInfo>({
    name: '',
    phone: '',
    address: '',
    notes: '',
    shippingMethod: 'makan_ditempat',
    arrivalTime: '',
    guestCount: '',
    checklistConfirmed: false,
  });
  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});
  const [checklistCheckedMap, setChecklistCheckedMap] = useState<Record<number, boolean>>({});
  const [formChecklistMap, setFormChecklistMap] = useState<Record<string, Record<number, boolean>>>({});
  const [formValuesMap, setFormValuesMap] = useState<Record<string, DynamicFormValues>>({});
  const [formFieldErrorsMap, setFormFieldErrorsMap] = useState<Record<string, Record<string, string>>>({});
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [cartCheckoutError, setCartCheckoutError] = useState<string>('');
  const scrollBodyRef = useRef<HTMLDivElement>(null);
  const sheetCloseTimerRef = useRef<number | null>(null);
  const toastTimerRef = useRef<number | null>(null);
  const pub = useMemo(() => resolveProjectPublishing(project), [project]);
  const ads = useMemo(() => resolveProjectAds(project), [project]);
  const bottomNavbar = useMemo(() => resolveBottomNavbar(project), [project]);
  const enabledNavItems = useMemo(
    () => bottomNavbar.items.filter((it) => it.enabled !== false),
    [bottomNavbar.items]
  );

  useEffect(() => {
    return () => {
      if (sheetCloseTimerRef.current !== null) {
        window.clearTimeout(sheetCloseTimerRef.current);
      }
      if (toastTimerRef.current !== null) {
        window.clearTimeout(toastTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    void trackAnalyticsEvent({
      projectId,
      projectTitle: project.title,
      slug: pub.slug,
      eventType: 'page_view',
      channel: 'organic',
      isTest: true,
    });
  }, [projectId, project.title, pub.slug]);

  useEffect(() => {
    if (!activeSheetBlockId && !activeNavSheetId) {
      setSheetEntered(false);
      return;
    }
    const raf = requestAnimationFrame(() => setSheetEntered(true));
    return () => cancelAnimationFrame(raf);
  }, [activeSheetBlockId, activeNavSheetId]);

  const projectPages = project.pages ?? [];
  const currentCustomPageId = pageHistory[pageHistory.length - 1] ?? 'home';
  const currentCustomPage =
    currentCustomPageId !== 'home'
      ? projectPages.find((p) => p.id === currentCustomPageId) ?? null
      : null;

  const openCustomPage = (targetPageId: string) => {
    const clean = (targetPageId || 'home').trim();
    closeBottomSheet();
    setSubPage({ type: 'home' });
    if (clean === 'home') {
      setPageHistory(['home']);
    } else if (projectPages.some((p) => p.id === clean)) {
      setPageHistory((prev) =>
        prev[prev.length - 1] === clean ? prev : [...prev, clean]
      );
    }
    setTimeout(scrollToTop, 10);
  };

  const goBackPage = (explicitTarget?: string) => {
    closeBottomSheet();
    setSubPage({ type: 'home' });
    const target = (explicitTarget ?? '').trim();
    if (target === 'home') {
      setPageHistory(['home']);
      setTimeout(scrollToTop, 10);
      return;
    }
    if (target && projectPages.some((p) => p.id === target)) {
      setPageHistory((prev) => [...prev, target]);
      setTimeout(scrollToTop, 10);
      return;
    }
    setPageHistory((prev) => (prev.length > 1 ? prev.slice(0, -1) : ['home']));
    setTimeout(scrollToTop, 10);
  };

  const activeSheetBlock = useMemo(
    () =>
      activeSheetBlockId
        ? findBlockById(project.blocks, activeSheetBlockId, bottomNavbar.items, projectPages)
        : null,
    [activeSheetBlockId, project.blocks, bottomNavbar.items, projectPages]
  );

  const activeNavSheetItem = useMemo(
    () =>
      activeNavSheetId
        ? bottomNavbar.items.find((it) => it.id === activeNavSheetId) ?? null
        : null,
    [activeNavSheetId, bottomNavbar.items]
  );

  const [rowActiveDots, setRowActiveDots] = useState<Record<string, number>>({});
  const rowTrackRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const activeSheetContent: {
    title: string;
    children: BuilderBlock[];
    position: MenuIconSheetPosition;
  } | null = activeSheetBlock
    ? activeSheetBlock.type === 'bottom_sheet' || activeSheetBlock.type === 'menu_icon'
      ? {
          title:
            activeSheetBlock.content.sheetTitle?.trim() ||
            (activeSheetBlock.type === 'menu_icon' ? 'Menu Panel' : 'Bottom Sheet'),
          children: activeSheetBlock.children ?? [],
          position:
            activeSheetBlock.type === 'menu_icon'
              ? activeSheetBlock.content.menuIconSheetPosition ?? 'bottom'
              : activeSheetBlock.content.sheetPosition ?? 'bottom',
        }
      : {
          title:
            activeSheetBlock.content.actionSheetTitle?.trim() ||
            activeSheetBlock.content.cardTitle?.trim() ||
            activeSheetBlock.label ||
            'Detail Panel',
          children: activeSheetBlock.content.actionSheetBlocks ?? [],
          position: activeSheetBlock.content.actionSheetPosition ?? 'bottom',
        }
    : activeNavSheetItem
    ? {
        title:
          activeNavSheetItem.sheetTitle?.trim() || activeNavSheetItem.label || 'Menu',
        children: activeNavSheetItem.children,
        position: activeNavSheetItem.sheetPosition ?? 'bottom',
      }
    : null;

  const clearSheetCloseTimer = () => {
    if (sheetCloseTimerRef.current !== null) {
      window.clearTimeout(sheetCloseTimerRef.current);
      sheetCloseTimerRef.current = null;
    }
  };

  const openBottomSheet = (blockId: string) => {
    clearSheetCloseTimer();
    setSheetEntered(false);
    setActiveNavSheetId(null);
    setActiveSheetBlockId(blockId);
  };

  const openNavBottomSheet = (navItemId: string) => {
    clearSheetCloseTimer();
    setSheetEntered(false);
    setActiveSheetBlockId(null);
    setActiveNavSheetId(navItemId);
  };

  const closeBottomSheet = () => {
    clearSheetCloseTimer();
    setSheetEntered(false);
    sheetCloseTimerRef.current = window.setTimeout(() => {
      sheetCloseTimerRef.current = null;
      setActiveSheetBlockId(null);
      setActiveNavSheetId(null);
    }, 200);
  };

  const scrollToTop = () => {
    scrollBodyRef.current?.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const jumpToMatchingHeading = (targetTitle: string) => {
    const query = targetTitle.trim().toLowerCase();
    if (!query || !scrollBodyRef.current) return;
    const candidates = Array.from(
      scrollBodyRef.current.querySelectorAll<HTMLElement>('[data-jump-title]')
    );
    const exact = candidates.find(
      (el) => (el.getAttribute('data-jump-title') || '').trim().toLowerCase() === query
    );
    const partial =
      exact ??
      candidates.find((el) =>
        (el.getAttribute('data-jump-title') || '').trim().toLowerCase().includes(query)
      );
    if (partial) {
      partial.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const jumpToBlockId = (targetBlockId: string) => {
    const cleanId = targetBlockId.trim();
    if (!cleanId) return;
    closeBottomSheet();
    setSubPage({ type: 'home' });
    window.setTimeout(() => {
      if (!scrollBodyRef.current) return;
      const targetEl = scrollBodyRef.current.querySelector<HTMLElement>(
        `[data-block-id="${CSS.escape(cleanId)}"]`
      );
      if (targetEl) {
        targetEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        targetEl.style.outline = `2px solid ${project.theme.accentColor}`;
        targetEl.style.outlineOffset = '3px';
        window.setTimeout(() => {
          targetEl.style.outline = '';
          targetEl.style.outlineOffset = '';
        }, 1200);
      }
    }, 30);
  };

  const showToast = (msg: string) => {
    if (toastTimerRef.current !== null) {
      window.clearTimeout(toastTimerRef.current);
    }
    setToastText(msg);
    toastTimerRef.current = window.setTimeout(() => {
      toastTimerRef.current = null;
      setToastText((prev) => (prev === msg ? null : prev));
    }, 1800);
  };

  const recordPreviewWaClick = (ctaLabel: string, href: string, orderValue?: number) => {
    void trackAnalyticsEvent({
      projectId,
      projectTitle: project.title,
      slug: pub.slug,
      eventType: 'wa_click',
      channel: ads.waAddonEnabled && ctaLabel.includes('Add-On') ? 'meta_wa_addon' : 'organic',
      ctaLabel,
      waPhone: extractWhatsappPhoneFromUrl(href),
      orderValue,
      isTest: true,
    });
    showToast('Klik WA tercatat di Dashboard (Uji Preview)');
  };

  const openProductDetail = (block: BuilderBlock, item: CatalogItem) => {
    const variants = parseVariants(item.variants);
    setDetailVariant(variants[0] ?? '');
    setDetailQty(1);
    setDetailPhotoIdx(0);
    setSheetEntered(false);
    setActiveSheetBlockId(null);
    setActiveNavSheetId(null);
    setSubPage({ type: 'detail', blockId: block.id, itemId: item.id });
    scrollToTop();
  };

  const openCartPage = (blockId?: string) => {
    setSheetEntered(false);
    setActiveSheetBlockId(null);
    setActiveNavSheetId(null);
    setSubPage({ type: 'cart', blockId });
    scrollToTop();
  };

  const addToCart = (blockId: string, item: CatalogItem, variant: string, qty: number) => {
    const blk = findBlockById(project.blocks, blockId, bottomNavbar.items, projectPages);
    const blockProductType = blk?.content.catalogProductType ?? 'physical';
    const entry = createCartEntry(blockId, item, variant, qty, blockProductType);
    setCart((prev) => {
      const idx = prev.findIndex((c) => c.key === entry.key);
      if (idx === -1) return [...prev, entry];
      return prev.map((c, i) => (i === idx ? { ...c, qty: c.qty + entry.qty } : c));
    });
    showToast(`"${item.title}" masuk ke keranjang`);
  };

  const updateCartQty = (key: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((c) => (c.key === key ? { ...c, qty: c.qty + delta } : c))
        .filter((c) => c.qty > 0)
    );
  };

  const removeFromCart = (key: string) => {
    setCart((prev) => prev.filter((c) => c.key !== key));
  };

  const totalCartCount = useMemo(
    () => cart.reduce((sum, entry) => sum + entry.qty, 0),
    [cart]
  );

  const totalCartAmount = useMemo(
    () => cart.reduce((sum, entry) => sum + entry.unitPrice * entry.qty, 0),
    [cart]
  );

  const firstCatalog = useMemo(
    () => findFirstCatalogBlock(project.blocks, bottomNavbar.items, projectPages),
    [project.blocks, bottomNavbar.items, projectPages]
  );
  const floatingCartConfig = useMemo(() => {
    const resolved = resolveProjectFloatingCartConfig(
      project.blocks,
      bottomNavbar.items,
      projectPages
    );
    if (!resolved) return null;
    return {
      position: resolved.position,
      offsetY: resolved.offsetY,
      bgColor: resolved.bg || project.theme.accentColor || '#059669',
      actionLabel: resolved.label,
    };
  }, [project.blocks, bottomNavbar.items, projectPages, project.theme.accentColor]);
  const hasCartFeature = Boolean(
    firstCatalog &&
      (firstCatalog.type === 'cart_button' ||
        firstCatalog.type === 'showcase_card' ||
        Boolean(firstCatalog.content.universalCartEnabled) ||
        (firstCatalog.content.catalogCartEnabled ?? true))
  );
  const fnbCartQtyMap = useMemo(() => {
    const map: Record<string, number> = {};
    for (const entry of cart) {
      map[entry.itemId] = (map[entry.itemId] ?? 0) + entry.qty;
    }
    return map;
  }, [cart]);

  const toCatalogLikeItem = (item: FnbMenuItem): CatalogItem => ({
    id: item.id,
    title: item.title,
    subtitle: item.category || '',
    description: item.description,
    badge: item.badge,
    price: item.price,
    ctaLabel: 'Tambah',
    url: '',
    image: item.image || '',
    unitSold: 0,
  });

  const triggerUniversalBlockAction = (block: BuilderBlock, e?: React.MouseEvent) => {
    const action = resolveBlockAction(block);
    if (!action || action.type === 'none') return;
    if (e) {
      const target = e.target as HTMLElement | null;
      if (target && target.closest('button, a, input, textarea, select, [data-universal-cart-box]')) {
        return;
      }
    }
    if (action.type === 'url') {
      const safe = sanitizeExternalUrl(action.url, '');
      if (safe && safe !== '#') {
        const a = document.createElement('a');
        a.href = safe;
        a.target = '_blank';
        a.rel = 'noopener noreferrer';
        a.click();
      }
    } else if (action.type === 'sheet') {
      openBottomSheet(block.id);
    } else if (action.type === 'page') {
      openCustomPage(action.targetPageId);
    } else if (action.type === 'card') {
      jumpToBlockId(action.targetBlockId);
    } else if (action.type === 'back') {
      goBackPage(action.targetPageId);
    }
  };

  const renderPreviewBlock = (
    block: BuilderBlock,
    depth = 0,
    inheritedTextColor?: string
  ): React.ReactNode => {
    const rendered = renderPreviewBlockInner(block, depth, inheritedTextColor);
    const rawAction =
      block.type === 'menu_icon' || block.type === 'back_button' || block.type === 'button'
        ? null
        : resolveBlockAction(block);
    const action = rawAction && rawAction.type !== 'none' ? rawAction : null;
    const uc = resolveUniversalCartMeta(block, project.theme);

    let node: React.ReactNode = rendered;
    if (React.isValidElement(rendered)) {
      node = React.cloneElement(rendered as React.ReactElement<Record<string, unknown>>, {
        'data-block-id': block.id,
      });
    }

    if (!action && !uc) return node;

    const ucQty = uc ? fnbCartQtyMap[uc.compositeKey] ?? 0 : 0;
    const ucCatalogItem: CatalogItem | null = uc
      ? {
          id: uc.compositeKey,
          title: uc.name,
          subtitle: '',
          description: '',
          price: uc.price,
          ctaLabel: uc.buttonLabel,
          url: '',
          image: uc.image,
          unitSold: uc.unitSold,
        }
      : null;

    return (
      <div
        key={block.id}
        data-block-id={block.id}
        onClick={action ? (e) => triggerUniversalBlockAction(block, e) : undefined}
        className={action ? 'cursor-pointer' : undefined}
      >
        {node}
        {uc && ucCatalogItem && (
          <div
            data-universal-cart-box="1"
            onClick={(e) => e.stopPropagation()}
            style={{ width: `${block.style.widthPercent}%` }}
            className="mx-auto -mt-1 mb-2 px-2.5 py-2 rounded-b-xl border border-t-0 border-black/10 bg-white/95 text-[#0F172A] flex flex-wrap items-center justify-between gap-2 shadow-xs"
          >
            <div className="min-w-0 text-left">
              <div className="text-xs font-extrabold tabular-nums" style={{ color: uc.accentColor }}>
                {uc.price}
              </div>
              {uc.showUnitSold && (
                <div className="text-[10px] text-slate-500 tabular-nums">
                  {uc.unitSold} terjual
                </div>
              )}
            </div>
            {ucQty > 0 ? (
              <div
                style={{ borderColor: uc.accentColor }}
                className="inline-flex items-center gap-1 rounded-full border bg-white px-1 py-0.5 shadow-xs"
              >
                <button
                  type="button"
                  onClick={() => updateCartQty(`${block.id}::${uc.compositeKey}::`, -1)}
                  className="w-6 h-6 rounded-full bg-slate-100 flex items-center justify-center cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <span className="text-xs font-bold min-w-[18px] text-center tabular-nums">
                  {ucQty}
                </span>
                <button
                  type="button"
                  onClick={() => addToCart(block.id, ucCatalogItem, '', 1)}
                  style={{ backgroundColor: uc.accentColor }}
                  className="w-6 h-6 rounded-full text-white flex items-center justify-center cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => addToCart(block.id, ucCatalogItem, '', 1)}
                style={{ backgroundColor: uc.accentColor }}
                className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-bold text-white shadow-xs cursor-pointer"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>{uc.buttonLabel}</span>
              </button>
            )}
          </div>
        )}
      </div>
    );
  };

  const activePreviewBreakpoint = resolveViewportBreakpoint(previewSize.width);

  const renderPreviewBlockInner = (
    block: BuilderBlock,
    depth = 0,
    inheritedTextColor?: string
  ): React.ReactNode => {
    const s = resolveEffectiveBlockStyle(block.style, activePreviewBreakpoint);
    const padX = s.paddingX ?? s.padding;
    const padTop = s.paddingTop ?? s.padding;
    const padBottom = s.paddingBottom ?? s.padding;
    const padLeft = s.paddingLeft ?? padX;
    const padRight = s.paddingRight ?? padX;
    const marginTop = s.marginTop ?? 0;
    const isCircleImage = block.type === 'image' && block.content.imageShape === 'circle';
    const isHeroBanner = block.type === 'hero_profile' && (block.content.heroVariant ?? 'compact') === 'banner';
    const isHeroCompact = block.type === 'hero_profile' && !isHeroBanner;
    const resolvedTextColor = resolveBlockTextColor(s, project.theme, inheritedTextColor);
    const nextInheritedTextColor =
      s.useThemeTextColor === false
        ? s.textColor
        : s.useThemeTextColor === undefined &&
          s.textColor &&
          s.textColor.trim().toLowerCase() !== project.theme.textColor.trim().toLowerCase()
        ? s.textColor
        : inheritedTextColor;
    const resolvedFontFamily =
      resolveCssFontFamily(s.fontFamily) || resolveCssFontFamily(project.theme.fontFamily);
    const bgProps =
      isCircleImage || isHeroBanner
        ? { backgroundColor: 'transparent' }
        : resolveBackgroundInlineProps(s);
    const resolvedRadius = isHeroCompact
      ? `${block.content.heroCardRadius ?? s.borderRadius}px`
      : isHeroBanner
      ? '0px'
      : s.shapePreset === 'circle' || s.shapePreset === 'pill'
      ? '9999px'
      : s.shapePreset === 'square'
      ? '0px'
      : `${s.borderRadius}px`;
    const style: React.CSSProperties = {
      width: `${s.widthPercent}%`,
      minHeight: isCircleImage ? '0px' : `${s.minHeight}px`,
      maxHeight: !isCircleImage && s.maxHeight && s.maxHeight > 0 ? `${s.maxHeight}px` : undefined,
      overflow: !isCircleImage && s.maxHeight && s.maxHeight > 0 ? 'hidden' : undefined,
      borderRadius: resolvedRadius,
      padding: isHeroBanner ? '0px' : `${padTop}px ${padRight}px ${padBottom}px ${padLeft}px`,
      marginTop: `${marginTop}px`,
      marginBottom: `${s.marginBottom}px`,
      textAlign: s.align,
      ...bgProps,
      color: resolvedTextColor,
      fontFamily: resolvedFontFamily,
      fontSize: s.fontSize ? `${s.fontSize}px` : undefined,
      fontWeight: s.fontWeightCss ? Number(s.fontWeightCss) : undefined,
      lineHeight: s.lineHeight ? String(s.lineHeight) : undefined,
      letterSpacing: s.letterSpacing ? `${s.letterSpacing}px` : undefined,
      borderWidth: isCircleImage || isHeroBanner ? '0px' : `${s.borderWidth}px`,
      borderStyle: !isCircleImage && !isHeroBanner && s.borderWidth > 0 ? 'solid' : 'none',
      borderColor: s.borderColor,
      boxShadow:
        isCircleImage || isHeroBanner ? 'none' : shadowToCss(s.shadow, s.shadowColor, s.shadowSize),
      backdropFilter: !isCircleImage && s.blur > 0 ? `blur(${s.blur}px)` : undefined,
      boxSizing: 'border-box',
      marginLeft: 'auto',
      marginRight: 'auto',
    };

    if (block.type === 'container') {
      const layoutMode = block.content.containerLayoutMode || 'normal';
      const isHSlider = layoutMode === 'slider_horizontal';
      const isVSlider = layoutMode === 'slider_vertical';
      const isSlider = isHSlider || isVSlider;
      const visibleItems = Math.max(1, Math.min(6, Number(block.content.sliderVisibleItems || 1)));
      const sliderGap = Math.max(0, Math.min(48, Number(block.content.sliderGap ?? 12)));
      const children = block.children ?? [];
      const showDots = block.content.sliderShowDots !== false;
      const sliderDotsPosition = block.content.sliderDotsPosition ?? 'below';
      const showScrollbar = Boolean(block.content.sliderShowScrollbar);
      const dotCount = Math.min(children.length, 6);

      return (
        <div
          key={block.id}
          data-jump-title={block.label?.trim().toLowerCase() || undefined}
          style={style}
          className={`relative ${
            s.hoverLift ? 'transition-all duration-200 hover:-translate-y-0.5 hover:shadow-lg' : ''
          }`}
        >
          {isHSlider ? (
            <div
              className={`flex flex-row overflow-x-auto touch-pan-x ${
                showScrollbar ? 'pb-1.5' : 'pb-0.5 no-scrollbar'
              }`}
              style={{
                gap: `${sliderGap}px`,
                scrollSnapType: block.content.sliderSnap !== false ? 'x mandatory' : undefined,
                WebkitOverflowScrolling: 'touch',
              }}
            >
              {children.map((child) => (
                <div
                  key={child.id}
                  style={{
                    flex: `0 0 calc((100% - ${Math.max(0, visibleItems - 1) * sliderGap}px) / ${visibleItems})`,
                    scrollSnapAlign: block.content.sliderSnap !== false ? 'start' : undefined,
                    minWidth: 0,
                  }}
                >
                  {renderPreviewBlock(child, depth + 1, nextInheritedTextColor)}
                </div>
              ))}
            </div>
          ) : isVSlider ? (
            <div
              className={`flex flex-col overflow-y-auto ${showScrollbar ? 'pr-1' : 'no-scrollbar'}`}
              style={{
                gap: `${sliderGap}px`,
                maxHeight: `${Math.max(220, s.maxHeight || 340)}px`,
                scrollSnapType: block.content.sliderSnap !== false ? 'y mandatory' : undefined,
              }}
            >
              {children.map((child) => (
                <div
                  key={child.id}
                  style={{
                    flexShrink: 0,
                    scrollSnapAlign: block.content.sliderSnap !== false ? 'start' : undefined,
                  }}
                >
                  {renderPreviewBlock(child, depth + 1, nextInheritedTextColor)}
                </div>
              ))}
            </div>
          ) : (
            children.map((child) =>
              renderPreviewBlock(child, depth + 1, nextInheritedTextColor)
            )
          )}
          {isSlider && showDots && dotCount > 1 && (
            <div
              className={
                sliderDotsPosition === 'overlay'
                  ? 'absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/50 backdrop-blur-xs shadow-sm'
                  : 'mt-2 flex items-center justify-center gap-1.5'
              }
            >
              {Array.from({ length: dotCount }).map((_, idx) => (
                <span
                  key={idx}
                  style={{
                    backgroundColor:
                      idx === 0
                        ? project.theme.accentColor
                        : sliderDotsPosition === 'overlay'
                        ? 'rgba(255, 255, 255, 0.58)'
                        : '#CBD5E1',
                  }}
                  className={`rounded-full ${idx === 0 ? 'w-4 h-1.5' : 'w-1.5 h-1.5'}`}
                />
              ))}
            </div>
          )}
        </div>
      );
    }

    if (block.type === 'toggle_container') {
      const defaultOpen = Boolean(block.content.toggleDefaultOpen);
      const isOpen = openToggles[block.id] ?? defaultOpen;
      const showLabel = block.content.toggleShowLabel || 'Tampilkan Konten';
      const hideLabel = block.content.toggleHideLabel || showLabel;
      const btnBg = block.content.toggleButtonBg || project.theme.accentColor;
      const btnText = block.content.toggleButtonText || '#FFFFFF';
      const btnStyle = block.content.toggleButtonStyle ?? 'solid';
      const leftIcon = resolveButtonIcon(block.content.toggleButtonIcon, showLabel);

      return (
        <div key={block.id} style={style}>
          <button
            type="button"
            aria-expanded={isOpen}
            onClick={() => setOpenToggles((prev) => ({ ...prev, [block.id]: !isOpen }))}
            style={
              btnStyle === 'outline'
                ? {
                    backgroundColor: 'transparent',
                    color: btnBg,
                    border: `1.5px solid ${btnBg}`,
                    borderRadius: `${Math.min(s.borderRadius, 12)}px`,
                  }
                : {
                    backgroundColor: btnBg,
                    color: btnText,
                    borderRadius: `${Math.min(s.borderRadius, 12)}px`,
                  }
            }
            className="w-full py-2.5 px-3.5 text-sm font-semibold flex items-center justify-between gap-2 cursor-pointer transition-opacity hover:opacity-95"
          >
            <span className="inline-flex items-center gap-2 min-w-0">
              {(leftIcon !== 'none' || Boolean(sanitizeIconUrl(block.content.toggleButtonIconUrl))) && (
                <ButtonGlyph
                  icon={leftIcon}
                  iconUrl={block.content.toggleButtonIconUrl}
                  className="w-4 h-4 shrink-0"
                />
              )}
              <span className="truncate">{isOpen ? hideLabel : showLabel}</span>
            </span>
            <ChevronDown
              className={`w-4 h-4 shrink-0 transition-transform duration-200 ${
                isOpen ? 'rotate-180' : ''
              }`}
            />
          </button>
          {isOpen && (
            <div className="mt-3">
              {(block.children ?? []).map((child) =>
                renderPreviewBlock(child, depth + 1, nextInheritedTextColor)
              )}
            </div>
          )}
        </div>
      );
    }

    if (block.type === 'bottom_sheet') {
      const triggerStyle = block.content.sheetTriggerStyle ?? 'icon';
      const triggerLabel = block.content.sheetTriggerLabel ?? 'Lokasi Maps';
      const triggerSublabel = block.content.sheetTriggerSublabel ?? '';
      const triggerBg = block.content.sheetTriggerBg || project.theme.accentColor;
      const triggerText = block.content.sheetTriggerText || '#FFFFFF';
      const iconSize = Math.max(36, Math.min(72, block.content.sheetIconSize ?? 52));
      const glyphSize = Math.round(iconSize * 0.44);
      const triggerIcon = resolveButtonIcon(
        block.content.sheetTriggerIcon ?? 'map-pin',
        triggerLabel
      );
      const hasTriggerGlyph =
        triggerIcon !== 'none' || Boolean(sanitizeIconUrl(block.content.sheetTriggerIconUrl));
      const justifyClass =
        s.align === 'left'
          ? 'justify-start'
          : s.align === 'right'
          ? 'justify-end'
          : 'justify-center';

      return (
        <div key={block.id} style={style} className={`flex ${justifyClass}`}>
          {triggerStyle === 'icon' && (
            <button
              type="button"
              onClick={() => openBottomSheet(block.id)}
              className="inline-flex flex-col items-center gap-1.5 cursor-pointer group"
            >
              <span
                style={{
                  width: `${iconSize}px`,
                  height: `${iconSize}px`,
                  backgroundColor: triggerBg,
                  color: triggerText,
                }}
                className="rounded-full flex items-center justify-center shadow-md transition-transform group-hover:scale-105"
              >
                {hasTriggerGlyph ? (
                  <ButtonGlyph
                    icon={triggerIcon}
                    iconUrl={block.content.sheetTriggerIconUrl}
                    style={{ width: `${glyphSize}px`, height: `${glyphSize}px` }}
                  />
                ) : (
                  <PanelBottomOpen
                    style={{ width: `${glyphSize}px`, height: `${glyphSize}px` }}
                  />
                )}
              </span>
              {triggerLabel.trim() && (
                <span className="text-xs font-semibold leading-tight">{triggerLabel}</span>
              )}
              {triggerSublabel.trim() && (
                <span className="text-[11px] opacity-70 leading-tight">{triggerSublabel}</span>
              )}
            </button>
          )}

          {triggerStyle === 'pill' && (
            <button
              type="button"
              onClick={() => openBottomSheet(block.id)}
              style={{
                backgroundColor: triggerBg,
                color: triggerText,
              }}
              className="inline-flex items-center gap-2.5 px-4 py-2.5 rounded-full shadow-sm cursor-pointer transition-opacity hover:opacity-95"
            >
              {hasTriggerGlyph && (
                <ButtonGlyph
                  icon={triggerIcon}
                  iconUrl={block.content.sheetTriggerIconUrl}
                  className="w-4 h-4 shrink-0"
                />
              )}
              <span className="text-left min-w-0">
                <span className="block text-xs font-bold leading-tight truncate">
                  {triggerLabel || 'Buka Panel'}
                </span>
                {triggerSublabel.trim() && (
                  <span className="block text-[10px] opacity-85 leading-tight truncate mt-0.5">
                    {triggerSublabel}
                  </span>
                )}
              </span>
            </button>
          )}

          {triggerStyle === 'button' && (
            <button
              type="button"
              onClick={() => openBottomSheet(block.id)}
              style={{
                backgroundColor: triggerBg,
                color: triggerText,
                borderRadius: `${Math.min(s.borderRadius, 14)}px`,
              }}
              className="w-full py-2.5 px-4 text-sm font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-opacity hover:opacity-95"
            >
              {hasTriggerGlyph && (
                <ButtonGlyph
                  icon={triggerIcon}
                  iconUrl={block.content.sheetTriggerIconUrl}
                  className="w-4 h-4 shrink-0"
                />
              )}
              <span className="truncate">{triggerLabel || 'Buka Bottom Sheet'}</span>
            </button>
          )}
        </div>
      );
    }

    if (block.type === 'menu_icon') {
      const shape = block.content.menuIconShape ?? s.shapePreset ?? 'circle';
      const radius =
        shape === 'circle' || shape === 'pill'
          ? '9999px'
          : shape === 'square'
          ? '0px'
          : `${Math.max(0, Math.min(48, block.content.menuIconRadius ?? s.borderRadius ?? 14))}px`;
      const size = Math.max(36, Math.min(160, block.content.menuIconSize ?? 64));
      const imgSize =
        typeof block.content.menuIconImageSize === 'number' &&
        Number.isFinite(block.content.menuIconImageSize) &&
        block.content.menuIconImageSize > 0
          ? Math.max(16, Math.min(160, Math.round(block.content.menuIconImageSize)))
          : null;
      const iconWidth = shape === 'pill' ? Math.round(size * 1.45) : size;
      const fit = block.content.menuIconImageFit ?? 'cover';
      const imgSrc = (block.content.menuIconImage ?? '').trim();
      const showLabel = block.content.menuIconShowLabel !== false;
      const iconLabel = block.content.menuIconLabel ?? 'Menu Icon';
      const bgColor = block.content.menuIconBg || project.theme.accentColor;
      const labelColor =
        s.useThemeTextColor === false
          ? s.textColor || block.content.menuIconTextColor || resolvedTextColor
          : block.content.menuIconTextColor || resolvedTextColor;
      const labelFontSize = s.fontSize
        ? s.fontSize
        : block.content.variant === 'h1'
        ? 18
        : block.content.variant === 'h2'
        ? 15
        : 12;
      const labelFontWeight = s.fontWeightCss
        ? Number(s.fontWeightCss)
        : block.content.fontWeight === 'bold'
        ? 700
        : block.content.fontWeight === 'normal'
        ? 400
        : 600;
      const action = block.content.menuIconAction ?? 'sheet';
      const targetId = (block.content.menuIconTargetBlockId ?? '').trim();
      const justifyClass =
        s.align === 'left'
          ? 'justify-start'
          : s.align === 'right'
          ? 'justify-end'
          : 'justify-center';

      return (
        <div key={block.id} style={style} className={`flex ${justifyClass}`}>
          <button
            type="button"
            onClick={() => {
              if (action === 'card') {
                if (targetId) jumpToBlockId(targetId);
              } else if (action === 'page') {
                openCustomPage(block.content.actionTargetPageId || 'home');
              } else if (action === 'url') {
                const safe = sanitizeExternalUrl(block.content.actionUrl, '');
                if (safe && safe !== '#') {
                  const a = document.createElement('a');
                  a.href = safe;
                  a.target = '_blank';
                  a.rel = 'noopener noreferrer';
                  a.click();
                }
              } else if (action === 'back') {
                goBackPage(block.content.backTargetPageId);
              } else {
                openBottomSheet(block.id);
              }
            }}
            className="inline-flex flex-col items-center gap-1.5 cursor-pointer group"
          >
            <span
              style={{
                width: `${iconWidth}px`,
                height: `${size}px`,
                borderRadius: radius,
                backgroundColor: bgColor,
              }}
              className="flex items-center justify-center overflow-hidden shadow-md transition-transform group-hover:scale-105"
            >
              {imgSrc ? (
                <img
                  src={imgSrc}
                  alt={iconLabel}
                  referrerPolicy="no-referrer"
                  style={{
                    objectFit: fit,
                    width: imgSize ? `${imgSize}px` : '100%',
                    height: imgSize ? `${imgSize}px` : '100%',
                    transform:
                      typeof block.content.menuIconImageZoom === 'number' &&
                      Number.isFinite(block.content.menuIconImageZoom) &&
                      block.content.menuIconImageZoom !== 100
                        ? `scale(${Math.max(50, Math.min(250, block.content.menuIconImageZoom)) / 100})`
                        : undefined,
                    transformOrigin: 'center center',
                    transition: 'transform 160ms ease',
                  }}
                  className="block"
                />
              ) : (
                <Shapes
                  style={{
                    width: `${Math.round(size * 0.44)}px`,
                    height: `${Math.round(size * 0.44)}px`,
                    color: '#FFFFFF',
                  }}
                />
              )}
            </span>
            {showLabel && iconLabel.trim() && (
              <span
                style={{
                  color: labelColor,
                  fontSize: `${labelFontSize}px`,
                  fontWeight: labelFontWeight,
                  lineHeight: s.lineHeight ? String(s.lineHeight) : '1.25',
                  textAlign: s.align,
                }}
                className="leading-tight"
              >
                {iconLabel}
              </span>
            )}
          </button>
        </div>
      );
    }

    if (block.type === 'row') {
      const rowMode = block.content.rowLayoutMode ?? 'grid';
      const rowCols = Math.max(1, Math.min(20, block.content.rowColumns ?? 2));
      const rowColWidth = Math.max(80, Math.min(340, block.content.rowColumnWidth ?? 156));
      const rowColMinH = Math.max(0, Math.min(360, block.content.rowColumnMinHeight ?? 0));
      const rowGap = Math.max(0, Math.min(32, block.content.rowGap ?? 12));
      const rowChildren = block.children ?? [];

      if (rowMode === 'horizontal') {
        const activeDot = rowActiveDots[block.id] ?? 0;
        const showScrollbar = Boolean(block.content.rowShowScrollbar);
        const showDots = block.content.rowShowDots !== false;
        return (
          <div key={block.id} style={style} className="relative">
            <div
              ref={(el) => {
                rowTrackRefs.current[block.id] = el;
              }}
              onScroll={(e) => {
                const el = e.currentTarget;
                const maxScroll = Math.max(1, el.scrollWidth - el.clientWidth);
                const ratio = el.scrollLeft / maxScroll;
                const nextDot = ratio < 0.33 ? 0 : ratio <= 0.67 ? 1 : 2;
                setRowActiveDots((prev) =>
                  prev[block.id] === nextDot ? prev : { ...prev, [block.id]: nextDot }
                );
              }}
              style={{
                display: 'flex',
                flexDirection: 'row',
                flexWrap: 'nowrap',
                overflowX: 'auto',
                gap: `${rowGap}px`,
                alignItems: 'stretch',
                scrollSnapType: 'x proximity',
                WebkitOverflowScrolling: 'touch',
              }}
              className={`touch-pan-x ${showScrollbar ? 'pb-2' : 'pb-1 no-scrollbar'}`}
            >
              {rowChildren.map((child) => (
                <div
                  key={child.id}
                  style={{
                    flex: `0 0 ${rowColWidth}px`,
                    width: `${rowColWidth}px`,
                    minWidth: `${rowColWidth}px`,
                    minHeight: rowColMinH > 0 ? `${rowColMinH}px` : undefined,
                    scrollSnapAlign: 'start',
                  }}
                  className="flex flex-col [&>*]:h-full"
                >
                  {renderPreviewBlock(child, depth + 1, nextInheritedTextColor)}
                </div>
              ))}
            </div>
            {showDots && rowChildren.length > 1 && (() => {
              const rowDotsPosition = block.content.rowDotsPosition ?? 'below';
              return (
                <div
                  data-row-dots="3"
                  className={
                    rowDotsPosition === 'overlay'
                      ? 'absolute bottom-2.5 left-1/2 -translate-x-1/2 z-20 inline-flex items-center justify-center gap-1.5 px-2.5 py-1 rounded-full bg-slate-950/50 backdrop-blur-xs shadow-sm'
                      : 'flex items-center justify-center gap-1.5 pt-2'
                  }
                  aria-label="Indikator progress slide"
                >
                  {[0, 1, 2].map((dotIdx) => {
                    const isActive = activeDot === dotIdx;
                    return (
                      <button
                        key={dotIdx}
                        type="button"
                        aria-label={`Slide posisi ${dotIdx + 1}`}
                        onClick={() => {
                          const track = rowTrackRefs.current[block.id];
                          if (!track) return;
                          const maxScroll = Math.max(0, track.scrollWidth - track.clientWidth);
                          const targetLeft =
                            dotIdx === 0 ? 0 : dotIdx === 1 ? maxScroll / 2 : maxScroll;
                          track.scrollTo({ left: targetLeft, behavior: 'smooth' });
                          setRowActiveDots((prev) => ({ ...prev, [block.id]: dotIdx }));
                        }}
                        style={{
                          width: isActive ? '18px' : '6px',
                          height: '6px',
                          backgroundColor: isActive
                            ? project.theme.accentColor
                            : rowDotsPosition === 'overlay'
                            ? 'rgba(255, 255, 255, 0.58)'
                            : '#CBD5E1',
                        }}
                        className="rounded-full transition-all duration-200 cursor-pointer"
                      />
                    );
                  })}
                </div>
              );
            })()}
          </div>
        );
      }

      if (rowMode === 'vertical') {
        return (
          <div
            key={block.id}
            style={{
              ...style,
              display: 'flex',
              flexDirection: 'column',
              gap: `${rowGap}px`,
              alignItems: 'stretch',
            }}
          >
            {rowChildren.map((child) => (
              <div
                key={child.id}
                style={{ minHeight: rowColMinH > 0 ? `${rowColMinH}px` : undefined }}
                className="w-full min-w-0 flex flex-col [&>*]:h-full"
              >
                {renderPreviewBlock(child, depth + 1, nextInheritedTextColor)}
              </div>
            ))}
          </div>
        );
      }

      const rowGridRows =
        typeof block.content.rowGridRows === 'number' && block.content.rowGridRows > 0
          ? Math.max(1, Math.min(10, Math.round(block.content.rowGridRows)))
          : 0;
      return (
        <div
          key={block.id}
          style={{
            ...style,
            display: 'grid',
            gridTemplateColumns: `repeat(${rowCols}, minmax(0, 1fr))`,
            gridTemplateRows:
              rowGridRows > 0
                ? `repeat(${rowGridRows}, minmax(${rowColMinH > 0 ? `${rowColMinH}px` : 'auto'}, 1fr))`
                : undefined,
            gap: `${rowGap}px`,
            alignItems: 'stretch',
          }}
        >
          {rowChildren.map((child) => (
            <div
              key={child.id}
              style={{ minHeight: rowColMinH > 0 ? `${rowColMinH}px` : undefined }}
              className="min-w-0 flex flex-col [&>*]:h-full"
            >
              {renderPreviewBlock(child, depth + 1, nextInheritedTextColor)}
            </div>
          ))}
        </div>
      );
    }

    if (block.type === 'text') {
      if (!(block.content.text ?? '').trim()) return null;
      return (
        <div
          key={block.id}
          data-jump-title={(block.content.text ?? '').trim().toLowerCase()}
          style={{
            ...style,
            fontStyle: s.fontStyle ?? 'normal',
            ...buildLineClampStyle(s.maxLines),
          }}
          className={`leading-relaxed break-words whitespace-pre-line ${
            !s.fontSize
              ? block.content.variant === 'h1'
                ? 'text-xl'
                : block.content.variant === 'h2'
                ? 'text-base'
                : 'text-sm'
              : ''
          } ${
            !s.fontWeightCss
              ? block.content.fontWeight === 'bold'
                ? 'font-bold'
                : block.content.fontWeight === 'semibold'
                ? 'font-semibold'
                : 'font-normal'
              : ''
          }`}
        >
          {s.paragraphGap && s.paragraphGap > 0 && (block.content.text ?? '').includes('\n') ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: `${s.paragraphGap}px` }}>
              {(block.content.text ?? '').split('\n').map((line, i) => (
                <span key={i}>{line || '\u00A0'}</span>
              ))}
            </div>
          ) : (
            block.content.text
          )}
        </div>
      );
    }

    if (block.type === 'image') {
      const objPos = block.content.objectPosition ?? 'center';
      if (block.content.imageShape === 'circle') {
        const circleSize = Math.max(40, Math.min(280, block.content.circleSize ?? 112));
        const imageZoom = Math.max(40, Math.min(250, block.content.imageZoom ?? 100));
        const justifyClass =
          s.align === 'left'
            ? 'justify-start'
            : s.align === 'right'
            ? 'justify-end'
            : 'justify-center';
        return (
          <div key={block.id} style={style} className={`flex ${justifyClass}`}>
            <div
              className="overflow-hidden flex items-center justify-center shrink-0"
              style={{
                width: `${circleSize}px`,
                height: `${circleSize}px`,
                borderRadius: '9999px',
                backgroundColor:
                  s.backgroundColor && s.backgroundColor !== 'transparent'
                    ? s.backgroundColor
                    : '#F1F5F9',
                borderWidth: s.borderWidth > 0 ? `${s.borderWidth}px` : undefined,
                borderStyle: s.borderWidth > 0 ? 'solid' : undefined,
                borderColor: s.borderWidth > 0 ? s.borderColor : undefined,
                boxShadow: shadowToCss(s.shadow, s.shadowColor, s.shadowSize),
              }}
            >
              <img
                src={block.content.src}
                alt={block.content.alt || 'Foto Profil'}
                referrerPolicy="no-referrer"
                className="w-full h-full block"
                style={{
                  objectFit: block.content.objectFit ?? 'cover',
                  objectPosition: objPos,
                  transform: `scale(${imageZoom / 100})`,
                  transformOrigin: 'center center',
                }}
              />
            </div>
          </div>
        );
      }

      const rectZoom = Math.max(50, Math.min(250, block.content.imageZoom ?? 100));
      return (
        <div key={block.id} style={style}>
          <div
            className="overflow-hidden w-full h-full flex items-center justify-center bg-slate-100/70"
            style={{
              borderRadius: `${s.borderRadius}px`,
              aspectRatio:
                block.content.aspectRatio && block.content.aspectRatio !== 'auto'
                  ? block.content.aspectRatio
                  : undefined,
            }}
          >
            <img
              src={block.content.src}
              alt={block.content.alt || 'Gambar'}
              referrerPolicy="no-referrer"
              className="w-full h-full block"
              style={{
                objectFit: block.content.objectFit ?? 'cover',
                objectPosition: objPos,
                borderRadius: `${s.borderRadius}px`,
                transform: rectZoom !== 100 ? `scale(${rectZoom / 100})` : undefined,
                transformOrigin: 'center center',
              }}
            />
          </div>
        </div>
      );
    }

    if (block.type === 'button') {
      const btnLabel = block.content.label || 'Tautan';
      const leftIcon = resolveButtonIcon(block.content.buttonIcon, btnLabel);
      const btnGrad = buildLinearGradientCss(s);
      const action = resolveBlockAction(block);
      const isDisabled = Boolean(block.content.buttonDisabled);
      const disabledState = isDisabled ? block.content.buttonStateStyles?.disabled : undefined;
      const iconVisible =
        !block.content.buttonHideIcon &&
        !isSubLayerHidden(block, 'button_icon') &&
        !isSubLayerDeleted(block, 'button_icon') &&
        (leftIcon !== 'none' || Boolean(sanitizeIconUrl(block.content.buttonIconUrl)));
      const textVisible =
        !block.content.buttonHideText &&
        !isSubLayerHidden(block, 'button_text') &&
        !isSubLayerDeleted(block, 'button_text');

      const iconSizePx = Math.max(10, Math.min(40, block.content.buttonIconSize ?? 16));
      const iconSt = block.content.buttonIconStyle;
      const textSt = block.content.buttonTextStyle;

      const btnInlineStyle: React.CSSProperties = {
        ...style,
        backgroundColor:
          disabledState?.bg ??
          (btnGrad
            ? s.gradientColor1 || '#EA580C'
            : block.content.buttonBg ?? project.theme.accentColor),
        backgroundImage: disabledState?.bg ? undefined : btnGrad || undefined,
        color: disabledState?.textColor ?? block.content.buttonText ?? '#FFFFFF',
        borderColor: disabledState?.borderColor ?? style.borderColor,
        opacity:
          disabledState?.opacity !== undefined
            ? disabledState.opacity / 100
            : isDisabled
            ? 0.55
            : style.opacity,
      };

      const iconNode = iconVisible && (
        <span
          title={block.content.buttonIconTooltip || undefined}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: block.content.buttonIconColor || iconSt?.textColor || undefined,
            backgroundColor: iconSt?.backgroundColor || undefined,
            padding: iconSt?.padding !== undefined ? `${iconSt.padding}px` : undefined,
            borderRadius: iconSt?.borderRadius !== undefined ? `${iconSt.borderRadius}px` : undefined,
            opacity: iconSt?.opacity !== undefined ? iconSt.opacity / 100 : undefined,
            transform:
              iconSt?.transformRotate && iconSt.transformRotate !== 0
                ? `rotate(${iconSt.transformRotate}deg)`
                : undefined,
          }}
        >
          <ButtonGlyph
            icon={leftIcon}
            iconUrl={block.content.buttonIconUrl}
            strokeWidth={block.content.buttonIconStrokeWidth}
            style={{ width: `${iconSizePx}px`, height: `${iconSizePx}px` }}
            className="shrink-0"
          />
        </span>
      );

      const textNode = textVisible && (
        <span
          style={{
            fontFamily: textSt?.fontFamily ? resolveCssFontFamily(textSt.fontFamily) : undefined,
            fontSize: textSt?.fontSize ? `${textSt.fontSize}px` : undefined,
            fontWeight: textSt?.fontWeightCss ?? undefined,
            fontStyle: textSt?.fontStyle ?? undefined,
            lineHeight: textSt?.lineHeight ?? undefined,
            letterSpacing:
              textSt?.letterSpacing !== undefined ? `${textSt.letterSpacing}px` : undefined,
            textTransform: textSt?.textTransform ?? undefined,
            textDecoration: textSt?.textDecoration ?? undefined,
            color: textSt?.textColor || undefined,
            opacity: textSt?.opacity !== undefined ? textSt.opacity / 100 : undefined,
          }}
        >
          {btnLabel}
        </span>
      );

      const waDigits = normalizeWhatsappNumber(block.content.buttonWhatsappNumber || '');
      const isWaDirect = block.content.buttonActionKind === 'whatsapp' && Boolean(waDigits);
      const waDirectHref = isWaDirect
        ? `https://wa.me/${waDigits}${
            block.content.buttonWhatsappMessage?.trim()
              ? `?text=${encodeURIComponent(block.content.buttonWhatsappMessage.trim())}`
              : ''
          }`
        : '';

      if (isDisabled) {
        return (
          <button
            key={block.id}
            type="button"
            disabled
            title={block.content.buttonTooltip || undefined}
            style={btnInlineStyle}
            className="flex items-center justify-center gap-2 py-3 px-4 font-semibold text-sm cursor-not-allowed"
          >
            {iconNode}
            {textNode}
          </button>
        );
      }

      if (isWaDirect || action.type === 'url') {
        const safeHref = isWaDirect ? waDirectHref : sanitizeExternalUrl(action.url, '#');
        const openNew = isWaDirect ? true : action.openInNewTab;
        return (
          <a
            key={block.id}
            href={safeHref}
            target={openNew ? '_blank' : undefined}
            rel={openNew ? 'noopener noreferrer' : undefined}
            title={block.content.buttonTooltip || undefined}
            style={btnInlineStyle}
            className="flex items-center justify-center gap-2 py-3 px-4 font-semibold text-sm hover:opacity-90 transition-opacity"
          >
            {iconNode}
            {textNode}
            {openNew && textVisible && <ExternalLink className="w-3.5 h-3.5 opacity-75 shrink-0" />}
          </a>
        );
      }

      return (
        <button
          key={block.id}
          type="button"
          title={block.content.buttonTooltip || undefined}
          onClick={() => {
            if (action.type === 'sheet') openBottomSheet(block.id);
            else if (action.type === 'page') openCustomPage(action.targetPageId);
            else if (action.type === 'card') jumpToBlockId(action.targetBlockId);
            else if (action.type === 'back') goBackPage(action.targetPageId);
          }}
          style={btnInlineStyle}
          className={`flex items-center justify-center gap-2 py-3 px-4 font-semibold text-sm transition-opacity ${
            action.type === 'none' ? 'cursor-default' : 'cursor-pointer hover:opacity-90'
          }`}
        >
          {iconNode}
          {textNode}
        </button>
      );
    }

    if (block.type === 'form') {
      const done = submittedForms[block.id];
      const fields = hydrateDefaultFormFields(block);
      const blockValues: DynamicFormValues = formValuesMap[block.id] ?? (() => {
        const init: DynamicFormValues = {};
        fields.forEach((f) => {
          if (f.type === 'section') return;
          if (f.type === 'checkbox_group') init[f.id] = [];
          else if (f.defaultValue) init[f.id] = f.defaultValue;
        });
        return init;
      })();
      const blockFieldErrors = formFieldErrorsMap[block.id] ?? {};
      const chkEnabled = Boolean(block.content.formChecklistEnabled);
      const chkItems = (block.content.formChecklistItems ?? []).filter((x) => x.trim());
      const chkRule =
        block.content.formChecklistRule ||
        (block.content.formChecklistRequired ? 'required_consent_all' : 'optional');
      const chkReq = chkRule !== 'optional';
      const chkMin = Math.max(1, Number(block.content.formChecklistMinChoices || 1));
      const blockChkMap = formChecklistMap[block.id] ?? {};
      const blockErr = formErrors[block.id] ?? '';

      const setFieldVal = (fldId: string, val: string | string[]) => {
        const nextVals: DynamicFormValues = { ...blockValues, [fldId]: val };
        setFormValuesMap((prev) => ({ ...prev, [block.id]: nextVals }));
        const fldObj = fields.find((f) => f.id === fldId);
        if (fldObj) {
          const singleErr = validateDynamicFormField(fldObj, val, nextVals);
          setFormFieldErrorsMap((prev) => {
            const cur = { ...(prev[block.id] ?? {}) };
            if (singleErr) cur[fldId] = singleErr;
            else delete cur[fldId];
            return { ...prev, [block.id]: cur };
          });
        }
      };

      return (
        <form
          key={block.id}
          style={style}
          noValidate
          onSubmit={(e) => {
            e.preventDefault();
            const validation = validateDynamicForm(fields, blockValues);
            setFormFieldErrorsMap((prev) => ({
              ...prev,
              [block.id]: validation.fieldErrors,
            }));
            let firstErr = validation.firstError || '';
            if (!firstErr && chkEnabled && chkReq && chkItems.length > 0) {
              const checkedCount = chkItems.filter((_, idx) => Boolean(blockChkMap[idx])).length;
              const chkTitle = block.content.formChecklistTitle?.trim() || 'Persetujuan';
              if (chkRule === 'required_consent_all' && checkedCount < chkItems.length) {
                firstErr = `Wajib mencentang seluruh persetujuan pada "${chkTitle}".`;
              } else if (chkRule === 'required_multi' && checkedCount === 0) {
                firstErr = `Wajib memilih minimal satu item pada "${chkTitle}".`;
              } else if (chkRule === 'required_min_choices' && checkedCount < chkMin) {
                firstErr = `"${chkTitle}" wajib memilih minimal ${chkMin} pilihan.`;
              }
            }
            if (firstErr) {
              setFormErrors((prev) => ({ ...prev, [block.id]: firstErr }));
              setSubmittedForms((prev) => ({ ...prev, [block.id]: false }));
              return;
            }
            setFormErrors((prev) => ({ ...prev, [block.id]: '' }));
            setSubmittedForms((prev) => ({ ...prev, [block.id]: true }));
            void trackAnalyticsEvent({
              projectId,
              projectTitle: project.title,
              slug: pub.slug,
              eventType: 'form_submit',
              ctaLabel: block.content.formTitle || 'Form Isian',
              isTest: true,
            });
          }}
          className="space-y-2.5 text-left"
        >
          {block.content.formTitle && (
            <div className="font-bold text-sm">{block.content.formTitle}</div>
          )}
          {fields.map((fld) => {
            if (!isDynamicFormFieldVisible(fld, blockValues)) return null;
            const rule = resolveFieldRequiredRule(fld);
            const isReq = rule !== 'optional';
            const fErr = blockFieldErrors[fld.id];
            const opts = (fld.options ?? []).map((o) => o.trim()).filter(Boolean);

            if (fld.type === 'section') {
              return (
                <div key={fld.id} className="pt-2 border-t border-slate-200/80 space-y-0.5">
                  <div className="text-xs font-bold">{fld.label || 'Bagian'}</div>
                  {fld.description && (
                    <div className="text-[11px] opacity-75">{fld.description}</div>
                  )}
                </div>
              );
            }

            const rawVal = blockValues[fld.id];
            const strVal = typeof rawVal === 'string' ? rawVal : '';
            const arrVal = Array.isArray(rawVal) ? rawVal : [];

            return (
              <div key={fld.id} className="space-y-1">
                <label className="block text-[11px] font-bold">
                  {fld.label || 'Kolom'}
                  {isReq && <span className="text-rose-600 ml-0.5">*</span>}
                </label>

                {fld.type === 'textarea' || fld.type === 'address' ? (
                  <textarea
                    rows={3}
                    value={strVal}
                    onChange={(e) => setFieldVal(fld.id, e.target.value)}
                    placeholder={fld.placeholder || ''}
                    className={`w-full px-3 py-2 rounded-lg border bg-white text-slate-900 text-xs outline-none resize-y ${
                      fErr ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-500'
                    }`}
                  />
                ) : fld.type === 'select' ? (
                  <select
                    value={strVal}
                    onChange={(e) => setFieldVal(fld.id, e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border bg-white text-slate-900 text-xs outline-none ${
                      fErr ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-500'
                    }`}
                  >
                    <option value="">{fld.placeholder || '-- Pilih --'}</option>
                    {opts.map((opt) => (
                      <option key={opt} value={opt}>
                        {opt}
                      </option>
                    ))}
                  </select>
                ) : fld.type === 'radio' ? (
                  <div
                    className={`rounded-lg border p-2 space-y-1.5 bg-white text-slate-900 ${
                      fErr ? 'border-rose-400' : 'border-slate-300'
                    }`}
                  >
                    {(opts.length > 0 ? opts : ['Pilihan 1', 'Pilihan 2']).map((opt) => (
                      <label key={opt} className="flex items-center gap-2 text-xs cursor-pointer">
                        <input
                          type="radio"
                          name={`prev_${block.id}_${fld.id}`}
                          checked={strVal === opt}
                          onChange={() => setFieldVal(fld.id, opt)}
                          className="accent-emerald-600 cursor-pointer"
                        />
                        <span>{opt}</span>
                      </label>
                    ))}
                  </div>
                ) : fld.type === 'checkbox_group' ? (
                  <div
                    className={`rounded-lg border p-2 space-y-1.5 bg-white text-slate-900 ${
                      fErr ? 'border-rose-400' : 'border-slate-300'
                    }`}
                  >
                    {(opts.length > 0 ? opts : ['Pilihan 1', 'Pilihan 2']).map((opt) => {
                      const checked = arrVal.includes(opt);
                      return (
                        <label key={opt} className="flex items-start gap-2 text-xs cursor-pointer">
                          <input
                            type="checkbox"
                            checked={checked}
                            onChange={(e) => {
                              const next = e.target.checked
                                ? [...arrVal, opt]
                                : arrVal.filter((x) => x !== opt);
                              setFieldVal(fld.id, next);
                            }}
                            className="mt-0.5 accent-emerald-600 cursor-pointer"
                          />
                          <span>{opt}</span>
                        </label>
                      );
                    })}
                  </div>
                ) : fld.type === 'file' ? (
                  <input
                    type="file"
                    onChange={(e) => {
                      const fileName = e.target.files?.[0]?.name || '';
                      setFieldVal(fld.id, fileName);
                    }}
                    className={`w-full px-2.5 py-1.5 rounded-lg border bg-white text-slate-900 text-xs ${
                      fErr ? 'border-rose-400' : 'border-slate-300'
                    }`}
                  />
                ) : (
                  <input
                    type={
                      fld.type === 'email'
                        ? 'email'
                        : fld.type === 'number'
                        ? 'number'
                        : fld.type === 'date'
                        ? 'date'
                        : fld.type === 'time'
                        ? 'time'
                        : fld.type === 'phone' || fld.type === 'tel'
                        ? 'tel'
                        : 'text'
                    }
                    value={strVal}
                    onChange={(e) => setFieldVal(fld.id, e.target.value)}
                    placeholder={fld.placeholder || ''}
                    className={`w-full px-3 py-2 rounded-lg border bg-white text-slate-900 text-xs outline-none ${
                      fErr ? 'border-rose-400 focus:border-rose-500' : 'border-slate-300 focus:border-blue-500'
                    }`}
                  />
                )}

                {fld.helpText && (
                  <div className="text-[10.5px] opacity-70">{fld.helpText}</div>
                )}
                {fErr && (
                  <div className="text-[10.5px] font-semibold text-rose-600">{fErr}</div>
                )}
              </div>
            );
          })}
          {chkEnabled && chkItems.length > 0 && (
            <div
              style={{ borderColor: project.theme.borderColor }}
              className="rounded-lg border p-2.5 space-y-1.5"
            >
              <div className="text-[11px] font-bold">
                {block.content.formChecklistTitle?.trim() || 'Persetujuan / Checklist'}
                {chkReq ? ' *' : ''}
              </div>
              {chkItems.map((itemText, idx) => (
                <label key={`pchk_${idx}`} className="flex items-start gap-2 text-xs cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(blockChkMap[idx])}
                    onChange={(e) => {
                      const nextChecked = e.target.checked;
                      setFormChecklistMap((prev) => ({
                        ...prev,
                        [block.id]: { ...(prev[block.id] ?? {}), [idx]: nextChecked },
                      }));
                    }}
                    className="mt-0.5 shrink-0 accent-emerald-600 cursor-pointer"
                  />
                  <span className="leading-snug">{itemText}</span>
                </label>
              ))}
            </div>
          )}
          {blockErr && (
            <div className="p-2 rounded-lg bg-rose-50 border border-rose-200 text-[11px] font-semibold text-rose-700">
              {blockErr}
            </div>
          )}
          <button
            type="submit"
            style={{ backgroundColor: block.content.buttonColor ?? project.theme.accentColor }}
            className="w-full py-2.5 px-4 rounded-lg text-white text-xs font-semibold cursor-pointer hover:opacity-90"
          >
            {block.content.submitLabel || 'Kirim Formulir'}
          </button>
          {done && (
            <div className="text-xs font-medium text-emerald-600 pt-1">
              {block.content.successMessage || 'Data berhasil dikirim!'}
            </div>
          )}
        </form>
      );
    }

    if (block.type === 'divider') {
      return (
        <div key={block.id} style={style}>
          <hr
            style={{
              border: 'none',
              borderTopWidth: `${block.content.thickness ?? 1}px`,
              borderTopStyle: block.content.lineStyle ?? 'solid',
              borderTopColor: block.content.lineColor ?? project.theme.borderColor,
            }}
          />
        </div>
      );
    }

    if (
      block.type === 'youtube' ||
      block.type === 'facebook_video' ||
      block.type === 'tiktok_video' ||
      block.type === 'instagram_video'
    ) {
      return (
        <div key={block.id} style={style}>
          <CleanVideoEmbed
            platform={
              block.type === 'facebook_video'
                ? 'facebook'
                : block.type === 'tiktok_video'
                ? 'tiktok'
                : block.type === 'instagram_video'
                ? 'instagram'
                : 'youtube'
            }
            videoUrl={
              block.type === 'youtube'
                ? block.content.youtubeUrl
                : block.content.videoUrl
            }
            posterUrl={block.content.videoPoster}
            aspectRatio={
              block.content.videoAspectRatio ??
              block.content.youtubeAspectRatio ??
              (block.type === 'tiktok_video' || block.type === 'instagram_video' ? '9/16' : '16/9')
            }
            autoPlay={block.content.videoAutoplay ?? block.content.youtubeAutoplay ?? true}
            volume={block.content.videoVolume ?? block.content.youtubeVolume ?? 75}
            muted={Boolean(block.content.videoMuted)}
            borderRadius={s.borderRadius}
            accentColor={project.theme.accentColor}
          />
        </div>
      );
    }

    if (block.type === 'catalog') {
      const layout = project.advanceOptions.blockLayout;
      const showSold = project.advanceOptions.showUnitSold;
      const detailEnabled = block.content.catalogDetailEnabled ?? true;
      const cartEnabled = block.content.catalogCartEnabled ?? true;
      const cartBtn = resolveCartButtonMetrics(block.content.catalogCartButtonSize);

      const handleQuickAdd = (e: React.MouseEvent, item: CatalogItem) => {
        e.preventDefault();
        e.stopPropagation();
        const defaultVar = parseVariants(item.variants)[0] ?? '';
        addToCart(block.id, item, defaultVar, 1);
      };

      const renderBadge = (item: CatalogItem) =>
        item.badge?.trim() ? (
          <span
            className="inline-block px-1.5 py-0.5 rounded text-[9px] font-bold text-white"
            style={{ backgroundColor: project.theme.accentColor }}
          >
            {item.badge.trim()}
          </span>
        ) : null;

      return (
        <div
          key={block.id}
          style={style}
          className={
            layout === 'grid'
              ? 'grid grid-cols-2 gap-2.5 text-left'
              : 'flex flex-col gap-2.5 text-left'
          }
        >
          {(block.content.catalogItems ?? []).map((item) => {
            const soldText = showSold ? ` · ${item.unitSold} terjual` : '';
            const fit = item.imageObjectFit ?? 'cover';
            const ratio = item.imageAspectRatio;
            const catalogZoom =
              typeof block.content.imageZoom === 'number' &&
              Number.isFinite(block.content.imageZoom)
                ? Math.max(50, Math.min(250, block.content.imageZoom))
                : 100;
            const frameRatioStyle = (fallback?: string): React.CSSProperties => ({
              aspectRatio: ratio === 'auto' ? undefined : ratio ?? fallback,
            });
            const thumbImgStyle: React.CSSProperties = {
              objectFit: fit,
              transform: catalogZoom !== 100 ? `scale(${catalogZoom / 100})` : undefined,
              transformOrigin: 'center center',
              transition: 'transform 160ms ease',
            };

            if (layout === 'grid') {
              const cardContent = (
                <>
                  {renderBadge(item) && (
                    <div className="absolute top-2 left-2 z-10">{renderBadge(item)}</div>
                  )}
                  <div
                    style={frameRatioStyle('1/1')}
                    className="w-full bg-slate-100 overflow-hidden"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      style={thumbImgStyle}
                      className="w-full h-full block"
                    />
                  </div>
                  <div className="p-2.5 space-y-1.5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="text-xs font-bold line-clamp-2">{item.title}</div>
                      <div
                        className="text-[11px] font-semibold tabular-nums mt-0.5"
                        style={{ color: project.theme.accentColor }}
                      >
                        {item.price}
                        <span className="opacity-70 font-normal">{soldText}</span>
                      </div>
                    </div>
                    {cartEnabled && (
                      <button
                        type="button"
                        onClick={(e) => handleQuickAdd(e, item)}
                        style={{
                          backgroundColor: project.theme.accentColor,
                          padding: cartBtn.gridPadding,
                          fontSize: `${cartBtn.gridFontSize}px`,
                          borderRadius: `${cartBtn.gridRadius}px`,
                          gap: `${cartBtn.gridGap}px`,
                        }}
                        className="w-full font-semibold text-white flex items-center justify-center cursor-pointer hover:opacity-90"
                      >
                        <ShoppingCart
                          style={{
                            width: `${cartBtn.gridIconSize}px`,
                            height: `${cartBtn.gridIconSize}px`,
                          }}
                        />
                        <span>+ Keranjang</span>
                      </button>
                    )}
                  </div>
                </>
              );

              if (detailEnabled) {
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openProductDetail(block, item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openProductDetail(block, item);
                      }
                    }}
                    style={{
                      backgroundColor: project.theme.cardBg,
                      borderColor: project.theme.borderColor,
                    }}
                    className="rounded-xl border overflow-hidden flex flex-col relative hover:opacity-95 cursor-pointer text-left"
                  >
                    {cardContent}
                  </div>
                );
              }

              return (
                <a
                  key={item.id}
                  href={sanitizeExternalUrl(item.url, '#')}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: project.theme.cardBg,
                    borderColor: project.theme.borderColor,
                  }}
                  className="rounded-xl border overflow-hidden flex flex-col relative hover:opacity-95"
                >
                  {cardContent}
                </a>
              );
            }

            if (layout === 'large-image') {
              const largeContent = (
                <>
                  {renderBadge(item) && (
                    <div className="absolute top-2.5 left-2.5 z-10">{renderBadge(item)}</div>
                  )}
                  <div
                    style={frameRatioStyle('16/10')}
                    className="w-full bg-slate-100 overflow-hidden"
                  >
                    <img
                      src={item.image}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      style={thumbImgStyle}
                      className="w-full h-full block"
                    />
                  </div>
                  <div className="p-3 flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-xs font-bold truncate">{item.title}</div>
                      <div className="text-[11px] opacity-75 tabular-nums">
                        {item.price}
                        {soldText}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span
                        className="text-xs font-semibold"
                        style={{ color: project.theme.accentColor }}
                      >
                        {item.ctaLabel}
                      </span>
                      {cartEnabled && (
                        <button
                          type="button"
                          onClick={(e) => handleQuickAdd(e, item)}
                          title="Tambah ke keranjang"
                          style={{
                            backgroundColor: project.theme.accentColor,
                            width: `${cartBtn.iconBoxSize}px`,
                            height: `${cartBtn.iconBoxSize}px`,
                            borderRadius: `${cartBtn.iconBoxRadius}px`,
                          }}
                          className="text-white inline-flex items-center justify-center cursor-pointer hover:opacity-90"
                        >
                          <ShoppingCart
                            style={{
                              width: `${cartBtn.iconOnlySize}px`,
                              height: `${cartBtn.iconOnlySize}px`,
                            }}
                          />
                        </button>
                      )}
                    </div>
                  </div>
                </>
              );

              if (detailEnabled) {
                return (
                  <div
                    key={item.id}
                    role="button"
                    tabIndex={0}
                    onClick={() => openProductDetail(block, item)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault();
                        openProductDetail(block, item);
                      }
                    }}
                    style={{
                      backgroundColor: project.theme.cardBg,
                      borderColor: project.theme.borderColor,
                    }}
                    className="rounded-2xl border overflow-hidden block relative hover:opacity-95 cursor-pointer text-left"
                  >
                    {largeContent}
                  </div>
                );
              }

              return (
                <a
                  key={item.id}
                  href={sanitizeExternalUrl(item.url, '#')}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    backgroundColor: project.theme.cardBg,
                    borderColor: project.theme.borderColor,
                  }}
                  className="rounded-2xl border overflow-hidden block relative hover:opacity-95"
                >
                  {largeContent}
                </a>
              );
            }

            if (layout === 'compact') {
              return (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: project.theme.cardBg,
                    borderColor: project.theme.borderColor,
                  }}
                  className="rounded-xl border p-3 space-y-2.5"
                >
                  <div
                    className={`flex items-center gap-2.5 ${detailEnabled ? 'cursor-pointer' : ''}`}
                    onClick={detailEnabled ? () => openProductDetail(block, item) : undefined}
                  >
                    <div
                      style={frameRatioStyle()}
                      className={
                        ratio && ratio !== 'auto'
                          ? 'w-14 rounded-lg bg-slate-100 shrink-0 overflow-hidden'
                          : 'w-12 h-12 rounded-lg bg-slate-100 shrink-0 overflow-hidden'
                      }
                    >
                      <img
                        src={item.image}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        style={thumbImgStyle}
                        className="w-full h-full block"
                      />
                    </div>
                    <div className="min-w-0 flex-1">
                      {renderBadge(item) && <div className="mb-0.5">{renderBadge(item)}</div>}
                      <div className="text-xs font-bold truncate">{item.title}</div>
                      <div className="text-[11px] opacity-75 tabular-nums">
                        {item.price}
                        {soldText}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {detailEnabled ? (
                      <button
                        type="button"
                        onClick={() => openProductDetail(block, item)}
                        style={{ backgroundColor: project.theme.accentColor }}
                        className="flex-1 py-2 px-3 rounded-lg text-center text-xs font-semibold text-white cursor-pointer hover:opacity-95"
                      >
                        {item.ctaLabel}
                      </button>
                    ) : (
                      <a
                        href={sanitizeExternalUrl(item.url, '#')}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{ backgroundColor: project.theme.accentColor }}
                        className="flex-1 block py-2 px-3 rounded-lg text-center text-xs font-semibold text-white"
                      >
                        {item.ctaLabel}
                      </a>
                    )}
                    {cartEnabled && (
                      <button
                        type="button"
                        onClick={(e) => handleQuickAdd(e, item)}
                        title="Tambah ke keranjang"
                        style={{
                          borderColor: project.theme.accentColor,
                          color: project.theme.accentColor,
                          padding: cartBtn.compactPadding,
                          borderRadius: `${cartBtn.compactRadius}px`,
                        }}
                        className="border text-xs font-semibold flex items-center justify-center cursor-pointer hover:opacity-80 shrink-0"
                      >
                        <ShoppingCart
                          style={{
                            width: `${cartBtn.compactIconSize}px`,
                            height: `${cartBtn.compactIconSize}px`,
                          }}
                        />
                      </button>
                    )}
                  </div>
                </div>
              );
            }

            // default layout
            const defaultBody = (
              <>
                <div
                  style={frameRatioStyle()}
                  className={
                    ratio && ratio !== 'auto'
                      ? 'w-16 rounded-lg bg-slate-100 shrink-0 overflow-hidden'
                      : 'w-14 h-14 rounded-lg bg-slate-100 shrink-0 overflow-hidden'
                  }
                >
                  <img
                    src={item.image}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    style={thumbImgStyle}
                    className="w-full h-full block"
                  />
                </div>
                <div className="min-w-0 flex-1">
                  {renderBadge(item) && <div className="mb-0.5">{renderBadge(item)}</div>}
                  <div className="text-xs font-bold truncate">{item.title}</div>
                  <div className="text-[11px] opacity-70 truncate">{item.subtitle}</div>
                  <div
                    className="text-[11px] font-semibold mt-1 tabular-nums"
                    style={{ color: project.theme.accentColor }}
                  >
                    {item.price}
                    <span className="opacity-70 font-normal">{soldText}</span>
                  </div>
                </div>
                {cartEnabled && (
                  <button
                    type="button"
                    onClick={(e) => handleQuickAdd(e, item)}
                    title="Tambah ke keranjang"
                    style={{
                      backgroundColor: project.theme.accentColor,
                      width: `${cartBtn.iconBoxSize}px`,
                      height: `${cartBtn.iconBoxSize}px`,
                      borderRadius: `${cartBtn.iconBoxRadius}px`,
                    }}
                    className="text-white flex items-center justify-center shrink-0 cursor-pointer hover:opacity-90"
                  >
                    <ShoppingCart
                      style={{
                        width: `${cartBtn.iconOnlySize}px`,
                        height: `${cartBtn.iconOnlySize}px`,
                      }}
                    />
                  </button>
                )}
              </>
            );

            if (detailEnabled) {
              return (
                <div
                  key={item.id}
                  role="button"
                  tabIndex={0}
                  onClick={() => openProductDetail(block, item)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      openProductDetail(block, item);
                    }
                  }}
                  style={{
                    backgroundColor: project.theme.cardBg,
                    borderColor: project.theme.borderColor,
                  }}
                  className="rounded-xl border p-2.5 flex items-center gap-3 hover:opacity-95 cursor-pointer text-left"
                >
                  {defaultBody}
                </div>
              );
            }

            return (
              <a
                key={item.id}
                href={sanitizeExternalUrl(item.url, '#')}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  backgroundColor: project.theme.cardBg,
                  borderColor: project.theme.borderColor,
                }}
                className="rounded-xl border p-2.5 flex items-center gap-3 hover:opacity-95"
              >
                {defaultBody}
              </a>
            );
          })}
        </div>
      );
    }

    if (block.type === 'social') {
      const visibleItems = (block.content.socialItems ?? []).filter((item) => item.visible);
      if (visibleItems.length === 0) return null;

      const socialStyle = block.content.socialStyle ?? 'filled';
      const socialShape = block.content.socialShape ?? 'circle';
      const { boxSize, iconSize, gap } = resolveSocialMetrics(block.content);
      const useBrand = block.content.socialUseBrandColors ?? true;
      const customColor = block.content.socialColor ?? project.theme.accentColor;

      const justifyClass =
        s.align === 'left'
          ? 'justify-start'
          : s.align === 'right'
          ? 'justify-end'
          : 'justify-center';

      const shapeClass = socialShape === 'rounded' ? 'rounded-xl' : 'rounded-full';

      return (
        <div
          key={block.id}
          style={{ ...style, gap: `${gap}px` }}
          className={`flex flex-wrap items-center ${justifyClass}`}
        >
          {visibleItems.map((item) => {
            const meta = SOCIAL_PLATFORMS[item.platform];
            const activeColor = useBrand ? meta.brandColor : customColor;
            const itemStyle: React.CSSProperties = {
              width: `${boxSize}px`,
              height: `${boxSize}px`,
              ...(socialStyle === 'filled'
                ? { backgroundColor: activeColor, color: '#FFFFFF' }
                : socialStyle === 'outline'
                ? {
                    backgroundColor: 'transparent',
                    color: activeColor,
                    border: `1.5px solid ${activeColor}`,
                  }
                : { backgroundColor: 'transparent', color: activeColor }),
            };

            return (
              <a
                key={item.id}
                href={sanitizeExternalUrl(item.url, '#')}
                target="_blank"
                rel="noopener noreferrer"
                title={meta.label}
                aria-label={meta.label}
                style={itemStyle}
                className={`${shapeClass} inline-flex items-center justify-center hover:opacity-85 transition-opacity shrink-0`}
              >
                <SocialGlyph
                  platform={item.platform}
                  className=""
                  style={{ width: `${iconSize}px`, height: `${iconSize}px` }}
                />
              </a>
            );
          })}
        </div>
      );
    }

    if (block.type === 'social_follower') {
      return (
        <div key={block.id} style={style}>
          <SocialFollowerList
            accounts={block.content.socialFollowerAccounts ?? []}
            gap={block.content.socialFollowerGap ?? 10}
            borderRadius={s.borderRadius}
            cardBg={
              s.backgroundColor && s.backgroundColor !== 'transparent'
                ? s.backgroundColor
                : project.theme.cardBg
            }
            borderColor={s.borderWidth > 0 ? s.borderColor : project.theme.borderColor}
            textColor={resolvedTextColor}
            accentColor={project.theme.accentColor}
          />
        </div>
      );
    }

    if (block.type === 'carousel') {
      return (
        <div key={block.id} style={style}>
          <PhotoCarousel
            items={block.content.carouselItems ?? []}
            aspectRatio={block.content.carouselAspectRatio ?? '4/5'}
            heightPx={block.content.carouselHeightPx}
            widthPx={block.content.carouselWidthPx}
            objectFit={block.content.carouselObjectFit ?? 'cover'}
            borderRadius={s.borderRadius}
            cardBg={project.theme.cardBg}
            borderColor={project.theme.borderColor}
            textColor={resolvedTextColor}
            accentColor={project.theme.accentColor}
            align={s.align}
            showDots={block.content.carouselShowDots !== false}
            dotsPosition={block.content.carouselDotsPosition ?? 'below'}
            showArrows={block.content.carouselShowArrows !== false}
            showScrollbar={Boolean(block.content.carouselShowScrollbar)}
            imageZoom={block.content.imageZoom}
          />
        </div>
      );
    }

    if (block.type === 'social_feed') {
      return (
        <div key={block.id} style={style}>
          <SocialFeedCard
            platform={block.content.socialFeedPlatform ?? 'instagram'}
            avatar={block.content.socialFeedAvatar}
            accountName={block.content.socialFeedAccountName ?? 'Studio Kreatif'}
            handle={block.content.socialFeedHandle ?? '@studiokreatif'}
            accountUrl={block.content.socialFeedAccountUrl}
            verified={block.content.socialFeedVerified ?? true}
            followers={block.content.socialFeedFollowers}
            followersLabel={block.content.socialFeedFollowersLabel}
            bio={block.content.socialFeedBio}
            followLabel={block.content.socialFeedFollowLabel}
            aspectRatio={block.content.socialFeedRatio ?? '4/5'}
            posts={block.content.socialFeedPosts ?? []}
            borderRadius={s.borderRadius}
            borderColor={project.theme.borderColor}
            textColor={resolvedTextColor}
            accentColor={project.theme.accentColor}
            showDots={block.content.socialFeedShowDots !== false}
            dotsPosition={block.content.socialFeedDotsPosition ?? 'below'}
            imageZoom={block.content.imageZoom}
          />
        </div>
      );
    }

    if (block.type === 'maps_place') {
      return (
        <div key={block.id} style={style}>
          <MapsPlaceCard
            photoUrl={block.content.mapsPhotoUrl ?? ''}
            photoBadgeLabel={block.content.mapsPhotoBadgeLabel}
            photoRatio={block.content.mapsPhotoRatio}
            title={block.content.mapsTitle ?? 'Nama Lokasi'}
            rating={block.content.mapsRating}
            reviewCount={block.content.mapsReviewCount}
            service={block.content.mapsService}
            accessible={block.content.mapsAccessible}
            servicesList={block.content.mapsServicesList}
            address={block.content.mapsAddress}
            mapsUrl={block.content.mapsUrl}
            buttonLabel={block.content.mapsButtonLabel}
            borderRadius={s.borderRadius}
            textColor={resolvedTextColor}
            borderColor={project.theme.borderColor}
            accentColor={project.theme.accentColor}
            align={s.align}
            imageZoom={block.content.imageZoom}
          />
        </div>
      );
    }

    if (block.type === 'training_catalog') {
      return (
        <div key={block.id} style={style}>
          <TrainingCatalogCard
            content={block.content}
            borderRadius={s.borderRadius}
            cardBg={project.theme.cardBg}
            borderColor={project.theme.borderColor}
            textColor={resolvedTextColor}
            accentColor={project.theme.accentColor}
            align={s.align}
            onTrackWaClick={(label, href, orderVal) =>
              recordPreviewWaClick(label, href, orderVal)
            }
          />
        </div>
      );
    }

    if (block.type === 'hero_profile') {
      const heroChildren = block.children ?? [];
      const heroPos = block.content.heroChildrenPosition ?? 'on_cover';
      const isOnCover =
        (block.content.heroVariant ?? 'compact') === 'banner' &&
        (heroPos === 'on_cover' || heroPos === 'overlap_cover');
      const childInheritedColor = isOnCover ? '#FFFFFF' : resolvedTextColor;
      const heroChildrenSlot =
        heroChildren.length > 0 ? (
          <div className="space-y-1.5">
            {heroChildren.map((ch) => renderPreviewBlock(ch, depth + 1, childInheritedColor))}
          </div>
        ) : undefined;
      return (
        <div key={block.id} style={style}>
          <HeroProfileCard
            block={block}
            theme={project.theme}
            resolvedTextColor={resolvedTextColor}
            childrenSlot={heroChildrenSlot}
          />
        </div>
      );
    }

    if (block.type === 'category_tabs') {
      return (
        <div key={block.id} style={style}>
          <CategoryJumpTabs
            block={block}
            theme={project.theme}
            activeId={activeCategoryTabs[block.id] ?? null}
            onSelect={(catItem: CategoryJumpItem) => {
              setActiveCategoryTabs((prev) => ({ ...prev, [block.id]: catItem.id }));
              jumpToMatchingHeading(catItem.targetTitle || catItem.label);
            }}
          />
        </div>
      );
    }

    if (block.type === 'fnb_catalog') {
      return (
        <div key={block.id} style={style}>
          <FnbCatalogCard
            block={block}
            theme={project.theme}
            cartQtyLookup={fnbCartQtyMap}
            onAddItem={(item: FnbMenuItem) => {
              addToCart(block.id, toCatalogLikeItem(item), '', 1);
            }}
            onIncrementItem={(item: FnbMenuItem) => {
              addToCart(block.id, toCatalogLikeItem(item), '', 1);
            }}
            onDecrementItem={(item: FnbMenuItem) => {
              const targetKey = `${block.id}::${item.id}::`;
              updateCartQty(targetKey, -1);
            }}
          />
        </div>
      );
    }

    if (block.type === 'cart_button') {
      const itemId = `cb_${block.id}`;
      const qty = fnbCartQtyMap[itemId] ?? 0;
      const accent = block.content.cartAccentColor || project.theme.accentColor;
      const showInfo = block.content.cartShowProductInfo !== false;
      const prodName = block.content.cartProductName?.trim() || 'Produk Pilihan';
      const prodDesc = block.content.cartProductDesc?.trim() || '';
      const prodPrice = block.content.cartProductPrice?.trim() || 'Rp 0';
      const btnLabel = block.content.cartButtonLabel?.trim() || 'Tambah';
      const cartItemObj: CatalogItem = {
        id: itemId,
        title: prodName,
        subtitle: prodDesc,
        description: prodDesc,
        price: prodPrice,
        ctaLabel: btnLabel,
        url: '',
        image: block.content.cartProductImage || '',
        unitSold: 0,
      };
      return (
        <div key={block.id} style={style}>
          <div className="flex items-center justify-between gap-2.5 text-left">
            {showInfo && (
              <div className="flex items-center gap-2.5 min-w-0 flex-1">
                {block.content.cartProductImage && (
                  <img
                    src={block.content.cartProductImage}
                    alt={prodName}
                    referrerPolicy="no-referrer"
                    className="w-11 h-11 rounded-lg object-cover shrink-0 border border-slate-200/70"
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold leading-snug truncate">{prodName}</div>
                  {prodDesc && (
                    <div className="text-[10.5px] opacity-70 leading-snug line-clamp-2">
                      {prodDesc}
                    </div>
                  )}
                  <div
                    style={{ color: accent }}
                    className="text-xs font-extrabold tabular-nums mt-0.5"
                  >
                    {prodPrice}
                  </div>
                </div>
              </div>
            )}
            <div className={`shrink-0 flex items-center ${!showInfo ? 'w-full justify-center' : ''}`}>
              {qty > 0 ? (
                <div
                  style={{ borderColor: accent }}
                  className="inline-flex items-center gap-1.5 rounded-full border bg-white px-1.5 py-1 shadow-xs"
                >
                  <button
                    type="button"
                    onClick={() => updateCartQty(`${block.id}::${itemId}::`, -1)}
                    className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 text-slate-800 flex items-center justify-center cursor-pointer"
                    aria-label="Kurangi"
                  >
                    <Minus className="w-3 h-3" />
                  </button>
                  <span className="text-xs font-bold text-slate-900 min-w-[18px] text-center tabular-nums">
                    {qty}
                  </span>
                  <button
                    type="button"
                    onClick={() => addToCart(block.id, cartItemObj, '', 1)}
                    style={{ backgroundColor: accent }}
                    className="w-6 h-6 rounded-full text-white flex items-center justify-center cursor-pointer"
                    aria-label="Tambah"
                  >
                    <Plus className="w-3 h-3" />
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={() => addToCart(block.id, cartItemObj, '', 1)}
                  style={{ backgroundColor: accent }}
                  className={`inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-full text-white text-xs font-bold shadow-xs cursor-pointer hover:opacity-95 ${
                    !showInfo ? 'w-full' : ''
                  }`}
                >
                  <ShoppingCart className="w-3.5 h-3.5 shrink-0" />
                  <span>{btnLabel}</span>
                </button>
              )}
            </div>
          </div>
        </div>
      );
    }

    if (block.type === 'showcase_card') {
      const cardItemId = `sc_${block.id}`;
      const cardQty = fnbCartQtyMap[cardItemId] ?? 0;
      const cardVariant = block.content.cardVariant ?? 'news_banner';
      const cardItemObj: CatalogItem = {
        id: cardItemId,
        title: block.content.cardTitle?.trim() || 'Produk Store',
        subtitle: block.content.cardSubtitle?.trim() || '',
        description: block.content.cardSubtitle?.trim() || '',
        price: block.content.cardPrice?.trim() || 'Rp 0',
        ctaLabel: 'Tambah',
        url: block.content.cardActionUrl || '',
        image: block.content.cardImage || '',
        unitSold: 0,
      };
      const bodyChildren = block.children ?? [];
      const footerChildren = block.content.cardFooterBlocks ?? [];
      const bodyZoneTextColor =
        cardVariant === 'membership_ticket' || cardVariant === 'activity_post'
          ? project.theme.textColor
          : block.content.cardTextColor || '#FFFFFF';
      const footerZoneTextColor = block.content.cardTextColor || '#FFFFFF';

      const bodySlotNode =
        bodyChildren.length > 0 ? (
          <div className="w-full space-y-1.5">
            {bodyChildren.map((ch) => renderPreviewBlock(ch, depth + 1, bodyZoneTextColor))}
          </div>
        ) : undefined;
      const footerSlotNode =
        footerChildren.length > 0 ? (
          <div className="w-full space-y-1.5">
            {footerChildren.map((ch) => renderPreviewBlock(ch, depth + 1, footerZoneTextColor))}
          </div>
        ) : undefined;

      return (
        <div key={block.id} style={style}>
          <ShowcaseCardView
            content={block.content}
            theme={project.theme}
            borderRadius={s.borderRadius}
            blockStyle={s}
            cartQty={cardQty}
            onAddCart={() => addToCart(block.id, cardItemObj, '', 1)}
            onIncCart={() => addToCart(block.id, cardItemObj, '', 1)}
            onDecCart={() => updateCartQty(`${block.id}::${cardItemId}::`, -1)}
            bodySlot={bodySlotNode}
            footerSlot={footerSlotNode}
          />
        </div>
      );
    }

    if (block.type === 'back_button') {
      const backRadius = Math.max(0, Math.min(9999, Math.round(s.borderRadius ?? 12)));
      const backFontSize = Math.max(11, Math.min(24, Math.round(s.fontSize ?? 13)));
      const backIconId = block.content.backButtonIcon ?? 'arrow-left';
      const backTextColor = block.content.backButtonText || '#0F172A';
      const backIconColor = block.content.backButtonIconColor || backTextColor;
      const backBorderWidth = s.borderWidth > 0 ? s.borderWidth : 1;
      const backBorderStyle = s.borderStyle ?? 'solid';
      const backBorderColor = s.borderWidth > 0 ? s.borderColor : 'rgba(15, 23, 42, 0.1)';
      const padTop = s.paddingTop ?? Math.max(6, Math.min(24, s.padding || 8));
      const padBottom = s.paddingBottom ?? Math.max(6, Math.min(24, s.padding || 8));
      const padLeft = s.paddingLeft ?? s.paddingX ?? 14;
      const padRight = s.paddingRight ?? s.paddingX ?? 14;
      return (
        <div
          key={block.id}
          style={{
            ...style,
            display: 'flex',
            justifyContent:
              s.align === 'center' ? 'center' : s.align === 'right' ? 'flex-end' : 'flex-start',
          }}
        >
          <button
            type="button"
            onClick={() => goBackPage(block.content.backTargetPageId)}
            style={{
              backgroundColor: block.content.backButtonBg || '#F1F5F9',
              color: backTextColor,
              borderRadius: `${backRadius}px`,
              fontSize: `${backFontSize}px`,
              padding: `${padTop}px ${padRight}px ${padBottom}px ${padLeft}px`,
              borderWidth: backBorderStyle === 'none' ? 0 : `${backBorderWidth}px`,
              borderStyle: backBorderStyle,
              borderColor: backBorderColor,
            }}
            className="inline-flex items-center gap-1.5 font-bold shadow-xs cursor-pointer hover:opacity-90"
          >
            {(backIconId !== 'none' || Boolean(block.content.buttonIconUrl)) && (
              <span style={{ color: backIconColor }} className="inline-flex shrink-0">
                <ButtonGlyph
                  icon={backIconId}
                  iconUrl={block.content.buttonIconUrl}
                  className="shrink-0"
                  style={{ width: `${Math.max(12, backFontSize)}px`, height: `${Math.max(12, backFontSize)}px` }}
                />
              </span>
            )}
            <span>{block.content.backButtonLabel || 'Kembali'}</span>
          </button>
        </div>
      );
    }

    return null;
  };

  const detailContext = useMemo(() => {
    if (subPage.type !== 'detail') return null;
    const blk = findBlockById(project.blocks, subPage.blockId, bottomNavbar.items, projectPages);
    const item = blk?.content.catalogItems?.find((it) => it.id === subPage.itemId);
    if (!blk || !item) return null;
    return { block: blk, item };
  }, [project.blocks, bottomNavbar.items, projectPages, subPage]);

  const activeCartBlock = useMemo(() => {
    const refBlockId =
      (subPage.type === 'cart' ? subPage.blockId : undefined) ?? cart[0]?.blockId;
    if (refBlockId) {
      const found = findBlockById(project.blocks, refBlockId, bottomNavbar.items, projectPages);
      if (found) return found;
    }
    return firstCatalog;
  }, [subPage, cart, project.blocks, bottomNavbar.items, projectPages, firstCatalog]);

  const activeWaPhone = activeCartBlock?.content.catalogWhatsappNumber;
  const activeStoreName =
    activeCartBlock?.content.catalogStoreName?.trim() || project.title;
  const activeWaIntro = activeCartBlock?.content.catalogWhatsappIntro;
  const activeAskCustomerInfo = activeCartBlock?.content.catalogAskCustomerInfo ?? true;
  const activeShippingEnabled = activeCartBlock?.content.catalogShippingEnabled ?? true;
  const resolvedShippingOptions = useMemo(
    () => resolveCatalogShippingOptions(activeCartBlock?.content),
    [activeCartBlock]
  );
  const enabledShippingOptions = useMemo(
    () => resolvedShippingOptions.filter((opt) => opt.enabled !== false),
    [resolvedShippingOptions]
  );
  const activeSelectedShipIdx = useMemo(() => {
    const idx = enabledShippingOptions.findIndex(
      (o) => o.id === (customer.shippingMethod ?? 'makan_ditempat')
    );
    return idx >= 0 ? idx : 0;
  }, [enabledShippingOptions, customer.shippingMethod]);
  const activeSelectedShipOpt = enabledShippingOptions[activeSelectedShipIdx];

  const activeCustomerFields = useMemo(
    () => resolveCatalogCustomerFields(activeCartBlock?.content),
    [activeCartBlock]
  );

  const hasPhysicalItemInCart = useMemo(
    () => cart.some((entry) => isPhysicalProductType(entry.productType)),
    [cart]
  );
  const shouldShowChoices =
    activeShippingEnabled && hasPhysicalItemInCart && enabledShippingOptions.length > 0;
  const combinedPickupNote = useMemo(
    () => collectCartPickupNotes(cart).join('; '),
    [cart]
  );

  const cartStoreGroups = useMemo(() => {
    if (cart.length === 0) return [];
    const groupsMap = new Map<
      string,
      {
        normalizedPhone: string;
        rawPhone?: string;
        storeName: string;
        intro?: string;
        askCustomerInfo: boolean;
        customerFields: ReturnType<typeof resolveCatalogCustomerFields>;
        shippingEnabled: boolean;
        shippingOptions: CatalogShippingOptionConfig[];
        shippingNote: string;
        pickupNote?: string;
        entries: CartEntry[];
      }
    >();

    for (const entry of cart) {
      const blk = findBlockById(project.blocks, entry.blockId, bottomNavbar.items, projectPages) ?? firstCatalog;
      const rawPhone =
        blk?.content.catalogWhatsappNumber ||
        blk?.content.cartWhatsappNumber ||
        blk?.content.cardWhatsappNumber ||
        blk?.content.universalCartWhatsappNumber;
      const normalizedPhone = normalizeWhatsappNumber(rawPhone);
      const existing = groupsMap.get(normalizedPhone);
      if (existing) {
        existing.entries.push(entry);
      } else {
        groupsMap.set(normalizedPhone, {
          normalizedPhone,
          rawPhone,
          storeName:
            blk?.content.catalogStoreName?.trim() ||
            blk?.content.cartStoreName?.trim() ||
            blk?.content.universalCartStoreName?.trim() ||
            project.title,
          intro: blk?.content.catalogWhatsappIntro,
          askCustomerInfo: blk?.content.catalogAskCustomerInfo ?? true,
          customerFields: resolveCatalogCustomerFields(blk?.content),
          shippingEnabled: blk?.content.catalogShippingEnabled ?? true,
          shippingOptions: resolveCatalogShippingOptions(blk?.content),
          shippingNote: blk?.content.catalogShippingNote?.trim() || DEFAULT_SHIPPING_NOTE,
          pickupNote: blk?.content.catalogPickupNote,
          entries: [entry],
        });
      }
    }

    return Array.from(groupsMap.values()).map((grp) => {
      const hasPhysical = grp.entries.some((e) => isPhysicalProductType(e.productType));
      const grpEnabledOpts = grp.shippingOptions.filter((o) => o.enabled !== false);
      const showChoices = grp.shippingEnabled && hasPhysical && grpEnabledOpts.length > 0;
      const selIdxRaw = grpEnabledOpts.findIndex(
        (o) => o.id === (customer.shippingMethod ?? 'makan_ditempat')
      );
      const selIdx = selIdxRaw >= 0 ? selIdxRaw : 0;
      const selOpt = grpEnabledOpts[selIdx];
      const grpPickupNote = collectCartPickupNotes(grp.entries).join('; ');
      const optChecklists = selOpt ? resolveShippingOptionChecklistItems(selOpt) : [];
      const checkedChecklistItems = optChecklists.filter((_, idx) =>
        Boolean(checklistCheckedMap[idx])
      );
      const customFieldsPayload = grp.customerFields.map((cf) => ({
        label: cf.label,
        value: customFieldValues[cf.id] ?? '',
      }));

      const customerPayload: Partial<CustomerOrderInfo> | undefined =
        grp.askCustomerInfo || showChoices
          ? {
              ...(grp.askCustomerInfo
                ? {
                    name: customer.name,
                    phone: customer.phone,
                    address: customer.address,
                    notes: customer.notes,
                    customFields: customFieldsPayload,
                  }
                : {}),
              ...(showChoices && selOpt
                ? {
                    shippingMethod: selOpt.id,
                    shippingOptionNumber: selIdx + 1,
                    shippingOptionLabel: selOpt.label,
                    arrivalTimeLabel: selOpt.askArrivalTime
                      ? selOpt.arrivalTimeLabel || 'Waktu'
                      : undefined,
                    arrivalTime: selOpt.askArrivalTime ? customer.arrivalTime : undefined,
                    guestCountLabel: selOpt.askGuestCount
                      ? selOpt.guestCountLabel || 'Jumlah Orang'
                      : undefined,
                    guestCount: selOpt.askGuestCount ? customer.guestCount : undefined,
                    checklistConfirmed: selOpt.checklistEnabled
                      ? checkedChecklistItems.length > 0
                      : undefined,
                    checklistText: selOpt.checklistEnabled ? optChecklists[0] : undefined,
                    checklistCheckedItems: selOpt.checklistEnabled
                      ? checkedChecklistItems
                      : undefined,
                    pickupNote:
                      selOpt.id === 'ambil_sendiri' ? grpPickupNote || undefined : undefined,
                    shippingNoteTitle: selOpt.noteTitle || 'Catatan:',
                    shippingNote: selOpt.noteText?.trim() || undefined,
                  }
                : {}),
            }
          : undefined;
      return {
        ...grp,
        waUrl: buildWhatsappOrderUrl({
          phone: grp.rawPhone,
          storeName: grp.storeName,
          intro: grp.intro,
          items: grp.entries,
          customer: customerPayload,
        }),
      };
    });
  }, [
    cart,
    project.blocks,
    bottomNavbar.items,
    project.title,
    firstCatalog,
    customer,
    customFieldValues,
    checklistCheckedMap,
  ]);

  const cartWaUrl = cartStoreGroups[0]?.waUrl ?? '#';

  const isWidePreview = previewSize.width >= 576;
  const containerPaddingClass = 'px-4';

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-slate-950/60 backdrop-blur-xs flex items-center justify-center p-2 sm:p-4"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ width: `min(${previewSize.width}px, 96vw)`, height: `min(${previewSize.height}px, 90vh)` }}
        className={`flex flex-col bg-white shadow-2xl border border-slate-200 transition-all relative ${
          isWidePreview ? 'rounded-2xl' : 'rounded-3xl'
        }`}
      >
        <div className="px-3 sm:px-4 py-2 border-b border-slate-200 flex items-center justify-between gap-2 bg-slate-50 shrink-0 flex-wrap rounded-t-[inherit] relative z-20">
          <div className="flex items-center gap-2 min-w-0">
            {subPage.type !== 'home' && (
              <button
                type="button"
                onClick={() => {
                  setSubPage({ type: 'home' });
                  scrollToTop();
                }}
                className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-white border border-slate-200 text-[11px] font-semibold text-slate-700 hover:bg-slate-100 cursor-pointer shrink-0"
              >
                <ArrowLeft className="w-3 h-3" />
                <span>Halaman Utama</span>
              </button>
            )}
            <div className="text-xs font-bold text-slate-700 truncate">
              {subPage.type === 'detail'
                ? 'Detail Produk'
                : subPage.type === 'cart'
                ? 'Keranjang WA'
                : `Pratinjau · ${project.title}`}
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
            {hasCartFeature && (
              <button
                type="button"
                onClick={() => openCartPage()}
                title="Buka Keranjang Belanja"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold cursor-pointer transition-colors"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span className="tabular-nums">{totalCartCount}</span>
              </button>
            )}

            <div className="inline-flex items-center gap-1 bg-slate-100 border border-slate-200 rounded-lg p-0.5">
              {(
                [
                  { id: 'mobile-440', bp: 'mobile' as const, label: 'Mobile 440' },
                  { id: 'tablet-768', bp: 'tablet' as const, label: 'Tablet 768' },
                  { id: 'desktop-1024', bp: 'desktop' as const, label: 'Desktop 1024' },
                ] as const
              ).map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => {
                    setSelectedDeviceId(preset.id);
                    setRotated(false);
                    setPreviewSize({
                      width: VIEWPORT_PRESET_WIDTHS[preset.bp],
                      height: VIEWPORT_PRESET_HEIGHTS[preset.bp],
                    });
                  }}
                  className={`px-2 py-1 rounded-md text-[11px] font-semibold transition-colors cursor-pointer whitespace-nowrap ${
                    activePreviewBreakpoint === preset.bp
                      ? 'bg-[#17243D] text-white'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>

            <DeviceViewportSelector
              selectedDeviceId={selectedDeviceId}
              width={previewSize.width}
              height={previewSize.height}
              rotated={rotated}
              customDevices={customDevices}
              onSelectDevice={(dev) => {
                setSelectedDeviceId(dev.id);
                setRotated(false);
                setPreviewSize({ width: dev.width, height: dev.height });
              }}
              onChangeDimensions={(w, h) => {
                setSelectedDeviceId('responsive');
                setPreviewSize({ width: w, height: h });
              }}
              onToggleRotate={() => {
                setRotated((prev) => !prev);
                setPreviewSize((prev) => ({ width: prev.height, height: prev.width }));
              }}
              onAddCustomDevice={(dev) => setCustomDevices((prev) => [...prev, dev])}
              compact
              menuAlign="right"
            />

            <button
              type="button"
              onClick={onClose}
              className="p-1 rounded-lg hover:bg-slate-200 text-slate-500 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        <div className="flex-1 min-h-0 relative overflow-hidden flex flex-col rounded-b-[inherit]">
          <div
            ref={scrollBodyRef}
            onClickCapture={(e) => {
              const target = e.target as HTMLElement | null;
              const anchor = target?.closest?.('a[href]') as HTMLAnchorElement | null;
              if (!anchor) return;
              const href = anchor.getAttribute('href') || '';
              if (!isWhatsappHref(href)) return;
              if (anchor.dataset.waTracked === '1') return;
              const label =
                anchor.getAttribute('data-wa-label') ||
                anchor.textContent?.trim().slice(0, 60) ||
                'Tombol WhatsApp';
              recordPreviewWaClick(label, href);
            }}
            className="flex-1 overflow-y-auto relative"
          style={{
            backgroundColor: project.theme.canvasBg,
            color: project.theme.textColor,
            fontFamily: resolveCssFontFamily(project.theme.fontFamily),
            paddingTop: `${
              project.advanceOptions.pageTopPadding ??
              (project.blocks[0]?.style.fullBleed ? 0 : 12)
            }px`,
            paddingBottom:
              bottomNavbar.enabled && enabledNavItems.length > 0
                ? `${(() => {
                    const nm = resolveNavbarMetrics(bottomNavbar);
                    return (
                      nm.bottomOffset +
                      nm.barPaddingY * 2 +
                      nm.iconSize +
                      nm.labelSize +
                      36
                    );
                  })()}px`
                : isWidePreview
                ? '32px'
                : '24px',
          }}
        >
          {subPage.type === 'home' &&
            floatingCartConfig &&
            isTopFloatingCartPosition(floatingCartConfig.position) &&
            totalCartCount > 0 && (
              <FnbFloatingCartCapsule
                count={totalCartCount}
                totalAmount={totalCartAmount}
                position={floatingCartConfig.position}
                offsetY={floatingCartConfig.offsetY}
                bgColor={floatingCartConfig.bgColor}
                actionLabel={floatingCartConfig.actionLabel}
                onClick={() => openCartPage()}
              />
            )}

          {subPage.type === 'home' && (
            <div
              className={`app-container w-full mx-auto box-border ${
                previewSize.width >= 768 ? 'max-w-full' : 'max-w-[576px]'
              } ${totalCartCount > 0 && hasCartFeature ? 'pb-16' : ''}`}
            >
              {currentCustomPage && currentCustomPage.showBackButton !== false && (
                <div className="px-4 py-2.5 mb-2 border-b border-black/10 flex items-center justify-between gap-2 bg-white/85 backdrop-blur-xs sticky top-0 z-10">
                  <button
                    type="button"
                    onClick={() => goBackPage()}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-[#0F172A] text-xs font-bold cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>{currentCustomPage.backButtonLabel || 'Kembali'}</span>
                  </button>
                  <span className="text-xs font-bold truncate opacity-80">
                    {currentCustomPage.title}
                  </span>
                </div>
              )}
              {(currentCustomPage ? currentCustomPage.blocks : project.blocks).map((block) => (
                <div
                  key={block.id}
                  className={
                    block.style.fullBleed
                      ? 'w-full px-0'
                      : containerPaddingClass
                  }
                >
                  {renderPreviewBlock(block, 0)}
                </div>
              ))}
            </div>
          )}

          {subPage.type === 'home' &&
            floatingCartConfig &&
            !isTopFloatingCartPosition(floatingCartConfig.position) &&
            totalCartCount > 0 && (
              <FnbFloatingCartCapsule
                count={totalCartCount}
                totalAmount={totalCartAmount}
                position={floatingCartConfig.position}
                offsetY={floatingCartConfig.offsetY}
                bgColor={floatingCartConfig.bgColor}
                actionLabel={floatingCartConfig.actionLabel}
                onClick={() => openCartPage()}
              />
            )}

          {subPage.type === 'detail' && detailContext && (() => {
            const { block, item } = detailContext;
            const cartEnabled = block.content.catalogCartEnabled ?? true;
            const variants = parseVariants(item.variants);
            const activeVariant =
              variants.includes(detailVariant) ? detailVariant : variants[0] ?? '';
            const photos = [item.image, ...(item.gallery ?? [])].filter(Boolean);
            const safePhotoIdx = Math.min(detailPhotoIdx, Math.max(0, photos.length - 1));
            const blockProductType = block.content.catalogProductType ?? 'physical';
            const singleEntry = createCartEntry(
              block.id,
              item,
              activeVariant,
              detailQty,
              blockProductType
            );
            const directWaUrl = buildWhatsappOrderUrl({
              phone: block.content.catalogWhatsappNumber,
              storeName: block.content.catalogStoreName?.trim() || project.title,
              intro: block.content.catalogWhatsappIntro,
              items: [singleEntry],
            });

            return (
              <div className={`app-container w-full max-w-[576px] mx-auto box-border ${containerPaddingClass} ${totalCartCount > 0 && cartEnabled ? 'pb-20' : 'pb-6'} space-y-4`}>
                <div className="flex items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      setSubPage({ type: 'home' });
                      scrollToTop();
                    }}
                    style={{
                      backgroundColor: project.theme.cardBg,
                      borderColor: project.theme.borderColor,
                      color: project.theme.textColor,
                    }}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer hover:opacity-90"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Kembali</span>
                  </button>

                  {cartEnabled && (
                    <button
                      type="button"
                      onClick={() => openCartPage(block.id)}
                      style={{
                        backgroundColor: project.theme.cardBg,
                        borderColor: project.theme.borderColor,
                        color: project.theme.textColor,
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer hover:opacity-90"
                    >
                      <ShoppingCart className="w-3.5 h-3.5" />
                      <span>Keranjang ({totalCartCount})</span>
                    </button>
                  )}
                </div>

                {/* Product Photo & Gallery */}
                <div
                  style={{
                    backgroundColor: project.theme.cardBg,
                    borderColor: project.theme.borderColor,
                  }}
                  className="rounded-2xl border overflow-hidden"
                >
                  <div className="relative bg-slate-100">
                    {item.badge?.trim() && (
                      <span
                        className="absolute top-3 left-3 z-10 px-2.5 py-1 rounded-lg text-[11px] font-bold text-white shadow-xs"
                        style={{ backgroundColor: project.theme.accentColor }}
                      >
                        {item.badge.trim()}
                      </span>
                    )}
                    <img
                      src={photos[safePhotoIdx] || item.image}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="w-full aspect-4/3 object-cover block"
                    />
                  </div>
                  {photos.length > 1 && (
                    <div className="p-2.5 flex items-center gap-2 overflow-x-auto border-t" style={{ borderColor: project.theme.borderColor }}>
                      {photos.map((pSrc, pIdx) => (
                        <button
                          key={`${item.id}_p_${pIdx}`}
                          type="button"
                          onClick={() => setDetailPhotoIdx(pIdx)}
                          style={{
                            borderColor:
                              pIdx === safePhotoIdx
                                ? project.theme.accentColor
                                : project.theme.borderColor,
                          }}
                          className={`w-14 h-14 rounded-lg overflow-hidden border-2 shrink-0 cursor-pointer transition-opacity ${
                            pIdx === safePhotoIdx ? 'opacity-100' : 'opacity-65 hover:opacity-100'
                          }`}
                        >
                          <img src={pSrc} alt="" className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Product Info */}
                <div
                  style={{
                    backgroundColor: project.theme.cardBg,
                    borderColor: project.theme.borderColor,
                  }}
                  className="rounded-2xl border p-4 space-y-3.5"
                >
                  <div>
                    <h2 className="text-lg font-bold leading-snug">{item.title}</h2>
                    {item.subtitle && (
                      <p className="text-xs opacity-75 mt-1">{item.subtitle}</p>
                    )}
                    <div className="flex items-baseline gap-2 mt-2">
                      <span
                        className="text-lg font-bold tabular-nums"
                        style={{ color: project.theme.accentColor }}
                      >
                        {item.price}
                      </span>
                      {project.advanceOptions.showUnitSold && (
                        <span className="text-xs opacity-65 tabular-nums">
                          · {item.unitSold} terjual
                        </span>
                      )}
                    </div>
                  </div>

                  {variants.length > 0 && (
                    <div className="space-y-1.5 pt-2 border-t" style={{ borderColor: project.theme.borderColor }}>
                      <div className="text-xs font-semibold opacity-80">Pilih Varian:</div>
                      <div className="flex flex-wrap gap-1.5">
                        {variants.map((v) => {
                          const selected = v === activeVariant;
                          return (
                            <button
                              key={v}
                              type="button"
                              onClick={() => setDetailVariant(v)}
                              style={
                                selected
                                  ? {
                                      backgroundColor: project.theme.accentColor,
                                      borderColor: project.theme.accentColor,
                                      color: '#FFFFFF',
                                    }
                                  : {
                                      backgroundColor: 'transparent',
                                      borderColor: project.theme.borderColor,
                                      color: project.theme.textColor,
                                    }
                              }
                              className="px-3 py-1.5 rounded-lg border text-xs font-semibold cursor-pointer transition-colors"
                            >
                              {v}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {cartEnabled && (
                    <div className="flex items-center justify-between pt-2 border-t" style={{ borderColor: project.theme.borderColor }}>
                      <span className="text-xs font-semibold opacity-80">Jumlah</span>
                      <div className="inline-flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => setDetailQty((q) => Math.max(1, q - 1))}
                          style={{ borderColor: project.theme.borderColor }}
                          className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer hover:opacity-80"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="w-8 text-center text-sm font-bold tabular-nums">
                          {detailQty}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDetailQty((q) => q + 1)}
                          style={{ borderColor: project.theme.borderColor }}
                          className="w-8 h-8 rounded-lg border flex items-center justify-center cursor-pointer hover:opacity-80"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}

                  {item.description?.trim() && (
                    <div className="pt-2 border-t space-y-1" style={{ borderColor: project.theme.borderColor }}>
                      <div className="text-xs font-semibold opacity-80">Deskripsi Produk</div>
                      <div className="text-xs leading-relaxed opacity-90 whitespace-pre-line">
                        {item.description}
                      </div>
                    </div>
                  )}

                  <div className="pt-2 space-y-2">
                    {cartEnabled && (
                      <>
                        <button
                          type="button"
                          onClick={() => addToCart(block.id, item, activeVariant, detailQty)}
                          style={{ backgroundColor: project.theme.accentColor }}
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white flex items-center justify-center gap-2 cursor-pointer hover:opacity-95"
                        >
                          <ShoppingCart className="w-4 h-4" />
                          <span>Tambah ke Keranjang</span>
                        </button>
                        <a
                          href={directWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-wa-tracked="1"
                          onClick={() =>
                            recordPreviewWaClick(
                              `Pesan Langsung: ${item.title} x${detailQty}`,
                              directWaUrl,
                              singleEntry.unitPrice * detailQty
                            )
                          }
                          className="w-full py-2.5 px-4 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 flex items-center justify-center gap-2 transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Pesan Langsung via WhatsApp</span>
                        </a>
                      </>
                    )}

                    {item.url && !item.url.startsWith('https://example.com') && sanitizeExternalUrl(item.url, '') && (
                      <a
                        href={sanitizeExternalUrl(item.url, '#')}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          borderColor: project.theme.borderColor,
                          color: project.theme.textColor,
                        }}
                        className="w-full py-2.5 px-4 rounded-xl border text-xs font-semibold flex items-center justify-center gap-1.5 hover:opacity-85"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                        <span>{cartEnabled ? 'Kunjungi Tautan Produk' : item.ctaLabel || 'Buka Tautan'}</span>
                      </a>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {subPage.type === 'cart' && (
            <div className={`app-container w-full max-w-[576px] mx-auto box-border ${containerPaddingClass} pb-8 space-y-4`}>
              <div className="flex items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setSubPage({ type: 'home' });
                    scrollToTop();
                  }}
                  style={{
                    backgroundColor: project.theme.cardBg,
                    borderColor: project.theme.borderColor,
                    color: project.theme.textColor,
                  }}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold cursor-pointer hover:opacity-90"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>Kembali</span>
                </button>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-semibold text-red-600 hover:bg-red-500/10 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Kosongkan</span>
                  </button>
                )}
              </div>

              {cart.length === 0 ? (
                <div
                  style={{
                    backgroundColor: project.theme.cardBg,
                    borderColor: project.theme.borderColor,
                  }}
                  className="rounded-2xl border p-8 text-center space-y-3"
                >
                  <div className="w-12 h-12 rounded-2xl mx-auto flex items-center justify-center bg-slate-500/10">
                    <ShoppingBag className="w-6 h-6 opacity-60" />
                  </div>
                  <div className="text-sm font-bold">Keranjang masih kosong</div>
                  <p className="text-xs opacity-70">
                    Pilih produk dari katalog terlebih dahulu untuk memesan via WhatsApp.
                  </p>
                  <button
                    type="button"
                    onClick={() => setSubPage({ type: 'home' })}
                    style={{ backgroundColor: project.theme.accentColor }}
                    className="px-4 py-2 rounded-xl text-xs font-semibold text-white cursor-pointer hover:opacity-95"
                  >
                    Lihat Katalog Produk
                  </button>
                </div>
              ) : (
                <>
                  {/* Daftar Item Keranjang */}
                  <div
                    style={{
                      backgroundColor: project.theme.cardBg,
                      borderColor: project.theme.borderColor,
                    }}
                    className="rounded-2xl border divide-y"
                  >
                    {cart.map((entry) => (
                      <div
                        key={entry.key}
                        style={{ borderColor: project.theme.borderColor }}
                        className="p-3 flex items-start gap-3"
                      >
                        <img
                          src={entry.image}
                          alt={entry.title}
                          referrerPolicy="no-referrer"
                          className="w-14 h-14 rounded-xl object-cover bg-slate-100 shrink-0"
                        />
                        <div className="min-w-0 flex-1 space-y-1">
                          <div className="flex items-start justify-between gap-2">
                            <div className="min-w-0">
                              <div className="text-xs font-bold leading-snug">{entry.title}</div>
                              {entry.variant && (
                                <div className="text-[11px] opacity-70">
                                  Varian: {entry.variant}
                                </div>
                              )}
                            </div>
                            <button
                              type="button"
                              onClick={() => removeFromCart(entry.key)}
                              title="Hapus item"
                              className="p-1 rounded-md text-slate-400 hover:text-red-500 cursor-pointer shrink-0"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <div className="flex items-center justify-between gap-2 pt-1">
                            <div
                              className="text-xs font-bold tabular-nums"
                              style={{ color: project.theme.accentColor }}
                            >
                              {entry.unitPrice > 0
                                ? formatRupiah(entry.unitPrice * entry.qty)
                                : entry.priceText}
                            </div>

                            <div className="inline-flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => updateCartQty(entry.key, -1)}
                                style={{ borderColor: project.theme.borderColor }}
                                className="w-6 h-6 rounded-md border flex items-center justify-center cursor-pointer"
                              >
                                <Minus className="w-3 h-3" />
                              </button>
                              <span className="w-6 text-center text-xs font-bold tabular-nums">
                                {entry.qty}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateCartQty(entry.key, 1)}
                                style={{ borderColor: project.theme.borderColor }}
                                className="w-6 h-6 rounded-md border flex items-center justify-center cursor-pointer"
                              >
                                <Plus className="w-3 h-3" />
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Form Data Pembeli Dinamis */}
                  {activeAskCustomerInfo && activeCustomerFields.length > 0 && (
                    <div
                      style={{
                        backgroundColor: project.theme.cardBg,
                        borderColor: project.theme.borderColor,
                      }}
                      className="rounded-2xl border p-4 space-y-2.5"
                    >
                      <div className="text-xs font-bold">Data Pemesan</div>
                      {activeCustomerFields.map((field) => (
                        <div key={field.id} className="space-y-1">
                          <label className="block text-[11px] font-semibold opacity-80">
                            {field.label}
                            {field.required ? ' *' : ''}
                          </label>
                          {field.type === 'textarea' ? (
                            <textarea
                              rows={2}
                              value={customFieldValues[field.id] ?? ''}
                              placeholder={field.placeholder || field.label}
                              onChange={(e) =>
                                setCustomFieldValues((prev) => ({
                                  ...prev,
                                  [field.id]: e.target.value,
                                }))
                              }
                              style={{ borderColor: project.theme.borderColor }}
                              className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs outline-none resize-none"
                            />
                          ) : (
                            <input
                              type={field.type}
                              value={customFieldValues[field.id] ?? ''}
                              placeholder={field.placeholder || field.label}
                              onChange={(e) =>
                                setCustomFieldValues((prev) => ({
                                  ...prev,
                                  [field.id]: e.target.value,
                                }))
                              }
                              style={{ borderColor: project.theme.borderColor }}
                              className="w-full px-3 py-2 rounded-xl border bg-transparent text-xs outline-none"
                            />
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Pilihan (Khusus Produk Fisik) */}
                  {shouldShowChoices && (
                    <div
                      style={{
                        backgroundColor: project.theme.cardBg,
                        borderColor: project.theme.borderColor,
                      }}
                      className="rounded-2xl border p-4 space-y-3"
                    >
                      <div className="text-xs font-bold">Pilihan</div>
                      <div className="space-y-2">
                        {enabledShippingOptions.map((opt, idx) => {
                          const isSelected = activeSelectedShipOpt?.id === opt.id;
                          const optChecklists = resolveShippingOptionChecklistItems(opt);
                          const selectOption = () => {
                            if (activeSelectedShipOpt?.id !== opt.id) {
                              setChecklistCheckedMap({});
                            }
                            setCustomer((prev) => ({
                              ...prev,
                              shippingMethod: opt.id as ShippingMethodId,
                              checklistConfirmed:
                                activeSelectedShipOpt?.id === opt.id
                                  ? prev.checklistConfirmed
                                  : false,
                            }));
                          };
                          const hasExtraInputs = Boolean(
                            opt.askArrivalTime || opt.askGuestCount
                          );

                          return (
                            <div
                              key={opt.id}
                              style={
                                isSelected
                                  ? {
                                      borderColor: project.theme.accentColor,
                                      backgroundColor: `${project.theme.accentColor}12`,
                                    }
                                  : { borderColor: project.theme.borderColor }
                              }
                              className="rounded-xl border transition-colors overflow-hidden"
                            >
                              <label
                                onClick={selectOption}
                                className="flex items-start gap-2.5 p-2.5 cursor-pointer"
                              >
                                <input
                                  type="radio"
                                  name="lynk_shipping_method"
                                  checked={isSelected}
                                  onChange={selectOption}
                                  className="mt-0.5 shrink-0 cursor-pointer"
                                />
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs font-semibold leading-snug">
                                    {idx + 1}. {opt.label}
                                  </div>
                                </div>
                              </label>

                              {isSelected &&
                                (hasExtraInputs ||
                                  (opt.checklistEnabled && optChecklists.length > 0) ||
                                  (opt.id === 'ambil_sendiri' && combinedPickupNote)) && (
                                  <div className="px-3 pb-3 pt-0.5 space-y-2">
                                    {hasExtraInputs && (
                                      <div
                                        className={`grid gap-2 ${
                                          opt.askArrivalTime && opt.askGuestCount
                                            ? 'grid-cols-2'
                                            : 'grid-cols-1'
                                        }`}
                                      >
                                        {opt.askArrivalTime && (
                                          <div>
                                            <label className="block text-[11px] font-semibold opacity-80 mb-1">
                                              {opt.arrivalTimeLabel || 'Waktu'}
                                              {opt.arrivalTimeRequired ? ' *' : ''}
                                            </label>
                                            <input
                                              type="text"
                                              value={customer.arrivalTime ?? ''}
                                              placeholder={
                                                opt.arrivalTimePlaceholder || 'Contoh: 18:30 WIB'
                                              }
                                              onChange={(e) =>
                                                setCustomer((prev) => ({
                                                  ...prev,
                                                  arrivalTime: e.target.value,
                                                }))
                                              }
                                              style={{
                                                borderColor: project.theme.borderColor,
                                                backgroundColor: project.theme.cardBg,
                                              }}
                                              className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none"
                                            />
                                          </div>
                                        )}
                                        {opt.askGuestCount && (
                                          <div>
                                            <label className="block text-[11px] font-semibold opacity-80 mb-1">
                                              {opt.guestCountLabel || 'Jumlah Orang'}
                                              {opt.guestCountRequired ? ' *' : ''}
                                            </label>
                                            <input
                                              type="text"
                                              value={customer.guestCount ?? ''}
                                              placeholder={
                                                opt.guestCountPlaceholder || 'Contoh: 4 orang'
                                              }
                                              onChange={(e) =>
                                                setCustomer((prev) => ({
                                                  ...prev,
                                                  guestCount: e.target.value,
                                                }))
                                              }
                                              style={{
                                                borderColor: project.theme.borderColor,
                                                backgroundColor: project.theme.cardBg,
                                              }}
                                              className="w-full px-2.5 py-1.5 rounded-lg border text-xs outline-none"
                                            />
                                          </div>
                                        )}
                                      </div>
                                    )}

                                    {opt.checklistEnabled && optChecklists.length > 0 && (
                                      <div className="space-y-1.5">
                                        {opt.checklistRequired && (
                                          <div className="text-[10.5px] font-semibold text-rose-600">
                                            Checklist Wajib Dicentang *
                                          </div>
                                        )}
                                        {optChecklists.map((chkText, cIdx) => {
                                          const checked = Boolean(checklistCheckedMap[cIdx]);
                                          return (
                                            <label
                                              key={`${opt.id}_chk_${cIdx}`}
                                              style={{
                                                borderColor: checked
                                                  ? '#10B981'
                                                  : project.theme.borderColor,
                                                backgroundColor: project.theme.cardBg,
                                              }}
                                              className="flex items-start gap-2 p-2.5 rounded-lg border cursor-pointer"
                                            >
                                              <input
                                                type="checkbox"
                                                checked={checked}
                                                onChange={(e) =>
                                                  setChecklistCheckedMap((prev) => ({
                                                    ...prev,
                                                    [cIdx]: e.target.checked,
                                                  }))
                                                }
                                                className="mt-0.5 shrink-0 accent-emerald-600 cursor-pointer"
                                              />
                                              <span className="text-[11px] font-medium leading-relaxed">
                                                {chkText}
                                              </span>
                                            </label>
                                          );
                                        })}
                                      </div>
                                    )}

                                    {opt.id === 'ambil_sendiri' && combinedPickupNote && (
                                      <div className="text-[11px] font-semibold text-amber-900 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-1.5 leading-snug">
                                        Info Produk: {combinedPickupNote}
                                      </div>
                                    )}
                                  </div>
                                )}
                            </div>
                          );
                        })}
                      </div>

                      {/* Catatan Pilihan Terpilih */}
                      {activeSelectedShipOpt?.noteText?.trim() && (
                        <div className="rounded-xl bg-amber-50 border-2 border-amber-300 p-3.5 text-amber-950 space-y-1">
                          <div className="flex items-center gap-1.5 text-xs font-bold text-amber-900">
                            <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
                            <span>{activeSelectedShipOpt.noteTitle?.trim() || 'Catatan:'}</span>
                          </div>
                          <p className="text-xs font-bold leading-relaxed text-amber-950 whitespace-pre-line">
                            {activeSelectedShipOpt.noteText.trim()}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Ringkasan & Tombol WhatsApp */}
                  <div
                    style={{
                      backgroundColor: project.theme.cardBg,
                      borderColor: project.theme.borderColor,
                    }}
                    className="rounded-2xl border p-4 space-y-3"
                  >
                    <div className="flex items-center justify-between text-xs opacity-75">
                      <span>Total Item</span>
                      <span className="font-semibold tabular-nums">{totalCartCount} produk</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold">Total Estimasi</span>
                      <span
                        className="text-base font-bold tabular-nums"
                        style={{ color: project.theme.accentColor }}
                      >
                        {totalCartAmount > 0 ? formatRupiah(totalCartAmount) : 'Sesuai konfirmasi WA'}
                      </span>
                    </div>
                    {cartCheckoutError && (
                      <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-[11px] font-semibold text-rose-700 leading-snug">
                        {cartCheckoutError}
                      </div>
                    )}
                    {(() => {
                      const validateCheckout = (): boolean => {
                        if (activeAskCustomerInfo) {
                          const missingField = activeCustomerFields.find(
                            (f) => f.required && !(customFieldValues[f.id] ?? '').trim()
                          );
                          if (missingField) {
                            setCartCheckoutError(`Mohon lengkapi kolom wajib: ${missingField.label}`);
                            return false;
                          }
                        }
                        if (shouldShowChoices && activeSelectedShipOpt) {
                          if (
                            activeSelectedShipOpt.askArrivalTime &&
                            activeSelectedShipOpt.arrivalTimeRequired &&
                            !(customer.arrivalTime ?? '').trim()
                          ) {
                            setCartCheckoutError(
                              `Mohon lengkapi kolom wajib: ${activeSelectedShipOpt.arrivalTimeLabel || 'Waktu'}`
                            );
                            return false;
                          }
                          if (
                            activeSelectedShipOpt.askGuestCount &&
                            activeSelectedShipOpt.guestCountRequired &&
                            !(customer.guestCount ?? '').trim()
                          ) {
                            setCartCheckoutError(
                              `Mohon lengkapi kolom wajib: ${activeSelectedShipOpt.guestCountLabel || 'Jumlah Orang'}`
                            );
                            return false;
                          }
                          if (
                            activeSelectedShipOpt.checklistEnabled &&
                            activeSelectedShipOpt.checklistRequired
                          ) {
                            const reqItems = resolveShippingOptionChecklistItems(activeSelectedShipOpt);
                            const allOk = reqItems.every((_, idx) => Boolean(checklistCheckedMap[idx]));
                            if (reqItems.length > 0 && !allOk) {
                              setCartCheckoutError('Mohon centang seluruh checklist wajib sebelum mengirim pesanan.');
                              return false;
                            }
                          }
                        }
                        setCartCheckoutError('');
                        return true;
                      };

                      return cartStoreGroups.length <= 1 ? (
                        <a
                          href={cartWaUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          data-wa-tracked="1"
                          onClick={(e) => {
                            if (!validateCheckout()) {
                              e.preventDefault();
                              return;
                            }
                            recordPreviewWaClick(
                              `Keranjang WA (${totalCartCount} item)`,
                              cartWaUrl,
                              totalCartAmount
                            );
                          }}
                          className="w-full py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                        >
                          <MessageCircle className="w-4 h-4" />
                          <span>Kirim Pesanan via WhatsApp</span>
                        </a>
                      ) : (
                        <div className="space-y-2 pt-1">
                          <div className="text-[11px] font-medium text-amber-800 bg-amber-50 border border-amber-200 rounded-lg px-2.5 py-2 leading-snug">
                            Keranjang berisi produk dari {cartStoreGroups.length} nomor WhatsApp berbeda. Kirim pesanan per toko di bawah ini:
                          </div>
                          {cartStoreGroups.map((grp) => {
                            const grpCount = grp.entries.reduce((s, e) => s + e.qty, 0);
                            const grpTotal = grp.entries.reduce(
                              (s, e) => s + e.unitPrice * e.qty,
                              0
                            );
                            return (
                              <a
                                key={grp.normalizedPhone}
                                href={grp.waUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                data-wa-tracked="1"
                                onClick={(e) => {
                                  if (!validateCheckout()) {
                                    e.preventDefault();
                                    return;
                                  }
                                  recordPreviewWaClick(
                                    `Keranjang ${grp.storeName} (${grpCount} item)`,
                                    grp.waUrl,
                                    grpTotal
                                  );
                                }}
                                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
                              >
                                <MessageCircle className="w-4 h-4 shrink-0" />
                                <span className="truncate">
                                  Kirim ke {grp.storeName} ({grpCount} item)
                                </span>
                              </a>
                            );
                          })}
                        </div>
                      );
                    })()}
                  </div>
                </>
              )}
            </div>
          )}
          </div>

          {activeSheetContent && (() => {
            const pos = activeSheetContent.position;
            const backdropAlign =
              pos === 'top'
                ? 'items-start justify-center'
                : pos === 'right'
                ? 'items-stretch justify-end'
                : pos === 'left'
                ? 'items-stretch justify-start'
                : 'items-end justify-center';
            const panelShape =
              pos === 'top'
                ? 'w-full max-h-[84%] rounded-b-[22px] border-b'
                : pos === 'right'
                ? 'w-[86%] max-w-[360px] h-full rounded-l-[22px] border-l'
                : pos === 'left'
                ? 'w-[86%] max-w-[360px] h-full rounded-r-[22px] border-r'
                : 'w-full max-h-[84%] rounded-t-[22px] border-t';
            const panelTransform = sheetEntered
              ? 'translate-x-0 translate-y-0'
              : pos === 'top'
              ? '-translate-y-full'
              : pos === 'right'
              ? 'translate-x-full'
              : pos === 'left'
              ? '-translate-x-full'
              : 'translate-y-full';

            return (
              <div
                onClick={closeBottomSheet}
                data-preview-sheet-pos={pos}
                className={`absolute inset-0 z-30 flex ${backdropAlign} transition-colors duration-200 ${
                  sheetEntered ? 'bg-slate-950/55 backdrop-blur-[2px]' : 'bg-slate-950/0'
                }`}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    backgroundColor: project.theme.cardBg,
                    color: project.theme.textColor,
                    borderColor: project.theme.borderColor,
                  }}
                  className={`${panelShape} shadow-2xl flex flex-col overflow-hidden transition-transform duration-200 ease-out ${panelTransform}`}
                >
                  <div
                    className="pt-2.5 pb-2.5 px-4 border-b flex flex-col items-center gap-2 shrink-0"
                    style={{ borderColor: project.theme.borderColor }}
                  >
                    {(pos === 'bottom' || pos === 'top') && (
                      <div className="w-10 h-1 rounded-full bg-slate-300/80" />
                    )}
                    <div className="w-full flex items-center justify-between gap-2">
                      <h3 className="text-sm font-bold truncate">{activeSheetContent.title}</h3>
                      <button
                        type="button"
                        onClick={closeBottomSheet}
                        aria-label="Tutup Panel"
                        className="p-1.5 rounded-full hover:bg-slate-200/60 opacity-70 hover:opacity-100 cursor-pointer transition-colors"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-y-auto p-4">
                    {activeSheetContent.children.length > 0 ? (
                      activeSheetContent.children.map((child) =>
                        renderPreviewBlock(child, 1)
                      )
                    ) : (
                      <div className="py-8 text-center text-xs opacity-60">
                        Belum ada konten di dalam panel ini.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}

          {/* Floating / Pinned Bottom Navbar */}
          {bottomNavbar.enabled && enabledNavItems.length > 0 && (() => {
            const navMetrics = resolveNavbarMetrics(bottomNavbar);
            const isRoundedOrFloating = navMetrics.floating || navMetrics.borderRadius > 0;
            return (
              <div
                style={{ paddingBottom: `${navMetrics.bottomOffset}px` }}
                className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center"
              >
                <nav
                  style={{
                    width: `min(${navMetrics.barWidthPercent}%, ${Math.round((576 * navMetrics.barWidthPercent) / 100)}px)`,
                    maxWidth: '576px',
                    backgroundColor: bottomNavbar.barBg,
                    color: bottomNavbar.textColor,
                    paddingTop: `${navMetrics.barPaddingY}px`,
                    paddingBottom: `${navMetrics.barPaddingY}px`,
                    borderRadius: `${navMetrics.borderRadius}px`,
                    boxShadow: navMetrics.shadowCss,
                    ...(isRoundedOrFloating
                      ? { border: `1px solid ${bottomNavbar.borderColor}` }
                      : { borderTop: `1px solid ${bottomNavbar.borderColor}` }),
                  }}
                  className="pointer-events-auto px-1.5 transition-all"
                >
                  <div
                    style={{
                      gridTemplateColumns: `repeat(${enabledNavItems.length}, minmax(0, 1fr))`,
                    }}
                    className="grid items-end gap-0.5 max-w-[576px] mx-auto"
                  >
                    {enabledNavItems.map((item) => {
                      const isCenterHome =
                        bottomNavbar.centerStyle === 'elevated' &&
                        (item.action === 'scroll_top' || item.id === 'nav_home');
                      const isSheetOpen =
                        activeNavSheetId === item.id && item.action === 'sheet';
                      const iconId = resolveButtonIcon(item.icon, item.label);
                      const displayIcon = iconId === 'none' ? 'info' : iconId;

                      const innerContent = (
                        <>
                          {isCenterHome ? (
                            <span
                              style={{
                                backgroundColor: bottomNavbar.accentColor,
                                borderColor: bottomNavbar.barBg,
                                width: `${navMetrics.fabBoxSize}px`,
                                height: `${navMetrics.fabBoxSize}px`,
                                marginTop: `${navMetrics.fabMarginTop}px`,
                              }}
                              className="rounded-full border-4 text-white flex items-center justify-center shadow-md shrink-0"
                            >
                              <ButtonGlyph
                                icon={displayIcon}
                                iconUrl={item.iconUrl}
                                style={{
                                  width: `${navMetrics.fabIconSize}px`,
                                  height: `${navMetrics.fabIconSize}px`,
                                }}
                                className="shrink-0"
                              />
                            </span>
                          ) : (
                            <span
                              style={{
                                ...(isSheetOpen ? { color: bottomNavbar.accentColor } : undefined),
                                width: `${Math.max(20, navMetrics.iconSize + 6)}px`,
                                height: `${Math.max(20, navMetrics.iconSize + 6)}px`,
                              }}
                              className="flex items-center justify-center shrink-0"
                            >
                              <ButtonGlyph
                                icon={displayIcon}
                                iconUrl={item.iconUrl}
                                style={{
                                  width: `${navMetrics.iconSize}px`,
                                  height: `${navMetrics.iconSize}px`,
                                }}
                                className="shrink-0"
                              />
                            </span>
                          )}
                          <span
                            style={{
                              ...(isSheetOpen || isCenterHome
                                ? { color: bottomNavbar.accentColor }
                                : undefined),
                              fontSize: `${navMetrics.labelSize}px`,
                            }}
                            className={`leading-tight truncate max-w-full ${
                              isSheetOpen || isCenterHome
                                ? 'font-bold'
                                : 'font-medium opacity-80'
                            }`}
                          >
                            {item.label || 'Menu'}
                          </span>
                        </>
                      );

                      if (item.action === 'link') {
                        return (
                          <a
                            key={item.id}
                            href={sanitizeExternalUrl(item.linkUrl, '#')}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex flex-col items-center justify-end gap-0.5 py-0.5 px-1 rounded-xl cursor-pointer transition-opacity hover:opacity-90 min-w-0"
                          >
                            {innerContent}
                          </a>
                        );
                      }

                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => {
                            if (item.action === 'scroll_top') {
                              closeBottomSheet();
                              setSubPage({ type: 'home' });
                              setTimeout(scrollToTop, 10);
                            } else if (activeNavSheetId === item.id) {
                              closeBottomSheet();
                            } else {
                              openNavBottomSheet(item.id);
                            }
                          }}
                          className="flex flex-col items-center justify-end gap-0.5 py-0.5 px-1 rounded-xl cursor-pointer transition-opacity hover:opacity-90 min-w-0"
                        >
                          {innerContent}
                        </button>
                      );
                    })}
                  </div>
                </nav>
              </div>
            );
          })()}
        </div>

        {/* Floating Add-On WA Meta */}
        {ads.waAddonEnabled && (() => {
          const waPhone = normalizeWhatsappNumber(ads.waAddonNumber);
          const msg =
            (ads.waAddonGreeting ?? '').trim() ||
            `Halo ${project.title}, saya tertarik dengan penawaran di halaman ini.`;
          const waHref = `https://wa.me/${waPhone}?text=${encodeURIComponent(msg)}`;
          const hasNav = bottomNavbar.enabled && enabledNavItems.length > 0;
          const hasCart = subPage.type !== 'cart' && hasCartFeature && totalCartCount > 0;
          const nm = resolveNavbarMetrics(bottomNavbar);
          const navReservedHeight = hasNav
            ? nm.bottomOffset + nm.barPaddingY * 2 + nm.iconSize + nm.labelSize + 24
            : 0;
          const floatBottomPx = (hasCart ? 64 : 16) + navReservedHeight;
          return (
            <a
              href={waHref}
              target="_blank"
              rel="noopener noreferrer"
              data-wa-tracked="1"
              onClick={() => recordPreviewWaClick('Add-On WA Meta (Floating)', waHref)}
              style={{ bottom: `${floatBottomPx}px` }}
              className="absolute right-4 z-20 inline-flex items-center gap-2 px-3.5 py-2 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-lg transition-all"
            >
              <MessageCircle className="w-4 h-4 shrink-0" />
              <span>Chat WhatsApp</span>
            </a>
          );
        })()}

        {/* Toast Notifikasi */}
        {toastText && (
          <div className="pointer-events-none absolute bottom-20 left-1/2 -translate-x-1/2 z-40 px-3.5 py-1.5 rounded-full bg-slate-900/90 text-white text-[11px] font-semibold shadow-lg whitespace-nowrap">
            {toastText}
          </div>
        )}

        {/* Floating Keranjang Bar (Standard catalog, hidden if F&B Floating Capsule handles it on home) */}
        {subPage.type !== 'cart' &&
          hasCartFeature &&
          totalCartCount > 0 &&
          !(subPage.type === 'home' && Boolean(floatingCartConfig)) && (
            <div className="px-4 py-2.5 border-t border-slate-200 bg-white flex items-center justify-between gap-3 shrink-0 shadow-sm">
              <div className="min-w-0">
                <div className="text-[11px] font-semibold text-slate-500 tabular-nums">
                  {totalCartCount} item di keranjang
                </div>
                <div className="text-sm font-bold text-slate-900 tabular-nums truncate">
                  {totalCartAmount > 0 ? formatRupiah(totalCartAmount) : 'Siap pesan via WA'}
                </div>
              </div>
              <button
                type="button"
                onClick={() => openCartPage()}
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold cursor-pointer shrink-0 transition-colors"
              >
                <ShoppingCart className="w-3.5 h-3.5" />
                <span>Lihat Keranjang</span>
              </button>
            </div>
          )}
      </div>
    </div>
  );
}
