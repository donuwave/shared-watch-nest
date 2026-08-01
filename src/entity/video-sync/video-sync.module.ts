import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { VideoState } from './video-state.entity';
import { VideoSyncService } from './video-sync.service';
import { VideoSyncGateway } from './video-sync.gateway';
import { VideoSyncController } from './video-sync.controller';
import { RoomModule } from '../room/room.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([VideoState]),
    RoomModule,
    JwtModule.register({}),
  ],
  controllers: [VideoSyncController],
  providers: [VideoSyncService, VideoSyncGateway],
  exports: [VideoSyncService],
})
export class VideoSyncModule {}
