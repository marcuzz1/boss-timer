import { describe, expect, it } from "vitest";
import { HISTORY_MAX_PER_BOSS } from "../config/app";
import { HIST_LABEL, actionOf, historyRows, overflowHistoryKeys, restoreTarget } from "./history";
import type { HistoryEntry, HistoryMap } from "./types";

const entry = (over: Partial<HistoryEntry> = {}): HistoryEntry => ({
  action: "kill",
  boss: "blackcroc",
  bossName: "沼澤巨鱷",
  ch: 1,
  killer: "tester",
  killTime: 1_000_000,
  by: "tester",
  at: 1_000_000,
  ...over,
});

describe("actionOf", () => {
  it("非 edit 的動作原樣回傳", () => {
    expect(actionOf(entry({ action: "del" }))).toBe("del");
    expect(actionOf(entry({ action: "restore" }))).toBe("restore");
  });

  it("寫入時間與擊殺時間幾乎相同的 edit 其實是擊殺", () => {
    expect(actionOf(entry({ action: "edit", killTime: 1_000_000, at: 1_001_000 }))).toBe("kill");
  });

  it("擊殺時間明顯早於寫入時間才是校正", () => {
    expect(actionOf(entry({ action: "edit", killTime: 1_000_000, at: 1_010_000 }))).toBe("edit");
  });

  it("擊殺時間在未來（負的間隔）算校正", () => {
    expect(actionOf(entry({ action: "edit", killTime: 2_000_000, at: 1_000_000 }))).toBe("edit");
  });
});

describe("restoreTarget", () => {
  it("有被蓋掉的紀錄就還原舊的", () => {
    const h = entry({ killer: "new", killTime: 2_000, prevKiller: "old", prevKillTime: 1_000 });
    expect(restoreTarget(h)).toEqual({ killer: "old", killTime: 1_000 });
  });

  it("沒有舊紀錄就把這筆寫回去", () => {
    const h = entry({ killer: "new", killTime: 2_000 });
    expect(restoreTarget(h)).toEqual({ killer: "new", killTime: 2_000 });
  });

  it("舊紀錄缺擊殺者時沿用這筆的擊殺者", () => {
    const h = entry({ killer: "new", killTime: 2_000, prevKillTime: 1_000 });
    expect(restoreTarget(h)).toEqual({ killer: "new", killTime: 1_000 });
  });
});

describe("historyRows", () => {
  it("最新的排在最上面", () => {
    const log: HistoryMap = {
      a: entry({ at: 100 }),
      b: entry({ at: 300 }),
      c: entry({ at: 200 }),
    };
    expect(historyRows(log).map((h) => h.id)).toEqual(["b", "c", "a"]);
  });

  it("濾掉未知的王", () => {
    const log: HistoryMap = {
      a: entry(),
      b: entry({ boss: "ghost-boss" }),
    };
    expect(historyRows(log).map((h) => h.id)).toEqual(["a"]);
  });

  it("每個王最多顯示 HISTORY_MAX_PER_BOSS 筆", () => {
    const log: HistoryMap = {};
    for (let i = 0; i < HISTORY_MAX_PER_BOSS + 10; i++) {
      log[`k${i}`] = entry({ at: i });
    }
    expect(historyRows(log)).toHaveLength(HISTORY_MAX_PER_BOSS);
  });

  it("不同王各自計算上限", () => {
    const log: HistoryMap = {};
    for (let i = 0; i < HISTORY_MAX_PER_BOSS; i++) {
      log[`a${i}`] = entry({ boss: "blackcroc", at: i });
      log[`b${i}`] = entry({ boss: "monkey", at: i });
    }
    expect(historyRows(log)).toHaveLength(HISTORY_MAX_PER_BOSS * 2);
  });
});

describe("overflowHistoryKeys", () => {
  it("沒超過上限就不用刪", () => {
    const log: HistoryMap = { a: entry(), b: entry() };
    expect(overflowHistoryKeys(log)).toEqual([]);
  });

  it("超過上限時刪掉最舊的（push key 本身就是時間序）", () => {
    const log: HistoryMap = {};
    for (let i = 0; i < HISTORY_MAX_PER_BOSS + 3; i++) {
      // 用補零的 key 模擬 push key 的字典序
      log[`key-${String(i).padStart(3, "0")}`] = entry();
    }
    const extra = overflowHistoryKeys(log);
    expect(extra).toEqual(["key-000", "key-001", "key-002"]);
  });

  it("以王分組計算，不會互相影響", () => {
    const log: HistoryMap = {};
    for (let i = 0; i < HISTORY_MAX_PER_BOSS + 1; i++) {
      log[`a-${String(i).padStart(3, "0")}`] = entry({ boss: "blackcroc" });
    }
    log["b-000"] = entry({ boss: "monkey" });
    expect(overflowHistoryKeys(log)).toEqual(["a-000"]);
  });
});

describe("HIST_LABEL", () => {
  it("擊殺與舊的 add 都顯示成擊殺", () => {
    expect(HIST_LABEL.kill).toBe("擊殺");
    expect(HIST_LABEL.add).toBe("擊殺");
  });
});
