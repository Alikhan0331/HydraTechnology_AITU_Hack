import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStructures, getMeta } from "../api/structures";
import type { Structure } from "../api/structures";
import { conditionColor, conditionLabel } from "../utils/conditionColors";

const MOCK: Structure[] = [
  { id: 1, name: "Большой Чуйский канал", type: "Канал", district: "Жамбылский", condition: "good", risk_level: "low", latitude: 42.85, longitude: 71.37 },
  { id: 2, name: "Шлюз №12", type: "Шлюз", district: "Меркенский", condition: "monitoring", risk_level: "medium", latitude: 42.91, longitude: 71.70 },
  { id: 3, name: "Плотина Тасоткель", type: "Плотина", district: "Жуалынский", condition: "requires_repair", risk_level: "high", latitude: 42.58, longitude: 72.10 },
  { id: 4, name: "Насосная станция №3", type: "Насосная станция", district: "Байзакский", condition: "emergency", risk_level: "critical", latitude: 42.75, longitude: 71.80 },
  { id: 5, name: "Канал арнасай", type: "Канал", district: "Таласский", condition: "monitoring", risk_level: "medium", latitude: 42.52, longitude: 71.90 },
  { id: 6, name: "Гидропост №15", type: "Гидропост", district: "Жамбылский", condition: "good", risk_level: "low", latitude: 42.78, longitude: 71.55 },
];

const PAGE_SIZE = 10;

// Если API вернёт массив объектов — берём строку из поля name_ru / name / code
function normalizeStringList(data: any[]): string[] {
  return data.map((item) => {
    if (typeof item === "string") return item;
    return item.name_ru ?? item.name ?? item.code ?? String(item);
  });
}

