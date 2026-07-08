-- 외주 디자이너 명단 + 요청서 담당자 배정.
-- 관리자가 디자이너를 등록해두고, 각 작업 요청서(design_requests)에 담당자를 지정한다.
-- (SQL: 먼저 sql/design_requests.sql 실행 후 이 파일 실행)

create table if not exists designers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  contact     text,                          -- 전화·이메일·카카오톡 등
  memo        text,                          -- 단가·스타일·특이사항 자유 메모
  active      boolean not null default true, -- 비활성(더 이상 안 씀) 표시용
  created_at  timestamptz not null default now()
);

-- 요청서 ↔ 담당 디자이너. 디자이너 삭제 시 배정만 해제(요청서는 유지).
alter table design_requests
  add column if not exists designer_id uuid references designers(id) on delete set null;

-- PostgREST 스키마 캐시 즉시 갱신.
notify pgrst, 'reload schema';
