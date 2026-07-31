import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { JwtPayload } from './types/jwt-payload.types';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    const jwtSecret = configService.get<string>('JWT_ACCESS_SECRET');

    if (!jwtSecret) {
      throw new Error(
        'JWT_ACCESS_SECRET is not defined in environment variables',
      );
    }

    super({
      jwtFromRequest: ExtractJwt.fromExtractors([
        ExtractJwt.fromHeader('accessToken'),
        (request) => ExtractJwt.fromAuthHeaderAsBearerToken()(request),
      ]),
      ignoreExpiration: false,
      secretOrKey: jwtSecret,
    });
  }

  //TODO: сделать проверку на сессии или давать 401
  async validate(payload: JwtPayload): Promise<JwtPayload> {
    return {
      userId: payload.userId,
      sessionId: payload.sessionId,
      email: payload.email,
    };
  }
}
