import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateRoomAccessDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isOpen: boolean;
}
