-- ─────────────────────────────────────────────────────────────
-- 직원 업무 알림 확인 시각 (tasks_seen_at)
-- 상단바 종 아이콘의 N 배지 판단 기준: 이 시각 이후 created_at 인
-- tasks 가 있으면 "새 업무"로 본다. /employee/tasks 방문 시 갱신.
-- null 이면 아직 한 번도 확인 안 한 상태 → 모든 업무를 새 업무로 취급.
-- Supabase SQL 에디터에서 1회 실행 (employees.sql 이후 추가 마이그레이션).
-- 실행 전에 배포해도 화면은 깨지지 않는다 — 조회가 에러면 배지를 숨긴다.
-- ─────────────────────────────────────────────────────────────

alter table public.employees
  add column if not exists tasks_seen_at timestamptz;

notify pgrst, 'reload schema';
