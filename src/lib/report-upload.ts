import { supabase } from "./supabase";
import { DESIGN_BUCKET, type DesignFileMeta } from "./design-fields";
import { createReportUploadTargets, saveReportFileMetas } from "./report-actions";

/**
 * 보고서 첨부 저장 (브라우저 전용).
 *
 * 1) 서버 액션에서 파일마다 서명 업로드 토큰을 받고
 * 2) 브라우저가 Storage 로 **직접** 업로드한 뒤
 * 3) 메타데이터(JSON)만 서버 액션으로 저장한다.
 *
 * 파일 바이트가 서버 액션을 거치지 않으므로 Vercel 의 요청 본문 4.5MB 제한을 받지 않는다.
 * (이전 구조에서는 4.5MB 를 넘는 첨부가 배포 환경에서 항상 실패했다)
 */
export async function saveReportAttachments(
  reportId: number | string,
  keepPaths: string[],
  newFiles: File[],
): Promise<void> {
  let added: DesignFileMeta[] = [];

  if (newFiles.length > 0) {
    const prepared = await createReportUploadTargets(
      reportId,
      newFiles.map((f) => ({ name: f.name, size: f.size })),
    );
    if (!prepared.ok) throw new Error(`업로드 준비: ${prepared.error}`);

    await Promise.all(
      prepared.targets.map(async (t, i) => {
        const file = newFiles[i];
        const { error } = await supabase.storage
          .from(DESIGN_BUCKET)
          .uploadToSignedUrl(t.path, t.token, file, {
            contentType: file.type || "application/octet-stream",
          });
        if (error)
          throw new Error(`업로드(${file.name}): ${error.message}`);
      }),
    );

    added = prepared.targets.map((t, i) => ({
      name: newFiles[i].name,
      path: t.path,
      size: newFiles[i].size,
    }));
  }

  const saved = await saveReportFileMetas(reportId, keepPaths, added);
  if (!saved.ok) throw new Error(`첨부 저장: ${saved.error}`);
}
