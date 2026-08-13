"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Bell } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  getUnseenTaskCountAction,
  markTasksSeenAction,
} from "@/lib/task-actions";

const QUERY_KEY = ["employee", "unseen-task-count"];

/**
 * 상단바 알림 종 — 마지막 확인 이후 새로 배정된 업무가 있으면 N 배지를 띄운다.
 * 종을 눌러 /employee/tasks 로 이동하면(사이드바로 직접 가도) 확인 처리되어 배지가 사라진다.
 * 새 배정 감지는 60초 주기 폴링 + 창 포커스 시 재조회(TanStack Query 기본값).
 */
export default function TaskAlarmBell() {
  const pathname = usePathname();
  const queryClient = useQueryClient();

  const { data: count = 0 } = useQuery({
    queryKey: QUERY_KEY,
    queryFn: () => getUnseenTaskCountAction(),
    refetchInterval: 60_000,
  });

  // 할당 업무 페이지를 열면 읽음 처리 → 배지 제거
  useEffect(() => {
    if (pathname !== "/employee/tasks" || count === 0) return;
    markTasksSeenAction().then(() =>
      queryClient.setQueryData(QUERY_KEY, 0),
    );
  }, [pathname, count, queryClient]);

  return (
    <Link
      href="/employee/tasks"
      aria-label={count > 0 ? "새로 배정된 업무가 있어요" : "할당 업무 알림"}
      className="relative flex h-9 w-9 items-center justify-center rounded-full text-gray-400 transition-colors hover:bg-gray-50 hover:text-gray-600"
    >
      <Bell className="h-5 w-5" />
      {count > 0 && (
        <span className="absolute top-0.5 right-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold leading-none text-white">
          N
        </span>
      )}
    </Link>
  );
}
