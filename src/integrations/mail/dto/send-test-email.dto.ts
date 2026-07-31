import { ApiProperty } from '@nestjs/swagger';
import { IsEmail, IsNotEmpty } from 'class-validator';

export class SendTestEmailDto {
  @ApiProperty({ example: 'target@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;
}
