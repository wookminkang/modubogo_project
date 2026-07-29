"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "./admin";
import { saveOutsourcePayments, type OutsourcePaymentInput } from "./db";

/** [관리자] 외주비(정산) 시트 저장 — 빈 행은 호출부(시트)에서 걸러 보낸다. */
export async function savePaymentsAction(
  entries: OutsourcePaymentInput[],
): Promise<void> {
  if (!(await isAdmin())) throw new Error("권한이 없습니다.");
  await saveOutsourcePayments(entries);
  revalidatePath("/outsource");
}
