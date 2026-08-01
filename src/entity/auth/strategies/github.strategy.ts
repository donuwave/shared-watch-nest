import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-oauth2';
import { OAuthAccountService } from '../../oauth-account/oauth-account.service';

type GitHubUserResponse = {
  id?: number;
  login?: string;
  name?: string | null;
  email?: string | null;
  avatar_url?: string | null;
};

type GitHubEmailResponse = {
  email: string;
  primary: boolean;
  verified: boolean;
};

type GitHubProfile = {
  id: string;
  login: string;
  name?: string | null;
  email: string;
  emailVerified: boolean;
  avatarUrl?: string | null;
};

@Injectable()
export class GitHubStrategy extends PassportStrategy(Strategy, 'github') {
  constructor(
    private readonly configService: ConfigService,
    private readonly oauthAccountService: OAuthAccountService,
  ) {
    super({
      authorizationURL: 'https://github.com/login/oauth/authorize',
      tokenURL: 'https://github.com/login/oauth/access_token',
      clientID: configService.get<string>('GITHUB_CLIENT_ID') ?? '',
      clientSecret: configService.get<string>('GITHUB_CLIENT_SECRET') ?? '',
      callbackURL:
        configService.get<string>('GITHUB_CALLBACK_URL') ??
        'http://localhost:9000/auth/github/callback',
      scope: ['read:user', 'user:email'],
      scopeSeparator: ' ',
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: GitHubProfile,
    done: VerifyCallback,
  ): Promise<void> {
    if (!profile.email) {
      throw new UnauthorizedException('GitHub account email is required');
    }

    const user = await this.oauthAccountService.findOrCreateUser({
      provider: 'github',
      providerUserId: profile.id,
      email: profile.email,
      username: this.getUsername(profile),
      avatarUrl: profile.avatarUrl ?? null,
      emailVerified: profile.emailVerified,
    });

    done(null, user);
  }

  userProfile(
    accessToken: string,
    done: (error?: Error | null, profile?: GitHubProfile) => void,
  ): void {
    Promise.all([
      this.fetchGitHubUser(accessToken),
      this.fetchGitHubEmails(accessToken),
    ])
      .then(([user, emails]) => {
        if (!user.id || !user.login) {
          throw new Error('Invalid GitHub profile response');
        }

        const selectedEmail = this.selectEmail(user.email ?? null, emails);

        if (!selectedEmail) {
          throw new Error('GitHub profile email is missing');
        }

        done(null, {
          id: String(user.id),
          login: user.login,
          name: user.name,
          email: selectedEmail.email,
          emailVerified: selectedEmail.verified,
          avatarUrl: user.avatar_url ?? null,
        });
      })
      .catch((error: unknown) => {
        done(
          error instanceof Error ? error : new Error('GitHub profile failed'),
        );
      });
  }

  private async fetchGitHubUser(
    accessToken: string,
  ): Promise<GitHubUserResponse> {
    const response = await fetch('https://api.github.com/user', {
      headers: this.getGitHubHeaders(accessToken),
    });

    if (!response.ok) {
      throw new Error('Failed to fetch GitHub profile');
    }

    return (await response.json()) as GitHubUserResponse;
  }

  private async fetchGitHubEmails(
    accessToken: string,
  ): Promise<GitHubEmailResponse[]> {
    const response = await fetch('https://api.github.com/user/emails', {
      headers: this.getGitHubHeaders(accessToken),
    });

    if (!response.ok) {
      return [];
    }

    return (await response.json()) as GitHubEmailResponse[];
  }

  private getGitHubHeaders(accessToken: string): Record<string, string> {
    return {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${accessToken}`,
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'shared-watch',
    };
  }

  private selectEmail(
    profileEmail: string | null,
    emails: GitHubEmailResponse[],
  ): GitHubEmailResponse | null {
    const primaryVerified = emails.find((email) => {
      return email.primary && email.verified;
    });

    if (primaryVerified) {
      return primaryVerified;
    }

    const verified = emails.find((email) => email.verified);

    if (verified) {
      return verified;
    }

    if (profileEmail) {
      return {
        email: profileEmail,
        primary: true,
        verified: false,
      };
    }

    return emails[0] ?? null;
  }

  private getUsername(profile: GitHubProfile): string {
    const source = profile.login ?? profile.name ?? profile.email.split('@')[0];
    const username = source
      .replace(/\s+/g, '.')
      .replace(/[^A-Za-z0-9_.-]/g, '')
      .replace(/^[._-]+|[._-]+$/g, '')
      .slice(0, 32);

    return username.length >= 2 ? username : 'github-user';
  }
}
