import { redirect } from "next/navigation";
import AppHeader from "@/app/components/AppHeader";
import { getCurrentUser } from "@/app/lib/supabase/session";
import HistoryList from "./HistoryList";

export default async function HistoryPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-10">
      <AppHeader
        title="접수 이력"
        description="내가 접수한 요청과 처리 상태를 확인합니다. 제목을 누르면 전체 대화를 볼 수 있습니다."
        userName={user.name}
        isAdmin={user.role === "admin"}
      />

      <HistoryList requesterId={user.id} />
    </main>
  );
}
