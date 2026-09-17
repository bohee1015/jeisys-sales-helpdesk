// 선행 업무(기안 승인 등) 완료 여부를 묻는 질문에 대한 자유 입력 답변을 예/아니오로 판정한다.
// 이 판정이 틀리면 승인 안 된 요청이 접수되거나(PRD "선행 업무 미확인 0건" 위반) 승인된 요청이 보류된다.

// 부정 표현을 먼저 본다. "승인 대기중", "승인 안났어요"처럼 긍정어("승인")가 섞인 부정 답변이 흔하다.
const NEGATIVE_PATTERNS = [
  "아니",
  "아닙",
  "아뇨",
  "아직",
  "미승인",
  "미완료",
  "대기",
  "기다리",
  "진행중",
  "진행 중",
  "예정",
  "상신",
  "결재 전",
  "승인 전",
  "보류",
  "없어",
  "못했",
  "못 했",
  "못받",
  "못 받",
  "안됐",
  "안 됐",
  "안났",
  "안 났",
  "안됨",
  "안 됨",
  "안되",
  "안 되",
  "안했",
  "안 했",
  "안받",
  "안 받",
  "no",
];

const POSITIVE_PATTERNS = ["예", "네", "응", "완료", "승인", "했", "받았", "yes"];

/** 예면 true, 아니오면 false, 판단할 수 없으면 null (다시 묻는다). */
export function parseYesNo(text: string): boolean | null {
  // "기안"의 "안"이 부정어로 오인되지 않도록 판정 전에 지운다 (예: "기안 승인 완료했어요").
  const t = text.toLowerCase().trim().replace(/기안/g, "");
  if (NEGATIVE_PATTERNS.some((p) => t.includes(p))) return false;
  if (POSITIVE_PATTERNS.some((p) => t.includes(p))) return true;
  return null;
}
