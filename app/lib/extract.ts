// 자연어 문장에서 필수값을 최대한 추출하는 규칙 기반 로직. LLM 없이 정규식/키워드로 처리하므로
// 완벽하지 않다 — 못 찾으면 null을 반환해 챗봇이 다시 물어보게 한다.

import { CATEGORIES } from "./categories";

const CLINIC_SUFFIX = /[\p{L}0-9]{1,6}(?:의원|병원|피부과|외과|내과|한의원|클리닉)/u;

// 장비(대수로 세는 것)와 그 외 품목(개·부로 세는 것)
const EQUIPMENT_KEYWORDS = ["덴서티", "포텐자", "리니어지", "볼뉴머", "트라이빔", "느와르", "누아르"];

// 긴 이름을 앞에 둔다 — "미니배너"가 "배너"보다 먼저 잡혀야 한다.
const PRODUCT_KEYWORDS = [
  ...EQUIPMENT_KEYWORDS,
  "알파팁",
  "리플릿거치대",
  "리플렛거치대",
  "미니배너거치대",
  "배너거치대",
  "미니배너",
  "마킹페이퍼",
  "인증카드",
  "카트리지",
  "리플릿",
  "리플렛",
  "바인더",
  "배너",
  "명패",
  "거치대",
];

// "덴서티"/"리니어지" 등 기본 장비명 뒤에 모델명(하이, 누아르, 느와르 등)이나
// "팁"/"카트리지"(쇼핑몰 주문 품목)가 붙어야 실제 품목을 식별할 수 있는 경우가 많아
// 붙어 있으면 함께 잡는다.
const PRODUCT_VARIANTS = ["하이", "누아르", "느와르", "베이직", "코어", "컨투어", "팁", "카트리지"];

const KOREAN_NUMERALS: Record<string, number> = { 한: 1, 하나: 1, 두: 2, 세: 3, 네: 4, 다섯: 5 };

// 병원명 뒤에 오는 단어를 지점명으로 볼지 판단할 때 제외하는 말들.
// 분류 키워드는 categories.ts에서 자동으로 가져오므로 키워드를 추가해도 여기를 같이 고칠 필요가 없다.
const REQUEST_WORDS = [
  "등록", "설치", "회수", "요청", "부탁", "확인", "문의", "출고", "발송", "변경", "수정", "취소",
  "잡아", "보내", "빼", "넣어", "올려", "견적", "계약", "납품", "주문", "보상", "팁", "장비",
  "원장", "원장님", "수수료", "채권", "리스", "데모", "판촉물", "소모품", "크레딧", "크래딧",
  "무이자", "확보", "재고", "기안", "기안완료", "계산서", "포텐자", "덴서티", "리플릿", "리플렛",
];

const KEYWORD_FIRST_TOKENS = CATEGORIES.flatMap((c) =>
  c.subcategories.flatMap((s) => (s.keywords ?? []).map((k) => k.split(/\s+/)[0]))
);

const BRANCH_STOPWORDS = new Set([...REQUEST_WORDS, ...PRODUCT_KEYWORDS, ...KEYWORD_FIRST_TOKENS]);

/** 지점명처럼 보이는 단어인지 — "용인", "검단점", "성남신흥점" 같은 짧은 지명이나 행정구역 접미어. */
function looksLikeBranch(token: string): boolean {
  return /(점|동|구|시|군|읍|면|역|지점|본점)$/u.test(token) || token.length <= 3;
}

/** 거래처명(병원명)을 추출한다. 병원 접미어 뒤 짧은 지점명(예: "용인", "검단점")까지 함께 잡는다. */
export function extractClientName(message: string): string | null {
  const match = message.match(CLINIC_SUFFIX);
  if (!match) return null;

  const clinic = match[0];
  const afterIndex = (match.index ?? 0) + clinic.length;
  const rest = message.slice(afterIndex);
  // 지점명은 병원명과 같은 줄에, 공백만 사이에 두고 붙는 한글 단어라고 가정한다 (줄바꿈 전까지만 허용).
  const nextTokenMatch = rest.match(/^[ \t]+([\p{L}]{1,6})/u);
  const nextToken = nextTokenMatch?.[1];
  // "한빛의원 김철수 원장님"처럼 뒤 단어 다음에 "원장"이 오면 지점명이 아니라 원장님 성함이다.
  const isDirectorName =
    nextTokenMatch !== null &&
    (nextToken?.includes("원장") || /^\s?원장/u.test(rest.slice(nextTokenMatch[0].length)));

  if (nextToken && looksLikeBranch(nextToken) && !BRANCH_STOPWORDS.has(nextToken) && !isDirectorName) {
    return `${clinic} ${nextToken}`;
  }
  return clinic;
}

