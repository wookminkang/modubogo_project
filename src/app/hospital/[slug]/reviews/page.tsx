import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import {
  resolveCompanyParam,
  getCompanySettings,
  getNaverReviewHistory,
  type NaverReviewSnapshot,
} from "@/lib/db";
import dayjs from "@/lib/dayjs";
import { Text } from "seed-design/ui/text";
import ReviewChart from "./ReviewChart";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${await resolveCompanyParam(slug)} 네이버 리뷰 · 모두보고` };
}

/** 전일 대비 증감 pill. 상승=파랑 / 하락=빨강 / 무변동·최초=회색 */
function DeltaChip({ delta }: { delta: number | null }) {
  if (delta === null)
    return <span className="text-xs font-medium text-gray-300">—</span>;
  if (delta === 0)
    return (
      <span className="inline-flex rounded-full bg-gray-100 px-1.5 py-0.5 text-[11px] font-semibold text-gray-400">
        —
      </span>
    );
  const up = delta > 0;
  return (
    <span
      className={`inline-flex rounded-full px-1.5 py-0.5 text-[11px] font-bold ${
        up ? "bg-[#eaeef8] text-[#0e299c]" : "bg-red-50 text-red-500"
      }`}
    >
      {up ? `▲ +${delta}` : `▼ ${delta}`}
    </span>
  );
}

function SummaryCard({
  label,
  value,
  delta,
}: {
  label: string;
  value: number;
  delta: number | null;
}) {
  return (
    <div className="flex-1 rounded-2xl border border-[var(--seed-color-stroke-neutral-muted)] bg-[var(--seed-color-bg-layer-default)] px-4 py-4">
      <p className="text-xs text-gray-500">{label}</p>
      <div className="mt-1 flex items-baseline gap-2">
        <span className="text-2xl font-bold text-gray-900">
          {value.toLocaleString()}
        </span>
        <DeltaChip delta={delta} />
      </div>
    </div>
  );
}

export default async function HospitalReviewsPage({ params }: Props) {
  const { slug } = await params;
  const company = await resolveCompanyParam(slug);

  const [settings, reviews] = await Promise.all([
    getCompanySettings(company),
    getNaverReviewHistory(company),
  ]);

  // 게이트: 수집된 리뷰 스냅샷이 없으면 404 (병원 상세의 버튼도 같은 조건으로 숨는다).
  if (reviews.length === 0) notFound();
  const backSlug =
    (settings?.nanoid as string | null | undefined) ?? encodeURIComponent(company);

  // 최신순(내림차순). 최신 = reviews[0], 전일 = reviews[1].
  const latest: NaverReviewSnapshot | undefined = reviews[0];
  const prev: NaverReviewSnapshot | undefined = reviews[1];

  // 차트는 오름차순(과거→현재).
  const chartData = [...reviews].reverse().map((r) => ({
    label: dayjs(r.captured_date).format("M/D"),
    방문자: r.visitor_reviews,
    블로그: r.blog_reviews,
  }));

  return (
    <div className="px-4 py-4 md:px-6 md:py-8">
      {/* 상단: 뒤로가기 + 제목 */}
      <div className="flex items-center gap-2">
        <Link
          href={`/hospital/${backSlug}`}
          aria-label="병원 상세로"
          className="inline-flex h-9 w-9 items-center justify-center rounded-full transition-colors hover:bg-black/5"
        >
          <ArrowLeft size={20} className="text-gray-700" />
        </Link>
        <div>
          <Text as="h1" textStyle="t7Bold">
            네이버 리뷰 현황
          </Text>
          <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle">
            {company}
          </Text>
        </div>
      </div>

      {reviews.length === 0 ? (
        <div className="py-16 text-center">
          <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle">
            아직 수집된 리뷰 데이터가 없어요.
          </Text>
        </div>
      ) : (
        <div className="mt-5 flex flex-col gap-5 md:max-w-[640px]">
          {/* 요약 카드 */}
          <div className="flex gap-3">
            <SummaryCard
              label="방문자 리뷰"
              value={latest!.visitor_reviews}
              delta={prev ? latest!.visitor_reviews - prev.visitor_reviews : null}
            />
            <SummaryCard
              label="블로그 리뷰"
              value={latest!.blog_reviews}
              delta={prev ? latest!.blog_reviews - prev.blog_reviews : null}
            />
          </div>

          {/* 추이 차트 */}
          <div className="rounded-2xl border border-[var(--seed-color-stroke-neutral-muted)] bg-[var(--seed-color-bg-layer-default)] px-2 py-4">
            <Text as="p" textStyle="t4Bold" className="px-3 pb-2">
              리뷰 추이
            </Text>
            <ReviewChart data={chartData} />
          </div>

          {/* 일자별 표 (최신순, 전일 대비 증감) */}
          <div className="overflow-hidden rounded-2xl border border-[var(--seed-color-stroke-neutral-muted)]">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-[var(--seed-color-bg-neutral-subtle)] text-xs text-gray-500">
                  <th className="px-4 py-2.5 text-left font-medium">날짜</th>
                  <th className="px-4 py-2.5 text-right font-medium">방문자</th>
                  <th className="px-4 py-2.5 text-right font-medium">블로그</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((r, i) => {
                  const before = reviews[i + 1]; // 다음(더 과거) 항목
                  const visitorDelta = before
                    ? r.visitor_reviews - before.visitor_reviews
                    : null;
                  const blogDelta = before
                    ? r.blog_reviews - before.blog_reviews
                    : null;
                  return (
                    <tr
                      key={r.captured_date}
                      className={
                        i > 0
                          ? "border-t border-[var(--seed-color-stroke-neutral-muted)]"
                          : ""
                      }
                    >
                      <td className="px-4 py-3 align-middle font-medium text-gray-700">
                        {dayjs(r.captured_date).format("YYYY.MM.DD")}
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <div className="font-semibold text-gray-900">
                          {r.visitor_reviews.toLocaleString()}
                        </div>
                        <div className="mt-0.5">
                          <DeltaChip delta={visitorDelta} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right align-middle">
                        <div className="font-semibold text-gray-900">
                          {r.blog_reviews.toLocaleString()}
                        </div>
                        <div className="mt-0.5">
                          <DeltaChip delta={blogDelta} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
