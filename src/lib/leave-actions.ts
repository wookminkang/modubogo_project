"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import {
  createLeaveRequest,
  updateLeaveRequestStatus,
  deleteLeaveRequest,
  getLeaveRequestsByEmployee,
  type LeaveUnit,
} from "./db";
import { getEmployeeUser } from "./employee";
import { isAdmin } from "./admin";

/**
 * 휴가신청 등록. employeeId 는 클라이언트 입력이 아니라 세션(getEmployeeUser())에서
 * 확인한다 — 다른 직원 명의로 신청하는 것을 방지 (work log 저장과 동일 원칙).
 * 대기중/승인된 기존 신청과 기간이 겹치면 거부한다(중복 신청 방지).
 */
export async function submitLeaveRequest(formData: FormData) {
  const employee = await getEmployeeUser();
  if (!employee) redirect("/employee/login");

  const startDate = String(formData.get("startDate") ?? "");
  const unitInput = String(formData.get("unit") ?? "full");
  const unit: LeaveUnit =
    unitInput === "half_am" || unitInput === "half_pm" ? unitInput : "full";
  // 반차는 하루만 신청 가능 — 클라이언트가 보낸 종료일을 신뢰하지 않고 서버에서 강제한다.
  const endDate = unit === "full" ? String(formData.get("endDate") ?? "") : startDate;
  const reason = String(formData.get("reason") ?? "").trim();

  if (!startDate || !endDate) redirect("/employee/leave?error=missing");
  if (startDate > endDate) redirect("/employee/leave?error=range");

  const existing = await getLeaveRequestsByEmployee(employee.id);
  const overlaps = existing.some(
    (r) =>
      r.status !== "rejected" &&
      startDate <= r.end_date &&
      endDate >= r.start_date,
  );
  if (overlaps) redirect("/employee/leave?error=overlap");

  await createLeaveRequest(employee.id, startDate, endDate, reason, unit);
  revalidatePath("/employee/leave");
  redirect("/employee/leave?submitted=1");
}

/** 본인 휴가신청 취소(대기중인 건만). */
export async function cancelLeaveRequestAction(formData: FormData) {
  const employee = await getEmployeeUser();
  if (!employee) redirect("/employee/login");

  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await deleteLeaveRequest(id, employee.id);
  revalidatePath("/employee/leave");
}

/** 휴가신청 승인 (관리자 전용). */
export async function approveLeaveRequestAction(formData: FormData) {
  if (!(await isAdmin())) throw new Error("권한이 없습니다.");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await updateLeaveRequestStatus(id, "approved");
  revalidatePath("/admin/employees/leave");
}

/** 휴가신청 거절 (관리자 전용). */
export async function rejectLeaveRequestAction(formData: FormData) {
  if (!(await isAdmin())) throw new Error("권한이 없습니다.");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await updateLeaveRequestStatus(id, "rejected");
  revalidatePath("/admin/employees/leave");
}

/** 휴가신청 승인/거절 결정을 대기중으로 되돌리기 (관리자 전용, 오판 정정용). */
export async function revertLeaveRequestAction(formData: FormData) {
  if (!(await isAdmin())) throw new Error("권한이 없습니다.");
  const id = String(formData.get("id") ?? "");
  if (!id) return;

  await updateLeaveRequestStatus(id, "pending");
  revalidatePath("/admin/employees/leave");
}
