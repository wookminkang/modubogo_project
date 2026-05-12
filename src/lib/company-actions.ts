"use server";

import { upsertCompanySettings } from "./db";

export async function saveNaverAdSettings(data: {
  company: string;
  naver_ad_api_key: string;
  naver_ad_secret_key: string;
  naver_ad_customer_id: string;
}) {
  await upsertCompanySettings(data);
}
