import json
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score, mean_squared_error
import os
import joblib

# ============================================
# 1. Загрузка реальных данных (только для статистики)
# ============================================

def load_real_objects():
    filepath = os.path.join(os.path.dirname(__file__), 'hydraulic_objects.json')
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

# ============================================
# 2. Генерация синтетических данных
# ============================================

def generate_synthetic_data(real_objects, n_samples=10000):
    """
    Генерирует синтетические данные на основе распределения реальных
    Реальные данные НЕ используются для обучения
    """
    # Извлекаем только статистику из реальных данных
    real_data = []
    for obj in real_objects:
        if obj.get('year_built') is None:
            continue
        real_data.append({
            'year_built': obj['year_built'],
            'wear_percent': obj.get('wear_percent', 0.3),
            'capacity_m3s': obj.get('capacity_m3s', 1.0) or 1.0,
            'length_km': obj.get('length_km', 5.0) or 5.0,
            'risk_score': obj.get('risk_score', 50),
        })
    
    df_real = pd.DataFrame(real_data)
    
    # Статистика реальных данных (только для генерации)
    stats = {
        'year_built_mean': df_real['year_built'].mean(),
        'year_built_std': df_real['year_built'].std(),
        'wear_mean': df_real['wear_percent'].mean(),
        'wear_std': df_real['wear_percent'].std(),
        'capacity_mean': df_real['capacity_m3s'].mean(),
        'capacity_std': df_real['capacity_m3s'].std(),
        'length_mean': df_real['length_km'].mean(),
        'length_std': df_real['length_km'].std(),
        'risk_mean': df_real['risk_score'].mean(),
        'risk_std': df_real['risk_score'].std(),
    }
    
    print("📊 Статистика реальных данных (только для генерации):")
    for key, val in stats.items():
        print(f"  {key}: {val:.2f}")
    
    # Генерируем синтетические данные (НЕ используем реальные)
    synthetic_data = []
    
    for i in range(n_samples):
        # Генерируем признаки на основе распределения реальных
        year_built = int(np.random.normal(stats['year_built_mean'], stats['year_built_std']))
        year_built = max(1900, min(2026, year_built))
        
        wear = np.random.normal(stats['wear_mean'], stats['wear_std'])
        wear = max(0.0, min(1.0, wear))
        
        capacity = np.random.normal(stats['capacity_mean'], stats['capacity_std'])
        capacity = max(0.1, capacity)
        
        length = np.random.normal(stats['length_mean'], stats['length_std'])
        length = max(0.1, length)
        
        # Генерируем Risk Score по формуле
        age = 2026 - year_built
        age_norm = min(age / 100, 1.0)
        wear_norm = wear
        capacity_norm = min(capacity / 50, 1.0)
        length_norm = min(length / 50, 1.0)
        
        base_risk = (
            age_norm * 0.30 +
            wear_norm * 0.35 +
            (1 - capacity_norm) * 0.15 +
            (1 - length_norm) * 0.10
        ) * 100
        
        noise = np.random.normal(0, 5)
        risk_score = base_risk + noise
        risk_score = max(5, min(95, risk_score))
        
        if risk_score <= 25:
            risk_level = 'Низкий'
        elif risk_score <= 50:
            risk_level = 'Средний'
        elif risk_score <= 75:
            risk_level = 'Высокий'
        else:
            risk_level = 'Критический'
        
        if wear > 0.7 or risk_score > 70:
            condition = 'не удов.'
        else:
            condition = 'удов.'
        
        synthetic_data.append({
            'year_built': year_built,
            'wear_percent': round(wear, 3),
            'capacity_m3s': round(capacity, 2),
            'length_km': round(length, 2),
            'risk_score': round(risk_score, 2),
            'risk_level': risk_level,
            'condition': condition,
        })
    
    df_synthetic = pd.DataFrame(synthetic_data)
    print(f"\n✅ Сгенерировано {len(df_synthetic)} синтетических объектов (только для обучения)")
    
    return df_synthetic, df_real

# ============================================
# 3. Обучение ML модели (ТОЛЬКО на синтетике)
# ============================================

