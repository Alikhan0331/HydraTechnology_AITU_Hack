import json
import os
from datetime import datetime
import joblib
import numpy as np

# ============================================
# Конфигурация
# ============================================

CURRENT_DATE = datetime(2026, 6, 25)
CURRENT_YEAR = 2026

CONDITION_MAP = {'удов.': 1, 'не удов.': 2}
IMPORTANCE_MAP = {'низкая': 1, 'средняя': 2, 'высокая': 3, 'критическая': 4}
TYPE_RISK_MAP = {
    'канал': 1, 'гидропост': 1,
    'шлюз': 3, 'водозабор': 3, 'насосная станция': 3,
    'плотина': 4, 'дамба': 4,
}

# ============================================
# Загрузка ML модели
# ============================================

MODEL = None
SCALER = None
FEATURES = None

def load_ml_model():
    """Загружает ML модель для прогноза"""
    global MODEL, SCALER, FEATURES
    if MODEL is None:
        try:
            MODEL = joblib.load('models/risk_predictor.joblib')
            SCALER = joblib.load('models/scaler.joblib')
            FEATURES = joblib.load('models/feature_names.joblib')
            print("✅ ML модель загружена")
        except Exception as e:
            print(f"⚠️ ML модель не загружена: {e}")
            return None, None, None
    return MODEL, SCALER, FEATURES

def predict_risk_ml(obj):
    """Прогнозирует Risk Score через ML модель"""
    model, scaler, features = load_ml_model()
    if model is None:
        return obj.get('risk_score', 50)
    
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
    
    row = {
        'age': age,
        'days_since_inspection': days_since,
        'condition_num': CONDITION_MAP.get(obj.get('condition'), 1),
        'importance_num': IMPORTANCE_MAP.get(obj.get('importance'), 1),
        'type_risk': TYPE_RISK_MAP.get(obj.get('type'), 2),
        'wear_percent': obj.get('wear_percent') or 0.5,
        'capacity_m3s': obj.get('capacity_m3s') or 1.0,
        'length_km': obj.get('length_km') or 5.0,
    }
    
    X = [[row[f] for f in features]]
    X_scaled = scaler.transform(X)
    prediction = model.predict(X_scaled)[0]
    return round(float(np.clip(prediction, 0, 100)), 2)

def get_risk_level(score):
    """Определяет уровень риска по числовому значению"""
    if score <= 25:
        return 'Низкий'
    elif score <= 50:
        return 'Средний'
    elif score <= 75:
        return 'Высокий'
    else:
        return 'Критический'

# ============================================
# Загрузка данных
# ============================================

def load_objects():
    filepath = os.path.join(os.path.dirname(__file__), 'hydraulic_objects.json')
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

# ============================================
# Анализ объекта
# ============================================

def analyze_object(obj_id, objects=None, use_ml=True):
    """Анализирует объект, показывает текущий риск и ML прогноз"""
    if objects is None:
        objects = load_objects()
    
    obj = next((o for o in objects if o['id'] == obj_id), None)
    if not obj:
        return f"Объект с ID {obj_id} не найден"
    
    # Текущий риск из датасета
    current_risk = obj.get('risk_score', 0)
    current_level = obj.get('risk_level', 'Неизвестно')
    
    # ML прогноз
    ml_risk = None
    ml_level = None
    if use_ml:
        try:
            ml_risk = predict_risk_ml(obj)
            ml_level = get_risk_level(ml_risk)
        except Exception as e:
            print(f"⚠️ Ошибка ML: {e}")
            ml_risk = current_risk
            ml_level = current_level
    
    # Извлекаем данные для вывода
    obj_id = obj.get('id')
    name = obj.get('name', f"Объект №{obj_id}")
    obj_type = obj.get('type', 'неизвестно')
    year_built = obj.get('year_built')
    wear = obj.get('wear_percent', 0.3)
    condition = obj.get('condition', 'неизвестно')
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
    
    # Определяем приоритет и рекомендации на основе ML уровня (если есть)
    risk_level_for_rec = ml_level if ml_level else current_level
    
    recommendations = []
    priority = ""
    
    if risk_level_for_rec == 'Критический':
        priority = "🚨 КРИТИЧЕСКИЙ ПРИОРИТЕТ"
        recommendations = [
            "1️⃣ НЕМЕДЛЕННО провести внеочередное обследование (в течение 7 дней)",
            "2️⃣ Ограничить эксплуатацию объекта до выяснения причин",
            "3️⃣ Подготовить план аварийно-восстановительных работ",
            "4️⃣ Уведомить руководство и аварийные службы"
        ]
        if condition == 'не удов.':
            recommendations.append("5️⃣ Объект требует срочного капитального ремонта")
    
    elif risk_level_for_rec == 'Высокий':
        priority = "⚠️ ВЫСОКИЙ ПРИОРИТЕТ"
        recommendations = [
            "1️⃣ Запланировать обследование в течение 1 месяца",
            "2️⃣ Провести детальный анализ конструктивных элементов",
            "3️⃣ Разработать план ремонтных работ на 2026-2027 годы",
            "4️⃣ Усилить мониторинг состояния объекта"
        ]
        if wear and wear > 0.5:
            recommendations.append("5️⃣ Высокий износ — рекомендована замена оборудования")
    
    elif risk_level_for_rec == 'Средний':
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
    
    # Вывод
    print(f"\n--- Анализ объекта №{obj_id} ---")
    print(f"Название: {name}")
    print(f"Тип: {obj_type}")
    print(f"Район: {district}")
    print(f"Важность: {importance}")
    print(f"Возраст: {age_text}")
    print(f"Износ: {wear * 100:.1f}%")
    print(f"Состояние: {condition}")
    print(f"Последний осмотр: {inspection_text}")
    print("-" * 40)
    print(f"📊 Risk Score (из датасета): {current_risk} → {current_level}")
    if ml_risk is not None:
        print(f"📊 Risk Score (ML прогноз):   {ml_risk} → {ml_level}")
        if ml_level != current_level:
            print(f"⚠️ РАСХОЖДЕНИЕ: ML модель определила риск выше!")
    print("-" * 40)
    print(f"\n{priority}")
    for rec in recommendations:
        print(f"  {rec}")
    print("-" * 40)
    
    return obj

