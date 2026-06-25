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
    <div style={{ height: "calc(100vh - 60px)", display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "12px 24px", background: "white", borderBottom: "1px solid #e2e8f0", display: "flex", gap: "20px", flexWrap: "wrap" }}>
        {Object.entries(conditionColor).map(([key, color]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <div style={{ width: 14, height: 14, borderRadius: "50%", background: color }} />
            <span style={{ fontSize: "13px", color: "#374151" }}>{conditionLabel[key]}</span>
          </div>
        ))}
      </div>
      <MapContainer center={[42.85, 71.37]} zoom={9} style={{ flex: 1 }}>
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        {structures.map((s) => (
          <CircleMarker
            key={s.id}
            center={[s.latitude, s.longitude]}
            radius={12}
            fillColor={conditionColor[s.condition]}
            color="white"
            weight={2}
            fillOpacity={0.85}
          >
            <Popup>
              <div style={{ minWidth: "160px" }}>
                <strong>{s.name}</strong><br />
                <span style={{ color: "#6b7280", fontSize: "13px" }}>{s.type} · {s.district}</span><br />
                <span style={{ color: conditionColor[s.condition], fontWeight: 600 }}>
                  {conditionLabel[s.condition]}
                </span><br />
                <button
                  onClick={() => navigate(`/object/${s.id}`)}
                  style={{ marginTop: "8px", background: "#1e40af", color: "white", border: "none", padding: "4px 10px", borderRadius: "6px", cursor: "pointer", fontSize: "12px" }}
                >
                  Подробнее →
                </button>
              </div>
            </Popup>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
