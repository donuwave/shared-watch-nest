import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import type { CookieOptions, Response } from 'express';
import { UsersService } from '../users/users.service';
import { SessionService } from '../session/session.service';
import { RegisterDto } from './dto/register.dto';
import { LoginUser } from './types/login-user.types';
import { JwtPayload } from './types/jwt-payload.types';
import { LoginDto } from './dto/login.dto';
import * as bcrypt from 'bcrypt';
import { RoleService } from '../role/role.service';
import { EmailTokenService } from '../email-token/email-token.service';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { MailService } from '../../integrations/mail/mail.service';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from '../users/users.entity';
import type { OAuthProvider } from '../oauth-account/types/oauth-provider';
import { OAuthAccountService } from '../oauth-account/oauth-account.service';
import { createHash, randomBytes } from 'crypto';

type VkOAuthCallbackInput = {
  code?: string;
  state?: string;
  deviceId?: string;
  cookies?: Record<string, string | undefined>;
  userAgent: string;
  ipAddress: string;
  res: Response;
};

type CompleteOAuthLoginInput = {
  provider: OAuthProvider;
  user: User;
  userAgent: string;
  ipAddress: string;
  res: Response;
};

type VkTokenResponse = {
  access_token?: string;
  expires_in?: number;
  refresh_token?: string;
  id_token?: string;
  scope?: string;
  token_type?: string;
  error?: string;
  error_description?: string;
};

type VkUserInfoResponse = {
  user?: {
    user_id?: string;
    first_name?: string;
    last_name?: string;
    avatar?: string;
    email?: string;
  };
  email?: string;
  error?: string;
  error_description?: string;
};

@Injectable()
export class AuthService {
  constructor(
    private jwtService: JwtService,
    private configService: ConfigService,
    private usersService: UsersService,
    private sessionsService: SessionService,
    private roleService: RoleService,
    private emailTokenService: EmailTokenService,
    private mailService: MailService,
    private oauthAccountService: OAuthAccountService,
  ) {}

  async me(userId: string) {
    const user = await this.usersService.findOne(userId);
    const verificationState = this.usersService.getEmailVerificationState(user);

    const secondsUntilBlock =
      user.emailVerificationDeadlineAt &&
      verificationState === 'verification_pending'
        ? Math.max(
            0,
            Math.floor(
              (user.emailVerificationDeadlineAt.getTime() - Date.now()) / 1000,
            ),
          )
        : 0;

    return {
      profile: {
        id: user.id,
        email: user.email,
        username: user.username,
        discriminator: user.discriminator,
        avatarUrl: user.avatarUrl,
        role: user.role?.name,
      },
      emailVerification: {
        state: verificationState,
        secondsUntilBlock,
        isVerified: user.isEmailVerified,
        emailVerificationDeadlineAt: user.emailVerificationDeadlineAt,
      },
    };
  }

  async register(
    registerDto: RegisterDto,
    userAgent: string,
    ipAddress: string,
    res: Response,
  ) {
    const user = await this.usersService.create(registerDto);
    const emailVerificationToken = await this.emailTokenService.createToken(
      user.id,
      'email_verify',
    );

    await this.mailService.sendEmailVerification(
      user.email,
      emailVerificationToken,
    );

    // Назначаем роль 'user' по умолчанию
    const userRole = await this.roleService.findByName('user');
    if (userRole) {
      user.role = userRole;
      await this.usersService.save(user);
    }

    return await this.loginUser(
      {
        email: user.email,
        userId: user.id,
        userAgent,
        ipAddress,
        deviceInfo: this.getDeviceInfo(userAgent),
      },
      res,
    );
  }

  async login(
    loginDto: LoginDto,
    userAgent: string,
    ipAddress: string,
    res: Response,
  ) {
    const user = await this.validateUser(loginDto.email, loginDto.password);

    if (!user) {
      throw new UnauthorizedException('Invalid credentials');
    }

    return await this.loginUser(
      {
        email: user.email,
        userId: user.id,
        userAgent,
        ipAddress,
        deviceInfo: this.getDeviceInfo(userAgent),
      },
      res,
    );
  }

