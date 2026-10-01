import { findBoss } from "../../config/bosses";
import type { BossTimer } from "../../hooks/useBossTimer";
import { remainText } from "../../lib/timer";
import { BossSprite } from "../shared/BossSprite";

const stateLine = (st: string, ch: number) => {
  if (st === "overdue") return `已重生,快去 CH${ch}`;
  if (st === "window") return `重生區間,盯 CH${ch}`;
  if (st === "soon") return "快出現了";
  return "倒數中";
};

export function MobileHero({ timer }: { timer: BossTimer }) {
  const { nextUp, boss, now } = timer;

  if (!nextUp) {
    return (
      <section className="plate mhero" aria-live="polite">
        <div className="empty">「{boss.name}」目前沒有紀錄。到「頻道」記一筆就會顯示下一隻。</div>
      </section>
    );
  }

  const target = findBoss(nextUp.boss) ?? boss;
  const modifier =
    nextUp.st === "overdue" ? " is-overdue" : nextUp.st === "window" ? " is-window" : "";

  return (
    <section className={`plate mhero${modifier}`} aria-live="polite">
      <div className="port">
        <BossSprite boss={target} emojiFontSize={34} />
      </div>
      <div className="mid">
        <div className="eb">下一隻出現</div>
        <div className="nm">{target.name}</div>
        <div className="whr">
          CH{nextUp.ch} ｜ {target.map}
        </div>
      </div>
      <div className="rt">
        <div className="cd pix">{remainText(nextUp, now)}</div>
        <div className="stt">{stateLine(nextUp.st, nextUp.ch)}</div>
      </div>
    </section>
  );
}
