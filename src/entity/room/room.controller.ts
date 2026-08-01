import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiParam,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { RoomService } from './room.service';
import { RoomStateService } from './room-state.service';
import { CreateRoomDto } from './dto/create-room.dto';
import { UpdateRoomAccessDto } from './dto/update-room-access.dto';
import { UpdateRoomParticipantRoleDto } from './dto/update-room-participant-role.dto';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { FeatureGuard } from '../../guards/feature.guard';
import { Feature } from '../../decorators/feature.decorator';
import { CurrentUser } from '../../decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.types';
import { UUIDPipe } from '../../pipes/uuid.pipe';

@ApiTags('Rooms')
@ApiBearerAuth('jwt')
@Controller('rooms')
export class RoomController {
  constructor(
    private readonly roomService: RoomService,
    private readonly roomStateService: RoomStateService,
  ) {}

  @Post()
  @UseGuards(JwtAuthGuard, FeatureGuard)
  @Feature('rooms.create')
  @ApiOperation({ summary: 'Создать комнату' })
  @ApiResponse({ status: 201, description: 'Комната создана' })
  @ApiResponse({ status: 403, description: 'Feature rooms.create недоступна' })
  @ApiBody({ type: CreateRoomDto })
  async create(
    @Body() createRoomDto: CreateRoomDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.roomService.create(createRoomDto, user.userId);
  }

  @Post('join/:code')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Войти в комнату по invite code' })
  @ApiParam({ name: 'code', description: 'Invite code' })
  @ApiResponse({ status: 201, description: 'Пользователь вошел в комнату' })
  async joinByInvite(
    @Param('code') code: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.roomService.joinByInvite(code, user.userId);
  }

  @Post(':id/leave')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Выйти из комнаты' })
  @ApiParam({ name: 'id', description: 'ID комнаты в формате UUID v4' })
  @ApiResponse({ status: 201, description: 'Пользователь вышел из комнаты' })
  async leave(
    @Param('id', UUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.roomService.leave(id, user.userId);
  }

  @Patch(':id/participants/:participantId/role')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Изменить роль участника комнаты' })
  @ApiParam({ name: 'id', description: 'ID комнаты в формате UUID v4' })
  @ApiParam({
    name: 'participantId',
    description: 'ID участника комнаты в формате UUID v4',
  })
  @ApiBody({ type: UpdateRoomParticipantRoleDto })
  @ApiResponse({ status: 200, description: 'Роль участника изменена' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав в комнате' })
  async updateParticipantRole(
    @Param('id', UUIDPipe) id: string,
    @Param('participantId', UUIDPipe) participantId: string,
    @Body() dto: UpdateRoomParticipantRoleDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.roomService.updateParticipantRole(
      id,
      participantId,
      user.userId,
      dto.role,
    );
  }

  @Patch(':id/access')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Изменить доступность входа в комнату' })
  @ApiParam({ name: 'id', description: 'ID комнаты в формате UUID v4' })
  @ApiBody({ type: UpdateRoomAccessDto })
  @ApiResponse({ status: 200, description: 'Доступность входа изменена' })
  @ApiResponse({ status: 403, description: 'Недостаточно прав в комнате' })
  async updateAccess(
    @Param('id', UUIDPipe) id: string,
    @Body() dto: UpdateRoomAccessDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.roomService.updateAccess(id, user.userId, dto.isOpen);
  }

  @Get(':id/state')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Получить состояние комнаты для восстановления UI' })
  @ApiParam({ name: 'id', description: 'ID комнаты в формате UUID v4' })
  @ApiResponse({ status: 200, description: 'Состояние комнаты' })
  async getState(
    @Param('id', UUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.roomStateService.getState(id, user.userId);
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Получить комнату по ID' })
  @ApiParam({ name: 'id', description: 'ID комнаты в формате UUID v4' })
  @ApiResponse({ status: 200, description: 'Комната найдена' })
  async findOne(
    @Param('id', UUIDPipe) id: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.roomService.findOne(id, user.userId);
  }
}
