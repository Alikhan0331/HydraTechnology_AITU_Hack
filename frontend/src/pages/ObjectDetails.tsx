import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { getStructure, getStructureRisk, deleteStructure } from "../api/structures";
import { conditionColor, conditionLabel } from "../utils/conditionColors";

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";

interface Inspection { date: string; inspector: string; result: string; condition: string; }

const MOCK: any = {
  id: 1, name: "Большой Чуйский канал", type: "Канал", district: "Жамбылский",
  condition: "good", risk_level: "low", latitude: 42.85, longitude: 71.37,
  length_km: 120.5, year_built: 1958, last_inspection: "2024-03-15",
  description: "Главный ирригационный канал Жамбылского региона.",
  inspections: [
    { date: "2024-03-15", inspector: "Ахметов Б.", result: "Плановый осмотр. Нарушений не выявлено.", condition: "good" },
    { date: "2023-09-10", inspector: "Сейткали Д.", result: "Мелкие трещины. Рекомендован ремонт.", condition: "monitoring" },
  ]
};

const MOCK_RISK: any = {
  risk_score: 72,
  recommendation: "Требуется осмотр",
  next_inspection: "2024-09-15",
  factors: [
    { name: "Возраст сооружения", value: 66, weight: 0.25, score: 16 },
    { name: "Дата последнего осмотра", value: "2024-03-15", weight: 0.3, score: 20 },
    { name: "Текущее состояние", value: "Норма", weight: 0.3, score: 20 },
    { name: "Аварийность", value: "Низкая", weight: 0.15, score: 10 },
  ]
};

const statusColors: Record<string, string> = {
  "Норма": "#16a34a",
  "Требуется осмотр": "#d97706",
  "Требуется ремонт": "#ea580c",
  "Критическое состояние": "#dc2626",
};

function normalizeRisk(data: any) {
  if (!data) return MOCK_RISK;
  let factors = data.factors;
  if (!Array.isArray(factors)) {
    factors = factors && typeof factors === "object"
      ? Object.entries(factors).map(([name, val]: any) => ({ name, value: val?.value ?? val, weight: val?.weight ?? 0, score: val?.score ?? 0 }))
      : MOCK_RISK.factors;
  }
  return { ...MOCK_RISK, ...data, factors };
}

