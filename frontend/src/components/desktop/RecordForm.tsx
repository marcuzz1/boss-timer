import { CHANNELS, MIN, NAME_MAX } from "../../config/app";
import { BOSSES } from "../../config/bosses";
import type { BossTimer } from "../../hooks/useBossTimer";
import { fmtHM } from "../../lib/time";
import { isFloating, rtLabel } from "../../lib/timer";
import { BossSprite } from "../shared/BossSprite";

export function RecordForm({ timer }: { timer: BossTimer }) {
  const {
    boss,
    currentBoss,
    setCurrentBoss,
    chInput,
    setChInput,
    auth,
    now,
    override,
    recordKill,
    deleteChannel,
    applyOverride,
  } = timer;

  return (
    <section className="plate section" style={{ flex: "0 0 auto" }}>
      <div className="track">
        <div className="port">
          <BossSprite
            boss={boss}
            emojiFontSize={26}
            imgStyle={{ width: 38, height: 38, objectFit: "contain" }}
          />
        </div>
        <div>
          <div className="lab">目前追蹤</div>
          <div className="val" style={{ color: "var(--gold)" }}>
            {boss.name}
          </div>
        </div>
        <div>
          <div className="lab">出沒地圖</div>
          <div className="val map">{boss.map}</div>
        </div>
        <div>
          <div className="lab">重生時間</div>
          <div className="val">{rtLabel(boss)}</div>
        </div>
      </div>

      <div className="form">
        <div>
          <label htmlFor="bossSelect">選擇 BOSS</label>
          <select
            id="bossSelect"
            value={currentBoss}
            onChange={(e) => setCurrentBoss(e.target.value)}
          >
            {BOSSES.map((b) => (
              <option key={b.key} value={b.key}>
                {b.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label htmlFor="chInput">頻道 CH</label>
          <input
            id="chInput"
            type="number"
            min={1}
            max={CHANNELS}
            placeholder="1~60"
            value={chInput}
            onChange={(e) => setChInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void recordKill(currentBoss, chInput);
            }}
          />
        </div>
        <div>
          <label htmlFor="killerInput">記錄者</label>
          <input
            id="killerInput"
            className="locked"
            type="text"
            maxLength={NAME_MAX}
            placeholder="Discord 暱稱"
            readOnly
            title="記錄者固定是你的 Discord 暱稱,無法修改"
            value={auth.nick}
          />
        </div>
        <button className="btn-go" type="button" onClick={() => void recordKill(currentBoss, chInput)}>
          記錄擊殺
        </button>
      </div>

      <button
        className="btn-danger"
        type="button"
        style={{ width: "100%", marginTop: 8 }}
        onClick={() => void deleteChannel(currentBoss, chInput)}
      >
        🗑 刪除此頻道紀錄（用上面選的 BOSS + 頻道）
      </button>

      <div className="ovBox">
        <div className="ovTitle">
          🕓 校正時間<span>蓋掉這個頻道原本的紀錄</span>
        </div>
        <div className="ovGrid">
          <div className="field">
            <label htmlFor="ovMode">方式</label>
            <select
              id="ovMode"
              value={override.mode}
              onChange={(e) => override.setMode(e.target.value as "min" | "time")}
            >
              <option value="min">倒數幾分鐘</option>
              <option value="time">指定擊殺時間</option>
            </select>
          </div>
          <div className="field">
            <label htmlFor={override.mode === "min" ? "ovMin" : "ovTime"}>{override.label}</label>
            {override.mode === "min" ? (
              <input
                id="ovMin"
                type="number"
                min={0}
                max={1440}
                placeholder="例如 5"
                value={override.minutes}
                onChange={(e) => override.setMinutes(e.target.value)}
              />
            ) : (
              <input
                id="ovTime"
                type="time"
                value={override.time}
                onChange={(e) => override.setTime(e.target.value)}
              />
            )}
          </div>
          <button
            className="btn-gold"
            type="button"
            onClick={() => {
              if (!auth.requireNick()) return;
              void applyOverride(currentBoss, chInput);
            }}
          >
            套用
          </button>
        </div>
      </div>

      <div className="estimate">
        現在記錄的話,預估重生：
        {isFloating(boss) ? (
          <>
            <b>
              {fmtHM(now + boss.respawnMin * MIN)} ~ {fmtHM(now + boss.respawnMax * MIN)}
            </b>
            （{boss.respawnMin}~{boss.respawnMax} 分浮動）
          </>
        ) : (
          <>
            <b>{fmtHM(now + boss.respawnMin * MIN)}</b>（{boss.respawnMin} 分後）
          </>
        )}
      </div>
    </section>
  );
}
