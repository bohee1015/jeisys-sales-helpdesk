-- 완료 처리자(누가 완료했는지)와 완료 시각을 기록하기 위한 컬럼 추가.
-- 관리자 화면의 "완료처리자별 필터"가 이 컬럼을 사용한다.
-- helpdesk 스키마 안에서만 변경한다 — 기존 public/pipedrive_dashboard/creditcalc은 건드리지 않는다.

alter table helpdesk.requests
  add column if not exists resolved_by_id uuid references auth.users(id),
  add column if not exists resolved_by_name text,
  add column if not exists resolved_at timestamptz;

create index if not exists requests_status_idx on helpdesk.requests (status);
create index if not exists requests_resolved_by_idx on helpdesk.requests (resolved_by_id);
