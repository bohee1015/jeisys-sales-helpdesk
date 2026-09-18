/**
 * 분류·필수값 추출 회귀 테스트.
 *   npm run check:nlp            전체 케이스 실행, 틀린 것만 출력
 *   npm run check:nlp -- -v      맞은 것까지 전부 출력
 *
 * scripts/nlp-cases.json 의 문장을 실제 분류 로직에 통과시켜 기대 결과와 비교한다.
 * 키워드·규칙을 고친 뒤 이 명령이 통과해야 다른 소분류가 깨지지 않은 것이다.
 * (예시 문장의 병원명·인명은 모두 가명이다 — 공개 저장소.)
 */
const { execSync } = require("child_process");
const fs = require("fs");
const os = require("os");
const path = require("path");

const ROOT = path.join(__dirname, "..");
const VERBOSE = process.argv.includes("-v");
const OUT = fs.mkdtempSync(path.join(os.tmpdir(), "helpdesk-nlp-"));

// app/lib 의 순수 로직만 CommonJS로 컴파일해서 Node에서 바로 실행한다 (Next 빌드 불필요).
execSync(
  `npx tsc app/lib/nlp.ts app/lib/fieldExtraction.ts --module commonjs --target es2020 --moduleResolution node --outDir "${OUT}" --skipLibCheck`,
  { cwd: ROOT, stdio: "inherit" }
);

const { classifyDetailed, classifyMultipleSubcategories } = require(path.join(OUT, "nlp.js"));
const { findSubcategory } = require(path.join(OUT, "categories.js"));
const { extractAllFields } = require(path.join(OUT, "fieldExtraction.js"));

// 다른 케이스 파일을 돌려 보고 싶으면 `npm run check:nlp -- --cases 경로` (예: 새로 받은 실제 문장 점검).
const casesArg = process.argv.indexOf("--cases");
const casesPath = casesArg !== -1 && process.argv[casesArg + 1] ? process.argv[casesArg + 1] : path.join(__dirname, "nlp-cases.json");
const cases = JSON.parse(fs.readFileSync(casesPath, "utf8"));
// 날짜 케이스가 실행일에 따라 흔들리지 않도록 기준일을 고정한다.
const REFERENCE = new Date(2026, 8, 17);

let failed = 0;

for (const c of cases) {
  const problems = [];
  const multi = classifyMultipleSubcategories(c.message);
  const detailed = classifyDetailed(c.message);

  if (c.expect.multi) {
    const got = multi.map((m) => `${m.categoryId}:${m.subcategoryId}`).sort();
    const want = [...c.expect.multi].sort();
    if (got.join(",") !== want.join(",")) problems.push(`분리 접수 기대 [${want}] / 실제 [${got.length ? got : "분리 안 됨"}]`);
  } else {
    if (multi.length >= 2) problems.push(`분리 접수되면 안 되는데 [${multi.map((m) => m.categoryId + ":" + m.subcategoryId)}]로 나뉨`);

    const wantCat = c.expect.category ?? null;
    const wantSub = c.expect.subcategory ?? null;
    const gotCat = detailed.kind === "none" ? null : detailed.categoryId;
    const gotSub = detailed.kind === "subcategory" ? detailed.subcategoryId : null;
    if (gotCat !== wantCat || gotSub !== wantSub) {
      problems.push(`분류 기대 ${wantCat ?? "(직접 선택)"}${wantSub ? ":" + wantSub : wantCat ? " (소분류만 선택)" : ""} / 실제 ${gotCat ?? "(직접 선택)"}${gotSub ? ":" + gotSub : gotCat ? " (소분류만 선택)" : ""}`);
    }

    if (c.expect.fields && gotSub) {
      const { subcategory } = findSubcategory(gotCat, gotSub);
      const fields = extractAllFields(subcategory, c.message, REFERENCE);
      for (const [k, v] of Object.entries(c.expect.fields)) {
        if ((fields[k] ?? null) !== v) problems.push(`필드 ${k}: 기대 ${JSON.stringify(v)} / 실제 ${JSON.stringify(fields[k] ?? null)}`);
      }
    }
  }

  if (problems.length) {
    failed += 1;
    console.log(`\n✗ ${c.message}`);
    if (c.note) console.log(`  (${c.note})`);
    for (const p of problems) console.log(`  - ${p}`);
    if (detailed.kind !== "none" && detailed.scores) {
      console.log(`  점수: ${detailed.scores.slice(0, 4).map((s) => `${s.key}=${s.score}`).join(", ")}`);
    }
  } else if (VERBOSE) {
    console.log(`✓ ${c.message}`);
  }
}

console.log(`\n${cases.length}건 중 ${cases.length - failed}건 통과${failed ? `, ${failed}건 실패` : ""}`);
process.exit(failed ? 1 : 0);
