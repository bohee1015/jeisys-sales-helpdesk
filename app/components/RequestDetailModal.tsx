"use client";

import { useEffect, type ReactNode } from "react";
import { findSubcategory } from "@/app/lib/categories";
import { STATUS_LABEL, type HelpdeskRequest } from "@/app/lib/types";
import { STATUS_STYLE, hospitalNameOf } from "./RequestRow";

function formatTime(iso: string): string {
  return new Date(iso).toLocaleString("ko-KR", { dateStyle: "short", timeStyle: "short" });
}

function SummaryRow({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div className="flex gap-2 text-sm">
      <dt className="w-[92px] shrink-0 text-slate-500 dark:text-slate-400">{label}</dt>
      <dd className="min-w-0 flex-1 font-medium text-slate-900 dark:text-slate-100">{value}</dd>
    </div>
  );
}

/**
 * 요청 상세 팝업. 넓은 화면에서는 왼쪽에 요약, 오른쪽에 원문(전체 대화)을 나란히 보여준다.
 * 관리자 조작(상태 변경·답변 등록)은 footer로 받아, 접수 이력 화면에서는 읽기 전용이 된다.
 */
export default function RequestDetailModal({
  request,
  onClose,
  footer,
  extra,
}: {
  request: HelpdeskRequest;
  onClose: () => void;
  footer?: ReactNode;
  extra?: ReactNode;
}) {
  useEffect(() => {
    function onKey(event: KeyboardEvent) {
      if (event.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const found = findSubcategory(request.categoryId, request.subcategoryId);
  const labelOf = (fieldId: string) =>
    found?.subcategory.fields.find((f) => f.id === fieldId)?.label ?? fieldId;
  const fieldEntries = Object.entries(request.fields).filter(([, value]) => value);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 p-4"
      onClick={onClose}
      role="presentation"
    >
      <div
        className="flex max-h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-surface shadow-[0_20px_60px_rgba(15,23,42,0.25)]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="요청 상세"
      >
        <div className="flex items-center gap-2 border-b border-slate-100 px-5 py-3.5 dark:border-slate-800">
          <span
            className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${STATUS_STYLE[request.status]}`}
          >
            {STATUS_LABEL[request.status]}
          </span>
          <span className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">
            {hospitalNameOf(request)}
          </span>
          <span className="truncate text-xs text-slate-500 dark:text-slate-400">
            {request.categoryLabel} / {request.subcategoryLabel}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="닫기"
            className="ml-auto rounded-lg px-2 py-1 text-slate-400 transition hover:bg-tertiary hover:text-slate-700"
          >
            ✕
          </button>
        </div>

        <div className="grid min-h-0 flex-1 grid-cols-1 overflow-hidden md:grid-cols-2">
          <section className="min-h-0 overflow-y-auto border-b border-slate-100 px-5 py-4 dark:border-slate-800 md:border-b-0 md:border-r">
            <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate-400">요약</h3>

            <dl className="flex flex-col gap-1.5">
              <SummaryRow label="요청자" value={request.requesterName || "-"} />
              <SummaryRow label="접수일시" value={formatTime(request.createdAt)} />
              {request.resolvedByName && (
                <SummaryRow
                  label="완료처리자"
                  value={`${request.resolvedByName}${request.resolvedAt ? ` · ${formatTime(request.resolvedAt)}` : ""}`}
                />
              )}
              {fieldEntries.map(([id, value]) => (
                <SummaryRow key={id} label={labelOf(id)} value={value} />
              ))}
              {request.notes && <SummaryRow label="비고" value={request.notes} />}
              {request.hasPersonalInfo && (
                <SummaryRow
                  label="개인정보"
                  value={<span className="text-purple-700">포함된 요청입니다</span>}
                />
              )}
              {request.prerequisiteConfirmed === false && (
                <SummaryRow
                  label="선행 업무"
                  value={<span className="text-rose-600">미완료로 처리 보류됨</span>}
                />
              )}
            </dl>

            {extra}

            {request.supportAnswer && (
              <div className="mt-4 rounded-lg bg-tertiary px-3 py-2.5">
                <p className="text-xs font-semibold text-primary">담당자 답변</p>
                <p className="mt-1 whitespace-pre-wrap text-sm text-slate-800 dark:text-slate-100">
                  {request.supportAnswer}
                </p>
              </div>
            )}

            {footer && <div className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800">{footer}</div>}
          </section>

          <section className="min-h-0 overflow-y-auto bg-background/60 px-5 py-4">
            <h3 className="mb-3 text-xs font-semibold tracking-wide text-slate-400">
              원문 (전체 대화)
            </h3>
            <ul className="flex flex-col gap-2">
              {request.transcript.map((chatTurn, index) => (
                <li
                  key={index}
                  className={chatTurn.role === "user" ? "flex justify-end" : "flex justify-start"}
                >
                  <div
                    className={
                      chatTurn.role === "user"
                        ? "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-sm bg-primary/10 px-3 py-2 text-xs text-slate-800 dark:bg-primary/20 dark:text-slate-100"
                        : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-sm border border-slate-200/70 bg-surface px-3 py-2 text-xs text-slate-700 dark:border-slate-700 dark:text-slate-200"
                    }
                  >
                    {chatTurn.text}
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
