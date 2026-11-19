import { useState, type CSSProperties } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Info,
  LayoutTemplate,
  Maximize2,
  Palette,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Square,
  Type,
} from 'lucide-react';
import {
  AdvanceOptions,
  BlockLayoutMode,
  BlockStyle,
  BottomSheetTriggerStyle,
  BuilderBlock,
  CarouselAspectRatio,
  CatalogCartButtonSize,
  CategoryScrollMode,
  FloatingCartPosition,
  HeroProfileVariant,
  MenuIconShape,
  PageTheme,
  ShadowPreset,
} from '../../types/builder';
import { FONT_OPTIONS } from '../../utils/fontHelpers';
import {
  GRADIENT_PRESETS,
  buildLinearGradientCss,
  clampGradientAngle,
} from '../../utils/gradientHelpers';
import { resolveButtonIcon } from '../../utils/buttonIcons';
import { resolveSocialMetrics } from '../../utils/socialIcons';
import { ThemeOverrideTokenKey, withLocalThemeTokenPatch } from '../../utils/blockThemeHelpers';
import { IconPicker } from '../IconPicker';
import { useUiLabel } from '../../contexts/UiLabelsContext';
import {
  AccordionSection,
  LayoutWireframe,
  SectionEmptyNote,
  SegmentedControl,
  SliderRow,
  ToggleSwitch,
} from './InspectorPrimitives';

interface BlockDesignTabProps {
  selectedBlock: BuilderBlock;
  theme: PageTheme;
  advanceOptions: AdvanceOptions;
  onUpdateAdvanceOptions: (patch: Partial<AdvanceOptions>) => void;
  onUpdateBlock: (id: string, updater: (block: BuilderBlock) => BuilderBlock) => void;
}

type DesignSectionId = 'specific' | 'layout' | 'visual' | 'typo' | 'bg' | 'border';

function rangeProgressStyle(current: number, min: number, max: number): CSSProperties {
  const span = max - min;
  const pct = span > 0 ? Math.max(0, Math.min(100, ((current - min) / span) * 100)) : 0;
  return {
    background: `linear-gradient(to right, #94A3B8 0%, #94A3B8 ${pct}%, #E2E8F0 ${pct}%, #E2E8F0 100%)`,
  };
}

