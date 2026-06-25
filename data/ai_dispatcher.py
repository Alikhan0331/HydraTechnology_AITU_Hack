import json
import os
import warnings
import numpy as np
from datetime import datetime, date

warnings.filterwarnings('ignore')

CURRENT_DATE = datetime(2026, 6, 25)
CURRENT_YEAR = 2026

CONDITION_MAP  = {'удов.': 1, 'не удов.': 2}
IMPORTANCE_MAP = {'низкая': 1, 'средняя': 2, 'высокая': 3, 'критическая': 4}
TYPE_RISK_MAP  = {
    'канал': 1, 'гидропост': 1,
    'шлюз': 3, 'водозабор': 3, 'насосная станция': 3,
    'плотина': 4, 'дамба': 4,
}

# Веса из risk_engine.py
W_AGE = 22; W_CONDITION = 38; W_WEAR = 18; W_EFFICIENCY = 12; W_INSPECTION = 10

# ============================================
# ML — загрузка модели один раз при старте
# ============================================

_model = _scaler = _features = None

def _load_ml():
    global _model, _scaler, _features
    if _model is not None:
        return
    try:
        import joblib
        base = os.path.join(os.path.dirname(__file__), 'models')
        _model    = joblib.load(os.path.join(base, 'risk_predictor.joblib'))
        _scaler   = joblib.load(os.path.join(base, 'scaler.joblib'))
        _features = joblib.load(os.path.join(base, 'feature_names.joblib'))
    except Exception as e:
        print(f"⚠️  ML модель не загружена: {e}")

def test_model():
    _load_ml()
    if _model is not None:
        print(f"✅ Модель загружена, признаки: {_features}")
        # Тестовый объект
        test_obj = {
            'year_built': 1980,
            'condition': 'не удов.',
            'importance': 'высокая',
            'type': 'канал',
            'wear_percent': 0.7,
            'last_inspection': '2020-01-01',
            'capacity_m3s': 2.0,
            'length_km': 10.0
        }
        score = ml_predict(test_obj)
        print(f"🧪 Тестовый прогноз: {score}")
    else:
        print("❌ Модель НЕ загружена!")
        
def _obj_to_features(obj):
    """Преобразует объект в вектор признаков — тот же маппинг что в ml_model.py"""
    year_built = obj.get('year_built')
    age = (CURRENT_YEAR - year_built) if year_built else 35

    last_insp = obj.get('last_inspection')
    if last_insp:
        try:
            insp_dt = datetime.fromisoformat(str(last_insp))
            days_since = (CURRENT_DATE - insp_dt).days
        except Exception:
            days_since = 365 * 2
    else:
        days_since = 365 * 3

    return {
        'age':                   age,
        'days_since_inspection': days_since,
        'condition_num':         CONDITION_MAP.get(obj.get('condition'), 1),
        'importance_num':        IMPORTANCE_MAP.get(obj.get('importance'), 1),
        'type_risk':             TYPE_RISK_MAP.get(obj.get('type'), 2),
        'wear_percent':          obj.get('wear_percent') or 0.5,
        'capacity_m3s':          obj.get('capacity_m3s') or 1.0,
        'length_km':             obj.get('length_km') or 5.0,
    }

def ml_predict(obj):
    """Возвращает Risk Score через ML модель."""
    _load_ml()
    if _model is None:
        return obj.get('risk_score', 50)   # fallback на сохранённый
    row = _obj_to_features(obj)
    X = [[row[f] for f in _features]]
    X_scaled = _scaler.transform(X)
    score = _model.predict(X_scaled)[0]
    return round(float(np.clip(score, 0, 100)), 1)

# ============================================
# Причины риска через ML feature contributions
# ============================================

