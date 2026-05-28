'use server';

import { updateKakaoAccessToken } from './db';

const BALANCE_URL = 'https://apis.moment.kakao.com/openapi/v4/adAccounts/balance';

export type KakaoCredentials = {
  company: string;
  kakao_ad_account_id: string;
  kakao_access_token: string;
  kakao_refresh_token: string;
  kakao_rest_api_key: string;
  kakao_client_secret: string;
};

async function getAccessToken(creds: KakaoCredentials): Promise<string> {
  const testRes = await fetch(`${BALANCE_URL}?adAccountId=0`, {
    headers: { Authorization: `Bearer ${creds.kakao_access_token}` },
  });

  if (testRes.status !== 401) return creds.kakao_access_token;

  const res = await fetch('https://kauth.kakao.com/oauth/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: creds.kakao_rest_api_key,
      client_secret: creds.kakao_client_secret,
      refresh_token: creds.kakao_refresh_token,
    }),
  });

  const data = await res.json();
  if (!data.access_token) throw new Error('카카오 토큰 갱신 실패');

  await updateKakaoAccessToken(creds.company, data.access_token);

  return data.access_token;
}

export async function getKakaoMomentBalance(creds: KakaoCredentials): Promise<number | null> {
  try {
    const accessToken = await getAccessToken(creds);

    const res = await fetch(`${BALANCE_URL}?adAccountId=${creds.kakao_ad_account_id}`, {
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
