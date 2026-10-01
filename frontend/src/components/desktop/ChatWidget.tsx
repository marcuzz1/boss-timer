import { useEffect, useRef, useState } from "react";
import { BOARD_TEXT_MAX } from "../../config/app";
import type { BossTimer } from "../../hooks/useBossTimer";
import { fmtHM } from "../../lib/time";

type Status =
  | { kind: "none" }
  | { kind: "offline" }
  | { kind: "offlineSubmit" }
  | { kind: "sending" }
  | { kind: "error"; message: string };

/** 右下角的留言板（FB 風聊天視窗） */
export function ChatWidget({ timer }: { timer: BossTimer }) {
  const { board, boardLoaded, boardError, connected, sendBoardMessage, serverNow } = timer;
  const [open, setOpen] = useState(false);
  const [text, setText] = useState("");
  const [status, setStatus] = useState<Status>({ kind: "none" });
  const [seen, setSeen] = useState<number | null>(null);
  const msgsRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /* 未讀是從「第一份快照」開始算，所以首次載入已經在的留言不算未讀 */
  useEffect(() => {
    if (!boardLoaded) return;
    setSeen((prev) => (prev === null ? board.length : prev));
  }, [boardLoaded, board.length]);

  /* 開著就跟著捲到最新 */
  useEffect(() => {
    const box = msgsRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [board, open]);

  /* 斷線提示；連回來就把提示清掉 */
  useEffect(() => {
    if (connected === null) return;
    setStatus((prev) => {
      if (!connected) return { kind: "offline" };
      return prev.kind === "offline" ? { kind: "none" } : prev;
    });
  }, [connected]);

  const unread = seen === null ? 0 : Math.max(0, board.length - seen);
  const showBadge = !open && unread > 0;

  const openChat = () => {
    setOpen(true);
    setSeen(board.length);
    window.setTimeout(() => inputRef.current?.focus(), 50);
  };

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    if (!connected) {
      setStatus({ kind: "offlineSubmit" });
      return;
    }
    setStatus({ kind: "sending" });
    setText("");
    try {
      const ok = await sendBoardMessage(value);
      if (!ok) {
        setText(value);
        setStatus({ kind: "none" });
        return;
      }
      setStatus({ kind: "none" });
      inputRef.current?.focus();
    } catch (err) {
      console.error("board push failed:", err);
      setText(value);
      setStatus({
        kind: "error",
        message: (err instanceof Error && err.message) || String(err),
      });
    }
  };

  const statusNode = (() => {
    switch (status.kind) {
      case "offline":
        return (
          <span className="warn">
            ⚠ 尚未連線 Firebase,留言可能送不出去。請重新整理或換個網路/關掉廣告攔截。
          </span>
        );
      case "offlineSubmit":
        return <span className="warn">⚠ 尚未連線,無法送出。請重新整理或換網路。</span>;
      case "sending":
        return "送出中…";
      case "error":
        return <span className="warn">送出失敗：{status.message}</span>;
      default:
        return "";
    }
  })();

  const tally = boardError ? (
    <span className="warn">讀取失敗</span>
  ) : boardLoaded ? (
    `${board.length} 則`
  ) : (
    "連線中…"
  );

  return (
    <>
      <div className={`chatWidget${open ? " open" : ""}`}>
        <div className="chatHead">
          <span className="chatTitle">💬 留言板</span>
          <span className="tally">{tally}</span>
          <button
            className="chatMin"
            type="button"
            aria-label="關閉"
            onClick={() => setOpen(false)}
          >
            —
          </button>
        </div>
        <div className="board-msgs" ref={msgsRef}>
          {board.length === 0 ? (
            <div className="empty">還沒有留言。當第一個留言的人吧！</div>
          ) : (
            board.map((m) => (
              <div className="msg" key={m.id}>
                <div className="who">
                  {m.name || "匿名"}
                  <time>{fmtHM(m.time || serverNow())}</time>
                </div>
                <div className="say">{m.text}</div>
              </div>
            ))
          )}
        </div>
        <form className="board-form" onSubmit={(e) => void submit(e)}>
          <input
            ref={inputRef}
            type="text"
            maxLength={BOARD_TEXT_MAX}
            placeholder="輸入留言…"
            aria-label="留言內容"
            value={text}
            onChange={(e) => setText(e.target.value)}
          />
          <button className="btn-go" type="submit">
            送出
          </button>
        </form>
        <div className="chatStatus">{statusNode}</div>
      </div>

      <button
        className="chatFab"
        type="button"
        aria-label="開啟留言板"
        onClick={() => (open ? setOpen(false) : openChat())}
      >
        💬
        {showBadge && <span className="chatBadge">{unread > 99 ? "99+" : unread}</span>}
      </button>
    </>
  );
}
