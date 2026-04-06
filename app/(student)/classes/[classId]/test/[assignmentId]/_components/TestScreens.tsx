'use client';

import { Clock, AlertCircle, Zap, Eye, Lock } from 'lucide-react';
import { useRouter } from 'next/navigation';

export function TestLobby({ state, startTest, router, t }: any) {
  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white rounded-3xl shadow-xl border border-slate-200 p-8 text-center space-y-6">
        <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center mx-auto mb-2 animate-bounce">
          <Clock size={40} />
        </div>
        <div>
          <h1 className="text-3xl font-black text-slate-900 mb-2">{state.test.title}</h1>
          <p className="text-slate-500 font-medium">
            {state.questions.length} {t.lobby.questions} • {state.test.duration || 60} {t.lobby.minutes}
          </p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 text-left flex gap-3">
          <AlertCircle className="text-yellow-600 shrink-0" size={24} />
          <div className="text-sm text-yellow-800">
            <p className="font-bold mb-1">{t.lobby.instructions}</p>
            <ul className="list-disc list-inside space-y-1 opacity-90">
              <li>{t.lobby.rule1}</li>
              <li>{t.lobby.rule2}</li>
              <li>{t.lobby.rule3}</li>
            </ul>
          </div>
        </div>
        <button onClick={startTest} className="w-full py-4 bg-indigo-600 hover:bg-indigo-700 text-white font-black text-lg rounded-2xl shadow-lg shadow-indigo-200 hover:scale-[1.02] transition-all">
          {t.lobby.startBtn}
        </button>
        <button onClick={() => router.back()} className="text-slate-400 font-bold text-sm hover:text-slate-600">
          {t.lobby.cancel}
        </button>
      </div>
    </div>
  );
}

export function TestResults({ state, classId, assignmentId, isPastDeadline, router, t }: any) {
  const visibility = state.test.resultsVisibility || (state.test.showResults ? 'always' : 'never');
  const canShow = visibility === 'always' || (visibility === 'after_due' && isPastDeadline(state.assignment.dueAt));
  const accuracy = Math.round((state.score! / state.questions.length) * 100);

  return (
    <div className="min-h-screen bg-[#FDFDFD] flex items-center justify-center p-4 relative overflow-hidden">
      <div className="absolute top-0 left-0 w-full h-full opacity-5 pointer-events-none">
         <div className="absolute top-10 left-10 text-9xl">🎉</div>
         <div className="absolute bottom-10 right-10 text-9xl">✨</div>
      </div>

      <div className="max-w-md w-full bg-white rounded-[2rem] shadow-2xl border-b-8 border-slate-200 p-8 text-center space-y-6 relative z-10 animate-in zoom-in duration-300">
        <div className="relative">
           <div className="w-28 h-28 bg-yellow-100 rounded-full flex items-center justify-center mx-auto mb-4 animate-bounce border-4 border-yellow-300 shadow-inner">
              <div className="text-6xl">🏆</div>
           </div>
           <h1 className="text-3xl font-black text-slate-800 tracking-tight mb-1">{t.result.submitted}</h1>
           <p className="text-slate-400 font-bold text-sm uppercase tracking-wide">{t.result.saved}</p>
        </div>

        <div className="grid grid-cols-2 gap-4">
           {state.earnedXP !== undefined && state.earnedXP > 0 && (
             <div className="col-span-2 bg-gradient-to-b from-amber-400 to-amber-500 rounded-2xl p-1 shadow-[0_6px_0_#b45309] active:translate-y-1 active:shadow-none transition-all relative overflow-hidden group">
                <div className="bg-white/10 absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity"></div>
                <div className="bg-white/20 h-1/2 w-full absolute top-0 left-0 rounded-t-xl"></div>
                <div className="relative p-5 flex flex-col items-center">
                  <div className="flex items-center gap-2 text-amber-900/60 font-black text-xs uppercase tracking-widest mb-1">
                    <Zap size={16} fill="currentColor" /> {t.result.xpEarned}
                  </div>
                  <span className="text-5xl font-black text-white drop-shadow-md tracking-tighter">+{state.earnedXP}</span>
                  {state.xpBreakdown && state.xpBreakdown.length > 0 && (
                    <div className="flex flex-wrap justify-center gap-1.5 mt-3">
                      {state.xpBreakdown.map((item: string, idx: number) => (
                        <span key={idx} className="px-2 py-0.5 bg-amber-600/30 rounded-lg text-[10px] font-bold text-white border border-white/20">
                          {item.split(':')[0]}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
             </div>
           )}

           <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-[0_4px_0_#e2e8f0] flex flex-col items-center justify-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{t.result.score}</span>
              <span className="text-2xl font-black text-indigo-600">
                {state.score} <span className="text-sm text-slate-300">/ {state.questions.length}</span>
              </span>
           </div>

           <div className="bg-white border-2 border-slate-100 rounded-2xl p-4 shadow-[0_4px_0_#e2e8f0] flex flex-col items-center justify-center">
              <span className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Accuracy</span>
              <span className={`text-2xl font-black ${accuracy >= 80 ? 'text-green-500' : accuracy >= 60 ? 'text-amber-500' : 'text-red-500'}`}>
                {accuracy}%
              </span>
           </div>
        </div>

        <div className="space-y-3 pt-2">
          {canShow ? (
            <button onClick={() => router.push(`/classes/${classId}/test/${assignmentId}/results`)} className="w-full py-4 bg-indigo-600 hover:bg-indigo-500 text-white font-black rounded-xl shadow-[0_4px_0_#3730a3] active:shadow-none active:translate-y-1 transition-all flex items-center justify-center gap-3 text-lg">
              <Eye size={22} /> {t.actions.viewResults}
            </button>
          ) : (
            <div className="bg-slate-50 p-4 rounded-xl text-slate-500 text-sm font-bold flex items-center justify-center gap-2 border-2 border-slate-100 border-dashed">
              <Lock size={16} /> {t.result.hidden}
            </div>
          )}
          <button onClick={() => router.push(`/classes/${classId}`)} className="w-full py-4 bg-white border-2 border-slate-200 text-slate-500 hover:text-slate-700 hover:bg-slate-50 font-black rounded-xl transition-all active:scale-[0.98]">
            {t.actions.returnClass}
          </button>
        </div>
      </div>
    </div>
  );
}