import { findSubcategory, type FieldSpec } from "./categories";
import { containsPersonalInfo } from "./classifier";
import { extractAllFields, findFirstMissingField } from "./fieldExtraction";
import { classifyMultipleSubcategories, classifySubcategory } from "./nlp";
import { createRequest, getRequest, updateRequest } from "./store";
import type { ChatTurn, HelpdeskRequest, RequestStatus } from "./types";
import { parseYesNo } from "./yesNo";

function nowIso(): string {
  return new Date().toISOString();
}

function turn(role: ChatTurn["role"], text: string): ChatTurn {
  return { role, text, at: nowIso() };
}

function hasBatchim(word: string): boolean {
  const lastChar = word[word.length - 1];
  const code = lastChar?.charCodeAt(0) ?? 0;
  if (code < 0xac00 || code > 0xd7a3) return false;
  return (code - 0xac00) % 28 !== 0;
}

function josa(word: string, withBatchim: string, withoutBatchim: string): string {
  return hasBatchim(word) ? withBatchim : withoutBatchim;
}

function askText(field: FieldSpec): string {
  const particle = josa(field.label, "을", "를");
  if (field.type === "select" && field.options) {
    return `${field.label}${particle} ${field.options.join(" / ")} 중에서 알려주세요.`;
  }
  return `${field.label}${particle} 알려주세요.`;
}

export type ChatInput = {
  requesterId: string;
  requesterName: string;
  message: string;
  requestId?: string | null;
  categoryId?: string | null;
  subcategoryId?: string | null;
  originalMessage?: string | null;
};

export type ChatResult =
  | { kind: "need_category_pick"; botReply: string; originalMessage: string }
  | { kind: "request"; botReply: string; request: HelpdeskRequest }
  | { kind: "requests"; botReply: string; requests: HelpdeskRequest[] };

