import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, IsUrl, Length, Matches } from 'class-validator';

export class UpdateUserDto {
  @ApiPropertyOptional({ example: 'donu' })
  @IsString()
  @IsOptional()
  @Length(2, 32)
  @Matches(/^[A-Za-z0-9_.-]+$/, {
    message:
      'Username can contain only letters, numbers, underscores, dots and hyphens',
  })
  username?: string;

  @ApiPropertyOptional({ example: 'https://example.com/avatar.png' })
  @IsString()
  @IsOptional()
  @IsUrl()
  avatarUrl?: string;
}
