import type { BuilderBlock } from '../../types/builder';
import { useUiLabel } from '../../contexts/UiLabelsContext';

interface ContainerSliderControlsProps {
  selectedBlock: BuilderBlock;
  onUpdateBlock: (id: string, updater: (block: BuilderBlock) => BuilderBlock) => void;
}

export function ContainerSliderControls({
  selectedBlock,
  onUpdateBlock,
}: ContainerSliderControlsProps) {
  const { label, isVisible } = useUiLabel();
  const mode = selectedBlock.content.containerLayoutMode || 'normal';
  const isSlider = mode === 'slider_horizontal' || mode === 'slider_vertical';

  const patchContent = (patch: Partial<BuilderBlock['content']>) => {
    onUpdateBlock(selectedBlock.id, (blk) => ({
      ...blk,
      content: { ...blk.content, ...patch },
    }));
  };

  const showTitle = isVisible('konten.field.modeWadahIndukAnak');
  const showDesc = isVisible('konten.desc.modeWadahIndukAnak');

  const modeOptions = (
    [
      {
        id: 'normal',
        key: 'konten.opt.wadahNormal',
        fallback: 'Normal',
      },
      {
        id: 'slider_horizontal',
        key: 'konten.opt.wadahSliderHorizontal',
        fallback: 'Slider Horizontal',
      },
      {
        id: 'slider_vertical',
        key: 'konten.opt.wadahSliderVertikal',
        fallback: 'Slider Vertikal',
      },
    ] as const
  ).filter((item) => isVisible(item.key));

  // If the entire block header + description + all mode options are hidden, hide container cleanly
  if (!showTitle && !showDesc && modeOptions.length === 0) {
    return null;
  }

  return (
    <div className="p-2.5 rounded-xl border border-[#DCE5EF] bg-[#F8FBFE] space-y-2.5">
      {(showTitle || showDesc) && (
        <div>
          {showTitle && (
            <div className="text-[11px] font-bold text-[#17243D]">
              {label('konten.field.modeWadahIndukAnak', 'Mode Wadah Induk–Anak')}
            </div>
          )}
          {showDesc && (
            <p className="text-[10px] text-[#51637D] mt-0.5">
              {label(
                'konten.desc.modeWadahIndukAnak',
                'Ubah wadah menjadi Slider Horizontal atau Vertikal tanpa merusak komponen anak di dalamnya.'
              )}
            </p>
          )}
        </div>
      )}

      {modeOptions.length > 0 && (
        <div
          className={`grid gap-1 ${
            modeOptions.length === 1
              ? 'grid-cols-1'
              : modeOptions.length === 2
              ? 'grid-cols-2'
              : 'grid-cols-3'
          }`}
        >
          {modeOptions.map((item) => {
            const active = mode === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => patchContent({ containerLayoutMode: item.id })}
                className={`px-1.5 py-1.5 rounded-lg text-[10px] font-semibold border transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#17243D] text-white border-[#17243D]'
                    : 'bg-white text-[#51637D] border-[#DCE5EF] hover:text-[#17243D]'
                }`}
              >
                {label(item.key, item.fallback)}
              </button>
            );
          })}
        </div>
      )}

      {isSlider && (
        <div className="space-y-2 pt-1.5 border-t border-[#DCE5EF]">
          {(isVisible('konten.field.sliderJumlahItem') ||
            isVisible('konten.field.sliderJarakItem')) && (
            <div className="grid grid-cols-2 gap-2">
              {isVisible('konten.field.sliderJumlahItem') && (
                <div>
                  <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                    {label('konten.field.sliderJumlahItem', 'Jumlah Item Terlihat')}
                  </label>
                  <input
                    type="number"
                    min={1}
                    max={6}
                    step={0.5}
                    value={selectedBlock.content.sliderVisibleItems ?? 1}
                    onChange={(e) =>
                      patchContent({
                        sliderVisibleItems: Math.max(1, Math.min(6, Number(e.target.value) || 1)),
                      })
                    }
                    className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                  />
                </div>
              )}
              {isVisible('konten.field.sliderJarakItem') && (
                <div>
                  <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                    {label('konten.field.sliderJarakItem', 'Jarak Antaritem (px)')}
                  </label>
                  <input
                    type="number"
                    min={0}
                    max={48}
                    value={selectedBlock.content.sliderGap ?? 12}
                    onChange={(e) =>
                      patchContent({
                        sliderGap: Math.max(0, Math.min(48, Number(e.target.value) || 0)),
                      })
                    }
                    className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                  />
                </div>
              )}
            </div>
          )}

          {(isVisible('konten.field.sliderKecepatan') ||
            isVisible('konten.field.sliderTransisi')) && (
            <div className="grid grid-cols-2 gap-2">
              {isVisible('konten.field.sliderKecepatan') && (
                <div>
                  <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                    {label('konten.field.sliderKecepatan', 'Kecepatan (ms)')}
                  </label>
                  <input
                    type="number"
                    min={100}
                    max={3000}
                    step={50}
                    value={selectedBlock.content.sliderSpeedMs ?? 350}
                    onChange={(e) =>
                      patchContent({
                        sliderSpeedMs: Math.max(100, Math.min(3000, Number(e.target.value) || 350)),
                      })
                    }
                    className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                  />
                </div>
              )}
              {isVisible('konten.field.sliderTransisi') && (
                <div>
                  <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                    {label('konten.field.sliderTransisi', 'Transisi')}
                  </label>
                  <select
                    value={selectedBlock.content.sliderTransition ?? 'smooth'}
                    onChange={(e) =>
                      patchContent({
                        sliderTransition: e.target.value as 'smooth' | 'fade' | 'instant',
                      })
                    }
                    className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
                  >
                    <option value="smooth">Halus</option>
                    <option value="fade">Memudar</option>
                    <option value="instant">Instan</option>
                  </select>
                </div>
              )}
            </div>
          )}

          {isVisible('konten.field.sliderLuapan') && (
            <div>
              <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                {label('konten.field.sliderLuapan', 'Luapan Konten')}
              </label>
              <select
                value={selectedBlock.content.sliderOverflow ?? 'hidden'}
                onChange={(e) =>
                  patchContent({
                    sliderOverflow: e.target.value as 'hidden' | 'visible' | 'auto',
                  })
                }
                className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
              >
                <option value="hidden">Tersembunyi (Rapi)</option>
                <option value="visible">Terlihat (Tampil sebagian)</option>
                <option value="auto">Otomatis</option>
              </select>
            </div>
          )}

          <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10.5px]">
            {isVisible('konten.field.sliderTombolNav') && (
              <label className="flex items-center gap-1.5 text-[#17243D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedBlock.content.sliderShowArrows !== false}
                  onChange={(e) => patchContent({ sliderShowArrows: e.target.checked })}
                  className="accent-[#00C98A]"
                />
                <span>{label('konten.field.sliderTombolNav', 'Tombol Navigasi')}</span>
              </label>
            )}
            {isVisible('konten.field.sliderTitikNav') && (
              <label className="flex items-center gap-1.5 text-[#17243D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedBlock.content.sliderShowDots !== false}
                  onChange={(e) => patchContent({ sliderShowDots: e.target.checked })}
                  className="accent-[#00C98A]"
                />
                <span>{label('konten.field.sliderTitikNav', 'Titik Navigasi')}</span>
              </label>
            )}
            <label className="flex items-center gap-1.5 text-[#17243D] cursor-pointer">
              <input
                type="checkbox"
                checked={Boolean(selectedBlock.content.sliderShowScrollbar)}
                onChange={(e) => patchContent({ sliderShowScrollbar: e.target.checked })}
                className="accent-[#00C98A]"
              />
              <span>{label('konten.field.sliderScrollbar', 'Tampilkan Scrollbar')}</span>
            </label>
            {isVisible('konten.field.sliderLoop') && (
              <label className="flex items-center gap-1.5 text-[#17243D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(selectedBlock.content.sliderLoop)}
                  onChange={(e) => patchContent({ sliderLoop: e.target.checked })}
                  className="accent-[#00C98A]"
                />
                <span>{label('konten.field.sliderLoop', 'Pengulangan')}</span>
              </label>
            )}
            {isVisible('konten.field.sliderAutoplay') && (
              <label className="flex items-center gap-1.5 text-[#17243D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={Boolean(selectedBlock.content.sliderAutoplay)}
                  onChange={(e) => patchContent({ sliderAutoplay: e.target.checked })}
                  className="accent-[#00C98A]"
                />
                <span>{label('konten.field.sliderAutoplay', 'Putar Otomatis')}</span>
              </label>
            )}
            {isVisible('konten.field.sliderTouchSwipe') && (
              <label className="flex items-center gap-1.5 text-[#17243D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedBlock.content.sliderTouchSwipe !== false}
                  onChange={(e) => patchContent({ sliderTouchSwipe: e.target.checked })}
                  className="accent-[#00C98A]"
                />
                <span>{label('konten.field.sliderTouchSwipe', 'Geser Sentuhan')}</span>
              </label>
            )}
            {isVisible('konten.field.sliderMouseDrag') && (
              <label className="flex items-center gap-1.5 text-[#17243D] cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedBlock.content.sliderMouseDrag !== false}
                  onChange={(e) => patchContent({ sliderMouseDrag: e.target.checked })}
                  className="accent-[#00C98A]"
                />
                <span>{label('konten.field.sliderMouseDrag', 'Geser Mouse')}</span>
              </label>
            )}
            {isVisible('konten.field.sliderSnap') && (
              <label className="flex items-center gap-1.5 text-[#17243D] cursor-pointer col-span-2">
                <input
                  type="checkbox"
                  checked={selectedBlock.content.sliderSnap !== false}
                  onChange={(e) => patchContent({ sliderSnap: e.target.checked })}
                  className="accent-[#00C98A]"
                />
                <span>
                  {label('konten.field.sliderSnap', 'Snap (Berhenti pas di setiap item)')}
                </span>
              </label>
            )}
          </div>

          {selectedBlock.content.sliderAutoplay && isVisible('konten.field.sliderInterval') && (
            <div>
              <label className="text-[10px] font-semibold text-[#51637D] block mb-0.5">
                {label('konten.field.sliderInterval', 'Interval Putar Otomatis (ms)')}
              </label>
              <input
                type="number"
                min={1000}
                max={20000}
                step={500}
                value={selectedBlock.content.sliderAutoplayIntervalMs ?? 3500}
                onChange={(e) =>
                  patchContent({
                    sliderAutoplayIntervalMs: Math.max(
                      1000,
                      Math.min(20000, Number(e.target.value) || 3500)
                    ),
                  })
                }
                className="w-full px-2 py-1 text-[11px] bg-white border border-[#DCE5EF] rounded-md"
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
