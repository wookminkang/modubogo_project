"use client";

import { StickyNote } from "lucide-react";
import { TabsRoot, TabsList, TabsTrigger, TabsContent } from "seed-design/ui/tabs";
import { Text } from "seed-design/ui/text";
import { Badge } from "seed-design/ui/badge";
import { ActionButton } from "seed-design/ui/action-button";
import AlimtalkSettingsButton from "@/components/AlimtalkSettingsButton";
import NaverAdSettingsButton from "@/components/NaverAdSettingsButton";
import DableSettingsButton from "@/components/DableSettingsButton";

// getCompanySettings 의 반환은 별도 타입이 없어 느슨하게 받는다.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Settings = any;

interface Props {
  company: string;
  settings: Settings;
}

function StatusBadge({ connected, label }: { connected: boolean; label: string }) {
  return connected ? (
    <Badge tone="positive" variant="weak" size="medium">
      {label}
    </Badge>
  ) : (
    <Badge tone="neutral" variant="weak" size="medium">
      미설정
    </Badge>
  );
}

export default function HospitalTabs({ company, settings }: Props) {
  const recipients = [settings?.recipient1, settings?.recipient2, settings?.recipient3]
    .map((n: unknown) => (typeof n === "string" ? n.trim() : ""))
    .filter(Boolean);
  const naverLinked = Boolean(
    settings?.naver_ad_api_key &&
      settings?.naver_ad_secret_key &&
      settings?.naver_ad_customer_id,
  );
  const dableLinked = Boolean(settings?.dable_api_key && settings?.dable_account);
  const region = settings?.region ?? null;

  const settingTrigger = (
    <ActionButton variant="neutralWeak" size="small">
      설정
    </ActionButton>
  );

  const rows = [
    {
      key: "alimtalk",
      name: "알림톡",
      sub: "카카오 알림톡 수신",
      connected: recipients.length > 0,
      status: `수신자 ${recipients.length}명`,
      action: (
        <AlimtalkSettingsButton
          company={company}
          defaultValues={settings ?? {}}
          trigger={settingTrigger}
        />
      ),
    },
    {
      key: "naver",
      name: "네이버 광고",
      sub: "검색광고 API 연동",
      connected: naverLinked,
      status: "연동됨",
      action: (
        <NaverAdSettingsButton
          company={company}
          defaultValues={settings ?? {}}
          trigger={settingTrigger}
        />
      ),
    },
    {
      key: "dable",
      name: "데이블",
      sub: "네이티브 광고 연동",
      connected: dableLinked,
      status: "연동됨",
      action: (
        <DableSettingsButton
          company={company}
          defaultValues={settings ?? {}}
          trigger={settingTrigger}
        />
      ),
    },
  ];

  const memo = [
    `${company} 운영 기록 메모`,
    "",
    `· 지역 : ${region ?? "미설정"}`,
    `· 알림톡 수신자 : ${recipients.length}명`,
    `· 네이버 광고 : ${naverLinked ? "연동됨" : "미설정"}`,
    `· 데이블 : ${dableLinked ? "연동됨" : "미설정"}`,
    "",
    "상세 운영 히스토리(보고서 발송·수정 이력 등)는 준비 중이에요.",
  ].join("\n");

  return (
    <TabsRoot defaultValue="info" className="mt-4">
      <TabsList>
        <TabsTrigger value="info">병원정보</TabsTrigger>
        <TabsTrigger value="history">히스토리</TabsTrigger>
      </TabsList>

      {/* 병원정보: 알림톡 / 네이버 / 데이블 */}
      <TabsContent value="info">
        <div className="px-4 py-4">
          <div className="overflow-hidden rounded-2xl border border-[var(--seed-color-stroke-neutral-muted)] bg-[var(--seed-color-bg-layer-default)]">
            {rows.map((row, i) => (
              <div
                key={row.key}
                className={`flex items-center justify-between gap-3 px-4 py-3.5 ${
                  i > 0 ? "border-t border-[var(--seed-color-stroke-neutral-muted)]" : ""
                }`}
              >
                <div className="min-w-0">
                  <Text textStyle="t5Bold">{row.name}</Text>
                  <Text as="p" textStyle="t3Regular" color="fg.neutralSubtle" className="mt-0.5">
                    {row.sub}
                  </Text>
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  <StatusBadge connected={row.connected} label={row.status} />
                  {row.action}
                </div>
              </div>
            ))}
          </div>
        </div>
      </TabsContent>

      {/* 히스토리: 메모식 텍스트 */}
      <TabsContent value="history">
        <div className="px-4 py-4">
          <div className="rounded-2xl border border-[var(--seed-color-stroke-neutral-muted)] bg-[var(--seed-color-bg-layer-default)] p-4">
            <div className="flex items-center gap-1.5">
              <StickyNote size={15} className="text-[var(--seed-color-fg-neutral-muted)]" />
              <Text textStyle="t4Bold" color="fg.neutralMuted">
                운영 메모
              </Text>
            </div>
            <Text
              as="p"
              textStyle="t4Regular"
              color="fg.neutralSubtle"
              className="mt-3 whitespace-pre-line leading-relaxed"
            >
              {memo}
            </Text>
          </div>
        </div>
      </TabsContent>
    </TabsRoot>
  );
}
