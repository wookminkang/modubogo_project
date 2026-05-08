'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { copyLatestReport } from '@/lib/copy-actions';
import { Copy } from 'lucide-react';

interface Props {
  company: string;
}

export default function CopyReportButton({ company }: Props) {
  const router = useRouter();
  const [copying, setCopying] = useState(false);

  const handleCopy = async () => {
    setCopying(true);
    try {
      const { company: co, month } = await copyLatestReport(company);
      router.push(`/report/${encodeURIComponent(co)}/${month}/edit`);
    } catch (err) {
      alert(err instanceof Error ? err.message : '복사 중 오류가 발생했습니다.');
    } finally {
      setCopying(false);
    }
  };

  return (
    <button
      onClick={handleCopy}
      disabled={copying}
      className="flex items-center gap-1.5 border border-[#0e299c] text-[#0e299c] text-sm font-medium px-4 py-2 rounded-xl disabled:opacity-50"
    >
      <Copy className="w-3.5 h-3.5" />
      {copying ? '복사 중...' : '이전 달 복사'}
    </button>
  );
}
