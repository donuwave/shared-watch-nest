import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsUUID,
  ValidateNested,
} from 'class-validator';
import { WhiteboardPointDto } from './whiteboard-point.dto';

export class WhiteboardStrokeAppendDto {
  @IsUUID('4')
  roomId: string;

  @IsUUID('4')
  strokeId: string;

  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(256)
  @ValidateNested({ each: true })
  @Type(() => WhiteboardPointDto)
  points: WhiteboardPointDto[];
}
