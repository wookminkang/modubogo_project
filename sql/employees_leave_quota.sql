-- 직원별 연차(연간 부여일수) 관리. employees 테이블을 이미 만든 뒤 추가된 컬럼이라
-- 별도 마이그레이션으로 분리(employees_contact.sql 과 동일 컨벤션).
-- 기본값 15일 — 관리자가 /admin/employees 에서 직원별로 조정 가능.
alter table public.employees
  add column if not exists annual_leave_days numeric not null default 15;

-- PostgREST 스키마 캐시 즉시 갱신(컬럼 추가 후 'schema cache' 에러 방지).
notify pgrst, 'reload schema';
