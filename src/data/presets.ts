import type {
  AdvanceOptions,
  BlockStyle,
  BlockType,
  BottomNavbarConfig,
  BottomNavbarItem,
  BuilderBlock,
  BuilderProject,
  BuilderSubPage,
  CarouselItem,
  CatalogItem,
  CategoryJumpItem,
  FnbHeroSlideItem,
  FnbMenuItem,
  InteractiveBoxItem,
  MixRasaFlavorItem,
  PageTheme,
  PrebuiltSectionCategory,
  ProductBoxRevealItem,
  ShadowPreset,
  ShowcaseCardVariant,
  SocialFollowerAccount,
  SocialLinkItem,
  SocialPostItem,
  TrainingCustomBox,
  TrainingMediaItem,
  TrainingProgramItem,
} from '../types/builder.ts';
import {
  cloneDefaultCatalogShippingOptions,
  getDefaultCustomerFields,
  getDefaultTrainingFormFields,
} from '../utils/cartHelpers.ts';

let idCounter = 100;
export function createId(prefix = 'blk'): string {
  idCounter += 1;
  return `${prefix}_${Date.now().toString(36)}_${idCounter}`;
}

export const STARTER_ILLUSTRATION_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 220" fill="none">
    <rect width="320" height="220" rx="20" fill="#F8FAFC"/>
    <circle cx="160" cy="96" r="52" fill="#E0E7FF"/>
    <rect x="118" y="64" width="84" height="64" rx="14" fill="#2563EB"/>
    <rect x="130" y="76" width="60" height="10" rx="5" fill="#93C5FD"/>
    <rect x="130" y="94" width="42" height="8" rx="4" fill="#DBEAFE"/>
    <rect x="130" y="108" width="28" height="8" rx="4" fill="#EFF6FF"/>
    <circle cx="212" cy="64" r="14" fill="#F59E0B"/>
    <path d="M207 64L211 68L218 60" stroke="#FFFFFF" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
    <text x="160" y="182" text-anchor="middle" font-family="sans-serif" font-size="16" font-weight="700" fill="#0F172A">Katalog Digital</text>
  </svg>`);

export const PRODUCT_CARD_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 320 180" fill="none">
    <rect width="320" height="180" rx="14" fill="#EFF6FF"/>
    <rect x="44" y="34" width="232" height="112" rx="12" fill="#FFFFFF" stroke="#BFDBFE" stroke-width="2"/>
    <rect x="64" y="54" width="76" height="72" rx="8" fill="#2563EB"/>
    <rect x="156" y="58" width="96" height="12" rx="6" fill="#1E293B"/>
    <rect x="156" y="80" width="74" height="8" rx="4" fill="#94A3B8"/>
    <rect x="156" y="102" width="60" height="22" rx="6" fill="#2563EB"/>
  </svg>`);

export const FNB_CUP_CARAMEL_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 300" fill="none">
    <defs>
      <linearGradient id="cupC" x1="40" y1="60" x2="180" y2="275" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#F27A54"/>
        <stop offset="55%" stop-color="#E56742"/>
        <stop offset="100%" stop-color="#C94F2D"/>
      </linearGradient>
      <linearGradient id="lidC" x1="32" y1="22" x2="188" y2="66" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="65%" stop-color="#F1F5F9"/>
        <stop offset="100%" stop-color="#E2E8F0"/>
      </linearGradient>
      <clipPath id="bodyClipC">
        <path d="M46 66H174L154 268C152.5 278 134 284 110 284C86 284 67.5 278 66 268L46 66Z"/>
      </clipPath>
    </defs>
    <path d="M52 34C52 24 72 18 110 18C148 18 168 24 168 34L174 44H46L52 34Z" fill="url(#lidC)"/>
    <rect x="34" y="42" width="152" height="16" rx="8" fill="#FFFFFF"/>
    <rect x="36" y="54" width="148" height="10" rx="5" fill="#E2E8F0"/>
    <ellipse cx="110" cy="24" rx="44" ry="6" fill="#FFFFFF" opacity="0.9"/>
    <path d="M46 66H174L154 268C152.5 278 134 284 110 284C86 284 67.5 278 66 268L46 66Z" fill="url(#cupC)"/>
    <g clip-path="url(#bodyClipC)">
      <path d="M126 112C122 103 114 98 104 98C88 98 78 109 78 124C78 139 89 150 105 150C115 150 123 145 127 137" stroke="#FFFFFF" stroke-width="11" stroke-linecap="round" opacity="0.92"/>
      <circle cx="136" cy="108" r="5" fill="#FDE68A"/>
      <path d="M48 164H172V286H48Z" fill="#2A1F1D"/>
      <rect x="48" y="164" width="32" height="32" fill="#0F766E"/>
      <rect x="80" y="164" width="30" height="32" fill="#D97757"/>
      <rect x="110" y="164" width="32" height="32" fill="#134E4A"/>
      <rect x="142" y="164" width="30" height="32" fill="#F59E0B"/>
      <rect x="48" y="196" width="32" height="34" fill="#9A3412"/>
      <rect x="80" y="196" width="30" height="34" fill="#115E59"/>
      <rect x="110" y="196" width="32" height="34" fill="#E07A5F"/>
      <rect x="142" y="196" width="30" height="34" fill="#1E293B"/>
      <rect x="48" y="230" width="32" height="54" fill="#14B8A6"/>
      <rect x="80" y="230" width="30" height="54" fill="#7C2D12"/>
      <rect x="110" y="230" width="32" height="54" fill="#0D9488"/>
      <rect x="142" y="230" width="30" height="54" fill="#C2410C"/>
      <circle cx="64" cy="180" r="8" fill="#FDE68A" opacity="0.85"/>
      <circle cx="95" cy="213" r="7" fill="#CCFBF1" opacity="0.8"/>
      <circle cx="126" cy="180" r="7" fill="#FDBA74" opacity="0.85"/>
      <circle cx="126" cy="248" r="8" fill="#FEF3C7" opacity="0.75"/>
      <path d="M52 66H74L84 284H64L52 66Z" fill="#FFFFFF" opacity="0.16"/>
      <path d="M148 66H174L154 284H136L148 66Z" fill="#0F172A" opacity="0.16"/>
    </g>
    <path d="M46 64H174" stroke="#0F172A" stroke-opacity="0.12" stroke-width="3"/>
  </svg>`);

export const FNB_CUP_GREEN_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 300" fill="none">
    <defs>
      <linearGradient id="cupG" x1="40" y1="60" x2="180" y2="275" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#14B8A6"/>
        <stop offset="55%" stop-color="#0D9488"/>
        <stop offset="100%" stop-color="#0F766E"/>
      </linearGradient>
      <linearGradient id="lidG" x1="32" y1="22" x2="188" y2="66" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="65%" stop-color="#F1F5F9"/>
        <stop offset="100%" stop-color="#E2E8F0"/>
      </linearGradient>
      <clipPath id="bodyClipG">
        <path d="M46 66H174L154 268C152.5 278 134 284 110 284C86 284 67.5 278 66 268L46 66Z"/>
      </clipPath>
    </defs>
    <path d="M52 34C52 24 72 18 110 18C148 18 168 24 168 34L174 44H46L52 34Z" fill="url(#lidG)"/>
    <rect x="34" y="42" width="152" height="16" rx="8" fill="#FFFFFF"/>
    <rect x="36" y="54" width="148" height="10" rx="5" fill="#E2E8F0"/>
    <ellipse cx="110" cy="24" rx="44" ry="6" fill="#FFFFFF" opacity="0.9"/>
    <path d="M46 66H174L154 268C152.5 278 134 284 110 284C86 284 67.5 278 66 268L46 66Z" fill="url(#cupG)"/>
    <g clip-path="url(#bodyClipG)">
      <path d="M126 112C122 103 114 98 104 98C88 98 78 109 78 124C78 139 89 150 105 150C115 150 123 145 127 137" stroke="#FFFFFF" stroke-width="11" stroke-linecap="round" opacity="0.92"/>
      <circle cx="136" cy="108" r="5" fill="#BEF264"/>
      <path d="M48 164H172V286H48Z" fill="#134E4A"/>
      <rect x="48" y="164" width="32" height="32" fill="#EA580C"/>
      <rect x="80" y="164" width="30" height="32" fill="#0F766E"/>
      <rect x="110" y="164" width="32" height="32" fill="#84CC16"/>
      <rect x="142" y="164" width="30" height="32" fill="#F97316"/>
      <rect x="48" y="196" width="32" height="34" fill="#115E59"/>
      <rect x="80" y="196" width="30" height="34" fill="#E07A5F"/>
      <rect x="110" y="196" width="32" height="34" fill="#065F46"/>
      <rect x="142" y="196" width="30" height="34" fill="#14B8A6"/>
      <rect x="48" y="230" width="32" height="54" fill="#F59E0B"/>
      <rect x="80" y="230" width="30" height="54" fill="#0D9488"/>
      <rect x="110" y="230" width="32" height="54" fill="#B45309"/>
      <rect x="142" y="230" width="30" height="54" fill="#047857"/>
      <circle cx="64" cy="180" r="8" fill="#FEF3C7" opacity="0.85"/>
      <circle cx="126" cy="180" r="7" fill="#ECFCCB" opacity="0.9"/>
      <circle cx="95" cy="213" r="7" fill="#FFFFFF" opacity="0.75"/>
      <circle cx="126" cy="248" r="8" fill="#D9F99D" opacity="0.8"/>
      <path d="M52 66H74L84 284H64L52 66Z" fill="#FFFFFF" opacity="0.18"/>
      <path d="M148 66H174L154 284H136L148 66Z" fill="#0F172A" opacity="0.16"/>
    </g>
    <path d="M46 64H174" stroke="#0F172A" stroke-opacity="0.12" stroke-width="3"/>
  </svg>`);

export const FNB_CUP_JAVANESE_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 300" fill="none">
    <defs>
      <linearGradient id="cupJ" x1="40" y1="60" x2="180" y2="275" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#5C4033"/>
        <stop offset="55%" stop-color="#4A3228"/>
        <stop offset="100%" stop-color="#322019"/>
      </linearGradient>
      <linearGradient id="lidJ" x1="32" y1="22" x2="188" y2="66" gradientUnits="userSpaceOnUse">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="65%" stop-color="#F1F5F9"/>
        <stop offset="100%" stop-color="#E2E8F0"/>
      </linearGradient>
      <clipPath id="bodyClipJ">
        <path d="M46 66H174L154 268C152.5 278 134 284 110 284C86 284 67.5 278 66 268L46 66Z"/>
      </clipPath>
    </defs>
    <path d="M52 34C52 24 72 18 110 18C148 18 168 24 168 34L174 44H46L52 34Z" fill="url(#lidJ)"/>
    <rect x="34" y="42" width="152" height="16" rx="8" fill="#FFFFFF"/>
    <rect x="36" y="54" width="148" height="10" rx="5" fill="#E2E8F0"/>
    <ellipse cx="110" cy="24" rx="44" ry="6" fill="#FFFFFF" opacity="0.9"/>
    <path d="M46 66H174L154 268C152.5 278 134 284 110 284C86 284 67.5 278 66 268L46 66Z" fill="url(#cupJ)"/>
    <g clip-path="url(#bodyClipJ)">
      <path d="M126 112C122 103 114 98 104 98C88 98 78 109 78 124C78 139 89 150 105 150C115 150 123 145 127 137" stroke="#FFFFFF" stroke-width="11" stroke-linecap="round" opacity="0.94"/>
      <circle cx="136" cy="108" r="5" fill="#FDBA74"/>
      <path d="M48 164H172V286H48Z" fill="#231712"/>
      <rect x="48" y="164" width="32" height="32" fill="#0D9488"/>
      <rect x="80" y="164" width="30" height="32" fill="#EA580C"/>
      <rect x="110" y="164" width="32" height="32" fill="#78350F"/>
      <rect x="142" y="164" width="30" height="32" fill="#14B8A6"/>
      <rect x="48" y="196" width="32" height="34" fill="#D97706"/>
      <rect x="80" y="196" width="30" height="34" fill="#134E4A"/>
      <rect x="110" y="196" width="32" height="34" fill="#C2410C"/>
      <rect x="142" y="196" width="30" height="34" fill="#451A03"/>
      <rect x="48" y="230" width="32" height="54" fill="#0F766E"/>
      <rect x="80" y="230" width="30" height="54" fill="#9A3412"/>
      <rect x="110" y="230" width="32" height="54" fill="#115E59"/>
      <rect x="142" y="230" width="30" height="54" fill="#B45309"/>
      <circle cx="64" cy="180" r="8" fill="#CCFBF1" opacity="0.8"/>
      <circle cx="95" cy="180" r="7" fill="#FDE68A" opacity="0.85"/>
      <circle cx="126" cy="213" r="7" fill="#FED7AA" opacity="0.85"/>
      <circle cx="95" cy="248" r="8" fill="#FEF3C7" opacity="0.75"/>
      <path d="M52 66H74L84 284H64L52 66Z" fill="#FFFFFF" opacity="0.14"/>
      <path d="M148 66H174L154 284H136L148 66Z" fill="#000000" opacity="0.22"/>
    </g>
    <path d="M46 64H174" stroke="#0F172A" stroke-opacity="0.14" stroke-width="3"/>
  </svg>`);

export const DEFAULT_FNB_HERO_SLIDES: FnbHeroSlideItem[] = [
  {
    id: 'fhs_1',
    title: 'Bali Caramel Latte',
    price: 'Rp 35.000',
    subtitle: 'Espresso Kintamani · Susu Segar · Saus Karamel Gurih',
    description:
      'Perpaduan biji Arabika Bali Kintamani panggang medium dengan susu creamy dan sirup karamel buatan sendiri.',
    badge: 'Best Seller',
    image: FNB_CUP_CARAMEL_SVG,
    gradientFrom: '#FF9A7B',
    gradientTo: '#FFB778',
    titleColor: '#B5836D',
    variants: 'Regular, Large, Less Sugar, Extra Shot',
  },
  {
    id: 'fhs_2',
    title: 'Atjeh Green Coffee',
    price: 'Rp 39.000',
    subtitle: 'Gayo Green Bean · Matcha Herbal · Segar & Aromatik',
    description:
      'Seduhan khas biji hijau Aceh Gayo yang lembut berpadu aroma herbal segar dan manis seimbang.',
    badge: 'Signature',
    image: FNB_CUP_GREEN_SVG,
    gradientFrom: '#1FB98B',
    gradientTo: '#84DA6E',
    titleColor: '#6C9A7F',
    variants: 'Regular, Large, Oat Milk, Less Ice',
  },
  {
    id: 'fhs_3',
    title: 'Black Javanese',
    price: 'Rp 42.000',
    subtitle: 'Single Origin Java · Gula Aren Organik · Bold & Smooth',
    description:
      'Kopi hitam pekat khas pegunungan Jawa dengan sentuhan karamel alami gula aren dan aftertaste cokelat.',
    badge: 'Favorit',
    image: FNB_CUP_JAVANESE_SVG,
    gradientFrom: '#9E5C2E',
    gradientTo: '#C78E5A',
    titleColor: '#9E7458',
    variants: 'Hot, Iced, Less Sugar, Double Shot',
  },
];

// Top-Down Transparent Culinary Dish SVGs for "Slide Kuliner Putar"
export const CULINARY_DISH_NOODLE_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260" fill="none">
    <defs>
      <radialGradient id="cnPlate" cx="45%" cy="40%" r="58%">
        <stop offset="0%" stop-color="#FAF6EE"/>
        <stop offset="82%" stop-color="#E7DEC8"/>
        <stop offset="100%" stop-color="#C8BC9F"/>
      </radialGradient>
      <radialGradient id="cnYolk" cx="40%" cy="35%" r="60%">
        <stop offset="0%" stop-color="#FDE047"/>
        <stop offset="65%" stop-color="#F59E0B"/>
        <stop offset="100%" stop-color="#D97706"/>
      </radialGradient>
    </defs>
    <circle cx="130" cy="126" r="106" fill="url(#cnPlate)" stroke="#D6CCB2" stroke-width="4"/>
    <circle cx="130" cy="126" r="88" fill="#EFE7D6" stroke="#DFD5BF" stroke-width="2"/>
    <g stroke="#B47B32" stroke-width="7" stroke-linecap="round" fill="none">
      <path d="M74 106C92 80 132 76 164 92"/>
      <path d="M68 124C98 96 144 96 180 116"/>
      <path d="M78 144C108 118 152 122 184 140"/>
      <path d="M88 162C116 144 156 148 176 160"/>
    </g>
    <g stroke="#EAB308" stroke-width="4" stroke-linecap="round" fill="none" opacity="0.8">
      <path d="M82 98C104 82 140 84 166 102"/>
      <path d="M74 134C104 114 146 112 178 130"/>
      <path d="M92 156C122 138 152 140 172 152"/>
    </g>
    <ellipse cx="164" cy="154" rx="22" ry="12" transform="rotate(-24 164 154)" fill="#15803D"/>
    <ellipse cx="176" cy="136" rx="18" ry="10" transform="rotate(-48 176 136)" fill="#22C55E"/>
    <ellipse cx="152" cy="166" rx="16" ry="8" transform="rotate(-12 152 166)" fill="#166534"/>
    <path d="M104 108C92 118 92 144 112 154C132 164 158 152 162 132C166 110 144 94 122 98C114 100 108 104 104 108Z" fill="#FFFDF7" stroke="#F1E8D6" stroke-width="2"/>
    <circle cx="128" cy="126" r="19" fill="url(#cnYolk)"/>
    <ellipse cx="122" cy="120" rx="6" ry="4" transform="rotate(-24 122 120)" fill="#FEF9C3" opacity="0.85"/>
    <circle cx="94" cy="112" r="5" fill="#78350F"/>
    <circle cx="158" cy="96" r="6" fill="#92400E"/>
    <circle cx="110" cy="168" r="5" fill="#78350F"/>
    <path d="M48 212H166C174 212 180 207 180 202C180 197 174 192 166 192H48V212Z" fill="#B59F6B" opacity="0.92"/>
    <path d="M168 194H212M168 202H214M168 210H212" stroke="#A18854" stroke-width="3.2" stroke-linecap="round"/>
  </svg>`);

export const CULINARY_DISH_PANCAKE_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260" fill="none">
    <defs>
      <radialGradient id="cpPan" cx="45%" cy="40%" r="58%">
        <stop offset="0%" stop-color="#334155"/>
        <stop offset="80%" stop-color="#1E293B"/>
        <stop offset="100%" stop-color="#0F172A"/>
      </radialGradient>
      <radialGradient id="cpCake" cx="42%" cy="38%" r="60%">
        <stop offset="0%" stop-color="#FDE68A"/>
        <stop offset="55%" stop-color="#D97706"/>
        <stop offset="100%" stop-color="#92400E"/>
      </radialGradient>
    </defs>
    <rect x="208" y="114" width="38" height="24" rx="12" fill="#1E293B"/>
    <circle cx="126" cy="126" r="102" fill="url(#cpPan)" stroke="#0F172A" stroke-width="5"/>
    <circle cx="126" cy="126" r="88" fill="#111827"/>
    <circle cx="126" cy="128" r="78" fill="url(#cpCake)"/>
    <circle cx="124" cy="124" r="66" fill="#EAB308" opacity="0.45"/>
    <path d="M84 114C102 100 142 102 166 122C150 144 106 154 84 114Z" fill="#B45309" opacity="0.35"/>
    <path d="M114 96C126 88 144 96 146 112C134 118 118 112 114 96Z" fill="#FACC15"/>
    <path d="M100 116C114 106 132 114 134 130C120 136 104 130 100 116Z" fill="#FB923C"/>
    <path d="M126 112C140 104 156 114 154 130C140 134 126 126 126 112Z" fill="#F59E0B"/>
    <circle cx="94" cy="156" r="9" fill="#1E3A8A"/>
    <circle cx="91" cy="153" r="2.5" fill="#93C5FD"/>
    <circle cx="114" cy="170" r="10" fill="#1D4ED8"/>
    <circle cx="111" cy="167" r="2.8" fill="#93C5FD"/>
    <circle cx="140" cy="172" r="9" fill="#1E3A8A"/>
    <circle cx="137" cy="169" r="2.5" fill="#93C5FD"/>
    <circle cx="164" cy="156" r="10" fill="#1E40AF"/>
    <circle cx="161" cy="153" r="2.8" fill="#93C5FD"/>
    <circle cx="174" cy="132" r="8" fill="#1E3A8A"/>
  </svg>`);

export const CULINARY_DISH_POKE_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260" fill="none">
    <defs>
      <radialGradient id="pkBowl" cx="45%" cy="40%" r="58%">
        <stop offset="0%" stop-color="#FFFFFF"/>
        <stop offset="85%" stop-color="#E2E8F0"/>
        <stop offset="100%" stop-color="#CBD5E1"/>
      </radialGradient>
    </defs>
    <circle cx="130" cy="130" r="104" fill="url(#pkBowl)" stroke="#CBD5E1" stroke-width="4"/>
    <circle cx="130" cy="130" r="88" fill="#F8FAFC"/>
    <path d="M62 126C62 88 94 60 132 62V130H62Z" fill="#FB7185"/>
    <rect x="74" y="84" width="22" height="20" rx="5" fill="#F43F5E"/>
    <rect x="100" y="72" width="22" height="22" rx="5" fill="#FDA4AF"/>
    <rect x="86" y="104" width="24" height="20" rx="5" fill="#E11D48"/>
    <path d="M132 62C170 62 198 92 198 130H132V62Z" fill="#84CC16"/>
    <path d="M142 78C164 78 182 96 182 118H142V78Z" fill="#D9F99D"/>
    <path d="M132 130H198C196 168 166 196 130 196V130Z" fill="#FDE047"/>
    <circle cx="152" cy="150" r="8" fill="#F59E0B"/>
    <circle cx="170" cy="160" r="8" fill="#F59E0B"/>
    <circle cx="148" cy="172" r="8" fill="#EA580C"/>
    <path d="M64 130H130V196C92 196 64 166 64 130Z" fill="#4ADE80"/>
    <circle cx="96" cy="154" r="9" fill="#16A34A"/>
    <circle cx="112" cy="172" r="9" fill="#15803D"/>
    <circle cx="82" cy="168" r="8" fill="#22C55E"/>
    <circle cx="130" cy="130" r="16" fill="#0F172A"/>
    <circle cx="126" cy="126" r="3" fill="#F8FAFC"/>
    <circle cx="135" cy="128" r="2.5" fill="#F8FAFC"/>
    <circle cx="130" cy="136" r="2.5" fill="#F8FAFC"/>
  </svg>`);

export const DEFAULT_CULINARY_SPIN_SLIDES: FnbHeroSlideItem[] = [
  {
    id: 'cs_1',
    title: 'Truffle Egg Noodles',
    price: 'Rp 54.000',
    subtitle: 'Mie Artisan · Jamur Panggang · Telur Omega',
    description:
      'Mie kenyal berlumur minyak truffle harum, jamur panggang gurih, sayuran segar, dan telur mata sapi setengah matang.',
    badge: 'Chef Choice',
    image: CULINARY_DISH_NOODLE_SVG,
    gradientFrom: '#F59E0B',
    gradientTo: '#FDE68A',
    titleColor: '#1E293B',
    variants: 'Original, Pedas, Extra Telur',
  },
  {
    id: 'cs_2',
    title: 'Skillet Berry Pancake',
    price: 'Rp 48.000',
    subtitle: 'Fluffy Pancake · Blueberry Segar · Madu Jeruk',
    description:
      'Pancake panggang hangat di atas wajan besi dengan topping blueberry segar, irisan jeruk manis, dan sirup maple.',
    badge: 'Best Seller',
    image: CULINARY_DISH_PANCAKE_SVG,
    gradientFrom: '#F43F5E',
    gradientTo: '#FDA4AF',
    titleColor: '#1E293B',
    variants: 'Maple Syrup, Ice Cream, Extra Berry',
  },
  {
    id: 'cs_3',
    title: 'Salmon Avocado Bowl',
    price: 'Rp 68.000',
    subtitle: 'Salmon Sashimi · Alpukat Mentega · Edamame',
    description:
      'Semangkuk sehat salmon segar, potongan alpukat lembut, edamame, jagung manis, dan saus wijen panggang.',
    badge: 'Healthy',
    image: CULINARY_DISH_POKE_SVG,
    gradientFrom: '#10B981',
    gradientTo: '#6EE7B7',
    titleColor: '#1E293B',
    variants: 'Nasi Jepang, Quinoa, Saus Wijen',
  },
];

