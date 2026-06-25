import pandas as pd
import json
import random
import os
from datetime import datetime, timedelta

# 1. Парсинг Excel файла

def parse_excel_data(file_path):
    df = pd.read_excel(file_path, sheet_name='каналы', header=None)
    objects = []
    
    for idx, row in df.iterrows():
        if idx < 7:
            continue
        if pd.isna(row[0]) and pd.isna(row[1]) and pd.isna(row[2]):
            continue
        if isinstance(row[0], str):
            if 'Группа' in row[0] or 'Итого' in row[0]:
                continue
        
        try:
            obj_id = int(row[0]) if not pd.isna(row[0]) else None
            if obj_id is None:
                continue
        except (ValueError, TypeError):
            continue
        
        def to_float(value):
            if pd.isna(value):
                return None
            if isinstance(value, (int, float)):
                return float(value)
            if isinstance(value, str):
                # Заменяем запятую на точку
                value = value.replace(',', '.').strip()
                try:
                    return float(value)
                except ValueError:
                    return None
            return None
        
        def to_int(value):
            if pd.isna(value):
                return None
            if isinstance(value, (int, float)):
                return int(value)
            if isinstance(value, str):
                try:
                    return int(float(value.replace(',', '.').strip()))
                except ValueError:
                    return None
            return None
        
        obj = {
            'id': obj_id,
            'name': f"Канал №{obj_id}",
            'type': 'канал',
            'year_built': to_int(row[1]),
            'water_source': row[2] if not pd.isna(row[2]) else 'р. Иртыш',
            'capacity_m3s': to_float(row[3]),
            'length_km': to_float(row[4]),
            'earth_length_km': to_float(row[5]),
            'lined_length_km': to_float(row[6]),
            'wear_percent': to_float(row[14]) if not pd.isna(row[14]) else 0.3,
            'condition': str(row[15]).strip().lower() if not pd.isna(row[15]) else 'удов.',
            'cadastre': row[16] if not pd.isna(row[16]) else None,
            'district': row[17] if not pd.isna(row[17]) else None,
            'rural_district': row[18] if not pd.isna(row[18]) else None,
        }
        
        if any(o['id'] == obj['id'] for o in objects):
            continue
        objects.append(obj)
    
    return objects

# 2. Добавление координат

def add_coordinates(objects):
    district_coords = {
        'Район 1': (43.5, 72.5), 'Район 2': (43.8, 72.3),
        'Район 3': (44.0, 72.1), 'Район 4': (43.2, 72.8),
        'Район 5': (43.7, 72.6), 'Район 6': (44.1, 72.0),
        'Район 7': (43.4, 72.4), 'Район 8': (43.9, 72.2),
        'Район 9': (43.3, 72.7), 'Район 10': (43.6, 72.9),
        'Район 11': (44.2, 71.9), 'Район 12': (43.1, 73.0),
        'Район 13': (43.8, 72.1), 'Район 14': (44.0, 72.3),
        'Район 15': (43.5, 72.6), 'Район 16': (43.7, 72.4),
        'Район 17': (43.3, 72.9), 'Район 18': (44.1, 72.2),
        'Район 19': (43.6, 72.5), 'Район 20': (43.9, 72.7),
        'Район 21': (43.2, 72.3), 'Район 22': (44.0, 72.6),
        'Район 23': (43.4, 72.8), 'Район 24': (43.8, 72.0),
        'Район 25': (43.5, 72.7), 'Район 26': (43.7, 72.2),
        'Район 27': (44.1, 72.5), 'Район 28': (43.3, 72.6),
        'Район 29': (43.9, 72.4), 'Район 30': (43.6, 72.8),
    }
    
    for obj in objects:
        district = obj.get('district')
        if district and district in district_coords:
            lat, lng = district_coords[district]
            lat += random.uniform(-0.08, 0.08)
            lng += random.uniform(-0.08, 0.08)
        else:
            lat = random.uniform(42.8, 44.2)
            lng = random.uniform(71.0, 73.0)
        
        obj['latitude'] = round(lat, 6)
        obj['longitude'] = round(lng, 6)
    
    return objects

# 3. Добавление дат осмотра

