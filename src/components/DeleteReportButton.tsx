'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteReport } from '@/lib/db';
import { Trash2 } from 'lucide-react';
import ConfirmToast from './ConfirmToast';
import Toast from './Toast';

interface Props {
  reportId: number;
  month: string;
}

type Step = 'idle' | 'confirm' | 'result';

export default function DeleteReportButton({ reportId, month }: Props) {
  const router = useRouter();
  const [step, setStep] = useState<Step>('idle');
  const [resultMsg, setResultMsg] = useState('');

  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setStep('confirm');
  };

  const handleYes = async () => {
    setStep('idle');
    try {
      await deleteReport(reportId);
      setResultMsg('삭제되었어요');
      setStep('result');
      router.refresh();
    } catch {
      setResultMsg('삭제 중 오류가 발생했습니다.');
      setStep('result');
    }
  };

  const handleNo = () => {
    setStep('result');
    setResultMsg('보고서 삭제를 취소했어요.');
  };

  return (
    <>
      <button
        onClick={handleClick}
        className="p-2 text-gray-300 hover:text-red-400 transition-colors shrink-0"
      >
        <Trash2 className="w-4 h-4" />
      </button>

      {step === 'confirm' && (
        <ConfirmToast
          title="보고서 삭제"
          subtitle={month}
          message="보고서를 삭제하시겠어요?"
          onYes={handleYes}
          onNo={handleNo}
        />
      )}

      {step === 'result' && (
        <Toast message={resultMsg} onDone={() => setStep('idle')} />
      )}
    </>
  );
}
