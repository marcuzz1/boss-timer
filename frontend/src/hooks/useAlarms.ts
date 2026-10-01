import { useEffect, useRef } from "react";
import { READY_LEAD_MS } from "../config/app";
import { findBoss } from "../config/bosses";
import { isUrgent, sortedRows, windowOf } from "../lib/timer";
import type { KillMap } from "../lib/types";

interface Options {
  kills: KillMap;
  now: number;
  currentBoss: string;
  playAlarm: () => void;
  playReady: () => void;
}

/**
 * 兩種提示音：
 * 1. 追蹤中的王跨過最早重生時間 → 警報音（只有正在追蹤的王會響）
 * 2. 一輪巡查結束（清單空了）後有新頻道排進來 → 於最早重生前三分鐘播準備音
 *
 * 頁面剛載入時已經過了重生時間的紀錄不會補響，避免一進站就被吵。
 */
export function useAlarms({ kills, now, currentBoss, playAlarm, playReady }: Options): void {
  const known = useRef(new Set<string>());
  const alerted = useRef(new Set<string>());
  const roundWasEmpty = useRef<boolean | null>(null);
  const roundRemindAt = useRef<number | null>(null);

  /* 換王就重新判斷輪次 */
  useEffect(() => {
    roundWasEmpty.current = null;
    roundRemindAt.current = null;
  }, [currentBoss]);

  useEffect(() => {
    for (const [id, item] of Object.entries(kills)) {
      if (!item || !findBoss(item.boss)) continue;
      const tag = `${id}:${item.killTime}`;
      const past = now >= windowOf(item).earliest;
      if (!known.current.has(tag)) {
        known.current.add(tag);
        if (past) alerted.current.add(tag);
      }
      if (past && !alerted.current.has(tag)) {
        alerted.current.add(tag);
        if (item.boss === currentBoss) playAlarm();
      }
    }
  }, [kills, now, currentBoss, playAlarm]);

  useEffect(() => {
    const items = sortedRows(kills, now).filter(
      (it) => it.boss === currentBoss && isUrgent(it.st),
    );
    const empty = items.length === 0;

    if (roundWasEmpty.current === null) {
      roundWasEmpty.current = empty;
    } else if (roundWasEmpty.current && !empty) {
      const soonest = Math.min(...items.map((it) => it.earliest));
      const remindAt = soonest - READY_LEAD_MS;
      roundRemindAt.current = remindAt > now + 1000 ? remindAt : null;
    }
    roundWasEmpty.current = empty;

    if (roundRemindAt.current !== null && now >= roundRemindAt.current) {
      roundRemindAt.current = null;
      playReady();
    }
  }, [kills, now, currentBoss, playReady]);
}
