import { useEffect, useRef, type ReactNode } from "react";

interface Props {
  title: string;
  /** 第幾個浮動視窗，用來錯開初始位置 */
  index: number;
  onClose: () => void;
  children: ReactNode;
}

/**
 * 瀏覽器不支援原生子母畫面時的退路：頁內可拖曳、可調整大小的浮動視窗。
 */
export function FloatWindow({ title, index, onClose, children }: Props) {
  const winRef = useRef<HTMLDivElement>(null);
  const headRef = useRef<HTMLDivElement>(null);
  const offset = 90 + index * 30;

  useEffect(() => {
    const win = winRef.current;
    const handle = headRef.current;
    if (!win || !handle) return;

    const onPointerDown = (e: PointerEvent) => {
      if ((e.target as HTMLElement).closest(".fwClose")) return;
      e.preventDefault();
      const rect = win.getBoundingClientRect();
      const offX = e.clientX - rect.left;
      const offY = e.clientY - rect.top;
      win.style.right = "auto";
      win.style.bottom = "auto";

      const move = (ev: PointerEvent) => {
        win.style.left = Math.max(0, ev.clientX - offX) + "px";
        win.style.top = Math.max(0, ev.clientY - offY) + "px";
      };
      const up = () => {
        document.removeEventListener("pointermove", move);
        document.removeEventListener("pointerup", up);
      };
      document.addEventListener("pointermove", move);
      document.addEventListener("pointerup", up);
    };

    handle.addEventListener("pointerdown", onPointerDown);
    return () => handle.removeEventListener("pointerdown", onPointerDown);
  }, []);

  return (
    <div className="floatWin" ref={winRef} style={{ left: offset, top: offset }}>
      <div className="fwHead" ref={headRef}>
        <span className="fwTitle">{title}</span>
        <button className="fwClose" type="button" aria-label="關閉" onClick={onClose}>
          ✕
        </button>
      </div>
      <div className="fwBody">{children}</div>
    </div>
  );
}
