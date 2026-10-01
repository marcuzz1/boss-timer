import { useBossTimer } from "../../hooks/useBossTimer";
import { useDetachablePanels, type PanelKey } from "../../hooks/useDetachablePanels";
import { AuthGateOverlay } from "../shared/AuthGateOverlay";
import { BossPicker } from "./BossPicker";
import { ChannelGrid } from "./ChannelGrid";
import { ChatWidget } from "./ChatWidget";
import { DetachablePanel } from "./DetachablePanel";
import { Hero } from "./Hero";
import { Masthead } from "./Masthead";
import { PatrolList } from "./PatrolList";
import { RecordForm } from "./RecordForm";
import { RecordsPanel } from "./RecordsPanel";

const pipLabel = (detached: boolean) => (detached ? "✕ 關閉子母畫面" : "🔲 子母畫面");

export function DesktopApp() {
  const timer = useBossTimer();
  const panels = useDetachablePanels();

  const pipButton = (key: PanelKey) => {
    const detached = panels.modeOf(key) !== "home";
    return (
      <button
        className={`pipBtn${detached ? " on" : ""}`}
        type="button"
        onClick={() => panels.toggle(key)}
      >
        {pipLabel(detached)}
      </button>
    );
  };

  return (
    <>
      <AuthGateOverlay state={timer.auth.state} loginUrl={timer.auth.loginUrl} />
      <div className="app">
        <Masthead timer={timer} />
        <Hero timer={timer} />

        <div className="main">
          <div className="col">
            <BossPicker timer={timer} />
            <RecordForm timer={timer} />

            <section className="plate section gridwrap">
              <div className="head">
                <h2>頻道 CH1–60</h2>
                {pipButton("channel")}
                <button
                  className="hbtn-danger"
                  type="button"
                  onClick={() => void timer.clearBoss(timer.currentBoss)}
                >
                  🧹 清除此王全部
                </button>
              </div>
              <DetachablePanel panels={panels} panelKey="channel">
                <ChannelGrid timer={timer} />
              </DetachablePanel>
            </section>
          </div>

          <div className="col">
            <section className="plate section patrolwrap">
              <div className="head">
                <h2>巡查順序</h2>
                <span className="tally">
                  {timer.boss.name}・{timer.patrolItems.length} 個
                </span>
                {pipButton("patrol")}
              </div>
              <DetachablePanel panels={panels} panelKey="patrol">
                <PatrolList timer={timer} />
              </DetachablePanel>
            </section>

            <RecordsPanel timer={timer} />
          </div>

          <ChatWidget timer={timer} />
        </div>
      </div>
    </>
  );
}
