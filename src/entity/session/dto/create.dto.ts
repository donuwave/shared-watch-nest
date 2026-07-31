import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsString, IsOptional } from 'class-validator';

export class CreateSessionDto {
  @ApiProperty({ example: 'a1b2c3d4-e5f6-4a7b-8c9d-0e1f2a3b4c5d' })
  @IsString()
  userId: string;

  @ApiProperty({ example: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)' })
  @IsString()
  @IsOptional()
  userAgent?: string;

  @ApiPropertyOptional({ example: '192.168.1.1' })
  @IsString()
  @IsOptional()
  ipAddress?: string;

  @ApiPropertyOptional({ example: 'Chrome on macOS' })
  @IsString()
  @IsOptional()
  deviceInfo?: string;

  @ApiPropertyOptional({ example: 'Moscow, Russia' })
  @IsString()
  @IsOptional()
  location?: string;
}
