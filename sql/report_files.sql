-- 보고서 첨부파일 — reports 에 files(jsonb) 컬럼 추가.
-- 첨부 메타는 files.files = {name,path,size}[] 형태. 실제 파일은 design-files 버킷 재사용
--   (경로: report/{reportId}/...) → 별도 버킷 생성 불필요.
-- 컬럼이 없어도 앱은 무해하게 폴백(첨부 미표시)하므로, 기능을 켜려면 1회 실행 필요.
alter table reports
  add column if not exists files jsonb not null default '{}'::jsonb;

-- PostgREST 스키마 캐시 즉시 갱신.
notify pgrst, 'reload schema';
