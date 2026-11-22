import { useEffect, useState, type CSSProperties } from 'react';
import {
  AlignCenter,
  AlignLeft,
  AlignRight,
  Info,
  LayoutTemplate,
  Maximize2,
  Minus,
  Monitor,
  Plus,
  RotateCcw,
  SlidersHorizontal,
  Smartphone,
  Sparkles,
  Tablet,
} from 'lucide-react';
import { DEFAULT_STYLE, createId } from '../../data/presets';
import {
  AdvanceOptions,
  BlockLayoutMode,
  BlockShapePreset,
  BlockStyle,
  BottomNavbarConfig,
  BottomSheetTriggerStyle,
  BuilderBlock,
  BuilderSubPage,
  CarouselAspectRatio,
  CatalogCartButtonSize,
  CategoryScrollMode,
  FloatingCartPosition,
  HeroProfileVariant,
  PageTheme,
  ResponsiveStyleOverride,
  ViewportBreakpoint,
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
import { resolveProjectFloatingCartConfig } from '../../utils/universalLayerHelpers';
import { DesignSectionKey, ExtractedSubLayer } from '../../utils/layerStructure';
import { getBlockDesignCapabilities } from '../../utils/inspectorCapabilities';
import {
  clearResponsiveOverride,
  countResponsiveOverrides,
  getResponsiveOverrideForBreakpoint,
  patchResponsiveOverride,
} from '../../utils/responsiveStyle';
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
  selectedSubLayer?: ExtractedSubLayer | null;
  onSelectSubLayer?: (blockId: string, subLayerId: string | null) => void;
  onClearSubLayer?: () => void;
  allBlocks?: BuilderBlock[];
  pages?: BuilderSubPage[];
  bottomNavbar?: BottomNavbarConfig;
  onSelectBlock?: (id: string) => void;
  activeViewportBreakpoint?: ViewportBreakpoint;
  onChangeViewportBreakpoint?: (bp: ViewportBreakpoint) => void;
  theme: PageTheme;
  advanceOptions: AdvanceOptions;
  onUpdateAdvanceOptions: (patch: Partial<AdvanceOptions>) => void;
  onUpdateBlock: (id: string, updater: (block: BuilderBlock) => BuilderBlock) => void;
}

type DesignSectionId = DesignSectionKey | 'responsive';

function rangeProgressStyle(current: number, min: number, max: number): CSSProperties {
  const span = max - min;
  const pct = span > 0 ? Math.max(0, Math.min(100, ((current - min) / span) * 100)) : 0;
  return {
    background: `linear-gradient(to right, #94A3B8 0%, #94A3B8 ${pct}%, #E2E8F0 ${pct}%, #E2E8F0 100%)`,
  };
}

function PhotoScaleControl({
  label,
  value,
  onChange,
  hint,
}: {
  label: string;
  value?: number;
  onChange: (nextScale: number) => void;
  hint?: string;
}) {
  const safeVal =
    typeof value === 'number' && Number.isFinite(value)
      ? Math.max(50, Math.min(250, Math.round(value)))
      : 100;
  const stepBy = (delta: number) => {
    const next = Math.max(50, Math.min(250, safeVal + delta));
    onChange(next);
  };
  return (
    <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-1.5">
      <div className="flex items-center justify-between gap-2 text-[11px]">
        <span className="font-semibold text-[#17243D] leading-tight">{label}</span>
        <div className="flex items-center gap-1 shrink-0">
          {safeVal !== 100 && (
            <button
              type="button"
              onClick={() => onChange(100)}
              title="Reset ke 100%"
              className="px-1.5 py-0.5 rounded bg-white border border-[#DCE5EF] text-[10px] font-semibold text-[#17243D] hover:bg-[#F8FAFC] cursor-pointer"
            >
              100%
            </button>
          )}
          <span className="font-mono text-[11px] font-semibold text-[#17243D] tabular-nums min-w-[36px] text-right">
            {safeVal}%
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <button
          type="button"
          onClick={() => stepBy(-5)}
          disabled={safeVal <= 50}
          title="Perkecil foto (-5%)"
          className="w-6 h-6 rounded-md border border-[#DCE5EF] bg-white text-[#17243D] hover:bg-[#F8FAFC] disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer"
        >
          <Minus className="w-3 h-3" />
        </button>
        <input
          type="range"
          min={50}
          max={250}
          step={5}
          value={safeVal}
          onChange={(e) => onChange(Number(e.target.value))}
          style={rangeProgressStyle(safeVal, 50, 250)}
          className="w-full cursor-pointer"
        />
        <button
          type="button"
          onClick={() => stepBy(5)}
          disabled={safeVal >= 250}
          title="Perbesar foto (+5%)"
          className="w-6 h-6 rounded-md border border-[#DCE5EF] bg-white text-[#17243D] hover:bg-[#F8FAFC] disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer"
        >
          <Plus className="w-3 h-3" />
        </button>
      </div>
      {hint && <div className="text-[10px] text-[#51637D] leading-snug">{hint}</div>}
    </div>
  );
}

