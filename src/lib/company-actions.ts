"use server";

import { revalidatePath } from "next/cache";
import {
  getCompanySettings,
  upsertCompanySettings,
  upsertHospitalInfo,
  updateCompanyHospitalType,
  ensureCompanyNanoid,
  addHospitalNote,
  deleteHospitalNote,
  deleteHospitalCompletely,
  type HospitalNote,
} from "./db";
import { getAdminUser } from "./admin";

/** 새 병원 등록. 동일 병원명이 이미 있으면 막는다. */
export async function createHospital(data: {
  company: string;
  region?: string;
  hospitalType?: string;
}) {
  const company = data.company.trim();
  if (!company) throw new Error("병원명을 입력해주세요.");

  const existing = await getCompanySettings(company);
  if (existing) throw new Error("이미 등록된 병원이에요.");

  await upsertHospitalInfo({ company, region: data.region?.trim() || null });
  // URL 식별자(nanoid) 발급 (컬럼 없으면 무시됨)
  await ensureCompanyNanoid(company);
  // 유형(카테고리)이 선택됐으면 회사 단위로 저장 (컬럼 없으면 폴백 처리됨)
  if (data.hospitalType) {
    await updateCompanyHospitalType(company, data.hospitalType);
  }
  revalidatePath("/hospital");
}

/**
 * 병원 삭제. 연관 데이터(보고서·진료일정·입금소진·메모 등)까지 함께 제거한다.
 * 되돌릴 수 없는 작업이므로 관리자만 실행할 수 있게 가드한다.
 */
export async function removeHospital(company: string) {
  const admin = await getAdminUser();
  if (!admin) throw new Error("권한이 없습니다.");

  const name = company?.trim();
  if (!name) throw new Error("병원명이 필요합니다.");

  await deleteHospitalCompletely(name);
  revalidatePath("/hospital");
  revalidatePath("/report");
}

/** 병원 정보 수정(지역). 병원명은 PK(보고서 참조)라 변경하지 않는다. */
export async function updateHospitalRegion(data: { company: string; region?: string }) {
  await upsertHospitalInfo({ company: data.company, region: data.region?.trim() || null });
  revalidatePath("/hospital");
  revalidatePath(`/hospital/${encodeURIComponent(data.company)}`);
}

/** 병원 유형(카테고리) 수정. reports.hospital_type 을 일괄 갱신한다. */
export async function updateHospitalCategory(data: {
  company: string;
  hospitalType: string;
}) {
  await updateCompanyHospitalType(data.company, data.hospitalType);
  revalidatePath("/hospital");
  revalidatePath(`/hospital/${encodeURIComponent(data.company)}`);
}

/** 병원 운영 메모 추가. 생성된 메모를 반환한다. */
export async function createHospitalNote(data: {
  company: string;
  content: string;
}): Promise<HospitalNote> {
  const content = data.content.trim();
  if (!content) throw new Error("메모 내용을 입력해주세요.");
  return addHospitalNote(data.company, content);
}

/** 병원 운영 메모 삭제. */
export async function removeHospitalNote(id: number): Promise<void> {
  await deleteHospitalNote(id);
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
