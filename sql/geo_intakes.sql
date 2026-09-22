-- GEO 병원 정보 폼. 관리자가 병원별 링크(/geo-intake/{nanoid})를 만들어 보내면,
-- 병원 담당자가 퍼널(단계형) 화면에서 진료시간·의료진·키워드·계정 정보 등을 제출한다.
-- 문항은 코드(src/lib/geo-intake-fields.ts)에 고정이라 컬럼 대신 answers jsonb 한 칸에 담는다.
--
-- 실행 방법: Supabase SQL 에디터에서 이 파일 하나를 위에서 아래로 그대로 실행.

create table if not exists geo_intakes (
  id           uuid primary key default gen_random_uuid(),
  nanoid       text unique not null,                 -- 공개 링크 식별자 (/geo-intake/{nanoid})
  company      text,                                 -- 관리자가 링크 만들 때 입력한 병원명
  status       text not null default 'pending',      -- pending(대기) | submitted(제출완료)
  answers      jsonb not null default '{}'::jsonb,   -- { [fieldKey]: string }
  created_by   text,                                 -- 링크를 만든 관리자 이름 (기록용)
  created_at   timestamptz not null default now(),
  submitted_at timestamptz,
  consented_at timestamptz                           -- 개인정보 수집·이용 동의 시각 (제출 시 기록)
);

create index if not exists geo_intakes_created_idx
  on geo_intakes (created_at desc);

-- RLS on + 정책 없음 → anon 키(브라우저에 노출됨)로는 읽기·쓰기 모두 차단.
-- 앱은 서버에서 service_role(supabaseAdmin)로만 접근한다 (src/lib/geo-intake-db.ts).
-- FTP·CAFE24 계정 비밀번호가 들어오므로 끄지 말 것.
alter table geo_intakes enable row level security;

-- PostgREST 스키마 캐시 즉시 갱신.
notify pgrst, 'reload schema';
