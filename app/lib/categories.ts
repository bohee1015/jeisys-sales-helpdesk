// 대분류 → 소분류 → 필수값 체계. 실제 영업부 요청 분석과 사용자 협의로 확정했다.
// 분류에 쓰는 신호(키워드·패턴·가중치)도 전부 이 파일에 둔다 — 고칠 곳이 한 곳이어야 한다.

export type FieldType = "text" | "select" | "date" | "datetime";

export type FieldSpec = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
};

/**
 * 분류 신호 하나. pattern은 공백을 지우고 소문자로 바꾼 문장에 대해 검사한다.
 * (예: "장비 하나 잡아 주세요" → "장비하나잡아주세요")
 */
export type Signal = {
  pattern: RegExp;
  /** 맞으면 더해지는 점수. 뜻이 뚜렷할수록 크게 준다 (1 = 약한 단서, 3 이상 = 거의 확정) */
  weight: number;
  /** 이 말이 같이 있으면 신호로 보지 않는다 */
  unless?: RegExp;
};

export type Subcategory = {
  id: string;
  label: string;
  fields: FieldSpec[];
  /**
   * 단순 포함 검사 키워드. 하나당 1점. 같은 소분류 안에서 한 키워드가 다른 키워드에 포함되면
   * (예: "명세서" ⊂ "거래명세서") 긴 것 하나만 센다. 짧고 흔한 말은 patterns 쪽에 맥락과 함께 둔다.
   */
  keywords?: string[];
  /** 맥락이 있는 신호. "동사 + 목적어"처럼 키워드 하나로는 못 잡는 표현을 여기서 잡는다. */
  signals?: Signal[];
  /** 선택 사항으로 파일을 첨부할 수 있는지 (필수는 아님) */
  allowAttachment?: boolean;
  /** 제목/내용만 받는 "기타" 항목은 별도 비고란을 두지 않는다 */
  skipNotes?: boolean;
  /** 처리 전에 완료 여부를 확인해야 하는 선행 업무 */
  prerequisite?: { label: string; guide: string };
};

export type CategoryDef = {
  id: string;
  label: string;
  /**
   * 소분류를 못 정했을 때 대분류만이라도 짚어 주는 단서. 이 대분류의 말이 문장에 있고
   * 다른 대분류 단서는 없으면, 요청자에게 소분류만 고르게 한다.
   */
  anchor?: RegExp;
  subcategories: Subcategory[];
};

function req(id: string, label: string, placeholder?: string): FieldSpec {
  return { id, label, type: "text", required: true, placeholder };
}

function select(id: string, label: string, options: string[]): FieldSpec {
  return { id, label, type: "select", required: true, options };
}

function dateField(id: string, label: string): FieldSpec {
  return { id, label, type: "date", required: true };
}

function datetimeField(id: string, label: string): FieldSpec {
  return { id, label, type: "datetime", required: true };
}

function sig(pattern: RegExp, weight: number, unless?: RegExp): Signal {
  return { pattern, weight, unless };
}

const ETC_FIELDS: FieldSpec[] = [req("title", "제목"), req("content", "내용")];

function etcSubcategory(id: string): Subcategory {
  return { id, label: "기타", fields: ETC_FIELDS, skipNotes: true };
}

const CLIENT_NAME_LABEL = "거래처명(병원명)";

