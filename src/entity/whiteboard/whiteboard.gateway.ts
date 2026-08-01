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
import { WhiteboardService } from './whiteboard.service';
import { WhiteboardRoomDto } from './dto/whiteboard-room.dto';
import { WhiteboardStrokeStartDto } from './dto/whiteboard-stroke-start.dto';
import { WhiteboardStrokeAppendDto } from './dto/whiteboard-stroke-append.dto';
import { WhiteboardStrokeEndDto } from './dto/whiteboard-stroke-end.dto';

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
export class WhiteboardGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly whiteboardService: WhiteboardService,
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

  @SubscribeMessage('whiteboard:enable')
  async enable(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WhiteboardRoomDto,
  ) {
    const user = this.getSocketData(client).user;

    if (!user?.userId || !payload.roomId) {
      client.disconnect(true);
      return { ok: false };
    }

    const state = await this.whiteboardService.enable(
      payload.roomId,
      user.userId,
    );

    this.emitState(payload.roomId, state);

    return { ok: true, state };
  }

  @SubscribeMessage('whiteboard:disable')
  async disable(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WhiteboardRoomDto,
  ) {
    const user = this.getSocketData(client).user;

    if (!user?.userId || !payload.roomId) {
      client.disconnect(true);
      return { ok: false };
    }

    const state = await this.whiteboardService.disable(
      payload.roomId,
      user.userId,
    );

    this.emitState(payload.roomId, state);

    return { ok: true, state };
  }

  @SubscribeMessage('whiteboard:clear')
  async clear(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WhiteboardRoomDto,
  ) {
    const user = this.getSocketData(client).user;

    if (!user?.userId || !payload.roomId) {
      client.disconnect(true);
      return { ok: false };
    }

    const state = await this.whiteboardService.clear(
      payload.roomId,
      user.userId,
    );

    this.emitState(payload.roomId, state);

    return { ok: true, state };
  }

  @SubscribeMessage('whiteboard:stroke-start')
  async strokeStart(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WhiteboardStrokeStartDto,
  ) {
    const user = await this.getActiveUserForDrawing(client, payload.roomId);

    if (!user) {
      return { ok: false };
    }

    const event = {
      roomId: payload.roomId,
      strokeId: payload.strokeId,
      userId: user.userId,
      color: payload.color.toLowerCase(),
      width: payload.width,
      point: payload.point,
      ts: new Date().toISOString(),
    };

    client
      .to(this.getSocketRoom(payload.roomId))
      .emit('whiteboard:stroke-start', event);

    return { ok: true, event };
  }

  @SubscribeMessage('whiteboard:stroke-append')
  async strokeAppend(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WhiteboardStrokeAppendDto,
  ) {
    const user = await this.getActiveUserForDrawing(client, payload.roomId);

    if (!user) {
      return { ok: false };
    }

    const event = {
      roomId: payload.roomId,
      strokeId: payload.strokeId,
      userId: user.userId,
      points: payload.points,
      ts: new Date().toISOString(),
    };

    client
      .to(this.getSocketRoom(payload.roomId))
      .emit('whiteboard:stroke-append', event);

    return { ok: true, event };
  }

  @SubscribeMessage('whiteboard:stroke-end')
  async strokeEnd(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: WhiteboardStrokeEndDto,
  ) {
    const user = this.getSocketData(client).user;

    if (!user?.userId || !payload.roomId) {
      client.disconnect(true);
      return { ok: false };
    }

    const result = await this.whiteboardService.saveStroke(
      payload.roomId,
      user.userId,
      {
        id: payload.strokeId,
        color: payload.color,
        width: payload.width,
        points: payload.points,
      },
    );

    this.server
      .to(this.getSocketRoom(payload.roomId))
      .emit('whiteboard:stroke-end', {
        roomId: payload.roomId,
        stroke: result.stroke,
      });

    return { ok: true, stroke: result.stroke, state: result.state };
  }

  private emitState(roomId: string, state: unknown): void {
    this.server.to(this.getSocketRoom(roomId)).emit('whiteboard:state', state);
  }

  private async getActiveUserForDrawing(
    client: Socket,
    roomId: string | undefined,
  ): Promise<JwtPayload | null> {
    const user = this.getSocketData(client).user;

    if (!user?.userId || !roomId) {
      client.disconnect(true);
      return null;
    }

    await this.whiteboardService.assertCanDraw(roomId, user.userId);

    return user;
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
