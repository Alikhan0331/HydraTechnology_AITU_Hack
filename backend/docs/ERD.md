# ERD — HydraTechnology

Диаграмма сущностей базы данных (рендерится на GitHub как Mermaid).

```mermaid
erDiagram
    STRUCTURE_TYPES ||--o{ HYDRAULIC_STRUCTURES : "классифицирует (по type_code)"
    CONDITION_CATEGORIES ||--o{ HYDRAULIC_STRUCTURES : "категория (по condition)"
    HYDRAULIC_STRUCTURES ||--o{ INSPECTIONS : "история обследований"
    HYDRAULIC_STRUCTURES ||--o{ RISK_ASSESSMENTS : "лог расчётов риска"

    HYDRAULIC_STRUCTURES {
        int id PK
        string name
        string type "RU-название"
        string type_code "FK→structure_types.code"
        string district
        float latitude
        float longitude
        string condition "good|monitoring|requires_repair|emergency"
        string risk_level "low|medium|high|critical"
        float risk_score "0..100"
        float length_km
        int year_built
        date last_inspection
        date next_inspection
        string water_source
        string locality
        string significance "local|regional|national"
        float capacity
        float area_ha
        float efficiency_design
        float efficiency_actual
        float wear_percent
        int structures_count
        string cadastral_number
        string source "dataset|generated|manual"
        string verification_status
        text description
        datetime created_at
        datetime updated_at
    }

    STRUCTURE_TYPES {
        int id PK
        string code UK
        string name_ru
        string icon
        string color
    }

    CONDITION_CATEGORIES {
        int id PK
        string code UK
        string name_ru
        string color
        int severity "0..3"
    }

    INSPECTIONS {
        int id PK
        int structure_id FK
        date date
        string inspector
        string condition_found
        float wear_found
        text notes
    }

    RISK_ASSESSMENTS {
        int id PK
        int structure_id FK
        datetime computed_at
        string risk_level
        float score
        json factors
        text recommendation
    }
```

## Заметки по проектированию
- `type`/`condition` денормализованы в `HYDRAULIC_STRUCTURES` строковыми кодами —
  это 1:1 совпадает с контрактом фронтенда и ускоряет аналитику (group by без join).
  Таблицы `STRUCTURE_TYPES` / `CONDITION_CATEGORIES` остаются справочниками
  (цвета, иконки, лейблы, порядок).
- Координаты хранятся как `float lat/lng` — без PostGIS (для масштаба хакатона
  достаточно; расстояния считаются по Haversine в `services/geo.py`).
- `RISK_ASSESSMENTS.factors` (JSON) хранит разбор риска по факторам —
  прозрачность для жюри и вход для AI-диспетчера.
