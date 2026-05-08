'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteReport } from '@/lib/db';
import { Trash2 } from 'lucide-react';

interface Props {
  reportId: number;
}

export default function DeleteReportButton({ reportId }: Props) {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!confirm('보고서를 삭제하시겠습니까?')) return;
    setDeleting(true);
    try {
      await deleteReport(reportId);
      router.refresh();
    } catch (err) {
      console.error(err);
      alert('삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleting(false);
    }
  };

  return (
    <button
      onClick={handleDelete}
      disabled={deleting}
      className="p-2 text-gray-300 hover:text-red-400 transition-colors disabled:opacity-40 shrink-0"
    >
      <Trash2 className="w-4 h-4" />
    </button>
  );
}