  async oauthLogin(
    user: User,
    userAgent: string,
    ipAddress: string,
    res: Response,
  ): Promise<string> {
    await this.ensureDefaultUserRole(user);

    return await this.loginUser(
      {
        email: user.email,
        userId: user.id,
        userAgent,
        ipAddress,
        deviceInfo: this.getDeviceInfo(userAgent),
      },
      res,
    );
  }

  async completeOAuthLogin({
    provider,
    user,
    userAgent,
    ipAddress,
    res,
  }: CompleteOAuthLoginInput): Promise<string> {
    await this.oauthLogin(user, userAgent, ipAddress, res);

    return this.getOAuthSuccessRedirectUrl(provider);
  }

  createOAuthState(provider: OAuthProvider, res: Response): string {
    const state = this.generateOAuthRandomString(24);

    res.cookie(
      this.getOAuthStateCookieName(provider),
      state,
      this.getOAuthCookieOptions(),
    );

    return state;
  }

  consumeOAuthState(
    provider: OAuthProvider,
    state: string | undefined,
    cookies: Record<string, string | undefined> | undefined,
    res: Response,
  ): void {
    const cookieName = this.getOAuthStateCookieName(provider);
    const expectedState = cookies?.[cookieName];

    res.clearCookie(cookieName, this.getOAuthCookieClearOptions());

    if (!state || !expectedState || state !== expectedState) {
      throw new BadRequestException('Invalid OAuth state');
    }
  }

  startVkOAuth(res: Response): string {
    const state = this.createOAuthState('vk', res);
    const codeVerifier = this.generateOAuthRandomString(64);
    const codeChallenge = this.generateCodeChallenge(codeVerifier);

    res.cookie(
      'vkOAuthCodeVerifier',
      codeVerifier,
      this.getOAuthCookieOptions(),
    );

    const authUrl = new URL('https://id.vk.com/authorize');
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set(
      'client_id',
      this.configService.get<string>('VK_CLIENT_ID') ?? '',
    );
    authUrl.searchParams.set('redirect_uri', this.getVkCallbackUrl());
    authUrl.searchParams.set('scope', 'vkid.personal_info email');
    authUrl.searchParams.set('state', state);
    authUrl.searchParams.set('code_challenge', codeChallenge);
    authUrl.searchParams.set('code_challenge_method', 'S256');

    return authUrl.toString();
  }

  async handleVkOAuthCallback({
    code,
    state,
    deviceId,
    cookies,
    userAgent,
    ipAddress,
    res,
  }: VkOAuthCallbackInput): Promise<string> {
    const codeVerifier = cookies?.vkOAuthCodeVerifier;

    res.clearCookie(
      this.getOAuthStateCookieName('vk'),
      this.getOAuthCookieClearOptions(),
    );
    res.clearCookie('vkOAuthCodeVerifier', this.getOAuthCookieClearOptions());

    if (!code || !state || !deviceId || !codeVerifier) {
      throw new BadRequestException('Invalid VK OAuth callback');
    }

    this.consumeOAuthState('vk', state, cookies, res);

    const token = await this.exchangeVkCode(code, deviceId, codeVerifier);
    const profile = await this.fetchVkProfile(token.access_token);
    const user = await this.oauthAccountService.findOrCreateUser(profile);

    return this.completeOAuthLogin({
      provider: 'vk',
      user,
      userAgent,
      ipAddress,
      res,
    });
  }

  async refreshTokens(userId: string, sessionId: string, email: string) {
    // Обновляем активность сессии
    await this.sessionsService.updateActivity(sessionId);

    // Генерируем новый access token
    return this.generateAccessToken({
      userId,
      sessionId,
      email,
    });
  }

  async logout(userId: string, sessionId: string, res: Response) {
    await this.sessionsService.terminate(sessionId, userId);
    res.clearCookie('refreshToken', this.getRefreshCookieClearOptions());

    return { message: 'Успешный выход' };
  }

  async verifyEmail({ token }: VerifyEmailDto) {
    const emailToken = await this.emailTokenService.verifyToken(
      token,
      'email_verify',
    );

    const user = await this.usersService.findOne(emailToken.userId);

    user.isEmailVerified = true;
    user.emailVerifiedAt = new Date();
    user.emailVerificationDeadlineAt = null;

    await this.usersService.save(user);

    return {
      message: 'Email verified successfully',
    };
  }

