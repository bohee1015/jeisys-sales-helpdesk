import { createFaq, listFaqs } from "@/app/lib/faqStore";
import { getCurrentUser } from "@/app/lib/supabase/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  return Response.json(await listFaqs());
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return Response.json({ error: "관리자만 등록할 수 있습니다." }, { status: 403 });
  }

  const body = await request.json();
  const question = typeof body.question === "string" ? body.question.trim() : "";
  const answer = typeof body.answer === "string" ? body.answer.trim() : "";

  if (!question || !answer) {
    return Response.json({ error: "질문과 답변을 모두 입력해 주세요." }, { status: 400 });
  }

  return Response.json(await createFaq(question, answer));
}
