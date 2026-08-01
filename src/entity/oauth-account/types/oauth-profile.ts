import type { OAuthProvider } from './oauth-provider';

export type OAuthProfile = {
  provider: OAuthProvider;
  providerUserId: string;
  email: string;
  username: string;
  avatarUrl?: string | null;
  emailVerified?: boolean;
};