// 장비명. 문장에 "덴서티 한 대"처럼 장비 + 수량이 오면 장비 확보 요청일 가능성이 높다.
const EQUIPMENT = "(덴서티|포텐자|리니어지|느와르|누아르|볼뉴머|트라이빔|장비)";
// 날짜·시각 표기. "18일로", "10시30분으로", "12:30으로", "9/17(목)으로", "9.15.로" 모두 잡는다.
const DATE_OR_TIME = "(\\d+일|\\d+시|\\d+분|\\d+:\\d+|\\d+\\/\\d+|\\d+\\.\\d+\\.?)";
// "1대 / 한 대 / 하나 / 두 대" 같은 대수 표현 (공백 제거 후 기준)
const UNIT_COUNT = "(\\d+대|한대|하나|두대|세대|네대)";
// 일정을 바꾸는 동사들 (변경 / 미루기 / 당기기 모두)
const RESCHEDULE_VERB = "(변경|수정|조정|미루|미뤄|당겨|당기|연기|바꿔|바꾸|옮겨|옮기|늦춰|앞당)";
const SCHEDULE_NOUN = "(설치|회수|철수|납품|배송|일정|시간|날짜|일자|스케줄)";
// "18일로 해주세요", "10시30분으로 부탁드립니다"처럼 날짜·시각 바로 뒤에 "로 + 요청"이 붙으면 일정 변경이다.
// "으로 확인 부탁"은 확인 요청이므로 "로" 바로 뒤에 붙는 말만 본다.
const DATE_TO = new RegExp(
  `${DATE_OR_TIME}(\\([^)]{1,3}\\))?${SCHEDULE_NOUN}?(으로|로)(변경|수정|조정|연장|해주|부탁|요청|잡아|당겨|미뤄|늦춰)`
);
// 설치 환경 안내(엘리베이터·주차장, 줄여서 "주x엘o")는 데모 설치 등록 요청에만 붙는다.
const DEMO_SITE_INFO = /엘베|엘리베이터|주차장|주[xo×ㅇ]엘[xo×ㅇ]/;

