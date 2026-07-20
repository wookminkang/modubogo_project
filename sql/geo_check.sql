-- GEO(생성형 엔진 최적화) 노출 체크리스트.
-- 체크 대상 병원 1곳(geo_targets)에 키워드 N개(geo_keywords)를 등록해 두고,
-- 실행할 때마다 각 키워드를 ChatGPT(OpenAI web_search)에 그대로 물어본 뒤
-- 답변에 그 병원이 등장하는지 O/X로 판정(geo_run_results)해 실행 단위(geo_runs)로 이력을 남긴다.
--
-- 실행 방법: Supabase SQL 에디터에서 이 파일 하나를 위에서 아래로 그대로 실행.

-- 1) 체크 대상 병원. 키워드 N개 × 병원 1곳 구조라 대상이 실행의 루트가 된다.
create table if not exists geo_targets (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,                    -- 정식 병원명 (예: 리움한방병원)
  aliases     text[] not null default '{}',     -- 표기 흔들림 별칭 (예: {리움 한방병원, 리움병원})
  company     text,                             -- company_settings.company 와 느슨한 연결 (FK 아님)
  region      text,                             -- web_search 지역 힌트 (예: 광주) — 없으면 전국 기준
  memo        text,
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 2) 체크 키워드. 사용자가 실제로 ChatGPT에 던지는 문장 그대로 저장한다.
create table if not exists geo_keywords (
  id          uuid primary key default gen_random_uuid(),
  target_id   uuid not null references geo_targets(id) on delete cascade,
  keyword     text not null,                    -- 예: 둥촌동 요양병원 추천해줘
  active      boolean not null default true,    -- false = 다음 실행에서 제외(과거 이력은 유지)
  sort_order  int  not null default 0,
  created_at  timestamptz not null default now()
);

create index if not exists geo_keywords_target_idx
  on geo_keywords (target_id, sort_order);

-- 3) 실행 단위. 재실행 1회 = 1행이고, 노출률 추이 그래프의 x축이 된다.
create table if not exists geo_runs (
  id           uuid primary key default gen_random_uuid(),
  target_id    uuid not null references geo_targets(id) on delete cascade,
  status       text not null default 'running', -- running | done | partial | failed
  model        text,                            -- 실제 사용한 모델명 (기록용)
  total_count  int  not null default 0,
  found_count  int  not null default 0,
  failed_count int  not null default 0,
  started_by   text,                            -- 실행한 관리자 이름
  started_at   timestamptz not null default now(),
  finished_at  timestamptz
);

create index if not exists geo_runs_target_started_idx
  on geo_runs (target_id, started_at desc);

-- 4) 키워드 × 실행 = 체크리스트 한 칸.
--    답변 원문과 인용 출처까지 보존한다. 판정 로직을 나중에 고쳐도
--    API 재호출 없이 과거 데이터를 재판정할 수 있어야 하기 때문.
create table if not exists geo_run_results (
  id           uuid primary key default gen_random_uuid(),
  run_id       uuid not null references geo_runs(id) on delete cascade,
  keyword_id   uuid references geo_keywords(id) on delete set null,
  keyword_text text not null,                   -- 실행 시점 스냅샷 (키워드가 수정/삭제돼도 이력 보존)
  status       text not null default 'pending', -- pending | done | error
  found        boolean,                         -- 최종 O/X (null = 미판정)
  verdict      text,                            -- recommended | mentioned | negative | absent
  rank         int,                             -- 답변이 나열한 병원 중 등장 순번 (목록이 아니면 null)
  matched_text text,                            -- 답변에서 실제로 매칭된 표기
  match_by     text,                            -- code | llm | both | none — 판정 근거 추적
  needs_review boolean not null default false,  -- 코드 매칭과 LLM 판정이 엇갈리면 true
  answer_text  text,                            -- ChatGPT 답변 원문
  citations    jsonb not null default '[]'::jsonb, -- [{url,title}] web_search 인용 출처
  error        text,                            -- 실패 사유
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists geo_run_results_run_idx
  on geo_run_results (run_id);
create index if not exists geo_run_results_keyword_idx
  on geo_run_results (keyword_id, created_at desc);

-- PostgREST 스키마 캐시 즉시 갱신.
notify pgrst, 'reload schema';
