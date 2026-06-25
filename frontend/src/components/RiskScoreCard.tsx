import { useEffect, useState } from "react";

const BASE = ((import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000") + "/api";

interface RiskScore {
  risk_score: number;
  risk_level: string;
  risk_reasons: string[];
  color: string;
}

export default function RiskScoreCard({ structureId }: { structureId: number }) {
  const [r, setR] = useState<RiskScore | null>(null);

  useEffect(() => {
    fetch(`${BASE}/structures/${structureId}/risk-score`)
      .then((res) => res.json())
      .then(setR)
      .catch(() => {});
  }, [structureId]);

  if (!r) return null;
  const color = r.color || "#64748b";

  return (
    <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "20px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
      <h3 style={{ fontSize: "13px", color: "var(--gray-400)", margin: "0 0 12px", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.6px" }}>
        Risk Score
      </h3>
      <div style={{ display: "flex", alignItems: "baseline", gap: "6px", marginBottom: "6px" }}>
        <span style={{ fontSize: "40px", fontWeight: 900, color, lineHeight: 1, fontFamily: "Manrope, sans-serif" }}>{r.risk_score}</span>
        <span style={{ fontSize: "16px", color: "var(--gray-400)", fontWeight: 700 }}>/ 100</span>
      </div>
      <div style={{ display: "inline-block", background: color + "18", color, padding: "4px 12px", borderRadius: "999px", fontSize: "12px", fontWeight: 700, marginBottom: "12px" }}>
        {r.risk_level} риск
      </div>
      <div style={{ height: 8, background: "var(--gray-100)", borderRadius: 999, overflow: "hidden", marginBottom: "14px" }}>
        <div style={{ height: "100%", width: `${r.risk_score}%`, background: color, borderRadius: 999 }} />
      </div>
      <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--gray-500)", marginBottom: "8px" }}>Причины риска:</div>
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        {r.risk_reasons.map((reason, i) => (
          <div key={i} style={{ display: "flex", gap: "8px", alignItems: "flex-start" }}>
            <span style={{ color, fontWeight: 900, lineHeight: 1.4 }}>•</span>
            <span style={{ fontSize: "13px", color: "var(--gray-700)", lineHeight: 1.4 }}>{reason}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
