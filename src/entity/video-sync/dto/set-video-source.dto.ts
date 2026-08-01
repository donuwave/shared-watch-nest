import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsNumber, IsOptional, IsString, IsUrl, Min } from 'class-validator';

export class SetVideoSourceDto {
  @ApiProperty({ example: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' })
  @IsString()
  @IsUrl({ require_tld: false })
  url: string;

  @ApiPropertyOptional({ example: 212 })
  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number;
}
