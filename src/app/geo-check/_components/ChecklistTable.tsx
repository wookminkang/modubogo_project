"use client";

import { Fragment, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { GeoKeyword, GeoRunResult } from "@/lib/geo-db";
import { updateGeoKeywordMeta } from "@/lib/geo-actions";
import AnswerView from "./AnswerView";
import { categoryClass } from "./categories";

// O/X 체크리스트. 한눈에 훑을 수 있게 스프레드시트 형태로 짠다.
// 번호 | 카테고리 | 검색어 | GPT | 제미나이 | 비고
//
// 행(검색어 칸)을 누르면 그 아래로 ChatGPT 답변 원문이 펼쳐진다.
// 제미나이 열은 아직 수집 수단이 없어 항상 공란이다 — 엔진을 추가하면 채운다.

/** 표의 한 행. 아직 점검 안 한 키워드는 result 가 없어 GPT 칸이 공란으로 남는다. */
type Row = {
  key: string;
  keywordId: string | null;
  keywordText: string;
  category: string | null;
  memo: string | null;
  /** 비활성 키워드는 다음 실행에서 빠진다. 행은 남기되 흐리게 표시한다. */
  active: boolean;
  result: GeoRunResult | null;
};

export default function ChecklistTable({
  targetId,
  targetName,
  highlightTerms,
  date,
  hasRun,
  results,
  keywords,
}: {
  targetId: string;
  targetName: string;
  /** 답변에서 형광펜으로 칠할 표현들 (정식명·별칭·브랜드 토큰). */
  highlightTerms: string[];
  /** 지금 보고 있는 점검일 (YYYY-MM-DD). */
  date: string;
  /** 그날 점검 기록이 있는지. 없으면 표 전체가 공란(미점검)이다. */
  hasRun: boolean;
  results: GeoRunResult[];
  keywords: GeoKeyword[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function saveMemo(keywordId: string | null, memo: string) {
    if (!keywordId) return;
    startTransition(async () => {
      await updateGeoKeywordMeta(targetId, keywordId, { memo });
      router.refresh();
    });
  }

  // 표는 결과가 아니라 **키워드 전체**를 기준으로 그린다.
  // 이번 회차에 안 돌린 키워드도 행은 있어야 하고, 그 칸이 "공란=미점검"이다.
  const resultByKeywordId = new Map(
    results.filter((r) => r.keywordId).map((r) => [r.keywordId as string, r]),
  );
  const rows: Row[] = keywords.map((k) => ({
    key: k.id,
    keywordId: k.id,
    keywordText: k.keyword,
    category: k.category,
    memo: k.memo,
    active: k.active,
    result: resultByKeywordId.get(k.id) ?? null,
  }));

  // 키워드가 지워졌는데 과거 결과만 남은 행은 이력 보존 차원에서 뒤에 붙인다.
  for (const r of results) {
    if (r.keywordId && resultByKeywordId.has(r.keywordId) && keywords.some((k) => k.id === r.keywordId)) continue;
    if (rows.some((row) => row.result?.id === r.id)) continue;
    rows.push({
      key: r.id, keywordId: r.keywordId, keywordText: r.keywordText,
      category: null, memo: null, active: false, result: r,
    });
  }

  const checkedCount = rows.filter((r) => r.result?.status === "done").length;

  return (
    <div className="overflow-hidden rounded-lg border border-gray-300">
      {/* 제목 밴드 */}
      <div className="bg-[#4a7c3f] px-4 py-3 text-center text-[17px] font-bold text-white">
        {targetName} GEO 노출 체크 — 점검일 {date}
        {!hasRun && " (미점검)"}
      </div>

      <p className="border-b border-gray-200 bg-white px-4 py-2 text-[12px] italic text-gray-600">
        ※ ChatGPT(웹검색·추론 모드) 기준. O=노출 / X=미노출 / 공란=미점검. 제미나이는 미점검.
        {" "}(전체 {rows.length}개 중 {checkedCount}개 점검)
      </p>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[860px] border-collapse text-[13px]">
          <thead>
            <tr className="bg-[#434343] text-white">
              <Th className="w-14">번호</Th>
              <Th className="w-24">카테고리</Th>
              <Th className="text-left">검색어 (프롬프트)</Th>
              <Th className="w-16">GPT</Th>
              <Th className="w-20">제미나이</Th>
              <Th className="w-52 text-left">비고</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => {
              const r = row.result;
              const category = row.category;
              const isOpen = open === row.key;

              return (
                <Fragment key={row.key}>
                  <tr
                    className={`border-b border-gray-200 ${isOpen ? "bg-[#eef2fb]" : "hover:bg-gray-50"}`}
                  >
                    <Td className="text-center text-gray-500">{i + 1}</Td>

                    <Td className="text-center">
                      {category ? (
                        <span
                          className={`inline-block w-full rounded px-2 py-1 text-[12px] font-semibold ${categoryClass(category)}`}
                        >
                          {category}
                        </span>
                      ) : (
                        <span className="text-gray-300">—</span>
                      )}
                    </Td>

                    <Td>
                      <button
                        type="button"
                        onClick={() => r && setOpen(isOpen ? null : row.key)}
                        disabled={!r}
                        className={`w-full text-left enabled:hover:text-[#0e299c] disabled:cursor-default ${
                          row.active ? "text-[#333d4b]" : "text-gray-400"
                        }`}
                      >
                        {row.keywordText}
                        {!row.active && (
                          <span className="ml-2 text-[11px] text-gray-400">(비활성)</span>
                        )}
                        {r?.needsReview && (
                          <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 text-[11px] font-semibold text-amber-600">
                            검토 필요
                          </span>
                        )}
                        {r?.status === "error" && (
                          <span className="ml-2 text-[11px] text-red-500">{r.error}</span>
                        )}
                      </button>
                    </Td>

                    <GptCell result={r} />

                    {/* 제미나이 — 수집 수단이 아직 없어 항상 공란 */}
                    <Td className="bg-[#fafafa] text-center text-gray-300">&nbsp;</Td>

                    <Td>
                      <input
                        defaultValue={row.memo ?? ""}
                        onBlur={(e) => {
                          if (e.target.value !== (row.memo ?? "")) {
                            saveMemo(row.keywordId, e.target.value);
                          }
                        }}
                        placeholder="—"
                        className="w-full bg-transparent text-[13px] text-[#333d4b] outline-none placeholder:text-gray-300 focus:bg-white"
                      />
                    </Td>
                  </tr>

                  {isOpen && r && (
                    <tr className="border-b border-gray-200">
                      <td colSpan={6} className="bg-[#f7f8fa] px-4 py-4">
                        {(r.matchedText || r.siteCited) && (
                          <p className="mb-3 text-xs text-[#6b7684]">
                            {r.matchedText && (
                              <>
                                매칭된 표기:{" "}
                                <mark className="rounded bg-yellow-100 px-1 font-semibold text-[#333d4b]">
                                  {r.matchedText}
                                </mark>
                              </>
                            )}
                            {r.verdict && <span className="ml-2">· {verdictLabel(r.verdict)}</span>}
                            {r.rank && <span className="ml-2">· {r.rank}번째로 등장</span>}
                            {r.siteCited && (
                              <span className="ml-2 rounded bg-[#0e299c]/10 px-1.5 py-0.5 font-semibold text-[#0e299c]">
                                공식 홈페이지 인용됨
                              </span>
                            )}
                          </p>
                        )}

                        {r.answerText ? (
                          <AnswerView markdown={r.answerText} highlightTerms={highlightTerms} />
                        ) : (
                          <p className="text-sm text-gray-400">
                            {r.status === "pending"
                              ? "아직 실행되지 않았습니다."
                              : "답변이 없습니다."}
                          </p>
                        )}

                        {r.citations.length > 0 && (
                          <div className="mt-4">
                            <p className="mb-2 text-xs font-semibold text-[#6b7684]">
                              ChatGPT가 참고한 출처 {r.citations.length}건
                            </p>
                            <ul className="flex flex-col gap-1">
                              {r.citations.map((c) => (
                                <li key={c.url}>
                                  <a
                                    href={c.url}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="text-xs text-[#0e299c] underline break-all"
                                  >
                                    {c.title}
                                  </a>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </td>
                    </tr>
                  )}
                </Fragment>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** O=초록 / X=빨강 / 미점검=공란. 스프레드시트 조건부 서식과 같은 색 규칙. */
function GptCell({ result }: { result: GeoRunResult | null }) {
  // 이번 회차에 아예 안 돌린 키워드 → 공란
  if (!result || result.status === "pending")
    return <Td className="bg-[#fafafa] text-center">&nbsp;</Td>;
  if (result.status === "error")
    return <Td className="bg-[#fff4e5] text-center font-bold text-amber-600">!</Td>;
  return result.found ? (
    <Td className="bg-[#d9ead3] text-center text-[15px] font-bold text-[#274e13]">O</Td>
  ) : (
    <Td className="bg-[#f4cccc] text-center text-[15px] font-bold text-[#8a1c1c]">X</Td>
  );
}

function Th({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return (
    <th className={`border border-gray-300 px-3 py-2 text-center font-semibold ${className}`}>
      {children}
    </th>
  );
}

function Td({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <td className={`border border-gray-200 px-3 py-2 align-middle ${className}`}>{children}</td>;
}

function verdictLabel(verdict: NonNullable<GeoRunResult["verdict"]>): string {
  switch (verdict) {
    case "recommended":
      return "추천됨";
    case "mentioned":
      return "언급됨";
    case "negative":
      return "부정적 언급";
    default:
      return "등장 안 함";
  }
}
