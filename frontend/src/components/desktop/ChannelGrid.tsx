import { CHANNELS } from "../../config/app";
import type { BossTimer } from "../../hooks/useBossTimer";
import { killId, remainText, stateOf } from "../../lib/timer";

const LEGEND: Array<[string, string]> = [
  ["overdue", "已重生"],
  ["window", "重生區間"],
  ["soon", "快出現了"],
  ["counting", "倒數中"],
  ["idle", "沒紀錄"],
];

/** 可抽離到子母畫面的頻道格子區塊 */
export function ChannelGrid({ timer }: { timer: BossTimer }) {
  const { kills, currentBoss, selectedCh, selectChannel, recordKill, now } = timer;

  return (
    <div className="channelDetach">
      <div className="legend">
        {LEGEND.map(([state, label]) => (
          <span key={state}>
            <i className={`chip ${state}`} />
            {label}
          </span>
        ))}
      </div>
      <div className="grid">
        {Array.from({ length: CHANNELS }, (_, idx) => {
          const ch = idx + 1;
          const item = kills[killId(currentBoss, ch)];
          const st = stateOf(item, now);
          const classes = ["cell"];
          if (st !== "idle") classes.push(st);
          if (selectedCh === ch) classes.push("selected");
          return (
            <div
              key={ch}
              className={classes.join(" ")}
              tabIndex={0}
              onClick={() => selectChannel(ch)}
              onDoubleClick={() => void recordKill(currentBoss, ch)}
              onKeyDown={(e) => {
                if (e.key === "Enter") void recordKill(currentBoss, ch);
              }}
            >
              <div className="ch pix">{ch}</div>
              <div className="cd pix">{item && st !== "idle" ? remainText(item, now) : ""}</div>
            </div>
          );
        })}
      </div>
      <div className="hint">
        單擊選頻道帶入上面,雙擊直接記一筆(用目前追蹤的 BOSS 和你的暱稱)。
      </div>
    </div>
  );
}
