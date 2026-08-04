import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { listKeywordProposals } from "@/lib/keyword-db";
import KeywordAdmin from "./KeywordAdmin";

export const dynamic = "force-dynamic";
// 키워드 뽑기(서버 액션)가 수십 초 걸린다. Vercel 기본 제한에 잘리지 않게 여유를 둔다.
export const maxDuration = 120;

// GEO 키워드 리포트 관리 — 병원 정보를 넣으면 환자들이 ChatGPT 에 검색할 법한
// 키워드 50개 + 설명을 뽑아 저장하고, 공유 링크를 광고주에게 보낸다.
export default async function KeywordAdminPage() {
  if (!(await isAdmin())) redirect("/admin/login");

  const proposals = await listKeywordProposals();
  return <KeywordAdmin proposals={proposals} />;
}
