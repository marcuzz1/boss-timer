import { useCallback, useMemo, useRef, useState } from "react";
import { CHANNELS, MIN, NAME_MAX } from "../config/app";
import { BOSSES, DEFAULT_BOSS, findBoss } from "../config/bosses";
import {
  pushBoardMessage,
  pushHistory,
  removeAllKills,
  removeHistoryEntries,
  removeKill,
  removeKills,
  writeKill,
} from "../data/writes";
import { historyRows, overflowHistoryKeys, restoreTarget } from "../lib/history";
import { fmtHM } from "../lib/time";
import { killId, bossTally, sortedRows } from "../lib/timer";
import type {
  BoardMessage,
  Boss,
  HistoryEntry,
  HistoryRow,
  Kill,
  KillMap,
  KillRow,
} from "../lib/types";
import { useAlarms } from "./useAlarms";
import { useAuthGate, type AuthGate } from "./useAuthGate";
import { useNow } from "./useNow";
import { useRealtimeData } from "./useRealtimeData";
import { useServerClock } from "./useServerClock";
import { useSound, type SoundControl } from "./useSound";

export type RecordTab = "now" | "hist";
export type OverrideMode = "min" | "time";

interface LogHistoryInput {
  action: HistoryEntry["action"];
  boss: string;
  bossName?: string;
  ch: number | string;
  killer?: string;
  killTime?: number;
  prev?: Kill | undefined;
}

export interface OverrideForm {
  mode: OverrideMode;
  setMode: (mode: OverrideMode) => void;
  minutes: string;
  setMinutes: (value: string) => void;
  time: string;
  setTime: (value: string) => void;
  /** 「倒數分鐘」或「時間」 */
  label: string;
}

export interface BossTally {
  /** 有紀錄的頻道數 */
  tracked: number;
  /** 已重生／重生區間／快出現的頻道數 */
  urgent: number;
}

export interface BossTimer {
  auth: AuthGate;
  sound: SoundControl;
  /** null 代表還沒收到第一次連線狀態回報 */
  connected: boolean | null;
  /** 伺服器現在時間，每秒更新 */
  now: number;
  serverNow: () => number;

  currentBoss: string;
  setCurrentBoss: (key: string) => void;
  /** 目前追蹤的王。設定檔一定找得到，所以不會是 undefined。 */
  boss: Boss;

  /** 頻道輸入框的值（點格子會帶入） */
  chInput: string;
  setChInput: (value: string) => void;
  selectedCh: number | null;
  selectChannel: (ch: number) => void;

  recFilter: string;
  setRecFilter: (value: string) => void;
  recTab: RecordTab;
  setRecTab: (tab: RecordTab) => void;

  override: OverrideForm;

  rows: KillRow[];
  /** 經過篩選的目前紀錄 */
  filteredRows: KillRow[];
  /** 經過篩選的歷史紀錄 */
  filteredHistory: HistoryRow[];
  /** 目前追蹤的王、下一隻會出現的頻道 */
  nextUp: KillRow | undefined;
  /** 目前追蹤的王、需要巡查的頻道 */
  patrolItems: KillRow[];
  /** 每隻王的追蹤／待打數量 */
  tallies: Record<string, BossTally>;
  /** 原始的 kills 快照 */
  kills: KillMap;
  killAt: (bossKey: string, ch: number) => Kill | undefined;

  board: BoardMessage[];
  /** 留言板是否已收到第一份快照 */
  boardLoaded: boolean;
  historyError: boolean;
  boardError: boolean;

  recordKill: (bossKey: string, ch: number | string) => Promise<void>;
  deleteKill: (id: string) => Promise<void>;
  deleteChannel: (bossKey: string, ch: number | string) => Promise<void>;
  clearAll: () => Promise<void>;
  clearBoss: (bossKey: string) => Promise<void>;
  applyOverride: (bossKey: string, ch: number | string) => Promise<void>;
  restoreFromHistory: (historyId: string) => Promise<void>;
  sendBoardMessage: (text: string) => Promise<boolean>;
}

const OVERRIDE_LABEL: Record<OverrideMode, string> = {
  min: "倒數分鐘",
  time: "時間",
};

