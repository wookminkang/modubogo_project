import "server-only";
import { getAdminUser, canAccessMenu } from "./admin";
import { getEmployeeUser } from "./employee";

export type HolidayAccessor =
  | { kind: "admin" }
  | { kind: "employee" }
  | { kind: "guest" } // 미로그인
  | { kind: "denied"; from: "admin" | "employee" }; // 로그인했지만 권한 없음

/**
 * 진료일정(/holiday 관리 영역) 접근 판정.
 * 관리자(admin_session)와 직원(employee_session) 두 계정 체계를 모두 허용한다 —
 * 관리자는 allowed_menus('holiday'), 직원은 employees.allowed_menus('holiday') 기준.
 * 페이지는 kind에 따라 리다이렉트 대상을 고르고, 서버 액션은 admin/employee 외엔 거부한다.
 */
export async function getHolidayAccess(): Promise<HolidayAccessor> {
  const admin = await getAdminUser();
  if (admin) {
    return canAccessMenu(admin, "holiday")
      ? { kind: "admin" }
      : { kind: "denied", from: "admin" };
  }
  const employee = await getEmployeeUser();
  if (employee) {
    return employee.allowedMenus.includes("holiday")
      ? { kind: "employee" }
      : { kind: "denied", from: "employee" };
  }
  return { kind: "guest" };
}

/** 진료일정 접근 가능 여부만 필요할 때 (서버 액션 가드용). */
export async function hasHolidayAccess(): Promise<boolean> {
  const access = await getHolidayAccess();
  return access.kind === "admin" || access.kind === "employee";
}
