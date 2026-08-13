import type { TaskPriority, TaskStatus } from "./db";

// 업무 할당 화면들(관리자 할당/진행 현황, 직원 할당 업무)이 공유하는 라벨·칩 스타일.
// 칩 베이스 클래스: text-xs font-bold px-2.5 py-1 rounded-full

export const TASK_STATUS_LABEL: Record<TaskStatus, string> = {
  todo: "대기",
  in_progress: "처리중",
  done: "처리완료",
};

export const TASK_STATUS_CLASS: Record<TaskStatus, string> = {
  todo: "bg-orange-100 text-orange-600",
  in_progress: "bg-[#0e299c]/10 text-[#0e299c]",
  done: "bg-green-100 text-green-600",
};

export const TASK_PRIORITY_LABEL: Record<TaskPriority, string> = {
  high: "높음",
  normal: "보통",
  low: "낮음",
};

export const TASK_PRIORITY_CLASS: Record<TaskPriority, string> = {
  high: "bg-red-100 text-red-600",
  normal: "bg-gray-100 text-gray-500",
  low: "bg-gray-50 text-gray-400",
};

// 담당자 후보에서 우선 제외하는 테스트 계정(강민욱) — 실제 직원에게만 배정
export const EXCLUDED_ASSIGNEE_USERNAMES = new Set(["mloik238", "test1"]);
