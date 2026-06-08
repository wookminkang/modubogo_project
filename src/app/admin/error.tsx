"use client";

import ErrorState from "@/components/ErrorState";

export default function AdminError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      {...props}
      title="관리자 화면 오류"
      description={"데이터를 불러오는 중 문제가 발생했어요.\n다시 시도해 주세요."}
      homeHref="/admin/dashboard"
      homeLabel="대시보드로 이동"
    />
  );
}
