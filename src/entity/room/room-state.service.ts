import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { IsNull, MoreThanOrEqual, Repository } from 'typeorm';
import { Room } from './room.entity';
import { RoomParticipant } from './room-participant.entity';
import { RoomPresence } from './room-presence.entity';
import { RoomService } from './room.service';
import { VideoState } from '../video-sync/video-state.entity';
import { toVideoStateSnapshot } from '../video-sync/video-state-snapshot';
import { User } from '../users/users.entity';
import { WhiteboardState } from '../whiteboard/whiteboard-state.entity';

type RoomUserSnapshot = Pick<
  User,
  'id' | 'username' | 'discriminator' | 'avatarUrl'
>;

@Injectable()
export class RoomStateService {
  constructor(
    @InjectRepository(Room)
    private readonly roomRepository: Repository<Room>,
    @InjectRepository(RoomParticipant)
    private readonly participantRepository: Repository<RoomParticipant>,
    @InjectRepository(RoomPresence)
    private readonly presenceRepository: Repository<RoomPresence>,
    @InjectRepository(VideoState)
    private readonly videoStateRepository: Repository<VideoState>,
    @InjectRepository(WhiteboardState)
    private readonly whiteboardStateRepository: Repository<WhiteboardState>,
    private readonly roomService: RoomService,
    private readonly configService: ConfigService,
  ) {}

  async getState(roomId: string, userId: string) {
    const currentParticipant = await this.roomService.getActiveParticipant(
      roomId,
      userId,
    );

    const [room, participants, presence, video, whiteboard] = await Promise.all(
      [
        this.getRoom(roomId),
        this.getParticipants(roomId),
        this.getPresence(roomId),
        this.videoStateRepository.findOne({ where: { roomId } }),
        this.whiteboardStateRepository.findOne({ where: { roomId } }),
      ],
    );
    const currentParticipantWithUser =
      participants.find((participant) => {
        return participant.id === currentParticipant.id;
      }) ?? currentParticipant;

    return {
      room,
      currentParticipant: this.toParticipantSnapshot(
        currentParticipantWithUser,
      ),
      participants: participants.map((participant) => {
        return this.toParticipantSnapshot(participant);
      }),
      presence,
      video: toVideoStateSnapshot(video),
      whiteboard: whiteboard ?? this.getEmptyWhiteboardState(roomId),
    };
  }

  private async getRoom(roomId: string) {
    const room = await this.roomRepository.findOneOrFail({
      where: { id: roomId },
    });

    return {
      id: room.id,
      title: room.title,
      createdByUserId: room.createdByUserId,
      isOpen: room.isOpen,
      isTemporary: room.isTemporary,
      closedAt: room.closedAt,
      closedReason: room.closedReason,
      createdAt: room.createdAt,
      updatedAt: room.updatedAt,
    };
  }

  private async getParticipants(roomId: string) {
    return await this.participantRepository.find({
      where: {
        roomId,
        leftAt: IsNull(),
      },
      relations: {
        user: true,
      },
      order: {
        joinedAt: 'ASC',
      },
    });
  }

  private async getPresence(roomId: string) {
    const threshold = new Date(Date.now() - this.getPresenceGracePeriodMs());
    const presenceRecords = await this.presenceRepository.find({
      where: {
        roomId,
        lastSeenAt: MoreThanOrEqual(threshold),
      },
      order: {
        lastSeenAt: 'DESC',
      },
    });

    return presenceRecords.map((presence) => {
      return {
        id: presence.id,
        roomId: presence.roomId,
        userId: presence.userId,
        connectedAt: presence.connectedAt,
        lastSeenAt: presence.lastSeenAt,
        disconnectedAt: presence.disconnectedAt,
        isOnline: presence.disconnectedAt === null,
      };
    });
  }

  private getPresenceGracePeriodMs(): number {
    return Number(
      this.configService.get<string>('ROOM_PRESENCE_GRACE_PERIOD_MS') ?? 180000,
    );
  }

  private toParticipantSnapshot(participant: RoomParticipant) {
    return {
      id: participant.id,
      roomId: participant.roomId,
      userId: participant.userId,
      role: participant.role,
      displayNameSnapshot: participant.displayNameSnapshot,
      joinedAt: participant.joinedAt,
      leftAt: participant.leftAt,
      createdAt: participant.createdAt,
      updatedAt: participant.updatedAt,
      user: participant.user
        ? this.toUserSnapshot(participant.user)
        : undefined,
    };
  }

  private toUserSnapshot(user: User): RoomUserSnapshot {
    return {
      id: user.id,
      username: user.username,
      discriminator: user.discriminator,
      avatarUrl: user.avatarUrl,
    };
  }

  private getEmptyWhiteboardState(roomId: string) {
    return {
      id: null,
      roomId,
      enabled: false,
      snapshot: {
        strokes: [],
      },
      updatedByUserId: null,
      createdAt: null,
      updatedAt: null,
    };
  }
}
