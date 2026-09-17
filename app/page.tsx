import { redirect } from "next/navigation";
import AppHeader from "@/app/components/AppHeader";
import RequestChat from "@/app/components/RequestChat";
import { getCurrentUser } from "@/app/lib/supabase/session";

export default async function Home() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-10">
      <AppHeader
        title="영업 지원 헬프데스크"
        description="팀즈에 요청하듯 편하게 메시지를 보내면, 자동으로 분류해 영업관리팀에 접수합니다."
        userName={user.name}
        isAdmin={user.role === "admin"}
      />

      <RequestChat />
    </main>
  );
}
