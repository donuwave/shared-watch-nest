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
import { ChatService } from './chat.service';
import type { SendChatMessageDto } from './dto/send-chat-message.dto';
import type { EditChatMessageDto } from './dto/edit-chat-message.dto';
import type { DeleteChatMessageDto } from './dto/delete-chat-message.dto';
import type { ChatTypingDto } from './dto/chat-typing.dto';
import type { ChatReadDto } from './dto/chat-read.dto';

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
export class ChatGateway implements OnGatewayConnection {
  @WebSocketServer()
  private readonly server: Server;

  constructor(
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
    private readonly chatService: ChatService,
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

  @SubscribeMessage('chat:send')
  async send(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: SendChatMessageDto,
  ) {
    const user = this.getSocketData(client).user;

    if (!user?.userId || !payload.roomId) {
      client.disconnect(true);
      return { ok: false };
    }

    const message = await this.chatService.send(
      payload.roomId,
      user.userId,
      payload.text,
    );

    this.emitToRoom(payload.roomId, 'chat:message', message);

    return { ok: true, message };
  }

  @SubscribeMessage('chat:edit')
  async edit(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: EditChatMessageDto,
  ) {
    const user = this.getSocketData(client).user;

    if (!user?.userId || !payload.roomId || !payload.messageId) {
      client.disconnect(true);
      return { ok: false };
    }

    const message = await this.chatService.edit(
      payload.roomId,
      payload.messageId,
      user.userId,
      payload.text,
    );

    this.emitToRoom(payload.roomId, 'chat:message-edited', message);

    return { ok: true, message };
  }

  @SubscribeMessage('chat:delete')
  async delete(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: DeleteChatMessageDto,
  ) {
    const user = this.getSocketData(client).user;

    if (!user?.userId || !payload.roomId || !payload.messageId) {
      client.disconnect(true);
      return { ok: false };
    }

    const message = await this.chatService.delete(
      payload.roomId,
      payload.messageId,
      user.userId,
    );

    this.emitToRoom(payload.roomId, 'chat:message-deleted', message);

    return { ok: true, message };
  }

  @SubscribeMessage('chat:typing')
  async typing(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatTypingDto,
  ) {
    const user = this.getSocketData(client).user;

    if (!user?.userId || !payload.roomId) {
      client.disconnect(true);
      return { ok: false };
    }

    await this.chatService.assertCanUseChat(payload.roomId, user.userId);

    client.to(this.getSocketRoom(payload.roomId)).emit('chat:typing', {
      roomId: payload.roomId,
      userId: user.userId,
      isTyping: payload.isTyping ?? true,
      ts: new Date().toISOString(),
    });

    return { ok: true };
  }

  @SubscribeMessage('chat:read')
  async read(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ChatReadDto,
  ) {
    const user = this.getSocketData(client).user;

    if (!user?.userId || !payload.roomId || !payload.messageId) {
      client.disconnect(true);
      return { ok: false };
    }

    const readState = await this.chatService.markRead(
      payload.roomId,
      user.userId,
      payload.messageId,
    );

    this.emitToRoom(payload.roomId, 'chat:read', readState);

    return { ok: true, readState };
  }

  private emitToRoom(roomId: string, event: string, payload: unknown): void {
    this.server.to(this.getSocketRoom(roomId)).emit(event, payload);
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
