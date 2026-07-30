import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { IntakeFileMeta } from "./intake-fields";

/**
 * 광고주 준비자료 파일 저장용 Supabase Storage 헬퍼 (서버 전용).
 *
 * ⚠️ service_role 키를 사용하므로 절대 클라이언트에서 import 금지.
 *   - 상단 `import "server-only"` 가 클라이언트 번들 유입을 빌드 타임에 차단.
 *   - 사용처는 서버 액션(intake-actions.ts)과 서버 컴포넌트로만 한정.
 *
 * 버킷은 **비공개(private)**. 광고주가 올린 사업자등록증·자격증 등은 민감 문서이므로
 * 공개 URL 을 쓰지 않고, 관리자가 조회할 때만 짧은 수명의 signed URL 을 발급한다.
 */

export const INTAKE_BUCKET = "intake-files";

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
 * 화면 표시와 다운로드 파일명은 한글 그대로 유지된다. (design-storage.ts 와 동일 구현)
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
 * timestamp 를 넣어 재제출(수정) 시 기존 파일 경로와 충돌하지 않게 한다.
 * (nanoid 는 추측 불가하므로 비공개 버킷에서 사실상 토큰 역할도 겸함)
 */
export async function uploadIntakeFile(
  nanoid: string,
  fieldKey: string,
  index: number,
  file: File,
): Promise<IntakeFileMeta> {
  const path = `${nanoid}/${fieldKey}/${Date.now()}_${index}-${safeName(file.name)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error } = await getClient()
    .storage.from(INTAKE_BUCKET)
    .upload(path, buffer, {
      contentType: file.type || "application/octet-stream",
      upsert: true,
    });
  if (error) throw new Error(`파일 업로드 실패(${file.name}): ${error.message}`);

  return { name: file.name, path, size: file.size };
}

/** 조회용 signed URL 발급 (기본 1시간). 실패 시 null. */
export async function getIntakeFileSignedUrl(
  path: string,
  expiresInSec = 3600,
): Promise<string | null> {
  const { data, error } = await getClient()
    .storage.from(INTAKE_BUCKET)
    .createSignedUrl(path, expiresInSec);
  return error ? null : (data?.signedUrl ?? null);
}

/** 지정한 경로들의 파일만 삭제 (수정 제출 시 제거된 기존 파일 정리). */
export async function deleteIntakeFilePaths(paths: string[]): Promise<void> {
  if (!paths.length) return;
  await getClient().storage.from(INTAKE_BUCKET).remove(paths);
}

/** 제출 1건의 모든 파일 삭제 (제출 삭제 시 정리). 폴더 단위 제거. */
export async function deleteIntakeFiles(nanoid: string): Promise<void> {
  const client = getClient();
  // 폴더 내 파일을 재귀적으로 모아 일괄 삭제
  const paths: string[] = [];
  const { data: dirs } = await client.storage
    .from(INTAKE_BUCKET)
    .list(nanoid, { limit: 1000 });
  for (const dir of dirs ?? []) {
    const { data: files } = await client.storage
      .from(INTAKE_BUCKET)
      .list(`${nanoid}/${dir.name}`, { limit: 1000 });
    for (const f of files ?? []) paths.push(`${nanoid}/${dir.name}/${f.name}`);
  }
  if (paths.length) {
    await client.storage.from(INTAKE_BUCKET).remove(paths);
  }
}
