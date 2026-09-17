import { MARKETING_ITEMS, type MarketingItem } from "./marketingItems";
import type { HelpdeskRequest } from "./types";

// 요청 문장에는 정식 명칭 대신 줄임말·영문이 섞여 들어온다 (예: "DS 리플렛", "포텐자 리플릿").
const EQUIPMENT_ALIASES: Record<string, string[]> = {
  덴서티: ["덴서티", "density", "ds hi", "ds", "덴서티하이"],
  리니어지: ["리니어지", "linearz", "lz", "리니어z"],
  트라이빔K: ["트라이빔k", "tri-beam k", "tribeam k", "트라이빔케이"],
  트라이빔프로: ["트라이빔프로", "tri-beam pro", "tribeam pro", "트라이빔 pro"],
  포텐자: ["포텐자", "potenza", "pz"],
};

const PRODUCT_ALIASES: Record<string, string[]> = {
  리플렛: ["리플렛", "리플릿", "leaflet"],
  바인더: ["바인더", "binder"],
  미니배너: ["미니배너", "미니 배너"],
  대형배너: ["대형배너", "큰배너"],
  철제배너: ["철제배너", "철제 배너"],
  명패: ["명패", "네임플레이트"],
  "마킹페이퍼-페이스": ["마킹페이퍼페이스", "마킹지페이스", "페이스마킹"],
  "마킹페이퍼-아이": ["마킹페이퍼아이", "마킹지아이", "아이마킹"],
  "마킹페이퍼-바디": ["마킹페이퍼바디", "마킹지바디", "바디마킹"],
  사용자메뉴얼: ["사용자메뉴얼", "사용자매뉴얼", "메뉴얼", "매뉴얼", "manual"],
  매뉴얼: ["매뉴얼", "메뉴얼", "manual"],
  "코팅 파라미터표": ["파라미터표", "파라미터", "코팅표"],
  아이쉴드: ["아이쉴드", "아이실드", "eyeshield"],
  "미니배너 거치대": ["미니배너거치대", "배너거치대"],
  리플렛거치대: ["리플렛거치대", "리플릿거치대", "카탈로그홀더"],
};

function normalize(text: string): string {
  return text.replace(/\s/g, "").toLowerCase();
}

function matchesAny(normalizedText: string, aliases: string[]): boolean {
  return aliases.some((alias) => normalizedText.includes(normalize(alias)));
}

export type SapSuggestion = {
  item: MarketingItem;
  /** 요청 문장에서 읽어낸 수량 (못 읽으면 null) */
  requestedQty: number | null;
};

/** "리플렛 100장", "명패 2개"처럼 물품명 뒤에 붙은 수량을 읽는다. */
function readQuantity(text: string, productAliases: string[]): number | null {
  for (const alias of productAliases) {
    const index = normalize(text).indexOf(normalize(alias));
    if (index < 0) continue;
    const tail = normalize(text).slice(index, index + normalize(alias).length + 12);
    const matched = tail.match(/(\d[\d,]*)\s*(장|부|개|ea|set|셋트|세트)?/i);
    if (matched) {
      const value = Number(matched[1].replace(/,/g, ""));
      if (Number.isFinite(value) && value > 0) return value;
    }
  }
  return null;
}

/**
 * 요청 내용에서 마케팅 물품을 찾아 SAP 품목코드를 제안한다.
 * 영업관리팀이 SAP에 입력할 때 참고하는 용도이며, 확정이 아니라 후보로만 보여준다.
 */
export function suggestSapItems(request: HelpdeskRequest): SapSuggestion[] {
  const text = [request.originalMessage, ...Object.values(request.fields), request.notes ?? ""].join(
    " "
  );
  const normalized = normalize(text);

  const mentionedEquipment = Object.entries(EQUIPMENT_ALIASES)
    .filter(([, aliases]) => matchesAny(normalized, aliases))
    .map(([equipment]) => equipment);

  const suggestions: SapSuggestion[] = [];

  for (const item of MARKETING_ITEMS) {
    const productAliases = PRODUCT_ALIASES[item.product] ?? [item.product];
    if (!matchesAny(normalized, productAliases)) continue;

    // 장비 전용 물품은 그 장비가 언급됐을 때만, 공용 물품은 항상 후보로 본다.
    if (item.equipment !== "공용" && !mentionedEquipment.includes(item.equipment)) continue;

    suggestions.push({ item, requestedQty: readQuantity(text, productAliases) });
  }

  return suggestions;
}
