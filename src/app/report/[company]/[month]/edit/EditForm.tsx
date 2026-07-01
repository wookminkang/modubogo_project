"use client";

import { useFieldArray, useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { upsertReport, deleteReport } from "@/lib/db";
import ResultSuccess from "@/components/ResultSuccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { ActionButton } from "seed-design/ui/action-button";
import { MonthPicker } from "@/components/ui/month-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { OrderStepper } from "@/components/ui/order-stepper";
import { AmountInput } from "@/components/ui/amount-input";
import { Trash2, ArrowLeft } from "lucide-react";
import { Text } from "seed-design/ui/text";
import Link from "next/link";

interface CategoryField {
  category: string;
  channel: string;
  agency: string;
  period: string;
  amount: string;
  sort_order: string;
}
interface ValidityField {
  category: string;
  subject: string;
  expiryDate: string;
  sort_order: string;
}
interface ContractField {
  category: string;
  name: string;
  keyword: string;
  link: string;
  sort_order: string;
}

interface FormValues {
  company: string;
  month: string;
  reporter: string;
  email: string;
  password: string;
  hospital_type: string;
  region: string;
  categories: CategoryField[];
  validity: ValidityField[];
  contracts: ContractField[];
}

interface Props {
  reportId: number;
  defaultValues: FormValues;
  company: string;
  month: string;
  categoryOptions: string[];
}

export default function EditForm({
  reportId,
  defaultValues,
  company,
  month,
  categoryOptions,
}: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [saved, setSaved] = useState(false);
  const [redirectTo, setRedirectTo] = useState("");

  const { register, control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      ...defaultValues,
      reporter: "전형진",
      email: "oper2068@kakao.com",
    },
  });

  const { fields, append, remove } = useFieldArray({
    control,
    name: "categories",
  });
  const {
    fields: vFields,
    append: vAppend,
    remove: vRemove,
  } = useFieldArray({ control, name: "validity" });
  const {
    fields: cFields,
    append: cAppend,
    remove: cRemove,
  } = useFieldArray({ control, name: "contracts" });

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      await upsertReport({
        id: reportId,
        ...data,
        status: "완료",
        hospital_type: data.hospital_type || undefined,
      });
      setRedirectTo(
        `/report/${encodeURIComponent(data.company)}/${data.month}`,
      );
      setSaved(true);
    } catch (e) {
      console.error(e);
      alert("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm("보고서를 삭제하시겠습니까?")) return;
    setDeleting(true);
    try {
      await deleteReport(reportId);
      router.push("/report");
      router.refresh();
    } catch (e) {
      console.error(e);
      alert("삭제 중 오류가 발생했습니다.");
    } finally {
      setDeleting(false);
    }
  };

  if (saved) {
    return <ResultSuccess message="수정되었어요." redirectTo={redirectTo} />;
  }

  const inputClass =
    "h-11 rounded-xl border-[var(--seed-color-stroke-neutral-muted)] text-[var(--seed-color-fg-neutral)] focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/40";
  const rowInputClass =
    "flex-1 h-9 rounded-lg border-[var(--seed-color-stroke-neutral-muted)] text-[var(--seed-color-fg-neutral)] text-sm focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/40";

  return (
    <div className="min-h-screen bg-[var(--seed-color-bg-layer-default)]">
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 py-6">
        <div className="flex flex-col gap-3">
          <Link
            href={`/report/${encodeURIComponent(company)}/${month}`}
            className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-70"
          >
            <ArrowLeft size={18} />
            <Text as="span" textStyle="t5Bold" color="fg.neutralMuted">
              보고서 상세
            </Text>
          </Link>
          <Text as="h1" textStyle="t10Bold">
            {company} · {month} 수정
          </Text>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* 기본 정보 */}
          <Card className="ring-[var(--seed-color-stroke-neutral-muted)]">
            <CardHeader>
              <CardTitle className="text-[var(--seed-color-fg-neutral)]">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-[var(--seed-color-fg-neutral-muted)] font-normal">병원 유형</Label>
                <Controller
                  control={control}
                  name="hospital_type"
                  render={({ field }) => (
                    <div className="flex flex-wrap gap-2">
                      {(
                        [
                          "메인 관리",
                          "한의원",
                          "한의원(네트워크)",
                          "한의원(입원실)",
                          "한방병원",
                          "정신과",
                          "양방",
                          "일반",
                          "탈퇴",
                        ] as const
                      ).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => field.onChange(type)}
                          className={`px-3 py-2 rounded-full text-sm font-medium transition-colors border ${
                            field.value === type
                              ? "bg-[#0e299c] text-white border-[#0e299c]"
                              : "bg-[var(--seed-color-bg-neutral-weak)] text-[var(--seed-color-fg-neutral-muted)] border-[var(--seed-color-stroke-neutral-muted)] hover:text-[var(--seed-color-fg-neutral)]"
                          }`}
                        >
                          {type}
                        </button>
                      ))}
                    </div>
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="company" className="text-[var(--seed-color-fg-neutral-muted)] font-normal">
                  상호명
                </Label>
                <Input
                  id="company"
                  {...register("company", { required: true })}
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="region" className="text-[var(--seed-color-fg-neutral-muted)] font-normal">
                  지역 <span className="text-[var(--seed-color-fg-neutral-muted)]">(선택)</span>
                </Label>
                <Input
                  id="region"
                  {...register("region")}
                  placeholder="ex) 강남"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-[var(--seed-color-fg-neutral-muted)] font-normal">보고 월</Label>
                <Controller
                  control={control}
                  name="month"
                  rules={{ required: true }}
                  render={({ field }) => (
                    <MonthPicker
                      value={field.value}
                      onChange={field.onChange}
                    />
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reporter" className="text-[var(--seed-color-fg-neutral-muted)] font-normal">
                  보고자
                </Label>
                <Input
                  id="reporter"
                  {...register("reporter", { required: true })}
                  className={`${inputClass} bg-[var(--seed-color-bg-neutral-weak)] text-[var(--seed-color-fg-neutral-muted)]`}
                  readOnly
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-[var(--seed-color-fg-neutral-muted)] font-normal">
                  이메일
                </Label>
                <Input
                  id="email"
                  {...register("email")}
                  type="email"
                  className={`${inputClass} bg-[var(--seed-color-bg-neutral-weak)] text-[var(--seed-color-fg-neutral-muted)]`}
                  readOnly
                />
              </div>
              {/* 열람 비밀번호 — 현재 미사용. 기존 값은 유지하되 입력 UI는 숨김 */}
              <input type="hidden" {...register("password")} />
            </CardContent>
          </Card>

          {/* 집행 항목 */}
          <Card className="ring-[var(--seed-color-stroke-neutral-muted)]">
            <CardHeader>
              <CardTitle className="text-[var(--seed-color-fg-neutral)]">집행 항목</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="bg-[var(--seed-color-bg-neutral-weak)] rounded-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--seed-color-stroke-neutral-muted)]">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-[#0e299c] text-white text-xs font-bold rounded-full">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-[var(--seed-color-fg-neutral)]">
                        항목 {index + 1}
                      </span>
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => remove(index)}
                        className="text-[var(--seed-color-fg-critical)] hover:bg-[var(--seed-color-bg-critical-weak)] gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        삭제
                      </Button>
                    )}
                  </div>
                  <div className="divide-y divide-[var(--seed-color-stroke-neutral-muted)]">
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-[var(--seed-color-fg-neutral-muted)] shrink-0">
                        구분
                      </span>
                      <select
                        {...register(`categories.${index}.category`)}
                        className={`${rowInputClass} px-2 cursor-pointer`}
                      >
                        <option value="">선택</option>
                        {categoryOptions.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-[var(--seed-color-fg-neutral-muted)] shrink-0">
                        채널
                      </span>
                      <Input
                        {...register(`categories.${index}.channel`)}
                        placeholder="채널"
                        className={rowInputClass}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-[var(--seed-color-fg-neutral-muted)] shrink-0">
                        집행사
                      </span>
                      <Input
                        {...register(`categories.${index}.agency`)}
                        placeholder="집행사"
                        className={rowInputClass}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-[var(--seed-color-fg-neutral-muted)] shrink-0">
                        순서
                      </span>
                      <div className="flex items-center gap-2 flex-1 flex-wrap">
                        <Controller
                          control={control}
                          name={`categories.${index}.sort_order`}
                          render={({ field }) => (
                            <OrderStepper
                              value={field.value}
                              onChange={field.onChange}
                            />
                          )}
                        />
                        <span className="text-xs text-[var(--seed-color-fg-neutral-muted)]">
                          숫자가 낮을수록 먼저 집행됩니다.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-[var(--seed-color-fg-neutral-muted)] shrink-0">
                        계약기간(월)
                      </span>
                      <Controller
                        control={control}
                        name={`categories.${index}.period`}
                        render={({ field }) => {
                          const raw = /^\d{4}-\d{2}$/.test(field.value)
                            ? 1
                            : parseInt(field.value) || 1;
                          const num = Math.max(1, raw);
                          return (
                            <div className="flex items-center gap-1 bg-[var(--seed-color-bg-neutral-weak)] px-2 py-1 rounded-lg">
                              <button
                                type="button"
                                onClick={() =>
                                  field.onChange(String(Math.max(1, num - 1)))
                                }
                                className="w-6 h-6 flex items-center justify-center text-[var(--seed-color-fg-neutral)] hover:bg-[var(--seed-color-bg-neutral-weak-pressed)] rounded font-bold text-base"
                              >
                                −
                              </button>
                              <span className="w-8 text-center text-sm text-[var(--seed-color-fg-neutral)] font-bold">
                                {num}
                              </span>
                              <button
                                type="button"
                                onClick={() => field.onChange(String(num + 1))}
                                className="w-6 h-6 flex items-center justify-center text-[var(--seed-color-fg-neutral)] hover:bg-[var(--seed-color-bg-neutral-weak-pressed)] rounded font-bold text-base"
                              >
                                +
                              </button>
                              <span className="text-xs text-[var(--seed-color-fg-neutral-muted)] font-medium pr-1">
                                개월
                              </span>
                            </div>
                          );
                        }}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-[var(--seed-color-fg-neutral-muted)] shrink-0">
                        집행금액 (원)
                      </span>
                      <Controller
                        control={control}
                        name={`categories.${index}.amount`}
                        render={({ field }) => (
                          <AmountInput
                            value={field.value}
                            onChange={field.onChange}
                            placeholder="총 계약금액"
                            className={rowInputClass}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  append({
                    category: "",
                    channel: "",
                    agency: "",
                    period: "1",
                    amount: "",
                    sort_order: String(fields.length),
                  })
                }
                className="w-full border border-dashed border-[var(--seed-color-stroke-neutral-muted)] rounded-xl py-3 text-sm text-[var(--seed-color-fg-neutral-muted)] hover:border-[#0e299c] hover:text-[#0e299c] transition-colors"
              >
                + 항목 추가
              </button>
            </CardContent>
          </Card>

          {/* 광고 계약·리포트 */}
          <Card className="ring-[var(--seed-color-stroke-neutral-muted)]">
            <CardHeader>
              <CardTitle className="text-[var(--seed-color-fg-neutral)]">광고 계약·리포트</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {cFields.map((field, index) => (
                <div
                  key={field.id}
                  className="bg-[var(--seed-color-bg-neutral-weak)] rounded-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--seed-color-stroke-neutral-muted)]">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-[#0e299c] text-white text-xs font-bold rounded-full">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-[var(--seed-color-fg-neutral)]">
                        항목 {index + 1}
                      </span>
                    </div>
                    {cFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => cRemove(index)}
                        className="text-[var(--seed-color-fg-critical)] hover:bg-[var(--seed-color-bg-critical-weak)] gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        삭제
                      </Button>
                    )}
                  </div>
                  <div className="divide-y divide-[var(--seed-color-stroke-neutral-muted)]">
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-[var(--seed-color-fg-neutral-muted)] shrink-0">
                        구분
                      </span>
                      <select
                        {...register(`contracts.${index}.category`)}
                        className={`${rowInputClass} px-2 cursor-pointer`}
                      >
                        <option value="">선택</option>
                        {categoryOptions.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-[var(--seed-color-fg-neutral-muted)] shrink-0">
                        계약명
                      </span>
                      <Input
                        {...register(`contracts.${index}.name`)}
                        placeholder="계약명"
                        className={rowInputClass}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-[var(--seed-color-fg-neutral-muted)] shrink-0">
                        키워드
                      </span>
                      <Input
                        {...register(`contracts.${index}.keyword`)}
                        placeholder="키워드"
                        className={rowInputClass}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-[var(--seed-color-fg-neutral-muted)] shrink-0">
                        링크
                      </span>
                      <Input
                        {...register(`contracts.${index}.link`)}
                        placeholder="보고서 링크 URL"
                        className={rowInputClass}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-[var(--seed-color-fg-neutral-muted)] shrink-0">
                        순서
                      </span>
                      <div className="flex items-center gap-2 flex-1 flex-wrap">
                        <Controller
                          control={control}
                          name={`contracts.${index}.sort_order`}
                          render={({ field }) => (
                            <OrderStepper
                              value={field.value}
                              onChange={field.onChange}
                            />
                          )}
                        />
                        <span className="text-xs text-[var(--seed-color-fg-neutral-muted)]">
                          숫자가 낮을수록 먼저 집행됩니다.
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  cAppend({
                    category: "",
                    name: "",
                    keyword: "",
                    link: "",
                    sort_order: String(cFields.length),
                  })
                }
                className="w-full border border-dashed border-[var(--seed-color-stroke-neutral-muted)] rounded-xl py-3 text-sm text-[var(--seed-color-fg-neutral-muted)] hover:border-[#0e299c] hover:text-[#0e299c] transition-colors"
              >
                + 항목 추가
              </button>
            </CardContent>
          </Card>

          {/* 광고 심의 및 운영 현황 */}
          <Card className="ring-[var(--seed-color-stroke-neutral-muted)]">
            <CardHeader>
              <CardTitle className="text-[var(--seed-color-fg-neutral)]">
                광고 심의 및 운영 현황
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {vFields.map((field, index) => (
                <div
                  key={field.id}
                  className="bg-[var(--seed-color-bg-neutral-weak)] rounded-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-[var(--seed-color-stroke-neutral-muted)]">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-[#0e299c] text-white text-xs font-bold rounded-full">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-[var(--seed-color-fg-neutral)]">
                        항목 {index + 1}
                      </span>
                    </div>
                    {vFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => vRemove(index)}
                        className="text-[var(--seed-color-fg-critical)] hover:bg-[var(--seed-color-bg-critical-weak)] gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        삭제
                      </Button>
                    )}
                  </div>
                  <div className="divide-y divide-[var(--seed-color-stroke-neutral-muted)]">
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-[var(--seed-color-fg-neutral-muted)] shrink-0">
                        구분
                      </span>
                      <select
                        {...register(`validity.${index}.category`)}
                        className={`${rowInputClass} px-2 cursor-pointer`}
                      >
                        <option value="">선택</option>
                        {categoryOptions.map((cat) => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-[var(--seed-color-fg-neutral-muted)] shrink-0">
                        주제
                      </span>
                      <Input
                        {...register(`validity.${index}.subject`)}
                        placeholder="주제"
                        className={rowInputClass}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-[var(--seed-color-fg-neutral-muted)] shrink-0">
                        순서
                      </span>
                      <div className="flex items-center gap-2 flex-1 flex-wrap">
                        <Controller
                          control={control}
                          name={`validity.${index}.sort_order`}
                          render={({ field }) => (
                            <OrderStepper
                              value={field.value}
                              onChange={field.onChange}
                            />
                          )}
                        />
                        <span className="text-xs text-[var(--seed-color-fg-neutral-muted)]">
                          숫자가 낮을수록 먼저 집행됩니다.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-[var(--seed-color-fg-neutral-muted)] shrink-0">
                        유효기간
                      </span>
                      <Controller
                        control={control}
                        name={`validity.${index}.expiryDate`}
                        render={({ field }) => (
                          <DatePicker
                            value={field.value}
                            onChange={field.onChange}
                          />
                        )}
                      />
                    </div>
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() =>
                  vAppend({
                    category: "",
                    subject: "",
                    expiryDate: "",
                    sort_order: String(vFields.length),
                  })
                }
                className="w-full border border-dashed border-[var(--seed-color-stroke-neutral-muted)] rounded-xl py-3 text-sm text-[var(--seed-color-fg-neutral-muted)] hover:border-[#0e299c] hover:text-[#0e299c] transition-colors"
              >
                + 유효기간 추가
              </button>
            </CardContent>
          </Card>

          <div className="flex w-full flex-row gap-2">
            <div className="flex-[3]">
              <ActionButton
                type="button"
                variant="neutralWeak"
                size="large"
                className="w-full"
                loading={deleting}
                onClick={handleDelete}
              >
                삭제
              </ActionButton>
            </div>
            <div className="flex-[7]">
              <ActionButton
                type="submit"
                variant="brandSolid"
                size="large"
                className="w-full"
                loading={saving}
              >
                수정
              </ActionButton>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
