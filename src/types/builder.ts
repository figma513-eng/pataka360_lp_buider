export type BlockType =
  | 'row'
  | 'container'
  | 'toggle_container'
  | 'text'
  | 'image'
  | 'button'
  | 'form'
  | 'divider'
  | 'youtube'
  | 'facebook_video'
  | 'tiktok_video'
  | 'instagram_video'
  | 'catalog'
  | 'social'
  | 'social_follower'
  | 'carousel'
  | 'social_feed'
  | 'maps_place'
  | 'bottom_sheet'
  | 'training_catalog'
  | 'hero_profile'
  | 'fnb_catalog'
  | 'category_tabs'
  | 'menu_icon'
  | 'cart_button'
  | 'showcase_card'
  | 'back_button';

export type ShowcaseCardVariant =
  | 'quote_banner'
  | 'news_banner'
  | 'event_poster'
  | 'badge_tile'
  | 'store_card'
  | 'activity_post'
  | 'membership_ticket';

export interface ShowcaseFeeItem {
  id: string;
  label: string;
  value: string;
}

export type PrebuiltSectionCategory =
  | 'kartu_info'
  | 'katalog_store'
  | 'event_kegiatan'
  | 'tarif_paket'
  | 'hero_profil'
  | 'menu_layout'
  | 'kontak_medsos';

export type MenuIconShape = 'circle' | 'rounded' | 'square' | 'pill';
export type BlockShapePreset = 'circle' | 'rounded' | 'square' | 'pill';
export type MenuIconAction = 'sheet' | 'card' | 'page' | 'url' | 'back';
export type MenuIconSheetPosition = 'bottom' | 'right' | 'left' | 'top';
export type UniversalActionType = 'none' | 'url' | 'sheet' | 'page' | 'card' | 'back';

export type HeroProfileVariant = 'compact' | 'banner';
export type FloatingCartPosition =
  | 'bottom-floating'
  | 'bottom-docked'
  | 'top-floating'
  | 'bottom-left'
  | 'bottom-right'
  | 'top-left'
  | 'top-right';
export type CategoryScrollMode = 'vertical' | 'horizontal' | 'wrap';

export interface FnbMenuItem {
  id: string;
  title: string;
  description: string;
  category: string;
  badge?: string;
  price: string;
  image?: string;
  monogram?: string;
  monogramBg?: string;
  monogramColor?: string;
}

export interface CategoryJumpItem {
  id: string;
  label: string;
  targetTitle?: string;
}

export type CarouselAspectRatio = '1/1' | '4/5' | '9/16' | '16/9';

export interface CarouselItem {
  id: string;
  image: string;
  title: string;
  caption: string;
  url?: string;
}

export interface SocialPostItem {
  id: string;
  mediaType: 'image' | 'video';
  imageUrl: string;
  videoUrl?: string;
  caption: string;
  likes?: string;
  comments?: string;
  url?: string;
}

export type SocialPlatform =
  | 'facebook'
  | 'instagram'
  | 'tiktok'
  | 'youtube'
  | 'whatsapp'
  | 'threads'
  | 'twitter'
  | 'telegram'
  | 'linkedin'
  | 'pinterest'
  | 'discord'
  | 'twitch'
  | 'spotify'
  | 'snapchat'
  | 'line';

export interface SocialLinkItem {
  id: string;
  platform: SocialPlatform;
  url: string;
  visible: boolean;
}

export interface SocialFollowerAccount {
  id: string;
  platform: SocialPlatform;
  avatar?: string;
  accountName: string;
  handle: string;
  accountUrl?: string;
  verified?: boolean;
  postsCount?: string;
  postsLabel?: string;
  followers?: string;
  followersLabel?: string;
  following?: string;
  followingLabel?: string;
  bio?: string;
  followLabel?: string;
}

export type TextAlign = 'left' | 'center' | 'right';
export type ShadowPreset = 'none' | 'sm' | 'md' | 'lg';
export type BlockLayoutMode = 'default' | 'grid' | 'large-image' | 'compact';
export type ButtonIconId =
  | 'none'
  | 'home'
  | 'message-circle'
  | 'whatsapp'
  | 'phone'
  | 'mail'
  | 'send'
  | 'map-pin'
  | 'navigation'
  | 'shopping-bag'
  | 'shopping-cart'
  | 'store'
  | 'tag'
  | 'ticket'
  | 'gift'
  | 'credit-card'
  | 'wallet'
  | 'truck'
  | 'package'
  | 'image'
  | 'camera'
  | 'play'
  | 'music'
  | 'file-text'
  | 'book-open'
  | 'graduation-cap'
  | 'award'
  | 'calendar'
  | 'clock'
  | 'users'
  | 'user'
  | 'star'
  | 'heart'
  | 'sparkles'
  | 'shield-check'
  | 'bell'
  | 'info'
  | 'help-circle'
  | 'eye'
  | 'globe'
  | 'share-2'
  | 'download'
  | 'external-link'
  | 'arrow-left'
  | 'chevron-left';

