/**
 * 音效。重生警報優先播 usagi.mp3，沒有這個檔案就退回合成音；
 * 「準備」提示音優先播 three_gun.mp3，同樣有合成音備援。
 */

type Note = [freq: number, startSec: number, durationSec: number];

const ALARM_NOTES: Note[] = [
  [880, 0, 0.16],
  [1245, 0.16, 0.16],
  [1046, 0.34, 0.16],
  [1568, 0.52, 0.45],
];

const READY_NOTES: Note[] = [
  [523, 0, 0.12],
  [659, 0.12, 0.12],
  [784, 0.24, 0.12],
  [1047, 0.36, 0.18],
  [880, 0.58, 0.1],
  [1047, 0.7, 0.1],
  [1319, 0.82, 0.32],
];

/** public/ 下的檔案，用 BASE_URL 組出來，部署在子路徑也找得到 */
const assetUrl = (file: string) => import.meta.env.BASE_URL + file;

/** 載入一個音檔，並記住它到底能不能播 */
function loadOptional(file: string) {
  const audio = new Audio(assetUrl(file));
  const state = { audio, ok: false };
  audio.addEventListener("canplaythrough", () => {
    state.ok = true;
  });
  audio.addEventListener("error", () => {
    state.ok = false;
  });
  return state;
}

export class SoundEngine {
  private ctx: AudioContext | null = null;
  private alarmFile = loadOptional("usagi.mp3");
  private readyFile = loadOptional("three_gun.mp3");

  /** 瀏覽器要有使用者互動才允許出聲，所以第一次點擊／按鍵時呼叫這個解鎖 */
  unlock(): void {
    if (!this.ctx) {
      const Ctor =
        window.AudioContext ??
        (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (Ctor) this.ctx = new Ctor();
    }
    if (this.ctx && this.ctx.state === "suspended") void this.ctx.resume();
  }

  private synth(notes: Note[], type: OscillatorType, peak: number): void {
    this.unlock();
    const ctx = this.ctx;
    if (!ctx) return;
    const t0 = ctx.currentTime;
    for (const [freq, start, dur] of notes) {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = type;
      osc.frequency.setValueAtTime(freq, t0 + start);
      if (type === "triangle") {
        osc.frequency.linearRampToValueAtTime(freq * 1.05, t0 + start + dur);
      }
      osc.connect(gain);
      gain.connect(ctx.destination);
      gain.gain.setValueAtTime(0, t0 + start);
      gain.gain.linearRampToValueAtTime(peak, t0 + start + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, t0 + start + dur);
      osc.start(t0 + start);
      osc.stop(t0 + start + dur + 0.03);
    }
  }

  /** 王已重生 */
  playAlarm(): void {
    const { audio, ok } = this.alarmFile;
    if (!ok) {
      this.synth(ALARM_NOTES, "triangle", 0.25);
      return;
    }
    audio.currentTime = 0;
    audio.play()?.catch(() => this.synth(ALARM_NOTES, "triangle", 0.25));
    // 原版只讓警報響一秒
    window.setTimeout(() => {
      try {
        audio.pause();
      } catch {
        /* 已經停了就算了 */
      }
    }, 1000);
  }

  /** 新一輪巡查開始、重生前三分鐘的「準備」提示 */
  playReady(): void {
    const { audio, ok } = this.readyFile;
    if (!ok) {
      this.synth(READY_NOTES, "square", 0.16);
      return;
    }
    audio.currentTime = 0;
    audio.play()?.catch(() => this.synth(READY_NOTES, "square", 0.16));
  }
}
