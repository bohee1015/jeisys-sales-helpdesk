import { type NextRequest } from "next/server";
import { updateSession } from "@/app/lib/supabase/proxy";

// Next.js 16부터 middleware.ts가 proxy.ts로 바뀌었다 (AGENTS.md 참고).
export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};
