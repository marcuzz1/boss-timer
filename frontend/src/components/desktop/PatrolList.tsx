import type { BossTimer } from "../../hooks/useBossTimer";
import { killId, remainText } from "../../lib/timer";
import { BossSprite } from "../shared/BossSprite";

/** 可抽離到子母畫面的巡查清單 */
export function PatrolList({ timer }: { timer: BossTimer }) {
  const { boss, patrolItems, now, recordKill, deleteKill } = timer;

  return (
    <div className="patrolDetach">
      <div className="patrol" id="patrol">
        {patrolItems.length === 0 ? (
          <div className="empty">
            「{boss.name}」目前沒有快出現的頻道。
            <br />
            點上方其他王可切換巡查。
          </div>
        ) : (
          <div className="pgroup">
            <div className="pghead">
              <BossSprite boss={boss} imgClass="pgsprite" emojiClass="pgemoji" />
              <span className="pgname">{boss.name}</span>
              <span className="pgtally">{patrolItems.length} 個頻道</span>
            </div>
            {patrolItems.map((it) => (
              <div className={`prow ${it.st}`} key={it.id}>
                <button className="pkill" type="button" onClick={() => void recordKill(it.boss, it.ch)}>
                  ⚔ 擊殺
                </button>
                <button
                  className="pdel"
                  type="button"
                  title="刪除此頻道紀錄"
                  onClick={() => void deleteKill(killId(it.boss, it.ch))}
                >
                  🗑
                </button>
                <div className="pnm pix">CH{it.ch}</div>
                <div className="pwhere">{it.killer || "匿名"} 擊殺</div>
                <div className="pcd pix">{remainText(it, now)}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
