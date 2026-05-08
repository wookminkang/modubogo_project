"use client";

import { useFieldArray, useForm, Controller } from "react-hook-form";
import Link from "next/link";
import { use } from "react";
import { getReport } from "@/lib/mockData";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/month-picker";
import { DatePicker } from "@/components/ui/date-picker";

interface CategoryField {
  category: string;
  channel: string;
  agency: string;
  period: string;
  amount: string;
}

interface ValidityField {
  category: string;
  subject: string;
  expiryDate: string;
}

interface ContractField {
  category: string;
  name: string;
  keyword: string;
  link: string;
}

interface FormValues {
  company: string;
  month: string;
  reporter: string;
  email: string;
  categories: CategoryField[];
  validity: ValidityField[];
  contracts: ContractField[];
}

export default function ReportEditPage({
  params,
}: {
  params: Promise<{ company: string; month: string }>;
}) {
  const { company, month } = use(params);
  const decoded = decodeURIComponent(company);
  const report = getReport(decoded, month);

  const { register, control, handleSubmit } = useForm<FormValues>({
    defaultValues: report
      ? {
          company: report.company,
          month: report.month,
          reporter: report.reporter,
          email: report.email,
          categories: report.categories,
          validity: report.validity,
          contracts: report.contracts,
        }
      : {
          categories: [{ category: "", channel: "", agency: "", period: "1", amount: "" }],
          validity: [{ category: "", subject: "", expiryDate: "" }],
          contracts: [{ category: "", name: "", keyword: "", link: "" }],
        },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "categories" });
  const { fields: vFields, append: vAppend, remove: vRemove } = useFieldArray({ control, name: "validity" });
  const { fields: cFields, append: cAppend, remove: cRemove } = useFieldArray({ control, name: "contracts" });

  const onSubmit = (data: FormValues) => {
    console.log(data);
    alert("수정되었습니다. (mock)");
  };

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      <div className="px-4 py-6 flex flex-col gap-4">
        <div>
          <Link
            href={`/report/${encodeURIComponent(decoded)}/${month}`}
            className="text-sm text-gray-400 mb-1 block"
          >
            ← 보고서 상세
          </Link>
          <h1 className="text-2xl font-bold text-[#0e299c]">{decoded} · {month} 수정</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* 기본 정보 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0e299c]">기본 정보</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="company" className="text-gray-500 font-normal">상호명</Label>
                <Input
                  id="company"
                  {...register("company", { required: true })}
                  className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-gray-500 font-normal">보고 월</Label>
                <Controller
                  control={control}
                  name="month"
                  rules={{ required: true }}
                  render={({ field }) => (
                    <MonthPicker value={field.value} onChange={field.onChange} />
                  )}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reporter" className="text-gray-500 font-normal">보고자</Label>
                <Input
                  id="reporter"
                  {...register("reporter", { required: true })}
                  className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-gray-500 font-normal">이메일</Label>
                <Input
                  id="email"
                  {...register("email")}
                  type="email"
                  className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                />
              </div>
            </CardContent>
          </Card>

          {/* 집행 항목 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0e299c]">집행 항목</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">항목 {index + 1}</span>
                    {fields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => remove(index)}
                        className="text-red-400 hover:text-red-500 hover:bg-red-50"
                      >
                        삭제
                      </Button>
                    )}
                  </div>
                  <Input
                    {...register(`categories.${index}.category`)}
                    placeholder="구분"
                    className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                  />
                  <Input
                    {...register(`categories.${index}.channel`)}
                    placeholder="채널"
                    className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                  />
                  <Input
                    {...register(`categories.${index}.agency`)}
                    placeholder="집행사"
                    className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                  />
                  <div className="flex gap-2">
                    <Input
                      {...register(`categories.${index}.period`)}
                      placeholder="기간"
                      className="w-28 h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                    />
                    <Input
                      {...register(`categories.${index}.amount`)}
                      type="number"
                      placeholder="금액"
                      className="flex-1 h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => append({ category: "", channel: "", agency: "", period: "1", amount: "" })}
                className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-[#0e299c] hover:text-[#0e299c] transition-colors"
              >
                + 항목 추가
              </button>
            </CardContent>
          </Card>

          {/* 유효기간 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0e299c]">유효기간</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {vFields.map((field, index) => (
                <div key={field.id} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">항목 {index + 1}</span>
                    {vFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => vRemove(index)}
                        className="text-red-400 hover:text-red-500 hover:bg-red-50"
                      >
                        삭제
                      </Button>
                    )}
                  </div>
                  <Input
                    {...register(`validity.${index}.category`)}
                    placeholder="구분"
                    className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                  />
                  <Input
                    {...register(`validity.${index}.subject`)}
                    placeholder="주제"
                    className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                  />
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-gray-500 font-normal text-xs">유효기간</Label>
                    <Controller
                      control={control}
                      name={`validity.${index}.expiryDate`}
                      render={({ field }) => (
                        <DatePicker value={field.value} onChange={field.onChange} />
                      )}
                    />
                  </div>
                </div>
              ))}
              <button
                type="button"
                onClick={() => vAppend({ category: "", subject: "", expiryDate: "" })}
                className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-[#0e299c] hover:text-[#0e299c] transition-colors"
              >
                + 유효기간 추가
              </button>
            </CardContent>
          </Card>

          {/* 광고 계약·리포트 */}
          <Card>
            <CardHeader>
              <CardTitle className="text-[#0e299c]">광고 계약·리포트</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-col gap-4">
              {cFields.map((field, index) => (
                <div key={field.id} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">항목 {index + 1}</span>
                    {cFields.length > 1 && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="xs"
                        onClick={() => cRemove(index)}
                        className="text-red-400 hover:text-red-500 hover:bg-red-50"
                      >
                        삭제
                      </Button>
                    )}
                  </div>
                  <Input
                    {...register(`contracts.${index}.category`)}
                    placeholder="구분값"
                    className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                  />
                  <Input
                    {...register(`contracts.${index}.name`)}
                    placeholder="계약명"
                    className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                  />
                  <Input
                    {...register(`contracts.${index}.keyword`)}
                    placeholder="키워드"
                    className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                  />
                  <Input
                    {...register(`contracts.${index}.link`)}
                    placeholder="보고서 링크 URL"
                    className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                  />
                </div>
              ))}
              <button
                type="button"
                onClick={() => cAppend({ category: "", name: "", keyword: "", link: "" })}
                className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-[#0e299c] hover:text-[#0e299c] transition-colors"
              >
                + 항목 추가
              </button>
            </CardContent>
          </Card>

          <Button
            type="submit"
            className="w-full bg-[#0e299c] hover:bg-[#0b2180] text-white font-semibold h-14 rounded-2xl text-sm"
          >
            수정 완료
          </Button>
        </form>
      </div>
    </div>
  );
}
