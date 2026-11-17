import React, { useState } from 'react';
import {
  ArrowDown,
  ArrowUp,
  Box,
  ChevronsUpDown,
  Columns2,
  FileText,
  GraduationCap,
  GripVertical,
  Image as ImageIcon,
  Layers,
  LayoutGrid,
  Minus,
  MousePointerClick,
  Package,
  Palette,
  PanelBottom,
  PanelBottomOpen,
  Plus,
  Share2,
  ShoppingBag,
  Square,
  Trash2,
  Type,
  UserCheck,
  Video,
  Wrench,
} from 'lucide-react';
import { BlockType, BuilderBlock, PageTheme } from '../types/builder';
import { BLOCK_TYPE_NAMES, PREBUILT_SECTIONS, PrebuiltSection, THEMES } from '../data/presets';
import { FONT_OPTIONS, resolveCssFontFamily } from '../utils/fontHelpers';
import { SocialGlyph } from './SocialIcon';

type SidebarTab = 'alat' | 'blok' | 'tema' | 'lapisan';

interface LeftSidebarProps {
  blocks: BuilderBlock[];
  selectedId: string | null;
  currentTheme: PageTheme;
  onAddBlock: (type: BlockType) => void;
  onAddSection: (section: PrebuiltSection) => void;
  onSelectTheme: (theme: PageTheme) => void;
  onSelectBlock: (id: string) => void;
  onMoveBlock: (id: string, dir: 'up' | 'down') => void;
  onReorderBlock: (draggedId: string, targetId: string, position: 'before' | 'after' | 'inside') => void;
  onDeleteBlock: (id: string) => void;
  bottomNavbarEnabled?: boolean;
  onActivateNavbar?: () => void;
}

