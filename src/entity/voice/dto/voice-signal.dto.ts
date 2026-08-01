import { IsObject, IsUUID } from 'class-validator';

export class VoiceSignalDto {
  @IsUUID('4')
  roomId: string;

  @IsUUID('4')
  targetUserId: string;

  @IsObject()
  signal: Record<string, unknown>;
}
