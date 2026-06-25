import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  getStructure,
  getStructureRisk,
  recomputeRisk,
  deleteStructure,
  addInspection,
  getForecast,
} from "../api/structures";
import type { ForecastData } from "../api/structures";
import { conditionColor, conditionLabel } from "../utils/conditionColors";
import OperationHistory from "../components/OperationHistory";
import InspectionPriority from "../components/InspectionPriority";
import RiskScoreCard from "../components/RiskScoreCard";

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";

interface Inspection { date: string; inspector: string; result: string; condition: string; }

const MOCK: any = {
  id: 1, name: "Большой Чуйский канал", type: "Канал", type_code: "canal",
  district: "Жамбылский", locality: "с. Аса", water_source: "р. Чу",
  condition: "good", risk_level: "low", risk_score: 28,
  latitude: 42.85, longitude: 71.37, length_km: 120.5,
  length_earthen_km: 86.2, length_lined_km: 34.3, year_built: 1958,
  last_inspection: "2024-03-15", next_inspection: "2024-09-15",
  description: "Главный ирригационный канал Жамбылского региона.",
  significance: "regional", capacity: 18.5, area_ha: 12400,
  efficiency_design: 0.82, efficiency_actual: 0.73, wear_percent: 41,
  structures_count: 12, cadastral_number: "12-345-678-901",
  state_act: "ACT-2021-44", source: "dataset", verification_status: "verified",
  inspections: [
    { date: "2024-03-15", inspector: "Ахметов Б.", result: "Плановый осмотр. Нарушений не выявлено.", condition: "good" },
    { date: "2023-09-10", inspector: "Сейткали Д.", result: "Мелкие трещины. Рекомендован ремонт облицовки.", condition: "monitoring" },
  ]
};

const MOCK_RISK: any = {
  risk_score: 72, recommendation: "Требуется осмотр", next_inspection: "2024-09-15",
  factors: [
    { name: "Возраст сооружения", value: 66, weight: 22, score: 16 },
    { name: "Текущее состояние", value: "Норма", weight: 38, score: 20 },
    { name: "Износ конструкции", value: "41%", weight: 18, score: 12 },
    { name: "Потеря эффективности", value: "9%", weight: 12, score: 8 },
    { name: "Давность осмотра", value: "15 мес.", weight: 10, score: 6 },
  ]
};

const statusColors: Record<string, string> = {
  "Норма": "#16a34a", "Требуется осмотр": "#d97706",
  "Требуется ремонт": "#ea580c", "Критическое состояние": "#dc2626",
};
const riskLevelLabel: Record<string, string> = {
  low: "Низкий", medium: "Средний", high: "Высокий", critical: "Критический",
};
const riskLevelColor: Record<string, string> = {
  low: "#16a34a", medium: "#d97706", high: "#ea580c", critical: "#dc2626",
};
const significanceLabel: Record<string, string> = {
  local: "Местный", regional: "Региональный", national: "Национальный",
};
const sourceLabel: Record<string, string> = {
  dataset: "Госдатасет", manual: "Ручной ввод", generated: "Сгенерировано системой",
};
const verificationLabel: Record<string, string> = {
  verified: "Проверено", pending: "На проверке", unverified: "Не проверено",
};

function normalizeRisk(data: any) {
  if (!data) return MOCK_RISK;
  let factors = data.factors;
  if (!Array.isArray(factors)) {
    factors = factors && typeof factors === "object"
      ? Object.entries(factors).flatMap(([name, val]: any) => {
          if (name === "weights" || name === "seasonal") return [];
          return [{ name, value: typeof val === "object" ? JSON.stringify(val) : val, weight: data.factors?.weights?.[name] ?? 0, score: 0 }];
        })
      : MOCK_RISK.factors;
  }
  return { ...MOCK_RISK, ...data, factors };
}

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <div style={{ padding: "10px 12px", borderRadius: "12px", background: color + "12", border: `1px solid ${color}28`, display: "flex", flexDirection: "column", gap: "3px", minWidth: 0 }}>
      <span style={{ fontSize: "10px", fontWeight: 700, letterSpacing: "0.7px", textTransform: "uppercase", color }}>{label}</span>
      <span style={{ fontSize: "14px", fontWeight: 800, color: "var(--gray-900)" }}>{value}</span>
    </div>
  );
}

function InfoRow({ label, value, mono = false }: { label: string; value: any; mono?: boolean }) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", padding: "10px 0", borderBottom: "1px dashed var(--gray-200)", alignItems: "center" }}>
      <span style={{ fontSize: "12px", color: "var(--gray-500)", fontWeight: 600 }}>{label}</span>
      <span style={{ fontSize: "13px", color: "var(--gray-800)", fontWeight: 700, fontFamily: mono ? "monospace" : "inherit", textAlign: "right" }}>{value ?? "—"}</span>
    </div>
  );
}

