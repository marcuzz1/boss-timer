import type { CSSProperties, ReactNode } from "react";
import type { GateState } from "../../hooks/useAuthGate";

const overlay: CSSProperties = {
  position: "fixed",
  inset: 0,
  zIndex: 100000,
  background: "#000",
  color: "#fdf3df",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  textAlign: "center",
  padding: 24,
  fontFamily: "'Noto Sans TC',sans-serif",
};

const loginButton: CSSProperties = {
  display: "inline-block",
  background: "#5865F2",
  color: "#fff",
  textDecoration: "none",
  fontWeight: 800,
  padding: "12px 22px",
  borderRadius: 8,
};

interface Props {
  state: GateState;
  loginUrl: string;
}

/**
 * 全螢幕的 Discord 驗證閘門。驗證通過前什麼都看不到，
 * 資料也還沒訂閱（Realtime Database 規則同樣會擋）。
 */
export function AuthGateOverlay({ state, loginUrl }: Props) {
  if (state.kind === "ready") return null;

  let content: ReactNode;
  if (state.kind === "login") {
    content = (
      <>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🔒</div>
        <div style={{ fontSize: 20, fontWeight: 900, marginBottom: 8 }}>需要 Discord 驗證</div>
        <div
          style={{
            color: "#b6a6e2",
            fontSize: 14,
            lineHeight: 1.7,
            marginBottom: 18,
          }}
        >
          {state.message}
        </div>
        <a href={loginUrl} style={loginButton}>
          用 Discord 登入
        </a>
      </>
    );
  } else {
    const text =
      state.kind === "verifying"
        ? "驗證中…"
        : state.kind === "reloading"
          ? "名稱規則已更新,正在重新驗證 Discord…"
          : "載入中…";
    content = <div style={{ fontSize: 16 }}>{text}</div>;
  }

  return (
    <div id="authGate" style={overlay}>
      <div style={{ maxWidth: 420 }}>{content}</div>
    </div>
  );
}
