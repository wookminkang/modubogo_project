-- ─────────────────────────────────────────────────────────────
-- 직원 개인 투두리스트 (칸반보드). tasks(관리자 배정)와 별개로,
-- 직원 본인이 스스로 등록·이동·삭제하는 셀프 투두.
-- Supabase SQL 에디터에서 1회 실행. 테이블 없어도 조회는 폴백([]).
-- RLS 없음: 비밀정보 없고 서버 액션 경유로만 접근 (tasks 와 동일 컨벤션).
-- ─────────────────────────────────────────────────────────────

create table if not exists public.employee_todos (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.employees(id) on delete cascade,
  title        text not null,
  memo         text not null default '',
  status       text not null default 'todo' check (status in ('todo', 'in_progress', 'done')),
  priority     text not null default 'normal' check (priority in ('high', 'normal', 'low')),
  due_date     date,                              -- 선택 마감일
  created_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists employee_todos_employee_idx
  on public.employee_todos (employee_id, created_at desc);
