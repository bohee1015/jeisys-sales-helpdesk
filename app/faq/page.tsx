import { redirect } from "next/navigation";
import AppHeader from "@/app/components/AppHeader";
import FaqSearch from "@/app/components/FaqSearch";
import { getCurrentUser } from "@/app/lib/supabase/session";

export default async function FaqPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-10">
      <AppHeader
        title="자주 묻는 질문"
        description="문의 전에 먼저 검색해 보세요."
        userName={user.name}
        isAdmin={user.role === "admin"}
      />

      <FaqSearch />
    </main>
  );
}