export function extractPhone(message: string): string | null {
  const match = message.match(/01[016-9][-\s.]?\d{3,4}[-\s.]?\d{4}/);
  return match ? match[0].replace(/[\s.]/g, "-") : null;
}

export function extractAmount(message: string): string | null {
  const match = message.match(/\d[\d,]*\s*(만원|억원|억|원)/);
  return match ? match[0] : null;
}

export function extractPercent(message: string): string | null {
  const match = message.match(/\d+(\.\d+)?\s*%/);
  return match ? match[0] : null;
}

// "OO캐피탈"처럼 풀네임이 없어도 실무에서는 은행/캐피탈사 약칭만 단독으로 쓰는 경우가 많다
// (예: "NH 선불조건 리스실행 요청드립니다"). 이 경우 빈 값으로 되묻지 않도록 알려진 약칭도 인식한다.
const KNOWN_CAPITAL_COMPANIES = [
  "NH", "KB", "신한", "하나", "우리", "IBK", "삼성", "롯데", "현대커머셜", "현대",
  "DGB", "BNK", "메리츠", "JB", "다올", "산은",
];

export function extractLeasingCompany(message: string): string | null {
  const explicit = message.match(/[\p{L}]{1,6}캐피탈/u);
  if (explicit) return explicit[0];

  for (const name of KNOWN_CAPITAL_COMPANIES) {
    const boundary = new RegExp(`(?:^|[\\s(])${name}(?=[\\s)]|$)`, "u");
    if (boundary.test(message)) return name;
  }
  return null;
}

// "우리병원 원장님", "담당 원장님"처럼 원장 앞에 이름이 아닌 말이 오는 경우가 있어 걸러낸다.
const NOT_A_PERSON_NAME = /(의원|병원|피부과|외과|내과|클리닉)$|^(우리|저희|담당|대표|해당|병원)$/u;

export function extractDirectorName(message: string): string | null {
  for (const match of message.matchAll(/([\p{L}]{2,4})\s?원장(?:님)?/gu)) {
    if (!NOT_A_PERSON_NAME.test(match[1])) return match[1];
  }
  return null;
}

type ProductHit = { index: number; keyword: string };

function findProductHits(message: string): ProductHit[] {
  const hits: ProductHit[] = [];
  for (const keyword of PRODUCT_KEYWORDS) {
    let from = 0;
    while (true) {
      const index = message.indexOf(keyword, from);
      if (index === -1) break;
      hits.push({ index, keyword });
      from = index + keyword.length;
    }
  }
  // 같은 자리에서 시작하면 긴 이름("미니배너")이 짧은 이름("배너")보다 먼저 오게 한다.
  return hits.sort((a, b) => a.index - b.index || b.keyword.length - a.keyword.length);
}

/** 품목 뒤 12글자 안의 수량. "10부", "1대"는 물론 "한 대", "하나"도 읽는다. */
function readQuantity(window: string, isEquipment: boolean): { text: string; length: number } | null {
  const digits = window.match(/(\d+)\s*(개|부|대|장|매|세트|박스|ea)/i);
  if (digits) return { text: `${digits[1]}${digits[2]}`, length: (digits.index ?? 0) + digits[0].length };

  const numeral = window.match(/(한|하나|두|세|네|다섯)\s*(대|개|부|장)?/u);
  if (numeral && (numeral[2] || numeral[1] === "하나")) {
    const unit = numeral[2] ?? (isEquipment ? "대" : "개");
    return { text: `${KOREAN_NUMERALS[numeral[1]]}${unit}`, length: (numeral.index ?? 0) + numeral[0].length };
  }
  return null;
}

