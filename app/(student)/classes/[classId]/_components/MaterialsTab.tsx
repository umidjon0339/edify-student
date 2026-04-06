'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, startAfter, getDocs } from 'firebase/firestore';
import { Folder, Image as ImageIcon, Video, FileText, File, Link as LinkIcon, ExternalLink, Download, Loader2 } from 'lucide-react';
import { useStudentLanguage } from '@/app/(student)/layout';

// ============================================================================
// 🟢 1. GLOBAL CACHE (0 Reads on Tab Switch, Survives Navigation)
// ============================================================================
const globalStudentMaterialsCache: Record<string, { materials: any[], lastDoc: any, hasMore: boolean, timestamp: number }> = {};
const CACHE_LIFESPAN = 60 * 1000; // 60 seconds
const PAGE_SIZE = 10;

// --- TRANSLATION DICTIONARY ---
const STUDENT_MATERIALS_TRANSLATIONS: any = {
  uz: {
    empty: "O'qituvchi hali material yuklamagan.",
    new: "Yangi", open: "Ochish", download: "Yuklab olish", external: "TASHQI HAVOLA"
  },
  en: {
    empty: "No materials uploaded by the teacher yet.",
    new: "New", open: "Open", download: "Download", external: "EXTERNAL LINK"
  },
  ru: {
    empty: "Учитель еще не загрузил материалы.",
    new: "Новый", open: "Открыть", download: "Скачать", external: "ВНЕШНЯЯ ССЫЛКА"
  }
};

