-- GEO 체크 키워드에 분류·비고 추가 (체크리스트 표를 스프레드시트 형태로 보기 위함).
--   category — 지역 / 암종 / 프로그램 등. 표에서 색 배지로 묶어 보여준다.
--   memo     — 비고. 회차와 무관하게 키워드에 붙는 메모라 결과가 아닌 키워드에 둔다.
-- 컬럼이 없어도 앱은 무해하게 동작하므로(값이 null) 배포 후에 실행해도 된다.
--
-- 실행 방법: Supabase SQL 에디터에서 그대로 실행.

alter table geo_keywords add column if not exists category text;
alter table geo_keywords add column if not exists memo     text;

create index if not exists geo_keywords_category_idx
  on geo_keywords (target_id, category);

-- PostgREST 스키마 캐시 즉시 갱신.
notify pgrst, 'reload schema';
