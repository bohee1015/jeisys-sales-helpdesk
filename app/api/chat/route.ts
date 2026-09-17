import { handleChatMessage } from "@/app/lib/helpdesk";
import { getCurrentUser } from "@/app/lib/supabase/session";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  const body = await request.json();
  const message = typeof body.message === "string" ? body.message : "";
  if (!message.trim()) {
    return Response.json({ error: "메시지를 입력해 주세요." }, { status: 400 });
  }

  // requesterId/requesterName은 클라이언트 값이 아니라 로그인 세션에서 가져온다 (스푸핑 방지).
  const result = await handleChatMessage({
    requesterId: user.id,
    requesterName: user.name,
    message,
    requestId: typeof body.requestId === "string" ? body.requestId : null,
    categoryId: typeof body.categoryId === "string" ? body.categoryId : null,
    subcategoryId: typeof body.subcategoryId === "string" ? body.subcategoryId : null,
    originalMessage: typeof body.originalMessage === "string" ? body.originalMessage : null,
  });

  return Response.json(result);
}
