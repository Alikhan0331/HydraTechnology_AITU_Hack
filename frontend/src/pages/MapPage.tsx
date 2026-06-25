import { useEffect, useState, useMemo } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import { useNavigate } from "react-router-dom";
import { getMapData } from "../api/structures";
import type { Structure } from "../api/structures";
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
  const [allStructures, setAllStructures] = useState<any[]>(MOCK);
  const [condFilter, setCondFilter] = useState("все");
  const [riskFilter, setRiskFilter] = useState("все");
  const navigate = useNavigate();

  useEffect(() => {
    getMapData().then((res) => {
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
            return (
              <CircleMarker key={s.id} center={[s.latitude, s.longitude]} radius={12} fillColor={conditionColor[s.condition] ?? "#94a3b8"} color="white" weight={2} fillOpacity={0.9}>
                <Popup maxWidth={320}>
                  <div style={{ fontFamily: "Inter, sans-serif", minWidth: "260px" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "6px" }}>
                      <div>
                        <div style={{ fontWeight: 800, fontSize: "14px", color: "#1e293b", lineHeight: 1.3 }}>{s.name}</div>
                        <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "2px" }}>{s.type} · {s.district}{s.locality ? `, ${s.locality}` : ""}</div>
                      </div>
                      <span style={{ fontSize: "10px", fontWeight: 800, color: RISK_COLORS[s.risk_level] ?? "#64748b", background: (RISK_COLORS[s.risk_level] ?? "#64748b") + "15", padding: "4px 8px", borderRadius: "999px", whiteSpace: "nowrap" }}>{RISK_LABELS[s.risk_level] ?? s.risk_level}</span>
                    </div>

                    <div style={{ display: "flex", gap: "6px", marginBottom: "10px", flexWrap: "wrap" }}>
                      <span style={{ color: conditionColor[s.condition] ?? "#64748b", fontWeight: 700, fontSize: "11px", background: (conditionColor[s.condition] ?? "#64748b") + "18", padding: "3px 9px", borderRadius: "10px", border: `1px solid ${(conditionColor[s.condition] ?? '#64748b')}30` }}>{conditionLabel[s.condition] ?? s.condition}</span>
                      {s.significance && <span style={{ color: "#2563eb", fontWeight: 700, fontSize: "11px", background: "#dbeafe", padding: "3px 9px", borderRadius: "10px" }}>{SIGNIFICANCE_LABELS[s.significance] ?? s.significance}</span>}
                      {s.verification_status && <span style={{ color: "#475569", fontWeight: 700, fontSize: "11px", background: "#f1f5f9", padding: "3px 9px", borderRadius: "10px" }}>{VERIFY_LABELS[s.verification_status] ?? s.verification_status}</span>}
                    </div>

                    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "8px 10px" }}>
                        <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>Inspection Score</div>
                        <div style={{ fontSize: "18px", color: RISK_COLORS[s.risk_level] ?? "#0f172a", fontWeight: 900 }}>{s.risk_score ?? "—"}</div>
                      </div>
                      <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "10px", padding: "8px 10px" }}>
                        <div style={{ fontSize: "10px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase" }}>След. осмотр</div>
                        <div style={{ fontSize: "12px", color: "#0f172a", fontWeight: 800 }}>{s.next_inspection ?? "—"}</div>
                      </div>
                    </div>

                    <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginBottom: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}><span style={{ fontSize: "11px", color: "#64748b" }}>📍 Координаты</span><span style={{ fontSize: "11px", color: "#0f172a", fontWeight: 700, fontFamily: "monospace" }}>{s.latitude}, {s.longitude}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}><span style={{ fontSize: "11px", color: "#64748b" }}>🏗️ Год постройки</span><span style={{ fontSize: "11px", color: "#0f172a", fontWeight: 700 }}>{s.year_built ?? "—"}{age ? ` · ${age} лет` : ""}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}><span style={{ fontSize: "11px", color: "#64748b" }}>📏 Длина / мощность</span><span style={{ fontSize: "11px", color: "#0f172a", fontWeight: 700 }}>{s.length_km ? `${s.length_km} км` : (s.capacity ? `${s.capacity} м³/с` : "—")}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}><span style={{ fontSize: "11px", color: "#64748b" }}>🧱 Износ</span><span style={{ fontSize: "11px", color: "#0f172a", fontWeight: 700 }}>{s.wear_percent != null ? `${s.wear_percent}%` : "—"}</span></div>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}><span style={{ fontSize: "11px", color: "#64748b" }}>💧 Источник воды</span><span style={{ fontSize: "11px", color: "#0f172a", fontWeight: 700 }}>{s.water_source ?? "—"}</span></div>
                    </div>

                    <button onClick={() => navigate(`/object/${s.id}`)} style={{ background: "#1d4ed8", color: "white", border: "none", padding: "8px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "12px", fontWeight: 700, width: "100%" }}>
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
