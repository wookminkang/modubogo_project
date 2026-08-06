"use server";

import { revalidatePath } from "next/cache";
import { upsertWorkLog } from "./db";
import { getEmployeeUser } from "./employee";

/**
 * 업무일지 저장. employeeId 는 클라이언트에서 받지 않고 세션에서 직접 확인한다
 * (다른 직원 명의로 저장하는 것을 방지).
 */
export async function saveWorkLog(logDate: string, content: string): Promise<void> {
  const employee = await getEmployeeUser();
  if (!employee) throw new Error("로그인이 필요합니다.");
  if (!logDate) throw new Error("날짜를 선택해주세요.");

  await upsertWorkLog(employee.id, logDate, content);
  revalidatePath("/employee");
}
