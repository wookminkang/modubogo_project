"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createHospital } from "@/lib/company-actions";
import Toast from "@/components/Toast";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import { ActionButton } from "seed-design/ui/action-button";

export default function NewHospitalForm() {
  const router = useRouter();
  const [company, setCompany] = useState("");
  const [region, setRegion] = useState("");
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
      await createHospital({ company: name, region: region.trim() });
      // 등록된 병원 상세로 이동
      router.push(`/hospital/${encodeURIComponent(name)}`);
    } catch (e) {
      setToast(e instanceof Error ? e.message : "등록 실패. 다시 시도해주세요.");
      setSaving(false);
    }
  }

  return (
    <div className="px-4 py-5">
      <div className="flex flex-col gap-3">
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
      </div>

      <div className="mt-6">
        <ActionButton
          variant="brandSolid"
          size="medium"
          style={{ width: "100%" }}
          loading={saving}
          onClick={handleSubmit}
        >
          병원 등록
        </ActionButton>
      </div>

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </div>
  );
}
