"use client";

import { useEffect, useState } from "react";
import type { Faq } from "@/app/lib/faqStore";

export default function FaqManager() {
  const [faqs, setFaqs] = useState<Faq[]>([]);
  const [newQuestion, setNewQuestion] = useState("");
  const [newAnswer, setNewAnswer] = useState("");
  const [editing, setEditing] = useState<Record<string, { question: string; answer: string }>>({});
  const [isSaving, setIsSaving] = useState(false);

  function load() {
    fetch("/api/faqs")
      .then((r) => r.json())
      .then(setFaqs);
  }

  useEffect(load, []);

  async function createFaq() {
    if (!newQuestion.trim() || !newAnswer.trim()) return;
    setIsSaving(true);
    try {
      await fetch("/api/faqs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: newQuestion, answer: newAnswer }),
      });
      setNewQuestion("");
      setNewAnswer("");
      load();
    } finally {
      setIsSaving(false);
    }
  }

  function startEdit(faq: Faq) {
    setEditing((prev) => ({ ...prev, [faq.id]: { question: faq.question, answer: faq.answer } }));
  }

  function cancelEdit(id: string) {
    setEditing((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  async function saveEdit(id: string) {
    const draft = editing[id];
    if (!draft) return;
    setIsSaving(true);
    try {
      await fetch(`/api/faqs/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      cancelEdit(id);
      load();
    } finally {
      setIsSaving(false);
    }
  }

  async function removeFaq(id: string) {
    setIsSaving(true);
    try {
      await fetch(`/api/faqs/${id}`, { method: "DELETE" });
      load();
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/50">
        <p className="mb-2 text-sm font-medium text-slate-700 dark:text-slate-300">새 FAQ 등록</p>
        <div className="flex flex-col gap-2">
          <input
            value={newQuestion}
            onChange={(event) => setNewQuestion(event.target.value)}
            placeholder="질문"
            className="input-field"
          />
          <textarea
            value={newAnswer}
            onChange={(event) => setNewAnswer(event.target.value)}
            placeholder="답변"
            rows={2}
            className="input-field"
          />
          <button
            type="button"
            onClick={createFaq}
            disabled={isSaving || !newQuestion.trim() || !newAnswer.trim()}
            className="btn-primary self-start"
          >
            등록
          </button>
        </div>
      </div>

      <ul className="flex flex-col gap-2">
        {faqs.map((faq) => {
          const draft = editing[faq.id];
          return (
            <li key={faq.id} className="card p-3">
              {draft ? (
                <div className="flex flex-col gap-2">
                  <input
                    value={draft.question}
                    onChange={(event) =>
                      setEditing((prev) => ({
                        ...prev,
                        [faq.id]: { ...prev[faq.id], question: event.target.value },
                      }))
                    }
                    className="input-field"
                  />
                  <textarea
                    value={draft.answer}
                    onChange={(event) =>
                      setEditing((prev) => ({
                        ...prev,
                        [faq.id]: { ...prev[faq.id], answer: event.target.value },
                      }))
                    }
                    rows={2}
                    className="input-field"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => saveEdit(faq.id)}
                      disabled={isSaving}
                      className="btn-primary px-3 py-1.5 text-xs"
                    >
                      저장
                    </button>
                    <button
                      type="button"
                      onClick={() => cancelEdit(faq.id)}
                      className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium dark:border-slate-700"
                    >
                      취소
                    </button>
                  </div>
                </div>
              ) : (
                <div>
                  <p className="text-sm font-medium text-slate-800 dark:text-slate-200">
                    Q. {faq.question}
                  </p>
                  <p className="mt-0.5 text-sm text-slate-600 dark:text-slate-400">A. {faq.answer}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => startEdit(faq)}
                      className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium dark:border-slate-700"
                    >
                      수정
                    </button>
                    <button
                      type="button"
                      onClick={() => removeFaq(faq.id)}
                      disabled={isSaving}
                      className="rounded-lg border border-rose-300 px-3 py-1 text-xs font-medium text-rose-600 disabled:opacity-40 dark:border-rose-800"
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