export function BlockDesignTab({
  selectedBlock,
  theme,
  advanceOptions,
  onUpdateAdvanceOptions,
  onUpdateBlock,
}: BlockDesignTabProps) {
  const { label } = useUiLabel();
  const [openSections, setOpenSections] = useState<Record<DesignSectionId, boolean>>({
    specific: true,
    layout: false,
    visual: false,
    typo: false,
    bg: false,
    border: false,
  });

  const toggleSection = (id: DesignSectionId) => {
    setOpenSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const s = selectedBlock.style;
  const c = selectedBlock.content;

  const updateStyle = (patch: Partial<BlockStyle>) => {
    onUpdateBlock(selectedBlock.id, (blk) => ({
      ...blk,
      style: { ...blk.style, ...patch },
    }));
  };

  const updateStyleWithToken = (
    patch: Partial<BlockStyle>,
    tokenKeys: ThemeOverrideTokenKey[]
  ) => {
    onUpdateBlock(selectedBlock.id, (blk) =>
      withLocalThemeTokenPatch(blk, patch, undefined, tokenKeys)
    );
  };

  const updateContent = (patch: Partial<BuilderBlock['content']>) => {
    onUpdateBlock(selectedBlock.id, (blk) => ({
      ...blk,
      content: { ...blk.content, ...patch },
    }));
  };

  const updateAccentContent = (patch: Partial<BuilderBlock['content']>) => {
    onUpdateBlock(selectedBlock.id, (blk) =>
      withLocalThemeTokenPatch(blk, {}, patch, ['accentColor'])
    );
  };

  const isCustomTextColor = s.useThemeTextColor === false;
  const isContainerLike =
    selectedBlock.type === 'container' ||
    selectedBlock.type === 'toggle_container' ||
    selectedBlock.type === 'row';

  const isProfilePhoto =
    selectedBlock.type === 'image' &&
    (c.imageShape === 'circle' || selectedBlock.label.toLowerCase().includes('profil'));

  const applyInheritToDescendants = (children?: BuilderBlock[]): BuilderBlock[] | undefined =>
    children?.map((ch) => ({
      ...ch,
      style: {
        ...ch.style,
        useThemeTextColor: true,
        textColor: theme.textColor,
        themeOverrideTokens: ch.style.themeOverrideTokens
          ? { ...ch.style.themeOverrideTokens, textColor: false }
          : undefined,
      },
      children: applyInheritToDescendants(ch.children),
    }));

  const renderSpecificControls = () => {
    switch (selectedBlock.type) {
      case 'hero_profile': {
        const heroVariant: HeroProfileVariant = c.heroVariant ?? 'compact';
        const isFullTop = Boolean(s.fullBleed) && (advanceOptions.pageTopPadding ?? 12) === 0;
        const coverTitleShown =
          c.heroCoverTitleEnabled !== false && c.heroCoverFontFamily !== '__none__';

        return (
          <div className="space-y-3">
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-[#17243D]">
                {label('desain.field.modelHero', 'Model Hero Profil')}
              </label>
              <SegmentedControl<HeroProfileVariant>
                columns={2}
                value={heroVariant}
                onChange={(opt) =>
                  updateContent({
                    heroVariant: opt,
                    ...(opt === 'banner'
                      ? {
                          heroStatusEnabled: false,
                          heroCardRadius: c.heroCardRadius ?? 24,
                          heroLogoSize: c.heroLogoSize ?? 78,
                        }
                      : {
                          heroStatusEnabled: true,
                          heroLogoSize: c.heroLogoSize ?? 72,
                        }),
                  })
                }
                options={[
                  { id: 'compact', label: 'Kompak' },
                  { id: 'banner', label: 'Banner Overlap' },
                ]}
              />
            </div>

            <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
              <div>
                <div className="text-xs font-semibold text-[#17243D]">
                  {label('desain.field.fullAtasSamping', 'Full Atas & Samping')}
                </div>
                <div className="text-[10.5px] text-[#8FA4BF]">
                  Tempel ke atas &amp; penuh kiri-kanan
                </div>
              </div>
              <ToggleSwitch
                checked={isFullTop}
                onChange={(checked) => {
                  if (checked) {
                    updateStyle({ fullBleed: true, widthPercent: 100, borderRadius: 0 });
                    onUpdateAdvanceOptions({ pageTopPadding: 0 });
                  } else {
                    updateStyle({
                      fullBleed: false,
                      borderRadius: heroVariant === 'banner' ? 18 : 20,
                    });
                    onUpdateAdvanceOptions({ pageTopPadding: 12 });
                  }
                }}
                label="Full Atas & Samping"
              />
            </div>

            {heroVariant === 'banner' && (
              <div className="p-2.5 rounded-lg bg-[#F0F5FA]/70 border border-[#DCE5EF] space-y-2.5">
                <div className="text-[11px] font-bold text-[#17243D]">
                  Banner Cover &amp; Teks
                </div>
                <SliderRow
                  label="Tinggi Banner Cover"
                  value={`${c.heroCoverHeight ?? 170}px`}
                  min={100}
                  max={340}
                  current={c.heroCoverHeight ?? 170}
                  onChange={(val) => updateContent({ heroCoverHeight: val })}
                />
                <SliderRow
                  label="Jarak Overlap Kartu"
                  value={`${c.heroOverlapPx ?? 34}px`}
                  min={0}
                  max={80}
                  current={c.heroOverlapPx ?? 34}
                  onChange={(val) => updateContent({ heroOverlapPx: val })}
                />
                {coverTitleShown && (
                  <>
                    <div>
                      <label className="block text-[11px] font-medium text-[#17243D] mb-1">
                        Font Teks Cover
                      </label>
                      <select
                        value={c.heroCoverFontFamily ?? 'Pacifico'}
                        onChange={(e) =>
                          updateContent({
                            heroCoverTitleEnabled: true,
                            heroCoverFontFamily: e.target.value,
                          })
                        }
                        className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                      >
                        <option value="">Ikuti Font Kartu</option>
                        {(['Sans', 'Display', 'Serif', 'Script', 'Mono'] as const).map((cat) => (
                          <optgroup key={cat} label={cat}>
                            {FONT_OPTIONS.filter((f) => f.category === cat).map((f) => (
                              <option key={f.id} value={f.id}>
                                {f.label}
                              </option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </div>
                    <div className="grid grid-cols-3 gap-2 items-end">
                      <div className="col-span-2">
                        <SliderRow
                          label="Ukuran Teks Banner"
                          value={`${c.heroCoverTitleSize ?? 26}px`}
                          min={12}
                          max={48}
                          current={c.heroCoverTitleSize ?? 26}
                          onChange={(val) => updateContent({ heroCoverTitleSize: val })}
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-medium text-[#8FA4BF] mb-1">
                          Warna Teks
                        </label>
                        <input
                          type="color"
                          value={c.heroCoverTitleColor ?? '#FFFFFF'}
                          onChange={(e) => updateContent({ heroCoverTitleColor: e.target.value })}
                          className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                        />
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}

            <SliderRow
              label={label('desain.field.ukuranLingkaranLogo', 'Ukuran Lingkaran Logo')}
              value={`${c.heroLogoSize ?? 72}px`}
              min={40}
              max={140}
              current={c.heroLogoSize ?? 72}
              onChange={(val) => updateContent({ heroLogoSize: val })}
            />
            <SliderRow
              label={label('desain.field.ukuranJudulUsaha', 'Ukuran Judul Usaha')}
              value={`${c.heroTitleSize ?? 20}px`}
              min={14}
              max={38}
              current={c.heroTitleSize ?? 20}
              onChange={(val) => updateContent({ heroTitleSize: val })}
            />
            <SliderRow
              label={label('desain.field.ukuranTagline', 'Ukuran Tagline')}
              value={`${c.heroSubtitleSize ?? 13}px`}
              min={11}
              max={22}
              current={c.heroSubtitleSize ?? 13}
              onChange={(val) => updateContent({ heroSubtitleSize: val })}
            />
            <SliderRow
              label={label('desain.field.ukuranInfoJamAlamat', 'Ukuran Info Jam & Alamat')}
              value={`${c.heroInfoSize ?? 12}px`}
              min={10}
              max={18}
              current={c.heroInfoSize ?? 12}
              onChange={(val) => updateContent({ heroInfoSize: val })}
            />
            <SliderRow
              label={label('desain.field.lengkungSudutKartuInfo', 'Lengkung Sudut Kartu Info')}
              value={`${c.heroCardRadius ?? 20}px`}
              min={0}
              max={36}
              current={c.heroCardRadius ?? 20}
              onChange={(val) => updateContent({ heroCardRadius: val })}
            />
          </div>
        );
      }

      case 'category_tabs': {
        const scrollMode: CategoryScrollMode = c.categoryScrollMode ?? 'vertical';
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1.5">
                {label('desain.field.layoutKategori', 'Tampilan & Mode Slide Kategori')}
              </label>
              <SegmentedControl<CategoryScrollMode>
                columns={3}
                value={scrollMode}
                onChange={(m) => updateContent({ categoryScrollMode: m })}
                options={[
                  { id: 'horizontal', label: 'Horizontal' },
                  { id: 'vertical', label: 'Vertikal' },
                  { id: 'wrap', label: 'Baris Penuh' },
                ]}
              />
            </div>

            {scrollMode === 'vertical' && (
              <SliderRow
                label="Tinggi Area Slide Vertikal"
                value={`${c.categoryMaxHeight ?? 112}px`}
                min={48}
                max={320}
                current={c.categoryMaxHeight ?? 112}
                onChange={(val) => updateContent({ categoryMaxHeight: val })}
              />
            )}

            <SliderRow
              label="Ukuran Font Tombol"
              value={`${c.categoryFontSize ?? 13}px`}
              min={10}
              max={20}
              current={c.categoryFontSize ?? 13}
              onChange={(val) => updateContent({ categoryFontSize: val })}
            />
            <SliderRow
              label="Lebar Tombol (Padding X)"
              value={`${c.categoryButtonPaddingX ?? 16}px`}
              min={8}
              max={32}
              current={c.categoryButtonPaddingX ?? 16}
              onChange={(val) => updateContent({ categoryButtonPaddingX: val })}
            />
            <SliderRow
              label="Tinggi Tombol (Padding Y)"
              value={`${c.categoryButtonPaddingY ?? 8}px`}
              min={4}
              max={18}
              current={c.categoryButtonPaddingY ?? 8}
              onChange={(val) => updateContent({ categoryButtonPaddingY: val })}
            />
            <SliderRow
              label="Lengkung Sudut Tombol"
              value={`${c.categoryRadius ?? 9999}px`}
              min={0}
              max={32}
              current={Math.min(32, c.categoryRadius ?? 24)}
              onChange={(val) => updateContent({ categoryRadius: val >= 28 ? 9999 : val })}
            />
            <SliderRow
              label="Jarak Antar Tombol"
              value={`${c.categoryGap ?? 8}px`}
              min={4}
              max={20}
              current={c.categoryGap ?? 8}
              onChange={(val) => updateContent({ categoryGap: val })}
            />

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div>
                <label className="block text-[10.5px] font-medium text-[#8FA4BF] mb-1">
                  Tombol Aktif
                </label>
                <input
                  type="color"
                  value={c.categoryActiveBg ?? theme.accentColor ?? '#EA580C'}
                  onChange={(e) => updateAccentContent({ categoryActiveBg: e.target.value })}
                  className="w-full h-8 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-medium text-[#8FA4BF] mb-1">
                  Teks Aktif
                </label>
                <input
                  type="color"
                  value={c.categoryActiveText ?? '#FFFFFF'}
                  onChange={(e) => updateContent({ categoryActiveText: e.target.value })}
                  className="w-full h-8 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-medium text-[#8FA4BF] mb-1">
                  Tombol Normal
                </label>
                <input
                  type="color"
                  value={c.categoryInactiveBg ?? '#F1F5F9'}
                  onChange={(e) => updateContent({ categoryInactiveBg: e.target.value })}
                  className="w-full h-8 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-medium text-[#8FA4BF] mb-1">
                  Teks Normal
                </label>
                <input
                  type="color"
                  value={c.categoryInactiveText ?? '#334155'}
                  onChange={(e) => updateContent({ categoryInactiveText: e.target.value })}
                  className="w-full h-8 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                />
              </div>
            </div>
          </div>
        );
      }

      case 'fnb_catalog':
        return (
          <div className="space-y-3">
            <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-bold text-[#17243D]">
                  Kotak Item Dipilih (Mengambang)
                </span>
                <ToggleSwitch
                  checked={c.fnbFloatingCartEnabled !== false}
                  onChange={(val) => updateContent({ fnbFloatingCartEnabled: val })}
                  label="Aktifkan kotak item mengambang"
                />
              </div>
              {c.fnbFloatingCartEnabled !== false && (
                <>
                  <div>
                    <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                      Posisi Kotak Mengambang
                    </label>
                    <select
                      value={c.fnbFloatingCartPosition ?? 'bottom-floating'}
                      onChange={(e) =>
                        updateContent({
                          fnbFloatingCartPosition: e.target.value as FloatingCartPosition,
                        })
                      }
                      className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                    >
                      <option value="bottom-floating">Melayang Bawah Penuh (Default)</option>
                      <option value="bottom-docked">Menempel Tepi Bawah</option>
                      <option value="top-floating">Melayang Atas</option>
                      <option value="bottom-left">Melayang Kiri Bawah</option>
                      <option value="bottom-right">Melayang Kanan Bawah</option>
                    </select>
                  </div>
                  <SliderRow
                    label="Jarak Tepi (Offset)"
                    value={`${c.fnbFloatingCartOffsetY ?? 16}px`}
                    min={0}
                    max={100}
                    current={c.fnbFloatingCartOffsetY ?? 16}
                    onChange={(val) => updateContent({ fnbFloatingCartOffsetY: val })}
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10.5px] font-medium text-[#8FA4BF] mb-1">
                        Warna Kotak Keranjang
                      </label>
                      <input
                        type="color"
                        value={c.fnbFloatingCartBg ?? c.fnbAccentColor ?? '#EA580C'}
                        onChange={(e) =>
                          updateAccentContent({ fnbFloatingCartBg: e.target.value })
                        }
                        className="w-full h-8 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[10.5px] font-medium text-[#8FA4BF] mb-1">
                        Warna Aksen Harga
                      </label>
                      <input
                        type="color"
                        value={c.fnbAccentColor ?? '#EA580C'}
                        onChange={(e) => updateAccentContent({ fnbAccentColor: e.target.value })}
                        className="w-full h-8 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                      />
                    </div>
                  </div>
                </>
              )}
            </div>

            <SliderRow
              label="Ukuran Foto Menu"
              value={`${c.fnbItemImageSize ?? 80}px`}
              min={52}
              max={120}
              current={c.fnbItemImageSize ?? 80}
              onChange={(val) => updateContent({ fnbItemImageSize: val })}
            />
            <SliderRow
              label="Ukuran Judul Menu"
              value={`${c.fnbItemTitleSize ?? 15}px`}
              min={12}
              max={24}
              current={c.fnbItemTitleSize ?? 15}
              onChange={(val) => updateContent({ fnbItemTitleSize: val })}
            />
            <SliderRow
              label="Ukuran Deskripsi"
              value={`${c.fnbItemDescSize ?? 12}px`}
              min={10}
              max={18}
              current={c.fnbItemDescSize ?? 12}
              onChange={(val) => updateContent({ fnbItemDescSize: val })}
            />
          </div>
        );

      case 'row': {
        const rowMode = c.rowLayoutMode ?? 'grid';
        const rowCols = Math.max(1, Math.min(20, c.rowColumns ?? 2));
        const rowColWidth = Math.max(80, Math.min(340, c.rowColumnWidth ?? 156));
        const rowColMinH = Math.max(0, Math.min(360, c.rowColumnMinHeight ?? 0));
        const rowGap = Math.max(0, Math.min(32, c.rowGap ?? 12));

        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1.5">
                {label('desain.field.layoutRow', 'Mode Susunan Kolom / Slide')}
              </label>
              <SegmentedControl<'horizontal' | 'vertical' | 'grid'>
                columns={3}
                value={rowMode}
                onChange={(m) => updateContent({ rowLayoutMode: m })}
                options={[
                  { id: 'horizontal', label: 'Horizontal' },
                  { id: 'vertical', label: 'Vertikal' },
                  { id: 'grid', label: 'Grid' },
                ]}
              />
            </div>

            {rowMode === 'horizontal' && (
              <div className="space-y-2 pt-1">
                <SliderRow
                  label={label('desain.field.lebarKolom', 'Ukuran Lebar Tiap Slide')}
                  value={`${rowColWidth}px`}
                  min={80}
                  max={340}
                  current={rowColWidth}
                  onChange={(val) => updateContent({ rowColumnWidth: val })}
                />
                <div className="grid grid-cols-4 gap-1">
                  {[
                    { label: 'Kecil', px: 110 },
                    { label: 'Sedang', px: 150 },
                    { label: 'Besar', px: 200 },
                    { label: 'Lebar', px: 260 },
                  ].map((p) => (
                    <button
                      key={p.px}
                      type="button"
                      onClick={() => updateContent({ rowColumnWidth: p.px })}
                      className={`py-1 px-1.5 rounded text-[10px] font-semibold border cursor-pointer ${
                        rowColWidth === p.px
                          ? 'bg-[#17243D] text-white border-[#17243D]'
                          : 'bg-[#F0F5FA] text-[#17243D] border-[#DCE5EF] hover:border-[#8FA4BF]'
                      }`}
                    >
                      {p.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10.5px] text-[#8FA4BF]">
                  Slide horizontal menampilkan indikator progress 3 titik secara otomatis.
                </p>
              </div>
            )}

            {rowMode === 'grid' && (
              <div className="space-y-2">
                <SliderRow
                  label={label('desain.field.jumlahKolomGrid', 'Jumlah Kolom per Baris (1–20)')}
                  value={`${rowCols}`}
                  min={1}
                  max={20}
                  current={rowCols}
                  onChange={(val) => updateContent({ rowColumns: val })}
                />
                <div className="grid grid-cols-6 gap-1">
                  {[1, 2, 3, 4, 5, 6].map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => updateContent({ rowColumns: n })}
                      className={`py-1 rounded-md text-[11px] font-bold border cursor-pointer ${
                        rowCols === n
                          ? 'bg-[#17243D] text-white border-[#17243D]'
                          : 'bg-[#F0F5FA] text-[#17243D] border-[#DCE5EF] hover:border-[#8FA4BF]'
                      }`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <SliderRow
              label={label('desain.field.tinggiKolom', 'Tinggi Minimal Kolom / Slide')}
              value={rowColMinH === 0 ? 'Auto' : `${rowColMinH}px`}
              min={0}
              max={360}
              current={rowColMinH}
              onChange={(val) => updateContent({ rowColumnMinHeight: val })}
            />
            <SliderRow
              label={label('desain.field.jarakKolom', 'Jarak Antar Kolom / Slide')}
              value={`${rowGap}px`}
              min={0}
              max={32}
              current={rowGap}
              onChange={(val) => updateContent({ rowGap: val })}
            />
          </div>
        );
      }

      case 'catalog':
        return (
          <div className="space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#17243D]">
                  <span>Show Unit Sold</span>
                  <span
                    title="Tampilkan jumlah unit terjual pada detail produk di katalog."
                    className="text-[#8FA4BF] cursor-help"
                  >
                    <Info className="w-3.5 h-3.5" />
                  </span>
                </div>
                <div className="text-[11px] text-[#8FA4BF] mt-0.5">
                  Tampilkan total terjual di detail produk
                </div>
              </div>
              <ToggleSwitch
                checked={advanceOptions.showUnitSold}
                onChange={(checked) => onUpdateAdvanceOptions({ showUnitSold: checked })}
                label="Show total unit sold on product detail"
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#17243D]">{label('desain.field.tampilanKatalog', 'Block Layout Katalog')}</div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'default', label: 'Default' },
                    { id: 'grid', label: 'Grid' },
                    { id: 'large-image', label: 'Large Image' },
                    { id: 'compact', label: 'Compact' },
                  ] as { id: BlockLayoutMode; label: string }[]
                ).map((option) => {
                  const active = advanceOptions.blockLayout === option.id;
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => onUpdateAdvanceOptions({ blockLayout: option.id })}
                      className="flex flex-col items-center text-center group cursor-pointer rounded-xl"
                    >
                      <div
                        className={`relative w-full aspect-[4/3.4] rounded-lg p-1.5 border transition-all bg-white ${
                          active
                            ? 'border-[#00C98A] ring-2 ring-[#00C98A]/20'
                            : 'border-[#DCE5EF] group-hover:border-[#8FA4BF]'
                        }`}
                      >
                        <LayoutWireframe mode={option.id} />
                      </div>
                      <span
                        className={`text-[11px] mt-1 font-medium ${
                          active ? 'text-[#17243D] font-bold' : 'text-[#8FA4BF]'
                        }`}
                      >
                        {option.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {(c.catalogCartEnabled ?? true) && (
              <div className="space-y-1.5">
                <label className="block text-xs font-semibold text-[#17243D]">
                  Ukuran Tombol Keranjang
                </label>
                <SegmentedControl<CatalogCartButtonSize>
                  columns={3}
                  value={c.catalogCartButtonSize ?? 'md'}
                  onChange={(sz) => updateContent({ catalogCartButtonSize: sz })}
                  options={[
                    { id: 'sm', label: 'Kecil' },
                    { id: 'md', label: 'Sedang' },
                    { id: 'lg', label: 'Besar' },
                  ]}
                />
              </div>
            )}
          </div>
        );

      case 'training_catalog':
        return (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#17243D]">
              Rasio Foto Pelatihan
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['16/9', '4/3', '4/5', '1/1'] as CarouselAspectRatio[]).map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => updateContent({ trainingMediaRatio: r })}
                  className={`py-1.5 rounded-lg text-xs font-semibold border cursor-pointer tabular-nums ${
                    (c.trainingMediaRatio ?? '16/9') === r
                      ? 'bg-[#17243D] text-white border-[#17243D]'
                      : 'bg-white text-[#17243D] border-[#DCE5EF] hover:bg-[#F0F5FA]'
                  }`}
                >
                  {r.replace('/', ':')}
                </button>
              ))}
            </div>
          </div>
        );

      case 'carousel':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1.5">
                Ukuran / Rasio Foto
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['1/1', '4/5', '9/16', '16/9'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => updateContent({ carouselAspectRatio: opt })}
                    className={`py-1.5 rounded-lg text-xs font-semibold border cursor-pointer tabular-nums ${
                      (c.carouselAspectRatio ?? '4/5') === opt
                        ? 'bg-[#17243D] text-white border-[#17243D]'
                        : 'bg-white text-[#17243D] border-[#DCE5EF] hover:bg-[#F0F5FA]'
                    }`}
                  >
                    {opt.replace('/', ':')}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1">
                Penyesuaian Foto
              </label>
              <select
                value={c.carouselObjectFit ?? 'cover'}
                onChange={(e) =>
                  updateContent({
                    carouselObjectFit: e.target.value as 'cover' | 'contain',
                  })
                }
                className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
              >
                <option value="cover">Penuhi Bingkai (Cover)</option>
                <option value="contain">Tampil Utuh (Contain)</option>
              </select>
            </div>
          </div>
        );

      case 'social_feed':
        return (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#17243D]">
              Rasio Kartu Postingan
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['1/1', '4/5', '9/16', '16/9'] as const).map((opt) => (
                <button
                  key={opt}
                  type="button"
                  onClick={() => updateContent({ socialFeedRatio: opt })}
                  className={`py-1.5 rounded-lg text-xs font-semibold border cursor-pointer tabular-nums ${
                    (c.socialFeedRatio ?? '4/5') === opt
                      ? 'bg-[#17243D] text-white border-[#17243D]'
                      : 'bg-white text-[#17243D] border-[#DCE5EF] hover:bg-[#F0F5FA]'
                  }`}
                >
                  {opt.replace('/', ':')}
                </button>
              ))}
            </div>
          </div>
        );

      case 'maps_place':
        return (
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-[#17243D]">
              Rasio Foto Lokasi Maps
            </label>
            <div className="grid grid-cols-4 gap-1.5">
              {(['16/9', '4/3', '4/5', '1/1'] as const).map((ratio) => (
                <button
                  key={ratio}
                  type="button"
                  onClick={() => updateContent({ mapsPhotoRatio: ratio })}
                  className={`py-1.5 rounded-lg text-xs font-semibold border cursor-pointer tabular-nums ${
                    (c.mapsPhotoRatio ?? '16/9') === ratio
                      ? 'bg-[#17243D] text-white border-[#17243D]'
                      : 'bg-white text-[#17243D] border-[#DCE5EF] hover:bg-[#F0F5FA]'
                  }`}
                >
                  {ratio.replace('/', ':')}
                </button>
              ))}
            </div>
          </div>
        );

      case 'bottom_sheet': {
        const triggerStyle = c.sheetTriggerStyle ?? 'icon';
        const triggerLabel = c.sheetTriggerLabel ?? 'Lokasi Maps';
        const activeIcon = resolveButtonIcon(c.sheetTriggerIcon ?? 'map-pin', triggerLabel);
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1.5">
                Gaya Pemicu
              </label>
              <SegmentedControl<BottomSheetTriggerStyle>
                columns={3}
                value={triggerStyle}
                onChange={(opt) => updateContent({ sheetTriggerStyle: opt })}
                options={[
                  { id: 'icon', label: 'Ikon Bulat' },
                  { id: 'pill', label: 'Kapsul' },
                  { id: 'button', label: 'Tombol' },
                ]}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1.5">
                Pilih Ikon
              </label>
              <IconPicker
                selectedIcon={activeIcon}
                iconUrl={c.sheetTriggerIconUrl ?? ''}
                allowNone
                accentVariant="emerald"
                onSelectIcon={(icon) => updateContent({ sheetTriggerIcon: icon })}
                onChangeIconUrl={(sheetTriggerIconUrl) =>
                  updateContent({ sheetTriggerIconUrl })
                }
              />
            </div>

            {triggerStyle === 'icon' && (
              <SliderRow
                label="Ukuran Ikon"
                value={`${c.sheetIconSize ?? 52}px`}
                min={36}
                max={72}
                step={2}
                current={c.sheetIconSize ?? 52}
                onChange={(val) => updateContent({ sheetIconSize: val })}
              />
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-[#8FA4BF] mb-1">
                  Warna Latar
                </label>
                <input
                  type="color"
                  value={c.sheetTriggerBg || theme.accentColor}
                  onChange={(e) => updateAccentContent({ sheetTriggerBg: e.target.value })}
                  className="w-full h-8 rounded-lg border border-[#DCE5EF] bg-white p-0.5 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#8FA4BF] mb-1">
                  Warna Ikon / Teks
                </label>
                <input
                  type="color"
                  value={c.sheetTriggerText ?? '#FFFFFF'}
                  onChange={(e) => updateContent({ sheetTriggerText: e.target.value })}
                  className="w-full h-8 rounded-lg border border-[#DCE5EF] bg-white p-0.5 cursor-pointer"
                />
              </div>
            </div>
          </div>
        );
      }

      case 'menu_icon': {
        const shape: MenuIconShape = c.menuIconShape ?? 'circle';
        const radius = Math.max(0, Math.min(48, c.menuIconRadius ?? 14));
        const size = Math.max(36, Math.min(160, c.menuIconSize ?? 64));
        const fit = c.menuIconImageFit ?? 'cover';
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1.5">
                Bentuk Menu Icon
              </label>
              <SegmentedControl<MenuIconShape>
                columns={3}
                value={shape}
                onChange={(nextShape) => updateContent({ menuIconShape: nextShape })}
                options={[
                  { id: 'circle', label: 'Bulat' },
                  { id: 'rounded', label: 'Segi Empat' },
                  { id: 'square', label: 'Kotak' },
                ]}
              />
            </div>

            {shape === 'rounded' && (
              <SliderRow
                label="Lengkungan Sudut"
                value={`${radius}px`}
                min={0}
                max={48}
                step={1}
                current={radius}
                onChange={(val) => updateContent({ menuIconRadius: val })}
              />
            )}

            <SliderRow
              label="Ukuran Ikon"
              value={`${size}px`}
              min={36}
              max={160}
              step={2}
              current={size}
              onChange={(val) => updateContent({ menuIconSize: val })}
            />

            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1.5">
                Tampilan Gambar
              </label>
              <SegmentedControl<'cover' | 'contain'>
                columns={2}
                value={fit}
                onChange={(nextFit) => updateContent({ menuIconImageFit: nextFit })}
                options={[
                  { id: 'cover', label: 'Penuh (Cover)' },
                  { id: 'contain', label: 'Utuh (Contain)' },
                ]}
              />
            </div>

            <div className="flex items-center justify-between gap-2 pt-0.5">
              <span className="text-[11px] font-semibold text-[#17243D]">
                Tampilkan Label Teks
              </span>
              <ToggleSwitch
                label="Tampilkan Label Teks"
                checked={c.menuIconShowLabel !== false}
                onChange={(checked) => updateContent({ menuIconShowLabel: checked })}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-[#8FA4BF] mb-1">
                  Warna Latar Ikon
                </label>
                <input
                  type="color"
                  value={c.menuIconBg || theme.accentColor}
                  onChange={(e) => updateAccentContent({ menuIconBg: e.target.value })}
                  className="w-full h-8 rounded-lg border border-[#DCE5EF] bg-white p-0.5 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#8FA4BF] mb-1">
                  Warna Label
                </label>
                <input
                  type="color"
                  value={c.menuIconTextColor || theme.textColor}
                  onChange={(e) => updateContent({ menuIconTextColor: e.target.value })}
                  className="w-full h-8 rounded-lg border border-[#DCE5EF] bg-white p-0.5 cursor-pointer"
                />
              </div>
            </div>
          </div>
        );
      }

      case 'toggle_container':
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1.5">
                Gaya Tombol
              </label>
              <SegmentedControl<'solid' | 'outline'>
                columns={2}
                value={c.toggleButtonStyle ?? 'solid'}
                onChange={(variant) => updateContent({ toggleButtonStyle: variant })}
                options={[
                  { id: 'solid', label: 'Penuh (Solid)' },
                  { id: 'outline', label: 'Garis (Outline)' },
                ]}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-[#8FA4BF] mb-1">
                  Warna Tombol
                </label>
                <input
                  type="color"
                  value={c.toggleButtonBg ?? theme.accentColor ?? '#2563EB'}
                  onChange={(e) => updateAccentContent({ toggleButtonBg: e.target.value })}
                  className="w-full h-8 rounded-lg border border-[#DCE5EF] bg-white p-0.5 cursor-pointer"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#8FA4BF] mb-1">
                  Warna Teks
                </label>
                <input
                  type="color"
                  value={c.toggleButtonText ?? '#FFFFFF'}
                  onChange={(e) => updateContent({ toggleButtonText: e.target.value })}
                  className="w-full h-8 rounded-lg border border-[#DCE5EF] bg-white p-0.5 cursor-pointer"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1.5">
                Ikon Sebelah Kiri Tombol
              </label>
              <IconPicker
                selectedIcon={resolveButtonIcon(
                  c.toggleButtonIcon,
                  c.toggleShowLabel ?? 'Tampilkan Konten'
                )}
                iconUrl={c.toggleButtonIconUrl ?? ''}
                allowNone
                accentVariant="emerald"
                onSelectIcon={(icon) => updateContent({ toggleButtonIcon: icon })}
                onChangeIconUrl={(toggleButtonIconUrl) =>
                  updateContent({ toggleButtonIconUrl })
                }
              />
            </div>
          </div>
        );

      case 'social': {
        const { boxSize, gap } = resolveSocialMetrics(c);
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Gaya Ikon
                </label>
                <select
                  value={c.socialStyle ?? 'filled'}
                  onChange={(e) =>
                    updateContent({
                      socialStyle: e.target.value as 'filled' | 'outline' | 'minimal',
                    })
                  }
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                >
                  <option value="filled">Isi</option>
                  <option value="outline">Garis</option>
                  <option value="minimal">Minimal</option>
                </select>
              </div>
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Bentuk
                </label>
                <select
                  value={c.socialShape ?? 'circle'}
                  onChange={(e) =>
                    updateContent({
                      socialShape: e.target.value as 'circle' | 'rounded',
                    })
                  }
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                >
                  <option value="circle">Bulat</option>
                  <option value="rounded">Kotak Tumpul</option>
                </select>
              </div>
            </div>

            <SliderRow
              label="Besar Ikon"
              value={`${boxSize}px`}
              min={24}
              max={64}
              current={boxSize}
              onChange={(val) => updateContent({ socialIconSize: val })}
            />
            <SliderRow
              label="Jarak Antar Ikon"
              value={`${gap}px`}
              min={0}
              max={32}
              current={gap}
              onChange={(val) => updateContent({ socialGap: val })}
            />

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-[#17243D]">
                Gunakan Warna Brand Asli
              </span>
              <ToggleSwitch
                checked={c.socialUseBrandColors ?? true}
                onChange={(checked) => updateContent({ socialUseBrandColors: checked })}
                label="Gunakan Warna Brand Asli"
              />
            </div>

            {c.socialUseBrandColors === false && (
              <div>
                <label className="block text-xs font-medium text-[#17243D] mb-1">
                  Warna Kustom Ikon
                </label>
                <input
                  type="color"
                  value={c.socialColor ?? theme.accentColor ?? '#2563EB'}
                  onChange={(e) => updateAccentContent({ socialColor: e.target.value })}
                  className="w-full h-8 rounded-lg border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                />
              </div>
            )}
          </div>
        );
      }

      case 'social_follower':
        return (
          <SliderRow
            label="Jarak Antar Kartu Akun"
            value={`${c.socialFollowerGap ?? 10}px`}
            min={0}
            max={24}
            current={c.socialFollowerGap ?? 10}
            onChange={(val) => updateContent({ socialFollowerGap: val })}
          />
        );

      case 'image': {
        const isCircle = c.imageShape === 'circle';
        const circleSize = c.circleSize ?? 112;
        const imageZoom = c.imageZoom ?? 100;
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1.5">
                Bentuk Foto
              </label>
              <SegmentedControl<'rect' | 'circle'>
                columns={2}
                value={isCircle ? 'circle' : 'rect'}
                onChange={(shape) =>
                  shape === 'circle'
                    ? updateContent({
                        imageShape: 'circle',
                        aspectRatio: '1/1',
                        objectFit: c.objectFit ?? 'cover',
                        circleSize,
                        imageZoom,
                      })
                    : updateContent({ imageShape: 'rect' })
                }
                options={[
                  { id: 'rect', label: 'Kotak / Banner' },
                  { id: 'circle', label: 'Bulat (Profil)' },
                ]}
              />
            </div>

            {isCircle && (
              <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2.5">
                <SliderRow
                  label="Ukuran Lingkaran"
                  value={`${circleSize}px`}
                  min={48}
                  max={240}
                  step={2}
                  current={circleSize}
                  onChange={(val) => updateContent({ circleSize: val })}
                />
                <div>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="font-medium text-[#17243D]">Besar Foto di Dalam Lingkaran</span>
                    <div className="flex items-center gap-1.5">
                      {imageZoom !== 100 && (
                        <button
                          type="button"
                          onClick={() => updateContent({ imageZoom: 100 })}
                          className="px-1.5 py-0.5 rounded bg-white border border-[#DCE5EF] text-[10px] font-semibold text-[#17243D] cursor-pointer"
                        >
                          100%
                        </button>
                      )}
                      <span className="font-mono text-[11px] font-semibold text-[#17243D] tabular-nums">
                        {imageZoom}%
                      </span>
                    </div>
                  </div>
                  <input
                    type="range"
                    min={50}
                    max={220}
                    step={5}
                    value={imageZoom}
                    onChange={(e) => updateContent({ imageZoom: Number(e.target.value) })}
                    style={rangeProgressStyle(imageZoom, 50, 220)}
                    className="w-full cursor-pointer"
                  />
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              {!isCircle && (
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Rasio
                  </label>
                  <select
                    value={c.aspectRatio ?? '16/9'}
                    onChange={(e) =>
                      updateContent({
                        aspectRatio: e.target.value as 'auto' | '16/9' | '4/3' | '1/1',
                      })
                    }
                    className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                  >
                    <option value="auto">Otomatis</option>
                    <option value="16/9">16:9</option>
                    <option value="4/3">4:3</option>
                    <option value="1/1">1:1 Kotak</option>
                  </select>
                </div>
              )}
              <div className={isCircle ? 'col-span-2' : ''}>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Penyesuaian
                </label>
                <select
                  value={c.objectFit ?? 'cover'}
                  onChange={(e) =>
                    updateContent({ objectFit: e.target.value as 'cover' | 'contain' })
                  }
                  className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
                >
                  <option value="cover">Penuhi (Cover)</option>
                  <option value="contain">Utuh (Contain)</option>
                </select>
              </div>
            </div>

            {isProfilePhoto && (
              <div className="p-2.5 rounded-lg bg-[#F0F5FA]/80 border border-[#DCE5EF] space-y-2.5">
                <div className="text-[11px] font-bold text-[#17243D]">
                  Outline &amp; Shadow Foto Profil
                </div>
                <SliderRow
                  label="Ukuran Outline"
                  value={`${s.borderWidth}px`}
                  min={0}
                  max={16}
                  current={s.borderWidth}
                  onChange={(val) => updateStyle({ borderWidth: val })}
                />
                <div className="grid grid-cols-5 gap-1">
                  {[0, 2, 4, 6, 8].map((w) => (
                    <button
                      key={w}
                      type="button"
                      onClick={() => updateStyle({ borderWidth: w })}
                      className={`py-1 rounded border text-[10px] font-semibold cursor-pointer ${
                        s.borderWidth === w
                          ? 'bg-[#17243D] text-white border-[#17243D]'
                          : 'bg-white text-[#17243D] border-[#DCE5EF]'
                      }`}
                    >
                      {w}px
                    </button>
                  ))}
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#17243D] mb-1">
                    Warna Outline
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={s.borderColor || '#FFFFFF'}
                      onChange={(e) =>
                        updateStyleWithToken(
                          {
                            borderColor: e.target.value,
                            borderWidth: s.borderWidth > 0 ? s.borderWidth : 4,
                          },
                          ['borderColor']
                        )
                      }
                      className="w-8 h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                    />
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {['#FFFFFF', '#0F172A', theme.accentColor, '#F59E0B'].map((col, idx) => (
                        <button
                          key={`${col}_${idx}`}
                          type="button"
                          onClick={() =>
                            updateStyleWithToken(
                              {
                                borderColor: col,
                                borderWidth: s.borderWidth > 0 ? s.borderWidth : 4,
                              },
                              ['borderColor']
                            )
                          }
                          style={{ backgroundColor: col }}
                          className={`w-5 h-5 rounded-full border border-[#DCE5EF] cursor-pointer ${
                            s.borderColor.toLowerCase() === col.toLowerCase()
                              ? 'ring-2 ring-[#00C98A] ring-offset-1'
                              : ''
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        );
      }

      case 'button':
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-[#8FA4BF] mb-1">
                  Warna Tombol
                </label>
                <input
                  type="color"
                  value={c.buttonBg ?? theme.accentColor ?? '#2563EB'}
                  onChange={(e) => updateAccentContent({ buttonBg: e.target.value })}
                  className="w-full h-8 rounded-lg border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#8FA4BF] mb-1">
                  Warna Teks
                </label>
                <input
                  type="color"
                  value={c.buttonText ?? '#FFFFFF'}
                  onChange={(e) => updateContent({ buttonText: e.target.value })}
                  className="w-full h-8 rounded-lg border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1.5">
                Ikon Sebelah Kiri Tombol
              </label>
              <IconPicker
                selectedIcon={resolveButtonIcon(c.buttonIcon, c.label)}
                iconUrl={c.buttonIconUrl ?? ''}
                allowNone
                accentVariant="emerald"
                onSelectIcon={(icon) => updateContent({ buttonIcon: icon })}
                onChangeIconUrl={(buttonIconUrl) => updateContent({ buttonIconUrl })}
              />
            </div>
          </div>
        );

      case 'form':
        return (
          <div>
            <label className="block text-xs font-semibold text-[#17243D] mb-1">
              Warna Tombol Kirim Form
            </label>
            <input
              type="color"
              value={c.buttonColor ?? theme.accentColor ?? '#2563EB'}
              onChange={(e) => updateAccentContent({ buttonColor: e.target.value })}
              className="w-full h-8 rounded-lg border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
            />
          </div>
        );

      case 'divider':
        return (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1">
                Gaya Garis
              </label>
              <select
                value={c.lineStyle ?? 'solid'}
                onChange={(e) =>
                  updateContent({ lineStyle: e.target.value as 'solid' | 'dashed' | 'dotted' })
                }
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
              >
                <option value="solid">Lurus</option>
                <option value="dashed">Putus-putus</option>
                <option value="dotted">Titik-titik</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1">
                Warna Garis
              </label>
              <input
                type="color"
                value={c.lineColor ?? theme.borderColor ?? '#E2E8F0'}
                onChange={(e) => updateContent({ lineColor: e.target.value })}
                className="w-full h-8 rounded-lg border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
              />
            </div>
          </div>
        );

      case 'youtube':
      case 'facebook_video':
      case 'tiktok_video':
      case 'instagram_video': {
        const isYt = selectedBlock.type === 'youtube';
        const isIg = selectedBlock.type === 'instagram_video';
        const currentRatio =
          c.videoAspectRatio ??
          c.youtubeAspectRatio ??
          (selectedBlock.type === 'tiktok_video' || isIg ? '9/16' : '16/9');
        const currentAuto = c.videoAutoplay ?? c.youtubeAutoplay ?? true;
        const currentVol = c.videoVolume ?? c.youtubeVolume ?? 75;
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1.5">
                Rasio Embed Video
              </label>
              <div className="grid grid-cols-4 gap-1.5">
                {(['1/1', '4/5', '9/16', '16/9'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      updateContent(
                        isYt
                          ? { youtubeAspectRatio: opt, videoAspectRatio: opt }
                          : { videoAspectRatio: opt }
                      )
                    }
                    className={`py-1.5 rounded-lg text-xs font-semibold border cursor-pointer tabular-nums ${
                      currentRatio === opt
                        ? 'bg-[#17243D] text-white border-[#17243D]'
                        : 'bg-white text-[#17243D] border-[#DCE5EF] hover:bg-[#F0F5FA]'
                    }`}
                  >
                    {opt.replace('/', ':')}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-medium text-[#17243D]">Auto Play Video</span>
              <ToggleSwitch
                checked={currentAuto}
                onChange={(checked) =>
                  updateContent(
                    isYt
                      ? { youtubeAutoplay: checked, videoAutoplay: checked }
                      : { videoAutoplay: checked }
                  )
                }
                label="Auto Play Video"
              />
            </div>

            <SliderRow
              label="Volume Audio"
              value={`${currentVol}%`}
              min={0}
              max={100}
              current={currentVol}
              onChange={(val) =>
                updateContent(
                  isYt ? { youtubeVolume: val, videoVolume: val } : { videoVolume: val }
                )
              }
            />
          </div>
        );
      }

      case 'text':
      case 'container':
      default:
        return (
          <SectionEmptyNote message="Komponen ini tidak memiliki pengaturan tampilan khusus tambahan. Atur gaya lengkap di bagian Layout, Gaya Visual, Tipografi, Background, atau Border di bawah." />
        );
    }
  };

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-[#F0F5FA]/50">
      <AccordionSection
        id="specific"
        title={label('desain.sec.specific', 'Pengaturan Khusus Komponen')}
        icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
        isOpen={openSections.specific}
        onToggle={() => toggleSection('specific')}
      >
        {renderSpecificControls()}
      </AccordionSection>

      <AccordionSection
        id="layout"
        title={label('desain.sec.layout', 'Layout & Spasi')}
        icon={<Maximize2 className="w-3.5 h-3.5" />}
        isOpen={openSections.layout}
        onToggle={() => toggleSection('layout')}
      >
        <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#17243D] flex items-center gap-1.5">
              <LayoutTemplate className="w-3.5 h-3.5 text-[#00C98A]" />
              <span>{label('desain.field.fullKananKiri', 'Full Kanan-Kiri')}</span>
            </span>
            <ToggleSwitch
              checked={Boolean(s.fullBleed)}
              onChange={(checked) =>
                updateStyle(
                  checked ? { fullBleed: true, widthPercent: 100 } : { fullBleed: false }
                )
              }
              label={label('desain.field.fullKananKiri', 'Full Kanan-Kiri')}
            />
          </div>
          {s.fullBleed && s.borderRadius > 0 && (
            <button
              type="button"
              onClick={() => updateStyle({ borderRadius: 0 })}
              className="px-2 py-0.5 rounded bg-white border border-[#DCE5EF] text-[10.5px] font-semibold text-[#17243D] hover:border-[#00C98A] cursor-pointer"
            >
              Sudut 0px
            </button>
          )}
        </div>

        <div className="p-2.5 rounded-lg bg-[#F0F5FA]/70 border border-[#DCE5EF] space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#17243D]">{label('desain.field.jarakAtasHalaman', 'Jarak Atas Halaman')}</span>
            <span className="font-mono text-[11px] font-semibold text-[#17243D] tabular-nums">
              {advanceOptions.pageTopPadding ?? (s.fullBleed ? 0 : 12)}px
            </span>
          </div>
          <div className="grid grid-cols-3 gap-1">
            {[
              { val: 0, label: '0px Rapat' },
              { val: 12, label: '12px Rapi' },
              { val: 24, label: '24px Lega' },
            ].map((opt) => {
              const currentTop = advanceOptions.pageTopPadding ?? (s.fullBleed ? 0 : 12);
              const active = currentTop === opt.val;
              return (
                <button
                  key={opt.val}
                  type="button"
                  onClick={() => onUpdateAdvanceOptions({ pageTopPadding: opt.val })}
                  className={`py-1 px-1.5 rounded border text-[10.5px] font-semibold cursor-pointer ${
                    active
                      ? 'bg-[#17243D] text-white border-[#17243D]'
                      : 'bg-white text-[#17243D] border-[#DCE5EF]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#17243D] mb-1.5">
            {label('desain.field.posisiIsi', 'Posisi Isi di Dalamnya')}
          </label>
          <SegmentedControl<'left' | 'center' | 'right'>
            columns={3}
            value={s.align}
            onChange={(align) => updateStyle({ align })}
            options={[
              { id: 'left', label: <AlignLeft className="w-3.5 h-3.5" /> },
              { id: 'center', label: <AlignCenter className="w-3.5 h-3.5" /> },
              { id: 'right', label: <AlignRight className="w-3.5 h-3.5" /> },
            ]}
          />
        </div>

        <SliderRow
          label={label('desain.field.lebarElemen', 'Lebar Elemen')}
          value={`${s.widthPercent}%`}
          min={30}
          max={100}
          current={s.widthPercent}
          onChange={(val) =>
            updateStyle({ widthPercent: val, fullBleed: val < 100 ? false : s.fullBleed })
          }
        />

        <SliderRow
          label={label('desain.field.tinggiMinimal', 'Tinggi Minimal')}
          value={`${s.minHeight}px`}
          min={0}
          max={420}
          current={s.minHeight}
          onChange={(val) => updateStyle({ minHeight: val })}
        />

        {isProfilePhoto ? (
          <div className="space-y-2.5 p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
            <SliderRow
              label="Padding Atas"
              value={`${s.paddingTop ?? s.padding}px`}
              min={0}
              max={48}
              current={s.paddingTop ?? s.padding}
              onChange={(val) => updateStyle({ paddingTop: val })}
            />
            <SliderRow
              label="Padding Bawah"
              value={`${s.paddingBottom ?? s.padding}px`}
              min={0}
              max={48}
              current={s.paddingBottom ?? s.padding}
              onChange={(val) => updateStyle({ paddingBottom: val })}
            />
          </div>
        ) : (
          <SliderRow
            label={label('desain.field.paddingAtasBawah', 'Padding Atas & Bawah')}
            value={`${s.padding}px`}
            min={0}
            max={40}
            current={s.padding}
            onChange={(val) =>
              updateStyle({
                padding: val,
                paddingTop: undefined,
                paddingBottom: undefined,
              })
            }
          />
        )}

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-[#17243D]">{label('desain.field.paddingKananKiri', 'Padding Kanan & Kiri')}</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateStyle({ paddingX: 0 })}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                  (s.paddingX ?? s.padding) === 0
                    ? 'bg-[#17243D] text-white border-[#17243D]'
                    : 'bg-white text-[#17243D] border-[#DCE5EF]'
                }`}
              >
                0px
              </button>
              <span className="font-mono text-[11px] font-semibold text-[#17243D] tabular-nums">
                {s.paddingX ?? s.padding}px
              </span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={40}
            value={s.paddingX ?? s.padding}
            onChange={(e) => updateStyle({ paddingX: Number(e.target.value) })}
            style={rangeProgressStyle(s.paddingX ?? s.padding, 0, 40)}
            className="w-full cursor-pointer"
          />
        </div>

        <SliderRow
          label={label('desain.field.jarakBawah', 'Jarak Bawah (Margin)')}
          value={`${s.marginBottom}px`}
          min={0}
          max={48}
          current={s.marginBottom}
          onChange={(val) => updateStyle({ marginBottom: val })}
        />
      </AccordionSection>

      <AccordionSection
        id="visual"
        title={label('desain.sec.visual', 'Gaya Visual')}
        icon={<Sparkles className="w-3.5 h-3.5" />}
        isOpen={openSections.visual}
        onToggle={() => toggleSection('visual')}
      >
        {selectedBlock.type === 'container' && (
          <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2">
            <div className="text-[11px] font-bold text-[#17243D]">
              Preset Wadah Cepat
            </div>
            <div className="grid grid-cols-2 gap-1.5">
              <button
                type="button"
                onClick={() =>
                  updateStyleWithToken(
                    {
                      backgroundMode: 'solid',
                      backgroundColor: '#FFFFFF',
                      borderRadius: 20,
                      borderWidth: 1,
                      borderColor: '#E2E8F0',
                      shadow: 'sm',
                      hoverLift: true,
                      useThemeTextColor: false,
                      textColor: '#0F172A',
                    },
                    ['backgroundColor', 'textColor', 'borderColor']
                  )
                }
                className="py-1.5 px-2 rounded-lg bg-white border border-[#DCE5EF] hover:border-[#00C98A] text-[11px] font-semibold text-[#17243D] cursor-pointer"
              >
                Kartu Bersih + Lift
              </button>
              <button
                type="button"
                onClick={() =>
                  updateStyleWithToken(
                    {
                      backgroundMode: 'gradient',
                      gradientColor1: '#EA580C',
                      gradientColor2: '#9A3412',
                      gradientAngle: 135,
                      borderRadius: 24,
                      borderWidth: 0,
                      shadow: 'md',
                      hoverLift: true,
                      useThemeTextColor: false,
                      textColor: '#FFFFFF',
                    },
                    ['backgroundColor', 'textColor']
                  )
                }
                className="py-1.5 px-2 rounded-lg text-[11px] font-semibold text-white cursor-pointer"
                style={{ backgroundImage: 'linear-gradient(135deg, #EA580C, #9A3412)' }}
              >
                Box Promo Gradasi
              </button>
            </div>
          </div>
        )}

        <SliderRow
          label={label('desain.field.lengkungSudut', 'Lengkung Sudut')}
          value={`${s.borderRadius}px`}
          min={0}
          max={36}
          current={s.borderRadius}
          onChange={(val) => updateStyle({ borderRadius: val })}
        />

        <SliderRow
          label={label('desain.field.efekKaca', 'Efek Kaca (Blur)')}
          value={`${s.blur}px`}
          min={0}
          max={24}
          current={s.blur}
          onChange={(val) => updateStyle({ blur: val })}
        />

        <div>
          <label className="block text-xs font-semibold text-[#17243D] mb-1">
            {label('desain.field.efekBayangan', 'Efek Bayangan (Shadow)')}
          </label>
          <select
            value={s.shadow}
            onChange={(e) => updateStyle({ shadow: e.target.value as ShadowPreset })}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
          >
            <option value="none">Tanpa Bayangan</option>
            <option value="sm">Halus</option>
            <option value="md">Sedang</option>
            <option value="lg">Tegas</option>
          </select>
          {s.shadow !== 'none' && (
            <div className="mt-2 flex items-center justify-between gap-2">
              <span className="text-[11px] font-medium text-[#8FA4BF]">Warna Shadow</span>
              <div className="flex items-center gap-1.5">
                <input
                  type="color"
                  value={s.shadowColor || '#0F172A'}
                  onChange={(e) => updateStyle({ shadowColor: e.target.value })}
                  className="w-7 h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                />
                {s.shadowColor && (
                  <button
                    type="button"
                    onClick={() => updateStyle({ shadowColor: undefined })}
                    className="px-2 py-1 rounded border border-[#DCE5EF] text-[10px] font-semibold text-[#17243D] hover:bg-[#F0F5FA] cursor-pointer"
                  >
                    Default
                  </button>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
          <div>
            <div className="text-xs font-semibold text-[#17243D]">{label('desain.field.efekHoverLift', 'Efek Hover Lift')}</div>
            <div className="text-[10.5px] text-[#8FA4BF]">Terangkat halus saat disentuh</div>
          </div>
          <ToggleSwitch
            checked={Boolean(s.hoverLift)}
            onChange={(checked) => updateStyle({ hoverLift: checked })}
            label="Efek Kartu Dinamis"
          />
        </div>
      </AccordionSection>

      <AccordionSection
        id="typo"
        title={label('desain.sec.typo', 'Tipografi')}
        icon={<Type className="w-3.5 h-3.5" />}
        isOpen={openSections.typo}
        onToggle={() => toggleSection('typo')}
      >
        {selectedBlock.type === 'text' && (
          <div className="grid grid-cols-2 gap-2">
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Jenis Teks
              </label>
              <select
                value={c.variant ?? 'body'}
                onChange={(e) =>
                  updateContent({ variant: e.target.value as 'h1' | 'h2' | 'body' })
                }
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
              >
                <option value="h1">Judul Besar</option>
                <option value="h2">Subjudul</option>
                <option value="body">Paragraf</option>
              </select>
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Ketebalan Teks
              </label>
              <select
                value={c.fontWeight ?? 'normal'}
                onChange={(e) =>
                  updateContent({ fontWeight: e.target.value as 'normal' | 'semibold' | 'bold' })
                }
                className="w-full px-2 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
              >
                <option value="normal">Normal</option>
                <option value="semibold">Semi Tebal</option>
                <option value="bold">Tebal</option>
              </select>
            </div>
          </div>
        )}

        <div>
          <div className="flex items-center justify-between mb-1">
            <label className="text-xs font-semibold text-[#17243D]">{label('desain.field.jenisFont', 'Jenis Font')}</label>
            {s.fontFamily && (
              <button
                type="button"
                onClick={() =>
                  updateStyle({
                    fontFamily: undefined,
                    themeOverrideTokens: s.themeOverrideTokens
                      ? { ...s.themeOverrideTokens, fontFamily: false }
                      : undefined,
                  })
                }
                className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#00C98A] hover:underline cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Ikuti Global</span>
              </button>
            )}
          </div>
          <select
            value={s.fontFamily ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                updateStyle({
                  fontFamily: undefined,
                  themeOverrideTokens: s.themeOverrideTokens
                    ? { ...s.themeOverrideTokens, fontFamily: false }
                    : undefined,
                });
              } else {
                updateStyleWithToken({ fontFamily: val }, ['fontFamily']);
              }
            }}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white outline-none focus:border-[#00C98A]"
          >
            <option value="">Ikuti Font Default Tema</option>
            {(['Sans', 'Display', 'Serif', 'Script', 'Mono'] as const).map((cat) => (
              <optgroup key={cat} label={cat}>
                {FONT_OPTIONS.filter((f) => f.category === cat).map((f) => (
                  <option key={f.id} value={f.id}>
                    {f.label}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-[#17243D]">{label('desain.field.ukuranTeks', 'Ukuran Teks (Font Size)')}</span>
            <div className="flex items-center gap-1.5">
              {s.fontSize !== undefined && (
                <button
                  type="button"
                  onClick={() => updateStyle({ fontSize: undefined })}
                  className="px-1.5 py-0.5 rounded border border-[#DCE5EF] bg-white text-[10px] font-semibold text-[#17243D] cursor-pointer"
                >
                  Auto
                </button>
              )}
              <span className="font-mono text-[11px] font-semibold text-[#17243D] bg-[#F0F5FA] px-1.5 py-0.5 rounded tabular-nums">
                {s.fontSize ? `${s.fontSize}px` : 'Auto'}
              </span>
            </div>
          </div>
          <input
            type="range"
            min={10}
            max={42}
            value={s.fontSize ?? 15}
            onChange={(e) => updateStyle({ fontSize: Number(e.target.value) })}
            style={rangeProgressStyle(s.fontSize ?? 15, 10, 42)}
            className="w-full cursor-pointer"
          />
        </div>

        <div>
          <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
            {label('desain.field.ketebalanTeks', 'Ketebalan Teks (Weight)')}
          </label>
          <div className="grid grid-cols-5 gap-1">
            {(['400', '500', '600', '700', '800'] as const).map((w) => (
              <button
                key={w}
                type="button"
                onClick={() =>
                  updateStyle({ fontWeightCss: s.fontWeightCss === w ? undefined : w })
                }
                className={`py-1 rounded border text-[10.5px] font-semibold cursor-pointer tabular-nums ${
                  s.fontWeightCss === w
                    ? 'bg-[#17243D] text-white border-[#17243D]'
                    : 'bg-white text-[#17243D] border-[#DCE5EF] hover:bg-[#F0F5FA]'
                }`}
              >
                {w}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="flex items-center justify-between text-xs mb-1">
            <span className="font-medium text-[#17243D]">{label('desain.field.tinggiBaris', 'Tinggi Baris (Line Height)')}</span>
            <div className="flex items-center gap-1.5">
              {s.lineHeight !== undefined && (
                <button
                  type="button"
                  onClick={() => updateStyle({ lineHeight: undefined })}
                  className="px-1.5 py-0.5 rounded border border-[#DCE5EF] bg-white text-[10px] font-semibold text-[#17243D] cursor-pointer"
                >
                  Auto
                </button>
              )}
              <span className="font-mono text-[11px] font-semibold text-[#17243D] bg-[#F0F5FA] px-1.5 py-0.5 rounded tabular-nums">
                {s.lineHeight ? s.lineHeight.toFixed(1) : 'Auto'}
              </span>
            </div>
          </div>
          <input
            type="range"
            min={1.0}
            max={2.4}
            step={0.1}
            value={s.lineHeight ?? 1.5}
            onChange={(e) => updateStyle({ lineHeight: Number(e.target.value) })}
            style={rangeProgressStyle(s.lineHeight ?? 1.5, 1.0, 2.4)}
            className="w-full cursor-pointer"
          />
        </div>
      </AccordionSection>

      <AccordionSection
        id="bg"
        title={label('desain.sec.bg', 'Background & Warna')}
        icon={<Palette className="w-3.5 h-3.5" />}
        isOpen={openSections.bg}
        onToggle={() => toggleSection('bg')}
      >
        <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#17243D]">{label('desain.field.latarGradasi', 'Latar & Gradasi')}</span>
            <div className="inline-flex rounded-md bg-white border border-[#DCE5EF] p-0.5">
              <button
                type="button"
                onClick={() => updateStyle({ backgroundMode: 'solid' })}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                  (s.backgroundMode ?? 'solid') === 'solid'
                    ? 'bg-[#17243D] text-white'
                    : 'text-[#8FA4BF] hover:text-[#17243D]'
                }`}
              >
                Solid
              </button>
              <button
                type="button"
                onClick={() =>
                  updateStyleWithToken(
                    {
                      backgroundMode: 'gradient',
                      gradientColor1: s.gradientColor1 || '#EA580C',
                      gradientColor2: s.gradientColor2 || '#9A3412',
                      gradientAngle: s.gradientAngle ?? 135,
                    },
                    ['backgroundColor']
                  )
                }
                className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                  s.backgroundMode === 'gradient'
                    ? 'bg-[#17243D] text-white'
                    : 'text-[#8FA4BF] hover:text-[#17243D]'
                }`}
              >
                Gradasi
              </button>
            </div>
          </div>

          {(s.backgroundMode ?? 'solid') === 'solid' ? (
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={s.backgroundColor === 'transparent' ? '#ffffff' : s.backgroundColor}
                onChange={(e) =>
                  updateStyleWithToken({ backgroundColor: e.target.value }, ['backgroundColor'])
                }
                className="w-8 h-8 rounded border border-[#DCE5EF] p-0.5 cursor-pointer shrink-0 bg-white"
              />
              <button
                type="button"
                onClick={() =>
                  updateStyleWithToken({ backgroundColor: 'transparent' }, ['backgroundColor'])
                }
                className="text-[11px] px-2.5 py-1.5 rounded-lg border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] text-[#17243D] cursor-pointer"
              >
                Transparan
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <div
                className="w-full h-7 rounded-lg border border-[#DCE5EF]"
                style={{
                  backgroundImage:
                    buildLinearGradientCss(s) ||
                    'linear-gradient(135deg, #EA580C 0%, #9A3412 100%)',
                }}
              />
              <div className="grid grid-cols-3 gap-2">
                <div>
                  <label className="block text-[10px] font-medium text-[#8FA4BF] mb-1">
                    Warna 1
                  </label>
                  <input
                    type="color"
                    value={s.gradientColor1 || '#EA580C'}
                    onChange={(e) =>
                      updateStyleWithToken({ gradientColor1: e.target.value }, ['backgroundColor'])
                    }
                    className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#8FA4BF] mb-1">
                    Warna 2
                  </label>
                  <input
                    type="color"
                    value={s.gradientColor2 || '#9A3412'}
                    onChange={(e) =>
                      updateStyleWithToken({ gradientColor2: e.target.value }, ['backgroundColor'])
                    }
                    className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#8FA4BF] mb-1">
                    Warna 3
                  </label>
                  {s.gradientColor3 ? (
                    <div className="flex items-center gap-1">
                      <input
                        type="color"
                        value={s.gradientColor3}
                        onChange={(e) =>
                          updateStyleWithToken(
                            { gradientColor3: e.target.value },
                            ['backgroundColor']
                          )
                        }
                        className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                      />
                      <button
                        type="button"
                        onClick={() => updateStyle({ gradientColor3: undefined })}
                        className="px-1 text-[10px] text-[#8FA4BF] hover:text-red-600 cursor-pointer"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() =>
                        updateStyleWithToken({ gradientColor3: '#7C2D12' }, ['backgroundColor'])
                      }
                      className="w-full h-7 rounded border border-dashed border-[#DCE5EF] bg-white text-[10px] font-semibold text-[#8FA4BF] hover:text-[#17243D] cursor-pointer"
                    >
                      + Warna 3
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-xs mb-1">
                  <span className="font-medium text-[#17243D]">Sudut Gradasi</span>
                  <span className="font-mono text-[11px] font-semibold text-[#17243D] tabular-nums">
                    {clampGradientAngle(s.gradientAngle ?? 135)}°
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={5}
                  value={clampGradientAngle(s.gradientAngle ?? 135)}
                  onChange={(e) =>
                    updateStyleWithToken(
                      { gradientAngle: Number(e.target.value) },
                      ['backgroundColor']
                    )
                  }
                  style={rangeProgressStyle(clampGradientAngle(s.gradientAngle ?? 135), 0, 360)}
                  className="w-full cursor-pointer"
                />
                <div className="grid grid-cols-5 gap-1 mt-1">
                  {[0, 45, 90, 135, 180].map((deg) => (
                    <button
                      key={deg}
                      type="button"
                      onClick={() =>
                        updateStyleWithToken({ gradientAngle: deg }, ['backgroundColor'])
                      }
                      className={`py-0.5 rounded border text-[10px] font-semibold cursor-pointer tabular-nums ${
                        clampGradientAngle(s.gradientAngle ?? 135) === deg
                          ? 'bg-[#17243D] text-white border-[#17243D]'
                          : 'bg-white text-[#17243D] border-[#DCE5EF]'
                      }`}
                    >
                      {deg}°
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-[10.5px] font-medium text-[#8FA4BF] mb-1.5">
                  Preset Gradasi:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {GRADIENT_PRESETS.map((gp) => (
                    <button
                      key={gp.id}
                      type="button"
                      title={gp.name}
                      onClick={() =>
                        updateStyleWithToken(
                          {
                            backgroundMode: 'gradient',
                            gradientColor1: gp.color1,
                            gradientColor2: gp.color2,
                            gradientColor3: gp.color3,
                            gradientAngle: gp.angle,
                            useThemeTextColor: false,
                            textColor: gp.suggestedTextColor,
                          },
                          ['backgroundColor', 'textColor']
                        )
                      }
                      className="w-6 h-6 rounded-full border border-white shadow-xs cursor-pointer hover:scale-110 transition-transform"
                      style={{
                        backgroundImage: gp.color3
                          ? `linear-gradient(${gp.angle}deg, ${gp.color1}, ${gp.color2}, ${gp.color3})`
                          : `linear-gradient(${gp.angle}deg, ${gp.color1}, ${gp.color2})`,
                      }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-bold text-[#17243D]">{label('desain.field.warnaTeks', 'Warna Teks')}</span>
            <div className="inline-flex rounded-md bg-white border border-[#DCE5EF] p-0.5">
              <button
                type="button"
                onClick={() =>
                  updateStyle({
                    useThemeTextColor: true,
                    textColor: theme.textColor,
                    themeOverrideTokens: s.themeOverrideTokens
                      ? { ...s.themeOverrideTokens, textColor: false }
                      : undefined,
                  })
                }
                className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                  !isCustomTextColor
                    ? 'bg-[#17243D] text-white'
                    : 'text-[#8FA4BF] hover:text-[#17243D]'
                }`}
              >
                Ikut Template
              </button>
              <button
                type="button"
                onClick={() =>
                  updateStyleWithToken(
                    {
                      useThemeTextColor: false,
                      textColor: s.textColor || theme.textColor,
                    },
                    ['textColor']
                  )
                }
                className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer ${
                  isCustomTextColor
                    ? 'bg-[#17243D] text-white'
                    : 'text-[#8FA4BF] hover:text-[#17243D]'
                }`}
              >
                Kustom
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <input
              type="color"
              value={isCustomTextColor ? s.textColor : theme.textColor}
              onChange={(e) =>
                updateStyleWithToken(
                  { useThemeTextColor: false, textColor: e.target.value },
                  ['textColor']
                )
              }
              className="w-8 h-8 rounded-lg border border-[#DCE5EF] p-0.5 cursor-pointer shrink-0 bg-white"
            />
            <div className="flex items-center gap-1.5 flex-wrap">
              {[
                { color: '#FFFFFF', title: 'Putih' },
                { color: '#0F172A', title: 'Gelap' },
                { color: theme.textColor, title: 'Warna Template' },
                { color: theme.accentColor, title: 'Aksen Tema' },
              ].map((sw, idx) => {
                const activeColor = isCustomTextColor ? s.textColor : theme.textColor;
                return (
                  <button
                    key={`${sw.color}_${idx}`}
                    type="button"
                    title={sw.title}
                    onClick={() =>
                      updateStyleWithToken(
                        { useThemeTextColor: false, textColor: sw.color },
                        ['textColor']
                      )
                    }
                    style={{ backgroundColor: sw.color }}
                    className={`w-6 h-6 rounded-full border border-[#DCE5EF] cursor-pointer ${
                      activeColor.toLowerCase() === sw.color.toLowerCase() && isCustomTextColor
                        ? 'ring-2 ring-[#00C98A] ring-offset-1'
                        : ''
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {isContainerLike && isCustomTextColor && (
            <button
              type="button"
              onClick={() =>
                onUpdateBlock(selectedBlock.id, (blk) => ({
                  ...blk,
                  children: applyInheritToDescendants(blk.children),
                }))
              }
              className="w-full py-1.5 px-2.5 rounded-lg bg-white border border-[#DCE5EF] text-[11px] font-semibold text-[#17243D] hover:border-[#00C98A] cursor-pointer"
            >
              Samakan Semua Teks di Dalam Kartu
            </button>
          )}
        </div>
      </AccordionSection>

      <AccordionSection
        id="border"
        title={label('desain.sec.border', 'Border & Garis Tepi')}
        icon={<Square className="w-3.5 h-3.5" />}
        isOpen={openSections.border}
        onToggle={() => toggleSection('border')}
      >
        <SliderRow
          label={label('desain.field.ketebalanGarisTepi', 'Ketebalan Garis Tepi')}
          value={`${s.borderWidth}px`}
          min={0}
          max={16}
          current={s.borderWidth}
          onChange={(val) => updateStyle({ borderWidth: val })}
        />
        <div className="grid grid-cols-5 gap-1">
          {[0, 1, 2, 4, 6].map((w) => (
            <button
              key={w}
              type="button"
              onClick={() => updateStyle({ borderWidth: w })}
              className={`py-1 rounded border text-[10.5px] font-semibold cursor-pointer ${
                s.borderWidth === w
                  ? 'bg-[#17243D] text-white border-[#17243D]'
                  : 'bg-[#F0F5FA] text-[#17243D] border-[#DCE5EF]'
              }`}
            >
              {w}px
            </button>
          ))}
        </div>
        <div>
          <label className="block text-xs font-semibold text-[#17243D] mb-1">
            {label('desain.field.warnaGarisTepi', 'Warna Garis Tepi')}
          </label>
          <input
            type="color"
            value={s.borderColor}
            onChange={(e) =>
              updateStyleWithToken({ borderColor: e.target.value }, ['borderColor'])
            }
            className="w-full h-8 rounded-lg border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
          />
        </div>
      </AccordionSection>
    </div>
  );
}
