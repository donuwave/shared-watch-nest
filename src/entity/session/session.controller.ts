import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { CreateSessionDto } from './dto/create.dto';
import { Session } from './session.entity';
import { SessionService } from './session.service';
import { UUIDPipe } from '../../pipes/uuid.pipe';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { CurrentUser } from '../../decorators/current-user.decorator';
import { JwtPayload } from '../auth/types/jwt-payload.types';
import { RolesGuard } from '../../guards/roles.guard';
import { Roles } from '../../decorators/roles.decorator';
import { EmailVerificationGuard } from '../../guards/email-verification.guard';

@ApiTags('Session')
@ApiBearerAuth('jwt')
@Controller('session')
export class SessionController {
  constructor(private readonly sessionService: SessionService) {}

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard, EmailVerificationGuard)
  @Roles('admin')
  @ApiOperation({ summary: 'Создание сессии пользователя' })
  @ApiResponse({ status: 201, description: 'Сессия успешно создана' })
  @ApiResponse({ status: 400, description: 'Невалидные данные' })
  @ApiResponse({ status: 404, description: 'Пользователь не найден' })
  async create(@Body() createdSession: CreateSessionDto): Promise<Session> {
    return await this.sessionService.create(createdSession);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles('admin', 'moderator', 'user')
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

  @Delete('all')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({
    summary: 'Завершить все сессии пользователя (выйти со всех устройств)',
  })
  @ApiResponse({ status: 200, description: 'Все сессии успешно завершены' })
  @ApiResponse({ status: 401, description: 'Не авторизован' })
  async terminateAllSessions(
    @CurrentUser('userId') userId: JwtPayload['userId'],
  ) {
    await this.sessionService.terminateAll(userId);
    return { message: 'All sessions successfully terminated' };
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
