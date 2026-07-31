import { BadGatewayException, PipeTransform } from '@nestjs/common';
import { isUUID } from 'class-validator';

export class UUIDPipe implements PipeTransform {
  transform(value: string) {
    if (!isUUID(value, '4')) {
      throw new BadGatewayException({
        status: 400,
        message: 'ID должен быть в формате UUID',
      });
    }

    return value;
  }
}
