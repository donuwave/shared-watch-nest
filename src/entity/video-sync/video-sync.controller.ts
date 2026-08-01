import { Body, Controller, Get, Param, Post, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { VideoSyncService } from './video-sync.service';
import { SetVideoSourceDto } from './dto/set-video-source.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { UUIDPipe } from '../../pipes/uuid.pipe';
import { CurrentUser } from '../../decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.types';
import { videoStateSchema } from '../../swagger/shared-watch-schemas';

@ApiTags('Video Sync')
@ApiBearerAuth('jwt')
@Controller('rooms/:roomId/video')
export class VideoSyncController {
  constructor(private readonly videoSyncService: VideoSyncService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Установить источник видео в комнате' })
  @ApiParam({ name: 'roomId', description: 'ID комнаты в формате UUID v4' })
  @ApiBody({ type: SetVideoSourceDto })
  @ApiResponse({
    status: 201,
    description: 'Источник видео установлен',
    schema: videoStateSchema,
  })
  @ApiResponse({
    status: 400,
    description: 'Невалидная или неподдерживаемая ссылка',
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({
    status: 403,
    description: 'Нужна room role owner или moderator',
  })
  async setSource(
    @Param('roomId', UUIDPipe) roomId: string,
    @Body() dto: SetVideoSourceDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.videoSyncService.setSource(roomId, user.userId, dto);
  }

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Получить текущее состояние видео' })
  @ApiParam({ name: 'roomId', description: 'ID комнаты в формате UUID v4' })
  @ApiResponse({
    status: 200,
    description: 'Состояние видео или null, если источник еще не задан',
    schema: videoStateSchema,
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  @ApiResponse({ status: 403, description: 'Нет доступа к комнате' })
  async getState(
    @Param('roomId', UUIDPipe) roomId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.videoSyncService.getState(roomId, user.userId);
  }
}
