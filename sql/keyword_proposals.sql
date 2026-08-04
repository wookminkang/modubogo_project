-- ─────────────────────────────────────────────────────────────
-- GEO 키워드 리포트 (/keyword) — 환자들이 ChatGPT 에 검색하는 키워드 추리 + 공유
-- Supabase SQL 에디터에서 1회 실행.
-- ─────────────────────────────────────────────────────────────

-- (정리) 이전 geo-work 기능은 폐기되었다. 테이블이 남아 있으면 함께 제거.
drop table if exists public.geo_work_keywords;
drop table if exists public.geo_work_projects;

-- 리포트 1건 = 병원 1곳에 대한 키워드 50개 + 설명 전체.
-- 키워드는 환자군별 그룹으로 groups(jsonb) 안에 통째로 저장한다
-- (개별 키워드를 편집·상태관리하지 않으므로 행으로 풀 필요가 없다).
create table if not exists public.keyword_proposals (
  id            uuid primary key default gen_random_uuid(),
  nanoid        text unique not null,              -- 공유 링크 식별자 (/keyword/{nanoid})
  hospital_name text not null,                     -- 병원명 (키워드에는 안 들어감)
  region        text not null,                     -- 지역 (예: 강동송파)
  field         text not null,                     -- 진료 분야·대상 환자 (예: 암 요양 / 교통사고·통증)
  summary       text not null,                     -- 키워드 선정 접근 설명
  why_geo       text not null,                     -- GEO 작업이 필요한 이유
  groups        jsonb not null default '[]'::jsonb, -- [{ title, reason, keywords: [".."] }]
  created_at    timestamptz not null default now()
);

create index if not exists keyword_proposals_nanoid_idx
  on public.keyword_proposals (nanoid);
create index if not exists keyword_proposals_created_idx
  on public.keyword_proposals (created_at desc);

-- RLS: 앱은 서버 액션 경유로만 접근하므로 service_role 사용, 별도 정책 불필요.
