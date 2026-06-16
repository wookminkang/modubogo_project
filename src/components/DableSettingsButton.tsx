"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { saveDableSettings } from "@/lib/company-actions";
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
    dable_api_key?: string;
    dable_account?: string;
  };
  /** 트리거 엘리먼트 교체용. 미지정 시 기본 풀버튼. */
  trigger?: ReactNode;
}

export default function DableSettingsButton({ company, defaultValues, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [apiKey, setApiKey] = useState(defaultValues?.dable_api_key ?? "");
  const [account, setAccount] = useState(defaultValues?.dable_account ?? "");

  async function handleSubmit() {
    setSaving(true);
    try {
      await saveDableSettings({ company, dable_api_key: apiKey, dable_account: account });
      setToast("데이블 설정이 저장되었어요 ✅");
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
              데이블 설정
            </ActionButton>
          )}
        </BottomSheetTrigger>

        <BottomSheetContent title="데이블 설정" description={company}>
          <BottomSheetBody>
            <div className="flex flex-col gap-3 pb-2">
              <TextField
                label="데이블 API 키"
                value={apiKey}
                onValueChange={({ value }) => setApiKey(value)}
              >
                <TextFieldInput placeholder="API 키를 입력하세요" />
              </TextField>

              <TextField
                label="데이블 계정"
                value={account}
                onValueChange={({ value }) => setAccount(value)}
              >
                <TextFieldInput placeholder="계정을 입력하세요" />
              </TextField>
            </div>
          </BottomSheetBody>

          <BottomSheetFooter className="flex gap-2">
            <ActionButton
              variant="neutralWeak"
              flexGrow
              onClick={() => setOpen(false)}
            >
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
