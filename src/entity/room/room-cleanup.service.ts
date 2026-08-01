import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RoomService } from './room.service';

@Injectable()
export class RoomCleanupService implements OnModuleInit, OnModuleDestroy {
  private cleanupTimer?: NodeJS.Timeout;

  constructor(
    private readonly configService: ConfigService,
    private readonly roomService: RoomService,
  ) {}

  onModuleInit(): void {
    const intervalMs = Number(
      this.configService.get<string>('ROOM_CLEANUP_INTERVAL_MS') ?? 60000,
    );

    this.cleanupTimer = setInterval(() => {
      void this.roomService.closeEmptyTemporaryRooms(
        this.getPresenceGracePeriodMs(),
      );
    }, intervalMs);

    this.cleanupTimer.unref();
  }

  onModuleDestroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
  }

  private getPresenceGracePeriodMs(): number {
    return Number(
      this.configService.get<string>('ROOM_PRESENCE_GRACE_PERIOD_MS') ?? 180000,
    );
  }
}
