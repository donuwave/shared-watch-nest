import {
  IsNumber,
  IsOptional,
  IsString,
  IsUrl,
  IsUUID,
  Min,
} from 'class-validator';

export class VideoSourceEventDto {
  @IsUUID('4')
  roomId: string;

  @IsString()
  @IsUrl({ require_tld: false })
  url: string;

  @IsNumber()
  @Min(0)
  @IsOptional()
  duration?: number;
}
