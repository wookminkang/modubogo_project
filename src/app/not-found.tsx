import Image from "next/image";
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-6 text-center">
      <Image
        src="/images/error_page.png"
        width={200}
        height={200}
        alt="페이지를 찾을 수 없음"
        className="mb-6"
      />
      <h1 className="text-2xl font-bold text-gray-900 mb-3">
        페이지를 찾을 수 없어요.
      </h1>
      <p className="text-sm text-gray-400 leading-relaxed mb-8">
        요청하신 페이지가 존재하지 않거나
        <br />
        잘못된 주소로 접근하셨어요.
        <br />
        <br />
        문제가 계속되면 관리자에게 문의해주세요.
      </p>

      <a
        href="tel:01087821285"
        className="flex items-center gap-2 bg-[#0e299c] text-white text-sm font-semibold px-6 py-3 rounded-2xl mb-3 hover:bg-[#0b2180] transition-colors"
      >
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="15"
          height="15"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13.6 19.79 19.79 0 0 1 1.62 5.1 2 2 0 0 1 3.6 2.87h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 10.5a16 16 0 0 0 6 6l.97-.97a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z" />
        </svg>
        010.8782.1285
      </a>

      <Link
        href="/"
        className="text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        홈으로 돌아가기
      </Link>
    </div>
  );
}