// Floating 3D Puffer Jacket SVGs for "Studio Produk Melayang" (Video 2)
function buildPufferJacketSvg(
  main: string,
  highlight: string,
  shade: string,
  zip: string
): string {
  return (
    'data:image/svg+xml;utf8,' +
    encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 260" fill="none">
      <defs>
        <linearGradient id="pjMain" x1="20%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stop-color="${highlight}"/>
          <stop offset="52%" stop-color="${main}"/>
          <stop offset="100%" stop-color="${shade}"/>
        </linearGradient>
        <linearGradient id="pjArm" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stop-color="${highlight}"/>
          <stop offset="100%" stop-color="${shade}"/>
        </linearGradient>
      </defs>
      <path d="M98 42C98 34 108 30 130 30C152 30 162 34 162 42L166 66H94L98 42Z" fill="url(#pjMain)" stroke="${shade}" stroke-width="2.5"/>
      <ellipse cx="130" cy="36" rx="28" ry="6" fill="${shade}" opacity="0.55"/>
      <path d="M74 64C54 70 42 98 34 140L24 198C22 208 30 214 40 214H56C64 214 68 206 72 190L84 128L74 64Z" fill="url(#pjArm)" stroke="${shade}" stroke-width="2.5" stroke-linejoin="round"/>
      <path d="M186 64C206 70 218 98 226 140L236 198C238 208 230 214 220 214H204C196 214 192 206 188 190L176 128L186 64Z" fill="url(#pjArm)" stroke="${shade}" stroke-width="2.5" stroke-linejoin="round"/>
      <rect x="66" y="60" width="128" height="142" rx="30" fill="url(#pjMain)" stroke="${shade}" stroke-width="2.5"/>
      <path d="M68 96C94 104 166 104 192 96" stroke="${shade}" stroke-width="3" opacity="0.55"/>
      <path d="M68 134C94 142 166 142 192 134" stroke="${shade}" stroke-width="3" opacity="0.55"/>
      <path d="M68 170C94 178 166 178 192 170" stroke="${shade}" stroke-width="3" opacity="0.55"/>
      <path d="M40 104C52 108 64 108 78 104" stroke="${shade}" stroke-width="2.5" opacity="0.5"/>
      <path d="M32 146C44 150 58 150 72 146" stroke="${shade}" stroke-width="2.5" opacity="0.5"/>
      <path d="M26 184C38 188 52 188 64 184" stroke="${shade}" stroke-width="2.5" opacity="0.5"/>
      <path d="M182 104C196 108 208 108 220 104" stroke="${shade}" stroke-width="2.5" opacity="0.5"/>
      <path d="M188 146C202 150 216 150 228 146" stroke="${shade}" stroke-width="2.5" opacity="0.5"/>
      <path d="M196 184C208 188 222 188 234 184" stroke="${shade}" stroke-width="2.5" opacity="0.5"/>
      <line x1="130" y1="62" x2="130" y2="202" stroke="${zip}" stroke-width="3.5" stroke-linecap="round"/>
      <path d="M88 136V174M172 136V174" stroke="${shade}" stroke-width="3" stroke-linecap="round" opacity="0.7"/>
      <ellipse cx="102" cy="82" rx="18" ry="8" fill="#FFFFFF" opacity="0.22"/>
      <ellipse cx="102" cy="118" rx="18" ry="8" fill="#FFFFFF" opacity="0.18"/>
      <ellipse cx="158" cy="118" rx="18" ry="8" fill="#FFFFFF" opacity="0.14"/>
    </svg>`)
  );
}

export const STUDIO_JACKET_GREY_SVG = buildPufferJacketSvg('#D4D7DD', '#F3F4F6', '#9CA3AF', '#6B7280');
export const STUDIO_JACKET_BLACK_SVG = buildPufferJacketSvg('#2B2D31', '#4B5563', '#111315', '#09090B');
export const STUDIO_JACKET_ORANGE_SVG = buildPufferJacketSvg('#EA580C', '#FB923C', '#9A3412', '#7C2D12');
export const STUDIO_JACKET_RED_SVG = buildPufferJacketSvg('#DC2626', '#F87171', '#991B1B', '#7F1D1D');

export const DEFAULT_FLOATING_STUDIO_SLIDES: FnbHeroSlideItem[] = [
  {
    id: 'fs_1',
    title: 'Cloud Puffer Jacket',
    price: 'Rp 799.000',
    subtitle: 'Edisi Cloud Grey · Ringan & Tahan Angin',
    description:
      'Jaket puffer berlapis down sintetis ultra-ringan dengan siluet cropped modern dan bahan water-repellent.',
    badge: 'New Drop',
    image: STUDIO_JACKET_GREY_SVG,
    gradientFrom: '#B0B6BE',
    gradientTo: '#7A828E',
    titleColor: '#FFFFFF',
    variants: 'S, M, L, XL',
  },
  {
    id: 'fs_2',
    title: 'Obsidian Puffer Jacket',
    price: 'Rp 829.000',
    subtitle: 'Edisi Matte Black · Minimalis & Hangat',
    description:
      'Finishing matte hitam pekat dengan kerah tinggi pelindung angin dan saku ritsleting tersembunyi.',
    badge: 'Best Seller',
    image: STUDIO_JACKET_BLACK_SVG,
    gradientFrom: '#3B3F46',
    gradientTo: '#17191D',
    titleColor: '#FFFFFF',
    variants: 'S, M, L, XL',
  },
  {
    id: 'fs_3',
    title: 'Sunset Puffer Jacket',
    price: 'Rp 849.000',
    subtitle: 'Edisi Burnt Orange · Statement Streetwear',
    description:
      'Warna oranye ikonik dengan kilau satin halus untuk tampilan streetwear penuh karakter.',
    badge: 'Limited',
    image: STUDIO_JACKET_ORANGE_SVG,
    gradientFrom: '#E07019',
    gradientTo: '#9A3F06',
    titleColor: '#FFFFFF',
    variants: 'S, M, L, XL',
  },
  {
    id: 'fs_4',
    title: 'Crimson Puffer Jacket',
    price: 'Rp 859.000',
    subtitle: 'Edisi Glossy Red · Bold Winter Edition',
    description:
      'Merah menyala berkarakter dengan insulasi termal hangat dan potongan bahu presisi.',
    badge: 'Hot',
    image: STUDIO_JACKET_RED_SVG,
    gradientFrom: '#C81E1E',
    gradientTo: '#7F0B0B',
    titleColor: '#FFFFFF',
    variants: 'S, M, L, XL',
  },
];

function buildSneakerPairSvg(opts: {
  upperMain: string;
  upperSecondary: string;
  midsole: string;
  accent: string;
  lace: string;
  outsole: string;
}): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 280 180" width="280" height="180">
  <defs>
    <linearGradient id="u1" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="${opts.upperSecondary}"/>
      <stop offset="55%" stop-color="${opts.upperMain}"/>
      <stop offset="100%" stop-color="${opts.outsole}"/>
    </linearGradient>
    <linearGradient id="ms" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${opts.midsole}"/>
      <stop offset="100%" stop-color="#D7DCE3"/>
    </linearGradient>
    <filter id="sh" x="-15%" y="-15%" width="130%" height="145%">
      <feDropShadow dx="0" dy="6" stdDeviation="5" flood-color="#1E130A" flood-opacity="0.28"/>
    </filter>
  </defs>
  <!-- Back Shoe (Right Foot, slightly angled behind) -->
  <g transform="translate(18, 6) rotate(-5 120 75)" filter="url(#sh)">
    <path d="M24,62 C26,42 48,30 74,30 C92,30 108,38 128,44 C156,52 192,50 222,58 C238,62 246,72 242,82 C236,92 204,96 154,96 C94,96 34,94 24,84 C19,79 21,70 24,62 Z" fill="url(#u1)"/>
    <path d="M22,78 C54,84 114,84 176,82 C210,80 236,76 244,70 C246,78 242,88 228,93 C196,100 116,101 52,98 C30,96 20,90 22,78 Z" fill="url(#ms)"/>
    <path d="M24,91 C68,97 154,98 232,90 C236,92 232,96 218,98 C166,104 78,104 34,98 C24,96 22,93 24,91 Z" fill="${opts.outsole}"/>
    <path d="M36,80 C50,82 68,82 84,81 L82,91 C64,92 48,91 34,88 Z" fill="${opts.accent}"/>
    <path d="M84,42 C96,46 112,50 128,54" stroke="${opts.lace}" stroke-width="3.2" stroke-linecap="round" fill="none"/>
    <path d="M96,38 C108,42 122,46 138,50" stroke="${opts.lace}" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M112,68 C134,74 162,72 194,61 C166,78 134,81 108,74 Z" fill="${opts.accent}"/>
    <ellipse cx="64" cy="44" rx="22" ry="9" fill="#181A20" opacity="0.72"/>
  </g>
  <!-- Front Shoe (Left Foot, crisp foreground) -->
  <g transform="translate(8, 52) rotate(3 130 62)" filter="url(#sh)">
    <path d="M26,56 C28,34 52,22 78,22 C96,22 114,32 134,39 C164,49 200,47 230,56 C248,61 255,73 250,84 C243,95 210,100 158,100 C96,100 36,97 26,86 C20,80 22,66 26,56 Z" fill="url(#u1)"/>
    <path d="M48,26 C64,22 86,28 106,36 C128,44 150,48 176,52 L166,64 C136,60 108,52 80,44 C64,40 50,36 48,26 Z" fill="${opts.upperSecondary}" opacity="0.88"/>
    <path d="M24,74 C60,81 124,81 186,79 C220,78 244,73 252,67 C255,76 250,87 236,93 C202,101 118,103 52,99 C30,97 20,89 24,74 Z" fill="url(#ms)"/>
    <path d="M26,90 C72,97 160,99 240,90 C244,93 240,98 224,100 C172,106 80,106 36,100 C25,98 23,94 26,90 Z" fill="${opts.outsole}"/>
    <path d="M38,78 C54,81 74,82 94,80 L92,92 C72,93 52,92 36,88 Z" fill="${opts.accent}"/>
    <path d="M126,82 C142,83 158,83 172,82 L170,92 C156,93 140,93 126,92 Z" fill="${opts.accent}" opacity="0.85"/>
    <path d="M88,36 C102,41 118,46 134,50" stroke="${opts.lace}" stroke-width="3.6" stroke-linecap="round" fill="none"/>
    <path d="M102,32 C116,37 132,42 148,46" stroke="${opts.lace}" stroke-width="3.4" stroke-linecap="round" fill="none"/>
    <path d="M116,29 C130,34 144,39 158,43" stroke="${opts.lace}" stroke-width="3.2" stroke-linecap="round" fill="none"/>
    <path d="M116,64 C140,71 170,69 204,56 C174,76 140,80 112,71 Z" fill="${opts.accent}"/>
    <ellipse cx="66" cy="39" rx="23" ry="10" fill="#181A20" opacity="0.78"/>
  </g>
</svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

export const BOX_SHOE_PRESTO_SVG = buildSneakerPairSvg({
  upperMain: '#283655',
  upperSecondary: '#F8FAFC',
  midsole: '#FFFFFF',
  accent: '#F46A1F',
  lace: '#FFFFFF',
  outsole: '#1E293B',
});

export const BOX_SHOE_AIRMAX_SVG = buildSneakerPairSvg({
  upperMain: '#E2E8F0',
  upperSecondary: '#FFFFFF',
  midsole: '#F8FAFC',
  accent: '#2563EB',
  lace: '#94A3B8',
  outsole: '#1E293B',
});

export const BOX_SHOE_VAPORMAX_SVG = buildSneakerPairSvg({
  upperMain: '#27292F',
  upperSecondary: '#4B505C',
  midsole: '#3A3F4B',
  accent: '#7DD3FC',
  lace: '#64748B',
  outsole: '#111318',
});

export const DEFAULT_INTERACTIVE_BOX_ITEMS: InteractiveBoxItem[] = [
  {
    id: 'ibs_1',
    category: "MEN'S SHOE",
    title: 'Nike React Presto Rabid Panda',
    price: '$110',
    rating: '4.5',
    image: BOX_SHOE_PRESTO_SVG,
    variants: '40, 41, 42, 43, 44',
  },
  {
    id: 'ibs_2',
    category: "MEN'S SHOE",
    title: 'Nike Air Max 270',
    price: '$150',
    rating: '4.8',
    image: BOX_SHOE_AIRMAX_SVG,
    variants: '40, 41, 42, 43, 44',
  },
  {
    id: 'ibs_3',
    category: "MEN'S SHOE",
    title: 'Nike Air VaporMax Flyknit 2',
    price: '$190',
    rating: '4.6',
    image: BOX_SHOE_VAPORMAX_SVG,
    variants: '40, 41, 42, 43, 44',
  },
];

export const POPOUT_SHOE_RED_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 180" fill="none">
    <path d="M26 116C20 128 24 142 42 146C76 153 162 152 216 144C236 141 246 129 242 117C239 109 228 106 214 106C190 106 168 92 152 68C144 56 135 45 123 43C115 42 108 50 104 60C96 80 78 93 52 98C38 101 30 107 26 116Z" fill="#B91C1C"/>
    <path d="M36 116C52 106 80 102 100 84C111 74 117 58 124 48C136 52 146 68 158 84C172 102 195 112 222 112C232 112 238 117 238 124C212 134 146 139 76 136C52 135 34 128 36 116Z" fill="#DC2626"/>
    <path d="M84 96C106 88 128 70 144 64C154 78 168 98 188 108C164 119 124 124 88 119C78 117 75 101 84 96Z" fill="#FFFFFF"/>
    <path d="M108 66L136 86M100 76L128 94M92 86L118 102" stroke="#111827" stroke-width="5" stroke-linecap="round"/>
    <path d="M114 64L134 78M106 74L126 88M98 84L116 96" stroke="#FFFFFF" stroke-width="2.2" stroke-linecap="round"/>
    <path d="M122 46C128 36 138 30 146 32C149 33 148 41 142 52L134 62Z" fill="#111827"/>
    <path d="M214 106C222 93 231 86 236 88C240 90 237 101 228 110Z" fill="#991B1B"/>
    <path d="M116 105C134 109 156 105 174 92C162 110 141 118 118 115C112 114 111 104 116 105Z" fill="#111827"/>
    <path d="M24 134C22 146 34 155 56 157C112 162 184 158 228 147C242 143 248 134 244 124C240 119 231 122 216 125C168 135 102 138 50 132C35 130 26 129 24 134Z" fill="#F8FAFC"/>
    <path d="M40 151C76 156 130 157 176 152C196 150 220 146 238 138C234 146 220 152 198 156C148 164 82 165 44 158C35 156 34 150 40 151Z" fill="#1E293B"/>
    <rect x="172" y="135" width="34" height="9" rx="4.5" fill="#111827"/>
    <rect x="177" y="137.5" width="24" height="4" rx="2" fill="#EF4444" fill-opacity="0.7"/>
  </svg>`);

export const POPOUT_SHOE_AMBER_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 180" fill="none">
    <path d="M26 118C22 129 28 143 48 147C94 155 168 152 218 143C236 139 244 127 240 115C236 104 224 100 208 101C186 102 168 88 154 64C146 50 136 42 126 44C118 46 112 56 106 67C96 86 76 96 48 102C35 105 29 110 26 118Z" fill="#18181B"/>
    <path d="M104 68C114 50 124 44 136 46C148 48 160 68 176 88C190 103 210 105 232 104C239 109 241 118 238 125C208 133 162 136 124 132C112 114 102 90 104 68Z" fill="#D97706"/>
    <path d="M114 62C122 50 132 48 141 52C152 57 162 74 176 90C190 104 208 108 228 107C214 117 188 122 158 119C136 116 118 92 114 62Z" fill="#F59E0B"/>
    <path d="M126 100C150 106 178 102 204 86C188 108 160 118 130 112C122 110 121 98 126 100Z" fill="#FFFFFF"/>
    <path d="M98 76L122 92M90 86L114 102M82 96L106 110" stroke="#FBBF24" stroke-width="4" stroke-linecap="round"/>
    <path d="M24 135C22 146 34 155 56 157C114 162 186 157 228 146C242 142 248 133 244 123C239 118 228 122 210 126C162 136 98 138 48 132C34 130 26 130 24 135Z" fill="#FFFFFF"/>
    <path d="M36 151C78 158 146 159 208 150C224 147 236 142 242 135C236 144 222 151 200 155C144 164 80 165 40 157C32 155 31 150 36 151Z" fill="#0F172A"/>
    <path d="M214 128H230C234 128 237 131 236 135C235 138 231 140 226 141L214 142V128Z" fill="#18181B"/>
  </svg>`);

export const POPOUT_SHOE_BLUE_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 260 180" fill="none">
    <path d="M26 114C21 126 26 142 46 146C92 155 170 152 218 142C236 138 244 126 240 113C236 98 224 88 210 86C192 84 176 70 164 46C156 32 144 26 132 30C122 33 114 48 106 64C94 86 74 96 48 101C35 103 29 107 26 114Z" fill="#E2E8F0"/>
    <path d="M34 114C50 104 78 100 98 80C110 68 120 46 132 36C144 33 154 44 164 62C176 82 196 92 218 92C230 93 238 102 238 115C214 128 152 135 80 133C54 132 32 125 34 114Z" fill="#FFFFFF"/>
    <path d="M126 38C136 32 148 34 156 44L168 64L142 74L126 38Z" fill="#1E293B"/>
    <path d="M104 68L130 88M96 78L122 98M88 88L114 106" stroke="#0F172A" stroke-width="4.5" stroke-linecap="round"/>
    <path d="M122 104C148 108 178 100 206 80C188 108 158 119 126 116C118 115 117 103 122 104Z" fill="#0F172A"/>
    <path d="M24 134C22 146 34 156 58 158C114 163 186 158 228 147C242 143 248 133 244 123C239 118 228 122 212 126C162 136 98 138 48 131C34 129 26 129 24 134Z" fill="#F8FAFC"/>
    <path d="M34 144C78 152 154 152 232 135L236 144C186 159 102 164 42 155Z" fill="#3B82F6"/>
    <circle cx="62" cy="149" r="3.5" fill="#F43F5E"/>
    <circle cx="84" cy="152" r="3" fill="#FBBF24"/>
    <circle cx="112" cy="153" r="3.5" fill="#10B981"/>
    <circle cx="144" cy="152" r="3" fill="#EC4899"/>
    <circle cx="176" cy="148" r="3.5" fill="#FACC15"/>
    <circle cx="206" cy="142" r="3" fill="#F43F5E"/>
  </svg>`);

export const CAROUSEL_SAMPLE_1_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" fill="none">
    <defs>
      <linearGradient id="g1" x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
        <stop stop-color="#1D4ED8"/>
        <stop offset="1" stop-color="#0F172A"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#g1)"/>
    <circle cx="315" cy="95" r="78" fill="#3B82F6" fill-opacity="0.35"/>
    <rect x="64" y="116" width="272" height="168" rx="22" fill="#FFFFFF" fill-opacity="0.14" stroke="#93C5FD" stroke-opacity="0.45" stroke-width="2"/>
    <circle cx="144" cy="186" r="24" fill="#FDE047"/>
    <path d="M92 260L164 196L220 242L264 206L308 260H92Z" fill="#DBEAFE" fill-opacity="0.9"/>
  </svg>`);

export const CAROUSEL_SAMPLE_2_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" fill="none">
    <defs>
      <linearGradient id="g2" x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
        <stop stop-color="#059669"/>
        <stop offset="1" stop-color="#064E3B"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#g2)"/>
    <circle cx="96" cy="310" r="88" fill="#34D399" fill-opacity="0.28"/>
    <rect x="76" y="100" width="248" height="200" rx="24" fill="#FFFFFF" fill-opacity="0.16" stroke="#A7F3D0" stroke-opacity="0.5" stroke-width="2"/>
    <rect x="112" y="138" width="176" height="22" rx="11" fill="#ECFDF5"/>
    <rect x="112" y="176" width="132" height="14" rx="7" fill="#A7F3D0" fill-opacity="0.85"/>
    <rect x="112" y="216" width="110" height="40" rx="12" fill="#10B981"/>
  </svg>`);

export const CAROUSEL_SAMPLE_3_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400" fill="none">
    <defs>
      <linearGradient id="g3" x1="0" y1="0" x2="400" y2="400" gradientUnits="userSpaceOnUse">
        <stop stop-color="#D97706"/>
        <stop offset="1" stop-color="#7C2D12"/>
      </linearGradient>
    </defs>
    <rect width="400" height="400" fill="url(#g3)"/>
    <circle cx="290" cy="110" r="90" fill="#FBBF24" fill-opacity="0.3"/>
    <rect x="82" y="112" width="236" height="176" rx="22" fill="#FFFFFF" fill-opacity="0.15" stroke="#FDE68A" stroke-opacity="0.5" stroke-width="2"/>
    <circle cx="200" cy="186" r="38" fill="#FEF3C7"/>
    <path d="M188 172L218 186L188 200V172Z" fill="#B45309"/>
    <rect x="130" y="242" width="140" height="12" rx="6" fill="#FEF3C7" fill-opacity="0.85"/>
  </svg>`);

export const MAPS_LOCATION_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 270" fill="none">
    <defs>
      <linearGradient id="sky" x1="0" y1="0" x2="0" y2="160" gradientUnits="userSpaceOnUse">
        <stop stop-color="#CBD5E1"/>
        <stop offset="1" stop-color="#E2E8F0"/>
      </linearGradient>
    </defs>
    <rect width="480" height="270" fill="url(#sky)"/>
    <path d="M0 175 L480 175 L480 270 L0 270 Z" fill="#94A3B8"/>
    <path d="M35 270 L175 165 L305 165 L445 270 Z" fill="#CBD5E1"/>
    <rect x="172" y="34" width="136" height="128" rx="6" fill="#16A34A" stroke="#15803D" stroke-width="3"/>
    <rect x="70" y="92" width="102" height="70" rx="4" fill="#22C55E" stroke="#15803D" stroke-width="2"/>
    <rect x="86" y="108" width="70" height="44" rx="2" fill="#1E293B"/>
    <rect x="190" y="52" width="26" height="22" rx="2" fill="#E2E8F0"/>
    <rect x="227" y="52" width="26" height="22" rx="2" fill="#E2E8F0"/>
    <rect x="264" y="52" width="26" height="22" rx="2" fill="#E2E8F0"/>
    <rect x="190" y="88" width="100" height="20" rx="3" fill="#FFFFFF"/>
    <rect x="198" y="94" width="84" height="8" rx="2" fill="#2563EB"/>
    <rect x="202" y="122" width="76" height="40" rx="2" fill="#0F172A" fill-opacity="0.7"/>
    <rect x="278" y="142" width="24" height="16" rx="4" fill="#FFFFFF" stroke="#64748B" stroke-width="1.5"/>
    <circle cx="388" cy="116" r="32" fill="#15803D"/>
    <circle cx="388" cy="88" r="24" fill="#16A34A"/>
    <rect x="384" y="142" width="8" height="26" fill="#78350F"/>
    <path d="M225 220 L235 215 L230 225 Z" fill="#FFFFFF"/>
    <path d="M255 220 L245 215 L250 225 Z" fill="#FFFFFF"/>
  </svg>`);

export const HERO_COVER_WARM_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 320" fill="none">
    <defs>
      <linearGradient id="hc1" x1="0" y1="0" x2="600" y2="320" gradientUnits="userSpaceOnUse">
        <stop stop-color="#3F1D0B"/>
        <stop offset="0.55" stop-color="#5C2B10"/>
        <stop offset="1" stop-color="#1C0C05"/>
      </linearGradient>
    </defs>
    <rect width="600" height="320" fill="url(#hc1)"/>
    <circle cx="90" cy="40" r="22" fill="#FBBF24" fill-opacity="0.28"/>
    <circle cx="210" cy="36" r="18" fill="#FDE68A" fill-opacity="0.24"/>
    <circle cx="330" cy="44" r="24" fill="#F59E0B" fill-opacity="0.26"/>
    <circle cx="470" cy="38" r="20" fill="#FBBF24" fill-opacity="0.24"/>
    <ellipse cx="300" cy="285" rx="230" ry="62" fill="#92400E" fill-opacity="0.35"/>
    <circle cx="155" cy="245" r="46" fill="#EA580C" fill-opacity="0.5"/>
    <circle cx="300" cy="235" r="54" fill="#D97706" fill-opacity="0.48"/>
    <circle cx="445" cy="248" r="44" fill="#B45309" fill-opacity="0.48"/>
  </svg>`);

export const HERO_LOGO_FOOD_SVG =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 160" fill="none">
    <circle cx="80" cy="80" r="80" fill="#FFFFFF"/>
    <path d="M48 82C48 100 62 114 80 114C98 114 112 100 112 82H48Z" fill="#EA580C"/>
    <rect x="64" y="117" width="32" height="5" rx="2.5" fill="#EA580C"/>
    <rect x="68" y="42" width="6" height="34" rx="3" fill="#0F172A"/>
    <rect x="90" y="42" width="5" height="34" rx="2.5" fill="#EA580C"/>
    <path d="M84 42V58C84 62 87 65 92.5 65C98 65 101 62 101 58V42" stroke="#EA580C" stroke-width="4" stroke-linecap="round"/>
  </svg>`);

