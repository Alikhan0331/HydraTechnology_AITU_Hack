import { useEffect, useState } from "react";
import { getSummary } from "../api/structures";
import StatCard from "../components/StatCard";
import { conditionColor, conditionLabel } from "../utils/conditionColors";

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

  return (
    <div style={{ padding: "32px", minHeight: "100vh", background: "#0f172a" }}>
      {/* Header */}
      <div style={{ marginBottom: "32px" }}>
        <h1 style={{ color: "white", fontSize: "26px", fontWeight: 800, margin: 0 }}>
          Дашборд
        </h1>
        <p style={{ color: "#64748b", margin: "6px 0 0", fontSize: "14px" }}>
          Гидротехнические сооружения Жамбылского региона — обзор состояния
        </p>
      </div>

      {/* Total */}
      <div style={{ marginBottom: "24px" }}>
        <div style={{
          background: "linear-gradient(135deg, #1d4ed8, #0891b2)",
          borderRadius: "20px", padding: "28px 32px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
          boxShadow: "0 8px 32px rgba(29,78,216,0.4)",
        }}>
          <div>
            <div style={{ color: "rgba(255,255,255,0.7)", fontSize: "13px", fontWeight: 500 }}>ВСЕГО ОБЪЕКТОВ</div>
            <div style={{ color: "white", fontSize: "56px", fontWeight: 900, lineHeight: 1 }}>{summary.total}</div>
            <div style={{ color: "rgba(255,255,255,0.6)", fontSize: "13px", marginTop: "4px" }}>Гидросооружений в каталоге</div>
          </div>
          <div style={{ fontSize: "72px", opacity: 0.3 }}>🏗️</div>
        </div>
      </div>

      {/* Condition cards */}
      <div style={{ marginBottom: "12px" }}>
        <h2 style={{ color: "#94a3b8", fontSize: "12px", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 16px" }}>
          СОСТОЯНИЕ ОБЪЕКТОВ
        </h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "16px", marginBottom: "32px" }}>
          {Object.entries(summary.by_condition).map(([key, val]) => (
            <StatCard
              key={key}
              title={conditionLabel[key] || key}
              value={val as number}
              color={conditionColor[key]}
              icon={condIcons[key]}
            />
          ))}
        </div>
      </div>

      {/* Type cards */}
      <h2 style={{ color: "#94a3b8", fontSize: "12px", fontWeight: 600, letterSpacing: "1px", textTransform: "uppercase", margin: "0 0 16px" }}>
        ПО ТИПАМ ОБЪЕКТОВ
      </h2>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "16px" }}>
        {Object.entries(summary.by_type).map(([type, count]) => (
          <StatCard key={type} title={type} value={count as number} color="#06b6d4" icon="📍" />
        ))}
      </div>
    </div>
  );
}
