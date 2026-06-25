# HydraTechnology — Backend API

Интеллектуальная система мониторинга и оценки состояния **гидротехнических
сооружений Жамбылской области**. Цифровой каталог + карта + классификация
состояния + риск-модель + аналитика.

**Стек:** FastAPI · SQLAlchemy 2 · Pydantic v2 · SQLite (по умолчанию) / PostgreSQL.

---

## 🚀 Быстрый старт

```bash
cd backend
python3 -m venv venv
source venv/bin/activate          # Windows: venv\Scripts\activate
pip install --only-binary=:all: -r requirements.txt   # wheels only (no Rust build)

python -m app.seed.seed --reset   # наполнить БД (≈540 объектов)
uvicorn app.main:app --reload --port 8000
```

- API: `http://localhost:8000`
- Swagger (интерактивная документация): **`http://localhost:8000/docs`**
- БД по умолчанию — SQLite-файл `hydra.db` (никакой установки не требуется).
  Для PostgreSQL — скопируй `.env.example` → `.env` и задай `DATABASE_URL`.

### 🐳 Через Docker (PostgreSQL + API одной командой)

Из корня репозитория:
```bash
docker compose up --build
```
Поднимает PostgreSQL 16 + FastAPI. Бэкенд **сам создаёт таблицы и засевает БД**
при первом старте. API на `http://localhost:8000`, Postgres на `:5432`.
Проверено: `docker compose up` → 539 объектов в Postgres, аналитика работает.

---

## 📡 API-контракт (для фронтенда и интеграции)

Базовый префикс: **`/api`** · CORS открыт для `localhost:5173`.

### Структуры (каталог)
| Метод | Путь | Описание |
|------|------|----------|
| GET | `/api/structures` | Список (массив `Structure`). Фильтры ниже. |
| GET | `/api/structures/map` | Облегчённый список для карты |
| GET | `/api/structures/{id}` | Карточка объекта (полная) |
| POST | `/api/structures` | Создать (состояние/риск считаются авто) |
| PUT | `/api/structures/{id}` | Обновить (риск пересчитывается) |
| DELETE | `/api/structures/{id}` | Удалить |
| GET | `/api/structures/{id}/risk` | Риск + факторы + рекомендация |
| POST | `/api/structures/{id}/risk` | Пересчитать и залогировать риск |
| GET | `/api/structures/{id}/inspections` | История обследований |
| POST | `/api/structures/{id}/inspections` | Добавить обследование |

**Фильтры `GET /api/structures`** (query-параметры, все опциональны):
`type` (RU-название или код), `condition`, `district`, `risk_level`,
`significance`, `q` (поиск по названию/району/округу), `year_min`, `year_max`,
`sort` (`id|name|risk|year`), `limit`, `offset`.
Примеры: `/api/structures?type=Плотина&condition=emergency` ·
`/api/structures?district=Меркенский&sort=risk` · `/api/structures?q=талас`

### Аналитика
| Метод | Путь | Описание |
|------|------|----------|
| GET | `/api/analytics/summary` | KPI для дашборда (см. ниже) |
| GET | `/api/analytics/dashboard` | Всё для главного экрана одним запросом (KPI + распределения + динамика + recently_added + top_risk) |
| GET | `/api/analytics/charts` | Данные для графиков (по типам/районам/декадам/риску) |
| GET | `/api/analytics/dynamics?months=12` | Динамика состояния по месяцам (линейный график) |
| GET | `/api/analytics/top-risk?limit=10` | Топ проблемных объектов (диспетчер) |

### Отчёты / Экспорт (ТЗ: отчётность)
| Метод | Путь | Формат |
|------|------|--------|
| GET | `/api/reports/structures.csv` | CSV (UTF-8 BOM, `;`) |
| GET | `/api/reports/structures.xlsx` | Excel (листы «Объекты» + «Сводка») |
| GET | `/api/reports/structures.pdf` | PDF (сводка + таблица, кириллица) |

Принимают те же фильтры, что и `/api/structures` → «экспорт текущего вида».
Пример: `/api/reports/structures.xlsx?condition=emergency&district=Меркенский`.

### Обнаружение и дедупликация (ТЗ задачи 3–4)
| Метод | Путь | Описание |
|------|------|----------|
| GET | `/api/detection/search?lat=&lon=&radius_km=` | Поиск ГТС по координатам |

Возвращает `{ structures: [{id?, name, type, lat, lon, confidence, source, condition?}], summary, osm_source }`.
Два **реальных** источника (`source`): `catalog` — объекты нашей базы в радиусе;
`osm` — реальные объекты OpenStreetMap (живой Overpass; при отсутствии интернета —
закэшированный реальный снимок региона `app/seed/data/osm_zhambyl.json`).
`osm_source` = `live | cached | none`. **Сверка с базой:** каждый OSM-объект
сопоставляется с ближайшим объектом каталога по расстоянию Haversine (порог 350 м)
и схожести названия; совпавшие считаются `matched`, остальные возвращаются без `id`
и помечаются `verification_status: needs_check` (ТЗ задача 4). Никаких синтетических
данных — только каталог и реальный OSM.

