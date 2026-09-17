import { createHelpdeskRequest } from "@/app/lib/helpdesk";
import { SAMPLE_REQUESTS } from "@/app/lib/samples";
import { getCurrentUser } from "@/app/lib/supabase/session";

/** 실제 요청 23건을 구조화된 형태로 한 번에 접수시켜 분류 체계를 확인한다 (관리자 전용 개발용 버튼). */
export async function POST() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }
  if (user.role !== "admin") {
    return Response.json({ error: "관리자만 사용할 수 있습니다." }, { status: 403 });
  }

  for (const input of SAMPLE_REQUESTS) {
    await createHelpdeskRequest({ ...input, requesterId: user.id });
  }

  return Response.json({ created: SAMPLE_REQUESTS.length });
}
