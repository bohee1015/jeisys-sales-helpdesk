"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const TABS: { href: string; label: string; adminOnly?: boolean }[] = [
  { href: "/", label: "챗봇 화면" },
  { href: "/faq", label: "FAQ" },
  { href: "/history", label: "접수 이력" },
  { href: "/admin", label: "관리자 화면", adminOnly: true },
  { href: "/dashboard", label: "요청 현황판", adminOnly: true },
];

export default function NavTabs({ isAdmin = false }: { isAdmin?: boolean }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
      {TABS.filter((tab) => isAdmin || !tab.adminOnly).map((tab) => {
        const active = pathname === tab.href;
        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={
              active
                ? "shrink-0 border-b-2 border-primary px-3 py-2 text-sm font-medium text-primary"
                : "shrink-0 border-b-2 border-transparent px-3 py-2 text-sm text-slate-500 transition hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            }
          >
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
