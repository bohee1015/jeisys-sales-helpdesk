import Link from "next/link";
import { formatElapsed, monthLabel, type DashboardStats } from "@/app/lib/dashboard";

// 교차표 칸 색: 건수가 많을수록 네이비를 진하게 (0은 비움)
const HEAT_ALPHA = [0, 0.1, 0.24, 0.42, 0.62, 0.88];

function heatStep(value: number, max: number): number {
  if (value === 0 || max === 0) return 0;
  const ratio = value / max;
  if (ratio <= 0.2) return 1;
  if (ratio <= 0.4) return 2;
  if (ratio <= 0.6) return 3;
  if (ratio <= 0.8) return 4;
  return 5;
}

function niceMax(value: number): number {
  if (value <= 5) return 5;
  const magnitude = 10 ** Math.floor(Math.log10(value));
  const step = magnitude / 2;
  return Math.ceil(value / step) * step;
}

function Card({
  title,
  note,
  wide,
  children,
}: {
  title: string;
  note?: string;
  wide?: boolean;
  children: React.ReactNode;
}) {
  return (
    <section className={`card flex min-w-0 flex-col gap-3 p-4 ${wide ? "md:col-span-2" : ""}`}>
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</h2>
        {note && <span className="text-xs text-slate-400">{note}</span>}
      </div>
      {children}
    </section>
  );
}

function Kpi({
  label,
  value,
  unit,
  sub,
  tone = "neutral",
}: {
  label: string;
  value: string;
  unit?: string;
  sub?: string;
  tone?: "neutral" | "good" | "alert";
}) {
  const subColor =
    tone === "good" ? "text-secondary" : tone === "alert" ? "text-rose-600" : "text-slate-400";
  return (
    <div className="card flex flex-col gap-0.5 p-4">
      <span className="text-xs text-slate-500 dark:text-slate-400">{label}</span>
      <span className="text-2xl font-bold tracking-tight tabular-nums text-slate-900 dark:text-slate-100">
        {value}
        {unit && <span className="ml-0.5 text-sm font-medium text-slate-500">{unit}</span>}
      </span>
      {sub && <span className={`text-xs tabular-nums ${subColor}`}>{sub}</span>}
    </div>
  );
}

function TrendChart({ trend }: { trend: DashboardStats["trend"] }) {
  const W = 680;
  const H = 200;
  const left = 34;
  const right = 12;
  const top = 14;
  const bottom = 26;
  const plotW = W - left - right;
  const plotH = H - top - bottom;
  const max = niceMax(Math.max(...trend.map((t) => Math.max(t.received, t.resolved)), 1));
  const yOf = (v: number) => top + plotH - (v / max) * plotH;
  const ticks = [0, max / 4, max / 2, (max * 3) / 4, max].map(Math.round);
  const slot = plotW / trend.length;
  const barW = Math.min(20, slot / 3);

  return (
    <div className="overflow-x-auto">
      <svg viewBox={`0 0 ${W} ${H}`} className="block w-full min-w-[520px]" role="img" aria-label="월별 접수·완료 추이">
        {ticks.map((v) => (
          <g key={v}>
            <line x1={left} x2={W - right} y1={yOf(v)} y2={yOf(v)} className="stroke-slate-200 dark:stroke-slate-700" strokeWidth="1" />
            <text x={left - 8} y={yOf(v) + 3} textAnchor="end" className="fill-slate-400 text-[10px] tabular-nums">
              {v}
            </text>
          </g>
        ))}
        {trend.map((t, i) => {
          const cx = left + slot * i + slot / 2;
          return (
            <g key={t.month}>
              <rect x={cx - barW - 1} y={yOf(t.received)} width={barW} height={Math.max(top + plotH - yOf(t.received), t.received ? 2 : 0)} rx="4" className="fill-primary">
                <title>{`${monthLabel(t.month)} 접수 ${t.received}건`}</title>
              </rect>
              <rect x={cx + 1} y={yOf(t.resolved)} width={barW} height={Math.max(top + plotH - yOf(t.resolved), t.resolved ? 2 : 0)} rx="4" className="fill-accent">
                <title>{`${monthLabel(t.month)} 완료 ${t.resolved}건`}</title>
              </rect>
              {t.received > 0 && (
                <text x={cx - barW / 2 - 1} y={yOf(t.received) - 5} textAnchor="middle" className="fill-slate-500 text-[11px] tabular-nums">
                  {t.received}
                </text>
              )}
              <text x={cx} y={H - 8} textAnchor="middle" className="fill-slate-400 text-[10px]">
                {t.label}
              </text>
            </g>
          );
        })}
      </svg>
    </div>
  );
}

