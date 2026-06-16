"use client";

import { useState } from "react";
import type { ReactNode } from "react";
import { saveNaverAdSettings } from "@/lib/company-actions";
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
    naver_ad_api_key?: string;
    naver_ad_secret_key?: string;
    naver_ad_customer_id?: string;
  };
  /** 트리거 엘리먼트 교체용. 미지정 시 기본 풀버튼. */
  trigger?: ReactNode;
}

export default function NaverAdSettingsButton({ company, defaultValues, trigger }: Props) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");
  const [form, setForm] = useState({
    api_key: defaultValues?.naver_ad_api_key ?? "",
    secret_key: defaultValues?.naver_ad_secret_key ?? "",
    customer_id: defaultValues?.naver_ad_customer_id ?? "",
  });

  async function handleSubmit() {
    setSaving(true);
    try {
      await saveNaverAdSettings({
        company,
        naver_ad_api_key: form.api_key,
        naver_ad_secret_key: form.secret_key,
        naver_ad_customer_id: form.customer_id,
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
      <BottomSheetRoot open={open} onOpenChange={setOpen}>
        <BottomSheetTrigger asChild>
          {trigger ?? (
            <ActionButton variant="neutralWeak" size="medium" style={{ width: "100%" }}>
              네이버 API 설정
            </ActionButton>
          )}
        </BottomSheetTrigger>

        <BottomSheetContent title="네이버 광고 API 설정" description={company}>
          <BottomSheetBody>
            <div className="flex flex-col gap-3 pb-2">
              <TextField
                label="액세스 라이선스 키"
                value={form.api_key}
                onValueChange={({ value }) => setForm((f) => ({ ...f, api_key: value }))}
              >
                <TextFieldInput placeholder="01000000..." />
              </TextField>

              <TextField
                label="비밀키"
                value={form.secret_key}
                onValueChange={({ value }) => setForm((f) => ({ ...f, secret_key: value }))}
              >
                <TextFieldInput placeholder="AQAAA..." />
              </TextField>

              <TextField
                label="고객 ID"
                value={form.customer_id}
                onValueChange={({ value }) => setForm((f) => ({ ...f, customer_id: value }))}
              >
                <TextFieldInput inputMode="numeric" placeholder="2550976" />
              </TextField>
            </div>
          </BottomSheetBody>

          <BottomSheetFooter className="flex gap-2">
            <ActionButton
              variant="neutralWeak"
              flexGrow
              onClick={() => {
                setOpen(false);
                setToast("API 설정을 취소했어요");
              }}
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
