'use client';

import { useEffect } from 'react';
import { ChevronUp, ChevronDown } from 'lucide-react';

export default function ScrollNav() {
  useEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  return (
    <div className="fixed bottom-6 right-4 z-50 flex flex-col gap-2">
      <button
        onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
        className="w-11 h-11 flex flex-col items-center justify-center bg-[#0e299c] text-white rounded-2xl shadow-lg hover:bg-[#0b2180] active:scale-95 transition-all gap-0.5"
        aria-label="맨 위로"
      >
        <ChevronUp size={18} />
        <span className="text-[9px] font-semibold leading-none">TOP</span>
      </button>
      <button
        onClick={() => window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' })}
        className="w-11 h-11 flex flex-col items-center justify-center bg-[#0e299c] text-white rounded-2xl shadow-lg hover:bg-[#0b2180] active:scale-95 transition-all gap-0.5"
        aria-label="맨 아래로"
      >
        <ChevronDown size={18} />
        <span className="text-[9px] font-semibold leading-none">BOT</span>
      </button>
    </div>
  );
}