function CategoryBars({ totals }: { totals: DashboardStats["categoryTotals"] }) {
  if (totals.length === 0) {
    return <p className="py-6 text-center text-sm text-slate-400">이 달에는 접수된 요청이 없습니다.</p>;
  }
  const W = 420;
  const rowH = 26;
  const left = 96;
  const right = 36;
  const top = 4;
  const H = top + totals.length * rowH + 4;
  const max = Math.max(...totals.map((t) => t.value), 1);
  const plotW = W - left - right;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="카테고리별 요청 건수">
      {totals.map((t, i) => {
        const y = top + i * rowH;
        const w = Math.max((t.value / max) * plotW, 2);
        return (
          <g key={t.label}>
            <text x={left - 10} y={y + 15} textAnchor="end" className="fill-slate-500 text-[11px]">
              {t.label}
            </text>
            <rect x={left} y={y + 4} width={w} height="15" rx="4" className="fill-primary">
              <title>{`${t.label} ${t.value}건`}</title>
            </rect>
            <text x={left + w + 7} y={y + 16} className="fill-slate-500 text-[11px] tabular-nums">
              {t.value}
            </text>
          </g>
        );
      })}
    </svg>
  );
}

const STATUS_COLOR: Record<string, string> = {
  received: "bg-sky-500",
  in_progress: "bg-primary",
  resolved: "bg-secondary",
  other: "bg-slate-400",
};

