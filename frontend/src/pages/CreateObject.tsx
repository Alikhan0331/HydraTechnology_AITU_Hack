import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { createStructure, getMeta } from "../api/structures";

function normalizeStringList(data: any[]): string[] {
  return data.map((item) => {
    if (typeof item === "string") return item;
    return item.name_ru ?? item.name ?? item.code ?? String(item);
  });
}

const CONDITIONS = [
  { value: "good", label: "Хорошее", color: "#16a34a" },
  { value: "monitoring", label: "Мониторинг", color: "#d97706" },
  { value: "requires_repair", label: "Требует ремонта", color: "#ea580c" },
  { value: "emergency", label: "Аварийное", color: "#dc2626" },
];

const SIGNIFICANCE = [
  { value: "local", label: "Местное" },
  { value: "regional", label: "Региональное" },
  { value: "national", label: "Республиканское" },
];

interface FormData {
  name: string;
  type: string;
  district: string;
  latitude: string;
  longitude: string;
  condition: string;
  year_built: string;
  length_km: string;
  wear_percent: string;
  efficiency_design: string;
  efficiency_actual: string;
  capacity: string;
  water_source: string;
  locality: string;
  significance: string;
  description: string;
}

const EMPTY: FormData = {
  name: "", type: "", district: "", latitude: "", longitude: "",
  condition: "good", year_built: "", length_km: "", wear_percent: "",
  efficiency_design: "", efficiency_actual: "", capacity: "",
  water_source: "", locality: "", significance: "local", description: "",
};

