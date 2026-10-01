import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { CHANNELS, DB_PATHS, STORAGE_KEYS } from "../config/app";
import { BOSSES } from "../config/bosses";
import type { BoardMessage } from "../lib/types";

/* ---------- 把 Firebase 整個換掉，測試不連外部服務 ---------- */

let authCallback: ((user: unknown) => void) | null = null;
/** 每個訂閱路徑對應的 onValue callback，測試裡自己餵資料進去 */
const valueCallbacks = new Map<string, (snap: { val: () => unknown }) => void>();

vi.mock("firebase/app", () => ({
  initializeApp: vi.fn(() => ({ name: "test" })),
}));

vi.mock("firebase/database", () => ({
  getDatabase: vi.fn(() => ({})),
  ref: vi.fn((_db: unknown, path?: string) => ({ path })),
  onValue: vi.fn(
    (
      target: { path?: string },
      cb: (snap: { val: () => unknown }) => void,
    ) => {
      if (target.path) valueCallbacks.set(target.path, cb);
      return () => {
        if (target.path) valueCallbacks.delete(target.path);
      };
    },
  ),
  set: vi.fn(async () => undefined),
  remove: vi.fn(async () => undefined),
  push: vi.fn(async () => ({ key: "pushed" })),
}));

vi.mock("firebase/auth", () => ({
  getAuth: vi.fn(() => ({ currentUser: null })),
  onAuthStateChanged: vi.fn((_auth: unknown, cb: (user: unknown) => void) => {
    authCallback = cb;
    return () => {
      authCallback = null;
    };
  }),
  signInWithCustomToken: vi.fn(async () => undefined),
  signOut: vi.fn(async () => undefined),
}));

vi.mock("firebase/functions", () => ({
  getFunctions: vi.fn(() => ({})),
  httpsCallable: vi.fn(() => vi.fn(async () => ({ data: { token: "t", name: "n" } }))),
}));

const { DesktopApp } = await import("../components/desktop/DesktopApp");
const { MobileApp } = await import("../components/mobile/MobileApp");

/** Firebase 回報「沒有登入」 */
function signedOut() {
  act(() => {
    authCallback?.(null);
  });
}

/** Firebase 回報「已登入」，且 24 小時內驗證過 */
async function signIn(name = "巡王者") {
  localStorage.setItem(STORAGE_KEYS.verifiedAt, String(Date.now()));
  await act(async () => {
    authCallback?.({
      getIdTokenResult: async () => ({ claims: { name } }),
    });
  });
}

/** 餵一份快照給某個路徑的訂閱者 */
function emit(path: string, value: unknown) {
  act(() => {
    valueCallbacks.get(path)?.({ val: () => value });
  });
}

const boardSnapshot = (texts: string[]) =>
  Object.fromEntries(
    texts.map((text, i) => [`m${i}`, { name: "someone", text, time: 1_000 + i }]),
  ) as Record<string, Omit<BoardMessage, "id">>;

