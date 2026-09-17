"use client";

import { useEffect, useState } from "react";
import type { Faq } from "@/app/lib/faqStore";

export default function FaqSearch() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    fetch("/api/faqs")
      .then((r) => r.json())
      .then(setFaqs);
  }, []);

  const normalized = query.trim().toLowerCase();
  const results = normalized
    ? faqs.filter(
        (faq) =>
          faq.question.toLowerCase().includes(normalized) ||
          faq.answer.toLowerCase().includes(normalized)
      )
    : faqs;

  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 shadow-[0_2px_12px_rgba(0,0,0,0.06)] dark:border-slate-800 dark:bg-slate-900/50">
      <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">자주 묻는 질문</p>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="궁금한 내용을 검색해 보세요 (예: 리드타임, 기안 승인)"
        className="input-field w-full"
      />

      {results.length === 0 ? (
        <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
          {normalized ? "검색 결과가 없습니다." : "등록된 FAQ가 없습니다."}
        </p>
      ) : (
        <ul className="mt-3 flex flex-col gap-3">
          {results.map((faq) => (
            <li key={faq.id}>
              <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                Q. {faq.question}
              </p>
              <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">A. {faq.answer}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
