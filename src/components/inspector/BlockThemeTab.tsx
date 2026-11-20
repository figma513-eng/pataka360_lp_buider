import { Palette, RotateCcw, ShieldCheck, Sparkles } from 'lucide-react';
import { BlockStyle, BuilderBlock, PageTheme } from '../../types/builder';
import {
  ThemeOverrideTokenKey,
  getBlockThemeStatus,
  getDefaultBlockBgForTheme,
  resetBlockThemeToGlobal,
  withLocalThemeTokenPatch,
} from '../../utils/blockThemeHelpers';
import { FONT_OPTIONS } from '../../utils/fontHelpers';
import {
  GRADIENT_PRESETS,
  buildLinearGradientCss,
  clampGradientAngle,
} from '../../utils/gradientHelpers';
import { SegmentedControl, ToggleSwitch } from './InspectorPrimitives';
import { useUiLabel } from '../../contexts/UiLabelsContext';

interface BlockThemeTabProps {
  selectedBlock: BuilderBlock;
  theme: PageTheme;
  onUpdateBlock: (id: string, updater: (block: BuilderBlock) => BuilderBlock) => void;
}

const TOKEN_BADGES: { key: ThemeOverrideTokenKey; label: string }[] = [
  { key: 'textColor', label: 'Teks' },
  { key: 'backgroundColor', label: 'Latar' },
  { key: 'borderColor', label: 'Border' },
  { key: 'accentColor', label: 'Aksen' },
  { key: 'fontFamily', label: 'Font' },
];

function getBlockAccentField(block: BuilderBlock): {
  key: keyof BuilderBlock['content'];
  label: string;
  value: string;
} | null {
  const c = block.content;
  switch (block.type) {
    case 'button':
      return { key: 'buttonBg', label: 'Warna Tombol Utama', value: c.buttonBg || '' };
    case 'cart_button':
      return { key: 'cartAccentColor', label: 'Warna Tombol Keranjang', value: c.cartAccentColor || '' };
    case 'back_button':
      return { key: 'backButtonBg', label: 'Warna Tombol Kembali', value: c.backButtonBg || '' };
    case 'showcase_card':
      return { key: 'cardAccentColor', label: 'Warna Aksen Kartu', value: c.cardAccentColor || '' };
    case 'toggle_container':
      return { key: 'toggleButtonBg', label: 'Warna Tombol Buka/Tutup', value: c.toggleButtonBg || '' };
    case 'bottom_sheet':
      return { key: 'sheetTriggerBg', label: 'Warna Tombol Sheet', value: c.sheetTriggerBg || '' };
    case 'menu_icon':
      return { key: 'menuIconBg', label: 'Warna Latar Menu Icon', value: c.menuIconBg || '' };
    case 'social':
    case 'social_follower':
      return { key: 'socialColor', label: 'Warna Aksen Sosmed', value: c.socialColor || '' };
    case 'fnb_catalog':
      return { key: 'fnbAccentColor', label: 'Warna Aksen F&B', value: c.fnbAccentColor || '' };
    case 'category_tabs':
      return { key: 'categoryActiveBg', label: 'Warna Tab Aktif', value: c.categoryActiveBg || '' };
    case 'catalog':
    case 'training_catalog':
    case 'maps_place':
    case 'form':
    case 'hero_profile':
      return {
        key: c.buttonColor !== undefined && c.buttonBg === undefined ? 'buttonColor' : 'buttonBg',
        label: 'Warna Aksen / CTA Komponen',
        value: c.buttonBg || c.buttonColor || '',
      };
    default:
      if (c.buttonBg !== undefined) {
        return { key: 'buttonBg', label: 'Warna Aksen Tombol', value: c.buttonBg };
      }
      if (c.buttonColor !== undefined) {
        return { key: 'buttonColor', label: 'Warna Aksen Tombol', value: c.buttonColor };
      }
      return null;
  }
}

