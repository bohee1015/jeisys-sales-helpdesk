/**
 * 분류 키워드 충돌 검사.
 *   node scripts/check-keywords.cjs
 *
 * categories.ts의 키워드를 훑어서 편집 시점에 바로 드러나야 할 문제를 표시한다.
 *   1. 공백 제거 후 같은 키워드가 두 소분류에 있음 → 매번 동점이 나서 되묻게 된다
 *   2. 한 키워드가 다른 소분류 키워드의 일부임 (예: "명세서" ⊂ "거래명세서") → 두 소분류가 같이 걸린다
 *   3. 2글자 이하 키워드 → 엉뚱한 단어 안에서 걸리기 쉽다
 * 문제가 있어도 실패로 끝내지 않고 알려주기만 한다 (판단은 사람이).
 */
const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), "helpdesk-kw-"));

execSync(
  `npx tsc app/lib/categories.ts --module commonjs --target es2020 --outDir "${OUT}" --skipLibCheck`,
  { cwd: ROOT, stdio: "inherit" }
);

const { CATEGORIES } = require(path.join(OUT, "categories.js"));
const normalize = (t) => t.replace(/\s/g, "").toLowerCase();

const entries = [];
for (const c of CATEGORIES) {
  for (const s of c.subcategories) {
    for (const k of s.keywords ?? []) {
      entries.push({ key: `${c.label} · ${s.label}`, raw: k, norm: normalize(k) });
    }
  }
}

let issues = 0;
const report = (title, lines) => {
  if (lines.length === 0) return;
  issues += lines.length;
  console.log(`\n[${title}]`);
  for (const l of lines) console.log(`  - ${l}`);
};

const byNorm = new Map();
for (const e of entries) {
  if (!byNorm.has(e.norm)) byNorm.set(e.norm, []);
  byNorm.get(e.norm).push(e);
}
report(
  "같은 키워드가 여러 소분류에 있음 (동점 → 매번 되물음)",
  [...byNorm.values()]
    .filter((list) => new Set(list.map((e) => e.key)).size > 1)
    .map((list) => `"${list[0].raw}": ${[...new Set(list.map((e) => e.key))].join(" / ")}`)
);

const contained = [];
for (const a of entries) {
  for (const b of entries) {
    if (a.key === b.key || a.norm === b.norm) continue;
    if (b.norm.includes(a.norm)) contained.push(`"${a.raw}"(${a.key}) ⊂ "${b.raw}"(${b.key})`);
  }
}
report("한 소분류의 키워드가 다른 소분류 키워드 안에 들어 있음 (둘 다 걸림)", [...new Set(contained)]);

report(
  "2글자 이하 키워드 (다른 단어 안에서 걸릴 수 있음 — 맥락 패턴(signals)으로 옮기는 것을 고려)",
  entries.filter((e) => e.norm.length <= 2).map((e) => `"${e.raw}" (${e.key})`)
);

console.log(issues === 0 ? "\n키워드 충돌 없음" : `\n확인할 항목 ${issues}개`);
