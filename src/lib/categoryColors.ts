const COLOR_MAP: Record<string, { bg: string; text: string }> = {
  검색광고: { bg: "bg-green-100", text: "text-green-700" },
  디스플레이: { bg: "bg-violet-100", text: "text-violet-700" },
  동영상: { bg: "bg-orange-100", text: "text-orange-700" },
  소셜: { bg: "bg-blue-100", text: "text-blue-700" },
  브랜드: { bg: "bg-yellow-100", text: "text-yellow-700" },
  오프라인: { bg: "bg-pink-100", text: "text-pink-700" },
  기타: { bg: "bg-gray-100", text: "text-gray-500" },
};

export function getCategoryColor(category: string) {
  return COLOR_MAP[category] ?? { bg: "bg-gray-100", text: "text-gray-500" };
}
