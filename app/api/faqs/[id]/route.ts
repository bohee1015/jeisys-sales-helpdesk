import { deleteFaq, updateFaq } from "@/app/lib/faqStore";
import { getCurrentUser } from "@/app/lib/supabase/session";

async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) return { error: Response.json({ error: "로그인이 필요합니다." }, { status: 401 }) };
  if (user.role !== "admin") {
    return { error: Response.json({ error: "관리자만 처리할 수 있습니다." }, { status: 403 }) };
  }
  return { error: null };
}

export async function PATCH(request: Request, ctx: RouteContext<"/api/faqs/[id]">) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await ctx.params;
  const body = await request.json();

  const patch: { question?: string; answer?: string } = {};
  if (typeof body.question === "string" && body.question.trim()) patch.question = body.question.trim();
  if (typeof body.answer === "string" && body.answer.trim()) patch.answer = body.answer.trim();

  if (Object.keys(patch).length === 0) {
    return Response.json({ error: "수정할 내용을 입력해 주세요." }, { status: 400 });
  }

  const updated = await updateFaq(id, patch);
  if (!updated) {
    return Response.json({ error: "FAQ를 찾을 수 없습니다." }, { status: 404 });
  }
  return Response.json(updated);
}

export async function DELETE(_request: Request, ctx: RouteContext<"/api/faqs/[id]">) {
  const { error } = await requireAdmin();
  if (error) return error;

  const { id } = await ctx.params;
  const deleted = await deleteFaq(id);
  if (!deleted) {
    return Response.json({ error: "FAQ를 찾을 수 없습니다." }, { status: 404 });
  }
  return Response.json({ deleted: true });
}
