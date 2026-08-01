import { IsString, IsUUID, Length } from 'class-validator';

export class SendChatMessageDto {
  @IsUUID('4')
  roomId: string;

  @IsString()
  @Length(1, 2000)
  text: string;
}
