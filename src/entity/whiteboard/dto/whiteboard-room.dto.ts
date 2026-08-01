import { IsUUID } from 'class-validator';

export class WhiteboardRoomDto {
  @IsUUID('4')
  roomId: string;
}
