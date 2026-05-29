"use server";

import { getCompanySettings, upsertCompanySettings } from "./db";

export async function saveNaverAdSettings(data: {
  company: string;
  naver_ad_api_key: string;
  naver_ad_secret_key: string;
  naver_ad_customer_id: string;
}) {
  await upsertCompanySettings(data);
}

export async function saveDableSettings(data: {
  company: string;
  dable_api_key: string;
  dable_account: string;
}) {
  await upsertCompanySettings(data);
}

export async function saveAlimtalkSettings(data: {
  company: string;
  recipient1?: string;
  recipient2?: string;
  recipient3?: string;
}) {
  const existing = await getCompanySettings(data.company);
  await upsertCompanySettings({
    company: data.company,
    naver_ad_api_key: existing?.naver_ad_api_key ?? "",
    naver_ad_secret_key: existing?.naver_ad_secret_key ?? "",
    naver_ad_customer_id: existing?.naver_ad_customer_id ?? "",
    recipient1: data.recipient1 ?? "",
    recipient2: data.recipient2 ?? "",
    recipient3: data.recipient3 ?? "",
  });
}
