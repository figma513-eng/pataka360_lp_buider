import React, { useState } from 'react';
import {
  BadgeCheck,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  ImageOff,
  PlaySquare,
} from 'lucide-react';
import { SocialFollowerAccount } from '../types/builder';
import { SOCIAL_PLATFORMS } from '../utils/socialIcons';
import { sanitizeExternalUrl } from '../utils/urlHelpers';
import { PostVideoSlide } from './SocialFeedCard';
import { SocialGlyph } from './SocialIcon';

interface SocialFollowerListProps {
  accounts: SocialFollowerAccount[];
  gap?: number;
  borderRadius: number;
  cardBg: string;
  borderColor: string;
  textColor: string;
  accentColor?: string;
  isEditor?: boolean;
}

export function SocialFollowerList({
  accounts,
  gap = 10,
  borderRadius,
  cardBg,
  borderColor,
  textColor,
  accentColor = '#00C98A',
  isEditor = false,
}: SocialFollowerListProps) {
  const [brokenAvatars, setBrokenAvatars] = useState<Record<string, boolean>>({});
  const [brokenPostImages, setBrokenPostImages] = useState<Record<string, boolean>>({});
  const [openDropdowns, setOpenDropdowns] = useState<Record<string, boolean>>({});
  const [activePostIndexes, setActivePostIndexes] = useState<Record<string, number>>({});

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

        const posts = acc.posts ?? [];
        const hasDropdown = Boolean(acc.showPostsDropdown);
        const isDropdownOpen = openDropdowns[acc.id] ?? Boolean(acc.postsDefaultOpen);
        const dropdownLabel = acc.postsDropdownLabel?.trim() || 'Lihat Postingan';
        const postRatio =
          acc.postsRatio && acc.postsRatio !== 'custom' ? acc.postsRatio : '16/9';
        const currentPostIdx = Math.min(
          Math.max(0, activePostIndexes[acc.id] ?? 0),
          Math.max(0, posts.length - 1)
        );
        const activePost = posts[currentPostIdx] ?? null;

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

            {/* Tombol Dropdown Postingan (Embed Foto / Video) */}
            {hasDropdown && (
              <div className="space-y-2 pt-0.5">
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setOpenDropdowns((prev) => ({
                      ...prev,
                      [acc.id]: !(prev[acc.id] ?? Boolean(acc.postsDefaultOpen)),
                    }));
                  }}
                  style={{ borderColor }}
                  className="w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border bg-slate-500/5 hover:bg-slate-500/10 text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  <span className="inline-flex items-center gap-1.5 min-w-0">
                    <PlaySquare
                      className="w-3.5 h-3.5 shrink-0"
                      style={{ color: meta.brandColor }}
                    />
                    <span className="truncate">{dropdownLabel}</span>
                    {posts.length > 0 && (
                      <span
                        style={{
                          backgroundColor: `${meta.brandColor}1F`,
                          color: meta.brandColor,
                        }}
                        className="px-1.5 py-0.5 rounded-md text-[10px] font-bold tabular-nums shrink-0"
                      >
                        {posts.length}
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    className={`w-4 h-4 shrink-0 opacity-75 transition-transform duration-200 ${
                      isDropdownOpen ? 'rotate-180' : ''
                    }`}
                  />
                </button>

                {isDropdownOpen && (
                  <div
                    onClick={(e) => e.stopPropagation()}
                    style={{ borderColor }}
                    className="rounded-xl border overflow-hidden bg-slate-500/5"
                  >
                    {posts.length === 0 ? (
                      <div className="py-4 px-3 text-center text-[11px] opacity-65">
                        Belum ada postingan foto/video. Tambahkan di panel Konten akun ini.
                      </div>
                    ) : (
                      activePost && (
                        <div>
                          <div className="relative">
                            {activePost.mediaType === 'video' ? (
                              <PostVideoSlide
                                post={activePost}
                                aspectRatio={postRatio}
                                accentColor={meta.brandColor || accentColor}
                              />
                            ) : (
                              <div
                                className="relative w-full bg-slate-100 overflow-hidden"
                                style={{ aspectRatio: postRatio }}
                              >
                                {!activePost.imageUrl ||
                                brokenPostImages[`${activePost.id}_${activePost.imageUrl}`] ? (
                                  <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400">
                                    <ImageOff className="w-5 h-5" />
                                    <span className="text-[11px]">Foto tidak dapat dimuat</span>
                                  </div>
                                ) : (
                                  <img
                                    src={activePost.imageUrl}
                                    alt={activePost.caption || `Postingan ${currentPostIdx + 1}`}
                                    draggable={false}
                                    referrerPolicy="no-referrer"
                                    onError={() =>
                                      setBrokenPostImages((prev) => ({
                                        ...prev,
                                        [`${activePost.id}_${activePost.imageUrl}`]: true,
                                      }))
                                    }
                                    className="w-full h-full object-cover block"
                                  />
                                )}
                              </div>
                            )}

                            {posts.length > 1 && (
                              <>
                                <div className="absolute top-2 right-2 z-10 px-2 py-0.5 rounded-full bg-slate-900/65 text-white text-[10px] font-semibold tabular-nums backdrop-blur-xs pointer-events-none">
                                  {currentPostIdx + 1} / {posts.length}
                                </div>
                                <button
                                  type="button"
                                  aria-label="Postingan sebelumnya"
                                  disabled={currentPostIdx === 0}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePostIndexes((prev) => ({
                                      ...prev,
                                      [acc.id]: Math.max(0, currentPostIdx - 1),
                                    }));
                                  }}
                                  className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/90 text-slate-800 shadow-md border border-slate-200/80 flex items-center justify-center cursor-pointer ${
                                    currentPostIdx === 0 ? 'opacity-30 cursor-default' : 'opacity-90 hover:opacity-100'
                                  }`}
                                >
                                  <ChevronLeft className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  aria-label="Postingan berikutnya"
                                  disabled={currentPostIdx === posts.length - 1}
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setActivePostIndexes((prev) => ({
                                      ...prev,
                                      [acc.id]: Math.min(posts.length - 1, currentPostIdx + 1),
                                    }));
                                  }}
                                  className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/90 text-slate-800 shadow-md border border-slate-200/80 flex items-center justify-center cursor-pointer ${
                                    currentPostIdx === posts.length - 1
                                      ? 'opacity-30 cursor-default'
                                      : 'opacity-90 hover:opacity-100'
                                  }`}
                                >
                                  <ChevronRight className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>

                          {(activePost.caption?.trim() ||
                            sanitizeExternalUrl(activePost.url, '')) && (
                            <div className="px-3 py-2 space-y-1">
                              {activePost.caption?.trim() && (
                                <p className="text-[11px] leading-relaxed opacity-85 whitespace-pre-line">
                                  {activePost.caption}
                                </p>
                              )}
                              {sanitizeExternalUrl(activePost.url, '') &&
                                (isEditor ? (
                                  <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold opacity-75">
                                    <span>Buka Postingan</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </span>
                                ) : (
                                  <a
                                    href={sanitizeExternalUrl(activePost.url, '')}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    style={{ color: meta.brandColor }}
                                    className="inline-flex items-center gap-1 text-[10.5px] font-semibold hover:underline"
                                  >
                                    <span>Lihat Postingan</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ))}
                            </div>
                          )}
                        </div>
                      )
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