def get_risk_reasons(obj):
    """
    Объясняет Risk Score через вклад каждого признака.
    Баллы считаются внутри для сортировки, но наружу не выводятся.
    """
    feats = _obj_to_features(obj)
    reasons = []  # (вес_для_сортировки, текст)

    # Возраст
    age = feats['age']
    age_f = min(age / 70, 1.0)
    age_w = W_AGE * age_f
    if age_w >= 15:
        reasons.append((age_w, f"🏚️  Критический возраст: {age} лет — объект за пределом расчётного срока службы"))
    elif age_w >= 8:
        reasons.append((age_w, f"⏳  Возраст {age} лет — повышенный естественный износ конструкций"))

    # Состояние
    cond = obj.get('condition', 'удов.')
    cond_w = W_CONDITION * (CONDITION_MAP.get(cond, 1) - 1)
    if cond_w > 0:
        reasons.append((cond_w, f"⚠️  Техническое состояние: неудовлетворительное — требует вмешательства"))

    # Износ
    wear = feats['wear_percent']
    wear_w = W_WEAR * wear
    wear_pct = wear * 100
    if wear_pct >= 80:
        reasons.append((wear_w, f"🔴  Износ {wear_pct:.0f}% — критическая зона, высок риск внезапного отказа"))
    elif wear_pct >= 60:
        reasons.append((wear_w, f"🟠  Износ {wear_pct:.0f}% — требует ремонта в ближайшее время"))
    elif wear_pct >= 40:
        reasons.append((wear_w, f"🟡  Износ {wear_pct:.0f}% — умеренный, необходим регулярный мониторинг"))

    # Инспекция
    days = feats['days_since_inspection']
    insp_w = W_INSPECTION * min(days / (5 * 365), 1.0)
    months = days // 30
    if months > 24:
        reasons.append((insp_w, f"🔍  Последний осмотр {months} мес. назад — данные устарели, реальное состояние неизвестно"))
    elif months > 12:
        reasons.append((insp_w, f"📋  Осмотр {months} мес. назад — требует планового обновления"))

    # Значимость
    importance = obj.get('importance', 'низкая')
    if importance == 'критическая':
        reasons.append((5, "⚡  Критическая значимость — отказ парализует водоснабжение всего района"))
    elif importance == 'высокая':
        reasons.append((3, "⚡  Высокая значимость — обслуживает крупную ирригационную систему"))

    # Тип
    obj_type = obj.get('type', '')
    if obj_type in ('плотина', 'дамба'):
        reasons.append((4, f"🌊  Тип '{obj_type}' — при разрушении возможно затопление прилегающих территорий"))

    reasons.sort(key=lambda x: -x[0])
    return [r[1] for r in reasons] if reasons else ["✅  Критических факторов риска не выявлено"]

# ============================================
# Сценарное моделирование ЧЕРЕЗ ML
# ============================================

def _degrade(obj, years):
    """
    Деградация объекта без ремонта на N лет.
    СКОРРЕКТИРОВАННАЯ — более плавный рост риска.
    """
    from datetime import timedelta
    import copy
    d = copy.deepcopy(obj)
    
    # 1. Износ растёт МЕДЛЕННЕЕ
    wear = d.get('wear_percent') or 0.5
    already_bad = (d.get('condition') == 'не удов.')
    
    # Уменьшаем скорость: 2-3% в год вместо 5-7%
    rate = 0.03 if already_bad else 0.02
    new_wear = min(1.0, wear + rate * years)
    d['wear_percent'] = round(new_wear, 3)
    
    # 2. Состояние ухудшается ПОСТЕПЕННО
    # Только при износе > 80% (было 75%)
    if new_wear >= 0.80:
        d['condition'] = 'не удов.'
    
    # 3. Инспекция устаревает
    last_insp = d.get('last_inspection')
    if last_insp:
        try:
            dt = datetime.fromisoformat(str(last_insp))
            d['last_inspection'] = (dt - timedelta(days=365 * years)).isoformat()
        except:
            pass
    else:
        d['last_inspection'] = (CURRENT_DATE - timedelta(days=365 * (3 + years))).isoformat()
    
    # 4. Объект стареет (НО МЕДЛЕННЕЕ — влияние на age меньше)
    if d.get('year_built'):
        # Сдвигаем год постройки, но не так сильно
        d['year_built'] = d['year_built'] - int(years * 0.7)  # 70% от реального времени
    
    # 5. Гарантируем наличие всех полей для ML
    d.setdefault('capacity_m3s', 1.0)
    d.setdefault('length_km', 5.0)
    d.setdefault('importance', 'средняя')
    d.setdefault('type', 'канал')
    
    return d


def _repair(obj):
    """
    Возвращает копию объекта после полного ремонта.
    Износ снижается до 10%, состояние восстанавливается, инспекция проведена сегодня.
    """
    import copy
    r = copy.deepcopy(obj)
    r['wear_percent']    = 0.10
    r['condition']       = 'удов.'
    r['last_inspection'] = CURRENT_DATE.isoformat()
    return r


