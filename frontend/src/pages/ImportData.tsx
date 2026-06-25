import { useState } from "react";

const BASE = ((import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000") + "/api";
const TYPES = ["Канал", "Плотина", "Дамба", "Шлюз", "Водозабор", "Насосная станция", "Гидропост", "Другое"];

export default function ImportData() {
  const [file, setFile] = useState<File | null>(null);
  const [defaultType, setDefaultType] = useState("Канал");
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  const upload = async () => {
    if (!file) return;
    setLoading(true); setReport(null); setError(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch(
        `${BASE}/import/structures?default_type=${encodeURIComponent(defaultType)}`,
        { method: "POST", body: fd }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Ошибка загрузки");
      setReport(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const stat = (label: string, value: number, color: string) => (
    <div style={{ flex: 1, background: "white", border: "1px solid var(--gray-200)", borderRadius: "var(--radius-md)", padding: "16px", textAlign: "center", boxShadow: "var(--shadow-sm)" }}>
      <div style={{ fontSize: "28px", fontWeight: 800, color }}>{value ?? 0}</div>
      <div style={{ fontSize: "12px", color: "var(--gray-500)", fontWeight: 600 }}>{label}</div>
    </div>
  );

  return (
    <div style={{ padding: "32px", background: "var(--gray-50)", minHeight: "100vh" }}>
      <h1 style={{ fontSize: "24px", color: "var(--gray-900)", marginBottom: "4px" }}>📥 Импорт данных</h1>
      <p style={{ color: "var(--gray-500)", fontSize: "13px", marginBottom: "24px" }}>
        Загрузите файл (.xls / .xlsx / .csv) — система проверит дубликаты и добавит новые объекты в каталог.
      </p>

      <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "24px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", maxWidth: "640px" }}>
        <div style={{ display: "flex", gap: "12px", flexWrap: "wrap", alignItems: "center", marginBottom: "16px" }}>
          <input type="file" accept=".xls,.xlsx,.csv"
            onChange={(e) => { setFile(e.target.files?.[0] ?? null); setReport(null); }}
            style={{ flex: 1, minWidth: "240px" }} />
          <label style={{ fontSize: "13px", color: "var(--gray-600)" }}>Тип по умолчанию:</label>
          <select value={defaultType} onChange={(e) => setDefaultType(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--gray-200)" }}>
            {TYPES.map((t) => <option key={t}>{t}</option>)}
          </select>
        </div>
        <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
          <button onClick={upload} disabled={!file || loading}
            style={{ padding: "10px 20px", borderRadius: "var(--radius-sm)", border: "none", cursor: file && !loading ? "pointer" : "default", background: file && !loading ? "linear-gradient(135deg,#1d4ed8,#0ea5e9)" : "var(--gray-300)", color: "white", fontWeight: 700 }}>
            {loading ? "Загрузка..." : "Загрузить и проверить"}
          </button>
          <a href={`${BASE}/import/template.csv`} style={{ fontSize: "13px", color: "var(--primary)" }}>Скачать шаблон CSV</a>
        </div>
      </div>

      {error && <div style={{ marginTop: "16px", color: "#dc2626", fontWeight: 600 }}>⚠️ {error}</div>}

      {report && (
        <div style={{ marginTop: "24px", maxWidth: "640px" }}>
          <div style={{ display: "flex", gap: "12px", marginBottom: "16px" }}>
            {stat("Добавлено", report.created, "#16a34a")}
            {stat("Дубликатов", report.duplicates, "#d97706")}
            {stat("Пропущено", report.skipped_empty, "#64748b")}
            {stat("Ошибок", report.errors, "#dc2626")}
          </div>
          {report.duplicate_items?.length > 0 && (
            <div style={{ background: "white", borderRadius: "var(--radius-md)", padding: "16px", border: "1px solid var(--gray-200)", marginBottom: "12px" }}>
              <div style={{ fontWeight: 700, fontSize: "13px", marginBottom: "8px" }}>Пропущены как дубликаты:</div>
              {report.duplicate_items.slice(0, 30).map((d: any, i: number) => (
                <div key={i} style={{ fontSize: "12px", color: "var(--gray-600)" }}>• {d.name} — уже есть: {d.matched_name}</div>
              ))}
            </div>
          )}
          {report.created > 0 && (
            <div style={{ color: "#16a34a", fontWeight: 600, fontSize: "14px" }}>
              ✅ {report.created} объектов добавлено — они уже в Каталоге и на Карте.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
