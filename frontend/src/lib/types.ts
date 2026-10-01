/** 共用的資料型別，對應 Realtime Database 裡的節點形狀。 */

export interface Boss {
  key: string;
  name: string;
  emoji: string;
  /** 空字串代表沒有圖，改用 emoji 顯示 */
  img: string;
  map: string;
  respawnMin: number;
  respawnMax: number;
}

/** bossTimer/kills/{boss}_{ch} */
export interface Kill {
  boss: string;
  bossName: string;
  ch: number;
  killer: string;
  killTime: number;
}

export type KillMap = Record<string, Kill>;

/** 計時狀態：沒紀錄 / 倒數中 / 快出現 / 重生區間 / 已重生 */
export type KillState = "idle" | "counting" | "soon" | "window" | "overdue";

/** 已排序、已算好狀態的一列紀錄 */
export interface KillRow extends Kill {
  id: string;
  st: KillState;
  earliest: number;
}

export type HistoryAction = "kill" | "add" | "edit" | "del" | "restore";

/** bossTimer/history/{pushId} */
export interface HistoryEntry {
  action: HistoryAction;
  boss: string;
  bossName: string;
  ch: number;
  killer: string;
  killTime: number;
  /** 操作者 */
  by: string;
  /** 操作發生時間 */
  at: number;
  prevKiller?: string;
  prevKillTime?: number;
}

export type HistoryMap = Record<string, HistoryEntry>;

export interface HistoryRow extends HistoryEntry {
  id: string;
}

/** bossTimer/board/{pushId} */
export interface BoardMessage {
  id: string;
  name: string;
  text: string;
  time: number;
}
