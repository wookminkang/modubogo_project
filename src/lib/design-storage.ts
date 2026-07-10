import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { DesignFileMeta } from "./design-fields";

/**
 * 외주 디자이너 요청서 리소스 파일 저장용 Supabase Storage 헬퍼 (서버 전용).
 *
 * ⚠️ service_role 키를 사용하므로 절대 클라이언트에서 import 금지.
 *   - 상단 `import "server-only"` 가 클라이언트 번들 유입을 빌드 타임에 차단.
 *   - 사용처는 서버 액션(design-actions.ts)과 서버 컴포넌트(디자이너 뷰)로만 한정.
 *
 * 버킷은 **비공개(private)**. 디자이너 뷰는 로그인이 없지만, 공개 URL 대신
 * 서버에서 짧은 수명의 signed URL 을 발급해 렌더 시점에만 내려준다.
 * (nanoid 는 추측 불가하므로 사실상 링크 토큰 역할을 겸함)
 */

export const DESIGN_BUCKET = "design-files";

let _client: SupabaseClient | null = null;

function getClient(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) {
      throw new Error(
        "SUPABASE_SERVICE_ROLE_KEY (또는 NEXT_PUBLIC_SUPABASE_URL) 환경변수가 없습니다.",
      );
    }
    _client = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    });
  }
  return _client;
}

/** 파일명에서 Storage 경로로 쓰기 위험한 문자를 제거 */
function safeName(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = dot > 0 ? name.slice(dot) : "";
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .replace(/[^\w.\-가-힣]+/g, "_")
    .slice(0, 60);
  return `${base || "file"}${ext.toLowerCase()}`;
}

/**
 * 파일 1개를 업로드하고 메타데이터를 반환한다.
 * 경로 구조: {nanoid}/{fieldKey}/{timestamp}_{index}-{safeName}
 */
export async function uploadDesignFile(
  nanoid: string,
  fieldKey: string,
  index: number,
  file: File,
): Promise<DesignFileMeta> {
  const path = `${nanoid}/${fieldKey}/${Date.now()}_${index}-${safeName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await getClient()
    .storage.from(DESIGN_BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
  if (error) throw new Error(`파일 업로드 실패(${file.name}): ${error.message}`);

  return { name: file.name, path, size: file.size };
}

/** 조회용 signed URL 발급 (기본 1시간). 실패 시 null. */
export async function getDesignFileSignedUrl(
  path: string,
  expiresInSec = 3600,
): Promise<string | null> {
  const { data, error } = await getClient()
    .storage.from(DESIGN_BUCKET)
    .createSignedUrl(path, expiresInSec);
  return error ? null : (data?.signedUrl ?? null);
}

/** 지정한 경로들의 파일만 삭제 (수정 시 제거된 기존 파일 정리). */
export async function deleteDesignFilePaths(paths: string[]): Promise<void> {
  if (!paths.length) return;
  await getClient().storage.from(DESIGN_BUCKET).remove(paths);
}

/** 요청서 1건의 모든 파일 삭제 (요청서 삭제 시 정리). 폴더 단위 제거. */
export async function deleteDesignFiles(nanoid: string): Promise<void> {
  const client = getClient();
  const paths: string[] = [];
  const { data: dirs } = await client.storage
    .from(DESIGN_BUCKET)
    .list(nanoid, { limit: 1000 });
  for (const dir of dirs ?? []) {
    const { data: files } = await client.storage
      .from(DESIGN_BUCKET)
      .list(`${nanoid}/${dir.name}`, { limit: 1000 });
    for (const f of files ?? []) paths.push(`${nanoid}/${dir.name}/${f.name}`);
  }
  if (paths.length) {
    await client.storage.from(DESIGN_BUCKET).remove(paths);
  }
}

// ── 외주 게시판 첨부 (동일 design-files 버킷 재사용, board/{postId}/ 경로) ──

/** 게시판 첨부 1개 업로드. 경로: board/{postId}/{timestamp}_{index}-{safeName} */
export async function uploadBoardFile(
  postId: string,
  index: number,
  file: File,
): Promise<DesignFileMeta> {
  const path = `board/${postId}/${Date.now()}_${index}-${safeName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());
  const { error } = await getClient()
    .storage.from(DESIGN_BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
  if (error) throw new Error(`파일 업로드 실패(${file.name}): ${error.message}`);
  return { name: file.name, path, size: file.size };
}

/** 게시글 1건의 모든 첨부 삭제 (글 삭제 시 정리). */
export async function deleteBoardFiles(postId: string): Promise<void> {
  const client = getClient();
  const { data: files } = await client.storage
    .from(DESIGN_BUCKET)
    .list(`board/${postId}`, { limit: 1000 });
  const paths = (files ?? []).map((f) => `board/${postId}/${f.name}`);
  if (paths.length) await client.storage.from(DESIGN_BUCKET).remove(paths);
}
