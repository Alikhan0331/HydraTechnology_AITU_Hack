import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStructures } from "../api/structures";
import type { Structure } from "../api/structures";
import { conditionColor, conditionLabel } from "../utils/conditionColors";

const MOCK: Structure[] = [
  { id: 1, name: "Большой Чуйский канал", type: "Канал", district: "Жамбылский", condition: "good", risk_level: "low", latitude: 42.85, longitude: 71.37 },
  { id: 2, name: "Шлюз №12", type: "Шлюз", district: "Меркенский", condition: "monitoring", risk_level: "medium", latitude: 42.91, longitude: 71.70 },
  { id: 3, name: "Плотина Тасоткель", type: "Плотина", district: "Жуалынский", condition: "requires_repair", risk_level: "high", latitude: 42.58, longitude: 72.10 },
  { id: 4, name: "Насосная станция №3", type: "Насосная станция", district: "Байзакский", condition: "emergency", risk_level: "critical", latitude: 42.75, longitude: 71.80 },
];

const types = ["Все", "Канал", "Шлюз", "Плотина", "Насосная станция"];
const conditions = ["Все", "good", "monitoring", "requires_repair", "emergency"];

export default function Catalog() {
  const [structures, setStructures] = useState<Structure[]>(MOCK);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Все");
  const [condFilter, setCondFilter] = useState("Все");
  const navigate = useNavigate();

  useEffect(() => {
    getStructures().then((res) => setStructures(res.data)).catch(() => {});
  }, []);

  const filtered = structures.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) ||
      s.district.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "Все" || s.type === typeFilter;
    const matchCond = condFilter === "Все" || s.condition === condFilter;
    return matchSearch && matchType && matchCond;
  });

  const inputStyle = {
    padding: "10px 14px", borderRadius: "10px",
    border: "1px solid #1e293b", background: "#1e293b",
    color: "white", fontSize: "14px", outline: "none",
  };

  return (
    <div style={{ padding: "32px", minHeight: "100vh", background: "#0f172a" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ color: "white", fontSize: "26px", fontWeight: 800, margin: 0 }}>Каталог</h1>
        <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: "14px" }}>Цифровой каталог гидротехнических сооружений</p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "24px", flexWrap: "wrap" }}>
        <input
          placeholder="🔍 Поиск по названию или району..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          style={{ ...inputStyle, minWidth: "280px" }}
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)} style={inputStyle}>
          {types.map((t) => <option key={t} style={{ background: "#1e293b" }}>{t}</option>)}
        </select>
        <select value={condFilter} onChange={(e) => setCondFilter(e.target.value)} style={inputStyle}>
          {conditions.map((c) => (
            <option key={c} value={c} style={{ background: "#1e293b" }}>
              {c === "Все" ? "Все состояния" : conditionLabel[c]}
            </option>
          ))}
        </select>
        <div style={{ display: "flex", alignItems: "center", color: "#64748b", fontSize: "13px" }}>
          {filtered.length} объектов
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "#1e293b", borderRadius: "16px", overflow: "hidden", border: "1px solid #334155" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "#0f172a" }}>
              {["Название", "Тип", "Район", "Состояние", "Риск", ""].map((h) => (
                <th key={h} style={{ padding: "14px 16px", textAlign: "left", color: "#64748b", fontSize: "12px", fontWeight: 600, letterSpacing: "0.5px", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id}
                style={{ borderTop: "1px solid #334155", transition: "background 0.15s", cursor: "pointer" }}
                onMouseEnter={(e) => (e.currentTarget.style.background = "#263347")}
                onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                onClick={() => navigate(`/object/${s.id}`)}
              >
                <td style={{ padding: "14px 16px", color: "white", fontWeight: 500 }}>{s.name}</td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ background: "#0f172a", color: "#94a3b8", padding: "3px 10px", borderRadius: "6px", fontSize: "13px" }}>{s.type}</span>
                </td>
                <td style={{ padding: "14px 16px", color: "#94a3b8", fontSize: "14px" }}>{s.district}</td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{
                    background: conditionColor[s.condition] + "22",
                    color: conditionColor[s.condition],
                    padding: "4px 12px", borderRadius: "20px", fontWeight: 600, fontSize: "12px",
                    border: `1px solid ${conditionColor[s.condition]}44`
                  }}>
                    {conditionLabel[s.condition]}
                  </span>
                </td>
                <td style={{ padding: "14px 16px", color: "#64748b", fontSize: "13px" }}>{s.risk_level}</td>
                <td style={{ padding: "14px 16px" }}>
                  <span style={{ color: "#3b82f6", fontSize: "13px" }}>Подробнее →</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: "48px", textAlign: "center", color: "#475569" }}>Объекты не найдены</div>
        )}
      </div>
    </div>
  );
}