export default function ObjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [obj, setObj] = useState<any>(MOCK);
  const [risk, setRisk] = useState<any>(MOCK_RISK);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  useEffect(() => {
    if (id) {
      getStructure(Number(id)).then((res) => setObj({ ...MOCK, ...res.data })).catch(() => {});
      getStructureRisk(Number(id)).then((res) => setRisk(normalizeRisk(res.data))).catch(() => {});
    }
  }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await deleteStructure(Number(id));
      navigate("/catalog");
    } catch {
      alert("Ошибка при удалении");
      setDeleting(false);
      setShowDeleteModal(false);
    }
  };

  const recColor = statusColors[risk?.recommendation] || "#d97706";

  return (
    <div style={{ padding: "32px", background: "var(--gray-50)", minHeight: "100vh" }}>

      {/* Delete confirmation modal */}
      {showDeleteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "12px", padding: "32px", maxWidth: "400px", width: "90%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: "44px", marginBottom: "12px" }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: "18px", color: "#1e293b", marginBottom: "8px" }}>Удалить объект?</div>
            <div style={{ color: "#64748b", fontSize: "14px", marginBottom: "24px", lineHeight: 1.5 }}>
              «{obj.name}» будет удалён безвозвратно вместе со всей историей осмотров.
            </div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting}
                style={{ padding: "10px 24px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", color: "#475569", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>
                Отмена
              </button>
              <button onClick={handleDelete} disabled={deleting}
                style={{ padding: "10px 24px", borderRadius: "8px", border: "none", background: deleting ? "#fca5a5" : "#dc2626", color: "white", fontWeight: 700, fontSize: "14px", cursor: deleting ? "default" : "pointer" }}>
                {deleting ? "⏳ Удаление..." : "Да, удалить"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Top nav */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "10px" }}>
        <button onClick={() => navigate(-1)}
          style={{ background: "white", border: "1px solid var(--gray-200)", padding: "8px 16px", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--gray-600)", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", boxShadow: "var(--shadow-sm)", fontWeight: 500 }}>
          ← Назад
        </button>
        {/* ✅ КНОПКИ РЕДАКТИРОВАТЬ / УДАЛИТЬ */}
        <div style={{ display: "flex", gap: "8px" }}>
          <button
            onClick={() => navigate(`/edit/${id}`)}
            style={{ padding: "8px 18px", borderRadius: "var(--radius-sm)", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "#dbeafe"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "#eff6ff"}
          >
            ✏️ Редактировать
          </button>
          <button
            onClick={() => setShowDeleteModal(true)}
            style={{ padding: "8px 18px", borderRadius: "var(--radius-sm)", border: "1px solid #fecaca", background: "#fff5f5", color: "#dc2626", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "#fee2e2"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "#fff5f5"}
          >
            🗑️ Удалить
          </button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 320px", gap: "20px" }}>
        {/* Main */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "28px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "12px" }}>
              <div>
                <h1 style={{ fontSize: "22px", color: "var(--gray-900)", margin: "0 0 8px" }}>{obj.name}</h1>
                <span style={{ background: "var(--primary-bg)", color: "var(--primary)", padding: "4px 12px", borderRadius: "6px", fontSize: "12px", fontWeight: 600, border: "1px solid #bfdbfe" }}>{obj.type}</span>
              </div>
              <span style={{ background: conditionColor[obj.condition] + "18", color: conditionColor[obj.condition], padding: "8px 18px", borderRadius: "10px", fontWeight: 700, fontSize: "13px", border: `1px solid ${conditionColor[obj.condition]}30` }}>{conditionLabel[obj.condition]}</span>
            </div>
            <div style={{ background: "var(--gray-50)", borderRadius: "var(--radius-md)", height: "180px", display: "flex", alignItems: "center", justifyContent: "center", border: "2px dashed var(--gray-200)", marginBottom: "20px", flexDirection: "column", gap: "8px" }}>
              <span style={{ fontSize: "48px" }}>📷</span>
              <span style={{ color: "var(--gray-400)", fontSize: "13px", fontWeight: 500 }}>Фото объекта</span>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "12px" }}>
              {[
                { label: "📍 Район", value: obj.district },
                { label: "🌐 Координаты", value: `${obj.latitude}, ${obj.longitude}` },
                { label: "📏 Длина (км)", value: obj.length_km ?? "—" },
                { label: "🏗️ Год постройки", value: obj.year_built ?? "—" },
                { label: "🔍 Посл. осмотр", value: obj.last_inspection ?? "—" },
                { label: "⚠️ Уровень риска", value: obj.risk_level },
              ].map((item) => (
                <div key={item.label} style={{ background: "var(--gray-50)", borderRadius: "var(--radius-sm)", padding: "14px", border: "1px solid var(--gray-200)" }}>
                  <div style={{ fontSize: "11px", color: "var(--gray-400)", marginBottom: "5px", fontWeight: 600 }}>{item.label}</div>
                  <div style={{ fontWeight: 700, color: "var(--gray-800)", fontSize: "14px" }}>{String(item.value)}</div>
                </div>
              ))}
            </div>
          </div>

          {risk && (
            <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "24px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
              <h3 style={{ fontSize: "15px", color: "var(--gray-900)", margin: "0 0 16px" }}>🛡️ Модель риска и осмотра</h3>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
                <div style={{ background: "var(--gray-50)", borderRadius: "var(--radius-sm)", padding: "16px", border: "1px solid var(--gray-200)", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "var(--gray-400)", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Индекс риска</div>
                  <div style={{ fontSize: "36px", fontFamily: "Manrope", fontWeight: 900, color: recColor, lineHeight: 1 }}>{risk.risk_score}</div>
                  <div style={{ fontSize: "11px", color: "var(--gray-400)", marginTop: "4px" }}>из 100</div>
                </div>
                <div style={{ background: recColor + "0f", borderRadius: "var(--radius-sm)", padding: "16px", border: `1px solid ${recColor}30`, textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "var(--gray-400)", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>Статус</div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: recColor }}>{risk.recommendation}</div>
                </div>
                <div style={{ background: "var(--primary-bg)", borderRadius: "var(--radius-sm)", padding: "16px", border: "1px solid #bfdbfe", textAlign: "center" }}>
                  <div style={{ fontSize: "11px", color: "var(--gray-400)", marginBottom: "8px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px" }}>След. осмотр</div>
                  <div style={{ fontSize: "14px", fontWeight: 800, color: "var(--primary)" }}>{risk.next_inspection}</div>
                </div>
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {risk.factors.map((f: any, i: number) => (
                  <div key={i}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "12px", color: "var(--gray-600)", fontWeight: 500 }}>{f.name}</span>
                      <span style={{ fontSize: "12px", color: "var(--gray-400)" }}>{f.score} / {Math.round(f.weight * 100)}</span>
                    </div>
                    <div style={{ height: 6, background: "var(--gray-100)", borderRadius: 3, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${Math.min((f.score / (f.weight * 100)) * 100, 100)}%`, background: "var(--primary-light)", borderRadius: 3, transition: "width 0.5s" }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right column */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "20px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "14px", color: "var(--gray-900)", margin: "0 0 12px", fontWeight: 700 }}>📥 Экспорт отчёта</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { fmt: "csv", label: "Скачать CSV", icon: "📄", color: "#16a34a" },
                { fmt: "xlsx", label: "Скачать Excel", icon: "📊", color: "#1d4ed8" },
                { fmt: "pdf", label: "Скачать PDF", icon: "📃", color: "#dc2626" },
              ].map(({ fmt, label, icon, color }) => (
                <a key={fmt}
                  href={`${BASE_URL}/api/reports/structures.${fmt}?id=${id}`}
                  target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: `1px solid ${color}30`, background: color + "08", color, fontWeight: 600, fontSize: "13px", textDecoration: "none" }}
                  onMouseEnter={e => (e.currentTarget as HTMLAnchorElement).style.background = color + "18"}
                  onMouseLeave={e => (e.currentTarget as HTMLAnchorElement).style.background = color + "08"}
                >
                  <span>{icon}</span> {label}
                </a>
              ))}
            </div>
          </div>

          <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "20px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "14px", color: "var(--gray-900)", margin: "0 0 16px", fontWeight: 700 }}>📋 История обследований</h3>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(obj.inspections || []).map((insp: Inspection, i: number) => (
                <div key={i} style={{ background: "var(--gray-50)", borderRadius: "var(--radius-sm)", padding: "14px", border: "1px solid var(--gray-200)", borderLeft: `3px solid ${conditionColor[insp.condition]}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px" }}>
                    <span style={{ color: "var(--gray-500)", fontSize: "11px", fontWeight: 500 }}>{insp.date}</span>
                    <span style={{ color: conditionColor[insp.condition], fontSize: "11px", fontWeight: 700, background: conditionColor[insp.condition] + "18", padding: "2px 8px", borderRadius: "10px" }}>{conditionLabel[insp.condition]}</span>
                  </div>
                  <div style={{ color: "var(--gray-500)", fontSize: "11px", marginBottom: "4px" }}>👤 {insp.inspector}</div>
                  <div style={{ color: "var(--gray-700)", fontSize: "12px", lineHeight: 1.5 }}>{insp.result}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
