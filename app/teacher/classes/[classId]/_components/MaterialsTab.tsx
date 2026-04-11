'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom'; // 🟢 ADDED PORTAL
import { db, storage } from '@/lib/firebase';
import { collection, query, orderBy, limit, startAfter, getDocs, doc, deleteDoc, updateDoc, where } from 'firebase/firestore';
import { ref, deleteObject } from 'firebase/storage';
import { 
  FileText, Image as ImageIcon, Video, File, Download, Trash2, 
  Eye, EyeOff, Loader2, Link as LinkIcon, ExternalLink, Folder, 
  Archive, ArchiveRestore, Edit, X, AlertTriangle 
} from 'lucide-react';
import toast from 'react-hot-toast';
import { useTeacherLanguage } from '@/app/teacher/layout';

// ============================================================================
// 🟢 1. GLOBAL DUAL-CACHE (Survives Tab Switches, 0 Reads on Toggle)
// ============================================================================
const globalMaterialsCache: Record<string, {
  active: { materials: any[], lastDoc: any, hasMore: boolean, timestamp: number } | null;
  archived: { materials: any[], lastDoc: any, hasMore: boolean, timestamp: number } | null;
}> = {};

const CACHE_LIFESPAN = 60 * 1000; // 60 seconds

// --- TRANSLATION DICTIONARY ---
const MATERIALS_TRANSLATIONS: any = {
  uz: {
    tabs: { active: "Faol Materiallar", archived: "Arxivlanganlar" },
    empty: { activeTitle: "Hozircha materiallar yo'q", activeDesc: "O'quvchilar uchun PDF, rasm, video yoki havolalar yuklang.", archiveTitle: "Arxivlangan materiallar yo'q", archiveDesc: "Arxivlangan narsalar shu yerda ko'rinadi." },
    labels: { externalLink: "TASHQI HAVOLA", new: "Yangi", view: "Ko'rish", download: "Yuklab olish", hidden: "Yashirin", visible: "Ko'rinadi" },
    tooltips: { hide: "O'quvchilardan yashirish", show: "O'quvchilarga ko'rsatish", archive: "Arxivlash", unarchive: "Arxivdan chiqarish", edit: "Tahrirlash", delete: "O'chirish" },
    toasts: { hidden: "Material yashirildi.", visible: "Material ko'rinadi.", archived: "Arxivlandi.", unarchived: "Arxivdan chiqarildi.", deleted: "O'chirildi.", updated: "Yangilandi.", error: "Xatolik yuz berdi." },
    modals: { cancel: "Bekor qilish", save: "Saqlash", confirm: "Tasdiqlash", editTitle: "Materialni Tahrirlash", titleLabel: "Sarlavha", descLabel: "Tavsif", topicLabel: "Mavzu", urlLabel: "Havola (URL)", confirmTitle: "Tasdiqlang", hideMsg: "O'quvchilardan yashirmoqchimisiz?", showMsg: "O'quvchilarga ko'rsatmoqchimisiz?", archiveMsg: "Arxivga o'tkazmoqchimisiz?", unarchiveMsg: "Arxivdan chiqarmoqchimisiz?", deleteMsg: "Butunlay o'chirib tashlamoqchimisiz?" }
  },
  en: {
    tabs: { active: "Active", archived: "Archived" },
    empty: { activeTitle: "No Materials Yet", activeDesc: "Upload PDFs, images, videos, or share links.", archiveTitle: "No Archived Materials", archiveDesc: "Archived items will appear here." },
    labels: { externalLink: "EXTERNAL LINK", new: "New", view: "View", download: "Download", hidden: "Hidden", visible: "Visible" },
    tooltips: { hide: "Hide from students", show: "Show to students", archive: "Archive", unarchive: "Unarchive", edit: "Edit", delete: "Delete" },
    toasts: { hidden: "Hidden from students.", visible: "Now visible.", archived: "Archived.", unarchived: "Unarchived.", deleted: "Deleted.", updated: "Updated.", error: "Error occurred." },
    modals: { cancel: "Cancel", save: "Save Changes", confirm: "Confirm", editTitle: "Edit Material", titleLabel: "Title", descLabel: "Description", topicLabel: "Topic", urlLabel: "URL / Link", confirmTitle: "Confirm Action", hideMsg: "Hide this material from students?", showMsg: "Show this material to students?", archiveMsg: "Move this to archive?", unarchiveMsg: "Unarchive this material?", deleteMsg: "Permanently delete this?" }
  },
  ru: {
    tabs: { active: "Активные", archived: "В архиве" },
    empty: { activeTitle: "Нет материалов", activeDesc: "Загрузите PDF, фото, видео или ссылки.", archiveTitle: "Нет архивных материалов", archiveDesc: "Здесь будут архивные элементы." },
    labels: { externalLink: "ВНЕШНЯЯ ССЫЛКА", new: "Новый", view: "Смотреть", download: "Скачать", hidden: "Скрыто", visible: "Видно" },
    tooltips: { hide: "Скрыть", show: "Показать", archive: "В архив", unarchive: "Из архива", edit: "Изменить", delete: "Удалить" },
    toasts: { hidden: "Скрыто.", visible: "Теперь видно.", archived: "В архиве.", unarchived: "Восстановлено.", deleted: "Удалено.", updated: "Обновлено.", error: "Ошибка." },
    modals: { cancel: "Отмена", save: "Сохранить", confirm: "Подтвердить", editTitle: "Редактировать", titleLabel: "Заголовок", descLabel: "Описание", topicLabel: "Тема", urlLabel: "Ссылка (URL)", confirmTitle: "Подтвердите", hideMsg: "Скрыть этот материал?", showMsg: "Показать этот материал?", archiveMsg: "Перенести в архив?", unarchiveMsg: "Разархивировать?", deleteMsg: "Навсегда удалить?" }
  }
};

