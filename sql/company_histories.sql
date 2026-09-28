-- 병원별 히스토리. 보고서 공개 뷰(/report/{company}/{month})의 "히스토리" 탭에서
-- 원장님도 볼 수 있고, 관리자는 같은 화면에서 기록을 추가·수정·삭제한다.
--
-- 월이 아니라 **병원(company) 단위**라, 어느 달 보고서에서 열어도 같은 내역이 보인다.
-- company 는 reports.company 와 같은 텍스트 키 (이 프로젝트가 회사를 다루는 방식).
--
-- 실행 방법: Supabase SQL 에디터에서 이 파일 하나를 위에서 아래로 그대로 실행.

create table if not exists company_histories (
  id          uuid primary key default gen_random_uuid(),
  company     text not null,                       -- 병원명 (reports.company 와 동일한 키)
  happened_on date not null,                       -- 작업한 날짜
  title       text not null,                       -- 한 줄 제목
  body        text not null default '',            -- 상세 내용 (여러 줄)
  created_by  text,                                -- 기록한 관리자 이름
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- 병원별로 최근 날짜부터 훑는 조회가 전부다.
create index if not exists company_histories_company_date_idx
  on company_histories (company, happened_on desc, created_at desc);
