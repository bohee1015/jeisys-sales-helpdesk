import { redirect } from "next/navigation";
import JeisysLogo from "@/app/components/JeisysLogo";
import { getCurrentUser } from "@/app/lib/supabase/session";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const user = await getCurrentUser();
  if (user) redirect("/");

  return (
    <main className="flex min-h-svh w-full flex-col items-center justify-center p-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl shadow-[0_12px_40px_rgba(27,34,51,0.12)] md:grid-cols-2">
        {/* 좌측 브랜드 패널 — 사내 영업지도 서비스 JMAP의 로그인 화면과 같은 구성 */}
        <div className="relative flex min-h-[320px] flex-col justify-between overflow-hidden bg-primary p-9 text-white md:min-h-[480px]">
          <JeisysLogo variant="white" className="h-7" />

          <div className="relative z-10">
            <p className="text-4xl font-extrabold tracking-tight">
              HELP<span className="px-1 text-accent">·</span>DESK
            </p>
            <p className="mt-3 text-sm leading-relaxed text-white/70">
              영업 요청 접수부터 처리 현황까지,
              <br />한 곳에서.
            </p>
          </div>

          <p className="relative z-10 text-xs font-semibold tracking-[0.2em] text-white/50">
            SALES SUPPORT HELPDESK
          </p>

          <span
            aria-hidden="true"
            className="pointer-events-none absolute -bottom-24 -right-20 h-72 w-72 rounded-full border-[36px] border-white/[0.06]"
          />
        </div>

        <div className="flex items-center bg-surface px-9 py-12">
          <LoginForm />
        </div>
      </div>

      <p className="mt-6 text-xs text-slate-400">Crafted by Sales Management Team</p>
    </main>
  );
}
