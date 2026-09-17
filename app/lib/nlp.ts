import { CATEGORIES, type Subcategory } from "./categories";

export type ClassifyResult = {
  categoryId: string;
  subcategoryId: string;
} | null;

function normalize(text: string): string {
  return text.replace(/\s/g, "").toLowerCase();
}

function countHits(text: string, keywords: string[]): number {
  const normalized = normalize(text);
  return keywords.filter((keyword) => normalized.includes(normalize(keyword))).length;
}

/** "데모"가 들어간 요청은 변경/특이사항 신호가 없으면 신규등록으로 우선 처리한다 (실제 요청 패턴 기준). */
function classifyDemo(message: string): ClassifyResult {
  if (message.includes("특이사항")) return { categoryId: "demo", subcategoryId: "special" };
  // "연장"(기간 연장)도 실무에서는 "변경"과 같은 의미로 자주 쓰인다 (예: "9월1일 회수로 연장 부탁드립니다").
  if (message.includes("변경") || message.includes("연장")) {
    return { categoryId: "demo", subcategoryId: "reschedule" };
  }
  return { categoryId: "demo", subcategoryId: "register" };
}

type CandidateKey = string; // `${categoryId}:${subcategoryId}`

/**
 * 의미가 뚜렷한 단어가 있으면 해당 소분류에 가산점을 준다. 절대 우선(override)이 아니라
 * 가산점만 주는 이유는, "선출고"처럼 곁가지로 언급되는 경우 다른 확실한 신호(예: "납품일정")를
 * 덮어써버리는 회귀가 실제 검증 중 발견됐기 때문이다.
 */
const BOOST_RULES: { test: (message: string) => boolean; key: CandidateKey; weight: number }[] = [
  { test: (m) => m.includes("선출고"), key: "equipment_delivery:pre_ship", weight: 1 },
  { test: (m) => m.includes("인증카드"), key: "shipment:promo", weight: 1 },
  { test: (m) => m.includes("리스") || m.includes("무이자"), key: "settlement:interest_free_lease", weight: 2 },
  // "보상회수"를 붙여 쓰지 않고 "보상 장비 회수"처럼 사이에 다른 말이 끼는 경우가 많아
  // 단순 키워드 포함 검사(countHits)로는 못 잡는다 — 두 단어가 둘 다 있으면 보상회수로 본다.
  { test: (m) => m.includes("보상") && m.includes("회수"), key: "equipment_delivery:recovery", weight: 2 },
  // "변경" 대신 "수정"을 쓰는 경우 — 회수/납품 등 일정 관련 단어와 함께 나올 때만 일정변경으로 본다.
  // (사업자등록증 등 다른 소분류의 "수정"과 겹치지 않도록 범위를 좁혔다.)
  {
    test: (m) => m.includes("수정") && (m.includes("회수") || m.includes("납품") || /\d+일/.test(m)),
    key: "equipment_delivery:reschedule",
    weight: 1,
  },
  // "팁"/"카트리지"가 "주문"과 같이 나오면 사내 출고 요청이 아니라 쇼핑몰에서
  // 돈 주고 구매한 건에 대한 문의일 가능성이 매우 높다 (실무 확인).
  {
    test: (m) => (m.includes("팁") || m.includes("카트리지")) && m.includes("주문"),
    key: "shop:delivery",
    weight: 3,
  },
  // "크레딧"은 요청 자체를 가리키는 말이라 배경 설명으로 쓰이는 일이 거의 없다. 반면 "팁"은
  // "팁이 몇 개 안 남았다"처럼 사유 설명으로 자주 끼어들어 소모품 출고와 동점이 나버린다.
  { test: (m) => m.includes("크레딧") || m.includes("크래딧"), key: "shop:credit", weight: 1 },
  // "파이프드라이브에 등록/거래처 추가"처럼 조사("에")가 끼면 기존 키워드(붙여 쓴 문구)와
  // 매칭이 안 됐다 — 실제로 "파이프드라이브에 등록부탁드립니다"류가 자주 쓰인다.
  {
    test: (m) => m.includes("파이프드라이브") && (m.includes("등록") || m.includes("거래처")),
    key: "pipedrive:vendor_register",
    weight: 2,
  },
];

