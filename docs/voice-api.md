# Voice API

Voice работает как WebRTC signaling поверх Socket.IO. Backend не принимает и не
передает аудиопоток, он только проверяет доступ к комнате и пересылает signaling
payload между участниками.

Namespace:

```text
/rooms
```

Перед voice events клиент должен выполнить:

```ts
socket.emit('room:join', { roomId });
```

## voice:join

Событие от клиента. Нужен активный участник комнаты.

```ts
socket.emit('voice:join', { roomId }, (response) => {
  // { ok: true, roomId }
});
```

Сервер отправляет другим участникам:

```text
voice:joined
```

## voice:leave

Событие от клиента. Нужен активный участник комнаты.

```ts
socket.emit('voice:leave', { roomId });
```

Сервер отправляет другим участникам:

```text
voice:left
```

## voice:offer

Событие от клиента. Нужен активный участник комнаты.

```ts
socket.emit('voice:offer', {
  roomId,
  targetUserId,
  signal,
});
```

Backend пересылает payload сокетам `targetUserId`:

```text
voice:offer
```

## voice:answer

Событие от клиента. Нужен активный участник комнаты.

```ts
socket.emit('voice:answer', {
  roomId,
  targetUserId,
  signal,
});
```

Backend пересылает payload сокетам `targetUserId`:

```text
voice:answer
```

## voice:ice-candidate

Событие от клиента. Нужен активный участник комнаты.

```ts
socket.emit('voice:ice-candidate', {
  roomId,
  targetUserId,
  candidate,
});
```

Backend пересылает payload сокетам `targetUserId`:

```text
voice:ice-candidate
```

## voice:mute

Событие от клиента. Это self mute/unmute, не mute другого участника.

```ts
socket.emit('voice:mute', {
  roomId,
  isMuted: true,
});
```

Сервер отправляет участникам комнаты:

```text
voice:mute
```

Payload:

```json
{
  "roomId": "uuid",
  "userId": "uuid",
  "isMuted": true
}
```

## voice:mute-participant

Событие от клиента. Доступно только `owner` комнаты.

Нельзя мутить самого себя через это событие, для этого есть `voice:mute`.
Нельзя мутить владельца комнаты.

```ts
socket.emit('voice:mute-participant', {
  roomId,
  targetUserId,
  isMuted: true,
});
```

Сервер отправляет участникам комнаты:

```text
voice:participant-muted
```

Payload:

```json
{
  "roomId": "uuid",
  "targetUserId": "uuid",
  "mutedByUserId": "uuid",
  "isMuted": true
}
```

Backend не выключает аудиодорожку сам. Фронт должен получить
`voice:participant-muted` и применить mute в UI/WebRTC-логике.

## voice:speaking

Событие от клиента. Фронт сам анализирует локальный микрофон и отправляет
состояние говорящего участника.

```ts
socket.emit('voice:speaking', {
  roomId,
  isSpeaking: true,
  audioLevel: 0.72,
});
```

`audioLevel` опциональный, от `0` до `1`.

Сервер отправляет другим участникам комнаты:

```text
voice:speaking
```

Payload:

```json
{
  "roomId": "uuid",
  "userId": "uuid",
  "isSpeaking": true,
  "audioLevel": 0.72,
  "ts": "2026-08-02T00:00:00.000Z"
}
```
