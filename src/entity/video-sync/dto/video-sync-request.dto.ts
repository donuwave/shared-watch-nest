import { IsUUID } from 'class-validator';

export class VideoSyncRequestDto {
  @IsUUID('4')
  roomId: string;
}
