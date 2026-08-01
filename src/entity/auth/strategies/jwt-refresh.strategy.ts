import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-jwt';
import { ConfigService } from '@nestjs/config';
import { Injectable, UnauthorizedException } from '@nestjs/common';
import { Request } from 'express';
import { JwtPayload } from '../types/jwt-payload.types';
import { SessionService } from '../../session/session.service';
import { UsersService } from '../../users/users.service';

type RequestWithCookies = Request & {
  cookies?: unknown;
};

@Injectable()
export class JwtRefreshStrategy extends PassportStrategy(
  Strategy,
  'jwt-refresh',
) {
  constructor(
    private readonly configService: ConfigService,
    private readonly sessionsService: SessionService,
    private readonly usersService: UsersService,
  ) {
    super({
      jwtFromRequest: (req: Request) => {
        return JwtRefreshStrategy.getRefreshToken(req);
      },
      ignoreExpiration: false,
      passReqToCallback: true,
      secretOrKey: configService.getOrThrow('JWT_REFRESH_SECRET'),
    });
  }

  async validate(
    req: Request,
    { userId, sessionId, email }: JwtPayload,
  ): Promise<JwtPayload> {
    const refreshToken = JwtRefreshStrategy.getRefreshToken(req);

    if (!refreshToken) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    const session = await this.sessionsService.findOne(sessionId).catch(() => {
      throw new UnauthorizedException('Invalid or expired refresh token');
    });

    if (
      session.userId !== userId ||
      session.refreshToken !== refreshToken ||
      session.expiresAt < new Date()
    ) {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    await this.usersService.findOne(userId).catch(() => {
      throw new UnauthorizedException('Invalid or expired refresh token');
    });

    return { userId, sessionId, email };
  }

  private static getRefreshToken(req: Request): string | null {
    const cookies = (req as RequestWithCookies).cookies;

    if (!cookies || typeof cookies !== 'object') {
      return null;
    }

    const refreshToken = (cookies as Record<string, unknown>).refreshToken;

    return typeof refreshToken === 'string' ? refreshToken : null;
  }
}
