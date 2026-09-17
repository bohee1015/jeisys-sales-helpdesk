"use client";

import { useRef, useState } from "react";
import { CATEGORIES } from "@/app/lib/categories";
import { STATUS_LABEL, type HelpdeskRequest } from "@/app/lib/types";
import MicButton from "./MicButton";

type MessageContext = {
  title: string;
  lines: string[];
};

type ChatMessage = {
  id: string;
  role: "user" | "bot";
  text: string;
  /** 봇 답변에 딸리는 부가 정보(분류·상태 등). 레퍼런스 디자인의 컨텍스트 블록에 해당한다. */
  context?: MessageContext;
};

type CategoryPickState = {
  originalMessage: string;
  categoryId: string | null; // null이면 대분류를 고르는 단계
};

function contextOfRequest(request: HelpdeskRequest): MessageContext {
  return {
    title: "접수 정보",
    lines: [
      `분류: ${request.categoryLabel} / ${request.subcategoryLabel}`,
      `상태: ${STATUS_LABEL[request.status]}`,
      `접수번호: ${request.id.slice(0, 8)}`,
    ],
  };
}

export default function RequestChat({ onRequestUpdated }: { onRequestUpdated?: () => void } = {}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "intro",
      role: "bot",
      text: "안녕하세요. 영업 지원 헬프데스크입니다. 팀즈에 보내던 것처럼 요청 내용을 편하게 입력해 주세요.",
    },
  ]);
  const [input, setInput] = useState("");
  const [requestId, setRequestId] = useState<string | null>(null);
  const [awaitingPrereq, setAwaitingPrereq] = useState(false);
  const [categoryPick, setCategoryPick] = useState<CategoryPickState | null>(null);
  const [isSending, setIsSending] = useState(false);
  const [voiceNotice, setVoiceNotice] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  // 음성 입력은 기존에 타이핑해 둔 내용 뒤에 이어 붙인다.
  const voiceBaseRef = useRef("");

  function scrollToBottom() {
    requestAnimationFrame(() => {
      scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
    });
  }

  function addMessage(role: ChatMessage["role"], text: string, context?: MessageContext) {
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role, text, context }]);
  }

  async function callChatApi(body: Record<string, unknown>) {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error ?? "요청 처리에 실패했습니다.");
    return data as
      | { kind: "need_category_pick"; botReply: string; originalMessage: string }
      | { kind: "request"; botReply: string; request: HelpdeskRequest }
      | { kind: "requests"; botReply: string; requests: HelpdeskRequest[] };
  }

  function handleResult(result: Awaited<ReturnType<typeof callChatApi>>) {
    if (result.kind === "need_category_pick") {
      addMessage("bot", result.botReply);
      setCategoryPick({ originalMessage: result.originalMessage, categoryId: null });
      setRequestId(null);
      return;
    }

    setCategoryPick(null);

    if (result.kind === "requests") {
      addMessage("bot", result.botReply, {
        title: `접수 정보 (${result.requests.length}건)`,
        lines: result.requests.map(
          (r, index) =>
            `${index + 1}) ${r.categoryLabel} / ${r.subcategoryLabel} · ${STATUS_LABEL[r.status]}`
        ),
      });
      // 두 건으로 나뉜 경우, 아직 추가 확인이 필요한 첫 번째 요청만 이어서 대화한다.
      const ongoing = result.requests.find(
        (r) => r.status === "collecting_info" || r.status === "awaiting_prereq"
      );
      setRequestId(ongoing?.id ?? null);
      setAwaitingPrereq(ongoing?.status === "awaiting_prereq");
      onRequestUpdated?.();
      return;
    }

    const { request } = result;
    addMessage("bot", result.botReply, contextOfRequest(request));
    const stillOngoing = request.status === "collecting_info" || request.status === "awaiting_prereq";
    setRequestId(stillOngoing ? request.id : null);
    setAwaitingPrereq(request.status === "awaiting_prereq");
    onRequestUpdated?.();
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || isSending) return;

    addMessage("user", trimmed);
    setInput("");
    setVoiceNotice(null);
    setAwaitingPrereq(false);
    setIsSending(true);
    scrollToBottom();

    try {
      const result = await callChatApi({ message: trimmed, requestId });
      handleResult(result);
    } catch (error) {
      addMessage("bot", error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  }

  /** 접수가 끝나지 않은 요청을 요청자가 직접 취소한다. 분류 선택 단계는 아직 접수 전이라 화면만 정리한다. */
  async function cancelOngoing() {
    if (isSending) return;
    setIsSending(true);
    try {
      if (requestId) {
        const response = await fetch(`/api/requests/${requestId}/cancel`, { method: "POST" });
        if (!response.ok) {
          const data = await response.json();
          addMessage("bot", data.error ?? "취소하지 못했습니다.");
          return;
        }
      }
      setRequestId(null);
      setAwaitingPrereq(false);
      setCategoryPick(null);
      setInput("");
      addMessage("bot", "접수를 취소했습니다. 새로운 요청을 입력해 주세요.");
      onRequestUpdated?.();
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  }

  async function pickCategory(categoryId: string) {
    if (!categoryPick) return;
    const category = CATEGORIES.find((c) => c.id === categoryId);
    addMessage("user", category?.label ?? categoryId);
    scrollToBottom();

    // 소분류가 "기타" 하나뿐인 대분류(예: 대분류 "기타")는 한 번 더 고르게 하지 않고 바로 접수한다.
    if (category && category.subcategories.length === 1) {
      const only = category.subcategories[0];
      await pickSubcategory(categoryId, only.id, null);
      return;
    }

    setCategoryPick({ ...categoryPick, categoryId });
  }

  async function pickSubcategory(categoryId: string, subcategoryId: string, label: string | null) {
    if (!categoryPick) return;
    if (label) addMessage("user", label);
    setIsSending(true);
    scrollToBottom();
    try {
      const result = await callChatApi({
        message: categoryPick.originalMessage,
        categoryId,
        subcategoryId,
        originalMessage: categoryPick.originalMessage,
      });
      handleResult(result);
    } catch (error) {
      addMessage("bot", error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setIsSending(false);
      scrollToBottom();
    }
  }

  const pickingCategory = categoryPick && !categoryPick.categoryId;
  const pickingSubcategory = categoryPick?.categoryId
    ? CATEGORIES.find((c) => c.id === categoryPick.categoryId)
    : null;

  return (
    <div className="flex flex-col gap-2">
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_8px_30px_rgba(15,23,42,0.06)] dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-4 dark:border-slate-800">
          <span className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-primary to-[#3b5bc4] text-white">
            <SparkIcon />
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">헬프데스크 봇</p>
            <p className="flex items-center gap-1.5 text-xs font-medium text-secondary">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary" />
              온라인
            </p>
          </div>
        </div>

        <div ref={scrollRef} className="h-[400px] overflow-y-auto px-5 py-5">
          <ul className="flex flex-col gap-3">
            {messages.map((message) => (
              <li
                key={message.id}
                className={
                  (message.role === "user" ? "flex flex-col items-end" : "flex flex-col items-start") +
                  " animate-fade-in-up"
                }
              >
                <div
                  className={
                    message.role === "user"
                      ? "max-w-[80%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-primary/10 px-4 py-2.5 text-sm text-slate-800 dark:bg-primary/20 dark:text-slate-100"
                      : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-bl-md border border-slate-200/70 bg-slate-50 px-4 py-2.5 text-sm text-slate-800 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100"
                  }
                >
                  {message.text}
                </div>

                {message.context && (
                  <div className="mt-2 w-full max-w-[85%] rounded-r-lg border-l-[3px] border-primary bg-primary/[0.04] px-3.5 py-2.5 dark:bg-primary/10">
                    <p className="text-xs font-semibold text-primary">{message.context.title}</p>
                    <ul className="mt-1 flex flex-col gap-0.5">
                      {message.context.lines.map((line) => (
                        <li key={line} className="text-xs text-slate-500 dark:text-slate-400">
                          {line}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </li>
            ))}

            {isSending && (
              <li className="flex justify-start animate-fade-in-up">
                <div className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-slate-200/70 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-800">
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/40 [animation-delay:-0.3s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary/70 [animation-delay:-0.15s]" />
                  <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-primary" />
                </div>
              </li>
            )}
          </ul>

          {pickingCategory && (
            <div className="mt-3 flex flex-wrap gap-2">
              {CATEGORIES.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => pickCategory(c.id)}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm text-slate-700 transition hover:border-primary hover:text-primary dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {c.label}
                </button>
              ))}
            </div>
          )}

          {pickingSubcategory && (
            <div className="mt-3 flex flex-wrap gap-2">
              {pickingSubcategory.subcategories.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => pickSubcategory(pickingSubcategory.id, s.id, s.label)}
                  disabled={isSending}
                  className="rounded-full border border-slate-200 bg-white px-3.5 py-1.5 text-sm text-slate-700 transition hover:border-primary hover:text-primary disabled:opacity-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                >
                  {s.label}
                </button>
              ))}
            </div>
          )}

          {awaitingPrereq && !categoryPick && (
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={() => send("예")}
                disabled={isSending}
                className="btn-success rounded-full"
              >
                예, 완료했습니다
              </button>
              <button
                type="button"
                onClick={() => send("아니오")}
                disabled={isSending}
                className="rounded-full border border-slate-300 px-3.5 py-1.5 text-sm disabled:opacity-50 dark:border-slate-700"
              >
                아니오
              </button>
            </div>
          )}
        </div>

        {(requestId || categoryPick) && (
          <div className="flex justify-end border-t border-slate-100 px-5 pt-2.5 dark:border-slate-800">
            <button
              type="button"
              onClick={cancelOngoing}
              disabled={isSending}
              className="rounded-full border border-slate-300 px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-rose-400 hover:text-rose-600 disabled:opacity-40 dark:border-slate-700 dark:text-slate-300"
            >
              진행 중인 접수 취소
            </button>
          </div>
        )}

        <form
          onSubmit={(event) => {
            event.preventDefault();
            send(input);
          }}
          className="flex items-center gap-1 px-4 pb-3.5 pt-2.5"
        >
          <div className="flex w-full items-center gap-1 rounded-full bg-slate-100 py-1.5 pl-4 pr-1.5 transition focus-within:ring-2 focus-within:ring-primary/25 dark:bg-slate-800/80">
            <input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              onKeyDown={(event) => {
                // 한글 입력 중(IME 조합)에 눌린 Enter는 글자를 확정하는 키라 전송으로 보지 않는다.
                if (event.key !== "Enter" || event.nativeEvent.isComposing) return;
                event.preventDefault();
                send(input);
              }}
              disabled={Boolean(categoryPick)}
              placeholder="요청 내용을 입력하세요"
              className="w-full bg-transparent text-sm text-slate-900 outline-none placeholder:text-slate-400 disabled:opacity-50 dark:text-slate-100"
            />
            <MicButton
              disabled={isSending || Boolean(categoryPick)}
              onStart={() => {
                setVoiceNotice("듣는 중입니다. 말이 끝나면 버튼을 다시 눌러 주세요.");
                voiceBaseRef.current = input ? `${input.trim()} ` : "";
              }}
              onTranscript={(text) => setInput(voiceBaseRef.current + text)}
              onError={(message) => setVoiceNotice(message)}
            />
            <button
              type="submit"
              disabled={isSending || !input.trim() || Boolean(categoryPick)}
              aria-label="전송"
              title="전송"
              className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-white transition hover:bg-primary-hover active:translate-y-px disabled:opacity-40 disabled:active:translate-y-0"
            >
              <SendIcon />
            </button>
          </div>
        </form>
      </div>

      {voiceNotice && (
        <p className="px-1 text-xs text-slate-500 dark:text-slate-400">
          {voiceNotice} 운전 중에는 안전을 위해 정차 후 화면을 확인해 주세요.
        </p>
      )}
    </div>
  );
}

function SparkIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <circle cx="12" cy="12" r="3" />
      <circle cx="12" cy="4" r="1.4" />
      <circle cx="12" cy="20" r="1.4" />
      <circle cx="4" cy="12" r="1.4" />
      <circle cx="20" cy="12" r="1.4" />
      <circle cx="6.3" cy="6.3" r="1.2" />
      <circle cx="17.7" cy="17.7" r="1.2" />
      <circle cx="6.3" cy="17.7" r="1.2" />
      <circle cx="17.7" cy="6.3" r="1.2" />
    </svg>
  );
}

function SendIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 2 11 13" />
      <path d="M22 2 15 22l-4-9-9-4 20-7z" />
    </svg>
  );
}
