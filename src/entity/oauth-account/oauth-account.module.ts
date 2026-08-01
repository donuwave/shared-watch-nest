import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { OAuthAccount } from './oauth-account.entity';
import { OAuthAccountService } from './oauth-account.service';
import { UsersModule } from '../users/users.module';

@Module({
  imports: [TypeOrmModule.forFeature([OAuthAccount]), UsersModule],
  providers: [OAuthAccountService],
  exports: [OAuthAccountService],
})
export class OAuthAccountModule {}
