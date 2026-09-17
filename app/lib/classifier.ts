// 개인정보로 취급해야 하는 패턴 (PRD 7번)
const PERSONAL_INFO_PATTERNS = [
  /01[016-9][-\s.]?\d{3,4}[-\s.]?\d{4}/, // 휴대전화번호
  /\d{6}[-\s]?[1-4]\d{6}/, // 주민등록번호
];

export function containsPersonalInfo(...values: (string | null | undefined)[]): boolean {
  const text = values.filter(Boolean).join("\n");
  return PERSONAL_INFO_PATTERNS.some((pattern) => pattern.test(text));
}
