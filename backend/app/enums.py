"""Domain enums + reference catalogs (codes, RU labels, colors).

Condition codes and risk codes MUST match the frontend contract
(see frontend/src/utils/conditionColors.ts and api/structures.ts).
"""
from enum import Enum


class ConditionCode(str, Enum):
    GOOD = "good"                       # Исправное
    MONITORING = "monitoring"           # Требует наблюдения
    REQUIRES_REPAIR = "requires_repair"  # Требует ремонта
    EMERGENCY = "emergency"             # Аварийное


class RiskLevel(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Significance(str, Enum):
    LOCAL = "local"
    REGIONAL = "regional"
    NATIONAL = "national"


# --- Condition catalog: code -> (RU label, color, severity) -------------------
CONDITIONS = {
    ConditionCode.GOOD: ("Исправное", "#22c55e", 0),
    ConditionCode.MONITORING: ("Требует наблюдения", "#f59e0b", 1),
    ConditionCode.REQUIRES_REPAIR: ("Требует ремонта", "#f97316", 2),
    ConditionCode.EMERGENCY: ("Аварийное", "#ef4444", 3),
}

RISK_LABELS = {
    RiskLevel.LOW: "Низкий",
    RiskLevel.MEDIUM: "Средний",
    RiskLevel.HIGH: "Высокий",
    RiskLevel.CRITICAL: "Критический",
}

SIGNIFICANCE_LABELS = {
    Significance.LOCAL: "Местное",
    Significance.REGIONAL: "Региональное",
    Significance.NATIONAL: "Республиканское",
}


# --- Structure types: code -> (RU name, icon, color) --------------------------
STRUCTURE_TYPES = {
    "canal": ("Канал", "〰️", "#0891b2"),
    "gidropost": ("Гидропост", "📡", "#2563eb"),
    "sluice": ("Шлюз", "🚪", "#7c3aed"),
    "water_intake": ("Водозабор", "🚰", "#0d9488"),
    "pumping_station": ("Насосная станция", "⚙️", "#db2777"),
    "dam": ("Плотина", "🧱", "#b45309"),
    "dike": ("Дамба", "⛰️", "#65a30d"),
    "other": ("Другое", "📍", "#64748b"),
}

# Reverse map: RU name -> code (frontend sends/filters by RU name).
TYPE_NAME_TO_CODE = {ru: code for code, (ru, _icon, _color) in STRUCTURE_TYPES.items()}


# --- Districts of Zhambyl region (real) with approx. centers + main river -----
# (lat, lng, primary water source)
DISTRICTS = {
    "Тараз (город)":        (42.900, 71.390, "р. Талас"),
    "Байзакский":          (43.000, 71.300, "р. Талас"),
    "Жамбылский":          (42.830, 71.100, "р. Талас"),
    "Жуалынский":          (42.860, 70.300, "р. Терса"),
    "Кордайский":          (43.050, 74.710, "р. Шу"),
    "Меркенский":          (42.870, 73.180, "р. Мерке"),
    "Мойынкумский":        (44.280, 72.950, "р. Шу"),
    "Сарысуский":          (43.570, 69.730, "р. Сарысу"),
    "Таласский":           (43.170, 70.470, "р. Асса"),
    "Т. Рыскуловский":     (42.920, 72.300, "р. Куркуреусу"),
    "Шуский":              (43.600, 73.760, "р. Шу"),
}

DISTRICT_NAMES = list(DISTRICTS.keys())
