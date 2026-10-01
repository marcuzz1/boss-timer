import { push, ref, remove, set } from "firebase/database";
import { BOARD_TEXT_MAX, DB_PATHS } from "../config/app";
import { db } from "../config/firebase";
import { killId } from "../lib/timer";
import type { HistoryEntry, Kill } from "../lib/types";

/* ---------- kills ---------- */

export function writeKill(kill: Kill): Promise<void> {
  return set(ref(db, `${DB_PATHS.kills}/${killId(kill.boss, kill.ch)}`), kill);
}

export function removeKill(id: string): Promise<void> {
  return remove(ref(db, `${DB_PATHS.kills}/${id}`));
}

export function removeKills(ids: string[]): Promise<void[]> {
  return Promise.all(ids.map(removeKill));
}

export function removeAllKills(): Promise<void> {
  return remove(ref(db, DB_PATHS.kills));
}

/* ---------- history ---------- */

/** 回傳這筆歷史紀錄的 push key */
export async function pushHistory(entry: HistoryEntry): Promise<string | null> {
  const r = await push(ref(db, DB_PATHS.history), entry);
  return r.key;
}

export function removeHistoryEntries(keys: string[]): Promise<void[]> {
  return Promise.all(keys.map((k) => remove(ref(db, `${DB_PATHS.history}/${k}`))));
}

/* ---------- board ---------- */

export async function pushBoardMessage(name: string, text: string, time: number): Promise<void> {
  await push(ref(db, DB_PATHS.board), {
    name,
    text: text.slice(0, BOARD_TEXT_MAX),
    time,
  });
}
