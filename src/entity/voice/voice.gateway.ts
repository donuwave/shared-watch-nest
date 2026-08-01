import { BadRequestException } from '@nestjs/common';
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
import { RoomService } from '../room/room.service';
import type { VoiceRoomDto } from './dto/voice-room.dto';
import type { VoiceSignalDto } from './dto/voice-signal.dto';
import type { VoiceIceCandidateDto } from './dto/voice-ice-candidate.dto';
import type { VoiceMuteDto } from './dto/voice-mute.dto';
import type { VoiceMuteParticipantDto } from './dto/voice-mute-participant.dto';
import type { VoiceSpeakingDto } from './dto/voice-speaking.dto';

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
export class VoiceGateway implements OnGatewayConnection {
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

  @SubscribeMessage('voice:join')
  async join(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: VoiceRoomDto,
  ) {
    const user = await this.getActiveSocketUser(client, payload.roomId);

    if (!user) {
      return { ok: false };
    }

    client.to(this.getSocketRoom(payload.roomId)).emit('voice:joined', {
      roomId: payload.roomId,
      userId: user.userId,
    });

    return { ok: true, roomId: payload.roomId };
  }

  @SubscribeMessage('voice:leave')
  async leave(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: VoiceRoomDto,
  ) {
    const user = await this.getActiveSocketUser(client, payload.roomId);

    if (!user) {
      return { ok: false };
    }

    client.to(this.getSocketRoom(payload.roomId)).emit('voice:left', {
      roomId: payload.roomId,
      userId: user.userId,
    });

    return { ok: true, roomId: payload.roomId };
  }

  @SubscribeMessage('voice:offer')
  async offer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: VoiceSignalDto,
  ) {
    return await this.forwardSignal(client, payload, 'voice:offer');
  }

  @SubscribeMessage('voice:answer')
  async answer(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: VoiceSignalDto,
  ) {
    return await this.forwardSignal(client, payload, 'voice:answer');
  }

  @SubscribeMessage('voice:ice-candidate')
  async iceCandidate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: VoiceIceCandidateDto,
  ) {
    const user = await this.getActiveSocketUser(client, payload.roomId);

    if (!user) {
      return { ok: false };
    }

    await this.emitToUser(payload.targetUserId, 'voice:ice-candidate', {
      roomId: payload.roomId,
      fromUserId: user.userId,
      candidate: payload.candidate,
    });

    return { ok: true };
  }

  @SubscribeMessage('voice:mute')
  async mute(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: VoiceMuteDto,
  ) {
    const user = await this.getActiveSocketUser(client, payload.roomId);

    if (!user) {
      return { ok: false };
    }

    this.server.to(this.getSocketRoom(payload.roomId)).emit('voice:mute', {
      roomId: payload.roomId,
      userId: user.userId,
      isMuted: payload.isMuted,
    });

    return { ok: true };
  }

  @SubscribeMessage('voice:mute-participant')
  async muteParticipant(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: VoiceMuteParticipantDto,
  ) {
    const user = await this.getActiveSocketUser(client, payload.roomId);

    if (!user) {
      return { ok: false };
    }

    await this.assertCanMuteParticipant(
      payload.roomId,
      user.userId,
      payload.targetUserId,
    );

    this.server
      .to(this.getSocketRoom(payload.roomId))
      .emit('voice:participant-muted', {
        roomId: payload.roomId,
        targetUserId: payload.targetUserId,
        mutedByUserId: user.userId,
        isMuted: payload.isMuted,
      });

    return { ok: true };
  }

  @SubscribeMessage('voice:speaking')
  async speaking(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: VoiceSpeakingDto,
  ) {
    const user = await this.getActiveSocketUser(client, payload.roomId);

    if (!user) {
      return { ok: false };
    }

    client.to(this.getSocketRoom(payload.roomId)).emit('voice:speaking', {
      roomId: payload.roomId,
      userId: user.userId,
      isSpeaking: payload.isSpeaking,
      audioLevel: payload.audioLevel ?? null,
      ts: new Date().toISOString(),
    });

    return { ok: true };
  }

  private async forwardSignal(
    client: Socket,
    payload: VoiceSignalDto,
    event: 'voice:offer' | 'voice:answer',
  ) {
    const user = await this.getActiveSocketUser(client, payload.roomId);

    if (!user) {
      return { ok: false };
    }

    await this.emitToUser(payload.targetUserId, event, {
      roomId: payload.roomId,
      fromUserId: user.userId,
      signal: payload.signal,
    });

    return { ok: true };
  }

  private async getActiveSocketUser(
    client: Socket,
    roomId: string | undefined,
  ): Promise<JwtPayload | null> {
    const user = this.getSocketData(client).user;

    if (!user?.userId || !roomId) {
      client.disconnect(true);
      return null;
    }

    await this.roomService.getActiveParticipant(roomId, user.userId);

    return user;
  }

  private async assertCanMuteParticipant(
    roomId: string,
    actorUserId: string,
    targetUserId: string,
  ): Promise<void> {
    if (actorUserId === targetUserId) {
      throw new BadRequestException('Для self mute используйте voice:mute');
    }

    await this.roomService.assertRoomRole(roomId, actorUserId, ['owner']);
    const targetParticipant = await this.roomService.getActiveParticipant(
      roomId,
      targetUserId,
    );

    if (targetParticipant.role === 'owner') {
      throw new BadRequestException('Нельзя мутить владельца комнаты');
    }
  }

  private async emitToUser(
    userId: string,
    event: string,
    payload: unknown,
  ): Promise<void> {
    const sockets = await this.server.fetchSockets();

    for (const socket of sockets) {
      const socketUser = this.getSocketData(socket as unknown as Socket).user;

      if (socketUser?.userId === userId) {
        socket.emit(event, payload);
      }
    }
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
