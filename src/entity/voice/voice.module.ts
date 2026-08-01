import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { VoiceGateway } from './voice.gateway';
import { RoomModule } from '../room/room.module';

@Module({
  imports: [RoomModule, JwtModule.register({})],
  providers: [VoiceGateway],
})
export class VoiceModule {}
