import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { getStructures } from "../api/structures";
import { conditionColor, conditionLabel } from "../utils/conditionColors";
import "leaflet/dist/leaflet.css";

const MOCK: any[] = [
  { id: 1, name: "Большой Чуйский канал", type: "Канал", district: "Жамбылский", condition: "good", risk_level: "low", risk_score: 28, latitude: 42.85, longitude: 71.37, year_built: 1958, next_inspection: "2024-09-15", wear_percent: 41 },
  { id: 2, name: "Шлюз №12", type: "Шлюз", district: "Меркенский", condition: "monitoring", risk_level: "medium", risk_score: 51, latitude: 42.91, longitude: 71.70, year_built: 1976, next_inspection: "2024-08-10", wear_percent: 54 },
  { id: 3, name: "Плотина Тасоткель", type: "Плотина", district: "Жуалынский", condition: "requires_repair", risk_level: "high", risk_score: 74, latitude: 42.58, longitude: 72.10, year_built: 1964, next_inspection: "2024-02-20", wear_percent: 68 },
  { id: 4, name: "Насосная станция №3", type: "Насосная станция", district: "Байзакский", condition: "emergency", risk_level: "critical", risk_score: 89, latitude: 42.75, longitude: 71.80, year_built: 1971, next_inspection: "2024-01-20", wear_percent: 82 },
  { id: 5, name: "Канал Арнасай", type: "Канал", district: "Таласский", condition: "monitoring", risk_level: "medium", risk_score: 47, latitude: 42.52, longitude: 71.90, year_built: 1986, next_inspection: "2024-07-18", wear_percent: 37 },
];

const RISK_COLORS: Record<string, string> = { low: "#16a34a", medium: "#d97706", high: "#ea580c", critical: "#dc2626" };
const RISK_LABELS: Record<string, string> = { low: "Низкий", medium: "Средний", high: "Высокий", critical: "Критический" };

