'use client';

import { useState, useEffect } from 'react';
import { Input } from './input';

interface Props {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function formatWithComma(val: string) {
  const num = val.replace(/[^0-9]/g, '');
  if (!num) return '';
  return Number(num).toLocaleString('ko-KR');
}

export function AmountInput({ value, onChange, placeholder, className }: Props) {
  const [display, setDisplay] = useState(formatWithComma(value));

  useEffect(() => {
    setDisplay(formatWithComma(value));
  }, [value]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const raw = e.target.value.replace(/[^0-9]/g, '');
    setDisplay(formatWithComma(raw));
    onChange(raw);
  };

  return (
    <Input
      inputMode="numeric"
      value={display}
      onChange={handleChange}
      placeholder={placeholder}
      className={className}
    />
  );
}
