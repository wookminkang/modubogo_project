import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft, Building2 } from "lucide-react";
import { getCompanySettings } from "@/lib/db";
import { Badge } from "seed-design/ui/badge";
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
  return { title: `${decodeURIComponent(slug)} · 모두보고` };
}

export default async function HospitalDetailPage({ params }: Props) {
  const { slug } = await params;
  const company = decodeURIComponent(slug);
  const settings = await getCompanySettings(company);
  const region = settings?.region ?? null;

  return (
    <>
      {/* 1. 히어로 이미지 (풀블리드 정사각) + 뒤로가기 오버레이 */}
      <div className="relative">
        <Link
          href="/hospital"
          aria-label="병원 목록으로"
          className="absolute left-3 top-3 z-10 inline-flex h-9 w-9 items-center justify-center rounded-full bg-black/35 backdrop-blur-sm transition-opacity hover:opacity-80"
        >
          <ArrowLeft size={20} className="text-white" />
        </Link>
        <ContentPlaceholder aria-hidden className="w-full" style={{ aspectRatio: "1 / 1" }}>
          <Building2 className="h-16 w-16 text-gray-400" />
        </ContentPlaceholder>
      </div>

      {/* 2. 상호명 + 메타 */}
      <div className="px-4 pt-4 pb-1">
        <div className="flex items-start justify-between gap-3">
          <Text as="h1" textStyle="t8Bold" maxLines={2}>
            {company}
          </Text>
          <div className="shrink-0">
            <EditHospitalButton company={company} defaultRegion={region} />
          </div>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-1.5">
          {region ? (
            <Badge tone="brand" variant="weak" size="medium">
              {region}
            </Badge>
          ) : (
            <Badge tone="neutral" variant="weak" size="medium">
              지역 미설정
            </Badge>
          )}
          <Text as="span" textStyle="t4Regular" color="fg.neutralMuted">
            · 광고 운영 병원
          </Text>
        </div>
      </div>

      {/* 3. 탭: 병원정보 / 히스토리 */}
      <HospitalTabs company={company} settings={settings} />

      {/* 4. 하단 CTA */}
      <div className="px-4 pb-5 pt-1">
        <ActionButton asChild variant="brandSolid" size="medium" style={{ width: "100%" }}>
          <Link href={`/report/${encodeURIComponent(company)}`}>이 병원 보고서 보기</Link>
        </ActionButton>
      </div>
    </>
  );
}
