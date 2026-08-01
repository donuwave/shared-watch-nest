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

События разделены по доменам. Сейчас есть `Room Presence` и `Video Sync`;
следующими отдельными разделами будут `Chat` и `Voice`.

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
