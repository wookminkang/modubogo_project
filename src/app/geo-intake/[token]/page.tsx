import { CheckCircle2, LinkIcon } from "lucide-react";
import { getGeoIntakeByNanoid } from "@/lib/geo-intake-db";
import GeoIntakeForm from "./GeoIntakeForm";

interface Props {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";

// 병원 담당자가 링크로 진입하는 공개 페이지. token = geo_intakes.nanoid
// 제출이 끝난 링크는 안내만 보여주고 입력값을 다시 내려보내지 않는다 —
// 계정 비밀번호가 링크를 가진 사람에게 다시 노출되지 않게 하기 위함.
export default async function GeoIntakePage({ params }: Props) {
  const { token } = await params;
  const intake = await getGeoIntakeByNanoid(decodeURIComponent(token));

  if (!intake) {
    return (
      <CenterMessage
        icon={<LinkIcon size={28} className="text-white" />}
        tone="neutral"
        title="유효하지 않은 링크예요"
        desc="링크가 만료되었거나 잘못되었습니다. 담당자에게 문의해 주세요."
      />
    );
  }

  if (intake.status === "submitted") {
    return (
      <CenterMessage
        icon={<CheckCircle2 size={28} className="text-white" />}
        tone="brand"
        title="이미 제출이 완료되었어요"
        desc={`${intake.company ? `${intake.company} ` : ""}정보가 접수되었습니다. 수정이 필요하시면 담당자에게 말씀해 주세요.`}
      />
    );
  }

  return <GeoIntakeForm nanoid={intake.nanoid} company={intake.company ?? ""} />;
}

function CenterMessage({
  icon,
  tone,
  title,
  desc,
}: {
  icon: React.ReactNode;
  tone: "brand" | "neutral";
  title: string;
  desc: string;
}) {
  const bg = tone === "brand" ? "bg-[var(--seed-color-bg-brand-solid)]" : "bg-gray-400";
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <span className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${bg}`}>
        {icon}
      </span>
      <p className="text-lg font-bold text-[var(--seed-color-fg-neutral)]">{title}</p>
      <p className="mt-2 max-w-[300px] text-sm text-[var(--seed-color-fg-neutral-subtle)]">{desc}</p>
    </div>
  );
}
