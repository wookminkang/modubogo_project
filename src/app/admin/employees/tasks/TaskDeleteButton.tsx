"use client";

import { useState, useTransition } from "react";
import ConfirmToast from "@/components/ConfirmToast";
import Toast from "@/components/Toast";
import { deleteTaskAction } from "@/lib/task-actions";

/** 업무 삭제 버튼 — ConfirmToast 확인 → 서버 액션 → Toast (alert 금지 컨벤션). */
export default function TaskDeleteButton({
  taskId,
  title,
}: {
  taskId: string;
  title: string;
}) {
  const [confirming, setConfirming] = useState(false);
  const [toast, setToast] = useState("");
  const [, startTransition] = useTransition();

  const handleDelete = () => {
    setConfirming(false);
    startTransition(async () => {
      const result = await deleteTaskAction(taskId);
      setToast(result.ok ? "업무를 삭제했어요" : (result.error ?? "삭제 실패"));
    });
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setConfirming(true)}
        className="text-xs font-medium text-red-600 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-50 transition-colors"
      >
        삭제
      </button>

      {confirming && (
        <ConfirmToast
          title="업무를 삭제할까요?"
          subtitle={title}
          showIcon={false}
          yesLabel="삭제"
          noLabel="취소"
          onYes={handleDelete}
          onNo={() => setConfirming(false)}
        />
      )}
      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
