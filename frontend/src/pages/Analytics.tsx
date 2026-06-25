import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, Cell,
} from "recharts";
import { getAnalyticsCharts, getAnalyticsDynamics, getTopRisk } from "../api/structures";
import type { Structure } from "../api/structures";
import { conditionColor, conditionLabel } from "../utils/conditionColors";
import PriorityRanking from "../components/PriorityRanking";

const RISK_COLORS: Record<string, string> = {
  low: "#16a34a", medium: "#d97706", high: "#ea580c", critical: "#dc2626",
};
const RISK_LABELS: Record<string, string> = {
  low: "Низкий", medium: "Средний", high: "Высокий", critical: "Критический",
};
const DISTRICT_COLORS = ["#1d4ed8","#0ea5e9","#6366f1","#8b5cf6","#ec4899","#f59e0b","#10b981","#64748b","#ef4444","#14b8a6"];

interface ChartsData {
  by_decade: Record<string, number>;
  by_district: Record<string, number>;
  by_condition: Record<string, number>;
  by_risk: Record<string, number>;
  condition_labels: Record<string, string>;
  condition_colors: Record<string, string>;
}

export default function Analytics() {
  const [charts, setCharts] = useState<ChartsData | null>(null);
  const [dynamics, setDynamics] = useState<any>(null);
  const [topRisk, setTopRisk] = useState<Structure[]>([]);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([
      getAnalyticsCharts().then(r => setCharts(r.data)).catch(() => {}),
      getAnalyticsDynamics().then(r => setDynamics(r.data)).catch(() => {}),
      getTopRisk().then(r => setTopRisk(Array.isArray(r.data) ? r.data : [])).catch(() => {}),
    ]).finally(() => setLoading(false));
  }, []);

  const decadeData = charts
    ? Object.entries(charts.by_decade).map(([k, v]) => ({ label: k, count: v }))
    : [];

  const districtData = charts
    ? Object.entries(charts.by_district)
        .sort((a, b) => (b[1] as number) - (a[1] as number))
        .slice(0, 10)
        .map(([k, v]) => ({ label: k, count: v }))
    : [];

  const dynamicsData = dynamics
    ? (dynamics.months as string[]).map((m: string, i: number) => ({
        month: m,
        good: dynamics.series.good[i],
        monitoring: dynamics.series.monitoring[i],
        requires_repair: dynamics.series.requires_repair[i],
        emergency: dynamics.series.emergency[i],
        index: dynamics.condition_index[i],
      }))
    : [];

  const maxRiskScore = topRisk.reduce((m, s: any) => Math.max(m, s.risk_score ?? 0), 1);

  const card = (children: React.ReactNode, style?: React.CSSProperties) => (
    <div style={{ background: "white", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", padding: "24px", ...style }}>
      {children}
    </div>
  );

  const sectionTitle = (title: string, subtitle?: string) => (
    <div style={{ marginBottom: "18px" }}>
      <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--gray-900)" }}>{title}</div>
      {subtitle && <div style={{ color: "var(--gray-400)", fontSize: "12px", marginTop: "2px" }}>{subtitle}</div>}
    </div>
  );

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--gray-400)", fontSize: "15px" }}>
      ⏳ Загрузка аналитики...
    </div>
  );

  return (
    <div style={{ padding: "32px 24px", background: "var(--gray-50)", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px" }}>
        <h1 style={{ fontSize: "24px", color: "var(--gray-900)", marginBottom: "4px" }}>📊 Аналитика</h1>
        <p style={{ color: "var(--gray-500)", fontSize: "13px" }}>Глубокий анализ состояния инфраструктуры Жамбылского региона</p>
      </div>

      {/* Row 1: By decade + By district */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        {card(
          <>
            {sectionTitle("Строительство по десятилетиям", "Количество объектов по году постройки")}
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={decadeData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis tick={{ fontSize: 11, fill: "#64748b" }} />
                <Tooltip formatter={(v: any) => [`${v} об.`, "Количество"]} labelStyle={{ fontSize: 12 }} />
                <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                  {decadeData.map((_, i) => <Cell key={i} fill={`hsl(${215 + i * 15}, 70%, ${55 - i * 2}%)`} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
        {card(
          <>
            {sectionTitle("ТОП-10 районов по количеству объектов")}
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={districtData} layout="vertical" margin={{ top: 4, right: 8, left: 10, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" horizontal={false} />
                <XAxis type="number" tick={{ fontSize: 11, fill: "#64748b" }} />
                <YAxis dataKey="label" type="category" tick={{ fontSize: 10, fill: "#64748b" }} width={90} />
                <Tooltip formatter={(v: any) => [`${v} об.`, ""]} />
                <Bar dataKey="count" radius={[0, 4, 4, 0]}>
                  {districtData.map((_, i) => <Cell key={i} fill={DISTRICT_COLORS[i % DISTRICT_COLORS.length]} />)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </>
        )}
      </div>

      {/* Row 2: Dynamics (condition index trend) */}
      {dynamicsData.length > 0 && card(
        <>
          {sectionTitle("Тренд состояния инфраструктуры (12 месяцев)", "Condition Index — чем выше, тем лучше")}
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={dynamicsData} margin={{ top: 4, right: 8, left: -10, bottom: 4 }}>
              <defs>
                <linearGradient id="ciGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#1d4ed8" stopOpacity={0.2} />
                  <stop offset="95%" stopColor="#1d4ed8" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: "#64748b" }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "#64748b" }} />
              <Tooltip formatter={(v: any) => [`${v}`, "Index"]} />
              <Area type="monotone" dataKey="index" stroke="#1d4ed8" strokeWidth={2.5} fill="url(#ciGrad)" dot={false} />
            </AreaChart>
          </ResponsiveContainer>
        </>,
        { marginBottom: "20px" }
      )}

      {/* Row 3: Top-10 risk table */}
      {topRisk.length > 0 && card(
        <>
          {sectionTitle("ТОП-10 объектов по риску", "Наиболее проблемные объекты — требуют приоритетного внимания")}
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {topRisk.map((s: any, i) => (
              <div key={s.id}
                onClick={() => navigate(`/object/${s.id}`)}
                style={{ display: "flex", alignItems: "center", gap: "14px", padding: "12px 14px", borderRadius: "var(--radius-md)", background: "var(--gray-50)", cursor: "pointer", border: "1px solid var(--gray-100)", transition: "background 0.15s" }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#eff6ff"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "var(--gray-50)"}
              >
                <div style={{ width: 28, height: 28, borderRadius: "50%", background: i < 3 ? "#fee2e2" : "var(--gray-100)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, fontSize: "12px", color: i < 3 ? "#dc2626" : "var(--gray-400)", flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: "13px", color: "var(--gray-800)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</div>
                  <div style={{ fontSize: "11px", color: "var(--gray-400)", marginTop: "1px" }}>{s.type} · {s.district}</div>
                </div>
                <div style={{ flex: 1, minWidth: "80px", maxWidth: "180px" }}>
                  <div style={{ height: "6px", background: "var(--gray-200)", borderRadius: "3px", overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${Math.round(((s.risk_score ?? 0) / maxRiskScore) * 100)}%`, background: RISK_COLORS[s.risk_level] ?? "#64748b", borderRadius: "3px" }} />
                  </div>
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: "2px", flexShrink: 0 }}>
                  <span style={{ fontWeight: 700, fontSize: "14px", color: RISK_COLORS[s.risk_level] ?? "#64748b" }}>{s.risk_score?.toFixed(1) ?? "—"}</span>
                  <span style={{ fontSize: "11px", color: conditionColor[s.condition], fontWeight: 600 }}>{conditionLabel[s.condition] ?? s.condition}</span>
                </div>
                <span style={{ color: "var(--gray-300)", fontSize: "14px" }}>›</span>
              </div>
            ))}
          </div>
        </>
      )}
      <div style={{ marginTop: "20px" }}>
        <PriorityRanking limit={10} />
      </div>
    </div>
  );
}