export type CatalogProductType = 'physical' | 'digital' | 'service';
export type CatalogCartButtonSize = 'sm' | 'md' | 'lg';
export type BottomSheetTriggerStyle = 'icon' | 'pill' | 'button';

export type CustomFieldInputType =
  | 'text'
  | 'textarea'
  | 'name'
  | 'tel'
  | 'phone'
  | 'email'
  | 'number'
  | 'date'
  | 'time'
  | 'select'
  | 'radio'
  | 'checkbox_group'
  | 'file'
  | 'address'
  | 'section';

export type FormRequiredRule =
  | 'optional'
  | 'required_fill'
  | 'required_one'
  | 'required_multi'
  | 'required_consent_specific'
  | 'required_consent_all'
  | 'required_min_choices';

export interface CatalogCustomerField {
  id: string;
  label: string;
  placeholder: string;
  type: CustomFieldInputType;
  required?: boolean;
  requiredRule?: FormRequiredRule;
  minChoices?: number;
  defaultValue?: string;
  helpText?: string;
  errorMessage?: string;
  minValue?: number;
  maxValue?: number;
  minLength?: number;
  maxLength?: number;
  phoneFormat?: 'general' | 'whatsapp';
  pattern?: string;
  options?: string[];
  requiredOptionIndexes?: number[];
  conditionalFieldId?: string;
  conditionalValue?: string;
  description?: string;
}

export type WhatsappTemplateType =
  | 'pesanan_baru'
  | 'checkout_keranjang'
  | 'pendaftaran'
  | 'booking'
  | 'konsultasi'
  | 'templat_khusus';

export interface WhatsappTemplate {
  id: string;
  name: string;
  type: WhatsappTemplateType;
  body: string;
  isDefault?: boolean;
  updatedAt: number;
}

export interface WhatsappLinkItem {
  id: string;
  name: string;
  functionType: WhatsappTemplateType;
  phone: string;
  templateId?: string;
  customMessage?: string;
  active: boolean;
  updatedAt: number;
}

export interface WhatsappCenterConfig {
  mainPhone: string;
  businessName: string;
  businessInfo?: string;
  defaultTemplateByType: Partial<Record<WhatsappTemplateType, string>>;
  templates: WhatsappTemplate[];
  links: WhatsappLinkItem[];
  updatedAt: number;
}

export interface FormSubmissionRecord {
  id: string;
  projectId: string;
  projectTitle: string;
  slug: string;
  componentId: string;
  formTitle: string;
  formCategory?: string;
  values: Record<string, string | string[] | boolean>;
  sourceChannel?: AdChannel;
  isTest?: boolean;
  createdAt: number;
}

export interface TrainingMediaItem {
  id: string;
  type: 'image' | 'post';
  imageUrl: string;
  caption: string;
  linkUrl?: string;
  linkLabel?: string;
}

export interface TrainingProgramItem {
  id: string;
  badge?: string;
  title: string;
  subtitle?: string;
  description: string;
  originalPrice?: string;
  price: string;
  discountLabel?: string;
  cashbackLabel?: string;
}

export interface TrainingCustomBox {
  id: string;
  title: string;
  contentHtml: string;
  defaultFontWeight?: 'normal' | 'bold';
  defaultFontStyle?: 'normal' | 'italic';
  textColor?: string;
  lineHeight?: number;
  paragraphGap?: number;
  showBorder?: boolean;
}

export type ShippingMethodId =
  | 'makan_ditempat'
  | 'ambil_sendiri'
  | 'kurir_sendiri'
  | 'gosend_penjual';

export interface CatalogShippingOptionConfig {
  id: ShippingMethodId;
  enabled: boolean;
  label: string;
  askArrivalTime?: boolean;
  arrivalTimeRequired?: boolean;
  arrivalTimeLabel?: string;
  arrivalTimePlaceholder?: string;
  askGuestCount?: boolean;
  guestCountRequired?: boolean;
  guestCountLabel?: string;
  guestCountPlaceholder?: string;
  checklistEnabled?: boolean;
  checklistRequired?: boolean;
  checklistText?: string;
  checklistItems?: string[];
  noteTitle?: string;
  noteText?: string;
}

export interface CatalogItem {
  id: string;
  title: string;
  subtitle: string;
  description?: string;
  badge?: string;
  variants?: string;
  gallery?: string[];
  productType?: 'inherit' | CatalogProductType;
  pickupNote?: string;
  price: string;
  ctaLabel: string;
  url: string;
  image: string;
  imageAspectRatio?: 'auto' | '16/9' | '4/3' | '1/1';
  imageObjectFit?: 'cover' | 'contain';
  unitSold: number;
}

export interface AdvanceOptions {
  showUnitSold: boolean;
  blockLayout: BlockLayoutMode;
  pageTopPadding?: number;
}

export type BottomNavbarItemAction = 'sheet' | 'scroll_top' | 'link';

