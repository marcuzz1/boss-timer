import { findBoss } from "../../config/bosses";
import type { BossTimer } from "../../hooks/useBossTimer";
import { remainText } from "../../lib/timer";
import { BossSprite } from "../shared/BossSprite";

const stateLine = (st: string, ch: number) => {
  if (st === "overdue") return `已經重生,快去 CH${ch}！`;
  if (st === "window") return `進入重生區間,盯緊 CH${ch}`;
  if (st === "soon") return "快出現了";
  return "倒數中";
};

/** 最上方那條「下一隻出現」的大看板 */
export function Hero({ timer }: { timer: BossTimer }) {
  const { nextUp, boss, now } = timer;

  if (!nextUp) {
    return (
      <section className="plate hero" aria-live="polite">
        <div className="hero-empty">
          「{boss.name}」目前沒有紀錄。在下面記一筆,這裡就會顯示下一隻在哪。
        </div>
      </section>
    );
  }

  const target = findBoss(nextUp.boss) ?? boss;
  const modifier =
    nextUp.st === "overdue" ? " is-overdue" : nextUp.st === "window" ? " is-window" : "";

  return (
    <section className={`plate hero${modifier}`} aria-live="polite">
      <div className="hero-portrait">
        <BossSprite boss={target} emojiFontSize={40} />
      </div>
      <div className="hero-body">
        <div className="hero-eyebrow">下一隻出現</div>
        <div className="hero-name">{target.name}</div>
        <div className="hero-where">
          CH{nextUp.ch} ｜ {target.map} ｜ 上次 {nextUp.killer || "匿名"} 擊殺
        </div>
      </div>
      <div className="hero-time">
        <div className="hero-count pix">{remainText(nextUp, now)}</div>
        <div className="hero-state">{stateLine(nextUp.st, nextUp.ch)}</div>
      </div>
    </section>
  );
}
