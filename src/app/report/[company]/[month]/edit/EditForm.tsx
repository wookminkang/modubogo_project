"use client";

import { useFieldArray, useForm, Controller } from "react-hook-form";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { upsertReport, deleteReport } from "@/lib/db";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { MonthPicker } from "@/components/ui/month-picker";
import { DatePicker } from "@/components/ui/date-picker";
import Link from "next/link";

interface CategoryField { category: string; channel: string; agency: string; period: string; amount: string; }
interface ValidityField { category: string; subject: string; expiryDate: string; }
interface ContractField { category: string; name: string; keyword: string; link: string; }

interface FormValues {
  company: string;
  month: string;
  reporter: string;
  email: string;
  categories: CategoryField[];
  validity: ValidityField[];
  contracts: ContractField[];
}

interface Props {
  reportId: number;
  defaultValues: FormValues;
  company: string;
  month: string;
}

export default function EditForm({ reportId, defaultValues, company, month }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const { register, control, handleSubmit } = useForm<FormValues>({ defaultValues });

  const { fields, append, remove } = useFieldArray({ control, name: "categories" });
  const { fields: vFields, append: vAppend, remove: vRemove } = useFieldArray({ control, name: "validity" });
  const { fields: cFields, append: cAppend, remove: cRemove } = useFieldArray({ control, name: "contracts" });

  const onSubmit = async (data: FormValues) => {
    setSaving(true);
    try {
      await upsertReport({ id: reportId, ...data, status: "완료" });
      router.push(`/report/${encodeURIComponent(data.company)}/${data.month}`);
      router.refresh();
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

  const inputClass = "h-11 rounded-xl border-gray-200 text-gray-900 focus-visible:border-[#0e299c] focus-visible:ring-[#0e299c]/20";

  return (
    <div className="min-h-screen bg-[#F0F4FA]">
      <div className="px-4 py-6 flex flex-col gap-4">
        <div>
          <Link href={`/report/${encodeURIComponent(company)}/${month}`} className="text-sm text-gray-400 mb-1 block">← 보고서 상세</Link>
          <h1 className="text-2xl font-bold text-[#0e299c]">{company} · {month} 수정</h1>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {/* 기본 정보 */}
          <Card>
            <CardHeader><CardTitle className="text-[#0e299c]">기본 정보</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="company" className="text-gray-500 font-normal">상호명</Label>
                <Input id="company" {...register("company", { required: true })} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label className="text-gray-500 font-normal">보고 월</Label>
                <Controller control={control} name="month" rules={{ required: true }}
                  render={({ field }) => <MonthPicker value={field.value} onChange={field.onChange} />}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="reporter" className="text-gray-500 font-normal">보고자</Label>
                <Input id="reporter" {...register("reporter", { required: true })} className={inputClass} />
              </div>
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="email" className="text-gray-500 font-normal">이메일</Label>
                <Input id="email" {...register("email")} type="email" className={inputClass} />
              </div>
            </CardContent>
          </Card>

          {/* 집행 항목 */}
          <Card>
            <CardHeader><CardTitle className="text-[#0e299c]">집행 항목</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              {fields.map((field, index) => (
                <div key={field.id} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">항목 {index + 1}</span>
                    {fields.length > 1 && (
                      <Button type="button" variant="ghost" size="xs" onClick={() => remove(index)} className="text-red-400 hover:text-red-500 hover:bg-red-50">삭제</Button>
                    )}
                  </div>
                  <Input {...register(`categories.${index}.category`)} placeholder="구분" className={inputClass} />
                  <Input {...register(`categories.${index}.channel`)} placeholder="채널" className={inputClass} />
                  <Input {...register(`categories.${index}.agency`)} placeholder="집행사" className={inputClass} />
                  <div className="flex gap-2">
                    <Input {...register(`categories.${index}.period`)} placeholder="기간" className={`w-28 ${inputClass}`} />
                    <Input {...register(`categories.${index}.amount`)} type="number" placeholder="금액" className={`flex-1 ${inputClass}`} />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => append({ category: "", channel: "", agency: "", period: "1", amount: "" })}
                className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-[#0e299c] hover:text-[#0e299c] transition-colors">
                + 항목 추가
              </button>
            </CardContent>
          </Card>

          {/* 광고 심의 및 운영 현황 */}
          <Card>
            <CardHeader><CardTitle className="text-[#0e299c]">광고 심의 및 운영 현황</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              {vFields.map((field, index) => (
                <div key={field.id} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">항목 {index + 1}</span>
                    {vFields.length > 1 && (
                      <Button type="button" variant="ghost" size="xs" onClick={() => vRemove(index)} className="text-red-400 hover:text-red-500 hover:bg-red-50">삭제</Button>
                    )}
                  </div>
                  <Input {...register(`validity.${index}.category`)} placeholder="구분" className={inputClass} />
                  <Input {...register(`validity.${index}.subject`)} placeholder="주제" className={inputClass} />
                  <div className="flex flex-col gap-1.5">
                    <Label className="text-gray-500 font-normal text-xs">유효기간</Label>
                    <Controller control={control} name={`validity.${index}.expiryDate`}
                      render={({ field }) => <DatePicker value={field.value} onChange={field.onChange} />}
                    />
                  </div>
                </div>
              ))}
              <button type="button" onClick={() => vAppend({ category: "", subject: "", expiryDate: "" })}
                className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-[#0e299c] hover:text-[#0e299c] transition-colors">
                + 유효기간 추가
              </button>
            </CardContent>
          </Card>

          {/* 광고 계약·리포트 */}
          <Card>
            <CardHeader><CardTitle className="text-[#0e299c]">광고 계약·리포트</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-4">
              {cFields.map((field, index) => (
                <div key={field.id} className="border border-gray-100 rounded-xl p-4 flex flex-col gap-3">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700">항목 {index + 1}</span>
                    {cFields.length > 1 && (
                      <Button type="button" variant="ghost" size="xs" onClick={() => cRemove(index)} className="text-red-400 hover:text-red-500 hover:bg-red-50">삭제</Button>
                    )}
                  </div>
                  <Input {...register(`contracts.${index}.category`)} placeholder="구분값" className={inputClass} />
                  <Input {...register(`contracts.${index}.name`)} placeholder="계약명" className={inputClass} />
                  <Input {...register(`contracts.${index}.keyword`)} placeholder="키워드" className={inputClass} />
                  <Input {...register(`contracts.${index}.link`)} placeholder="보고서 링크 URL" className={inputClass} />
                </div>
              ))}
              <button type="button" onClick={() => cAppend({ category: "", name: "", keyword: "", link: "" })}
                className="w-full border border-dashed border-gray-300 rounded-xl py-3 text-sm text-gray-400 hover:border-[#0e299c] hover:text-[#0e299c] transition-colors">
                + 항목 추가
              </button>
            </CardContent>
          </Card>

          <Button type="submit" disabled={saving}
            className="w-full bg-[#0e299c] hover:bg-[#0b2180] text-white font-semibold h-14 rounded-2xl text-sm">
            {saving ? "저장 중..." : "수정 완료"}
          </Button>

          <Button type="button" variant="ghost" disabled={deleting} onClick={handleDelete}
            className="w-full text-red-400 hover:text-red-500 hover:bg-red-50 h-12 rounded-2xl text-sm">
            {deleting ? "삭제 중..." : "보고서 삭제"}
          </Button>
        </form>
      </div>
    </div>
  );
}
