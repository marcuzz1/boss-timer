import { HISTORY_MAX_PER_BOSS } from "../config/app";
import { findBoss } from "../config/bosses";
import type { HistoryAction, HistoryEntry, HistoryMap, HistoryRow } from "./types";

export const HIST_LABEL: Record<string, string> = {
  kill: "擊殺",
  add: "擊殺",
  edit: "校正",
  del: "刪除",
  restore: "復原",
};

/**
 * 只有「🕓 校正時間 → 套用」才算校正。
 * 舊版本把「頻道已經有紀錄、再按一次記錄擊殺」也寫成 edit，這些其實是擊殺。
 * 判別方式：當下按擊殺時 killTime 就是寫入的那一刻，所以 at ≈ killTime；
 * 校正一定是指定過去／偏移的時間，at 會跟 killTime 差很多。
 */
const KILL_EPS = 3000;

export function actionOf(h: HistoryEntry): HistoryAction {
  if (h.action !== "edit") return h.action;
  const gap = (h.at || 0) - (h.killTime || 0);
  return h.at && h.killTime && gap >= 0 && gap < KILL_EPS ? "kill" : "edit";
}

/** 最新的在最上面，每個 BOSS 最多顯示 HISTORY_MAX_PER_BOSS 筆 */
export function historyRows(histLog: HistoryMap): HistoryRow[] {
  const seen: Record<string, number> = {};
  return Object.entries(histLog)
    .filter(([, h]) => h && h.boss && findBoss(h.boss))
    .map(([id, h]) => ({ ...h, id }))
    .sort((a, b) => (b.at || 0) - (a.at || 0))
    .filter((h) => (seen[h.boss] = (seen[h.boss] || 0) + 1) <= HISTORY_MAX_PER_BOSS);
}

/**
 * 復原 = 拿回「這個動作發生前」的狀態：
 * 有蓋掉東西就還原被蓋掉的，沒有就把這筆寫回去。
 */
export function restoreTarget(h: HistoryEntry): { killer: string; killTime: number } {
  return h.prevKillTime
    ? { killer: h.prevKiller || h.killer, killTime: h.prevKillTime }
    : { killer: h.killer, killTime: h.killTime };
}

/**
 * 以 BOSS 分組，各留最新 HISTORY_MAX_PER_BOSS 筆，回傳該刪掉的 key。
 * push key 本身就是時間序，所以字串排序就是時間排序。
 */
export function overflowHistoryKeys(all: HistoryMap): string[] {
  const byBoss: Record<string, string[]> = {};
  for (const [key, h] of Object.entries(all)) {
    const bk = (h && h.boss) || "__unknown";
    (byBoss[bk] || (byBoss[bk] = [])).push(key);
  }
  const extra: string[] = [];
  for (const keys of Object.values(byBoss)) {
    keys.sort();
    if (keys.length > HISTORY_MAX_PER_BOSS) {
      extra.push(...keys.slice(0, keys.length - HISTORY_MAX_PER_BOSS));
    }
  }
  return extra;
}
