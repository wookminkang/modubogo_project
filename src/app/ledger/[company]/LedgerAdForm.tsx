"use client";

import { useState } from "react";
import { Megaphone } from "lucide-react";
import { saveLedgerAdSettings } from "@/lib/ledger-actions";
import Toast from "@/components/Toast";
import { ActionButton } from "seed-design/ui/action-button";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

interface Props {
  company: string;
  initialEnabled: boolean;
  initialUrl: string;
}

/**
 * 관리자 편집 페이지의 광고 배너 설정.
 * 노출 여부(예/아니오) + 클릭 시 이동할 링크를 저장한다.
 * 광고주 화면(/view)의 거래 피드 중간에 이 설정에 따라 배너가 노출된다.
 */
export default function LedgerAdForm({
  company,
  initialEnabled,
  initialUrl,
}: Props) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [url, setUrl] = useState(initialUrl);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  async function handleSave() {
    setSaving(true);
    try {
      await saveLedgerAdSettings(company, { enabled, url });
      setToast("광고 배너 설정이 저장되었어요 ✅");
    } catch (e) {
      setToast(e instanceof Error ? e.message : "저장 실패. 다시 시도해주세요.");
    }
    setSaving(false);
  }

  return (
    <div className="mb-5 rounded-2xl border border-gray-100 bg-white p-5 shadow-sm">
      <div className="mb-4 flex items-center gap-1.5">
        <Megaphone size={18} className="text-[#0e299c]" />
        <h2 className="text-base font-bold text-gray-900">광고 배너</h2>
        <span className="text-sm text-gray-400">
          광고주 화면 거래내역 중간에 노출돼요
        </span>
      </div>

      {/* 노출 여부 — 예/아니오 */}
      <div className="flex items-center gap-3">
        <span className="text-sm font-semibold text-gray-600">배너 노출</span>
        <div className="flex gap-2">
          {[
            { v: true, label: "예" },
            { v: false, label: "아니오" },
          ].map(({ v, label }) => {
            const active = enabled === v;
            return (
              <button
                key={label}
                type="button"
                onClick={() => setEnabled(v)}
                className={`cursor-pointer rounded-full px-4 py-1.5 text-sm font-semibold transition-colors ${
                  active
                    ? "bg-[#0e299c] text-white"
                    : "bg-[#F0F4FA] text-gray-500 hover:bg-[#e7edf6]"
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 이동 링크 */}
      <div className="mt-4">
        <TextField
          label="이동 링크"
          value={url}
          onValueChange={({ value }) => setUrl(value)}
        >
          <TextFieldInput placeholder="예) https://mediroad.io" />
        </TextField>
      </div>

      <div className="mt-4 flex justify-end">
        <ActionButton
          variant="brandSolid"
          size="medium"
          loading={saving}
          onClick={handleSave}
        >
          저장
        </ActionButton>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}
