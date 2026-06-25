import { useEffect, useState } from "react";

const BASE = ((import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000") + "/api";

const fmt = (iso?: string) => {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-");
  return `${d}.${m}.${y}`;
};

const inspColor: Record<string, string> = {
  "Плановый": "#2563eb", "Внеочередной": "#d97706", "Аварийный": "#dc2626",
};
const repairColor: Record<string, string> = {
  "Текущий ремонт": "#0891b2", "Капитальный ремонт": "#7c3aed", "Аварийный ремонт": "#dc2626",
};

interface History { inspections: any[]; repairs: any[]; }

export default function OperationHistory({ structureId }: { structureId: number }) {
  const [data, setData] = useState<History>({ inspections: [], repairs: [] });

  useEffect(() => {
    fetch(`${BASE}/structures/${structureId}/history`)
      .then((r) => r.json())
      .then((d) => setData({ inspections: d.inspections || [], repairs: d.repairs || [] }))
      .catch(() => {});
  }, [structureId]);

  const row = (date: string, label: string, color: string, key: string) => (
    <div key={key} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "9px 0", borderBottom: "1px solid var(--gray-100)" }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: color, flexShrink: 0 }} />
      <span style={{ fontSize: "12px", color: "var(--gray-500)", fontWeight: 600, minWidth: "78px" }}>{fmt(date)}</span>
      <span style={{ fontSize: "13px", color: "var(--gray-800)" }}>{label}</span>
    </div>
  );

  const heading = (text: string) => (
    <div style={{ fontSize: "11px", fontWeight: 800, color: "var(--gray-400)", textTransform: "uppercase", letterSpacing: "0.7px", margin: "16px 0 4px" }}>{text}</div>
  );

  return (
    <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "20px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
      <h3 style={{ fontSize: "14px", color: "var(--gray-900)", margin: "0 0 4px", fontWeight: 700 }}>🛠️ История эксплуатации</h3>

      {heading("История осмотров")}
      {data.inspections.length === 0 && <div style={{ color: "var(--gray-400)", fontSize: "12px", padding: "6px 0" }}>Нет данных</div>}
      {data.inspections.map((i, k) => row(i.inspection_date, `${i.inspection_type} осмотр`, inspColor[i.inspection_type] || "#64748b", "i" + k))}

      {heading("История ремонтов")}
      {data.repairs.length === 0 && <div style={{ color: "var(--gray-400)", fontSize: "12px", padding: "6px 0" }}>Ремонтов не зарегистрировано</div>}
      {data.repairs.map((r, k) => row(r.repair_date, r.repair_type, repairColor[r.repair_type] || "#64748b", "r" + k))}
    </div>
  );
}
