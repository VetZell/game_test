# День Марины

Telegram Mini App / HTML5-игра в жанре уютного симулятора отношений.

## Структура

- `frontend/` — React + TypeScript + Vite
- `backend/` — FastAPI + PostgreSQL

## Локальный запуск

### Frontend

```bash
cd frontend
npm install
npm run dev
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

По умолчанию frontend ожидает API по адресу `http://localhost:8000`.

## Развёртывание backend на Railway

1. Создайте новый проект Railway и подключите репозиторий `VetZell/game_test`.
2. Для backend-сервиса установите **Root Directory**: `backend`.
3. Добавьте PostgreSQL через кнопку **New → Database → PostgreSQL**.
4. В переменных backend-сервиса добавьте:

```env
DATABASE_URL=${{Postgres.DATABASE_URL}}
CORS_ORIGINS=https://адрес-вашего-frontend
```

5. В настройках Networking создайте публичный домен.
6. Railway автоматически использует `backend/Dockerfile` и `backend/railway.json`.
7. Проверка сервера:

```text
https://ваш-домен.railway.app/health
```

Успешный ответ:

```json
{
  "status": "ok",
  "database": "ok"
}
```

Для локальной разработки без PostgreSQL API продолжит работать, а `/health` вернёт `database: not_configured`.
