"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "./admin";
import { generateProposal } from "./keyword-openai";
import * as db from "./keyword-db";

// GEO 키워드 리포트 서버 액션. 생성·삭제는 관리자만, 공유 페이지는 nanoid 로 공개 열람.

export type KeywordResult<T> = { ok: true; data: T } | { ok: false; error: string };

function fail(e: unknown, prefix: string): { ok: false; error: string } {
  const detail = e instanceof Error ? e.message : String(e);
  return { ok: false, error: `${prefix}: ${detail}` };
}

/** 병원 정보로 키워드 50개 + 설명을 뽑아 리포트로 저장하고 공유 nanoid 를 돌려준다. */
export async function createKeywordProposal(input: {
  hospitalName: string;
  region: string;
  field: string;
}): Promise<KeywordResult<{ nanoid: string }>> {
  if (!(await isAdmin())) {
    return { ok: false, error: "권한이 없습니다. 관리자로 로그인해 주세요." };
  }

  const hospitalName = input.hospitalName.trim();
  const region = input.region.trim();
  const field = input.field.trim();
  if (!hospitalName || !region || !field) {
    return { ok: false, error: "병원명·지역·진료 분야를 모두 입력해 주세요." };
  }

  try {
    const proposal = await generateProposal({ hospitalName, region, field });
    const { nanoid } = await db.insertKeywordProposal({
      hospitalName,
      region,
      field,
      summary: proposal.summary,
      whyGeo: proposal.whyGeo,
      groups: proposal.groups,
    });
    revalidatePath("/keyword");
    return { ok: true, data: { nanoid } };
  } catch (e) {
    return fail(e, "리포트를 만들지 못했습니다");
  }
}

export async function deleteKeywordProposal(id: string): Promise<KeywordResult<null>> {
  if (!(await isAdmin())) {
    return { ok: false, error: "권한이 없습니다. 관리자로 로그인해 주세요." };
  }

  try {
    await db.deleteKeywordProposal(id);
    revalidatePath("/keyword");
    return { ok: true, data: null };
  } catch (e) {
    return fail(e, "리포트를 삭제하지 못했습니다");
  }
}
