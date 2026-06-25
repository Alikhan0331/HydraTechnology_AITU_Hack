import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getSummary, getTopRisk, getAnalyticsDynamics, getMapData } from "../api/structures";
import type { Structure } from "../api/structures";
import StatCard from "../components/StatCard";
import { conditionColor, conditionLabel } from "../utils/conditionColors";
import { MapContainer, TileLayer, CircleMarker, Popup } from "react-leaflet";
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
  BarChart, Bar, XAxis, YAxis, CartesianGrid, AreaChart, Area
} from "recharts";
import "leaflet/dist/leaflet.css";

const FALLBACK_SUMMARY = {
  total: 438,
  by_condition: { good: 210, monitoring: 98, requires_repair: 87, emergency: 43 },
  by_type: { "Канал": 260, "Шлюз": 80, "Плотина": 55, "Насосная станция": 43 },
};

const FALLBACK_TREND = [
  { month: "Янв", исправных: 195, аварийных: 55 },
  { month: "Фев", исправных: 200, аварийных: 50 },
  { month: "Мар", исправных: 205, аварийных: 48 },
  { month: "Апр", исправных: 208, аварийных: 46 },
  { month: "Май", исправных: 210, аварийных: 44 },
  { month: "Июн", исправных: 210, аварийных: 43 },
];

const FALLBACK_TOP_RISK = [
  { id: 4, name: "Насосная станция №3", risk_level: "critical", condition: "emergency", district: "Байзакский" },
  { id: 3, name: "Плотина Тасоткель", risk_level: "high", condition: "requires_repair", district: "Жуалынский" },
  { id: 2, name: "Шлюз №12", risk_level: "medium", condition: "monitoring", district: "Меркенский" },
];

const FALLBACK_MAP: Structure[] = [
  { id: 1, name: "Большой Чуйский канал", type: "Канал", district: "Жамбылский", condition: "good", risk_level: "low", latitude: 42.85, longitude: 71.37 },
  { id: 2, name: "Шлюз №12", type: "Шлюз", district: "Меркенский", condition: "monitoring", risk_level: "medium", latitude: 42.91, longitude: 71.70 },
  { id: 3, name: "Плотина Тасоткель", type: "Плотина", district: "Жуалынский", condition: "requires_repair", risk_level: "high", latitude: 42.58, longitude: 72.10 },
  { id: 4, name: "Насосная станция №3", type: "Насосная станция", district: "Байзакский", condition: "emergency", risk_level: "critical", latitude: 42.75, longitude: 71.80 },
  { id: 5, name: "Канал Арнасай", type: "Канал", district: "Таласский", condition: "monitoring", risk_level: "medium", latitude: 42.52, longitude: 71.90 },
];

function normalizeSummary(data: any) {
  let by_condition = data.by_condition;
  let by_type = data.by_type;
  if (Array.isArray(by_condition)) {
    by_condition = Object.fromEntries(
      by_condition.map((item: any) => [item.code ?? item.condition ?? item.name_ru, item.count ?? item.value ?? 0])
    );
  }
  if (Array.isArray(by_type)) {
    by_type = Object.fromEntries(
      by_type.map((item: any) => [item.name_ru ?? item.type ?? item.name, item.count ?? item.value ?? 0])
    );
  }
  return { ...data, by_condition, by_type };
}

