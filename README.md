# boss-timer · 巡王計時器

多人共用的 BOSS 重生計時器。記下擊殺時間，全場一起盯著 60 個頻道的倒數。
需要 Discord 身分組才能使用。

線上版：<https://marcuzz1.github.io/boss-timer/>

## 結構

```
frontend/              React + Vite + TypeScript，建置後是純靜態檔案
  index.html           桌機版入口（視窗 < 820px 自動導向手機版，?pc=1 可強制留下）
  mobile.html          手機版入口
  public/              直接複製到站台根目錄的檔案（音效）
  src/
    config/            設定：BOSS 清單、常數、Firebase、Discord
    lib/               純邏輯，不碰 DOM 也不碰 Firebase（倒數、狀態、歷史、音效）
    data/              Realtime Database 的讀寫封裝
    hooks/             共用狀態：驗證閘門、伺服器時間、資料訂閱、音效、警報
    components/
      shared/          兩版共用的小元件
      desktop/         桌機版畫面
      mobile/          手機版畫面
    styles/            desktop.css / mobile.css
    test/              測試環境設定與畫面煙霧測試

backend/
  functions/           Firebase Cloud Functions：Discord 身分組驗證

index.html             ← 以下是建置產物，由 npm run build:pages 產生，不要手改
mobile.html
assets/
three_gun.mp3
.nojekyll

firebase.json          functions 的部署設定（指向 backend/functions）
.github/workflows/     推上 main 跑測試與建置（只做檢查，不部署）
```

桌機版與手機版是兩個獨立的畫面，但共用 `config` / `lib` / `data` / `hooks`。
計時規則、歷史上限、音效時機只寫在一處，兩邊行為一定一致。

## 資料流

```
Discord ──┐
          ├─► backend/functions discordAuth ──► Firebase 自訂憑證（內含不可篡改的暱稱）
使用者 ────┘                                              │
                                                         ▼
                              Firebase Auth ──► Realtime Database
                                                  bossTimer/kills    目前的計時紀錄
                                                  bossTimer/history  變動紀錄（每王 50 筆）
                                                  bossTimer/board    留言板
                                                  bossTimer/config   強制重新驗證旗標
```

倒數一律以 `.info/serverTimeOffset` 校正後的伺服器時間為準，使用者改本機時鐘不會影響別人。
身分組每 24 小時重新驗證一次。

## 開發

需要 Node 20 以上。

```bash
cd frontend
npm install
npm run dev        # http://localhost:5173/ 桌機版，/mobile.html 手機版
```

本機開發會連到正式的 Firebase 專案，所以寫入會影響線上資料。要測寫入請另開一個 Firebase 專案，
改 `src/config/firebase.ts`。

其他指令：

```bash
npm test           # 單元測試 + 畫面煙霧測試
npm run typecheck  # 只跑型別檢查
npm run build      # 型別檢查 + 產出 dist/
npm run preview    # 預覽 dist/
npm run build:pages  # 部署用：建置並複製到 repo 根目錄（見下面「部署」）
```

`src/config/firebase.ts` 裡的設定是 Firebase 的公開 web 設定，本來就會打包進前端，
存取控制靠 Realtime Database 規則與 Discord 驗證。真正的機密（Discord Client Secret）
只存在 Cloud Functions 的 Secret Manager。

## 部署

### 前端 → GitHub Pages

GitHub Pages 設定是 **Deploy from a branch：`main` /(root)**，所以站台檔案直接放在
repo 根目錄、跟著 commit 進去。要部署就跑：

```bash
cd frontend
npm run build:pages
```

這會跑型別檢查、建置，然後把結果複製到 repo 根目錄：

```
index.html      桌機版（建置產物）
mobile.html     手機版（建置產物）
assets/         JS / CSS（檔名帶 hash，每次重建會先清掉舊的）
three_gun.mp3   從 frontend/public/ 複製過來
.nojekyll       叫 GitHub Pages 不要跑 Jekyll
```

接著 commit 推上 `main`，網站就換新版了：

```bash
git add -A
git commit -m "部署新版前端"
git push
```

根目錄這些檔案都是產物，不要手改 —— 下次 `build:pages` 會整份覆蓋。要改畫面請改
`frontend/src/`。忘記跑 `build:pages` 的症狀很明顯：推上去之後網站沒有變化。

`.github/workflows/ci.yml` 會在推上 `main` 或開 PR 時跑測試與建置，只做檢查、不部署，
所以只需要讀取權限，不用動 repo 的任何設定。

網址前綴由 `frontend/vite.config.ts` 的 `base` 決定，預設 `/boss-timer/`（對應 repo 名稱）。
換 repo 名稱或自訂網域時要改這裡。

> 如果你有 repo 的 Settings 權限，可以把 **Settings → Pages → Source** 改成
> **GitHub Actions**，就能改用 workflow 自動部署、不用再把產物 commit 進 repo。
> 那種做法比較乾淨，但需要改設定。

### 後端 → Firebase Functions

```bash
# 只有第一次要設定 Discord Client Secret
firebase functions:secrets:set DISCORD_CLIENT_SECRET

firebase deploy --only functions
```

`backend/functions/index.js` 裡的 `REDIRECT_URI` 必須跟 `frontend/src/config/discord.ts` 的
`DISCORD_REDIRECT_URI`、以及 Discord 應用程式後台設定的 redirect URI 三者一致。

## 常用維護動作

**改 BOSS 或重生時間**：`frontend/src/config/bosses.ts`。

**改頻道數、歷史上限、提醒時機**：`frontend/src/config/app.ts`。

**要所有人重新驗證 Discord**：把 Realtime Database 的 `bossTimer/config/reload` 改成一個沒用過的值
（例如遞增數字）。每個人下次連上會自動重跑一次驗證，同一個值只會觸發一次。

**換警報音**：放一個 `usagi.mp3` 到 `frontend/public/`。目前沒有這個檔案，所以重生警報走合成音；
重生前三分鐘的準備提示音用 `three_gun.mp3`。
