export const FEATURE_KEYS = ['rooms.create'] as const;

export type FeatureKey = (typeof FEATURE_KEYS)[number] | (string & {});
