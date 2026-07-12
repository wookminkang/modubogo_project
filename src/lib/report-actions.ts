"use server";

import { isAdmin } from "./admin";
import { getReportFilesById, updateReportFiles } from "./db";
import type { DesignFiles, DesignFileMeta } from "./design-fields";
import {
  createReportUploadTarget,
  deleteReportFiles,
  deleteDesignFilePaths,
} from "./design-storage";

const FILE_KEY = "files";

/**
 * 서버 액션은 **오류를 던지지 않고 반환한다**.
 * Next.js 는 프로덕션에서 던져진 서버 오류의 메시지를 digest 로 가려버려,
 * 배포 환경에서 원인 파악이 불가능해지기 때문(로컬에서만 보임).
 */
type Result<T> = ({ ok: true } & T) | { ok: false; error: string };

const fail = (e: unknown): { ok: false; error: string } => ({
  ok: false,
  error: e instanceof Error ? e.message : String(e),
});

/**
 * [관리자] 첨부 업로드 준비 — 파일마다 Storage 서명 업로드 URL(토큰)을 발급한다.
 * 실제 업로드는 브라우저가 직접 수행한다(`@/lib/report-upload`).
 * 서버 액션으로 파일 바이트를 보내면 Vercel 요청 본문 4.5MB 제한에 걸리기 때문.
 */
export async function createReportUploadTargets(
  reportId: number | string,
  files: { name: string; size: number }[],
): Promise<Result<{ targets: { path: string; token: string }[] }>> {
  try {
    if (!(await isAdmin())) throw new Error("권한이 없습니다. 다시 로그인해주세요.");
    const targets: { path: string; token: string }[] = [];
    for (let i = 0; i < files.length; i++) {
      targets.push(await createReportUploadTarget(reportId, i, files[i].name));
    }
    return { ok: true, targets };
  } catch (e) {
    return fail(e);
  }
}

/**
 * [관리자] 보고서 첨부 메타 저장 — 업로드가 끝난 뒤 호출한다.
 * keep 에 없는 기존 파일은 Storage 에서 정리하고, reports.files 를 갱신한다.
 */
export async function saveReportFileMetas(
  reportId: number | string,
  keep: string[],
  added: DesignFileMeta[],
): Promise<Result<{ files: DesignFiles }>> {
  try {
    if (!(await isAdmin())) throw new Error("권한이 없습니다. 다시 로그인해주세요.");

    const current = await getReportFilesById(reportId);
    const prev = current[FILE_KEY] ?? [];

    const keptPaths = new Set(keep);
    const retained = prev.filter((m) => keptPaths.has(m.path));
    const removedPaths = prev
      .filter((m) => !keptPaths.has(m.path))
      .map((m) => m.path);

    if (removedPaths.length)
      await deleteDesignFilePaths(removedPaths).catch(() => {});

    const metas = [...retained, ...added];
    const files: DesignFiles = metas.length ? { [FILE_KEY]: metas } : {};
    await updateReportFiles(reportId, files);
    return { ok: true, files };
  } catch (e) {
    return fail(e);
  }
}

/** [관리자] 보고서의 모든 첨부 삭제 (보고서 삭제 시 함께 호출). */
export async function clearReportFiles(
  reportId: number | string,
): Promise<void> {
  if (!(await isAdmin())) throw new Error("권한이 없습니다.");
  await deleteReportFiles(reportId).catch(() => {});
}
