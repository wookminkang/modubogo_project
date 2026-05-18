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

  const recipientList = (recipients?.filter(Boolean) ?? []).length > 0
    ? recipients!.filter(Boolean)
    : fallback ? [fallback] : [];

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
      })
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
