import { IsString, IsUUID, Length } from 'class-validator';

export class EditChatMessageDto {
  @IsUUID('4')
  roomId: string;

  @IsUUID('4')
  messageId: string;

  @IsString()
  @Length(1, 2000)
  text: string;
}
