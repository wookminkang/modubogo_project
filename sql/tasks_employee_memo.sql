-- ─────────────────────────────────────────────────────────────
-- 할당 업무 직원 메모 (employee_memo)
-- 직원이 자기 업무 카드에 남기는 자유 메모(진행 상황·특이사항).
-- 작성/수정은 직원 본인만(서버 액션이 세션 employee_id 로 소유권 강제),
-- 관리자 화면(진행 현황 보드·할당 목록)에는 읽기 전용으로 표시된다.
-- Supabase SQL 에디터에서 1회 실행 (tasks.sql 이후 추가 마이그레이션).
-- ⚠️ TASK_SELECT 에 이 컬럼이 포함되므로 실행 전에는 업무 조회가 빈 배열로 폴백된다
--    — 배포 전에 반드시 실행할 것.
-- ─────────────────────────────────────────────────────────────

alter table public.tasks
  add column if not exists employee_memo text not null default '';

notify pgrst, 'reload schema';
