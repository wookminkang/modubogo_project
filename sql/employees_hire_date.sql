-- 직원 입사날짜. employees 테이블을 이미 만든 뒤 추가된 컬럼이라
-- 별도 마이그레이션으로 분리(employees_contact.sql / employees_leave_quota.sql 과 동일 컨벤션).
alter table public.employees
  add column if not exists hire_date date;

-- PostgREST 스키마 캐시 즉시 갱신(컬럼 추가 후 'schema cache' 에러 방지).
notify pgrst, 'reload schema';
