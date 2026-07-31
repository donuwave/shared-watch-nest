# DB Migrations

Короткий порядок работы с миграциями в проекте.

## 1. Подготовить entity

Сначала измени или добавь entity.

Если entity новая, подключи ее в:

```text
src/config/database/data-source.ts
```

Пример:

```ts
import { EmailToken } from '../../entity/email-token/email-token.entity';

entities: [Role, Session, User, EmailToken],
```

Название таблицы в entity лучше задавать явно:

```ts
@Entity('email_tokens')
```

## 2. Поднять локальную БД

```bash
npm run bd:local:up
```

## 3. Сгенерировать миграцию автоматически

```bash
npm run typeorm:local -- migration:generate src/config/database/migrations/CreateEmailTokens
```

`CreateEmailTokens` замени на имя своей миграции.

TypeORM сравнит текущую БД с entity из `data-source.ts` и создаст файл миграции в:

```text
src/config/database/migrations
```

## 4. Проверить, что миграция видна

```bash
npm run migration:show:local
```

`[ ]` — миграция еще не применена.

`[X]` — миграция уже применена.

## 5. Применить миграцию

```bash
npm run migration:run:local
```

## 6. Откатить последнюю миграцию

```bash
npm run migration:revert:local
```

## Полезные команды

### Local

```bash
npm run migration:show:local
npm run migration:run:local
npm run migration:revert:local
```

### Dev

```bash
npm run migration:show:dev
npm run migration:run:dev
npm run migration:revert:dev
```

### Prod

```bash
npm run migration:show:prod
npm run migration:run:prod
npm run migration:revert:prod
```

## Важно

- `synchronize` выключен, схема сама не меняется.
- Новую entity обязательно добавлять в `data-source.ts`.
- После автогенерации всегда проверь созданный файл миграции.
- Перед production сначала делай backup базы.
