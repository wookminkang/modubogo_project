"use client";

import { useState } from "react";
import { saveAlimtalkSettings } from "@/lib/company-actions";
import Toast from "./Toast";

interface Props {
  company: string;
  defaultValues?: {
    recipient1?: string;
    recipient2?: string;
    recipient3?: string;
  };
}

export default function AlimtalkSettingsButton({ company, defaultValues }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await saveAlimtalkSettings({
        company,
        recipient1: fd.get("recipient1") as string,
        recipient2: fd.get("recipient2") as string,
        recipient3: fd.get("recipient3") as string,
      });
      setToast("알림톡 수신자가 저장되었어요 ✅");
      setOpen(false);
    } catch {
      setToast("저장 실패. 다시 시도해주세요.");
    }
    setSaving(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        title="알림톡 수신자 설정"
        className="flex w-full items-center justify-center gap-1.5 text-sm text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" fill="#3C1E1E" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="4" fill="#FEE500"/>
          <path d="M12 5C7.589 5 4 7.87 4 11.4c0 2.2 1.344 4.13 3.36 5.293l-.697 2.531a.268.268 0 0 0 .392.297L10.5 17.7c.49.077 1 .12 1.5.12 4.411 0 8-2.87 8-6.4S16.411 5 12 5z" />
        </svg>
        알림톡 설정
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setToast("알림톡 설정을 취소했어요"); }} />
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-7 h-7 bg-[#FEE500] rounded-full shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="#3C1E1E">
                  <path d="M12 5C7.589 5 4 7.87 4 11.4c0 2.2 1.344 4.13 3.36 5.293l-.697 2.531a.268.268 0 0 0 .392.297L10.5 17.7c.49.077 1 .12 1.5.12 4.411 0 8-2.87 8-6.4S16.411 5 12 5z" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-bold text-gray-900">알림톡 수신자 설정</p>
                <p className="text-xs text-gray-500 mt-0.5">{company}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">수신자 번호 1</label>
                <input
                  name="recipient1"
                  defaultValue={defaultValues?.recipient1 ?? ""}
                  placeholder="01012345678"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0e299c]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">수신자 번호 2 <span className="text-gray-300">(선택)</span></label>
                <input
                  name="recipient2"
                  defaultValue={defaultValues?.recipient2 ?? ""}
                  placeholder="01012345678"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0e299c]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">수신자 번호 3 <span className="text-gray-300">(선택)</span></label>
                <input
                  name="recipient3"
                  defaultValue={defaultValues?.recipient3 ?? ""}
                  placeholder="01012345678"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0e299c]"
                />
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => { setOpen(false); setToast("알림톡 설정을 취소했어요"); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#FEE500] text-[#3C1E1E] hover:brightness-95 active:scale-95 transition-all disabled:opacity-50"
                >
                  {saving ? "저장 중..." : "저장"}
                </button>
              </div>
            </form>
          </div>
        </>
      )}

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