export const DEFAULT_FNB_ITEMS: FnbMenuItem[] = [
  {
    id: 'fnb_1',
    title: 'Nasi Goreng Spesial',
    description: 'Nasi goreng ayam, telur, acar, dan kerupuk.',
    category: 'Favorit',
    badge: 'Best seller',
    price: 'Rp 25.000',
    image: '',
    monogram: 'NA',
    monogramBg: '#FEE2E2',
    monogramColor: '#B91C1C',
  },
  {
    id: 'fnb_2',
    title: 'Ayam Bakar Madu',
    description: 'Ayam bakar bumbu manis gurih dengan sambal dan lalapan.',
    category: 'Favorit',
    badge: 'Paket lengkap',
    price: 'Rp 35.000',
    image: '',
    monogram: 'AY',
    monogramBg: '#FFEDD5',
    monogramColor: '#C2410C',
  },
  {
    id: 'fnb_3',
    title: 'Mie Tek-Tek Goreng',
    description: 'Mie goreng sayur dengan telur dan suwiran ayam.',
    category: 'Makanan',
    badge: 'Cepat dibuat',
    price: 'Rp 20.000',
    image: '',
    monogram: 'MI',
    monogramBg: '#FEF9C3',
    monogramColor: '#A16207',
  },
  {
    id: 'fnb_4',
    title: 'Es Kopi Susu Aren',
    description: 'Espresso blend segar dengan susu creamy dan gula aren murni.',
    category: 'Minuman',
    badge: 'Segar',
    price: 'Rp 18.000',
    image: '',
    monogram: 'KO',
    monogramBg: '#E0F2FE',
    monogramColor: '#0369A1',
  },
];

export const DEFAULT_CATEGORY_BUTTONS: CategoryJumpItem[] = [
  { id: 'cat_fav', label: 'Favorit', targetTitle: 'Favorit' },
  { id: 'cat_food', label: 'Makanan', targetTitle: 'Makanan' },
  { id: 'cat_drink', label: 'Minuman', targetTitle: 'Minuman' },
  { id: 'cat_pack', label: 'Paket Hemat', targetTitle: 'Paket Hemat' },
  { id: 'cat_snack', label: 'Cemilan', targetTitle: 'Cemilan' },
];

export const THEMES: PageTheme[] = [
  // Inspirasi Brand Populer
  {
    id: 'lynk-emerald',
    name: 'Lynk.id Emerald',
    category: 'brand',
    brandSource: 'lynk.id',
    canvasBg: '#F4FBF8',
    cardBg: '#FFFFFF',
    textColor: '#0F172A',
    accentColor: '#10B981',
    borderColor: '#D1FAE5',
  },
  {
    id: 'lynk-dark',
    name: 'Lynk.id Dark Mint',
    category: 'brand',
    brandSource: 'lynk.id',
    canvasBg: '#091511',
    cardBg: '#11241E',
    textColor: '#ECFDF5',
    accentColor: '#10B981',
    borderColor: '#1E3F35',
  },
  {
    id: 'shopee-orange',
    name: 'Shopee Oranye',
    category: 'brand',
    brandSource: 'shopee.co.id',
    canvasBg: '#FFF7F5',
    cardBg: '#FFFFFF',
    textColor: '#222222',
    accentColor: '#EE4D2D',
    borderColor: '#FCDAD2',
  },
  {
    id: 'shopee-flash',
    name: 'Shopee Coral Bold',
    category: 'brand',
    brandSource: 'shopee.co.id',
    canvasBg: '#FFECE8',
    cardBg: '#FFFFFF',
    textColor: '#2B1410',
    accentColor: '#D73211',
    borderColor: '#F8C4B8',
  },
  {
    id: 'tiket-blue',
    name: 'tiket.com Biru',
    category: 'brand',
    brandSource: 'tiket.com',
    canvasBg: '#F2F6FF',
    cardBg: '#FFFFFF',
    textColor: '#111827',
    accentColor: '#0064D2',
    borderColor: '#D6E4FF',
  },
  {
    id: 'tiket-night',
    name: 'tiket.com Navy',
    category: 'brand',
    brandSource: 'tiket.com',
    canvasBg: '#081833',
    cardBg: '#10274D',
    textColor: '#F8FAFC',
    accentColor: '#2E86FF',
    borderColor: '#1E3B6E',
  },
  {
    id: 'traveloka-sky',
    name: 'Traveloka Biru Langit',
    category: 'brand',
    brandSource: 'traveloka.com',
    canvasBg: '#EDF7FE',
    cardBg: '#FFFFFF',
    textColor: '#03121A',
    accentColor: '#0194F3',
    borderColor: '#C5E4FA',
  },
  {
    id: 'traveloka-deep',
    name: 'Traveloka Samudra',
    category: 'brand',
    brandSource: 'traveloka.com',
    canvasBg: '#052642',
    cardBg: '#0B365C',
    textColor: '#F0F9FF',
    accentColor: '#1BA0E2',
    borderColor: '#184F7D',
  },
  // Tema Dasar & Minimalis
  {
    id: 'minimal-light',
    name: 'Putih Minimalis',
    category: 'basic',
    canvasBg: '#F8FAFC',
    cardBg: '#FFFFFF',
    textColor: '#0F172A',
    accentColor: '#2563EB',
    borderColor: '#E2E8F0',
  },
  {
    id: 'soft-lavender',
    name: 'Lavender Lembut',
    category: 'basic',
    canvasBg: '#F5F3FF',
    cardBg: '#FFFFFF',
    textColor: '#1E1B4B',
    accentColor: '#4F46E5',
    borderColor: '#E0E7FF',
  },
  {
    id: 'warm-sand',
    name: 'Krem Hangat',
    category: 'basic',
    canvasBg: '#FAF7F2',
    cardBg: '#FFFFFF',
    textColor: '#292524',
    accentColor: '#D97706',
    borderColor: '#E7E5E4',
  },
  {
    id: 'mint-fresh',
    name: 'Hijau Segar',
    category: 'basic',
    canvasBg: '#F0FDF4',
    cardBg: '#FFFFFF',
    textColor: '#064E3B',
    accentColor: '#059669',
    borderColor: '#D1FAE5',
  },
  {
    id: 'midnight-slate',
    name: 'Gelap Elegan',
    category: 'basic',
    canvasBg: '#0F172A',
    cardBg: '#1E293B',
    textColor: '#F8FAFC',
    accentColor: '#3B82F6',
    borderColor: '#334155',
  },
  // Tema Tambahan & Estetik
  {
    id: 'tokopedia-green',
    name: 'Hijau Marketplace',
    category: 'aesthetic',
    canvasBg: '#F2FAF4',
    cardBg: '#FFFFFF',
    textColor: '#14261C',
    accentColor: '#00AA5B',
    borderColor: '#C8EBD2',
  },
  {
    id: 'rose-blush',
    name: 'Rose Pastel',
    category: 'aesthetic',
    canvasBg: '#FFF5F7',
    cardBg: '#FFFFFF',
    textColor: '#3B0D1C',
    accentColor: '#E11D48',
    borderColor: '#FECDD3',
  },
  {
    id: 'sunset-coral',
    name: 'Senja Tropis',
    category: 'aesthetic',
    canvasBg: '#FFF8F1',
    cardBg: '#FFFFFF',
    textColor: '#2E1A11',
    accentColor: '#F97316',
    borderColor: '#FED7AA',
  },
  {
    id: 'teal-modern',
    name: 'Toska Modern',
    category: 'aesthetic',
    canvasBg: '#F0FDFA',
    cardBg: '#FFFFFF',
    textColor: '#0F2E2B',
    accentColor: '#0D9488',
    borderColor: '#CCFBF1',
  },
  {
    id: 'espresso-mocha',
    name: 'Kopi & Krem',
    category: 'aesthetic',
    canvasBg: '#F7F0E9',
    cardBg: '#FFFDFB',
    textColor: '#2C1D14',
    accentColor: '#9A4D1E',
    borderColor: '#E6D4C3',
  },
  {
    id: 'royal-gold',
    name: 'Hitam & Emas Mewah',
    category: 'aesthetic',
    canvasBg: '#12110E',
    cardBg: '#1E1B16',
    textColor: '#FAF6ED',
    accentColor: '#D4AF37',
    borderColor: '#3A3222',
  },
];

export const DEFAULT_STYLE: BlockStyle = {
  blur: 0,
  align: 'center',
  widthPercent: 100,
  minHeight: 40,
  borderRadius: 14,
  shadow: 'none',
  borderWidth: 0,
  borderColor: '#E2E8F0',
  backgroundColor: 'transparent',
  textColor: '#0F172A',
  useThemeTextColor: true,
  padding: 12,
  fullBleed: false,
  marginBottom: 12,
};

export const DEFAULT_ADVANCE_OPTIONS: AdvanceOptions = {
  showUnitSold: false,
  blockLayout: 'default',
};

export const BOX_REVEAL_WATCH_ROSE_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="220" height="220">
      <defs>
        <linearGradient id="strapRose" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#3E1813"/>
          <stop offset="50%" stop-color="#6B2B20"/>
          <stop offset="100%" stop-color="#35130E"/>
        </linearGradient>
        <linearGradient id="bezelRose" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#F7DFC7"/>
          <stop offset="45%" stop-color="#C8936C"/>
          <stop offset="100%" stop-color="#8A573B"/>
        </linearGradient>
        <radialGradient id="dialWhite" cx="42%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="82%" stop-color="#F4F1EC"/>
          <stop offset="100%" stop-color="#DDD5CB"/>
        </radialGradient>
      </defs>
      <rect x="85" y="10" width="50" height="60" rx="8" fill="url(#strapRose)"/>
      <rect x="85" y="150" width="50" height="60" rx="8" fill="url(#strapRose)"/>
      <rect x="92" y="14" width="36" height="52" rx="4" fill="none" stroke="rgba(255,220,195,0.22)" stroke-width="1.5" stroke-dasharray="4 3"/>
      <rect x="92" y="154" width="36" height="52" rx="4" fill="none" stroke="rgba(255,220,195,0.22)" stroke-width="1.5" stroke-dasharray="4 3"/>
      <rect x="163" y="101" width="11" height="18" rx="3" fill="url(#bezelRose)"/>
      <circle cx="110" cy="110" r="57" fill="url(#bezelRose)"/>
      <circle cx="110" cy="110" r="50" fill="url(#dialWhite)"/>
      <circle cx="110" cy="110" r="46" fill="none" stroke="#D8CEC2" stroke-width="1"/>
      <g stroke="#8E674C" stroke-width="2" stroke-linecap="round">
        <line x1="110" y1="67" x2="110" y2="75"/>
        <line x1="110" y1="145" x2="110" y2="153"/>
        <line x1="67" y1="110" x2="75" y2="110"/>
        <line x1="145" y1="110" x2="153" y2="110"/>
      </g>
      <g stroke="#B8A99A" stroke-width="1.3" stroke-linecap="round">
        <line x1="131.5" y1="72.8" x2="128.5" y2="78"/>
        <line x1="147.2" y1="88.5" x2="142" y2="91.5"/>
        <line x1="147.2" y1="131.5" x2="142" y2="128.5"/>
        <line x1="131.5" y1="147.2" x2="128.5" y2="142"/>
        <line x1="88.5" y1="147.2" x2="91.5" y2="142"/>
        <line x1="72.8" y1="131.5" x2="78" y2="128.5"/>
        <line x1="72.8" y1="88.5" x2="78" y2="91.5"/>
        <line x1="88.5" y1="72.8" x2="91.5" y2="78"/>
      </g>
      <line x1="110" y1="110" x2="91" y2="94" stroke="#3D2B22" stroke-width="3.2" stroke-linecap="round"/>
      <line x1="110" y1="110" x2="136" y2="88" stroke="#3D2B22" stroke-width="2.2" stroke-linecap="round"/>
      <line x1="110" y1="118" x2="110" y2="74" stroke="#B67852" stroke-width="1.2" stroke-linecap="round"/>
      <circle cx="110" cy="110" r="4" fill="#B67852"/>
    </svg>`
  );

export const BOX_REVEAL_WATCH_SILVER_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="220" height="220">
      <defs>
        <linearGradient id="strapDark" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#1E1D1C"/>
          <stop offset="50%" stop-color="#383533"/>
          <stop offset="100%" stop-color="#181716"/>
        </linearGradient>
        <linearGradient id="bezelSilver" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="50%" stop-color="#C6CCD4"/>
          <stop offset="100%" stop-color="#7E8690"/>
        </linearGradient>
        <radialGradient id="dialPearl" cx="42%" cy="35%" r="65%">
          <stop offset="0%" stop-color="#FFFFFF"/>
          <stop offset="84%" stop-color="#EEF1F4"/>
          <stop offset="100%" stop-color="#D4DAE0"/>
        </radialGradient>
      </defs>
      <rect x="85" y="10" width="50" height="60" rx="8" fill="url(#strapDark)"/>
      <rect x="85" y="150" width="50" height="60" rx="8" fill="url(#strapDark)"/>
      <rect x="163" y="101" width="11" height="18" rx="3" fill="url(#bezelSilver)"/>
      <circle cx="110" cy="110" r="57" fill="url(#bezelSilver)"/>
      <circle cx="110" cy="110" r="50" fill="url(#dialPearl)"/>
      <g stroke="#334155" stroke-width="2" stroke-linecap="round">
        <line x1="110" y1="67" x2="110" y2="75"/>
        <line x1="110" y1="145" x2="110" y2="153"/>
        <line x1="67" y1="110" x2="75" y2="110"/>
        <line x1="145" y1="110" x2="153" y2="110"/>
      </g>
      <line x1="110" y1="110" x2="94" y2="90" stroke="#1E293B" stroke-width="3.2" stroke-linecap="round"/>
      <line x1="110" y1="110" x2="138" y2="95" stroke="#1E293B" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="110" cy="110" r="4" fill="#64748B"/>
    </svg>`
  );

export const BOX_REVEAL_WATCH_DARK_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 220 220" width="220" height="220">
      <defs>
        <linearGradient id="strapTan" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stop-color="#6B442A"/>
          <stop offset="50%" stop-color="#9B6A44"/>
          <stop offset="100%" stop-color="#5E3A22"/>
        </linearGradient>
        <linearGradient id="bezelGold" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#F7E3A8"/>
          <stop offset="50%" stop-color="#C9A24D"/>
          <stop offset="100%" stop-color="#876623"/>
        </linearGradient>
        <radialGradient id="dialCharcoal" cx="45%" cy="38%" r="65%">
          <stop offset="0%" stop-color="#2E323A"/>
          <stop offset="100%" stop-color="#14161A"/>
        </radialGradient>
      </defs>
      <rect x="85" y="10" width="50" height="60" rx="8" fill="url(#strapTan)"/>
      <rect x="85" y="150" width="50" height="60" rx="8" fill="url(#strapTan)"/>
      <rect x="163" y="101" width="11" height="18" rx="3" fill="url(#bezelGold)"/>
      <circle cx="110" cy="110" r="57" fill="url(#bezelGold)"/>
      <circle cx="110" cy="110" r="50" fill="url(#dialCharcoal)"/>
      <g stroke="#E3C376" stroke-width="2" stroke-linecap="round">
        <line x1="110" y1="67" x2="110" y2="75"/>
        <line x1="110" y1="145" x2="110" y2="153"/>
        <line x1="67" y1="110" x2="75" y2="110"/>
        <line x1="145" y1="110" x2="153" y2="110"/>
      </g>
      <line x1="110" y1="110" x2="90" y2="95" stroke="#F8E7B9" stroke-width="3.2" stroke-linecap="round"/>
      <line x1="110" y1="110" x2="136" y2="86" stroke="#F8E7B9" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="110" cy="110" r="4" fill="#D4AF37"/>
    </svg>`
  );

export const DEFAULT_PRODUCT_BOX_REVEAL_ITEMS: ProductBoxRevealItem[] = [
  {
    id: 'pbr_1',
    title: 'Heritage Classic Rose',
    price: 'Rp 1.450.000',
    description: 'Jam tangan klasik dengan strap kulit premium dan kotak kayu walnut eksklusif.',
    variants: '38mm, 40mm, 42mm',
    image: BOX_REVEAL_WATCH_ROSE_SVG,
    boxColorOverride: '#5C3626',
  },
  {
    id: 'pbr_2',
    title: 'Minimalist Steel Edition',
    price: 'Rp 1.290.000',
    description: 'Desain minimalis berbalut baja tahan karat dengan kaca safir anti gores.',
    variants: 'Silver 38mm, Silver 40mm',
    image: BOX_REVEAL_WATCH_SILVER_SVG,
    boxColorOverride: '#4A3F36',
  },
  {
    id: 'pbr_3',
    title: 'Noir Gold Signature',
    price: 'Rp 1.650.000',
    description: 'Dial hitam elegan dengan aksen emas mewah, cocok untuk acara formal & hadiah.',
    variants: 'Black Leather, Gold Mesh',
    image: BOX_REVEAL_WATCH_DARK_SVG,
    boxColorOverride: '#A9866A',
  },
];

// --- MIX RASA: Circular Pizza Flavor Illustrations (matches reference infographic) ---
export const MIX_RASA_HAWAIIAN_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <radialGradient id="mh_crust" cx="50%" cy="50%" r="50%">
          <stop offset="82%" stop-color="#E79C4A"/>
          <stop offset="94%" stop-color="#D47E2C"/>
          <stop offset="100%" stop-color="#B8621E"/>
        </radialGradient>
        <radialGradient id="mh_cheese" cx="46%" cy="42%" r="54%">
          <stop offset="0%" stop-color="#FFE89E"/>
          <stop offset="70%" stop-color="#F6C85F"/>
          <stop offset="100%" stop-color="#DE9E36"/>
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="118" fill="url(#mh_crust)"/>
      <circle cx="120" cy="120" r="102" fill="#C94124"/>
      <circle cx="120" cy="120" r="97" fill="url(#mh_cheese)"/>
      <g fill="#E99184" stroke="#C96558" stroke-width="1.5">
        <rect x="64" y="54" width="22" height="16" rx="5" transform="rotate(-18 75 62)"/>
        <rect x="148" y="62" width="24" height="16" rx="5" transform="rotate(22 160 70)"/>
        <rect x="48" y="124" width="24" height="16" rx="5" transform="rotate(14 60 132)"/>
        <rect x="158" y="130" width="22" height="16" rx="5" transform="rotate(-24 169 138)"/>
        <rect x="104" y="168" width="24" height="16" rx="5" transform="rotate(8 116 176)"/>
        <rect x="106" y="88" width="22" height="16" rx="5" transform="rotate(-10 117 96)"/>
      </g>
      <g fill="#FFE14C" stroke="#D99B16" stroke-width="1.4">
        <polygon points="94,48 110,44 106,62 90,60"/>
        <polygon points="134,94 152,98 144,114 128,108"/>
        <polygon points="74,98 92,94 88,112 72,110"/>
        <polygon points="146,158 164,154 160,172 142,168"/>
        <polygon points="72,158 90,152 86,170 68,168"/>
        <polygon points="108,132 126,128 122,146 104,142"/>
        <polygon points="172,96 188,92 184,110 168,106"/>
        <polygon points="52,90 66,86 64,102 48,100"/>
      </g>
      <g fill="#4E9B3B" opacity="0.88">
        <circle cx="96" cy="80" r="3.5"/><circle cx="144" cy="128" r="3.5"/>
        <circle cx="84" cy="140" r="3.5"/><circle cx="132" cy="64" r="3"/>
      </g>
    </svg>`
  );

export const MIX_RASA_HAM_MUSHROOM_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <radialGradient id="mm_crust" cx="50%" cy="50%" r="50%">
          <stop offset="82%" stop-color="#E49644"/>
          <stop offset="94%" stop-color="#CF7A28"/>
          <stop offset="100%" stop-color="#B05D1B"/>
        </radialGradient>
        <radialGradient id="mm_base" cx="50%" cy="46%" r="52%">
          <stop offset="0%" stop-color="#FBE9C8"/>
          <stop offset="72%" stop-color="#EBCBA0"/>
          <stop offset="100%" stop-color="#D4A673"/>
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="118" fill="url(#mm_crust)"/>
      <circle cx="120" cy="120" r="102" fill="#C4452B"/>
      <circle cx="120" cy="120" r="97" fill="url(#mm_base)"/>
      <g fill="#E4887F" stroke="#BF6259" stroke-width="1.5">
        <path d="M58 68 Q74 52 90 66 Q82 86 62 82 Z"/>
        <path d="M142 56 Q162 52 172 72 Q156 86 140 74 Z"/>
        <path d="M46 130 Q62 114 78 130 Q70 150 50 144 Z"/>
        <path d="M158 122 Q178 116 186 138 Q168 152 154 138 Z"/>
        <path d="M98 164 Q118 154 134 172 Q122 190 100 182 Z"/>
        <path d="M104 96 Q124 88 136 106 Q122 122 104 114 Z"/>
      </g>
      <g fill="#B78F72" stroke="#6F513B" stroke-width="1.6">
        <path d="M94 54 C94 42 116 42 116 54 C116 60 110 60 109 68 L101 68 C100 60 94 60 94 54 Z"/>
        <path d="M150 96 C150 84 172 84 172 96 C172 102 166 102 165 110 L157 110 C156 102 150 102 150 96 Z"/>
        <path d="M68 102 C68 90 90 90 90 102 C90 108 84 108 83 116 L75 116 C74 108 68 108 68 102 Z"/>
        <path d="M132 146 C132 134 154 134 154 146 C154 152 148 152 147 160 L139 160 C138 152 132 152 132 146 Z"/>
        <path d="M74 162 C74 150 96 150 96 162 C96 168 90 168 89 176 L81 176 C80 168 74 168 74 162 Z"/>
        <path d="M108 128 C108 118 126 118 126 128 C126 133 121 133 120 140 L114 140 C113 133 108 133 108 128 Z"/>
      </g>
      <g fill="#5C7A43" opacity="0.82">
        <circle cx="132" cy="78" r="3"/><circle cx="88" cy="136" r="3"/>
        <circle cx="152" cy="126" r="3"/><circle cx="110" cy="84" r="2.8"/>
      </g>
    </svg>`
  );

export const MIX_RASA_PEPPERONI_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <radialGradient id="mp_crust" cx="50%" cy="50%" r="50%">
          <stop offset="82%" stop-color="#E59542"/>
          <stop offset="94%" stop-color="#CD7422"/>
          <stop offset="100%" stop-color="#AC5816"/>
        </radialGradient>
        <radialGradient id="mp_sauce" cx="48%" cy="46%" r="54%">
          <stop offset="0%" stop-color="#E55829"/>
          <stop offset="68%" stop-color="#C93818"/>
          <stop offset="100%" stop-color="#9F240D"/>
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="118" fill="url(#mp_crust)"/>
      <circle cx="120" cy="120" r="102" fill="url(#mp_sauce)"/>
      <circle cx="120" cy="120" r="95" fill="#F4C75C" opacity="0.58"/>
      <g fill="#B32018" stroke="#7A120D" stroke-width="2">
        <circle cx="84" cy="64" r="16"/>
        <circle cx="138" cy="58" r="16"/>
        <circle cx="172" cy="96" r="16"/>
        <circle cx="62" cy="112" r="16"/>
        <circle cx="116" cy="108" r="17"/>
        <circle cx="164" cy="148" r="16"/>
        <circle cx="76" cy="162" r="16"/>
        <circle cx="122" cy="168" r="16"/>
      </g>
      <g fill="#F0988C" opacity="0.65">
        <circle cx="80" cy="60" r="2.2"/><circle cx="89" cy="68" r="1.8"/>
        <circle cx="134" cy="54" r="2.2"/><circle cx="143" cy="62" r="1.8"/>
        <circle cx="112" cy="104" r="2.2"/><circle cx="121" cy="112" r="2"/>
        <circle cx="160" cy="144" r="2.2"/><circle cx="72" cy="158" r="2"/>
      </g>
      <g fill="#2F8B3C">
        <ellipse cx="104" cy="82" rx="7" ry="4" transform="rotate(-30 104 82)"/>
        <ellipse cx="148" cy="118" rx="7" ry="4" transform="rotate(28 148 118)"/>
        <ellipse cx="96" cy="138" rx="7" ry="4" transform="rotate(-18 96 138)"/>
        <ellipse cx="144" cy="172" rx="6" ry="3.5" transform="rotate(40 144 172)"/>
      </g>
    </svg>`
  );

