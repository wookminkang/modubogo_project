import { CheckCircle2, LinkIcon } from "lucide-react";
import { getIntakeByNanoid } from "@/lib/db";
import IntakeForm from "./IntakeForm";

interface Props {
  params: Promise<{ token: string }>;
}

export const dynamic = "force-dynamic";

// 광고주가 알림톡/메일 링크로 진입하는 공개 페이지. token = nanoid
export default async function IntakePage({ params }: Props) {
  const { token } = await params;
  const intake = await getIntakeByNanoid(decodeURIComponent(token));

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
        desc={`${intake.company ? `${intake.company} ` : ""}준비자료가 정상적으로 접수되었습니다. 감사합니다.`}
      />
    );
  }

  return <IntakeForm nanoid={intake.nanoid} company={intake.company ?? ""} />;
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
  const bg =
    tone === "brand"
      ? "bg-[var(--seed-color-bg-brand-solid)]"
      : "bg-[var(--seed-color-bg-neutral)]";
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-10 text-center">
      <span
        className={`mb-4 flex h-14 w-14 items-center justify-center rounded-full ${bg}`}
      >
        {icon}
      </span>
      <p className="text-lg font-bold text-[var(--seed-color-fg-neutral)]">
        {title}
      </p>
      <p className="mt-2 max-w-[300px] text-sm text-[var(--seed-color-fg-neutral-subtle)]">
        {desc}
      </p>
    </div>
  );
}
