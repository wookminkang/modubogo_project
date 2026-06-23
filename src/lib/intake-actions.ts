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
import {
  uploadIntakeFile,
  deleteIntakeFiles,
  deleteIntakeFilePaths,
} from "./intake-storage";

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

  // ── 파일 항목 ──
  // 수정 제출 시 광고주가 "유지"한 기존 파일 경로 집합
  const keptPaths = new Set(
    formData.getAll("keep").filter((v): v is string => typeof v === "string"),
  );
  const removedPaths: string[] = [];
  const files: IntakeFiles = {};

  for (const f of FILE_FIELDS) {
    // 1) 유지되는 기존 파일
    const prev = existing.files[f.key] ?? [];
    const retained = prev.filter((m) => keptPaths.has(m.path));
    for (const m of prev) if (!keptPaths.has(m.path)) removedPaths.push(m.path);

    // 2) 새로 업로드된 파일
    const newEntries = formData
      .getAll(f.key)
      .filter((v): v is File => v instanceof File && v.size > 0);
    const metas: IntakeFileMeta[] = [...retained];
    for (let i = 0; i < newEntries.length; i++) {
      metas.push(await uploadIntakeFile(nanoid, f.key, i, newEntries[i]));
    }
    if (metas.length) files[f.key] = metas;
  }

  // 제거된 기존 파일은 Storage 에서 정리 (실패해도 제출은 진행)
  if (removedPaths.length)
    await deleteIntakeFilePaths(removedPaths).catch(() => {});

  await saveIntakeSubmission(nanoid, { company, text, files });
  revalidatePath("/intakes");
  revalidatePath(`/intakes/${nanoid}`);
  return { ok: true };
}