export const MIX_RASA_BACON_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <radialGradient id="mb_crust" cx="50%" cy="50%" r="50%">
          <stop offset="82%" stop-color="#DF903E"/>
          <stop offset="94%" stop-color="#C6701E"/>
          <stop offset="100%" stop-color="#A65514"/>
        </radialGradient>
        <radialGradient id="mb_cheese" cx="50%" cy="46%" r="52%">
          <stop offset="0%" stop-color="#FFE08C"/>
          <stop offset="70%" stop-color="#F0B84A"/>
          <stop offset="100%" stop-color="#D48D2B"/>
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="118" fill="url(#mb_crust)"/>
      <circle cx="120" cy="120" r="102" fill="#B83B1D"/>
      <circle cx="120" cy="120" r="97" fill="url(#mb_cheese)"/>
      <g fill="#7A2418" stroke="#4F140C" stroke-width="1.6">
        <path d="M62 66 Q80 56 96 70 L90 82 Q74 70 58 78 Z"/>
        <path d="M134 56 Q154 52 170 68 L162 80 Q148 66 130 70 Z"/>
        <path d="M48 122 Q68 112 86 126 L80 138 Q64 126 44 134 Z"/>
        <path d="M148 118 Q168 110 186 126 L178 138 Q162 124 144 132 Z"/>
        <path d="M92 94 Q112 86 130 100 L124 112 Q108 100 88 108 Z"/>
        <path d="M74 162 Q94 152 112 168 L106 180 Q90 166 70 174 Z"/>
        <path d="M130 156 Q150 148 168 164 L160 176 Q144 162 126 170 Z"/>
      </g>
      <g fill="#E4A88B" opacity="0.65">
        <rect x="72" y="68" width="12" height="3" rx="1.5" transform="rotate(14 78 69)"/>
        <rect x="146" y="62" width="12" height="3" rx="1.5" transform="rotate(16 152 63)"/>
        <rect x="104" y="98" width="12" height="3" rx="1.5" transform="rotate(14 110 99)"/>
        <rect x="158" y="122" width="12" height="3" rx="1.5" transform="rotate(14 164 123)"/>
      </g>
    </svg>`
  );

export const MIX_RASA_BEEF_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <circle cx="120" cy="120" r="118" fill="#D88837"/>
      <circle cx="120" cy="120" r="102" fill="#B5371A"/>
      <circle cx="120" cy="120" r="97" fill="#F2BE57"/>
      <g fill="#61331E" stroke="#3F1E10" stroke-width="1.4">
        <circle cx="80" cy="68" r="12"/><circle cx="126" cy="60" r="11"/>
        <circle cx="164" cy="92" r="12"/><circle cx="66" cy="116" r="11"/>
        <circle cx="116" cy="114" r="13"/><circle cx="164" cy="144" r="12"/>
        <circle cx="84" cy="162" r="12"/><circle cx="130" cy="168" r="11"/>
        <circle cx="102" cy="86" r="9"/><circle cx="144" cy="124" r="10"/>
      </g>
      <g fill="#4E963D">
        <circle cx="98" cy="136" r="4"/><circle cx="142" cy="86" r="4"/>
        <circle cx="72" cy="92" r="3.5"/><circle cx="152" cy="166" r="3.5"/>
      </g>
    </svg>`
  );

export const MIX_RASA_CHEESE_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <defs>
        <radialGradient id="mc_cheese" cx="46%" cy="42%" r="54%">
          <stop offset="0%" stop-color="#FFF5C2"/>
          <stop offset="65%" stop-color="#FBD66B"/>
          <stop offset="100%" stop-color="#E5A832"/>
        </radialGradient>
      </defs>
      <circle cx="120" cy="120" r="118" fill="#E39946"/>
      <circle cx="120" cy="120" r="101" fill="url(#mc_cheese)"/>
      <g fill="#E29A2B" opacity="0.45">
        <circle cx="82" cy="72" r="14"/><circle cx="148" cy="78" r="16"/>
        <circle cx="162" cy="142" r="15"/><circle cx="76" cy="148" r="17"/>
        <circle cx="120" cy="116" r="18"/><circle cx="118" cy="172" r="12"/>
      </g>
      <g fill="#FFFDF0" opacity="0.72">
        <circle cx="96" cy="92" r="9"/><circle cx="146" cy="118" r="10"/>
        <circle cx="98" cy="152" r="8"/><circle cx="132" cy="64" r="7"/>
      </g>
      <g fill="#5C8D3E" opacity="0.7">
        <circle cx="114" cy="112" r="2.8"/><circle cx="134" cy="140" r="2.6"/><circle cx="86" cy="120" r="2.6"/>
      </g>
    </svg>`
  );

export const MIX_RASA_VEGGIE_SVG =
  'data:image/svg+xml;utf8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240">
      <circle cx="120" cy="120" r="118" fill="#DF9240"/>
      <circle cx="120" cy="120" r="102" fill="#C94122"/>
      <circle cx="120" cy="120" r="96" fill="#F8D26E"/>
      <g fill="none" stroke="#368E3C" stroke-width="5" stroke-linecap="round">
        <path d="M68 68 Q82 56 96 72"/><path d="M148 70 Q164 62 174 80"/>
        <path d="M58 134 Q72 122 86 138"/><path d="M148 148 Q166 138 176 156"/>
        <path d="M104 106 Q120 94 134 110"/>
      </g>
      <g fill="#D93226">
        <circle cx="116" cy="64" r="10"/><circle cx="164" cy="116" r="10"/>
        <circle cx="84" cy="162" r="10"/><circle cx="124" cy="156" r="9"/>
        <circle cx="78" cy="98" r="9"/>
      </g>
      <g fill="#2B2421">
        <circle cx="96" cy="82" r="5.5"/><circle cx="144" cy="98" r="5.5"/>
        <circle cx="102" cy="134" r="5.5"/><circle cx="144" cy="172" r="5.5"/>
      </g>
      <g fill="#F8D26E">
        <circle cx="96" cy="82" r="2"/><circle cx="144" cy="98" r="2"/>
        <circle cx="102" cy="134" r="2"/><circle cx="144" cy="172" r="2"/>
      </g>
    </svg>`
  );

export const DEFAULT_MIX_RASA_FLAVORS: MixRasaFlavorItem[] = [
  { id: 'mr_hawaiian', name: 'Hawaiian', price: 'Rp390.000', image: MIX_RASA_HAWAIIAN_SVG, accentColor: '#F59E0B' },
  { id: 'mr_ham_jamur', name: 'Ham & Jamur', price: 'Rp340.000', image: MIX_RASA_HAM_MUSHROOM_SVG, accentColor: '#D97757' },
  { id: 'mr_pepperoni', name: 'Pepperoni', price: 'Rp410.000', image: MIX_RASA_PEPPERONI_SVG, accentColor: '#DC2626' },
  { id: 'mr_don_bacon', name: 'Don Bacon', price: 'Rp410.000', image: MIX_RASA_BACON_SVG, accentColor: '#9A3412' },
  { id: 'mr_daging_sapi', name: 'Daging Sapi', price: 'Rp430.000', image: MIX_RASA_BEEF_SVG, accentColor: '#7C2D12' },
  { id: 'mr_keju', name: 'Keju', price: 'Rp320.000', image: MIX_RASA_CHEESE_SVG, accentColor: '#EAB308' },
  { id: 'mr_vegetarian', name: 'Vegetarian', price: 'Rp310.000', image: MIX_RASA_VEGGIE_SVG, accentColor: '#16A34A' },
];

export const DEFAULT_CATALOG_ITEMS: CatalogItem[] = [
  {
    id: 'cat_1',
    title: 'Paket Template Presentasi Lengkap',
    subtitle: '80+ slide siap pakai untuk pitching & laporan',
    badge: 'Terlaris',
    variants: 'Edisi Canva, Edisi PowerPoint, Paket Lengkap',
    description:
      'Koleksi 80+ template slide profesional yang mudah diubah warna, tipografi, dan grafiknya. Cocok untuk proposal klien, laporan bulanan, hingga presentasi produk.\n\nTermasuk:\n• 80+ layout slide modern\n• Panduan edit cepat\n• Akses update gratis selamanya',
    price: 'Rp 99.000',
    ctaLabel: 'Lihat Detail',
    url: 'https://example.com/produk-1',
    image: PRODUCT_CARD_SVG,
    unitSold: 142,
  },
  {
    id: 'cat_2',
    title: 'E-Book Panduan Konten Kreator',
    subtitle: 'Strategi monetisasi produk digital dari nol',
    badge: 'Best Value',
    variants: 'E-Book PDF, E-Book + Worksheet',
    description:
      'Panduan praktis langkah demi langkah membangun audiens organik dan mengubah konten menjadi sumber pemasukan rutin.\n\nCocok untuk pemula maupun kreator yang ingin merapikan alur penjualan.',
    price: 'Rp 65.000',
    ctaLabel: 'Lihat Detail',
    url: 'https://example.com/produk-2',
    image: STARTER_ILLUSTRATION_SVG,
    unitSold: 87,
  },
  {
    id: 'cat_3',
    title: 'Kit Desain Feed Sosial Media',
    subtitle: 'Format Figma & Canva siap edit cepat',
    badge: 'Baru',
    variants: 'Canva Only, Figma + Canva',
    description:
      'Lebih dari 50 template feed dan story Instagram yang konsisten untuk branding bisnis dan UMKM.\n\nTinggal ganti foto, teks, dan warna sesuai identitas usaha Anda.',
    price: 'Rp 129.000',
    ctaLabel: 'Lihat Detail',
    url: 'https://example.com/produk-3',
    image: PRODUCT_CARD_SVG,
    unitSold: 64,
  },
  {
    id: 'cat_4',
    title: 'Template Notion Finance Tracker',
    subtitle: 'Kelola arus kas & target tabungan bulanan',
    variants: 'Personal, Bisnis UMKM',
    description:
      'Dashboard Notion siap duplikasi untuk mencatat pemasukan, pengeluaran, piutang usaha, dan laporan laba rugi sederhana secara otomatis.',
    price: 'Rp 49.000',
    ctaLabel: 'Lihat Detail',
    url: 'https://example.com/produk-4',
    image: STARTER_ILLUSTRATION_SVG,
    unitSold: 215,
  },
];

export const DEFAULT_SOCIAL_ITEMS: SocialLinkItem[] = [
  { id: 'soc_ig', platform: 'instagram', url: 'https://instagram.com/studiokreatif', visible: true },
  { id: 'soc_tt', platform: 'tiktok', url: 'https://tiktok.com/@studiokreatif', visible: true },
  { id: 'soc_fb', platform: 'facebook', url: 'https://facebook.com/studiokreatif', visible: true },
  { id: 'soc_yt', platform: 'youtube', url: 'https://youtube.com/@studiokreatif', visible: true },
  { id: 'soc_wa', platform: 'whatsapp', url: 'https://wa.me/6281234567890', visible: true },
  { id: 'soc_th', platform: 'threads', url: 'https://threads.net/@studiokreatif', visible: true },
  { id: 'soc_tw', platform: 'twitter', url: 'https://x.com/studiokreatif', visible: true },
];

export const DEFAULT_CAROUSEL_ITEMS: CarouselItem[] = [
  {
    id: 'car_1',
    image: CAROUSEL_SAMPLE_1_SVG,
    title: 'Koleksi Foto Utama',
    caption: 'Geser ke samping untuk melihat detail produk dan dokumentasi terbaru.',
    url: '',
  },
  {
    id: 'car_2',
    image: CAROUSEL_SAMPLE_2_SVG,
    title: 'Detail Material & Warna',
    caption: 'Tampilan jernih dengan rasio fleksibel 1:1, 4:5, 9:16, hingga 16:9.',
    url: '',
  },
  {
    id: 'car_3',
    image: CAROUSEL_SAMPLE_3_SVG,
    title: 'Promo Spesial Minggu Ini',
    caption: 'Tambahkan tautan pada foto agar pengunjung bisa langsung menuju halaman promo.',
    url: '',
  },
];

export const DEFAULT_SOCIAL_FEED_POSTS: SocialPostItem[] = [
  {
    id: 'sf_post_1',
    mediaType: 'image',
    imageUrl: CAROUSEL_SAMPLE_1_SVG,
    videoUrl: '',
    caption: 'Rilis koleksi terbaru minggu ini! Geser ke samping untuk melihat postingan video & foto lainnya.',
    likes: '1,4 rb',
    comments: '68',
    url: '',
  },
  {
    id: 'sf_post_2',
    mediaType: 'video',
    imageUrl: CAROUSEL_SAMPLE_3_SVG,
    videoUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    caption: 'Cuplikan video behind-the-scenes proses pembuatan konten kreatif.',
    likes: '3,2 rb',
    comments: '142',
    url: '',
  },
  {
    id: 'sf_post_3',
    mediaType: 'image',
    imageUrl: CAROUSEL_SAMPLE_2_SVG,
    videoUrl: '',
    caption: 'Tips & panduan lengkap untuk meningkatkan engagement akun sosial media Anda.',
    likes: '980',
    comments: '41',
    url: '',
  },
];

export const DEFAULT_SOCIAL_FOLLOWER_ACCOUNTS: SocialFollowerAccount[] = [
  {
    id: 'sfa_default_1',
    platform: 'instagram',
    avatar: '',
    accountName: 'Studio Kreatif Nusantara',
    handle: '@studiokreatif',
    accountUrl: 'https://instagram.com/studiokreatif',
    verified: true,
    postsCount: '128',
    postsLabel: 'Postingan',
    followers: '45,8 rb',
    followersLabel: 'Follower',
    following: '312',
    followingLabel: 'Mengikuti',
    bio: '',
    followLabel: 'Ikuti',
  },
];

export const DEFAULT_PHYSICAL_CATALOG_ITEMS: CatalogItem[] = [
  {
    id: 'cat_phys_1',
    title: 'Paket Menu Spesial Keluarga',
    subtitle: 'Porsi 4 orang lengkap + sambal & lalapan',
    badge: 'Terlaris',
    variants: 'Original, Pedas Sedang, Extra Pedas',
    description:
      'Menu favorit keluarga diolah segar setiap hari. Bisa makan di tempat, ambil ke lokasi, atau dikirim langsung.',
    pickupNote: 'Estimasi masak ± 30 menit setelah pesanan diterima',
    price: 'Rp 125.000',
    ctaLabel: 'Lihat Detail',
    url: 'https://example.com/menu-1',
    image: PRODUCT_CARD_SVG,
    unitSold: 148,
  },
  {
    id: 'cat_phys_2',
    title: 'Paket Bento Hemat Harian',
    subtitle: 'Siap santap, praktis untuk acara & kantor',
    badge: 'Promo',
    variants: 'Ayam Bakar, Ayam Goreng, Daging Teriyaki',
    description:
      'Pilihan menu praktis dengan kemasan rapi dan higienis. Tersedia layanan pesan antar atau ambil langsung di lokasi.',
    pickupNote: 'Estimasi masak ± 30 menit',
    price: 'Rp 38.000',
    ctaLabel: 'Lihat Detail',
    url: 'https://example.com/menu-2',
    image: STARTER_ILLUSTRATION_SVG,
    unitSold: 230,
  },
];

export const DEFAULT_TRAINING_PROGRAMS: TrainingProgramItem[] = [
  {
    id: 'trn_1',
    badge: 'Pendaftaran Dibuka',
    title: 'Pelatihan & Sertifikasi Profesi',
    subtitle: 'Program intensif bersertifikat resmi + bimbingan praktik langsung',
    description:
      'Program pelatihan terstruktur bersama mentor praktisi berpengalaman.\n\nMateri meliputi:\n• Pembekalan teori & standar operasional lapangan\n• Simulasi praktik intensif & uji kompetensi\n• Konsultasi pasca-pelatihan & pendampingan berkas',
    originalPrice: 'Rp 2.500.000',
    price: 'Rp 1.850.000',
    discountLabel: 'Potongan Rp 650.000',
    cashbackLabel: 'Cashback Rp 150.000',
  },
  {
    id: 'trn_2',
    badge: 'Kelas Lanjutan',
    title: 'Bootcamp Kompetensi & Kesiapan Kerja',
    subtitle: 'Pendampingan intensif 7 hari + evaluasi portofolio',
    description:
      'Cocok bagi peserta yang ingin meningkatkan keterampilan praktis agar langsung siap terjun ke dunia kerja atau usaha mandiri.',
    originalPrice: 'Rp 1.750.000',
    price: 'Rp 1.250.000',
    discountLabel: 'Potongan Rp 500.000',
    cashbackLabel: 'Cashback Rp 100.000',
  },
];

export const DEFAULT_TRAINING_MEDIA: TrainingMediaItem[] = [
  {
    id: 'tm_1',
    type: 'image',
    imageUrl: CAROUSEL_SAMPLE_1_SVG,
    caption: 'Dokumentasi suasana sesi pembekalan materi & praktik kelas terbaru.',
    linkUrl: '',
    linkLabel: '',
  },
  {
    id: 'tm_2',
    type: 'image',
    imageUrl: CAROUSEL_SAMPLE_3_SVG,
    caption: 'Dokumentasi kegiatan praktik lapangan dan pembinaan peserta.',
    linkUrl: '',
    linkLabel: '',
  },
  {
    id: 'tm_3',
    type: 'image',
    imageUrl: CAROUSEL_SAMPLE_2_SVG,
    caption: 'Fasilitas ruang belajar, modul panduan, dan sertifikat resmi program.',
    linkUrl: '',
    linkLabel: '',
  },
];

export const DEFAULT_TRAINING_CHECKLIST: string[] = [
  'Fotokopi KTP / Identitas diri yang masih berlaku',
  'Pas foto terbaru ukuran 3x4 / 4x6',
  'Fotokopi ijazah terakhir',
  'Nomor WhatsApp aktif untuk konfirmasi jadwal',
];

export const DEFAULT_TRAINING_CUSTOM_BOXES: TrainingCustomBox[] = [
  {
    id: 'trb_1',
    title: 'Materi & Fasilitas yang Didapat',
    contentHtml:
      '<div><strong>Kurikulum Inti:</strong> Pembinaan disiplin, teori operasional lapangan, dan simulasi praktik langsung.</div><div><span style="color:#059669"><strong>Termasuk:</strong></span> Modul panduan belajar, seragam latihan, konsumsi, dan <em>sertifikat resmi</em>.</div>',
    defaultFontWeight: 'normal',
    defaultFontStyle: 'normal',
    textColor: '',
    lineHeight: 1.6,
    paragraphGap: 6,
    showBorder: true,
  },
];

export const BLOCK_TYPE_NAMES: Record<BlockType, string> = {
  row: 'Kolom / Row',
  container: 'Wadah',
  toggle_container: 'Wadah Show/Hide',
  text: 'Teks Biasa',
  image: 'Gambar',
  button: 'Tombol Link',
  form: 'Form Isian',
  divider: 'Garis Pembatas',
  youtube: 'Video YouTube',
  facebook_video: 'Video Facebook',
  tiktok_video: 'Video TikTok',
  instagram_video: 'Video Instagram',
  catalog: 'Katalog Produk',
  social: 'Sosial Media',
  social_follower: 'Sosial Media + Follower',
  carousel: 'Foto Carousel',
  social_feed: 'Sosmed & Postingan',
  maps_place: 'Lokasi Maps',
  bottom_sheet: 'Bottom Sheet',
  training_catalog: 'Katalog Produk Pelatihan',
  hero_profile: 'Hero Profil',
  fnb_catalog: 'Katalog F&B',
  fnb_hero_slider: 'Slide Produk F&B',
  culinary_spin_slider: 'Slide Kuliner Putar',
  floating_product_studio: 'Studio Produk Melayang',
  interactive_box_showcase: 'Interactive Box Showcase',
  product_box_reveal: 'Animated Product Box Reveal',
  mix_rasa: 'Mix Rasa',
  slide_mix_rasa: 'Slide Mix Rasa',
  category_tabs: 'Tombol Kategori',
  menu_icon: 'Menu Icon',
  cart_button: 'Tombol Keranjang',
  showcase_card: 'Kartu Dinamis',
  back_button: 'Tombol Kembali',
};

export function createCatalogBlock(
  productType: 'physical' | 'digital',
  theme: PageTheme = THEMES[0]
): BuilderBlock {
  const baseStyle: BlockStyle = {
    ...DEFAULT_STYLE,
    textColor: theme.textColor,
    borderColor: theme.borderColor,
    minHeight: 120,
    padding: 0,
    backgroundColor: 'transparent',
  };
  const isDigital = productType === 'digital';
  const sourceItems = isDigital ? DEFAULT_CATALOG_ITEMS : DEFAULT_PHYSICAL_CATALOG_ITEMS;

  return {
    id: createId('cat'),
    type: 'catalog',
    label: isDigital ? 'Katalog Produk Digital' : 'Katalog Produk Fisik',
    style: baseStyle,
    content: {
      catalogItems: sourceItems.map((item) => ({
        ...item,
        id: createId('item'),
        gallery: item.gallery ? [...item.gallery] : undefined,
      })),
      catalogProductType: productType,
      catalogDetailEnabled: true,
      catalogCartEnabled: true,
      catalogWhatsappNumber: '6281234567890',
      catalogWhatsappIntro: isDigital
        ? 'Halo, saya ingin memesan produk digital berikut:'
        : 'Halo, saya ingin memesan produk berikut:',
      catalogAskCustomerInfo: true,
      catalogCustomerFields: getDefaultCustomerFields(productType),
      catalogShippingEnabled: !isDigital,
      catalogShippingOptions: cloneDefaultCatalogShippingOptions(),
    },
  };
}