export interface BottomNavbarItem {
  id: string;
  label: string;
  icon: ButtonIconId;
  iconUrl?: string;
  enabled: boolean;
  action: BottomNavbarItemAction;
  linkUrl?: string;
  sheetTitle: string;
  sheetPosition?: MenuIconSheetPosition;
  children: BuilderBlock[];
}

export interface BottomNavbarConfig {
  enabled: boolean;
  barBg: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
  centerStyle: 'elevated' | 'inline';
  iconSize?: number;
  labelSize?: number;
  barPaddingY?: number;
  barWidthPercent?: number;
  floating?: boolean;
  bottomOffset?: number;
  borderRadius?: number;
  barShadow?: ShadowPreset;
  items: BottomNavbarItem[];
}

export interface BlockStyle {
  blur: number;
  align: TextAlign;
  widthPercent: number;
  minWidth?: number;
  maxWidth?: number;
  heightPx?: number;
  minHeight: number;
  maxHeight?: number;
  // Tata Letak (Section D)
  displayMode?: 'block' | 'flex' | 'grid' | 'inline-flex';
  flexDirection?: 'column' | 'row' | 'column-reverse' | 'row-reverse';
  alignItems?: 'stretch' | 'flex-start' | 'center' | 'flex-end';
  alignSelf?: 'auto' | 'flex-start' | 'center' | 'flex-end' | 'stretch';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  flexWrap?: 'nowrap' | 'wrap';
  gap?: number;
  overflow?: 'visible' | 'hidden' | 'auto' | 'scroll';
  // Posisi (Section D)
  positionMode?: 'static' | 'relative' | 'absolute' | 'fixed' | 'sticky';
  posTop?: number;
  posRight?: number;
  posBottom?: number;
  posLeft?: number;
  zIndex?: number;
  // Garis Tepi & Bayangan
  borderRadius: number;
  shadow: ShadowPreset;
  shadowColor?: string;
  borderWidth: number;
  borderColor: string;
  borderStyle?: 'solid' | 'dashed' | 'dotted' | 'double' | 'none';
  // Latar Belakang
  backgroundColor: string;
  backgroundMode?: 'solid' | 'gradient';
  bgImageUrl?: string;
  bgPosition?: 'center' | 'top' | 'bottom' | 'left' | 'right';
  bgSize?: 'cover' | 'contain' | 'auto';
  /** Skala zoom foto latar belakang di dalam frame/shape/card (50% - 250%, default 100) */
  bgImageScale?: number;
  bgRepeat?: 'no-repeat' | 'repeat' | 'repeat-x' | 'repeat-y';
  gradientColor1?: string;
  gradientColor2?: string;
  gradientColor3?: string;
  gradientAngle?: number;
  // Efek
  hoverLift?: boolean;
  opacity?: number;
  visibility?: 'visible' | 'hidden';
  transformScale?: number;
  transformRotate?: number;
  transitionMs?: number;
  // Tipografi
  textColor: string;
  useThemeTextColor?: boolean;
  fontFamily?: string;
  fontSize?: number;
  fontWeightCss?: '400' | '500' | '600' | '700' | '800';
  fontStyle?: 'normal' | 'italic';
  lineHeight?: number;
  letterSpacing?: number;
  textDecoration?: 'none' | 'underline' | 'line-through';
  textTransform?: 'none' | 'uppercase' | 'lowercase' | 'capitalize';
  paragraphGap?: number;
  maxLines?: 0 | 1 | 2 | 3 | 4;
  shapePreset?: BlockShapePreset;
  shadowSize?: number;
  // Jarak
  padding: number;
  paddingTop?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  paddingRight?: number;
  paddingX?: number;
  fullBleed?: boolean;
  marginTop?: number;
  marginBottom: number;
  marginLeft?: number;
  marginRight?: number;
  locked?: boolean;
  themeOverrideMode?: 'global' | 'local';
  themeOverrideTokens?: {
    textColor?: boolean;
    backgroundColor?: boolean;
    borderColor?: boolean;
    fontFamily?: boolean;
    accentColor?: boolean;
  };
  responsive?: {
    tablet?: ResponsiveStyleOverride;
    mobile?: ResponsiveStyleOverride;
  };
}

export type ViewportBreakpoint = 'desktop' | 'tablet' | 'mobile';

export interface ResponsiveStyleOverride {
  widthPercent?: number;
  minWidth?: number;
  maxWidth?: number;
  heightPx?: number;
  minHeight?: number;
  maxHeight?: number;
  displayMode?: 'block' | 'flex' | 'grid' | 'inline-flex';
  flexDirection?: 'column' | 'row' | 'column-reverse' | 'row-reverse';
  alignItems?: 'stretch' | 'flex-start' | 'center' | 'flex-end';
  justifyContent?: 'flex-start' | 'center' | 'flex-end' | 'space-between' | 'space-around';
  flexWrap?: 'nowrap' | 'wrap';
  gap?: number;
  paddingTop?: number;
  paddingRight?: number;
  paddingBottom?: number;
  paddingLeft?: number;
  marginTop?: number;
  marginBottom?: number;
}

