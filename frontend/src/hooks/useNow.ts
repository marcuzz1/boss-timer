import { useEffect, useState } from "react";

/**
 * 每秒重算一次「現在」，讓所有倒數跟著走。
 * 原本的版本是每秒手動改 DOM 文字，這裡交給 React 重繪。
 */
export function useNow(serverNow: () => number, intervalMs = 1000): number {
  const [now, setNow] = useState(() => serverNow());

  useEffect(() => {
    setNow(serverNow());
    const timer = window.setInterval(() => setNow(serverNow()), intervalMs);
    return () => window.clearInterval(timer);
  }, [serverNow, intervalMs]);

  return now;
}
