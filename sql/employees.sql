-- ─────────────────────────────────────────────────────────────
-- 직원 계정 (업무일지 로그인용). admin_users 와 완전히 분리된 별도 테이블.
-- Supabase SQL 에디터에서 1회 실행.
-- password_hash 를 담으므로 admin_users 와 동일하게 RLS on + 정책 없음
-- (service_role/supabaseAdmin 으로만 접근, src/lib/employee.ts, employee-actions.ts).
-- ─────────────────────────────────────────────────────────────

create table if not exists public.employees (
  id            uuid primary key default gen_random_uuid(),
  username      text not null unique,
  name          text not null,
  phone         text not null default '',
  email         text not null default '',
  hire_date     date,
  password_hash text not null,
  status        text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  annual_leave_days numeric not null default 15,
  leave_adjustment_days numeric not null default 0,
  created_at    timestamptz not null default now(),
  approved_at   timestamptz
);

create index if not exists employees_status_idx
  on public.employees (status);

alter table public.employees enable row level security;
-- 정책 없음: anon 키로는 접근 불가, service_role 만 통과 (admin_users 와 동일 컨벤션)
