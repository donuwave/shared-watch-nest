import { IsBoolean, IsOptional, IsUUID } from 'class-validator';

export class ChatTypingDto {
  @IsUUID('4')
  roomId: string;

  @IsBoolean()
  @IsOptional()
  isTyping?: boolean;
}
