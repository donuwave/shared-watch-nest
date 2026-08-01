import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomService } from '../room.service';
import type { JwtPayload } from '../../auth/types/jwt-payload.types';

type SocketData = {
  user?: JwtPayload;
  roomId?: string;
};

type SocketDataHolder = {
  data: SocketData;
};

type JoinRoomPayload = {
  roomId?: string;
};

@WebSocketGateway({
  namespace: 'rooms',
  cors: {
    origin: 'http://localhost:3000',
    credentials: true,
  },
})
export class RoomPresenceGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  private readonly server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly roomService: RoomService,
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

  async handleDisconnect(client: Socket): Promise<void> {
    await this.roomService.markDisconnected(client.id);
    const socketData = this.getSocketData(client);

    if (socketData.roomId) {
      client.to(this.getSocketRoom(socketData.roomId)).emit('presence:left', {
        userId: socketData.user?.userId,
        connectionId: client.id,
      });
    }
  }

  @SubscribeMessage('room:join')
  async joinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    const socketData = this.getSocketData(client);
    const user = socketData.user;

    if (!user?.userId || !payload.roomId) {
      client.disconnect(true);
      return { ok: false };
    }

    await this.roomService.markConnected(
      payload.roomId,
      user.userId,
      client.id,
    );
    socketData.roomId = payload.roomId;
    await client.join(this.getSocketRoom(payload.roomId));

    this.server.to(this.getSocketRoom(payload.roomId)).emit('presence:joined', {
      userId: user.userId,
      connectionId: client.id,
    });

    return {
      ok: true,
      roomId: payload.roomId,
    };
  }

  @SubscribeMessage('room:heartbeat')
  async heartbeat(@ConnectedSocket() client: Socket) {
    await this.roomService.markSeen(client.id);

    return {
      ok: true,
      ts: new Date().toISOString(),
    };
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
