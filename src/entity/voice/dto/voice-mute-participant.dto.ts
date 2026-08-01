import { IsBoolean, IsUUID } from 'class-validator';

export class VoiceMuteParticipantDto {
  @IsUUID('4')
  roomId: string;

  @IsUUID('4')
  targetUserId: string;

  @IsBoolean()
  isMuted: boolean;
}
