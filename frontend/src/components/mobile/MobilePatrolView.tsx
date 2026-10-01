import { BOSSES } from "../../config/bosses";
import type { BossTimer } from "../../hooks/useBossTimer";
import { killId, remainText } from "../../lib/timer";
import { BossSprite } from "../shared/BossSprite";

export function MobilePatrolView({ timer }: { timer: BossTimer }) {
  const {
    boss,
    currentBoss,
    setCurrentBoss,
    tallies,
    patrolItems,
    now,
    recordKill,
    deleteKill,
  } = timer;

  return (
    <>
      <div className="h2">
        優先巡查
        <span className="tally">
          {boss.name}・{patrolItems.length} 個
        </span>
      </div>

      <div className="pchips">
        {BOSSES.map((b) => {
          const urgent = tallies[b.key]?.urgent ?? 0;
          return (
            <button
              key={b.key}
              type="button"
              className={`pchip${b.key === currentBoss ? " on" : ""}`}
              onClick={() => setCurrentBoss(b.key)}
            >
              {b.emoji} {b.name}
              {urgent > 0 && <span className="u">{urgent}</span>}
            </button>
          );
        })}
      </div>

      <div>
        {patrolItems.length === 0 ? (
          <div className="empty">
            「{boss.name}」目前沒有快出現的頻道。
            <br />
            點上面其他王切換。
          </div>
        ) : (
          <div className="pgroup">
            <div className="pghead">
              <BossSprite boss={boss} imgClass="sp" emojiClass="em" emojiFontSize={20} />
              <span className="nm">{boss.name}</span>
              <span className="tl">{patrolItems.length} 個頻道</span>
            </div>
            {patrolItems.map((it) => (
              <div className={`prow ${it.st}`} key={it.id}>
                <div className="info">
                  <div className="ch pix">CH{it.ch}</div>
                  <div className="who">{it.killer || "匿名"} 擊殺</div>
                </div>
                <div className="cd pix">{remainText(it, now)}</div>
                <button
                  className="kill"
                  type="button"
                  onClick={() => void recordKill(it.boss, it.ch)}
                >
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
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
