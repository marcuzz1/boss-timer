import { describe, expect, it } from "vitest";
import { CHANNELS, MIN } from "../config/app";
import { bossByKey } from "../config/bosses";
import { fmtCountdown, fmtHM } from "./time";
import {
  STATE_LABEL,
  bossTally,
  isFloating,
  killId,
  remainText,
  rtLabel,
  sortedRows,
  stateOf,
  windowOf,
} from "./timer";
import type { Kill, KillMap } from "./types";

/** 固定時間 45 分重生的王 */
const FIXED = "blackcroc";
/** 浮動 40~60 分的王 */
const FLOAT = "zombie";

const kill = (boss: string, ch: number, killTime: number): Kill => ({
  boss,
  bossName: bossByKey[boss]!.name,
  ch,
  killer: "tester",
  killTime,
});

describe("killId", () => {
  it("組成 {boss}_{ch}", () => {
    expect(killId("zombie", 7)).toBe("zombie_7");
  });
});

describe("isFloating / rtLabel", () => {
  it("固定時間的王不是浮動", () => {
    expect(isFloating(bossByKey[FIXED]!)).toBe(false);
    expect(rtLabel(bossByKey[FIXED]!)).toBe("45 分");
    expect(rtLabel(bossByKey[FIXED]!, false)).toBe("45分");
  });

  it("最短與最長不同就是浮動區間", () => {
    expect(isFloating(bossByKey[FLOAT]!)).toBe(true);
    expect(rtLabel(bossByKey[FLOAT]!)).toBe("40~60 分");
    expect(rtLabel(bossByKey[FLOAT]!, false)).toBe("40~60分");
  });
});

describe("windowOf", () => {
  it("固定時間的王最早與最晚相同", () => {
    const base = 1_000_000;
    expect(windowOf(kill(FIXED, 1, base))).toEqual({
      earliest: base + 45 * MIN,
      latest: base + 45 * MIN,
    });
  });

  it("浮動王的區間是 min~max", () => {
    const base = 1_000_000;
    expect(windowOf(kill(FLOAT, 1, base))).toEqual({
      earliest: base + 40 * MIN,
      latest: base + 60 * MIN,
    });
  });
});

describe("stateOf", () => {
  const base = 1_000_000;
  const item = kill(FLOAT, 3, base);

  it("沒有紀錄是 idle", () => {
    expect(stateOf(undefined, base)).toBe("idle");
  });

  it("資料庫殘留的未知王也是 idle", () => {
    expect(stateOf({ ...item, boss: "ghost-boss" }, base)).toBe("idle");
  });

  it("離最早重生超過 5 分鐘是 counting", () => {
    expect(stateOf(item, base + 30 * MIN)).toBe("counting");
  });

  it("剩 5 分鐘內是 soon", () => {
    expect(stateOf(item, base + 36 * MIN)).toBe("soon");
    // 剛好 5 分鐘也算
    expect(stateOf(item, base + 35 * MIN)).toBe("soon");
  });

  it("進入區間是 window", () => {
    expect(stateOf(item, base + 40 * MIN)).toBe("window");
    expect(stateOf(item, base + 59 * MIN)).toBe("window");
  });

  it("超過最晚時間是 overdue", () => {
    expect(stateOf(item, base + 60 * MIN)).toBe("overdue");
  });

  it("固定時間的王沒有 window，直接跳到 overdue", () => {
    const fixed = kill(FIXED, 1, base);
    expect(stateOf(fixed, base + 45 * MIN - 1)).toBe("soon");
    expect(stateOf(fixed, base + 45 * MIN)).toBe("overdue");
  });
});

describe("remainText", () => {
  const base = 1_000_000;

  it("倒數中顯示剩餘時間", () => {
    expect(remainText(kill(FIXED, 1, base), base + 44 * MIN)).toBe("01:00");
  });

  it("超過一小時會帶上小時位", () => {
    // 巴洛古最短 240 分
    expect(remainText(kill("balrog", 1, base), base)).toBe("04:00:00");
  });

  it("重生區間顯示到最晚時間", () => {
    expect(remainText(kill(FLOAT, 1, base), base + 59 * MIN)).toBe("區間 01:00");
  });

  it("超過最晚時間顯示已重生", () => {
    expect(remainText(kill(FLOAT, 1, base), base + 61 * MIN)).toBe("已重生");
  });
});

describe("sortedRows", () => {
  it("依最早重生時間排序，並濾掉未知的王", () => {
    const base = 1_000_000;
    const kills: KillMap = {
      [killId(FIXED, 2)]: kill(FIXED, 2, base + 10 * MIN),
      [killId(FIXED, 1)]: kill(FIXED, 1, base),
      ghost_9: { ...kill(FIXED, 9, base), boss: "ghost-boss" },
    };
    const rows = sortedRows(kills, base);
    expect(rows.map((r) => r.ch)).toEqual([1, 2]);
    expect(rows[0].st).toBe("counting");
  });
});

describe("bossTally", () => {
  it("分別數出追蹤中與需要巡查的頻道", () => {
    const base = 1_000_000;
    const kills: KillMap = {
      [killId(FIXED, 1)]: kill(FIXED, 1, base - 45 * MIN), // 已重生
      [killId(FIXED, 2)]: kill(FIXED, 2, base - 42 * MIN), // 快出現
      [killId(FIXED, 3)]: kill(FIXED, 3, base), // 倒數中
    };
    expect(bossTally(kills, FIXED, CHANNELS, base)).toEqual({ tracked: 3, urgent: 2 });
  });
});

describe("STATE_LABEL", () => {
  it("每個狀態都有中文說明", () => {
    expect(Object.keys(STATE_LABEL).sort()).toEqual(
      ["counting", "idle", "overdue", "soon", "window"].sort(),
    );
  });
});

describe("時間格式", () => {
  it("fmtCountdown 在 0 或負數時歸零", () => {
    expect(fmtCountdown(0)).toBe("00:00");
    expect(fmtCountdown(-5000)).toBe("00:00");
  });

  it("fmtCountdown 補足兩位數", () => {
    expect(fmtCountdown(9 * 1000)).toBe("00:09");
    expect(fmtCountdown(90 * 1000)).toBe("01:30");
    expect(fmtCountdown(3661 * 1000)).toBe("01:01:01");
  });

  it("fmtHM 補足兩位數", () => {
    const d = new Date(2024, 0, 1, 7, 5, 0);
    expect(fmtHM(d.getTime())).toBe("07:05");
  });
});
