import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import type { DetachablePanels, PanelKey } from "../../hooks/useDetachablePanels";
import { FloatWindow } from "./FloatWindow";

interface Props {
  panels: DetachablePanels;
  panelKey: PanelKey;
  children: ReactNode;
}

/**
 * 依面板狀態決定內容畫在哪裡：留在頁面上、搬進子母畫面、或是放進浮動視窗。
 * 用 portal 而不是搬 DOM 節點，React 的更新才不會跟著斷掉。
 */
export function DetachablePanel({ panels, panelKey, children }: Props) {
  const mode = panels.modeOf(panelKey);

  if (mode === "pip") {
    const mount = panels.mountOf(panelKey);
    return mount ? createPortal(children, mount) : null;
  }

  if (mode === "float") {
    return createPortal(
      <FloatWindow
        title={panels.titleOf(panelKey)}
        index={panels.floatIndexOf(panelKey)}
        onClose={() => panels.close(panelKey)}
      >
        {children}
      </FloatWindow>,
      document.body,
    );
  }

  return <>{children}</>;
}
