"use client";

import Link from "next/link";
import { Smartphone, Upload, ExternalLink } from "lucide-react";
import dayjs from "@/lib/dayjs";
import HolidayDetailPreview from "./HolidayDetailPreview";

interface Holiday {
  date: string;
  name: string;
}

// 알림톡 미리보기 배너는 항상 고정 이미지
const FIXED_ALIMTALK_BANNER = "/images/talk_sample_img.jpg";

/**
 * 오른쪽 패널 (프레젠테이션): 배너 선택 박스 + 알림톡 미리보기(배너 고정) +
 * 자세히보기 미리보기(업로드 배너) + 전송 버튼.
 * 배너 선택/저장 상태는 상위 HolidayClient에서 관리한다.
 */
export default function AlimtalkPanel({
  hospitalName,
  year,
  month,
  holidays,
  bannerUrl,
  fileName,
  onSelectFile,
}: {
  hospitalName: string;
  year: number;
  month: number;
  holidays: Holiday[];
  bannerUrl: string;
  fileName: string;
  onSelectFile: (file: File) => void;
}) {
  return (
    <div>
      {/* 진료일정 배너 선택 (저장은 상단 '저장하기' 버튼) */}
      <div className="mb-6">
        <p className="mb-2 text-sm font-bold text-gray-700">
          {month}월 진료일정 배너
        </p>
        <label className="flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-gray-300 px-4 py-3 text-sm text-gray-500 transition-colors hover:border-[#0e299c] hover:text-[#0e299c]">
          <Upload size={16} className="shrink-0" />
          <span className="truncate">{fileName || "배너 이미지 업로드"}</span>
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onSelectFile(f);
            }}
          />
        </label>
      </div>

      {/* 알림톡 미리보기 + 자세히보기 (나란히) */}
      <div className="flex flex-col gap-8 lg:flex-row lg:items-start lg:gap-5">
        <div className="min-w-0 lg:flex-1">
      {/* 알림톡 미리보기 (배너 고정) */}
      <div className="mb-4 flex items-center gap-2">
        <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#FEE500] shrink-0">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="#3C1E1E">
            <path d="M12 5C7.589 5 4 7.87 4 11.4c0 2.2 1.344 4.13 3.36 5.293l-.697 2.531a.268.268 0 0 0 .392.297L10.5 17.7c.49.077 1 .12 1.5.12 4.411 0 8-2.87 8-6.4S16.411 5 12 5z" />
          </svg>
        </span>
        <h3 className="text-sm font-bold text-gray-700">알림톡 미리보기</h3>
      </div>

      <div className="rounded-2xl bg-[#7e9499] p-4">
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm">
          <div className="bg-[#FEE500] px-4 py-2.5">
            <span className="text-sm font-bold text-[#3C1E1E]">알림톡 도착</span>
          </div>

          {/* 상단 배너 (고정) */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={FIXED_ALIMTALK_BANNER}
            alt="공휴일 진료 안내"
            className="w-full h-auto"
          />

          <div className="flex flex-col gap-3 px-4 py-4 text-sm leading-relaxed text-gray-600">
            <p>안녕하세요. (주)알리다고입니다.</p>

            <p>
              병원정보 관리 서비스의 원활한 운영을 위해 {hospitalName}의 {month}월
              진료일정 확인이 필요하여 안내드립니다.
            </p>

            <div>
              <p className="font-semibold text-gray-800">■ 확인 필요 일정</p>
              {holidays.length === 0 ? (
                <p>- {month}월 공휴일이 없습니다.</p>
              ) : (
                holidays.map((h) => (
                  <p key={h.date}>
                    - {dayjs(h.date).format("M월 D일(ddd)")} {h.name}
                  </p>
                ))
              )}
            </div>

            <p>
              고객님께서 회신해주신 진료일정은 네이버 플레이스, 카카오맵 등 병원
              정보 플랫폼의 운영시간 및 휴무일 정보 관리에 활용될 예정입니다.
            </p>

            <p>
              ▶ 진료일정 이미지는 알리다고 공통 디자인으로 제작 및 배포될
              예정입니다. 광고주별 개별 맞춤 디자인 제작은 어려운 점 양해
              부탁드립니다.
            </p>

            <p>
              ▶ 정확한 정보 반영을 위해 {month}월 진료일정을 회신해 주시기
              바랍니다.
            </p>

            <p>감사합니다.</p>
          </div>

          <div className="border-t border-gray-100 py-3 text-center text-sm font-medium text-gray-600">
            진료일정 회신하기
          </div>
        </div>
      </div>
        </div>

        <div className="min-w-0 lg:flex-1">
      {/* 자세히 보기 화면 미리보기 (업로드 배너 반영) */}
      <div>
        <div className="mb-4 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-[#0e299c]/10 shrink-0">
              <Smartphone size={13} className="text-[#0e299c]" />
            </span>
            <h3 className="text-sm font-bold text-gray-700">자세히 보기 화면</h3>
          </div>
          <Link
            href={`/holiday/${encodeURIComponent(hospitalName)}/${year}-${String(
              month
            ).padStart(2, "0")}`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-500 transition-colors hover:border-[#0e299c] hover:text-[#0e299c]"
          >
            바로가기
            <ExternalLink size={12} />
          </Link>
        </div>

        <HolidayDetailPreview
          hospitalName={hospitalName}
          year={year}
          month={month}
          holidays={holidays}
          bannerUrl={bannerUrl}
        />
      </div>
        </div>
      </div>
    </div>
  );
}
