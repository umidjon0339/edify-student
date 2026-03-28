'use client';

import { ChevronRight, Layers, X } from "lucide-react";

interface DatabaseSidebarProps {
  categories: any[];
  activeCatIndex: number | null;
  setActiveCatIndex: (idx: number | null) => void;
  activeChapIndex: number | null;
  setActiveChapIndex: (idx: number | null) => void;
  selectedSubtopic: any | null;
  onSubtopicClick: (sub: any) => void;
  isSyllabusOpen: boolean;
  setIsSyllabusOpen: (val: boolean) => void;
  t: any;
}

export default function DatabaseSidebar({
  categories, activeCatIndex, setActiveCatIndex,
  activeChapIndex, setActiveChapIndex,
  selectedSubtopic, onSubtopicClick,
  isSyllabusOpen, setIsSyllabusOpen, t
}: DatabaseSidebarProps) {
  
  return (
    <>
      <aside className={`
        fixed lg:static inset-y-0 left-0 z-40 w-[320px] bg-[#FAFAFA] border-r border-slate-200/80 transform transition-transform duration-300 shadow-2xl lg:shadow-none
        ${isSyllabusOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"}
        flex flex-col h-full shrink-0
      `}>
        {/* Sticky Header */}
        <div className="p-5 border-b border-slate-200/80 flex items-center justify-between bg-white sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="bg-indigo-50 p-2 rounded-xl border border-indigo-100/50">
              <Layers size={18} className="text-indigo-600" />
            </div>
            <div>
              <h2 className="font-black text-slate-800 text-[15px] leading-tight">{t.syllabus.title}</h2>
              <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{t.syllabus.subtitle}</p>
            </div>
          </div>
          <button onClick={() => setIsSyllabusOpen(false)} className="lg:hidden text-slate-400 p-2 hover:bg-slate-100 rounded-xl transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Accordion List */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3 pb-24 lg:pb-6">
          {categories.map((cat) => {
            const isCatActive = activeCatIndex === cat.index;
            return (
              <div key={cat.index} className={`rounded-2xl border transition-all duration-300 overflow-hidden ${isCatActive ? "bg-white border-indigo-200 shadow-sm ring-1 ring-indigo-50" : "bg-white border-slate-200/60 hover:border-slate-300"}`}>
                <button
                  onClick={() => { setActiveCatIndex(isCatActive ? null : cat.index); setActiveChapIndex(null); }}
                  className={`w-full text-left px-4 py-4 flex justify-between items-center transition-colors group ${isCatActive ? "bg-indigo-600" : "bg-white hover:bg-slate-50"}`}
                >
                  <span className={`font-bold text-[13px] ${isCatActive ? "text-white" : "text-slate-700"}`}>{cat.category}</span>
                  <ChevronRight size={16} className={`transition-transform duration-300 ${isCatActive ? "rotate-90 text-indigo-200" : "text-slate-300"}`} />
                </button>
                
                {isCatActive && (
                  <div className="bg-slate-50/50 p-2 space-y-1 border-t border-indigo-50">
                    {cat.chapters.map((chap: any) => {
                      const isChapActive = activeChapIndex === chap.index;
                      return (
                        <div key={chap.index} className="rounded-xl overflow-hidden">
                          <button
                            onClick={() => setActiveChapIndex(isChapActive ? null : chap.index)}
                            className={`w-full text-left px-3 py-2.5 rounded-lg text-[12px] font-bold flex items-center justify-between transition-all duration-200 ${isChapActive ? "bg-indigo-100/50 text-indigo-700" : "text-slate-600 hover:bg-white"}`}
                          >
                            <div className="flex items-center gap-2">
                              <span className={`w-1.5 h-1.5 rounded-full ${isChapActive ? "bg-indigo-500" : "bg-slate-300"}`}></span>
                              <span className="truncate">{chap.chapter}</span>
                            </div>
                            {isChapActive && <ChevronRight size={12} className="text-indigo-400 rotate-90" />}
                          </button>
                          
                          {isChapActive && (
                            <div className="ml-4 pl-3 border-l-2 border-indigo-100 my-2 space-y-1">
                              {chap.subtopics.map((sub: any) => (
                                <button
                                  key={sub.index}
                                  onClick={() => onSubtopicClick(sub)}
                                  className={`w-full text-left px-3 py-2 rounded-lg text-[11px] font-bold truncate transition-all duration-200 flex items-center gap-2 ${
                                    selectedSubtopic?.index === sub.index ? "bg-white text-indigo-600 shadow-sm border border-indigo-100 translate-x-1" : "text-slate-500 hover:text-indigo-600 hover:bg-white/50"
                                  }`}
                                >
                                  {selectedSubtopic?.index === sub.index && <div className="w-1 h-3 bg-indigo-500 rounded-full shrink-0"></div>}
                                  <span className="truncate">{sub.name}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isSyllabusOpen && (
        <div className="fixed inset-0 bg-slate-900/40 z-30 lg:hidden backdrop-blur-sm" onClick={() => setIsSyllabusOpen(false)} />
      )}
    </>
  );
}