export const CATEGORIES: CategoryDef[] = [
  {
    id: "settlement",
    label: "정산",
    anchor: /정산|수수료|계산서|채권|미수|무이자|캐피탈|명세서|원장(?!님)/,
    subcategories: [
      {
        id: "commission_request",
        label: "수수료지급요청",
        fields: [req("vendorName", "업체명"), req("clientName", CLIENT_NAME_LABEL)],
        keywords: ["수수료지급"],
        signals: [sig(/수수료.{0,6}(지급|입금|송금|정산|처리|요청)/, 2)],
      },
      {
        id: "commission_confirm",
        label: "수수료지급확인",
        fields: [req("vendorName", "업체명"), req("clientName", CLIENT_NAME_LABEL)],
        keywords: ["수수료확인", "지급확인"],
        // "지급 확인"은 지급요청보다 확실히 앞서야 한다 ("수수료 지급 확인 부탁" → 확인).
        signals: [
          sig(/수수료.{0,10}(확인|들어왔|입금됐|됐나|언제|미입금|안들어)/, 3),
          sig(/(지급|입금).{0,4}(확인|됐는지|됐나)/, 1),
        ],
      },
      {
        id: "interest_free_lease",
        label: "무이자리스신청",
        fields: [
          req("clientName", CLIENT_NAME_LABEL),
          req("directorName", "원장님 성함"),
          req("directorPhone", "원장님 연락처", "010-0000-0000"),
          req("leasingCompany", "캐피탈사"),
          req("equipmentName", "장비명"),
          req("leaseAmount", "리스금액", "예: 4,800만원"),
        ],
        keywords: ["무이자"],
        // "리스"만으로는 "리스팅/리스트"까지 걸리므로 리스 뒤에 오는 말까지 본다.
        signals: [
          sig(/무이자/, 2),
          sig(/캐피탈/, 2),
          sig(/리스(신청|실행|진행|계약|견적|승인|서류|접수|건|로|으로|를|은|는)/, 2),
          sig(/할부/, 1),
        ],
      },
      {
        id: "receivable",
        label: "채권",
        fields: [req("clientName", CLIENT_NAME_LABEL)],
        keywords: ["채권", "미수금", "미수", "미납", "연체", "수금"],
        signals: [sig(/잔금.{0,6}(확인|남|얼마|입금)/, 2), sig(/입금.{0,4}(안|미)/, 1)],
      },
      {
        id: "statement",
        label: "거래명세서",
        fields: [req("clientName", CLIENT_NAME_LABEL)],
        keywords: ["거래명세서", "명세서", "거래내역서"],
        signals: [sig(/명세서.{0,6}(발행|발급|출력|보내)/, 1)],
      },
      {
        id: "invoice",
        label: "계산서",
        fields: [req("clientName", CLIENT_NAME_LABEL)],
        keywords: ["계산서", "세금계산서", "인보이스"],
        // "부탁/요청"은 모든 문장에 붙는 말이라 여기 넣지 않는다 (채권 등 다른 소분류와의 균형).
        signals: [sig(/계산서.{0,8}(발행|발급|끊|취소|수정|재발행)/, 2)],
      },
      {
        id: "ledger",
        label: "거래처 원장",
        fields: [req("clientName", CLIENT_NAME_LABEL), req("period", "기간", "예: 2026-09-01 ~ 2026-09-30")],
        keywords: ["거래처원장", "원장조회", "원장확인"],
        // "원장님"(사람)은 제외하고 "원장"(장부)만 본다.
        signals: [sig(/원장(?!님).{0,4}(조회|확인|뽑|출력|보내|부탁|요청)/, 2)],
      },
      etcSubcategory("etc"),
    ],
  },
  {
    id: "equipment_delivery",
    label: "장비납품",
    anchor: /납품|선출고|보상|장비/,
    subcategories: [
      {
        id: "secure",
        label: "장비확보",
        fields: [
          req("clientName", CLIENT_NAME_LABEL),
          req("equipmentQty", "장비명 및 수량"),
          dateField("neededBy", "필요 시점"),
        ],
        keywords: ["확보", "납품일정", "납품일", "재고", "물량"],
        signals: [
          // "요청/부탁"은 "납품으로 변경 부탁"에도 붙으므로 넣지 않는다. "납품 설치 등록"은 납품 일정 등록 요청.
          sig(/납품.{0,6}(일정|가능|언제|날짜|일자|예정|확인|등록|설치)/, 2),
          // "장비 하나 잡아 주세요", "한 대 확보" — 실무에서 장비 확보를 이렇게 말한다.
          sig(new RegExp(`(장비|${UNIT_COUNT}).{0,4}(잡아|잡고|잡을|확보|준비|맞춰)`), 3),
          sig(new RegExp(`${EQUIPMENT}.{0,10}${UNIT_COUNT}`), 1),
          sig(/출고가능/, 1),
          sig(/계약/, 1),
        ],
      },
      {
        id: "reschedule",
        label: "일정변경",
        fields: [
          req("clientName", CLIENT_NAME_LABEL),
          req("equipmentName", "장비명"),
          dateField("changeDate", "변경 희망일"),
        ],
        keywords: ["일정변경", "시간변경", "설치시간", "회수일정", "로변경"],
        // "변경" 혼자는 어떤 업무에나 붙으므로, 일정을 뜻하는 말과 같이 있을 때만 본다.
        // "데모" 얘기면 데모 일정변경이지 장비납품 일정변경이 아니다.
        signals: [
          sig(new RegExp(`${SCHEDULE_NOUN}.{0,8}${RESCHEDULE_VERB}`), 3, /데모/),
          sig(new RegExp(`${RESCHEDULE_VERB}.{0,8}${SCHEDULE_NOUN}`), 2, /데모/),
          sig(DATE_TO, 2, /데모/),
        ],
      },
      {
        id: "recovery",
        label: "보상회수",
        fields: [
          req("clientName", CLIENT_NAME_LABEL),
          req("recoveryEquipment", "회수 장비명"),
          dateField("recoveryDate", "회수 희망일"),
        ],
        keywords: ["보상회수", "회수올려", "보산"],
        // "보상 장비 회수"처럼 사이에 말이 끼는 경우가 많다. "보산"은 흔한 오타.
        // "보상 장비 사진 첨부드렸습니다. 납품 동시에 회수로"처럼 보상과 회수 사이가 멀 때가 많다.
        signals: [
          sig(/보상.{0,40}회수/, 3),
          sig(/회수.{0,12}보상/, 2),
          sig(/납품.{0,4}(동시|같이|함께).{0,4}회수/, 2),
          sig(/구형장비/, 1),
          sig(/보산/, 1),
        ],
      },
      {
        id: "pre_ship",
        label: "선출고",
        fields: [
          req("clientName", CLIENT_NAME_LABEL),
          req("preShipItems", "선출고 품목 및 수량"),
          select("deliveryMethod", "배송 방식", ["택배", "퀵", "직접수령"]),
        ],
        keywords: ["선출고", "선발송"],
        signals: [sig(/선출고/, 2), sig(/먼저.{0,6}(출고|보내|발송)/, 2), sig(/(출고|발송).{0,6}먼저/, 2)],
      },
      etcSubcategory("etc"),
    ],
  },
  {
    id: "demo",
    label: "데모",
    anchor: /데모/,
    subcategories: [
      {
        id: "register",
        label: "신규등록",
        fields: [
          req("clientName", CLIENT_NAME_LABEL),
          req("equipmentName", "장비명"),
          datetimeField("installDatetime", "설치 일시"),
          datetimeField("recoveryDatetime", "회수 일시"),
        ],
        keywords: ["데모"],
        // "데모"는 강한 신호지만 절대 우선은 아니다 — "데모 팁 출고"처럼 출고 신호가 더 세면 출고로 간다.
        signals: [
          sig(/데모/, 2),
          sig(/설치.{0,60}회수/, 2, /보상/),
          sig(/데모.{0,10}(등록|신청|잡아|진행|요청|부탁|가능)/, 1),
          // "데모"라는 말 없이 오는 데모 등록: "전략 6번 장비", "덴서티 16번" 같은 데모 장비 번호,
          // 그리고 설치 환경(엘리베이터·주차장) 안내는 데모 설치 요청에만 붙는다.
          sig(new RegExp(`(전략|국내|${EQUIPMENT})\\d+번`), 2),
          sig(DEMO_SITE_INFO, 2),
        ],
      },
      {
        id: "reschedule",
        label: "일정변경",
        fields: [req("clientName", CLIENT_NAME_LABEL), req("equipmentName", "장비명"), req("changeContent", "변경 내용")],
        keywords: ["데모변경"],
        signals: [
          sig(new RegExp(`데모.{0,30}${RESCHEDULE_VERB}`), 5),
          sig(new RegExp(`${RESCHEDULE_VERB}.{0,30}데모`), 5),
          sig(/데모.{0,30}연장/, 5),
          // "금일 회수였으나 원장님 요청으로 9.1.로 연장" — 데모라는 말 없이 회수 연장을 말한다.
          sig(/(회수|철수|기간).{0,40}연장/, 3),
          // 자원예약은 데모 장비 예약 시스템이라 데모 맥락의 단서다.
          sig(/자원예약/, 1),
        ],
      },
      {
        id: "special",
        label: "특이사항",
        fields: [
          req("clientName", CLIENT_NAME_LABEL),
          req("equipmentName", "장비명"),
          req("specialContent", "특이사항 내용"),
        ],
        keywords: ["데모특이사항"],
        // 등록 양식에 "특이사항: 후문 계단" 줄이 있는 건 특이사항 접수가 아니라 신규등록이다.
        signals: [
          sig(/데모.{0,40}특이사항/, 5, DEMO_SITE_INFO),
          sig(/특이사항.{0,40}데모/, 5, DEMO_SITE_INFO),
          sig(/데모.{0,40}(고장|이상|문제|안됨|안돼|에러|파손|불량)/, 3),
        ],
      },
      etcSubcategory("etc"),
    ],
  },
  {
    id: "vendor_registration",
    label: "업체등록/변경",
    anchor: /거래처|업체|sap|사업자/,
    subcategories: [
      {
        id: "sales",
        label: "매출",
        fields: [
          select("registrationType", "등록/변경", ["등록", "변경"]),
          req("clientName", CLIENT_NAME_LABEL),
        ],
        // "SAP등록/수정"은 SAP(ERP)에 거래처(병원) 정보를 등록/변경해 달라는 것이라
        // 별도 소분류 없이 매출(거래처) 등록/변경으로 함께 처리한다.
        keywords: ["거래처등록", "거래처변경", "거래처수정", "사업자등록증", "sap", "bp코드", "거래처코드"],
        signals: [
          sig(/사업자등록증/, 2),
          // "납품 동시 회수로 SAP 등록", "데모 SAP 등록"은 거래처 등록이 아니라 그 업무의 전산 등록이다.
          sig(/sap.{0,12}(등록|수정|변경|추가|반영|생성)/, 3, /보상|회수|납품|데모/),
          sig(/(거래처|병원|의원).{0,6}(등록|추가|생성|변경|수정)/, 1),
        ],
        allowAttachment: true,
      },
      {
        id: "purchase",
        label: "매입",
        fields: [
          select("registrationType", "등록/변경", ["등록", "변경"]),
          req("vendorName", "업체명"),
          req("vendorContactName", "업체담당자 성함"),
          req("vendorContactPhone", "업체담당자 연락처", "010-0000-0000"),
        ],
        keywords: ["업체등록", "업체변경", "매입처", "매입", "협력업체", "공급업체", "공급사"],
        signals: [sig(/(협력업체|공급업체|공급사|매입처)/, 2), sig(/업체.{0,6}(등록|추가|변경|수정|신규)/, 2)],
        allowAttachment: true,
      },
      etcSubcategory("etc"),
    ],
  },
  {
    id: "shipment",
    label: "출고",
    anchor: /출고|발송|판촉|소모품|알파팁/,
    subcategories: [
      {
        id: "supplies",
        label: "소모품",
        fields: [
          req("clientName", CLIENT_NAME_LABEL),
          req("itemsQty", "품목 및 수량"),
          select("deliveryMethod", "배송 방식", ["택배", "퀵", "직접수령"]),
          select("recipient", "수령지", ["병원", "공덕"]),
          select("shipPurpose", "출고 목적", ["추가데모팁", "임상", "마케팅", "기타"]),
        ],
        keywords: ["알파팁", "소모품", "팁"],
        signals: [
          sig(/알파팁|소모품/, 1),
          // 팁을 "보내 달라"는 맥락. ("팁 주문" 쪽은 쇼핑몰-배송에서 더 크게 잡는다)
          sig(/(팁|소모품|젤).{0,12}(출고|발송|보내|택배|퀵|빼)/, 2, /인증카드/),
          // 리니어지 팁 종류(베이직·코어·컨투어)와 팁 이름에 수량이 붙으면 소모품 출고 요청이다.
          sig(/(베이직|코어|컨투어|클래식팁|임상팁|교육팁|알파팁).{0,4}\d+(개|ea|박스)/, 2),
          // 기안(승인) 이야기가 붙으면 사내 출고 요청이다.
          sig(/기안/, 1),
        ],
        prerequisite: {
          label: "기안 승인",
          guide:
            "출고는 기안 승인이 완료된 뒤에만 진행할 수 있습니다. 전자결재에서 기안 승인 상태를 확인한 뒤 다시 요청해 주세요.",
        },
      },
      {
        id: "promo",
        label: "판촉물",
        fields: [
          req("clientName", CLIENT_NAME_LABEL),
          req("itemsQty", "품목 및 수량"),
          select("deliveryMethod", "배송 방식", ["택배", "퀵", "직접수령"]),
          select("recipient", "수령지", ["병원", "공덕"]),
        ],
        keywords: [
          "리플릿", "리플렛", "바인더", "배너", "미니배너", "철제배너", "명패", "인증카드", "판촉", "원내비치", "상담용",
          "홍보물", "브로슈어", "카탈로그", "포스터", "마킹페이퍼", "파라미터표", "아이쉴드", "거치대", "홀더", "매뉴얼", "메뉴얼",
        ],
        signals: [
          sig(/(리플릿|리플렛|바인더|배너|명패|인증카드|판촉|홍보물|브로슈어|마킹페이퍼|포스터|거치대|홀더)/, 1),
          // "알파팁 정품인증카드"는 팁이 아니라 카드(판촉물)다 — 소모품 쪽 팁 신호를 이긴다.
          sig(/인증카드/, 2),
        ],
      },
      etcSubcategory("etc"),
    ],
  },
  {
    id: "shop",
    label: "쇼핑몰",
    anchor: /쇼핑몰|크(레|래)딧|주문|벌크/,
    subcategories: [
      {
        id: "credit",
        label: "크레딧",
        fields: [req("clientName", CLIENT_NAME_LABEL)],
        // "크래딧"은 같은 말의 다른 표기라 함께 잡는다.
        keywords: ["크레딧", "크래딧"],
        signals: [sig(/크(레|래)딧/, 2), sig(/크(레|래)딧.{0,8}(지급|충전|차감|적립|소멸|확인|얼마|남은)/, 1)],
      },
      {
        id: "delivery",
        label: "배송",
        fields: [req("clientName", CLIENT_NAME_LABEL), req("item", "품목")],
        keywords: ["쇼핑몰배송", "주문배송", "송장", "배송조회", "주문"],
        // "팁/카트리지 주문"은 사내 출고가 아니라 쇼핑몰에서 산 건에 대한 문의다 (실무 확인).
        signals: [
          sig(/주문.{0,10}(배송|도착|언제|출발|송장|택배|확인|취소|들어갔)/, 3),
          sig(/(팁|카트리지|제품).{0,10}주문/, 3),
        ],
      },
      {
        id: "signup",
        label: "회원가입",
        fields: [req("clientName", CLIENT_NAME_LABEL)],
        keywords: ["회원가입", "가입승인", "아이디", "비밀번호"],
        signals: [
          sig(/가입.{0,6}(승인|처리|부탁|요청|안돼|안됨|해주)/, 2),
          sig(/(비밀번호|비번).{0,6}(초기화|재설정|변경|잊)/, 2),
          sig(/회원/, 1),
        ],
      },
      {
        id: "bulk_deal",
        label: "벌크딜",
        fields: [req("clientName", CLIENT_NAME_LABEL), req("item", "품목"), req("discountRate", "할인율", "예: 10%")],
        keywords: ["벌크딜", "벌크", "대량구매", "대량주문"],
        signals: [sig(/벌크/, 2), sig(/대량.{0,6}(주문|구매|할인)/, 2), sig(/할인/, 1)],
      },
      etcSubcategory("etc"),
    ],
  },
  {
    id: "pipedrive",
    label: "파이프드라이브",
    anchor: /파이프드라이브|파이프(?!라인)/,
    subcategories: [
      {
        id: "transfer",
        label: "이관",
        fields: [req("clientName", CLIENT_NAME_LABEL), req("transferee", "이관대상자")],
        keywords: ["파이프드라이브이관"],
        signals: [
          sig(/파이프드라이브.{0,30}(이관|담당자변경|담당변경|담당자바꿔|넘겨)/, 4),
          sig(/(이관|담당자변경).{0,30}파이프드라이브/, 4),
        ],
      },
      {
        id: "error",
        label: "에러",
        fields: [req("errorContent", "에러내용")],
        keywords: ["파이프드라이브에러", "파이프드라이브오류"],
        signals: [sig(/파이프드라이브.{0,30}(에러|오류|안돼|안됨|안열|접속|느려|버그|문제|로그인)/, 4)],
      },
      {
        id: "vendor_register",
        label: "거래처등록",
        fields: [req("clientName", CLIENT_NAME_LABEL), req("address", "주소")],
        keywords: ["파이프드라이브등록"],
        // "파이프드라이브에 등록"처럼 조사가 끼어도 잡는다.
        signals: [
          sig(/파이프드라이브.{0,20}(등록|거래처|추가|생성|넣어)/, 4),
          sig(/(등록|거래처|추가).{0,20}파이프드라이브/, 3),
          // "파이프 생성 부탁" — 파이프드라이브를 줄여 부른다.
          sig(/파이프.{0,4}(생성|등록|추가|만들)/, 3),
        ],
      },
      etcSubcategory("etc"),
    ],
  },
  {
    id: "etc",
    label: "기타",
    subcategories: [etcSubcategory("general")],
  },
];

export function findSubcategory(
  categoryId: string,
  subcategoryId: string
): { category: CategoryDef; subcategory: Subcategory } | null {
  const category = CATEGORIES.find((c) => c.id === categoryId);
  const subcategory = category?.subcategories.find((s) => s.id === subcategoryId);
  if (!category || !subcategory) return null;
  return { category, subcategory };
}
