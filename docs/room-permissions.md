# Room Permissions

В проекте есть два разных слоя прав:

- глобальные роли пользователя: `admin`, `moderator`, `user`;
- роли пользователя внутри конкретной комнаты: `owner`, `moderator`, `member`.

Room permissions проверяются через активного участника комнаты. Если пользователь
не состоит в комнате, уже вышел из нее или комната закрыта, доменные действия
возвращают ошибку доступа.

## Базовое Правило Комнаты

Для большинства действий нужен активный `RoomParticipant`:

```text
roomId
userId
leftAt = null
room.closedAt = null
```

Это проверяется через `RoomService.getActiveParticipant`.

## Комнаты И Участники

| Действие | Кто может | Проверка |
| --- | --- | --- |
| Создать комнату | Авторизованный пользователь с feature `rooms.create` | `JwtAuthGuard` + `FeatureGuard` |
| Читать комнату | Активный участник | `getActiveParticipant` |
| Читать полный room state | Активный участник | `getActiveParticipant` |
| Войти по invite | Авторизованный пользователь | invite активен, комната не закрыта |
| Войти новым участником в закрытую комнату | Никто | `room.isOpen = false` блокирует новых участников |
| Повторно войти существующим участником | Этот же пользователь | старый participant реактивируется |
| Выйти из комнаты | Активный участник | `leftAt = null` |
| Открыть/закрыть вход по invite | Только `owner` | `assertRoomRole(['owner'])` |
| Изменить роль участника | Только `owner` | `assertRoomRole(['owner'])` |
| Изменить роль владельца | Никто | backend запрещает менять `owner` |

`owner` появляется автоматически при создании комнаты. Новые участники получают
роль `member`. `owner` может назначать `moderator` и возвращать `member`.

## Чат

| Действие | Кто может | Проверка |
| --- | --- | --- |
| Читать историю | Активный участник | `getActiveParticipant` |
| Отправить сообщение | Активный участник | `getActiveParticipant` |
| Typing indicator | Активный участник | `assertCanUseChat` |
| Read-state / unreadCount | Активный участник | `getActiveParticipant` |
| Редактировать сообщение | Только автор | `message.userId === userId` |
| Удалить сообщение | Автор, `owner`, `moderator` | author check или room role |

Удаление сообщения делает tombstone: `text = null`, `deletedAt`,
`deletedByUserId`. Физически сообщение не удаляется.

## Видео

| Действие | Кто может | Проверка |
| --- | --- | --- |
| Читать состояние видео | Активный участник | `getActiveParticipant` |
| Установить source | `owner`, `moderator` | `assertRoomRole(['owner', 'moderator'])` |
| Play / pause / seek | `owner`, `moderator` | `assertRoomRole(['owner', 'moderator'])` |
| Запросить sync-state | Активный участник | `getActiveParticipant` |

Backend дополнительно валидирует источник видео и нормализует `currentTime`.

## Голос

| Действие | Кто может | Проверка |
| --- | --- | --- |
| Join / leave voice | Активный участник | `getActiveParticipant` |
| WebRTC offer / answer / ICE | Активный участник | `getActiveParticipant` |
| Self mute/unmute | Активный участник | `getActiveParticipant` |
| Speaking indicator | Активный участник | `getActiveParticipant` |
| Mute другого участника | Только `owner` | `assertRoomRole(['owner'])` |

Owner не может замутить себя через `voice:mute-participant`; для self mute есть
`voice:mute`. Также нельзя мутить владельца комнаты.

## Whiteboard

| Действие | Кто может | Проверка |
| --- | --- | --- |
| Включить whiteboard | `owner`, `moderator` | room role + видео на паузе |
| Выключить whiteboard | `owner`, `moderator` | room role |
| Очистить рисунок | `owner`, `moderator` | room role |
| Рисовать strokes | Любой активный участник | active participant + whiteboard включен + видео на паузе |

Whiteboard хранит финальные strokes в `room_whiteboard_states.snapshot`.
Промежуточные точки идут через WebSocket для live-отрисовки.

## Ошибки Доступа

Типовая семантика ошибок:

- `401` - нет или невалидный access token на HTTP route.
- `403` - пользователь не участник комнаты, комната закрыта или не хватает room role.
- `404` - сущность не найдена: комната, invite, участник, сообщение.
- `400` - действие невозможно по состоянию: истек invite, видео не задано, whiteboard включают не на паузе, нельзя менять owner.

Для WebSocket отсутствие токена или user payload приводит к disconnect. Доменные
ошибки выбрасываются из service-слоя и возвращаются Socket.IO как ошибка ack.
