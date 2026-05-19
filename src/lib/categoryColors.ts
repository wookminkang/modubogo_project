export const DEFAULT_COLORS: Record<string, { bgHex: string; textHex: string }> = {
  검색광고: { bgHex: "#d1fae5", textHex: "#15803d" },
  디스플레이: { bgHex: "#ede9fe", textHex: "#6d28d9" },
  동영상:   { bgHex: "#ffedd5", textHex: "#c2410c" },
  소셜:    { bgHex: "#dbeafe", textHex: "#1d4ed8" },
  브랜드:   { bgHex: "#fef3c7", textHex: "#a16207" },
  오프라인:  { bgHex: "#fce7f3", textHex: "#be185d" },
  기타:    { bgHex: "#f3f4f6", textHex: "#6b7280" },
};

export const CATEGORIES = ["검색광고", "디스플레이", "동영상", "소셜", "브랜드", "오프라인", "기타"];

export function getCategoryColor(
  category: string,
  colorMap?: Record<string, { bgHex: string; textHex: string }>
) {
  const map = colorMap ?? DEFAULT_COLORS;
  return map[category] ?? { bgHex: "#f3f4f6", textHex: "#6b7280" };
}
