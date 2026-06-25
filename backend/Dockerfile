FROM python:3.12-slim

WORKDIR /app
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1

# Install deps (+ psycopg for PostgreSQL). cp312 has wheels for everything.
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt "psycopg[binary]>=3.2"

COPY app ./app

EXPOSE 8000
# App auto-creates tables and seeds an empty DB on startup (ensure_seeded()).
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