export interface BlockContent {
  // Text
  text?: string;
  variant?: 'h1' | 'h2' | 'body';
  fontWeight?: 'normal' | 'semibold' | 'bold';
  // Image
  src?: string;
  imageName?: string;
  alt?: string;
  aspectRatio?: 'auto' | '16/9' | '4/3' | '1/1';
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';
  objectPosition?: string;
  imageShape?: 'rect' | 'circle';
  circleSize?: number;
  imageZoom?: number;
  // Button (3-Layer Standard: Wadah, Icon, Teks)
  label?: string;
  url?: string;
  buttonBg?: string;
  buttonHoverBg?: string;
  buttonText?: string;
  buttonIcon?: ButtonIconId;
  buttonIconUrl?: string;
  buttonIconSize?: number;
  buttonIconColor?: string;
  buttonIconStrokeWidth?: number;
  buttonIconTooltip?: string;
  buttonHideIcon?: boolean;
  buttonHideText?: boolean;
  buttonActionKind?: 'url' | 'page' | 'scroll' | 'form' | 'whatsapp' | 'action';
  buttonWhatsappNumber?: string;
  buttonWhatsappMessage?: string;
  buttonCustomAction?: string;
  buttonTooltip?: string;
  buttonDisabled?: boolean;
  buttonConfirmAction?: boolean;
  buttonConfirmMessage?: string;
  buttonVisualState?: 'normal' | 'hover' | 'active' | 'focus' | 'disabled';
  buttonStateStyles?: Partial<
    Record<
      'normal' | 'hover' | 'active' | 'focus' | 'disabled',
      {
        bg?: string;
        borderColor?: string;
        textColor?: string;
        opacity?: number;
        scale?: number;
      }
    >
  >;
  buttonIconStyle?: Partial<BlockStyle>;
  buttonTextStyle?: Partial<BlockStyle>;
  // Form Dinamis (Section H)
  formTitle?: string;
  formCategory?: WhatsappTemplateType;
  formFields?: CatalogCustomerField[];
  namePlaceholder?: string;
  emailPlaceholder?: string;
  formNameRequired?: boolean;
  formEmailRequired?: boolean;
  formChecklistEnabled?: boolean;
  formChecklistTitle?: string;
  formChecklistItems?: string[];
  formChecklistRequired?: boolean;
  formChecklistRule?: FormRequiredRule;
  formChecklistMinChoices?: number;
  formSaveToDatabase?: boolean;
  formWhatsappEnabled?: boolean;
  formWhatsappNumber?: string;
  formWhatsappTemplateId?: string;
  submitLabel?: string;
  successMessage?: string;
  buttonColor?: string;
  // Wadah / Parent Slider (Section G)
  containerLayoutMode?: 'normal' | 'slider_horizontal' | 'slider_vertical';
  sliderVisibleItems?: number;
  sliderGap?: number;
  sliderSpeedMs?: number;
  sliderTransition?: 'smooth' | 'fade' | 'instant';
  sliderLoop?: boolean;
  sliderAutoplay?: boolean;
  sliderAutoplayIntervalMs?: number;
  sliderShowArrows?: boolean;
  sliderShowDots?: boolean;
  sliderShowScrollbar?: boolean;
  sliderTouchSwipe?: boolean;
  sliderMouseDrag?: boolean;
  sliderSnap?: boolean;
  sliderOverflow?: 'hidden' | 'visible' | 'auto';
  // Integrasi Pusat WhatsApp (Single Source of Truth)
  whatsappTemplateId?: string;
  whatsappLinkId?: string;
  // Video Embeds (YouTube, Facebook, TikTok)
  youtubeUrl?: string;
  youtubeAspectRatio?: '16/9' | '1/1' | '4/5' | '9/16';
  youtubeAutoplay?: boolean;
  youtubeVolume?: number;
  videoUrl?: string;
  videoPoster?: string;
  videoAspectRatio?: '16/9' | '1/1' | '4/5' | '9/16';
  videoAutoplay?: boolean;
  videoMuted?: boolean;
  videoVolume?: number;
  // Divider
  lineColor?: string;
  thickness?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  // Catalog
  catalogItems?: CatalogItem[];
  catalogProductType?: CatalogProductType;
  catalogDetailEnabled?: boolean;
  catalogCartEnabled?: boolean;
  catalogCartButtonSize?: CatalogCartButtonSize;
  catalogWhatsappNumber?: string;
  catalogStoreName?: string;
  catalogWhatsappIntro?: string;
  catalogAskCustomerInfo?: boolean;
  catalogCustomerFields?: CatalogCustomerField[];
  catalogShippingEnabled?: boolean;
  catalogPickupNote?: string;
  catalogShippingNote?: string;
  catalogShippingOptions?: CatalogShippingOptionConfig[];
  // Training Catalog (Katalog Produk Pelatihan)
  trainingHeading?: string;
  trainingBatch?: string;
  trainingSchedule?: string;
  trainingSubheading?: string;
  trainingExpandLabel?: string;
  trainingCollapseLabel?: string;
  trainingDefaultExpanded?: boolean;
  trainingPrograms?: TrainingProgramItem[];
  trainingCustomBoxes?: TrainingCustomBox[];
  trainingMedia?: TrainingMediaItem[];
  trainingMediaRatio?: CarouselAspectRatio;
  trainingChecklistTitle?: string;
  trainingChecklistItems?: string[];
  trainingChecklistRequired?: boolean;
  trainingChecklistRule?: FormRequiredRule;
  trainingChecklistMinChoices?: number;
  trainingFormTitle?: string;
  trainingFormFields?: CatalogCustomerField[];
  trainingWaNumber?: string;
  trainingWaButtonLabel?: string;
  trainingWaIntro?: string;
  // Photo Carousel
  carouselItems?: CarouselItem[];
  carouselAspectRatio?: CarouselAspectRatio;
  carouselObjectFit?: 'cover' | 'contain';
  carouselShowDots?: boolean;
  carouselShowArrows?: boolean;
  carouselShowScrollbar?: boolean;
  // Social Profile & Postings Carousel
  socialFeedPlatform?: SocialPlatform;
  socialFeedAvatar?: string;
  socialFeedAccountName?: string;
  socialFeedHandle?: string;
  socialFeedAccountUrl?: string;
  socialFeedVerified?: boolean;
  socialFeedPostsCount?: string;
  socialFeedFollowers?: string;
  socialFeedFollowersLabel?: string;
  socialFeedFollowing?: string;
  socialFeedBio?: string;
  socialFeedFollowLabel?: string;
  socialFeedRatio?: CarouselAspectRatio;
  socialFeedPosts?: SocialPostItem[];
  // Maps Place Card
  mapsPhotoUrl?: string;
  mapsPhotoBadgeLabel?: string;
  mapsPhotoRatio?: '16/9' | '4/3' | '4/5' | '1/1';
  mapsTitle?: string;
  mapsRating?: number;
  mapsReviewCount?: string;
  mapsService?: string;
  mapsAccessible?: boolean;
  mapsServicesList?: string;
  mapsAddress?: string;
  mapsUrl?: string;
  mapsButtonLabel?: string;
  // Social Media Icons
  socialItems?: SocialLinkItem[];
  socialStyle?: 'filled' | 'outline' | 'minimal';
  socialShape?: 'circle' | 'rounded';
  socialSize?: 'sm' | 'md' | 'lg';
  socialIconSize?: number;
  socialGap?: number;
  socialUseBrandColors?: boolean;
  socialColor?: string;
  // Social Media + Follower Cards
  socialFollowerAccounts?: SocialFollowerAccount[];
  socialFollowerGap?: number;
  // Toggle Container (Show / Hide)
  toggleShowLabel?: string;
  toggleHideLabel?: string;
  toggleDefaultOpen?: boolean;
  toggleButtonBg?: string;
  toggleButtonText?: string;
  toggleButtonStyle?: 'solid' | 'outline';
  toggleButtonIcon?: ButtonIconId;
  toggleButtonIconUrl?: string;
  // Bottom Sheet
  sheetTitle?: string;
  sheetTriggerStyle?: BottomSheetTriggerStyle;
  sheetTriggerLabel?: string;
  sheetTriggerSublabel?: string;
  sheetTriggerIcon?: ButtonIconId;
  sheetTriggerIconUrl?: string;
  sheetTriggerBg?: string;
  sheetTriggerText?: string;
  sheetIconSize?: number;
  // Hero Profil (Compact & Banner Cover)
  heroVariant?: HeroProfileVariant;
  heroStatusEnabled?: boolean;
  heroStatusText?: string;
  heroStatusColor?: string;
  heroLogoImage?: string;
  heroLogoMonogram?: string;
  heroLogoBg?: string;
  heroLogoColor?: string;
  heroLogoSize?: number;
  /** Skala zoom foto avatar/logo di dalam bentuk lingkaran Hero Profil (50% - 250%, default 100) */
  heroLogoZoom?: number;
  heroCoverImage?: string;
  /** Skala zoom foto banner cover di dalam bingkai Hero Profil (50% - 250%, default 100) */
  heroCoverZoom?: number;
  heroCoverTitle?: string;
  heroCoverTitleEnabled?: boolean;
  heroCoverFontFamily?: string;
  heroCoverTitleSize?: number;
  heroCoverTitleColor?: string;
  heroCoverHeight?: number;
  heroOverlapPx?: number;
  heroTitle?: string;
  heroTitleSize?: number;
  heroSubtitle?: string;
  heroSubtitleSize?: number;
  heroRating?: string;
  heroHours?: string;
  heroLocation?: string;
  heroInfoSize?: number;
  heroCardRadius?: number;
  heroHideDefaultContent?: boolean;
  heroChildrenPosition?: 'on_cover' | 'inside_card' | 'below_card' | 'overlap_cover';
  // Katalog F&B
  fnbItems?: FnbMenuItem[];
  fnbShowSearch?: boolean;
  fnbSearchPlaceholder?: string;
  fnbShowCategories?: boolean;
  fnbGroupByCategory?: boolean;
  fnbAccentColor?: string;
  fnbItemImageSize?: number;
  fnbItemTitleSize?: number;
  fnbItemDescSize?: number;
  fnbFloatingCartEnabled?: boolean;
  fnbFloatingCartPosition?: FloatingCartPosition;
  fnbFloatingCartOffsetY?: number;
  fnbFloatingCartBg?: string;
  fnbFloatingCartLabel?: string;
  // Tombol Kategori Lompat Judul
  categoryButtons?: CategoryJumpItem[];
  categoryScrollMode?: CategoryScrollMode;
  categoryShowScrollbar?: boolean;
  categoryMaxHeight?: number;
  categoryActiveBg?: string;
  categoryActiveText?: string;
  categoryInactiveBg?: string;
  categoryInactiveText?: string;
  categoryRadius?: number;
  categoryFontSize?: number;
  categoryButtonPaddingX?: number;
  categoryButtonPaddingY?: number;
  categoryGap?: number;
  categoryActiveId?: string;
  categoryFilterFnbOnClick?: boolean;
  // Kolom / Row Dinamis (1-20 Kolom, Grid Baris x Kolom / Slide Horizontal 3 Titik / Slide Vertikal)
  rowLayoutMode?: 'grid' | 'horizontal' | 'vertical';
  rowColumns?: number;
  rowGridRows?: number;
  rowColumnWidth?: number;
  rowColumnMinHeight?: number;
  rowGap?: number;
  rowShowDots?: boolean;
  rowShowScrollbar?: boolean;
  // Menu Icon (Upload/URL gambar, Bulat/Segi Empat/Kotak, Sheet 4 Arah / Menuju Card Lain)
  menuIconImage?: string;
  menuIconShape?: MenuIconShape;
  menuIconRadius?: number;
  menuIconSize?: number;
  menuIconImageSize?: number;
  menuIconImageFit?: 'cover' | 'contain';
  /** Skala zoom foto di dalam bentuk Menu Icon (50% - 250%, default 100) */
  menuIconImageZoom?: number;
  menuIconLabel?: string;
  menuIconShowLabel?: boolean;
  menuIconAction?: MenuIconAction;
  menuIconSheetPosition?: MenuIconSheetPosition;
  sheetPosition?: MenuIconSheetPosition;
  menuIconTargetBlockId?: string;
  menuIconBg?: string;
  menuIconTextColor?: string;
  // Tombol Keranjang Mandiri (bisa diletakkan di card manapun)
  cartProductName?: string;
  cartProductDesc?: string;
  cartProductPrice?: string;
  cartProductImage?: string;
  cartButtonLabel?: string;
  cartShowProductInfo?: boolean;
  cartAccentColor?: string;
  cartWhatsappNumber?: string;
  cartStoreName?: string;
  cartFloatingEnabled?: boolean;
  cartFloatingLabel?: string;
  cartFloatingBg?: string;
  cartFloatingPosition?: FloatingCartPosition;
  // Kartu Dinamis (Quote Banner, Berita/Info, Even/Promo, Sertifikasi, Store, Feed Kegiatan, Tiket Keanggotaan)
  cardVariant?: ShowcaseCardVariant;
  cardHeaderTitle?: string;
  cardMoreLabel?: string;
  cardMoreUrl?: string;
  cardTitle?: string;
  cardSubtitle?: string;
  cardBadge?: string;
  cardQuote?: string;
  cardDate?: string;
  cardViews?: string;
  cardImage?: string;
  cardImagePosition?: 'left' | 'right';
  cardGalleryImages?: string[];
  cardGradientFrom?: string;
  cardGradientTo?: string;
  cardAccentColor?: string;
  cardTextColor?: string;
  cardPrice?: string;
  cardTotalLabel?: string;
  cardTotalValue?: string;
  cardFeeItems?: ShowcaseFeeItem[];
  cardActionUrl?: string;
  cardShowPlayIcon?: boolean;
  cardEnableCart?: boolean;
  cardWhatsappNumber?: string;
  // Pengaturan Ukuran Box Foto, Zoom Foto, & Tipografi Kartu Dinamis
  cardMediaSize?: number;
  cardMediaHeight?: number;
  cardImageZoom?: number;
  cardImageFit?: 'cover' | 'contain';
  cardImageRadius?: number;
  cardTitleSize?: number;
  cardSubtitleSize?: number;
  cardTitleLines?: 0 | 1 | 2 | 3;
  cardSubtitleLines?: 0 | 1 | 2 | 3;
  cardTextGap?: number;
  cardLineHeight?: number;
  cardLetterSpacing?: number;
  cardHideDefaultContent?: boolean;
  cardHideDefaultFooter?: boolean;
  cardFooterBlocks?: BuilderBlock[];
  // Aksi Universal (Berlaku pada semua lapisan: Link, Sheet 4 Arah, Halaman Baru, Card Lain, Back)
  actionType?: UniversalActionType;
  actionUrl?: string;
  buttonOpenInNewTab?: boolean;
  actionSheetPosition?: MenuIconSheetPosition;
  actionSheetTitle?: string;
  actionSheetBlocks?: BuilderBlock[];
  actionTargetPageId?: string;
  actionTargetBlockId?: string;
  // Fungsi Keranjang Universal (Dapat diaktifkan pada semua lapisan card)
  universalCartEnabled?: boolean;
  universalCartName?: string;
  universalCartPrice?: string;
  universalCartUnitSold?: number;
  universalCartShowUnitSold?: boolean;
  universalCartButtonLabel?: string;
  universalCartAccentColor?: string;
  universalCartImage?: string;
  universalCartWhatsappNumber?: string;
  universalCartStoreName?: string;
  universalCartFloatingEnabled?: boolean;
  universalCartFloatingLabel?: string;
  universalCartFloatingBg?: string;
  universalCartFloatingPosition?: FloatingCartPosition;
  // Tombol Kembali (Back Button)
  backButtonLabel?: string;
  backButtonBg?: string;
  backButtonText?: string;
  backButtonIcon?: ButtonIconId;
  backButtonIconColor?: string;
  backTargetPageId?: string;
  // Independent Sub-Layer Storage (per-element styling, visibility, deletion & lock without mutating siblings/parent)
  hiddenSubLayers?: string[];
  deletedSubLayers?: string[];
  lockedSubLayers?: string[];
  subLayerStyles?: Record<string, Partial<BlockStyle>>;
  subLayerMeta?: Record<string, { label?: string; alt?: string; imageName?: string; objectFit?: BlockContent['objectFit']; objectPosition?: string; borderRadius?: number }>;
}

