import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import type { JwtPayload } from '../auth/types/jwt-payload.types';
import { VideoSyncService } from './video-sync.service';
import type { SetVideoSourceDto } from './dto/set-video-source.dto';
import type { VideoControlDto } from './dto/video-control.dto';
import type { VideoSyncRequestDto } from './dto/video-sync-request.dto';

type SocketData = {
  user?: JwtPayload;
};

type SocketDataHolder = {
  data: SocketData;
};

@WebSocketGateway({
  namespace: 'rooms',
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class VideoSyncGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly videoSyncService: VideoSyncService,
  ) {}

  async handleConnection(client: Socket): Promise<void> {
    const token = this.extractAccessToken(client);

    if (!token) {
      client.disconnect(true);
      return;
    }

    try {
      const user = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.configService.getOrThrow<string>('JWT_ACCESS_SECRET'),
      });

      this.getSocketData(client).user = user;
    } catch {
      client.disconnect(true);
    }
  }

  @SubscribeMessage('video:source-set')
  async setSource(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SetVideoSourceDto & { roomId?: string },
  ) {
    const user = this.getSocketData(client).user;

    if (!user?.userId || !payload.roomId) {
      client.disconnect(true);
      return { ok: false };
    }

    const state = await this.videoSyncService.setSource(
      payload.roomId,
      user.userId,
      payload,
    );

    this.emitState(payload.roomId, 'video:source-changed', state);

    return { ok: true, state };
  }

  @SubscribeMessage('video:play')
  async play(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: VideoControlDto,
  ) {
    const state = await this.applyControl(client, payload, 'play');

    if (state) {
      this.emitState(payload.roomId, 'video:state', state);
    }

    return { ok: Boolean(state), state };
  }

  @SubscribeMessage('video:pause')
  async pause(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: VideoControlDto,
  ) {
    const state = await this.applyControl(client, payload, 'pause');

    if (state) {
      this.emitState(payload.roomId, 'video:state', state);
    }

    return { ok: Boolean(state), state };
  }

  @SubscribeMessage('video:seek')
  async seek(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: VideoControlDto,
  ) {
    const state = await this.applyControl(client, payload, 'seek');

    if (state) {
      this.emitState(payload.roomId, 'video:state', state);
    }

    return { ok: Boolean(state), state };
  }

  @SubscribeMessage('video:sync-request')
  async syncRequest(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: VideoSyncRequestDto,
  ) {
    const user = this.getSocketData(client).user;

    if (!user?.userId || !payload.roomId) {
      client.disconnect(true);
      return { ok: false };
    }

    const state = await this.videoSyncService.getState(
      payload.roomId,
      user.userId,
    );

    client.emit('video:sync-state', state);

    return { ok: true, state };
  }

  private async applyControl(
    client: Socket,
    payload: VideoControlDto,
    action: 'play' | 'pause' | 'seek',
  ) {
    const user = this.getSocketData(client).user;

    if (!user?.userId || !payload.roomId) {
      client.disconnect(true);
      return null;
    }

    switch (action) {
      case 'play':
        return await this.videoSyncService.play(
          payload.roomId,
          user.userId,
          payload.currentTime,
        );
      case 'pause':
        return await this.videoSyncService.pause(
          payload.roomId,
          user.userId,
          payload.currentTime,
        );
      case 'seek':
        return await this.videoSyncService.seek(
          payload.roomId,
          user.userId,
          payload.currentTime,
        );
    }
  }

  private emitState(roomId: string, event: string, state: unknown): void {
    this.server.to(this.getSocketRoom(roomId)).emit(event, state);
  }

  private extractAccessToken(client: Socket): string | null {
    const auth = client.handshake.auth as Record<string, unknown> | undefined;
    const authToken = auth?.token;

    if (typeof authToken === 'string' && authToken) {
      return authToken;
    }

    const headerToken = client.handshake.headers.authorization;

    if (typeof headerToken === 'string' && headerToken.startsWith('Bearer ')) {
      return headerToken.slice('Bearer '.length);
    }

    const accessTokenHeader = client.handshake.headers.accesstoken;

    if (typeof accessTokenHeader === 'string' && accessTokenHeader) {
      return accessTokenHeader;
    }

    return null;
  }

  private getSocketData(client: Socket): SocketData {
    const socket = client as unknown as SocketDataHolder;

    return socket.data;
  }

  private getSocketRoom(roomId: string): string {
    return `room:${roomId}`;
  }
}
