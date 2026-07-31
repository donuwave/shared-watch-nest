import {
  Controller,
  Post,
  Body,
  Request,
  UseGuards,
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
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { RolesGuard } from '../../guards/roles.guard';
import { AuthGuard } from '@nestjs/passport';
import { CurrentUser } from '../../decorators/current-user.decorator';
import type { JwtPayload } from './types/jwt-payload.types';
import { VerifyEmailDto } from './dto/verify-email.dto';

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
  @ApiResponse({ status: 200, description: 'Успешная аутентификация' })
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
  @ApiOperation({ summary: 'Обновить токены' })
  @ApiResponse({ status: 200, description: 'Токены успешно обновлены' })
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
  @ApiResponse({ status: 200, description: 'Email успешно подтвержден' })
  @ApiResponse({ status: 400, description: 'Токен уже использован или истек' })
  @ApiResponse({ status: 404, description: 'Токен не найден' })
  async verifyEmail(@Body() verifyEmailDto: VerifyEmailDto) {
    return this.authService.verifyEmail(verifyEmailDto);
  }

  @Post('resend-email-verification')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Повторно отправить подтверждение почты' })
  @ApiResponse({ status: 200, description: 'Ссылка подтверждения создана' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async resendEmailVerification(@CurrentUser() user: JwtPayload) {
    return this.authService.resendEmailVerification(user.userId);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiOperation({ summary: 'Выйти из системы' })
  @ApiResponse({ status: 200, description: 'Успешный выход' })
  @ApiResponse({ status: 400, description: 'Невалидный refresh token' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        refreshToken: {
          type: 'string',
          example: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d',
        },
      },
    },
  })
  async logout(@CurrentUser() user: JwtPayload) {
    return this.authService.logout(user.userId, user.sessionId);
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Получить информацию о текущем пользователе' })
  @ApiResponse({ status: 200, description: 'Текущий пользователь сессии' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async me(@CurrentUser() user: JwtPayload) {
    return this.authService.me(user.userId);
  }
}