export interface BuilderBlock {
  id: string;
  type: BlockType;
  label: string;
  style: BlockStyle;
  content: BlockContent;
  children?: BuilderBlock[];
}

export interface PageTheme {
  id: string;
  name: string;
  category?: 'brand' | 'basic' | 'aesthetic';
  brandSource?: string;
  canvasBg: string;
  cardBg: string;
  textColor: string;
  accentColor: string;
  borderColor: string;
  fontFamily?: string;
}

export type AdChannel = 'meta' | 'meta_wa_addon' | 'tiktok' | 'google' | 'organic';

export type MetaWaEventName = 'Lead' | 'Contact' | 'InitiateCheckout' | 'Purchase';

export interface ProjectPublishingConfig {
  slug: string;
  customDomain: string;
  useCustomDomain: boolean;
  isPublished: boolean;
  publishedAt?: number;
  seoTitle?: string;
  seoDescription?: string;
  seoImage?: string;
  seoImageAlt?: string;
  seoSiteName?: string;
  seoShareText?: string;
}

export interface ProjectAdsConfig {
  metaPixelId: string;
  metaTestEventCode?: string;
  metaWaEvent: MetaWaEventName;
  metaCapiForwarding: boolean;
  tiktokPixelId: string;
  googleTagId: string;
  googleAdsConversionLabel?: string;
  gtmContainerId?: string;
  waAddonEnabled: boolean;
  waAddonNumber: string;
  waAddonGreeting?: string;
  appendAdAttributionToWa: boolean;
}

