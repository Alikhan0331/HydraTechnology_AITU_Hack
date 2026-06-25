import json
import os
from datetime import datetime

CURRENT_DATE = datetime(2026, 6, 25)
CURRENT_YEAR = 2026

# ============================================
# 1. Загрузка данных
# ============================================

def load_objects():
    filepath = os.path.join(os.path.dirname(__file__), 'hydraulic_objects.json')
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

# ============================================
# 2. Причины риска (Risk Reasons)
# ============================================

def get_risk_reasons(obj):
    """
    Возвращает список конкретных причин высокого риска объекта.
    Каждая причина — это факт с пороговой проверкой.
    """
    reasons = []

    year_built = obj.get('year_built')
    if year_built:
        age = CURRENT_YEAR - year_built
        if age >= 60:
            reasons.append(f"🏚️  Критический возраст: {age} лет (норма до 50)")
        elif age >= 40:
            reasons.append(f"⏳  Возраст > 40 лет: {age} лет — повышенный износ")

    wear = obj.get('wear_percent', 0)
    if wear is not None:
        wear_pct = wear * 100
        if wear_pct >= 80:
            reasons.append(f"🔴  Критический износ: {wear_pct:.0f}% (аварийная зона)")
        elif wear_pct >= 60:
            reasons.append(f"🟠  Высокий износ: {wear_pct:.0f}% (требует ремонта)")
        elif wear_pct >= 40:
            reasons.append(f"🟡  Умеренный износ: {wear_pct:.0f}%")

    condition = obj.get('condition')
    if condition == 'не удов.':
        reasons.append("⚠️  Неудовлетворительное техническое состояние")

    last_insp = obj.get('last_inspection')
    if last_insp:
        try:
            insp_dt = datetime.fromisoformat(last_insp)
            days = (CURRENT_DATE - insp_dt).days
            months = days // 30
            if days > 365 * 2:
                reasons.append(f"🔍  Осмотр {days // 365} года(лет) назад — просрочен")
            elif days > 365:
                reasons.append(f"🔍  Осмотр {months} месяцев назад — требует обновления")
            elif days > 180:
                reasons.append(f"📋  Осмотр {months} месяцев назад")
        except Exception:
            reasons.append("❓  Дата последнего осмотра неизвестна")
    else:
        reasons.append("❓  Осмотр никогда не проводился")

    importance = obj.get('importance')
    if importance == 'критическая':
        reasons.append("⚡  Критическая значимость — отказ парализует водоснабжение района")
    elif importance == 'высокая':
        reasons.append("⚡  Высокая значимость — обслуживает крупную ирригационную систему")

    obj_type = obj.get('type', '')
    if obj_type in ('плотина', 'дамба'):
        reasons.append(f"🌊  Тип '{obj_type}' — отказ несёт угрозу затопления")
    elif obj_type in ('насосная станция', 'шлюз', 'водозабор'):
        reasons.append(f"⚙️  Тип '{obj_type}' — механически сложный, высок риск сбоя")

    capacity = obj.get('capacity_m3s')
    if capacity and capacity > 10:
        reasons.append(f"💧  Высокая пропускная способность: {capacity} м³/с — аварийный выброс опасен")

    return reasons if reasons else ["✅  Критических факторов риска не выявлено"]

# ============================================
# 3. Сценарное моделирование
# ============================================

def scenario_no_repair(obj):
    """Сценарий: что будет если НЕ ремонтировать"""
    risk_score = obj.get('risk_score', 50)
    risk_level = obj.get('risk_level', 'Средний')
    wear = (obj.get('wear_percent') or 0) * 100
    year_built = obj.get('year_built')
    age = (CURRENT_YEAR - year_built) if year_built else 40
    obj_type = obj.get('type', 'объект')

    lines = ["━" * 45]
    lines.append("🔴  СЦЕНАРИЙ: БЕЗ РЕМОНТА")
    lines.append("━" * 45)

    # Прогноз роста риска
    risk_1y = min(100, risk_score * 1.15)
    risk_3y = min(100, risk_score * 1.40)
    risk_5y = min(100, risk_score * 1.70)

    lines.append(f"\n📈  Прогноз роста Risk Score:")
    lines.append(f"   Сейчас : {risk_score:.0f}")
    lines.append(f"   +1 год  : {risk_1y:.0f}  {'⚠️' if risk_1y > 50 else ''}")
    lines.append(f"   +3 года : {risk_3y:.0f}  {'🟠' if risk_3y > 65 else ''}")
    lines.append(f"   +5 лет  : {risk_5y:.0f}  {'🔴 КРИТИЧЕСКИЙ' if risk_5y > 75 else ''}")

    lines.append(f"\n⚠️  Последствия по времени:")

    if risk_level in ('Высокий', 'Критический') or wear >= 60:
        lines.append(f"   • 0–6 мес  : нарастание дефектов, утечки")
        lines.append(f"   • 6–18 мес : выход из строя отдельных узлов")
        lines.append(f"   • 1–3 года  : частичный или полный отказ {obj_type}а")
        lines.append(f"   • 3–5 лет   : аварийная ситуация, нарушение водоснабжения")
    else:
        lines.append(f"   • 0–1 год   : незначительное ухудшение состояния")
        lines.append(f"   • 1–3 года  : ускорение износа без обслуживания")
        lines.append(f"   • 3–5 лет   : вероятен переход в категорию 'Высокий риск'")
        lines.append(f"   • 5+ лет    : потребуется капитальный ремонт")

    lines.append(f"\n💰  Экономические потери:")
    if risk_level == 'Критический':
        lines.append(f"   • Аварийный ремонт в 3–5× дороже планового")
        lines.append(f"   • Простой ирригации: до 50–200 млн тг убытков")
        lines.append(f"   • Компенсации пострадавшим хозяйствам")
    elif risk_level == 'Высокий':
        lines.append(f"   • Стоимость ремонта вырастет в 2–3× через 2 года")
        lines.append(f"   • Потери урожая при сбое в вегетационный период")
    else:
        lines.append(f"   • Стоимость ремонта вырастет в 1.5–2× через 3–5 лет")

    lines.append("━" * 45)
    return "\n".join(lines)


