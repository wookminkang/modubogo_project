"use client";

import { useState } from "react";
import { Reorder } from "motion/react";
import { GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";
import { SECTION_LABELS, type ReportSectionKey } from "@/lib/report-sections";

interface Props {
  value: ReportSectionKey[];
  onChange: (next: ReportSectionKey[]) => void;
}

/**
 * 보고서 섹션 순서를 드래그로 바꾸는 목록 (마우스·터치 모두 지원).
 * 바꾼 순서는 모든 병원 보고서에 공통으로 적용된다.
 */
export default function SectionOrderEditor({ value, onChange }: Props) {
  return (
    <Reorder.Group
      as="div"
      axis="y"
      values={value}
      onReorder={onChange}
      className="flex flex-col gap-2"
    >
      {value.map((key, index) => (
        <SectionRow key={key} section={key} index={index} />
      ))}
    </Reorder.Group>
  );
}

function SectionRow({
  section,
  index,
}: {
  section: ReportSectionKey;
  index: number;
}) {
  const [dragging, setDragging] = useState(false);

  return (
    <Reorder.Item
      as="div"
      value={section}
      whileDrag={{ scale: 1.02 }}
      onDragStart={() => setDragging(true)}
      onDragEnd={() => setDragging(false)}
      className={cn(
        "flex cursor-grab touch-none select-none items-center gap-3 rounded-xl bg-[var(--seed-color-bg-neutral-weak)] px-4 py-3 active:cursor-grabbing",
        dragging && "shadow-lg",
      )}
    >
      <GripVertical className="h-4 w-4 shrink-0 text-[var(--seed-color-fg-neutral-muted)]" />
      <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[var(--seed-color-bg-brand-solid)] text-xs font-bold text-[var(--seed-color-fg-brand-contrast)]">
        {index + 1}
      </span>
      <span className="text-sm font-semibold text-[var(--seed-color-fg-neutral)]">
        {SECTION_LABELS[section]}
      </span>
    </Reorder.Item>
  );
}
