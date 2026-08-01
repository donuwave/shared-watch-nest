import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { Room } from './room.entity';
import { RoomParticipant } from './room-participant.entity';
import { RoomInvite } from './room-invite.entity';
import { RoomPresence } from './room-presence.entity';
import { RoomService } from './room.service';
import { RoomController } from './room.controller';
import { UsersModule } from '../users/users.module';
import { FeatureModule } from '../feature/feature.module';
import { RoomCleanupService } from './room-cleanup.service';
import { RoomPresenceGateway } from './gateways/room-presence.gateway';
import { RoomStateService } from './room-state.service';
import { VideoState } from '../video-sync/video-state.entity';
import { WhiteboardState } from '../whiteboard/whiteboard-state.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([
      Room,
      RoomParticipant,
      RoomInvite,
      RoomPresence,
      VideoState,
      WhiteboardState,
    ]),
    UsersModule,
    FeatureModule,
    JwtModule.register({}),
  ],
  controllers: [RoomController],
  providers: [
    RoomService,
    RoomCleanupService,
    RoomPresenceGateway,
    RoomStateService,
  ],
  exports: [RoomService],
})
export class RoomModule {}
