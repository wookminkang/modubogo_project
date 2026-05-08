'use client';

import Image from 'next/image';
import { useRouter } from 'next/navigation';

interface Props {
  message: string;
  redirectTo: string;
}

export default function ResultSuccess({ message, redirectTo }: Props) {
  const router = useRouter();

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center px-4">
      <Image
        src="/images/test_ct_10.png"
        width={200}
        height={200}
        alt="완료 캐릭터"
        className="mb-6"
      />
      <p className="text-xl font-bold text-gray-900">{message}</p>
      <button
        onClick={() => router.push(redirectTo)}
        className="mt-8 w-full max-w-sm bg-[#0e299c] hover:bg-[#0b2180] text-white font-semibold h-14 rounded-2xl text-sm transition-colors"
      >
        목록으로 이동하기
      </button>
    </div>
  );
}
