import { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
import { getStructures } from "../api/structures";
import { conditionColor, conditionLabel } from "../utils/conditionColors";
import "leaflet/dist/leaflet.css";

interface FoundStructure {
  id?: number;
  name: string;
  type: string;
  lat: number;
  lon: number;
  confidence: number;
  source: string;
  condition?: string;
  district?: string;
  locality?: string;
  risk_level?: string;
  risk_score?: number;
  year_built?: number;
  last_inspection?: string;
  next_inspection?: string;
  significance?: string;
  capacity?: number;
  area_ha?: number;
  wear_percent?: number;
  verification_status?: string;
  water_source?: string;
  length_km?: number;
  efficiency_design?: number;
  efficiency_actual?: number;
}

const MOCK_RESULTS: FoundStructure[] = [
  { id: 1, name: "Большой Чуйский канал", type: "Канал", lat: 42.85, lon: 71.37, confidence: 0.95, source: "osm", condition: "good", district: "Жамбылский", locality: "с. Аса", risk_level: "low", risk_score: 28, year_built: 1958, last_inspection: "2024-03-15", next_inspection: "2024-09-15", significance: "regional", capacity: 18.5, area_ha: 12400, wear_percent: 41, verification_status: "verified", water_source: "р. Чу", length_km: 120.5 },
  { id: 2, name: "Шлюз №12", type: "Шлюз", lat: 42.91, lon: 71.70, confidence: 0.88, source: "osm", condition: "monitoring", district: "Меркенский", locality: "Мерке", risk_level: "medium", risk_score: 51, year_built: 1976, last_inspection: "2024-02-10", next_inspection: "2024-08-10", significance: "local", capacity: 8.2, wear_percent: 54, verification_status: "verified", water_source: "магистральный канал" },
  { id: 3, name: "Канал (спутник)", type: "Канал", lat: 42.78, lon: 71.55, confidence: 0.72, source: "satellite_ndwi", condition: "monitoring" },
  { id: 4, name: "Плотина Тасоткель", type: "Плотина", lat: 42.58, lon: 72.10, confidence: 0.91, source: "osm", condition: "requires_repair", district: "Жуалынский", locality: "Тасоткель", risk_level: "high", risk_score: 74, year_built: 1964, last_inspection: "2023-11-05", next_inspection: "2024-02-20", significance: "national", capacity: 45.0, area_ha: 32000, wear_percent: 68, verification_status: "verified", water_source: "водохранилище" },
  { id: 5, name: "Неизвестный водоток", type: "Канал", lat: 42.70, lon: 71.92, confidence: 0.65, source: "satellite_ndwi", condition: "monitoring" },
  { id: 6, name: "Насосная станция №3", type: "Насосная станция", lat: 42.75, lon: 71.80, confidence: 0.93, source: "osm", condition: "emergency", district: "Байзакский", locality: "Сарыкемер", risk_level: "critical", risk_score: 89, year_built: 1971, last_inspection: "2023-07-21", next_inspection: "2024-01-20", significance: "regional", capacity: 6.4, wear_percent: 82, verification_status: "pending", water_source: "подводящий канал" },
];

function FlyTo({ lat, lon, zoom = 14 }: { lat: number; lon: number; zoom?: number }) {
  const map = useMap();
  useEffect(() => {
    map.flyTo([lat, lon], zoom, { duration: 1.4 });
  }, [lat, lon, zoom]);
  return null;
}

const sourceLabel: Record<string, string> = {
  osm: "OpenStreetMap",
  satellite_ndwi: "Спутник (NDWI)",
  dem: "DEM рельеф",
};
const sourceColor: Record<string, string> = {
  osm: "#1d4ed8",
  satellite_ndwi: "#7c3aed",
  dem: "#0891b2",
};
const RISK_COLORS: Record<string, string> = { low: "#16a34a", medium: "#d97706", high: "#ea580c", critical: "#dc2626" };
const RISK_LABELS: Record<string, string> = { low: "Низкий", medium: "Средний", high: "Высокий", critical: "Критический" };
const SIGNIFICANCE_LABELS: Record<string, string> = { local: "Местный", regional: "Региональный", national: "Национальный" };
const VERIFY_LABELS: Record<string, string> = { verified: "Проверено", pending: "На проверке", unverified: "Не проверено" };

function DataPopup({ s, onOpen }: { s: any; onOpen?: () => void }) {
  const age = s.year_built ? 2026 - s.year_built : null;
  const effLoss = (s.efficiency_design && s.efficiency_actual)
    ? Math.max(0, Math.round((s.efficiency_design - s.efficiency_actual) * 100))
    : null;
  const riskColor = RISK_COLORS[s.risk_level] ?? (s.condition ? conditionColor[s.condition] : "#64748b");

  return (
    <div style={{ fontFamily: "Inter, sans-serif", width: "300px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "8px", marginBottom: "8px" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: "14px", color: "#1e293b", lineHeight: 1.3 }}>{s.name}</div>
          <div style={{ color: "#94a3b8", fontSize: "11px", marginTop: "2px" }}>
            {s.type} · {s.district || "Без района"}{s.locality ? `, ${s.locality}` : ""}
          </div>
        </div>
        {s.risk_level && (
          <span style={{ fontSize: "10px", fontWeight: 800, color: riskColor, background: riskColor + "18", padding: "4px 9px", borderRadius: "999px", whiteSpace: "nowrap", border: `1px solid ${riskColor}30`, flexShrink: 0 }}>
            {RISK_LABELS[s.risk_level] ?? s.risk_level} риск
          </span>
        )}
      </div>

      <div style={{ display: "flex", gap: "5px", marginBottom: "12px", flexWrap: "wrap" }}>
        {s.condition && (
          <span style={{ color: conditionColor[s.condition] ?? "#64748b", fontWeight: 700, fontSize: "11px", background: (conditionColor[s.condition] ?? "#64748b") + "18", padding: "3px 9px", borderRadius: "10px", border: `1px solid ${(conditionColor[s.condition] ?? "#64748b")}30` }}>
            {conditionLabel[s.condition] ?? s.condition}
          </span>
        )}
        {s.significance && <span style={{ color: "#2563eb", fontWeight: 700, fontSize: "11px", background: "#dbeafe", padding: "3px 9px", borderRadius: "10px" }}>{SIGNIFICANCE_LABELS[s.significance] ?? s.significance}</span>}
        {s.verification_status && <span style={{ color: "#475569", fontWeight: 700, fontSize: "11px", background: "#f1f5f9", padding: "3px 9px", borderRadius: "10px" }}>{VERIFY_LABELS[s.verification_status] ?? s.verification_status}</span>}
        {s.source && <span style={{ color: sourceColor[s.source] || "#64748b", fontWeight: 700, fontSize: "11px", background: (sourceColor[s.source] || "#64748b") + "15", padding: "3px 9px", borderRadius: "10px" }}>{sourceLabel[s.source] || s.source}</span>}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginBottom: "10px" }}>
        <div style={{ background: riskColor + "10", border: `1px solid ${riskColor}25`, borderRadius: "10px", padding: "9px 11px" }}>
          <div style={{ fontSize: "9px", color: "#94a3b8", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.5px" }}>Inspection Score</div>
          <div style={{ fontSize: "22px", color: riskColor, fontWeight: 900, lineHeight: 1.1 }}>{s.risk_score ?? (s.confidence ? Math.round(s.confidence * 100) : "—")}<span style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 500 }}>/100</span></div>
          {(s.risk_score != null || s.confidence != null) && (
            <div style={{ height: 5, background: "#e2e8f0", borderRadius: 999, marginTop: 5, overflow: "hidden" }}>
              <div style={{ height: "100%", width: `${Math.min((s.risk_score ?? Math.round(s.confidence * 100)), 100)}%`, background: riskColor, borderRadius: 999 }} />
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

      <div style={{ fontFamily: "monospace", fontSize: "10px", color: "#94a3b8", marginBottom: "10px", textAlign: "center" }}>
        📍 {s.lat ?? s.latitude}, {s.lon ?? s.longitude}
      </div>

      {s.id && (
        <button onClick={onOpen}
          style={{ background: "linear-gradient(135deg, #1d4ed8, #2563eb)", color: "white", border: "none", padding: "9px 14px", borderRadius: "9px", cursor: "pointer", fontSize: "12px", fontWeight: 700, width: "100%", boxShadow: "0 2px 8px rgba(37,99,235,0.35)" }}>
          Открыть карточку объекта →
        </button>
      )}
    </div>
  );
}

function Row({ icon, label, value, highlight = false }: { icon: string; label: string; value: string; highlight?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" }}>
      <span style={{ fontSize: "11px", color: "#64748b", display: "flex", alignItems: "center", gap: "4px" }}><span>{icon}</span>{label}</span>
      <span style={{ fontSize: "11px", fontWeight: 700, color: highlight ? "#16a34a" : "#0f172a", background: highlight ? "#dcfce7" : "transparent", padding: highlight ? "1px 7px" : undefined, borderRadius: highlight ? "8px" : undefined }}>{value}</span>
    </div>
  );
}

export default function Detection() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const urlLat = searchParams.get("lat");
  const urlLng = searchParams.get("lng");
  const urlId  = searchParams.get("id");
  const urlName = searchParams.get("name") ?? "";
  const fromObject = !!(urlLat && urlLng);

  const [lat, setLat] = useState(urlLat ?? "42.85");
  const [lon, setLon] = useState(urlLng ?? "71.37");
  const [radius, setRadius] = useState("50");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<FoundStructure[] | null>(null);
  const [selected, setSelected] = useState<FoundStructure | null>(null);
  const [searched, setSearched] = useState(false);
  const [flyTarget, setFlyTarget] = useState<{ lat: number; lon: number; zoom: number } | null>(
    fromObject ? { lat: parseFloat(urlLat!), lon: parseFloat(urlLng!), zoom: 15 } : null
  );
  const [fullStructures, setFullStructures] = useState<any[]>([]);

  useEffect(() => {
    getStructures({ limit: "2000" }).then((res) => {
      if (Array.isArray(res.data)) setFullStructures(res.data);
    }).catch(() => {});
  }, []);

  const pinnedMarker: any = fromObject ? (() => {
    const full = fullStructures.find((s) => String(s.id) === String(urlId));
    return full ? { ...full, lat: full.latitude, lon: full.longitude, source: "osm" } : {
      id: urlId ? Number(urlId) : undefined,
      name: urlName,
      type: "Объект",
      lat: parseFloat(urlLat!),
      lon: parseFloat(urlLng!),
      confidence: 1,
      source: "osm",
      condition: "good",
    };
  })() : null;

  const handleSearch = async () => {
    setLoading(true);
    setResults(null);
    setSelected(null);
    setFlyTarget({ lat: parseFloat(lat), lon: parseFloat(lon), zoom: 10 });
    try {
      const res = await axios.get(`http://localhost:8000/api/detection/search`, {
        params: { lat, lon, radius_km: radius }
      });
      const found = (res.data.structures || []).map((r: FoundStructure) => {
        const full = fullStructures.find((s) => s.id === r.id || (s.name === r.name && Math.abs((s.latitude ?? 0) - r.lat) < 0.02 && Math.abs((s.longitude ?? 0) - r.lon) < 0.02));
        return full ? { ...full, ...r, lat: r.lat, lon: r.lon } : r;
      });
      setResults(found);
    } catch {
      const found = MOCK_RESULTS.map((r) => {
        const full = fullStructures.find((s) => s.id === r.id);
        return full ? { ...full, ...r, lat: r.lat, lon: r.lon } : r;
      });
      await new Promise(r => setTimeout(r, 1000));
      setResults(found);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "10px 14px", borderRadius: "var(--radius-sm)", border: "1px solid var(--gray-200)", background: "white", color: "var(--gray-800)", fontSize: "14px", outline: "none", boxShadow: "var(--shadow-sm)", width: "100%",
  };

  const confidencePct = (c: number) => Math.round(c * 100);
  const confidenceColor = (c: number) => c >= 0.85 ? "#16a34a" : c >= 0.7 ? "#d97706" : "#dc2626";

  return (
    <div style={{ padding: "32px", background: "var(--gray-50)", minHeight: "100vh" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", color: "var(--gray-900)", marginBottom: "4px" }}>🔍 Алгоритм обнаружения</h1>
        <p style={{ color: "var(--gray-500)", fontSize: "13px" }}>Поиск гидросооружений по координатам — OSM, спутниковые снимки, анализ рельефа</p>
      </div>

      {fromObject && (
        <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px", padding: "14px 18px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "12px" }}>
          <span style={{ fontSize: "20px" }}>📍</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#15803d", fontSize: "14px" }}>{urlName}</div>
            <div style={{ fontFamily: "monospace", color: "#166534", fontSize: "13px" }}>{urlLat}, {urlLng}</div>
          </div>
          <button onClick={() => navigate(`/object/${urlId}`)} style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: "#15803d", color: "white", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>← К объекту</button>
        </div>
      )}

      <div style={{ display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap" }}>
        {Object.entries(sourceLabel).map(([key, label]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: "7px", background: "white", padding: "6px 14px", borderRadius: "20px", border: `1px solid ${sourceColor[key]}44`, boxShadow: "var(--shadow-sm)" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: sourceColor[key] }} />
            <span style={{ fontSize: "12px", color: "var(--gray-600)", fontWeight: 500 }}>{label}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "340px 1fr", gap: "20px", alignItems: "start" }}>
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "20px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "14px", color: "var(--gray-900)", margin: "0 0 16px", fontWeight: 700 }}>📍 Параметры поиска</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--gray-500)", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: "5px" }}>Широта (Latitude)</label>
                <input value={lat} onChange={e => setLat(e.target.value)} style={inputStyle} placeholder="42.85" />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--gray-500)", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: "5px" }}>Долгота (Longitude)</label>
                <input value={lon} onChange={e => setLon(e.target.value)} style={inputStyle} placeholder="71.37" />
              </div>
              <div>
                <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--gray-500)", letterSpacing: "0.5px", textTransform: "uppercase", display: "block", marginBottom: "5px" }}>Радиус поиска (км)</label>
                <input value={radius} onChange={e => setRadius(e.target.value)} style={inputStyle} type="number" min="5" max="200" />
              </div>
              <button onClick={handleSearch} disabled={loading}
                style={{ padding: "12px", borderRadius: "var(--radius-sm)", background: loading ? "var(--gray-300)" : "linear-gradient(135deg, #1d4ed8, #0ea5e9)", color: "white", border: "none", fontWeight: 700, fontSize: "14px", cursor: loading ? "default" : "pointer", boxShadow: loading ? "none" : "var(--shadow-blue)", display: "flex", alignItems: "center", justifyContent: "center", gap: "8px" }}>
                {loading ? (<><span style={{ display: "inline-block", width: 16, height: 16, border: "2px solid white", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />Анализ...</>) : "🔍 Начать поиск"}
              </button>
            </div>
          </div>

          {results && (
            <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "16px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", maxHeight: "460px", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 style={{ fontSize: "14px", color: "var(--gray-900)", margin: 0, fontWeight: 700 }}>Найдено объектов</h3>
                <span style={{ background: "var(--primary-bg)", color: "var(--primary)", padding: "3px 10px", borderRadius: "20px", fontSize: "12px", fontWeight: 700, border: "1px solid #bfdbfe" }}>{results.length}</span>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
                {results.map((r, i) => (
                  <div key={i} onClick={() => { setSelected(r); setFlyTarget({ lat: r.lat, lon: r.lon, zoom: 14 }); }}
                    style={{ padding: "12px", borderRadius: "var(--radius-sm)", border: selected === r ? "1px solid var(--primary)" : "1px solid var(--gray-200)", background: selected === r ? "var(--primary-bg)" : "var(--gray-50)", cursor: "pointer" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                      <span style={{ fontWeight: 600, color: "var(--gray-800)", fontSize: "13px", flex: 1 }}>{r.name}</span>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: confidenceColor(r.confidence), background: confidenceColor(r.confidence) + "18", padding: "2px 7px", borderRadius: "10px", marginLeft: "6px", flexShrink: 0 }}>{confidencePct(r.confidence)}%</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "11px", color: "var(--gray-500)", background: "white", padding: "2px 8px", borderRadius: "5px", border: "1px solid var(--gray-200)" }}>{r.type}</span>
                      <span style={{ fontSize: "11px", color: sourceColor[r.source] || "var(--gray-500)", background: (sourceColor[r.source] || "#888") + "15", padding: "2px 8px", borderRadius: "5px" }}>{sourceLabel[r.source] || r.source}</span>
                      {r.risk_level && <span style={{ fontSize: "11px", color: RISK_COLORS[r.risk_level], background: RISK_COLORS[r.risk_level] + "15", padding: "2px 8px", borderRadius: "5px", fontWeight: 700 }}>{RISK_LABELS[r.risk_level] || r.risk_level}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div style={{ background: "white", borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", height: "640px" }}>
          <MapContainer center={[parseFloat(lat) || 42.85, parseFloat(lon) || 71.37]} zoom={fromObject ? 15 : 9} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
            {flyTarget && <FlyTo lat={flyTarget.lat} lon={flyTarget.lon} zoom={flyTarget.zoom} />}

            {pinnedMarker && (
              <CircleMarker center={[pinnedMarker.lat, pinnedMarker.lon]} radius={14} fillColor="#15803d" color="white" weight={3} fillOpacity={1}>
                <Popup maxWidth={340} minWidth={300}>
                  <DataPopup s={pinnedMarker} onOpen={() => pinnedMarker.id && navigate(`/object/${pinnedMarker.id}`)} />
                </Popup>
              </CircleMarker>
            )}

            {searched && (
              <CircleMarker center={[parseFloat(lat), parseFloat(lon)]} radius={8} fillColor="#1d4ed8" color="white" weight={2} fillOpacity={1}>
                <Popup><div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }}><b>📍 Центр поиска</b><br />{lat}, {lon}<br />Радиус: {radius} км</div></Popup>
              </CircleMarker>
            )}

            {(results || []).map((r, i) => r.lat && r.lon ? (
              <CircleMarker key={i} center={[r.lat, r.lon]} radius={selected === r ? 16 : 12} fillColor={r.condition ? conditionColor[r.condition] : sourceColor[r.source] || "#888"} color="white" weight={2} fillOpacity={selected === r ? 1 : 0.85} eventHandlers={{ click: () => { setSelected(r); setFlyTarget({ lat: r.lat, lon: r.lon, zoom: 14 }); } }}>
                <Popup maxWidth={340} minWidth={300}>
                  <DataPopup s={r} onOpen={() => r.id && navigate(`/object/${r.id}`)} />
                </Popup>
              </CircleMarker>
            ) : null)}
          </MapContainer>
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