export interface AnalyticsEventRecord {
  id: string;
  projectId: string;
  projectTitle: string;
  slug: string;
  eventType: 'page_view' | 'wa_click' | 'form_open' | 'form_submit';
  channel: AdChannel;
  sourceLabel: string;
  ctaLabel?: string;
  waPhone?: string;
  orderValue?: number;
  componentId?: string;
  componentType?: string;
  buttonLabel?: string;
  waLinkId?: string;
  waTemplateId?: string;
  productId?: string;
  productName?: string;
  dedupeKey?: string;
  utmSource?: string;
  utmMedium?: string;
  utmCampaign?: string;
  utmContent?: string;
  clickIdType?: 'fbclid' | 'ctwa_clid' | 'ttclid' | 'gclid';
  deviceType: 'mobile' | 'desktop';
  isTest?: boolean;
  createdAt: number;
}

export interface BuilderSubPage {
  id: string;
  title: string;
  showBackButton?: boolean;
  backButtonLabel?: string;
  blocks: BuilderBlock[];
}

export interface BuilderProject {
  title: string;
  theme: PageTheme;
  blocks: BuilderBlock[];
  pages?: BuilderSubPage[];
  advanceOptions: AdvanceOptions;
  bottomNavbar?: BottomNavbarConfig;
  publishing?: ProjectPublishingConfig;
  adsConfig?: ProjectAdsConfig;
  whatsappCenter?: WhatsappCenterConfig;
}

