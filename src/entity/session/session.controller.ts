import { Controller, Delete, Get, Param, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { Session } from './session.entity';
import { SessionService } from './session.service';
import { UUIDPipe } from '../../pipes/uuid.pipe';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.types';

@ApiTags('Session')
@ApiBearerAuth('jwt')
@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Получение всех активных сессий текущего пользователя',
  })
  @ApiResponse({ status: 200, description: 'Список активных сессий' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async findAll(
    @CurrentUser('userId') userId: JwtPayload['userId'],
  ): Promise<Session[]> {
    return await this.sessionService.getActiveSessionByUserId(userId);
  }

  @Delete('others')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary:
      'Завершить все сессии кроме текущей (выйти со всех устройств, кроме этого)',
  })
  @ApiResponse({
    status: 200,
    description: 'Все сессии кроме текущей успешно завершены',
  })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async terminateOtherSessions(
    @CurrentUser('sessionId') sessionId: JwtPayload['sessionId'],
    @CurrentUser('userId') userId: JwtPayload['userId'],
  ) {
    await this.sessionService.terminateOthers(sessionId, userId);
    return { message: 'All other sessions successfully terminated' };
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Завершить конкретную сессию' })
  @ApiResponse({ status: 200, description: 'Сессия успешно завершена' })
  @ApiResponse({ status: 404, description: 'Сессия не найдена' })
  @ApiResponse({ status: 400, description: 'Невалидный формат ID' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async terminate(
    @Param('id', UUIDPipe) sessionId: string,
    @CurrentUser('userId') userId: JwtPayload['userId'],
  ) {
    await this.sessionService.terminate(sessionId, userId);
    return { message: 'Сессия успешно завершена' };
  }
}