export default function DashboardView({ stats }: { stats: DashboardStats }) {
  const { kpi } = stats;
  const heatMax = Math.max(...stats.grid.flat(), 0);
  const totalDiff =
    kpi.prevTotal > 0 ? Math.round(((kpi.total - kpi.prevTotal) / kpi.prevTotal) * 100) : null;
  const statusTotal = stats.status.reduce((sum, s) => sum + s.value, 0);

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center gap-2">
        <div className="inline-flex gap-0.5 rounded-lg border border-slate-200 bg-surface p-0.5 dark:border-slate-700">
          {stats.months.slice(0, 6).map((m) => (
            <Link
              key={m}
              href={`/dashboard?month=${m}`}
              className={
                m === stats.month
                  ? "rounded-md bg-primary px-3 py-1.5 text-xs font-semibold text-white"
                  : "rounded-md px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-tertiary dark:text-slate-300"
              }
            >
              {m.replace("-", ".")}
            </Link>
          ))}
        </div>
        <span className="text-xs text-slate-400">{stats.monthLabel} 접수 기준</span>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Kpi
          label="이번 달 접수"
          value={String(kpi.total)}
          unit="건"
          sub={
            totalDiff === null
              ? `전월 ${kpi.prevTotal}건`
              : `전월 ${kpi.prevTotal}건 · ${totalDiff > 0 ? "+" : ""}${totalDiff}%`
          }
        />
        <Kpi
          label="미처리 (요청등록 + 처리중)"
          value={String(kpi.open)}
          unit="건"
          sub={
            kpi.oldestOpenHours === null
              ? "밀린 요청 없음"
              : `가장 오래된 건 ${formatElapsed(kpi.oldestOpenHours)} 경과`
          }
          tone={kpi.open > 0 && (kpi.oldestOpenHours ?? 0) >= 24 ? "alert" : "neutral"}
        />
        <Kpi
          label="평균 처리 소요"
          value={kpi.avgLeadHours === null ? "-" : kpi.avgLeadHours.toFixed(1)}
          unit={kpi.avgLeadHours === null ? undefined : "시간"}
          sub={
            kpi.avgLeadHours === null
              ? "완료된 건이 없음"
              : kpi.leadEstimated
                ? "완료처리자 기록 없는 옛 건은 추정 포함"
                : "접수 → 완료 처리까지"
          }
        />
        <Kpi
          label="선행 업무 미완료로 보류"
          value={String(kpi.onHold)}
          unit="건"
          sub="기안 승인 전에 들어온 출고 요청"
          tone={kpi.onHold > 0 ? "alert" : "neutral"}
        />
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <Card title="요청자 × 카테고리" note={`${stats.monthLabel} · 총 ${kpi.total}건`} wide>
          {stats.requesters.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">이 달에는 접수된 요청이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="border-separate border-spacing-[3px] text-xs tabular-nums">
                <thead>
                  <tr>
                    <th />
                    {stats.categories.map((c) => (
                      <th key={c.id} className="whitespace-nowrap px-1 font-medium text-slate-400">
                        {c.label}
                      </th>
                    ))}
                    <th className="px-1 font-semibold text-slate-700 dark:text-slate-200">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.requesters.map((name, r) => {
                    const row = stats.grid[r];
                    const sum = row.reduce((a, b) => a + b, 0);
                    return (
                      <tr key={name}>
                        <th className="whitespace-nowrap pr-2 text-right font-medium text-slate-600 dark:text-slate-300">
                          {name}
                        </th>
                        {row.map((value, c) => {
                          const step = heatStep(value, heatMax);
                          return (
                            <td
                              key={stats.categories[c].id}
                              title={`${name} · ${stats.categories[c].label} · ${value}건`}
                              style={{ backgroundColor: `rgba(31, 58, 147, ${HEAT_ALPHA[step]})` }}
                              className={`h-8 w-12 rounded-md text-center ${
                                step === 0
                                  ? "bg-tertiary text-transparent"
                                  : step >= 4
                                    ? "font-medium text-white"
                                    : "text-slate-700 dark:text-slate-100"
                              }`}
                            >
                              {value || "0"}
                            </td>
                          );
                        })}
                        <td className="text-center font-semibold text-slate-800 dark:text-slate-100">{sum}</td>
                      </tr>
                    );
                  })}
                  <tr>
                    <th className="pr-2 text-right font-semibold text-slate-700 dark:text-slate-200">합계</th>
                    {stats.categories.map((c, i) => (
                      <td key={c.id} className="text-center font-semibold text-slate-800 dark:text-slate-100">
                        {stats.grid.reduce((a, row) => a + row[i], 0)}
                      </td>
                    ))}
                    <td className="text-center font-bold text-primary">{kpi.total}</td>
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card title="월별 접수 · 완료 추이" note="최근 6개월 · 완료는 그 달 접수 건 중 완료된 수" wide>
          <div className="flex gap-4 text-xs text-slate-500">
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-sm bg-primary" />
              접수
            </span>
            <span className="flex items-center gap-1.5">
              <i className="inline-block h-2.5 w-2.5 rounded-sm bg-accent" />
              완료
            </span>
          </div>
          <TrendChart trend={stats.trend} />
        </Card>

        <Card title="카테고리별 건수" note={stats.monthLabel}>
          <CategoryBars totals={stats.categoryTotals} />
        </Card>

        <Card title="처리 상태" note="이번 달 접수 기준">
          {statusTotal === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">이 달에는 접수된 요청이 없습니다.</p>
          ) : (
            <>
              <div className="flex h-6 gap-0.5 overflow-hidden rounded-md">
                {stats.status
                  .filter((s) => s.value > 0)
                  .map((s) => (
                    <div
                      key={s.key}
                      title={`${s.label} ${s.value}건`}
                      style={{ width: `${(s.value / statusTotal) * 100}%` }}
                      className={`flex items-center justify-center text-[11px] font-medium text-white ${STATUS_COLOR[s.key]}`}
                    >
                      {s.value / statusTotal >= 0.12 ? s.value : ""}
                    </div>
                  ))}
              </div>
              <div className="flex flex-wrap gap-3 text-xs text-slate-500">
                {stats.status.map((s) => (
                  <span key={s.key} className="flex items-center gap-1.5">
                    <i className={`inline-block h-2.5 w-2.5 rounded-sm ${STATUS_COLOR[s.key]}`} />
                    {s.label} {s.value}
                  </span>
                ))}
              </div>
            </>
          )}

          <div className="mt-1 border-t border-slate-100 pt-3 dark:border-slate-800">
            <p className="mb-1.5 text-xs font-medium text-slate-400">완료처리자별 완료 건수</p>
            {stats.resolvers.length === 0 ? (
              <p className="text-xs text-slate-400">이 달에 완료 처리된 건이 없습니다.</p>
            ) : (
              <ul className="flex flex-col gap-1 text-sm">
                {stats.resolvers.map((r) => (
                  <li key={r.name} className="flex justify-between">
                    <span className="text-slate-700 dark:text-slate-200">{r.name}</span>
                    <span className="tabular-nums text-slate-500">{r.count}건</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>

        <Card title="오래 기다리는 요청" note="접수 후 24시간 이상 미완료 · 월과 무관" wide>
          {stats.waiting.length === 0 ? (
            <p className="py-6 text-center text-sm text-slate-400">24시간 넘게 기다리는 요청이 없습니다.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 text-left text-xs font-medium text-slate-400 dark:border-slate-700">
                    <th className="pb-2">경과</th>
                    <th className="pb-2">카테고리</th>
                    <th className="pb-2">병원명</th>
                    <th className="pb-2">요청자</th>
                    <th className="pb-2">상태</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.waiting.map((w) => (
                    <tr key={w.id} className="border-b border-slate-100 last:border-0 dark:border-slate-800">
                      <td className="py-2 tabular-nums text-slate-600 dark:text-slate-300">{formatElapsed(w.elapsedHours)}</td>
                      <td className="py-2 text-slate-500">{w.categoryLabel} / {w.subcategoryLabel}</td>
                      <td className="py-2 font-medium text-slate-800 dark:text-slate-100">{w.hospital}</td>
                      <td className="py-2 text-slate-500">{w.requesterName}</td>
                      <td className="py-2">
                        <span
                          className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                            w.prerequisiteBlocked ? "bg-rose-100 text-rose-700" : "bg-primary/10 text-primary"
                          }`}
                        >
                          {w.statusLabel}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
