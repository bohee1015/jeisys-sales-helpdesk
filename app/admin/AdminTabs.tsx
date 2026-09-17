"use client";

import { useState } from "react";
import type { HelpdeskRequest } from "@/app/lib/types";
import AdminBoard from "./AdminBoard";
import FaqManager from "./FaqManager";

type AdminTab = "requests" | "faq";

const TABS: { id: AdminTab; label: string }[] = [
  { id: "requests", label: "요청접수관리" },
  { id: "faq", label: "FAQ 관리" },
];

export default function AdminTabs({ requests }: { requests: HelpdeskRequest[] }) {
  const [tab, setTab] = useState<AdminTab>("requests");

  return (
    <div className="flex flex-col gap-4">
      <div className="flex gap-1.5">
        {TABS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setTab(item.id)}
            className={
              tab === item.id
                ? "rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white"
                : "rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 transition hover:border-slate-500 dark:border-slate-700 dark:text-slate-300"
            }
          >
            {item.label}
          </button>
        ))}
      </div>

      {tab === "requests" ? <AdminBoard requests={requests} /> : <FaqManager />}
    </div>
  );
}
