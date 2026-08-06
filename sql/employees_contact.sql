-- 직원 연락처(전화번호/이메일) 추가. employees 테이블을 이미 만든 뒤 추가된 컬럼이라
-- 별도 마이그레이션으로 분리(alimtalk_recipients_5.sql 과 동일 컨벤션).
-- 컬럼이 없어도 앱은 무해하게 폴백하지 않고 회원가입 저장이 실패하므로, 반드시 1회 실행 필요.
alter table public.employees
  add column if not exists phone text not null default '',
  add column if not exists email text not null default '';

-- PostgREST 스키마 캐시 즉시 갱신(컬럼 추가 후 'schema cache' 에러 방지).
notify pgrst, 'reload schema';
