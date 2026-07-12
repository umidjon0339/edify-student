// app/(student)/rushmodel/page.tsx
'use client';

import { motion } from 'framer-motion';
import { Sparkles, Rocket, Target } from 'lucide-react';

// Components
import MathematicsCard from './componentss/MathematicsCard';

// ─── Page ──────────────────────────────────────────────────────────────────────
export default function RushModelPage() {
  return (
    <div className="min-h-screen bg-zinc-100 font-sans pb-28 md:pb-12">
      <div className="max-w-[900px] mx-auto px-4 sm:px-6 md:px-8">

        {/* ── Header ──────────────────────────────────────────────────────── */}
        <div className="pt-8 pb-8 flex flex-col sm:flex-row sm:items-end justify-between gap-5">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 bg-gradient-to-br from-violet-500 to-indigo-600 rounded-[1.2rem] text-white flex items-center justify-center border-b-4 border-indigo-700 shadow-lg">
                <Target size={24} strokeWidth={2.5} />
              </div>
              <h1 className="text-3xl md:text-4xl font-black text-zinc-900 tracking-tight">
                Rush<span className="text-violet-600">Model</span>
              </h1>
            </div>
            <p className="text-[15px] font-bold text-zinc-500 pl-1">
              Fanlarni tanlang va tezkor mashq qilishni boshlang 🚀
            </p>
          </motion.div>

          {/* Quick action button */}
          <motion.button
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3, delay: 0.1 }}
            className="flex items-center gap-2 px-5 py-3.5 bg-violet-500 text-white font-black text-[14px] rounded-2xl border-b-4 border-violet-700 active:border-b-0 active:translate-y-1 transition-all shrink-0 uppercase tracking-wider hover:bg-violet-600 shadow-lg shadow-violet-200"
          >
            <Rocket size={18} strokeWidth={3} />
            Tezkor Boshlash
          </motion.button>
        </div>

        {/* ── Info Banner ─────────────────────────────────────────────────── */}
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: 0.05 }}
          className="mb-6 bg-gradient-to-r from-violet-500 to-indigo-600 rounded-[1.5rem] p-5 md:p-6 border-b-4 border-indigo-700 text-white relative overflow-hidden"
        >
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-2 right-8 w-20 h-20 border-4 border-white rounded-full" />
            <div className="absolute bottom-2 right-28 w-12 h-12 border-4 border-white rounded-full" />
            <div className="absolute top-4 right-48 w-8 h-8 border-4 border-white rounded-full" />
          </div>

          <div className="relative flex items-center gap-4">
            <div className="w-12 h-12 bg-white/20 rounded-[1rem] flex items-center justify-center shrink-0 backdrop-blur-sm border border-white/20">
              <Sparkles size={22} strokeWidth={2.5} />
            </div>
            <div>
              <h3 className="text-[17px] font-black tracking-tight">
                Imtihonga tayyorlaning!
              </h3>
              <p className="text-[13px] font-bold text-white/80 mt-1 leading-snug">
                Har bir fan bo&apos;yicha mavzularni o&apos;rganing, savollarni yeching va bilimingizni sinang. 
                Natijalaringiz real vaqtda kuzatiladi.
              </p>
            </div>
          </div>
        </motion.div>

        {/* ── Mathematics Section ─────────────────────────────────────────── */}
        <MathematicsCard />

      </div>
    </div>
  );
}
