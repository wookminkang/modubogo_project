'use client';

import { useEffect, useState } from 'react';

interface Props {
  message: string;
  onDone: () => void;
}

export default function Toast({ message, onDone }: Props) {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDone, 300);
    }, 1200);
    return () => clearTimeout(timer);
  }, [onDone]);

  return (
    <div
      className={`fixed bottom-8 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-sm font-medium px-5 py-3 rounded-2xl shadow-lg transition-all duration-300 z-50 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
      }`}
    >
      {message}
    </div>
  );
}
