/**
 * 사내 "무이자 리스 견적서 양식" 엑셀에서 견적서 시트만 남긴 템플릿을 만든다.
 * 원본에는 거래처 마스터(11,915행)와 직원 연락처가 들어 있어 저장소에 넣지 않고 제거한다.
 *
 * 사용법: node scripts/build-lease-template.cjs "<원본 엑셀 경로>"
 */
const path = require("path");
const ExcelJS = require("exceljs");

const SOURCE = process.argv[2];
const OUTPUT = path.join(__dirname, "..", "templates", "lease-quote-template.xlsx");

// 원본에 예시로 들어있던 실제 거래처 값 / 삭제된 시트를 참조하는 수식이 있는 칸
const CELLS_TO_CLEAR = ["D4", "D5", "D6", "D7", "D8", "D9", "D10", "C17", "F17", "H17", "C23"];

async function main() {
  if (!SOURCE) throw new Error("원본 엑셀 경로를 인자로 넘겨주세요.");

  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(SOURCE);
  console.log("읽은 시트:", workbook.worksheets.map((w) => w.name).join(", "));

  for (const name of ["사업자정보", "연락처"]) {
    const sheet = workbook.getWorksheet(name);
    if (sheet) workbook.removeWorksheet(sheet.id);
  }

  const sheet = workbook.getWorksheet("예시");
  sheet.name = "견적서";
  for (const address of CELLS_TO_CLEAR) sheet.getCell(address).value = null;

  await workbook.xlsx.writeFile(OUTPUT);
  console.log("저장:", OUTPUT);

  const check = new ExcelJS.Workbook();
  await check.xlsx.readFile(OUTPUT);
  console.log("검증 시트:", check.worksheets.map((w) => w.name).join(", "));
  console.log("검증 이미지 수:", check.model.media ? check.model.media.length : 0);
  console.log("검증 I14 수식:", JSON.stringify(check.getWorksheet("견적서").getCell("I14").value));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
