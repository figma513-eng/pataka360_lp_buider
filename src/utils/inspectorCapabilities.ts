import type { BlockType } from '../types/builder.ts';

export interface BlockDesignCapabilities {
  /** Whether the "Gaya Visual" accordion is relevant */
  showVisualAccordion: boolean;
  /** Whether shape preset buttons (Bulat/Segi Empat/Kotak/Kapsul) are relevant */
  showShapePresets: boolean;
  /** Whether "Preset Wadah Cepat" (Kartu Bersih / Box Promo Gradasi) is relevant */
  showContainerQuickPresets: boolean;
  /** Whether Solid/Gradient background color controls are relevant */
  showBgAndGradient: boolean;
  /** Whether Background Image URL controls are relevant */
  showBgImage: boolean;
  /** Whether "Layout & Spasi" displays full padding + height controls (false on divider) */
  showFullSpacingControls: boolean;
  /** Whether the "Tata Letak & Posisi" accordion is shown at all */
  showLayoutPositionAccordion: boolean;
  /** Whether internal flex/grid/direction/wrap/align/justify/gap controls are shown */
  showFlexGridControls: boolean;
  /** Whether the unified "Tipografi" accordion is shown */
  showTypographyAccordion: boolean;
  /** Whether "Responsif per Perangkat" includes container layout overrides (display/flex/gap) */
  supportsResponsiveLayoutProps: boolean;
  /** Whether "Efek & Interaksi" accordion is shown */
  showEffectsAccordion: boolean;
}

const LAYOUT_CONTAINER_TYPES = new Set<BlockType>([
  'container',
  'row',
  'bottom_sheet',
  'toggle_container',
]);

const CARD_AND_SECTION_TYPES = new Set<BlockType>([
  'container',
  'row',
  'bottom_sheet',
  'toggle_container',
  'hero_profile',
  'showcase_card',
  'catalog',
  'fnb_catalog',
  'fnb_hero_slider',
  'culinary_spin_slider',
  'floating_product_studio',
  'interactive_box_showcase',
  'training_catalog',
  'social_feed',
  'form',
  'maps_place',
  'carousel',
  'social_follower',
]);

const VIDEO_TYPES = new Set<BlockType>([
  'youtube',
  'facebook_video',
  'tiktok_video',
  'instagram_video',
]);

/**
 * Elements whose parent wrapper should NOT display irrelevant raw text typography controls:
 * - Pure media/visual tools (divider, image, videos, carousel, social icons)
 * - Structural layout containers (container, row, bottom_sheet, toggle_container)
 * - Complex multi-part cards where text is edited on dedicated sub-layers (showcase_card, hero_profile)
 */
const NON_TEXT_PARENT_TYPES = new Set<BlockType>([
  'divider',
  'image',
  'youtube',
  'facebook_video',
  'tiktok_video',
  'instagram_video',
  'carousel',
  'social',
  'container',
  'row',
  'bottom_sheet',
  'toggle_container',
  'showcase_card',
  'hero_profile',
]);

const TEXT_SUB_LAYERS = new Set<string>([
  'button_text',
  'card_header',
  'card_body',
  'card_footer',
  'menu_icon_label',
  'back_label',
  'hero_profile_card',
  'maps_info',
  'toggle_trigger',
  'sheet_trigger',
  'training_header',
  'form_header',
  'social_feed_profile',
  'cart_product',
]);

const MEDIA_OR_ICON_SUB_LAYERS = new Set<string>([
  'button_icon',
  'card_media',
  'hero_cover',
  'hero_avatar',
  'menu_icon_visual',
  'maps_photo',
]);

