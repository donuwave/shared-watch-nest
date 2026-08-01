import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { RoomService } from '../room/room.service';
import { VideoState } from '../video-sync/video-state.entity';
import {
  WhiteboardPoint,
  WhiteboardState,
  WhiteboardStroke,
  WhiteboardSnapshot,
} from './whiteboard-state.entity';
import type { RoomParticipantRole } from '../room/types/room-participant-role';

const WHITEBOARD_CONTROL_ROLES: RoomParticipantRole[] = ['owner', 'moderator'];
const EMPTY_SNAPSHOT: WhiteboardSnapshot = { strokes: [] };

@Injectable()
export class WhiteboardService {
  constructor(
    @InjectRepository(WhiteboardState)
    private readonly whiteboardStateRepository: Repository<WhiteboardState>,
    @InjectRepository(VideoState)
    private readonly videoStateRepository: Repository<VideoState>,
    private readonly roomService: RoomService,
  ) {}

  async getState(roomId: string, userId: string) {
    await this.roomService.getActiveParticipant(roomId, userId);

    return await this.getSnapshot(roomId);
  }

  async enable(roomId: string, userId: string) {
    await this.assertCanControl(roomId, userId);
    await this.assertVideoIsPaused(roomId);

    const state = await this.getOrCreateState(roomId);
    state.enabled = true;
    state.updatedByUserId = userId;

    return await this.whiteboardStateRepository.save(state);
  }

  async disable(roomId: string, userId: string) {
    await this.assertCanControl(roomId, userId);

    const state = await this.getOrCreateState(roomId);
    state.enabled = false;
    state.updatedByUserId = userId;

    return await this.whiteboardStateRepository.save(state);
  }

  async clear(roomId: string, userId: string) {
    await this.assertCanControl(roomId, userId);

    const state = await this.getOrCreateState(roomId);
    state.snapshot = { ...EMPTY_SNAPSHOT };
    state.updatedByUserId = userId;

    return await this.whiteboardStateRepository.save(state);
  }

  async assertCanDraw(roomId: string, userId: string): Promise<void> {
    await this.roomService.getActiveParticipant(roomId, userId);
    await this.assertWhiteboardEnabled(roomId);
    await this.assertVideoIsPaused(roomId);
  }

  async saveStroke(
    roomId: string,
    userId: string,
    stroke: Omit<WhiteboardStroke, 'userId' | 'createdAt'>,
  ) {
    await this.assertCanDraw(roomId, userId);

    const state = await this.getOrCreateState(roomId);
    const snapshot = this.normalizeSnapshot(state.snapshot);
    const hasSameStroke = snapshot.strokes.some((item) => {
      return item.id === stroke.id;
    });

    if (hasSameStroke) {
      throw new BadRequestException('Whiteboard stroke already exists');
    }

    state.snapshot = {
      strokes: [
        ...snapshot.strokes,
        {
          ...stroke,
          color: stroke.color.toLowerCase(),
          points: this.normalizePoints(stroke.points),
          userId,
          createdAt: new Date().toISOString(),
        },
      ],
    };
    state.updatedByUserId = userId;

    const savedState = await this.whiteboardStateRepository.save(state);
    const savedStroke = savedState.snapshot.strokes.find((item) => {
      return item.id === stroke.id;
    });

    return {
      state: savedState,
      stroke: savedStroke,
    };
  }

  private async getSnapshot(roomId: string) {
    const state = await this.whiteboardStateRepository.findOne({
      where: {
        roomId,
      },
    });

    return state ?? this.getEmptyState(roomId);
  }

  private async getOrCreateState(roomId: string) {
    const state = await this.whiteboardStateRepository.findOne({
      where: {
        roomId,
      },
    });

    return (
      state ??
      this.whiteboardStateRepository.create({
        roomId,
        enabled: false,
        snapshot: { ...EMPTY_SNAPSHOT },
        updatedByUserId: null,
      })
    );
  }

  private async assertCanControl(
    roomId: string,
    userId: string,
  ): Promise<void> {
    await this.roomService.assertRoomRole(
      roomId,
      userId,
      WHITEBOARD_CONTROL_ROLES,
    );
  }

  private async assertVideoIsPaused(roomId: string): Promise<void> {
    const videoState = await this.videoStateRepository.findOne({
      where: {
        roomId,
      },
    });

    if (!videoState) {
      throw new BadRequestException('Video source is not set');
    }

    if (videoState.playing) {
      throw new BadRequestException('Whiteboard is available only on pause');
    }
  }

  private async assertWhiteboardEnabled(roomId: string): Promise<void> {
    const state = await this.whiteboardStateRepository.findOne({
      where: {
        roomId,
      },
    });

    if (!state?.enabled) {
      throw new BadRequestException('Whiteboard is not enabled');
    }
  }

  private normalizeSnapshot(
    snapshot: WhiteboardSnapshot | null | undefined,
  ): WhiteboardSnapshot {
    if (!snapshot || !Array.isArray(snapshot.strokes)) {
      return { ...EMPTY_SNAPSHOT };
    }

    return snapshot;
  }

  private normalizePoints(points: WhiteboardPoint[]): WhiteboardPoint[] {
    return points.map((point) => {
      return {
        x: point.x,
        y: point.y,
        ...(point.pressure === undefined ? {} : { pressure: point.pressure }),
      };
    });
  }

  private getEmptyState(roomId: string) {
    return {
      id: null,
      roomId,
      enabled: false,
      snapshot: { ...EMPTY_SNAPSHOT },
      updatedByUserId: null,
      createdAt: null,
      updatedAt: null,
    };
  }
}
