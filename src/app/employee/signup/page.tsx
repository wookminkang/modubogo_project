import Link from "next/link";
import { redirect } from "next/navigation";
import { signupEmployee } from "@/lib/employee-actions";
import { getEmployeeUser } from "@/lib/employee";

interface Props {
  searchParams: Promise<{ error?: string }>;
}

const ERROR_MESSAGES: Record<string, string> = {
  missing: "이름, 아이디, 연락처, 이메일, 입사일, 비밀번호를 모두 입력해주세요.",
  email: "이메일 형식이 올바르지 않습니다.",
  mismatch: "비밀번호가 일치하지 않습니다.",
  duplicate: "이미 사용 중인 아이디입니다.",
  unknown: "가입 처리 중 오류가 발생했습니다. 다시 시도해주세요.",
};

export default async function EmployeeSignupPage({ searchParams }: Props) {
  if (await getEmployeeUser()) redirect("/employee");

  const { error } = await searchParams;

  return (
    <div className="flex items-center justify-center min-h-[70vh]">
      <div className="bg-white rounded-2xl p-8 shadow-sm w-full max-w-sm">
        <div className="text-center mb-6">
          <h1 className="text-lg font-bold text-gray-900">직원 회원가입</h1>
          <p className="text-sm text-gray-400 mt-1">
            가입 후 관리자 승인이 완료되면 로그인할 수 있어요.
          </p>
        </div>

        <form action={signupEmployee} className="flex flex-col gap-3">
          <input
            type="text"
            name="name"
            placeholder="이름"
            autoFocus
            autoComplete="name"
            className="w-full h-11 px-4 rounded-xl border border-gray-200 text-gray-900 text-sm outline-none focus:border-[#0e299c] focus:ring-2 focus:ring-[#0e299c]/20"
          />
          <input
            type="text"
            name="username"
            placeholder="아이디"
            autoComplete="username"
            className="w-full h-11 px-4 rounded-xl border border-gray-200 text-gray-900 text-sm outline-none focus:border-[#0e299c] focus:ring-2 focus:ring-[#0e299c]/20"
          />
          <input
            type="tel"
            name="phone"
            placeholder="연락처 (010-0000-0000)"
            autoComplete="tel"
            className="w-full h-11 px-4 rounded-xl border border-gray-200 text-gray-900 text-sm outline-none focus:border-[#0e299c] focus:ring-2 focus:ring-[#0e299c]/20"
          />
          <input
            type="email"
            name="email"
            placeholder="이메일"
            autoComplete="email"
            className="w-full h-11 px-4 rounded-xl border border-gray-200 text-gray-900 text-sm outline-none focus:border-[#0e299c] focus:ring-2 focus:ring-[#0e299c]/20"
          />
          <label className="flex flex-col gap-1 text-xs text-gray-400">
            입사일
            <input
              type="date"
              name="hireDate"
              required
              className="w-full h-11 px-4 rounded-xl border border-gray-200 text-gray-900 text-sm outline-none focus:border-[#0e299c] focus:ring-2 focus:ring-[#0e299c]/20"
            />
          </label>
          <input
            type="password"
            name="password"
            placeholder="비밀번호"
            autoComplete="new-password"
            className="w-full h-11 px-4 rounded-xl border border-gray-200 text-gray-900 text-sm outline-none focus:border-[#0e299c] focus:ring-2 focus:ring-[#0e299c]/20"
          />
          <input
            type="password"
            name="passwordConfirm"
            placeholder="비밀번호 확인"
            autoComplete="new-password"
            className="w-full h-11 px-4 rounded-xl border border-gray-200 text-gray-900 text-sm outline-none focus:border-[#0e299c] focus:ring-2 focus:ring-[#0e299c]/20"
          />
          {error && (
            <p className="text-xs text-red-500">
              {ERROR_MESSAGES[error] ?? ERROR_MESSAGES.unknown}
            </p>
          )}
          <button
            type="submit"
            className="w-full h-12 bg-[#0e299c] hover:bg-[#0b2180] text-white font-semibold rounded-xl text-sm transition-colors"
          >
            가입 신청
          </button>
        </form>

        <p className="text-center text-sm text-gray-400 mt-5">
          이미 계정이 있으신가요?{" "}
          <Link href="/employee/login" className="text-[#0e299c] font-semibold">
            로그인
          </Link>
        </p>
      </div>
    </div>
  );
}
