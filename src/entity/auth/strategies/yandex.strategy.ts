import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy, VerifyCallback } from 'passport-oauth2';
import { OAuthAccountService } from '../../oauth-account/oauth-account.service';

type YandexProfile = {
  id: string;
  login: string;
  default_email?: string;
  display_name?: string;
  real_name?: string;
  is_avatar_empty?: boolean;
  default_avatar_id?: string;
};

type YandexUserInfoResponse = {
  id?: string;
  login?: string;
  default_email?: string;
  display_name?: string;
  real_name?: string;
  is_avatar_empty?: boolean;
  default_avatar_id?: string;
};

@Injectable()
export class YandexStrategy extends PassportStrategy(Strategy, 'yandex') {
  constructor(
    private readonly configService: ConfigService,
    private readonly oauthAccountService: OAuthAccountService,
  ) {
    super({
      authorizationURL: 'https://oauth.yandex.com/authorize',
      tokenURL: 'https://oauth.yandex.com/token',
      clientID: configService.get<string>('YANDEX_CLIENT_ID') ?? '',
      clientSecret: configService.get<string>('YANDEX_CLIENT_SECRET') ?? '',
      callbackURL:
        configService.get<string>('YANDEX_CALLBACK_URL') ??
        'http://localhost:9000/auth/yandex/callback',
      scope: ['login:email', 'login:info', 'login:avatar'],
      scopeSeparator: ',',
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: YandexProfile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.default_email;

    if (!email) {
      throw new UnauthorizedException('Yandex account email is required');
    }

    const user = await this.oauthAccountService.findOrCreateUser({
      provider: 'yandex',
      providerUserId: profile.id,
      email,
      username: this.getUsername(profile, email),
      avatarUrl: this.getAvatarUrl(profile),
      emailVerified: true,
    });

    done(null, user);
  }

  userProfile(
    accessToken: string,
    done: (error?: Error | null, profile?: YandexProfile) => void,
  ): void {
    fetch('https://login.yandex.ru/info?format=json', {
      headers: {
        Authorization: `OAuth ${accessToken}`,
      },
    })
      .then(async (response) => {
        if (!response.ok) {
          throw new Error('Failed to fetch Yandex profile');
        }

        return (await response.json()) as YandexUserInfoResponse;
      })
      .then((profile) => {
        if (!profile.id || !profile.login) {
          throw new Error('Invalid Yandex profile response');
        }

        done(null, {
          id: profile.id,
          login: profile.login,
          default_email: profile.default_email,
          display_name: profile.display_name,
          real_name: profile.real_name,
          is_avatar_empty: profile.is_avatar_empty,
          default_avatar_id: profile.default_avatar_id,
        });
      })
      .catch((error: unknown) => {
        done(
          error instanceof Error ? error : new Error('Yandex profile failed'),
        );
      });
  }

  private getUsername(profile: YandexProfile, email: string): string {
    const source =
      profile.display_name ??
      profile.login ??
      profile.real_name ??
      email.split('@')[0];
    const username = source
      .replace(/\s+/g, '.')
      .replace(/[^A-Za-z0-9_.-]/g, '')
      .replace(/^[._-]+|[._-]+$/g, '')
      .slice(0, 32);

    return username.length >= 2 ? username : 'yandex-user';
  }

  private getAvatarUrl(profile: YandexProfile): string | null {
    if (profile.is_avatar_empty || !profile.default_avatar_id) {
      return null;
    }

    return `https://avatars.yandex.net/get-yapic/${profile.default_avatar_id}/islands-200`;
  }
}
