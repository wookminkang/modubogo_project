"use client";

import { useFieldArray, useForm } from "react-hook-form";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";

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

interface FormValues {
  company: string;
  month: string;
  reporter: string;
  email: string;
  categories: CategoryField[];
  validity: ValidityField[];
}

export default function ReportNewPage() {
  const { register, control, handleSubmit } = useForm<FormValues>({
    defaultValues: {
      categories: [{ category: "", channel: "", agency: "", period: "1", amount: "" }],
      validity: [],
    },
  });

  const { fields, append, remove } = useFieldArray({ control, name: "categories" });
  const { fields: vFields, append: vAppend, remove: vRemove } = useFieldArray({ control, name: "validity" });

  const onSubmit = (data: FormValues) => {
    console.log(data);
    alert("저장되었습니다. (mock)");
  };

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      <div className="px-4 py-6 flex flex-col gap-4">
        <div>
          <Link href="/report" className="text-sm text-gray-400 mb-1 block">← 전체 목록</Link>
          <h1 className="text-2xl font-bold text-[#0e299c]">새 보고서 작성</h1>
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
                  placeholder="ex) 모두보고"
                  className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="month" className="text-gray-500 font-normal">보고 월</Label>
                <Input
                  id="month"
                  {...register("month", { required: true })}
                  type="month"
                  className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reporter" className="text-gray-500 font-normal">보고자</Label>
                <Input
                  id="reporter"
                  {...register("reporter", { required: true })}
                  placeholder="ex) 홍길동"
                  className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-gray-500 font-normal">이메일</Label>
                <Input
                  id="email"
                  {...register("email")}
                  type="email"
                  placeholder="ex) hong@company.com"
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
                    placeholder="구분 (ex. 검색광고)"
                    className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                  />
                  <Input
                    {...register(`categories.${index}.channel`)}
                    placeholder="채널 (ex. 네이버 파워링크)"
                    className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                  />
                  <Input
                    {...register(`categories.${index}.agency`)}
                    placeholder="집행사 (ex. 엠포넷)"
                    className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                  />
                  <div className="flex gap-2">
                    <Input
                      {...register(`categories.${index}.period`)}
                      placeholder="기간(개월)"
                      className="w-28 h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                    />
                    <Input
                      {...register(`categories.${index}.amount`)}
                      placeholder="집행금액"
                      type="number"
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
                    <Button
                      type="button"
                      variant="ghost"
                      size="xs"
                      onClick={() => vRemove(index)}
                      className="text-red-400 hover:text-red-500 hover:bg-red-50"
                    >
                      삭제
                    </Button>
                  </div>
                  <Input
                    {...register(`validity.${index}.category`)}
                    placeholder="구분 (ex. 검색광고)"
                    className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                  />
                  <Input
                    {...register(`validity.${index}.subject`)}
                    placeholder="주제 (ex. 네이버 파워링크 계약)"
                    className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
                  />
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-gray-500 font-normal text-xs">유효기간</Label>
                    <Input
                      {...register(`validity.${index}.expiryDate`)}
                      type="date"
                      className="h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20"
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

          <Button
            type="submit"
            className="w-full bg-[#0e299c] hover:bg-[#0b2180] text-white font-semibold h-14 rounded-2xl text-sm"
          >
            보고서 저장
          </Button>
        </form>
      </div>
    </div>
  );
}
