import {
  IsBoolean,
  IsNumber,
  IsOptional,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class VoiceSpeakingDto {
  @IsUUID('4')
  roomId: string;

  @IsBoolean()
  isSpeaking: boolean;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  audioLevel?: number;
}
