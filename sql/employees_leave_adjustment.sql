-- 연차 수동 보정치. employees 테이블을 이미 만든 뒤 추가된 컬럼이라
-- 별도 마이그레이션으로 분리(employees_leave_quota.sql 과 동일 컨벤션).
--
-- computeEntitledLeaveDays()(근속 개월당 1일, 최대 11일)는 일반적인 근로기준법 60조
-- 방식만 표현한다. 수습기간 제외, 주말 출근 대체휴가 지급 등 회사별 예외는 공식으로
-- 표현할 수 없어 관리자가 직접 +/- 로 보정하는 값. 기본값 0(보정 없음).
alter table public.employees
  add column if not exists leave_adjustment_days numeric not null default 0;

-- PostgREST 스키마 캐시 즉시 갱신(컬럼 추가 후 'schema cache' 에러 방지).
notify pgrst, 'reload schema';