export function BlockThemeTab({
  selectedBlock,
  theme,
  onUpdateBlock,
}: BlockThemeTabProps) {
  const { label } = useUiLabel();
  const s = selectedBlock.style;
  const status = getBlockThemeStatus(selectedBlock, theme);
  const isLocalMode = status.mode === 'local';
  const defaultBg = getDefaultBlockBgForTheme(selectedBlock, theme);
  const effectiveTextColor = s.textColor || theme.textColor;
  const effectiveBgColor =
    s.backgroundColor && s.backgroundColor !== 'transparent'
      ? s.backgroundColor
      : defaultBg !== 'transparent'
      ? defaultBg
      : '#FFFFFF';
  const effectiveBorderColor = s.borderColor || theme.borderColor;
  const accentInfo = getBlockAccentField(selectedBlock);

  const handleModeChange = (mode: 'global' | 'local') => {
    if (mode === 'global') {
      onUpdateBlock(selectedBlock.id, (blk) => resetBlockThemeToGlobal(blk, theme));
    } else {
      onUpdateBlock(selectedBlock.id, (blk) => ({
        ...blk,
        style: {
          ...blk.style,
          themeOverrideMode: 'local',
        },
      }));
    }
  };

  const clearSingleToken = (token: ThemeOverrideTokenKey) => {
    onUpdateBlock(selectedBlock.id, (blk) => {
      const nextTokens = { ...(blk.style.themeOverrideTokens ?? {}) };
      delete nextTokens[token];
      const nextStyle: BlockStyle = { ...blk.style, themeOverrideTokens: nextTokens };
      const nextContent = { ...blk.content };

      if (token === 'textColor') {
        nextStyle.useThemeTextColor = true;
        nextStyle.textColor = theme.textColor;
      } else if (token === 'backgroundColor') {
        nextStyle.backgroundMode = 'solid';
        nextStyle.backgroundColor =
          blk.style.backgroundColor === 'transparent' ? 'transparent' : defaultBg;
      } else if (token === 'borderColor') {
        nextStyle.borderColor = theme.borderColor;
      } else if (token === 'fontFamily') {
        nextStyle.fontFamily = undefined;
      } else if (token === 'accentColor') {
        if (nextContent.buttonBg !== undefined) nextContent.buttonBg = theme.accentColor;
        if (nextContent.buttonColor !== undefined) nextContent.buttonColor = theme.accentColor;
        if (nextContent.toggleButtonBg !== undefined) nextContent.toggleButtonBg = theme.accentColor;
        if (nextContent.sheetTriggerBg !== undefined) nextContent.sheetTriggerBg = theme.accentColor;
        if (nextContent.socialColor !== undefined) nextContent.socialColor = theme.accentColor;
        if (nextContent.fnbAccentColor !== undefined) nextContent.fnbAccentColor = theme.accentColor;
        if (nextContent.categoryActiveBg !== undefined) nextContent.categoryActiveBg = theme.accentColor;
      }

      const stillHasAny =
        Object.values(nextTokens).some(Boolean) ||
        nextStyle.useThemeTextColor === false ||
        nextStyle.backgroundMode === 'gradient' ||
        Boolean(nextStyle.fontFamily);

      if (!stillHasAny) {
        nextStyle.themeOverrideMode = 'global';
        nextStyle.themeOverrideTokens = undefined;
      }

      return {
        ...blk,
        style: nextStyle,
        content: nextContent,
      };
    });
  };

  return (
    <div className="p-3.5 space-y-4">
      {/* Status Banner */}
      <div
        className={`p-3 rounded-xl border space-y-2 ${
          isLocalMode
            ? 'bg-[#ECFDF6] border-[#00C98A]/50'
            : 'bg-[#F0F5FA]/70 border-[#DCE5EF]'
        }`}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <span
              className={`w-2.5 h-2.5 rounded-full shrink-0 ${
                isLocalMode ? 'bg-[#00C98A]' : 'bg-[#8FA4BF]'
              }`}
            />
            <span className="text-xs font-bold text-[#17243D] truncate">
              {isLocalMode
                ? label('tema.status.localTitle', 'Tema Komponen Disesuaikan Lokal')
                : label('tema.status.globalTitle', 'Mengikuti Tema Global')}
            </span>
          </div>
          {isLocalMode ? (
            <Sparkles className="w-3.5 h-3.5 text-[#00A873] shrink-0" />
          ) : (
            <ShieldCheck className="w-3.5 h-3.5 text-[#8FA4BF] shrink-0" />
          )}
        </div>
        <p className="text-[11px] text-[#51637D] leading-relaxed">
          {isLocalMode
            ? 'Token yang dioverride lokal tidak akan tertimpa saat Anda mengganti Tema Global di menu Home.'
            : 'Semua warna dan font komponen ini otomatis mengikuti Tema Global halaman.'}
        </p>

        <SegmentedControl
          value={status.mode}
          onChange={(val) => handleModeChange(val as 'global' | 'local')}
          options={[
            { id: 'global', label: label('tema.mode.global', 'Gunakan Tema Global') },
            { id: 'local', label: label('tema.mode.local', 'Sesuaikan Lokal') },
          ]}
        />
      </div>

      {/* 5 Token Inheritance Badges */}
      <div className="space-y-1.5">
        <div className="text-xs font-bold text-[#17243D]">
          {label('tema.sec.pewarisanToken', 'Status Pewarisan Token')}
        </div>
        <div className="grid grid-cols-5 gap-1">
          {TOKEN_BADGES.map((tb) => {
            const overridden = status.tokens[tb.key];
            const tokenLabel = label(`tema.token.${tb.key}`, tb.label);
            return (
              <button
                key={tb.key}
                type="button"
                onClick={() => {
                  if (overridden) clearSingleToken(tb.key);
                }}
                title={
                  overridden
                    ? `${tokenLabel}: Override Lokal (klik untuk ikuti global)`
                    : `${tokenLabel}: Diwarisi dari Tema Global`
                }
                className={`px-1 py-1.5 rounded-lg border text-center transition-colors ${
                  overridden
                    ? 'bg-[#ECFDF6] border-[#00C98A]/50 text-[#17243D] cursor-pointer hover:bg-[#D1FAE5]/60'
                    : 'bg-[#F0F5FA]/60 border-[#DCE5EF] text-[#8FA4BF] cursor-default'
                }`}
              >
                <div className="text-[10.5px] font-bold truncate">{tokenLabel}</div>
                <div className="text-[9.5px] font-medium truncate mt-0.5">
                  {overridden ? 'Lokal' : 'Diwarisi'}
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Local Token Override Controls */}
      <div className="space-y-3.5 pt-1 border-t border-[#DCE5EF]">
        <div className="flex items-center gap-1.5 text-xs font-bold text-[#17243D]">
          <Palette className="w-3.5 h-3.5 text-[#00C98A]" />
          <span>{label('tema.sec.pengaturanLokal', 'Pengaturan Token Lokal')}</span>
        </div>

        {/* 1. Text Color */}
        <div className="p-2.5 rounded-xl border border-[#DCE5EF] bg-white space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="text-xs font-semibold text-[#17243D]">
                {label('tema.field.warnaTeks', 'Warna Teks')}
              </div>
              <div className="text-[10.5px] text-[#8FA4BF]">
                {status.tokens.textColor ? 'Override lokal aktif' : 'Ikut warna teks global'}
              </div>
            </div>
            <ToggleSwitch
              checked={!status.tokens.textColor}
              onChange={(followGlobal) => {
                if (followGlobal) {
                  clearSingleToken('textColor');
                } else {
                  onUpdateBlock(selectedBlock.id, (blk) =>
                    withLocalThemeTokenPatch(
                      blk,
                      { useThemeTextColor: false, textColor: effectiveTextColor },
                      undefined,
                      ['textColor']
                    )
                  );
                }
              }}
              label="Ikuti warna teks tema global"
            />
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={effectiveTextColor}
              onChange={(e) =>
                onUpdateBlock(selectedBlock.id, (blk) =>
                  withLocalThemeTokenPatch(
                    blk,
                    { useThemeTextColor: false, textColor: e.target.value },
                    undefined,
                    ['textColor']
                  )
                )
              }
              className="w-8 h-8 rounded-lg border border-[#DCE5EF] bg-white p-0.5 cursor-pointer shrink-0"
            />
            <input
              type="text"
              value={effectiveTextColor}
              onChange={(e) =>
                onUpdateBlock(selectedBlock.id, (blk) =>
                  withLocalThemeTokenPatch(
                    blk,
                    { useThemeTextColor: false, textColor: e.target.value },
                    undefined,
                    ['textColor']
                  )
                )
              }
              className="flex-1 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-[#DCE5EF] bg-[#F0F5FA]/40 text-[#17243D] outline-none focus:border-[#00C98A]"
            />
          </div>
        </div>

        {/* 2. Background Color / Mode */}
        <div className="p-2.5 rounded-xl border border-[#DCE5EF] bg-white space-y-2.5">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#17243D]">
              {label('tema.field.latarKomponen', 'Latar Komponen')}
            </span>
            {status.tokens.backgroundColor && (
              <button
                type="button"
                onClick={() => clearSingleToken('backgroundColor')}
                className="text-[11px] font-semibold text-[#00A873] hover:underline cursor-pointer"
              >
                Ikuti Global
              </button>
            )}
          </div>

          <SegmentedControl
            value={
              s.backgroundMode === 'gradient'
                ? 'gradient'
                : s.backgroundColor === 'transparent'
                ? 'transparent'
                : 'solid'
            }
            onChange={(mode) => {
              if (mode === 'transparent') {
                onUpdateBlock(selectedBlock.id, (blk) =>
                  withLocalThemeTokenPatch(
                    blk,
                    { backgroundMode: 'solid', backgroundColor: 'transparent' },
                    undefined,
                    ['backgroundColor']
                  )
                );
              } else if (mode === 'solid') {
                onUpdateBlock(selectedBlock.id, (blk) =>
                  withLocalThemeTokenPatch(
                    blk,
                    { backgroundMode: 'solid', backgroundColor: effectiveBgColor },
                    undefined,
                    ['backgroundColor']
                  )
                );
              } else {
                const c1 = s.gradientColor1 || theme.accentColor || '#17243D';
                const c2 = s.gradientColor2 || '#00C98A';
                onUpdateBlock(selectedBlock.id, (blk) =>
                  withLocalThemeTokenPatch(
                    blk,
                    {
                      backgroundMode: 'gradient',
                      gradientColor1: c1,
                      gradientColor2: c2,
                      gradientAngle: s.gradientAngle ?? 135,
                    },
                    undefined,
                    ['backgroundColor']
                  )
                );
              }
            }}
            options={[
              { id: 'solid', label: 'Solid' },
              { id: 'transparent', label: 'Transparan' },
              { id: 'gradient', label: 'Gradasi' },
            ]}
          />

          {s.backgroundMode === 'gradient' ? (
            <div className="space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[10.5px] font-medium text-[#8FA4BF] mb-1">
                    Warna Awal
                  </label>
                  <input
                    type="color"
                    value={s.gradientColor1 || '#17243D'}
                    onChange={(e) =>
                      onUpdateBlock(selectedBlock.id, (blk) =>
                        withLocalThemeTokenPatch(
                          blk,
                          { backgroundMode: 'gradient', gradientColor1: e.target.value },
                          undefined,
                          ['backgroundColor']
                        )
                      )
                    }
                    className="w-full h-8 rounded-lg border border-[#DCE5EF] p-0.5 cursor-pointer"
                  />
                </div>
                <div>
                  <label className="block text-[10.5px] font-medium text-[#8FA4BF] mb-1">
                    Warna Akhir
                  </label>
                  <input
                    type="color"
                    value={s.gradientColor2 || '#00C98A'}
                    onChange={(e) =>
                      onUpdateBlock(selectedBlock.id, (blk) =>
                        withLocalThemeTokenPatch(
                          blk,
                          { backgroundMode: 'gradient', gradientColor2: e.target.value },
                          undefined,
                          ['backgroundColor']
                        )
                      )
                    }
                    className="w-full h-8 rounded-lg border border-[#DCE5EF] p-0.5 cursor-pointer"
                  />
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {GRADIENT_PRESETS.slice(0, 6).map((preset) => (
                  <button
                    key={preset.id}
                    type="button"
                    title={preset.name}
                    onClick={() =>
                      onUpdateBlock(selectedBlock.id, (blk) =>
                        withLocalThemeTokenPatch(
                          blk,
                          {
                            backgroundMode: 'gradient',
                            gradientColor1: preset.color1,
                            gradientColor2: preset.color2,
                            gradientColor3: preset.color3,
                            gradientAngle: preset.angle,
                          },
                          undefined,
                          ['backgroundColor']
                        )
                      )
                    }
                    style={{
                      background:
                        buildLinearGradientCss({
                          backgroundMode: 'gradient',
                          gradientColor1: preset.color1,
                          gradientColor2: preset.color2,
                          gradientColor3: preset.color3,
                          gradientAngle: preset.angle,
                        }) ?? preset.color1,
                    }}
                    className="w-7 h-7 rounded-lg border border-[#DCE5EF] cursor-pointer"
                  />
                ))}
              </div>
              <div>
                <div className="flex items-center justify-between text-[11px] text-[#51637D] mb-1">
                  <span>Sudut Gradasi</span>
                  <span className="font-mono font-semibold">
                    {clampGradientAngle(s.gradientAngle ?? 135)}°
                  </span>
                </div>
                <input
                  type="range"
                  min={0}
                  max={360}
                  step={15}
                  value={clampGradientAngle(s.gradientAngle ?? 135)}
                  onChange={(e) =>
                    onUpdateBlock(selectedBlock.id, (blk) =>
                      withLocalThemeTokenPatch(
                        blk,
                        { backgroundMode: 'gradient', gradientAngle: Number(e.target.value) },
                        undefined,
                        ['backgroundColor']
                      )
                    )
                  }
                  className="w-full accent-[#00C98A] cursor-pointer"
                />
              </div>
            </div>
          ) : (
            s.backgroundColor !== 'transparent' && (
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={effectiveBgColor}
                  onChange={(e) =>
                    onUpdateBlock(selectedBlock.id, (blk) =>
                      withLocalThemeTokenPatch(
                        blk,
                        { backgroundMode: 'solid', backgroundColor: e.target.value },
                        undefined,
                        ['backgroundColor']
                      )
                    )
                  }
                  className="w-8 h-8 rounded-lg border border-[#DCE5EF] bg-white p-0.5 cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  value={effectiveBgColor}
                  onChange={(e) =>
                    onUpdateBlock(selectedBlock.id, (blk) =>
                      withLocalThemeTokenPatch(
                        blk,
                        { backgroundMode: 'solid', backgroundColor: e.target.value },
                        undefined,
                        ['backgroundColor']
                      )
                    )
                  }
                  className="flex-1 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-[#DCE5EF] bg-[#F0F5FA]/40 text-[#17243D] outline-none focus:border-[#00C98A]"
                />
              </div>
            )
          )}
        </div>

        {/* 3. Border Color */}
        <div className="p-2.5 rounded-xl border border-[#DCE5EF] bg-white space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#17243D]">
              {label('tema.field.warnaGarisTepi', 'Warna Garis Tepi (Border)')}
            </span>
            {status.tokens.borderColor && (
              <button
                type="button"
                onClick={() => clearSingleToken('borderColor')}
                className="text-[11px] font-semibold text-[#00A873] hover:underline cursor-pointer"
              >
                Ikuti Global
              </button>
            )}
          </div>
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={effectiveBorderColor}
              onChange={(e) =>
                onUpdateBlock(selectedBlock.id, (blk) =>
                  withLocalThemeTokenPatch(
                    blk,
                    { borderColor: e.target.value },
                    undefined,
                    ['borderColor']
                  )
                )
              }
              className="w-8 h-8 rounded-lg border border-[#DCE5EF] bg-white p-0.5 cursor-pointer shrink-0"
            />
            <input
              type="text"
              value={effectiveBorderColor}
              onChange={(e) =>
                onUpdateBlock(selectedBlock.id, (blk) =>
                  withLocalThemeTokenPatch(
                    blk,
                    { borderColor: e.target.value },
                    undefined,
                    ['borderColor']
                  )
                )
              }
              className="flex-1 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-[#DCE5EF] bg-[#F0F5FA]/40 text-[#17243D] outline-none focus:border-[#00C98A]"
            />
          </div>
        </div>

        {/* 4. Component Accent Color */}
        {accentInfo && (
          <div className="p-2.5 rounded-xl border border-[#DCE5EF] bg-white space-y-2">
            <div className="flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-[#17243D]">{accentInfo.label}</span>
              {status.tokens.accentColor && (
                <button
                  type="button"
                  onClick={() => clearSingleToken('accentColor')}
                  className="text-[11px] font-semibold text-[#00A873] hover:underline cursor-pointer"
                >
                  Ikuti Global
                </button>
              )}
            </div>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={accentInfo.value || theme.accentColor}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, (blk) =>
                    withLocalThemeTokenPatch(
                      blk,
                      {},
                      { [accentInfo.key]: e.target.value },
                      ['accentColor']
                    )
                  )
                }
                className="w-8 h-8 rounded-lg border border-[#DCE5EF] bg-white p-0.5 cursor-pointer shrink-0"
              />
              <input
                type="text"
                value={accentInfo.value || theme.accentColor}
                onChange={(e) =>
                  onUpdateBlock(selectedBlock.id, (blk) =>
                    withLocalThemeTokenPatch(
                      blk,
                      {},
                      { [accentInfo.key]: e.target.value },
                      ['accentColor']
                    )
                  )
                }
                className="flex-1 px-2.5 py-1.5 text-xs font-mono rounded-lg border border-[#DCE5EF] bg-[#F0F5FA]/40 text-[#17243D] outline-none focus:border-[#00C98A]"
              />
            </div>
          </div>
        )}

        {/* 5. Component Font */}
        <div className="p-2.5 rounded-xl border border-[#DCE5EF] bg-white space-y-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-[#17243D]">
              {label('tema.field.jenisFontKomponen', 'Jenis Font Komponen')}
            </span>
            {status.tokens.fontFamily && (
              <button
                type="button"
                onClick={() => clearSingleToken('fontFamily')}
                className="text-[11px] font-semibold text-[#00A873] hover:underline cursor-pointer"
              >
                Ikuti Global
              </button>
            )}
          </div>
          <select
            value={s.fontFamily ?? ''}
            onChange={(e) => {
              const val = e.target.value;
              if (!val) {
                clearSingleToken('fontFamily');
              } else {
                onUpdateBlock(selectedBlock.id, (blk) =>
                  withLocalThemeTokenPatch(blk, { fontFamily: val }, undefined, ['fontFamily'])
                );
              }
            }}
            className="w-full px-2.5 py-1.5 text-xs rounded-lg border border-[#DCE5EF] bg-white text-[#17243D] outline-none focus:border-[#00C98A]"
          >
            <option value="">
              Ikuti Tema Global ({theme.fontFamily || 'Plus Jakarta Sans'})
            </option>
            {FONT_OPTIONS.map((opt) => (
              <option key={opt.id} value={opt.id}>
                {opt.label} ({opt.category})
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Explicit Reset Button */}
      <div className="pt-2 border-t border-[#DCE5EF] space-y-2">
        <button
          type="button"
          onClick={() =>
            onUpdateBlock(selectedBlock.id, (blk) => resetBlockThemeToGlobal(blk, theme))
          }
          className="w-full py-2 px-3 rounded-xl border border-[#DCE5EF] bg-white hover:bg-[#F0F5FA] hover:border-[#8FA4BF] text-[#17243D] text-xs font-semibold inline-flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5 text-[#00C98A]" />
          <span>{label('tema.action.resetGlobal', 'Kembalikan ke Tema Global')}</span>
        </button>
        <p className="text-[10.5px] text-[#8FA4BF] text-center leading-relaxed">
          Hanya mereset token visual tema. Konten, daftar item, tautan, spasi, dan interaksi tetap aman 100%.
        </p>
      </div>
    </div>
  );
}
