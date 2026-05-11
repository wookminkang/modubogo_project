"use server";

interface SendAlimtalkParams {
  templateCode: string;
  replaceWords: Record<string, string>;
}

export async function sendAlimtalk({
  templateCode,
  replaceWords,
}: SendAlimtalkParams) {
  const apiKey = process.env.BIZGO_API_KEY;
  const senderKey = process.env.BIZGO_SENDER_KEY;
  const recipient = process.env.BIZGO_RECIPIENT;

  if (!apiKey || !senderKey || !recipient) {
    throw new Error("BizGo 환경변수가 설정되지 않았습니다.");
  }

  const templateText =
    "안녕하세요.\n\n#{상호명}\n\n#{날짜}월 리포트를 전달드려요.\n광고 운영 및 진행 내역을 아래 링크에서 확인해주세요.\n\n모두보고님. 요청하신 리포트가 도착했습니다!";
  const text = Object.entries(replaceWords).reduce(
    (t, [k, v]) => t.replace(`#{${k}}`, v),
    templateText,
  );

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
                name: "리포트 확인하기",
                urlPc: replaceWords.url2 ?? "",
                urlMobile: replaceWords.url1 ?? "",
              },
            ],
          },
        },
      },
    ],
    destinations: [
      {
        to: recipient,
        replaceWords,
      },
    ],
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
}
