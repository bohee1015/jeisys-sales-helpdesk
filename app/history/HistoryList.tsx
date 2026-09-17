"use client";

import { useEffect, useMemo, useState } from "react";
import RequestDetailModal from "@/app/components/RequestDetailModal";
import RequestExtras from "@/app/components/RequestExtras";
import RequestRow, { RequestRowHeader } from "@/app/components/RequestRow";
import type { HelpdeskRequest } from "@/app/lib/types";

export default function HistoryList({ requesterId }: { requesterId: string }) {
  const [requests, setRequests] = useState<HelpdeskRequest[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/requests")
      .then((r) => r.json())
      .then((all: HelpdeskRequest[]) => {
        if (cancelled) return;
        // 관리자는 전체 요청을 받아오므로, "내 접수 이력"은 본인 것만 다시 걸러서 보여준다.
        setRequests(all.filter((r) => r.requesterId === requesterId));
      });
    return () => {
      cancelled = true;
    };
  }, [requesterId]);

  const selected = useMemo(
    () => requests.find((request) => request.id === selectedId) ?? null,
    [requests, selectedId]
  );

  if (requests.length === 0) {
    return (
      <p className="text-sm text-slate-500 dark:text-slate-400">아직 접수한 요청이 없습니다.</p>
    );
  }

  return (
    <>
      <ul className="flex flex-col gap-1.5">
        <RequestRowHeader />
        {requests.map((request) => (
          <RequestRow key={request.id} request={request} onOpen={() => setSelectedId(request.id)} />
        ))}
      </ul>

      {selected && (
        <RequestDetailModal
          request={selected}
          onClose={() => setSelectedId(null)}
          extra={<RequestExtras request={selected} />}
        />
      )}
    </>
  );
}
