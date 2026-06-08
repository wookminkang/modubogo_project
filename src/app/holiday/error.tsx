"use client";

import ErrorState from "@/components/ErrorState";

export default function HolidayError(props: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <ErrorState
      {...props}
      title="진료일정 화면 오류"
      description={"데이터를 불러오는 중 문제가 발생했어요.\n다시 시도해 주세요."}
      homeHref="/holiday"
      homeLabel="진료일정 허브로"
    />
  );
}
