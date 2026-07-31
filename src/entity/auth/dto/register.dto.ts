import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MinLength,
  Matches,
  Length,
} from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class RegisterDto {
  @ApiProperty({ example: 'user@example.com' })
  @IsEmail()
  @IsNotEmpty()
  email: string;

  @ApiProperty({ example: 'Password123!' })
  @IsString()
  @IsNotEmpty()
  @MinLength(8)
  @Matches(
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/,
    {
      message:
        'Password must contain at least one uppercase letter, one lowercase letter, one number and one special character',
    },
  )
  password: string;

  @ApiProperty({ example: 'donu' })
  @IsString()
  @IsNotEmpty()
  @Length(2, 32)
  @Matches(/^[A-Za-z0-9_.-]+$/, {
    message:
      'Username can contain only letters, numbers, underscores, dots and hyphens',
  })
  username: string;
}
