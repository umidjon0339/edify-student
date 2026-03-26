'use client';

import { FileText, Clock, Users, ArrowRight } from 'lucide-react';
import PrintLauncher from '@/app/teacher/create/_components/PrintLauncher'; // 👈 Import it

interface Props {
  test: any;
  onManage: () => void;
}

export default function TestCard({ test, onManage }: Props) {
  return (
    <div 
      onClick={onManage}
      className="group bg-white rounded-2xl border border-slate-200 p-5 hover:border-indigo-300 hover:shadow-md transition-all cursor-pointer relative overflow-hidden"
    >
      {/* Status Stripe */}
      <div className={`absolute top-0 left-0 w-1 h-full transition-colors ${test.status === 'archived' ? 'bg-slate-300' : 'bg-indigo-500 group-hover:bg-indigo-600'}`}></div>

      <div className="pl-3 flex flex-col h-full">
        
        {/* Header */}
        <div className="flex justify-between items-start mb-3">
          <div className="w-10 h-10 rounded-xl bg-slate-50 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
            <FileText size={20} />
          </div>
          
          {/* 🟢 ACTIONS AREA */}
          <div className="flex items-center gap-1">
             {/* The Print Button */}
             <PrintLauncher 
                title={test.title} 
                questions={test.questions}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
             />
          </div>
        </div>

        {/* Title */}
        <h3 className="font-bold text-slate-800 text-lg mb-1 group-hover:text-indigo-700 transition-colors line-clamp-1">
          {test.title}
        </h3>
        <p className="text-xs text-slate-400 font-mono mb-4">Code: {test.accessCode}</p>

        {/* Metrics */}
        <div className="mt-auto flex items-center gap-4 text-xs font-medium text-slate-500">
           <span className="flex items-center gap-1.5">
             <Clock size={14} /> {test.duration ? `${test.duration}m` : 'No Limit'}
           </span>
           <span className="flex items-center gap-1.5">
             <Users size={14} /> {test.questionCount} Qs
           </span>
        </div>
        
        {/* Hover Action Arrow */}
        <div className="absolute bottom-5 right-5 opacity-0 group-hover:opacity-100 transition-all transform translate-x-2 group-hover:translate-x-0 text-indigo-500">
           <ArrowRight size={20} />
        </div>

      </div>
    </div>
  );
}