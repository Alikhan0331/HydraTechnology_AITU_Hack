import json
import pandas as pd
import numpy as np
from datetime import datetime
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score
import os

CURRENT_DATE = datetime(2026, 6, 25)
CURRENT_YEAR = 2026

CONDITION_MAP = {
    'удов.': 1,
    'не удов.': 2,
}
IMPORTANCE_MAP = {
    'низкая': 1,
    'средняя': 2,
    'высокая': 3,
    'критическая': 4,
}
TYPE_RISK_MAP = {
    'канал': 1,
    'гидропост': 1,
    'шлюз': 3,
    'водозабор': 3,
    'насосная станция': 3,
    'плотина': 4,
    'дамба': 4,
}

def load_objects():
    filepath = os.path.join(os.path.dirname(__file__), 'hydraulic_objects.json')
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def prepare_data(objects):
    """Превращает объекты в DataFrame для ML с полным набором признаков"""
    data = []
    for obj in objects:
        # Возраст объекта
        year_built = obj.get('year_built')
        age = (CURRENT_YEAR - year_built) if year_built else 35

        # Дни с последней инспекции (ключевой признак!)
        last_insp = obj.get('last_inspection')
        if last_insp:
            try:
                insp_dt = datetime.fromisoformat(last_insp)
                days_since = (CURRENT_DATE - insp_dt).days
            except Exception:
                days_since = 365 * 2
        else:
            days_since = 365 * 3  # никогда не проверялось

        # Кодируем категориальные признаки
        condition_num = CONDITION_MAP.get(obj.get('condition'), 1)
        importance_num = IMPORTANCE_MAP.get(obj.get('importance'), 1)
        type_risk = TYPE_RISK_MAP.get(obj.get('type'), 2)

        # Wear fraction (0..1)
        wear = obj.get('wear_percent', 0.5)
        if wear is None:
            wear = 0.5

        # Capacity
        capacity = obj.get('capacity_m3s') or 1.0

        # Длина
        length = obj.get('length_km') or 5.0

        row = {
            'age': age,
            'days_since_inspection': days_since,
            'condition_num': condition_num,
            'importance_num': importance_num,
            'type_risk': type_risk,
            'wear_percent': wear,
            'capacity_m3s': capacity,
            'length_km': length,
            'risk_score': obj.get('risk_score', 50),
        }
        data.append(row)

    df = pd.DataFrame(data)
    return df

def train_model():
    print("=" * 50)
    print("ML МОДЕЛЬ ДЛЯ ПРОГНОЗА RISK SCORE")
    print("=" * 50)

    objects = load_objects()
    df = prepare_data(objects)

    print(f"Объектов для обучения: {len(df)}")

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
    X = df[features]
    y = df['risk_score']

    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)

    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )

    # GradientBoosting лучше улавливает нелинейности risk_engine
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

    # Кросс-валидация для честной оценки
    cv_scores = cross_val_score(model, X_scaled, y, cv=5, scoring='r2')

    print(f"\n📊 Качество модели:")
    print(f"  Mean Absolute Error : {mae:.2f} (баллов из 100)")
    print(f"  R² Score            : {r2:.3f}")
    print(f"  CV R² (5-fold)      : {cv_scores.mean():.3f} ± {cv_scores.std():.3f}")

    print(f"\n📊 Важность признаков:")
    importances = sorted(
        zip(features, model.feature_importances_),
        key=lambda x: -x[1]
    )
    for name, imp in importances:
        bar = "█" * int(imp * 40)
        print(f"  {name:<25} {imp*100:5.1f}%  {bar}")

    # Примеры предсказаний
    print(f"\n🔍 Примеры предсказаний vs реальные:")
    sample_idx = np.random.RandomState(0).choice(len(X_test), min(5, len(X_test)), replace=False)
    y_test_arr = y_test.values
    for i in sample_idx:
        print(f"  реальный={y_test_arr[i]:.1f}  предсказан={y_pred[i]:.1f}  ошибка={abs(y_test_arr[i]-y_pred[i]):.1f}")

    # Сохраняем модель
    os.makedirs('models', exist_ok=True)
    import joblib
    joblib.dump(model, 'models/risk_predictor.joblib')
    joblib.dump(scaler, 'models/scaler.joblib')
    joblib.dump(features, 'models/feature_names.joblib')

    print("\n✅ Модель сохранена в models/")
    return model, scaler

def predict_risk(obj_dict, model=None, scaler=None, features=None):
    """
    Прогнозирует Risk Score для одного объекта.

    obj_dict — словарь с полями объекта (как в hydraulic_objects.json).
    Возвращает float 0..100.
    """
    import joblib

    if model is None:
        model = joblib.load('models/risk_predictor.joblib')
        scaler = joblib.load('models/scaler.joblib')
        features = joblib.load('models/feature_names.joblib')

    # Те же преобразования, что и в prepare_data
    year_built = obj_dict.get('year_built')
    age = (CURRENT_YEAR - year_built) if year_built else 35

    last_insp = obj_dict.get('last_inspection')
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
        'condition_num': CONDITION_MAP.get(obj_dict.get('condition'), 1),
        'importance_num': IMPORTANCE_MAP.get(obj_dict.get('importance'), 1),
        'type_risk': TYPE_RISK_MAP.get(obj_dict.get('type'), 2),
        'wear_percent': obj_dict.get('wear_percent') or 0.5,
        'capacity_m3s': obj_dict.get('capacity_m3s') or 1.0,
        'length_km': obj_dict.get('length_km') or 5.0,
    }

    X = [[row[f] for f in features]]
    X_scaled = scaler.transform(X)
    prediction = model.predict(X_scaled)[0]
    return round(float(np.clip(prediction, 0, 100)), 2)

if __name__ == "__main__":
    train_model()