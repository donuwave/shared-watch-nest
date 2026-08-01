import { Module } from '@nestjs/common';
import { DatabaseModule } from './config/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './entity/users/users.module';
import { SessionModule } from './entity/session/session.module';
import { AuthModule } from './entity/auth/auth.module';
import { RoleModule } from './entity/role/role.module';
import { OAuthAccountModule } from './entity/oauth-account/oauth-account.module';
import { FeatureModule } from './entity/feature/feature.module';
import { RoomModule } from './entity/room/room.module';
import { VideoSyncModule } from './entity/video-sync/video-sync.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: '.env.local',
    }),
    DatabaseModule,
    UsersModule,
    SessionModule,
    AuthModule,
    RoleModule,
    OAuthAccountModule,
    FeatureModule,
    RoomModule,
    VideoSyncModule,
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
