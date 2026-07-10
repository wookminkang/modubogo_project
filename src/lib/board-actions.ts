"use server";

import { revalidatePath } from "next/cache";
import { isAdmin, getAdminUser } from "./admin";
import {
  createOutsourcePost,
  getOutsourcePost,
  saveOutsourcePost,
  deleteOutsourcePost,
} from "./db";
import type { DesignFiles, DesignFileMeta } from "./design-fields";
import {
  uploadBoardFile,
  deleteBoardFiles,
  deleteDesignFilePaths,
} from "./design-storage";

async function assertAdmin() {
  if (!(await isAdmin())) throw new Error("권한이 없습니다.");
}

const FILE_KEY = "files";

/** [관리자] 새 게시글 생성(빈 초안) → id 반환. 작성자는 로그인 관리자 이름. */
export async function createBoardPostAction(): Promise<string> {
  await assertAdmin();
  const user = await getAdminUser();
  const row = await createOutsourcePost(user?.name ?? null);
  revalidatePath("/outsource");
  return row.id;
}

/** [관리자] 게시글 삭제 (첨부까지 정리) */
export async function deleteBoardPostAction(id: string): Promise<void> {
  await assertAdmin();
  await deleteBoardFiles(id).catch(() => {});
  await deleteOutsourcePost(id);
  revalidatePath("/outsource");
}

/** [관리자] 게시글 여러 개 일괄 삭제 (첨부까지 정리). */
export async function deleteBoardPostsAction(ids: string[]): Promise<void> {
  await assertAdmin();
  for (const id of ids) {
    await deleteBoardFiles(id).catch(() => {});
    await deleteOutsourcePost(id);
  }
  revalidatePath("/outsource");
}

/**
 * [관리자] 게시글 저장 — 제목/내용 + 첨부(FormData).
 * 새 파일은 Storage 업로드 후 메타만 저장, keep 로 넘어온 기존 파일은 유지한다.
 */
export async function saveBoardPostAction(
  id: string,
  formData: FormData,
): Promise<{ ok: boolean; files: DesignFiles }> {
  await assertAdmin();
  const existing = await getOutsourcePost(id);
  if (!existing) throw new Error("유효하지 않은 게시글입니다.");

  const title = ((formData.get("title") as string | null) ?? "").trim();
  const content = ((formData.get("content") as string | null) ?? "").trim();

  // 첨부: 유지할 기존 파일 + 새 업로드
  const keptPaths = new Set(
    formData.getAll("keep").filter((v): v is string => typeof v === "string"),
  );
  const prev = existing.files?.[FILE_KEY] ?? [];
  const retained = prev.filter((m) => keptPaths.has(m.path));
  const removedPaths = prev
    .filter((m) => !keptPaths.has(m.path))
    .map((m) => m.path);

  const newEntries = formData
    .getAll(FILE_KEY)
    .filter((v): v is File => v instanceof File && v.size > 0);
  const metas: DesignFileMeta[] = [...retained];
  for (let i = 0; i < newEntries.length; i++) {
    metas.push(await uploadBoardFile(id, i, newEntries[i]));
  }

  if (removedPaths.length)
    await deleteDesignFilePaths(removedPaths).catch(() => {});

  const files: DesignFiles = metas.length ? { [FILE_KEY]: metas } : {};

  await saveOutsourcePost(id, {
    title: title || null,
    content: content || null,
    files,
  });

  revalidatePath("/outsource");
  revalidatePath(`/outsource/board/${id}`);
  return { ok: true, files };
}
