# День Марины

Telegram Mini App в жанре уютного тамагочи и симулятора дня.

## Запуск локально

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
uvicorn main:app --reload
```

Откройте `http://127.0.0.1:8000`.

Проверка сервера: `http://127.0.0.1:8000/health`.

## Railway

Проект содержит `Procfile` и готов к запуску командой:

```bash
uvicorn main:app --host 0.0.0.0 --port $PORT
```
