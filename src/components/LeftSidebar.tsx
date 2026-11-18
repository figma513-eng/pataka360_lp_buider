import React, { useMemo, useState } from 'react';
import {
  BadgeCheck,
  ChevronsUpDown,
  Columns2,
  Columns3,
  FileText,
  GraduationCap,
  Image as ImageIcon,
  Images,
  LayoutGrid,
  Link2,
  Mail,
  MapPin,
  Minus,
  MousePointerClick,
  Package,
  PanelBottomOpen,
  PanelTop,
  Search,
  Share2,
  ShoppingBag,
  Sparkles,
  Square,
  Store,
  Tag,
  Tags,
  Type,
  UserCheck,
  UtensilsCrossed,
  Video,
  Wrench,
} from 'lucide-react';
import { BlockType } from '../types/builder';
import { PREBUILT_SECTIONS, PrebuiltSection } from '../data/presets';
import { useUiLabel } from '../contexts/UiLabelsContext';
import { SocialGlyph } from './SocialIcon';

type SidebarTab = 'alat' | 'blok';

interface LeftSidebarProps {
  onAddBlock: (type: BlockType) => void;
  onAddSection: (section: PrebuiltSection) => void;
}

export interface ToolPaletteItem {
  key: string;
  type: BlockType;
  sectionId?: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
}

