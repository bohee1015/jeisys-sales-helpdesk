-- PostgREST가 사용하는 authenticated 롤에 helpdesk 스키마 접근 권한을 부여한다.
-- RLS 정책만으로는 부족하다 — Postgres의 스키마/테이블 GRANT가 선행되어야
-- RLS가 그 다음 단계로 행 단위 필터링을 적용한다.

grant usage on schema helpdesk to authenticated, service_role;

grant all on all tables in schema helpdesk to authenticated, service_role;
grant all on all sequences in schema helpdesk to authenticated, service_role;

alter default privileges in schema helpdesk
  grant all on tables to authenticated, service_role;
alter default privileges in schema helpdesk
  grant all on sequences to authenticated, service_role;
