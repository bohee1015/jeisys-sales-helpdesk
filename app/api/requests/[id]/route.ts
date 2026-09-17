import { updateRequest } from "@/app/lib/store";
import { getCurrentUser } from "@/app/lib/supabase/session";
import { isAdminStatus, type HelpdeskRequest } from "@/app/lib/types";

/** 완료 처리 시에는 누가 완료했는지를 함께 남기고, 완료를 되돌리면 그 기록을 지운다. */
function resolverPatch(
  status: string,
  user: { id: string; name: string }
): Partial<HelpdeskRequest> {
  if (status !== "resolved") {
    return { resolvedById: null, resolvedByName: null, resolvedAt: null };
  }
  return { resolvedById: user.id, resolvedByName: user.name, resolvedAt: new Date().toISOString() };
}

/** 영업관리팀(관리자)이 답변을 등록하거나 처리 상태를 직접 바꾼다. */
export async function PATCH(request: Request, ctx: RouteContext<"/api/requests/[id]">) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return Response.json({ error: "관리자만 처리할 수 있습니다." }, { status: 403 });
  }

  const { id } = await ctx.params;
  const body = await request.json();

  if (body.status !== undefined) {
    if (!isAdminStatus(body.status)) {
      return Response.json({ error: "지정할 수 없는 상태입니다." }, { status: 400 });
    }
    const updated = await updateRequest(id, {
      status: body.status,
      ...resolverPatch(body.status, user),
    });
    if (!updated) {
      return Response.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
    }
    return Response.json(updated);
  }

  const supportAnswer = typeof body.supportAnswer === "string" ? body.supportAnswer.trim() : "";
  if (!supportAnswer) {
    return Response.json({ error: "답변 내용을 입력해 주세요." }, { status: 400 });
  }

  const updated = await updateRequest(id, {
    supportAnswer,
    status: "resolved",
    ...resolverPatch("resolved", user),
  });
  if (!updated) {
    return Response.json({ error: "요청을 찾을 수 없습니다." }, { status: 404 });
  }

  return Response.json(updated);
}
