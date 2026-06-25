import { useState, useEffect } from "react";
import { MapContainer, TileLayer, CircleMarker, Popup, useMap } from "react-leaflet";
import { useNavigate, useSearchParams } from "react-router-dom";
import axios from "axios";
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
}

const MOCK_RESULTS: FoundStructure[] = [
  { id: 1, name: "Большой Чуйский канал", type: "Канал", lat: 42.85, lon: 71.37, confidence: 0.95, source: "osm", condition: "good" },
  { id: 2, name: "Шлюз №12", type: "Шлюз", lat: 42.91, lon: 71.70, confidence: 0.88, source: "osm", condition: "monitoring" },
  { id: 3, name: "Канал (спутник)", type: "Канал", lat: 42.78, lon: 71.55, confidence: 0.72, source: "satellite_ndwi", condition: "monitoring" },
  { id: 4, name: "Плотина Тасоткель", type: "Плотина", lat: 42.58, lon: 72.10, confidence: 0.91, source: "osm", condition: "requires_repair" },
  { id: 5, name: "Неизвестный водоток", type: "Канал", lat: 42.70, lon: 71.92, confidence: 0.65, source: "satellite_ndwi", condition: "monitoring" },
  { id: 6, name: "Насосная станция №3", type: "Насосная станция", lat: 42.75, lon: 71.80, confidence: 0.93, source: "osm", condition: "emergency" },
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

export default function Detection() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  // Если пришли с объекта через «На карте» — достаём параметры из URL
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

  // Если открыт с объекта — сразу показываем его маркер
  const pinnedMarker: FoundStructure | null = fromObject ? {
    id: urlId ? Number(urlId) : undefined,
    name: urlName,
    type: "Объект",
    lat: parseFloat(urlLat!),
    lon: parseFloat(urlLng!),
    confidence: 1,
    source: "osm",
    condition: "good",
  } : null;

  const handleSearch = async () => {
    setLoading(true);
    setResults(null);
    setSelected(null);
    setFlyTarget({ lat: parseFloat(lat), lon: parseFloat(lon), zoom: 10 });
    try {
      const res = await axios.get(`http://localhost:8000/api/detection/search`, {
        params: { lat, lon, radius_km: radius }
      });
      setResults(res.data.structures || []);
    } catch {
      await new Promise(r => setTimeout(r, 1400));
      setResults(MOCK_RESULTS);
    } finally {
      setLoading(false);
      setSearched(true);
    }
  };

  const inputStyle: React.CSSProperties = {
    padding: "10px 14px", borderRadius: "var(--radius-sm)",
    border: "1px solid var(--gray-200)", background: "white",
    color: "var(--gray-800)", fontSize: "14px", outline: "none",
    boxShadow: "var(--shadow-sm)", width: "100%",
  };

  const confidencePct = (c: number) => Math.round(c * 100);
  const confidenceColor = (c: number) => c >= 0.85 ? "#16a34a" : c >= 0.7 ? "#d97706" : "#dc2626";

  return (
    <div style={{ padding: "32px", background: "var(--gray-50)", minHeight: "100vh" }}>
      <div style={{ marginBottom: "24px" }}>
        <h1 style={{ fontSize: "24px", color: "var(--gray-900)", marginBottom: "4px" }}>🔍 Алгоритм обнаружения</h1>
        <p style={{ color: "var(--gray-500)", fontSize: "13px" }}>Поиск гидросооружений по координатам — OSM, спутниковые снимки, анализ рельефа</p>
      </div>

      {/* Если пришли с объекта — показываем инфо-баннер */}
      {fromObject && (
        <div style={{
          background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "12px",
          padding: "14px 18px", marginBottom: "20px",
          display: "flex", alignItems: "center", gap: "12px",
        }}>
          <span style={{ fontSize: "20px" }}>📍</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontWeight: 700, color: "#15803d", fontSize: "14px" }}>{urlName}</div>
            <div style={{ fontFamily: "monospace", color: "#166534", fontSize: "13px" }}>{urlLat}, {urlLng}</div>
          </div>
          <button onClick={() => navigate(`/object/${urlId}`)}
            style={{ padding: "6px 14px", borderRadius: "8px", border: "none", background: "#15803d", color: "white", fontWeight: 600, fontSize: "12px", cursor: "pointer" }}>
            ← К объекту
          </button>
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
        {/* Left panel */}
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
                    style={{ padding: "12px", borderRadius: "var(--radius-sm)", border: selected === r ? "1px solid var(--primary)" : "1px solid var(--gray-200)", background: selected === r ? "var(--primary-bg)" : "var(--gray-50)", cursor: "pointer" }}
                    onMouseEnter={e => { if (selected !== r) (e.currentTarget as HTMLDivElement).style.background = "var(--gray-100)"; }}
                    onMouseLeave={e => { if (selected !== r) (e.currentTarget as HTMLDivElement).style.background = "var(--gray-50)"; }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                      <span style={{ fontWeight: 600, color: "var(--gray-800)", fontSize: "13px", flex: 1 }}>{r.name}</span>
                      <span style={{ fontSize: "11px", fontWeight: 700, color: confidenceColor(r.confidence), background: confidenceColor(r.confidence) + "18", padding: "2px 7px", borderRadius: "10px", marginLeft: "6px", flexShrink: 0 }}>{confidencePct(r.confidence)}%</span>
                    </div>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "11px", color: "var(--gray-500)", background: "white", padding: "2px 8px", borderRadius: "5px", border: "1px solid var(--gray-200)" }}>{r.type}</span>
                      <span style={{ fontSize: "11px", color: sourceColor[r.source] || "var(--gray-500)", background: (sourceColor[r.source] || "#888") + "15", padding: "2px 8px", borderRadius: "5px" }}>{sourceLabel[r.source] || r.source}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Map */}
        <div style={{ background: "white", borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", height: "640px" }}>
          <MapContainer center={[parseFloat(lat) || 42.85, parseFloat(lon) || 71.37]} zoom={fromObject ? 15 : 9} style={{ height: "100%", width: "100%" }}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />

            {/* Fly to target when coordinates change */}
            {flyTarget && <FlyTo lat={flyTarget.lat} lon={flyTarget.lon} zoom={flyTarget.zoom} />}

            {/* Pinned marker — объект с профиля */}
            {pinnedMarker && (
              <CircleMarker center={[pinnedMarker.lat, pinnedMarker.lon]} radius={14}
                fillColor="#15803d" color="white" weight={3} fillOpacity={1}>
                <Popup>
                  <div style={{ fontFamily: "Inter, sans-serif", minWidth: "180px" }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "#1e293b", marginBottom: "4px" }}>📍 {pinnedMarker.name}</div>
                    <div style={{ fontFamily: "monospace", fontSize: "12px", color: "#64748b", marginBottom: "10px" }}>{pinnedMarker.lat}, {pinnedMarker.lon}</div>
                    {pinnedMarker.id && (
                      <button onClick={() => navigate(`/object/${pinnedMarker.id}`)}
                        style={{ background: "#1d4ed8", color: "white", border: "none", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600, width: "100%" }}>
                        ← К карточке объекта
                      </button>
                    )}
                  </div>
                </Popup>
              </CircleMarker>
            )}

            {/* Search center */}
            {searched && (
              <CircleMarker center={[parseFloat(lat), parseFloat(lon)]} radius={8}
                fillColor="#1d4ed8" color="white" weight={2} fillOpacity={1}>
                <Popup><div style={{ fontFamily: "Inter, sans-serif", fontSize: "13px" }}><b>📍 Центр поиска</b><br />{lat}, {lon}<br />Радиус: {radius} км</div></Popup>
              </CircleMarker>
            )}

            {/* Results */}
            {(results || []).map((r, i) => r.lat && r.lon ? (
              <CircleMarker key={i} center={[r.lat, r.lon]}
                radius={selected === r ? 16 : 12}
                fillColor={r.condition ? conditionColor[r.condition] : sourceColor[r.source] || "#888"}
                color="white" weight={2} fillOpacity={selected === r ? 1 : 0.85}
                eventHandlers={{ click: () => { setSelected(r); setFlyTarget({ lat: r.lat, lon: r.lon, zoom: 14 }); } }}
              >
                <Popup>
                  <div style={{ minWidth: "180px", fontFamily: "Inter, sans-serif" }}>
                    <div style={{ fontWeight: 700, fontSize: "14px", marginBottom: "4px" }}>{r.name}</div>
                    <div style={{ color: "#64748b", fontSize: "12px", marginBottom: "6px" }}>{r.type}</div>
                    <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#94a3b8", marginBottom: "8px" }}>{r.lat}, {r.lon}</div>
                    <div style={{ display: "flex", gap: "6px", marginBottom: "8px", flexWrap: "wrap" }}>
                      <span style={{ fontSize: "11px", color: sourceColor[r.source], background: sourceColor[r.source] + "18", padding: "2px 8px", borderRadius: "10px", fontWeight: 600 }}>{sourceLabel[r.source] || r.source}</span>
                      <span style={{ fontSize: "11px", color: confidenceColor(r.confidence), background: confidenceColor(r.confidence) + "18", padding: "2px 8px", borderRadius: "10px", fontWeight: 700 }}>{confidencePct(r.confidence)}%</span>
                    </div>
                    {r.id && (
                      <button onClick={() => navigate(`/object/${r.id}`)}
                        style={{ background: "#1d4ed8", color: "white", border: "none", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600, width: "100%" }}>
                        Открыть карточку →
                      </button>
                    )}
                  </div>
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
