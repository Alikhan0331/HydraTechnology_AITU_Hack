interface StatCardProps {
  title: string;
  value: number | string;
  color?: string;
  icon?: string;
}

export default function StatCard({ title, value, color = "#1e40af", icon }: StatCardProps) {
  return (
    <div style={{
      background: "white",
      borderRadius: "12px",
      padding: "20px 24px",
      boxShadow: "0 2px 8px rgba(0,0,0,0.08)",
      borderLeft: `4px solid ${color}`,
      minWidth: "160px",
    }}>
      <div style={{ fontSize: "28px", marginBottom: "4px" }}>{icon}</div>
      <div style={{ fontSize: "32px", fontWeight: "bold", color }}>{value}</div>
      <div style={{ fontSize: "14px", color: "#6b7280", marginTop: "4px" }}>{title}</div>
    </div>
  );
}
