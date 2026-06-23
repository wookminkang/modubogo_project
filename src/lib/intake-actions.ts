"use server";

import { revalidatePath } from "next/cache";
import {
  createIntake,
  deleteIntake,
  getIntakeByNanoid,
  saveIntakeSubmission,
  type IntakeTextPayload,
} from "./db";
import {
  TEXT_FIELDS,
  FILE_FIELDS,
  type IntakeFiles,
  type IntakeFileMeta,
} from "./intake-fields";
import { uploadIntakeFile, deleteIntakeFiles } from "./intake-storage";

/** [관리자] 신규 준비자료 폼 생성 → 공개 링크용 nanoid 반환 */
export async function createIntakeForm(company?: string): Promise<string> {
  const row = await createIntake(company);
  revalidatePath("/intakes");
  return row.nanoid;
}

/** [관리자] 폼 삭제 (Storage 파일까지 정리) */
export async function deleteIntakeForm(nanoid: string): Promise<void> {
  await deleteIntakeFiles(nanoid).catch(() => {});
  await deleteIntake(nanoid);
  revalidatePath("/intakes");
}

/**
 * [광고주·공개] 준비자료 제출.
 * FormData 로 텍스트 + 파일을 받아 파일은 Storage 업로드 후 메타만 DB 에 저장.
 */
export async function submitIntake(
  nanoid: string,
  formData: FormData,
): Promise<{ ok: boolean }> {
  const existing = await getIntakeByNanoid(nanoid);
  if (!existing) throw new Error("유효하지 않은 폼 링크입니다.");

  // ── 텍스트 항목 ──
  const text = {} as IntakeTextPayload;
  for (const f of TEXT_FIELDS) {
    const v = formData.get(f.key);
    text[f.key] = typeof v === "string" && v.trim() ? v.trim() : null;
  }

  const company =
    (formData.get("company") as string | null)?.trim() ||
    existing.company ||
    null;

  // ── 파일 항목 (Storage 업로드) ──
  const files: IntakeFiles = {};
  for (const f of FILE_FIELDS) {
    const entries = formData
      .getAll(f.key)
      .filter((v): v is File => v instanceof File && v.size > 0);
    if (!entries.length) continue;
    const metas: IntakeFileMeta[] = [];
    for (let i = 0; i < entries.length; i++) {
      metas.push(await uploadIntakeFile(nanoid, f.key, i, entries[i]));
    }
    files[f.key] = metas;
  }

  await saveIntakeSubmission(nanoid, { company, text, files });
  revalidatePath("/intakes");
  revalidatePath(`/intakes/${nanoid}`);
  return { ok: true };
}
