import {
  extractAddress,
  extractAmount,
  extractClientName,
  extractDate,
  extractDatetimePair,
  extractDeliveryMethod,
  extractDirectorName,
  extractLeasingCompany,
  extractPercent,
  extractPhone,
  extractProductPhrase,
  extractRecipient,
  extractRegistrationType,
  extractShipPurpose,
} from "./extract";
import type { Subcategory } from "./categories";

// 설명형 자유 텍스트 필드는 별도 추출 없이 메시지 원문을 그대로 값으로 쓴다.
const AUTOFILL_FROM_MESSAGE = new Set([
  "changeContent",
  "specialContent",
  "errorContent",
  "content",
]);

function deriveTitle(message: string): string {
  const firstLine = message.split(/\r?\n/)[0]?.trim() ?? "";
  return firstLine.slice(0, 30) || "기타 문의";
}

/**
 * 메시지에서 소분류가 요구하는 필드값을 최대한 채워 넣는다.
 * 정규식/키워드 기반이라 완벽하지 않으며, 못 찾은 필드는 결과에서 비운다 (챗봇이 되묻는다).
 */
export function extractAllFields(
  subcategory: Subcategory,
  message: string,
  /** 날짜 계산의 기준일. 테스트에서 고정하기 위해 받는다. */
  reference: Date = new Date()
): Record<string, string> {
  const clientName = extractClientName(message);
  const result: Record<string, string> = {};

  // 데모 신규등록은 문장에 등장하는 순서대로 설치일 → 회수일로 짝지어 찾는다.
  const [installDatetime, recoveryDatetime] = extractDatetimePair(message, reference);

  for (const field of subcategory.fields) {
    let value: string | null = null;

    if (AUTOFILL_FROM_MESSAGE.has(field.id)) {
      value = message.trim();
    } else if (field.id === "title") {
      value = deriveTitle(message);
    } else {
      switch (field.id) {
        case "clientName":
          value = clientName;
          break;
        case "directorName":
          value = extractDirectorName(message);
          break;
        case "directorPhone":
        case "vendorContactPhone":
          value = extractPhone(message);
          break;
        case "leasingCompany":
          value = extractLeasingCompany(message);
          break;
        case "leaseAmount":
        case "amount":
          value = extractAmount(message);
          break;
        case "discountRate":
          value = extractPercent(message);
          break;
        case "equipmentName":
        case "equipmentQty":
        case "preShipItems":
        case "itemsQty":
        case "item":
        case "recoveryEquipment":
          value = extractProductPhrase(message);
          break;
        case "neededBy":
        case "changeDate":
        case "recoveryDate":
          value = extractDate(message, reference);
          break;
        case "installDatetime":
          value = installDatetime;
          break;
        case "recoveryDatetime":
          value = recoveryDatetime;
          break;
        case "deliveryMethod":
          value = extractDeliveryMethod(message);
          break;
        case "recipient":
          value = extractRecipient(message, clientName !== null);
          break;
        case "shipPurpose":
          value = extractShipPurpose(message);
          break;
        case "registrationType":
          value = extractRegistrationType(message);
          break;
        case "address":
          value = extractAddress(message);
          break;
        default:
          value = null;
      }
    }

    if (value) result[field.id] = value;
  }

  return result;
}

export function findFirstMissingField(subcategory: Subcategory, fields: Record<string, string>) {
  return subcategory.fields.find((field) => field.required && !fields[field.id]?.trim()) ?? null;
}
