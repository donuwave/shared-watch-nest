import type { VideoSourceType } from './types/video-source-type';

export type ParsedVideoUrl = {
  sourceUrl: string;
  sourceType: VideoSourceType;
  providerVideoId: string | null;
};

export function parseVideoUrl(sourceUrl: string): ParsedVideoUrl {
  const url = new URL(sourceUrl);
  const youtubeId = getYouTubeVideoId(url);

  if (youtubeId) {
    return {
      sourceUrl: url.toString(),
      sourceType: 'youtube',
      providerVideoId: youtubeId,
    };
  }

  if (isDirectVideoUrl(url)) {
    return {
      sourceUrl: url.toString(),
      sourceType: 'direct',
      providerVideoId: null,
    };
  }

  return {
    sourceUrl: url.toString(),
    sourceType: 'unknown',
    providerVideoId: null,
  };
}

function getYouTubeVideoId(url: URL): string | null {
  const hostname = url.hostname.replace(/^www\./, '');

  if (hostname === 'youtu.be') {
    return normalizeYouTubeId(url.pathname.slice(1));
  }

  if (hostname === 'youtube.com' || hostname === 'm.youtube.com') {
    const watchId = url.searchParams.get('v');

    if (watchId) {
      return normalizeYouTubeId(watchId);
    }

    const pathParts = url.pathname.split('/').filter(Boolean);

    if (pathParts[0] === 'embed' || pathParts[0] === 'shorts') {
      return normalizeYouTubeId(pathParts[1]);
    }
  }

  return null;
}

function normalizeYouTubeId(value: string | undefined): string | null {
  if (!value || !/^[A-Za-z0-9_-]{6,128}$/.test(value)) {
    return null;
  }

  return value;
}

function isDirectVideoUrl(url: URL): boolean {
  return /\.(mp4|webm|ogg|mov|m4v|m3u8)$/i.test(url.pathname);
}
