"use client";

import { useState } from "react";
import { useRouter, useParams } from "next/navigation";
import {
  updateHospitalRegion,
  updateHospitalCategory,
  renameHospital,
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
  const params = useParams<{ slug: string }>();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState(company);
  const [region, setRegion] = useState(defaultRegion ?? "");
  const [category, setCategory] = useState(defaultCategory ?? "");
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState("");

  async function handleSubmit() {
    const nextName = name.trim();
    if (!nextName) {
      setToast("상호명을 입력해주세요.");
      return;
    }
    const renamed = nextName !== company;

    setSaving(true);
    try {
      // 상호명이 바뀌었으면 먼저 rename — 이후 저장은 새 이름 기준으로 나가야 한다.
      if (renamed) await renameHospital({ from: company, to: nextName });

      await updateHospitalRegion({ company: nextName, region: region.trim() });
      // 유형이 선택되어 있고 기존과 다르면 갱신
      if (category && category !== (defaultCategory ?? "")) {
        await updateHospitalCategory({ company: nextName, hospitalType: category });
      }
      setToast(
        renamed ? "상호명을 포함해 저장되었어요 ✅" : "병원 정보가 저장되었어요 ✅",
      );
      setOpen(false);

      // URL 이 옛 상호명으로 돼 있으면(nanoid 가 아니면) 새 이름으로 이동해야 404 를 피한다.
      const slug = params?.slug ? decodeURIComponent(params.slug) : "";
      if (renamed && slug === company) {
        router.replace(`/hospital/${encodeURIComponent(nextName)}`);
      }
      router.refresh();
    } catch (e) {
      setToast(
        e instanceof Error && e.message
          ? e.message
          : "저장 실패. 다시 시도해주세요.",
      );
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
          description="상호명·지역·유형을 수정할 수 있어요"
        >
          <BottomSheetBody>
            <div className="flex flex-col gap-4 pb-2">
              <TextField
                label="상호명"
                value={name}
                onValueChange={({ value }) => setName(value)}
              >
                <TextFieldInput placeholder="예) 리움한방병원 강동송파" />
              </TextField>
              {name.trim() !== company && (
                <p className="-mt-2 text-xs leading-relaxed text-[#c0392b]">
                  · 보고서·입금소진·진료일정 등 이 병원의 모든 기록이 새 이름으로 함께
                  옮겨집니다.
                  <br />· <b>보고서 알림톡 링크는 그대로 열립니다.</b> 다만 이미 보낸{" "}
                  <b>진료일정 알림톡</b>의 버튼은 주소에 옛 상호명이 박혀 있어 끊깁니다 —
                  필요하면 이름 변경 후 재발송하세요.
                </p>
              )}

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
