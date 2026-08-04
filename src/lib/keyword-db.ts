import { supabase } from "./supabase";
import { generateCompanyNanoid } from "./nanoid";
import type { ProposalGroup } from "./keyword-openai";

// GEO 키워드 리포트(/keyword) 쿼리 레이어. 스키마는 sql/keyword_proposals.sql 참고.
// geo-db.ts 와 같은 규칙: read 는 null/[] 폴백, write 는 assertOk 로 throw.

export type KeywordProposal = {
  id: string;
  nanoid: string;
  hospitalName: string;
  region: string;
  field: string;
  summary: string;
  whyGeo: string;
  groups: ProposalGroup[];
  createdAt: string;
};

type RawProposal = {
  id: string; nanoid: string; hospital_name: string; region: string; field: string;
  summary: string; why_geo: string; groups: ProposalGroup[] | null; created_at: string;
};

function mapProposal(p: RawProposal): KeywordProposal {
  return {
    id: p.id, nanoid: p.nanoid, hospitalName: p.hospital_name, region: p.region,
    field: p.field, summary: p.summary, whyGeo: p.why_geo,
    groups: p.groups ?? [], createdAt: p.created_at,
  };
}

function assertOk(error: { message: string } | null, what: string): void {
  if (error) throw new Error(`${what} 실패: ${error.message}`);
}

export async function listKeywordProposals(): Promise<KeywordProposal[]> {
  const { data, error } = await supabase
    .from("keyword_proposals")
    .select("*")
    .order("created_at", { ascending: false });
  if (error || !data) return [];
  return (data as RawProposal[]).map(mapProposal);
}

export async function getKeywordProposalByNanoid(
  nanoid: string,
): Promise<KeywordProposal | null> {
  const { data, error } = await supabase
    .from("keyword_proposals")
    .select("*")
    .eq("nanoid", nanoid)
    .limit(1);
  if (error || !data?.[0]) return null;
  return mapProposal(data[0] as RawProposal);
}

export async function insertKeywordProposal(input: {
  hospitalName: string; region: string; field: string;
  summary: string; whyGeo: string; groups: ProposalGroup[];
}): Promise<{ id: string; nanoid: string }> {
  const nanoid = generateCompanyNanoid();
  const { data, error } = await supabase
    .from("keyword_proposals")
    .insert({
      nanoid,
      hospital_name: input.hospitalName,
      region: input.region,
      field: input.field,
      summary: input.summary,
      why_geo: input.whyGeo,
      groups: input.groups,
    })
    .select("id")
    .single();
  assertOk(error, "리포트 저장");
  return { id: (data as { id: string }).id, nanoid };
}

export async function deleteKeywordProposal(id: string): Promise<void> {
  const { error } = await supabase.from("keyword_proposals").delete().eq("id", id);
  assertOk(error, "리포트 삭제");
}
