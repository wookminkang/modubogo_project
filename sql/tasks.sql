-- ─────────────────────────────────────────────────────────────
-- 직원 업무 할당 (tasks)
-- 관리자(직원 관리 권한)가 직원에게 업무를 배정하고, 직원이 상태를
-- 대기(todo) → 처리중(in_progress) → 처리완료(done)로 갱신한다.
-- leave_requests 와 동일 컨벤션: 비밀정보 없고 서버 액션 경유로만
-- 접근하므로 RLS 없음(anon 클라이언트). 조회 함수는 테이블이 없으면
-- 빈 배열로 폴백하므로 이 SQL 실행 전에 배포해도 화면은 깨지지 않는다.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  employee_id  uuid not null references public.employees(id) on delete cascade,
  title        text not null,
  body         text not null default '',
  priority     text not null default 'normal' check (priority in ('high','normal','low')),
  status       text not null default 'todo' check (status in ('todo','in_progress','done')),
  assigned_by  uuid, -- admin_users.id (별도 계정 체계라 FK 없음)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  completed_at timestamptz
);

create index if not exists tasks_employee_idx on public.tasks (employee_id);
create index if not exists tasks_status_idx   on public.tasks (status);

-- 대시보드에서 실행하면 RLS가 켜진 채 생성될 수 있다 — anon 클라이언트 쓰기가
-- 전부 막히므로 명시적으로 꺼둔다 (leave_requests/work_logs와 동일 컨벤션).
alter table public.tasks disable row level security;

notify pgrst, 'reload schema';
