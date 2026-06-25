import json
import pandas as pd
import numpy as np
from sklearn.ensemble import RandomForestRegressor
from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler
from sklearn.metrics import mean_absolute_error, r2_score
import os

def load_objects():
    filepath = os.path.join(os.path.dirname(__file__), 'hydraulic_objects.json')
    with open(filepath, 'r', encoding='utf-8') as f:
        return json.load(f)

def prepare_data(objects):
    """Превращает объекты в DataFrame для ML"""
    
    data = []
    for obj in objects:
        # Пропускаем объекты без года постройки
        if obj.get('year_built') is None:
            continue
            
        row = {
            'year_built': obj.get('year_built', 1950),
            'wear_percent': obj.get('wear_percent', 0.3),
            'capacity_m3s': obj.get('capacity_m3s', 1.0) or 1.0,
            'length_km': obj.get('length_km', 5.0) or 5.0,
            'risk_score': obj.get('risk_score', 50),
        }
        data.append(row)
    
    df = pd.DataFrame(data)
    return df

def train_model():
    print("="*50)
    print("ML МОДЕЛЬ ДЛЯ ПРОГНОЗА RISK SCORE")
    print("="*50)
    
    # Загружаем данные
    objects = load_objects()
    df = prepare_data(objects)
    
    print(f"Объектов для обучения: {len(df)}")
    
    # Признаки (X) и цель (y)
    features = ['year_built', 'wear_percent', 'capacity_m3s', 'length_km']
    X = df[features]
    y = df['risk_score']
    
    # Масштабируем признаки
    scaler = StandardScaler()
    X_scaled = scaler.fit_transform(X)
    
    # Обучающая и тестовая выборки
    X_train, X_test, y_train, y_test = train_test_split(
        X_scaled, y, test_size=0.2, random_state=42
    )
    
    # Обучаем Random Forest
    model = RandomForestRegressor(
        n_estimators=100,
        max_depth=10,
        random_state=42
    )
    model.fit(X_train, y_train)
    
    # Оценка качества
    y_pred = model.predict(X_test)
    mae = mean_absolute_error(y_test, y_pred)
    r2 = r2_score(y_test, y_pred)
    
    print(f"\n📊 Качество модели:")
    print(f"  Mean Absolute Error: {mae:.2f}")
    print(f"  R² Score: {r2:.2f}")
    
    # Важность признаков
    print(f"\n📊 Важность признаков:")
    for name, imp in zip(features, model.feature_importances_):
        print(f"  {name}: {imp*100:.1f}%")
    
    # Сохраняем модель
    os.makedirs('models', exist_ok=True)
    import joblib
    joblib.dump(model, 'models/risk_predictor.joblib')
    joblib.dump(scaler, 'models/scaler.joblib')
    
    print("\n✅ Модель сохранена в models/")
    
    return model, scaler

def predict_risk(features, model=None, scaler=None):
    """Прогнозирует Risk Score для нового объекта"""
    if model is None:
        import joblib
        model = joblib.load('models/risk_predictor.joblib')
        scaler = joblib.load('models/scaler.joblib')
    
    X = scaler.transform([features])
    prediction = model.predict(X)[0]
    return round(prediction, 2)

if __name__ == "__main__":
    train_model()