import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { getStructures } from "../api/structures";
import { conditionColor, conditionLabel } from "../utils/conditionColors";
import "leaflet/dist/leaflet.css";

const MOCK: any[] = [
  { id: 1, name: "Большой Чуйский канал", type: "Канал", type_code: "canal", district: "Жамбылский", locality: "с. Аса", water_source: "р. Чу", condition: "good", risk_level: "low", risk_score: 28, latitude: 42.85, longitude: 71.37, length_km: 120.5, year_built: 1958, last_inspection: "2024-03-15", next_inspection: "2024-09-15", significance: "regional", capacity: 18.5, area_ha: 12400, wear_percent: 41, verification_status: "verified" },
  { id: 2, name: "Шлюз №12", type: "Шлюз", type_code: "sluice", district: "Меркенский", locality: "Мерке", water_source: "магистральный канал", condition: "monitoring", risk_level: "medium", risk_score: 51, latitude: 42.91, longitude: 71.70, year_built: 1976, last_inspection: "2024-02-10", next_inspection: "2024-08-10", significance: "local", capacity: 8.2, wear_percent: 54, verification_status: "verified" },
  { id: 3, name: "Плотина Тасоткель", type: "Плотина", type_code: "dam", district: "Жуалынский", locality: "Тасоткель", water_source: "водохранилище", condition: "requires_repair", risk_level: "high", risk_score: 74, latitude: 42.58, longitude: 72.10, year_built: 1964, last_inspection: "2023-11-05", next_inspection: "2024-02-20", significance: "national", capacity: 45.0, area_ha: 32000, wear_percent: 68, verification_status: "verified" },
  { id: 4, name: "Насосная станция №3", type: "Насосная станция", type_code: "pumping_station", district: "Байзакский", locality: "Сарыкемер", water_source: "подводящий канал", condition: "emergency", risk_level: "critical", risk_score: 89, latitude: 42.75, longitude: 71.80, year_built: 1971, last_inspection: "2023-07-21", next_inspection: "2024-01-20", significance: "regional", capacity: 6.4, wear_percent: 82, verification_status: "pending" },
  { id: 5, name: "Канал арнасай", type: "Канал", type_code: "canal", district: "Таласский", locality: "Каратау", water_source: "р. Талас", condition: "monitoring", risk_level: "medium", risk_score: 47, latitude: 42.52, longitude: 71.90, year_built: 1986, last_inspection: "2024-01-18", next_inspection: "2024-07-18", significance: "local", length_km: 38.4, area_ha: 5800, wear_percent: 37, verification_status: "verified" },
];

const RISK_COLORS: Record<string, string> = {
  low: "#16a34a", medium: "#d97706", high: "#ea580c", critical: "#dc2626",
};
const RISK_LABELS: Record<string, string> = {
  low: "Низкий", medium: "Средний", high: "Высокий", critical: "Критический",
};
const SIGNIFICANCE_LABELS: Record<string, string> = {
  local: "Местный", regional: "Региональный", national: "Национальный",
};
const VERIFY_LABELS: Record<string, string> = {
  verified: "Проверено", pending: "На проверке", unverified: "Не проверено",
};

