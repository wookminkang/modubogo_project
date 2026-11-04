-- 앱 전체에 하나뿐인 설정값 (key → JSON). 병원·월과 상관없는 전역 설정을 둔다.
--
-- 지금 쓰는 key:
--   report_section_order — 보고서 섹션 순서. 예) ["contracts","categories","validity"]
--     categories = 집행 항목, contracts = 광고 계약·리포트, validity = 광고 심의 및 운영 현황
--     관리자가 /report/{company}/{month}/edit 에서 드래그로 바꾸면 모든 병원 보고서에 똑같이 적용된다.
--     값이 없으면 기본 순서(집행 항목 → 광고 계약·리포트 → 광고 심의 및 운영 현황).
--
-- 실행 방법: Supabase SQL 에디터에서 이 파일 하나를 위에서 아래로 그대로 실행.

create table if not exists app_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now()
);
