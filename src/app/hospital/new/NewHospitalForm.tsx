"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createHospital } from "@/lib/company-actions";
import Toast from "@/components/Toast";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { ActionButton } from "seed-design/ui/action-button";
import { Text } from "seed-design/ui/text";

// 보고서 목록과 동일한 병원 유형 (전체 제외)
const CATEGORIES = [
  "메인 관리",
  "한의원",
  "한의원(네트워크)",
  "한의원(입원실)",
  "한방병원",
  "정신과",
  "양방",
  "일반",
  "탈퇴",
] as const;

export default function NewHospitalForm() {
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [region, setRegion] = useState("");
  const [category, setCategory] = useState("");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  async function handleSubmit() {
    const name = company.trim();
    if (!name) {
      setToast("병원명을 입력해주세요.");
      return;
    }
    setSaving(true);
    try {
      await createHospital({
        company: name,
        region: region.trim(),
        hospitalType: category || undefined,
      });
      // 등록된 병원 상세로 이동
      router.push(`/hospital/${encodeURIComponent(name)}`);
    } catch (e) {
      setToast(
        e instanceof Error ? e.message : "등록 실패. 다시 시도해주세요.",
      );
      setSaving(false);
    }
  }

  return (
    <div className="px-4 py-5">
      <div className="flex flex-col gap-4">
        <TextField
          label="병원명"
          value={company}
          onValueChange={({ value }) => setCompany(value)}
        >
          <TextFieldInput placeholder="예) 모두병원" />
        </TextField>

        <TextField
          label="지역 (선택)"
          value={region}
          onValueChange={({ value }) => setRegion(value)}
        >
          <TextFieldInput placeholder="예) 서울 강남" />
        </TextField>

        {/* 유형(카테고리) */}
        <div>
          <Text textStyle="t5Regular">유형 (선택)</Text>
          <div className="mt-2 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => {
              const active = category === c;
              return (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(active ? "" : c)}
                  className={`cursor-pointer rounded-full px-3.5 py-2 text-sm font-semibold transition-colors ${
                    active
                      ? "bg-[#0e299c] text-white"
                      : "bg-[#F0F4FA] text-gray-500 hover:bg-[#e7edf6]"
                  }`}
                >
                  {c}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* CTA: 취소(회색) / 등록 */}
      <div className="mt-6 flex w-full gap-2">
        <div className="flex-[3]">
          <ActionButton
            variant="neutralWeak"
            size="large"
            className="w-full"
            onClick={() => router.push("/hospital")}
            disabled={saving}
          >
            취소
          </ActionButton>
        </div>
        <div className="flex-[7]">
          <ActionButton
            variant="brandSolid"
            size="large"
            className="w-full"
            loading={saving}
            onClick={handleSubmit}
          >
            등록
          </ActionButton>
        </div>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}
