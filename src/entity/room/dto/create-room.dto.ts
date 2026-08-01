import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsOptional,
  IsString,
  Length,
} from 'class-validator';

export class CreateRoomDto {
  @ApiProperty({ example: 'Фильм вечером' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 120)
  title: string;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isOpen?: boolean;

  @ApiPropertyOptional({ example: true })
  @IsBoolean()
  @IsOptional()
  isTemporary?: boolean;
}
