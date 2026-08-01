import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import {
  ApiBody,
  ApiBearerAuth,
  ApiOperation,
  ApiParam,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../guards/jwt-auth.guard';
import { UUIDPipe } from '../../pipes/uuid.pipe';
import { CurrentUser } from '../../decorators/current-user.decorator';
import type { JwtPayload } from '../auth/types/jwt-payload.types';
import { ChatService } from './chat.service';
import { GetChatMessagesQueryDto } from './dto/get-chat-messages-query.dto';
import { MarkChatReadDto } from './dto/mark-chat-read.dto';

@ApiTags('Chat')
@ApiBearerAuth('jwt')
@Controller('rooms/:roomId/chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  @Get('messages')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Получить историю сообщений комнаты' })
  @ApiParam({ name: 'roomId', description: 'ID комнаты в формате UUID v4' })
  @ApiQuery({ name: 'limit', required: false, example: 50 })
  @ApiQuery({
    name: 'before',
    required: false,
    description: 'Message ID для загрузки более старых сообщений',
  })
  @ApiResponse({ status: 200, description: 'История сообщений' })
  async findMessages(
    @Param('roomId', UUIDPipe) roomId: string,
    @Query() query: GetChatMessagesQueryDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.chatService.findMessages(
      roomId,
      user.userId,
      query.limit,
      query.before,
    );
  }

  @Get('read-state')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Получить состояние прочтения чата' })
  @ApiParam({ name: 'roomId', description: 'ID комнаты в формате UUID v4' })
  @ApiResponse({ status: 200, description: 'Состояние прочтения чата' })
  async getReadState(
    @Param('roomId', UUIDPipe) roomId: string,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.chatService.getReadState(roomId, user.userId);
  }

  @Post('read')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Отметить сообщения комнаты прочитанными' })
  @ApiParam({ name: 'roomId', description: 'ID комнаты в формате UUID v4' })
  @ApiBody({ type: MarkChatReadDto })
  @ApiResponse({ status: 201, description: 'Состояние прочтения обновлено' })
  async markRead(
    @Param('roomId', UUIDPipe) roomId: string,
    @Body() dto: MarkChatReadDto,
    @CurrentUser() user: JwtPayload,
  ) {
    return await this.chatService.markRead(roomId, user.userId, dto.messageId);
  }
}
