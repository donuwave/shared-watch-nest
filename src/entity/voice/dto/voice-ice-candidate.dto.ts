import { IsObject, IsUUID } from 'class-validator';

export class VoiceIceCandidateDto {
  @IsUUID('4')
  roomId: string;

  @IsUUID('4')
  targetUserId: string;

  @IsObject()
  candidate: Record<string, unknown>;
}
