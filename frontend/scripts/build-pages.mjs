/**
 * 把前端建置結果放到 repo 根目錄，給 GitHub Pages 用。
 *
 * GitHub Pages 的設定是「Deploy from a branch：main /(root)」，改這個設定需要 repo 的
 * Settings 權限，所以站台檔案必須直接躺在 main 的根目錄、跟著 commit 進去。
 *
 * 流程：frontend/ 正常建置到 dist/ → 清掉根目錄上一次的產出 → 複製過去。
 * 不直接把 Vite 的 outDir 指到 repo 根目錄，那樣會踩到「outDir 是專案根目錄的上層」
 * 與「publicDir 在 outDir 裡面」兩個警告。
 *
 * 用法：cd frontend && npm run build:pages
 */
import { spawnSync } from "node:child_process";
import { cp, readdir, rm, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const frontend = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = resolve(frontend, "..");
const dist = resolve(frontend, "dist");

function run(label, scriptPath, args) {
  console.log(`\n> ${label}`);
  const result = spawnSync(process.execPath, [scriptPath, ...args], {
    cwd: frontend,
    stdio: "inherit",
  });
  if (result.status !== 0) {
    console.error(`\n${label} 失敗，根目錄的檔案沒有被動過。`);
    process.exit(result.status ?? 1);
  }
}

run("型別檢查", resolve(frontend, "node_modules/typescript/bin/tsc"), ["--noEmit"]);
run("建置", resolve(frontend, "node_modules/vite/bin/vite.js"), ["build"]);

// assets 的檔名帶 hash，不先清掉舊的會一直堆在 repo 裡
await rm(resolve(repoRoot, "assets"), { recursive: true, force: true });

console.log("\n> 複製到 repo 根目錄");
for (const entry of await readdir(dist)) {
  await cp(resolve(dist, entry), resolve(repoRoot, entry), { recursive: true });
  console.log(`  ${entry}`);
}

// 從分支服務的 Pages 會跑 Jekyll，這個檔案讓它原封不動送出檔案
await writeFile(resolve(repoRoot, ".nojekyll"), "");
console.log("  .nojekyll");

console.log("\n完成。接下來：");
console.log("  git add -A");
console.log('  git commit -m "部署新版前端"');
console.log("  git push");
