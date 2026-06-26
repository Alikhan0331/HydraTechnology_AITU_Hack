import { useEffect, useState } from "react";

const BASE = ((import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000") + "/api";

interface District {
  district: string;
  health_index: number;
  status: string;
  color: string;
  objects_count: number;
  critical_objects: number;
  repair_required: number;
  average_risk: number;
}

export default function DistrictRating() {
  const [rows, setRows] = useState<District[]>([]);

  useEffect(() => {
    fetch(`${BASE}/analytics/district-rating`)
      .then((r) => r.json())
      .then((d) => setRows(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  const th: React.CSSProperties = { padding: "10px 14px", textAlign: "left", color: "var(--gray-500)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.5px", textTransform: "uppercase", whiteSpace: "nowrap" };
  const td: React.CSSProperties = { padding: "11px 14px", fontSize: "13px", color: "var(--gray-700)" };

  return (
    <div style={{ background: "white", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
      <div style={{ padding: "18px 20px", borderBottom: "1px solid var(--gray-100)" }}>
        <h3 style={{ fontSize: "15px", color: "var(--gray-900)", margin: 0, fontWeight: 700 }}>🗺️ Рейтинг районов</h3>
        <p style={{ fontSize: "12px", color: "var(--gray-400)", margin: "4px 0 0" }}>District Health Index — состояние гидротехнической инфраструктуры района</p>
      </div>
      <div style={{ overflowX: "auto" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "720px" }}>
          <thead>
            <tr style={{ background: "var(--gray-50)", borderBottom: "2px solid var(--gray-200)" }}>
              <th style={th}>Район</th>
              <th style={{ ...th, textAlign: "center" }}>Health Index</th>
              <th style={{ ...th, textAlign: "center" }}>Объектов</th>
              <th style={{ ...th, textAlign: "center" }}>Критических</th>
              <th style={{ ...th, textAlign: "center" }}>Треб. ремонта</th>
              <th style={{ ...th, textAlign: "center" }}>Ср. Risk Score</th>
              <th style={th}>Статус</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d, i) => (
              <tr key={d.district} style={{ borderBottom: i < rows.length - 1 ? "1px solid var(--gray-100)" : "none" }}>
                <td style={{ ...td, fontWeight: 600, color: "var(--gray-800)" }}>{d.district}</td>
                <td style={{ ...td, textAlign: "center" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", justifyContent: "center" }}>
                    <span style={{ fontWeight: 800, color: d.color, minWidth: "26px" }}>{d.health_index}</span>
                    <div style={{ width: 60, height: 6, background: "var(--gray-100)", borderRadius: 999, overflow: "hidden" }}>
                      <div style={{ height: "100%", width: `${d.health_index}%`, background: d.color, borderRadius: 999 }} />
                    </div>
                  </div>
                </td>
                <td style={{ ...td, textAlign: "center" }}>{d.objects_count}</td>
                <td style={{ ...td, textAlign: "center", color: d.critical_objects > 0 ? "#dc2626" : "var(--gray-400)", fontWeight: d.critical_objects > 0 ? 700 : 400 }}>{d.critical_objects}</td>
                <td style={{ ...td, textAlign: "center" }}>{d.repair_required}</td>
                <td style={{ ...td, textAlign: "center" }}>{d.average_risk}</td>
                <td style={td}>
                  <span style={{ background: d.color + "18", color: d.color, padding: "4px 12px", borderRadius: "999px", fontWeight: 700, fontSize: "12px", whiteSpace: "nowrap" }}>{d.status}</span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && <div style={{ padding: "32px", textAlign: "center", color: "var(--gray-400)", fontSize: "13px" }}>Нет данных</div>}
    </div>
  );
}