export function BlockDesignTab({
  selectedBlock,
  selectedSubLayer = null,
  onSelectSubLayer,
  onClearSubLayer,
  allBlocks = [],
  pages = [],
  bottomNavbar,
  onSelectBlock,
  activeViewportBreakpoint = 'desktop',
  onChangeViewportBreakpoint,
  theme,
  advanceOptions,
  onUpdateAdvanceOptions,
  onUpdateBlock,
}: BlockDesignTabProps) {
  const { label, isVisible } = useUiLabel();
  const caps = getBlockDesignCapabilities(selectedBlock.type, selectedSubLayer?.id);

  const isShowcaseSubLayer =
    selectedBlock.type === 'showcase_card' && Boolean(selectedSubLayer?.id);
  const hasSpecificVisualControls =
    selectedBlock.type !== 'container' &&
    selectedBlock.type !== 'text' &&
    selectedBlock.type !== 'cart_button';

  const resolveDefaultOpenSection = (): DesignSectionId => {
    if (selectedSubLayer) {
      if (selectedBlock.type === 'button' && selectedSubLayer.id === 'button_text') {
        return 'typo';
      }
      if (selectedBlock.type === 'button' && selectedSubLayer.id === 'button_icon') {
        return 'specific';
      }
      if (isShowcaseSubLayer) {
        return 'specific';
      }
      const firstAllowed = selectedSubLayer.designSections[0];
      if (firstAllowed) return firstAllowed;
    }
    if (hasSpecificVisualControls) return 'specific';
    if (caps.showTypographyAccordion && selectedBlock.type === 'text') return 'typo';
    if (caps.showVisualAccordion) return 'visual';
    return 'layout';
  };

  // Single-Accordion Discipline: hanya 1 grup desain terbuka dalam satu waktu
  const [activeOpenSection, setActiveOpenSection] = useState<DesignSectionId | null>(
    resolveDefaultOpenSection
  );
  const [editingBreakpoint, setEditingBreakpoint] = useState<ViewportBreakpoint>(
    activeViewportBreakpoint
  );

  useEffect(() => {
    setEditingBreakpoint(activeViewportBreakpoint);
  }, [activeViewportBreakpoint]);

  useEffect(() => {
    setActiveOpenSection(resolveDefaultOpenSection());
  }, [selectedBlock.id, selectedSubLayer?.id]);

  const isDesignSectionAllowed = (sec: DesignSectionId) =>
    !selectedSubLayer || selectedSubLayer.designSections.includes(sec);

  const toggleSection = (id: DesignSectionId) => {
    setActiveOpenSection((prev) => (prev === id ? null : id));
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

  const updateSubLayerStyle = (subId: string, patch: Partial<BlockStyle>) => {
    onUpdateBlock(selectedBlock.id, (blk) => {
      if (blk.type === 'button' && subId === 'button_icon') {
        return {
          ...blk,
          content: {
            ...blk.content,
            buttonIconStyle: { ...(blk.content.buttonIconStyle ?? {}), ...patch },
          },
        };
      }
      if (blk.type === 'button' && subId === 'button_text') {
        return {
          ...blk,
          content: {
            ...blk.content,
            buttonTextStyle: { ...(blk.content.buttonTextStyle ?? {}), ...patch },
          },
        };
      }
      const prevMap = blk.content.subLayerStyles ?? {};
      return {
        ...blk,
        content: {
          ...blk.content,
          subLayerStyles: {
            ...prevMap,
            [subId]: { ...(prevMap[subId] ?? {}), ...patch },
          },
        },
      };
    });
  };

  const resetSubLayerStyle = (subId: string) => {
    onUpdateBlock(selectedBlock.id, (blk) => {
      if (blk.type === 'button' && subId === 'button_icon') {
        return {
          ...blk,
          content: {
            ...blk.content,
            buttonIconSize: undefined,
            buttonIconColor: undefined,
            buttonIconStrokeWidth: undefined,
            buttonIconStyle: undefined,
          },
        };
      }
      if (blk.type === 'button' && subId === 'button_text') {
        return {
          ...blk,
          content: {
            ...blk.content,
            buttonTextStyle: undefined,
          },
        };
      }
      const nextMap = { ...(blk.content.subLayerStyles ?? {}) };
      delete nextMap[subId];
      return {
        ...blk,
        content: {
          ...blk.content,
          subLayerStyles: Object.keys(nextMap).length > 0 ? nextMap : undefined,
        },
      };
    });
  };

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
        : nextShape === 'pill' || nextShape === 'circle'
        ? 9999
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
        const subId = selectedSubLayer?.id;
        const showCoverPart = !subId || subId === 'hero_cover';
        const showAvatarPart = !subId || subId === 'hero_avatar' || subId === 'hero_profile_card';
        const showCardPart = !subId || subId === 'hero_profile_card';

        return (
          <div className="space-y-3">
            {showCoverPart && (
              <>
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
                    <PhotoScaleControl
                      label="Scale Foto Cover (Bingkai)"
                      value={c.heroCoverZoom ?? 100}
                      onChange={(val) => updateContent({ heroCoverZoom: val })}
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
              </>
            )}

            {showAvatarPart && (
              <>
                <SliderRow
                  label={label('desain.field.ukuranLingkaranLogo', 'Ukuran Lingkaran Logo')}
                  value={`${c.heroLogoSize ?? 72}px`}
                  min={40}
                  max={140}
                  current={c.heroLogoSize ?? 72}
                  onChange={(val) => updateContent({ heroLogoSize: val })}
                />
                <PhotoScaleControl
                  label="Scale Foto Logo (Bentuk Bulat)"
                  value={c.heroLogoZoom ?? 100}
                  onChange={(val) => updateContent({ heroLogoZoom: val })}
                />
              </>
            )}
            {showCardPart && (
              <>
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
              </>
            )}
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
                      <option value="bottom-left">Melayang Kiri Bawah</option>
                      <option value="bottom-right">Melayang Kanan Bawah</option>
                      <option value="top-floating">Melayang Atas Penuh</option>
                      <option value="top-left">Melayang Kiri Atas</option>
                      <option value="top-right">Melayang Kanan Atas</option>
                    </select>
                  </div>
                  {(() => {
                    const globalCart = resolveProjectFloatingCartConfig(
                      allBlocks,
                      bottomNavbar?.items,
                      pages
                    );
                    if (!globalCart || globalCart.totalSources <= 1) return null;
                    const isPrimary = globalCart.sourceBlockId === selectedBlock.id;
                    return (
                      <div
                        className={`p-2 rounded-lg border text-[10px] leading-relaxed ${
                          isPrimary
                            ? 'bg-[#ECFDF6] border-[#00C98A]/40 text-[#0F5132]'
                            : 'bg-amber-50 border-amber-200 text-amber-900'
                        }`}
                      >
                        {isPrimary ? (
                          <span>
                            Pengendali aktif Floating Cart global ({globalCart.totalSources} komponen keranjang terdeteksi).
                          </span>
                        ) : (
                          <div className="space-y-1">
                            <div>
                              Floating Cart global saat ini dikendalikan oleh <strong>{globalCart.sourceBlockLabel}</strong>.
                            </div>
                            {onSelectBlock && (
                              <button
                                type="button"
                                onClick={() => onSelectBlock(globalCart.sourceBlockId)}
                                className="underline font-bold cursor-pointer"
                              >
                                Buka komponen pengendali
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })()}
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
            <PhotoScaleControl
              label="Scale Foto Menu (Kartu)"
              value={c.imageZoom ?? 100}
              onChange={(val) => updateContent({ imageZoom: val })}
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

      case 'catalog':
        return (
          <div className="space-y-3.5">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[#17243D]">
                  <span>Tampilkan Jumlah Terjual</span>
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
                label="Tampilkan jumlah terjual pada detail produk"
              />
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#17243D]">{label('desain.field.tampilanKatalog', 'Tata Letak Katalog')}</div>
              <div className="grid grid-cols-2 gap-2">
                {(
                  [
                    { id: 'default', label: 'Bawaan' },
                    { id: 'grid', label: 'Kisi (Grid)' },
                    { id: 'large-image', label: 'Gambar Besar' },
                    { id: 'compact', label: 'Ringkas' },
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

            <PhotoScaleControl
              label="Scale Foto Produk (Kartu)"
              value={c.imageZoom ?? 100}
              onChange={(val) => updateContent({ imageZoom: val })}
            />
          </div>
        );

      case 'training_catalog':
        return (
          <div className="space-y-3">
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

            <PhotoScaleControl
              label="Scale Foto Pelatihan (Bingkai)"
              value={c.imageZoom ?? 100}
              onChange={(val) => updateContent({ imageZoom: val })}
            />
          </div>
        );

      case 'carousel': {
        const activeRatio = c.carouselAspectRatio ?? '4/5';
        const customHeightPx = Math.max(120, Math.min(720, c.carouselHeightPx ?? 320));
        const customWidthPx = Math.max(0, Math.min(640, c.carouselWidthPx ?? 0));
        const dotsVisible = c.carouselShowDots !== false;
        const dotsPos = c.carouselDotsPosition ?? 'below';
        const RATIO_OPTIONS: Array<{ value: CarouselAspectRatio; label: string }> = [
          { value: '1/1', label: '1:1' },
          { value: '4/5', label: '4:5' },
          { value: '3/4', label: '3:4' },
          { value: '4/3', label: '4:3' },
          { value: '3/2', label: '3:2' },
          { value: '16/9', label: '16:9' },
          { value: '9/16', label: '9:16' },
          { value: '21/9', label: '21:9' },
          { value: 'custom', label: 'Kustom (px)' },
        ];
        return (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-[#17243D] mb-1.5">
                Ukuran / Rasio Foto
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {RATIO_OPTIONS.map((opt) => (
                  <button
                    key={opt.value}
                    type="button"
                    onClick={() => updateContent({ carouselAspectRatio: opt.value })}
                    className={`py-1.5 px-1 rounded-lg text-[11px] font-semibold border cursor-pointer tabular-nums ${
                      activeRatio === opt.value
                        ? 'bg-[#17243D] text-white border-[#17243D]'
                        : 'bg-white text-[#17243D] border-[#DCE5EF] hover:bg-[#F0F5FA]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>

            {activeRatio === 'custom' && (
              <div className="p-2.5 rounded-lg bg-[#F8FBFE] border border-[#DCE5EF] space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#17243D]">
                    Tinggi Foto (px)
                  </span>
                  <div className="inline-flex items-center gap-1">
                    <input
                      type="number"
                      min={120}
                      max={720}
                      step={10}
                      value={customHeightPx}
                      onChange={(e) => {
                        const n = Number(e.target.value);
                        if (!Number.isNaN(n)) {
                          updateContent({
                            carouselHeightPx: Math.max(120, Math.min(720, Math.round(n))),
                          });
                        }
                      }}
                      className="w-16 px-1.5 py-0.5 text-[11px] font-bold text-right rounded border border-[#DCE5EF] bg-white tabular-nums outline-none focus:border-[#00C98A]"
                    />
                    <span className="text-[10px] font-semibold text-[#64748B]">px</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={120}
                  max={720}
                  step={10}
                  value={customHeightPx}
                  onChange={(e) =>
                    updateContent({ carouselHeightPx: Number(e.target.value) })
                  }
                  className="w-full accent-[#00C98A]"
                />
                <div className="grid grid-cols-3 gap-1">
                  {[180, 240, 300, 360, 420, 500].map((px) => (
                    <button
                      key={px}
                      type="button"
                      onClick={() => updateContent({ carouselHeightPx: px })}
                      className={`py-1 rounded text-[10px] font-semibold border cursor-pointer tabular-nums ${
                        customHeightPx === px
                          ? 'bg-[#17243D] text-white border-[#17243D]'
                          : 'bg-white text-[#475569] border-[#DCE5EF] hover:bg-[#F0F5FA]'
                      }`}
                    >
                      {px}px
                    </button>
                  ))}
                </div>
              </div>
            )}

            <SliderRow
              label="Lebar Foto Maksimal (px)"
              value={customWidthPx > 0 ? `${customWidthPx}px` : 'Penuh (Auto)'}
              min={0}
              max={640}
              step={10}
              current={customWidthPx}
              onChange={(val) =>
                updateContent({ carouselWidthPx: val > 0 && val < 160 ? 160 : val })
              }
            />

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

            <PhotoScaleControl
              label="Scale Foto Galeri (Bingkai)"
              value={c.imageZoom ?? 100}
              onChange={(val) => updateContent({ imageZoom: val })}
            />

            <div className="p-2.5 rounded-lg bg-[#F8FBFE] border border-[#DCE5EF] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#17243D]">
                  Tampilkan Titik Slide (Dots)
                </span>
                <ToggleSwitch
                  checked={dotsVisible}
                  onChange={(v) => updateContent({ carouselShowDots: v })}
                  label="Tampilkan Titik Slide"
                />
              </div>
              {dotsVisible && (
                <div className="space-y-1">
                  <span className="block text-[10.5px] font-semibold text-[#5B708B]">
                    Posisi Titik Slide
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      { id: 'below', label: 'Di Bawah Foto' },
                      { id: 'overlay', label: 'Mengambang di Atas Foto' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateContent({ carouselDotsPosition: opt.id })}
                        className={`py-1.5 px-2 rounded-lg text-[10.5px] font-semibold border cursor-pointer ${
                          dotsPos === opt.id
                            ? 'bg-[#17243D] text-white border-[#17243D]'
                            : 'bg-white text-[#17243D] border-[#DCE5EF] hover:bg-[#F0F5FA]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'social_feed': {
        const feedDotsVisible = c.socialFeedShowDots !== false;
        const feedDotsPos = c.socialFeedDotsPosition ?? 'below';
        return (
          <div className="space-y-3">
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

            <PhotoScaleControl
              label="Scale Foto Postingan (Kartu)"
              value={c.imageZoom ?? 100}
              onChange={(val) => updateContent({ imageZoom: val })}
            />

            <div className="p-2.5 rounded-lg bg-[#F8FBFE] border border-[#DCE5EF] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-semibold text-[#17243D]">
                  Tampilkan Titik Slide (Dots)
                </span>
                <ToggleSwitch
                  checked={feedDotsVisible}
                  onChange={(v) => updateContent({ socialFeedShowDots: v })}
                  label="Tampilkan Titik Slide Postingan"
                />
              </div>
              {feedDotsVisible && (
                <div className="space-y-1">
                  <span className="block text-[10.5px] font-semibold text-[#5B708B]">
                    Posisi Titik Slide
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    {([
                      { id: 'below', label: 'Di Bawah Foto' },
                      { id: 'overlay', label: 'Mengambang di Atas Foto' },
                    ] as const).map((opt) => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => updateContent({ socialFeedDotsPosition: opt.id })}
                        className={`py-1.5 px-2 rounded-lg text-[10.5px] font-semibold border cursor-pointer ${
                          feedDotsPos === opt.id
                            ? 'bg-[#17243D] text-white border-[#17243D]'
                            : 'bg-white text-[#17243D] border-[#DCE5EF] hover:bg-[#F0F5FA]'
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

      case 'maps_place':
        return (
          <div className="space-y-3">
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

            <PhotoScaleControl
              label="Scale Foto Lokasi (Kartu)"
              value={c.imageZoom ?? 100}
              onChange={(val) => updateContent({ imageZoom: val })}
            />
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
        const iconSize = Math.max(36, Math.min(160, c.menuIconSize ?? 64));
        const photoSize = Math.max(16, Math.min(160, c.menuIconImageSize ?? iconSize));
        const fit = c.menuIconImageFit ?? 'cover';
        return (
          <div className="space-y-3">
            <SliderRow
              label="Ukuran Ikon"
              value={`${iconSize}px`}
              min={36}
              max={160}
              step={2}
              current={iconSize}
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

            <div>
              <label className="block text-[11px] font-medium text-[#51637D] mb-1">
                Warna Latar Ikon
              </label>
              <input
                type="color"
                value={c.menuIconBg || theme.accentColor}
                onChange={(e) => updateAccentContent({ menuIconBg: e.target.value })}
                className="w-full h-7 rounded-lg border border-[#DCE5EF] bg-white p-0.5 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] mb-1">
                <span className="font-medium text-[#17243D]">Ukuran Foto (px)</span>
                <div className="flex items-center gap-1.5">
                  {c.menuIconImageSize !== undefined && (
                    <button
                      type="button"
                      onClick={() => updateContent({ menuIconImageSize: undefined })}
                      className="px-1.5 py-0.5 rounded border border-[#DCE5EF] bg-white text-[10px] font-semibold text-[#17243D] cursor-pointer"
                    >
                      Auto
                    </button>
                  )}
                  <span className="font-mono text-[10.5px] font-semibold text-[#17243D] tabular-nums">
                    {c.menuIconImageSize ? `${photoSize}px` : `${iconSize}px`}
                  </span>
                </div>
              </div>
              <input
                type="range"
                min={16}
                max={160}
                step={1}
                value={photoSize}
                onChange={(e) => updateContent({ menuIconImageSize: Number(e.target.value) })}
                style={rangeProgressStyle(photoSize, 16, 160)}
                className="w-full cursor-pointer"
              />
            </div>

            <PhotoScaleControl
              label="Scale Foto di Dalam Bentuk"
              value={c.menuIconImageZoom ?? 100}
              onChange={(val) => updateContent({ menuIconImageZoom: val })}
            />
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
              </div>
            )}

            <PhotoScaleControl
              label={
                isCircle
                  ? 'Scale Foto di Dalam Bentuk (Lingkaran)'
                  : 'Scale Foto di Dalam Bingkai / Bentuk'
              }
              value={imageZoom}
              onChange={(val) => updateContent({ imageZoom: val })}
            />

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

      case 'button': {
        const subId = selectedSubLayer?.id;

        if (subId === 'button_icon') {
          const iconSt = c.buttonIconStyle ?? {};
          const iconSize = c.buttonIconSize ?? 18;
          const iconStroke = c.buttonIconStrokeWidth ?? 2;
          return (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#ECFDF6] border border-[#00C98A]/30">
                <span className="text-[11px] font-bold text-[#008F63]">
                  Desain Layer: Ikon Tombol
                </span>
                <button
                  type="button"
                  onClick={() => resetSubLayerStyle('button_icon')}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#51637D] hover:text-[#17243D] cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>

              <SliderRow
                label="Ukuran Ikon"
                value={`${iconSize}px`}
                min={10}
                max={40}
                step={1}
                current={iconSize}
                onChange={(val) => updateContent({ buttonIconSize: val })}
              />

              <SliderRow
                label="Ketebalan Garis Ikon (Stroke)"
                value={`${iconStroke.toFixed(1)}px`}
                min={1}
                max={3.5}
                step={0.25}
                current={iconStroke}
                onChange={(val) => updateContent({ buttonIconStrokeWidth: val })}
              />

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[#51637D] mb-1">
                    Warna Ikon
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={c.buttonIconColor || c.buttonText || '#FFFFFF'}
                      onChange={(e) => updateContent({ buttonIconColor: e.target.value })}
                      className="w-full h-8 rounded-lg border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                    />
                    {c.buttonIconColor && (
                      <button
                        type="button"
                        onClick={() => updateContent({ buttonIconColor: undefined })}
                        className="px-1.5 py-1 rounded border border-[#DCE5EF] text-[10px] font-semibold text-[#51637D] bg-white cursor-pointer"
                      >
                        Auto
                      </button>
                    )}
                  </div>
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#51637D] mb-1">
                    Latar Wadah Ikon
                  </label>
                  <div className="flex items-center gap-1.5">
                    <input
                      type="color"
                      value={
                        iconSt.backgroundColor && iconSt.backgroundColor !== 'transparent'
                          ? iconSt.backgroundColor
                          : '#000000'
                      }
                      onChange={(e) =>
                        updateSubLayerStyle('button_icon', { backgroundColor: e.target.value })
                      }
                      className="w-full h-8 rounded-lg border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                    />
                    {iconSt.backgroundColor && (
                      <button
                        type="button"
                        onClick={() =>
                          updateSubLayerStyle('button_icon', { backgroundColor: undefined })
                        }
                        className="px-1.5 py-1 rounded border border-[#DCE5EF] text-[10px] font-semibold text-[#51637D] bg-white cursor-pointer"
                      >
                        Clear
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <SliderRow
                label="Padding Wadah Ikon"
                value={`${iconSt.padding ?? 0}px`}
                min={0}
                max={16}
                step={1}
                current={iconSt.padding ?? 0}
                onChange={(val) => updateSubLayerStyle('button_icon', { padding: val })}
              />

              <SliderRow
                label="Sudut Wadah Ikon"
                value={`${iconSt.borderRadius ?? 6}px`}
                min={0}
                max={99}
                step={1}
                current={iconSt.borderRadius ?? 6}
                onChange={(val) => updateSubLayerStyle('button_icon', { borderRadius: val })}
              />

              <SliderRow
                label="Rotasi Ikon"
                value={`${iconSt.transformRotate ?? 0}°`}
                min={-180}
                max={180}
                step={5}
                current={iconSt.transformRotate ?? 0}
                onChange={(val) => updateSubLayerStyle('button_icon', { transformRotate: val })}
              />

              <SliderRow
                label="Transparansi Ikon"
                value={`${iconSt.opacity ?? 100}%`}
                min={10}
                max={100}
                step={5}
                current={iconSt.opacity ?? 100}
                onChange={(val) => updateSubLayerStyle('button_icon', { opacity: val })}
              />
            </div>
          );
        }

        if (subId === 'button_text') {
          const textSt = c.buttonTextStyle ?? {};
          return (
            <div className="space-y-2.5">
              <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#ECFDF6] border border-[#00C98A]/30">
                <span className="text-[11px] font-bold text-[#008F63]">
                  Desain Layer: Teks Tombol
                </span>
                <button
                  type="button"
                  onClick={() => resetSubLayerStyle('button_text')}
                  className="inline-flex items-center gap-1 text-[10px] font-semibold text-[#51637D] hover:text-[#17243D] cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[11px] font-medium text-[#51637D] mb-1">
                    Warna Teks Tombol
                  </label>
                  <input
                    type="color"
                    value={textSt.textColor || c.buttonText || '#FFFFFF'}
                    onChange={(e) => {
                      const col = e.target.value;
                      updateSubLayerStyle('button_text', { textColor: col });
                      updateContent({ buttonText: col });
                    }}
                    className="w-full h-8 rounded-lg border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[#51637D] mb-1">
                    Transparansi Teks
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={100}
                    value={textSt.opacity ?? 100}
                    onChange={(e) =>
                      updateSubLayerStyle('button_text', {
                        opacity: Math.max(10, Math.min(100, Number(e.target.value) || 100)),
                      })
                    }
                    className="w-full h-8 px-2 text-xs rounded-lg border border-[#DCE5EF] bg-white"
                  />
                </div>
              </div>
              <p className="text-[10.5px] text-[#51637D]">
                Atur jenis font, ukuran, ketebalan, miring, dan jarak huruf khusus teks tombol pada bagian <strong>Tipografi</strong> di bawah.
              </p>
            </div>
          );
        }

        // Parent: Wadah Tombol
        type BtnStateKey = 'normal' | 'hover' | 'active' | 'focus' | 'disabled';
        const activeState: BtnStateKey = c.buttonVisualState ?? 'normal';
        const stateStylesMap = c.buttonStateStyles ?? {};
        const currentStatePatch = stateStylesMap[activeState] ?? {};
        const updateStateStyle = (
          patch: Partial<NonNullable<NonNullable<typeof c.buttonStateStyles>[BtnStateKey]>>
        ) => {
          onUpdateBlock(selectedBlock.id, (blk) => {
            const prevStates = blk.content.buttonStateStyles ?? {};
            return {
              ...blk,
              content: {
                ...blk.content,
                buttonStateStyles: {
                  ...prevStates,
                  [activeState]: {
                    ...(prevStates[activeState] ?? {}),
                    ...patch,
                  },
                },
              },
            };
          });
        };

        return (
          <div className="space-y-3">
            {onSelectSubLayer && (
              <div className="p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-1.5">
                <div className="text-[10.5px] font-bold text-[#17243D]">
                  Struktur 3 Layer Tombol
                </div>
                <div className="grid grid-cols-3 gap-1">
                  <button
                    type="button"
                    onClick={() => onSelectSubLayer(selectedBlock.id, null)}
                    className="py-1 px-1.5 rounded bg-[#17243D] text-white text-[10px] font-semibold cursor-pointer"
                  >
                    Wadah
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectSubLayer(selectedBlock.id, 'button_icon')}
                    className="py-1 px-1.5 rounded bg-white border border-[#DCE5EF] hover:border-[#00C98A] text-[#17243D] text-[10px] font-semibold cursor-pointer"
                  >
                    Ikon Tombol
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectSubLayer(selectedBlock.id, 'button_text')}
                    className="py-1 px-1.5 rounded bg-white border border-[#DCE5EF] hover:border-[#00C98A] text-[#17243D] text-[10px] font-semibold cursor-pointer"
                  >
                    Teks Tombol
                  </button>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-[#51637D] mb-1">
                  Warna Latar Tombol
                </label>
                <input
                  type="color"
                  value={c.buttonBg ?? theme.accentColor ?? '#2563EB'}
                  onChange={(e) => updateAccentContent({ buttonBg: e.target.value })}
                  className="w-full h-8 rounded-lg border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                />
              </div>
              <div>
                <label className="block text-[11px] font-medium text-[#51637D] mb-1">
                  Warna Teks &amp; Ikon Default
                </label>
                <input
                  type="color"
                  value={c.buttonText ?? '#FFFFFF'}
                  onChange={(e) => updateContent({ buttonText: e.target.value })}
                  className="w-full h-8 rounded-lg border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                />
              </div>
            </div>

            {/* State Visual Tombol: Normal | Hover | Active | Focus | Disabled */}
            <div className="p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-[11px] font-bold text-[#17243D]">
                  State Interaksi Tombol
                </span>
                {activeState !== 'normal' && currentStatePatch && Object.keys(currentStatePatch).length > 0 && (
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateBlock(selectedBlock.id, (blk) => {
                        const nextStates = { ...(blk.content.buttonStateStyles ?? {}) };
                        delete nextStates[activeState];
                        return {
                          ...blk,
                          content: {
                            ...blk.content,
                            buttonStateStyles:
                              Object.keys(nextStates).length > 0 ? nextStates : undefined,
                          },
                        };
                      })
                    }
                    className="text-[10px] font-semibold text-rose-600 hover:underline cursor-pointer"
                  >
                    Reset State
                  </button>
                )}
              </div>
              <div className="grid grid-cols-5 gap-1">
                {(
                  [
                    { id: 'normal', label: 'Normal' },
                    { id: 'hover', label: 'Hover' },
                    { id: 'active', label: 'Aktif' },
                    { id: 'focus', label: 'Fokus' },
                    { id: 'disabled', label: 'Nonaktif' },
                  ] as const
                ).map((st) => (
                  <button
                    key={st.id}
                    type="button"
                    onClick={() => updateContent({ buttonVisualState: st.id })}
                    className={`py-1 rounded border text-[9.5px] font-semibold cursor-pointer ${
                      activeState === st.id
                        ? 'bg-[#17243D] text-white border-[#17243D]'
                        : 'bg-white text-[#51637D] border-[#DCE5EF] hover:text-[#17243D]'
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>

              {activeState === 'normal' ? (
                <p className="text-[10px] text-[#51637D]">
                  State <strong>Normal</strong> menggunakan Warna Latar &amp; Teks utama di atas. Pilih Hover/Aktif/Fokus/Nonaktif untuk menyesuaikan tampilan saat tombol berinteraksi.
                </p>
              ) : (
                <div className="space-y-2 pt-1">
                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <label className="block text-[9.5px] text-[#51637D] mb-0.5">Latar</label>
                      <input
                        type="color"
                        value={
                          currentStatePatch.bg ||
                          c.buttonBg ||
                          theme.accentColor ||
                          '#2563EB'
                        }
                        onChange={(e) =>
                          updateStateStyle({ bg: e.target.value })
                        }
                        className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 bg-white cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] text-[#51637D] mb-0.5">Teks</label>
                      <input
                        type="color"
                        value={currentStatePatch.textColor || c.buttonText || '#FFFFFF'}
                        onChange={(e) => updateStateStyle({ textColor: e.target.value })}
                        className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 bg-white cursor-pointer"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] text-[#51637D] mb-0.5">Border</label>
                      <input
                        type="color"
                        value={currentStatePatch.borderColor || s.borderColor || '#00C98A'}
                        onChange={(e) => updateStateStyle({ borderColor: e.target.value })}
                        className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 bg-white cursor-pointer"
                      />
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <SliderRow
                      label="Opasitas"
                      value={`${currentStatePatch.opacity ?? (activeState === 'disabled' ? 50 : 100)}%`}
                      min={10}
                      max={100}
                      step={5}
                      current={currentStatePatch.opacity ?? (activeState === 'disabled' ? 50 : 100)}
                      onChange={(val) => updateStateStyle({ opacity: val })}
                    />
                    <SliderRow
                      label="Skala"
                      value={`${currentStatePatch.scale ?? 100}%`}
                      min={85}
                      max={115}
                      step={1}
                      current={currentStatePatch.scale ?? 100}
                      onChange={(val) => updateStateStyle({ scale: val })}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      }

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

      case 'divider': {
        const currentThickness = Math.max(1, Math.min(12, Math.round(c.thickness ?? 1)));
        return (
          <div className="space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-semibold text-[#17243D]">
                  Ketebalan Garis (1–12px)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={1}
                    max={12}
                    value={currentThickness}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (Number.isFinite(val)) {
                        updateContent({ thickness: Math.max(1, Math.min(12, Math.round(val))) });
                      }
                    }}
                    className="w-12 px-1.5 py-0.5 text-[11px] font-mono text-right rounded border border-[#DCE5EF] bg-white"
                  />
                  <span className="text-[10.5px] text-[#51637D] font-mono">px</span>
                </div>
              </div>
              <input
                type="range"
                min={1}
                max={12}
                step={1}
                value={currentThickness}
                onChange={(e) => updateContent({ thickness: Number(e.target.value) })}
                style={rangeProgressStyle(currentThickness, 1, 12)}
                className="w-full cursor-pointer"
              />
            </div>

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
          </div>
        );
      }

      case 'back_button': {
        const currentBackRadius = Math.max(0, Math.min(9999, Math.round(s.borderRadius ?? 12)));
        return (
          <div className="space-y-3">
            <div className="grid grid-cols-3 gap-1.5">
              <div>
                <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                  Warna Latar
                </label>
                <input
                  type="color"
                  value={c.backButtonBg ?? '#F1F5F9'}
                  onChange={(e) => updateAccentContent({ backButtonBg: e.target.value })}
                  className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                  Warna Teks
                </label>
                <input
                  type="color"
                  value={c.backButtonText ?? '#0F172A'}
                  onChange={(e) => updateContent({ backButtonText: e.target.value })}
                  className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                />
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                  Warna Ikon
                </label>
                <input
                  type="color"
                  value={c.backButtonIconColor ?? c.backButtonText ?? '#0F172A'}
                  onChange={(e) => updateContent({ backButtonIconColor: e.target.value })}
                  className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 cursor-pointer bg-white"
                />
              </div>
            </div>

            <SliderRow
              label="Ukuran Teks & Ikon"
              value={`${s.fontSize ?? 13}px`}
              min={11}
              max={24}
              current={s.fontSize ?? 13}
              onChange={(val) => updateStyle({ fontSize: val })}
            />

            <div className="p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2">
              <div className="flex items-center justify-between gap-2">
                <label className="text-[11px] font-semibold text-[#17243D]">
                  Radius Sudut (0–9999px)
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    max={9999}
                    value={currentBackRadius}
                    onChange={(e) => {
                      const val = Number(e.target.value);
                      if (Number.isFinite(val)) {
                        const clamped = Math.max(0, Math.min(9999, Math.round(val)));
                        updateStyle({
                          borderRadius: clamped,
                          shapePreset: clamped === 0 ? 'square' : clamped >= 999 ? 'pill' : 'rounded',
                        });
                      }
                    }}
                    className="w-16 px-1.5 py-0.5 text-[11px] font-mono text-right rounded border border-[#DCE5EF] bg-white"
                  />
                  <span className="text-[10px] text-[#51637D] font-mono">px</span>
                </div>
              </div>
              <div className="grid grid-cols-4 gap-1">
                {[
                  { label: '0px', val: 0, shape: 'square' as BlockShapePreset },
                  { label: '12px', val: 12, shape: 'rounded' as BlockShapePreset },
                  { label: '28px', val: 28, shape: 'rounded' as BlockShapePreset },
                  { label: 'Kapsul', val: 9999, shape: 'pill' as BlockShapePreset },
                ].map((opt) => (
                  <button
                    key={opt.val}
                    type="button"
                    onClick={() => updateStyle({ borderRadius: opt.val, shapePreset: opt.shape })}
                    className={`py-1 rounded border text-[10px] font-semibold cursor-pointer tabular-nums ${
                      currentBackRadius === opt.val
                        ? 'bg-[#17243D] text-white border-[#17243D]'
                        : 'bg-white text-[#17243D] border-[#DCE5EF]'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        );
      }

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
        const currentZoom =
          typeof c.videoZoom === 'number' && Number.isFinite(c.videoZoom)
            ? Math.max(50, Math.min(350, Math.round(c.videoZoom)))
            : 100;
        const setZoom = (val: number) =>
          updateContent({ videoZoom: Math.max(50, Math.min(350, Math.round(val))) });
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

            <div className="p-2.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2">
              <div className="flex items-center justify-between gap-2 text-[11px]">
                <span className="font-semibold text-[#17243D] leading-tight">
                  Zoom / Scale Video (Manual)
                </span>
                <div className="flex items-center gap-1 shrink-0">
                  {currentZoom !== 100 && (
                    <button
                      type="button"
                      onClick={() => setZoom(100)}
                      title="Reset ke 100%"
                      className="px-1.5 py-0.5 rounded bg-white border border-[#DCE5EF] text-[10px] font-semibold text-[#17243D] hover:bg-[#F8FAFC] cursor-pointer"
                    >
                      Reset
                    </button>
                  )}
                  <input
                    type="number"
                    min={50}
                    max={350}
                    step={5}
                    value={currentZoom}
                    onChange={(e) => {
                      const n = Number(e.target.value);
                      if (!Number.isNaN(n)) setZoom(n);
                    }}
                    className="w-14 px-1.5 py-0.5 text-[11px] font-mono font-semibold text-right rounded border border-[#DCE5EF] bg-white text-[#17243D] tabular-nums outline-none focus:border-[#00C98A]"
                  />
                  <span className="text-[10px] font-semibold text-[#64748B]">%</span>
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setZoom(currentZoom - 5)}
                  disabled={currentZoom <= 50}
                  title="Perkecil video (-5%)"
                  className="w-6 h-6 rounded-md border border-[#DCE5EF] bg-white text-[#17243D] hover:bg-[#F8FAFC] disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Minus className="w-3 h-3" />
                </button>
                <input
                  type="range"
                  min={50}
                  max={350}
                  step={1}
                  value={currentZoom}
                  onChange={(e) => setZoom(Number(e.target.value))}
                  style={rangeProgressStyle(currentZoom, 50, 350)}
                  className="flex-1 h-1.5 rounded-full appearance-none cursor-pointer accent-[#00C98A]"
                />
                <button
                  type="button"
                  onClick={() => setZoom(currentZoom + 5)}
                  disabled={currentZoom >= 350}
                  title="Perbesar video (+5%)"
                  className="w-6 h-6 rounded-md border border-[#DCE5EF] bg-white text-[#17243D] hover:bg-[#F8FAFC] disabled:opacity-40 flex items-center justify-center shrink-0 cursor-pointer"
                >
                  <Plus className="w-3 h-3" />
                </button>
              </div>
              <div className="grid grid-cols-5 gap-1">
                {[100, 135, 178, 225, 320].map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => setZoom(pct)}
                    className={`py-1 rounded text-[10px] font-semibold border cursor-pointer tabular-nums ${
                      currentZoom === pct
                        ? 'bg-[#17243D] text-white border-[#17243D]'
                        : 'bg-white text-[#475569] border-[#DCE5EF] hover:bg-[#F8FAFC]'
                    }`}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
              <p className="text-[10px] text-[#64748B] leading-snug">
                Perbesar scale untuk menghilangkan garis hitam saat memakai rasio 1:1, 4:5, atau 9:16.
              </p>
            </div>

            <p className="text-[10.5px] text-[#8FA4BF]">
              Pengaturan Putar Otomatis, Mute, dan Volume tersedia pada tab <strong>Konten</strong>.
            </p>
          </div>
        );
      }

      case 'row': {
        const rowChildren = selectedBlock.children ?? [];
        const rowMode = c.rowLayoutMode ?? 'grid';
        const rowColWidth = Math.max(80, Math.min(340, c.rowColumnWidth ?? 156));
        const rowColMinH = Math.max(0, Math.min(360, c.rowColumnMinHeight ?? 0));
        const rowGap = Math.max(0, Math.min(32, c.rowGap ?? 12));

        const makeEmptySlide = (idx: number): BuilderBlock => ({
          id: createId('slide'),
          type: 'container',
          label: `Slide ${idx}`,
          style: {
            ...DEFAULT_STYLE,
            padding: 12,
            marginBottom: 0,
            minHeight: 80,
            borderRadius: 16,
            borderWidth: 1,
            borderColor: theme.borderColor,
            backgroundColor: theme.cardBg,
            textColor: theme.textColor,
            shadow: 'sm',
            hoverLift: false,
            align: 'left',
          },
          content: {},
          children: [],
        });

        const setSlideCount = (targetCount: number) => {
          const clamped = Math.max(1, Math.min(20, Math.round(targetCount)));
          const next = [...rowChildren];
          while (next.length < clamped) {
            next.push(makeEmptySlide(next.length + 1));
          }
          const trimmed = next.slice(0, clamped);
          onUpdateBlock(selectedBlock.id, (blk) => ({
            ...blk,
            content: {
              ...blk.content,
              rowColumns:
                (blk.content.rowLayoutMode ?? 'grid') === 'grid'
                  ? Math.min(20, Math.max(1, clamped))
                  : blk.content.rowColumns,
            },
            children: trimmed,
          }));
        };

        const gridCols = Math.max(1, Math.min(6, c.rowColumns ?? 2));
        const gridRows = Math.max(
          1,
          Math.min(
            10,
            c.rowGridRows ?? Math.max(1, Math.ceil((rowChildren.length || gridCols) / gridCols))
          )
        );

        const applyGridDimensions = (nextColsRaw: number, nextRowsRaw: number) => {
          const nextCols = Math.max(1, Math.min(6, Math.round(nextColsRaw)));
          const nextRows = Math.max(1, Math.min(10, Math.round(nextRowsRaw)));
          const targetCells = Math.max(1, Math.min(20, nextCols * nextRows));
          const next = [...rowChildren];
          while (next.length < targetCells) {
            next.push(makeEmptySlide(next.length + 1));
          }
          const trimmed = next.slice(0, targetCells);
          onUpdateBlock(selectedBlock.id, (blk) => ({
            ...blk,
            content: {
              ...blk.content,
              rowLayoutMode: 'grid',
              rowColumns: nextCols,
              rowGridRows: nextRows,
            },
            children: trimmed,
          }));
        };

        return (
          <div className="space-y-2.5">
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1.5">
                {label('desain.field.layoutRow', 'Mode Susunan Kolom / Slide')}
              </label>
              <SegmentedControl<'horizontal' | 'vertical' | 'grid'>
                columns={3}
                value={rowMode}
                onChange={(m) => {
                  if (m === 'grid') {
                    const cols = Math.max(1, Math.min(6, c.rowColumns ?? 2));
                    const rows = Math.max(
                      1,
                      Math.min(
                        10,
                        c.rowGridRows ?? Math.max(1, Math.ceil((rowChildren.length || cols) / cols))
                      )
                    );
                    updateContent({ rowLayoutMode: 'grid', rowColumns: cols, rowGridRows: rows });
                  } else {
                    updateContent({ rowLayoutMode: m });
                  }
                }}
                options={[
                  { id: 'horizontal', label: 'Horizontal' },
                  { id: 'vertical', label: 'Vertikal' },
                  { id: 'grid', label: 'Grid' },
                ]}
              />
            </div>

            {rowMode === 'grid' ? (
              <div className="p-2.5 rounded-lg bg-[#F0F5FA]/80 border border-[#DCE5EF] space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-bold text-[#17243D]">
                    Pengaturan Grid (Kolom × Row)
                  </span>
                  <span className="text-[10px] font-semibold text-[#64748B] tabular-nums">
                    {rowChildren.length} / 20 sel
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div className="p-1.5 rounded-md bg-white border border-[#DCE5EF] space-y-1">
                    <span className="block text-[10px] font-semibold text-[#64748B]">
                      Kolom (1–6)
                    </span>
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        disabled={gridCols <= 1}
                        onClick={() => applyGridDimensions(gridCols - 1, gridRows)}
                        className="w-6 h-6 rounded border border-[#DCE5EF] bg-[#F8FAFC] text-[#17243D] font-bold text-xs disabled:opacity-40 cursor-pointer"
                        aria-label="Kurangi kolom grid"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold tabular-nums text-[#17243D]">
                        {gridCols}
                      </span>
                      <button
                        type="button"
                        disabled={gridCols >= 6 || (gridCols + 1) * gridRows > 20}
                        onClick={() => applyGridDimensions(gridCols + 1, gridRows)}
                        className="w-6 h-6 rounded border border-[#DCE5EF] bg-[#F8FAFC] text-[#17243D] font-bold text-xs disabled:opacity-40 cursor-pointer"
                        aria-label="Tambah kolom grid"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  <div className="p-1.5 rounded-md bg-white border border-[#DCE5EF] space-y-1">
                    <span className="block text-[10px] font-semibold text-[#64748B]">
                      Baris / Row (1–10)
                    </span>
                    <div className="flex items-center justify-between gap-1">
                      <button
                        type="button"
                        disabled={gridRows <= 1}
                        onClick={() => applyGridDimensions(gridCols, gridRows - 1)}
                        className="w-6 h-6 rounded border border-[#DCE5EF] bg-[#F8FAFC] text-[#17243D] font-bold text-xs disabled:opacity-40 cursor-pointer"
                        aria-label="Kurangi baris grid"
                      >
                        -
                      </button>
                      <span className="text-xs font-bold tabular-nums text-[#17243D]">
                        {gridRows}
                      </span>
                      <button
                        type="button"
                        disabled={gridRows >= 10 || gridCols * (gridRows + 1) > 20}
                        onClick={() => applyGridDimensions(gridCols, gridRows + 1)}
                        className="w-6 h-6 rounded border border-[#DCE5EF] bg-[#F8FAFC] text-[#17243D] font-bold text-xs disabled:opacity-40 cursor-pointer"
                        aria-label="Tambah baris grid"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-1.5">
                  <button
                    type="button"
                    disabled={gridCols >= 6 || (gridCols + 1) * gridRows > 20}
                    onClick={() => applyGridDimensions(gridCols + 1, gridRows)}
                    className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#17243D] text-white text-[10.5px] font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#00C98A]" />
                    <span>Tambah Kolom</span>
                  </button>
                  <button
                    type="button"
                    disabled={gridRows >= 10 || gridCols * (gridRows + 1) > 20}
                    onClick={() => applyGridDimensions(gridCols, gridRows + 1)}
                    className="inline-flex items-center justify-center gap-1 py-1.5 px-2 rounded-lg bg-[#17243D] text-white text-[10.5px] font-semibold disabled:opacity-40 cursor-pointer"
                  >
                    <Plus className="w-3 h-3 text-[#00C98A]" />
                    <span>Tambah Baris</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-[#F0F5FA]/70 border border-[#DCE5EF] space-y-1.5">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[11px] font-semibold text-[#17243D]">
                    Jumlah Kolom / Slide (1–20)
                  </span>
                  <div className="inline-flex items-center gap-1">
                    <button
                      type="button"
                      disabled={rowChildren.length <= 1}
                      onClick={() => setSlideCount(rowChildren.length - 1)}
                      className="w-6 h-6 rounded-md border border-[#DCE5EF] bg-white text-[#17243D] font-bold text-xs disabled:opacity-40 cursor-pointer"
                      aria-label="Kurangi kolom"
                    >
                      -
                    </button>
                    <span className="min-w-[24px] text-center text-xs font-bold tabular-nums text-[#17243D]">
                      {rowChildren.length}
                    </span>
                    <button
                      type="button"
                      disabled={rowChildren.length >= 20}
                      onClick={() => setSlideCount(rowChildren.length + 1)}
                      className="w-6 h-6 rounded-md border border-[#DCE5EF] bg-white text-[#17243D] font-bold text-xs disabled:opacity-40 cursor-pointer"
                      aria-label="Tambah kolom"
                    >
                      +
                    </button>
                  </div>
                </div>
                <input
                  type="range"
                  min={1}
                  max={20}
                  step={1}
                  value={Math.max(1, Math.min(20, rowChildren.length || 1))}
                  onChange={(e) => setSlideCount(Number(e.target.value))}
                  style={rangeProgressStyle(
                    Math.max(1, Math.min(20, rowChildren.length || 1)),
                    1,
                    20
                  )}
                  className="w-full cursor-pointer"
                />
              </div>
            )}

            {rowMode === 'horizontal' && (
              <div className="space-y-2">
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
                <div className="space-y-1.5 pt-1 border-t border-[#DCE5EF]">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-[#17243D]">
                      Tampilkan Scrollbar
                    </span>
                    <ToggleSwitch
                      checked={Boolean(c.rowShowScrollbar)}
                      onChange={(checked) => updateContent({ rowShowScrollbar: checked })}
                      label="Tampilkan Scrollbar"
                    />
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-medium text-[#17243D]">
                      Tampilkan Indikator Titik
                    </span>
                    <ToggleSwitch
                      checked={c.rowShowDots !== false}
                      onChange={(checked) => updateContent({ rowShowDots: checked })}
                      label="Tampilkan Indikator Titik"
                    />
                  </div>
                  {c.rowShowDots !== false && (
                    <div className="space-y-1 pt-1">
                      <span className="block text-[10.5px] font-semibold text-[#5B708B]">
                        Posisi Indikator Titik
                      </span>
                      <div className="grid grid-cols-2 gap-1.5">
                        {([
                          { id: 'below', label: 'Di Bawah' },
                          { id: 'overlay', label: 'Mengambang di Atas' },
                        ] as const).map((opt) => (
                          <button
                            key={opt.id}
                            type="button"
                            onClick={() => updateContent({ rowDotsPosition: opt.id })}
                            className={`py-1 px-2 rounded-lg text-[10.5px] font-semibold border cursor-pointer ${
                              (c.rowDotsPosition ?? 'below') === opt.id
                                ? 'bg-[#17243D] text-white border-[#17243D]'
                                : 'bg-white text-[#17243D] border-[#DCE5EF] hover:bg-[#F0F5FA]'
                            }`}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
                {isVisible('konten.desc.rowSlideProgress') && (
                  <p className="text-[10px] text-[#8FA4BF]">
                    {label(
                      'konten.desc.rowSlideProgress',
                      'Slide horizontal menampilkan indikator progress 3 titik secara otomatis.'
                    )}
                  </p>
                )}
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

      case 'showcase_card': {
        if (!selectedSubLayer) {
          return (
            <div className="space-y-3">
              <PhotoScaleControl
                label="Scale Foto di Dalam Kartu"
                value={c.cardImageZoom ?? 100}
                onChange={(val) => updateContent({ cardImageZoom: val })}
              />
              <div>
                <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                  Penyesuaian Foto Kartu
                </label>
                <SegmentedControl<'cover' | 'contain'>
                  columns={2}
                  value={c.cardImageFit ?? 'cover'}
                  onChange={(fit) => updateContent({ cardImageFit: fit })}
                  options={[
                    { id: 'cover', label: 'Penuh (Cover)' },
                    { id: 'contain', label: 'Utuh (Contain)' },
                  ]}
                />
              </div>
            </div>
          );
        }
        const subId = selectedSubLayer.id;
        const subSt = c.subLayerStyles?.[subId] ?? {};
        const isTextualCardPart = subId !== 'card_media';
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#ECFDF6] border border-[#00C98A]/30">
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-[#008F63] truncate">
                  Gaya Independen: {selectedSubLayer.label}
                </div>
                <div className="text-[10px] text-[#51637D]">
                  Hanya mengubah bagian ini, tidak memengaruhi kartu induk.
                </div>
              </div>
              <button
                type="button"
                onClick={() => resetSubLayerStyle(subId)}
                className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#DCE5EF] bg-white text-[10px] font-semibold text-[#51637D] hover:text-[#17243D] cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                <span>Reset</span>
              </button>
            </div>

            {subId === 'card_media' && (
              <PhotoScaleControl
                label="Scale Foto di Dalam Kartu"
                value={c.cardImageZoom ?? 100}
                onChange={(val) => updateContent({ cardImageZoom: val })}
              />
            )}

            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[11px] font-medium text-[#51637D] mb-1">
                  Latar Bagian
                </label>
                <div className="flex items-center gap-1">
                  <input
                    type="color"
                    value={subSt.backgroundColor || '#FFFFFF'}
                    onChange={(e) =>
                      updateSubLayerStyle(subId, { backgroundColor: e.target.value })
                    }
                    className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 bg-white cursor-pointer"
                  />
                  {subSt.backgroundColor && (
                    <button
                      type="button"
                      onClick={() => updateSubLayerStyle(subId, { backgroundColor: undefined })}
                      className="px-1.5 py-1 rounded border border-[#DCE5EF] text-[10px] bg-white text-[#51637D] cursor-pointer"
                    >
                      Auto
                    </button>
                  )}
                </div>
              </div>
              {isTextualCardPart && (
                <div>
                  <label className="block text-[11px] font-medium text-[#51637D] mb-1">
                    Warna Teks
                  </label>
                  <div className="flex items-center gap-1">
                    <input
                      type="color"
                      value={subSt.textColor || '#0F172A'}
                      onChange={(e) => updateSubLayerStyle(subId, { textColor: e.target.value })}
                      className="w-full h-7 rounded border border-[#DCE5EF] p-0.5 bg-white cursor-pointer"
                    />
                    {subSt.textColor && (
                      <button
                        type="button"
                        onClick={() => updateSubLayerStyle(subId, { textColor: undefined })}
                        className="px-1.5 py-1 rounded border border-[#DCE5EF] text-[10px] bg-white text-[#51637D] cursor-pointer"
                      >
                        Auto
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {isTextualCardPart && (
              <>
                <SliderRow
                  label="Ukuran Teks Bagian"
                  value={subSt.fontSize ? `${subSt.fontSize}px` : 'Auto'}
                  min={10}
                  max={36}
                  step={1}
                  current={subSt.fontSize ?? 14}
                  onChange={(val) => updateSubLayerStyle(subId, { fontSize: val })}
                />
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10.5px] font-semibold text-[#51637D] mb-1">
                      Ketebalan
                    </label>
                    <select
                      value={subSt.fontWeightCss ?? ''}
                      onChange={(e) =>
                        updateSubLayerStyle(subId, {
                          fontWeightCss: (e.target.value || undefined) as BlockStyle['fontWeightCss'],
                        })
                      }
                      className="w-full px-2 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                    >
                      <option value="">Auto</option>
                      <option value="400">Normal (400)</option>
                      <option value="500">Medium (500)</option>
                      <option value="600">Semibold (600)</option>
                      <option value="700">Tebal (700)</option>
                      <option value="800">Ekstra Tebal (800)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10.5px] font-semibold text-[#51637D] mb-1">
                      Gaya Huruf
                    </label>
                    <SegmentedControl<'normal' | 'italic'>
                      columns={2}
                      value={subSt.fontStyle ?? 'normal'}
                      onChange={(fontStyle) => updateSubLayerStyle(subId, { fontStyle })}
                      options={[
                        { id: 'normal', label: 'Normal' },
                        { id: 'italic', label: 'Miring' },
                      ]}
                    />
                  </div>
                </div>
              </>
            )}

            <SliderRow
              label="Padding Bagian"
              value={subSt.padding !== undefined ? `${subSt.padding}px` : 'Auto'}
              min={0}
              max={32}
              step={1}
              current={subSt.padding ?? 0}
              onChange={(val) => updateSubLayerStyle(subId, { padding: val })}
            />
            <SliderRow
              label="Lengkung Sudut Bagian"
              value={subSt.borderRadius !== undefined ? `${subSt.borderRadius}px` : 'Auto'}
              min={0}
              max={32}
              step={1}
              current={subSt.borderRadius ?? 0}
              onChange={(val) => updateSubLayerStyle(subId, { borderRadius: val })}
            />
            <SliderRow
              label="Transparansi Bagian"
              value={`${subSt.opacity ?? 100}%`}
              min={10}
              max={100}
              step={5}
              current={subSt.opacity ?? 100}
              onChange={(val) => updateSubLayerStyle(subId, { opacity: val })}
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
    <div className="flex-1 overflow-y-auto px-2.5 py-2 space-y-2 bg-[#F4F7FB]">
      {/* 1. PENGATURAN KHUSUS KOMPONEN — Paling atas pada tab Desain */}
      {hasSpecificVisualControls && isVisible('desain.sec.specific') && isDesignSectionAllowed('specific') && (
        <AccordionSection
          id="specific"
          title={
            selectedSubLayer
              ? `Gaya ${selectedSubLayer.label}`
              : label('desain.sec.specific', 'Pengaturan Khusus Komponen')
          }
          icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
          isOpen={activeOpenSection === 'specific'}
          onToggle={() => toggleSection('specific')}
        >
          {renderSpecificControls()}
        </AccordionSection>
      )}

      {/* 2. GAYA VISUAL — Filtered by component capability (P2-B) */}
      {caps.showVisualAccordion && isVisible('desain.sec.visual') && isDesignSectionAllowed('visual') && (
        <AccordionSection
          id="visual"
          title={label('desain.sec.visual', 'Gaya Visual')}
          icon={<Sparkles className="w-3.5 h-3.5" />}
          isOpen={activeOpenSection === 'visual'}
          onToggle={() => toggleSection('visual')}
        >
        {/* Bentuk: Bulat | Segi Empat | Kotak | Kapsul */}
        {caps.showShapePresets && (
          <div className="space-y-2">
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
            {selectedBlock.type === 'image' && (
              <PhotoScaleControl
                label="Scale Foto di Dalam Bentuk / Bingkai"
                value={c.imageZoom ?? 100}
                onChange={(val) => updateContent({ imageZoom: val })}
              />
            )}
            {selectedBlock.type === 'menu_icon' && (
              <PhotoScaleControl
                label="Scale Foto di Dalam Bentuk"
                value={c.menuIconImageZoom ?? 100}
                onChange={(val) => updateContent({ menuIconImageZoom: val })}
              />
            )}
            {selectedBlock.type === 'showcase_card' && (
              <PhotoScaleControl
                label="Scale Foto di Dalam Kartu"
                value={c.cardImageZoom ?? 100}
                onChange={(val) => updateContent({ cardImageZoom: val })}
              />
            )}
          </div>
        )}

        {/* Preset Wadah Cepat — only on container/card/section components */}
        {caps.showContainerQuickPresets && (
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
        )}

        {/* Latar & Gradasi */}
        {caps.showBgAndGradient && (
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
        )}

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
        {caps.showBgAndGradient && (
          <SliderRow
            label={label('desain.field.efekKaca', 'Efek Kaca (Blur)')}
            value={`${s.blur}px`}
            min={0}
            max={24}
            current={s.blur}
            onChange={(val) => updateStyle({ blur: val })}
          />
        )}

        {/* Efek Bayangan (Shadow) Slider + Warna Bayangan */}
        <div className="space-y-1.5">
          <SliderRow
            label={label('desain.field.efekBayangan', 'Bayangan')}
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
            <span className="text-[11px] font-medium text-[#51637D]">Warna Bayangan</span>
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
                  Bawaan
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Latar Belakang Gambar — only on container/card blocks */}
        {caps.showBgImage && (
        <div className="p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2">
          <div className="text-[11px] font-bold text-[#17243D]">Gambar Latar Belakang</div>
          <input
            type="url"
            value={s.bgImageUrl ?? ''}
            onChange={(e) => updateStyle({ bgImageUrl: e.target.value })}
            placeholder="https://... (tautan gambar latar opsional)"
            className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white"
          />
          {s.bgImageUrl && (
            <div className="space-y-2">
              <div className="grid grid-cols-3 gap-1.5">
                <div>
                  <label className="block text-[10px] text-[#51637D] mb-0.5">Posisi Latar</label>
                  <select
                    value={s.bgPosition ?? 'center'}
                    onChange={(e) =>
                      updateStyle({ bgPosition: e.target.value as BlockStyle['bgPosition'] })
                    }
                    className="w-full px-1.5 py-1 text-[10.5px] rounded border border-[#DCE5EF] bg-white"
                  >
                    <option value="center">Tengah</option>
                    <option value="top">Atas</option>
                    <option value="bottom">Bawah</option>
                    <option value="left">Kiri</option>
                    <option value="right">Kanan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#51637D] mb-0.5">Ukuran Latar</label>
                  <select
                    value={s.bgSize ?? 'cover'}
                    onChange={(e) => updateStyle({ bgSize: e.target.value as BlockStyle['bgSize'] })}
                    className="w-full px-1.5 py-1 text-[10.5px] rounded border border-[#DCE5EF] bg-white"
                  >
                    <option value="cover">Penuh</option>
                    <option value="contain">Utuh</option>
                    <option value="auto">Otomatis</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] text-[#51637D] mb-0.5">Pengulangan</label>
                  <select
                    value={s.bgRepeat ?? 'no-repeat'}
                    onChange={(e) =>
                      updateStyle({ bgRepeat: e.target.value as BlockStyle['bgRepeat'] })
                    }
                    className="w-full px-1.5 py-1 text-[10.5px] rounded border border-[#DCE5EF] bg-white"
                  >
                    <option value="no-repeat">Tidak Diulang</option>
                    <option value="repeat">Ulangi</option>
                    <option value="repeat-x">Horizontal</option>
                    <option value="repeat-y">Vertikal</option>
                  </select>
                </div>
              </div>
              <PhotoScaleControl
                label="Scale Foto Latar (Bingkai / Wadah)"
                value={s.bgImageScale ?? 100}
                onChange={(val) => updateStyle({ bgImageScale: val })}
              />
            </div>
          )}
        </div>
        )}

        {/* Efek Melayang */}
        <div className="flex items-center justify-between gap-2 p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
          <div>
            <div className="text-[11px] font-semibold text-[#17243D]">
              {label('desain.field.efekHoverLift', 'Efek Melayang')}
            </div>
            <div className="text-[10px] text-[#8FA4BF]">Terangkat halus saat disentuh</div>
          </div>
          <ToggleSwitch
            checked={Boolean(s.hoverLift)}
            onChange={(checked) => updateStyle({ hoverLift: checked })}
            label="Efek Melayang"
          />
        </div>

        {/* Garis Tepi: Ketebalan, Gaya & Warna */}
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
          <div className="grid grid-cols-2 gap-2">
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
            <div>
              <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                Gaya Garis Tepi
              </label>
              <select
                value={s.borderStyle ?? 'solid'}
                onChange={(e) =>
                  updateStyle({ borderStyle: e.target.value as BlockStyle['borderStyle'] })
                }
                className="w-full h-7 px-2 text-[11px] rounded-lg border border-[#DCE5EF] bg-white"
              >
                <option value="solid">Solid</option>
                <option value="dashed">Putus-putus</option>
                <option value="dotted">Titik-titik</option>
                <option value="double">Ganda</option>
                <option value="none">Tanpa Garis</option>
              </select>
            </div>
          </div>
        </div>
      </AccordionSection>
      )}

      {/* 2. LAYOUT & SPASI — Unified across ALL components (Gambar 1) */}
      {isVisible('desain.sec.layout') && isDesignSectionAllowed('layout') && (
        <AccordionSection
          id="layout"
          title={label('desain.sec.layout', 'Layout & Spasi')}
          icon={<Maximize2 className="w-3.5 h-3.5" />}
          isOpen={activeOpenSection === 'layout'}
          onToggle={() => toggleSection('layout')}
        >
        {caps.showFullSpacingControls && (
        <>
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
        </>
        )}

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

        {/* Jarak Kiri & Kanan (Margin Horizontal) + Perataan Mandiri (Align Self) */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-[10px] font-semibold text-[#51637D] mb-0.5">
              Margin Kiri (px)
            </label>
            <input
              type="number"
              min={0}
              max={64}
              value={s.marginLeft ?? 0}
              onChange={(e) =>
                updateStyle({
                  marginLeft:
                    e.target.value === '' ? undefined : Math.max(0, Math.min(64, Number(e.target.value))),
                })
              }
              className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-[#51637D] mb-0.5">
              Margin Kanan (px)
            </label>
            <input
              type="number"
              min={0}
              max={64}
              value={s.marginRight ?? 0}
              onChange={(e) =>
                updateStyle({
                  marginRight:
                    e.target.value === '' ? undefined : Math.max(0, Math.min(64, Number(e.target.value))),
                })
              }
              className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white"
            />
          </div>
        </div>

        <div>
          <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
            Perataan di Dalam Wadah (Align Self)
          </label>
          <select
            value={s.alignSelf ?? 'auto'}
            onChange={(e) =>
              updateStyle({ alignSelf: e.target.value as BlockStyle['alignSelf'] })
            }
            className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white"
          >
            <option value="auto">Otomatis</option>
            <option value="flex-start">Rata Kiri / Awal</option>
            <option value="center">Tengah</option>
            <option value="flex-end">Rata Kanan / Akhir</option>
            <option value="stretch">Penuh (Stretch)</option>
          </select>
        </div>

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
          {caps.showFullSpacingControls && (
            <>
              <SliderRow
                label={label('desain.field.tinggiMinimal', 'Tinggi Min')}
                value={s.minHeight > 0 ? `${s.minHeight}px` : 'Otomatis'}
                min={0}
                max={600}
                current={s.minHeight}
                onChange={(val) => updateStyle({ minHeight: val })}
              />
              <SliderRow
                label="Tinggi Maks"
                value={s.maxHeight && s.maxHeight > 0 ? `${s.maxHeight}px` : 'Otomatis'}
                min={0}
                max={600}
                current={s.maxHeight ?? 0}
                onChange={(val) => updateStyle({ maxHeight: val > 0 ? val : undefined })}
              />
              <div className="grid grid-cols-3 gap-1.5 pt-1">
                <div>
                  <label className="block text-[10px] text-[#51637D] mb-0.5">Lebar Min (px)</label>
                  <input
                    type="number"
                    min={0}
                    max={1280}
                    value={s.minWidth ?? ''}
                    placeholder="Auto"
                    onChange={(e) =>
                      updateStyle({
                        minWidth: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)),
                      })
                    }
                    className="w-full px-1.5 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#51637D] mb-0.5">Lebar Maks (px)</label>
                  <input
                    type="number"
                    min={0}
                    max={1280}
                    value={s.maxWidth ?? ''}
                    placeholder="Auto"
                    onChange={(e) =>
                      updateStyle({
                        maxWidth: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)),
                      })
                    }
                    className="w-full px-1.5 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                  />
                </div>
                <div>
                  <label className="block text-[10px] text-[#51637D] mb-0.5">Tinggi Tetap</label>
                  <input
                    type="number"
                    min={0}
                    max={1200}
                    value={s.heightPx ?? ''}
                    placeholder="Auto"
                    onChange={(e) =>
                      updateStyle({
                        heightPx: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)),
                      })
                    }
                    className="w-full px-1.5 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                  />
                </div>
              </div>
            </>
          )}
        </div>
      </AccordionSection>
      )}

      {/* 2B. RESPONSIF PER PERANGKAT (P2-C: Tablet 768px & Mobile 440px non-destructive overrides) */}
      {isVisible('desain.sec.layout') && isDesignSectionAllowed('layout') && (() => {
        const tabletCount = countResponsiveOverrides(s, 'tablet');
        const mobileCount = countResponsiveOverrides(s, 'mobile');
        const totalOv = tabletCount + mobileCount;
        const activeBp = editingBreakpoint;
        const activeOv: ResponsiveStyleOverride =
          activeBp === 'desktop' ? {} : getResponsiveOverrideForBreakpoint(s, activeBp);
        const setBpOverride = (patch: Partial<ResponsiveStyleOverride>) => {
          if (activeBp === 'desktop') return;
          onUpdateBlock(selectedBlock.id, (blk) => ({
            ...blk,
            style: patchResponsiveOverride(blk.style, activeBp, patch),
          }));
        };
        const handleSelectBp = (bp: ViewportBreakpoint) => {
          setEditingBreakpoint(bp);
          onChangeViewportBreakpoint?.(bp);
        };
        return (
          <AccordionSection
            id="responsive"
            title={
              totalOv > 0
                ? `Responsif per Perangkat (${totalOv})`
                : 'Responsif per Perangkat'
            }
            icon={<Tablet className="w-3.5 h-3.5" />}
            isOpen={activeOpenSection === 'responsive'}
            onToggle={() => toggleSection('responsive')}
          >
            <div className="space-y-2.5">
              <div className="grid grid-cols-3 gap-1 p-0.5 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF]">
                {(
                  [
                    { id: 'desktop', label: 'Desktop', icon: <Monitor className="w-3 h-3" />, count: 0 },
                    { id: 'tablet', label: 'Tablet', icon: <Tablet className="w-3 h-3" />, count: tabletCount },
                    { id: 'mobile', label: 'Mobile', icon: <Smartphone className="w-3 h-3" />, count: mobileCount },
                  ] as const
                ).map((tab) => (
                  <button
                    key={tab.id}
                    type="button"
                    onClick={() => handleSelectBp(tab.id)}
                    className={`flex items-center justify-center gap-1 py-1 px-1.5 rounded-md text-[10.5px] font-semibold cursor-pointer transition-colors ${
                      activeBp === tab.id
                        ? 'bg-[#17243D] text-white'
                        : 'text-[#51637D] hover:text-[#17243D]'
                    }`}
                  >
                    {tab.icon}
                    <span>{tab.label}</span>
                    {tab.count > 0 && (
                      <span className="px-1 rounded-full bg-[#00C98A] text-white text-[9px] font-bold">
                        {tab.count}
                      </span>
                    )}
                  </button>
                ))}
              </div>

              {activeBp === 'desktop' ? (
                <p className="text-[10.5px] text-[#51637D] leading-relaxed bg-[#F8FAFC] p-2 rounded-lg border border-[#DCE5EF]">
                  Nilai <strong>Desktop (Default)</strong> diatur dari bagian <strong>Layout & Spasi</strong> di atas. Pilih <strong>Tablet (768px)</strong> atau <strong>Mobile (440px)</strong> untuk menambahkan penyesuaian khusus perangkat tanpa mengubah nilai Desktop.
                </p>
              ) : (
                <div className="space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10.5px] font-semibold text-[#17243D]">
                      Override {activeBp === 'tablet' ? 'Tablet (≤ 959px)' : 'Mobile (≤ 575px)'}
                    </span>
                    {countResponsiveOverrides(s, activeBp) > 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateBlock(selectedBlock.id, (blk) => ({
                            ...blk,
                            style: clearResponsiveOverride(blk.style, activeBp),
                          }))
                        }
                        className="inline-flex items-center gap-1 text-[10px] font-semibold text-rose-600 hover:underline cursor-pointer"
                      >
                        <RotateCcw className="w-3 h-3" />
                        <span>Reset {activeBp === 'tablet' ? 'Tablet' : 'Mobile'}</span>
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-1.5">
                    <div>
                      <label className="block text-[9.5px] text-[#51637D] mb-0.5">Lebar (%)</label>
                      <input
                        type="number"
                        min={10}
                        max={100}
                        value={activeOv.widthPercent ?? ''}
                        placeholder={`${s.widthPercent}`}
                        onChange={(e) =>
                          setBpOverride({
                            widthPercent:
                              e.target.value === ''
                                ? undefined
                                : Math.max(10, Math.min(100, Number(e.target.value))),
                          })
                        }
                        className="w-full px-1.5 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] text-[#51637D] mb-0.5">Lebar Min</label>
                      <input
                        type="number"
                        min={0}
                        max={1280}
                        value={activeOv.minWidth ?? ''}
                        placeholder={s.minWidth ? `${s.minWidth}` : 'Auto'}
                        onChange={(e) =>
                          setBpOverride({
                            minWidth: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="w-full px-1.5 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] text-[#51637D] mb-0.5">Lebar Maks</label>
                      <input
                        type="number"
                        min={0}
                        max={1280}
                        value={activeOv.maxWidth ?? ''}
                        placeholder={s.maxWidth ? `${s.maxWidth}` : 'Auto'}
                        onChange={(e) =>
                          setBpOverride({
                            maxWidth: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="w-full px-1.5 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                      />
                    </div>
                  </div>

                  {caps.showFullSpacingControls && (
                    <>
                      <div className="grid grid-cols-3 gap-1.5">
                        <div>
                          <label className="block text-[9.5px] text-[#51637D] mb-0.5">Tinggi (px)</label>
                          <input
                            type="number"
                            min={0}
                            max={1600}
                            value={activeOv.heightPx ?? ''}
                            placeholder={s.heightPx ? `${s.heightPx}` : 'Auto'}
                            onChange={(e) =>
                              setBpOverride({
                                heightPx: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)),
                              })
                            }
                            className="w-full px-1.5 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[9.5px] text-[#51637D] mb-0.5">Tinggi Min</label>
                          <input
                            type="number"
                            min={0}
                            max={1200}
                            value={activeOv.minHeight ?? ''}
                            placeholder={s.minHeight ? `${s.minHeight}` : '0'}
                            onChange={(e) =>
                              setBpOverride({
                                minHeight: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)),
                              })
                            }
                            className="w-full px-1.5 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                          />
                        </div>
                        <div>
                          <label className="block text-[9.5px] text-[#51637D] mb-0.5">Tinggi Maks</label>
                          <input
                            type="number"
                            min={0}
                            max={1600}
                            value={activeOv.maxHeight ?? ''}
                            placeholder={s.maxHeight ? `${s.maxHeight}` : 'Auto'}
                            onChange={(e) =>
                              setBpOverride({
                                maxHeight: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)),
                              })
                            }
                            className="w-full px-1.5 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-4 gap-1">
                        {(
                          [
                            { key: 'paddingTop', label: 'Pad A', ph: padTopVal },
                            { key: 'paddingRight', label: 'Pad Ka', ph: padRightVal },
                            { key: 'paddingBottom', label: 'Pad B', ph: padBottomVal },
                            { key: 'paddingLeft', label: 'Pad Ki', ph: padLeftVal },
                          ] as const
                        ).map((item) => (
                          <div key={item.key}>
                            <label className="block text-[9px] text-[#51637D] mb-0.5">{item.label}</label>
                            <input
                              type="number"
                              min={0}
                              max={96}
                              value={activeOv[item.key] ?? ''}
                              placeholder={`${item.ph}`}
                              onChange={(e) =>
                                setBpOverride({
                                  [item.key]:
                                    e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)),
                                })
                              }
                              className="w-full px-1 py-1 text-[10.5px] rounded border border-[#DCE5EF] bg-white"
                            />
                          </div>
                        ))}
                      </div>
                    </>
                  )}

                  <div className="grid grid-cols-2 gap-1.5">
                    <div>
                      <label className="block text-[9.5px] text-[#51637D] mb-0.5">Margin Atas (px)</label>
                      <input
                        type="number"
                        min={0}
                        max={96}
                        value={activeOv.marginTop ?? ''}
                        placeholder={`${marginTopVal}`}
                        onChange={(e) =>
                          setBpOverride({
                            marginTop: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="w-full px-1.5 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                      />
                    </div>
                    <div>
                      <label className="block text-[9.5px] text-[#51637D] mb-0.5">Margin Bawah (px)</label>
                      <input
                        type="number"
                        min={0}
                        max={96}
                        value={activeOv.marginBottom ?? ''}
                        placeholder={`${s.marginBottom}`}
                        onChange={(e) =>
                          setBpOverride({
                            marginBottom: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)),
                          })
                        }
                        className="w-full px-1.5 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                      />
                    </div>
                  </div>

                  {caps.supportsResponsiveLayoutProps && (
                    <div className="pt-2 border-t border-[#DCE5EF] space-y-2">
                      <div className="text-[10px] font-bold text-[#17243D]">
                        Tata Letak Wadah ({activeBp === 'tablet' ? 'Tablet' : 'Mobile'})
                      </div>
                      <div className="grid grid-cols-2 gap-1.5">
                        <div>
                          <label className="block text-[9.5px] text-[#51637D] mb-0.5">Display</label>
                          <select
                            value={activeOv.displayMode ?? ''}
                            onChange={(e) =>
                              setBpOverride({
                                displayMode: (e.target.value || undefined) as ResponsiveStyleOverride['displayMode'],
                              })
                            }
                            className="w-full px-1.5 py-1 text-[10.5px] rounded border border-[#DCE5EF] bg-white"
                          >
                            <option value="">Ikuti Desktop</option>
                            <option value="block">Blok</option>
                            <option value="flex">Flex</option>
                            <option value="grid">Grid</option>
                            <option value="inline-flex">Inline Flex</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9.5px] text-[#51637D] mb-0.5">Arah</label>
                          <select
                            value={activeOv.flexDirection ?? ''}
                            onChange={(e) =>
                              setBpOverride({
                                flexDirection: (e.target.value || undefined) as ResponsiveStyleOverride['flexDirection'],
                              })
                            }
                            className="w-full px-1.5 py-1 text-[10.5px] rounded border border-[#DCE5EF] bg-white"
                          >
                            <option value="">Ikuti Desktop</option>
                            <option value="column">Vertikal</option>
                            <option value="row">Horizontal</option>
                            <option value="column-reverse">Vertikal Terbalik</option>
                            <option value="row-reverse">Horizontal Terbalik</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9.5px] text-[#51637D] mb-0.5">Perataan</label>
                          <select
                            value={activeOv.alignItems ?? ''}
                            onChange={(e) =>
                              setBpOverride({
                                alignItems: (e.target.value || undefined) as ResponsiveStyleOverride['alignItems'],
                              })
                            }
                            className="w-full px-1.5 py-1 text-[10.5px] rounded border border-[#DCE5EF] bg-white"
                          >
                            <option value="">Ikuti Desktop</option>
                            <option value="stretch">Penuh</option>
                            <option value="flex-start">Awal</option>
                            <option value="center">Tengah</option>
                            <option value="flex-end">Akhir</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9.5px] text-[#51637D] mb-0.5">Justify</label>
                          <select
                            value={activeOv.justifyContent ?? ''}
                            onChange={(e) =>
                              setBpOverride({
                                justifyContent: (e.target.value || undefined) as ResponsiveStyleOverride['justifyContent'],
                              })
                            }
                            className="w-full px-1.5 py-1 text-[10.5px] rounded border border-[#DCE5EF] bg-white"
                          >
                            <option value="">Ikuti Desktop</option>
                            <option value="flex-start">Awal</option>
                            <option value="center">Tengah</option>
                            <option value="flex-end">Akhir</option>
                            <option value="space-between">Renggang Merata</option>
                            <option value="space-around">Jarak Seimbang</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9.5px] text-[#51637D] mb-0.5">Bungkus (Wrap)</label>
                          <select
                            value={activeOv.flexWrap ?? ''}
                            onChange={(e) =>
                              setBpOverride({
                                flexWrap: (e.target.value || undefined) as ResponsiveStyleOverride['flexWrap'],
                              })
                            }
                            className="w-full px-1.5 py-1 text-[10.5px] rounded border border-[#DCE5EF] bg-white"
                          >
                            <option value="">Ikuti Desktop</option>
                            <option value="nowrap">Satu Baris</option>
                            <option value="wrap">Bungkus Baris</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-[9.5px] text-[#51637D] mb-0.5">Gap (px)</label>
                          <input
                            type="number"
                            min={0}
                            max={64}
                            value={activeOv.gap ?? ''}
                            placeholder={`${s.gap ?? 0}`}
                            onChange={(e) =>
                              setBpOverride({
                                gap: e.target.value === '' ? undefined : Math.max(0, Number(e.target.value)),
                              })
                            }
                            className="w-full px-1.5 py-1 text-[10.5px] rounded border border-[#DCE5EF] bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </AccordionSection>
        );
      })()}

      {/* 3. TATA LETAK & POSISI (Bagian D) */}
      {caps.showLayoutPositionAccordion && isVisible('desain.sec.posisi') && isDesignSectionAllowed('position') && (
        <AccordionSection
          id="position"
          title={label('desain.sec.posisi', 'Tata Letak & Posisi')}
          icon={<LayoutTemplate className="w-3.5 h-3.5" />}
          isOpen={activeOpenSection === 'position'}
          onToggle={() => toggleSection('position')}
        >
        <div className="space-y-2.5">
          {caps.showFlexGridControls && (
            <>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                    Tampilan
                  </label>
                  <select
                    value={s.displayMode ?? 'block'}
                    onChange={(e) =>
                      updateStyle({ displayMode: e.target.value as BlockStyle['displayMode'] })
                    }
                    className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white"
                  >
                    <option value="block">Blok</option>
                    <option value="flex">Fleksibel (Flex)</option>
                    <option value="grid">Kisi (Grid)</option>
                    <option value="inline-flex">Sebaris Fleksibel</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                    Luapan Konten
                  </label>
                  <select
                    value={s.overflow ?? 'visible'}
                    onChange={(e) =>
                      updateStyle({ overflow: e.target.value as BlockStyle['overflow'] })
                    }
                    className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white"
                  >
                    <option value="visible">Terlihat</option>
                    <option value="hidden">Tersembunyi</option>
                    <option value="auto">Otomatis</option>
                    <option value="scroll">Gulir</option>
                  </select>
                </div>
              </div>

              {(s.displayMode === 'flex' || s.displayMode === 'inline-flex' || s.displayMode === 'grid') && (
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[10px] font-semibold text-[#51637D] mb-0.5">Arah</label>
                    <select
                      value={s.flexDirection ?? 'column'}
                      onChange={(e) =>
                        updateStyle({ flexDirection: e.target.value as BlockStyle['flexDirection'] })
                      }
                      className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white"
                    >
                      <option value="column">Vertikal</option>
                      <option value="row">Horizontal</option>
                      <option value="column-reverse">Vertikal Terbalik</option>
                      <option value="row-reverse">Horizontal Terbalik</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#51637D] mb-0.5">Bungkus</label>
                    <select
                      value={s.flexWrap ?? 'nowrap'}
                      onChange={(e) =>
                        updateStyle({ flexWrap: e.target.value as BlockStyle['flexWrap'] })
                      }
                      className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white"
                    >
                      <option value="nowrap">Satu Baris</option>
                      <option value="wrap">Bungkus Baris</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#51637D] mb-0.5">Perataan</label>
                    <select
                      value={s.alignItems ?? 'stretch'}
                      onChange={(e) =>
                        updateStyle({ alignItems: e.target.value as BlockStyle['alignItems'] })
                      }
                      className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white"
                    >
                      <option value="stretch">Penuh</option>
                      <option value="flex-start">Awal</option>
                      <option value="center">Tengah</option>
                      <option value="flex-end">Akhir</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-[#51637D] mb-0.5">
                      Perataan Konten
                    </label>
                    <select
                      value={s.justifyContent ?? 'flex-start'}
                      onChange={(e) =>
                        updateStyle({ justifyContent: e.target.value as BlockStyle['justifyContent'] })
                      }
                      className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white"
                    >
                      <option value="flex-start">Awal</option>
                      <option value="center">Tengah</option>
                      <option value="flex-end">Akhir</option>
                      <option value="space-between">Renggang Merata</option>
                      <option value="space-around">Jarak Seimbang</option>
                    </select>
                  </div>
                </div>
              )}

              <SliderRow
                label="Jarak Antar Elemen"
                value={`${s.gap ?? 0}px`}
                min={0}
                max={48}
                current={s.gap ?? 0}
                onChange={(val) => updateStyle({ gap: val })}
              />
            </>
          )}

          <div className="pt-1.5 border-t border-[#DCE5EF] space-y-2">
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                  Posisi
                </label>
                <select
                  value={s.positionMode ?? 'static'}
                  onChange={(e) =>
                    updateStyle({ positionMode: e.target.value as BlockStyle['positionMode'] })
                  }
                  className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white"
                >
                  <option value="static">Normal</option>
                  <option value="relative">Relatif</option>
                  <option value="absolute">Absolut</option>
                  <option value="fixed">Tetap</option>
                  <option value="sticky">Menempel</option>
                </select>
              </div>
              <div>
                <label className="block text-[10.5px] font-semibold text-[#17243D] mb-1">
                  Urutan Lapisan
                </label>
                <input
                  type="number"
                  min={-10}
                  max={100}
                  value={s.zIndex ?? 0}
                  onChange={(e) => updateStyle({ zIndex: Number(e.target.value) || 0 })}
                  className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white"
                />
              </div>
            </div>

            {s.positionMode && s.positionMode !== 'static' && (
              <div className="grid grid-cols-4 gap-1.5">
                {(
                  [
                    { key: 'posTop', label: 'Atas' },
                    { key: 'posRight', label: 'Kanan' },
                    { key: 'posBottom', label: 'Bawah' },
                    { key: 'posLeft', label: 'Kiri' },
                  ] as const
                ).map((item) => (
                  <div key={item.key}>
                    <label className="block text-[9.5px] text-[#51637D] mb-0.5">{item.label}</label>
                    <input
                      type="number"
                      value={s[item.key] ?? ''}
                      placeholder="-"
                      onChange={(e) =>
                        updateStyle({
                          [item.key]: e.target.value === '' ? undefined : Number(e.target.value),
                        })
                      }
                      className="w-full px-1.5 py-1 text-[11px] rounded border border-[#DCE5EF] bg-white"
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </AccordionSection>
      )}

      {/* 4. TIPOGRAFI TERPADU — Single source of truth in Desain tab (sub-layer isolated for button_text) */}
      {caps.showTypographyAccordion && isVisible('desain.sec.typo') && isDesignSectionAllowed('typo') && (() => {
        const isButtonTextSub =
          selectedBlock.type === 'button' && selectedSubLayer?.id === 'button_text';
        const btnTextSt = c.buttonTextStyle ?? {};
        const isMenuIcon = selectedBlock.type === 'menu_icon';
        const isCustomTextColor =
          s.useThemeTextColor === false ||
          Boolean(isMenuIcon && c.menuIconTextColor) ||
          (s.useThemeTextColor === undefined &&
            Boolean(s.textColor) &&
            s.textColor.trim().toLowerCase() !== theme.textColor.trim().toLowerCase());
        const resolvedWeightCss: BlockStyle['fontWeightCss'] | '' = isButtonTextSub
          ? btnTextSt.fontWeightCss ?? ''
          : s.fontWeightCss ??
            (c.fontWeight === 'bold'
              ? '700'
              : c.fontWeight === 'semibold'
              ? '600'
              : c.fontWeight === 'normal'
              ? '400'
              : '');
        const resolvedFontFamily = isButtonTextSub ? btnTextSt.fontFamily ?? '' : s.fontFamily ?? '';
        const resolvedFontSize = isButtonTextSub ? btnTextSt.fontSize : s.fontSize;
        const resolvedFontStyle = isButtonTextSub
          ? btnTextSt.fontStyle ?? 'normal'
          : s.fontStyle ?? 'normal';
        const resolvedLineHeight = isButtonTextSub ? btnTextSt.lineHeight : s.lineHeight;
        const resolvedLetterSpacing = isButtonTextSub ? btnTextSt.letterSpacing : s.letterSpacing;
        const resolvedTransform = isButtonTextSub
          ? btnTextSt.textTransform ?? 'none'
          : s.textTransform ?? 'none';
        const resolvedDecoration = isButtonTextSub
          ? btnTextSt.textDecoration ?? 'none'
          : s.textDecoration ?? 'none';

        const handleWeightChange = (nextW: BlockStyle['fontWeightCss'] | undefined) => {
          if (isButtonTextSub) {
            updateSubLayerStyle('button_text', { fontWeightCss: nextW });
            return;
          }
          const legacyWeight: 'normal' | 'semibold' | 'bold' | undefined =
            !nextW
              ? undefined
              : Number(nextW) >= 700
              ? 'bold'
              : Number(nextW) >= 600
              ? 'semibold'
              : 'normal';
          onUpdateBlock(selectedBlock.id, (blk) => ({
            ...blk,
            style: { ...blk.style, fontWeightCss: nextW },
            content:
              blk.type === 'text' || blk.type === 'menu_icon'
                ? { ...blk.content, fontWeight: legacyWeight }
                : blk.content,
          }));
        };

        return (
          <AccordionSection
            id="typo"
            title={
              isButtonTextSub
                ? 'Tipografi Teks Tombol'
                : label('desain.sec.typo', 'Tipografi')
            }
            icon={<SlidersHorizontal className="w-3.5 h-3.5" />}
            isOpen={activeOpenSection === 'typo'}
            onToggle={() => toggleSection('typo')}
          >
            <div className="space-y-2.5">
              {/* Alignment (block-level) */}
              {!isButtonTextSub && (
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
              )}

              {/* Jenis Font */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[11px] font-semibold text-[#17243D]">
                    {label('desain.field.jenisFont', 'Jenis Font')}
                  </label>
                  {resolvedFontFamily && (
                    <button
                      type="button"
                      onClick={() => {
                        if (isButtonTextSub) {
                          updateSubLayerStyle('button_text', { fontFamily: undefined });
                        } else {
                          updateStyle({
                            fontFamily: undefined,
                            themeOverrideTokens: s.themeOverrideTokens
                              ? { ...s.themeOverrideTokens, fontFamily: false }
                              : undefined,
                          });
                        }
                      }}
                      className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-[#00C98A] hover:underline cursor-pointer"
                    >
                      <RotateCcw className="w-3 h-3" />
                      <span>Ikuti Global</span>
                    </button>
                  )}
                </div>
                <select
                  value={resolvedFontFamily}
                  onChange={(e) => {
                    const val = e.target.value;
                    if (isButtonTextSub) {
                      updateSubLayerStyle('button_text', { fontFamily: val || undefined });
                    } else if (!val) {
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

              {/* Ukuran Teks (Font Size) */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-medium text-[#17243D]">
                    {label('desain.field.ukuranTeks', 'Ukuran Teks (Font Size)')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {resolvedFontSize !== undefined && (
                      <button
                        type="button"
                        onClick={() =>
                          isButtonTextSub
                            ? updateSubLayerStyle('button_text', { fontSize: undefined })
                            : updateStyle({ fontSize: undefined })
                        }
                        className="px-1.5 py-0.5 rounded border border-[#DCE5EF] bg-white text-[10px] font-semibold text-[#17243D] cursor-pointer"
                      >
                        Auto
                      </button>
                    )}
                    <span className="font-mono text-[10.5px] font-semibold text-[#17243D] bg-[#F0F5FA] px-1.5 py-0.5 rounded tabular-nums">
                      {resolvedFontSize ? `${resolvedFontSize}px` : 'Auto'}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={10}
                  max={42}
                  value={resolvedFontSize ?? 15}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (isButtonTextSub) {
                      updateSubLayerStyle('button_text', { fontSize: val });
                    } else {
                      updateStyle({ fontSize: val });
                    }
                  }}
                  style={rangeProgressStyle(resolvedFontSize ?? 15, 10, 42)}
                  className="w-full cursor-pointer"
                />
              </div>

              {/* Ketebalan Teks + Gaya Huruf (Italic) */}
              <div className="space-y-2">
                <div>
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    {label('desain.field.ketebalanTeks', 'Ketebalan Huruf')}
                  </label>
                  <div className="grid grid-cols-5 gap-1">
                    {(['400', '500', '600', '700', '800'] as const).map((w) => (
                      <button
                        key={w}
                        type="button"
                        onClick={() =>
                          handleWeightChange(resolvedWeightCss === w ? undefined : w)
                        }
                        className={`py-1 rounded border text-[10.5px] font-semibold cursor-pointer tabular-nums ${
                          resolvedWeightCss === w
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
                  <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                    Gaya Huruf
                  </label>
                  <SegmentedControl<'normal' | 'italic'>
                    columns={2}
                    value={resolvedFontStyle}
                    onChange={(nextStyle) => {
                      if (isButtonTextSub) {
                        updateSubLayerStyle('button_text', { fontStyle: nextStyle });
                      } else {
                        updateStyle({ fontStyle: nextStyle });
                      }
                    }}
                    options={[
                      { id: 'normal', label: 'Normal' },
                      { id: 'italic', label: <span className="italic">Miring (Italic)</span> },
                    ]}
                  />
                </div>
              </div>

              {/* Tinggi Baris (Line Height) */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-medium text-[#17243D]">
                    {label('desain.field.tinggiBaris', 'Tinggi Baris (Line Height)')}
                  </span>
                  <div className="flex items-center gap-1.5">
                    {resolvedLineHeight !== undefined && (
                      <button
                        type="button"
                        onClick={() =>
                          isButtonTextSub
                            ? updateSubLayerStyle('button_text', { lineHeight: undefined })
                            : updateStyle({ lineHeight: undefined })
                        }
                        className="px-1.5 py-0.5 rounded border border-[#DCE5EF] bg-white text-[10px] font-semibold text-[#17243D] cursor-pointer"
                      >
                        Auto
                      </button>
                    )}
                    <span className="font-mono text-[10.5px] font-semibold text-[#17243D] bg-[#F0F5FA] px-1.5 py-0.5 rounded tabular-nums">
                      {resolvedLineHeight ? resolvedLineHeight.toFixed(1) : 'Auto'}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={1.0}
                  max={2.4}
                  step={0.1}
                  value={resolvedLineHeight ?? 1.5}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (isButtonTextSub) {
                      updateSubLayerStyle('button_text', { lineHeight: val });
                    } else {
                      updateStyle({ lineHeight: val });
                    }
                  }}
                  style={rangeProgressStyle(resolvedLineHeight ?? 1.5, 1.0, 2.4)}
                  className="w-full cursor-pointer"
                />
              </div>

              {/* Jarak Antar Huruf */}
              <div>
                <div className="flex items-center justify-between text-[11px] mb-1">
                  <span className="font-medium text-[#17243D]">Jarak Antar Huruf</span>
                  <div className="flex items-center gap-1.5">
                    {resolvedLetterSpacing !== undefined && resolvedLetterSpacing !== 0 && (
                      <button
                        type="button"
                        onClick={() =>
                          isButtonTextSub
                            ? updateSubLayerStyle('button_text', { letterSpacing: undefined })
                            : updateStyle({ letterSpacing: undefined })
                        }
                        className="px-1.5 py-0.5 rounded border border-[#DCE5EF] bg-white text-[10px] font-semibold text-[#17243D] cursor-pointer"
                      >
                        0px
                      </button>
                    )}
                    <span className="font-mono text-[10.5px] font-semibold text-[#17243D] bg-[#F0F5FA] px-1.5 py-0.5 rounded tabular-nums">
                      {resolvedLetterSpacing ? `${resolvedLetterSpacing.toFixed(1)}px` : '0px'}
                    </span>
                  </div>
                </div>
                <input
                  type="range"
                  min={-1}
                  max={6}
                  step={0.5}
                  value={resolvedLetterSpacing ?? 0}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    if (isButtonTextSub) {
                      updateSubLayerStyle('button_text', { letterSpacing: val });
                    } else {
                      updateStyle({ letterSpacing: val });
                    }
                  }}
                  style={rangeProgressStyle(resolvedLetterSpacing ?? 0, -1, 6)}
                  className="w-full cursor-pointer"
                />
              </div>

              {!isButtonTextSub && (
                <>
                  <div>
                    <div className="flex items-center justify-between text-[11px] mb-1">
                      <span className="font-medium text-[#17243D]">Jarak Antar Teks / Paragraf</span>
                      <span className="font-mono text-[10.5px] font-semibold text-[#17243D] bg-[#F0F5FA] px-1.5 py-0.5 rounded tabular-nums">
                        {s.paragraphGap !== undefined ? `${s.paragraphGap}px` : 'Auto'}
                      </span>
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={24}
                      step={1}
                      value={s.paragraphGap ?? 6}
                      onChange={(e) => updateStyle({ paragraphGap: Number(e.target.value) })}
                      style={rangeProgressStyle(s.paragraphGap ?? 6, 0, 24)}
                      className="w-full cursor-pointer"
                    />
                  </div>

                  {/* Batas Baris */}
                  <div>
                    <label className="block text-[11px] font-semibold text-[#17243D] mb-1">
                      Batas Baris Teks
                    </label>
                    <div className="grid grid-cols-5 gap-1">
                      {(
                        [
                          { val: 0, label: 'Auto' },
                          { val: 1, label: '1 Baris' },
                          { val: 2, label: '2 Baris' },
                          { val: 3, label: '3 Baris' },
                          { val: 4, label: '4 Baris' },
                        ] as const
                      ).map((opt) => (
                        <button
                          key={opt.val}
                          type="button"
                          onClick={() => updateStyle({ maxLines: opt.val })}
                          className={`py-1 rounded border text-[10px] font-semibold cursor-pointer ${
                            (s.maxLines ?? 0) === opt.val
                              ? 'bg-[#17243D] text-white border-[#17243D]'
                              : 'bg-white text-[#17243D] border-[#DCE5EF] hover:bg-[#F0F5FA]'
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* Transformasi & Dekorasi */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10px] font-semibold text-[#51637D] mb-0.5">
                    Transformasi Teks
                  </label>
                  <select
                    value={resolvedTransform}
                    onChange={(e) => {
                      const val = e.target.value as BlockStyle['textTransform'];
                      if (isButtonTextSub) {
                        updateSubLayerStyle('button_text', { textTransform: val });
                      } else {
                        updateStyle({ textTransform: val });
                      }
                    }}
                    className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white"
                  >
                    <option value="none">Normal</option>
                    <option value="uppercase">HURUF BESAR</option>
                    <option value="lowercase">huruf kecil</option>
                    <option value="capitalize">Kapital Awal Kata</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-[#51637D] mb-0.5">
                    Dekorasi Teks
                  </label>
                  <select
                    value={resolvedDecoration}
                    onChange={(e) => {
                      const val = e.target.value as BlockStyle['textDecoration'];
                      if (isButtonTextSub) {
                        updateSubLayerStyle('button_text', { textDecoration: val });
                      } else {
                        updateStyle({ textDecoration: val });
                      }
                    }}
                    className="w-full px-2 py-1 text-[11px] rounded-md border border-[#DCE5EF] bg-white"
                  >
                    <option value="none">Normal</option>
                    <option value="underline">Garis Bawah</option>
                    <option value="line-through">Coret Tengah</option>
                  </select>
                </div>
              </div>

              {/* Warna Teks */}
              {!isButtonTextSub && (
                <div className="p-2 rounded-lg bg-[#F0F5FA] border border-[#DCE5EF] space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[11px] font-bold text-[#17243D]">
                      {label('desain.field.warnaTeks', 'Warna Teks')}
                    </span>
                    <div className="inline-flex rounded-md bg-white border border-[#DCE5EF] p-0.5">
                      <button
                        type="button"
                        onClick={() => {
                          onUpdateBlock(selectedBlock.id, (blk) => ({
                            ...blk,
                            style: {
                              ...blk.style,
                              useThemeTextColor: true,
                              textColor: theme.textColor,
                              themeOverrideTokens: blk.style.themeOverrideTokens
                                ? { ...blk.style.themeOverrideTokens, textColor: false }
                                : undefined,
                            },
                            content: isMenuIcon
                              ? { ...blk.content, menuIconTextColor: undefined }
                              : blk.content,
                          }));
                        }}
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
                        onClick={() => {
                          const chosen = s.textColor || c.menuIconTextColor || theme.textColor;
                          onUpdateBlock(selectedBlock.id, (blk) =>
                            withLocalThemeTokenPatch(
                              blk,
                              { useThemeTextColor: false, textColor: chosen },
                              isMenuIcon ? { menuIconTextColor: chosen } : undefined,
                              ['textColor']
                            )
                          );
                        }}
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
                      value={
                        isCustomTextColor
                          ? s.textColor || c.menuIconTextColor || theme.textColor
                          : theme.textColor
                      }
                      onChange={(e) => {
                        const col = e.target.value;
                        onUpdateBlock(selectedBlock.id, (blk) =>
                          withLocalThemeTokenPatch(
                            blk,
                            { useThemeTextColor: false, textColor: col },
                            isMenuIcon ? { menuIconTextColor: col } : undefined,
                            ['textColor']
                          )
                        );
                      }}
                      className="w-7 h-7 rounded-lg border border-[#DCE5EF] p-0.5 cursor-pointer shrink-0 bg-white"
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
                              onUpdateBlock(selectedBlock.id, (blk) =>
                                withLocalThemeTokenPatch(
                                  blk,
                                  { useThemeTextColor: false, textColor: sw.color },
                                  isMenuIcon ? { menuIconTextColor: sw.color } : undefined,
                                  ['textColor']
                                )
                              )
                            }
                            style={{ backgroundColor: sw.color }}
                            className={`w-5 h-5 rounded-full border border-[#DCE5EF] cursor-pointer ${
                              activeColor.toLowerCase() === sw.color.toLowerCase() && isCustomTextColor
                                ? 'ring-2 ring-[#00C98A] ring-offset-1'
                                : ''
                            }`}
                          />
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </AccordionSection>
        );
      })()}

      {/* 5. EFEK LANJUTAN (Transparansi, Transformasi, Transisi) */}
      {caps.showEffectsAccordion && isVisible('desain.sec.efek') && isDesignSectionAllowed('effects') && (
        <AccordionSection
          id="effects"
          title={label('desain.sec.efek', 'Efek')}
          icon={<Sparkles className="w-3.5 h-3.5" />}
          isOpen={activeOpenSection === 'effects'}
          onToggle={() => toggleSection('effects')}
        >
          <div className="space-y-2.5">
            <SliderRow
              label="Transparansi"
              value={`${s.opacity ?? 100}%`}
              min={0}
              max={100}
              current={s.opacity ?? 100}
              onChange={(val) => updateStyle({ opacity: val })}
            />
            <SliderRow
              label="Skala Transformasi"
              value={`${s.transformScale ?? 100}%`}
              min={50}
              max={150}
              current={s.transformScale ?? 100}
              onChange={(val) => updateStyle({ transformScale: val })}
            />
            <SliderRow
              label="Rotasi"
              value={`${s.transformRotate ?? 0}°`}
              min={-45}
              max={45}
              current={s.transformRotate ?? 0}
              onChange={(val) => updateStyle({ transformRotate: val })}
            />
            <SliderRow
              label="Durasi Transisi"
              value={`${s.transitionMs ?? 0}ms`}
              min={0}
              max={1000}
              step={50}
              current={s.transitionMs ?? 0}
              onChange={(val) => updateStyle({ transitionMs: val })}
            />
          </div>
        </AccordionSection>
      )}

      {selectedSubLayer && onClearSubLayer && (
        <button
          type="button"
          onClick={onClearSubLayer}
          className="w-full py-2 px-3 rounded-lg border border-dashed border-[#00C98A]/60 bg-white text-[11px] font-semibold text-[#008F63] hover:bg-[#ECFDF6] transition-colors cursor-pointer"
        >
          Tampilkan Semua Pengaturan Desain Komponen Induk
        </button>
      )}
    </div>
  );
}