export function createBlock(type: BlockType, theme: PageTheme = THEMES[0]): BuilderBlock {
  const baseStyle: BlockStyle = {
    ...DEFAULT_STYLE,
    textColor: theme.textColor,
    borderColor: theme.borderColor,
  };

  switch (type) {
    case 'container':
      return {
        id: createId('cnt'),
        type: 'container',
        label: 'Kotak / Wadah',
        style: {
          ...baseStyle,
          minHeight: 80,
          borderRadius: 16,
          backgroundColor: theme.cardBg,
          borderWidth: 1,
          padding: 16,
          shadow: 'sm',
        },
        content: {},
        children: [
          {
            id: createId('txt'),
            type: 'text',
            label: 'Teks Biasa',
            style: {
              ...baseStyle,
              minHeight: 24,
              padding: 4,
              marginBottom: 4,
            },
            content: {
              text: 'Isi konten di dalam wadah ini',
              variant: 'body',
              fontWeight: 'normal',
            },
          },
        ],
      };

    case 'toggle_container':
      return {
        id: createId('tgl'),
        type: 'toggle_container',
        label: 'Wadah Show / Hide',
        style: {
          ...baseStyle,
          minHeight: 56,
          borderRadius: 16,
          backgroundColor: theme.cardBg,
          borderWidth: 1,
          padding: 14,
          shadow: 'sm',
        },
        content: {
          toggleShowLabel: 'Tampilkan Konten',
          toggleHideLabel: 'Sembunyikan Konten',
          toggleDefaultOpen: false,
          toggleButtonBg: theme.accentColor,
          toggleButtonText: '#FFFFFF',
          toggleButtonStyle: 'solid',
        },
        children: [
          {
            id: createId('txt'),
            type: 'text',
            label: 'Teks Isi Wadah',
            style: {
              ...baseStyle,
              minHeight: 24,
              padding: 4,
              marginBottom: 4,
            },
            content: {
              text: 'Konten tersembunyi — bisa diisi teks, gambar, tombol, video, atau elemen lain.',
              variant: 'body',
              fontWeight: 'normal',
            },
          },
        ],
      };

    case 'row':
      return {
        id: createId('row'),
        type: 'row',
        label: '2 Kolom',
        style: {
          ...baseStyle,
          minHeight: 60,
          padding: 4,
        },
        content: {},
        children: [
          {
            id: createId('btn'),
            type: 'button',
            label: 'Tombol Kiri',
            style: { ...baseStyle, minHeight: 44, padding: 0, marginBottom: 0 },
            content: {
              label: 'Portofolio',
              url: 'https://example.com',
              buttonBg: theme.accentColor,
              buttonText: '#FFFFFF',
            },
          },
          {
            id: createId('btn'),
            type: 'button',
            label: 'Tombol Kanan',
            style: { ...baseStyle, minHeight: 44, padding: 0, marginBottom: 0 },
            content: {
              label: 'Hubungi Kami',
              url: 'https://example.com',
              buttonBg: '#0F172A',
              buttonText: '#FFFFFF',
            },
          },
        ],
      };

    case 'text':
      return {
        id: createId('txt'),
        type: 'text',
        label: 'Teks Biasa',
        style: {
          ...baseStyle,
          minHeight: 28,
          padding: 6,
        },
        content: {
          text: 'Judul atau deskripsi singkat halaman Anda',
          variant: 'h2',
          fontWeight: 'bold',
        },
      };

    case 'image':
      return {
        id: createId('img'),
        type: 'image',
        label: 'Gambar',
        style: {
          ...baseStyle,
          minHeight: 120,
          padding: 0,
          borderRadius: 16,
        },
        content: {
          src: PRODUCT_CARD_SVG,
          alt: 'Ilustrasi produk digital',
          aspectRatio: '16/9',
          objectFit: 'cover',
        },
      };

    case 'button':
      return {
        id: createId('btn'),
        type: 'button',
        label: 'Tombol Link',
        style: {
          ...baseStyle,
          minHeight: 46,
          padding: 0,
          borderRadius: 12,
        },
        content: {
          label: 'Buka Tautan Sekarang',
          url: 'https://example.com',
          buttonBg: theme.accentColor,
          buttonText: '#FFFFFF',
        },
      };

    case 'form':
      return {
        id: createId('frm'),
        type: 'form',
        label: 'Form Isian',
        style: {
          ...baseStyle,
          minHeight: 140,
          backgroundColor: theme.cardBg,
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
          shadow: 'sm',
          align: 'left',
        },
        content: {
          formTitle: 'Dapatkan Update Terbaru',
          namePlaceholder: 'Nama Lengkap',
          emailPlaceholder: 'Alamat Email / WhatsApp',
          formNameRequired: true,
          formEmailRequired: true,
          formChecklistEnabled: false,
          formChecklistTitle: 'Persetujuan / Checklist',
          formChecklistItems: ['Saya setuju data digunakan untuk keperluan konsultasi'],
          formChecklistRequired: false,
          submitLabel: 'Kirim Data',
          successMessage: 'Terima kasih! Data Anda telah terkirim.',
          buttonColor: theme.accentColor,
        },
      };

    case 'divider':
      return {
        id: createId('div'),
        type: 'divider',
        label: 'Garis Pembatas',
        style: {
          ...baseStyle,
          minHeight: 16,
          padding: 8,
        },
        content: {
          lineColor: theme.borderColor,
          thickness: 1,
          lineStyle: 'solid',
        },
      };

    case 'youtube':
      return {
        id: createId('ytb'),
        type: 'youtube',
        label: 'Video YouTube',
        style: {
          ...baseStyle,
          minHeight: 160,
          padding: 0,
          borderRadius: 16,
        },
        content: {
          youtubeUrl: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          youtubeAspectRatio: '16/9',
          youtubeAutoplay: true,
          youtubeVolume: 75,
        },
      };

    case 'facebook_video':
      return {
        id: createId('fbv'),
        type: 'facebook_video',
        label: 'Video Facebook',
        style: {
          ...baseStyle,
          minHeight: 160,
          padding: 0,
          borderRadius: 16,
        },
        content: {
          videoUrl: 'https://www.facebook.com/facebook/videos/10153231379946729/',
          videoAspectRatio: '16/9',
          videoAutoplay: true,
          videoVolume: 75,
        },
      };

    case 'tiktok_video':
      return {
        id: createId('ttv'),
        type: 'tiktok_video',
        label: 'Video TikTok',
        style: {
          ...baseStyle,
          minHeight: 220,
          padding: 0,
          borderRadius: 16,
        },
        content: {
          videoUrl: 'https://www.tiktok.com/@tiktok/video/7106594312292453675',
          videoAspectRatio: '9/16',
          videoAutoplay: true,
          videoVolume: 75,
        },
      };

    case 'instagram_video':
      return {
        id: createId('igv'),
        type: 'instagram_video',
        label: 'Video Instagram',
        style: {
          ...baseStyle,
          minHeight: 220,
          padding: 0,
          borderRadius: 16,
        },
        content: {
          videoUrl: 'https://www.instagram.com/reel/C5vQ8qKvP2x/',
          videoAspectRatio: '9/16',
          videoAutoplay: true,
          videoVolume: 75,
        },
      };

    case 'catalog':
      return createCatalogBlock('physical', theme);

    case 'training_catalog':
      return {
        id: createId('trn'),
        type: 'training_catalog',
        label: 'Katalog Produk Pelatihan',
        style: {
          ...baseStyle,
          minHeight: 240,
          padding: 14,
          borderRadius: 18,
          backgroundColor: theme.cardBg,
          borderWidth: 1,
          shadow: 'sm',
          align: 'left',
        },
        content: {
          trainingHeading: 'Dikssar Satpam Gada Pratama',
          trainingBatch: 'Angkatan 200',
          trainingSchedule: 'Senin – Sabtu, 08.00 – 16.00 WIB',
          trainingSubheading:
            'Program pendidikan & sertifikasi resmi dengan pembekalan teori, praktik lapangan, serta pendampingan berkas.',
          trainingExpandLabel: 'Selengkapnya',
          trainingCollapseLabel: 'Tutup Detail',
          trainingDefaultExpanded: false,
          trainingPrograms: DEFAULT_TRAINING_PROGRAMS.map((p) => ({
            ...p,
            id: createId('trp'),
          })),
          trainingCustomBoxes: DEFAULT_TRAINING_CUSTOM_BOXES.map((b) => ({
            ...b,
            id: createId('trb'),
          })),
          trainingMedia: DEFAULT_TRAINING_MEDIA.map((m) => ({
            ...m,
            id: createId('trm'),
          })),
          trainingMediaRatio: '16/9',
          trainingChecklistTitle: 'Checklist Syarat Berkas',
          trainingChecklistItems: [...DEFAULT_TRAINING_CHECKLIST],
          trainingFormTitle: 'Formulir Pendaftaran / Konsultasi',
          trainingFormFields: getDefaultTrainingFormFields(),
          trainingWaNumber: '6281234567890',
          trainingWaButtonLabel: 'Konsultasi via WhatsApp',
          trainingWaIntro: 'Halo, saya ingin konsultasi mengenai program pelatihan berikut:',
        },
      };

    case 'social':
      return {
        id: createId('soc'),
        type: 'social',
        label: 'Ikon Sosial Media',
        style: {
          ...baseStyle,
          minHeight: 48,
          padding: 8,
          marginBottom: 14,
          backgroundColor: 'transparent',
        },
        content: {
          socialItems: DEFAULT_SOCIAL_ITEMS.map((item) => ({ ...item, id: createId('s') })),
          socialStyle: 'filled',
          socialShape: 'circle',
          socialSize: 'md',
          socialIconSize: 40,
          socialGap: 10,
          socialUseBrandColors: true,
          socialColor: theme.accentColor,
        },
      };

    case 'social_follower':
      return {
        id: createId('sfol'),
        type: 'social_follower',
        label: 'Sosial Media + Follower',
        style: {
          ...baseStyle,
          minHeight: 110,
          padding: 0,
          borderRadius: 18,
          backgroundColor: 'transparent',
          borderWidth: 0,
          shadow: 'none',
          align: 'left',
        },
        content: {
          socialFollowerGap: 10,
          socialFollowerAccounts: DEFAULT_SOCIAL_FOLLOWER_ACCOUNTS.map((acc) => ({
            ...acc,
            id: createId('sfa'),
          })),
        },
      };

    case 'carousel':
      return {
        id: createId('car'),
        type: 'carousel',
        label: 'Galeri Foto Carousel',
        style: {
          ...baseStyle,
          minHeight: 180,
          padding: 0,
          borderRadius: 16,
          align: 'left',
          backgroundColor: 'transparent',
        },
        content: {
          carouselAspectRatio: '4/5',
          carouselObjectFit: 'cover',
          carouselItems: DEFAULT_CAROUSEL_ITEMS.map((item) => ({
            ...item,
            id: createId('slide'),
          })),
        },
      };

    case 'social_feed':
      return {
        id: createId('sfd'),
        type: 'social_feed',
        label: 'Sosmed & Postingan',
        style: {
          ...baseStyle,
          minHeight: 240,
          padding: 14,
          borderRadius: 18,
          backgroundColor: theme.cardBg,
          borderWidth: 1,
          shadow: 'sm',
          align: 'left',
        },
        content: {
          socialFeedPlatform: 'instagram',
          socialFeedAvatar: '',
          socialFeedAccountName: 'Studio Kreatif Nusantara',
          socialFeedHandle: '@studiokreatif',
          socialFeedAccountUrl: 'https://instagram.com/studiokreatif',
          socialFeedVerified: true,
          socialFeedFollowers: '45,8 rb',
          socialFeedFollowersLabel: 'Follower',
          socialFeedBio: '',
          socialFeedFollowLabel: 'Ikuti',
          socialFeedRatio: '4/5',
          socialFeedPosts: DEFAULT_SOCIAL_FEED_POSTS.map((post) => ({
            ...post,
            id: createId('sfp'),
          })),
        },
      };

    case 'maps_place':
      return {
        id: createId('map'),
        type: 'maps_place',
        label: 'Lokasi Maps',
        style: {
          ...baseStyle,
          minHeight: 200,
          padding: 0,
          borderRadius: 16,
          backgroundColor: theme.cardBg,
          borderWidth: 1,
          shadow: 'sm',
          align: 'left',
        },
        content: {
          mapsPhotoUrl: MAPS_LOCATION_SVG,
          mapsPhotoBadgeLabel: 'Lihat foto',
          mapsPhotoRatio: '16/9',
          mapsTitle: 'Diksar Satpam',
          mapsRating: 4.9,
          mapsReviewCount: '1.643',
          mapsService: 'Layanan Satpam',
          mapsAccessible: true,
          mapsServicesList: 'Pelatihan Keamanan, Sertifikasi Resmi, Penyaluran Kerja',
          mapsAddress: 'Buka setiap hari · 08.00 – 17.00 WIB',
          mapsUrl: 'https://maps.google.com',
          mapsButtonLabel: 'Buka di Google Maps',
        },
      };

    case 'bottom_sheet': {
      const mapsChild = createBlock('maps_place', theme);
      return {
        id: createId('bsh'),
        type: 'bottom_sheet',
        label: 'Bottom Sheet Maps',
        style: {
          ...baseStyle,
          minHeight: 56,
          padding: 4,
          backgroundColor: 'transparent',
          borderWidth: 0,
          shadow: 'none',
          align: 'center',
        },
        content: {
          sheetTitle: 'Lokasi & Ulasan',
          sheetTriggerStyle: 'icon',
          sheetTriggerIcon: 'map-pin',
          sheetTriggerLabel: 'Lokasi Maps',
          sheetTriggerSublabel: 'Lihat lokasi & ulasan',
          sheetTriggerBg: theme.accentColor,
          sheetTriggerText: '#FFFFFF',
          sheetIconSize: 52,
        },
        children: [
          {
            ...mapsChild,
            style: {
              ...mapsChild.style,
              marginBottom: 0,
            },
          },
        ],
      };
    }

    case 'menu_icon': {
      const sampleText = createBlock('text', theme);
      return {
        id: createId('mico'),
        type: 'menu_icon',
        label: 'Menu Icon',
        style: {
          ...baseStyle,
          minHeight: 64,
          padding: 4,
          backgroundColor: 'transparent',
          borderWidth: 0,
          shadow: 'none',
          align: 'center',
        },
        content: {
          menuIconImage: '',
          menuIconShape: 'circle',
          menuIconRadius: 14,
          menuIconSize: 64,
          menuIconImageFit: 'cover',
          menuIconLabel: 'Menu Icon',
          menuIconShowLabel: true,
          menuIconAction: 'sheet',
          menuIconSheetPosition: 'bottom',
          menuIconTargetBlockId: '',
          menuIconBg: theme.accentColor,
          menuIconTextColor: theme.textColor,
          sheetTitle: 'Menu Panel',
        },
        children: [
          {
            ...sampleText,
            label: 'Isi Panel Menu',
            style: {
              ...sampleText.style,
              align: 'left',
              marginBottom: 0,
            },
            content: {
              text: 'Tambahkan informasi, tombol, atau katalog di dalam panel Menu Icon ini.',
              variant: 'body',
              fontWeight: 'normal',
            },
          },
        ],
      };
    }

    case 'hero_profile':
      return {
        id: createId('hero'),
        type: 'hero_profile',
        label: 'Hero Profil Usaha',
        style: {
          ...baseStyle,
          minHeight: 110,
          padding: 0,
          borderRadius: 20,
          backgroundColor: theme.cardBg,
          borderWidth: 1,
          shadow: 'sm',
          align: 'left',
          marginBottom: 16,
        },
        content: {
          heroVariant: 'compact',
          heroStatusEnabled: true,
          heroStatusText: 'Buka sekarang',
          heroStatusColor: '#16A34A',
          heroLogoImage: '',
          heroLogoMonogram: 'WB',
          heroLogoBg: '#FFEDD5',
          heroLogoColor: '#C2410C',
          heroLogoSize: 72,
          heroCoverImage: HERO_COVER_WARM_SVG,
          heroCoverTitle: 'Warung Barokah',
          heroCoverFontFamily: 'Pacifico',
          heroCoverHeight: 165,
          heroOverlapPx: 34,
          heroTitle: 'Warung Barokah Demo',
          heroTitleSize: 20,
          heroSubtitle: 'Nasi, mie, ayam bakar, dan minuman.',
          heroSubtitleSize: 13,
          heroRating: '4.9',
          heroHours: '09.00-21.00 WIB',
          heroLocation: 'Cabang Kemang',
          heroInfoSize: 12,
          heroCardRadius: 20,
        },
      };

    case 'fnb_catalog':
      return {
        id: createId('fnb'),
        type: 'fnb_catalog',
        label: 'Katalog Menu F&B',
        style: {
          ...baseStyle,
          minHeight: 140,
          padding: 0,
          backgroundColor: 'transparent',
          borderWidth: 0,
          shadow: 'none',
          align: 'left',
          marginBottom: 18,
        },
        content: {
          fnbItems: DEFAULT_FNB_ITEMS.map((it) => ({ ...it, id: createId('fnb') })),
          fnbShowSearch: true,
          fnbSearchPlaceholder: 'Cari makanan dan minuman...',
          fnbShowCategories: false,
          fnbGroupByCategory: true,
          fnbAccentColor: '#EA580C',
          fnbItemImageSize: 80,
          fnbItemTitleSize: 15,
          fnbItemDescSize: 12,
          fnbFloatingCartEnabled: true,
          fnbFloatingCartPosition: 'bottom-floating',
          fnbFloatingCartOffsetY: 16,
          fnbFloatingCartBg: '#EA580C',
          fnbFloatingCartLabel: 'Lanjut',
          catalogProductType: 'physical',
          catalogCartEnabled: true,
          catalogWhatsappNumber: '6281234567890',
          catalogStoreName: 'Warung Barokah',
          catalogWhatsappIntro: 'Halo, saya ingin memesan menu berikut:',
          catalogAskCustomerInfo: true,
          catalogCustomerFields: getDefaultCustomerFields('physical'),
          catalogShippingEnabled: true,
          catalogShippingOptions: cloneDefaultCatalogShippingOptions(),
        },
      };

    case 'fnb_hero_slider':
      return {
        id: createId('fhs'),
        type: 'fnb_hero_slider',
        label: 'Slide Produk F&B',
        style: {
          ...baseStyle,
          minHeight: 380,
          padding: 0,
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          borderWidth: 0,
          shadow: 'md',
          align: 'center',
          marginBottom: 18,
        },
        content: {
          fnbSliderItems: DEFAULT_FNB_HERO_SLIDES.map((it) => ({ ...it, id: createId('fhs_it') })),
          fnbSliderShowHeader: true,
          fnbSliderShowSearch: true,
          fnbSliderShowCart: true,
          fnbSliderShowDots: false,
          fnbSliderDotsPosition: 'below',
          fnbSliderEnableDetail: true,
          fnbSliderEnableCart: true,
          fnbSliderAutoplay: false,
          fnbSliderArchHeight: 205,
          fnbSliderArchCurve: 100,
          fnbSliderProductSize: 215,
          fnbSliderImageZoom: 100,
          fnbSliderPeekScale: 74,
          fnbSliderDropShadow: true,
          fnbSliderCardBg: '#FFFFFF',
          fnbSliderWhatsappNumber: '6281234567890',
          fnbSliderStoreName: 'Kopi Nusantara',
          fnbSliderFloatingCartEnabled: true,
          fnbSliderFloatingCartLabel: 'Lihat Keranjang',
          fnbSliderFloatingCartBg: '#EA580C',
          fnbSliderFloatingCartPosition: 'bottom-floating',
          catalogProductType: 'physical',
          catalogCartEnabled: true,
          catalogWhatsappNumber: '6281234567890',
          catalogStoreName: 'Kopi Nusantara',
          catalogWhatsappIntro: 'Halo, saya ingin memesan menu berikut:',
          catalogAskCustomerInfo: true,
          catalogCustomerFields: getDefaultCustomerFields('physical'),
          catalogShippingEnabled: true,
          catalogShippingOptions: cloneDefaultCatalogShippingOptions(),
        },
      };

    case 'culinary_spin_slider':
      return {
        id: createId('css'),
        type: 'culinary_spin_slider',
        label: 'Slide Kuliner Putar',
        style: {
          ...baseStyle,
          minHeight: 380,
          padding: 0,
          backgroundColor: '#F8FAFC',
          borderRadius: 24,
          borderWidth: 0,
          shadow: 'md',
          align: 'center',
          marginBottom: 18,
        },
        content: {
          culinarySpinItems: DEFAULT_CULINARY_SPIN_SLIDES.map((it) => ({
            ...it,
            id: createId('cs_it'),
          })),
          culinaryShowHeader: true,
          culinaryShowCartBadge: true,
          culinaryShowAmbientBlur: true,
          culinaryShowInfo: true,
          culinaryShowPrice: true,
          culinaryShowDescription: false,
          culinaryShowCartButton: true,
          culinaryShowDots: false,
          culinaryDotsPosition: 'below',
          culinaryEnableDetail: true,
          culinaryAutoplay: false,
          culinaryPlateSize: 216,
          culinaryImageZoom: 100,
          culinarySpinAngle: 58,
          culinaryBlurOpacity: 32,
          culinaryBlurAmount: 7,
          culinaryDropShadow: true,
          culinaryCardBg: '#F8FAFC',
          culinaryAccentColor: '#F43F5E',
          culinaryWhatsappNumber: '6281234567890',
          culinaryStoreName: 'Dapur Artisan',
          culinaryFloatingCartEnabled: true,
          culinaryFloatingCartLabel: 'Lihat Pesanan',
          culinaryFloatingCartBg: '#F43F5E',
          culinaryFloatingCartPosition: 'bottom-floating',
          catalogProductType: 'physical',
          catalogCartEnabled: true,
          catalogWhatsappNumber: '6281234567890',
          catalogStoreName: 'Dapur Artisan',
          catalogWhatsappIntro: 'Halo, saya ingin memesan hidangan berikut:',
          catalogAskCustomerInfo: true,
          catalogCustomerFields: getDefaultCustomerFields('physical'),
          catalogShippingEnabled: true,
          catalogShippingOptions: cloneDefaultCatalogShippingOptions(),
        },
      };

    case 'floating_product_studio':
      return {
        id: createId('fps'),
        type: 'floating_product_studio',
        label: 'Studio Produk Melayang',
        style: {
          ...baseStyle,
          minHeight: 420,
          padding: 0,
          backgroundColor: '#7A828E',
          borderRadius: 24,
          borderWidth: 0,
          shadow: 'md',
          align: 'center',
          marginBottom: 18,
        },
        content: {
          floatingStudioItems: DEFAULT_FLOATING_STUDIO_SLIDES.map((it) => ({
            ...it,
            id: createId('fs_it'),
          })),
          studioShowHeader: false,
          studioShowCornerPreview: true,
          studioShowInfo: true,
          studioShowPrice: true,
          studioShowSwatches: true,
          studioShowDescription: false,
          studioShowCartButton: true,
          studioShowDots: false,
          studioDotsPosition: 'below',
          studioLevitateEnabled: true,
          studioGroundShadow: true,
          studioAutoplay: false,
          studioProductSize: 236,
          studioImageZoom: 100,
          studioCornerSize: 64,
          studioMinHeight: 430,
          studioTextColor: '#FFFFFF',
          studioWhatsappNumber: '6281234567890',
          studioStoreName: 'Urban Studio Wear',
          studioFloatingCartEnabled: true,
          studioFloatingCartLabel: 'Lihat Keranjang',
          studioFloatingCartBg: '#111827',
          studioFloatingCartPosition: 'bottom-floating',
          catalogProductType: 'physical',
          catalogCartEnabled: true,
          catalogWhatsappNumber: '6281234567890',
          catalogStoreName: 'Urban Studio Wear',
          catalogWhatsappIntro: 'Halo, saya ingin memesan produk berikut:',
          catalogAskCustomerInfo: true,
          catalogCustomerFields: getDefaultCustomerFields('physical'),
          catalogShippingEnabled: true,
          catalogShippingOptions: cloneDefaultCatalogShippingOptions(),
        },
      };

    case 'interactive_box_showcase':
      return {
        id: createId('ibs'),
        type: 'interactive_box_showcase',
        label: 'Interactive Box Showcase',
        style: {
          ...baseStyle,
          minHeight: 420,
          padding: 0,
          backgroundColor: '#F4F4F6',
          borderRadius: 24,
          borderWidth: 0,
          shadow: 'md',
          align: 'center',
          marginBottom: 18,
        },
        content: {
          boxShowcaseItems: DEFAULT_INTERACTIVE_BOX_ITEMS.map((it) => ({
            ...it,
            id: createId('ibs_it'),
          })),
          boxShowcaseSlideMode: 'auto',
          boxShowcaseAutoIntervalSec: 2.5,
          boxShowcaseColor: '#F46A1F',
          boxShowcaseBrandLabel: '',
          boxShowcaseBgColor: '#F4F4F6',
          boxShowcaseShowRating: true,
          boxShowcaseShowFavorite: true,
          boxShowcaseShowCartButton: true,
          boxShowcaseImageScale: 100,
          boxShowcaseWhatsappNumber: '6281234567890',
          boxShowcaseStoreName: 'Sneaker Box Studio',
          boxShowcaseFloatingCartEnabled: true,
          boxShowcaseFloatingCartLabel: 'Lihat Keranjang',
          boxShowcaseFloatingCartBg: '#25272D',
          boxShowcaseFloatingCartPosition: 'bottom-floating',
          catalogProductType: 'physical',
          catalogCartEnabled: true,
          catalogWhatsappNumber: '6281234567890',
          catalogStoreName: 'Sneaker Box Studio',
          catalogWhatsappIntro: 'Halo, saya ingin memesan produk berikut:',
          catalogAskCustomerInfo: true,
          catalogCustomerFields: getDefaultCustomerFields('physical'),
          catalogShippingEnabled: true,
          catalogShippingOptions: cloneDefaultCatalogShippingOptions(),
        },
      };

    case 'product_box_reveal':
      return {
        id: createId('pbr'),
        type: 'product_box_reveal',
        label: 'Animated Product Box Reveal',
        style: {
          ...baseStyle,
          minHeight: 420,
          padding: 0,
          backgroundColor: '#EFEFEF',
          borderRadius: 24,
          borderWidth: 0,
          shadow: 'md',
          align: 'center',
          marginBottom: 18,
        },
        content: {
          boxRevealItems: DEFAULT_PRODUCT_BOX_REVEAL_ITEMS.map((it) => ({
            ...it,
            id: createId('pbr_it'),
          })),
          boxRevealColor: '#5C3626',
          boxRevealBgColor: '#EFEFEF',
          boxRevealShowCartButton: true,
          boxRevealShowDots: true,
          boxRevealDotsPosition: 'right',
          boxRevealVerticalSwipeEnabled: true,
          boxRevealSlideMode: 'manual',
          boxRevealAutoIntervalSec: 4,
          boxRevealZoomEffectEnabled: true,
          boxRevealProductZoomStart: 118,
          boxRevealProductZoomEnd: 100,
          boxRevealBoxSize: 220,
          boxRevealBorderThickness: 18,
          boxRevealBoxShape: 'square',
          boxRevealBoxCornerRadius: 24,
          boxRevealLidOpenStyle: 'hinge_top',
          boxRevealInnerRimAccent: false,
          boxRevealInnerRimColor: '#D4AF37',
          boxRevealShadowIntensity: 100,
          boxRevealLidLogoImage: '',
          boxRevealLidLogoSize: 44,
          boxRevealLidLogoPadding: 12,
          boxRevealLidLogoFit: 'contain',
          boxRevealTransitionEffect: 'slide_vertical',
          boxRevealTransitionDurationMs: 520,
          boxRevealWhatsappNumber: '6281234567890',
          boxRevealStoreName: 'Butik Jam & Aksesoris',
          boxRevealFloatingCartEnabled: true,
          boxRevealFloatingCartLabel: 'Lihat Keranjang',
          boxRevealFloatingCartBg: '#5C3626',
          boxRevealFloatingCartPosition: 'bottom-floating',
          adminCtaEnabled: false,
          adminCtaLabel: 'Tanya Admin',
          adminCtaActionType: 'whatsapp',
          adminCtaWhatsappNumber: '',
          adminCtaWhatsappMessage: 'Halo Admin, saya tertarik dengan produk {produk} ({harga}).',
          adminCtaBgColor: '#8E6D5B',
          adminCtaTextColor: '#FFFFFF',
          catalogProductType: 'physical',
          catalogCartEnabled: true,
          catalogWhatsappNumber: '6281234567890',
          catalogStoreName: 'Butik Jam & Aksesoris',
          catalogWhatsappIntro: 'Halo, saya ingin memesan produk berikut:',
          catalogAskCustomerInfo: true,
          catalogCustomerFields: getDefaultCustomerFields('physical'),
          catalogShippingEnabled: true,
          catalogShippingOptions: cloneDefaultCatalogShippingOptions(),
        },
      };

    case 'mix_rasa': {
      const clonedFlavors = DEFAULT_MIX_RASA_FLAVORS.map((f) => ({
        ...f,
        id: createId('mr_flv'),
      }));
      return {
        id: createId('mixr'),
        type: 'mix_rasa',
        label: 'Mix Rasa',
        style: {
          ...baseStyle,
          minHeight: 460,
          padding: 0,
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          shadow: 'md',
          align: 'center',
          marginBottom: 18,
        },
        content: {
          mixRasaTitle: 'Pizza Mix Rasa',
          mixRasaProductSize: 'Pizza 35 cm',
          mixRasaShowProductSize: true,
          mixRasaShowDescription: false,
          mixRasaDescription: 'Pilih kombinasi rasa favorit dalam satu produk segar.',
          mixRasaSliceCount: 2,
          mixRasaAllowSliceSwitch: true,
          mixRasaPreviewSize: 232,
          mixRasaDividerWidth: 4,
          mixRasaDividerColor: '#FFFFFF',
          mixRasaShowBackButton: true,
          mixRasaCenterHeader: false,
          mixRasaBackActionType: 'back',
          mixRasaBackTargetPageId: '',
          mixRasaBackUrl: '',
          mixRasaFlavors: clonedFlavors,
          mixRasaDefaultSelectionIds: clonedFlavors.slice(0, 4).map((f) => f.id),
          mixRasaBgColor: '#FFFFFF',
          mixRasaAccentColor: '#EA6314',
          mixRasaFloatingCartEnabled: true,
          mixRasaFloatingCartPosition: 'bottom-floating',
          mixRasaFloatingCartLabel: 'Lihat Keranjang',
          mixRasaFloatingCartBg: '#EA6314',
          mixRasaCartButtonLabel: 'Gabungkan Rasa',
          mixRasaStoreName: 'Pizza Mix Studio',
          mixRasaWaEnabled: true,
          mixRasaWaNumber: '6281234567890',
          mixRasaWaLabel: 'Pesan via WhatsApp',
          mixRasaWaIntro: 'Halo, saya ingin memesan:',
          mixRasaWaIncludeDetails: true,
          catalogProductType: 'physical',
          catalogCartEnabled: true,
          catalogWhatsappNumber: '6281234567890',
          catalogStoreName: 'Pizza Mix Studio',
          catalogWhatsappIntro: 'Halo, saya ingin memesan produk berikut:',
          catalogAskCustomerInfo: true,
          catalogCustomerFields: getDefaultCustomerFields('physical'),
          catalogShippingEnabled: true,
          catalogShippingOptions: cloneDefaultCatalogShippingOptions(),
        },
      };
    }

    case 'slide_mix_rasa': {
      const subtitles = [
        'Resep asli',
        'Favorit keluarga',
        'Best seller',
        'Smoky spesial',
        'Daging pilihan',
        'Lumer & gurih',
        'Segar alami',
      ];
      const clonedFlavors = DEFAULT_MIX_RASA_FLAVORS.map((f, idx) => ({
        ...f,
        id: createId('smr_flv'),
        subtitle: subtitles[idx % subtitles.length],
        imageScale: 100,
      }));
      return {
        id: createId('smix'),
        type: 'slide_mix_rasa',
        label: 'Slide Mix Rasa',
        style: {
          ...baseStyle,
          minHeight: 540,
          padding: 0,
          backgroundColor: '#FFFFFF',
          borderRadius: 24,
          borderWidth: 1,
          borderColor: '#E2E8F0',
          shadow: 'md',
          align: 'center',
          marginBottom: 18,
        },
        content: {
          slideMixTitle: 'Pizza Mix Rasa',
          slideMixProductSize: '35 cm',
          slideMixShowProductSize: true,
          slideMixShowDescription: false,
          slideMixDescription: 'Geser naik/turun sisi kiri & kanan untuk memadukan 2 rasa favorit.',
          slideMixShowBackButton: true,
          slideMixBackLabel: 'Menu',
          slideMixCenterHeader: true,
          slideMixBackActionType: 'back',
          slideMixBackTargetPageId: '',
          slideMixBackUrl: '',
          slideMixFlavors: clonedFlavors,
          slideMixDefaultLeftId: clonedFlavors[0]?.id || '',
          slideMixDefaultRightId: clonedFlavors[1]?.id || clonedFlavors[0]?.id || '',
          slideMixShowDiceButton: true,
          slideMixLoop: true,
          slideMixAutoSlide: false,
          slideMixAutoSlideMs: 3200,
          slideMixPreviewSize: 236,
          slideMixPeekSize: 102,
          slideMixPeekOpacity: 58,
          slideMixItemGap: 22,
          slideMixTransitionMs: 420,
          slideMixDividerWidth: 4,
          slideMixDividerColor: '#FFFFFF',
          slideMixBgColor: '#FFFFFF',
          slideMixAccentColor: '#EA6314',
          slideMixPricePrefix: 'Harga',
          slideMixButtonSize: 'md',
          slideMixButtonDisplay: 'icon_text',
          slideMixButtonLayout: 'stack',
          slideMixFloatingCartEnabled: true,
          slideMixFloatingCartPosition: 'bottom-floating',
          slideMixFloatingCartLabel: 'Lihat Keranjang',
          slideMixFloatingCartBg: '#EA6314',
          slideMixCartButtonLabel: 'Gabungkan Rasa',
          slideMixStoreName: 'Pizza Mix Studio',
          slideMixWaEnabled: true,
          slideMixWaNumber: '6281234567890',
          slideMixWaLabel: 'Pesan via WhatsApp',
          slideMixWaIntro: 'Halo, saya ingin memesan:',
          slideMixWaIncludeDetails: true,
          adminCtaEnabled: false,
          adminCtaLabel: 'Tanya Admin',
          adminCtaActionType: 'whatsapp',
          adminCtaWhatsappNumber: '6281234567890',
          adminCtaWhatsappMessage: 'Halo admin, saya ingin tanya mengenai Pizza Mix Rasa.',
          adminCtaTargetPageId: '',
          adminCtaBgColor: '#1E293B',
          catalogProductType: 'physical',
          catalogCartEnabled: true,
          catalogWhatsappNumber: '6281234567890',
          catalogStoreName: 'Pizza Mix Studio',
          catalogWhatsappIntro: 'Halo, saya ingin memesan produk berikut:',
          catalogAskCustomerInfo: true,
          catalogCustomerFields: getDefaultCustomerFields('physical'),
          catalogShippingEnabled: true,
          catalogShippingOptions: cloneDefaultCatalogShippingOptions(),
        },
      };
    }

    case 'category_tabs':
      return {
        id: createId('ctab'),
        type: 'category_tabs',
        label: 'Tombol Kategori',
        style: {
          ...baseStyle,
          minHeight: 44,
          padding: 4,
          backgroundColor: 'transparent',
          borderWidth: 0,
          shadow: 'none',
          align: 'left',
          marginBottom: 14,
        },
        content: {
          categoryButtons: DEFAULT_CATEGORY_BUTTONS.map((b) => ({ ...b, id: createId('catbtn') })),
          categoryScrollMode: 'vertical',
          categoryMaxHeight: 112,
          categoryActiveBg: '#EA580C',
          categoryActiveText: '#FFFFFF',
          categoryInactiveBg: '#F1F5F9',
          categoryInactiveText: '#334155',
          categoryRadius: 9999,
          categoryFontSize: 13,
          categoryButtonPaddingX: 16,
          categoryButtonPaddingY: 8,
          categoryGap: 8,
          categoryFilterFnbOnClick: true,
        },
      };

    case 'cart_button':
      return {
        id: createId('crt'),
        type: 'cart_button',
        label: 'Tombol Keranjang',
        style: {
          ...baseStyle,
          minHeight: 54,
          padding: 12,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.borderColor,
          backgroundColor: theme.cardBg,
          textColor: theme.textColor,
          shadow: 'sm',
          align: 'left',
          marginBottom: 10,
        },
        content: {
          cartProductName: 'Produk Pilihan',
          cartProductDesc: 'Keterangan singkat produk atau varian',
          cartProductPrice: 'Rp 80.000',
          cartProductImage: PRODUCT_CARD_SVG,
          cartButtonLabel: 'Tambah',
          cartShowProductInfo: true,
          cartAccentColor: theme.accentColor,
          cartWhatsappNumber: '6281234567890',
          cartStoreName: 'Toko Resmi',
          cartFloatingEnabled: true,
          cartFloatingLabel: 'Lihat Keranjang',
          cartFloatingBg: '#059669',
          cartFloatingPosition: 'bottom-floating',
        },
      };

    case 'showcase_card':
      return {
        id: createId('crd'),
        type: 'showcase_card',
        label: 'Kartu Dinamis',
        style: {
          ...baseStyle,
          minHeight: 120,
          padding: 0,
          borderRadius: 16,
          borderWidth: 0,
          backgroundColor: 'transparent',
          textColor: theme.textColor,
          shadow: 'sm',
          align: 'left',
          marginBottom: 12,
        },
        content: {
          cardVariant: 'news_banner',
          cardHeaderTitle: '',
          cardMoreLabel: 'Selengkapnya',
          cardMoreUrl: '',
          cardTitle: 'Judul Berita atau Informasi Utama',
          cardSubtitle: 'Keterangan singkat kartu dinamis',
          cardQuote: '',
          cardDate: '18/02/2026',
          cardViews: '200',
          cardImage: CAROUSEL_SAMPLE_1_SVG,
          cardImagePosition: 'right',
          cardGalleryImages: [
            CAROUSEL_SAMPLE_1_SVG,
            CAROUSEL_SAMPLE_2_SVG,
            CAROUSEL_SAMPLE_3_SVG,
          ],
          cardGradientFrom: '#F59E0B',
          cardGradientTo: '#D97706',
          cardAccentColor: '#2563EB',
          cardTextColor: '#FFFFFF',
          cardPrice: 'Rp. 80.000,-',
          cardTotalLabel: 'Total :',
          cardTotalValue: 'Rp. 500.000,-',
          cardFeeItems: [
            { id: createId('fee'), label: 'Pendaftaran', value: 'Rp. 100.000' },
            { id: createId('fee'), label: 'Iuran Anggota', value: 'Rp. 400.000' },
          ],
          cardActionUrl: '',
          cardShowPlayIcon: true,
          cardEnableCart: false,
          cardWhatsappNumber: '6281234567890',
        },
      };

    case 'back_button':
      return {
        id: createId('bck'),
        type: 'back_button',
        label: 'Tombol Kembali',
        style: {
          ...baseStyle,
          minHeight: 40,
          padding: 0,
          borderRadius: 12,
          borderWidth: 0,
          backgroundColor: 'transparent',
          textColor: theme.textColor,
          shadow: 'none',
          align: 'left',
          marginBottom: 10,
        },
        content: {
          backButtonLabel: 'Kembali',
          backButtonBg: theme.cardBg,
          backButtonText: theme.textColor,
          backTargetPageId: '',
        },
      };
  }
}

