import React, { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  ChevronLeft,
  ChevronRight,
  ExternalLink,
  Heart,
  ImageOff,
  Loader2,
  MessageCircle,
  Play,
  Square,
} from 'lucide-react';
import { CarouselAspectRatio, SocialPlatform, SocialPostItem } from '../types/builder';
import { SOCIAL_PLATFORMS } from '../utils/socialIcons';
import {
  extractInstagramInfo,
  extractTikTokId,
  extractYouTubeId,
  isDirectVideoUrl,
  isValidFacebookVideoUrl,
  isValidInstagramVideoUrl,
  isValidTikTokUrl,
  normalizeFacebookVideoUrl,
} from '../utils/videoHelpers';
import { SocialGlyph } from './SocialIcon';
import { sanitizeExternalUrl } from '../utils/urlHelpers';

interface SocialFeedCardProps {
  platform: SocialPlatform;
  avatar?: string;
  accountName: string;
  handle: string;
  accountUrl?: string;
  verified?: boolean;
  postsCount?: string;
  followers?: string;
  followersLabel?: string;
  following?: string;
  bio?: string;
  followLabel?: string;
  aspectRatio: CarouselAspectRatio;
  posts: SocialPostItem[];
  borderRadius: number;
  borderColor: string;
  textColor: string;
  accentColor: string;
  isEditor?: boolean;
}

