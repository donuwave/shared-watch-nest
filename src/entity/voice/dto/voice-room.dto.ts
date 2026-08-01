import { IsUUID } from 'class-validator';

export class VoiceRoomDto {
  @IsUUID('4')
  roomId: string;
}