export const TOOL_ITEMS: ToolPaletteItem[] = [
  {
    key: 'hero_profile',
    type: 'hero_profile',
    label: 'Hero Profil Usaha',
    desc: 'Kartu profil kompak atau banner full atas',
    icon: <UserCheck className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'category_tabs',
    type: 'category_tabs',
    label: 'Tombol Kategori',
    desc: 'Favorit, makanan, minuman & lompat ke judul',
    icon: <LayoutGrid className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'fnb_catalog',
    type: 'fnb_catalog',
    label: 'Katalog F&B',
    desc: 'Menu makanan/minuman & keranjang mengambang',
    icon: <ShoppingBag className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'row',
    type: 'row',
    label: 'Kolom / Row Dinamis',
    desc: '2–6+ kolom grid atau slide horizontal',
    icon: <Columns2 className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'container',
    type: 'container',
    label: 'Kotak / Wadah',
    desc: 'Pembungkus elemen & latar gradasi',
    icon: <Square className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'toggle_container',
    type: 'toggle_container',
    label: 'Wadah Show / Hide',
    desc: 'Buka-tutup elemen (default hide)',
    icon: <ChevronsUpDown className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'bottom_sheet',
    type: 'bottom_sheet',
    label: 'Bottom Sheet',
    desc: 'Klik ikon/tombol buka panel bawah (Maps, dll)',
    icon: <PanelBottomOpen className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'catalog_physical',
    type: 'catalog',
    sectionId: 'katalog-produk-fisik',
    label: 'Katalog Produk Fisik',
    desc: 'Produk fisik, data pemesan dinamis, pilihan kirim & WA',
    icon: <Package className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'catalog_digital',
    type: 'catalog',
    sectionId: 'katalog-produk-digital',
    label: 'Katalog Produk Digital',
    desc: 'Produk digital, data pemesan dinamis & kirim via WA',
    icon: <ShoppingBag className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'training_catalog',
    type: 'training_catalog',
    label: 'Katalog Produk Pelatihan',
    desc: 'Deskripsi, foto/postingan, harga/cashback, berkas, form & WA',
    icon: <GraduationCap className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'text',
    type: 'text',
    label: 'Teks Biasa',
    desc: 'Judul atau paragraf',
    icon: <Type className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'image',
    type: 'image',
    label: 'Gambar',
    desc: 'Foto, logo, ilustrasi',
    icon: <ImageIcon className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'button',
    type: 'button',
    label: 'Tombol Link',
    desc: 'Tautan CTA interaktif',
    icon: <MousePointerClick className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'form',
    type: 'form',
    label: 'Form Isian',
    desc: 'Kumpulkan nama & kontak',
    icon: <FileText className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'divider',
    type: 'divider',
    label: 'Garis Pembatas',
    desc: 'Pemisah antar bagian',
    icon: <Minus className="w-4 h-4" strokeWidth={1.85} />,
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
  {
    key: 'social',
    type: 'social',
    label: 'Sosial Media',
    desc: 'Ikon link seluruh sosial media',
    icon: <Share2 className="w-4 h-4" strokeWidth={1.85} />,
  },
  {
    key: 'social_follower',
    type: 'social_follower',
    label: 'Sosial Media + Follower',
    desc: 'Kartu profil & jumlah follower seluruh sosmed',
    icon: <UserCheck className="w-4 h-4" strokeWidth={1.85} />,
  },
];

export const SECTION_ICONS: Record<string, React.ReactNode> = {
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

export function LeftSidebar({ onAddBlock, onAddSection }: LeftSidebarProps) {
  const { label } = useUiLabel();
  const [activeTab, setActiveTab] = useState<SidebarTab>('alat');
  const [query, setQuery] = useState('');

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
    if (!q) return PREBUILT_SECTIONS;
    return PREBUILT_SECTIONS.filter((sec) => {
      const displayTitle = label(`blok.sec.${sec.id}`, sec.title);
      return (
        displayTitle.toLowerCase().includes(q) ||
        sec.title.toLowerCase().includes(q) ||
        sec.description.toLowerCase().includes(q)
      );
    });
  }, [query, label]);

  return (
    <aside className="w-60 xl:w-[17%] min-w-[216px] max-w-[272px] bg-white border-r border-[#DCE5EF] flex flex-col shrink-0 h-full overflow-hidden">
      {/* Strictly 2 Tabs: Alat & Blok */}
      <div className="grid grid-cols-2 border-b border-[#DCE5EF] bg-white shrink-0">
        {(
          [
            { id: 'alat', label: label('alat.tab', 'Alat'), icon: <Wrench className="w-3.5 h-3.5" /> },
            { id: 'blok', label: label('blok.tab', 'Blok'), icon: <LayoutGrid className="w-3.5 h-3.5" /> },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center justify-center gap-1.5 py-3 text-[12.5px] font-semibold border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
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

      {/* Quick Filter */}
      <div className="px-2.5 pt-2.5 pb-1.5 shrink-0">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-[#8FA4BF] absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              activeTab === 'alat'
                ? label('alat.search', 'Cari alat...')
                : label('blok.search', 'Cari blok siap pakai...')
            }
            aria-label={activeTab === 'alat' ? label('alat.search', 'Cari alat') : label('blok.search', 'Cari blok')}
            className="w-full pl-8 pr-2.5 py-1.5 text-[12px] rounded-lg border border-[#DCE5EF] bg-[#F0F5FA]/50 text-[#17243D] placeholder:text-[#8FA4BF] outline-none focus:bg-white focus:border-[#00C98A] transition-colors"
          />
        </div>
      </div>

      {/* Body: 2-Column Compact Card Grid */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-4 pt-1">
        {activeTab === 'alat' && (
          <div className="space-y-2">
            <div className="px-0.5 text-[10.5px] font-semibold text-[#8FA4BF]">
              {label('alat.header', 'Komponen')} ({filteredTools.length})
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
            <div className="px-0.5 text-[10.5px] font-semibold text-[#8FA4BF]">
              {label('blok.header', 'Blok Siap Pakai')} ({filteredSections.length})
            </div>
            {filteredSections.length === 0 ? (
              <div className="py-6 px-3 text-center text-xs text-[#8FA4BF] border border-dashed border-[#DCE5EF] rounded-xl">
                Blok tidak ditemukan.
              </div>
            ) : (
              <div className="flex flex-col gap-1.5">
                {filteredSections.map((section) => {
                  const displayTitle = label(`blok.sec.${section.id}`, section.title);
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
                        <div className="text-[12px] font-semibold text-[#17243D] truncate">
                          {displayTitle}
                        </div>
                        <div className="text-[10.5px] text-[#8FA4BF] truncate">
                          {section.description}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
