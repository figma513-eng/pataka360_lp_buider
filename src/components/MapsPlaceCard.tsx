import React, { useId, useState } from 'react';
import { Accessibility, Image as ImageIcon, ImageOff, MapPin, Navigation, X } from 'lucide-react';
import { TextAlign } from '../types/builder';
import { sanitizeExternalUrl } from '../utils/urlHelpers';

interface MapsPlaceCardProps {
  photoUrl: string;
  photoBadgeLabel?: string;
  photoRatio?: '16/9' | '4/3' | '4/5' | '1/1';
  title: string;
  rating?: number;
  reviewCount?: string;
  service?: string;
  accessible?: boolean;
  servicesList?: string;
  address?: string;
  mapsUrl?: string;
  buttonLabel?: string;
  borderRadius: number;
  textColor: string;
  borderColor: string;
  accentColor: string;
  align: TextAlign;
  imageZoom?: number;
  isEditor?: boolean;
}

function StarRating({ rating }: { rating: number }) {
  const uid = useId().replace(/:/g, '');
  const clamped = Math.max(0, Math.min(5, rating));

  return (
    <div className="inline-flex items-center gap-0.5" aria-label={`Rating ${clamped} dari 5`}>
      {[0, 1, 2, 3, 4].map((idx) => {
        const fillPercent = Math.max(0, Math.min(1, clamped - idx)) * 100;
        const gradId = `star_${uid}_${idx}`;
        return (
          <svg
            key={idx}
            viewBox="0 0 20 20"
            className="w-3.5 h-3.5 shrink-0"
            aria-hidden="true"
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
                <stop offset={`${fillPercent}%`} stopColor="#FBBF24" />
                <stop offset={`${fillPercent}%`} stopColor="#E2E8F0" />
              </linearGradient>
            </defs>
            <path
              fill={`url(#${gradId})`}
              d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.967a1 1 0 00.95.69h4.17c.969 0 1.371 1.24.588 1.81l-3.374 2.45a1 1 0 00-.364 1.118l1.287 3.966c.3.922-.755 1.688-1.54 1.118l-3.374-2.45a1 1 0 00-1.176 0l-3.374 2.45c-.784.57-1.838-.196-1.539-1.118l1.287-3.966a1 1 0 00-.364-1.118L2.05 9.394c-.783-.57-.38-1.81.588-1.81h4.17a1 1 0 00.95-.69l1.29-3.967z"
            />
          </svg>
        );
      })}
    </div>
  );
}

