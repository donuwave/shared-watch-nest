import { BadRequestException, PipeTransform } from '@nestjs/common';
import { isUUID } from 'class-validator';

export class UUIDPipe implements PipeTransform {
  transform(value: string) {
    if (!isUUID(value, '4')) {
      throw new BadRequestException({
        code: 'INVALID_UUID',
        message: 'ID должен быть в формате UUID',
      });
    }

    return value;
  }
}
