"use client";

import { useEffect, useRef, useState } from "react";
import {
  getSpeechRecognizer,
  speechErrorMessage,
  type SpeechRecognizer,
  type SpeechResultEvent,
} from "@/app/lib/speech";

type MicButtonProps = {
  /** 인식된 전체 문장을 넘긴다. 말하는 중에도 중간 결과가 계속 전달된다. */
  onTranscript: (text: string) => void;
  /** 녹음이 시작될 때(입력창의 기존 내용을 기준점으로 잡을 때) 한 번 호출된다. */
  onStart?: () => void;
  onError?: (message: string) => void;
  disabled?: boolean;
};

export default function MicButton({ onTranscript, onStart, onError, disabled }: MicButtonProps) {
  const [supported, setSupported] = useState(false);
  const [listening, setListening] = useState(false);
  const recognizerRef = useRef<SpeechRecognizer | null>(null);
  const finalTextRef = useRef("");

  // 지원 여부는 브라우저에서만 알 수 있어, 서버 렌더 결과(미지원)와 어긋나지 않게 마운트 후 판단한다.
  useEffect(() => {
    setSupported(getSpeechRecognizer() !== null);
    return () => recognizerRef.current?.abort();
  }, []);

  function stop() {
    recognizerRef.current?.stop();
    setListening(false);
  }

  function start() {
    const Recognizer = getSpeechRecognizer();
    if (!Recognizer) return;

    const recognizer = new Recognizer();
    recognizer.lang = "ko-KR";
    // 운전 중에는 말이 길게 이어지므로 중간에 끊기지 않도록 연속 인식으로 둔다.
    recognizer.continuous = true;
    recognizer.interimResults = true;
    recognizer.maxAlternatives = 1;

    finalTextRef.current = "";

    recognizer.onresult = (event: SpeechResultEvent) => {
      let interim = "";
      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const result = event.results[i];
        const text = result[0]?.transcript ?? "";
        if (result.isFinal) finalTextRef.current += text;
        else interim += text;
      }
      onTranscript((finalTextRef.current + interim).trim());
    };

    recognizer.onerror = (event) => {
      const message = speechErrorMessage(event.error);
      if (message) onError?.(message);
      setListening(false);
    };

    recognizer.onend = () => setListening(false);

    recognizerRef.current = recognizer;
    onStart?.();
    recognizer.start();
    setListening(true);
  }

  if (!supported) {
    return (
      <button
        type="button"
        disabled
        title="이 브라우저는 음성 입력을 지원하지 않습니다. 휴대폰 키보드의 마이크 버튼을 사용해 주세요."
        aria-label="음성 입력 미지원"
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-400 opacity-40"
      >
        <MicIcon />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={() => (listening ? stop() : start())}
      disabled={disabled}
      aria-pressed={listening}
      aria-label={listening ? "음성 입력 중지" : "음성으로 입력"}
      title={listening ? "다시 누르면 음성 입력이 끝납니다" : "음성으로 입력"}
      className={
        listening
          ? "flex h-9 w-9 shrink-0 animate-pulse items-center justify-center rounded-full bg-rose-500 text-white transition"
          : "flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-slate-500 transition hover:bg-white hover:text-primary disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-700"
      }
    >
      <MicIcon />
    </button>
  );
}

function MicIcon() {
  return (
    <svg
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z" />
      <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
      <line x1="12" y1="19" x2="12" y2="22" />
    </svg>
  );
}
