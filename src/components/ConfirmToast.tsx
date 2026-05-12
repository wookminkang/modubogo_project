"use client";

interface Props {
  title: string;
  subtitle?: string;
  message: string;
  onYes: () => void;
  onNo: () => void;
  onDismiss?: () => void;
}

export default function ConfirmToast({ title, subtitle, message, onYes, onNo, onDismiss }: Props) {
  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onDismiss ?? onNo} />
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-sm bg-white rounded-2xl shadow-xl border border-gray-100 p-4 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
        <div className="flex items-center gap-2 mb-3">
          <span className="inline-flex items-center justify-center w-7 h-7 bg-[#FEE500] rounded-full shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="#3C1E1E">
              <path d="M12 2C6.477 2 2 6.029 2 11c0 3.084 1.677 5.782 4.2 7.4L5 22l4.2-2.1C10.1 20.27 11.03 20.4 12 20.4c5.523 0 10-4.029 10-9s-4.477-9-10-9z"/>
            </svg>
          </span>
          <div>
            <p className="text-sm font-bold text-gray-900">{title}</p>
            {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
        </div>
        <p className="text-sm text-gray-700 mb-4">{message}</p>
        <div className="flex gap-2">
          <button
            onClick={onNo}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium bg-gray-100 text-gray-600 hover:bg-gray-200 active:scale-95 transition-all"
          >
            아니요
          </button>
          <button
            onClick={onYes}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-[#FEE500] text-[#3C1E1E] hover:brightness-95 active:scale-95 transition-all"
          >
            예
          </button>
        </div>
      </div>
    </>
  );
}