const PAGE_SIZE = 10;

export default function MaterialsTab({ classId }: { classId: string }) {
  const { lang } = useTeacherLanguage();
  const t = MATERIALS_TRANSLATIONS[lang] || MATERIALS_TRANSLATIONS['en'];

  // 🟢 SSR HYDRATION FIX FOR PORTAL
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  // --- STATE ---
  const [materials, setMaterials] = useState<any[]>([]);
  const [showArchived, setShowArchived] = useState(false);
  
  // Pagination State
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [lastDoc, setLastDoc] = useState<any>(null);
  const [hasMore, setHasMore] = useState(true);

  // Modal States
  const [editingMat, setEditingMat] = useState<any | null>(null);
  const [editForm, setEditForm] = useState({ title: '', description: '', topicId: '', externalUrl: '' });
  const [confirmDialog, setConfirmDialog] = useState<{ type: 'visibility' | 'archive' | 'delete', mat: any } | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const observerRef = useRef<IntersectionObserver | null>(null);

  // ============================================================================
  // 🟢 2. SWR FETCH LOGIC
  // ============================================================================
  useEffect(() => {
    const initializeTab = async () => {
      if (!globalMaterialsCache[classId]) {
        globalMaterialsCache[classId] = { active: null, archived: null };
      }

      const cacheType = showArchived ? 'archived' : 'active';
      const cached = globalMaterialsCache[classId][cacheType];
      const now = Date.now();

      // 🟢 CACHE HIT: Instant Load
      if (cached) {
        setMaterials(cached.materials);
        setLastDoc(cached.lastDoc);
        setHasMore(cached.hasMore);
        setLoadingInitial(false);

        // If fresh, do nothing. If stale, fetch silently in the background
        if (now - cached.timestamp < CACHE_LIFESPAN) return;
        fetchMaterials(false, true);
      } else {
        // No cache: Show loading spinner and fetch
        setLoadingInitial(true);
        fetchMaterials(false, false);
      }
    };

    initializeTab();
  }, [classId, showArchived]);

  const fetchMaterials = async (isNextPage: boolean = false, silent: boolean = false) => {
    if (!classId) return;
    if (isNextPage && !lastDoc) return;
    
    if (!silent) {
      isNextPage ? setLoadingMore(true) : setLoadingInitial(true);
    }

    try {
      let q = query(
        collection(db, 'classes', classId, 'materials'), 
        where('isArchived', '==', showArchived),
        orderBy('createdAt', 'desc'), 
        limit(PAGE_SIZE)
      );

      if (isNextPage && lastDoc) {
        q = query(
          collection(db, 'classes', classId, 'materials'), 
          where('isArchived', '==', showArchived), 
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

        // 🟢 Update Cache
        const cacheType = showArchived ? 'archived' : 'active';
        globalMaterialsCache[classId][cacheType] = {
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
      console.error(e);
      if (!silent) toast.error(t.toasts.error);
    } finally {
      setLoadingInitial(false);
      setLoadingMore(false);
    }
  };

  // Observer
  const lastElementRef = useCallback((node: HTMLDivElement) => {
    if (loadingInitial || loadingMore) return;
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      if (entries[0].isIntersecting && hasMore) fetchMaterials(true);
    }, { threshold: 0.5 });
    if (node) observerRef.current.observe(node);
  }, [loadingInitial, loadingMore, hasMore, showArchived]);

  // ============================================================================
  // 🟢 3. MUTATIONS (Updates UI & Cache instantly)
  // ============================================================================
  const executeConfirmAction = async () => {
    if (!confirmDialog) return;
    setIsProcessing(true);
    const { type, mat } = confirmDialog;
    const cacheType = showArchived ? 'archived' : 'active';
    const oppositeCacheType = showArchived ? 'active' : 'archived';

    try {
      if (type === 'visibility') {
        await updateDoc(doc(db, 'classes', classId, 'materials', mat.id), { isVisible: !mat.isVisible });
        setMaterials(prev => {
          const updated = prev.map(m => m.id === mat.id ? { ...m, isVisible: !m.isVisible } : m);
          if (globalMaterialsCache[classId][cacheType]) globalMaterialsCache[classId][cacheType]!.materials = updated;
          return updated;
        });
        toast.success(mat.isVisible ? t.toasts.hidden : t.toasts.visible);

      } else if (type === 'archive') {
        await updateDoc(doc(db, 'classes', classId, 'materials', mat.id), { isArchived: !mat.isArchived });
        
        // Remove from current view
        setMaterials(prev => {
          const updated = prev.filter(m => m.id !== mat.id);
          if (globalMaterialsCache[classId][cacheType]) globalMaterialsCache[classId][cacheType]!.materials = updated;
          return updated;
        });
        
        // 🟢 Invalidate the opposite cache so it fetches fresh when they switch tabs
        globalMaterialsCache[classId][oppositeCacheType] = null;
        
        toast.success(mat.isArchived ? t.toasts.unarchived : t.toasts.archived);

      } else if (type === 'delete') {
        if (mat.storagePath) await deleteObject(ref(storage, mat.storagePath));
        await deleteDoc(doc(db, 'classes', classId, 'materials', mat.id));
        
        setMaterials(prev => {
          const updated = prev.filter(m => m.id !== mat.id);
          if (globalMaterialsCache[classId][cacheType]) globalMaterialsCache[classId][cacheType]!.materials = updated;
          return updated;
        });
        toast.success(t.toasts.deleted);
      }
    } catch (error) { toast.error(t.toasts.error); } 
    finally { setIsProcessing(false); setConfirmDialog(null); }
  };

  const handleEditSave = async () => {
    if (!editingMat || !editForm.title.trim()) return toast.error(t.toasts.error);
    setIsProcessing(true);
    const cacheType = showArchived ? 'archived' : 'active';

    try {
      await updateDoc(doc(db, 'classes', classId, 'materials', editingMat.id), {
        title: editForm.title.trim(), description: editForm.description.trim(), topicId: editForm.topicId.trim() || null,
        externalUrl: editingMat.isExternal ? editForm.externalUrl.trim() : null,
        fileUrl: editingMat.isExternal ? editForm.externalUrl.trim() : editingMat.fileUrl,
      });
      
      setMaterials(prev => {
        const updated = prev.map(m => m.id === editingMat.id ? { ...m, ...editForm } : m);
        if (globalMaterialsCache[classId][cacheType]) globalMaterialsCache[classId][cacheType]!.materials = updated;
        return updated;
      });
      
      toast.success(t.toasts.updated);
      setEditingMat(null);
    } catch (error) { toast.error(t.toasts.error); } 
    finally { setIsProcessing(false); }
  };

  const openEditModal = (mat: any) => {
    setEditingMat(mat);
    setEditForm({ 
      title: mat.title || '', 
      description: mat.description || '', 
      topicId: mat.topicId || '', 
      externalUrl: mat.externalUrl || '' 
    });
  };

  const getSemanticStyle = (type: string) => {
    if (type === 'pdf') return { color: 'text-red-500', bg: 'bg-red-50', border: 'border-red-100', icon: FileText, hover: 'hover:border-red-200 hover:shadow-red-500/10' };
    if (type === 'image') return { color: 'text-blue-500', bg: 'bg-blue-50', border: 'border-blue-100', icon: ImageIcon, hover: 'hover:border-blue-200 hover:shadow-blue-500/10' };
    if (type === 'video') return { color: 'text-purple-500', bg: 'bg-purple-50', border: 'border-purple-100', icon: Video, hover: 'hover:border-purple-200 hover:shadow-purple-500/10' };
    if (type === 'link') return { color: 'text-emerald-500', bg: 'bg-emerald-50', border: 'border-emerald-100', icon: LinkIcon, hover: 'hover:border-emerald-200 hover:shadow-emerald-500/10' };
    return { color: 'text-slate-500', bg: 'bg-slate-50', border: 'border-slate-200', icon: File, hover: 'hover:border-slate-300' };
  };

  // --- RENDER ---
  return (
    <div className="space-y-4 md:space-y-6">
      
      {/* ACTIVE / ARCHIVED TOGGLE */}
      <div className="flex p-1.5 bg-slate-200/50 rounded-[1rem] shadow-inner max-w-xs mx-auto md:mx-0">
        <button onClick={() => setShowArchived(false)} className={`flex-1 py-2 text-[11px] md:text-[12px] font-bold rounded-xl transition-all ${!showArchived ? 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
          {t.tabs.active}
        </button>
        <button onClick={() => setShowArchived(true)} className={`flex-1 py-2 text-[11px] md:text-[12px] font-bold rounded-xl transition-all ${showArchived ? 'bg-white shadow-[0_2px_8px_rgb(0,0,0,0.04)] text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
          {t.tabs.archived}
        </button>
      </div>

      {/* CONTENT LIST */}
      {loadingInitial ? (
        <div className="py-12 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={28}/></div>
      ) : materials.length === 0 ? (
        <div className="text-center py-12 md:py-16 bg-slate-50 rounded-[1.5rem] md:rounded-[2rem] border border-dashed border-slate-200 flex flex-col items-center">
          <div className="w-14 h-14 md:w-16 md:h-16 bg-white rounded-xl md:rounded-[1.2rem] flex items-center justify-center mb-3 md:mb-4 shadow-sm text-slate-300">
            {showArchived ? <Archive size={28} /> : <FileText size={28} />}
          </div>
          <h3 className="text-slate-800 font-black text-[14px] md:text-[16px]">{showArchived ? t.empty.archiveTitle : t.empty.activeTitle}</h3>
          <p className="text-[12px] md:text-[13px] font-medium text-slate-500 mt-1 max-w-xs">{showArchived ? t.empty.archiveDesc : t.empty.activeDesc}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 md:gap-4">
          {materials.map((mat, index) => {
            const isLastElement = index === materials.length - 1;
            const style = getSemanticStyle(mat.fileType);
            const IconComp = style.icon;

            return (
              <div 
                key={mat.id} 
                ref={isLastElement ? lastElementRef : null}
                className={`bg-white p-4 md:p-5 rounded-[1.2rem] md:rounded-[1.5rem] border transition-all duration-300 shadow-sm group flex flex-col justify-between ${
                  !mat.isVisible ? 'border-dashed border-slate-300 opacity-60 hover:opacity-100' : `border-slate-200/80 hover:shadow-md ${style.hover} hover:-translate-y-0.5 active:scale-[0.98] md:active:scale-100`
                }`}
              >
                <div className="flex items-start gap-3 md:gap-4 mb-3 md:mb-4">
                  <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-[14px] border flex items-center justify-center shrink-0 shadow-inner ${style.bg} ${style.color} ${style.border}`}>
                    <IconComp size={20} strokeWidth={2.5} className="md:w-6 md:h-6 md:stroke-2" />
                  </div>
                  
                  <div className="flex-1 min-w-0 pt-0.5">
                    <div className="flex flex-wrap items-center gap-1.5 mb-1 md:mb-1.5">
                      {mat.topicId && (
                        <span className="bg-slate-100 text-slate-500 text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-200/60 shadow-sm">
                          <Folder size={10}/> {mat.topicId}
                        </span>
                      )}
                      {!mat.isVisible && (
                        <span className="bg-slate-100 text-slate-500 text-[8px] md:text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-md flex items-center gap-1 border border-slate-200/60 shadow-sm">
                          <EyeOff size={10}/> {t.labels.hidden}
                        </span>
                      )}
                    </div>
                    <h3 className="font-black text-[14px] md:text-[15px] text-slate-900 truncate leading-snug">{mat.title}</h3>
                    <p className="text-[11px] md:text-[12px] font-medium text-slate-500 truncate mt-0.5 md:mt-1">{mat.description || '...'}</p>
                    
                    <div className="flex items-center gap-2 md:gap-3 mt-1.5 md:mt-2 text-[9px] md:text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                      {mat.isExternal ? (
                         <span className="text-emerald-500 flex items-center gap-1"><ExternalLink size={10} className="md:w-3 md:h-3"/> {t.labels.externalLink}</span>
                      ) : (
                         <span>{(mat.fileSize / 1024 / 1024).toFixed(2)} MB</span>
                      )}
                      <span>•</span>
                      <span>{mat.createdAt ? new Date(mat.createdAt.seconds * 1000).toLocaleDateString() : t.labels.new}</span>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-3 md:pt-4 border-t border-slate-100/80">
                  <a 
                    href={mat.fileUrl} target="_blank" rel="noopener noreferrer" 
                    className={`px-4 py-2.5 md:py-2 rounded-xl text-[11px] md:text-[12px] font-bold flex items-center justify-center gap-2 transition-all active:scale-95 ${style.bg} ${style.color} hover:brightness-95 border ${style.border} text-center w-full sm:w-auto`}
                  >
                    {mat.isExternal ? <><ExternalLink size={14}/> {t.labels.view}</> : <><Download size={14}/> {t.labels.download}</>}
                  </a>
                  
                  <div className="flex gap-1.5 justify-end w-full sm:w-auto">
                    <button onClick={() => setConfirmDialog({ type: 'visibility', mat })} className="flex-1 sm:flex-none w-auto sm:w-8 h-9 sm:h-8 rounded-xl sm:rounded-lg bg-slate-50 text-slate-400 border border-slate-200/50 hover:bg-slate-100 hover:text-slate-600 flex items-center justify-center transition-colors active:scale-95" title={mat.isVisible ? t.tooltips.hide : t.tooltips.show}>
                      {mat.isVisible ? <EyeOff size={16} className="sm:w-3.5 sm:h-3.5" strokeWidth={2.5}/> : <Eye size={16} className="sm:w-3.5 sm:h-3.5" strokeWidth={2.5}/>}
                    </button>
                    <button onClick={() => openEditModal(mat)} className="flex-1 sm:flex-none w-auto sm:w-8 h-9 sm:h-8 rounded-xl sm:rounded-lg bg-blue-50 text-blue-500 border border-blue-100/50 hover:bg-blue-100 hover:text-blue-600 flex items-center justify-center transition-colors active:scale-95" title={t.tooltips.edit}>
                      <Edit size={16} className="sm:w-3.5 sm:h-3.5" strokeWidth={2.5}/>
                    </button>
                    <button onClick={() => setConfirmDialog({ type: 'archive', mat })} className="flex-1 sm:flex-none w-auto sm:w-8 h-9 sm:h-8 rounded-xl sm:rounded-lg bg-amber-50 text-amber-500 border border-amber-100/50 hover:bg-amber-100 hover:text-amber-600 flex items-center justify-center transition-colors active:scale-95" title={mat.isArchived ? t.tooltips.unarchive : t.tooltips.archive}>
                      {mat.isArchived ? <ArchiveRestore size={16} className="sm:w-3.5 sm:h-3.5" strokeWidth={2.5}/> : <Archive size={16} className="sm:w-3.5 sm:h-3.5" strokeWidth={2.5}/>}
                    </button>
                    <button onClick={() => setConfirmDialog({ type: 'delete', mat })} className="flex-1 sm:flex-none w-auto sm:w-8 h-9 sm:h-8 rounded-xl sm:rounded-lg bg-red-50 text-red-500 border border-red-100/50 hover:bg-red-100 hover:text-red-600 flex items-center justify-center transition-colors active:scale-95" title={t.tooltips.delete}>
                      <Trash2 size={16} className="sm:w-3.5 sm:h-3.5" strokeWidth={2.5}/>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {loadingMore && <div className="py-4 md:py-6 flex justify-center"><Loader2 className="animate-spin text-indigo-500" size={24}/></div>}

      {/* --- CONFIRMATION MODAL (PORTAL) --- */}
      {mounted && confirmDialog && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-center justify-center p-4 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setConfirmDialog(null)}></div>
          <div className="relative bg-white rounded-[2rem] w-full max-w-sm p-6 md:p-8 shadow-2xl animate-in zoom-in-95 fade-in text-center border border-slate-100">
            <div className={`w-14 h-14 rounded-[1.2rem] flex items-center justify-center mb-5 mx-auto ${confirmDialog.type === 'delete' ? 'bg-red-50 text-red-500' : 'bg-amber-50 text-amber-500'}`}>
              <AlertTriangle size={24} strokeWidth={2.5} />
            </div>
            <h2 className="text-[16px] md:text-[18px] font-black text-slate-900 mb-2">{t.modals.confirmTitle}</h2>
            <p className="text-[12px] md:text-[13px] text-slate-500 font-medium mb-6 leading-relaxed px-2">
              {confirmDialog.type === 'visibility' ? (confirmDialog.mat.isVisible ? t.modals.hideMsg : t.modals.showMsg) : confirmDialog.type === 'archive' ? (confirmDialog.mat.isArchived ? t.modals.unarchiveMsg : t.modals.archiveMsg) : t.modals.deleteMsg}
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-2.5 sm:gap-3">
              <button onClick={() => setConfirmDialog(null)} disabled={isProcessing} className="w-full py-3.5 sm:py-3 text-[12px] sm:text-[13px] font-bold text-slate-600 bg-slate-50 hover:bg-slate-100 rounded-xl transition-colors border border-slate-200/80 active:scale-95">{t.modals.cancel}</button>
              <button onClick={executeConfirmAction} disabled={isProcessing} className={`w-full py-3.5 sm:py-3 text-[12px] sm:text-[13px] font-bold text-white rounded-xl shadow-md active:scale-95 transition-all flex items-center justify-center gap-2 ${confirmDialog.type === 'delete' ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/20'}`}>
                {isProcessing && <Loader2 size={16} className="animate-spin"/>} {t.modals.confirm}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* --- EDIT MODAL (PORTAL) --- */}
      {mounted && editingMat && createPortal(
        <div className="fixed inset-0 z-[99999] flex items-end sm:items-center justify-center p-0 sm:p-6">
          <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm transition-opacity" onClick={() => setEditingMat(null)}></div>
          <div className="relative bg-white rounded-t-[2rem] sm:rounded-[2rem] w-full max-w-md shadow-2xl animate-in slide-in-from-bottom-10 sm:zoom-in-95 fade-in border border-slate-100 flex flex-col h-[90vh] sm:h-auto sm:max-h-[90vh]">
            
            <div className="px-5 py-4 sm:px-8 sm:py-5 border-b border-slate-100 bg-white/90 backdrop-blur-xl flex justify-between items-center shrink-0 z-20 shadow-sm">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-blue-50 border border-blue-100 flex items-center justify-center text-blue-600 shadow-sm shrink-0">
                   <Edit size={16} strokeWidth={2.5} className="sm:w-[18px] sm:h-[18px]" />
                </div>
                <h2 className="text-[16px] sm:text-[18px] font-black text-slate-900 tracking-tight">{t.modals.editTitle}</h2>
              </div>
              <button onClick={() => setEditingMat(null)} className="w-8 h-8 flex items-center justify-center bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-full text-slate-400 hover:text-slate-600 transition-colors active:scale-95 shrink-0">
                 <X size={18} strokeWidth={2.5}/>
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-4 sm:p-8 space-y-4 sm:space-y-5 bg-[#FAFAFA] custom-scrollbar pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-8">
              <div>
                <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2">{t.modals.titleLabel}</label>
                <input type="text" value={editForm.title} onChange={e => setEditForm({...editForm, title: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-[1rem] text-[13px] sm:text-[14px] font-bold text-slate-900 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2 flex items-center gap-1.5"><Folder size={12}/> {t.modals.topicLabel}</label>
                <input type="text" value={editForm.topicId} onChange={e => setEditForm({...editForm, topicId: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-[1rem] text-[13px] sm:text-[14px] font-bold text-slate-900 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm" />
              </div>
              <div>
                <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2">{t.modals.descLabel}</label>
                <textarea value={editForm.description} onChange={e => setEditForm({...editForm, description: e.target.value})} rows={3} className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-[1rem] text-[13px] sm:text-[14px] font-medium text-slate-900 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none resize-none transition-all shadow-sm" />
              </div>
              {editingMat.isExternal && (
                <div>
                  <label className="block text-[10px] sm:text-[11px] font-black text-slate-400 uppercase tracking-widest mb-1.5 sm:mb-2">{t.modals.urlLabel}</label>
                  <input type="url" value={editForm.externalUrl} onChange={e => setEditForm({...editForm, externalUrl: e.target.value})} className="w-full px-4 py-3 bg-white border border-slate-200/80 rounded-[1rem] text-[13px] sm:text-[14px] font-bold text-slate-900 focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/10 outline-none transition-all shadow-sm" />
                </div>
              )}
            </div>

            <div className="px-4 sm:px-8 py-4 sm:py-5 border-t border-slate-100 bg-white flex flex-col-reverse sm:flex-row justify-end gap-2.5 sm:gap-3 shrink-0 z-20 pb-[calc(1rem+env(safe-area-inset-bottom))] sm:pb-5 shadow-[0_-10px_30px_rgb(0,0,0,0.03)]">
              <button onClick={() => setEditingMat(null)} disabled={isProcessing} className="w-full sm:w-auto px-6 py-3.5 sm:py-2.5 text-slate-600 bg-slate-50 border border-slate-200/80 font-bold hover:bg-slate-100 hover:text-slate-900 rounded-xl text-[12px] sm:text-[13px] transition-colors active:scale-95">{t.modals.cancel}</button>
              <button onClick={handleEditSave} disabled={isProcessing || !editForm.title.trim()} className="w-full sm:w-auto px-8 py-3.5 sm:py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-600/20 transition-all flex items-center justify-center gap-2 text-[12px] sm:text-[13px] disabled:opacity-50 active:scale-95">
                {isProcessing && <Loader2 className="animate-spin" size={16}/>} {t.modals.save}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
}