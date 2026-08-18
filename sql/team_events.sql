-- ─────────────────────────────────────────────────────────────
-- 팀 캘린더 일정 (회의·미팅·중요 일정). 직원 누구나 등록, 작성자만 수정/삭제.
-- Supabase SQL 에디터에서 1회 실행. 테이블이 없어도 조회는 폴백([])으로 동작.
-- RLS 없음: 비밀정보 없고 서버 액션 경유로만 접근 (leave_requests 와 동일 컨벤션).
-- ─────────────────────────────────────────────────────────────

create table if not exists public.team_events (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  event_date  date not null,
  start_time  text,                       -- 'HH:mm' (없으면 종일)
  end_time    text,                       -- 'HH:mm'
  category    text not null default 'meeting'
              check (category in ('meeting', 'client', 'important', 'etc')),
  memo        text not null default '',
  created_by  uuid not null references public.employees(id) on delete cascade,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists team_events_date_idx on public.team_events (event_date);
