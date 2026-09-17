-- 영업 지원 헬프데스크 전용 스키마. 기존 public/pipedrive_dashboard/creditcalc 등은 건드리지 않는다.
-- profiles.role 검사에 기존 public.is_admin() 함수를 그대로 재사용한다.

create schema if not exists helpdesk;

create table helpdesk.requests (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users(id),
  requester_name text,
  category_id text not null,
  category_label text not null,
  subcategory_id text not null,
  subcategory_label text not null,
  fields jsonb not null default '{}',
  pending_field_id text,
  original_message text,
  transcript jsonb not null default '[]',
  notes text,
  attachment_name text,
  status text not null,
  bot_reply text,
  has_personal_info boolean not null default false,
  prerequisite_confirmed boolean,
  support_answer text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table helpdesk.faqs (
  id uuid primary key default gen_random_uuid(),
  question text not null,
  answer text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table helpdesk.requests enable row level security;
alter table helpdesk.faqs enable row level security;

create policy "requester can select/insert/update own"
  on helpdesk.requests
  for all
  using (requester_id = auth.uid())
  with check (requester_id = auth.uid());

create policy "admin can select/update all"
  on helpdesk.requests
  for all
  using (public.is_admin())
  with check (public.is_admin());

create policy "any logged-in user can read faqs"
  on helpdesk.faqs
  for select
  using (auth.role() = 'authenticated');

create policy "admin can write faqs"
  on helpdesk.faqs
  for all
  using (public.is_admin())
  with check (public.is_admin());