export default function MapPage() {
  // Use full /api/structures (StructureRead) instead of /api/structures/map (StructureMapItem)
  // so the popup gets all extended fields: risk_score, wear_percent, next_inspection, etc.
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
          {structures.map((s) => {
            const age = s.year_built ? 2026 - s.year_built : null;
            const effLoss = (s.efficiency_design && s.efficiency_actual)
              ? Math.max(0, Math.round((s.efficiency_design - s.efficiency_actual) * 100))
              : null;
            return (
              <CircleMarker
                key={s.id}
                center={[s.latitude, s.longitude]}
                radius={12}
                fillColor={conditionColor[s.condition] ?? "#94a3b8"}
                color="white"
                weight={2}
                fillOpacity={0.9}
              >
                <Popup maxWidth={340} minWidth={300}>
                  <div style={{ fontFamily: "Inter, sans-serif", width: "300px" }}>

                    {/* ── Header ── */}
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "14px", color: "#1e293b", lineHeight: 1.3 }}>{s.name}</div>
                        <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "2px" }}>
                          {s.type} · {s.district}{s.locality ? `, ${s.locality}` : ""}
                        </div>
                      </div>
                      <span style={{
                        fontSize: "10px", fontWeight: 800,
                        color: RISK_COLORS[s.risk_level] ?? "#64748b",
                        background: (RISK_COLORS[s.risk_level] ?? "#64748b") + "18",
                        padding: "4px 9px", borderRadius: "999px", whiteSpace: "nowrap",
                        border: `1px solid ${(RISK_COLORS[s.risk_level] ?? "#64748b")}30`,
                        flexShrink: 0,
                      }}>
                        {RISK_LABELS[s.risk_level] ?? s.risk_level} риск
                      </span>
                    </div>

                    {/* ── Status badges ── */}
                    <div style={{ display: "flex", gap: "5px", marginBottom: "12px", flexWrap: "wrap" }}>
                      <span style={{
                        color: conditionColor[s.condition] ?? "#64748b", fontWeight: 700, fontSize: "11px",
                        background: (conditionColor[s.condition] ?? "#64748b") + "18",
                        padding: "3px 9px", borderRadius: "10px",
                        border: `1px solid ${(conditionColor[s.condition] ?? "#64748b")}30`,
                      }}>{conditionLabel[s.condition] ?? s.condition}</span>
                      {s.significance && (
                        <span style={{ color: "#2563eb", fontWeight: 700, fontSize: "11px", background: "#dbeafe", padding: "3px 9px", borderRadius: "10px" }}>
                          {SIGNIFICANCE_LABELS[s.significance] ?? s.significance}
                        </span>
                      )}
                      {s.verification_status && (
                        <span style={{ color: "#475569", fontWeight: 700, fontSize: "11px", background: "#f1f5f9", padding: "3px 9px", borderRadius: "10px" }}>
                          {VERIFY_LABELS[s.verification_status] ?? s.verification_status}
                        </span>
                      )}
                    </div>

                    {/* ── Score + next inspection ── */}
                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                      <div style={{ background: (RISK_COLORS[s.risk_level] ?? "#64748b") + "10", border: `1px solid ${(RISK_COLORS[s.risk_level] ?? "#64748b")}25`, borderRadius: "10px", padding: "9px 11px" }}>
                        <div style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Inspection Score</div>
                        <div style={{ fontSize: "22px", color: RISK_COLORS[s.risk_level] ?? "#0f172a", fontWeight: 900, lineHeight: 1.1 }}>{s.risk_score ?? "—"}<span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}>/100</span></div>
                        {s.risk_score != null && (
                          <div style={{ height: 5, background: "#e2e8f0", borderRadius: 999, marginTop: 5, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.min(s.risk_score, 100)}%`, background: RISK_COLORS[s.risk_level] ?? "#94a3b8", borderRadius: 999 }} />
                          </div>
                        )}
                      </div>
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "9px 11px" }}>
                        <div style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Repair Score</div>
                        <div style={{ fontSize: "22px", color: "#ea580c", fontWeight: 900, lineHeight: 1.1 }}>
                          {s.wear_percent != null ? Math.max(0, 100 - s.wear_percent) : "—"}
                          <span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}>/100</span>
                        </div>
                        {s.wear_percent != null && (
                          <div style={{ height: 5, background: "#e2e8f0", borderRadius: 999, marginTop: 5, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${Math.max(0, 100 - s.wear_percent)}%`, background: "#ea580c", borderRadius: 999 }} />
                          </div>
                        )}
                      </div>
                    </div>

                    {/* ── Key info rows ── */}
                    <div style={{ background: "#f8fafc", borderRadius: "10px", border: "1px solid #e2e8f0", padding: "10px 12px", marginBottom: "10px", display: "flex", flexDirection: "column", gap: "7px" }}>
                      <Row icon="🏗️" label="Год постройки" value={s.year_built ? `${s.year_built} · ${age} лет` : "—"} />
                      <Row icon="🧱" label="Износ" value={s.wear_percent != null ? `${s.wear_percent}%` : "—"} />
                      <Row icon="📏" label="Длина" value={s.length_km ? `${s.length_km} км` : "—"} />
                      <Row icon="💧" label="Пропускная способность" value={s.capacity ? `${s.capacity} м³/с` : "—"} />
                      <Row icon="🌾" label="Площадь орошения" value={s.area_ha ? `${s.area_ha} га` : "—"} />
                      {effLoss !== null && <Row icon="📉" label="Потеря эффективности" value={`${effLoss}%`} />}
                      <Row icon="💦" label="Источник воды" value={s.water_source ?? "—"} />
                      <Row icon="📅" label="Последний осмотр" value={s.last_inspection ?? "—"} />
                      <Row icon="🔔" label="Следующий осмотр" value={s.next_inspection ?? "—"} highlight />
                    </div>

                    {/* ── Coordinates ── */}
                    <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#94a3b8", marginBottom: "10px", textAlign: "center" }}>
                      📍 {s.latitude}, {s.longitude}
                    </div>

                    {/* ── CTA ── */}
                    <button
                      onClick={() => navigate(`/object/${s.id}`)}
                      style={{
                        background: "linear-gradient(135deg, #1d4ed8, #2563eb)",
                        color: "white", border: "none",
                        padding: "9px 14px", borderRadius: "9px",
                        cursor: "pointer", fontSize: "12px", fontWeight: 700,
                        width: "100%", boxShadow: "0 2px 8px rgba(37,99,235,0.35)",
                      }}
                    >
                      Открыть карточку объекта →
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            );
          })}
        </MapContainer>
      </div>
    </div>
  );
}

function Row({ icon, label, value, highlight = false }: { icon: string; label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}>
        <span>{icon}</span>{label}
      </span>
      <span style={{
        fontSize: "11px", fontWeight: 700,
        color: highlight ? "#16a34a" : "#0f172a",
        background: highlight ? "#dcfce7" : "transparent",
        padding: highlight ? "1px 7px" : undefined,
        borderRadius: highlight ? "8px" : undefined,
      }}>{value}</span>
    </div>
  );
}
