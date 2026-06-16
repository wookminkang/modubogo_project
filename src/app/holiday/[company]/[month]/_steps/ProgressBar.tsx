"use client";

import { ArrowLeft } from "lucide-react";
import { ActionButton } from "seed-design/ui/action-button";
import { Text } from "seed-design/ui/text";
import { TOTAL_PHASES } from "./types";

// 상단 진행 표시줄 (3단계) + 뒤로가기
export function ProgressBar({
  phase,
  showBack,
  onBack,
}: {
  phase: number;
  showBack: boolean;
  onBack: () => void;
}) {
  return (
    <div className="flex items-center gap-3 pt-4">
      {showBack && (
        <ActionButton
          variant="ghost"
          size="xsmall"
          onClick={onBack}
          aria-label="이전"
        >
          <ArrowLeft size={18} />
        </ActionButton>
      )}
      <Text textStyle="t7Bold" color="fg.neutralSubtle" className="shrink-0">
        {phase} / {TOTAL_PHASES}
      </Text>
      <div className="flex flex-1 gap-1.5">
        {Array.from({ length: TOTAL_PHASES }).map((_, i) => (
          <div
            key={i}
            className={`h-1 flex-1 rounded-full transition-colors ${
              i < phase
                ? "bg-[var(--seed-color-bg-brand-solid)]"
                : "bg-[var(--seed-color-bg-brand-weak)]"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
