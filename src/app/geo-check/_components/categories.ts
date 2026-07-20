// 체크 키워드 분류. 체크리스트 표에서 색 배지로 묶어 보여준다.
// 등록되지 않은 값이 들어와도 회색으로 떨어지므로 여기 없는 분류를 써도 화면은 깨지지 않는다.

export const CATEGORY_STYLE: Record<string, string> = {
  지역: "bg-[#fdf0e0] text-[#8a5a00]",
  암종: "bg-[#dce9f7] text-[#1a4a7a]",
  프로그램: "bg-[#f0e4f0] text-[#6a3a6a]",
  증상: "bg-[#e2f0e0] text-[#2f6a2a]",
  브랜드: "bg-[#fce8e6] text-[#8a2a20]",
};

export const CATEGORY_FALLBACK = "bg-gray-100 text-gray-500";

export const CATEGORY_OPTIONS = Object.keys(CATEGORY_STYLE);

export function categoryClass(category: string | null | undefined): string {
  if (!category) return CATEGORY_FALLBACK;
  return CATEGORY_STYLE[category] ?? CATEGORY_FALLBACK;
}
