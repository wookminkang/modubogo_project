-- GEO 체크: 공식 홈페이지 인용도 "노출"로 인정하기 위한 컬럼.
--
-- 답변 본문에 병원 이름이 안 나와도, ChatGPT 가 공식 홈페이지를 출처로 인용했다면
-- 그것도 노출로 본다. 그래서 대상에 공식 도메인을 등록해 두고(geo_targets.site_domains),
-- 각 결과에 "그날 홈페이지가 인용됐는지"를 남긴다(geo_run_results.site_cited).
--
-- 실행 방법: Supabase SQL 에디터에서 그대로 실행.

alter table geo_targets
  add column if not exists site_domains text[] not null default '{}';

alter table geo_run_results
  add column if not exists site_cited boolean not null default false;

-- PostgREST 스키마 캐시 즉시 갱신.
notify pgrst, 'reload schema';
