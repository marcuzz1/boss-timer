import { useState } from "react";
import { useBossTimer } from "../../hooks/useBossTimer";
import { AuthGateOverlay } from "../shared/AuthGateOverlay";
import { MobileBoardView } from "./MobileBoardView";
import { MobileChannelView } from "./MobileChannelView";
import { MobileHero } from "./MobileHero";
import { MobileLogView } from "./MobileLogView";
import { MobilePatrolView } from "./MobilePatrolView";

type TabKey = "patrol" | "ch" | "log" | "board";

const TABS: Array<{ key: TabKey; icon: string; label: string }> = [
  { key: "patrol", icon: "🎯", label: "巡查" },
  { key: "ch", icon: "📺", label: "頻道" },
  { key: "log", icon: "▤", label: "紀錄" },
  { key: "board", icon: "💬", label: "留言" },
];

export function MobileApp() {
  const timer = useBossTimer();
  const [tab, setTab] = useState<TabKey>("patrol");

  const switchTab = (key: TabKey) => {
    setTab(key);
    window.scrollTo(0, 0);
  };

  return (
    <>
      <AuthGateOverlay state={timer.auth.state} loginUrl={timer.auth.loginUrl} />

      <div className="mtop">
        <div className="crest">🍄</div>
        <div className="ttl">巡王計時器</div>
        <button
          className={`sbtn${timer.sound.soundOn ? "" : " off"}`}
          type="button"
          aria-label="音效開關"
          onClick={timer.sound.toggleSound}
        >
          {timer.sound.soundOn ? "🔊" : "🔇"}
        </button>
        <a
          className="sbtn"
          href="index.html?pc=1"
          aria-label="電腦版"
          style={{ textDecoration: "none" }}
        >
          🖥
        </a>
        <div
          className={`conn${timer.connected ? " on" : ""}`}
          aria-label="連線狀態"
        />
      </div>

      <MobileHero timer={timer} />

      <main>
        <section className={`view${tab === "patrol" ? " active" : ""}`}>
          <MobilePatrolView timer={timer} />
        </section>
        <section className={`view${tab === "ch" ? " active" : ""}`}>
          <MobileChannelView timer={timer} />
        </section>
        <section className={`view${tab === "log" ? " active" : ""}`}>
          <MobileLogView timer={timer} />
        </section>
        <section className={`view${tab === "board" ? " active" : ""}`}>
          <MobileBoardView timer={timer} />
        </section>
      </main>

      <nav className="mtabs">
        {TABS.map((t) => (
          <button
            key={t.key}
            className={`tab${tab === t.key ? " on" : ""}`}
            type="button"
            onClick={() => switchTab(t.key)}
          >
            <span className="ic">{t.icon}</span>
            {t.label}
          </button>
        ))}
      </nav>
    </>
  );
}
