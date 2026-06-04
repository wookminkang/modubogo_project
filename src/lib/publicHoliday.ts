/**
 * 공공데이터포털 - 특일정보(getRestDeInfo)로 월별 공휴일을 조회한다.
 * https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo
 *
 * 환경변수 DATA_GO_KR_SERVICE_KEY(인코딩된 인증키) 필요.
 */

export interface PublicHoliday {
  date: string; // YYYY-MM-DD
  name: string; // 공휴일명 (예: 현충일)
}

export async function getPublicHolidays(
  year: number,
  month: number
): Promise<PublicHoliday[]> {
  const serviceKey = process.env.DATA_GO_KR_SERVICE_KEY;
  if (!serviceKey) {
    console.error(
      "[publicHoliday] DATA_GO_KR_SERVICE_KEY 환경변수가 없습니다. .env.local에 추가하세요."
    );
    return [];
  }

  const url =
    "https://apis.data.go.kr/B090041/openapi/service/SpcdeInfoService/getRestDeInfo" +
    `?solYear=${year}&solMonth=${String(month).padStart(2, "0")}` +
    `&numOfRows=50&_type=json&serviceKey=${serviceKey}`;

  try {
    // 공휴일은 자주 바뀌지 않으므로 하루 캐시
    const res = await fetch(url, { next: { revalidate: 60 * 60 * 24 } });
    if (!res.ok) {
      console.error("[publicHoliday] API 응답 오류:", res.status);
      return [];
    }

    const data = await res.json();
    const items = data?.response?.body?.items?.item;
    if (!items) return [];

    const arr = Array.isArray(items) ? items : [items];
    return arr
      .filter((it: { isHoliday?: string }) => it.isHoliday === "Y")
      .map((it: { locdate: number | string; dateName: string }) => {
        const s = String(it.locdate); // 예: "20260606"
        return {
          date: `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`,
          name: it.dateName,
        };
      })
      .sort((a, b) => a.date.localeCompare(b.date));
  } catch (e) {
    console.error("[publicHoliday] 조회 실패:", e);
    return [];
  }
}
