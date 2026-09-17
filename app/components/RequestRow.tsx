"use client";

import { STATUS_LABEL, type HelpdeskRequest, type RequestStatus } from "@/app/lib/types";

export const STATUS_STYLE: Record<RequestStatus, string> = {
  collecting_info: "bg-orange-100 text-orange-800",
  awaiting_prereq: "bg-amber-100 text-amber-800",
  on_hold: "bg-rose-100 text-rose-800",
  received: "bg-sky-100 text-sky-800",
  in_progress: "bg-primary/10 text-primary",
  resolved: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-100 text-slate-500",
};

/** 요청에서 병원명(거래처명)을 꺼낸다. 소분류마다 필드가 달라 없을 수도 있다. */
export function hospitalNameOf(request: HelpdeskRequest): string {
  return request.fields.clientName || request.fields.vendorName || "-";
}

/**
 * 목록의 한 줄. 처리상태 / 카테고리 / 병원명 / 요청자 / 완료처리자 순서로 보여주고,
 * 누르면 상세 팝업을 연다.
 */
export default function RequestRow({
  request,
  onOpen,
}: {
  request: HelpdeskRequest;
  onOpen: () => void;
}) {
  return (
    <li>
      <button
        type="button"
        onClick={onOpen}
        className="card flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-4 py-3 text-left text-sm transition hover:border-primary/40 hover:shadow-[0_4px_16px_rgba(31,58,147,0.08)] sm:flex-nowrap"
      >
        <span
          className={`w-[68px] shrink-0 rounded-full px-2 py-0.5 text-center text-xs font-medium ${STATUS_STYLE[request.status]}`}
        >
          {STATUS_LABEL[request.status]}
        </span>

        <span className="w-[150px] shrink-0 truncate text-xs text-slate-500 dark:text-slate-400">
          {request.categoryLabel} / {request.subcategoryLabel}
        </span>

        <span className="min-w-0 flex-1 truncate font-medium text-slate-900 dark:text-slate-100">
          {hospitalNameOf(request)}
        </span>

        <span className="w-[80px] shrink-0 truncate text-xs text-slate-500 dark:text-slate-400">
          {request.requesterName || "-"}
        </span>

        <span className="w-[90px] shrink-0 truncate text-xs text-slate-500 dark:text-slate-400">
          {request.resolvedByName || "-"}
        </span>
      </button>
    </li>
  );
}

/** 목록 상단에 붙는 열 이름. 한 줄 구성과 폭을 맞춘다. */
export function RequestRowHeader() {
  return (
    <li className="hidden gap-x-3 px-4 pb-1 text-xs font-medium text-slate-400 sm:flex">
      <span className="w-[68px] shrink-0 text-center">상태</span>
      <span className="w-[150px] shrink-0">카테고리</span>
      <span className="min-w-0 flex-1">병원명</span>
      <span className="w-[80px] shrink-0">요청자</span>
      <span className="w-[90px] shrink-0">완료처리자</span>
    </li>
  );
}