const RISK_COLORS: Record<string, string> = { critical: "#dc2626", high: "#ea580c", medium: "#d97706", low: "#16a34a" };
const RISK_LABELS: Record<string, string> = { critical: "Критический", high: "Высокий", medium: "Средний", low: "Низкий" };

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(FALLBACK_SUMMARY);
  const [trend, setTrend] = useState<any[]>(FALLBACK_TREND);
  const [topRisk, setTopRisk] = useState<any[]>(FALLBACK_TOP_RISK);
  const [mapStructures, setMapStructures] = useState<Structure[]>(FALLBACK_MAP);
  const navigate = useNavigate();

  useEffect(() => {
    getSummary().then((r) => { if (r.data?.total) setSummary(normalizeSummary(r.data)); }).catch(() => {});
    getAnalyticsDynamics().then((r) => { if (Array.isArray(r.data) && r.data.length > 0) setTrend(r.data); }).catch(() => {});
    getTopRisk().then((r) => { if (Array.isArray(r.data) && r.data.length > 0) setTopRisk(r.data); }).catch(() => {});
    getMapData().then((r) => { if (Array.isArray(r.data) && r.data.length > 0) setMapStructures(r.data); }).catch(() => {});
  }, []);

  const condIcons: Record<string, string> = { good: "✅", monitoring: "👁️", requires_repair: "🔧", emergency: "🚨" };
  const pieData = Object.entries(summary.by_condition).map(([key, val]) => ({ name: conditionLabel[key] ?? key, value: val as number, color: conditionColor[key] ?? "#888" }));
  const barData = Object.entries(summary.by_type).map(([type, count]) => ({ name: type, Количество: count as number }));
  const tooltipStyle = { background: "white", border: "1px solid var(--gray-200)", borderRadius: "10px", color: "var(--gray-800)", boxShadow: "var(--shadow-md)", fontSize: "13px" };

  return (
    <div style={{ padding: "32px", background: "var(--gray-50)", minHeight: "100vh" }}>
      {/* Header */}
      <div style={{ marginBottom: "28px", display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
        <div>
          <h1 style={{ fontSize: "24px", color: "var(--gray-900)", marginBottom: "4px" }}>Дашборд</h1>
          <p style={{ color: "var(--gray-500)", fontSize: "13px" }}>Гидросооружения Жамбылского региона</p>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: "8px", background: "white", padding: "8px 16px", borderRadius: "10px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
          <div style={{ width: 8, height: 8, borderRadius: "50%", background: "#16a34a", boxShadow: "0 0 6px #16a34a" }} />
          <span style={{ fontSize: "13px", color: "var(--gray-600)", fontWeight: 500 }}>Онлайн</span>
        </div>
      </div>

      {/* Hero banner */}
      <div style={{ background: "linear-gradient(135deg, #1d4ed8 0%, #0ea5e9 100%)", borderRadius: "var(--radius-xl)", padding: "28px 32px", display: "flex", alignItems: "center", justifyContent: "space-between", boxShadow: "var(--shadow-blue)", marginBottom: "24px" }}>
        <div>
          <p style={{ color: "rgba(255,255,255,0.7)", fontSize: "12px", fontWeight: 600, letterSpacing: "1.2px", textTransform: "uppercase", marginBottom: "6px" }}>Всего объектов</p>
          <div style={{ color: "white", fontSize: "52px", fontFamily: "Manrope, sans-serif", fontWeight: 900, lineHeight: 1 }}>{summary.total}</div>
          <p style={{ color: "rgba(255,255,255,0.6)", fontSize: "12px", marginTop: "6px" }}>Гидросооружений под наблюдением</p>
        </div>
        <div style={{ textAlign: "right" }}>
          {Object.entries(summary.by_condition).map(([key, val]) => (
            <div key={key} style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", gap: "10px", marginBottom: "6px" }}>
              <span style={{ color: "rgba(255,255,255,0.8)", fontSize: "13px" }}>{conditionLabel[key] ?? key}</span>
              <span style={{ color: "white", fontWeight: 700, fontSize: "15px", minWidth: "32px", textAlign: "right" }}>{val as number}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Stat cards */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: "16px", marginBottom: "24px" }}>
        {Object.entries(summary.by_condition).map(([key, val]) => (
          <StatCard key={key} title={conditionLabel[key] ?? key} value={val as number} color={conditionColor[key] ?? "#888"} icon={condIcons[key]} />
        ))}
      </div>

      {/* MAP SECTION — full width */}
      <div style={{
        background: "white", borderRadius: "var(--radius-xl)",
        border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)",
        overflow: "hidden", marginBottom: "24px",
      }}>
        {/* Map header */}
        <div style={{
          padding: "16px 20px", display: "flex", justifyContent: "space-between",
          alignItems: "center", borderBottom: "1px solid var(--gray-100)",
        }}>
          <div>
            <div style={{ fontWeight: 700, fontSize: "15px", color: "var(--gray-900)" }}>🗺️ Карта объектов</div>
            <div style={{ fontSize: "12px", color: "var(--gray-400)", marginTop: "2px" }}>Геовизуализация гидротехнических сооружений региона</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {/* Легенда */}
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {Object.entries(conditionColor).map(([key, color]) => (
                <div key={key} style={{ display: "flex", alignItems: "center", gap: "5px" }}>
                  <div style={{ width: 9, height: 9, borderRadius: "50%", background: color }} />
                  <span style={{ fontSize: "11px", color: "var(--gray-500)" }}>{conditionLabel[key]}</span>
                </div>
              ))}
            </div>
            <div style={{ width: 1, height: 18, background: "var(--gray-200)" }} />
            <span style={{ fontSize: "12px", color: "var(--primary)", fontWeight: 600,
              background: "var(--primary-bg)", padding: "4px 12px", borderRadius: "12px",
              border: "1px solid #bfdbfe" }}>
              {mapStructures.length} объектов
            </span>
          </div>
        </div>

        {/* Map itself */}
        <div style={{ height: "340px" }}>
          <MapContainer center={[42.85, 71.37]} zoom={8} style={{ height: "100%", width: "100%" }} scrollWheelZoom={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap contributors' />
            {mapStructures.map((s) => (
              <CircleMarker
                key={s.id}
                center={[s.latitude, s.longitude]}
                radius={9}
                fillColor={conditionColor[s.condition] ?? "#94a3b8"}
                color="white" weight={2} fillOpacity={0.9}
              >
                <Popup maxWidth={210}>
                  <div style={{ fontFamily: "Inter, sans-serif", minWidth: "180px" }}>
                    <div style={{ fontWeight: 700, fontSize: "13px", color: "#1e293b", marginBottom: "2px" }}>{s.name}</div>
                    <div style={{ color: "#94a3b8", fontSize: "11px", marginBottom: "8px" }}>{s.type} · {s.district}</div>
                    <div style={{ display: "flex", gap: "5px", marginBottom: "10px" }}>
                      <span style={{ color: conditionColor[s.condition], fontWeight: 600, fontSize: "11px", background: conditionColor[s.condition] + "18", padding: "2px 8px", borderRadius: "10px", border: `1px solid ${conditionColor[s.condition]}30` }}>
                        {conditionLabel[s.condition]}
                      </span>
                    </div>
                    <button onClick={() => navigate(`/object/${s.id}`)}
                      style={{ background: "#1d4ed8", color: "white", border: "none", padding: "6px 12px", borderRadius: "6px", cursor: "pointer", fontSize: "12px", fontWeight: 600, width: "100%" }}>
                      Открыть карточку →
                    </button>
                  </div>
                </Popup>
              </CircleMarker>
            ))}
          </MapContainer>
        </div>
      </div>

      {/* Charts row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px", marginBottom: "20px" }}>
        <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "24px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
          <h3 style={{ fontSize: "15px", color: "var(--gray-900)", marginBottom: "3px" }}>Распределение по состоянию</h3>
          <p style={{ fontSize: "12px", color: "var(--gray-400)", marginBottom: "16px" }}>Доля объектов каждой категории</p>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart><Pie data={pieData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} paddingAngle={3} dataKey="value">{pieData.map((entry, i) => <Cell key={i} fill={entry.color} strokeWidth={0} />)}</Pie><Tooltip contentStyle={tooltipStyle} /></PieChart>
          </ResponsiveContainer>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "8px", marginTop: "8px" }}>
            {pieData.map((d, i) => (<div key={i} style={{ display: "flex", alignItems: "center", gap: "8px" }}><div style={{ width: 10, height: 10, borderRadius: "3px", background: d.color }} /><span style={{ color: "var(--gray-500)", fontSize: "12px" }}>{d.name}: <b style={{ color: "var(--gray-700)" }}>{d.value}</b></span></div>))}
          </div>
        </div>
        <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "24px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
          <h3 style={{ fontSize: "15px", color: "var(--gray-900)", marginBottom: "3px" }}>По типам объектов</h3>
          <p style={{ fontSize: "12px", color: "var(--gray-400)", marginBottom: "16px" }}>Количество по каждому типу</p>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={barData} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
              <XAxis dataKey="name" tick={{ fill: "var(--gray-400)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--gray-400)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} cursor={{ fill: "var(--gray-50)" }} />
              <Bar dataKey="Количество" fill="#1d4ed8" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Bottom row */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "20px" }}>
        <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "24px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
          <h3 style={{ fontSize: "15px", color: "var(--gray-900)", marginBottom: "3px" }}>Динамика состояния</h3>
          <p style={{ fontSize: "12px", color: "var(--gray-400)", marginBottom: "16px" }}>Тренд за 6 месяцев</p>
          <ResponsiveContainer width="100%" height={180}>
            <AreaChart data={trend} margin={{ left: -20, right: 0, top: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="cG" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#16a34a" stopOpacity={0.15} /><stop offset="95%" stopColor="#16a34a" stopOpacity={0} /></linearGradient>
                <linearGradient id="cB" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#dc2626" stopOpacity={0.15} /><stop offset="95%" stopColor="#dc2626" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--gray-100)" />
              <XAxis dataKey="month" tick={{ fill: "var(--gray-400)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: "var(--gray-400)", fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={tooltipStyle} />
              <Area type="monotone" dataKey="исправных" stroke="#16a34a" strokeWidth={2} fill="url(#cG)" />
              <Area type="monotone" dataKey="аварийных" stroke="#dc2626" strokeWidth={2} fill="url(#cB)" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ background: "white", borderRadius: "var(--radius-lg)", padding: "24px", border: "1px solid var(--gray-200)", boxShadow: "var(--shadow-sm)" }}>
          <h3 style={{ fontSize: "15px", color: "var(--gray-900)", marginBottom: "3px" }}>🚨 Топ рисковых объектов</h3>
          <p style={{ fontSize: "12px", color: "var(--gray-400)", marginBottom: "16px" }}>Требуют немедленного внимания</p>
          <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
            {topRisk.map((obj: any, i: number) => (
              <div key={i}
                onClick={() => navigate(`/object/${obj.id}`)}
                style={{ display: "flex", alignItems: "center", gap: "12px", padding: "12px", background: "var(--gray-50)", borderRadius: "var(--radius-sm)", border: "1px solid var(--gray-200)", borderLeft: `3px solid ${RISK_COLORS[obj.risk_level] || "#888"}`, cursor: "pointer" }}
                onMouseEnter={e => (e.currentTarget as HTMLDivElement).style.background = "#f1f5f9"}
                onMouseLeave={e => (e.currentTarget as HTMLDivElement).style.background = "var(--gray-50)"}
              >
                <div style={{ width: 32, height: 32, borderRadius: "8px", background: (RISK_COLORS[obj.risk_level] || "#888") + "18", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800, color: RISK_COLORS[obj.risk_level], fontSize: "13px", flexShrink: 0 }}>{i + 1}</div>
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, color: "var(--gray-800)", fontSize: "13px" }}>{obj.name}</div>
                  <div style={{ color: "var(--gray-400)", fontSize: "11px" }}>{obj.district}</div>
                </div>
                <span style={{ fontSize: "11px", fontWeight: 700, color: RISK_COLORS[obj.risk_level], background: (RISK_COLORS[obj.risk_level] || "#888") + "18", padding: "3px 10px", borderRadius: "10px" }}>{RISK_LABELS[obj.risk_level] || obj.risk_level}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
