import { useEffect, useState } from "react";
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
];

export default function MapPage() {
  const [structures, setStructures] = useState<Structure[]>(MOCK);
  const navigate = useNavigate();

  useEffect(() => {
    getMapData().then((res) => setStructures(res.data)).catch(() => {});
  }, []);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "#0f172a" }}>
      {/* Header */}
      <div style={{ padding: "20px 32px", background: "#0f172a", borderBottom: "1px solid #1e293b" }}>
        <h1 style={{ color: "white", fontSize: "20px", fontWeight: 700, margin: "0 0 12px" }}>🗺️ Карта объектов</h1>
        <div style={{ display: "flex", gap: "20px", flexWrap: "wrap" }}>
          {Object.entries(conditionColor).map(([key, color]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <div style={{ width: 12, height: 12, borderRadius: "50%", background: color, boxShadow: `0 0 6px ${color}` }} />
              <span style={{ fontSize: "13px", color: "#94a3b8" }}>{conditionLabel[key]}</span>
            </div>
          ))}
        </div>
      </div>
      <div style={{ flex: 1, borderRadius: "0", overflow: "hidden" }}>
        <MapContainer center={[42.85, 71.37]} zoom={9} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
            attribution='&copy; Stadia Maps'
          />
          {structures.map((s) => (
            <CircleMarker
              key={s.id}
              center={[s.latitude, s.longitude]}
              radius={14}
              fillColor={conditionColor[s.condition]}
              color={conditionColor[s.condition]}
              weight={2}
              fillOpacity={0.9}
            >
              <Popup>
                <div style={{ minWidth: "160px", fontFamily: "sans-serif" }}>
                  <strong style={{ fontSize: "14px" }}>{s.name}</strong><br />
                  <span style={{ color: "#6b7280", fontSize: "12px" }}>{s.type} · {s.district}</span><br />
                  <span style={{ color: conditionColor[s.condition], fontWeight: 600, fontSize: "12px" }}>
                    {conditionLabel[s.condition]}
                  </span><br />
                  <button
                    onClick={() => navigate(`/object/${s.id}`)}
                    style={{ marginTop: "8px", background: "#1d4ed8", color: "white", border: "none", padding: "5px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
                  >
                    Подробнее →
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
