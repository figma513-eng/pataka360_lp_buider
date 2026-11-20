import React, { useEffect, useMemo, useState } from 'react';
import {
  Award,
  BadgeCheck,
  CalendarDays,
  ChevronsUpDown,
  Columns2,
  Columns3,
  FileText,
  GraduationCap,
  Grid3X3,
  Image as ImageIcon,
  Images,
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
  Quote,
  Search,
  Shapes,
  Share2,
  ShoppingBag,
  ShoppingCart,
  Sparkles,
  Square,
  Store,
  Tag,
  Tags,
  Ticket,
  Type,
  UserCheck,
  Users,
  UtensilsCrossed,
  Video,
  Wrench,
} from 'lucide-react';
import {
  AdvanceOptions,
  BlockType,
  BottomNavbarConfig,
  BuilderBlock,
  PageTheme,
  PrebuiltSectionCategory,
} from '../types/builder';
import {
  PREBUILT_SECTION_CATEGORIES,
  PREBUILT_SECTIONS,
  PrebuiltSection,
} from '../data/presets';
import { useUiLabel } from '../contexts/UiLabelsContext';
import { SocialGlyph } from './SocialIcon';
import { HomePageSettings } from './inspector/HomePageSettings';

type SidebarTab = 'alat' | 'blok' | 'tema';

interface LeftSidebarProps {
  onAddBlock: (type: BlockType) => void;
  onAddSection: (section: PrebuiltSection) => void;
  blocks: BuilderBlock[];
  selectedId: string | null;
  theme: PageTheme;
  advanceOptions: AdvanceOptions;
  bottomNavbar: BottomNavbarConfig;
  activeNavItemId: string;
  navbarFocusNonce?: number;
  onSelectTheme: (next: PageTheme) => void;
  onUpdateAdvanceOptions: (patch: Partial<AdvanceOptions>) => void;
  onUpdateBottomNavbar: (updater: (prev: BottomNavbarConfig) => BottomNavbarConfig) => void;
  onSelectNavItem: (id: string) => void;
  onSelectBlock: (id: string | null) => void;
  onMoveBlock: (id: string, dir: 'up' | 'down') => void;
  onReorderBlock: (
    draggedId: string,
    targetId: string,
    position: 'before' | 'after' | 'inside'
  ) => void;
  onDuplicateBlock?: (id: string) => void;
  onDeleteBlock: (id: string) => void;
  onAddChildToContainer: (containerId: string, type: BlockType) => void;
}

