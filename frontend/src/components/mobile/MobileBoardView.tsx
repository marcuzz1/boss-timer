import { useEffect, useRef, useState } from "react";
import { BOARD_TEXT_MAX } from "../../config/app";
import type { BossTimer } from "../../hooks/useBossTimer";
import { fmtHM } from "../../lib/time";

export function MobileBoardView({ timer }: { timer: BossTimer }) {
  const { board, boardLoaded, boardError, connected, sendBoardMessage, serverNow } = timer;
  const [text, setText] = useState("");
  const msgsRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const box = msgsRef.current;
    if (box) box.scrollTop = box.scrollHeight;
  }, [board]);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = text.trim();
    if (!value) return;
    if (!connected) {
      alert("尚未連線,留言送不出去。請重新整理或換個網路。");
      return;
    }
    setText("");
    try {
      const ok = await sendBoardMessage(value);
      if (!ok) setText(value);
    } catch (err) {
      console.error("board push failed:", err);
      setText(value);
      alert("送出失敗：" + ((err instanceof Error && err.message) || String(err)));
    }
  };

  return (
    <>
      <div className="h2">
        留言板
        <span className="tally">
          {boardError ? (
            <span className="warn">讀取失敗</span>
          ) : boardLoaded ? (
            `${board.length} 則`
          ) : (
            "連線中…"
          )}
        </span>
      </div>
      <div className="msgs" ref={msgsRef}>
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
      <form className="bform" onSubmit={(e) => void submit(e)}>
        <input
          type="text"
          maxLength={BOARD_TEXT_MAX}
          placeholder="輸入留言…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit">送出</button>
      </form>
    </>
  );
}
