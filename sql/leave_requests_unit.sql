-- 반차(오전/오후) 지원. leave_requests 테이블을 이미 만든 뒤 추가된 컬럼이라
-- 별도 마이그레이션으로 분리(employees_contact.sql 과 동일 컨벤션).
-- 기본값 'full'(종일) — 기존 신청 데이터는 전부 종일로 취급된다.
alter table public.leave_requests
  add column if not exists unit text not null default 'full' check (unit in ('full', 'half_am', 'half_pm'));

-- PostgREST 스키마 캐시 즉시 갱신(컬럼 추가 후 'schema cache' 에러 방지).
notify pgrst, 'reload schema';
