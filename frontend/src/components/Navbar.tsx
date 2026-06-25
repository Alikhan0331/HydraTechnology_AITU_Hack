import { Link, useLocation } from "react-router-dom";

const links = [
  { to: "/", label: "Дашборд" },
  { to: "/catalog", label: "Каталог" },
  { to: "/map", label: "Карта" },
];

export default function Navbar() {
  const location = useLocation();
  return (
    <nav style={{
      position: "fixed", top: 0, left: 0, right: 0, height: "60px",
      background: "#1e40af", display: "flex", alignItems: "center",
      padding: "0 24px", gap: "32px", zIndex: 1000,
    }}>
      <span style={{ color: "white", fontWeight: "bold", fontSize: "18px" }}>
        💧 HydraTech
      </span>
      {links.map((link) => (
        <Link
          key={link.to}
          to={link.to}
          style={{
            color: location.pathname === link.to ? "#93c5fd" : "white",
            textDecoration: "none",
            fontWeight: location.pathname === link.to ? "bold" : "normal",
          }}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}
