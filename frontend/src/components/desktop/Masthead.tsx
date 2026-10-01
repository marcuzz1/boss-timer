import { NAME_MAX } from "../../config/app";
import type { BossTimer } from "../../hooks/useBossTimer";

export function Masthead({ timer }: { timer: BossTimer }) {
  const { auth, sound, connected, clearAll } = timer;

  return (
    <header className="plate masthead">
      <div className="crest">🍄</div>
      <div className="title">
        巡王計時器
        <small>打倒王就記一筆,大家一起盯著牠重生</small>
      </div>
      <div className="grow" />
      <input
        className={`mast-field locked${auth.nickMissing ? " need" : ""}`}
        type="text"
        maxLength={NAME_MAX}
        placeholder={auth.nickMissing ? "請重新登入取得暱稱" : "Discord 暱稱"}
        aria-label="你的暱稱（取自 Discord,不可修改）"
        title="名稱固定取用你在指定 Discord 伺服器的暱稱,無法修改"
        readOnly
        value={auth.nick}
      />
      <button
        className={`btn-toggle${sound.soundOn ? "" : " off"}`}
        type="button"
        onClick={sound.toggleSound}
      >
        {sound.soundOn ? "🔊 音效" : "🔇 靜音"}
      </button>
      <a className="mobileLink" href="mobile.html">
        📱 手機版
      </a>
      <button className="btn-danger" type="button" onClick={() => void clearAll()}>
        全部清除
      </button>
      <div className={`conn${connected ? " on" : ""}`}>
        {connected === null ? "● 尚未連線" : connected ? "● 已連線" : "● 連線中…"}
      </div>
    </header>
  );
}
