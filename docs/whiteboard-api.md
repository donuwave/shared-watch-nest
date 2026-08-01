# Whiteboard API

Whiteboard отделен от room presence, video sync, chat и voice. Backend хранит
одно persisted-состояние whiteboard на комнату.

## Хранение

Состояние хранится в `room_whiteboard_states`:

```json
{
  "id": "uuid",
  "roomId": "uuid",
  "enabled": false,
  "snapshot": {
    "strokes": [
      {
        "id": "uuid",
        "userId": "uuid",
        "color": "#ffcc00",
        "width": 4,
        "points": [
          { "x": 0.42, "y": 0.31 },
          { "x": 0.43, "y": 0.32, "pressure": 0.8 }
        ],
        "createdAt": "2026-08-02T00:00:00.000Z"
      }
    ]
  },
  "updatedByUserId": "uuid",
  "createdAt": "2026-08-02T00:00:00.000Z",
  "updatedAt": "2026-08-02T00:00:00.000Z"
}
```

Координаты точек нормализованы в диапазоне `0..1`, чтобы один и тот же рисунок
одинаково ложился поверх видео на разных размерах экрана.

## Восстановление Состояния

Используй полное состояние комнаты:

```http
GET /rooms/:roomId/state
Authorization: Bearer <accessToken>
```

В ответе есть поле:

```json
{
  "whiteboard": {
    "id": "uuid",
    "roomId": "uuid",
    "enabled": true,
    "snapshot": {
      "strokes": []
    },
    "updatedByUserId": "uuid",
    "createdAt": "2026-08-02T00:00:00.000Z",
    "updatedAt": "2026-08-02T00:00:00.000Z"
  }
}
```

Если состояние еще не создавалось, backend вернет пустое виртуальное состояние:
`id: null`, `enabled: false` и пустой массив strokes.

## WebSocket

Namespace:

```text
/rooms
```

Перед whiteboard events клиент должен войти в room presence:

```ts
socket.emit('room:join', { roomId });
```

### Client Events

Управлять режимом whiteboard может только room `owner` или `moderator`.

Включить whiteboard можно только когда видео на паузе:

```ts
socket.emit('whiteboard:enable', { roomId }, (response) => {
  // { ok: true, state }
});
```

Выключить режим:

```ts
socket.emit('whiteboard:disable', { roomId }, (response) => {
  // { ok: true, state }
});
```

Очистить snapshot:

```ts
socket.emit('whiteboard:clear', { roomId }, (response) => {
  // { ok: true, state }
});
```

Рисовать может любой активный участник комнаты, если whiteboard включен и видео
все еще на паузе.

Начать stroke:

```ts
socket.emit(
  'whiteboard:stroke-start',
  {
    roomId,
    strokeId,
    color: '#ffcc00',
    width: 4,
    point: { x: 0.42, y: 0.31 },
  },
  (response) => {
    // { ok: true, event }
  },
);
```

Передать новые точки для live-отрисовки:

```ts
socket.emit(
  'whiteboard:stroke-append',
  {
    roomId,
    strokeId,
    points: [
      { x: 0.43, y: 0.32 },
      { x: 0.44, y: 0.33, pressure: 0.8 },
    ],
  },
  (response) => {
    // { ok: true, event }
  },
);
```

Завершить stroke и сохранить его в snapshot:

```ts
socket.emit(
  'whiteboard:stroke-end',
  {
    roomId,
    strokeId,
    color: '#ffcc00',
    width: 4,
    points: [
      { x: 0.42, y: 0.31 },
      { x: 0.43, y: 0.32 },
    ],
  },
  (response) => {
    // { ok: true, stroke, state }
  },
);
```

### Server Events

Все control events отправляют участникам комнаты одинаковый state shape:

```ts
socket.on('whiteboard:state', (state) => {});
```

Live stroke events:

```ts
socket.on('whiteboard:stroke-start', (event) => {});
socket.on('whiteboard:stroke-append', (event) => {});
socket.on('whiteboard:stroke-end', ({ roomId, stroke }) => {});
```
