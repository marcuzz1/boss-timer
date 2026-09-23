// 驗證 per-boss 上限邏輯（複製 index.html 的實作）
const HISTORY_MAX_PER_BOSS = 50;
const BOSS_KEYS = ["a", "b", "c"];
const bossByKey = Object.fromEntries(BOSS_KEYS.map(k => [k, { name: k }]));
let histLog = {};

let seq = 0;
const nextKey = () => `k${String(++seq).padStart(6, "0")}`;
const removed = [];

function trimHistory(newKey, newEntry) {
  const all = { ...histLog };
  if (newKey) all[newKey] = newEntry || all[newKey];
  const byBoss = {};
  for (const [k, h] of Object.entries(all)) {
    const bk = (h && h.boss) || "__unknown";
    (byBoss[bk] || (byBoss[bk] = [])).push(k);
  }
  const extra = [];
  for (const keys of Object.values(byBoss)) {
    keys.sort();
    if (keys.length > HISTORY_MAX_PER_BOSS) extra.push(...keys.slice(0, keys.length - HISTORY_MAX_PER_BOSS));
  }
  if (!extra.length) return;
  extra.forEach(k => { removed.push(k); delete histLog[k]; });
}

function historyRows() {
  const seen = {};
  return Object.entries(histLog)
    .filter(([, h]) => h && h.boss && bossByKey[h.boss])
    .map(([id, h]) => ({ id, ...h }))
    .sort((a, b) => (b.at || 0) - (a.at || 0))
    .filter(h => (seen[h.boss] = (seen[h.boss] || 0) + 1) <= HISTORY_MAX_PER_BOSS);
}

// 每個王各寫 80 筆
for (let i = 0; i < 80; i++) {
  for (const boss of BOSS_KEYS) {
    const k = nextKey();
    const entry = { boss, at: seq, ch: i };
    histLog[k] = entry;           // 模擬 firebase 監聽已同步
    trimHistory(k, entry);
  }
}

const count = {};
for (const h of Object.values(histLog)) count[h.boss] = (count[h.boss] || 0) + 1;

const total = Object.keys(histLog).length;
const expectTotal = HISTORY_MAX_PER_BOSS * BOSS_KEYS.length;
let ok = true;
for (const b of BOSS_KEYS) {
  const pass = count[b] === HISTORY_MAX_PER_BOSS;
  ok = ok && pass;
  console.log(`boss ${b}: ${count[b]} 筆 -> ${pass ? "OK" : "FAIL"}`);
}
console.log(`總筆數 ${total} / 期望 ${expectTotal} -> ${total === expectTotal ? "OK" : "FAIL"}`);
ok = ok && total === expectTotal;

// 保留的應該是最新的（at 最大的 50 筆 per boss）
for (const b of BOSS_KEYS) {
  const ats = Object.values(histLog).filter(h => h.boss === b).map(h => h.at).sort((x, y) => x - y);
  const newestKept = ats[ats.length - 1], oldestKept = ats[0];
  const pass = ats.length === HISTORY_MAX_PER_BOSS && oldestKept > 3 * 30; // 前 30 輪已被刪
  ok = ok && pass;
  console.log(`boss ${b}: 保留 at ${oldestKept}~${newestKept} -> ${pass ? "OK" : "FAIL"}`);
}

// historyRows 也要各王最多 50
const rows = historyRows();
const rc = {};
rows.forEach(r => rc[r.boss] = (rc[r.boss] || 0) + 1);
const rowsOk = rows.length === expectTotal && BOSS_KEYS.every(b => rc[b] === HISTORY_MAX_PER_BOSS);
ok = ok && rowsOk;
console.log(`historyRows 回傳 ${rows.length} 筆,各王 ${JSON.stringify(rc)} -> ${rowsOk ? "OK" : "FAIL"}`);

// 未達上限時不應刪除
histLog = {}; removed.length = 0; seq = 0;
for (let i = 0; i < 10; i++) { const k = nextKey(); const e = { boss: "a", at: seq }; histLog[k] = e; trimHistory(k, e); }
const noTrimOk = Object.keys(histLog).length === 10 && removed.length === 0;
ok = ok && noTrimOk;
console.log(`未達上限不刪除: ${Object.keys(histLog).length} 筆,刪除 ${removed.length} 筆 -> ${noTrimOk ? "OK" : "FAIL"}`);

console.log(ok ? "\nALL PASS" : "\nFAILED");
process.exit(ok ? 0 : 1);
