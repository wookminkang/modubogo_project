"use server";

import { revalidatePath } from "next/cache";
import { isAdmin } from "./admin";
import {
  createDesignRequest,
  deleteDesignRequest,
  getDesignRequestByNanoid,
  saveDesignRequest,
  updateDesignRequestStatus,
  createDesigner,
  updateDesigner,
  deleteDesigner,
  getDesigner,
  assignDesigner,
  type PartnerRole,
} from "./db";
import {
  DESIGN_FIELDS,
  DESIGN_FILE_FIELDS,
  designTitle,
  type DesignContent,
  type DesignFiles,
  type DesignFileMeta,
} from "./design-fields";
import {
  uploadDesignFile,
  deleteDesignFiles,
  deleteDesignFilePaths,
  uploadPartnerFile,
  deletePartnerFiles,
} from "./design-storage";

/** 관리자 전용 액션 가드 */
async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("권한이 없습니다.");
}

/** [관리자] 신규 요청서 생성 → 공개 링크용 nanoid 반환 */
export async function createDesignForm(): Promise<string> {
  await assertAdmin();
  const row = await createDesignRequest();
  revalidatePath("/outsource");
  return row.nanoid;
}

/** [관리자] 요청서 삭제 (Storage 파일까지 정리) */
export async function deleteDesignForm(nanoid: string): Promise<void> {
  await assertAdmin();
  await deleteDesignFiles(nanoid).catch(() => {});
  await deleteDesignRequest(nanoid);
  revalidatePath("/outsource");
}

/** [관리자] 상태 변경 (draft ↔ sent) */
export async function setDesignStatus(
  nanoid: string,
  status: "draft" | "sent",
): Promise<void> {
  await assertAdmin();
  await updateDesignRequestStatus(nanoid, status);
  revalidatePath("/outsource");
  revalidatePath(`/outsource/${nanoid}`);
}

/**
 * [관리자] 브리프 저장.
 * FormData 로 텍스트/선택 + 파일을 받아, 파일은 Storage 업로드 후 메타만 DB 에 저장한다.
 * multi(다중 선택) 값은 같은 key 로 여러 번 append 되어 getAll 로 배열 복원한다.
 */
export async function saveDesignForm(
  nanoid: string,
  formData: FormData,
): Promise<{ ok: boolean; files: DesignFiles }> {
  await assertAdmin();
  const existing = await getDesignRequestByNanoid(nanoid);
  if (!existing) throw new Error("유효하지 않은 요청서입니다.");

  // ── 텍스트/선택 값 ──
  const content: DesignContent = {};
  for (const f of DESIGN_FIELDS) {
    if (f.type === "multi") {
      const arr = formData
        .getAll(f.key)
        .filter((v): v is string => typeof v === "string" && v.trim() !== "");
      content[f.key] = arr;
    } else {
      const v = formData.get(f.key);
      content[f.key] = typeof v === "string" ? v.trim() : "";
    }
  }

  // ── 파일 항목 ──
  const keptPaths = new Set(
    formData.getAll("keep").filter((v): v is string => typeof v === "string"),
  );
  const removedPaths: string[] = [];
  const files: DesignFiles = {};

  for (const f of DESIGN_FILE_FIELDS) {
    const prev = existing.files[f.key] ?? [];
    const retained = prev.filter((m) => keptPaths.has(m.path));
    for (const m of prev) if (!keptPaths.has(m.path)) removedPaths.push(m.path);

    const newEntries = formData
      .getAll(f.key)
      .filter((v): v is File => v instanceof File && v.size > 0);
    const metas: DesignFileMeta[] = [...retained];
    for (let i = 0; i < newEntries.length; i++) {
      metas.push(await uploadDesignFile(nanoid, f.key, i, newEntries[i]));
    }
    if (metas.length) files[f.key] = metas;
  }

  if (removedPaths.length)
    await deleteDesignFilePaths(removedPaths).catch(() => {});

  await saveDesignRequest(nanoid, {
    title: designTitle(content, "") || null,
    content,
    files,
  });

  revalidatePath("/outsource");
  revalidatePath(`/outsource/${nanoid}`);
  revalidatePath(`/design/${nanoid}`);
  return { ok: true, files };
}

