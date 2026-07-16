import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Building2 } from "lucide-react";
import {
  getCompanySettings,
  getCompanyHospitalType,
  getHospitalNotes,
  getNaverReviewHistory,
  resolveCompanyParam,
  NAVER_REVIEW_COMPANIES,
} from "@/lib/db";
import { ContentPlaceholder } from "seed-design/ui/content-placeholder";
import { Text } from "seed-design/ui/text";
import { ActionButton } from "seed-design/ui/action-button";
import HospitalTabs from "./HospitalTabs";
import EditHospitalButton from "./EditHospitalButton";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  return { title: `${await resolveCompanyParam(slug)} · 모두보고` };
}

export default async function HospitalDetailPage({ params }: Props) {
  const { slug } = await params;
  const company = await resolveCompanyParam(slug);
  const [settings, hospitalType, notes, reviews] = await Promise.all([
    getCompanySettings(company),
    getCompanyHospitalType(company),
    getHospitalNotes(company),
    NAVER_REVIEW_COMPANIES.has(company)
      ? getNaverReviewHistory(company)
      : Promise.resolve([]),
  ]);
  const region = settings?.region ?? null;
  const reportSlug =
    (settings?.nanoid as string | null | undefined) ?? encodeURIComponent(company);
  const reviewsHref = `/hospital/${reportSlug}/reviews`;

  const reportCta = (
    <div className="flex flex-col gap-2">
      <ActionButton asChild variant="brandSolid" size="medium" className="w-full">
        <Link href={`/report/${reportSlug}`}>이 병원 보고서 보기</Link>
      </ActionButton>
      <ActionButton asChild variant="neutralWeak" size="medium" className="w-full">
        <Link href={`/ledger/${reportSlug}`}>입금·소진 관리내역</Link>
      </ActionButton>
      {reviews.length > 0 && (
        <ActionButton asChild variant="neutralWeak" size="medium" className="w-full">
          <Link href={reviewsHref}>네이버 리뷰</Link>
        </ActionButton>
      )}
    </div>
  );

  return (
    // 모바일: 세로 1열 / 데스크탑(md+): 좌(기본정보) · 우(탭) 2열
    <div className="md:flex md:items-start md:gap-8 md:px-6 md:py-8">
      {/* ── 좌측: 히어로 + 상호명/지역 + CTA(데스크탑) ── */}
      <div className="md:w-[340px] md:shrink-0">
        {/* 히어로 이미지 (정사각) + 뒤로가기 오버레이 */}
        <div className="relative md:overflow-hidden md:rounded-2xl">
          <Link
            href="/hospital"
            aria-label="병원 목록으로"
            className="absolute left-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm transition-opacity hover:opacity-80"
          >
            <ArrowLeft size={20} className="text-white" />
          </Link>
          <ContentPlaceholder
            aria-hidden
            className="w-full"
            style={{ aspectRatio: "1 / 1" }}
          >
            <Building2 className="h-16 w-16 text-gray-400" />
          </ContentPlaceholder>
        </div>

        {/* 상호명 + 메타 */}
        <div className="px-4 pt-4 pb-1 md:px-0">
          <div className="flex items-start justify-between gap-3">
            <Text as="h1" textStyle="t8Bold" maxLines={2}>
              {company}
            </Text>
            <div className="shrink-0">
              <EditHospitalButton
                company={company}
                defaultRegion={region}
                defaultCategory={hospitalType}
              />
            </div>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Text as="span" textStyle="t4Regular" color="fg.neutralMuted">
              {[hospitalType, region ?? "지역 미설정"]
                .filter(Boolean)
                .join(" · ")}{" "}
              · 광고 운영 병원
            </Text>
          </div>
        </div>

        {/* CTA — 데스크탑에서는 좌측 하단 */}
        <div className="hidden pt-5 md:block">{reportCta}</div>
      </div>

      {/* ── 우측: 탭 (병원정보 / 히스토리) ── */}
      <div className="md:min-w-0 md:flex-1">
        <HospitalTabs
          company={company}
          settings={settings}
          initialNotes={notes}
        />

        {/* CTA — 모바일에서는 하단 */}
        <div className="px-4 pb-5 pt-1 md:hidden">{reportCta}</div>
      </div>
    </div>
  );
}
