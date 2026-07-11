"use server";

import { isAdmin } from "./admin";
import { getReportFilesById, updateReportFiles } from "./db";
import type { DesignFiles, DesignFileMeta } from "./design-fields";
import {
  uploadReportFile,
  deleteReportFiles,
  deleteDesignFilePaths,
} from "./design-storage";

const FILE_KEY = "files";

/**
 * [관리자] 보고서 첨부 저장 — FormData(new files + keep paths)를 받아
 * Storage 업로드/정리 후 reports.files 를 갱신한다. 새 파일 없고 keep 만이면 기존 유지.
 * 반환: 저장된 파일 목록.
 */
export async function saveReportFiles(
  reportId: number | string,
  formData: FormData,
): Promise<{ ok: boolean; files: DesignFiles }> {
  if (!(await isAdmin())) throw new Error("권한이 없습니다.");

  const current = await getReportFilesById(reportId);
  const prev = current[FILE_KEY] ?? [];

  const keptPaths = new Set(
    formData.getAll("keep").filter((v): v is string => typeof v === "string"),
  );
  const retained = prev.filter((m) => keptPaths.has(m.path));
  const removedPaths = prev
    .filter((m) => !keptPaths.has(m.path))
    .map((m) => m.path);

  const newEntries = formData
    .getAll(FILE_KEY)
    .filter((v): v is File => v instanceof File && v.size > 0);
  const metas: DesignFileMeta[] = [...retained];
  for (let i = 0; i < newEntries.length; i++) {
    metas.push(await uploadReportFile(reportId, i, newEntries[i]));
  }

  if (removedPaths.length)
    await deleteDesignFilePaths(removedPaths).catch(() => {});

  const files: DesignFiles = metas.length ? { [FILE_KEY]: metas } : {};
  await updateReportFiles(reportId, files);
  return { ok: true, files };
}

/** [관리자] 보고서의 모든 첨부 삭제 (보고서 삭제 시 함께 호출). */
export async function clearReportFiles(
  reportId: number | string,
): Promise<void> {
  if (!(await isAdmin())) throw new Error("권한이 없습니다.");
  await deleteReportFiles(reportId).catch(() => {});
}
