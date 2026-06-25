import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStructure } from "../api/structures";
import type { Structure } from "../api/structures";
import { conditionColor, conditionLabel } from "../utils/conditionColors";

interface Inspection {
  date: string;
  inspector: string;
  result: string;
  condition: string;
}

const MOCK: Structure & { inspections?: Inspection[] } = {
  id: 1, name: "Большой Чуйский канал", type: "Канал", district: "Жамбылский",
  condition: "good", risk_level: "low", latitude: 42.85, longitude: 71.37,
  length_km: 120.5, year_built: 1958, last_inspection: "2024-03-15",
  description: "Главный ирригационный канал Жамбылского региона. Обеспечивает водоснабжение 45 000 га сельскохозяйственных угодий.",
  inspections: [
    { date: "2024-03-15", inspector: "Ахметов Б.", result: "Плановый осмотр. Нарушений не выявлено.", condition: "good" },
    { date: "2023-09-10", inspector: "Сейткали Д.", result: "Мелкие трещины в облицовке. Рекомендован текущий ремонт.", condition: "monitoring" },
    { date: "2023-02-20", inspector: "Каратаев M.", result: "Состояние удовлетворительное.", condition: "good" },
  ]
};

export default function ObjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [obj, setObj] = useState<any>(MOCK);

  useEffect(() => {
    if (id) getStructure(Number(id)).then((res) => setObj({ ...MOCK, ...res.data })).catch(() => {});
  }, [id]);

  return (
    <div style={{ padding: "32px", minHeight: "100vh", background: "#0f172a" }}>
      <button onClick={() => navigate(-1)} style={{
        marginBottom: "24px", background: "transparent",
        border: "1px solid #334155", padding: "8px 16px",
        borderRadius: "8px", cursor: "pointer", color: "#94a3b8", fontSize: "14px"
      }}>← Назад</button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "24px" }}>
        {/* Main card */}
        <div style={{ background: "#1e293b", borderRadius: "20px", padding: "32px", border: "1px solid #334155" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h1 style={{ color: "white", fontSize: "22px", fontWeight: 800, margin: "0 0 8px" }}>{obj.name}</h1>
              <span style={{ background: "#0f172a", color: "#06b6d4", padding: "4px 12px", borderRadius: "8px", fontSize: "13px", border: "1px solid #164e63" }}>{obj.type}</span>
            </div>
            <span style={{
              background: conditionColor[obj.condition] + "22", color: conditionColor[obj.condition],
              padding: "10px 20px", borderRadius: "12px", fontWeight: 700, fontSize: "14px",
              border: `1px solid ${conditionColor[obj.condition]}44`
            }}>{conditionLabel[obj.condition]}</span>
          </div>

          {/* Photo placeholder */}
          <div style={{
            background: "#0f172a", borderRadius: "12px", height: "180px",
            display: "flex", alignItems: "center", justifyContent: "center",
            border: "2px dashed #334155", marginBottom: "20px", flexDirection: "column", gap: "8px"
          }}>
            <span style={{ fontSize: "40px" }}>📷</span>
            <span style={{ color: "#475569", fontSize: "13px" }}>Фото объекта</span>
          </div>

          {/* Info grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px", marginBottom: "24px" }}>
            {[
              { label: "📍 Район", value: obj.district },
              { label: "🌐 Координаты", value: `${obj.latitude}, ${obj.longitude}` },
              { label: "📏 Длина (км)", value: obj.length_km ?? "—" },
              { label: "🏗️ Год постройки", value: obj.year_built ?? "—" },
              { label: "🔍 Последний осмотр", value: obj.last_inspection ?? "—" },
              { label: "⚠️ Риск", value: obj.risk_level },
            ].map((item) => (
              <div key={item.label} style={{ background: "#0f172a", borderRadius: "10px", padding: "14px", border: "1px solid #334155" }}>
                <div style={{ fontSize: "11px", color: "#475569", marginBottom: "5px" }}>{item.label}</div>
                <div style={{ fontWeight: 600, color: "white" }}>{String(item.value)}</div>
              </div>
            ))}
          </div>

          {obj.description && (
            <div style={{ background: "#0f172a", borderRadius: "10px", padding: "16px", border: "1px solid #334155" }}>
              <div style={{ fontSize: "11px", color: "#475569", marginBottom: "6px" }}>📝 Описание</div>
              <p style={{ color: "#cbd5e1", lineHeight: 1.7, margin: 0, fontSize: "14px" }}>{obj.description}</p>
            </div>
          )}
        </div>

        {/* Inspection history */}
        <div style={{ background: "#1e293b", borderRadius: "20px", padding: "24px", border: "1px solid #334155", height: "fit-content" }}>
          <h3 style={{ color: "white", fontWeight: 700, margin: "0 0 20px", fontSize: "15px" }}>📋 История обследований</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {(obj.inspections || []).map((insp: Inspection, i: number) => (
              <div key={i} style={{
                background: "#0f172a", borderRadius: "10px", padding: "14px",
                border: `1px solid ${conditionColor[insp.condition]}44`,
                borderLeft: `3px solid ${conditionColor[insp.condition]}`
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "#64748b", fontSize: "12px" }}>{insp.date}</span>
                  <span style={{
                    color: conditionColor[insp.condition], fontSize: "11px",
                    background: conditionColor[insp.condition] + "22",
                    padding: "2px 8px", borderRadius: "10px"
                  }}>{conditionLabel[insp.condition]}</span>
                </div>
                <div style={{ color: "#94a3b8", fontSize: "12px", marginBottom: "4px" }}>👤 {insp.inspector}</div>
                <div style={{ color: "#cbd5e1", fontSize: "13px" }}>{insp.result}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
