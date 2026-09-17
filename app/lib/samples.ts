import type { NewRequestInput } from "./helpdesk";

type Sample = Omit<NewRequestInput, "requesterId">;

function sample(
  categoryId: string,
  subcategoryId: string,
  fields: Record<string, string>,
  notes?: string
): Sample {
  return {
    requesterName: "영업팀",
    categoryId,
    subcategoryId,
    fields,
    notes: notes ?? null,
  };
}

// 영업부 실제 요청 23건의 유형·문장 구조를 그대로 살린 예시 데이터다.
// 공개 저장소이므로 병원명·원장님 성함·연락처·직원 이름은 모두 가명으로 바꿨다 (실존 기관·인물과 무관).
// 원문에 없는 필수값(예: 날짜의 연도)은 접수 시점 기준으로 채웠다.
export const SAMPLE_REQUESTS: Sample[] = [
  sample("demo", "register", {
    clientName: "가온의원 용인",
    equipmentName: "전략덴서티 1번",
    installDatetime: "2026-09-30T13:00",
    recoveryDatetime: "2026-10-07T13:00",
  }, "엘리베이터 있음, 주차 가능"),
  sample("shipment", "supplies", {
    clientName: "바다피부과",
    itemsQty: "알파팁",
    deliveryMethod: "택배",
    recipient: "공덕",
    shipPurpose: "기타",
  }, "기안완료 되었습니다"),
  sample("settlement", "invoice", {
    clientName: "한빛의원",
  }, "포텐자 1대 / 5,000만원 / 계산서 이미지 파일로 요청"),
  sample("shop", "credit", {
    clientName: "한빛의원",
  }, "포텐자 크레딧 지급 요청 (지급 사유·금액 확인 필요)"),
  sample("vendor_registration", "sales", {
    registrationType: "등록",
    clientName: "나래내과의원",
  }, "국내포텐자 3번"),
  sample("shipment", "promo", {
    clientName: "새봄의원",
    itemsQty: "포텐자 원내비치 리플릿",
    deliveryMethod: "택배",
    recipient: "병원",
  }),
  sample("equipment_delivery", "reschedule", {
    clientName: "라온피부과",
    equipmentName: "덴서티 데모장비 회수",
    changeDate: "2026-09-18",
  }, "13:00로 변경"),
  sample("shipment", "supplies", {
    clientName: "다온의원",
    itemsQty: "알파팁 50개",
    deliveryMethod: "퀵",
    recipient: "병원",
    shipPurpose: "기타",
  }, "오늘 발송 요청 (선출고)"),
  sample("shipment", "promo", {
    clientName: "누리의원 목동",
    itemsQty: "알파팁 인증카드 50개, 일반 인증카드 30개",
    deliveryMethod: "택배",
    recipient: "병원",
  }, "오늘 발송 요청"),
  sample("equipment_delivery", "reschedule", {
    clientName: "라온피부과",
    equipmentName: "덴서티 설치",
    changeDate: "2026-09-16",
  }, "설치시간 12:30분으로 변경 (일자 미기재로 접수일 기준 익일 처리)"),
  sample("equipment_delivery", "recovery", {
    clientName: "누리의원 구로",
    recoveryEquipment: "보산장비 볼뉴머",
    recoveryDate: "2026-09-22",
  }, "다음주 화요일"),
  sample("shipment", "promo", {
    clientName: "봄빛성형외과",
    itemsQty: "포텐자 명패 1개",
    deliveryMethod: "택배",
    recipient: "병원",
  }),
  sample("equipment_delivery", "secure", {
    clientName: "누리의원 분당",
    equipmentQty: "덴서티 느와르 1대",
    neededBy: "2026-09-16",
  }, "납품일정 확인 요청 (필요 시점 미기재로 접수일 기준 익일 처리)"),
  sample("etc", "general", {
    title: "NH캐피탈 담당자 연락 요청",
    content:
      "담당자님, NH캐피탈 쪽에서 병원으로 연락 한번 더 드릴 수 있도록 담당자에게 연락 부탁드릴께요. 필요서류 문자로 보내준다고 이야기 한 뒤로 몇일째 연락이 없다 합니다.",
  }),
  sample("equipment_delivery", "secure", {
    clientName: "하람의원 마포",
    equipmentQty: "느와르 1대",
    neededBy: "2026-09-16",
  }, "장비 확보 요청 (필요 시점 미기재로 접수일 기준 익일 처리)"),
  sample("shipment", "promo", {
    clientName: "소망의원 수원",
    itemsQty: "상담용 바인더 (덴서티·포텐자 각 2부)",
    deliveryMethod: "택배",
    recipient: "병원",
  }, "금일 출고 부탁"),
  sample("equipment_delivery", "secure", {
    clientName: "소망의원 수원",
    equipmentQty: "포텐자 1대",
    neededBy: "2026-09-16",
  }, "납품일정 확인. 월요일 계약서 작성예정, 소모품 일부 선출고 예정"),
  sample("demo", "register", {
    clientName: "예담의원 성남점",
    equipmentName: "덴서티",
    installDatetime: "2026-09-14T10:00",
    recoveryDatetime: "2026-09-21T10:00",
  }, "자원예약 완료. 배너 1, 미니배너 1, 리플렛 100부, 바인더 2부 출고 희망"),
  sample("equipment_delivery", "reschedule", {
    clientName: "푸른병원",
    equipmentName: "납품 장비",
    changeDate: "2026-09-23",
  }, "병원 인테리어 관계로 변경"),
  sample("settlement", "interest_free_lease", {
    clientName: "해솔의원 시흥",
    directorName: "홍길동",
    directorPhone: "010-0000-0000",
    leasingCompany: "NH캐피탈",
    equipmentName: "미기재",
    leaseAmount: "4,800만원 (24개월)",
  }, "납품일: 9월 10일"),
  sample("equipment_delivery", "pre_ship", {
    clientName: "맑은피부과 영등포",
    preShipItems: "미기재",
    deliveryMethod: "퀵",
  }, "내일 선출고"),
  sample("settlement", "invoice", {
    clientName: "은하의원 검단점",
  }, "세금계산서 요청 (금액 미기재)"),
  sample("shipment", "promo", {
    clientName: "은하의원",
    itemsQty: "바인더 10부",
    deliveryMethod: "미기재",
    recipient: "병원",
  }),
];
