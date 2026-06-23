-- ─────────────────────────────────────────────────────────────
-- 신규 광고주 준비자료 제출 폼 (구글폼 스타일)
-- Supabase SQL 에디터에서 1회 실행.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.intake_submissions (
  id          uuid primary key default gen_random_uuid(),
  nanoid      text unique not null,                 -- 공개 링크 식별자(/intake/{nanoid})
  company     text,                                 -- 병원명 (관리자 생성 시 또는 광고주가 입력)
  status      text not null default 'pending',      -- pending | submitted
  -- 텍스트(서술형) 항목
  billing_email    text,   -- 1. 계산서 발급 이메일
  medical_staff    text,   -- 4. 내부 의료진 현황
  inpatient_rooms  text,   -- 8. 입원실 구성
  equipment_list   text,   -- 9. 병원 내부 기기 목록(모델명)
  strengths        text,   -- 10. 병원 강점
  required_text    text,   -- 11. 필수 문구
  -- 파일 항목 메타데이터: { [fieldKey]: [{ name, path, size }, ...] }
  files       jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  submitted_at timestamptz
);

create index if not exists intake_submissions_nanoid_idx
  on public.intake_submissions (nanoid);
create index if not exists intake_submissions_created_idx
  on public.intake_submissions (created_at desc);

-- RLS: 서버(서버 액션)에서 service_role/anon 키로 접근.
-- 보고서/일정 테이블과 동일하게 운영하므로 정책은 프로젝트 컨벤션에 맞춰 설정.
-- (현재 앱은 서버 액션 경유로만 접근하므로 anon 키 정책 없이 service_role 사용 가능)

-- ─────────────────────────────────────────────────────────────
-- Storage 버킷 (비공개) — 사업자등록증/자격증/사진/로고 등 민감 파일 저장
-- 대시보드: Storage → New bucket → name "intake-files", Public 체크 해제
-- 또는 아래 SQL 로 생성:
-- ─────────────────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('intake-files', 'intake-files', false)
on conflict (id) do nothing;

-- 업로드/조회는 모두 서버에서 service_role 키로 수행하므로 별도 RLS 정책 불필요.
