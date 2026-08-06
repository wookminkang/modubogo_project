-- ─────────────────────────────────────────────────────────────
-- 직원 휴가신청 (기간 + 사유, 관리자 승인 필요).
-- Supabase SQL 에디터에서 1회 실행.
-- 테이블이 없어도 조회 함수는 폴백([])으로 동작하므로, 실행 전에도 앱은 안 깨진다.
-- RLS 없음: 비밀정보 없고 서버 액션 경유로만 접근 (work_logs 와 동일 컨벤션).
-- ─────────────────────────────────────────────────────────────

create table if not exists public.leave_requests (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  start_date  date not null,
  end_date    date not null,
  reason      text not null default '',
  status      text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);

create index if not exists leave_requests_employee_idx
  on public.leave_requests (employee_id);
create index if not exists leave_requests_status_idx
  on public.leave_requests (status);