beforeEach(() => {
  localStorage.clear();
  authCallback = null;
  valueCallbacks.clear();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("桌機版", () => {
  it("Firebase 回報沒登入時顯示 Discord 驗證閘門", () => {
    render(<DesktopApp />);
    signedOut();
    expect(screen.getByText("需要 Discord 驗證")).toBeTruthy();
    expect(screen.getByText("用 Discord 登入")).toBeTruthy();
  });

  it("確認登入狀態前先顯示載入中", () => {
    render(<DesktopApp />);
    expect(screen.getByText("載入中…")).toBeTruthy();
  });

  it("畫出完整版面：各區塊標題、每隻王、60 個頻道", () => {
    render(<DesktopApp />);

    // 「選擇 BOSS」同時是區塊標題與表單 label
    expect(screen.getAllByText("選擇 BOSS")).toHaveLength(2);
    expect(screen.getByText("頻道 CH1–60")).toBeTruthy();
    expect(screen.getByText("巡查順序")).toBeTruthy();
    expect(screen.getByText("💬 留言板")).toBeTruthy();

    for (const b of BOSSES) {
      expect(screen.getAllByText(b.name).length).toBeGreaterThan(0);
    }

    const grid = document.querySelector(".grid")!;
    expect(grid.querySelectorAll(".cell")).toHaveLength(CHANNELS);
  });

  it("沒有紀錄時 hero 顯示目前追蹤的王", () => {
    render(<DesktopApp />);
    expect(
      screen.getByText(`「${BOSSES[0].name}」目前沒有紀錄。在下面記一筆,這裡就會顯示下一隻在哪。`),
    ).toBeTruthy();
  });

  it("連線狀態依序顯示尚未連線 → 連線中 → 已連線", () => {
    render(<DesktopApp />);
    expect(screen.getByText("● 尚未連線")).toBeTruthy();

    emit(".info/connected", false);
    expect(screen.getByText("● 連線中…")).toBeTruthy();

    emit(".info/connected", true);
    expect(screen.getByText("● 已連線")).toBeTruthy();
  });

  it("驗證通過後閘門消失，Discord 暱稱填進兩個欄位", async () => {
    render(<DesktopApp />);
    await signIn();

    expect(screen.queryByText("需要 Discord 驗證")).toBeNull();
    expect(screen.queryByText("載入中…")).toBeNull();
    // 標題列的暱稱 + 記錄者欄位
    expect(screen.getAllByDisplayValue("巡王者")).toHaveLength(2);
  });

  it("點頻道格會選取並把頻道帶進輸入框", () => {
    render(<DesktopApp />);
    const cells = document.querySelectorAll(".cell");
    fireEvent.click(cells[6]);

    const chInput = document.getElementById("chInput") as HTMLInputElement;
    expect(chInput.value).toBe("7");
    expect(document.querySelectorAll(".cell")[6].classList.contains("selected")).toBe(true);
  });

  it("切換 BOSS 會換掉目前追蹤的王與出沒地圖", () => {
    render(<DesktopApp />);
    const second = BOSSES[1];
    fireEvent.click(screen.getByRole("button", { name: second.name }));

    expect(screen.getByText(second.map)).toBeTruthy();
    const picks = document.querySelectorAll(".pick");
    expect(picks[1].classList.contains("on")).toBe(true);
    expect(picks[0].classList.contains("on")).toBe(false);
  });

  it("切到歷史紀錄頁籤會換表格", () => {
    render(<DesktopApp />);
    fireEvent.click(screen.getByText("歷史紀錄"));

    expect((document.getElementById("recNowWrap") as HTMLElement).style.display).toBe("none");
    expect((document.getElementById("recHistWrap") as HTMLElement).style.display).toBe("");
  });

  it("校正時間切成指定擊殺時間會換成時間輸入框", () => {
    render(<DesktopApp />);
    expect(document.getElementById("ovMin")).toBeTruthy();
    expect(document.getElementById("ovTime")).toBeNull();

    fireEvent.change(document.getElementById("ovMode") as HTMLSelectElement, {
      target: { value: "time" },
    });

    expect(document.getElementById("ovMin")).toBeNull();
    expect((document.getElementById("ovTime") as HTMLInputElement).type).toBe("time");
  });
});

describe("桌機版留言板未讀數", () => {
  it("首次載入已經存在的留言不算未讀", async () => {
    render(<DesktopApp />);
    await signIn();
    emit(DB_PATHS.board, boardSnapshot(["安", "安安", "安安安"]));

    expect(screen.getByText("3 則")).toBeTruthy();
    expect(document.querySelector(".chatBadge")).toBeNull();
  });

  it("之後新進來的留言才算未讀", async () => {
    render(<DesktopApp />);
    await signIn();
    emit(DB_PATHS.board, boardSnapshot(["安", "安安"]));
    emit(DB_PATHS.board, boardSnapshot(["安", "安安", "王出了", "快來"]));

    expect(document.querySelector(".chatBadge")?.textContent).toBe("2");
  });

  it("打開留言板就把未讀清掉", async () => {
    render(<DesktopApp />);
    await signIn();
    emit(DB_PATHS.board, boardSnapshot(["安"]));
    emit(DB_PATHS.board, boardSnapshot(["安", "王出了"]));
    expect(document.querySelector(".chatBadge")?.textContent).toBe("1");

    fireEvent.click(screen.getByLabelText("開啟留言板"));
    expect(document.querySelector(".chatBadge")).toBeNull();
  });

  it("還沒收到快照時留言數顯示連線中", () => {
    render(<DesktopApp />);
    expect(within(document.querySelector(".chatHead") as HTMLElement).getByText("連線中…")).toBeTruthy();
  });
});

describe("手機版", () => {
  it("畫出四個分頁，預設停在巡查", () => {
    render(<MobileApp />);
    const nav = document.querySelector(".mtabs") as HTMLElement;
    const tabs = nav.querySelectorAll(".tab");

    expect(tabs).toHaveLength(4);
    expect(tabs[0].classList.contains("on")).toBe(true);
    for (const label of ["巡查", "頻道", "紀錄", "留言"]) {
      expect(within(nav).getByText(label)).toBeTruthy();
    }
  });

  it("切到頻道分頁會換成 active，並畫出 60 個頻道", () => {
    render(<MobileApp />);
    const nav = document.querySelector(".mtabs") as HTMLElement;
    fireEvent.click(nav.querySelectorAll(".tab")[1]);

    const views = document.querySelectorAll(".view");
    expect(views[1].classList.contains("active")).toBe(true);
    expect(views[0].classList.contains("active")).toBe(false);
    expect(document.querySelectorAll(".grid .cell")).toHaveLength(CHANNELS);
  });

  it("巡查分頁的王切換鈕每隻王都有一個", () => {
    render(<MobileApp />);
    const chips = document.querySelectorAll(".pchip");
    expect(chips).toHaveLength(BOSSES.length);
    expect(chips[0].classList.contains("on")).toBe(true);
  });

  it("有回電腦版的連結", () => {
    render(<MobileApp />);
    expect(document.querySelector('a[href="index.html?pc=1"]')).toBeTruthy();
  });

  it("驗證通過後把暱稱填進記錄者欄位", async () => {
    render(<MobileApp />);
    await signIn("手機玩家");
    expect(screen.getByDisplayValue("手機玩家")).toBeTruthy();
  });
});

describe("共用：擊殺紀錄會畫成倒數", () => {
  it("kills 快照進來後格子與紀錄表都會顯示剩餘時間", async () => {
    render(<DesktopApp />);
    await signIn();

    const now = Date.now();
    // 沼澤巨鱷固定 45 分重生，剛打完 → 倒數中
    emit(DB_PATHS.kills, {
      blackcroc_5: {
        boss: "blackcroc",
        bossName: "沼澤巨鱷",
        ch: 5,
        killer: "someone",
        killTime: now,
      },
    });

    fireEvent.click(screen.getByRole("button", { name: "沼澤巨鱷" }));

    const cell = document.querySelectorAll(".cell")[4];
    expect(cell.classList.contains("counting")).toBe(true);
    expect(cell.querySelector(".cd")?.textContent).toMatch(/^4[45]:\d\d$/);
    expect(screen.getByText("1 筆")).toBeTruthy();
  });
});