export function getBlockDesignCapabilities(
  type: BlockType,
  selectedSubLayerId?: string | null
): BlockDesignCapabilities {
  // Contextual overrides when a specific sub-layer is active
  if (selectedSubLayerId) {
    if (selectedSubLayerId === 'button_icon') {
      return {
        showVisualAccordion: true,
        showShapePresets: false,
        showContainerQuickPresets: false,
        showBgAndGradient: true,
        showBgImage: false,
        showFullSpacingControls: true,
        showLayoutPositionAccordion: false,
        showFlexGridControls: false,
        showTypographyAccordion: false,
        supportsResponsiveLayoutProps: false,
        showEffectsAccordion: true,
      };
    }

    if (selectedSubLayerId === 'button_text') {
      return {
        showVisualAccordion: false,
        showShapePresets: false,
        showContainerQuickPresets: false,
        showBgAndGradient: false,
        showBgImage: false,
        showFullSpacingControls: false,
        showLayoutPositionAccordion: false,
        showFlexGridControls: false,
        showTypographyAccordion: true,
        supportsResponsiveLayoutProps: false,
        showEffectsAccordion: true,
      };
    }

    if (MEDIA_OR_ICON_SUB_LAYERS.has(selectedSubLayerId)) {
      return {
        showVisualAccordion: true,
        showShapePresets: selectedSubLayerId !== 'hero_cover',
        showContainerQuickPresets: false,
        showBgAndGradient: selectedSubLayerId === 'hero_cover' || selectedSubLayerId === 'menu_icon_visual',
        showBgImage: selectedSubLayerId === 'hero_cover',
        showFullSpacingControls: true,
        showLayoutPositionAccordion: false,
        showFlexGridControls: false,
        showTypographyAccordion: false,
        supportsResponsiveLayoutProps: false,
        showEffectsAccordion: true,
      };
    }

    if (TEXT_SUB_LAYERS.has(selectedSubLayerId)) {
      const isCardPart =
        selectedSubLayerId === 'card_header' ||
        selectedSubLayerId === 'card_body' ||
        selectedSubLayerId === 'card_footer';
      return {
        showVisualAccordion: isCardPart || selectedSubLayerId === 'hero_profile_card',
        showShapePresets: false,
        showContainerQuickPresets: false,
        showBgAndGradient: isCardPart || selectedSubLayerId === 'hero_profile_card',
        showBgImage: false,
        showFullSpacingControls: true,
        showLayoutPositionAccordion: false,
        showFlexGridControls: false,
        showTypographyAccordion: true,
        supportsResponsiveLayoutProps: false,
        showEffectsAccordion: true,
      };
    }
  }

  if (type === 'product_box_reveal' || type === 'mix_rasa' || type === 'slide_mix_rasa') {
    return {
      showVisualAccordion: false,
      showShapePresets: false,
      showContainerQuickPresets: false,
      showBgAndGradient: false,
      showBgImage: false,
      showFullSpacingControls: false,
      showLayoutPositionAccordion: false,
      showFlexGridControls: false,
      showTypographyAccordion: false,
      supportsResponsiveLayoutProps: false,
      showEffectsAccordion: false,
    };
  }

  const isDivider = type === 'divider';
  const isImage = type === 'image';
  const isVideo = VIDEO_TYPES.has(type);
  const isText = type === 'text';
  const isButton = type === 'button';
  const isLayoutContainer = LAYOUT_CONTAINER_TYPES.has(type);
  const isCardOrSection = CARD_AND_SECTION_TYPES.has(type);

  return {
    showVisualAccordion: !isDivider,
    showShapePresets: !isDivider && !isText && !isVideo,
    showContainerQuickPresets: isCardOrSection && !isButton,
    showBgAndGradient: !isDivider && !isImage && !isVideo,
    showBgImage: isCardOrSection && type !== 'carousel' && !isButton,
    showFullSpacingControls: !isDivider,
    showLayoutPositionAccordion: isLayoutContainer || isImage || isText || isButton || isCardOrSection,
    showFlexGridControls: isLayoutContainer,
    showTypographyAccordion: !NON_TEXT_PARENT_TYPES.has(type),
    supportsResponsiveLayoutProps: isLayoutContainer,
    showEffectsAccordion: true,
  };
}
