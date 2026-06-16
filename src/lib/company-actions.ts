"use server";

import { revalidatePath } from "next/cache";
import {
  getCompanySettings,
  upsertCompanySettings,
  upsertHospitalInfo,
} from "./db";

/** 새 병원 등록. 동일 병원명이 이미 있으면 막는다. */
export async function createHospital(data: { company: string; region?: string }) {
  const company = data.company.trim();
  if (!company) throw new Error("병원명을 입력해주세요.");

  const existing = await getCompanySettings(company);
  if (existing) throw new Error("이미 등록된 병원이에요.");

  await upsertHospitalInfo({ company, region: data.region?.trim() || null });
  revalidatePath("/hospital");
}

/** 병원 정보 수정(지역). 병원명은 PK(보고서 참조)라 변경하지 않는다. */
export async function updateHospitalRegion(data: { company: string; region?: string }) {
  await upsertHospitalInfo({ company: data.company, region: data.region?.trim() || null });
  revalidatePath("/hospital");
  revalidatePath(`/hospital/${encodeURIComponent(data.company)}`);
}

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
