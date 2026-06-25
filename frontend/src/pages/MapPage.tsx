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
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--gray-50)" }}>
      {/* Top bar */}
      <div style={{ padding: "16px 24px", background: "white", borderBottom: "1px solid var(--gray-200)", display: "flex", gap: "8px", flexWrap: "wrap", alignItems: "center", boxShadow: "var(--shadow-sm)" }}>
        <span style={{ fontFamily: "Manrope", fontWeight: 700, fontSize: "15px", color: "var(--gray-900)", marginRight: "8px" }}>🗺️ Карта объектов</span>
        <div style={{ width: 1, height: 20, background: "var(--gray-200)", margin: "0 8px" }} />
        {Object.entries(conditionColor).map(([key, color]) => (
          <div key={key} style={{ display: "flex", alignItems: "center", gap: "6px", background: "var(--gray-50)", padding: "5px 12px", borderRadius: "20px", border: "1px solid var(--gray-200)" }}>
            <div style={{ width: 10, height: 10, borderRadius: "50%", background: color }} />
            <span style={{ fontSize: "12px", color: "var(--gray-600)", fontWeight: 500 }}>{conditionLabel[key]}</span>
          </div>
        ))}
      </div>
      <div style={{ flex: 1 }}>
        <MapContainer center={[42.85, 71.37]} zoom={9} style={{ height: "100%", width: "100%" }}>
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          {structures.map((s) => (
            <CircleMarker key={s.id} center={[s.latitude, s.longitude]} radius={14}
              fillColor={conditionColor[s.condition]} color="white" weight={2} fillOpacity={0.9}>
              <Popup>
                <div style={{ minWidth: "170px", fontFamily: "Inter, sans-serif" }}>
                  <div style={{ fontWeight: 700, fontSize: "14px", color: "#1e293b", marginBottom: "4px" }}>{s.name}</div>
                  <div style={{ color: "#64748b", fontSize: "12px", marginBottom: "6px" }}>{s.type} · {s.district}</div>
                  <div style={{ display: "inline-block", color: conditionColor[s.condition], fontWeight: 600, fontSize: "12px",
                    background: conditionColor[s.condition] + "18", padding: "3px 10px", borderRadius: "10px", marginBottom: "10px" }}>
                    {conditionLabel[s.condition]}
                  </div>
                  <br />
                  <button onClick={() => navigate(`/object/${s.id}`)}
                    style={{ background: "#1d4ed8", color: "white", border: "none", padding: "6px 14px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600 }}>
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
