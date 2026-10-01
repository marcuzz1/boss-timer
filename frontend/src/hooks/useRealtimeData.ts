import { useEffect, useState } from "react";
import {
  subscribeBoard,
  subscribeConfig,
  subscribeHistory,
  subscribeKills,
} from "../data/subscriptions";
import type { BoardMessage, HistoryMap, KillMap } from "../lib/types";

export interface RealtimeData {
  kills: KillMap;
  history: HistoryMap;
  board: BoardMessage[];
  /** 留言板是否已經收到第一份快照（用來決定未讀基準，首次載入的留言不算未讀） */
  boardLoaded: boolean;
  historyError: boolean;
  boardError: boolean;
}

/**
 * 這些節點要登入後才有讀取權限，所以 enabled（= 驗證通過）才訂閱。
 */
export function useRealtimeData(enabled: boolean, onReloadFlag: (raw: unknown) => void): RealtimeData {
  const [kills, setKills] = useState<KillMap>({});
  const [history, setHistory] = useState<HistoryMap>({});
  const [board, setBoard] = useState<BoardMessage[]>([]);
  const [boardLoaded, setBoardLoaded] = useState(false);
  const [historyError, setHistoryError] = useState(false);
  const [boardError, setBoardError] = useState(false);

  useEffect(() => {
    if (!enabled) return;

    const unsubs = [
      subscribeKills(setKills, (err) => console.error("kills read failed:", err)),
      subscribeConfig(
        (config) => onReloadFlag(config.reload),
        (err) => console.warn("config read failed:", err),
      ),
      subscribeHistory(
        (value) => {
          setHistory(value);
          setHistoryError(false);
        },
        (err) => {
          console.error("history read failed:", err);
          setHistoryError(true);
        },
      ),
      subscribeBoard(
        (list) => {
          setBoard(list);
          setBoardLoaded(true);
          setBoardError(false);
        },
        (err) => {
          console.error("board read failed:", err);
          setBoardError(true);
        },
      ),
    ];

    return () => unsubs.forEach((unsub) => unsub());
  }, [enabled, onReloadFlag]);

  return { kills, history, board, boardLoaded, historyError, boardError };
}
