import { verifyReportPassword } from '@/lib/actions';

interface Props {
  reportId: number;
  company: string;
  month: string;
  error?: boolean;
}

export default function PasswordGate({ reportId, company, month, error }: Props) {
  const verify = verifyReportPassword.bind(null, reportId, company, month);

  return (
    <div className="min-h-screen bg-[#F0F4FA] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-[#0e299c]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0e299c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
              <path d="M7 11V7a5 5 0 0 1 10 0v4" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900">비밀번호 확인</h1>
          <p className="text-sm text-gray-400 mt-1">이 보고서는 비밀번호로 보호되어 있습니다.</p>
        </div>

        <form action={verify} className="flex flex-col gap-3">
          <input
            type="password"
            name="password"
            placeholder="비밀번호를 입력하세요"
            autoFocus
            className="w-full h-11 px-4 rounded-xl border border-gray-200 text-gray-900 text-sm outline-none focus:border-[#0e299c] focus:ring-2 focus:ring-[#0e299c]/20"
          />
          {error && (
            <p className="text-xs text-red-500">비밀번호가 올바르지 않습니다.</p>
          )}
          <button
            type="submit"
            className="w-full h-12 bg-[#0e299c] hover:bg-[#0b2180] text-white font-semibold rounded-xl text-sm transition-colors"
          >
            확인
          </button>
        </form>
      </div>
    </div>
  );
}
