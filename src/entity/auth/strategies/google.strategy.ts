import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { Profile, Strategy, VerifyCallback } from 'passport-google-oauth20';
import { OAuthAccountService } from '../../oauth-account/oauth-account.service';

@Injectable()
export class GoogleStrategy extends PassportStrategy(Strategy, 'google') {
  constructor(
    private readonly configService: ConfigService,
    private readonly oauthAccountService: OAuthAccountService,
  ) {
    super({
      clientID: configService.get<string>('GOOGLE_CLIENT_ID') ?? '',
      clientSecret: configService.get<string>('GOOGLE_CLIENT_SECRET') ?? '',
      callbackURL:
        configService.get<string>('GOOGLE_CALLBACK_URL') ??
        'http://localhost:9000/auth/google/callback',
      scope: ['email', 'profile'],
    });
  }

  async validate(
    _accessToken: string,
    _refreshToken: string,
    profile: Profile,
    done: VerifyCallback,
  ): Promise<void> {
    const email = profile.emails?.[0]?.value;

    if (!email) {
      throw new UnauthorizedException('Google account email is required');
    }

    const user = await this.oauthAccountService.findOrCreateUser({
      provider: 'google',
      providerUserId: profile.id,
      email,
      username: this.getUsername(profile, email),
      avatarUrl: profile.photos?.[0]?.value ?? null,
      emailVerified: true,
    });

    done(null, user);
  }

  private getUsername(profile: Profile, email: string): string {
    const profileWithUsername = profile as Profile & { username?: string };
    const source =
      profileWithUsername.username ??
      profile.displayName ??
      email.split('@')[0];
    const username = source
      .replace(/\s+/g, '.')
      .replace(/[^A-Za-z0-9_.-]/g, '')
      .replace(/^[._-]+|[._-]+$/g, '')
      .slice(0, 32);

    return username.length >= 2 ? username : 'google-user';
  }
}
