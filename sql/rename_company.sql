-- 병원 상호명(company) 변경 — 한 트랜잭션으로 연쇄 rename.
--
-- company_settings.company 는 PK 이면서 reports·ledger_entries 등 여러 테이블에
-- **텍스트 그대로** 복사돼 있는 느슨한 키다(FK 아님). 그래서 이름을 바꾸려면 모든
-- 테이블을 같이 갱신해야 하고, 중간에 실패하면 장부가 두 이름으로 쪼개진다.
-- supabase-js 는 여러 update 를 한 트랜잭션으로 묶을 수 없어 함수로 만든다.
--
-- 테이블이 없거나 company 컬럼이 없는 환경(부분 구축)에서도 안전하도록
-- to_regclass / information_schema 로 존재 여부를 확인하고 건너뛴다.

create or replace function rename_company(old_name text, new_name text)
returns void
language plpgsql
as $$
declare
  t          text;
  targets    text[] := array[
    'reports',
    'alimtalk_logs',
    'holiday_schedules',
    'holiday_submissions',
    'ledger_entries',
    'hospital_notes',
    'intake_submissions',
    'geo_targets'
  ];
begin
  if new_name is null or btrim(new_name) = '' then
    raise exception '새 상호명이 비어 있습니다.';
  end if;
  if old_name = new_name then
    return; -- 바뀐 게 없으면 조용히 종료
  end if;
  if not exists (select 1 from company_settings where company = old_name) then
    raise exception '병원을 찾을 수 없습니다: %', old_name;
  end if;
  if exists (select 1 from company_settings where company = new_name) then
    raise exception '이미 등록된 병원명입니다: %', new_name;
  end if;

  -- 핵심 레코드(PK) 먼저 갱신
  update company_settings set company = new_name where company = old_name;

  -- company 컬럼을 들고 있는 자식 테이블들
  foreach t in array targets loop
    if to_regclass(t) is not null
       and exists (
         select 1 from information_schema.columns
         where table_schema = 'public'
           and table_name = t
           and column_name = 'company'
       )
    then
      execute format('update %I set company = $1 where company = $2', t)
        using new_name, old_name;
    end if;
  end loop;

  -- 네이버 리뷰 스냅샷은 컬럼명이 name 이라 별도 처리
  if to_regclass('naver_review_history') is not null then
    update naver_review_history set name = new_name where name = old_name;
  end if;
end;
$$;

-- PostgREST 스키마 캐시 즉시 갱신.
notify pgrst, 'reload schema';
