"use client";

import { Check } from "lucide-react";
import { ActionButton } from "seed-design/ui/action-button";
import { Text } from "seed-design/ui/text";

// 완료 화면 (퍼널 종료)
export function DoneStep({ monthLabel }: { monthLabel: string }) {
  // "확인" 누르면 0.5초 뒤 카카오 인앱 브라우저 닫기 (인앱이 아니면 무시됨)
  const handleClose = () => {
    setTimeout(() => {
      window.location.href = "kakaotalk://inappbrowser/close";
    }, 500);
  };

  return (
    <div className="flex flex-1 flex-col items-center justify-center px-4 py-10">
      <div className="mx-auto flex max-w-[480px] flex-col items-center gap-4 rounded-2xl px-6 py-14 text-center">
        <span className="flex h-14 w-14 items-center justify-center rounded-full bg-[var(--seed-color-bg-brand-solid)]">
          <Check size={28} className="text-white" />
        </span>
        <div className="flex flex-col gap-2 mb-2">
          <Text as="p" textStyle="t8Bold">
            확인 완료되었습니다
          </Text>
          <Text as="p" textStyle="t6Regular" color="fg.neutralSubtle">
            {monthLabel} 진료일정을 확인해 주셔서 감사합니다.
          </Text>
        </div>
        <ActionButton
          variant="brandSolid"
          size="large"
          className="w-full"
          onClick={handleClose}
        >
          확인
        </ActionButton>
      </div>
    </div>
  );
}
