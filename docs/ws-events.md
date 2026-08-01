# Realtime API Events

Realtime использует Socket.IO namespace:

```text
/rooms
```

Подключение с access token:

```ts
io('http://localhost:9000/rooms', {
  auth: {
    token: accessToken,
  },
});
```

События разделены по доменам: `Room Presence`, `Video Sync`, `Chat`, `Voice`.

## Room Presence

### room:join

Событие от клиента.

```ts
socket.emit('room:join', { roomId }, (response) => {
  // { ok: true, roomId }
});
```

Нужен активный участник комнаты.

### room:heartbeat

Событие от клиента.

```ts
socket.emit('room:heartbeat', (response) => {
  // { ok: true }
});
```

### presence:joined

Событие от сервера.

```ts
socket.on('presence:joined', ({ roomId, userId }) => {});
```

### presence:left

Событие от сервера.

```ts
socket.on('presence:left', ({ roomId, userId }) => {});
```

## Video Sync

### video:source-set

Событие от клиента. Нужна room role `owner` или `moderator`.

```ts
socket.emit(
  'video:source-set',
  {
    roomId,
    url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
    duration: 212,
  },
  (response) => {
    // { ok: true, state }
  },
);
```

### video:play

Событие от клиента. Нужна room role `owner` или `moderator`.

```ts
socket.emit('video:play', { roomId, currentTime: 35.4 });
```

### video:pause

Событие от клиента. Нужна room role `owner` или `moderator`.

```ts
socket.emit('video:pause', { roomId, currentTime: 52.1 });
```

### video:seek

Событие от клиента. Нужна room role `owner` или `moderator`.

```ts
socket.emit('video:seek', { roomId, currentTime: 120 });
```

### video:sync-request

Событие от клиента. Нужен активный участник комнаты.

```ts
socket.emit('video:sync-request', { roomId }, (response) => {
  // { ok: true, state }
});
```

### video:source-changed

Событие от сервера после изменения источника видео.

```ts
socket.on('video:source-changed', (state) => {});
```

### video:state

Событие от сервера после `play`, `pause` или `seek`.

```ts
socket.on('video:state', (state) => {});
```

### video:sync-state

Событие от сервера конкретному клиенту после `video:sync-request`.

```ts
socket.on('video:sync-state', (state) => {});
```

## Chat

Перед chat events клиент должен выполнить `room:join`.

### chat:send

Событие от клиента. Нужен активный участник комнаты.

```ts
socket.emit('chat:send', { roomId, text: 'Привет' }, (response) => {
  // { ok: true, message }
});
```

### chat:edit

Событие от клиента. Редактировать может только автор сообщения.

```ts
socket.emit('chat:edit', { roomId, messageId, text: 'Новый текст' });
```

### chat:delete

Событие от клиента. Удалить может автор сообщения, `owner` или `moderator`.

```ts
socket.emit('chat:delete', { roomId, messageId });
```

### chat:typing

Событие от клиента. Нужен активный участник комнаты.

```ts
socket.emit('chat:typing', { roomId, isTyping: true });
```

### chat:read

Событие от клиента. Нужен активный участник комнаты.

```ts
socket.emit('chat:read', { roomId, messageId }, (response) => {
  // { ok: true, readState }
});
```

### chat:message

Событие от сервера после отправки нового сообщения.

```ts
socket.on('chat:message', (message) => {});
```

### chat:message-edited

Событие от сервера после редактирования сообщения.

```ts
socket.on('chat:message-edited', (message) => {});
```

### chat:message-deleted

Событие от сервера после удаления сообщения.

```ts
socket.on('chat:message-deleted', (message) => {});
```

### chat:typing

Событие от сервера для остальных участников комнаты.

```ts
socket.on('chat:typing', ({ roomId, userId, isTyping, ts }) => {});
```

### chat:read

Событие от сервера после обновления read-state пользователя.

```ts
socket.on('chat:read', (readState) => {});
```

## Voice

Перед voice events клиент должен выполнить `room:join`.

### voice:join

Событие от клиента. Нужен активный участник комнаты.

```ts
socket.emit('voice:join', { roomId });
```

### voice:leave

Событие от клиента. Нужен активный участник комнаты.

```ts
socket.emit('voice:leave', { roomId });
```

### voice:offer

Событие от клиента. Нужен активный участник комнаты.

```ts
socket.emit('voice:offer', { roomId, targetUserId, signal });
```

### voice:answer

Событие от клиента. Нужен активный участник комнаты.

```ts
socket.emit('voice:answer', { roomId, targetUserId, signal });
```

### voice:ice-candidate

Событие от клиента. Нужен активный участник комнаты.

```ts
socket.emit('voice:ice-candidate', { roomId, targetUserId, candidate });
```

### voice:mute

Событие от клиента. Сейчас это только self mute/unmute.

```ts
socket.emit('voice:mute', { roomId, isMuted: true });
```

### voice:mute-participant

Событие от клиента. Доступно только `owner` комнаты.

```ts
socket.emit('voice:mute-participant', { roomId, targetUserId, isMuted: true });
```

### voice:speaking

Событие от клиента. Фронт сам анализирует локальный микрофон.

```ts
socket.emit('voice:speaking', { roomId, isSpeaking: true, audioLevel: 0.72 });
```

### voice:joined

Событие от сервера для остальных участников комнаты.

```ts
socket.on('voice:joined', ({ roomId, userId }) => {});
```

### voice:left

Событие от сервера для остальных участников комнаты.

```ts
socket.on('voice:left', ({ roomId, userId }) => {});
```

### voice:offer

Событие от сервера для `targetUserId`.

```ts
socket.on('voice:offer', ({ roomId, fromUserId, signal }) => {});
```

### voice:answer

Событие от сервера для `targetUserId`.

```ts
socket.on('voice:answer', ({ roomId, fromUserId, signal }) => {});
```

### voice:ice-candidate

Событие от сервера для `targetUserId`.

```ts
socket.on('voice:ice-candidate', ({ roomId, fromUserId, candidate }) => {});
```

### voice:mute

Событие от сервера для участников комнаты.

```ts
socket.on('voice:mute', ({ roomId, userId, isMuted }) => {});
```

### voice:participant-muted

Событие от сервера для участников комнаты.

```ts
socket.on(
  'voice:participant-muted',
  ({ roomId, targetUserId, mutedByUserId, isMuted }) => {},
);
```

### voice:speaking

Событие от сервера для остальных участников комнаты.

```ts
socket.on('voice:speaking', ({ roomId, userId, isSpeaking, audioLevel, ts }) => {});
```
