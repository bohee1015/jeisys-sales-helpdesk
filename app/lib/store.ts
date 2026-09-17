import { createClient } from "./supabase/server";
import type { HelpdeskRequest } from "./types";

// helpdesk.requests 테이블(스키마 분리)을 그대로 CRUD한다.
// RLS가 "본인 것 또는 관리자"만 걸러주므로, 호출자의 로그인 세션에 맞는 행만 오간다.

type RequestRow = {
  id: string;
  requester_id: string;
  requester_name: string | null;
  category_id: string;
  category_label: string;
  subcategory_id: string;
  subcategory_label: string;
  fields: Record<string, string>;
  pending_field_id: string | null;
  original_message: string | null;
  transcript: HelpdeskRequest["transcript"];
  notes: string | null;
  attachment_name: string | null;
  status: string;
  bot_reply: string | null;
  has_personal_info: boolean;
  prerequisite_confirmed: boolean | null;
  support_answer: string | null;
  resolved_by_id: string | null;
  resolved_by_name: string | null;
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
};

function fromRow(row: RequestRow): HelpdeskRequest {
  return {
    id: row.id,
    requesterId: row.requester_id,
    requesterName: row.requester_name ?? "",
    categoryId: row.category_id,
    categoryLabel: row.category_label,
    subcategoryId: row.subcategory_id,
    subcategoryLabel: row.subcategory_label,
    fields: row.fields ?? {},
    pendingFieldId: row.pending_field_id,
    originalMessage: row.original_message ?? "",
    transcript: row.transcript ?? [],
    notes: row.notes,
    attachmentName: row.attachment_name,
    status: row.status as HelpdeskRequest["status"],
    botReply: row.bot_reply ?? "",
    hasPersonalInfo: row.has_personal_info,
    prerequisiteConfirmed: row.prerequisite_confirmed,
    supportAnswer: row.support_answer,
    resolvedById: row.resolved_by_id,
    resolvedByName: row.resolved_by_name,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toRow(request: HelpdeskRequest) {
  return {
    id: request.id,
    requester_id: request.requesterId,
    requester_name: request.requesterName,
    category_id: request.categoryId,
    category_label: request.categoryLabel,
    subcategory_id: request.subcategoryId,
    subcategory_label: request.subcategoryLabel,
    fields: request.fields,
    pending_field_id: request.pendingFieldId,
    original_message: request.originalMessage,
    transcript: request.transcript,
    notes: request.notes,
    attachment_name: request.attachmentName,
    status: request.status,
    bot_reply: request.botReply,
    has_personal_info: request.hasPersonalInfo,
    prerequisite_confirmed: request.prerequisiteConfirmed,
    support_answer: request.supportAnswer,
    resolved_by_id: request.resolvedById,
    resolved_by_name: request.resolvedByName,
    resolved_at: request.resolvedAt,
  };
}

export async function listRequests(): Promise<HelpdeskRequest[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("helpdesk")
    .from("requests")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw error;
  return (data as RequestRow[]).map(fromRow);
}

export async function getRequest(id: string): Promise<HelpdeskRequest | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("helpdesk")
    .from("requests")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error) throw error;
  return data ? fromRow(data as RequestRow) : null;
}

export async function createRequest(request: HelpdeskRequest): Promise<HelpdeskRequest> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .schema("helpdesk")
    .from("requests")
    .insert(toRow(request))
    .select("*")
    .single();

  if (error) throw error;
  return fromRow(data as RequestRow);
}

export async function updateRequest(
  id: string,
  patch: Partial<HelpdeskRequest>
): Promise<HelpdeskRequest | null> {
  const supabase = await createClient();

  const { data, error } = await supabase
    .schema("helpdesk")
    .from("requests")
    .update(buildUpdatePayload(patch))
    .eq("id", id)
    .select("*")
    .maybeSingle();

  if (error) throw error;
  return data ? fromRow(data as RequestRow) : null;
}

const FIELD_TO_COLUMN: Record<keyof HelpdeskRequest, string> = {
  id: "id",
  requesterId: "requester_id",
  requesterName: "requester_name",
  categoryId: "category_id",
  categoryLabel: "category_label",
  subcategoryId: "subcategory_id",
  subcategoryLabel: "subcategory_label",
  fields: "fields",
  pendingFieldId: "pending_field_id",
  originalMessage: "original_message",
  transcript: "transcript",
  notes: "notes",
  attachmentName: "attachment_name",
  status: "status",
  botReply: "bot_reply",
  hasPersonalInfo: "has_personal_info",
  prerequisiteConfirmed: "prerequisite_confirmed",
  supportAnswer: "support_answer",
  resolvedById: "resolved_by_id",
  resolvedByName: "resolved_by_name",
  resolvedAt: "resolved_at",
  createdAt: "created_at",
  updatedAt: "updated_at",
};

function buildUpdatePayload(patch: Partial<HelpdeskRequest>): Record<string, unknown> {
  const payload: Record<string, unknown> = {};
  // null도 "값을 지운다"는 의미의 유효한 갱신이므로 undefined만 건너뛴다 (완료 처리 취소 시 필요).
  for (const [key, value] of Object.entries(patch)) {
    if (value === undefined) continue;
    const column = FIELD_TO_COLUMN[key as keyof HelpdeskRequest];
    if (column) payload[column] = value;
  }
  payload.updated_at = new Date().toISOString();
  return payload;
}
