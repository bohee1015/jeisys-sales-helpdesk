"use client";

import { suggestSapItems } from "@/app/lib/sapItems";
import type { HelpdeskRequest } from "@/app/lib/types";

/**
 * 요청 상세 팝업에 붙는 보조 정보.
 * - 마케팅 물품 요청이면 SAP 입력에 참고할 품목코드를 제안한다.
 * - 무이자리스 신청이면 사내 견적서 양식을 채운 엑셀을 내려받게 한다.
 */
export default function RequestExtras({ request }: { request: HelpdeskRequest }) {
  const suggestions = suggestSapItems(request);
  const isLease = request.subcategoryId === "interest_free_lease";

  if (suggestions.length === 0 && !isLease) return null;

  return (
    <div className="mt-4 flex flex-col gap-3">
      {suggestions.length > 0 && (
        <div className="rounded-lg border-l-[3px] border-accent bg-accent/[0.06] px-3.5 py-2.5">
          <p className="text-xs font-semibold text-slate-700 dark:text-slate-200">
            SAP 참고 품목코드
          </p>
          <ul className="mt-1.5 flex flex-col gap-1.5">
            {suggestions.map(({ item, requestedQty }) => (
              <li key={item.code} className="text-xs text-slate-600 dark:text-slate-300">
                <span className="font-mono font-semibold text-slate-900 dark:text-slate-100">
                  {item.code}
                </span>{" "}
                · {item.equipment} {item.product}
                {requestedQty && <span className="text-slate-500"> · 요청 {requestedQty}</span>}
                <span className="block text-[11px] text-slate-400">
                  {item.itemName}
                  {item.unitQty ? ` · 단위 ${item.unitQty}` : ""}
                  {item.max ? ` · 최대 ${item.max}` : ""}
                </span>
              </li>
            ))}
          </ul>
          <p className="mt-1.5 text-[11px] text-slate-400">
            요청 문구에서 찾은 후보입니다. SAP 입력 전에 품목명을 한 번 확인해 주세요.
          </p>
        </div>
      )}

      {isLease && (
        <a
          href={`/api/requests/${request.id}/lease-quote`}
          className="btn-primary inline-flex w-fit items-center gap-1.5 px-3.5 py-2 text-xs"
        >
          무이자리스 견적서 내려받기
        </a>
      )}
    </div>
  );
}
