import { Component, type ReactNode } from "react";

interface Props { children: ReactNode; }
interface State { hasError: boolean; message: string; }

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, message: "" };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, message: error.message };
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
          minHeight: "60vh", padding: "40px", textAlign: "center", gap: "16px",
        }}>
          <div style={{ fontSize: "48px" }}>⚠️</div>
          <div style={{ fontWeight: 700, fontSize: "20px", color: "#1e293b" }}>
            Что-то пошло не так
          </div>
          <div style={{ color: "#64748b", fontSize: "14px", maxWidth: "420px", lineHeight: 1.6 }}>
            {this.state.message || "Произошла непредвиденная ошибка. Попробуйте обновить страницу."}
          </div>
          <button
            onClick={() => { this.setState({ hasError: false, message: "" }); window.location.reload(); }}
            style={{
              padding: "10px 24px", borderRadius: "8px", border: "none",
              background: "#1d4ed8", color: "white", fontWeight: 600, fontSize: "14px",
              cursor: "pointer",
            }}
          >
            Повторить запрос
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
