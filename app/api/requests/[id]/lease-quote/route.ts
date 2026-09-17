import path from "node:path";
import ExcelJS from "exceljs";
import { getRequest } from "@/app/lib/store";
import { getCurrentUser } from "@/app/lib/supabase/session";

export const runtime = "nodejs";

const TEMPLATE_PATH = path.join(process.cwd(), "templates", "lease-quote-template.xlsx");

/** "4,800만원", "4800만", "48000000", "1억2천만원" 같은 표기를 숫자로 바꾼다. */
function parseAmount(raw: string): number | null {
  const text = raw.replace(/[\s,]/g, "").replace(/천만/g, "000만");
  const eok = text.match(/(\d+(?:\.\d+)?)억/);
  const man = text.match(/(\d+(?:\.\d+)?)만/);

  if (eok || man) {
    const total =
      (eok ? Number(eok[1]) * 100_000_000 : 0) + (man ? Number(man[1]) * 10_000 : 0);
    return total > 0 ? total : null;
  }

  const plain = text.match(/(\d{5,})/);
  return plain ? Number(plain[1]) : null;
}

/** 무이자리스 신청 요청으로 사내 견적서 양식을 채워 내려준다. */
export async function GET(_request: Request, ctx: RouteContext<"/api/requests/[id]/lease-quote">) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const helpdeskRequest = await getRequest(id);
  if (!helpdeskRequest) {
    return Response.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
  }

  if (helpdeskRequest.requesterId !== user.id && user.role !== "admin") {
    return Response.json({ error: "조회 권한이 없습니다." }, { status: 403 });
  }

  if (helpdeskRequest.subcategoryId !== "interest_free_lease") {
    return Response.json({ error: "무이자리스 신청 요청만 견적서를 만들 수 있습니다." }, { status: 400 });
  }

  const fields = helpdeskRequest.fields;
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(TEMPLATE_PATH);
  const sheet = workbook.getWorksheet("견적서");
  if (!sheet) {
    return Response.json({ error: "견적서 양식을 읽지 못했습니다." }, { status: 500 });
  }

  const amount = fields.leaseAmount ? parseAmount(fields.leaseAmount) : null;

  sheet.getCell("D4").value = fields.clientName ?? "";
  sheet.getCell("D6").value = fields.directorName ?? "";
  sheet.getCell("D7").value = fields.directorPhone ?? "";
  sheet.getCell("D8").value = new Date();
  sheet.getCell("D9").value = helpdeskRequest.requesterName ?? "";
  sheet.getCell("C17").value = fields.equipmentName ?? "";
  sheet.getCell("F17").value = 1;
  // 금액을 숫자로 바꾸지 못하면 합계 수식이 깨지므로, 원문을 품목 줄에 남기고 금액은 비워 둔다.
  sheet.getCell("H17").value = amount;
  if (!amount && fields.leaseAmount) {
    sheet.getCell("C17").value = `${fields.equipmentName ?? ""} (요청 금액: ${fields.leaseAmount})`;
  }
  sheet.getCell("C23").value =
    ` * 보증기간 1년\n * 선납금 없음\n * 무이자 리스 (캐피탈사: ${fields.leasingCompany ?? "미정"})\n * 납품 예정일 협의`;

  // 템플릿에 남아 있는 예전 계산값 대신, 엑셀을 열 때 합계 수식을 다시 계산하게 한다.
  workbook.calcProperties.fullCalcOnLoad = true;

  const buffer = await workbook.xlsx.writeBuffer();
  const today = new Date().toISOString().slice(0, 10);
  const filename = `무이자리스_견적서_${fields.clientName ?? "거래처"}_${today}.xlsx`;

  return new Response(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
