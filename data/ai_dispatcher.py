import json
import os
from datetime import datetime

# 1. Загрузка данных

def load_objects():
    filepath = os.path.join(os.path.dirname(__file__), 'hydraulic_objects.json')
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

# 2. AI-анализ одного объекта

def analyze_object(obj, show_details=True):
    """Анализирует один объект и возвращает результат"""
    
    obj_id = obj.get('id')
    name = obj.get('name', f"Объект №{obj_id}")
    obj_type = obj.get('type', 'неизвестно')
    year_built = obj.get('year_built')
    wear = obj.get('wear_percent', 0.3)
    condition = obj.get('condition', 'неизвестно')
    risk_score = obj.get('risk_score', 0)
    risk_level = obj.get('risk_level', 'Неизвестно')
    last_inspection = obj.get('last_inspection')
    importance = obj.get('importance', 'неизвестно')
    district = obj.get('district', 'неизвестно')
    
    if year_built:
        age = 2026 - year_built
        age_text = f"{age} лет"
    else:
        age_text = "неизвестно"
    
    if last_inspection:
        try:
            last_date = datetime.fromisoformat(last_inspection)
            days_since = (datetime.now() - last_date).days
            if days_since < 365:
                inspection_text = f"{days_since} дней назад"
            else:
                inspection_text = f"{days_since // 365} лет назад"
        except:
            inspection_text = "неизвестно"
    else:
        inspection_text = "нет данных"
    
    recommendations = []
    priority = ""
    
    if risk_level == 'Критический':
        priority = "🚨 КРИТИЧЕСКИЙ ПРИОРИТЕТ"
        recommendations = [
            "1️⃣ НЕМЕДЛЕННО провести внеочередное обследование (в течение 7 дней)",
            "2️⃣ Ограничить эксплуатацию объекта до выяснения причин",
            "3️⃣ Подготовить план аварийно-восстановительных работ",
            "4️⃣ Уведомить руководство и аварийные службы"
        ]
        if condition == 'не удов.':
            recommendations.append("5️⃣ Объект требует срочного капитального ремонта")
    
    elif risk_level == 'Высокий':
        priority = "⚠️ ВЫСОКИЙ ПРИОРИТЕТ"
        recommendations = [
            "1️⃣ Запланировать обследование в течение 1 месяца",
            "2️⃣ Провести детальный анализ конструктивных элементов",
            "3️⃣ Разработать план ремонтных работ на 2026-2027 годы",
            "4️⃣ Усилить мониторинг состояния объекта"
        ]
        if wear and wear > 0.5:
            recommendations.append("5️⃣ Высокий износ — рекомендована замена оборудования")
    
    elif risk_level == 'Средний':
        priority = "📋 СРЕДНИЙ ПРИОРИТЕТ"
        recommendations = [
            "1️⃣ Провести плановый осмотр в течение 3-6 месяцев",
            "2️⃣ Продолжить штатную эксплуатацию",
            "3️⃣ Обновить данные в паспорте объекта"
        ]
    
    else:
        priority = "✅ НИЗКИЙ ПРИОРИТЕТ"
        recommendations = [
            "1️⃣ Плановый осмотр через 12 месяцев",
            "2️⃣ Продолжить штатную эксплуатацию",
            "3️⃣ Регулярное обновление документации"
        ]
    
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
        'recommendations': recommendations
    }
    
    if show_details:
        print(f"\n--- Анализ объекта №{obj_id} ---")
        print(f"Название: {name}")
        print(f"Тип: {obj_type}")
        print(f"Район: {district}")
        print(f"Важность: {importance}")
        print(f"Возраст: {age_text}")
        print(f"Износ: {wear * 100:.1f}%")
        print(f"Состояние: {condition}")
        print(f"Risk Score: {risk_score}")
        print(f"Уровень риска: {risk_level}")
        print(f"Последний осмотр: {inspection_text}")
        print(f"\n{priority}")
        for rec in recommendations:
            print(f"  {rec}")
        print("-" * 40)
    
    return result

# 3. Поиск объекта по ID

def find_object_by_id(objects, obj_id):
    for obj in objects:
        if obj['id'] == obj_id:
            return obj
    return None

# 4. Фильтр по району