  async resendEmailVerification(userId: string) {
    const user = await this.usersService.findOne(userId);

    if (user.isEmailVerified) {
      return {
        message: 'Email verified successfully',
      };
    }

    const emailVerificationToken = await this.emailTokenService.createToken(
      userId,
      'email_verify',
    );

    await this.mailService.sendEmailVerification(
      user.email,
      emailVerificationToken,
    );

    return {
      message: 'Email verification token created',
    };
  }

  async forgotPassword({ email }: ForgotPasswordDto) {
    const user = await this.usersService.findByEmail(email).catch(() => null);

    if (user) {
      const passwordResetToken = await this.emailTokenService.createToken(
        user.id,
        'password_change',
      );

      await this.mailService.sendPasswordReset(user.email, passwordResetToken);
    }

    return {
      message:
        'If an account with this email exists, password reset instructions have been sent',
    };
  }

  async resetPassword({ token, newPassword }: ResetPasswordDto) {
    const emailToken = await this.emailTokenService.verifyToken(
      token,
      'password_change',
    );

    await this.usersService.resetPassword(emailToken.userId, newPassword);
    await this.sessionsService.terminateAll(emailToken.userId);

    return {
      message: 'Password reset successfully',
    };
  }

  async loginUser(loginUser: LoginUser, res: Response): Promise<string> {
    const session = await this.sessionsService.create(loginUser);

    // Генерируем токены
    const accessToken = this.generateAccessToken({
      userId: loginUser.userId,
      sessionId: session.id,
      email: loginUser.email,
    });

    // Генерируем JWT refresh token
    const refreshToken = this.generateRefreshToken({
      userId: loginUser.userId,
      sessionId: session.id, // если есть
      email: loginUser.email,
    });

    await this.sessionsService.updateRefreshToken(session.id, refreshToken);

    res.cookie('refreshToken', refreshToken, this.getRefreshCookieOptions());

    return accessToken;
  }

  getOAuthSuccessRedirectUrl(provider: OAuthProvider): string {
    const frontendUrl = this.configService.get<string>(
      'APP_FRONTEND_URL',
      'http://localhost:3000',
    );
    const redirectUrl = new URL('/oauth/callback', frontendUrl);

    redirectUrl.searchParams.set('provider', provider);
    redirectUrl.searchParams.set('status', 'success');

    return redirectUrl.toString();
  }

  getOAuthErrorRedirectUrl(
    provider: OAuthProvider,
    code = 'oauth_failed',
  ): string {
    const frontendUrl = this.configService.get<string>(
      'APP_FRONTEND_URL',
      'http://localhost:3000',
    );
    const redirectUrl = new URL('/oauth/callback', frontendUrl);

    redirectUrl.searchParams.set('provider', provider);
    redirectUrl.searchParams.set('status', 'error');
    redirectUrl.searchParams.set('code', code);

    return redirectUrl.toString();
  }

  //TODO: вытащить в стратегию (декоратор)
  async validateUser(email: string, password: string) {
    const user = await this.usersService.findByEmail(email);

    if (!user) {
      return null;
    }

    // Проверяем пароль
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return null;
    }

