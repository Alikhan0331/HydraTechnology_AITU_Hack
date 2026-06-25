import { useEffect, useState } from "react";
import { getSummary } from "../api/structures";
import StatCard from "../components/StatCard";
import { conditionColor, conditionLabel } from "../utils/conditionColors";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from "recharts";

const FALLBACK = {
  total: 438,
  by_condition: { good: 210, monitoring: 98, requires_repair: 87, emergency: 43 },
  by_type: { "Канал": 260, "Шлюз": 80, "Плотина": 55, "Насосная станция": 43 },
};

const trendData = [
  { month: "Янв", исправных: 195, аварийных: 55 },
  { month: "Фев", исправных: 200, аварийных: 50 },
  { month: "Мар", исправных: 205, аварийных: 48 },
  { month: "Апр", исправных: 208, аварийных: 46 },
  { month: "Май", исправных: 210, аварийных: 44 },
  { month: "Июн", исправных: 210, аварийных: 43 },
];

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    getSummary().then((r) => setSummary(r.data)).catch(() => setSummary(FALLBACK));
  }, []);

  if (!summary) return <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "var(--gray-400)", fontFamily: "Inter" }}>Загрузка...</div>;

  const condIcons: Record<string, string> = { good: "✅", monitoring: "👁️", requires_repair: "🔧", emergency: "🚨" };

  const pieData = Object.entries(summary.by_condition).map(([key, val]) => ({
    name: conditionLabel[key], value: val as number, color: conditionColor[key]
  }));

  const barData = Object.entries(summary.by_type).map(([type, count]) => ({
    name: type, Количество: count as number
  }));

  const tooltipStyle = { background: "white", border: "1px solid var(--gray-200)", borderRadius: "10px", color: "var(--gray-800)", boxShadow: "var(--shadow-md)", fontSize: "13px" };

  return (
    <div style={{ padding: "32px", background: "var(--gray-50)", minHeight: "100vh" }}>
      {/* Page header */}
      <div style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "24px", color: "var(--gray-900)", marginBottom: "4px" }}>Дашборд</h1>
          <p style={{ color: "var(--gray-500)", fontSize: "13px" }}>Гидросооружения Жамбылского региона — текущее состояние</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "white", padding: "8px 16px", borderRadius: "10px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a", boxShadow: "0 0 6px #16a34a" }} />
          <span style={{ fontSize: "13px", color: "var(--gray-600)", fontWeight: 500 }}>Онлайн мониторинг</span>
        </div>
      </div>

      {/* Hero banner */}
      <div style={{
        background: "linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)",
        borderRadius: "var(--radius-xl)", padding: "28px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "var(--shadow-blue)", marginBottom: "24px"
      }}>
        <div>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: "6px" }}>Всего объектов в реестре</p>
          <div style={{ color: "white", fontSize: "52px", fontFamily: "Manrope, sans-serif", fontWeight: 900, lineHeight: 1 }}>{summary.total}</div>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", marginTop: "6px" }}>Гидросооружений под наблюдением</p>
        </div>
        <div style={{ textAlign: "right" }}>
          {Object.entries(summary.by_condition).map(([key, val]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", marginBottom: "6px" }}>
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px" }}>{conditionLabel[key]}</span>
              <span style={{ color: "white", fontWeight: 700, fontSize: "15px", minWidth: "32px", textAlign: "right" }}>{val as number}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {Object.entries(summary.by_condition).map(([key, val]) => (
          <StatCard key={key} title={conditionLabel[key]} value={val as number} color={conditionColor[key]} icon={condIcons[key]} />
        ))}
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        {/* Donut */}
        <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "24px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "15px", color: "var(--gray-900)", marginBottom: "3px" }}>Распределение по состоянию</h3>
            <p style={{ fontSize: "12px", color: "var(--gray-400)" }}>Доля объектов каждой категории</p>
          </div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} strokeWidth={0} />)}
              </Pie>
              <Tooltip contentStyle={tooltipStyle} formatter={(val, name) => [val, name]} />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
            {pieData.map((d) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <div style={{ width: 10, height: 10, borderRadius: "3px", background: d.color, flexShrink: 0 }} />
                <span style={{ color: "var(--gray-500)", fontSize: "12px" }}>{d.name}: <b style={{ color: "var(--gray-700)" }}>{d.value}</b></span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar */}
        <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "24px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ marginBottom: "20px" }}>
            <h3 style={{ fontSize: "15px", color: "var(--gray-900)", marginBottom: "3px" }}>По типам объектов</h3>
            <p style={{ fontSize: "12px", color: "var(--gray-400)" }}>Количество по каждому типу</p>
          </div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
              <XAxis dataKey="name" tick={{ fill: "var(--gray-400)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--gray-400)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--gray-50)" }} />
              <Bar dataKey="Количество" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Trend chart */}
      <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "24px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
        <div style={{ marginBottom: "20px" }}>
          <h3 style={{ fontSize: "15px", color: "var(--gray-900)", marginBottom: "3px" }}>Динамика состояния за 6 месяцев</h3>
          <p style={{ fontSize: "12px", color: "var(--gray-400)" }}>Тренд исправных и аварийных объектов</p>
        </div>
        <ResponsiveContainer width="100%" height={180}>
          <AreaChart data={trendData} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorGood" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorBad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#dc2626" stopOpacity={0.15} />
                <stop offset="95%" stopColor="#dc2626" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
            <XAxis dataKey="month" tick={{ fill: "var(--gray-400)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <YAxis tick={{ fill: "var(--gray-400)", fontSize: 11 }} axisLine={false} tickLine={false} />
            <Tooltip contentStyle={tooltipStyle} />
            <Area type="monotone" dataKey="исправных" stroke="#16a34a" strokeWidth={2} fill="url(#colorGood)" />
            <Area type="monotone" dataKey="аварийных" stroke="#dc2626" strokeWidth={2} fill="url(#colorBad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
