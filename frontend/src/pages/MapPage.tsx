import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { getMapData } from "../api/structures";
import type { Structure } from "../api/structures";
import { conditionColor, conditionLabel } from "../utils/conditionColors";
import "leaflet/dist/leaflet.css";

const MOCK: Structure[] = [
  { id: 1, name: "Большой Чуйский канал", type: "Канал", district: "Жамбылский", condition: "good", risk_level: "low", latitude: 42.85, longitude: 71.37 },
  { id: 2, name: "Шлюз №12", type: "Шлюз", district: "Меркенский", condition: "monitoring", risk_level: "medium", latitude: 42.91, longitude: 71.70 },
  { id: 3, name: "Плотина Тасоткель", type: "Плотина", district: "Жуалынский", condition: "requires_repair", risk_level: "high", latitude: 42.58, longitude: 72.10 },
  { id: 4, name: "Насосная станция №3", type: "Насосная станция", district: "Байзакский", condition: "emergency", risk_level: "critical", latitude: 42.75, longitude: 71.80 },
  { id: 5, name: "Канал арнасай", type: "Канал", district: "Таласский", condition: "monitoring", risk_level: "medium", latitude: 42.52, longitude: 71.90 },
];

const RISK_COLORS: Record<string, string> = {
  low: "#16a34a", medium: "#d97706", high: "#ea580c", critical: "#dc2626",
};
const RISK_LABELS: Record<string, string> = {
  low: "Низкий", medium: "Средний", high: "Высокий", critical: "Критический",
};

export default function MapPage() {
  const [allStructures, setAllStructures] = useState<Structure[]>(MOCK);
  const [condFilter, setCondFilter] = useState("все");
  const [riskFilter, setRiskFilter] = useState("все");
  const navigate = useNavigate();

  useEffect(() => {
    getMapData().then((res) => {
      if (Array.isArray(res.data) && res.data.length > 0) setAllStructures(res.data);
    }).catch(() => {});
  }, []);

  const structures = useMemo(() => allStructures.filter(s => {
    const mc = condFilter === "все" || s.condition === condFilter;
    const mr = riskFilter === "все" || s.risk_level === riskFilter;
    return mc && mr;
  }), [allStructures, condFilter, riskFilter]);

  const selectSt: React.CSSProperties = {
    padding: "7px 10px", borderRadius: "8px", border: "1px solid #e2e8f0",
    background: "white", fontSize: "12px", color: "#334155", outline: "none", cursor: "pointer",
  };

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--gray-50)" }}>
      {/* Top bar */}
      <div style={{ padding: "12px 20px", background: "white", borderBottom: "1px solid var(--gray-200)", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", boxShadow: "var(--shadow-sm)", zIndex: 10 }}>
        <span style={{ fontFamily: "Manrope", fontWeight: 700, fontSize: "15px", color: "var(--gray-900)", marginRight: "4px" }}>🗺️ Карта</span>
        <div style={{ width: 1, height: 18, background: "var(--gray-200)", margin: "0 6px" }} />

        {/* Condition filter */}
        <select value={condFilter} onChange={e => setCondFilter(e.target.value)} style={selectSt}>
          <option value="все">Все состояния</option>
          {Object.entries(conditionLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        {/* Risk filter */}
        <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} style={selectSt}>
          <option value="все">Все уровни риска</option>
          {Object.entries(RISK_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>

        {/* Legend */}
        <div style={{ width: 1, height: 18, background: "var(--gray-200)", margin: "0 4px" }} />
        {Object.entries(conditionColor).map(([key, color]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "16px", border: "1px solid var(--gray-200)", background: condFilter === key ? color + "18" : "var(--gray-50)" }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={{ fontSize: "11px", color: "var(--gray-600)", fontWeight: 500 }}>{conditionLabel[key]}</span>
          </div>
        ))}

        {/* Counter */}
        <div style={{ marginLeft: "auto", background: "var(--primary-bg)", color: "var(--primary)", padding: "5px 12px", borderRadius: "16px", fontSize: "12px", fontWeight: 600, border: "1px solid #bfdbfe", whiteSpace: "nowrap" }}>
          {structures.length} объектов
        </div>
      </div>

      {/* Map */}
      <div style={{ flex: 1 }}>
        <MapContainer center={[42.85, 71.37]} zoom={9} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {structures.map((s) => (
            <CircleMarker
              key={s.id}
              center={[s.latitude, s.longitude]}
              radius={12}
              fillColor={conditionColor[s.condition] ?? "#94a3b8"}
              color="white"
              weight={2}
              fillOpacity={0.9}
            >
              <Popup maxWidth={220}>
                <div style={{ fontFamily: "Inter, sans-serif", minWidth: "190px" }}>
                  <div style={{ fontWeight: 700, fontSize: "13px", color: "#1e293b", marginBottom: "3px", lineHeight: 1.3 }}>{s.name}</div>
                  <div style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "8px" }}>{s.type} · {s.district}</div>
                  <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
                    <span style={{ color: conditionColor[s.condition], fontWeight: 600, fontSize: "11px", background: conditionColor[s.condition] + "18", padding: "3px 9px", borderRadius: "10px", border: `1px solid ${conditionColor[s.condition]}30` }}>
                      {conditionLabel[s.condition]}
                    </span>
                    <span style={{ color: RISK_COLORS[s.risk_level] ?? "#64748b", fontWeight: 600, fontSize: "11px", background: (RISK_COLORS[s.risk_level] ?? "#64748b") + "18", padding: "3px 9px", borderRadius: "10px" }}>
                      {RISK_LABELS[s.risk_level] ?? s.risk_level}
                    </span>
                  </div>
                  <button
                    onClick={() => navigate(`/object/${s.id}`)}
                    style={{ background: "#1d4ed8", color: "white", border: "none", padding: "7px 14px", borderRadius: "7px", cursor: "pointer", fontSize: "12px", fontWeight: 600, width: "100%" }}
                  >
                    Открыть карточку →
                  </button>
                </div>
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}
