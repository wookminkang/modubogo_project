/**
 * 직원 계정 확장 메뉴 정의 — `employees.allowed_menus` 키의 단일 출처.
 * 서버/클라이언트 양쪽에서 import 가능(server-only 아님).
 * 새 메뉴를 열려면 여기에 항목을 추가하고 EmployeeSidebar EXTRA_NAV 에 아이콘/경로를 매칭한다.
 */
export const EMPLOYEE_MENUS = [
  { key: "holiday", label: "진료일정", description: "/holiday 진료일정 발송·회신 관리" },
] as const;

export type EmployeeMenuKey = (typeof EMPLOYEE_MENUS)[number]["key"];

export const EMPLOYEE_MENU_KEYS: string[] = EMPLOYEE_MENUS.map((m) => m.key);

export function isEmployeeMenuKey(value: string): value is EmployeeMenuKey {
  return EMPLOYEE_MENU_KEYS.includes(value);
}
