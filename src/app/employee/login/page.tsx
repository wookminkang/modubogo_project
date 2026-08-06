import Link from "next/link";
import { redirect } from "next/navigation";
import { loginEmployee } from "@/lib/employee-actions";
import { getEmployeeUser } from "@/lib/employee";

interface Props {
  searchParams: Promise<{ error?: string; signup?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  "1": "아이디 또는 비밀번호가 올바르지 않습니다.",
  pending: "아직 관리자 승인 대기 중입니다. 승인 후 로그인할 수 있어요.",
  rejected: "가입이 거절되었습니다. 관리자에게 문의해주세요.",
};

export default async function EmployeeLoginPage({ searchParams }: Props) {
  if (await getEmployeeUser()) redirect("/employee");

  const { error, signup } = await searchParams;

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="bg-white rounded-2xl p-8 shadow-sm w-full max-w-sm">
        <div className="text-center mb-6">
          <div className="w-14 h-14 bg-[#0e299c]/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#0e299c" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
              <circle cx="12" cy="7" r="4" />
            </svg>
          </div>
          <h1 className="text-lg font-bold text-gray-900">직원 로그인</h1>
          <p className="text-sm text-gray-400 mt-1">아이디와 비밀번호를 입력해주세요.</p>
        </div>

        <form action={loginEmployee} className="flex flex-col gap-3">
          <input
            type="text"
            name="username"
            placeholder="아이디를 입력하세요"
            autoFocus
            autoComplete="username"
            className="w-full h-11 px-4 rounded-xl border border-gray-200 text-gray-900 text-sm outline-none focus:border-[#0e299c] focus:ring-2 focus:ring-[#0e299c]/20"
          />
          <input
            type="password"
            name="password"
            placeholder="비밀번호를 입력하세요"
            autoComplete="current-password"
            className="w-full h-11 px-4 rounded-xl border border-gray-200 text-gray-900 text-sm outline-none focus:border-[#0e299c] focus:ring-2 focus:ring-[#0e299c]/20"
          />
          {signup === "1" && !error && (
            <p className="text-xs text-[#0e299c]">
              가입 신청이 완료되었습니다. 관리자 승인 후 로그인할 수 있어요.
            </p>
          )}
          {error && (
            <p className="text-xs text-red-500">
              {ERROR_MESSAGES[error] ?? ERROR_MESSAGES["1"]}
            </p>
          )}
          <button
            type="submit"
            className="w-full h-12 bg-[#0e299c] hover:bg-[#0b2180] text-white font-semibold rounded-xl text-sm transition-colors"
          >
            로그인
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-5">
          계정이 없으신가요?{" "}
          <Link href="/employee/signup" className="text-[#0e299c] font-semibold">
            회원가입
          </Link>
        </p>
      </div>
    </div>
  );
}
