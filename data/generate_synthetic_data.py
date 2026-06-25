import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score
import os
import joblib

CURRENT_DATE = datetime(2026, 6, 25)
CURRENT_YEAR = 2026

CONDITION_MAP = {'удов.': 1, 'не удов.': 2}
IMPORTANCE_MAP = {'низкая': 1, 'средняя': 2, 'высокая': 3, 'критическая': 4}
TYPE_RISK_MAP = {
    'канал': 1, 'гидропост': 1,
    'шлюз': 3, 'водозабор': 3, 'насосная станция': 3,
    'плотина': 4, 'дамба': 4,
}

# Веса из risk_engine.py
W_AGE = 22
W_CONDITION = 38
W_WEAR = 18
W_EFFICIENCY = 12
W_INSPECTION = 10

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
    Генерирует синтетические данные на основе распределения реальных.
    Формула risk_score соответствует логике risk_engine.py.
    """
    real_data = []
    for obj in real_objects:
        if obj.get('year_built') is None:
            continue
        real_data.append({
            'year_built': obj['year_built'],
            'wear_percent': obj.get('wear_percent', 0.5) or 0.5,
            'capacity_m3s': obj.get('capacity_m3s', 1.0) or 1.0,
            'length_km': obj.get('length_km', 5.0) or 5.0,
        })

    df_real = pd.DataFrame(real_data)

    stats = {
        'year_built_mean': df_real['year_built'].mean(),
        'year_built_std': df_real['year_built'].std(),
        'wear_mean': df_real['wear_percent'].mean(),
        'wear_std': df_real['wear_percent'].std(),
        'capacity_mean': df_real['capacity_m3s'].mean(),
        'capacity_std': df_real['capacity_m3s'].std(),
        'length_mean': df_real['length_km'].mean(),
        'length_std': df_real['length_km'].std(),
    }

    print("📊 Статистика реальных данных (только для генерации):")
    for key, val in stats.items():
        print(f"  {key}: {val:.2f}")

    rng = np.random.RandomState(42)
    synthetic_data = []

    for i in range(n_samples):
        # Числовые признаки
        year_built = int(rng.normal(stats['year_built_mean'], stats['year_built_std']))
        year_built = max(1900, min(2025, year_built))
        age = CURRENT_YEAR - year_built

        wear = rng.normal(stats['wear_mean'], stats['wear_std'])
        wear = round(max(0.0, min(1.0, wear)), 3)

        capacity = rng.normal(stats['capacity_mean'], stats['capacity_std'])
        capacity = round(max(0.1, capacity), 2)

        length = rng.normal(stats['length_mean'], stats['length_std'])
        length = round(max(0.1, length), 2)

        # Категориальные признаки (пропорции из реальных данных)
        condition = rng.choice(['удов.', 'не удов.'], p=[0.73, 0.27])
        importance = rng.choice(
            ['низкая', 'средняя', 'высокая', 'критическая'],
            p=[0.64, 0.30, 0.034, 0.026]
        )
        type_ = rng.choice(
            ['канал', 'гидропост', 'шлюз', 'водозабор', 'насосная станция', 'плотина', 'дамба'],
            p=[0.50, 0.10, 0.10, 0.10, 0.08, 0.06, 0.06]
        )

        # Дни с последней инспекции
        days_since = int(rng.exponential(400))
        days_since = max(0, min(days_since, 365 * 5))

        # ── Risk Score по логике risk_engine.py ──
        age_f = min(age / 70, 1.0)
        cond_f = (CONDITION_MAP[condition] - 1) / 1.0  # 0 или 1 → 0..1
        wear_f = wear
        eff_f = 0.0  # efficiency не генерируем
        insp_f = min(days_since / (5 * 365), 1.0)

        score = (
            W_AGE * age_f
            + W_CONDITION * cond_f
            + W_WEAR * wear_f
            + W_EFFICIENCY * eff_f
            + W_INSPECTION * insp_f
        )

        # Бонус за значимость (как в risk_engine)
        if importance == 'критическая':
            score = min(100.0, score * 1.12)
        elif importance == 'высокая':
            score = min(100.0, score * 1.05)

        # Небольшой шум (±3 балла)
        score += rng.normal(0, 3)
        score = round(max(5.0, min(95.0, score)), 2)

        # Risk level
        if score < 25:
            risk_level = 'Низкий'
        elif score < 50:
            risk_level = 'Средний'
        elif score < 75:
            risk_level = 'Высокий'
        else:
            risk_level = 'Критический'

        synthetic_data.append({
            'year_built': year_built,
            'age': age,
            'wear_percent': wear,
            'capacity_m3s': capacity,
            'length_km': length,
            'days_since_inspection': days_since,
            'condition': condition,
            'condition_num': CONDITION_MAP[condition],
            'importance': importance,
            'importance_num': IMPORTANCE_MAP[importance],
            'type': type_,
            'type_risk': TYPE_RISK_MAP.get(type_, 2),
            'risk_score': score,
            'risk_level': risk_level,
        })

    df_synthetic = pd.DataFrame(synthetic_data)
    print(f"\n✅ Сгенерировано {len(df_synthetic)} синтетических объектов")
    return df_synthetic

# ============================================
# 3. Обучение ML модели на синтетических данных
# ============================================

def train_model(df_synthetic):
    print("\n" + "=" * 50)
    print("🧠 ОБУЧЕНИЕ ML МОДЕЛИ НА СИНТЕТИКЕ")
    print("=" * 50)

    features = [
        'age',
        'days_since_inspection',
        'condition_num',
        'importance_num',
        'type_risk',
        'wear_percent',
        'capacity_m3s',
        'length_km',
    ]

    X = df_synthetic[features]
    y = df_synthetic['risk_score']

    print(f"Объектов для обучения: {len(df_synthetic)} (все синтетические)")

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )

    model = GradientBoostingRegressor(
        n_estimators=200,
        max_depth=4,
        learning_rate=0.05,
        subsample=0.8,
        random_state=42,
    )
    model.fit(X_train, y_train)

    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    cv_scores = cross_val_score(model, X_scaled, y, cv=5, scoring='r2')

    print(f"\n📊 Качество модели:")
    print(f"  MAE             : {mae:.2f} (баллов из 100)")
    print(f"  R² Score        : {r2:.3f}")
    print(f"  CV R² (5-fold)  : {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

    print(f"\n📊 Важность признаков:")
    importances = sorted(zip(features, model.feature_importances_), key=lambda x: -x[1])
    for name, imp in importances:
        bar = "█" * int(imp * 40)
        print(f"  {name:<25} {imp*100:5.1f}%  {bar}")

    os.makedirs('models', exist_ok=True)
    joblib.dump(model, 'models/risk_predictor.joblib')
    joblib.dump(scaler, 'models/scaler.joblib')
    joblib.dump(features, 'models/feature_names.joblib')

    print("\n✅ Модель сохранена в models/")
    return model, scaler

# ============================================
# 4. Сохранение синтетических данных
# ============================================

def save_synthetic_data(df_synthetic):
    data = df_synthetic.to_dict('records')
    filepath = os.path.join(os.path.dirname(__file__), 'synthetic_objects.json')
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)
    print(f"\n✅ Синтетические данные сохранены в {filepath}")

# ============================================
# 5. Главная функция
# ============================================

def main():
    print("=" * 50)
    print("🚀 ГЕНЕРАЦИЯ ДАННЫХ И ОБУЧЕНИЕ ML МОДЕЛИ")
    print("=" * 50)

    print("\n📂 Загрузка реальных данных для статистики...")
    real_objects = load_real_objects()
    print(f"Реальных объектов: {len(real_objects)}")

    print("\n🔄 Генерация синтетических данных...")
    df_synthetic = generate_synthetic_data(real_objects, n_samples=10000)

    save_synthetic_data(df_synthetic)

    model, scaler = train_model(df_synthetic)

    print("\n" + "=" * 50)
    print("🎯 ИТОГОВЫЙ РЕЗУЛЬТАТ")
    print("=" * 50)
    print(f"  Обучено на: {len(df_synthetic)} синтетических объектах")
    print(f"  Модель готова к использованию через ml_model.py → predict_risk()")

if __name__ == "__main__":
    main()