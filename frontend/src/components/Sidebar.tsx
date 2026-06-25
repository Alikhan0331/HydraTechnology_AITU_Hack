import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/", label: "Дашборд", icon: "📊", desc: "Обзор системы" },
  { to: "/catalog", label: "Каталог", icon: "📋", desc: "Все объекты" },
  { to: "/map", label: "Карта", icon: "🗺️", desc: "Геовизуализация" },
  { to: "/analytics", label: "Аналитика", icon: "📈", desc: "Графики и тренды" },
  { to: "/detection", label: "Обнаружение", icon: "🔍", desc: "Поиск по координатам" },
];

export default function Sidebar() {
  const location = useLocation();
  return (
    <aside style={{
      position: "fixed", left: 0, top: 0, bottom: 0, width: "260px",
      background: "white",
      borderRight: "1px solid var(--gray-200)",
      display: "flex", flexDirection: "column",
      boxShadow: "var(--shadow-md)",
      zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: "24px 20px 20px", borderBottom: "1px solid var(--gray-100)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: 44, height: 44, borderRadius: "12px",
            background: "linear-gradient(135deg, #1d4ed8, #0ea5e9)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "22px", boxShadow: "var(--shadow-blue)"
          }}>💧</div>
          <div>
            <div style={{ fontFamily: "Manrope, sans-serif", fontWeight: 800, fontSize: "17px", color: "var(--gray-900)" }}>HydraTech</div>
            <div style={{ color: "var(--gray-400)", fontSize: "11px", fontWeight: 500 }}>Жамбылский регион</div>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 20px 8px" }}>
        <span style={{ fontSize: "10px", fontWeight: 700, color: "var(--gray-400)", letterSpacing: "1.2px", textTransform: "uppercase" }}>Навигация</span>
      </div>

      <nav style={{ padding: "0 12px", flex: 1, overflowY: "auto" }}>
        {links.map((link) => {
          const active = location.pathname === link.to;
          return (
            <Link key={link.to} to={link.to} style={{ textDecoration: "none", display: "block", marginBottom: "4px" }}>
              <div
                style={{
                  display: "flex", alignItems: "center", gap: "12px",
                  padding: "11px 14px", borderRadius: "var(--radius-md)",
                  background: active ? "var(--primary-bg)" : "transparent",
                  border: active ? "1px solid #bfdbfe" : "1px solid transparent",
                  color: active ? "var(--primary)" : "var(--gray-600)",
                  fontWeight: active ? 600 : 400, cursor: "pointer",
                }}
                onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = "var(--gray-50)"; }}
                onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLDivElement).style.background = "transparent"; }}
              >
                <span style={{
                  width: 36, height: 36, borderRadius: "9px",
                  background: active ? "white" : "var(--gray-100)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "17px", boxShadow: active ? "var(--shadow-sm)" : "none", flexShrink: 0
                }}>{link.icon}</span>
                <div>
                  <div style={{ fontSize: "14px" }}>{link.label}</div>
                  <div style={{ fontSize: "11px", color: active ? "#93c5fd" : "var(--gray-400)", fontWeight: 400 }}>{link.desc}</div>
                </div>
              </div>
            </Link>
          );
        })}
      </nav>

      <div style={{ margin: "12px", padding: "14px", borderRadius: "var(--radius-md)", background: "var(--primary-bg)", border: "1px solid #bfdbfe" }}>
        <div style={{ fontSize: "12px", fontWeight: 700, color: "var(--primary)", marginBottom: "2px" }}>AITU Hackday 2026</div>
        <div style={{ fontSize: "11px", color: "var(--gray-400)" }}>Industry 4.0 · Team HydraTech</div>
      </div>
    </aside>
  );
}
