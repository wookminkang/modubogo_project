-- 직원 계정별 메뉴 권한 (직원 사이드바 확장 메뉴)
-- 현재 키: 'holiday' (진료일정) — 권한 있는 직원만 사이드바에 노출 + /holiday 접근 허용
alter table employees
  add column if not exists allowed_menus text[] not null default '{}';

-- mloik238(강민욱) 직원 계정에 진료일정 권한 부여
update employees
  set allowed_menus = array['holiday']
  where username = 'mloik238';
