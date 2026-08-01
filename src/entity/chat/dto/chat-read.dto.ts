import { IsUUID } from 'class-validator';

export class ChatReadDto {
  @IsUUID('4')
  roomId: string;

  @IsUUID('4')
  messageId: string;
}
