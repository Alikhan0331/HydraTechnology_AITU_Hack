import { useEffect, useState } from "react";

const BASE = ((import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000") + "/api";

const levelColor: Record<string, string> = {
  "Низкий": "#16a34a", "Средний": "#d97706", "Высокий": "#ea580c", "Критический": "#dc2626",
};

interface Priority {
  priority_score: number;
  priority_level: string;
  next_inspection_recommendation: string;
}

export default function InspectionPriority({ structureId }: { structureId: number }) {
  const [p, setP] = useState<Priority | null>(null);

  useEffect(() => {
    fetch(`${BASE}/structures/${structureId}/priority`)
      .then((r) => r.json())
      .then(setP)
      .catch(() => {});
  }, [structureId]);

  if (!p) return null;
  const color = levelColor[p.priority_level] || "#64748b";

  return (
    <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "20px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
      <h3 style={{ fontSize: "13px", color: "var(--gray-400)", margin: "0 0 12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.6px" }}>
        Inspection Priority
      </h3>
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "6px" }}>
        <span style={{ fontSize: "40px", fontWeight: 900, color, lineHeight: 1, fontFamily: "Manrope, sans-serif" }}>{p.priority_score}</span>
        <span style={{ fontSize: "16px", color: "var(--gray-400)", fontWeight: 700 }}>/ 100</span>
      </div>
      <div style={{ display: "inline-block", background: color + "18", color, padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, marginBottom: "12px" }}>
        {p.priority_level} приоритет
      </div>
      <div style={{ height: 8, background: "var(--gray-100)", borderRadius: 999, overflow: "hidden", marginBottom: "12px" }}>
        <div style={{ height: "100%", width: `${p.priority_score}%`, background: color, borderRadius: 999 }} />
      </div>
      <div style={{ fontSize: "12px", color: "var(--gray-500)" }}>
        Следующий осмотр: <b style={{ color: "var(--gray-800)" }}>{p.next_inspection_recommendation}</b>
      </div>
    </div>
  );
}
