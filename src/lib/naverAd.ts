'use server';

import crypto from 'crypto';

const BASE_URL = 'https://api.naver.com';

interface NaverCredentials {
  apiKey: string;
  secretKey: string;
  customerId: string;
}

function getEnvCredentials(): NaverCredentials {
  return {
    apiKey: process.env.NAVER_AD_API_KEY!,
    secretKey: process.env.NAVER_AD_SECRET_KEY!,
    customerId: process.env.NAVER_AD_CUSTOMER_ID!,
  };
}

function makeSignature(timestamp: string, method: string, uri: string, secretKey: string): string {
  const message = `${timestamp}.${method}.${uri}`;
  return crypto.createHmac('sha256', secretKey).update(message).digest('base64');
}

function buildHeaders(method: string, uri: string, creds: NaverCredentials) {
  const timestamp = Date.now().toString();
  const sigUri = uri.split('?')[0];
  return {
    'Content-Type': 'application/json',
    'X-Timestamp': timestamp,
    'X-API-KEY': creds.apiKey,
    'X-Customer': creds.customerId,
    'X-Signature': makeSignature(timestamp, method, sigUri, creds.secretKey),
  };
}

async function naverGet(uri: string, creds: NaverCredentials) {
  const res = await fetch(`${BASE_URL}${uri}`, {
    method: 'GET',
    headers: buildHeaders('GET', uri, creds),
  });
  const text = await res.text();
  if (!res.ok || !text) {
    console.error('[naverAd] error uri:', uri, `(${res.status})`);
    console.error('[naverAd] error response text:', text.slice(0, 300));
    throw new Error(`네이버 광고 API 오류 (${res.status})`);
  }
  return JSON.parse(text);
}

export async function getBizmoney(creds?: NaverCredentials): Promise<number> {
  const credentials = creds ?? getEnvCredentials();
  const uri = '/billing/bizmoney';
  const res = await fetch(`${BASE_URL}${uri}`, {
    method: 'GET',
    headers: buildHeaders('GET', uri, credentials),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.title ?? `네이버 광고 API 오류 (${res.status})`);
  }

  return json.bizmoney ?? json.availableBizmoney ?? json;
}

const CAMPAIGN_TP_PATTERN: Record<string, string> = {
  WEB_SITE: '-a001-01-',
  POWER_CONTENTS: '-a001-03-',
  PLACE: '-a001-06-',
};

function getDateRange(month: string): { since: string; until: string } {
  const [year, mon] = month.split('-');
  const today = new Date();
  const isCurrentMonth =
    today.getFullYear() === parseInt(year) && today.getMonth() + 1 === parseInt(mon);

  const since = `${year}${mon}01`;
  const until = isCurrentMonth
    ? `${year}${mon}${String(today.getDate()).padStart(2, '0')}`
    : `${year}${mon}${String(new Date(parseInt(year), parseInt(mon), 0).getDate()).padStart(2, '0')}`;

  return { since, until };
}

async function getAdCost(
  campaignTp: string,
  since: string,
  until: string,
  creds: NaverCredentials
): Promise<number> {
  const campaigns = await naverGet('/ncc/campaigns', creds);
  const idList = (Array.isArray(campaigns) ? campaigns : [])
    .map((c: { nccCampaignId: string }) => c.nccCampaignId);

  if (!idList.length) return 0;

  const ids = idList.join(',');
  const timeRange = encodeURIComponent(JSON.stringify({ since, until }));
  const fields = encodeURIComponent(JSON.stringify(['salesAmt']));
  const stats = await naverGet(`/stats?ids=${ids}&fields=${fields}&timeRange=${timeRange}`, creds);

  const pattern = CAMPAIGN_TP_PATTERN[campaignTp] ?? '';
  const rows: Array<{ id: string; salesAmt?: number }> = Array.isArray(stats?.data) ? stats.data : [];
  return Math.floor(
    rows
      .filter((item) => item.id.includes(pattern))
      .reduce((sum, item) => sum + (item.salesAmt ?? 0), 0)
  );
}

export async function getNaverAdCosts(
  month: string,
  credentials: { naver_ad_api_key: string; naver_ad_secret_key: string; naver_ad_customer_id: string }
): Promise<{ powerlink: number; place: number; powerContents: number }> {
  const { since, until } = getDateRange(month);
  const creds: NaverCredentials = {
    apiKey: credentials.naver_ad_api_key,
    secretKey: credentials.naver_ad_secret_key,
    customerId: credentials.naver_ad_customer_id,
  };
  const [powerlink, place, powerContents] = await Promise.all([
    getAdCost('WEB_SITE', since, until, creds),
    getAdCost('PLACE', since, until, creds),
    getAdCost('POWER_CONTENTS', since, until, creds),
  ]);
  return { powerlink, place, powerContents };
}

export async function getMonthlyAdCost(month: string, sinceOverride?: string, untilOverride?: string): Promise<number> {
  const [year, mon] = month.split('-');
  const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
  const since = sinceOverride ?? `${year}${mon}01`;
  const until = untilOverride ?? `${year}${mon}${String(lastDay).padStart(2, '0')}`;
  return getAdCost('WEB_SITE', since, until, getEnvCredentials());
}

export async function getPlaceAdCost(month: string, sinceOverride?: string, untilOverride?: string): Promise<number> {
  const [year, mon] = month.split('-');
  const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
  const since = sinceOverride ?? `${year}${mon}01`;
  const until = untilOverride ?? `${year}${mon}${String(lastDay).padStart(2, '0')}`;
  return getAdCost('PLACE', since, until, getEnvCredentials());
}

export async function getPowerContentsAdCost(month: string, sinceOverride?: string, untilOverride?: string): Promise<number> {
  const [year, mon] = month.split('-');
  const lastDay = new Date(parseInt(year), parseInt(mon), 0).getDate();
  const since = sinceOverride ?? `${year}${mon}01`;
  const until = untilOverride ?? `${year}${mon}${String(lastDay).padStart(2, '0')}`;
  return getAdCost('POWER_CONTENTS', since, until, getEnvCredentials());
}
