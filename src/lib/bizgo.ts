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
 * 공휴일 진료일정 확인 알림톡 발송 (템플릿: holidayCheck2)
 * 변수: #{월}(예: 7월), #{공휴일}(일정 목록, 각 줄 "- ...")
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

  // ⚠️ 이 text는 bizgo에 등록된 holidayCheck2 템플릿 내용과 정확히 일치해야 합니다.
  // (2026-06 템플릿 개정: #{병원명} 제거, 안내 문구 변경, #{공휴일}의 dash는 schedule 값에 포함)
  const replaceWords: Record<string, string> = {
    월: `${monthNum}월`, // 자연스러운 표기 (예: 7월). 로그는 monthLabel(yyyy-mm) 사용
    공휴일: schedule, // 각 줄 "- ..." 형식 (호출부에서 구성)
    // 버튼 URL 변수 (템플릿 버튼: https://modubogo.com/holiday/#{상호명}/#{날짜})
    상호명: encodeURIComponent(company), // 한글 URL → 인코딩
    날짜: monthLabel, // yyyy-mm
  };
  const templateText =
    "안녕하세요. (주)알리다고입니다.\n" +
    "알리다고 관리 서비스를 이용 중이신 경우, #{월} 진료일정 확인을 부탁드립니다.\n\n" +
    "■ 확인 필요 일정\n#{공휴일}\n\n" +
    "회신해주신 일정은 네이버 플레이스, 카카오맵 등 병원 정보 플랫폼의 운영시간 및 휴무일 정보 관리에 반영될 예정입니다.\n\n" +
    "공휴일 외 추가 휴무, 단축진료, 연장진료 일정이 있으신 경우 함께 전달해 주시면 반영하여 관리해드리겠습니다.\n\n" +
    "진료일정 관련 문의사항이 있으신 경우 카카오톡 또는 전화로 연락 주시면 안내 도와드리겠습니다.\n\n" +
    "감사합니다.\n(주)알리다고 드림";
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
                templateCode: "holidayCheck2",
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

/**
 * 입금·소진(결제) 내역 안내 알림톡 발송 (템플릿: modubogo_03)
 * 변수: #{병원상호}, 버튼 URL 변수 #{slug}
 * 버튼: '확인하기' → https://modubogo.com/ledger/#{slug}/view (광고주 공개 뷰)
 * ⚠️ templateText·버튼 URL 은 카카오 승인된 modubogo_03 내용과 정확히 일치해야 합니다.
 */
export async function sendLedgerAlimtalk({
  company,
  slug,
  recipients,
}: {
  company: string; // 병원 상호명 (#{병원상호})
  slug: string; // 회사 식별자(nanoid) — 버튼 URL #{slug}
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

  // 광고주 공개 뷰(/view). 관리자 편집 페이지(/ledger/#{slug})는 로그인이 필요하므로
  // 광고주가 열람할 수 있도록 반드시 /view 로 보낸다. (승인 템플릿 버튼 URL도 동일해야 함)
  const buttonUrl = "https://modubogo.com/ledger/#{slug}/view";
  const resolvedUrl = `https://modubogo.com/ledger/${slug}/view`; // 로그용
  const replaceWords: Record<string, string> = {
    병원상호: company,
    slug,
  };
  const templateText =
    "안녕하세요, (주)알리다고입니다.\n\n" +
    "#{병원상호}\n\n" +
    "결제 내역을 안내드립니다.\n\n" +
    "상세 결제 내역은 아래 [모두보고] 사이트에서 확인하실 수 있습니다.\n\n" +
    "감사합니다.";
  const text = Object.entries(replaceWords).reduce(
    (t, [k, v]) => t.replaceAll(`#{${k}}`, v),
    templateText,
  );

  const month = new Date().toISOString().slice(0, 7); // 로그용 YYYY-MM

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
                templateCode: "modubogo_03",
                text,
                attachment: {
                  button: [
                    {
                      type: "WL",
                      name: "확인하기",
                      urlPc: buttonUrl,
                      urlMobile: buttonUrl,
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
      report_url: resolvedUrl,
    });
    throw e;
  }

  await logAlimtalk({
    company,
    month,
    recipients: recipientList,
    status: "success",
    report_url: resolvedUrl,
  });

  return results;
}