export default function Catalog() {
  const [structures, setStructures] = useState<Structure[]>(MOCK);
  const [types, setTypes] = useState(["Все", "Канал", "Шлюз", "Плотина", "Насосная станция", "Гидропост"]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Все");
  const [condFilter, setCondFilter] = useState("Все");
  const [page, setPage] = useState(1);
  const navigate = useNavigate();

  const conditions = ["Все", "good", "monitoring", "requires_repair", "emergency"];

  useEffect(() => {
    getStructures().then((res) => { if (res.data?.length) setStructures(res.data); }).catch(() => {});
    getMeta("types").then((res) => {
      if (Array.isArray(res.data) && res.data.length) {
        setTypes(["Все", ...normalizeStringList(res.data)]);
      }
    }).catch(() => {});
  }, []);

  const filtered = structures.filter((s) => {
    const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.district.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "Все" || s.type === typeFilter;
    const matchCond = condFilter === "Все" || s.condition === condFilter;
    return matchSearch && matchType && matchCond;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const selectStyle: React.CSSProperties = { padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--gray-200)", background: "white", color: "var(--gray-700)", fontSize: "13px", outline: "none", boxShadow: "var(--shadow-sm)", cursor: "pointer" };

  const handleExport = (fmt: string) => {
    const params = new URLSearchParams();
    if (typeFilter !== "Все") params.set("type", typeFilter);
    if (condFilter !== "Все") params.set("condition", condFilter);
    if (search) params.set("search", search);
    window.open(`http://localhost:8000/api/reports/structures.${fmt}?${params.toString()}`, "_blank");
  };

  return (
    <div style={{ padding: "32px", background: "var(--gray-50)", minHeight: "100vh" }}>
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", color: "var(--gray-900)", marginBottom: "4px" }}>Каталог объектов</h1>
          <p style={{ color: "var(--gray-500)", fontSize: "13px" }}>Цифровой реестр гидротехнических сооружений</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          {[
            { fmt: "csv", label: "CSV", color: "#16a34a" },
            { fmt: "xlsx", label: "Excel", color: "#1d4ed8" },
            { fmt: "pdf", label: "PDF", color: "#dc2626" },
          ].map(({ fmt, label, color }) => (
            <button key={fmt} onClick={() => handleExport(fmt)}
              style={{ padding: "8px 16px", borderRadius: "var(--radius-sm)", border: `1px solid ${color}40`, background: color + "0a", color, fontWeight: 700, fontSize: "12px", cursor: "pointer", boxShadow: "var(--shadow-sm)" }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = color + "18"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = color + "0a"}
            >↓ {label}</button>
          ))}
        </div>
      </div>

      <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "16px 20px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "220px" }}>
          <span style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", fontSize: "15px", pointerEvents: "none" }}>🔍</span>
          <input placeholder="Поиск..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} style={{ ...selectStyle, paddingLeft: "36px", width: "100%" }} />
        </div>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} style={selectStyle}>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={condFilter} onChange={(e) => { setCondFilter(e.target.value); setPage(1); }} style={selectStyle}>
          {conditions.map((c) => <option key={c} value={c}>{c === "Все" ? "Все состояния" : conditionLabel[c]}</option>)}
        </select>
        <div style={{ marginLeft: "auto", background: "var(--primary-bg)", color: "var(--primary)", padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, border: "1px solid #bfdbfe" }}>{filtered.length} объектов</div>
      </div>

      <div style={{ background: "white", borderRadius: "var(--radius-lg)", overflow: "hidden", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
          <thead>
            <tr style={{ background: "var(--gray-50)", borderBottom: "2px solid var(--gray-200)" }}>
              {["Название", "Тип", "Район", "Состояние", "Риск", ""].map((h, i) => (
                <th key={i} style={{ padding: "12px 16px", textAlign: "left", color: "var(--gray-500)", fontSize: "11px", fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase" }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {paginated.map((s, i) => (
              <tr key={s.id} style={{ borderBottom: i < paginated.length - 1 ? "1px solid var(--gray-100)" : "none", cursor: "pointer" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--gray-50)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "white"; }}
                onClick={() => navigate(`/object/${s.id}`)}>
                <td style={{ padding: "14px 16px", fontWeight: 600, color: "var(--gray-800)" }}>{s.name}</td>
                <td style={{ padding: "14px 16px" }}><span style={{ background: "var(--gray-100)", color: "var(--gray-600)", padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 500 }}>{s.type}</span></td>
                <td style={{ padding: "14px 16px", color: "var(--gray-500)" }}>{s.district}</td>
                <td style={{ padding: "14px 16px" }}><span style={{ background: conditionColor[s.condition] + "18", color: conditionColor[s.condition], padding: "4px 12px", borderRadius: "20px", fontWeight: 600, fontSize: "12px", border: `1px solid ${conditionColor[s.condition]}30` }}>{conditionLabel[s.condition]}</span></td>
                <td style={{ padding: "14px 16px", color: "var(--gray-400)", fontSize: "13px" }}>{s.risk_level}</td>
                <td style={{ padding: "14px 16px" }}><span style={{ color: "var(--primary-light)", fontSize: "13px", fontWeight: 500 }}>Открыть →</span></td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && <div style={{ padding: "48px", textAlign: "center", color: "var(--gray-400)" }}>Объекты не найдены</div>}
      </div>

      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "center", gap: "6px", marginTop: "20px" }}>
          {["←", ...Array.from({ length: totalPages }, (_, i) => String(i + 1)), "→"].map((btn, i) => {
            const isArrow = btn === "←" || btn === "→";
            const targetPage = btn === "←" ? page - 1 : btn === "→" ? page + 1 : Number(btn);
            const disabled = (btn === "←" && page === 1) || (btn === "→" && page === totalPages);
            const active = !isArrow && Number(btn) === page;
            return (
              <button key={i} onClick={() => !disabled && setPage(targetPage)} disabled={disabled}
                style={{ padding: "8px 14px", borderRadius: "var(--radius-sm)", border: active ? "1px solid var(--primary)" : "1px solid var(--gray-200)", background: active ? "var(--primary)" : "white", color: active ? "white" : disabled ? "var(--gray-300)" : "var(--gray-700)", cursor: disabled ? "default" : "pointer", fontWeight: active ? 700 : 400, fontSize: "13px", boxShadow: "var(--shadow-sm)" }}>{btn}</button>
            );
          })}
        </div>
      )}
    </div>
  );
}