export default function MaterialsTab({ classId }: { classId: string }) {
  const { lang } = useStudentLanguage();
  const t = STUDENT_MATERIALS_TRANSLATIONS[lang] || STUDENT_MATERIALS_TRANSLATIONS['en'];

  // --- STATE ---
  const [materials, setMaterials] = useState<any[]>([]);
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  const observerRef = useRef<IntersectionObserver | null>(null);

  // ============================================================================
  // 🟢 2. SWR FETCH LOGIC (True Cursor Pagination)
  // ============================================================================
  useEffect(() => {
    if (!classId) return;

    const initializeTab = async () => {
      const cached = globalStudentMaterialsCache[classId];
      const now = Date.now();

      // 🟢 Cache Hit: Instant Load!
      if (cached) {
        setMaterials(cached.materials);
        setLastDoc(cached.lastDoc);
        setHasMore(cached.hasMore);
        setLoadingInitial(false);

        // If fresh, stop here. 0 Firebase Reads!
        if (now - cached.timestamp < CACHE_LIFESPAN) return;
        
        // If stale, silently fetch page 1 in the background
        fetchMaterials(false, true);
      } else {
        setLoadingInitial(true);
        fetchMaterials(false, false);
      }
    };
    
    initializeTab();
  }, [classId]);

  const fetchMaterials = async (isNextPage: boolean = false, silent: boolean = false) => {
    if (!classId) return;
    if (isNextPage && !lastDoc) return;
    
    if (!silent) isNextPage ? setLoadingMore(true) : setLoadingInitial(true);

    try {
      // 🟢 Security: Only fetch visible, unarchived materials!
      let q = query(
        collection(db, 'classes', classId, 'materials'), 
        where('isVisible', '==', true),     
        where('isArchived', '==', false),   
        orderBy('createdAt', 'desc'), 
        limit(PAGE_SIZE)
      );

      // 🟢 PRO FIX: Use startAfter to only fetch the NEXT 10 items, not all of them!
      if (isNextPage && lastDoc) {
        q = query(
          collection(db, 'classes', classId, 'materials'), 
          where('isVisible', '==', true),
          where('isArchived', '==', false),
          orderBy('createdAt', 'desc'), 
          startAfter(lastDoc), 
          limit(PAGE_SIZE)
        );
      }

      const snap = await getDocs(q);
      const newDocs = snap.docs.map(d => ({ id: d.id, ...d.data() }));

      setMaterials(prev => {
        const updated = isNextPage ? [...prev, ...newDocs] : newDocs;
        const newLastDoc = snap.docs[snap.docs.length - 1] || null;
        const newHasMore = snap.docs.length >= PAGE_SIZE;

        // 🟢 Save to Cache
        globalStudentMaterialsCache[classId] = { 
          materials: updated, 
          lastDoc: newLastDoc, 
          hasMore: newHasMore, 
          timestamp: Date.now() 
        };

        if (!silent || !isNextPage) {
          setLastDoc(newLastDoc);
          setHasMore(newHasMore);
        }
        return updated;
      });
    } catch (e) {
      console.error("Materials fetch error:", e);
    } finally {
      setLoadingInitial(false); 
      setLoadingMore(false);
    }
  };

  // --- 3. INFINITE SCROLL TRIGGER (Replaces manual button) ---
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingInitial || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) fetchMaterials(true);
    }, { threshold: 0.5 });
    if (node) observerRef.current.observe(node);
  }, [loadingInitial, loadingMore, hasMore]);


  // ============================================================================
  // 🟢 4. UI HELPERS & RENDER (Tactile Campus Design)
  // ============================================================================
  const getSemanticStyle = (type: string) => {
    if (type === 'pdf') return { color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-100', icon: FileText };
    if (type === 'image') return { color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100', icon: ImageIcon };
    if (type === 'video') return { color: 'text-purple-600', bg: 'bg-purple-50', border: 'border-purple-100', icon: Video };
    if (type === 'link') return { color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: LinkIcon };
    return { color: 'text-zinc-600', bg: 'bg-zinc-100', border: 'border-zinc-200', icon: File };
  };

  if (loadingInitial && materials.length === 0) {
    return <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={28}/></div>;
  }

  if (materials.length === 0) {
    return (
      <div className="text-center py-16 bg-white rounded-[2rem] border-2 border-dashed border-zinc-300 flex flex-col items-center shadow-sm">
        <div className="w-16 h-16 bg-zinc-100 text-zinc-400 rounded-[1.2rem] flex items-center justify-center mb-4 rotate-6 border-2 border-zinc-200">
          <Folder size={32} strokeWidth={2.5} />
        </div>
        <h3 className="text-[16px] font-black text-zinc-900 tracking-tight">{t.empty}</h3>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {materials.map((mat, index) => {
          const isLastElement = index === materials.length - 1;
          const style = getSemanticStyle(mat.fileType);
          const IconComp = style.icon;

          return (
            <div 
              key={mat.id} 
              ref={isLastElement ? lastElementRef : null}
              className="bg-white rounded-[1.5rem] border-2 border-zinc-200 border-b-[6px] p-5 flex flex-col justify-between group hover:border-indigo-300 hover:border-b-indigo-400 active:border-b-2 active:translate-y-[4px] transition-all duration-200"
            >
              {/* Header: Icon & Text */}
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-[14px] border-2 flex items-center justify-center shrink-0 shadow-sm ${style.bg} ${style.color} ${style.border}`}>
                  <IconComp size={24} strokeWidth={2.5}/>
                </div>
                
                <div className="flex-1 min-w-0">
                  {mat.topicId && (
                    <span className="inline-flex items-center gap-1 bg-zinc-100 text-zinc-500 text-[9px] font-black uppercase px-2 py-0.5 rounded-md border-2 border-zinc-200 mb-1.5 shadow-sm">
                      <Folder size={10} strokeWidth={3}/> {mat.topicId}
                    </span>
                  )}
                  <h3 className="font-black text-[16px] text-zinc-900 truncate group-hover:text-indigo-600 transition-colors">
                    {mat.title}
                  </h3>
                  {mat.description && (
                    <p className="text-[13px] font-bold text-zinc-500 truncate mt-1">{mat.description}</p>
                  )}
                  
                  <div className="flex items-center gap-3 mt-3 text-[10px] font-black uppercase tracking-widest text-zinc-400">
                    {mat.isExternal ? (
                       <span className="text-emerald-500 flex items-center gap-1"><ExternalLink size={12} strokeWidth={3}/> {t.external}</span>
                    ) : (
                       <span>{(mat.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                    )}
                    <span>•</span>
                    <span>{mat.createdAt ? new Date(mat.createdAt.seconds * 1000).toLocaleDateString() : t.new}</span>
                  </div>
                </div>
              </div>

              {/* Action Button */}
              <div className="mt-5 pt-4 border-t-2 border-zinc-100 flex justify-end">
                <a 
                  href={mat.fileUrl} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className={`px-5 py-2.5 rounded-xl border-2 flex items-center gap-2 text-[13px] font-black tracking-widest uppercase transition-all active:scale-95 ${style.bg} ${style.color} ${style.border} hover:brightness-95`}
                >
                  {mat.isExternal ? <><ExternalLink size={16} strokeWidth={3}/> {t.open}</> : <><Download size={16} strokeWidth={3}/> {t.download}</>}
                </a>
              </div>
            </div>
          );
        })}
      </div>

      {/* Invisible loading indicator to trigger the observer */}
      {loadingMore && (
        <div className="py-6 flex justify-center">
          <Loader2 className="animate-spin text-indigo-500" size={24}/>
        </div>
      )}
    </div>
  );
}