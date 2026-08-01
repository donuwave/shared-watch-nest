import {
  Controller,
  Post,
  Body,
  Request,
  Query,
  UseGuards,
  UseFilters,
  Res,
  Get,
} from '@nestjs/common';
import type { Response } from 'express';
import type { Request as ExpressRequest } from 'express';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBody,
  ApiBearerAuth,
  ApiCookieAuth,
  ApiQuery,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../decorators/current-user.decorator';
import type { JwtPayload } from './types/jwt-payload.types';
import { VerifyEmailDto } from './dto/verify-email.dto';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { ResetPasswordDto } from './dto/reset-password.dto';
import { User } from '../users/users.entity';
import type { OAuthProvider } from '../oauth-account/types/oauth-provider';
import {
  GitHubOAuthGuard,
  GoogleOAuthGuard,
  YandexOAuthGuard,
} from '../../guards/oauth-state.guard';
import { OAuthRedirectFilter } from '../../filters/oauth-redirect.filter';
import {
  accessTokenSchema,
  authMeResponseSchema,
  messageResponseSchema,
} from '../../swagger/shared-watch-schemas';

type OAuthRequest = ExpressRequest & { user: User };
type CookieRequest = ExpressRequest & {
  cookies?: Record<string, string | undefined>;
};

@ApiTags('Auth')
@Controller('auth')
@ApiBearerAuth('jwt')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: 'Зарегистрировать нового пользователя' })
  @ApiResponse({
    status: 201,
    description: 'Пользователь успешно зарегистрирован',
    schema: accessTokenSchema,
  })
  @ApiResponse({ status: 400, description: 'Невалидные данные' })
  @ApiResponse({
    status: 409,
    description: 'Пользователь с таким email уже существует',
  })
  @ApiBody({ type: RegisterDto })
  async register(
    @Body() registerDto: RegisterDto,
    @Request() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.connection.remoteAddress || '';

    return this.authService.register(registerDto, userAgent, ipAddress, res);
  }

  @Post('login')
  @ApiOperation({ summary: 'Войти в систему' })
  @ApiResponse({
    status: 200,
    description: 'Успешная аутентификация',
    schema: accessTokenSchema,
  })
  @ApiResponse({ status: 401, description: 'Неверные учетные данные' })
  @ApiResponse({ status: 400, description: 'Невалидные данные' })
  @ApiBody({ type: LoginDto })
  async login(
    @Body() loginDto: LoginDto,
    @Request() req: ExpressRequest,
    @Res({ passthrough: true }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.connection.remoteAddress || '';

    return this.authService.login(loginDto, userAgent, ipAddress, res);
  }

  @Post('refresh')
  @UseGuards(RolesGuard, AuthGuard('jwt-refresh'))
  @ApiCookieAuth('refreshToken')
  @ApiOperation({ summary: 'Обновить токены' })
  @ApiResponse({
    status: 200,
    description: 'Access token успешно обновлен',
    schema: accessTokenSchema,
  })
  @ApiResponse({
    status: 401,
    description: 'Невалидный или просроченный refresh token',
  })
  async refresh(@CurrentUser() user: JwtPayload) {
    return this.authService.refreshTokens(
      user.userId,
      user.sessionId,
      user.email,
    );
  }

  @Post('verify-email')
  @ApiOperation({ summary: 'Подтвердить почту' })
  @ApiBody({ type: VerifyEmailDto })
  @ApiResponse({
    status: 200,
    description: 'Email успешно подтвержден',
    schema: messageResponseSchema('Email успешно подтвержден'),
  })
  @ApiResponse({ status: 400, description: 'Токен уже использован или истек' })
  @ApiResponse({ status: 404, description: 'Токен не найден' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('resend-email-verification')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Повторно отправить подтверждение почты' })
  @ApiResponse({
    status: 200,
    description: 'Ссылка подтверждения создана',
    schema: messageResponseSchema('Письмо подтверждения отправлено'),
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async resendEmailVerification(@CurrentUser() user: JwtPayload) {
    return this.authService.resendEmailVerification(user.userId);
  }

  @Post('forgot-password')
  @ApiOperation({ summary: 'Запросить ссылку для сброса пароля' })
  @ApiResponse({
    status: 201,
    description: 'Если email существует, ссылка для сброса отправлена',
    schema: messageResponseSchema(
      'Если email существует, ссылка для сброса отправлена',
    ),
  })
  @ApiResponse({ status: 400, description: 'Невалидные данные' })
  @ApiBody({ type: ForgotPasswordDto })
  async forgotPassword(@Body() forgotPasswordDto: ForgotPasswordDto) {
    return this.authService.forgotPassword(forgotPasswordDto);
  }

  @Post('reset-password')
  @ApiOperation({ summary: 'Сбросить пароль по token из письма' })
  @ApiResponse({
    status: 201,
    description: 'Пароль успешно сброшен',
    schema: messageResponseSchema('Пароль успешно сброшен'),
  })
  @ApiResponse({ status: 400, description: 'Токен уже использован или истек' })
  @ApiResponse({ status: 404, description: 'Токен не найден' })
  @ApiBody({ type: ResetPasswordDto })
  async resetPassword(@Body() resetPasswordDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetPasswordDto);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiCookieAuth('refreshToken')
  @ApiOperation({ summary: 'Выйти из системы' })
  @ApiResponse({
    status: 200,
    description: 'Успешный выход',
    schema: messageResponseSchema('Успешный выход'),
  })
  @ApiResponse({ status: 400, description: 'Невалидный refresh token' })
  async logout(
    @CurrentUser() user: JwtPayload,
    @Res({ passthrough: true }) res: Response,
  ) {
    return this.authService.logout(user.userId, user.sessionId, res);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Получить информацию о текущем пользователе' })
  @ApiResponse({
    status: 200,
    description: 'Текущий пользователь сессии',
    schema: authMeResponseSchema,
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user.userId);
  }

  @Get('google')
  @UseGuards(GoogleOAuthGuard)
  @ApiOperation({ summary: 'Начать авторизацию через Google' })
  @ApiResponse({ status: 302, description: 'Редирект на Google OAuth' })
  googleAuth(): void {
    return;
  }

  @Get('google/callback')
  @UseGuards(GoogleOAuthGuard)
  @UseFilters(OAuthRedirectFilter)
  @ApiOperation({ summary: 'Callback авторизации через Google' })
  @ApiResponse({
    status: 302,
    description:
      'Refresh cookie установлена, пользователь возвращен на frontend',
  })
  async googleCallback(
    @Request() req: OAuthRequest,
    @Res({ passthrough: false }) res: Response,
  ) {
    return this.redirectOAuthCallback('google', req, res);
  }

  @Get('github')
  @UseGuards(GitHubOAuthGuard)
  @ApiOperation({ summary: 'Начать авторизацию через GitHub' })
  @ApiResponse({ status: 302, description: 'Редирект на GitHub OAuth' })
  githubAuth(): void {
    return;
  }

  @Get('github/callback')
  @UseGuards(GitHubOAuthGuard)
  @UseFilters(OAuthRedirectFilter)
  @ApiOperation({ summary: 'Callback авторизации через GitHub' })
  @ApiResponse({
    status: 302,
    description:
      'Refresh cookie установлена, пользователь возвращен на frontend',
  })
  async githubCallback(
    @Request() req: OAuthRequest,
    @Res({ passthrough: false }) res: Response,
  ) {
    return this.redirectOAuthCallback('github', req, res);
  }

  @Get('yandex')
  @UseGuards(YandexOAuthGuard)
  @ApiOperation({ summary: 'Начать авторизацию через Yandex' })
  @ApiResponse({ status: 302, description: 'Редирект на Yandex OAuth' })
  yandexAuth(): void {
    return;
  }

  @Get('yandex/callback')
  @UseGuards(YandexOAuthGuard)
  @UseFilters(OAuthRedirectFilter)
  @ApiOperation({ summary: 'Callback авторизации через Yandex' })
  @ApiResponse({
    status: 302,
    description:
      'Refresh cookie установлена, пользователь возвращен на frontend',
  })
  async yandexCallback(
    @Request() req: OAuthRequest,
    @Res({ passthrough: false }) res: Response,
  ) {
    return this.redirectOAuthCallback('yandex', req, res);
  }

  @Get('vk')
  @ApiOperation({ summary: 'Начать авторизацию через VK ID' })
  @ApiResponse({ status: 302, description: 'Редирект на VK ID OAuth' })
  vkAuth(@Res({ passthrough: false }) res: Response) {
    return res.redirect(this.authService.startVkOAuth(res));
  }

  @Get('vk/callback')
  @UseFilters(OAuthRedirectFilter)
  @ApiOperation({ summary: 'Callback авторизации через VK ID' })
  @ApiQuery({ name: 'code', required: false })
  @ApiQuery({ name: 'state', required: false })
  @ApiQuery({ name: 'device_id', required: false })
  @ApiResponse({
    status: 302,
    description:
      'Refresh cookie установлена, пользователь возвращен на frontend',
  })
  async vkCallback(
    @Query('code') code: string | undefined,
    @Query('state') state: string | undefined,
    @Query('device_id') deviceId: string | undefined,
    @Request() req: CookieRequest,
    @Res({ passthrough: false }) res: Response,
  ) {
    const userAgent = req.headers['user-agent'] || '';
    const ipAddress = req.ip || req.connection.remoteAddress || '';
    try {
      const redirectUrl = await this.authService.handleVkOAuthCallback({
        code,
        state,
        deviceId,
        cookies: req.cookies,
        userAgent,
        ipAddress,
        res,
      });

      return res.redirect(redirectUrl);
    } catch {
      return res.redirect(this.authService.getOAuthErrorRedirectUrl('vk'));
    }
  }

  private async redirectOAuthCallback(
    provider: OAuthProvider,
    req: OAuthRequest,
    res: Response,
  ) {
    try {
      const userAgent = req.headers['user-agent'] || '';
      const ipAddress = req.ip || req.connection.remoteAddress || '';
      const redirectUrl = await this.authService.completeOAuthLogin({
        provider,
        user: req.user,
        userAgent,
        ipAddress,
        res,
      });

      return res.redirect(redirectUrl);
    } catch {
      return res.redirect(this.authService.getOAuthErrorRedirectUrl(provider));
    }
  }
}
