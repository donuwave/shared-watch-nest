# Chat API

Чат живет отдельно от room presence и video sync.

## HTTP История

```http
GET /rooms/:roomId/chat/messages?limit=50&before=<messageId>
Authorization: Bearer <accessToken>
```

Доступен только активному участнику комнаты.

Query:

- `limit`: от 1 до 100, по умолчанию 50
- `before`: message id для загрузки более старых сообщений

Ответ возвращается newest-first.

Удаленные сообщения возвращаются как tombstone:

```json
{
  "id": "uuid",
  "roomId": "uuid",
  "userId": "uuid",
  "text": null,
  "editedAt": null,
  "deletedAt": "2026-08-02T00:00:00.000Z",
  "deletedByUserId": "uuid",
  "createdAt": "2026-08-02T00:00:00.000Z",
  "updatedAt": "2026-08-02T00:00:00.000Z"
}
```

## WebSocket

Namespace:

```text
/rooms
```

Перед chat events клиент должен выполнить:

```ts
socket.emit('room:join', { roomId });
```

### chat:send

Событие от клиента. Нужен активный участник комнаты.

```ts
socket.emit('chat:send', { roomId, text: 'Привет' }, (response) => {
  // { ok: true, message }
});
```

Сервер отправляет всем участникам комнаты:

```text
chat:message
```

Бейдж новых сообщений, когда чат закрыт или пользователь не внизу списка, можно
делать на фронте по входящему `chat:message`.

## Read State

Backend хранит, до какого сообщения пользователь дочитал. Это нужно для
`unreadCount` после reload или входа с другого устройства.

### Get Read State

```http
GET /rooms/:roomId/chat/read-state
Authorization: Bearer <accessToken>
```

Ответ:

```json
{
  "roomId": "uuid",
  "userId": "uuid",
  "lastReadMessageId": "uuid",
  "lastReadAt": "2026-08-02T00:00:00.000Z",
  "unreadCount": 3
}
```

Если пользователь еще ничего не читал:

```json
{
  "roomId": "uuid",
  "userId": "uuid",
  "lastReadMessageId": null,
  "lastReadAt": null,
  "unreadCount": 12
}
```

`unreadCount` считает сообщения других пользователей, которые не удалены и
созданы после `lastReadMessageId`.

### Mark Read

```http
POST /rooms/:roomId/chat/read
Authorization: Bearer <accessToken>
Content-Type: application/json
```

Body:

```json
{
  "messageId": "uuid"
}
```

Backend не двигает read-state назад. Если прислать более старое сообщение,
сохранится текущий `lastReadMessageId`.

### chat:edit

Событие от клиента. Редактировать может только автор сообщения.

```ts
socket.emit('chat:edit', { roomId, messageId, text: 'Новый текст' });
```

Сервер отправляет:

```text
chat:message-edited
```

### chat:delete

Событие от клиента. Удалить может автор сообщения, `owner` или `moderator`.

```ts
socket.emit('chat:delete', { roomId, messageId });
```

Сервер отправляет:

```text
chat:message-deleted
```

### chat:typing

Событие от клиента. Нужен активный участник комнаты.

```ts
socket.emit('chat:typing', { roomId, isTyping: true });
```

Сервер отправляет другим участникам:

```text
chat:typing
```

### chat:read

Событие от клиента. Нужен активный участник комнаты.

```ts
socket.emit('chat:read', { roomId, messageId }, (response) => {
  // { ok: true, readState }
});
```

Сервер отправляет участникам комнаты:

```text
chat:read
```

Payload:

```json
{
  "roomId": "uuid",
  "userId": "uuid",
  "lastReadMessageId": "uuid",
  "lastReadAt": "2026-08-02T00:00:00.000Z",
  "unreadCount": 0
}
```
