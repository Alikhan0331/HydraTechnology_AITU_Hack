import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getAnalyticsDashboard, getTopRisk } from "../api/structures";
import { conditionColor, conditionLabel } from "../utils/conditionColors";

const RISK_COLORS: Record<string, string> = {
  low: "#16a34a", medium: "#d97706", high: "#ea580c", critical: "#dc2626",
};
const RISK_LABELS: Record<string, string> = {
  low: "Низкий", medium: "Средний", high: "Высокий", critical: "Критический",
};

const MOCK_DASH: any = {
  total: 247, emergency: 12, requires_repair: 38, overall_condition_index: 64,
  total_length_km: 1842.3, avg_age_years: 38.4,
  by_condition: { good: 142, monitoring: 55, requires_repair: 38, emergency: 12 },
  by_risk: { low: 130, medium: 72, high: 33, critical: 12 },
  top_risk: [
    { id: 1, name: "Плотина Тасоткель", type: "Плотина", district: "Жуалынский", condition: "emergency", risk_level: "critical", risk_score: 92 },
    { id: 2, name: "Насосная ст. №3",   type: "Насосная станция", district: "Байзакский", condition: "emergency", risk_level: "critical", risk_score: 88 },
    { id: 3, name: "Шлюз №7",           type: "Шлюз", district: "Меркенский", condition: "requires_repair", risk_level: "high", risk_score: 76 },
    { id: 4, name: "Канал Арнасай",     type: "Канал", district: "Таласский", condition: "requires_repair", risk_level: "high", risk_score: 71 },
    { id: 5, name: "Водозабор №2",      type: "Водозабор", district: "Жамбылский", condition: "monitoring", risk_level: "medium", risk_score: 58 },
  ],
  recently_added: [
    { id: 10, name: "Канал Новый",     type: "Канал",  district: "Жамбылский", condition: "good", risk_level: "low" },
    { id: 11, name: "Гидропост №22",   type: "Гидропост", district: "Байзакский", condition: "good", risk_level: "low" },
  ],
};

const TOP_RISK_LIMITS = [5, 10, 20, 50];

function StatCard({ icon, value, label, sub, color }: { icon: string; value: any; label: string; sub?: string; color: string }) {
  return (
    <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "20px 22px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", display: "flex", gap: "14px", alignItems: "flex-start" }}>
      <div style={{ width: 44, height: 44, borderRadius: "12px", background: color + "18", display: "flex", alignItems: "center", justifyContent: "center", fontSize: "20px", flexShrink: 0 }}>{icon}</div>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: "24px", fontWeight: 900, color: "var(--gray-900)", fontFamily: "Manrope, sans-serif", lineHeight: 1.1 }}>{value}</div>
        <div style={{ fontSize: "13px", color: "var(--gray-600)", fontWeight: 600, marginTop: 2 }}>{label}</div>
        {sub && <div style={{ fontSize: "11px", color: color, fontWeight: 700, marginTop: 4, background: color + "12", padding: "2px 8px", borderRadius: 6, display: "inline-block" }}>{sub}</div>}
      </div>
    </div>
  );
}