export interface ProjectRecord {
  id: string;
  revision?: number;
  project: BuilderProject;
  updatedAt: number;
  lastSavedAt?: number;
}

export interface WorkspaceBundle {
  version: 1;
  activeProjectId: string;
  projects: ProjectRecord[];
}

export type AccessRole = 'super_admin' | 'admin' | 'editor' | 'viewer';

export type FeaturePermissionKey =
  | 'editor'
  | 'projects'
  | 'publishing'
  | 'ads_wa'
  | 'analytics'
  | 'export_backup'
  | 'access_control';

export type FeaturePermissionsMap = Record<FeaturePermissionKey, boolean>;

export interface AccessMemberRecord {
  id: string;
  name: string;
  email: string;
  role: AccessRole;
  isActive: boolean;
  unitScope: 'all' | string[];
  permissions: FeaturePermissionsMap;
  createdAt: number;
}

export interface AccessSettingsConfig {
  allUsersSuperAdmin: boolean;
  autoGrantSuperAdminOnJoin: boolean;
  defaultRole: AccessRole;
  activeMemberId: string;
  members: AccessMemberRecord[];
  updatedAt: number;
}

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: AccessRole;
  isActive: boolean;
  unitScope: 'all' | string[];
  permissions: FeaturePermissionsMap;
  createdAt: number;
  lastLoginAt?: number;
}

