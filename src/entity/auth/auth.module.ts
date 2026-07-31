import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { UsersModule } from '../users/users.module';
import { SessionModule } from '../session/session.module';
import { JwtStrategy } from './auth.jwt-strategy';
import { RoleModule } from '../role/role.module';
import { JwtRefreshStrategy } from './strategies/jwt-refresh.strategy';
import { EmailTokenService } from '../email-token/email-token.service';
import { EmailTokenModule } from '../email-token/email-token.module';
import { MailModule } from '../../integrations/mail/mail.module';

@Module({
  imports: [
    UsersModule,
    SessionModule,
    RoleModule,
    PassportModule,
    ConfigModule,
    EmailTokenModule,
    MailModule,
    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get('JWT_ACCESS_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_ACCESS_EXPIRATION') || '3600s',
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, JwtRefreshStrategy],
  exports: [AuthService],
})
export class AuthModule {}
