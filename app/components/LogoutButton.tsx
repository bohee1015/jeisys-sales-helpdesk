"use client";

import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase/client";

export default function LogoutButton({ userLabel }: { userLabel: string }) {
  const router = useRouter();

  async function handleLogout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-400">
      <span>{userLabel}</span>
      <button
        type="button"
        onClick={handleLogout}
        className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium hover:border-slate-500 dark:border-slate-700"
      >
        로그아웃
      </button>
    </div>
  );
}