/**
 * 품목명(+모델명, 가능하면 수량)을 추출한다. 여러 품목이 나오면 등장 순서대로 ", "로 잇는다
 * (예: "리플릿 10부, 배너 1개").
 */
export function extractProductPhrase(message: string): string | null {
  const phrases: string[] = [];
  let consumedUntil = -1;

  for (const hit of findProductHits(message)) {
    if (hit.index < consumedUntil) continue;

    let phrase = hit.keyword;
    let cursor = hit.index + hit.keyword.length;

    const variantMatch = message.slice(cursor, cursor + 6).match(/^\s*([\p{L}]{1,4})/u);
    if (variantMatch && PRODUCT_VARIANTS.includes(variantMatch[1])) {
      phrase += ` ${variantMatch[1]}`;
      cursor += variantMatch[0].length;
    }

    const quantity = readQuantity(message.slice(cursor, cursor + 12), EQUIPMENT_KEYWORDS.includes(hit.keyword));
    if (quantity) {
      phrase += ` ${quantity.text}`;
      cursor += quantity.length;
    }

    phrases.push(phrase);
    consumedUntil = cursor;
  }

  return phrases.length > 0 ? phrases.join(", ") : null;
}

/**
 * 주소를 추출한다. 병원명 뒤 괄호 안에 주소가 오는 경우가 가장 흔하다
 * (예: "가람클리닉(경기 가나시 다라구 마바대로 123 (사아동, 자차빌딩))" — 괄호가 중첩될 수 있다).
 */
export function extractAddress(message: string): string | null {
  const parenMatch = message.match(/\(([^()]*(?:\([^()]*\))?[^()]*)\)/);
  if (parenMatch && parenMatch[1].length > 5 && /[시도군구로길동]/.test(parenMatch[1])) {
    return parenMatch[1].trim();
  }

  const inline = message.match(/[가-힣]+(?:시|도)\s?[가-힣]+(?:시|군|구)[^,\n(){}]{0,30}(?:로|길)\s?\d+[^,\n(){}]{0,20}/);
  return inline ? inline[0].trim() : null;
}

export function extractDeliveryMethod(message: string): string | null {
  if (message.includes("택배")) return "택배";
  if (message.includes("퀵")) return "퀵";
  if (/직접\s*수령|직접\s*전달|방문\s*수령/.test(message)) return "직접수령";
  return null;
}

export function extractRecipient(message: string, clientNameFound: boolean): string | null {
  if (message.includes("공덕") || message.includes("사무실")) return "공덕";
  if (clientNameFound) return "병원";
  return null;
}

export function extractShipPurpose(message: string): string | null {
  if (message.includes("데모")) return "추가데모팁";
  if (message.includes("임상")) return "임상";
  if (message.includes("마케팅")) return "마케팅";
  return null;
}

export function extractRegistrationType(message: string): string | null {
  // 실무에서는 "변경" 대신 "수정"이라고 쓰는 경우가 많다 (예: "sap한빛의원 수정 부탁드립니다").
  if (message.includes("변경") || message.includes("수정")) return "변경";
  if (message.includes("등록")) return "등록";
  return null;
}

const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

