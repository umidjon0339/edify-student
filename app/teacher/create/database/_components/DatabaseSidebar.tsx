'use client';

import { ChevronRight, Layers, X } from "lucide-react";

import { IconButton, cn } from "@/components/ui";

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
      <aside className={cn(
        "fixed lg:static inset-y-0 left-0 z-40 w-[320px] bg-surface border-r border-outline-variant transform transition-transform duration-300 shadow-elev-3 lg:shadow-none t-float-panel",
        isSyllabusOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0",
        "flex flex-col h-full shrink-0",
      )}>
        {/* Sticky Header */}
        <div className="p-5 border-b border-outline-variant flex items-center justify-between bg-surface-container-lowest sticky top-0 z-10 shrink-0">
          <div className="flex items-center gap-3">
            <div className="t-icon-chip p-2 rounded-m3-md">
              <Layers size={18} />
            </div>
            <div>
              <h2 className="font-extrabold text-on-surface text-[15px] leading-tight">{t.syllabus.title}</h2>
              <p className="text-[11px] font-bold text-on-surface-variant uppercase tracking-widest">{t.syllabus.subtitle}</p>
            </div>
          </div>
          <IconButton aria-label="Yopish" className="lg:hidden" onClick={() => setIsSyllabusOpen(false)}>
            <X />
          </IconButton>
        </div>

        {/* Accordion List */}
        <div className="flex-1 overflow-y-auto p-4 custom-scrollbar space-y-3 pb-24 lg:pb-6">
          {categories.map((cat) => {
            const isCatActive = activeCatIndex === cat.index;
            return (
              <div key={cat.index} className={cn(
                "rounded-m3-lg transition-all duration-300 overflow-hidden bg-surface-container-lowest",
                isCatActive ? "ring-1 ring-inset ring-primary shadow-elev-1" : "ring-1 ring-inset ring-outline-variant hover:ring-outline",
              )}>
                <button
                  onClick={() => { setActiveCatIndex(isCatActive ? null : cat.index); setActiveChapIndex(null); }}
                  className={cn(
                    "m3-interactive w-full text-left px-4 py-4 flex justify-between items-center transition-colors group",
                    isCatActive ? "bg-primary" : "hover:bg-state-hover",
                  )}
                >
                  <span className={cn("font-bold text-[13px]", isCatActive ? "text-on-primary" : "text-on-surface")}>{cat.category}</span>
                  <ChevronRight size={16} className={cn("transition-transform duration-300", isCatActive ? "rotate-90 text-on-primary" : "text-on-surface-variant")} />
                </button>

                {isCatActive && (
                  <div className="bg-surface-container p-2 space-y-1 border-t border-outline-variant">
                    {cat.chapters.map((chap: any) => {
                      const isChapActive = activeChapIndex === chap.index;
                      return (
                        <div key={chap.index} className="rounded-m3-md overflow-hidden">
                          <button
                            onClick={() => setActiveChapIndex(isChapActive ? null : chap.index)}
                            className={cn(
                              "w-full text-left px-3 py-2.5 rounded-m3-sm text-[12px] font-bold flex items-center justify-between transition-all duration-200",
                              isChapActive ? "bg-primary-container text-on-primary-container" : "text-on-surface-variant hover:bg-state-hover",
                            )}
                          >
                            <div className="flex items-center gap-2">
                              <span className={cn("w-1.5 h-1.5 rounded-full", isChapActive ? "bg-primary" : "bg-outline-variant")}></span>
                              <span className="truncate">{chap.chapter}</span>
                            </div>
                            {isChapActive && <ChevronRight size={12} className="text-primary rotate-90" />}
                          </button>

                          {isChapActive && (
                            <div className="ml-4 pl-3 border-l-2 border-primary-container my-2 space-y-1">
                              {chap.subtopics.map((sub: any) => (
                                <button
                                  key={sub.index}
                                  onClick={() => onSubtopicClick(sub)}
                                  className={cn(
                                    "w-full text-left px-3 py-2 rounded-m3-sm text-[11px] font-bold truncate transition-all duration-200 flex items-center gap-2",
                                    selectedSubtopic?.index === sub.index
                                      ? "bg-surface-container-lowest text-primary shadow-elev-1 ring-1 ring-inset ring-primary translate-x-1"
                                      : "text-on-surface-variant hover:text-primary hover:bg-state-hover",
                                  )}
                                >
                                  {selectedSubtopic?.index === sub.index && <div className="w-1 h-3 bg-primary rounded-full shrink-0"></div>}
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
        <div className="fixed inset-0 bg-scrim z-30 lg:hidden backdrop-blur-sm" onClick={() => setIsSyllabusOpen(false)} />
      )}
    </>
  );
}
