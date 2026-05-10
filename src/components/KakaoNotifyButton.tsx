"use client";

export default function KakaoNotifyButton() {
  return (
    <button
      onClick={() => alert("🚧 알림톡 기능은 현재 개발중입니다.")}
      title="알림톡 보내기"
      className="flex items-center gap-1.5 bg-[#FEE500] text-[#3C1E1E] text-xs font-bold px-3 py-2 rounded-xl hover:brightness-95 active:scale-95 transition-all shrink-0"
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2C6.477 2 2 6.029 2 11c0 3.084 1.677 5.782 4.2 7.4L5 22l4.2-2.1C10.1 20.27 11.03 20.4 12 20.4c5.523 0 10-4.029 10-9s-4.477-9-10-9z"/>
      </svg>
      알림톡
    </button>
  );
}
