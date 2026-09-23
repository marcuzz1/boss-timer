const fs = require("fs");
const vm = require("vm");
let bad = 0;
for (const f of ["index.html", "mobile.html"]) {
  const s = fs.readFileSync(f, "utf8");
  const blocks = [...s.matchAll(/<script\b[^>]*>([\s\S]*?)<\/script>/g)]
    .map(m => m[1])
    .filter(c => c.trim());
  blocks.forEach((code, i) => {
    try {
      new vm.SourceTextModule(code);
      console.log(`OK  ${f} block ${i}`);
    } catch (e) {
      bad++;
      console.log(`ERR ${f} block ${i}: ${e.message}`);
    }
  });
}
process.exit(bad ? 1 : 0);
