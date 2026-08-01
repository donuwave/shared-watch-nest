import { IsNumber, IsOptional, Max, Min } from 'class-validator';

export class WhiteboardPointDto {
  @IsNumber()
  @Min(0)
  @Max(1)
  x: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  y: number;

  @IsNumber()
  @Min(0)
  @Max(1)
  @IsOptional()
  pressure?: number;
}
