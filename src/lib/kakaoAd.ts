'use server';

const BALANCE_URL = 'https://apis.moment.kakao.com/openapi/v4/adAccounts/balance';

async function getAccessToken(): Promise<string> {
  const accessToken = process.env.KAKAO_ACCESS_TOKEN!;

  // 401 응답 시 Refresh Token으로 갱신
  const testRes = await fetch(`${BALANCE_URL}?adAccountId=0`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (testRes.status !== 401) return accessToken;

  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: process.env.KAKAO_REST_API_KEY!,
      client_secret: process.env.KAKAO_CLIENT_SECRET!,
      refresh_token: process.env.KAKAO_REFRESH_TOKEN!,
    }),
  });

  const data = await res.json();
  if (!data.access_token) throw new Error('카카오 토큰 갱신 실패');

  return data.access_token;
}

export async function getKakaoMomentBalance(adAccountId: string): Promise<number | null> {
  try {
    const accessToken = await getAccessToken();

    const res = await fetch(`${BALANCE_URL}?adAccountId=${adAccountId}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      next: { revalidate: 300 },
    });

    const data = await res.json();
    console.log(`[KakaoMoment API] status: ${res.status}`, JSON.stringify(data));

    if (!res.ok) return null;

    return data.balance ?? data.cashBalance ?? null;
  } catch (e) {
    console.error('[KakaoMoment API] error:', e);
    return null;
  }
}
