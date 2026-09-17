// 헬프데스크 요청 1건의 처리 상태
export type RequestStatus =
  | "collecting_info" // 챗봇이 필수값을 되묻는 중
  | "awaiting_prereq" // 선행 업무 완료 여부 확인 응답 대기
  | "on_hold" // 선행 업무 미완료로 보류
  | "received" // 요청 등록 완료 (영업관리팀 확인 대상)
  | "in_progress" // 영업관리팀이 처리 중
  | "resolved" // 영업관리팀이 완료 처리함
  | "cancelled"; // 요청자가 접수를 취소함

export type ChatTurn = {
  role: "user" | "bot";
  text: string;
  at: string;
};

export type HelpdeskRequest = {
  id: string;
  /** 인증된 사용자(auth.users.id) — Supabase RLS의 본인 확인 기준 */
  requesterId: string;
  requesterName: string;
  categoryId: string;
  categoryLabel: string;
  subcategoryId: string;
  subcategoryLabel: string;
  /** 소분류별 필수값 + 선택 항목 (fieldId → 입력값) */
  fields: Record<string, string>;
  /** 챗봇이 현재 되묻고 있는 필드 (collecting_info 상태일 때만 값이 있다) */
  pendingFieldId: string | null;
  /** 접수 시점의 원문 (여러 메시지로 나뉘어 들어와도 이어붙인다) */
  originalMessage: string;
  /** 요청자와 챗봇이 주고받은 대화 전문 (원문보기용) */
  transcript: ChatTurn[];
  /** 비고 (선택 입력) */
  notes: string | null;
  attachmentName: string | null;
  status: RequestStatus;
  botReply: string;
  /** 개인정보가 포함된 요청인지 (PRD 7번) */
  hasPersonalInfo: boolean;
  /** 선행 업무가 있는 소분류에서, 요청자가 완료했다고 확인했는지 여부 */
  prerequisiteConfirmed: boolean | null;
  supportAnswer: string | null;
  /** 완료 처리한 영업관리팀 담당자 (완료 처리 시점에 기록, 상태를 되돌리면 지운다) */
  resolvedById: string | null;
  resolvedByName: string | null;
  resolvedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export const STATUS_LABEL: Record<RequestStatus, string> = {
  collecting_info: "정보 입력 중",
  awaiting_prereq: "선행 업무 확인 대기",
  on_hold: "선행 업무 미완료 · 보류",
  received: "요청등록",
  in_progress: "처리중",
  resolved: "완료",
  cancelled: "취소",
};

/** 관리자가 직접 지정할 수 있는 처리 상태. 챗봇이 자동으로 거치는 상태(정보 입력 중 등)는 제외한다. */
export const ADMIN_STATUSES = ["received", "in_progress", "resolved"] as const;

export type AdminStatus = (typeof ADMIN_STATUSES)[number];

export function isAdminStatus(value: unknown): value is AdminStatus {
  return typeof value === "string" && (ADMIN_STATUSES as readonly string[]).includes(value);
}
