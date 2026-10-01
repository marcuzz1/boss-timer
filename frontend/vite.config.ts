import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import { resolve } from "node:path";

/**
 * 兩個入口頁，對應原本的 index.html（桌機版）與 mobile.html（手機版）。
 * 網址結構跟舊版完全一樣，所以 index.html 的自動導向與「📱 手機版 / 🖥 電腦版」
 * 連結都不用改。
 *
 * base 預設 /boss-timer/，對應 GitHub Pages 的 repo 子路徑。
 * 部署到其他網域時用 VITE_BASE 覆寫，例如 VITE_BASE=/ npm run build。
 *
 * 建置結果一律先產在 frontend/dist/。部署用的 npm run build:pages 會再把 dist/
 * 的內容複製到 repo 根目錄（GitHub Pages 設定成從 main 分支根目錄服務）。
 */
export default defineConfig(() => ({
  base: process.env.VITE_BASE ?? "/boss-timer/",
  plugins: [react()],
  build: {
    outDir: "dist",
    rollupOptions: {
      input: {
        index: resolve(__dirname, "index.html"),
        mobile: resolve(__dirname, "mobile.html"),
      },
      output: {
        // 兩個入口共用的第三方程式庫各自成塊，改動自家程式碼時不會讓快取整份失效
        manualChunks(id) {
          if (id.includes("node_modules/firebase") || id.includes("node_modules/@firebase")) {
            return "firebase";
          }
          if (id.includes("node_modules/react") || id.includes("node_modules/scheduler")) {
            return "react";
          }
          return undefined;
        },
      },
    },
  },
  server: {
    port: 5173,
  },
}));