def filter_by_district(objects, district):
    return [obj for obj in objects if obj.get('district', '').lower() == district.lower()]

# 5. Фильтр по состоянию

def filter_by_condition(objects, condition):
    return [obj for obj in objects if obj.get('condition', '').lower() == condition.lower()]

# 6. Фильтр по уровню риска

def filter_by_risk(objects, risk_level):
    return [obj for obj in objects if obj.get('risk_level', '') == risk_level]

# 7. Анализ всех объектов с высоким риском

def analyze_high_risk(objects):
    print("\n" + "="*50)
    print("🔴 АНАЛИЗ ОБЪЕКТОВ С ВЫСОКИМ РИСКОМ")
    print("="*50)
    
    high_risk = filter_by_risk(objects, 'Высокий')
    print(f"Найдено объектов с высоким риском: {len(high_risk)}\n")
    
    for obj in high_risk:
        analyze_object(obj, show_details=True)
    
    print(f"\n✅ Проанализировано {len(high_risk)} объектов с высоким риском")

# 8. Главное меню

def show_menu():
    print("\n" + "="*50)
    print("🤖 AI-ДИСПЕТЧЕР")
    print("="*50)
    print("1️⃣ Анализ объекта по ID")
    print("2️⃣ Анализ объектов по району")
    print("3️⃣ Анализ объектов по состоянию")
    print("4️⃣ Анализ всех объектов с высоким риском")
    print("5️⃣ Показать статистику")
    print("0️⃣ Выход")
    print("="*50)

# 9. Статистика

def show_statistics(objects):
    print("\n" + "="*50)
    print("📊 СТАТИСТИКА")
    print("="*50)
    print(f"Всего объектов: {len(objects)}")
    
    conditions = {}
    for obj in objects:
        cond = obj.get('condition', 'неизвестно')
        conditions[cond] = conditions.get(cond, 0) + 1
    
    print("\nПо состоянию:")
    for cond, count in conditions.items():
        print(f"  {cond}: {count}")
    
    risk_levels = {}
    for obj in objects:
        level = obj.get('risk_level', 'неизвестно')
        risk_levels[level] = risk_levels.get(level, 0) + 1
    
    print("\nПо уровню риска:")
    for level, count in risk_levels.items():
        color = {'Низкий': '🟢', 'Средний': '🟡', 'Высокий': '🟠', 'Критический': '🔴'}.get(level, '⚪')
        print(f"  {color} {level}: {count}")
    
    importance_levels = {}
    for obj in objects:
        imp = obj.get('importance', 'неизвестно')
        importance_levels[imp] = importance_levels.get(imp, 0) + 1
    
    print("\nПо влажности:")
    for imp, count in importance_levels.items():
        print(f"  {imp}: {count}")
    
    districts = {}
    for obj in objects: 
        dist = obj.get('district', 'неизвестно')
        districts[dist] = districts.get(dist, 0) + 1
    
    print("\nПо районам:")
    for dist, count in sorted(districts.items(), key=lambda x: x[1], reverse=True)[:5]:
        print(f"  {dist}: {count}")
    print("="*50)

# 10. Основной цикл

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
                else:
                    print(f"❌ Объект с ID {obj_id} не найден")
            except ValueError:
                print("❌ Введи число!")
        
        elif choice == '2':
            district = input("Введите название района: ")
            filtered = filter_by_district(objects, district)
            if filtered:
                print(f"\nНайдено {len(filtered)} объектов в районе {district}")
                for obj in filtered:
                    analyze_object(obj, show_details=True)
            else:
                print(f"❌ В районе {district} объектов не найдено")
        
        elif choice == '3':
            condition = input("Введите состояние (удов. / не удов.): ")
            filtered = filter_by_condition(objects, condition)
            if filtered:
                print(f"\nНайдено {len(filtered)} объектов с состоянием {condition}")
                for obj in filtered:
                    analyze_object(obj, show_details=True)
            else:
                print(f"❌ Объектов с состоянием {condition} не найдено")
        
        elif choice == '4':
            analyze_high_risk(objects)
        
        elif choice == '5':
            show_statistics(objects)
        
        elif choice == '0':
            print("👋 Выход...")
            break
        
        else:
            print("❌ Неверный выбор!")

if __name__ == "__main__":
    main()