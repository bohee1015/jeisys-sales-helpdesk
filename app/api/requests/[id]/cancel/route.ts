import { getRequest, updateRequest } from "@/app/lib/store";
import { getCurrentUser } from "@/app/lib/supabase/session";

/** 아직 처리가 시작되지 않은 단계에서만 취소를 허용한다. */
const CANCELLABLE = ["collecting_info", "awaiting_prereq", "on_hold", "received"];

/** 요청자가 접수 진행 중이던 요청을 스스로 취소한다. (관리자도 취소할 수 있다) */
export async function POST(_request: Request, ctx: RouteContext<"/api/requests/[id]/cancel">) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const { id } = await ctx.params;
  const existing = await getRequest(id);
  if (!existing) {
    return Response.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
  }

  if (existing.requesterId !== user.id && user.role !== "admin") {
    return Response.json({ error: "본인이 접수한 요청만 취소할 수 있습니다." }, { status: 403 });
  }

  if (!CANCELLABLE.includes(existing.status)) {
    return Response.json(
      { error: "이미 처리가 진행된 요청은 취소할 수 없습니다. 영업관리팀에 문의해 주세요." },
      { status: 409 }
    );
  }

  const updated = await updateRequest(id, {
    status: "cancelled",
    pendingFieldId: null,
    botReply: "요청이 취소되었습니다.",
  });

  return Response.json(updated);
}
