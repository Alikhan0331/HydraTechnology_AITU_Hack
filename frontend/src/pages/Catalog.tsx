import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getStructures, getMeta, deleteStructure } from "../api/structures";
import type { Structure } from "../api/structures";
import { conditionColor, conditionLabel } from "../utils/conditionColors";

const BASE_URL = (import.meta as any).env?.VITE_API_URL ?? "http://localhost:8000";

const MOCK: Structure[] = [
  { id: 1, name: "Большой Чуйский канал", type: "Канал", district: "Жамбылский", condition: "good", risk_level: "low", latitude: 42.85, longitude: 71.37 },
  { id: 2, name: "Шлюз №12", type: "Шлюз", district: "Меркенский", condition: "monitoring", risk_level: "medium", latitude: 42.91, longitude: 71.70 },
  { id: 3, name: "Плотина Тасоткель", type: "Плотина", district: "Жуалынский", condition: "requires_repair", risk_level: "high", latitude: 42.58, longitude: 72.10 },
  { id: 4, name: "Насосная станция №3", type: "Насосная станция", district: "Байзакский", condition: "emergency", risk_level: "critical", latitude: 42.75, longitude: 71.80 },
  { id: 5, name: "Канал арнасай", type: "Канал", district: "Таласский", condition: "monitoring", risk_level: "medium", latitude: 42.52, longitude: 71.90 },
  { id: 6, name: "Гидропост №15", type: "Гидропост", district: "Жамбылский", condition: "good", risk_level: "low", latitude: 42.78, longitude: 71.55 },
];

const PAGE_SIZE = 10;

const RISK_COLORS: Record<string, string> = {
  low: "#16a34a", medium: "#d97706", high: "#ea580c", critical: "#dc2626",
};
const RISK_LABELS: Record<string, string> = {
  low: "Низкий", medium: "Средний", high: "Высокий", critical: "Критический",
};

function normalizeStringList(data: any[]): string[] {
  return data.map((item) => {
    if (typeof item === "string") return item;
    return item.name_ru ?? item.name ?? item.code ?? String(item);
  });
}

function buildPages(current: number, total: number): (number | "…")[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: (number | "…")[] = [];
  const add = (n: number) => { if (!pages.includes(n)) pages.push(n); };
  add(1);
  if (current > 4) pages.push("…");
  for (let i = Math.max(2, current - 2); i <= Math.min(total - 1, current + 2); i++) add(i);
  if (current < total - 3) pages.push("…");
  add(total);
  return pages;
}

