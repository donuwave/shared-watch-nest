import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, EntityManager, IsNull, Repository } from 'typeorm';
import { randomBytes } from 'crypto';
import { Room } from './room.entity';
import { RoomParticipant } from './room-participant.entity';
import { RoomInvite } from './room-invite.entity';
import { RoomPresence } from './room-presence.entity';
import { CreateRoomDto } from './dto/create-room.dto';
import type { ManageableRoomParticipantRole } from './dto/update-room-participant-role.dto';
import { UsersService } from '../users/users.service';
import type { RoomParticipantRole } from './types/room-participant-role';
import type { RoomClosedReason } from './types/room-closed-reason';

@Injectable()
export class RoomService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(RoomParticipant)
    private readonly participantRepository: Repository<RoomParticipant>,
    @InjectRepository(RoomInvite)
    private readonly inviteRepository: Repository<RoomInvite>,
    @InjectRepository(RoomPresence)
    private readonly presenceRepository: Repository<RoomPresence>,
    private readonly usersService: UsersService,
    private readonly dataSource: DataSource,
  ) {}

  async create(createRoomDto: CreateRoomDto, userId: string) {
    const user = await this.usersService.findOne(userId);
    const displayNameSnapshot = this.getDisplayNameSnapshot(user);

    return await this.dataSource.transaction(async (manager) => {
      const room = await manager.save(
        manager.create(Room, {
          title: createRoomDto.title,
          createdByUserId: userId,
          isOpen: createRoomDto.isOpen ?? true,
          isTemporary: createRoomDto.isTemporary ?? true,
          closedAt: null,
          closedReason: null,
        }),
      );

      const participant = await manager.save(
        manager.create(RoomParticipant, {
          roomId: room.id,
          userId,
          role: 'owner' satisfies RoomParticipantRole,
          displayNameSnapshot,
          joinedAt: new Date(),
          leftAt: null,
        }),
      );

      const invite = await manager.save(
        manager.create(RoomInvite, {
          roomId: room.id,
          code: await this.generateUniqueInviteCode(),
          expiresAt: null,
          maxUses: null,
          usedCount: 0,
          isActive: true,
          createdByUserId: userId,
        }),
      );

      return {
        room,
        currentParticipant: participant,
        invite: this.toInviteResponse(invite),
      };
    });
  }

  async findOne(roomId: string, userId: string) {
    await this.assertActiveParticipant(roomId, userId);

    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      relations: ['participants', 'participants.user', 'invites'],
      order: {
        participants: {
          joinedAt: 'ASC',
        },
      },
    });

    if (!room) {
      throw new NotFoundException('Комната не найдена');
    }

    if (room.closedAt) {
      throw new ForbiddenException('Комната закрыта');
    }

    return {
      ...room,
      participants: room.participants.filter((participant) => {
        return !participant.leftAt;
      }),
      invites: room.invites
        .filter((invite) => invite.isActive)
        .map((invite) => this.toInviteResponse(invite)),
    };
  }

  async joinByInvite(code: string, userId: string) {
    const user = await this.usersService.findOne(userId);
    const invite = await this.inviteRepository.findOne({
      where: { code },
      relations: ['room'],
    });

    if (!invite || !invite.isActive) {
      throw new NotFoundException('Invite не найден');
    }

    if (invite.expiresAt && invite.expiresAt <= new Date()) {
      throw new BadRequestException('Invite истек');
    }

    return await this.dataSource.transaction(async (manager) => {
      const existingParticipant = await manager.findOne(RoomParticipant, {
        where: {
          roomId: invite.roomId,
          userId,
        },
      });

      if (invite.room.closedAt) {
        throw new ForbiddenException('Комната закрыта');
      }

      if (!invite.room.isOpen && !existingParticipant) {
        throw new ForbiddenException('Вход в комнату закрыт');
      }

      if (existingParticipant) {
        existingParticipant.leftAt = null;
        existingParticipant.joinedAt = new Date();
        existingParticipant.displayNameSnapshot =
          this.getDisplayNameSnapshot(user);

        return {
          room: invite.room,
          currentParticipant: await manager.save(existingParticipant),
        };
      }

      if (invite.maxUses !== null && invite.usedCount >= invite.maxUses) {
        throw new BadRequestException('Invite уже использован');
      }

      invite.usedCount += 1;
      await manager.save(invite);

      const participant = await manager.save(
        manager.create(RoomParticipant, {
          roomId: invite.roomId,
          userId,
          role: 'member' satisfies RoomParticipantRole,
          displayNameSnapshot: this.getDisplayNameSnapshot(user),
          joinedAt: new Date(),
          leftAt: null,
        }),
      );

      return {
        room: invite.room,
        currentParticipant: participant,
      };
    });
  }

  async leave(roomId: string, userId: string) {
    const participant = await this.participantRepository.findOne({
      where: {
        roomId,
        userId,
        leftAt: IsNull(),
      },
    });

    if (!participant) {
      throw new NotFoundException('Активный участник комнаты не найден');
    }

    return await this.dataSource.transaction(async (manager) => {
      participant.leftAt = new Date();
      await manager.save(participant);

      await manager.update(
        RoomPresence,
        {
          roomId,
          userId,
          disconnectedAt: IsNull(),
        },
        {
          disconnectedAt: new Date(),
        },
      );

      await this.closeTemporaryRoomIfEmpty(roomId, manager);

      return { message: 'Вы вышли из комнаты' };
    });
  }

  async getActiveParticipant(
    roomId: string,
    userId: string,
  ): Promise<RoomParticipant> {
    const participant = await this.participantRepository.findOne({
      where: {
        roomId,
        userId,
        leftAt: IsNull(),
      },
    });

    if (!participant) {
      throw new ForbiddenException('Нет доступа к комнате');
    }

    const room = await this.roomRepository.findOne({
      where: { id: roomId },
      select: ['id', 'closedAt'],
    });

    if (!room) {
      throw new NotFoundException('Комната не найдена');
    }

    if (room.closedAt) {
      throw new ForbiddenException('Комната закрыта');
    }

    return participant;
  }

  async updateAccess(
    roomId: string,
    userId: string,
    isOpen: boolean,
  ): Promise<Room> {
    await this.assertRoomRole(roomId, userId, ['owner']);

    const room = await this.roomRepository.findOne({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Комната не найдена');
    }

    if (room.closedAt) {
      throw new ForbiddenException('Комната закрыта');
    }

    room.isOpen = isOpen;

    return await this.roomRepository.save(room);
  }

  async assertRoomRole(
    roomId: string,
    userId: string,
    allowedRoles: RoomParticipantRole[],
  ): Promise<RoomParticipant> {
    const participant = await this.getActiveParticipant(roomId, userId);

    if (!allowedRoles.includes(participant.role)) {
      throw new ForbiddenException('Недостаточно прав в комнате');
    }

    return participant;
  }

  async updateParticipantRole(
    roomId: string,
    participantId: string,
    actorUserId: string,
    role: ManageableRoomParticipantRole,
  ): Promise<RoomParticipant> {
    await this.assertRoomRole(roomId, actorUserId, ['owner']);

    const participant = await this.participantRepository.findOne({
      where: {
        id: participantId,
        roomId,
        leftAt: IsNull(),
      },
    });

    if (!participant) {
      throw new NotFoundException('Активный участник комнаты не найден');
    }

    if (participant.role === 'owner') {
      throw new BadRequestException('Нельзя изменить роль владельца комнаты');
    }

    participant.role = role;

    return await this.participantRepository.save(participant);
  }

  async markConnected(
    roomId: string,
    userId: string,
    connectionId: string,
  ): Promise<RoomPresence> {
    await this.assertActiveParticipant(roomId, userId);

    const now = new Date();
    const existingPresence = await this.presenceRepository.findOne({
      where: {
        roomId,
        userId,
        connectionId,
      },
    });

    if (existingPresence) {
      existingPresence.connectedAt = now;
      existingPresence.lastSeenAt = now;
      existingPresence.disconnectedAt = null;

      return await this.presenceRepository.save(existingPresence);
    }

    return await this.presenceRepository.save(
      this.presenceRepository.create({
        roomId,
        userId,
        connectionId,
        connectedAt: now,
        lastSeenAt: now,
        disconnectedAt: null,
      }),
    );
  }

  async markSeen(connectionId: string): Promise<void> {
    await this.presenceRepository.update(
      {
        connectionId,
        disconnectedAt: IsNull(),
      },
      {
        lastSeenAt: new Date(),
      },
    );
  }

  async markDisconnected(connectionId: string): Promise<void> {
    await this.presenceRepository.update(
      {
        connectionId,
        disconnectedAt: IsNull(),
      },
      {
        disconnectedAt: new Date(),
      },
    );
  }

  async closeEmptyTemporaryRooms(gracePeriodMs: number): Promise<number> {
    const threshold = new Date(Date.now() - gracePeriodMs);
    const rooms = await this.roomRepository.find({
      where: {
        isTemporary: true,
        closedAt: IsNull(),
      },
    });
    let closedCount = 0;

    for (const room of rooms) {
      const hasActiveParticipant = await this.hasActiveParticipants(room.id);
      const hasRecentPresence = await this.hasRecentPresence(
        room.id,
        threshold,
      );

      if (hasActiveParticipant || hasRecentPresence) {
        continue;
      }

      await this.closeRoom(room.id, 'empty_temporary_room');
      closedCount += 1;
    }

    return closedCount;
  }

  private async assertActiveParticipant(
    roomId: string,
    userId: string,
  ): Promise<void> {
    await this.getActiveParticipant(roomId, userId);
  }

  private async closeTemporaryRoomIfEmpty(
    roomId: string,
    manager: EntityManager,
  ): Promise<void> {
    const room = await this.roomRepository.findOne({
      where: { id: roomId },
    });

    if (!room?.isTemporary || room.closedAt) {
      return;
    }

    const activeParticipantsCount = await manager.count(RoomParticipant, {
      where: {
        roomId,
        leftAt: IsNull(),
      },
    });

    if (activeParticipantsCount > 0) {
      return;
    }

    await manager.update(
      Room,
      { id: roomId },
      {
        closedAt: new Date(),
        closedReason: 'empty_temporary_room',
        isOpen: false,
      },
    );
  }

  private async closeRoom(
    roomId: string,
    reason: RoomClosedReason,
  ): Promise<void> {
    await this.roomRepository.update(
      {
        id: roomId,
        closedAt: IsNull(),
      },
      {
        closedAt: new Date(),
        closedReason: reason,
        isOpen: false,
      },
    );
  }

  private async hasActiveParticipants(roomId: string): Promise<boolean> {
    const activeParticipantsCount = await this.participantRepository.count({
      where: {
        roomId,
        leftAt: IsNull(),
      },
    });

    return activeParticipantsCount > 0;
  }

  private async hasRecentPresence(
    roomId: string,
    threshold: Date,
  ): Promise<boolean> {
    const recentPresenceCount = await this.presenceRepository
      .createQueryBuilder('presence')
      .where('presence.roomId = :roomId', { roomId })
      .andWhere('presence.disconnectedAt IS NULL')
      .andWhere('presence.lastSeenAt >= :threshold', { threshold })
      .getCount();

    return recentPresenceCount > 0;
  }

  private async generateUniqueInviteCode(): Promise<string> {
    for (let attempt = 0; attempt < 20; attempt += 1) {
      const code = randomBytes(12).toString('base64url');
      const existingInvite = await this.inviteRepository.findOne({
        where: { code },
      });

      if (!existingInvite) {
        return code;
      }
    }

    throw new BadRequestException('Не удалось создать invite code');
  }

  private getDisplayNameSnapshot(user: {
    username: string;
    discriminator: string;
  }): string {
    return `${user.username}#${user.discriminator}`;
  }

  private toInviteResponse(invite: RoomInvite) {
    return {
      id: invite.id,
      roomId: invite.roomId,
      code: invite.code,
      expiresAt: invite.expiresAt,
      maxUses: invite.maxUses,
      usedCount: invite.usedCount,
      isActive: invite.isActive,
      createdAt: invite.createdAt,
    };
  }
}
