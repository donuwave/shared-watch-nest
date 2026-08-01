# Frontend API Contracts

Единый рабочий контракт для frontend. Подробные доменные документы остаются в:

- `docs/frontend-auth.md`
- `docs/rooms-api.md`
- `docs/chat-api.md`
- `docs/video-sync-api.md`
- `docs/voice-api.md`
- `docs/whiteboard-api.md`
- `docs/ws-events.md`

## Общие Типы

```ts
type Uuid = string;
type IsoDate = string;

type RoomRole = 'owner' | 'moderator' | 'member';
type GlobalRole = 'admin' | 'moderator' | 'user';

type UserSnapshot = {
  id: Uuid;
  username: string;
  discriminator: string;
  avatarUrl: string | null;
};
```

HTTP requests с авторизацией:

```http
Authorization: Bearer <accessToken>
```

Socket.IO namespace:

```text
/rooms
```

Socket.IO connect:

```ts
io('http://localhost:9000/rooms', {
  auth: {
    token: accessToken,
  },
});
```

HTTP errors возвращаются в едином формате `ApiError`.
Подробно: `docs/api-errors.md`.

## Auth

```ts
type RegisterRequest = {
  email: string;
  password: string;
  username: string;
};

type LoginRequest = {
  email: string;
  password: string;
};

type VerifyEmailRequest = {
  token: string;
};

type ForgotPasswordRequest = {
  email: string;
};

type ResetPasswordRequest = {
  token: string;
  newPassword: string;
};

type AuthMeResponse = {
  profile: {
    id: Uuid;
    email: string;
    username: string;
    discriminator: string;
    avatarUrl: string | null;
    role: GlobalRole;
  };
  emailVerification: {
    state: 'verified' | 'verification_pending' | 'verification_expired';
    secondsUntilBlock: number | null;
    isVerified: boolean;
    emailVerificationDeadlineAt: IsoDate | null;
  };
};
```

Routes:

```text
POST /auth/register                 -> text accessToken + refreshToken cookie
POST /auth/login                    -> text accessToken + refreshToken cookie
POST /auth/refresh                  -> text accessToken, credentials include
POST /auth/logout                   -> clears refreshToken cookie
GET  /auth/me                       -> AuthMeResponse
POST /auth/verify-email             -> success message
POST /auth/resend-email-verification
POST /auth/forgot-password
POST /auth/reset-password
```

Password rule:

```text
min 8 chars, at least one lowercase, uppercase, number and special char @$!%*?&
```

Username rule:

```text
2-32 chars, letters/numbers/underscore/dot/hyphen
```

## Rooms

```ts
type CreateRoomRequest = {
  title: string;
  isOpen?: boolean;
  isTemporary?: boolean;
};

type UpdateRoomAccessRequest = {
  isOpen: boolean;
};

type UpdateRoomParticipantRoleRequest = {
  role: 'moderator' | 'member';
};

type RoomSnapshot = {
  id: Uuid;
  title: string;
  createdByUserId: Uuid;
  isOpen: boolean;
  isTemporary: boolean;
  closedAt: IsoDate | null;
  closedReason: string | null;
  createdAt: IsoDate;
  updatedAt: IsoDate;
};

type RoomParticipantSnapshot = {
  id: Uuid;
  roomId: Uuid;
  userId: Uuid;
  role: RoomRole;
  displayNameSnapshot: string;
  joinedAt: IsoDate;
  leftAt: IsoDate | null;
  createdAt: IsoDate;
  updatedAt: IsoDate;
  user?: UserSnapshot;
};

type RoomPresenceSnapshot = {
  id: Uuid;
  roomId: Uuid;
  userId: Uuid;
  connectedAt: IsoDate;
  lastSeenAt: IsoDate;
  disconnectedAt: IsoDate | null;
  isOnline: boolean;
};
```

Routes:

```text
POST  /rooms
POST  /rooms/join/:code
GET   /rooms/:id
GET   /rooms/:id/state
POST  /rooms/:id/leave
PATCH /rooms/:id/access
PATCH /rooms/:id/participants/:participantId/role
```

Room state response:

```ts
type RoomStateResponse = {
  room: RoomSnapshot;
  currentParticipant: RoomParticipantSnapshot;
  participants: RoomParticipantSnapshot[];
  presence: RoomPresenceSnapshot[];
  video: VideoState | null;
  whiteboard: WhiteboardState;
};
```

## Video Sync

```ts
type VideoSourceType = 'youtube' | 'direct';

type SetVideoSourceRequest = {
  url: string;
  duration?: number;
};

type VideoControlPayload = {
  roomId: Uuid;
  currentTime: number;
};

type VideoSyncRequestPayload = {
  roomId: Uuid;
};

type VideoState = {
  id: Uuid;
  roomId: Uuid;
  sourceUrl: string;
  sourceType: VideoSourceType;
  providerVideoId: string | null;
  playing: boolean;
  currentTime: number;
  effectiveCurrentTime: number;
  duration: number | null;
  updatedByUserId: Uuid | null;
  createdAt: IsoDate;
  updatedAt: IsoDate;
  serverTime: IsoDate;
  serverTimestamp: number;
};
```

Routes:

```text
POST /rooms/:roomId/video
GET  /rooms/:roomId/video
```

Socket.IO client events:

```text
video:source-set  { roomId, url, duration? } -> { ok, state }
video:play        { roomId, currentTime }    -> { ok, state }
video:pause       { roomId, currentTime }    -> { ok, state }
video:seek        { roomId, currentTime }    -> { ok, state }
video:sync-request { roomId }                -> { ok, state }
```

Socket.IO server events:

