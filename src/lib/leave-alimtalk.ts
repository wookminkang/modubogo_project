import "server-only";
import dayjs from "./dayjs";
import { leaveAmount } from "./utils";
import type { LeaveUnit } from "./db";

// 직원 휴가 신청 → 관리자 알림톡 (BizGo 텍스트형, 카테고리 008002 "내부 업무 알림").
//
// ⚠️ LEAVE_TEMPLATE_TEXT·버튼은 BizGo(카카오)에 등록·승인된 템플릿과 글자 하나까지 같아야 발송된다.
//    승인된 템플릿은 수정할 수 없으니, 문구를 바꾸려면 새 코드로 다시 등록·검수해야 한다.
// "use server" 파일이 아니라 서버 전용 모듈 — 클라이언트에서 직접 호출(문자 남발)할 수 없게 하려는 것.
// 호출은 submitLeaveRequest(@/lib/leave-actions)에서만 한다.

export const LEAVE_TEMPLATE_CODE = "leaveRequest";
export const LEAVE_TEMPLATE_NAME = "직원 휴가 신청 알림";
export const LEAVE_TEMPLATE_CATEGORY = "008002"; // 업무알림 > 내부 업무 알림

export const LEAVE_TEMPLATE_TEXT =
  "[모두보고] 휴가 신청 알림\n\n" +
  "#{직원명}님이 휴가를 신청했습니다.\n\n" +
  "■ 기간: #{기간}\n" +
  "■ 종류: #{종류}\n" +
  "■ 사유: #{사유}\n\n" +
  "아래 버튼을 눌러 신청 내용을 확인하고 승인 또는 거절해 주세요.";

export const LEAVE_TEMPLATE_BUTTON = {
  type: "WL",
  name: "신청 확인하기",
  urlPc: "https://modubogo.com/admin/employees/leave",
  urlMobile: "https://modubogo.com/admin/employees/leave",
};

/** 받는 사람 — 고정 번호 (바꾸려면 여기만 고친다) */
const RECIPIENTS = ["01087821285", "01076654418"];

const SEND_URL = "https://mars.ibapi.kr/api/comm/v1/send/omni";
const REASON_MAX = 300;

const UNIT_LABEL: Record<LeaveUnit, string> = {
  full: "종일",
  half_am: "오전반차",
  half_pm: "오후반차",
};

const fmt = (date: string) => dayjs(date).format("YYYY-MM-DD(dd)");

/** 템플릿 변수 값 — 반차·하루짜리는 날짜 하나, 여러 날은 "시작 ~ 종료" */
export function leaveReplaceWords(input: {
  employeeName: string;
  startDate: string;
  endDate: string;
  unit: LeaveUnit;
  reason: string;
}): Record<string, string> {
  const { employeeName, startDate, endDate, unit } = input;
  const days = leaveAmount({ start_date: startDate, end_date: endDate, unit });
  const reason = input.reason.trim();
  return {
    직원명: employeeName,
    기간: startDate === endDate ? fmt(startDate) : `${fmt(startDate)} ~ ${fmt(endDate)}`,
    종류: `${UNIT_LABEL[unit]} (${days}일)`,
    사유: reason ? reason.slice(0, REASON_MAX) : "(없음)",
  };
}

/** 휴가 신청 알림톡을 고정 수신자 전원에게 보낸다. 한 명이라도 실패하면 에러를 던진다. */
export async function sendLeaveRequestAlimtalk(input: {
  employeeName: string;
  startDate: string;
  endDate: string;
  unit: LeaveUnit;
  reason: string;
}): Promise<void> {
  const apiKey = process.env.BIZGO_API_KEY;
  const senderKey = process.env.BIZGO_SENDER_KEY;
  if (!apiKey || !senderKey) throw new Error("BizGo 환경변수가 설정되지 않았습니다.");

  const replaceWords = leaveReplaceWords(input);
  const text = Object.entries(replaceWords).reduce(
    (t, [k, v]) => t.replaceAll(`#{${k}}`, v),
    LEAVE_TEMPLATE_TEXT,
  );

  const results = await Promise.allSettled(
    RECIPIENTS.map(async (to) => {
      const res = await fetch(SEND_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: apiKey },
        body: JSON.stringify({
          messageFlow: [
            {
              alimtalk: {
                msgType: "AT", // 텍스트형
                senderKey,
                templateCode: LEAVE_TEMPLATE_CODE,
                text,
                attachment: { button: [LEAVE_TEMPLATE_BUTTON] },
              },
            },
          ],
          destinations: [{ to, replaceWords }],
        }),
      });
      const json = await res.json().catch(() => null);
      if (!res.ok) throw new Error(json?.message ?? `BizGo API 오류 (${res.status})`);
    }),
  );

  const failed = results.filter((r) => r.status === "rejected");
  if (failed.length) {
    throw new Error(
      `휴가 신청 알림톡 ${failed.length}/${RECIPIENTS.length}건 실패: ` +
        failed.map((r) => String((r as PromiseRejectedResult).reason)).join(" / "),
    );
  }
}
