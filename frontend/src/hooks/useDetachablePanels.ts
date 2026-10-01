import { useCallback, useRef, useState } from "react";

export type PanelKey = "patrol" | "channel";
export type PanelMode = "home" | "pip" | "float";

interface PanelDef {
  key: PanelKey;
  title: string;
  size: { width: number; height: number };
}

const PANELS: PanelDef[] = [
  { key: "patrol", title: "🎯 巡查順序", size: { width: 360, height: 520 } },
  { key: "channel", title: "📺 頻道 CH1–60", size: { width: 430, height: 560 } },
];

const panelDef = (key: PanelKey) => PANELS.find((p) => p.key === key)!;

/** 子母畫面視窗自己的排版，頁面上的樣式表會另外整份複製過去 */
const PIP_LAYOUT_CSS = [
  "html,body{height:100%;margin:0;}",
  "body{background:#000;padding:10px;display:flex;flex-direction:column;gap:8px;font-family:'Noto Sans TC',sans-serif;color:#fdf3df;overflow-x:hidden;}",
  ".pipSec{flex:1 1 0;min-height:0;display:flex;flex-direction:column;}",
  ".pipSec + .pipSec{border-top:1px solid #2b2b38;padding-top:8px;}",
  ".pipTitle{flex:0 0 auto;font-weight:900;color:#ffce54;margin-bottom:8px;}",
  ".pipMount{flex:1;min-height:0;display:flex;flex-direction:column;}",
  ".patrolDetach{flex:1;min-height:0;display:flex;flex-direction:column;container-type:inline-size;container-name:patrol;}",
  ".patrol{flex:1;min-height:0;overflow-y:auto;}",
  ".channelDetach{flex:1;min-height:0;display:flex;flex-direction:column;container-type:inline-size;container-name:chgrid;}",
  ".grid{flex:1;min-height:0;overflow-y:auto;}",
].join("");

function copyStylesTo(win: Window) {
  for (const sheet of Array.from(document.styleSheets)) {
    try {
      const css = Array.from(sheet.cssRules)
        .map((rule) => rule.cssText)
        .join("\n");
      const style = win.document.createElement("style");
      style.textContent = css;
      win.document.head.appendChild(style);
    } catch {
      // 跨網域的樣式表讀不到規則（例如 Google Fonts），改成連結過去
      if (sheet.href) {
        const link = win.document.createElement("link");
        link.rel = "stylesheet";
        link.href = sheet.href;
        win.document.head.appendChild(link);
      }
    }
  }
}

interface DocumentPipWindow {
  requestWindow: (options: { width: number; height: number }) => Promise<Window>;
}

const documentPip = () =>
  (window as unknown as { documentPictureInPicture?: DocumentPipWindow })
    .documentPictureInPicture;

export interface DetachablePanels {
  modeOf: (key: PanelKey) => PanelMode;
  /** 子母畫面裡的掛載點，null 表示這個面板還留在頁面上 */
  mountOf: (key: PanelKey) => HTMLElement | null;
  /** 第幾個浮動視窗，用來錯開位置 */
  floatIndexOf: (key: PanelKey) => number;
  titleOf: (key: PanelKey) => string;
  toggle: (key: PanelKey) => void;
  close: (key: PanelKey) => void;
}

/**
 * 可抽離面板：優先用瀏覽器原生子母畫面（Document PiP），
 * 不支援、已佔用或使用者拒絕時退回頁內的浮動視窗。
 * 兩個面板共用同一個原生視窗，所以都能留在最上層。
 */
