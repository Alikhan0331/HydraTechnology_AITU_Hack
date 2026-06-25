import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStructure } from "../api/structures";
import type { Structure } from "../api/structures";
import { conditionColor, conditionLabel } from "../utils/conditionColors";

const MOCK: Structure = {
  id: 1, name: "Большой Чуйский канал", type: "Канал", district: "Жамбылский",
  condition: "good", risk_level: "low", latitude: 42.85, longitude: 71.37,
  length_km: 120.5, year_built: 1958, last_inspection: "2024-03-15",
  description: "Главный ирригационный канал Жамбылского региона."
};

export default function ObjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [obj, setObj] = useState<Structure>(MOCK);

  useEffect(() => {
    if (id) getStructure(Number(id)).then((res) => setObj(res.data)).catch(() => {});
  }, [id]);

  return (
    <div style={{ padding: "32px", background: "#f1f5f9", minHeight: "100vh" }}>
      <button onClick={() => navigate(-1)}
        style={{ marginBottom: "20px", background: "transparent", border: "1px solid #cbd5e1", padding: "8px 16px", borderRadius: "8px", cursor: "pointer" }}>
        ← Назад
      </button>
      <div style={{ background: "white", borderRadius: "16px", padding: "32px", boxShadow: "0 2px 8px rgba(0,0,0,0.08)" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px" }}>
          <div>
            <h1 style={{ color: "#1e293b", marginBottom: "8px" }}>{obj.name}</h1>
            <span style={{ background: "#e0f2fe", color: "#0369a1", padding: "4px 12px", borderRadius: "20px", fontSize: "14px" }}>
              {obj.type}
            </span>
          </div>
          <span style={{
            background: conditionColor[obj.condition] + "22",
            color: conditionColor[obj.condition],
            padding: "8px 16px", borderRadius: "20px", fontWeight: 700, fontSize: "15px"
          }}>
            {conditionLabel[obj.condition]}
          </span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: "16px" }}>
          {[
            { label: "📍 Район", value: obj.district },
            { label: "🌐 Координаты", value: `${obj.latitude}, ${obj.longitude}` },
            { label: "📏 Длина (км)", value: obj.length_km ?? "—" },
            { label: "🏗️ Год постройки", value: obj.year_built ?? "—" },
            { label: "🔍 Последний осмотр", value: obj.last_inspection ?? "—" },
            { label: "⚠️ Уровень риска", value: obj.risk_level },
          ].map((item) => (
            <div key={item.label} style={{ background: "#f8fafc", borderRadius: "10px", padding: "16px" }}>
              <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "4px" }}>{item.label}</div>
              <div style={{ fontWeight: 600, color: "#1e293b" }}>{String(item.value)}</div>
            </div>
          ))}
        </div>
        {obj.description && (
          <div style={{ marginTop: "24px", background: "#f8fafc", borderRadius: "10px", padding: "16px" }}>
            <div style={{ fontSize: "13px", color: "#6b7280", marginBottom: "6px" }}>📝 Описание</div>
            <p style={{ color: "#1e293b", lineHeight: 1.6 }}>{obj.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
