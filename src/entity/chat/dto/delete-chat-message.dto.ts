import { IsUUID } from 'class-validator';

export class DeleteChatMessageDto {
  @IsUUID('4')
  roomId: string;

  @IsUUID('4')
  messageId: string;
}
