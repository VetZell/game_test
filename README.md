# День Марины

Telegram Mini App / HTML5-игра в жанре уютного симулятора отношений.

## Структура

- `frontend/` — React + TypeScript + Vite Telegram Mini App frontend.
- `backend/` — FastAPI + async SQLAlchemy backend for PostgreSQL.
- `docs/` — workflow, task/report files, architecture notes, roadmap and technical debt.

Подробная архитектура описана в [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md).

## Локальный запуск

### Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend по умолчанию использует `VITE_API_URL`, если переменная задана. Если `VITE_API_URL` отсутствует, текущий код использует fallback Railway backend URL.

### Frontend Railway build

Frontend-сервис Railway должен использовать **Root Directory**: `frontend`, `frontend/Dockerfile` и `frontend/railway.json`. Build stage выполняет deterministic install через `npm ci --include=dev --include=optional`, затем `npm run build`. Для Node/Rollup сборки поддерживаются Node `>=20.19.0 <23` и npm `>=10 <12`; `package-lock.json` содержит optional Rollup package `@rollup/rollup-linux-x64-musl`, необходимый для Railway Alpine/Linux musl image.

Короткая проверка нового deployment без debug-баннера: открыть Mini App после деплоя и убедиться, что доступно поведение TASK-014 — action error panel показывает безопасное сообщение и кнопку `Повторить`, а в footer остаётся текущая версия приложения.

#### Frontend → Backend connectivity

Для production Telegram Mini App нужны две несекретные переменные/настройки, согласованные между сервисами:

```env
# frontend service build variable
VITE_API_URL=https://<backend-public-domain>

# backend service runtime variable
CORS_ORIGINS=https://<frontend-public-domain>
ENVIRONMENT=production
```

`VITE_API_URL` должен быть HTTPS origin backend без query/secrets; frontend нормализует trailing slash и строит endpoints `/api/v1/auth/telegram`, `/api/v1/chat`, `/api/v1/actions` и `/api/v1/day/advance` централизованно. Если `CORS_ORIGINS` не содержит точный frontend origin, browser/Telegram WebView заблокирует preflight до получения HTTP response от action endpoint, и frontend увидит это как network/fetch failure.

### Railway production source branch policy

Production Railway services must be connected to the repository `main` branch only:

- frontend production service: **Settings → Source → Branch = `main`**;
- backend production service: **Settings → Source → Branch = `main`**;
- automatic deploys on new commits to `main`: **enabled** for both services;
- `task-*` branches are for development Pull Requests only and must not be selected as production source branches;
- PR branches may be used only by separately configured preview environments.

The repository Railway config files (`railway.json`, `frontend/railway.json`, `backend/railway.json`) define Dockerfile builders, health checks and restart policy only; they do not store Railway's connected branch or automatic-deploy toggle. If Railway shows a production service connected to a `task-*` branch, fix it in Railway UI rather than adding branch-specific config to the repo:

1. Open the production service in Railway.
2. Go to **Settings → Source**.
3. Set **Connected Branch** to `main`.
4. Enable automatic deployments for new commits on `main`.
5. If **Wait for CI** is enabled, either confirm the GitHub `CI` workflow is passing for `main` or disable waiting until a required workflow is configured and green.
6. Save the service settings.
7. Trigger one deployment of the latest `main` commit.
8. After the next merge to `main`, verify Railway creates a new deployment automatically without manually selecting a task branch.

Release checklist guardrail: before declaring production current, confirm both frontend and backend services show `Branch: main`, automatic deploys enabled, no `task-*` production source, and the deployed revision matches the expected latest `main` commit.

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Для authenticated Telegram endpoints нужны переменные:

```env
DATABASE_URL=postgresql://...
TELEGRAM_BOT_TOKEN=...
CORS_ORIGINS=http://localhost:5173
ENVIRONMENT=development
```

Если `DATABASE_URL` не задан, `/health` возвращает `database: not_configured`, а endpoints, которым нужна сессия БД, не смогут работать. Если `TELEGRAM_BOT_TOKEN` не задан, Telegram-authenticated endpoints вернут ошибку авторизации.

## Миграции

Schema management выполняется через Alembic. Для локального запуска из `backend/` используйте явную команду:

```bash
cd backend
DATABASE_URL=<database url> ./scripts/migrate.sh
```

`backend/scripts/migrate.sh` проверяет наличие `DATABASE_URL` и затем выполняет только `alembic upgrade head`; обычный `uvicorn` startup не запускает миграции автоматически. Baseline revision `20260722_0001` поддерживает пустую БД и существующую схему, созданную прежним runtime `create_all()`. Follow-up revision `20260723_0002` дополнительно гарантирует наличие таблицы `idempotency_records` даже для production-like базы, которая уже была отмечена Alembic как baseline/head, но фактически не получила эту таблицу. Downgrade для baseline/follow-up revisions intentionally irreversible, чтобы не удалить adopted pre-Alembic таблицы, пользовательские данные или replay-записи idempotency. Подробности: [`docs/ALEMBIC_BOOTSTRAP.md`](docs/ALEMBIC_BOOTSTRAP.md).

## Развёртывание backend на Railway

1. Создайте новый проект Railway и подключите репозиторий `VetZell/game_test`.
2. Для backend-сервиса установите **Root Directory**: `backend`.
3. Добавьте PostgreSQL через кнопку **New → Database → PostgreSQL**.
4. В переменных backend-сервиса добавьте:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
TELEGRAM_BOT_TOKEN=...
CORS_ORIGINS=https://адрес-вашего-frontend
ENVIRONMENT=production
```

5. В настройках Networking создайте публичный домен.
6. Railway использует `backend/Dockerfile` и `backend/railway.json` для backend layout; root layout использует `Dockerfile` и `railway.json`. Оба backend image layout копируют `alembic.ini`, `alembic/` и `scripts/`.
7. Перед production rollout выполните migration отдельной командой из того же backend image или shell окружения, не объединяя её с API startup:

```bash
# если Railway Root Directory = repository root
cd backend && DATABASE_URL=${{Postgres.DATABASE_URL}} alembic upgrade head

# если Railway Root Directory = backend
DATABASE_URL=${{Postgres.DATABASE_URL}} alembic upgrade head

# альтернативно через скрипт внутри backend image/shell
DATABASE_URL=${{Postgres.DATABASE_URL}} ./scripts/migrate.sh
```

8. После успешной migration deploy/start API выполняется обычной командой `uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}`.
9. Проверка сервера после rollout:

```text
https://ваш-домен.railway.app/health
```

Успешный ответ при доступной базе:

```json
{
  "status": "ok",
  "database": "ok"
}
```


Rollback application image выполняйте отдельно от базы данных. Не используйте `alembic downgrade base` для production rollback: baseline migration intentionally irreversible и не должна удалять adopted пользовательские таблицы.
