-- 관리자 계정별 메뉴 권한 (제한 메뉴 허용 목록)
-- super는 코드에서 항상 전체 허용이므로 이 컬럼은 staff에게만 의미 있음.
-- 현재 제한 메뉴 키: 'holiday' (진료일정)
alter table admin_users
  add column if not exists allowed_menus text[] not null default '{}';

-- (선택) 특정 직원에게 진료일정 권한 부여 예시:
-- update admin_users set allowed_menus = array_append(allowed_menus, 'holiday')
--   where username = '아이디' and not ('holiday' = any(allowed_menus));