// ─── Predictive Infrastructure Engine Block ──────────────────────────────────
function PredictiveBlock({ structureId }: { structureId: number }) {
  const [data, setData] = useState<ForecastData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    setLoading(true);
    getForecast(structureId)
      .then(res => { setData(res.data); setError(false); })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [structureId]);

  if (loading) return (
    <div style={{ background: "white", borderRadius: "var(--radius-xl)", padding: "28px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", gap: "12px", color: "var(--gray-400)" }}>
      <span style={{ display: "inline-block", width: 18, height: 18, border: "2px solid #6366f1", borderTopColor: "transparent", borderRadius: "50%", animation: "spin 0.7s linear infinite" }} />
      <span style={{ fontWeight: 600, fontSize: "14px" }}>Predictive Engine анализирует объект...</span>
    </div>
  );

  if (error || !data) return (
    <div style={{ background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: "var(--radius-xl)", padding: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
      <span style={{ fontSize: "20px" }}>⚠️</span>
      <span style={{ fontSize: "13px", color: "#9a3412", fontWeight: 600 }}>Predictive Engine недоступен — нет данных для прогноза</span>
    </div>
  );

  const recColor = data.prob_critical >= 0.6 ? "#dc2626" : data.prob_critical >= 0.3 ? "#ea580c" : data.prob_critical >= 0.15 ? "#d97706" : "#16a34a";

  // Mini SVG sparkline
  const points = [data.current_risk, ...data.forecast.map(f => f.risk_score)];
  const maxP = Math.max(...points, 100);
  const svgW = 220; const svgH = 54;
  const ptCoords = points.map((v, i) => {
    const x = (i / (points.length - 1)) * (svgW - 20) + 10;
    const y = svgH - 8 - ((v / maxP) * (svgH - 16));
    return `${x},${y}`;
  });
  const polyline = ptCoords.join(" ");
  const area = `${ptCoords[0]} ${ptCoords.slice(1).join(" ")} ${svgW - 10},${svgH} 10,${svgH}`;

  return (
    <div style={{ background: "white", borderRadius: "var(--radius-xl)", padding: "24px", border: "1px solid #e0e7ff", boxShadow: "0 2px 16px rgba(99,102,241,0.08)", position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", top: -40, right: -40, width: 160, height: 160, borderRadius: "50%", background: "radial-gradient(circle, rgba(99,102,241,0.12), transparent 70%)", pointerEvents: "none" }} />

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px", flexWrap: "wrap", gap: "10px" }}>
        <div>
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
            <span style={{ fontSize: "18px" }}>🔮</span>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 900, color: "#1e1b4b" }}>Predictive Infrastructure Engine</h3>
          </div>
          <p style={{ margin: 0, fontSize: "12px", color: "#6366f1", fontWeight: 500 }}>{data.methodology}</p>
        </div>
        <span style={{ background: recColor + "18", color: recColor, border: `1px solid ${recColor}30`, padding: "6px 14px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, whiteSpace: "nowrap" }}>
          {data.recommendation}
        </span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "20px" }}>
        <div style={{ background: "#f8fafc", borderRadius: "14px", padding: "16px", border: "1px solid #e2e8f0", display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.7px" }}>Текущий риск</span>
          <span style={{ fontSize: "32px", fontWeight: 900, color: riskLevelColor[data.current_level] || "#64748b", lineHeight: 1 }}>{data.current_risk}</span>
          <span style={{ fontSize: "11px", color: riskLevelColor[data.current_level], fontWeight: 700 }}>{riskLevelLabel[data.current_level] || data.current_level}</span>
        </div>
        <div style={{ background: recColor + "08", borderRadius: "14px", padding: "16px", border: `1px solid ${recColor}22`, display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.7px" }}>Вероятность критич.</span>
          <span style={{ fontSize: "32px", fontWeight: 900, color: recColor, lineHeight: 1 }}>{Math.round(data.prob_critical * 100)}%</span>
          <span style={{ fontSize: "11px", color: recColor, fontWeight: 700 }}>за 24 месяца</span>
        </div>
        <div style={{ background: "#f0fdf4", borderRadius: "14px", padding: "16px", border: "1px solid #bbf7d0", display: "flex", flexDirection: "column", gap: "4px" }}>
          <span style={{ fontSize: "10px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.7px" }}>Остаточный ресурс</span>
          <span style={{ fontSize: "32px", fontWeight: 900, color: data.residual_life_years < 5 ? "#dc2626" : data.residual_life_years < 15 ? "#d97706" : "#16a34a", lineHeight: 1 }}>{data.residual_life_years}</span>
          <span style={{ fontSize: "11px", color: "#16a34a", fontWeight: 700 }}>лет службы</span>
        </div>
      </div>

      <div style={{ marginBottom: "16px" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "10px" }}>Прогноз деградации</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px" }}>
          {data.forecast.map(fp => {
            const fc = riskLevelColor[fp.risk_level] || "#64748b";
            const pct = Math.min(fp.risk_score, 100);
            return (
              <div key={fp.months} style={{ background: "#f8fafc", borderRadius: "12px", padding: "14px", border: `1px solid ${fc}28`, position: "relative", overflow: "hidden" }}>
                <div style={{ position: "absolute", bottom: 0, left: 0, height: `${pct}%`, width: "100%", background: fc + "10", transition: "height .5s" }} />
                <div style={{ position: "relative" }}>
                  <div style={{ fontSize: "11px", color: "#94a3b8", fontWeight: 700, marginBottom: "4px" }}>{fp.months} мес.</div>
                  <div style={{ fontSize: "26px", fontWeight: 900, color: fc, lineHeight: 1 }}>{fp.risk_score}</div>
                  <div style={{ fontSize: "10px", color: fc, fontWeight: 700, marginTop: "4px", textTransform: "uppercase" }}>{riskLevelLabel[fp.risk_level] || fp.risk_level}</div>
                  <div style={{ height: 4, background: "#e2e8f0", borderRadius: 999, marginTop: 8 }}>
                    <div style={{ height: "100%", width: `${pct}%`, background: `linear-gradient(90deg, ${fc}88, ${fc})`, borderRadius: 999 }} />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{ background: "#f8fafc", borderRadius: "12px", padding: "14px 16px", border: "1px solid #e2e8f0" }}>
        <div style={{ fontSize: "11px", fontWeight: 700, color: "#64748b", textTransform: "uppercase", letterSpacing: "0.7px", marginBottom: "8px" }}>Траектория риска: сейчас → +6м → +12м → +24м</div>
        <svg width="100%" viewBox={`0 0 ${svgW} ${svgH}`} style={{ display: "block", overflow: "visible" }}>
          <defs>
            <linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#6366f1" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#6366f1" stopOpacity="0.02" />
            </linearGradient>
          </defs>
          <polygon points={area} fill="url(#sparkGrad)" />
          <polyline points={polyline} fill="none" stroke="#6366f1" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
          {points.map((v, i) => {
            const [x, y] = ptCoords[i].split(",").map(Number);
            const fc = i === 0 ? "#6366f1" : riskLevelColor[data.forecast[i - 1]?.risk_level] || "#6366f1";
            return (
              <g key={i}>
                <circle cx={x} cy={y} r={4} fill={fc} stroke="white" strokeWidth={1.5} />
                <text x={x} y={y - 8} textAnchor="middle" fontSize="9" fill="#64748b" fontWeight="700">{v}</text>
              </g>
            );
          })}
        </svg>
        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "10px", color: "#94a3b8", fontWeight: 600, marginTop: "2px" }}>
          <span>Сейчас</span><span>+6 мес.</span><span>+12 мес.</span><span>+24 мес.</span>
        </div>
      </div>
    </div>
  );
}

// ─── Add Inspection Modal ────────────────────────────────────────────────────
const CONDITION_OPTIONS = [
  { value: "good", label: "Норма" },
  { value: "monitoring", label: "Наблюдение" },
  { value: "requires_repair", label: "Требует ремонта" },
  { value: "emergency", label: "Аварийное" },
];

function AddInspectionModal({ structureId, onClose, onSaved }: { structureId: number; onClose: () => void; onSaved: (insp: any) => void }) {
  const today = new Date().toISOString().split("T")[0];
  const [form, setForm] = useState({ date: today, inspector: "", condition_found: "good", wear_found: "", notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const set = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.inspector.trim()) { setError("Введите имя инспектора"); return; }
    setSaving(true); setError("");
    try {
      const payload: any = {
        date: form.date,
        inspector: form.inspector.trim(),
        condition_found: form.condition_found,
        notes: form.notes.trim() || null,
      };
      if (form.wear_found !== "") payload.wear_found = parseFloat(form.wear_found);
      const res = await addInspection(structureId, payload);
      onSaved(res.data);
      onClose();
    } catch (err: any) {
      setError(err?.response?.data?.detail || "Ошибка при сохранении");
    } finally { setSaving(false); }
  };

  const inputStyle: React.CSSProperties = {
    width: "100%", padding: "9px 12px", borderRadius: "8px",
    border: "1px solid var(--gray-200)", fontSize: "13px",
    color: "var(--gray-800)", outline: "none", boxSizing: "border-box",
    background: "white",
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: "16px" }}>
      <div style={{ background: "white", borderRadius: "16px", padding: "28px", width: "100%", maxWidth: "460px", boxShadow: "0 24px 64px rgba(0,0,0,0.18)", animation: "fadeIn .15s ease" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "20px" }}>
          <div>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: 800, color: "var(--gray-900)" }}>📋 Новый осмотр</h3>
            <p style={{ margin: "4px 0 0", fontSize: "12px", color: "var(--gray-400)" }}>Добавление записи об обследовании объекта</p>
          </div>
          <button onClick={onClose} style={{ background: "none", border: "none", fontSize: "20px", cursor: "pointer", color: "var(--gray-400)", lineHeight: 1 }}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.6px", display: "block", marginBottom: "5px" }}>Дата осмотра</label>
              <input type="date" value={form.date} onChange={e => set("date", e.target.value)} required style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.6px", display: "block", marginBottom: "5px" }}>Износ (%)</label>
              <input type="number" min="0" max="100" step="0.1" placeholder="напр. 45" value={form.wear_found} onChange={e => set("wear_found", e.target.value)} style={inputStyle} />
            </div>
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.6px", display: "block", marginBottom: "5px" }}>Инспектор / Организация *</label>
            <input type="text" placeholder="напр. Отдел эксплуатации" value={form.inspector} onChange={e => set("inspector", e.target.value)} required style={inputStyle} />
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.6px", display: "block", marginBottom: "8px" }}>Выявленное состояние</label>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px" }}>
              {CONDITION_OPTIONS.map(opt => (
                <button key={opt.value} type="button"
                  onClick={() => set("condition_found", opt.value)}
                  style={{
                    padding: "8px 10px", borderRadius: "8px", fontSize: "12px", fontWeight: 700, cursor: "pointer",
                    border: form.condition_found === opt.value ? `2px solid ${conditionColor[opt.value]}` : "1px solid var(--gray-200)",
                    background: form.condition_found === opt.value ? conditionColor[opt.value] + "18" : "white",
                    color: form.condition_found === opt.value ? conditionColor[opt.value] : "var(--gray-600)",
                    transition: "all .15s",
                  }}>
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label style={{ fontSize: "11px", fontWeight: 700, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.6px", display: "block", marginBottom: "5px" }}>Примечания</label>
            <textarea placeholder="Описание выявленных дефектов, рекомендации..." value={form.notes} onChange={e => set("notes", e.target.value)}
              rows={3} style={{ ...inputStyle, resize: "vertical", fontFamily: "inherit", lineHeight: 1.5 }} />
          </div>

          {error && <div style={{ background: "#fef2f2", border: "1px solid #fecaca", borderRadius: "8px", padding: "10px 12px", fontSize: "13px", color: "#dc2626", fontWeight: 500 }}>⚠ {error}</div>}

          <div style={{ display: "flex", gap: "10px", justifyContent: "flex-end", paddingTop: "4px" }}>
            <button type="button" onClick={onClose} disabled={saving}
              style={{ padding: "10px 20px", borderRadius: "8px", border: "1px solid var(--gray-200)", background: "white", color: "var(--gray-600)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>Отмена</button>
            <button type="submit" disabled={saving}
              style={{ padding: "10px 24px", borderRadius: "8px", border: "none", background: saving ? "#93c5fd" : "#1d4ed8", color: "white", fontWeight: 700, fontSize: "13px", cursor: saving ? "default" : "pointer", display: "flex", alignItems: "center", gap: "6px" }}>
              {saving ? "⏳ Сохранение..." : "✓ Сохранить осмотр"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// ─── Main Page ───────────────────────────────────────────────────────────────
export default function ObjectDetails() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [obj, setObj] = useState<any>(MOCK);
  const [risk, setRisk] = useState<any>(MOCK_RISK);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showInspModal, setShowInspModal] = useState(false);
  const [recomputingRisk, setRecomputingRisk] = useState(false);
  const [riskToast, setRiskToast] = useState("");

  const loadData = () => {
    if (!id) return;
    getStructure(Number(id)).then(res => setObj((prev: any) => ({ ...prev, ...res.data }))).catch(() => {});
    getStructureRisk(Number(id)).then(res => setRisk(normalizeRisk(res.data))).catch(() => {});
  };

  useEffect(() => { loadData(); }, [id]);

  const handleDelete = async () => {
    setDeleting(true);
    try { await deleteStructure(Number(id)); navigate("/catalog"); }
    catch { alert("Ошибка при удалении"); setDeleting(false); setShowDeleteModal(false); }
  };

  const handleRecomputeRisk = async () => {
    setRecomputingRisk(true); setRiskToast("");
    try {
      const res = await recomputeRisk(Number(id));
      setRisk(normalizeRisk(res.data));
      setRiskToast("✅ Риск пересчитан");
      setTimeout(() => setRiskToast(""), 3000);
    } catch { setRiskToast("❌ Ошибка пересчёта"); setTimeout(() => setRiskToast(""), 3000); }
    finally { setRecomputingRisk(false); }
  };

  const handleInspectionSaved = (newInsp: any) => {
    const mapped = {
      date: newInsp.date,
      inspector: newInsp.inspector,
      result: newInsp.notes || "",
      condition: newInsp.condition_found,
    };
    setObj((prev: any) => ({ ...prev, inspections: [mapped, ...(prev.inspections || [])] }));
    getStructureRisk(Number(id)).then(res => setRisk(normalizeRisk(res.data))).catch(() => {});
  };

  const handleViewOnMap = () => navigate(`/detection?lat=${obj.latitude}&lng=${obj.longitude}&id=${id}&name=${encodeURIComponent(obj.name)}`);

  const recColor = statusColors[risk?.recommendation] || ({ low: "#16a34a", medium: "#d97706", high: "#ea580c", critical: "#dc2626" }[obj.risk_level] || "#2563eb");
  const ageYears = obj.year_built ? (2026 - obj.year_built) : null;
  const efficiencyLoss = (obj.efficiency_design && obj.efficiency_actual)
    ? Math.max(0, Math.round((obj.efficiency_design - obj.efficiency_actual) * 100)) : null;

  const exportUrl = (fmt: string) => `${BASE_URL}/api/reports/structures.${fmt}`;

  return (
    <div style={{ padding: "32px", background: "var(--gray-50)", minHeight: "100vh" }}>
      {riskToast && (
        <div style={{ position: "fixed", top: "24px", right: "24px", zIndex: 2000, background: "white", border: "1px solid var(--gray-200)", borderRadius: "10px", padding: "12px 18px", boxShadow: "0 8px 32px rgba(0,0,0,0.12)", fontSize: "14px", fontWeight: 600, color: "var(--gray-800)" }}>
          {riskToast}
        </div>
      )}

      {showInspModal && (
        <AddInspectionModal
          structureId={Number(id)}
          onClose={() => setShowInspModal(false)}
          onSaved={handleInspectionSaved}
        />
      )}

      {showDeleteModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 999, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "white", borderRadius: "12px", padding: "32px", maxWidth: "400px", width: "90%", textAlign: "center", boxShadow: "0 20px 60px rgba(0,0,0,0.2)" }}>
            <div style={{ fontSize: "44px", marginBottom: "12px" }}>⚠️</div>
            <div style={{ fontWeight: 800, fontSize: "18px", color: "#1e293b", marginBottom: "8px" }}>Удалить объект?</div>
            <div style={{ color: "#64748b", fontSize: "14px", marginBottom: "24px", lineHeight: 1.5 }}>«{obj.name}» будет удалён безвозвратно вместе со всей историей осмотров.</div>
            <div style={{ display: "flex", gap: "10px", justifyContent: "center" }}>
              <button onClick={() => setShowDeleteModal(false)} disabled={deleting} style={{ padding: "10px 24px", borderRadius: "8px", border: "1px solid #e2e8f0", background: "white", color: "#475569", fontWeight: 600, fontSize: "14px", cursor: "pointer" }}>Отмена</button>
              <button onClick={handleDelete} disabled={deleting} style={{ padding: "10px 24px", borderRadius: "8px", border: "none", background: deleting ? "#fca5a5" : "#dc2626", color: "white", fontWeight: 700, fontSize: "14px", cursor: deleting ? "default" : "pointer" }}>{deleting ? "⏳ Удаление..." : "Да, удалить"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "10px" }}>
        <button onClick={() => navigate(-1)} style={{ background: "white", border: "1px solid var(--gray-200)", padding: "8px 16px", borderRadius: "var(--radius-sm)", cursor: "pointer", color: "var(--gray-600)", fontSize: "13px", display: "flex", alignItems: "center", gap: "6px", boxShadow: "var(--shadow-sm)", fontWeight: 500 }}>← Назад</button>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          <button onClick={handleViewOnMap} style={{ padding: "8px 18px", borderRadius: "var(--radius-sm)", border: "1px solid #bbf7d0", background: "#f0fdf4", color: "#15803d", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>🗺️ На карте</button>
          <button onClick={() => setShowInspModal(true)} style={{ padding: "8px 18px", borderRadius: "var(--radius-sm)", border: "1px solid #a5f3fc", background: "#ecfeff", color: "#0891b2", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>📋 Добавить осмотр</button>
          <button onClick={() => navigate(`/edit/${id}`)} style={{ padding: "8px 18px", borderRadius: "var(--radius-sm)", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>✏️ Редактировать</button>
          <button onClick={() => setShowDeleteModal(true)} style={{ padding: "8px 18px", borderRadius: "var(--radius-sm)", border: "1px solid #fecaca", background: "#fff5f5", color: "#dc2626", fontWeight: 700, fontSize: "13px", cursor: "pointer", display: "flex", alignItems: "center", gap: "6px" }}>🗑️ Удалить</button>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 340px", gap: "20px", alignItems: "start" }}>
        {/* ── Left column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          {/* Hero card */}
          <div style={{ background: "linear-gradient(135deg, #ffffff 0%, #f8fbff 100%)", borderRadius: "var(--radius-xl)", padding: "28px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", position: "relative", overflow: "hidden" }}>
            <div style={{ position: "absolute", top: -60, right: -60, width: 180, height: 180, borderRadius: "50%", background: "radial-gradient(circle, rgba(59,130,246,0.16), rgba(59,130,246,0))" }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "18px", flexWrap: "wrap", gap: "12px", position: "relative" }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "10px", flexWrap: "wrap" }}>
                  <span style={{ background: "var(--primary-bg)", color: "var(--primary)", padding: "5px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, border: "1px solid #bfdbfe", textTransform: "uppercase", letterSpacing: "0.6px" }}>{obj.type}</span>
                  <span style={{ background: conditionColor[obj.condition] + "18", color: conditionColor[obj.condition], padding: "5px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, border: `1px solid ${conditionColor[obj.condition]}30` }}>{conditionLabel[obj.condition]}</span>
                  <span style={{ background: recColor + "18", color: recColor, padding: "5px 12px", borderRadius: "999px", fontSize: "11px", fontWeight: 700, border: `1px solid ${recColor}30` }}>{riskLevelLabel[obj.risk_level] || obj.risk_level} риск</span>
                </div>
                <h1 style={{ fontSize: "28px", lineHeight: 1.1, color: "var(--gray-900)", margin: "0 0 6px", fontFamily: "Manrope, sans-serif", fontWeight: 900 }}>{obj.name}</h1>
                <div style={{ color: "var(--gray-500)", fontSize: "13px", display: "flex", alignItems: "center", gap: "10px", flexWrap: "wrap" }}>
                  <span>📍 {obj.district}{obj.locality ? `, ${obj.locality}` : ""}</span>
                  {obj.water_source && <span>💧 {obj.water_source}</span>}
                  <span>№ {obj.id}</span>
                </div>
              </div>
              <div style={{ minWidth: "210px", background: "rgba(255,255,255,0.9)", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", borderRadius: "16px", padding: "16px" }}>
                <div style={{ fontSize: "11px", color: "var(--gray-400)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.7px", marginBottom: "6px" }}>Inspection Score</div>
                <div style={{ display: "flex", alignItems: "baseline", gap: "8px", marginBottom: "10px" }}>
                  <span style={{ fontSize: "36px", fontWeight: 900, color: recColor, fontFamily: "Manrope, sans-serif", lineHeight: 1 }}>{obj.risk_score ?? risk?.score ?? "—"}</span>
                  <span style={{ fontSize: "13px", color: "var(--gray-400)", fontWeight: 600 }}>из 100</span>
                </div>
                <div style={{ height: 10, background: "var(--gray-100)", borderRadius: 999, overflow: "hidden", marginBottom: "12px" }}>
                  <div style={{ height: "100%", width: `${Math.min(Number(obj.risk_score ?? risk?.score ?? 0), 100)}%`, background: `linear-gradient(90deg, ${recColor}, ${recColor}cc)`, borderRadius: 999 }} />
                </div>
                <div style={{ fontSize: "12px", color: "var(--gray-500)", lineHeight: 1.5 }}>Следующий осмотр: <b style={{ color: "var(--gray-800)" }}>{obj.next_inspection || risk?.next_inspection || "не назначен"}</b></div>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(4, minmax(0, 1fr))", gap: "10px", marginBottom: "18px" }}>
              <StatPill label="Возраст" value={ageYears ? `${ageYears} лет` : "—"} color="#2563eb" />
              <StatPill label="Износ" value={obj.wear_percent != null ? `${obj.wear_percent}%` : "—"} color="#ea580c" />
              <StatPill label="Пропускная способность" value={obj.capacity != null ? `${obj.capacity} м³/с` : "—"} color="#0891b2" />
              <StatPill label="Охват" value={obj.area_ha != null ? `${obj.area_ha} га` : "—"} color="#16a34a" />
            </div>
            <div style={{ background: "#f0fdf4", border: "1px solid #bbf7d0", borderRadius: "14px", padding: "14px 16px", marginBottom: "20px", display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                <span style={{ fontSize: "18px" }}>📍</span>
                <div>
                  <div style={{ fontSize: "11px", color: "#15803d", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" }}>Координаты объекта</div>
                  <div style={{ fontFamily: "monospace", fontSize: "14px", color: "#14532d", fontWeight: 700 }}>{obj.latitude}, {obj.longitude}</div>
                </div>
              </div>
              <button onClick={handleViewOnMap} style={{ padding: "8px 16px", borderRadius: "10px", border: "none", background: "#15803d", color: "white", fontWeight: 700, fontSize: "12px", cursor: "pointer" }}>🗺️ Открыть на карте</button>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1.15fr 0.85fr", gap: "16px", alignItems: "start" }}>
              <div style={{ background: "white", borderRadius: "16px", padding: "18px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ fontSize: "12px", color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 800, marginBottom: "10px" }}>Паспорт объекта</div>
                <InfoRow label="Тип" value={obj.type} />
                <InfoRow label="Типовой код" value={obj.type_code} />
                <InfoRow label="Район" value={obj.district} />
                <InfoRow label="Населённый пункт" value={obj.locality} />
                <InfoRow label="Источник воды" value={obj.water_source} />
                <InfoRow label="Значимость" value={significanceLabel[obj.significance] || obj.significance || "—"} />
                <InfoRow label="Описание" value={obj.description || "—"} />
              </div>
              <div style={{ background: "white", borderRadius: "16px", padding: "18px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
                <div style={{ fontSize: "12px", color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.7px", fontWeight: 800, marginBottom: "10px" }}>Технические параметры</div>
                <InfoRow label="Общая длина" value={obj.length_km != null ? `${obj.length_km} км` : "—"} />
                <InfoRow label="Земляное русло" value={obj.length_earthen_km != null ? `${obj.length_earthen_km} км` : "—"} />
                <InfoRow label="Облицованный участок" value={obj.length_lined_km != null ? `${obj.length_lined_km} км` : "—"} />
                <InfoRow label="Построен" value={obj.year_built ?? "—"} />
                <InfoRow label="Проектная эффективность" value={obj.efficiency_design != null ? `${Math.round(obj.efficiency_design * 100)}%` : "—"} />
                <InfoRow label="Фактическая эффективность" value={obj.efficiency_actual != null ? `${Math.round(obj.efficiency_actual * 100)}%` : "—"} />
                <InfoRow label="Потеря эффективности" value={efficiencyLoss != null ? `${efficiencyLoss}%` : "—"} />
                <InfoRow label="Количество сооружений" value={obj.structures_count ?? "—"} />
              </div>
            </div>
          </div>

          {/* ✅ PREDICTIVE INFRASTRUCTURE ENGINE */}
          {id && <PredictiveBlock structureId={Number(id)} />}

          {/* Risk Analytics */}
          <div style={{ background: "white", borderRadius: "var(--radius-xl)", padding: "24px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "18px", flexWrap: "wrap", gap: "8px" }}>
              <div>
                <h3 style={{ fontSize: "16px", color: "var(--gray-900)", margin: "0 0 4px", fontWeight: 800 }}>🧠 Аналитика риска</h3>
                <p style={{ fontSize: "12px", color: "var(--gray-400)", margin: 0 }}>Прозрачные факторы, влияющие на приоритет осмотра и ремонта</p>
              </div>
              <div style={{ display: "flex", gap: "8px", alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ background: recColor + "15", color: recColor, padding: "6px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, border: `1px solid ${recColor}22` }}>{risk?.recommendation || "Рекомендация формируется"}</span>
                <button onClick={handleRecomputeRisk} disabled={recomputingRisk} style={{ padding: "7px 14px", borderRadius: "8px", border: "1px solid #e0e7ff", background: recomputingRisk ? "#e0e7ff" : "#eef2ff", color: "#4338ca", fontWeight: 700, fontSize: "12px", cursor: recomputingRisk ? "default" : "pointer", display: "flex", alignItems: "center", gap: "5px" }}>
                  {recomputingRisk ? "⏳" : "🔄"} Пересчитать
                </button>
              </div>
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div style={{ background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)", borderRadius: "16px", border: "1px solid var(--gray-200)", padding: "18px" }}>
                <div style={{ fontSize: "12px", color: "var(--gray-400)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.7px", marginBottom: "12px" }}>Ключевые показатели</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                  <StatPill label="Repair Score" value={obj.wear_percent != null ? `${Math.max(0, 100 - obj.wear_percent)}` : "—"} color="#ea580c" />
                  <StatPill label="Осмотр" value={obj.last_inspection || "—"} color="#2563eb" />
                  <StatPill label="Следующий" value={(obj.next_inspection || risk?.next_inspection || "—").toString()} color="#16a34a" />
                  <StatPill label="Статус" value={conditionLabel[obj.condition] || obj.condition} color={conditionColor[obj.condition] || "#64748b"} />
                </div>
              </div>
              <div style={{ background: "linear-gradient(180deg, #f8fafc 0%, #ffffff 100%)", borderRadius: "16px", border: "1px solid var(--gray-200)", padding: "18px" }}>
                <div style={{ fontSize: "12px", color: "var(--gray-400)", textTransform: "uppercase", fontWeight: 800, letterSpacing: "0.7px", marginBottom: "12px" }}>Риск-факторы</div>
                <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                  {(risk?.factors || []).slice(0, 5).map((f: any, i: number) => (
                    <div key={i} style={{ background: "white", border: "1px solid var(--gray-200)", borderRadius: "12px", padding: "12px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "8px", marginBottom: "6px" }}>
                        <span style={{ fontSize: "13px", color: "var(--gray-800)", fontWeight: 700 }}>{f.name}</span>
                        <span style={{ fontSize: "11px", color: "var(--gray-400)", fontWeight: 700 }}>{f.weight ? `${f.weight}%` : "фактор"}</span>
                      </div>
                      <div style={{ fontSize: "12px", color: "var(--gray-500)", marginBottom: "8px" }}>{String(f.value ?? "—")}</div>
                      <div style={{ height: 7, background: "var(--gray-100)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(Number(f.score || 0), 100)}%`, background: "linear-gradient(90deg, #f59e0b, #ef4444)", borderRadius: 999 }} />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* ── Right column ── */}
        <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
          <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "20px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "14px", color: "var(--gray-900)", margin: "0 0 12px", fontWeight: 700 }}>📌 Статус записи</h3>
            <InfoRow label="Источник" value={sourceLabel[obj.source] || obj.source || "—"} />
            <InfoRow label="Верификация" value={verificationLabel[obj.verification_status] || obj.verification_status || "—"} />
            <InfoRow label="Кадастровый номер" value={obj.cadastral_number} mono />
            <InfoRow label="Госакт" value={obj.state_act} mono />
            <InfoRow label="Создано" value={obj.created_at ? new Date(obj.created_at).toLocaleDateString() : "—"} />
            <InfoRow label="Обновлено" value={obj.updated_at ? new Date(obj.updated_at).toLocaleDateString() : "—"} />
          </div>
          <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "20px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
            <h3 style={{ fontSize: "14px", color: "var(--gray-900)", margin: "0 0 4px", fontWeight: 700 }}>📥 Экспорт отчёта</h3>
            <p style={{ fontSize: "12px", color: "var(--gray-400)", margin: "0 0 12px" }}>Полный реестр с применением фильтров</p>
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {[
                { fmt: "csv",  label: "Скачать CSV",   icon: "📄", color: "#16a34a" },
                { fmt: "xlsx", label: "Скачать Excel", icon: "📊", color: "#1d4ed8" },
                { fmt: "pdf",  label: "Скачать PDF",   icon: "📃", color: "#dc2626" },
              ].map(({ fmt, label, icon, color }) => (
                <a key={fmt} href={exportUrl(fmt)} target="_blank" rel="noopener noreferrer"
                  style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 14px", borderRadius: "var(--radius-sm)", border: `1px solid ${color}30`, background: color + "08", color, fontWeight: 600, fontSize: "13px", textDecoration: "none" }}>
                  <span>{icon}</span> {label}
                </a>
              ))}
            </div>
          </div>
          <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "20px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px" }}>
              <h3 style={{ fontSize: "14px", color: "var(--gray-900)", margin: 0, fontWeight: 700 }}>📋 История обследований</h3>
              <button onClick={() => setShowInspModal(true)} style={{ padding: "6px 12px", borderRadius: "6px", border: "1px solid #a5f3fc", background: "#ecfeff", color: "#0891b2", fontWeight: 700, fontSize: "11px", cursor: "pointer", whiteSpace: "nowrap" }}>+ Добавить</button>
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              {(obj.inspections || []).length === 0 && (
                <div style={{ textAlign: "center", padding: "24px", color: "var(--gray-400)", fontSize: "13px" }}>Осмотры не зарегистрированы</div>
              )}
              {(obj.inspections || []).map((insp: Inspection, i: number) => (
                <div key={i} style={{ background: "var(--gray-50)", borderRadius: "var(--radius-sm)", padding: "14px", border: "1px solid var(--gray-200)", borderLeft: `3px solid ${conditionColor[insp.condition] || '#94a3b8'}` }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", gap: "8px" }}>
                    <span style={{ color: "var(--gray-500)", fontSize: "11px", fontWeight: 500 }}>{insp.date}</span>
                    <span style={{ color: conditionColor[insp.condition] || '#94a3b8', fontSize: "11px", fontWeight: 700, background: (conditionColor[insp.condition] || '#94a3b8') + "18", padding: "2px 8px", borderRadius: "10px" }}>{conditionLabel[insp.condition] || insp.condition}</span>
                  </div>
                  <div style={{ color: "var(--gray-500)", fontSize: "11px", marginBottom: "4px" }}>👤 {insp.inspector}</div>
                  <div style={{ color: "var(--gray-700)", fontSize: "12px", lineHeight: 1.5 }}>{insp.result}</div>
                </div>
              ))}
            </div>
          </div>
          <RiskScoreCard structureId={Number(id)} />
          <InspectionPriority structureId={Number(id)} />
          <OperationHistory structureId={Number(id)} />
        </div>
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity:0; transform:scale(.97); } to { opacity:1; transform:scale(1); } }`}</style>
    </div>
  );
}