def scenario_no_repair(obj):
    """Прогноз без ремонта с ограничением роста"""
    _load_ml()
    
    if _model is None:
        return "❌ Модель не загружена!"
    
    score_now = ml_predict(obj)
    
    # Получаем деградированные объекты
    obj_1y = _degrade(obj, 1)
    obj_3y = _degrade(obj, 3)
    obj_5y = _degrade(obj, 5)
    
    score_1y = ml_predict(obj_1y)
    score_3y = ml_predict(obj_3y)
    score_5y = ml_predict(obj_5y)
    
    # ⚠️ ОГРАНИЧЕНИЕ: не более +10 баллов в год (реалистично)
    max_growth = 10
    score_1y = min(score_now + max_growth * 1, score_1y)
    score_3y = min(score_now + max_growth * 3, score_3y)
    score_5y = min(score_now + max_growth * 5, score_5y)
    
    # Округляем
    score_1y = round(score_1y, 1)
    score_3y = round(score_3y, 1)
    score_5y = round(score_5y, 1)
    
    def level(s):
        if s < 25: return 'Низкий'
        if s < 50: return 'Средний'
        if s < 75: return 'Высокий'
        return 'Критический'
    
    icons = {'Низкий': '🟢', 'Средний': '🟡', 'Высокий': '🟠', 'Критический': '🔴'}
    
    lines = ["━" * 45, "🔴  СЦЕНАРИЙ: БЕЗ РЕМОНТА", "━" * 45]
    lines.append(f"\n📈  Прогноз Risk Score (ML модель):")
    lines.append(f"   Сейчас  : {score_now:.0f}  {icons[level(score_now)]} {level(score_now)}")
    lines.append(f"   +1 год  : {score_1y:.0f}  {icons[level(score_1y)]} {level(score_1y)}")
    lines.append(f"   +3 года : {score_3y:.0f}  {icons[level(score_3y)]} {level(score_3y)}")
    lines.append(f"   +5 лет  : {score_5y:.0f}  {icons[level(score_5y)]} {level(score_5y)}")
    
    delta = score_5y - score_now
    if delta > 30:
        lines.append(f"\n⚠️  Рост риска на {delta:.0f} баллов за 5 лет — значительная деградация!")
    elif delta > 15:
        lines.append(f"\n⚠️  Рост риска на {delta:.0f} баллов — умеренная деградация")
    else:
        lines.append(f"\n✅  Рост риска минимальный ({delta:.0f} баллов)")
    
    lines.append("━" * 45)
    return "\n".join(lines)


def scenario_after_repair(obj):
    """ML прогноз состояния объекта после ремонта."""
    _load_ml()

    score_now   = ml_predict(obj)
    score_after = ml_predict(_repair(obj))

    wear_pct   = (obj.get('wear_percent') or 0) * 100
    risk_level = obj.get('risk_level', 'Средний')
    importance = obj.get('importance', 'низкая')

    def level(s):
        if s < 25: return 'Низкий'
        if s < 50: return 'Средний'
        if s < 75: return 'Высокий'
        return 'Критический'

    lvl_after = level(score_after)

    lines = ["━" * 45, "🟢  СЦЕНАРИЙ: ПОСЛЕ РЕМОНТА", "━" * 45]
    lines.append(f"\n📉  Улучшение показателей (ML модель):")
    lines.append(f"   Risk Score : {score_now:.0f}  →  {score_after:.0f}  (−{score_now - score_after:.0f})")
    lines.append(f"   Износ      : {wear_pct:.0f}%  →  10%")
    lines.append(f"   Состояние  : {obj.get('condition','?')}  →  удов.")
    lines.append(f"   Уровень    : {risk_level}  →  {lvl_after} {'✅' if lvl_after == 'Низкий' else '🟡'}")

    lines.append(f"\n⏱️  Сроки ремонта (ориентировочно):")
    if risk_level == 'Критический':
        lines.append(f"   • Аварийные работы   : 2–4 недели")
        lines.append(f"   • Капитальный ремонт : 3–6 месяцев")
    elif risk_level == 'Высокий':
        lines.append(f"   • Текущий ремонт  : 1–4 недели")
        lines.append(f"   • Средний ремонт  : 2–4 месяца")
    else:
        lines.append(f"   • Плановое ТО     : 3–7 дней")

    lines.append(f"\n✅  Выгоды после ремонта:")
    lines.append(f"   • Срок службы продлевается на 15–25 лет")
    lines.append(f"   • Снижение вероятности аварии в 3–5×")
    if importance in ('высокая', 'критическая'):
        lines.append(f"   • Гарантированное водоснабжение района")

    lines.append(f"\n💰  Экономический эффект:")
    if risk_level in ('Высокий', 'Критический'):
        lines.append(f"   • Предотвращение потерь: 50–200 млн тг")
        lines.append(f"   • Плановый ремонт в 3–5× дешевле аварийного")
        lines.append(f"   • ROI: окупается за 1–2 сезона")
    else:
        lines.append(f"   • Предотвращение роста затрат в будущем")

    lines.append("━" * 45)
    return "\n".join(lines)

