'use client';

import React, { useState } from 'react';
import { FiEye, FiEyeOff, FiCopy } from 'react-icons/fi';

interface MaskedTextProps {
  value?: string | null;
  className?: string;
  revealInitially?: boolean;
  canCopy?: boolean;
}

export default function MaskedText({ value, className = '', revealInitially = false, canCopy = true }: MaskedTextProps) {
  const [revealed, setRevealed] = useState(!!revealInitially);
  const text = value || '—';

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {}
  };

  const masked = text === '—' ? text : `${text.slice(0, 2)}${'*'.repeat(Math.max(0, Math.min(6, text.length - 4)))}` + `${text.slice(-2)}`;

  return (
    <div className={`inline-flex items-center gap-2 ${className}`}>
      <span className="font-mono">
        {revealed ? text : masked}
      </span>
      <button
        type="button"
        onClick={() => setRevealed((v) => !v)}
        className="p-1 rounded glass glass-hover"
        title={revealed ? 'Hide' : 'Show'}
      >
        {revealed ? <FiEyeOff className="w-4 h-4" /> : <FiEye className="w-4 h-4" />}
      </button>
      {canCopy && value && (
        <button
          type="button"
          onClick={handleCopy}
          className="p-1 rounded glass glass-hover"
          title="Copy"
        >
          <FiCopy className="w-4 h-4" />
        </button>
      )}
    </div>
  );
}


