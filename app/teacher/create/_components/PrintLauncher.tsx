'use client';

import { Printer } from 'lucide-react';

interface Props {
  title: string;
  questions: any[];
  className?: string;
}

export default function PrintLauncher({ title, questions, className }: Props) {
  
  const handleLaunch = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent clicking the card behind it
    
    const payload = {
      title: title || "Untitled Test",
      questions: questions || []
    };
    localStorage.setItem('print_payload', JSON.stringify(payload));
    window.open('/teacher/print', '_blank');
  };

  return (
    <button 
      onClick={handleLaunch}
      className={`group relative flex items-center justify-center transition-all ${className || "p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"}`}
    >
      <Printer size={20} />
      
      {/* 🟢 THE "PERFECT" TOOLTIP */}
      <div className="absolute bottom-full mb-2 hidden group-hover:flex flex-col items-center whitespace-nowrap z-50 animate-in fade-in slide-in-from-bottom-1 duration-200">
        <div className="bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow-xl">
          Print Test
        </div>
        {/* Tiny Triangle Arrow */}
        <div className="w-2 h-2 bg-slate-900 rotate-45 -mt-1"></div>
      </div>
    </button>
  );
}