export function createSubPage(index: number, theme: PageTheme = THEMES[0]): BuilderSubPage {
  const heading = createBlock('text', theme);
  const body = createBlock('text', theme);
  return {
    id: createId('pg'),
    title: `Halaman ${index}`,
    showBackButton: true,
    backButtonLabel: 'Kembali',
    blocks: [
      {
        ...heading,
        label: `Judul Halaman ${index}`,
        style: {
          ...heading.style,
          align: 'left',
          marginBottom: 6,
        },
        content: {
          ...heading.content,
          text: `Halaman ${index}`,
          variant: 'h1',
          fontWeight: 'bold',
        },
      },
      {
        ...body,
        label: 'Deskripsi Halaman',
        style: {
          ...body.style,
          align: 'left',
          marginBottom: 14,
        },
        content: {
          ...body.content,
          text: 'Tambahkan kartu, katalog, gambar, tombol keranjang, atau form sesuai kebutuhan halaman ini.',
          variant: 'body',
          fontWeight: 'normal',
        },
      },
    ],
  };
}

export function createDefaultBottomNavbar(
  theme: PageTheme = THEMES[0],
  enabled = false
): BottomNavbarConfig {
  const galeriCarousel = createBlock('carousel', theme);
  const belanjaCatalog = createBlock('catalog', theme);
  const kontakText = createBlock('text', theme);
  const kontakWa = createBlock('button', theme);
  const kontakSocial = createBlock('social', theme);
  const alamatMaps = createBlock('maps_place', theme);

  const items: BottomNavbarItem[] = [
    {
      id: 'nav_galeri',
      label: 'Galeri',
      icon: 'image',
      enabled: true,
      action: 'sheet',
      sheetTitle: 'Galeri Foto & Karya',
      children: [{ ...galeriCarousel, style: { ...galeriCarousel.style, marginBottom: 0 } }],
    },
    {
      id: 'nav_belanja',
      label: 'Belanja',
      icon: 'shopping-bag',
      enabled: true,
      action: 'sheet',
      sheetTitle: 'Belanja & Produk',
      children: [{ ...belanjaCatalog, style: { ...belanjaCatalog.style, marginBottom: 0 } }],
    },
    {
      id: 'nav_home',
      label: 'Home',
      icon: 'home',
      enabled: true,
      action: 'scroll_top',
      sheetTitle: 'Beranda',
      children: [],
    },
    {
      id: 'nav_kontak',
      label: 'Kontak',
      icon: 'phone',
      enabled: true,
      action: 'sheet',
      sheetTitle: 'Hubungi Kami',
      children: [
        {
          ...kontakText,
          label: 'Info Kontak',
          style: { ...kontakText.style, align: 'left', marginBottom: 10 },
          content: {
            text: 'Pilih saluran tercepat untuk terhubung langsung dengan tim kami.',
            variant: 'body',
            fontWeight: 'normal',
          },
        },
        {
          ...kontakWa,
          label: 'Tombol WhatsApp',
          style: { ...kontakWa.style, marginBottom: 12 },
          content: {
            label: 'Chat via WhatsApp',
            url: 'https://wa.me/6281234567890',
            buttonBg: '#059669',
            buttonText: '#FFFFFF',
            buttonIcon: 'phone',
          },
        },
        {
          ...kontakSocial,
          style: { ...kontakSocial.style, marginBottom: 0 },
        },
      ],
    },
    {
      id: 'nav_alamat',
      label: 'Alamat',
      icon: 'map-pin',
      enabled: true,
      action: 'sheet',
      sheetTitle: 'Alamat & Lokasi Maps',
      children: [{ ...alamatMaps, style: { ...alamatMaps.style, marginBottom: 0 } }],
    },
  ];

  return {
    enabled,
    barBg: theme.cardBg,
    textColor: theme.textColor,
    accentColor: theme.accentColor,
    borderColor: theme.borderColor,
    centerStyle: 'elevated',
    iconSize: 18,
    labelSize: 10,
    barPaddingY: 8,
    barWidthPercent: 100,
    floating: false,
    bottomOffset: 0,
    borderRadius: 0,
    barShadow: 'md',
    items,
  };
}

export function resolveBottomNavbar(project: BuilderProject): BottomNavbarConfig {
  const existing = project.bottomNavbar;
  if (!existing || !Array.isArray(existing.items) || existing.items.length === 0) {
    return createDefaultBottomNavbar(project.theme, Boolean(existing?.enabled));
  }
  const floating = Boolean(existing.floating);
  return {
    enabled: Boolean(existing.enabled),
    barBg: existing.barBg || project.theme.cardBg,
    textColor: existing.textColor || project.theme.textColor,
    accentColor: existing.accentColor || project.theme.accentColor,
    borderColor: existing.borderColor || project.theme.borderColor,
    centerStyle: existing.centerStyle === 'inline' ? 'inline' : 'elevated',
    iconSize: Math.max(12, Math.min(32, existing.iconSize ?? 18)),
    labelSize: Math.max(8, Math.min(16, existing.labelSize ?? 10)),
    barPaddingY: Math.max(2, Math.min(24, existing.barPaddingY ?? 8)),
    barWidthPercent: Math.max(
      70,
      Math.min(100, existing.barWidthPercent ?? (floating ? 94 : 100))
    ),
    floating,
    bottomOffset: Math.max(0, Math.min(48, existing.bottomOffset ?? (floating ? 12 : 0))),
    borderRadius: Math.max(0, Math.min(32, existing.borderRadius ?? (floating ? 20 : 0))),
    barShadow: existing.barShadow ?? 'md',
    items: existing.items.map((it) => ({
      id: it.id || createId('nav'),
      label: typeof it.label === 'string' ? it.label : 'Menu',
      icon: it.icon || 'info',
      iconUrl: typeof it.iconUrl === 'string' ? it.iconUrl : '',
      enabled: it.enabled !== false,
      action:
        it.action === 'scroll_top'
          ? 'scroll_top'
          : it.action === 'link'
          ? 'link'
          : 'sheet',
      linkUrl: typeof it.linkUrl === 'string' ? it.linkUrl : '',
      sheetTitle: typeof it.sheetTitle === 'string' ? it.sheetTitle : it.label || 'Info',
      children: Array.isArray(it.children) ? it.children : [],
    })),
  };
}

export interface ResolvedNavbarMetrics {
  iconSize: number;
  fabIconSize: number;
  fabBoxSize: number;
  fabMarginTop: number;
  labelSize: number;
  barPaddingY: number;
  barWidthPercent: number;
  floating: boolean;
  bottomOffset: number;
  borderRadius: number;
  barShadow: ShadowPreset;
  shadowCss: string;
}

export function resolveNavbarMetrics(nav: BottomNavbarConfig): ResolvedNavbarMetrics {
  const iconSize = Math.max(12, Math.min(32, nav.iconSize ?? 18));
  const fabIconSize = Math.min(34, Math.round(iconSize * 1.2));
  const fabBoxSize = Math.max(36, Math.round(iconSize * 2.15) + 6);
  const fabMarginTop = -Math.round(fabBoxSize * 0.45);
  const labelSize = Math.max(8, Math.min(16, nav.labelSize ?? 10));
  const barPaddingY = Math.max(2, Math.min(24, nav.barPaddingY ?? 8));
  const floating = Boolean(nav.floating);
  const barWidthPercent = Math.max(
    70,
    Math.min(100, nav.barWidthPercent ?? (floating ? 94 : 100))
  );
  const bottomOffset = Math.max(0, Math.min(48, nav.bottomOffset ?? (floating ? 12 : 0)));
  const borderRadius = Math.max(0, Math.min(32, nav.borderRadius ?? (floating ? 20 : 0)));
  const barShadow = nav.barShadow ?? 'md';

  let shadowCss = 'none';
  if (barShadow === 'sm') {
    shadowCss =
      floating || bottomOffset > 0
        ? '0 4px 12px rgba(15, 23, 42, 0.08)'
        : '0 -3px 10px rgba(15, 23, 42, 0.05)';
  } else if (barShadow === 'md') {
    shadowCss =
      floating || bottomOffset > 0
        ? '0 10px 26px rgba(15, 23, 42, 0.14)'
        : '0 -6px 20px rgba(15, 23, 42, 0.08)';
  } else if (barShadow === 'lg') {
    shadowCss =
      floating || bottomOffset > 0
        ? '0 16px 38px rgba(15, 23, 42, 0.24)'
        : '0 -10px 28px rgba(15, 23, 42, 0.15)';
  }

  return {
    iconSize,
    fabIconSize,
    fabBoxSize,
    fabMarginTop,
    labelSize,
    barPaddingY,
    barWidthPercent,
    floating,
    bottomOffset,
    borderRadius,
    barShadow,
    shadowCss,
  };
}

export interface PrebuiltSection {
  id: string;
  category: PrebuiltSectionCategory;
  title: string;
  description: string;
  createBlocks: (theme: PageTheme) => BuilderBlock[];
}

export const PREBUILT_SECTION_CATEGORIES: Array<{
  id: 'semua' | PrebuiltSectionCategory;
  label: string;
}> = [
  { id: 'semua', label: 'Semua' },
  { id: 'kartu_info', label: 'Kartu & Info' },
  { id: 'katalog_store', label: 'Katalog & Store' },
  { id: 'event_kegiatan', label: 'Event & Kegiatan' },
  { id: 'tarif_paket', label: 'Tarif & Paket' },
  { id: 'hero_profil', label: 'Hero & Profil' },
  { id: 'menu_layout', label: 'Menu & Grid' },
  { id: 'kontak_medsos', label: 'Medsos & Kontak' },
];

export function createPngImageBlock(theme: PageTheme): BuilderBlock {
  const base = createBlock('image', theme);
  return {
    ...base,
    label: 'Gambar PNG',
    style: {
      ...base.style,
      backgroundColor: 'transparent',
      borderRadius: 0,
      borderWidth: 0,
      shadow: 'none',
      overflow: 'visible',
      minHeight: 148,
      padding: 8,
    },
    content: {
      src: POPOUT_SHOE_RED_SVG,
      alt: 'Objek PNG Transparan',
      imageName: 'produk-3d.png',
      aspectRatio: 'auto',
      objectFit: 'contain',
      imageShape: 'rect',
      imageZoom: 100,
      imagePngMode: true,
      imagePopoutEnabled: true,
      imageDropShadowEnabled: true,
      imageDropShadowX: 8,
      imageDropShadowY: 16,
      imageDropShadowBlur: 18,
      imageDropShadowColor: 'rgba(15, 23, 42, 0.34)',
      imageOffsetX: 0,
      imageOffsetY: 0,
      imageRotate: -12,
      imageHoverFloat3D: true,
    },
  };
}

function makeShowcaseCardBlock(
  label: string,
  variant: ShowcaseCardVariant,
  theme: PageTheme,
  patch: Partial<BuilderBlock['content']>,
  stylePatch?: Partial<BlockStyle>
): BuilderBlock {
  const base = createBlock('showcase_card', theme);
  return {
    ...base,
    label,
    style: {
      ...base.style,
      marginBottom: 0,
      ...stylePatch,
    },
    content: {
      ...base.content,
      cardVariant: variant,
      ...patch,
    },
  };
}

function makeSectionHeaderRow(
  title: string,
  moreLabel: string,
  theme: PageTheme,
  moreUrl = ''
): BuilderBlock {
  return {
    id: createId('hdr'),
    type: 'row',
    label: `Header ${title}`,
    style: {
      ...DEFAULT_STYLE,
      padding: 2,
      marginBottom: 6,
      minHeight: 24,
      backgroundColor: 'transparent',
      borderWidth: 0,
    },
    content: {
      rowLayoutMode: 'grid',
      rowColumns: 2,
      rowGridRows: 1,
      rowGap: 8,
    },
    children: [
      {
        id: createId('txt'),
        type: 'text',
        label: 'Judul Bagian',
        style: {
          ...DEFAULT_STYLE,
          align: 'left',
          padding: 0,
          marginBottom: 0,
          minHeight: 20,
          fontSize: 15,
          textColor: theme.textColor,
          useThemeTextColor: true,
        },
        content: { text: title, variant: 'h2', fontWeight: 'bold' },
      },
      {
        id: createId('btn'),
        type: 'button',
        label: moreLabel,
        style: {
          ...DEFAULT_STYLE,
          align: 'right',
          padding: 0,
          marginBottom: 0,
          minHeight: 20,
          borderRadius: 6,
          backgroundColor: 'transparent',
          fontSize: 11,
          fontWeightCss: '600',
        },
        content: {
          label: moreLabel,
          url: moreUrl || '#selengkapnya',
          buttonBg: 'transparent',
          buttonText: '#0284C7',
          buttonIcon: 'none',
        },
      },
    ],
  };
}

