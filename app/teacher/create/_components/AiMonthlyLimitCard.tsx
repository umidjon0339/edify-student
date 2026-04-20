"use client";

import { useState } from "react";
import { X, Zap, Crown, CreditCard } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";

interface AiMonthlyLimitCardProps {
  aiData: {
    limit: number;
    used: number;
    remaining: number;
    usagePercentage: number;
    isUnlimited: boolean;
    isDanger: boolean;
    resetDate: string;
    loading: boolean;
  }; 
}

export default function AiMonthlyLimitCard({ aiData }: AiMonthlyLimitCardProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const router = useRouter();

  if (!aiData || aiData.loading) return null;

  const isEmpty = !aiData.isUnlimited && aiData.remaining <= 0;

  return (
    <div className="relative">
      
      {/* 1. THE TOP-BAR BUTTON */}
      <button 
        onClick={() => setIsModalOpen(!isModalOpen)}
        className={`flex items-center gap-2 md:gap-3 px-3 py-1.5 md:px-4 md:py-2 border rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer 
          ${isEmpty || aiData.isDanger
            ? 'bg-rose-50 border-rose-200 hover:bg-rose-100' 
            : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
      >
        <Zap size={14} className={isEmpty || aiData.isDanger ? "text-rose-500" : "text-amber-500"} />
        
        <span className={`text-[11px] md:text-[13px] font-bold whitespace-nowrap ${isEmpty || aiData.isDanger ? "text-rose-700" : "text-slate-700"}`}>
          <span className="hidden sm:inline">Oylik AI Limit </span>
          <span className={isEmpty || aiData.isDanger ? "text-rose-600" : "text-slate-500"}>
            ({aiData.isUnlimited ? '∞' : `${aiData.used}/${aiData.limit}`})
          </span>
        </span>
      </button>

      {/* 2. THE DROPDOWN POPOVER */}
      <AnimatePresence>
        {isModalOpen && (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setIsModalOpen(false)} />
            
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: -10 }} 
              animate={{ opacity: 1, scale: 1, y: 0 }} 
              exit={{ opacity: 0, scale: 0.95, y: -10 }} 
              className="absolute right-0 top-full mt-3 bg-white rounded-[2rem] p-6 w-[340px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-slate-100 z-[101] flex flex-col origin-top-right"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>

              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-xl flex items-center justify-center border shadow-inner ${isEmpty ? "bg-rose-50 border-rose-100" : "bg-indigo-50 border-indigo-100"}`}>
                  <Zap size={20} className={isEmpty ? "text-rose-500" : "text-indigo-500"} />
                </div>
                <div>
                  <h3 className="text-[16px] font-black text-slate-900 leading-tight">Oylik AI Balans</h3>
                  <p className="text-[11px] font-bold text-slate-400 mt-0.5">Yangilanish: {aiData.resetDate}</p>
                </div>
              </div>

              <div className="w-full bg-slate-50 border border-slate-100 rounded-2xl p-4 mb-5 relative overflow-hidden">
                <div className="flex justify-between items-end mb-2">
                  <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Qolgan limit</span>
                  <span className={`text-2xl font-black leading-none ${isEmpty ? "text-rose-600" : "text-indigo-600"}`}>
                    {aiData.isUnlimited ? '∞' : aiData.remaining}
                  </span>
                </div>
                
                {!aiData.isUnlimited && (
                  <>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden mt-3 mb-1.5">
                      <div 
                        className={`h-full rounded-full transition-all duration-1000 ${isEmpty || aiData.isDanger ? 'bg-rose-500' : 'bg-gradient-to-r from-indigo-500 to-purple-500'}`} 
                        style={{ width: `${aiData.usagePercentage}%` }}
                      ></div>
                    </div>
                    <div className="flex justify-between text-[10px] font-bold text-slate-400">
                      <span>Ishlatildi: {aiData.used}</span>
                      <span>Jami: {aiData.limit}</span>
                    </div>
                  </>
                )}
              </div>

              <div className="w-full flex flex-col gap-2">
                <button 
                  onClick={() => {
                    setIsModalOpen(false);
                    router.push('/teacher/subscription');
                  }}
                  className="w-full py-3.5 bg-slate-900 hover:bg-slate-800 text-white font-bold rounded-xl shadow-lg shadow-slate-900/20 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[13px]"
                >
                  <Crown size={16} className="text-amber-400" />
                  <span>{isEmpty ? "Limitni oshirish" : "Tarifni oshirish (Kredit olish)"}</span>
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}