const TOOL_ITEMS: {
  key: string;
  type: BlockType;
  sectionId?: string;
  label: string;
  desc: string;
  icon: React.ReactNode;
}[] = [
  {
    key: 'hero_profile',
    type: 'hero_profile',
    label: 'Hero Profil Usaha',
    desc: 'Kartu profil kompak atau banner full atas',
    icon: <UserCheck className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    key: 'category_tabs',
    type: 'category_tabs',
    label: 'Tombol Kategori',
    desc: 'Favorit, makanan, minuman & lompat ke judul',
    icon: <LayoutGrid className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    key: 'fnb_catalog',
    type: 'fnb_catalog',
    label: 'Katalog F&B',
    desc: 'Menu makanan/minuman & keranjang mengambang',
    icon: <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    key: 'row',
    type: 'row',
    label: 'Kolom / Row Dinamis',
    desc: '2–6+ kolom grid atau slide horizontal',
    icon: <Columns2 className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    key: 'container',
    type: 'container',
    label: 'Kotak / Wadah',
    desc: 'Pembungkus elemen & latar gradasi',
    icon: <Square className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    key: 'toggle_container',
    type: 'toggle_container',
    label: 'Wadah Show / Hide',
    desc: 'Buka-tutup elemen (default hide)',
    icon: <ChevronsUpDown className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    key: 'bottom_sheet',
    type: 'bottom_sheet',
    label: 'Bottom Sheet',
    desc: 'Klik ikon/tombol buka panel bawah (Maps, dll)',
    icon: <PanelBottomOpen className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    key: 'catalog_physical',
    type: 'catalog',
    sectionId: 'katalog-produk-fisik',
    label: 'Katalog Produk Fisik',
    desc: 'Produk fisik, data pemesan dinamis, pilihan kirim & WA',
    icon: <Package className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    key: 'catalog_digital',
    type: 'catalog',
    sectionId: 'katalog-produk-digital',
    label: 'Katalog Produk Digital',
    desc: 'Produk digital, data pemesan dinamis & kirim via WA',
    icon: <ShoppingBag className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    key: 'training_catalog',
    type: 'training_catalog',
    label: 'Katalog Produk Pelatihan',
    desc: 'Deskripsi, foto/postingan, harga/cashback, berkas, form & WA',
    icon: <GraduationCap className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    key: 'text',
    type: 'text',
    label: 'Teks Biasa',
    desc: 'Judul atau paragraf',
    icon: <Type className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    key: 'image',
    type: 'image',
    label: 'Gambar',
    desc: 'Foto, logo, ilustrasi',
    icon: <ImageIcon className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    key: 'button',
    type: 'button',
    label: 'Tombol Link',
    desc: 'Tautan CTA interaktif',
    icon: <MousePointerClick className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    key: 'form',
    type: 'form',
    label: 'Form Isian',
    desc: 'Kumpulkan nama & kontak',
    icon: <FileText className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    key: 'divider',
    type: 'divider',
    label: 'Garis Pembatas',
    desc: 'Pemisah antar bagian',
    icon: <Minus className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    key: 'youtube',
    type: 'youtube',
    label: 'Video YouTube',
    desc: 'Embed bersih + Play/Pause/Volume',
    icon: <Video className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    key: 'facebook_video',
    type: 'facebook_video',
    label: 'Video Facebook',
    desc: 'Embed FB bersih + Play/Pause/Volume',
    icon: <SocialGlyph platform="facebook" className="w-[18px] h-[18px]" />,
  },
  {
    key: 'tiktok_video',
    type: 'tiktok_video',
    label: 'Video TikTok',
    desc: 'Embed TikTok bersih + Play/Pause/Volume',
    icon: <SocialGlyph platform="tiktok" className="w-[18px] h-[18px]" />,
  },
  {
    key: 'instagram_video',
    type: 'instagram_video',
    label: 'Video Instagram',
    desc: 'Embed IG bersih + Play/Pause/Volume',
    icon: <SocialGlyph platform="instagram" className="w-[18px] h-[18px]" />,
  },
  {
    key: 'social',
    type: 'social',
    label: 'Sosial Media',
    desc: 'Ikon link seluruh sosial media',
    icon: <Share2 className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
  {
    key: 'social_follower',
    type: 'social_follower',
    label: 'Sosial Media + Follower',
    desc: 'Kartu profil & jumlah follower seluruh sosmed',
    icon: <UserCheck className="w-[18px] h-[18px]" strokeWidth={1.75} />,
  },
];

export function LeftSidebar({
  blocks,
  selectedId,
  currentTheme,
  onAddBlock,
  onAddSection,
  onSelectTheme,
  onSelectBlock,
  onMoveBlock,
  onReorderBlock,
  onDeleteBlock,
  bottomNavbarEnabled,
  onActivateNavbar,
}: LeftSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>('alat');
  const [dragLayerState, setDragLayerState] = useState<{
    draggedId: string | null;
    targetId: string | null;
    position: 'before' | 'after' | null;
  }>({ draggedId: null, targetId: null, position: null });

  const tabs: { id: SidebarTab; label: string; icon: React.ReactNode }[] = [
    { id: 'alat', label: 'Alat', icon: <Wrench className="w-4 h-4" strokeWidth={1.75} /> },
    { id: 'blok', label: 'Blok', icon: <LayoutGrid className="w-4 h-4" strokeWidth={1.75} /> },
    { id: 'tema', label: 'Tema', icon: <Palette className="w-4 h-4" strokeWidth={1.75} /> },
    { id: 'lapisan', label: 'Lapisan', icon: <Layers className="w-4 h-4" strokeWidth={1.75} /> },
  ];

  const renderLayerNodes = (nodes: BuilderBlock[], depth = 0) => {
    return nodes.map((node) => {
      const isSelected = node.id === selectedId;
      const isTarget = dragLayerState.targetId === node.id;
      return (
        <div key={node.id} className="space-y-0.5 relative">
          {isTarget && dragLayerState.position === 'before' && (
            <div className="h-0.5 bg-emerald-500 rounded-full mx-1" />
          )}
          <div
            draggable
            onDragStart={(e) => {
              e.stopPropagation();
              e.dataTransfer.setData('application/lynk-existing-block', node.id);
              e.dataTransfer.effectAllowed = 'move';
              setDragLayerState({ draggedId: node.id, targetId: null, position: null });
            }}
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              const position = e.clientY - rect.top < rect.height / 2 ? 'before' : 'after';
              if (
                dragLayerState.targetId !== node.id ||
                dragLayerState.position !== position
              ) {
                setDragLayerState((prev) => ({ ...prev, targetId: node.id, position }));
              }
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const draggedId = e.dataTransfer.getData('application/lynk-existing-block');
              const pos = dragLayerState.position ?? 'after';
              if (draggedId && draggedId !== node.id) {
                onReorderBlock(draggedId, node.id, pos);
              }
              setDragLayerState({ draggedId: null, targetId: null, position: null });
            }}
            onDragEnd={() =>
              setDragLayerState({ draggedId: null, targetId: null, position: null })
            }
            onClick={() => onSelectBlock(node.id)}
            style={{ paddingLeft: `${10 + depth * 14}px` }}
            className={`group flex items-center justify-between gap-2 pr-2 py-2.5 rounded-xl text-[14px] leading-5 cursor-grab active:cursor-grabbing transition-colors ${
              dragLayerState.draggedId === node.id ? 'opacity-45' : ''
            } ${
              isSelected
                ? 'bg-[#EFF7F4] text-slate-900 font-semibold'
                : 'bg-transparent text-[#4B5563] font-medium hover:bg-[#EFF7F4]/70 hover:text-slate-900'
            }`}
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <GripVertical className="w-3.5 h-3.5 shrink-0 text-slate-300 group-hover:text-slate-500" />
              <Box
                className={`w-[18px] h-[18px] shrink-0 ${
                  isSelected ? 'text-emerald-600' : 'text-emerald-500'
                }`}
                strokeWidth={1.75}
              />
              <span className="truncate">{node.label.trim() || BLOCK_TYPE_NAMES[node.type]}</span>
            </div>
            <div
              className="flex items-center gap-0.5 shrink-0 opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <button
                type="button"
                onClick={() => onMoveBlock(node.id, 'up')}
                title="Geser ke atas"
                className="p-1 rounded-lg hover:bg-white text-slate-500 cursor-pointer"
              >
                <ArrowUp className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onMoveBlock(node.id, 'down')}
                title="Geser ke bawah"
                className="p-1 rounded-lg hover:bg-white text-slate-500 cursor-pointer"
              >
                <ArrowDown className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                onClick={() => onDeleteBlock(node.id)}
                title="Hapus elemen"
                className="p-1 rounded-lg hover:bg-red-50 text-slate-400 hover:text-red-600 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
          {isTarget && dragLayerState.position === 'after' && (
            <div className="h-0.5 bg-emerald-500 rounded-full mx-1" />
          )}
          {node.children && node.children.length > 0 && (
            <div className="space-y-0.5">{renderLayerNodes(node.children, depth + 1)}</div>
          )}
        </div>
      );
    });
  };

  return (
    <aside className="w-72 bg-white border-r border-slate-100 flex flex-col shrink-0 h-full overflow-hidden">
      {/* 4 Tabs */}
      <div className="grid grid-cols-4 gap-1 p-2 border-b border-slate-100 bg-white shrink-0">
        {tabs.map((tab) => {
          const active = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-[12px] transition-colors cursor-pointer whitespace-nowrap ${
                active
                  ? 'bg-[#EFF7F4] text-emerald-700 font-semibold'
                  : 'text-slate-500 font-medium hover:bg-slate-50 hover:text-slate-800'
              }`}
            >
              <span className={active ? 'text-emerald-600' : 'text-slate-400'}>{tab.icon}</span>
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Body */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {activeTab === 'alat' && (
          <>
            <div className="px-3 pb-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
              KOMPONEN
            </div>
            <div className="space-y-0.5">
              {onActivateNavbar && (
                <button
                  type="button"
                  title="Aktifkan & atur Navbar Bawah 5 Menu (Galeri, Belanja, Home, Kontak, Alamat)"
                  onClick={onActivateNavbar}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl bg-[#EFF7F4]/70 hover:bg-[#EFF7F4] border border-emerald-200/70 transition-colors text-left group cursor-pointer mb-1.5"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="text-emerald-600 shrink-0 flex items-center justify-center">
                      <PanelBottom className="w-[18px] h-[18px]" strokeWidth={1.75} />
                    </span>
                    <div className="min-w-0">
                      <span className="block text-[14px] leading-5 font-semibold text-slate-800 truncate">
                        Navbar Bawah (5 Menu)
                      </span>
                      <span className="block text-[11px] text-slate-500 truncate">
                        {bottomNavbarEnabled ? 'Aktif · Klik untuk edit' : 'Nonaktif · Klik untuk aktifkan'}
                      </span>
                    </div>
                  </div>
                  <span
                    className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold shrink-0 ${
                      bottomNavbarEnabled
                        ? 'bg-emerald-600 text-white'
                        : 'bg-slate-200 text-slate-600'
                    }`}
                  >
                    {bottomNavbarEnabled ? 'ON' : 'OFF'}
                  </span>
                </button>
              )}
              {TOOL_ITEMS.map((item) => (
                <button
                  key={item.key}
                  type="button"
                  title={item.desc}
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
                  className="w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl bg-transparent hover:bg-[#EFF7F4] transition-colors text-left group cursor-pointer"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <span className="text-emerald-500 group-hover:text-emerald-600 shrink-0 flex items-center justify-center">
                      {item.icon}
                    </span>
                    <span className="text-[14px] leading-5 font-medium text-[#4B5563] group-hover:text-slate-900 truncate">
                      {item.label}
                    </span>
                  </div>
                  <Plus className="w-4 h-4 text-emerald-600 opacity-0 group-hover:opacity-100 shrink-0 transition-opacity" />
                </button>
              ))}
            </div>
          </>
        )}

        {activeTab === 'blok' && (
          <div className="space-y-2.5">
            <div className="px-2 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
              BLOK SIAP PAKAI
            </div>
            <div className="space-y-2">
              {PREBUILT_SECTIONS.map((section) => (
                <div
                  key={section.id}
                  draggable
                  onDragStart={(e) => {
                    e.dataTransfer.setData('application/lynk-section-id', section.id);
                    e.dataTransfer.effectAllowed = 'copy';
                  }}
                  className="p-2.5 rounded-xl border border-slate-100 bg-white hover:border-emerald-200 hover:bg-[#EFF7F4]/40 transition-colors space-y-2 cursor-grab active:cursor-grabbing"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13px] leading-snug font-semibold text-slate-800 truncate">
                        {section.title}
                      </div>
                      <div className="text-[11.5px] text-slate-500 mt-0.5 leading-snug line-clamp-2">
                        {section.description}
                      </div>
                    </div>
                    <GripVertical className="w-4 h-4 text-slate-300 shrink-0 mt-0.5" />
                  </div>
                  <button
                    type="button"
                    onClick={() => onAddSection(section)}
                    className="w-full py-1.5 px-3 rounded-lg bg-[#EFF7F4] hover:bg-emerald-500 hover:text-white text-emerald-700 text-[12px] font-semibold transition-colors cursor-pointer"
                  >
                    Tambahkan ke Halaman
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'tema' && (
          <div className="space-y-4">
            <div className="p-3 rounded-xl border border-slate-100 bg-slate-50/70 space-y-2">
              <div className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                JENIS FONT UTAMA HALAMAN
              </div>
              <select
                value={currentTheme.fontFamily || 'Plus Jakarta Sans'}
                onChange={(e) =>
                  onSelectTheme({
                    ...currentTheme,
                    fontFamily: e.target.value,
                  })
                }
                style={{ fontFamily: resolveCssFontFamily(currentTheme.fontFamily) }}
                className="w-full px-2.5 py-2 rounded-lg border border-slate-200 bg-white text-[13px] font-medium text-slate-800 outline-none focus:border-emerald-500 cursor-pointer"
              >
                {FONT_OPTIONS.map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label} ({f.category})
                  </option>
                ))}
              </select>
            </div>
            {(
              [
                { key: 'brand', title: 'INSPIRASI BRAND POPULER' },
                { key: 'basic', title: 'TEMA DASAR & MINIMALIS' },
                { key: 'aesthetic', title: 'TEMA TAMBAHAN & ESTETIK' },
              ] as const
            ).map((group) => {
              const items = THEMES.filter((t) => (t.category ?? 'basic') === group.key);
              if (items.length === 0) return null;
              return (
                <div key={group.key} className="space-y-1">
                  <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
                    {group.title}
                  </div>
                  <div className="space-y-0.5">
                    {items.map((theme) => {
                      const isCurrent = theme.id === currentTheme.id;
                      return (
                        <button
                          key={theme.id}
                          type="button"
                          onClick={() => onSelectTheme(theme)}
                          className={`w-full px-3 py-2.5 rounded-xl text-left transition-colors cursor-pointer flex items-center justify-between gap-2.5 ${
                            isCurrent
                              ? 'bg-[#EFF7F4] text-slate-900'
                              : 'bg-transparent hover:bg-[#EFF7F4]/60 text-[#4B5563]'
                          }`}
                        >
                          <div className="min-w-0">
                            <div
                              className={`text-[14px] leading-5 truncate ${
                                isCurrent ? 'font-semibold text-slate-900' : 'font-medium text-[#4B5563]'
                              }`}
                            >
                              {theme.name}
                            </div>
                            <div className="text-[11px] text-slate-400 mt-0.5 truncate">
                              {theme.brandSource ? `${theme.brandSource} · ` : ''}
                              <span className="tabular-nums">{theme.accentColor}</span>
                            </div>
                          </div>
                          <div className="flex items-center -space-x-1.5 shrink-0">
                            <span
                              title="Latar kanvas"
                              className="w-4.5 h-4.5 rounded-full border border-slate-300 shadow-2xs"
                              style={{ backgroundColor: theme.canvasBg }}
                            />
                            <span
                              title="Latar kartu"
                              className="w-4.5 h-4.5 rounded-full border border-slate-300 shadow-2xs"
                              style={{ backgroundColor: theme.cardBg }}
                            />
                            <span
                              title="Warna teks"
                              className="w-4.5 h-4.5 rounded-full border border-slate-300 shadow-2xs"
                              style={{ backgroundColor: theme.textColor }}
                            />
                            <span
                              title="Warna aksen"
                              className="w-4.5 h-4.5 rounded-full border border-white shadow-2xs"
                              style={{ backgroundColor: theme.accentColor }}
                            />
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {activeTab === 'lapisan' && (
          <div className="space-y-2">
            <div className="px-3 pb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-[#64748B]">
              SUSUNAN LAPISAN
            </div>
            {blocks.length === 0 ? (
              <div className="text-center py-8 px-3 border border-dashed border-slate-200 rounded-xl text-[13px] text-slate-500">
                Belum ada elemen di kanvas. Buka tab Alat untuk menambahkan komponen.
              </div>
            ) : (
              <div className="space-y-0.5">{renderLayerNodes(blocks)}</div>
            )}
          </div>
        )}
      </div>
    </aside>
  );
}
