interface StatCardProps {
  title: string;
  value: number | string;
  color?: string;
  icon?: string;
  gradient?: string;
}

export default function StatCard({ title, value, color = "#3b82f6", icon, gradient }: StatCardProps) {
  return (
    <div style={{
      background: gradient || "linear-gradient(135deg, #1e293b, #0f172a)",
      borderRadius: "16px",
      padding: "24px",
      border: `1px solid ${color}33`,
      position: "relative",
      overflow: "hidden",
      boxShadow: `0 4px 24px ${color}22`,
    }}>
      {/* Glow */}
      <div style={{
        position: "absolute", top: -20, right: -20,
        width: 80, height: 80, borderRadius: "50%",
        background: color + "22", filter: "blur(20px)",
      }} />
      <div style={{ fontSize: "28px", marginBottom: "12px" }}>{icon}</div>
      <div style={{ fontSize: "36px", fontWeight: 800, color, lineHeight: 1 }}>{value}</div>
      <div style={{ fontSize: "13px", color: "#64748b", marginTop: "6px", fontWeight: 500 }}>{title}</div>
    </div>
  );
}