// ── 외주 파트너(디자이너·개발자) 명단 + 배정 ────────────────────

const PARTNER_FILE_KEY = "files";

/**
 * FormData 의 첨부 항목을 처리해 최종 files 메타를 만든다.
 * - `keep`: 유지할 기존 파일 path (넘어오지 않은 기존 파일은 Storage 에서 삭제)
 * - `files`: 새로 올라온 File 들
 */
async function resolvePartnerFiles(
  partnerId: string,
  formData: FormData,
  prev: DesignFileMeta[],
): Promise<DesignFiles> {
  const keptPaths = new Set(
    formData.getAll("keep").filter((v): v is string => typeof v === "string"),
  );
  const retained = prev.filter((m) => keptPaths.has(m.path));
  const removedPaths = prev
    .filter((m) => !keptPaths.has(m.path))
    .map((m) => m.path);

  const newEntries = formData
    .getAll(PARTNER_FILE_KEY)
    .filter((v): v is File => v instanceof File && v.size > 0);

  const metas: DesignFileMeta[] = [...retained];
  for (let i = 0; i < newEntries.length; i++) {
    metas.push(await uploadPartnerFile(partnerId, i, newEntries[i]));
  }

  if (removedPaths.length)
    await deleteDesignFilePaths(removedPaths).catch(() => {});

  return metas.length ? { [PARTNER_FILE_KEY]: metas } : {};
}

/**
 * [관리자] 파트너 등록 — 이름/연락처/메모 + 첨부(FormData).
 * 첨부 경로에 id 가 필요해 행을 먼저 만든 뒤 업로드하고 files 만 갱신한다.
 */
export async function createPartnerAction(
  role: PartnerRole,
  formData: FormData,
): Promise<{ ok: boolean; files: DesignFiles }> {
  await assertAdmin();
  const name = ((formData.get("name") as string | null) ?? "").trim();
  if (!name) throw new Error("이름을 입력해주세요.");

  const row = await createDesigner({
    name,
    contact: ((formData.get("contact") as string | null) ?? "").trim() || null,
    memo: ((formData.get("memo") as string | null) ?? "").trim() || null,
    role,
  });

  const files = await resolvePartnerFiles(row.id, formData, []);
  if (files[PARTNER_FILE_KEY]?.length) await updateDesigner(row.id, { files });

  revalidatePath("/outsource");
  return { ok: true, files };
}

/** [관리자] 파트너 수정 — 이름/연락처/메모 + 첨부(FormData). */
export async function updatePartnerAction(
  id: string,
  formData: FormData,
): Promise<{ ok: boolean; files: DesignFiles }> {
  await assertAdmin();
  const existing = await getDesigner(id);
  if (!existing) throw new Error("유효하지 않은 대상입니다.");

  const name = ((formData.get("name") as string | null) ?? "").trim();
  if (!name) throw new Error("이름을 입력해주세요.");

  const files = await resolvePartnerFiles(
    id,
    formData,
    existing.files?.[PARTNER_FILE_KEY] ?? [],
  );

  await updateDesigner(id, {
    name,
    contact: ((formData.get("contact") as string | null) ?? "").trim(),
    memo: ((formData.get("memo") as string | null) ?? "").trim(),
    files,
  });

  revalidatePath("/outsource");
  return { ok: true, files };
}

/** [관리자] 파트너 삭제 (첨부까지 정리) */
export async function deletePartnerAction(id: string): Promise<void> {
  await assertAdmin();
  await deletePartnerFiles(id).catch(() => {});
  await deleteDesigner(id);
  revalidatePath("/outsource");
}

/** [관리자] 요청서에 담당 디자이너 배정(해제는 designerId=null) */
export async function assignDesignerAction(
  nanoid: string,
  designerId: string | null,
): Promise<void> {
  await assertAdmin();
  await assignDesigner(nanoid, designerId);
  revalidatePath("/outsource");
  revalidatePath(`/outsource/${nanoid}`);
}
