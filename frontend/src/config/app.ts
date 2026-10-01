/** 全站共用常數。改這裡就會同時影響桌機版與手機版。 */

/** 一分鐘的毫秒數 */
export const MIN = 60 * 1000;

/** 頻道數 CH1~CH60 */
export const CHANNELS = 60;

/** 距離最早重生時間多久算「快出現了」 */
export const SOON_MS = 5 * MIN;

/** 一輪巡查開始後，於最早重生前多久播「準備」提示音 */
export const READY_LEAD_MS = 3 * MIN;

/** 暱稱長度上限（與 Discord 驗證後端的 NAME_MAX 一致） */
export const NAME_MAX = 16;

/** 表格裡名字超過這個長度就截斷成「…」 */
export const NAME_DISPLAY_MAX = 10;

/** 留言字數上限 */
export const BOARD_TEXT_MAX = 120;

/** 留言板最多顯示幾則（取最新） */
export const BOARD_SHOW_MAX = 100;

/** 每個王的歷史紀錄只保留最新幾筆，超出的直接刪掉 */
export const HISTORY_MAX_PER_BOSS = 50;

/** Realtime Database 節點路徑 */
export const DB_PATHS = {
  kills: "bossTimer/kills",
  history: "bossTimer/history",
  board: "bossTimer/board",
  config: "bossTimer/config",
} as const;

/** localStorage 的 key */
export const STORAGE_KEYS = {
  verifiedAt: "bt_verified_at",
  nick: "bt_nick",
  sound: "bt_sound",
  reloadDone: "bt_reload_done",
} as const;
