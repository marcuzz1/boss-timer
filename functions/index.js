const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const admin = require("firebase-admin");

admin.initializeApp();

// Discord Client Secret 存成密鑰,不寫在程式裡（第 3 步用指令設定）
const DISCORD_CLIENT_SECRET = defineSecret("DISCORD_CLIENT_SECRET");

// 以下不是機密,可直接放
const CLIENT_ID = "1551417371053269032";
const GUILD_ID = "1544259636813897758";
const ROLE_ID = "1544261463403790487";
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

    // 4) 發 Firebase 自訂登入憑證,帶 member 標記給資料庫規則用
    const uid = "discord:" + member.user.id;
    const name =
      member.nick ||
      (member.user && (member.user.global_name || member.user.username)) ||
      "";
    const customToken = await admin.auth().createCustomToken(uid, { member: true });
    return { token: customToken, name };
  }
);
