"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { saveAlimtalkSettings } from "@/lib/company-actions";
import Toast from "./Toast";
import { ActionButton } from "seed-design/ui/action-button";
import {
  BottomSheetRoot,
  BottomSheetTrigger,
  BottomSheetContent,
  BottomSheetBody,
  BottomSheetFooter,
} from "seed-design/ui/bottom-sheet";
import { TextField, TextFieldInput } from "seed-design/ui/text-field";

interface Props {
  company: string;
  defaultValues?: {
    recipient1?: string;
    recipient2?: string;
    recipient3?: string;
  };
  /** 트리거 엘리먼트 교체용. 미지정 시 기본 풀버튼. */
  trigger?: ReactNode;
}

// 숫자만 추출해 한국 휴대폰 형식(010-1234-5678)으로 하이픈을 삽입한다.
function formatPhone(value: string) {
  const digits = value.replace(/\D/g, "").slice(0, 11);
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `${digits.slice(0, 3)}-${digits.slice(3)}`;
  if (digits.length < 11)
    return `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`;
  return `${digits.slice(0, 3)}-${digits.slice(3, 7)}-${digits.slice(7)}`;
}

export default function AlimtalkSettingsButton({ company, defaultValues, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [phones, setPhones] = useState({
    recipient1: formatPhone(defaultValues?.recipient1 ?? ""),
    recipient2: formatPhone(defaultValues?.recipient2 ?? ""),
    recipient3: formatPhone(defaultValues?.recipient3 ?? ""),
  });

  async function handleSubmit() {
    setSaving(true);
    try {
      // 저장/전송 시에는 하이픈을 제거하고 숫자만 보낸다.
      await saveAlimtalkSettings({
        company,
        recipient1: phones.recipient1.replace(/\D/g, ""),
        recipient2: phones.recipient2.replace(/\D/g, ""),
        recipient3: phones.recipient3.replace(/\D/g, ""),
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
      <BottomSheetRoot open={open} onOpenChange={setOpen}>
        <BottomSheetTrigger asChild>
          {trigger ?? (
            <ActionButton variant="neutralWeak" size="medium" style={{ width: "100%" }}>
              알림톡 설정
            </ActionButton>
          )}
        </BottomSheetTrigger>

        <BottomSheetContent title="알림톡 수신자 설정" description={company}>
          <BottomSheetBody>
            <div className="flex flex-col gap-3 pb-2">
              <TextField
                label="수신자 번호 1"
                value={phones.recipient1}
                onValueChange={({ value }) =>
                  setPhones((p) => ({ ...p, recipient1: formatPhone(value) }))
                }
              >
                <TextFieldInput inputMode="numeric" placeholder="010-1234-5678" />
              </TextField>

              <TextField
                label="수신자 번호 2 (선택)"
                value={phones.recipient2}
                onValueChange={({ value }) =>
                  setPhones((p) => ({ ...p, recipient2: formatPhone(value) }))
                }
              >
                <TextFieldInput inputMode="numeric" placeholder="010-1234-5678" />
              </TextField>

              <TextField
                label="수신자 번호 3 (선택)"
                value={phones.recipient3}
                onValueChange={({ value }) =>
                  setPhones((p) => ({ ...p, recipient3: formatPhone(value) }))
                }
              >
                <TextFieldInput inputMode="numeric" placeholder="010-1234-5678" />
              </TextField>
            </div>
          </BottomSheetBody>

          <BottomSheetFooter>
            <div className="flex w-full flex-row gap-2">
              <div className="flex-[3]">
                <ActionButton
                  variant="neutralWeak"
                  size="large"
                  className="w-full"
                  onClick={() => {
                    setOpen(false);
                    setToast("알림톡 설정을 취소했어요");
                  }}
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
