import { redirect } from "next/navigation";
import AppHeader from "@/app/components/AppHeader";
import { buildDashboard } from "@/app/lib/dashboard";
import { listRequests } from "@/app/lib/store";
import { getCurrentUser } from "@/app/lib/supabase/session";
import DashboardView from "./DashboardView";

export const dynamic = "force-dynamic";

export default async function DashboardPage({ searchParams }: PageProps<"/dashboard">) {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const params = await searchParams;
  const month = typeof params.month === "string" ? params.month : undefined;
  const stats = buildDashboard(await listRequests(), month);

  return (
    <main className="mx-auto flex w-full max-w-5xl flex-1 flex-col gap-6 px-5 py-10">
      <AppHeader
        title="요청 현황판"
        description="누가 어떤 업무를 얼마나 요청했는지, 지금 밀린 요청이 무엇인지 한눈에 봅니다."
        userName={user.name}
        isAdmin
      />

      <DashboardView stats={stats} />
    </main>
  );
}