export const PREBUILT_SECTIONS: PrebuiltSection[] = [
  // === KARTU DINAMIS KATEGORI PORTAL & KOMUNITAS ===
  {
    id: 'kartu-kutipan-tokoh',
    category: 'kartu_info',
    title: 'Banner Kutipan Tokoh (Slide)',
    description: 'Kartu gradasi warna-warni dengan kutipan, nama tokoh, jabatan & foto potret (bisa digeser)',
    createBlocks: (theme) => [
      {
        id: createId('row'),
        type: 'row',
        label: 'Slide Kutipan Tokoh',
        style: {
          ...DEFAULT_STYLE,
          padding: 4,
          marginBottom: 14,
          minHeight: 110,
          backgroundColor: 'transparent',
          borderWidth: 0,
        },
        content: {
          rowLayoutMode: 'horizontal',
          rowColumns: 3,
          rowColumnWidth: 264,
          rowColumnMinHeight: 122,
          rowGap: 10,
        },
        children: [
          makeShowcaseCardBlock('Kutipan Tokoh 1', 'quote_banner', theme, {
            cardQuote: '".. Profesi yang dijalankan dengan integritas adalah profesi yang mulia.."',
            cardTitle: 'Ir. H. Tokoh Nasional',
            cardSubtitle: '(Pembina Kehormatan)',
            cardImage: HERO_LOGO_FOOD_SVG,
            cardImagePosition: 'right',
            cardGradientFrom: '#F59E0B',
            cardGradientTo: '#D97706',
            cardTextColor: '#FFFFFF',
          }),
          makeShowcaseCardBlock('Kutipan Tokoh 2', 'quote_banner', theme, {
            cardQuote: '"..Jangan merasa kecil, terus berkembang maju dan profesional ke depan.."',
            cardTitle: 'Prof. Dr. Pembina Utama',
            cardSubtitle: '(Dewan Penasehat)',
            cardImage: CAROUSEL_SAMPLE_1_SVG,
            cardImagePosition: 'right',
            cardGradientFrom: '#1D4ED8',
            cardGradientTo: '#3B82F6',
            cardTextColor: '#FFFFFF',
          }),
          makeShowcaseCardBlock('Kutipan Tokoh 3', 'quote_banner', theme, {
            cardQuote: '"..Sinergi dan kolaborasi menjadi kunci layanan yang aman dan terpercaya.."',
            cardTitle: 'Ketua Umum Asosiasi',
            cardSubtitle: '(Periode 2024–2029)',
            cardImage: CAROUSEL_SAMPLE_2_SVG,
            cardImagePosition: 'left',
            cardGradientFrom: '#22C55E',
            cardGradientTo: '#16A34A',
            cardTextColor: '#FFFFFF',
          }),
        ],
      },
    ],
  },
  {
    id: 'kartu-informasi-nasional',
    category: 'kartu_info',
    title: 'Kartu Informasi & Berita (Slide)',
    description: 'Header + Selengkapnya + kartu foto berita lebar dengan strip judul berwarna di bawah',
    createBlocks: (theme) => [
      {
        id: createId('cnt'),
        type: 'container',
        label: 'Informasi Nasional',
        style: {
          ...DEFAULT_STYLE,
          backgroundColor: theme.cardBg,
          borderColor: theme.borderColor,
          borderWidth: 1,
          borderRadius: 16,
          padding: 12,
          shadow: 'sm',
          align: 'left',
        },
        content: {},
        children: [
          makeSectionHeaderRow('Informasi Nasional', 'Selengkapnya', theme),
          {
            id: createId('row'),
            type: 'row',
            label: 'Daftar Berita',
            style: { ...DEFAULT_STYLE, padding: 0, marginBottom: 0, minHeight: 130 },
            content: {
              rowLayoutMode: 'horizontal',
              rowColumns: 2,
              rowColumnWidth: 256,
              rowColumnMinHeight: 146,
              rowGap: 10,
            },
            children: [
              makeShowcaseCardBlock('Berita 1', 'news_banner', theme, {
                cardTitle: 'Sinergi Program Strategis Nasional Tahun Ini',
                cardImage: CAROUSEL_SAMPLE_1_SVG,
                cardAccentColor: '#2563EB',
                cardTextColor: '#FFFFFF',
              }),
              makeShowcaseCardBlock('Berita 2', 'news_banner', theme, {
                cardTitle: 'Rapat Kerja Nasional & Peluncuran Layanan Baru',
                cardImage: CAROUSEL_SAMPLE_2_SVG,
                cardAccentColor: '#1D4ED8',
                cardTextColor: '#FFFFFF',
              }),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'kartu-even-promo',
    category: 'event_kegiatan',
    title: 'Kartu Even & Promo (Poster)',
    description: 'Header + Selengkapnya + kartu poster potret dengan strip judul warna di bawah',
    createBlocks: (theme) => [
      {
        id: createId('cnt'),
        type: 'container',
        label: 'Even dan Promo',
        style: {
          ...DEFAULT_STYLE,
          backgroundColor: theme.cardBg,
          borderColor: theme.borderColor,
          borderWidth: 1,
          borderRadius: 16,
          padding: 12,
          shadow: 'sm',
          align: 'left',
        },
        content: {},
        children: [
          makeSectionHeaderRow('Even dan Promo', 'Selengkapnya', theme),
          {
            id: createId('row'),
            type: 'row',
            label: 'Grid Poster Even',
            style: { ...DEFAULT_STYLE, padding: 0, marginBottom: 0, minHeight: 160 },
            content: {
              rowLayoutMode: 'grid',
              rowColumns: 2,
              rowGridRows: 1,
              rowGap: 10,
            },
            children: [
              makeShowcaseCardBlock('Poster Even 1', 'event_poster', theme, {
                cardTitle: '" Security Device Knowledge "',
                cardImage: CAROUSEL_SAMPLE_3_SVG,
                cardAccentColor: '#EA580C',
                cardTextColor: '#FFFFFF',
              }),
              makeShowcaseCardBlock('Poster Even 2', 'event_poster', theme, {
                cardTitle: '" Manajemen Tanggap Darurat "',
                cardImage: CAROUSEL_SAMPLE_1_SVG,
                cardAccentColor: '#3B82F6',
                cardTextColor: '#FFFFFF',
              }),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'kartu-sertifikasi',
    category: 'kartu_info',
    title: 'Kartu Informasi Sertifikasi (Badge)',
    description: 'Header + Selengkapnya + 3 kartu emblem/sertifikasi berwarna solid dengan judul putih',
    createBlocks: (theme) => [
      {
        id: createId('cnt'),
        type: 'container',
        label: 'Informasi Sertifikasi',
        style: {
          ...DEFAULT_STYLE,
          backgroundColor: theme.cardBg,
          borderColor: theme.borderColor,
          borderWidth: 1,
          borderRadius: 16,
          padding: 12,
          shadow: 'sm',
          align: 'left',
        },
        content: {},
        children: [
          makeSectionHeaderRow('Informasi Sertifikasi', 'Selengkapnya', theme),
          {
            id: createId('row'),
            type: 'row',
            label: 'Grid Sertifikasi',
            style: { ...DEFAULT_STYLE, padding: 0, marginBottom: 0, minHeight: 110 },
            content: {
              rowLayoutMode: 'grid',
              rowColumns: 3,
              rowGridRows: 1,
              rowGap: 8,
            },
            children: [
              makeShowcaseCardBlock('Sertifikasi Pratama', 'badge_tile', theme, {
                cardTitle: 'Sertifikasi Pelaksana',
                cardImage: HERO_LOGO_FOOD_SVG,
                cardGradientFrom: '#3B82F6',
                cardGradientTo: '#2563EB',
                cardTextColor: '#FFFFFF',
              }),
              makeShowcaseCardBlock('Sertifikasi Madya', 'badge_tile', theme, {
                cardTitle: 'Sertifikasi Supervisor',
                cardImage: HERO_LOGO_FOOD_SVG,
                cardGradientFrom: '#F59E0B',
                cardGradientTo: '#FB923C',
                cardTextColor: '#FFFFFF',
              }),
              makeShowcaseCardBlock('Sertifikasi Utama', 'badge_tile', theme, {
                cardTitle: 'Sertifikasi Manajer',
                cardImage: HERO_LOGO_FOOD_SVG,
                cardGradientFrom: '#EF4444',
                cardGradientTo: '#DC2626',
                cardTextColor: '#FFFFFF',
              }),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'kartu-store-gradasi',
    category: 'katalog_store',
    title: 'Kartu Store Gradasi + Keranjang',
    description: 'Kartu produk gradasi warna-warni (foto, judul, harga, ikon aksi) siap tambah ke keranjang',
    createBlocks: (theme) => [
      {
        id: createId('cnt'),
        type: 'container',
        label: 'Store Produk Pilihan',
        style: {
          ...DEFAULT_STYLE,
          backgroundColor: theme.cardBg,
          borderColor: theme.borderColor,
          borderWidth: 1,
          borderRadius: 16,
          padding: 12,
          shadow: 'sm',
          align: 'left',
        },
        content: {},
        children: [
          makeSectionHeaderRow('Store Resmi', 'Selengkapnya', theme),
          {
            id: createId('row'),
            type: 'row',
            label: 'Slide Produk Store',
            style: { ...DEFAULT_STYLE, padding: 0, marginBottom: 0, minHeight: 160 },
            content: {
              rowLayoutMode: 'horizontal',
              rowColumns: 4,
              rowColumnWidth: 136,
              rowColumnMinHeight: 176,
              rowGap: 10,
            },
            children: [
              makeShowcaseCardBlock('Produk Store 1', 'store_card', theme, {
                cardTitle: 'Topi Resmi',
                cardPrice: 'Rp. 80.000,-',
                cardImage: PRODUCT_CARD_SVG,
                cardGradientFrom: '#FDBA74',
                cardGradientTo: '#EA580C',
                cardTextColor: '#FFFFFF',
                cardShowPlayIcon: true,
                cardEnableCart: true,
              }),
              makeShowcaseCardBlock('Produk Store 2', 'store_card', theme, {
                cardTitle: 'Buku Panduan',
                cardPrice: 'Rp. 150.000,-',
                cardImage: STARTER_ILLUSTRATION_SVG,
                cardGradientFrom: '#34D399',
                cardGradientTo: '#0D9488',
                cardTextColor: '#FFFFFF',
                cardShowPlayIcon: true,
                cardEnableCart: true,
              }),
              makeShowcaseCardBlock('Produk Store 3', 'store_card', theme, {
                cardTitle: 'Badge Resmi',
                cardPrice: 'Rp. 20.000,-',
                cardImage: HERO_LOGO_FOOD_SVG,
                cardGradientFrom: '#60A5FA',
                cardGradientTo: '#2563EB',
                cardTextColor: '#FFFFFF',
                cardShowPlayIcon: true,
                cardEnableCart: true,
              }),
              makeShowcaseCardBlock('Produk Store 4', 'store_card', theme, {
                cardTitle: 'Pin Eksklusif',
                cardPrice: 'Rp. 100.000,-',
                cardImage: CAROUSEL_SAMPLE_1_SVG,
                cardGradientFrom: '#94A3B8',
                cardGradientTo: '#475569',
                cardTextColor: '#FFFFFF',
                cardShowPlayIcon: true,
                cardEnableCart: true,
              }),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'kartu-produk-3d-popout',
    category: 'katalog_store',
    title: 'Kartu Produk 3D Pop-Out',
    description: 'Kartu produk 3D dengan foto PNG keluar bingkai, bayangan siluet, efek hover melayang & tombol keranjang',
    createBlocks: (theme) => [
      {
        id: createId('sec_popout'),
        type: 'container',
        label: 'Koleksi Produk 3D Pop-Out',
        style: {
          ...DEFAULT_STYLE,
          backgroundColor: 'transparent',
          borderWidth: 0,
          shadow: 'none',
          overflow: 'visible',
          padding: 0,
          marginBottom: 14,
          minHeight: 240,
        },
        content: {},
        children: [
          makeSectionHeaderRow('Koleksi Unggulan', 'Lihat Semua', theme),
          {
            id: createId('row'),
            type: 'row',
            label: 'Slide Produk 3D Pop-Out',
            style: {
              ...DEFAULT_STYLE,
              backgroundColor: 'transparent',
              borderWidth: 0,
              shadow: 'none',
              overflow: 'visible',
              padding: 0,
              marginBottom: 0,
              minHeight: 224,
            },
            content: {
              rowLayoutMode: 'horizontal',
              rowColumns: 3,
              rowColumnWidth: 168,
              rowColumnMinHeight: 212,
              rowGap: 18,
              rowShowDots: true,
              rowDotsPosition: 'below',
            },
            children: [
              makeShowcaseCardBlock(
                'Alpha Savage',
                'popout_product',
                theme,
                {
                  cardTitle: 'Alpha Savage',
                  cardPrice: 'Rp 1.499.000',
                  cardImage: POPOUT_SHOE_RED_SVG,
                  cardGradientFrom: '#E94352',
                  cardGradientTo: '#DC2D3F',
                  cardTextColor: '#FFFFFF',
                  cardMediaSize: 152,
                  cardImageZoom: 108,
                  cardImageFit: 'contain',
                  cardPopoutAccentLine: true,
                  cardEnableCart: true,
                  cardPopoutCartPosition: 'bottom-left',
                  imagePngMode: true,
                  imagePopoutEnabled: true,
                  imageOffsetX: 16,
                  imageOffsetY: 10,
                  imageRotate: -24,
                  imageDropShadowEnabled: true,
                  imageDropShadowX: 8,
                  imageDropShadowY: 18,
                  imageDropShadowBlur: 20,
                  imageDropShadowColor: 'rgba(15, 23, 42, 0.36)',
                  imageHoverFloat3D: true,
                },
                { borderRadius: 18, overflow: 'visible', minHeight: 208 }
              ),
              makeShowcaseCardBlock(
                'Air Max 97',
                'popout_product',
                theme,
                {
                  cardTitle: 'Air Max 97',
                  cardPrice: 'Rp 1.899.000',
                  cardImage: POPOUT_SHOE_AMBER_SVG,
                  cardGradientFrom: '#FCC659',
                  cardGradientTo: '#F6AF3A',
                  cardTextColor: '#17243D',
                  cardMediaSize: 152,
                  cardImageZoom: 108,
                  cardImageFit: 'contain',
                  cardPopoutAccentLine: true,
                  cardEnableCart: true,
                  cardPopoutCartPosition: 'bottom-left',
                  imagePngMode: true,
                  imagePopoutEnabled: true,
                  imageOffsetX: 16,
                  imageOffsetY: 10,
                  imageRotate: -22,
                  imageDropShadowEnabled: true,
                  imageDropShadowX: 8,
                  imageDropShadowY: 18,
                  imageDropShadowBlur: 20,
                  imageDropShadowColor: 'rgba(120, 53, 15, 0.34)',
                  imageHoverFloat3D: true,
                },
                { borderRadius: 18, overflow: 'visible', minHeight: 208 }
              ),
              makeShowcaseCardBlock(
                'KD13 EP',
                'popout_product',
                theme,
                {
                  cardTitle: 'KD13 EP',
                  cardPrice: 'Rp 2.150.000',
                  cardImage: POPOUT_SHOE_BLUE_SVG,
                  cardGradientFrom: '#4584FA',
                  cardGradientTo: '#2E6DF6',
                  cardTextColor: '#FFFFFF',
                  cardMediaSize: 152,
                  cardImageZoom: 108,
                  cardImageFit: 'contain',
                  cardPopoutAccentLine: true,
                  cardEnableCart: true,
                  cardPopoutCartPosition: 'bottom-left',
                  imagePngMode: true,
                  imagePopoutEnabled: true,
                  imageOffsetX: 16,
                  imageOffsetY: 10,
                  imageRotate: -24,
                  imageDropShadowEnabled: true,
                  imageDropShadowX: 8,
                  imageDropShadowY: 18,
                  imageDropShadowBlur: 20,
                  imageDropShadowColor: 'rgba(15, 23, 42, 0.34)',
                  imageHoverFloat3D: true,
                },
                { borderRadius: 18, overflow: 'visible', minHeight: 208 }
              ),
            ],
          },
        ],
      },
    ],
  },
  {
    id: 'kartu-feed-kegiatan',
    category: 'event_kegiatan',
    title: 'Kartu Feed Kegiatan (3 Foto)',
    description: 'Avatar penulis, jabatan, judul & tanggal kegiatan, galeri 3 foto sejajar, link Selengkapnya & views',
    createBlocks: (theme) => [
      makeShowcaseCardBlock(
        'Feed Kegiatan',
        'activity_post',
        theme,
        {
          cardTitle: 'Said Azis',
          cardSubtitle: 'Ketua Umum',
          cardQuote: 'Judul Kegiatan Komunitas',
          cardDate: '18/02/2026',
          cardViews: '200',
          cardMoreLabel: 'Selengkapnya',
          cardImage: HERO_LOGO_FOOD_SVG,
          cardGalleryImages: [
            CAROUSEL_SAMPLE_1_SVG,
            CAROUSEL_SAMPLE_2_SVG,
            CAROUSEL_SAMPLE_3_SVG,
          ],
          cardAccentColor: '#0284C7',
          cardTextColor: theme.textColor,
        },
        {
          backgroundColor: theme.cardBg,
          borderWidth: 1,
          borderColor: theme.borderColor,
          padding: 14,
          marginBottom: 12,
        }
      ),
    ],
  },
  {
    id: 'kartu-tarif-keanggotaan',
    category: 'tarif_paket',
    title: 'Kartu Tiket Tarif & Keanggotaan',
    description: 'Kartu tiket dengan cekungan sisi, rincian biaya dinamis & strip total berwarna + ikon dompet',
    createBlocks: (theme) => [
      {
        id: createId('row'),
        type: 'row',
        label: 'Slide Paket Keanggotaan',
        style: {
          ...DEFAULT_STYLE,
          padding: 4,
          marginBottom: 14,
          minHeight: 150,
          backgroundColor: 'transparent',
          borderWidth: 0,
        },
        content: {
          rowLayoutMode: 'horizontal',
          rowColumns: 3,
          rowColumnWidth: 256,
          rowColumnMinHeight: 158,
          rowGap: 12,
        },
        children: [
          makeShowcaseCardBlock('Anggota Pratama', 'membership_ticket', theme, {
            cardTitle: 'Anggota Pratama',
            cardFeeItems: [
              { id: createId('fee'), label: 'Pendaftaran', value: 'Rp. 100.000' },
              { id: createId('fee'), label: 'Iuran Anggota', value: 'Rp. 400.000' },
            ],
            cardTotalLabel: 'Total :',
            cardTotalValue: 'Rp. 500.000,-',
            cardAccentColor: '#EF4444',
            cardTextColor: '#FFFFFF',
          }),
          makeShowcaseCardBlock('Anggota Madya', 'membership_ticket', theme, {
            cardTitle: 'Anggota Madya',
            cardFeeItems: [
              { id: createId('fee'), label: 'Pendaftaran', value: 'Rp. 25.000' },
              { id: createId('fee'), label: 'Iuran Anggota', value: 'Rp. 100.000' },
            ],
            cardTotalLabel: 'Total :',
            cardTotalValue: 'Rp. 125.000,-',
            cardAccentColor: '#FACC15',
            cardTextColor: '#1E3A8A',
          }),
          makeShowcaseCardBlock('Anggota Utama', 'membership_ticket', theme, {
            cardTitle: 'Anggota Utama',
            cardFeeItems: [
              { id: createId('fee'), label: 'Pendaftaran', value: 'Rp. 20.000' },
              { id: createId('fee'), label: 'Iuran Anggota', value: 'Rp. 80.000' },
            ],
            cardTotalLabel: 'Total :',
            cardTotalValue: 'Rp. 100.000',
            cardAccentColor: '#0284C7',
            cardTextColor: '#FFFFFF',
          }),
        ],
      },
    ],
  },
  {
    id: 'menu-grid-spesial',
    category: 'menu_layout',
    title: 'Menu Grid 3x3 (Spesial Untuk Anda)',
    description: 'Kartu grid 3 kolom x 3 baris berisi 9 Menu Icon dinamis (bisa tambah kolom/baris & atur aksi sheet)',
    createBlocks: (theme) => {
      const menuDefs = [
        { label: 'Regulasi', bg: '#EFF6FF' },
        { label: 'Informasi', bg: '#F5F3FF' },
        { label: 'Konsultasi', bg: '#FDF2F8' },
        { label: 'Edukasi', bg: '#EEF2FF' },
        { label: 'Pelatihan', bg: '#FFFBEB' },
        { label: 'Sertifikasi', bg: '#EFF6FF' },
        { label: 'Store', bg: '#ECFEFF' },
        { label: 'Artikel', bg: '#F0FDF4' },
        { label: 'Media', bg: '#FFF7ED' },
      ];
      return [
        {
          id: createId('cnt'),
          type: 'container',
          label: 'Spesial Untuk Anda',
          style: {
            ...DEFAULT_STYLE,
            backgroundColor: theme.cardBg,
            borderColor: theme.borderColor,
            borderWidth: 1,
            borderRadius: 18,
            padding: 14,
            shadow: 'sm',
            align: 'left',
          },
          content: {},
          children: [
            {
              id: createId('txt'),
              type: 'text',
              label: 'Judul Menu Grid',
              style: {
                ...DEFAULT_STYLE,
                align: 'left',
                padding: 2,
                marginBottom: 10,
                minHeight: 22,
                fontSize: 15,
                textColor: theme.textColor,
              },
              content: { text: 'Spesial Untuk Anda', variant: 'h2', fontWeight: 'bold' },
            },
            {
              id: createId('row'),
              type: 'row',
              label: 'Grid 3x3 Menu',
              style: {
                ...DEFAULT_STYLE,
                padding: 2,
                marginBottom: 0,
                minHeight: 160,
                backgroundColor: 'transparent',
                borderWidth: 0,
              },
              content: {
                rowLayoutMode: 'grid',
                rowColumns: 3,
                rowGridRows: 3,
                rowGap: 10,
              },
              children: menuDefs.map((m) => {
                const iconBlk = createBlock('menu_icon', theme);
                return {
                  ...iconBlk,
                  label: m.label,
                  style: {
                    ...iconBlk.style,
                    padding: 4,
                    marginBottom: 0,
                    minHeight: 68,
                    fontSize: 11,
                    fontWeightCss: '600',
                  },
                  content: {
                    ...iconBlk.content,
                    menuIconLabel: m.label,
                    menuIconShape: 'rounded',
                    menuIconRadius: 14,
                    menuIconSize: 52,
                    menuIconBg: m.bg,
                    menuIconTextColor: '#0284C7',
                    sheetTitle: m.label,
                  },
                };
              }),
            },
          ],
        },
      ];
    },
  },
  // === BLOK TEMPLATE BAWAAN (TERKATEGORI) ===
  {
    id: 'hero-profil-kompak',
    category: 'hero_profil',
    title: 'Hero Profil Kompak (Status & Jam)',
    description: 'Kartu profil usaha dengan logo bulat/monogram, badge Buka sekarang, lokasi & jam buka',
    createBlocks: (theme) => [createBlock('hero_profile', theme)],
  },
  {
    id: 'hero-profil-banner',
    category: 'hero_profil',
    title: 'Hero Profil Banner Full Atas',
    description: 'Cover foto full di atas dengan kartu putih/gradasi overlap, logo bulat, rating & alamat',
    createBlocks: (theme) => {
      const hero = createBlock('hero_profile', theme);
      return [
        {
          ...hero,
          label: 'Hero Banner Full Atas',
          style: {
            ...hero.style,
            fullBleed: true,
            widthPercent: 100,
            borderRadius: 0,
            backgroundMode: 'gradient',
            gradientColor1: '#EFF6FF',
            gradientColor2: '#FAF5FF',
            gradientAngle: 135,
          },
          content: {
            ...hero.content,
            heroVariant: 'banner',
            heroStatusEnabled: false,
            heroLogoImage: HERO_LOGO_FOOD_SVG,
            heroLogoSize: 78,
            heroCoverImage: HERO_COVER_WARM_SVG,
            heroCoverTitle: 'Warung Barokah',
            heroCoverFontFamily: 'Pacifico',
            heroCoverHeight: 175,
            heroOverlapPx: 36,
            heroTitle: 'Warung Barokah',
            heroTitleSize: 22,
            heroSubtitle: 'Sekali coba, susah move on!',
            heroSubtitleSize: 13,
            heroRating: '4.9',
            heroHours: '07:00 - 21:00',
            heroLocation: 'Jl. Kenyang No. 88, RT 02 RW 04, Kel. Perut Bahagia',
            heroCardRadius: 24,
          },
        },
      ];
    },
  },
  {
    id: 'tombol-kategori-scroll',
    category: 'menu_layout',
    title: 'Template Kategori Menu (Siap Pakai)',
    description: 'Template siap pakai tombol kategori Favorit, Makanan, Minuman dengan scroll horizontal/vertikal',
    createBlocks: (theme) => [createBlock('category_tabs', theme)],
  },
  {
    id: 'row-slide-horizontal',
    category: 'menu_layout',
    title: 'Row 5 Kolom Slide Horizontal',
    description: 'Deretan 5 kotak kolom geser samping (bisa tambah 1–20 kolom, atur lebar kolom & kotak wadah)',
    createBlocks: (theme) => {
      const colData = [
        { title: 'Paket Hemat', sub: 'Mulai Rp 18rb', bg: '#FFF7ED', border: '#FED7AA', accent: '#EA580C' },
        { title: 'Best Seller', sub: 'Favorit Pelanggan', bg: '#EFF6FF', border: '#BFDBFE', accent: '#2563EB' },
        { title: 'Menu Baru', sub: 'Coba Minggu Ini', bg: '#ECFDF5', border: '#A7F3D0', accent: '#059669' },
        { title: 'Minuman Segar', sub: 'Es & Kopi Susu', bg: '#FAF5FF', border: '#E9D5FF', accent: '#7C3AED' },
        { title: 'Cemilan Sore', sub: 'Teman Nongkrong', bg: '#FEF2F2', border: '#FECACA', accent: '#DC2626' },
      ];
      return [
        {
          id: createId('row'),
          type: 'row',
          label: 'Row 5 Kolom Slide',
          style: {
            ...DEFAULT_STYLE,
            widthPercent: 100,
            minHeight: 80,
            padding: 8,
            borderRadius: 16,
            backgroundColor: 'transparent',
            borderColor: theme.borderColor,
            textColor: theme.textColor,
          },
          content: {
            rowLayoutMode: 'horizontal',
            rowColumns: 4,
            rowColumnWidth: 146,
            rowColumnMinHeight: 112,
            rowGap: 10,
          },
          children: colData.map((col, idx) => ({
            id: createId('cnt'),
            type: 'container',
            label: `Kotak ${idx + 1}`,
            style: {
              ...DEFAULT_STYLE,
              widthPercent: 100,
              minHeight: 112,
              padding: 12,
              marginBottom: 0,
              borderRadius: 16,
              borderWidth: 1,
              borderColor: col.border,
              backgroundColor: col.bg,
              textColor: '#0F172A',
              useThemeTextColor: false,
              shadow: 'sm',
              hoverLift: true,
              align: 'left',
            },
            content: {},
            children: [
              {
                id: createId('txt'),
                type: 'text',
                label: 'Judul Kolom',
                style: {
                  ...DEFAULT_STYLE,
                  padding: 0,
                  marginBottom: 4,
                  minHeight: 20,
                  fontSize: 13,
                  textColor: col.accent,
                  useThemeTextColor: false,
                  align: 'left',
                },
                content: { text: col.title, variant: 'h2', fontWeight: 'bold' },
              },
              {
                id: createId('txt'),
                type: 'text',
                label: 'Keterangan',
                style: {
                  ...DEFAULT_STYLE,
                  padding: 0,
                  marginBottom: 0,
                  minHeight: 16,
                  fontSize: 11,
                  textColor: '#475569',
                  useThemeTextColor: false,
                  align: 'left',
                },
                content: { text: col.sub, variant: 'body', fontWeight: 'normal' },
              },
            ],
          })),
        },
      ];
    },
  },
  {
    id: 'slide-produk-fnb',
    category: 'katalog_store',
    title: 'Slide Produk F&B',
    description:
      'Carousel produk F&B melengkung dengan gradasi warna berubah halus saat digeser, peek kiri-kanan & klik detail expand',
    createBlocks: (theme) => [createBlock('fnb_hero_slider', theme)],
  },
  {
    id: 'slide-kuliner-putar',
    category: 'katalog_store',
    title: 'Slide Kuliner Putar',
    description:
      'Slide piring kuliner top-down dengan latar blur aura makanan yang berganti otomatis & efek putar melengkung saat di-swipe',
    createBlocks: (theme) => [createBlock('culinary_spin_slider', theme)],
  },
  {
    id: 'studio-produk-melayang',
    category: 'katalog_store',
    title: 'Studio Produk Melayang',
    description:
      'Panggung studio warna penuh yang berubah mulus mengikuti produk melayang 3D + miniatur klik-pindah di sudut kanan bawah',
    createBlocks: (theme) => [createBlock('floating_product_studio', theme)],
  },
  {
    id: 'interactive-box-showcase',
    category: 'katalog_store',
    title: 'Interactive Box Showcase',
    description:
      'Animasi box sepatu 3D buka-tutup otomatis saat di-swipe atau auto slide — cukup ganti foto produk, pilih mode slide, warna box & jumlah box',
    createBlocks: (theme) => [createBlock('interactive_box_showcase', theme)],
  },
  {
    id: 'animated-product-box-reveal',
    category: 'katalog_store',
    title: 'Animated Product Box Reveal',
    description:
      'Kotak kayu eksklusif tertutup yang membuka mulus memperlihatkan produk di dalamnya lalu berhenti rapi — cukup ganti foto, warna kotak & jumlah kotak',
    createBlocks: (theme) => [createBlock('product_box_reveal', theme)],
  },
  {
    id: 'mix-rasa',
    category: 'katalog_store',
    title: 'Mix Rasa (Konfigurator Kombinasi Rasa)',
    description:
      'Konfigurator kombinasi 2–4 rasa dalam satu produk bundar dengan preview langsung, hitung harga otomatis, Keranjang Melayang & Link WhatsApp',
    createBlocks: (theme) => [createBlock('mix_rasa', theme)],
  },
  {
    id: 'slide-mix-rasa',
    category: 'katalog_store',
    title: 'Slide Mix Rasa (Geser Kiri & Kanan)',
    description:
      'Konfigurator slide vertikal 2 belahan kiri-kanan independen dengan preview intip atas/bawah, tombol acak dadu, hitung harga otomatis, Keranjang Melayang, WA & Tanya Admin',
    createBlocks: (theme) => [createBlock('slide_mix_rasa', theme)],
  },
  {
    id: 'katalog-fnb',
    category: 'katalog_store',
    title: 'Katalog F&B + Keranjang Mengambang',
    description: 'Menu makanan/minuman, upload/link foto, atur harga, & kotak pilih item mengambang',
    createBlocks: (theme) => [createBlock('fnb_catalog', theme)],
  },
  {
    id: 'kotak-outlet-dinamis',
    category: 'kontak_medsos',
    title: 'Kotak Info Outlet & Google Maps',
    description: 'Kartu alamat dinamis dengan ikon bulat, jam buka beraksen, dan tombol outline Maps',
    createBlocks: (theme) => [
      {
        id: createId('cnt'),
        type: 'container',
        label: 'Kotak Info Outlet',
        style: {
          ...DEFAULT_STYLE,
          backgroundColor: theme.cardBg,
          borderColor: theme.borderColor,
          textColor: theme.textColor,
          borderWidth: 1,
          borderRadius: 20,
          padding: 18,
          shadow: 'sm',
          hoverLift: true,
          align: 'left',
          minHeight: 120,
        },
        content: {},
        children: [
          {
            id: createId('txt'),
            type: 'text',
            label: 'Judul Outlet',
            style: { ...DEFAULT_STYLE, align: 'left', padding: 0, marginBottom: 6, minHeight: 24, textColor: theme.textColor, fontSize: 18 },
            content: { text: 'Kunjungi Outlet Kami', variant: 'h2', fontWeight: 'bold' },
          },
          {
            id: createId('txt'),
            type: 'text',
            label: 'Alamat Outlet',
            style: { ...DEFAULT_STYLE, align: 'left', padding: 0, marginBottom: 6, minHeight: 20, textColor: '#475569', useThemeTextColor: false, fontSize: 14 },
            content: { text: 'Jl. Raya Serang - Jakarta, Cikande, Banten.', variant: 'body', fontWeight: 'normal' },
          },
          {
            id: createId('txt'),
            type: 'text',
            label: 'Jam Operasional',
            style: { ...DEFAULT_STYLE, align: 'left', padding: 0, marginBottom: 14, minHeight: 18, textColor: '#EA580C', useThemeTextColor: false, fontSize: 12 },
            content: { text: 'Buka Setiap Hari: 10.00 - 22.00 WIB', variant: 'body', fontWeight: 'semibold' },
          },
          {
            id: createId('btn'),
            type: 'button',
            label: 'Tombol Google Maps',
            style: { ...DEFAULT_STYLE, padding: 0, marginBottom: 0, borderRadius: 12, minHeight: 44, borderWidth: 1, borderColor: '#EA580C' },
            content: { label: 'Buka Google Maps', url: 'https://maps.google.com', buttonBg: '#FFFFFF', buttonText: '#EA580C', buttonIcon: 'map-pin' },
          },
        ],
      },
    ],
  },
  {
    id: 'kotak-promo-gradasi',
    category: 'kartu_info',
    title: 'Kotak Promo CTA Gradasi Dinamis',
    description: 'Kartu promo berlatar gradasi warna yang sudut derajatnya bisa diatur bebas + tombol CTA',
    createBlocks: (theme) => [
      {
        id: createId('cnt'),
        type: 'container',
        label: 'Kotak Promo Gradasi',
        style: {
          ...DEFAULT_STYLE,
          backgroundColor: '#EA580C',
          backgroundMode: 'gradient',
          gradientColor1: '#EA580C',
          gradientColor2: '#9A3412',
          gradientAngle: 135,
          textColor: '#FFFFFF',
          useThemeTextColor: false,
          borderWidth: 0,
          borderRadius: 24,
          padding: 24,
          shadow: 'md',
          hoverLift: true,
          align: 'center',
          minHeight: 160,
        },
        content: {},
        children: [
          {
            id: createId('txt'),
            type: 'text',
            label: 'Judul Promo',
            style: { ...DEFAULT_STYLE, align: 'center', padding: 2, marginBottom: 10, minHeight: 28, textColor: '#FFFFFF', useThemeTextColor: true, fontSize: 22 },
            content: { text: 'Pesan Cepat Langsung via WhatsApp', variant: 'h1', fontWeight: 'bold' },
          },
          {
            id: createId('txt'),
            type: 'text',
            label: 'Subjudul Promo',
            style: { ...DEFAULT_STYLE, align: 'center', padding: 2, marginBottom: 16, minHeight: 24, textColor: '#FFFFFF', useThemeTextColor: true, fontSize: 14 },
            content: { text: 'Tidak perlu ribet daftar akun atau download aplikasi tambahan. Tinggal klik dan pesananmu langsung kami proses!', variant: 'body', fontWeight: 'normal' },
          },
          {
            id: createId('btn'),
            type: 'button',
            label: 'Tombol Pesan Sekarang',
            style: { ...DEFAULT_STYLE, widthPercent: 80, padding: 0, marginBottom: 0, borderRadius: 9999, minHeight: 46, shadow: 'sm' },
            content: { label: 'Pesan Sekarang', url: 'https://wa.me/6281234567890', buttonBg: '#FFFFFF', buttonText: '#C2410C', buttonIcon: 'whatsapp' },
          },
        ],
      },
    ],
  },
  {
    id: 'bottom-sheet-maps',
    category: 'kontak_medsos',
    title: 'Template Sheet Lokasi & Maps',
    description: 'Template siap pakai pemicu ikon Maps yang membuka panel sheet lokasi & ulasan',
    createBlocks: (theme) => [createBlock('bottom_sheet', theme)],
  },
  {
    id: 'lokasi-maps',
    category: 'kontak_medsos',
    title: 'Template Kartu Lokasi Maps',
    description: 'Template siap pakai kartu foto lokasi, rating bintang & rute Google Maps',
    createBlocks: (theme) => [createBlock('maps_place', theme)],
  },
  {
    id: 'sosmed-postingan',
    category: 'kontak_medsos',
    title: 'Sosmed & Postingan Carousel',
    description: 'Profil akun sosmed & slide postingan foto/video',
    createBlocks: (theme) => [createBlock('social_feed', theme)],
  },
  {
    id: 'sosmed-follower-cards',
    category: 'kontak_medsos',
    title: 'Sosial Media + Follower Cards',
    description: 'Kartu profil akun & jumlah follower seluruh sosial media',
    createBlocks: (theme) => [createBlock('social_follower', theme)],
  },
  {
    id: 'foto-carousel',
    category: 'kartu_info',
    title: 'Galeri Foto Carousel',
    description: 'Slide galeri foto geser dengan keterangan',
    createBlocks: (theme) => [createBlock('carousel', theme)],
  },
  {
    id: 'katalog-produk-pelatihan',
    category: 'tarif_paket',
    title: 'Katalog Produk Pelatihan',
    description: 'Deskripsi, foto & postingan, harga/potongan/cashback, syarat berkas, form & konsultasi WA',
    createBlocks: (theme) => [createBlock('training_catalog', theme)],
  },
  {
    id: 'katalog-produk-fisik',
    category: 'katalog_store',
    title: 'Katalog Produk Fisik',
    description: 'Produk, data pemesan dinamis, pilihan kirim/ambil & kirim via WA',
    createBlocks: (theme) => [createCatalogBlock('physical', theme)],
  },
  {
    id: 'katalog-produk-digital',
    category: 'katalog_store',
    title: 'Katalog Produk Digital',
    description: 'Produk digital, data pemesan dinamis & kirim langsung via WA',
    createBlocks: (theme) => [createCatalogBlock('digital', theme)],
  },
  {
    id: 'hero-profile',
    category: 'hero_profil',
    title: 'Hero Profil Kreator',
    description: 'Kartu pembuka dengan logo, judul & bio',
    createBlocks: (theme) => [
      {
        id: createId('cnt'),
        type: 'container',
        label: 'Kartu Profil',
        style: {
          ...DEFAULT_STYLE,
          backgroundColor: theme.cardBg,
          borderColor: theme.borderColor,
          textColor: theme.textColor,
          borderWidth: 1,
          borderRadius: 18,
          padding: 20,
          shadow: 'sm',
          minHeight: 120,
        },
        content: {},
        children: [
          {
            id: createId('img'),
            type: 'image',
            label: 'Foto Profil',
            style: {
              ...DEFAULT_STYLE,
              align: 'center',
              padding: 0,
              borderRadius: 9999,
              borderWidth: 4,
              borderColor: '#FFFFFF',
              shadow: 'md',
              minHeight: 0,
              marginBottom: 14,
            },
            content: {
              src: STARTER_ILLUSTRATION_SVG,
              alt: 'Foto Profil',
              aspectRatio: '1/1',
              objectFit: 'cover',
              imageShape: 'circle',
              circleSize: 112,
              imageZoom: 100,
            },
          },
          {
            id: createId('txt'),
            type: 'text',
            label: 'Nama Brand',
            style: {
              ...DEFAULT_STYLE,
              textColor: theme.textColor,
              useThemeTextColor: true,
              padding: 2,
              minHeight: 24,
              marginBottom: 6,
            },
            content: { text: 'Studio Kreatif Nusantara', variant: 'h1', fontWeight: 'bold' },
          },
          {
            id: createId('txt'),
            type: 'text',
            label: 'Bio Singkat',
            style: {
              ...DEFAULT_STYLE,
              textColor: theme.textColor,
              useThemeTextColor: true,
              padding: 2,
              minHeight: 24,
              marginBottom: 0,
            },
            content: {
              text: 'Template presentasi, aset desain, dan panduan bisnis digital siap pakai.',
              variant: 'body',
              fontWeight: 'normal',
            },
          },
        ],
      },
    ],
  },
  {
    id: 'link-stack',
    category: 'menu_layout',
    title: 'Daftar Tautan Utama',
    description: '3 tombol tautan utama bertumpuk',
    createBlocks: (theme) => [
      {
        ...createBlock('button', theme),
        label: 'Link Toko Utama',
        content: {
          label: 'Katalog Produk Digital',
          url: 'https://example.com/katalog',
          buttonBg: theme.accentColor,
          buttonText: '#FFFFFF',
        },
      },
      {
        ...createBlock('button', theme),
        label: 'Link WhatsApp',
        content: {
          label: 'Konsultasi via WhatsApp',
          url: 'https://wa.me/628123456789',
          buttonBg: '#0F172A',
          buttonText: '#FFFFFF',
        },
      },
      {
        ...createBlock('button', theme),
        label: 'Link Kelas Online',
        content: {
          label: 'Daftar Kelas Desain Mingguan',
          url: 'https://example.com/kelas',
          buttonBg: '#334155',
          buttonText: '#FFFFFF',
        },
      },
    ],
  },
  {
    id: 'digital-product',
    category: 'katalog_store',
    title: 'Kartu Produk Unggulan',
    description: 'Kartu promo satu produk & tombol beli',
    createBlocks: (theme) => [
      {
        id: createId('cnt'),
        type: 'container',
        label: 'Kartu Produk',
        style: {
          ...DEFAULT_STYLE,
          backgroundColor: theme.cardBg,
          borderColor: theme.borderColor,
          textColor: theme.textColor,
          borderWidth: 1,
          borderRadius: 16,
          padding: 16,
          shadow: 'sm',
          align: 'left',
        },
        content: {},
        children: [
          {
            id: createId('img'),
            type: 'image',
            label: 'Banner Produk',
            style: { ...DEFAULT_STYLE, padding: 0, borderRadius: 12, marginBottom: 12, minHeight: 100 },
            content: { src: PRODUCT_CARD_SVG, alt: 'Paket Template UI', aspectRatio: '16/9', objectFit: 'cover' },
          },
          {
            id: createId('txt'),
            type: 'text',
            label: 'Judul Produk',
            style: { ...DEFAULT_STYLE, align: 'left', textColor: theme.textColor, padding: 2, marginBottom: 4, minHeight: 24 },
            content: { text: 'Paket 50+ Template Landing Page', variant: 'h2', fontWeight: 'bold' },
          },
          {
            id: createId('txt'),
            type: 'text',
            label: 'Harga Produk',
            style: { ...DEFAULT_STYLE, align: 'left', textColor: theme.accentColor, padding: 2, marginBottom: 12, minHeight: 20 },
            content: { text: 'Rp 149.000 · Akses Seumur Hidup', variant: 'body', fontWeight: 'semibold' },
          },
          {
            id: createId('btn'),
            type: 'button',
            label: 'Tombol Beli',
            style: { ...DEFAULT_STYLE, padding: 0, marginBottom: 0, borderRadius: 10, minHeight: 44 },
            content: { label: 'Beli Sekarang', url: 'https://example.com/checkout', buttonBg: theme.accentColor, buttonText: '#FFFFFF' },
          },
        ],
      },
    ],
  },
  {
    id: 'contact-lead',
    category: 'kontak_medsos',
    title: 'Template Formulir Kontak & Lead',
    description: 'Template siap pakai form pendaftaran/kontak lengkap dengan validasi & checklist',
    createBlocks: (theme) => [createBlock('form', theme)],
  },
];

export const INITIAL_PROJECT: BuilderProject = {
  title: 'Halaman Kreator Saya',
  theme: THEMES[0],
  advanceOptions: DEFAULT_ADVANCE_OPTIONS,
  blocks: [
    {
      id: 'init_hero_container',
      type: 'container',
      label: 'Kartu Header',
      style: {
        ...DEFAULT_STYLE,
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        borderRadius: 18,
        padding: 20,
        marginBottom: 16,
        shadow: 'sm',
        minHeight: 80,
      },
      content: {},
      children: [
        {
          id: 'init_hero_image',
          type: 'image',
          label: 'Gambar Utama',
          style: {
            ...DEFAULT_STYLE,
            padding: 0,
            borderRadius: 14,
            marginBottom: 14,
            minHeight: 140,
          },
          content: {
            src: STARTER_ILLUSTRATION_SVG,
            alt: 'Katalog Produk Digital',
            aspectRatio: '16/9',
            objectFit: 'contain',
          },
        },
        {
          id: 'init_hero_title',
          type: 'text',
          label: 'Judul Utama',
          style: {
            ...DEFAULT_STYLE,
            padding: 4,
            marginBottom: 6,
            minHeight: 28,
            textColor: '#0F172A',
          },
          content: {
            text: 'Studio Kreatif — Katalog Digital',
            variant: 'h1',
            fontWeight: 'bold',
          },
        },
        {
          id: 'init_hero_desc',
          type: 'text',
          label: 'Deskripsi Singkat',
          style: {
            ...DEFAULT_STYLE,
            padding: 4,
            marginBottom: 0,
            minHeight: 24,
            textColor: '#475569',
          },
          content: {
            text: 'Kumpulan template, e-book, dan tautan penting dalam satu halaman mobile yang rapi.',
            variant: 'body',
            fontWeight: 'normal',
          },
        },
      ],
    },
    {
      id: 'init_social_block',
      type: 'social',
      label: 'Ikon Sosial Media',
      style: {
        ...DEFAULT_STYLE,
        padding: 6,
        marginBottom: 16,
        minHeight: 44,
        backgroundColor: 'transparent',
      },
      content: {
        socialItems: DEFAULT_SOCIAL_ITEMS,
        socialStyle: 'filled',
        socialShape: 'circle',
        socialSize: 'md',
        socialIconSize: 40,
        socialGap: 10,
        socialUseBrandColors: true,
        socialColor: '#2563EB',
      },
    },
    {
      id: 'init_catalog_block',
      type: 'catalog',
      label: 'Katalog Produk Digital',
      style: {
        ...DEFAULT_STYLE,
        padding: 0,
        marginBottom: 16,
        minHeight: 100,
      },
      content: {
        catalogItems: DEFAULT_CATALOG_ITEMS,
        catalogProductType: 'physical',
        catalogDetailEnabled: true,
        catalogCartEnabled: true,
        catalogWhatsappNumber: '6281234567890',
        catalogWhatsappIntro: 'Halo, saya ingin memesan produk berikut:',
        catalogAskCustomerInfo: true,
        catalogShippingEnabled: true,
      },
    },
    {
      id: 'init_row_actions',
      type: 'row',
      label: '2 Kolom Tautan',
      style: {
        ...DEFAULT_STYLE,
        padding: 0,
        marginBottom: 16,
        minHeight: 46,
      },
      content: {},
      children: [
        {
          id: 'init_row_btn_1',
          type: 'button',
          label: 'Portofolio',
          style: { ...DEFAULT_STYLE, padding: 0, marginBottom: 0, borderRadius: 12, minHeight: 44 },
          content: {
            label: 'Portofolio',
            url: 'https://example.com/portfolio',
            buttonBg: '#FFFFFF',
            buttonText: '#0F172A',
          },
        },
        {
          id: 'init_row_btn_2',
          type: 'button',
          label: 'Hubungi Kami',
          style: { ...DEFAULT_STYLE, padding: 0, marginBottom: 0, borderRadius: 12, minHeight: 44 },
          content: {
            label: 'WhatsApp',
            url: 'https://wa.me/628123456789',
            buttonBg: '#0F172A',
            buttonText: '#FFFFFF',
          },
        },
      ],
    },
    {
      id: 'init_form_lead',
      type: 'form',
      label: 'Form Newsletter',
      style: {
        ...DEFAULT_STYLE,
        backgroundColor: '#FFFFFF',
        borderColor: '#E2E8F0',
        borderWidth: 1,
        borderRadius: 16,
        padding: 16,
        marginBottom: 8,
        shadow: 'sm',
        align: 'left',
        minHeight: 140,
      },
      content: {
        formTitle: 'Dapatkan E-Book Gratis via Email',
        namePlaceholder: 'Nama Anda',
        emailPlaceholder: 'email@domain.com',
        submitLabel: 'Kirim E-Book',
        successMessage: 'Terima kasih! Tautan unduhan telah dikirim.',
        buttonColor: '#2563EB',
      },
    },
  ],
};
