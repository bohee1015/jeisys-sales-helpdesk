import { CATEGORIES } from "./categories";
import { STATUS_LABEL, type HelpdeskRequest } from "./types";

/** "2026-09" 형태의 월 키 */
export type MonthKey = string;

// 서버(Vercel)는 UTC라 getMonth()를 그대로 쓰면 월말 밤에 접수한 건이 전월로 밀린다. 한국 시간으로 본다.
const KST_OFFSET_MS = 9 * 60 * 60 * 1000;
const HOUR_MS = 60 * 60 * 1000;

function monthKeyOf(iso: string): MonthKey {
  const d = new Date(new Date(iso).getTime() + KST_OFFSET_MS);
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function monthLabel(key: MonthKey): string {
  const [year, month] = key.split("-");
  return `${year}년 ${Number(month)}월`;
}

export function shortMonthLabel(key: MonthKey): string {
  return `${Number(key.split("-")[1])}월`;
}

function shiftMonth(key: MonthKey, delta: number): MonthKey {
  const [year, month] = key.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1 + delta, 1));
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

function currentMonth(): MonthKey {
  return monthKeyOf(new Date().toISOString());
}

function hospitalOf(request: HelpdeskRequest): string {
  return request.fields.clientName || request.fields.vendorName || "-";
}

const FINAL_STATUSES = new Set(["resolved", "cancelled"]);

/** 완료까지 걸린 시간(시간 단위). 완료처리자 기록이 없는 옛 건은 갱신 시각으로 추정한다. */
function leadHours(request: HelpdeskRequest): { hours: number; estimated: boolean } | null {
  if (request.status !== "resolved") return null;
  const end = request.resolvedAt ?? request.updatedAt;
  const hours = (new Date(end).getTime() - new Date(request.createdAt).getTime()) / HOUR_MS;
  if (!Number.isFinite(hours) || hours < 0) return null;
  return { hours, estimated: !request.resolvedAt };
}

export type DashboardStats = {
  month: MonthKey;
  monthLabel: string;
  /** 선택 가능한 월 (데이터가 있는 월, 최신순) */
  months: MonthKey[];
  kpi: {
    total: number;
    prevTotal: number;
    open: number;
    oldestOpenHours: number | null;
    avgLeadHours: number | null;
    leadEstimated: boolean;
    onHold: number;
  };
  requesters: string[];
  categories: { id: string; label: string }[];
  /** grid[요청자 index][카테고리 index] = 건수 */
  grid: number[][];
  trend: { month: MonthKey; label: string; received: number; resolved: number }[];
  categoryTotals: { label: string; value: number }[];
  status: { key: string; label: string; value: number }[];
  resolvers: { name: string; count: number }[];
  waiting: {
    id: string;
    elapsedHours: number;
    categoryLabel: string;
    subcategoryLabel: string;
    hospital: string;
    requesterName: string;
    statusLabel: string;
    prerequisiteBlocked: boolean;
  }[];
};

export function buildDashboard(requests: HelpdeskRequest[], selectedMonth?: string): DashboardStats {
  const monthsWithData = [...new Set(requests.map((r) => monthKeyOf(r.createdAt)))].sort().reverse();
  const months = monthsWithData.length > 0 ? monthsWithData : [currentMonth()];
  const month = selectedMonth && months.includes(selectedMonth) ? selectedMonth : months[0];

  const inMonth = requests.filter((r) => monthKeyOf(r.createdAt) === month);
  const inPrevMonth = requests.filter((r) => monthKeyOf(r.createdAt) === shiftMonth(month, -1));
  const now = Date.now();

  const openOnes = inMonth.filter((r) => r.status === "received" || r.status === "in_progress");
  const oldestOpen = openOnes.reduce<number | null>((oldest, r) => {
    const hours = (now - new Date(r.createdAt).getTime()) / HOUR_MS;
    return oldest === null || hours > oldest ? hours : oldest;
  }, null);

  const leads = inMonth.map(leadHours).filter((l): l is { hours: number; estimated: boolean } => l !== null);
  const avgLeadHours =
    leads.length > 0 ? leads.reduce((sum, l) => sum + l.hours, 0) / leads.length : null;

  const requesters = [...new Set(inMonth.map((r) => r.requesterName).filter(Boolean))].sort();
  const categories = CATEGORIES.map((c) => ({ id: c.id, label: c.label }));
  const grid = requesters.map((name) =>
    categories.map(
      (c) => inMonth.filter((r) => r.requesterName === name && r.categoryId === c.id).length
    )
  );

  const trend = Array.from({ length: 6 }, (_, i) => shiftMonth(month, i - 5)).map((key) => {
    const rows = requests.filter((r) => monthKeyOf(r.createdAt) === key);
    return {
      month: key,
      label: shortMonthLabel(key),
      received: rows.length,
      resolved: rows.filter((r) => r.status === "resolved").length,
    };
  });

  const categoryTotals = categories
    .map((c) => ({ label: c.label, value: inMonth.filter((r) => r.categoryId === c.id).length }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);

  const countStatus = (...keys: string[]) => inMonth.filter((r) => keys.includes(r.status)).length;
  const status = [
    { key: "received", label: STATUS_LABEL.received, value: countStatus("received") },
    { key: "in_progress", label: STATUS_LABEL.in_progress, value: countStatus("in_progress") },
    { key: "resolved", label: STATUS_LABEL.resolved, value: countStatus("resolved") },
    {
      key: "other",
      label: "진행 중 · 보류 · 취소",
      value: countStatus("collecting_info", "awaiting_prereq", "on_hold", "cancelled"),
    },
  ];

  const resolverMap = new Map<string, number>();
  for (const r of inMonth) {
    if (r.status === "resolved" && r.resolvedByName) {
      resolverMap.set(r.resolvedByName, (resolverMap.get(r.resolvedByName) ?? 0) + 1);
    }
  }
  const resolvers = [...resolverMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count);

  // 오래 기다리는 요청은 월과 무관하게 지금 밀려 있는 것 전체를 본다.
  const waiting = requests
    .filter((r) => !FINAL_STATUSES.has(r.status))
    .map((r) => ({
      id: r.id,
      elapsedHours: (now - new Date(r.createdAt).getTime()) / HOUR_MS,
      categoryLabel: r.categoryLabel,
      subcategoryLabel: r.subcategoryLabel,
      hospital: hospitalOf(r),
      requesterName: r.requesterName,
      statusLabel: STATUS_LABEL[r.status],
      prerequisiteBlocked: r.status === "on_hold" || r.status === "awaiting_prereq",
    }))
    .filter((r) => r.elapsedHours >= 24)
    .sort((a, b) => b.elapsedHours - a.elapsedHours)
    .slice(0, 10);

  return {
    month,
    monthLabel: monthLabel(month),
    months,
    kpi: {
      total: inMonth.length,
      prevTotal: inPrevMonth.length,
      open: openOnes.length,
      oldestOpenHours: oldestOpen,
      avgLeadHours,
      leadEstimated: leads.some((l) => l.estimated),
      onHold: inMonth.filter((r) => r.status === "on_hold").length,
    },
    requesters,
    categories,
    grid,
    trend,
    categoryTotals,
    status,
    resolvers,
    waiting,
  };
}

/** "3일 2시간"처럼 읽기 쉬운 경과 시간 */
export function formatElapsed(hours: number): string {
  const days = Math.floor(hours / 24);
  const rest = Math.round(hours % 24);
  if (days > 0) return rest > 0 ? `${days}일 ${rest}시간` : `${days}일`;
  return `${Math.max(rest, 1)}시간`;
}
