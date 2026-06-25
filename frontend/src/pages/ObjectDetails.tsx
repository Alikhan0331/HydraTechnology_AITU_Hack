import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStructure } from "../api/structures";
import type { Structure } from "../api/structures";
import { conditionColor, conditionLabel } from "../utils/conditionColors";

interface Inspection { date: string; inspector: string; result: string; condition: string; }

const MOCK: any = {
  id: 1, name: "Большой Чуйский канал", type: "Канал", district: "Жамбылский",
  condition: "good", risk_level: "low", latitude: 42.85, longitude: 71.37,
  length_km: 120.5, year_built: 1958, last_inspection: "2024-03-15",
  description: "Главный ирригационный канал Жамбылского региона. Обеспечивает водоснабжение 45 000 га сельскохозяйственных угодий.",
  inspections: [
    { date: "2024-03-15", inspector: "Ахметов Б.", result: "Плановый осмотр. Нарушений не выявлено.", condition: "good" },
    { date: "2023-09-10", inspector: "Сейткали Д.", result: "Мелкие трещины в облицовке. Рекомендован ремонт.", condition: "monitoring" },
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
    <div style={{ padding: "32px", background: "var(--gray-50)", minHeight: "100vh" }}>
      {/* Back button */}
      <button onClick={() => navigate(-1)} style={{
        marginBottom: "24px", background: "white", border: "1px solid var(--gray-200)",
        padding: "8px 16px", borderRadius: "var(--radius-sm)", cursor: "pointer",
        color: "var(--gray-600)", fontSize: "13px", display: "flex", alignItems: "center",
        gap: "6px", boxShadow: "var(--shadow-sm)", fontWeight: 500
      }}>← Назад к каталогу</button>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 300px", gap: "20px" }}>
        {/* Main */}
        <div>
          {/* Header card */}
          <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "28px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", marginBottom: "16px" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h1 style={{ fontSize: "22px", color: "var(--gray-900)", margin: "0 0 8px" }}>{obj.name}</h1>
                <span style={{ background: "var(--primary-bg)", color: "var(--primary)", padding: "4px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, border: "1px solid #bfdbfe" }}>{obj.type}</span>
              </div>
              <span style={{
                background: conditionColor[obj.condition] + "18",
                color: conditionColor[obj.condition],
                padding: "8px 18px", borderRadius: "10px",
                fontWeight: 700, fontSize: "13px",
                border: `1px solid ${conditionColor[obj.condition]}30`
              }}>{conditionLabel[obj.condition]}</span>
            </div>

            {/* Photo */}
            <div style={{
              background: "var(--gray-50)", borderRadius: "var(--radius-md)", height: "200px",
              display: "flex", alignItems: "center", justifyContent: "center",
              border: "2px dashed var(--gray-200)", marginBottom: "20px", flexDirection: "column", gap: "8px"
            }}>
              <span style={{ fontSize: "48px" }}>📷</span>
              <span style={{ color: "var(--gray-400)", fontSize: "13px", fontWeight: 500 }}>Фото объекта</span>
            </div>

            {/* Info grid */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px", marginBottom: "20px" }}>
              {[
                { label: "📍 Район", value: obj.district },
                { label: "🌐 Координаты", value: `${obj.latitude}, ${obj.longitude}` },
                { label: "📏 Длина (км)", value: obj.length_km ?? "—" },
                { label: "🏗️ Год постройки", value: obj.year_built ?? "—" },
                { label: "🔍 Последний осмотр", value: obj.last_inspection ?? "—" },
                { label: "⚠️ Уровень риска", value: obj.risk_level },
              ].map((item) => (
                <div key={item.label} style={{ background: "var(--gray-50)", borderRadius: "var(--radius-sm)", padding: "14px", border: "1px solid var(--gray-200)" }}>
                  <div style={{ fontSize: "11px", color: "var(--gray-400)", marginBottom: "5px", fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontWeight: 700, color: "var(--gray-800)", fontSize: "14px" }}>{String(item.value)}</div>
                </div>
              ))}
            </div>

            {obj.description && (
              <div style={{ background: "var(--primary-bg)", borderRadius: "var(--radius-sm)", padding: "16px", border: "1px solid #bfdbfe" }}>
                <div style={{ fontSize: "11px", color: "var(--primary)", marginBottom: "6px", fontWeight: 700 }}>📝 Описание</div>
                <p style={{ color: "var(--gray-700)", lineHeight: 1.7, margin: 0, fontSize: "13px" }}>{obj.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Inspection history */}
        <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "20px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", height: "fit-content" }}>
          <h3 style={{ fontSize: "14px", color: "var(--gray-900)", margin: "0 0 16px" }}>📋 История обследований</h3>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {(obj.inspections || []).map((insp: Inspection, i: number) => (
              <div key={i} style={{
                background: "var(--gray-50)", borderRadius: "var(--radius-sm)", padding: "14px",
                border: "1px solid var(--gray-200)",
                borderLeft: `3px solid ${conditionColor[insp.condition]}`
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                  <span style={{ color: "var(--gray-500)", fontSize: "11px", fontWeight: 500 }}>{insp.date}</span>
                  <span style={{ color: conditionColor[insp.condition], fontSize: "11px", fontWeight: 700,
                    background: conditionColor[insp.condition] + "18", padding: "2px 8px", borderRadius: "10px" }}>
                    {conditionLabel[insp.condition]}
                  </span>
                </div>
                <div style={{ color: "var(--gray-500)", fontSize: "11px", marginBottom: "4px" }}>👤 {insp.inspector}</div>
                <div style={{ color: "var(--gray-700)", fontSize: "12px", lineHeight: 1.5 }}>{insp.result}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
