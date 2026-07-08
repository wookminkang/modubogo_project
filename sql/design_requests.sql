-- 외주(프리랜서) 디자이너 작업 요청서 — 관리자가 브리프를 작성하고
-- 디자이너는 공개 링크(/design/{nanoid})로 읽기 전용 조회한다.
--
-- 구조: 브리프의 텍스트/선택 항목은 content(jsonb)에 통째로 담고(필드는
-- src/lib/design-fields.ts 에서 정의), 첨부 리소스 파일 메타는 files(jsonb)에 담는다.
-- 이렇게 하면 필드가 늘어도 스키마 변경 없이 확장 가능하다.
create table if not exists design_requests (
  id          uuid primary key default gen_random_uuid(),
  nanoid      text unique not null,          -- 공개 링크 식별자
  title       text,                          -- 목록 표시용(작업명). 없으면 프로젝트명/기본값 폴백
  status      text not null default 'draft', -- draft(작성중) | sent(전달완료)
  content     jsonb not null default '{}'::jsonb, -- 브리프 텍스트/선택 값 (key → string | string[])
  files       jsonb not null default '{}'::jsonb, -- 리소스 첨부 메타 (key → {name,path,size}[])
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists design_requests_created_at_idx
  on design_requests (created_at desc);

-- PostgREST 스키마 캐시 즉시 갱신(테이블 추가 후 'schema cache' 에러 방지).
notify pgrst, 'reload schema';

-- ────────────────────────────────────────────────────────────
-- Storage 버킷: design-files (비공개)
--   관리자가 올린 리소스(로고/이미지 등)를 담는다. 공개 링크를 쓰지 않고
--   디자이너 뷰 렌더 시 서버에서 짧은 수명의 signed URL 을 발급한다.
--   Supabase 대시보드 > Storage 에서 'design-files' 버킷을 Private 로 1회 생성하거나
--   아래 SQL 을 실행한다.
-- insert into storage.buckets (id, name, public)
--   values ('design-files', 'design-files', false)
--   on conflict (id) do nothing;
