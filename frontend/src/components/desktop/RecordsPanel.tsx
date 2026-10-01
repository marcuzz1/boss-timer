import { HISTORY_MAX_PER_BOSS } from "../../config/app";
import { BOSSES, findBoss } from "../../config/bosses";
import type { BossTimer } from "../../hooks/useBossTimer";
import { HIST_LABEL, actionOf } from "../../lib/history";
import { fmtHM } from "../../lib/time";
import { STATE_LABEL, remainText } from "../../lib/timer";
import { NameCell } from "../shared/NameCell";

export function RecordsPanel({ timer }: { timer: BossTimer }) {
  const {
    recTab,
    setRecTab,
    recFilter,
    setRecFilter,
    filteredRows,
    filteredHistory,
    historyError,
    now,
    deleteKill,
    restoreFromHistory,
  } = timer;

  const tally =
    recTab === "now"
      ? `${filteredRows.length} 筆`
      : recFilter === "all"
        ? `${filteredHistory.length} 筆`
        : `${filteredHistory.length} / ${HISTORY_MAX_PER_BOSS} 筆`;

  return (
    <section className="plate section recwrap">
      <div className="head">
        <h2>紀錄</h2>
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
        <span className="tally">{tally}</span>
      </div>

      <div className="tablewrap" id="recNowWrap" style={{ display: recTab === "now" ? "" : "none" }}>
        <table>
          <thead>
            <tr>
              <th>BOSS</th>
              <th>CH</th>
              <th>擊殺者</th>
              <th>擊殺</th>
              <th>狀態</th>
              <th>剩餘</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {filteredRows.length === 0 ? (
              <tr>
                <td colSpan={7} className="empty">
                  這個篩選目前沒有紀錄。
                </td>
              </tr>
            ) : (
              filteredRows.map((r) => (
                <tr key={r.id}>
                  <td>{findBoss(r.boss)?.name ?? r.bossName}</td>
                  <td className="pix">{r.ch}</td>
                  <td>
                    <NameCell name={r.killer} />
                  </td>
                  <td className="pix">{fmtHM(r.killTime)}</td>
                  <td>
                    <span className={`tag ${r.st}`}>{STATE_LABEL[r.st]}</span>
                  </td>
                  <td className="pix">{remainText(r, now)}</td>
                  <td>
                    <button className="del" type="button" onClick={() => void deleteKill(r.id)}>
                      刪除
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <div
        className="tablewrap"
        id="recHistWrap"
        style={{ display: recTab === "hist" ? "" : "none" }}
      >
        <table>
          <colgroup>
            <col className="hcol-at" />
            <col className="hcol-act" />
            <col className="hcol-boss" />
            <col className="hcol-ch" />
            <col className="hcol-killer" />
            <col className="hcol-time" />
            <col className="hcol-by" />
            <col className="hcol-undo" />
          </colgroup>
          <thead>
            <tr>
              <th>操作</th>
              <th>動作</th>
              <th>BOSS</th>
              <th>CH</th>
              <th>擊殺者</th>
              <th>擊殺時間</th>
              <th>操作者</th>
              <th />
            </tr>
          </thead>
          <tbody>
            {historyError ? (
              <tr>
                <td colSpan={8} className="empty warn">
                  歷史紀錄讀取失敗,請確認 Firebase 規則已開放 bossTimer/history。
                </td>
              </tr>
            ) : filteredHistory.length === 0 ? (
              <tr>
                <td colSpan={8} className="empty">
                  這個篩選沒有歷史紀錄。之後新增、校正、刪除都會留在這裡（每個王最多{" "}
                  {HISTORY_MAX_PER_BOSS} 筆）。
                </td>
              </tr>
            ) : (
              filteredHistory.map((h) => {
                const action = actionOf(h);
                return (
                  <tr key={h.id}>
                    <td className="pix">{fmtHM(h.at || 0)}</td>
                    <td>
                      <span className={`hact ${action}`}>{HIST_LABEL[action] ?? action}</span>
                    </td>
                    <td>
                      <NameCell name={h.bossName} />
                    </td>
                    <td className="pix">{h.ch}</td>
                    <td>
                      <NameCell name={h.killer} />
                    </td>
                    <td className="pix htime">
                      {h.prevKillTime ? (
                        <>
                          <span className="hprev">{fmtHM(h.prevKillTime)}</span> →{" "}
                          {fmtHM(h.killTime)}
                        </>
                      ) : (
                        fmtHM(h.killTime)
                      )}
                    </td>
                    <td>
                      <NameCell name={h.by} />
                    </td>
                    <td>
                      <button
                        className="undo"
                        type="button"
                        aria-label="復原這筆紀錄"
                        title="把這筆紀錄寫回去"
                        onClick={() => void restoreFromHistory(h.id)}
                      >
                        ↩
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
