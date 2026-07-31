# 🚀 Запуск проекта

Проект поддерживает три окружения: локальное (разработка), dev (тестирование) и production (боевой режим).

### 📋 Требования

Node.js >= 20.11
npm >= 10.8
Docker >= 24.0
Docker Compose >= 2.23

### 🏠 Локальное окружение (разработка)

Рекомендуемый способ для разработки.
Приложение запускается локально, база данных — в докере.

Запустить базу данных
```bash
  npm run bd:local:up
```
В другом терминале — запустить приложение
```bash
  npm run start:local
```

- Приложение будет доступно на: http://localhost:9000
- Swagger UI: http://localhost:9000/api

```.env
# База данных
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=postgres
DB_PASSWORD=postgres
DB_NAME=shared_watch_local

# Приложение
NODE_ENV=local
PORT=9000

# JWT
JWT_ACCESS_SECRET=local_super_secret_change_in_production
JWT_ACCESS_EXPIRATION=3600
JWT_REFRESH_SECRET=local_refresh_super_secret_change_in_production
JWT_REFRESH_EXPIRATION=30d
```

🌱 Dev окружение (докер)

Полностью изолированное окружение в докере. Используется для тестирования.
Запуск

```bash
  npm run bd:dev
```

Приложение будет доступно на: http://localhost:9000
Swagger UI: http://localhost:9000/api
