# Rooms API

## Create Room

```http
POST /rooms
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Requires feature:

```text
rooms.create
```

Current `rooms.create` rule: user must be authenticated, email verified, and not blocked.

Body:

```json
{
  "title": "Фильм вечером",
  "isOpen": true,
  "isTemporary": true
}
```

Frontend does not send display name. Backend takes it from current user as:

```text
username#discriminator
```

Response contains:

- `room`
- `currentParticipant` with role `owner`
- `invite.code`

Video source is set after room creation through:

```http
POST /rooms/:roomId/video
```

## Join By Invite

```http
POST /rooms/join/:code
Authorization: Bearer <accessToken>
```

Backend creates or reactivates `RoomParticipant` with role:

```text
member
```

If `room.isOpen = false`, invite links do not admit new participants.
Existing room participants can rejoin through the invite.

## Get Room

```http
GET /rooms/:id
Authorization: Bearer <accessToken>
```

Only active room participants can read room details.

## Get Room State

```http
GET /rooms/:id/state
Authorization: Bearer <accessToken>
```

Use this endpoint after page reload or reconnect to restore the room UI.

Only active room participants can read state.

Response:

```json
{
  "room": {},
  "currentParticipant": {},
  "participants": [],
  "presence": [],
  "video": null
}
```

`participants` contains active participants only. User objects are sanitized:

```json
{
  "id": "uuid",
  "username": "donu",
  "discriminator": "1234",
  "avatarUrl": null
}
```

`presence` contains recent presence records based on:

```env
ROOM_PRESENCE_GRACE_PERIOD_MS=180000
```

## Leave Room

```http
POST /rooms/:id/leave
Authorization: Bearer <accessToken>
```

This is explicit leave from the UI button. Backend sets:

```text
RoomParticipant.leftAt = now
```

If the room is temporary and has no active participants after leave, backend closes it:

```text
Room.closedAt = now
Room.closedReason = empty_temporary_room
Room.isOpen = false
```

## Update Access

```http
PATCH /rooms/:id/access
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Only room `owner` can open or close invite entry.

Body:

```json
{
  "isOpen": false
}
```

## Presence

Browser close is not tracked by `leave`.

The backend has `room_presence` for real-time connections:

```text
roomId
userId
connectionId
connectedAt
lastSeenAt
disconnectedAt
```

Implemented WebSocket namespace:

```text
/rooms
```

Connect with access token:

```ts
io('http://localhost:9000/rooms', {
  auth: {
    token: accessToken,
  },
});
```

Events:

```text
room:join
room:heartbeat
presence:joined
presence:left
```

Join room:

```ts
socket.emit('room:join', { roomId }, (response) => {
  // response: { ok: true, roomId }
});
```

Heartbeat:

```ts
socket.emit('room:heartbeat');
```

Backend calls:

- `RoomService.markConnected(roomId, userId, socket.id)`
- `RoomService.markSeen(socket.id)`
- `RoomService.markDisconnected(socket.id)`

`RoomCleanupService` periodically closes temporary rooms when there are no active participants or recent live presence.

Environment:

```env
ROOM_CLEANUP_INTERVAL_MS=60000
ROOM_PRESENCE_GRACE_PERIOD_MS=180000
```

## Room Roles

Room roles are scoped to one room:

```text
owner
moderator
member
```

Current behavior:

- room creator becomes `owner`;
- invite joiner becomes `member`;
- `owner` can promote an active `member` to `moderator`;
- `owner` can demote an active `moderator` back to `member`;
- `owner` role cannot be assigned or changed through participant role API.

Update participant role:

```http
PATCH /rooms/:id/participants/:participantId/role
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Only room `owner` can call this route.

Body:

```json
{
  "role": "moderator"
}
```

Video playback sync is documented separately in `docs/video-sync-api.md`.

Room chat is documented separately in `docs/chat-api.md`.
