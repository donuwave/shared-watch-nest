import { IsUUID } from 'class-validator';

export class MarkChatReadDto {
  @IsUUID('4')
  messageId: string;
}
