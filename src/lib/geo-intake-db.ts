import { supabaseAdmin } from "./supabaseAdmin";
import { sanitizeAnswers, type GeoIntakeAnswers } from "./geo-intake-fields";

// GEO 병원 정보 폼 쿼리 레이어. 스키마는 sql/geo_intakes.sql 참고.
//
// 준비자료 폼(db.ts, anon 키)과 다른 점: service_role(supabaseAdmin)로만 접근한다.
// FTP·CAFE24 계정 비밀번호가 들어오는 테이블이라 RLS on + 정책 없음으로 anon 키를 막아 두었다.
// 이 파일은 서버에서만 import 할 것 (클라이언트는 import type 만).
//
// geo-db.ts 와 같은 규칙: read 는 null/[] 로 폴백, write 는 throw.

export type GeoIntakeStatus = "pending" | "submitted";

export type GeoIntake = {
  id: string;
  nanoid: string;
  company: string | null;
  status: GeoIntakeStatus;
  answers: GeoIntakeAnswers;
  createdBy: string | null;
  createdAt: string;
  submittedAt: string | null;
  consentedAt: string | null;
};

type Raw = {
  id: string; nanoid: string; company: string | null; status: string;
  answers: unknown; created_by: string | null; created_at: string;
  submitted_at: string | null; consented_at: string | null;
};

function map(r: Raw): GeoIntake {
  return {
    id: r.id,
    nanoid: r.nanoid,
    company: r.company,
    status: r.status === "submitted" ? "submitted" : "pending",
    answers: sanitizeAnswers(r.answers),
    createdBy: r.created_by,
    createdAt: r.created_at,
    submittedAt: r.submitted_at,
    consentedAt: r.consented_at,
  };
}

function assertOk(error: { message: string } | null, what: string): void {
  if (error) throw new Error(`${what} 실패: ${error.message}`);
}

export async function listGeoIntakes(): Promise<GeoIntake[]> {
  const { data, error } = await supabaseAdmin
    .from("geo_intakes")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as Raw[]).map(map);
}

export async function getGeoIntakeByNanoid(nanoid: string): Promise<GeoIntake | null> {
  const { data, error } = await supabaseAdmin
    .from("geo_intakes")
    .select("*")
    .eq("nanoid", nanoid)
    .limit(1);
  if (error || !data?.[0]) return null;
  return map(data[0] as Raw);
}

export async function insertGeoIntake(input: {
  nanoid: string;
  company: string | null;
  createdBy: string | null;
}): Promise<void> {
  const { error } = await supabaseAdmin.from("geo_intakes").insert({
    nanoid: input.nanoid,
    company: input.company,
    created_by: input.createdBy,
  });
  assertOk(error, "링크 생성");
}

/** 제출 저장. 대기(pending) 상태일 때만 저장해 같은 링크로 다시 덮어쓰지 못하게 한다. */
export async function submitGeoIntakeRow(nanoid: string, answers: GeoIntakeAnswers): Promise<boolean> {
  const now = new Date().toISOString();
  const { data, error } = await supabaseAdmin
    .from("geo_intakes")
    .update({ answers, status: "submitted", submitted_at: now, consented_at: now })
    .eq("nanoid", nanoid)
    .eq("status", "pending")
    .select("id");
  assertOk(error, "제출 저장");
  return (data?.length ?? 0) > 0;
}

export async function deleteGeoIntake(nanoid: string): Promise<void> {
  const { error } = await supabaseAdmin.from("geo_intakes").delete().eq("nanoid", nanoid);
  assertOk(error, "삭제");
}
