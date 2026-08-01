# Video Sync API

Video sync is separated from room presence. It stores only playback source and
playback state for a room.

## HTTP

All routes require:

```http
Authorization: Bearer <accessToken>
```

### Set Source

```http
POST /rooms/:roomId/video
Content-Type: application/json
```

Only room `owner` or `moderator` can set the source.

Supported sources:

- YouTube links: `youtube.com/watch?v=...`, `youtu.be/...`, `/embed/...`, `/shorts/...`
- direct video files: `.mp4`, `.webm`, `.ogg`, `.mov`, `.m4v`, `.m3u8`

Body:

```json
{
  "url": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "duration": 212
}
```

Unknown sources return `400 Unsupported video source`.

### Get State

```http
GET /rooms/:roomId/video
```

Any active room participant can read state.

For full room UI restore after reconnect, use:

```http
GET /rooms/:roomId/state
```

## WebSocket

Namespace:

```text
/rooms
```

Connect the same way as room presence:

```ts
io('http://localhost:9000/rooms', {
  auth: {
    token: accessToken,
  },
});
```

Before video sync, join the room presence channel:

```ts
socket.emit('room:join', { roomId });
```

### Client Events

Only room `owner` or `moderator` can mutate playback:

```ts
socket.emit('video:source-set', {
  roomId,
  url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
  duration: 212,
});

socket.emit('video:play', {
  roomId,
  currentTime: 35.4,
});

socket.emit('video:pause', {
  roomId,
  currentTime: 52.1,
});

socket.emit('video:seek', {
  roomId,
  currentTime: 120,
});
```

Any active participant can request current state:

```ts
socket.emit('video:sync-request', { roomId });
```

### Server Events

```text
video:source-changed
video:state
video:sync-state
```

State shape:

```json
{
  "id": "uuid",
  "roomId": "uuid",
  "sourceUrl": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "sourceType": "youtube",
  "providerVideoId": "dQw4w9WgXcQ",
  "playing": false,
  "currentTime": 0,
  "duration": 212,
  "updatedByUserId": "uuid",
  "createdAt": "2026-08-02T00:00:00.000Z",
  "updatedAt": "2026-08-02T00:00:00.000Z"
}
```
