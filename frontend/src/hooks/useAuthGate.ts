import { useCallback, useEffect, useRef, useState } from "react";
import { onAuthStateChanged, signInWithCustomToken, signOut, type User } from "firebase/auth";
import { httpsCallable } from "firebase/functions";
import { NAME_MAX, STORAGE_KEYS } from "../config/app";
import {
  DISCORD_AUTH_FUNCTION,
  VERIFY_CHECK_INTERVAL_MS,
  VERIFY_TTL_MS,
  discordLoginUrl,
} from "../config/discord";
import { auth, functions } from "../config/firebase";

export type GateState =
  /** 還在確認登入狀態 */
  | { kind: "loading" }
  /** 拿到授權碼，正在跟後端換憑證 */
  | { kind: "verifying" }
  /** 管理員按下強制重新驗證，正在導去 Discord */
  | { kind: "reloading" }
  /** 需要使用者按按鈕去 Discord 登入 */
  | { kind: "login"; message: string }
  /** 驗證通過，可以用了 */
  | { kind: "ready" };

const LOGIN_DEFAULT_MESSAGE = "請用 Discord 登入,並需擁有指定身分組才能使用。";
const LOGIN_EXPIRED_MESSAGE = "已超過 24 小時,請重新用 Discord 驗證身分組。";

const verifiedFresh = () => {
  const t = Number(localStorage.getItem(STORAGE_KEYS.verifiedAt) || 0);
  return Boolean(t) && Date.now() - t < VERIFY_TTL_MS;
};

interface DiscordAuthResult {
  token: string;
  name: string;
}

export interface AuthGate {
  state: GateState;
  /** 驗證通過才為 true，資料監聽器要等到這時候才訂閱 */
  ready: boolean;
  /** 取自 Discord 伺服器暱稱，使用者改不了 */
  nick: string;
  /** 暱稱拿不到時的提示狀態，欄位會標紅 */
  nickMissing: boolean;
  /** 送出任何需要名字的動作前呼叫；拿不到名字會提示並回傳 null */
  requireNick: () => string | null;
  loginUrl: string;
  /**
   * 處理 bossTimer/config/reload：改成新的值，所有人下次連上就會重跑一次
   * Discord 驗證。同一個值只觸發一次（記在 localStorage），所以不會無限跳轉。
   */
  handleReloadFlag: (raw: unknown) => void;
}

export function useAuthGate(): AuthGate {
  const [state, setState] = useState<GateState>({ kind: "loading" });
  const [nick, setNick] = useState(() =>
    (localStorage.getItem(STORAGE_KEYS.nick) || "").trim().slice(0, NAME_MAX),
  );
  const [nickMissing, setNickMissing] = useState(false);
  const needReverify = useRef(false);
  const nickRef = useRef(nick);
  nickRef.current = nick;

  const applyNick = useCallback((raw: unknown) => {
    const name = String(raw ?? "")
      .trim()
      .slice(0, NAME_MAX);
    if (!name) return;
    localStorage.setItem(STORAGE_KEYS.nick, name);
    setNick(name);
    setNickMissing(false);
  }, []);

  /* 登入狀態還在（重新整理）時，從 ID token 的 claim 取回名稱，不依賴 localStorage */
  const applyNickFromToken = useCallback(
    async (user: User) => {
      try {
        const result = await user.getIdTokenResult();
        if (result?.claims?.name) applyNick(result.claims.name);
      } catch (err) {
        console.warn("讀取名稱失敗:", err);
      }
    },
    [applyNick],
  );

  useEffect(() => {
    const authCode = new URLSearchParams(location.search).get("code");

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user && verifiedFresh()) {
        void applyNickFromToken(user);
        setState({ kind: "ready" });
        return;
      }
      if (user && !verifiedFresh() && !authCode) {
        needReverify.current = true;
        void signOut(auth);
        return;
      }
      if (!user && !authCode) {
        setState({
          kind: "login",
          message: needReverify.current ? LOGIN_EXPIRED_MESSAGE : LOGIN_DEFAULT_MESSAGE,
        });
      }
    });

    if (authCode) {
      setState({ kind: "verifying" });
      const call = httpsCallable<{ code: string }, DiscordAuthResult>(
        functions,
        DISCORD_AUTH_FUNCTION,
      );
      call({ code: authCode })
        .then((res) => {
          localStorage.setItem(STORAGE_KEYS.verifiedAt, String(Date.now()));
          needReverify.current = false;
          applyNick(res.data.name);
          return signInWithCustomToken(auth, res.data.token);
        })
        .then(() => {
          history.replaceState(null, "", location.pathname);
          setState({ kind: "ready" });
        })
        .catch((err: unknown) => {
          history.replaceState(null, "", location.pathname);
          const message =
            (err instanceof Error && err.message) || "驗證失敗,請重新登入";
          setState({ kind: "login", message });
        });
    }

    /* 每 5 分鐘檢查一次，超過 24 小時就登出要求重新驗證 */
    const timer = window.setInterval(() => {
      if (auth.currentUser && !verifiedFresh()) {
        needReverify.current = true;
        void signOut(auth);
      }
    }, VERIFY_CHECK_INTERVAL_MS);

    return () => {
      unsub();
      window.clearInterval(timer);
    };
  }, [applyNick, applyNickFromToken]);

  const handleReloadFlag = useCallback((raw: unknown) => {
    const value = String(raw ?? "").trim();
    if (!value || value === "0") return;
    if (localStorage.getItem(STORAGE_KEYS.reloadDone) === value) return;
    localStorage.setItem(STORAGE_KEYS.reloadDone, value);
    localStorage.removeItem(STORAGE_KEYS.nick);
    localStorage.removeItem(STORAGE_KEYS.verifiedAt);
    setNick("");
    setState({ kind: "reloading" });
    void signOut(auth)
      .catch(() => {
        /* 忽略登出失敗,照樣重新驗證 */
      })
      .then(() => {
        location.href = discordLoginUrl();
      });
  }, []);

  const requireNick = useCallback(() => {
    const current = nickRef.current;
    if (!current) {
      setNickMissing(true);
      alert("還沒取得你的 Discord 暱稱,請重新用 Discord 登入一次。");
      return null;
    }
    setNickMissing(false);
    return current;
  }, []);

  return {
    state,
    ready: state.kind === "ready",
    nick,
    nickMissing,
    requireNick,
    loginUrl: discordLoginUrl(),
    handleReloadFlag,
  };
}
