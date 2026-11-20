import { useState, type CSSProperties } from 'react';
import {
  Info,
  LayoutTemplate,
  Maximize2,
  SlidersHorizontal,
  Sparkles,
} from 'lucide-react';
import {
  AdvanceOptions,
  BlockLayoutMode,
  BlockShapePreset,
  BlockStyle,
  BottomSheetTriggerStyle,
  BuilderBlock,
  CarouselAspectRatio,
  CatalogCartButtonSize,
  CategoryScrollMode,
  FloatingCartPosition,
  HeroProfileVariant,
  PageTheme,
} from '../../types/builder';
import { FONT_OPTIONS } from '../../utils/fontHelpers';
import {
  GRADIENT_PRESETS,
  buildLinearGradientCss,
  clampGradientAngle,
} from '../../utils/gradientHelpers';
import { resolveShadowSizePx } from '../../utils/htmlExporter';
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

type DesignSectionId = 'visual' | 'layout' | 'specific';

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
    visual: true,
    layout: true,
    specific: false,
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

  const hasSpecificVisualControls =
    selectedBlock.type !== 'container' &&
    selectedBlock.type !== 'text' &&
    selectedBlock.type !== 'row' &&
    selectedBlock.type !== 'menu_icon' &&
    selectedBlock.type !== 'cart_button' &&
    selectedBlock.type !== 'showcase_card';

  const isProfilePhoto =
    selectedBlock.type === 'image' &&
    (c.imageShape === 'circle' || selectedBlock.label.toLowerCase().includes('profil'));

  const currentShapePreset: BlockShapePreset =
    selectedBlock.type === 'menu_icon'
      ? (c.menuIconShape ?? s.shapePreset ?? 'circle')
      : s.shapePreset ??
        (selectedBlock.type === 'image' && c.imageShape === 'circle'
          ? 'circle'
          : s.borderRadius === 0
          ? 'square'
          : s.borderRadius >= 999
          ? 'pill'
          : 'rounded');

  const applyShapePreset = (nextShape: BlockShapePreset) => {
    const nextRadius =
      nextShape === 'square'
        ? 0
        : nextShape === 'rounded'
        ? Math.max(8, Math.min(48, s.borderRadius === 0 || s.borderRadius >= 999 ? 16 : s.borderRadius))
        : s.borderRadius;

    onUpdateBlock(selectedBlock.id, (blk) => {
      const nextContent = { ...blk.content };
      if (blk.type === 'menu_icon') {
        nextContent.menuIconShape = nextShape;
        if (nextShape === 'rounded' && (nextContent.menuIconRadius === undefined || nextContent.menuIconRadius === 0)) {
          nextContent.menuIconRadius = 14;
        }
      } else if (blk.type === 'image') {
        nextContent.imageShape = nextShape === 'circle' ? 'circle' : 'rect';
      }
      return {
        ...blk,
        style: {
          ...blk.style,
          shapePreset: nextShape,
          borderRadius: nextRadius,
        },
        content: nextContent,
      };
    });
  };

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

      case 'row':
        return null;

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

      case 'menu_icon':
        return null;

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
              </div>
            )}

            <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-1.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-medium text-[#17243D]">
                  {isCircle ? 'Perbesar / Perkecil Foto (Lingkaran)' : 'Perbesar / Perkecil Foto (Zoom)'}
                </span>
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
                max={250}
                step={5}
                value={imageZoom}
                onChange={(e) => updateContent({ imageZoom: Number(e.target.value) })}
                style={rangeProgressStyle(imageZoom, 50, 250)}
                className="w-full cursor-pointer"
              />
            </div>

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
        return null;
    }
  };

  const shadowSizePx = resolveShadowSizePx(s.shadow, s.shadowSize);
  const padTopVal = s.paddingTop ?? s.padding;
  const padBottomVal = s.paddingBottom ?? s.padding;
  const padRightVal = s.paddingRight ?? s.paddingX ?? s.padding;
  const padLeftVal = s.paddingLeft ?? s.paddingX ?? s.padding;
  const marginTopVal = s.marginTop ?? 0;
  const radiusVal =
    selectedBlock.type === 'menu_icon'
      ? Math.max(0, Math.min(48, c.menuIconRadius ?? s.borderRadius ?? 14))
      : Math.max(0, Math.min(48, s.borderRadius));
  const isTransparentBg = s.backgroundColor === 'transparent';

  return (
    <div className="flex-1 overflow-y-auto p-2 space-y-1.5 bg-[#F0F5FA]/50">
      {/* 1. GAYA VISUAL — Unified across ALL components (Gambar 1) */}
      <AccordionSection
        id="visual"
        title={label('desain.sec.visual', 'Gaya Visual')}
        icon={<Sparkles className="w-3.5 h-3.5" />}
        isOpen={openSections.visual}
        onToggle={() => toggleSection('visual')}
      >
        {/* Bentuk: Bulat | Segi Empat | Kotak | Kapsul */}
        <SegmentedControl<BlockShapePreset>
          columns={4}
          value={currentShapePreset}
          onChange={applyShapePreset}
          options={[
            { id: 'circle', label: 'Bulat' },
            { id: 'rounded', label: 'Segi Empat' },
            { id: 'square', label: 'Kotak' },
            { id: 'pill', label: 'Kapsul' },
          ]}
        />

        {/* Preset Wadah Cepat — available for all components */}
        <div className="p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-1.5">
          <div className="text-[11px] font-bold text-[#17243D]">
            Preset Wadah Cepat
          </div>
          <div className="grid grid-cols-2 gap-1.5">
            <button
              type="button"
              onClick={() =>
                updateStyleWithToken(
                  {
                    shapePreset: 'rounded',
                    backgroundMode: 'solid',
                    backgroundColor: '#FFFFFF',
                    borderRadius: 16,
                    borderWidth: 1,
                    borderColor: '#E2E8F0',
                    shadow: 'sm',
                    shadowSize: 8,
                    hoverLift: true,
                    useThemeTextColor: false,
                    textColor: '#0F172A',
                  },
                  ['backgroundColor', 'textColor', 'borderColor']
                )
              }
              className="py-1.5 px-2 rounded-lg bg-white border border-[#DCE5EF] hover:border-[#00C98A] text-[10.5px] font-semibold text-[#17243D] cursor-pointer"
            >
              Kartu Bersih + Lift
            </button>
            <button
              type="button"
              onClick={() =>
                updateStyleWithToken(
                  {
                    shapePreset: 'rounded',
                    backgroundMode: 'gradient',
                    gradientColor1: '#EA580C',
                    gradientColor2: '#9A3412',
                    gradientAngle: 135,
                    borderRadius: 20,
                    borderWidth: 0,
                    shadow: 'md',
                    shadowSize: 20,
                    hoverLift: true,
                    useThemeTextColor: false,
                    textColor: '#FFFFFF',
                  },
                  ['backgroundColor', 'textColor']
                )
              }
              className="py-1.5 px-2 rounded-lg text-[10.5px] font-semibold text-white cursor-pointer"
              style={{ backgroundImage: 'linear-gradient(135deg, #EA580C, #9A3412)' }}
            >
              Box Promo Gradasi
            </button>
          </div>
        </div>

        {/* Latar & Gradasi */}
        <div className="p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-bold text-[#17243D]">
              {label('desain.field.latarGradasi', 'Latar & Gradasi')}
            </span>
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
            <div className="flex items-center justify-between gap-2">
              <label className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#17243D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={isTransparentBg}
                  onChange={(e) =>
                    updateStyleWithToken(
                      { backgroundColor: e.target.checked ? 'transparent' : theme.cardBg || '#FFFFFF' },
                      ['backgroundColor']
                    )
                  }
                  className="accent-[#17243D] rounded cursor-pointer"
                />
                <span>Transparan</span>
              </label>
              {!isTransparentBg && (
                <div className="flex items-center gap-1.5">
                  <input
                    type="color"
                    value={s.backgroundColor === 'transparent' ? '#ffffff' : s.backgroundColor}
                    onChange={(e) =>
                      updateStyleWithToken({ backgroundColor: e.target.value }, ['backgroundColor'])
                    }
                    className="w-7 h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                  />
                  <span className="font-mono text-[10px] text-[#51637D] uppercase">
                    {s.backgroundColor}
                  </span>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div
                className="w-full h-6 rounded-lg border border-[#DCE5EF]"
                style={{
                  backgroundImage:
                    buildLinearGradientCss(s) ||
                    'linear-gradient(135deg, #EA580C 0%, #9A3412 100%)',
                }}
              />
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="block text-[10px] font-medium text-[#8FA4BF] mb-0.5">
                    Warna 1
                  </label>
                  <input
                    type="color"
                    value={s.gradientColor1 || '#EA580C'}
                    onChange={(e) =>
                      updateStyleWithToken({ gradientColor1: e.target.value }, ['backgroundColor'])
                    }
                    className="w-full h-6 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#8FA4BF] mb-0.5">
                    Warna 2
                  </label>
                  <input
                    type="color"
                    value={s.gradientColor2 || '#9A3412'}
                    onChange={(e) =>
                      updateStyleWithToken({ gradientColor2: e.target.value }, ['backgroundColor'])
                    }
                    className="w-full h-6 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-medium text-[#8FA4BF] mb-0.5">
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
                        className="w-full h-6 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
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
                      className="w-full h-6 rounded border border-dashed border-[#DCE5EF] bg-white text-[10px] font-semibold text-[#8FA4BF] hover:text-[#17243D] cursor-pointer"
                    >
                      + Warna 3
                    </button>
                  )}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-medium text-[#17243D]">Sudut Gradasi</span>
                  <span className="font-mono text-[10.5px] font-semibold text-[#17243D] tabular-nums">
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
                    className="w-5 h-5 rounded-full border border-white shadow-xs cursor-pointer hover:scale-110 transition-transform"
                    style={{
                      backgroundImage: gp.color3
                        ? `linear-gradient(${gp.angle}deg, ${gp.color1}, ${gp.color2}, ${gp.color3})`
                        : `linear-gradient(${gp.angle}deg, ${gp.color1}, ${gp.color2})`,
                    }}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Lengkung Sudut */}
        <SliderRow
          label={label('desain.field.lengkungSudut', 'Lengkung Sudut')}
          value={`${radiusVal}px`}
          min={0}
          max={48}
          current={radiusVal}
          onChange={(val) => {
            onUpdateBlock(selectedBlock.id, (blk) => {
              const nextContent =
                blk.type === 'menu_icon'
                  ? { ...blk.content, menuIconShape: 'rounded' as const, menuIconRadius: val }
                  : blk.content;
              return {
                ...blk,
                style: {
                  ...blk.style,
                  borderRadius: val,
                  shapePreset: val === 0 ? 'square' : 'rounded',
                },
                content: nextContent,
              };
            });
          }}
        />

        {/* Efek Kaca (Blur) */}
        <SliderRow
          label={label('desain.field.efekKaca', 'Efek Kaca (Blur)')}
          value={`${s.blur}px`}
          min={0}
          max={24}
          current={s.blur}
          onChange={(val) => updateStyle({ blur: val })}
        />

        {/* Efek Bayangan (Shadow) Slider + Warna Shadow */}
        <div className="space-y-1.5">
          <SliderRow
            label={label('desain.field.efekBayangan', 'Efek Bayangan (Shadow)')}
            value={`${shadowSizePx}px`}
            min={0}
            max={48}
            current={shadowSizePx}
            onChange={(val) =>
              updateStyle({
                shadowSize: val,
                shadow: val === 0 ? 'none' : val <= 12 ? 'sm' : val <= 28 ? 'md' : 'lg',
              })
            }
          />
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-medium text-[#51637D]">Warna Shadow</span>
            <div className="flex items-center gap-1.5">
              <input
                type="color"
                value={s.shadowColor || '#0F172A'}
                onChange={(e) => updateStyle({ shadowColor: e.target.value })}
                className="w-7 h-6 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
              />
              {s.shadowColor && (
                <button
                  type="button"
                  onClick={() => updateStyle({ shadowColor: undefined })}
                  className="px-1.5 py-0.5 rounded border border-[#DCE5EF] text-[10px] font-semibold text-[#17243D] hover:bg-[#F0F5FA] cursor-pointer"
                >
                  Default
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Efek Hover Lift */}
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
          <div>
            <div className="text-[11px] font-semibold text-[#17243D]">
              {label('desain.field.efekHoverLift', 'Efek Hover Lift')}
            </div>
            <div className="text-[10px] text-[#8FA4BF]">Terangkat halus saat disentuh</div>
          </div>
          <ToggleSwitch
            checked={Boolean(s.hoverLift)}
            onChange={(checked) => updateStyle({ hoverLift: checked })}
            label="Efek Kartu Dinamis"
          />
        </div>

        {/* Ketebalan Garis Tepi + Quick 0/1/2/4/6px + Warna Garis Tepi */}
        <div className="space-y-1.5 pt-1 border-t border-[#DCE5EF]">
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
            <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
              {label('desain.field.warnaGarisTepi', 'Warna Garis Tepi')}
            </label>
            <input
              type="color"
              value={s.borderColor}
              onChange={(e) =>
                updateStyleWithToken({ borderColor: e.target.value }, ['borderColor'])
              }
              className="w-full h-7 rounded-lg border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
            />
          </div>
        </div>
      </AccordionSection>

      {/* 2. LAYOUT & SPASI — Unified across ALL components (Gambar 1) */}
      <AccordionSection
        id="layout"
        title={label('desain.sec.layout', 'Layout & Spasi')}
        icon={<Maximize2 className="w-3.5 h-3.5" />}
        isOpen={openSections.layout}
        onToggle={() => toggleSection('layout')}
      >
        <div className="p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-1.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-[#17243D] flex items-center gap-1.5">
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
              onClick={() => updateStyle({ borderRadius: 0, shapePreset: 'square' })}
              className="px-2 py-0.5 rounded bg-white border border-[#DCE5EF] text-[10px] font-semibold text-[#17243D] hover:border-[#00C98A] cursor-pointer"
            >
              Sudut 0px
            </button>
          )}
        </div>

        {/* Padding Atas */}
        <SliderRow
          label="Padding Atas"
          value={`${padTopVal}px`}
          min={0}
          max={48}
          current={padTopVal}
          onChange={(val) => updateStyle({ paddingTop: val })}
        />

        {/* Padding Bawah + 0px */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-medium text-[#17243D]">Padding Bawah</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateStyle({ paddingBottom: 0 })}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                  padBottomVal === 0
                    ? 'bg-[#17243D] text-white border-[#17243D]'
                    : 'bg-white text-[#17243D] border-[#DCE5EF]'
                }`}
              >
                0px
              </button>
              <span className="font-mono text-[10.5px] font-semibold text-[#17243D] tabular-nums">
                {padBottomVal}px
              </span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={48}
            value={padBottomVal}
            onChange={(e) => updateStyle({ paddingBottom: Number(e.target.value) })}
            style={rangeProgressStyle(padBottomVal, 0, 48)}
            className="w-full cursor-pointer"
          />
        </div>

        {/* Padding Kanan + 0px */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-medium text-[#17243D]">Padding Kanan</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateStyle({ paddingRight: 0 })}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                  padRightVal === 0
                    ? 'bg-[#17243D] text-white border-[#17243D]'
                    : 'bg-white text-[#17243D] border-[#DCE5EF]'
                }`}
              >
                0px
              </button>
              <span className="font-mono text-[10.5px] font-semibold text-[#17243D] tabular-nums">
                {padRightVal}px
              </span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={48}
            value={padRightVal}
            onChange={(e) => updateStyle({ paddingRight: Number(e.target.value) })}
            style={rangeProgressStyle(padRightVal, 0, 48)}
            className="w-full cursor-pointer"
          />
        </div>

        {/* Padding Kiri + 0px */}
        <div>
          <div className="flex items-center justify-between text-[11px] mb-1">
            <span className="font-medium text-[#17243D]">Padding Kiri</span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => updateStyle({ paddingLeft: 0 })}
                className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border cursor-pointer ${
                  padLeftVal === 0
                    ? 'bg-[#17243D] text-white border-[#17243D]'
                    : 'bg-white text-[#17243D] border-[#DCE5EF]'
                }`}
              >
                0px
              </button>
              <span className="font-mono text-[10.5px] font-semibold text-[#17243D] tabular-nums">
                {padLeftVal}px
              </span>
            </div>
          </div>
          <input
            type="range"
            min={0}
            max={48}
            value={padLeftVal}
            onChange={(e) => updateStyle({ paddingLeft: Number(e.target.value) })}
            style={rangeProgressStyle(padLeftVal, 0, 48)}
            className="w-full cursor-pointer"
          />
        </div>

        {/* Jarak Atas (Margin) */}
        <SliderRow
          label="Jarak Atas (Margin)"
          value={`${marginTopVal}px`}
          min={0}
          max={64}
          current={marginTopVal}
          onChange={(val) => updateStyle({ marginTop: val })}
        />

        {/* Jarak Bawah (Margin) */}
        <SliderRow
          label={label('desain.field.jarakBawah', 'Jarak Bawah (Margin)')}
          value={`${s.marginBottom}px`}
          min={0}
          max={64}
          current={s.marginBottom}
          onChange={(val) => updateStyle({ marginBottom: val })}
        />

        {/* Lebar Elemen, Tinggi Minimal & Tinggi Maksimal (Besar/Kecil Kartu & Box) */}
        <div className="pt-1.5 border-t border-[#DCE5EF] space-y-2">
          <div className="space-y-1">
            <SliderRow
              label={label('desain.field.lebarElemen', 'Lebar Elemen / Kartu')}
              value={`${s.widthPercent}%`}
              min={20}
              max={100}
              current={s.widthPercent}
              onChange={(val) =>
                updateStyle({ widthPercent: val, fullBleed: val < 100 ? false : s.fullBleed })
              }
            />
            <div className="grid grid-cols-4 gap-1">
              {[50, 75, 90, 100].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() =>
                    updateStyle({ widthPercent: pct, fullBleed: pct < 100 ? false : s.fullBleed })
                  }
                  className={`py-0.5 rounded border text-[10px] font-semibold cursor-pointer tabular-nums ${
                    s.widthPercent === pct
                      ? 'bg-[#17243D] text-white border-[#17243D]'
                      : 'bg-white text-[#17243D] border-[#DCE5EF]'
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>
          </div>
          <SliderRow
            label={label('desain.field.tinggiMinimal', 'Tinggi Minimal')}
            value={s.minHeight > 0 ? `${s.minHeight}px` : 'Auto'}
            min={0}
            max={600}
            current={s.minHeight}
            onChange={(val) => updateStyle({ minHeight: val })}
          />
          <SliderRow
            label="Tinggi Maksimal"
            value={s.maxHeight && s.maxHeight > 0 ? `${s.maxHeight}px` : 'Auto'}
            min={0}
            max={600}
            current={s.maxHeight ?? 0}
            onChange={(val) => updateStyle({ maxHeight: val > 0 ? val : undefined })}
          />
        </div>
      </AccordionSection>

      {/* 3. PENGATURAN KHUSUS KOMPONEN — only when component has extra design settings */}
      {hasSpecificVisualControls && (
        <AccordionSection
          id="specific"
          title={label('desain.sec.specific', 'Pengaturan Khusus Komponen')}
          icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
          isOpen={openSections.specific}
          onToggle={() => toggleSection('specific')}
        >
          {renderSpecificControls()}
        </AccordionSection>
      )}
    </div>
  );
}
