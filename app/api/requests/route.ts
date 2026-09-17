import { listRequests } from "@/app/lib/store";
import { getCurrentUser } from "@/app/lib/supabase/session";

export async function GET() {
  const user = await getCurrentUser();
  if (!user) {
    return Response.json({ error: "로그인이 필요합니다." }, { status: 401 });
  }

  // RLS가 본인 것/관리자 여부에 따라 알아서 걸러주므로 별도 필터링이 필요 없다.
  return Response.json(await listRequests());
}
