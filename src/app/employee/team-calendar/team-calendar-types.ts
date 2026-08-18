import type { TeamEventCategory } from "@/lib/db";

/** 캘린더에 그릴 휴가 1건 (사유는 개인정보라 받지 않는다). */
export interface TeamLeaveItem {
  id: string;
  employeeId: string;
  employeeName: string;
  startDate: string; // 'YYYY-MM-DD'
  endDate: string; // 'YYYY-MM-DD'
  unit: "full" | "half_am" | "half_pm";
  status: "approved" | "pending";
}

export function unitLabel(unit: TeamLeaveItem["unit"]): string {
  return unit === "half_am" ? "오전반차" : unit === "half_pm" ? "오후반차" : "";
}

export const CATEGORY_META: Record<
  TeamEventCategory,
  { label: string; chip: string; dot: string }
> = {
  meeting: { label: "회의", chip: "bg-blue-50 text-blue-700", dot: "bg-blue-500" },
  client: { label: "미팅", chip: "bg-emerald-50 text-emerald-700", dot: "bg-emerald-500" },
  important: { label: "중요", chip: "bg-red-50 text-red-600", dot: "bg-red-500" },
  etc: { label: "기타", chip: "bg-gray-100 text-gray-600", dot: "bg-gray-400" },
};

export const CATEGORY_ORDER: TeamEventCategory[] = ["meeting", "client", "important", "etc"];