export function MapsPlaceCard({
  photoUrl,
  photoBadgeLabel = 'Lihat foto',
  photoRatio = '16/9',
  title,
  rating = 4.9,
  reviewCount = '1.643',
  service = 'Layanan Satpam',
  accessible = true,
  servicesList = '',
  address = '',
  mapsUrl = '',
  buttonLabel = 'Buka di Google Maps',
  borderRadius,
  textColor,
  borderColor,
  accentColor,
  align,
  imageZoom = 100,
  isEditor = false,
}: MapsPlaceCardProps) {
  const [imgError, setImgError] = useState(false);
  const [lightboxOpen, setLightboxOpen] = useState(false);

  const formattedRating = Number.isFinite(rating)
    ? rating.toFixed(1).replace('.', ',')
    : '4,9';

  const serviceTags = servicesList
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);

  const cleanMapsUrl = sanitizeExternalUrl(mapsUrl, '');
  const alignClass =
    align === 'center' ? 'text-center items-center' : align === 'right' ? 'text-right items-end' : 'text-left items-start';
  const rowJustify =
    align === 'center' ? 'justify-center' : align === 'right' ? 'justify-end' : 'justify-start';
  const topRadius = Math.max(0, borderRadius - 1);

  return (
    <div style={{ color: textColor }} className="w-full overflow-hidden">
      {/* Foto Lokasi Maps */}
      <div
        data-canvas-sublayer="maps_photo"
        className="relative w-full bg-slate-200 overflow-hidden"
        style={{
          aspectRatio: photoRatio,
          borderTopLeftRadius: `${topRadius}px`,
          borderTopRightRadius: `${topRadius}px`,
        }}
      >
        {!photoUrl || imgError ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400 bg-slate-100">
            <ImageOff className="w-6 h-6" />
            <span className="text-xs">Foto lokasi belum tersedia</span>
          </div>
        ) : (
          <img
            src={photoUrl}
            alt={title || 'Foto Lokasi Maps'}
            referrerPolicy="no-referrer"
            onError={() => setImgError(true)}
            style={
              typeof imageZoom === 'number' && Number.isFinite(imageZoom) && imageZoom !== 100
                ? {
                    transform: `scale(${Math.max(50, Math.min(250, imageZoom)) / 100})`,
                    transformOrigin: 'center center',
                    transition: 'transform 160ms ease',
                  }
                : undefined
            }
            className="w-full h-full object-cover block"
          />
        )}

        {photoBadgeLabel.trim() && (
          <button
            type="button"
            onClick={(e) => {
              if (!isEditor && photoUrl && !imgError) {
                e.stopPropagation();
                setLightboxOpen(true);
              }
            }}
            className={`absolute bottom-3 left-3 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-900/75 text-white text-xs font-medium backdrop-blur-xs shadow-sm ${
              isEditor ? 'cursor-default' : 'hover:bg-slate-900/90 cursor-pointer'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            <span>{photoBadgeLabel}</span>
          </button>
        )}
      </div>

      {/* Info Lokasi, Bintang & Layanan */}
      <div
        data-canvas-sublayer="maps_info"
        className={`px-4 py-3.5 flex flex-col gap-1.5 ${alignClass}`}
      >
        <div className="text-base font-bold leading-snug tracking-tight">
          {title || 'Nama Lokasi'}
        </div>

        {/* Rating Bintang & Ulasan */}
        <div className={`flex flex-wrap items-center gap-1.5 text-xs ${rowJustify}`}>
          <span className="font-medium tabular-nums opacity-85">{formattedRating}</span>
          <StarRating rating={rating} />
          {reviewCount.trim() && (
            <span className="opacity-70 tabular-nums">({reviewCount})</span>
          )}
        </div>

        {/* Kategori Layanan & Aksesibilitas */}
        {(service.trim() || accessible) && (
          <div className={`flex flex-wrap items-center gap-1.5 text-xs opacity-80 ${rowJustify}`}>
            {service.trim() && <span>{service}</span>}
            {service.trim() && accessible && <span>·</span>}
            {accessible && (
              <span
                title="Akses ramah kursi roda"
                className="inline-flex items-center text-blue-600"
              >
                <Accessibility className="w-3.5 h-3.5" />
              </span>
            )}
          </div>
        )}

        {/* Daftar Layanan Tambahan */}
        {serviceTags.length > 0 && (
          <div className={`flex flex-wrap gap-1.5 pt-1 ${rowJustify}`}>
            {serviceTags.map((tag, i) => (
              <span
                key={`${tag}_${i}`}
                style={{ borderColor }}
                className="px-2 py-0.5 rounded-md border bg-slate-500/5 text-[11px] font-medium opacity-90"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {/* Alamat / Jam Buka */}
        {address.trim() && (
          <div className={`flex items-start gap-1.5 text-[11px] opacity-75 pt-0.5 ${rowJustify}`}>
            <MapPin className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{address}</span>
          </div>
        )}

        {/* Tombol Buka Google Maps */}
        {cleanMapsUrl && buttonLabel.trim() && (
          <div data-canvas-sublayer="maps_action" className="w-full pt-2 rounded-lg">
            {isEditor ? (
              <div
                style={{ backgroundColor: accentColor }}
                className="w-full py-2 px-3 rounded-lg text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{buttonLabel}</span>
              </div>
            ) : (
              <a
                href={cleanMapsUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={{ backgroundColor: accentColor }}
                className="w-full py-2 px-3 rounded-lg text-white text-xs font-semibold inline-flex items-center justify-center gap-1.5 hover:opacity-90 transition-opacity"
              >
                <Navigation className="w-3.5 h-3.5" />
                <span>{buttonLabel}</span>
              </a>
            )}
          </div>
        )}
      </div>

      {/* Lightbox Lihat Foto saat Preview */}
      {!isEditor && lightboxOpen && photoUrl && (
        <div
          onClick={() => setLightboxOpen(false)}
          className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-xs flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-lg w-full rounded-2xl overflow-hidden bg-slate-900 shadow-2xl"
          >
            <button
              type="button"
              onClick={() => setLightboxOpen(false)}
              aria-label="Tutup foto"
              className="absolute top-3 right-3 z-10 w-8 h-8 rounded-full bg-slate-900/80 text-white flex items-center justify-center hover:bg-slate-900 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
            <img
              src={photoUrl}
              alt={title || 'Foto Lokasi'}
              referrerPolicy="no-referrer"
              className="w-full max-h-[75vh] object-contain block"
            />
            {title && (
              <div className="px-4 py-2.5 bg-slate-900 text-white text-xs font-semibold">
                {title}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
