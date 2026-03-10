'use client';

import { useState, useEffect } from 'react';
import { db } from '@/lib/firebase';
import { collection, query, where, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { Folder, Image as ImageIcon, Video, FileText, File, Link as LinkIcon, ExternalLink, Download, Loader2 } from 'lucide-react';
import { useStudentLanguage } from '@/app/(student)/layout';

// --- TRANSLATION DICTIONARY ---
const STUDENT_MATERIALS_TRANSLATIONS = {
  uz: {
    empty: "O'qituvchi hali material yuklamagan.",
    new: "Yangi",
    open: "Ochish",
    download: "Yuklab olish",
    external: "TASHQI HAVOLA",
    loadMore: "Ko'proq material yuklash"
  },
  en: {
    empty: "No materials uploaded by the teacher yet.",
    new: "New",
    open: "Open",
    download: "Download",
    external: "EXTERNAL LINK",
    loadMore: "Load More Materials"
  },
  ru: {
    empty: "Учитель еще не загрузил материалы.",
    new: "Новый",
    open: "Открыть",
    download: "Скачать",
    external: "ВНЕШНЯЯ ССЫЛКА",
    loadMore: "Загрузить еще материалы"
  }
};

export default function MaterialsTab({ classId }: { classId: string }) {
  const { lang } = useStudentLanguage();
  const t = STUDENT_MATERIALS_TRANSLATIONS[lang];

  const [materials, setMaterials] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  // 🟢 PAGINATION STATE
  const [itemLimit, setItemLimit] = useState(10);

  useEffect(() => {
    setLoading(true);
    
    // 🔴 ADDED THE isVisible == true FILTER HERE!
    const materialsQuery = query(
      collection(db, 'classes', classId, 'materials'), 
      where('isVisible', '==', true),     // <- Tells Firebase we aren't hacking hidden files
      where('isArchived', '==', false),   // <- Hides archived files
      orderBy('createdAt', 'desc'), 
      limit(itemLimit)
    );

    const unsubscribe = onSnapshot(materialsQuery, (snap) => {
      // Because Firebase filtered it, we don't need manual JS filtering anymore!
      const visibleMats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      setMaterials(visibleMats);
      setLoading(false);
    }, (error) => {
      console.error("FIREBASE ERROR:", error.message);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [classId, itemLimit]);

  const getMaterialIcon = (type: string) => {
    if (type === 'pdf') return <FileText className="text-red-400" size={24} />;
    if (type === 'image') return <ImageIcon className="text-blue-400" size={24} />;
    if (type === 'video') return <Video className="text-purple-400" size={24} />;
    if (type === 'link') return <LinkIcon className="text-emerald-400" size={24} />;
    return <File className="text-slate-400" size={24} />;
  };

  if (loading && materials.length === 0) {
    return (
      <div className="flex justify-center p-12">
        <Loader2 className="animate-spin text-blue-500" size={32} />
      </div>
    );
  }

  if (materials.length === 0) {
    return (
      <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="text-center p-12 bg-slate-800/50 backdrop-blur-xl rounded-2xl border border-slate-700/50">
          <Folder className="mx-auto text-slate-600 mb-4" size={48} />
          <h3 className="text-lg font-bold text-slate-300">{t.empty}</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-in fade-in slide-in-from-bottom-2 duration-300 space-y-6">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {materials.map((mat) => (
          <div key={mat.id} className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-xl p-5 rounded-2xl border border-slate-700 hover:border-slate-500 transition-all shadow-lg flex flex-col justify-between group">
            <div className="flex items-start gap-4">
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-600/50 shadow-inner">
                {getMaterialIcon(mat.fileType)}
              </div>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {mat.topicId && (
                    <span className="bg-slate-700 text-slate-300 text-[9px] font-black uppercase px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
                      <Folder size={10}/> {mat.topicId}
                    </span>
                  )}
                </div>
                <h3 className="font-bold text-white truncate mt-1.5">{mat.title}</h3>
                {mat.description && <p className="text-xs text-slate-400 truncate mt-1">{mat.description}</p>}
                
                <div className="flex items-center gap-3 mt-3 text-[10px] font-bold uppercase tracking-wider">
                  {mat.isExternal ? (
                     <span className="text-emerald-400 flex items-center gap-1"><ExternalLink size={12}/> {t.external}</span>
                  ) : (
                     <span className="text-slate-500">{(mat.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                  )}
                  <span className="text-slate-600">•</span>
                  <span className="text-slate-500">{mat.createdAt ? new Date(mat.createdAt.seconds * 1000).toLocaleDateString() : t.new}</span>
                </div>
              </div>
            </div>

            <div className="mt-5 pt-4 border-t border-slate-700/50 flex justify-end">
              <a 
                href={mat.fileUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="px-4 py-2 bg-blue-500/10 hover:bg-blue-500/20 border border-blue-500/30 text-blue-400 font-bold rounded-lg text-xs transition-all flex items-center gap-2 group-hover:shadow-lg group-hover:shadow-blue-500/10"
              >
                {mat.isExternal ? <><ExternalLink size={14}/> {t.open}</> : <><Download size={14}/> {t.download}</>}
              </a>
            </div>
          </div>
        ))}
      </div>

      {/* 🟢 LOAD MORE BUTTON */}
      {materials.length >= itemLimit && (
        <div className="flex justify-center mt-8 pt-4">
          <button 
            onClick={() => setItemLimit(prev => prev + 10)}
            className="px-6 py-2.5 bg-slate-800 border border-slate-600 hover:bg-slate-700 text-slate-300 font-bold rounded-xl text-sm transition-colors flex items-center gap-2 shadow-lg"
          >
            {t.loadMore}
          </button>
        </div>
      )}
    </div>
  );
}