import { useEffect, useState } from "react";
import { getSummary } from "../api/structures";
import StatCard from "../components/StatCard";
import { conditionColor, conditionLabel } from "../utils/conditionColors";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from "recharts";

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null);

  useEffect(() => {
    getSummary()
      .then((res) => setSummary(res.data))
      .catch(() => setSummary({
        total: 438,
        by_condition: { good: 210, monitoring: 98, requires_repair: 87, emergency: 43 },
        by_type: { "Канал": 260, "Шлюз": 80, "Плотина": 55, "Насосная станция": 43 },
      }));
  }, []);

  if (!summary) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100vh", color: "#64748b" }}>
      Загрузка...
    </div>
  );

  const condIcons: Record<string, string> = {
    good: "✅", monitoring: "👁️", requires_repair: "🔧", emergency: "🚨"
  };

  const pieData = Object.entries(summary.by_condition).map(([key, val]) => ({
    name: conditionLabel[key], value: val as number, color: conditionColor[key]
  }));

  const barData = Object.entries(summary.by_type).map(([type, count]) => ({
    name: type, Количество: count as number
  }));

  return (
    <div style={{ padding: "32px", minHeight: "100vh", background: "#0f172a" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ color: "white", fontSize: "26px", fontWeight: 800, margin: 0 }}>Дашборд</h1>
        <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: "14px" }}>
          Гидротехнические сооружения Жамбылского региона
        </p>
      </div>

      {/* Total banner */}
      <div style={{
        background: "linear-gradient(135deg, #1d4ed8, #0891b2)",
        borderRadius: "20px", padding: "28px 32px",
        display: "flex", alignItems: "center", justifyContent: "space-between",
        boxShadow: "0 8px 32px rgba(29,78,216,0.4)", marginBottom: "24px"
      }}>
        <div>
          <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 500, letterSpacing: "1px" }}>ВСЕГО ОБЪЕКТОВ</div>
          <div style={{ color: "white", fontSize: "56px", fontWeight: 900, lineHeight: 1 }}>{summary.total}</div>
          <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", marginTop: "4px" }}>Гидросооружений в каталоге</div>
        </div>
        <div style={{ fontSize: "72px", opacity: 0.3 }}>🏗️</div>
      </div>

      {/* Stat cards */}
      <div style={{ marginBottom: "12px" }}>
        <div style={{ color: "#94a3b8", fontSize: "12px", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "16px" }}>СОСТОЯНИЕ ОБЪЕКТОВ</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          {Object.entries(summary.by_condition).map(([key, val]) => (
            <StatCard key={key} title={conditionLabel[key]} value={val as number} color={conditionColor[key]} icon={condIcons[key]} />
          ))}
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px", marginBottom: "32px" }}>
        {/* Pie chart */}
        <div style={{ background: "#1e293b", borderRadius: "16px", padding: "24px", border: "1px solid #334155" }}>
          <div style={{ color: "white", fontWeight: 700, marginBottom: "20px", fontSize: "15px" }}>🍧 Распределение по состоянию</div>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={55} outerRadius={90} paddingAngle={3} dataKey="value">
                {pieData.map((entry, i) => <Cell key={i} fill={entry.color} />)}
              </Pie>
              <Tooltip
                contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "white" }}
                formatter={(val, name) => [val, name]}
              />
            </PieChart>
          </ResponsiveContainer>
          <div style={{ display: "flex", flexWrap: "wrap", gap: "10px", marginTop: "8px" }}>
            {pieData.map((d) => (
              <div key={d.name} style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: d.color }} />
                <span style={{ color: "#94a3b8", fontSize: "12px" }}>{d.name}: {d.value}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Bar chart */}
        <div style={{ background: "#1e293b", borderRadius: "16px", padding: "24px", border: "1px solid #334155" }}>
          <div style={{ color: "white", fontWeight: 700, marginBottom: "20px", fontSize: "15px" }}>📊 Количество по типам</div>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="name" tick={{ fill: "#64748b", fontSize: 12 }} />
              <YAxis tick={{ fill: "#64748b", fontSize: 12 }} />
              <Tooltip contentStyle={{ background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "white" }} />
              <Bar dataKey="Количество" fill="#3b82f6" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Type cards */}
      <div style={{ color: "#94a3b8", fontSize: "12px", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", marginBottom: "16px" }}>ПО ТИПАМ</div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
        {Object.entries(summary.by_type).map(([type, count]) => (
          <StatCard key={type} title={type} value={count as number} color="#06b6d4" icon="📍" />
        ))}
      </div>
    </div>
  );
}