export function useDetachablePanels(): DetachablePanels {
  const [modes, setModes] = useState<Record<PanelKey, PanelMode>>({
    patrol: "home",
    channel: "home",
  });
  const [mounts, setMounts] = useState<Record<PanelKey, HTMLElement | null>>({
    patrol: null,
    channel: null,
  });
  const [floatOrder, setFloatOrder] = useState<PanelKey[]>([]);

  const pipWin = useRef<Window | null>(null);
  const pipSections = useRef(new Map<PanelKey, HTMLElement>());

  const returnAllHome = useCallback(() => {
    pipSections.current.clear();
    pipWin.current = null;
    setMounts({ patrol: null, channel: null });
    setModes((prev) => ({
      patrol: prev.patrol === "pip" ? "home" : prev.patrol,
      channel: prev.channel === "pip" ? "home" : prev.channel,
    }));
  }, []);

  const openFloat = useCallback((key: PanelKey) => {
    setFloatOrder((prev) => (prev.includes(key) ? prev : [...prev, key]));
    setModes((prev) => ({ ...prev, [key]: "float" }));
  }, []);

  const closeFloat = useCallback((key: PanelKey) => {
    setFloatOrder((prev) => prev.filter((k) => k !== key));
    setModes((prev) => ({ ...prev, [key]: "home" }));
  }, []);

  const addToPip = useCallback((key: PanelKey, win: Window) => {
    const def = panelDef(key);
    const section = win.document.createElement("section");
    section.className = "pipSec";
    const title = win.document.createElement("div");
    title.className = "pipTitle";
    title.textContent = def.title;
    const mount = win.document.createElement("div");
    mount.className = "pipMount";
    section.appendChild(title);
    section.appendChild(mount);
    win.document.body.appendChild(section);
    pipSections.current.set(key, section);
    setMounts((prev) => ({ ...prev, [key]: mount }));
    setModes((prev) => ({ ...prev, [key]: "pip" }));
  }, []);

  const removeFromPip = useCallback(
    (key: PanelKey) => {
      const section = pipSections.current.get(key);
      setMounts((prev) => ({ ...prev, [key]: null }));
      setModes((prev) => ({ ...prev, [key]: "home" }));
      pipSections.current.delete(key);
      section?.remove();
      // 最後一個收回就把視窗關掉
      if (!pipSections.current.size && pipWin.current) {
        const win = pipWin.current;
        pipWin.current = null;
        win.close();
      }
    },
    [],
  );

  const toggle = useCallback(
    (key: PanelKey) => {
      const mode = modes[key];
      if (mode === "pip") {
        removeFromPip(key);
        return;
      }
      if (mode === "float") {
        closeFloat(key);
        return;
      }

      const pip = documentPip();
      if (!pip) {
        openFloat(key);
        return;
      }

      const def = panelDef(key);
      if (pipWin.current) {
        // 已經有一個原生視窗：把面板加進同一個視窗
        try {
          pipWin.current.resizeBy(0, Math.round(def.size.height * 0.6));
        } catch {
          /* 不能調整就算了 */
        }
        addToPip(key, pipWin.current);
        return;
      }

      pip
        .requestWindow(def.size)
        .then((win) => {
          pipWin.current = win;
          copyStylesTo(win);
          const layout = win.document.createElement("style");
          layout.textContent = PIP_LAYOUT_CSS;
          win.document.head.appendChild(layout);
          // 使用者直接關掉視窗 → 裡面的面板全部回到頁面上
          win.addEventListener("pagehide", returnAllHome);
          addToPip(key, win);
        })
        .catch(() => {
          // 使用者拒絕或瀏覽器擋下 → 退回頁內浮動視窗
          openFloat(key);
        });
    },
    [addToPip, closeFloat, modes, openFloat, removeFromPip, returnAllHome],
  );

  const close = useCallback(
    (key: PanelKey) => {
      if (modes[key] === "pip") removeFromPip(key);
      else if (modes[key] === "float") closeFloat(key);
    },
    [closeFloat, modes, removeFromPip],
  );

  return {
    modeOf: (key) => modes[key],
    mountOf: (key) => mounts[key],
    floatIndexOf: (key) => Math.max(0, floatOrder.indexOf(key)),
    titleOf: (key) => panelDef(key).title,
    toggle,
    close,
  };
}