### Справочники (для дропдаунов/легенд)
`GET /api/meta/types` · `/api/meta/conditions` · `/api/meta/districts` ·
`/api/meta/risk-levels` · `/api/meta/significance`

---

## 📦 Модель `Structure` (ответ API)

```jsonc
{
  "id": 1,
  "name": "Канал Талас №1",
  "type": "Канал",                 // RU-название типа
  "type_code": "canal",            // машинный код типа
  "district": "Байзакский",
  "latitude": 42.86771,
  "longitude": 71.28934,
  "condition": "good",             // good | monitoring | requires_repair | emergency
  "risk_level": "medium",          // low | medium | high | critical
  "risk_score": 35.1,              // 0..100
  "length_km": 7.74,
  "year_built": 1973,
  "last_inspection": "2025-06-05",
  "next_inspection": "2026-07-25", // когда осматривать снова (модель периода осмотра)
  "description": "...",
  // расширенные тех. поля (из официального датасета):
  "water_source": "р. Талас", "capacity": 3.0, "area_ha": 1200,
  "efficiency_design": 0.85, "efficiency_actual": 0.73, "wear_percent": 30.0,
  "length_earthen_km": null, "length_lined_km": 7.74, "structures_count": null,
  "cadastral_number": "Кадастровый № 0001", "significance": "local",
  "source": "dataset", "verification_status": "verified"
}
```

### Коды состояния (совпадают с фронтом)
| code | RU | цвет |
|------|----|------|
| `good` | Исправное | 🟢 `#22c55e` |
| `monitoring` | Требует наблюдения | 🟡 `#f59e0b` |
| `requires_repair` | Требует ремонта | 🟠 `#f97316` |
| `emergency` | Аварийное | 🔴 `#ef4444` |

### `GET /api/analytics/summary`
```jsonc
{
  "total": 539,
  "by_condition": { "good": 193, "monitoring": 216, "requires_repair": 91, "emergency": 39 },
  "by_type": { "Канал": 353, "Шлюз": 40, "Гидропост": 36, ... },
  "by_district": { ... }, "by_risk": { ... }, "by_significance": { ... },
  "emergency": 39, "requires_repair": 91,
  "overall_condition_index": 68,   // общий индекс состояния инфраструктуры 0..100
  "total_length_km": 2359.5, "avg_age_years": 50.8
}
```

---

## 🧠 Логика оценки (ТЗ: задачи 5 и 6)

- **Классификация состояния** (`services/classification.py`) — из паспортного
  «удов./не удов.» + возраст + износ + падение КПД → 4 категории.
- **Риск-модель** (`services/risk_engine.py`) — прозрачный взвешенный балл 0..100
  (возраст 22 / состояние 38 / износ 18 / КПД 12 / давность осмотра 10), уровень
  риска и **дата следующего осмотра**.
- **Сезонность осмотра** (ТЗ задача 5) — паводок-чувствительные объекты (плотины,
  дамбы, шлюзы, водозаборы) осматриваются на ~20% чаще, и осмотр планируется
  **до начала весеннего половодья**. Просроченные объекты пересчитываются по
  срочности. Все факторы (включая `seasonal`) возвращаются в `/risk`.

## 🗃️ Данные

- **353 реальных канала** импортированы из официального датасета хакатона
  (`app/seed/data/canals_raw.json`). Датасет обезличен (районы «Район N»,
  источник «р. Иртыш»), поэтому для связности с регионом каналы привязаны к
  **реальным районам и рекам Жамбылской области**, координат в датасете нет —
  они сгенерированы внутри bbox области по районам (см. `services/geo.py`).
- **~186 объектов остальных типов** (гидропосты, шлюзы, плотины, насосные,
  водозаборы, дамбы) сгенерированы для полноты карты и аналитики
  (`source: "generated"`).

## 📁 Структура
```
app/
 ├─ main.py            FastAPI + CORS + роутеры
 ├─ config.py          настройки (env)
 ├─ database.py        engine/session/Base
 ├─ models.py          ORM: StructureType, ConditionCategory, HydraulicStructure,
 │                          Inspection, RiskAssessment
 ├─ schemas.py         Pydantic = API-контракт
 ├─ enums.py           коды/лейблы/районы/типы
 ├─ crud.py            запросы и мутации
 ├─ routers/           structures · analytics · meta
 ├─ services/          classification · risk_engine · geo
 └─ seed/              generate.py · seed.py · data/canals_raw.json
```
См. ERD в [`docs/ERD.md`](docs/ERD.md).
