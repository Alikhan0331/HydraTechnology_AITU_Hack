import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStructure } from "../api/structures";
import type { Structure } from "../api/structures";
import { conditionColor, conditionLabel } from "../utils/conditionColors";

const MOCK: Structure = {
  id: 1, name: "Большой Чуйский канал", type: "Канал", district: "Жамбылский",
  condition: "good", risk_level: "low", latitude: 42.85, longitude: 71.37,
  length_km: 120.5, year_built: 1958, last_inspection: "2024-03-15",
  description: "Главный ирригационный канал Жамбылского региона. Обеспечивает водоснабжение 45 000 га сельскохозяйственных угодий."
};

export default function ObjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [obj, setObj] = useState<Structure>(MOCK);

  useEffect(() => {
    if (id) getStructure(Number(id)).then((res) => setObj(res.data)).catch(() => {});
  }, [id]);

  return (
    <div style={{ padding: "32px", minHeight: "100vh", background: "#0f172a" }}>
      <button onClick={() => navigate(-1)} style={{
        marginBottom: "24px", background: "transparent",
        border: "1px solid #334155", padding: "8px 16px",
        borderRadius: "8px", cursor: "pointer", color: "#94a3b8", fontSize: "14px"
      }}>
        ← Назад
      </button>

      <div style={{ background: "#1e293b", borderRadius: "20px", padding: "32px", border: "1px solid #334155" }}>
        {/* Header */}
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "32px", flexWrap: "wrap", gap: "16px" }}>
          <div>
            <h1 style={{ color: "white", fontSize: "24px", fontWeight: 800, margin: "0 0 8px" }}>{obj.name}</h1>
            <span style={{ background: "#0f172a", color: "#06b6d4", padding: "4px 12px", borderRadius: "8px", fontSize: "13px", border: "1px solid #164e63" }}>
              {obj.type}
            </span>
          </div>
          <span style={{
            background: conditionColor[obj.condition] + "22",
            color: conditionColor[obj.condition],
            padding: "10px 20px", borderRadius: "12px",
            fontWeight: 700, fontSize: "14px",
            border: `1px solid ${conditionColor[obj.condition]}44`
          }}>
            {conditionLabel[obj.condition]}
          </span>
        </div>

        {/* Info grid */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px", marginBottom: "24px" }}>
          {[
            { label: "📍 Район", value: obj.district },
            { label: "🌐 Координаты", value: `${obj.latitude}, ${obj.longitude}` },
            { label: "📏 Длина (км)", value: obj.length_km ?? "—" },
            { label: "🏗️ Год постройки", value: obj.year_built ?? "—" },
            { label: "🔍 Последний осмотр", value: obj.last_inspection ?? "—" },
            { label: "⚠️ Уровень риска", value: obj.risk_level },
          ].map((item) => (
            <div key={item.label} style={{ background: "#0f172a", borderRadius: "12px", padding: "16px", border: "1px solid #334155" }}>
              <div style={{ fontSize: "12px", color: "#475569", marginBottom: "6px" }}>{item.label}</div>
              <div style={{ fontWeight: 600, color: "white", fontSize: "15px" }}>{String(item.value)}</div>
            </div>
          ))}
        </div>

        {obj.description && (
          <div style={{ background: "#0f172a", borderRadius: "12px", padding: "20px", border: "1px solid #334155" }}>
            <div style={{ fontSize: "12px", color: "#475569", marginBottom: "8px" }}>📝 Описание</div>
            <p style={{ color: "#cbd5e1", lineHeight: 1.7, margin: 0 }}>{obj.description}</p>
          </div>
        )}
      </div>
    </div>
  );
}
