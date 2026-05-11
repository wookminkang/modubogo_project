'use server';

interface SendAlimtalkParams {
  templateCode: string;
  replaceWords: Record<string, string>;
}

export async function sendAlimtalk({ templateCode, replaceWords }: SendAlimtalkParams) {
  const apiKey = process.env.BIZGO_API_KEY;
  const senderKey = process.env.BIZGO_SENDER_KEY;
  const recipient = process.env.BIZGO_RECIPIENT;

  if (!apiKey || !senderKey || !recipient) {
    throw new Error('BizGo 환경변수가 설정되지 않았습니다.');
  }

  const body = {
    messageFlow: [
      {
        alimtalk: {
          msgType: 'AT',
          senderKey,
          templateCode,
          responseMethod: 'push',
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

  const res = await fetch('https://api.bizgo.io/api/comm/v1/send/omni', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `ApiKey ${apiKey}`,
    },
    body: JSON.stringify(body),
  });

  const json = await res.json();

  if (!res.ok) {
    throw new Error(json?.message ?? `BizGo API 오류 (${res.status})`);
  }

  return json;
}