def add_inspection_dates(objects):
    for obj in objects:
        year = obj.get('year_built')
        if year:
            age = 2026 - year
            if age > 60:
                max_years_ago = 5
            elif age > 40:
                max_years_ago = 3
            else:
                max_years_ago = 2
        else:
            max_years_ago = 3
        
        years_ago = random.randint(0, max_years_ago)
        last_inspection = datetime.now() - timedelta(days=years_ago * 365)
        obj['last_inspection'] = last_inspection.isoformat()
    
    return objects

# 4. Расчет Risk Score

def calculate_risk_score(obj):
    year = obj.get('year_built')
    if year:
        age = 2026 - year
        if age < 20:
            age_score = 10
        elif age < 40:
            age_score = 30
        elif age < 60:
            age_score = 60
        else:
            age_score = 85
    else:
        age_score = 50
    
    wear = obj.get('wear_percent', 0.3)
    if wear is None:
        wear = 0.3
    if isinstance(wear, str):
        try:
            wear = float(wear.replace('%', '').replace(',', '.').strip()) / 100
        except:
            wear = 0.3
    wear_score = float(wear) * 100
    
    condition = obj.get('condition', 'удов.')
    if condition == 'удов.' or condition == 'удовлетворительное':
        condition_score = 15
    elif condition == 'не удов.' or condition == 'неудовлетворительное':
        condition_score = 85
    else:
        condition_score = 50
    
    last_inspection = obj.get('last_inspection')
    if last_inspection:
        try:
            last_date = datetime.fromisoformat(last_inspection)
            years_since = (datetime.now() - last_date).days / 365
            if years_since < 1:
                inspection_score = 5
            elif years_since < 2:
                inspection_score = 20
            elif years_since < 3:
                inspection_score = 50
            elif years_since < 5:
                inspection_score = 80
            else:
                inspection_score = 95
        except:
            inspection_score = 50
    else:
        inspection_score = 50
    
    risk_score = (
        age_score * 0.25 +
        wear_score * 0.30 +
        inspection_score * 0.25 +
        condition_score * 0.20
    )
    
    return round(risk_score, 2)

def add_risk_scores(objects):
    for obj in objects:
        risk_score = calculate_risk_score(obj)
        obj['risk_score'] = risk_score
        
        if risk_score <= 25:
            obj['risk_level'] = 'Низкий'
            obj['risk_color'] = 'green'
        elif risk_score <= 50:
            obj['risk_level'] = 'Средний'
            obj['risk_color'] = 'yellow'
        elif risk_score <= 75:
            obj['risk_level'] = 'Высокий'
            obj['risk_color'] = 'orange'
        else:
            obj['risk_level'] = 'Критический'
            obj['risk_color'] = 'red'
    
    return objects

# 5. Сохранение данных

def save_data(objects, filename):
    os.makedirs('data', exist_ok=True)
    filepath = os.path.join('data', filename)
    with open(filepath, 'w', encoding='utf-8') as f:
        json.dump(objects, f, ensure_ascii=False, indent=2)
    print(f"Данные сохранены в {filepath}")
    return filepath

# 6. Статистика

def print_statistics(objects):
    print("\n" + "="*50)
    print("СТАТИСТИКА ПО ДАННЫМ")
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
    
    years = [obj.get('year_built') for obj in objects if obj.get('year_built')]
    if years:
        print(f"\nГоды постройки: от {min(years)} до {max(years)}")
    print("="*50)

# 7. Главная функция

def main():
    print("НАЧАЛО ПАРСИНГА ДАННЫХ")
    print("="*50)
    
    # СМЕНИ НАЗВАНИЕ ФАЙЛА ТУТ:
    file_path = 'Dataset.xls'
    
    if not os.path.exists(file_path):
        print(f"Файл {file_path} не найден!")
        return
    
    print(f"\nЧтение файла: {file_path}")
    objects = parse_excel_data(file_path)
    print(f"Загружено {len(objects)} объектов")
    
    print("\nДобавление координат...")
    objects = add_coordinates(objects)
    print("Координаты добавлены")
    
    print("\nДобавление дат осмотра...")
    objects = add_inspection_dates(objects)
    print("Даты осмотра добавлены")
    
    print("\nРасчет Risk Score...")
    objects = add_risk_scores(objects)
    print("Risk Score рассчитан")
    
    print("\nСохранение данных...")
    save_data(objects, 'hydraulic_objects.json')
    
    print_statistics(objects)
    
    print("\nГОТОВО!")

if __name__ == "__main__":
    main()