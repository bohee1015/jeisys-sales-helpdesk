import { redirect } from "next/navigation";
import AppHeader from "@/app/components/AppHeader";
import { listRequests } from "@/app/lib/store";
import { getCurrentUser } from "@/app/lib/supabase/session";
import { STATUS_LABEL } from "@/app/lib/types";
import AdminTabs from "./AdminTabs";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/");

  const requests = await listRequests();
  const countOf = (status: string) => requests.filter((request) => request.status === status).length;
  const summary =
    `전체 ${requests.length}건 · ${STATUS_LABEL.received} ${countOf("received")}건 · ` +
    `${STATUS_LABEL.in_progress} ${countOf("in_progress")}건 · ` +
    `${STATUS_LABEL.resolved} ${countOf("resolved")}건`;

  return (
    <main className="mx-auto flex w-full max-w-3xl flex-1 flex-col gap-6 px-5 py-10">
      <AppHeader title="관리자 화면 (영업관리팀)" description={summary} userName={user.name} isAdmin />

      <AdminTabs requests={requests} />
    </main>
  );
}