export interface ToolPaletteItem {
  key: string;
  type: BlockType;
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
  'kartu-store-gradasi': <ShoppingBag className="w-4 h-4" strokeWidth={1.85} />,
  'kartu-feed-kegiatan': <Users className="w-4 h-4" strokeWidth={1.85} />,
  'kartu-tarif-keanggotaan': <Ticket className="w-4 h-4" strokeWidth={1.85} />,
  'menu-grid-spesial': <Grid3X3 className="w-4 h-4" strokeWidth={1.85} />,
  'hero-profil-kompak': <UserCheck className="w-4 h-4" strokeWidth={1.85} />,
  'hero-profil-banner': <PanelTop className="w-4 h-4" strokeWidth={1.85} />,
  'tombol-kategori-scroll': <Tags className="w-4 h-4" strokeWidth={1.85} />,
  'row-slide-horizontal': <Columns3 className="w-4 h-4" strokeWidth={1.85} />,
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
  blocks,
  selectedId,
  theme,
  advanceOptions,
  bottomNavbar,
  activeNavItemId,
  navbarFocusNonce = 0,
  onSelectTheme,
  onUpdateAdvanceOptions,
  onUpdateBottomNavbar,
  onSelectNavItem,
  onSelectBlock,
  onMoveBlock,
  onReorderBlock,
  onDuplicateBlock,
  onDeleteBlock,
  onAddChildToContainer,
}: LeftSidebarProps) {
  const { label } = useUiLabel();
  const [activeTab, setActiveTab] = useState<SidebarTab>('alat');
  const [query, setQuery] = useState('');
  const [selectedBlockCategory, setSelectedBlockCategory] = useState<
    'semua' | PrebuiltSectionCategory
  >('semua');

  useEffect(() => {
    if (navbarFocusNonce > 0) {
      setActiveTab('tema');
    }
  }, [navbarFocusNonce]);

  const filteredTools = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return TOOL_ITEMS;
    return TOOL_ITEMS.filter((item) => {
      const displayLabel = label(`alat.tool.${item.key}`, item.label);
      return (
        displayLabel.toLowerCase().includes(q) ||
        item.label.toLowerCase().includes(q) ||
        item.desc.toLowerCase().includes(q) ||
        item.type.toLowerCase().includes(q)
      );
    });
  }, [query, label]);

  const filteredSections = useMemo(() => {
    const q = query.trim().toLowerCase();
    return PREBUILT_SECTIONS.filter((sec) => {
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
  }, [query, selectedBlockCategory, label]);

  return (
    <aside className="w-64 xl:w-[19%] min-w-[240px] max-w-[300px] bg-white border-r border-[#DCE5EF] flex flex-col shrink-0 h-full overflow-hidden">
      {/* Strictly 3 Tabs: Alat, Blok, Tema */}
      <div
        role="tablist"
        aria-label="Navigasi Panel Kiri"
        className="grid grid-cols-3 border-b border-[#DCE5EF] bg-white shrink-0"
      >
        {(
          [
            { id: 'alat', label: label('alat.tab', 'Alat'), icon: <Wrench className="w-3.5 h-3.5" /> },
            { id: 'blok', label: label('blok.tab', 'Blok'), icon: <LayoutGrid className="w-3.5 h-3.5" /> },
            { id: 'tema', label: label('tema.tab', 'Tema'), icon: <Palette className="w-3.5 h-3.5" /> },
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
              className={`flex items-center justify-center gap-1 py-3 px-1 text-[12px] font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
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

      {/* Quick Filter (Alat & Blok only) */}
      {activeTab !== 'tema' && (
        <div className="px-2.5 pt-2.5 pb-1.5 shrink-0 space-y-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#8FA4BF] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={
                activeTab === 'alat'
                  ? label('alat.search', 'Cari alat mandiri...')
                  : label('blok.search', 'Cari template blok / card...')
              }
              aria-label={activeTab === 'alat' ? label('alat.search', 'Cari alat') : label('blok.search', 'Cari blok')}
              className="w-full pl-8 pr-2.5 py-1.5 text-[12px] rounded-lg border border-[#DCE5EF] bg-[#F0F5FA]/50 text-[#17243D] placeholder:text-[#8FA4BF] outline-none focus:bg-white focus:border-[#00C98A] transition-colors"
            />
          </div>

          {activeTab === 'blok' && (
            <div className="flex flex-wrap gap-1" role="group" aria-label="Kategori Blok">
              {PREBUILT_SECTION_CATEGORIES.map((cat) => {
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
                    {cat.label}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Body */}
      {activeTab === 'tema' ? (
        <HomePageSettings
          blocks={blocks}
          selectedId={selectedId}
          theme={theme}
          advanceOptions={advanceOptions}
          bottomNavbar={bottomNavbar}
          activeNavItemId={activeNavItemId}
          navbarFocusNonce={navbarFocusNonce}
          onSelectTheme={onSelectTheme}
          onUpdateAdvanceOptions={onUpdateAdvanceOptions}
          onUpdateBottomNavbar={onUpdateBottomNavbar}
          onSelectNavItem={onSelectNavItem}
          onSelectBlock={onSelectBlock}
          onMoveBlock={onMoveBlock}
          onReorderBlock={onReorderBlock}
          onDuplicateBlock={onDuplicateBlock}
          onDeleteBlock={onDeleteBlock}
          onAddChildToContainer={onAddChildToContainer}
        />
      ) : (
      <div className="flex-1 overflow-y-auto px-2.5 pb-4 pt-1">
        {activeTab === 'alat' && (
          <div className="space-y-2">
            <div className="px-0.5 flex items-center justify-between text-[10.5px] font-semibold text-[#8FA4BF]">
              <span>{label('alat.header', 'Alat Mandiri')} ({filteredTools.length})</span>
              <span className="text-[9.5px] font-medium text-[#94A3B8]">Seret / Klik</span>
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
                    <button
                      key={item.key}
                      type="button"
                      title={`${displayLabel} — ${item.desc}`}
                      draggable
                      onDragStart={(e) => {
                        if (item.sectionId) {
                          e.dataTransfer.setData('application/lynk-section-id', item.sectionId);
                        } else {
                          e.dataTransfer.setData('application/lynk-block-type', item.type);
                        }
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => {
                        if (item.sectionId) {
                          const sec = PREBUILT_SECTIONS.find((s) => s.id === item.sectionId);
                          if (sec) {
                            onAddSection(sec);
                            return;
                          }
                        }
                        onAddBlock(item.type);
                      }}
                      className="flex items-center gap-2 px-2 py-2.5 rounded-lg border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] hover:border-[#00C98A] text-left transition-colors group cursor-pointer min-w-0"
                    >
                      <span className="text-[#8FA4BF] group-hover:text-[#00C98A] shrink-0 flex items-center justify-center transition-colors">
                        {item.icon}
                      </span>
                      <span className="text-[11.5px] font-medium text-[#17243D] truncate min-w-0">
                        {displayLabel}
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === 'blok' && (
          <div className="space-y-2">
            <div className="px-0.5 flex items-center justify-between text-[10.5px] font-semibold text-[#8FA4BF]">
              <span>{label('blok.header', 'Template Blok & Card')} ({filteredSections.length})</span>
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
                    <button
                      key={section.id}
                      type="button"
                      title={`${displayTitle} — ${section.description}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.setData('application/lynk-section-id', section.id);
                        e.dataTransfer.effectAllowed = 'copy';
                      }}
                      onClick={() => onAddSection(section)}
                      className="w-full flex items-center gap-2.5 px-2.5 py-2.5 rounded-lg border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] hover:border-[#00C98A] text-left transition-colors group cursor-pointer min-w-0"
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
                        {selectedBlockCategory === 'semua' && catLabel && (
                          <span className="inline-block mt-1 px-1.5 py-0.5 rounded bg-[#F0F5FA] text-[9.5px] font-semibold text-[#5B708B]">
                            {catLabel}
                          </span>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
      )}
    </aside>
  );
}
