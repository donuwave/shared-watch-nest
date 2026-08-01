export const VIDEO_SOURCE_TYPES = ['youtube', 'direct', 'unknown'] as const;

export type VideoSourceType = (typeof VIDEO_SOURCE_TYPES)[number];
