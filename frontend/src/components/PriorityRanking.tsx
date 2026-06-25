import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

const BASE = ((import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000") + "/api";

const levelColor: Record<string, string> = {
  "Низкий": "#16a34a", "Средний": "#d97706", "Высокий": "#ea580c", "Критический": "#dc2626",
};

interface Item {
  id: number; name: string; type: string; district: string;
  priority_score: number; priority_level: string; next_inspection_recommendation: string;
}

export default function PriorityRanking({ limit = 10 }: { limit?: number }) {
  const [items, setItems] = useState<Item[]>([]);
  const navigate = useNavigate();

  useEffect(() => {
    fetch(`${BASE}/analytics/priority-ranking?limit=${limit}`)
      .then((r) => r.json())
      .then((d) => setItems(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [limit]);

  const th: React.CSSProperties = { padding: "10px 14px", textAlign: "left", color: "var(--gray-500)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase" };
  const td: React.CSSProperties = { padding: "11px 14px", fontSize: "13px", color: "var(--gray-700)" };

  return (
    <div style={{ background: "white", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--gray-100)" }}>
        <h3 style={{ fontSize: "15px", color: "var(--gray-900)", margin: 0, fontWeight: 700 }}>🎯 ТОП объектов по приоритету осмотра</h3>
        <p style={{ fontSize: "12px", color: "var(--gray-400)", margin: "4px 0 0" }}>Экспертная модель приоритизации (детерминированная)</p>
      </div>
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ background: "var(--gray-50)", borderBottom: "2px solid var(--gray-200)" }}>
            <th style={th}>Название</th>
            <th style={th}>Тип</th>
            <th style={th}>Район</th>
            <th style={{ ...th, textAlign: "center" }}>Priority Score</th>
            <th style={th}>Рекомендуемый срок осмотра</th>
          </tr>
        </thead>
        <tbody>
          {items.map((s, i) => {
            const c = levelColor[s.priority_level] || "#64748b";
            return (
              <tr key={s.id}
                onClick={() => navigate(`/object/${s.id}`)}
                style={{ borderBottom: i < items.length - 1 ? "1px solid var(--gray-100)" : "none", cursor: "pointer" }}
                onMouseEnter={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "var(--gray-50)")}
                onMouseLeave={(e) => ((e.currentTarget as HTMLTableRowElement).style.background = "white")}
              >
                <td style={{ ...td, fontWeight: 600, color: "var(--gray-800)" }}>{s.name}</td>
                <td style={td}>{s.type}</td>
                <td style={{ ...td, color: "var(--gray-500)" }}>{s.district}</td>
                <td style={{ ...td, textAlign: "center" }}>
                  <span style={{ background: c + "18", color: c, padding: "4px 10px", borderRadius: "999px", fontWeight: 800, fontSize: "13px" }}>{s.priority_score}</span>
                </td>
                <td style={{ ...td, color: c, fontWeight: 600 }}>{s.next_inspection_recommendation}</td>
              </tr>
            );
          })}
        </tbody>
      </table>
      {items.length === 0 && <div style={{ padding: "32px", textAlign: "center", color: "var(--gray-400)", fontSize: "13px" }}>Нет данных</div>}
    </div>
  );
}