function CondBar({ label, count, total, color }: { label: string; count: number; total: number; color: string }) {
  const pct = total ? Math.round((count / total) * 100) : 0;
  return (
    <div style={{ marginBottom: "10px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
        <span style={{ fontSize: "12px", fontWeight: 600, color: "var(--gray-700)" }}>{label}</span>
        <span style={{ fontSize: "12px", fontWeight: 700, color }}>{count} <span style={{ color: "var(--gray-400)", fontWeight: 400 }}>({pct}%)</span></span>
      </div>
      <div style={{ height: 8, background: "var(--gray-100)", borderRadius: 999, overflow: "hidden" }}>
        <div style={{ height: "100%", width: `${pct}%`, background: color, borderRadius: 999, transition: "width .4s ease" }} />
      </div>
    </div>
  );
}

export default function Dashboard() {
  const [data, setData] = useState<any>(MOCK_DASH);
  const [topRiskLimit, setTopRiskLimit] = useState(10);
  const [topRiskList, setTopRiskList] = useState<any[]>(MOCK_DASH.top_risk);
  const [loadingTopRisk, setLoadingTopRisk] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getAnalyticsDashboard().then(res => { if (res.data) setData(res.data); }).catch(() => {});
  }, []);

  // ✅ Re-fetch top-risk when limit changes
  useEffect(() => {
    setLoadingTopRisk(true);
    getTopRisk(topRiskLimit)
      .then(res => { if (Array.isArray(res.data)) setTopRiskList(res.data); })
      .catch(() => {})
      .finally(() => setLoadingTopRisk(false));
  }, [topRiskLimit]);

  const total = data?.total || 0;
  const byCondition = data?.by_condition || {};
  const byRisk = data?.by_risk || {};
  const condIndex = data?.overall_condition_index ?? 64;
  const condColor = condIndex >= 75 ? "#16a34a" : condIndex >= 50 ? "#d97706" : "#dc2626";

  return (
    <div style={{ padding: "28px 24px", background: "var(--gray-50)", minHeight: "100vh", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", fontWeight: 900, color: "var(--gray-900)", margin: "0 0 4px", fontFamily: "Manrope, sans-serif" }}>Главная панель</h1>
          <p style={{ color: "var(--gray-500)", fontSize: "13px", margin: 0 }}>Мониторинг гидротехнических сооружений Жамбылской области</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <button onClick={() => navigate("/catalog")} style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "1px solid var(--gray-200)", background: "white", color: "var(--gray-700)", fontWeight: 600, fontSize: "13px", cursor: "pointer" }}>📋 Каталог</button>
          <button onClick={() => navigate("/analytics")} style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: "none", background: "#1d4ed8", color: "white", fontWeight: 700, fontSize: "13px", cursor: "pointer" }}>📊 Аналитика</button>
        </div>
      </div>

      {/* KPI cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px", marginBottom: "20px" }}>
        <StatCard icon="🏗️" value={total} label="Всего объектов" color="#2563eb" />
        <StatCard icon="🚨" value={data?.emergency ?? 0} label="Аварийных" sub={total ? `${Math.round(((data?.emergency ?? 0) / total) * 100)}%` : undefined} color="#dc2626" />
        <StatCard icon="🔧" value={data?.requires_repair ?? 0} label="Требуют ремонта" color="#ea580c" />
        <StatCard icon="📏" value={`${data?.total_length_km ?? 0} км`} label="Общая протяжённость" color="#0891b2" />
        <StatCard icon="📅" value={`${data?.avg_age_years ?? 0} лет`} label="Средний возраст" color="#7c3aed" />
        <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "20px 22px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", display: "flex", flexDirection: "column", justifyContent: "center" }}>
          <div style={{ fontSize: "11px", color: "var(--gray-400)", textTransform: "uppercase", fontWeight: 700, letterSpacing: "0.6px", marginBottom: "6px" }}>Индекс состояния</div>
          <div style={{ fontSize: "28px", fontWeight: 900, color: condColor, fontFamily: "Manrope, sans-serif", lineHeight: 1 }}>{condIndex}<span style={{ fontSize: "14px", fontWeight: 500, color: "var(--gray-400)" }}>/100</span></div>
          <div style={{ height: 6, background: "var(--gray-100)", borderRadius: 999, overflow: "hidden", marginTop: "8px" }}>
            <div style={{ height: "100%", width: `${condIndex}%`, background: condColor, borderRadius: 999 }} />
          </div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "20px" }}>
        {/* Condition breakdown */}
        <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "20px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 800, color: "var(--gray-900)", margin: "0 0 16px" }}>📊 Состояние объектов</h3>
          <CondBar label="Норма" count={byCondition.good ?? 0} total={total} color="#16a34a" />
          <CondBar label="Наблюдение" count={byCondition.monitoring ?? 0} total={total} color="#d97706" />
          <CondBar label="Требует ремонта" count={byCondition.requires_repair ?? 0} total={total} color="#ea580c" />
          <CondBar label="Аварийное" count={byCondition.emergency ?? 0} total={total} color="#dc2626" />
        </div>

        {/* Risk breakdown */}
        <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "20px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
          <h3 style={{ fontSize: "14px", fontWeight: 800, color: "var(--gray-900)", margin: "0 0 16px" }}>⚠️ Распределение рисков</h3>
          {Object.entries(byRisk).map(([lvl, cnt]: any) => (
            <CondBar key={lvl} label={RISK_LABELS[lvl] ?? lvl} count={cnt} total={total} color={RISK_COLORS[lvl] ?? "#64748b"} />
          ))}
        </div>
      </div>

      {/* Top Risk Table — with limit selector ✅ */}
      <div style={{ background: "white", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", marginBottom: "20px", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--gray-100)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "10px" }}>
          <div>
            <h3 style={{ fontSize: "14px", fontWeight: 800, color: "var(--gray-900)", margin: 0 }}>🚨 Приоритет осмотра</h3>
            <p style={{ fontSize: "12px", color: "var(--gray-400)", margin: "3px 0 0" }}>Объекты с наибольшим риском — требуют немедленного внимания</p>
          </div>
          {/* ✅ Limit selector */}
          <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
            <span style={{ fontSize: "12px", color: "var(--gray-500)", fontWeight: 600 }}>Показать:</span>
            <div style={{ display: "flex", gap: "4px" }}>
              {TOP_RISK_LIMITS.map(lim => (
                <button key={lim} onClick={() => setTopRiskLimit(lim)}
                  style={{ padding: "5px 12px", borderRadius: "6px", border: topRiskLimit === lim ? "1px solid #1d4ed8" : "1px solid var(--gray-200)", background: topRiskLimit === lim ? "#1d4ed8" : "white", color: topRiskLimit === lim ? "white" : "var(--gray-600)", fontWeight: topRiskLimit === lim ? 700 : 500, fontSize: "12px", cursor: "pointer", transition: "all .15s" }}>
                  {lim}
                </button>
              ))}
            </div>
            {loadingTopRisk && <span style={{ fontSize: "12px", color: "var(--gray-400)" }}>⏳</span>}
          </div>
        </div>
        <div style={{ overflowX: "auto" }}>
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ background: "var(--gray-50)" }}>
                {["#", "Объект", "Тип", "Район", "Состояние", "Риск", "Score", ""].map((h, i) => (
                  <th key={i} style={{ padding: "10px 14px", textAlign: i === 7 ? "right" : "left", fontSize: "11px", fontWeight: 700, color: "var(--gray-500)", textTransform: "uppercase", letterSpacing: "0.5px", whiteSpace: "nowrap" }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {topRiskList.map((s: any, i: number) => (
                <tr key={s.id} style={{ borderTop: "1px solid var(--gray-100)", cursor: "pointer" }}
                  onMouseEnter={e => (e.currentTarget as HTMLTableRowElement).style.background = "var(--gray-50)"}
                  onMouseLeave={e => (e.currentTarget as HTMLTableRowElement).style.background = "white"}
                  onClick={() => navigate(`/object/${s.id}`)}
                >
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--gray-400)", fontWeight: 700 }}>{i + 1}</td>
                  <td style={{ padding: "12px 14px", fontWeight: 700, color: "var(--gray-800)", maxWidth: 200, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</td>
                  <td style={{ padding: "12px 14px" }}><span style={{ background: "var(--gray-100)", color: "var(--gray-600)", padding: "3px 8px", borderRadius: "6px", fontSize: "11px", fontWeight: 600 }}>{s.type}</span></td>
                  <td style={{ padding: "12px 14px", fontSize: "12px", color: "var(--gray-500)" }}>{s.district}</td>
                  <td style={{ padding: "12px 14px" }}><span style={{ background: conditionColor[s.condition] + "18", color: conditionColor[s.condition], padding: "3px 10px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 }}>{conditionLabel[s.condition]}</span></td>
                  <td style={{ padding: "12px 14px" }}><span style={{ color: RISK_COLORS[s.risk_level], fontWeight: 700, fontSize: "12px", background: RISK_COLORS[s.risk_level] + "15", padding: "3px 8px", borderRadius: "20px" }}>{RISK_LABELS[s.risk_level]}</span></td>
                  <td style={{ padding: "12px 14px" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                      <div style={{ width: 48, height: 5, background: "var(--gray-100)", borderRadius: 999, overflow: "hidden" }}>
                        <div style={{ height: "100%", width: `${Math.min(s.risk_score ?? 0, 100)}%`, background: RISK_COLORS[s.risk_level] ?? "#64748b", borderRadius: 999 }} />
                      </div>
                      <span style={{ fontSize: "12px", fontWeight: 700, color: RISK_COLORS[s.risk_level] }}>{s.risk_score ?? "—"}</span>
                    </div>
                  </td>
                  <td style={{ padding: "12px 14px", textAlign: "right" }}>
                    <button onClick={e => { e.stopPropagation(); navigate(`/object/${s.id}`); }}
                      style={{ padding: "5px 12px", borderRadius: "6px", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", fontWeight: 700, fontSize: "11px", cursor: "pointer" }}>Открыть →</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {topRiskList.length === 0 && !loadingTopRisk && (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--gray-400)", fontSize: "13px" }}>Нет данных</div>
        )}
      </div>

      {/* Recently added */}
      {(data?.recently_added || []).length > 0 && (
        <div style={{ background: "white", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
          <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--gray-100)" }}>
            <h3 style={{ fontSize: "14px", fontWeight: 800, color: "var(--gray-900)", margin: 0 }}>🆕 Последние добавленные</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "12px", padding: "16px" }}>
            {(data?.recently_added || []).map((s: any) => (
              <div key={s.id} onClick={() => navigate(`/object/${s.id}`)}
                style={{ background: "var(--gray-50)", borderRadius: "10px", padding: "14px", border: "1px solid var(--gray-200)", cursor: "pointer", transition: "box-shadow .15s" }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.boxShadow = "none"}
              >
                <div style={{ fontSize: "12px", color: "var(--gray-500)", marginBottom: "4px" }}>{s.type} · {s.district}</div>
                <div style={{ fontWeight: 700, color: "var(--gray-800)", fontSize: "13px", marginBottom: "8px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                <div style={{ display: "flex", gap: "6px" }}>
                  <span style={{ background: conditionColor[s.condition] + "18", color: conditionColor[s.condition], padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 }}>{conditionLabel[s.condition]}</span>
                  <span style={{ background: RISK_COLORS[s.risk_level] + "15", color: RISK_COLORS[s.risk_level], padding: "2px 8px", borderRadius: "20px", fontSize: "11px", fontWeight: 700 }}>{RISK_LABELS[s.risk_level]}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
