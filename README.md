# HydraTech — мониторинг гидротехнических сооружений Жамбылской области

Интеллектуальная система систематизации, каталогизации и **оценки состояния**
гидротехнических сооружений (ГТС) Жамбылского региона. Не просто реестр —
система находит проблемные объекты, оценивает риск, приоритезирует осмотры и
ремонты, обнаруживает объекты вне реестра и формирует отчёты.

> **AITU Hackday 2026 · Team Voyager**

---

## ✨ Возможности

- **Цифровой каталог** ГТС (каналы, гидропосты, шлюзы, водозаборы, насосные
  станции, плотины, дамбы) — поиск, фильтры, карточка объекта.
- **Карта** объектов с цветовой индикацией состояния + **хороплет-карта районов**
  (раскраска по District Health Index на реальных границах).
- **Классификация состояния**: Исправное / Требует наблюдения / Требует ремонта / Аварийное.
- **Risk Score** (0–100) — экспертная модель оценки риска с причинами.
- **Inspection Priority** — приоритет и рекомендуемый срок осмотра (с сезонностью).
- **Рейтинг районов** (District Health Index 0–100).
- **Обнаружение по координатам** — поиск ГТС в OpenStreetMap + **дедупликация** с базой.
- **История эксплуатации** — осмотры и ремонты по каждому объекту.
- **Импорт** данных (CSV/Excel/xls, в т.ч. формат датасета) с дедупликацией.
- **Отчёты**: PDF-паспорт объекта, экспорт реестра CSV/Excel/PDF.
- **Аналитика**: дашборд, динамика состояния, распределения, индекс инфраструктуры.

## 🧱 Стек

| Слой | Технологии |
|---|---|
| Backend | Python · FastAPI · SQLAlchemy 2 · Pydantic v2 · SQLite (по умолч.) / PostgreSQL |
| Frontend | React · TypeScript · Vite · Leaflet · Recharts |
| Данные | Реальный датасет каналов + OpenStreetMap (Overpass) + границы районов (GADM) |

Все расчёты — **детерминированные экспертные модели**, без AI/ML.

---

## 🚀 Запуск

### Вариант 1 — локально (для разработки)

**Backend** (Python 3.12+):
```bash
cd backend
python3 -m venv venv
source venv/bin/activate            # Windows: venv\Scripts\activate
pip install --only-binary=:all: -r requirements.txt
uvicorn app.main:app --reload --port 8000
```
→ API: http://localhost:8000 · Swagger: http://localhost:8000/docs
БД создаётся и наполняется (~545 объектов) автоматически при первом старте.

**Frontend** (Node.js 22.12+):
```bash
cd frontend
npm install
npm run dev
```
→ Портал: **http://localhost:5173**

### Вариант 2 — Docker (PostgreSQL + API одной командой)
```bash
docker compose up --build
```
→ API на :8000 (PostgreSQL на :5432). Frontend запускается отдельно (`npm run dev`).

### Пересоздать/обновить демо-данные
```bash
cd backend && source venv/bin/activate
python -m app.seed.seed --reset
```

---

## 🗂️ Структура

```
backend/            FastAPI: модели, схемы, роутеры, сервисы, сидер
  app/services/     classification · risk_score · priority · district_rating ·
                    discovery · risk_engine(сезонность) · geo · importer
  app/routers/      structures · analytics · detection · reports · imports · meta
frontend/           React + Vite (страницы: Дашборд, Каталог, Карта, Аналитика,
                    Обнаружение, Импорт, Карта районов, Карточка объекта)
docker-compose.yml  PostgreSQL + backend
data/               исходный датасет (Dataset.xls)
```
Подробнее по API и формулам — см. [`backend/README.md`](backend/README.md).

## 🔌 Основные эндпоинты
```
/api/structures            CRUD каталога (+фильтры, поиск, /map, /{id}/history)
/api/structures/{id}/risk · /priority · /risk-score      оценки объекта
/api/analytics/summary · dashboard · dynamics · top-risk ·
              priority-ranking · district-rating         аналитика
/api/detection/search      поиск ГТС по координатам (OSM + дедуп)
/api/import/structures     импорт CSV/Excel/xls
/api/reports/...           отчёты CSV/Excel/PDF + паспорт объекта
```

## 👥 Команда
Backend & Tech Lead · Frontend Lead · Integration & Product Lead.
# Voyager — Цифровой каталог гидротехнических сооружений Жамбылской области

## Команда

| Участник | Зона ответственности | Что конкретно сделано |
|---|---|---|
| **Алихан Айтжанов** | Backend (FastAPI) | REST API, база данных, модель оценки риска, алгоритм расчёта периода осмотра, сезонный фактор паводка, алгоритм обнаружения и дедупликации объектов, классификация состояния, роутеры (structures, analytics, detection, reports, imports, forecast) |
| **Алихан Махамбет** | Frontend (React + TypeScript) | Интерактивная карта, каталог объектов, дашборд с аналитикой, карточки объектов, фильтры, страница аналитики, импорт данных, создание объектов, компоненты (RiskScoreCard, InspectionPriority, DistrictRating, PriorityRanking и др.) |
| **Алихан Матмусаев** | Data | Датасет по гидросооружениям Жамбылской области, синтетические данные для тестирования, геопривязка объектов, структура цифрового каталога, данные районов (GeoJSON), данные из OSM по региону |
