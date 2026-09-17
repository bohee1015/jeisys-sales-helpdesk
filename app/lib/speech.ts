// 브라우저 내장 음성인식(Web Speech API) 타입. 표준 DOM 타입에 아직 없거나 브라우저마다
// 접두사(webkit)가 달라, 실제로 쓰는 속성만 최소한으로 직접 정의한다.

export type SpeechRecognitionAlternative = {
  transcript: string;
  confidence: number;
};

export type SpeechRecognitionResultItem = {
  isFinal: boolean;
  length: number;
  [index: number]: SpeechRecognitionAlternative;
};

export type SpeechRecognitionResultList = {
  length: number;
  [index: number]: SpeechRecognitionResultItem;
};

export type SpeechResultEvent = {
  resultIndex: number;
  results: SpeechRecognitionResultList;
};

export type SpeechErrorEvent = {
  error: string;
  message?: string;
};

export type SpeechRecognizer = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  maxAlternatives: number;
  start: () => void;
  stop: () => void;
  abort: () => void;
  onresult: ((event: SpeechResultEvent) => void) | null;
  onerror: ((event: SpeechErrorEvent) => void) | null;
  onend: (() => void) | null;
};

type SpeechRecognizerConstructor = new () => SpeechRecognizer;

/** 이 브라우저가 음성인식을 지원하면 생성자를, 아니면 null을 돌려준다. */
export function getSpeechRecognizer(): SpeechRecognizerConstructor | null {
  if (typeof window === "undefined") return null;
  // 표준 DOM 타입과 충돌하지 않도록 unknown을 거쳐 우리 타입으로만 본다.
  const w = window as unknown as {
    SpeechRecognition?: SpeechRecognizerConstructor;
    webkitSpeechRecognition?: SpeechRecognizerConstructor;
  };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

/** 음성인식 오류 코드를 요청자가 바로 이해할 수 있는 안내 문구로 바꾼다. */
export function speechErrorMessage(code: string): string {
  switch (code) {
    case "not-allowed":
    case "service-not-allowed":
      return "마이크 사용이 차단되어 있습니다. 브라우저 주소창의 자물쇠 아이콘에서 마이크를 허용해 주세요.";
    case "no-speech":
      return "음성이 인식되지 않았습니다. 다시 눌러서 말씀해 주세요.";
    case "audio-capture":
      return "마이크를 찾을 수 없습니다. 마이크 연결을 확인해 주세요.";
    case "network":
      return "네트워크 문제로 음성 인식에 실패했습니다.";
    case "aborted":
      return "";
    default:
      return "음성 인식 중 문제가 발생했습니다. 직접 입력해 주세요.";
  }
}
