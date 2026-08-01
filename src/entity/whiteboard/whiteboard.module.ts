import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { RoomModule } from '../room/room.module';
import { VideoState } from '../video-sync/video-state.entity';
import { WhiteboardGateway } from './whiteboard.gateway';
import { WhiteboardService } from './whiteboard.service';
import { WhiteboardState } from './whiteboard-state.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([WhiteboardState, VideoState]),
    RoomModule,
    JwtModule.register({}),
  ],
  providers: [WhiteboardService, WhiteboardGateway],
  exports: [WhiteboardService],
})
export class WhiteboardModule {}
