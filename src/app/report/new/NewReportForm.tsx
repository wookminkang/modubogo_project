"use client";

import { useFieldArray, useForm, Controller } from "react-hook-form";
import Link from "next/link";
import { useState } from "react";
import { upsertReport } from "@/lib/db";
import ResultSuccess from "@/components/ResultSuccess";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/month-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { OrderStepper } from "@/components/ui/order-stepper";
import { AmountInput } from "@/components/ui/amount-input";
import { Trash2, ClipboardCopy } from "lucide-react";
import { loadLatestReportData } from "@/lib/copy-actions";

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
  categories: CategoryField[];
  validity: ValidityField[];
  contracts: ContractField[];
}

export default function ReportNewPage({ categoryOptions }: { categoryOptions: string[] }) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [redirectTo, setRedirectTo] = useState("");
  const [loadingPrev, setLoadingPrev] = useState(false);

  const { register, control, handleSubmit, reset, getValues } =
    useForm<FormValues>({
      defaultValues: {
        reporter: "전형진",
        email: "oper2068@kakao.com",
        hospital_type: "",
        categories: [
          {
            category: "",
            channel: "",
            agency: "",
            period: "1",
            amount: "",
            sort_order: "0",
          },
        ],
        validity: [
          { category: "", subject: "", expiryDate: "", sort_order: "0" },
        ],
        contracts: [
          { category: "", name: "", keyword: "", link: "", sort_order: "0" },
        ],
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

  const handleLoadPrevious = async () => {
    const company = getValues("company");
    if (!company.trim()) {
      alert("먼저 상호명을 입력해주세요.");
      return;
    }
    setLoadingPrev(true);
    try {
      const data = await loadLatestReportData(company.trim());
      if (!data) {
        alert("이전 보고서가 없습니다.");
        return;
      }
      reset(data);
    } catch {
      alert("불러오기 중 오류가 발생했습니다.");
    } finally {
      setLoadingPrev(false);
    }
  };

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      await upsertReport({
        ...data,
        status: "작성중",
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

  const inputClass =
    "h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20";
  const rowInputClass =
    "flex-1 h-9 rounded-lg border-gray-200 text-gray-900 text-sm focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20";

  if (saved) {
    return <ResultSuccess message="저장되었어요." redirectTo={redirectTo} />;
  }

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      <div className="px-4 py-6 flex flex-col gap-4">
        <div>
          <Link href="/report" className="text-sm text-gray-400 mb-1 block">
            ← 전체 목록
          </Link>
          <h1 className="text-2xl font-bold text-[#0e299c]">새 보고서 작성</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* 이전 달 불러오기 */}
          <button
            type="button"
            onClick={handleLoadPrevious}
            disabled={loadingPrev}
            className="w-full flex items-center justify-center gap-2 bg-white border border-[#0e299c]/30 text-[#0e299c] rounded-2xl py-3.5 text-sm font-medium shadow-sm hover:bg-[#0e299c]/5 transition-colors disabled:opacity-50"
          >
            <ClipboardCopy className="w-4 h-4" />
            {loadingPrev ? "불러오는 중..." : "이전 달 보고서 불러오기"}
          </button>

          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0e299c]">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label className="text-gray-500 font-normal">병원 유형</Label>
                <Controller
                  control={control}
                  name="hospital_type"
                  rules={{ required: true }}
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
                        ] as const
                      ).map((type) => (
                        <button
                          key={type}
                          type="button"
                          onClick={() => field.onChange(type)}
                          className={`px-3 py-2 rounded-full text-sm font-medium transition-colors border ${
                            field.value === type
                              ? "bg-[#0e299c] text-white border-[#0e299c]"
                              : "bg-white text-gray-400 border-gray-200 hover:text-gray-600"
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
                <Label htmlFor="company" className="text-gray-500 font-normal">
                  상호명
                </Label>
                <Input
                  id="company"
                  {...register("company", { required: true })}
                  placeholder="ex) 모두보고"
                  className={inputClass}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-gray-500 font-normal">보고 월</Label>
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
                <Label htmlFor="reporter" className="text-gray-500 font-normal">
                  보고자
                </Label>
                <Input
                  id="reporter"
                  {...register("reporter", { required: true })}
                  className={`${inputClass} bg-gray-50 text-gray-400`}
                  readOnly
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-gray-500 font-normal">
                  이메일
                </Label>
                <Input
                  id="email"
                  {...register("email")}
                  type="email"
                  className={`${inputClass} bg-gray-50 text-gray-400`}
                  readOnly
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="password" className="text-gray-500 font-normal">
                  열람 비밀번호 <span className="text-gray-300">(선택)</span>
                </Label>
                <Input
                  id="password"
                  {...register("password")}
                  type="password"
                  placeholder="설정 시 보고서 열람에 비밀번호가 필요합니다"
                  className={inputClass}
                />
              </div>
            </CardContent>
          </Card>

          {/* 집행 항목 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0e299c]">집행 항목</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="border border-gray-100 rounded-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-[#0e299c] text-white text-xs font-bold rounded-full">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">
                        항목 {index + 1}
                      </span>
                    </div>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => remove(index)}
                        className="text-red-400 hover:text-red-500 hover:bg-red-50 gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        삭제
                      </Button>
                    )}
                  </div>
                  <div className="divide-y divide-gray-50">
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-500 shrink-0">
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
                      <span className="w-20 text-sm text-gray-500 shrink-0">
                        채널
                      </span>
                      <Input
                        {...register(`categories.${index}.channel`)}
                        placeholder="ex. 네이버 파워링크"
                        className={rowInputClass}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-500 shrink-0">
                        집행사
                      </span>
                      <Input
                        {...register(`categories.${index}.agency`)}
                        placeholder="ex. 엠포넷"
                        className={rowInputClass}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-500 shrink-0">
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
                        <span className="text-xs text-[#0e299c]">
                          숫자가 낮을수록 먼저 집행됩니다.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-500 shrink-0">
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
                            <div className="flex items-center gap-1 bg-[#0e299c]/10 px-2 py-1 rounded-lg">
                              <button
                                type="button"
                                onClick={() =>
                                  field.onChange(String(Math.max(1, num - 1)))
                                }
                                className="w-6 h-6 flex items-center justify-center text-[#0e299c] hover:bg-[#0e299c]/20 rounded font-bold text-base"
                              >
                                −
                              </button>
                              <span className="w-8 text-center text-sm text-[#0e299c] font-bold">
                                {num}
                              </span>
                              <button
                                type="button"
                                onClick={() => field.onChange(String(num + 1))}
                                className="w-6 h-6 flex items-center justify-center text-[#0e299c] hover:bg-[#0e299c]/20 rounded font-bold text-base"
                              >
                                +
                              </button>
                              <span className="text-xs text-[#0e299c] font-medium pr-1">
                                개월
                              </span>
                            </div>
                          );
                        }}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-500 shrink-0">
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
                className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-[#0e299c] hover:text-[#0e299c] transition-colors"
              >
                + 항목 추가
              </button>
            </CardContent>
          </Card>

          {/* 광고 계약·리포트 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0e299c]">광고 계약·리포트</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {cFields.map((field, index) => (
                <div
                  key={field.id}
                  className="border border-gray-100 rounded-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-[#0e299c] text-white text-xs font-bold rounded-full">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">
                        항목 {index + 1}
                      </span>
                    </div>
                    {cFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => cRemove(index)}
                        className="text-red-400 hover:text-red-500 hover:bg-red-50 gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        삭제
                      </Button>
                    )}
                  </div>
                  <div className="divide-y divide-gray-50">
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-500 shrink-0">
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
                      <span className="w-20 text-sm text-gray-500 shrink-0">
                        계약명
                      </span>
                      <Input
                        {...register(`contracts.${index}.name`)}
                        placeholder="계약명"
                        className={rowInputClass}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-500 shrink-0">
                        키워드
                      </span>
                      <Input
                        {...register(`contracts.${index}.keyword`)}
                        placeholder="키워드"
                        className={rowInputClass}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-500 shrink-0">
                        링크
                      </span>
                      <Input
                        {...register(`contracts.${index}.link`)}
                        placeholder="보고서 링크 URL"
                        className={rowInputClass}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-500 shrink-0">
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
                        <span className="text-xs text-[#0e299c]">
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
                className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-[#0e299c] hover:text-[#0e299c] transition-colors"
              >
                + 항목 추가
              </button>
            </CardContent>
          </Card>

          {/* 광고 심의 및 운영 현황 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0e299c]">
                광고 심의 및 운영 현황
              </CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-3">
              {vFields.map((field, index) => (
                <div
                  key={field.id}
                  className="border border-gray-100 rounded-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-[#0e299c] text-white text-xs font-bold rounded-full">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-gray-700">
                        항목 {index + 1}
                      </span>
                    </div>
                    {vFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => vRemove(index)}
                        className="text-red-400 hover:text-red-500 hover:bg-red-50 gap-1"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        삭제
                      </Button>
                    )}
                  </div>
                  <div className="divide-y divide-gray-50">
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-500 shrink-0">
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
                      <span className="w-20 text-sm text-gray-500 shrink-0">
                        주제
                      </span>
                      <Input
                        {...register(`validity.${index}.subject`)}
                        placeholder="ex. 네이버 파워링크 계약"
                        className={rowInputClass}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-500 shrink-0">
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
                        <span className="text-xs text-[#0e299c]">
                          숫자가 낮을수록 먼저 집행됩니다.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-500 shrink-0">
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
                className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-[#0e299c] hover:text-[#0e299c] transition-colors"
              >
                + 유효기간 추가
              </button>
            </CardContent>
          </Card>

          <Button
            type="submit"
            disabled={saving}
            className="w-full bg-[#0e299c] hover:bg-[#0b2180] text-white font-semibold h-14 rounded-2xl text-sm"
          >
            {saving ? "저장 중..." : "보고서 저장"}
          </Button>
        </form>
      </div>
    </div>
  );
}
