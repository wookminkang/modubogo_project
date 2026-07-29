-- 외주비 (정산) — 외주 관리 > "외주비 (정산)" 탭의 구글시트식 내역.
-- 디자이너·개발자에게 나가는 비용을 건별로 기록한다.
-- (SQL: 먼저 sql/designers.sql 실행 후 이 파일 실행)
--
-- ⚠️ /ledger 의 "입금·소진"은 **광고주가 입금한 예산의 광고비 소진**이고,
--    이 테이블은 **우리가 외주 파트너에게 지급하는 비용**이라 서로 다른 장부다.

create table if not exists outsource_payments (
  id           uuid primary key default gen_random_uuid(),
  partner_id   uuid references designers(id) on delete set null, -- 파트너 삭제 시 링크만 해제
  partner_name text,                                -- 표시용 이름 스냅샷(파트너 삭제 후에도 유지)
  task_name    text,                                -- 작업명
  amount       bigint,                              -- 금액(원, VAT 포함). 미입력이면 null
  pay_date     date,                                -- 지급일(예정일 포함)
  paid         boolean not null default false,      -- 지급 완료 여부
  memo         text,
  sort_order   integer not null default 0,          -- 시트 행 순서
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists outsource_payments_sort_idx
  on outsource_payments (sort_order, created_at);

create index if not exists outsource_payments_partner_idx
  on outsource_payments (partner_id);

-- PostgREST 스키마 캐시 즉시 갱신.
notify pgrst, 'reload schema';
