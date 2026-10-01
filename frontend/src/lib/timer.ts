import { MIN, SOON_MS } from "../config/app";
import { findBoss } from "../config/bosses";
import { fmtCountdown } from "./time";
import type { Boss, Kill, KillMap, KillRow, KillState } from "./types";

/** kills 節點的 key：{bossKey}_{ch} */
export const killId = (bossKey: string, ch: number | string) => `${bossKey}_${ch}`;

/** 重生時間是區間還是固定值 */
export const isFloating = (b: Boss) => b.respawnMin !== b.respawnMax;

/** 「45 分」或「40~60 分」。手機版不留空格，所以 space 可關掉。 */
export const rtLabel = (b: Boss, space = true) => {
  const unit = space ? " 分" : "分";
  return isFloating(b) ? `${b.respawnMin}~${b.respawnMax}${unit}` : `${b.respawnMin}${unit}`;
};

/** 這筆紀錄的重生區間（最早、最晚） */
export function windowOf(item: Kill): { earliest: number; latest: number } {
  const b = findBoss(item.boss);
  if (!b) return { earliest: item.killTime, latest: item.killTime };
  return {
    earliest: item.killTime + b.respawnMin * MIN,
    latest: item.killTime + b.respawnMax * MIN,
  };
}

export function stateOf(item: Kill | undefined, now: number): KillState {
  if (!item || !findBoss(item.boss)) return "idle";
  const { earliest, latest } = windowOf(item);
  if (now >= latest) return "overdue";
  if (now >= earliest) return "window";
  if (earliest - now <= SOON_MS) return "soon";
  return "counting";
}

export const STATE_LABEL: Record<KillState, string> = {
  idle: "沒紀錄",
  counting: "倒數中",
  soon: "快出現了",
  window: "重生區間",
  overdue: "已重生",
};

/** 手機版的「快出現」沒有「了」 */
export const STATE_LABEL_SHORT: Record<KillState, string> = {
  ...STATE_LABEL,
  soon: "快出現",
};

/** 格子與清單上顯示的剩餘時間文字 */
export function remainText(item: Kill, now: number): string {
  const st = stateOf(item, now);
  const { earliest, latest } = windowOf(item);
  if (st === "overdue") return "已重生";
  if (st === "window") return "區間 " + fmtCountdown(latest - now);
  return fmtCountdown(earliest - now);
}

/** 需要巡查的狀態（會進巡查清單、會算進未讀數） */
export const URGENT_STATES: KillState[] = ["overdue", "window", "soon"];
export const isUrgent = (st: KillState) => URGENT_STATES.includes(st);

/** 全部紀錄依最早重生時間排序，順便算好狀態 */
export function sortedRows(kills: KillMap, now: number): KillRow[] {
  return Object.entries(kills)
    .filter(([, it]) => it && findBoss(it.boss))
    .map(([id, it]) => ({
      ...it,
      id,
      st: stateOf(it, now),
      earliest: windowOf(it).earliest,
    }))
    .sort((a, b) => a.earliest - b.earliest);
}

/** 某隻王目前有幾台在追、幾台要打 */
export function bossTally(
  kills: KillMap,
  bossKey: string,
  channels: number,
  now: number,
): { tracked: number; urgent: number } {
  let tracked = 0;
  let urgent = 0;
  for (let i = 1; i <= channels; i++) {
    const it = kills[killId(bossKey, i)];
    if (!it) continue;
    tracked++;
    if (isUrgent(stateOf(it, now))) urgent++;
  }
  return { tracked, urgent };
}
