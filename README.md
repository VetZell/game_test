# День Марины

Telegram Mini App / HTML5-игра в жанре уютного симулятора отношений.

## Структура

- `frontend/` — React + TypeScript + Vite
- `backend/` — FastAPI

## Быстрый старт

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