```text
video:source-changed VideoState
video:state          VideoState
video:sync-state     VideoState | null
```

Frontend delay compensation:

```ts
const driftSeconds = state.playing
  ? Math.max(0, (Date.now() - state.serverTimestamp) / 1000)
  : 0;

const targetTime = state.effectiveCurrentTime + driftSeconds;
```

## Chat

```ts
type ChatMessage = {
  id: Uuid;
  roomId: Uuid;
  userId: Uuid;
  text: string | null;
  editedAt: IsoDate | null;
  deletedAt: IsoDate | null;
  deletedByUserId: Uuid | null;
  createdAt: IsoDate;
  updatedAt: IsoDate;
  user: UserSnapshot;
};

type ChatReadState = {
  roomId: Uuid;
  userId: Uuid;
  lastReadMessageId: Uuid | null;
  lastReadAt: IsoDate | null;
  unreadCount: number;
};
```

Routes:

```text
GET  /rooms/:roomId/chat/messages?limit=50&before=<messageId>
GET  /rooms/:roomId/chat/read-state
POST /rooms/:roomId/chat/read { messageId }
```

Socket.IO client events:

```text
chat:send   { roomId, text }              -> { ok, message }
chat:edit   { roomId, messageId, text }   -> { ok, message }
chat:delete { roomId, messageId }         -> { ok, message }
chat:typing { roomId, isTyping? }         -> { ok }
chat:read   { roomId, messageId }         -> { ok, readState }
```

Socket.IO server events:

```text
chat:message         ChatMessage
chat:message-edited  ChatMessage
chat:message-deleted ChatMessage
chat:typing          { roomId, userId, isTyping, ts }
chat:read            ChatReadState
```

## Voice

```ts
type VoiceRoomPayload = {
  roomId: Uuid;
};

type VoiceSignalPayload = {
  roomId: Uuid;
  targetUserId: Uuid;
  signal: Record<string, unknown>;
};

type VoiceIceCandidatePayload = {
  roomId: Uuid;
  targetUserId: Uuid;
  candidate: Record<string, unknown>;
};

type VoiceMutePayload = {
  roomId: Uuid;
  isMuted: boolean;
};

type VoiceMuteParticipantPayload = {
  roomId: Uuid;
  targetUserId: Uuid;
  isMuted: boolean;
};

type VoiceSpeakingPayload = {
  roomId: Uuid;
  isSpeaking: boolean;
  audioLevel?: number;
};
```

Socket.IO client events:

```text
voice:join             { roomId } -> { ok, roomId }
voice:leave            { roomId } -> { ok, roomId }
voice:offer            { roomId, targetUserId, signal }    -> { ok }
voice:answer           { roomId, targetUserId, signal }    -> { ok }
voice:ice-candidate    { roomId, targetUserId, candidate } -> { ok }
voice:mute             { roomId, isMuted }                 -> { ok }
voice:mute-participant { roomId, targetUserId, isMuted }   -> { ok }
voice:speaking         { roomId, isSpeaking, audioLevel? } -> { ok }
```

Socket.IO server events:

```text
voice:joined             { roomId, userId }
voice:left               { roomId, userId }
voice:offer              { roomId, fromUserId, signal }
voice:answer             { roomId, fromUserId, signal }
voice:ice-candidate      { roomId, fromUserId, candidate }
voice:mute               { roomId, userId, isMuted }
voice:participant-muted  { roomId, targetUserId, mutedByUserId, isMuted }
voice:speaking           { roomId, userId, isSpeaking, audioLevel, ts }
```

## Whiteboard

```ts
type WhiteboardPoint = {
  x: number;
  y: number;
  pressure?: number;
};

type WhiteboardStroke = {
  id: Uuid;
  userId: Uuid;
  color: string;
  width: number;
  points: WhiteboardPoint[];
  createdAt: IsoDate;
};

type WhiteboardState = {
  id: Uuid | null;
  roomId: Uuid;
  enabled: boolean;
  snapshot: {
    strokes: WhiteboardStroke[];
  };
  updatedByUserId: Uuid | null;
  createdAt: IsoDate | null;
  updatedAt: IsoDate | null;
};
```

Validation:

```text
point.x, point.y, point.pressure: 0..1
color: #rrggbb
width: 1..48
stroke-append points: 1..256
stroke-end points: 1..10000
```

Socket.IO client events:

```text
whiteboard:enable        { roomId } -> { ok, state }
whiteboard:disable       { roomId } -> { ok, state }
whiteboard:clear         { roomId } -> { ok, state }
whiteboard:stroke-start  { roomId, strokeId, color, width, point }  -> { ok, event }
whiteboard:stroke-append { roomId, strokeId, points }               -> { ok, event }
whiteboard:stroke-end    { roomId, strokeId, color, width, points } -> { ok, stroke, state }
```

Socket.IO server events:

```text
whiteboard:state         WhiteboardState
whiteboard:stroke-start  { roomId, strokeId, userId, color, width, point, ts }
whiteboard:stroke-append { roomId, strokeId, userId, points, ts }
whiteboard:stroke-end    { roomId, stroke }
```

## Права

Коротко:

- создать комнату: verified пользователь с feature `rooms.create`;
- читать room state, chat, video state: активный участник;
- video control: `owner` или `moderator`;
- менять room access и роли участников: только `owner`;
- chat edit: только автор;
- chat delete: автор, `owner` или `moderator`;
- voice mute другого участника: только `owner`;
- whiteboard enable/disable/clear: `owner` или `moderator`;
- whiteboard draw: любой активный участник, если whiteboard включен и видео на паузе.

Подробно: `docs/room-permissions.md`.
