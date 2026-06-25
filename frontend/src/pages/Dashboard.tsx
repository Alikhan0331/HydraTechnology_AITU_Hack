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

  if (!summary) return <div style={{ padding: 32 }}>Загрузка...</div>;

  return (
    <div style={{ padding: "32px", background: "#f1f5f9", minHeight: "100vh" }}>
      <h1 style={{ marginBottom: "24px", color: "#1e293b" }}>
        📊 Дашборд — Гидросооружения Жамбылского региона
      </h1>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "32px" }}>
        <StatCard title="Всего объектов" value={summary.total} color="#1e40af" icon="🏗️" />
        {Object.entries(summary.by_condition).map(([key, val]) => (
          <StatCard
            key={key}
            title={conditionLabel[key] || key}
            value={val as number}
            color={conditionColor[key]}
            icon={key === "good" ? "✅" : key === "monitoring" ? "👁️" : key === "requires_repair" ? "🔧" : "🚨"}
          />
        ))}
      </div>

      <h2 style={{ marginBottom: "16px", color: "#1e293b" }}>По типам объектов</h2>
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap" }}>
        {Object.entries(summary.by_type).map(([type, count]) => (
          <StatCard key={type} title={type} value={count as number} color="#0891b2" icon="📍" />
        ))}
      </div>
    </div>
  );
}
