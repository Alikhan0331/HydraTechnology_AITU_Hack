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

  return (
    <div style={{ padding: "32px", background: "#f1f5f9", minHeight: "100vh" }}>
      <h1 style={{ marginBottom: "24px", color: "#1e293b" }}>📋 Каталог объектов</h1>
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <input
          placeholder="Поиск по названию или району..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1", minWidth: "280px" }}
        />
        <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
          {types.map((t) => <option key={t}>{t}</option>)}
        </select>
        <select value={condFilter} onChange={(e) => setCondFilter(e.target.value)}
          style={{ padding: "8px 12px", borderRadius: "8px", border: "1px solid #cbd5e1" }}>
          {conditions.map((c) => (
            <option key={c} value={c}>{c === "Все" ? "Все состояния" : conditionLabel[c]}</option>
          ))}
        </select>
      </div>
      <div style={{ background: "white", borderRadius: "12px", overflow: "hidden", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead style={{ background: "#1e40af", color: "white" }}>
            <tr>
              {["Название", "Тип", "Район", "Состояние", "Риск", "Действие"].map((h) => (
                <th key={h} style={{ padding: "12px 16px", textAlign: "left" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((s, i) => (
              <tr key={s.id} style={{ background: i % 2 === 0 ? "white" : "#f8fafc" }}>
                <td style={{ padding: "12px 16px", fontWeight: 500 }}>{s.name}</td>
                <td style={{ padding: "12px 16px" }}>{s.type}</td>
                <td style={{ padding: "12px 16px" }}>{s.district}</td>
                <td style={{ padding: "12px 16px" }}>
                  <span style={{
                    background: conditionColor[s.condition] + "22",
                    color: conditionColor[s.condition],
                    padding: "4px 10px", borderRadius: "20px", fontWeight: 600, fontSize: "13px"
                  }}>
                    {conditionLabel[s.condition]}
                  </span>
                </td>
                <td style={{ padding: "12px 16px", color: "#6b7280" }}>{s.risk_level}</td>
                <td style={{ padding: "12px 16px" }}>
                  <button
                    onClick={() => navigate(`/object/${s.id}`)}
                    style={{ background: "#1e40af", color: "white", border: "none", padding: "6px 14px", borderRadius: "6px", cursor: "pointer" }}
                  >
                    Подробнее
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <div style={{ padding: "32px", textAlign: "center", color: "#6b7280" }}>Объекты не найдены</div>
        )}
      </div>
    </div>
  );
}
