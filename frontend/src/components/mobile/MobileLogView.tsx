import { HISTORY_MAX_PER_BOSS } from "../../config/app";
import { BOSSES, findBoss } from "../../config/bosses";
import type { BossTimer } from "../../hooks/useBossTimer";
import { HIST_LABEL, actionOf } from "../../lib/history";
import { fmtHM } from "../../lib/time";
import { STATE_LABEL_SHORT, remainText } from "../../lib/timer";
import { BossSprite } from "../shared/BossSprite";

export function MobileLogView({ timer }: { timer: BossTimer }) {
  const {
    recTab,
    setRecTab,
    recFilter,
    setRecFilter,
    filteredRows,
    filteredHistory,
    historyError,
    now,
    boss,
    deleteKill,
    restoreFromHistory,
    clearAll,
  } = timer;

  const tally =
    recTab === "now"
      ? `${filteredRows.length} 筆`
      : recFilter === "all"
        ? `${filteredHistory.length} 筆`
        : `${filteredHistory.length} / ${HISTORY_MAX_PER_BOSS} 筆`;

  return (
    <>
      <div className="h2">
        紀錄<span className="tally">{tally}</span>
        <select
          className="recFilter"
          value={recFilter}
          onChange={(e) => setRecFilter(e.target.value)}
        >
          <option value="all">全部紀錄</option>
          {BOSSES.map((b) => (
            <option key={b.key} value={b.key}>
              {b.name}
            </option>
          ))}
        </select>
        {recTab === "now" && (
          <button className="clearAllBtn" type="button" onClick={() => void clearAll()}>
            全部清除
          </button>
        )}
      </div>

      <div className="rtabs">
        <button
          className={`rtab${recTab === "now" ? " on" : ""}`}
          type="button"
          onClick={() => setRecTab("now")}
        >
          目前紀錄
        </button>
        <button
          className={`rtab${recTab === "hist" ? " on" : ""}`}
          type="button"
          onClick={() => setRecTab("hist")}
        >
          歷史紀錄
        </button>
      </div>

      {recTab === "now" && (
        <div>
          {filteredRows.length === 0 ? (
            <div className="empty">這個篩選目前沒有紀錄。</div>
          ) : (
            filteredRows.map((r) => {
              const target = findBoss(r.boss) ?? boss;
              return (
                <div className="rec" key={r.id}>
                  <BossSprite
                    boss={target}
                    imgClass="sp"
                    emojiClass="em"
                    emojiFontSize={22}
                    imgStyle={{ width: 34, height: 34, objectFit: "contain" }}
                  />
                  <div>
                    <div className="nm">
                      {target.name} · CH{r.ch}
                    </div>
                    <div className="sub">
                      {r.killer || "匿名"} ｜ {fmtHM(r.killTime)} 擊殺
                    </div>
                    <span className={`tag ${r.st}`}>{STATE_LABEL_SHORT[r.st]}</span>
                  </div>
                  <div className="rt">
                    <div className="cd pix">{remainText(r, now)}</div>
                  </div>
                  <button className="del" type="button" onClick={() => void deleteKill(r.id)}>
                    刪
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}

      {recTab === "hist" && (
        <div>
          {historyError ? (
            <div className="empty warn">
              歷史紀錄讀取失敗,請確認 Firebase 規則已開放 bossTimer/history。
            </div>
          ) : filteredHistory.length === 0 ? (
            <div className="empty">
              這個篩選沒有歷史紀錄。
              <br />
              之後新增、校正、刪除都會留在這裡（每個王最多 {HISTORY_MAX_PER_BOSS} 筆）。
            </div>
          ) : (
            filteredHistory.map((h) => {
              const action = actionOf(h);
              return (
                <div className="hrow" key={h.id}>
                  <div className="top">
                    <span className={`hact ${action}`}>{HIST_LABEL[action] ?? action}</span>
                    <span className="nm">
                      {h.bossName} · CH{h.ch}
                    </span>
                    <span className="when">{fmtHM(h.at || 0)}</span>
                  </div>
                  <div className="sub">
                    {h.killer || "匿名"} ｜ 擊殺時間{" "}
                    {h.prevKillTime ? (
                      <>
                        <span className="prevt">{fmtHM(h.prevKillTime)}</span> →{" "}
                        {fmtHM(h.killTime)}
                      </>
                    ) : (
                      fmtHM(h.killTime)
                    )}
                  </div>
                  <div className="sub">操作者 {h.by || "匿名"}</div>
                  <button
                    className="undo"
                    type="button"
                    onClick={() => void restoreFromHistory(h.id)}
                  >
                    ↩ 復原這筆
                  </button>
                </div>
              );
            })
          )}
        </div>
      )}
    </>
  );
}
