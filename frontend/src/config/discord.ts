/** Discord 驗證相關設定。CLIENT_ID 與 redirect_uri 必須跟 Discord 應用程式後台一致。 */

export const DISCORD_CLIENT_ID = "1551417371053269032";

/**
 * Discord OAuth 完成後導回的位置。
 * 這個值同時寫在 backend/functions/index.js 的 REDIRECT_URI，兩邊要一樣。
 */
export const DISCORD_REDIRECT_URI = "https://marcuzz1.github.io/boss-timer/";

export const DISCORD_SCOPE = "identify guilds.members.read";

/** 每 24 小時重新驗證一次身分組 */
export const VERIFY_TTL_MS = 24 * 60 * 60 * 1000;

/** 多久檢查一次驗證是否過期 */
export const VERIFY_CHECK_INTERVAL_MS = 5 * 60 * 1000;

/** 負責用授權碼換 Firebase 自訂憑證的 Cloud Function 名稱 */
export const DISCORD_AUTH_FUNCTION = "discordAuth";

export function discordLoginUrl(): string {
  const params = new URLSearchParams({
    client_id: DISCORD_CLIENT_ID,
    redirect_uri: DISCORD_REDIRECT_URI,
    response_type: "code",
    scope: DISCORD_SCOPE,
  });
  return "https://discord.com/api/oauth2/authorize?" + params.toString();
}
