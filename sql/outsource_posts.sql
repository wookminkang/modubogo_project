-- 외주 게시판 — 관리자용 내부 게시판(외주 관리 > 게시판 탭).
-- 제목/내용/작성자 + 첨부파일(files jsonb). 첨부는 design-files 버킷을 재사용한다
--   (경로: board/{postId}/...) → 별도 버킷 생성 불필요.
create table if not exists outsource_posts (
  id          uuid primary key default gen_random_uuid(),
  title       text,
  content     text,
  author      text,                          -- 작성 관리자 이름(작성 시 자동 기록)
  files       jsonb not null default '{}'::jsonb, -- 첨부 메타 (key "files" → {name,path,size}[])
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists outsource_posts_created_at_idx
  on outsource_posts (created_at desc);

-- PostgREST 스키마 캐시 즉시 갱신.
notify pgrst, 'reload schema';