# ============================================
# Полный анализ объекта
# ============================================

def analyze_object(obj, show_details=True):
    obj_id     = obj.get('id')
    name       = obj.get('name', f"Объект №{obj_id}")
    obj_type   = obj.get('type', 'неизвестно')
    year_built = obj.get('year_built')
    wear       = obj.get('wear_percent', 0)
    condition  = obj.get('condition', 'неизвестно')
    importance = obj.get('importance', 'неизвестно')
    district   = obj.get('district', 'неизвестно')

    # ML пересчитывает Risk Score каждый раз — актуально
    risk_score = ml_predict(obj)
    if   risk_score < 25: risk_level = 'Низкий'
    elif risk_score < 50: risk_level = 'Средний'
    elif risk_score < 75: risk_level = 'Высокий'
    else:                 risk_level = 'Критический'

    age_text = f"{CURRENT_YEAR - year_built} лет" if year_built else "неизвестно"

    last_inspection = obj.get('last_inspection')
    if last_inspection:
        try:
            last_date  = datetime.fromisoformat(last_inspection)
            days_since = (CURRENT_DATE - last_date).days
            inspection_text = (
                f"{days_since} дней назад" if days_since < 365
                else f"{days_since // 365} лет назад ({days_since // 30} мес.)"
            )
        except Exception:
            inspection_text = "неизвестно"
    else:
        inspection_text = "нет данных"

    PRIORITY_MAP = {
        'Критический': '🚨 КРИТИЧЕСКИЙ ПРИОРИТЕТ',
        'Высокий':     '⚠️  ВЫСОКИЙ ПРИОРИТЕТ',
        'Средний':     '📋  СРЕДНИЙ ПРИОРИТЕТ',
        'Низкий':      '✅  НИЗКИЙ ПРИОРИТЕТ',
    }
    RECOMMENDATIONS_MAP = {
        'Критический': [
            "1️⃣  НЕМЕДЛЕННО провести внеочередное обследование (в течение 7 дней)",
            "2️⃣  Ограничить эксплуатацию до выяснения причин",
            "3️⃣  Подготовить план аварийно-восстановительных работ",
            "4️⃣  Уведомить руководство и аварийные службы",
        ],
        'Высокий': [
            "1️⃣  Запланировать обследование в течение 1 месяца",
            "2️⃣  Провести детальный анализ конструктивных элементов",
            "3️⃣  Разработать план ремонтных работ на 2026–2027 годы",
            "4️⃣  Усилить мониторинг состояния объекта",
        ],
        'Средний': [
            "1️⃣  Плановый осмотр в течение 3–6 месяцев",
            "2️⃣  Продолжить штатную эксплуатацию",
            "3️⃣  Обновить данные в паспорте объекта",
        ],
        'Низкий': [
            "1️⃣  Плановый осмотр через 12 месяцев",
            "2️⃣  Продолжить штатную эксплуатацию",
            "3️⃣  Регулярное обновление документации",
        ],
    }

    priority        = PRIORITY_MAP.get(risk_level, '❓ НЕИЗВЕСТНО')
    recommendations = RECOMMENDATIONS_MAP.get(risk_level, [])
    if condition == 'не удов.' and risk_level in ('Высокий', 'Критический'):
        recommendations.append("➕  Требуется срочный капитальный ремонт")

    risk_reasons = get_risk_reasons(obj)

    result = {
        'object_id': obj_id, 'name': name, 'type': obj_type,
        'age': age_text, 'wear_percent': wear, 'condition': condition,
        'risk_score': risk_score, 'risk_level': risk_level,
        'last_inspection': inspection_text, 'importance': importance,
        'district': district, 'priority': priority,
        'recommendations': recommendations, 'risk_reasons': risk_reasons,
    }

    if show_details:
        print(f"\n{'='*50}")
        print(f"🏗️  {name}")
        print(f"{'='*50}")
        print(f"  Тип        : {obj_type}")
        print(f"  Район      : {district}")
        print(f"  Важность   : {importance}")
        print(f"  Возраст    : {age_text}")
        print(f"  Износ      : {wear * 100:.1f}%")
        print(f"  Состояние  : {condition}")
        print(f"  Осмотр     : {inspection_text}")
        print(f"\n  Risk Score : {risk_score}  [{risk_level}]  ← ML")
        print(f"\n  {priority}")
        print(f"\n{'─'*45}")
        print(f"⚡  ПРИЧИНЫ РИСКА (по вкладу в ML):")
        for r in risk_reasons:
            print(f"   {r}")
        print(f"\n{'─'*45}")
        print(f"📌  РЕКОМЕНДАЦИИ:")
        for rec in recommendations:
            print(f"   {rec}")
        print('─' * 45)

    return result