export default function CreateObject() {
  const [form, setForm] = useState<FormData>(EMPTY);
  const [types, setTypes] = useState<string[]>([]);
  const [districts, setDistricts] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Partial<FormData>>({});
  const [success, setSuccess] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getMeta("types").then(r => {
      if (Array.isArray(r.data)) setTypes(normalizeStringList(r.data));
    }).catch(() => {});
    getMeta("districts").then(r => {
      const data = r.data;
      if (Array.isArray(data)) setDistricts(data);
      else if (typeof data === "object") setDistricts(Object.values(data) as string[]);
    }).catch(() => {});
  }, []);

  const set = (field: keyof FormData) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    setForm(f => ({ ...f, [field]: e.target.value }));
    setErrors(er => ({ ...er, [field]: undefined }));
  };

  const validate = (): boolean => {
    const e: Partial<FormData> = {};
    if (!form.name.trim()) e.name = "Обязательное поле";
    if (!form.type) e.type = "Выберите тип";
    if (!form.district.trim()) e.district = "Обязательное поле";
    const lat = parseFloat(form.latitude);
    const lon = parseFloat(form.longitude);
    if (!form.latitude || isNaN(lat) || lat < -90 || lat > 90) e.latitude = "От -90 до 90";
    if (!form.longitude || isNaN(lon) || lon < -180 || lon > 180) e.longitude = "От -180 до 180";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const payload: any = {
        name: form.name.trim(),
        type: form.type,
        district: form.district.trim(),
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        condition: form.condition,
        significance: form.significance,
      };
      if (form.year_built) payload.year_built = parseInt(form.year_built);
      if (form.length_km) payload.length_km = parseFloat(form.length_km);
      if (form.wear_percent) payload.wear_percent = parseFloat(form.wear_percent);
      if (form.efficiency_design) payload.efficiency_design = parseFloat(form.efficiency_design);
      if (form.efficiency_actual) payload.efficiency_actual = parseFloat(form.efficiency_actual);
      if (form.capacity) payload.capacity = parseFloat(form.capacity);
      if (form.water_source) payload.water_source = form.water_source.trim();
      if (form.locality) payload.locality = form.locality.trim();
      if (form.description) payload.description = form.description.trim();

      const res = await createStructure(payload);
      setSuccess(true);
      setTimeout(() => navigate(`/object/${res.data.id}`), 1200);
    } catch (err: any) {
      const detail = err?.response?.data?.detail;
      alert("Ошибка: " + (typeof detail === "string" ? detail : JSON.stringify(detail) || "Неизвестная ошибка"));
    } finally {
      setLoading(false);
    }
  };

  // ---- Styles ----
  const inputSt = (hasError?: string): React.CSSProperties => ({
    width: "100%", padding: "10px 12px", borderRadius: "8px",
    border: `1px solid ${hasError ? "#ef4444" : "#e2e8f0"}`,
    fontSize: "13px", color: "#1e293b", outline: "none",
    background: "white", boxSizing: "border-box",
    transition: "border-color 0.15s",
  });
  const labelSt: React.CSSProperties = { fontSize: "12px", fontWeight: 600, color: "#475569", marginBottom: "5px", display: "block" };
  const fieldSt: React.CSSProperties = { display: "flex", flexDirection: "column" };
  const errSt: React.CSSProperties = { color: "#ef4444", fontSize: "11px", marginTop: "3px" };
  const sectionSt: React.CSSProperties = {
    background: "white", borderRadius: "12px", border: "1px solid #e2e8f0",
    boxShadow: "0 1px 3px rgba(0,0,0,0.06)", padding: "24px", marginBottom: "20px",
  };
  const sectionTitle = (icon: string, title: string) => (
    <div style={{ fontWeight: 700, fontSize: "14px", color: "#1e293b", marginBottom: "18px", display: "flex", alignItems: "center", gap: "8px" }}>
      <span>{icon}</span>{title}
    </div>
  );
  const grid2: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" };
  const grid3: React.CSSProperties = { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px" };

  if (success) return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: "80vh", gap: "16px" }}>
      <div style={{ fontSize: "56px" }}>✅</div>
      <div style={{ fontWeight: 700, fontSize: "20px", color: "#1e293b" }}>Объект создан!</div>
      <div style={{ color: "#64748b", fontSize: "14px" }}>Переход на страницу объекта...</div>
    </div>
  );

  return (
    <div style={{ padding: "32px 24px", background: "#f8fafc", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", gap: "16px", marginBottom: "28px" }}>
        <button onClick={() => navigate("/catalog")}
          style={{ padding: "8px 14px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", color: "#475569", cursor: "pointer", fontSize: "13px", fontWeight: 500 }}>
          ← Назад
        </button>
        <div>
          <h1 style={{ fontSize: "22px", fontWeight: 800, color: "#1e293b", margin: 0 }}>Добавить объект</h1>
          <p style={{ color: "#94a3b8", fontSize: "13px", margin: "3px 0 0" }}>Регистрация нового гидротехнического сооружения</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate>
        {/* Section 1: Основное */}
        <div style={sectionSt}>
          {sectionTitle("🏠", "Основная информация")}
          <div style={{ ...grid2, marginBottom: "16px" }}>
            <div style={fieldSt}>
              <label style={labelSt}>Название *</label>
              <input value={form.name} onChange={set("name")} placeholder="Например: Большой Чуйский канал" style={inputSt(errors.name)} />
              {errors.name && <span style={errSt}>{errors.name}</span>}
            </div>
            <div style={fieldSt}>
              <label style={labelSt}>Тип сооружения *</label>
              <select value={form.type} onChange={set("type")} style={{ ...inputSt(errors.type), cursor: "pointer" }}>
                <option value="">— выберите —</option>
                {types.map(t => <option key={t} value={t}>{t}</option>)}
              </select>
              {errors.type && <span style={errSt}>{errors.type}</span>}
            </div>
          </div>
          <div style={{ ...grid2, marginBottom: "16px" }}>
            <div style={fieldSt}>
              <label style={labelSt}>Район *</label>
              {districts.length > 0
                ? <select value={form.district} onChange={set("district")} style={{ ...inputSt(errors.district), cursor: "pointer" }}>
                    <option value="">— выберите —</option>
                    {districts.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                : <input value={form.district} onChange={set("district")} placeholder="Название района" style={inputSt(errors.district)} />
              }
              {errors.district && <span style={errSt}>{errors.district}</span>}
            </div>
            <div style={fieldSt}>
              <label style={labelSt}>Населённый пункт</label>
              <input value={form.locality} onChange={set("locality")} placeholder="Село, аул ..."
                style={inputSt()} />
            </div>
          </div>
          <div style={fieldSt}>
            <label style={labelSt}>Описание</label>
            <textarea value={form.description} onChange={set("description") as any}
              placeholder="Краткое описание объекта..."
              rows={3}
              style={{ ...inputSt(), resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
          </div>
        </div>

        {/* Section 2: Координаты */}
        <div style={sectionSt}>
          {sectionTitle("📍", "Координаты и локация")}
          <div style={{ ...grid2 }}>
            <div style={fieldSt}>
              <label style={labelSt}>Широта * (latitude)</label>
              <input value={form.latitude} onChange={set("latitude")} placeholder="42.85" type="number" step="0.000001"
                style={inputSt(errors.latitude)} />
              {errors.latitude && <span style={errSt}>{errors.latitude}</span>}
            </div>
            <div style={fieldSt}>
              <label style={labelSt}>Долгота * (longitude)</label>
              <input value={form.longitude} onChange={set("longitude")} placeholder="71.37" type="number" step="0.000001"
                style={inputSt(errors.longitude)} />
              {errors.longitude && <span style={errSt}>{errors.longitude}</span>}
            </div>
          </div>
          <div style={{ marginTop: "10px", padding: "10px 14px", background: "#f0f9ff", borderRadius: "8px", fontSize: "12px", color: "#0369a1" }}>
            💡 Жамбылский регион: широта 42–44, долгота 69–75
          </div>
        </div>

        {/* Section 3: Состояние */}
        <div style={sectionSt}>
          {sectionTitle("🛡️", "Состояние и значимость")}
          <div style={{ ...grid2, marginBottom: "16px" }}>
            <div style={fieldSt}>
              <label style={labelSt}>Техническое состояние *</label>
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap", marginTop: "4px" }}>
                {CONDITIONS.map(c => (
                  <button type="button" key={c.value}
                    onClick={() => setForm(f => ({ ...f, condition: c.value }))}
                    style={{
                      padding: "7px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600,
                      cursor: "pointer", border: `1px solid ${c.color}40`,
                      background: form.condition === c.value ? c.color : c.color + "12",
                      color: form.condition === c.value ? "white" : c.color,
                      transition: "all 0.15s",
                    }}>
                    {c.label}
                  </button>
                ))}
              </div>
            </div>
            <div style={fieldSt}>
              <label style={labelSt}>Значимость *</label>
              <select value={form.significance} onChange={set("significance")} style={{ ...inputSt(), cursor: "pointer" }}>
                {SIGNIFICANCE.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}
              </select>
            </div>
          </div>
          <div style={{ ...grid2 }}>
            <div style={fieldSt}>
              <label style={labelSt}>Год постройки</label>
              <input value={form.year_built} onChange={set("year_built")} placeholder="1975" type="number" min="1900" max="2026"
                style={inputSt()} />
            </div>
            <div style={fieldSt}>
              <label style={labelSt}>Износ, % (0–100)</label>
              <input value={form.wear_percent} onChange={set("wear_percent")} placeholder="45" type="number" min="0" max="100" step="0.1"
                style={inputSt()} />
            </div>
          </div>
        </div>

        {/* Section 4: Технические параметры */}
        <div style={sectionSt}>
          {sectionTitle("⚙️", "Технические параметры (необязательно)")}
          <div style={{ ...grid3, marginBottom: "16px" }}>
            <div style={fieldSt}>
              <label style={labelSt}>Длина (км)</label>
              <input value={form.length_km} onChange={set("length_km")} placeholder="12.5" type="number" step="0.01" min="0"
                style={inputSt()} />
            </div>
            <div style={fieldSt}>
              <label style={labelSt}>Пропускная способность (м³/с)</label>
              <input value={form.capacity} onChange={set("capacity")} placeholder="5.0" type="number" step="0.01" min="0"
                style={inputSt()} />
            </div>
            <div style={fieldSt}>
              <label style={labelSt}>Водоисточник</label>
              <input value={form.water_source} onChange={set("water_source")} placeholder="р. Талас"
                style={inputSt()} />
            </div>
          </div>
          <div style={{ ...grid2 }}>
            <div style={fieldSt}>
              <label style={labelSt}>Проектная эффективность (%)</label>
              <input value={form.efficiency_design} onChange={set("efficiency_design")} placeholder="0.75" type="number" step="0.01" min="0" max="1"
                style={inputSt()} />
            </div>
            <div style={fieldSt}>
              <label style={labelSt}>Фактическая эффективность (%)</label>
              <input value={form.efficiency_actual} onChange={set("efficiency_actual")} placeholder="0.60" type="number" step="0.01" min="0" max="1"
                style={inputSt()} />
            </div>
          </div>
        </div>

        {/* Submit */}
        <div style={{ display: "flex", gap: "12px", justifyContent: "flex-end" }}>
          <button type="button" onClick={() => navigate("/catalog")}
            style={{ padding: "11px 24px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", color: "#475569", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
            Отмена
          </button>
          <button type="submit" disabled={loading}
            style={{ padding: "11px 32px", borderRadius: "8px", border: "none", background: loading ? "#93c5fd" : "#1d4ed8", color: "white", fontWeight: 700, fontSize: "14px", cursor: loading ? "default" : "pointer", display: "flex", alignItems: "center", gap: "8px" }}>
            {loading ? <>⏳ Сохранение...</> : <>✔️ Создать объект</>}
          </button>
        </div>
      </form>
    </div>
  );
}
