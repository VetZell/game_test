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

Schema management выполняется через Alembic:

```bash
cd backend
DATABASE_URL=<database url> alembic upgrade head
```

Baseline revision `20260722_0001` поддерживает пустую БД и существующую схему, созданную прежним runtime `create_all()`. Downgrade baseline intentionally irreversible, чтобы не удалить adopted pre-Alembic таблицы и данные. Подробности: [`docs/ALEMBIC_BOOTSTRAP.md`](docs/ALEMBIC_BOOTSTRAP.md).

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
6. Railway использует `backend/Dockerfile` и `backend/railway.json` для backend layout.
7. Перед production rollout выполните/проверьте Alembic migration отдельно от startup-команды.
8. Проверка сервера:

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
