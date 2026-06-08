"use client";

import ErrorState from "@/components/ErrorState";

export default function HospitalError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      {...props}
      title="병원 목록을 불러오지 못했어요"
      description={"일시적인 오류일 수 있어요.\n다시 시도해 주세요."}
      homeHref="/"
      homeLabel="홈으로 돌아가기"
    />
  );
}
