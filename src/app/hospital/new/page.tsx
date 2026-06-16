import Link from "next/link";
import type { Metadata } from "next";
import { ArrowLeft } from "lucide-react";
import { Text } from "seed-design/ui/text";
import NewHospitalForm from "./NewHospitalForm";

export const metadata: Metadata = {
  title: "병원 등록 · 모두보고",
};

export default function NewHospitalPage() {
  return (
    <>
      <header className="border-b border-[var(--seed-color-stroke-neutral-muted)] px-4 pt-4 pb-4">
        <Link
          href="/hospital"
          className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-70"
        >
          <ArrowLeft size={18} />
          <Text as="span" textStyle="t5Bold" color="fg.neutralMuted">
            병원 목록
          </Text>
        </Link>

        <div className="mt-4">
          <Text as="h1" textStyle="t6Bold">
            새 병원 등록
          </Text>
          <Text as="p" textStyle="t4Regular" color="fg.neutralSubtle" className="mt-1.5">
            병원명과 지역을 입력해 등록하세요.
          </Text>
        </div>
      </header>

      <NewHospitalForm />
    </>
  );
}