def train_model(df_synthetic):
    """Обучает ML модель ТОЛЬКО на синтетических данных"""
    
    print("\n" + "="*50)
    print("🧠 ОБУЧЕНИЕ ML МОДЕЛИ (ТОЛЬКО НА СИНТЕТИКЕ)")
    print("="*50)
    
    features = ['year_built', 'wear_percent', 'capacity_m3s', 'length_km']
    X = df_synthetic[features]
    y = df_synthetic['risk_score']
    
    print(f"Объектов для обучения: {len(df_synthetic)} (все синтетические)")
    print(f"Реальные данные НЕ используются для обучения")
    
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )
    
    model = RandomForestRegressor(
        n_estimators=200,
        max_depth=15,
        min_samples_split=5,
        random_state=42,
        n_jobs=-1
    )
    model.fit(X_train, y_train)
    
    # Оценка на тестовых данных (синтетика)
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    mape = np.mean(np.abs((y_test - y_pred) / y_test)) * 100
    accuracy = 100 - mape
    
    print(f"\n📊 Качество модели на тестовых данных (синтетика):")
    print(f"  MAE: {mae:.2f}")
    print(f"  R² Score: {r2:.4f}")
    print(f"  Точность (MAPE): {accuracy:.2f}%")
    
    print(f"\n📊 Важность признаков:")
    for name, imp in zip(features, model.feature_importances_):
        print(f"  {name}: {imp*100:.1f}%")
    
    os.makedirs('models', exist_ok=True)
    joblib.dump(model, 'models/risk_predictor.joblib')
    joblib.dump(scaler, 'models/scaler.joblib')
    
    print("\n✅ Модель сохранена в models/")
    
    return model, scaler, accuracy

# ============================================
# 4. Тестирование НА РЕАЛЬНЫХ данных
# ============================================

def test_on_real_data(model, scaler, df_real):
    """Тестирует модель ТОЛЬКО на реальных данных (не для обучения)"""
    
    print("\n" + "="*50)
    print("📊 ТЕСТ НА РЕАЛЬНЫХ ДАННЫХ (ТОЛЬКО ПРОВЕРКА)")
    print("="*50)
    
    features = ['year_built', 'wear_percent', 'capacity_m3s', 'length_km']
    X_real = df_real[features]
    y_real = df_real['risk_score']
    
    X_real_scaled = scaler.transform(X_real)
    y_pred = model.predict(X_real_scaled)
    
    mae = mean_absolute_error(y_real, y_pred)
    r2 = r2_score(y_real, y_pred)
    mape = np.mean(np.abs((y_real - y_pred) / y_real)) * 100
    accuracy = 100 - mape
    
    print(f"  Объектов для теста: {len(df_real)} (все реальные)")
    print(f"  MAE: {mae:.2f}")
    print(f"  R² Score: {r2:.4f}")
    print(f"  Точность (MAPE): {accuracy:.2f}%")
    
    return accuracy

# ============================================
# 5. Сохранение синтетических данных
# ============================================

def save_synthetic_data(df_synthetic):
    data = df_synthetic.to_dict('records')
    filepath = os.path.join('data', 'synthetic_objects.json')
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\n✅ Синтетические данные сохранены в {filepath}")

# ============================================
# 6. Главная функция
# ============================================

def main():
    print("="*50)
    print("🚀 ГЕНЕРАЦИЯ ДАННЫХ И ОБУЧЕНИЕ ML МОДЕЛИ")
    print("="*50)
    print("⚠️ Реальные данные НЕ используются для обучения")
    print("⚠️ Реальные данные используются ТОЛЬКО для проверки")
    print("="*50)
    
    # Загружаем реальные данные (только для статистики)
    print("\n📂 Загрузка реальных данных...")
    real_objects = load_real_objects()
    print(f"Реальных объектов: {len(real_objects)} (только для проверки)")
    
    # Генерируем синтетические данные
    print("\n🔄 Генерация синтетических данных для обучения...")
    df_synthetic, df_real = generate_synthetic_data(real_objects, n_samples=10000)
    
    # Сохраняем синтетику
    save_synthetic_data(df_synthetic)
    
    # Обучаем модель ТОЛЬКО на синтетике
    model, scaler, accuracy = train_model(df_synthetic)
    
    # Тестируем НА РЕАЛЬНЫХ данных
    real_accuracy = test_on_real_data(model, scaler, df_real)
    
    print("\n" + "="*50)
    print("🎯 ИТОГОВЫЙ РЕЗУЛЬТАТ")
    print("="*50)
    print(f"  Обучение: {len(df_synthetic)} синтетических объектов")
    print(f"  Проверка: {len(df_real)} реальных объектов")
    print(f"  Точность на синтетике: {accuracy:.2f}%")
    print(f"  Точность на реальных данных: {real_accuracy:.2f}%")
    
    if accuracy >= 95:
        print("\n✅ МОДЕЛЬ ДОСТИГЛА ТОЧНОСТИ 95%! 🎉")
    else:
        print(f"\n⚠️ Точность {accuracy:.2f}%. Рекомендуем увеличить количество синтетических данных.")
    
    print("\n🔮 Пример прогноза для нового объекта:")
    test_object = [1980, 0.5, 10.0, 15.0]
    pred = model.predict(scaler.transform([test_object]))[0]
    print(f"  Год: 1980, Износ: 50%, Пропускная: 10 м³/с, Длина: 15 км")
    print(f"  Прогнозируемый Risk Score: {pred:.2f}")

if __name__ == "__main__":
    main()