"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateHospitalRegion } from "@/lib/company-actions";
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
}

export default function EditHospitalButton({ company, defaultRegion }: Props) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [region, setRegion] = useState(defaultRegion ?? "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  async function handleSubmit() {
    setSaving(true);
    try {
      await updateHospitalRegion({ company, region: region.trim() });
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

        <BottomSheetContent title="병원 정보 수정" description={company}>
          <BottomSheetBody>
            <div className="flex flex-col gap-4 pb-2">
              {/* 병원명은 보고서가 참조하는 키라 수정 불가 */}
              <div>
                <Text textStyle="t4Bold">병원명</Text>
                <Text textStyle="t5Regular" color="fg.neutralSubtle" className="mt-1">
                  {company}
                </Text>
                <Text as="p" textStyle="t2Regular" color="fg.neutralSubtle" className="mt-1">
                  병원명은 변경할 수 없어요.
                </Text>
              </div>

              <TextField
                label="지역"
                value={region}
                onValueChange={({ value }) => setRegion(value)}
              >
                <TextFieldInput placeholder="예) 서울 강남" />
              </TextField>
            </div>
          </BottomSheetBody>

          <BottomSheetFooter className="flex gap-2">
            <ActionButton variant="neutralWeak" flexGrow onClick={() => setOpen(false)}>
              취소
            </ActionButton>
            <ActionButton variant="brandSolid" flexGrow loading={saving} onClick={handleSubmit}>
              저장
            </ActionButton>
          </BottomSheetFooter>
        </BottomSheetContent>
      </BottomSheetRoot>

      {toast && <Toast message={toast} onDone={() => setToast("")} />}
    </>
  );
}
