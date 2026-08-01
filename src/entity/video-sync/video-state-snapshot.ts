import type { VideoState } from './video-state.entity';
import type { VideoSourceType } from './types/video-source-type';

export type VideoStateSnapshot = {
  id: string;
  roomId: string;
  sourceUrl: string;
  sourceType: VideoSourceType;
  providerVideoId: string | null;
  playing: boolean;
  currentTime: number;
  effectiveCurrentTime: number;
  duration: number | null;
  updatedByUserId: string | null;
  createdAt: Date;
  updatedAt: Date;
  serverTime: string;
  serverTimestamp: number;
};

export function toVideoStateSnapshot(
  state: VideoState | null,
  serverDate = new Date(),
): VideoStateSnapshot | null {
  if (!state) {
    return null;
  }

  const serverTimestamp = serverDate.getTime();
  const updatedTimestamp = state.updatedAt?.getTime() ?? serverTimestamp;
  const elapsedSeconds = state.playing
    ? Math.max(0, (serverTimestamp - updatedTimestamp) / 1000)
    : 0;
  const rawEffectiveCurrentTime = state.currentTime + elapsedSeconds;
  const effectiveCurrentTime =
    state.duration === null
      ? rawEffectiveCurrentTime
      : Math.min(rawEffectiveCurrentTime, state.duration);

  return {
    id: state.id,
    roomId: state.roomId,
    sourceUrl: state.sourceUrl,
    sourceType: state.sourceType,
    providerVideoId: state.providerVideoId,
    playing: state.playing,
    currentTime: state.currentTime,
    effectiveCurrentTime,
    duration: state.duration,
    updatedByUserId: state.updatedByUserId,
    createdAt: state.createdAt,
    updatedAt: state.updatedAt,
    serverTime: serverDate.toISOString(),
    serverTimestamp,
  };
}
