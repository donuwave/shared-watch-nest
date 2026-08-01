export const GLOBAL_ROLES = ['admin', 'moderator', 'user'] as const;

export type GlobalRoleName = (typeof GLOBAL_ROLES)[number];
