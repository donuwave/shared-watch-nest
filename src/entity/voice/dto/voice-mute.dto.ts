import { IsBoolean, IsUUID } from 'class-validator';

export class VoiceMuteDto {
  @IsUUID('4')
  roomId: string;

  @IsBoolean()
  isMuted: boolean;
}
