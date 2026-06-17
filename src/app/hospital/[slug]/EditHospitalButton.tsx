"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  updateHospitalRegion,
  updateHospitalCategory,
} from "@/lib/company-actions";
import Toast from "@/components/Toast";
import { ActionButton } from "seed-design/ui/action-button";
import { Text } from "seed-design/ui/text";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";
import {
  BottomSheetRoot,
  BottomSheetTrigger,
  BottomSheetContent,
  BottomSheetBody,
  BottomSheetFooter,
} from "seed-design/ui/bottom-sheet";

interface Props {
  company: string;
  defaultRegion?: string | null;
  defaultCategory?: string | null;
}

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

export default function EditHospitalButton({
  company,
  defaultRegion,
  defaultCategory,
}: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState(defaultRegion ?? "");
  const [category, setCategory] = useState(defaultCategory ?? "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  async function handleSubmit() {
    setSaving(true);
    try {
      await updateHospitalRegion({ company, region: region.trim() });
      // 유형이 선택되어 있고 기존과 다르면 갱신
      if (category && category !== (defaultCategory ?? "")) {
        await updateHospitalCategory({ company, hospitalType: category });
      }
      setToast("병원 정보가 저장되었어요 ✅");
      setOpen(false);
      router.refresh();
    } catch {
      setToast("저장 실패. 다시 시도해주세요.");
    }
    setSaving(false);
  }

  return (
    <>
      <BottomSheetRoot open={open} onOpenChange={setOpen}>
        <BottomSheetTrigger asChild>
          <ActionButton variant="neutralWeak" size="small">
            정보 수정
          </ActionButton>
        </BottomSheetTrigger>

        <BottomSheetContent
          title={company}
          description="지역과 유형을 수정할 수 있어요"
        >
          <BottomSheetBody>
            <div className="flex flex-col gap-4 pb-2">
              <TextField
                label="지역"
                value={region}
                onValueChange={({ value }) => setRegion(value)}
              >
                <TextFieldInput placeholder="예) 서울 강남" />
              </TextField>

              {/* 유형(카테고리) */}
              <div>
                <Text textStyle="t4Bold">유형</Text>
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
          </BottomSheetBody>

          <BottomSheetFooter>
            <div className="flex w-full flex-row gap-2">
              <div className="flex-[3]">
                <ActionButton
                  variant="neutralWeak"
                  size="large"
                  className="w-full"
                  onClick={() => setOpen(false)}
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
                  저장
                </ActionButton>
              </div>
            </div>
          </BottomSheetFooter>
        </BottomSheetContent>
      </BottomSheetRoot>

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
