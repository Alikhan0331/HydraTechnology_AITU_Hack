interface StatCardProps {
  title: string;
  value: number | string;
  color?: string;
  icon?: string;
  trend?: string;
}

export default function StatCard({ title, value, color = "#1d4ed8", icon, trend }: StatCardProps) {
  return (
    <div style={{
      background: "white",
      borderRadius: "var(--radius-lg)",
      padding: "20px",
      border: "1px solid var(--gray-200)",
      boxShadow: "var(--shadow-sm)",
      position: "relative",
      overflow: "hidden",
    }}
    onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-md)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
    onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "var(--shadow-sm)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(0)"; }}
    >
      <div style={{ position: "absolute", top: 0, right: 0, width: 80, height: 80, borderRadius: "0 16px 0 80px", background: color + "0d" }} />
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: "12px" }}>
        <div style={{
          width: 40, height: 40, borderRadius: "10px",
          background: color + "18",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: "20px"
        }}>{icon}</div>
        {trend && <span style={{ fontSize: "11px", color: "#16a34a", background: "#dcfce7", padding: "2px 8px", borderRadius: "20px", fontWeight: 600 }}>{trend}</span>}
      </div>
      <div style={{ fontSize: "30px", fontFamily: "Manrope, sans-serif", fontWeight: 800, color, lineHeight: 1, marginBottom: "6px" }}>{value}</div>
      <div style={{ fontSize: "13px", color: "var(--gray-500)", fontWeight: 500 }}>{title}</div>
    </div>
  );
}