function isDataVideoUrl(url?: string): boolean {
  return Boolean(url && /^data:video\//i.test(url.trim()));
}

function detectVideoSource(rawUrl?: string): {
  kind: 'direct' | 'youtube' | 'tiktok' | 'instagram' | 'facebook' | 'none';
  id: string;
} {
  const trimmed = rawUrl?.trim() ?? '';
  if (!trimmed) return { kind: 'none', id: '' };
  if (isDirectVideoUrl(trimmed) || isDataVideoUrl(trimmed)) {
    return { kind: 'direct', id: trimmed };
  }
  const yt = extractYouTubeId(trimmed);
  if (yt) return { kind: 'youtube', id: yt };
  if (isValidTikTokUrl(trimmed)) {
    const tt = extractTikTokId(trimmed);
    return { kind: 'tiktok', id: tt || trimmed };
  }
  if (isValidInstagramVideoUrl(trimmed)) {
    const ig = extractInstagramInfo(trimmed);
    return { kind: 'instagram', id: ig ? `${ig.kind}/${ig.code}` : trimmed };
  }
  if (isValidFacebookVideoUrl(trimmed)) {
    return { kind: 'facebook', id: normalizeFacebookVideoUrl(trimmed) };
  }
  return { kind: 'none', id: '' };
}

function PostVideoSlide({
  post,
  aspectRatio,
  accentColor,
}: {
  post: SocialPostItem;
  aspectRatio: CarouselAspectRatio;
  accentColor: string;
}) {
  const rawVideoUrl = post.videoUrl?.trim() ?? '';
  const detected = detectVideoSource(rawVideoUrl);
  const [playing, setPlaying] = useState(false);
  const [resolving, setResolving] = useState(false);
  const [resolvedDirect, setResolvedDirect] = useState<string | null>(null);
  const [resolvedIframeId, setResolvedIframeId] = useState<string | null>(null);
  const [fetchedPoster, setFetchedPoster] = useState<string | null>(null);
  const [brokenPoster, setBrokenPoster] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    setPlaying(false);
    setResolvedDirect(null);
    setResolvedIframeId(null);
    setFetchedPoster(null);
    setBrokenPoster(false);

    if (
      !rawVideoUrl ||
      detected.kind === 'direct' ||
      detected.kind === 'youtube' ||
      detected.kind === 'none'
    ) {
      return;
    }

    let cancelled = false;
    setResolving(true);
    fetch(
      `/api/resolve-video?platform=${encodeURIComponent(detected.kind)}&url=${encodeURIComponent(
        rawVideoUrl
      )}`
    )
      .then((r) => (r.ok ? r.json() : null))
      .then(
        (
          d: {
            directVideoUrl?: string | null;
            videoId?: string | null;
            canonicalUrl?: string | null;
            posterUrl?: string | null;
          } | null
        ) => {
          if (cancelled || !d) return;
          if (d.directVideoUrl) setResolvedDirect(d.directVideoUrl);
          if (d.videoId) setResolvedIframeId(d.videoId);
          else if (d.canonicalUrl) setResolvedIframeId(d.canonicalUrl);
          if (d.posterUrl) setFetchedPoster(d.posterUrl);
        }
      )
      .catch(() => {})
      .finally(() => {
        if (!cancelled) setResolving(false);
      });

    return () => {
      cancelled = true;
    };
  }, [rawVideoUrl, detected.kind]);

  const ytPoster =
    detected.kind === 'youtube' && detected.id
      ? `https://i.ytimg.com/vi/${detected.id}/hqdefault.jpg`
      : '';
  const poster = post.imageUrl?.trim() || fetchedPoster || ytPoster;
  const activeDirect = detected.kind === 'direct' ? detected.id : resolvedDirect;

  const getEmbedIframeSrc = () => {
    if (detected.kind === 'youtube' && detected.id) {
      return `https://www.youtube.com/embed/${detected.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`;
    }
    if (detected.kind === 'tiktok') {
      const tid = extractTikTokId(resolvedIframeId || '') || extractTikTokId(detected.id);
      if (tid) {
        return `https://www.tiktok.com/player/v1/${tid}?autoplay=1&rel=0&music_info=0&description=0`;
      }
    }
    if (detected.kind === 'instagram') {
      const ig =
        (resolvedIframeId ? extractInstagramInfo(resolvedIframeId) : null) ||
        extractInstagramInfo(rawVideoUrl);
      if (ig) {
        return `https://www.instagram.com/${ig.kind}/${ig.code}/embed/?autoplay=1`;
      }
    }
    if (detected.kind === 'facebook') {
      const fbUrl = resolvedIframeId || detected.id;
      return `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(
        fbUrl
      )}&show_text=false&autoplay=true`;
    }
    return '';
  };

  const iframeSrc = getEmbedIframeSrc();

  const handleTogglePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playing) {
      setPlaying(true);
    } else {
      if (videoRef.current) {
        videoRef.current.pause();
      }
      setPlaying(false);
    }
  };

  return (
    <div
      className="relative w-full bg-slate-900 overflow-hidden"
      style={{ aspectRatio }}
    >
      {playing && activeDirect ? (
        <video
          ref={videoRef}
          src={activeDirect}
          controls
          autoPlay
          playsInline
          onEnded={() => setPlaying(false)}
          className="w-full h-full object-cover block bg-black"
        />
      ) : playing && iframeSrc ? (
        <>
          <iframe
            src={iframeSrc}
            allow="autoplay; encrypted-media; picture-in-picture"
            allowFullScreen
            className="w-full h-full border-0 block bg-black"
            title={post.caption || 'Video postingan'}
          />
          <button
            type="button"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleTogglePlay}
            title="Hentikan video"
            className="absolute top-2.5 left-2.5 z-10 inline-flex items-center gap-1 px-2 py-1 rounded-full bg-slate-900/75 text-white text-[10px] font-semibold backdrop-blur-xs hover:bg-slate-900 cursor-pointer"
          >
            <Square className="w-2.5 h-2.5 fill-current" />
            <span>Tutup</span>
          </button>
        </>
      ) : (
        <>
          {poster && !brokenPoster ? (
            <img
              src={poster}
              alt={post.caption || 'Preview video'}
              draggable={false}
              referrerPolicy="no-referrer"
              onError={() => setBrokenPoster(true)}
              className="w-full h-full object-cover block"
            />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950" />
          )}

          {/* Soft dark scrim so center Play button always pops */}
          <div className="absolute inset-0 bg-slate-950/25 pointer-events-none" />

          {/* Centered Play Button */}
          <button
            type="button"
            aria-label="Putar video"
            onPointerDown={(e) => e.stopPropagation()}
            onClick={handleTogglePlay}
            style={{ color: accentColor }}
            className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 w-14 h-14 rounded-full bg-white/95 hover:bg-white shadow-xl flex items-center justify-center transition-transform hover:scale-105 active:scale-95 cursor-pointer"
          >
            {resolving ? (
              <Loader2 className="w-6 h-6 animate-spin" />
            ) : (
              <Play className="w-6 h-6 fill-current ml-0.5" />
            )}
          </button>
        </>
      )}
    </div>
  );
}

