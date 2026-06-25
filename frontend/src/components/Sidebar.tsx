import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/", label: "Дашборд", icon: "📊" },
  { to: "/catalog", label: "Каталог", icon: "📋" },
  { to: "/map", label: "Карта", icon: "🗺️" },
];

export default function Sidebar() {
  const location = useLocation();
  return (
    <aside style={{
      position: "fixed", left: 0, top: 0, bottom: 0, width: "240px",
      background: "linear-gradient(180deg, #1e3a5f 0%, #0f172a 100%)",
      display: "flex", flexDirection: "column", padding: "0",
      boxShadow: "4px 0 20px rgba(0,0,0,0.3)", zIndex: 100,
    }}>
      {/* Logo */}
      <div style={{ padding: "28px 24px 20px", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <div style={{
            width: 40, height: 40, borderRadius: "10px",
            background: "linear-gradient(135deg, #3b82f6, #06b6d4)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "20px"
          }}>💧</div>
          <div>
            <div style={{ color: "white", fontWeight: 700, fontSize: "16px" }}>HydraTech</div>
            <div style={{ color: "#64748b", fontSize: "11px" }}>Жамбылский регион</div>
          </div>
        </div>
      </div>

      {/* Nav */}
      <nav style={{ padding: "16px 12px", flex: 1 }}>
        {links.map((link) => {
          const active = location.pathname === link.to;
          return (
            <Link key={link.to} to={link.to} style={{ textDecoration: "none" }}>
              <div style={{
                display: "flex", alignItems: "center", gap: "12px",
                padding: "12px 16px", borderRadius: "10px", marginBottom: "4px",
                background: active ? "linear-gradient(135deg, #3b82f6, #06b6d4)" : "transparent",
                color: active ? "white" : "#94a3b8",
                fontWeight: active ? 600 : 400,
                transition: "all 0.2s",
                cursor: "pointer",
              }}>
                <span style={{ fontSize: "18px" }}>{link.icon}</span>
                <span style={{ fontSize: "14px" }}>{link.label}</span>
              </div>
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div style={{ padding: "16px 24px", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div style={{ color: "#475569", fontSize: "11px" }}>AITU Hackday 2026</div>
        <div style={{ color: "#334155", fontSize: "11px" }}>Industry 4.0</div>
      </div>
    </aside>
  );
}
