const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();

// Discord Client Secret 存成密鑰,不寫在程式裡（第 3 步用指令設定）
const DISCORD_CLIENT_SECRET = defineSecret("DISCORD_CLIENT_SECRET");

// 以下不是機密,可直接放
const CLIENT_ID = "1551417371053269032";
const GUILD_ID = "1544259636813897758";        // 權限檢查用的伺服器
const NICK_GUILD_ID = "306086932910178307";    // 顯示名稱取自這個伺服器的暱稱
const ROLE_ID = "1544261463403790487";
const NAME_MAX = 16;                           // 與前端欄位長度一致
const REDIRECT_URI = "https://marcuzz1.github.io/boss-timer/";

exports.discordAuth = onCall(
  { secrets: [DISCORD_CLIENT_SECRET], region: "asia-east1", cors: true },
  async (req) => {
    const code = req.data && req.data.code;
    if (!code) throw new HttpsError("invalid-argument", "缺少授權碼");

    // 1) 用 code 換 Discord access token
    const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id: CLIENT_ID,
        client_secret: DISCORD_CLIENT_SECRET.value(),
        grant_type: "authorization_code",
        code,
        redirect_uri: REDIRECT_URI,
      }),
    });
    if (!tokenRes.ok) throw new HttpsError("unauthenticated", "Discord 授權失敗（請重新登入）");
    const token = await tokenRes.json();

    // 2) 查這個人在指定伺服器的成員資料與身分組（需 scope: guilds.members.read）
    const memRes = await fetch(
      `https://discord.com/api/users/@me/guilds/${GUILD_ID}/member`,
      { headers: { Authorization: `Bearer ${token.access_token}` } }
    );
    if (memRes.status === 404) throw new HttpsError("permission-denied", "你不在指定的 Discord 伺服器");
    if (!memRes.ok) throw new HttpsError("internal", "讀取身分組失敗");
    const member = await memRes.json();

    // 3) 檢查是否擁有指定身分組
    if (!Array.isArray(member.roles) || !member.roles.includes(ROLE_ID)) {
      throw new HttpsError("permission-denied", "沒有指定的身分組,無法使用本站");
    }

    // 4) 顯示名稱固定取自 NICK_GUILD_ID 的伺服器暱稱,使用者無法自行更改
    const uid = "discord:" + member.user.id;
    const fallbackName =
      member.nick ||
      (member.user && (member.user.global_name || member.user.username)) ||
      "";
    let nickName = "";
    if (NICK_GUILD_ID === GUILD_ID) {
      nickName = member.nick || "";
    } else {
      try {
        const nickRes = await fetch(
          `https://discord.com/api/users/@me/guilds/${NICK_GUILD_ID}/member`,
          { headers: { Authorization: `Bearer ${token.access_token}` } }
        );
        if (nickRes.ok) {
          const nickMember = await nickRes.json();
          nickName =
            nickMember.nick ||
            (nickMember.user && (nickMember.user.global_name || nickMember.user.username)) ||
            "";
        }
      } catch (e) {
        // 不在那個伺服器或讀取失敗 → 用備援名稱,不擋登入
      }
    }
    const name = String(nickName || fallbackName).slice(0, NAME_MAX);

    // 5) 發 Firebase 自訂登入憑證:member 給資料庫規則用,name 讓前端拿到不可篡改的顯示名稱
    const customToken = await admin.auth().createCustomToken(uid, { member: true, name });
    return { token: customToken, name };
  }
);
