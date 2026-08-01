import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { ChatMessage } from './chat-message.entity';
import { ChatReadState } from './chat-read-state.entity';
import { RoomService } from '../room/room.service';
import { User } from '../users/users.entity';

@Injectable()
export class ChatService {
  constructor(
    @InjectRepository(ChatMessage)
    private readonly chatMessageRepository: Repository<ChatMessage>,
    @InjectRepository(ChatReadState)
    private readonly chatReadStateRepository: Repository<ChatReadState>,
    private readonly roomService: RoomService,
  ) {}

  async findMessages(
    roomId: string,
    userId: string,
    limit = 50,
    beforeMessageId?: string,
  ) {
    await this.roomService.getActiveParticipant(roomId, userId);

    const take = Math.min(Math.max(limit, 1), 100);
    const beforeMessage = beforeMessageId
      ? await this.getMessageOrThrow(roomId, beforeMessageId)
      : null;
    const messages = await this.chatMessageRepository.find({
      where: {
        roomId,
        ...(beforeMessage
          ? { createdAt: LessThan(beforeMessage.createdAt) }
          : {}),
      },
      relations: {
        user: true,
      },
      order: {
        createdAt: 'DESC',
      },
      take,
    });

    return messages.map((message) => {
      return this.toMessageResponse(message);
    });
  }

  async send(roomId: string, userId: string, text: string) {
    await this.roomService.getActiveParticipant(roomId, userId);

    const message = await this.chatMessageRepository.save(
      this.chatMessageRepository.create({
        roomId,
        userId,
        text: this.normalizeText(text),
        editedAt: null,
        deletedAt: null,
        deletedByUserId: null,
      }),
    );

    return this.toMessageResponse(
      await this.getMessageOrThrow(roomId, message.id),
    );
  }

  async assertCanUseChat(roomId: string, userId: string): Promise<void> {
    await this.roomService.getActiveParticipant(roomId, userId);
  }

  async getReadState(roomId: string, userId: string) {
    await this.roomService.getActiveParticipant(roomId, userId);

    const readState = await this.chatReadStateRepository.findOne({
      where: {
        roomId,
        userId,
      },
    });

    return await this.toReadStateResponse(roomId, userId, readState);
  }

  async markRead(roomId: string, userId: string, messageId: string) {
    await this.roomService.getActiveParticipant(roomId, userId);

    const message = await this.getMessageOrThrow(roomId, messageId);
    const existingReadState = await this.chatReadStateRepository.findOne({
      where: {
        roomId,
        userId,
      },
    });
    const currentLastReadMessage = existingReadState?.lastReadMessageId
      ? await this.chatMessageRepository.findOne({
          where: {
            id: existingReadState.lastReadMessageId,
            roomId,
          },
        })
      : null;

    if (
      existingReadState &&
      currentLastReadMessage &&
      currentLastReadMessage.createdAt >= message.createdAt
    ) {
      return await this.toReadStateResponse(roomId, userId, existingReadState);
    }

    const nextReadState =
      existingReadState ??
      this.chatReadStateRepository.create({
        roomId,
        userId,
      });

    nextReadState.lastReadMessageId = message.id;
    nextReadState.lastReadAt = new Date();

    const savedReadState =
      await this.chatReadStateRepository.save(nextReadState);

    return await this.toReadStateResponse(roomId, userId, savedReadState);
  }

  async edit(roomId: string, messageId: string, userId: string, text: string) {
    await this.roomService.getActiveParticipant(roomId, userId);

    const message = await this.getMessageOrThrow(roomId, messageId);

    if (message.userId !== userId) {
      throw new ForbiddenException('Можно редактировать только свои сообщения');
    }

    if (message.deletedAt) {
      throw new BadRequestException('Нельзя редактировать удаленное сообщение');
    }

    message.text = this.normalizeText(text);
    message.editedAt = new Date();

    await this.chatMessageRepository.save(message);

    return this.toMessageResponse(
      await this.getMessageOrThrow(roomId, message.id),
    );
  }

  async delete(roomId: string, messageId: string, userId: string) {
    const participant = await this.roomService.getActiveParticipant(
      roomId,
      userId,
    );
    const message = await this.getMessageOrThrow(roomId, messageId);
    const canDelete =
      message.userId === userId ||
      participant.role === 'owner' ||
      participant.role === 'moderator';

    if (!canDelete) {
      throw new ForbiddenException('Недостаточно прав для удаления сообщения');
    }

    if (!message.deletedAt) {
      message.text = null;
      message.deletedAt = new Date();
      message.deletedByUserId = userId;
      await this.chatMessageRepository.save(message);
    }

    return this.toMessageResponse(
      await this.getMessageOrThrow(roomId, message.id),
    );
  }

  private async getMessageOrThrow(
    roomId: string,
    messageId: string,
  ): Promise<ChatMessage> {
    const message = await this.chatMessageRepository.findOne({
      where: {
        id: messageId,
        roomId,
      },
      relations: {
        user: true,
      },
    });

    if (!message) {
      throw new NotFoundException('Сообщение не найдено');
    }

    return message;
  }

  private normalizeText(text: string): string {
    const normalized = text.trim();

    if (!normalized) {
      throw new BadRequestException('Сообщение не может быть пустым');
    }

    if (normalized.length > 2000) {
      throw new BadRequestException('Сообщение слишком длинное');
    }

    return normalized;
  }

  private toMessageResponse(message: ChatMessage) {
    return {
      id: message.id,
      roomId: message.roomId,
      userId: message.userId,
      text: message.deletedAt ? null : message.text,
      editedAt: message.editedAt,
      deletedAt: message.deletedAt,
      deletedByUserId: message.deletedByUserId,
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
      user: this.toUserSnapshot(message.user),
    };
  }

  private async toReadStateResponse(
    roomId: string,
    userId: string,
    readState: ChatReadState | null,
  ) {
    return {
      roomId,
      userId,
      lastReadMessageId: readState?.lastReadMessageId ?? null,
      lastReadAt: readState?.lastReadAt ?? null,
      unreadCount: await this.getUnreadCount(
        roomId,
        userId,
        readState?.lastReadMessageId ?? null,
      ),
    };
  }

  private async getUnreadCount(
    roomId: string,
    userId: string,
    lastReadMessageId: string | null,
  ): Promise<number> {
    const queryBuilder = this.chatMessageRepository
      .createQueryBuilder('message')
      .where('message.roomId = :roomId', { roomId })
      .andWhere('message.userId != :userId', { userId })
      .andWhere('message.deletedAt IS NULL');

    if (lastReadMessageId) {
      const lastReadMessage = await this.chatMessageRepository.findOne({
        where: {
          id: lastReadMessageId,
          roomId,
        },
      });

      if (lastReadMessage) {
        queryBuilder.andWhere('message.createdAt > :lastReadCreatedAt', {
          lastReadCreatedAt: lastReadMessage.createdAt,
        });
      }
    }

    return await queryBuilder.getCount();
  }

  private toUserSnapshot(user: User | null | undefined) {
    if (!user) {
      return undefined;
    }

    return {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatarUrl: user.avatarUrl,
    };
  }
}
