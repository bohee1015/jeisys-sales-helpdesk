// 대분류 → 소분류 → 필수값 체계. 실제 영업부 요청 23건 분석과 사용자 협의로 확정했다.

export type FieldType = "text" | "select" | "date" | "datetime";

export type FieldSpec = {
  id: string;
  label: string;
  type: FieldType;
  required: boolean;
  options?: string[];
  placeholder?: string;
};

export type Subcategory = {
  id: string;
  label: string;
  fields: FieldSpec[];
  /** 자연어 분류에 쓰는 키워드. "기타"류 소분류는 키워드가 없어 자동 분류 후보에서 제외된다. */
  keywords?: string[];
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

const ETC_FIELDS: FieldSpec[] = [req("title", "제목"), req("content", "내용")];

function etcSubcategory(id: string): Subcategory {
  return { id, label: "기타", fields: ETC_FIELDS, skipNotes: true };
}

const CLIENT_NAME_LABEL = "거래처명(병원명)";

export const CATEGORIES: CategoryDef[] = [
  {
    id: "settlement",
    label: "정산",
    subcategories: [
      {
        id: "commission_request",
        label: "수수료지급요청",
        fields: [req("vendorName", "업체명"), req("clientName", CLIENT_NAME_LABEL)],
        keywords: ["수수료지급", "수수료 지급"],
      },
      {
        id: "commission_confirm",
        label: "수수료지급확인",
        fields: [req("vendorName", "업체명"), req("clientName", CLIENT_NAME_LABEL)],
        keywords: ["수수료확인", "수수료 확인", "지급확인"],
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
        keywords: ["무이자", "무이자리스"],
      },
      {
        id: "receivable",
        label: "채권",
        fields: [req("clientName", CLIENT_NAME_LABEL)],
        keywords: ["채권"],
      },
      {
        id: "statement",
        label: "거래명세서",
        fields: [req("clientName", CLIENT_NAME_LABEL)],
        keywords: ["거래명세서", "명세서"],
      },
      {
        id: "invoice",
        label: "계산서",
        fields: [req("clientName", CLIENT_NAME_LABEL)],
        keywords: ["계산서", "세금계산서"],
      },
      {
        id: "ledger",
        label: "거래처 원장",
        fields: [req("clientName", CLIENT_NAME_LABEL), req("period", "기간", "예: 2026-09-01 ~ 2026-09-30")],
        keywords: ["거래처원장", "원장조회", "원장확인"],
      },
      etcSubcategory("etc"),
    ],
  },
  {
    id: "equipment_delivery",
    label: "장비납품",
    subcategories: [
      {
        id: "secure",
        label: "장비확보",
        fields: [
          req("clientName", CLIENT_NAME_LABEL),
          req("equipmentQty", "장비명 및 수량"),
          dateField("neededBy", "필요 시점"),
        ],
        keywords: ["확보", "납품일정", "납품 일정", "납품일"],
      },
      {
        id: "reschedule",
        label: "일정변경",
        fields: [
          req("clientName", CLIENT_NAME_LABEL),
          req("equipmentName", "장비명"),
          dateField("changeDate", "변경 희망일"),
        ],
        keywords: ["일정변경", "시간변경", "설치시간", "회수일정", "로변경", "변경해", "변경부탁"],
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
      },
      {
        id: "pre_ship",
        label: "선출고",
        fields: [
          req("clientName", CLIENT_NAME_LABEL),
          req("preShipItems", "선출고 품목 및 수량"),
          select("deliveryMethod", "배송 방식", ["택배", "퀵", "직접수령"]),
        ],
        keywords: ["선출고"],
      },
      etcSubcategory("etc"),
    ],
  },
  {
    id: "demo",
    label: "데모",
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
      },
      {
        id: "reschedule",
        label: "일정변경",
        fields: [req("clientName", CLIENT_NAME_LABEL), req("equipmentName", "장비명"), req("changeContent", "변경 내용")],
        keywords: ["데모변경"],
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
      },
      etcSubcategory("etc"),
    ],
  },
  {
    id: "vendor_registration",
    label: "업체등록/변경",
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
        keywords: ["거래처등록", "거래처변경", "사업자등록증", "sap"],
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
        keywords: ["업체등록", "업체변경", "매입처등록"],
        allowAttachment: true,
      },
      etcSubcategory("etc"),
    ],
  },
  {
    id: "shipment",
    label: "출고",
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
        keywords: ["리플릿", "리플렛", "바인더", "배너", "명패", "인증카드", "판촉", "원내비치", "상담용"],
      },
      etcSubcategory("etc"),
    ],
  },
  {
    id: "shop",
    label: "쇼핑몰",
    subcategories: [
      {
        id: "credit",
        label: "크레딧",
        fields: [req("clientName", CLIENT_NAME_LABEL)],
        // "크래딧"은 같은 말의 다른 표기라 함께 잡는다.
        keywords: ["크레딧", "크래딧"],
      },
      {
        id: "delivery",
        label: "배송",
        fields: [req("clientName", CLIENT_NAME_LABEL), req("item", "품목")],
        keywords: ["쇼핑몰배송", "주문배송"],
      },
      {
        id: "signup",
        label: "회원가입",
        fields: [req("clientName", CLIENT_NAME_LABEL)],
        keywords: ["회원가입", "가입승인"],
      },
      {
        id: "bulk_deal",
        label: "벌크딜",
        fields: [req("clientName", CLIENT_NAME_LABEL), req("item", "품목"), req("discountRate", "할인율", "예: 10%")],
        keywords: ["벌크딜"],
      },
      etcSubcategory("etc"),
    ],
  },
  {
    id: "pipedrive",
    label: "파이프드라이브",
    subcategories: [
      {
        id: "transfer",
        label: "이관",
        fields: [req("clientName", CLIENT_NAME_LABEL), req("transferee", "이관대상자")],
        keywords: ["파이프드라이브이관", "파이프드라이브 이관"],
      },
      {
        id: "error",
        label: "에러",
        fields: [req("errorContent", "에러내용")],
        keywords: ["파이프드라이브에러", "파이프드라이브 에러", "파이프드라이브오류"],
      },
      {
        id: "vendor_register",
        label: "거래처등록",
        fields: [req("clientName", CLIENT_NAME_LABEL), req("address", "주소")],
        keywords: ["파이프드라이브등록", "파이프드라이브 거래처", "파이프드라이브 등록"],
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
