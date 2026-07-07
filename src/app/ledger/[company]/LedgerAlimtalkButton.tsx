"use client";

import { useState } from "react";
import Toast from "@/components/Toast";
import ConfirmToast from "@/components/ConfirmToast";
import { sendLedgerAlimtalk } from "@/lib/bizgo";

interface Props {
  company: string; // 병원 상호명 (#{병원상호})
  slug: string; // 회사 식별자(nanoid) — 버튼 URL #{slug}
  recipients?: string[];
}

type Step = "idle" | "confirm" | "sending" | "result";

/**
 * 입금·소진(결제) 내역 안내 알림톡 발송 버튼 (템플릿: modubogo_03).
 * 등록된 수신번호(recipient1~5)로 발송, 버튼은 광고주 공개 뷰(/view)로 이동.
 */
export default function LedgerAlimtalkButton({
  company,
  slug,
  recipients,
}: Props) {
  const [step, setStep] = useState<Step>("idle");
  const [resultMsg, setResultMsg] = useState("");
  const count = recipients?.filter(Boolean).length ?? 0;

  const handleYes = async () => {
    setStep("sending");
    try {
      await sendLedgerAlimtalk({ company, slug, recipients });
      setResultMsg("결제 내역 알림톡을 발송했어요 ✅");
    } catch (e) {
      const msg = e instanceof Error ? e.message : "알 수 없는 오류";
      setResultMsg(`발송 실패: ${msg}`);
    }
    setStep("result");
  };

  const handleNo = () => {
    setStep("result");
    setResultMsg("알림톡 보내기를 취소했어요");
  };

  return (
    <>
      <button
        onClick={() => setStep("confirm")}
        disabled={step === "sending"}
        title="결제 내역 알림톡 보내기"
        className="flex shrink-0 items-center gap-1.5 rounded-xl bg-[#FEE500] px-3 py-2 text-xs font-bold text-[#3C1E1E] transition-all hover:brightness-95 active:scale-95 disabled:opacity-50"
      >
        {step === "sending" ? (
          <svg
            className="animate-spin"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M21 12a9 9 0 1 1-6.219-8.56" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.477 2 2 6.029 2 11c0 3.084 1.677 5.782 4.2 7.4L5 22l4.2-2.1C10.1 20.27 11.03 20.4 12 20.4c5.523 0 10-4.029 10-9s-4.477-9-10-9z" />
          </svg>
        )}
        알림톡
      </button>

      {step === "confirm" && (
        <ConfirmToast
          title={company}
          subtitle="결제 내역 안내"
          message={
            count > 0
              ? `등록된 수신번호 ${count}곳으로 알림톡을 보내시겠어요?`
              : "등록된 수신번호가 없습니다. 기본 수신번호로 발송할까요?"
          }
          onYes={handleYes}
          onNo={handleNo}
        />
      )}

      {step === "result" && (
        <Toast message={resultMsg} onDone={() => setStep("idle")} />
      )}
    </>
  );
}