function toIsoDate(d: Date): string {
  // toISOString()은 UTC로 변환하면서 한국 시간대(UTC+9) 기준 날짜가 하루 밀릴 수 있어 로컬 값을 직접 포맷한다.
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function rollToFutureYear(month: number, day: number, reference: Date): Date {
  const year = reference.getFullYear();
  const candidate = new Date(year, month - 1, day);
  const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  if (candidate < today) candidate.setFullYear(year + 1);
  return candidate;
}

/** 월 없이 "23일로"라고만 쓰면 이번 달로 보고, 이미 지난 날짜면 다음 달로 본다. */
function dayOfCurrentOrNextMonth(day: number, reference: Date): Date {
  const candidate = new Date(reference.getFullYear(), reference.getMonth(), day);
  const today = new Date(reference.getFullYear(), reference.getMonth(), reference.getDate());
  if (candidate < today) candidate.setMonth(candidate.getMonth() + 1);
  return candidate;
}

/** "다음주 X요일" — 다음 주(월요일 시작)의 해당 요일. 목요일 기준 "다음주 화요일"은 5일 뒤다. */
function weekdayOfNextWeek(reference: Date, targetDow: number): Date {
  const result = new Date(reference);
  result.setHours(0, 0, 0, 0);
  const daysSinceMonday = (result.getDay() + 6) % 7;
  const targetFromMonday = (targetDow + 6) % 7;
  result.setDate(result.getDate() + (7 - daysSinceMonday) + targetFromMonday);
  return result;
}

// "23일"처럼 월 없는 날짜. "일정/일자/일시"의 "일"이나 "13시"는 제외한다.
const BARE_DAY = /(?<!\d)(\d{1,2})\s*일(?![정자시\d])/;

/** 문장에서 날짜 하나를 찾아 YYYY-MM-DD로 반환한다. 상대 표현(다음주 화요일, 내일 등)도 처리한다. */
export function extractDate(message: string, reference: Date = new Date()): string | null {
  const monthDay = message.match(/(\d{1,2})\s*월\s*(\d{1,2})\s*일/);
  if (monthDay) {
    return toIsoDate(rollToFutureYear(Number(monthDay[1]), Number(monthDay[2]), reference));
  }

  const slash = message.match(/(\d{1,2})\s*\/\s*(\d{1,2})/);
  if (slash) {
    return toIsoDate(rollToFutureYear(Number(slash[1]), Number(slash[2]), reference));
  }

  const nextWeekMatch = message.match(/다음\s*주\s*([일월화수목금토])요일/);
  if (nextWeekMatch) {
    const dow = WEEKDAYS.indexOf(nextWeekMatch[1]);
    return toIsoDate(weekdayOfNextWeek(reference, dow));
  }

  // "다음주" 없이 "화요일"만 단독으로 나오면 계약일 등 필드와 무관한 요일 언급일 수 있어
  // (실제 검증에서 확인된 오추출 사례) 추측하지 않고 되묻는다.

  if (/오늘|금일/.test(message)) return toIsoDate(reference);

  if (/모레/.test(message)) {
    const d = new Date(reference);
    d.setDate(d.getDate() + 2);
    return toIsoDate(d);
  }

  if (/내일|익일/.test(message)) {
    const d = new Date(reference);
    d.setDate(d.getDate() + 1);
    return toIsoDate(d);
  }

  const bareDay = message.match(BARE_DAY);
  if (bareDay) {
    const day = Number(bareDay[1]);
    if (day >= 1 && day <= 31) return toIsoDate(dayOfCurrentOrNextMonth(day, reference));
  }

  return null;
}

// "오후 3시"처럼 오전/오후가 붙는 표기가 실제 요청에 많아, 이를 무시하면 오후 시각이
// 오전 시각으로 잘못 기록된다 (예: "오후 3시" → 03:00으로 오추출되던 문제).
// 분 자리의 숫자가 "9월"의 9처럼 날짜의 일부면 분으로 보지 않는다 ("오후 3시 9월 25일" → 15:00).
const TIME_PATTERN = /(오전|오후)?\s*(\d{1,2})\s*[:시]\s*(?:(\d{1,2})(?![\d월일/]))?\s*분?/;

function extractTime(text: string): string | null {
  const match = text.match(TIME_PATTERN);
  if (!match) return null;
  let hour = Math.min(23, Number(match[2]));
  const minute = match[3] ? Math.min(59, Number(match[3])) : 0;
  if (match[1] === "오후" && hour !== 12) hour += 12;
  if (match[1] === "오전" && hour === 12) hour = 0;
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

/** 날짜+시간을 함께 추출해 datetime-local 값(YYYY-MM-DDTHH:mm)으로 반환한다. */
export function extractDatetime(message: string, reference: Date = new Date()): string | null {
  const date = extractDate(message, reference);
  if (!date) return null;
  const time = extractTime(message) ?? "09:00";
  return `${date}T${time}`;
}

type DateHit = { index: number; length: number; iso: string };

/**
 * 날짜 두 개가 한 문장에 나올 때 두 번째 날짜는 "30일"처럼 월을 생략하고 적는 경우가 많다
 * (예: "9월15일 설치 30일 회수"). 그래서 앞서 나온 월을 기억해두었다가 월이 생략된
 * "D일" 표기에도 적용한다. 앞에 월이 없으면 기준일의 달로 본다.
 */
function findAllDateHits(message: string, reference: Date): DateHit[] {
  const hits: DateHit[] = [];
  let currentMonth: number | null = null;

  const pattern = /(\d{1,2})\s*\/\s*(\d{1,2})|(\d{1,2})\s*월\s*(\d{1,2})\s*일|(?<!\d)(\d{1,2})\s*일(?![정자시\d])/g;

  for (const match of message.matchAll(pattern)) {
    const index = match.index ?? 0;

    if (match[1] !== undefined) {
      // M/D
      const month = Number(match[1]);
      currentMonth = month;
      hits.push({
        index,
        length: match[0].length,
        iso: toIsoDate(rollToFutureYear(month, Number(match[2]), reference)),
      });
    } else if (match[3] !== undefined) {
      // M월D일
      const month = Number(match[3]);
      currentMonth = month;
      hits.push({
        index,
        length: match[0].length,
        iso: toIsoDate(rollToFutureYear(month, Number(match[4]), reference)),
      });
    } else if (match[5] !== undefined) {
      const day = Number(match[5]);
      if (day < 1 || day > 31) continue;
      hits.push({
        index,
        length: match[0].length,
        iso:
          currentMonth === null
            ? toIsoDate(dayOfCurrentOrNextMonth(day, reference))
            : toIsoDate(rollToFutureYear(currentMonth, day, reference)),
      });
    }
  }

  return hits.sort((a, b) => a.index - b.index);
}

type TimeHit = { time: string; start: number; end: number };

function findTimeIn(message: string, from: number, to: number): TimeHit | null {
  const slice = message.slice(Math.max(0, from), to);
  const match = slice.match(TIME_PATTERN);
  if (!match) return null;
  const time = extractTime(match[0]);
  if (!time) return null;
  const start = Math.max(0, from) + (match.index ?? 0);
  return { time, start, end: start + match[0].length };
}

/**
 * 날짜 하나에 붙는 시간을 찾는다. 날짜 뒤에 시간이 오는 경우가 대부분이라 뒤쪽을 먼저 보고,
 * 앞쪽은 다른 날짜가 이미 가져간 시간이 아닐 때만 쓴다
 * ("9/14 10시 설치 9/21 회수"에서 회수 시각이 10시를 다시 가져가면 안 된다).
 */
function claimTimeNear(message: string, position: number, claimed: TimeHit[]): string | null {
  const overlaps = (hit: TimeHit) => claimed.some((c) => hit.start < c.end && c.start < hit.end);

  for (const candidate of [
    findTimeIn(message, position, position + 15),
    findTimeIn(message, position - 15, position),
  ]) {
    if (candidate && !overlaps(candidate)) {
      claimed.push(candidate);
      return candidate.time;
    }
  }
  return null;
}

/**
 * 문장에 날짜가 두 번(예: 설치일, 회수일) 나오는 경우를 위해 등장 순서대로 최대 2개를 추출한다.
 * 날짜가 하나뿐이거나 상대 표현(다음주 화요일 등)만 있으면 첫 번째 자리만 채운다.
 */
export function extractDatetimePair(
  message: string,
  reference: Date = new Date()
): [string | null, string | null] {
  const hits = findAllDateHits(message, reference);

  if (hits.length === 0) {
    const single = extractDate(message, reference);
    return single ? [`${single}T${extractTime(message) ?? "09:00"}`, null] : [null, null];
  }

  // 날짜를 문장 순서대로 처리해야 앞 날짜가 자기 시간을 먼저 가져간다.
  const claimed: TimeHit[] = [];
  const toDatetime = (hit: DateHit) =>
    `${hit.iso}T${claimTimeNear(message, hit.index + hit.length, claimed) ?? "09:00"}`;

  const first = toDatetime(hits[0]);
  if (hits.length === 1) return [first, null];
  return [first, toDatetime(hits[1])];
}