export type WebhookEventName =
  | 'wa_click'
  | 'form_submit'
  | 'project_save'
  | 'project_publish';

export interface ApiSettingsConfig {
  publicApiEnabled: boolean;
  requireAuthForBuilder: boolean;
  demoLoginEnabled?: boolean;
  webhookUrl: string;
  webhookEvents: WebhookEventName[];
  corsOrigins: string;
  rateLimitPerMinute: number;
  metaApiVersion: string;
  waDefaultCountryCode: string;
  autoPublishOnSave: boolean;
  updatedAt: number;
}

export interface DemoAccountDirectoryEntry {
  id: string;
  name: string;
  username: string;
  email: string;
  password: string;
  role: AccessRole;
  isActive: boolean;
  unitScope: 'all' | string[];
  permissions: FeaturePermissionsMap;
}

export interface DemoDirectoryRoleEntry {
  role: AccessRole;
  label: string;
  shortLabel: string;
  description: string;
  defaultPermissions: FeaturePermissionsMap;
  account: DemoAccountDirectoryEntry | null;
}

export interface DemoDirectoryResponse {
  demoEnabled: boolean;
  projectCount: number;
  roles: DemoDirectoryRoleEntry[];
}

export interface WebhookLogRecord {
  id: string;
  eventType: string;
  targetUrl: string;
  statusCode?: number;
  success: boolean;
  payloadSummary: string;
  errorMessage?: string;
  createdAt: number;
}

export type UiAppearanceLabelsMap = Record<string, string>;
export type UiAppearanceHiddenMap = Record<string, boolean>;

export interface UiAppearanceSettingsConfig {
  labels: UiAppearanceLabelsMap;
  hiddenKeys?: UiAppearanceHiddenMap;
  updatedAt: number;
}

export interface DbDiagnostics {
  engine: 'postgresql' | 'local-json';
  connected: boolean;
  ready: boolean;
  degraded: boolean;
  corrupt?: boolean;
  host?: string;
  database?: string;
  ssl?: boolean;
  sslVerifyMode?: 'strict' | 'custom-ca' | 'insecure-dev-override' | 'disabled';
  lastError?: string;
  appliedMigrations?: string[];
  envStatus: {
    postgresConfigured: boolean;
    sessionSecretConfigured: boolean;
    metaCapiConfigured: boolean;
    webhookSecretConfigured: boolean;
  };
  tables: {
    users: number;
    sessions: number;
    projects: number;
    analyticsEvents: number;
    apiSettings: number;
    webhookLogs: number;
    accessPolicies: number;
    mediaAssets?: number;
    uiAppearance?: number;
  };
}

export type ServerSyncState =
  | 'idle'
  | 'local_saved'
  | 'pending'
  | 'syncing'
  | 'server_saved'
  | 'conflict'
  | 'error';

export interface MediaAssetMeta {
  id: string;
  filename: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  sha256: string;
  createdAt: number;
}

export type BackupRestoreMode = 'full' | 'project';

export interface RestorePreviewSummary {
  valid: boolean;
  sourceType?: 'json' | 'zip';
  appVersion?: string;
  databaseMode?: 'local-json' | 'postgresql';
  schemaVersion: number;
  checksumValid: boolean;
  manifestValid?: boolean;
  fileCount?: number;
  errors: string[];
  warnings: string[];
  existingCounts: {
    users: number;
    projects: number;
    analyticsEvents: number;
    media: number;
    webhookLogs?: number;
  };
  incomingCounts: {
    users: number;
    projects: number;
    analyticsEvents: number;
    media: number;
    webhookLogs?: number;
  };
  projectChanges: Array<{
    id: string;
    title: string;
    slug: string;
    action: 'create' | 'overwrite';
    existingRevision?: number;
    incomingRevision: number;
  }>;
}


