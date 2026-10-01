import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { STORAGE_KEYS } from "../config/app";
import { SoundEngine } from "../lib/sound";

export interface SoundControl {
  soundOn: boolean;
  toggleSound: () => void;
  /** 警報音：王已重生 */
  playAlarm: () => void;
  /** 提示音：重生前三分鐘，準備巡查 */
  playReady: () => void;
}

export function useSound(): SoundControl {
  const engine = useMemo(() => new SoundEngine(), []);
  const [soundOn, setSoundOn] = useState(
    () => localStorage.getItem(STORAGE_KEYS.sound) !== "off",
  );
  const soundOnRef = useRef(soundOn);
  soundOnRef.current = soundOn;

  /* 瀏覽器要有互動才讓網頁出聲，第一次點擊或按鍵時解鎖 */
  useEffect(() => {
    const unlock = () => engine.unlock();
    window.addEventListener("pointerdown", unlock, { once: true });
    window.addEventListener("keydown", unlock, { once: true });
    return () => {
      window.removeEventListener("pointerdown", unlock);
      window.removeEventListener("keydown", unlock);
    };
  }, [engine]);

  const toggleSound = useCallback(() => {
    const next = !soundOnRef.current;
    soundOnRef.current = next;
    setSoundOn(next);
    localStorage.setItem(STORAGE_KEYS.sound, next ? "on" : "off");
    if (next) {
      engine.unlock();
      engine.playAlarm();
    }
  }, [engine]);

  const playAlarm = useCallback(() => {
    if (soundOn) engine.playAlarm();
  }, [engine, soundOn]);

  const playReady = useCallback(() => {
    if (soundOn) engine.playReady();
  }, [engine, soundOn]);

  return { soundOn, toggleSound, playAlarm, playReady };
}
