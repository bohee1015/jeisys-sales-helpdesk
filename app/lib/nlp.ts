import { CATEGORIES, type Subcategory } from "./categories";

export type ClassifyResult = {
  categoryId: string;
  subcategoryId: string;
} | null;

export type ScoredCandidate = {
  key: string; // `${categoryId}:${subcategoryId}`
  categoryId: string;
  subcategory: Subcategory;
  score: number;
  /** 어떤 키워드·패턴이 걸렸는지 (디버깅·회귀 테스트용) */
  matched: string[];
};

export type ClassifyDetailed =
  | { kind: "subcategory"; categoryId: string; subcategoryId: string; scores: ScoredCandidate[] }
  | { kind: "category"; categoryId: string; scores: ScoredCandidate[] }
  | { kind: "none"; scores: ScoredCandidate[] };

/** 공백을 지우고 소문자로. 키워드·패턴은 모두 이 형태를 기준으로 쓴다. */
export function normalize(text: string): string {
  return text.replace(/\s/g, "").toLowerCase();
}

function scoreSubcategory(normalized: string, subcategory: Subcategory): { score: number; matched: string[] } {
  const hits = [...new Set((subcategory.keywords ?? []).map(normalize))].filter((k) => normalized.includes(k));
  // "명세서"와 "거래명세서"가 둘 다 걸리면 긴 것 하나만 센다 — 표기 변형을 늘려도 점수가 부풀지 않게.
  const kept = hits.filter((k) => !hits.some((other) => other !== k && other.includes(k)));

  let score = kept.length;
  const matched = [...kept];

  for (const signal of subcategory.signals ?? []) {
    if (!signal.pattern.test(normalized)) continue;
    if (signal.unless && signal.unless.test(normalized)) continue;
    score += signal.weight;
    matched.push(`${signal.pattern.source}(+${signal.weight})`);
  }

  return { score, matched };
}

/** 모든 소분류의 점수를 매겨 높은 순으로 돌려준다. 0점은 뺀다. */
export function scoreAll(message: string): ScoredCandidate[] {
  const normalized = normalize(message);
  const candidates: ScoredCandidate[] = [];

  for (const category of CATEGORIES) {
    for (const subcategory of category.subcategories) {
      const { score, matched } = scoreSubcategory(normalized, subcategory);
      if (score > 0) {
        candidates.push({
          key: `${category.id}:${subcategory.id}`,
          categoryId: category.id,
          subcategory,
          score,
          matched,
        });
      }
    }
  }

  return candidates.sort((a, b) => b.score - a.score);
}

/** 소분류는 몰라도 대분류만은 분명한 경우를 찾는다. 단서가 하나의 대분류만 가리킬 때만 답한다. */
function anchoredCategory(normalized: string): string | null {
  const hits = CATEGORIES.filter((c) => c.anchor?.test(normalized)).map((c) => c.id);
  return hits.length === 1 ? hits[0] : null;
}

/**
 * 자연어 메시지를 분류한다.
 * - 1등이 단독이면 그 소분류
 * - 1·2등이 같은 대분류에서 동점이면 대분류만 (요청자가 소분류만 고른다)
 * - 후보가 없거나 서로 다른 대분류가 동점이면 단정하지 않는다 (PRD 5번: 애매하면 임의로 단정하지 않는다)
 */
export function classifyDetailed(message: string): ClassifyDetailed {
  const normalized = normalize(message);
  const scores = scoreAll(message);

  if (scores.length === 0) {
    const category = anchoredCategory(normalized);
    return category ? { kind: "category", categoryId: category, scores } : { kind: "none", scores };
  }

  const [top, runnerUp] = scores;
  if (runnerUp && runnerUp.score === top.score) {
    if (runnerUp.categoryId === top.categoryId) {
      return { kind: "category", categoryId: top.categoryId, scores };
    }
    return { kind: "none", scores };
  }

  return { kind: "subcategory", categoryId: top.categoryId, subcategoryId: top.subcategory.id, scores };
}

export function classifySubcategory(message: string): ClassifyResult {
  const result = classifyDetailed(message);
  return result.kind === "subcategory"
    ? { categoryId: result.categoryId, subcategoryId: result.subcategoryId }
    : null;
}

/** 소분류는 못 정했지만 대분류는 분명할 때 그 대분류 id. 아니면 null. */
export function suggestCategory(message: string): string | null {
  const result = classifyDetailed(message);
  return result.kind === "category" ? result.categoryId : null;
}

// "및"/"그리고"처럼 서로 다른 요청을 한 메시지에 이어 붙이는 연결어. 이게 있어야만 분리한다 —
// 그냥 여러 키워드가 겹치는 애매한 단일 요청까지 함부로 둘로 쪼개면 안 되기 때문이다.
const MULTI_REQUEST_CONNECTORS = ["및", "그리고", "그리고요", "동시에"];
// 곁가지 단서(1점) 하나로는 다른 업무로 보지 않는다. 이 점수 이상인 대분류가 둘일 때만 나눈다.
const MULTI_REQUEST_MIN_SCORE = 2;

/**
 * 한 메시지에 서로 다른 대분류의 요청이 연결어로 함께 들어온 경우(예: "파이프드라이브에 거래처
 * 추가 및 sap 등록 부탁드립니다") 요청 두 건으로 분리할 수 있도록 후보를 반환한다.
 * 연결어가 없거나 대분류가 하나뿐이면 빈 배열을 돌려주고 일반 분류에 맡긴다.
 */
export function classifyMultipleSubcategories(message: string): NonNullable<ClassifyResult>[] {
  if (!MULTI_REQUEST_CONNECTORS.some((c) => message.includes(c))) return [];
  if (message.includes("데모")) return [];

  const byCategory = new Map<string, ScoredCandidate>();
  for (const candidate of scoreAll(message)) {
    if (candidate.score < MULTI_REQUEST_MIN_SCORE) continue;
    if (!byCategory.has(candidate.categoryId)) byCategory.set(candidate.categoryId, candidate);
  }
  if (byCategory.size < 2) return [];

  return [...byCategory.values()]
    .slice(0, 2)
    .map((c) => ({ categoryId: c.categoryId, subcategoryId: c.subcategory.id }));
}
