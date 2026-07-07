-- 입금·소진(ledger) 광고 배너 설정 — 회사(병원) 단위.
-- 관리자 편집 페이지에서 배너 노출 여부(enabled)와 클릭 시 이동할 링크(url)를 저장한다.
-- 컬럼이 없어도 앱은 무해하게 폴백(배너 미노출)하므로, 배너 기능을 켜려면 1회 실행 필요.
alter table company_settings
  add column if not exists ledger_ad_enabled boolean not null default false,
  add column if not exists ledger_ad_url text;

-- PostgREST 스키마 캐시 즉시 갱신(컬럼 추가 후 'schema cache' 에러 방지).
notify pgrst, 'reload schema';
