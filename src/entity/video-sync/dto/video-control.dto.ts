import { IsNumber, IsUUID, Min } from 'class-validator';

export class VideoControlDto {
  @IsUUID('4')
  roomId: string;

  @IsNumber()
  @Min(0)
  currentTime: number;
}
