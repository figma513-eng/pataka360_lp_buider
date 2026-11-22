import React, { useState } from 'react';
import { BadgeCheck } from 'lucide-react';
import { SocialFollowerAccount } from '../types/builder';
import { SOCIAL_PLATFORMS } from '../utils/socialIcons';
import { sanitizeExternalUrl } from '../utils/urlHelpers';
import { SocialGlyph } from './SocialIcon';

interface SocialFollowerListProps {
  accounts: SocialFollowerAccount[];
  gap?: number;
  borderRadius: number;
  cardBg: string;
  borderColor: string;
  textColor: string;
  isEditor?: boolean;
}

export function SocialFollowerList({
  accounts,
  gap = 10,
  borderRadius,
  cardBg,
  borderColor,
  textColor,
  isEditor = false,
}: SocialFollowerListProps) {
  const [brokenAvatars, setBrokenAvatars] = useState<Record<string, boolean>>({});

  if (accounts.length === 0) {
    return (
      <div className="py-4 px-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
        Belum ada akun sosial media. Tambahkan akun sosmed di panel Pengaturan.
      </div>
    );
  }

  return (
    <div style={{ gap: `${gap}px` }} className="w-full flex flex-col text-left">
      {accounts.map((acc, idx) => {
        const meta = SOCIAL_PLATFORMS[acc.platform] ?? SOCIAL_PLATFORMS.instagram;
        const cleanUrl = sanitizeExternalUrl(acc.accountUrl, meta.placeholderUrl);
        const avatarSrc = acc.avatar?.trim() ?? '';
        const hasBrokenAvatar = avatarSrc ? brokenAvatars[`${acc.id}_${avatarSrc}`] : false;

        const stats = [
          {
            label: acc.postsLabel?.trim() || 'Postingan',
            value: acc.postsCount?.trim() ?? '',
          },
          {
            label: acc.followersLabel?.trim() || 'Follower',
            value: acc.followers?.trim() ?? '',
          },
          {
            label: acc.followingLabel?.trim() || 'Mengikuti',
            value: acc.following?.trim() ?? '',
          },
        ].filter((st) => Boolean(st.value));

        const gridColsClass =
          stats.length === 1
            ? 'grid-cols-1'
            : stats.length === 2
            ? 'grid-cols-2'
            : 'grid-cols-3';

        return (
          <div
            key={acc.id}
            data-canvas-sublayer={`sfa_${acc.id || idx}`}
            style={{
              backgroundColor: cardBg,
              borderColor,
              color: textColor,
              borderRadius: `${borderRadius}px`,
            }}
            className="w-full border p-3.5 shadow-xs space-y-2.5"
          >
            {/* Header: Avatar + Nama Akun + Handle/Platform + Tombol Ikuti */}
            <div className="flex items-center justify-between gap-2.5">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="relative shrink-0">
                  {avatarSrc && !hasBrokenAvatar ? (
                    <img
                      src={avatarSrc}
                      alt={acc.accountName || meta.label}
                      referrerPolicy="no-referrer"
                      onError={() =>
                        setBrokenAvatars((prev) => ({
                          ...prev,
                          [`${acc.id}_${avatarSrc}`]: true,
                        }))
                      }
                      style={{ borderColor }}
                      className="w-11 h-11 rounded-full object-cover border"
                    />
                  ) : (
                    <div
                      style={{ backgroundColor: meta.brandColor }}
                      className="w-11 h-11 rounded-full text-white flex items-center justify-center shadow-xs"
                    >
                      <SocialGlyph platform={acc.platform} className="w-5 h-5" />
                    </div>
                  )}
                  <span
                    style={{ backgroundColor: meta.brandColor }}
                    title={meta.label}
                    className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full text-white flex items-center justify-center ring-2 ring-white"
                  >
                    <SocialGlyph platform={acc.platform} className="w-2.5 h-2.5" />
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="flex items-center gap-1 min-w-0">
                    <span className="text-xs font-bold truncate">
                      {acc.accountName || 'Nama Akun Sosmed'}
                    </span>
                    {acc.verified && (
                      <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-[11px] opacity-70 truncate">
                    <span className="truncate">{acc.handle || '@username'}</span>
                    <span>·</span>
                    <span className="font-medium shrink-0">{meta.label}</span>
                  </div>
                </div>
              </div>

              {isEditor ? (
                <span
                  style={{ backgroundColor: meta.brandColor }}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white shrink-0"
                >
                  {acc.followLabel?.trim() || 'Ikuti'}
                </span>
              ) : (
                <a
                  href={cleanUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ backgroundColor: meta.brandColor }}
                  className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white shrink-0 hover:opacity-90 transition-opacity"
                >
                  {acc.followLabel?.trim() || 'Ikuti'}
                </a>
              )}
            </div>

            {/* Bio opsional */}
            {acc.bio?.trim() && (
              <p className="text-[11px] opacity-80 leading-relaxed whitespace-pre-line">
                {acc.bio}
              </p>
            )}

            {/* Statistik: Postingan, Follower, Mengikuti */}
            {stats.length > 0 && (
              <div
                style={{ borderColor }}
                className={`grid ${gridColsClass} gap-1 py-2 px-2 rounded-xl border bg-slate-500/5 text-center`}
              >
                {stats.map((st) => (
                  <div key={st.label} className="min-w-0">
                    <div className="text-xs font-bold tabular-nums truncate">{st.value}</div>
                    <div className="text-[10px] opacity-70 truncate">{st.label}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
