import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/** 숫자를 2자리 0-패딩 문자열로 변환 (예: 7 → "07") */
export const pad = (n: number) => String(n).padStart(2, "0")
