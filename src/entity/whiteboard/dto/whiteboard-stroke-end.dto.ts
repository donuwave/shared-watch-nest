import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsNumber,
  IsUUID,
  Matches,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { WhiteboardPointDto } from './whiteboard-point.dto';

export class WhiteboardStrokeEndDto {
  @IsUUID('4')
  roomId: string;

  @IsUUID('4')
  strokeId: string;

  @Matches(/^#[0-9a-fA-F]{6}$/)
  color: string;

  @IsNumber()
  @Min(1)
  @Max(48)
  width: number;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(10000)
  @ValidateNested({ each: true })
  @Type(() => WhiteboardPointDto)
  points: WhiteboardPointDto[];
}
