import { loginAdmin } from '@/lib/admin-actions';

interface Props {
  searchParams: Promise<{ error?: string }>;
}

export default async function AdminLoginPage({ searchParams }: Props) {
  const { error } = await searchParams;

  return (
    <div className="min-h-screen bg-[#F0F4FA] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl p-8 shadow-sm w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-[#0e299c]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0e299c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900">관리자 로그인</h1>
          <p className="text-sm text-gray-400 mt-1">관리자 비밀번호를 입력해주세요.</p>
        </div>

        <form action={loginAdmin} className="flex flex-col gap-3">
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
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}
