"use client";

import { useState } from "react";
import { saveNaverAdSettings } from "@/lib/company-actions";
import Toast from "./Toast";

interface Props {
  company: string;
  defaultValues?: {
    naver_ad_api_key?: string;
    naver_ad_secret_key?: string;
    naver_ad_customer_id?: string;
  };
}

export default function NaverAdSettingsButton({ company, defaultValues }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSaving(true);
    const fd = new FormData(e.currentTarget);
    try {
      await saveNaverAdSettings({
        company,
        naver_ad_api_key: fd.get("api_key") as string,
        naver_ad_secret_key: fd.get("secret_key") as string,
        naver_ad_customer_id: fd.get("customer_id") as string,
      });
      setToast("네이버 광고 설정이 저장되었어요 ✅");
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
        title="네이버 광고 API 설정"
        className="flex w-full items-center justify-center gap-1.5 text-xs text-gray-600 bg-white border border-gray-200 px-3 py-2 rounded-xl hover:bg-gray-50 transition-all"
      >
        <svg width="14" height="14" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <rect width="24" height="24" rx="4" fill="#03C75A"/>
          <text x="12" y="17" textAnchor="middle" fontSize="13" fontWeight="bold" fill="white" fontFamily="sans-serif">N</text>
        </svg>
        API 설정
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => { setOpen(false); setToast("API 설정을 취소했어요"); }} />
          <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
            <div className="flex items-center gap-2 mb-3">
              <span className="inline-flex items-center justify-center w-7 h-7 bg-[#03C75A] rounded-full shrink-0">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="3" />
                  <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
                </svg>
              </span>
              <div>
                <p className="text-sm font-bold text-gray-900">네이버 광고 API 설정</p>
                <p className="text-xs text-gray-500 mt-0.5">{company}</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="flex flex-col gap-2.5">
              <div>
                <label className="text-xs text-gray-500 mb-1 block">액세스 라이선스 키</label>
                <input
                  name="api_key"
                  defaultValue={defaultValues?.naver_ad_api_key ?? ""}
                  placeholder="01000000..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0e299c]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">비밀키</label>
                <input
                  name="secret_key"
                  defaultValue={defaultValues?.naver_ad_secret_key ?? ""}
                  placeholder="AQAAA..."
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0e299c]"
                />
              </div>
              <div>
                <label className="text-xs text-gray-500 mb-1 block">고객 ID</label>
                <input
                  name="customer_id"
                  defaultValue={defaultValues?.naver_ad_customer_id ?? ""}
                  placeholder="2550976"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:border-[#0e299c]"
                />
              </div>
              <div className="flex gap-2 mt-1">
                <button
                  type="button"
                  onClick={() => { setOpen(false); setToast("API 설정을 취소했어요"); }}
                  className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
                >
                  취소
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#03C75A] text-white hover:brightness-95 active:scale-95 transition-all disabled:opacity-50"
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
