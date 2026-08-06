-- ─────────────────────────────────────────────────────────────
-- 직원별 업무일지 (자유 텍스트, 하루 1건).
-- Supabase SQL 에디터에서 1회 실행.
-- 테이블이 없어도 조회 함수는 폴백([]/null)으로 동작하므로, 실행 전에도 앱은 안 깨진다.
-- RLS 없음: 비밀정보 없고 서버 액션 경유로만 접근 (ledger_entries 와 동일 컨벤션).
-- ─────────────────────────────────────────────────────────────

create table if not exists public.work_logs (
  id          uuid primary key default gen_random_uuid(),
  employee_id uuid not null references public.employees(id) on delete cascade,
  log_date    date not null default current_date,
  content     text not null default '',
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create unique index if not exists work_logs_employee_date_idx
  on public.work_logs (employee_id, log_date);
create index if not exists work_logs_date_idx
  on public.work_logs (log_date);
