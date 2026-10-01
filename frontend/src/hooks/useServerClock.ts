import { useCallback, useEffect, useRef, useState } from "react";
import { subscribeConnected, subscribeServerOffset } from "../data/subscriptions";

export interface ServerClock {
  /** 伺服器現在時間（毫秒）。所有倒數都以這個為準，使用者改本機時間也不會亂掉。 */
  serverNow: () => number;
  /** null 代表還沒收到第一次連線狀態回報 */
  connected: boolean | null;
}

export function useServerClock(): ServerClock {
  const offsetRef = useRef(0);
  const [connected, setConnected] = useState<boolean | null>(null);

  useEffect(() => {
    const unsubOffset = subscribeServerOffset((offset) => {
      offsetRef.current = offset;
    });
    const unsubConnected = subscribeConnected(setConnected);
    return () => {
      unsubOffset();
      unsubConnected();
    };
  }, []);

  const serverNow = useCallback(() => Date.now() + offsetRef.current, []);

  return { serverNow, connected };
}
