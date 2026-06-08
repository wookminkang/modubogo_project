"use client";

import ErrorState from "@/components/ErrorState";

export default function ReportError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      {...props}
      title="보고서를 불러오지 못했어요"
      description={"일시적인 오류이거나 데이터를 가져오지 못했어요.\n다시 시도해 주세요."}
      homeHref="/report"
      homeLabel="보고서 목록으로"
    />
  );
}
