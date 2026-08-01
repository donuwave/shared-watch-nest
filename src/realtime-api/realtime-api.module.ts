import { Module } from '@nestjs/common';
import { RealtimeApiController } from './realtime-api.controller';

@Module({
  controllers: [RealtimeApiController],
})
export class RealtimeApiModule {}
