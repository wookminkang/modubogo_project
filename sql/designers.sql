-- 외주 파트너(디자이너·개발자) 명단 + 요청서 담당자 배정.
-- 관리자가 파트너를 등록해두고, 각 작업 요청서(design_requests)에 담당자를 지정한다.
-- 테이블명은 초기 스키마(designers)를 그대로 두고 role 로 디자이너/개발자를 구분한다.
-- (SQL: 먼저 sql/design_requests.sql 실행 후 이 파일 실행)

create table if not exists designers (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  contact     text,                          -- 전화·이메일·카카오톡 등
  memo        text,                          -- 단가·스타일·특이사항 자유 메모
  active      boolean not null default true, -- 비활성(더 이상 안 씀) 표시용
  created_at  timestamptz not null default now()
);

-- 파트너 구분(디자이너/개발자). 기존 행은 모두 디자이너로 채워진다.
alter table designers
  add column if not exists role text not null default 'designer';

alter table designers
  drop constraint if exists designers_role_check;
alter table designers
  add constraint designers_role_check check (role in ('designer', 'developer'));

-- 첨부파일 메타(design-files 버킷 partner/{id}/ 경로). 형식: { "files": [{name,path,size}] }
alter table designers
  add column if not exists files jsonb not null default '{}'::jsonb;

-- 요청서 ↔ 담당 디자이너. 디자이너 삭제 시 배정만 해제(요청서는 유지).
alter table design_requests
  add column if not exists designer_id uuid references designers(id) on delete set null;

-- PostgREST 스키마 캐시 즉시 갱신.
notify pgrst, 'reload schema';
