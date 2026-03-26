'use client';

import React, { useEffect, useRef } from 'react';
import 'mathlive';

interface MathInputProps {
  value: string;
  onChange: (latex: string) => void;
  placeholder?: string;
}

export default function MathInput({ value, onChange, placeholder = "" }: MathInputProps) {
  const mfRef = useRef<any>(null);

  useEffect(() => {
    const mathField = mfRef.current;
    if (!mathField) return;

    // Listen for typing and send the LaTeX string back to the parent
    const handleInput = (e: Event) => {
      const target = e.target as any;
      onChange(target.value);
    };

    mathField.addEventListener('input', handleInput);
    return () => mathField.removeEventListener('input', handleInput);
  }, [onChange]);

  // Keep the visual math field synced if the React state changes externally
  useEffect(() => {
    if (mfRef.current && mfRef.current.value !== value) {
      mfRef.current.value = value;
    }
  }, [value]);

  // 🟢 THE FIX: Cast the custom element to 'any' to bypass TS compiler checks
  const MathFieldTag = 'math-field' as any;

  return (
    <div className="w-full bg-slate-50 border border-slate-300 rounded-xl overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500 transition-all">
      {/* 🟢 Use the casted variable instead of the raw string tag */}
      <MathFieldTag
        ref={mfRef}
        style={{
          width: '100%',
          padding: '12px 16px',
          fontSize: '1.2rem',
          backgroundColor: 'transparent',
          border: 'none',
          outline: 'none',
        }}
      >
        {placeholder}
      </MathFieldTag>
    </div>
  );
}