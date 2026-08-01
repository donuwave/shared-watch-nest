# Выбор Сервера

Документ описывает сервер для текущей архитектуры Shared Watch: NestJS API,
Socket.IO realtime, PostgreSQL, SMTP/OAuth, комнаты, чат, voice signaling,
video sync и whiteboard.

## Главное

Сейчас backend не стримит видео пользователям. Пользователь вставляет ссылку на
YouTube или direct video, а воспроизведение идет на фронтенде. Backend хранит и
синхронизирует состояние: play/pause/seek, чат, presence, voice signaling и
whiteboard.

Поэтому главный вывод:

```text
Для MVP достаточно 2 vCPU, 4 GB RAM, SSD 40-80 GB.
```

Это покрывает один backend instance, PostgreSQL на той же машине, миграции,
логи, небольшую базу и первые реальные комнаты.

## Что Нагружает Сервер

| Часть | Нагрузка | Комментарий |
| --- | --- | --- |
| HTTP API | Низкая | Auth, rooms, users, mail test, room state |
| Socket.IO | Средняя | Постоянные соединения, события комнат, чат, video sync |
| PostgreSQL | Средняя | Users, sessions, rooms, chat, whiteboard snapshot |
| SMTP | Низкая | Backend только отправляет письма через внешний SMTP |
| Видео | Почти нет | Backend не качает и не отдает видео |
| Голос | Почти нет | Сейчас backend только сигналит WebRTC offer/answer/ICE |
| Whiteboard | Низкая/средняя | Live events + сохранение финального stroke в JSONB |

## Рекомендуемые Конфигурации

### Local / Pet Project

```text
1-2 vCPU
2 GB RAM
20-40 GB SSD
1 public IPv4
```

Подходит для разработки, демо и ручного тестирования.

Минус: если на этой же машине крутить PostgreSQL, Docker, логи и dev build,
2 GB RAM быстро станет тесно.

### MVP

```text
2 vCPU
4 GB RAM
40-80 GB SSD/NVMe
1-2 TB traffic/month
1 public IPv4
```

Это нормальный старт для:

- 20-100 зарегистрированных пользователей;
- 5-20 одновременных комнат;
- 50-200 одновременных WebSocket connections;
- небольшого чата и whiteboard;
- PostgreSQL на той же машине.

На этом этапе можно держать:

```text
nginx
NestJS app
PostgreSQL
backup script
```

Redis пока не обязателен, если backend запущен в одном instance.

### Первый Production

```text
App server:
2-4 vCPU
4-8 GB RAM
40-80 GB SSD/NVMe

PostgreSQL:
2 vCPU
4-8 GB RAM
80-160 GB SSD/NVMe

Redis:
1 vCPU
1-2 GB RAM
```

Такой вариант нужен, когда:

- хочется отдельные backup/restore для базы;
- backend надо обновлять без риска для PostgreSQL;
- количество WebSocket connections растет;
- появляются регулярные пользователи.

Redis понадобится, когда будет больше одного NestJS instance. Socket.IO для
горизонтального масштабирования использует adapter через Redis Pub/Sub.

### Рост После MVP

```text
2+ app instances behind load balancer
4 vCPU / 8 GB RAM на app instance
managed или отдельный PostgreSQL
Redis для Socket.IO adapter
object storage для логов/файлов, если появятся uploads
```

Ориентир:

- до 500-1000 WebSocket connections можно жить на одном хорошем app server,
  если события короткие и нет media relay;
- после этого лучше масштабировать app горизонтально;
- PostgreSQL надо мониторить отдельно: CPU, RAM, slow queries, размер индексов,
  количество connections.

## Голос: Когда Нужен TURN Или SFU

Текущая voice-схема — WebRTC P2P. Backend только помогает участникам обменяться
offer/answer/ICE. Это дешево для backend, но плохо масштабируется внутри большой
комнаты.

Для маленьких комнат:

```text
2-6 участников voice P2P обычно приемлемо.
```

Если часть пользователей за строгим NAT/firewall, понадобится TURN server.
TURN уже будет гонять media traffic через себя, значит нужна отдельная машина и
запас по traffic.

Минимальный TURN:

```text
2 vCPU
2-4 GB RAM
хороший network bandwidth
много monthly traffic
```

Если нужны большие голосовые комнаты, нужен не P2P, а SFU:

```text
mediasoup / LiveKit / Janus / Jitsi stack
```

Это отдельная архитектура и отдельный sizing. Для текущего backend не надо
закладывать SFU сразу.

## Видео: Когда Сервер Станет Дорогим

Пока видео играет по внешней ссылке, сервер почти не участвует в трафике.

Серверная мощность резко вырастет, если добавить:

- загрузку фильмов на сервер;
- проксирование видео через backend;
- HLS transcoding;
- хранение файлов;
- CDN;
- проверку DRM/доступа к приватным видео.

Тогда нужен отдельный расчет:

```text
object storage + CDN + transcoding workers + очередь задач
```

Для текущего Shared Watch этого не нужно.

## Что Выбирать Сейчас

Для текущего проекта я бы выбрал:

```text
VPS/VDS
2 vCPU
4 GB RAM
80 GB NVMe
Ubuntu LTS
Docker Compose
PostgreSQL на той же машине
nginx как reverse proxy
ежедневные PostgreSQL backups
```

Это лучший баланс для MVP: дешево, просто деплоить, легко понять реальные
метрики.

Минимум, ниже которого лучше не опускаться:

```text
2 vCPU
2 GB RAM
40 GB SSD
```

Но 2 GB RAM я бы брал только для демо. Для нормальной разработки и первых
пользователей лучше 4 GB.

## Что Мониторить

Обязательные метрики:

- CPU app server;
- RAM app server;
- PostgreSQL RAM и connections;
- disk usage;
- disk I/O;
- p95 latency HTTP API;
- количество Socket.IO connections;
- количество active rooms;
- event rate по Socket.IO;
- размер таблиц `chat_messages` и `room_whiteboard_states`;
- ошибки SMTP/OAuth;
- network traffic.

Практические пороги:

- CPU стабильно выше 70% - пора смотреть профилирование или увеличивать vCPU;
- RAM выше 80% - увеличивать RAM или выносить PostgreSQL;
- disk выше 70% - чистить логи, увеличивать диск, проверять backups;
- PostgreSQL connections близко к лимиту - добавить pool tuning или PgBouncer;
- один app instance не справляется с WebSocket - добавлять Redis adapter и второй instance.

## Резервное Копирование

Минимум для MVP:

```text
pg_dump ежедневно
хранить backups 7-14 дней
периодически проверять restore
не хранить backup только на той же машине
```

Для production:

```text
managed PostgreSQL backups
point-in-time recovery, если доступно
отдельные secrets
healthcheck
логирование ошибок
```

## Итоговая Рекомендация

Начать с:

```text
2 vCPU / 4 GB RAM / 80 GB NVMe
```

Переходить на отдельный PostgreSQL и Redis, когда появятся постоянные
пользователи или понадобится больше одного backend instance.

Не покупать мощный media server заранее: текущая архитектура не передает видео и
голосовой media traffic через backend.

## Источники

- Socket.IO Redis adapter: https://socket.io/docs/v4/redis-adapter/
- PostgreSQL resource consumption: https://www.postgresql.org/docs/current/runtime-config-resource.html
- TURN server для WebRTC: https://webrtc.org/getting-started/turn-server
- coturn как TURN/STUN server: https://github.com/coturn/coturn