export function SocialFeedCard({
  platform,
  avatar,
  accountName,
  handle,
  accountUrl,
  verified = true,
  followers = '45,8 rb',
  followersLabel,
  bio = '',
  followLabel = 'Ikuti',
  aspectRatio,
  posts,
  borderRadius,
  borderColor,
  textColor,
  accentColor,
  isEditor = false,
}: SocialFeedCardProps) {
  const meta = SOCIAL_PLATFORMS[platform] ?? SOCIAL_PLATFORMS.instagram;
  const trackRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{
    active: boolean;
    startX: number;
    startScrollLeft: number;
    moved: boolean;
  }>({ active: false, startX: 0, startScrollLeft: 0, moved: false });

  const [activeIndex, setActiveIndex] = useState(0);
  const [brokenImages, setBrokenImages] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (activeIndex >= posts.length && posts.length > 0) {
      setActiveIndex(posts.length - 1);
    }
  }, [activeIndex, posts.length]);

  const scrollToSlide = (index: number) => {
    const track = trackRef.current;
    if (!track || posts.length === 0) return;
    const bounded = Math.max(0, Math.min(posts.length - 1, index));
    track.scrollTo({ left: bounded * track.clientWidth, behavior: 'smooth' });
    setActiveIndex(bounded);
  };

  const handleScroll = () => {
    const track = trackRef.current;
    if (!track || track.clientWidth === 0) return;
    const idx = Math.round(track.scrollLeft / track.clientWidth);
    const bounded = Math.max(0, Math.min(posts.length - 1, idx));
    if (bounded !== activeIndex) {
      setActiveIndex(bounded);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (e.button !== 0 && e.pointerType === 'mouse') return;
    const track = trackRef.current;
    if (!track) return;
    dragRef.current = {
      active: true,
      startX: e.clientX,
      startScrollLeft: track.scrollLeft,
      moved: false,
    };
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!dragRef.current.active) return;
    const track = trackRef.current;
    if (!track) return;
    const dx = e.clientX - dragRef.current.startX;
    if (Math.abs(dx) > 6) {
      dragRef.current.moved = true;
    }
    if (e.pointerType === 'mouse' && dragRef.current.moved) {
      track.scrollLeft = dragRef.current.startScrollLeft - dx;
    }
  };

  const handlePointerUp = () => {
    if (!dragRef.current.active) return;
    dragRef.current.active = false;
    const track = trackRef.current;
    if (track && track.clientWidth > 0 && dragRef.current.moved) {
      const idx = Math.round(track.scrollLeft / track.clientWidth);
      scrollToSlide(idx);
    }
    window.setTimeout(() => {
      dragRef.current.moved = false;
    }, 60);
  };

  const resolvedFollowersLabel =
    followersLabel?.trim() || (platform === 'youtube' ? 'Subscriber' : 'Follower');
  const cleanAccountUrl = sanitizeExternalUrl(accountUrl, meta.placeholderUrl);
  const mediaRadius = Math.max(8, Math.min(borderRadius, 14));

  return (
    <div style={{ color: textColor }} className="w-full space-y-3 text-left">
      {/* 1. Header: Logo Sosmed & Nama Akun + Follower/Subscribe + Tombol Ikuti */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative shrink-0">
            {avatar?.trim() && !brokenImages[`av_${avatar}`] ? (
              <img
                src={avatar}
                alt={accountName || meta.label}
                referrerPolicy="no-referrer"
                onError={() => setBrokenImages((prev) => ({ ...prev, [`av_${avatar}`]: true }))}
                style={{ borderColor }}
                className="w-11 h-11 rounded-full object-cover border"
              />
            ) : (
              <div
                style={{ backgroundColor: meta.brandColor }}
                className="w-11 h-11 rounded-full text-white flex items-center justify-center shadow-xs"
              >
                <SocialGlyph platform={platform} className="w-5 h-5" />
              </div>
            )}
            <span
              style={{ backgroundColor: meta.brandColor }}
              title={meta.label}
              className="absolute -bottom-0.5 -right-0.5 w-4.5 h-4.5 rounded-full text-white flex items-center justify-center ring-2 ring-white"
            >
              <SocialGlyph platform={platform} className="w-2.5 h-2.5" />
            </span>
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-1 min-w-0">
              <span className="text-xs font-bold truncate">
                {accountName || 'Nama Akun Sosmed'}
              </span>
              {verified && (
                <BadgeCheck className="w-3.5 h-3.5 text-blue-500 shrink-0" />
              )}
            </div>
            <div className="flex items-center gap-1.5 text-[11px] opacity-70 truncate">
              <span className="truncate">{handle || '@username'}</span>
              <span>·</span>
              <span className="font-medium shrink-0">{meta.label}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {followers?.trim() && (
            <div
              style={{ borderColor }}
              className="px-2 py-1 rounded-lg border bg-slate-500/5 text-center leading-tight shrink-0"
            >
              <div className="text-[11px] font-bold tabular-nums">{followers.trim()}</div>
              <div className="text-[9.5px] opacity-70">{resolvedFollowersLabel}</div>
            </div>
          )}

          {isEditor ? (
            <span
              style={{ backgroundColor: meta.brandColor }}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white shrink-0"
            >
              {followLabel || 'Ikuti'}
            </span>
          ) : (
            <a
              href={cleanAccountUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{ backgroundColor: meta.brandColor }}
              className="px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white shrink-0 hover:opacity-90 transition-opacity"
            >
              {followLabel || 'Ikuti'}
            </a>
          )}
        </div>
      </div>

      {/* 2. Bio Opsional */}
      {bio?.trim() && (
        <p className="text-[11px] opacity-80 leading-relaxed whitespace-pre-line">{bio}</p>
      )}

      {/* 3, 4, 5. Carousel Postingan (Gambar / Video + Rasio + Play Button di Tengah) */}
      {posts.length === 0 ? (
        <div className="py-6 px-4 rounded-xl border border-dashed border-slate-300 text-center text-xs text-slate-400">
          Belum ada postingan. Tambahkan gambar atau video di panel Pengaturan.
        </div>
      ) : (
        <div
          className="relative select-none"
          onDragStart={(e) => {
            e.preventDefault();
            e.stopPropagation();
          }}
        >
          <div className="relative">
            <div
              ref={trackRef}
              onScroll={handleScroll}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              onPointerLeave={handlePointerUp}
              style={{ borderRadius: `${mediaRadius}px` }}
              className="flex overflow-x-auto snap-x snap-mandatory scroll-smooth touch-pan-x [scrollbar-width:none] [&::-webkit-scrollbar]:hidden cursor-grab active:cursor-grabbing"
            >
              {posts.map((post, idx) => {
                const imgKey = `${post.id}_${post.imageUrl}`;
                const hasImgError = brokenImages[imgKey];
                const cleanPostUrl = sanitizeExternalUrl(post.url, '');

                return (
                  <div key={post.id} className="w-full shrink-0 snap-start">
                    <div
                      style={{ borderColor, borderRadius: `${mediaRadius}px` }}
                      className="border overflow-hidden bg-slate-500/5"
                    >
                      {post.mediaType === 'video' ? (
                        <PostVideoSlide
                          post={post}
                          aspectRatio={aspectRatio}
                          accentColor={accentColor}
                        />
                      ) : (
                        <div
                          className="relative w-full bg-slate-100 overflow-hidden"
                          style={{ aspectRatio }}
                        >
                          {!post.imageUrl || hasImgError ? (
                            <div className="w-full h-full flex flex-col items-center justify-center gap-1 text-slate-400">
                              <ImageOff className="w-5 h-5" />
                              <span className="text-[11px]">Foto tidak dapat dimuat</span>
                            </div>
                          ) : (
                            <img
                              src={post.imageUrl}
                              alt={post.caption || `Postingan ${idx + 1}`}
                              draggable={false}
                              referrerPolicy="no-referrer"
                              onError={() =>
                                setBrokenImages((prev) => ({ ...prev, [imgKey]: true }))
                              }
                              className="w-full h-full object-cover block"
                            />
                          )}
                        </div>
                      )}

                      {(post.caption.trim() ||
                        post.likes?.trim() ||
                        post.comments?.trim() ||
                        cleanPostUrl) && (
                        <div className="px-3 py-2.5 space-y-1.5">
                          {(post.likes?.trim() ||
                            post.comments?.trim() ||
                            cleanPostUrl) && (
                            <div className="flex items-center justify-between gap-2 text-[11px]">
                              <div className="flex items-center gap-3 opacity-80">
                                {post.likes?.trim() && (
                                  <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                                    <Heart className="w-3.5 h-3.5 text-rose-500 fill-rose-500" />
                                    <span>{post.likes}</span>
                                  </span>
                                )}
                                {post.comments?.trim() && (
                                  <span className="inline-flex items-center gap-1 font-semibold tabular-nums">
                                    <MessageCircle className="w-3.5 h-3.5" />
                                    <span>{post.comments}</span>
                                  </span>
                                )}
                              </div>

                              {cleanPostUrl &&
                                (isEditor ? (
                                  <span className="inline-flex items-center gap-1 font-semibold opacity-75">
                                    <span>Buka</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </span>
                                ) : (
                                  <a
                                    href={cleanPostUrl}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    onClick={(e) => {
                                      if (dragRef.current.moved) e.preventDefault();
                                    }}
                                    style={{ color: accentColor }}
                                    className="inline-flex items-center gap-1 font-semibold hover:underline"
                                  >
                                    <span>Lihat Post</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </a>
                                ))}
                            </div>
                          )}

                          {post.caption.trim() && (
                            <p className="text-[11px] leading-relaxed opacity-85 line-clamp-3 whitespace-pre-line">
                              {post.caption}
                            </p>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {posts.length > 1 && (
              <div className="absolute top-2.5 right-2.5 z-10 px-2 py-0.5 rounded-full bg-slate-900/65 text-white text-[10px] font-semibold tabular-nums backdrop-blur-xs pointer-events-none">
                {activeIndex + 1} / {posts.length}
              </div>
            )}

            {posts.length > 1 && (
              <>
                <button
                  type="button"
                  aria-label="Postingan sebelumnya"
                  disabled={activeIndex === 0}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToSlide(activeIndex - 1);
                  }}
                  className={`absolute left-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/90 text-slate-800 shadow-md border border-slate-200/80 flex items-center justify-center transition-opacity cursor-pointer ${
                    activeIndex === 0
                      ? 'opacity-30 cursor-default'
                      : 'opacity-90 hover:opacity-100 hover:bg-white'
                  }`}
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  aria-label="Postingan berikutnya"
                  disabled={activeIndex === posts.length - 1}
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    scrollToSlide(activeIndex + 1);
                  }}
                  className={`absolute right-2 top-1/2 -translate-y-1/2 z-10 w-7 h-7 rounded-full bg-white/90 text-slate-800 shadow-md border border-slate-200/80 flex items-center justify-center transition-opacity cursor-pointer ${
                    activeIndex === posts.length - 1
                      ? 'opacity-30 cursor-default'
                      : 'opacity-90 hover:opacity-100 hover:bg-white'
                  }`}
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          {posts.length > 1 && (
            <div
              onPointerDown={(e) => e.stopPropagation()}
              className="flex items-center justify-center gap-1.5 mt-2.5"
            >
              {posts.map((post, idx) => {
                const isActive = idx === activeIndex;
                return (
                  <button
                    key={post.id}
                    type="button"
                    aria-label={`Lihat postingan ${idx + 1}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      scrollToSlide(idx);
                    }}
                    style={{
                      backgroundColor: isActive ? meta.brandColor : '#CBD5E1',
                    }}
                    className={`h-1.5 rounded-full transition-all cursor-pointer ${
                      isActive ? 'w-5' : 'w-1.5 hover:opacity-80'
                    }`}
                  />
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
