import { onValue, ref, type Unsubscribe } from "firebase/database";
import { BOARD_SHOW_MAX, DB_PATHS } from "../config/app";
import { db } from "../config/firebase";
import type { BoardMessage, HistoryMap, KillMap } from "../lib/types";

type ErrorHandler = (err: Error) => void;

/** 伺服器時間與本機時間的差，所有倒數都以 Date.now() + offset 為準 */
export function subscribeServerOffset(cb: (offset: number) => void): Unsubscribe {
  return onValue(ref(db, ".info/serverTimeOffset"), (snap) => cb(Number(snap.val()) || 0));
}

export function subscribeConnected(cb: (connected: boolean) => void): Unsubscribe {
  return onValue(ref(db, ".info/connected"), (snap) => cb(snap.val() === true));
}

export function subscribeKills(cb: (kills: KillMap) => void, onError?: ErrorHandler): Unsubscribe {
  return onValue(ref(db, DB_PATHS.kills), (snap) => cb((snap.val() as KillMap) || {}), onError);
}

export function subscribeHistory(
  cb: (history: HistoryMap) => void,
  onError?: ErrorHandler,
): Unsubscribe {
  return onValue(ref(db, DB_PATHS.history), (snap) => cb((snap.val() as HistoryMap) || {}), onError);
}

/**
 * 讀整包留言，自己依時間排序後取最新 BOARD_SHOW_MAX 則
 * （少用一層 query，實務上比較穩定）。
 */
export function subscribeBoard(
  cb: (messages: BoardMessage[]) => void,
  onError?: ErrorHandler,
): Unsubscribe {
  return onValue(
    ref(db, DB_PATHS.board),
    (snap) => {
      const raw = (snap.val() as Record<string, Partial<BoardMessage>> | null) || {};
      const list = Object.entries(raw)
        .map(([id, m]) => ({
          id,
          name: m?.name ?? "",
          text: m?.text ?? "",
          time: m?.time ?? 0,
        }))
        .sort((a, b) => a.time - b.time)
        .slice(-BOARD_SHOW_MAX);
      cb(list);
    },
    onError,
  );
}

/** bossTimer/config，目前只用來放強制重新驗證的 reload 旗標 */
export function subscribeConfig(
  cb: (config: { reload?: string | number }) => void,
  onError?: ErrorHandler,
): Unsubscribe {
  return onValue(ref(db, DB_PATHS.config), (snap) => cb(snap.val() || {}), onError);
}