export function useBossTimer(): BossTimer {
  const auth = useAuthGate();
  const { serverNow, connected } = useServerClock();
  const now = useNow(serverNow);
  const { kills, history, board, boardLoaded, historyError, boardError } = useRealtimeData(
    auth.ready,
    auth.handleReloadFlag,
  );
  const sound = useSound();

  const [currentBoss, setCurrentBossState] = useState(DEFAULT_BOSS);
  const [chInput, setChInput] = useState("");
  const [selectedCh, setSelectedCh] = useState<number | null>(null);
  const [recFilter, setRecFilter] = useState("all");
  const [recTab, setRecTab] = useState<RecordTab>("now");
  const [overrideMode, setOverrideMode] = useState<OverrideMode>("min");
  const [overrideMinutes, setOverrideMinutes] = useState("");
  const [overrideTime, setOverrideTime] = useState("");

  /* 寫入時要讀最新的快照，用 ref 避免閉包抓到舊值 */
  const killsRef = useRef(kills);
  killsRef.current = kills;
  const historyRef = useRef(history);
  historyRef.current = history;

  useAlarms({
    kills,
    now,
    currentBoss,
    playAlarm: sound.playAlarm,
    playReady: sound.playReady,
  });

  const boss = findBoss(currentBoss) ?? BOSSES[0];

  const setCurrentBoss = useCallback((key: string) => {
    setCurrentBossState(key);
  }, []);

  const selectChannel = useCallback((ch: number) => {
    setSelectedCh(ch);
    setChInput(String(ch));
  }, []);

  const killAt = useCallback(
    (bossKey: string, ch: number) => killsRef.current[killId(bossKey, ch)],
    [],
  );

  const rows = useMemo(() => sortedRows(kills, now), [kills, now]);
  const filteredRows = useMemo(
    () => (recFilter === "all" ? rows : rows.filter((r) => r.boss === recFilter)),
    [rows, recFilter],
  );
  const allHistory = useMemo(() => historyRows(history), [history]);
  const filteredHistory = useMemo(
    () => (recFilter === "all" ? allHistory : allHistory.filter((h) => h.boss === recFilter)),
    [allHistory, recFilter],
  );
  const nextUp = useMemo(() => rows.find((it) => it.boss === currentBoss), [rows, currentBoss]);  const patrolItems = useMemo(
    () =>
      rows.filter(
        (it) =>
          it.boss === currentBoss &&
          (it.st === "overdue" || it.st === "window" || it.st === "soon"),
      ),
    [rows, currentBoss],
  );

  /** 每隻王目前有幾台在追、幾台要打，給 BOSS 選擇器與手機版的王切換鈕用 */
  const tallies = useMemo(() => {
    const out: Record<string, BossTally> = {};
    for (const b of BOSSES) out[b.key] = bossTally(kills, b.key, CHANNELS, now);
    return out;
  }, [kills, now]);

  /* ---------- 歷史紀錄 ---------- */

  const logHistory = useCallback(
    async ({ action, boss: bossKey, bossName, ch, killer, killTime, prev }: LogHistoryInput) => {
      const entry: HistoryEntry = {
        action,
        boss: bossKey,
        bossName: bossName || findBoss(bossKey)?.name || bossKey,
        ch: Number(ch),
        killer: (killer || "匿名").slice(0, NAME_MAX),
        killTime: killTime || 0,
        by: (auth.nick || "匿名").slice(0, NAME_MAX),
        at: serverNow(),
      };
      if (prev && prev.killTime) {
        entry.prevKiller = (prev.killer || "匿名").slice(0, NAME_MAX);
        entry.prevKillTime = prev.killTime;
      }
      try {
        const key = await pushHistory(entry);
        const all = { ...historyRef.current };
        if (key) all[key] = entry;
        const extra = overflowHistoryKeys(all);
        if (extra.length) await removeHistoryEntries(extra);
      } catch (err) {
        console.error("寫入歷史紀錄失敗:", err);
      }
    },
    [auth.nick, serverNow],
  );

  /* ---------- 寫入動作 ---------- */

  const recordKill = useCallback(
    async (bossKey: string, chRaw: number | string) => {
      const ch = Number(chRaw);
      if (!ch || ch < 1 || ch > CHANNELS) {
        alert("請輸入 1~60 的頻道");
        return;
      }
      const killer = auth.requireNick();
      if (!killer) return;
      const target = findBoss(bossKey);
      if (!target) return;

      const prev = killsRef.current[killId(bossKey, ch)];
      const killTime = serverNow();
      try {
        await writeKill({ boss: bossKey, bossName: target.name, ch, killer, killTime });
        setSelectedCh(null);
      } catch (err) {
        console.error(err);
        alert("記錄沒有存上去。檢查一下 Firebase 規則有沒有開放寫入。");
        return;
      }
      void logHistory({
        action: "kill",
        boss: bossKey,
        bossName: target.name,
        ch,
        killer,
        killTime,
        prev,
      });
    },
    [auth, logHistory, serverNow],
  );

  const deleteKill = useCallback(
    async (id: string) => {
      const prev = killsRef.current[id];
      try {
        await removeKill(id);
      } catch (err) {
        console.error(err);
        alert("刪不掉。檢查一下 Firebase 規則。");
        return;
      }
      const prevBoss = prev && findBoss(prev.boss);
      if (prev && prevBoss) {
        void logHistory({
          action: "del",
          boss: prev.boss,
          bossName: prevBoss.name,
          ch: prev.ch,
          killer: prev.killer,
          killTime: prev.killTime,
        });
      }
    },
    [logHistory],
  );

  const deleteChannel = useCallback(
    async (bossKey: string, chRaw: number | string) => {
      const ch = Number(chRaw);
      if (!ch || ch < 1 || ch > CHANNELS) {
        alert("請先在上面「頻道 CH」輸入要刪除的頻道 (1~60)");
        return;
      }
      const target = findBoss(bossKey);
      if (!target) return;
      const id = killId(bossKey, ch);
      if (!killsRef.current[id]) {
        alert(`${target.name} CH${ch} 目前沒有紀錄`);
        return;
      }
      if (!confirm(`確定刪除「${target.name} CH${ch}」的計時紀錄嗎？`)) return;
      await deleteKill(id);
    },
    [deleteKill],
  );

  const clearAll = useCallback(async () => {
    if (!confirm("要清掉全部紀錄嗎？")) return;
    const snapshot = Object.values(killsRef.current).filter((it) => it && findBoss(it.boss));
    try {
      await removeAllKills();
    } catch (err) {
      console.error(err);
      alert("清不掉。檢查一下 Firebase 規則。");
      return;
    }
    for (const it of snapshot) {
      await logHistory({
        action: "del",
        boss: it.boss,
        bossName: findBoss(it.boss)?.name,
        ch: it.ch,
        killer: it.killer,
        killTime: it.killTime,
      });
    }
  }, [logHistory]);

  const clearBoss = useCallback(
    async (bossKey: string) => {
      const target = findBoss(bossKey);
      if (!target) return;
      const snapshot = killsRef.current;
      const ids = Object.keys(snapshot).filter((id) => snapshot[id]?.boss === bossKey);
      if (!ids.length) {
        alert(`${target.name} 目前沒有任何紀錄`);
        return;
      }
      if (!confirm(`確定清除「${target.name}」全部 ${ids.length} 個頻道的紀錄嗎？`)) return;
      const items = ids.map((id) => snapshot[id]).filter(Boolean);
      try {
        await removeKills(ids);
      } catch (err) {
        console.error(err);
        alert("清除失敗,請確認 Firebase 規則。");
        return;
      }
      for (const it of items) {
        await logHistory({
          action: "del",
          boss: it.boss,
          bossName: target.name,
          ch: it.ch,
          killer: it.killer,
          killTime: it.killTime,
        });
      }
    },
    [logHistory],
  );

  /** 用自訂時間蓋掉原紀錄：倒數幾分鐘，或指定擊殺時間 */
  const applyOverride = useCallback(
    async (bossKey: string, chRaw: number | string) => {
      const ch = Number(chRaw);
      if (!ch || ch < 1 || ch > CHANNELS) {
        alert("請先在上面「頻道 CH」輸入頻道 (1~60)");
        return;
      }
      const target = findBoss(bossKey);
      if (!target) return;

      let killTime: number;
      if (overrideMode === "min") {
        const mins = Number(overrideMinutes);
        if (overrideMinutes === "" || Number.isNaN(mins) || mins < 0) {
          alert("請輸入倒數分鐘數");
          return;
        }
        // 讓最早重生 = 現在 + 倒數分鐘
        killTime = serverNow() + mins * MIN - target.respawnMin * MIN;
      } else {
        if (!overrideTime) {
          alert("請選擇擊殺時間");
          return;
        }
        const [hh, mm] = overrideTime.split(":").map(Number);
        const d = new Date(serverNow());
        d.setHours(hh, mm, 0, 0);
        killTime = d.getTime();
        // 晚於現在 → 視為昨天
        if (killTime > serverNow()) killTime -= 24 * 60 * MIN;
      }

      const existing = killsRef.current[killId(bossKey, ch)];
      const killer = (existing?.killer || auth.nick || "匿名").slice(0, NAME_MAX);
      try {
        await writeKill({ boss: bossKey, bossName: target.name, ch, killer, killTime });
      } catch (err) {
        console.error(err);
        alert("套用失敗,請確認 Firebase 規則。");
        return;
      }
      void logHistory({
        action: "edit",
        boss: bossKey,
        bossName: target.name,
        ch,
        killer,
        killTime,
        prev: existing,
      });
    },
    [auth.nick, logHistory, overrideMinutes, overrideMode, overrideTime, serverNow],
  );

  const restoreFromHistory = useCallback(
    async (historyId: string) => {
      const entry = historyRef.current[historyId];
      const target = entry && findBoss(entry.boss);
      if (!entry || !target) {
        alert("這筆歷史紀錄的資料不完整,沒辦法復原。");
        return;
      }
      const wanted = restoreTarget(entry);
      if (!wanted.killTime) {
        alert("這筆歷史紀錄沒有擊殺時間,沒辦法復原。");
        return;
      }
      const existing = killsRef.current[killId(entry.boss, entry.ch)];
      const message = existing
        ? `${target.name} CH${entry.ch} 目前已有紀錄（${fmtHM(existing.killTime)} 擊殺）。\n要用歷史紀錄的 ${fmtHM(wanted.killTime)} 蓋掉嗎？`
        : `要把 ${target.name} CH${entry.ch}（${fmtHM(wanted.killTime)} 擊殺）復原嗎？`;
      if (!confirm(message)) return;
      try {
        await writeKill({
          boss: entry.boss,
          bossName: target.name,
          ch: Number(entry.ch),
          killer: wanted.killer || "匿名",
          killTime: wanted.killTime,
        });
      } catch (err) {
        console.error(err);
        alert("復原失敗,請確認 Firebase 規則。");
        return;
      }
      void logHistory({
        action: "restore",
        boss: entry.boss,
        bossName: target.name,
        ch: entry.ch,
        killer: wanted.killer,
        killTime: wanted.killTime,
        prev: existing,
      });
    },
    [logHistory],
  );

  /** 回傳 true 代表送出成功 */
  const sendBoardMessage = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return false;
      const name = auth.requireNick();
      if (!name) return false;
      await pushBoardMessage(name, trimmed, serverNow());
      return true;
    },
    [auth, serverNow],
  );

  const override: OverrideForm = {
    mode: overrideMode,
    setMode: setOverrideMode,
    minutes: overrideMinutes,
    setMinutes: setOverrideMinutes,
    time: overrideTime,
    setTime: setOverrideTime,
    label: OVERRIDE_LABEL[overrideMode],
  };

  return {
    auth,
    sound,
    connected,
    now,
    serverNow,
    currentBoss,
    setCurrentBoss,
    boss,
    chInput,
    setChInput,
    selectedCh,
    selectChannel,
    recFilter,
    setRecFilter,
    recTab,
    setRecTab,
    override,
    rows,
    filteredRows,
    filteredHistory,
    nextUp,
    patrolItems,
    tallies,
    kills,
    killAt,
    board,
    boardLoaded,
    historyError,
    boardError,
    recordKill,
    deleteKill,
    deleteChannel,
    clearAll,
    clearBoss,
    applyOverride,
    restoreFromHistory,
    sendBoardMessage,
  };
}
