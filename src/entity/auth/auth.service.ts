import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { Response } from 'express';
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

  async logout(userId: string, sessionId: string) {
    await this.sessionsService.terminate(sessionId, userId);
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

    console.log(refreshToken); //TODO: Заменить для логирования refresh tokens
    // refreshToken передаем в куки
    res.cookie('refreshToken', refreshToken, { httpOnly: true, secure: true });

    return accessToken;
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

  private generateRefreshToken(payload: any): string {
    return this.jwtService.sign(payload, {
      secret: this.configService.get('JWT_REFRESH_SECRET'),
      expiresIn: this.configService.get('JWT_REFRESH_EXPIRATION', '7d'),
    });
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
