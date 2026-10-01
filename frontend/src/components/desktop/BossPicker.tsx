import { BOSSES } from "../../config/bosses";
import type { BossTimer } from "../../hooks/useBossTimer";
import { rtLabel } from "../../lib/timer";
import { BossSprite } from "../shared/BossSprite";

export function BossPicker({ timer }: { timer: BossTimer }) {
  const { currentBoss, setCurrentBoss, tallies } = timer;

  return (
    <section className="plate section" style={{ flex: "0 0 auto" }}>
      <div className="head">
        <h2>選擇 BOSS</h2>
        <span className="tally">點圖片切換</span>
      </div>
      <div className="picker">
        {BOSSES.map((b) => {
          const { tracked, urgent } = tallies[b.key] ?? { tracked: 0, urgent: 0 };
          return (
            <div
              key={b.key}
              className={`pick${b.key === currentBoss ? " on" : ""}`}
              tabIndex={0}
              role="button"
              aria-label={b.name}
              onClick={() => setCurrentBoss(b.key)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  setCurrentBoss(b.key);
                }
              }}
            >
              <BossSprite boss={b} imgClass="sprite" emojiFontSize={30} />
              <div className="nm">{b.name}</div>
              <div className="rt">{rtLabel(b)}</div>
              <div className="live">
                {urgent ? (
                  <span style={{ color: "var(--ember)" }}>⚠ {urgent} 要打</span>
                ) : tracked ? (
                  `${tracked} 台在追`
                ) : (
                  ""
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}