export default function MapPage() {
  const [allStructures, setAllStructures] = useState<any[]>(MOCK);
  const [condFilter, setCondFilter] = useState("все");
  const [riskFilter, setRiskFilter] = useState("все");
  const navigate = useNavigate();

  useEffect(() => {
    getStructures({ limit: "2000" }).then((res) => {
      if (Array.isArray(res.data) && res.data.length > 0) setAllStructures(res.data);
    }).catch(() => {});
  }, []);

  const structures = useMemo(() => allStructures.filter((s) => {
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
      <div style={{ padding: "12px 20px", background: "white", borderBottom: "1px solid var(--gray-200)", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center", boxShadow: "var(--shadow-sm)", zIndex: 10 }}>
        <span style={{ fontFamily: "Manrope", fontWeight: 700, fontSize: "15px", color: "var(--gray-900)", marginRight: "4px" }}>🗺️ Карта</span>
        <div style={{ width: 1, height: 18, background: "var(--gray-200)", margin: "0 6px" }} />
        <select value={condFilter} onChange={e => setCondFilter(e.target.value)} style={selectSt}>
          <option value="все">Все состояния</option>
          {Object.entries(conditionLabel).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select value={riskFilter} onChange={e => setRiskFilter(e.target.value)} style={selectSt}>
          <option value="все">Все уровни риска</option>
          {Object.entries(RISK_LABELS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <div style={{ width: 1, height: 18, background: "var(--gray-200)", margin: "0 4px" }} />
        {Object.entries(conditionColor).map(([key, color]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: "5px", padding: "4px 10px", borderRadius: "16px", border: "1px solid var(--gray-200)", background: condFilter === key ? color + "18" : "var(--gray-50)" }}>
            <div style={{ width: 9, height: 9, borderRadius: "50%", background: color, flexShrink: 0 }} />
            <span style={{ fontSize: "11px", color: "var(--gray-600)", fontWeight: 500 }}>{conditionLabel[key]}</span>
          </div>
        ))}
        <div style={{ marginLeft: "auto", background: "var(--primary-bg)", color: "var(--primary)", padding: "5px 12px", borderRadius: "16px", fontSize: "12px", fontWeight: 600, border: "1px solid #bfdbfe", whiteSpace: "nowrap" }}>
          {structures.length} объектов
        </div>
      </div>
      <div style={{ flex: 1 }}>
        <MapContainer center={[42.85, 71.37]} zoom={9} style={{ height: "100%", width: "100%" }}>
          <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
          {structures.map((s) => (
            <CircleMarker key={s.id} center={[s.latitude, s.longitude]} radius={12}
              fillColor={conditionColor[s.condition] ?? "#94a3b8"} color="white" weight={2} fillOpacity={0.9}>
              <Popup maxWidth={260} minWidth={240}>
                <CompactPopup s={s} onOpen={() => navigate(`/object/${s.id}`)} />
              </Popup>
            </CircleMarker>
          ))}
        </MapContainer>
      </div>
    </div>
  );
}

function CompactPopup({ s, onOpen }: { s: any; onOpen: () => void }) {
  const riskColor = RISK_COLORS[s.risk_level] ?? "#64748b";
  const age = s.year_built ? 2026 - s.year_built : null;
  return (
    <div style={{ fontFamily: "Inter, sans-serif", width: "230px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "6px", marginBottom: "8px" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: "13px", color: "#1e293b", lineHeight: 1.3 }}>{s.name}</div>
          <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "1px" }}>{s.type} · {s.district}</div>
        </div>
        <span style={{ fontSize: "10px", fontWeight: 700, color: riskColor, background: riskColor + "18", padding: "3px 7px", borderRadius: "999px", whiteSpace: "nowrap", border: `1px solid ${riskColor}30`, flexShrink: 0 }}>
          {RISK_LABELS[s.risk_level] ?? s.risk_level}
        </span>
      </div>
      <div style={{ marginBottom: "10px" }}>
        <span style={{ color: conditionColor[s.condition] ?? "#64748b", fontWeight: 700, fontSize: "11px", background: (conditionColor[s.condition] ?? "#64748b") + "18", padding: "3px 9px", borderRadius: "10px", border: `1px solid ${(conditionColor[s.condition] ?? "#64748b")}30` }}>
          {conditionLabel[s.condition] ?? s.condition}
        </span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "6px", marginBottom: "10px" }}>
        <div style={{ background: riskColor + "10", border: `1px solid ${riskColor}20`, borderRadius: "8px", padding: "7px 9px" }}>
          <div style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "2px" }}>Риск</div>
          <div style={{ fontSize: "18px", color: riskColor, fontWeight: 900, lineHeight: 1 }}>{s.risk_score ?? "—"}<span style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 400 }}>/100</span></div>
          {s.risk_score != null && <div style={{ height: 3, background: "#e2e8f0", borderRadius: 999, marginTop: 4 }}><div style={{ height: "100%", width: `${Math.min(s.risk_score, 100)}%`, background: riskColor, borderRadius: 999 }} /></div>}
        </div>
        <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "8px", padding: "7px 9px" }}>
          <div style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.4px", marginBottom: "2px" }}>Износ</div>
          <div style={{ fontSize: "18px", color: "#ea580c", fontWeight: 900, lineHeight: 1 }}>{s.wear_percent != null ? `${s.wear_percent}%` : "—"}</div>
          {s.wear_percent != null && <div style={{ height: 3, background: "#e2e8f0", borderRadius: 999, marginTop: 4 }}><div style={{ height: "100%", width: `${Math.min(s.wear_percent, 100)}%`, background: "#ea580c", borderRadius: 999 }} /></div>}
        </div>
      </div>
      <div style={{ background: "#f8fafc", borderRadius: "8px", border: "1px solid #e2e8f0", padding: "8px 10px", marginBottom: "10px", display: "flex", flexDirection: "column", gap: "5px" }}>
        {age !== null && <Row label="Год / Возраст" value={`${s.year_built} · ${age} л`} />}
        {s.next_inspection && <Row label="След. осмотр" value={s.next_inspection} highlight />}
      </div>
      <button onClick={onOpen} style={{ background: "linear-gradient(135deg, #1d4ed8, #2563eb)", color: "white", border: "none", padding: "8px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 700, width: "100%", boxShadow: "0 2px 6px rgba(37,99,235,0.3)" }}>
        Открыть карточку →
      </button>
    </div>
  );
}

function Row({ label, value, highlight = false }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
      <span style={{ fontSize: "11px", color: "#94a3b8" }}>{label}</span>
      <span style={{ fontSize: "11px", fontWeight: 700, color: highlight ? "#16a34a" : "#0f172a", background: highlight ? "#dcfce7" : "transparent", padding: highlight ? "1px 6px" : undefined, borderRadius: highlight ? "6px" : undefined }}>{value}</span>
    </div>
  );
}