def scenario_after_repair(obj):
    """Сценарий: что будет ПОСЛЕ ремонта"""
    risk_score = obj.get('risk_score', 50)
    risk_level = obj.get('risk_level', 'Средний')
    wear = (obj.get('wear_percent') or 0) * 100
    obj_type = obj.get('type', 'объект')
    importance = obj.get('importance', 'низкая')

    lines = ["━" * 45]
    lines.append("🟢  СЦЕНАРИЙ: ПОСЛЕ РЕМОНТА")
    lines.append("━" * 45)

    # Новый ожидаемый риск
    risk_new = max(8, risk_score * 0.30)
    wear_new = max(5, wear * 0.15)

    lines.append(f"\n📉  Улучшение показателей:")
    lines.append(f"   Risk Score : {risk_score:.0f}  →  {risk_new:.0f}  (снижение на {risk_score - risk_new:.0f} баллов)")
    lines.append(f"   Износ      : {wear:.0f}%  →  {wear_new:.0f}%")
    lines.append(f"   Уровень    : {risk_level}  →  Низкий ✅")

    lines.append(f"\n⏱️  Сроки ремонта (ориентировочно):")
    if risk_level == 'Критический':
        lines.append(f"   • Аварийные работы   : 2–4 недели")
        lines.append(f"   • Капитальный ремонт : 3–6 месяцев")
        lines.append(f"   • Полная реконструкция (если нужно): 1–2 года")
    elif risk_level == 'Высокий':
        lines.append(f"   • Текущий ремонт  : 1–4 недели")
        lines.append(f"   • Средний ремонт  : 2–4 месяца")
    else:
        lines.append(f"   • Плановое ТО     : 3–7 дней")
        lines.append(f"   • Текущий ремонт  : 2–4 недели")

    lines.append(f"\n✅  Выгоды после ремонта:")
    lines.append(f"   • Срок службы продлевается на 15–25 лет")
    lines.append(f"   • Снижение вероятности аварии в 3–5×")
    if importance in ('высокая', 'критическая'):
        lines.append(f"   • Гарантированное водоснабжение района")
        lines.append(f"   • Соответствие нормативам Водного кодекса РК")
    lines.append(f"   • Снятие объекта с мониторинга высокого риска")

    lines.append(f"\n💰  Экономический эффект:")
    if risk_level in ('Высокий', 'Критический'):
        lines.append(f"   • Предотвращение аварийных потерь: 50–200 млн тг")
        lines.append(f"   • Плановый ремонт в 3–5× дешевле аварийного")
        lines.append(f"   • ROI ремонта: окупается за 1–2 сезона")
    else:
        lines.append(f"   • Предотвращение роста затрат в будущем")
        lines.append(f"   • Стабильность ирригационной системы")

    lines.append("━" * 45)
    return "\n".join(lines)

# ============================================
# 4. Полный анализ объекта (главная функция)
# ============================================