# ============================================
# Прогноз для всех объектов
# ============================================

def predict_all_objects():
    """Прогнозирует риск для всех объектов и выводит статистику"""
    print("\n" + "="*50)
    print("📊 ПРОГНОЗ ДЛЯ ВСЕХ ОБЪЕКТОВ (ML)")
    print("="*50)
    
    objects = load_objects()
    results = []
    
    for obj in objects:
        try:
            ml_risk = predict_risk_ml(obj)
            ml_level = get_risk_level(ml_risk)
            current_risk = obj.get('risk_score', 0)
            current_level = obj.get('risk_level', 'Неизвестно')
            
            obj['ml_risk_score'] = ml_risk
            obj['ml_risk_level'] = ml_level
            results.append(obj)
            
        except Exception as e:
            print(f"⚠️ Ошибка для объекта {obj.get('id')}: {e}")
    
    print(f"\n✅ Прогноз выполнен для {len(results)} объектов")
    
    # Сравнение уровней риска
    current_levels = {'Низкий': 0, 'Средний': 0, 'Высокий': 0, 'Критический': 0}
    ml_levels = {'Низкий': 0, 'Средний': 0, 'Высокий': 0, 'Критический': 0}
    differences = []
    diff_details = []
    
    for obj in results:
        current = obj.get('risk_level', 'Средний')
        ml = obj.get('ml_risk_level', 'Средний')
        current_levels[current] = current_levels.get(current, 0) + 1
        ml_levels[ml] = ml_levels.get(ml, 0) + 1
        if current != ml:
            differences.append({
                'id': obj['id'],
                'name': obj['name'],
                'current': current,
                'ml': ml
            })
            diff_details.append({
                'id': obj['id'],
                'name': obj['name'],
                'current_risk': obj.get('risk_score', 0),
                'ml_risk': obj.get('ml_risk_score', 0),
                'current_level': current,
                'ml_level': ml
            })
    
    print("\n📊 Сравнение уровней риска:")
    print("  Текущий (формула)  |  ML прогноз")
    print("  -------------------+-------------")
    for level in ['Низкий', 'Средний', 'Высокий', 'Критический']:
        print(f"  {level:<18} | {current_levels.get(level, 0):>6}  ->  {ml_levels.get(level, 0):>6}")
    
    print(f"\n📊 Обнаружено расхождений: {len(differences)} объектов")
    if differences:
        print("\n  Объекты с расхождениями:")
        for d in differences[:10]:
            print(f"    ID {d['id']}: {d['name']} — было {d['current']}, стало {d['ml']}")
        
        # Детали по расхождениям
        print("\n📊 Детали расхождений:")
        for d in diff_details[:5]:
            print(f"  ID {d['id']}: {d['name']}")
            print(f"    Текущий: {d['current_risk']:.1f} → {d['current_level']}")
            print(f"    ML:      {d['ml_risk']:.1f} → {d['ml_level']}")
    
    return results

# ============================================
# Главное меню
# ============================================

def show_menu():
    print("\n" + "="*50)
    print("🤖 AI-ДИСПЕТЧЕР (С ML МОДЕЛЬЮ)")
    print("="*50)
    print("1️⃣ Анализ объекта по ID")
    print("2️⃣ Прогноз для всех объектов")
    print("3️⃣ Выход")
    print("="*50)

def main():
    print("="*50)
    print("🤖 AI-ДИСПЕТЧЕР")
    print("="*50)
    
    try:
        load_ml_model()
    except:
        print("⚠️ ML модель не загружена, используем данные")
    
    objects = load_objects()
    print(f"Загружено {len(objects)} объектов\n")
    
    while True:
        show_menu()
        choice = input("\nВыбери действие: ").strip()
        
        if choice == '1':
            try:
                obj_id = int(input("Введите ID объекта: "))
                analyze_object(obj_id, objects)
            except ValueError:
                print("❌ Введи число!")
        
        elif choice == '2':
            predict_all_objects()
        
        elif choice == '3':
            print("👋 Выход...")
            break
        
        else:
            print("❌ Неверный выбор!")

if __name__ == "__main__":
    main()