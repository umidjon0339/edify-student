"use client";

import { useState, useEffect } from "react";
import { Clock, Info, X, Zap, Send } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface AiLimitCardProps {
  aiData: any; 
}

export default function AiLimitCard({ aiData }: AiLimitCardProps) {
  const [timeLeft, setTimeLeft] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  useEffect(() => {
    if (!aiData) return;

    const updateTimer = () => {
      const now = new Date();
      const tashkentString = now.toLocaleString("en-US", { timeZone: "Asia/Tashkent" });
      const tashkentTime = new Date(tashkentString);
      
      const midnight = new Date(tashkentTime);
      midnight.setHours(24, 0, 0, 0);
      
      const diffMs = midnight.getTime() - tashkentTime.getTime();
      const h = Math.floor(diffMs / (1000 * 60 * 60));
      const m = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
      
      setTimeLeft(`${h}s ${m}d`); 
    };

    updateTimer(); 
    const interval = setInterval(updateTimer, 60000); 
    
    return () => clearInterval(interval);
  }, [aiData]);

  // 🟢 CHANGED: We removed the "return null" so it ALWAYS shows up.
  if (!aiData) return null;

  const isReached = aiData.isLimitReached;

  return (
    <div className="relative">
      
      {/* 1. THE TOP-BAR BUTTON (DYNAMIC STYLING) */}
      <button 
        onClick={() => setIsModalOpen(!isModalOpen)}
        className={`flex items-center gap-2 md:gap-3 px-3 py-1.5 md:px-4 md:py-2 border rounded-xl shadow-sm transition-all active:scale-95 cursor-pointer 
          ${isReached 
            ? 'bg-gradient-to-r from-indigo-50 to-blue-50 border-indigo-200 hover:from-indigo-100 hover:to-blue-100' 
            : 'bg-white border-slate-200 hover:bg-slate-50'
          }`}
      >
        <Zap size={14} className={isReached ? "text-indigo-500" : "text-amber-500"} />
        
        <span className={`text-[11px] md:text-[13px] font-bold whitespace-nowrap ${isReached ? "text-indigo-800" : "text-slate-700"}`}>
          <span className="hidden sm:inline">{isReached ? "Limit tugadi " : "AI Limit "}</span>
          <span className={isReached ? "opacity-70" : "text-slate-500"}>({aiData.used}/{aiData.limit})</span>
        </span>
        
        <div className={`h-3 w-px hidden sm:block ${isReached ? "bg-indigo-200" : "bg-slate-200"}`}></div>
        
        <div className="flex items-center gap-1.5">
          <Info size={14} className={isReached ? "text-indigo-500" : "text-slate-400"} />
          <span className={`text-[11px] md:text-[12px] font-bold whitespace-nowrap hidden sm:block ${isReached ? "text-indigo-600" : "text-slate-500"}`}>
            Ma'lumot
          </span>
        </div>
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
              className="absolute right-0 top-full mt-3 bg-white rounded-3xl p-6 w-[340px] shadow-[0_20px_60px_-15px_rgba(0,0,0,0.15)] border border-slate-100 z-[101] flex flex-col items-center text-center origin-top-right"
            >
              <button onClick={() => setIsModalOpen(false)} className="absolute top-4 right-4 p-2 text-slate-400 hover:text-slate-900 hover:bg-slate-100 rounded-full transition-colors">
                <X size={20} />
              </button>

              <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-4 border relative shadow-inner ${isReached ? "bg-indigo-50 border-indigo-100" : "bg-amber-50 border-amber-100"}`}>
                <Zap size={24} className={isReached ? "text-indigo-500" : "text-amber-500"} />
              </div>

              <h3 className="text-[17px] font-black text-slate-900 mb-2 tracking-tight">
                {isReached ? "Bugungi AI limiti tugadi" : "Sizning kunlik AI limitingiz"}
              </h3>
              
              <p className="text-[13px] text-slate-500 mb-5 font-medium leading-relaxed">
                {isReached 
                  ? `Siz bugun barcha ${aiData.limit} ta bepul savollarni yaratdingiz. Belgilangan vaqt o'tgandan so'ng, yana bepul savollar yaratishingiz mumkin.`
                  : `Siz bugun ${aiData.used} ta savol yaratdingiz. Yana ${aiData.remaining} ta bepul savol yaratish imkoniyatingiz mavjud.`
                }
              </p>

              <div className="w-full bg-slate-50 border border-slate-100 rounded-xl p-3 mb-5 relative overflow-hidden">
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 relative z-10">
                  {isReached ? "Yana yaratish mumkin:" : "Limit yangilanishiga qoldi:"}
                </p>
                <div className="flex items-center justify-center gap-2 relative z-10">
                  <Clock size={16} className={isReached ? "text-indigo-500" : "text-slate-500"} />
                  <span className={`text-[15px] font-black ${isReached ? "text-indigo-700" : "text-slate-700"}`}>
                    {timeLeft}
                  </span>
                </div>
              </div>

              <div className="w-full flex flex-col gap-2">
                <button 
                  onClick={() => window.open('https://t.me/umidjon0339', '_blank')}
                  className="w-full py-3 bg-[#0088cc] hover:bg-[#0077b3] text-white font-bold rounded-xl shadow-md shadow-blue-200 transition-all active:scale-[0.98] flex items-center justify-center gap-2 text-[14px]"
                >
                  <Send size={16} />
                  <span>Limitni oshirish</span>
                </button>
                
                <button onClick={() => setIsModalOpen(false)} className="w-full py-3 bg-white hover:bg-slate-50 text-slate-500 hover:text-slate-700 font-bold rounded-xl transition-all active:scale-[0.98] text-[14px]">
                  Yopish
                </button>
              </div>

            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}