def analyze_object(obj, show_details=True):
    obj_id = obj.get('id')
    name = obj.get('name', f"Объект №{obj_id}")
    obj_type = obj.get('type', 'неизвестно')
    year_built = obj.get('year_built')
    wear = obj.get('wear_percent', 0)
    condition = obj.get('condition', 'неизвестно')
    risk_score = obj.get('risk_score', 0)
    risk_level = obj.get('risk_level', 'Неизвестно')
    last_inspection = obj.get('last_inspection')
    importance = obj.get('importance', 'неизвестно')
    district = obj.get('district', 'неизвестно')

    age_text = f"{CURRENT_YEAR - year_built} лет" if year_built else "неизвестно"

    if last_inspection:
        try:
            last_date = datetime.fromisoformat(last_inspection)
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
    priority = PRIORITY_MAP.get(risk_level, '❓ НЕИЗВЕСТНО')

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
    recommendations = RECOMMENDATIONS_MAP.get(risk_level, ["❓  Нет данных для рекомендаций"])
    if condition == 'не удов.' and risk_level in ('Высокий', 'Критический'):
        recommendations.append("➕  Объект требует срочного капитального ремонта")

    # Причины риска
    risk_reasons = get_risk_reasons(obj)

    result = {
        'object_id': obj_id,
        'name': name,
        'type': obj_type,
        'age': age_text,
        'wear_percent': wear,
        'condition': condition,
        'risk_score': risk_score,
        'risk_level': risk_level,
        'last_inspection': inspection_text,
        'importance': importance,
        'district': district,
        'priority': priority,
        'recommendations': recommendations,
        'risk_reasons': risk_reasons,
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
        print(f"\n  Risk Score : {risk_score}  [{risk_level}]")
        print(f"\n  {priority}")

        print(f"\n{'─'*45}")
        print(f"⚡  ПРИЧИНЫ РИСКА:")
        for reason in risk_reasons:
            print(f"   {reason}")

        print(f"\n{'─'*45}")
        print(f"📌  РЕКОМЕНДАЦИИ:")
        for rec in recommendations:
            print(f"   {rec}")
        print('─' * 45)

    return result


# ============================================
# 5. Сценарное моделирование — интерактив
# ============================================

def run_scenario(obj):
    print(f"\n📊  Сценарное моделирование для: {obj.get('name', 'объект')}")
    print("  1 — Что будет если НЕ ремонтировать?")
    print("  2 — Что будет ПОСЛЕ ремонта?")
    print("  0 — Назад")
    choice = input("\nВыбери сценарий: ").strip()
    if choice == '1':
        print(scenario_no_repair(obj))
    elif choice == '2':
        print(scenario_after_repair(obj))
    elif choice == '0':
        return
    else:
        print("❌  Неверный выбор")


# ============================================
# 6. Вспомогательные фильтры
# ============================================

def find_object_by_id(objects, obj_id):
    for obj in objects:
        if obj['id'] == obj_id:
            return obj
    return None

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
    print(f"\n✅  Проанализировано {len(high_risk)} объектов")


# ============================================
# 7. Статистика
# ============================================

def show_statistics(objects):
    print("\n" + "="*50)
    print("📊  СТАТИСТИКА")
    print("="*50)
    print(f"Всего объектов: {len(objects)}")

    print("\nПо состоянию:")
    conds = {}
    for o in objects:
        c = o.get('condition', 'неизвестно')
        conds[c] = conds.get(c, 0) + 1
    for c, n in conds.items():
        print(f"  {c}: {n}")

    print("\nПо уровню риска:")
    icons = {'Низкий': '🟢', 'Средний': '🟡', 'Высокий': '🟠', 'Критический': '🔴'}
    levels = {}
    for o in objects:
        lv = o.get('risk_level', 'неизвестно')
        levels[lv] = levels.get(lv, 0) + 1
    for lv, n in levels.items():
        print(f"  {icons.get(lv,'⚪')} {lv}: {n}")

    print("\nПо важности:")
    imps = {}
    for o in objects:
        i = o.get('importance', 'неизвестно')
        imps[i] = imps.get(i, 0) + 1
    for i, n in imps.items():
        print(f"  {i}: {n}")

    print("\nТоп-5 районов:")
    dists = {}
    for o in objects:
        d = o.get('district', 'неизвестно')
        dists[d] = dists.get(d, 0) + 1
    for d, n in sorted(dists.items(), key=lambda x: -x[1])[:5]:
        print(f"  {d}: {n}")
    print("="*50)


# ============================================
# 8. Главное меню
# ============================================

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
    print("Загрузка данных...")
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
                    # Сценарное моделирование
                    print("\n💡  Хочешь запустить сценарное моделирование?  (y/n)")
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
                print(f"\nНайдено {len(filtered)} объектов в районе {district}")
                for obj in filtered:
                    analyze_object(obj, show_details=True)
            else:
                print(f"❌  В районе {district} объектов не найдено")

        elif choice == '3':
            condition = input("Введите состояние (удов. / не удов.): ")
            filtered = filter_by_condition(objects, condition)
            if filtered:
                print(f"\nНайдено {len(filtered)} объектов с состоянием '{condition}'")
                for obj in filtered:
                    analyze_object(obj, show_details=True)
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