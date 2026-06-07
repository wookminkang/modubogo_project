"use server";

import { logAlimtalk } from "./db";

interface SendAlimtalkParams {
  templateCode: string;
  replaceWords: Record<string, string>;
  recipients?: string[];
}

export async function sendAlimtalk({
  templateCode,
  replaceWords,
  recipients,
}: SendAlimtalkParams) {
  const apiKey = process.env.BIZGO_API_KEY;
  const senderKey = process.env.BIZGO_SENDER_KEY;
  const fallback = process.env.BIZGO_RECIPIENT;

  if (!apiKey || !senderKey) {
    throw new Error("BizGo 환경변수가 설정되지 않았습니다.");
  }

  const recipientList =
    (recipients?.filter(Boolean) ?? []).length > 0
      ? recipients!.filter(Boolean)
      : fallback
        ? [fallback]
        : [];

  if (recipientList.length === 0) {
    throw new Error("알림톡 수신자가 설정되지 않았습니다.");
  }

  const templateText =
    "안녕하세요, (주)알리다고입니다.\n\n#{병원 상호명}\n#{리포트월} 리포트 전달드립니다.\n\n광고 운영 및 집행 내역은 아래 [모두보고] 사이트에서 확인 가능하십니다.\n\n\n감사합니다.";
  const text = Object.entries(replaceWords).reduce(
    (t, [k, v]) => t.replace(`#{${k}}`, v),
    templateText,
  );

  const company = replaceWords["병원 상호명"] ?? "";
  const month = replaceWords["리포트월"] ?? "";
  const reportUrl = replaceWords["url1"] ?? "";

  let results;
  try {
    results = await Promise.all(
      recipientList.map(async (to) => {
        const body = {
          messageFlow: [
            {
              alimtalk: {
                msgType: "AI",
                senderKey,
                templateCode,
                text,
                attachment: {
                  button: [
                    {
                      type: "WL",
                      name: "보고서 확인하기",
                      urlPc: replaceWords.url2 ?? "",
                      urlMobile: replaceWords.url1 ?? "",
                    },
                  ],
                },
              },
            },
          ],
          destinations: [{ to, replaceWords }],
        };

        const res = await fetch("https://mars.ibapi.kr/api/comm/v1/send/omni", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: apiKey,
          },
          body: JSON.stringify(body),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.message ?? `BizGo API 오류 (${res.status})`);
        }
        return json;
      }),
    );
  } catch (e) {
    await logAlimtalk({
      company,
      month,
      recipients: recipientList,
      status: "failed",
      error_message: e instanceof Error ? e.message : String(e),
      report_url: reportUrl,
    });
    throw e;
  }

  await logAlimtalk({
    company,
    month,
    recipients: recipientList,
    status: "success",
    report_url: reportUrl,
  });

  return results;
}

/**
 * 공휴일 진료일정 확인 알림톡 발송 (템플릿: holidayCheck)
 * 변수: #{병원명}, #{월}(yyyy-mm), #{공휴일}(공휴일 목록)
 * 버튼: '진료일정 회신하기' → /holiday/#{상호명}/#{날짜} (/holiday/[company]/[month])
 */
export async function sendHolidayAlimtalk({
  company,
  monthLabel,
  monthNum,
  schedule,
  detailUrl,
  recipients,
}: {
  company: string;
  monthLabel: string; // 로그용 'YYYY-MM'
  monthNum: number; // 7
  schedule: string; // "- 7월 17일(금) 제헌절"
  detailUrl: string;
  recipients?: string[];
}) {
  const apiKey = process.env.BIZGO_API_KEY;
  const senderKey = process.env.BIZGO_SENDER_KEY;
  const fallback = process.env.BIZGO_RECIPIENT;

  if (!apiKey || !senderKey) {
    throw new Error("BizGo 환경변수가 설정되지 않았습니다.");
  }

  const recipientList =
    (recipients?.filter(Boolean) ?? []).length > 0
      ? recipients!.filter(Boolean)
      : fallback
        ? [fallback]
        : [];

  if (recipientList.length === 0) {
    throw new Error("알림톡 수신자가 설정되지 않았습니다.");
  }

  // ⚠️ 이 text는 bizgo에 등록된 holidayCheck 템플릿 내용과 일치해야 합니다.
  const replaceWords: Record<string, string> = {
    병원명: company,
    월: `${monthNum}월`, // 자연스러운 표기 (예: 7월). 로그는 monthLabel(yyyy-mm) 사용
    공휴일: schedule,
    // 버튼 URL 변수 (템플릿 버튼: https://modubogo.com/holiday/#{상호명}/#{날짜})
    상호명: encodeURIComponent(company), // 한글 URL → 인코딩
    날짜: monthLabel, // yyyy-mm
  };
  const templateText =
    "안녕하세요. (주)알리다고입니다.\n\n" +
    "병원정보 관리 서비스의 원활한 운영을 위해 #{병원명}의 #{월} 진료일정 확인이 필요하여 안내드립니다.\n\n\n" +
    "■ 확인 필요 일정\n- #{공휴일}\n\n" +
    "고객님께서 회신해주신 진료일정은 네이버 플레이스, 카카오맵 등 병원 정보 플랫폼의 운영시간 및 휴무일 정보 관리에 활용될 예정입니다.\n\n" +
    "▶ 진료일정 이미지는 알리다고 공통 디자인으로 제작 및 배포될 예정입니다. 광고주별 개별 맞춤 디자인 제작은 어려운 점 양해 부탁드립니다.\n\n" +
    "▶ 정확한 정보 반영을 위해 #{월} 진료일정을 회신해 주시기 바랍니다.\n\n" +
    "감사합니다.";
  const text = Object.entries(replaceWords).reduce(
    (t, [k, v]) => t.replaceAll(`#{${k}}`, v),
    templateText,
  );

  let results;
  try {
    results = await Promise.all(
      recipientList.map(async (to) => {
        const body = {
          messageFlow: [
            {
              alimtalk: {
                msgType: "AI",
                senderKey,
                templateCode: "holidayCheck",
                text,
                attachment: {
                  button: [
                    {
                      type: "WL",
                      name: "진료일정 회신하기",
                      // 템플릿 버튼과 동일한 변수 URL → BizGo가 replaceWords로 치환
                      urlPc: "https://modubogo.com/holiday/#{상호명}/#{날짜}",
                      urlMobile: "https://modubogo.com/holiday/#{상호명}/#{날짜}",
                    },
                  ],
                },
              },
            },
          ],
          destinations: [{ to, replaceWords }],
        };

        const res = await fetch("https://mars.ibapi.kr/api/comm/v1/send/omni", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: apiKey,
          },
          body: JSON.stringify(body),
        });

        const json = await res.json();
        if (!res.ok) {
          throw new Error(json?.message ?? `BizGo API 오류 (${res.status})`);
        }
        return json;
      }),
    );
  } catch (e) {
    await logAlimtalk({
      company,
      month: monthLabel,
      recipients: recipientList,
      status: "failed",
      error_message: e instanceof Error ? e.message : String(e),
      report_url: detailUrl,
    });
    throw e;
  }

  await logAlimtalk({
    company,
    month: monthLabel,
    recipients: recipientList,
    status: "success",
    report_url: detailUrl,
  });

  return results;
}