type Candidate = { categoryId: string; subcategory: Subcategory; hits: number };

function buildScores(message: string): Map<CandidateKey, Candidate> {
  const scores = new Map<CandidateKey, Candidate>();

  for (const category of CATEGORIES) {
    for (const subcategory of category.subcategories) {
      if (!subcategory.keywords || subcategory.keywords.length === 0) continue;
      const hits = countHits(message, subcategory.keywords);
      if (hits > 0) {
        scores.set(`${category.id}:${subcategory.id}`, { categoryId: category.id, subcategory, hits });
      }
    }
  }

  for (const rule of BOOST_RULES) {
    if (!rule.test(message)) continue;
    const existing = scores.get(rule.key);
    if (existing) {
      existing.hits += rule.weight;
    } else {
      const [categoryId, subcategoryId] = rule.key.split(":");
      const category = CATEGORIES.find((c) => c.id === categoryId);
      const subcategory = category?.subcategories.find((s) => s.id === subcategoryId);
      if (category && subcategory) {
        scores.set(rule.key, { categoryId, subcategory, hits: rule.weight });
      }
    }
  }

  return scores;
}

/**
 * 자연어 메시지를 소분류로 분류한다. 확신할 수 없으면 null을 반환해
 * 호출한 쪽이 대분류/소분류를 직접 고르도록 유도한다 (PRD 5번 규칙: 임의로 단정하지 않는다).
 */
export function classifySubcategory(message: string): ClassifyResult {
  // "데모"라는 단어가 없어도 설치+회수가 함께 언급되면 데모 대여 패턴으로 본다 (실제 요청 001번 등).
  // 다만 "보상"(보상 장비 회수)이 같이 나오면 데모가 아니라 장비납품의 보상회수 요청이므로 제외한다.
  if (message.includes("데모")) return classifyDemo(message);
  if (message.includes("설치") && message.includes("회수") && !message.includes("보상")) {
    return classifyDemo(message);
  }

  const candidates = [...buildScores(message).values()].sort((a, b) => b.hits - a.hits);
  if (candidates.length === 0) return null;

  const [top, runnerUp] = candidates;
  if (runnerUp && runnerUp.hits === top.hits) return null; // 동점이면 단정하지 않는다.

  return { categoryId: top.categoryId, subcategoryId: top.subcategory.id };
}

// "및"/"그리고"처럼 서로 다른 요청을 한 메시지에 이어 붙이는 연결어. 이게 있어야만 분리한다 —
// 그냥 여러 키워드가 겹치는 애매한 단일 요청까지 함부로 둘로 쪼개면 안 되기 때문이다.
const MULTI_REQUEST_CONNECTORS = ["및", "그리고", "그리고요", "동시에"];

/**
 * 한 메시지에 서로 다른 대분류의 요청이 연결어로 함께 들어온 경우(예: "파이프드라이브에 거래처
 * 추가 및 sap 등록 부탁드립니다") 요청 두 건으로 분리할 수 있도록 후보를 반환한다.
 * 연결어가 없거나 대분류가 겹치는 애매한 경우는 여기서 다루지 않고 기존 classifySubcategory에 맡긴다.
 */
export function classifyMultipleSubcategories(message: string): NonNullable<ClassifyResult>[] {
  if (!MULTI_REQUEST_CONNECTORS.some((c) => message.includes(c))) return [];
  if (message.includes("데모")) return [];

  const candidates = [...buildScores(message).values()].sort((a, b) => b.hits - a.hits);

  const byCategory = new Map<string, Candidate>();
  for (const candidate of candidates) {
    if (!byCategory.has(candidate.categoryId)) byCategory.set(candidate.categoryId, candidate);
  }
  if (byCategory.size < 2) return [];

  return [...byCategory.values()]
    .slice(0, 2)
    .map((c) => ({ categoryId: c.categoryId, subcategoryId: c.subcategory.id }));
}
