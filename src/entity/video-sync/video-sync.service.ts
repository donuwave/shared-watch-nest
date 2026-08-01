import {
  BadRequestException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { VideoState } from './video-state.entity';
import { SetVideoSourceDto } from './dto/set-video-source.dto';
import { RoomService } from '../room/room.service';
import { parseVideoUrl } from './video-url-parser';
import type { RoomParticipantRole } from '../room/types/room-participant-role';
import { toVideoStateSnapshot } from './video-state-snapshot';

const VIDEO_CONTROL_ROLES: RoomParticipantRole[] = ['owner', 'moderator'];

@Injectable()
export class VideoSyncService {
  constructor(
    @InjectRepository(VideoState)
    private readonly videoStateRepository: Repository<VideoState>,
    private readonly roomService: RoomService,
  ) {}

  async setSource(roomId: string, userId: string, dto: SetVideoSourceDto) {
    await this.roomService.assertRoomRole(roomId, userId, VIDEO_CONTROL_ROLES);

    const parsedUrl = this.parseSupportedVideoUrl(dto.url);
    const existingState = await this.videoStateRepository.findOne({
      where: { roomId },
    });
    const nextState =
      existingState ?? this.videoStateRepository.create({ roomId });

    nextState.sourceUrl = parsedUrl.sourceUrl;
    nextState.sourceType = parsedUrl.sourceType;
    nextState.providerVideoId = parsedUrl.providerVideoId;
    nextState.playing = false;
    nextState.currentTime = 0;
    nextState.duration =
      dto.duration === undefined ? null : this.normalizeTime(dto.duration);
    nextState.updatedByUserId = userId;

    const savedState = await this.videoStateRepository.save(nextState);

    return toVideoStateSnapshot(savedState);
  }

  async play(roomId: string, userId: string, currentTime: number) {
    await this.roomService.assertRoomRole(roomId, userId, VIDEO_CONTROL_ROLES);

    const state = await this.getExistingState(roomId);
    state.playing = true;
    state.currentTime = this.normalizeTime(currentTime);
    state.updatedByUserId = userId;

    const savedState = await this.videoStateRepository.save(state);

    return toVideoStateSnapshot(savedState);
  }

  async pause(roomId: string, userId: string, currentTime: number) {
    await this.roomService.assertRoomRole(roomId, userId, VIDEO_CONTROL_ROLES);

    const state = await this.getExistingState(roomId);
    state.playing = false;
    state.currentTime = this.normalizeTime(currentTime);
    state.updatedByUserId = userId;

    const savedState = await this.videoStateRepository.save(state);

    return toVideoStateSnapshot(savedState);
  }

  async seek(roomId: string, userId: string, currentTime: number) {
    await this.roomService.assertRoomRole(roomId, userId, VIDEO_CONTROL_ROLES);

    const state = await this.getExistingState(roomId);
    state.currentTime = this.normalizeTime(currentTime);
    state.updatedByUserId = userId;

    const savedState = await this.videoStateRepository.save(state);

    return toVideoStateSnapshot(savedState);
  }

  async getState(roomId: string, userId: string) {
    await this.roomService.getActiveParticipant(roomId, userId);

    const state = await this.videoStateRepository.findOne({
      where: { roomId },
    });

    return toVideoStateSnapshot(state);
  }

  private async getExistingState(roomId: string): Promise<VideoState> {
    const state = await this.videoStateRepository.findOne({
      where: { roomId },
    });

    if (!state) {
      throw new NotFoundException('Video source is not set');
    }

    return state;
  }

  private parseSupportedVideoUrl(sourceUrl: string) {
    try {
      const parsedUrl = parseVideoUrl(sourceUrl);

      if (parsedUrl.sourceType === 'unknown') {
        throw new BadRequestException('Unsupported video source');
      }

      return parsedUrl;
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }

      throw new BadRequestException('Invalid video URL');
    }
  }

  private normalizeTime(value: number): number {
    const normalized = Number(value);

    if (!Number.isFinite(normalized) || normalized < 0) {
      throw new BadRequestException('Invalid video time');
    }

    return normalized;
  }
}
