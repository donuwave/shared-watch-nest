import { Module } from '@nestjs/common';
import { DatabaseModule } from './config/database/database.module';
import { ConfigModule } from '@nestjs/config';
import { UsersModule } from './entity/users/users.module';
import { SessionModule } from './entity/session/session.module';
import { AuthModule } from './entity/auth/auth.module';
import { RoleModule } from './entity/role/role.module';

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
  ],
  controllers: [],
  providers: [],
})
export class AppModule {}
