-- 알림톡 수신자 3명 → 5명 확장. company_settings 에 recipient4/5 추가.
-- 컬럼이 없어도 앱은 무해하게 폴백(빈 값)하므로, 5명 등록을 쓰려면 1회 실행 필요.
alter table company_settings
  add column if not exists recipient4 text,
  add column if not exists recipient5 text;

-- PostgREST 스키마 캐시 즉시 갱신(컬럼 추가 후 'schema cache' 에러 방지).
notify pgrst, 'reload schema';
