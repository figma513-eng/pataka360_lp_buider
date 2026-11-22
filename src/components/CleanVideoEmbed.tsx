import React, { useEffect, useId, useRef, useState } from 'react';
import { Pause, Play, Video, Volume2, VolumeX } from 'lucide-react';
import {
  VideoEmbedPlatform,
  extractInstagramInfo,
  extractTikTokId,
  extractYouTubeId,
  isDirectVideoUrl,
  isValidFacebookVideoUrl,
  isValidInstagramVideoUrl,
  isValidTikTokUrl,
  normalizeFacebookVideoUrl,
} from '../utils/videoHelpers';

interface CleanVideoEmbedProps {
  platform: VideoEmbedPlatform;
  videoUrl?: string;
  posterUrl?: string;
  aspectRatio?: '16/9' | '1/1' | '4/5' | '9/16';
  autoPlay?: boolean;
  muted?: boolean;
  volume?: number;
  videoZoom?: number;
  borderRadius?: number;
  accentColor?: string;
  isEditor?: boolean;
}

interface ResolveVideoResponse {
  canonicalUrl?: string | null;
  directVideoUrl?: string | null;
  posterUrl?: string | null;
  videoId?: string | null;
}

export function CleanVideoEmbed({
  platform,
  videoUrl,
  posterUrl,
  aspectRatio = '16/9',
  autoPlay = true,
  muted = false,
  volume = 75,
  videoZoom = 100,
  borderRadius = 14,
  accentColor = '#2563EB',
  isEditor = false,
}: CleanVideoEmbedProps) {
  const trimmedUrl = videoUrl?.trim() ?? '';
  const directInputUrl = isDirectVideoUrl(trimmedUrl) ? trimmedUrl : null;
  const ytId = !directInputUrl && platform === 'youtube' ? extractYouTubeId(trimmedUrl) : null;
  const syncTtId = !directInputUrl && platform === 'tiktok' ? extractTikTokId(trimmedUrl) : null;
  const syncFbUrl =
    !directInputUrl && platform === 'facebook' && isValidFacebookVideoUrl(trimmedUrl)
      ? normalizeFacebookVideoUrl(trimmedUrl)
      : null;
  const syncIgInfo =
    !directInputUrl && platform === 'instagram' ? extractInstagramInfo(trimmedUrl) : null;

  const isValid = Boolean(
    directInputUrl ||
      ytId ||
      (platform === 'tiktok' && isValidTikTokUrl(trimmedUrl)) ||
      syncFbUrl ||
      (platform === 'instagram' && isValidInstagramVideoUrl(trimmedUrl))
  );

  const [resolving, setResolving] = useState<boolean>(false);
  const [resolvedDirectUrl, setResolvedDirectUrl] = useState<string | null>(null);
  const [resolvedCanonicalUrl, setResolvedCanonicalUrl] = useState<string | null>(null);
  const [resolvedTtId, setResolvedTtId] = useState<string | null>(null);
  const [fetchedPoster, setFetchedPoster] = useState<string | null>(null);

  const activeDirectUrl = directInputUrl || resolvedDirectUrl;
  const activeTtId = syncTtId || resolvedTtId;
  const activeFbUrl = resolvedCanonicalUrl || syncFbUrl;
  const activeIgInfo =
    (resolvedCanonicalUrl ? extractInstagramInfo(resolvedCanonicalUrl) : null) || syncIgInfo;

  const isPlayableReady = Boolean(
    activeDirectUrl ||
      ytId ||
      (platform === 'tiktok' && activeTtId) ||
      (platform === 'facebook' && activeFbUrl) ||
      (platform === 'instagram' && activeIgInfo)
  );

  const [hasMountPlayer, setHasMountPlayer] = useState<boolean>(() =>
    Boolean(isValid && autoPlay && !resolving)
  );
  const [isPlaying, setIsPlaying] = useState<boolean>(() => Boolean(isValid && autoPlay));
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [isRevealed, setIsRevealed] = useState(false);
  const [localVolume, setLocalVolume] = useState<number>(muted ? 0 : volume);
  const [isMuted, setIsMuted] = useState<boolean>(Boolean(muted));
  const [thumbLevel, setThumbLevel] = useState<0 | 1 | 2>(0);
  const [transientPauseFlash, setTransientPauseFlash] = useState<boolean>(false);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const revealScheduledRef = useRef(false);
  const hasPlayedOnceRef = useRef(false);
  const autoStartedRef = useRef<boolean>(Boolean(isValid && autoPlay));
  const autoUnmuteAttemptedAtRef = useRef<number>(0);
  const volumeRef = useRef<number>(muted ? 0 : volume);
  const mutedRef = useRef<boolean>(Boolean(muted));
  const revealTimerRef = useRef<number | null>(null);
  const fallbackTimerRef = useRef<number | null>(null);
  const autoplayCheckTimerRef = useRef<number | null>(null);
  const playerId = useId();

  useEffect(() => {
    const effectiveVol = muted ? 0 : volume;
    setIsMuted(Boolean(muted));
    mutedRef.current = Boolean(muted);
    setLocalVolume(effectiveVol);
    volumeRef.current = effectiveVol;
    if (videoRef.current) {
      videoRef.current.muted = Boolean(muted);
      videoRef.current.volume = Math.max(0, Math.min(1, effectiveVol / 100));
    }
  }, [volume, muted]);

  // Resolusi URL FB/TikTok/IG via server (/api/resolve-video) & oEmbed TikTok
  useEffect(() => {
    setResolvedDirectUrl(null);
    setResolvedCanonicalUrl(null);
    setResolvedTtId(null);
    setFetchedPoster(null);

    if (!isValid || !trimmedUrl || directInputUrl || platform === 'youtube') {
      setResolving(false);
      return;
    }

    let cancelled = false;
    setResolving(true);

    const resolveAsync = async () => {
      try {
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 5000);
        const res = await fetch(
          `/api/resolve-video?platform=${encodeURIComponent(platform)}&url=${encodeURIComponent(trimmedUrl)}`,
          { signal: controller.signal }
        );
        window.clearTimeout(timer);

        if (!cancelled && res.ok) {
          const data = (await res.json()) as ResolveVideoResponse;
          if (data.canonicalUrl) setResolvedCanonicalUrl(data.canonicalUrl);
          if (data.directVideoUrl) setResolvedDirectUrl(data.directVideoUrl);
          if (data.videoId && platform === 'tiktok') setResolvedTtId(data.videoId);
          if (data.posterUrl) setFetchedPoster(data.posterUrl);
          if (!cancelled) setResolving(false);
          if (data.posterUrl || platform !== 'tiktok') return;
        }
      } catch {
        // fallback ke oEmbed publik di browser jika backend tidak tersedia (mis. preview statis)
      }

      if (!cancelled && platform === 'tiktok') {
        try {
          const oeTarget = syncTtId
            ? `https://www.tiktok.com/@tiktok/video/${syncTtId}`
            : trimmedUrl;
          const oeRes = await fetch(
            `https://www.tiktok.com/oembed?url=${encodeURIComponent(oeTarget)}`
          );
          if (!cancelled && oeRes.ok) {
            const data = (await oeRes.json()) as {
              thumbnail_url?: string;
              embed_product_id?: string;
            };
            if (data.thumbnail_url) setFetchedPoster(data.thumbnail_url);
            if (!syncTtId && data.embed_product_id) setResolvedTtId(data.embed_product_id);
          }
        } catch {
          // ignore
        }
      }

      if (!cancelled) {
        setResolving(false);
      }
    };

    resolveAsync();
    return () => {
      cancelled = true;
    };
  }, [platform, trimmedUrl, directInputUrl, syncTtId, isValid]);

  const sendPlatformCommand = (
    cmd: 'play' | 'pause' | 'mute' | 'unMute' | 'setVolume',
    val?: number
  ) => {
    if (activeDirectUrl && videoRef.current) {
      const vid = videoRef.current;
      if (cmd === 'play') {
        vid.play().catch(() => {
          vid.muted = true;
          mutedRef.current = true;
          setIsMuted(true);
          vid.play().catch(() => {});
        });
      } else if (cmd === 'pause') {
        vid.pause();
      } else if (cmd === 'mute') {
        vid.muted = true;
      } else if (cmd === 'unMute') {
        vid.muted = false;
      } else if (cmd === 'setVolume' && val !== undefined) {
        vid.volume = Math.max(0, Math.min(1, val / 100));
      }
      return;
    }

    if (platform === 'youtube') {
      try {
        iframeRef.current?.contentWindow?.postMessage(
          JSON.stringify({
            event: 'command',
            func: cmd === 'play' ? 'playVideo' : cmd === 'pause' ? 'pauseVideo' : cmd,
            args: val !== undefined ? [val] : [],
            id: playerId,
          }),
          '*'
        );
      } catch {
        // ignore
      }
      return;
    }

    if (platform === 'tiktok') {
      try {
        const win = iframeRef.current?.contentWindow;
        if (!win) return;
        if (cmd === 'mute') {
          win.postMessage({ 'x-tiktok-player': true, type: 'mute' }, '*');
        } else if (cmd === 'unMute') {
          win.postMessage({ 'x-tiktok-player': true, type: 'unMute' }, '*');
        } else if (cmd === 'setVolume' && val !== undefined) {
          win.postMessage(
            {
              'x-tiktok-player': true,
              type: 'setVolume',
              value: Math.max(0, Math.min(100, Math.round(val))),
            },
            '*'
          );
        } else {
          win.postMessage({ 'x-tiktok-player': true, type: cmd }, '*');
        }
      } catch {
        // ignore
      }
    }
  };

  const clearTimers = () => {
    if (revealTimerRef.current !== null) {
      window.clearTimeout(revealTimerRef.current);
      revealTimerRef.current = null;
    }
    if (fallbackTimerRef.current !== null) {
      window.clearTimeout(fallbackTimerRef.current);
      fallbackTimerRef.current = null;
    }
    if (autoplayCheckTimerRef.current !== null) {
      window.clearTimeout(autoplayCheckTimerRef.current);
      autoplayCheckTimerRef.current = null;
    }
    revealScheduledRef.current = false;
  };

  // Timer terisolasi untuk flash singkat ikon Pause saat user klik Play (tidak pernah dibatalkan oleh clearTimers)
  useEffect(() => {
    if (!transientPauseFlash) return;
    const timer = window.setTimeout(() => {
      setTransientPauseFlash(false);
    }, 650);
    return () => {
      window.clearTimeout(timer);
    };
  }, [transientPauseFlash]);

  // Reset saat URL atau mode autoplay berubah
  useEffect(() => {
    clearTimers();
    hasPlayedOnceRef.current = false;
    autoUnmuteAttemptedAtRef.current = 0;
    setThumbLevel(0);
    setTransientPauseFlash(false);
    setIsRevealed(false);
    setIsPaused(false);
    mutedRef.current = false;
    setIsMuted(false);

    const shouldAuto = Boolean(isValid && autoPlay);
    autoStartedRef.current = shouldAuto;
    setIsPlaying(shouldAuto);
    setHasMountPlayer(shouldAuto && !resolving && isPlayableReady);
  }, [platform, trimmedUrl, isValid, autoPlay]);

  // Mount otomatis begitu resolusi server selesai jika sedang mode Play/Autoplay
  useEffect(() => {
    if (!resolving && isPlaying && !isPaused && isPlayableReady && !hasMountPlayer) {
      setHasMountPlayer(true);
    }
  }, [resolving, isPlaying, isPaused, isPlayableReady, hasMountPlayer]);

  // Sinkronisasi volume pada player aktif
  useEffect(() => {
    if (!hasMountPlayer) return;
    if (isMuted || localVolume === 0) {
      sendPlatformCommand('mute');
    } else {
      sendPlatformCommand('unMute');
      sendPlatformCommand('setVolume', localVolume);
    }
  }, [localVolume, isMuted, hasMountPlayer, activeDirectUrl]);

  // Listener state YouTube & TikTok + timer fallback reveal
  useEffect(() => {
    if (!hasMountPlayer) {
      clearTimers();
      hasPlayedOnceRef.current = false;
      setIsRevealed(false);
      return;
    }

    if (activeDirectUrl) {
      return () => {
        clearTimers();
      };
    }

    if (isPlaying && !isPaused) {
      const fallbackDelay = platform === 'instagram' ? 2600 : platform === 'facebook' ? 2800 : 4800;
      fallbackTimerRef.current = window.setTimeout(() => {
        setIsRevealed(true);
      }, fallbackDelay);

      if (platform === 'youtube' && autoStartedRef.current && !hasPlayedOnceRef.current) {
        autoplayCheckTimerRef.current = window.setTimeout(() => {
          if (!hasPlayedOnceRef.current) {
            mutedRef.current = true;
            setIsMuted(true);
            sendPlatformCommand('mute');
            sendPlatformCommand('play');
          }
        }, 2000);
      }
    }

    if (platform === 'facebook' || platform === 'instagram') {
      return () => {
        clearTimers();
      };
    }

    const handleMessage = (event: MessageEvent) => {
      if (typeof event.origin !== 'string') return;
      if (platform === 'youtube') {
        if (!event.origin.includes('youtube.com') && !event.origin.includes('youtube-nocookie.com')) {
          return;
        }
      } else if (platform === 'tiktok') {
        if (!event.origin.includes('tiktok.com')) return;
      }

      if (iframeRef.current?.contentWindow && event.source !== iframeRef.current.contentWindow) {
        return;
      }

      let payload: Record<string, unknown> | null = null;
      if (typeof event.data === 'string') {
        try {
          payload = JSON.parse(event.data);
        } catch {
          return;
        }
      } else if (event.data && typeof event.data === 'object') {
        payload = event.data as Record<string, unknown>;
      }

      if (!payload) return;

      let state: number | undefined;
      if (platform === 'youtube') {
        if (
          payload.event === 'infoDelivery' &&
          typeof payload.info === 'object' &&
          payload.info !== null
        ) {
          state = (payload.info as { playerState?: number }).playerState;
        } else if (payload.event === 'onStateChange' && typeof payload.info === 'number') {
          state = payload.info;
        }
      } else if (platform === 'tiktok') {
        if (payload.type === 'onPlayerReady') {
          if (!mutedRef.current && volumeRef.current > 0) {
            sendPlatformCommand('unMute');
            sendPlatformCommand('setVolume', volumeRef.current);
          } else {
            sendPlatformCommand('mute');
          }
          if (isPlaying && !isPaused) {
            sendPlatformCommand('play');
          }
        } else if (payload.type === 'onMute' && typeof payload.value === 'boolean') {
          mutedRef.current = payload.value;
          setIsMuted(payload.value);
        } else if (payload.type === 'onStateChange' && typeof payload.value === 'number') {
          state = payload.value;
        } else if (payload.type === 'onEnded') {
          state = 0;
        }
      }

      if (state === 1) {
        hasPlayedOnceRef.current = true;
        if (autoplayCheckTimerRef.current !== null) {
          window.clearTimeout(autoplayCheckTimerRef.current);
          autoplayCheckTimerRef.current = null;
        }

        if (!mutedRef.current && volumeRef.current > 0) {
          sendPlatformCommand('unMute');
          sendPlatformCommand('setVolume', volumeRef.current);
        }

        if (!revealScheduledRef.current) {
          revealScheduledRef.current = true;
          if (fallbackTimerRef.current !== null) {
            window.clearTimeout(fallbackTimerRef.current);
            fallbackTimerRef.current = null;
          }
          const revealDelay = platform === 'youtube' ? 3800 : 1800;
          revealTimerRef.current = window.setTimeout(() => {
            setIsRevealed(true);
          }, revealDelay);
        }
      }

      if (state === 0) {
        clearTimers();
        hasPlayedOnceRef.current = false;
        setIsRevealed(false);
        setIsPaused(false);
        setIsPlaying(false);
        setHasMountPlayer(false);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => {
      window.removeEventListener('message', handleMessage);
      clearTimers();
    };
  }, [platform, hasMountPlayer, isPlaying, isPaused, activeDirectUrl]);

  const handlePlay = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isValid) return;
    autoStartedRef.current = false;
    setIsPaused(false);
    setIsPlaying(true);
    setTransientPauseFlash(true);

    if (!isPlayableReady) {
      return;
    }

    if (!hasMountPlayer) {
      setIsRevealed(false);
      setHasMountPlayer(true);
    } else {
      clearTimers();
      if (!activeDirectUrl) {
        setIsRevealed(false);
      } else {
        setIsRevealed(true);
      }
      if (!mutedRef.current && volumeRef.current > 0) {
        sendPlatformCommand('unMute');
        sendPlatformCommand('setVolume', volumeRef.current);
      }
      sendPlatformCommand('play');
    }
  };

  const handlePause = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isPlaying || isPaused) return;
    clearTimers();
    setTransientPauseFlash(false);
    if (hasMountPlayer) {
      if (activeDirectUrl) {
        sendPlatformCommand('pause');
      } else if (platform === 'facebook' || platform === 'instagram') {
        // Unmount iframe agar suara & pemutaran berhenti seketika dan kembali ke cover bersih
        setHasMountPlayer(false);
      } else {
        sendPlatformCommand('pause');
      }
    }
    setIsPaused(true);
    setIsPlaying(false);
    setIsRevealed(false);
  };

  const handleStageToggle = (e: React.MouseEvent) => {
    if (isPlaying && !isPaused) {
      handlePause(e);
    } else {
      handlePlay(e);
    }
  };

  const handleToggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextMuted = !isMuted;
    mutedRef.current = nextMuted;
    setIsMuted(nextMuted);
    if (nextMuted) {
      sendPlatformCommand('mute');
    } else {
      const targetVol = localVolume === 0 ? 75 : localVolume;
      if (localVolume === 0) {
        setLocalVolume(75);
        volumeRef.current = 75;
      }
      sendPlatformCommand('unMute');
      sendPlatformCommand('setVolume', targetVol);
    }
  };

  const handleVolumeChange = (nextVal: number) => {
    setLocalVolume(nextVal);
    volumeRef.current = nextVal;
    const shouldMute = nextVal === 0;
    mutedRef.current = shouldMute;
    setIsMuted(shouldMute);
    if (shouldMute) {
      sendPlatformCommand('mute');
    } else {
      sendPlatformCommand('unMute');
      sendPlatformCommand('setVolume', nextVal);
    }
  };

  const platformLabel =
    platform === 'facebook'
      ? 'Facebook'
      : platform === 'tiktok'
      ? 'TikTok'
      : platform === 'instagram'
      ? 'Instagram'
      : 'YouTube';

  if (!isValid) {
    return (
      <div
        className="w-full bg-slate-900 flex flex-col items-center justify-center gap-1.5 text-xs text-slate-300 p-4 text-center"
        style={{ borderRadius: `${borderRadius}px`, aspectRatio }}
      >
        <Video className="w-6 h-6 text-slate-400" />
        <span>
          {isEditor
            ? `Masukkan URL Video ${platformLabel} di panel Pengaturan`
            : `URL Video ${platformLabel} belum valid`}
        </span>
      </div>
    );
  }

  const originParam =
    typeof window !== 'undefined' && window.location.origin.startsWith('http')
      ? `&origin=${encodeURIComponent(window.location.origin)}`
      : '';

  const iframeSrc =
    platform === 'youtube' && ytId
      ? `https://www.youtube.com/embed/${ytId}?autoplay=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&fs=0&disablekb=1&playsinline=1&enablejsapi=1${originParam}`
      : platform === 'tiktok' && activeTtId
      ? `https://www.tiktok.com/player/v1/${activeTtId}?autoplay=1&controls=0&progress_bar=0&play_button=0&volume_control=0&fullscreen_button=0&timestamp=0&music_info=0&description=0&rel=0&loop=0`
      : platform === 'instagram' && activeIgInfo
      ? `https://www.instagram.com/${activeIgInfo.kind}/${activeIgInfo.code}/embed/?autoplay=1`
      : platform === 'facebook' && activeFbUrl
      ? `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(activeFbUrl)}&show_text=false&autoplay=true&mute=${
          autoStartedRef.current || isMuted || localVolume === 0 ? 1 : 0
        }`
      : '';

  const activePoster =
    posterUrl ||
    (platform === 'youtube' && ytId
      ? thumbLevel === 0
        ? `https://i.ytimg.com/vi/${ytId}/maxresdefault.jpg`
        : thumbLevel === 1
        ? `https://i.ytimg.com/vi/${ytId}/hqdefault.jpg`
        : null
      : fetchedPoster);

  const displayVol = isMuted ? 0 : localVolume;
  const allowDirectTapInsideIframe =
    !activeDirectUrl && (platform === 'instagram' || platform === 'facebook') && isRevealed;

  const isActivelyPlaying = isPlaying && !isPaused;
  const safeZoom =
    typeof videoZoom === 'number' && Number.isFinite(videoZoom)
      ? Math.max(50, Math.min(350, Math.round(videoZoom)))
      : 100;
  const mediaZoomStyle: React.CSSProperties | undefined =
    safeZoom !== 100
      ? {
          transform: `scale(${(safeZoom / 100).toFixed(3)})`,
          transformOrigin: 'center center',
        }
      : undefined;

  return (
    <div className="w-full">
      <div
        className="w-full overflow-hidden bg-slate-950 relative select-none"
        style={{
          borderRadius: `${borderRadius}px`,
          aspectRatio,
        }}
      >
        <div
          className="absolute inset-0 transition-transform duration-150"
          style={mediaZoomStyle}
        >
          {hasMountPlayer && activeDirectUrl && (
            <video
              ref={videoRef}
              src={activeDirectUrl}
              poster={activePoster || undefined}
              playsInline
              preload="auto"
              onLoadedMetadata={(e) => {
                const vid = e.currentTarget;
                vid.volume = Math.max(0, Math.min(1, volumeRef.current / 100));
                vid.muted = mutedRef.current || volumeRef.current === 0;
                if (isPlaying && !isPaused) {
                  vid.play().catch(() => {
                    vid.muted = true;
                    mutedRef.current = true;
                    setIsMuted(true);
                    vid.play().catch(() => {});
                  });
                }
              }}
              onPlaying={() => {
                hasPlayedOnceRef.current = true;
                setIsRevealed(true);
              }}
              onEnded={() => {
                clearTimers();
                hasPlayedOnceRef.current = false;
                setTransientPauseFlash(false);
                setIsRevealed(false);
                setIsPaused(false);
                setIsPlaying(false);
              }}
              onError={() => {
                // Jika stream langsung gagal/kedaluwarsa, otomatis fallback ke iframe embed
                setResolvedDirectUrl(null);
              }}
              className="w-full h-full object-cover block"
            />
          )}

          {hasMountPlayer && !activeDirectUrl && iframeSrc && (
            <>
              <iframe
                ref={iframeRef}
                src={iframeSrc}
                title={`Video ${platformLabel}`}
                allow="autoplay; encrypted-media; picture-in-picture; clipboard-write"
                onLoad={() => {
                  const win = iframeRef.current?.contentWindow;
                  if (platform === 'instagram' || platform === 'facebook') {
                    if (isPlaying && !isPaused && !revealScheduledRef.current) {
                      revealScheduledRef.current = true;
                      if (fallbackTimerRef.current !== null) {
                        window.clearTimeout(fallbackTimerRef.current);
                        fallbackTimerRef.current = null;
                      }
                      revealTimerRef.current = window.setTimeout(() => {
                        setIsRevealed(true);
                      }, 1500);
                    }
                    return;
                  }
                  if (!win) return;
                  if (platform === 'youtube') {
                    win.postMessage(JSON.stringify({ event: 'listening', id: playerId }), '*');
                    win.postMessage(
                      JSON.stringify({
                        event: 'command',
                        func: 'addEventListener',
                        args: ['onStateChange'],
                        id: playerId,
                      }),
                      '*'
                    );
                    if (!mutedRef.current && volumeRef.current > 0) {
                      win.postMessage(
                        JSON.stringify({
                          event: 'command',
                          func: 'setVolume',
                          args: [volumeRef.current],
                          id: playerId,
                        }),
                        '*'
                      );
                    }
                  } else if (platform === 'tiktok') {
                    if (!mutedRef.current && volumeRef.current > 0) {
                      sendPlatformCommand('unMute');
                      sendPlatformCommand('setVolume', volumeRef.current);
                    } else {
                      sendPlatformCommand('mute');
                    }
                    sendPlatformCommand('play');
                  }
                }}
                style={
                  platform === 'instagram'
                    ? {
                        position: 'absolute',
                        top: '-54px',
                        left: '-2px',
                        width: 'calc(100% + 4px)',
                        height: 'calc(100% + 132px)',
                      }
                    : undefined
                }
                className={`border-0 block ${
                  platform === 'instagram' ? '' : 'w-full h-full'
                } ${allowDirectTapInsideIframe ? 'pointer-events-auto' : 'pointer-events-none'}`}
              />
              {!allowDirectTapInsideIframe && (
                <div className="absolute inset-0 pointer-events-auto bg-transparent" />
              )}
            </>
          )}

          {/* Cover thumbnail bersih */}
          <div
            className={`absolute inset-0 z-10 transition-opacity duration-300 ${
              isActivelyPlaying && isRevealed ? 'opacity-0 pointer-events-none' : 'opacity-100'
            }`}
          >
            {activePoster && thumbLevel < 2 ? (
              <img
                src={activePoster}
                alt="Sampul video"
                referrerPolicy="no-referrer"
                onError={() => {
                  if (platform === 'youtube') {
                    setThumbLevel((prev) => (prev === 0 ? 1 : 2));
                  } else {
                    setThumbLevel(2);
                  }
                }}
                className="w-full h-full object-cover block"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center gap-1.5 text-xs text-slate-300 bg-gradient-to-br from-slate-900 to-slate-950">
                <Video className="w-5 h-5 text-slate-400" />
                <span className="font-medium">
                  {resolving
                    ? 'Menyiapkan video...'
                    : isActivelyPlaying
                    ? 'Memutar video...'
                    : 'Video siap diputar'}
                </span>
              </div>
            )}
            {!isActivelyPlaying && (
              <div className="absolute inset-0 bg-slate-950/25 pointer-events-none" />
            )}
          </div>
        </div>

        {/* Lapisan klik & Ikon Play / Pause terpusat pada thumbnail/video (sembunyi penuh saat video berjalan) */}
        <button
          type="button"
          onClick={handleStageToggle}
          onDragStart={(e) => e.stopPropagation()}
          aria-label={isActivelyPlaying ? 'Jeda video' : 'Putar video'}
          title={isActivelyPlaying ? 'Klik untuk jeda video' : 'Klik untuk putar video'}
          className={`absolute inset-0 z-20 flex items-center justify-center cursor-pointer ${
            allowDirectTapInsideIframe ? 'pointer-events-none' : 'pointer-events-auto'
          }`}
        >
          {(!isActivelyPlaying || transientPauseFlash) && (
            <span
              onClick={allowDirectTapInsideIframe && !isActivelyPlaying ? handleStageToggle : undefined}
              style={{
                backgroundColor: !isActivelyPlaying ? accentColor : 'rgba(15, 23, 42, 0.72)',
              }}
              className={`w-14 h-14 rounded-full text-white shadow-xl border border-white/30 backdrop-blur-xs flex items-center justify-center transition-transform duration-200 ${
                !isActivelyPlaying
                  ? `hover:scale-105 active:scale-95 ${
                      allowDirectTapInsideIframe ? 'pointer-events-auto' : ''
                    }`
                  : 'pointer-events-none'
              }`}
            >
              {isActivelyPlaying ? (
                <Pause className="w-6 h-6 fill-current" />
              ) : (
                <Play className="w-6 h-6 fill-current ml-0.5" />
              )}
            </span>
          )}
        </button>
      </div>

      {/* Bar Kontrol Volume Terpusat di Tengah (tanpa tombol Play & Pause) */}
      <div
        className="mt-2 flex items-center justify-center px-3 py-1.5 rounded-xl bg-slate-100 border border-slate-200"
        onClick={(e) => e.stopPropagation()}
        onDragStart={(e) => e.stopPropagation()}
      >
        <div className="w-full max-w-[240px] flex items-center justify-center gap-2">
          <button
            type="button"
            onClick={handleToggleMute}
            title={isMuted || displayVol === 0 ? 'Aktifkan suara' : 'Bisukan suara'}
            aria-label={isMuted || displayVol === 0 ? 'Aktifkan suara' : 'Bisukan suara'}
            className="p-1 rounded-md text-slate-700 hover:bg-slate-200/70 transition-colors cursor-pointer shrink-0"
          >
            {isMuted || displayVol === 0 ? (
              <VolumeX className="w-4 h-4 text-slate-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-slate-700" />
            )}
          </button>

          <input
            type="range"
            min={0}
            max={100}
            value={displayVol}
            onChange={(e) => handleVolumeChange(Number(e.target.value))}
            aria-label="Volume Audio"
            style={{ accentColor }}
            className="flex-1 min-w-[80px] h-1.5 cursor-pointer"
          />

          <span className="text-[11px] font-semibold text-slate-600 tabular-nums w-8 text-right shrink-0">
            {displayVol}%
          </span>
        </div>
      </div>
    </div>
  );
}
