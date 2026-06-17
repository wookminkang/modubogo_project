"use client";

import { useFieldArray, useForm, useWatch, Controller } from "react-hook-form";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { upsertReport } from "@/lib/db";
import ResultSuccess from "@/components/ResultSuccess";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/month-picker";
import { DatePicker } from "@/components/ui/date-picker";
import { OrderStepper } from "@/components/ui/order-stepper";
import { AmountInput } from "@/components/ui/amount-input";
import { Trash2, Search, ArrowLeft } from "lucide-react";
import { loadLatestReportData } from "@/lib/copy-actions";
import { Dialog } from "@seed-design/react";
import { Text } from "seed-design/ui/text";
import { ActionButton } from "seed-design/ui/action-button";

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

interface HospitalOption {
  company: string;
  region: string | null;
  hospitalType: string | null;
}

// 검색 가능한 병원 선택 콤보박스 (등록된 병원만)
function HospitalCombobox({
  hospitals,
  value,
  onSelect,
}: {
  hospitals: HospitalOption[];
  value: string;
  onSelect: (h: HospitalOption) => void;
}) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const ref = useRef<HTMLDivElement>(null);

  // 바깥 클릭 시 닫기
  useEffect(() => {
    function onDoc(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, []);

  const filtered = hospitals.filter((h) =>
    h.company.toLowerCase().includes(query.trim().toLowerCase()),
  );

  return (
    <div ref={ref} className="relative">
      <div className="relative">
        <Search
          size={16}
          className="absolute top-1/2 left-3.5 -translate-y-1/2 text-gray-400"
        />
        <input
          value={open ? query : value}
          onFocus={() => {
            setOpen(true);
            setQuery("");
          }}
          onChange={(e) => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          placeholder={value || "병원명으로 검색·선택"}
          className="h-11 w-full rounded-xl border border-white/10 bg-white/5 pr-4 pl-10 text-sm text-gray-100 outline-none placeholder:text-gray-500 focus:border-[#0e299c] focus:ring-2 focus:ring-[#0e299c]/30"
        />
      </div>

      {open && (
        <div className="absolute z-20 mt-1 max-h-64 w-full overflow-auto rounded-xl border border-white/10 bg-[#2a2a2a] py-1 shadow-lg shadow-black/40">
          {filtered.length === 0 ? (
            <p className="px-4 py-3 text-sm text-gray-400">
              검색 결과가 없어요.
            </p>
          ) : (
            filtered.map((h) => (
              <button
                key={h.company}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => {
                  onSelect(h);
                  setQuery("");
                  setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-4 py-2.5 text-left text-sm hover:bg-white/5 ${
                  value === h.company
                    ? "font-semibold text-white"
                    : "text-gray-200"
                }`}
              >
                <span className="truncate">{h.company}</span>
                {h.region && (
                  <span className="shrink-0 text-xs text-gray-400">
                    {h.region}
                  </span>
                )}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default function ReportNewPage({
  categoryOptions,
  hospitals,
}: {
  categoryOptions: string[];
  hospitals: HospitalOption[];
}) {
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [redirectTo, setRedirectTo] = useState("");
  const [loadingPrev, setLoadingPrev] = useState(false);

  const { register, control, handleSubmit, reset, getValues, setValue } =
    useForm<FormValues>({
      defaultValues: {
        company: "",
        month: "",
        password: "",
        reporter: "전형진",
        email: "oper2068@kakao.com",
        hospital_type: "",
        region: "",
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

  // 선택한 병원 정보 (유형·지역 자동 표시용)
  const selectedCompany = useWatch({ control, name: "company" });
  const selectedType = useWatch({ control, name: "hospital_type" });
  const selectedRegion = useWatch({ control, name: "region" });

  // 오류 피드백 (Alert Dialog)
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const showError = (message: string) => setErrorMsg(message);

  const handleLoadPrevious = async () => {
    const company = (getValues("company") ?? "").trim();
    if (!company) {
      showError("먼저 병원을 선택해주세요.");
      return;
    }
    setLoadingPrev(true);
    try {
      const data = await loadLatestReportData(company);
      if (!data) {
        showError("이전 보고서가 없습니다.");
        return;
      }
      reset(data);
    } catch {
      showError("불러오기 중 오류가 발생했습니다.");
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
      showError("저장 중 오류가 발생했습니다.");
    } finally {
      setSaving(false);
    }
  };

  const inputClass =
    "h-11 rounded-xl border-white/10 bg-white/5 text-gray-100 placeholder:text-gray-500 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/30";
  const rowInputClass =
    "flex-1 h-9 rounded-lg border-white/10 bg-white/5 text-gray-100 text-sm placeholder:text-gray-500 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/30";

  if (saved) {
    return <ResultSuccess message="저장되었어요." redirectTo={redirectTo} />;
  }

  return (
    <div className="flex-1">
      <div className="mx-auto flex max-w-[640px] flex-col gap-4 px-4 py-6">
        {/* 헤더 */}
        <div className="flex flex-col gap-3">
          <Link
            href="/report"
            className="inline-flex items-center gap-1.5 transition-opacity hover:opacity-70"
          >
            <ArrowLeft size={18} />
            <Text as="span" textStyle="t5Bold" color="fg.neutralMuted">
              전체 목록
            </Text>
          </Link>
          <Text as="h1" textStyle="t10Bold">
            새 보고서 작성
          </Text>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* 이전 달 불러오기 */}
          <ActionButton
            type="button"
            variant="neutralWeak"
            size="large"
            className="w-full"
            onClick={handleLoadPrevious}
            loading={loadingPrev}
          >
            이전 달 보고서 불러오기
          </ActionButton>

          {/* 기본 정보 */}
          <div className="flex flex-col gap-2">
            <Text as="h2" textStyle="t8Bold" className="block px-1">
              기본 정보
            </Text>
            <section className="rounded-2xl border border-[var(--seed-color-stroke-neutral-muted)] p-4">
            <div className="flex flex-col gap-4">
              {/* 병원 선택 — 등록된 병원에 대해서만 작성 가능 */}
              <div className="flex flex-col gap-1.5">
                <Label className="text-gray-400 font-normal">병원 선택</Label>
                {hospitals.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/15 px-4 py-4 text-sm text-gray-400">
                    등록된 병원이 없습니다.{" "}
                    <Link
                      href="/hospital/new"
                      className="font-semibold text-gray-100 underline"
                    >
                      병원 먼저 등록하기
                    </Link>
                  </div>
                ) : (
                  <Controller
                    control={control}
                    name="company"
                    rules={{ required: true }}
                    render={({ field }) => (
                      <HospitalCombobox
                        hospitals={hospitals}
                        value={field.value}
                        onSelect={(h) => {
                          field.onChange(h.company);
                          setValue("region", h.region ?? "");
                          setValue("hospital_type", h.hospitalType ?? "");
                        }}
                      />
                    )}
                  />
                )}
              </div>

              {/* 선택한 병원 정보 (유형·지역 자동) */}
              {selectedCompany && (
                <div className="flex flex-wrap items-center gap-2 rounded-xl bg-[#0e299c]/5 px-4 py-3 text-sm">
                  <span className="font-semibold text-gray-100">
                    {selectedCompany}
                  </span>
                  {selectedType && (
                    <span className="rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-300">
                      {selectedType}
                    </span>
                  )}
                  <span className="text-gray-400">
                    · 지역 {selectedRegion || "미설정"}
                  </span>
                </div>
              )}
              <div className="flex flex-col gap-1.5">
                <Label className="text-gray-400 font-normal">보고 월</Label>
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
                <Label htmlFor="reporter" className="text-gray-400 font-normal">
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
                <Label htmlFor="email" className="text-gray-400 font-normal">
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
                <Label htmlFor="password" className="text-gray-400 font-normal">
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
            </div>
          </section>
          </div>

          {/* 집행 항목 */}
          <div className="flex flex-col gap-2">
            <Text as="h2" textStyle="t8Bold" className="block px-1">
              집행 항목
            </Text>
            <section className="rounded-2xl border border-[var(--seed-color-stroke-neutral-muted)] p-4">
            <div className="flex flex-col gap-3">
              {fields.map((field, index) => (
                <div
                  key={field.id}
                  className="bg-white/5 rounded-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-[#0e299c] text-white text-xs font-bold rounded-full">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-gray-200">
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
                  <div className="divide-y divide-white/10">
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-400 shrink-0">
                        구분
                      </span>
                      <select
                        {...register(`categories.${index}.category`)}
                        className={`${rowInputClass} px-2 cursor-pointer`}
                      >
                        <option value="">선택</option>
                        {categoryOptions.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-400 shrink-0">
                        채널
                      </span>
                      <Input
                        {...register(`categories.${index}.channel`)}
                        placeholder="ex. 네이버 파워링크"
                        className={rowInputClass}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-400 shrink-0">
                        집행사
                      </span>
                      <Input
                        {...register(`categories.${index}.agency`)}
                        placeholder="ex. 엠포넷"
                        className={rowInputClass}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-400 shrink-0">
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
                        <span className="text-xs text-gray-400">
                          숫자가 낮을수록 먼저 집행됩니다.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-400 shrink-0">
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
                                className="w-6 h-6 flex items-center justify-center text-gray-100 hover:bg-[#0e299c]/20 rounded font-bold text-base"
                              >
                                −
                              </button>
                              <span className="w-8 text-center text-sm text-gray-100 font-bold">
                                {num}
                              </span>
                              <button
                                type="button"
                                onClick={() => field.onChange(String(num + 1))}
                                className="w-6 h-6 flex items-center justify-center text-gray-100 hover:bg-[#0e299c]/20 rounded font-bold text-base"
                              >
                                +
                              </button>
                              <span className="text-xs text-gray-100 font-medium pr-1">
                                개월
                              </span>
                            </div>
                          );
                        }}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-400 shrink-0">
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
                className="w-full border border-dashed border-white/15 rounded-xl py-3 text-sm text-gray-400 hover:border-[#0e299c] hover:text-gray-100 transition-colors"
              >
                + 항목 추가
              </button>
            </div>
          </section>
          </div>

          {/* 광고 계약·리포트 */}
          <div className="flex flex-col gap-2">
            <Text as="h2" textStyle="t8Bold" className="block px-1">
              광고 계약·리포트
            </Text>
            <section className="rounded-2xl border border-[var(--seed-color-stroke-neutral-muted)] p-4">
            <div className="flex flex-col gap-3">
              {cFields.map((field, index) => (
                <div
                  key={field.id}
                  className="bg-white/5 rounded-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-[#0e299c] text-white text-xs font-bold rounded-full">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-gray-200">
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
                  <div className="divide-y divide-white/10">
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-400 shrink-0">
                        구분
                      </span>
                      <select
                        {...register(`contracts.${index}.category`)}
                        className={`${rowInputClass} px-2 cursor-pointer`}
                      >
                        <option value="">선택</option>
                        {categoryOptions.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-400 shrink-0">
                        계약명
                      </span>
                      <Input
                        {...register(`contracts.${index}.name`)}
                        placeholder="계약명"
                        className={rowInputClass}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-400 shrink-0">
                        키워드
                      </span>
                      <Input
                        {...register(`contracts.${index}.keyword`)}
                        placeholder="키워드"
                        className={rowInputClass}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-400 shrink-0">
                        링크
                      </span>
                      <Input
                        {...register(`contracts.${index}.link`)}
                        placeholder="보고서 링크 URL"
                        className={rowInputClass}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-400 shrink-0">
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
                        <span className="text-xs text-gray-400">
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
                className="w-full border border-dashed border-white/15 rounded-xl py-3 text-sm text-gray-400 hover:border-[#0e299c] hover:text-gray-100 transition-colors"
              >
                + 항목 추가
              </button>
            </div>
          </section>
          </div>

          {/* 광고 심의 및 운영 현황 */}
          <div className="flex flex-col gap-2">
            <Text as="h2" textStyle="t8Bold" className="block px-1">
              광고 심의 및 운영 현황
            </Text>
            <section className="rounded-2xl border border-[var(--seed-color-stroke-neutral-muted)] p-4">
            <div className="flex flex-col gap-3">
              {vFields.map((field, index) => (
                <div
                  key={field.id}
                  className="bg-white/5 rounded-xl overflow-hidden"
                >
                  <div className="flex items-center justify-between px-4 py-3 border-b border-white/10">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 flex items-center justify-center bg-[#0e299c] text-white text-xs font-bold rounded-full">
                        {index + 1}
                      </span>
                      <span className="text-sm font-semibold text-gray-200">
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
                  <div className="divide-y divide-white/10">
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-400 shrink-0">
                        구분
                      </span>
                      <select
                        {...register(`validity.${index}.category`)}
                        className={`${rowInputClass} px-2 cursor-pointer`}
                      >
                        <option value="">선택</option>
                        {categoryOptions.map((cat) => (
                          <option key={cat} value={cat}>
                            {cat}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-400 shrink-0">
                        주제
                      </span>
                      <Input
                        {...register(`validity.${index}.subject`)}
                        placeholder="ex. 네이버 파워링크 계약"
                        className={rowInputClass}
                      />
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-400 shrink-0">
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
                        <span className="text-xs text-gray-400">
                          숫자가 낮을수록 먼저 집행됩니다.
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center px-4 py-2.5 gap-3">
                      <span className="w-20 text-sm text-gray-400 shrink-0">
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
                className="w-full border border-dashed border-white/15 rounded-xl py-3 text-sm text-gray-400 hover:border-[#0e299c] hover:text-gray-100 transition-colors"
              >
                + 유효기간 추가
              </button>
            </div>
          </section>
          </div>

          <div className="flex w-full gap-2">
            <div className="flex-[3]">
              <ActionButton
                asChild
                variant="neutralWeak"
                size="large"
                className="w-full"
              >
                <Link href="/report">취소</Link>
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
                등록
              </ActionButton>
            </div>
          </div>
        </form>
      </div>

      {/* 오류 안내 다이얼로그 */}
      <Dialog.Root
        open={!!errorMsg}
        onOpenChange={(open) => {
          if (!open) setErrorMsg(null);
        }}
      >
        <Dialog.Backdrop />
        <Dialog.Positioner>
          <Dialog.Content>
            <Dialog.Header>
              <Dialog.Title>안내</Dialog.Title>
              <Dialog.Description>{errorMsg}</Dialog.Description>
            </Dialog.Header>
            <Dialog.Footer>
              <Dialog.Action onClick={() => setErrorMsg(null)}>
                확인
              </Dialog.Action>
            </Dialog.Footer>
          </Dialog.Content>
        </Dialog.Positioner>
      </Dialog.Root>
    </div>
  );
}
