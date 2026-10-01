import { CHANNELS, MIN, NAME_MAX } from "../../config/app";
import { BOSSES } from "../../config/bosses";
import type { BossTimer } from "../../hooks/useBossTimer";
import { fmtHM } from "../../lib/time";
import { isFloating, killId, remainText, rtLabel, stateOf } from "../../lib/timer";
import { BossSprite } from "../shared/BossSprite";

const LEGEND: Array<[string, string]> = [
  ["overdue", "已重生"],
  ["window", "重生區間"],
  ["soon", "快出現"],
  ["counting", "倒數中"],
  ["idle", "沒紀錄"],
];

export function MobileChannelView({ timer }: { timer: BossTimer }) {
  const {
    kills,
    boss,
    currentBoss,
    setCurrentBoss,
    chInput,
    setChInput,
    selectedCh,
    selectChannel,
    auth,
    now,
    override,
    recordKill,
    deleteChannel,
    clearBoss,
    applyOverride,
  } = timer;

  return (
    <>
      <div className="h2">選擇 BOSS</div>
      <div className="picker">
        {BOSSES.map((b) => (
          <div
            key={b.key}
            className={`pick${b.key === currentBoss ? " on" : ""}`}
            onClick={() => setCurrentBoss(b.key)}
          >
            <BossSprite boss={b} imgClass="sp" emojiClass="em" emojiFontSize={28} />
            <div className="nm">{b.name}</div>
            <div className="rt">{rtLabel(b, false)}</div>
          </div>
        ))}
      </div>

      <div className="plate track">
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
          <div className="lab" style={{ marginTop: 3 }}>
            {boss.map}
          </div>
        </div>
        <div style={{ marginLeft: "auto", textAlign: "right" }}>
          <div className="lab">重生</div>
          <div className="val">{rtLabel(boss, false)}</div>
        </div>
      </div>

      <div className="fld">
        <label htmlFor="chInput">頻道 CH（1~60）</label>
        <input
          id="chInput"
          type="number"
          inputMode="numeric"
          min={1}
          max={CHANNELS}
          placeholder="輸入頻道"
          value={chInput}
          onChange={(e) => setChInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") void recordKill(currentBoss, chInput);
          }}
        />
      </div>
      <div className="fld">
        <label htmlFor="killerInput">你的 ID（取自 Discord,不可修改）</label>
        <input
          id="killerInput"
          className={`locked${auth.nickMissing ? " need" : ""}`}
          type="text"
          maxLength={NAME_MAX}
          placeholder={auth.nickMissing ? "請重新登入取得暱稱" : "Discord 暱稱"}
          readOnly
          title="名稱固定取用你在指定 Discord 伺服器的暱稱,無法修改"
          value={auth.nick}
        />
      </div>
      <button className="big-go" type="button" onClick={() => void recordKill(currentBoss, chInput)}>
        ⚔ 記錄擊殺
      </button>
      <button
        className="big-go danger"
        type="button"
        onClick={() => void deleteChannel(currentBoss, chInput)}
      >
        🗑 刪除此頻道紀錄
      </button>
      <button className="big-go danger" type="button" onClick={() => void clearBoss(currentBoss)}>
        🧹 清除此王全部頻道紀錄
      </button>

      <div className="ovBox">
        <div className="ovTitle">
          🕓 校正時間<span>蓋掉這個頻道原本的紀錄</span>
        </div>
        <div className="fld">
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
        <div className="fld">
          <label htmlFor={override.mode === "min" ? "ovMin" : "ovTime"}>{override.label}</label>
          {override.mode === "min" ? (
            <input
              id="ovMin"
              type="number"
              inputMode="numeric"
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
          className="big-go gold"
          type="button"
          onClick={() => {
            if (!auth.requireNick()) return;
            void applyOverride(currentBoss, chInput);
          }}
        >
          套用自訂時間
        </button>
      </div>

      <div className="est">
        現在記錄的話,預估重生：
        {isFloating(boss) ? (
          <>
            <b>
              {fmtHM(now + boss.respawnMin * MIN)} ~ {fmtHM(now + boss.respawnMax * MIN)}
            </b>
            （{boss.respawnMin}~{boss.respawnMax}分浮動）
          </>
        ) : (
          <>
            <b>{fmtHM(now + boss.respawnMin * MIN)}</b>（{boss.respawnMin}分後）
          </>
        )}
      </div>

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
            <div key={ch} className={classes.join(" ")} onClick={() => selectChannel(ch)}>
              <div className="ch pix">{ch}</div>
              <div className="cd pix">{item && st !== "idle" ? remainText(item, now) : ""}</div>
            </div>
          );
        })}
      </div>
      <div className="hint">點頻道帶入上面的欄位,再按「記錄擊殺」。</div>
    </>
  );
}