export default function Catalog() {
  const [structures, setStructures] = useState<Structure[]>(MOCK);
  const [types, setTypes] = useState(["Все", "Канал", "Шлюз", "Плотина", "Насосная станция", "Гидропост"]);
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("Все");
  const [condFilter, setCondFilter] = useState("Все");
  const [sortBy, setSortBy] = useState<"id" | "name" | "risk" | "year">("id");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const navigate = useNavigate();

  const conditions = ["Все", "good", "monitoring", "requires_repair", "emergency"];

  const reload = () => {
    getStructures().then((res) => { if (res.data?.length) setStructures(res.data); }).catch(() => {});
  };

  useEffect(() => {
    reload();
    getMeta("types").then((res) => {
      if (Array.isArray(res.data) && res.data.length) setTypes(["Все", ...normalizeStringList(res.data)]);
    }).catch(() => {});
  }, []);

  const handleDelete = async (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (!window.confirm("Удалить объект? Это действие нельзя отменить.")) return;
    setDeletingId(id);
    try {
      await deleteStructure(id);
      setStructures(s => s.filter(x => x.id !== id));
    } catch {
      alert("Ошибка при удалении");
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = structures
    .filter((s) => {
      const matchSearch = s.name.toLowerCase().includes(search.toLowerCase()) || s.district.toLowerCase().includes(search.toLowerCase());
      const matchType = typeFilter === "Все" || s.type === typeFilter;
      const matchCond = condFilter === "Все" || s.condition === condFilter;
      return matchSearch && matchType && matchCond;
    })
    .sort((a, b) => {
      let cmp = 0;
      if (sortBy === "name") cmp = a.name.localeCompare(b.name, "ru");
      else if (sortBy === "risk") {
        const order = ["low", "medium", "high", "critical"];
        cmp = order.indexOf(a.risk_level) - order.indexOf(b.risk_level);
      } else cmp = (a.id ?? 0) - (b.id ?? 0);
      return sortDir === "asc" ? cmp : -cmp;
    });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const handleSort = (col: typeof sortBy) => {
    if (sortBy === col) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortBy(col); setSortDir("asc"); }
  };

  const selectStyle: React.CSSProperties = {
    padding: "9px 12px", borderRadius: "var(--radius-sm)", border: "1px solid var(--gray-200)",
    background: "white", color: "var(--gray-700)", fontSize: "13px", outline: "none",
    boxShadow: "var(--shadow-sm)", cursor: "pointer",
  };

  const handleExport = (fmt: string) => {
    const params = new URLSearchParams();
    if (typeFilter !== "Все") params.set("type", typeFilter);
    if (condFilter !== "Все") params.set("condition", condFilter);
    if (search) params.set("search", search);
    window.open(`${BASE_URL}/api/reports/structures.${fmt}?${params.toString()}`, "_blank");
  };

  const SortArrow = ({ col }: { col: typeof sortBy }) =>
    sortBy === col ? <span style={{ marginLeft: 4, fontSize: 10 }}>{sortDir === "asc" ? "▲" : "▼"}</span> : null;

  const thStyle = (_col: typeof sortBy): React.CSSProperties => ({
    padding: "12px 16px", textAlign: "left", color: "var(--gray-500)", fontSize: "11px",
    fontWeight: 700, letterSpacing: "0.6px", textTransform: "uppercase",
    cursor: "pointer", whiteSpace: "nowrap", userSelect: "none",
  });

  const pages = buildPages(page, totalPages);

  return (
    <div style={{ padding: "32px 24px", background: "var(--gray-50)", minHeight: "100vh", boxSizing: "border-box" }}>
      {/* Header */}
      <div style={{ marginBottom: "24px", display: "flex", justifyContent: "space-between", alignItems: "flex-end", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ fontSize: "24px", color: "var(--gray-900)", marginBottom: "4px" }}>Каталог объектов</h1>
          <p style={{ color: "var(--gray-500)", fontSize: "13px" }}>Цифровой реестр гидротехнических сооружений</p>
        </div>
        <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
          {/* ✅ КНОПКА СОЗДАНИЯ */}
          <button
            onClick={() => navigate("/create")}
            style={{
              padding: "9px 18px", borderRadius: "var(--radius-sm)", border: "none",
              background: "#1d4ed8", color: "white", fontWeight: 700, fontSize: "13px",
              cursor: "pointer", boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center", gap: "6px", whiteSpace: "nowrap",
            }}
            onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = "#1e40af"}
            onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = "#1d4ed8"}
          >
            + Добавить объект
          </button>
          <div style={{ width: 1, height: 32, background: "var(--gray-200)", alignSelf: "center" }} />
          {[
            { fmt: "csv", label: "CSV", color: "#16a34a" },
            { fmt: "xlsx", label: "Excel", color: "#1d4ed8" },
            { fmt: "pdf", label: "PDF", color: "#dc2626" },
          ].map(({ fmt, label, color }) => (
            <button key={fmt} onClick={() => handleExport(fmt)}
              style={{ padding: "8px 14px", borderRadius: "var(--radius-sm)", border: `1px solid ${color}40`, background: color + "0a", color, fontWeight: 700, fontSize: "12px", cursor: "pointer", boxShadow: "var(--shadow-sm)", whiteSpace: "nowrap" }}
              onMouseEnter={e => (e.currentTarget as HTMLButtonElement).style.background = color + "18"}
              onMouseLeave={e => (e.currentTarget as HTMLButtonElement).style.background = color + "0a"}
            >↓ {label}</button>
          ))}
        </div>
      </div>

      {/* Filters */}
      <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "14px 16px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", display: "flex", gap: "10px", marginBottom: "20px", flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ position: "relative", flex: "1 1 180px", minWidth: "160px" }}>
          <span style={{ position: "absolute", left: 10, top: "50%", transform: "translateY(-50%)", color: "var(--gray-400)", fontSize: "14px", pointerEvents: "none" }}>🔍</span>
          <input placeholder="Поиск по названию / району..." value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            style={{ ...selectStyle, paddingLeft: "32px", width: "100%", boxSizing: "border-box" }} />
        </div>
        <select value={typeFilter} onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }} style={{ ...selectStyle, flex: "0 1 auto" }}>
          {types.map((t) => <option key={t} value={t}>{t}</option>)}
        </select>
        <select value={condFilter} onChange={(e) => { setCondFilter(e.target.value); setPage(1); }} style={{ ...selectStyle, flex: "0 1 auto" }}>
          {conditions.map((c) => <option key={c} value={c}>{c === "Все" ? "Все состояния" : conditionLabel[c]}</option>)}
        </select>
        <div style={{ marginLeft: "auto", background: "var(--primary-bg)", color: "var(--primary)", padding: "6px 14px", borderRadius: "20px", fontSize: "12px", fontWeight: 600, border: "1px solid #bfdbfe", whiteSpace: "nowrap" }}>
          {filtered.length} объектов
        </div>
      </div>

      {/* Table */}
      <div style={{ background: "white", borderRadius: "var(--radius-lg)", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto", width: "100%" }}>
          <table style={{ width: "100%", borderCollapse: "collapse", minWidth: "640px" }}>
            <thead>
              <tr style={{ background: "var(--gray-50)", borderBottom: "2px solid var(--gray-200)" }}>
                <th style={thStyle("name")} onClick={() => handleSort("name")}>Название <SortArrow col="name" /></th>
                <th style={{ ...thStyle("id"), cursor: "default" }}>Тип</th>
                <th style={{ ...thStyle("id"), cursor: "default" }}>Район</th>
                <th style={{ ...thStyle("id"), cursor: "default" }}>Состояние</th>
                <th style={thStyle("risk")} onClick={() => handleSort("risk")}>Риск <SortArrow col="risk" /></th>
                <th style={{ ...thStyle("id"), cursor: "default", width: "130px", textAlign: "right" }}>Действия</th>
              </tr>
            </thead>
            <tbody>
              {paginated.map((s, i) => (
                <tr key={s.id}
                  style={{ borderBottom: i < paginated.length - 1 ? "1px solid var(--gray-100)" : "none", cursor: "pointer" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "var(--gray-50)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLTableRowElement).style.background = "white"; }}
                  onClick={() => navigate(`/object/${s.id}`)}>
                  <td style={{ padding: "13px 16px", fontWeight: 600, color: "var(--gray-800)", maxWidth: "220px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{s.name}</td>
                  <td style={{ padding: "13px 16px", whiteSpace: "nowrap" }}>
                    <span style={{ background: "var(--gray-100)", color: "var(--gray-600)", padding: "3px 10px", borderRadius: "6px", fontSize: "12px", fontWeight: 500 }}>{s.type}</span>
                  </td>
                  <td style={{ padding: "13px 16px", color: "var(--gray-500)", whiteSpace: "nowrap", fontSize: "13px" }}>{s.district}</td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ background: conditionColor[s.condition] + "18", color: conditionColor[s.condition], padding: "4px 12px", borderRadius: "20px", fontWeight: 600, fontSize: "12px", border: `1px solid ${conditionColor[s.condition]}30`, whiteSpace: "nowrap" }}>
                      {conditionLabel[s.condition]}
                    </span>
                  </td>
                  <td style={{ padding: "13px 16px" }}>
                    <span style={{ color: RISK_COLORS[s.risk_level] ?? "#64748b", fontWeight: 600, fontSize: "12px", background: (RISK_COLORS[s.risk_level] ?? "#64748b") + "15", padding: "3px 10px", borderRadius: "20px", whiteSpace: "nowrap" }}>
                      {RISK_LABELS[s.risk_level] ?? s.risk_level}
                    </span>
                  </td>
                  {/* ✅ КНОПКИ ДЕЙСТВИЙ В СТРОКЕ */}
                  <td style={{ padding: "10px 14px", textAlign: "right" }}>
                    <div style={{ display: "flex", gap: "6px", justifyContent: "flex-end" }} onClick={e => e.stopPropagation()}>
                      <button
                        onClick={(e) => { e.stopPropagation(); navigate(`/edit/${s.id}`); }}
                        title="Редактировать"
                        style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #bfdbfe", background: "#eff6ff", color: "#1d4ed8", cursor: "pointer", fontSize: "13px", fontWeight: 600 }}
                      >✏️</button>
                      <button
                        onClick={(e) => handleDelete(e, s.id)}
                        disabled={deletingId === s.id}
                        title="Удалить"
                        style={{ padding: "5px 10px", borderRadius: "6px", border: "1px solid #fecaca", background: deletingId === s.id ? "#fee2e2" : "#fff5f5", color: "#dc2626", cursor: deletingId === s.id ? "default" : "pointer", fontSize: "13px", fontWeight: 600 }}
                      >{deletingId === s.id ? "⏳" : "🗑️"}</button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <div style={{ padding: "48px", textAlign: "center", color: "var(--gray-400)" }}>
            <div style={{ fontSize: "32px", marginBottom: "12px" }}>🔍</div>
            <div style={{ fontWeight: 600, marginBottom: "4px" }}>Объекты не найдены</div>
            <div style={{ fontSize: "13px" }}>Попробуйте изменить параметры поиска</div>
          </div>
        )}
      </div>

      {/* Footer pagination */}
      {totalPages > 1 && (
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "20px", flexWrap: "wrap", gap: "10px" }}>
          <span style={{ color: "var(--gray-400)", fontSize: "13px" }}>
            Показано {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filtered.length)} из {filtered.length}
          </span>
          <div style={{ display: "flex", gap: "4px", flexWrap: "wrap" }}>
            <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}
              style={{ padding: "7px 13px", borderRadius: "var(--radius-sm)", border: "1px solid var(--gray-200)", background: "white", color: page === 1 ? "var(--gray-300)" : "var(--gray-700)", cursor: page === 1 ? "default" : "pointer", fontSize: "13px" }}>←</button>
            {pages.map((p, i) =>
              p === "…"
                ? <span key={`el-${i}`} style={{ padding: "7px 4px", fontSize: "13px", color: "var(--gray-400)", alignSelf: "center" }}>…</span>
                : <button key={p} onClick={() => setPage(p as number)}
                    style={{ padding: "7px 12px", borderRadius: "var(--radius-sm)", border: page === p ? "1px solid var(--primary)" : "1px solid var(--gray-200)", background: page === p ? "var(--primary)" : "white", color: page === p ? "white" : "var(--gray-700)", cursor: "pointer", fontWeight: page === p ? 700 : 400, fontSize: "13px", minWidth: "36px" }}>{p}</button>
            )}
            <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}
              style={{ padding: "7px 13px", borderRadius: "var(--radius-sm)", border: "1px solid var(--gray-200)", background: "white", color: page === totalPages ? "var(--gray-300)" : "var(--gray-700)", cursor: page === totalPages ? "default" : "pointer", fontSize: "13px" }}>→</button>
          </div>
        </div>
      )}
    </div>
  );
}
