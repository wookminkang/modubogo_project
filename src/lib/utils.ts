import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 숫자를 2자리 0-패딩 문자열로 변환 (예: 7 → "07") */
export const pad = (n: number) => String(n).padStart(2, "0")

/** 'YYYY-MM-DD' 두 날짜 사이 일수(양끝 포함). 휴가 신청 일수 계산 등에 사용. */
export const daysInclusive = (start: string, end: string) =>
  Math.round(
    (new Date(`${end}T00:00:00Z`).getTime() - new Date(`${start}T00:00:00Z`).getTime()) /
      86400000,
  ) + 1

/**
 * 휴가 1건이 연차에서 차감되는 실제 일수. 반차(half_am/half_pm)는 항상 0.5일,
 * 종일(full)은 daysInclusive 그대로. 연차 잔여일수 계산·목록 표시 양쪽에서 재사용.
 */
export const leaveAmount = (request: {
  start_date: string;
  end_date: string;
  unit: "full" | "half_am" | "half_pm";
}) => (request.unit === "full" ? daysInclusive(request.start_date, request.end_date) : 0.5)

/** start 부터 end 까지 만료된(만근) 개월 수. 입사일 기준 근속 개월 계산용. */
export const monthsBetween = (start: string, end: string) => {
  const s = new Date(`${start}T00:00:00Z`);
  const e = new Date(`${end}T00:00:00Z`);
  let months = (e.getUTCFullYear() - s.getUTCFullYear()) * 12 + (e.getUTCMonth() - s.getUTCMonth());
  if (e.getUTCDate() < s.getUTCDate()) months -= 1;
  return Math.max(0, months);
};

/**
 * 근로기준법 60조 방식의 연차 부여일수: 입사 1년 미만은 만근 개월당 1일(최대 11일),
 * 1년 이상은 관리자가 설정한 연간 한도(annualLeaveDays)를 그대로 적용한다.
 * hireDate 가 없으면(입사일 미입력 레거시 계정) 근속을 계산할 수 없으니 연간 한도를 그대로 준다.
 */
export const computeEntitledLeaveDays = (
  hireDate: string | null,
  annualLeaveDays: number,
  asOf: string,
): number => {
  if (!hireDate) return annualLeaveDays;
  const monthsWorked = monthsBetween(hireDate, asOf);
  if (monthsWorked >= 12) return annualLeaveDays;
  return Math.min(monthsWorked, 11);
};
