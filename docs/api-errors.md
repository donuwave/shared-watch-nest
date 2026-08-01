# API Errors

HTTP API возвращает ошибки в едином формате.

## Формат

```ts
type ApiError = {
  statusCode: number;
  code: string;
  message: string;
  details: Record<string, unknown> | string[] | null;
  path: string;
  method: string;
  timestamp: string;
};
```

Пример:

```json
{
  "statusCode": 403,
  "code": "FORBIDDEN",
  "message": "Недостаточно прав в комнате",
  "details": null,
  "path": "/rooms/8f6b0a84-82b7-4f39-a3d1-6dfb2c6e4421/access",
  "method": "PATCH",
  "timestamp": "2026-08-02T00:00:00.000Z"
}
```

## Validation Errors

Ошибки `ValidationPipe` возвращаются так:

```json
{
  "statusCode": 400,
  "code": "BAD_REQUEST",
  "message": "Ошибка валидации",
  "details": [
    "email must be an email",
    "password should not be empty"
  ],
  "path": "/auth/register",
  "method": "POST",
  "timestamp": "2026-08-02T00:00:00.000Z"
}
```

Frontend должен показывать `message` как общий текст ошибки, а `details` можно
использовать для полей формы.

Поле `message` backend возвращает на русском. `details` могут содержать
технические сообщения валидаторов и использоваться как вспомогательная
информация для формы.

## Domain Error Codes

Если service/guard выбрасывает `HttpException` с полем `code`, backend сохраняет
его в ответе.

Пример:

```json
{
  "statusCode": 403,
  "code": "FEATURE_NOT_AVAILABLE",
  "message": "Фича недоступна",
  "details": {
    "feature": "rooms.create"
  },
  "path": "/rooms",
  "method": "POST",
  "timestamp": "2026-08-02T00:00:00.000Z"
}
```

Текущие доменные codes:

| Code | Когда возникает |
| --- | --- |
| `FEATURE_NOT_AVAILABLE` | Feature выключена или пользователь не удовлетворяет требованиям |
| `EMAIL_VERIFICATION_EXPIRED` | Email не подтвержден в срок |
| `INVALID_UUID` | Path param должен быть UUID v4 |
| SMTP provider code | Ошибка отправки письма, например `ETIMEDOUT` или `ESOCKET` |

Если custom `code` нет, backend ставит code по HTTP статусу:

```text
BAD_REQUEST
UNAUTHORIZED
FORBIDDEN
NOT_FOUND
CONFLICT
SERVICE_UNAVAILABLE
INTERNAL_SERVER_ERROR
```

## HTTP Status Semantics

| Status | Значение |
| --- | --- |
| `400` | Невалидный request body/query/path или действие невозможно по состоянию |
| `401` | Нет access token, refresh cookie или они невалидны |
| `403` | Пользователь авторизован, но не имеет доступа или нужной роли |
| `404` | Сущность не найдена |
| `409` | Конфликт уникальности или бизнес-ограничение |
| `503` | Внешний сервис недоступен, например SMTP |
| `500` | Неожиданная ошибка backend |

## WebSocket Errors

Этот формат относится к HTTP API. Socket.IO events используют ack или socket
exception flow. Для realtime-контракта смотри:

- `docs/ws-events.md`
- `docs/asyncapi.yaml`
