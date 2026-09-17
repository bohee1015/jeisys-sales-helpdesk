import { createClient } from "./server";

export type CurrentUser = {
  id: string;
  email: string;
  name: string;
  role: "admin" | "sales";
  status: string;
};

/**
 * 로그인 여부와 profiles(기존 jeimap 테이블) 정보를 함께 확인한다.
 * 권한 판단은 반드시 getClaims()로 한다 — getSession()은 서명 검증을 하지 않는다.
 */
export async function getCurrentUser(): Promise<CurrentUser | null> {
  const supabase = await createClient();

  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, email, name, role, status")
    .eq("id", userId)
    .single();

  if (!profile || profile.status !== "active") return null;

  return {
    id: profile.id,
    email: profile.email,
    name: profile.name ?? profile.email,
    role: profile.role,
    status: profile.status,
  };
}