async function startNewRequest(
  requesterId: string,
  requesterName: string,
  categoryId: string,
  subcategoryId: string,
  text: string,
  /** 분류가 애매해 대분류/소분류를 직접 고른 경우, 원문 보기에 남길 앞선 대화 턴들 */
  leadingTurns: ChatTurn[] = []
): Promise<ChatResult> {
  const found = findSubcategory(categoryId, subcategoryId);
  if (!found) {
    return {
      kind: "need_category_pick",
      botReply: "분류를 다시 선택해 주세요.",
      originalMessage: text,
    };
  }
  const { category, subcategory } = found;
  const fields = extractAllFields(subcategory, text);
  const missing = findFirstMissingField(subcategory, fields);
  const hasPersonalInfo = containsPersonalInfo(...Object.values(fields));
  const timestamp = nowIso();

  let status: RequestStatus;
  let botReply: string;
  let pendingFieldId: string | null = null;

  if (missing) {
    status = "collecting_info";
    pendingFieldId = missing.id;
    botReply = `'${category.label} / ${subcategory.label}' 요청으로 확인했습니다. ${askText(missing)}`;
  } else if (subcategory.prerequisite) {
    status = "awaiting_prereq";
    botReply = `'${subcategory.label}' 요청을 확인했습니다. '${subcategory.prerequisite.label}'이 완료되었나요? (예/아니오)`;
  } else {
    status = "received";
    botReply = "접수되었습니다. 영업관리팀 담당자가 확인 후 처리합니다.";
  }

  const record: HelpdeskRequest = {
    id: crypto.randomUUID(),
    requesterId,
    requesterName,
    categoryId: category.id,
    categoryLabel: category.label,
    subcategoryId: subcategory.id,
    subcategoryLabel: subcategory.label,
    fields,
    pendingFieldId,
    originalMessage: text,
    transcript: [...leadingTurns, turn("user", text), turn("bot", botReply)],
    notes: null,
    attachmentName: null,
    status,
    botReply,
    hasPersonalInfo,
    prerequisiteConfirmed: null,
    supportAnswer: null,
    resolvedById: null,
    resolvedByName: null,
    resolvedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  await createRequest(record);
  return { kind: "request", botReply, request: record };
}

async function continueCollectingInfo(
  existing: HelpdeskRequest,
  answerText: string
): Promise<ChatResult> {
  const found = findSubcategory(existing.categoryId, existing.subcategoryId);
  if (!found || !existing.pendingFieldId) {
    const botReply = "접수되었습니다. 영업관리팀 담당자가 확인 후 처리합니다.";
    const updated = await updateRequest(existing.id, {
      status: "received",
      botReply,
      pendingFieldId: null,
      transcript: [...existing.transcript, turn("user", answerText), turn("bot", botReply)],
    });
    return { kind: "request", botReply, request: updated! };
  }

  const { subcategory } = found;
  const updatedFields = { ...existing.fields, [existing.pendingFieldId]: answerText.trim() };
  const missing = findFirstMissingField(subcategory, updatedFields);
  const hasPersonalInfo = existing.hasPersonalInfo || containsPersonalInfo(answerText);

  let status: RequestStatus;
  let botReply: string;
  let pendingFieldId: string | null = null;

  if (missing) {
    status = "collecting_info";
    pendingFieldId = missing.id;
    botReply = askText(missing);
  } else if (subcategory.prerequisite) {
    status = "awaiting_prereq";
    botReply = `'${subcategory.prerequisite.label}'이 완료되었나요? (예/아니오)`;
  } else {
    status = "received";
    botReply = "접수되었습니다. 영업관리팀 담당자가 확인 후 처리합니다.";
  }

  const updated = await updateRequest(existing.id, {
    fields: updatedFields,
    pendingFieldId,
    status,
    botReply,
    hasPersonalInfo,
    transcript: [...existing.transcript, turn("user", answerText), turn("bot", botReply)],
  });
  return { kind: "request", botReply, request: updated! };
}

async function answerPrerequisiteInChat(
  existing: HelpdeskRequest,
  answerText: string
): Promise<ChatResult> {
  const found = findSubcategory(existing.categoryId, existing.subcategoryId);
  const prerequisite = found?.subcategory.prerequisite;
  const answer = parseYesNo(answerText);

  if (answer === null) {
    const botReply = `'${prerequisite?.label ?? "선행 업무"}' 완료 여부를 '예' 또는 '아니오'로 답해주세요.`;
    const updated = await updateRequest(existing.id, {
      botReply,
      transcript: [...existing.transcript, turn("user", answerText), turn("bot", botReply)],
    });
    return { kind: "request", botReply, request: updated! };
  }

  if (!answer) {
    const botReply = prerequisite?.guide ?? "선행 업무 완료 후 다시 요청해 주세요.";
    const updated = await updateRequest(existing.id, {
      status: "on_hold",
      prerequisiteConfirmed: false,
      botReply,
      transcript: [...existing.transcript, turn("user", answerText), turn("bot", botReply)],
    });
    return { kind: "request", botReply, request: updated! };
  }

  const botReply = "확인되었습니다. 접수되었습니다. 영업관리팀 담당자가 확인 후 처리합니다.";
  const updated = await updateRequest(existing.id, {
    status: "received",
    prerequisiteConfirmed: true,
    botReply,
    transcript: [...existing.transcript, turn("user", answerText), turn("bot", botReply)],
  });
  return { kind: "request", botReply, request: updated! };
}

/** 요청자가 보낸 채팅 메시지 하나를 처리한다. 새 요청 시작 / 필수값 후속 답변 / 선행업무 확인 모두 이 함수를 거친다. */
export async function handleChatMessage(input: ChatInput): Promise<ChatResult> {
  const trimmed = input.message.trim();

  if (input.requestId) {
    const existing = await getRequest(input.requestId);
    if (existing) {
      if (existing.status === "collecting_info") {
        return continueCollectingInfo(existing, trimmed);
      }
      if (existing.status === "awaiting_prereq") {
        return answerPrerequisiteInChat(existing, trimmed);
      }
      // received/resolved/on_hold 상태라면 새 대화로 취급하고 아래로 진행한다.
    }
  }

  if (input.categoryId && input.subcategoryId) {
    const text = input.originalMessage?.trim() || trimmed;
    const found = findSubcategory(input.categoryId, input.subcategoryId);
    const clarifyBotReply = "어떤 업무에 대한 요청인지 확인이 필요합니다. 아래에서 선택해 주세요.";
    const pickLabel = found ? `${found.category.label} / ${found.subcategory.label}` : trimmed;
    const leadingTurns: ChatTurn[] = [
      turn("user", text),
      turn("bot", clarifyBotReply),
      turn("user", pickLabel),
    ];
    return startNewRequest(
      input.requesterId,
      input.requesterName,
      input.categoryId,
      input.subcategoryId,
      text,
      leadingTurns
    );
  }

  // "및"/"그리고"로 서로 다른 대분류의 요청이 한 메시지에 이어 붙은 경우(예: "파이프드라이브에
  // 거래처 추가 및 sap 등록 부탁드립니다") 요청을 나눠서 각각 접수한다.
  const multi = classifyMultipleSubcategories(trimmed);
  if (multi.length >= 2) {
    const requests: HelpdeskRequest[] = [];
    for (const candidate of multi) {
      const result = await startNewRequest(
        input.requesterId,
        input.requesterName,
        candidate.categoryId,
        candidate.subcategoryId,
        trimmed
      );
      if (result.kind === "request") requests.push(result.request);
    }
    const summary = requests
      .map((r, i) => `${i + 1}) '${r.categoryLabel} / ${r.subcategoryLabel}' — ${r.botReply}`)
      .join("\n");
    return {
      kind: "requests",
      botReply: `요청 내용에 서로 다른 업무가 있어 ${requests.length}건으로 나눠 접수했습니다.\n${summary}`,
      requests,
    };
  }

  const classified = classifySubcategory(trimmed);
  if (!classified) {
    return {
      kind: "need_category_pick",
      botReply: "어떤 업무에 대한 요청인지 확인이 필요합니다. 아래에서 선택해 주세요.",
      originalMessage: trimmed,
    };
  }

  return startNewRequest(
    input.requesterId,
    input.requesterName,
    classified.categoryId,
    classified.subcategoryId,
    trimmed
  );
}

export type NewRequestInput = {
  requesterId: string;
  requesterName: string;
  categoryId: string;
  subcategoryId: string;
  fields: Record<string, string>;
  notes: string | null;
};

export type ValidationError = { message: string };

/** 폼 등 구조화된 입력으로 요청을 한 번에 접수한다 (시드 데이터 등에 사용). */
export async function createHelpdeskRequest(
  input: NewRequestInput
): Promise<HelpdeskRequest | ValidationError> {
  const found = findSubcategory(input.categoryId, input.subcategoryId);
  if (!found) return { message: "존재하지 않는 분류입니다." };
  const { category, subcategory } = found;

  const missing = findFirstMissingField(subcategory, input.fields);
  if (missing) return { message: `${missing.label} 항목을 입력해 주세요.` };

  const hasPersonalInfo = containsPersonalInfo(...Object.values(input.fields), input.notes);
  const timestamp = nowIso();

  let status: RequestStatus = "received";
  let botReply = "접수했습니다. 영업관리팀 담당자가 확인 후 처리합니다.";
  if (subcategory.prerequisite) {
    status = "awaiting_prereq";
    botReply = `'${subcategory.label}' 요청을 접수했습니다. '${subcategory.prerequisite.label}' 완료 여부 확인이 필요합니다.`;
  }

  const summary = Object.values(input.fields).join(" / ");

  const record: HelpdeskRequest = {
    id: crypto.randomUUID(),
    requesterId: input.requesterId,
    requesterName: input.requesterName,
    categoryId: category.id,
    categoryLabel: category.label,
    subcategoryId: subcategory.id,
    subcategoryLabel: subcategory.label,
    fields: input.fields,
    pendingFieldId: null,
    originalMessage: summary,
    transcript: [turn("user", summary), turn("bot", botReply)],
    notes: input.notes,
    attachmentName: null,
    status,
    botReply,
    hasPersonalInfo,
    prerequisiteConfirmed: null,
    supportAnswer: null,
    resolvedById: null,
    resolvedByName: null,
    resolvedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
  };

  return createRequest(record);
}
