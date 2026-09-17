"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import RequestDetailModal from "@/app/components/RequestDetailModal";
import RequestExtras from "@/app/components/RequestExtras";
import RequestRow, { RequestRowHeader } from "@/app/components/RequestRow";
import { CATEGORIES } from "@/app/lib/categories";
import {
  ADMIN_STATUSES,
  STATUS_LABEL,
  type AdminStatus,
  type HelpdeskRequest,
} from "@/app/lib/types";

const ALL = "all";
/** 완료처리자 필터에서 "아직 완료 처리되지 않은 요청"을 고르는 값 */
const UNASSIGNED = "__unassigned__";

export default function AdminBoard({ requests }: { requests: HelpdeskRequest[] }) {
  const router = useRouter();
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingId, setSavingId] = useState<string | null>(null);
  const [isSeeding, setIsSeeding] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<string>(ALL);
  const [statusFilter, setStatusFilter] = useState<string>(ALL);
  const [requesterFilter, setRequesterFilter] = useState<string>(ALL);
  const [resolverFilter, setResolverFilter] = useState<string>(ALL);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? null,
    [requests, selectedId]
  );

  const requesters = useMemo(
    () => [...new Set(requests.map((r) => r.requesterName).filter(Boolean))].sort(),
    [requests]
  );

  const resolvers = useMemo(
    () =>
      [...new Set(requests.map((r) => r.resolvedByName).filter((name): name is string => !!name))].sort(),
    [requests]
  );

  const filtered = useMemo(
    () =>
      requests.filter((request) => {
        if (categoryFilter !== ALL && request.categoryId !== categoryFilter) return false;
        if (statusFilter !== ALL && request.status !== statusFilter) return false;
        if (requesterFilter !== ALL && request.requesterName !== requesterFilter) return false;
        if (resolverFilter === UNASSIGNED && request.resolvedByName) return false;
        if (resolverFilter !== ALL && resolverFilter !== UNASSIGNED) {
          if (request.resolvedByName !== resolverFilter) return false;
        }
        return true;
      }),
    [requests, categoryFilter, statusFilter, requesterFilter, resolverFilter]
  );

  const filtersActive =
    categoryFilter !== ALL || statusFilter !== ALL || requesterFilter !== ALL || resolverFilter !== ALL;

  function resetFilters() {
    setCategoryFilter(ALL);
    setStatusFilter(ALL);
    setRequesterFilter(ALL);
    setResolverFilter(ALL);
  }

  async function setStatus(id: string, status: AdminStatus) {
    setSavingId(id);
    try {
      await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  async function submitAnswer(id: string) {
    const supportAnswer = (drafts[id] ?? "").trim();
    if (!supportAnswer) return;

    setSavingId(id);
    try {
      await fetch(`/api/requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ supportAnswer }),
      });
      setDrafts((prev) => ({ ...prev, [id]: "" }));
      router.refresh();
    } finally {
      setSavingId(null);
    }
  }

  async function loadSamples() {
    setIsSeeding(true);
    try {
      await fetch("/api/seed", { method: "POST" });
      router.refresh();
    } finally {
      setIsSeeding(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="card flex flex-col gap-3 p-4">
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
            상태
            <select
              value={statusFilter}
              onChange={(event) => setStatusFilter(event.target.value)}
              className="input-field"
            >
              <option value={ALL}>전체 상태</option>
              {ADMIN_STATUSES.map((status) => (
                <option key={status} value={status}>
                  {STATUS_LABEL[status]}
                </option>
              ))}
              <option value="collecting_info">{STATUS_LABEL.collecting_info}</option>
              <option value="awaiting_prereq">{STATUS_LABEL.awaiting_prereq}</option>
              <option value="on_hold">{STATUS_LABEL.on_hold}</option>
              <option value="cancelled">{STATUS_LABEL.cancelled}</option>
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
            요청자
            <select
              value={requesterFilter}
              onChange={(event) => setRequesterFilter(event.target.value)}
              className="input-field"
            >
              <option value={ALL}>전체 요청자</option>
              {requesters.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
            완료처리자
            <select
              value={resolverFilter}
              onChange={(event) => setResolverFilter(event.target.value)}
              className="input-field"
            >
              <option value={ALL}>전체 완료처리자</option>
              <option value={UNASSIGNED}>미완료 (완료처리자 없음)</option>
              {resolvers.map((name) => (
                <option key={name} value={name}>
                  {name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex flex-col gap-1 text-xs font-medium text-slate-600 dark:text-slate-400">
            카테고리
            <select
              value={categoryFilter}
              onChange={(event) => setCategoryFilter(event.target.value)}
              className="input-field"
            >
              <option value={ALL}>전체 카테고리</option>
              {CATEGORIES.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.label}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            {filtered.length}건 / 전체 {requests.length}건
          </span>
          {filtersActive && (
            <button
              type="button"
              onClick={resetFilters}
              className="rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium transition hover:border-slate-500 dark:border-slate-700"
            >
              필터 초기화
            </button>
          )}
          <button
            type="button"
            onClick={loadSamples}
            disabled={isSeeding}
            className="ml-auto rounded-lg border border-slate-300 px-3 py-1 text-xs font-medium transition hover:border-slate-500 disabled:opacity-50 dark:border-slate-700"
          >
            {isSeeding ? "불러오는 중" : "예시 요청 23건 불러오기"}
          </button>
        </div>
      </div>

      {filtered.length === 0 ? (
        <p className="rounded-xl border border-dashed border-slate-300 p-10 text-center text-sm text-slate-500 dark:border-slate-700">
          해당하는 요청이 없습니다.
        </p>
      ) : (
        <ul className="flex flex-col gap-1.5">
          <RequestRowHeader />
          {filtered.map((request) => (
            <RequestRow key={request.id} request={request} onOpen={() => setSelectedId(request.id)} />
          ))}
        </ul>
      )}

      {selected && (
        <RequestDetailModal
          request={selected}
          onClose={() => setSelectedId(null)}
          extra={<RequestExtras request={selected} />}
          footer={
            <div className="flex flex-col gap-3">
              <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-400">
                처리 상태
                <select
                  value={selected.status}
                  onChange={(event) => setStatus(selected.id, event.target.value as AdminStatus)}
                  disabled={savingId === selected.id}
                  className="input-field py-1.5 text-xs"
                >
                  {/* 챗봇 진행 중이거나 취소된 상태는 선택지가 아니라 현재 상태 표시용으로만 둔다. */}
                  {!ADMIN_STATUSES.some((s) => s === selected.status) && (
                    <option value={selected.status} disabled>
                      {STATUS_LABEL[selected.status]}
                    </option>
                  )}
                  {ADMIN_STATUSES.map((status) => (
                    <option key={status} value={status}>
                      {STATUS_LABEL[status]}
                    </option>
                  ))}
                </select>
              </label>

              {!selected.supportAnswer && (
                <div className="flex gap-2">
                  <input
                    value={drafts[selected.id] ?? ""}
                    onChange={(event) =>
                      setDrafts((prev) => ({ ...prev, [selected.id]: event.target.value }))
                    }
                    placeholder="답변을 입력하세요 (선택)"
                    className="input-field w-full"
                  />
                  <button
                    type="button"
                    onClick={() => submitAnswer(selected.id)}
                    disabled={savingId === selected.id || !(drafts[selected.id] ?? "").trim()}
                    className="btn-primary shrink-0 px-4 py-2"
                  >
                    답변 등록
                  </button>
                </div>
              )}
            </div>
          }
        />
      )}
    </div>
  );
}