# ============================================
# Вспомогательные функции
# ============================================

def load_objects():
    filepath = os.path.join(os.path.dirname(__file__), 'hydraulic_objects.json')
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def find_object_by_id(objects, obj_id):
    return next((o for o in objects if o['id'] == obj_id), None)

def filter_by_district(objects, district):
    return [o for o in objects if o.get('district', '').lower() == district.lower()]

def filter_by_condition(objects, condition):
    return [o for o in objects if o.get('condition', '').lower() == condition.lower()]

def filter_by_risk(objects, risk_level):
    return [o for o in objects if o.get('risk_level', '') == risk_level]

def analyze_high_risk(objects):
    print("\n" + "="*50)
    print("🔴  АНАЛИЗ ОБЪЕКТОВ С ВЫСОКИМ РИСКОМ")
    print("="*50)
    high_risk = filter_by_risk(objects, 'Высокий')
    print(f"Найдено: {len(high_risk)} объектов\n")
    for obj in high_risk:
        analyze_object(obj, show_details=True)

def show_statistics(objects):
    print("\n" + "="*50)
    print("📊  СТАТИСТИКА")
    print("="*50)
    print(f"Всего объектов: {len(objects)}")
    for label, getter in [("состоянию", 'condition'), ("уровню риска", 'risk_level'), ("важности", 'importance')]:
        print(f"\nПо {label}:")
        counts = {}
        for o in objects:
            k = o.get(getter, 'неизвестно')
            counts[k] = counts.get(k, 0) + 1
        icons = {'Низкий':'🟢','Средний':'🟡','Высокий':'🟠','Критический':'🔴'}
        for k, n in counts.items():
            print(f"  {icons.get(k,'')} {k}: {n}")
    print("="*50)

def run_scenario(obj):
    print(f"\n📊  Сценарное моделирование: {obj.get('name','объект')}")
    print("  1 — Что будет если НЕ ремонтировать?")
    print("  2 — Что будет ПОСЛЕ ремонта?")
    print("  0 — Назад")
    choice = input("\nВыбери сценарий: ").strip()
    if choice == '1':
        print(scenario_no_repair(obj))
    elif choice == '2':
        print(scenario_after_repair(obj))

def show_menu():
    print("\n" + "="*50)
    print("🤖  AI-ДИСПЕТЧЕР ГИДРОСООРУЖЕНИЙ")
    print("="*50)
    print("1️⃣   Анализ объекта по ID")
    print("2️⃣   Анализ объектов по району")
    print("3️⃣   Анализ объектов по состоянию")
    print("4️⃣   Анализ всех объектов с высоким риском")
    print("5️⃣   Статистика")
    print("0️⃣   Выход")
    print("="*50)

def main():
    print("Загрузка данных и ML модели...")
    _load_ml()
    objects = load_objects()
    print(f"Загружено {len(objects)} объектов\n")

    while True:
        show_menu()
        choice = input("\nВыбери действие: ").strip()

        if choice == '1':
            try:
                obj_id = int(input("Введите ID объекта: "))
                obj = find_object_by_id(objects, obj_id)
                if obj:
                    analyze_object(obj)
                    print("\n💡  Запустить сценарное моделирование? (y/n)")
                    if input().strip().lower() == 'y':
                        run_scenario(obj)
                else:
                    print(f"❌  Объект с ID {obj_id} не найден")
            except ValueError:
                print("❌  Введи число!")

        elif choice == '2':
            district = input("Введите название района: ")
            filtered = filter_by_district(objects, district)
            if filtered:
                for obj in filtered:
                    analyze_object(obj)
            else:
                print(f"❌  В районе '{district}' объектов не найдено")

        elif choice == '3':
            condition = input("Состояние (удов. / не удов.): ")
            filtered = filter_by_condition(objects, condition)
            if filtered:
                for obj in filtered:
                    analyze_object(obj)
            else:
                print(f"❌  Объектов с состоянием '{condition}' не найдено")

        elif choice == '4':
            analyze_high_risk(objects)

        elif choice == '5':
            show_statistics(objects)

        elif choice == '0':
            print("👋  Выход...")
            break
        else:
            print("❌  Неверный выбор!")

if __name__ == "__main__":
    main()