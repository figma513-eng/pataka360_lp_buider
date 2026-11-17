import React, { useEffect, useMemo, useState } from 'react';
import {
  CalendarClock,
  CheckSquare,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  ImageOff,
  Layers,
  MessageCircle,
  Sparkles,
  Tag,
} from 'lucide-react';
import {
  BlockContent,
  TextAlign,
} from '../types/builder';
import {
  buildTrainingWhatsappUrl,
  resolveTrainingFormFields,
} from '../utils/cartHelpers';
import { formatRichHtmlWithSpacing } from '../utils/richTextHelpers';

interface TrainingCatalogCardProps {
  content: BlockContent;
  borderRadius: number;
  cardBg: string;
  borderColor: string;
  textColor: string;
  accentColor: string;
  align?: TextAlign;
  isEditor?: boolean;
  onTrackWaClick?: (label: string, href: string, orderValue?: number) => void;
}

export function TrainingCatalogCard({
  content,
  borderRadius,
  cardBg,
  borderColor,
  textColor,
  accentColor,
  align = 'left',
  isEditor = false,
  onTrackWaClick,
}: TrainingCatalogCardProps) {
  const programs = content.trainingPrograms ?? [];
  const customBoxes = content.trainingCustomBoxes ?? [];
  const mediaList = content.trainingMedia ?? [];
  const checklistItems = (content.trainingChecklistItems ?? []).filter((x) => x.trim());
  const formFields = useMemo(() => resolveTrainingFormFields(content), [content]);
  const mediaRatio = content.trainingMediaRatio ?? '16/9';

  const [selectedProgramIdx, setSelectedProgramIdx] = useState(0);
  const [activeMediaIdx, setActiveMediaIdx] = useState(0);
  const [isExpanded, setIsExpanded] = useState(Boolean(content.trainingDefaultExpanded));
  const [checkedMap, setCheckedMap] = useState<Record<number, boolean>>({});
  const [formValues, setFormValues] = useState<Record<string, string>>({});
  const [brokenMedia, setBrokenMedia] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setIsExpanded(Boolean(content.trainingDefaultExpanded));
  }, [content.trainingDefaultExpanded]);

  const safeProgramIdx =
    programs.length > 0 ? Math.min(selectedProgramIdx, programs.length - 1) : 0;
  const activeProgram = programs[safeProgramIdx] ?? null;

  const safeMediaIdx =
    mediaList.length > 0 ? Math.min(activeMediaIdx, mediaList.length - 1) : 0;
  const activeMedia = mediaList[safeMediaIdx] ?? null;

  const checkedList = checklistItems.filter((_, idx) => Boolean(checkedMap[idx]));
  const checklistStatus = checklistItems.map((itemText, idx) => ({
    label: itemText,
    checked: Boolean(checkedMap[idx]),
  }));
  const formEntries = formFields.map((f) => ({
    label: f.label,
    value: formValues[f.id] ?? '',
  }));

  const waUrl = buildTrainingWhatsappUrl({
    phone: content.trainingWaNumber,
    heading: content.trainingHeading,
    batch: content.trainingBatch,
    schedule: content.trainingSchedule,
    intro: content.trainingWaIntro,
    program: activeProgram,
    checklistStatus,
    formEntries,
  });

  const waLabel = content.trainingWaButtonLabel?.trim() || 'Konsultasi via WhatsApp';
  const expandLabel = content.trainingExpandLabel?.trim() || 'Selengkapnya';
  const collapseLabel = content.trainingCollapseLabel?.trim() || 'Tutup Detail';

  const activeProgramDescHtml = useMemo(
    () => (activeProgram?.description ? formatRichHtmlWithSpacing(activeProgram.description, 4) : ''),
    [activeProgram?.description]
  );

  const hasSummaryPricing = Boolean(
    activeProgram &&
      (activeProgram.price?.trim() ||
        activeProgram.originalPrice?.trim() ||
        activeProgram.discountLabel?.trim() ||
        activeProgram.cashbackLabel?.trim())
  );

  return (
    <div
      style={{
        color: textColor,
        textAlign: align,
      }}
      className="w-full space-y-3"
    >
      {/* Header: Nama Pelatihan, Angkatan, Jadwal */}
      {(content.trainingHeading?.trim() ||
        content.trainingBatch?.trim() ||
        content.trainingSchedule?.trim()) && (
        <div className="space-y-1.5">
          {content.trainingHeading?.trim() && (
            <div className="flex items-center gap-2">
              <span
                style={{ backgroundColor: `${accentColor}1A`, color: accentColor }}
                className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
              >
                <GraduationCap className="w-4 h-4" />
              </span>
              <h3 className="text-[15px] font-bold leading-snug">
                {content.trainingHeading.trim()}
              </h3>
            </div>
          )}

          {(content.trainingBatch?.trim() || content.trainingSchedule?.trim()) && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11.5px] opacity-80">
              {content.trainingBatch?.trim() && (
                <span className="inline-flex items-center gap-1 font-medium">
                  <Layers className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
                  <span>{content.trainingBatch.trim()}</span>
                </span>
              )}
              {content.trainingSchedule?.trim() && (
                <span className="inline-flex items-center gap-1">
                  <CalendarClock className="w-3.5 h-3.5 shrink-0" style={{ color: accentColor }} />
                  <span>{content.trainingSchedule.trim()}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Foto Pelatihan Carousel */}
      {mediaList.length > 0 && activeMedia && (
        <div
          style={{
            borderColor,
            borderRadius: `${Math.max(10, borderRadius - 4)}px`,
            backgroundColor: cardBg,
          }}
          className="border overflow-hidden"
        >
          <div className="relative bg-slate-100" style={{ aspectRatio: mediaRatio }}>
            {mediaList.length > 1 && (
              <span className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full bg-slate-900/65 text-white text-[10px] font-semibold tabular-nums">
                {safeMediaIdx + 1} / {mediaList.length}
              </span>
            )}

            {!activeMedia.imageUrl || brokenMedia[activeMedia.id] ? (
              <div className="w-full h-full flex items-center justify-center text-slate-400">
                <ImageOff className="w-6 h-6" />
              </div>
            ) : (
              <img
                src={activeMedia.imageUrl}
                alt={activeMedia.caption || 'Foto pelatihan'}
                referrerPolicy="no-referrer"
                onError={() =>
                  setBrokenMedia((prev) => ({ ...prev, [activeMedia.id]: true }))
                }
                className="w-full h-full object-cover block"
              />
            )}

            {mediaList.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Slide sebelumnya"
                  onClick={(e) => {
                    if (isEditor) e.stopPropagation();
                    setActiveMediaIdx((prev) =>
                      prev <= 0 ? mediaList.length - 1 : prev - 1
                    );
                  }}
                  className="absolute left-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 text-slate-800 border border-slate-200 flex items-center justify-center shadow-sm cursor-pointer hover:bg-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Slide berikutnya"
                  onClick={(e) => {
                    if (isEditor) e.stopPropagation();
                    setActiveMediaIdx((prev) =>
                      prev >= mediaList.length - 1 ? 0 : prev + 1
                    );
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 w-7 h-7 rounded-full bg-white/90 text-slate-800 border border-slate-200 flex items-center justify-center shadow-sm cursor-pointer hover:bg-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {activeMedia.caption?.trim() && (
            <div className="p-2.5 border-t" style={{ borderColor }}>
              <p className="text-[11.5px] opacity-85 leading-snug">
                {activeMedia.caption.trim()}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Ringkasan Biaya Pelatihan (Potongan, Cashback, dll) */}
      {hasSummaryPricing && activeProgram && (
        <div
          style={{
            borderColor,
            backgroundColor: `${accentColor}0E`,
            borderRadius: `${Math.max(10, borderRadius - 4)}px`,
          }}
          className="border p-2.5 space-y-1.5"
        >
          <div className="text-[10.5px] font-semibold uppercase tracking-wide opacity-70">
            Biaya Pelatihan
          </div>
          <div className="flex flex-wrap items-baseline gap-2">
            {activeProgram.originalPrice?.trim() && (
              <span className="text-xs line-through opacity-55 tabular-nums">
                {activeProgram.originalPrice.trim()}
              </span>
            )}
            {activeProgram.price?.trim() && (
              <span
                style={{ color: accentColor }}
                className="text-base font-extrabold tabular-nums"
              >
                {activeProgram.price.trim()}
              </span>
            )}
          </div>
          {(activeProgram.discountLabel?.trim() || activeProgram.cashbackLabel?.trim()) && (
            <div className="flex flex-wrap gap-1.5">
              {activeProgram.discountLabel?.trim() && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/12 text-rose-700 text-[11px] font-bold">
                  <Tag className="w-3 h-3" />
                  <span>{activeProgram.discountLabel.trim()}</span>
                </span>
              )}
              {activeProgram.cashbackLabel?.trim() && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 text-[11px] font-bold">
                  <Sparkles className="w-3 h-3" />
                  <span>{activeProgram.cashbackLabel.trim()}</span>
                </span>
              )}
            </div>
          )}
        </div>
      )}

      {/* Deskripsi Singkat Card Utama */}
      {content.trainingSubheading?.trim() && (
        <p className="text-xs opacity-80 leading-relaxed whitespace-pre-line">
          {content.trainingSubheading.trim()}
        </p>
      )}

      {/* Tombol Selengkapnya (Show / Hide Wadah Detail) */}
      <button
        type="button"
        onClick={(e) => {
          if (isEditor) e.stopPropagation();
          setIsExpanded((prev) => !prev);
        }}
        style={{
          borderColor: accentColor,
          color: isExpanded ? '#FFFFFF' : accentColor,
          backgroundColor: isExpanded ? accentColor : 'transparent',
          borderRadius: `${Math.max(10, borderRadius - 4)}px`,
        }}
        className="w-full py-2 px-3.5 border text-xs font-bold flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
      >
        <span>{isExpanded ? collapseLabel : expandLabel}</span>
        <ChevronDown
          className={`w-4 h-4 transition-transform duration-200 ${
            isExpanded ? 'rotate-180' : ''
          }`}
        />
      </button>

      {/* Wadah Show / Hide Detail Pelatihan */}
      {isExpanded && (
        <div
          style={{ borderColor }}
          className="pt-3 border-t space-y-3"
        >
          {/* Pilihan Program jika > 1 */}
          {programs.length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {programs.map((prog, idx) => {
                const active = idx === safeProgramIdx;
                return (
                  <button
                    key={prog.id}
                    type="button"
                    onClick={(e) => {
                      if (isEditor) e.stopPropagation();
                      setSelectedProgramIdx(idx);
                    }}
                    style={
                      active
                        ? {
                            backgroundColor: accentColor,
                            borderColor: accentColor,
                            color: '#FFFFFF',
                          }
                        : {
                            backgroundColor: 'transparent',
                            borderColor,
                            color: textColor,
                          }
                    }
                    className="px-2.5 py-1.5 rounded-lg border text-[11px] font-semibold cursor-pointer transition-colors"
                  >
                    {prog.title}
                  </button>
                );
              })}
            </div>
          )}

          {/* Card Promo, Program & Detail Harga */}
          {activeProgram && (
            <div
              style={{
                borderColor,
                borderRadius: `${Math.max(10, borderRadius - 4)}px`,
              }}
              className="border p-3 space-y-2.5"
            >
              <div className="space-y-1">
                {activeProgram.badge?.trim() && (
                  <span
                    style={{ backgroundColor: accentColor }}
                    className="inline-block px-2 py-0.5 rounded text-[10px] font-bold text-white"
                  >
                    {activeProgram.badge.trim()}
                  </span>
                )}
                <div className="text-sm font-bold leading-snug">{activeProgram.title}</div>
                {activeProgram.subtitle?.trim() && (
                  <div className="text-xs opacity-75 leading-snug">
                    {activeProgram.subtitle.trim()}
                  </div>
                )}
              </div>

              {activeProgramDescHtml && (
                <div
                  className="text-xs leading-relaxed opacity-90"
                  dangerouslySetInnerHTML={{ __html: activeProgramDescHtml }}
                />
              )}

              {(activeProgram.price?.trim() ||
                activeProgram.originalPrice?.trim() ||
                activeProgram.discountLabel?.trim() ||
                activeProgram.cashbackLabel?.trim()) && (
                <div
                  style={{ borderColor, backgroundColor: `${accentColor}0E` }}
                  className="rounded-xl border p-2.5 space-y-1.5"
                >
                  <div className="flex flex-wrap items-baseline gap-2">
                    {activeProgram.originalPrice?.trim() && (
                      <span className="text-xs line-through opacity-55 tabular-nums">
                        {activeProgram.originalPrice.trim()}
                      </span>
                    )}
                    {activeProgram.price?.trim() && (
                      <span
                        style={{ color: accentColor }}
                        className="text-base font-extrabold tabular-nums"
                      >
                        {activeProgram.price.trim()}
                      </span>
                    )}
                  </div>

                  {(activeProgram.discountLabel?.trim() || activeProgram.cashbackLabel?.trim()) && (
                    <div className="flex flex-wrap gap-1.5">
                      {activeProgram.discountLabel?.trim() && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-rose-500/12 text-rose-700 text-[11px] font-bold">
                          <Tag className="w-3 h-3" />
                          <span>{activeProgram.discountLabel.trim()}</span>
                        </span>
                      )}
                      {activeProgram.cashbackLabel?.trim() && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-700 text-[11px] font-bold">
                          <Sparkles className="w-3 h-3" />
                          <span>{activeProgram.cashbackLabel.trim()}</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Box Deskripsi & Konten Tambahan */}
          {customBoxes.map((box) => {
            const formattedHtml = formatRichHtmlWithSpacing(
              box.contentHtml,
              box.paragraphGap ?? 6
            );
            if (!box.title?.trim() && !formattedHtml) return null;
            return (
              <div
                key={box.id}
                style={{
                  borderColor,
                  borderRadius: `${Math.max(10, borderRadius - 4)}px`,
                }}
                className={
                  box.showBorder !== false
                    ? 'border p-3 space-y-1.5'
                    : 'py-1 space-y-1.5'
                }
              >
                {box.title?.trim() && (
                  <div className="text-xs font-bold leading-snug">{box.title.trim()}</div>
                )}
                {formattedHtml && (
                  <div
                    style={{
                      fontWeight: box.defaultFontWeight === 'bold' ? 700 : 400,
                      fontStyle: box.defaultFontStyle === 'italic' ? 'italic' : 'normal',
                      color: box.textColor?.trim() || textColor,
                      lineHeight: box.lineHeight ?? 1.6,
                    }}
                    className="text-xs"
                    dangerouslySetInnerHTML={{ __html: formattedHtml }}
                  />
                )}
              </div>
            );
          })}

          {/* Checklist Syarat Berkas */}
          {checklistItems.length > 0 && (
            <div
              style={{
                borderColor,
                borderRadius: `${Math.max(10, borderRadius - 4)}px`,
              }}
              className="border p-3 space-y-2"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-1.5 text-xs font-bold">
                  <CheckSquare className="w-3.5 h-3.5" style={{ color: accentColor }} />
                  <span>{content.trainingChecklistTitle?.trim() || 'Checklist Syarat Berkas'}</span>
                </div>
                <span className="text-[10.5px] font-semibold opacity-70 tabular-nums">
                  {checkedList.length}/{checklistItems.length} siap
                </span>
              </div>
              <div className="space-y-1.5">
                {checklistItems.map((itemText, idx) => {
                  const checked = Boolean(checkedMap[idx]);
                  return (
                    <label
                      key={`chk_${idx}`}
                      onClick={(e) => {
                        if (isEditor) e.stopPropagation();
                      }}
                      style={{
                        borderColor: checked ? '#10B981' : borderColor,
                        backgroundColor: checked ? 'rgba(16, 185, 129, 0.08)' : 'transparent',
                      }}
                      className="flex items-start gap-2 p-2 rounded-lg border cursor-pointer transition-colors"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        disabled={isEditor}
                        onChange={(e) =>
                          setCheckedMap((prev) => ({ ...prev, [idx]: e.target.checked }))
                        }
                        className="mt-0.5 shrink-0 accent-emerald-600 cursor-pointer"
                      />
                      <span className="text-xs leading-snug">{itemText}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          )}

          {/* Formulir Dinamis (Nama, Alamat, + Tambah Kolom) */}
          <div
            style={{
              borderColor,
              borderRadius: `${Math.max(10, borderRadius - 4)}px`,
            }}
            className="border p-3 space-y-2.5"
          >
            <div className="text-xs font-bold">
              {content.trainingFormTitle?.trim() || 'Formulir Pendaftaran / Konsultasi'}
            </div>
            <div className="space-y-2">
              {formFields.map((field) => (
                <div key={field.id} className="space-y-1">
                  <label className="block text-[11px] font-semibold opacity-80">
                    {field.label}
                    {field.required ? ' *' : ''}
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      rows={2}
                      readOnly={isEditor}
                      value={formValues[field.id] ?? ''}
                      placeholder={field.placeholder}
                      onClick={(e) => {
                        if (isEditor) e.stopPropagation();
                      }}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      style={{ borderColor }}
                      className="w-full px-2.5 py-1.5 rounded-lg border bg-transparent text-xs outline-none resize-none"
                    />
                  ) : (
                    <input
                      type={field.type}
                      readOnly={isEditor}
                      value={formValues[field.id] ?? ''}
                      placeholder={field.placeholder}
                      onClick={(e) => {
                        if (isEditor) e.stopPropagation();
                      }}
                      onChange={(e) =>
                        setFormValues((prev) => ({ ...prev, [field.id]: e.target.value }))
                      }
                      style={{ borderColor }}
                      className="w-full px-2.5 py-1.5 rounded-lg border bg-transparent text-xs outline-none"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Tombol Konsultasi via WA */}
            {isEditor ? (
              <div className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm">
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>{waLabel}</span>
              </div>
            ) : (
              <a
                href={waUrl}
                target="_blank"
                rel="noopener noreferrer"
                data-wa-tracked="1"
                onClick={() => {
                  const rawNum = activeProgram?.price
                    ? Number(String(activeProgram.price).replace(/[^\d]/g, ''))
                    : 0;
                  onTrackWaClick?.(waLabel, waUrl, rawNum > 0 ? rawNum : undefined);
                }}
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-sm transition-colors"
              >
                <MessageCircle className="w-4 h-4 shrink-0" />
                <span>{waLabel}</span>
              </a>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
