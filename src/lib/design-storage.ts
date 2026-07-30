import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { DESIGN_BUCKET, type DesignFileMeta } from "./design-fields";

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

export { DESIGN_BUCKET };

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

/**
 * 파일명 → Storage 경로용 안전한 이름.
 *
 * ⚠️ Supabase Storage 는 key 에 한글 등 비ASCII 문자를 허용하지 않는다("Invalid key").
 * 그래서 경로는 ASCII 로만 만들고, **원본 파일명은 메타(name)에 따로 저장**하므로
 * 화면 표시와 다운로드 파일명은 한글 그대로 유지된다.
 */
function safeName(name: string): string {
  const dot = name.lastIndexOf(".");
  const ext = (dot > 0 ? name.slice(dot) : "")
    .replace(/[^A-Za-z0-9.]/g, "")
    .toLowerCase();
  const base = (dot > 0 ? name.slice(0, dot) : name)
    .replace(/[^A-Za-z0-9._-]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 60);
  // 전부 한글 파일명이면 base 가 비거나 기호만 남는다 → "file" 로 대체
  return `${/[A-Za-z0-9]/.test(base) ? base : "file"}${ext}`;
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

/**
 * 조회용 signed URL 발급 (기본 1시간). 실패 시 null.
 *
 * `download` 에 파일명을 주면 Content-Disposition: attachment 가 붙어 실제로 저장된다.
 * (Storage 는 앱과 오리진이 달라 <a download> 속성이 무시되므로 이 옵션이 필요)
 */
export async function getDesignFileSignedUrl(
  path: string,
  expiresInSec = 3600,
  download?: string,
): Promise<string | null> {
  const { data, error } = await getClient()
    .storage.from(DESIGN_BUCKET)
    .createSignedUrl(path, expiresInSec, download ? { download } : undefined);
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

// ── 외주 파트너 첨부 (동일 design-files 버킷 재사용, partner/{id}/ 경로) ──

/** 파트너(디자이너·개발자) 첨부 1개 업로드. 경로: partner/{id}/{timestamp}_{index}-{safeName} */
export async function uploadPartnerFile(
  partnerId: string,
  index: number,
  file: File,
): Promise<DesignFileMeta> {
  const path = `partner/${partnerId}/${Date.now()}_${index}-${safeName(file.name)}`;
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

/** 파트너 1명의 모든 첨부 삭제 (파트너 삭제 시 정리). */
export async function deletePartnerFiles(partnerId: string): Promise<void> {
  const client = getClient();
  const { data: files } = await client.storage
    .from(DESIGN_BUCKET)
    .list(`partner/${partnerId}`, { limit: 1000 });
  const paths = (files ?? []).map((f) => `partner/${partnerId}/${f.name}`);
  if (paths.length) await client.storage.from(DESIGN_BUCKET).remove(paths);
}

// ── 보고서 첨부 (동일 design-files 버킷 재사용, report/{reportId}/ 경로) ──

/** 보고서 첨부 1개 업로드. 경로: report/{reportId}/{timestamp}_{index}-{safeName} */
export async function uploadReportFile(
  reportId: number | string,
  index: number,
  file: File,
): Promise<DesignFileMeta> {
  const path = `report/${reportId}/${Date.now()}_${index}-${safeName(file.name)}`;
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

/**
 * 보고서 첨부용 **서명 업로드 URL** 발급 (브라우저가 Storage 로 직접 업로드).
 *
 * 서버 액션으로 파일 바이트를 실어 보내면 Vercel 서버리스의 요청 본문 4.5MB 제한에 걸린다
 * (next.config 의 bodySizeLimit 을 올려도 플랫폼 한계는 그대로). 그래서 파일은 브라우저가
 * 이 토큰으로 Storage 에 직접 올리고, 서버 액션은 메타데이터(JSON)만 받는다.
 */
export async function createReportUploadTarget(
  reportId: number | string,
  index: number,
  fileName: string,
): Promise<{ path: string; token: string }> {
  const path = `report/${reportId}/${Date.now()}_${index}-${safeName(fileName)}`;
  const { data, error } = await getClient()
    .storage.from(DESIGN_BUCKET)
    .createSignedUploadUrl(path);
  if (error || !data)
    throw new Error(
      `업로드 준비 실패(${fileName}): ${error?.message ?? "알 수 없는 오류"}`,
    );
  return { path: data.path, token: data.token };
}

/** 보고서 1건의 모든 첨부 삭제 (보고서 삭제 시 정리). */
export async function deleteReportFiles(
  reportId: number | string,
): Promise<void> {
  const client = getClient();
  const { data: files } = await client.storage
    .from(DESIGN_BUCKET)
    .list(`report/${reportId}`, { limit: 1000 });
  const paths = (files ?? []).map((f) => `report/${reportId}/${f.name}`);
  if (paths.length) await client.storage.from(DESIGN_BUCKET).remove(paths);
}
