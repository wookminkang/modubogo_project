-- ─────────────────────────────────────────────────────────────
-- 병원별 입금·소진 관리내역 (구글시트 스타일 원장)
-- Supabase SQL 에디터에서 1회 실행.
-- 테이블이 없어도 앱은 폴백([])으로 동작하므로, 실행 전에도 깨지지 않는다.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.ledger_entries (
  id             uuid primary key default gen_random_uuid(),
  company        text not null,                 -- 병원(회사)명
  deposit_date   date,                          -- 입금/거래 날짜 (월별 요약 그룹핑 기준)
  vendor         text not null default '',      -- 업체명
  deposit_amount bigint,                        -- 입금 (VAT 포함, 원). 없으면 null
  spend_amount   bigint,                        -- 소진 (VAT 포함, 원). 없으면 null
  contract_note  text not null default '',      -- 계약내용
  sort_order     integer not null default 0,    -- 행 정렬 순서
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists ledger_entries_company_idx
  on public.ledger_entries (company);
create index if not exists ledger_entries_company_sort_idx
  on public.ledger_entries (company, sort_order);

-- RLS: 앱은 서버 액션 경유로만 접근하므로(anon/service 키) 별도 정책 없이 운영.
-- 프로젝트 컨벤션(reports/intake_submissions 등)과 동일.