    return user;
  }

  private generateAccessToken(payload: JwtPayload): string {
    return this.jwtService.sign(payload, {
      expiresIn: this.configService.get('JWT_ACCESS_EXPIRATION') || '3600s',
      secret: this.configService.get('JWT_ACCESS_SECRET'),
    });
  }

  private async ensureDefaultUserRole(user: User): Promise<void> {
    if (user.roleId) {
      return;
    }

    const userRole = await this.roleService.findByName('user');

    if (!userRole) {
      return;
    }

    user.role = userRole;
    await this.usersService.save(user);
  }

  private async exchangeVkCode(
    code: string,
    deviceId: string,
    codeVerifier: string,
  ): Promise<{ access_token: string }> {
    const response = await fetch('https://id.vk.com/oauth2/auth', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.getVkCallbackUrl(),
        client_id: this.configService.get<string>('VK_CLIENT_ID') ?? '',
        client_secret: this.configService.get<string>('VK_CLIENT_SECRET') ?? '',
        device_id: deviceId,
        code_verifier: codeVerifier,
      }),
    });

    const token = (await response.json()) as VkTokenResponse;

    if (!response.ok || !token.access_token) {
      throw new UnauthorizedException(
        token.error_description ?? token.error ?? 'VK OAuth token failed',
      );
    }

    return { access_token: token.access_token };
  }

  private async fetchVkProfile(accessToken: string) {
    const response = await fetch('https://id.vk.com/oauth2/user_info', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: this.configService.get<string>('VK_CLIENT_ID') ?? '',
        access_token: accessToken,
      }),
    });

    const profile = (await response.json()) as VkUserInfoResponse;

    if (!response.ok || !profile.user?.user_id || !profile.email) {
      throw new UnauthorizedException(
        profile.error_description ?? profile.error ?? 'VK profile failed',
      );
    }

    return {
      provider: 'vk' as const,
      providerUserId: profile.user.user_id,
      email: profile.email,
      username: this.getVkUsername(profile),
      avatarUrl: profile.user.avatar ?? null,
      emailVerified: true,
    };
  }

  private getVkUsername(profile: VkUserInfoResponse): string {
    const fullName = [profile.user?.first_name, profile.user?.last_name]
      .filter(Boolean)
      .join('.');
    const source = fullName || profile.email || 'vk-user';
    const username = source
      .replace(/\s+/g, '.')
      .replace(/[^A-Za-z0-9_.-]/g, '')
      .replace(/^[._-]+|[._-]+$/g, '')
      .slice(0, 32);

    return username.length >= 2 ? username : 'vk-user';
  }

  private getVkCallbackUrl(): string {
    return (
      this.configService.get<string>('VK_CALLBACK_URL') ??
      'http://localhost:9000/auth/vk/callback'
    );
  }

  private getOAuthStateCookieName(provider: OAuthProvider): string {
    return `${provider}OAuthState`;
  }

  private generateOAuthRandomString(byteLength: number): string {
    return randomBytes(byteLength).toString('base64url');
  }

  private generateCodeChallenge(codeVerifier: string): string {
    return createHash('sha256').update(codeVerifier).digest('base64url');
  }

  private getOAuthCookieOptions(): CookieOptions {
    return {
      ...this.getOAuthCookieClearOptions(),
      maxAge: 10 * 60 * 1000,
    };
  }

  private getOAuthCookieClearOptions(): CookieOptions {
    return {
      ...this.getRefreshCookieClearOptions(),
      httpOnly: true,
    };
  }

  private generateRefreshToken(payload: any): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
    });
  }

  private getRefreshCookieOptions(): CookieOptions {
    return {
      ...this.getRefreshCookieClearOptions(),
      maxAge: this.parseDurationMs(
        this.configService.get<string>('JWT_REFRESH_EXPIRATION'),
        30 * 24 * 60 * 60 * 1000,
      ),
    };
  }

  private getRefreshCookieClearOptions(): CookieOptions {
    const domain = this.configService.get<string>('COOKIE_DOMAIN');

    return {
      httpOnly: true,
      secure: this.configService.get<string>('COOKIE_SECURE') === 'true',
      sameSite: this.getCookieSameSite(),
      path: '/',
      ...(domain ? { domain } : {}),
    };
  }

  private getCookieSameSite(): CookieOptions['sameSite'] {
    const sameSite = this.configService
      .get<string>('COOKIE_SAME_SITE', 'lax')
      .toLowerCase();

    if (sameSite === 'strict' || sameSite === 'none') {
      return sameSite;
    }

    return 'lax';
  }

  private parseDurationMs(
    value: string | undefined,
    fallbackMs: number,
  ): number {
    if (!value) {
      return fallbackMs;
    }

    const match = value.match(/^(\d+)(s|m|h|d)?$/);

    if (!match) {
      return fallbackMs;
    }

    const amount = Number(match[1]);
    const unit = match[2] ?? 's';
    const multiplierByUnit = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return amount * multiplierByUnit[unit];
  }

  // Получение информации об устройстве из User-Agent
  private getDeviceInfo(userAgent: string): string {
    if (!userAgent) return 'Unknown device';

    if (
      userAgent.includes('Mobile') ||
      userAgent.includes('Android') ||
      userAgent.includes('iPhone')
    ) {
      return 'Mobile';
    }

    if (userAgent.includes('Chrome')) {
      return 'Chrome';
    }

    if (userAgent.includes('Firefox')) {
      return 'Firefox';
    }

    if (userAgent.includes('Safari')) {
      return 'Safari';
    }

    return 'Web browser';
  }
}
